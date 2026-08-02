const fs = require('fs');
const txt = fs.readFileSync('index.html', 'utf8') + fs.readFileSync('script.js', 'utf8');
const set = new Set();
const parts = txt.split('data-lucide="');
for (let i = 1; i < parts.length; i++) {
    const val = parts[i].split('"')[0];
    if (val && !val.includes('${')) set.add(val);
}
console.log('Unique icons:', Array.from(set).sort());
