import { initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const firebaseReady = requiredKeys.length === 0;

if (!firebaseReady) {
  console.warn(
    `Firebase environment variables are missing: ${requiredKeys.join(", ")}`,
  );
}

const app = firebaseReady ? initializeApp(firebaseConfig) : null;

export const auth = app ? getAuth(app) : null;
export const authPersistenceReady = auth
  ? setPersistence(auth, inMemoryPersistence).catch((error) => {
      console.error("Firebase Auth persistence could not be restricted.", error);
    })
  : Promise.resolve();
export const db = app ? getFirestore(app) : null;
export const missingFirebaseKeys = requiredKeys;
