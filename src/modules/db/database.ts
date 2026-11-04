import fs from 'fs/promises';
import path from 'path';
const dirty = new Map();

let dbPath;
let syncInterval;
let isSyncing = false;
let isLoaded = false;
let dataChanged = false;

function isValidTable(table) {
    return typeof table === 'string' && /^[a-zA-Z0-9_-]+$/.test(table);
}

async function syncToFiles() {
    if (isSyncing || !dataChanged) return;
    isSyncing = true;
    dataChanged = false;
    
    try {
        for (const [table, tableData] of dirty) {
            if (!isValidTable(table)) continue;
            const filepath = path.join(dbPath, `${table}.json`);
            await fs.writeFile(filepath, JSON.stringify(tableData, null, 2), 'utf8');
        }
    } catch (e) {
        console.error('[DB] Write error:', e);
        dataChanged = true;
    } finally {
        isSyncing = false;
    }
    return true;
}

function startSync() {
    if (!syncInterval) {
        syncInterval = setInterval(syncToFiles, 5000);
    }
}

function set(table, key, value) {
    if (!isValidTable(table)) return false;
    let tableData = dirty.get(table);
    if (!tableData) {
        tableData = Object.create(null);
        dirty.set(table, tableData);
    }
    tableData[key] = value;
    dataChanged = true;
    return true;
}

function get(table, key) {
    const tableData = dirty.get(table);
    if (tableData && Object.prototype.hasOwnProperty.call(tableData, key)) {
        return tableData[key];
    }
    return null;
}

function remove(table, key) {   
    const tableData = dirty.get(table);
    if (tableData && Object.prototype.hasOwnProperty.call(tableData, key)) {
        delete tableData[key];
        dataChanged = true;
        return true;
    }
    return false;
}

async function reset(table) {   
    if (!isValidTable(table)) return false;
    try {
        const filepath = path.join(dbPath, `${table}.json`);
        await fs.unlink(filepath).catch(() => {});
        dirty.delete(table);
        dataChanged = true;
        return true;
    } catch {
        return false;
    }
}

async function load(options: { path?: string } = {}) {
    try {
        dbPath = options.path ? path.resolve(options.path) : path.resolve(__dirname, '../../app/data');
        await fs.mkdir(dbPath, { recursive: true }).catch(() => {});
        const files = await fs.readdir(dbPath);
        
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            
            try {
                const table = file.slice(0, -5);
                if (!isValidTable(table)) continue;
                const filepath = path.join(dbPath, file);
                const content = await fs.readFile(filepath, 'utf8');
                const parsed = JSON.parse(content);
                const tableData = Object.assign(Object.create(null), parsed);
                dirty.set(table, tableData);
            } catch (e) {
                console.error(`[DB] Error loading ${file}:`, e);
            }
        }
        
        startSync();
        isLoaded = true;
        return true;
    } catch (e) {
        console.error('[DB] Load error:', e);
        return false;
    }
}

async function flush() {
    return await syncToFiles();
}

export default {
    get,
    set,
    rm: remove,
    delete: remove,
    reset,
    load,
    get status() { return isLoaded; },
    flush
};