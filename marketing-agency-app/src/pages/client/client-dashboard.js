// A placeholder so the app doesn't crash on load
export function renderClientDashboard(container) {
    container.innerHTML = `
        <h1>Client Dashboard</h1>
        <p>Welcome! Here you will see your active campaigns and budget.</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div style="background: white; padding: 20px; border-radius: 8px;">
                <h3>Total Spend</h3>
                <p style="font-size: 2em; font-weight: bold;">$0.00</p>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px;">
                <h3>Leads Generated</h3>
                <p style="font-size: 2em; font-weight: bold;">0</p>
            </div>
        </div>
    `;
}