/**
 * Inline SVG icons (Material-style, 0 0 24 24).
 * Replaces the render-blocking Material Symbols web font.
 * Usage: icon('play_arrow', { size: 20, filled: true, cls: 'icon-filled' })
 */
const PATHS = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  category: 'M12 2l-5.5 9h11zM17.5 17.5m-4.5 0a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0-9 0M3 13.5h8v8H3z',
  tv: 'M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m0 14H3V5h18z',
  animation: 'M2 16c0 2.2 1.8 4 4 4h9c2.8 0 5-2.2 5-5s-2.2-5-5-5h-1.3C12.9 7.7 10.7 6 8 6c-3.3 0-6 2.7-6 6 0 .3 0 .7.1 1H2zm17-7c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3',
  history: 'M13 3a9 9 0 0 0-9 9H1l3.9 3.9.1.1L9 12H6a7 7 0 1 1 7 7c-1.9 0-3.6-.8-4.8-2l-1.5 1.5A9 9 0 1 0 13 3m-1 5v5l4.3 2.5.7-1.2-3.5-2.1V8z',
  search: 'M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9',
  download: 'M19 9h-4V3H9v6H5l7 7zM5 18v2h14v-2z',
  play_arrow: 'M8 5v14l11-7z',
  info: 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16',
  close: 'M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z',
  calendar_today: 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 16H5V9h14z',
  movie: 'M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V4z',
  tv_series: 'M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m0 14H3V5h18z',
  playlist_play: 'M3 10h11v2H3zm0-4h11v2H3zm0 8h7v2H3zm13-1v6l5-3z',
  arrow_forward: 'M12 4l-1.4 1.4L16.2 11H4v2h12.2l-5.6 5.6L12 20l8-8z',
  arrow_back: 'M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z',
  arrow_back_ios: 'M16.6 5.4 15.2 4l-8 8 8 8 1.4-1.4L10.2 12z',
  video_library: 'M4 6H2v14a2 2 0 0 0 2 2h14v-2H4zm18-2a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2zm-10 9V7l5 3z',
  check_circle: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m-2 15-5-5 1.4-1.4L10 14.2l7.6-7.6L19 8z',
  autorenew: 'M12 6v3l4-4-4-4v3a8 8 0 0 0-8 8c0 1.6.5 3 1.3 4.3L6.7 14A6 6 0 0 1 12 6m6.7 1.7L17.3 10a6 6 0 0 1-5.3 8v-3l-4 4 4 4v-3a8 8 0 0 0 8-8c0-1.6-.5-3-1.3-4.3',
  star: 'M12 17.3 18.2 21l-1.6-7L22 9.2l-7.2-.6L12 2 9.2 8.6 2 9.2l5.4 4.8L5.8 21z',
};

export function icon(name, { size = null, cls = '', filled = false } = {}) {
  const path = PATHS[name] || PATHS.info;
  const style = size ? ` style="font-size:${size}px"` : '';
  const klass = `icon${filled ? ' icon-filled' : ''}${cls ? ' ' + cls : ''}`;
  return `<span class="${klass}"${style} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${path}"/></svg></span>`;
}
