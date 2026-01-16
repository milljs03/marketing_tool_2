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

    // 3. Render Modal Content using Classes
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <h3 class="modal-title">Edit Campaign: ${data.serviceType}</h3>
                <button id="close-editor" class="close-btn">&times;</button>
            </div>
            
            <div class="modal-body">
                <form id="editor-form" class="form-grid">
                    
                    <!-- Top Row -->
                    <div class="form-row">
                        <div class="form-group">
                            <label>Service Package</label>
                            <input type="text" name="serviceType" value="${data.serviceType}" class="input-field">
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select name="status" class="select-field">
                                <option value="pending_approval" ${data.status === 'pending_approval' ? 'selected' : ''}>Pending</option>
                                <option value="active" ${data.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="paused" ${data.status === 'paused' ? 'selected' : ''}>Paused</option>
                                <option value="completed" ${data.status === 'completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </div>
                    </div>

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
                        <textarea name="notes" rows="5" class="textarea-field">${data.notes || ''}</textarea>
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

    modal.style.display = 'flex'; // Activates the flex layout defined in CSS

    // 4. Handlers
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
                serviceType: formData.get('serviceType'),
                status: formData.get('status'),
                spend: parseFloat(formData.get('spend')),
                leads: parseFloat(formData.get('leads')),
                notes: formData.get('notes'),
                updatedAt: serverTimestamp()
            };

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