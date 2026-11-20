#!/usr/bin/env node
/** Build the original public-module example into one offline HTML artifact.
 * Install this package's declared development dependencies, then run:
 * node scripts/build-image-workbench.mjs [output.html]
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { escapeXmlAttr, escapeXmlText } from '@red-cup-engineering/xml-document-rendering-service/core';
import { createImageWorkbenchFixture, scenarioDescription, opticalLegend, opticalProfiles } from '../examples/image-workbench.model.mjs';
import { read as readPacket } from '@red-cup-engineering/semiotic-hypertext-packet/read';
import { formPacketJsonCloudEvent, readPacketJsonCloudEvent } from '@red-cup-engineering/semiotic-hypertext-packet/json-event';

const directory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const dataUrl = (bytes, mediaType) => `data:${mediaType};base64,${Buffer.from(bytes).toString('base64')}`;

export async function buildImageWorkbench({ outputPath = resolve('dist/image-workbench.html') } = {}) {
  outputPath = resolve(outputPath);
  const fixture = createImageWorkbenchFixture();
  const event = formPacketJsonCloudEvent({ id: 'image-workbench-example', source: 'urn:tufte:image-workbench',
    type: 'tufte.image-workbench', dataform: readPacket(fixture.packet) });
  readPacketJsonCloudEvent(event);
  const eventBytes = Buffer.from(JSON.stringify(event));
  const result = await build({
    absWorkingDir: directory,
    entryPoints: ['examples/image-workbench.mjs'], bundle: true, write: false,
    platform: 'browser', format: 'iife', target: 'es2022', minify: true,
    legalComments: 'eof', metafile: true, logLevel: 'silent',
  });
  // A data URL retains the exact compiled program without entering HTML's
  // script double-escaped state when the original writers contain script tags.
  const script = result.outputFiles[0].contents;
  const template = await readFile(join(directory, 'examples/image-workbench.html'), 'utf8');
  const css = await readFile(join(directory, 'examples/image-workbench.css'), 'utf8');
  const initial = fixture.optical;
  const capacity = `${initial.symbol.size} × ${initial.symbol.size} modules · ${initial.bytes.byteLength} / ${initial.symbol.profile.maxPayloadBytes} bytes`;
  const replacements = {
    '/*__WORKBENCH_CSS__*/': css,
    '__WORKBENCH_SCRIPT_URL__': dataUrl(script, 'text/javascript'),
    '__SCENARIO_DESCRIPTION__': escapeXmlText(scenarioDescription),
    '__SOURCE_NI__': escapeXmlText(fixture.projection.sourceId),
    '__SVG_NI__': escapeXmlText(fixture.svgMaterial.ni),
    '__PNG_NI__': escapeXmlText(fixture.pngMaterial.ni),
    '__PAYLOAD_NI__': escapeXmlText(fixture.payload.ni),
    '__RADIAL_URL__': dataUrl(fixture.svgBytes, 'image/svg+xml'),
    '__PNG_URL__': dataUrl(fixture.png, 'image/png'),
    '__OPTICAL_URL__': dataUrl(initial.png, 'image/png'),
    '__PACKET_URL__': dataUrl(fixture.packetBytes, 'text/html'),
    '__INITIAL_CAPACITY__': escapeXmlText(capacity),
    '__OPTICAL_LEGEND__': opticalLegend.map(entry => `<li><i style="background:${escapeXmlAttr(entry.color)}" aria-hidden="true"></i>${escapeXmlText(entry.name)}</li>`).join(''),
    '__CAPACITY_LIST__': opticalProfiles.map(profile => `<li>${profile.size} × ${profile.size}: ${profile.maxPayloadBytes} payload bytes; ${profile.parityBytesPerBlock} parity bytes per block.</li>`).join(''),
  };
  let html = template;
  for (const [token, value] of Object.entries(replacements)) html = html.replaceAll(token, () => value);
  if (/__(?:RADIAL|PNG|PACKET|WORKBENCH|SOURCE|OPTICAL|CAPACITY|INITIAL|PAYLOAD|SVG|SCENARIO)[A-Z_]*__/u.test(html)) throw new Error('An example template token was not filled.');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);
  const inputs = [];
  for (const [path, meta] of Object.entries(result.metafile.inputs)) {
    const source = await readFile(resolve(directory, path));
    inputs.push({ path, bytes: source.byteLength, sha256: sha256(source), imports: meta.imports.map(item => ({ path: item.path, kind: item.kind, external: item.external === true })) });
  }
  const receipt = { kind: 'living-web.image-workbench-build', registryRequests: false,
    outputPath, bytes: Buffer.byteLength(html), sha256: sha256(html), sourceId: fixture.projection.sourceId,
    artifacts: { svg: { bytes: fixture.svgBytes.byteLength, ni: fixture.svgMaterial.ni, sha256: sha256(fixture.svgBytes) },
      png: { bytes: fixture.png.byteLength, ni: fixture.pngMaterial.ni, sha256: sha256(fixture.png) },
      packet: { bytes: fixture.packetBytes.byteLength, sha256: sha256(fixture.packetBytes) } },
    cloudEvent: { bytes: eventBytes.byteLength, sha256: sha256(eventBytes), received: true },
    optical: { bytes: initial.bytes.byteLength, size: initial.symbol.size, capacity: initial.symbol.profile.maxPayloadBytes },
    compiler: 'esbuild', inputs,
  };
  await writeFile(outputPath + '.receipt.json', JSON.stringify(receipt, null, 2) + '\n');
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const receipt = await buildImageWorkbench({ outputPath: process.argv[2] });
  console.log(JSON.stringify({ outputPath: receipt.outputPath, bytes: receipt.bytes, sha256: receipt.sha256,
    sourceId: receipt.sourceId, optical: receipt.optical, moduleCount: receipt.inputs.length }));
}
