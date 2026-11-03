# Image workbench

This runnable example composes the original public image, Metrologic, XML and
SHP APIs. Its scenario is explicitly synthetic: four initial claim IDs and one
derived ID demonstrate all four readings. It is not a report of live
observations, a camera experiment or a claim of compatibility with another
optical format.

## Build one offline file

With this package's exact declared development providers available:

```sh
npm run example:images -- ./dist/image-workbench.html
```

The builder also works directly:

```sh
node scripts/build-image-workbench.mjs ./dist/image-workbench.html
```

`buildImageWorkbench({outputPath})` is exported from the same builder for an
original source or packed-provider receiver. The default destination is
`./dist/image-workbench.html`, relative to the caller's working directory. The
builder writes a neighboring `.receipt.json` containing actual output hashes,
input-module hashes, original image identities, measured payload sizes and the
successful SHP CloudEvent receiving result. It performs no installation or
network requests.

Open the HTML file in a modern browser. It contains its images, styles and
compiled application. There are no remote fonts, scripts, image URLs or fetched
identifiers. The original `esbuild` browser resolver preserves importer-local
dependencies, including the distinct JSON provider versions selected by
Serialized Content and SHP. The compiled program is carried in a Base64 data
URL, so literal HTML/script strings inside the original writers cannot change
the surrounding HTML parser's state.

## Actual operations

| Workbench action | Original owner |
| --- | --- |
| Compute the example result | Metrologic `readingSettlement.settle` |
| Project, read and verify the radial | XML `svg/radial` |
| Admit and receive SVG metadata | XML `svg/data-carrier` |
| Encode, render and scan FOUR optical symbols | Serialized Content `optical-four`, using Data's original FOUR records |
| Produce compact indexed PNG and carry exact bytes | Serialized Content `png-carrier` and `image-payload` |
| Package images and descriptions | SHP `image-materials` and `write` |
| Qualify the complete image packet as a CloudEvent | SHP `json-event` and its original strict receiver |

The default PNG has two independent transports. Its pixels encode the real
57-byte source NI as a FOUR optical symbol. Its private metadata chunk carries
the same complete canonical CBOR source-and-view payload as the radial SVG.
The native indexed optical renderer supplies indices and its original RGB
palette directly to the native indexed PNG writer. There is no quantization,
reimplemented color algebra or second PNG encoder in this example.

The inspector receives embedded bytes and optical pixels separately. A PNG
with both transports can recover both the complete CBOR source and its optical
identifier. An ordinary JPEG can recover the optical identifier through Canvas
RGBA and the original scanner. A photograph or re-encoding that removes file
metadata does not carry the full CBOR source. The identifier needs an existing
resolver or retained source bytes; the workbench never fetches it.

For a recognized CBOR settlement payload, the original
`readSettlementRadialPayload` admits its source and view, then
`projectSettlementRadial` reconstructs the SVG. The workbench displays the
received source identity and offers that regenerated SVG. Unknown payloads
remain downloadable exact bytes, without a claim that they describe a
settlement.

## Receiving the actual browser artifact

The committed receiver uses an already installed Playwright runtime and
Chromium. It does not download either:

```sh
PLAYWRIGHT_MODULE_URL=file:///absolute/path/to/playwright/index.mjs \
WORKBENCH_BROWSER_EXECUTABLE=/absolute/path/to/chromium \
node examples/image-workbench.receiving.mjs \
  ./dist/image-workbench.html ./receiving/image-workbench
```

When `playwright` resolves normally, `PLAYWRIGHT_MODULE_URL` may be omitted.
When Playwright's browser is already installed, its executable override may be
omitted. The receiver checks actual file downloads and signatures, exact SVG
and PNG bytes, PNG-to-source-to-identical-SVG recovery, ordinary JPEG optical
recovery, automatic profile capacity selection, overflow refusal, an ordinary
image without a symbol, active SVG refusal, a JavaScript-disabled SHP display,
and desktop/mobile rendering. It records page errors and HTTP requests and
requires both to be empty.

## Deliberate limits

The workbench uses the original owners' finite image and payload budgets. It
does not execute recovered content, treat an NI as authorization, infer a
payload's media type from optical bytes, request a camera or replace the
original scanner's refusal with a guessed result. It displays complete
recovered bytes as hexadecimal and offers a binary download; a UTF-8 preview
is labeled as a preview and reports invalid UTF-8 honestly.

The static settlement image and three original downloads remain available
when the interactive application cannot run. The SHP packet itself displays
its images and descriptions without JavaScript. An integrity check establishes
byte consistency, not authorship or truth of a claim.
