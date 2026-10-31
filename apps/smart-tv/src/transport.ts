import type { Request } from '@senju/iptv';
/** One session owns every request, including parallel Xtream category calls. */
export function transport(session: AbortSignal): Request {
  return async (url, timeout) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    session.addEventListener('abort', abort);
    if (session.aborted) abort();
    const timer = setTimeout(abort, timeout);
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: 'omit' });
      if (!response.ok) throw new Error('Falha no servidor da lista.');
      const body = await response.text();
      try {
        return { data: JSON.parse(body) };
      } catch {
        return { data: body };
      }
    } finally {
      clearTimeout(timer);
      session.removeEventListener('abort', abort);
    }
  };
}
