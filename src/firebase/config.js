// src/firebase/config.js
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyAHxthiZ0YBYo_nItgIy1n2NDmvYG8BVAw",
  authDomain: "gamidemo-9b42c.firebaseapp.com",
  projectId: "gamidemo-9b42c",
  storageBucket: "gamidemo-9b42c.firebasestorage.app",
  messagingSenderId: "102802097642",
  appId: "1:102802097642:web:1861d98ddd66f8e41e1e93"
};

export const app = initializeApp(firebaseConfig);