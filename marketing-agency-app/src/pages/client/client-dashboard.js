import { db } from "../../config/firebase-config.js";
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    onSnapshot, 
    serverTimestamp,
    orderBy 
} from "firebase/firestore";

export function renderClientDashboard(container, user) {
    // 1. Setup the HTML Structure
    container.innerHTML = `
        <header style="margin-bottom: 30px;">
            <h1>My Dashboard</h1>
            <p>Real-time performance metrics and campaign management.</p>
        </header>

        <!-- LIVE SCOREBOARD -->
        <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px;">
            <div class="card" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <h3 style="margin: 0 0 10px 0; font-size: 0.9rem; color: #666; text-transform: uppercase;">Total Spend</h3>
                <p id="total-spend" style="font-size: 2.5rem; font-weight: 700; margin: 0; color: #333;">$0.00</p>
            </div>
            <div class="card" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <h3 style="margin: 0 0 10px 0; font-size: 0.9rem; color: #666; text-transform: uppercase;">Leads Generated</h3>
                <p id="total-leads" style="font-size: 2.5rem; font-weight: 700; margin: 0; color: #2ecc71;">0</p>
            </div>
            <div class="card" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <h3 style="margin: 0 0 10px 0; font-size: 0.9rem; color: #666; text-transform: uppercase;">Est. CPL</h3>
                <p id="avg-cpl" style="font-size: 2.5rem; font-weight: 700; margin: 0; color: #3498db;">$0.00</p>
            </div>
        </section>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px;">
            
            <!-- CAMPAIGN LIST (Approval Queue & Active) -->
            <div>
                <h3 style="border-bottom: 2px solid #eee; padding-bottom: 10px;">My Campaigns</h3>
                <div id="campaign-list" style="margin-top: 20px; display: flex; flex-direction: column; gap: 15px;">
                    <p style="color: #888;">Loading campaigns...</p>
                </div>
            </div>

            <!-- SERVICE CATALOG (Request Form) -->
            <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); height: fit-content;">
                <h3 style="margin-top: 0;">Request New Campaign</h3>
                <p style="font-size: 0.9rem; color: #666; margin-bottom: 20px;">Select a package from the catalog below.</p>
                
                <form id="request-form">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: bold; margin-bottom: 5px;">Service Package</label>
                        <select id="service-type" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ddd;">
                            <option value="Lead Gen - Basic (FB Ads)">Lead Gen - Basic (FB Ads)</option>
                            <option value="Lead Gen - Pro (FB + IG + TikTok)">Lead Gen - Pro (Multi-Channel)</option>
                            <option value="SEO Content Pack">SEO Content Pack (4 Articles)</option>
                            <option value="Email Marketing Automation">Email Automation Setup</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: bold; margin-bottom: 5px;">Monthly Budget</label>
                        <input type="number" id="budget" placeholder="Ex: 1500" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ddd;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: bold; margin-bottom: 5px;">Notes / Goals</label>
                        <textarea id="notes" rows="3" placeholder="Target audience, specific offers..." style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ddd;"></textarea>
                    </div>

                    <button type="submit" style="width: 100%; background: #333; color: white; padding: 12px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                        Submit Request
                    </button>
                </form>
            </div>
        </div>
    `;

    // 2. Logic: Handle Form Submission (Create Request)
    const requestForm = document.getElementById('request-form');
    requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const serviceType = document.getElementById('service-type').value;
        const budget = document.getElementById('budget').value;
        const notes = document.getElementById('notes').value;
        const btn = requestForm.querySelector('button');

        try {
            btn.textContent = "Submitting...";
            btn.disabled = true;

            await addDoc(collection(db, "campaigns"), {
                clientId: user.uid,
                clientEmail: user.email,
                serviceType: serviceType,
                budget: parseFloat(budget) || 0,
                notes: notes,
                status: "pending_approval", // Initial status
                spend: 0,
                leads: 0,
                createdAt: serverTimestamp()
            });

            requestForm.reset();
            alert("Request submitted successfully!");
        } catch (err) {
            console.error(err);
            alert("Error submitting request.");
        } finally {
            btn.textContent = "Submit Request";
            btn.disabled = false;
        }
    });

    // 3. Logic: Real-time Data Listener (The Scoreboard & List)
    const q = query(
        collection(db, "campaigns"), 
        where("clientId", "==", user.uid),
        orderBy("createdAt", "desc") // Requires a Firestore index (check console if it fails)
    );

    // If query fails due to missing index, fallback to no orderBy for now
    // const q = query(collection(db, "campaigns"), where("clientId", "==", user.uid));

    onSnapshot(q, (snapshot) => {
        const listContainer = document.getElementById('campaign-list');
        listContainer.innerHTML = ''; // Clear list

        let totalSpend = 0;
        let totalLeads = 0;

        if (snapshot.empty) {
            listContainer.innerHTML = '<p style="color: #888;">No active campaigns found.</p>';
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Add to totals
            totalSpend += (data.spend || 0);
            totalLeads += (data.leads || 0);

            // Determine Status Color
            let statusColor = '#999'; // Default grey
            if (data.status === 'active') statusColor = '#2ecc71'; // Green
            if (data.status === 'pending_approval') statusColor = '#f1c40f'; // Yellow

            // Render Card
            const card = document.createElement('div');
            card.style.cssText = `background: white; padding: 20px; border-radius: 8px; border-left: 5px solid ${statusColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.05);`;
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; text-transform: uppercase; font-weight: bold;">${data.status.replace('_', ' ')}</span>
                        <h4 style="margin: 10px 0 5px 0; font-size: 1.1rem;">${data.serviceType}</h4>
                        <p style="margin: 0; color: #666; font-size: 0.9rem;">Budget: $${data.budget}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; font-weight: bold; font-size: 1.2rem;">$${data.spend || 0}</p>
                        <span style="font-size: 0.8rem; color: #999;">Spent</span>
                    </div>
                </div>
            `;
            listContainer.appendChild(card);
        });

        // Update Scoreboard Numbers
        document.getElementById('total-spend').textContent = `$${totalSpend.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('total-leads').textContent = totalLeads;
        
        const cpl = totalLeads > 0 ? (totalSpend / totalLeads) : 0;
        document.getElementById('avg-cpl').textContent = `$${cpl.toFixed(2)}`;
    });
}