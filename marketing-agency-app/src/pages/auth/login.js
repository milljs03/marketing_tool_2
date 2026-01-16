import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../../config/firebase-config.js";

export function renderLogin(container) {
    container.innerHTML = `
        <div style="max-width: 400px; margin: 60px auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); font-family: sans-serif;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin: 0;">Welcome Back</h2>
                <p style="color: #7f8c8d; margin-top: 5px;">Sign in to manage your campaigns</p>
            </div>

            <!-- Google Button -->
            <button id="google-btn" style="width: 100%; padding: 12px; background: white; color: #333; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px; transition: background 0.2s;">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18">
                Sign in with Google
            </button>

            <div style="display: flex; align-items: center; margin: 20px 0;">
                <div style="flex: 1; height: 1px; background: #eee;"></div>
                <span style="padding: 0 10px; color: #aaa; font-size: 0.8rem;">OR</span>
                <div style="flex: 1; height: 1px; background: #eee;"></div>
            </div>

            <!-- Legacy Email Form -->
            <form id="login-form">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #666; font-size: 0.9rem;">Email Address</label>
                    <input type="email" id="email" required style="width: 100%; padding: 10px; border: 1px solid #dfe1e5; border-radius: 6px; font-size: 1rem;">
                </div>
                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 5px; color: #666; font-size: 0.9rem;">Password</label>
                    <input type="password" id="password" required style="width: 100%; padding: 10px; border: 1px solid #dfe1e5; border-radius: 6px; font-size: 1rem;">
                </div>
                <button type="submit" style="width: 100%; padding: 12px; background: #2c3e50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 1rem;">Sign In with Email</button>
            </form>
            <p id="error-msg" style="color: #e74c3c; text-align: center; margin-top: 15px; font-size: 0.9rem;"></p>
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
                // DOMAIN CHECK LOGIC:
                // If email ends in @nptel.com, we could auto-tag them (Note: Firestore Rules might block this unless we are careful)
                // For now, we just create a basic 'client' profile for everyone to be safe.
                // You will manually promote yourself to admin in the console.
                
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