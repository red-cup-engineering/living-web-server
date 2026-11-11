import assert from "node:assert/strict";
import test from "node:test";
import { request as requestHttp } from "node:http";
import { createLivingWebHost, serveLivingWebHost } from "../src/host.mjs";

test("generic hosting admits all origins before invoking an application", () => {
  let calls = 0;
  const fetch = () => { calls++; return new Response("source"); };
  for (const applications of [undefined, [], {}, [null], [{ origin: "https://a.example" }],
    [{ origin: "https://a.example", fetch: true }]]) {
    assert.throws(() => createLivingWebHost({ applications }), TypeError);
  }
  for (const origin of [undefined, "", "not a URL", "file:///tmp/world", "http://public.example",
    "https://user:secret@a.example", "https://a.example/page", "https://a.example/?secret=yes",
    "https://a.example/#private"]) {
    assert.throws(() => createLivingWebHost({ applications: [
      { origin: "https://valid.example", fetch }, { origin, fetch },
    ] }), TypeError);
  }
  assert.throws(() => createLivingWebHost({ applications: [
    { origin: "https://a.example", fetch }, { origin: "https://A.example:443/", fetch },
  ] }), /Duplicate/u);
  assert.equal(calls, 0);
  const host = createLivingWebHost({ applications: [
    { origin: "https://a.example/", fetch },
    { origin: "http://localhost:8080", fetch },
    { origin: "http://127.0.0.1", fetch },
    { origin: "http://[::1]", fetch },
  ] });
  assert.deepEqual(host.origins, ["https://a.example", "http://localhost:8080", "http://127.0.0.1", "http://[::1]"]);
  assert.ok(Object.isFrozen(host));
  assert.ok(Object.isFrozen(host.origins));
  assert.equal(calls, 0);
});

test("exact origins retain independent application authority and reject foreign requests first", async () => {
  const calls = [];
  const application = origin => ({ origin, fetch(request) {
    calls.push([origin, request]);
    return new Response(origin + new URL(request.url).pathname, {
      status: 202, headers: { "content-type": "application/custom", "cache-control": "private, no-store" },
    });
  } });
  const host = createLivingWebHost({ applications: [
    application("https://a.example"), application("https://b.example"),
  ] });
  for (const origin of host.origins) {
    const request = new Request(origin + "/live", { headers: { accept: "application/custom" } });
    const response = await host.fetch(request);
    assert.equal(response.status, 202);
    assert.equal(response.headers.get("content-type"), "application/custom");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(await response.text(), origin + "/live");
    assert.equal(calls.at(-1)[1], request);
  }
  for (const url of ["https://unknown.example/", "https://unknown.example/%broken",
    "http://a.example/", "https://a.example:444/"]) {
    const response = await host.fetch(new Request(url, { headers: {
      host: "a.example", "x-forwarded-host": "b.example", "x-forwarded-proto": "https",
    } }));
    assert.equal(response.status, 421);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(await response.text(), "");
  }
  assert.equal(calls.length, 2);
});

test("the admitted handler and origin cannot be rebound by mutating input configuration", async () => {
  const application = { origin: "https://a.example", current: "first", fetch() {
    return new Response(this.current);
  } };
  const applications = [application];
  const host = createLivingWebHost({ applications });
  application.current = "second";
  application.origin = "https://stolen.example";
  application.fetch = () => new Response("replaced");
  applications.push({ origin: "https://b.example", fetch: () => new Response("new") });
  assert.equal(await (await host.fetch(new Request("https://a.example/"))).text(), "second");
  assert.equal((await host.fetch(new Request("https://stolen.example/"))).status, 421);
  assert.equal((await host.fetch(new Request("https://b.example/"))).status, 421);
});

