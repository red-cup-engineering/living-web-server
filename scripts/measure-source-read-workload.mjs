/** Authorized request workload for the original Living Web Server Fetch entry. */
import assert from 'node:assert/strict';
import { request as requestHttp } from 'node:http';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { createLivingWebServer } from '@red-cup-engineering/living-web-server/fetch';
import { publicationHouseThemeOptions, resolveTufteTheme } from '@red-cup-engineering/tufte/theme';

const warmRounds = 5;
const requests = [
  { resource: 'publication', path: '/', accept: 'text/html' },
  { resource: 'live', path: '/readings/', accept: 'text/html' },
  { resource: 'live', path: '/readings/', accept: 'application/json' },
  { resource: 'feed', path: '/feed.xml', accept: 'application/rss+xml' },
];
async function openTransport(app, nodeWire) {
  if (!nodeWire) return {
    async send(request) {
      const response = await app.fetch(request);
      const body = new Uint8Array(await response.arrayBuffer());
      return { status: response.status, headers: response.headers, body, decoded: body };
    },
    close() {},
  };
  const { createWebServer } = await import('@red-cup-engineering/computer-web-server');
  const { startWebServer } = await import('@red-cup-engineering/computer-web-server/node');
  // This isolated measurement uses the original compiled Web/Systems
  // listener directly; it does not claim LWS's optional host is activated.
  const engine = createWebServer({ onRequest: context => app.fetch(context.request) });
  const listener = await startWebServer(engine, { host: '127.0.0.1', port: 0 });
  return {
    send(request) {
      const url = new URL(request.url);
      return new Promise((resolve, reject) => {
        const outgoing = requestHttp({
          host: '127.0.0.1', port: listener.port, path: url.pathname + url.search,
          agent: false, method: request.method,
          headers: { ...Object.fromEntries(request.headers), host: url.host,
            'accept-encoding': 'gzip, br', connection: 'close' },
        }, response => {
          const socket = response.socket;
          const pieces = [];
          response.on('data', bytes => pieces.push(bytes));
          response.on('error', reject);
          response.on('end', () => {
            try {
              const body = Buffer.concat(pieces);
              const coding = response.headers['content-encoding'];
              const decoded = coding === 'gzip' ? gunzipSync(body)
                : coding === 'br' ? brotliDecompressSync(body) : body;
              const wireBytes = socket.bytesRead;
              assert.ok(wireBytes >= body.length);
              resolve({ status: response.statusCode, headers: new Headers(response.headers),
                body, decoded, wireBytes });
            } catch (error) { reject(error); }
          });
        });
        outgoing.on('error', reject);
        outgoing.setTimeout(3_000, () => outgoing.destroy(Error('workload request timed out')));
        outgoing.end();
      });
    },
    close() { return listener.close(100); },
  };
}

