// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyBOpZR6IwUAC1ycIryvksXQAY0863UmgMs",
    authDomain: "bgear-dab38.firebaseapp.com",
    databaseURL: "https://bgear-dab38-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bgear-dab38",
    storageBucket: "bgear-dab38.firebasestorage.app",
    messagingSenderId: "828608948968",
    appId: "1:828608948968:web:c148aaf1cbeb9e65f0375d",
    measurementId: "G-Z3SMBDQLX2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
