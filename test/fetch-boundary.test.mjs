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


test("accepted MOOSE publication feeds negotiate exact original media without a second renderer", async () => {
  let accepted = false;
  let reads = 0;
  let title = "first science publication";
  const app = createFetchApplication({
    origin: "https://science.example",
    authorizePublicRead: ({ resource }) => resource === "rss" && accepted,
    pages: [
      {
        match: "/feed.rss.xml", name: "rss",
        produces: ["application/rss+xml"],
        read: () => {
          reads++;
          return new Response("<rss>" + title + "</rss>", {
            headers: { "content-type": "application/rss+xml; charset=utf-8" },
          });
        },
      },
      {
        match: "/feed.json", name: "json-feed",
        produces: ["application/feed+json"],
        read: () => { throw Error("no authorization, no JSON feed source read"); },
      },
    ],
  });
  const get = accept => app.fetch(new Request("https://science.example/feed.rss.xml", {
    headers: { accept },
  }));
  const denied = await get("application/rss+xml");
  assert.equal(denied.status, 404);
  assert.equal(reads, 0);
  accepted = true;
  const initial = await get("application/rss+xml");
  assert.equal(initial.status, 200);
  assert.equal(initial.headers.get("content-type"), "application/rss+xml; charset=utf-8");
  assert.match(await initial.text(), /first science publication/u);
  title = "source corrected";
  assert.match(await (await get("application/rss+xml")).text(), /source corrected/u);
  assert.equal(reads, 2);
  assert.equal((await get("image/png")).status, 406, "unoffered response types refuse");
  assert.equal((await app.fetch(new Request("https://other.example/feed.rss.xml"))).status, 421);
  assert.equal((await app.fetch(new Request("https://science.example/feed.json", {
    headers: { accept: "application/feed+json" },
  }))).status, 404, "the original distinct editorial gate remains responsible");
});

test("live publication passthrough refuses malformed declarations and invented media", async () => {
  for (const produces of [[], ["*/*"], ["bad"], ["text/html; charset=utf-8"],
    ["application/rss+xml", "application/rss+xml"], ["application/rss+xml", 1]]) {
    assert.throws(() => createFetchApplication({
      origin: "https://science.example", authorizePublicRead: () => true,
      pages: [{ match: "/feed.rss.xml", produces, read: () => new Response("source") }],
    }), /distinct exact MIME names/u);
  }
  const app = createFetchApplication({
    origin: "https://science.example", authorizePublicRead: () => true,
    pages: [
      { match: "/feed.rss.xml", produces: ["application/rss+xml"],
        read: () => new Response("not RSS", {
          headers: { "content-type": "text/html" },
        }) },
      { match: "/feed.json", produces: ["application/feed+json"],
        read: () => ({ title: "unsupported model for feed" }) },
    ],
  });
  for (const [path, accept] of [
    ["/feed.rss.xml", "application/rss+xml"],
    ["/feed.json", "application/feed+json"],
  ]) {
    const reply = await app.fetch(new Request("https://science.example" + path, {
      headers: { accept },
    }));
    assert.equal(reply.status, 500, "a source-media mismatch never becomes an accepted feed");
  }
});
