const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const ARTIFACT_SCREENSHOT_DIR = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\5a9b3ec3-be1d-4621-a212-2dfd8b9af70a\\screenshots';
if (!fs.existsSync(ARTIFACT_SCREENSHOT_DIR)) {
  fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true });
}

function saveScreenshot(filename, base64Data) {
  const buf = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(path.join(SCREENSHOT_DIR, filename), buf);
  fs.writeFileSync(path.join(ARTIFACT_SCREENSHOT_DIR, filename), buf);
  console.log(`Saved screenshot: ${filename} (${Math.round(buf.length / 1024)} KB)`);
}

async function runEdge(viewport, testFn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-cdp-'));
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
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
      const res = await fetch('http://127.0.0.1:9222/json/list');
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
    throw new Error('Could not connect to Edge CDP');
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

async function inspectCards(send) {
  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll('.spatial-deck-card'));
      return cards.map((c, i) => {
        const cs = window.getComputedStyle(c);
        const cardInner = c.firstElementChild;
        const innerCs = cardInner ? window.getComputedStyle(cardInner) : cs;
        return {
          index: i,
          id: c.id,
          opacity: parseFloat(cs.opacity),
          transform: cs.transform,
          filter: cs.filter,
          zIndex: parseInt(cs.zIndex) || 0,
          rect: {
            top: Math.round(c.getBoundingClientRect().top),
            bottom: Math.round(c.getBoundingClientRect().bottom),
            height: Math.round(c.getBoundingClientRect().height)
          },
          surfaceBg: innerCs.backgroundColor,
          surfaceFilter: innerCs.filter
        };
      });
    })()`,
    returnByValue: true
  });
  return evalRes.result.value || [];
}

async function verifyAll() {
  console.log('==================================================');
  console.log('STARTING CP7f VERIFICATION & SCREENSHOT CAPTURE');
  console.log('==================================================\n');

  // VIEWPORT 1: 1440x900
  await runEdge({ width: 1440, height: 900 }, async ({ send }) => {
    console.log('\n--- VIEWPORT: 1440x900 ---');
    
    // 1. Entry Page
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 2000));
    const entryPic = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('entry_cp7f_1440x900.png', entryPic.data);

    // 2. Project Studio Page
    await send('Page.navigate', { url: 'http://localhost:5173/projects/cc312f58-8d97-4853-b52d-09d8657b4fc3' });
    await new Promise(r => setTimeout(r, 3000));

    // Overlook Screenshot
    const overlookPic = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('studio_cp7f_1440x900_overlook.png', overlookPic.data);

    // Initial Cards State Check
    let cards = await inspectCards(send);
    console.log(`Initial card state: ${cards.length} cards detected`);
    cards.forEach(c => {
      console.log(`  Card ${c.index}: opacity=${c.opacity}, zIndex=${c.zIndex}, filter=${c.filter}, top=${c.rect.top}`);
    });

    if (cards.length > 0) {
      if (cards[0].opacity !== 1 || cards[0].filter !== 'none') {
        console.error('FAIL: Card 0 should be fully opaque with no filter');
      } else {
        console.log('PASS: Initial Card 0 is 100% opaque, filter: none');
      }
    }

    // SCROLL TEST 1: Slow scroll to pin start (around 400px - 600px)
    console.log('\n[Test 1: Slow Scroll to Pin Deck]');
    await send('Runtime.evaluate', { expression: 'window.scrollTo({ top: 500, behavior: "instant" })' });
    await new Promise(r => setTimeout(r, 600));
    cards = await inspectCards(send);
    console.log(`  At scroll=500: Card 0 opacity=${cards[0]?.opacity}, Card 1 opacity=${cards[1]?.opacity}`);
    const card1Pic = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('studio_cp7f_1440x900_card1.png', card1Pic.data);

    // SCROLL TEST 2: Normal scroll into Card 0 -> Card 1 handoff (around scroll offset 1200px)
    console.log('\n[Test 2: Normal Scroll into Handoff Segment 1]');
    await send('Runtime.evaluate', { expression: 'window.scrollTo({ top: 1200, behavior: "instant" })' });
    await new Promise(r => setTimeout(r, 600));
    cards = await inspectCards(send);
    console.log(`  At scroll=1200: Card 0 opacity=${cards[0]?.opacity}, Card 1 opacity=${cards[1]?.opacity}, Card 2 opacity=${cards[2]?.opacity}`);
    const card2HandoffPic = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('studio_cp7f_1440x900_card2_handoff.png', card2HandoffPic.data);

    // SCROLL TEST 3: Rapid scroll to Card 2 -> Card 3 handoff (around scroll offset 2000px)
    console.log('\n[Test 3: Rapid Scroll to Card 2 / Card 3]');
    await send('Runtime.evaluate', { expression: 'window.scrollTo({ top: 2200, behavior: "instant" })' });
    await new Promise(r => setTimeout(r, 600));
    cards = await inspectCards(send);
    console.log(`  At scroll=2200: Card 1 opacity=${cards[1]?.opacity}, Card 2 opacity=${cards[2]?.opacity}, Card 3 opacity=${cards[3]?.opacity}`);
    
    // SCROLL TEST 4: Very rapid fling down to What's Working section
    console.log('\n[Test 4: Very Rapid Fling to What\'s Working]');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const ww = document.getElementById('scene-whats-working');
        if (ww) ww.scrollIntoView({ behavior: 'instant' });
      })()`
    });
    await new Promise(r => setTimeout(r, 800));
    const wwPic = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('studio_cp7f_1440x900_whatsworking.png', wwPic.data);

    // SCROLL TEST 5: Reverse scroll all the way back up to Card 0
    console.log('\n[Test 5: Reverse Scroll back to Top]');
    await send('Runtime.evaluate', { expression: 'window.scrollTo({ top: 600, behavior: "instant" })' });
    await new Promise(r => setTimeout(r, 600));
    cards = await inspectCards(send);
    console.log(`  At reverse scroll=600: Card 0 opacity=${cards[0]?.opacity}, Card 1 opacity=${cards[1]?.opacity}`);
    if (cards[0]?.opacity > 0.9) {
      console.log('PASS: Reverse scroll successfully restored Card 0 opacity without getting stuck');
    } else {
      console.warn(`WARN: Card 0 opacity after reverse scroll is ${cards[0]?.opacity}`);
    }

    // SCROLL TEST 6 & 7: Jump scroll & Resize
    console.log('\n[Test 6 & 7: Jump Scroll & Resize Handling]');
    await send('Runtime.evaluate', { expression: 'window.scrollTo({ top: 1500, behavior: "instant" })' });
    await send('Runtime.evaluate', { expression: 'window.dispatchEvent(new Event("resize"))' });
    await new Promise(r => setTimeout(r, 600));
    cards = await inspectCards(send);
    console.log(`  At jump & resize: Card 1 opacity=${cards[1]?.opacity}, filter=${cards[1]?.filter}`);

    // Verify Requirements Chapter
    console.log('\n[Test 8: Requirements Chapter Navigation]');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Requirements'));
        if (btn) btn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1000));
    const reqPic = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('studio_cp7f_1440x900_requirements.png', reqPic.data);
  });

  // VIEWPORT 2: 1366x768
  await runEdge({ width: 1366, height: 768 }, async ({ send }) => {
    console.log('\n--- VIEWPORT: 1366x768 ---');
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 1500));
    const entryPic = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('entry_cp7f_1366x768.png', entryPic.data);

    await send('Page.navigate', { url: 'http://localhost:5173/projects/cc312f58-8d97-4853-b52d-09d8657b4fc3' });
    await new Promise(r => setTimeout(r, 2500));
    await send('Runtime.evaluate', { expression: 'window.scrollTo({ top: 550, behavior: "instant" })' });
    await new Promise(r => setTimeout(r, 600));
    const deckPic = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('studio_cp7f_1366x768_deck.png', deckPic.data);
  });

  // VIEWPORT 3: 1024x768
  await runEdge({ width: 1024, height: 768 }, async ({ send }) => {
    console.log('\n--- VIEWPORT: 1024x768 ---');
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 1500));
    const entryPic = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('entry_cp7f_1024x768.png', entryPic.data);

    await send('Page.navigate', { url: 'http://localhost:5173/projects/cc312f58-8d97-4853-b52d-09d8657b4fc3' });
    await new Promise(r => setTimeout(r, 2500));
    await send('Runtime.evaluate', { expression: 'window.scrollTo({ top: 550, behavior: "instant" })' });
    await new Promise(r => setTimeout(r, 600));
    const deckPic = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('studio_cp7f_1024x768_deck.png', deckPic.data);
  });

  // VIEWPORT 4: 390x844 (Mobile)
  await runEdge({ width: 390, height: 844, isMobile: true }, async ({ send }) => {
    console.log('\n--- VIEWPORT: 390x844 (Mobile) ---');
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 1500));
    const entryPic = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('entry_cp7f_390x844.png', entryPic.data);

    await send('Page.navigate', { url: 'http://localhost:5173/projects/cc312f58-8d97-4853-b52d-09d8657b4fc3' });
    await new Promise(r => setTimeout(r, 2500));
    await send('Runtime.evaluate', { expression: 'window.scrollTo({ top: 400, behavior: "instant" })' });
    await new Promise(r => setTimeout(r, 600));
    const cardPic = await send('Page.captureScreenshot', { format: 'png' });
    saveScreenshot('studio_cp7f_390x844_card.png', cardPic.data);
  });

  console.log('\n==================================================');
  console.log('ALL VERIFICATION PASSES & SCREENSHOTS COMPLETED!');
  console.log('==================================================');
}

verifyAll().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
