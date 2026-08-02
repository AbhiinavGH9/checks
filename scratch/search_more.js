const fs = require('fs');

const cjsFiles = fs.readdirSync('./node_modules/@hugeicons/core-free-icons/dist/cjs')
  .filter(f => f.endsWith('.js') && f !== 'index.js')
  .map(f => f.replace('.js', ''));

function search(term) {
  const t = term.toLowerCase();
  return cjsFiles.filter(f => f.toLowerCase().includes(t)).slice(0, 10);
}

console.log("Delete:", search("delete"));
console.log("Remove:", search("remove"));
console.log("Color / Paint:", search("paint"));
console.log("Color:", search("color"));
console.log("Cancel / Close / Multi:", search("cancel"));
console.log("Multiply / Cross:", search("multipl"));
console.log("Add:", search("add"));
console.log("Setting:", search("setting"));
console.log("User:", search("user"));
console.log("Award / Cup / Trophy:", search("award"));
