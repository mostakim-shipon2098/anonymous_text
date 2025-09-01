import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, where, orderBy, onSnapshot,
  doc, setDoc, serverTimestamp, getDocs, limit
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ===== Firebase config =====
const firebaseConfig = {
    apiKey: "AIzaSyBwETJ84D2dQ9gqpPI6xHfV419GAutxjyE",
    authDomain: "anonymous-txt.firebaseapp.com",
    projectId: "anonymous-txt",
    storageBucket: "anonymous-txt.firebasestorage.app",
    messagingSenderId: "808902417685",
    appId: "1:808902417685:web:20ffec7dee6c4f2e1edd1c",
    measurementId: "G-FLXL8JY7QD"
  };
  
// ===== Admin UID =====
const ADMIN_UID = "ItSmZryZgkcs6XEdmmpigz9ycih2";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elements
const yearEl = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();

const authSection = document.getElementById("authSection");
const dashboardSection = document.getElementById("dashboardSection");
const sendSection = document.getElementById("sendSection");
const adminSection = document.getElementById("adminSection");

const navDashboard = document.getElementById("navDashboard");
const navAdmin = document.getElementById("navAdmin");
const navLogout = document.getElementById("navLogout");

// Auth elements
const authForm = document.getElementById("authForm");
const displayNameInput = document.getElementById("displayName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const authError = document.getElementById("authError");

// Dashboard
const userName = document.getElementById("userName");
const shareLinkInput = document.getElementById("shareLink");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const messageList = document.getElementById("messageList");
const emptyState = document.getElementById("emptyState");

// Send page
const sendForm = document.getElementById("sendForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const sendStatus = document.getElementById("sendStatus");
const sendError = document.getElementById("sendError");

// Admin
const adminSearch = document.getElementById("adminSearch");
const refreshAdmin = document.getElementById("refreshAdmin");
const adminList = document.getElementById("adminList");
const adminEmpty = document.getElementById("adminEmpty");

let unsubInbox = null;

// ---------- Routing ----------
window.addEventListener("hashchange", handleRoute);
handleRoute(); // initial

function handleRoute() {
  const hash = location.hash || "";
  const match = hash.match(/^#\/u\/([A-Za-z0-9_-]{6,})$/);

  if (match) {
    showOnly(sendSection);
    sendSection.dataset.toUid = match[1];
  } else {
    if (auth.currentUser) {
      showOnly(dashboardSection);
      loadDashboard();
    } else {
      showOnly(authSection);
    }
  }
}

function showOnly(section) {
  [authSection, dashboardSection, sendSection, adminSection].forEach(s => s.classList.add("hidden"));
  section.classList.remove("hidden");
}

// ---------- Auth ----------
signupBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  authError.textContent = "";
  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const dn = displayNameInput.value.trim() || "";
    if (!email || !password) throw new Error("Email and password required.");

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (dn) await updateProfile(cred.user, { displayName: dn });

    await setDoc(doc(collection(db, "users"), cred.user.uid), {
      displayName: dn || cred.user.displayName || "",
      email,
      createdAt: serverTimestamp()
    });

    location.hash = "";
  } catch(err) {
    authError.textContent = err.message;
  }
});

loginBtn.addEventListener("click", async () => {
  authError.textContent = "";
  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    await signInWithEmailAndPassword(auth, email, password);
    location.hash = "";
  } catch(err) {
    authError.textContent = err.message;
  }
});

// ---------- Session ----------
onAuthStateChanged(auth, (user) => {
  navDashboard.classList.toggle("hidden", !user);
  navLogout.classList.toggle("hidden", !user);
  navAdmin.classList.toggle("hidden", !(user && user.uid === ADMIN_UID));

  if (!user) {
    if (location.hash.includes("#/u/")) {
      showOnly(sendSection);
    } else {
      showOnly(authSection);
    }
    if (unsubInbox) unsubInbox();
    return;
  }

  if (!location.hash || location.hash === "#") {
    showOnly(dashboardSection);
    loadDashboard();
  }
});

// Logout
navLogout.addEventListener("click", async () => { await signOut(auth); });

// ---------- Dashboard ----------
async function loadDashboard() {
  const u = auth.currentUser;
  if (!u) return;

  userName.textContent = u.displayName || u.email || "User";
  const base = `${location.origin}${location.pathname}`;
  const link = `${base}#/u/${u.uid}`;
  shareLinkInput.value = link;

  copyLinkBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(link);
      copyLinkBtn.textContent = "Copied!";
      setTimeout(() => copyLinkBtn.textContent = "Copy", 1200);
    } catch {
      shareLinkInput.select();
      document.execCommand("copy");
    }
  };

  // Inbox (recipient view only shows messages)
  if (unsubInbox) unsubInbox();
  const qInbox = query(
    collection(db, "messages"),
    where("toUid", "==", u.uid),
    orderBy("createdAt", "desc")
  );

  unsubInbox = onSnapshot(qInbox, (snap) => {
    messageList.innerHTML = "";
    if (snap.empty) {
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");

    snap.forEach(docSnap => {
      const m = docSnap.data();
      const li = document.createElement("li");
      li.innerHTML = `
        <div>${escapeHTML(m.content || "")}</div>
        <div class="meta">Received: ${m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : "…"}</div>
      `;
      messageList.appendChild(li);
    });
  });
}

// ---------- Send Page ----------
sendForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  sendStatus.textContent = "";
  sendError.textContent = "";
  sendBtn.disabled = true;

  try {
    const toUid = sendSection.dataset.toUid;
    const content = messageInput.value.trim();
    if (!content) throw new Error("Message cannot be empty");

    // Save message WITHOUT requiring login
    await addDoc(collection(db, "messages"), {
      toUid,
      content,
      createdAt: serverTimestamp(),
      fromUid: auth.currentUser?.uid || null,
      fromEmail: auth.currentUser?.email || null
    });

    messageInput.value = "";
    sendStatus.textContent = "Message sent ✅";

  } catch (err) {
    sendError.textContent = err.message;
  } finally {
    sendBtn.disabled = false;
  }
});

// ---------- Admin ----------
async function loadAdmin() {
  adminList.innerHTML = "";
  adminEmpty.classList.add("hidden");

  const u = auth.currentUser;
  if (!u || u.uid !== ADMIN_UID) {
    adminList.innerHTML = `<li>Access denied.</li>`;
    return;
  }

  const qAll = query(collection(db, "messages"), orderBy("createdAt", "desc"), limit(100));
  const snap = await getDocs(qAll);

  if (snap.empty) {
    adminEmpty.classList.remove("hidden");
    return;
  }

  const term = (adminSearch.value || "").toLowerCase().trim();
  let count = 0;
  snap.forEach(docSnap => {
    const m = docSnap.data();
    const line = [
      `To: ${m.toUid || "?"}`,
      `From: ${m.fromEmail || m.fromUid || "Anonymous"}`,
      `At: ${m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : "…"}`,
    ].join(" | ");

    if (term && !line.toLowerCase().includes(term)) return;

    const li = document.createElement("li");
    li.innerHTML = `<div class="meta">${line}</div><div>${escapeHTML(m.content || "")}</div>`;
    adminList.appendChild(li);
    count++;
  });

  if (count === 0) adminEmpty.classList.remove("hidden");
}

refreshAdmin.addEventListener("click", loadAdmin);

// ---------- Utilities ----------
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));
}
