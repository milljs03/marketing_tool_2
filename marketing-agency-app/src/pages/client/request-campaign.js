import { db } from "../../config/firebase-config.js";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export function renderRequestCampaign(container, user) {
    container.innerHTML = `
        <div class="request-form-card">
            <h2 style="margin-top: 0; color: var(--c-primary);">Start New Campaign</h2>
            <p style="color: var(--c-text-muted); margin-bottom: 24px;">Submit a brief to the agency team. We'll review and get back to you within 24 hours.</p>

            <form id="client-request-form">
                <div class="form-group">
                    <label class="c-label">Service Package</label>
                    <select id="req-service" class="c-select">
                        <option value="Lead Gen - Facebook Ads">Lead Gen - Facebook Ads</option>
                        <option value="Lead Gen - Google Ads">Lead Gen - Google Search</option>
                        <option value="Social Media Content (12 Posts)">Social Media Content (12 Posts)</option>
                        <option value="Email Sequence">Email Marketing Sequence</option>
                        <option value="Custom Project">Custom Project</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="c-label">Estimated Monthly Budget</label>
                    <input type="number" id="req-budget" class="c-input" placeholder="e.g. 1500" min="500">
                </div>

                <div class="form-group">
                    <label class="c-label">Goals & Notes</label>
                    <textarea id="req-notes" class="c-textarea" rows="4" placeholder="Describe your offer, target audience, or specific goals..."></textarea>
                </div>

                <button type="submit" class="c-btn c-btn-primary">Submit Request</button>
            </form>
        </div>
    `;

    document.getElementById('client-request-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const service = document.getElementById('req-service').value;
        const budget = document.getElementById('req-budget').value;
        const notes = document.getElementById('req-notes').value;

        if(!budget) { alert("Please enter a budget."); return; }

        try {
            btn.textContent = "Sending...";
            btn.disabled = true;

            await addDoc(collection(db, "campaigns"), {
                clientId: user.uid,
                clientEmail: user.email,
                serviceType: service,
                budget: parseFloat(budget),
                notes: notes,
                status: "pending_approval", // Logic: Needs Admin Review
                spend: 0,
                leads: 0,
                createdAt: serverTimestamp()
            });

            alert("Request received! Check the Approval Queue for updates.");
            // Reset form
            document.getElementById('client-request-form').reset();
            btn.textContent = "Submit Request";
            btn.disabled = false;
        } catch (err) {
            console.error(err);
            alert("Error submitting. Please try again.");
            btn.textContent = "Submit Request";
            btn.disabled = false;
        }
    });
}