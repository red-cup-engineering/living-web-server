import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { createLivingWebServer } from '@red-cup-engineering/living-web-server/fetch';
import { createLivingWebMarkdownProjection } from '@red-cup-engineering/living-web-server/markdown';

const origin='https://example.test';
const req=(path,accept,{method='GET',allowed=true,host=origin}={})=>new Request(host+path,{
  method,headers:{accept,...(allowed?{'x-fixture-public-read':'yes'}:{})},
});
const authority=({context})=>context.request.headers.get('x-fixture-public-read')==='yes';

test('authorized repeated reads negotiate the current representation without affecting another application', async () => {
  let pageReads=0, secondReads=0;
  const config={
    origin,
    authorizePublicRead:authority,
    home:()=>new Response(`<article><h1>Edition ${++pageReads}</h1><p><a href="./source">Original material</a></p></article>`,{
      headers:{'content-type':'text/html; charset=utf-8','content-signal':'search=yes, ai-train=no',
        'cache-control':'private, must-revalidate','content-digest':'sha-256=:AAAA:',
        'content-security-policy':"default-src 'self'",vary:'Origin',etag:'"html-only"'},
    }),
    pages:[{match:'/model',name:'model',read:()=>({title:'Native model',tiles:[]})}],
  };
  const selected=createLivingWebServer({...config,markdown:createLivingWebMarkdownProjection()});
  const nonOptIn=createLivingWebServer({...config,home:()=>{secondReads++;return new Response('<p>Second application</p>',{
    headers:{'content-type':'text/html'},
  });}});
  const refused=await selected.fetch(req('/','text/markdown',{allowed:false}));
  assert.equal(refused.status,404);
  assert.equal(refused.headers.get('cache-control'),'no-store');
  assert.equal((await selected.fetch(req('/','text/markdown',{host:'https://elsewhere.test'}))).status,421);
  assert.equal(pageReads,0);
  const first=await selected.fetch(req('/','text/markdown, text/html;q=0.4'));
  assert.equal(first.status,200);
  assert.match(first.headers.get('content-type'),/^text\/markdown/u);
  assert.equal(first.headers.get('content-signal'),'search=yes, ai-train=no');
  assert.equal(first.headers.get('cache-control'),'private, must-revalidate');
  assert.equal(first.headers.get('content-security-policy'),"default-src 'self'");
  assert.deepEqual(new Set(first.headers.get('vary').split(',').map(v=>v.trim().toLowerCase())),new Set(['origin','accept']));
  for(const key of ['etag','content-digest','content-length']) assert.equal(first.headers.has(key),false);
  assert.match(await first.text(),/# Edition 1\n\n\[Original material\]\(https:\/\/example\.test\/source\)/u);
  const original=await selected.fetch(req('/','text/html;q=0.9, text/markdown;q=0'));
  assert.match(original.headers.get('content-type'),/^text\/html/u);
  assert.match(await original.text(),/<h1>Edition 2<\/h1>/u);
  const head=await selected.fetch(req('/','text/markdown',{method:'HEAD'}));
  assert.equal(head.status,200);
  assert.equal(head.body,null);
  assert.match(head.headers.get('content-type'),/^text\/markdown/u);
  const options=await selected.fetch(req('/','text/markdown',{method:'OPTIONS'}));
  assert.match(options.headers.get('allow'),/GET/u);
  const json=await selected.fetch(req('/model','application/json'));
  assert.equal((await json.json()).title,'Native model');
  assert.equal((await nonOptIn.fetch(req('/','text/markdown'))).status,406);
  assert.equal((await nonOptIn.fetch(req('/','text/html'))).status,200);
  assert.equal(secondReads,1);
});

test('decompressed HTML and publisher refusal fail closed in the original receiving path', async () => {
  const source=gzipSync(Buffer.from('<p>'+ 'a'.repeat(2048) +'</p>'));
  assert.ok(source.length < 128);
  const app=createLivingWebServer({
    origin,authorizePublicRead:authority,
    markdown:createLivingWebMarkdownProjection({maximumBytes:128}),
    home:()=>new Response(source,{headers:{'content-type':'text/html','content-encoding':'gzip'}}),
    pages:[{match:'/restricted',read:()=>new Response('<p>Protected format</p>',{headers:{
      'content-type':'text/html','cache-control':'no-transform',
    }})}],
  });
  const over=await app.fetch(req('/','text/markdown'));
  assert.equal(over.status,413);
  assert.equal(over.body,null);
  const noTransform=await app.fetch(req('/restricted','text/markdown'));
  assert.equal(noTransform.status,406);
  assert.equal(noTransform.body,null);
  assert.equal(noTransform.headers.get('cache-control'),'no-store');
});
