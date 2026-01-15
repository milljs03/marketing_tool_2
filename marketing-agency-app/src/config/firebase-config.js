import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// YOUR SPECIFIC CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyAuVsAsBKDLcu_kJx0KcbCRguK9QwE3j-w",
  authDomain: "marketing-tool-cheese.firebaseapp.com",
  projectId: "marketing-tool-cheese",
  storageBucket: "marketing-tool-cheese.firebasestorage.app",
  messagingSenderId: "59641529346",
  appId: "1:59641529346:web:876a58398595a5b799931b",
  measurementId: "G-JMR2SZYE57"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services so other files can use them
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);