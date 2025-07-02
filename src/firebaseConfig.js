// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// Import Firestore and Auth specific functions, as they are used in the application
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
// getAnalytics is commented out as it wasn't explicitly used in the app logic,
// but you can uncomment and use it if you plan to integrate Firebase Analytics.
// import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  // IMPORTANT: These values should be set as environment variables in your Vercel project settings.
  // When using Vite, environment variables must be prefixed with VITE_ to be accessible in client-side code.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // If you are using Firebase Analytics, uncomment the line below and set the corresponding VITE_ variable.
  // measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase services used in your application
const db = getFirestore(app); // Get the Firestore database instance
const auth = getAuth(app);   // Get the Firebase Authentication instance

// If you uncommented getAnalytics, you would initialize it here:
// const analytics = getAnalytics(app);

// Export the initialized Firebase service instances for use in other parts of your React application.
export { db, auth, signInAnonymously };
