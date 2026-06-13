import { InsuranceSDK } from '../src/index.js';
const sdk = new InsuranceSDK({ apiKey: 'pk_test_xxx', environment: 'sandbox' });
const claim = await sdk.claims.create({ policyId: 'POL-123', claimType: 'OUTPATIENT', diagnosisCode: 'J06.9', treatmentDate: '2024-03-15', amount: 15000, currency: 'THB' });
console.log(await sdk.documents.upload(claim.id, { name: 'receipt.pdf' }, { type: 'medical_receipt', onProgress: console.log }));
