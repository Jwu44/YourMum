// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
// import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDwtW6LWOo9eFGa_Y7jux0P3Zml-IEzxGc",
  authDomain: "yourdai.app",
  projectId: "yourdai",
  storageBucket: "yourdai.firebasestorage.app",
  messagingSenderId: "246264772427",
  appId: "1:246264772427:web:bdb0f4b687ee5440511ace",
  measurementId: "G-MEKF41R3KH"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Only disable app verification in development
if (process.env.NODE_ENV === 'development') {
  // Note: This is for testing purposes only
  (auth as any).settings = { appVerificationDisabledForTesting: true };
  console.log("Firebase app verification disabled for testing (development mode)");
}

// Create Google Auth Provider
const provider = new GoogleAuthProvider();

// Add Calendar scopes to the provider
provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');

// Set custom parameters for better user experience
provider.setCustomParameters({
  prompt: 'consent', // Always show consent screen to ensure fresh tokens
  access_type: 'offline', // Request refresh tokens
  include_granted_scopes: 'true' // Include previously granted scopes
});

export { auth, provider };