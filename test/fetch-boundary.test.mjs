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

test("a Living Web instance themes the existing TUFTE document while retaining one semantic source", async () => {
  const theme = Object.freeze({
    name: "laboratory-record",
    styles: "body[data-tufte-theme=laboratory-record]{--tufte-accent:#165D64;}",
    themeColor: "#165D64",
  });
  let observed = "live";
  const app = createFetchApplication({
    origin: "https://example.test",
    document: { theme },
    authorizePublicRead: async () => true,
    home: () => ({ title: "Observations", tiles: [{ id: "reading", title: "Reading", content: observed }] }),
    pages: [{ match: "/field", name: "field", read: () => ({
      title: "Field observations", tiles: [{ id: "source", content: observed }],
    }) }],
  });
  const get = (path, accept) => app.fetch(new Request("https://example.test" + path, {
    headers: { accept },
  }));
  const html = await (await get("/", "text/html")).text();
  assert.match(html, /data-tufte-theme="laboratory-record"/u);
  assert.match(html, /--tufte-accent:#165D64/u);
  assert.match(html, /<a class="tufte-skip" href="#tufte-content">Skip to content<\/a>/u);
  assert.match(html, /<main\b/u);
  assert.match(await (await get("/field", "text/html")).text(), /data-tufte-theme="laboratory-record"/u);
  const first = await (await get("/", "application/json")).json();
  assert.equal(first.title, "Observations");
  observed = "changed at source";
  assert.match(await (await get("/", "text/html")).text(), /changed at source/u);
  const after = await (await get("/", "application/json")).json();
  assert.match(JSON.stringify(after), /changed at source/u);
  assert.equal(JSON.stringify(first).includes("laboratory-record"), false,
    "CSS theme is not forged as source-model evidence");
});

test("a Living Web theme is validated when the instance is composed, not during a public request", () => {
  const make = document => createFetchApplication({
    origin: "https://example.test", document,
    authorizePublicRead: async () => true, home: () => ({ title: "Ok" }),
  });
  assert.throws(() => make(null), /document options/);
  assert.throws(() => make({ theme: { name: "Invalid Name", styles: "" } }), /admitted TUFTE/);
  assert.throws(() => make({ theme: "nonexistent-theme" }), /admitted TUFTE/);
  assert.throws(() => make({ theme: {
    name: "bad", styles: "body[data-tufte-theme=bad]{color:red}</style><script>alert(1)</script>",
  } }), /admitted TUFTE/);
  assert.doesNotThrow(() => make({ theme: null }));
});
