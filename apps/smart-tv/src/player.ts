import type { PlaylistItem } from '@senju/iptv';
export interface Player {
  open(item: PlaylistItem): Promise<void>;
  pause(): void;
  play(): Promise<void>;
  seek(seconds: number): void;
  dispose(): void;
}
interface AVPlay {
  open(url: string): void;
  setDisplayRect(x: number, y: number, w: number, h: number): void;
  setDisplayMethod(method: string): void;
  setListener(listener: {
    oncurrentplaytime(ms: number): void;
    onstreamcompleted(): void;
    onerror(): void;
  }): void;
  prepareAsync(ok: () => void, fail: () => void): void;
  play(): void;
  pause(): void;
  seekTo(ms: number): void;
  stop(): void;
  close(): void;
  getDuration(): number;
}
declare global {
  interface Window {
    webapis?: { avplay?: AVPlay };
    tizen?: { tvinputdevice: { registerKey(key: string): void } };
  }
}
export function createPlayer(
  video: HTMLVideoElement,
  callbacks: { time(t: number, d: number): void; ended(): void; error(): void },
): Player {
  const av = window.webapis?.avplay;
  if (av) {
    let disposed = false;
    return {
      async open(item) {
        if (Object.keys(item.httpHeaders || {}).length || item.url.includes('|'))
          throw new Error('Headers desta fonte ainda não são suportados no player Samsung.');
        await new Promise<void>((resolve, reject) => {
          av.open(item.url);
          av.setDisplayRect(0, 0, 1920, 1080);
          av.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX');
          av.setListener({
            oncurrentplaytime: (ms) => {
              if (!disposed) callbacks.time(ms / 1000, av.getDuration() / 1000);
            },
            onstreamcompleted: () => {
              if (!disposed) callbacks.ended();
            },
            onerror: () => {
              if (!disposed) callbacks.error();
            },
          });
          av.prepareAsync(
            () => {
              if (disposed) {
                reject(new Error('Cancelado'));
                return;
              }
              try {
                av.play();
                resolve();
              } catch {
                reject(new Error('Falha ao iniciar vídeo.'));
              }
            },
            () => reject(new Error('Formato ou conexão não suportados.')),
          );
        });
      },
      pause: () => av.pause(),
      async play() {
        av.play();
      },
      seek: (seconds) => av.seekTo(seconds * 1000),
      dispose() {
        disposed = true;
        try {
          av.stop();
        } finally {
          av.close();
        }
      },
    };
  }
  const time = () => callbacks.time(video.currentTime, video.duration);
  video.addEventListener('timeupdate', time);
  video.addEventListener('ended', callbacks.ended);
  video.addEventListener('error', callbacks.error);
  return {
    async open(item) {
      if (Object.keys(item.httpHeaders || {}).length || item.url.includes('|'))
        throw new Error('Headers desta fonte ainda não são suportados no player LG/web.');
      video.src = item.url;
      video.load();
      await video.play();
    },
    pause: () => video.pause(),
    async play() {
      await video.play();
    },
    seek: (seconds) => {
      video.currentTime = seconds;
    },
    dispose() {
      video.pause();
      video.removeEventListener('timeupdate', time);
      video.removeEventListener('ended', callbacks.ended);
      video.removeEventListener('error', callbacks.error);
      video.removeAttribute('src');
      video.load();
    },
  };
}
export async function initializePlatform() {
  if (/Tizen/i.test(navigator.userAgent)) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '$WEBAPIS/webapis/webapis.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Não foi possível carregar o player Samsung.'));
      document.head.append(script);
    });
    if (!window.webapis?.avplay) throw new Error('AVPlay indisponível neste dispositivo.');
    for (const key of ['MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaStop']) {
      try {
        window.tizen?.tvinputdevice.registerKey(key);
      } catch {
        /* Optional keys vary by remote. */
      }
    }
  }
}
