import test from 'node:test';
import assert from 'node:assert/strict';
import { PHASES, evaluateResidual, SovereignCorePreview } from '../cf-temp-sovereign/sovereign-core.mjs';

const zero = () => ({ safety: 0, structural: 0, liveness: 0, economic: 0 });
const seeded = () => { const c = new SovereignCorePreview(); for (let i=0; i<7; i++) c.advance(zero()); return c; };

test('residual zero passes and zero spend is hard-locked', () => {
  assert.equal(evaluateResidual(zero()).allowed, true);
  assert.equal(evaluateResidual({ ...zero(), economic: .8 }).allowed, false);
  assert.equal(evaluateResidual({ ...zero(), economic: Number.MIN_VALUE }).allowed, false);
});
test('safety and structural nonzero are denied', () => {
  assert.equal(evaluateResidual({ ...zero(), safety: .1 }).allowed, false);
  assert.equal(evaluateResidual({ ...zero(), structural: .1 }).allowed, false);
});
test('liveness is bounded without allowing negative measurements', () => {
  assert.equal(evaluateResidual({ ...zero(), liveness: 30 }).allowed, true);
  assert.equal(evaluateResidual({ ...zero(), liveness: 30.01 }).allowed, false);
  assert.equal(evaluateResidual({ ...zero(), liveness: -1 }).allowed, false);
});
test('null, strings, NaN and infinities cannot pass residual gate', () => {
  for (const input of [null, {}, { ...zero(), economic: '0' }, { ...zero(), safety: NaN }, { ...zero(), structural: Infinity }]) {
    assert.equal(evaluateResidual(input).allowed, false);
  }
});
test('phase progression is strictly sequential and cannot skip', () => {
  const core = new SovereignCorePreview();
  assert.equal(core.currentPhase, PHASES[0]);
  for (let i=1; i<PHASES.length; i++) assert.equal(core.advance(zero()), PHASES[i]);
  assert.throws(() => core.advance(zero()), /CONTINUA/);
});
test('phase advancement requires passing residual gate', () => {
  const core = new SovereignCorePreview();
  assert.throws(() => core.advance({ ...zero(), economic: 1 }), /Residual gate denied/);
  assert.equal(core.currentPhase, 'PURE_POTENTIAL');
});
test('preview receipt cannot be issued before manifestation', () => {
  const core = new SovereignCorePreview();
  assert.throws(() => core.issuePreviewReceipt({ metrics: zero(), tool: 'preview.echo', payload: 'hello' }), /MANIFESTATION/);
});
test('preview receipt is random opaque, untrusted, and non-authorizing', () => {
  const core = seeded();
  const a = core.issuePreviewReceipt({ metrics: zero(), tool: 'preview.echo', payload: 'hello' });
  const b = core.issuePreviewReceipt({ metrics: zero(), tool: 'preview.echo', payload: 'hello' });
  assert.notEqual(a.id, b.id);
  assert.equal(a.authenticated, false);
  assert.equal(a.authorityGranted, false);
  assert.equal(core.health().actuation_allowed, false);
});
test('manifestation allows pure preview echo, once only', async () => {
  const core = seeded();
  const args = { metrics: zero(), tool: 'preview.echo', payload: 'hello' };
  const receipt = core.issuePreviewReceipt(args);
  assert.equal((await core.runPreview({ ...args, id: receipt.id })).output, 'hello');
  await assert.rejects(() => core.runPreview({ ...args, id: receipt.id }), /already consumed/);
});
test('receipt is bound to exact tool and payload', async () => {
  const core = seeded();
  const receipt = core.issuePreviewReceipt({ metrics: zero(), tool: 'preview.echo', payload: 'A' });
  await assert.rejects(() => core.runPreview({ id: receipt.id, metrics: zero(), tool: 'preview.echo', payload: 'B' }), /does not match/);
  await assert.rejects(() => core.runPreview({ id: receipt.id, metrics: zero(), tool: 'sha256.text', payload: 'A' }), /does not match/);
});
test('residual is checked again when running the preview', async () => {
  const core = seeded();
  const receipt = core.issuePreviewReceipt({ metrics: zero(), tool: 'preview.echo', payload: 'A' });
  await assert.rejects(() => core.runPreview({ id: receipt.id, metrics: { ...zero(), economic: .8 }, tool: 'preview.echo', payload: 'A' }), /Residual gate denied/);
});
test('moving beyond manifestation revokes the execution phase', async () => {
  const core = seeded();
  const receipt = core.issuePreviewReceipt({ metrics: zero(), tool: 'preview.echo', payload: 'A' });
  core.advance(zero());
  await assert.rejects(() => core.runPreview({ id: receipt.id, metrics: zero(), tool: 'preview.echo', payload: 'A' }), /MANIFESTATION/);
});
test('reset revokes all old receipts', async () => {
  const core = seeded();
  const receipt = core.issuePreviewReceipt({ metrics: zero(), tool: 'preview.echo', payload: 'A' });
  core.reset();
  for (let i=0;i<7;i++) core.advance(zero());
  await assert.rejects(() => core.runPreview({ id: receipt.id, metrics: zero(), tool: 'preview.echo', payload: 'A' }), /Unknown, revoked/);
});
test('only registered, pure tools are available, no arbitrary execution', () => {
  const core = seeded();
  assert.throws(() => core.issuePreviewReceipt({ metrics: zero(), tool: 'shell.run', payload: 'rm -rf /' }), /Unregistered/);
  assert.equal(core.health().spending_allowed, false);
  assert.equal(core.health().external_ledger_anchor, false);
});
test('WebCrypto digest tool reports SHA256, never external side effects', async () => {
  const core = seeded();
  const args = { metrics: zero(), tool: 'sha256.text', payload: 'abc' };
  const receipt = core.issuePreviewReceipt(args);
  const out = await core.runPreview({ ...args, id: receipt.id });
  assert.equal(out.output, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(out.sideEffects, false);
  assert.equal(out.costAUD, 0);
});
test('text input is bounded', () => {
  const core = seeded();
  assert.throws(() => core.issuePreviewReceipt({ metrics: zero(), tool: 'preview.echo', payload: 'x'.repeat(4097) }), /4096/);
});
