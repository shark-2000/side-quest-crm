import {readFile} from 'node:fs/promises';
export async function renderCRM(){
 const [html,panels,core,client,resume]=await Promise.all(['worker/crm.html','worker/ecosystem-panels.html','worker/ecosystem-core.js','worker/ecosystem-client.js','worker/resume-core.js'].map(p=>readFile(p,'utf8')));
 return html.replace('<!--ecosystem-panels-->',()=>panels).replace('/* ECO_CORE */',()=>[core,resume].join('\n').replace(/^export /gm,'')).replace('/* ECO_CLIENT */',()=>client);
}
