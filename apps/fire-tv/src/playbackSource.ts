import type { PlaylistItem } from '@senju/iptv';

export function createPlaybackSource(item: PlaylistItem) {
  // Kodi-style URL headers require translation; never pass the pipe suffix to ExoPlayer.
  const [uri, suffix] = item.url.split('|');
  const headers: Record<string, string> = { ...item.httpHeaders };
  if (suffix)
    for (const pair of suffix.split('&')) {
      const separator = pair.indexOf('=');
      if (separator > 0) {
        const key = pair.slice(0, separator).toLowerCase();
        if (key === 'user-agent' || key === 'referer') {
          try {
            headers[key === 'referer' ? 'Referer' : 'User-Agent'] = decodeURIComponent(
              pair.slice(separator + 1),
            );
          } catch {
            /* Invalid header is omitted. */
          }
        }
      }
    }
  return {
    uri,
    headers,
    ...(uri.split(/[?#]/)[0].toLowerCase().endsWith('.m3u8') ? { type: 'm3u8' } : {}),
    bufferConfig: {
      minBufferMs: 5000,
      maxBufferMs: 15000,
      bufferForPlaybackMs: 1000,
      bufferForPlaybackAfterRebufferMs: 2000,
    },
  };
}
