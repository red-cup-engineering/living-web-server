import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createLivingWebServer } from "@red-cup-engineering/living-web-server/fetch";

test("edge import exposes one existing Living Web Fetch application without Node listener code", async () => {
  const pure = readFileSync(new URL("../src/fetch.mjs", import.meta.url), "utf8");
  assert.equal(pure.includes("computer-web-server/node") || pure.includes("startWebServer") || pure.includes("node:http"), false);
  let reads = 0, publiclyAllowed = false;
  const app = createLivingWebServer({
    origin: "https://561.example",
    authorizePublicRead: ({ resource }) => resource === "home" && publiclyAllowed,
    home: () => ({ title: "Group", tiles: [{ id: "only-home", content: `revision ${++reads}` }] }),
  });
  const get = type => app.fetch(new Request("https://561.example/", { headers: { accept: type } }));
  const denied = await get("text/html");
  assert.equal(denied.status, 404);
  assert.equal(reads, 0, "not even the underlying original source was inspected");
  publiclyAllowed = true;
  const html = await get("text/html");
  assert.equal(html.status, 200);
  assert.match(await html.text(), /revision 1/u);
  assert.equal((await get("application/json")).status, 200);
  assert.equal(reads, 2, "source was read on each admitted request, not snapshotted");
  assert.equal((await app.fetch(new Request("https://wrong.example/"))).status, 421);
  assert.equal(reads, 2);
});
