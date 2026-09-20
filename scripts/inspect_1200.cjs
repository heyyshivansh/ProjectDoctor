const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-inspect-'));
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1440,900',
    'about:blank'
  ], { stdio: 'ignore' });

  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const data = await res.json();
  const page = data.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const curId = id++;
    const handler = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === curId) {
        ws.removeEventListener('message', handler);
        resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });
  await new Promise(r => ws.addEventListener('open', r));
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  await send('Page.navigate', { url: 'http://localhost:5173/projects/cc312f58-8d97-4853-b52d-09d8657b4fc3' });
  await new Promise(r => setTimeout(r, 3000));

  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 1200)' });
  await new Promise(r => setTimeout(r, 500));

  const result = await send('Runtime.evaluate', {
    expression: `(() => {
      const card = document.querySelector('.spatial-deck-card');
      let el = card;
      const chain = [];
      while (el && el !== document.body) {
        const r = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        chain.push({
          tag: el.tagName,
          id: el.id,
          class: el.className,
          top: Math.round(r.top),
          height: Math.round(r.height),
          pos: cs.position,
          styleTop: cs.top,
          transform: cs.transform
        });
        el = el.parentElement;
      }
      return chain;
    })()`,
    returnByValue: true
  });

  console.log('Ancestor chain at scroll 1200:', JSON.stringify(result.result.value, null, 2));

  ws.close();
  edge.kill();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
