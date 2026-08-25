// utils.js - Common utilities and CSV exporter

export const Utils = {
  // Safe HTML escaper
  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Format date to human readable form, e.g., Jun 25, 2026
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  },

  // Get duration string between two HH:MM times
  calculateDuration(checkIn, checkOut) {
    if (!checkIn || !checkOut) return '-';
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    
    let totalMins = (outH * 60 + outM) - (inH * 60 + inM);
    if (totalMins < 0) return '-'; // Negative check-in (shift spans past midnight)
    
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    
    return `${h}h ${m}m`;
  },

  // Export array of objects to CSV download
  exportToCSV(filename, headers, rows) {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add headers
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
    
    // Add rows
    rows.forEach(row => {
      csvContent += row.map(cell => {
        const val = cell === null || cell === undefined ? '' : String(cell);
        return `"${val.replace(/"/g, '""')}"`;
      }).join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Export to formatted Excel sheet (.xls) supporting column widths and date formatting
  exportToExcel(filename, headers, rows) {
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    html += `<head><meta charset="utf-8">`;
    html += `<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->`;
    html += `<style>`;
    html += `table { border-collapse: collapse; }`;
    html += `th { background-color: #ef4444; color: #ffffff; font-weight: bold; border: 0.5pt solid #cbd5e1; text-align: left; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; padding: 6px 8px; }`;
    html += `td { border: 0.5pt solid #cbd5e1; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; padding: 6px 8px; mso-number-format:"\\@"; }`;
    html += `</style></head><body>`;
    html += `<table>`;
    
    // Add colgroups for column widths
    html += `<colgroup>`;
    html += `<col style="width: 150px;" />`; // Employee Name
    html += `<col style="width: 110px;" />`; // Employee ID
    html += `<col style="width: 130px;" />`; // Date (Wider so no ###)
    html += `<col style="width: 90px;" />`;  // Check-In
    html += `<col style="width: 90px;" />`;  // Check-Out
    html += `<col style="width: 120px;" />`; // Shift
    html += `<col style="width: 90px;" />`;  // At Work
    html += `<col style="width: 95px;" />`;  // Status
    html += `<col style="width: 250px;" />`; // Location
    html += `</colgroup>`;

    // Add headers
    html += `<tr>`;
    headers.forEach(h => {
      html += `<th>${h}</th>`;
    });
    html += `</tr>`;

    // Add rows
    rows.forEach(row => {
      html += `<tr>`;
      row.forEach((cell, idx) => {
        const val = cell === null || cell === undefined ? '' : String(cell);
        if (idx === 2) {
          // Date format yyyy-mm-dd
          html += `<td style="mso-number-format:'yyyy-mm-dd'; text-align: center;">${val}</td>`;
        } else if (idx === 3 || idx === 4) {
          // Check-In & Check-Out time format hh:mm
          html += `<td style="mso-number-format:'hh:mm'; text-align: center;">${val}</td>`;
        } else if (idx === 6) {
          // Duration (At Work)
          html += `<td style="text-align: center;">${val}</td>`;
        } else {
          html += `<td>${val}</td>`;
        }
      });
      html += `</tr>`;
    });

    html += `</table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const excelFilename = filename.replace(/\\.csv$/i, '.xls');
    link.setAttribute("download", excelFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Generate full month days array for reports
  getDaysInMonth(year, month) {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date).toISOString().split('T')[0]);
      date.setDate(date.getDate() + 1);
    }
    return days;
  },

  // Secure password hashing helper
  hashPassword(password) {
    if (!password) return '';
    if (String(password).startsWith('$hash$')) return String(password); // Already hashed
    let hash = 0x811c9dc5;
    const str = String(password);
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    const hex = (hash >>> 0).toString(16).padStart(8, '0');
    return `$hash$${hex}`;
  },

  // Secure password verification helper supporting both hashed and legacy formats
  verifyPassword(inputPassword, storedPassword) {
    if (!inputPassword) return false;
    // If no password stored, allow any non-empty password (first-time / unset accounts)
    if (!storedPassword) return true;
    const storedStr = String(storedPassword);
    if (storedStr.startsWith('$2a$') || storedStr.startsWith('$2b$')) {
      console.warn('Bcrypt hashes cannot be validated offline. Please connect to the live server.');
      return false;
    }
    if (storedStr.startsWith('$hash$')) {
      return this.hashPassword(inputPassword) === storedStr;
    }
    return String(inputPassword) === storedStr;
  }
};
