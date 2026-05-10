#!/usr/bin/env node

// Smoke test — verify CLI commands exist and exit cleanly (no DB required)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function run(label, cmd, expectCode = 0) {
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`✅ ${label}`);
    passed++;
  } catch (err) {
    const code = err.status ?? 1;
    if (code === expectCode) {
      console.log(`✅ ${label} (exit ${code})`);
      passed++;
    } else {
      console.error(`❌ ${label} — exit ${code}`);
      console.error(err.stderr?.toString() || err.message);
      failed++;
    }
  }
}

console.log('🧪 Supatool smoke tests\n');

// Version / help
run('version', 'node dist/bin/supatool.js --version');
run('no-args (shows help, exit 0)', 'node dist/bin/supatool.js');
run('help command', 'node dist/bin/supatool.js help');

// config:init
const tmpOut = path.join(__dirname, 'test-output', 'supatool.config.json');
fs.mkdirSync(path.dirname(tmpOut), { recursive: true });
run('config:init', `node dist/bin/supatool.js config:init -o ${tmpOut}`);
if (fs.existsSync(tmpOut)) {
  const cfg = JSON.parse(fs.readFileSync(tmpOut, 'utf-8'));
  if (cfg.schemaDir === './db/schemas' && cfg.migration.dir === 'db/migrations') {
    console.log('✅ config:init — correct default paths (db/)');
    passed++;
  } else {
    console.error('❌ config:init — unexpected paths:', cfg.schemaDir, cfg.migration.dir);
    failed++;
  }
  fs.unlinkSync(tmpOut);
}

// gen:types from model YAML
const modelYaml = `
models:
  - name: Test
    tables:
      items:
        fields:
          id:
            type: uuid
            primary: true
          name:
            type: text
`;
const modelPath = path.join(__dirname, 'test-output', 'model.yaml');
const typesOut = path.join(__dirname, 'test-output', 'types.ts');
fs.writeFileSync(modelPath, modelYaml);
run('gen:types', `node dist/bin/supatool.js gen:types ${modelPath} -o ${typesOut}`);
fs.rmSync(path.join(__dirname, 'test-output'), { recursive: true, force: true });

// Removed commands should be unknown
run('gen:crud removed', 'node dist/bin/supatool.js gen:crud anything', 1);
run('crud removed', 'node dist/bin/supatool.js crud', 1);
run('sync removed', 'node dist/bin/supatool.js sync', 1);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
