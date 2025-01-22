// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDwtWGLWO09eFGa-Y7juxOP3Zml-IEzxGC",
  authDomain: "yourdai.firebaseapp.com",
  projectId: "yourdai",
  storageBucket: "yourdai.firebasestorage.app",
  messagingSenderId: "246264772427",
  appId: "1:246264772427:web:bdb0f4b687ee544051ace",
  measurementId: "G-MEKF4YR3KH"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Analytics only in browser environment
let analytics;
if (typeof window !== 'undefined') {
  // We can enable this later when needed
  // analytics = getAnalytics(app);
}

export { app, auth };