test("application methods, bodies and Web execution context reach the admitted source", async () => {
  const capabilities = Object.freeze({ identity: "source-owned" });
  const execution = { capabilities, remoteAddress: "127.0.0.9", httpVersion: "2.0", now: () => 123, nonce: () => "same-request" };
  const calls = [];
  const host = createLivingWebHost({ applications: [{ origin: "https://a.example", async fetch(request, context) {
    calls.push(request.method);
    assert.equal(context.capabilities, capabilities);
    assert.equal(context.remoteAddress, execution.remoteAddress);
    assert.equal(context.httpVersion, execution.httpVersion);
    assert.equal(context.now(), execution.now());
    assert.equal(context.nonce(), execution.nonce());
    return new Response(await request.text(), { status: 201, headers: { "x-application": "retained" } });
  } }] });
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    const response = await host.fetch(new Request("https://a.example/original", { method, body: method }), execution);
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("x-application"), "retained");
    assert.equal(await response.text(), method);
  }
  assert.deepEqual(calls, ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
});

test("generic host construction loads no Node listener or rendering dependency", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../src/host.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from\s+["'](?:node:|@red-cup-engineering\/tufte|@red-cup-engineering\/computer-web-server\/node)/u);
  assert.doesNotMatch(source, /activitypub|moose/iu);
});

test("listener refuses unadmitted hosts and unsafe proxy settings before opening a socket", async () => {
  const host = createLivingWebHost({ applications: [{ origin: "https://a.example", fetch: () => new Response("source") }] });
  await assert.rejects(serveLivingWebHost({ origins: host.origins, fetch: host.fetch }), /admitted host/u);
  await assert.rejects(serveLivingWebHost(host, { hostname: "0.0.0.0", port: 0, trustProxy: true }), /loopback/u);
  for (const options of [{ port: -1 }, { port: 65536 }, { port: "8000" }, { trustProxy: "true" }, { hostname: "" }]) {
    await assert.rejects(serveLivingWebHost(host, options), /hostname, port and boolean/u);
  }
});

test("real Web Node transport admits trusted origins, preserves context and closes the listener", async () => {
  let calls = 0;
  const host = createLivingWebHost({ applications: ["a", "b"].map(name => ({
    origin: `https://${name}.example`, fetch(request, context) {
      calls++;
      assert.equal(context.remoteAddress, "127.0.0.1");
      assert.equal(context.httpVersion, "1.1");
      return new Response(name + ":" + new URL(request.url).pathname);
    },
  })) });
  const running = await serveLivingWebHost(host, { hostname: "127.0.0.1", port: 0, trustProxy: true });
  assert.ok(running.port > 0);
  try {
    const url = `http://127.0.0.1:${running.port}/source`;
    for (const name of ["a", "b"]) {
      const response = await fetch(url, { headers: { "x-forwarded-host": `${name}.example`, "x-forwarded-proto": "https" } });
      assert.equal(response.status, 200);
      assert.equal(await response.text(), name + ":/source");
    }
    const wrong = await fetch(url, { headers: { "x-forwarded-host": "other.example", "x-forwarded-proto": "https" } });
    assert.equal(wrong.status, 421);
    assert.equal(calls, 2);
  } finally {
    await running.close();
  }
  assert.equal(running.server.listening, false);
  await running.close();
});

test("direct loopback transport ignores forged forwarding headers", async () => {
  let calls = 0;
  const host = createLivingWebHost({ applications: [{ origin: "http://localhost", fetch() {
    calls++; return new Response("direct");
  } }] });
  const running = await serveLivingWebHost(host, { hostname: "127.0.0.1", port: 0 });
  try {
    const url = `http://127.0.0.1:${running.port}/`;
    const request = headers => new Promise((resolve, reject) => {
      const call = requestHttp(url, { headers }, response => {
        const chunks = [];
        response.on("data", chunk => chunks.push(chunk));
        response.on("end", () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString() }));
        response.on("error", reject);
      });
      call.on("error", reject);
      call.end();
    });
    const response = await request({
      host: "localhost", "x-forwarded-host": "attacker.example", "x-forwarded-proto": "https",
    });
    assert.equal(response.status, 200);
    assert.equal(response.body, "direct");
    const unadmitted = await request({
      host: "attacker.example", "x-forwarded-host": "localhost", "x-forwarded-proto": "http",
    });
    assert.equal(unadmitted.status, 421);
    assert.equal(calls, 1);
  } finally {
    await running.close();
  }
});
