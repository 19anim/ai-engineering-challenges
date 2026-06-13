# Challenge 13 - Partner Integration SDK

## Quickstart

```bash
npm.cmd install
npm.cmd run build
npm.cmd test
```

## Submission

Include SDK source, mock server, tests, `package-lock.json`, generated `dist/`, docs, and example scripts. Do not include `node_modules`; reinstall dependencies with `npm.cmd install`.

## API Surface

The SDK exposes `InsuranceSDK`, `claims.create/get/list/onStatusChange`, `documents.upload`, and typed `ValidationError`, `AuthError`, `NetworkError`, and `ApiError`.

## Approach

- `src/server.ts` contains a mock HTTP server with auth, delay, and transient-failure simulation.
- Client-side validation catches malformed claims and unsupported document uploads before API calls.
- Typed errors separate validation, authentication, API, and network failures.
- `examples/` covers simple claim submission, document upload, and status tracking.
