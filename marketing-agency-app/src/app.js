import { auth, db } from './config/firebase-config.js';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc } from "firebase/firestore";

// Import Pages
import { renderLogin } from './pages/auth/login.js';
import { renderClientDashboard } from './pages/client/client-dashboard.js';
import { renderAdminDashboard } from './pages/admin/admin-dashboard.js';


const appContent = document.getElementById('app-content');

// 1. Listen for Auth Changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User authenticated:", user.email);
        
        let role = 'client'; 
        let userProfile = null;

        try {
            // A. Check for Profile at correct UID path
            const userDocRef = doc(db, "users", user.uid);
            let userSnap = await getDoc(userDocRef);

            // B. If not found, check for "Invite Document" via Email
            // (This handles the first login after an Admin invite)
            if (!userSnap.exists()) {
                console.log("Profile not found at UID. Searching for invite...");
                const q = query(collection(db, "users"), where("email", "==", user.email));
                const querySnap = await getDocs(q);

                if (!querySnap.empty) {
                    console.log("Invite found! Migrating profile to UID...");
                    const inviteDoc = querySnap.docs[0];
                    const inviteData = inviteDoc.data();
                    
                    // MIGRATION: Copy invite data to correct UID doc
                    await setDoc(userDocRef, {
                        ...inviteData,
                        id: user.uid, // Ensure ID matches
                        status: 'active',
                        migratedAt: new Date()
                    });
                    
                    // Delete the old invite doc to prevent duplicates
                    await deleteDoc(inviteDoc.ref);
                    
                    // Refresh Snapshot
                    userSnap = await getDoc(userDocRef);
                }
            }

            if (userSnap.exists()) {
                userProfile = userSnap.data();
                role = userProfile.role || 'client';
            }

        } catch (error) {
            console.error("Error fetching user profile:", error);
        }

        // Pass the FULL merged user object (Auth + Firestore Data)
        const fullUser = { ...user, ...(userProfile || {}) };

        
        if (role === 'admin') {
            renderAdminDashboard(appContent, fullUser);
        } else {
            renderClientDashboard(appContent, fullUser);
        }

    } else {
        console.log("User not logged in");
        renderNavbar(null, null);
        renderLogin(appContent);
    }
});