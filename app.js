import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, getDocs, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ---------------- Firebase Config ----------------
const firebaseConfig = {
    apiKey: "AIzaSyBwETJ84D2dQ9gqpPI6xHfV419GAutxjyE",
    authDomain: "anonymous-txt.firebaseapp.com",
    projectId: "anonymous-txt",
    storageBucket: "anonymous-txt.firebasestorage.app",
    messagingSenderId: "808902417685",
    appId: "1:808902417685:web:20ffec7dee6c4f2e1edd1c",
    measurementId: "G-FLXL8JY7QD"
  };
  
const ADMIN_UID = "ItSmZryZgkcs6XEdmmpigz9ycih2";

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

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const displayNameInput = document.getElementById("displayName");
const authError = document.getElementById("authError");

const userName = document.getElementById("userName");
const shareLinkInput = document.getElementById("shareLink");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const messageList = document.getElementById("messageList");
const emptyState = document.getElementById("emptyState");

const sendForm = document.getElementById("sendForm");
const messageInput = document.getElementById("messageInput");
const sendStatus = document.getElementById("sendStatus");
const sendError = document.getElementById("sendError");

const adminSearch = document.getElementById("adminSearch");
const refreshAdmin = document.getElementById("refreshAdmin");
const adminList = document.getElementById("adminList");
const adminEmpty = document.getElementById("adminEmpty");

// ---------- Signup ----------
signupBtn.addEventListener("click", async (e)=>{
  e.preventDefault();
  authError.textContent = "";
  try{
    const cred = await createUserWithEmailAndPassword(auth,emailInput.value,passwordInput.value);
    location.hash="";
  }catch(err){ authError.textContent = err.message; }
});

// ---------- Login ----------
loginBtn.addEventListener("click", async ()=>{
  authError.textContent="";
  try{ await signInWithEmailAndPassword(auth,emailInput.value,passwordInput.value); location.hash=""; }
  catch(err){ authError.textContent = err.message; }
});

// ---------- Logout ----------
onAuthStateChanged(auth,user=>{
  if(user){
    showOnly(dashboardSection);
    userName.textContent = user.email;
    const link = `${location.origin}${location.pathname}#/u/${user.uid}`;
    shareLinkInput.value = link;

    copyLinkBtn.onclick = ()=>{navigator.clipboard.writeText(link);};

    // Load user inbox
    const qInbox = query(collection(db,"messages"),where("toUid","==",user.uid),orderBy("createdAt","desc"));
    onSnapshot(qInbox,snap=>{
      messageList.innerHTML="";
      if(snap.empty){emptyState.classList.remove("hidden");return;}
      emptyState.classList.add("hidden");
      snap.forEach(docSnap=>{
        const m = docSnap.data();
        const li=document.createElement("li");
        li.textContent = m.content;
        messageList.appendChild(li);
      });
    });
  } else { showOnly(authSection); }
});

// ---------- Send Message ----------
sendForm.addEventListener("submit",async(e)=>{
  e.preventDefault();
  sendStatus.textContent="";
  sendError.textContent="";
  try{
    const toUid = location.hash.split("/u/")[1];
    const content = messageInput.value.trim();
    if(!content) throw new Error("Message empty");
    await addDoc(collection(db,"messages"),{toUid,content,createdAt:serverTimestamp()});
    messageInput.value="";
    sendStatus.textContent="Message sent ✅";
  }catch(err){ sendError.textContent=err.message; }
});

// ---------- Admin ----------
async function loadAdmin(){
  adminList.innerHTML="";
  adminEmpty.classList.add("hidden");
  const u = auth.currentUser;
  if(!u || u.uid!==ADMIN_UID){adminList.innerHTML="<li>Access denied</li>"; return;}
  const snap = await getDocs(query(collection(db,"messages"),orderBy("createdAt","desc"),limit(100)));
  if(snap.empty){adminEmpty.classList.remove("hidden");return;}
  snap.forEach(docSnap=>{
    const m=docSnap.data();
    const li=document.createElement("li");
    li.innerHTML=`To: ${m.toUid} | From: ${m.fromUid||"Anonymous"}<br>${m.content}`;
    adminList.appendChild(li);
  });
}
refreshAdmin.addEventListener("click",loadAdmin);

// ---------- Utils ----------
function showOnly(section){
  [authSection,dashboardSection,sendSection,adminSection].forEach(s=>s.classList.add("hidden"));
  section.classList.remove("hidden");
}

// ---------- Route ----------
window.addEventListener("hashchange",()=>{
  if(location.hash.startsWith("#/u/")) showOnly(sendSection);
  else showOnly(dashboardSection);
});
window.dispatchEvent(new Event("hashchange"));
