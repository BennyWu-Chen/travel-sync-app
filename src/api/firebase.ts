// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getApps, getApp } from "firebase/app"; // 導入 getApps 和 getApp 以檢查是否已初始化
import { initializeFirestore, persistentLocalCache, connectFirestoreEmulator } from "firebase/firestore"; // 導入 persistentLocalCache
// import { getAnalytics } from "firebase/analytics"; // 移除 analytics，如果不需要

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCXbNrmyow5lDG2TFl1fh9YFhkFIvVHNYk",
  authDomain: "benny-s-outing-project.firebaseapp.com",
  projectId: "benny-s-outing-project",
  storageBucket: "benny-s-outing-project.firebasestorage.app",
  messagingSenderId: "123383910865",
  appId: "1:123383910865:web:3612a82e372433b43b90f0",
  measurementId: "G-N0PV10E16C"
};

let app;
let db;

// 檢查 apiKey 是否存在且有效
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
  console.error("Firebase Error: apiKey is missing or invalid in firebaseConfig. Please provide a valid Firebase API Key.");
  // 如果沒有有效的 apiKey，App 將無法正常初始化 Firebase 服務
  // 在實際生產環境中，你可能需要阻止應用程序啟動或切換到訪客模式
} else {
  // 確保 Firebase App 只被初始化一次
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  // 使用 initializeFirestore 搭配 persistentLocalCache 設定
  // 確保只初始化一次 Firestore 且持久化設定正確
  db = initializeFirestore(app, {
    localCache: persistentLocalCache(),
  });

  // 可選: 連接 Firestore Emulator (開發環境用)
  // if (process.env.NODE_ENV === 'development') {
  //   connectFirestoreEmulator(db, 'localhost', 8080);
  //   console.log("Connected to Firestore emulator");
  // }
}

export { db }; // Export db
