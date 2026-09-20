const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('http://localhost:3000/login');
  await page.type('input[type=text]', 'admin');
  await page.type('input[type=password]', 'admin');
  await page.click('button[type=submit]');
  await page.waitForNavigation();
  await page.goto('http://localhost:3000/assistant');
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
