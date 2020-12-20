import {spawn} from 'child_process';

// https://github.com/nodejs/node-v0.x-archive/issues/2792

function go(executable: string, args: string[], shell: boolean) {
  console.log('1: enter go()');

  const subprocess = spawn(executable, args, {shell, windowsHide: false});
  console.log(`7: after spawn, pid=${subprocess.pid}`);

  // subprocess.stdin.write('.help\n');
  // subprocess.stdin.write('1+2\n');
  subprocess.stdin.write('console.log(1234)\n');
  subprocess.stdin.write('1+2\n');
  subprocess.stdin.end();

  subprocess.stdout.on('data', (data: Buffer) => {
    // TODO: REVIEW: BUGBUG: can a unicode codepoint be split across
    // two buffers?
    const text = data.toString('utf8');
    console.log(`2: stdout.on("${text}")`);
  });

  subprocess.stderr.on('data', (data: Buffer) => {
    // TODO: REVIEW: BUGBUG: can a unicode codepoint be split across
    // two buffers?
    const text = data.toString('utf8');
    console.log(`6: stderr.on("${text}")`);
  });

  subprocess.on('close', (code: number) => {
    console.log(`3: close(${code})`);
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  subprocess.on('error', err => {
    console.error('5: Failed to start subprocess.');
  });

  console.log('4: go() returns');
}

// Hangs after (4) with no callbacks.
// go('node', [], false);

// Hangs after (4) with no callbacks.
// go('node', [], true);

// Runs: 1-4-2-3
// go('dir', [], true);

// Error: spawn dir ENOENT
// go('dir', [], false);

// 1-4-hang
// go('node.exe', [], false);

// Prints version and exits
// go('node.exe', ['-v'], false);

// 1-4-hang
// go('wsl', [], false);

// 1-4-5-3
// go('foobar', [], false);

go('node', ['-i'], false);
