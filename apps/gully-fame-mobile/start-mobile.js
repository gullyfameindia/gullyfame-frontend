#!/usr/bin/env node

const { spawn } = require('child_process');

const args = process.argv.slice(2);

const expo = spawn('npx', ['expo', 'start', '--dev-client', '--clear', ...args], {
  stdio: 'inherit',
// eslint-disable-next-line no-undef
  cwd: __dirname
});

expo.on('exit', (code) => {
  process.exit(code || 0);
});
