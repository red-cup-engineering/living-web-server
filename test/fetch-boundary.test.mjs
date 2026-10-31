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
