const fs = require('fs');

const cjsFiles = fs.readdirSync('./node_modules/@hugeicons/core-free-icons/dist/cjs')
  .filter(f => f.endsWith('.js') && f !== 'index.js')
  .map(f => f.replace('.js', ''));

console.log("Check:", cjsFiles.filter(f => f.toLowerCase().includes('check')).slice(0, 10));
console.log("Unlock:", cjsFiles.filter(f => f.toLowerCase().includes('unlock')).slice(0, 10));
console.log("User:", cjsFiles.filter(f => f.toLowerCase().includes('user') && f.toLowerCase().includes('setting')).slice(0, 10));
