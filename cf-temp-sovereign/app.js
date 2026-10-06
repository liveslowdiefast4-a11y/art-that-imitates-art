import { ChimeraSovereignRuntime, CHIMERA_VERSION } from './chimera-kernel.mjs';

const POLICY = Object.freeze({
  allowPaidInference: false,
  allowAutoTopUp: false,
  allowPaidFallback: false,
  mandatoryOperatingCostAUD: 0,
  routing: ['local-webllm-webgpu','local-transformers-wasm'],
  failureMode: 'degrade-never-spend'
});

const WEBLLM_CDN = 'https://esm.run/@mlc-ai/web-llm';
const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.1';
const WASM_MODEL = 'onnx-community/SmolLM2-135M-ONNX';

const $ = (id) => document.getElementById(id);
const chat = $('chat');
const composer = $('composer');
const promptEl = $('prompt');
const send = $('send');
const statusEl = $('status');
const engineEl = $('engine');
const detailEl = $('detail');
const progress = $('progress');
const progressBar = $('progressBar');
const network = $('network');
const installModel = $('installModel');
const chimeraStateEl = $('chimeraState');
const chimeraSourceEl = $('chimeraSource');
const chimeraSafetyEl = $('chimeraSafety');
const chimeraEnergyEl = $('chimeraEnergy');
const chimeraActuationEl = $('chimeraActuation');
const chimeraVersionEl = $('chimeraVersion');
const runChimera = $('runChimera');

let runtime = { kind: 'none', engine: null, generator: null, ready: false, loading: false };
let history = JSON.parse(localStorage.getItem('sovereign-chat') || '[]');
const chimera = new ChimeraSovereignRuntime();

$('policyText').textContent = JSON.stringify(POLICY, null, 2);

function saveHistory(){ localStorage.setItem('sovereign-chat', JSON.stringify(history.slice(-40))); }
function addMessage(role, content, persist=true){
  const d = document.createElement('div');
  d.className = `msg ${role}`;
  d.textContent = content;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  if(persist && (role==='user'||role==='assistant')){ history.push({role,content}); saveHistory(); }
  return d;
}
history.forEach(m => addMessage(m.role,m.content,false));
if(!history.length) addMessage('system','Local-first mode. Prepare the local AI once; model files are then cached by the browser.',false);

function setStatus(label, cls=''){
  statusEl.textContent = label;
  statusEl.className = `status ${cls}`;
}
function setProgress(value){
  progress.hidden = value == null;
  if(value != null) progressBar.style.width = `${Math.max(0,Math.min(100,value))}%`;
}
function updateNetwork(){
  network.textContent = navigator.onLine ? 'Network: online' : 'Network: offline';
}
addEventListener('online', updateNetwork);
addEventListener('offline', updateNetwork);
updateNetwork();

function renderChimera(snapshot){
  const health = chimera.health();
  chimeraVersionEl.textContent = `v${CHIMERA_VERSION}`;
  chimeraStateEl.textContent = snapshot.operating_state;
  chimeraSourceEl.textContent = `${snapshot.telemetry?.source || 'NONE'} · NDVI ${snapshot.telemetry?.mean_ndvi ?? '—'}`;
  chimeraSafetyEl.textContent = snapshot.kernel
    ? `${snapshot.kernel.safety_status} · next ${snapshot.kernel.predicted_safe_state}`
    : 'No cycle yet';
  chimeraEnergyEl.textContent = snapshot.kernel ? String(snapshot.kernel.lattice_energy) : '—';
  chimeraActuationEl.textContent = health.actuation_allowed ? 'ENABLED' : 'LOCKED';
  chimeraActuationEl.className = health.actuation_allowed ? 'ok' : 'warn';
}

function runChimeraCycle(){
  try{
    renderChimera(chimera.runLocalSyntheticCycle());
  }catch(err){
    chimeraStateEl.textContent = 'FAULTED';
    chimeraSafetyEl.textContent = err.message;
    chimeraActuationEl.textContent = 'LOCKED';
    chimeraActuationEl.className = 'warn';
  }
}

runChimera.addEventListener('click', runChimeraCycle);
runChimeraCycle();

async function chooseWebLLMModel(webllm){
  const ids = webllm.prebuiltAppConfig.model_list.map(x => x.model_id);
  const prefs = [
    /Qwen2\.5.*0\.5B.*Instruct.*q4/i,
    /Qwen.*0\.5B.*Instruct.*q4/i,
    /Smol.*Instruct.*q4/i,
    /Llama.*1B.*Instruct.*q4/i
  ];
  for(const p of prefs){ const hit = ids.find(id => p.test(id)); if(hit) return hit; }
  return ids.find(id => /Instruct/i.test(id)) || ids[0];
}

