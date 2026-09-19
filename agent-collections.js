// Each agent keeps its own data collection on this device. Items can be contributed to a pod's shared bubble.
const KEY='octopi-agent-collections-v1',POD_STORE='octopi-garden-knowledge-v1',LIMIT=60,POD_LIMIT=24;
export const CORE_AGENTS=[
 {id:'strategist',name:'Strategist',keeps:'plans'},
 {id:'investigator',name:'Investigator',keeps:'sources'},
 {id:'synthesizer',name:'Synthesizer',keeps:'reports'},
 {id:'reviewer',name:'Reviewer',keeps:'review notes'}
];
export const TYPE_LABEL={source:'Source',plan:'Plan',report:'Report',note:'Note',chat:'Discussion',review:'Review'};
function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
function write(all){try{localStorage.setItem(KEY,JSON.stringify(all));}catch{}window.dispatchEvent(new CustomEvent('collections-updated'));}
export function agentItems(agentId){return (read()[agentId]||[]).slice();}
export function allCollections(){return read();}
export function collectionCounts(){const all=read();return Object.fromEntries(Object.entries(all).map(([k,v])=>[k,v.length]));}
// Adds an item once per agent; identical titles/urls from the same research are merged.
export function addToAgent(agentId,item){
 if(!agentId||!item||!(item.title||item.text))return null;
 const all=read(),list=all[agentId]||[];
 const id=item.id||agentId+'-'+(item.url||item.title||item.text).slice(0,80).replace(/\W+/g,'-').toLowerCase()+'-'+(item.research||'');
 if(list.some(x=>x.id===id))return null;
 const entry={id,type:item.type||'note',title:(item.title||item.text||'').slice(0,160),url:item.url||'',note:(item.note||item.content||item.text||'').slice(0,2000),research:item.research||'',researchTitle:item.researchTitle||'',demo:!!item.demo,created:Date.now(),contributed:[]};
 all[agentId]=[entry,...list].slice(0,LIMIT);write(all);return entry;
}
export function removeFromAgent(agentId,itemId){const all=read();all[agentId]=(all[agentId]||[]).filter(x=>x.id!==itemId);write(all);}
export function clearAgent(agentId){const all=read();delete all[agentId];write(all);}
// Route a research event to the agent whose job it represents.
export function recordEvidence(message,context={}){
 const research=context.research||message.session||'',researchTitle=context.title||message.title||'';
 const base={research,researchTitle,demo:!!message.demo};
 if(message.action==='sources')for(const s of (message.sources||[]).slice(0,8))addToAgent('investigator',{...base,type:'source',title:s.title,url:s.url,note:s.content});
 if(message.action==='plan')addToAgent('strategist',{...base,type:'plan',title:'Plan · '+(message.question||researchTitle||'research').slice(0,90),note:message.text});
 if(message.action==='report')addToAgent('synthesizer',{...base,type:'report',title:'Report · '+(message.question||researchTitle||'research').slice(0,90),note:message.text});
 if(message.action==='review')addToAgent('reviewer',{...base,type:'review',title:'Review · '+(message.question||researchTitle||'research').slice(0,90),note:message.text});
 if(message.action==='chat'){const agent=CORE_AGENTS[(message.agent||0)%4]?.id;if(agent)addToAgent(agent,{...base,type:'chat',title:(message.name||agent)+' · round '+(message.round||1)+' · '+String(message.text||'').slice(0,60),note:message.text});}
}
// Pod bubbles share the Garden's knowledge store so contributed items appear as graph nodes.
export function podNodes(teamId){try{const shared=JSON.parse(localStorage.getItem(POD_STORE)||'{}');return Array.isArray(shared[teamId])?shared[teamId]:[];}catch{return [];}}
export function contributeToPod(agentId,teamId,itemIds){
 const all=read(),items=(all[agentId]||[]).filter(x=>itemIds.includes(x.id));if(!items.length)return 0;
 let shared={};try{shared=JSON.parse(localStorage.getItem(POD_STORE)||'{}');}catch{}
 const existing=Array.isArray(shared[teamId])?shared[teamId]:[],known=new Set(existing.map(n=>n.id));
 const agent=CORE_AGENTS.find(a=>a.id===agentId)?.name||agentId;
 const incoming=items.filter(x=>!known.has('coll-'+x.id)).map(x=>({id:'coll-'+x.id,title:x.title,type:'shared',origin:agent+"'s collection",note:(x.note||x.title).slice(0,1600),url:x.url||undefined,kind:TYPE_LABEL[x.type]||'Note',citation:x.url?x.title+'. '+x.url:undefined}));
 const next=[...existing,...incoming].slice(-POD_LIMIT);
 try{localStorage.setItem(POD_STORE,JSON.stringify({...shared,[teamId]:next}));}catch{return 0;}
 for(const item of items){if(!item.contributed.includes(teamId))item.contributed.push(teamId);}write(all);
 window.dispatchEvent(new CustomEvent('garden-knowledge-updated',{detail:{teamId,count:incoming.length}}));return incoming.length;
}
