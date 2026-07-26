import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy init: KHÔNG gọi getAuth()/getFirestore() ở top-level. Các component
// "use client" vẫn được render một lần trên server lúc SSR/prerender — nếu
// khởi tạo ngay khi import, `next build` sẽ crash khi chưa có biến môi trường
// NEXT_PUBLIC_FIREBASE_* thật (vd trong lúc dev trước khi Firebase project
// được cấu hình). Chỉ gọi các hàm này bên trong event handler/useEffect,
// tức là chỉ chạy thật sự trong trình duyệt sau khi hydrate.
let app: FirebaseApp | undefined;

function getFirebaseApp(): FirebaseApp {
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}
