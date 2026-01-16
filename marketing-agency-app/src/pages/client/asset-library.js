import { db } from "../../config/firebase-config.js";
import { 
    collection, 
    addDoc, 
    query, 
    onSnapshot, 
    serverTimestamp, 
    orderBy 
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export function renderAssetLibrary(container, user) {
    if (!user.businessId) {
        container.innerHTML = `<div class="empty-state">No business profile linked. Contact support.</div>`;
        return;
    }

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 250px 1fr; gap: 30px; align-items: start;">
            
            <!-- LEFT: BRAND IDENTITY -->
            <div style="position: sticky; top: 20px;">
                <div class="brand-card">
                    <h3 class="brand-header">Brand Identity</h3>
                    <div style="margin-bottom: 20px;">
                        <label class="c-label" style="font-size: 0.75rem; text-transform: uppercase;">Primary Colors</label>
                        <div class="color-grid">
                            <div class="color-swatch" style="background: #0f4c81;" title="Brand Blue"></div>
                            <div class="color-swatch" style="background: #3b82f6;" title="Action Blue"></div>
                            <div class="color-swatch" style="background: #10b981;" title="Success Green"></div>
                            <div class="color-swatch" style="background: #f59e0b;" title="Warning Orange"></div>
                        </div>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label class="c-label" style="font-size: 0.75rem; text-transform: uppercase;">Typography</label>
                        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 1.2rem;">Aa</div>
                            <div style="font-size: 0.8rem; color: #64748b;">Inter (Primary)</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- RIGHT: ASSET VAULT -->
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: var(--c-text-main);">Asset Library</h2>
                    <label class="btn btn-primary btn-sm" style="cursor: pointer; background: var(--c-primary); color: white; padding: 8px 16px; border-radius: 8px;">
                        <span>+ Upload New</span>
                        <input type="file" id="asset-upload" style="display: none;">
                    </label>
                </div>

                <div class="asset-tabs">
                    <button class="asset-tab active" data-filter="all">All</button>
                    <button class="asset-tab" data-filter="logo">Logos</button>
                    <button class="asset-tab" data-filter="image">Images</button>
                    <button class="asset-tab" data-filter="document">Docs</button>
                </div>

                <div id="asset-grid" class="asset-grid">
                    <p class="empty-state">Loading assets...</p>
                </div>
            </div>
        </div>
    `;

    // Fetch Assets
    const q = query(
        collection(db, `businesses/${user.businessId}/assets`),
        orderBy("createdAt", "desc")
    );

    let allAssets = [];

    onSnapshot(q, (snapshot) => {
        const grid = document.getElementById('asset-grid');
        if(!grid) return;
        grid.innerHTML = '';
        allAssets = [];

        if (snapshot.empty) {
            grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">No assets found. Upload your logo or files to get started.</div>`;
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            allAssets.push(data);
            grid.appendChild(createAssetCard(data));
        });
    });

    // Handle Upload
    document.getElementById('asset-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const btnLabel = e.target.parentElement.querySelector('span');
        const originalText = btnLabel.textContent;
        btnLabel.textContent = "Uploading...";

        try {
            const storage = getStorage();
            const storageRef = ref(storage, `business-assets/${user.businessId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            let type = 'document';
            if (file.type.includes('image')) type = 'image';
            if (file.name.toLowerCase().includes('logo')) type = 'logo';

            await addDoc(collection(db, `businesses/${user.businessId}/assets`), {
                name: file.name,
                url: downloadURL,
                type: type,
                size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                uploadedBy: user.email,
                createdAt: serverTimestamp()
            });

            alert("Upload Complete!");
        } catch (err) {
            console.error(err);
            alert("Upload failed: " + err.message);
        } finally {
            btnLabel.textContent = originalText;
            e.target.value = '';
        }
    });

    function createAssetCard(data) {
        const div = document.createElement('div');
        div.className = 'asset-card';
        
        let preview = '';
        if (data.type === 'image' || data.type === 'logo') {
            preview = `<div class="asset-preview" style="background-image: url('${data.url}')"></div>`;
        } else {
            preview = `<div class="asset-preview icon-preview">📄</div>`;
        }

        div.innerHTML = `
            ${preview}
            <div class="asset-info">
                <div class="asset-name" title="${data.name}">${data.name}</div>
                <div class="asset-meta">${data.type.toUpperCase()} • ${data.size}</div>
            </div>
            <a href="${data.url}" target="_blank" class="asset-download" title="Download">⬇</a>
        `;
        return div;
    }
}