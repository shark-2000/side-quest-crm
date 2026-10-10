import {discoverOpportunities} from './opportunity-scout.mjs';
const site='https://katyayan-cloud-data.bubblymink4.chatgpt.site';
const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience',site+'/crm');
const identity=await fetch(url,{headers:{Authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},signal:AbortSignal.timeout(20000)});
if(!identity.ok)throw Error('GitHub identity request failed.');
const {value:token}=await identity.json();console.log('::add-mask::'+token);
const authorized={Authorization:'Bearer '+token,'Content-Type':'application/json'};
const res=await fetch(site+'/api/crm/run',{method:'POST',headers:authorized,signal:AbortSignal.timeout(60000)});
if(!res.ok)throw Error('CRM snapshot failed with HTTP '+res.status+'.');
const {leads,today,truncated,discovery}=await res.json();
if(!Array.isArray(leads)||!/^\d{4}-\d{2}-\d{2}$/.test(today))throw Error('Invalid CRM snapshot.');
const open=l=>!['won','lost'].includes(l.stage);
const digest={today,truncated,total:leads.length,active:leads.filter(open).length,won:leads.filter(l=>l.stage==='won').length,due:leads.filter(l=>open(l)&&l.followUp&&l.followUp<=today).map(l=>l.id)};
const saved=await fetch(site+'/api/crm/digest',{method:'POST',headers:authorized,body:JSON.stringify(digest),signal:AbortSignal.timeout(60000)});
if(!saved.ok)throw Error('Saving CRM digest failed with HTTP '+saved.status+'.');
const result=await saved.json();if(result.ok!==true)throw Error('CRM refresh did not confirm success.');
console.log('CRM follow-up digest calculated in GitHub Actions and saved successfully.');

if(discovery?.enabled){
 const report=await discoverOpportunities(discovery);
 const imported=await fetch(site+'/api/crm/discover',{method:'POST',headers:authorized,body:JSON.stringify(report),signal:AbortSignal.timeout(60000)});
 if(!imported.ok)throw Error('Saving discovery results failed with HTTP '+imported.status+'.');
 console.log(report.status==='ok'?'Public opportunity discovery completed.':'Public discovery provider is unavailable or degraded. Manual imports remain available.');
}else console.log('Public opportunity discovery is off. Enable it in My service.');
