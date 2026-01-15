// A placeholder so the app doesn't crash on load
export function renderAdminDashboard(container) {
    container.innerHTML = `
        <h1 style="color: #d9534f;">Agency Command Center</h1>
        <p>You are logged in as an ADMIN.</p>
        <button style="padding: 10px 20px; background: #333; color: white;">+ New Client Onboard</button>
        
        <div style="margin-top: 30px;">
            <h3>Active Client Requests</h3>
            <p>No pending requests.</p>
        </div>
    `;
}