import { db } from "../../config/firebase-config.js";
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";

export function renderApprovalQueue(container, user) {
    container.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            <div style="margin-bottom: 24px;">
                <h2 style="margin: 0;">Campaign Status & Approvals</h2>
                <p style="color: var(--c-text-muted);">Track your requests and approve assets for deployment.</p>
            </div>
            <div id="queue-list" class="approval-list">
                <p style="text-align: center; color: var(--c-text-muted);">Loading...</p>
            </div>
        </div>
    `;

    // Fetch campaigns for this client
    const q = query(
        collection(db, "campaigns"), 
        where("clientId", "==", user.uid)
    );

    onSnapshot(q, (snapshot) => {
        const listEl = document.getElementById('queue-list');
        listEl.innerHTML = '';

        if (snapshot.empty) {
            listEl.innerHTML = '<div style="text-align: center; padding: 40px; background: white; border-radius: 12px;">No active requests.</div>';
            return;
        }

        const docs = [];
        snapshot.forEach(d => docs.push({id: d.id, ...d.data()}));
        
        // Sort manually (newest first)
        docs.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        docs.forEach(item => {
            const card = document.createElement('div');
            card.className = 'approval-item';

            // Logic for Status Display
            let statusBadge = '';
            let actionArea = '';

            if (item.status === 'pending_approval') {
                statusBadge = `<span class="item-status st-waiting">Waiting for Agency</span>`;
                actionArea = `<span style="font-size: 0.85rem; color: #9ca3af;">Request sent. Agency is reviewing.</span>`;
            } 
            else if (item.status === 'awaiting_client') {
                // This is the key "Approval Queue" state
                statusBadge = `<span class="item-status st-action">Action Required</span>`;
                actionArea = `<button class="action-btn" data-id="${item.id}">Review & Approve</button>`;
            } 
            else if (item.status === 'active') {
                statusBadge = `<span class="item-status st-active">Live</span>`;
                actionArea = `<span style="font-size: 0.85rem; color: #10b981; font-weight: 500;">Running</span>`;
            }
            else {
                statusBadge = `<span class="item-status" style="background: #eee;">${item.status}</span>`;
            }

            card.innerHTML = `
                <div>
                    ${statusBadge}
                    <h3 style="margin: 5px 0 2px 0; font-size: 1.1rem;">${item.serviceType}</h3>
                    <p style="margin: 0; color: var(--c-text-muted); font-size: 0.9rem;">Budget: $${item.budget}</p>
                </div>
                <div>
                    ${actionArea}
                </div>
            `;

            listEl.appendChild(card);
        });

        // Bind Approve Buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if(confirm("Confirm approval? Campaign will go live.")) {
                    await updateDoc(doc(db, "campaigns", id), { status: 'active' });
                }
            });
        });
    });
}