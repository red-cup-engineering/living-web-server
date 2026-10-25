import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createLivingWebServer as createFetchApplication } from "../src/fetch.mjs";
import { createLivingWebServer as createNodeApplication, serveLivingWebServer } from "../src/application.mjs";

const source = () => readFileSync(new URL("../src/fetch.mjs", import.meta.url), "utf8");

test("fetch-only entry never imports the Node listener and preserves native public API", () => {
  assert.ok(!source().includes("computer-web-server/node"));
  assert.ok(!source().includes("startWebServer"));
  assert.equal(createFetchApplication, createNodeApplication);
  assert.equal(typeof serveLivingWebServer, "function");
});

test("one Fetch application serves TUFTE HTML and JSON from current authorized source", async () => {
  let observed = "first", reads = 0;
  const app = createFetchApplication({
    origin: "https://example.test",
    authorizePublicRead: async ({ resource }) => resource === "home",
    home: () => { reads++; return { title: "Site", tiles: [{ id: "front", content: observed }] }; },
  });
  const get = (url, accept) => app.fetch(new Request(url, { headers: { accept } }));
  assert.match(await (await get("https://example.test/", "text/html")).text(), /first/u);
  observed = "second";
  const reply = await get("https://example.test/", "application/json");
  assert.equal(reply.status, 200);
  assert.match(JSON.stringify(await reply.json()), /second/u);
  assert.equal(reads, 2);
  assert.equal((await get("https://other.test/", "text/html")).status, 421);
  assert.equal((await get("https://example.test/missing", "text/html")).status, 404);
  assert.equal(reads, 2);
});

test("the original ASSIST contact journey survives the installed TUFTE HTML and JSON boundary", async () => {
  const href = "mailto:causeway@561.group?subject=iLands%20Trusted%20Personal%20Executive%20Assistant%20request";
  let reads = 0;
  const app = createFetchApplication({
    origin: "https://ilands.assist.example",
    authorizePublicRead: ({ context }) => context.request.headers.get("x-source") === "admitted",
    home: () => { reads++; return { title: "iLands", tiles: [{ id: "contact", links: [{ href, label: "Request personal assistance" }] }] }; },
  });
  const get = (accept, admitted = true) => app.fetch(new Request("https://ilands.assist.example/", { headers: {
    accept, ...(admitted ? { "x-source": "admitted" } : {}),
  } }));
  assert.equal((await get("text/html", false)).status, 404);
  assert.equal(reads, 0);
  const html = await get("text/html");
  assert.equal(html.status, 200);
  const body = await html.text();
  assert.ok(body.includes(`<a href="${href}">Request personal assistance</a>`));
  assert.equal(body.includes('data-tufte-nav href="mailto:'), false);
  const json = await get("application/json");
  assert.equal(json.status, 200);
  assert.equal((await json.json()).tiles[0].links[0].href, href);
  assert.equal(reads, 2);
});
