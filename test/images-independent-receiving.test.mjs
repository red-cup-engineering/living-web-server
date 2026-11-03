import assert from "node:assert/strict";
import test from "node:test";
import { createLivingWebServer } from "../src/fetch.mjs";
import { livingImagePage } from "../src/images.mjs";
import { imageMaterial } from "@red-cup-engineering/semiotic-hypertext-packet/image-materials";
import { writePacket, readPacket } from "@red-cup-engineering/semiotic-hypertext-packet";
import { projectSettlementRadial, readSettlementRadial, verifySettlementRadial } from "@red-cup-engineering/xml-document-rendering-service/svg/radial";
import { readingSettlement } from "@red-cup-engineering/metrologic/settlement";
import { encodePngRgba, writePngCarrier, readPngCarrier } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/png-carrier";
import { imagePayloadFromBytes } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/image-payload";

test("one authorized live source serves a recoverable radial, PNG and SHP image packet", async () => {
  let admitted = false, reads = 0, revision = 1;
  const currentRadial = () => {
    reads++;
    const result = readingSettlement.settle(() => ({ contested: "active" }), { unknown: "absurd", contested: "potential" });
    const svg = projectSettlementRadial(result, { title: `Current settlement ${revision}` });
    return imageMaterial({ name: "settlement.svg", mediaType: "image/svg+xml", bytes: new TextEncoder().encode(svg) });
  };
  const payload = imagePayloadFromBytes({ bytes: Uint8Array.of(0, 1, 255, 128), mediaType: "application/octet-stream" });
  const png = writePngCarrier({ png: encodePngRgba({ width: 1, height: 1, rgba: Uint8Array.of(0, 0, 255, 255) }), carrier: payload.carrier });
  const page = livingImagePage({ match: "/settlement.svg", name: "radial", mediaType: "image/svg+xml", read: currentRadial });
  const app = createLivingWebServer({ origin: "https://images.example", authorizePublicRead: () => admitted,
    pages: [page,
      livingImagePage({ match: "/payload.png", name: "png", mediaType: "image/png", read: () => { reads++; return imageMaterial({ name: "payload.png", mediaType: "image/png", bytes: png }); } }),
      { match: "/packet.html", name: "packet", produces: ["text/html"], read: () => {
        const material = currentRadial();
        return new Response(writePacket({ subject: "fixture:live-settlement", cells: [], materials: [material], images: [{ material: material.name, alt: "One unanswered cell and one contradictory cell." }] }), { headers: { "content-type": "text/html; charset=utf-8" } });
      } },
    ],
  });
  const get = (path, accept) => app.fetch(new Request("https://images.example" + path, { headers: { accept } }));
  assert.equal(reads, 0, "declaration must not read source");
  assert.equal((await get("/settlement.svg", "image/svg+xml")).status, 404);
  assert.equal(reads, 0, "authority is evaluated before reader");
  admitted = true;
  const response = await get("/settlement.svg", "image/svg+xml");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/svg+xml");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const initial = await response.text();
  assert.equal(verifySettlementRadial(initial), true);
  assert.equal(readSettlementRadial(initial).source.result.state.contested, "stable");
  revision = 2;
  const changed = await get("/settlement.svg", "image/svg+xml");
  assert.notEqual(changed.headers.get("etag"), response.headers.get("etag"));
  assert.match(await changed.text(), /Current settlement 2/u);
  const pngResponse = await get("/payload.png", "image/png");
  const receivedPng = new Uint8Array(await pngResponse.arrayBuffer());
  assert.deepEqual(receivedPng, png);
  assert.equal(readPngCarrier(receivedPng).ni, payload.ni);
  const packet = readPacket(await (await get("/packet.html", "text/html")).text());
  assert.equal(packet.images[0].material, "settlement.svg");
  const before = reads;
  assert.equal((await get("/settlement.svg", "application/json")).status, 406);
  assert.equal((await app.fetch(new Request("https://foreign.example/settlement.svg"))).status, 421);
  assert.equal(reads, before, "unoffered media and foreign origins never read source");
});

test("image source corruption, active SVG and MIME mismatch become refused responses", async () => {
  const make = source => createLivingWebServer({ origin: "https://images.example", authorizePublicRead: () => true,
    pages: [livingImagePage({ match: "/image.svg", mediaType: "image/svg+xml", read: () => source })],
  });
  const unsafe = { name: "active.svg", mediaType: "image/svg+xml", base64: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>').toString("base64") };
  assert.equal((await make(unsafe).fetch(new Request("https://images.example/image.svg"))).status, 500);
  const png = imageMaterial({ name: "one.png", mediaType: "image/png", bytes: encodePngRgba({ width: 1, height: 1, rgba: Uint8Array.of(0, 0, 0, 255) }) });
  assert.equal((await make(png).fetch(new Request("https://images.example/image.svg"))).status, 500);
  assert.equal((await make(null).fetch(new Request("https://images.example/image.svg"))).status, 404);
  assert.throws(() => livingImagePage({ match: "/x", mediaType: "text/html", read() {} }));
});