async function loadWebLLM(){
  const webllm = await import(WEBLLM_CDN);
  const model = await chooseWebLLMModel(webllm);
  if(!model) throw new Error('No compatible WebLLM model found');
  detailEl.textContent = `Preparing ${model}. First load downloads model files; later runs use the browser cache.`;
  const engine = await webllm.CreateMLCEngine(model,{
    initProgressCallback: p => {
      const n = typeof p.progress === 'number' ? p.progress * 100 : null;
      setProgress(n);
      if(p.text) detailEl.textContent = p.text;
    }
  });
  runtime = {kind:'webllm',engine,generator:null,ready:true,loading:false,model};
  setProgress(null);
  engineEl.textContent = `On-device WebGPU · ${model}`;
  setStatus('LOCAL GPU READY','ok');
}

async function loadWasm(){
  detailEl.textContent = 'WebGPU unavailable or failed. Loading the smaller CPU/WASM fallback.';
  const { pipeline } = await import(TRANSFORMERS_CDN);
  const generator = await pipeline('text-generation', WASM_MODEL, {
    dtype:'q4',
    progress_callback: p => {
      if(typeof p.progress === 'number') setProgress(p.progress);
      if(p.file) detailEl.textContent = `Caching ${p.file}`;
    }
  });
  runtime = {kind:'wasm',engine:null,generator,ready:true,loading:false,model:WASM_MODEL};
  setProgress(null);
  engineEl.textContent = `On-device CPU/WASM · ${WASM_MODEL}`;
  setStatus('LOCAL CPU READY','ok');
}

async function prepareLocal(){
  if(runtime.ready || runtime.loading) return;
  runtime.loading = true;
  installModel.disabled = true;
  send.disabled = true;
  setStatus('PREPARING LOCAL AI');
  setProgress(2);
  try{
    if('gpu' in navigator){
      try{ await loadWebLLM(); return; }
      catch(err){ console.warn('WebLLM fallback:',err); }
    }
    await loadWasm();
  }catch(err){
    runtime = {kind:'none',engine:null,generator:null,ready:false,loading:false};
    setProgress(null);
    setStatus('LOCAL AI NOT READY','warn');
    engineEl.textContent = 'No local model loaded';
    detailEl.textContent = `Local AI could not initialize: ${err.message}. The app itself remains available and no paid service was called.`;
  }finally{
    runtime.loading = false;
    installModel.disabled = runtime.ready;
    send.disabled = false;
  }
}

async function generateLocal(userText){
  if(!runtime.ready) await prepareLocal();
  if(!runtime.ready) throw new Error('Local inference unavailable on this browser right now.');

  const messages = [
    {role:'system',content:'You are Sovereign Cloud, a concise local-first assistant. Never claim to have used a cloud service unless explicitly told so.'},
    ...history.slice(-12),
    {role:'user',content:userText}
  ];

  if(runtime.kind==='webllm'){
    const result = await runtime.engine.chat.completions.create({
      messages,
      temperature:0.7,
      max_tokens:512
    });
    return result.choices?.[0]?.message?.content?.trim() || 'No response generated.';
  }

  const result = await runtime.generator(messages,{
    max_new_tokens:256,
    do_sample:true,
    temperature:0.7
  });
  const generated = result?.[0]?.generated_text;
  if(Array.isArray(generated)){
    const last = generated.at(-1);
    return (last?.content || '').trim() || 'No response generated.';
  }
  if(typeof generated === 'string'){
    return generated.slice(userText.length).trim() || generated.trim();
  }
  return 'No response generated.';
}

composer.addEventListener('submit', async e => {
  e.preventDefault();
  const text = promptEl.value.trim();
  if(!text) return;
  promptEl.value = '';
  addMessage('user',text);
  send.disabled = true;
  const placeholder = addMessage('assistant','Thinking locally…',false);
  try{
    const answer = await generateLocal(text);
    placeholder.textContent = answer;
    history.push({role:'assistant',content:answer});
    saveHistory();
  }catch(err){
    placeholder.textContent = `Local mode could not answer: ${err.message}\n\nNo paid fallback was attempted.`;
  }finally{
    send.disabled = false;
  }
});

installModel.addEventListener('click',prepareLocal);
$('clearChat').addEventListener('click',()=>{
  history=[]; saveHistory(); chat.innerHTML='';
  addMessage('system','Chat cleared. Local model cache was left intact.',false);
});

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').catch(console.warn);
}

engineEl.textContent = ('gpu' in navigator) ? 'WebGPU detected · local model not loaded' : 'CPU/WASM fallback available';
setStatus('ZERO-COST LOCKED','ok');
