// =============================
//  Anon Inbox (Firebase Client)
// =============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, where, orderBy, onSnapshot,
  doc, setDoc, serverTimestamp, getDocs, limit
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ===== 1) Replace with YOUR Firebase config =====
const firebaseConfig = {
    apiKey: "AIzaSyBwETJ84D2dQ9gqpPI6xHfV419GAutxjyE",
    authDomain: "anonymous-txt.firebaseapp.com",
    projectId: "anonymous-txt",
    storageBucket: "anonymous-txt.firebasestorage.app",
    messagingSenderId: "808902417685",
    appId: "1:808902417685:web:20ffec7dee6c4f2e1edd1c",
    measurementId: "G-FLXL8JY7QD"
  };
  
    

// ===== 2) Set your Admin UID (after you sign up once, copy your uid) =====
const ADMIN_UID = "ItSmZryZgkcs6XEdmmpigz9ycih2";

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elements
const yearEl = document.getElementById("year");
const authSection = document.getElementById("authSection");
const dashboardSection = document.getElementById("dashboardSection");
const sendSection = document.getElementById("sendSection");
const adminSection = document.getElementById("adminSection");

const navDashboard = document.getElementById("navDashboard");
const navAdmin = document.getElementById("navAdmin");
const navLogout = document.getElementById("navLogout");

// Auth form elements
const authForm = document.getElementById("authForm");
const displayNameInput = document.getElementById("displayName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const authError = document.getElementById("authError");

// Dashboard elements
const userName = document.getElementById("userName");
const shareLinkInput = document.getElementById("shareLink");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const messageList = document.getElementById("messageList");
const emptyState = document.getElementById("emptyState");

// Send page elements
const sendForm = document.getElementById("sendForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const sendStatus = document.getElementById("sendStatus");
const sendError = document.getElementById("sendError");
const sendAuthGate = document.getElementById("sendAuthGate");
const sendAuthForm = document.getElementById("sendAuthForm");
const sEmail = document.getElementById("sEmail");
const sPassword = document.getElementById("sPassword");
const sLoginBtn = document.getElementById("sLoginBtn");
const sSignupBtn = document.getElementById("sSignupBtn");
const sendAuthError = document.getElementById("sendAuthError");

// Admin elements
const adminSearch = document.getElementById("adminSearch");
const refreshAdmin = document.getElementById("refreshAdmin");
const adminList = document.getElementById("adminList");
const adminEmpty = document.getElementById("adminEmpty");

yearEl.textContent = new Date().getFullYear();

// ---------- Routing ----------
window.addEventListener("hashchange", handleRoute);
function handleRoute() {
  const hash = location.hash || "";
  // Routes:
  // "" -> auth or dashboard
  // "#/u/<uid>" -> send page
  const match = hash.match(/^#\/u\/([A-Za-z0-9_-]{6,})$/);
  if (match) {
    showOnly(sendSection);
    const toUid = match[1];
    sendSection.dataset.toUid = toUid;
    prepareSendPage();
  } else {
    // default page for signed-in vs signed-out
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

// ---------- Auth: Signup / Login ----------
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
});

signupBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  authError.textContent = "";
  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const dn = (displayNameInput.value || "").trim();
    if (!email || !password) throw new Error("Email and password are required.");

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (dn) await updateProfile(cred.user, { displayName: dn });

    // Create user doc (optional metadata)
    await setDoc(doc(collection(db, "users"), cred.user.uid), {
      displayName: dn || cred.user.displayName || "",
      email,
      createdAt: serverTimestamp()
    });

    // Route to dashboard
    location.hash = "";
  } catch (err) {
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
  } catch (err) {
    authError.textContent = err.message;
  }
});

// ---------- Session listener ----------
let unsubInbox = null;
onAuthStateChanged(auth, (user) => {
  // Toggle nav buttons
  navDashboard.classList.toggle("hidden", !user);
  navLogout.classList.toggle("hidden", !user);
  navAdmin.classList.toggle("hidden", !(user && user.uid === ADMIN_UID));

  if (!user) {
    // Go to send page if deep-linked, else auth
    const match = (location.hash || "").match(/^#\/u\/([A-Za-z0-9_-]{6,})$/);
    if (match) {
      showOnly(sendSection);
      prepareSendPage();
    } else {
      showOnly(authSection);
    }
    if (unsubInbox) unsubInbox();
    return;
  }
  // Logged in
  if (!location.hash || location.hash === "#") {
    showOnly(dashboardSection);
    loadDashboard();
  } else {
    handleRoute();
  }
});

navDashboard.addEventListener("click", () => { location.hash = ""; });
navAdmin.addEventListener("click", () => { showOnly(adminSection); loadAdmin(); });
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
      // fallback
      shareLinkInput.select();
      document.execCommand("copy");
    }
  };

  // Live inbox (recipient view, hide sender)
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
function prepareSendPage() {
  const toUid = sendSection.dataset.toUid;
  sendStatus.textContent = "";
  sendError.textContent = "";

  // Require auth to send (admin can see sender; recipient cannot)
  if (auth.currentUser) {
    sendAuthGate.classList.add("hidden");
    sendForm.classList.remove("hidden");
  } else {
    sendAuthGate.classList.remove("hidden");
    sendForm.classList.add("hidden");
  }
}

sendForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  sendStatus.textContent = "";
  sendError.textContent = "";
  sendBtn.disabled = true;

  try {
    const toUid = sendSection.dataset.toUid;
    const fromUid = auth.currentUser?.uid || null;
    const fromEmail = auth.currentUser?.email || null;
    const content = (messageInput.value || "").trim();

    if (!toUid) throw new Error("Invalid recipient.");
    if (!fromUid) throw new Error("Please log in to send.");

    if (!content || content.length < 2) throw new Error("Message is too short.");
    if (content.length > 2000) throw new Error("Message is too long (max 2000 chars).");

    await addDoc(collection(db, "messages"), {
      toUid,
      fromUid,
      fromEmail,
      content,
      createdAt: serverTimestamp()
    });

    messageInput.value = "";
    sendStatus.textContent = "Message sent ✅";
  } catch (err) {
    sendError.textContent = err.message;
  } finally {
    sendBtn.disabled = false;
  }
});

// Send Auth Gate
sendAuthForm.addEventListener("submit", (e) => e.preventDefault());

sLoginBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  sendAuthError.textContent = "";
  try {
    const email = sEmail.value.trim();
    const password = sPassword.value.trim();
    await signInWithEmailAndPassword(auth, email, password);
    prepareSendPage();
  } catch (err) {
    sendAuthError.textContent = err.message;
  }
});

sSignupBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  sendAuthError.textContent = "";
  try {
    const email = sEmail.value.trim();
    const password = sPassword.value.trim();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Optional: default displayName to email prefix
    const nick = email.split("@")[0];
    await updateProfile(cred.user, { displayName: nick });
    prepareSendPage();
  } catch (err) {
    sendAuthError.textContent = err.message;
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

  // Simple fetch (latest 100)
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
      `From: ${m.fromEmail || m.fromUid || "?"}`,
      `At: ${m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : "…"}`,
    ].join(" | ");

    if (term && !line.toLowerCase().includes(term)) return;

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="meta">${line}</div>
      <div>${escapeHTML(m.content || "")}</div>
    `;
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

// Initial route
handleRoute();
