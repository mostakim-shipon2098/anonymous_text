// ✅ Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ✅ Replace with your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBwETJ84D2dQ9gqpPI6xHfV419GAutxjyE",
    authDomain: "anonymous-txt.firebaseapp.com",
    projectId: "anonymous-txt",
    storageBucket: "anonymous-txt.firebasestorage.app",
    messagingSenderId: "808902417685",
    appId: "1:808902417685:web:20ffec7dee6c4f2e1edd1c",
    measurementId: "G-FLXL8JY7QD"
  };
  

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Replace with your Admin UID
const ADMIN_UID = "ItSmZryZgkcs6XEdmmpigz9ycih2";

// ---------------------------------------------------
// 🔹 Sign Up
// ---------------------------------------------------
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = e.target.email.value;
  const password = e.target.password.value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Account created successfully!");
  } catch (err) {
    alert("Error: " + err.message);
  }
});

// ---------------------------------------------------
// 🔹 Login
// ---------------------------------------------------
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = e.target.email.value;
  const password = e.target.password.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Login successful!");
  } catch (err) {
    alert("Error: " + err.message);
  }
});

// ---------------------------------------------------
// 🔹 Logout
// ---------------------------------------------------
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  alert("Logged out successfully!");
});

// ---------------------------------------------------
// 🔹 Listen to Auth State
// ---------------------------------------------------
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("authSection").style.display = "none";
    document.getElementById("dashboard").style.display = "block";

    // Show shareable link
    const link = `${window.location.origin}${window.location.pathname}#/u/${user.uid}`;
    document.getElementById("shareLink").textContent = link;
    document.getElementById("shareLink").href = link;

    // Load inbox
    if (user.uid === ADMIN_UID) {
      loadAdminInbox();
    } else {
      loadUserInbox(user);
    }
  } else {
    document.getElementById("authSection").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
  }
});

// ---------------------------------------------------
// 🔹 Load Normal User Inbox
// ---------------------------------------------------
function loadUserInbox(user) {
  const messagesRef = collection(db, "messages");
  const q = query(messagesRef, where("recipientId", "==", user.uid), orderBy("timestamp", "desc"));

  onSnapshot(q, (snapshot) => {
    const inbox = document.getElementById("inbox");
    inbox.innerHTML = "";
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const p = document.createElement("p");
      p.textContent = msg.text; // user sees only text
      inbox.appendChild(p);
    });
  });
}

// ---------------------------------------------------
// 🔹 Load Admin Inbox
// ---------------------------------------------------
function loadAdminInbox() {
  const messagesRef = collection(db, "messages");
  const q = query(messagesRef, orderBy("timestamp", "desc"));

  onSnapshot(q, (snapshot) => {
    const inbox = document.getElementById("inbox");
    inbox.innerHTML = "";
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const p = document.createElement("p");
      p.textContent = `To: ${msg.recipientId} | From: ${msg.senderId || "Anonymous"} | Message: ${msg.text}`;
      inbox.appendChild(p);
    });
  });
}

// ---------------------------------------------------
// 🔹 Handle Anonymous Message Sending
// ---------------------------------------------------
async function sendAnonymousMessage(recipientId, message) {
  try {
    await addDoc(collection(db, "messages"), {
      recipientId: recipientId,
      senderId: auth.currentUser ? auth.currentUser.uid : null,
      text: message,
      timestamp: serverTimestamp()
    });
    alert("Message sent!");
  } catch (err) {
    alert("Error sending message: " + err.message);
  }
}

// ---------------------------------------------------
// 🔹 Check if visiting a shared link
// ---------------------------------------------------
window.addEventListener("load", () => {
  if (window.location.hash.startsWith("#/u/")) {
    const recipientId = window.location.hash.split("/u/")[1];
    document.getElementById("sendMessageSection").style.display = "block";

    document.getElementById("messageForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const message = e.target.message.value;
      sendAnonymousMessage(recipientId, message);
      e.target.reset();
    });
  }
});

