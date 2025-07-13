// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyAx4RY1Hw_5WFTbB-qpOHwk0bncKJm1m6o',
  authDomain: 'rinawarp-terminal.firebaseapp.com',
  projectId: 'rinawarp-terminal',
  storageBucket: 'rinawarp-terminal.firebasestorage.app',
  messagingSenderId: '71926516580',
  appId: '1:71926516580:web:b5a069e97cf5a736ad4871',
  measurementId: 'G-G424CV5GGT',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export the initialized services for use in other parts of your app
export { app, analytics, auth, db, storage };

