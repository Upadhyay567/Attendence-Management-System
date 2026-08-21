const express = require('express');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = parseInt(process.env.PORT || 8080, 10);
const MONGO_URL = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'attendance_system';
const COLLECTION_NAME = 'state';

// Increase body parser limit to support massive datasets, PDF attachment strings, and bulk uploads (500mb)
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(express.raw({ limit: '500mb' }));
app.use(express.text({ limit: '500mb' }));

// Create uploads directory if it does not exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Disable browser caching and enable CORS for all static assets and endpoints
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve static frontend files and uploads
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static frontend files and uploads
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname)));

let dbClient = null;
let useLocalFileDB = false;
const LOCAL_DB_FILE = path.join(__dirname, 'seed.json');

async function getCollection() {
  if (useLocalFileDB) return null;
  if (!dbClient) {
    try {
      dbClient = new MongoClient(MONGO_URL, { connectTimeoutMS: 500, serverSelectionTimeoutMS: 500 });
      await dbClient.connect();
      console.log('Connected to MongoDB database successfully.');
    } catch (err) {
      console.warn('⚠️ MongoDB connection omitted/offline. Operating on local database (seed.json).');
      useLocalFileDB = true;
      return null;
    }
  }
  try {
    const db = dbClient.db(DB_NAME);
    return db.collection(COLLECTION_NAME);
  } catch (err) {
    useLocalFileDB = true;
    return null;
  }
}

// 1. Fetch entire database state
app.get('/api/db-state', async (req, res) => {
  try {
    const col = await getCollection();
    if (useLocalFileDB || !col) {
      const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      const seedData = JSON.parse(rawSeed);
      return res.json(seedData);
    }

    let stateDoc = await col.findOne({ _id: 'global_state' });
    
    if (!stateDoc) {
      console.log('MongoDB state collection is blank. Seeding from default seed.json...');
      const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      const seedData = JSON.parse(rawSeed);
      
      stateDoc = { _id: 'global_state', ...seedData };
      await col.insertOne(stateDoc);
      console.log('Database successfully seeded.');
    }
    
    // Omit MongoDB _id parameter
    const { _id, ...cleanState } = stateDoc;
    res.json(cleanState);
  } catch (err) {
    console.error('Error fetching database state:', err);
    res.status(500).json({ error: 'Failed to retrieve database state' });
  }
});

// 2. Synchronize frontend mutation state to MongoDB
app.post('/api/mutate', async (req, res) => {
  try {
    const { action, data } = req.body;
    if (action !== 'sync' || !data) {
      return res.status(400).json({ error: 'Invalid mutation action payload.' });
    }
    
    const col = await getCollection();
    if (useLocalFileDB || !col) {
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return res.json({ success: true, localFile: true });
    }
    
    // Upsert the full state
    const updateResult = await col.updateOne(
      { _id: 'global_state' },
      { $set: data },
      { upsert: true }
    );
    
    // Keep seed.json on disk in sync for offline/Go Live server fallback loading
    try {
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (fsErr) {
      console.warn('⚠️ Failed to sync seed.json to disk:', fsErr.message);
    }
    
    res.json({ success: true, matchedCount: updateResult.matchedCount, modifiedCount: updateResult.modifiedCount });
  } catch (err) {
    console.error('Error mutating database state:', err);
    res.status(500).json({ error: 'Failed to synchronize mutation' });
  }
});

// 2.5 Granular transactional mutation endpoint to prevent race conditions and payload overhead
app.post('/api/mutate-granular', async (req, res) => {
  try {
    const { type, key, payload, query, updates } = req.body;
    if (!type || !key) {
      return res.status(400).json({ error: 'Type and key are required for granular mutations.' });
    }

    const col = await getCollection();

    // Helper to apply local modifications to state object
    const applyLocalUpdate = (data) => {
      if (type === 'push') {
        data[key] = data[key] || [];
        const exists = data[key].some(item => item.id === payload.id);
        if (!exists) data[key].push(payload);
      } else if (type === 'update') {
        data[key] = data[key] || [];
        const idx = data[key].findIndex(item => item.id === query.id);
        if (idx !== -1) Object.assign(data[key][idx], updates);
      } else if (type === 'pull') {
        data[key] = data[key] || [];
        data[key] = data[key].filter(item => {
          for (const [k, v] of Object.entries(query)) {
            if (item[k] !== v) return true;
          }
          return false;
        });
      }
    };

    // 1. Update MongoDB atomically if online
    if (col && !useLocalFileDB) {
      let updateOp = {};
      if (type === 'push') {
        updateOp = { $push: { [key]: payload } };
        // Avoid duplicate push
        await col.updateOne({ _id: 'global_state', [`${key}.id`]: { $ne: payload.id } }, updateOp);
      } else if (type === 'update') {
        const setFields = {};
        for (const [f, val] of Object.entries(updates)) {
          setFields[`${key}.$.${f}`] = val;
        }
        updateOp = { $set: setFields };
        await col.updateOne({ _id: 'global_state', [`${key}.id`]: query.id }, updateOp);
      } else if (type === 'pull') {
        updateOp = { $pull: { [key]: query } };
        await col.updateOne({ _id: 'global_state' }, updateOp);
      }
    }

    // 2. Synchronize seed.json file thread-safely
    const rawState = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
    const stateObj = JSON.parse(rawState);
    applyLocalUpdate(stateObj);
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(stateObj, null, 2), 'utf-8');

    res.json({ success: true, type, key });
  } catch (err) {
    console.error('Error applying granular mutation:', err);
    res.status(500).json({ error: 'Failed to apply granular update' });
  }
});

