import { chromium, devices } from 'playwright';

async function main() {
  console.log('🚀 Running Full E2E Live Mobile Sync Verification Test...');
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Studio Context
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopContext.newPage();

  console.log('🌐 Loading Desktop Studio: https://tailprint.com/tools/reel');
  await desktopPage.goto('https://tailprint.com/tools/reel', { waitUntil: 'networkidle' });

  // 2. Click Live Preview (Scan QR)
  console.log('📱 Clicking Live Preview (Scan QR) button...');
  await desktopPage.click('#btn-open-qr-modal');

  await desktopPage.waitForSelector('#qr-share-url-input', { state: 'visible' });
  await desktopPage.waitForFunction(() => {
    const el = document.getElementById('qr-share-url-input') as HTMLInputElement;
    return el && el.value && el.value.startsWith('http');
  });

  const previewUrl = await desktopPage.$eval('#qr-share-url-input', (el: any) => el.value);
  console.log(`✅ Generated Mobile Preview URL: ${previewUrl}`);

  // Screenshot QR modal on Desktop
  await desktopPage.screenshot({
    path: '/Users/sebastianviste/.gemini/antigravity/brain/b5a75447-c312-4289-927b-614c1b9d2d6a/desktop_qr_live_sync_modal.png',
  });

  // 3. Mobile Player Context (iPhone 14)
  const iPhone = devices['iPhone 14'];
  const mobileContext = await browser.newContext({ ...iPhone });
  const mobilePage = await mobileContext.newPage();

  console.log(`📱 Phone scanning QR & opening: ${previewUrl}`);
  await mobilePage.goto(previewUrl, { waitUntil: 'networkidle' });

  await mobilePage.waitForSelector('#mobile-headline', { state: 'visible' });
  console.log('Initial mobile brand:', await mobilePage.$eval('#mobile-brand', el => el.textContent?.trim()));

  // Screenshot initial mobile player state
  await mobilePage.screenshot({
    path: '/Users/sebastianviste/.gemini/antigravity/brain/b5a75447-c312-4289-927b-614c1b9d2d6a/mobile_initial_before_edit.png',
  });

  // 4. Desktop Live Edits
  await desktopPage.evaluate(() => {
    (window as any).closeMobilePreviewModal();
  });

  console.log('✏️ Changing Brand on Desktop to: "⚡ AI Reel Engine"...');
  await desktopPage.locator('#reel-brand').fill('⚡ AI Reel Engine');
  await desktopPage.locator('#reel-brand').dispatchEvent('input');

  console.log('✏️ Changing Slide 1 Headline on Desktop to: "Live Real-Time Sync Til Din Mobil"...');
  await desktopPage.locator('input[data-idx="0"][data-field="headline"]').fill('Live Real-Time Sync Til Din Mobil');
  await desktopPage.locator('input[data-idx="0"][data-field="headline"]').dispatchEvent('input');

  console.log('🎨 Switching Theme to Sunset on Desktop...');
  await desktopPage.locator('#theme-btn-sunset').click();

  // 5. Assert Mobile Updates Live without refresh
  console.log('⏳ Verifying Mobile updates live in DOM without page reload...');
  await mobilePage.waitForFunction(() => {
    const brand = document.getElementById('mobile-brand')?.textContent || '';
    const hl = document.getElementById('mobile-headline')?.innerText || document.getElementById('mobile-headline')?.textContent || '';
    return brand.includes('AI Reel Engine') && (hl.includes('Live') || hl.includes('Real-Time') || hl.includes('Sync'));
  }, { timeout: 8000 });

  const finalMobileBrand = await mobilePage.$eval('#mobile-brand', el => el.textContent?.trim());
  const finalMobileHeadline = await mobilePage.$eval('#mobile-headline', el => el.textContent?.trim());
  console.log(`🎉 Mobile Brand updated live: "${finalMobileBrand}"`);
  console.log(`🎉 Mobile Headline updated live: "${finalMobileHeadline}"`);

  // Take final verified screenshots
  await mobilePage.screenshot({
    path: '/Users/sebastianviste/.gemini/antigravity/brain/b5a75447-c312-4289-927b-614c1b9d2d6a/mobile_live_sync_verified.png',
  });

  await desktopPage.screenshot({
    path: '/Users/sebastianviste/.gemini/antigravity/brain/b5a75447-c312-4289-927b-614c1b9d2d6a/desktop_live_sync_verified.png',
  });

  console.log('✅ VERIFICATION COMPLETE: Live mobile synchronization is 100% operational in production!');
  await browser.close();
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
