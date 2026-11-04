/* I wrote this file in 2023, haven't made a single change. */
import crypto from 'crypto';
function generate(a, b) {
    const c = crypto.randomBytes(a);
    let d = '';
    for (let i = 0; i < a; i++) {
        d += b.charAt(c[i] % b.length);
    }
    return d;
}
function hash(key, type = 'sha256') {
    function check(a) {
        const b = 32;
        const c = Buffer.from(a, 'utf-8').length;
        if (c < b) {
            const d = b - c;
            const e = Buffer.alloc(d, '\0');
            return Buffer.concat([Buffer.from(a, 'utf-8'), e], b);
        }
        else if (c > b) {
            return Buffer.from(a, 'utf-8').slice(0, b);
        }
        return Buffer.from(a, 'utf-8');
    }
    function hash(a) {
        const b = crypto.createHash(type);
        b.update(a);
        return b.digest('hex');
    }
    return hash(check(key));
}
export default {
    gen: function (a, b) {
        const d = {
            88: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?",
            62: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
            52: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
            36: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
            26: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            "26s": "abcdefghijklmnopqrstuvwxyz",
            10: "1234567890",
        };
        const c = d[a] || d[62];
        return generate(b, c);
    },
    base64: function (a) {
        return `base64:${Buffer.from(a, 'utf-8').toString('base64')}`;
    },
    hash
};
/**
 *--------------------------------------------------------------------------
 * End of file
 *--------------------------------------------------------------------------
*/ 
//# sourceMappingURL=crypto.js.map