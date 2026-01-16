import { auth, db } from './config/firebase-config.js';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Import Main Page Entry Points
import { renderLogin } from './pages/auth/login.js';
import { renderClientDashboard } from './pages/client/client-dashboard.js';
import { renderAdminDashboard } from './pages/admin/admin-dashboard.js';
import { renderNavbar } from './components/navbar.js';

// DOM Elements
const appContent = document.getElementById('app-content');
const navContainer = document.getElementById('navbar-container');

// Main Application Logic
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User authenticated:", user.email);
        
        // 1. Fetch User Role from Firestore
        // We need this to decide which "App" to show (Kitchen vs Dining Room)
        let role = 'client'; // Default safety
        
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userDocRef);

            if (userSnap.exists() && userSnap.data().role) {
                role = userSnap.data().role;
            }
        } catch (error) {
            console.error("Error fetching user role:", error);
            // Fallback: stay as client or show error
        }

        // 2. Render Navigation
        renderNavbar(user, role);
        
        // 3. Route to specific Dashboard
        // IMPORTANT: We pass the 'user' object to these functions so they can 
        // access uid/email for Audit Logs and Row Level Security.
        if (role === 'admin') {
            // Loads the Agency Command Center (which now includes Client Manager & Editor)
            renderAdminDashboard(appContent, user); 
        } else {
            // Loads the Client Portal
            renderClientDashboard(appContent, user);
        }

    } else {
        // User is logged out
        console.log("User not logged in");
        renderNavbar(null, null);
        renderLogin(appContent);
    }
});