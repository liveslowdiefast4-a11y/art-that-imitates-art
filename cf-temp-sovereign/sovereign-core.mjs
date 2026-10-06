/* Sovereign Core browser tool — safe, local, non-actuating port of the supplied AAF concepts.
 * Receipts are LOCAL PREVIEWS, not authenticated/cryptographically signed certificates.
 * No server calls, credentials, spending, or external tool execution exist in this module.
 */
export const CORE_VERSION = '0.1.1-preview';
export const PHASES = Object.freeze([
  'PURE_POTENTIAL', 'DIFFERENTIATION', 'TRANSFORMATION',
  'CONTAINMENT', 'ILLUMINATION', 'PROPAGATION',
  'RECURSION', 'MANIFESTATION', 'CONTINUA'
]);
export const TOOLS = Object.freeze(['preview.echo', 'sha256.text']);
const MANIFESTATION = PHASES.indexOf('MANIFESTATION');
const MAX_TEXT = 4096;
const MAX_LIVENESS_SECONDS = 30;

export function evaluateResidual(input) {
  const result = { allowed: false, reasons: [], values: null };
  const names = ['safety', 'structural', 'liveness', 'economic'];
  if (!input || typeof input !== 'object') {
    return { ...result, reasons: ['Four numeric residual measurements are required.'] };
  }
  const values = {};
  for (const name of names) {
    const value = input[name];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      result.reasons.push(name + ' must be a finite nonnegative number');
    } else {
      values[name] = value;
    }
  }
  if (result.reasons.length) return result;
  if (values.safety !== 0) result.reasons.push('Safety residual must equal zero');
  if (values.structural !== 0) result.reasons.push('Structural residual must equal zero');
  if (values.economic !== 0) result.reasons.push('Economic residual must equal AUD 0 — no paid fallback');
  if (values.liveness > MAX_LIVENESS_SECONDS) {
    result.reasons.push('Liveness must not exceed 30 seconds');
  }
  return { allowed: result.reasons.length === 0, reasons: result.reasons, values: Object.freeze(values) };
}

function requireResidual(input) {
  const result = evaluateResidual(input);
  if (!result.allowed) throw new Error('Residual gate denied: ' + result.reasons.join('; '));
  return result.values;
}

function requireTool(tool, payload) {
  if (!TOOLS.includes(tool)) throw new Error('Unregistered or unsafe tool denied');
  if (typeof payload !== 'string' || new TextEncoder().encode(payload).length > MAX_TEXT) {
    throw new Error('Preview payload must be UTF-8 text up to 4096 bytes');
  }
}

function randomReceiptId() {
  if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== 'function') {
    throw new Error('Secure random generator unavailable: no preview receipt issued');
  }
  return 'local-preview-' + globalThis.crypto.randomUUID();
}

export class SovereignCorePreview {
  #index = 0;
  #generation = 0;
  #receipts = new Map();
  #events = [];

  get currentPhase() { return PHASES[this.#index]; }
  get phaseIndex() { return this.#index; }
  get phases() { return [...PHASES]; }
  get events() { return this.#events.map(event => ({ ...event })); }
  get mode() { return 'UNTRUSTED_LOCAL_SIMULATION'; }
  get actuationAllowed() { return false; }
  get paidOperationsAllowed() { return false; }

  #record(event, detail) {
    const entry = Object.freeze({
      sequence: this.#events.length + 1,
      event,
      detail,
      timestamp: new Date().toISOString(),
      trust: 'BROWSER_SESSION_ONLY'
    });
    this.#events.push(entry);
    return entry;
  }

  assess(metrics) {
    const result = evaluateResidual(metrics);
    this.#record('RESIDUAL_EVALUATED', result.allowed ? 'PASS' : 'DENIED: ' + result.reasons.join('; '));
    return result;
  }

  advance(metrics) {
    requireResidual(metrics);
    if (this.#index >= PHASES.length - 1) throw new Error('Already at CONTINUA; reset explicitly');
    const from = this.currentPhase;
    this.#index++;
    this.#record('PHASE_ADVANCED', from + ' → ' + this.currentPhase);
    return this.currentPhase;
  }

  issuePreviewReceipt({ metrics, tool, payload }) {
    requireResidual(metrics);
    requireTool(tool, payload);
    if (this.#index !== MANIFESTATION) {
      throw new Error('MANIFESTATION phase required before issuing a preview receipt');
    }
    const id = randomReceiptId();
    const receipt = {
      id, tool, payload, generation: this.#generation, consumed: false,
      phase: this.currentPhase, issuedAt: new Date().toISOString()
    };
    this.#receipts.set(id, receipt);
    this.#record('LOCAL_RECEIPT_CREATED', tool + ' / local preview only');
    return Object.freeze({
      id, tool, issuedAt: receipt.issuedAt,
      trust: 'UNTRUSTED_LOCAL_PREVIEW',
      authenticated: false,
      authorityGranted: false
    });
  }

  async runPreview({ id, metrics, tool, payload }) {
    requireResidual(metrics);
    requireTool(tool, payload);
    if (this.#index !== MANIFESTATION) throw new Error('MANIFESTATION phase required at execution');
    const receipt = this.#receipts.get(id);
    if (!receipt || receipt.consumed || receipt.generation !== this.#generation) {
      throw new Error('Unknown, revoked, or already consumed preview receipt');
    }
    if (receipt.tool !== tool || receipt.payload !== payload) {
      throw new Error('Preview receipt does not match the tool and exact payload');
    }
    // Fence concurrent/replayed calls before any asynchronous operation.
    receipt.consumed = true;
    let output;
    if (tool === 'preview.echo') {
      output = payload;
    } else if (tool === 'sha256.text') {
      if (!globalThis.crypto?.subtle?.digest) {
        this.#record('PREVIEW_UNAVAILABLE', 'Web Crypto SHA-256 not available');
        throw new Error('Web Crypto SHA-256 unavailable');
      }
      const bytes = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload)));
      output = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      throw new Error('Unknown tool');
    }
    this.#record('PURE_PREVIEW_EXECUTED', tool + ' / no external effects');
    return Object.freeze({
      tool, output,
      receipt: id,
      simulated: true,
      sideEffects: false,
      costAUD: 0,
      authenticated: false
    });
  }

  reset() {
    this.#index = 0;
    this.#generation++;
    this.#receipts.clear();
    this.#record('RESET', 'All prior preview receipts revoked');
    return this.currentPhase;
  }

  health() {
    return Object.freeze({
      version: CORE_VERSION,
      phase: this.currentPhase,
      state: this.mode,
      spending_allowed: false,
      actuation_allowed: false,
      preview_receipt_trusted: false,
      events_in_session: this.#events.length,
      external_ledger_anchor: false
    });
  }
}
