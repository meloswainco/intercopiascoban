const fs = require('fs');
const modals = fs.readFileSync('renderer/modals.html', 'utf8');
let demo = fs.readFileSync('demo.html', 'utf8');
const fetchLogicRegex = /<script>[\s\S]*?readHtmlFile\('renderer\/modals\.html'\);[\s\S]*?<\/script>/;
demo = demo.replace(fetchLogicRegex, '');
demo = demo.replace('<div id="modals-container" class="relative z-[200]"></div>', `<div id="modals-container" class="relative z-[200]">\n${modals}\n</div>\n<script>document.addEventListener('DOMContentLoaded', () => document.dispatchEvent(new Event('modalsReady')));</script>`);
fs.writeFileSync('demo.html', demo);
console.log('Modals injected directly into demo.html');
