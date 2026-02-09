/**
 * Game Studio — UI Components Library
 * Reusable DOM component factory + SVG icons
 */
(function(){'use strict';

/* ── DOM helpers ── */
function el(tag,attrs,children){
  const e=document.createElement(tag);
  if(attrs){
    for(const[k,v]of Object.entries(attrs)){
      if(k==='className')e.className=v;
      else if(k==='style'&&typeof v==='object')Object.assign(e.style,v);
      else if(k.startsWith('on'))e.addEventListener(k.slice(2).toLowerCase(),v);
      else if(k==='dataset')Object.assign(e.dataset,v);
      else if(k==='innerHTML')e.innerHTML=v;
      else if(k==='textContent')e.textContent=v;
      else e.setAttribute(k,v);
    }
  }
  if(children){
    if(!Array.isArray(children))children=[children];
    for(const c of children){
      if(typeof c==='string')e.appendChild(document.createTextNode(c));
      else if(c)e.appendChild(c);
    }
  }
  return e;
}

/* ── SVG Icons (inline, crisp) ── */
const ICON_PATHS={
  play:'M8 5v14l11-7z',
  pause:'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
  stop:'M6 6h12v12H6z',
  save:'M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zm-5 16a3 3 0 110-6 3 3 0 010 6zm3-10H5V5h10v4z',
  folder:'M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z',
  'folder-open':'M20 6h-8l-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2zm0 12H4V8h16v10z',
  file:'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z',
  plus:'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  minus:'M19 13H5v-2h14v2z',
  close:'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  check:'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  settings:'M19.14 12.94a7.07 7.07 0 000-1.88l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96a7.04 7.04 0 00-1.62-.94l-.36-2.54A.48.48 0 0013.93 2h-3.86a.48.48 0 00-.48.41l-.36 2.54a7.04 7.04 0 00-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.71 8.47a.49.49 0 00.12.61l2.03 1.58a7.07 7.07 0 000 1.88L2.83 14.1a.49.49 0 00-.12.61l1.92 3.32a.49.49 0 00.59.22l2.39-.96c.5.37 1.04.68 1.62.94l.36 2.54a.48.48 0 00.48.41h3.86a.48.48 0 00.48-.41l.36-2.54a7.04 7.04 0 001.62-.94l2.39.96a.49.49 0 00.59-.22l1.92-3.32a.49.49 0 00-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z',
  search:'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16a6.47 6.47 0 004.23-1.57l.27.28v.79l5 5 1.5-1.5-5-5zm-6 0A4.5 4.5 0 1114 9.5 4.5 4.5 0 019.5 14z',
  eye:'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z',
  'eye-off':'M12 7a5 5 0 014.89 3.95l2.95 2.95A11.83 11.83 0 0023 12c-1.73-4.39-6-7.5-11-7.5a11.65 11.65 0 00-3.72.6l2.18 2.18A5 5 0 0112 7zm-1.07 2.07L13 11.14a3 3 0 00-2.14-2.07zM2.01 3.87l2.68 2.68A11.74 11.74 0 001 12c1.73 4.39 6 7.5 11 7.5 1.52 0 2.97-.3 4.32-.82l3.18 3.18 1.27-1.27L3.28 2.6 2.01 3.87zM9.51 11.37l3.12 3.12A3 3 0 019.51 11.37z',
  lock:'M18 8h-1V6a5 5 0 00-10 0v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zm-6 9a3 3 0 110-6 3 3 0 010 6zm3.1-9H8.9V6a3.1 3.1 0 016.2 0v2z',
  unlock:'M12 17a3 3 0 110-6 3 3 0 010 6zm6-9h-1V6A5 5 0 007 6h1.9a3.1 3.1 0 016.2 0v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2z',
  trash:'M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  copy:'M16 1H4a2 2 0 00-2 2v14h2V3h12V1zm3 4H8a2 2 0 00-2 2v14a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2zm0 16H8V7h11v14z',
  undo:'M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.62-3.62A8.55 8.55 0 0112.5 10c3.9 0 7.19 2.55 8.36 6.08L23 15.19C21.48 10.88 17.35 8 12.5 8z',
  redo:'M18.4 10.6C16.55 9 14.15 8 11.5 8c-4.85 0-8.98 2.88-10.5 7.19L3.14 16.08C4.31 12.56 7.6 10 11.5 10a8.55 8.55 0 015.12 2.38L13 16h9V7l-3.6 3.6z',
  move:'M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z',
  rotate:'M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42A7.03 7.03 0 016.09 13zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9a7.03 7.03 0 01-2.49-1.01l-1.41 1.43zM13 4.07V1L8.45 5.55 13 10V6.09a7.04 7.04 0 015.91 5.91h2.02A9.06 9.06 0 0013 4.07zm4.89 8.93h2.02a9.06 9.06 0 01-7.91 7.93v-2.02a7.04 7.04 0 005.89-5.91z',
  scale:'M21 15h2v2h-2v-2zm0-6h2v2h-2V9zm0 3h2v2h-2v-2zm0-6h2v2h-2V6zm0-3h2v2h-2V3zM3 21h2v2H3v-2zm6 0h2v2H9v-2zm-3 0h2v2H6v-2zm6 0h2v2h-2v-2zm6 0h2v2h-2v-2zm3 0h2v2h-2v-2zM3 18h2v2H3v-2zm0-3h2v2H3v-2zm0-3h2v2H3v-2zm0-3h2v2H3V9zm0-3h2v2H3V6zm0-3h2v2H3V3z',
  brush:'M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 00-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 000-1.41z',
  eraser:'M15.14 3c-.51 0-1.01.2-1.39.59L2.59 14.76a1.97 1.97 0 000 2.78l2.87 2.87c.37.37.87.59 1.39.59h2.89c.52 0 1.02-.22 1.38-.59l8.29-8.29c.77-.77.77-2.01 0-2.78L15.14 5.07A1.97 1.97 0 0013.75 3h1.39z',
  grid:'M20 2H4a2 2 0 00-2 2v16a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z',
  layers:'M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z',
  sun:'M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.8 1.41 1.41 1.79-1.8zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5a6 6 0 100 12 6 6 0 000-12zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z',
  moon:'M10 2c-1.82 0-3.53.5-5 1.35C7.99 5.08 10 8.3 10 12s-2.01 6.92-5 8.65C6.47 21.5 8.18 22 10 22c5.52 0 10-4.48 10-10S15.52 2 10 2z',
  zap:'M13 2L3 14h8l-1 8 10-12h-8l1-8z',
  upload:'M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z',
  download:'M19 9h-4V3H9v6H5l7 7 7-7zm-8 7v2h6v-2h-6zM5 18v2h14v-2H5z',
  image:'M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-5z',
  music:'M12 3v10.55A4 4 0 1014 17V7h4V3h-6z',
  volume:'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.5v7a4.47 4.47 0 002.5-3.5zM14 3.23v2.06a6.5 6.5 0 010 13.42v2.06A8.5 8.5 0 0022.5 12 8.5 8.5 0 0014 3.23z',
  'volume-off':'M16.5 12A4.5 4.5 0 0014 8.5v2.14l2.45 2.45c.03-.2.05-.39.05-.59zm2.5 0a6.42 6.42 0 01-.5 2.52l1.54 1.54A8.4 8.4 0 0021 12a8.5 8.5 0 00-7-8.37v2.06A6.5 6.5 0 0119 12zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.38 8.38 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z',
  gamepad:'M21 6H3a2 2 0 00-2 2v8a2 2 0 002 2h18a2 2 0 002-2V8a2 2 0 00-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm6.5 2a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-3a1.5 1.5 0 110-3 1.5 1.5 0 010 3z',
  code:'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
  terminal:'M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 14H4V8h16v10zm-6 0h4v-2h-4v2zM6 12l3 2v-4l-3 2z',
  export:'M19 12v7H5v-7H3v7a2 2 0 002 2h14a2 2 0 002-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z',
  import:'M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z',
  user:'M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z',
  cloud:'M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.99 5.99 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',
  'cloud-off':'M19.35 10.04A7.49 7.49 0 0012 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46A5.5 5.5 0 0112 6a5.5 5.5 0 015.5 5.5v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 18.16 24 16.68 24 15c0-2.64-2.05-4.78-4.65-4.96zM3 5.27l2.75 2.74C2.56 8.15 0 10.77 0 14c0 3.31 2.69 6 6 6h11.73l2 2L21 20.73 4.27 4 3 5.27z',
  heart:'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  star:'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  flag:'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z',
  target:'M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm0-14a6 6 0 100 12 6 6 0 000-12zm0 10a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z',
  compass:'M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-1.31-4.69L7.5 16.5l1.19-3.19L12 9.99l3.31 3.32L16.5 16.5l-3.19-1.19L12 14.01l-1.31 1.3z',
  box:'M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.36.2-.8.2-1.14 0l-7.9-4.44A.99.99 0 013 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.36-.2.8-.2 1.14 0l7.9 4.44c.32.17.53.5.53.88v9z',
  cube:'M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.18.1-.38.15-.57.15V12L21 7.5v9zM3 7.5v9c0 .38.21.71.53.88l7.9 4.44c.18.1.38.15.57.15V12L3 7.5zm8.43-4.88c.36-.2.8-.2 1.14 0l7.9 4.44L12 11.5 3.53 7.06l7.9-4.44z',
  package:'M20.5 7.27L12 12l-8.5-4.73L12 2.54l8.5 4.73zM12 22l-8.5-4.73v-9L12 13l8.5-4.73v9L12 22z',
  monster:'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-6a2 2 0 104 0H7zm6 0a2 2 0 104 0h-4zm-5 3h8a1 1 0 010 2l-1.5-1h-5L8 19a1 1 0 010-2z',
  npc:'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 01-6 3.22z',
  sword:'M14.12 4l1.83 1.83-8.78 8.78-1.83-1.83L14.12 4zM3.29 17.29l3.42 3.42 4.24-4.24-3.42-3.42-4.24 4.24z',
  shield:'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
  potion:'M13 2v4h1c1.1 0 2 .9 2 2v1l3 7.68A2 2 0 0117.12 19H6.88A2 2 0 015 16.68L8 9V8c0-1.1.9-2 2-2h1V2h2z',
  coin:'M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
  key:'M12.65 10A5.99 5.99 0 007 6a6 6 0 00-.84 11.94L7 18l1-1v-1h1v-1h1l1.03-1.03A6 6 0 0012.65 10zM7 10a2 2 0 110-4 2 2 0 010 4z',
  gem:'M19 3H5L2 9l10 12L22 9l-3-6zm-7 14.3L5.16 9.44 7.09 5h9.82l1.93 4.44L12 17.3z',
  chest:'M20 6h-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2zm-8 8a2 2 0 110-4 2 2 0 010 4zM8 6V4h8v2H8z',
  tree:'M12 2L5 12h3v4h8v-4h3L12 2zm-3 16h6v2H9v-2z',
  house:'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  mountain:'M14 6l-3.75 5L12 13.14 14.88 9.5 21 19H3l7-10 4-3z',
  water:'M12 21.5c-3.04 0-5.5-2.24-5.5-5 0-3.08 3.83-7.14 5.12-8.31a.52.52 0 01.76 0C13.67 9.36 17.5 13.42 17.5 16.5c0 2.76-2.46 5-5.5 5z',
  fire:'M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z',
  wind:'M14.5 17c0 1.65-1.35 3-3 3s-3-1.35-3-3h2c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1H2v-2h9.5c1.65 0 3 1.35 3 3zM19 12h-2c0-.55-.45-1-1-1s-1 .45-1 1 .45 1 1 1h1c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3h2c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1h-1c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3z',
  sparkle:'M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z',
  arrow:'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
  'arrow-left':'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  'chevron-down':'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
  'chevron-right':'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  'chevron-left':'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
  menu:'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  'more-vertical':'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  info:'M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  warning:'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  help:'M12 2a10 10 0 100 20 10 10 0 000-20zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92A3.4 3.4 0 0013 15h-2v-.5a4 4 0 011.17-2.83l1.24-1.26A2 2 0 0012 7a2 2 0 00-2 2H8a4 4 0 118 0c0 .88-.36 1.68-.93 2.25z',
  light:'M9 21h6v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
  camera:'M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zM9 2L7.17 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2h-3.17L15 2H9zm3 15a5 5 0 110-10 5 5 0 010 10z',
  crop:'M17 15h2V7a2 2 0 00-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10a2 2 0 002 2h10v4h2v-4h4v-2H7z',
  wand:'M7.5 5.6l2.12 2.12L4.24 13.1 2.12 10.98 7.5 5.6zm7.78-.22l1.41-1.42 5.66 5.66-1.42 1.41-5.65-5.65zM6.1 17.66l1.41 1.41L3.27 23.3l-1.42-1.41 4.24-4.24zm12.73-1.41l-1.42-1.42 4.24-4.24 1.42 1.41-4.24 4.25z',
  crosshair:'M12 8a4 4 0 100 8 4 4 0 000-8zm-9 3h2.09A7 7 0 0111 5.09V3h2v2.09A7 7 0 0118.91 11H21v2h-2.09A7 7 0 0113 18.91V21h-2v-2.09A7 7 0 015.09 13H3v-2zm9-4a5 5 0 100 10 5 5 0 000-10z',
  brain:'M12 2a9.96 9.96 0 00-7.07 2.93A9.96 9.96 0 002 12c0 2.65 1.04 5.13 2.93 7.07A9.96 9.96 0 0012 22a9.96 9.96 0 007.07-2.93A9.96 9.96 0 0022 12c0-2.65-1.04-5.13-2.93-7.07A9.96 9.96 0 0012 2zm-1 16h-1a4 4 0 01-4-4h2a2 2 0 002 2v-4a4 4 0 110-8V6a2 2 0 012-2v2a2 2 0 110 4v4c0 1.1-.9 2-2 2h-1v2zm4-2a2 2 0 01-2-2v-4a4 4 0 010-8V4a2 2 0 012 2v2a2 2 0 010 4v4a4 4 0 01-4 4h-1v-2h1a2 2 0 002-2z',
  script:'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM9 19H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V9h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2z',
  particle:'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  collision:'M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V5h14v14zM7 7h10v10H7V7z',
  physics:'M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zM12 6a6 6 0 100 12 6 6 0 000-12zm0 10a4 4 0 110-8 4 4 0 010 8z',
  timer:'M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.96 8.96 0 0012 4a9 9 0 100 18 8.96 8.96 0 006.62-14.61z',
  maximize:'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
  minimize:'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z',
  link:'M3.9 12A3.1 3.1 0 017 8.9h4V7H7a5 5 0 000 10h4v-1.9H7A3.1 3.1 0 013.9 12zM8 13h8v-2H8v2zm9-6h-4v1.9h4a3.1 3.1 0 010 6.2h-4V17h4a5 5 0 000-10z',
  newproject:'M20 6h-8l-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2zm-2 8h-3v3h-2v-3H10v-2h3V9h2v3h3v2z',
  template:'M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z',
  '2d':'M9 7H7v2h2V7zm4 4h-2v2h2v-2zM9 11H7v2h2v-2zm6-4h-2v2h2V7zm2 4h-2v2h2v-2zM5 5v14h14V5H5zm12 12H7V7h10v10z',
  '3d':'M12 2L2 7l10 5 10-5L12 2zm0 12L2 9l10 5 10-5L12 14zm0 4L2 13l10 5 10-5L12 18z',
  scene:'M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zM5 17l3.5-4.5 2.5 3.01L14.5 11l4.5 6H5z',
  tilemap:'M3 3v18h18V3H3zm8 16H5v-6h6v6zm0-8H5V5h6v6zm8 8h-6v-6h6v6zm0-8h-6V5h6v6z',
  animation:'M12 2a10 10 0 100 20 10 10 0 000-20zm-2 14.5v-9l6 4.5-6 4.5z'
};

function icon(name,size=20){
  const path=ICON_PATHS[name]||ICON_PATHS.help;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width',size);svg.setAttribute('height',size);svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('fill','currentColor');svg.style.flexShrink='0';
  const p=document.createElementNS('http://www.w3.org/2000/svg','path');
  p.setAttribute('d',path);svg.appendChild(p);return svg;
}

/* ── Toast Notifications ── */
let toastContainer=null;
function toast(msg,type='info',duration=3000){
  if(!toastContainer){toastContainer=el('div',{className:'gs-toast-container'});document.body.appendChild(toastContainer)}
  const colors={info:'var(--ez-primary)',success:'var(--ez-success)',warning:'var(--ez-warning)',error:'var(--ez-danger)'};
  const t=el('div',{className:'gs-toast ez-fade-in',style:{borderLeft:`3px solid ${colors[type]||colors.info}`}},[
    el('span',{textContent:msg})
  ]);
  toastContainer.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(100%)';setTimeout(()=>t.remove(),300)},duration);
}

/* ── Modal ── */
function modal(title,contentEl,actions=[]){
  const overlay=el('div',{className:'gs-modal-overlay'});
  const box=el('div',{className:'gs-modal ez-pop'},[
    el('div',{className:'gs-modal-header'},[
      el('h3',{textContent:title}),
      el('button',{className:'gs-btn-icon',onClick:()=>overlay.remove()},[icon('close',18)])
    ]),
    el('div',{className:'gs-modal-body'},[contentEl]),
    actions.length?el('div',{className:'gs-modal-footer'},actions.map(a=>
      el('button',{className:`gs-btn ${a.primary?'gs-btn-primary':''}`,textContent:a.label,onClick:()=>{if(a.onClick)a.onClick();overlay.remove()}})
    )):null
  ]);
  overlay.appendChild(box);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  document.body.appendChild(overlay);
  return{close:()=>overlay.remove(),el:overlay};
}

/* ── Confirm Dialog ── */
function confirm(title,message){
  return new Promise(resolve=>{
    modal(title,el('p',{textContent:message}),[
      {label:'Annuler',onClick:()=>resolve(false)},
      {label:'Confirmer',primary:true,onClick:()=>resolve(true)}
    ]);
  });
}

/* ── Prompt Dialog ── */
function prompt(title,defaultValue=''){
  return new Promise(resolve=>{
    const input=el('input',{className:'gs-input',value:defaultValue,type:'text'});
    const m=modal(title,input,[
      {label:'Annuler',onClick:()=>resolve(null)},
      {label:'OK',primary:true,onClick:()=>resolve(input.value)}
    ]);
    setTimeout(()=>{input.focus();input.select()},100);
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){resolve(input.value);m.close()}});
  });
}