async function workload(theme, shared = false, nodeWire = false) {
  const origin = nodeWire ? 'http://127.0.0.1' : 'https://workload.example.test';
  const otherOrigin = nodeWire ? 'http://localhost' : 'https://other.example.test';
  const authorizeCalls = [];
  const html = new Map();
  const otherRepresentations = new Map();
  const themeAsset = {
    resource: 'house-theme', path: '/styles.css', accept: 'text/css',
  };
  let stylesheet;
  const readCalls = [];
  let revision = 1;
  let validated = false;
  const marker = (resource) => resource + '-source-v' + revision;
  const readPage = (resource) => () => {
    readCalls.push(resource);
    return {
      title: resource === 'publication' ? 'Publication index' : 'Current readings',
      tiles: [{ id: 'readout', title: 'Source revision', content: marker(resource) }],
    };
  };
  const app = createLivingWebServer({
    origin,
    document: theme === undefined ? {} : publicationHouseThemeOptions({
      tufteTheme: theme.name, tufteThemeStylesheet: shared,
    }),
    authorizePublicRead({ resource }) {
      authorizeCalls.push(resource);
      // The controlled CSS is a separately public, fixed presentation resource
      // with no reader data. Publishing it does not authorize any page.
      return resource === themeAsset.resource ? shared : validated;
    },
    home: readPage('publication'),
    pages: [{
      name: 'live',
      match: '/readings/',
      read: readPage('live'),
    }, {
      name: 'feed',
      match: '/feed.xml',
      produces: ['application/rss+xml'],
      read() {
        readCalls.push('feed');
        return new Response('<rss version="2.0"><channel><title>' + marker('feed') +
          '</title><link>' + origin + '/</link><description>Workload fixture</description></channel></rss>', {
          headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
        });
      },
    }, ...(shared ? [{
      name: themeAsset.resource, match: themeAsset.path, produces: [themeAsset.accept],
      read() {
        readCalls.push(themeAsset.resource);
        return new Response(theme.styles, { headers: {
          'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store',
        } });
      },
    }] : [])],
  });

  const transport = await openTransport(app, nodeWire);
  async function observe({ resource, path, accept }, phase, index, status = 200) {
    const url = new URL(path, phase === 'foreign-origin' ? otherOrigin : origin);
    const request = new Request(url, { headers: { accept } });
    const before = { authorization: authorizeCalls.length, read: readCalls.length };
    const start = performance.now();
    const cpuStart = process.cpuUsage();
    const response = await transport.send(request);
    const bytes = response.body;
    const cpu = process.cpuUsage(cpuStart);
    const wallMs = performance.now() - start;
    const authorization = authorizeCalls.slice(before.authorization);
    const reads = readCalls.slice(before.read);
    const expectedAuthorityName = resource === 'publication' ? 'home' : resource;
    const mediaType = response.headers.get('content-type')?.split(';')[0] ?? null;
    assert.equal(response.status, status, phase + ' ' + accept);
    assert.deepEqual(authorization, status === 421 ? [] : [expectedAuthorityName]);
    assert.deepEqual(reads, status === 200 ? [resource] : []);
    if (status === 200) {
      assert.equal(mediaType, accept);
      const content = new TextDecoder().decode(response.decoded);
      if (resource === themeAsset.resource) {
        assert.equal(content, theme.styles);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        stylesheet = content;
      } else {
        assert.ok(content.includes(marker(resource)), 'the response must use the current source');
        if (revision > 1) assert.ok(!content.includes(resource + '-source-v' + (revision - 1)), 'no previous revision');
        const key = JSON.stringify([phase, index, resource]);
        if (accept === 'text/html') {
          assert.ok(content.includes('href="#tufte-content"'), 'skip link remains available');
          if (theme) html.set(key, content);
        } else if (theme) {
          otherRepresentations.set(key, content);
        }
      }
    } else {
      assert.equal(bytes.length, 0);
      assert.match(response.headers.get('cache-control') ?? '', /no-store/);
    }
    return {
      phase, sample: index, resource, accept, status, mediaType,
      responseBodyBytes: bytes.length,
      ...(nodeWire ? { responseSocketBytes: response.wireBytes } : {}),
      contentEncoding: response.headers.get('content-encoding'),
      authorizationCalls: authorization.length, sourceReads: reads.length,
      wallMs, processCpuMicros: cpu.user + cpu.system,
    };
  }

  try {
    const samples = [];
    // Each application is created only once. Cold denotes the first authorized request per
    // resource/representation that reaches the reader, not cold Node startup or cold disk.
    for (const request of requests) samples.push(await observe(request, 'private', 1, 404));
    validated = true;
    let assetVisits = 0;
    const authorized = async (phase, index) => {
      for (const request of requests) {
        samples.push(await observe(request, phase, index));
        if (shared && request.accept === 'text/html') {
          const visit = ++assetVisits;
          samples.push(await observe(themeAsset, visit === 1 ? 'stylesheet-cold' : 'stylesheet-repeat', visit));
        }
      }
    };
    await authorized('cold-authorized', 1);
    for (let i = 1; i <= warmRounds; i++) await authorized('warm-authorized', i);
    revision += 1;
    await authorized('changed-source', 1);
    validated = false;
    for (const request of requests) samples.push(await observe(request, 'revoked', 1, 404));
    for (const request of requests) samples.push(await observe(request, 'foreign-origin', 1, 421));

    const phases = {};
    for (const sample of samples) {
      const total = phases[sample.phase] ??= {
        requests: 0, sourceReads: 0, authorizationCalls: 0, responseBodyBytes: 0,
        wallMs: 0, processCpuMicros: 0,
        ...(nodeWire ? { responseSocketBytes: 0 } : {}),
      };
      total.requests++;
      total.sourceReads += sample.sourceReads;
      total.authorizationCalls += sample.authorizationCalls;
      total.responseBodyBytes += sample.responseBodyBytes;
      if (nodeWire) total.responseSocketBytes += sample.responseSocketBytes;
      total.wallMs += sample.wallMs;
      total.processCpuMicros += sample.processCpuMicros;
    }
    return { html, otherRepresentations, stylesheet, report: {
      kind: 'living-web-fetch-source-read-workload',
      version: 1, nodeVersion: process.version, transport: nodeWire ? 'http1-loopback' : 'in-process-fetch',
      fixture: 'publication-and-live-readings',
      warmRounds, physicalPowerMetered: false, networkCompressionMeasured: nodeWire,
      phases, samples,
    } };
  } finally {
    await transport.close();
  }
}

