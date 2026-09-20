const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-pinfix-'));
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
  await send('Page.enable');
  await send('Runtime.enable');

  // Disable scroll restoration before navigation
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'if ("scrollRestoration" in history) { history.scrollRestoration = "manual"; }'
  });

  await send('Page.navigate', { url: 'http://localhost:5173/projects/cc312f58-8d97-4853-b52d-09d8657b4fc3' });
  await new Promise(r => setTimeout(r, 2500));

  const initialCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const allTriggers = window.ScrollTrigger ? window.ScrollTrigger.getAll() : [];
      const st = allTriggers.find(s => s.pin);
      const stage = st ? st.pin : null;
      return {
        totalTriggers: allTriggers.length,
        scrollY: window.scrollY,
        stStart: st ? st.start : null,
        stEnd: st ? st.end : null,
        pinElement: stage ? stage.className : null,
        stageTransform: stage ? window.getComputedStyle(stage).transform : null
      };
    })()`,
    returnByValue: true
  });
  console.log('Initial check:', JSON.stringify(initialCheck.result.value, null, 2));

  for (const offset of [400, 700, 1000, 1200, 1500, 1800, 2200]) {
    await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${offset})` });
    await new Promise(r => setTimeout(r, 200));
    const check = await send('Runtime.evaluate', {
      expression: `(() => {
        const allTriggers = window.ScrollTrigger ? window.ScrollTrigger.getAll() : [];
        const st = allTriggers.find(s => s.pin);
        const stage = st ? st.pin : null;
        const cards = Array.from(document.querySelectorAll('[id^="finding-"]'));
        return {
          offset: ${offset},
          scrollY: window.scrollY,
          progress: st ? st.progress : null,
          stagePosition: stage ? window.getComputedStyle(stage).position : null,
          stageTransform: stage ? window.getComputedStyle(stage).transform : null,
          stageTop: stage ? Math.round(stage.getBoundingClientRect().top) : null,
          cardsTop: cards.map((c, i) => ({
            i,
            top: Math.round(c.getBoundingClientRect().top),
            opacity: window.getComputedStyle(c).opacity,
            visible: window.getComputedStyle(c).visibility
          }))
        };
      })()`,
      returnByValue: true
    });
    console.log(`Offset ${offset}:`, JSON.stringify(check.result.value, null, 2));
  }

  ws.close();
  edge.kill();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
