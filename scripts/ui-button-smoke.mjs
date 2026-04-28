import { chromium } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getButtonName = async (button, index) => {
  const inner = (await button.innerText().catch(() => '')).trim();
  if (inner) return inner;
  const aria = ((await button.getAttribute('aria-label').catch(() => '')) || '').trim();
  if (aria) return aria;
  const title = ((await button.getAttribute('title').catch(() => '')) || '').trim();
  if (title) return title;
  return `__icon_${index}`;
};

const getLeftNavButtons = async (page) => {
  const buttons = page.getByRole('button');
  const count = await buttons.count();
  const refs = [];
  for (let i = 0; i < count; i += 1) {
    const el = buttons.nth(i);
    if (!(await el.isVisible())) continue;
    const box = await el.boundingBox();
    if (!box || box.x > 260 || box.width < 24 || box.height < 20) continue;
    const text = await getButtonName(el, i);
    if (!text) continue;
    refs.push({ text, index: i });
  }
  return refs;
};

const safeClick = async (button) => {
  try {
    await button.scrollIntoViewIfNeeded();
  } catch {
  }
  try {
    await button.click({ timeout: 2500 });
    return true;
  } catch {
  }
  try {
    await button.click({ timeout: 2500, force: true });
    return true;
  } catch {
  }
  const box = await button.boundingBox().catch(() => null);
  if (box) {
    try {
      await button.page().mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      return true;
    } catch {
    }
  }
  return false;
};

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);
  const pageErrors = [];
  const clickErrors = [];
  const clicked = new Set();

  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('dialog', async (dialog) => {
    await dialog.dismiss();
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await sleep(500);
  const initialNavCount = (await getLeftNavButtons(page)).length;

  for (let navIndex = 0; ; navIndex += 1) {
    const currentNavs = await getLeftNavButtons(page);
    if (navIndex >= currentNavs.length) break;
    const nav = currentNavs[navIndex];
    try {
      const navButton = page.getByRole('button').nth(nav.index);
      const navClicked = await safeClick(navButton);
      if (!navClicked) throw new Error('nav click failed');
      await sleep(450);
      const buttons = page.getByRole('button');
      const count = await buttons.count();
      for (let i = 0; i < count; i += 1) {
        const btn = buttons.nth(i);
        if (!(await btn.isVisible())) continue;
        const name = await getButtonName(btn, i);
        const key = `${nav.text}::${name}`;
        if (clicked.has(key)) continue;
        clicked.add(key);
        const clickedOk = await safeClick(btn);
        if (!clickedOk) {
          clickErrors.push(`${nav.text} -> ${name}`);
        }
        await sleep(120);
      }
    } catch (error) {
      clickErrors.push(`${nav.text} -> 导航失败`);
    }
  }

  await browser.close();
  console.log(JSON.stringify({
    ok: pageErrors.length === 0 && clickErrors.length === 0,
    navCount: initialNavCount,
    clickedButtons: clicked.size,
    pageErrors,
    clickErrors
  }));
  if (pageErrors.length > 0 || clickErrors.length > 0) process.exit(1);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
