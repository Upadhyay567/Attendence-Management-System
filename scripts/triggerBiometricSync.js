// scripts/triggerBiometricSync.js
const http = require('http');

async function triggerSync() {
  console.log('🔄 Triggering biometric punch synchronization via server endpoint...');
  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/biometric/sync',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 150000
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Sync request timed out'));
    });

    req.end();
  });
}

triggerSync().then(result => {
  console.log('✅ Biometric synchronization response:');
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}).catch(err => {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
});
