import { spawn } from 'node:child_process';

const CODEX_TIMEOUT_MS = 90_000;

interface RunContactCodexInput {
  arguments_: string[];
  prompt: string;
  task: string;
}

export const runContactCodex = async ({
  arguments_,
  prompt,
  task,
}: RunContactCodexInput) =>
  await new Promise<string>((resolve, reject) => {
    const child = spawn('/usr/local/bin/codex', arguments_, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Codex contact ${task} timed out`));
    }, CODEX_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(Buffer.concat(stdout).toString('utf8'));
        return;
      }
      reject(
        new Error(
          `Codex contact ${task} exited ${code}: ${Buffer.concat(stderr).toString('utf8').slice(0, 500)}`
        )
      );
    });
    child.stdin.end(prompt);
  });
