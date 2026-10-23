import { createTufteApplication, tuftePage } from "@red-cup-engineering/web-page-tiling-engine/application";

/**
 * Living Web Server: the live TUFTE application platform. Consumers provide
 * authorized source readers, never pre-rendered cached worlds or a competing
 * HTTP router. Calling fetch re-reads the original source for each page.
 *
 * MOOSE is one consumer; unrelated applications can contribute their pages.
 */
function canonicalOrigin(input) {
  const uri = new URL(input);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname);
  if ((uri.protocol !== "https:" && !(loopback && uri.protocol === "http:")) ||
      uri.username || uri.password || uri.pathname !== "/" || uri.search || uri.hash) {
    throw new TypeError("Living Web Server origin must be a canonical HTTPS origin (or loopback HTTP)");
  }
  return uri.origin;
}

const hidden = () => new Response(null, {
  status: 404, headers: { "cache-control": "no-store" },
});

export function createLivingWebServer({
  origin, home, pages = [], authorizePublicRead, document = {},
} = {}) {
  const base = canonicalOrigin(origin);
  if (typeof authorizePublicRead !== "function") {
    throw new TypeError("Living Web Server requires an original source-owned public-read authority");
  }
  if (home !== undefined && typeof home !== "function") throw new TypeError("Living Web home must read source data");
  if (!Array.isArray(pages) || pages.some(page =>
    !page || typeof page !== "object" || typeof page.read !== "function" || page.match === undefined)) {
    throw new TypeError("Living Web pages need original source readers and route declarations");
  }
  // A source-origin TUFTE publication may return already-rendered RSS, Atom,
  // CSS, JSON Feed, sitemap XML or a Markdown representation. Declare the
  // exact media types to the *existing* TUFTE/HTTP resource engine, not an
  // extra router or a second renderer.
  const mediaTypes = page => {
    if (page.produces === undefined) return null;
    if (!Array.isArray(page.produces) || page.produces.length < 1 ||
        page.produces.length > 4 || page.produces.some(type =>
          typeof type !== "string" ||
          !/^[a-z][a-z0-9!#$&^_.+-]*\/[a-z][a-z0-9!#$&^_.+-]*$/u.test(type)) ||
        new Set(page.produces).size !== page.produces.length) {
      throw new TypeError("Living Web representation types require distinct exact MIME names");
    }
    return Object.freeze([...page.produces]);
  };
  const declared = pages.map(page => ({ page, produces: mediaTypes(page) }));
  const toPage = (read, identity, produces = null) => async context => {
    // Origin is admitted before any reader or identity check is called.
    if (await authorizePublicRead({ context, resource: identity }) !== true) return hidden();
    const current = await read(context);
    if (current === null || current === undefined) return hidden();
    if (current instanceof Response) {
      // A passthrough declaration may never lie about its upstream bytes.
      if (produces && current.ok) {
        const contentType = current.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
        if (!produces.includes(contentType)) {
          throw new TypeError("Living Web source returned a different media type than its declared representation");
        }
      }
      return current;
    }
    if (produces) {
      throw new TypeError("Living Web represented source must return an original Response");
    }
    // TUFTE alone owns HTML, content negotiation, accessibility, and models.
    return tuftePage(current, { enhance: false });
  };
  const declarations = [
    ...(home === undefined ? [] : [{ match: "/", load: toPage(home, "home") }]),
    ...declared.flatMap(({ page, produces }, index) => produces ? [] : [{
      match: page.match,
      load: toPage(page.read, page.name ?? `page-${index + 1}`),
    }]),
  ];
  const resources = declared.flatMap(({ page, produces }, index) => !produces ? [] : [{
    match: page.match,
    methods: ["GET"],
    produces,
    handler: toPage(page.read, page.name ?? `page-${index + 1}`, produces),
  }]);
  const app = createTufteApplication({
    pages: declarations, resources, enhance: false, document,
  });
  return Object.freeze({
    origin: base,
    // An unrecognized host must not use a different site's content authority.
    fetch(request) {
      if (new URL(request.url).origin !== base) {
        return new Response(null, { status: 421, headers: { "cache-control": "no-store" } });
      }
      return app.fetch(request);
    },
  });
}

