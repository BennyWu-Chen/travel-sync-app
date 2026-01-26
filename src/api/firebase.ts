import { initializeApp, getApps, getApp } from "firebase/app"; // 👈 補上 getApps 和 getApp
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 檢查是否已經初始化過，避免重複初始化導致報錯
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 匯出資料庫實例
export const db = getFirestore(app);