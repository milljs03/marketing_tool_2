import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config/firebase-config.js";

export function renderLogin(container) {
    container.innerHTML = `
        <div style="max-width: 400px; margin: 100px auto; padding: 30px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="text-align: center; color: #333;">Marketing Portal</h2>
            <form id="login-form">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #666;">Email</label>
                    <input type="email" id="email" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: #666;">Password</label>
                    <input type="password" id="password" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <button type="submit" style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Sign In</button>
            </form>
            <p id="error-msg" style="color: red; text-align: center; margin-top: 10px;"></p>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('error-msg');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // The onAuthStateChanged in app.js will handle the redirect
        } catch (error) {
            console.error(error);
            errorMsg.textContent = "Invalid login credentials.";
        }
    });
}