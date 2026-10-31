import { useEffect, useRef, useState } from 'react';
import type { PlaylistItem } from '@senju/iptv';
import { createPlayer, type Player } from './player';
export function Playback({
  item,
  onBack,
  onEnded,
  onNext,
  onPrevious,
}: {
  item: PlaylistItem;
  onBack(): void;
  onEnded(): void;
  onNext?: () => void;
  onPrevious?: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    player = useRef<Player | null>(null);
  const [paused, setPaused] = useState(false),
    [error, setError] = useState(''),
    [ready, setReady] = useState(false),
    [time, setTime] = useState(0),
    [duration, setDuration] = useState(0);
  const ended = useRef(onEnded);
  ended.current = onEnded;
  useEffect(() => {
    document.documentElement.classList.add('playing');
    let active = true;
    const p = createPlayer(video.current!, {
      time(t, d) {
        if (active) {
          setTime(t);
          setDuration(Number.isFinite(d) ? d : 0);
        }
      },
      ended() {
        if (active) ended.current();
      },
      error() {
        if (active) setError('Falha de reprodução. Verifique a conexão ou tente outro conteúdo.');
      },
    });
    player.current = p;
    p.open(item)
      .then(() => {
        if (active) setReady(true);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Não foi possível reproduzir.');
      });
    return () => {
      document.documentElement.classList.remove('playing');
      active = false;
      player.current = null;
      try {
        p.dispose();
      } catch {
        /* Already closed by platform. */
      }
    };
  }, [item]);
  async function setPlayback(nextPaused: boolean) {
    try {
      if (nextPaused) player.current?.pause();
      else await player.current?.play();
      setPaused(nextPaused);
    } catch {
      setError('Não foi possível retomar o vídeo.');
    }
  }
  function seek(t: number) {
    try {
      player.current?.seek(Math.max(0, Math.min(duration, t)));
    } catch {
      setError('Este conteúdo não permite avançar até esse ponto.');
    }
  }
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        try {
          player.current?.pause();
          setPaused(true);
        } catch {}
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ([10252, 415, 19, 413].includes(e.keyCode)) {
        e.preventDefault();
        if (e.keyCode === 413) onBack();
        else void setPlayback(e.keyCode === 19 ? true : e.keyCode === 415 ? false : !paused);
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  });
  return (
    <section className="playback" data-focus-scope>
      <video ref={video} playsInline />
      <div className="player-title">
        <button autoFocus onClick={onBack}>
          Voltar
        </button>
        <h2>{item.name}</h2>
      </div>
      {error ? (
        <div className="player-error" role="alert">
          {error}
          <button onClick={onBack}>Voltar ao catálogo</button>
        </div>
      ) : (
        !ready && (
          <p className="player-error" role="status">
            Abrindo vídeo…
          </p>
        )
      )}
      <div className="controls">
        <div className="transport">
          {onPrevious && <button onClick={onPrevious}>Episódio anterior</button>}
          <button
            disabled={!ready || !duration}
            aria-label="Retroceder"
            onClick={() => seek(time - 30)}
          >
            Retroceder
          </button>
          <button disabled={!ready} onClick={() => void setPlayback(!paused)}>
            {paused ? 'Reproduzir' : 'Pausar'}
          </button>
          <button
            disabled={!ready || !duration}
            aria-label="Avançar"
            onClick={() => seek(time + 30)}
          >
            Avançar
          </button>
          {onNext && <button onClick={onNext}>Próximo episódio</button>}
        </div>
        {duration > 0 && (
          <label className="progress">
            {Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, '0')}
            <input
              aria-label="Posição do vídeo"
              type="range"
              min="0"
              max={duration}
              step="10"
              value={Math.min(time, duration)}
              onChange={(e) => seek(Number(e.target.value))}
            />
            {Math.floor(duration / 60)} min
          </label>
        )}
      </div>
    </section>
  );
}
