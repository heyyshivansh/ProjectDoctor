const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-fix-'));
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:5173/projects/cc312f58-8d97-4853-b52d-09d8657b4fc3' });
  await new Promise(r => setTimeout(r, 2500));

  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 1200)' });
  await new Promise(r => setTimeout(r, 200));

  const before = await send('Runtime.evaluate', {
    expression: '(() => { const st = window.ScrollTrigger.getAll().find(s => s.pin); return { stageTop: Math.round(st.pin.getBoundingClientRect().top), stageTransform: st.pin.style.transform }; })()',
    returnByValue: true
  });
  console.log('BEFORE:', before.result.value);

  await send('Runtime.evaluate', {
    expression: '(() => { const st = window.ScrollTrigger.getAll().find(s => s.pin); st.pin.style.transform = "none"; })()'
  });

  const after = await send('Runtime.evaluate', {
    expression: '(() => { const st = window.ScrollTrigger.getAll().find(s => s.pin); const card1 = document.querySelectorAll(".spatial-deck-card")[1]; return { stageTop: Math.round(st.pin.getBoundingClientRect().top), card1Top: Math.round(card1.getBoundingClientRect().top), card1Opacity: card1.style.opacity }; })()',
    returnByValue: true
  });
  console.log('AFTER:', after.result.value);

  // Take a test screenshot
  const pic = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\Lenovo\\Desktop\\ProjectDoctor\\screenshots\\test_after_cleared.png', Buffer.from(pic.data, 'base64'));
  console.log('Saved test screenshot!');

  ws.close();
  edge.kill();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
