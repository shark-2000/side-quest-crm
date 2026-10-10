import assert from 'node:assert/strict';
import {handle} from '../worker/handler.js';
class Bucket {constructor(){this.map=new Map()}async get(k){const value=this.map.get(k);return value?{json:async()=>JSON.parse(value)}:null}async put(k,v){this.map.set(k,v)}async list(){return {objects:[...this.map.keys()].filter(k=>k.startsWith('enquiries/')).map(key=>({key})),truncated:false}}}
const env={BUCKET:new Bucket(),OWNER_EMAIL:'owner@example.com'};
const valid={kind:'project',name:'<script>alert(1)</script>',email:'visitor@example.com',company:'',timeline:'',budget:'',message:'A reporting automation project.',consent:true,website:'',requestId:crypto.randomUUID()};
const req=(d=valid,origin='https://shark-2000.github.io')=>new Request('https://katyayan-cloud-data.bubblymink4.chatgpt.site/api/enquiries',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(d)});
let res=await handle(req(),env,'page','kit');assert.equal(res.status,201);const receipt=await res.json();assert.match(receipt.reference,/^KS-/);assert.equal(res.headers.get('Access-Control-Allow-Origin'),'https://shark-2000.github.io');
res=await handle(req(),env,'page','kit');assert.equal(res.status,200);assert.equal([...env.BUCKET.map.keys()].filter(k=>k.startsWith('enquiries/')).length,1);
assert.equal((await handle(req({...valid,consent:false}),env,'page','kit')).status,400);
assert.equal((await handle(req(valid,'https://evil.example'),env,'page','kit')).status,403);
assert.equal((await handle(req({...valid,message:'A changed project enquiry.'}),env,'page','kit')).status,409);
assert.equal((await handle(req({...valid,website:'spam'}),env,'page','kit')).status,400);
assert.equal((await handle(new Request('https://x/inbox'),env,'page','kit')).status,302);
assert.equal((await handle(new Request('https://x/inbox',{headers:{'oai-authenticated-user-id':'x','oai-authenticated-user-email':'other@example.com'}}),env,'page','kit')).status,403);
res=await handle(new Request('https://x/inbox',{headers:{'oai-authenticated-user-id':'x','oai-authenticated-user-email':'owner@example.com'}}),env,'page','kit');assert.equal(res.status,200);const inbox=await res.text();assert(inbox.includes('&lt;script&gt;'));assert(!inbox.includes('<script>alert'));
assert.equal((await handle(new Request('https://x/api/enquiries'),env,'page','kit')).status,405);
console.log('Passed: persistence, duplicate retry, consent, origin, honeypot, inbox authorization and escaped content.');