function compare(inline, shared, theme) {
  const stylesheetLink = '<link rel="stylesheet" href="/styles.css">';
  assert.deepEqual([...inline.html.keys()], [...shared.html.keys()]);
  assert.deepEqual([...shared.otherRepresentations.keys()], [...inline.otherRepresentations.keys()]);
  const shellPairs = new Set();
  for (const [key, baseline] of inline.otherRepresentations) {
    const candidate = shared.otherRepresentations.get(key);
    if (JSON.parse(key)[2] === 'feed') {
      assert.equal(candidate, baseline, 'RSS bytes must not change');
    } else {
      // TUFTE derives the shell fingerprint from the document options. It
      // must distinguish inline/shared delivery while the source model agrees.
      const { shell: inlineShell, ...inlineModel } = JSON.parse(baseline);
      const { shell: sharedShell, ...sharedModel } = JSON.parse(candidate);
      assert.match(inlineShell, /^[0-9a-f]{64}$/u);
      assert.match(sharedShell, /^[0-9a-f]{64}$/u);
      assert.notEqual(inlineShell, sharedShell);
      assert.deepEqual(sharedModel, inlineModel, 'JSON source model must not change');
      shellPairs.add(JSON.stringify([inlineShell, sharedShell]));
    }
  }
  assert.equal(shellPairs.size, 1);
  const [inlineShell, sharedShell] = JSON.parse([...shellPairs][0]);
  for (const [key, baseline] of inline.html) {
    const candidate = shared.html.get(key);
    assert.ok(baseline.includes('data-tufte-theme="' + theme + '"'));
    assert.ok(!baseline.includes(stylesheetLink));
    assert.ok(candidate.includes(stylesheetLink));
    const stylesInOrder = (markup, external) => {
      const head = markup.slice(0, markup.indexOf('</head>'));
      return [...head.matchAll(/<style[^>]*>([^]*?)<\/style>|<link rel="stylesheet" href="\/styles\.css">/gu)]
        .map((entry) => entry[1] ?? external).join('');
    };
    assert.ok(stylesInOrder(candidate, shared.stylesheet) === stylesInOrder(baseline, ''),
      'the shared link must preserve authored CSS and nonce layout rules in cascade order');
    assert.equal(candidate.slice(candidate.indexOf('<body')), baseline.slice(baseline.indexOf('<body')),
      'theme delivery must not change the rendered body');
  }
  const summarize = (run) => {
    const samples = run.report.samples;
    const html = samples.filter((row) => row.mediaType === 'text/html');
    return {
      requests: samples.length,
      sourceReads: samples.reduce((total, row) => total + row.sourceReads, 0),
      authorizationCalls: samples.reduce((total, row) => total + row.authorizationCalls, 0),
      responseBodyBytes: samples.reduce((total, row) => total + row.responseBodyBytes, 0),
      ...(run.report.networkCompressionMeasured ? {
        responseSocketBytes: samples.reduce((total, row) => total + row.responseSocketBytes, 0),
      } : {}),
      firstHtmlAndCssBytes: html[0].responseBodyBytes +
        (samples.find((row) => row.phase === 'stylesheet-cold')?.responseBodyBytes ?? 0),
      htmlViews: html.length,
    };
  };
  const cssBytes = shared.report.phases['stylesheet-cold'].responseBodyBytes;
  const baseline = summarize(inline);
  const withoutReuse = summarize(shared);
  const repeatedAssets = shared.report.phases['stylesheet-repeat'];
  assert.equal(repeatedAssets.requests, withoutReuse.htmlViews - 1);
  return {
    kind: 'living-web-fetch-house-theme-comparison',
    version: 1, theme,
    dispatchedStylesheetRequests: 'one initial request plus a separate actual request for every later HTML page',
    networkCompressionMeasured: inline.report.networkCompressionMeasured, physicalPowerMetered: false,
    measuredStylesheetBodyBytes: cssBytes,
    tufteShellFingerprints: { inline: inlineShell, shared: sharedShell },
    baseline, withoutReuse,
    unchangedRevalidationBodyProjection: {
      assumption: 'Every repeat stylesheet request returns 304 on unchanged bytes. Not executed in this fixture.',
      requests: withoutReuse.requests,
      responseBodyBytes: withoutReuse.responseBodyBytes - repeatedAssets.responseBodyBytes,
    },
    inline: inline.report, shared: shared.report,
  };
}

const args = process.argv.slice(2);
const nodeWire = args.includes('--node-wire');
const compareTheme = args.includes('--compare-house-theme');
if (new Set(args).size !== args.length || args.some(
  argument => !['--node-wire', '--compare-house-theme'].includes(argument))) {
  throw new TypeError('Usage: measure-source-read-workload.mjs [--compare-house-theme] [--node-wire]');
}
if (compareTheme) {
  const theme = resolveTufteTheme('early-mac');
  const inline = await workload(theme, false, nodeWire);
  const shared = await workload(theme, true, nodeWire);
  console.log(JSON.stringify(compare(inline, shared, theme.name), null, 2));
} else {
  console.log(JSON.stringify((await workload(undefined, false, nodeWire)).report, null, 2));
}
