import assert from 'node:assert/strict';
import { transport } from '../src/transport';
import { createPlayer } from '../src/player';
import { isBack } from '../src/remote';
import { orderByLatest, platformForGroup, type PlaylistItem } from '@senju/iptv';
let passed = 0;
async function test(name: string, run: () => void | Promise<void>) {
  await run();
  passed++;
  console.log('✓ ' + name);
}
const item: PlaylistItem = {
  id: 'a',
  name: 'Teste',
  category: 'MOVIE',
  url: 'https://example.test/video.mp4',
};
await test('Voltar reconhece LG, Samsung e navegador', () => {
  for (const keyCode of [461, 10009]) assert.equal(isBack({ key: 'Unidentified', keyCode }), true);
  assert.equal(isBack({ key: 'Escape', keyCode: 27 }), true);
  assert.equal(isBack({ key: 'ArrowLeft', keyCode: 37 }), false);
});
await test('Regras compartilhadas preservam ordenação e plataformas', () => {
  assert.deepEqual(
    orderByLatest([
      { ...item, id: 'old', addedAt: 10 },
      { ...item, id: 'new', updatedAt: 30 },
    ]).map((i) => i.id),
    ['new', 'old'],
  );
  assert.equal(platformForGroup('FILMES | NETFLIX'), 'netflix');
  assert.equal(platformForGroup('Filmes gerais'), undefined);
});
const nativeFetch = globalThis.fetch;
await test('Cancelamento encerra todas as requisições paralelas Xtream', async () => {
  globalThis.fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      const signal = init?.signal!;
      if (signal.aborted) reject(new DOMException('Aborted', 'AbortError'));
      else
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
  try {
    const session = new AbortController(),
      request = transport(session.signal);
    const all = Promise.allSettled([
      request('https://example.test/a', 1000),
      request('https://example.test/b', 1000),
    ]);
    session.abort();
    assert.ok((await all).every((r) => r.status === 'rejected'));
  } finally {
    globalThis.fetch = nativeFetch;
  }
});
await test('Transporte preserva M3U textual e interpreta JSON', async () => {
  try {
    globalThis.fetch = async () => new Response('#EXTM3U\n');
    assert.equal(
      (await transport(new AbortController().signal)('https://example.test', 1000)).data,
      '#EXTM3U\n',
    );
    globalThis.fetch = async () => new Response('[1,2]');
    assert.deepEqual(
      (await transport(new AbortController().signal)('https://example.test', 1000)).data,
      [1, 2],
    );
  } finally {
    globalThis.fetch = nativeFetch;
  }
});
await test('AVPlay prepara antes de reproduzir e encerra recursos', async () => {
  const calls: string[] = [];
  let prepare: (() => void) | undefined,
    ended: (() => void) | undefined,
    endedCount = 0;
  Object.assign(globalThis, {
    window: {
      webapis: {
        avplay: {
          open() {
            calls.push('open');
          },
          setDisplayRect() {},
          setDisplayMethod() {},
          setListener(l: { onstreamcompleted(): void }) {
            ended = l.onstreamcompleted;
          },
          prepareAsync(ok: () => void) {
            prepare = ok;
          },
          play() {
            calls.push('play');
          },
          pause() {},
          seekTo() {},
          stop() {
            calls.push('stop');
          },
          close() {
            calls.push('close');
          },
          getDuration() {
            return 1000;
          },
        },
      },
    },
  });
  const player = createPlayer({} as HTMLVideoElement, {
    time() {},
    ended() {
      endedCount++;
    },
    error() {},
  });
  const open = player.open(item);
  assert.deepEqual(calls, ['open']);
  prepare!();
  await open;
  assert.deepEqual(calls, ['open', 'play']);
  player.dispose();
  ended!();
  assert.equal(endedCount, 0);
  assert.deepEqual(calls, ['open', 'play', 'stop', 'close']);
});
await test('AVPlay rejeita headers não implementados explicitamente', async () => {
  const player = createPlayer({} as HTMLVideoElement, { time() {}, ended() {}, error() {} });
  await assert.rejects(
    player.open({ ...item, httpHeaders: { Referer: 'https://example.test' } }),
    /Headers/,
  );
});
await test('Player LG remove listeners e fonte ao sair', async () => {
  Object.assign(globalThis, { window: {} });
  const calls: string[] = [];
  const video = {
    src: '',
    currentTime: 0,
    duration: 100,
    addEventListener() {},
    removeEventListener() {
      calls.push('remove');
    },
    load() {
      calls.push('load');
    },
    async play() {
      calls.push('play');
    },
    pause() {
      calls.push('pause');
    },
    removeAttribute(name: string) {
      calls.push(name);
    },
  } as unknown as HTMLVideoElement;
  const player = createPlayer(video, { time() {}, ended() {}, error() {} });
  await player.open(item);
  player.dispose();
  assert.equal(calls.filter((c) => c === 'remove').length, 3);
  assert.ok(calls.includes('src'));
  assert.ok(calls.includes('pause'));
});
console.log(`${passed} testes Smart TV passaram. Não substituem validação em hardware.`);
