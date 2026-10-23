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

## Source

`createLivingWebServer({ origin, authorizePublicRead, home, pages })`
provides an embeddable Fetch application. `serveLivingWebServer(application,
{hostname, port, trustProxy})` binds it through the original shared listener.
A commissioning domain must authorize an actual publicly releasable source;
a browser Accept header alone does not grant that source.

The package is currently private source in the Web Engineering corpus, not a
published registry artifact or an installed public application. Its native tests
require the stated package closure. Promoting the source into a standalone
package owner must preserve its export and its consumers.

## Original TUFTE/MOOSE publication representations

The original Living Web Server already accepts a source-reader `pages` list.
An editor-accepted TUFTE publication may return **an original `Response`**
for feeds and other non-HTML resources rather than a new page model. Such
pages declare `produces: ["application/rss+xml"]`, for example, and the
existing TUFTE/HTTP application now admits that precise resource in
`resources` with the declared type, instead of forcing the inherited
HTML/JSON page-only negotiation. RSS, Atom, JSON Feed, CSS, sitemap XML,
plain text and Markdown from the **original TUFTE producer** remain responses
with their original bytes, status and media type.

`authorizePublicRead({context,resource})` is still checked **before**
the original source reader is called. The live response must match the
declared `produces` type; a false content-type claim or an attempted
ordinary TUFTE page model as a feed is refused, not relabeled. A route can
choose exact declared MIME types only; it cannot claim wildcards. Public
source acceptance and permission are not implied by page registration.

`test/fetch-boundary.test.mjs` covers source corrections, denied reads,
RSS negotiation, 406 for unsupported Accept, and mismatched representations.
These tests still require the actual qualified TUFTE package and Node engine;
passing a source-only unit fixture cannot establish the installed MOOSE host
or public Science feeds.

## Requested optional Markdown representation — source requirement, not implemented

The [Living Web Server source-owned requirement](data/records/requirements-records/living-web-server-negotiates-authorized-markdown.json) and [original issue #1](https://github.com/red-cup-engineering/living-web-server/issues/1) call for **opt-in** conversion of eligible, independently authorized HTML pages to Markdown when a client selects `Accept: text/markdown`. The Cloudflare Markdown for Agents comparator is documented at [Cloudflare](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/) (Oct 9, 2026). This existing application must **reuse** TUFTE's original representation producer and the shared HTTP negotiation, rather than add its own Accept parser, cache store or data-access privilege. Preserve existing HTML/JSON responses and authorize every original live source read; absence of a publisher Content-Signal is *not* permission to assert AI training rights. The six independent acceptance cells in the new requirement are proposed tests and **currently do not establish implemented behavior**. The broader Web Engineering requirement and native requirement-decomposition gap are separately source-owned.

## Fetch-only installation and transport separation

This source has two actual consumers, not two servers. Edge and Cloudflare
consumers import `@red-cup-engineering/living-web-server/fetch` and need the
original TUFTE application but **not** the Node HTTP listener. The package's
Node transport `@red-cup-engineering/computer-web-server` is therefore an
optional peer dependency (and a dev dependency for this package's native tests),
not a mandatory part of every Worker/edge dependency closure.

An application importing the package root for `serveLivingWebServer` must
install the matching `@red-cup-engineering/computer-web-server@0.6.2`
provider. Source-authored Node tests still use that real provider. Production
edge consumers can install with `--omit=optional`; they must still qualify
the real TUFTE dependency tree and the actual returned HTTP representations.
No second TUFTE renderer, proprietary fallback, or release authority is implied.
