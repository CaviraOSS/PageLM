import fs from 'fs';
import path from 'path';

function ensure(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function exists(src) {
    return fs.existsSync(src);
}

function isFile(src) {
    return fs.statSync(src).isFile();
}

function move(src, dest) {
    fs.renameSync(src, dest);
    return true;
}

function copy(src, dest) {
    if (isFile(src)) {
        fs.copyFileSync(src, dest);
    } else {
        fs.mkdirSync(dest);
        fs.readdirSync(src).forEach(file => {
            copy(path.join(src, file), path.join(dest, file));
        });
    }
    return true;
}

function listAllFiles(dir) {
    let results = [];
    fs.readdirSync(dir).forEach(file => {
        file = path.posix.join(dir, file);
        if (!isFile(file)) {
            results = results.concat(listAllFiles(file));
        } else {
            results.push(`./${file}`);
        }
    });
    return results;
}

export default {
    ...fs,
    ensure,
    exists,
    isFile,
    move,
    copy,
    listAllFiles
};