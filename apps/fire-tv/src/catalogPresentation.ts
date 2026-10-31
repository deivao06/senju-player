/** Presentation-only extraction of explicit quality tags; never infer codecs or merge items. */
export function catalogPresentation(name: string) {
  const tags = [...name.matchAll(/\[(4K|UHD|FHD|HD|SD|HDR|H265|HEVC)\]/gi)].map((match) =>
    match[1].toUpperCase(),
  );
  const resolution = ['4K', 'UHD', 'FHD', 'HD', 'SD'].find((value) => tags.includes(value));
  const quality = [resolution, tags.includes('HDR') ? 'HDR' : undefined]
    .filter(Boolean)
    .join(' · ');
  // Leave codec-only tags and all language/provider tags intact.
  const title = quality
    ? name
        .replace(/\s*\[(4K|UHD|FHD|HD|SD|HDR)\]/gi, '')
        .replace(/(\S)\[/g, '$1 [')
        .trim()
    : name;
  return { title: title || name, quality };
}
