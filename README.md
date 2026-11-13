# Living Web Server

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

Living Web Server composes current, independently authorized source readers
with the original TUFTE application. TUFTE owns the page model, rendering,
representation negotiation and accessibility; the shared HTTP owner handles
methods and response policy. The optional Computer Web Server owns Node
transport. MOOSE, ASSIST and other applications can use the same Fetch entry.
Applications with multiple independently authorized origins compose through
the generic `./host` capability before reaching the Web Server listener.

## Current source and authority

`createLivingWebServer({origin, authorizePublicRead, home, pages, document})`
returns an application with `fetch(Request)`. `home` and each `page.read`
read current original source. `authorizePublicRead({context, resource})` must
return exactly `true` before any read. A foreign origin refuses before either
reader or authority callback is called. A missing source returns 404.

Readers return an original TUFTE model or an authorized Response. Routes and
content remain with the source application. The same authority governs every
negotiated carrier; an Accept header is never permission to read data.

```js
import { createLivingWebServer } from '@red-cup-engineering/living-web-server/fetch';

const app = createLivingWebServer({
  origin: 'https://example.test',
  authorizePublicRead: ({resource}) => resource === 'home',
  home: () => ({title: 'Current public source', tiles: [{id: 'one', content: 'Welcome.'}]}),
});
```

## Optional authorized Markdown

```js
import { createLivingWebMarkdownProjection } from '@red-cup-engineering/living-web-server/markdown';

// Add to the same original createLivingWebServer configuration:
const representation = {markdown: createLivingWebMarkdownProjection()};
```

Install the exact optional Markdown peer declared by the manifest when choosing
this export. The helper is the original TUFTE capability, re-exported under this
application boundary. Living Web Server adds no converter, HTTP parser, cache,
source mirror or read privilege. HTML/JSON remain available; Markdown is off
by default. Set `markdown: false` on an individual page to keep it off there.

The native negotiator handles `Accept: text/markdown`, weighted preferences,
HEAD and OPTIONS. Actual source URLs resolve relative links. Publisher
Content-Signal, access, security and cache restrictions survive. The chosen
representation varies on Accept, and HTML byte validators, lengths, encodings
and ranges are not reused for Markdown. HTML response bodies and parsed/output
content are bounded. The source application still owns its reader's execution
and deadlines. The representation grants no AI training rights.

