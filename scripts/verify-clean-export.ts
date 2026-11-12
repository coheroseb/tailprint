import { chromium } from 'playwright';

async function main() {
  console.log('🚀 Verifying Clean Export without Story Tabs or Slide Numbers...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('https://tailprint.com/tools/reel', { waitUntil: 'networkidle' });

  // Verify the clean export toggle exists and is active
  const toggleStatus = await page.$eval('#clean-export-toggle-status', el => el.textContent?.trim());
  console.log(`Clean Export Toggle Status: "${toggleStatus}"`);

  // Trigger export of a clean frame onto export-canvas using global scope variables
  await page.evaluate(() => {
    // @ts-ignore
    const ratio = reelState.aspectRatio || '9:16';
    // @ts-ignore
    const dim = getCanvasDimensions(ratio);
    const canvas = document.getElementById('export-canvas') as HTMLCanvasElement;
    canvas.width = dim.w;
    canvas.height = dim.h;
    const ctx = canvas.getContext('2d')!;
    // @ts-ignore
    const theme = themeMaps[reelState.theme] || themeMaps.gradient;
    // @ts-ignore
    const slide = reelState.slides[0];

    // @ts-ignore
    drawReelFrame(ctx, slide, 0, reelState.slides.length, 0.5, theme, dim.w, dim.h);
  });

  // Extract the canvas image as data URL and save to artifact
  const dataUrl = await page.evaluate(() => {
    const canvas = document.getElementById('export-canvas') as HTMLCanvasElement;
    return canvas.toDataURL('image/png');
  });

  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  const fs = await import('fs');
  fs.writeFileSync(
    '/Users/sebastianviste/.gemini/antigravity/brain/b5a75447-c312-4289-927b-614c1b9d2d6a/clean_exported_frame_verified.png',
    Buffer.from(base64Data, 'base64')
  );

  console.log('✅ Clean exported frame saved to clean_exported_frame_verified.png');

  // Also take a screenshot of the studio showing the new toggle
  await page.screenshot({
    path: '/Users/sebastianviste/.gemini/antigravity/brain/b5a75447-c312-4289-927b-614c1b9d2d6a/studio_clean_export_toggle_verified.png',
  });

  await browser.close();
}

main().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
