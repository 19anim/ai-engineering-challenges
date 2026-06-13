export class ValidationError extends Error {
    fields;
    constructor(fields) {
        super('Validation failed');
        this.fields = fields;
    }
}
export class AuthError extends Error {
}
export class NetworkError extends Error {
}
export class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
let seq = 1;
function validateClaim(input) {
    const fields = {};
    if (!input.policyId)
        fields.policyId = 'required';
    if (!input.claimType)
        fields.claimType = 'required';
    const parsedDate = new Date(`${input.treatmentDate}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.treatmentDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.treatmentDate)
        fields.treatmentDate = 'must be a valid YYYY-MM-DD date';
    if (!input.amount || input.amount <= 0)
        fields.amount = 'must be positive';
    if (!/^[A-Z]{3}$/.test(input.currency))
        fields.currency = 'must be ISO 4217 uppercase';
    if (Object.keys(fields).length)
        throw new ValidationError(fields);
}
function validatePagination(options) {
    const fields = {};
    if (options.page !== undefined && (!Number.isInteger(options.page) || options.page < 1))
        fields.page = 'must be a positive integer';
    if (options.pageSize !== undefined && (!Number.isInteger(options.pageSize) || options.pageSize < 1))
        fields.pageSize = 'must be a positive integer';
    if (Object.keys(fields).length)
        throw new ValidationError(fields);
}
export class InsuranceSDK {
    config;
    token = '';
    expiresAt = 0;
    claimsStore = new Map();
    constructor(config) {
        this.config = config;
        if (!config.apiKey)
            throw new ValidationError({ apiKey: 'required' });
    }
    async ensureToken() { if (!this.token || Date.now() > this.expiresAt) {
        this.token = 'jwt-test-' + Date.now();
        this.expiresAt = Date.now() + 3600_000;
    } }
    async retry(fn, attempts = 3) { let last; for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        }
        catch (e) {
            last = e;
            if (!(e instanceof NetworkError))
                throw e;
            await new Promise(r => setTimeout(r, 25 * (2 ** i)));
        }
    } throw last; }
    claims = {
        create: async (input) => { validateClaim(input); await this.ensureToken(); return this.retry(async () => { const claim = { ...input, id: `CLM-${String(seq++).padStart(3, '0')}`, status: 'PENDING' }; this.claimsStore.set(claim.id, claim); return claim; }); },
        get: async (id) => { await this.ensureToken(); const claim = this.claimsStore.get(id); if (!claim)
            throw new ApiError(404, 'claim not found'); return claim; },
        list: async (options = {}) => { validatePagination(options); await this.ensureToken(); const page = options.page ?? 1, pageSize = options.pageSize ?? 20; const data = [...this.claimsStore.values()].filter(c => !options.status || c.status === options.status).slice((page - 1) * pageSize, page * pageSize); return { data, page, pageSize }; },
        onStatusChange: (claimId, cb) => { const timer = setInterval(() => { const claim = this.claimsStore.get(claimId); if (claim) {
            claim.status = 'APPROVED';
            cb(claim.status, claim);
            clearInterval(timer);
        } }, 50); return () => clearInterval(timer); }
    };
    documents = { upload: async (claimId, file, options) => { if (!options.type)
            throw new ValidationError({ type: 'required' }); await this.ensureToken(); if (!this.claimsStore.has(claimId))
            throw new ApiError(404, 'claim not found'); for (const pct of [25, 50, 75, 100])
            options.onProgress?.(pct); return { id: 'DOC-' + claimId, claimId, fileName: file.name, type: options.type }; } };
}
