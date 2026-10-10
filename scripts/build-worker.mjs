import {readFile,writeFile} from 'node:fs/promises';
const handler=await readFile('worker/handler.js','utf8'),crm=await readFile('worker/crm.js','utf8'),page=await readFile('public/index.html','utf8'),kit=await readFile('public/freelance-profile-kit.txt','utf8'),crmPage=await readFile('worker/crm.html','utf8');
await writeFile('worker/index.js',handler+'\n'+crm+'\nconst page='+JSON.stringify(page)+';\nconst kit='+JSON.stringify(kit)+';\nconst crmPage='+JSON.stringify(crmPage)+';\nexport default {fetch(request,env){return handle(request,env,page,kit)}};\n');
