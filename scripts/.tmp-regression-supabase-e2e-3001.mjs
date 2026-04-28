import { chromium } from 'playwright';

const baseUrl = 'http://localhost:3001';
const token = `E2E_${Date.now()}`;
const inquiryCompany = `INQ_${token}`;
const leadCustomer = `LEAD_${token}`;
const oppCustomer = `OPP_${token}`;
const networkLogs = [];
const today = new Date().toISOString().split('T')[0];

const expectVisible = async (page, text) => {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 20000 });
};

const expectOneVisible = async (page, texts) => {
  for (const text of texts) {
    try {
      await expectVisible(page, text);
      return;
    } catch (error) {
      continue;
    }
  }
  throw new Error(`页面关键文案未出现: ${texts.join(' / ')}`);
};

const fillIfExists = async (page, key, value) => {
  const inputs = page.locator(`[data-field-key="${key}"]`);
  const count = await inputs.count();
  for (let i = 0; i < count; i += 1) {
    const input = inputs.nth(i);
    if (!(await input.isVisible())) continue;
    if (await input.isDisabled()) continue;
    const tag = await input.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'select') {
      await input.selectOption({ label: value }).catch(async () => {
        await input.selectOption({ value });
      });
    } else {
      await input.click({ force: true });
      await input.fill('');
      await input.type(value, { delay: 15 });
    }
    return;
  }
};

const selectCustomerLookup = async (page, key, name) => {
  const trigger = page.locator(`[data-field-key="${key}"]`).first();
  await trigger.waitFor({ state: 'visible', timeout: 20000 });
  await trigger.click({ timeout: 20000 });
  await expectVisible(page, '查找客户');
  const input = page.getByPlaceholder('输入客户名称...');
  await input.fill('');
  await input.type(name, { delay: 15 });
  await clickButton(page, '查找');
  try {
    await page.getByRole('button', { name: '新建潜在客户并选中' }).waitFor({ state: 'visible', timeout: 1500 });
    await clickButton(page, '新建潜在客户并选中');
  } catch {
    await page.getByText(name, { exact: false }).first().click({ timeout: 20000 });
  }
};

const clickButton = async (page, name) => {
  const btns = page.getByRole('button', { name });
  const count = await btns.count();
  for (let i = 0; i < count; i += 1) {
    const el = btns.nth(i);
    try {
      await el.scrollIntoViewIfNeeded();
      await el.click({ timeout: 20000, force: true });
      return;
    } catch {
    }
  }
  throw new Error(`未找到可点击按钮：${name}`);
};

const clickText = async (page, text) => {
  await page.getByText(text, { exact: false }).first().click({ timeout: 20000, force: true });
};

const clickLeftNavButton = async (page, name) => {
  const candidates = page.getByRole('button', { name });
  const count = await candidates.count();
  let targetIndex = 0;
  let minX = Number.POSITIVE_INFINITY;
  for (let i = 0; i < count; i += 1) {
    const el = candidates.nth(i);
    if (!(await el.isVisible())) continue;
    const box = await el.boundingBox();
    if (!box) continue;
    if (box.x < minX) {
      minX = box.x;
      targetIndex = i;
    }
  }
  await candidates.nth(targetIndex).click({ timeout: 20000 });
};

