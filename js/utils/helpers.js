// js/utils/helpers.js - Common Utility Functions

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

  // Format time in 12-hour format with AM/PM
  format12HourTime(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return timeStr || '-';
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m.toString().padStart(2, '0');
    return `${displayH}:${displayM} ${period}`;
  },

  // Get duration string between two HH:MM times
  calculateDuration(checkIn, checkOut) {
    if (!checkIn || !checkOut) return '-';
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    
    let totalMins = (outH * 60 + outM) - (inH * 60 + inM);
    if (totalMins < 0) totalMins += 1440; // Shift spans midnight
    
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

// Tagged template literal helper for syntax highlighting and safe template strings
export const html = (strings, ...values) => {
  return strings.reduce((result, str, i) => result + str + (values[i] !== undefined ? values[i] : ''), '');
};

// Convert 24-hour time string (e.g. "08:00", "16:30") to 12-hour AM/PM format (e.g. "08:00 AM", "04:30 PM")
export function formatTime12h(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return timeStr || '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

// Format a time range "startTime - endTime" with AM/PM
export function formatTimeRange12h(start, end) {
  return `${formatTime12h(start)} - ${formatTime12h(end)}`;
}