// 3. Dedicated file & bulk data upload endpoint
app.post('/api/upload', (req, res) => {
  try {
    const { filename, fileData } = req.body || {};
    if (!filename || !fileData) {
      return res.status(400).json({ error: 'Filename and base64 fileData are required.' });
    }
    const base64Content = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Content, 'base64');
    const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
    const destPath = path.join(UPLOADS_DIR, safeName);
    fs.writeFileSync(destPath, buffer);
    console.log(`Uploaded file saved: ${safeName} (${(buffer.length / 1024).toFixed(1)} KB)`);
    res.json({ success: true, url: `/uploads/${safeName}`, filename: safeName, size: buffer.length });
  } catch (err) {
    console.error('Express upload handler error:', err);
    res.status(500).json({ error: 'Failed to process file upload.' });
  }
});

// Route everything else to SPA shell
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  next();
});

// Express Error Handling Middleware (prevents raw HTML crashes on payload errors)
app.use((err, req, res, next) => {
  console.error('Express Payload / Request Error:', err.message);
  res.status(err.status || 400).json({ error: err.message || 'Malformed request payload.' });
});

// Start backend server
const os = require('os');
function getLocalNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIP = getLocalNetworkIP();

function freePort(port) {
  if (process.platform === 'win32') {
    try {
      const stdout = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const pids = new Set();
      const currentPid = process.pid;
      
      stdout.split('\n').forEach(line => {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid) && parseInt(pid, 10) !== currentPid) {
            pids.add(pid);
          }
        }
      });
      
      pids.forEach(pid => {
        console.log(`🧹 Clearing stale process (PID ${pid}) on Port ${port}...`);
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch (e) {}
      });
      
      // Give the OS a brief moment to release the socket
      try { execSync('timeout /t 1 /nobreak', { stdio: 'ignore' }); } catch (e) {}
    } catch (err) {
      // netstat exits with code 1 if no match is found, which is fine
    }
  }
}

function startExpressServer(portToTry) {
  freePort(portToTry);
  const serverInstance = app.listen(portToTry, '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(`  HS GROUP DELHI EXPRESS LIVE SERVER ACTIVE `);
    print_urls(portToTry, localIP);
    console.log(`===================================================`);

    // Write server config for client auto-discovery
    try {
      fs.writeFileSync(path.join(__dirname, 'server-config.json'), JSON.stringify({ port: portToTry, started_at: Date.now() }));
    } catch (e) {}
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (portToTry < 8090) {
        console.log(`⚠️ Port ${portToTry} busy, retrying on Port ${portToTry + 1}...`);
        startExpressServer(portToTry + 1);
      } else {
        console.error(`⚠️ Port ${portToTry} is already in use by a running server instance.`);
      }
    } else {
      console.error('Express server error:', err);
    }
  });
}

function print_urls(port, ip) {
  console.log(`  Local Laptop:  http://localhost:${port}`);
  console.log(`  Mobile / LAN:  http://${ip}:${port}`);
}

startExpressServer(PORT);
