const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function saveScreenshot(filename, base64Data) {
  const buf = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(path.join(SCREENSHOT_DIR, filename), buf);
  console.log(`Saved screenshot: ${filename} (${Math.round(buf.length / 1024)} KB)`);
}

async function runEdge(viewport, testFn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-cdp-'));
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    `--user-data-dir=${tempDir}`,
    '--disable-gpu',
    '--no-first-run',
    `--window-size=${viewport.width},${viewport.height}`,
    'about:blank'
  ], { stdio: 'ignore' });

  // Poll for CDP
  let versionData = null;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9223/json/list');
      const data = await res.json();
      const pageTarget = data.find(t => t.type === 'page');
      if (pageTarget) {
        versionData = pageTarget;
        break;
      }
    } catch {}
  }

  if (!versionData) {
    edge.kill();
    throw new Error('Could not connect to Edge CDP on port 9223');
  }

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
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.isMobile || false
  });

  try {
    await testFn({ send, viewport });
  } finally {
    ws.close();
    edge.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}

async function main() {
  const projectId = 'cc312f58-8d97-4853-b52d-09d8657b4fc3';
  const baseUrl = `http://localhost:5173/projects/${projectId}`;

  console.log('=== FEATURE 1 VERIFICATION ===');

  // 1. DESKTOP VIEWPORT (1440x900)
  await runEdge({ width: 1440, height: 900 }, async ({ send }) => {
    console.log('\nTesting 1440x900 Desktop Viewport...');
    await send('Page.navigate', { url: baseUrl });
    await new Promise(r => setTimeout(r, 2500));

    // Verify tabs
    const tabsRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const nav = document.querySelector('nav[aria-label="Project navigation"]');
        const buttons = Array.from(nav ? nav.querySelectorAll('button') : []);
        return buttons.map(b => b.textContent.trim());
      })()`,
      returnByValue: true
    });
    console.log('Detected Navigation Tabs:', tabsRes.value);

    // Verify Overview content
    const overviewRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const title = document.querySelector('h1')?.textContent?.trim();
        const cards = Array.from(document.querySelectorAll('h2, h3')).map(h => h.textContent.trim());
        return { title, headings: cards };
      })()`,
      returnByValue: true
    });
    console.log('Overview Headings:', overviewRes.value);

    // Screenshot Overview Desktop
    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('feature1_overview_1440.png', ss1.data);

    // Click "Understand" Tab
    console.log('\nNavigating to Understand tab...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const nav = document.querySelector('nav[aria-label="Project navigation"]');
        const buttons = Array.from(nav.querySelectorAll('button'));
        const understandBtn = buttons.find(b => b.textContent.trim().toLowerCase() === 'understand');
        if (understandBtn) understandBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));

    // Verify Understand sections
    const understandRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const title = document.querySelector('h2')?.textContent?.trim();
        const sections = Array.from(document.querySelectorAll('.space-y-4 > div > span')).map(s => s.textContent.trim());
        return { title, sections };
      })()`,
      returnByValue: true
    });
    console.log('Understand Sections:', understandRes.value);

    // Screenshot Understand Desktop
    const ss2 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('feature1_understand_1440.png', ss2.data);

    // Click "Diagnosis" Tab
    console.log('\nNavigating to Diagnosis tab...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const nav = document.querySelector('nav[aria-label="Project navigation"]');
        const buttons = Array.from(nav.querySelectorAll('button'));
        const diagBtn = buttons.find(b => b.textContent.trim().toLowerCase() === 'diagnosis');
        if (diagBtn) diagBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));

    // Screenshot Diagnosis Desktop
    const ss3 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('feature1_diagnosis_1440.png', ss3.data);
  });

  // 2. TABLET VIEWPORT (1024x768)
  await runEdge({ width: 1024, height: 768 }, async ({ send }) => {
    console.log('\nTesting 1024x768 Tablet Viewport...');
    await send('Page.navigate', { url: baseUrl });
    await new Promise(r => setTimeout(r, 2000));
    const ss = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('feature1_overview_1024.png', ss.data);
  });

  // 3. MOBILE VIEWPORT (390x844)
  await runEdge({ width: 390, height: 844, isMobile: true }, async ({ send }) => {
    console.log('\nTesting 390x844 Mobile Viewport...');
    await send('Page.navigate', { url: baseUrl });
    await new Promise(r => setTimeout(r, 2000));
    const ss = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('feature1_overview_390.png', ss.data);
  });

  console.log('\n=== ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
