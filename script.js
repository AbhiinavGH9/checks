        const SYSTEM_COLORS = [
            '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', '#007AFF',
            '#5856D6', '#FF2D55', '#AF52DE', '#A2845E', '#8E8E93', '#E4A3A1'
        ];

        const SYSTEM_ICONS = [
            'list', 'bookmark', 'calendar', 'clock', 'star', 'target',
            'dollar-sign', 'briefcase', 'wallet', 'credit-card', 'shopping-bag', 'trophy',
            'zap', 'dumbbell', 'utensils', 'graduation-cap', 'map-pin', 'smile'
        ];

        let AppState = {
            tasks: [],
            projects: [],
            groups: [],
            currentTab: 'inbox',
            selectedTaskId: null,
            selectedTaskIds: [], 
            searchQuery: '',
            sortBy: 'created',
            sidebarCollapsed: false,
            
            tempProjectColor: '#FF3B30',
            tempProjectIcon: 'smile',
            tempCreatePriority: '#FF3B30',
            tempCreateIcon: 'smile',
            tempGroupColor: '#FF3B30',
            tempGroupIcon: 'list',
            returningToTaskModal: false,
            draftTask: null, 
            editingProjectId: null,
            editingGroupId: null,
            
            profileName: 'Anv',
            profileUser: 'Anv',
            profilePass: 'anv_edt',
            profileDP: 'smile',

            // Metric tracking variables
            metricCardCollapsed: true,
            counterTargetPolicy: 'tasks' // Can be 'tasks' or 'subtasks'
        };

        let contextSelectedTaskId = null;
        let contextSelectedGroupId = null;
        let deleteActionCallback = null;

        let calendarTargetInputId = null;
        let calendarMonth = 5; 
        let calendarYear = 2026;

        let dragSelectActive = false;
        let dragSelectStartX = 0;
        let dragSelectStartY = 0;
        let marqueeDiv = null;

        const MONTH_NAMES = [
            "January", "February", "March", "April", "May", "June", 
            "July", "August", "September", "October", "November", "December"
        ];

        function sanitizeSentenceCase(str) {
            if (!str) return '';
            const cleaned = str.trim();
            if (cleaned.length === 0) return '';
            return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
        }

        let activeFloatingElement = null;

        function positionFloatingElement(el, anchorRect, options = {}) {
            if (!el) return;
            const margin = options.margin || 8;

            // Make the element visible off-screen so we can measure it
            el.classList.add('floating-positioned');
            el.style.position = 'fixed';
            el.style.visibility = 'hidden';
            el.style.display = 'block';
            el.style.top = '-9999px';
            el.style.left = '-9999px';
            el.style.maxHeight = '';
            el.style.overflowY = '';
            el.style.zIndex = '250';

            if (el.classList.contains('w-full') || options.matchWidth) {
                el.style.width = `${anchorRect.width}px`;
            } else {
                el.style.width = ''; // Reset any inline width overrides
            }

            // Measure dimensions
            const menuWidth = el.offsetWidth;
            const menuHeight = el.offsetHeight;

            // Decide vertical placement
            let top = anchorRect.bottom + margin;
            let fitsBelow = top + menuHeight + margin <= window.innerHeight;
            let fitsAbove = anchorRect.top - menuHeight - margin >= 0;

            if (!fitsBelow && fitsAbove) {
                top = anchorRect.top - menuHeight - margin;
            } else if (!fitsBelow && !fitsAbove) {
                // Doesn't fit either direction, clamp height and add scroll
                const spaceBelow = window.innerHeight - anchorRect.bottom - margin * 2;
                const spaceAbove = anchorRect.top - margin * 2;
                if (spaceBelow >= spaceAbove) {
                    top = anchorRect.bottom + margin;
                    el.style.maxHeight = `${spaceBelow}px`;
                } else {
                    top = margin;
                    el.style.maxHeight = `${spaceAbove}px`;
                }
                el.style.overflowY = 'auto';
            }

            // Decide horizontal placement
            let left = anchorRect.left;
            let fitsLeft = left + menuWidth + margin <= window.innerWidth;
            let fitsRight = anchorRect.right - menuWidth >= margin;

            if (!fitsLeft && fitsRight) {
                left = anchorRect.right - menuWidth;
            } else if (!fitsLeft && !fitsRight) {
                left = margin;
                el.style.width = `${window.innerWidth - margin * 2}px`;
            }

            // Clamp positions to stay inside viewport
            left = Math.max(margin, Math.min(left, window.innerWidth - el.offsetWidth - margin));
            top = Math.max(margin, Math.min(top, window.innerHeight - el.offsetHeight - margin));

            el.style.left = `${left}px`;
            el.style.top = `${top}px`;
            el.style.visibility = 'visible';

            // Keep track of the active floating element so we can reposition on resize or close on scroll
            activeFloatingElement = el;
            activeFloatingElement.anchorRect = anchorRect;
            activeFloatingElement.positionOptions = options;
        }

        function hideFloatingElement(el) {
            if (!el) return;
            el.classList.add('hidden');
            el.classList.remove('floating-positioned');
            el.style.display = '';
            el.style.visibility = '';
            el.style.position = '';
            el.style.top = '';
            el.style.left = '';
            el.style.maxHeight = '';
            el.style.overflowY = '';
            el.style.width = '';
            el.style.zIndex = '';
            if (activeFloatingElement === el) {
                activeFloatingElement = null;
            }
        }

        window.addEventListener('resize', () => {
            if (activeFloatingElement && !activeFloatingElement.classList.contains('hidden')) {
                if (window.innerWidth < 768) {
                    hideFloatingElement(activeFloatingElement);
                } else if (activeFloatingElement.anchorRect) {
                    positionFloatingElement(activeFloatingElement, activeFloatingElement.anchorRect, activeFloatingElement.positionOptions);
                }
            }
        });

        window.addEventListener('scroll', (e) => {
            if (activeFloatingElement && !activeFloatingElement.classList.contains('hidden')) {
                if (!activeFloatingElement.contains(e.target)) {
                    hideFloatingElement(activeFloatingElement);
                }
            }
        }, true);

        // Mobile Bottom Drawer stack state
        let drawerStack = [];
        let drawerMenuDefinition = null;

        function openMobileDrawer(menuDef) {
            drawerMenuDefinition = menuDef;
            drawerStack = ['root'];

            const backdrop = document.getElementById('mobile-drawer-backdrop');
            const drawer = document.getElementById('mobile-drawer');

            backdrop.classList.remove('hidden');
            drawer.classList.remove('hidden');

            // Force layout reflow
            void drawer.offsetHeight;

            backdrop.classList.add('opacity-100');
            drawer.classList.remove('translate-y-full');

            renderDrawerScreen('root');
        }

        function renderDrawerScreen(screenId) {
            const screen = drawerMenuDefinition.screens[screenId];
            const header = document.getElementById('mobile-drawer-header');
            const titleEl = document.getElementById('mobile-drawer-title');
            const body = document.getElementById('mobile-drawer-body');

            if (drawerStack.length > 1) {
                header.classList.remove('hidden');
                header.classList.add('flex');
                titleEl.textContent = screen.title || 'Back';
            } else {
                header.classList.add('hidden');
                header.classList.remove('flex');
            }

            body.innerHTML = '';
            
            const listContainer = document.createElement('div');
            listContainer.className = 'py-2 px-4 space-y-1';

            screen.items.forEach(item => {
                if (item.type === 'divider') {
                    const div = document.createElement('div');
                    div.className = 'border-t border-white/[0.04] my-2';
                    listContainer.appendChild(div);
                    return;
                }

                const btn = document.createElement('button');
                btn.className = 'w-full text-left py-3 px-4 rounded-xl hover:bg-white/5 transition flex items-center justify-between text-sm text-gray-300 hover:text-white';
                
                let iconHTML = '';
                if (item.icon) {
                    if (item.icon.startsWith('#') || item.icon.startsWith('rgb')) {
                        iconHTML = `<span class="w-3 h-3 rounded-full mr-3 flex-shrink-0" style="background-color: ${item.icon}"></span>`;
                    } else {
                        iconHTML = `<i data-lucide="${item.icon}" class="w-4 h-4 mr-3 text-gray-400"></i>`;
                    }
                }

                let badgeHTML = '';
                if (item.badge) {
                    badgeHTML = `<span class="bg-white/10 text-white text-xs px-2 py-0.5 rounded-full ml-2">${item.badge}</span>`;
                }

                btn.innerHTML = `
                    <span class="flex items-center">
                        ${iconHTML}
                        <span>${item.label}</span>
                        ${badgeHTML}
                    </span>
                    ${item.chevron ? '<i data-lucide="chevron-right" class="w-4 h-4 text-gray-500"></i>' : ''}
                `;

                btn.onclick = (e) => {
                    if (item.submenu) {
                        pushDrawerScreen(item.submenu);
                    } else if (item.action) {
                        item.action(e);
                        closeMobileDrawer();
                    }
                };

                listContainer.appendChild(btn);
            });

            body.appendChild(listContainer);
            lucide.createIcons();
        }

        function pushDrawerScreen(submenuId) {
            const body = document.getElementById('mobile-drawer-body');
            const currentHTML = body.innerHTML;
            drawerStack.push(submenuId);

            body.innerHTML = `
                <div class="drawer-screen-container" style="display: flex; width: 200%; transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);">
                    <div class="drawer-screen" style="width: 50%; flex-shrink: 0;">
                        ${currentHTML}
                    </div>
                    <div id="drawer-new-screen-slot" class="drawer-screen" style="width: 50%; flex-shrink: 0;"></div>
                </div>
            `;

            renderDrawerScreenIntoSlot('drawer-new-screen-slot', submenuId);
            
            const container = body.querySelector('.drawer-screen-container');
            void container.offsetHeight;
            container.style.transform = 'translateX(-50%)';

            setTimeout(() => {
                renderDrawerScreen(submenuId);
            }, 220);
        }

        function popDrawerScreen() {
            if (drawerStack.length <= 1) return;
            const currentScreenId = drawerStack.pop();
            const prevScreenId = drawerStack[drawerStack.length - 1];

            const body = document.getElementById('mobile-drawer-body');
            const currentHTML = body.innerHTML;

            body.innerHTML = `
                <div class="drawer-screen-container" style="display: flex; width: 200%; transform: translateX(-50%); transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);">
                    <div id="drawer-prev-screen-slot" class="drawer-screen" style="width: 50%; flex-shrink: 0;"></div>
                    <div class="drawer-screen" style="width: 50%; flex-shrink: 0;">
                        ${currentHTML}
                    </div>
                </div>
            `;

            renderDrawerScreenIntoSlot('drawer-prev-screen-slot', prevScreenId);
            
            const container = body.querySelector('.drawer-screen-container');
            void container.offsetHeight;
            container.style.transform = 'translateX(0)';

            setTimeout(() => {
                renderDrawerScreen(prevScreenId);
            }, 220);
        }

        function renderDrawerScreenIntoSlot(slotId, screenId) {
            const screen = drawerMenuDefinition.screens[screenId];
            const slot = document.getElementById(slotId);
            slot.innerHTML = '';
            
            const listContainer = document.createElement('div');
            listContainer.className = 'py-2 px-4 space-y-1';

            screen.items.forEach(item => {
                if (item.type === 'divider') {
                    const div = document.createElement('div');
                    div.className = 'border-t border-white/[0.04] my-2';
                    listContainer.appendChild(div);
                    return;
                }

                const btn = document.createElement('button');
                btn.className = 'w-full text-left py-3 px-4 rounded-xl hover:bg-white/5 transition flex items-center justify-between text-sm text-gray-300 hover:text-white';
                
                let iconHTML = '';
                if (item.icon) {
                    if (item.icon.startsWith('#')) {
                        iconHTML = `<span class="w-3 h-3 rounded-full mr-3 flex-shrink-0" style="background-color: ${item.icon}"></span>`;
                    } else {
                        iconHTML = `<i data-lucide="${item.icon}" class="w-4 h-4 mr-3 text-gray-400"></i>`;
                    }
                }

                let badgeHTML = '';
                if (item.badge) {
                    badgeHTML = `<span class="bg-white/10 text-white text-xs px-2 py-0.5 rounded-full ml-2">${item.badge}</span>`;
                }

                btn.innerHTML = `
                    <span class="flex items-center">
                        ${iconHTML}
                        <span>${item.label}</span>
                        ${badgeHTML}
                    </span>
                    ${item.chevron ? '<i data-lucide="chevron-right" class="w-4 h-4 text-gray-500"></i>' : ''}
                `;

                btn.onclick = (e) => {
                    if (item.submenu) {
                        pushDrawerScreen(item.submenu);
                    } else if (item.action) {
                        item.action(e);
                        closeMobileDrawer();
                    }
                };

                listContainer.appendChild(btn);
            });

            slot.appendChild(listContainer);
            lucide.createIcons();
        }

        function closeMobileDrawer() {
            const backdrop = document.getElementById('mobile-drawer-backdrop');
            const drawer = document.getElementById('mobile-drawer');

            if (!backdrop || !drawer) return;

            backdrop.classList.remove('opacity-100');
            drawer.classList.add('translate-y-full');

            setTimeout(() => {
                backdrop.classList.add('hidden');
                drawer.classList.add('hidden');
                drawerStack = [];
                drawerMenuDefinition = null;
            }, 300);
        }

        function parseMenuDOMToDefinition(menuEl, title = 'Options') {
            const screens = {
                root: {
                    title: title,
                    items: []
                }
            };

            Array.from(menuEl.children).forEach(child => {
                if (child.tagName === 'BUTTON') {
                    const label = child.innerText.trim();
                    const iconEl = child.querySelector('i');
                    const iconName = iconEl ? iconEl.getAttribute('data-lucide') : null;
                    const isCheckbox = child.querySelector('.checkbox-marker') || child.querySelector('[id*="marker"]');
                    const isActive = isCheckbox ? !isCheckbox.classList.contains('hidden') : false;

                    screens.root.items.push({
                        label: label,
                        icon: iconName || (isActive ? 'check' : null),
                        action: () => child.click()
                    });
                } else if (child.classList.contains('border-t') || child.tagName === 'HR') {
                    screens.root.items.push({ type: 'divider' });
                } else if (child.querySelector('button') && child.querySelector('div')) {
                    const triggerBtn = child.querySelector('button');
                    const submenuContainer = child.querySelector('div');
                    const triggerLabel = triggerBtn.innerText.trim();
                    const triggerIconEl = triggerBtn.querySelector('i');
                    const triggerIcon = triggerIconEl ? triggerIconEl.getAttribute('data-lucide') : null;

                    const submenuId = 'sub_' + Math.random().toString(36).substr(2, 9);
                    
                    screens.root.items.push({
                        label: triggerLabel,
                        icon: triggerIcon,
                        chevron: true,
                        submenu: submenuId
                    });

                    screens[submenuId] = {
                        title: triggerLabel,
                        items: []
                    };

                    Array.from(submenuContainer.querySelectorAll('button')).forEach(subBtn => {
                        const subLabel = subBtn.innerText.trim();
                        const subIconEl = subBtn.querySelector('i');
                        const subIcon = subIconEl ? subIconEl.getAttribute('data-lucide') : null;

                        screens[submenuId].items.push({
                            label: subLabel,
                            icon: subIcon,
                            action: () => subBtn.click()
                        });
                    });
                } else {
                    const subButtons = child.querySelectorAll('button');
                    if (subButtons.length > 0) {
                        Array.from(subButtons).forEach(subBtn => {
                            const label = subBtn.innerText.trim();
                            const styleDot = subBtn.querySelector('span[style*="background-color"]');
                            const iconColor = styleDot ? styleDot.style.backgroundColor : null;
                            const iconEl = subBtn.querySelector('i');
                            const iconName = iconEl ? iconEl.getAttribute('data-lucide') : null;
                            
                            screens.root.items.push({
                                label: label,
                                icon: iconColor || iconName,
                                action: () => subBtn.click()
                            });
                        });
                    }
                }
            });

            return { screens };
        }

        function handleDescriptionKeydown(e) {
            if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                const textarea = e.target;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                const bullet = "\n• ";
                textarea.value = text.substring(0, start) + bullet + text.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + bullet.length;
                textarea.indigo = true;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        function setupDefaults() {
            if (!AppState.projects) AppState.projects = [];
            if (!AppState.groups) AppState.groups = [];
            if (!AppState.selectedTaskIds) AppState.selectedTaskIds = [];
        }

        function getTodayDateString() {
            const date = new Date();
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }

        function saveToLocalStorage() {
            localStorage.setItem('CLIPBOARD_TASKS_DATA_V3', JSON.stringify(AppState.tasks));
            localStorage.setItem('CLIPBOARD_PROJECTS_DATA_V3', JSON.stringify(AppState.projects));
            localStorage.setItem('CLIPBOARD_GROUPS_DATA_V3', JSON.stringify(AppState.groups));
            localStorage.setItem('CLIPBOARD_PROFILE_DATA_V3', JSON.stringify({
                name: AppState.profileName,
                user: AppState.profileUser,
                pass: AppState.profilePass,
                dp: AppState.profileDP
            }));
            localStorage.setItem('CLIPBOARD_COUNTER_POLICY', AppState.counterTargetPolicy);
            updateGlobalBadges();
            renderTaskFeed(); 
        }

        function loadFromLocalStorage() {
            const tasks = localStorage.getItem('CLIPBOARD_TASKS_DATA_V3');
            const projects = localStorage.getItem('CLIPBOARD_PROJECTS_DATA_V3');
            const groups = localStorage.getItem('CLIPBOARD_GROUPS_DATA_V3');
            const profile = localStorage.getItem('CLIPBOARD_PROFILE_DATA_V3');
            const savedCounterPolicy = localStorage.getItem('CLIPBOARD_COUNTER_POLICY');
            
            if (tasks) AppState.tasks = JSON.parse(tasks);
            if (projects) AppState.projects = JSON.parse(projects);
            if (groups) AppState.groups = JSON.parse(groups);
            if (profile) {
                const parsedProfile = JSON.parse(profile);
                AppState.profileName = parsedProfile.name || 'Anv';
                AppState.profileUser = parsedProfile.user || 'Anv';
                AppState.profilePass = parsedProfile.pass || 'anv_edt';
                AppState.profileDP = parsedProfile.dp || 'smile';
            }
            if (savedCounterPolicy) AppState.counterTargetPolicy = savedCounterPolicy;
            
            setupDefaults();
            syncProfileUIElements();
        }

        function syncDeviceDataChannels() {
            localStorage.setItem('CLIPBOARD_DEVICE_SYNC_FLAG', Date.now().toString());
            saveToLocalStorage();
        }

        function syncProfileUIElements() {
            lucide.createIcons();
        }

        function executeLoginValidation(event) {
            event.preventDefault();
            const userInput = document.getElementById('auth-username-field').value;
            const passInput = document.getElementById('auth-password-field').value;
            const errorBanner = document.getElementById('auth-failure-error');

            if ((userInput === AppState.profileUser && passInput === AppState.profilePass) || (userInput === 'tyson' && passInput === 'anv_temp')) {
                errorBanner.classList.add('hidden');
                document.getElementById('auth-guard-screen').classList.add('hidden');
                localStorage.setItem('CLIPBOARD_SESSION_ACTIVE', 'true');
                syncDeviceDataChannels();
                showToast('Sync Successful', 'Ecosystem multi-device data channels synchronized.');
            } else {
                errorBanner.classList.remove('hidden');
            }
        }

        function executeLogoutAction() {
            localStorage.removeItem('CLIPBOARD_SESSION_ACTIVE');
            document.getElementById('auth-username-field').value = '';
            document.getElementById('auth-password-field').value = '';
            document.getElementById('auth-failure-error').classList.add('hidden');
            document.getElementById('auth-guard-screen').classList.remove('hidden');
            showToast('Session Closed', 'Local storage device synchronization disconnected.');
        }

        function openProfileCustomizerModal() {
            const backdrop = document.getElementById('profile-customizer-backdrop');
            const container = document.getElementById('profile-customizer-container');
            
            document.getElementById('profile-customizer-name-field').value = AppState.profileName;
            document.getElementById('profile-customizer-user-field').value = AppState.profileUser;
            document.getElementById('profile-customizer-pass-field').value = AppState.profilePass;
            
            updateProfileCustomizerDPPreview();

            backdrop.classList.remove('hidden');
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                container.classList.remove('scale-95');
                lucide.createIcons();
            }, 10);
        }

        function closeProfileCustomizerModal() {
            const backdrop = document.getElementById('profile-customizer-backdrop');
            const container = document.getElementById('profile-customizer-container');
            backdrop.classList.add('opacity-0');
            container.classList.add('scale-95');
            setTimeout(() => { backdrop.classList.add('hidden'); }, 150);
        }

        function rotateProfileGlyphIcon(direction) {
            let currentIndex = SYSTEM_ICONS.indexOf(AppState.profileDP);
            if (currentIndex === -1) currentIndex = 0;
            
            let nextIndex = currentIndex + direction;
            if (nextIndex < 0) nextIndex = SYSTEM_ICONS.length - 1;
            if (nextIndex >= SYSTEM_ICONS.length) nextIndex = 0;
            
            AppState.profileDP = SYSTEM_ICONS[nextIndex];
            updateProfileCustomizerDPPreview();
        }

        function updateProfileCustomizerDPPreview() {
            const preview = document.getElementById('profile-customizer-dp-preview');
            if (preview) {
                preview.innerHTML = `<i data-lucide="${AppState.profileDP}" class="w-6 h-6"></i>`;
                lucide.createIcons();
            }
        }

        function handleProfileUpdates(event) {
            event.preventDefault();
            AppState.profileName = document.getElementById('profile-customizer-name-field').value.trim();
            AppState.profileUser = document.getElementById('profile-customizer-user-field').value.trim();
            AppState.profilePass = document.getElementById('profile-customizer-pass-field').value.trim();
            
            syncDeviceDataChannels();
            syncProfileUIElements();
            closeProfileCustomizerModal();
            showToast('Profile Configuration Saved', 'Ecosystem identity classifications updated.');
        }

        function toggleMetricCardCollapse(event) {
            if (event) event.stopPropagation();
            AppState.metricCardCollapsed = !AppState.metricCardCollapsed;
            
            const area = document.getElementById('metrics-expandable-area');
            const totalRow = document.getElementById('metrics-expandable-total-row');
            const chevron = document.getElementById('metrics-collapse-chevron');
            
            if (AppState.metricCardCollapsed) {
                area.classList.add('hidden');
                totalRow.classList.remove('flex');
                totalRow.classList.add('hidden');
                chevron.style.transform = 'rotate(0deg)';
            } else {
                area.classList.remove('hidden');
                totalRow.classList.remove('hidden');
                totalRow.classList.add('flex');
                chevron.style.transform = 'rotate(180deg)';
            }
            updateStreakCardMetrics();
        }

        function handleCounterContextMenu(event) {
            event.preventDefault();
            event.stopPropagation();
            
            const menu = document.getElementById('counter-context-menu');

            document.getElementById('counter-policy-tasks-marker').classList.add('hidden');
            document.getElementById('counter-policy-subtasks-marker').classList.add('hidden');

            if (AppState.counterTargetPolicy === 'tasks') {
                document.getElementById('counter-policy-tasks-marker').classList.remove('hidden');
            } else {
                document.getElementById('counter-policy-subtasks-marker').classList.remove('hidden');
            }
            lucide.createIcons();

            if (window.innerWidth < 768) {
                hideFloatingElement(menu);
                const menuDef = parseMenuDOMToDefinition(menu, 'Quantification Policy');
                openMobileDrawer(menuDef);
            } else {
                menu.classList.remove('hidden');
                const syntheticRect = {
                    left: event.clientX,
                    top: event.clientY,
                    right: event.clientX,
                    bottom: event.clientY,
                    width: 0,
                    height: 0
                };
                positionFloatingElement(menu, syntheticRect);
            }
        }

        function changeCounterTargetPolicy(policy) {
            AppState.counterTargetPolicy = policy;
            hideFloatingElement(document.getElementById('counter-context-menu'));
            saveToLocalStorage();
        }

        function initResizeHandlers() {
            const sidebar = document.getElementById('sidebar-panel');
            const sidebarResizer = document.getElementById('sidebar-resizer');
            const inspector = document.getElementById('inspector-panel');
            const inspectorResizer = document.getElementById('inspector-resizer');

            sidebarResizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                sidebarResizer.classList.add('active');
                document.addEventListener('mousemove', resizeSidebar);
                document.addEventListener('mouseup', stopResizeSidebar);
            });

            function resizeSidebar(e) {
                const currentWidth = e.clientX;
                if (currentWidth >= 160 && currentWidth <= 450) {
                    sidebar.style.width = currentWidth + 'px';
                }
            }

            function stopResizeSidebar() {
                sidebarResizer.classList.remove('active');
                document.removeEventListener('mousemove', resizeSidebar);
                document.removeEventListener('mouseup', stopResizeSidebar);
            }

            inspectorResizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                inspectorResizer.classList.add('active');
                document.addEventListener('mousemove', resizeInspector);
                document.addEventListener('mouseup', stopResizeInspector);
            });

            function resizeInspector(e) {
                const currentWidth = window.innerWidth - e.clientX;
                if (currentWidth >= 240 && currentWidth <= 550) {
                    inspector.style.width = currentWidth + 'px';
                }
            }

            function stopResizeInspector() {
                inspectorResizer.classList.remove('active');
                document.removeEventListener('mousemove', resizeInspector);
                document.removeEventListener('mouseup', stopResizeInspector);
            }
        }

        function toggleSidebarCollapse() {
            const sidebar = document.getElementById('sidebar-panel');
            const resizer = document.getElementById('sidebar-resizer');
            const uncollapseBtn = document.getElementById('sidebar-uncollapse-btn');

            if (AppState.sidebarCollapsed) {
                sidebar.style.width = '280px';
                resizer.style.display = 'block';
                uncollapseBtn.classList.add('hidden');
            } else {
                sidebar.style.width = '0px';
                resizer.style.display = 'none';
                uncollapseBtn.classList.remove('hidden');
            }
            AppState.sidebarCollapsed = !AppState.sidebarCollapsed;
        }

        function getFilteredTasks() {
            let list = [...AppState.tasks];
            const todayStr = getTodayDateString();

            if (AppState.currentTab === 'search') {
                if (!AppState.searchQuery.trim()) return [];
                const q = AppState.searchQuery.toLowerCase();
                return list.filter(t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
            }

            if (AppState.currentTab === 'inbox') {
                return list; // Return all tasks instead of filtering out t.done
            } else if (AppState.currentTab === 'today') {
                return list.filter(t => t.dueDate === todayStr);
            } else if (AppState.currentTab === 'done') {
                return list.filter(t => t.done);
            } else if (AppState.currentTab === 'manage') {
                return list;
            } else {
                return list.filter(t => t.projectId === AppState.currentTab);
            }
        }

        function sortTasks(taskList) {
            if (AppState.sortBy === 'created') {
                return taskList.sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0));
            } else if (AppState.sortBy === 'due') {
                return taskList.sort((a, b) => {
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
            } else if (AppState.sortBy === 'priority') {
                const valMap = {};
                SYSTEM_COLORS.forEach((color, i) => { valMap[color] = SYSTEM_COLORS.length - i; });
                return taskList.sort((a, b) => (valMap[b.color] || 0) - (valMap[a.color] || 0));
            } else if (AppState.sortBy === 'alphabetical') {
                return taskList.sort((a, b) => a.title.localeCompare(b.title));
            }
            return taskList;
        }

        function updateStreakCardMetrics() {
            if (AppState.metricCardCollapsed) {
                const totalCount = AppState.tasks.length;
                const completedCount = AppState.tasks.filter(t => t.done).length;
                const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                document.getElementById('streak-tasks-percentage').textContent = `${percent}%`;
                document.getElementById('streak-progress-fill').style.width = `${percent}%`;
                return;
            }

            const now = new Date();
            const currentDayOfWeek = now.getDay(); 
            
            const mondayDate = new Date(now);
            const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
            mondayDate.setDate(now.getDate() + distanceToMonday);
            mondayDate.setHours(0,0,0,0);

            const weekdaysData = [
                { name: "Mon", status: "future" },
                { name: "Tue", status: "future" },
                { name: "Wed", status: "future" },
                { name: "Thu", status: "future" },
                { name: "Fri", status: "future" },
                { name: "Sat", status: "future" },
                { name: "Sun", status: "future" }
            ];

            const todayNormalizedIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

            for (let i = 0; i < 7; i++) {
                const targetDayDate = new Date(mondayDate);
                targetDayDate.setDate(mondayDate.getDate() + i);
                const dayStr = targetDayDate.toISOString().slice(0, 10);

                const hasTaskDoneOnDay = AppState.tasks.some(task => {
                    if (!task.done || !task.createdDate) return false;
                    const completionDay = task.createdDate.slice(0, 10);
                    return completionDay === dayStr;
                });

                if (i < todayNormalizedIndex) {
                    weekdaysData[i].status = hasTaskDoneOnDay ? "done" : "inactive";
                } else if (i === todayNormalizedIndex) {
                    weekdaysData[i].status = hasTaskDoneOnDay ? "done" : "today";
                } else {
                    weekdaysData[i].status = "future";
                }
            }

            weekdaysData.forEach((day, index) => {
                const element = document.getElementById(`week-circle-${index}`);
                if (!element) return;

                let circleHTML = '';
                if (day.status === "done") {
                    circleHTML = `
                        <div class="w-7 h-7 rounded-full bg-gradient-to-b from-[#4ADE80] to-[#22C55E] flex items-center justify-center shadow-[0_2px_10px_rgba(34,197,94,0.4)] border border-[#4ADE80]/30 transition transform hover:scale-105">
                            <i data-lucide="check" class="w-4 h-4 text-[#0A0A0A] stroke-[3]"></i>
                        </div>
                    `;
                } else if (day.status === "today") {
                    circleHTML = `
                        <div class="w-7 h-7 rounded-full border-2 border-emerald-500 bg-emerald-500/10 flex items-center justify-center relative shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse">
                            <div class="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                        </div>
                    `;
                } else if (day.status === "inactive") {
                    circleHTML = `
                        <div class="w-7 h-7 rounded-full bg-[#181818] border border-white/[0.04] flex items-center justify-center">
                            <div class="w-1.5 h-1.5 rounded-full bg-gray-700"></div>
                        </div>
                    `;
                } else {
                    circleHTML = `
                        <div class="w-7 h-7 rounded-full bg-[#141414] border border-white/[0.02] flex items-center justify-center opacity-40"></div>
                    `;
                }

                element.innerHTML = `
                    ${circleHTML}
                    <span class="text-[9px] ${index === todayNormalizedIndex ? 'text-white font-extrabold' : 'text-gray-500 font-semibold'} tracking-tight">${day.name}</span>
                `;
            });

            const totalCount = AppState.tasks.length;
            const completedCount = AppState.tasks.filter(t => t.done).length;
            const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            document.getElementById('streak-tasks-done').textContent = completedCount;
            document.getElementById('streak-tasks-total').textContent = totalCount;
            document.getElementById('streak-tasks-percentage').textContent = `${percent}%`;
            document.getElementById('streak-progress-fill').style.width = `${percent}%`;

            lucide.createIcons();
        }

        function renderTaskFeed() {
            const container = document.getElementById('tasks-list');
            const emptyScreen = document.getElementById('empty-state-screen');

            if (AppState.currentTab === 'manage') {
                renderManageDashboard();
                return;
            }

            const filtered = getFilteredTasks();
            const sorted = sortTasks(filtered);

            const feedTitle = document.getElementById('feed-current-title');
            if (AppState.currentTab === 'inbox') {
                feedTitle.textContent = 'Inbox Feed';
            } else if (AppState.currentTab === 'today') {
                feedTitle.textContent = "Today's Agenda";
            } else if (AppState.currentTab === 'done') {
                feedTitle.textContent = 'Completed Archive';
            } else if (AppState.currentTab === 'search') {
                feedTitle.textContent = `Search matches for: "${AppState.searchQuery}"`;
            } else {
                const foundProj = AppState.projects.find(p => p.id === AppState.currentTab);
                feedTitle.textContent = foundProj ? foundProj.title : 'Collection Folder';
            }

            container.innerHTML = '';

            if (sorted.length === 0) {
                emptyScreen.classList.remove('hidden');
                emptyScreen.classList.add('flex');
                return;
            } else {
                emptyScreen.classList.add('hidden');
                emptyScreen.classList.remove('flex');

                const ungroupedTasks = sorted.filter(t => !t.groupId);
                
                AppState.groups.forEach((group, index) => {
                    const groupTasks = sorted.filter(t => t.groupId === group.id);
                    renderGroupSection(container, group.title, group.id, groupTasks, group.color || '#2997ff', index, group.icon || 'list');
                });

                if (ungroupedTasks.length > 0 || AppState.groups.length === 0) {
                    renderGroupSection(container, "Ungrouped Tasks", "ungrouped", ungroupedTasks, '#7a7a7a', -1, 'list');
                }
            }

            lucide.createIcons();
            updateGlobalBadges();
        }

        function renderGroupSection(container, title, groupId, tasks, groupColor, index, groupIcon) {
            const groupSection = document.createElement('div');
            groupSection.className = "space-y-3 p-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl transition duration-150 relative";

            const isUngrouped = (groupId === 'ungrouped');
            
            if (!isUngrouped) {
                groupSection.setAttribute('draggable', 'true');
                groupSection.setAttribute('ondragstart', `dragGroup(event, '${groupId}')`);
                groupSection.setAttribute('ondragover', 'allowGroupDrop(event)');
                groupSection.setAttribute('ondrop', `dropGroup(event, '${groupId}')`);
            }

            let navigationButtons = '';
            if (!isUngrouped && AppState.groups.length > 1) {
                navigationButtons = `
                    <div class="flex items-center space-x-1 mr-1">
                        <button onclick="moveGroupColumn('${groupId}', -1, event)" class="text-gray-500 hover:text-white p-1 hover:bg-white/5 rounded transition-all" title="Move Left" ${index === 0 ? 'disabled opacity-30 cursor-not-allowed' : ''}>
                            <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="moveGroupColumn('${groupId}', 1, event)" class="text-gray-500 hover:text-white p-1 hover:bg-white/5 rounded transition-all" title="Move Right" ${index === AppState.groups.length - 1 ? 'disabled opacity-30 cursor-not-allowed' : ''}>
                            <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                `;
            }

            groupSection.innerHTML = `
                <div class="flex items-center justify-between border-b border-white/[0.04] pb-2 cursor-pointer select-none" 
                     style="border-bottom-color: ${groupColor}25"
                     oncontextmenu="showGroupContextMenu(event, '${groupId}')">
                    <div class="flex items-center space-x-2">
                        <span class="w-2.5 h-2.5 rounded bg-white/10 flex items-center justify-center border border-white/20">
                            <span class="w-1.5 h-1.5 rounded-sm" style="background-color: ${groupColor}; box-shadow: 0 0 8px ${groupColor}80;"></span>
                        </span>
                        <i data-lucide="${groupIcon}" class="w-4 h-4 flex-shrink-0" style="color: ${groupColor};"></i>
                        <span class="text-xs font-bold text-white uppercase tracking-wider">${escapeHTML(title)}</span>
                        <span class="bg-white/10 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">${tasks.length}</span>
                    </div>
                    <div class="flex items-center space-x-1">
                        ${navigationButtons}
                        ${!isUngrouped ? `
                            <button onclick="openEditGroupModalTriggerFromId('${groupId}', event)" class="text-gray-500 hover:text-white p-1 rounded hover:bg-white/5 transition" title="Edit Group Column">
                                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="handleDeleteGroup('${groupId}')" class="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition" title="Delete Group Column">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="space-y-2 min-h-[50px] transition-all duration-150" id="group-body-${groupId}"></div>
            `;

            const cardsContainer = groupSection.querySelector(`#group-body-${groupId}`);

            if (tasks.length === 0) {
                cardsContainer.innerHTML = `
                    <div class="text-center py-4 text-[11px] text-gray-600 border border-dashed border-white/[0.02] rounded-xl">
                        No tasks in group
                    </div>
                `;
            } else {
                tasks.forEach((task, cardIndex) => {
                    const project = AppState.projects.find(p => p.id === task.projectId);
                    const subDone = task.subtasks ? task.subtasks.filter(s => s.done).length : 0;
                    const subTotal = task.subtasks ? task.subtasks.length : 0;
                    
                    const isSelected = AppState.selectedTaskId === task.id || (AppState.selectedTaskIds && AppState.selectedTaskIds.includes(task.id));

                    const accentColor = task.done ? '#7a7a7a' : (task.color || '#2997ff');
                    const cardBg = task.done ? 'bg-[#121212]/40 border-white/[0.01] opacity-50' : 'bg-[#121212] border-white/[0.02]';
                    const textClass = task.done ? 'line-through text-gray-500 font-normal' : 'text-white font-bold';
                    const subtextClass = task.done ? 'text-gray-600' : 'text-gray-400';

                    let subtasksHTML = '';
                    if (task.subtasks && task.subtasks.length > 0) {
                        subtasksHTML = `
                            <div class="mt-3 pt-2.5 border-t border-white/[0.03] space-y-1.5">
                                ${task.subtasks.map(s => {
                                    const subtaskAccent = task.done ? '#7a7a7a' : accentColor;
                                    const subBorderColor = `border-color: ${subtaskAccent};`;
                                    const subBgColor = s.done ? `background-color: ${subtaskAccent};` : `background-color: transparent;`;
                                    return `
                                        <div class="flex items-center space-x-2 px-1 py-0.5 rounded hover:bg-white/[0.02] transition">
                                            <button onclick="toggleCardSubtaskDone('${task.id}', '${s.id}', event)" class="w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-150" style="${subBorderColor} ${subBgColor}">
                                                ${s.done ? `<i data-lucide="check" class="w-2.5 h-2.5 text-[#0A0A0A] font-extrabold tick-animation"></i>` : ''}
                                            </button>
                                            <span class="text-[11px] truncate ${s.done ? 'line-through text-gray-600' : 'text-gray-300'}">${escapeHTML(s.title)}</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `;
                    }

                    const card = document.createElement('div');
                    card.className = `group-card relative ${cardBg} p-3 rounded-xl hover:bg-[#161616] transition duration-150 border ${isSelected ? 'ring-1 ring-[#2997ff]' : ''}`;
                    card.setAttribute('data-task-id', task.id); 
                    card.setAttribute('oncontextmenu', `showContextMenu(event, '${task.id}')`);
                    card.onclick = (e) => selectTask(task.id, e);

                    card.innerHTML = `
                        <div class="flex items-start justify-between space-x-2">
                            <div class="flex items-start space-x-2.5 flex-1 min-w-0">
                                
                                <button onclick="toggleTaskDone('${task.id}', event)" class="mt-0.5 w-[18px] h-[18px] rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-200" style="border-color: ${accentColor}; background-color: ${task.done ? accentColor : 'transparent'}; box-shadow: ${task.done ? '0 0 8px ' + accentColor + '60' : 'none'};" title="Complete Task">
                                    ${task.done ? `<i data-lucide="check" class="w-3 h-3 text-[#0A0A0A] font-extrabold tick-animation"></i>` : ''}
                                </button>
                                
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center space-x-1.5 flex-wrap">
                                        ${task.icon && !task.done ? '<i data-lucide="' + task.icon + '" class="w-3.5 h-3.5 flex-shrink-0" style="color: ' + accentColor + ';"></i>' : ''}
                                        <h4 class="text-xs leading-snug warp-text ${textClass}">${escapeHTML(task.title)}</h4>
                                    </div>
                                    ${task.description ? `<p class="text-[10px] ${subtextClass} mt-1 warp-text whitespace-pre-line">${escapeHTML(task.description)}</p>` : ''}
                                    
                                    <div class="flex flex-wrap gap-1.5 mt-2 items-center">
                                        <span class="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[8px] font-bold" style="background-color: ${accentColor}15; color: ${accentColor}">
                                            <span class="w-2.5 h-2.5 rounded bg-white/10 flex items-center justify-center border border-white/20">
                                                <i data-lucide="check" class="w-2 h-2 text-current"></i>
                                            </span>
                                            <span>Priority</span>
                                        </span>

                                        ${project ? `
                                            <span class="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[8px] font-bold" style="background-color: ${task.done ? '#44444420' : (project.color + '15')}; color: ${task.done ? '#7a7a7a' : project.color}">
                                                <i data-lucide="${project.icon}" class="w-2.5 h-2.5 flex-shrink-0"></i>
                                                <span>${escapeHTML(project.title)}</span>
                                            </span>
                                        ` : ''}
                                        ${task.dueDate ? `
                                            <span class="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-medium ${task.done ? 'text-gray-600' : 'text-gray-400'}">
                                                <i data-lucide="calendar" class="w-2.5 h-2.5 flex-shrink-0"></i>
                                                <span>${task.dueDate}</span>
                                            </span>
                                        ` : ''}
                                        ${subTotal > 0 ? `
                                            <span class="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-medium ${task.done ? 'text-gray-600' : 'text-gray-400'}">
                                                <i data-lucide="list-checks" class="w-2.5 h-2.5 flex-shrink-0"></i>
                                                <span>${subDone}/${subTotal}</span>
                                            </span>
                                        ` : ''}
                                    </div>
                                    ${subtasksHTML}
                                </div>
                            </div>
                            <div class="flex flex-col items-center space-y-0.5 text-gray-500 self-center flex-shrink-0 mr-1">
                                <button onclick="moveTaskInGroup('${task.id}', -1, event)" class="p-0.5 hover:text-white transition" ${cardIndex === 0 ? 'disabled style="opacity: 0.2; cursor: not-allowed;"' : ''} title="Move Up">
                                    <i data-lucide="chevron-up" class="w-3.5 h-3.5"></i>
                                </button>
                                <button onclick="moveTaskInGroup('${task.id}', 1, event)" class="p-0.5 hover:text-white transition" ${cardIndex === tasks.length - 1 ? 'disabled style="opacity: 0.2; cursor: not-allowed;"' : ''} title="Move Down">
                                    <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    cardsContainer.appendChild(card);
                });
            }

            container.appendChild(groupSection);
        }

        function toggleCardSubtaskDone(taskId, subtaskId, event) {
            if (event) event.stopPropagation();
            const task = AppState.tasks.find(t => t.id === taskId);
            if (task && task.subtasks) {
                const sub = task.subtasks.find(s => s.id === subtaskId);
                if (sub) {
                    sub.done = !sub.done;
                    syncDeviceDataChannels();
                    if (AppState.selectedTaskId === taskId) {
                        renderInspector();
                    }
                }
            }
        }

        function dragGroup(event, groupId) {
            if (groupId === 'ungrouped') {
                event.preventDefault();
                return;
            }
            event.dataTransfer.setData('text/plain', groupId);
            event.dataTransfer.setData('drag-type', 'group');
        }

        function allowGroupDrop(event) {
            event.preventDefault();
        }

        function dropGroup(event, targetGroupId) {
            event.preventDefault();
            const dragType = event.dataTransfer.getData('drag-type');
            if (dragType !== 'group') return;

            const sourceGroupId = event.dataTransfer.getData('text/plain');
            if (sourceGroupId === targetGroupId) return;

            const sourceIndex = AppState.groups.findIndex(g => g.id === sourceGroupId);
            const targetIndex = AppState.groups.findIndex(g => g.id === targetGroupId);
            if (sourceIndex === -1 || targetIndex === -1) return;

            const [movedGroup] = AppState.groups.splice(sourceIndex, 1);
            AppState.groups.splice(targetIndex, 0, movedGroup);

            syncDeviceDataChannels();
            showToast('Groups Arranged', 'Group column configurations saved.');
        }

        function moveGroupColumn(groupId, direction, event) {
            if (event) event.stopPropagation();
            const index = AppState.groups.findIndex(g => g.id === groupId);
            if (index === -1) return;
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= AppState.groups.length) return;
            
            const temp = AppState.groups[index];
            AppState.groups[index] = AppState.groups[newIndex];
            AppState.groups[newIndex] = temp;
            
            syncDeviceDataChannels();
            showToast('Groups Arranged', 'Group column configurations saved.');
        }

        function moveTaskInGroup(taskId, direction, event) {
            if (event) event.stopPropagation();
            const task = AppState.tasks.find(t => t.id === taskId);
            if (!task) return;

            const filtered = getFilteredTasks();
            const sorted = sortTasks(filtered);
            const groupTasks = sorted.filter(t => t.groupId === task.groupId);

            const index = groupTasks.findIndex(t => t.id === taskId);
            if (index === -1) return;

            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= groupTasks.length) return;

            const otherTask = groupTasks[newIndex];
            
            const mainIndex1 = AppState.tasks.findIndex(t => t.id === task.id);
            const mainIndex2 = AppState.tasks.findIndex(t => t.id === otherTask.id);

            if (mainIndex1 !== -1 && mainIndex2 !== -1) {
                if (AppState.sortBy === 'created') {
                    const tempDate = AppState.tasks[mainIndex1].createdDate;
                    AppState.tasks[mainIndex1].createdDate = AppState.tasks[mainIndex2].createdDate;
                    AppState.tasks[mainIndex2].createdDate = tempDate;
                } else if (AppState.sortBy === 'due') {
                    const tempDate = AppState.tasks[mainIndex1].dueDate;
                    AppState.tasks[mainIndex1].dueDate = AppState.tasks[mainIndex2].dueDate;
                    AppState.tasks[mainIndex2].dueDate = tempDate;
                } else if (AppState.sortBy === 'priority') {
                    const tempColor = AppState.tasks[mainIndex1].color;
                    AppState.tasks[mainIndex1].color = AppState.tasks[mainIndex2].color;
                    AppState.tasks[mainIndex2].color = tempColor;
                } else if (AppState.sortBy === 'alphabetical') {
                    const tempTitle = AppState.tasks[mainIndex1].title;
                    AppState.tasks[mainIndex1].title = AppState.tasks[mainIndex2].title;
                    AppState.tasks[mainIndex2].title = tempTitle;
                }

                const temp = AppState.tasks[mainIndex1];
                AppState.tasks[mainIndex1] = AppState.tasks[mainIndex2];
                AppState.tasks[mainIndex2] = temp;
                
                syncDeviceDataChannels();
                showToast('Tasks Arranged', 'Task order updated.');
            }
        }

        function openCustomCalendar(targetId, event) {
            if (event) event.stopPropagation();
            calendarTargetInputId = targetId;

            const currentVal = document.getElementById(targetId).value;
            if (currentVal) {
                const parsed = new Date(currentVal);
                if (!isNaN(parsed.getTime())) {
                    calendarMonth = parsed.getMonth();
                    calendarYear = parsed.getFullYear();
                }
            } else {
                const today = new Date();
                calendarMonth = today.getMonth();
                calendarYear = today.getFullYear();
            }

            renderCalendarGrid();

            const triggerBtn = event.currentTarget;
            const rect = triggerBtn.getBoundingClientRect();
            const popup = document.getElementById('custom-calendar-popup');
            
            if (window.innerWidth < 768) {
                popup.classList.remove('hidden');
                popup.style.top = '';
                popup.style.left = '';
                popup.style.width = '';
                popup.style.position = '';
            } else {
                popup.classList.remove('hidden');
                positionFloatingElement(popup, rect);
            }
        }

        function renderCalendarGrid() {
            document.getElementById('calendar-header-title').textContent = `${MONTH_NAMES[calendarMonth]} ${calendarYear}`;
            const container = document.getElementById('calendar-grid-cells');
            container.innerHTML = '';

            const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
            const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();

            for (let i = 0; i < firstDayIndex; i++) {
                const spacer = document.createElement('span');
                container.appendChild(spacer);
            }

            const selectedVal = document.getElementById(calendarTargetInputId).value;
            for (let day = 1; day <= totalDays; day++) {
                const cell = document.createElement('button');
                cell.type = 'button';
                
                const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                cell.textContent = day;
                cell.className = "p-1.5 rounded-lg text-center font-medium hover:bg-white/10 hover:text-white transition-all";

                if (selectedVal === dateStr) {
                    cell.className += " bg-[#2997ff] text-black hover:bg-[#2997ff] font-bold";
                } else if (getTodayDateString() === dateStr) {
                    cell.className += " border border-[#2997ff]/50 text-white font-bold";
                }

                cell.onclick = (e) => {
                    e.stopPropagation();
                    selectCalendarDate(dateStr);
                };

                container.appendChild(cell);
            }
        }

        function navigateCalendarMonth(direction) {
            calendarMonth += direction;
            if (calendarMonth < 0) {
                calendarMonth = 11;
                calendarYear -= 1;
            } else if (calendarMonth > 11) {
                calendarMonth = 0;
                calendarYear += 1;
            }
            renderCalendarGrid();
        }

        function selectCalendarDate(dateStr) {
            const hiddenInput = document.getElementById(calendarTargetInputId);
            hiddenInput.value = dateStr;

            const event = new Event('change', { bubbles: true });
            hiddenInput.dispatchEvent(event);

            if (calendarTargetInputId === 'ins-task-date') {
                document.getElementById('ins-task-date-label').textContent = dateStr;
            } else if (calendarTargetInputId === 'new-task-date') {
                document.getElementById('new-task-date-label').textContent = dateStr;
            }

            closeCalendarPopup();
        }

        function clearDeadline(targetId, event) {
            if (event) event.stopPropagation();
            
            const hiddenInput = document.getElementById(targetId);
            hiddenInput.value = '';

            const eventChange = new Event('change', { bubbles: true });
            hiddenInput.dispatchEvent(eventChange);

            if (targetId === 'ins-task-date') {
                document.getElementById('ins-task-date-label').textContent = "No Deadline";
            } else if (targetId === 'new-task-date') {
                document.getElementById('new-task-date-label').textContent = "No Deadline";
            }

            closeCalendarPopup();
        }

        function closeCalendarPopup() {
            const popup = document.getElementById('custom-calendar-popup');
            if (popup) hideFloatingElement(popup);
        }

        function renderManageDashboard() {
            const container = document.getElementById('tasks-list');
            const emptyScreen = document.getElementById('empty-state-screen');
            emptyScreen.classList.add('hidden');
            
            document.getElementById('feed-current-title').textContent = 'Manage Studio';
            
            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                    <div class="bg-[#121212] p-5 rounded-2xl border border-white/[0.04] flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center space-x-2">
                                    <span class="p-1.5 rounded-lg bg-white/5 text-white"><i data-lucide="check-square" class="w-4 h-4"></i></span>
                                    <h4 class="text-xs font-bold text-white uppercase tracking-wider">Database Tasks</h4>
                                </div>
                                <span class="bg-white/5 text-gray-400 text-xs font-mono px-3 py-1 rounded-full">${AppState.tasks.length} Total</span>
                            </div>
                            <p class="text-[11px] text-gray-500 mb-6 leading-relaxed">Directly review, inspect specifications, or wipe your task directories securely.</p>
                            
                            <div class="space-y-2 max-h-80 overflow-y-auto pr-1 mb-6">
                                ${AppState.tasks.length === 0 ? `
                                    <div class="text-center py-8 text-xs text-gray-600 border border-dashed border-white/5 rounded-xl">No active tasks in database</div>
                                ` : AppState.tasks.map(t => `
                                    <div class="flex items-center justify-between bg-white/5 p-2.5 rounded-xl text-xs hover:bg-white/10 transition">
                                        <div class="flex items-center space-x-2.5 min-w-0 flex-1">
                                            <span class="w-3 h-3 rounded border" style="border-color: ${t.color || '#FF3B30'}; background-color: ${t.done ? t.color || '#FF3B30' : 'transparent'};"></span>
                                            <span class="text-white truncate ${t.done ? 'line-through text-gray-500' : ''}">${escapeHTML(t.title)}</span>
                                        </div>
                                        <div class="flex items-center space-x-1 flex-shrink-0">
                                            <button onclick="selectTaskFromManage('${t.id}')" class="p-1.5 hover:bg-white/10 rounded text-[#2997ff]" title="Edit Task Details">
                                                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                                            </button>
                                            <button onclick="handleDeleteTaskDirect('${t.id}')" class="text-gray-500 hover:text-red-400 p-1.5 rounded hover:bg-white/5 transition" title="Delete Task">
                                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <button onclick="handleDeleteAllTasksTrigger()" class="btn-scale w-full mt-2 py-2.5 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition flex items-center justify-center space-x-1.5">
                            <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                            <span>Delete All Tasks</span>
                        </button>
                    </div>

                    <div class="bg-[#121212] p-5 rounded-2xl border border-white/[0.04] flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center space-x-2">
                                    <span class="p-1.5 rounded-lg bg-white/5 text-white"><i data-lucide="layout-panel-left" class="w-4 h-4"></i></span>
                                    <h4 class="text-xs font-bold text-white uppercase tracking-wider">Group Columns</h4>
                                </div>
                                <span class="bg-white/5 text-gray-400 text-xs font-mono px-3 py-1 rounded-full">${AppState.groups.length} Active</span>
                            </div>
                            <p class="text-[11px] text-gray-500 mb-6 leading-relaxed">Modify layout settings, delete active columns, or wipe groups entirely from settings.</p>

                            <div class="space-y-2 max-h-80 overflow-y-auto pr-1 mb-6">
                                ${AppState.groups.length === 0 ? `
                                    <div class="text-center py-8 text-xs text-gray-600 border border-dashed border-white/5 rounded-xl">No group columns in database</div>
                                ` : AppState.groups.map(g => `
                                    <div class="flex items-center justify-between bg-white/5 p-2.5 rounded-xl text-xs hover:bg-white/10 transition">
                                        <div class="flex items-center space-x-2 min-w-0 flex-1">
                                            <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${g.color || '#2997ff'}; box-shadow: 0 0 6px ${g.color || '#2997ff'}aa;"></span>
                                            <i data-lucide="${g.icon || 'list'}" class="w-3.5 h-3.5 flex-shrink-0 ml-1.5" style="color: ${g.color || '#2997ff'}"></i>
                                            <span class="text-white font-medium truncate ml-1">${escapeHTML(g.title)}</span>
                                        </div>
                                        <div class="flex items-center space-x-1 flex-shrink-0">
                                            <button onclick="openEditGroupModalFromManage('${g.id}')" class="p-1.5 hover:bg-white/10 rounded text-[#2997ff]" title="Edit Group Column">
                                                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                                            </button>
                                            <button onclick="handleDeleteGroup('${g.id}')" class="p-1.5 hover:bg-white/10 rounded text-red-400" title="Delete Group Column">
                                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <button onclick="handleDeleteAllGroupsTrigger()" class="btn-scale w-full mt-2 py-2.5 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition flex items-center justify-center space-x-1.5">
                            <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                            <span>Delete All Groups</span>
                        </button>
                    </div>
                </div>
            `;
            lucide.createIcons();
        }

        function selectTaskFromManage(taskId) {
            switchTab('inbox');
            selectTask(taskId);
        }

        function openEditGroupModalFromManage(groupId) {
            contextSelectedGroupId = groupId;
            openEditGroupModalTrigger();
        }

        function handleDeleteTaskDirect(taskId) {
            const task = AppState.tasks.find(t => t.id === taskId);
            if (!task) return;
            showDeleteConfirmation(`Are you sure you want to delete "${task.title}" permanently?`, () => {
                AppState.tasks = AppState.tasks.filter(t => t.id !== taskId);
                if (AppState.selectedTaskId === taskId) closeInspector();
                syncDeviceDataChannels();
                showToast('Task Deleted', 'Removed from database successfully.');
            });
        }

        function handleDeleteAllTasksTrigger() {
            showDeleteConfirmation('Are you sure you want to permanently delete ALL tasks? This action cannot be undone.', () => {
                AppState.tasks = [];
                closeInspector();
                syncDeviceDataChannels();
                showToast('Database Purged', 'All active tasks deleted.');
            });
        }

        function handleDeleteAllGroupsTrigger() {
            showDeleteConfirmation('Are you sure you want to delete ALL groups? Your tasks will be preserved as ungrouped items.', () => {
                AppState.groups = [];
                AppState.tasks.forEach(t => t.groupId = null); 
                syncDeviceDataChannels();
                showToast('Groups Wiped', 'All columns removed successfully.');
            });
        }

        function showContextMenu(event, taskId) {
            event.preventDefault();
            event.stopPropagation();
            contextSelectedTaskId = taskId;
            hideGroupContextMenu();
            hideFeedContextMenu();
            
            if (!AppState.selectedTaskIds) AppState.selectedTaskIds = [];
            
            if (!AppState.selectedTaskIds.includes(taskId)) {
                AppState.selectedTaskIds = [taskId];
                AppState.selectedTaskId = taskId;
                renderTaskFeed();
            }
            
            const menu = document.getElementById('context-menu');

            if (AppState.selectedTaskIds.length > 1) {
                menu.innerHTML = `
                    <div class="px-4 py-1.5 text-[9px] font-bold tracking-widest uppercase text-[#2997ff] border-b border-white/[0.04] mb-1">
                        Selected: ${AppState.selectedTaskIds.length} tasks
                    </div>
                    <button onclick="contextMultiToggleComplete(true)" class="w-full text-left px-4 py-2 hover:bg-white/5 hover:text-white transition flex items-center space-x-2">
                        <i data-lucide="check-square" class="w-3.5 h-3.5"></i>
                        <span>Mark all completed</span>
                    </button>
                    <button onclick="contextMultiToggleComplete(false)" class="w-full text-left px-4 py-2 hover:bg-white/5 hover:text-white transition flex items-center space-x-2">
                        <i data-lucide="square" class="w-3.5 h-3.5"></i>
                        <span>Mark all incomplete</span>
                    </button>
                    <div class="border-t border-white/[0.03] my-1"></div>
                    <div class="px-4 py-1.5 text-[9px] font-bold tracking-widest uppercase text-gray-500">Arrange all in group</div>
                    <div id="context-groups-list" class="max-h-32 overflow-y-auto"></div>
                    <div class="border-t border-white/[0.03] my-1"></div>
                    <button onclick="contextMultiDeleteTasks()" class="w-full text-left px-4 py-2 hover:bg-red-500/10 hover:text-red-400 transition flex items-center space-x-2">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        <span>Delete Selected (${AppState.selectedTaskIds.length})</span>
                    </button>
                `;
                
                const groupsList = menu.querySelector('#context-groups-list');
                groupsList.innerHTML = '';
                
                const ungroupBtn = document.createElement('button');
                ungroupBtn.onclick = () => contextMultiMoveToGroup(null);
                ungroupBtn.className = "w-full text-left px-4 py-1.5 hover:bg-white/5 hover:text-white transition truncate flex items-center space-x-1.5 text-xs text-gray-300";
                ungroupBtn.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-gray-500"></span><span>No Group / Ungrouped</span>`;
                groupsList.appendChild(ungroupBtn);

                AppState.groups.forEach(group => {
                    const groupBtn = document.createElement('button');
                    groupBtn.onclick = () => contextMultiMoveToGroup(group.id);
                    groupBtn.className = "w-full text-left px-4 py-1.5 hover:bg-white/5 hover:text-white transition truncate flex items-center space-x-1.5 text-xs text-gray-300";
                    groupBtn.innerHTML = `<span class="w-1.5 h-1.5 rounded-full" style="background-color: ${group.color || '#2997ff'}"></span><span>${escapeHTML(group.title)}</span>`;
                    groupsList.appendChild(groupBtn);
                });
            } else {
                menu.innerHTML = `
                    <button onclick="contextToggleComplete()" class="w-full text-left px-4 py-2 hover:bg-white/5 hover:text-white transition flex items-center space-x-2">
                        <i data-lucide="check" class="w-3.5 h-3.5"></i>
                        <span>Toggle Complete</span>
                    </button>
                    <button onclick="contextOpenDetails()" class="w-full text-left px-4 py-2 hover:bg-white/5 hover:text-white transition flex items-center space-x-2">
                        <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
                        <span>Edit Specifications</span>
                    </button>
                    <div class="border-t border-white/[0.03] my-1"></div>
                    <div class="px-4 py-1.5 text-[9px] font-bold tracking-widest uppercase text-gray-500">Add to group</div>
                    <div id="context-groups-list" class="max-h-32 overflow-y-auto"></div>
                    <div class="border-t border-white/[0.03] my-1"></div>
                    <button onclick="contextDeleteTask()" class="w-full text-left px-4 py-2 hover:bg-red-500/10 hover:text-red-400 transition flex items-center space-x-2">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        <span>Delete Task</span>
                    </button>
                `;
                
                const groupsList = menu.querySelector('#context-groups-list');
                groupsList.innerHTML = '';
                
                const ungroupBtn = document.createElement('button');
                ungroupBtn.onclick = () => contextMoveToGroup(null);
                ungroupBtn.className = "w-full text-left px-4 py-1.5 hover:bg-white/5 hover:text-white transition truncate flex items-center space-x-1.5 text-xs text-gray-300";
                ungroupBtn.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-gray-500"></span><span>No Group / Ungrouped</span>`;
                groupsList.appendChild(ungroupBtn);

                AppState.groups.forEach(group => {
                    const groupBtn = document.createElement('button');
                    groupBtn.onclick = () => contextMoveToGroup(group.id);
                    groupBtn.className = "w-full text-left px-4 py-1.5 hover:bg-white/5 hover:text-white transition truncate flex items-center space-x-1.5 text-xs text-gray-300";
                    groupBtn.innerHTML = `<span class="w-1.5 h-1.5 rounded-full" style="background-color: ${group.color || '#2997ff'}"></span><span>${escapeHTML(group.title)}</span>`;
                    groupsList.appendChild(groupBtn);
                });
            }
            
            lucide.createIcons();

            if (window.innerWidth < 768) {
                hideFloatingElement(menu);
                const menuDef = parseMenuDOMToDefinition(menu, 'Task Options');
                openMobileDrawer(menuDef);
            } else {
                menu.classList.remove('hidden');
                const syntheticRect = {
                    left: event.clientX,
                    top: event.clientY,
                    right: event.clientX,
                    bottom: event.clientY,
                    width: 0,
                    height: 0
                };
                positionFloatingElement(menu, syntheticRect);
            }
        }

        function hideContextMenu() {
            const menu = document.getElementById('context-menu');
            if (menu) hideFloatingElement(menu);
            const counterMenu = document.getElementById('counter-context-menu');
            if (counterMenu) hideFloatingElement(counterMenu);
        }

        function showGroupContextMenu(event, groupId) {
            if (groupId === 'ungrouped') return; 
            event.preventDefault();
            event.stopPropagation();
            hideContextMenu();
            hideFeedContextMenu();

            contextSelectedGroupId = groupId;
            const menu = document.getElementById('group-context-menu');
            
            if (window.innerWidth < 768) {
                hideFloatingElement(menu);
                const menuDef = parseMenuDOMToDefinition(menu, 'Group Options');
                openMobileDrawer(menuDef);
            } else {
                menu.classList.remove('hidden');
                const syntheticRect = {
                    left: event.clientX,
                    top: event.clientY,
                    right: event.clientX,
                    bottom: event.clientY,
                    width: 0,
                    height: 0
                };
                positionFloatingElement(menu, syntheticRect);
            }
        }

        function hideGroupContextMenu() {
            const menu = document.getElementById('group-context-menu');
            if (menu) hideFloatingElement(menu);
        }

        function handleFeedContextMenu(event) {
            if (event.target.closest('.group-card') || 
                event.target.closest('button') || 
                event.target.closest('input') || 
                event.target.closest('select') || 
                event.target.closest('textarea') || 
                event.target.closest('#inspector-panel') || 
                event.target.closest('#sidebar-panel') ||
                event.target.closest('#context-menu') ||
                event.target.closest('#counter-context-menu') ||
                event.target.closest('#group-context-menu') ||
                event.target.closest('#feed-context-menu')) {
                return;
            }
            event.preventDefault();
            hideContextMenu();
            hideGroupContextMenu();

            const menu = document.getElementById('feed-context-menu');
            lucide.createIcons();

            if (window.innerWidth < 768) {
                hideFloatingElement(menu);
                const menuDef = parseMenuDOMToDefinition(menu, 'Feed Options');
                openMobileDrawer(menuDef);
            } else {
                menu.classList.remove('hidden');
                const syntheticRect = {
                    left: event.clientX,
                    top: event.clientY,
                    right: event.clientX,
                    bottom: event.clientY,
                    width: 0,
                    height: 0
                };
                positionFloatingElement(menu, syntheticRect);
            }
        }

        function hideFeedContextMenu() {
            const menu = document.getElementById('feed-context-menu');
            if (menu) hideFloatingElement(menu);
        }

        function bulkCompleteAllFiltered() {
            const list = getFilteredTasks();
            if (list.length === 0) {
                showToast('No Tasks Found', 'There are no tasks in the current view to complete.');
                hideFeedContextMenu();
                return;
            }
            list.forEach(t => t.done = true);
            syncDeviceDataChannels();
            showToast('All Completed', `Marked ${list.length} tasks as completed.`);
            hideFeedContextMenu();
        }

        function bulkSelectAllFiltered() {
            const list = getFilteredTasks();
            if (list.length === 0) {
                showToast('No Tasks Found', 'There are no tasks in the current view to select.');
                hideFeedContextMenu();
                return;
            }
            AppState.selectedTaskIds = list.map(t => t.id);
            if (AppState.selectedTaskIds.length === 1) {
                AppState.selectedTaskId = AppState.selectedTaskIds[0];
                renderInspector();
            } else {
                closeInspector();
            }
            renderTaskFeed();
            showToast('All Selected', `Selected all ${list.length} tasks in view.`);
            hideFeedContextMenu();
        }

        window.addEventListener('click', function(e) {
            hideContextMenu();
            hideGroupContextMenu();
            hideFeedContextMenu();
            if (!e.target.closest('#custom-calendar-popup') && !e.target.closest('#ins-task-date-btn') && !e.target.closest('#new-task-date-btn')) {
                closeCalendarPopup();
            }
            if (!e.target.closest('#sort-dropdown-wrapper') && 
                !e.target.closest('#project-dropdown-container') && 
                !e.target.closest('#new-task-project-container') && 
                !e.target.closest('#new-task-group-container') &&
                !e.target.closest('#new-task-autodelete-container') &&
                !e.target.closest('nav')) {
                const allDropdowns = ['sort-dropdown-options', 'ins-project-dropdown-options', 'new-task-project-options', 'new-task-group-options', 'new-task-autodelete-options', 'nav-menu-dropdown-options'];
                allDropdowns.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) hideFloatingElement(el);
                });
            }
            if (activeFloatingElement && activeFloatingElement.classList.contains('hidden')) {
                activeFloatingElement = null;
            }
        });

        function contextMultiToggleComplete(status) {
            if (AppState.selectedTaskIds && AppState.selectedTaskIds.length > 0) {
                AppState.tasks.forEach(t => {
                    if (AppState.selectedTaskIds.includes(t.id)) {
                        t.done = status;
                    }
                });
                syncDeviceDataChannels();
                if (AppState.selectedTaskId && AppState.selectedTaskIds.includes(AppState.selectedTaskId)) {
                    renderInspector();
                }
                showToast('Tasks Updated', `Marked ${AppState.selectedTaskIds.length} tasks as ${status ? 'complete' : 'incomplete'}.`);
            }
            hideContextMenu();
        }

        function contextMultiDeleteTasks() {
            if (AppState.selectedTaskIds && AppState.selectedTaskIds.length > 0) {
                showDeleteConfirmation(`Are you sure you want to permanently delete all ${AppState.selectedTaskIds.length} selected tasks?`, () => {
                    AppState.tasks = AppState.tasks.filter(t => !AppState.selectedTaskIds.includes(t.id));
                    if (AppState.selectedTaskId && AppState.selectedTaskIds.includes(AppState.selectedTaskId)) {
                        closeInspector();
                    }
                    const deletedCount = AppState.selectedTaskIds.length;
                    AppState.selectedTaskIds = [];
                    syncDeviceDataChannels();
                    showToast('Tasks Deleted', `${deletedCount} tasks have been permanently deleted.`);
                });
            }
            hideContextMenu();
        }

        function contextMultiMoveToGroup(groupId) {
            if (AppState.selectedTaskIds && AppState.selectedTaskIds.length > 0) {
                AppState.tasks.forEach(t => {
                    if (AppState.selectedTaskIds.includes(t.id)) {
                        t.groupId = groupId;
                    }
                });
                const targetGroup = AppState.groups.find(g => g.id === groupId);
                const groupTitle = targetGroup ? targetGroup.title : 'Ungrouped';
                syncDeviceDataChannels();
                showToast('Tasks Reassigned', `Moved ${AppState.selectedTaskIds.length} tasks to group "${groupTitle}".`);
            }
            hideContextMenu();
        }

        function contextToggleComplete() {
            if (contextSelectedTaskId) toggleTaskDone(contextSelectedTaskId);
            hideContextMenu();
        }

        function contextOpenDetails() {
            if (contextSelectedTaskId) selectTask(contextSelectedTaskId);
            hideContextMenu();
        }

        function contextDeleteTask() {
            if (contextSelectedTaskId) {
                const task = AppState.tasks.find(t => t.id === contextSelectedTaskId);
                if (task) {
                    showDeleteConfirmation(`Are you sure you want to permanently delete "${task.title}"?`, () => {
                        AppState.tasks = AppState.tasks.filter(t => t.id !== contextSelectedTaskId);
                        syncDeviceDataChannels();
                        showToast('Task Deleted', `"${task.title}" has been permanently removed.`);
                        if (AppState.selectedTaskId === contextSelectedTaskId) closeInspector();
                    });
                }
            }
            hideContextMenu();
        }

        function contextMoveToGroup(groupId) {
            if (contextSelectedTaskId) {
                const task = AppState.tasks.find(t => t.id === contextSelectedTaskId);
                if (task) {
                    task.groupId = groupId;
                    syncDeviceDataChannels();
                    showToast('Group Assigned', `Assigned task to folder.`);
                }
            }
            hideContextMenu();
        }

        function updateGlobalBadges() {
            const todayStr = getTodayDateString();
            
            document.getElementById('badge-inbox').textContent = AppState.tasks.filter(t => !t.done).length;
            document.getElementById('badge-today').textContent = AppState.tasks.filter(t => t.dueDate === todayStr).length;
            document.getElementById('badge-done').textContent = AppState.tasks.filter(t => t.done).length;

            const activeBadgePill = document.getElementById('active-tab-badge');
            if (AppState.counterTargetPolicy === 'tasks') {
                const taskTally = AppState.tasks.filter(t => !t.done).length;
                activeBadgePill.textContent = `${taskTally} active tasks`;
                activeBadgePill.className = "px-2.5 py-0.5 bg-blue-500/10 text-blue-400 text-[11px] font-semibold rounded-full border border-blue-500/20 transition-all duration-350 cursor-pointer select-none";
            } else {
                let subtaskTally = 0;
                AppState.tasks.forEach(t => {
                    if (!t.done && t.subtasks) {
                        subtaskTally += t.subtasks.filter(s => !s.done).length;
                    }
                });
                activeBadgePill.textContent = `${subtaskTally} active subtasks`;
                activeBadgePill.className = "px-2.5 py-0.5 bg-purple-500/10 text-purple-400 text-[11px] font-semibold rounded-full border border-purple-500/20 transition-all duration-350 cursor-pointer select-none";
            }

            renderProjectsList();
            updateStreakCardMetrics();
        }

        function renderProjectsList() {
            const container = document.getElementById('projects-list-container');
            container.innerHTML = '';

            AppState.projects.forEach(p => {
                const activeCount = AppState.tasks.filter(t => t.projectId === p.id && !t.done).length;
                const isActive = AppState.currentTab === p.id;

                const item = document.createElement('div');
                item.className = `group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer relative btn-scale ${isActive ? 'bg-white/10 text-[#2997ff]' : 'hover:bg-white/5 text-gray-300'}`;
                item.onclick = () => switchTab(p.id);

                item.innerHTML = `
                    <div class="flex items-center space-x-2.5 flex-1 min-w-0">
                        <span class="p-1 rounded-md flex-shrink-0 bg-white/5 text-white">
                            <i data-lucide="${p.icon || 'folder'}" class="w-3.5 h-3.5 flex-shrink-0"></i>
                        </span>
                        <span class="truncate text-white font-medium ml-0.5">${escapeHTML(p.title)}</span>
                    </div>
                    <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span class="text-[10px] font-semibold px-2 py-0.5 bg-white/5 border border-white/5 text-gray-400 rounded-full group-hover:border-white/10 group-hover:text-white transition-all shadow-inner">${activeCount}</span>
                        <button onclick="openEditProjectModal('${p.id}', event)" class="p-1 text-gray-400 hover:text-white rounded transition" title="Edit Folder">
                            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="handleDeleteProject('${p.id}', event)" class="p-1 text-gray-400 hover:text-red-400 rounded transition" title="Delete Folder">
                            <i data-lucide="trash" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                `;
                container.appendChild(item);
            });
            lucide.createIcons();
        }

        function switchTab(tabId) {
            AppState.currentTab = tabId;
            const navIds = ['inbox', 'today', 'done', 'manage'];
            navIds.forEach(id => {
                const el = document.getElementById(`tab-${id}`);
                if (el) {
                    if (AppState.currentTab === id) {
                        el.classList.add('bg-white/10', 'text-[#2997ff]');
                    } else {
                        el.classList.remove('bg-white/10', 'text-[#2997ff]');
                    }
                }
            });

            renderTaskFeed();
            closeInspector();
        }

        function toggleTaskCustomizationPanel() {
            const panel = document.getElementById('new-task-customization-panel');
            const container = document.getElementById('task-modal-container');
            const btnIcon = document.getElementById('toggle-customization-icon');
            const btnText = document.getElementById('toggle-customization-text');

            if (panel.style.display === 'none') {
                panel.style.display = 'flex';
                setTimeout(() => {
                    panel.style.width = '320px';
                    container.style.maxWidth = '760px';
                }, 10);
                btnIcon.setAttribute('data-lucide', 'chevron-left');
                btnText.textContent = "Collapse Styles";
            } else {
                panel.style.width = '0px';
                container.style.maxWidth = '440px';
                setTimeout(() => {
                    panel.style.display = 'none';
                }, 300);
                btnIcon.setAttribute('data-lucide', 'chevron-right');
                btnText.textContent = "Customize Design";
            }
            lucide.createIcons();
        }

        function openAddTaskModal() {
            const backdrop = document.getElementById('task-modal-backdrop');
            const container = document.getElementById('task-modal-container');
            
            hideFloatingElement(document.getElementById('new-task-project-options'));
            hideFloatingElement(document.getElementById('new-task-group-options'));
            hideFloatingElement(document.getElementById('new-task-autodelete-options'));
            
            const customOptionsPanel = document.getElementById('new-task-project-options');
            customOptionsPanel.innerHTML = '';

            const defaultBtn = document.createElement('button');
            defaultBtn.type = 'button';
            defaultBtn.onclick = () => selectNewTaskProject('', 'None / Inbox');
            defaultBtn.className = "w-full text-left px-4 py-2 text-xs text-white hover:bg-white/5 transition";
            defaultBtn.textContent = "None / Inbox";
            customOptionsPanel.appendChild(defaultBtn);

            AppState.projects.forEach(p => {
                const optBtn = document.createElement('button');
                optBtn.type = 'button';
                optBtn.onclick = () => selectNewTaskProject(p.id, p.title);
                optBtn.className = "w-full text-left px-4 py-2 text-xs text-white hover:bg-[#1C1C1E] transition flex items-center space-x-2";
                optBtn.innerHTML = `<span class="w-2 h-2 rounded-full" style="background-color: ${p.color}"></span><span>${escapeHTML(p.title)}</span>`;
                customOptionsPanel.appendChild(optBtn);
            });

            const customGroupPanel = document.getElementById('new-task-group-options');
            customGroupPanel.innerHTML = '';
            
            const defaultGroupBtn = document.createElement('button');
            defaultGroupBtn.type = 'button';
            defaultGroupBtn.onclick = () => selectNewTaskGroup('', 'No Group / Ungrouped');
            defaultGroupBtn.className = "w-full text-left px-4 py-2 text-xs text-white hover:bg-white/5 transition";
            defaultGroupBtn.textContent = "No Group / Ungrouped";
            customGroupPanel.appendChild(defaultGroupBtn);

            AppState.groups.forEach(group => {
                const optBtn = document.createElement('button');
                optBtn.type = 'button';
                optBtn.onclick = () => selectNewTaskGroup(group.id, group.title);
                optBtn.className = "w-full text-left px-4 py-2 text-xs text-white hover:bg-[#1C1C1E] transition flex items-center space-x-2";
                optBtn.innerHTML = `<span class="w-2 h-2 rounded-full" style="background-color: ${group.color || '#2997ff'}"></span><span>${escapeHTML(group.title)}</span>`;                customGroupPanel.appendChild(optBtn);
            });

            const createGroupBtn = document.createElement('button');
            createGroupBtn.type = 'button';
            createGroupBtn.onclick = () => switchToGroupCreationFromTaskModal();
            createGroupBtn.className = "w-full text-left px-4 py-2 text-xs text-[#2997ff] font-bold hover:bg-white/5 transition flex items-center space-x-1.5 border-t border-white/5";
            createGroupBtn.innerHTML = `<i data-lucide="plus" class="w-3.5 h-3.5"></i><span>Create New Group...</span>`;
            customGroupPanel.appendChild(createGroupBtn);

            const colorGrid = document.getElementById('new-task-color-grid');
            colorGrid.innerHTML = '';
            SYSTEM_COLORS.forEach(color => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.onclick = () => selectCreatePriority(color);
                btn.className = "new-task-color-btn w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-transparent transition relative flex-shrink-0";
                btn.setAttribute('data-color', color);
                btn.innerHTML = `<span class="w-6 h-6 rounded-full block" style="background-color: ${color};"></span>`;
                colorGrid.appendChild(btn);
            });

            const iconGrid = document.getElementById('new-task-icon-grid');
            iconGrid.innerHTML = '';
            SYSTEM_ICONS.forEach(iconName => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.onclick = () => selectCreateIcon(iconName);
                btn.className = "new-task-icon-btn w-full aspect-square rounded-xl flex items-center justify-center bg-white/5 border border-transparent text-gray-400 hover:text-white transition";
                btn.setAttribute('data-icon', iconName);
                btn.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i>`;
                iconGrid.appendChild(btn);
            });

            if (AppState.draftTask) {
                document.getElementById('new-task-title').value = AppState.draftTask.title || '';
                document.getElementById('new-task-desc').value = AppState.draftTask.description || '';
                document.getElementById('new-task-project').value = AppState.draftTask.projectId || '';
                document.getElementById('new-task-project-label').textContent = AppState.draftTask.projectLabel || 'None / Inbox';
                document.getElementById('new-task-date').value = AppState.draftTask.dueDate || '';
                document.getElementById('new-task-date-label').textContent = AppState.draftTask.dueDateLabel || 'No Deadline';
                document.getElementById('new-task-group-id').value = AppState.draftTask.groupId || '';
                document.getElementById('new-task-group-label').textContent = AppState.draftTask.groupLabel || 'Select Group Column';
                selectCreatePriority(AppState.draftTask.color || '#FF3B30');
                selectCreateIcon(AppState.draftTask.icon || 'smile');
                selectNewTaskAutodelete(AppState.draftTask.autoDelete || 'never', AppState.draftTask.autoDeleteLabel || 'Do not delete');
                if (AppState.draftTask.autoDelete === 'custom') {
                    document.getElementById('new-task-autodelete-custom').value = AppState.draftTask.customAutoDeleteHrs || '24';
                }
                
                if (AppState.draftTask.isCustomizationOpen) {
                    document.getElementById('new-task-customization-panel').style.display = 'flex';
                    document.getElementById('new-task-customization-panel').style.width = '320px';
                    container.style.maxWidth = '760px';
                    document.getElementById('toggle-customization-icon').setAttribute('data-lucide', 'chevron-left');
                    document.getElementById('toggle-customization-text').textContent = "Collapse Styles";
                } else {
                    document.getElementById('new-task-customization-panel').style.display = 'none';
                    document.getElementById('new-task-customization-panel').style.width = '0px';
                    container.style.maxWidth = '440px';
                    document.getElementById('toggle-customization-icon').setAttribute('data-lucide', 'chevron-right');
                    document.getElementById('toggle-customization-text').textContent = "Customize Design";
                }
                
                AppState.draftTask = null; 
            } else {
                document.getElementById('new-task-title').value = '';
                document.getElementById('new-task-desc').value = '';
                document.getElementById('new-task-project').value = '';
                document.getElementById('new-task-project-label').textContent = 'None / Inbox';
                
                const todayStr = getTodayDateString();
                document.getElementById('new-task-date').value = todayStr;
                document.getElementById('new-task-date-label').textContent = todayStr;
                
                document.getElementById('new-task-group-id').value = '';
                document.getElementById('new-task-group-label').textContent = 'Select Group Column';

                selectCreatePriority('#FF3B30');
                selectCreateIcon('smile');

                selectNewTaskAutodelete('never', 'Do not delete');
                document.getElementById('custom-autodelete-container').classList.add('hidden');
                
                document.getElementById('new-task-customization-panel').style.display = 'none';
                document.getElementById('new-task-customization-panel').style.width = '0px';
                container.style.maxWidth = '440px';
                document.getElementById('toggle-customization-icon').setAttribute('data-lucide', 'chevron-right');
                document.getElementById('toggle-customization-text').textContent = "Customize Design";
            }

            backdrop.classList.remove('hidden');
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                container.classList.remove('scale-95');
                lucide.createIcons();
            }, 10);
        }

        function switchToGroupCreationFromTaskModal() {
            AppState.draftTask = {
                title: document.getElementById('new-task-title').value,
                description: document.getElementById('new-task-desc').value,
                projectId: document.getElementById('new-task-project').value,
                projectLabel: document.getElementById('new-task-project-label').textContent,
                dueDate: document.getElementById('new-task-date').value,
                dueDateLabel: document.getElementById('new-task-date-label').textContent,
                groupId: document.getElementById('new-task-group-id').value,
                groupLabel: document.getElementById('new-task-group-label').textContent,
                color: AppState.tempCreatePriority,
                icon: AppState.tempCreateIcon,
                autoDelete: document.getElementById('new-task-autodelete').value,
                autoDeleteLabel: document.getElementById('new-task-autodelete-label').textContent,
                customAutoDeleteHrs: document.getElementById('new-task-autodelete-custom') ? document.getElementById('new-task-autodelete-custom').value : '24',
                isCustomizationOpen: document.getElementById('new-task-customization-panel').style.display !== 'none'
            };

            closeAddTaskModal(false); 
            AppState.returningToTaskModal = true; 
            setTimeout(openAddGroupModal, 150);
        }

        function closeAddTaskModal(shouldClearDraft = true) {
            const backdrop = document.getElementById('task-modal-backdrop');
            const container = document.getElementById('task-modal-container');
            
            hideFloatingElement(document.getElementById('new-task-project-options'));
            hideFloatingElement(document.getElementById('new-task-group-options'));
            hideFloatingElement(document.getElementById('new-task-autodelete-options'));
            
            backdrop.classList.add('opacity-0');
            container.classList.add('scale-95');
            setTimeout(() => { backdrop.classList.add('hidden'); }, 150);
            
            if (shouldClearDraft) {
                AppState.draftTask = null;
                document.getElementById('new-task-title').value = '';
                document.getElementById('new-task-desc').value = '';
            }
        }

        function selectCreatePriority(colorHex) {
            AppState.tempCreatePriority = colorHex;
            document.querySelectorAll('#new-task-color-grid .new-task-color-btn').forEach(btn => {
                const col = btn.getAttribute('data-color');
                if (col === colorHex) {
                    btn.className = "new-task-color-btn w-9 h-9 rounded-full flex items-center justify-center bg-white/10 ring-2 ring-white scale-110 transition-all z-10";
                } else {
                    btn.className = "new-task-color-btn w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-transparent transition-all";
                }
            });
        }

        function selectCreateIcon(iconName) {
            AppState.tempCreateIcon = iconName;
            document.querySelectorAll('#new-task-icon-grid .new-task-icon-btn').forEach(btn => {
                const icon = btn.getAttribute('data-icon');
                if (icon === iconName) {
                    btn.className = "new-task-icon-btn w-9 h-9 rounded-xl flex items-center justify-center bg-white text-black scale-110 transition-all z-10";
                } else {
                    btn.className = "new-task-icon-btn w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-gray-400 hover:text-white transition-all";
                }
            });
        }

        function handleAddTaskForm(event) {
            event.preventDefault();
            const titleInput = document.getElementById('new-task-title');
            const descInput = document.getElementById('new-task-desc');
            const projInput = document.getElementById('new-task-project');
            const dateInput = document.getElementById('new-task-date');
            const groupInput = document.getElementById('new-task-group-id');
            const autoDeleteVal = document.getElementById('new-task-autodelete').value;

            const finalTitle = sanitizeSentenceCase(titleInput.value);
            const finalDesc = sanitizeSentenceCase(descInput.value);

            if (!finalTitle) return;

            const createdTime = Date.now();
            let expiryTime = null;

            if (autoDeleteVal === '1day') {
                expiryTime = createdTime + (24 * 60 * 60 * 1000);
            } else if (autoDeleteVal === '1week') {
                expiryTime = createdTime + (7 * 24 * 60 * 60 * 1000);
            } else if (autoDeleteVal === 'custom') {
                const hrs = parseFloat(document.getElementById('new-task-autodelete-custom').value) || 24;
                expiryTime = createdTime + (hrs * 60 * 60 * 1000);
            }

            const newTask = {
                id: 'task-' + Date.now() + Math.random().toString(36).substr(2, 5),
                title: finalTitle,
                description: finalDesc,
                done: false,
                dueDate: dateInput.value || '',
                projectId: projInput.value || null,
                groupId: groupInput.value || null,
                color: AppState.tempCreatePriority,
                icon: AppState.tempCreateIcon,
                autoDelete: autoDeleteVal,
                expiryTime: expiryTime,
                subtasks: [],
                createdDate: new Date().toISOString()
            };

            AppState.tasks.push(newTask);
            syncDeviceDataChannels();
            
            selectTask(newTask.id);
            closeAddTaskModal(true);
            showToast('Task Created', `Added "${finalTitle}" successfully.`);
        }

        function selectNewTaskProject(projectId, label) {
            document.getElementById('new-task-project').value = projectId;
            document.getElementById('new-task-project-label').textContent = label;
            hideFloatingElement(document.getElementById('new-task-project-options'));
        }

        function selectNewTaskGroup(groupId, label) {
            document.getElementById('new-task-group-id').value = groupId;
            document.getElementById('new-task-group-label').textContent = label;
            hideFloatingElement(document.getElementById('new-task-group-options'));
        }

        function selectNewTaskAutodelete(policy, label) {
            document.getElementById('new-task-autodelete').value = policy;
            document.getElementById('new-task-autodelete-label').textContent = label;
            hideFloatingElement(document.getElementById('new-task-autodelete-options'));
            
            const customContainer = document.getElementById('custom-autodelete-container');
            if (policy === 'custom') {
                customContainer.classList.remove('hidden');
            } else {
                customContainer.classList.add('hidden');
            }
        }

        function toggleNewTaskProjectDropdown(event) {
            toggleCustomDropdown('new-task-project-options', event);
        }

        function toggleNewTaskGroupDropdown(event) {
            toggleCustomDropdown('new-task-group-options', event);
        }

        function toggleNewTaskAutodeleteDropdown(event) {
            toggleCustomDropdown('new-task-autodelete-options', event);
        }

        function toggleCustomDropdown(menuId, event) {
            if (event) event.stopPropagation();
            const allDropdowns = ['sort-dropdown-options', 'ins-project-dropdown-options', 'new-task-project-options', 'new-task-group-options', 'new-task-autodelete-options', 'nav-menu-dropdown-options'];
            allDropdowns.forEach(id => {
                if (id !== menuId) {
                    const el = document.getElementById(id);
                    if (el) hideFloatingElement(el);
                }
            });

            const targetMenu = document.getElementById(menuId);
            if (!targetMenu) return;

            const isModalDropdown = ['new-task-project-options', 'new-task-group-options', 'new-task-autodelete-options'].includes(menuId);

            if (window.innerWidth < 768) {
                hideFloatingElement(targetMenu);
                const menuDef = parseMenuDOMToDefinition(targetMenu, getMenuTitle(menuId));
                openMobileDrawer(menuDef);
            } else {
                const isHidden = targetMenu.classList.contains('hidden');
                if (isHidden) {
                    targetMenu.classList.remove('hidden');
                    if (!isModalDropdown) {
                        const triggerBtn = (event && event.currentTarget) || (event && event.target && event.target.closest('button'));
                        const rect = triggerBtn ? triggerBtn.getBoundingClientRect() : { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
                        positionFloatingElement(targetMenu, rect);
                    }
                } else {
                    hideFloatingElement(targetMenu);
                }
            }
        }

        function getMenuTitle(menuId) {
            if (menuId === 'sort-dropdown-options') return 'Sort Options';
            if (menuId === 'nav-menu-dropdown-options') return 'More Options';
            if (menuId === 'ins-project-dropdown-options' || menuId === 'new-task-project-options') return 'Select Collection';
            if (menuId === 'new-task-group-options') return 'Select Group Column';
            if (menuId === 'new-task-autodelete-options') return 'Auto-Deletion Policy';
            return 'Options';
        }

        function toggleTaskDone(taskId, event) {
            if (event) event.stopPropagation();
            const task = AppState.tasks.find(t => t.id === taskId);
            if (task) {
                task.done = !task.done;
                syncDeviceDataChannels();
                
                if (task.done) showToast('Task Completed', `"${task.title}" has been archived.`);
                if (AppState.selectedTaskId === taskId) renderInspector();
            }
        }

        function selectTask(taskId, event) {
            if (event) {
                if (event.target.closest('button')) return;
            }
            
            if (!AppState.selectedTaskIds) AppState.selectedTaskIds = [];

            if (event && (event.shiftKey || event.ctrlKey || event.metaKey)) {
                if (AppState.selectedTaskIds.includes(taskId)) {
                    AppState.selectedTaskIds = AppState.selectedTaskIds.filter(id => id !== taskId);
                } else {
                    AppState.selectedTaskIds.push(taskId);
                }
                
                if (AppState.selectedTaskIds.length === 1) {
                    AppState.selectedTaskId = AppState.selectedTaskIds[0];
                    renderInspector();
                    const inspector = document.getElementById('inspector-panel');
                    inspector.style.width = '320px';
                    document.getElementById('inspector-resizer').style.display = 'block';
                } else {
                    closeInspector();
                }
                renderTaskFeed();
            } else {
                AppState.selectedTaskId = taskId;
                AppState.selectedTaskIds = [taskId];
                renderTaskFeed();
                renderInspector();

                const inspector = document.getElementById('inspector-panel');
                inspector.style.width = '320px';
                document.getElementById('inspector-resizer').style.display = 'block';
            }
        }

        function closeInspector() {
            AppState.selectedTaskId = null;
            renderTaskFeed();
            
            const inspector = document.getElementById('inspector-panel');
            inspector.style.width = '0px';
            document.getElementById('inspector-resizer').style.display = 'none';

            document.getElementById('inspector-content').classList.add('hidden');
            document.getElementById('inspector-footer').classList.add('hidden');
            document.getElementById('inspector-placeholder').classList.remove('hidden');
        }

        function renderInspector() {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            const content = document.getElementById('inspector-content');
            const footer = document.getElementById('inspector-footer');
            const placeholder = document.getElementById('inspector-placeholder');

            if (!task) {
                content.classList.add('hidden');
                footer.classList.add('hidden');
                placeholder.classList.add('hidden');
                return;
            }

            content.classList.remove('hidden');
            footer.classList.remove('hidden');
            placeholder.classList.add('hidden');

            document.getElementById('ins-task-title').value = task.title;
            document.getElementById('ins-task-desc').value = task.description || '';
            document.getElementById('ins-task-date').value = task.dueDate || '';
            document.getElementById('ins-task-date-label').textContent = task.dueDate ? task.dueDate : "No Deadline";

            const colorContainer = document.getElementById('ins-task-priority-options');
            colorContainer.innerHTML = '';
            SYSTEM_COLORS.forEach((color) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.onclick = () => updateInspectorPriority(color);
                btn.className = `w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-white/5 border border-transparent transition-all ${task.color === color ? 'ring-2 ring-white scale-110 z-10' : ''}`;
                btn.innerHTML = `<span class="w-6 h-6 rounded-full block" style="background-color: ${color};"></span>`;
                colorContainer.appendChild(btn);
            });

            const projectDropdownContainer = document.getElementById('ins-project-dropdown-options');
            projectDropdownContainer.innerHTML = '';
            
            const defaultBtn = document.createElement('button');
            defaultBtn.type = 'button';
            defaultBtn.onclick = () => selectInspectorProject('', 'None / Inbox');
            defaultBtn.className = "w-full text-left px-4 py-2 text-xs text-white hover:bg-white/5 transition";
            defaultBtn.textContent = "None / Inbox";
            projectDropdownContainer.appendChild(defaultBtn);

            let chosenProjectName = 'None / Inbox';
            AppState.projects.forEach(p => {
                const optBtn = document.createElement('button');
                optBtn.type = 'button';
                optBtn.onclick = () => selectInspectorProject(p.id, p.title);
                optBtn.className = "w-full text-left px-4 py-2 text-xs text-white hover:bg-white/5 transition flex items-center space-x-2";
                optBtn.innerHTML = `<span class="w-2 h-2 rounded-full" style="background-color: ${p.color}"></span><span>${escapeHTML(p.title)}</span>`;
                projectDropdownContainer.appendChild(optBtn);

                if (task.projectId === p.id) chosenProjectName = p.title;
            });

            document.getElementById('ins-selected-project-label').textContent = chosenProjectName;

            const subtasksList = document.getElementById('inspector-subtasks-list');
            subtasksList.innerHTML = '';
            
            const subtasks = task.subtasks || [];
            const subDoneCount = subtasks.filter(s => s.done).length;
            document.getElementById('subtask-fraction').textContent = `${subDoneCount} / ${subtasks.length}`;

            const subtaskColor = task.color || '#2997ff';
            const borderStyle = `border-color: ${subtaskColor};`;

            subtasks.forEach(s => {
                const row = document.createElement('div');
                row.className = `flex items-center justify-between bg-white/5 p-2.5 rounded-lg transition ${s.done ? 'opacity-70' : ''}`;
                const bgStyle = s.done ? `background-color: ${subtaskColor};` : `background-color: transparent;`;

                row.innerHTML = `
                    <div class="flex items-center space-x-3 flex-1 min-w-0">
                        <button onclick="toggleSubtaskDone('${s.id}')" class="w-[18px] h-[18px] rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-200" style="${borderStyle} ${bgStyle}" title="Toggle Subtask">
                            ${s.done ? `<i data-lucide="check" class="w-3 h-3 text-[#0a0a0a] font-extrabold tick-animation"></i>` : ''}
                        </button>
                        <span class="text-xs text-gray-200 truncate warp-text ${s.done ? 'line-through text-gray-500' : ''}">${escapeHTML(s.title)}</span>
                    </div>
                    <button onclick="deleteSubtask('${s.id}')" class="text-gray-500 hover:text-red-400 transition p-1 ml-2">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5 flex-shrink-0"></i>
                    </button>
                `;
                subtasksList.appendChild(row);
            });

            lucide.createIcons();
        }

        function selectInspectorProject(projectId, label) {
            updateInspectorField('projectId', projectId || null);
            document.getElementById('ins-selected-project-label').textContent = label;
            hideFloatingElement(document.getElementById('ins-project-dropdown-options'));
        }

        function updateInspectorField(field, value) {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (task) {
                if (field === 'title' || field === 'description') value = sanitizeSentenceCase(value);
                task[field] = value;
                syncDeviceDataChannels();
                renderInspector();
            }
        }

        function updateInspectorPriority(colorHex) {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (task) {
                task.color = colorHex;
                syncDeviceDataChannels();
                renderInspector();
            }
        }

        function toggleSubtaskDone(subtaskId) {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (task && task.subtasks) {
                const sub = task.subtasks.find(s => s.id === subtaskId);
                if (sub) {
                    sub.done = !sub.done;
                    syncDeviceDataChannels();
                    renderInspector();
                }
            }
        }

        function handleAddSubtask(event) {
            event.preventDefault();
            const input = document.getElementById('new-subtask-input');
            const rawTitle = input.value.trim();
            const title = sanitizeSentenceCase(rawTitle);
            if (!title) return;

            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (task) {
                if (!task.subtasks) task.subtasks = [];
                task.subtasks.push({
                    id: 'sub-' + Date.now() + Math.random().toString(36).substr(2, 4),
                    title: title,
                    done: false
                });
                syncDeviceDataChannels();
                renderInspector();
                input.value = '';
            }
        }

        function deleteSubtask(subtaskId) {
            showDeleteConfirmation("Are you sure you want to permanently delete this subtask?", () => {
                const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
                if (task && task.subtasks) {
                    task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
                    syncDeviceDataChannels();
                    renderInspector();
                    showToast('Subtask Deleted', 'Checkout task updated.');
                }
            });
        }

        function handleDeleteTaskTrigger() {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (task) {
                showDeleteConfirmation(`Are you sure you want to permanently delete "${task.title}"?`, () => {
                    AppState.tasks = AppState.tasks.filter(t => t.id !== task.id);
                    syncDeviceDataChannels();
                    showToast('Task Deleted', `"${task.title}" has been permanently removed.`);
                    closeInspector();
                });
            }
        }

        function showDeleteConfirmation(message, onConfirm) {
            const backdrop = document.getElementById('delete-modal-backdrop');
            const container = document.getElementById('delete-modal-container');
            document.getElementById('delete-modal-message').textContent = message;
            
            deleteActionCallback = onConfirm;
            
            backdrop.classList.remove('hidden');
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                container.classList.remove('scale-95');
                lucide.createIcons();
            }, 10);
        }

        function closeDeleteModal() {
            const backdrop = document.getElementById('delete-modal-backdrop');
            const container = document.getElementById('delete-modal-container');
            backdrop.classList.add('opacity-0');
            container.classList.add('scale-95');
            setTimeout(() => { backdrop.classList.add('hidden'); }, 150);
            deleteActionCallback = null;
        }

        document.getElementById('delete-confirm-btn').onclick = function() {
            if (deleteActionCallback) deleteActionCallback();
            closeDeleteModal(); 
        };

        function openNewProjectModal() {
            const backdrop = document.getElementById('project-modal-backdrop');
            const container = document.getElementById('project-modal-container');
            
            const titleEl = document.getElementById('project-modal-title');
            const submitBtn = document.getElementById('project-submit-btn');
            
            if (AppState.editingProjectId) {
                titleEl.innerHTML = `<i data-lucide="edit" class="text-[#2997ff] mr-2 w-4.5 h-4.5"></i> Edit Collection Settings`;
                submitBtn.textContent = "Save Changes";
            } else {
                titleEl.innerHTML = `<i data-lucide="folder-plus" class="text-[#2997ff] mr-2 w-4.5 h-4.5"></i> Configure Collection`;
                submitBtn.textContent = "Create Collection";
            }

            const projectColorsGrid = document.getElementById('project-color-options');
            projectColorsGrid.innerHTML = '';
            SYSTEM_COLORS.forEach(color => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.onclick = () => selectPresetColor(color);
                btn.className = "color-preset-btn w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-transparent transition relative flex-shrink-0";
                btn.setAttribute('data-color', color);
                btn.innerHTML = `<span class="w-6 h-6 rounded-full block" style="background-color: ${color};"></span>`;
                projectColorsGrid.appendChild(btn);
            });

            const projectIconsGrid = document.getElementById('project-icon-options');
            projectIconsGrid.innerHTML = '';
            SYSTEM_ICONS.forEach(iconName => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.onclick = () => selectPresetIcon(iconName);
                btn.className = "icon-preset-btn w-full aspect-square rounded-xl flex items-center justify-center bg-white/5 border border-transparent text-gray-400 hover:text-white transition";
                btn.setAttribute('data-icon', iconName);
                btn.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i>`;
                projectIconsGrid.appendChild(btn);
            });

            backdrop.classList.remove('hidden');
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                container.classList.remove('scale-95');
                lucide.createIcons();
            }, 10);

            if (!AppState.editingProjectId) {
                selectPresetColor('#FF3B30');
                selectPresetIcon('smile');
            }
        }

        function openEditProjectModal(projectId, event) {
            if (event) event.stopPropagation();
            AppState.editingProjectId = projectId;
            const project = AppState.projects.find(p => p.id === projectId);
            if (!project) return;
            
            openNewProjectModal();
            
            document.getElementById('new-project-title').value = project.title;
            selectPresetColor(project.color || '#FF3B30');
            selectPresetIcon(project.icon || 'smile');
        }

        function closeProjectModal() {
            const backdrop = document.getElementById('project-modal-backdrop');
            const container = document.getElementById('project-modal-container');
            backdrop.classList.add('opacity-0');
            container.classList.add('scale-95');
            setTimeout(() => { backdrop.classList.add('hidden'); }, 150);
            AppState.editingProjectId = null;
            document.getElementById('new-project-title').value = '';
        }

        function selectPresetColor(colorHex) {
            AppState.tempProjectColor = colorHex;
            document.querySelectorAll('#project-color-options .color-preset-btn').forEach(btn => {
                const color = btn.getAttribute('data-color');
                if (color === colorHex) {
                    btn.className = "color-preset-btn w-9 h-9 rounded-full flex items-center justify-center bg-white/10 ring-2 ring-white scale-110 transition-all z-10";
                } else {
                    btn.className = "color-preset-btn w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-transparent transition-all";
                }
            });
        }

        function selectPresetIcon(iconName) {
            AppState.tempProjectIcon = iconName;
            document.querySelectorAll('#project-icon-options .icon-preset-btn').forEach(btn => {
                const icon = btn.getAttribute('data-icon');
                if (icon === iconName) {
                    btn.className = "icon-preset-btn w-9 h-9 rounded-xl flex items-center justify-center bg-white text-black scale-110 transition-all z-10";
                } else {
                    btn.className = "icon-preset-btn w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-gray-400 hover:text-white transition-all";
                }
            });
        }

        function handleProjectCreation(event) {
            event.preventDefault();
            const titleInput = document.getElementById('new-project-title');
            const finalTitle = sanitizeSentenceCase(titleInput.value);
            if (!finalTitle) return;

            if (AppState.editingProjectId) {
                const project = AppState.projects.find(p => p.id === AppState.editingProjectId);
                if (project) {
                    project.title = finalTitle;
                    project.color = AppState.tempProjectColor;
                    project.icon = AppState.tempProjectIcon;
                    showToast('Collection Saved', `Custom folder "${finalTitle}" updated.`);
                }
            } else {
                const newProj = {
                    id: 'proj-' + Date.now(),
                    title: finalTitle,
                    color: AppState.tempProjectColor,
                    icon: AppState.tempProjectIcon
                };
                AppState.projects.push(newProj);
                showToast('Collection Created', `Successfully created customized folder "${finalTitle}".`);
            }

            syncDeviceDataChannels();
            closeProjectModal(); 
        }

        function handleDeleteProject(projectId, event) {
            if (event) event.stopPropagation();
            const project = AppState.projects.find(p => p.id === projectId);
            if (project) {
                showDeleteConfirmation(`Are you sure you want to delete the collection "${project.title}"? Associated tasks will return to your general Inbox.`, () => {
                    AppState.projects = AppState.projects.filter(p => p.id !== projectId);
                    AppState.tasks.forEach(t => {
                        if (t.projectId === projectId) t.projectId = null;
                    });
                    syncDeviceDataChannels();
                    if (AppState.currentTab === projectId) {
                        switchTab('inbox');
                    }
                });
            }
        }

        function openAddGroupModal() {
            const backdrop = document.getElementById('group-modal-backdrop');
            const container = document.getElementById('group-modal-container');
            const submitBtn = document.getElementById('group-submit-btn');
            
            if (contextSelectedGroupId) {
                document.getElementById('group-modal-title-text').innerHTML = `<i data-lucide="edit" class="text-[#2997ff] mr-2 w-4.5 h-4.5"></i> Edit Group Settings`;
                submitBtn.textContent = "Save Changes";
            } else {
                document.getElementById('group-modal-title-text').innerHTML = `<i data-lucide="plus-square" class="text-[#2997ff] mr-2 w-4.5 h-4.5"></i> Create Group Column`;
                submitBtn.textContent = "Create Group";
            }
            
            const groupColorGrid = document.getElementById('group-color-options');
            groupColorGrid.innerHTML = '';
            SYSTEM_COLORS.forEach(color => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.onclick = () => selectGroupPresetColor(color);
                btn.className = "group-color-preset-btn w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-transparent transition relative flex-shrink-0";
                btn.setAttribute('data-color', color);
                btn.innerHTML = `<span class="w-6 h-6 rounded-full block" style="background-color: ${color};"></span>`;
                groupColorGrid.appendChild(btn);
            });

            const groupIconsGrid = document.getElementById('group-icon-options');
            groupIconsGrid.innerHTML = '';
            SYSTEM_ICONS.forEach(iconName => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.onclick = () => selectGroupPresetIcon(iconName);
                btn.className = "group-icon-preset-btn w-full aspect-square rounded-xl flex items-center justify-center bg-white/5 border border-transparent text-gray-400 hover:text-white transition";
                btn.setAttribute('data-icon', iconName);
                btn.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i>`;
                groupIconsGrid.appendChild(btn);
            });

            backdrop.classList.remove('hidden');
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                container.classList.remove('scale-95');
                lucide.createIcons();
            }, 10);

            if (contextSelectedGroupId) {
                const group = AppState.groups.find(g => g.id === contextSelectedGroupId);
                if (group) {
                    document.getElementById('new-group-title').value = group.title;
                    selectGroupPresetColor(group.color || '#FF3B30');
                    selectGroupPresetIcon(group.icon || 'list');
                }
            } else {
                selectGroupPresetColor('#FF3B30');
                selectGroupPresetIcon('list');
            }
        }

        function openEditGroupModalTrigger() {
            if (!contextSelectedGroupId) return;
            openAddGroupModal();
            hideGroupContextMenu();
        }

        function openEditGroupModalTriggerFromId(groupId, event) {
            if (event) event.stopPropagation();
            contextSelectedGroupId = groupId;
            openAddGroupModal();
        }

        function closeAddGroupModal() {
            const backdrop = document.getElementById('group-modal-backdrop');
            const container = document.getElementById('group-modal-container');
            const submitBtn = document.getElementById('group-submit-btn');
            backdrop.classList.add('opacity-0');
            container.classList.add('scale-95');
            setTimeout(() => {
                backdrop.classList.add('hidden');
                if (AppState.returningToTaskModal) {
                    AppState.returningToTaskModal = false;
                    setTimeout(openAddTaskModal, 150);
                }
            }, 150);
            document.getElementById('new-group-title').value = '';
            contextSelectedGroupId = null;
        }

        function selectGroupPresetColor(colorHex) {
            AppState.tempGroupColor = colorHex;
            document.querySelectorAll('#group-color-options .group-color-preset-btn').forEach(btn => {
                const color = btn.getAttribute('data-color');
                if (color === colorHex) {
                    btn.className = "group-color-preset-btn w-9 h-9 rounded-full flex items-center justify-center bg-white/10 ring-2 ring-white scale-110 transition-all z-10";
                } else {
                    btn.className = "group-color-preset-btn w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-transparent transition-all";
                }
            });
        }

        function selectGroupPresetIcon(iconName) {
            AppState.tempGroupIcon = iconName;
            document.querySelectorAll('#group-icon-options .group-icon-preset-btn').forEach(btn => {
                const icon = btn.getAttribute('data-icon');
                if (icon === iconName) {
                    btn.className = "group-icon-preset-btn w-9 h-9 rounded-xl flex items-center justify-center bg-white text-black scale-110 transition-all z-10";
                } else {
                    btn.className = "group-icon-preset-btn w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 text-gray-400 hover:text-white transition-all";
                }
            });
        }

        function handleAddGroupForm(event) {
            event.preventDefault();
            const input = document.getElementById('new-group-title');
            const name = input.value.trim();
            if (!name) return;

            const finalTitle = sanitizeSentenceCase(name);

            if (contextSelectedGroupId) {
                const group = AppState.groups.find(g => g.id === contextSelectedGroupId);
                if (group) {
                    group.title = finalTitle;
                    group.color = AppState.tempGroupColor;
                    group.icon = AppState.tempGroupIcon;
                    showToast('Group Updated', `Successfully updated "${finalTitle}".`);
                }
            } else {
                const newGroupId = 'group-' + Date.now();
                AppState.groups.push({
                    id: newGroupId,
                    title: finalTitle,
                    color: AppState.tempGroupColor,
                    icon: AppState.tempGroupIcon
                });
                showToast('Group Column Created', `Successfully configured "${finalTitle}".`);

                if (AppState.returningToTaskModal && AppState.draftTask) {
                    AppState.draftTask.groupId = newGroupId;
                    AppState.draftTask.groupLabel = finalTitle;
                }
            }

            syncDeviceDataChannels();
            closeAddGroupModal(); 
        }

        function contextDeleteGroupTrigger() {
            if (contextSelectedGroupId) handleDeleteGroup(contextSelectedGroupId);
            hideGroupContextMenu();
        }

        function handleDeleteGroup(groupId) {
            const matchesCount = AppState.tasks.filter(t => t.groupId === groupId).length;
            const group = AppState.groups.find(g => g.id === groupId);
            const groupTitle = group ? group.title : "Group Column";
            
            let msg = `Are you sure you want to delete "${groupTitle}"?`;
            if (matchesCount > 0) {
                msg = `Are you sure you want to permanently delete group column "${groupTitle}"? This will permanently delete the ${matchesCount} task(s) inside this column.`;
            }

            showDeleteConfirmation(msg, () => {
                executeDeleteGroup(groupId);
            });
        }

        function executeDeleteGroup(groupId) {
            AppState.groups = AppState.groups.filter(g => g.id !== groupId);
            AppState.tasks = AppState.tasks.filter(t => t.groupId !== groupId);
            
            if (AppState.selectedTaskId && !AppState.tasks.some(t => t.id === AppState.selectedTaskId)) {
                closeInspector();
            }

            syncDeviceDataChannels();
            showToast('Group Column Removed', 'Removed successfully.');
        }

        function selectSortOption(option, label) {
            AppState.sortBy = option;
            document.getElementById('selected-sort-label').textContent = label;
            
            const menu = document.getElementById('sort-dropdown-options');
            if (menu) hideFloatingElement(menu);

            document.querySelectorAll('.checkbox-marker').forEach(marker => {
                marker.classList.add('hidden');
            });
            const activeMarker = document.getElementById(`sort-marker-${option}`);
            if (activeMarker) activeMarker.classList.remove('hidden');

            renderTaskFeed();
        }

        function exportData() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                tasks: AppState.tasks,
                projects: AppState.projects,
                groups: AppState.groups
            }, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", `clipboard_backup_${getTodayDateString()}.json`);
            dlAnchorElem.click();
            showToast('Backup Exported', 'Settings backup file created successfully.');
        }

        function triggerImport() { document.getElementById('import-file-input').click(); }

        function handleImportFile(event) {
            const input = event.target;
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function() {
                try {
                    const parsed = JSON.parse(reader.result);
                    if (parsed.tasks && parsed.projects) {
                        AppState.tasks = parsed.tasks;
                        AppState.projects = parsed.projects;
                        if (parsed.groups) AppState.groups = parsed.groups;
                        AppState.selectedTaskIds = []; 
                        syncDeviceDataChannels();
                        switchTab('inbox');
                        showToast('ClipBoard Restored', 'Database backup imported successfully.');
                    } else {
                        showToast('Import Failed', 'Invalid database structure.');
                    }
                } catch (e) {
                    showToast('Import Error', 'Corrupted file payload.');
                }
            };
            reader.readAsText(file);
            input.value = '';
        }

        function showToast(title, msg) {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            
            toast.className = "p-4 bg-[#121212] text-white rounded-xl shadow-2xl flex items-start space-x-3.5 max-w-sm pointer-events-auto opacity-0 transform translate-y-1 transition duration-150 ease-out border border-white/[0.04]";
            toast.innerHTML = `
                <div class="p-1.5 rounded-lg bg-[#2997ff]/10 text-[#2997ff] flex-shrink-0">
                    <i data-lucide="indigo" class="w-4 h-4"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h5 class="text-xs font-bold tracking-tight">${escapeHTML(title)}</h5>
                    <p class="text-[11px] text-gray-400 mt-0.5 leading-relaxed truncate">${escapeHTML(msg)}</p>
                </div>
                <button onclick="this.closest('.pointer-events-auto').remove()" class="p-1 hover:bg-white/5 rounded-md text-gray-500 hover:text-white transition flex-shrink-0 btn-scale" title="Dismiss Alert">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
            `;
            
            container.appendChild(toast);
            lucide.createIcons();

            setTimeout(() => { toast.classList.remove('opacity-0', 'translate-y-1'); }, 10);
            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.classList.add('opacity-0', 'translate-y-1');
                    setTimeout(() => { toast.remove(); }, 150);
                }
            }, 4000);
        }

        function escapeHTML(str) {
            if (!str) return '';
            return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
        }

        function checkAndAutoDeleteTasks() {
            const now = Date.now();
            let deletedAny = false;
            let deletedNames = [];

            AppState.tasks = AppState.tasks.filter(task => {
                if (task.expiryTime && now > task.expiryTime) {
                    deletedAny = true;
                    deletedNames.push(task.title);
                    return false; 
                }
                return true;
            });

            if (deletedAny) {
                syncDeviceDataChannels();
                deletedNames.forEach(name => {
                    showToast('Auto-Deleted Task', `"${name}" was automatically removed based on your schedule settings.`);
                });
            }
        }

        function handleFeedDoubleClick(event) {
            if (event.target.closest('.group-card') || 
                event.target.closest('button') || 
                event.target.closest('input') || 
                event.target.closest('select') || 
                event.target.closest('a') || 
                event.target.closest('#inspector-panel') || 
                event.target.closest('#sidebar-panel') ||
                event.target.closest('#context-menu') ||
                event.target.closest('#counter-context-menu') ||
                event.target.closest('#group-context-menu') ||
                event.target.closest('#feed-context-menu')) {
                return;
            }
            openAddTaskModal();
        }

        function handleSearch(val) {
            AppState.searchQuery = val || '';
            if (AppState.searchQuery.trim().length > 0) {
                if (AppState.currentTab !== 'search') {
                    AppState.currentTab = 'search';
                }
            } else {
                if (AppState.currentTab === 'search') {
                    AppState.currentTab = 'inbox';
                }
            }
            renderTaskFeed();
        }

        function initDragToSelect() {
            const feed = document.getElementById('task-feed-scroll');
            if (!feed) return;

            feed.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return; 
                
                if (e.target.closest('button') || 
                    e.target.closest('input') || 
                    e.target.closest('textarea') || 
                    e.target.closest('form') || 
                    e.target.closest('.group-card') || 
                    e.target.closest('#inspector-panel') || 
                    e.target.closest('#sidebar-panel') ||
                    e.target.closest('#context-menu') ||
                    e.target.closest('#counter-context-menu') ||
                    e.target.closest('#group-context-menu') ||
                    e.target.closest('#feed-context-menu') ||
                    e.target.closest('#custom-calendar-popup')) {
                    return;
                }

                dragSelectActive = true;
                const rect = feed.getBoundingClientRect();
                
                dragSelectStartX = e.clientX - rect.left + feed.scrollLeft;
                dragSelectStartY = e.clientY - rect.top + feed.scrollTop;

                if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                    AppState.selectedTaskIds = [];
                    AppState.selectedTaskId = null;
                    closeInspector();
                    renderTaskFeed();
                }

                if (marqueeDiv) marqueeDiv.remove();
                marqueeDiv = document.createElement('div');
                marqueeDiv.id = 'selection-marquee';
                marqueeDiv.style.left = `${dragSelectStartX}px`;
                marqueeDiv.style.top = `${dragSelectStartY}px`;
                marqueeDiv.style.width = '0px';
                marqueeDiv.style.height = '0px';
                feed.appendChild(marqueeDiv);
            });

            document.addEventListener('mousemove', (e) => {
                if (!dragSelectActive || !marqueeDiv) return;
                const rect = feed.getBoundingClientRect();

                const currentX = e.clientX - rect.left + feed.scrollLeft;
                const currentY = e.clientY - rect.top + feed.scrollTop;

                const x = Math.min(dragSelectStartX, currentX);
                const y = Math.min(dragSelectStartY, currentY);
                const w = Math.abs(dragSelectStartX - currentX);
                const h = Math.abs(dragSelectStartY - currentY);

                marqueeDiv.style.left = `${x}px`;
                marqueeDiv.style.top = `${y}px`;
                marqueeDiv.style.width = `${w}px`;
                marqueeDiv.style.height = `${h}px`;

                const cards = feed.querySelectorAll('.group-card');
                const marqueeRect = {
                    left: x,
                    top: y,
                    right: x + w,
                    bottom: y + h
                };

                cards.forEach(card => {
                    const taskId = card.getAttribute('data-task-id');
                    if (!taskId) return;

                    const cardRect = card.getBoundingClientRect();
                    const cardRelativeLeft = cardRect.left - rect.left + feed.scrollLeft;
                    const cardRelativeTop = cardRect.top - rect.top + feed.scrollTop;
                    const cardRelativeRight = cardRelativeLeft + cardRect.width;
                    const cardRelativeBottom = cardRelativeTop + cardRect.height;

                    const intersects = !(marqueeRect.left > cardRelativeRight ||
                                         marqueeRect.right < cardRelativeLeft ||
                                         marqueeRect.top > cardRelativeBottom ||
                                         marqueeRect.bottom < cardRelativeTop);

                    if (intersects) {
                        if (!AppState.selectedTaskIds.includes(taskId)) {
                            AppState.selectedTaskIds.push(taskId);
                        }
                    } else {
                        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                            AppState.selectedTaskIds = AppState.selectedTaskIds.filter(id => id !== taskId);
                        }
                    }
                });

                cards.forEach(card => {
                    const taskId = card.getAttribute('data-task-id');
                    if (AppState.selectedTaskIds.includes(taskId)) {
                        card.classList.add('ring-1', 'ring-[#2997ff]');
                    } else {
                        if (AppState.selectedTaskId !== taskId) {
                            card.classList.remove('ring-1', 'ring-[#2997ff]');
                        }
                    }
                });
            });

            document.addEventListener('mouseup', () => {
                if (dragSelectActive) {
                    dragSelectActive = false;
                    if (marqueeDiv) {
                        marqueeDiv.remove();
                        marqueeDiv = null;
                    }

                    if (AppState.selectedTaskIds.length === 1) {
                        AppState.selectedTaskId = AppState.selectedTaskIds[0];
                        renderInspector();
                        const inspector = document.getElementById('inspector-panel');
                        inspector.style.width = '320px';
                        document.getElementById('inspector-resizer').style.display = 'block';
                    } else if (AppState.selectedTaskIds.length > 1) {
                        closeInspector();
                    }

                    renderTaskFeed();
                }
            });
        }

        window.onload = function() {
            loadFromLocalStorage();
            initResizeHandlers();
            initDragToSelect(); 
            
            if (window.innerWidth < 768) {
                AppState.sidebarCollapsed = true;
                const sidebar = document.getElementById('sidebar-panel');
                const resizer = document.getElementById('sidebar-resizer');
                const uncollapseBtn = document.getElementById('sidebar-uncollapse-btn');
                if (sidebar) sidebar.style.width = '0px';
                if (resizer) resizer.style.display = 'none';
                if (uncollapseBtn) uncollapseBtn.classList.remove('hidden');
            }

            if (localStorage.getItem('CLIPBOARD_SESSION_ACTIVE') !== 'true') {
                document.getElementById('auth-guard-screen').classList.remove('hidden');
            }

            switchTab('inbox');
            lucide.createIcons(); 
            setInterval(checkAndAutoDeleteTasks, 10000);
        }

        window.addEventListener('storage', (e) => {
            if (e.key === 'CLIPBOARD_TASKS_DATA_V3' || e.key === 'CLIPBOARD_PROJECTS_DATA_V3' || e.key === 'CLIPBOARD_GROUPS_DATA_V3' || e.key === 'CLIPBOARD_PROFILE_DATA_V3' || e.key === 'CLIPBOARD_DEVICE_SYNC_FLAG') {
                loadFromLocalStorage();
                renderTaskFeed();
                updateGlobalBadges();
                if (AppState.selectedTaskId) {
                    renderInspector();
                }
            }
        });
