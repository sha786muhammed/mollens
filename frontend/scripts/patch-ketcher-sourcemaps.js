const fs = require('fs');
const path = require('path');

const ketcherRoot = path.resolve(__dirname, '..', 'node_modules', 'ketcher-react', 'dist');
const paperFullPath = path.resolve(__dirname, '..', 'node_modules', 'paper', 'dist', 'paper-full.js');

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (/\.(js|css)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function stripSourceMapMarkers(content) {
  return content
    .replace(/\/\*# sourceMappingURL=data:application\/json[\s\S]*?\*\//g, '')
    .replace(/\/\*# sourceMappingURL=.*?\*\//g, '')
    .replace(/\/\/# sourceMappingURL=.*$/gm, '');
}

function patchFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const patched = stripSourceMapMarkers(original);

  if (patched !== original) {
    fs.writeFileSync(filePath, patched, 'utf8');
    return true;
  }

  return false;
}

let changed = 0;

for (const file of walk(ketcherRoot)) {
  if (patchFile(file)) {
    changed += 1;
  }
}

if (fs.existsSync(paperFullPath)) {
  const original = fs.readFileSync(paperFullPath, 'utf8');
  const patched = original.replace(
    /sourceMappingURL=data:application\/json;base64,/g,
    'paperSourceMappingURL=data:application/json;base64,',
  );

  if (patched !== original) {
    fs.writeFileSync(paperFullPath, patched, 'utf8');
    changed += 1;
  }
}

console.log(
  changed > 0
    ? `Patched Ketcher source-map markers in ${changed} files.`
    : 'No Ketcher source-map markers needed patching.',
);
