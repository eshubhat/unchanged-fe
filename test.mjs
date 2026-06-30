import puppeteer from 'puppeteer';
import { exec } from 'child_process';

console.log("Starting Vite server...");
const vite = exec('pnpm run dev', { cwd: process.cwd() });

setTimeout(async () => {
  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER CONSOLE ERROR:', msg.text());
  });
  page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.toString()));
  
  console.log("Navigating to http://localhost:5173 ...");
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  } catch (e) {
    console.log("Navigation error:", e.message);
  }
  
  console.log("Done checking.");
  await browser.close();
  vite.kill();
  process.exit(0);
}, 3000);
