const { spawn } = require('child_process');
const path = require('path');

function spawnProcess(command, args, name) {
  const proc = spawn(command, args, {
    stdio: 'pipe',
    shell: true
  });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`[${name}] ${line}`);
      }
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.error(`[${name}] ${line}`);
      }
    });
  });

  return proc;
}

// Start backend
const backend = spawnProcess('yarn', ['dev:backend'], 'backend');

// Start frontend
const frontend = spawnProcess('yarn', ['dev:frontend'], 'frontend');

// Handle process exit
process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  backend.kill();
  frontend.kill();
  process.exit();
}); 