/* ── Dropdown Select ── */
function dropdown(options,selected,onChange,placeholder='Sélectionner...'){
  const btn=el('button',{className:'gs-dropdown-btn'},[
    el('span',{className:'gs-dropdown-text',textContent:options.find(o=>o.value===selected)?.label||placeholder}),
    icon('chevron-down',16)
  ]);
  let menu=null;
  btn.addEventListener('click',()=>{
    if(menu){menu.remove();menu=null;return}
    menu=el('div',{className:'gs-dropdown-menu'},options.map(o=>
      el('div',{className:`gs-dropdown-item${o.value===selected?' gs-dropdown-item--active':''}`,textContent:o.label,onClick:()=>{
        selected=o.value;btn.querySelector('.gs-dropdown-text').textContent=o.label;menu.remove();menu=null;if(onChange)onChange(o.value);
      }})
    ));
    btn.parentElement.style.position='relative';btn.parentElement.appendChild(menu);
    const close=e=>{if(!btn.contains(e.target)&&(!menu||!menu.contains(e.target))){if(menu)menu.remove();menu=null;document.removeEventListener('mousedown',close)}};
    setTimeout(()=>document.addEventListener('mousedown',close),0);
  });
  return btn;
}

/* ── Slider ── */
function slider(min,max,value,onChange,step=1){
  const wrap=el('div',{className:'gs-slider-wrap'});
  const input=el('input',{type:'range',min,max,value,step,className:'gs-slider'});
  const label=el('span',{className:'gs-slider-value',textContent:value});
  input.addEventListener('input',()=>{label.textContent=input.value;if(onChange)onChange(parseFloat(input.value))});
  wrap.appendChild(input);wrap.appendChild(label);return wrap;
}

