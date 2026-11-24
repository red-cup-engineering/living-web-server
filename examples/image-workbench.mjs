import { createImageWorkbenchFixture, encodeOpticalText, opticalProfiles } from './image-workbench.model.mjs';
import { readPngCarrier, inspectPng, PNG_LIMITS } from '@red-cup-engineering/computer-serialized-content-engineering-services-section/png-carrier';
import { imagePayload, imagePayloadFromBytes } from '@red-cup-engineering/computer-serialized-content-engineering-services-section/image-payload';
import { scanFourOptical, opticalFourLimits } from '@red-cup-engineering/computer-serialized-content-engineering-services-section/optical-four';
import { inspectPassiveSvg, readSvgDataCarrier } from '@red-cup-engineering/xml-document-rendering-service/svg/data-carrier';
import { projectSettlementRadial, readSettlementRadialPayload, verifySettlementRadial } from '@red-cup-engineering/xml-document-rendering-service/svg/radial';

const byId = id => document.getElementById(id);
const urls = new Map();
function objectUrl(key, bytes, mediaType) {
  const previous = urls.get(key); if (previous) URL.revokeObjectURL(previous);
  const url = URL.createObjectURL(new Blob([bytes], { type: mediaType })); urls.set(key, url); return url;
}
function status(id, text, error = false) { const node = byId(id); node.textContent = text; node.classList.toggle('error', error); }
function utf8Preview(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return 'These bytes are not valid UTF-8. The hexadecimal view and download retain the exact payload.'; }
}
function hex(bytes) {
  const rows = [];
  for (let i = 0; i < bytes.length; i += 16) rows.push([...bytes.subarray(i, i + 16)].map(byte => byte.toString(16).padStart(2, '0')).join(' '));
  return rows.join('\n');
}
function recovered(prefix, payload) {
  byId(`${prefix}-data`).hidden = false;
  byId(`${prefix}-length`).textContent = `${payload.byteLength.toLocaleString('en-US')} bytes`;
  byId(`${prefix}-ni`).textContent = payload.ni;
  if (prefix === 'embedded') byId('embedded-type').textContent = payload.carrier.mediaType;
  byId(`${prefix}-text`).value = utf8Preview(payload.bytes);
  byId(`${prefix}-hex`).value = hex(payload.bytes);
  const download = byId(`download-${prefix}`);
  download.href = objectUrl(`${prefix}-download`, payload.bytes, 'application/octet-stream');
  if (prefix === 'embedded' && payload.carrier.mediaType === 'application/cbor') {
    const panel = byId('regenerated-data'), link = byId('download-regenerated');
    panel.hidden = false; link.hidden = true;
    try {
      const projection = readSettlementRadialPayload(payload);
      const svg = projectSettlementRadial(projection.source.result, { ...projection.view, cells: projection.source.cells });
      if (!verifySettlementRadial(svg)) throw new Error('The original verifier refused the reconstructed view.');
      const bytes = new TextEncoder().encode(svg);
      const image = imagePayloadFromBytes({ bytes, mediaType: 'image/svg+xml' });
      byId('regenerated-status').textContent = `Received source ${projection.sourceId}. Regenerated SVG bytes ${image.ni}; the original verifier reproduced the view.`;
      link.href = objectUrl('regenerated', bytes, 'image/svg+xml'); link.hidden = false;
    } catch (error) {
      byId('regenerated-status').textContent = `The embedded bytes are intact. A settlement view was not reconstructed: ${error.message}`;
    }
  }
}

