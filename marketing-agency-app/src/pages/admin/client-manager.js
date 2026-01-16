import { db } from "../../config/firebase-config.js";
import { 
    collection, 
    getDocs, 
    addDoc, 
    doc, 
    getDoc, 
    updateDoc, 
    query, 
    where, 
    serverTimestamp, 
    orderBy, 
    onSnapshot
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

let currentView = 'list'; 
let selectedBusinessId = null;
let currentTab = 'overview'; // 'overview' | 'feed' | 'assets'

export function renderClientManager(container) {
    if (currentView === 'list') {
        renderBusinessList(container);
    } else if (currentView === 'detail' && selectedBusinessId) {
        renderBusinessDetail(container, selectedBusinessId);
    }
}

// =================================================================================
// VIEW 1: BUSINESS LIST
// =================================================================================
async function renderBusinessList(container) {
    container.innerHTML = `
        <div class="toolbar-container" style="border-radius: var(--radius-lg); margin-bottom: 24px;">
            <div>
                <h2 class="section-title">Client Businesses</h2>
                <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.9rem;">Manage profiles, access, and settings.</p>
            </div>
            <button id="invite-btn" class="btn btn-primary">+ Onboard Business</button>
        </div>
        
        <div class="content-card">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Business Name</th>
                        <th>Primary Contact</th>
                        <th class="th-right">Users</th>
                        <th class="th-right">Total Spend</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="business-list-body">
                    <tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-muted);">Loading businesses...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('invite-btn').onclick = () => openOnboardingModal(container);

    const tbody = document.getElementById('business-list-body');

    try {
        // Fetch Data
        const busSnap = await getDocs(collection(db, "businesses"));
        const businesses = [];
        busSnap.forEach(doc => businesses.push({ id: doc.id, ...doc.data() }));

        const usersSnap = await getDocs(collection(db, "users"));
        const users = [];
        usersSnap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));

        // Render List
        tbody.innerHTML = '';
        if (businesses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">No businesses found.</td></tr>`;
            return;
        }

        businesses.forEach(biz => {
            const bizUsers = users.filter(u => u.businessId === biz.id);
            const primaryContact = bizUsers[0]?.email || 'Pending Invite';
            
            // Logo Logic
            const logoContent = biz.logoUrl 
                ? `<img src="${biz.logoUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">`
                : (biz.logoIcon || '🏢');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; background: #f1f5f9; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; overflow: hidden; border: 1px solid #e2e8f0;">
                            ${logoContent}
                        </div>
                        <div>
                            <div class="font-bold text-main">${biz.name}</div>
                            <div class="text-sm text-muted">${biz.industry || 'General'}</div>
                        </div>
                    </div>
                </td>
                <td><div class="text-sm text-main">${primaryContact}</div></td>
                <td class="td-right">
                    <span style="background: #eff6ff; color: var(--primary-color); padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; font-weight: 600;">
                        ${bizUsers.length} Users
                    </span>
                </td>
                <td class="td-right font-bold">-</td>
                <td class="td-right">
                    <button class="manage-btn btn btn-secondary btn-sm" data-id="${biz.id}">Manage Profile</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.manage-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                selectedBusinessId = e.target.dataset.id;
                currentView = 'detail';
                currentTab = 'overview'; // Reset tab
                renderClientManager(container);
            });
        });

    } catch (err) {
        console.error(err);
        if(tbody) tbody.innerHTML = `<tr><td colspan="5" style="color: var(--danger-color); text-align: center;">Error loading data. Check console.</td></tr>`;
    }
}

