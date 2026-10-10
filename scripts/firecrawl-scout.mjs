import {ecoOpportunity} from '../worker/ecosystem-core.js';
export const FIRECRAWL_DOMAINS=['weworkremotely.com','jobs.lever.co','boards.greenhouse.io','job-boards.greenhouse.io','freelancermap.com'];
export function normalizeFirecrawl(page,domains=FIRECRAWL_DOMAINS){
 try{
  const url=new URL(page.url||page.metadata?.sourceURL||'');
  if(url.protocol!=='https:'||url.username||url.password||!domains.some(d=>url.hostname===d||url.hostname.endsWith('.'+d)))return null;
  if(/\/(login|signin|sign-in|register|signup|search|categories|category)(\/|$)/i.test(url.pathname))return null;
  if(page.metadata?.statusCode&&page.metadata.statusCode!==200)return null;
  const title=String(page.title||page.metadata?.title||'').trim(),markdown=String(page.markdown||'').trim();
  if(markdown.length<100||!title||/\b(full[ -]?time|permanent)\b/i.test(title)||!/\b(contract|freelance|freelancer|project[ -]based)\b/i.test(title+' '+markdown.slice(0,1500)))return null;
  if(/verify you are human|checking your browser|access denied|sign in to (view|continue)|captcha/i.test(markdown.slice(0,1000)))return null;
  // No inferred client name, budget, deadline, eligibility or required language.
  // Preserve original content as untrusted text; unknown location requires review.
  return ecoOpportunity({title:title.slice(0,160),url:url.href,company:'',description:('Discovery: Firecrawl public web search. Verify posting date, location and availability.\n\n'+markdown).slice(0,6000),source:'other',workMode:'unknown',requiredSkills:[]});
 }catch{return null;}
}
export async function discoverFirecrawl(config,fetcher=fetch){
 if(!config?.enabled)return {status:'disabled',results:[]};
 if(typeof config.apiKey!=='string'||!config.apiKey.trim())return {status:'error',results:[],reason:'missing_key'};
 const query=String(config.queries?.[0]||'').trim();
 if(!query||query.length>80)return {status:'error',results:[],reason:'invalid_query'};
 try{
  // One query, at most five pages per invocation; never retries or traverses links.
  const response=await fetcher('https://api.firecrawl.dev/v2/search',{method:'POST',headers:{Authorization:'Bearer '+config.apiKey,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(60000),body:JSON.stringify({query:query+' remote freelance contract',sources:['web'],includeDomains:FIRECRAWL_DOMAINS,limit:5,scrapeOptions:{formats:['markdown'],onlyMainContent:true,proxy:'basic'}})});
  if(!response.ok)return {status:'error',results:[],reason:response.status===402?'credits_exhausted':response.status===429?'rate_limited':'provider_error'};
  const text=await response.text();if(text.length>2000000)throw Error();
  const data=JSON.parse(text);if(data.success!==true||!Array.isArray(data.data?.web))throw Error();
  const unique=new Map();for(const page of data.data.web.slice(0,5)){const item=normalizeFirecrawl(page);if(item)unique.set(item.url,item);}
  return {status:'ok',results:[...unique.values()]};
 }catch{return {status:'error',results:[],reason:'provider_unavailable'};}
}
