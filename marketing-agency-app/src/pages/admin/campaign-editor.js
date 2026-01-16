import { db } from "../../config/firebase-config.js";
import { 
    doc, 
    updateDoc, 
    getDoc, 
    serverTimestamp, 
    addDoc, 
    collection 
} from "firebase/firestore";

export async function openCampaignEditor(campaignId, user) {
    // 1. Create/Get Modal Container with Class
    let modal = document.getElementById('editor-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editor-modal';
        modal.className = 'modal-overlay'; // Using CSS class
        document.body.appendChild(modal);
    }

    // 2. Fetch Data
    const docRef = doc(db, "campaigns", campaignId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
        alert("Error: Campaign not found.");
        return;
    }
    const data = snap.data();

    // 3. Conditional Sections
    const mailerFields = data.zips ? `
        <div class="form-row" style="background: #eff6ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #bfdbfe;">
            <div style="grid-column: span 2; margin-bottom: 5px; color: #1e40af; font-weight: 700;">📬 Direct Mail Details</div>
            <div class="form-group">
                <label>Target Zip Codes</label>
                <input type="text" name="zips" value="${data.zips}" class="input-field">
            </div>
            <div class="form-group">
                <label>Offer</label>
                <input type="text" name="offer" value="${data.offer}" class="input-field">
            </div>
        </div>
    ` : '';

    const eventFields = data.eventName ? `
        <div class="form-row" style="background: #fdf4ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #f5d0fe;">
            <div style="grid-column: span 2; margin-bottom: 5px; color: #701a75; font-weight: 700;">🎟️ Event Details</div>
            <div class="form-group">
                <label>Event Name</label>
                <input type="text" name="eventName" value="${data.eventName}" class="input-field">
            </div>
            <div class="form-group">
                <label>Date & Location</label>
                <input type="text" name="eventDate" value="${data.eventDate}" class="input-field">
            </div>
        </div>
    ` : '';

    // 4. Render Modal Content
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <div style="display: flex; flex-direction: column;">
                    <h3 class="modal-title">Edit: ${data.serviceType}</h3>
                    <span style="font-size: 0.8rem; color: #64748b;">ID: ${campaignId}</span>
                </div>
                <button id="close-editor" class="close-btn">&times;</button>
            </div>
            
            <div class="modal-body">
                <form id="editor-form" class="form-grid">
                    
                    <!-- Top Row -->
                    <div class="form-row">
                        <div class="form-group">
                            <label>Client Email</label>
                            <input type="text" value="${data.clientEmail}" class="input-field" disabled style="background: #f1f5f9;">
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select name="status" class="select-field">
                                <option value="pending_approval" ${data.status === 'pending_approval' ? 'selected' : ''}>Pending</option>
                                <option value="active" ${data.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="paused" ${data.status === 'paused' ? 'selected' : ''}>Paused</option>
                                <option value="awaiting_client" ${data.status === 'awaiting_client' ? 'selected' : ''}>Awaiting Client</option>
                                <option value="completed" ${data.status === 'completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </div>
                    </div>

                    <!-- Auto Pilot & Goals -->
                    <div class="form-row" style="align-items: center;">
                         <div class="form-group">
                            <label>Primary Goal</label>
                            <input type="text" name="goal" value="${data.goal || 'N/A'}" class="input-field">
                        </div>
                         <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" name="autoPilot" ${data.autoPilot ? 'checked' : ''} style="width: 20px; height: 20px;">
                                <span>🚀 Enable Auto-Pilot</span>
                            </label>
                        </div>
                    </div>

                    <!-- Dynamic Sections -->
                    ${mailerFields}
                    ${eventFields}

                    <!-- Metrics Row -->
                    <div class="metrics-panel form-row" style="background: #f8fafc; padding: 16px; border-radius: var(--radius-md);">
                        <div class="form-group">
                            <label>Total Spend ($)</label>
                            <input type="number" name="spend" step="0.01" value="${data.spend || 0}" class="metric-input">
                        </div>
                        <div class="form-group">
                            <label>Leads Generated</label>
                            <input type="number" name="leads" value="${data.leads || 0}" class="metric-input">
                        </div>
                    </div>

                    <!-- Notes -->
                    <div class="form-group">
                        <label>Internal Notes / Strategy</label>
                        <textarea name="notes" rows="4" class="textarea-field">${data.notes || ''}</textarea>
                    </div>

                    <!-- Actions -->
                    <div class="modal-footer">
                        <button type="button" id="cancel-editor" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    // 5. Handlers
    const close = () => modal.style.display = 'none';
    document.getElementById('close-editor').onclick = close;
    document.getElementById('cancel-editor').onclick = close;

    document.getElementById('editor-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        try {
            submitBtn.textContent = "Saving...";
            submitBtn.disabled = true;

            const updates = {
                status: formData.get('status'),
                goal: formData.get('goal'),
                autoPilot: formData.get('autoPilot') === 'on',
                spend: parseFloat(formData.get('spend')),
                leads: parseFloat(formData.get('leads')),
                notes: formData.get('notes'),
                updatedAt: serverTimestamp()
            };

            // Optional Fields
            if (formData.get('zips')) {
                updates.zips = formData.get('zips');
                updates.offer = formData.get('offer');
            }
            if (formData.get('eventName')) {
                updates.eventName = formData.get('eventName');
                updates.eventDate = formData.get('eventDate');
            }

            await updateDoc(docRef, updates);

            await addDoc(collection(db, "campaigns", campaignId, "history"), {
                message: "Edited details via Admin Editor",
                user: user.email,
                timestamp: serverTimestamp()
            });

            close();
        } catch (err) {
            console.error(err);
            alert("Error saving: " + err.message);
            submitBtn.textContent = "Save Changes";
            submitBtn.disabled = false;
        }
    };
}