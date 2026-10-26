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