/* ── Color Picker ── */
function colorPicker(value,onChange){
  const wrap=el('div',{className:'gs-color-picker'});
  const input=el('input',{type:'color',value:value||'#ffffff',className:'gs-color-input'});
  const label=el('span',{className:'gs-color-label',textContent:value||'#ffffff'});
  input.addEventListener('input',()=>{label.textContent=input.value;if(onChange)onChange(input.value)});
  wrap.appendChild(input);wrap.appendChild(label);return wrap;
}

/* ── Number Input ── */
function numberInput(value,onChange,min=-Infinity,max=Infinity,step=1){
  const input=el('input',{type:'number',value,min:min===-Infinity?'':min,max:max===Infinity?'':max,step,className:'gs-input gs-input-number'});
  input.addEventListener('change',()=>{let v=parseFloat(input.value)||0;v=Math.max(min,Math.min(max,v));input.value=v;if(onChange)onChange(v)});
  return input;
}

/* ── Text Input ── */
function textInput(value,onChange,placeholder=''){
  const input=el('input',{type:'text',value:value||'',placeholder,className:'gs-input'});
  input.addEventListener('change',()=>{if(onChange)onChange(input.value)});
  return input;
}

/* ── Checkbox ── */
function checkbox(label,checked,onChange){
  const wrap=el('label',{className:'gs-checkbox'});
  const input=el('input',{type:'checkbox',className:'gs-checkbox-input'});
  input.checked=!!checked;
  input.addEventListener('change',()=>{if(onChange)onChange(input.checked)});
  wrap.appendChild(input);wrap.appendChild(el('span',{textContent:label}));return wrap;
}

