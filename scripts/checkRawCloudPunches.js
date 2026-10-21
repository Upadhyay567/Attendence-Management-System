const { authenticate, fetchTransactions } = require('../src/server/biometric/easywdms.service');

async function checkPunches() {
  const cookie = await authenticate('admin', 'Admin@123');
  console.log('✅ Authenticated with ZKTeco Cloud Server');

  // Check transactions for employee 1324
  const res1 = await fetchTransactions(cookie, {
    emp_code: '1324',
    start_time: '2026-10-19 00:00:00',
    end_time: '2026-10-20 23:59:59',
    page_size: 100,
    maxPages: 1
  });
  console.log('--- Transactions for 1324 on 2026-10-19 and 2026-10-20 ---');
  console.log('Count:', res1.length);
  console.log(JSON.stringify(res1.filter(t => (t.emp_code || t.pin) == '1324'), null, 2));

  // Check employee 713
  const res2 = await fetchTransactions(cookie, {
    emp_code: '713',
    start_time: '2026-10-20 00:00:00',
    end_time: '2026-10-20 23:59:59',
    page_size: 100,
    maxPages: 1
  });
  console.log('\n--- Transactions for 713 on 2026-10-20 ---');
  console.log('Count:', res2.length);
  console.log(JSON.stringify(res2.filter(t => (t.emp_code || t.pin) == '713'), null, 2));

  // Check employee 1184
  const res3 = await fetchTransactions(cookie, {
    emp_code: '1184',
    start_time: '2026-10-19 00:00:00',
    end_time: '2026-10-19 23:59:59',
    page_size: 100,
    maxPages: 1
  });
  console.log('\n--- Transactions for 1184 on 2026-10-19 ---');
  console.log('Count:', res3.length);
  console.log(JSON.stringify(res3.filter(t => (t.emp_code || t.pin) == '1184'), null, 2));

  process.exit(0);
}

checkPunches().catch(err => {
  console.error(err);
  process.exit(1);
});
