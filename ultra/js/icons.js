/* icons.js - inline SVG icons (24x24, stroke=currentColor). */
window.SU = window.SU || {};
SU.icon = (function () {
  const S = (inner, vb) =>
    `<svg viewBox="${vb || "0 0 24 24"}" fill="none" stroke="currentColor" ` +
    `stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const I = {
    home: S('<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
    worlds: S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5S14.4 18.2 12 20.5C9.6 18.2 8.4 15.2 8.4 12S9.6 5.8 12 3.5Z"/>'),
    map: S('<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z"/><path d="M9 4v14M15 6v14"/>'),
    agents: S('<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.2a3 3 0 0 1 0 5.6M20.5 19a5.5 5.5 0 0 0-4-5.3"/>'),
    forge: S('<circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="9" r="2.2"/><path d="M6 8.2v7.6M8.2 6h4.6A3 3 0 0 1 16 9v0"/>'),
    eval: S('<path d="M4 20a8 8 0 1 1 16 0"/><path d="M12 20v-6M12 14l4-3.5"/><circle cx="12" cy="20" r="1"/>'),
    audit: S('<path d="M8 4h8a1 1 0 0 1 1 1v15l-5-2.5L7 20V5a1 1 0 0 1 1-1Z"/><path d="M9.5 10.5 11 12l3.5-3.5"/>'),
    guide: S('<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5a2.6 2.6 0 0 1 4.9 1c0 1.6-2.3 2-2.3 3.6"/><circle cx="12" cy="17" r=".6"/>'),
    theme: S('<rect x="3" y="4.5" width="18" height="12" rx="1.5"/><path d="M8.5 20h7M12 16.5V20"/>'),
    signin: S('<circle cx="12" cy="9" r="3.3"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0"/>'),
    search: S('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/>'),
    chat: S('<path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v8A1.5 1.5 0 0 1 18.5 16H9l-4 3v-3H5.5A1.5 1.5 0 0 1 4 14.5Z"/>'),
    share: S('<circle cx="6" cy="12" r="2.3"/><circle cx="18" cy="6" r="2.3"/><circle cx="18" cy="18" r="2.3"/><path d="m8.1 11 7.8-3.9M8.1 13l7.8 3.9"/>'),
    activity: S('<path d="M3 12h4l2.5-7 4 14 2.5-7H21"/>'),
    play: S('<path d="M7 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none"/>'),
    pause: S('<rect x="7" y="5.5" width="3.3" height="13" rx="1" fill="currentColor" stroke="none"/><rect x="13.7" y="5.5" width="3.3" height="13" rx="1" fill="currentColor" stroke="none"/>'),
    back: S('<path d="M14 7l-5 5 5 5"/>'),
    fwd: S('<path d="M10 7l5 5-5 5"/>'),
    collapseL: S('<path d="M14 7l-5 5 5 5"/><path d="M8 5v14"/>'),
    sun: S('<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>'),
    moon: S('<path d="M20 13.5A7.5 7.5 0 1 1 10.5 4a6 6 0 0 0 9.5 9.5Z"/>'),
    monitor: S('<rect x="3" y="4.5" width="18" height="12" rx="1.5"/><path d="M8.5 20h7M12 16.5V20"/>'),
    layers: S('<path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z"/><path d="m4 12 8 4.5 8-4.5M4 16.5 12 21l8-4.5"/>'),
    gear: S('<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>'),
    close: S('<path d="m6 6 12 12M18 6 6 18"/>'),
    // badge glyphs
    bAct: S('<circle cx="12" cy="12" r="3.5"/>'),
    bReach: S('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>'),
    bMsg: S('<path d="M5 6h14v9H9l-4 3V6Z"/>'),
    dot: S('<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>'),
  };
  return (name) => I[name] || "";
})();
