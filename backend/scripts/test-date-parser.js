const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, '../../School.csv');
const raw = fs.readFileSync(csvPath, 'utf8');

function parseDateOrRange(str) {
  if (!str || !str.trim()) return null;
  const s = str.trim();
  
  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(s);
  }
  
  // Format: DD/MM/YYYY or DD-MM-YYYY
  const singleDmY = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (singleDmY) {
    const [, d, m, y] = singleDmY;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  // Range with "to" or "and" or "-" : "15/08/2023 to 18/08/2023", "06-09-2023 and 07/09/2023"
  const rangeDmY = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*(?:to|and|\-)\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/i);
  if (rangeDmY) {
    const [, d, m, y] = rangeDmY;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  // Textual dates: "1st Dec 2023", "24rd Dec 2023", "1st Jan 2024", "01st March 2024", "11th feb 2024"
  const textDate = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i);
  if (textDate) {
    const [, d, monthStr, y] = textDate;
    const months = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11
    };
    const m = months[monthStr.toLowerCase().slice(0, 3)];
    if (m !== undefined) {
      return new Date(Number(y), m, Number(d));
    }
  }

  // Textual range: "1st Feb 2024 -2nd Feb 2024"
  const textRange = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})\s*(?:to|and|\-)\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i);
  if (textRange) {
    const [, d, monthStr, y] = textRange;
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const m = months[monthStr.toLowerCase().slice(0, 3)];
    if (m !== undefined) {
      return new Date(Number(y), m, Number(d));
    }
  }

  return null;
}

const lines = raw.trim().split(/\r?\n/).slice(1);
let parsedCount = 0;
let unparsed = [];

lines.forEach((line, idx) => {
  const parts = line.split(',');
  // date is column 1 (2nd column)
  // Let's use simple regex
  const match = line.match(/^(?:\"[^\"]*\"|[^,]*),(\"[^\"]*\"|[^,]*),/);
  const dateStr = match ? match[1].replace(/^\"|\"$/g, '').trim() : '';
  const d = parseDateOrRange(dateStr);
  if (d && !isNaN(d.getTime())) {
    parsedCount++;
  } else {
    unparsed.push({ row: idx + 2, dateStr, line });
  }
});

console.log(`Successfully parsed: ${parsedCount} / ${lines.length}`);
console.log('Unparsed count:', unparsed.length);
if (unparsed.length > 0) {
  console.log('Unparsed items:', unparsed);
}

