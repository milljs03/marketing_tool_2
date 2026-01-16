import { auth, db } from "../../config/firebase-config.js";
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteField, 
    getDoc 
} from "firebase/firestore";
import { updatePassword, signOut, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

// Modules
import { renderRequestCampaign } from "./request-campaign.js";
import { renderApprovalQueue } from "./approval-queue.js";
import { renderAssetLibrary } from "./asset-library.js";
import { renderActivityFeed } from "./activity-feed.js";

export async function renderClientDashboard(container, user) {
    let currentView = 'dashboard';
    let approvalCount = 0;
    let businessData = null;

    // 1. Fetch Business Profile
    if (user.businessId) {
        try {
            const bizSnap = await getDoc(doc(db, "businesses", user.businessId));
            if (bizSnap.exists()) {
                businessData = bizSnap.data();
            }
        } catch (e) {
            console.error("Error fetching business profile:", e);
        }
    }

    const renderShell = () => {
        let logoHtml = `<div class="avatar" style="width: 50px; height: 50px; background: var(--c-primary); color: white; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-weight: bold; font-size: 1.5rem;">${user.email[0].toUpperCase()}</div>`;
        let portalTitle = "Client Portal";

        if (businessData) {
            if (businessData.logoUrl) {
                logoHtml = `<img src="${businessData.logoUrl}" alt="Logo" style="width: 50px; height: 50px; object-fit: contain; border-radius: 12px; background: white; border: 1px solid #e2e8f0; padding: 2px;">`;
            } else if (businessData.logoIcon) {
                logoHtml = `<div class="avatar" style="width: 50px; height: 50px; background: white; color: #333; border: 1px solid #e2e8f0; font-size: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 12px;">${businessData.logoIcon}</div>`;
            }
            portalTitle = businessData.name;
        }

        container.innerHTML = `
            <div class="client-layout">
                <header class="client-header">
                    <div class="brand-profile">
                        ${logoHtml}
                        <div class="user-info">
                            <h1 class="portal-title">${portalTitle}</h1>
                            <div style="display: flex; align-items: center; gap: 12px; font-size: 0.85rem;">
                                <span class="user-email">${user.email}</span>
                                <span style="color: #cbd5e1;">|</span>
                                <button id="logout-btn" style="background: none; border: none; color: #ef4444; font-weight: 600; cursor: pointer; padding: 0;">Logout</button>
                            </div>
                        </div>
                    </div>
                    
                    <nav class="client-nav">
                        <button id="nav-dash" class="nav-item ${currentView === 'dashboard' ? 'active' : ''}">Overview</button>
                        <button id="nav-assets" class="nav-item ${currentView === 'assets' ? 'active' : ''}">Assets</button>
                        <button id="nav-feed" class="nav-item ${currentView === 'feed' ? 'active' : ''}">Pulse</button>
                        <button id="nav-queue" class="nav-item ${currentView === 'queue' ? 'active' : ''}">
                            Approvals
                            <span id="nav-badge" class="nav-badge" style="display: ${approvalCount > 0 ? 'inline-block' : 'none'}">${approvalCount}</span>
                        </button>
                        <button id="nav-req" class="nav-item ${currentView === 'request' ? 'active' : ''}">New Campaign</button>
                    </nav>
                </header>

                <main id="client-view-area" class="fade-in"></main>
                <div id="pw-modal-container"></div>
            </div>
        `;

        document.getElementById('nav-dash').onclick = () => switchView('dashboard');
        document.getElementById('nav-assets').onclick = () => switchView('assets');
        document.getElementById('nav-feed').onclick = () => switchView('feed');
        document.getElementById('nav-queue').onclick = () => switchView('queue');
        document.getElementById('nav-req').onclick = () => switchView('request');
        document.getElementById('logout-btn').onclick = () => signOut(auth);
    };

    const switchView = (view) => {
        currentView = view;
        renderShell();
        const viewArea = document.getElementById('client-view-area');
        
        if (view === 'dashboard') renderScoreboard(viewArea, user);
        else if (view === 'assets') renderAssetLibrary(viewArea, user);
        else if (view === 'feed') renderActivityFeed(viewArea, user);
        else if (view === 'queue') renderApprovalQueue(viewArea, user);
        else if (view === 'request') renderRequestCampaign(viewArea, user);
    };

    const initNotifications = () => {
        const q = query(collection(db, "campaigns"), where("clientId", "==", user.uid), where("status", "==", "awaiting_client"));
        onSnapshot(q, (snap) => {
            approvalCount = snap.size;
            const badge = document.getElementById('nav-badge');
            if(badge) {
                badge.style.display = approvalCount > 0 ? 'inline-block' : 'none';
                badge.textContent = approvalCount;
            }
        });
    };

    const enforcePasswordReset = () => {
        if (!user.tempPassword) return;
        const modalContainer = document.getElementById('pw-modal-container');
        if (!modalContainer) return;
        modalContainer.innerHTML = `<div class="modal-overlay" style="display: flex; background: rgba(15, 23, 42, 0.9); z-index: 9999;"><div class="modal-card" style="max-width: 420px; border: 1px solid #ef4444;"><div class="modal-header" style="background: #fef2f2; color: #b91c1c; border-bottom: 1px solid #fecaca;"><h3 class="modal-title">⚠️ Security Update Required</h3></div><div class="modal-body"><p style="font-size: 0.95rem; color: #4b5563; margin-bottom: 20px; line-height: 1.5;">Please verify your temporary password and create a new one.</p><form id="pw-reset-form"><div class="form-group"><label class="c-label">Current (Temp) Password</label><input type="password" id="current-pw" class="c-input" required></div><div class="form-group"><label class="c-label">New Secure Password</label><input type="password" id="new-pw" class="c-input" required minlength="6"></div><button type="submit" class="c-btn c-btn-primary" style="background: #b91c1c;">Update Password</button></form></div></div></div>`;
        document.getElementById('pw-reset-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const cred = EmailAuthProvider.credential(auth.currentUser.email, document.getElementById('current-pw').value);
                await reauthenticateWithCredential(auth.currentUser, cred);
                await updatePassword(auth.currentUser, document.getElementById('new-pw').value);
                await updateDoc(doc(db, "users", user.uid), { tempPassword: deleteField(), status: 'active' });
                alert("Password updated!");
                modalContainer.innerHTML = "";
            } catch (err) { alert(err.message); }
        });
    };

    const renderScoreboard = (target, user) => {
        target.innerHTML = `
            <div class="dashboard-grid" style="grid-template-columns: 2fr 1fr; align-items: start;">
                
                <!-- LEFT COL: Stats, Calendar, Table -->
                <div style="display: flex; flex-direction: column; gap: 30px;">
                    
                    <!-- High-Level Stats -->
                    <div class="stats-row">
                        <div class="stat-card">
                            <span class="stat-label">Total Spend</span>
                            <div class="stat-value" id="dash-spend">$0.00</div>
                            <div class="stat-context">Lifetime Investment</div>
                        </div>
                        <div class="stat-card primary-border">
                            <span class="stat-label">Total Leads</span>
                            <div class="stat-value text-primary" id="dash-leads">0</div>
                            <div class="stat-context">Pipeline Volume</div>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Efficiency</span>
                            <div class="stat-value" id="dash-cpl">$0.00</div>
                            <div class="stat-context">Avg. Cost Per Lead</div>
                        </div>
                    </div>

                    <!-- Enhanced Calendar -->
                    <div class="table-card">
                        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                            <h3>Campaign Calendar</h3>
                            <span style="font-size:0.8rem; color:#64748b; background:#f1f5f9; padding:4px 8px; border-radius:6px;">
                                ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <div style="padding: 20px;">
                            <div class="calendar-legend" style="display: flex; gap: 15px; margin-bottom: 15px; font-size: 0.75rem; color: #64748b;">
                                <div style="display:flex; align-items:center; gap:5px;"><span style="width:8px; height:8px; background:#3b82f6; border-radius:50%;"></span> Launch</div>
                                <div style="display:flex; align-items:center; gap:5px;"><span style="width:8px; height:8px; background:#10b981; border-radius:50%;"></span> Active</div>
                                <div style="display:flex; align-items:center; gap:5px;"><span style="width:8px; height:8px; background:#f59e0b; border-radius:50%;"></span> Optimization</div>
                            </div>
                            <div id="calendar-grid" class="calendar-grid">Loading Calendar...</div>
                        </div>
                    </div>
                    
                    <!-- Detailed Campaign Table -->
                    <div class="table-card">
                        <div class="card-header"><h3>Active Campaigns</h3></div>
                        <div class="table-responsive">
                            <table class="client-table">
                                <thead>
                                    <tr>
                                        <th>Service</th>
                                        <th class="text-right">Budget</th>
                                        <th class="text-right">Spend</th>
                                        <th class="text-right">Leads</th>
                                        <th class="text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody id="dash-table-body">
                                    <tr><td colspan="5" class="empty-state">Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- RIGHT COL: Insights & Velocity -->
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    
                    <!-- Pacing / Velocity Widget -->
                    <div style="background: white; border:1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <h4 style="margin: 0 0 15px 0; color: #1e293b; font-size: 0.9rem; text-transform: uppercase;">Monthly Pacing</h4>
                        
                        <!-- Days Elapsed -->
                        <div style="margin-bottom: 15px;">
                            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px; color:#64748b;">
                                <span>Time Elapsed</span>
                                <span id="time-pct-txt">0%</span>
                            </div>
                            <div style="background:#f1f5f9; height:6px; border-radius:3px; overflow:hidden;">
                                <div id="time-bar" style="height:100%; background:#94a3b8; width:0%;"></div>
                            </div>
                        </div>

                        <!-- Budget Used -->
                        <div style="margin-bottom: 20px;">
                            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px; color:#64748b;">
                                <span>Budget Utilization</span>
                                <span id="budget-pct-txt">0%</span>
                            </div>
                            <div style="background:#f1f5f9; height:6px; border-radius:3px; overflow:hidden;">
                                <div id="budget-bar" style="height:100%; background:#3b82f6; width:0%;"></div>
                            </div>
                        </div>

                        <div id="pacing-status" style="font-size:0.85rem; padding:10px; background:#f0f9ff; color:#0369a1; border-radius:6px; text-align:center;">
                            Analyzing velocity...
                        </div>
                    </div>

                    <!-- Channel Breakdown -->
                    <div style="background: white; border:1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                        <h4 style="margin: 0 0 15px 0; color: #1e293b; font-size: 0.9rem; text-transform: uppercase;">Budget Allocation</h4>
                        <div id="channel-breakdown" style="display:flex; flex-direction:column; gap:10px;">
                            <!-- Dynamic Bars -->
                        </div>
                    </div>

                    <!-- Upsell / Scale -->
                    <div style="background: #1e1b4b; color: white; padding: 24px; border-radius: 12px;">
                        <h4 style="margin: 0; color: #a5b4fc;">Growth Mode</h4>
                        <p style="font-size: 0.85rem; color: #e0e7ff; margin: 8px 0 16px 0;">Ready to scale? Increase volume instantly with Auto-Pilot.</p>
                        <button id="quick-scale-btn" style="background: #4f46e5; border: none; color: white; padding: 10px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%;">Scale Campaign</button>
                    </div>

                </div>
            </div>
        `;

        document.getElementById('quick-scale-btn').onclick = () => document.getElementById('nav-req').click();

        const q = query(collection(db, "campaigns"), where("clientId", "==", user.uid));
        onSnapshot(q, (snapshot) => {
            let totalSpend = 0;
            let totalLeads = 0;
            let activeBudget = 0;
            let activeSpend = 0;
            const activeCampaigns = [];
            const channelSpend = {}; // { 'Facebook': 500, 'Google': 200 }

            snapshot.forEach(doc => {
                const d = doc.data();
                totalSpend += (d.spend || 0);
                totalLeads += (d.leads || 0);
                
                // Track stats for Active Campaigns
                if (d.status === 'active' || d.status === 'paused') {
                    activeCampaigns.push({ id: doc.id, ...d });
                    activeBudget += (d.budget || 0);
                    activeSpend += (d.spend || 0);

                    // Channel Logic
                    const type = d.serviceType.split(' ')[0] || 'Other';
                    channelSpend[type] = (channelSpend[type] || 0) + (d.budget || 0);
                }
            });

            // 1. Scoreboard Update
            if(document.getElementById('dash-spend')) {
                document.getElementById('dash-spend').textContent = `$${totalSpend.toLocaleString()}`;
                document.getElementById('dash-leads').textContent = totalLeads;
                const cpl = totalLeads > 0 ? (totalSpend/totalLeads).toFixed(2) : "0.00";
                document.getElementById('dash-cpl').textContent = `$${cpl}`;
            }

            // 2. Pacing Logic
            const date = new Date();
            const dayOfMonth = date.getDate();
            const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
            const timePct = (dayOfMonth / daysInMonth) * 100;
            
            const budgetPct = activeBudget > 0 ? (activeSpend / activeBudget) * 100 : 0;

            if(document.getElementById('time-bar')) {
                document.getElementById('time-bar').style.width = `${timePct}%`;
                document.getElementById('time-pct-txt').textContent = `${Math.round(timePct)}%`;
                
                document.getElementById('budget-bar').style.width = `${budgetPct}%`;
                document.getElementById('budget-pct-txt').textContent = `${Math.round(budgetPct)}%`;

                const statusEl = document.getElementById('pacing-status');
                if (budgetPct > timePct + 10) {
                    statusEl.style.background = '#fef2f2';
                    statusEl.style.color = '#991b1b';
                    statusEl.textContent = "🔥 Pacing High (Aggressive Spend)";
                } else if (budgetPct < timePct - 10) {
                    statusEl.style.background = '#fffbeb';
                    statusEl.style.color = '#92400e';
                    statusEl.textContent = "🐢 Pacing Low (Under Budget)";
                } else {
                    statusEl.style.background = '#f0fdf4';
                    statusEl.style.color = '#166534';
                    statusEl.textContent = "✅ Perfectly On Track";
                }
            }

            // 3. Channel Mix Bars
            const channelContainer = document.getElementById('channel-breakdown');
            if(channelContainer) {
                channelContainer.innerHTML = '';
                if (activeBudget === 0) {
                    channelContainer.innerHTML = '<div style="font-size:0.8rem; color:#999;">No active budget allocated.</div>';
                } else {
                    Object.keys(channelSpend).forEach(key => {
                        const pct = (channelSpend[key] / activeBudget) * 100;
                        channelContainer.innerHTML += `
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:2px; color:#475569;">
                                    <span>${key}</span>
                                    <span>${Math.round(pct)}%</span>
                                </div>
                                <div style="background:#f1f5f9; height:4px; border-radius:2px; overflow:hidden;">
                                    <div style="height:100%; width:${pct}%; background:#6366f1;"></div>
                                </div>
                            </div>
                        `;
                    });
                }
            }

            // 4. Update Table
            const tbody = document.getElementById('dash-table-body');
            if(tbody) {
                if(activeCampaigns.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No active campaigns.</td></tr>`;
                } else {
                    tbody.innerHTML = activeCampaigns.map(c => `
                        <tr>
                            <td class="fw-bold">${c.serviceType}</td>
                            <td class="text-right">$${c.budget.toLocaleString()}</td>
                            <td class="text-right">$${(c.spend||0).toLocaleString()}</td>
                            <td class="text-right">${c.leads || 0}</td>
                            <td class="text-right"><span class="status-pill"><span class="status-dot status-dot-active"></span>Active</span></td>
                        </tr>
                    `).join('');
                }
            }

            // 5. Render Dynamic Calendar
            renderCalendar(document.getElementById('calendar-grid'), activeCampaigns);
        });
    };

    const renderCalendar = (gridEl, activeCampaigns = []) => {
        if(!gridEl) return;
        gridEl.innerHTML = '';
        
        // Setup Grid
        const days = ['Su','Mo','Tu','We','Th','Fr','Sa'];
        days.forEach(d => {
            const h = document.createElement('div');
            h.className = 'cal-day-header';
            h.textContent = d;
            gridEl.appendChild(h);
        });

        const date = new Date();
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        const today = date.getDate();

        // Empty slots
        for(let i=0; i<firstDay; i++) {
            gridEl.appendChild(document.createElement('div'));
        }

        // Days
        for(let i=1; i<=daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = `cal-day ${i === today ? 'today' : ''} ${i < today ? 'active-day' : ''}`;
            
            // Events Logic
            let dots = '';
            
            // 1. Weekly Optimizations (Fridays)
            const currentDayObj = new Date(date.getFullYear(), date.getMonth(), i);
            if (currentDayObj.getDay() === 5 && i <= today) { // 5 is Friday
                dots += `<span title="Weekly Optimization" style="width:6px; height:6px; background:#f59e0b; border-radius:50%; display:block;"></span>`;
            }

            // 2. Campaign Start Dates
            activeCampaigns.forEach(c => {
                if (c.createdAt) {
                    const startDate = new Date(c.createdAt.seconds * 1000);
                    if (startDate.getMonth() === date.getMonth() && startDate.getDate() === i) {
                        dots += `<span title="Campaign Launch: ${c.serviceType}" style="width:6px; height:6px; background:#3b82f6; border-radius:50%; display:block;"></span>`;
                    }
                }
            });

            dayEl.innerHTML = `
                <span class="cal-number">${i}</span>
                <div style="display:flex; gap:2px; justify-content:center; margin-top:2px;">
                    ${dots}
                </div>
            `;
            gridEl.appendChild(dayEl);
        }
    };

    renderShell();
    renderScoreboard(document.getElementById('client-view-area'), user);
    initNotifications();
    enforcePasswordReset();
}