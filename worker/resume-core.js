// Local keyword extraction. Suggestions require review; this is not AI inference.
export function resumeParse(text,focus=''){
 if(typeof text!=='string'||text.trim().length<40||text.length>30000)throw Error('Paste 40–30,000 characters of resume text.');
 const vocabulary=['SQL','Python','Power BI','Tableau','Databricks','Snowflake','dbt','AWS','GCP','Azure','Excel','MicroStrategy','JavaScript','TypeScript','React','Flutter','FastAPI','Docker','Kubernetes','Spark','PySpark','BigQuery','Redshift','PostgreSQL','MySQL','Airflow','n8n','Streamlit','Looker','Figma','WordPress','Java','Node.js','Git'];
 const aliases={'AWS':['amazon web services'],'GCP':['google cloud'],'Power BI':['powerbi'],'Node.js':['nodejs'],'PostgreSQL':['postgres'],'Kubernetes':['k8s']};
 const body=text.normalize('NFKC').toLowerCase();
 const contains=s=>new RegExp('(^|[^a-z0-9])'+s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z0-9]|$)').test(body);
 const skills=vocabulary.filter(s=>[s,...(aliases[s]||[])].some(contains)).slice(0,30);
 const languages=['English','Hindi','French','German','Spanish','Dutch','Danish','Portuguese'].filter(contains);
 const titles=['Data Engineer','Data Analyst','BI Developer','Cloud Engineer','Software Engineer','Frontend Developer','Backend Developer','Full Stack Developer','UI Designer'];
 const service=focus.trim().slice(0,200)||titles.find(contains)||'';
 const evidence=text.split(/\r?\n/).map(s=>s.trim()).filter(s=>/\b(built|created|developed|implemented|migrated|automated|designed|delivered|improved|maintained|managed|deployed)\b/i.test(s))
 .filter(s=>!/@|\b(phone|mobile|address|date of birth|dob)\b/i.test(s))
 .slice(0,6).map(s=>s.replace(/(?:\+?\d[\d ()-]{8,}\d)/g,'[number omitted]').slice(0,450)).join('\n');
 return {service,skills,languages,evidence,queries:profileSearches({service,skills})};
}
export function profileSearches(profile){
 const clean=s=>String(s||'').replace(/https?:\/\/\S+|\S+@\S+|[\r\n]/gi,' ').replace(/[^\p{L}\p{N} .+#-]/gu,' ').replace(/\s+/g,' ').trim();
 const service=clean(profile.service),skills=(profile.skills||[]).filter(s=>typeof s==='string').map(clean).filter(Boolean);
 if(!service&&!skills.length)throw Error('Add your service or at least one deliverable skill before searching.');
 const searches=[service?service+' contract':null,skills[0]?skills[0]+' freelance':null,skills[1]?skills[1]+' project contract':null].filter(Boolean).map(s=>s.slice(0,80));
 return [...new Set(searches)].slice(0,3);
}
