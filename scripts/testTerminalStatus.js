// scripts/testTerminalStatus.js
const { authenticate, fetchTransactions, fetchTerminals } = require('../src/server/biometric/easywdms.service');

async function test() {
  const cookie = await authenticate();
  const terminals = await fetchTerminals(cookie);
  console.log('Total terminals fetched:', terminals.length);
  
  terminals.forEach(t => {
    const sn = String(t.sn || '').padEnd(16);
    const alias = String(t.alias || t.terminal_name || '').padEnd(22);
    const state = t.state === 1 ? 'ONLINE ' : 'OFFLINE';
    const lastActivity = t.last_activity || t.change_time || 'N/A';
    console.log(`SN: ${sn} | Name: ${alias} | State: ${state} | Tx Count: ${String(t.transaction_count).padStart(7)} | Last: ${lastActivity}`);
  });
}

test().catch(e => console.error(e));
