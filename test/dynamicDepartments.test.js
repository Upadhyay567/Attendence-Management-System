const DB = {
  data: {
    users: [
      { id: 'u1', name: 'Alice', department: 'Merchandising' },
      { id: 'u2', name: 'Bob', department: 'MARKETING' },
      { id: 'u3', name: 'Charlie', department: 'Operations Manager' },
      { id: 'u4', name: 'Dave', department: '' },
      { id: 'u5', name: 'Eve', department: 'General' },
      { id: 'u6', name: 'Frank', department: '-' }
    ],
    departments: ['Quality Assurance']
  },
  save(mutation) {
    this.lastMutation = mutation;
  },
  getDepartments() {
    const isIgnored = (d) => !d || ['department', 'staff', 'general', '—', '-', 'not assigned'].includes(String(d).trim().toLowerCase());
    const deptMap = new Map();
    const users = Array.isArray(this.data?.users) ? this.data.users : [];
    users.forEach(u => {
      const raw = (u.department || '').trim();
      if (raw && !isIgnored(raw)) {
        const lower = raw.toLowerCase();
        if (!deptMap.has(lower)) {
          deptMap.set(lower, raw);
        }
      }
    });

    if (Array.isArray(this.data?.departments)) {
      this.data.departments.forEach(d => {
        const raw = (typeof d === 'string' ? d : (d?.name || '')).trim();
        if (raw && !isIgnored(raw)) {
          const lower = raw.toLowerCase();
          if (!deptMap.has(lower)) {
            deptMap.set(lower, raw);
          }
        }
      });
    }

    return Array.from(deptMap.values()).sort((a, b) => a.localeCompare(b));
  },
  addDepartment(deptName) {
    if (!deptName || typeof deptName !== 'string') return;
    const name = deptName.trim();
    const isIgnored = ['department', 'staff', 'general', '—', '-', 'not assigned'].includes(name.toLowerCase());
    if (!name || isIgnored) return;
    if (!Array.isArray(this.data.departments)) {
      this.data.departments = [];
    }
    const exists = this.data.departments.some(d => (typeof d === 'string' ? d : (d?.name || '')).toLowerCase() === name.toLowerCase());
    if (!exists) {
      this.data.departments.push(name);
      this.save({ type: 'push', key: 'departments', payload: name });
    }
  }
};

describe('Dynamic Departments System', () => {
  test('returns only valid distinct departments and ignores placeholders', () => {
    const depts = DB.getDepartments();
    expect(depts).toContain('Merchandising');
    expect(depts).toContain('MARKETING');
    expect(depts).toContain('Operations Manager');
    expect(depts).toContain('Quality Assurance');
    expect(depts).not.toContain('General');
    expect(depts).not.toContain('-');
    expect(depts).not.toContain('');
  });

  test('addDepartment immediately registers new department and persists', () => {
    DB.addDepartment('Logistics & Shipping');
    const depts = DB.getDepartments();
    expect(depts).toContain('Logistics & Shipping');
    expect(DB.lastMutation).toEqual({
      type: 'push',
      key: 'departments',
      payload: 'Logistics & Shipping'
    });
  });

  test('profile department entry is immediately visible in getDepartments()', () => {
    const customDept = 'Artificial Intelligence Research';
    DB.data.users.push({ id: 'u7', name: 'Grace', department: customDept });
    const depts = DB.getDepartments();
    expect(depts).toContain(customDept);
  });
});
