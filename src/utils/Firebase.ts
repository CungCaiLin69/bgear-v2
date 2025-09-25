// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: "bgear-dab38.firebaseapp.com",
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: "bgear-dab38",
    storageBucket: "bgear-dab38.firebasestorage.app",
    messagingSenderId: "828608948968",
    appId: "1:828608948968:web:c148aaf1cbeb9e65f0375d",
    measurementId: "G-Z3SMBDQLX2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
