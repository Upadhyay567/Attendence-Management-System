const express = require('express');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8012;
const MONGO_URL = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'attendance_system';
const COLLECTION_NAME = 'state';

// Increase body parser limit to support PDF attachment data strings
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use(express.static(path.join(__dirname)));

let dbClient = null;

async function getCollection() {
  if (!dbClient) {
    dbClient = new MongoClient(MONGO_URL);
    await dbClient.connect();
    console.log('Connected to MongoDB database successfully.');
  }
  const db = dbClient.db(DB_NAME);
  return db.collection(COLLECTION_NAME);
}

// 1. Fetch entire database state
app.get('/api/db-state', async (req, res) => {
  try {
    const col = await getCollection();
    let stateDoc = await col.findOne({ _id: 'global_state' });
    
    if (!stateDoc) {
      console.log('MongoDB state collection is blank. Seeding from default seed.json...');
      const rawSeed = fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf-8');
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
    
    // Upsert the full state
    const updateResult = await col.updateOne(
      { _id: 'global_state' },
      { $set: data },
      { upsert: true }
    );
    
    res.json({ success: true, matchedCount: updateResult.matchedCount, modifiedCount: updateResult.modifiedCount });
  } catch (err) {
    console.error('Error mutating database state:', err);
    res.status(500).json({ error: 'Failed to synchronize mutation' });
  }
});

// Route everything else to SPA shell
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start backend server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(`HS Group Delhi Backend Portal Running:`);
  console.log(`API URL: http://localhost:${PORT}`);
  console.log(`===================================================`);
});
