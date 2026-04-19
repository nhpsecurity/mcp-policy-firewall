#!/usr/bin/env node

import { once } from 'node:events';
import { spawn } from 'node:child_process';

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function run(command, args, options = {}) {
  const { shell = false } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
      shell,
    });

    child.once('error', (error) => {
      reject(error);
    });

    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(`Command failed: ${command} ${args.join(' ')} (exit code ${code ?? 'unknown'})`),
      );
    });
  });
}

async function waitForHealth(baseUrl, serverProcess) {
  const maxAttempts = 30;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Firewall process exited early with code ${serverProcess.exitCode}.`);
    }

    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        const health = await response.json();
        if (health.status === 'ok') {
          return;
        }
      }
    } catch {
      // Retry until timeout.
    }

    await sleep(500);
  }

  throw new Error('mcp-firewall did not become healthy in time.');
}

async function stopServer(serverProcess) {
  if (serverProcess.exitCode !== null) {
    return;
  }

  serverProcess.kill('SIGINT');

  const timeout = sleep(3000).then(() => {
    if (serverProcess.exitCode === null) {
      serverProcess.kill('SIGKILL');
    }
  });

  await Promise.race([once(serverProcess, 'exit'), timeout]);
}

async function main() {
  const baseUrl = 'http://127.0.0.1:8787';

  console.log('[1/4] Run CI quality gates');
  await run('npm', ['run', 'qa:ci'], { shell: process.platform === 'win32' });

  console.log('[2/4] Start mcp-firewall mock server');
  const serverProcess = spawn(
    process.execPath,
    ['dist/cli.js', 'start', '--config', './examples/config.mock-local.json'],
    {
      stdio: 'inherit',
      env: process.env,
    },
  );

  try {
    console.log('[3/4] Wait for health endpoint');
    await waitForHealth(baseUrl, serverProcess);

    console.log('[4/4] Run smoke test');
    await run(process.execPath, ['./scripts/smoke-test.mjs', '--base-url', baseUrl]);

    console.log('Local QA completed successfully.');
  } finally {
    await stopServer(serverProcess);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
