const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-cdp-'));
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1440,900',
    'http://localhost:5173/projects/cc312f58-8d97-4853-b52d-09d8657b4fc3'
  ], { stdio: 'ignore' });

  // Poll for CDP version
  let versionData = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/list');
      const data = await res.json();
      const pageTarget = data.find(t => t.type === 'page' && t.url.includes('localhost:5173'));
      if (pageTarget) {
        versionData = pageTarget;
        break;
      }
    } catch {}
  }

  if (!versionData) {
    console.error('Failed to connect to Edge CDP');
    edge.kill();
    process.exit(1);
  }

  console.log('Connected to Edge CDP target:', versionData.title, versionData.url);
  const ws = new WebSocket(versionData.webSocketDebuggerUrl);

  let id = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const curId = id++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === curId) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  };

  await new Promise(r => ws.addEventListener('open', r));
  console.log('WebSocket connected. Enabling Page and Runtime...');
  await send('Page.enable');
  await send('Runtime.enable');

  // Wait 2.5 seconds for initial render and GSAP initialization
  await new Promise(r => setTimeout(r, 2500));

  // Inspect initial card styles
  const initialStyles = await send('Runtime.evaluate', {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll('.pinned-dossier-card'));
      return cards.map((c, i) => {
        const cs = window.getComputedStyle(c);
        const surface = c.querySelector('[class*="bg-"]') || c;
        const surfaceCs = window.getComputedStyle(surface);
        return {
          index: i,
          id: c.id,
          classes: c.className,
          opacity: cs.opacity,
          transform: cs.transform,
          filter: cs.filter,
          zIndex: cs.zIndex,
          transition: cs.transition,
          surfaceBg: surfaceCs.backgroundColor,
          surfaceFilter: surfaceCs.filter,
          rect: {
            top: c.getBoundingClientRect().top,
            bottom: c.getBoundingClientRect().bottom,
            height: c.getBoundingClientRect().height
          }
        };
      });
    })()`,
    returnByValue: true
  });

  console.log('--- Initial Card Styles (Before Scroll) ---');
  console.log(JSON.stringify(initialStyles.result.value, null, 2));

  // Simulate scroll to 1800px (entering card 1)
  await send('Runtime.evaluate', {
    expression: `window.scrollTo(0, 1800)`
  });
  await new Promise(r => setTimeout(r, 600));

  const at1800Styles = await send('Runtime.evaluate', {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll('.pinned-dossier-card'));
      return cards.map((c, i) => {
        const cs = window.getComputedStyle(c);
        return {
          index: i,
          id: c.id,
          opacity: cs.opacity,
          transform: cs.transform,
          filter: cs.filter,
          zIndex: cs.zIndex,
          transition: cs.transition,
          rect: {
            top: c.getBoundingClientRect().top,
            bottom: c.getBoundingClientRect().bottom,
            height: c.getBoundingClientRect().height
          }
        };
      });
    })()`,
    returnByValue: true
  });

  console.log('--- Scrolled Card Styles (At Scroll Offset 1800px) ---');
  console.log(JSON.stringify(at1800Styles.result.value, null, 2));

  ws.close();
  edge.kill();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
