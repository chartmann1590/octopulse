const fs = require('fs');
if (!fs.existsSync('ui.xml')) {
  console.log('No ui.xml');
  process.exit(0);
}
const xml = fs.readFileSync('ui.xml', 'utf8');
const lines = xml.match(/<node [^>]+>/g) || [];
for (const l of lines) {
  const textMatch = l.match(/text="([^"]+)"/);
  const boundsMatch = l.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (textMatch && boundsMatch) {
    console.log(textMatch[1], '-->', boundsMatch[1], boundsMatch[2], boundsMatch[3], boundsMatch[4]);
  }
}
