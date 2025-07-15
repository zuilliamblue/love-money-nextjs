// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // Adicionado: Para autenticação de usuários
import { getFirestore } from "firebase/firestore"; // Adicionado: Para o banco de dados Firestore

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDsUH_2WsUUprHLUA7qtAx9-jt93v1pbZY",
  authDomain: "love-money-b6544.firebaseapp.com",
  projectId: "love-money-b6544",
  storageBucket: "love-money-b6544.firebasestorage.app",
  messagingSenderId: "1034972487841",
  appId: "1:1034972487841:web:b62ab17a65d211508e10e0",
  measurementId: "G-KLG9Y0FLYK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Adicionado: Exporta as instâncias de Auth e Firestore para serem usadas em outras partes do seu app
export const auth = getAuth(app);
export const db = getFirestore(app);