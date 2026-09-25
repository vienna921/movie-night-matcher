// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWclmGyeOmgfnG5OMz4b5EX73lTYi8Go0",
  authDomain: "movie-night-matcher-48874.firebaseapp.com",
  projectId: "movie-night-matcher-48874",
  storageBucket: "movie-night-matcher-48874.firebasestorage.app",
  messagingSenderId: "707375579164",
  appId: "1:707375579164:web:72e07180fc13fd8903dfd9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app)

export { app, firestore, auth }