# Living Web Server

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

A real independent live-web application platform. Current source readers supply
a fresh model per request; the existing TUFTE engine handles presentation,
content negotiation and accessibility; the existing Computer Web Server binds
HTTP and Node. The caller supplies public-read authorization every time.

This is the lower application imported by MOOSE, not another generic HTTP
implementation, actor store, or a script to render a stale snapshot. The same
creator accepts pages from arbitrary independent applications.

## One application, two host entries

The existing Living Web Server Fetch application can be consumed **without a Node listener** by Workers or other hosts that already own the HTTP boundary:

```js
import { createLivingWebServer } from "@red-cup-engineering/living-web-server/fetch";

const application = createLivingWebServer({
  origin: "https://example.org",
  authorizePublicRead: ({ resource }) => approvedPublicResources.has(resource),
  home: () => readCurrentPublicHome(),
});
// Existing host's fetch adapter calls application.fetch(request).
```

The original package root and `serveLivingWebServer` continue to use the **same** Fetch application while exposing the shared Node listener. The `./fetch` entry has no static Node listener import. Cloudflare-specific asset routes, signed federation handling, deployment credentials and public-read grants remain owned by each commissioned host; this export does not silently install or replace an existing website.

## Source

`createLivingWebServer({ origin, authorizePublicRead, home, pages })`
provides an embeddable Fetch application. `serveLivingWebServer(application,
{hostname, port, trustProxy})` binds it through the original shared listener.
A commissioning domain must authorize an actual publicly releasable source;
a browser Accept header alone does not grant that source.

The source is in its independent Web Engineering package owner, but this change does not establish a newly published registry version or an installed public application. Its native tests
require the stated package closure. Promoting the source into a standalone
package owner must preserve its export and its consumers.

## Requested optional Markdown representation — source requirement, not implemented

The [Living Web Server source-owned requirement](data/records/requirements-records/living-web-server-negotiates-authorized-markdown.json) and [original issue #1](https://github.com/red-cup-engineering/living-web-server/issues/1) call for **opt-in** conversion of eligible, independently authorized HTML pages to Markdown when a client selects `Accept: text/markdown`. The Cloudflare Markdown for Agents comparator is documented at [Cloudflare](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/) (Oct 9, 2026). This existing application must **reuse** TUFTE's original representation producer and the shared HTTP negotiation, rather than add its own Accept parser, cache store or data-access privilege. Preserve existing HTML/JSON responses and authorize every original live source read; absence of a publisher Content-Signal is *not* permission to assert AI training rights. The six independent acceptance cells in the new requirement are proposed tests and **currently do not establish implemented behavior**. The broader Web Engineering requirement and native requirement-decomposition gap are separately source-owned.
