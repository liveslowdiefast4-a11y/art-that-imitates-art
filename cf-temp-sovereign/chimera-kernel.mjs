export const CHIMERA_VERSION = '0.2.1-rc2';

export const OperatingState = Object.freeze({
  AUTHENTICATED_LIVE: 'AUTHENTICATED_LIVE',
  AUTHENTICATED_DEGRADED: 'AUTHENTICATED_DEGRADED',
  STANDALONE_SIMULATION: 'STANDALONE_SIMULATION',
  FAULTED: 'FAULTED'
});

export class ControlBarrierFilter {
  constructor({ minThreshold = 0.15, gamma = 0.8 } = {}) {
    if (!Number.isFinite(minThreshold)) throw new TypeError('minThreshold must be finite');
    if (!Number.isFinite(gamma) || gamma <= 0 || gamma > 1) {
      throw new RangeError('gamma must satisfy 0 < gamma <= 1');
    }
    this.minThreshold = minThreshold;
    this.gamma = gamma;
  }

  filter(currentState, proposedDelta) {
    if (!Number.isFinite(currentState) || !Number.isFinite(proposedDelta)) {
      throw new TypeError('CBF state and delta must be finite');
    }

    const h = currentState - this.minThreshold;
    if (h < 0) {
      const safeDelta = this.minThreshold - currentState;
      return {
        safeDelta,
        unchanged: false,
        recovery: true,
        nextState: this.minThreshold,
        hCurrent: h,
        hNext: 0
      };
    }

    const minimumDelta = -this.gamma * h;
    const safeDelta = Math.max(proposedDelta, minimumDelta);
    const nextState = currentState + safeDelta;
    const hNext = nextState - this.minThreshold;

    if (hNext < -Number.EPSILON * 16) {
      throw new Error('CBF invariant violation detected');
    }

    return {
      safeDelta,
      unchanged: safeDelta === proposedDelta,
      recovery: false,
      nextState,
      hCurrent: h,
      hNext
    };
  }
}

