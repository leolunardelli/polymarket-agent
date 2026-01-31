const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function findTsconfig(startDir) {
  let dir = startDir;
  for (let i = 0; i < 5; i += 1) {
    const candidate = path.join(dir, 'tsconfig.json');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const tsconfigPath = findTsconfig(process.cwd());
if (!tsconfigPath) {
  console.error('tsconfig.json not found in current or parent directories.');
  process.exit(1);
}

const tscPath = require.resolve('typescript/bin/tsc');
const result = spawnSync(process.execPath, [tscPath, '-p', tsconfigPath], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
