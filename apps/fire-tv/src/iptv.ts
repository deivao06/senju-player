import { M3UParserService, XtreamService, type Request } from '@senju/iptv';

export function services(signal: AbortSignal) {
  const request: Request = async (url, timeout) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort);
    if (signal.aborted) controller.abort();
    const timer = setTimeout(abort, timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('Falha na resposta do provedor.');
      const text = await response.text();
      let data: unknown = text;
      try {
        data = JSON.parse(text);
      } catch {
        /* M3U is plain text. */
      }
      return { data };
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
  };
  return {
    m3u: new M3UParserService(request),
    xtream: new XtreamService(request),
  };
}