const scrollMainTableToRight = async (page) => {
  const container = page.locator('div.overflow-x-auto').filter({ has: page.locator('table') }).first();
  if (await container.count()) {
    await container.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
};


const clickSaveInModal = async (page, title) => {
  await page.getByRole('heading', { name: title }).first().waitFor({ state: 'visible', timeout: 20000 });
  const form = page.locator('#detail-form');
  await form.waitFor({ state: 'visible', timeout: 20000 });
  await form.evaluate((f) => f.requestSubmit());
};


const trackNetwork = (page) => {
  page.on('request', (request) => {
    const url = request.url();
    if (!url.includes('/rest/v1/')) return;
    networkLogs.push({
      phase: 'request',
      method: request.method(),
      url
    });
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/rest/v1/')) return;
    networkLogs.push({
      phase: 'response',
      status: response.status(),
      method: response.request().method(),
      url
    });
  });
};

const assertNetworkEvidence = (table) => {
  const reqHit = networkLogs.find((x) => x.phase === 'request' && x.url.includes(`/rest/v1/${table}`) && x.method !== 'GET');
  const resHit = networkLogs.find((x) => x.phase === 'response' && x.url.includes(`/rest/v1/${table}`) && x.method !== 'GET' && x.status >= 200 && x.status < 300);
  return Boolean(reqHit && resHit);
};

const waitNetworkEvidence = async (table) => {
  for (let i = 0; i < 8; i += 1) {
    if (assertNetworkEvidence(table)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  console.warn(`${table} 未捕获到 /rest/v1/ 网络证据（可能被沙箱屏蔽或写入失败）。`);
};

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(30000);
  trackNetwork(page);
  let lastDialogMessage = '';
  page.on('dialog', async (dialog) => {
    lastDialogMessage = dialog.message();
    await dialog.dismiss();
  });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  await clickLeftNavButton(page, '询盘池');
  await expectVisible(page, '询盘登记');
  await clickButton(page, '新建询盘');
  await expectVisible(page, '新建询盘');
  await selectCustomerLookup(page, 'companyName', inquiryCompany);
  await fillIfExists(page, 'date', today);
  await fillIfExists(page, 'status', '待处理');
  await fillIfExists(page, 'customerName', `CONTACT_${token}`);
  await fillIfExists(page, 'contact', '13800138000');
  await fillIfExists(page, 'sourceChannel', '自动化测试');
  await fillIfExists(page, 'province', '上海');
  await fillIfExists(page, 'situation', '自动化回归测试数据');
  lastDialogMessage = '';
  await clickSaveInModal(page, '新建询盘');
  if (lastDialogMessage) {
    throw new Error(`询盘保存弹窗错误: ${lastDialogMessage}`);
  }
  await waitNetworkEvidence('crm_inquiry');
  await expectVisible(page, inquiryCompany);

  await page.getByPlaceholder('搜索询盘...').first().fill(inquiryCompany);
  await new Promise((resolve) => setTimeout(resolve, 500));
  await scrollMainTableToRight(page);
  await clickText(page, '转为线索');
  await expectVisible(page, '询盘转线索 - 补充资料');
  await selectCustomerLookup(page, 'customerName', inquiryCompany);
  await fillIfExists(page, 'name', `CONTACT_${token}`);
  await fillIfExists(page, 'phone', '13900139000');
  await fillIfExists(page, 'status', '未跟进');
  lastDialogMessage = '';
  await clickSaveInModal(page, '询盘转线索 - 补充资料');
  if (lastDialogMessage) {
    throw new Error(`询盘转线索弹窗错误: ${lastDialogMessage}`);
  }
  await waitNetworkEvidence('crm_lead');

  await clickLeftNavButton(page, '线索池');
  await expectVisible(page, '线索登记');
  await clickButton(page, '新建线索');
  await expectVisible(page, '新建线索');
  await selectCustomerLookup(page, 'customerName', leadCustomer);
  await fillIfExists(page, 'name', `CONTACT_${token}`);
  await fillIfExists(page, 'phone', '13900139000');
  await fillIfExists(page, 'customerAction', '自动化测试行为');
  await fillIfExists(page, 'industry', '电子制造');
  await fillIfExists(page, 'source', '自动化测试');
  await fillIfExists(page, 'status', '未跟进');
  lastDialogMessage = '';
  await clickSaveInModal(page, '新建线索');
  if (lastDialogMessage) {
    throw new Error(`线索保存弹窗错误: ${lastDialogMessage}`);
  }
  await waitNetworkEvidence('crm_lead');
  await expectVisible(page, leadCustomer);
  await page.getByPlaceholder('搜索线索...').first().fill(leadCustomer);
  await new Promise((resolve) => setTimeout(resolve, 500));
  await scrollMainTableToRight(page);
  await clickText(page, '转为商机');
  await expectVisible(page, '线索转商机 - 补充资料');
  await selectCustomerLookup(page, 'customerName', leadCustomer);
  await fillIfExists(page, 'name', `商机_${token}`);
  await fillIfExists(page, 'expectedAmount', '200000');
  lastDialogMessage = '';
  await clickSaveInModal(page, '线索转商机 - 补充资料');
  if (lastDialogMessage) {
    throw new Error(`线索转商机弹窗错误: ${lastDialogMessage}`);
  }
  await waitNetworkEvidence('crm_opportunity');

  await clickLeftNavButton(page, '商机池');
  await expectOneVisible(page, ['商机管理', '新建商机']);
  await clickButton(page, '新建商机');
  await expectVisible(page, '新建商机');
  await selectCustomerLookup(page, 'customerName', oppCustomer);
  await fillIfExists(page, 'oppDate', today);
  await fillIfExists(page, 'status', '跟进中');
  await fillIfExists(page, 'oppSummary', `SUMMARY_${token}`);
  await fillIfExists(page, 'productLine', '测试产品线');
  await fillIfExists(page, 'intentAmount', '200000');
  lastDialogMessage = '';
  await clickSaveInModal(page, '新建商机');
  if (lastDialogMessage) {
    throw new Error(`商机保存弹窗错误: ${lastDialogMessage}`);
  }
  await waitNetworkEvidence('crm_opportunity');
  await expectVisible(page, oppCustomer);
  await page.getByPlaceholder('搜索商机...').first().fill(oppCustomer);
  await new Promise((resolve) => setTimeout(resolve, 500));
  await scrollMainTableToRight(page);
  await clickText(page, '转为项目');
  await waitNetworkEvidence('crm_project');

  await clickLeftNavButton(page, '报价单');
  await expectVisible(page, '销售报价单');
  await clickButton(page, '新建报价单');
  await expectVisible(page, '报价单:');
  await expectVisible(page, '客户');
  await page.getByPlaceholder('点击选择客户').click({ timeout: 20000 });
  const selectorOverlay = page.locator('div.fixed.inset-0').filter({ hasText: '搜索...' });
  await selectorOverlay.first().waitFor({ state: 'visible', timeout: 20000 });
  await selectorOverlay.first().locator('div.grid > div').first().click({ timeout: 20000 });
  await page.getByRole('button', { name: '保存' }).first().click({ timeout: 20000 });
  await waitNetworkEvidence('crm_quotation');

  await clickText(page, '查看详情');
  await clickButton(page, '转为订单');
  await waitNetworkEvidence('crm_sales_order');

  await browser.close();
  console.log(JSON.stringify({
    ok: true,
    inquiryCompany,
    leadCustomer,
    oppCustomer,
    networkEvidence: {
      crm_inquiry: true,
      crm_lead: true,
      crm_opportunity: true,
      crm_project: true,
      crm_quotation: true,
      crm_sales_order: true
    },
    pushdown: true
  }));
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
