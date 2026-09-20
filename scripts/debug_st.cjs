const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-st-'));
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
  await send('Runtime.enable');
  
  // Wait until cards are rendered in DOM
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 200));
    const cardCount = await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('[id^="finding-"]').length`
    });
    if (cardCount.result.value > 0) {
      console.log(`Cards loaded: ${cardCount.result.value}`);
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));

  for (const offset of [0, 400, 700, 1000, 1200, 1500, 1800, 2200]) {
    await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${offset})` });
    await new Promise(r => setTimeout(r, 250));
    const pos = await send('Runtime.evaluate', {
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('[id^="finding-"]'));
        const deckWrapper = cards[0]?.parentElement;
        const stage = deckWrapper?.parentElement;
        const pinSpacer = stage?.parentElement?.classList?.contains('pin-spacer') ? stage.parentElement : null;
        return {
          scroll: window.scrollY,
          pinSpacer: pinSpacer ? {
            top: Math.round(pinSpacer.getBoundingClientRect().top),
            height: Math.round(pinSpacer.getBoundingClientRect().height)
          } : null,
          stage: stage ? {
            top: Math.round(stage.getBoundingClientRect().top),
            height: Math.round(stage.getBoundingClientRect().height)
          } : null,
          cards: cards.map((c, i) => ({
            i,
            opacity: window.getComputedStyle(c).opacity,
            visibility: window.getComputedStyle(c).visibility,
            top: Math.round(c.getBoundingClientRect().top),
            bottom: Math.round(c.getBoundingClientRect().bottom),
            height: Math.round(c.getBoundingClientRect().height),
            transform: window.getComputedStyle(c).transform
          }))
        };
      })()`,
      returnByValue: true
    });
    console.log(`--- Offset ${offset} ---`);
    console.log(JSON.stringify(pos.result.value, null, 2));
  }

  ws.close();
  edge.kill();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
