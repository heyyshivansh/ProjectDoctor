const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-anc-'));
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1440,900',
    'http://localhost:5173/projects/cc312f58-8d97-4853-b52d-09d8657b4fc3'
  ], { stdio: 'ignore' });

  await new Promise(r => setTimeout(r, 2500));
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const data = await res.json();
  const page = data.find(t => t.type === 'page' && t.url.includes('5173'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const curId = id++;
    const handler = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === curId) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });
  await new Promise(r => ws.addEventListener('open', r));
  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 2000));

  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 1200)' });
  await new Promise(r => setTimeout(r, 500));

  const check = await send('Runtime.evaluate', {
    expression: `(() => {
      const card = document.querySelector('[id^="finding-"]');
      let el = card;
      const ancestors = [];
      while (el && el !== document.documentElement) {
        const cs = window.getComputedStyle(el);
        ancestors.push({
          tag: el.tagName,
          id: el.id,
          className: el.className,
          position: cs.position,
          transform: cs.transform,
          filter: cs.filter,
          top: Math.round(el.getBoundingClientRect().top)
        });
        el = el.parentElement;
      }
      return ancestors;
    })()`,
    returnByValue: true
  });
  console.log(JSON.stringify(check.result.value, null, 2));

  ws.close();
  edge.kill();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
