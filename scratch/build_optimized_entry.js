const ICON_MAPPING = {
    'alert-circle': 'AlertCircleIcon',
    'alert-triangle': 'Alert01Icon',
    'archive': 'ArchiveIcon',
    'arrow-up-down': 'ArrowDataTransferVerticalIcon',
    'calendar': 'Calendar01Icon',
    'camera': 'Camera01Icon',
    'check': 'Tick01Icon',
    'check-square': 'CheckmarkSquare01Icon',
    'chevron-down': 'ArrowDown01Icon',
    'chevron-left': 'ArrowLeft01Icon',
    'chevron-right': 'ArrowRight01Icon',
    'chevron-up': 'ArrowUp01Icon',
    'circle-plus': 'AddCircleIcon',
    'database': 'DatabaseIcon',
    'download': 'Download01Icon',
    'edit': 'PencilEdit01Icon',
    'edit-2': 'PencilEdit02Icon',
    'eye': 'EyeIcon',
    'folder-output': 'FolderOutputIcon',
    'folder-pen': 'FolderPenIcon',
    'folder-plus': 'FolderAddIcon',
    'folder-x': 'FolderRemoveIcon',
    'inbox': 'InboxIcon',
    'info': 'InformationCircleIcon',
    'layout-panel-left': 'LayoutLeftIcon',
    'list-checks': 'CheckListIcon',
    'lock': 'LockIcon',
    'log-in': 'Login01Icon',
    'log-out': 'Logout01Icon',
    'more-horizontal': 'MoreHorizontalIcon',
    'palette': 'PaintBoardIcon',
    'pause-circle': 'PauseCircleIcon',
    'pencil': 'PencilIcon',
    'plus': 'Add01Icon',
    'plus-circle': 'AddCircleIcon',
    'plus-square': 'AddSquareIcon',
    'refresh-cw': 'RefreshIcon',
    'rotate-ccw': 'RotateLeft01Icon',
    'search': 'Search01Icon',
    'settings': 'Settings01Icon',
    'shield-check': 'Shield01Icon',
    'sidebar': 'SidebarLeftIcon',
    'sliders': 'SlidersHorizontalIcon',
    'square': 'SquareIcon',
    'sticky-note': 'StickyNote01Icon',
    'timer': 'Timer01Icon',
    'trash': 'Delete01Icon',
    'trash-2': 'Delete02Icon',
    'unlock': 'CircleUnlock01Icon',
    'upload': 'Upload01Icon',
    'upload-cloud': 'CloudUploadIcon',
    'user': 'UserIcon',
    'user-cog': 'UserSettings01Icon',
    'wifi-off': 'WifiOff01Icon',
    'x': 'Cancel01Icon',
    'list': 'LeftToRightListBulletIcon',
    'bookmark': 'Bookmark01Icon',
    'clock': 'Clock01Icon',
    'star': 'StarIcon',
    'target': 'Target01Icon',
    'dollar-sign': 'DollarSignIcon',
    'briefcase': 'Briefcase01Icon',
    'wallet': 'Wallet01Icon',
    'credit-card': 'CreditCardIcon',
    'shopping-bag': 'ShoppingBag01Icon',
    'trophy': 'Award01Icon',
    'zap': 'ZapIcon',
    'dumbbell': 'Dumbbell01Icon',
    'utensils': 'KitchenUtensilsIcon',
    'graduation-cap': 'GraduationCapIcon',
    'map-pin': 'MapPinIcon',
    'smile': 'SmileIcon'
};

const uniquePascals = Array.from(new Set(Object.values(ICON_MAPPING)));

let imports = uniquePascals.map(p => `import ${p} from '@hugeicons/core-free-icons/${p}';`).join('\n');
let dictEntries = uniquePascals.map(p => `  ${p}: ${p}`).join(',\n');

let code = `${imports}

const coreIcons = {
${dictEntries}
};

const ICON_MAPPING = ${JSON.stringify(ICON_MAPPING, null, 4)};

function kebabToPascal(str) {
    if (!str) return '';
    return str.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('') + 'Icon';
}

function resolveIconName(name) {
    if (!name) return 'AlertCircleIcon';
    if (ICON_MAPPING[name]) return ICON_MAPPING[name];
    if (coreIcons[name]) return name;
    const pascalCandidate = kebabToPascal(name);
    if (coreIcons[pascalCandidate]) return pascalCandidate;
    return 'AlertCircleIcon';
}

function renderHugeiconElement(el) {
    const rawName = el.getAttribute('data-lucide') || el.getAttribute('data-hugeicon');
    if (!rawName) return;

    const pascalName = resolveIconName(rawName);
    const iconData = coreIcons[pascalName] || coreIcons.AlertCircleIcon;
    if (!iconData) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const existingClasses = el.getAttribute('class');
    if (existingClasses) {
        svg.setAttribute('class', existingClasses);
    }
    
    const existingStyle = el.getAttribute('style');
    if (existingStyle) {
        svg.setAttribute('style', existingStyle);
    }

    svg.setAttribute('data-hugeicon', pascalName);

    iconData.forEach(item => {
        const [tagName, attrs] = item;
        const child = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        Object.keys(attrs).forEach(key => {
            if (key === 'key') return;
            child.setAttribute(key, attrs[key]);
        });
        child.setAttribute('stroke', 'currentColor');
        child.setAttribute('stroke-linecap', 'round');
        child.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(child);
    });

    el.parentNode.replaceChild(svg, el);
}

function createIcons() {
    const elements = document.querySelectorAll('[data-lucide], [data-hugeicon]');
    elements.forEach(el => renderHugeiconElement(el));
}

window.lucide = {
    createIcons: createIcons
};

window.hugeicons = {
    createIcons: createIcons,
    coreIcons: coreIcons,
    ICON_MAPPING: ICON_MAPPING
};

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createIcons);
    } else {
        createIcons();
    }
}
`;

require('fs').writeFileSync('hugeicons_bundle_entry.js', code);
console.log('Tree-shakeable entry generated with', uniquePascals.length, 'icons');
