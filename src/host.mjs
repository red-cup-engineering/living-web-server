import { createWebServer } from "@red-cup-engineering/computer-web-server";
import { canonicalOrigin } from "./origin.mjs";

// Keep the compiled Web Server with the admitted public application. A Fetch
// handler alone is not a compiled Web Server and cannot bind its Node adapter.
const compiledHosts = new WeakMap();

const misdirected = () => new Response(null, {
  status: 421, headers: { "cache-control": "no-store" },
});

function executionContext(context) {
  return {
    capabilities: context.capabilities,
    ...(context.remoteAddress === undefined ? {} : { remoteAddress: context.remoteAddress }),
    ...(context.httpVersion === undefined ? {} : { httpVersion: context.httpVersion }),
    now: () => context.startedAt,
    nonce: () => context.nonce,
  };
}

/**
 * Host independently admitted Fetch applications with the original Web Server.
 * Application protocols, state, authorization and background workers remain
 * with their owners. No application is a fallback for an unknown origin.
 */
export function createLivingWebHost({ applications } = {}) {
  if (!Array.isArray(applications) || applications.length === 0) {
    throw new TypeError("Living Web host requires one or more Fetch applications");
  }
  const origins = new Set();
  const admitted = applications.map(application => {
    if (!application || typeof application !== "object" || Array.isArray(application) ||
        typeof application.origin !== "string" || typeof application.fetch !== "function") {
      throw new TypeError("Living Web host applications require an origin and fetch function");
    }
    const origin = canonicalOrigin(application.origin);
    if (origins.has(origin)) throw new TypeError("Duplicate Living Web application origin");
    origins.add(origin);
    // Capture the admitted entrypoint; later configuration mutation cannot
    // replace another origin's handler. Its live source remains source-owned.
    return { origin, fetch: application.fetch.bind(application) };
  });
  const specification = Object.freeze({
    // Origin admission precedes path matching and every application callback.
    onRequest: context => origins.has(context.url.origin) ? undefined : misdirected(),
    resources: Object.freeze(admitted.map(application => Object.freeze({
      match: (_path, context) => context.url.origin === application.origin,
      handler: context => application.fetch(context.request, executionContext(context)),
    }))),
  });
  const engine = createWebServer(specification);
  const host = Object.freeze({
    origins: Object.freeze([...origins]),
    fetch: engine.fetch,
  });
  compiledHosts.set(host, engine);
  return host;
}

/** Start the one original Node transport only when a host is commissioned. */
export async function serveLivingWebHost(host, {
  hostname = "127.0.0.1", port = 8000, trustProxy = false,
} = {}) {
  const engine = compiledHosts.get(host);
  if (engine === undefined) throw new TypeError("Living Web listener requires an admitted host");
  if (typeof hostname !== "string" || hostname.length === 0 ||
      !Number.isInteger(port) || port < 0 || port > 65535 || typeof trustProxy !== "boolean") {
    throw new TypeError("Living Web listener requires a hostname, port and boolean proxy policy");
  }
  if (trustProxy && !["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname)) {
    throw new TypeError("Trusted proxy input requires the original loopback listener");
  }
  const { startWebServer } = await import("@red-cup-engineering/computer-web-server/node");
  return startWebServer(engine, { host: hostname, port, trustProxy });
}
