const fs = require('fs');
const path = require('path');

describe('Attendance Shift & Multiple Location Assignment', () => {
  const attendancesViewCode = fs.readFileSync(path.resolve(__dirname, '../js/views/attendancesView.js'), 'utf8');
  const helpersCode = fs.readFileSync(path.resolve(__dirname, '../js/utils/helpers.js'), 'utf8');

  test('helpers.js formatLocationTag supports comma-separated multiple locations', () => {
    expect(helpersCode).toContain("clean.includes(',')");
    expect(helpersCode).toContain("clean.split(',').map(s => formatLocationTag(s.trim()))");
  });

  test('Shift dropdown in Edit Attendance Modal includes No Shift Assigned option', () => {
    expect(attendancesViewCode).toContain('id="modal-edit-att-shift"');
    expect(attendancesViewCode).toContain('<option value="" ${(!log.shiftId || log.shiftId === \'__NONE__\' || log.shiftId === \'none\') ? \'selected\' : \'\'}>-- No Shift Assigned --</option>');
  });

  test('Shift dropdown in Create Attendance Modal includes No Shift Assigned option', () => {
    expect(attendancesViewCode).toContain('id="modal-create-att-shift"');
    expect(attendancesViewCode).toContain('<option value="">-- No Shift Assigned --</option>');
  });

  test('Edit Attendance Modal contains multi-checkbox worksite location assignment UI', () => {
    expect(attendancesViewCode).toContain('id="modal-edit-att-loc-list"');
    expect(attendancesViewCode).toContain('class="modal-edit-att-loc-chk"');
    expect(attendancesViewCode).toContain('id="modal-edit-att-loc-all"');
    expect(attendancesViewCode).toContain('id="modal-edit-att-loc-clear"');
    expect(attendancesViewCode).toContain('id="modal-edit-att-loc-filter"');
    expect(attendancesViewCode).toContain('id="modal-edit-att-loc-count"');
  });

  test('Create Attendance Modal contains multi-checkbox worksite location assignment UI', () => {
    expect(attendancesViewCode).toContain('id="modal-create-att-loc-list"');
    expect(attendancesViewCode).toContain('class="modal-create-att-loc-chk"');
    expect(attendancesViewCode).toContain('id="modal-create-att-loc-all"');
    expect(attendancesViewCode).toContain('id="modal-create-att-loc-clear"');
    expect(attendancesViewCode).toContain('id="modal-create-att-loc-filter"');
    expect(attendancesViewCode).toContain('id="modal-create-att-loc-count"');
  });

  test('Toolbar contains Shift Filter with All Shifts and No Shift Assigned options', () => {
    expect(attendancesViewCode).toContain('id="admin-att-shift-filter"');
    expect(attendancesViewCode).toContain('<option value="">All Shifts</option>');
    expect(attendancesViewCode).toContain('<option value="__NONE__">-- No Shift Assigned --</option>');
  });

  test('Actions menu contains Assign Shift & Locations bulk action', () => {
    expect(attendancesViewCode).toContain('id="btn-admin-att-bulk-assign"');
    expect(attendancesViewCode).toContain('Assign Shift &amp; Locations');
    expect(attendancesViewCode).toContain('showBulkAssignShiftAndLocationsModal');
  });

  test('Table row Shift column renders No Shift Assigned badge when shift is not assigned', () => {
    expect(attendancesViewCode).toContain('No Shift Assigned');
    expect(attendancesViewCode).toContain('badge');
    expect(attendancesViewCode).toContain('isExplicitNoShift');
  });

  test('Toolbar filters have compact fixed widths and proper order with multi-location split', () => {
    // Compact fixed widths & ellipsis
    expect(attendancesViewCode).toContain('id="admin-att-location-filter"');
    expect(attendancesViewCode).toContain('max-width: 130px');
    expect(attendancesViewCode).toContain('max-width: 125px');
    expect(attendancesViewCode).toContain('max-width: 120px');
    expect(attendancesViewCode).toContain('text-overflow: ellipsis');

    // Splitting multi-location strings so options never stretch
    expect(attendancesViewCode).toContain("loc.split(',').map(s => s.trim())");
    expect(attendancesViewCode).toContain('<option value="">All Locations</option>');
    expect(attendancesViewCode).toContain('<option value="">All Shifts</option>');
  });
});
