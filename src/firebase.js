
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';


const firebaseConfig = {
  apiKey: "AIzaSyBmCYcnGnscXbs7Q9KjOkueLu7dn_bmqTA",
  authDomain: "qr-code-attendance-61bba.firebaseapp.com",
  projectId: "qr-code-attendance-61bba",
  storageBucket: "qr-code-attendance-61bba.firebasestorage.app",
  messagingSenderId: "754772002246",
  appId: "1:754772002246:web:9cd1729cfd9a178a125ec7"
};


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
