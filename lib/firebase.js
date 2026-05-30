import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // هذا السطر ضفناه حتى نفعل تسجيل الدخول

// هذه مفاتيحك الحقيقية
const firebaseConfig = {
  apiKey: "AIzaSyDGkeTG8kesrvA9BI1Hl5GKF2hyuC8vhtM",
  authDomain: "sadeem-auth.firebaseapp.com",
  projectId: "sadeem-auth",
  storageBucket: "sadeem-auth.firebasestorage.app",
  messagingSenderId: "555021067416",
  appId: "1:555021067416:web:4827f73a1d27ea3de41ced"
};

// تشغيل فايربيس
const app = initializeApp(firebaseConfig);

// تشغيل وتصدير نظام الحسابات حتى نستخدمه بالواجهة
export const auth = getAuth(app);