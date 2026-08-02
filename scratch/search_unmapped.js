const fs = require('fs');

const cjsFiles = fs.readdirSync('./node_modules/@hugeicons/core-free-icons/dist/cjs')
  .filter(f => f.endsWith('.js') && f !== 'index.js')
  .map(f => f.replace('.js', ''));

function search(term) {
  const t = term.toLowerCase();
  return cjsFiles.filter(f => f.toLowerCase().includes(t)).slice(0, 15);
}

const unmapped = [
  'alert-circle', 'alert-triangle', 'arrow-up-down', 'circle-plus', 'edit', 'edit-2',
  'folder-plus', 'folder-x', 'layout-panel-left', 'list-checks', 'palette',
  'plus-circle', 'plus-square', 'refresh-cw', 'rotate-ccw', 'shield-check',
  'trash', 'trash-2', 'upload-cloud', 'user-cog', 'x', 'trophy'
];

unmapped.forEach(item => {
  console.log(`=== ${item} ===`);
  console.log(search(item.split('-')[0]));
});
