import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const app = resolve(fileURLToPath(new URL('..', import.meta.url))),
  dist = resolve(app, 'dist');
const screenshots = resolve(app, '../../.impeccable/review');
await mkdir(screenshots, { recursive: true });
await mkdir(resolve(app, 'build'), { recursive: true });
const count = 50_000,
  actions = new Map();
const categories = Array.from({ length: 1000 }, (_, n) => ({
  category_id: String(n),
  category_name: (n % 2 ? 'NETFLIX' : 'PRIME VIDEO') + ' | FILMES ' + n,
}));
const movies = JSON.stringify(
  Array.from({ length: count }, (_, n) => ({
    stream_id: n + 1000,
    name: 'Filme ' + n,
    category_id: String(n % 1000),
    stream_icon: '/fixture-poster.svg',
    added: String(1_700_000_000 + n),
  })),
);
const series = {
  series_id: 1,
  name: 'Série de teste',
  category_name: 'NETFLIX | SÉRIES',
  cover: '/fixture-poster.svg',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const action = url.searchParams.get('action');
    if (url.pathname === '/player_api.php') {
      actions.set(action || 'login', (actions.get(action || 'login') || 0) + 1);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      if (!action) {
        res.end(JSON.stringify({ user_info: { status: 'Active' } }));
        return;
      }
      if (action.endsWith('_categories')) {
        res.end(
          JSON.stringify(
            action === 'get_vod_categories'
              ? categories
              : [{ category_id: '1', category_name: 'NETFLIX | SÉRIES' }],
          ),
        );
        return;
      }
      if (action === 'get_vod_streams') {
        res.end(movies);
        return;
      }
      if (action === 'get_live_streams') {
        res.end('[{"stream_id":1,"name":"Canal de teste","category_id":"1"}]');
        return;
      }
      if (action === 'get_series') {
        res.end(JSON.stringify([series]));
        return;
      }
      if (action === 'get_vod_info') {
        assert.notEqual(url.searchParams.get('vod_id'), 'undefined');
        res.end(
          JSON.stringify({
            info: {
              name: 'Filme ' + (Number(url.searchParams.get('vod_id')) - 1000),
              plot: 'Sinopse fornecida pela fonte de teste. '.repeat(15),
              movie_image: origin + '/fixture-poster.svg',
              backdrop_path: [origin + '/fixture-background.svg'],
              genre: 'Drama',
              releasedate: '2025-01-01',
            },
            movie_data: {},
          }),
        );
        return;
      }
      if (action === 'get_series_info') {
        res.end(
          JSON.stringify({
            info: {
              name: 'Série de teste',
              cover: origin + '/fixture-poster.svg',
              plot: 'Uma série fictícia para verificar temporadas, continuidade e foco.',
              backdrop_path: origin + '/fixture-background.svg',
            },
            episodes: {
              1: [1, 2].map((n) => ({
                id: String(n),
                title: 'Episódio ' + n,
                season: 1,
                episode_num: n,
                container_extension: 'mp4',
                info: {
                  plot: 'Descrição do episódio ' + n,
                  movie_image: origin + '/fixture-background.svg',
                },
              })),
              2: [3, 4].map((n) => ({
                id: String(n),
                title: 'Episódio ' + n,
                season: 2,
                episode_num: n - 2,
                container_extension: 'mp4',
                info: {
                  plot: 'Descrição do episódio ' + n,
                  movie_image: origin + '/fixture-background.svg',
                },
              })),
            },
          }),
        );
        return;
      }
      res.end('{}');
      return;
    }
    if (url.pathname.startsWith('/fixture-')) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.end(
        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="600" height="360" fill="#163b27"/><text x="40" y="180" fill="#c2ffd8" font-family="Arial" font-size="40">SENJU · FIXTURE</text></svg>',
      );
      return;
    }
    if (url.pathname.includes('$WEBAPIS')) {
      res.setHeader('Content-Type', 'application/javascript');
      res.end(
        `window.__avCalls=[];window.webapis={avplay:{open(){window.__avCalls.push('open')},setDisplayRect(){},setDisplayMethod(){},setListener(l){window.__avListener=l},prepareAsync(ok){queueMicrotask(ok)},play(){window.__avCalls.push('play')},pause(){window.__avCalls.push('pause')},seekTo(t){window.__avCalls.push('seek:'+t)},stop(){window.__avCalls.push('stop')},close(){window.__avCalls.push('close')},getDuration(){return 600000}}};window.tizen={tvinputdevice:{registerKey(){}}};`,
      );
      return;
    }
    const file = resolve(dist, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(dist + sep)) {
      res.writeHead(403).end();
      return;
    }
    const body = await readFile(file);
    res.setHeader(
      'Content-Type',
      extname(file) === '.js'
        ? 'application/javascript'
        : extname(file) === '.css'
          ? 'text/css'
          : 'text/html',
    );
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const report = {
  environment:
    'Chromium 141 on development PC, synthetic data/media adapters. Not official LG/Samsung simulator or TV.',
  fixture_items: count,
  catalog_workers: 0,
};
try {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('worker', () => report.catalog_workers++);
  await page.addInitScript(() => {
    window.__longTasks = [];
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__longTasks.push(entry.duration);
      }).observe({ entryTypes: ['longtask'] });
    } catch {}
    const positions = new WeakMap();
    Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
      get() {
        return 600;
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
      get() {
        return positions.get(this) || 0;
      },
      set(value) {
        positions.set(this, value);
        this.dispatchEvent(new Event('timeupdate'));
      },
    });
    HTMLMediaElement.prototype.load = function () {};
    HTMLMediaElement.prototype.play = function () {
      this.dispatchEvent(new Event('timeupdate'));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {};
  });
  await page.goto(origin);
  await page.getByLabel('Salvar lista neste dispositivo').waitFor();
  await page.getByLabel('Servidor', { exact: true }).fill(origin);
  await page.getByLabel('Usuário', { exact: true }).fill('fixture-user');
  await page.getByLabel('Senha', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Entrar na lista', exact: true }).click();
  await page.getByRole('heading', { name: 'O que vamos assistir?' }).waitFor();
  const start = performance.now();
  await page.getByRole('button', { name: 'Filmes', exact: true }).click();
  await page.getByText('50000 itens', { exact: true }).waitFor({ timeout: 30_000 });
  report.catalog_load_ms = Math.round(performance.now() - start);
  assert.equal(await page.locator('.poster').count(), 30);
  report.catalog_dom_nodes = await page.locator('*').count();
  report.max_catalog_long_task_ms = Math.round(
    await page.evaluate(() => Math.max(0, ...window.__longTasks)),
  );
  await page.locator('#item-0').focus();
  const focusBefore = await page.evaluate(() => ({
    active: document.activeElement?.id || '',
    top: Math.round(scrollY),
  }));
  await page.keyboard.press('ArrowDown');
  const focusAfter = await page.evaluate(() => ({
    active: document.activeElement?.id || '',
    top: Math.round(scrollY),
  }));
  report.grid_down = { before: focusBefore, after: focusAfter };
  assert.equal(focusAfter.active, 'item-6', 'Uma pressão de Baixo já seleciona o filme da linha seguinte.');
  assert.ok(focusAfter.top >= focusBefore.top, 'A rolagem acompanha o novo foco.');
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  report.closed_menu_buttons = await page.locator('aside button').count();
  assert.ok(report.closed_menu_buttons < 40);
  await page.getByText('Categorias de Filmes', { exact: true }).click();
  await page.getByRole('button', { name: 'Mais categorias', exact: true }).waitFor();
  report.open_menu_buttons = await page.locator('aside button').count();
  assert.ok(report.open_menu_buttons <= 110);
  await page.keyboard.press('Escape');
  const times = [];
  for (const query of ['Filme 123', 'Filme 999', 'Filme 49999']) {
    const t = performance.now();
    await page.getByLabel('Buscar nesta seção').fill(query);
    await page.waitForFunction(
      (q) =>
        [...document.querySelectorAll('.poster span')].every((n) =>
          n.textContent.toLowerCase().includes(q.toLowerCase()),
        ),
      query,
    );
    times.push(Math.round(performance.now() - t));
  }
  report.search_update_ms = times;
  await page.getByRole('button', { name: 'Filme 49999', exact: true }).click();
  await page.getByRole('heading', { name: 'Filme 49999', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Favoritar', exact: true }).click();
  await page.getByRole('button', { name: 'Nos favoritos', exact: true }).waitFor();
  await page.screenshot({
    path: resolve(screenshots, 'smart-details-movie-1920.png'),
    fullPage: true,
  });
  const detailsRequests = actions.get('get_vod_info');
  await page.getByRole('button', { name: 'Assistir agora', exact: true }).click();
  await page.locator('.playback').waitFor();
  await page.waitForFunction(
    () => !document.querySelector('.transport button:nth-child(2)')?.disabled,
  );
  await page.evaluate(() => (document.querySelector('video').currentTime = 120));
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Continuar', exact: true }).waitFor();
  assert.equal(actions.get('get_vod_info'), detailsRequests);
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Netflix', exact: true }).click();
  await page.getByRole('button', { name: 'Série de teste', exact: true }).click();
  await page.getByRole('button', { name: 'Temporada 2', exact: true }).waitFor();
  await page.screenshot({
    path: resolve(screenshots, 'smart-details-series-1920.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: /02.*Episódio 2/ }).click();
  await page.locator('.playback h2').filter({ hasText: 'Episódio 2' }).waitFor();
  await page.evaluate(() => document.querySelector('video').dispatchEvent(new Event('ended')));
  await page.locator('.playback h2').filter({ hasText: 'Episódio 3' }).waitFor();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Temporada 2', exact: true })
    .filter({ has: page.locator('[aria-pressed=true]') })
    .count();
  await page.getByRole('button', { name: 'Assistir agora', exact: true }).click();
  await page.locator('.playback h2').filter({ hasText: 'Episódio 3' }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.getByRole('button', { name: 'Histórico', exact: true }).click();
  await page.getByRole('button', { name: 'Série de teste', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Episódio/ }).count(), 0);
  await page.getByRole('button', { name: 'Série de teste', exact: true }).click();
  await page.getByRole('button', { name: 'Temporada 2', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const vault = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open('senju-smart-tv-protected-v1', 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = reject;
    });
    const get = (store, key) =>
      new Promise((resolve) => {
        const r = db.transaction(store).objectStore(store).get(key);
        r.onsuccess = () => resolve(r.result);
      });
    const key = await get('keys', 'aes'),
      record = await get('records', 'profiles');
    let exportable = false;
    try {
      await crypto.subtle.exportKey('raw', key);
      exportable = true;
    } catch {}
    return {
      exportable,
      plain: new TextDecoder().decode(record.cipher).includes('fixture-password'),
      localStorage: localStorage.length,
      sessionStorage: sessionStorage.length,
    };
  });
  assert.equal(vault.exportable, false);
  assert.equal(vault.plain, false);
  assert.equal(vault.localStorage, 0);
  assert.equal(vault.sessionStorage, 0);
  report.encrypted_profiles = true;
  await page.reload();
  await page.getByRole('heading', { name: 'O que vamos assistir?' }).waitFor();
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.getByRole('button', { name: 'Favoritos', exact: true }).click();
  await page.getByRole('button', { name: 'Filme 49999', exact: true }).waitFor();
  await page.getByLabel('Buscar nesta seção').fill('não existe');
  await page.getByRole('heading', { name: 'Nenhum conteúdo encontrado' }).waitFor();
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).last().focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement?.closest('aside'));
  await page.keyboard.press('Escape');
  for (const size of [
    { width: 1280, height: 720 },
    { width: 960, height: 540 },
  ]) {
    await page.setViewportSize(size);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
  }
  assert.deepEqual(errors, []);
  await context.close();
  // Samsung adapter contract: real SDK/AVPlay is not being emulated here.
  const samsung = await browser.newContext({
    userAgent: 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.5)',
    viewport: { width: 1920, height: 1080 },
  });
  const tv = await samsung.newPage();
  await tv.goto(origin);
  await tv.getByLabel('Salvar lista neste dispositivo').waitFor();
  await tv.getByLabel('Servidor', { exact: true }).fill(origin);
  await tv.getByLabel('Usuário', { exact: true }).fill('fixture-user');
  await tv.getByLabel('Senha', { exact: true }).fill('fixture-password');
  await tv.getByRole('button', { name: 'Entrar na lista', exact: true }).click();
  await tv.getByRole('heading', { name: 'O que vamos assistir?' }).waitFor();
  await tv.getByRole('button', { name: 'Ao vivo', exact: true }).click();
  await tv.getByRole('button', { name: 'Canal de teste', exact: true }).click();
  await tv.waitForFunction(() => window.__avCalls?.includes('play'));
  await tv.keyboard.press('Escape');
  await tv.waitForFunction(() => window.__avCalls.includes('close'));
  report.samsung_adapter_contract = true;
  await samsung.close();
  report.pass = true;
  await writeFile(
    resolve(app, 'build/browser-report.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
