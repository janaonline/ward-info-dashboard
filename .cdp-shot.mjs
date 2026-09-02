// args: outPath, url, width, height, evalExpression (JS to run before screenshot, e.g. click a nav link)
const [outPath, url, wArg, hArg, evalExpr] = process.argv.slice(2);
const w = Number(wArg || 390);
const h = Number(hArg || 4000);
const res = await fetch(`http://localhost:9333/json/new?about:blank`, { method: 'PUT' });
const target = await res.json();
const ws = new WebSocket(target.webSocketDebuggerUrl);

await new Promise((resolve, reject) => {
  ws.addEventListener('open', () => resolve());
  ws.addEventListener('error', reject);
});

let idc = 1;
function call(method, params) {
  return new Promise((resolve) => {
    const id = idc++;
    const handler = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const logs = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    logs.push(msg.params.args.map(a => a.value || a.description).join(' '));
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    logs.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails.exception));
  }
});

await call('Page.enable');
await call('Runtime.enable');
await call('Network.enable');
await call('Network.setCacheDisabled', { cacheDisabled: true });
await call('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
await call('Page.navigate', { url });
await new Promise(r => setTimeout(r, 6000));

if (evalExpr) {
  await call('Runtime.evaluate', { expression: evalExpr });
  await new Promise(r => setTimeout(r, 2500));
}

const shot = await call('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
const fs = await import('fs');
fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
console.error('CONSOLE_ERRORS:', JSON.stringify(logs));
process.exit(0);
