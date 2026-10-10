import {readFile,writeFile,mkdir} from 'node:fs/promises';
let html=await readFile('worker/crm.html','utf8');
html=html.replace('<title>Side Quest CRM | Katyayan</title>','<title>Side Quest CRM | Freelance pipeline</title><meta name="description" content="A lightweight freelance CRM with a five-stage pipeline and GitHub Actions follow-up processing. Try the public sample workspace or open the private CRM.">');
html=html.replace('<a href="/signout-with-chatgpt?return_to=%2F">Sign out</a>','<a href="https://github.com/shark-2000/side-quest-crm">Source ↗</a>');
html=html.replace('<main>','<main><aside class="automation" style="margin:0 0 24px;border:2px solid var(--purple);background:#eee4ff"><div><strong>✦ Public demo. Your next client starts here.</strong><p>These are fictional leads. Try adding one or changing its stage. Demo changes reset when you reload.</p></div><a class="button" style="text-decoration:none;white-space:nowrap" href="https://katyayan-cloud-data.bubblymink4.chatgpt.site/crm">Open private CRM ↗</a></aside>');
html=html.replace('Your enquiries, opportunities and next moves in one place.','Your opportunities and next moves in one place. Try the sample workspace.');
html=html.replace('GitHub Actions keeps your follow-up digest current.','The private workspace runs on GitHub Actions.');
html=html.replace('For leads you find through proposals, referrals or conversations.','Add a fictional opportunity to explore the demo.');
const start=html.indexOf('async function api('),end=html.indexOf('\nfunction render()',start);
if(start<0||end<0)throw Error('CRM template structure changed.');
const demo=`const demoToday=new Date(Date.now()+19800000).toISOString().slice(0,10);
const demoLeads=[
 {name:'Alex Demo',company:'Sample Studio',source:'website',stage:'new',message:'Turn our weekly CSV reports into a clear sales dashboard.'},
 {name:'Sam Demo',company:'Example Fitness',source:'upwork',stage:'contacted',message:'Automate monthly reporting from spreadsheets.',followUp:demoToday,notes:'Confirm the reporting scope and timeline.'},
 {name:'Jordan Demo',company:'Sample Shop',source:'referral',stage:'proposal',message:'Clean and combine product data from three exports.',value:'USD 300'},
 {name:'Riley Demo',company:'Example Agency',source:'agency',stage:'won',message:'Build a compact campaign performance dashboard.',value:'USD 500'},
 {name:'Casey Demo',company:'Sample Ventures',source:'linkedin',stage:'lost',message:'Exploratory pipeline project. Budget postponed.'}
].map((lead,i)=>({id:'demo-'+i,reference:'DEMO-'+(i+1),email:'',followUp:'',notes:'',value:'',version:0,createdAt:new Date().toISOString(),...lead}));
async function api(path,options={}){
 const method=options.method||'GET';
 if(path==='/api/crm/leads'&&method==='GET')return {leads:structuredClone(demoLeads),today:demoToday,truncated:false,automation:null};
 const data=JSON.parse(options.body||'{}');
 if(path==='/api/crm/leads'&&method==='POST'){
  demoLeads.unshift({id:crypto.randomUUID(),reference:'DEMO',email:'',company:'',followUp:'',notes:'',value:'',stage:'new',version:0,createdAt:new Date().toISOString(),...data});return {ok:true};
 }
 if(path.startsWith('/api/crm/leads/')&&method==='PATCH'){
  const lead=demoLeads.find(l=>l.id===path.split('/').pop());if(!lead)throw Error('Demo lead not found.');
  if(lead.version!==data.version)throw Error('Refresh before saving this lead.');Object.assign(lead,data,{version:data.version+1});return {ok:true};
 }
 throw Error('This is the sample workspace. Open the private CRM for real enquiries.');
}`;
html=html.slice(0,start)+demo+html.slice(end);
html=html.replace("'Waiting for the first GitHub Actions run. Your leads update immediately.'","'Every 6 hours, the workflow calculates follow-ups for the private CRM. This public demo uses sample data only.'");
await mkdir('docs',{recursive:true});await writeFile('docs/index.html',html);await writeFile('docs/.nojekyll','');
console.log('Built public CRM demo. No contact data or credentials included.');
