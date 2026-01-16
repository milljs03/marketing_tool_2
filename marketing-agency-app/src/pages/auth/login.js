import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../../config/firebase-config.js";

export function renderLogin(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; min-height: 80vh;">
            <div class="content-card" style="width: 100%; max-width: 400px; padding: 40px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 class="page-title" style="font-size: 1.5rem;">Welcome Back</h2>
                    <p class="text-secondary" style="margin-top: 5px;">Sign in to manage your campaigns</p>
                </div>

                <!-- Google Button -->
                <button id="google-btn" class="btn btn-secondary btn-block" style="margin-bottom: 20px; gap: 10px;">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18">
                    Sign in with Google
                </button>

                <div style="display: flex; align-items: center; margin: 20px 0;">
                    <div style="flex: 1; height: 1px; background: var(--border-color);"></div>
                    <span style="padding: 0 10px; color: var(--text-muted); font-size: 0.8rem;">OR</span>
                    <div style="flex: 1; height: 1px; background: var(--border-color);"></div>
                </div>

                <!-- Email Form -->
                <form id="login-form" class="form-grid" style="gap: 16px;">
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="email" required class="input-field">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="password" required class="input-field">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block" style="margin-top: 10px;">
                        Sign In with Email
                    </button>
                </form>
                <p id="error-msg" style="color: var(--danger-color); text-align: center; margin-top: 15px; font-size: 0.9rem;"></p>
            </div>
        </div>
    `;

    // --- GOOGLE LOGIN HANDLER ---
    document.getElementById('google-btn').addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            
            // Check if user exists in DB, if not, create them
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    email: user.email,
                    role: "client", // Default to client
                    createdAt: new Date()
                });
                console.log("New user profile created via Google Sign-In");
            }
            
            // Redirect is handled by app.js listener
        } catch (error) {
            console.error("Google Auth Error:", error);
            document.getElementById('error-msg').textContent = "Google Sign-In failed. Try again.";
        }
    });

    // --- EMAIL LOGIN HANDLER ---
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('error-msg');

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error(error);
            errorMsg.textContent = "Invalid login credentials.";
        }
    });
}