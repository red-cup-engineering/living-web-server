/** Receive the built offline example through an actual browser and file transfer.
 * node examples/image-workbench.receiving.mjs built.html receiving-directory
 * Optional PLAYWRIGHT_MODULE_URL and WORKBENCH_BROWSER_EXECUTABLE select an
 * already installed browser test runtime; this program performs no installation.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createImageWorkbenchFixture, opticalProfiles } from './image-workbench.model.mjs';
import { readPngCarrier } from '@red-cup-engineering/computer-serialized-content-engineering-services-section/png-carrier';
import { imagePayload } from '@red-cup-engineering/computer-serialized-content-engineering-services-section/image-payload';
import { verifySettlementRadial } from '@red-cup-engineering/xml-document-rendering-service/svg/radial';
import { read as readPacket } from '@red-cup-engineering/semiotic-hypertext-packet/read';

export async function receiveImageWorkbench({ htmlPath, outputDirectory, executablePath = process.env.WORKBENCH_BROWSER_EXECUTABLE } = {}) {
  htmlPath = resolve(htmlPath); outputDirectory = resolve(outputDirectory);
  await mkdir(outputDirectory, { recursive: true });
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL ?? 'playwright');
  const fixture = createImageWorkbenchFixture();
  const bytesOf = file => readFile(file);
  const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
  const checks = [], errors = [], externalRequests = [], downloads = {};
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const context = await browser.newContext({ viewport: { width: 1320, height: 980 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { if (/^https?:/u.test(request.url())) externalRequests.push(request.url()); });
  const waitReady = async () => {
    await page.goto(pathToFileURL(htmlPath).href);
    await page.waitForFunction(() => document.querySelector('#optical-image')?.src.startsWith('blob:') || !document.querySelector('#startup-error').hidden);
    assert.equal(await page.locator('#startup-error').isVisible(), false, await page.locator('#startup-error').textContent());
  };
  const download = async (id, name) => {
    const waiting = page.waitForEvent('download'); await page.locator('#' + id).click();
    const received = await waiting, path = join(outputDirectory, name); await received.saveAs(path);
    assert.equal(await received.failure(), null);
    const bytes = await bytesOf(path); downloads[name] = { path, bytes: bytes.byteLength, sha256: sha256(bytes) }; return bytes;
  };
  try {
    await waitReady();
    assert.equal(await page.locator('#source-ni').textContent(), fixture.projection.sourceId);
    assert.equal(new TextEncoder().encode(fixture.projection.sourceId).byteLength, 57);
    assert.equal(await page.locator('#radial-image').evaluate(img => img.complete && img.naturalWidth > 0), true);
    assert.match(await page.locator('#optical-status').textContent(), /57 \/ \d+ bytes/u);
    checks.push('actual computed source, pre-rendered image and bundled browser agree');

    const svg = await download('download-radial', 'settlement.svg');
    assert.equal(svg.toString(), fixture.svg); assert.equal(verifySettlementRadial(svg.toString()), true);
    const png = await download('download-payload', 'settlement-payload.png');
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.deepEqual(png, Buffer.from(fixture.png));
    assert.deepEqual(imagePayload({ carrier: readPngCarrier(png).carrier }).bytes, fixture.payload.bytes);
    const packet = await download('download-packet', 'settlement-packet.html');
    assert.equal(packet.toString(), fixture.packet);
    const receivedPacket = readPacket(packet.toString());
    assert.equal(receivedPacket.images.length, 2); assert.equal(receivedPacket.cells.length, 0);
    checks.push('SVG, PNG and SHP downloads retain exact original bytes and signatures');

    await page.locator('#inspect-file').setInputFiles(join(outputDirectory, 'settlement-payload.png'));
    await page.waitForFunction(() => document.querySelector('#file-status').textContent.includes('inspected locally'));
    assert.equal(await page.locator('#embedded-ni').textContent(), fixture.payload.ni);
    assert.equal(await page.locator('#scan-text').inputValue(), fixture.projection.sourceId);
    assert.match(await page.locator('#scan-status').textContent(), /^Recovered 57 exact bytes/u);
    assert.deepEqual(await download('download-embedded', 'recovered-cbor.bin'), Buffer.from(fixture.payload.bytes));
    assert.deepEqual(await download('download-scan', 'recovered-source-ni.bin'), Buffer.from(fixture.projection.sourceId));
    assert.match(await page.locator('#regenerated-status').textContent(), new RegExp(fixture.projection.sourceId.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')));
    assert.deepEqual(await download('download-regenerated', 'regenerated-settlement.svg'), Buffer.from(fixture.svg));
    checks.push('own payload PNG independently recovers its metadata bytes and its optical source ID');
    checks.push('PNG payload is decoded by the original semantic owner and regenerates the exact original SVG bytes');

    await page.locator('#inspect-file').setInputFiles(join(outputDirectory, 'settlement.svg'));
    await page.waitForFunction(() => document.querySelector('#file-status').textContent.includes('settlement.svg') && document.querySelector('#file-status').textContent.includes('inspected locally'));
    assert.match(await page.locator('#embedded-status').textContent(), /reproduced this SVG exactly/u);
    assert.equal(await page.locator('#embedded-ni').textContent(), fixture.payload.ni);
    checks.push('SVG upload receives the carrier and verifies the original settlement projection');

    for (const [index, count] of [[1, opticalProfiles[0].maxPayloadBytes + 1], [2, opticalProfiles[1].maxPayloadBytes + 1]]) {
      await page.locator('#optical-text').fill('x'.repeat(count)); await page.locator('#encode-button').click();
      assert.match(await page.locator('#optical-status').textContent(), new RegExp(`^${opticalProfiles[index].size} × ${opticalProfiles[index].size}`));
    }
    await page.locator('#optical-text').fill('x'.repeat(opticalProfiles.at(-1).maxPayloadBytes + 1)); await page.locator('#encode-button').click();
    assert.match(await page.locator('#optical-status').textContent(), /^Refused:/u);
    assert.equal(await page.locator('#download-optical').getAttribute('aria-disabled'), 'true');
    await page.locator('#use-source').click();
    const symbol = await download('download-optical', 'four-optical.png');
    assert.equal(readPngCarrier(symbol), null);
    checks.push('actual profile capacities select 49 and 65 automatically and refuse overflow without a stale download');

    const jpeg = await page.evaluate(async base64 => {
      const image = new Image(); image.src = 'data:image/png;base64,' + base64; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      canvas.getContext('2d').drawImage(image, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .92));
      return [...new Uint8Array(await blob.arrayBuffer())];
    }, symbol.toString('base64'));
    const jpegPath = join(outputDirectory, 'optical-photo.jpeg'); await writeFile(jpegPath, Uint8Array.from(jpeg));
    await page.locator('#inspect-file').setInputFiles(jpegPath);
    await page.waitForFunction(() => document.querySelector('#file-status').textContent.includes('optical-photo.jpeg') && document.querySelector('#file-status').textContent.includes('inspected locally'));
    assert.match(await page.locator('#embedded-status').textContent(), /JPEG has no supported/u);
    assert.equal(await page.locator('#scan-text').inputValue(), fixture.projection.sourceId);
    assert.match(await page.locator('#scan-status').textContent(), /^Recovered 57 exact bytes/u);
    checks.push('ordinary JPEG created by the browser decodes through Canvas RGBA and the actual optical scanner');

    const plain = await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#558899'; ctx.fillRect(0, 0, 96, 96);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      return [...new Uint8Array(await blob.arrayBuffer())];
    });
    await page.locator('#inspect-file').setInputFiles({ name: 'ordinary.png', mimeType: 'image/png', buffer: Buffer.from(plain) });
    await page.waitForFunction(() => document.querySelector('#file-status').textContent.includes('ordinary.png') && document.querySelector('#file-status').textContent.includes('inspected locally'));
    assert.match(await page.locator('#embedded-status').textContent(), /No embedded image payload/u);
    assert.match(await page.locator('#scan-status').textContent(), /^Refused:/u);
    await page.locator('#inspect-file').setInputFiles({ name: 'active.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><script>globalThis.workbenchPayloadExecuted=true</script></svg>') });
    await page.waitForFunction(() => document.querySelector('#file-status').textContent.startsWith('Refused:'));
    assert.equal(await page.evaluate(() => globalThis.workbenchPayloadExecuted), undefined);
    checks.push('ordinary images and active SVG receive explicit refusal without payload execution');

    const noScript = await browser.newContext({ javaScriptEnabled: false });
    try {
      const passive = await noScript.newPage(); await passive.goto(pathToFileURL(join(outputDirectory, 'settlement-packet.html')).href);
      await passive.locator('img').first().waitFor();
      const images = await passive.locator('img').evaluateAll(nodes => nodes.map(img => ({ complete: img.complete, width: img.naturalWidth, alt: img.alt })));
      assert.equal(images.length, 2); assert.ok(images.every(img => img.complete && img.width > 0 && img.alt.length > 0));
      checks.push('downloaded SHP images and descriptions display with JavaScript disabled');
    } finally { await noScript.close(); }

    await waitReady(); await page.screenshot({ path: join(outputDirectory, 'workbench-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: join(outputDirectory, 'workbench-mobile.png'), fullPage: true });
    checks.push('desktop and mobile views render without horizontal overflow');
    assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
    const receipt = { kind: 'living-web.image-workbench-browser-receiving', status: 'passed',
      browser: await browser.version(), htmlPath, htmlSha256: sha256(await readFile(htmlPath)), checks, downloads, errors, externalRequests };
    await writeFile(join(outputDirectory, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify({ checks: checks.length, status: receipt.status, browser: receipt.browser, htmlSha256: receipt.htmlSha256, outputDirectory }));
    return receipt;
  } finally { await context.close(); await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await receiveImageWorkbench({ htmlPath: process.argv[2], outputDirectory: process.argv[3] });
}
