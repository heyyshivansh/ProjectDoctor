const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'screenshots');
const ARTIFACT_DIR = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\6d33bee5-aaa9-49df-8e5c-be0a979c2de7';

function saveScreenshot(filename, base64Data) {
  const buf = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(path.join(SCREENSHOT_DIR, filename), buf);
  if (fs.existsSync(ARTIFACT_DIR)) {
    fs.writeFileSync(path.join(ARTIFACT_DIR, filename), buf);
  }
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

  console.log('=== VERIFYING UNDERSTAND UI (AUDIENCE & CAPABILITIES) ===');

  await runEdge({ width: 1440, height: 900 }, async ({ send }) => {
    console.log('\n1. Navigating to project detail page...');
    await send('Page.navigate', { url: baseUrl });
    await new Promise(r => setTimeout(r, 2500));

    console.log('2. Inspecting header outerHTML...');
    const headerHtml = await send('Runtime.evaluate', {
      expression: `(() => {
        const header = document.querySelector('header');
        return header ? header.outerHTML : 'no header';
      })()`,
      returnByValue: true
    });
    console.log('Header HTML snippet:', (headerHtml.result?.value || '').slice(0, 500));

    console.log('Clicking Understand tab...');
    const clickResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const understandBtn = buttons.find(b => b.textContent.trim().toUpperCase() === 'UNDERSTAND');
        if (!understandBtn) return 'not found';
        understandBtn.click();
        return 'clicked: ' + understandBtn.textContent.trim();
      })()`,
      returnByValue: true
    });
    console.log('Click result:', clickResult.result ? clickResult.result.value : clickResult);
    await new Promise(r => setTimeout(r, 2000));

    // Check Audience Scene
    console.log('3. Inspecting Audience scene (Scene 01)...');
    const audienceData = await send('Runtime.evaluate', {
      expression: `(() => {
        const personas = Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim());
        const spans = Array.from(document.querySelectorAll('span')).map(s => s.textContent.trim());
        const countText = spans.find(s => s.includes('identified personas'));
        return { countText, personas };
      })()`,
      returnByValue: true
    });
    console.log('Audience Data:', audienceData.result ? audienceData.result.value : audienceData);

    const ssAudience = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('understand_audience_live.png', ssAudience.data);

    // Switch to Capabilities Scene
    console.log('\n4. Switching to Capabilities scene (Scene 02)...');
    const capClickResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const nav = document.querySelector('nav[aria-label="Understanding scene navigation"]');
        if (!nav) return 'no scene nav';
        const buttons = Array.from(nav.querySelectorAll('button'));
        const capBtn = buttons.find(b => b.textContent.includes('Capabilities'));
        if (!capBtn) return 'no cap button';
        capBtn.click();
        return 'clicked capabilities';
      })()`,
      returnByValue: true
    });
    console.log('Cap click result:', capClickResult.result ? capClickResult.result.value : capClickResult);
    await new Promise(r => setTimeout(r, 2000));

    // Inspect Capabilities Scene
    const capData = await send('Runtime.evaluate', {
      expression: `(() => {
        const spans = Array.from(document.querySelectorAll('span')).map(s => s.textContent.trim());
        const countText = spans.find(s => s.includes('core capabilities'));
        const capabilities = Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim());
        return { countText, capabilities };
      })()`,
      returnByValue: true
    });
    console.log('Capabilities Data:', capData.result ? capData.result.value : capData);

    const ssCaps = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('understand_capabilities_live.png', ssCaps.data);
  });

  console.log('\n=== UNDERSTAND UI VERIFICATION COMPLETE ===');
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
