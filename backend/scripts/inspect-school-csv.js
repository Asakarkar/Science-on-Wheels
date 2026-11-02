const fs = require('fs');
const path = require('path');

function parseCsv(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }
  return rows;
}

const csvPath = path.resolve(__dirname, '../../School.csv');
const raw = fs.readFileSync(csvPath, 'utf8');
const parsed = parseCsv(raw);
console.log('Total parsed rows:', parsed.length);
const header = parsed[0];
console.log('Header:', header);

const data = parsed.slice(1);
const schoolNames = new Map();

data.forEach((r, idx) => {
  const [regionSection, dateOrRange, schoolName, district] = r;
  const rowNum = idx + 2;
  if (!schoolNames.has(schoolName)) schoolNames.set(schoolName, []);
  schoolNames.get(schoolName).push({ row: rowNum, district, dateOrRange });
});

console.log('Total data records:', data.length);
console.log('Unique school names:', schoolNames.size);
for (const [name, occurrences] of schoolNames.entries()) {
  if (occurrences.length > 1) {
    console.log('Duplicate name:', name, occurrences);
  }
}
