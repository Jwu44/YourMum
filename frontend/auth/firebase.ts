// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
// import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCBmlq8Wc5yEuUAkqmKnIoafq_uppShqm8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "yourmum-cc74b.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "yourmum-cc74b",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "yourmum-cc74b.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1044107029932",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1044107029932:web:77cc4a6d3a5253b2f79e09",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-MM3H88LNYN"
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