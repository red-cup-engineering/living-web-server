import { startWebServer } from "@red-cup-engineering/computer-web-server/node";
export { createLivingWebServer } from "./fetch.mjs";

/** Reuse the ONE Node HTTP transport, not a Living-Web-specific listener. */
export async function serveLivingWebServer(application, {
  hostname = "127.0.0.1", port = 8000, trustProxy = false,
} = {}) {
  if (typeof application?.fetch !== "function" || typeof application?.origin !== "string") {
    throw new TypeError("Living Web Server requires an admitted application");
  }
  if (trustProxy && !["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname)) {
    throw new TypeError("Trusted proxy input requires the original loopback listener");
  }
  return startWebServer(application, { host: hostname, port, trustProxy });
}