// =================================================================================
// VIEW 2: BUSINESS DETAIL (With Tabs)
// =================================================================================
async function renderBusinessDetail(container, businessId) {
    container.innerHTML = `<div style="text-align: center; padding: 40px;">Loading Profile...</div>`;

    try {
        const bizSnap = await getDoc(doc(db, "businesses", businessId));
        if (!bizSnap.exists()) { currentView = 'list'; renderClientManager(container); return; }
        const biz = bizSnap.data();

        const logoContent = biz.logoUrl 
            ? `<img src="${biz.logoUrl}" style="width: 100%; height: 100%; object-fit: cover;">`
            : (biz.logoIcon || '🏢');

        container.innerHTML = `
            <div style="margin-bottom: 24px;">
                <button id="back-btn" class="link-btn" style="margin-bottom: 10px;">&larr; Back to List</button>
                <div style="background: white; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; display: flex; justify-content: space-between; align-items: start;">
                    <div style="display: flex; gap: 20px;">
                        <div style="width: 80px; height: 80px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; overflow: hidden;">
                            ${logoContent}
                        </div>
                        <div>
                            <h1 style="margin: 0; font-size: 1.8rem; color: var(--text-main);">${biz.name}</h1>
                            <div style="color: var(--text-secondary); margin-top: 4px;">${biz.industry}</div>
                            <div style="margin-top: 10px; font-size: 0.9rem; background: #fffbeb; color: #92400e; padding: 4px 10px; border-radius: 6px; display: inline-block; border: 1px solid #fcd34d;">
                                📝 <strong>Notes:</strong> ${biz.notes || 'No internal notes.'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TABS -->
            <div class="nav-container" style="margin-bottom: 20px;">
                <button id="tab-overview" class="nav-tab ${currentTab === 'overview' ? 'active' : ''}">Overview</button>
                <button id="tab-feed" class="nav-tab ${currentTab === 'feed' ? 'active' : ''}">Pulse Feed</button>
                <button id="tab-assets" class="nav-tab ${currentTab === 'assets' ? 'active' : ''}">Asset Library</button>
            </div>

            <div id="tab-content">Loading tab...</div>
        `;

        // Bind Back Button
        document.getElementById('back-btn').onclick = () => {
            currentView = 'list';
            selectedBusinessId = null;
            renderClientManager(container);
        };

        // Bind Tabs
        ['overview', 'feed', 'assets'].forEach(t => {
            document.getElementById(`tab-${t}`).onclick = () => {
                currentTab = t;
                renderBusinessDetail(container, businessId); // Re-render wrapper to update tab active state
            };
        });

        // Render Tab Content
        const contentArea = document.getElementById('tab-content');
        
        if (currentTab === 'overview') renderOverviewTab(contentArea, businessId);
        else if (currentTab === 'feed') renderFeedTab(contentArea, businessId);
        else if (currentTab === 'assets') renderAssetsTab(contentArea, businessId);

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p>Error loading profile.</p>`;
    }
}

// --- TAB 1: OVERVIEW (Users & Info) ---
async function renderOverviewTab(container, businessId) {
    const usersQ = query(collection(db, "users"), where("businessId", "==", businessId));
    const usersSnap = await getDocs(usersQ);
    
    container.innerHTML = `
        <div class="content-card">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0;">Authorized Users</h3>
                <button class="btn btn-sm btn-primary" onclick="alert('Add User feature coming soon')">+ Add User</button>
            </div>
            <div style="padding: 0;">
                ${usersSnap.docs.map(doc => {
                    const u = doc.data();
                    return `
                    <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600; font-size: 0.9rem;">${u.name || 'User'}</div>
                            <div style="color: var(--text-muted); font-size: 0.8rem;">${u.email}</div>
                            ${u.tempPassword ? `<div style="font-size: 0.75rem; color: var(--danger-color); margin-top: 2px;">Temp PW: <strong>${u.tempPassword}</strong></div>` : ''}
                        </div>
                        <button class="btn btn-sm btn-secondary" onclick="alert('Resetting password for ${u.email}...')">Reset PW</button>
                    </div>`;
                }).join('')}
                ${usersSnap.empty ? '<div style="padding: 20px; text-align: center;">No users found.</div>' : ''}
            </div>
        </div>
    `;
}

// --- TAB 2: PULSE FEED (Activity Log) ---
function renderFeedTab(container, businessId) {
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <!-- Post Form -->
            <div class="content-card" style="padding: 24px; height: fit-content;">
                <h3 style="margin-top: 0; margin-bottom: 15px;">Post Agency Update</h3>
                <form id="feed-form" style="display: grid; gap: 15px;">
                    <div class="form-group">
                        <label>Update Type</label>
                        <select id="feed-type" class="select-field">
                            <option value="update">📢 General Update</option>
                            <option value="milestone">🏆 Milestone Reached</option>
                            <option value="optimization">⚡ Optimization</option>
                            <option value="strategy">🧠 Strategy Shift</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" id="feed-title" class="input-field" placeholder="e.g. Campaign Launched" required>
                    </div>
                    <div class="form-group">
                        <label>Message</label>
                        <textarea id="feed-msg" class="textarea-field" rows="4" placeholder="Details..." required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Link (Optional)</label>
                        <input type="text" id="feed-link" class="input-field" placeholder="https://...">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Post to Feed</button>
                </form>
            </div>

            <!-- Feed Stream -->
            <div id="admin-feed-stream" style="display: flex; flex-direction: column; gap: 15px;">
                <p>Loading feed...</p>
            </div>
        </div>
    `;

    // Post Handler
    document.getElementById('feed-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true;
        btn.textContent = "Posting...";

        try {
            await addDoc(collection(db, `businesses/${businessId}/activity`), {
                type: document.getElementById('feed-type').value,
                title: document.getElementById('feed-title').value,
                message: document.getElementById('feed-msg').value,
                link: document.getElementById('feed-link').value,
                createdAt: serverTimestamp(),
                author: 'Admin'
            });
            e.target.reset();
        } catch(err) {
            console.error(err);
            alert("Error posting: " + err.message);
        }
        btn.disabled = false;
        btn.textContent = "Post to Feed";
    });

    // Stream Listener
    const q = query(collection(db, `businesses/${businessId}/activity`), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        const stream = document.getElementById('admin-feed-stream');
        if(!stream) return;
        stream.innerHTML = '';
        
        if (snap.empty) {
            stream.innerHTML = '<div style="text-align: center; color: #999;">No activity yet.</div>';
            return;
        }

        snap.forEach(doc => {
            const d = doc.data();
            const date = d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString() : 'Just now';
            
            const item = document.createElement('div');
            item.style.cssText = "background: white; padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.9rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);";
            
            item.innerHTML = `
                <div style="font-weight: 600; color: var(--primary-color); display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span>${d.type.toUpperCase()}: ${d.title}</span>
                    <span style="font-weight: 400; color: #999; font-size: 0.75rem;">${date}</span>
                </div>
                <div style="color: var(--text-main); margin-bottom: 5px; line-height: 1.4;">${d.message}</div>
                ${d.link ? `<a href="${d.link}" target="_blank" style="font-size: 0.8rem; color: var(--accent-blue);">View Resource &rarr;</a>` : ''}
            `;
            stream.appendChild(item);
        });
    });
}

