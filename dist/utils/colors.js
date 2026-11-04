const colors = {};
const resetCode = '\x1b[0m';
const colorCodes = {
    reset: '\x1b[0m',
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    brightWhite: '\x1b[97m'
};
const styleCodes = {
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',
    inverse: '\x1b[7m',
    hidden: '\x1b[8m',
    strikethrough: '\x1b[9m',
};
const bgColorCodes = {
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
};
for (let i in colorCodes) {
    colors[i] = function (a) {
        return colorCodes[i] + a + resetCode;
    };
}
for (let i in styleCodes) {
    colors[i] = function (a) {
        return styleCodes[i] + a + resetCode;
    };
}
for (let i in bgColorCodes) {
    colors[i] = function (a) {
        return bgColorCodes[i] + a + resetCode;
    };
}
colors["custom"] = function (a, b) {
    return `\x1b[${b}m` + a + resetCode;
};
export default colors;
//# sourceMappingURL=colors.js.map