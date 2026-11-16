/** Authorized request workload for the original Living Web Server Fetch entry. */
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createLivingWebServer } from '@red-cup-engineering/living-web-server/fetch';

const origin = 'https://workload.example.test';
const warmRounds = 5;
const requests = [
  { resource: 'publication', path: '/', accept: 'text/html' },
  { resource: 'live', path: '/readings/', accept: 'text/html' },
  { resource: 'live', path: '/readings/', accept: 'application/json' },
  { resource: 'feed', path: '/feed.xml', accept: 'application/rss+xml' },
];
const authorizeCalls = [];
const readCalls = [];
let revision = 1;
let admitted = false;
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
  authorizePublicRead({ resource }) {
    authorizeCalls.push(resource);
    return admitted;
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
  }],
});

async function observe({ resource, path, accept }, phase, index, status = 200) {
  const url = new URL(path, phase === 'foreign-origin' ? 'https://other.example.test' : origin);
  const request = new Request(url, { headers: { accept } });
  const before = { authorization: authorizeCalls.length, read: readCalls.length };
  const start = performance.now();
  const cpuStart = process.cpuUsage();
  const response = await app.fetch(request);
  const bytes = new Uint8Array(await response.arrayBuffer());
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
    const content = new TextDecoder().decode(bytes);
    assert.ok(content.includes(marker(resource)), 'the response must use the current source');
    if (revision > 1) assert.ok(!content.includes(resource + '-source-v' + (revision - 1)), 'no previous revision');
  } else {
    assert.equal(bytes.length, 0);
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  }
  return {
    phase, sample: index, resource, accept, status, mediaType,
    responseBodyBytes: bytes.length,
    contentEncoding: response.headers.get('content-encoding'),
    authorizationCalls: authorization.length, sourceReads: reads.length,
    wallMs, processCpuMicros: cpu.user + cpu.system,
  };
}

const samples = [];
// Each application is created only once. Cold denotes the first authorized request per
// resource/representation that reaches the reader, not cold Node startup or cold disk.
for (const request of requests) samples.push(await observe(request, 'private', 1, 404));
admitted = true;
for (const request of requests) samples.push(await observe(request, 'cold-authorized', 1));
for (let i = 1; i <= warmRounds; i++) {
  for (const request of requests) samples.push(await observe(request, 'warm-authorized', i));
}
revision += 1;
for (const request of requests) samples.push(await observe(request, 'changed-source', 1));
admitted = false;
for (const request of requests) samples.push(await observe(request, 'revoked', 1, 404));
for (const request of requests) samples.push(await observe(request, 'foreign-origin', 1, 421));

const phases = {};
for (const sample of samples) {
  const total = phases[sample.phase] ??= {
    requests: 0, sourceReads: 0, authorizationCalls: 0, responseBodyBytes: 0,
    wallMs: 0, processCpuMicros: 0,
  };
  total.requests++;
  total.sourceReads += sample.sourceReads;
  total.authorizationCalls += sample.authorizationCalls;
  total.responseBodyBytes += sample.responseBodyBytes;
  total.wallMs += sample.wallMs;
  total.processCpuMicros += sample.processCpuMicros;
}
console.log(JSON.stringify({
  kind: 'living-web-fetch-source-read-workload',
  version: 1, nodeVersion: process.version, transport: 'in-process-fetch',
  fixture: 'publication-and-live-readings',
  warmRounds, physicalPowerMetered: false, networkCompressionMeasured: false,
  phases, samples,
}, null, 2));
