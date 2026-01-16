import { db } from "../../config/firebase-config.js";
import { collection, getDocs } from "firebase/firestore";

export async function renderClientManager(container) {
    // Replaced inline styles with 'toolbar-container' and 'section-title'
    container.innerHTML = `
        <div class="toolbar-container" style="border-radius: var(--radius-lg); margin-bottom: 24px;">
            <h2 class="section-title">Client Roster</h2>
            <button class="btn btn-secondary" onclick="alert('Feature coming soon: Invite Client')">+ Invite New</button>
        </div>
        
        <div class="content-card">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Client</th>
                        <th>Status</th>
                        <th class="th-right">Active Campaigns</th>
                        <th class="th-right">Lifetime Spend</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="client-table-body">
                    <tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">Loading client data...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const clients = [];
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.role !== 'admin') {
                clients.push({ id: doc.id, ...data });
            }
        });

        const campaignsSnap = await getDocs(collection(db, "campaigns"));
        const campaigns = [];
        campaignsSnap.forEach(doc => campaigns.push(doc.data()));

        const tbody = document.getElementById('client-table-body');
        tbody.innerHTML = '';

        if (clients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px;">No clients found.</td></tr>`;
            return;
        }

        clients.forEach(client => {
            const clientCampaigns = campaigns.filter(c => c.clientId === client.id);
            const activeCount = clientCampaigns.filter(c => c.status === 'active').length;
            const lifetimeSpend = clientCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);

            const tr = document.createElement('tr');
            
            // Replaced inline table styles with clean classes
            tr.innerHTML = `
                <td>
                    <div class="font-medium">${client.email}</div>
                    <div class="text-sm text-muted">ID: ${client.id.slice(0,6)}</div>
                </td>
                <td>
                    <span class="status-badge status-completed">Active</span>
                </td>
                <td class="td-right font-bold text-success">
                    ${activeCount}
                </td>
                <td class="td-right font-bold">
                    $${lifetimeSpend.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </td>
                <td class="td-right">
                    <button class="manage-client-btn link-btn" data-id="${client.id}">
                        Manage
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Error loading clients:", err);
        document.getElementById('client-table-body').innerHTML = `<tr><td colspan="5" style="color: var(--danger-color); text-align: center; padding: 20px;">Error loading data.</td></tr>`;
    }
}