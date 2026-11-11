import { createLivingWebHost, serveLivingWebHost } from "./host.mjs";
export { createLivingWebServer } from "./fetch.mjs";

/** Reuse the ONE Node HTTP transport, not a Living-Web-specific listener. */
export async function serveLivingWebServer(application, options = {}) {
  if (typeof application?.fetch !== "function" || typeof application?.origin !== "string") {
    throw new TypeError("Living Web Server requires an admitted application");
  }
  return serveLivingWebHost(createLivingWebHost({ applications: [application] }), options);
}
