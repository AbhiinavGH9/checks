const fs = require('fs');

const cjsFiles = fs.readdirSync('./node_modules/@hugeicons/core-free-icons/dist/cjs')
  .filter(f => f.endsWith('.js') && f !== 'index.js')
  .map(f => f.replace('.js', ''));

console.log("Tick:", cjsFiles.filter(f => f.toLowerCase().includes('tick')));
console.log("Check mark:", cjsFiles.filter(f => f.toLowerCase().includes('checkmark')));
console.log("Lock / Unlock:", cjsFiles.filter(f => f.toLowerCase().includes('lock')));
