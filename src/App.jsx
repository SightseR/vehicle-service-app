import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, query, onSnapshot } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// Import the components 
import RegistrationForm from './components/RegistrationForm';
import RecordsList from './components/RecordsList';


// Main App
function App() {
  const [currentPage, setCurrentPage] = useState('register'); 
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [userId, setUserId] = useState(null);
  const [db, setDb] = useState(null); 
  const [auth, setAuth] = useState(null); 

  
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  
  const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID 
      };

  
  useEffect(() => {
    const initFirebase = async () => {
      try {
       
        if (!firebaseConfig || !firebaseConfig.apiKey) {
          console.error("Firebase config is missing or invalid. Cannot initialize Firebase. Check your .env file or Canvas environment variables.");
          setFirebaseInitialized(true); 
          return;
        }

        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setDb(firestore);
        setAuth(firebaseAuth);

        if (initialAuthToken) {
          await signInWithCustomToken(firebaseAuth, initialAuthToken);
          console.log("Signed in with custom token.");
        } else {
          await signInAnonymously(firebaseAuth);
          console.log("Signed in anonymously.");
        }

        const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
          if (user) {
            setUserId(user.uid);
            console.log("User UID:", user.uid);
          } else {
            setUserId(null);
            console.log("No user is signed in.");
          }
          setFirebaseInitialized(true);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error during Firebase initialization or authentication:", error);
        setFirebaseInitialized(true);
      }
    };

    initFirebase();
  }, [initialAuthToken, firebaseConfig]); 

  if (!firebaseInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 font-inter">
        <p className="text-xl text-gray-700">Loading application...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-inter p-4 sm:p-6 lg:p-8">
      <header className="bg-white shadow-md rounded-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">
          Vehicle Service App
        </h1>
        <div className="flex space-x-2 sm:space-x-4">
          <button
            onClick={() => setCurrentPage('register')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
              currentPage === 'register'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-400'
            }`}
          >
            Register Service
          </button>
          <button
            onClick={() => setCurrentPage('records')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
              currentPage === 'records'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-400'
            }`}
          >
            View Records
          </button>
        </div>
      </header>

      <main className="bg-white shadow-md rounded-lg p-4 sm:p-6 lg:p-8">
        {userId && (
          <div className="mb-4 text-sm text-gray-600">
            Current User ID: <span className="font-mono bg-gray-100 p-1 rounded">{userId}</span>
          </div>
        )}
        {currentPage === 'register' ? (
          <RegistrationForm appId={appId} userId={userId} db={db} />
        ) : (
          <RecordsList appId={appId} userId={userId} db={db} />
        )}
      </main>
    </div>
  );
}

export default App;