/* ── Tree View ── */
function treeView(data,onSelect,selectedId=null){
  function buildNode(item,depth=0){
    const hasChildren=item.children&&item.children.length>0;
    const isSelected=item.id===selectedId;
    const row=el('div',{className:`gs-tree-node${isSelected?' gs-tree-node--selected':''}`,style:{paddingLeft:(depth*16+8)+'px'},
      onClick:e=>{e.stopPropagation();if(onSelect)onSelect(item)},
      onDblclick:e=>{e.stopPropagation();if(hasChildren){const ch=row.nextElementSibling;if(ch&&ch.classList.contains('gs-tree-children'))ch.classList.toggle('gs-tree-collapsed');
        const arrow=row.querySelector('.gs-tree-arrow');if(arrow)arrow.classList.toggle('gs-tree-arrow--open')}}
    },[
      hasChildren?el('span',{className:'gs-tree-arrow gs-tree-arrow--open'},[icon('chevron-right',14)]):el('span',{className:'gs-tree-arrow',style:{visibility:'hidden'}},[icon('chevron-right',14)]),
      icon(item.icon||'box',16),
      el('span',{className:'gs-tree-label',textContent:item.name||item.id})
    ]);
    const container=el('div',{className:'gs-tree-item'});container.appendChild(row);
    if(hasChildren){const childWrap=el('div',{className:'gs-tree-children'});for(const c of item.children)childWrap.appendChild(buildNode(c,depth+1));container.appendChild(childWrap)}
    return container;
  }
  const root=el('div',{className:'gs-tree-view'});
  if(Array.isArray(data))for(const d of data)root.appendChild(buildNode(d));
  else root.appendChild(buildNode(data));
  return root;
}

