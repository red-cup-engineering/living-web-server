/** An explicitly synthetic scenario, computed by the actual public owners. */
import { readingSettlement } from '@red-cup-engineering/metrologic/settlement';
import { settlementRadialProjection, projectSettlementRadial, verifySettlementRadial } from '@red-cup-engineering/xml-document-rendering-service/svg/radial';
import { readSvgDataCarrier } from '@red-cup-engineering/xml-document-rendering-service/svg/data-carrier';
import { encodePngIndexed, writePngCarrier } from '@red-cup-engineering/computer-serialized-content-engineering-services-section/png-carrier';
import { imagePayload, imagePayloadFromBytes } from '@red-cup-engineering/computer-serialized-content-engineering-services-section/image-payload';
import { encodeFourOptical, renderFourOpticalIndexed, fourOpticalProfile, opticalFourPalette, opticalFourLimits } from '@red-cup-engineering/computer-serialized-content-engineering-services-section/optical-four';
import { readingOfWire } from '@red-cup-engineering/computer-data-engineering-services-section/four';
import { imageMaterial } from '@red-cup-engineering/semiotic-hypertext-packet/image-materials';
import { shp } from '@red-cup-engineering/semiotic-hypertext-packet/write';

const utf8 = new TextEncoder();
export const scenarioDescription = 'An illustrative five-cell scenario, not live observations. Metrologic joins an opposing reading into “contested” and derives one new claim. The result retains neither, true, false and both.';
export const opticalProfiles = Object.freeze(opticalFourLimits.sizes.map(fourOpticalProfile));
export const opticalLegend = Object.freeze(opticalFourPalette.map(entry => Object.freeze({ name: readingOfWire(entry.value), color: entry.color })));

export function encodeOpticalText(text, size) {
  if (typeof text !== 'string' || !text.isWellFormed()) throw new TypeError('Enter well-formed Unicode text.');
  const bytes = utf8.encode(text);
  const symbol = encodeFourOptical(bytes, size === undefined ? {} : { size });
  const pixels = renderFourOpticalIndexed(symbol, { scale: 6, quietZone: 4 });
  const png = encodePngIndexed(pixels);
  const payload = imagePayloadFromBytes({ bytes, mediaType: 'text/plain' });
  return { bytes, symbol, pixels, png, payload };
}

export function createImageWorkbenchFixture() {
  const result = readingSettlement.settle(
    () => ({ contested: 'active', derived: 'potential' }),
    { unanswered: 'absurd', affirmed: 'potential', denied: 'active', contested: 'potential' },
  );
  const projection = settlementRadialProjection(result, { title: 'Illustrative Metrologic settlement' });
  const svg = projectSettlementRadial(result, { title: 'Illustrative Metrologic settlement' });
  if (!verifySettlementRadial(svg)) throw new Error('The original radial verifier refused the produced image.');
  const svgBytes = utf8.encode(svg);
  const carried = readSvgDataCarrier(svg);
  const payload = imagePayload({ carrier: carried.carrier });
  const optical = encodeOpticalText(projection.sourceId);
  const png = writePngCarrier({ png: optical.png, carrier: carried.carrier });
  const svgMaterial = imageMaterial({ name: 'settlement.svg', mediaType: 'image/svg+xml', bytes: svgBytes });
  const pngMaterial = imageMaterial({ name: 'settlement-payload.png', mediaType: 'image/png', bytes: png });
  const packet = shp({
    subject: projection.sourceId,
    title: 'Illustrative settlement · recoverable images',
    language: 'en', cells: [],
    metadata: { scenario: scenarioDescription, 'source-ni': projection.sourceId },
    materials: [svgMaterial, pngMaterial],
    images: [
      { material: svgMaterial.name, alt: projection.description, caption: scenarioDescription },
      { material: pngMaterial.name,
        alt: 'A FOUR optical symbol carrying the settlement source identifier; the PNG also embeds the complete canonical settlement payload.',
        caption: 'Pixels carry the source identifier. The PNG metadata retains the same exact CBOR payload as the radial SVG.' },
    ],
  });
  return { result, projection, svg, svgBytes, png, packet, payload, optical,
    svgMaterial, pngMaterial, packetBytes: utf8.encode(packet) };
}

