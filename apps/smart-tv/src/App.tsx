import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  M3UParserService,
  XtreamService,
  contentLabels,
  orderByLatest,
  platformForGroup,
  itemGroups,
  type PlaylistItem,
  type ItemCategory,
  type SavedPlaylist,
  type Season,
} from '@senju/iptv';
import { transport } from './transport';
import { initializePlatform } from './player';
import { isBack, moveFocus, type Direction } from './remote';
import { Playback } from './Playback';
const types: ItemCategory[] = ['CHANNEL', 'MOVIE', 'SERIES'];
const featured = [
  ['netflix', 'Netflix'],
  ['globoplay', 'Globoplay'],
  ['prime', 'Prime Video'],
  ['disney', 'Disney+'],
  ['max', 'HBO'],
];
const PAGE_SIZE = 30;
export function App() {
  const [source, setSource] = useState<SavedPlaylist>(),
    [kind, setKind] = useState<'XTREAM' | 'M3U'>('XTREAM');
  const [catalog, setCatalog] = useState<Partial<Record<ItemCategory, PlaylistItem[]>>>({});
  const [screen, setScreen] = useState<'home' | 'catalog'>('home'),
    [category, setCategory] = useState<ItemCategory>('CHANNEL');
  const [platform, setPlatform] = useState(''),
    [group, setGroup] = useState(''),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(0);
  const [drawer, setDrawer] = useState<'menu' | 'profile' | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]),
    [season, setSeason] = useState(0),
    [seriesTitle, setSeriesTitle] = useState('');
  const [playing, setPlaying] = useState<PlaylistItem>(),
    [queue, setQueue] = useState<PlaylistItem[]>([]);
  const session = useRef(new AbortController()),
    generation = useRef(0),
    lastFocus = useRef<string>('menu'),
    seriesOrigin = useRef('menu');
  const [platformError, setPlatformError] = useState('');
  const retry = useRef<(() => void) | null>(null);
  useEffect(() => {
    void initializePlatform().catch(() =>
      setPlatformError('Player Samsung indisponível. Feche e abra o aplicativo novamente.'),
    );
    return () => session.current.abort();
  }, []);
  useEffect(() => {
    if (!playing && !loading) {
      requestAnimationFrame(() => {
        const target = drawer
          ? document.querySelector<HTMLElement>('[data-focus-scope] button:not(:disabled)')
          : document.getElementById(lastFocus.current);
        (target || document.querySelector<HTMLElement>('button:not(:disabled), input'))?.focus();
      });
    }
  }, [playing, loading, screen, drawer, page, seasons, season, source]);
  function back() {
    if (playing) {
      setPlaying(undefined);
      return;
    }
    if (loading) {
      generation.current++;
      session.current.abort();
      setLoading(false);
      return;
    }
    if (drawer) {
      setDrawer(null);
      return;
    }
    if (seasons.length) {
      lastFocus.current = seriesOrigin.current;
      setSeasons([]);
      return;
    }
    if (screen === 'catalog') {
      setScreen('home');
      lastFocus.current = 'menu';
      return;
    }
    if (source) setDrawer('profile');
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (drawer && e.key === 'Tab') {
        e.preventDefault();
        moveFocus(e.shiftKey ? 'ArrowUp' : 'ArrowDown');
        return;
      }
      if (isBack(e)) {
        e.preventDefault();
        back();
        return;
      }
      // Let range inputs and text editing consume horizontal keys.
      if (
        (e.target as HTMLElement).matches('select') ||
        ((e.target as HTMLElement).matches('input[type="range"]') &&
          ['ArrowLeft', 'ArrowRight'].includes(e.key))
      )
        return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        if (moveFocus(e.key as Direction)) e.preventDefault();
      }
    }
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  });
  function remember(e: React.FocusEvent<HTMLElement>) {
    if (e.target.id && !drawer && !playing) lastFocus.current = e.target.id;
  }
  async function load(type: ItemCategory, s = source, force = false) {
    if (!s) return;
    const task = ++generation.current;
    session.current.abort();
    session.current = new AbortController();
    retry.current = () => {
      void load(type, s, force);
    };
    setLoading(true);
    setError('');
    setDrawer(null);
    setScreen('catalog');
    setCategory(type);
    setSeasons([]);
    setQuery('');
    setPage(0);
    lastFocus.current = 'item-0';
    try {
      let next = catalog;
      if (force || !catalog[type] || s !== source) {
        const request = transport(session.current.signal);
        if (s.type === 'M3U') {
          const items = await new M3UParserService(request).fetchAndParse(s.data as string);
          next = Object.fromEntries(
            types.map((t) => [t, orderByLatest(items.filter((i) => i.category === t))]),
          );
        } else {
          const api = new XtreamService(request),
            credentials = s.data as Parameters<XtreamService['fetchChannels']>[0];
          if (s !== source && !(await api.loginCheck(credentials)))
            throw new Error('Lista não autenticada.');
          const items = await (type === 'CHANNEL'
            ? api.fetchChannels(credentials)
            : type === 'MOVIE'
              ? api.fetchMovies(credentials)
              : api.fetchSeries(credentials));
          next = { ...(s === source ? catalog : {}), [type]: orderByLatest(items) };
        }
      }
      if (task !== generation.current) return;
      setCatalog(next);
      setSource(s);
      if (s !== source) {
        setScreen('home');
        lastFocus.current = 'menu';
      }
    } catch {
      if (task === generation.current)
        setError(
          'Não foi possível carregar a lista. Confira os dados, a conexão e a permissão de acesso do servidor (CORS).',
        );
    } finally {
      if (task === generation.current) setLoading(false);
    }
  }
  function openCategory(type: ItemCategory, p = '') {
    setPlatform(p);
    setGroup('');
    void load(type);
  }
  function logout() {
    retry.current = null;
    generation.current++;
    session.current.abort();
    setSource(undefined);
    setCatalog({});
    setSeasons([]);
    setQueue([]);
    setPlaying(undefined);
    setLoading(false);
    setDrawer(null);
    setError('');
  }
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget),
      url = String(data.get('url') || '').trim();
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
        throw Error();
    } catch {
      setError('Informe um endereço HTTP ou HTTPS válido.');
      return;
    }
    const s: SavedPlaylist = {
      id: 'session',
      name: String(data.get('name') || 'Minha lista'),
      type: kind,
      data:
        kind === 'M3U'
          ? url
          : {
              url,
              username: String(data.get('username') || ''),
              password: String(data.get('password') || ''),
            },
    };
    setPlatform('');
    setGroup('');
    void load('CHANNEL', s);
  }
  const deferredQuery=useDeferredValue(query);
  const items = useMemo(() => {
    if (seasons.length)
      return (seasons[season]?.episodes || []).map((ep) => ({
        id: ep.id,
        name: ep.title,
        url: ep.url,
        category: 'MOVIE' as const,
        tvgLogo: ep.info?.movie_image,
      }));
    const q = deferredQuery.trim().toLocaleLowerCase();
    return (catalog[category] || []).filter(
      (item) =>
        (!platform || itemGroups(item).some((g) => platformForGroup(g) === platform)) &&
        (!group || itemGroups(item).includes(group)) &&
        (!q || item.name.toLocaleLowerCase().includes(q)),
    );
  }, [catalog, category, platform, group, deferredQuery, seasons, season]);
  const groups = useMemo(
    () => [...new Set((catalog[category] || []).flatMap(itemGroups))].sort(),
    [catalog, category],
  );
  async function select(item: PlaylistItem) {
    if (item.category !== 'SERIES' || source?.type !== 'XTREAM') {
      setQueue(
        seasons.length
          ? seasons.flatMap((s) =>
              s.episodes.map((e) => ({
                id: e.id,
                name: e.title,
                url: e.url,
                category: 'MOVIE' as const,
              })),
            )
          : [],
      );
      setPlaying(item);
      return;
    }
    retry.current = () => {
      void select(item);
    };
    seriesOrigin.current = lastFocus.current;
    const task = ++generation.current;
    session.current.abort();
    session.current = new AbortController();
    setLoading(true);
    setError('');
    try {
      const detail = await new XtreamService(transport(session.current.signal)).fetchSeriesInfo(
        source.data as Parameters<XtreamService['fetchSeriesInfo']>[0],
        item.seriesId!,
      );
      if (task === generation.current) {
        setSeasons(detail.seasons);
        setSeason(0);
        setSeriesTitle(item.name);
        setPage(0);
        lastFocus.current = 'season-0';
        if (!detail.seasons.length) setError('Esta série não possui episódios disponíveis.');
      }
    } catch {
      if (task === generation.current)
        setError('Não foi possível carregar os episódios. Tente novamente.');
    } finally {
      if (task === generation.current) setLoading(false);
    }
  }
  const index = queue.findIndex((i) => i.id === playing?.id);
  if (playing)
    return (
      <Playback
        key={playing.id}
        item={playing}
        onBack={() => setPlaying(undefined)}
        onEnded={() => {
          setPlaying(index >= 0 ? queue[index + 1] : undefined);
        }}
        onNext={
          index >= 0 && index < queue.length - 1 ? () => setPlaying(queue[index + 1]) : undefined
        }
        onPrevious={index > 0 ? () => setPlaying(queue[index - 1]) : undefined}
      />
    );
  if (!source)
    return (
      <main className="setup" onFocus={remember}>
        <div className="intro">
          <span className="brand">
            senju<span> player</span>
          </span>
          <h1>
            Sua lista.
            <br />
            Sua próxima sessão.
          </h1>
          <p>Canais, filmes e séries em um só lugar.</p>
          <small>O Senju não fornece conteúdo.</small>
        </div>
        <form onSubmit={submit}>
          <h2>Conectar sua lista</h2>
          <div className="tabs">
            {(['XTREAM', 'M3U'] as const).map((t) => (
              <button type="button" key={t} aria-pressed={kind === t} onClick={() => setKind(t)}>
                {t === 'XTREAM' ? 'Xtream Codes' : 'M3U'}
              </button>
            ))}
          </div>
          <label>
            Nome da lista
            <input name="name" defaultValue="Minha lista" autoComplete="off" />
          </label>
          <label>
            {kind === 'M3U' ? 'Endereço da playlist' : 'Servidor'}
            <input
              required
              name="url"
              type="url"
              placeholder="https://servidor.exemplo"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {kind === 'XTREAM' && (
            <div className="credentials">
              <label>
                Usuário
                <input name="username" required autoComplete="off" />
              </label>
              <label>
                Senha
                <input name="password" required type="password" autoComplete="off" />
              </label>
            </div>
          )}
          <p className="muted">Dados mantidos somente durante esta sessão.</p>
          <button className="primary" disabled={loading || !!platformError}>
            {loading ? 'Conectando…' : 'Entrar na lista'}
          </button>
          {(error || platformError) && <p role="alert">{error || platformError}</p>}
        </form>
      </main>
    );
  return (
    <main className="shell" onFocus={remember}>
      <header>
        <button id="menu" aria-label="Abrir menu" onClick={() => setDrawer('menu')}>
          Menu
        </button>
        <span className="brand">
          senju<span> player</span>
        </span>
        <h1>
          {screen === 'home'
            ? 'Início'
            : seasons.length
              ? seriesTitle
              : platform
                ? featured.find((p) => p[0] === platform)?.[1]
                : contentLabels[category]}
          {screen === 'catalog' && <small>{items.length} itens</small>}
        </h1>
        {screen === 'catalog' && !seasons.length && (
          <input
            id="search"
            aria-label="Buscar nesta seção"
            placeholder="Buscar nesta seção"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        )}
        <button id="profile" onClick={() => setDrawer('profile')}>
          Perfil
        </button>
      </header>
      {drawer && (
        <div className="scrim">
          <aside
            className={drawer === 'profile' ? 'right' : ''}
            data-focus-scope
            aria-label={drawer === 'menu' ? 'Navegação' : 'Perfil'}
          >
            <h2>{drawer === 'menu' ? 'Explorar' : source.name}</h2>
            {drawer === 'menu' ? (
              <>
                <button
                  onClick={() => {
                    setScreen('home');
                    setDrawer(null);
                  }}
                >
                  Início
                </button>
                {types.map((t) => (
                  <button key={t} onClick={() => openCategory(t)}>
                    {contentLabels[t]}
                  </button>
                ))}
                <hr />
                {featured.map(([key, label]) => (
                  <details key={key}>
                    <summary
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.parentElement?.toggleAttribute('open');
                        }
                      }}
                    >
                      {label}
                    </summary>
                    {types.map((t) => (
                      <button key={t} onClick={() => openCategory(t, key)}>
                        {contentLabels[t]}
                      </button>
                    ))}
                  </details>
                ))}
                {groups.length > 0 && (
                  <details>
                    <summary tabIndex={0}>Categorias de {contentLabels[category]}</summary>
                    {groups.map((g) => (
                      <button
                        key={g}
                        onClick={() => {
                          setSeasons([]);
                          setGroup(g);
                          setPlatform('');
                          setPage(0);
                          setScreen('catalog');
                          setDrawer(null);
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </details>
                )}
              </>
            ) : (
              <>
                <p className="muted">Lista conectada nesta sessão.</p>
                <button
                  onClick={() => {
                    void load(category, source, true);
                  }}
                >
                  Atualizar catálogo
                </button>
                <button onClick={logout}>Sair da lista</button>
                <button onClick={() => setDrawer(null)}>Voltar</button>
              </>
            )}
          </aside>
        </div>
      )}
      {screen === 'home' ? (
        <section className="home">
          <h2>O que vamos assistir?</h2>
          <p className="muted">Explore sua lista por conteúdo ou plataforma.</p>
          <nav className="tabs">
            {types.map((t) => (
              <button key={t} onClick={() => openCategory(t)}>
                {contentLabels[t]}
              </button>
            ))}
          </nav>
          <div className="platforms">
            {featured.map(([key, label]) => (
              <button
                key={key}
                className={'platform ' + key}
                onClick={() => openCategory('SERIES', key)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="catalog">
          {seasons.length > 0 && (
            <nav className="tabs">
              {seasons.map((s, n) => (
                <button
                  id={'season-' + n}
                  key={s.number}
                  aria-pressed={n === season}
                  onClick={() => {
                    setSeason(n);
                    setPage(0);
                  }}
                >
                  Temporada {s.number}
                </button>
              ))}
            </nav>
          )}
          {platform && !seasons.length && (
            <nav className="tabs">
              {types.map((t) => (
                <button
                  aria-pressed={t === category}
                  key={t}
                  onClick={() => openCategory(t, platform)}
                >
                  {contentLabels[t]}
                </button>
              ))}
            </nav>
          )}
          {loading ? (
            <p role="status">Carregando catálogo…</p>
          ) : error ? (
            <div role="alert">
              <p>{error}</p>
              <button onClick={() => retry.current?.()}>Tentar novamente</button>
            </div>
          ) : !items.length ? (
            <div className="empty">
              <h2>Nenhum conteúdo encontrado</h2>
              <p>Confira a busca ou escolha outra seção da lista.</p>
              <button
                onClick={() => {
                  setQuery('');
                  setGroup('');
                  setPlatform('');
                }}
              >
                Limpar filtros
              </button>
              <button onClick={() => setDrawer('menu')}>Abrir menu</button>
            </div>
          ) : (
            <>
              <div className="grid">
                {items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((item, n) => (
                  <button
                    className="poster"
                    id={'item-' + n}
                    key={item.id + '-' + n}
                    onClick={() => void select(item)}
                  >
                    {item.tvgLogo ? (
                      <img
                        loading="lazy"
                        src={item.tvgLogo}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.visibility = 'hidden';
                        }}
                      />
                    ) : (
                      <div className="artwork" />
                    )}
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
              <nav className="pagination">
                <button
                  disabled={page === 0}
                  onClick={() => {
                    setPage(page - 1);
                    lastFocus.current = 'item-0';
                  }}
                >
                  Anterior
                </button>
                <span>
                  Página {page + 1} de {Math.ceil(items.length / PAGE_SIZE)}
                </span>
                <button
                  disabled={(page + 1) * PAGE_SIZE >= items.length}
                  onClick={() => {
                    setPage(page + 1);
                    lastFocus.current = 'item-0';
                  }}
                >
                  Próxima
                </button>
              </nav>
            </>
          )}
        </section>
      )}
    </main>
  );
}
