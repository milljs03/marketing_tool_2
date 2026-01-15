import { signOut } from "firebase/auth";
import { auth } from "../config/firebase-config.js";

export function renderNavbar(user, role) {
    const navContainer = document.getElementById('navbar-container');
    
    if (!user) {
        navContainer.innerHTML = ''; // Hide nav if not logged in
        return;
    }

    const brandName = role === 'admin' ? 'AGENCY ADMIN' : 'My Business Portal';
    const bgColor = role === 'admin' ? '#333' : '#fff';
    const textColor = role === 'admin' ? '#fff' : '#333';

    navContainer.innerHTML = `
        <header style="background: ${bgColor}; color: ${textColor}; padding: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: bold; font-size: 1.2rem;">${brandName}</div>
                <div>
                    <span style="margin-right: 15px; font-size: 0.9rem;">${user.email}</span>
                    <button id="logout-btn" style="padding: 5px 10px; cursor: pointer;">Logout</button>
                </div>
            </div>
        </header>
    `;

    document.getElementById('logout-btn').addEventListener('click', () => {
        signOut(auth);
    });
}