import http from 'node:http';
export function startMockServer(port = 3000) {
    const claims = [];
    return http.createServer((req, res) => {
        const delay = 200 + Math.floor(Math.random() * 300);
        setTimeout(() => {
            res.setHeader('content-type', 'application/json');
            if (req.url === '/api/v1/auth/token' && req.method === 'POST') {
                res.end(JSON.stringify({ token: 'jwt-test', expiresIn: 3600 }));
                return;
            }
            if (!req.headers.authorization) {
                res.statusCode = 401;
                res.end(JSON.stringify({ error: 'missing token' }));
                return;
            }
            if (Math.random() < 0.1) {
                res.statusCode = 503;
                res.end(JSON.stringify({ error: 'transient failure' }));
                return;
            }
            res.end(JSON.stringify({ ok: true, claims }));
        }, delay);
    }).listen(port);
}
