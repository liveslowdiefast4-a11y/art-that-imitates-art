import { SovereignCorePreview, PHASES } from './sovereign-core.mjs';

const core = new SovereignCorePreview();
const $ = id => document.getElementById(id);
let receiptId = null;
let receiptPayload = null;

function metrics() {
  const data = {};
  for (const key of ['safety','structural','liveness','economic']) {
    const element = $(key);
    if (element.value.trim() === '') throw new Error(key + ' is required');
    const num = Number(element.value);
    if (!Number.isFinite(num)) throw new Error(key + ' must be finite');
    data[key] = num;
  }
  return data;
}
function inputTool() { return { tool: $('tool').value, payload: $('payload').value }; }
function writeResult(text, kind='') {
  $('gateOutput').textContent = text;
  $('gateOutput').className = 'core-result ' + kind;
}
function showError(error) {
  writeResult(error.message || String(error), 'denied');
}
function render() {
  $('phaseStatus').textContent = core.currentPhase;
  $('phaseCount').textContent = (core.phaseIndex + 1) + ' / ' + PHASES.length;
  const target = $('phaseList');
  target.replaceChildren();
  PHASES.forEach((phase,index) => {
    const item=document.createElement('li');
    item.textContent=(index+1)+'. '+phase.replaceAll('_',' ');
    item.className=index<core.phaseIndex?'done':index===core.phaseIndex?'active':'';
    if(index===core.phaseIndex) item.setAttribute('aria-current','step');
    target.appendChild(item);
  });
  const audit=$('audit');
  audit.replaceChildren();
  for(const event of core.events.slice(-25).reverse()){
    const item=document.createElement('li');
    item.textContent=event.sequence+' · '+event.event+' · '+event.detail;
    audit.appendChild(item);
  }
  if(!core.events.length){
    const item=document.createElement('li');item.textContent='No session events.';audit.appendChild(item);
  }
}
$('evaluate').addEventListener('click',()=>{
  try {
    const gate=core.assess(metrics());
    writeResult(gate.allowed?'PASS — residual gate accepts these preview inputs.':'DENIED — '+gate.reasons.join('; '),gate.allowed?'passed':'denied');
  }catch(error){showError(error)}
  render();
});
$('advance').addEventListener('click',()=>{
  try{
    const phase=core.advance(metrics());
    writeResult('Phase advanced sequentially to '+phase+'.','passed');
  }catch(error){showError(error)}
  render();
});
$('issue').addEventListener('click',()=>{
  try{
    const {tool,payload}=inputTool();
    const receipt=core.issuePreviewReceipt({metrics:metrics(),tool,payload});
    receiptId=receipt.id; receiptPayload={tool,payload};
    $('receipt').textContent=receipt.id+' · UNTRUSTED LOCAL PREVIEW · not an authorization certificate';
    $('toolResult').textContent='Receipt prepared. Run the same pure tool and unchanged payload to consume it.';
    writeResult('Preview receipt generated, scoped to one tool and payload.','passed');
  }catch(error){showError(error)}
  render();
});
$('run').addEventListener('click',async()=>{
  try{
    if(!receiptId||!receiptPayload) throw new Error('Issue a preview receipt first');
    const selected=inputTool();
    const result=await core.runPreview({id:receiptId,metrics:metrics(),tool:selected.tool,payload:selected.payload});
    $('toolResult').textContent=JSON.stringify(result,null,2);
    $('receipt').textContent=receiptId+' · CONSUMED · local preview only';
    receiptId=null;receiptPayload=null;
    writeResult('Pure preview executed locally; spending and actuation remain locked.','passed');
  }catch(error){showError(error);$('toolResult').textContent='DENIED: '+(error.message||String(error))}
  render();
});
$('reset').addEventListener('click',()=>{
  core.reset();receiptId=null;receiptPayload=null;
  $('receipt').textContent='Previous local preview receipts revoked.';
  $('toolResult').textContent='No tool preview yet.';
  writeResult('Local phase session reset; audit remains visible until page reload.');
  render();
});
render();