The original [requirement](data/records/requirements-records/living-web-server-negotiates-authorized-markdown.json)
and [issue #1](https://github.com/red-cup-engineering/living-web-server/issues/1)
remain the acceptance owners. Native tests receive two application fixtures,
changing original source, denied access, publisher policy and retained
HTML/JSON. Original packaged TUFTE and Markdown tests own the shared codec,
negotiation and bounds. Independently receiving a published package and actual
public application is a separate release operation; source tests do not claim
Cloudflare parity, search rank improvement or economic settlement.

## Declared feed and asset representations

A page may declare `produces` (one to four distinct, exact MIME names, no
wildcards or parameters) when its reader returns an original `Response`, such
as RSS, Atom, JSON Feed, CSS or sitemap XML from the source's own producer.
Living Web Server registers that route as a TUFTE/HTTP resource with exactly
those types, so `Accept` negotiation answers 406 for anything else.

```js
pages: [{match: '/feed.rss.xml', name: 'rss', produces: ['application/rss+xml'],
  read: () => new Response(currentRss(), {headers: {'content-type': 'application/rss+xml; charset=utf-8'}})}]
```

`authorizePublicRead` still runs before the reader. A successful response
whose media type differs from the declaration, or a declared route that
returns a TUFTE model instead of a `Response`, fails rather than being
relabeled. Bytes, status and headers are the source's own.

## Instance themes

`document.theme` takes a TUFTE theme (a `{name, styles, themeColor}` object
or a theme name TUFTE admits) and applies it to every HTML page of the
instance. It is checked when the instance is composed: an unadmitted name or
styles containing a `</style>` breakout throws. JSON and Markdown projections
are unaffected; a theme changes no source data, rights or routes. The check is
not a WCAG or CSS-sandbox guarantee: test contrast, keyboard, zoom and reflow
on rendered pages.

```js
document: {theme: {name: 'field-manual', themeColor: '#775015',
  styles: 'body[data-tufte-theme=field-manual]{--tufte-accent:#775015;}'}}
```

## Transport separation

Edge and Cloudflare consumers use `./fetch`; they need no Node HTTP listener.
An application importing the root for `serveLivingWebServer` installs the
optional `@red-cup-engineering/computer-web-server@0.7.2` peer and calls
`serveLivingWebServer(app, {hostname, port, trustProxy})`. Trusted proxy input
requires the original loopback listener. The optional Markdown export also
imports no Node transport or filesystem source reader.
The selected Web Server peer declares Node 24.2.0 or newer for hosted Node
operation; the portable Fetch entry retains its own manifest requirements.

Native receiving commands and the exact supplier selections are in
`package.json`. The original ASSIST RFC 6068 contact link remains ordinary
source-owned content; neither this application nor the Markdown projection
sends email.

## Hosting independent applications

`./host` provides generic application hosting downstream of Computer Web
Server. MOOSE supplies MUD/social behavior and ActivityPub supplies federation
behavior; Living Web Server owns admission and composition of their Fetch
applications. It imports neither consumer. This keeps one generic hosting
implementation while retaining each application's source and authorization.

```js
import {
  createLivingWebHost, serveLivingWebHost,
} from '@red-cup-engineering/living-web-server/host';

const host = createLivingWebHost({applications: [
  {origin: 'https://science.example', fetch: scienceApplication.fetch},
  {origin: 'https://engineering.example', fetch: engineeringApplication.fetch},
]});

// The original Node listener sits behind a trusted TLS ingress on loopback.
const running = await serveLivingWebHost(host, {
  hostname: '127.0.0.1', port: 8000, trustProxy: true,
});
// The commissioning application owns worker start/stop and custody release.
// await running.close();
```

Pass an existing `{origin, fetch}` application directly when its Fetch method
uses `this`. Admission captures the function with its original receiver.

### Hosting contract and ownership

| Boundary | Contract |
| --- | --- |
| Construction | `createLivingWebHost({applications})` requires a nonempty array of applications, each with an origin string and Fetch function. All origins are admitted before any application is invoked. |
| Identity | The existing Living Web origin rule accepts HTTPS and loopback HTTP, rejects credentials, non-root paths, query strings and fragments, and normalizes to `URL.origin`. Canonically duplicate origins refuse. |
| Result | A frozen `{origins, fetch}` contains frozen admitted origins and the original Web Server's compiled Fetch entry. Later mutations of the input list, origin or Fetch property cannot rebind a route. Applications may continue reading their own changing source. |
| Dispatch | The original Web Server owns resources, method handling, response policy and failures. An exact origin selects one application's Fetch handler. An unknown origin returns 421 with `Cache-Control: no-store` before any source callback; no default site exists. |
| Context | The original Request reaches the selected source. The Web Server's supported execution context is preserved: capabilities by identity, remote address, HTTP version, and request time/nonce through their supplier functions. Arbitrary extra execution fields are not part of the Web Server contract. |
| Transport | `serveLivingWebHost(host, {hostname, port, trustProxy})` requires the original admitted host. It loads and invokes Computer Web Server's Node listener with the retained compiled specification, returning the original `{server, port, address, close}` lifecycle. Port zero permits an ephemeral listener. |
| Proxy trust | `trustProxy` is a boolean and may be true only for a loopback listener. Without that policy, the upstream Node adapter ignores forwarded host/protocol headers. With it, the upstream adapter reconstructs the public origin; unregistered origins still refuse. |
| Application lifetime | The caller owns protocol-specific worker startup, rollback, state and custody. Hosting does not start delivery queues, infer an identity from content, acquire data rights, or release a supplied application's storage. |

The `./host` module does not load TUFTE or Node transport during import or
Fetch application construction. It selects the exact optional Web Server peer
already declared in the manifest; calling `serveLivingWebHost` loads that
peer's Node adapter. Existing `./fetch` consumers remain portable and do not
acquire a mandatory Node dependency. `serveLivingWebServer` now composes its
single application through the same host, supplying the compiled specification
that the original Node listener requires.

The design keeps HTTP routing and listener mechanics in their existing owner.
Duplicating an origin router or listener in MOOSE would split the hosting
contract, while moving ActivityPub into Living Web Server would make a generic
upstream depend on its specialized consumer. A generic host with supplied Fetch
applications meets the dependency direction without either new ownership edge.

`node --test test/host.test.mjs test/transport-boundary.test.mjs` receives
construction refusals, origin isolation, mutation resistance, supported context,
request methods and bodies, a real shared Node listener, proxy admission and
shutdown. `test/application.test.mjs` also receives the existing single-site
listener. Repository tests establish source behavior; package publication,
installed consumer cutover and public deployment are separate verification.


## Recoverable image resources

The optional `./images` capability declares PNG or passive SVG images through
this same source-authorized application. Its exact optional peer is SHP 0.4.0.
An image is received as the existing named SHP material; structure, dimensions
and byte identity are checked before creating the original response.

```js
import { createLivingWebServer } from '@red-cup-engineering/living-web-server/fetch';
import { livingImagePage } from '@red-cup-engineering/living-web-server/images';

const app = createLivingWebServer({
  origin: 'https://observations.example',
  authorizePublicRead: originalSourceAuthority,
  pages: [livingImagePage({
    match: '/settlement.svg', name: 'settlement-image',
    mediaType: 'image/svg+xml', read: readCurrentOriginalImageMaterial,
  })],
});
```

The source is read on each admitted request, after origin, media negotiation
and the existing authority callback. The response preserves the admitted image
bytes and derives content length and ETag from those bytes. Cache policy defaults
to `no-store`; the publisher may supply its own `cacheControl`. No image digest
is used as an authorization. Missing source returns 404, unoffered media 406,
foreign origin 421, and malformed source is refused. The helper adds no router,
image mirror, artifact cache, automatic execution or independent truth store.

`test/images-independent-receiving.test.mjs` runs an actual Metrologic
settlement through XML's source-bearing radial, SHP image material and packet,
and the real Fetch application's SVG/PNG/HTML response paths. The core Fetch
entry remains usable without the optional image peer. The image helper itself
is portable; the Node listener remains the separate existing capability.

### Image workbench

`npm run example:images -- ./dist/image-workbench.html` builds the included
[image workbench](examples/image-workbench.md) into one offline HTML file.
It computes an illustrative settlement through Metrologic, displays a recoverable
SVG, and writes a compact indexed PNG with the same complete CBOR source and
view. Its visible four-color symbol carries the source identifier. The example
can encode text, inspect PNG/SVG payloads, scan PNG/JPEG pixels, regenerate the
original SVG from a PNG payload, and download the images and visible SHP packet.
The complete packet also passes the original CloudEvent producer and reader.

The example and its browser receiver use the declared development providers.
They perform no installation or external fetch. Build receipts record source
modules, artifact identities and actual byte sizes. The receiver checks real
downloads, refusals, mobile layout and JavaScript-disabled packet display.
