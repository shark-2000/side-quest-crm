// Freehire adapter derived from the MIT-licensed ai-job-search portal contract.
// See vendor/ai-job-search/LICENSE and THIRD_PARTY_NOTICES.md.
import {ecoOpportunity} from '../worker/ecosystem-core.js';
export function normalizeFreehire(job){
 const employment=String(job.enrichment?.employment_type||'');
 if(/full[ _-]?time|permanent/i.test(employment))return null;
 if(!/\b(contract|freelance|freelancer|project[ -]based)\b/i.test(employment+' '+job.title))return null;
 if(String(job.work_mode).toLowerCase()!=='remote')return null;
 // HTML cleanup follows upstream helpers.ts; all content remains untrusted text.
 const description=String(job.description||'').replace(/<\s*br\s*\/?>/gi,'\n').replace(/<\/(p|li|ul|ol|div|h\d)>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/[ \t]+/g,' ').trim().slice(0,6000);
 if(!description)return null;
 try{return ecoOpportunity({title:String(job.title||'').slice(0,160),company:String(job.company||'').slice(0,200),url:job.url,description,requiredSkills:(job.skills||[]).filter(s=>typeof s==='string'&&s.length<=60).slice(0,20),source:'freehire',workMode:'remote',postedDate:String(job.posted_at||'').slice(0,10)});}catch{return null;}
}
export async function discoverOpportunities(config,fetcher=fetch){
 if(!config?.enabled)return {status:'disabled',results:[]};
 const results=new Map();let errors=0;
 for(const query of (config.queries||[]).slice(0,3)){
  const url=new URL('https://freehire.me/api/v1/agent/jobs/search');
  for(const [k,v]of Object.entries({q:query,limit:'20',offset:'0',semantic_ratio:'0',include_description:'true',description_format:'text',posted_within_days:'14',work_mode:'remote'}))url.searchParams.set(k,v);
  try{const r=await fetcher(url,{headers:{Accept:'application/json','User-Agent':'side-quest-crm/1.0 (+https://github.com/shark-2000/side-quest-crm)'},redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Provider unavailable');const text=await r.text();if(text.length>2000000)throw Error('Provider response too large');const data=JSON.parse(text);if(!Array.isArray(data.data))throw Error('Unexpected provider response');for(const raw of data.data.slice(0,20)){const o=normalizeFreehire(raw);if(o&&!results.has(o.url))results.set(o.url,o);}}catch{errors++;}
 }
 return {status:errors?'error':'ok',results:[...results.values()].slice(0,20)};
}
