import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
import server from './modules/server/index.js';
import utils from './utils/index.js';
if (!fs.existsSync('.env') && fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env');
    console.log('Created .env file from .env.example');
}
if (typeof Bun === 'undefined')
    process?.loadEnvFile?.('.env');
global.utils = utils;
main();
async function main() {
    try {
        const HTTP_PORT = parseInt(process.env.APP_PORT, 10) || 80;
        const ssl = resolveSSL();
        const app = server({
            cors: { enabled: true, origin: process.env.APP_CORS_ORIGIN || '*' },
            ...(ssl.enabled ? { ssl: ssl.options } : {})
        });
        global.app = app;
        app.use(app.static('/', './public'));
        const routes = utils.fs.listAllFiles('./dist/routes').filter(f => f.endsWith('.js'));
        await Promise.all(routes.map(f => import(pathToFileURL(f).href).then(m => m.default?.())));
        let isTerminating = false;
        const shutdown = (signal) => {
            if (isTerminating)
                return;
            isTerminating = true;
            try {
                wget?.cache?.flush?.();
            }
            catch { }
            if (signal)
                process.exit(0);
        };
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('exit', () => shutdown());
        await freePort(HTTP_PORT);
        if (ssl.enabled && ssl.port !== HTTP_PORT)
            await freePort(ssl.port);
        const target = ssl.enabled ? { http: HTTP_PORT, https: ssl.port } : HTTP_PORT;
        app.listen(target, (err) => {
            if (err) {
                console.error('Startup listen error:', err);
                process.exit(1);
            }
            console.log(`Server listening at http://localhost:${HTTP_PORT}`);
            if (ssl.enabled)
                console.log(`Secure server listening at https://localhost:${ssl.port}`);
        });
    }
    catch (err) {
        console.error('Fatal initialization error:', err);
        process.exit(1);
    }
}
async function freePort(port) {
    try {
        const isWin = process.platform === 'win32';
        const cmd = isWin
            ? `netstat -ano | findstr :${port} | findstr LISTENING`
            : `lsof -t -i :${port}`;
        const raw = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
        const pids = [...new Set(raw.trim().split(/\r?\n/)
                .map(line => Number(isWin ? line.trim().split(/\s+/).pop() : line.trim()))
                .filter(pid => pid && pid !== process.pid))];
        for (const pid of pids) {
            console.warn(`Terminating existing process ${pid} on port ${port}...`);
            if (isWin) {
                execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            }
            else {
                process.kill(pid, 'SIGKILL');
            }
        }
        if (pids.length > 0)
            await new Promise(r => setTimeout(r, 500));
    }
    catch { }
}
function resolveSSL() {
    if (process.env.SSL_ENABLED !== 'true')
        return { enabled: false, port: null, options: null };
    const { SSL_KEY_PATH: key, SSL_CERT_PATH: cert, SSL_PORT } = process.env;
    return {
        enabled: true,
        port: parseInt(SSL_PORT, 10) || 443,
        options: {
            key: key && fs.existsSync(key) ? fs.readFileSync(key) : null,
            cert: cert && fs.existsSync(cert) ? fs.readFileSync(cert) : null
        }
    };
}
//# sourceMappingURL=app.js.map