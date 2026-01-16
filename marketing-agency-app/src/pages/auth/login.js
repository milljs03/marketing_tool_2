import { auth } from "../../config/firebase-config.js";
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "firebase/auth";

export function renderLogin(container) {
    container.innerHTML = `
        <div style="max-width: 400px; margin: 60px auto; padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center;">
            <h1 style="color: #0f172a; margin-bottom: 10px;">Agency Portal</h1>
            <p style="color: #64748b; margin-bottom: 30px;">Sign in to manage your campaigns</p>
            
            <form id="login-form" style="display: flex; flex-direction: column; gap: 15px;">
                <input type="email" id="email" placeholder="Email Address" required 
                    style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 1rem;">
                
                <input type="password" id="password" placeholder="Password" required 
                    style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 1rem;">
                
                <button type="submit" id="login-btn" 
                    style="padding: 12px; background: #0f4c81; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1rem; transition: background 0.2s;">
                    Sign In
                </button>
            </form>

            <div style="display: flex; align-items: center; margin: 20px 0;">
                <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
                <span style="padding: 0 10px; color: #94a3b8; font-size: 0.9rem;">OR</span>
                <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
            </div>

            <button id="google-btn" style="width: 100%; padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1rem; color: #1e293b; display: flex; align-items: center; justify-content: center; gap: 10px; transition: background 0.2s;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
            </button>

            <p id="error-msg" style="color: #ef4444; font-size: 0.9rem; margin-top: 15px; display: none;"></p>
        </div>
    `;

    const form = document.getElementById('login-form');
    const errorMsg = document.getElementById('error-msg');
    const btn = document.getElementById('login-btn');
    const googleBtn = document.getElementById('google-btn');

    // Email/Password Handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        errorMsg.style.display = 'none';
        btn.textContent = "Authenticating...";
        btn.disabled = true;

        try {
            // 1. Try to Login
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.log("Login failed, checking error code:", error.code);
            
            // 2. If user not found, maybe it's a first-time Invite? Try Registering.
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                try {
                    console.log("Attempting to register invited user...");
                    await createUserWithEmailAndPassword(auth, email, password);
                    // Registration success triggers onAuthStateChanged in app.js automatically
                } catch (createErr) {
                    console.error(createErr);
                    // Handle specific config error
                    if (createErr.code === 'auth/operation-not-allowed') {
                        errorMsg.textContent = "Configuration Error: Email/Password login is disabled in Firebase Console.";
                    } else if (createErr.code === 'auth/email-already-in-use') {
                        errorMsg.textContent = "Incorrect password.";
                    } else {
                        errorMsg.textContent = "Login failed: " + createErr.message;
                    }
                    btn.textContent = "Sign In";
                    btn.disabled = false;
                    errorMsg.style.display = 'block';
                }
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMsg.textContent = "System Error: Admin must enable Email/Password provider in Firebase Console.";
                btn.textContent = "Sign In";
                btn.disabled = false;
                errorMsg.style.display = 'block';
            } else {
                errorMsg.textContent = "Error: " + error.message;
                btn.textContent = "Sign In";
                btn.disabled = false;
                errorMsg.style.display = 'block';
            }
        }
    });

    // Google Auth Handler
    googleBtn.addEventListener('click', async () => {
        errorMsg.style.display = 'none';
        
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // Success triggers onAuthStateChanged in app.js
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/operation-not-allowed') {
                errorMsg.textContent = "Google Sign-In is not enabled in Firebase Console.";
            } else {
                errorMsg.textContent = "Google Sign-In failed: " + error.message;
            }
            errorMsg.style.display = 'block';
        }
    });
}