/**
 * Host half of the UI transparency bundle.
 *
 * The Electron window is created opaque, so the only way to see the desktop
 * through it is a whole-window Win32 layered alpha. This process has no
 * Electron access; it owns a tiny PowerShell helper that performs the Win32
 * call and answers the Client half over one exact HTTP route.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROUTE = '/dsh-ui-transparency/alpha';
const IDLE_MS = 5 * 60 * 1000;

export const name = 'ui-transparency';
export const inject = ['webServer'];

export function apply(ctx) {
  const logger = typeof ctx.logger?.warn === 'function' ? ctx.logger : undefined;
  let helper;
  let idle;

  const stopHelper = () => {
    if (idle !== undefined) {
      clearTimeout(idle);
      idle = undefined;
    }
    const running = helper;
    helper = undefined;
    if (running === undefined) return;
    try {
      running.stdin.write('quit\n');
    } catch {
      /* the pipe is already gone */
    }
    const timer = setTimeout(() => {
      try {
        running.kill();
      } catch {
        /* already exited */
      }
    }, 2000);
    timer.unref?.();
  };

  const startHelper = () => {
    const running = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-NoLogo', '-ExecutionPolicy', 'Bypass', '-File', 'helper.ps1'],
      { cwd: HERE, windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] },
    );
    running.on('error', (error) => {
      logger?.warn(error);
      if (helper === running) helper = undefined;
    });
    running.on('exit', () => {
      if (helper === running) helper = undefined;
    });
    running.stdin.on('error', () => {});
    return running;
  };

  const setAlpha = (alpha) => {
    if (helper === undefined) helper = startHelper();
    try {
      helper.stdin.write(`${alpha}\n`);
    } catch {
      helper = undefined;
    }
    if (idle !== undefined) clearTimeout(idle);
    idle = setTimeout(stopHelper, IDLE_MS);
    idle.unref?.();
  };

  const readAlpha = async (request) => {
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 4096) return undefined;
    }
    try {
      const alpha = JSON.parse(body)?.alpha;
      return Number.isInteger(alpha) && alpha >= 0 && alpha <= 255 ? alpha : undefined;
    } catch {
      return undefined;
    }
  };

  const handler = async (request, response) => {
    if (request.method !== 'POST') {
      response.writeHead(405);
      response.end();
      return;
    }
    const alpha = await readAlpha(request);
    if (alpha === undefined) {
      response.writeHead(400, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end('{"ok":false}');
      return;
    }
    setAlpha(alpha);
    response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ ok: true, alpha }));
  };

  ctx.effect(() => {
    const dispose = ctx.webServer.register({ kind: 'exact', path: ROUTE, handler });
    return () => {
      dispose();
      stopHelper();
    };
  });
}
