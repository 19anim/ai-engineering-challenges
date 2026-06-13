import test from 'node:test';
import assert from 'node:assert/strict';
import { InsuranceSDK, ValidationError, ApiError } from '../src/index.js';
const input = { policyId: 'POL-123', claimType: 'OUTPATIENT', diagnosisCode: 'J06.9', treatmentDate: '2024-03-15', amount: 15000, currency: 'THB' };
test('create/get/list/upload/status flows', async () => { const sdk = new InsuranceSDK({ apiKey: 'pk_test_x', environment: 'sandbox' }); const c = await sdk.claims.create(input); assert.equal(c.status, 'PENDING'); assert.equal((await sdk.claims.get(c.id)).id, c.id); assert.equal((await sdk.claims.list({ status: 'PENDING' })).data.length, 1); let progress = 0; const doc = await sdk.documents.upload(c.id, { name: 'receipt.pdf' }, { type: 'medical_receipt', onProgress: p => progress = p }); assert.equal(doc.claimId, c.id); assert.equal(progress, 100); await new Promise(resolve => sdk.claims.onStatusChange(c.id, (s) => { assert.equal(s, 'APPROVED'); resolve(); })); });
test('client validation catches invalid claim', async () => { const sdk = new InsuranceSDK({ apiKey: 'pk_test_x', environment: 'sandbox' }); await assert.rejects(() => sdk.claims.create({ ...input, policyId: '', amount: 0 }), ValidationError); });
test('missing claim throws api error', async () => { const sdk = new InsuranceSDK({ apiKey: 'pk_test_x', environment: 'sandbox' }); await assert.rejects(() => sdk.claims.get('missing'), ApiError); });
test('constructor validates api key', () => assert.throws(() => new InsuranceSDK({ apiKey: '', environment: 'sandbox' }), ValidationError));
test('upload validates document type', async () => { const sdk = new InsuranceSDK({ apiKey: 'pk_test_x', environment: 'sandbox' }); await assert.rejects(() => sdk.documents.upload('CLM-1', { name: 'x.pdf' }, { type: '' }), ValidationError); });
test('client validation rejects invalid currency and calendar date', async () => {
    const sdk = new InsuranceSDK({ apiKey: 'pk_test_x', environment: 'sandbox' });
    await assert.rejects(() => sdk.claims.create({ ...input, currency: 'usd' }), ValidationError);
    await assert.rejects(() => sdk.claims.create({ ...input, treatmentDate: '2024-02-30' }), ValidationError);
});
test('list validates pagination bounds', async () => {
    const sdk = new InsuranceSDK({ apiKey: 'pk_test_x', environment: 'sandbox' });
    await assert.rejects(() => sdk.claims.list({ page: 0 }), ValidationError);
    await assert.rejects(() => sdk.claims.list({ pageSize: 0 }), ValidationError);
});
test('upload rejects unknown claim id', async () => {
    const sdk = new InsuranceSDK({ apiKey: 'pk_test_x', environment: 'sandbox' });
    await assert.rejects(() => sdk.documents.upload('CLM-MISSING', { name: 'receipt.pdf' }, { type: 'medical_receipt' }), ApiError);
});
