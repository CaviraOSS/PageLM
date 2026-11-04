import yeah from './00.js';
const iconModules = import.meta.glob('./*.svg', { 
    query: '?raw', 
    import: 'default', 
    eager: true 
});

export function allIcons() {
    return Object.keys(iconModules).map(path => {
        const iconName = path.split('/').pop().replace('.svg', '');
        return iconName;
    });
}

export function getIcon(icon, classes = "") {
    if (yeah[icon]) {
        return yeah[icon].replace('<svg', `<svg class="${classes}"`);
    }

    const path = `./${icon}.svg`;
    const svgContent = iconModules[path];

    if (!svgContent) {
        console.warn(`Icon "${icon}" not found in ./icons directory.`);
        return "";
    }

    return svgContent.replace('<svg', `<svg class="${classes}"`);
}