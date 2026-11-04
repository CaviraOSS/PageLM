import path from 'path';
const fs = utils.fs;

export default async () => {
    app.use(async (req, res, next) => {
        if (req.method !== "GET") return next();
        try {
            if (req.path.startsWith('/api/')) return next();
            if (req.path.startsWith('/assets/')) return next();

            const indexExists = fs.existsSync('./public/index.html');
            if (!indexExists) {
                return res.end(app.routes())
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                return res.end('404 Not Found: page not found');
            }

            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(fs.readFileSync('./public/index.html', 'utf-8'));
        } catch (error) {
            console.error(error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`500 Internal Server Error: ${error.message}`);
        }
    });

    if (fs.existsSync('./build')) build();
    function build() {
        try {
            fs.listAllFiles('./build').forEach((file) => {
                const destPath = file.replace('./build', './public');

                if (file.includes('assets')) return;

                const destDir = path.dirname(destPath);

                if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                if (fs.existsSync(destPath)) fs.unlinkSync(destPath);

                try {
                    fs.renameSync(file, destPath);
                } catch (error) {
                    fs.copyFileSync(file, destPath);
                    fs.unlinkSync(file);
                }
            });

            if (fs.existsSync('./build')) fs.rmdirSync('./build', { recursive: true });
            console.log('Processed build files.');
        } catch (error) {
            console.error('Error processing build files:', error);
            console.log('Failed to process build files.');
        }
    }
};

// const O_REG = new RegExp('^' + o.replace(/\*/g, '([^/]+)') + '$');
/* app.use(async (req, res, next) => {
    if (req.method !== "GET") return next();
    try {
        let a = fs.listAllFiles('./views');
        for (let i of a) {
            let o = i;
            o = i.replace('./views', '').replace('.html', '');
            if (o === '') o = '/';
            if (o.endsWith('index')) o = o.replace('index', '');
            if (o.endsWith('/') && o.length > 1) o = o.slice(0, -1);

            let isMatch = false;
            if (o.includes('*')) {
                const regex = O_REG;
                isMatch = regex.test(req.path);
            } else {
                isMatch = (req.path === o);
                if (!isMatch && !o.endsWith('/')) {
                    isMatch = (req.path === o + '/');
                }
            }

            if (isMatch) {
                let b = fs.readFileSync(i, 'utf-8');

                // <% import('') %> for partials, only HTML.
                let c = b.replace(/<%\s*import\(['"]([^'"]+)['"]\)\s*%>/g, (match, p1) => {
                    try {
                        let d = `./views/${p1}.html`;
                        if (fs.existsSync(d)) {
                            return fs.readFileSync(d, 'utf-8');
                        } else {
                            console.warn(`Partial not found: ${d}`);
                            return `<!-- Partial not found: ${p1} -->`;
                        }
                    } catch (error) {
                        console.error(`Error loading partial ${p1}:`, error);
                        return `<!-- Error loading partial: ${p1} -->`;
                    }
                });

                // <% env.VARIABLE %> for environment variables.
                c = c.replace(/<%\s*env\.([A-Z0-9_]+)\s*%>/g, (match, p1) => {
                    return process.env[p1] || '';
                });

                c = c.replace(/\n/g, '').replace(/\s+/g, ' ').trim();

                res.writeHead(200, { 'Content-Type': 'text/html' });
                return res.end(c);
            }
        }
        next();
    } catch (error) {
        console.error(error);
    }
}); */