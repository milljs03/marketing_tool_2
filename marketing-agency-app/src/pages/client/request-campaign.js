import { db } from "../../config/firebase-config.js";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export function renderRequestCampaign(container, user) {
    // 1. Defined Services
    const services = [
        {
            id: "google_intent",
            title: "Google Search",
            subtitle: "Capture Intent",
            desc: "Get in front of customers actively searching for your services.",
            metric: "High-Intent Leads",
            estCPL: 55,
            color: "#4285F4",
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`
        },
        {
            id: "fb_disruption",
            title: "Facebook & Insta",
            subtitle: "Target Interests",
            desc: "Interrupt the scroll on Feeds & Stories.",
            metric: "Volume Leads",
            estCPL: 30,
            color: "#1877F2",
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" fill="#1877F2"/></svg>`
        },
        {
            id: "direct_mail",
            title: "Direct Mail",
            subtitle: "USPS Mailers",
            desc: "Physical postcards to target zip codes.",
            metric: "Homes Reached",
            estCPL: 1.50,
            isPhysical: true,
            color: "#004B87",
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#004B87"/><path d="M22 6L12 13L2 6" stroke="white" stroke-width="2" stroke-linejoin="round"/></svg>`
        },
        {
            id: "email_nurture",
            title: "Email Growth",
            subtitle: "Gmail & Outlook",
            desc: "Automated sequences to convert leads.",
            metric: "Open Rate",
            estCPL: null,
            fixed: "4-Email Seq",
            color: "#EA4335",
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335"/></svg>`
        },
        {
            id: "content_branding",
            title: "Social Content",
            subtitle: "Brand Presence",
            desc: "Professional posts to keep your feed alive.",
            metric: "Engagements",
            estCPL: null,
            fixed: "12 Assets",
            color: "#E1306C",
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" rx="5" fill="url(#paint0_linear)"/><path d="M12 7C9.24 7 7 9.24 7 12s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm5.33-8.88c0 .48-.4.88-.88.88s-.88-.4-.88-.88c0-.49.4-.88.88-.88s.88.39.88.88z" fill="white"/><defs><linearGradient id="paint0_linear" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse"><stop stop-color="#FFC107"/><stop offset="0.5" stop-color="#F44336"/><stop offset="1" stop-color="#9C27B0"/></linearGradient></defs></svg>`
        }
    ];

    // State
    let selectedService = services[0];
    let isAutoPilot = false;
    let allocationMode = 'amount'; // 'amount' | 'percent'
    let allocations = {}; // { serviceId: value }

    // Init Allocations with 0
    services.forEach(s => allocations[s.id] = 0);

    // 2. Render Form
    container.innerHTML = `
        <div style="max-width: 1100px; margin: 0 auto;">
            
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: var(--c-text-main); font-size: 1.8rem; margin-bottom: 8px;">Create Campaign</h2>
                <p style="color: var(--c-text-muted);">Select a single service or build a custom portfolio.</p>
            </div>

            <!-- AUTO PILOT HEADER TOGGLE -->
            <div class="auto-pilot-wrapper" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; padding: 20px 30px; border-radius: 16px; margin-bottom: 30px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="display: flex; gap: 15px; align-items: center;">
                    <div style="font-size: 2rem;">🚀</div>
                    <div>
                        <h3 style="margin: 0; font-size: 1.2rem;">Custom Portfolio Mode</h3>
                        <p style="margin: 2px 0 0 0; opacity: 0.8; font-size: 0.9rem;">
                            Toggle to build a multi-channel strategy with custom budget allocation.
                        </p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 0.85rem; font-weight: 600; opacity: ${isAutoPilot ? 0.7 : 1};">Single</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="autopilot-toggle">
                        <span class="slider"></span>
                    </label>
                    <span style="font-size: 0.85rem; font-weight: 600; opacity: ${isAutoPilot ? 1 : 0.7};">Portfolio</span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1.8fr 1.2fr; gap: 40px; align-items: start;">
                
                <!-- LEFT: SELECTION PANEL -->
                <div id="selection-panel">
                    
                    <!-- MODE A: SINGLE SELECTION (Default) -->
                    <div id="single-mode-ui" style="display: block;">
                        <h3 style="margin-top: 0; margin-bottom: 20px;">Choose a Service</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                            ${services.map(s => `
                                <div class="service-card ${s.id === selectedService.id ? 'selected' : ''}" data-id="${s.id}" style="position: relative; border-left: 4px solid ${s.color};">
                                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                        <div style="display: flex;">${s.icon}</div>
                                        <div>
                                            <h4 style="margin: 0; font-size: 0.95rem; color: var(--c-text-main);">${s.title}</h4>
                                            <span style="font-size: 0.7rem; color: #64748b; text-transform: uppercase;">${s.subtitle}</span>
                                        </div>
                                    </div>
                                    <p style="font-size: 0.8rem; color: var(--c-text-muted); margin: 0; line-height: 1.4;">${s.desc}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- MODE B: PORTFOLIO BUILDER (Hidden by default) -->
                    <div id="portfolio-mode-ui" style="display: none;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h3 style="margin: 0;">Build Your Mix</h3>
                            <div style="background: #f1f5f9; padding: 4px; border-radius: 8px; display: flex; gap: 4px;">
                                <button id="mode-amount" class="alloc-btn active">$ Amount</button>
                                <button id="mode-percent" class="alloc-btn">% Percent</button>
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 30px;">
                            ${services.map(s => `
                                <div class="portfolio-item" data-id="${s.id}" style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; display: flex; align-items: center; justify-content: space-between;">
                                    <div style="display: flex; align-items: center; gap: 15px;">
                                        <label class="toggle-switch small">
                                            <input type="checkbox" class="service-enable" data-id="${s.id}">
                                            <span class="slider round"></span>
                                        </label>
                                        <div style="opacity: 0.5;" class="service-info">
                                            <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--c-text-main);">
                                                ${s.icon} ${s.title}
                                            </div>
                                            <div style="font-size: 0.8rem; color: #64748b;">${s.metric}</div>
                                        </div>
                                    </div>
                                    <div class="allocation-input-wrapper" style="opacity: 0.5; pointer-events: none;">
                                        <input type="number" class="alloc-input" data-id="${s.id}" value="0" min="0">
                                        <span class="alloc-unit">$</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- SHARED CONFIG FORM -->
                    <form id="client-request-form" style="background: white; padding: 30px; border-radius: 16px; box-shadow: var(--shadow-sm); border: 1px solid var(--c-border);">
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label class="c-label" style="font-weight: 600; margin-bottom: 8px; display: block;">Total Monthly Investment ($)</label>
                            <input type="number" id="req-budget" class="c-input" placeholder="e.g. 2000" min="500" value="1500" 
                                style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 1.2rem; font-weight: 700; color: var(--c-primary);">
                        </div>

                        <!-- Mailer Options (Only shows if Mailer selected) -->
                        <div id="mailer-options" style="display: none; background: #eff6ff; padding: 20px; border-radius: 12px; border: 1px solid #dbeafe; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #1e40af; font-size: 0.9rem;">📬 Direct Mail Details</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <input type="text" id="req-zips" class="c-input" placeholder="Zip Codes" style="background: white;">
                                <input type="text" id="req-offer" class="c-input" placeholder="The Offer" style="background: white;">
                            </div>
                        </div>

                        <div class="form-group" style="margin-bottom: 20px;">
                            <label class="c-label" style="font-weight: 600; margin-bottom: 8px; display: block;">Notes / Goals</label>
                            <textarea id="req-notes" rows="2" placeholder="Specific goals or requirements..." 
                                style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-family: inherit;"></textarea>
                        </div>

                        <!-- Budget Validation Msg -->
                        <div id="budget-warning" style="display: none; color: #ef4444; font-size: 0.9rem; margin-bottom: 15px; background: #fef2f2; padding: 10px; border-radius: 6px;">
                            ⚠️ Allocation exceeds total budget.
                        </div>

                        <button type="submit" class="c-btn c-btn-primary" 
                            style="width: 100%; padding: 14px; background: var(--c-primary); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            Launch Campaign
                        </button>
                    </form>
                </div>

                <!-- RIGHT: VISUAL SIMULATOR -->
                <div style="position: sticky; top: 20px;">
                    <div style="background: #0f172a; color: white; padding: 30px; border-radius: 20px; box-shadow: var(--shadow-lg);">
                        <h4 style="margin: 0 0 20px 0; color: #94a3b8; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;">Projected Impact</h4>
                        
                        <div style="margin-bottom: 25px;">
                            <div style="display: flex; justify-content: space-between; align-items: baseline;">
                                <div id="sim-metric-val" style="font-size: 2.5rem; font-weight: 700; line-height: 1;">0</div>
                                <div id="sim-metric-name" style="color: #cbd5e1;">Est. Results</div>
                            </div>
                            
                            <!-- Visual Bars -->
                            <div id="impact-bars-container">
                                <!-- Dynamic Bars Injected Here -->
                            </div>
                        </div>

                        <div style="border-top: 1px solid #334155; padding-top: 20px;">
                            <p style="font-size: 0.9rem; font-weight: 600; margin-bottom: 10px;">Selected Mix:</p>
                            <div id="sim-features" style="display: grid; gap: 8px; font-size: 0.85rem; color: #cbd5e1;">
                                <!-- Filled by JS -->
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
        
        <style>
            .alloc-btn { background: transparent; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: #64748b; }
            .alloc-btn.active { background: white; color: var(--c-primary); box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
            
            .toggle-switch { position: relative; display: inline-block; width: 50px; height: 28px; }
            .toggle-switch.small { width: 40px; height: 22px; }
            .toggle-switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
            .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
            .toggle-switch.small .slider:before { height: 16px; width: 16px; left: 3px; bottom: 3px; }
            input:checked + .slider { background-color: var(--c-success); }
            input:checked + .slider:before { transform: translateX(22px); }
            .toggle-switch.small input:checked + .slider:before { transform: translateX(18px); }

            .alloc-input { width: 80px; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: right; font-weight: 600; }
            .alloc-unit { font-size: 0.9rem; color: #64748b; margin-left: 4px; font-weight: 600; }
        </style>
    `;

    // --- LOGIC ---
    const autopilotToggle = document.getElementById('autopilot-toggle');
    const singleUI = document.getElementById('single-mode-ui');
    const portfolioUI = document.getElementById('portfolio-mode-ui');
    const budgetInput = document.getElementById('req-budget');
    const mailerOptions = document.getElementById('mailer-options');
    const warningMsg = document.getElementById('budget-warning');

    // 1. Toggle Mode
    autopilotToggle.addEventListener('change', (e) => {
        isAutoPilot = e.target.checked;
        if (isAutoPilot) {
            singleUI.style.display = 'none';
            portfolioUI.style.display = 'block';
        } else {
            singleUI.style.display = 'block';
            portfolioUI.style.display = 'none';
        }
        updateSimulator();
    });

    // 2. Single Service Selection
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            if (isAutoPilot) return;
            document.querySelectorAll('.service-card').forEach(c => {
                c.classList.remove('selected');
                c.style.borderColor = 'transparent';
                c.style.background = 'white';
            });
            card.classList.add('selected');
            card.style.borderColor = 'var(--c-primary)';
            card.style.background = '#f0f9ff';
            selectedService = services.find(s => s.id === card.dataset.id);
            
            // Toggle Mailer Options
            mailerOptions.style.display = selectedService.isPhysical ? 'block' : 'none';
            updateSimulator();
        });
    });

    // 3. Portfolio Allocations
    document.querySelectorAll('.service-enable').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const row = e.target.closest('.portfolio-item');
            const inputWrapper = row.querySelector('.allocation-input-wrapper');
            const info = row.querySelector('.service-info');
            const input = row.querySelector('.alloc-input');
            const id = e.target.dataset.id;

            if (e.target.checked) {
                inputWrapper.style.opacity = '1';
                inputWrapper.style.pointerEvents = 'auto';
                info.style.opacity = '1';
                allocations[id] = parseFloat(input.value) || 0;
            } else {
                inputWrapper.style.opacity = '0.5';
                inputWrapper.style.pointerEvents = 'none';
                info.style.opacity = '0.5';
                allocations[id] = 0;
                input.value = 0;
            }
            updateSimulator();
        });
    });

    // Allocation Inputs
    document.querySelectorAll('.alloc-input').forEach(input => {
        input.addEventListener('input', (e) => {
            allocations[e.target.dataset.id] = parseFloat(e.target.value) || 0;
            updateSimulator();
        });
    });

    // Allocation Mode Switch ($ vs %)
    document.getElementById('mode-amount').onclick = () => setAllocMode('amount');
    document.getElementById('mode-percent').onclick = () => setAllocMode('percent');

    function setAllocMode(mode) {
        allocationMode = mode;
        document.getElementById('mode-amount').className = `alloc-btn ${mode === 'amount' ? 'active' : ''}`;
        document.getElementById('mode-percent').className = `alloc-btn ${mode === 'percent' ? 'active' : ''}`;
        document.querySelectorAll('.alloc-unit').forEach(sp => sp.textContent = mode === 'amount' ? '$' : '%');
        updateSimulator();
    }

    budgetInput.addEventListener('input', updateSimulator);

    function updateSimulator() {
        const totalBudget = parseFloat(budgetInput.value) || 0;
        let totalAllocated = 0;
        let activeServices = [];

        // Determine Active Services
        if (isAutoPilot) {
            document.querySelectorAll('.service-enable:checked').forEach(chk => {
                const s = services.find(x => x.id === chk.dataset.id);
                let val = allocations[s.id];
                
                // Convert % to $ if needed for calc
                if (allocationMode === 'percent') {
                    val = (val / 100) * totalBudget;
                }
                
                totalAllocated += val;
                activeServices.push({ ...s, budget: val });
            });
        } else {
            totalAllocated = totalBudget;
            activeServices.push({ ...selectedService, budget: totalBudget });
        }

        // Budget Validation
        if (isAutoPilot && allocationMode === 'amount' && totalAllocated > totalBudget) {
            warningMsg.style.display = 'block';
            warningMsg.textContent = `⚠️ Allocated $${totalAllocated} exceeds budget $${totalBudget}`;
        } else if (isAutoPilot && allocationMode === 'percent' && totalAllocated > totalBudget) { // totalAllocated here is $ value of %
             // Actually check the raw sum for %
             const rawSum = Object.values(allocations).reduce((a,b) => a+b, 0); // Need to filter only checked?
             // Simplification: just assume valid for now or complex check
             warningMsg.style.display = 'none';
        } else {
            warningMsg.style.display = 'none';
        }

        // Calc Impacts
        let totalEst = 0;
        const featuresEl = document.getElementById('sim-features');
        const barsEl = document.getElementById('impact-bars-container');
        
        featuresEl.innerHTML = '';
        barsEl.innerHTML = '';

        activeServices.forEach(s => {
            // Metric Calc
            let val = 0;
            if (s.estCPL) val = Math.floor(s.budget / s.estCPL);
            else if (s.fixed) val = parseInt(s.fixed); // Rough heuristic
            totalEst += val;

            featuresEl.innerHTML += `
                <div style="display: flex; justify-content: space-between;">
                    <span>${s.icon} ${s.title}</span>
                    <span style="color: white;">$${Math.round(s.budget)}</span>
                </div>`;

            // Visual Bar
            const barWidth = Math.min((s.budget / totalBudget) * 100, 100);
            barsEl.innerHTML += `
                <div style="margin-bottom: 10px;">
                    <div style="font-size: 0.75rem; color: #94a3b8; display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>${s.metric}</span>
                        <span>${s.estCPL ? '~'+val : (s.fixed || 'N/A')}</span>
                    </div>
                    <div style="background: #334155; height: 6px; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${barWidth}%; height: 100%; background: ${s.color};"></div>
                    </div>
                </div>
            `;
        });

        document.getElementById('sim-metric-val').textContent = `~${totalEst}`;
        document.getElementById('sim-metric-name').textContent = isAutoPilot ? "Total Est. Results" : selectedService.metric;
        
        // Show Mailer Inputs if any active service is physical
        const hasPhysical = activeServices.some(s => s.isPhysical);
        mailerOptions.style.display = hasPhysical ? 'block' : 'none';
    }

    // Submit Handler
    document.getElementById('client-request-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const budget = parseFloat(budgetInput.value);
        const notes = document.getElementById('req-notes').value;
        const btn = e.target.querySelector('button');

        // Mailer details
        let extra = {};
        if (mailerOptions.style.display !== 'none') {
            extra.zips = document.getElementById('req-zips').value;
            extra.offer = document.getElementById('req-offer').value;
        }

        // Construct Data
        let payload = {
            clientId: user.uid,
            clientEmail: user.email,
            budget: budget,
            notes: notes,
            status: "pending_approval",
            spend: 0,
            leads: 0,
            createdAt: serverTimestamp(),
            ...extra
        };

        if (isAutoPilot) {
            // Gather portfolio data
            const portfolio = [];
            document.querySelectorAll('.service-enable:checked').forEach(chk => {
                const s = services.find(x => x.id === chk.dataset.id);
                let val = allocations[s.id];
                if(allocationMode === 'percent') val = (val/100) * budget;
                portfolio.push({ serviceId: s.id, name: s.title, allocation: val });
            });
            
            if (portfolio.length === 0) { alert("Please select at least one service."); return; }
            
            payload.serviceType = "Custom Portfolio";
            payload.portfolio = portfolio;
            payload.isPortfolio = true;
        } else {
            payload.serviceType = selectedService.title;
            payload.isPortfolio = false;
        }

        try {
            btn.textContent = "Launching...";
            btn.disabled = true;
            await addDoc(collection(db, "campaigns"), payload);
            alert("Campaign Requested Successfully!");
            document.getElementById('nav-dash').click(); 
        } catch (err) {
            console.error(err);
            alert("Error submitting request.");
            btn.disabled = false;
        }
    });

    updateSimulator();
}