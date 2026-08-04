        let contextSelectedGroupId = null;
        let contextSelectedTaskId = null;

        window.addEventListener('error', function(e) {
            console.error("Global Error Caught:", e.error);
            const container = document.getElementById('toast-container') || document.body;
            if (container) {
                const toast = document.createElement('div');
                toast.className = "fixed bottom-6 right-6 z-[999] bg-[#141414] border border-red-500/40 text-red-300 px-5 py-3 rounded-full text-xs font-semibold shadow-2xl pointer-events-auto flex items-center space-x-3 max-w-md backdrop-blur-xl";
                toast.innerHTML = `
                    <div class="p-1.5 rounded-full bg-red-500/20 text-red-400 flex-shrink-0">
                        <i data-lucide="alert-circle" class="w-4 h-4"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-white">Application Error</div>
                        <div class="text-[10px] text-gray-400 truncate">${escapeHTML(e.message)} (${e.filename}:${e.lineno})</div>
                    </div>
                    <button onclick="this.closest('div').remove()" class="p-1 text-gray-400 hover:text-white rounded-full transition flex-shrink-0">
                        <i data-lucide="x" class="w-3.5 h-3.5"></i>
                    </button>
                `;
                container.appendChild(toast);
                if (window.lucide) window.lucide.createIcons();
                if (window.hugeicons) window.hugeicons.createIcons();
                setTimeout(() => toast.remove(), 15000);
            }
        });

        const SYSTEM_COLORS = [
            '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', '#007AFF',
            '#5856D6', '#FF2D55', '#AF52DE', '#A2845E', '#8E8E93', '#E4A3A1'
        ];

        const SYSTEM_ICONS = [
            'list', 'bookmark', 'calendar', 'clock', 'star', 'target',
            'dollar-sign', 'briefcase', 'wallet', 'credit-card', 'shopping-bag', 'trophy',
            'zap', 'dumbbell', 'utensils', 'graduation-cap', 'map-pin', 'smile'
        ];

        // Supabase client configuration placeholders
        const SUPABASE_URL = "https://sbqjvrkdfmygjpfbtocs.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicWp2cmtkZm15Z2pwZmJ0b2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwODA2NDEsImV4cCI6MjA5OTY1NjY0MX0.rjjZ8_TjfeQyq6Nw2ZOWdGQQpXb-T0xW98tz0RJB9Ic";
        let supabaseClient = null;
        try {
            if (typeof supabase !== 'undefined') {
                supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }
        } catch (e) {
            console.error("Supabase initialization failed:", e);
        }

        // Data mappers to convert between local state and Postgres DB schemas
        function mapTaskToDB(task) {
            // Verify that referenced project and group exist locally to prevent foreign key constraint violations (Postgres 409)
            const projectExists = task.projectId ? AppState.projects.some(p => p.id === task.projectId) : false;
            const groupExists = task.groupId ? AppState.groups.some(g => g.id === task.groupId) : false;

            return {
                id: task.id,
                title: task.title,
                description: task.description || '',
                priority: task.color || '',
                due_date: task.dueDate || '',
                project_id: projectExists ? task.projectId : null,
                group_id: groupExists ? task.groupId : null,
                icon: task.icon || '',
                done: !!task.done,
                autodelete_policy: task.autoDelete || 'never',
                subtasks: task.subtasks || [],
                notes: task.notes || [],
                expiry_time: task.expiryTime || null,
                created_date: task.createdDate || new Date().toISOString(),
                updated_at: task.updatedAt || new Date().toISOString(),
                completed_at: task.completedAt || null,
                hold_deletion: !!task.holdDeletion,
                hold_until: task.holdUntil || null
            };
        }

        function mapTaskFromDB(dbTask) {
            return {
                id: dbTask.id,
                title: dbTask.title,
                description: dbTask.description || '',
                color: dbTask.priority || '',
                dueDate: dbTask.due_date || '',
                projectId: dbTask.project_id || null,
                groupId: dbTask.group_id || null,
                icon: dbTask.icon || '',
                done: !!dbTask.done,
                autoDelete: dbTask.autodelete_policy || 'never',
                subtasks: dbTask.subtasks || [],
                notes: dbTask.notes || [],
                expiryTime: dbTask.expiry_time || null,
                createdDate: dbTask.created_date || new Date().toISOString(),
                updatedAt: dbTask.updated_at || new Date().toISOString(),
                completedAt: dbTask.completed_at || null,
                holdDeletion: !!dbTask.hold_deletion,
                holdUntil: dbTask.hold_until || null,
                isHeldTask: !!(dbTask.hold_deletion || dbTask.isHeldTask)
            };
        }

        function mapProjectToDB(proj) {
            return {
                id: proj.id,
                name: proj.title,
                color: proj.color,
                icon: proj.icon,
                updated_at: proj.updatedAt || new Date().toISOString()
            };
        }

        function mapProjectFromDB(dbProj) {
            return {
                id: dbProj.id,
                title: dbProj.name,
                color: dbProj.color,
                icon: dbProj.icon,
                updatedAt: dbProj.updated_at || new Date().toISOString()
            };
        }

        function mapGroupToDB(group, position) {
            return {
                id: group.id,
                name: group.title,
                color: group.color,
                icon: group.icon,
                position: position,
                updated_at: group.updatedAt || new Date().toISOString(),
                hold_deletion: !!group.holdDeletion,
                hold_until: group.holdUntil || null
            };
        }

        function mapGroupFromDB(dbGroup) {
            return {
                id: dbGroup.id,
                title: dbGroup.name,
                color: dbGroup.color,
                icon: dbGroup.icon,
                position: dbGroup.position || 0,
                updatedAt: dbGroup.updated_at || new Date().toISOString(),
                holdDeletion: !!dbGroup.hold_deletion,
                holdUntil: dbGroup.hold_until || null
            };
        }

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
            pinnedTaskIds: [], // Direct sidebar pinned task IDs
            
            tempProjectColor: '#FF3B30',
            tempProjectIcon: 'smile',
            tempCreatePriority: '#FF3B30',
            tempCreateIcon: 'smile',
            tempCreateNotes: [],
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

            // Supabase cross-device sync properties
            session: null,
            syncing: false,
            lastKnownState: {
                tasks: [],
                projects: [],
                groups: [],
                profile: {}
            },

            // Metric tracking variables
            metricCardCollapsed: true,
            counterTargetPolicy: 'tasks', // Can be 'tasks' or 'subtasks'
            archiveSortMode: 'recent' // 'recent' | 'oldest' | 'subtasks'
        };

        // Mobile header search helpers
        function openMobileSearchMode() {
            const activeSearch = document.getElementById('mobile-search-active-container');
            const groupsWrapper = document.getElementById('mobile-header-groups-wrapper');
            const input = document.getElementById('mobile-search-input-active');
            if (activeSearch && groupsWrapper && input) {
                groupsWrapper.classList.add('hidden');
                activeSearch.classList.remove('hidden');
                activeSearch.classList.add('flex');
                input.focus();
            }
        }

        function closeMobileSearchMode() {
            const activeSearch = document.getElementById('mobile-search-active-container');
            const groupsWrapper = document.getElementById('mobile-header-groups-wrapper');
            const input = document.getElementById('mobile-search-input-active');
            if (activeSearch && groupsWrapper && input) {
                input.value = '';
                handleSearch('');
                activeSearch.classList.add('hidden');
                activeSearch.classList.remove('flex');
                groupsWrapper.classList.remove('hidden');
            }
        }
        window.openMobileSearchMode = openMobileSearchMode;
        window.closeMobileSearchMode = closeMobileSearchMode;

        // Unified Draggable Sheet Controller Logic (Supports Y-axis bottom sheet & X-axis right side sheet)
        function makeModalDraggable(containerEl, onCloseCallback, options = {}) {
            if (!containerEl || containerEl.dataset.dragInitialized) return;
            containerEl.dataset.dragInitialized = 'true';

            let startPos = 0;
            let currentPos = 0;
            let isDragging = false;
            let panelDimension = 0;
            let samples = [];

            const getAxis = () => {
                if (options.axis === 'x') return 'x';
                if (options.axis === 'y') return 'y';
                return window.innerWidth < 768 ? 'y' : 'x';
            };

            const handleZone = containerEl.querySelector('.sheet-handle-zone, .drawer-swipe-handle, .sheet-header, .inspector-handle-zone-x, [data-drag-handle]') || containerEl;

            const getPoint = (e, axis) => {
                const p = e.touches ? e.touches[0] : e;
                return axis === 'y' ? p.clientY : p.clientX;
            };

            const onStart = (e) => {
                const scrollable = e.target.closest('.overflow-y-auto');
                if (scrollable && scrollable.scrollTop > 0) return;
                
                const axis = getAxis();
                isDragging = true;
                startPos = getPoint(e, axis);
                currentPos = startPos;
                panelDimension = axis === 'y' ? (containerEl.offsetHeight || 400) : (containerEl.offsetWidth || 400);
                samples = [{ p: startPos, t: performance.now() }];
                containerEl.style.transition = 'none';
            };

            const onMove = (e) => {
                if (!isDragging) return;
                const axis = getAxis();
                const p = getPoint(e, axis);
                currentPos = p;
                let delta = p - startPos;
                if (delta < 0) delta = delta / 4; // Dampened resistance moving away from closed edge

                const pos = delta > 0 ? delta : 0;
                containerEl.style.transform = axis === 'y' ? `translateY(${pos}px)` : `translateX(${pos}px)`;

                const now = performance.now();
                samples.push({ p, t: now });
                samples = samples.filter(s => now - s.t < 100);

                if (e.cancelable) e.preventDefault();
            };

            const onEnd = () => {
                if (!isDragging) return;
                isDragging = false;
                const axis = getAxis();
                containerEl.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';

                const distance = Math.max(0, currentPos - startPos);
                let velocity = 0;
                if (samples.length >= 2) {
                    const first = samples[0];
                    const last = samples[samples.length - 1];
                    const dt = last.t - first.t || 1;
                    velocity = (last.p - first.p) / dt;
                }

                if (distance > panelDimension * 0.35 || (velocity > 0.6 && distance > 10)) {
                    containerEl.style.transform = axis === 'y' ? `translateY(${panelDimension}px)` : `translateX(${panelDimension}px)`;
                    setTimeout(() => {
                        containerEl.style.transform = '';
                        if (onCloseCallback) onCloseCallback();
                    }, 200);
                } else {
                    containerEl.style.transform = axis === 'y' ? 'translateY(0px)' : 'translateX(0px)';
                }
            };

            handleZone.addEventListener('pointerdown', onStart);
            window.addEventListener('pointermove', onMove, { passive: false });
            window.addEventListener('pointerup', onEnd);
            window.addEventListener('pointercancel', onEnd);
        }

        // Attach touch gesture inspectors and sidebars
        (function initTouchGestureController() {
            let touchStartX = 0;
            let touchStartY = 0;
            let currentTouchX = 0;
            let currentTouchY = 0;
            let isDraggingSidebar = false;
            let isDraggingInspector = false;

            const getSidebar = () => document.getElementById('sidebar-panel');
            const getInspector = () => document.getElementById('inspector-panel');

            let sidebarOverlay = document.getElementById('sidebar-touch-overlay');
            if (!sidebarOverlay) {
                sidebarOverlay = document.createElement('div');
                sidebarOverlay.id = 'sidebar-touch-overlay';
                sidebarOverlay.className = "fixed inset-0 bg-transparent z-[35] hidden transition-opacity duration-150 pointer-events-none";
                sidebarOverlay.onclick = () => closeSidebarMobile();
                document.body.appendChild(sidebarOverlay);
            }

            let inspectorOverlay = document.getElementById('inspector-touch-overlay');
            if (!inspectorOverlay) {
                inspectorOverlay = document.createElement('div');
                inspectorOverlay.id = 'inspector-touch-overlay';
                inspectorOverlay.className = "fixed inset-0 bg-black/60 z-[145] hidden transition-opacity duration-150 pointer-events-auto";
                inspectorOverlay.onclick = () => closeInspector();
                document.body.appendChild(inspectorOverlay);
            }

            document.addEventListener('touchstart', (e) => {
                if (window.innerWidth >= 768) return;
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                currentTouchX = touchStartX;
                currentTouchY = touchStartY;

                const sidebar = getSidebar();
                const isSidebarOpen = sidebar && !AppState.sidebarCollapsed;

                const inspector = getInspector();
                const isInspectorOpen = inspector && AppState.selectedTaskId !== null;

                if (isSidebarOpen) {
                    if (touchStartX > 200 || e.target.closest('#sidebar-panel')) {
                        isDraggingSidebar = true;
                    }
                } else {
                    isDraggingSidebar = true;
                }

                if (isInspectorOpen && e.target.closest('#inspector-panel')) {
                    const scrollContainer = e.target.closest('.overflow-y-auto');
                    if (!scrollContainer || scrollContainer.scrollTop <= 0) {
                        isDraggingInspector = true;
                    }
                }
            }, { passive: true });

            document.addEventListener('touchmove', (e) => {
                if (window.innerWidth >= 768) return;
                currentTouchX = e.touches[0].clientX;
                currentTouchY = e.touches[0].clientY;
                const deltaX = currentTouchX - touchStartX;
                const deltaY = currentTouchY - touchStartY;

                const sidebar = getSidebar();
                const isSidebarOpen = sidebar && !AppState.sidebarCollapsed;

                if (isDraggingSidebar && sidebar) {
                    if (isSidebarOpen && deltaX < 0) {
                        sidebar.style.transform = `translateX(${deltaX}px)`;
                    } else if (!isSidebarOpen && deltaX > 0) {
                        sidebar.classList.remove('hidden');
                        sidebar.style.transform = `translateX(${-280 + deltaX}px)`;
                    }
                }

                const inspector = getInspector();
                const isInspectorOpen = inspector && AppState.selectedTaskId !== null;

                if (isDraggingInspector && inspector && isInspectorOpen && deltaY > 0) {
                    const progress = Math.max(0, Math.min(1, 1 - (deltaY / (window.innerHeight * 0.5))));
                    inspector.style.transform = `translateY(${deltaY}px)`;
                    inspectorOverlay.classList.remove('hidden');
                    inspectorOverlay.style.opacity = progress;
                }
            }, { passive: true });

            document.addEventListener('touchend', () => {
                if (window.innerWidth >= 768) return;
                const deltaX = currentTouchX - touchStartX;
                const deltaY = currentTouchY - touchStartY;

                const sidebar = getSidebar();
                const isSidebarOpen = sidebar && !AppState.sidebarCollapsed;

                if (isDraggingSidebar && sidebar) {
                    sidebar.style.transform = '';
                    if (isSidebarOpen && deltaX < -60) {
                        closeSidebarMobile();
                    } else if (!isSidebarOpen && touchStartX < 35 && deltaX > 60) {
                        openSidebarMobile();
                    }
                }

                const inspector = getInspector();
                const isInspectorOpen = inspector && AppState.selectedTaskId !== null;

                if (isDraggingInspector && inspector && isInspectorOpen) {
                    inspector.style.transform = '';
                    inspectorOverlay.style.opacity = '';
                    if (deltaY > 80) {
                        closeInspector();
                        inspectorOverlay.classList.add('hidden');
                    } else {
                        inspectorOverlay.classList.remove('hidden');
                        inspectorOverlay.classList.add('opacity-100');
                    }
                }

                isDraggingSidebar = false;
                isDraggingInspector = false;
            }, { passive: true });
        })();

        function updateSyncStatusUI(status) {
            const statusIndicator = document.getElementById('storage-status');
            if (!statusIndicator) return;
            statusIndicator.innerHTML = '';
            
            if (status === 'synced') {
                statusIndicator.className = "flex items-center text-emerald-400 font-medium";
                statusIndicator.innerHTML = '<i data-lucide="shield-check" class="w-3 h-3 mr-1"></i> Autosaved';
            } else if (status === 'syncing') {
                statusIndicator.className = "flex items-center text-blue-400 font-medium";
                statusIndicator.innerHTML = '<i data-lucide="refresh-cw" class="w-3 h-3 mr-1 animate-spin"></i> Syncing...';
            } else if (status === 'offline') {
                statusIndicator.className = "flex items-center text-yellow-500 font-medium";
                statusIndicator.innerHTML = '<i data-lucide="wifi-off" class="w-3 h-3 mr-1"></i> Offline Pending';
            } else if (status === 'error') {
                statusIndicator.className = "flex items-center text-red-400 font-medium";
                statusIndicator.innerHTML = '<i data-lucide="alert-circle" class="w-3 h-3 mr-1"></i> Sync Error';
            }
            lucide.createIcons();
        }

        function queueSyncOperation(table, action, recordId, data) {
            if (!AppState.session) return;
            
            const op = {
                id: 'op-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                table,
                action,
                recordId,
                data,
                timestamp: Date.now()
            };
            
            let queue = [];
            try {
                queue = JSON.parse(localStorage.getItem('CLIPBOARD_PENDING_WRITES') || '[]');
            } catch(e) {}
            
            // Consolidate queue operations
            queue = queue.filter(q => !(q.table === table && q.recordId === recordId));
            queue.push(op);
            
            localStorage.setItem('CLIPBOARD_PENDING_WRITES', JSON.stringify(queue));
            processSyncQueue();
        }

        function healSyncQueue() {
            let queue = [];
            try {
                queue = JSON.parse(localStorage.getItem('CLIPBOARD_PENDING_WRITES') || '[]');
            } catch(e) {}
            
            if (queue.length === 0) return;
            
            let healed = false;
            queue.forEach(op => {
                if (op.table === 'tasks' && op.action === 'upsert' && op.data) {
                    const projectExists = op.data.project_id ? AppState.projects.some(p => p.id === op.data.project_id) : false;
                    const groupExists = op.data.group_id ? AppState.groups.some(g => g.id === op.data.group_id) : false;
                    
                    if (op.data.project_id && !projectExists) {
                        op.data.project_id = null;
                        healed = true;
                    }
                    if (op.data.group_id && !groupExists) {
                        op.data.group_id = null;
                        healed = true;
                    }
                }
            });
            
            if (healed) {
                localStorage.setItem('CLIPBOARD_PENDING_WRITES', JSON.stringify(queue));
            }
        }

        async function processSyncQueue() {
            if (!supabaseClient || !AppState.session) {
                updateSyncStatusUI('synced');
                return;
            }
            
            if (!navigator.onLine) {
                updateSyncStatusUI('offline');
                return;
            }
            
            if (AppState.syncing) return;
            
            // Clean up any invalid foreign key references in the queue before processing
            healSyncQueue();

            AppState.syncing = true;
            updateSyncStatusUI('syncing');
            
            try {
                while (true) {
                    let queue = [];
                    try {
                        queue = JSON.parse(localStorage.getItem('CLIPBOARD_PENDING_WRITES') || '[]');
                    } catch(e) {}
                    
                    if (queue.length === 0) {
                        AppState.syncing = false;
                        updateSyncStatusUI('synced');
                        break;
                    }
                    
                    const op = queue[0];
                    let error = null;
                    
                    if (op.action === 'upsert') {
                        op.data.user_id = AppState.session.user.id;
                        const res = await supabaseClient.from(op.table).upsert(op.data);
                        error = res.error;
                    } else if (op.action === 'delete') {
                        const res = await supabaseClient.from(op.table).delete().eq('id', op.recordId);
                        error = res.error;
                    }
                    
                    if (error) {
                        console.error(`Sync error on table ${op.table} for action ${op.action}:`, error);
                        AppState.syncing = false;
                        updateSyncStatusUI('error');
                        return; // Halt and retry later
                    }
                    
                    queue.shift();
                    localStorage.setItem('CLIPBOARD_PENDING_WRITES', JSON.stringify(queue));
                }
            } catch (err) {
                console.error("Unhandled sync queue worker error:", err);
                AppState.syncing = false;
                updateSyncStatusUI('error');
            }
        }

        window.addEventListener('online', () => {
            processSyncQueue();
        });

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
            let left = options.alignRight ? (anchorRect.right - menuWidth) : anchorRect.left;
            let fitsLeft = left + menuWidth + margin <= window.innerWidth;
            let fitsRight = anchorRect.right - menuWidth >= margin;

            if (!options.alignRight && !fitsLeft && fitsRight) {
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
            el.classList.add('floating-menu-anim');

            // Keep track of the active floating element so we can reposition on resize or close on scroll
            activeFloatingElement = el;
            activeFloatingElement.anchorRect = anchorRect;
            activeFloatingElement.positionOptions = options;
        }

        function hideFloatingElement(el) {
            if (!el) return;
            el.classList.add('hidden');
            el.classList.remove('floating-positioned', 'floating-menu-anim');
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

        function openSidebarMobile() {
            if (AppState.sidebarCollapsed) {
                toggleSidebarCollapse();
            }
        }

        function closeSidebarMobile() {
            if (!AppState.sidebarCollapsed) {
                toggleSidebarCollapse();
            }
        }

        // Mobile Touch Gestures System (Real-time dragging, dynamic blur/darkness fade)
        (function initMobileTouchGestures() {
            let touchStartX = 0;
            let touchStartY = 0;
            let currentTouchX = 0;
            let currentTouchY = 0;
            let isDraggingSidebar = false;
            let isDraggingInspector = false;

            const getSidebar = () => document.getElementById('sidebar-panel');
            const getInspector = () => document.getElementById('inspector-panel');

            let sidebarOverlay = document.getElementById('mobile-sidebar-backdrop');
            if (!sidebarOverlay) {
                sidebarOverlay = document.createElement('div');
                sidebarOverlay.id = 'mobile-sidebar-backdrop';
                sidebarOverlay.className = 'fixed inset-0 bg-transparent z-[35] hidden opacity-0 transition-opacity duration-150 pointer-events-none';
                sidebarOverlay.onclick = () => closeSidebarMobile();
                document.body.appendChild(sidebarOverlay);
            }

            let inspectorOverlay = document.getElementById('mobile-inspector-backdrop');
            if (!inspectorOverlay) {
                inspectorOverlay = document.createElement('div');
                inspectorOverlay.id = 'mobile-inspector-backdrop';
                inspectorOverlay.className = 'fixed inset-0 bg-black/60 z-[95] hidden opacity-0 transition-opacity duration-150 pointer-events-auto';
                inspectorOverlay.onclick = () => closeInspector();
                document.body.appendChild(inspectorOverlay);
            }

            document.addEventListener('touchstart', (e) => {
                if (window.innerWidth >= 768) return;
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                currentTouchX = touchStartX;
                currentTouchY = touchStartY;

                const sidebar = getSidebar();
                const isSidebarOpen = sidebar && !AppState.sidebarCollapsed;
                const inspector = getInspector();
                const isInspectorOpen = inspector && AppState.selectedTaskId !== null;

                // Drag sidebar: if open, drag left; if closed, drag right from anywhere on screen
                if (isSidebarOpen) {
                    if (touchStartX > 200 || e.target.closest('#sidebar-panel')) {
                        isDraggingSidebar = true;
                    }
                } else {
                    isDraggingSidebar = true;
                }

                // Drag inspector sheet down
                if (isInspectorOpen && e.target.closest('#inspector-panel')) {
                    const scrollContainer = e.target.closest('.overflow-y-auto');
                    if (!scrollContainer || scrollContainer.scrollTop <= 0) {
                        isDraggingInspector = true;
                    }
                }
            }, { passive: true });

            document.addEventListener('touchmove', (e) => {
                if (window.innerWidth >= 768) return;
                currentTouchX = e.touches[0].clientX;
                currentTouchY = e.touches[0].clientY;
                const deltaX = currentTouchX - touchStartX;
                const deltaY = currentTouchY - touchStartY;

                const sidebar = getSidebar();
                const isSidebarOpen = sidebar && !AppState.sidebarCollapsed;

                if (isDraggingSidebar && sidebar) {
                    if (isSidebarOpen && deltaX < 0) {
                        const progress = Math.max(0, Math.min(1, 1 + (deltaX / 280)));
                        sidebar.style.transform = `translateX(${deltaX}px)`;
                        sidebarOverlay.classList.remove('hidden');
                        sidebarOverlay.style.opacity = progress;
                    } else if (!isSidebarOpen && deltaX > 0) {
                        const progress = Math.max(0, Math.min(1, deltaX / 280));
                        sidebar.classList.remove('hidden');
                        sidebar.style.transform = `translateX(${-280 + deltaX}px)`;
                        sidebarOverlay.classList.remove('hidden');
                        sidebarOverlay.style.opacity = progress;
                    }
                }

                const inspector = getInspector();
                const isInspectorOpen = inspector && AppState.selectedTaskId !== null;

                if (isDraggingInspector && inspector && isInspectorOpen && deltaY > 0) {
                    const progress = Math.max(0, Math.min(1, 1 - (deltaY / (window.innerHeight * 0.5))));
                    inspector.style.transform = `translateY(${deltaY}px)`;
                    inspectorOverlay.classList.remove('hidden');
                    inspectorOverlay.style.opacity = progress;
                }
            }, { passive: true });

            document.addEventListener('touchend', (e) => {
                if (window.innerWidth >= 768) return;
                const deltaX = currentTouchX - touchStartX;
                const deltaY = currentTouchY - touchStartY;

                const sidebar = getSidebar();
                const isSidebarOpen = sidebar && !AppState.sidebarCollapsed;

                if (isDraggingSidebar && sidebar) {
                    sidebar.style.transform = '';
                    sidebarOverlay.style.opacity = '';
                    if (isSidebarOpen && deltaX < -60) {
                        closeSidebarMobile();
                        dismissOverlay(sidebarOverlay, null, null, 150);
                    } else if (!isSidebarOpen && touchStartX < 35 && deltaX > 60) {
                        openSidebarMobile();
                        sidebarOverlay.classList.remove('hidden');
                    } else if (isSidebarOpen) {
                        sidebarOverlay.classList.remove('hidden');
                        sidebarOverlay.classList.add('opacity-100');
                    } else {
                        dismissOverlay(sidebarOverlay, null, null, 150);
                    }
                }

                const inspector = getInspector();
                const isInspectorOpen = inspector && AppState.selectedTaskId !== null;

                if (isDraggingInspector && inspector && isInspectorOpen) {
                    inspector.style.transform = '';
                    inspectorOverlay.style.opacity = '';
                    if (deltaY > 80) {
                        closeInspector();
                        dismissOverlay(inspectorOverlay, null, null, 150);
                    } else {
                        inspectorOverlay.classList.remove('hidden');
                        inspectorOverlay.classList.add('opacity-100');
                    }
                }

                isDraggingSidebar = false;
                isDraggingInspector = false;
            }, { passive: true });
        })();

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
                        <span>${item.label}</span>
                        ${badgeHTML}
                    </span>
                    ${iconHTML || (item.chevron ? '<i data-lucide="chevron-right" class="w-4 h-4 text-gray-500"></i>' : '')}
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

            dismissOverlay(backdrop, drawer, () => {
                drawerStack = [];
                drawerMenuDefinition = null;
            }, 200);
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
            
            if (tasks) {
                AppState.tasks = JSON.parse(tasks);
                AppState.tasks.forEach(task => {
                    if (task.note && (!task.notes || task.notes.length === 0)) {
                        task.notes = [{
                            id: 'note-' + Date.now() + Math.random().toString(36).substr(2, 5),
                            text: task.note
                        }];
                        delete task.note;
                    }
                    if (!task.notes) {
                        task.notes = [];
                    }
                });
            }
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
            const nowISO = new Date().toISOString();
            
            AppState.tasks.forEach(t => {
                if (!t.updatedAt) t.updatedAt = nowISO;
            });
            AppState.projects.forEach(p => {
                if (!p.updatedAt) p.updatedAt = nowISO;
            });
            AppState.groups.forEach(g => {
                if (!g.updatedAt) g.updatedAt = nowISO;
            });

            localStorage.setItem('CLIPBOARD_DEVICE_SYNC_FLAG', Date.now().toString());
            saveToLocalStorage();

            if (!AppState.session) return;

            // 1. Detect task creations / updates
            AppState.tasks.forEach(task => {
                const last = AppState.lastKnownState.tasks.find(t => t.id === task.id);
                if (!last) {
                    task.updatedAt = nowISO;
                    queueSyncOperation('tasks', 'upsert', task.id, mapTaskToDB(task));
                } else if (JSON.stringify(task) !== JSON.stringify(last)) {
                    task.updatedAt = nowISO;
                    queueSyncOperation('tasks', 'upsert', task.id, mapTaskToDB(task));
                }
            });
            // Detect task deletions
            AppState.lastKnownState.tasks.forEach(last => {
                const exists = AppState.tasks.some(t => t.id === last.id);
                if (!exists) {
                    queueSyncOperation('tasks', 'delete', last.id);
                }
            });

            // 2. Detect project creations / updates
            AppState.projects.forEach(proj => {
                const last = AppState.lastKnownState.projects.find(p => p.id === proj.id);
                if (!last) {
                    proj.updatedAt = nowISO;
                    queueSyncOperation('projects', 'upsert', proj.id, mapProjectToDB(proj));
                } else if (JSON.stringify(proj) !== JSON.stringify(last)) {
                    proj.updatedAt = nowISO;
                    queueSyncOperation('projects', 'upsert', proj.id, mapProjectToDB(proj));
                }
            });
            // Detect project deletions
            AppState.lastKnownState.projects.forEach(last => {
                const exists = AppState.projects.some(p => p.id === last.id);
                if (!exists) {
                    queueSyncOperation('projects', 'delete', last.id);
                }
            });

            // 3. Detect group creations / updates / position changes
            AppState.groups.forEach((group, index) => {
                const last = AppState.lastKnownState.groups.find(g => g.id === group.id);
                const lastIndex = AppState.lastKnownState.groups.findIndex(g => g.id === group.id);
                if (!last) {
                    group.updatedAt = nowISO;
                    queueSyncOperation('groups', 'upsert', group.id, mapGroupToDB(group, index));
                } else if (lastIndex !== index || JSON.stringify(group) !== JSON.stringify(last)) {
                    group.updatedAt = nowISO;
                    queueSyncOperation('groups', 'upsert', group.id, mapGroupToDB(group, index));
                }
            });
            // Detect group deletions
            AppState.lastKnownState.groups.forEach(last => {
                const exists = AppState.groups.some(g => g.id === last.id);
                if (!exists) {
                    queueSyncOperation('groups', 'delete', last.id);
                }
            });

            // 4. Detect profile settings modifications
            const currentProfile = {
                name: AppState.profileName,
                dp: AppState.profileDP,
                counterPolicy: AppState.counterTargetPolicy
            };
            if (JSON.stringify(currentProfile) !== JSON.stringify(AppState.lastKnownState.profile)) {
                queueSyncOperation('profiles', 'upsert', AppState.session.user.id, {
                    user_id: AppState.session.user.id,
                    display_name: AppState.profileName,
                    avatar_glyph: AppState.profileDP,
                    counter_policy: AppState.counterTargetPolicy,
                    updated_at: nowISO
                });
            }

            AppState.lastKnownState.tasks = JSON.parse(JSON.stringify(AppState.tasks));
            AppState.lastKnownState.projects = JSON.parse(JSON.stringify(AppState.projects));
            AppState.lastKnownState.groups = JSON.parse(JSON.stringify(AppState.groups));
            AppState.lastKnownState.profile = JSON.parse(JSON.stringify(currentProfile));
        }

        function syncProfileUIElements() {
            lucide.createIcons();
        }

        function clearLocalState() {
            AppState.tasks = [];
            AppState.projects = [];
            AppState.groups = [];
            AppState.profileName = 'Anv';
            AppState.profileDP = 'smile';
            AppState.counterTargetPolicy = 'tasks';
            AppState.lastKnownState = {
                tasks: [],
                projects: [],
                groups: [],
                profile: {}
            };
            
            localStorage.removeItem('CLIPBOARD_TASKS_DATA_V3');
            localStorage.removeItem('CLIPBOARD_PROJECTS_DATA_V3');
            localStorage.removeItem('CLIPBOARD_GROUPS_DATA_V3');
            localStorage.removeItem('CLIPBOARD_PROFILE_DATA_V3');
            localStorage.removeItem('CLIPBOARD_COUNTER_POLICY');
            localStorage.removeItem('CLIPBOARD_PENDING_WRITES');
            
            renderTaskFeed();
            updateGlobalBadges();
            closeInspector();
        }

        async function initSupabaseAuth() {
            const isGuestMode = localStorage.getItem('ANV_GUEST_MODE') === 'true';

            if (!supabaseClient) {
                if (!isGuestMode) {
                    document.getElementById('auth-guard-screen').classList.remove('hidden');
                }
                return;
            }

            supabaseClient.auth.onAuthStateChange(async (event, session) => {
                const prevSession = AppState.session;
                AppState.session = session;
                const authGuard = document.getElementById('auth-guard-screen');
                
                if (session) {
                    localStorage.removeItem('ANV_GUEST_MODE');
                    if (authGuard) authGuard.classList.add('hidden');
                    if (!prevSession) {
                        showToast('Sync Activated', 'Ecosystem multi-device data channels synchronized.');
                        await performInitialDataSync();
                        subscribeToRealtimeSync();
                        checkFiveDayAutoBackup();
                    }
                } else {
                    if (localStorage.getItem('ANV_GUEST_MODE') === 'true') {
                        if (authGuard) authGuard.classList.add('hidden');
                        checkFiveDayAutoBackup();
                    } else {
                        clearLocalState();
                        if (authGuard) authGuard.classList.remove('hidden');
                        showToast('Session Closed', 'Local storage device synchronization disconnected.');
                    }
                }
            });
        }

        function executeGuestLogin() {
            localStorage.setItem('ANV_GUEST_MODE', 'true');
            document.getElementById('auth-guard-screen').classList.add('hidden');
            showToast('Guest Mode Activated', 'Working in offline local guest mode.');
        }

        async function performInitialDataSync() {
            if (!supabaseClient || !AppState.session) return;
            
            updateSyncStatusUI('syncing');
            const userId = AppState.session.user.id;
            
            try {
                // Fetch remote data
                const [
                    { data: dbTasks, error: errTasks },
                    { data: dbProjects, error: errProjects },
                    { data: dbGroups, error: errGroups },
                    { data: dbProfiles, error: errProfiles }
                ] = await Promise.all([
                    supabaseClient.from('tasks').select('*'),
                    supabaseClient.from('projects').select('*'),
                    supabaseClient.from('groups').select('*'),
                    supabaseClient.from('profiles').select('*')
                ]);
                
                if (errTasks || errProjects || errGroups || errProfiles) {
                    console.error("Initial data sync fetch failed:", { errTasks, errProjects, errGroups, errProfiles });
                    updateSyncStatusUI('error');
                    return;
                }

                // 1. Process Projects
                let localProjects = [...AppState.projects];
                let remoteProjects = (dbProjects || []).map(mapProjectFromDB);
                let mergedProjects = [];
                let projectsToPush = [];

                remoteProjects.forEach(rp => {
                    const lp = localProjects.find(p => p.id === rp.id);
                    if (!lp) {
                        mergedProjects.push(rp);
                    } else {
                        const lpTime = new Date(lp.updatedAt || 0).getTime();
                        const rpTime = new Date(rp.updatedAt || 0).getTime();
                        if (lpTime > rpTime) {
                            mergedProjects.push(lp);
                            projectsToPush.push(lp);
                        } else {
                            mergedProjects.push(rp);
                        }
                    }
                });
                localProjects.forEach(lp => {
                    if (!mergedProjects.some(p => p.id === lp.id)) {
                        mergedProjects.push(lp);
                        projectsToPush.push(lp);
                    }
                });

                // 2. Process Groups
                let localGroups = [...AppState.groups];
                let remoteGroups = (dbGroups || []).map(mapGroupFromDB);
                let mergedGroups = [];
                let groupsToPush = [];

                remoteGroups.forEach(rg => {
                    const lg = localGroups.find(g => g.id === rg.id);
                    if (!lg) {
                        mergedGroups.push(rg);
                    } else {
                        const lgTime = new Date(lg.updatedAt || 0).getTime();
                        const rgTime = new Date(rg.updatedAt || 0).getTime();
                        if (lgTime > rgTime) {
                            mergedGroups.push(lg);
                            groupsToPush.push(lg);
                        } else {
                            mergedGroups.push(rg);
                        }
                    }
                });
                localGroups.forEach(lg => {
                    if (!mergedGroups.some(g => g.id === lg.id)) {
                        mergedGroups.push(lg);
                        groupsToPush.push(lg);
                    }
                });
                mergedGroups.sort((a, b) => (a.position || 0) - (b.position || 0));

                // 3. Process Tasks
                let localTasks = [...AppState.tasks];
                let remoteTasks = (dbTasks || []).map(mapTaskFromDB);
                let mergedTasks = [];
                let tasksToPush = [];

                remoteTasks.forEach(rt => {
                    const lt = localTasks.find(t => t.id === rt.id);
                    if (!lt) {
                        mergedTasks.push(rt);
                    } else {
                        const ltTime = new Date(lt.updatedAt || 0).getTime();
                        const rtTime = new Date(rt.updatedAt || 0).getTime();
                        if (ltTime > rtTime) {
                            mergedTasks.push(lt);
                            tasksToPush.push(lt);
                        } else {
                            mergedTasks.push(rt);
                        }
                    }
                });
                localTasks.forEach(lt => {
                    if (!mergedTasks.some(t => t.id === lt.id)) {
                        mergedTasks.push(lt);
                        tasksToPush.push(lt);
                    }
                });

                // 4. Process Profile
                let remoteProfile = dbProfiles && dbProfiles[0];
                let profileToPush = null;
                if (remoteProfile) {
                    AppState.profileName = remoteProfile.display_name;
                    AppState.profileDP = remoteProfile.avatar_glyph;
                    AppState.counterTargetPolicy = remoteProfile.counter_policy;
                } else {
                    profileToPush = {
                        user_id: userId,
                        display_name: AppState.profileName,
                        avatar_glyph: AppState.profileDP,
                        counter_policy: AppState.counterTargetPolicy,
                        updated_at: new Date().toISOString()
                    };
                }

                AppState.projects = mergedProjects;
                AppState.groups = mergedGroups;
                AppState.tasks = mergedTasks;

                saveToLocalStorage();

                AppState.lastKnownState.projects = JSON.parse(JSON.stringify(mergedProjects));
                AppState.lastKnownState.groups = JSON.parse(JSON.stringify(mergedGroups));
                AppState.lastKnownState.tasks = JSON.parse(JSON.stringify(mergedTasks));
                AppState.lastKnownState.profile = {
                    name: AppState.profileName,
                    dp: AppState.profileDP,
                    counterPolicy: AppState.counterTargetPolicy
                };

                // Push local migrations/updates up to Supabase
                if (projectsToPush.length > 0) {
                    projectsToPush.forEach(p => {
                        queueSyncOperation('projects', 'upsert', p.id, mapProjectToDB(p));
                    });
                }
                if (groupsToPush.length > 0) {
                    groupsToPush.forEach(g => {
                        const idx = mergedGroups.findIndex(mg => mg.id === g.id);
                        queueSyncOperation('groups', 'upsert', g.id, mapGroupToDB(g, idx));
                    });
                }
                if (tasksToPush.length > 0) {
                    tasksToPush.forEach(t => {
                        queueSyncOperation('tasks', 'upsert', t.id, mapTaskToDB(t));
                    });
                }
                if (profileToPush) {
                    queueSyncOperation('profiles', 'upsert', userId, profileToPush);
                }

                await processSyncQueue();
                
                renderTaskFeed();
                updateGlobalBadges();
                syncProfileUIElements();
                if (AppState.selectedTaskId) {
                    renderInspector();
                }
                
                showToast('Sync Complete', 'Data synchronization successfully completed.');
            } catch (err) {
                console.error("Error during initial data sync:", err);
                updateSyncStatusUI('error');
            }
        }

        let realtimeSubscription = null;

        function subscribeToRealtimeSync() {
            if (!supabaseClient || !AppState.session) return;
            
            if (realtimeSubscription) {
                supabaseClient.removeChannel(realtimeSubscription);
            }
            
            const userId = AppState.session.user.id;
            
            realtimeSubscription = supabaseClient.channel('realtime-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, handleRealtimeTaskChange)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${userId}` }, handleRealtimeProjectChange)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'groups', filter: `user_id=eq.${userId}` }, handleRealtimeGroupChange)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` }, handleRealtimeProfileChange)
                .subscribe();
        }

        function handleRealtimeTaskChange(payload) {
            if (payload.eventType === 'DELETE') {
                const targetId = payload.old.id;
                if (AppState.tasks.some(t => t.id === targetId)) {
                    AppState.tasks = AppState.tasks.filter(t => t.id !== targetId);
                    AppState.lastKnownState.tasks = AppState.lastKnownState.tasks.filter(t => t.id !== targetId);
                    saveToLocalStorage();
                    renderTaskFeed();
                    updateGlobalBadges();
                    if (AppState.selectedTaskId === targetId) {
                        closeInspector();
                    }
                }
            } else {
                const task = mapTaskFromDB(payload.new);
                const localIdx = AppState.tasks.findIndex(t => t.id === task.id);
                if (localIdx === -1) {
                    AppState.tasks.push(task);
                    AppState.lastKnownState.tasks.push(JSON.parse(JSON.stringify(task)));
                    saveToLocalStorage();
                    renderTaskFeed();
                    updateGlobalBadges();
                } else {
                    const local = AppState.tasks[localIdx];
                    const localTime = new Date(local.updatedAt || 0).getTime();
                    const remoteTime = new Date(task.updatedAt || 0).getTime();
                    if (remoteTime > localTime) {
                        AppState.tasks[localIdx] = task;
                        const lastIdx = AppState.lastKnownState.tasks.findIndex(t => t.id === task.id);
                        if (lastIdx !== -1) {
                            AppState.lastKnownState.tasks[lastIdx] = JSON.parse(JSON.stringify(task));
                        } else {
                            AppState.lastKnownState.tasks.push(JSON.parse(JSON.stringify(task)));
                        }
                        saveToLocalStorage();
                        renderTaskFeed();
                        updateGlobalBadges();
                        if (AppState.selectedTaskId === task.id) {
                            renderInspector();
                        }
                    }
                }
            }
        }

        function handleRealtimeProjectChange(payload) {
            if (payload.eventType === 'DELETE') {
                const targetId = payload.old.id;
                if (AppState.projects.some(p => p.id === targetId)) {
                    AppState.projects = AppState.projects.filter(p => p.id !== targetId);
                    AppState.lastKnownState.projects = AppState.lastKnownState.projects.filter(p => p.id !== targetId);
                    saveToLocalStorage();
                    renderTaskFeed();
                }
            } else {
                const proj = mapProjectFromDB(payload.new);
                const localIdx = AppState.projects.findIndex(p => p.id === proj.id);
                if (localIdx === -1) {
                    AppState.projects.push(proj);
                    AppState.lastKnownState.projects.push(JSON.parse(JSON.stringify(proj)));
                    saveToLocalStorage();
                    renderTaskFeed();
                } else {
                    const local = AppState.projects[localIdx];
                    const localTime = new Date(local.updatedAt || 0).getTime();
                    const remoteTime = new Date(proj.updatedAt || 0).getTime();
                    if (remoteTime > localTime) {
                        AppState.projects[localIdx] = proj;
                        const lastIdx = AppState.lastKnownState.projects.findIndex(p => p.id === proj.id);
                        if (lastIdx !== -1) {
                            AppState.lastKnownState.projects[lastIdx] = JSON.parse(JSON.stringify(proj));
                        }
                        saveToLocalStorage();
                        renderTaskFeed();
                    }
                }
            }
        }

        function handleRealtimeGroupChange(payload) {
            if (payload.eventType === 'DELETE') {
                const targetId = payload.old.id;
                if (AppState.groups.some(g => g.id === targetId)) {
                    AppState.groups = AppState.groups.filter(g => g.id !== targetId);
                    AppState.lastKnownState.groups = AppState.lastKnownState.groups.filter(g => g.id !== targetId);
                    saveToLocalStorage();
                    renderTaskFeed();
                }
            } else {
                const group = mapGroupFromDB(payload.new);
                const localIdx = AppState.groups.findIndex(g => g.id === group.id);
                if (localIdx === -1) {
                    AppState.groups.push(group);
                    AppState.lastKnownState.groups.push(JSON.parse(JSON.stringify(group)));
                    AppState.groups.sort((a, b) => (a.position || 0) - (b.position || 0));
                    AppState.lastKnownState.groups.sort((a, b) => (a.position || 0) - (b.position || 0));
                    saveToLocalStorage();
                    renderTaskFeed();
                } else {
                    const local = AppState.groups[localIdx];
                    const localTime = new Date(local.updatedAt || 0).getTime();
                    const remoteTime = new Date(group.updatedAt || 0).getTime();
                    if (remoteTime > localTime) {
                        AppState.groups[localIdx] = group;
                        const lastIdx = AppState.lastKnownState.groups.findIndex(g => g.id === group.id);
                        if (lastIdx !== -1) {
                            AppState.lastKnownState.groups[lastIdx] = JSON.parse(JSON.stringify(group));
                        }
                        AppState.groups.sort((a, b) => (a.position || 0) - (b.position || 0));
                        AppState.lastKnownState.groups.sort((a, b) => (a.position || 0) - (b.position || 0));
                        saveToLocalStorage();
                        renderTaskFeed();
                    }
                }
            }
        }

        function handleRealtimeProfileChange(payload) {
            if (payload.eventType !== 'DELETE') {
                const remoteProfile = payload.new;
                const localTime = new Date(AppState.lastKnownState.profile.updatedAt || 0).getTime();
                const remoteTime = new Date(remoteProfile.updated_at || 0).getTime();
                
                if (remoteTime > localTime) {
                    AppState.profileName = remoteProfile.display_name;
                    AppState.profileDP = remoteProfile.avatar_glyph;
                    AppState.counterTargetPolicy = remoteProfile.counter_policy;
                    
                    AppState.lastKnownState.profile = {
                        name: remoteProfile.display_name,
                        dp: remoteProfile.avatar_glyph,
                        counterPolicy: remoteProfile.counter_policy,
                        updatedAt: remoteProfile.updated_at
                    };
                    
                    saveToLocalStorage();
                    syncProfileUIElements();
                    updateGlobalBadges();
                }
            }
        }

        function executeGoogleLogin() {
            if (supabaseClient) {
                supabaseClient.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin + window.location.pathname
                    }
                });
            } else {
                showToast('Configuration Error', 'Supabase URL/Key placeholders are not configured yet.');
            }
        }

        async function executeLogoutAction() {
            localStorage.removeItem('ANV_GUEST_MODE');
            if (supabaseClient && AppState.session) {
                const { error } = await supabaseClient.auth.signOut();
                if (error) {
                    console.error("Supabase signOut error:", error);
                }
            }
            clearLocalState();
            document.getElementById('auth-guard-screen').classList.remove('hidden');
            showToast('Session Closed', 'Session ended successfully.');
        }

        function openProfileCustomizerModal() {
            const backdrop = document.getElementById('profile-customizer-backdrop');
            const container = document.getElementById('profile-customizer-container');
            
            document.getElementById('profile-customizer-name-field').value = AppState.profileName;
            
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
            dismissOverlay(backdrop, container, null, 150);
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

        function toggleMobileSearchBar() {
            const container = document.getElementById('mobile-search-bar-container');
            if (container) {
                container.classList.toggle('hidden');
                if (!container.classList.contains('hidden')) {
                    const input = document.getElementById('mobile-search-input');
                    if (input) input.focus();
                }
            }
        }

        function handleManageStudioContextMenu(event) {
            event.preventDefault();
            event.stopPropagation();
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

            if (sidebarResizer) {
                sidebarResizer.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    sidebarResizer.classList.add('active');
                    document.addEventListener('mousemove', resizeSidebar);
                    document.addEventListener('mouseup', stopResizeSidebar);
                });
            }

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

            if (inspectorResizer) {
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
        }

        function togglePinTaskToSidebar(taskId) {
            if (!AppState.pinnedTaskIds) AppState.pinnedTaskIds = [];
            const idx = AppState.pinnedTaskIds.indexOf(taskId);
            const task = AppState.tasks.find(t => t.id === taskId);
            if (idx > -1) {
                AppState.pinnedTaskIds.splice(idx, 1);
                showToast('Removed from Sidebar', task ? `"${task.title}" removed from pinned sidebar items.` : 'Task unpinned.');
            } else {
                AppState.pinnedTaskIds.push(taskId);
                showToast('Added to Sidebar', task ? `"${task.title}" pinned directly to sidebar.` : 'Task pinned.');
            }
            syncDeviceDataChannels();
            updateGlobalBadges();
            hideContextMenu();
        }
        window.togglePinTaskToSidebar = togglePinTaskToSidebar;

        function updateGlobalBadges() {
            const todayStr = getTodayDateString();
            const inboxCount = AppState.tasks.filter(t => !t.done).length;
            const todayCount = AppState.tasks.filter(t => !t.done && t.dueDate === todayStr).length;
            
            const badgeInbox = document.getElementById('badge-inbox');
            if (badgeInbox) badgeInbox.textContent = inboxCount;
            const badgeToday = document.getElementById('badge-today');
            if (badgeToday) badgeToday.textContent = todayCount;

            const activeTabBadge = document.getElementById('active-tab-badge');
            if (activeTabBadge) {
                let currentCount = 0;
                if (AppState.counterTargetPolicy === 'subtasks') {
                    AppState.tasks.forEach(t => {
                        if (!t.done && t.subtasks) {
                            currentCount += t.subtasks.filter(s => !s.done).length;
                        }
                    });
                    activeTabBadge.textContent = `${currentCount} subtasks`;
                } else {
                    currentCount = getFilteredTasks().length;
                    activeTabBadge.textContent = `${currentCount} items`;
                }
            }

            renderProjectsList();
            renderSidebarPinnedTasks();
        }

        function renderSidebarPinnedTasks() {
            const section = document.getElementById('sidebar-pinned-tasks-section');
            const container = document.getElementById('sidebar-pinned-tasks-list');
            const badge = document.getElementById('badge-pinned-count');
            if (!section || !container) return;

            if (!AppState.pinnedTaskIds) AppState.pinnedTaskIds = [];

            // Filter pinned tasks that are active (disappear when done)
            const pinnedTasks = AppState.tasks.filter(t => AppState.pinnedTaskIds.includes(t.id) && !t.done);

            if (pinnedTasks.length === 0) {
                section.classList.add('hidden');
                return;
            }

            section.classList.remove('hidden');
            if (badge) badge.textContent = pinnedTasks.length;
            container.innerHTML = '';

            pinnedTasks.forEach(task => {
                const btn = document.createElement('div');
                btn.className = `w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-xs font-semibold text-left hover:bg-white/5 relative group cursor-pointer ${AppState.selectedTaskId === task.id ? 'bg-white/10 text-white' : 'text-gray-300'}`;
                btn.onclick = (e) => {
                    if (e.target.closest('.sidebar-task-checkbox') || e.target.closest('.sidebar-unpin-btn')) return;
                    selectTask(task.id, e);
                };
                
                const accentColor = task.color || '#2997ff';

                btn.innerHTML = `
                    <div class="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                        <button type="button" onclick="toggleTaskDone('${task.id}', event)" class="sidebar-task-checkbox w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${task.done ? 'bg-[#2997ff] border-[#2997ff]' : 'border-white/30 hover:border-white/60 bg-white/5'}" style="${task.done ? '' : `border-color: ${accentColor}80;`}" title="${task.done ? 'Mark incomplete' : 'Mark complete'}">
                            ${task.done ? `<i data-lucide="check" class="w-3 h-3 text-[#0a0a0a] font-extrabold stroke-[3]"></i>` : ''}
                        </button>
                        <span class="truncate text-xs font-medium ${task.done ? 'line-through text-gray-500' : 'text-gray-200'}">${escapeHTML(task.title)}</span>
                    </div>
                    <button type="button" onclick="togglePinTaskToSidebar('${task.id}', event)" class="sidebar-unpin-btn p-1 text-amber-400/70 hover:text-amber-300 hover:bg-white/10 rounded-md transition flex-shrink-0" title="Unpin from sidebar">
                        <i data-lucide="pin" class="w-3 h-3"></i>
                    </button>
                `;
                container.appendChild(btn);
            });
            if (window.lucide) window.lucide.createIcons();
        }

        function renderProjectsList() {
            const container = document.getElementById('projects-list-container');
            if (!container) return;

            container.innerHTML = '';
            AppState.projects.forEach(project => {
                const count = AppState.tasks.filter(t => !t.done && t.projectId === project.id).length;
                const isSelected = AppState.currentTab === project.id;
                
                const btn = document.createElement('button');
                btn.onclick = () => switchTab(project.id);
                btn.oncontextmenu = (e) => openEditProjectModal(project.id, e);
                btn.className = `w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-xs font-semibold text-left hover:bg-white/5 relative group ${isSelected ? 'bg-white/10 text-white' : 'text-gray-300'}`;
                
                btn.innerHTML = `
                    <span class="flex items-center space-x-2.5 min-w-0">
                        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${project.color || '#FF3B30'};"></span>
                        <i data-lucide="${project.icon || 'smile'}" class="w-3.5 h-3.5 flex-shrink-0 text-gray-400 group-hover:text-white transition"></i>
                        <span class="truncate text-xs font-medium">${escapeHTML(project.title)}</span>
                    </span>
                    <span class="ui-badge font-mono text-[9px]" data-variant="secondary">${count}</span>
                `;
                container.appendChild(btn);
            });
            if (window.lucide) window.lucide.createIcons();
        }

        function switchTab(tabId) {
            AppState.currentTab = tabId;
            renderTaskFeed();
            updateGlobalBadges();

            if (window.innerWidth < 768 && !AppState.sidebarCollapsed) {
                toggleSidebarCollapse();
            }
        }

        function toggleSidebarCollapse() {
            const sidebar = document.getElementById('sidebar-panel');
            const resizer = document.getElementById('sidebar-resizer');
            const sidebarBackdrop = document.getElementById('mobile-sidebar-backdrop') || document.getElementById('sidebar-touch-overlay');

            if (!sidebar) return;

            if (AppState.sidebarCollapsed) {
                sidebar.style.width = '280px';
                if (resizer) resizer.style.display = 'block';
                AppState.sidebarCollapsed = false;
            } else {
                sidebar.style.width = '0px';
                if (resizer) resizer.style.display = 'none';
                if (sidebarBackdrop) {
                    dismissOverlay(sidebarBackdrop, null, null, 150);
                }
                const extraBackdrop = document.getElementById('mobile-sidebar-backdrop');
                if (extraBackdrop && extraBackdrop !== sidebarBackdrop) {
                    dismissOverlay(extraBackdrop, null, null, 150);
                }
                AppState.sidebarCollapsed = true;
            }
        }

        function getFilteredTasks() {
            let list = [...AppState.tasks];
            const todayStr = getTodayDateString();

            if (AppState.currentTab === 'search') {
                if (!AppState.searchQuery.trim()) return [];
                const q = AppState.searchQuery.toLowerCase();
                return list.filter(t => !t.done && (t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))));
            }

            if (AppState.currentTab === 'inbox') {
                return list.filter(t => !t.done);
            } else if (AppState.currentTab === 'today') {
                return list.filter(t => !t.done && t.dueDate === todayStr);
            } else if (AppState.currentTab === 'done') {
                return list.filter(t => t.done);
            } else if (AppState.currentTab === 'manage') {
                return list;
            } else {
                return list.filter(t => !t.done && t.projectId === AppState.currentTab);
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
                const elPercent = document.getElementById('streak-tasks-percentage');
                const elFill = document.getElementById('streak-progress-fill');
                if (elPercent) elPercent.textContent = `${percent}%`;
                if (elFill) elFill.style.width = `${percent}%`;
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

            const elDone = document.getElementById('streak-tasks-done');
            const elTotal = document.getElementById('streak-tasks-total');
            const elPercent = document.getElementById('streak-tasks-percentage');
            const elFill = document.getElementById('streak-progress-fill');

            if (elDone) elDone.textContent = completedCount;
            if (elTotal) elTotal.textContent = totalCount;
            if (elPercent) elPercent.textContent = `${percent}%`;
            if (elFill) elFill.style.width = `${percent}%`;

            if (window.lucide) lucide.createIcons();
        }

        function renderTaskFeed() {
            const container = document.getElementById('tasks-list');
            const emptyScreen = document.getElementById('empty-state-screen');
            if (!container) return;

            const clearDoneBtn = document.getElementById('clear-done-archive-btn');
            if (clearDoneBtn) {
                if (AppState.currentTab === 'done' && AppState.tasks.some(t => t.done)) {
                    clearDoneBtn.classList.remove('hidden');
                } else {
                    clearDoneBtn.classList.add('hidden');
                }
            }

            const mobileActionHeader = document.getElementById('mobile-action-section-header');
            const mobileSearchContainer = document.getElementById('mobile-search-bar-container');

            if (AppState.currentTab === 'manage') {
                if (mobileActionHeader) mobileActionHeader.classList.add('hidden');
                if (mobileSearchContainer) mobileSearchContainer.classList.add('hidden');
                renderManageDashboard();
                return;
            } else {
                if (mobileActionHeader) mobileActionHeader.classList.remove('hidden');
            }

            const filtered = getFilteredTasks();
            const sorted = sortTasks(filtered);

            const feedTitle = document.getElementById('feed-current-title');
            if (feedTitle) {
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
            }

            container.innerHTML = '';

            if (AppState.currentTab === 'done') {
                const infoBanner = document.createElement('div');
                infoBanner.className = "mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center space-x-3 text-xs text-blue-300";
                infoBanner.innerHTML = `
                    <i data-lucide="info" class="w-4 h-4 text-[#2997ff] flex-shrink-0"></i>
                    <span>Completed tasks are automatically deleted after 27 days unless <strong>Auto-Delete Hold</strong> is applied.</span>
                `;
                container.appendChild(infoBanner);
            }

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
                    <button onclick="moveGroupColumn('${groupId}', -1, event)" class="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition" title="Move Left" ${index === 0 ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''}>
                        <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="moveGroupColumn('${groupId}', 1, event)" class="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition" title="Move Right" ${index === AppState.groups.length - 1 ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''}>
                        <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                    </button>
                `;
            }

            const group = AppState.groups.find(g => g.id === groupId);
            const isGroupHeld = group ? group.holdDeletion : false;

            groupSection.innerHTML = `
                <div class="flex items-center justify-between border-b border-white/[0.04] pb-2 cursor-pointer select-none" 
                     style="border-bottom-color: ${groupColor}25"
                     oncontextmenu="showGroupContextMenu(event, '${groupId}')">
                     <div class="flex items-center space-x-2 min-w-0 flex-1 pr-2">
                         <span class="w-2.5 h-2.5 rounded bg-white/10 flex items-center justify-center border border-white/20 flex-shrink-0">
                             <span class="w-1.5 h-1.5 rounded-sm" style="background-color: ${groupColor}; box-shadow: 0 0 8px ${groupColor}80;"></span>
                         </span>
                         <i data-lucide="${groupIcon}" class="w-4 h-4 flex-shrink-0" style="color: ${groupColor};"></i>
                         <span class="text-xs font-bold text-white uppercase tracking-wider truncate min-w-0 max-w-[200px] sm:max-w-none">${escapeHTML(title)}</span>
                         ${isGroupHeld && AppState.currentTab === 'done' ? `
                             <span class="inline-flex items-center px-1.5 py-0.5 bg-[#2997ff]/10 text-[#2997ff] rounded text-[8px] font-bold border border-[#2997ff]/20 flex-shrink-0" title="${group.holdUntil ? 'Column auto-delete held until ' + new Date(group.holdUntil).toLocaleString() : 'Column auto-delete held indefinitely'}">
                                 <i data-lucide="lock" class="w-2.5 h-2.5 flex-shrink-0 mr-0.5"></i>
                                 <span>Deletion Held</span>
                             </span>
                         ` : ''}
                         <span class="bg-white/10 text-white text-[10px] px-2 py-0.5 rounded-full font-mono flex-shrink-0">${tasks.length}</span>
                     </div>
                     <div class="flex items-center space-x-1">
                         <div class="ui-button-group border border-white/10 bg-white/[0.03] rounded-full p-0.5 flex items-center">
                             ${navigationButtons}
                             ${!isUngrouped && AppState.groups.length > 1 ? `<div class="ui-button-group-separator w-[1px] h-3 bg-white/10 mx-0.5"></div>` : ''}
                             ${!isUngrouped ? `
                                 <button onclick="openEditGroupModalTriggerFromId('${groupId}', event)" class="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition" title="Edit Group Column">
                                     <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                                 </button>
                                 <div class="ui-button-group-separator w-[1px] h-3 bg-white/10 mx-0.5"></div>
                                 <button onclick="handleDeleteGroup('${groupId}')" class="p-1 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-full transition" title="Delete Group Column">
                                     <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                 </button>
                             ` : ''}
                         </div>
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
                    if (cardIndex > 0) {
                        const sep = document.createElement('div');
                        sep.className = 'ui-separator my-2.5';
                        sep.setAttribute('data-orientation', 'horizontal');
                        cardsContainer.appendChild(sep);
                    }
                    const project = AppState.projects.find(p => p.id === task.projectId);
                    const subDone = task.subtasks ? task.subtasks.filter(s => s.done).length : 0;
                    const subTotal = task.subtasks ? task.subtasks.length : 0;
                    
                    const isSelected = AppState.selectedTaskId === task.id || (AppState.selectedTaskIds && AppState.selectedTaskIds.includes(task.id));

                    const accentColor = task.done ? '#7a7a7a' : (task.color || '#2997ff');
                    let cardBg = 'bg-[#121212] border-white/[0.02]';
                    let textClass = 'text-white font-bold';
                    let subtextClass = 'text-gray-400';

                    if (task.done) {
                        cardBg = 'bg-transparent border-none opacity-100';
                        textClass = 'line-through text-gray-500 font-normal';
                        subtextClass = 'text-gray-600';
                    } else if (task.isHeldTask) {
                        cardBg = 'bg-transparent border-none opacity-100';
                        textClass = 'text-gray-300 font-semibold';
                        subtextClass = 'text-gray-500';
                    }

                    let subtasksHTML = '';
                    if (task.subtasks && task.subtasks.length > 0) {
                        subtasksHTML = `
                            <div class="mt-2.5 pt-1.5 space-y-1 pl-1">
                                ${task.subtasks.map((s, si) => {
                                    const subtaskAccent = task.done ? '#7a7a7a' : accentColor;
                                    const subBorderColor = `border-color: ${subtaskAccent};`;
                                    const subBgColor = s.done ? `background-color: ${subtaskAccent};` : `background-color: transparent;`;
                                    return `
                                        <div class="subtask-thread-item flex items-center space-x-2.5 px-1 py-0.5 rounded hover:bg-white/[0.03] transition">
                                            <div class="subtask-thread-track" style="border-color: rgba(255,255,255,0.10);"></div>
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
                    card.className = `group-card relative py-2.5 px-3 rounded-xl transition duration-150 hover:bg-white/[0.02] ${isSelected ? 'ring-1 ring-[#2997ff]/60 bg-white/[0.03]' : ''}`;
                    card.style.cssText = "background: transparent !important; border: none !important; box-shadow: none !important; opacity: 1 !important;";
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
                                        <span class="ui-badge" style="background-color: ${task.done ? 'rgba(255,255,255,0.04)' : accentColor + '20'}; color: ${task.done ? '#6b7280' : accentColor}; border-color: ${task.done ? 'rgba(255,255,255,0.06)' : accentColor + '30'};">
                                            <i data-lucide="check" class="w-2.5 h-2.5"></i>
                                            <span>Priority</span>
                                        </span>

                                        ${project ? `
                                            <span class="ui-badge" style="background-color: ${task.done ? 'rgba(255,255,255,0.04)' : (project.color + '20')}; color: ${task.done ? '#6b7280' : project.color}; border-color: ${task.done ? 'rgba(255,255,255,0.06)' : (project.color + '30')};">
                                                <i data-lucide="${project.icon}" class="w-2.5 h-2.5 flex-shrink-0"></i>
                                                <span>${escapeHTML(project.title)}</span>
                                            </span>
                                        ` : ''}
                                        ${task.dueDate ? `
                                            <span class="ui-badge" ${task.done ? 'style="background-color: rgba(255,255,255,0.04); color: #6b7280; border-color: rgba(255,255,255,0.06);"' : 'data-variant="secondary"'}>
                                                <i data-lucide="calendar" class="w-2.5 h-2.5 flex-shrink-0"></i>
                                                <span>${task.dueDate}</span>
                                            </span>
                                        ` : ''}
                                        ${subTotal > 0 ? `
                                            <span class="ui-badge" ${task.done ? 'style="background-color: rgba(255,255,255,0.04); color: #6b7280; border-color: rgba(255,255,255,0.06);"' : 'data-variant="secondary"'}>
                                                <i data-lucide="list-checks" class="w-2.5 h-2.5 flex-shrink-0"></i>
                                                <span>${subDone}/${subTotal}</span>
                                            </span>
                                        ` : ''}
                                        ${task.isHeldTask ? `
                                            <span class="ui-badge" style="${task.done ? 'background-color: rgba(255,255,255,0.04); color: #6b7280; border-color: rgba(255,255,255,0.06);' : 'background-color: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3);'}" title="Task is paused on hold">
                                                <i data-lucide="pause-circle" class="w-2.5 h-2.5 flex-shrink-0"></i>
                                                <span>Task On Hold</span>
                                            </span>
                                        ` : ''}
                                        ${isTaskOnHold(task) && AppState.currentTab === 'done' ? `
                                            <span class="ui-badge" data-variant="secondary" style="background-color: rgba(245, 158, 11, 0.2); color: #fcd34d; border-color: rgba(245, 158, 11, 0.4);" title="${task.holdUntil ? 'Auto-delete held until ' + new Date(task.holdUntil).toLocaleString() : 'Auto-delete held indefinitely'}">
                                                <i data-lucide="pause-circle" class="w-3 h-3 flex-shrink-0"></i>
                                                <span>Deletion Held</span>
                                            </span>
                                        ` : ''}
                                    </div>
                                    ${task.notes && task.notes.length > 0 ? `
                                        <div class="flex flex-col gap-1 mt-2">
                                            ${task.notes.map((n, idx) => {
                                                const rawText = n.text || '';
                                                const isLong = rawText.length > 30;
                                                const shortText = isLong ? rawText.substring(0, 30).trim() + '...' : rawText;
                                                return `
                                                    <div class="flex items-center space-x-1.5 max-w-full">
                                                        <span class="ui-badge w-fit max-w-full" style="${task.done ? 'background-color: rgba(255,255,255,0.04); color: #6b7280; border-color: rgba(255,255,255,0.06);' : 'background-color: rgba(234, 179, 8, 0.12); color: #facc15; border-color: rgba(234, 179, 8, 0.25);'}">
                                                            <i data-lucide="sticky-note" class="w-3 h-3 flex-shrink-0"></i>
                                                            <span class="truncate">${escapeHTML(shortText)}</span>
                                                        </span>
                                                        ${isLong ? `
                                                            <button type="button" onclick="openNoteModal('${task.id}', ${idx}, event)" class="ui-badge hover:bg-[#2997ff]/20 hover:text-white transition cursor-pointer" style="background-color: rgba(41, 151, 255, 0.12); color: #2997ff; border-color: rgba(41, 151, 255, 0.25);">
                                                                <span>(...more)</span>
                                                            </button>
                                                        ` : ''}
                                                    </div>
                                                `;
                                            }).join('')}
                                        </div>
                                    ` : ''}
                                    ${subtasksHTML}
                                </div>
                            </div>
                            <div class="flex items-center space-x-2 flex-shrink-0 ml-1">
                                ${task.done && task.completedAt && !isTaskOnHold(task) ? (() => {
                                    const completedMs = new Date(task.completedAt).getTime();
                                    const totalLifespan = 27 * 24 * 60 * 60 * 1000;
                                    const diffMs = Math.max(0, (completedMs + totalLifespan) - Date.now());
                                    const daysLeft = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                                    const hoursLeft = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                                    const text = daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h left` : `${hoursLeft}h left`;
                                    return `
                                        <span class="ui-badge" data-variant="destructive" title="Deletes automatically in ${daysLeft} days, ${hoursLeft} hours">
                                            <i data-lucide="timer" class="w-3 h-3 flex-shrink-0"></i>
                                            <span>${text}</span>
                                        </span>
                                    `;
                                })() : ''}
                                <div class="flex flex-col items-center space-y-0.5 text-gray-500 flex-shrink-0">
                                    <button onclick="moveTaskInGroup('${task.id}', -1, event)" class="p-0.5 hover:text-white transition" ${cardIndex === 0 ? 'disabled style="opacity: 0.2; cursor: not-allowed;"' : ''} title="Move Up">
                                        <i data-lucide="chevron-up" class="w-3.5 h-3.5"></i>
                                    </button>
                                    <button onclick="moveTaskInGroup('${task.id}', 1, event)" class="p-0.5 hover:text-white transition" ${cardIndex === tasks.length - 1 ? 'disabled style="opacity: 0.2; cursor: not-allowed;"' : ''} title="Move Down">
                                        <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
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

                    <div class="bg-[#121212] p-6 rounded-2xl border border-white/[0.06] flex flex-col justify-between md:col-span-2 space-y-5 shadow-lg">
                        <div>
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center space-x-2.5">
                                    <span class="p-2 rounded-xl bg-[#2997ff]/10 text-[#2997ff] border border-[#2997ff]/20"><i data-lucide="database" class="w-4 h-4"></i></span>
                                    <div>
                                        <h4 class="text-xs font-extrabold text-white uppercase tracking-wider">Automated Studio Backups</h4>
                                        <p class="text-[11px] text-gray-400 mt-0.5 leading-relaxed">Full system snapshots captured automatically every 5 days with rolling rotation.</p>
                                    </div>
                                </div>
                                <span class="bg-[#2997ff]/10 text-[#2997ff] text-[10px] font-mono font-bold px-3 py-1 rounded-full border border-[#2997ff]/20 flex-shrink-0">Auto-Rolling</span>
                            </div>

                            <div class="space-y-2 max-h-60 overflow-y-auto pr-1 my-4" id="auto-backups-list">
                                ${(() => {
                                    let backups = [];
                                    try { backups = JSON.parse(localStorage.getItem('ANV_5DAY_SNAPSHOTS') || '[]'); } catch(e) {}
                                    if (backups.length === 0) {
                                        return `<div class="text-center py-6 text-xs text-gray-600 border border-dashed border-white/5 rounded-xl">No 5-day auto snapshots captured yet.</div>`;
                                    }
                                    return backups.map((b, idx) => `
                                        <div onclick="previewBackupSnapshot(${idx})" class="flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] p-3.5 rounded-xl text-xs transition border border-white/5 gap-3 cursor-pointer group">
                                            <div class="flex items-center space-x-3 min-w-0 flex-1">
                                                <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 group-hover:scale-105 transition">
                                                    <i data-lucide="archive" class="w-4 h-4"></i>
                                                </div>
                                                <div class="min-w-0 flex-1">
                                                    <div class="text-white font-bold truncate text-xs group-hover:text-[#2997ff] transition flex items-center space-x-1.5">
                                                        <span>${escapeHTML(b.label || '5-Day Full Backup Snapshot')}</span>
                                                        <i data-lucide="eye" class="w-3.5 h-3.5 text-gray-500"></i>
                                                    </div>
                                                    <div class="text-[10px] text-gray-400 font-mono mt-0.5 flex items-center space-x-2">
                                                        <span>${new Date(b.timestamp).toLocaleString()}</span>
                                                        <span>•</span>
                                                        <span class="text-[#2997ff] font-semibold">${b.taskCount || 0} Tasks</span>
                                                        <span>•</span>
                                                        <span class="text-purple-400 font-semibold">${b.groupCount || 0} Groups</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="flex items-center space-x-2 flex-shrink-0">
                                                <button onclick="event.stopPropagation(); restoreAutoSnapshot(${idx});" class="btn-scale bg-[#2997ff]/15 hover:bg-[#2997ff] text-[#2997ff] hover:text-black font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center space-x-1 border border-[#2997ff]/30">
                                                    <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                                                    <span>Restore</span>
                                                </button>
                                                <button onclick="event.stopPropagation(); deleteAutoSnapshot(${idx});" class="btn-scale p-1.5 bg-red-500/10 hover:bg-red-500/25 text-red-400 rounded-xl transition" title="Delete Snapshot">
                                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                                </button>
                                            </div>
                                        </div>
                                    `).join('');
                                })()}
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
                            <button onclick="triggerManualSnapshot()" class="btn-scale py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 transition flex items-center justify-center space-x-2">
                                <i data-lucide="camera" class="w-4 h-4 text-[#2997ff]"></i>
                                <span>Capture Snapshot Now</span>
                            </button>
                            <button onclick="triggerImport()" class="btn-scale py-3 bg-[#2997ff] hover:bg-[#0066cc] text-black hover:text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center space-x-2 shadow-md">
                                <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                                <span>Import Previous Backup File</span>
                            </button>
                        </div>
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
                    <button onclick="triggerMultiTaskHold()" class="w-full text-left px-4 py-2 hover:bg-white/5 hover:text-white transition flex items-center space-x-2">
                        <i data-lucide="lock" class="w-3.5 h-3.5 text-[#2997ff]"></i>
                        <span>Hold Auto-Delete</span>
                    </button>
                    <button onclick="clearMultiTaskHold()" class="w-full text-left px-4 py-2 hover:bg-white/5 hover:text-white transition flex items-center space-x-2">
                        <i data-lucide="unlock" class="w-3.5 h-3.5"></i>
                        <span>Unhold Auto-Delete</span>
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
                const task = AppState.tasks.find(t => t.id === taskId);
                const isDoneView = (AppState.currentTab === 'done');
                const isHeld = isDoneView ? (task ? task.holdDeletion : false) : (task ? !!task.isHeldTask : false);
                const isPinned = AppState.pinnedTaskIds && AppState.pinnedTaskIds.includes(taskId);
                
                let holdLabel = 'Hold Task';
                let holdIcon = isHeld ? 'play-circle' : 'pause-circle';
                let holdColorClass = 'text-amber-400';
                
                if (isDoneView) {
                    holdLabel = isHeld ? 'Unhold Auto-Delete' : 'Hold Auto-Delete';
                } else {
                    holdLabel = isHeld ? 'Resume Task' : 'Hold Task';
                }

                menu.innerHTML = `
                    <button onmouseenter="hideGroupSubmenu()" onclick="contextToggleComplete()" class="ui-menu-item">
                        <span>Toggle Complete</span>
                        <i data-lucide="check" class="w-4 h-4 text-gray-400"></i>
                    </button>
                    <button onmouseenter="hideGroupSubmenu()" onclick="togglePinTaskToSidebar('${taskId}')" class="ui-menu-item">
                        <span>${isPinned ? 'Remove from sidebar' : 'Add to sidebar'}</span>
                        <i data-lucide="sidebar" class="w-4 h-4 text-amber-400"></i>
                    </button>
                    <button onmouseenter="hideGroupSubmenu()" onclick="handleUnifiedHoldAction()" class="ui-menu-item">
                        <span>${holdLabel}</span>
                        <i data-lucide="${holdIcon}" class="w-4 h-4 ${holdColorClass}"></i>
                    </button>
                    <button onmouseenter="hideGroupSubmenu()" onclick="contextOpenDetails()" class="ui-menu-item">
                        <span>Edit Specifications</span>
                        <i data-lucide="sliders" class="w-4 h-4 text-gray-400"></i>
                    </button>
                    <div class="ui-separator my-1" data-orientation="horizontal"></div>
                    <button onmouseenter="showGroupSubmenu(event)" onclick="showGroupSubmenu(event)" class="ui-menu-item group">
                        <span>Move to group</span>
                        <i data-lucide="folder-output" class="w-4 h-4 text-gray-400 group-hover:text-white"></i>
                    </button>
                    <div class="ui-separator my-1" data-orientation="horizontal"></div>
                    <button onmouseenter="hideGroupSubmenu()" onclick="contextDeleteTask()" class="ui-menu-item" data-destructive="true">
                        <span>Delete Task</span>
                        <i data-lucide="trash-2" class="w-4 h-4 text-red-400"></i>
                    </button>
                `;
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
            hideGroupSubmenu();
        }

        function showGroupSubmenu(event) {
            if (event) event.stopPropagation();
            const submenu = document.getElementById('group-submenu');
            if (!submenu) return;

            let html = `
                <button onclick="contextMoveToGroup(null)" class="ui-menu-item">
                    <span class="truncate">No Group / Ungrouped</span>
                    <span class="w-2 h-2 rounded-full bg-gray-500 flex-shrink-0"></span>
                </button>
            `;

            AppState.groups.forEach(g => {
                const groupIconName = g.icon || 'list';
                const groupColor = g.color || '#2997ff';
                html += `
                    <button onclick="contextMoveToGroup('${g.id}')" class="ui-menu-item">
                        <span class="truncate">${escapeHTML(g.title)}</span>
                        <div class="flex items-center space-x-1.5 flex-shrink-0">
                            <i data-lucide="${groupIconName}" class="w-3.5 h-3.5" style="color: ${groupColor};"></i>
                            <span class="w-2 h-2 rounded-full" style="background-color: ${groupColor}"></span>
                        </div>
                    </button>
                `;
            });

            submenu.innerHTML = html;
            lucide.createIcons();

            const triggerBtn = (event && event.currentTarget) || (event && event.target && event.target.closest('button'));
            const btnRect = triggerBtn ? triggerBtn.getBoundingClientRect() : { right: event.clientX, top: event.clientY, bottom: event.clientY + 30 };
            
            positionFloatingElement(submenu, {
                left: btnRect.right + 4,
                top: btnRect.top - 4,
                right: btnRect.right + 4,
                bottom: btnRect.bottom,
                width: 0,
                height: 0
            }, { margin: 2 });
        }

        function hideGroupSubmenu() {
            const submenu = document.getElementById('group-submenu');
            if (submenu) hideFloatingElement(submenu);
        }

        function toggleHoldTaskState() {
            hideContextMenu();
            const task = AppState.tasks.find(t => t.id === contextSelectedTaskId);
            if (task) {
                task.isHeldTask = !task.isHeldTask;
                syncDeviceDataChannels();
                renderTaskFeed();
                showToast(task.isHeldTask ? 'Task Placed on Hold' : 'Task Resumed', `"${task.title}" is ${task.isHeldTask ? 'now held on pause' : 'active again'}.`);
            }
        }

        function handleUnifiedHoldAction() {
            if (AppState.currentTab === 'done') {
                const task = AppState.tasks.find(t => t.id === contextSelectedTaskId);
                const isHeld = task ? task.holdDeletion : false;
                triggerTaskHold(isHeld);
            } else {
                toggleHoldTaskState();
            }
        }

        function showGroupContextMenu(event, groupId) {
            if (groupId === 'ungrouped') return; 
            event.preventDefault();
            event.stopPropagation();
            hideContextMenu();
            hideFeedContextMenu();

            contextSelectedGroupId = groupId;
            const menu = document.getElementById('group-context-menu');
            
            const group = AppState.groups.find(g => g.id === groupId);
            if (!group) return;
            
            const isHeld = group.holdDeletion || false;
            
            menu.innerHTML = `
                <button onclick="openEditGroupModalTrigger()" class="ui-menu-item">
                    <span>Edit Group settings</span>
                    <i data-lucide="edit" class="w-3.5 h-3.5"></i>
                </button>
                <div class="ui-separator my-1" data-orientation="horizontal"></div>
                <button onclick="triggerGroupHold(${isHeld})" class="ui-menu-item">
                    <span>${isHeld ? 'Unhold Auto-Delete' : 'Hold Auto-Delete'}</span>
                    <i data-lucide="${isHeld ? 'unlock' : 'lock'}" class="w-3.5 h-3.5 text-[#2997ff]"></i>
                </button>
                <div class="ui-separator my-1" data-orientation="horizontal"></div>
                <button onclick="contextDeleteGroupTrigger()" class="ui-menu-item" data-destructive="true">
                    <span>Delete Group Column</span>
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            `;
            
            lucide.createIcons();
            
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

        let holdTargetType = null;
        let holdTargetId = null;

        function triggerTaskHold(isHeld) {
            hideContextMenu();
            const task = AppState.tasks.find(t => t.id === contextSelectedTaskId);
            if (task) {
                task.holdDeletion = !isHeld;
                task.holdUntil = null;
                syncDeviceDataChannels();
                renderTaskFeed();
                showToast(task.holdDeletion ? 'Auto-Delete Held' : 'Auto-Delete Unheld', `Auto-deletion hold ${task.holdDeletion ? 'activated' : 'removed'} for "${task.title}".`);
            }
        }

        function triggerMultiTaskHold() {
            hideContextMenu();
            openHoldModal('multi-task', AppState.selectedTaskIds);
        }

        function clearMultiTaskHold() {
            hideContextMenu();
            if (AppState.selectedTaskIds && AppState.selectedTaskIds.length > 0) {
                AppState.tasks.forEach(t => {
                    if (AppState.selectedTaskIds.includes(t.id)) {
                        t.holdDeletion = false;
                        t.holdUntil = null;
                    }
                });
                syncDeviceDataChannels();
                renderTaskFeed();
                showToast('Auto-Delete Unheld', `Removed auto-deletion hold from ${AppState.selectedTaskIds.length} tasks.`);
            }
        }

        function triggerGroupHold(isHeld) {
            hideGroupContextMenu();
            if (isHeld) {
                const group = AppState.groups.find(g => g.id === contextSelectedGroupId);
                if (group) {
                    group.holdDeletion = false;
                    group.holdUntil = null;
                    syncDeviceDataChannels();
                    renderTaskFeed();
                    showToast('Auto-Delete Unheld', `Auto-deletion hold removed for Group column "${group.title}".`);
                }
            } else {
                openHoldModal('group', contextSelectedGroupId);
            }
        }

        function openHoldModal(type, targetId) {
            holdTargetType = type;
            holdTargetId = targetId;

            let titleText = "Configure Auto-Delete Hold";
            if (type === 'task') {
                const task = AppState.tasks.find(t => t.id === targetId);
                if (task) titleText = `Hold Deletion for "${task.title}"`;
            } else if (type === 'group') {
                const group = AppState.groups.find(g => g.id === targetId);
                if (group) titleText = `Hold Deletion for Group "${group.title}"`;
            } else if (type === 'multi-task') {
                titleText = `Hold Deletion for ${targetId.length} selected tasks`;
            }

            document.getElementById('hold-modal-title').textContent = titleText;
            document.getElementById('hold-indefinitely-checkbox').checked = true;
            document.getElementById('hold-until-input').value = "";
            document.getElementById('hold-until-container').classList.add('hidden');

            const backdrop = document.getElementById('hold-modal-backdrop');
            const container = document.getElementById('hold-modal-container');
            
            backdrop.classList.remove('hidden');
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                container.classList.remove('scale-95');
                lucide.createIcons();
            }, 10);
        }

        function closeHoldModal() {
            const backdrop = document.getElementById('hold-modal-backdrop');
            const container = document.getElementById('hold-modal-container');
            dismissOverlay(backdrop, container, () => {
                holdTargetType = null;
                holdTargetId = null;
            }, 150);
        }

        function toggleHoldUntilInput() {
            const checkbox = document.getElementById('hold-indefinitely-checkbox');
            const container = document.getElementById('hold-until-container');
            if (checkbox.checked) {
                container.classList.add('hidden');
            } else {
                container.classList.remove('hidden');
            }
        }

        function handleApplyHold(event) {
            if (event) event.preventDefault();
            
            const indefinite = document.getElementById('hold-indefinitely-checkbox').checked;
            const untilVal = document.getElementById('hold-until-input').value;
            
            let holdUntil = null;
            if (!indefinite && untilVal) {
                holdUntil = new Date(untilVal).toISOString();
            }

            if (holdTargetType === 'task') {
                const task = AppState.tasks.find(t => t.id === holdTargetId);
                if (task) {
                    task.holdDeletion = true;
                    task.holdUntil = holdUntil;
                    syncDeviceDataChannels();
                    renderTaskFeed();
                    showToast('Auto-Delete Held', `Auto-deletion hold set for "${task.title}".`);
                }
            } else if (holdTargetType === 'group') {
                const group = AppState.groups.find(g => g.id === holdTargetId);
                if (group) {
                    group.holdDeletion = true;
                    group.holdUntil = holdUntil;
                    syncDeviceDataChannels();
                    renderTaskFeed();
                    showToast('Auto-Delete Held', `Auto-deletion hold set for Group column "${group.title}".`);
                }
            } else if (holdTargetType === 'multi-task') {
                if (Array.isArray(holdTargetId)) {
                    AppState.tasks.forEach(t => {
                        if (holdTargetId.includes(t.id)) {
                            t.holdDeletion = true;
                            t.holdUntil = holdUntil;
                        }
                    });
                    syncDeviceDataChannels();
                    renderTaskFeed();
                    showToast('Auto-Delete Held', `Auto-deletion hold set for ${holdTargetId.length} tasks.`);
                }
            }

            closeHoldModal();
        }

        window.triggerTaskHold = triggerTaskHold;
        window.triggerMultiTaskHold = triggerMultiTaskHold;
        window.clearMultiTaskHold = clearMultiTaskHold;
        window.triggerGroupHold = triggerGroupHold;
        window.openHoldModal = openHoldModal;
        window.closeHoldModal = closeHoldModal;
        window.toggleHoldUntilInput = toggleHoldUntilInput;
        window.handleApplyHold = handleApplyHold;
        window.toggleHoldTaskState = toggleHoldTaskState;
        window.handleUnifiedHoldAction = handleUnifiedHoldAction;
        window.showGroupSubmenu = showGroupSubmenu;
        window.hideGroupSubmenu = hideGroupSubmenu;
        window.exportSingleTask = exportSingleTask;
        window.triggerManualSnapshot = triggerManualSnapshot;
        window.restoreAutoSnapshot = restoreAutoSnapshot;
        window.deleteAutoSnapshot = deleteAutoSnapshot;
        window.previewBackupSnapshot = previewBackupSnapshot;
        window.checkFiveDayAutoBackup = checkFiveDayAutoBackup;
        window.setTaskModalStep = setTaskModalStep;
        window.handleTaskModalNextStep = handleTaskModalNextStep;
        window.handleTaskModalBackStep = handleTaskModalBackStep;
        window.toggleTaskCustomizationPanel = toggleTaskCustomizationPanel;

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
            list.forEach(t => setTaskDone(t, true));
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
            const target = e ? e.target : null;
            if (target && typeof target.closest === 'function') {
                if (!target.closest('#custom-calendar-popup') && !target.closest('#ins-task-date-btn') && !target.closest('#new-task-date-btn')) {
                    closeCalendarPopup();
                }
                if (!target.closest('#sort-dropdown-wrapper') && 
                    !target.closest('#project-dropdown-container') && 
                    !target.closest('#ins-group-dropdown-container') && 
                    !target.closest('#ins-autodelete-dropdown-container') && 
                    !target.closest('#new-task-project-container') && 
                    !target.closest('#new-task-group-container') &&
                    !target.closest('#new-task-autodelete-container') &&
                    !target.closest('nav')) {
                    const allDropdowns = ['sort-dropdown-options', 'ins-project-dropdown-options', 'ins-group-dropdown-options', 'ins-autodelete-options', 'new-task-project-options', 'new-task-group-options', 'new-task-autodelete-options', 'nav-menu-dropdown-options'];
                    allDropdowns.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) hideFloatingElement(el);
                    });
                }
            }
            if (activeFloatingElement && activeFloatingElement.classList.contains('hidden')) {
                activeFloatingElement = null;
            }
        });

        function contextMultiToggleComplete(status) {
            if (AppState.selectedTaskIds && AppState.selectedTaskIds.length > 0) {
                AppState.tasks.forEach(t => {
                    if (AppState.selectedTaskIds.includes(t.id)) {
                        setTaskDone(t, status);
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
            
            const badgeInbox = document.getElementById('badge-inbox');
            if (badgeInbox) badgeInbox.textContent = AppState.tasks.filter(t => !t.done).length;
            const badgeToday = document.getElementById('badge-today');
            if (badgeToday) badgeToday.textContent = AppState.tasks.filter(t => t.dueDate === todayStr).length;
            const badgeDone = document.getElementById('badge-done');
            if (badgeDone) badgeDone.textContent = AppState.tasks.filter(t => t.done).length;

            const activeBadgePill = document.getElementById('active-tab-badge');
            const activeBadgePillMobile = document.getElementById('active-tab-badge-mobile');

            if (AppState.counterTargetPolicy === 'tasks') {
                const taskTally = AppState.tasks.filter(t => !t.done).length;
                if (activeBadgePill) {
                    activeBadgePill.textContent = `${taskTally} active tasks`;
                    activeBadgePill.className = "px-2.5 py-1 bg-blue-500/10 text-blue-400 text-[11px] font-semibold rounded-full border border-blue-500/20 transition-all duration-350 cursor-pointer select-none";
                }
                if (activeBadgePillMobile) {
                    activeBadgePillMobile.textContent = `${taskTally}`;
                    activeBadgePillMobile.className = "px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[11px] font-semibold rounded-full border border-blue-500/20 transition-all duration-350 cursor-pointer select-none min-w-[20px] text-center";
                }
            } else {
                let subtaskTally = 0;
                AppState.tasks.forEach(t => {
                    if (!t.done && t.subtasks) {
                        subtaskTally += t.subtasks.filter(s => !s.done).length;
                    }
                });
                if (activeBadgePill) {
                    activeBadgePill.textContent = `${subtaskTally} active subtasks`;
                    activeBadgePill.className = "px-2.5 py-1 bg-purple-500/10 text-purple-400 text-[11px] font-semibold rounded-full border border-purple-500/20 transition-all duration-350 cursor-pointer select-none";
                }
                if (activeBadgePillMobile) {
                    activeBadgePillMobile.textContent = `${subtaskTally}`;
                    activeBadgePillMobile.className = "px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[11px] font-semibold rounded-full border border-purple-500/20 transition-all duration-350 cursor-pointer select-none min-w-[20px] text-center";
                }
            }

            renderProjectsList();
            updateStreakCardMetrics();
        }

        function renderProjectsList() {
            const container = document.getElementById('projects-list-container');
            if (!container) return;
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



        function openAddTaskModal() {
            const backdrop = document.getElementById('task-modal-backdrop');
            const container = document.getElementById('task-modal-container');
            const panel = document.getElementById('new-task-customization-panel');
            
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
                AppState.tempCreateNotes = AppState.draftTask.notes || [];
                renderNewTaskNotesDraft();
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
                    panel.style.display = 'flex';
                    panel.style.width = '320px';
                    container.style.maxWidth = '760px';
                    const lbl = document.getElementById('btn-modal-step-label');
                    if (lbl) lbl.textContent = 'Collapse Styles';
                } else {
                    panel.style.display = 'none';
                    panel.style.width = '0px';
                    container.style.maxWidth = '440px';
                    const lbl = document.getElementById('btn-modal-step-label');
                    if (lbl) lbl.textContent = 'Customize';
                }
                
                AppState.draftTask = null; 
            } else {
                document.getElementById('new-task-title').value = '';
                document.getElementById('new-task-desc').value = '';
                AppState.tempCreateNotes = [];
                renderNewTaskNotesDraft();
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
                
                const customizationPanel = document.getElementById('new-task-customization-panel');
                if (customizationPanel) {
                    customizationPanel.style.display = 'none';
                    customizationPanel.style.width = '0px';
                }
                if (container) container.style.maxWidth = '440px';
                const stepLabel = document.getElementById('btn-modal-step-label');
                if (stepLabel) stepLabel.textContent = 'Customize';

                setTaskModalStep(1);
            }

            backdrop.classList.remove('hidden');
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                container.classList.remove('scale-95');
                lucide.createIcons();
            }, 10);
        }

        let currentTaskModalStep = 1;

        function toggleTaskCustomizationPanel() {
            const panel = document.getElementById('new-task-customization-panel');
            const container = document.getElementById('task-modal-container');
            const label = document.getElementById('btn-modal-step-label');

            if (!panel || !container) return;

            const isOpen = panel.style.display !== 'none' && panel.style.width !== '0px' && panel.style.width !== '';

            if (!isOpen) {
                // Open: show the panel and animate width
                panel.style.display = 'flex';
                panel.style.transition = 'width 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
                container.style.transition = 'max-width 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
                container.style.maxWidth = '760px';
                // Allow a frame for display:flex to take effect, then animate width
                requestAnimationFrame(() => {
                    panel.style.width = '320px';
                });
                if (label) label.textContent = 'Collapse Styles';
            } else {
                // Close: animate width back to 0 then hide
                panel.style.transition = 'width 0.22s cubic-bezier(0.32, 0.72, 0, 1)';
                container.style.transition = 'max-width 0.22s cubic-bezier(0.32, 0.72, 0, 1)';
                panel.style.width = '0px';
                container.style.maxWidth = '440px';
                setTimeout(() => {
                    panel.style.display = 'none';
                }, 230);
                if (label) label.textContent = 'Customize';
            }
        }

        function setTaskModalStep(step) {
            currentTaskModalStep = step;
            const titleEl = document.getElementById('task-modal-step-title');
            const backBtn = document.getElementById('task-modal-back-btn');
            const step1Fields = document.getElementById('task-modal-step-1-fields');
            const step2Color = document.getElementById('task-modal-step-2-color');
            const step2Icon = document.getElementById('task-modal-step-2-icon');
            const btnStep = document.getElementById('btn-modal-customization-step');
            const btnStepLabel = document.getElementById('btn-modal-step-label');

            const l1 = document.getElementById('step-line-1');
            const l2 = document.getElementById('step-line-2');
            const l3 = document.getElementById('step-line-3');

            if (window.innerWidth >= 768) {
                toggleTaskCustomizationPanel();
                return;
            }

            if (!step1Fields || !step2Color || !step2Icon) return;

            if (step === 1) {
                if (titleEl) titleEl.textContent = 'Create Task';
                if (backBtn) backBtn.classList.add('hidden');
                step1Fields.classList.remove('hidden');
                step2Color.classList.add('hidden');
                step2Icon.classList.add('hidden');
                if (btnStepLabel) btnStepLabel.textContent = 'Customize';
                if (btnStep) btnStep.setAttribute('onclick', 'handleTaskModalNextStep()');

                if (l1) l1.className = 'h-1 flex-1 bg-[#2997ff] rounded-full transition-all duration-200';
                if (l2) l2.className = 'h-1 flex-1 bg-white/10 rounded-full transition-all duration-200';
                if (l3) l3.className = 'h-1 flex-1 bg-white/10 rounded-full transition-all duration-200';
            } else if (step === 2) {
                if (titleEl) titleEl.textContent = 'Choose Priority Color';
                if (backBtn) backBtn.classList.remove('hidden');
                step1Fields.classList.add('hidden');
                step2Color.classList.remove('hidden');
                step2Icon.classList.add('hidden');
                if (btnStepLabel) btnStepLabel.textContent = 'Next: Choose Icon →';
                if (btnStep) btnStep.setAttribute('onclick', 'setTaskModalStep(3)');

                if (l1) l1.className = 'h-1 flex-1 bg-[#2997ff] rounded-full transition-all duration-200';
                if (l2) l2.className = 'h-1 flex-1 bg-[#2997ff] rounded-full transition-all duration-200';
                if (l3) l3.className = 'h-1 flex-1 bg-white/10 rounded-full transition-all duration-200';
                renderMobileColorGrid();
            } else if (step === 3) {
                if (titleEl) titleEl.textContent = 'Choose Icon Glyph';
                if (backBtn) backBtn.classList.remove('hidden');
                step1Fields.classList.add('hidden');
                step2Color.classList.add('hidden');
                step2Icon.classList.remove('hidden');
                if (btnStepLabel) btnStepLabel.textContent = '← Back to Color';
                if (btnStep) btnStep.setAttribute('onclick', 'setTaskModalStep(2)');

                if (l1) l1.className = 'h-1 flex-1 bg-[#2997ff] rounded-full transition-all duration-200';
                if (l2) l2.className = 'h-1 flex-1 bg-[#2997ff] rounded-full transition-all duration-200';
                if (l3) l3.className = 'h-1 flex-1 bg-[#2997ff] rounded-full transition-all duration-200';
                renderMobileIconGrid();
            }
            lucide.createIcons();
        }

        function handleTaskModalBackStep() {
            if (currentTaskModalStep === 3) setTaskModalStep(2);
            else if (currentTaskModalStep === 2) setTaskModalStep(1);
        }

        function handleTaskModalNextStep() {
            if (window.innerWidth >= 768) {
                toggleTaskCustomizationPanel();
            } else {
                setTaskModalStep(2);
            }
        }

        function renderMobileColorGrid() {
            const grid = document.getElementById('new-task-color-grid-mobile');
            if (!grid) return;
            grid.innerHTML = '';
            SYSTEM_COLORS.slice(0, 18).forEach(color => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `w-9 h-9 rounded-full flex items-center justify-center transition-all ${AppState.tempCreatePriority === color ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'}`;
                btn.style.backgroundColor = color;
                btn.onclick = () => {
                    selectCreatePriority(color);
                    renderMobileColorGrid();
                };
                grid.appendChild(btn);
            });
        }

        function renderMobileIconGrid() {
            const grid = document.getElementById('new-task-icon-grid-mobile');
            if (!grid) return;
            grid.innerHTML = '';
            SYSTEM_ICONS.slice(0, 18).forEach(icon => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `w-9 h-9 rounded-xl flex items-center justify-center transition-all ${AppState.tempCreateIcon === icon ? 'bg-white text-black scale-110' : 'bg-white/5 text-gray-400 hover:text-white'}`;
                btn.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4"></i>`;
                btn.onclick = () => {
                    selectCreateIcon(icon);
                    renderMobileIconGrid();
                };
                grid.appendChild(btn);
            });
            lucide.createIcons();
        }

        function switchToGroupCreationFromTaskModal() {
            AppState.draftTask = {
                title: document.getElementById('new-task-title').value,
                description: document.getElementById('new-task-desc').value,
                notes: AppState.tempCreateNotes || [],
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

        // Shared Unified Overlay Teardown Path
        function dismissOverlay(backdropEl, containerEl, onCloseCallback, transitionMs = 150) {
            if (!backdropEl && !containerEl) {
                if (onCloseCallback) onCloseCallback();
                return;
            }

            if (backdropEl) {
                backdropEl.classList.remove('opacity-100', 'opacity-85');
                backdropEl.classList.add('opacity-0');
                backdropEl.style.pointerEvents = 'none';
            }
            if (containerEl) {
                containerEl.classList.add('scale-95');
                if (containerEl.classList.contains('translate-y-0')) {
                    containerEl.classList.remove('translate-y-0');
                    containerEl.classList.add('translate-y-full');
                }
            }

            setTimeout(() => {
                if (backdropEl) {
                    backdropEl.classList.add('hidden');
                    backdropEl.classList.remove('opacity-0');
                    backdropEl.style.pointerEvents = '';
                }
                if (containerEl) {
                    containerEl.classList.add('hidden');
                    containerEl.classList.remove('scale-95');
                }
                if (onCloseCallback) onCloseCallback();
            }, transitionMs);
        }

        function closeAddTaskModal(shouldClearDraft = true) {
            const backdrop = document.getElementById('task-modal-backdrop');
            const container = document.getElementById('task-modal-container');
            
            if (shouldClearDraft) {
                const titleVal = document.getElementById('new-task-title') ? document.getElementById('new-task-title').value.trim() : '';
                const descVal = document.getElementById('new-task-desc') ? document.getElementById('new-task-desc').value.trim() : '';
                if (titleVal || descVal || (AppState.tempCreateNotes && AppState.tempCreateNotes.length > 0)) {
                    if (!confirm("You have unsaved task details. Are you sure you want to close and discard changes?")) {
                        return;
                    }
                }
            }

            hideFloatingElement(document.getElementById('new-task-project-options'));
            hideFloatingElement(document.getElementById('new-task-group-options'));
            hideFloatingElement(document.getElementById('new-task-autodelete-options'));
            
            dismissOverlay(backdrop, container, () => {
                if (shouldClearDraft) {
                    AppState.draftTask = null;
                    AppState.tempCreateNotes = [];
                    document.getElementById('new-task-title').value = '';
                    document.getElementById('new-task-desc').value = '';
                    const noteInput = document.getElementById('new-task-note-input');
                    if (noteInput) noteInput.value = '';
                    renderNewTaskNotesDraft();
                }
            }, 150);
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
                notes: AppState.tempCreateNotes || [],
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

        function addNewTaskNoteDraft() {
            const input = document.getElementById('new-task-note-input');
            if (!input) return;
            const text = input.value.trim();
            if (text) {
                if (!AppState.tempCreateNotes) AppState.tempCreateNotes = [];
                AppState.tempCreateNotes.push({
                    id: 'note-' + Date.now() + Math.random().toString(36).substr(2, 5),
                    text: text
                });
                input.value = '';
                renderNewTaskNotesDraft();
            }
        }

        function deleteNewTaskNoteDraft(noteId) {
            if (AppState.tempCreateNotes) {
                AppState.tempCreateNotes = AppState.tempCreateNotes.filter(n => n.id !== noteId);
            }
            renderNewTaskNotesDraft();
        }

        function renderNewTaskNotesDraft() {
            const list = document.getElementById('new-task-notes-list');
            if (!list) return;
            list.innerHTML = '';
            const notes = AppState.tempCreateNotes || [];
            notes.forEach(n => {
                const item = document.createElement('div');
                item.className = "flex items-center justify-between bg-white/5 p-2 rounded-lg";
                item.innerHTML = `
                    <span class="text-xs text-yellow-400 truncate flex-1 mr-2">${escapeHTML(n.text)}</span>
                    <button type="button" onclick="deleteNewTaskNoteDraft('${n.id}')" class="text-gray-500 hover:text-red-400 transition p-1 flex-shrink-0">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                `;
                list.appendChild(item);
            });
            lucide.createIcons();
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
            const allDropdowns = ['sort-dropdown-options', 'ins-project-dropdown-options', 'ins-group-dropdown-options', 'ins-autodelete-options', 'new-task-project-options', 'new-task-group-options', 'new-task-autodelete-options', 'nav-menu-dropdown-options'];
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
                        if (menuId === 'nav-menu-dropdown-options' && triggerBtn) {
                            const rect = triggerBtn.getBoundingClientRect();
                            positionFloatingElement(targetMenu, rect, { margin: 6, alignRight: true });
                        } else {
                            positionFloatingElement(targetMenu, rect);
                        }
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
            if (menuId === 'ins-group-dropdown-options' || menuId === 'new-task-group-options') return 'Select Target Column';
            if (menuId === 'ins-autodelete-options' || menuId === 'new-task-autodelete-options') return 'Auto-Deletion Policy';
            return 'Options';
        }

        function setTaskDone(task, status) {
            task.done = !!status;
            if (task.done) {
                if (!task.completedAt) {
                    task.completedAt = new Date().toISOString();
                }
                if (task.subtasks && Array.isArray(task.subtasks)) {
                    task.subtasks.forEach(s => s.done = true);
                }
            } else {
                task.completedAt = null;
                if (task.subtasks && Array.isArray(task.subtasks)) {
                    task.subtasks.forEach(s => s.done = false);
                }
            }
        }

        function toggleTaskDone(taskId, event) {
            if (event) event.stopPropagation();
            const task = AppState.tasks.find(t => t.id === taskId);
            if (task) {
                const isCompleting = !task.done;
                const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);

                if (isCompleting && taskElement) {
                    taskElement.classList.add('task-slide-out');
                    setTimeout(() => {
                        setTaskDone(task, true);
                        syncDeviceDataChannels();
                        showToast('Task Completed', `"${task.title}" has been moved to Archive.`, 'success');
                        if (AppState.selectedTaskId === taskId) closeInspector();
                        renderTaskFeed();
                        flashArchiveBadge();
                    }, 300);
                } else {
                    setTaskDone(task, !task.done);
                    syncDeviceDataChannels();
                    if (AppState.selectedTaskId === taskId) renderInspector();
                    renderTaskFeed();
                }
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
                    openInspectorPanel();
                } else {
                    closeInspector();
                }
                renderTaskFeed();
            } else {
                const wasAlreadyOpen = !!AppState.selectedTaskId;
                AppState.selectedTaskId = taskId;
                AppState.selectedTaskIds = [taskId];
                renderTaskFeed();
                renderInspector();

                if (!wasAlreadyOpen) {
                    openInspectorPanel();
                }
            }
        }

        function openInspectorPanel() {
            const inspector = document.getElementById('inspector-panel');
            const backdrop = document.getElementById('inspector-backdrop');
            if (!inspector) return;

            const isMobile = window.innerWidth < 768;
            const dim = isMobile ? (inspector.offsetHeight || 400) : (inspector.offsetWidth || 420);
            
            inspector.style.transition = 'none';
            inspector.style.transform = isMobile ? `translateY(${dim}px)` : `translateX(${dim}px)`;
            inspector.classList.remove('hidden');

            if (backdrop) {
                backdrop.classList.remove('hidden');
                void backdrop.offsetHeight;
                backdrop.classList.add('opacity-100');
            }

            requestAnimationFrame(() => {
                inspector.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
                inspector.style.transform = isMobile ? 'translateY(0px)' : 'translateX(0px)';
            });
        }

        function closeInspector() {
            AppState.selectedTaskId = null;
            renderTaskFeed();
            
            hideFloatingElement(document.getElementById('ins-project-dropdown-options'));
            hideFloatingElement(document.getElementById('ins-group-dropdown-options'));
            hideFloatingElement(document.getElementById('ins-autodelete-options'));

            const inspector = document.getElementById('inspector-panel');
            const backdrop = document.getElementById('inspector-backdrop');
            const mobileInspectorBackdrop = document.getElementById('mobile-inspector-backdrop');
            const touchInspectorBackdrop = document.getElementById('inspector-touch-overlay');

            dismissOverlay(backdrop, null, null, 200);
            dismissOverlay(mobileInspectorBackdrop, null, null, 200);
            dismissOverlay(touchInspectorBackdrop, null, null, 200);

            if (inspector && !inspector.classList.contains('hidden')) {
                const isMobile = window.innerWidth < 768;
                const dim = isMobile ? (inspector.offsetHeight || 400) : (inspector.offsetWidth || 420);
                
                inspector.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
                inspector.style.transform = isMobile ? `translateY(${dim}px)` : `translateX(${dim}px)`;

                setTimeout(() => {
                    inspector.classList.add('hidden');
                    inspector.style.transform = '';
                }, 280);
            }
        }

        function renderInspector() {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            const content = document.getElementById('inspector-content');
            const footer = document.getElementById('inspector-footer');
            const header = document.getElementById('inspector-header');

            if (!task) {
                if (content) content.classList.add('hidden');
                if (footer) footer.classList.add('hidden');
                if (header) header.classList.add('hidden');
                return;
            }
            if (content) content.classList.remove('hidden');
            if (footer) footer.classList.remove('hidden');
            if (header) header.classList.remove('hidden');

            const insPinBtn = document.getElementById('ins-pin-sidebar-btn');
            if (insPinBtn) {
                const isPinned = AppState.pinnedTaskIds && AppState.pinnedTaskIds.includes(task.id);
                insPinBtn.className = isPinned 
                    ? "text-amber-400 btn-scale p-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full transition" 
                    : "text-gray-400 hover:text-amber-400 btn-scale p-1.5 bg-white/5 hover:bg-white/10 rounded-full transition";
                insPinBtn.title = isPinned ? "Remove from Sidebar" : "Add to Sidebar";
            }

            document.getElementById('ins-task-title').value = task.title;
            document.getElementById('ins-task-desc').value = task.description || '';
            document.getElementById('ins-task-date').value = task.dueDate || '';
            document.getElementById('ins-task-date-label').textContent = task.dueDate ? task.dueDate : "No Deadline";

            const notesList = document.getElementById('inspector-notes-list');
            if (notesList) {
                notesList.innerHTML = '';
                const notes = task.notes || [];
                notes.forEach(n => {
                    const item = document.createElement('div');
                    item.id = `ins-note-row-${n.id}`;
                    item.className = "flex items-center justify-between bg-white/5 p-1.5 rounded-lg space-x-2";
                    item.innerHTML = `
                        <div class="flex-1 min-w-0 flex items-center space-x-2">
                            <i data-lucide="sticky-note" class="w-3.5 h-3.5 text-yellow-400/70 flex-shrink-0"></i>
                            <span id="ins-note-text-${n.id}" class="text-xs text-yellow-400 truncate flex-1 font-medium select-text">${escapeHTML(n.text)}</span>
                            <input id="ins-note-input-${n.id}" type="text" value="${escapeHTML(n.text)}" onkeydown="if(event.key === 'Enter') saveEditNote('${n.id}')" class="hidden bg-transparent border-none text-xs text-yellow-400 focus:outline-none focus:ring-0 w-full p-0 flex-1 font-medium">
                        </div>
                        <div class="flex items-center space-x-1 flex-shrink-0">
                            <button type="button" id="ins-note-edit-btn-${n.id}" onclick="startEditNote('${n.id}')" class="text-gray-500 hover:text-white transition p-1" title="Edit Note">
                                <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                            </button>
                            <button type="button" id="ins-note-save-btn-${n.id}" onclick="saveEditNote('${n.id}')" class="hidden text-green-400 hover:text-green-300 transition p-1" title="Save Note">
                                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                            </button>
                            <button type="button" onclick="deleteInspectorNote('${n.id}')" class="text-gray-500 hover:text-red-400 transition p-1" title="Delete Note">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    `;
                    notesList.appendChild(item);
                });
            }

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

            const iconContainer = document.getElementById('ins-task-icon-grid');
            iconContainer.innerHTML = '';
            SYSTEM_ICONS.forEach(iconName => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.onclick = () => updateInspectorIcon(iconName);
                btn.className = `ins-task-icon-btn w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-transparent text-gray-400 hover:text-white transition-all flex-shrink-0 ${task.icon === iconName ? 'bg-white text-black scale-110 z-10' : ''}`;
                btn.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i>`;
                iconContainer.appendChild(btn);
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

            const groupDropdownContainer = document.getElementById('ins-group-dropdown-options');
            groupDropdownContainer.innerHTML = '';

            let chosenGroupName = 'Select Group Column';
            const defaultGroupBtn = document.createElement('button');
            defaultGroupBtn.type = 'button';
            defaultGroupBtn.onclick = () => selectInspectorGroup('', 'Select Group Column');
            defaultGroupBtn.className = "w-full text-left px-4 py-2 text-xs text-white hover:bg-white/5 transition";
            defaultGroupBtn.textContent = "Select Group Column";
            groupDropdownContainer.appendChild(defaultGroupBtn);

            AppState.groups.forEach(g => {
                const optBtn = document.createElement('button');
                optBtn.type = 'button';
                optBtn.onclick = () => selectInspectorGroup(g.id, g.title);
                optBtn.className = "w-full text-left px-4 py-2 text-xs text-white hover:bg-white/5 transition flex items-center space-x-2";
                optBtn.innerHTML = `<span class="w-2 h-2 rounded-full" style="background-color: ${g.color}"></span><span>${escapeHTML(g.title)}</span>`;
                groupDropdownContainer.appendChild(optBtn);

                if (task.groupId === g.id) chosenGroupName = g.title;
            });
            document.getElementById('ins-selected-group-label').textContent = chosenGroupName;

            const autoDeleteDropdownContainer = document.getElementById('ins-autodelete-options');
            autoDeleteDropdownContainer.innerHTML = '';

            const policies = [
                { value: 'default', label: 'Default (27 Days)' },
                { value: 'never', label: 'Do not delete' },
                { value: '1day', label: '1 Day after' },
                { value: '1week', label: '1 Week after' },
                { value: 'custom', label: 'Custom duration' }
            ];

            let chosenPolicyLabel = 'Default (27 Days)';
            policies.forEach(p => {
                const optBtn = document.createElement('button');
                optBtn.type = 'button';
                optBtn.onclick = () => selectInspectorAutodelete(p.value, p.label);
                optBtn.className = "w-full text-left px-4 py-2 text-xs text-white hover:bg-white/5 transition";
                optBtn.textContent = p.label;
                autoDeleteDropdownContainer.appendChild(optBtn);

                if (task.autoDelete === p.value || (!task.autoDelete && p.value === 'default')) chosenPolicyLabel = p.label;
            });
            document.getElementById('ins-selected-autodelete-label').textContent = chosenPolicyLabel;

            const customAutoDeleteContainer = document.getElementById('ins-custom-autodelete-container');
            if (task.autoDelete === 'custom') {
                customAutoDeleteContainer.classList.remove('hidden');
                document.getElementById('ins-task-autodelete-custom').value = task.customAutoDeleteHrs || 24;
            } else {
                customAutoDeleteContainer.classList.add('hidden');
            }

            const subtasksList = document.getElementById('inspector-subtasks-list');
            subtasksList.innerHTML = '';
            
            const subtasks = task.subtasks || [];
            const subDoneCount = subtasks.filter(s => s.done).length;
            document.getElementById('subtask-fraction').textContent = `${subDoneCount} / ${subtasks.length}`;

            const subtaskColor = task.color || '#2997ff';
            const borderStyle = `border-color: ${subtaskColor};`;

            subtasks.forEach(s => {
                const row = document.createElement('div');
                row.id = `ins-subtask-row-${s.id}`;
                row.className = `flex items-center justify-between bg-white/5 p-2 rounded-lg transition ${s.done ? 'opacity-70' : ''}`;
                const bgStyle = s.done ? `background-color: ${subtaskColor};` : `background-color: transparent;`;

                row.innerHTML = `
                    <div class="flex items-center space-x-3 flex-1 min-w-0 pr-2">
                        <button onclick="toggleSubtaskDone('${s.id}')" class="w-[18px] h-[18px] rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-200" style="${borderStyle} ${bgStyle}" title="Toggle Subtask">
                            ${s.done ? `<i data-lucide="check" class="w-3 h-3 text-[#0a0a0a] font-extrabold tick-animation"></i>` : ''}
                        </button>
                        <span id="ins-subtask-text-${s.id}" class="text-xs text-gray-200 truncate flex-1 select-text ${s.done ? 'line-through text-gray-500' : ''}">${escapeHTML(s.title)}</span>
                        <input id="ins-subtask-input-${s.id}" type="text" value="${escapeHTML(s.title)}" onkeydown="if(event.key === 'Enter') saveEditSubtask('${s.id}')" class="hidden bg-transparent border-none text-xs text-gray-200 focus:outline-none focus:ring-0 w-full p-0 flex-1 ${s.done ? 'line-through text-gray-500' : ''}">
                    </div>
                    <div class="flex items-center space-x-1 flex-shrink-0">
                        <button type="button" id="ins-subtask-edit-btn-${s.id}" onclick="startEditSubtask('${s.id}')" class="text-gray-500 hover:text-white transition p-1" title="Edit Subtask">
                            <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                        </button>
                        <button type="button" id="ins-subtask-save-btn-${s.id}" onclick="saveEditSubtask('${s.id}')" class="hidden text-green-400 hover:text-green-300 transition p-1" title="Save Subtask">
                            <i data-lucide="check" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="deleteSubtask('${s.id}')" class="text-gray-500 hover:text-red-400 transition p-1" title="Delete Subtask">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5 flex-shrink-0"></i>
                        </button>
                    </div>
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

        function exportSingleTask() {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (!task) return;
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(task, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `task-${task.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showToast('Task Exported', `Exported "${task.title}" to JSON.`);
        }

        function updateInspectorPriority(colorHex) {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (task) {
                task.color = colorHex;
                syncDeviceDataChannels();
                renderInspector();
            }
        }

        function toggleInspectorSection(sectionId) {
            const content = document.getElementById(`ins-sec-content-${sectionId}`);
            let icon = document.getElementById(`ins-sec-icon-${sectionId}`);
            if (!content || !icon) return;

            const isHidden = content.classList.contains('hidden');
            if (isHidden) {
                content.classList.remove('hidden');
                icon.setAttribute('data-lucide', 'chevron-down');
                icon.setAttribute('data-hugeicon', 'chevron-down');
            } else {
                content.classList.add('hidden');
                icon.setAttribute('data-lucide', 'chevron-right');
                icon.setAttribute('data-hugeicon', 'chevron-right');
            }
            if (window.lucide) window.lucide.createIcons();
            if (window.hugeicons) window.hugeicons.createIcons();
        }

        function addInspectorNote() {
            const input = document.getElementById('new-task-note-input-ins');
            if (!input) return;
            const text = input.value.trim();
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (task && text) {
                if (!task.notes) task.notes = [];
                task.notes.push({
                    id: 'note-' + Date.now() + Math.random().toString(36).substr(2, 5),
                    text: text
                });
                input.value = '';
                syncDeviceDataChannels();
                renderTaskFeed();
                renderInspector();
            }
        }

        function deleteInspectorNote(noteId) {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (task && task.notes) {
                task.notes = task.notes.filter(n => n.id !== noteId);
                syncDeviceDataChannels();
                renderTaskFeed();
                renderInspector();
            }
        }

        function updateInspectorNoteText(noteId, newText) {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (task && task.notes) {
                const note = task.notes.find(n => n.id === noteId);
                if (note) {
                    note.text = newText.trim() || note.text;
                    syncDeviceDataChannels();
                    renderTaskFeed();
                    renderInspector();
                }
            }
        }

        function updateSubtaskTitle(subtaskId, newTitle) {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (task && task.subtasks) {
                const sub = task.subtasks.find(s => s.id === subtaskId);
                if (sub) {
                    sub.title = sanitizeSentenceCase(newTitle.trim()) || sub.title;
                    syncDeviceDataChannels();
                    renderTaskFeed();
                    renderInspector();
                }
            }
        }

        function startEditNote(noteId) {
            document.getElementById(`ins-note-text-${noteId}`).classList.add('hidden');
            document.getElementById(`ins-note-input-${noteId}`).classList.remove('hidden');
            document.getElementById(`ins-note-edit-btn-${noteId}`).classList.add('hidden');
            document.getElementById(`ins-note-save-btn-${noteId}`).classList.remove('hidden');
            document.getElementById(`ins-note-input-${noteId}`).focus();
        }

        function saveEditNote(noteId) {
            const input = document.getElementById(`ins-note-input-${noteId}`);
            const newText = input.value.trim();
            if (newText) {
                updateInspectorNoteText(noteId, newText);
            } else {
                renderInspector();
            }
        }

        function startEditSubtask(subtaskId) {
            document.getElementById(`ins-subtask-text-${subtaskId}`).classList.add('hidden');
            document.getElementById(`ins-subtask-input-${subtaskId}`).classList.remove('hidden');
            document.getElementById(`ins-subtask-edit-btn-${subtaskId}`).classList.add('hidden');
            document.getElementById(`ins-subtask-save-btn-${subtaskId}`).classList.remove('hidden');
            document.getElementById(`ins-subtask-input-${subtaskId}`).focus();
        }

        function saveEditSubtask(subtaskId) {
            const input = document.getElementById(`ins-subtask-input-${subtaskId}`);
            const newTitle = input.value.trim();
            if (newTitle) {
                updateSubtaskTitle(subtaskId, newTitle);
            } else {
                renderInspector();
            }
        }

        function updateInspectorIcon(iconName) {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (task) {
                task.icon = iconName;
                syncDeviceDataChannels();
                renderInspector();
            }
        }

        function selectInspectorGroup(groupId, title) {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (task) {
                task.groupId = groupId || null;
                syncDeviceDataChannels();
                renderInspector();
            }
            const dropdown = document.getElementById('ins-group-dropdown-options');
            if (dropdown) hideFloatingElement(dropdown);
        }

        function selectInspectorAutodelete(value, label) {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (task) {
                task.autoDelete = value;
                const createdTime = new Date(task.createdDate).getTime() || Date.now();
                if (value === 'never') {
                    task.expiryTime = null;
                } else if (value === '1day') {
                    task.expiryTime = createdTime + (24 * 60 * 60 * 1000);
                } else if (value === '1week') {
                    task.expiryTime = createdTime + (7 * 24 * 60 * 60 * 1000);
                } else if (value === 'custom') {
                    const hrs = task.customAutoDeleteHrs || 24;
                    task.expiryTime = createdTime + (hrs * 60 * 60 * 1000);
                }
                syncDeviceDataChannels();
                renderInspector();
            }
            const dropdown = document.getElementById('ins-autodelete-options');
            if (dropdown) hideFloatingElement(dropdown);
        }

        function updateInspectorCustomAutodelete(hours) {
            const task = AppState.tasks.find(t => t.id === AppState.selectedTaskId);
            if (task) {
                const hrs = parseFloat(hours) || 24;
                task.customAutoDeleteHrs = hrs;
                const createdTime = new Date(task.createdDate).getTime() || Date.now();
                task.expiryTime = createdTime + (hrs * 60 * 60 * 1000);
                syncDeviceDataChannels();
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
            dismissOverlay(backdrop, container, () => {
                deleteActionCallback = null;
            }, 150);
        }

        document.getElementById('delete-confirm-btn').onclick = function() {
            if (deleteActionCallback) deleteActionCallback();
            closeDeleteModal(); 
        };

        function clearCompletedTasks() {
            const completedCount = AppState.tasks.filter(t => t.done).length;
            if (completedCount === 0) return;
            
            showDeleteConfirmation(`Are you sure you want to permanently delete all ${completedCount} completed tasks? This action cannot be undone.`, () => {
                AppState.tasks = AppState.tasks.filter(t => !t.done);
                syncDeviceDataChannels();
                renderTaskFeed();
                updateGlobalBadges();
                closeInspector();
                showToast('Archive Cleared', `Successfully deleted all ${completedCount} completed tasks.`);
            });
        }

        function openNewProjectModal() {
            if (window.innerWidth < 768 && !AppState.sidebarCollapsed) toggleSidebarCollapse();
            const backdrop = document.getElementById('project-modal-backdrop');
            const container = document.getElementById('project-modal-container');
            
            const titleEl = document.getElementById('project-modal-title');
            const submitBtn = document.getElementById('project-submit-btn');
            
            if (AppState.editingProjectId) {
                titleEl.innerHTML = `<i data-lucide="edit-2" class="text-[#2997ff] mr-2 w-5 h-5 flex-shrink-0"></i><span class="text-sm font-bold text-white normal-case tracking-normal">Edit Collection Settings</span>`;
                submitBtn.textContent = "Save Changes";
            } else {
                titleEl.innerHTML = `<i data-lucide="folder-plus" class="text-[#2997ff] mr-2 w-5 h-5 flex-shrink-0"></i><span class="text-sm font-bold text-white normal-case tracking-normal">Configure Collection</span>`;
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

        function openArchiveModal(event) {
            if (event) event.stopPropagation();
            const backdrop = document.getElementById('archive-modal-backdrop');
            const container = document.getElementById('archive-modal-container');
            if (!backdrop || !container) return;

            renderArchiveModalList();
            backdrop.classList.remove('hidden');
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                container.classList.remove('scale-95');
                if (window.lucide) window.lucide.createIcons();
                if (window.hugeicons) window.hugeicons.createIcons();
            }, 10);
        }
        function openNoteModal(taskId, type, event) {
            if (event) event.stopPropagation();
            const task = AppState.tasks.find(t => t.id === taskId);
            if (!task) return;

            let fullText = '';
            let titleText = 'Details';
            if (type === 'desc') {
                fullText = task.description || '';
                titleText = 'Full Description';
            } else if (typeof type === 'number' && task.notes && task.notes[type]) {
                fullText = task.notes[type].text || '';
                titleText = 'Short Note Details';
            } else {
                fullText = String(type || '');
            }

            const backdrop = document.getElementById('note-modal-backdrop');
            const container = document.getElementById('note-modal-container');
            const textEl = document.getElementById('note-modal-full-text');
            const titleEl = container ? container.querySelector('.modal-header__lead h2') : null;
            if (!backdrop || !container || !textEl) return;

            if (titleEl) titleEl.textContent = titleText;
            textEl.textContent = fullText;
            backdrop.classList.remove('hidden');
            setTimeout(() => {
                backdrop.classList.remove('opacity-0');
                container.classList.remove('scale-95');
                if (window.lucide) window.lucide.createIcons();
            }, 10);
        }

        function closeNoteModal() {
            const backdrop = document.getElementById('note-modal-backdrop');
            const container = document.getElementById('note-modal-container');
            dismissOverlay(backdrop, container, null, 150);
        }

        window.openNoteModal = openNoteModal;
        window.closeNoteModal = closeNoteModal;

        function closeArchiveModal() {
            const backdrop = document.getElementById('archive-modal-backdrop');
            const container = document.getElementById('archive-modal-container');
            dismissOverlay(backdrop, container, null, 150);
        }

        function renderArchiveModalList() {
            const listEl = document.getElementById('archive-modal-tasks-list');
            if (!listEl) return;

            let completedTasks = AppState.tasks.filter(t => t.done);
            if (completedTasks.length === 0) {
                listEl.innerHTML = `
                    <div class="text-center py-8 text-xs text-gray-500">
                        No completed tasks in archive
                    </div>
                `;
                return;
            }

            // Sort based on archiveSortMode
            const mode = AppState.archiveSortMode || 'recent';
            if (mode === 'recent') {
                completedTasks = completedTasks.slice().sort((a, b) => {
                    const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
                    const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
                    return tb - ta; // newest first
                });
            } else if (mode === 'oldest') {
                completedTasks = completedTasks.slice().sort((a, b) => {
                    const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
                    const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
                    return ta - tb; // oldest first
                });
            } else if (mode === 'subtasks') {
                completedTasks = completedTasks.slice().sort((a, b) => {
                    const sa = (a.subtasks || []).length;
                    const sb = (b.subtasks || []).length;
                    return sb - sa; // most subtasks first
                });
            }

            listEl.innerHTML = completedTasks.map(t => {
                const subCount = (t.subtasks || []).length;
                const subDone = (t.subtasks || []).filter(s => s.done).length;
                const completedDate = t.completedAt ? new Date(t.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
                return `
                    <div class="flex items-center justify-between p-3 bg-white/[0.03] rounded-2xl border border-white/[0.05] hover:bg-white/[0.06] transition">
                        <div class="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                            <button onclick="toggleTaskDone('${t.id}'); renderArchiveModalList();" class="w-5 h-5 rounded-full border border-emerald-500 bg-emerald-500 flex items-center justify-center flex-shrink-0 transition">
                                <i data-lucide="check" class="w-3 h-3 text-[#0A0A0A] font-bold"></i>
                            </button>
                            <div class="min-w-0 flex-1">
                                <span class="text-xs font-semibold text-gray-400 line-through truncate block">${escapeHTML(t.title)}</span>
                                <div class="flex items-center gap-2 mt-0.5">
                                    ${completedDate ? `<span class="text-[10px] text-gray-600">${completedDate}</span>` : ''}
                                    ${subCount > 0 ? `<span class="text-[10px] text-gray-600 flex items-center gap-1"><i data-lucide="list-checks" class="w-2.5 h-2.5"></i>${subDone}/${subCount}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <button onclick="deleteSingleTask('${t.id}'); renderArchiveModalList();" class="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/10 rounded-full transition flex-shrink-0" title="Delete Task">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                `;
            }).join('');

            // Sync checkmarks
            ['recent', 'oldest', 'subtasks'].forEach(m => {
                const el = document.getElementById(`archive-sort-check-${m}`);
                if (el) el.classList.toggle('hidden', mode !== m);
            });

            if (window.lucide) window.lucide.createIcons();
            if (window.hugeicons) window.hugeicons.createIcons();
        }

        function toggleArchiveSortDropdown(event) {
            if (event) event.stopPropagation();
            const dd = document.getElementById('archive-sort-dropdown');
            if (!dd) return;
            dd.classList.toggle('hidden');
            if (!dd.classList.contains('hidden') && window.lucide) window.lucide.createIcons();
        }

        function setArchiveSort(mode, event) {
            if (event) event.stopPropagation();
            AppState.archiveSortMode = mode;
            const dd = document.getElementById('archive-sort-dropdown');
            if (dd) dd.classList.add('hidden');
            renderArchiveModalList();
        }

        window.openArchiveModal = openArchiveModal;
        window.closeArchiveModal = closeArchiveModal;
        window.renderArchiveModalList = renderArchiveModalList;
        window.toggleArchiveSortDropdown = toggleArchiveSortDropdown;
        window.setArchiveSort = setArchiveSort;

        function flashArchiveBadge() {
            const ids = ['archive-badge-desktop', 'archive-badge-mobile'];
            ids.forEach(id => {
                const badge = document.getElementById(id);
                if (!badge) return;
                badge.textContent = '+1';
                badge.classList.remove('hidden');
                badge.classList.add('archive-badge-pop');
                clearTimeout(badge._hideTimer);
                badge._hideTimer = setTimeout(() => {
                    badge.classList.remove('archive-badge-pop');
                    badge.classList.add('hidden');
                }, 1200);
            });
        }
        window.flashArchiveBadge = flashArchiveBadge;

        function closeProjectModal() {
            const backdrop = document.getElementById('project-modal-backdrop');
            const container = document.getElementById('project-modal-container');
            dismissOverlay(backdrop, container, () => {
                AppState.editingProjectId = null;
                document.getElementById('new-project-title').value = '';
            }, 150);
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
                document.getElementById('group-modal-title-text').innerHTML = `<i data-lucide="edit-2" class="text-[#2997ff] mr-2 w-5 h-5 flex-shrink-0"></i><span class="text-sm font-bold text-white normal-case tracking-normal">Edit Group Settings</span>`;
                submitBtn.textContent = "Save Changes";
            } else {
                document.getElementById('group-modal-title-text').innerHTML = `<i data-lucide="plus-square" class="text-[#2997ff] mr-2 w-5 h-5 flex-shrink-0"></i><span class="text-sm font-bold text-white normal-case tracking-normal">Create Group Column</span>`;
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
            dismissOverlay(backdrop, container, () => {
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

        function checkFiveDayAutoBackup() {
            let backups = [];
            try { backups = JSON.parse(localStorage.getItem('ANV_5DAY_SNAPSHOTS') || '[]'); } catch(e) {}
            
            const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
            const lastBackupTime = backups.length > 0 ? backups[0].timestamp : 0;
            
            if (Date.now() - lastBackupTime >= FIVE_DAYS_MS || backups.length === 0) {
                const snapshot = {
                    id: 'snap-' + Date.now(),
                    timestamp: Date.now(),
                    label: `5-Day Full Backup (${new Date().toLocaleDateString()})`,
                    taskCount: AppState.tasks.length,
                    groupCount: AppState.groups.length,
                    data: {
                        tasks: JSON.parse(JSON.stringify(AppState.tasks)),
                        projects: JSON.parse(JSON.stringify(AppState.projects)),
                        groups: JSON.parse(JSON.stringify(AppState.groups))
                    }
                };
                
                // Rotation: Keep latest 5 snapshots, automatically replacing old 5-day backups
                backups.unshift(snapshot);
                if (backups.length > 5) backups = backups.slice(0, 5);
                
                try { localStorage.setItem('ANV_5DAY_SNAPSHOTS', JSON.stringify(backups)); } catch(e) {}
            }
        }

        function triggerManualSnapshot() {
            let backups = [];
            try { backups = JSON.parse(localStorage.getItem('ANV_5DAY_SNAPSHOTS') || '[]'); } catch(e) {}
            
            const snapshot = {
                id: 'snap-' + Date.now(),
                timestamp: Date.now(),
                label: `Manual 5-Day Snapshot (${new Date().toLocaleDateString()})`,
                taskCount: AppState.tasks.length,
                groupCount: AppState.groups.length,
                data: {
                    tasks: JSON.parse(JSON.stringify(AppState.tasks)),
                    projects: JSON.parse(JSON.stringify(AppState.projects)),
                    groups: JSON.parse(JSON.stringify(AppState.groups))
                }
            };
            
            backups.unshift(snapshot);
            if (backups.length > 5) backups = backups.slice(0, 5);
            
            try { localStorage.setItem('ANV_5DAY_SNAPSHOTS', JSON.stringify(backups)); } catch(e) {}
            if (AppState.currentTab === 'manage') renderManageDashboard();
            showToast('5-Day Snapshot Created', 'Captured full task directory snapshot.');
        }

        function deleteAutoSnapshot(index) {
            let backups = [];
            try { backups = JSON.parse(localStorage.getItem('ANV_5DAY_SNAPSHOTS') || '[]'); } catch(e) {}
            if (index < 0 || index >= backups.length) return;
            const target = backups[index];
            showDeleteConfirmation(`Delete backup snapshot "${target.label || 'Snapshot'}"?`, () => {
                backups.splice(index, 1);
                try { localStorage.setItem('ANV_5DAY_SNAPSHOTS', JSON.stringify(backups)); } catch(e) {}
                if (AppState.currentTab === 'manage') renderManageDashboard();
                showToast('Snapshot Deleted', 'Backup removed successfully.');
            });
        }

        function deleteAllTasksStudio() {
            if (AppState.tasks.length === 0) return;
            showDeleteConfirmation(`Are you sure you want to permanently delete ALL ${AppState.tasks.length} task(s)? This action cannot be undone.`, () => {
                AppState.tasks = [];
                syncDeviceDataChannels();
                renderTaskFeed();
                updateGlobalBadges();
                closeInspector();
                showToast('All Tasks Deleted', 'Entire task directory cleared.');
            });
        }

        function deleteAllGroupsStudio() {
            if (AppState.groups.length === 0) return;
            showDeleteConfirmation(`Are you sure you want to permanently delete ALL ${AppState.groups.length} group column(s) and their contained tasks? This action cannot be undone.`, () => {
                AppState.groups = [];
                AppState.tasks = AppState.tasks.filter(t => !t.groupId);
                syncDeviceDataChannels();
                renderTaskFeed();
                updateGlobalBadges();
                closeInspector();
                showToast('All Groups Deleted', 'Cleared all group columns.');
            });
        }

        function renderManageDashboard() {
            const container = document.getElementById('tasks-list');
            if (!container) return;
            const feedTitle = document.getElementById('feed-current-title');
            if (feedTitle) feedTitle.textContent = 'Manage Studio';

            let backups = [];
            try { backups = JSON.parse(localStorage.getItem('ANV_5DAY_SNAPSHOTS') || '[]'); } catch(e) {}

            let backupListHTML = '';
            if (backups.length === 0) {
                backupListHTML = `
                    <div class="text-center py-6 text-xs text-gray-500 border border-dashed border-white/5 rounded-xl">
                        No 5-day snapshots available. Click "Capture Snapshot" to store a backup.
                    </div>
                `;
            } else {
                backupListHTML = backups.map((b, idx) => `
                    <div class="bg-white/5 p-3.5 rounded-2xl border border-white/5 hover:bg-white/10 transition flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div class="flex items-center justify-between md:justify-start space-x-3 w-full md:w-auto">
                            <div class="flex items-center space-x-3 min-w-0">
                                <div class="p-2 bg-[#2997ff]/10 text-[#2997ff] rounded-xl flex-shrink-0">
                                    <i data-lucide="archive" class="w-4 h-4"></i>
                                </div>
                                <div class="min-w-0">
                                    <div class="flex items-center space-x-2 flex-wrap">
                                        <h4 class="text-xs font-bold text-white truncate">${escapeHTML(b.label || 'Snapshot')}</h4>
                                    </div>
                                    <div class="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                                        <span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-white/10 text-gray-300 border border-white/5">${new Date(b.timestamp).toLocaleDateString()} ${new Date(b.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        <span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#2997ff]/15 text-[#2997ff] border border-[#2997ff]/20">${b.taskCount} Tasks</span>
                                        <span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/20">${b.groupCount || 0} Groups</span>
                                    </div>
                                </div>
                            </div>
                            <button type="button" onclick="deleteAutoSnapshot(${idx})" class="p-2 text-gray-400 hover:text-red-400 rounded-full hover:bg-white/10 transition md:hidden" title="Delete Snapshot">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                        <div class="flex flex-col sm:flex-row md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
                            <button type="button" onclick="previewBackupSnapshot(${idx})" class="btn-scale px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-semibold border border-white/10 transition flex items-center justify-center space-x-1.5">
                                <i data-lucide="eye" class="w-3.5 h-3.5 text-[#2997ff]"></i>
                                <span>Preview</span>
                            </button>
                            <button type="button" onclick="restoreAutoSnapshot(${idx})" class="btn-scale px-4 py-2 bg-[#2997ff] text-black hover:bg-[#0066cc] hover:text-white rounded-full text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md">
                                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                                <span>Restore</span>
                            </button>
                            <button type="button" onclick="deleteAutoSnapshot(${idx})" class="hidden md:flex btn-scale p-2 text-gray-400 hover:text-red-400 rounded-full hover:bg-white/5 transition items-center justify-center" title="Delete Snapshot">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
            }

            container.innerHTML = `
                <div class="space-y-6 max-w-4xl mx-auto p-2 sm:p-4 animate-fade-in" id="manage-studio" oncontextmenu="handleManageStudioContextMenu(event)">
                    
                    <!-- 5-Day Backups Box -->
                    <div class="bg-[#121212] border border-white/5 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 gap-3">
                            <div>
                                <h3 class="text-sm font-extrabold text-white flex items-center space-x-2">
                                    <i data-lucide="database" class="w-4 h-4 text-[#2997ff]"></i>
                                    <span>5-Day Directory Backups & Snapshots</span>
                                </h3>
                                <p class="text-xs text-gray-400 mt-1">Automatic 5-day rotation & manual system snapshots.</p>
                            </div>
                            <button type="button" onclick="triggerManualSnapshot()" class="btn-scale px-4 py-2.5 bg-[#2997ff] text-black font-bold rounded-full text-xs hover:bg-[#0066cc] hover:text-white transition shadow-md flex items-center justify-center space-x-2">
                                <i data-lucide="camera" class="w-4 h-4"></i>
                                <span>Capture Snapshot</span>
                            </button>
                        </div>
                        <div class="space-y-3">
                            ${backupListHTML}
                        </div>
                    </div>

                    <!-- Reset & Clearance Actions Section -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Delete All Tasks Box -->
                        <div class="bg-[#121212] border border-red-500/20 rounded-2xl p-5 space-y-3 shadow-xl flex flex-col justify-between">
                            <div class="space-y-1.5">
                                <div class="flex items-center space-x-2 text-red-400">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    <h4 class="text-xs font-extrabold uppercase tracking-wider text-white">Delete All Tasks</h4>
                                </div>
                                <p class="text-xs text-gray-400 leading-relaxed">Permanently clear all task items from your workspace. Existing group column structures will remain intact.</p>
                            </div>
                            <button type="button" onclick="deleteAllTasksStudio()" class="btn-scale w-full py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-full text-xs font-bold transition flex items-center justify-center space-x-2">
                                <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>
                                <span>Delete All Tasks</span>
                            </button>
                        </div>

                        <!-- Delete All Groups Box -->
                        <div class="bg-[#121212] border border-red-500/20 rounded-2xl p-5 space-y-3 shadow-xl flex flex-col justify-between">
                            <div class="space-y-1.5">
                                <div class="flex items-center space-x-2 text-red-400">
                                    <i data-lucide="folder-x" class="w-4 h-4"></i>
                                    <h4 class="text-xs font-extrabold uppercase tracking-wider text-white">Delete All Groups</h4>
                                </div>
                                <p class="text-xs text-gray-400 leading-relaxed">Remove all custom group columns and clear all tasks assigned inside them from your directory.</p>
                            </div>
                            <button type="button" onclick="deleteAllGroupsStudio()" class="btn-scale w-full py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-full text-xs font-bold transition flex items-center justify-center space-x-2">
                                <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>
                                <span>Delete All Group Columns</span>
                            </button>
                        </div>
                    </div>

                </div>
            `;
            lucide.createIcons();
        }

        function previewBackupSnapshot(index) {
            let backups = [];
            try { backups = JSON.parse(localStorage.getItem('ANV_5DAY_SNAPSHOTS') || '[]'); } catch(e) {}
            const target = backups[index];
            if (!target || !target.data) return;

            const snapTasks = target.data.tasks || [];
            const snapGroups = target.data.groups || [];

            const existingModal = document.getElementById('snapshot-preview-modal');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.id = 'snapshot-preview-modal';
            modal.className = "fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in";
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

            modal.innerHTML = `
                <div class="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
                    <div class="flex items-center justify-between border-b border-white/5 pb-3">
                        <div>
                            <h3 class="text-xs font-extrabold text-white flex items-center space-x-2 uppercase tracking-wider">
                                <i data-lucide="archive" class="w-4 h-4 text-[#2997ff]"></i>
                                <span>${escapeHTML(target.label || 'Snapshot Preview')}</span>
                            </h3>
                            <div class="text-[10px] text-gray-400 font-mono mt-0.5">${new Date(target.timestamp).toLocaleString()} • ${snapTasks.length} Tasks • ${snapGroups.length} Groups</div>
                        </div>
                        <button type="button" onclick="document.getElementById('snapshot-preview-modal').remove()" class="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar" style="scrollbar-width: none; -ms-overflow-style: none;">
                        ${snapTasks.length === 0 ? '<div class="text-center py-8 text-xs text-gray-600 border border-dashed border-white/5 rounded-xl">No tasks saved in this snapshot</div>' : snapTasks.map(t => {
                            const group = snapGroups.find(g => g.id === t.groupId);
                            return `
                                <div class="flex items-center justify-between bg-white/5 p-2.5 rounded-xl text-xs border border-white/5">
                                    <div class="flex items-center space-x-2.5 min-w-0 flex-1">
                                        <span class="w-2.5 h-2.5 rounded-full border flex-shrink-0" style="border-color: ${t.color || '#2997ff'}; background-color: ${t.done ? (t.color || '#2997ff') : 'transparent'};"></span>
                                        <span class="text-white font-medium truncate ${t.done ? 'line-through text-gray-500' : ''}">${escapeHTML(t.title)}</span>
                                    </div>
                                    ${group ? `<span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white/5 text-gray-400 flex-shrink-0">${escapeHTML(group.title)}</span>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="pt-3 border-t border-white/5 flex items-center justify-center">
                        <button type="button" onclick="document.getElementById('snapshot-preview-modal').remove()" class="btn-scale w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition border border-white/10">
                            Close Preview
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            lucide.createIcons();
        }

        function restoreAutoSnapshot(index) {
            let backups = [];
            try { backups = JSON.parse(localStorage.getItem('ANV_5DAY_SNAPSHOTS') || '[]'); } catch(e) {}
            const target = backups[index];
            if (!target || !target.data) return;
            
            showDeleteConfirmation(`Restore snapshot "${target.label}"? Current workspace data will be replaced.`, () => {
                AppState.tasks = target.data.tasks || [];
                AppState.projects = target.data.projects || [];
                AppState.groups = target.data.groups || [];
                syncDeviceDataChannels();
                renderTaskFeed();
                showToast('Backup Restored', `Restored ${target.taskCount} tasks from 5-day snapshot.`);
            });
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

        function showToast(title, msg, type = 'info') {
            let container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                container.className = 'fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-xs z-[300] space-y-2 pointer-events-none flex flex-col items-center sm:items-end';
                document.body.appendChild(container);
            }
            const wrapper = document.createElement('div');
            wrapper.className = "w-full max-w-sm pointer-events-auto opacity-0 transform translate-y-2 transition-all duration-200 ease-out";
            
            let iconName = 'info';
            let iconColorClass = 'text-blue-400 bg-blue-500/10';
            if (type === 'success') {
                iconName = 'check-circle';
                iconColorClass = 'text-emerald-400 bg-emerald-500/10';
            } else if (type === 'warning') {
                iconName = 'alert-triangle';
                iconColorClass = 'text-amber-400 bg-amber-500/10';
            } else if (type === 'error') {
                iconName = 'alert-circle';
                iconColorClass = 'text-red-400 bg-red-500/10';
            }

            const toast = document.createElement('div');
            toast.className = "px-3.5 py-2 bg-[#181818] text-white rounded-full flex items-center space-x-2.5 w-full";
            toast.innerHTML = `
                <div class="p-1 rounded-full ${iconColorClass} flex-shrink-0 flex items-center justify-center">
                    <i data-lucide="${iconName}" class="w-3.5 h-3.5"></i>
                </div>
                <div class="flex-1 min-w-0 flex items-center space-x-1.5 text-xs">
                    <span class="font-semibold text-white whitespace-nowrap">${escapeHTML(title)}</span>
                    ${msg ? `<span class="text-gray-400 text-[11px] truncate">${escapeHTML(msg)}</span>` : ''}
                </div>
                <button onclick="this.closest('.pointer-events-auto').remove()" class="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition flex-shrink-0" title="Dismiss">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
            `;
            wrapper.appendChild(toast);
            
            container.appendChild(wrapper);
            if (window.lucide) window.lucide.createIcons();
            if (window.hugeicons) window.hugeicons.createIcons();

            setTimeout(() => { wrapper.classList.remove('opacity-0', 'translate-y-2'); }, 10);
            setTimeout(() => {
                if (wrapper && wrapper.parentNode) {
                    wrapper.classList.add('opacity-0', 'translate-y-2');
                    setTimeout(() => { wrapper.remove(); }, 150);
                }
            }, 4000);
        }

        function escapeHTML(str) {
            if (!str) return '';
            return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
        }

        function isTaskOnHold(task) {
            const now = Date.now();
            
            // Check task-level hold
            if (task.holdDeletion) {
                if (!task.holdUntil) return true; // Indefinite hold
                if (new Date(task.holdUntil).getTime() > now) return true; // Active timed hold
            }
            
            // Check group-level hold
            if (task.groupId) {
                const group = AppState.groups.find(g => g.id === task.groupId);
                if (group && group.holdDeletion) {
                    if (!group.holdUntil) return true; // Indefinite group hold
                    if (new Date(group.holdUntil).getTime() > now) return true; // Active timed group hold
                }
            }
            
            return false;
        }

        function checkAndAutoDeleteTasks() {
            const now = Date.now();
            let deletedAny = false;
            let deletedNames = [];
            const lifespan = 27 * 24 * 60 * 60 * 1000;

            AppState.tasks = AppState.tasks.filter(task => {
                // 1. Check custom auto-delete policy expiryTime (only delete if not on hold)
                if (task.expiryTime && now > task.expiryTime && !isTaskOnHold(task)) {
                    deletedAny = true;
                    deletedNames.push(task.title);
                    return false; 
                }
                
                // 2. Check 27-day auto-delete for completed tasks
                if (task.done && task.completedAt) {
                    const completedTime = new Date(task.completedAt).getTime();
                    if (now - completedTime > lifespan && !isTaskOnHold(task)) {
                        deletedAny = true;
                        deletedNames.push(task.title);
                        return false;
                    }
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
            // Drag-to-select disabled per user request
        }

        window.onload = function() {
            loadFromLocalStorage();
            initResizeHandlers();
            initDragToSelect(); 
            
            if (window.innerWidth < 768) {
                AppState.sidebarCollapsed = true;
                const sidebar = document.getElementById('sidebar-panel');
                const resizer = document.getElementById('sidebar-resizer');
                if (sidebar) sidebar.style.width = '0px';
                if (resizer) resizer.style.display = 'none';
            }

            // Bind draggable bottom sheet gesture logic to all app sheets & modals
            makeModalDraggable(document.getElementById('task-modal-container'), () => closeAddTaskModal(true));
            makeModalDraggable(document.getElementById('project-modal-container'), closeProjectModal);
            makeModalDraggable(document.getElementById('group-modal-container'), closeAddGroupModal);
            makeModalDraggable(document.getElementById('archive-modal-container'), closeArchiveModal);
            makeModalDraggable(document.getElementById('profile-customizer-container'), closeProfileCustomizerModal);
            makeModalDraggable(document.getElementById('note-modal-container'), closeNoteModal);
            makeModalDraggable(document.getElementById('mobile-drawer'), closeMobileDrawer);
            makeModalDraggable(document.getElementById('inspector-panel'), closeInspector, { axis: 'auto' });

            initSupabaseAuth();

            // Global Click-Outside Dismissal Listener
            document.addEventListener('click', (e) => {
                const isClickInside = (selector) => {
                    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
                    return el && !el.classList.contains('hidden') && el.contains(e.target);
                };

                // Close modals if click is outside modal shell container
                const modalBackdrops = [
                    { backdropId: 'task-modal-backdrop', containerId: 'task-modal-container', closeFn: () => closeAddTaskModal(true) },
                    { backdropId: 'project-modal-backdrop', containerId: 'project-modal-container', closeFn: closeProjectModal },
                    { backdropId: 'group-modal-backdrop', containerId: 'group-modal-container', closeFn: closeAddGroupModal },
                    { backdropId: 'delete-modal-backdrop', containerId: 'delete-modal-container', closeFn: closeDeleteModal },
                    { backdropId: 'hold-modal-backdrop', containerId: 'hold-modal-container', closeFn: closeHoldModal },
                    { backdropId: 'archive-modal-backdrop', containerId: 'archive-modal-container', closeFn: closeArchiveModal },
                    { backdropId: 'profile-customizer-backdrop', containerId: 'profile-customizer-container', closeFn: closeProfileCustomizerModal },
                    { backdropId: 'note-modal-backdrop', containerId: 'note-modal-container', closeFn: closeNoteModal }
                ];

                modalBackdrops.forEach(({ backdropId, containerId, closeFn }) => {
                    const backdrop = document.getElementById(backdropId);
                    const container = document.getElementById(containerId);
                    if (backdrop && !backdrop.classList.contains('hidden')) {
                        if (container && !container.contains(e.target) && !e.target.closest(`[onclick*="${backdropId}"]`)) {
                            closeFn();
                        }
                    }
                });

                // Close archive sort dropdown if click is outside
                const archiveSortDD = document.getElementById('archive-sort-dropdown');
                const archiveSortWrapper = document.getElementById('archive-sort-wrapper');
                if (archiveSortDD && !archiveSortDD.classList.contains('hidden')) {
                    if (archiveSortWrapper && !archiveSortWrapper.contains(e.target)) {
                        archiveSortDD.classList.add('hidden');
                    }
                }

                // Close Mobile Drawer if click is outside
                const drawer = document.getElementById('mobile-drawer');
                const drawerBackdrop = document.getElementById('mobile-drawer-backdrop');
                if (drawer && !drawer.classList.contains('hidden') && !drawer.contains(e.target)) {
                    if (drawerBackdrop && !drawerBackdrop.contains(e.target)) {
                        closeMobileDrawer();
                    }
                }

                // Close Inspector Panel if open and click is outside inspector panel & inspector toggles
                const inspector = document.getElementById('inspector-panel');
                if (inspector && !inspector.classList.contains('hidden') && AppState.selectedTaskId !== null) {
                    if (!inspector.contains(e.target) && !e.target.closest('#inspector-backdrop') && !e.target.closest('[data-task-id]') && !e.target.closest('.task-card-item')) {
                        closeInspector();
                    }
                }

                // Close Mobile Sidebar on mobile if expanded and click is outside sidebar & sidebar toggle button
                if (window.innerWidth < 768 && !AppState.sidebarCollapsed) {
                    const sidebar = document.getElementById('sidebar-panel');
                    const toggleBtn = document.getElementById('sidebar-uncollapse-btn');
                    if (sidebar && !sidebar.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
                        closeSidebarMobile();
                    }
                }

                // Close all floating dropdowns and context menus if click is outside
                const floatingMenus = [
                    'sort-dropdown-options',
                    'nav-menu-dropdown-options',
                    'new-task-project-options',
                    'new-task-group-options',
                    'new-task-autodelete-options',
                    'ins-project-dropdown-options',
                    'ins-group-dropdown-options',
                    'ins-autodelete-options',
                    'counter-context-menu',
                    'context-menu',
                    'group-submenu',
                    'group-context-menu',
                    'feed-context-menu',
                    'custom-calendar-popup'
                ];

                floatingMenus.forEach(id => {
                    const menu = document.getElementById(id);
                    if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target)) {
                        const toggleTrigger = e.target.closest(`[onclick*="${id}"]`);
                        if (!toggleTrigger) {
                            hideFloatingElement(menu);
                        }
                    }
                });
            });

            switchTab('inbox');
            lucide.createIcons(); 
            setInterval(checkAndAutoDeleteTasks, 10000);
        }

        function toggleHeaderSearch(event) {
            if (event) event.stopPropagation();
            const searchContainer = document.getElementById('header-search-container');
            const searchInput = document.getElementById('global-search');
            if (!searchContainer || !searchInput) return;

            const isExpanded = searchContainer.style.width === '190px';
            if (isExpanded) {
                searchContainer.style.width = '32px';
                searchInput.classList.add('opacity-0', 'pointer-events-none');
                searchInput.value = '';
                handleSearch('');
            } else {
                searchContainer.style.width = '190px';
                searchInput.classList.remove('opacity-0', 'pointer-events-none');
                searchInput.focus();
            }
        }
        window.toggleHeaderSearch = toggleHeaderSearch;

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