export class WaveLatticeSubstrate {
  constructor({ gridSize = 16, c = 1, dt = 0.05, dx = 1, damping = 0.98 } = {}) {
    if (!Number.isInteger(gridSize) || gridSize < 3) throw new RangeError('gridSize must be >= 3');
    for (const [name, value] of Object.entries({ c, dt, dx, damping })) {
      if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be finite and > 0`);
    }

    this.gridSize = gridSize;
    this.c = c;
    this.dt = dt;
    this.dx = dx;
    this.damping = damping;
    const cells = gridSize * gridSize;
    this.uPrev = new Float64Array(cells);
    this.uCurr = new Float64Array(cells);
    this.uNext = new Float64Array(cells);
  }

  _i(x, y) {
    const n = this.gridSize;
    const xx = ((x % n) + n) % n;
    const yy = ((y % n) + n) % n;
    return xx * n + yy;
  }

  injectImpulse(x, y, amplitude) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isFinite(amplitude)) {
      throw new TypeError('Impulse coordinates must be integers and amplitude finite');
    }
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
      throw new RangeError('Impulse coordinate outside lattice');
    }
    this.uCurr[this._i(x, y)] += amplitude;
  }

  step() {
    const n = this.gridSize;
    const laplaceScale = 1 / (this.dx * this.dx);
    const waveScale = this.c * this.c * this.dt * this.dt;

    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        const i = this._i(x, y);
        const laplacian = (
          this.uCurr[this._i(x + 1, y)] +
          this.uCurr[this._i(x - 1, y)] +
          this.uCurr[this._i(x, y + 1)] +
          this.uCurr[this._i(x, y - 1)] -
          4 * this.uCurr[i]
        ) * laplaceScale;

        this.uNext[i] = (
          2 * this.uCurr[i] -
          this.uPrev[i] +
          waveScale * laplacian
        ) * this.damping;
      }
    }

    const oldPrev = this.uPrev;
    this.uPrev = this.uCurr;
    this.uCurr = this.uNext;
    this.uNext = oldPrev;
    this.uNext.fill(0);
    return this.uCurr;
  }

  meanAmplitude() {
    let sum = 0;
    for (const v of this.uCurr) sum += v;
    return sum / this.uCurr.length;
  }

  energy() {
    const n = this.gridSize;
    let kinetic = 0;
    let potential = 0;

    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        const i = this._i(x, y);
        const velocity = (this.uCurr[i] - this.uPrev[i]) / this.dt;
        kinetic += 0.5 * velocity * velocity;

        const gradX = (this.uCurr[this._i(x + 1, y)] - this.uCurr[i]) / this.dx;
        const gradY = (this.uCurr[this._i(x, y + 1)] - this.uCurr[i]) / this.dx;
        potential += 0.5 * this.c * this.c * (gradX * gradX + gradY * gradY);
      }
    }

    return kinetic + potential;
  }
}

export class ExecutionBoundary {
  constructor(state = OperatingState.STANDALONE_SIMULATION) {
    this.state = state;
  }

  setState(state) {
    if (!Object.values(OperatingState).includes(state)) throw new RangeError('Unknown operating state');
    this.state = state;
  }

  get actuationAllowed() {
    return this.state === OperatingState.AUTHENTICATED_LIVE;
  }

  executeActuation(command) {
    if (!this.actuationAllowed) {
      throw new Error('Actuation interlock active: AUTHENTICATED_LIVE required');
    }
    return Object.freeze({ accepted: true, command });
  }
}

export class AetherContinuumKernel {
  constructor(options = {}) {
    this.substrate = new WaveLatticeSubstrate(options.lattice);
    this.cbf = new ControlBarrierFilter(options.cbf);
  }

  process(metric, { impulseCoords = [8, 8], proposedDelta = -0.05 } = {}) {
    if (!Number.isFinite(metric)) throw new TypeError('metric must be finite');

    const x = Math.min(Math.max(0, impulseCoords[0]), this.substrate.gridSize - 1);
    const y = Math.min(Math.max(0, impulseCoords[1]), this.substrate.gridSize - 1);
    this.substrate.injectImpulse(x, y, metric);
    this.substrate.step();

    const barrier = this.cbf.filter(metric, proposedDelta);

    return Object.freeze({
      mean_field_amplitude: Number(this.substrate.meanAmplitude().toFixed(6)),
      lattice_energy: Number(this.substrate.energy().toFixed(6)),
      input_metric: metric,
      requested_delta: proposedDelta,
      cbf_filtered_delta: Number(barrier.safeDelta.toFixed(6)),
      predicted_safe_state: Number(barrier.nextState.toFixed(6)),
      safety_status: barrier.unchanged
        ? 'APPROVED'
        : (barrier.recovery ? 'RECOVERY_TO_BOUNDARY' : 'MODIFIED_BY_CBF'),
      safe_set_preserved: barrier.nextState >= this.cbf.minThreshold - Number.EPSILON * 16
    });
  }
}

export function createSyntheticTelemetry(nowMs = Date.now()) {
  const mean = 0.65 + 0.15 * Math.sin(nowMs / 100000);
  return Object.freeze({
    source: 'SYNTHETIC_SIMULATION',
    is_live: false,
    timestamp: Math.floor(nowMs / 1000),
    scene_id: `S2-SYNTH-${Math.floor(nowMs / 1000)}`,
    mean_ndvi: Number(mean.toFixed(4)),
    std_ndvi: 0.0321,
    provenance: 'SYNTHETIC_FALLBACK'
  });
}

export class ChimeraSovereignRuntime {
  constructor(options = {}) {
    this.version = CHIMERA_VERSION;
    this.kernel = new AetherContinuumKernel(options);
    this.operatingState = OperatingState.STANDALONE_SIMULATION;
    this.executionBoundary = new ExecutionBoundary(this.operatingState);
    this.lastTelemetry = null;
    this.lastKernelOutput = null;
    this.lastUpdated = null;
  }

  ingestBrowserTelemetry(telemetry) {
    if (!telemetry || !Number.isFinite(telemetry.mean_ndvi)) {
      this.operatingState = OperatingState.FAULTED;
      this.executionBoundary.setState(this.operatingState);
      throw new TypeError('Telemetry must contain finite mean_ndvi');
    }

    // A static/browser client cannot establish Genesis trust because shipping
    // the shared secret would destroy the trust boundary. Browser telemetry is
    // therefore always non-actuating even if its data source is nominally live.
    this.operatingState = OperatingState.STANDALONE_SIMULATION;
    this.executionBoundary.setState(this.operatingState);
    this.lastTelemetry = Object.freeze({ ...telemetry, browser_trusted: false });
    this.lastKernelOutput = this.kernel.process(telemetry.mean_ndvi);
    this.lastUpdated = Date.now();
    return this.snapshot();
  }

  runLocalSyntheticCycle(nowMs = Date.now()) {
    return this.ingestBrowserTelemetry(createSyntheticTelemetry(nowMs));
  }

  ingestAuthenticatedGatewayTelemetry() {
    throw new Error(
      'AUTHENTICATED_LIVE requires a trusted server-side Genesis gateway; browser elevation is forbidden'
    );
  }

  snapshot() {
    return Object.freeze({
      version: this.version,
      operating_state: this.operatingState,
      actuation_allowed: false,
      telemetry: this.lastTelemetry,
      kernel: this.lastKernelOutput,
      last_updated: this.lastUpdated,
      zero_cost_locked: true,
      genesis_secret_exposed_to_browser: false
    });
  }

  health() {
    return Object.freeze({
      service: 'chimera-sovereign-browser-adapter',
      version: this.version,
      operating_state: this.operatingState,
      actuation_allowed: false,
      telemetry_provenance: this.lastTelemetry?.provenance ?? 'NONE',
      safe_set_preserved: this.lastKernelOutput?.safe_set_preserved ?? null,
      zero_cost_locked: true,
      timestamp: Math.floor(Date.now() / 1000)
    });
  }
}
