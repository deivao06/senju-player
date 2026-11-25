import { useEffect, useMemo, useRef, useState } from 'react';
import {
  XtreamService,
  detailEpisodes,
  detailPlayTarget,
  type DetailEpisode,
  type MediaInfo,
  type PlaylistItem,
  type SavedPlaylist,
  type XtreamCredentials,
} from '@senju/iptv';
import type { Library } from './persistence';
import { transport } from './transport';
import { PAGE_SIZE } from './catalogIndex';
export function Details({
  item,
  source,
  active,
  playingId,
  library,
  onBack,
  onPlay,
  onFavorite,
}: {
  item: PlaylistItem;
  source: SavedPlaylist;
  active: boolean;
  playingId?: string;
  library: Library;
  onBack(): void;
  onPlay(item: PlaylistItem, queue: DetailEpisode[]): void;
  onFavorite(): void;
}) {
  const [info, setInfo] = useState<MediaInfo>(),
    [episodes, setEpisodes] = useState<DetailEpisode[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0),
    [season, setSeason] = useState<number>(),
    [page, setPage] = useState(0),
    [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLElement>(null),
    lastFocus = useRef('detail-play'),
    lastPlayed = useRef<string | undefined>(undefined),
    previousPage = useRef(0);
  useEffect(() => {
    if (playingId) lastPlayed.current = playingId;
  }, [playingId]);
  const requiresEpisodes = item.category === 'SERIES' && source.type === 'XTREAM';
  useEffect(() => {
    if (source.type !== 'XTREAM') return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const api = new XtreamService(transport(controller.signal));
    async function load() {
      try {
        if (requiresEpisodes) {
          const detail = await api.fetchSeriesInfo(
            source.data as XtreamCredentials,
            String(item.seriesId || item.streamId),
          );
          if (controller.signal.aborted) return;
          const queue = detailEpisodes(detail);
          setInfo(detail.info);
          setEpisodes(queue);
          setSeason(queue[0]?.seasonNumber);
        } else {
          const detail = await api.fetchMovieInfo(
            source.data as XtreamCredentials,
            String(item.streamId),
          );
          if (!controller.signal.aborted) setInfo(detail.info);
        }
      } catch {
        if (!controller.signal.aborted)
          setError('Não foi possível carregar os detalhes. Tente novamente.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [item, source, attempt]);
  useEffect(() => {
    if (active) {
      const ep = episodes.find((e) => e.id === lastPlayed.current);
      if (ep) {
        setSeason(ep.seasonNumber);
        const n = episodes
          .filter((e) => e.seasonNumber === ep.seasonNumber)
          .findIndex((e) => e.id === ep.id);
        setPage(Math.floor(n / PAGE_SIZE));
        lastFocus.current = 'detail-' + ep.id;
      }
      requestAnimationFrame(() => {
        const node = document.getElementById(lastFocus.current);
        (node && !node.matches(':disabled')
          ? node
          : ref.current?.querySelector<HTMLElement>('button:not(:disabled)')
        )?.focus();
      });
    }
  }, [active, loading]);
  const seasons = useMemo(() => [...new Set(episodes.map((e) => e.seasonNumber))], [episodes]);
  const visible = useMemo(
    () => episodes.filter((e) => e.seasonNumber === season),
    [episodes, season],
  );
  const target = useMemo(
    () =>
      episodes.find((ep) => ep.id === library.currentEpisodes[item.id]) ||
      detailPlayTarget(item, episodes, requiresEpisodes, {
        recent: [...Object.keys(library.progress).reverse(), ...library.recent.map((i) => i.id)],
        progress: library.progress,
      }),
    [item, episodes, requiresEpisodes, library.recent, library.progress, library.currentEpisodes],
  );
  useEffect(() => {
    if (previousPage.current === page) return;
    previousPage.current = page;
    const ep = visible[page * PAGE_SIZE];
    if (active && ep)
      requestAnimationFrame(() => document.getElementById('detail-' + ep.id)?.focus());
  }, [page, active, visible]);
  const favorite = library.favorites.some((i) => i.id === item.id);
  return (
    <main
      className="details-screen"
      ref={ref}
      onFocus={(e) => {
        if (e.target.id) lastFocus.current = e.target.id;
      }}
    >
      <header>
        <button id="detail-back" onClick={onBack}>
          Voltar
        </button>
        <span className="brand">
          senju<span> player</span>
        </span>
        <h1>{item.category === 'SERIES' ? 'Detalhes da série' : 'Detalhes do filme'}</h1>
      </header>
      <section className="details-hero">
        {info?.backdrop && (
          <img
            className="detail-backdrop"
            src={info.backdrop}
            alt=""
            onError={(e) => (e.currentTarget.hidden = true)}
          />
        )}
        <div className="detail-poster">
          {(info?.cover || item.tvgLogo) && (
            <img
              src={info?.cover || item.tvgLogo}
              alt=""
              onError={(e) => (e.currentTarget.hidden = true)}
            />
          )}
        </div>
        <div className="detail-copy">
          <h2>{info?.name || item.name}</h2>
          <p className="muted">
            {[
              info?.releaseDate?.match(/\b(?:19|20)\d{2}\b/)?.[0],
              info?.genre,
              info?.duration,
              info?.rating ? `Nota ${info.rating}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className={'detail-plot' + (expanded ? ' expanded' : '')}>
            {info?.plot || (loading ? 'Carregando sinopse…' : 'A fonte não informou uma sinopse.')}
          </p>
          <div className="tabs">
            <button
              id="detail-play"
              className="primary"
              disabled={!target}
              onClick={() => {
                if (target) onPlay(target, episodes);
              }}
            >
              {target && (library.progress[target.id] || 0) > 0 ? 'Continuar' : 'Assistir agora'}
            </button>
            <button id="detail-favorite" aria-pressed={favorite} onClick={onFavorite}>
              {favorite ? 'Nos favoritos' : 'Favoritar'}
            </button>
            {info?.plot && (
              <button
                id="detail-synopsis"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? 'Recolher sinopse' : 'Ler sinopse'}
              </button>
            )}
          </div>
          {expanded && (
            <p className="muted">
              {[
                info?.director ? `Direção: ${info.director}` : '',
                info?.cast ? `Elenco: ${info.cast}` : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
      </section>
      {loading && <p role="status">Carregando detalhes…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setAttempt(attempt + 1)}>Tentar novamente</button>
        </div>
      )}
      {requiresEpisodes && (
        <section className="episode-section">
          <nav className="tabs" aria-label="Temporadas">
            {seasons.map((n) => (
              <button
                key={n}
                aria-pressed={n === season}
                onClick={() => {
                  setSeason(n);
                  setPage(0);
                }}
              >
                {n === 0 ? 'Especiais' : `Temporada ${n}`}
              </button>
            ))}
          </nav>
          <h2>
            Episódios <small>{visible.length}</small>
          </h2>
          {visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((ep) => (
            <button
              id={'detail-' + ep.id}
              className="episode-row"
              key={ep.id}
              onClick={() => onPlay(ep, episodes)}
            >
              <span className="episode-number">{String(ep.episodeNumber).padStart(2, '0')}</span>
              <div className="episode-image">
                {ep.tvgLogo && (
                  <img
                    src={ep.tvgLogo}
                    loading="lazy"
                    alt=""
                    onError={(e) => (e.currentTarget.hidden = true)}
                  />
                )}
              </div>
              <span className="episode-description">
                <strong>{ep.name.replace(/^T\d+ E\d+ — /, '')}</strong>
                {ep.plot && <span>{ep.plot}</span>}
                <small>
                  {[ep.duration, (library.progress[ep.id] || 0) > 0 ? 'Em andamento' : '']
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </span>
            </button>
          ))}
          {!loading && !error && !episodes.length && (
            <p className="muted">A fonte não disponibilizou episódios.</p>
          )}
          {visible.length > PAGE_SIZE && (
            <nav className="pagination">
              <button disabled={page === 0} onClick={() => setPage(page - 1)}>
                Anterior
              </button>
              <span>
                {page + 1} / {Math.ceil(visible.length / PAGE_SIZE)}
              </span>
              <button
                disabled={(page + 1) * PAGE_SIZE >= visible.length}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </section>
      )}
    </main>
  );
}
