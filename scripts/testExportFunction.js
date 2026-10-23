// scripts/testExportFunction.js
const fs = require('fs');

const code = fs.readFileSync('js/views/attendancesView.js', 'utf8');

// Check for any undeclared variable references in exportEmployeeAttendancesCSV
const exportFnMatch = code.match(/function exportEmployeeAttendancesCSV[\s\S]*?\n\}/);
if (!exportFnMatch) {
  console.error('Could not find exportEmployeeAttendancesCSV');
  process.exit(1);
}

console.log('Found exportEmployeeAttendancesCSV (len:', exportFnMatch[0].length, ')');

// Check that shiftName is declared inside exportEmployeeAttendancesCSV
if (exportFnMatch[0].includes('const shiftName = shift ? shift.name :')) {
  console.log('✅ shiftName declaration confirmed inside exportEmployeeAttendancesCSV!');
} else {
  console.error('❌ shiftName declaration NOT found!');
  process.exit(1);
}

// Test syntax with node --check
try {
  require('child_process').execSync('node --check js/views/attendancesView.js');
  console.log('✅ attendancesView.js syntax valid!');
} catch (e) {
  console.error('❌ Syntax error in attendancesView.js:', e.message);
  process.exit(1);
}
