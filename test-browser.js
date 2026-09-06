const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const errors = [];
  const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);

  // --- Customer: apply for an account ---
  const cust = await (await browser.createBrowserContext()).newPage();
  await cust.setViewport({ width: 1280, height: 900 });
  cust.on('pageerror', (e) => errors.push('cust pageerror: ' + e.message));
  await cust.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle0' });
  await cust.type('#username', 'john');
  await cust.type('#password', 'john123');
  await click(cust, '#loginBtn');
  await cust.waitForNavigation({ waitUntil: 'networkidle0' });
  await cust.waitForSelector('#applyBtn');
  await new Promise((r) => setTimeout(r, 500));

  const accBefore = await cust.evaluate(() => document.querySelectorAll('.account-card').length);
  await cust.select('#newAccType', 'savings');
  await click(cust, '#applyBtn');
  await new Promise((r) => setTimeout(r, 800));
  const applyState = await cust.evaluate(() => ({
    msg: document.getElementById('msg').textContent,
    appRow: document.querySelector('#appsTable tbody tr')?.textContent.replace(/\s+/g, ' ').trim(),
    accountCards: document.querySelectorAll('.account-card').length
  }));
  console.log('after apply:', JSON.stringify(applyState, null, 2));
  console.log('account cards before/after:', accBefore, '/', applyState.accountCards, '(must be equal — no instant creation)');
  await cust.screenshot({ path: '/tmp/apply-done.png' });

  // --- Admin: approve from the panel (separate context so the customer
  // session cookie doesn't trigger the login-page redirect) ---
  const admin = await (await browser.createBrowserContext()).newPage();
  await admin.setViewport({ width: 1280, height: 900 });
  admin.on('pageerror', (e) => errors.push('admin pageerror: ' + e.message));
  await admin.goto('http://localhost:3000/admin-login.html', { waitUntil: 'networkidle0' });
  await admin.type('#username', 'admin');
  await admin.type('#password', 'admin123');
  await click(admin, '#loginBtn');
  await admin.waitForNavigation({ waitUntil: 'networkidle0' });
  await admin.waitForSelector('.tabs button[data-tab="applications"]');
  await new Promise((r) => setTimeout(r, 500));

  await click(admin, '.tabs button[data-tab="applications"]');
  await new Promise((r) => setTimeout(r, 500));
  await admin.waitForSelector('#appsTable tbody tr');
  const pendingRows = await admin.evaluate(() =>
    [...document.querySelectorAll('#appsTable tbody tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()));
  console.log('admin applications tab rows:', JSON.stringify(pendingRows, null, 2));
  await admin.screenshot({ path: '/tmp/admin-apps.png' });

  const hasApprove = await admin.evaluate(() => !!document.querySelector('#appsTable .btn:not([style*="red"])'));
  if (!hasApprove) { console.log('NO APPROVE BUTTON FOUND'); process.exit(1); }
  await admin.evaluate(() => document.querySelector('#appsTable tbody tr .btn').click()); // Approve on first pending row
  await new Promise((r) => setTimeout(r, 1000));
  const afterApprove = await admin.evaluate(() => ({
    msg: document.getElementById('msg').textContent,
    pendingBadge: document.getElementById('pendingBadge').textContent
  }));
  console.log('after approve:', JSON.stringify(afterApprove));
  await admin.screenshot({ path: '/tmp/admin-approved.png' });

  // --- Customer: account appeared ---
  await cust.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  const finalState = await cust.evaluate(() => ({
    accountCards: document.querySelectorAll('.account-card').length,
    appRow: document.querySelector('#appsTable tbody tr')?.textContent.replace(/\s+/g, ' ').trim()
  }));
  console.log('customer after approval:', JSON.stringify(finalState, null, 2));
  console.log('pageerrors:', errors.length ? errors : 'none');

  await browser.close();
})().catch((e) => { console.error('SCRIPT FAILED:', e.message); process.exit(1); });
