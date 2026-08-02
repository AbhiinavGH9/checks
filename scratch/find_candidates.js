const fs = require('fs');

const lucideNames = [
  'alert-circle', 'alert-triangle', 'archive', 'arrow-up-down', 'calendar',
  'camera', 'check', 'check-square', 'chevron-down', 'chevron-left',
  'chevron-right', 'chevron-up', 'circle-plus', 'database', 'download',
  'edit', 'edit-2', 'eye', 'folder-output', 'folder-pen', 'folder-plus',
  'folder-x', 'inbox', 'info', 'layout-panel-left', 'list-checks', 'lock',
  'log-in', 'log-out', 'more-horizontal', 'palette', 'pause-circle',
  'pencil', 'plus', 'plus-circle', 'plus-square', 'refresh-cw', 'rotate-ccw',
  'search', 'settings', 'shield-check', 'sidebar', 'sliders', 'square',
  'sticky-note', 'timer', 'trash', 'trash-2', 'unlock', 'upload',
  'upload-cloud', 'user', 'user-cog', 'wifi-off', 'x',
  'list', 'bookmark', 'clock', 'star', 'target', 'dollar-sign', 'briefcase',
  'wallet', 'credit-card', 'shopping-bag', 'trophy', 'zap', 'dumbbell',
  'utensils', 'graduation-cap', 'map-pin', 'smile'
];

const cjsFiles = fs.readdirSync('./node_modules/@hugeicons/core-free-icons/dist/cjs')
  .filter(f => f.endsWith('.js') && f !== 'index.js');

const pascalNames = cjsFiles.map(f => f.replace('.js', ''));

console.log(`Found ${pascalNames.length} Hugeicons.`);

function findMatches(lucideName) {
  const clean = lucideName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const matches = pascalNames.filter(name => {
    const n = name.toLowerCase();
    return n.includes(clean);
  });
  return matches.slice(0, 10);
}

const mapping = {};
lucideNames.forEach(name => {
  mapping[name] = findMatches(name);
});

console.log(JSON.stringify(mapping, null, 2));
