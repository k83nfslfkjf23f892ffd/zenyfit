const http = require('http');

const PROXY_PORT = 9199; // External port for phone to connect
const AUTH_EMULATOR_PORT = 9099; // Internal auth emulator port

const server = http.createServer((clientReq, clientRes) => {
  const options = {
    hostname: 'localhost',
    port: AUTH_EMULATOR_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: clientReq.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    clientRes.writeHead(502);
    clientRes.end('Bad Gateway');
  });

  clientReq.pipe(proxyReq);
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`Auth proxy listening on 0.0.0.0:${PROXY_PORT} -> localhost:${AUTH_EMULATOR_PORT}`);
});
