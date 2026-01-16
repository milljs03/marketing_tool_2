import { db } from "../../config/firebase-config.js";
import { collection, query, where, onSnapshot } from "firebase/firestore";

// Modules
import { renderRequestCampaign } from "./request-campaign.js";
import { renderApprovalQueue } from "./approval-queue.js";

export function renderClientDashboard(container, user) {
    let currentView = 'dashboard';

    const renderShell = () => {
        container.innerHTML = `
            <div class="client-container">
                <header class="client-header">
                    <div class="welcome-text">
                        <h1>${user.email.split('@')[0]}'s Portal</h1>
                        <p>Overview</p>
                    </div>
                    <nav class="client-nav">
                        <button id="nav-dash" class="c-nav-btn ${currentView === 'dashboard' ? 'active' : ''}">Scoreboard</button>
                        <button id="nav-queue" class="c-nav-btn ${currentView === 'queue' ? 'active' : ''}">Approvals</button>
                        <button id="nav-req" class="c-nav-btn ${currentView === 'request' ? 'active' : ''}">New Request</button>
                    </nav>
                </header>

                <div id="client-view-area"></div>
            </div>
        `;

        // Bind Nav
        document.getElementById('nav-dash').onclick = () => switchView('dashboard');
        document.getElementById('nav-queue').onclick = () => switchView('queue');
        document.getElementById('nav-req').onclick = () => switchView('request');
    };

    const switchView = (view) => {
        currentView = view;
        renderShell(); // Re-render header active states
        
        const viewArea = document.getElementById('client-view-area');
        
        if (view === 'dashboard') {
            renderScoreboard(viewArea, user);
        } else if (view === 'queue') {
            renderApprovalQueue(viewArea, user);
        } else if (view === 'request') {
            renderRequestCampaign(viewArea, user);
        }
    };

    // --- Sub-View: Scoreboard (Live Stats) ---
    const renderScoreboard = (target, user) => {
        target.innerHTML = `
            <div class="scoreboard-grid">
                <div class="score-card">
                    <span class="score-label">Total Spend</span>
                    <div class="score-value" id="dash-spend">$0.00</div>
                    <div class="score-trend">Lifetime</div>
                </div>
                <div class="score-card">
                    <span class="score-label">Leads Generated</span>
                    <div class="score-value" id="dash-leads" style="color: var(--c-primary);">0</div>
                    <div class="score-trend">Pipeline</div>
                </div>
                <div class="score-card">
                    <span class="score-label">Active Campaigns</span>
                    <div class="score-value" id="dash-active">0</div>
                    <div class="score-trend">Running</div>
                </div>
            </div>
            
            <div style="background: #e0f2fe; padding: 20px; border-radius: 12px; color: #0c4a6e; display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 1.5rem;">💡</span>
                <div>
                    <strong>Pro Tip:</strong>
                    <span style="font-size: 0.9rem;">Check the "Approvals" tab to review pending creative assets and keep your campaigns moving.</span>
                </div>
            </div>
        `;

        // Live Data
        const q = query(collection(db, "campaigns"), where("clientId", "==", user.uid));
        onSnapshot(q, (snapshot) => {
            let totalSpend = 0;
            let totalLeads = 0;
            let activeCount = 0;

            snapshot.forEach(doc => {
                const d = doc.data();
                totalSpend += (d.spend || 0);
                totalLeads += (d.leads || 0);
                if (d.status === 'active') activeCount++;
            });

            if (document.getElementById('dash-spend')) {
                document.getElementById('dash-spend').textContent = `$${totalSpend.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
                document.getElementById('dash-leads').textContent = totalLeads;
                document.getElementById('dash-active').textContent = activeCount;
            }
        });
    };

    // Init
    renderShell();
    renderScoreboard(document.getElementById('client-view-area'), user);
}