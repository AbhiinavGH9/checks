const mapping = {
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

async function testAll() {
  const loader = await import('@hugeicons/core-free-icons/loader');
  let missing = 0;
  for (const [lucide, pascal] of Object.entries(mapping)) {
    try {
      const ast = await loader.loadIcon(pascal);
      if (!ast) {
        console.error(`FAILED: ${lucide} -> ${pascal}`);
        missing++;
      }
    } catch (e) {
      console.error(`ERROR loading ${lucide} -> ${pascal}: ${e.message}`);
      missing++;
    }
  }
  console.log(`Verification finished. Missing: ${missing}`);
}

testAll();
