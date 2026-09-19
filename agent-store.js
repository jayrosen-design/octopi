const KEY='deepsea-clay-agents-v1';
export function loadAgents(){try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(value)?value.slice(0,4):[];}catch{return [];}}
export function saveAgent(config){const agents=loadAgents().filter(a=>a.id!==config.id);localStorage.setItem(KEY,JSON.stringify([config,...agents].slice(0,4)));}
