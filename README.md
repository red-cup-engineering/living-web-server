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
optional `@red-cup-engineering/computer-web-server@0.6.2` peer and calls
`serveLivingWebServer(app, {hostname, port, trustProxy})`. Trusted proxy input
requires the original loopback listener. The optional Markdown export also
imports no Node transport or filesystem source reader.

Native receiving commands and the exact supplier selections are in
`package.json`. The original ASSIST RFC 6068 contact link remains ordinary
source-owned content; neither this application nor the Markdown projection
sends email.
