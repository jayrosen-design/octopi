// Deployment settings for optional cloud connections. Everything works locally without them.
// Fill these in for a hosted deployment, or paste them on account.html; pasted values are kept
// in this browser (localStorage) and override the defaults below.
export const DEFAULT_CONFIG={
 // Firebase web app config from the Firebase console (Project settings → Your apps → SDK setup).
 // Enable Anonymous and Google sign-in under Authentication → Sign-in method.
 firebase:null, // e.g. {apiKey:'…',authDomain:'your-app.firebaseapp.com',projectId:'your-app',appId:'1:…:web:…'}
 // Google Cloud OAuth 2.0 Web client ID with the Drive API enabled and this origin authorised.
 googleClientId:'',
 driveFolderName:'Octopi AI'
};
const KEY='octopi-config-v1';
export function getConfig(){let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}return {...DEFAULT_CONFIG,...saved,firebase:saved.firebase||DEFAULT_CONFIG.firebase};}
export function saveConfig(patch){const next={...getConfig(),...patch};try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}window.dispatchEvent(new Event('octopi-config'));return next;}
export function hasFirebase(){const f=getConfig().firebase;return !!(f&&f.apiKey&&f.projectId&&f.appId);}
export function hasGoogleClient(){return !!getConfig().googleClientId;}
