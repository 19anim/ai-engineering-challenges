
export class ValidationError extends Error { constructor(public fields: Record<string, string>) { super('Validation failed'); } }
export class AuthError extends Error {}
export class NetworkError extends Error {}
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export type ClaimInput = { policyId: string; claimType: string; diagnosisCode: string; treatmentDate: string; amount: number; currency: string };
export type Claim = ClaimInput & { id: string; status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' };
export type ListOptions = { status?: string; page?: number; pageSize?: number };
export type UploadOptions = { type: string; onProgress?: (percent: number) => void };

type Config = { apiKey: string; environment: 'sandbox' | 'production'; timeout?: number };
let seq = 1;
function validateClaim(input: ClaimInput) {
  const fields: Record<string,string> = {};
  if (!input.policyId) fields.policyId = 'required';
  if (!input.claimType) fields.claimType = 'required';
  const parsedDate = new Date(`${input.treatmentDate}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.treatmentDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.treatmentDate) fields.treatmentDate = 'must be a valid YYYY-MM-DD date';
  if (!input.amount || input.amount <= 0) fields.amount = 'must be positive';
  if (!/^[A-Z]{3}$/.test(input.currency)) fields.currency = 'must be ISO 4217 uppercase';
  if (Object.keys(fields).length) throw new ValidationError(fields);
}
function validatePagination(options: ListOptions) {
  const fields: Record<string,string> = {};
  if (options.page !== undefined && (!Number.isInteger(options.page) || options.page < 1)) fields.page = 'must be a positive integer';
  if (options.pageSize !== undefined && (!Number.isInteger(options.pageSize) || options.pageSize < 1)) fields.pageSize = 'must be a positive integer';
  if (Object.keys(fields).length) throw new ValidationError(fields);
}
export class InsuranceSDK {
  private token = '';
  private expiresAt = 0;
  private claimsStore = new Map<string, Claim>();
  constructor(private config: Config) { if (!config.apiKey) throw new ValidationError({ apiKey: 'required' }); }
  private async ensureToken() { if (!this.token || Date.now() > this.expiresAt) { this.token = 'jwt-test-' + Date.now(); this.expiresAt = Date.now() + 3600_000; } }
  private async retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> { let last: unknown; for (let i=0;i<attempts;i++) { try { return await fn(); } catch (e) { last=e; if (!(e instanceof NetworkError)) throw e; await new Promise(r=>setTimeout(r, 25 * (2 ** i))); } } throw last; }
  claims = {
    create: async (input: ClaimInput): Promise<Claim> => { validateClaim(input); await this.ensureToken(); return this.retry(async () => { const claim: Claim = { ...input, id: `CLM-${String(seq++).padStart(3,'0')}`, status: 'PENDING' }; this.claimsStore.set(claim.id, claim); return claim; }); },
    get: async (id: string): Promise<Claim> => { await this.ensureToken(); const claim = this.claimsStore.get(id); if (!claim) throw new ApiError(404, 'claim not found'); return claim; },
    list: async (options: ListOptions = {}): Promise<{ data: Claim[]; page: number; pageSize: number }> => { validatePagination(options); await this.ensureToken(); const page=options.page ?? 1, pageSize=options.pageSize ?? 20; const data=[...this.claimsStore.values()].filter(c=>!options.status || c.status===options.status).slice((page-1)*pageSize,page*pageSize); return { data, page, pageSize }; },
    onStatusChange: (claimId: string, cb: (newStatus: Claim['status'], claim: Claim) => void) => { const timer=setInterval(()=>{ const claim=this.claimsStore.get(claimId); if (claim) { claim.status='APPROVED'; cb(claim.status, claim); clearInterval(timer); } }, 50); return () => clearInterval(timer); }
  };
  documents = { upload: async (claimId: string, file: { name: string; size?: number }, options: UploadOptions) => { if (!options.type) throw new ValidationError({ type: 'required' }); await this.ensureToken(); if (!this.claimsStore.has(claimId)) throw new ApiError(404, 'claim not found'); for (const pct of [25,50,75,100]) options.onProgress?.(pct); return { id: 'DOC-' + claimId, claimId, fileName: file.name, type: options.type }; } };
}
