import { db } from "../../config/firebase-config.js";
import { 
    collection, 
    onSnapshot, 
    doc, 
    updateDoc, 
    query,
    writeBatch
} from "firebase/firestore";

// --- IMPORT MODULES ---
import { openCampaignEditor } from "./campaign-editor.js";
import { renderClientManager } from "./client-manager.js";

export function renderAdminDashboard(container, user) {
    // --- Global State ---
    let state = {
        view: 'pipeline', // 'pipeline' | 'clients'
        filter: 'all',
        search: '',
        selectedIds: new Set(),
        campaignSnapshot: null, 
    };

    // --- Main Layout Shell ---
    const renderShell = () => {
        container.innerHTML = `
            <header class="admin-header">
                <div>
                    <h1 class="page-title">Agency Command Center</h1>
                    <p class="admin-subtitle">Admin: ${user.email}</p>
                </div>
                <div class="nav-container">
                    <button id="nav-pipeline" class="nav-tab ${state.view === 'pipeline' ? 'active' : ''}">
                        📊 Campaign Pipeline
                    </button>
                    <button id="nav-clients" class="nav-tab ${state.view === 'clients' ? 'active' : ''}">
                        👥 Client Manager
                    </button>
                </div>
            </header>

            <div id="main-view-area">
                <!-- Content injected here -->
            </div>
        `;

        document.getElementById('nav-pipeline').addEventListener('click', () => switchView('pipeline'));
        document.getElementById('nav-clients').addEventListener('click', () => switchView('clients'));
    };

    const switchView = (viewName) => {
        state.view = viewName;
        renderShell();
        if (viewName === 'pipeline') initPipelineView();
        else initClientManager();
    };

    // =================================================================================
    // VIEW 1: PIPELINE (Core Dashboard)
    // =================================================================================
    const initPipelineView = () => {
        const viewArea = document.getElementById('main-view-area');
        viewArea.innerHTML = `
            <!-- Bulk Actions Toolbar -->
            <div id="bulk-toolbar" class="bulk-toolbar">
                <div><span style="font-weight: 600;" id="selected-count">0 selected</span></div>
                <div class="bulk-actions">
                    <button data-action="active" class="bulk-btn btn btn-success">Approve All</button>
                    <button data-action="paused" class="bulk-btn btn btn-secondary">Pause All</button>
                    <button data-action="delete" class="bulk-btn btn btn-danger">Delete All</button>
                </div>
            </div>

            <section class="content-card">
                <!-- Toolbar -->
                <div class="toolbar-container">
                    <h2 class="section-title">All Campaigns</h2>
                    <div class="controls-group">
                        <input type="text" id="search-input" value="${state.search}" placeholder="Search client or ID..." class="search-input">
                        <select id="status-filter" class="filter-select">
                            <option value="all" ${state.filter === 'all' ? 'selected' : ''}>All Statuses</option>
                            <option value="pending_approval" ${state.filter === 'pending_approval' ? 'selected' : ''}>Pending</option>
                            <option value="active" ${state.filter === 'active' ? 'selected' : ''}>Active</option>
                            <option value="paused" ${state.filter === 'paused' ? 'selected' : ''}>Paused</option>
                        </select>
                    </div>
                </div>
                <div id="pipeline-list" class="pipeline-list">
                    <p style="color: var(--text-muted); text-align: center;">Loading pipeline data...</p>
                </div>
            </section>
        `;

        // Listeners
        document.getElementById('search-input').addEventListener('input', (e) => { state.search = e.target.value.toLowerCase(); renderPipelineList(); });
        document.getElementById('status-filter').addEventListener('change', (e) => { state.filter = e.target.value; renderPipelineList(); });
        document.querySelectorAll('.bulk-btn').forEach(btn => btn.addEventListener('click', (e) => handleBulkAction(e.target.dataset.action)));

        // Data Subscription
        const q = query(collection(db, "campaigns"));
        onSnapshot(q, (snapshot) => {
            state.campaignSnapshot = snapshot;
            renderPipelineList();
        });
    };

    const renderPipelineList = () => {
        const listContainer = document.getElementById('pipeline-list');
        listContainer.innerHTML = '';

        if (!state.campaignSnapshot || state.campaignSnapshot.empty) {
            listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No campaigns found.</p>';
            return;
        }

        const docs = [];
        state.campaignSnapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));

        const filtered = docs.filter(item => {
            const matchesStatus = state.filter === 'all' || item.status === state.filter;
            const searchStr = `${item.clientEmail} ${item.serviceType} ${item.id}`.toLowerCase();
            const matchesSearch = searchStr.includes(state.search);
            return matchesStatus && matchesSearch;
        }).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        if (filtered.length === 0) {
            listContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted);">No matches found.</p>`;
            return;
        }

        filtered.forEach(data => {
            const cpl = data.leads > 0 ? (data.spend / data.leads).toFixed(2) : '0.00';
            
            // Map status to CSS classes
            const statusMap = {
                'active': 'status-active',
                'pending_approval': 'status-pending',
                'paused': 'status-paused',
                'completed': 'status-completed'
            };
            const statusClass = statusMap[data.status] || 'status-paused';

            // Special Flags
            const autoPilotBadge = data.autoPilot ? `<span class="status-badge" style="background: #0f172a; color: #facc15; border: 1px solid #1e293b;">🚀 Auto-Pilot</span>` : '';
            
            // Goal Tag
            const goalTag = data.goal ? `<span style="font-size: 0.7rem; text-transform: uppercase; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Goal: ${data.goal}</span>` : '';

            // Detail Snippets (Event / Mailer)
            let detailsHtml = '';
            if (data.zips) {
                detailsHtml = `
                    <div style="margin-top: 8px; font-size: 0.85rem; background: #eff6ff; padding: 6px; border-radius: 4px; border: 1px solid #dbeafe; color: #1e3a8a;">
                        <strong>📬 Mailer:</strong> ${data.zips} <br>
                        <span style="font-size: 0.8rem; opacity: 0.9;">Offer: "${data.offer}"</span>
                    </div>
                `;
            }
            if (data.eventName) {
                detailsHtml = `
                    <div style="margin-top: 8px; font-size: 0.85rem; background: #fdf4ff; padding: 6px; border-radius: 4px; border: 1px solid #f0abfc; color: #701a75;">
                        <strong>🎟️ Event:</strong> ${data.eventName} <br>
                        <span style="font-size: 0.8rem; opacity: 0.9;">When: ${data.eventDate}</span>
                    </div>
                `;
            }

            const card = document.createElement('div');
            card.className = 'campaign-card';
            
            card.innerHTML = `
                <input type="checkbox" class="bulk-check" value="${data.id}" ${state.selectedIds.has(data.id) ? 'checked' : ''} style="margin-top: 5px;">
                
                <!-- Info Column -->
                <div>
                    <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span class="status-badge ${statusClass}">
                            ${data.status.replace('_', ' ')}
                        </span>
                        ${autoPilotBadge}
                        ${goalTag}
                    </div>
                    
                    <h3 style="margin: 0 0 4px 0; font-size: 1.1rem; color: var(--text-main); font-weight: 600;">${data.serviceType}</h3>
                    <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">${data.clientEmail || 'Unknown Client'}</p>
                    
                    ${detailsHtml}
                    
                    <div style="margin-top: 8px;">
                        <a href="#" class="edit-link" data-id="${data.id}" style="font-size: 0.8rem;">Edit Full Details &rarr;</a>
                    </div>
                </div>

                <!-- Metrics Column -->
                <div class="metrics-panel">
                    <div class="metrics-grid">
                        <div>
                            <label class="metric-label">SPEND</label>
                            <input type="number" class="metric-input" id="spend-${data.id}" value="${data.spend || 0}">
                        </div>
                        <div>
                            <label class="metric-label">LEADS</label>
                            <input type="number" class="metric-input" id="leads-${data.id}" value="${data.leads || 0}">
                        </div>
                    </div>
                    <div class="metric-footer">
                        <span class="cpl-display">CPL: $${cpl}</span>
                        <button class="save-metrics-btn btn btn-primary btn-sm" data-id="${data.id}">Save</button>
                    </div>
                </div>

                <!-- Actions Column -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${data.status === 'pending_approval' 
                        ? `<button class="action-btn btn btn-success btn-block" data-id="${data.id}" data-action="active">Approve</button>` 
                        : `<button class="action-btn btn btn-secondary btn-block" data-id="${data.id}" data-action="${data.status === 'active' ? 'paused' : 'active'}">${data.status === 'active' ? 'Pause' : 'Resume'}</button>`
                    }
                    ${data.status === 'active' ? 
                      `<button class="action-btn btn btn-secondary btn-block" style="font-size: 0.75rem;" data-id="${data.id}" data-action="awaiting_client">Request Client Approval</button>` 
                      : ''
                    }
                </div>
            `;
            listContainer.appendChild(card);
        });

        attachPipelineListeners();
    };

    const attachPipelineListeners = () => {
        // Bulk Checks
        document.querySelectorAll('.bulk-check').forEach(box => {
            box.addEventListener('change', (e) => {
                e.target.checked ? state.selectedIds.add(e.target.value) : state.selectedIds.delete(e.target.value);
                const toolbar = document.getElementById('bulk-toolbar');
                toolbar.style.display = state.selectedIds.size > 0 ? 'flex' : 'none';
                document.getElementById('selected-count').textContent = `${state.selectedIds.size} selected`;
            });
        });

        // Open Campaign Editor
        document.querySelectorAll('.edit-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                openCampaignEditor(e.target.dataset.id, user);
            });
        });

        // Save Metrics
        document.querySelectorAll('.save-metrics-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const spend = parseFloat(document.getElementById(`spend-${id}`).value) || 0;
                const leads = parseFloat(document.getElementById(`leads-${id}`).value) || 0;
                
                const originalText = btn.textContent;
                btn.textContent = "Saved";
                btn.style.backgroundColor = "var(--success-color)";
                
                await updateDoc(doc(db, "campaigns", id), { spend, leads });
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.backgroundColor = ""; 
                }, 1500);
            });
        });

        // Status Actions
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const { id, action } = e.target.dataset;
                await updateDoc(doc(db, "campaigns", id), { status: action });
            });
        });
    };

    // =================================================================================
    // VIEW 2: CLIENT MANAGER (Imported Logic)
    // =================================================================================
    const initClientManager = () => {
        const viewArea = document.getElementById('main-view-area');
        renderClientManager(viewArea);
    };

    // Helper: Bulk Actions
    async function handleBulkAction(action) {
        if (!confirm(`Apply '${action}' to ${state.selectedIds.size} items?`)) return;
        const batch = writeBatch(db);
        state.selectedIds.forEach(id => {
            const ref = doc(db, "campaigns", id);
            action === 'delete' ? batch.delete(ref) : batch.update(ref, { status: action });
        });
        await batch.commit();
        state.selectedIds.clear();
        document.getElementById('bulk-toolbar').style.display = 'none';
    }

    // Start
    renderShell();
    initPipelineView();
}