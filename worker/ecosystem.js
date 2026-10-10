async function ecoSearchJob(env){const o=await env.BUCKET.get('crm/firecrawl-job.json');return o?await o.json():null;}
async function ecoProfile(env){const obj=await env.BUCKET.get('crm/profile.json');return obj?await obj.json():structuredClone(ECO_DEFAULT_PROFILE);}
async function ecoBody(request){if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw Error('Use JSON.');const text=await request.text();if(text.length>150000)throw Error('Import is too large. Limit it to 20 postings.');const d=JSON.parse(text);if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Invalid request.');return d;}
export async function ecoKey(o){const basis=o.url||[o.company,o.title].map(s=>String(s).normalize('NFKC').toLowerCase().trim().replace(/\s+/g,' ')).join('\n');const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(basis));return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}
async function ecoAdd(env,inputs){if(!Array.isArray(inputs)||!inputs.length||inputs.length>20)throw Error('Import 1–20 opportunities at a time.');const clean=inputs.map(ecoOpportunity);let added=0,duplicates=0;for(const o of clean){const id=await ecoKey(o),key='crm/opportunities/'+id+'.json';const record={...o,id,status:'new',notes:'',proposal:'',leadId:'',version:0,createdAt:new Date().toISOString()};const saved=await env.BUCKET.put(key,JSON.stringify(record),{onlyIf:new Headers({'If-None-Match':'*'})});if(saved)added++;else duplicates++;}return {added,duplicates};}
async function ecoList(env){let cursor;const records=[];do{const page=await env.BUCKET.list({prefix:'crm/opportunities/',limit:100,cursor});for(let i=0;i<page.objects.length;i+=20){const rows=await Promise.all(page.objects.slice(i,i+20).map(async o=>{const r=await env.BUCKET.get(o.key);return r?await r.json():null;}));records.push(...rows.filter(Boolean));}cursor=page.truncated?page.cursor:undefined;}while(cursor&&records.length<1000);return {records,truncated:Boolean(cursor)};}
async function ecoDiscovery(request,env,claims){
 try{const d=await ecoBody(request);if(!['ok','error','disabled'].includes(d.status)||!Array.isArray(d.results)||d.results.length>20)return crmJSON({error:'Invalid discovery report.'},400);const p=await ecoProfile(env);if(d.requestId){const job=await ecoSearchJob(env);if(!job||job.id!==d.requestId||job.status!=='running')return crmJSON({error:'Search request no longer active.'},409);}if(!p.discoveryEnabled)return crmJSON({ok:true,disabled:true});const result=d.results.length?await ecoAdd(env,d.results):{added:0,duplicates:0};await env.BUCKET.put('crm/discovery.json',JSON.stringify({status:d.status,updatedAt:new Date().toISOString(),runId:claims.run_id,...result}));if(d.requestId){const job=await ecoSearchJob(env);await env.BUCKET.put('crm/firecrawl-job.json',JSON.stringify({...job,status:d.status==='ok'?'completed':'error',updatedAt:new Date().toISOString(),reason:typeof d.reason==='string'?d.reason.slice(0,80):'',...result}));}return crmJSON({ok:true,...result});}catch(e){return crmJSON({error:e.message},400);}
}
export async function handleEcosystem(request,env){
 const path=new URL(request.url).pathname;if(!path.startsWith('/api/crm/profile')&&!path.startsWith('/api/crm/opportunities'))return null;
 try{
  if(path==='/api/crm/opportunities/firecrawl'&&request.method==='POST'){
   const d=await ecoBody(request),p=await ecoProfile(env);if(d.version!==p.version)return crmJSON({error:'Profile changed. Reload before searching.'},409);
   if(!p.discoveryEnabled||!p.service||!p.skills.length||!p.queries.length)return crmJSON({error:'Save your service, skills and search phrases, and enable discovery in My service first.'},400);
   const key='crm/firecrawl-job.json',obj=await env.BUCKET.get(key),old=obj?await obj.json():null;
   if(old&&Date.now()-Date.parse(old.updatedAt)<900000)return crmJSON({error:'A Firecrawl search was requested recently. Wait 15 minutes before starting another.'},429);
   const job={id:crypto.randomUUID(),status:'queued',updatedAt:new Date().toISOString(),queries:p.queries.slice(0,1)};
   const saved=await env.BUCKET.put(key,JSON.stringify(job),{onlyIf:obj?{etagMatches:obj.etag}:new Headers({'If-None-Match':'*'})});return saved?crmJSON({ok:true,status:'queued'},202):crmJSON({error:'A search is already starting.'},429);
  }
  if(path==='/api/crm/opportunities/search'&&request.method==='POST'){
   const d=await ecoBody(request),p=await ecoProfile(env);if(d.version!==p.version)return crmJSON({error:'Profile changed. Reload it before searching.'},409);
   if(!p.service||!p.skills.length||!p.queries.length)return crmJSON({error:'Save your service, skills and search phrases first.'},400);
   const lockKey='crm/search-lock.json',lock=await env.BUCKET.get(lockKey),last=lock?await lock.json():null;
   if(last&&Date.now()-last.startedAt<120000)return crmJSON({error:'A search was started recently. Wait two minutes before searching again.'},429);
   const locked=await env.BUCKET.put(lockKey,JSON.stringify({startedAt:Date.now()}),{onlyIf:lock?{etagMatches:lock.etag}:new Headers({'If-None-Match':'*'})});if(!locked)return crmJSON({error:'A search is already starting. Please wait.'},429);
   const report=await discoverOpportunities({enabled:true,queries:p.queries}),saved=report.results.length?await ecoAdd(env,report.results):{added:0,duplicates:0};
   await env.BUCKET.put('crm/discovery.json',JSON.stringify({status:report.status,updatedAt:new Date().toISOString(),runId:'manual',...saved}));return crmJSON({ok:true,status:report.status,...saved});
  }
  if(path==='/api/crm/profile'&&request.method==='GET')return crmJSON({profile:await ecoProfile(env)});
  if(path==='/api/crm/profile'&&request.method==='PUT'){
   const d=await ecoBody(request),array=(a,n,max)=>Array.isArray(a)&&a.length<=n&&a.every(s=>typeof s==='string'&&s.trim()&&s.length<=max);
   if(typeof d.service!=='string'||d.service.length>200||typeof d.evidence!=='string'||d.evidence.length>4000||!array(d.skills,30,60)||!array(d.languages,15,60)||!array(d.queries,3,80)||typeof d.remoteOnly!=='boolean'||typeof d.discoveryEnabled!=='boolean'||d.discoveryEnabled&&!d.queries.length||!Number.isInteger(d.version)||d.version<0)return crmJSON({error:'Please check your profile fields. Discovery needs at least one query.'},400);
   const obj=await env.BUCKET.get('crm/profile.json'),old=obj?await obj.json():{version:0};if(old.version!==d.version)return crmJSON({error:'Profile changed. Reload before saving.'},409);
   const profile={service:d.service.trim(),evidence:d.evidence.trim(),skills:d.skills.map(s=>s.trim()),languages:d.languages.map(s=>s.trim()),queries:d.queries.map(s=>s.trim()),remoteOnly:d.remoteOnly,discoveryEnabled:d.discoveryEnabled,version:d.version+1};
   const saved=await env.BUCKET.put('crm/profile.json',JSON.stringify(profile),{onlyIf:obj?{etagMatches:obj.etag}:new Headers({'If-None-Match':'*'})});return saved?crmJSON({profile}):crmJSON({error:'Profile changed. Reload before saving.'},409);
  }
  if(path==='/api/crm/opportunities'&&request.method==='GET'){const p=await ecoProfile(env),{records,truncated}=await ecoList(env),today=crmToday(),obj=await env.BUCKET.get('crm/discovery.json');const opportunities=records.map(o=>({...o,assessment:ecoAssess(o,p,today)})).sort((a,b)=>Number(Boolean(a.assessment.gates.length))-Number(Boolean(b.assessment.gates.length))||(b.assessment.score??-1)-(a.assessment.score??-1)||Number(b.assessment.urgent)-Number(a.assessment.urgent)||b.createdAt.localeCompare(a.createdAt));const job=await ecoSearchJob(env);return crmJSON({opportunities,truncated,firecrawl:job?{status:job.status,updatedAt:job.updatedAt,added:job.added||0,duplicates:job.duplicates||0,reason:job.reason||''}:null,discovery:obj?await obj.json():null});}
  if(path==='/api/crm/opportunities'&&request.method==='POST'){const d=await ecoBody(request);return crmJSON(await ecoAdd(env,d.opportunities||[d]),201);}
  const match=path.match(/^\/api\/crm\/opportunities\/([a-f0-9]{64})(\/convert)?$/);if(!match)return crmJSON({error:'Route not found.'},404);
  const key='crm/opportunities/'+match[1]+'.json',obj=await env.BUCKET.get(key);if(!obj)return crmJSON({error:'Opportunity not found.'},404);const o=await obj.json();
  if(match[2]&&request.method==='POST'){
   const d=await ecoBody(request);if(d.version!==o.version)return crmJSON({error:'Opportunity changed. Reload before converting.'},409);const assessment=ecoAssess(o,await ecoProfile(env),crmToday());if(assessment.gates.length)return crmJSON({error:'Resolve the deadline, location or language constraint before converting.'},400);
   const raw=o.id.slice(0,32),leadId=[raw.slice(0,8),raw.slice(8,12),raw.slice(12,16),raw.slice(16,20),raw.slice(20)].join('-');const record={id:leadId,reference:'KS-'+raw.slice(0,8).toUpperCase(),name:o.company||o.title,email:'',company:o.company,message:o.title+'\n\n'+o.description+(o.url?'\n\nSource: '+o.url:''),source:o.source,kind:'project',ownerEntered:true,opportunityId:o.id,createdAt:new Date().toISOString()};
   await env.BUCKET.put('enquiries/'+leadId+'.json',JSON.stringify(record),{onlyIf:new Headers({'If-None-Match':'*'})});const updated={...o,status:'converted',leadId,version:o.version+1};const saved=await env.BUCKET.put(key,JSON.stringify(updated),{onlyIf:{etagMatches:obj.etag}});return saved?crmJSON({leadId}):crmJSON({error:'Opportunity changed. Reload to see the conversion.'},409);
  }
  if(!match[2]&&request.method==='PATCH'){
   const d=await ecoBody(request);if(!Number.isInteger(d.version)||d.version!==o.version)return crmJSON({error:'Opportunity changed. Reload before saving.'},409);
   if(!['new','shortlisted','archived','converted'].includes(d.status)||d.status==='converted'&&!o.leadId||typeof d.notes!=='string'||d.notes.length>4000||typeof d.proposal!=='string'||d.proposal.length>10000)return crmJSON({error:'Check status, notes and proposal length.'},400);
   const updated={...o,status:d.status,notes:d.notes,proposal:d.proposal,version:o.version+1,updatedAt:new Date().toISOString()};const saved=await env.BUCKET.put(key,JSON.stringify(updated),{onlyIf:{etagMatches:obj.etag}});return saved?crmJSON({ok:true}):crmJSON({error:'Opportunity changed. Reload before saving.'},409);
  }
  return crmJSON({error:'Method not allowed.'},405);
 }catch(e){return crmJSON({error:e.message||'Could not update the workspace.'},400);}
}
