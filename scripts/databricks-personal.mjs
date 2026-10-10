// Trigger one preconfigured serverless job. No data export or resource creation.
import {pathToFileURL} from 'node:url';

export function settings(env) {
  const host = new URL(env.DATABRICKS_HOST || 'https://invalid.example');
  if (host.protocol !== 'https:' || !/^dbc-[a-z0-9-]+\.cloud\.databricks\.com$/.test(host.hostname) || host.username || host.password || host.port || host.pathname !== '/' || host.search || host.hash) throw Error('Set DATABRICKS_HOST to the workspace HTTPS origin.');
  if (!env.DATABRICKS_TOKEN || !/^[1-9]\d*$/.test(env.DATABRICKS_JOB_ID || '') || !Number.isSafeInteger(Number(env.DATABRICKS_JOB_ID))) throw Error('Configure the Databricks token secret and job ID variable.');
  const seed = env.GITHUB_RUN_ID || '';
  if (!/^\d{1,30}$/.test(seed)) throw Error('A GitHub run ID is required for idempotency.');
  return {host:host.origin,token:env.DATABRICKS_TOKEN,jobId:Number(env.DATABRICKS_JOB_ID),key:'side-quest-'+seed};
}

export async function run(env=process.env, request=fetch, pause=ms=>new Promise(r=>setTimeout(r,ms)), log=console.log) {
  const config=settings(env);
  async function api(path, method='GET', body) {
    const res=await request(config.host+path,{method,headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(30000)});
    if(!res.ok)throw Error('Databricks request failed (HTTP '+res.status+'). Inspect access or quota in the workspace.');
    return res.json();
  }
  // Verify the existing job is the single serverless notebook we expect before starting it.
  const job=await api('/api/2.2/jobs/get?job_id='+config.jobId);
  const s=job.settings||{},tasks=s.tasks||[],task=tasks[0];
  if(tasks.length!==1||task.task_key!=='personal_agent'||!task.notebook_task||task.existing_cluster_id||task.new_cluster||task.job_cluster_key||s.continuous||s.schedule||s.trigger||s.max_concurrent_runs!==1||!(s.timeout_seconds>0&&s.timeout_seconds<=900)||task.max_retries!==0)throw Error('Job must have one personal_agent serverless notebook task, concurrency 1, no retries or schedule, and timeout <=900 seconds.');
  const start=await api('/api/2.2/jobs/run-now','POST',{job_id:config.jobId,idempotency_token:config.key});
  const id=start.run_id;
  if(!Number.isSafeInteger(id)||id<=0)throw Error('Databricks returned an invalid run ID.');
  log('Personal research started. Inputs and outputs remain in Databricks.');
  for(let poll=0;poll<55;poll++) {
    const r=await api('/api/2.2/jobs/runs/get?run_id='+id);
    const state=r.state||{};
    if(['TERMINATED','SKIPPED','INTERNAL_ERROR'].includes(state.life_cycle_state)) {
      if(state.result_state!=='SUCCESS')throw Error('Personal research did not succeed. Inspect the run in Databricks; no results were exported.');
      log('Personal research completed. Open the workspace results table to review it.');
      return {status:'success'};
    }
    await pause(15000);
  }
  await api('/api/2.2/jobs/runs/cancel','POST',{run_id:id});
  throw Error('Wait budget exhausted. Cancellation requested; inspect Databricks before retrying.');
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try { await run(); } catch(e) { console.error(e instanceof Error && e.message.startsWith('Databricks request failed') ? e.message : 'Personal research could not complete. Check workflow configuration and the Databricks job.'); process.exitCode=1; }
}
