import { auth, db } from './config/firebase-config.js';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Import Pages
import { renderLogin } from './pages/auth/login.js';
import { renderClientDashboard } from './pages/client/client-dashboard.js';
import { renderAdminDashboard } from './pages/admin/admin-dashboard.js';
import { renderNavbar } from './components/navbar.js';

const appContent = document.getElementById('app-content');
const navContainer = document.getElementById('navbar-container');

// 1. Listen for Auth Changes (Login/Logout)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in, let's find out WHO they are
        console.log("User logged in:", user.uid);
        
        // Fetch user role from Firestore
        // (We will manually create your Admin user in the DB shortly)
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        let role = 'client'; // Default to client
        if (userSnap.exists() && userSnap.data().role) {
            role = userSnap.data().role;
        }

        // Render the UI based on role
        renderNavbar(user, role);
        
        if (role === 'admin') {
            renderAdminDashboard(appContent);
        } else {
            renderClientDashboard(appContent);
        }

    } else {
        // User is NOT logged in
        renderNavbar(null, null);
        renderLogin(appContent);
    }
});