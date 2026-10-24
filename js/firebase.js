import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxeiAvmGUKmeWyugwuNkLPKUv9sDeUEsg",
  authDomain: "encuesta-universitaria.firebaseapp.com",
  projectId: "encuesta-universitaria",
  storageBucket: "encuesta-universitaria.firebasestorage.app",
  messagingSenderId: "475391362511",
  appId: "1:475391362511:web:8f047a3e496be9c7377eba"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { 
  db, 
  auth, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
};