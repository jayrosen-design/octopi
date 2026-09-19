// Project files: everything this browser has saved, bundled as one JSON document that can be exported,
// imported, or synced to a shared Google Drive folder so a group can work on the same project.
import {getConfig,saveConfig} from './octopi-config.js';
import {getAccount} from './octopi-account.js';
const KEYS={research:'deepsea-research-v1',agents:'deepsea-clay-agents-v1',collections:'octopi-agent-collections-v1',garden:'octopi-garden-knowledge-v1',points:'octopi-points'};
const META='octopi-project-meta-v1';
function readJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
export function projectMeta(){return readJSON(META,{name:'My Octopi project',driveFileId:'',driveFolderId:'',lastSync:0,contributors:[]});}
export function saveProjectMeta(patch){const next={...projectMeta(),...patch};localStorage.setItem(META,JSON.stringify(next));window.dispatchEvent(new Event('project-updated'));return next;}
export function projectBundle(){
 const account=getAccount(),meta=projectMeta();
 return {format:'octopi-project',version:1,name:meta.name,exported:Date.now(),author:account?{id:account.id,name:account.name,provider:account.provider}:null,contributors:meta.contributors,
  research:readJSON(KEYS.research,[]),agents:readJSON(KEYS.agents,[]),collections:readJSON(KEYS.collections,{}),garden:readJSON(KEYS.garden,{}),points:readJSON(KEYS.points,{total:0,events:[]})};
}
export function bundleSummary(bundle){const c=bundle.collections||{};return {research:(bundle.research||[]).length,agents:(bundle.agents||[]).length,items:Object.values(c).reduce((n,v)=>n+(v?.length||0),0),pods:Object.values(bundle.garden||{}).reduce((n,v)=>n+(v?.length||0),0)};}
function mergeById(local,incoming,limit){const seen=new Map(local.map(x=>[x.id,x]));for(const item of incoming||[]){if(!item||typeof item.id!=='string')continue;const mine=seen.get(item.id);if(!mine||(item.updated||0)>(mine.updated||0))seen.set(item.id,item);}return [...seen.values()].sort((a,b)=>(b.updated||0)-(a.updated||0)).slice(0,limit);}
// Merge keeps both sides' work; replace adopts the file as-is.
export function importBundle(bundle,mode='merge'){
 if(!bundle||bundle.format!=='octopi-project')throw Error('This is not an Octopi project file.');
 const account=getAccount();
 if(mode==='replace'){for(const [k,key] of Object.entries(KEYS))if(bundle[k]!==undefined)localStorage.setItem(key,JSON.stringify(bundle[k]));}
 else{
  localStorage.setItem(KEYS.research,JSON.stringify(mergeById(readJSON(KEYS.research,[]),bundle.research,24)));
  localStorage.setItem(KEYS.agents,JSON.stringify(mergeById(readJSON(KEYS.agents,[]),bundle.agents,4)));
  const collections=readJSON(KEYS.collections,{});for(const [agent,items] of Object.entries(bundle.collections||{}))collections[agent]=mergeById(collections[agent]||[],items,60);localStorage.setItem(KEYS.collections,JSON.stringify(collections));
  const garden=readJSON(KEYS.garden,{});for(const [team,nodes] of Object.entries(bundle.garden||{})){const known=new Set((garden[team]||[]).map(n=>n.id));garden[team]=[...(garden[team]||[]),...(nodes||[]).filter(n=>n&&typeof n.id==='string'&&!known.has(n.id))].slice(-24);}localStorage.setItem(KEYS.garden,JSON.stringify(garden));
 }
 const contributors=[...new Set([...(projectMeta().contributors||[]),...(bundle.contributors||[]),bundle.author?.name,account?.name].filter(Boolean))].slice(0,20);
 const mine=projectMeta().name;
 saveProjectMeta({name:mode==='replace'||mine==='My Octopi project'?(bundle.name||mine):mine,contributors,lastSync:Date.now()});
 for(const event of ['research-updated','collections-updated','garden-knowledge-updated'])window.dispatchEvent(new Event(event));
 return bundleSummary(bundle);
}
export function downloadBundle(){const bundle=projectBundle();const blob=new Blob([JSON.stringify(bundle,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(bundle.name||'octopi-project').replace(/[^\w-]+/g,'-').toLowerCase()+'.octopi.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);}

// Google Drive through Google Identity Services + the Drive REST API. Only files this app creates are visible (drive.file scope).
const SCOPE='https://www.googleapis.com/auth/drive.file';
let token=null,tokenExpires=0,gisLoading=null;
export function driveReady(){return !!getConfig().googleClientId;}
export function driveConnected(){return !!token&&Date.now()<tokenExpires;}
function loadGIS(){if(window.google?.accounts?.oauth2)return Promise.resolve();return gisLoading||(gisLoading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=resolve;s.onerror=()=>reject(Error('Google sign-in script could not load. Check your connection.'));document.head.append(s);}));}
export async function connectDrive(){
 const clientId=getConfig().googleClientId;if(!clientId)throw Error('Add a Google OAuth client ID on the Account page to connect Drive.');
 await loadGIS();
 return new Promise((resolve,reject)=>{const client=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:SCOPE,callback:r=>{if(r.error){reject(Error(r.error_description||r.error));return;}token=r.access_token;tokenExpires=Date.now()+(Number(r.expires_in)||3600)*1000-30000;window.dispatchEvent(new Event('drive-connected'));resolve(token);}});client.requestAccessToken({prompt:token?'':'consent'});});
}
export function disconnectDrive(){if(token&&window.google?.accounts?.oauth2)try{google.accounts.oauth2.revoke(token,()=>{});}catch{}token=null;tokenExpires=0;window.dispatchEvent(new Event('drive-connected'));}
async function drive(path,options={}){
 if(!driveConnected())await connectDrive();
 const res=await fetch('https://www.googleapis.com/'+path,{...options,headers:{Authorization:'Bearer '+token,...(options.headers||{})}});
 if(res.status===401){token=null;throw Error('Google Drive session expired. Connect again.');}
 if(!res.ok){let detail='';try{detail=(await res.json()).error?.message||'';}catch{}throw Error('Google Drive request failed'+(detail?': '+detail:'.'));}
 return res.status===204?null:res.json();
}
async function ensureFolder(){
 const meta=projectMeta();if(meta.driveFolderId){try{await drive('drive/v3/files/'+meta.driveFolderId+'?fields=id,trashed').then(f=>{if(f.trashed)throw 0;});return meta.driveFolderId;}catch{}}
 const name=getConfig().driveFolderName||'Octopi AI';
 const found=await drive('drive/v3/files?q='+encodeURIComponent(`name='${name.replace(/'/g,"\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)+'&fields=files(id)');
 const id=found.files?.[0]?.id||(await drive('drive/v3/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder'})})).id;
 saveProjectMeta({driveFolderId:id});return id;
}
export async function listDriveProjects(){const folder=await ensureFolder();const data=await drive('drive/v3/files?q='+encodeURIComponent(`'${folder}' in parents and trashed=false and mimeType='application/json'`)+'&fields=files(id,name,modifiedTime,owners(displayName),lastModifyingUser(displayName),webViewLink)&orderBy=modifiedTime desc');return data.files||[];}
export async function saveToDrive(){
 const folder=await ensureFolder(),bundle=projectBundle(),meta=projectMeta();
 const fileName=(bundle.name||'Octopi project').replace(/[\\/:*?"<>|]+/g,'-')+'.octopi.json';
 const body=new FormData();body.append('metadata',new Blob([JSON.stringify(meta.driveFileId?{name:fileName}:{name:fileName,parents:[folder],mimeType:'application/json'})],{type:'application/json'}));body.append('file',new Blob([JSON.stringify(bundle)],{type:'application/json'}));
 const url=meta.driveFileId?'upload/drive/v3/files/'+meta.driveFileId+'?uploadType=multipart&fields=id,webViewLink,modifiedTime':'upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,modifiedTime';
 let file;try{file=await drive(url,{method:meta.driveFileId?'PATCH':'POST',body});}catch(error){if(meta.driveFileId){saveProjectMeta({driveFileId:''});return saveToDrive();}throw error;}
 saveProjectMeta({driveFileId:file.id,lastSync:Date.now(),driveLink:file.webViewLink||''});return file;
}
export async function loadFromDrive(fileId,mode='merge'){const bundle=await drive('drive/v3/files/'+fileId+'?alt=media');const summary=importBundle(bundle,mode);saveProjectMeta({driveFileId:fileId,lastSync:Date.now()});return summary;}
export async function driveFolderLink(){const id=await ensureFolder();return 'https://drive.google.com/drive/folders/'+id;}
export async function shareDriveFolder(email){const id=await ensureFolder();await drive('drive/v3/files/'+id+'/permissions?sendNotificationEmail=true',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'user',role:'writer',emailAddress:email})});return id;}
export {saveConfig};
