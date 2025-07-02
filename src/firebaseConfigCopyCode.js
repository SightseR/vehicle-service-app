// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8q6kigpTlnG2p1BuGvzGBVZJiryK59cE",
  authDomain: "vehicle-service-app-1995.firebaseapp.com",
  projectId: "vehicle-service-app-1995",
  storageBucket: "vehicle-service-app-1995.firebasestorage.app",
  messagingSenderId: "1006964932453",
  appId: "1:1006964932453:web:cc43fcdb9686f953caab8c",
  measurementId: "G-NT5G37FFEP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);