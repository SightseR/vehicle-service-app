// src/App.jsx
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged
import { db, auth, signInAnonymously } from './firebaseConfig'; // Import db, auth, and signInAnonymously
import RegistrationForm from './components/RegistrationForm';
import RecordsList from './components/RecordsList';

function App() {
  const [currentPage, setCurrentPage] = useState('register'); // 'register' or 'records'
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [userId, setUserId] = useState(null); // State to store the user ID

  // Global variables provided by the Canvas environment
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  useEffect(() => {
    const initializeFirebaseAndAuth = async () => {
      try {
        // Sign in with custom token if available, otherwise anonymously
        if (initialAuthToken) {
          await auth.signInWithCustomToken(initialAuthToken);
          console.log("Signed in with custom token.");
        } else {
          await signInAnonymously(auth);
          console.log("Signed in anonymously.");
        }

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            setUserId(user.uid);
            console.log("User UID:", user.uid);
          } else {
            setUserId(null);
            console.log("No user is signed in.");
          }
          setFirebaseInitialized(true); // Firebase is ready once auth state is checked
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
      } catch (error) {
        console.error("Error during Firebase initialization or authentication:", error);
        setFirebaseInitialized(true); // Still set to true to attempt rendering, but with error
      }
    };

    initializeFirebaseAndAuth();
  }, [initialAuthToken]); // Re-run if initialAuthToken changes

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
                : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
            }`}
          >
            Register Service
          </button>
          <button
            onClick={() => setCurrentPage('records')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
              currentPage === 'records'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
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
          <RegistrationForm appId={appId} userId={userId} />
        ) : (
          <RecordsList appId={appId} userId={userId} />
        )}
      </main>
    </div>
  );
}

export default App;