function attachWorkbench() {
  const fixture = createImageWorkbenchFixture();
  if (byId('source-ni').textContent !== fixture.projection.sourceId || byId('svg-ni').textContent !== fixture.svgMaterial.ni) {
    throw new Error('The browser and pre-rendered source identities differ. Rebuild this file from one exact source closure.');
  }
  const encode = () => {
    const text = byId('optical-text'), choice = byId('optical-size').value;
    try {
      const encoded = encodeOpticalText(text.value, choice === 'auto' ? undefined : Number(choice));
      const url = objectUrl('optical', encoded.png, 'image/png');
      byId('optical-image').src = url; byId('optical-image').hidden = false;
      byId('optical-image').alt = `FOUR optical symbol carrying ${encoded.bytes.byteLength} UTF-8 bytes in a ${encoded.symbol.size} by ${encoded.symbol.size} module grid.`;
      const link = byId('download-optical'); link.href = url; link.removeAttribute('aria-disabled');
      const message = `${encoded.symbol.size} × ${encoded.symbol.size} modules · ${encoded.bytes.byteLength} / ${encoded.symbol.profile.maxPayloadBytes} bytes`;
      status('optical-status', message); byId('optical-capacity').textContent = message;
      text.removeAttribute('aria-invalid');
    } catch (error) {
      text.setAttribute('aria-invalid', 'true'); byId('optical-image').hidden = true;
      byId('download-optical').removeAttribute('href'); byId('download-optical').setAttribute('aria-disabled', 'true');
      const count = new TextEncoder().encode(text.value).byteLength;
      const selected = choice === 'auto' ? opticalProfiles.at(-1) : opticalProfiles.find(profile => profile.size === Number(choice));
      status('optical-status', `Refused: ${error.message} Entered ${count} bytes; this selection allows ${selected.maxPayloadBytes}.`, true);
      byId('optical-capacity').textContent = 'No symbol produced for this input.';
    }
  };
  byId('encode-form').addEventListener('submit', event => { event.preventDefault(); encode(); });
  byId('use-source').addEventListener('click', () => { byId('optical-text').value = fixture.projection.sourceId; byId('optical-size').value = 'auto'; encode(); });
  byId('optical-size').addEventListener('change', encode);
  encode();

  let selected = 0;
  byId('inspect-file').addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    const ticket = ++selected;
    byId('inspection-results').hidden = true; byId('uploaded-preview').hidden = true;
    byId('regenerated-data').hidden = true;
    for (const prefix of ['embedded', 'scan']) byId(`${prefix}-data`).hidden = true;
    status('file-status', `Reading ${file.name} locally…`);
    try {
      if (file.size > PNG_LIMITS.maximumFileBytes) throw new RangeError('The file exceeds the 20 MiB input budget.');
      const bytes = new Uint8Array(await file.arrayBuffer()); if (ticket !== selected) return;
      const isPng = bytes.length >= 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      const isJpeg = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const isSvg = !isPng && !isJpeg && (file.type === 'image/svg+xml' || /\.svg$/iu.test(file.name));
      let carried = null, mediaType, svg;
      if (isPng) { inspectPng(bytes); carried = readPngCarrier(bytes); mediaType = 'image/png'; }
      else if (isSvg) {
        svg = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        inspectPassiveSvg(svg); carried = readSvgDataCarrier(svg); mediaType = 'image/svg+xml';
      } else if (isJpeg) mediaType = 'image/jpeg';
      else throw new TypeError('Choose a PNG, a passive SVG, or a JPEG image.');
      if (ticket !== selected) return;
      byId('inspection-results').hidden = false;
      if (carried) {
        const payload = imagePayload({ carrier: carried.carrier }); recovered('embedded', payload);
        status('embedded-status', `Verified ${payload.byteLength} exact payload bytes.${svg && verifySettlementRadial(svg) ? ' The original settlement verifier also reproduced this SVG exactly.' : ''}`);
      } else status('embedded-status', isJpeg ? 'JPEG has no supported embedded image carrier. Optical pixels are checked separately.' : 'No embedded image payload is present. This is distinct from an empty payload.');
      const url = objectUrl('uploaded', bytes, mediaType);
      const preview = byId('uploaded-preview'); preview.src = url; preview.hidden = false;
      if (isSvg) {
        status('scan-status', 'Optical scanning accepts PNG and JPEG pixels. This SVG was inspected as a passive document.');
      } else {
        status('scan-status', 'Scanning pixels locally…');
        try {
        const image = new Image(); image.src = url; await image.decode();
        if (ticket !== selected) return;
        const width = image.naturalWidth, height = image.naturalHeight;
        if (!width || !height || width > opticalFourLimits.maxImageDimension || height > opticalFourLimits.maxImageDimension || width * height > opticalFourLimits.maxImagePixels)
          throw new RangeError('The decoded image exceeds the optical scanner’s 4096-dimension / 4-megapixel budget.');
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) throw new Error('A Canvas 2D reader is unavailable.');
        context.drawImage(image, 0, 0); const rgba = context.getImageData(0, 0, width, height).data;
        await new Promise(requestAnimationFrame); if (ticket !== selected) return;
        const result = scanFourOptical({ width, height, rgba });
        if (result.ok) {
          const payload = imagePayloadFromBytes({ bytes: result.bytes, mediaType: 'application/octet-stream' });
          recovered('scan', payload);
          status('scan-status', `Recovered ${result.bytes.byteLength} exact bytes · ${result.profile.size} × ${result.profile.size} · ${result.correctedBytes} corrected bytes · ${result.erasedBytes} erased bytes.`);
        } else status('scan-status', `Refused: ${result.reason}. No optical payload was accepted.`, true);
        } catch (error) {
          if (ticket === selected) status('scan-status', `Refused: ${error.message} No optical payload was accepted.`, true);
        }
      }
      if (ticket === selected) status('file-status', `${file.name} · ${file.size.toLocaleString('en-US')} bytes · inspected locally`);
    } catch (error) {
      if (ticket === selected) status('file-status', `Refused: ${error.message}`, true);
    }
  });
  window.addEventListener('pagehide', () => { for (const url of urls.values()) URL.revokeObjectURL(url); urls.clear(); }, { once: true });
}

try { attachWorkbench(); }
catch (error) { const node = byId('startup-error'); node.hidden = false; node.textContent = `Interactive workbench unavailable: ${error.message} The pre-rendered images and downloads remain available.`; }
