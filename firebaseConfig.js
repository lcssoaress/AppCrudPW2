import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth"; // 1. Adicione esta linha

const firebaseConfig = {
  apiKey: "AIzaSyChoiVk_RyyQy6UltypPb66vSIYue8GuS4",
  authDomain: "meucrudexpo.firebaseapp.com",
  databaseURL: "https://meucrudexpo-default-rtdb.firebaseio.com",
  projectId: "meucrudexpo",
  storageBucket: "meucrudexpo.firebasestorage.app",
  messagingSenderId: "50017221584",
  appId: "1:50017221584:web:c17dbcbd07fc0cd06457d5"
};

const app = initializeApp(firebaseConfig);

// Exportações para usar no restante do app
export const db = getDatabase(app);
export const auth = getAuth(app); // 2. Adicione esta linha
