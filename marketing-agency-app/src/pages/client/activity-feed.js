import { db } from "../../config/firebase-config.js";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export function renderActivityFeed(container, user) {
    if (!user.businessId) {
        container.innerHTML = `<div class="empty-state">No business profile linked. Contact support.</div>`;
        return;
    }

    container.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 40px;">
                <h2 style="color: var(--c-text-main); margin: 0 0 10px 0;">Agency Pulse</h2>
                <p style="color: var(--c-text-muted); margin: 0;">Real-time updates on campaign performance and optimizations.</p>
            </div>

            <div id="feed-stream" style="display: flex; flex-direction: column; gap: 20px;">
                <p class="empty-state">Loading pulse...</p>
            </div>
        </div>
    `;

    const q = query(
        collection(db, `businesses/${user.businessId}/activity`),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {
        const stream = document.getElementById('feed-stream');
        if (!stream) return;
        stream.innerHTML = '';

        if (snapshot.empty) {
            stream.innerHTML = `
                <div class="empty-state" style="background: white; padding: 40px; border-radius: 12px; border: 1px solid var(--c-border); text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">📉</div>
                    No recent activity logs. Your campaigns are running smoothly.
                </div>`;
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';
            
            let icon = '📢';
            let iconBg = '#f1f5f9';
            if (data.type === 'milestone') { icon = '🏆'; iconBg = '#dcfce7'; }
            if (data.type === 'strategy') { icon = '🧠'; iconBg = '#e0f2fe'; }
            if (data.type === 'optimization') { icon = '⚡'; iconBg = '#fff7ed'; }

            const item = document.createElement('div');
            item.style.cssText = `background: white; padding: 24px; border-radius: 16px; border: 1px solid var(--c-border); display: flex; gap: 20px; box-shadow: var(--shadow-sm); align-items: start;`;
            
            item.innerHTML = `
                <div style="font-size: 1.5rem; background: ${iconBg}; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    ${icon}
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 700; color: var(--c-text-main); font-size: 1rem;">${data.title || 'Agency Update'}</span>
                        <span style="font-size: 0.75rem; color: var(--c-text-muted); font-weight: 500;">${date}</span>
                    </div>
                    <p style="margin: 0; color: var(--c-text-muted); font-size: 0.95rem; line-height: 1.6;">${data.message}</p>
                    ${data.link ? `<a href="${data.link}" target="_blank" style="display: inline-block; margin-top: 12px; font-size: 0.85rem; color: var(--c-primary); font-weight: 600; text-decoration: none;">View Attached Resource &rarr;</a>` : ''}
                </div>
            `;
            stream.appendChild(item);
        });
    });
}