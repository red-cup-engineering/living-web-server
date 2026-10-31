import assert from 'node:assert/strict';
import test from 'node:test';
import { createLivingWebServer } from '../src/fetch.mjs';
import { createLivingWebMarkdownProjection as createTufteMarkdownProjection } from '../src/markdown.mjs';

const request = (origin, path = '/', headers = {}) => new Request(origin + path, { headers: { accept: 'text/markdown', ...headers } });

test('two independent applications receive Markdown from their current authorized source', async () => {
  for (const [origin, title] of [['https://science.example', 'Evidence'], ['https://market.example', 'Offers']]) {
    let source = 'original', reads = 0;
    const app = createLivingWebServer({
      origin, markdown: createTufteMarkdownProjection(),
      authorizePublicRead: ({ context, resource }) => resource === 'home' && context.request.headers.get('x-source') === 'public',
      home: () => { reads++; return { title, tiles: [{ id: 'source', content: source, links: [{ href: '/work/', label: 'Current work' }] }] }; },
    });
    assert.equal((await app.fetch(request(origin))).status, 404);
    assert.equal(reads, 0);
    const first = await app.fetch(request(origin, '/', { 'x-source': 'public' }));
    assert.equal(first.status, 200);
    assert.match(first.headers.get('content-type'), /^text\/markdown/u);
    assert.match(await first.text(), new RegExp(`original[\\s\\S]*Current work\\]\\(${origin}/work/\\)`));
    source = 'changed';
    assert.match(await (await app.fetch(request(origin, '/', { 'x-source': 'public' }))).text(), /changed/u);
    assert.equal(reads, 2);
    assert.equal((await app.fetch(request('https://other.example', '/', { 'x-source': 'public' }))).status, 421);
    assert.equal(reads, 2);
  }
});

test('HTML source authorization, page-specific refusal and publisher policy survive the original boundary', async () => {
  let reads = 0;
  const origin = 'https://publisher.example';
  const app = createLivingWebServer({
    origin, markdown: createTufteMarkdownProjection(),
    authorizePublicRead: ({ context }) => context.request.headers.get('x-source') === 'public',
    pages: [{ name: 'article', match: '/articles/one/', read: () => {
      reads++;
      return new Response('<h1>Source</h1><p><a href="../two/">Next</a></p>', { headers: {
        'content-type': 'text/html', 'content-signal': 'ai-train=no', 'cache-control': 'private, no-store', etag: '"html-only"',
      } });
    } }, { match: '/restricted/', markdown: false, read: () => { throw new Error('Must not read unsupported representation'); } }],
  });
  assert.equal((await app.fetch(request(origin, '/articles/one/'))).status, 404);
  assert.equal(reads, 0);
  const reply = await app.fetch(request(origin, '/articles/one/', { 'x-source': 'public' }));
  assert.equal(await reply.text(), '# Source\n\n[Next](https://publisher.example/articles/two/)');
  assert.equal(reply.headers.get('content-signal'), 'ai-train=no');
  assert.match(reply.headers.get('cache-control'), /no-store/u);
  assert.match(reply.headers.get('vary'), /Accept/iu);
  assert.equal(reply.headers.has('etag'), false);
  assert.equal((await app.fetch(request(origin, '/restricted/', { 'x-source': 'public' }))).status, 406);
  assert.equal(reads, 1);
});

test('plain Living Web consumers stay off by default and retain HTML and JSON', async () => {
  let reads = 0;
  const origin = 'https://plain.example';
  const app = createLivingWebServer({ origin, authorizePublicRead: () => true,
    home: () => { reads++; return { title: 'Plain', tiles: [{ id: 'one', content: 'Current' }] }; } });
  assert.equal((await app.fetch(request(origin))).status, 406);
  assert.equal(reads, 0);
  assert.match(await (await app.fetch(request(origin, '/', { accept: 'text/html' }))).text(), /Current/u);
  assert.equal((await (await app.fetch(request(origin, '/', { accept: 'application/json' }))).json()).title, 'Plain');
  assert.equal(reads, 2);
});
