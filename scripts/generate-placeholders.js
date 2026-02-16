const fs = require('node:fs');
const path = require('node:path');

const ARTIFACT_DIR = path.join(process.cwd(), 'docs', 'images');

const images = [
  { name: '01-create.svg', text: 'Create Snippet View' },
  { name: '02-list.svg', text: 'Snippet List View' },
  { name: '03-search.svg', text: 'Search Result View' },
  { name: '04-backup.svg', text: 'Backup / Restore View' }
];

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

images.forEach(({ name, text }) => {
  const svg = `
<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f4f6f2"/>
  <rect x="20" y="20" width="360" height="50" rx="10" fill="#ffffff" stroke="#cfd6d3"/>
  <text x="40" y="50" font-family="sans-serif" font-size="16" fill="#182022">Textorium</text>
  <rect x="20" y="90" width="360" height="490" rx="10" fill="#ffffff" stroke="#cfd6d3"/>
  <text x="200" y="300" font-family="sans-serif" font-size="20" fill="#5d6764" text-anchor="middle">${text}</text>
  <text x="200" y="330" font-family="sans-serif" font-size="14" fill="#9fb0ab" text-anchor="middle">(Screenshot Placeholder)</text>
</svg>
`.trim();

  fs.writeFileSync(path.join(ARTIFACT_DIR, name), svg);
  console.log(`Generated placeholder: ${name}`);
});
