// Accounts: a local device account always works; Firebase anonymous or Google sign-in layer on top when configured.
import {getConfig,hasFirebase} from './octopi-config.js';
const KEY='octopi-account-v1',SEEN='octopi-intro-seen';
const FIREBASE='https://www.gstatic.com/firebasejs/10.14.1/';
let firebase=null;
export function getAccount(){try{const a=JSON.parse(localStorage.getItem(KEY)||'null');return a&&typeof a.id==='string'?a:null;}catch{return null;}}
export function setAccount(account){try{if(account)localStorage.setItem(KEY,JSON.stringify(account));else localStorage.removeItem(KEY);}catch{}window.dispatchEvent(new CustomEvent('octopi-account',{detail:account}));return account;}
export function watchAccount(callback){callback(getAccount());addEventListener('octopi-account',e=>callback(e.detail));addEventListener('storage',e=>{if(e.key===KEY)callback(getAccount());});}
export function markIntroSeen(){try{localStorage.setItem(SEEN,'yes');}catch{}}
export function introSeen(){try{return localStorage.getItem(SEEN)==='yes';}catch{return true;}}
export function createLocalAccount(name){const clean=(name||'').trim().slice(0,60)||'Explorer';return setAccount({id:'local-'+crypto.randomUUID(),name:clean,provider:'local',created:Date.now()});}
export function renameAccount(name){const a=getAccount();if(!a)return null;return setAccount({...a,name:(name||'').trim().slice(0,60)||a.name});}
export async function signOut(){try{if(firebase)await firebase.signOut(firebase.auth);}catch{}setAccount(null);}
export function providerLabel(a){return !a?'Not signed in':a.provider==='google'?'Google account':a.provider==='anonymous'?'Firebase guest':'Local account on this device';}
export function initials(a){return (a?.name||'?').split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();}

// Firebase is loaded on demand so pages stay fully functional offline or without a project.
export async function firebaseAuth(){
 if(firebase)return firebase;
 if(!hasFirebase())throw Error('Add your Firebase web config on the Account page to enable Google or guest sign-in.');
 const [{initializeApp,getApps},authModule]=await Promise.all([import(FIREBASE+'firebase-app.js'),import(FIREBASE+'firebase-auth.js')]);
 const app=getApps()[0]||initializeApp(getConfig().firebase);
 const auth=authModule.getAuth(app);
 firebase={app,auth,...authModule};
 authModule.onAuthStateChanged(auth,user=>{const current=getAccount();if(!user){if(current&&current.provider!=='local')setAccount(null);return;}const provider=user.isAnonymous?'anonymous':'google';setAccount({id:user.uid,uid:user.uid,name:user.displayName||(user.isAnonymous?'Guest octopus':'Explorer'),email:user.email||'',photo:user.photoURL||'',provider,created:current?.created||Date.now()});});
 return firebase;
}
export async function signInAnonymously(){const fb=await firebaseAuth();const {user}=await fb.signInAnonymously(fb.auth);return user;}
export async function signInWithGoogle(){const fb=await firebaseAuth();const provider=new fb.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});const {user}=await fb.signInWithPopup(fb.auth,provider);return user;}
export async function restoreFirebaseSession(){if(!hasFirebase())return null;const a=getAccount();if(!a||a.provider==='local')return null;try{await firebaseAuth();}catch{}return a;}
