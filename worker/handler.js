const allowedOrigins = new Set(['https://shark-2000.github.io','https://katyayan-cloud-data.bubblymink4.chatgpt.site']);
const kinds = new Set(['project','hiring','hello']);
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function headers(origin){const h={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};if(allowedOrigins.has(origin)){h['Access-Control-Allow-Origin']=origin;h['Access-Control-Allow-Methods']='POST, OPTIONS';h['Access-Control-Allow-Headers']='Content-Type';}return h;}
function reply(body,status=200,origin=''){return new Response(JSON.stringify(body),{status,headers:headers(origin)});}
function owner(req,env){const email=req.headers.get('oai-authenticated-user-email');return Boolean(env.OWNER_EMAIL && req.headers.get('oai-authenticated-user-id') && email?.toLowerCase()===env.OWNER_EMAIL.toLowerCase());}
export async function handle(request, env, page, kit){
 const url=new URL(request.url),origin=request.headers.get('Origin')||'';
 if(url.pathname==='/crm'||url.pathname.startsWith('/api/crm/'))return handleCRM(request,env,crmPage);
 if(url.pathname==='/health')return reply({ok:true});
 if(url.pathname==='/api/enquiries'){
  if(request.method==='OPTIONS')return allowedOrigins.has(origin)?new Response(null,{status:204,headers:headers(origin)}):reply({error:'Origin not allowed.'},403);
  if(request.method!=='POST')return reply({error:'Method not allowed.'},405,origin);
  if(!allowedOrigins.has(origin))return reply({error:'Origin not allowed.'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'Use JSON.'},415,origin);
  if(Number(request.headers.get('Content-Length')||0)>12000)return reply({error:'Message is too large.'},413,origin);
  let d;try{const text=await request.text();if(text.length>12000)return reply({error:'Message is too large.'},413,origin);d=JSON.parse(text);}catch{return reply({error:'Please check your form and try again.'},400,origin);}
  if(!d||typeof d!=='object'||Array.isArray(d))return reply({error:'Invalid form.'},400,origin);
  const clean=(k,max)=>typeof d[k]==='string'&&d[k].trim().length<=max?d[k].trim():null;
  const name=clean('name',100),email=clean('email',254),message=clean('message',3000),company=clean('company',150),timeline=clean('timeline',100),budget=clean('budget',100);
  if(d.website)return reply({error:'Unable to accept this enquiry.'},400,origin);
  if(!name||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!message||message.length<10||!kinds.has(d.kind)||d.consent!==true||company===null||timeline===null||budget===null||typeof d.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.requestId))return reply({error:'Please check your name, email, message and consent.'},400,origin);
  if(!env.BUCKET)return reply({error:'The enquiry service is unavailable. Please try again later.'},503,origin);
  try{
   const key='enquiries/'+d.requestId+'.json',existing=await env.BUCKET.get(key);
   if(existing){const old=await existing.json();if(old.email!==email||old.message!==message)return reply({error:'Please refresh the form and try again.'},409,origin);return reply({reference:old.reference},200,origin);}
   const ip=request.headers.get('CF-Connecting-IP')||'unknown';const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));const hash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
   const rateKey='limits/'+hash+'.json',rateObj=await env.BUCKET.get(rateKey),previous=rateObj?await rateObj.json():{count:0,start:Date.now()};const recent=Date.now()-previous.start<3600000;
   if(recent&&previous.count>=5)return reply({error:'Too many enquiries. Please try again in an hour.'},429,origin);
   const reference='KS-'+d.requestId.slice(0,8).toUpperCase();const record={reference,id:d.requestId,kind:d.kind,name,email,company,timeline,budget,message,consent:true,createdAt:new Date().toISOString()};
   await env.BUCKET.put(key,JSON.stringify(record),{httpMetadata:{contentType:'application/json'}});
   await env.BUCKET.put(rateKey,JSON.stringify({count:recent?previous.count+1:1,start:recent?previous.start:Date.now()}));
   return reply({reference},201,origin);
  }catch{return reply({error:'Your enquiry could not be saved. Please try again.'},503,origin);}
 }
 if(url.pathname==='/inbox'){
  if(request.method!=='GET')return reply({error:'Method not allowed.'},405);
  if(!request.headers.get('oai-authenticated-user-id'))return new Response(null,{status:302,headers:{Location:'/signin-with-chatgpt?return_to=%2Finbox','Cache-Control':'no-store'}});
  if(!owner(request,env))return new Response('This inbox is only available to the portfolio owner.',{status:403,headers:{'Cache-Control':'no-store'}});
  if(!env.BUCKET)return new Response('Inbox is unavailable.',{status:503});
  try{const cursor=url.searchParams.get('cursor')||undefined;const list=await env.BUCKET.list({prefix:'enquiries/',limit:50,cursor});const records=await Promise.all(list.objects.map(async obj=>(await env.BUCKET.get(obj.key)).json()));records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
   const cards=records.map(r=>`<article><small>${escape(r.kind)} · ${escape(r.createdAt)} · ${escape(r.reference)}</small><h2>${escape(r.name)}</h2><p>${escape(r.email)}${r.company?' · '+escape(r.company):''}</p><p class="message">${escape(r.message)}</p><small>Timeline: ${escape(r.timeline||'Not specified')} · Budget / salary: ${escape(r.budget||'Not specified')}</small></article>`).join('');
   return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your enquiry inbox</title><style>body{background:#f6f0ff;color:#211b30;font:16px/1.6 system-ui;max-width:900px;margin:35px auto;padding:20px}article{background:#fff9ed;border:2px solid #211b30;padding:22px;margin:20px 0;box-shadow:4px 4px 0 #211b30}h2{margin:10px 0}small{color:#625674}.message{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#5833ac}</style><h1>Your enquiry inbox ✦</h1><p>Only your signed-in account can view these messages.</p><a href="/crm">Open CRM</a> · <a href="/">Portfolio</a> · <a href="/signout-with-chatgpt?return_to=%2F">Sign out</a>${cards||'<p>No enquiries yet.</p>'}${list.truncated?`<a href="/inbox?cursor=${encodeURIComponent(list.cursor)}">Next page →</a>`:''}</html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
  }catch{return new Response('Inbox could not load. Please try again.',{status:503});}
 }
 if(request.method!=='GET'&&request.method!=='HEAD')return reply({error:'Method not allowed.'},405);
 if(url.pathname==='/freelance-profile-kit.txt')return new Response(request.method==='HEAD'?null:kit,{headers:{'Content-Type':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="freelance-profile-kit.txt"'}});
 if(url.pathname==='/'||url.pathname==='/index.html')return new Response(request.method==='HEAD'?null:page,{headers:{'Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff'}});
 return new Response('Not found',{status:404});
}
