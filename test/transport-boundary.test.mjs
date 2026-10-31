import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json"));
test("Fetch-only consumers never install the Node listener as a mandatory transitive dependency",()=>{
  assert.equal(pkg.exports["./fetch"],"./src/fetch.mjs");
  assert.equal(pkg.dependencies["@red-cup-engineering/web-page-tiling-engine"],"0.17.0-dev.0");
  assert.equal(pkg.dependencies["@red-cup-engineering/computer-web-server"],undefined);
  assert.equal(pkg.peerDependencies["@red-cup-engineering/computer-web-server"],"0.6.2");
  assert.equal(pkg.peerDependenciesMeta["@red-cup-engineering/computer-web-server"].optional,true);
  assert.equal(pkg.devDependencies["@red-cup-engineering/computer-web-server"],"0.6.2");
});
test("Node transport is absent from Fetch-only module imports",()=>{
  const fetchSource=read("src/fetch.mjs");
  const nodeSource=read("src/application.mjs");
  assert.ok(fetchSource.includes("@red-cup-engineering/web-page-tiling-engine/application"));
  assert.ok(!fetchSource.includes("computer-web-server"));
  assert.ok(!fetchSource.includes("node:http"));
  assert.ok(!fetchSource.includes("serveLivingWebServer"));
  assert.ok(nodeSource.includes("@red-cup-engineering/computer-web-server/node"));
  assert.ok(nodeSource.includes('from "./fetch.mjs"'));
});
test("the original live page source retains admission before source reading",()=>{
  const fetchSource=read("src/fetch.mjs");
  assert.ok(fetchSource.indexOf("authorizePublicRead({ context, resource: identity })")<fetchSource.indexOf("const current = await read(context)"));
  assert.ok(fetchSource.includes("new URL(request.url).origin !== base"));
});
