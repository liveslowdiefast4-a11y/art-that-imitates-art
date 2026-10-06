import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ControlBarrierFilter,
  WaveLatticeSubstrate,
  ExecutionBoundary,
  OperatingState,
  ChimeraSovereignRuntime
} from '../cf-temp-sovereign/chimera-kernel.mjs';

test('discrete CBF preserves safe set at former alpha=1.8 counterexample', () => {
  const cbf = new ControlBarrierFilter({ minThreshold: 0.15, gamma: 0.8 });
  const result = cbf.filter(0.16, -0.05);
  assert.equal(Number(result.safeDelta.toFixed(3)), -0.008);
  assert.equal(Number(result.nextState.toFixed(3)), 0.152);
  assert.ok(result.nextState >= 0.15);
  assert.equal(result.unchanged, false);
});

test('discrete CBF accepts an already safe proposed step', () => {
  const cbf = new ControlBarrierFilter({ minThreshold: 0.15, gamma: 0.8 });
  const result = cbf.filter(0.65, -0.05);
  assert.equal(result.safeDelta, -0.05);
  assert.equal(result.unchanged, true);
  assert.ok(result.nextState >= 0.15);
});

test('discrete CBF explicitly recovers a state below boundary', () => {
  const cbf = new ControlBarrierFilter({ minThreshold: 0.15, gamma: 0.8 });
  const result = cbf.filter(0.10, -0.05);
  assert.equal(Number(result.nextState.toFixed(2)), 0.15);
  assert.equal(result.recovery, true);
});

test('invalid discrete decay parameters fail closed', () => {
  assert.throws(() => new ControlBarrierFilter({ gamma: 0 }), /gamma/);
  assert.throws(() => new ControlBarrierFilter({ gamma: 1.01 }), /gamma/);
});

test('periodic lattice energy uses wrapped gradients and remains finite', () => {
  const lattice = new WaveLatticeSubstrate({ gridSize: 4 });
  lattice.injectImpulse(0, 0, 1);
  lattice.step();
  const energy = lattice.energy();
  assert.ok(Number.isFinite(energy));
  assert.ok(energy > 0);
});

test('execution boundary denies all non-live states', () => {
  const boundary = new ExecutionBoundary(OperatingState.STANDALONE_SIMULATION);
  assert.equal(boundary.actuationAllowed, false);
  assert.throws(() => boundary.executeActuation({ type: 'test' }), /interlock/);
  boundary.setState(OperatingState.AUTHENTICATED_DEGRADED);
  assert.equal(boundary.actuationAllowed, false);
});

test('browser runtime cannot self-assert authenticated live trust', () => {
  const runtime = new ChimeraSovereignRuntime();
  const snapshot = runtime.runLocalSyntheticCycle(1_700_000_000_000);
  assert.equal(snapshot.operating_state, OperatingState.STANDALONE_SIMULATION);
  assert.equal(snapshot.actuation_allowed, false);
  assert.equal(snapshot.genesis_secret_exposed_to_browser, false);
  assert.equal(snapshot.kernel.safe_set_preserved, true);
  assert.throws(() => runtime.ingestAuthenticatedGatewayTelemetry(), /server-side Genesis gateway/);
});

test('browser telemetry remains non-actuating even when marked live', () => {
  const runtime = new ChimeraSovereignRuntime();
  const snapshot = runtime.ingestBrowserTelemetry({
    source: 'TEST_LIVE_SOURCE',
    is_live: true,
    timestamp: 1700000000,
    scene_id: 'TEST',
    mean_ndvi: 0.42,
    std_ndvi: 0.01,
    provenance: 'LIVE_BUT_UNAUTHENTICATED_BROWSER_DATA'
  });
  assert.equal(snapshot.operating_state, OperatingState.STANDALONE_SIMULATION);
  assert.equal(snapshot.actuation_allowed, false);
  assert.equal(snapshot.telemetry.browser_trusted, false);
});
