const CRM_STAGES=new Set(['new','contacted','proposal','won','lost']);
const CRM_SOURCES=new Set(['upwork','linkedin','referral','agency','other']);
const CRM_ORIGIN='https://katyayan-cloud-data.bubblymink4.chatgpt.site';
const CRM_WORKFLOW='shark-2000/side-quest-crm/.github/workflows/crm-sync.yml@refs/heads/main';
let jwksCache=null;
const crmToday=()=>new Date(Date.now()+19800000).toISOString().slice(0,10);
const crmJSON=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const crmBytes=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export function validGithubClaims(c,audience,now=Math.floor(Date.now()/1000)){
 return c.iss==='https://token.actions.githubusercontent.com'&&c.aud===audience&&c.repository_id==='1413259508'&&c.repository_owner_id==='77532747'&&c.repository==='shark-2000/side-quest-crm'&&c.ref==='refs/heads/main'&&c.workflow_ref===CRM_WORKFLOW&&['push','schedule','workflow_dispatch'].includes(c.event_name)&&typeof c.exp==='number'&&c.exp>now&&typeof c.nbf==='number'&&c.nbf<=now+30&&typeof c.iat==='number'&&c.iat<=now+30&&c.iat>=now-600&&typeof c.run_id==='string'&&[
 'repo:shark-2000/side-quest-crm:ref:refs/heads/main',
 'repo:shark-2000@77532747/side-quest-crm@1413259508:ref:refs/heads/main'
 ].includes(c.sub);
}
export async function verifyGithubToken(token,audience){
 try{if(typeof token!=='string'||token.length>16000)return null;const parts=token.split('.');if(parts.length!==3)return null;const h=JSON.parse(new TextDecoder().decode(crmBytes(parts[0]))),c=JSON.parse(new TextDecoder().decode(crmBytes(parts[1])));if(h.alg!=='RS256'||typeof h.kid!=='string'||!validGithubClaims(c,audience))return null;
 if(!jwksCache||Date.now()>jwksCache.until||!jwksCache.keys.some(k=>k.kid===h.kid)){const r=await fetch('https://token.actions.githubusercontent.com/.well-known/jwks');if(!r.ok)return null;const d=await r.json();jwksCache={keys:d.keys,until:Date.now()+300000}}
 const jwk=jwksCache.keys.find(k=>k.kid===h.kid&&k.kty==='RSA');if(!jwk)return null;const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,crmBytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));return ok?c:null;
 }catch{return null}
}
async function crmLead(env,record){const meta=await env.BUCKET.get('crm/leads/'+record.id+'.json');const m=meta?await meta.json():{};return {...record,stage:m.stage||'new',source:record.source||'website',followUp:m.followUp||'',notes:m.notes||'',value:m.value||'',version:m.version||0,updatedAt:m.updatedAt||record.createdAt};}
async function crmList(env){let cursor,records=[];do{const page=await env.BUCKET.list({prefix:'enquiries/',limit:100,cursor});for(let i=0;i<page.objects.length;i+=20){const slice=page.objects.slice(i,i+20);const rows=await Promise.all(slice.map(async o=>{const obj=await env.BUCKET.get(o.key);return obj?crmLead(env,await obj.json()):null}));records.push(...rows.filter(Boolean));}cursor=page.truncated?page.cursor:undefined;}while(cursor&&records.length<1000);records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return {leads:records,truncated:Boolean(cursor)};}
async function crmBody(request){if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw Error('Use JSON.');const text=await request.text();if(text.length>12000)throw Error('Request is too large.');const d=JSON.parse(text);if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Invalid request.');return d;}
export async function handleCRM(request,env,crmPage){
 const u=new URL(request.url),isRun=['/api/crm/run','/api/crm/digest','/api/crm/discover'].includes(u.pathname);
 if(isRun){
  if(request.method!=='POST')return crmJSON({error:'Method not allowed.'},405);
  const claims=await verifyGithubToken(request.headers.get('Authorization')?.replace(/^Bearer /,''),CRM_ORIGIN+'/crm');if(!claims)return crmJSON({error:'GitHub workflow authorization required.'},401);
  if(!env.BUCKET)return crmJSON({error:'CRM storage unavailable.'},503);
  try{if(u.pathname==='/api/crm/discover')return ecoDiscovery(request,env,claims);if(u.pathname==='/api/crm/run'){const {leads,truncated}=await crmList(env);const profile=await ecoProfile(env);return crmJSON({discovery:{enabled:profile.discoveryEnabled,queries:profile.queries},today:crmToday(),truncated,leads:leads.map(l=>({id:l.id,stage:l.stage,followUp:l.followUp}))});}
 const d=await crmBody(request);if(d.today!==crmToday()||!['total','active','won'].every(k=>Number.isInteger(d[k])&&d[k]>=0&&d[k]<=1000)||d.active>d.total||d.won>d.total||!Array.isArray(d.due)||d.due.length>1000||!d.due.every(id=>typeof id==='string'&&/^[0-9a-f-]{36}$/i.test(id))||typeof d.truncated!=='boolean')return crmJSON({error:'Invalid digest.'},400);
 const summary={updatedAt:new Date().toISOString(),runId:claims.run_id,today:d.today,truncated:d.truncated,total:d.total,active:d.active,won:d.won,due:[...new Set(d.due)]};await env.BUCKET.put('crm/summary.json',JSON.stringify(summary));return crmJSON({ok:true,runId:claims.run_id});}catch{return crmJSON({error:'CRM refresh failed.'},503);}
 }
 const authenticated=request.headers.get('oai-authenticated-user-id');if(!authenticated){if(u.pathname==='/crm')return new Response(null,{status:302,headers:{Location:'/signin-with-chatgpt?return_to=%2Fcrm','Cache-Control':'no-store'}});return crmJSON({error:'Sign in to view your CRM.'},401);}
 if(!owner(request,env))return crmJSON({error:'This CRM is only available to the portfolio owner.'},403);
 if(u.pathname==='/crm'){if(request.method!=='GET')return crmJSON({error:'Method not allowed.'},405);return new Response(crmPage,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"}});}
 if(!env.BUCKET)return crmJSON({error:'CRM storage unavailable.'},503);
 if(request.method!=='GET'&&request.headers.get('Origin')!==CRM_ORIGIN)return crmJSON({error:'Origin not allowed.'},403);
 try{
  const ecosystem=await handleEcosystem(request,env);if(ecosystem)return ecosystem;
  if(u.pathname==='/api/crm/leads'&&request.method==='GET'){const list=await crmList(env);const obj=await env.BUCKET.get('crm/summary.json');return crmJSON({...list,today:crmToday(),automation:obj?await obj.json():null});}
  if(u.pathname==='/api/crm/leads'&&request.method==='POST'){
   const d=await crmBody(request),text=(v,max)=>typeof v==='string'&&v.trim().length<=max?v.trim():null;const name=text(d.name,100),company=text(d.company||'',150),email=text(d.email||'',254),message=text(d.message,3000);
   if(!name||!message||company===null||email===null||email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!CRM_SOURCES.has(d.source))return crmJSON({error:'Please check the lead details.'},400);
   const id=crypto.randomUUID(),record={id,reference:'KS-'+id.slice(0,8).toUpperCase(),name,email,company,message,kind:'project',source:d.source,ownerEntered:true,createdAt:new Date().toISOString()};await env.BUCKET.put('enquiries/'+id+'.json',JSON.stringify(record));return crmJSON({id},201);
  }
  const match=u.pathname.match(/^\/api\/crm\/leads\/([0-9a-f-]{36})$/i);
  if(match&&request.method==='PATCH'){
   const id=match[1];if(!await env.BUCKET.get('enquiries/'+id+'.json'))return crmJSON({error:'Lead not found.'},404);const d=await crmBody(request);
   const validDate=typeof d.followUp==='string'&&(d.followUp===''||/^\d{4}-\d{2}-\d{2}$/.test(d.followUp)&&!Number.isNaN(Date.parse(d.followUp+'T00:00:00Z'))&&new Date(d.followUp+'T00:00:00Z').toISOString().slice(0,10)===d.followUp);
   if(!CRM_STAGES.has(d.stage)||!validDate||typeof d.notes!=='string'||d.notes.length>4000||typeof d.value!=='string'||d.value.length>100||!Number.isInteger(d.version)||d.version<0)return crmJSON({error:'Please check the stage, follow-up date and notes.'},400);
   const key='crm/leads/'+id+'.json',obj=await env.BUCKET.get(key),old=obj?await obj.json():{version:0};if(old.version!==d.version)return crmJSON({error:'This lead changed in another tab. Refresh before saving.'},409);
   const m={stage:d.stage,followUp:d.followUp,notes:d.notes,value:d.value,version:d.version+1,updatedAt:new Date().toISOString()};const saved=await env.BUCKET.put(key,JSON.stringify(m),{onlyIf:obj?{etagMatches:obj.etag}:new Headers({'If-None-Match':'*'})});if(!saved)return crmJSON({error:'This lead changed in another tab. Refresh before saving.'},409);return crmJSON({ok:true,version:m.version});
  }
  return crmJSON({error:'Route or method not found.'},404);
 }catch{return crmJSON({error:'Could not save or load the CRM. Please try again.'},503);}
}