/* ── Tabs ── */
function tabs(items,activeKey,onChange){
  const bar=el('div',{className:'gs-tabs'});
  for(const item of items){
    const btn=el('button',{className:`gs-tab${item.key===activeKey?' gs-tab--active':''}`,onClick:()=>{
      bar.querySelectorAll('.gs-tab').forEach(b=>b.classList.remove('gs-tab--active'));btn.classList.add('gs-tab--active');if(onChange)onChange(item.key);
    }},[item.icon?icon(item.icon,14):null,el('span',{textContent:item.label})]);
    bar.appendChild(btn);
  }
  return bar;
}

/* ── Split Pane (horizontal) ── */
function splitPane(leftEl,rightEl,ratio=0.5){
  const container=el('div',{className:'gs-split'});
  const left=el('div',{className:'gs-split-left',style:{flex:ratio}});
  const handle=el('div',{className:'gs-split-handle'});
  const right=el('div',{className:'gs-split-right',style:{flex:1-ratio}});
  left.appendChild(leftEl);right.appendChild(rightEl);
  container.appendChild(left);container.appendChild(handle);container.appendChild(right);
  let dragging=false;
  handle.addEventListener('mousedown',e=>{e.preventDefault();dragging=true;
    const move=ev=>{if(!dragging)return;const rect=container.getBoundingClientRect();const r=Math.max(0.1,Math.min(0.9,(ev.clientX-rect.left)/rect.width));left.style.flex=r;right.style.flex=1-r};
    const up=()=>{dragging=false;document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up)};
    document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);
  });
  return container;
}

