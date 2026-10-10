import {discoverFirecrawl} from './firecrawl-scout.mjs';
// Generic connection test. No profile is modified and no results are imported.
const report=await discoverFirecrawl({enabled:true,apiKey:process.env.FIRECRAWL_API_KEY,queries:['SQL freelance contract']});
if(report.status!=='ok'){
 console.error('Firecrawl connection test failed: '+report.reason+'.');
 process.exitCode=1;
}else console.log('Firecrawl connection verified. '+report.results.length+' qualifying public pages found. No CRM records were changed.');
