import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createLivingWebServer as createFetchApplication } from "../src/fetch.mjs";
import { createLivingWebServer as createNodeApplication, serveLivingWebServer } from "../src/application.mjs";

const source = () => readFileSync(new URL("../src/fetch.mjs", import.meta.url), "utf8");

test("fetch-only entry never imports the Node listener and preserves native public API", () => {
  assert.doesNotMatch(source(), /computer-web-server\\/node|startWebServer/u);
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
