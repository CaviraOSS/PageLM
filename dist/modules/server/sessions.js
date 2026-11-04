import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
let cookies;
let CURRENT_MEMORY_USAGE = 0;
let MAX_MEMORY_LIMIT = 512;
let DROP_COUNT = 5;
let sessions = new Map();
let syncInterval;
let isSyncing = false;
let lastData;
let cookieToken = 'fubelt.ss';
const DB_DIR = path.join('./');
const DB = path.join(DB_DIR, 'sessions.json');
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}
let fsSession;
try {
    fsSession = JSON.parse(fs.readFileSync(DB, 'utf8'));
}
catch (error) {
    fsSession = [];
}
for (let index = 0; index < fsSession.length; index++) {
    const i = fsSession[index];
    sessions.set(i.session.identifier, i);
}
syncInterval = setInterval(() => {
    if (!isSyncing)
        syncSessions();
}, 2000);
const cleanup = () => {
    clearInterval(syncInterval);
    if (!isSyncing) {
        syncSessions();
    }
    process.exit();
};
process.on('exit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGQUIT', cleanup);
function syncSessions() {
    if (isSyncing)
        return;
    isSyncing = true;
    try {
        let ss = Array.from(sessions.values());
        const sessionsToSync = ss.filter(s => {
            const keys = Object.keys(s);
            return keys.length > 2 || (keys.length === 2 && !keys.includes('destroy'));
        });
        const dataString = JSON.stringify(sessionsToSync);
        const currentHash = crypto.createHash('sha256').update(dataString).digest('hex');
        if (lastData !== currentHash) {
            lastData = currentHash;
            fs.writeFileSync(DB, dataString);
        }
    }
    catch (error) {
        console.error('[Sync Sessions Error]', error);
    }
    finally {
        isSyncing = false;
    }
}
export default async (req, res, next) => {
    try {
        manageMemoryUsage();
        let sessionID = cookies.get(req, cookieToken);
        if (sessionID && sessions.has(sessionID)) {
            req.session = sessions.get(sessionID);
        }
        else {
            sessionID = gen(62, 64);
            req.session = {
                session: {
                    created: Date.now(),
                    identifier: sessionID,
                    lastlogin: Date.now(),
                    headers: req.headers,
                },
                destroy: function () {
                    sessions.delete(sessionID);
                    cookies.set(res, cookieToken, '', { maxAge: 0 });
                }
            };
            sessions.set(sessionID, req.session);
            cookies.set(res, cookieToken, sessionID);
        }
        const originalEnd = res.end;
        res.end = function (...args) {
            sessions.set(sessionID, req.session);
            syncSessions();
            return originalEnd.apply(res, args);
        };
        next();
    }
    catch (error) {
        console.error('[Sessions Middleware Error]', error);
        throw error;
    }
};
export const get = function (sessionID) {
    return sessions.get(sessionID);
};
export const getByCookies = function (cookieHeader) {
    const parsedCookies = {};
    cookieHeader.split(';').forEach(cookie => {
        const [key, ...val] = cookie.split('=');
        parsedCookies[key.trim()] = decodeURIComponent(val.join('='));
    });
    return sessions.get(parsedCookies[cookieToken]);
};
export const purge = () => {
    sessions.clear();
};
export const remove = (sessionID) => {
    sessions.delete(sessionID);
};
function manageMemoryUsage() {
    CURRENT_MEMORY_USAGE = (sessions.size * 1.5 * 1024) / (1024 * 1024);
    if (CURRENT_MEMORY_USAGE > MAX_MEMORY_LIMIT) {
        const keysToDelete = Array.from(sessions.keys()).slice(DROP_COUNT);
        keysToDelete.forEach(key => {
            sessions.delete(key);
        });
        CURRENT_MEMORY_USAGE = (sessions.size * 1.5 * 1024) / (1024 * 1024);
    }
}
function gen(len = 64, a = 62) {
    const list = {
        88: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?",
        62: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        52: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
        36: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        26: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "26S": "abcdefghijklmnopqrstuvwxyz",
        10: "1234567890",
    };
    const set = list[a] || list[62];
    const setLength = set.length;
    let result = '';
    const range = Math.floor(256 / setLength) * setLength;
    while (result.length < len) {
        const buffer = crypto.randomBytes(len * 2);
        for (let i = 0; i < buffer.length && result.length < len; i++) {
            const byte = buffer[i];
            if (byte < range) {
                result += set.charAt(byte % setLength);
            }
        }
    }
    return result;
}
cookies = {
    get: function (req, a) {
        let b = req.headers.cookie;
        if (!b)
            return null;
        let d = a + "=";
        let ca = b.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ')
                c = c.substring(1);
            if (c.indexOf(d) == 0) {
                return decodeURIComponent(c.substring(d.length, c.length));
            }
        }
        return "";
    },
    set: function (res, a, b) {
        let c = `${encodeURIComponent(a)}=${encodeURIComponent(b)}`;
        c += `; Max-Age=${30 * 24 * 60 * 60}`;
        c += `; Path=/`;
        c += `; Secure`;
        c += `; SameSite=Strict`;
        res.setHeader('Set-Cookie', c);
    },
    delete: function (res, a) {
        let c = `${encodeURIComponent(a)}=;`;
        c += `; Max-Age=0`;
        c += `; Path=/`;
        c += `; Secure`;
        c += `; SameSite=Strict`;
        res.setHeader('Set-Cookie', c);
    }
};
//# sourceMappingURL=sessions.js.map