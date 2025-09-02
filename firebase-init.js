// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJgBqRB9ID-eYwsz-swtl1WfDbUld9iMw",
  authDomain: "filedorp-app.firebaseapp.com",
  projectId: "filedorp-app",
  storageBucket: "filedorp-app.appspot.com",
  messagingSenderId: "920926269277",
  appId: "1:920926269277:web:9f48d8ec92c27b938082b4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, auth, storage };