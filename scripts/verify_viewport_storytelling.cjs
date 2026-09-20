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
  await send('DOM.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false
  });

  try {
    await testFn({ send, viewport });
  } finally {
    ws.close();
    edge.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}

async function hoverElement(send, selector) {
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('${selector}');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`,
    returnByValue: true
  });
  if (res.value) {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: res.value.x,
      y: res.value.y
    });
    await new Promise(r => setTimeout(r, 400));
  }
}

async function main() {
  const projectId = 'cc312f58-8d97-4853-b52d-09d8657b4fc3';
  const baseUrl = `http://localhost:5173/projects/${projectId}`;

  console.log('=== VIEWPORT-FIRST & HORIZONTAL STORYTELLING VERIFICATION ===');

  // 1. DESKTOP VIEWPORT (1440x900)
  await runEdge({ width: 1440, height: 900 }, async ({ send }) => {
    console.log('\n--- 1440x900 Tests ---');
    await send('Page.navigate', { url: `${baseUrl}?tab=overview` });
    await new Promise(r => setTimeout(r, 2000));

    // 1. Overview default
    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('h_overview_1440.png', ss1.data);

    // 2. Overview hover state (hover first evidence card)
    await hoverElement(send, '.grid > div:first-child');
    const ss2 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('h_overview_hover_1440.png', ss2.data);

    // Reset mouse
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 });

    // 3. Navigate to Understand Tab
    console.log('\nTesting Understand Scenes...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('nav[aria-label="Project navigation"] button'));
        const u = btns.find(b => b.textContent.toLowerCase().includes('understand'));
        if (u) u.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    // 3. Understand Audience Scene default
    const ss3 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('h_understand_audience_1440.png', ss3.data);

    // 4. Understand Audience hover
    await hoverElement(send, 'nav[aria-label="Understanding scene navigation"]');
    await hoverElement(send, '.min-h-\\[380px\\] .grid > div:first-child');
    const ss4 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('h_understand_audience_hover_1440.png', ss4.data);

    // 5. Understand Capabilities Scene (press "2" or click tab)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: '2', code: 'Digit2' });
    await new Promise(r => setTimeout(r, 800));
    const ss5 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('h_understand_capabilities_1440.png', ss5.data);

    // 6. Understand Architecture Scene (press "3" or click tab)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: '3', code: 'Digit3' });
    await new Promise(r => setTimeout(r, 800));
    const ss6 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('h_understand_architecture_1440.png', ss6.data);

    // 7. Understand Technology Scene (press "4" or click tab)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: '4', code: 'Digit4' });
    await new Promise(r => setTimeout(r, 800));
    const ss7 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('h_understand_technology_1440.png', ss7.data);

    // 8. Navigate to Diagnosis Tab
    console.log('\nTesting Diagnosis Workspace...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('nav[aria-label="Project navigation"] button'));
        const d = btns.find(b => b.textContent.toLowerCase().includes('diagnosis'));
        if (d) d.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    // 8. Diagnosis default
    const ss8 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('h_diagnosis_1440.png', ss8.data);

    // 9. Diagnosis hover (hover active finding action button)
    await hoverElement(send, 'button:has(svg)');
    const ss9 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('h_diagnosis_hover_1440.png', ss9.data);

    // 10. What's Working hover state
    await hoverElement(send, 'section[aria-label="Verified Capabilities Showcase"] .grid > div:first-child');
    const ss10 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('h_whats_working_hover_1440.png', ss10.data);
  });

  // 2. LAPTOP VIEWPORT (1280x800)
  await runEdge({ width: 1280, height: 800 }, async ({ send }) => {
    console.log('\n--- 1280x800 Tests ---');
    await send('Page.navigate', { url: `${baseUrl}?tab=understand` });
    await new Promise(r => setTimeout(r, 2000));
    const ss11 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('h_understand_1280.png', ss11.data);
  });

  // 3. ULTRAWIDE VIEWPORT (1920x1080)
  await runEdge({ width: 1920, height: 1080 }, async ({ send }) => {
    console.log('\n--- 1920x1080 Tests ---');
    await send('Page.navigate', { url: `${baseUrl}?tab=understand` });
    await new Promise(r => setTimeout(r, 2000));
    const ss12 = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('h_understand_1920.png', ss12.data);
  });

  console.log('\nAll 12 screenshots captured successfully!');
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