/* ── Context Menu ── */
function contextMenu(items,x,y){
  const existing=document.querySelector('.gs-context-menu');if(existing)existing.remove();
  const menu=el('div',{className:'gs-context-menu',style:{left:x+'px',top:y+'px'}});
  for(const item of items){
    if(item.separator){menu.appendChild(el('div',{className:'gs-context-separator'}));continue}
    const row=el('div',{className:'gs-context-item'+(item.disabled?' gs-context-item--disabled':''),onClick:()=>{if(!item.disabled){menu.remove();if(item.onClick)item.onClick()}}},[
      item.icon?icon(item.icon,16):null,el('span',{textContent:item.label}),
      item.shortcut?el('span',{className:'gs-context-shortcut',textContent:item.shortcut}):null
    ]);
    menu.appendChild(row);
  }
  document.body.appendChild(menu);
  const close=()=>{menu.remove();document.removeEventListener('mousedown',close)};
  setTimeout(()=>document.addEventListener('mousedown',close),0);
  return menu;
}

/* ── Collapsible Section ── */
function section(title,contentEl,open=true){
  const wrap=el('div',{className:'gs-section'});
  const header=el('div',{className:'gs-section-header',onClick:()=>{
    body.classList.toggle('gs-section-collapsed');
    const a=header.querySelector('.gs-section-arrow');if(a)a.classList.toggle('gs-section-arrow--closed');
  }},[
    el('span',{className:'gs-section-arrow'+(open?'':' gs-section-arrow--closed')},[icon('chevron-down',14)]),
    el('span',{className:'gs-section-title',textContent:title})
  ]);
  const body=el('div',{className:'gs-section-body'+(open?'':' gs-section-collapsed')});
  body.appendChild(contentEl);wrap.appendChild(header);wrap.appendChild(body);return wrap;
}

/* ── Property Row ── */
function propRow(label,control){
  return el('div',{className:'gs-prop-row'},[
    el('label',{className:'gs-prop-label',textContent:label}),
    el('div',{className:'gs-prop-control'},[control])
  ]);
}

/* ── Loading Spinner ── */
function spinner(size=40){
  const s=el('div',{className:'gs-spinner',style:{width:size+'px',height:size+'px'}});return s;
}

/* ── Badge ── */
function badge(text,type='default'){
  return el('span',{className:`gs-badge gs-badge--${type}`,textContent:text});
}

/* ── Export ── */
window.UI={el,icon,toast,modal,confirm,prompt,dropdown,slider,colorPicker,numberInput,textInput,checkbox,treeView,tabs,splitPane,contextMenu,section,propRow,spinner,badge,ICON_PATHS};
})();