// --- TAB 3: ASSET LIBRARY ---
function renderAssetsTab(container, businessId) {
    container.innerHTML = `
        <div class="content-card" style="padding: 24px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin:0;">Client Asset Library</h3>
                    <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #666;">Upload files for the client to download.</p>
                </div>
                <label class="btn btn-primary btn-sm" style="cursor: pointer;">
                    + Upload File
                    <input type="file" id="admin-asset-upload" style="display: none;">
                </label>
            </div>
        </div>
        <div id="admin-asset-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
            <p>Loading assets...</p>
        </div>
    `;

    document.getElementById('admin-asset-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        
        if(!confirm(`Upload ${file.name} to this client's library?`)) return;
        
        try {
            const storage = getStorage();
            const storageRef = ref(storage, `business-assets/${businessId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            
            let type = 'document';
            if (file.type.includes('image')) type = 'image';
            if (file.name.toLowerCase().includes('logo')) type = 'logo';
            
            await addDoc(collection(db, `businesses/${businessId}/assets`), {
                name: file.name,
                url: url,
                type: type,
                size: (file.size/1024/1024).toFixed(2)+' MB',
                uploadedBy: 'Admin',
                createdAt: serverTimestamp()
            });
            
            alert("File Uploaded Successfully");
        } catch(err) {
            console.error(err);
            alert("Upload failed: " + err.message);
        }
    });

    const q = query(collection(db, `businesses/${businessId}/assets`), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        const grid = document.getElementById('admin-asset-grid');
        if(!grid) return;
        grid.innerHTML = '';
        
        if (snap.empty) {
            grid.innerHTML = '<p style="color:#999; grid-column: 1/-1;">No assets found.</p>';
            return;
        }

        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div');
            div.style.cssText = "background: white; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; position: relative;";
            
            let preview = '';
            if (d.type === 'image' || d.type === 'logo') {
                preview = `<div style="height: 100px; background: url('${d.url}') center/cover no-repeat;"></div>`;
            } else {
                preview = `<div style="height: 100px; display: flex; align-items: center; justify-content: center; background: #f8fafc; font-size: 2rem;">📄</div>`;
            }

            div.innerHTML = `
                ${preview}
                <div style="padding: 10px; font-size: 0.8rem;">
                    <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${d.name}">${d.name}</div>
                    <div style="color: #999; font-size: 0.7rem;">${d.size}</div>
                </div>
                <a href="${d.url}" target="_blank" style="position: absolute; top: 5px; right: 5px; background: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-decoration: none; color: #333;">⬇</a>
            `;
            grid.appendChild(div);
        });
    });
}

// =================================================================================
// MODAL: ONBOARDING (Full Logic Restored)
// =================================================================================
function openOnboardingModal(container) {
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <h3 class="modal-title">Onboard New Business</h3>
                <button id="close-modal" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <form id="onboard-form" class="form-grid">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Business Name</label>
                            <input type="text" name="name" class="input-field" placeholder="e.g. Acme Corp" required>
                        </div>
                        <div class="form-group">
                            <label>Industry</label>
                            <select name="industry" class="select-field">
                                <option value="Retail">Retail</option>
                                <option value="Real Estate">Real Estate</option>
                                <option value="Professional Services">Professional Services</option>
                                <option value="Hospitality">Hospitality</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Business Logo</label>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="file" name="logoFile" class="input-field" accept="image/*" style="flex: 1;">
                            <div style="color: var(--text-muted); font-size: 0.9rem;">OR</div>
                            <input type="text" name="logoIcon" class="input-field" placeholder="Emoji (🏢)" maxlength="2" style="width: 100px;">
                        </div>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Upload a PNG/JPG or use an emoji as a placeholder.</p>
                    </div>
                    <div class="form-group">
                        <label>Internal Notes</label>
                        <textarea name="notes" class="textarea-field" rows="2" placeholder="Private agency notes..."></textarea>
                    </div>
                    <div style="border-top: 1px solid var(--border-color); margin: 10px 0;"></div>
                    <h4 style="margin: 0 0 15px 0; font-size: 0.95rem; color: var(--text-main);">Primary User Invite</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>User Name</label>
                            <input type="text" name="userName" class="input-field" placeholder="e.g. John Doe" required>
                        </div>
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" name="userEmail" class="input-field" placeholder="john@acme.com" required>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" id="cancel-btn" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Profile & Generate Invite</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('close-modal').onclick = close;
    document.getElementById('cancel-btn').onclick = close;

    document.getElementById('onboard-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const formData = new FormData(e.target);

        try {
            btn.textContent = "Creating...";
            btn.disabled = true;

            let logoUrl = null;
            const logoFile = formData.get('logoFile');
            
            if (logoFile && logoFile.size > 0) {
                try {
                    const storage = getStorage();
                    const storageRef = ref(storage, `business-logos/${Date.now()}_${logoFile.name}`);
                    const snapshot = await uploadBytes(storageRef, logoFile);
                    logoUrl = await getDownloadURL(snapshot.ref);
                } catch (storageErr) {
                    console.error("Storage upload failed:", storageErr);
                    alert("Warning: Logo upload failed. Proceeding with text-only profile.");
                }
            }

            const businessRef = await addDoc(collection(db, "businesses"), {
                name: formData.get('name'),
                industry: formData.get('industry'),
                logoIcon: formData.get('logoIcon') || '🏢',
                logoUrl: logoUrl,
                notes: formData.get('notes'),
                createdAt: serverTimestamp()
            });

            const tempPassword = Math.random().toString(36).slice(-8);
            await addDoc(collection(db, "users"), {
                name: formData.get('userName'),
                email: formData.get('userEmail'),
                role: 'client',
                businessId: businessRef.id,
                businessName: formData.get('name'),
                status: 'invited',
                tempPassword: tempPassword,
                createdAt: serverTimestamp()
            });

            alert(`Business Onboarded!\n\nSend this to client:\nURL: [Your App URL]\nEmail: ${formData.get('userEmail')}\nTemp Password: ${tempPassword}`);
            
            close();
            renderClientManager(container);

        } catch (err) {
            console.error(err);
            alert("Error creating business profile: " + err.message);
            btn.disabled = false;
            btn.textContent = "Create Profile & Generate Invite";
        }
    };
}