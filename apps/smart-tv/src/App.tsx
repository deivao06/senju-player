import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  contentLabels,
  type PlaylistItem,
  type ItemCategory,
  type SavedPlaylist,
} from '@senju/iptv';
import { initializePlatform } from './player';
import { isBack, moveFocus, type Direction } from './remote';
import { Playback } from './Playback';
import { Details } from './Details';
import { loadCatalog } from './catalogLoader';
import {
  emptyLibrary,
  favoriteItem,
  watchedItem,
  readProfiles,
  writeProfiles,
  readLibraryResult,
  writeLibrary,
  removeLibrary,
  type Library,
} from './persistence';
import {
  EMPTY_CATALOG,
  GROUP_PAGE_SIZE,
  PAGE_SIZE,
  indexCatalog,
  selectCatalog,
} from './catalogIndex';
const types: ItemCategory[] = ['CHANNEL', 'MOVIE', 'SERIES'];
const featured = [
  ['netflix', 'Netflix'],
  ['globoplay', 'Globoplay'],
  ['prime', 'Prime Video'],
  ['disney', 'Disney+'],
  ['max', 'HBO'],
];

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
  const [detailItem, setDetailItem] = useState<PlaylistItem>();
  const [saved, setSaved] = useState<SavedPlaylist[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [platformReady, setPlatformReady] = useState(false);
  const [rememberList, setRememberList] = useState(true);
  const [notice, setNotice] = useState('');
  const [libraryBlocked, setLibraryBlocked] = useState(false);
  const [library, setLibrary] = useState<Library>(emptyLibrary);
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const blockedLibraries = useRef(new Set<string>());
  const persistence = useRef(Promise.resolve());
  const [libraryView, setLibraryView] = useState<'all' | 'favorites' | 'recent'>('all');
  const [playing, setPlaying] = useState<PlaylistItem>(),
    [queue, setQueue] = useState<PlaylistItem[]>([]);
  const backHandler = useRef<() => void>(() => {}),
    session = useRef(new AbortController()),
    generation = useRef(0),
    lastFocus = useRef<string>('menu'),
    seriesOrigin = useRef('menu');
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [groupPage, setGroupPage] = useState(0);
  const [platformError, setPlatformError] = useState('');
  const retry = useRef<(() => void) | null>(null);
  useEffect(() => {
    let disposed = false;
    const platform = initializePlatform()
      .then(() => {
        if (!disposed) setPlatformReady(true);
        return true;
      })
      .catch(() => {
        if (!disposed)
          setPlatformError('Player Samsung indisponível. Feche e abra o aplicativo novamente.');
        return false;
      });
    const storage = readProfiles()
      .then((profiles) => {
        if (disposed) return [];
        setSaved(profiles);
        setStorageReady(true);
        return profiles;
      })
      .catch(() => {
        if (!disposed)
          setNotice('Armazenamento protegido indisponível; dados somente nesta sessão.');
        return [];
      });
    void Promise.all([platform, storage]).then(([supported, profiles]) => {
      if (!disposed && supported && profiles.length === 1)
        void load('CHANNEL', profiles[0], false, false);
    });
    return () => {
      disposed = true;
      session.current.abort();
    };
  }, []);
  function updateLibrary(next: Library) {
    libraryRef.current = next;
    setLibrary(next);
    if (!source || !storageReady) return;
    const id = source.id;
    if (blockedLibraries.current.has(id)) {
      setNotice((current) =>
        current.includes('inválida')
          ? current
          : 'Biblioteca inválida preservada. Use “Descartar biblioteca inválida” no perfil para voltar a salvar.',
      );
      return;
    }
    persistence.current = persistence.current.catch(() => {}).then(() => writeLibrary(id, next));
    void persistence.current.catch(() =>
      setNotice('Não foi possível salvar a biblioteca; ela continua disponível nesta sessão.'),
    );
  }
  function resetLibrary() {
    if (!source) return;
    const id = source.id;
    blockedLibraries.current.delete(id);
    setLibraryBlocked(false);
    setNotice('');
    persistence.current = persistence.current
      .catch(() => {})
      .then(() => writeLibrary(id, libraryRef.current));
    void persistence.current.catch(() =>
      setNotice('Não foi possível salvar a biblioteca; tente novamente no perfil.'),
    );
  }
  useEffect(() => {
    if (!playing && !loading) {
      requestAnimationFrame(() => {
        const target = drawer
          ? document.querySelector<HTMLElement>('[data-focus-scope] button:not(:disabled)')
          : document.getElementById(lastFocus.current);
        (target || document.querySelector<HTMLElement>('button:not(:disabled), input'))?.focus();
      });
    }
  }, [playing, loading, screen, drawer, page, detailItem, source]);
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
    if (detailItem) {
      lastFocus.current = seriesOrigin.current;
      setDetailItem(undefined);
      return;
    }
    if (screen === 'catalog') {
      setScreen('home');
      lastFocus.current = 'menu';
      return;
    }
    if (source) setDrawer('profile');
  }
  backHandler.current = back;
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (drawer && e.key === 'Tab') {
        e.preventDefault();
        moveFocus(e.shiftKey ? 'ArrowUp' : 'ArrowDown');
        return;
      }
      if (isBack(e)) {
        e.preventDefault();
        backHandler.current();
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
  }, [drawer]);
  function remember(e: React.FocusEvent<HTMLElement>) {
    if (e.target.id && !drawer && !playing) lastFocus.current = e.target.id;
  }
  async function load(type: ItemCategory, s = source, force = false, remember = false) {
    if (!s) return;
    const task = ++generation.current;
    session.current.abort();
    session.current = new AbortController();
    retry.current = () => {
      void load(type, s, force, remember);
    };
    setLoading(true);
    setError('');
    setDrawer(null);
    setScreen('catalog');
    setCategory(type);
    setDetailItem(undefined);
    setQuery('');
    setPage(0);
    lastFocus.current = 'item-0';
    try {
      let nextLibrary = libraryRef.current;
      if (s.id !== source?.id) {
        const read = await persistence.current
          .catch(() => {})
          .then(() => readLibraryResult(s.id))
          .catch(() => ({ library: emptyLibrary(), recovered: false, unavailable: true }));
        if (task !== generation.current) return;
        nextLibrary = read.library;
        if (read.recovered) {
          blockedLibraries.current.add(s.id);
          setLibraryBlocked(true);
          setNotice(
            'Biblioteca salva inválida: dados legíveis recuperados e registro original preservado. Descarte no perfil para voltar a salvar.',
          );
        } else if (read.unavailable) {
          setNotice('Armazenamento protegido indisponível; biblioteca somente nesta sessão.');
        } else {
          blockedLibraries.current.delete(s.id);
          setLibraryBlocked(false);
        }
      }
      if (task !== generation.current) return;
      let next = catalog;
      if (force || !catalog[type] || s !== source) {
        const prepared = await loadCatalog(s, type, s.id !== source?.id, session.current.signal);
        next = s.id === source?.id ? { ...catalog } : {};
        for (const [key, entry] of Object.entries(prepared))
          if (entry) next[key as ItemCategory] = entry.items;
      }
      if (task !== generation.current) return;
      if (remember && storageReady && !saved.some((profile) => profile.id === s.id)) {
        const profiles = [...saved, s];
        await writeProfiles(profiles);
        if (task !== generation.current) return;
        setSaved(profiles);
      }
      setCatalog(next);
      setLibrary(nextLibrary);
      libraryRef.current = nextLibrary;
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
    setLibraryView('all');
    setPlatform(p);
    setGroup('');
    void load(type);
  }
  function logout() {
    retry.current = null;
    generation.current++;
    session.current.abort();
    setSource(undefined);
    setLibrary(emptyLibrary());
    setLibraryView('all');
    setCatalog({});
    setDetailItem(undefined);
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
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
    const existing = saved.find(
      (profile) =>
        profile.type === s.type && JSON.stringify(profile.data) === JSON.stringify(s.data),
    );
    if (rememberList && storageReady && !existing && saved.length >= 5) {
      setError('Você pode salvar até cinco listas. Remova uma lista antes de adicionar outra.');
      return;
    }
    void load('CHANNEL', existing || s, false, rememberList);
  }
  const deferredQuery = useDeferredValue(query);
  const activeItems =
    libraryView === 'favorites'
      ? library.favorites
      : libraryView === 'recent'
        ? library.recent
        : catalog[category] || EMPTY_CATALOG;
  const catalogIndex = useMemo(() => indexCatalog(activeItems), [activeItems]);
  useEffect(() => {
    setGroupPage(0);
  }, [category]);
  const items = useMemo(() => {
    return selectCatalog(catalogIndex, { platform, group, query: deferredQuery });
  }, [catalogIndex, platform, group, deferredQuery]);
  const groups = catalogIndex.groups;
  useEffect(() => {
    if (drawer !== 'menu') setGroupsOpen(false);
  }, [drawer]);
  useEffect(() => {
    const last = Math.max(0, Math.ceil(items.length / PAGE_SIZE) - 1);
    if (page > last) setPage(last);
  }, [items.length, page]);
  function startPlayback(item: PlaylistItem, episodes: PlaylistItem[] = []) {
    setQueue(episodes);
    updateLibrary(watchedItem(libraryRef.current, item, undefined, detailItem || item));
    setPlaying(item);
  }
  function select(item: PlaylistItem) {
    if (item.category === 'CHANNEL') {
      startPlayback(item);
      return;
    }
    seriesOrigin.current = lastFocus.current;
    setDetailItem(item);
  }
  function selectLibrary(view: 'favorites' | 'recent') {
    setLibraryView(view);
    setScreen('catalog');
    setDetailItem(undefined);
    setPlatform('');
    setGroup('');
    setQuery('');
    setPage(0);
    setDrawer(null);
    lastFocus.current = 'item-0';
  }
  const index = queue.findIndex((i) => i.id === playing?.id);
  const playback = playing ? (
    <Playback
      key={playing.id}
      item={playing}
      start={library.progress[playing.id] || 0}
      onProgress={(position) =>
        updateLibrary(watchedItem(libraryRef.current, playing, position, detailItem || playing))
      }
      onBack={() => setPlaying(undefined)}
      onEnded={() => {
        updateLibrary(watchedItem(libraryRef.current, playing, 0, detailItem || playing, true));
        const next = index >= 0 ? queue[index + 1] : undefined;
        if (next) updateLibrary(watchedItem(libraryRef.current, next, 0, detailItem || next));
        setPlaying(next);
      }}
      onNext={
        index >= 0 && index < queue.length - 1
          ? () => {
              updateLibrary(
                watchedItem(
                  libraryRef.current,
                  queue[index + 1],
                  0,
                  detailItem || queue[index + 1],
                ),
              );
              setPlaying(queue[index + 1]);
            }
          : undefined
      }
      onPrevious={
        index > 0
          ? () => {
              updateLibrary(
                watchedItem(
                  libraryRef.current,
                  queue[index - 1],
                  0,
                  detailItem || queue[index - 1],
                ),
              );
              setPlaying(queue[index - 1]);
            }
          : undefined
      }
    />
  ) : null;
  if (detailItem && source)
    return (
      <>
        <div hidden={!!playing}>
          <Details
            item={detailItem}
            source={source}
            active={!playing}
            playingId={playing?.id}
            library={library}
            onBack={() => {
              setDetailItem(undefined);
              lastFocus.current = seriesOrigin.current;
            }}
            onPlay={(item, episodes) => startPlayback(item, episodes)}
            onFavorite={() => updateLibrary(favoriteItem(libraryRef.current, detailItem))}
          />
        </div>
        {playback}
      </>
    );
  if (playing) return playback;
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
          {saved.length > 0 && (
            <section className="saved-lists" aria-label="Listas salvas">
              {saved.map((profile) => (
                <div key={profile.id} className="tabs">
                  <button
                    type="button"
                    disabled={loading || !platformReady}
                    onClick={() => void load('CHANNEL', profile)}
                  >
                    {profile.name}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    aria-label={`Remover lista ${profile.name}`}
                    onClick={() => {
                      const next = saved.filter((s) => s.id !== profile.id);
                      void writeProfiles(next)
                        .then(() => {
                          setSaved(next);
                          return removeLibrary(profile.id);
                        })
                        .catch(() => setError('Não foi possível remover a lista.'));
                    }}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </section>
          )}
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
          {storageReady && (
            <label className="remember-list">
              <input
                type="checkbox"
                checked={rememberList}
                onChange={(e) => setRememberList(e.target.checked)}
              />
              Salvar lista neste dispositivo
            </label>
          )}
          <p className="muted">
            {storageReady
              ? 'Listas salvas são criptografadas neste dispositivo.'
              : 'Dados mantidos somente durante esta sessão.'}
          </p>
          {!!notice && (
            <p className="muted" role="status">
              {notice}
            </p>
          )}
          <button className="primary" disabled={loading || !platformReady || !!platformError}>
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
            : libraryView !== 'all'
              ? libraryView === 'favorites'
                ? 'Favoritos'
                : 'Histórico'
              : platform
                ? featured.find((p) => p[0] === platform)?.[1]
                : contentLabels[category]}
          {screen === 'catalog' && <small>{items.length} itens</small>}
        </h1>
        {screen === 'catalog' && (
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
                <button onClick={() => selectLibrary('favorites')}>Favoritos</button>
                <button onClick={() => selectLibrary('recent')}>Histórico</button>
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
                {libraryView === 'all' && groups.length > 0 && (
                  <details onToggle={(event) => setGroupsOpen(event.currentTarget.open)}>
                    <summary tabIndex={0}>Categorias de {contentLabels[category]}</summary>
                    {groupsOpen && (
                      <>
                        {groups.length > GROUP_PAGE_SIZE && (
                          <nav className="tabs" aria-label="Páginas de categorias">
                            <button
                              disabled={groupPage === 0}
                              onClick={() => setGroupPage(groupPage - 1)}
                            >
                              Categorias anteriores
                            </button>
                            <span>
                              {groupPage + 1} / {Math.ceil(groups.length / GROUP_PAGE_SIZE)}
                            </span>
                            <button
                              disabled={(groupPage + 1) * GROUP_PAGE_SIZE >= groups.length}
                              onClick={() => setGroupPage(groupPage + 1)}
                            >
                              Mais categorias
                            </button>
                          </nav>
                        )}
                        {groups
                          .slice(groupPage * GROUP_PAGE_SIZE, (groupPage + 1) * GROUP_PAGE_SIZE)
                          .map((g) => (
                            <button
                              key={g}
                              onClick={() => {
                                setDetailItem(undefined);
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
                      </>
                    )}
                  </details>
                )}
              </>
            ) : (
              <>
                <p className="muted">
                  {saved.some((s) => s.id === source.id)
                    ? 'Lista salva neste dispositivo.'
                    : 'Lista conectada nesta sessão.'}
                </p>
                <button
                  onClick={() => {
                    void load(category, source, true);
                  }}
                >
                  Atualizar catálogo
                </button>
                {libraryBlocked && (
                  <button onClick={resetLibrary}>
                    Descartar biblioteca inválida e salvar novamente
                  </button>
                )}
                <button onClick={logout}>Sair da lista</button>
                <button onClick={() => setDrawer(null)}>Voltar</button>
              </>
            )}
          </aside>
        </div>
      )}
      {!!notice && (
        <p className="storage-notice" role="status">
          {notice}
        </p>
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
          {platform && (
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
                    key={item.category + ':' + item.id}
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
