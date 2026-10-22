/* GATO — scroll-fx
   Rockstar-style scroll staging without a library:
   - A fixed background stack (behind the page). Any section with data-bg declares which
     layer should show while it's on screen; layers cross-fade by how much of the viewport
     each section covers, so cards/text scroll OVER the backgrounds.
   - Ken Burns drift: each layer scales/pans slightly with its section's progress.
   - Sticky content fades: sections with data-fade="out" | "inout" get --fade / --rise vars.
   - Scroll-scrubbed motion: data-bg-video="clip.mp4" scrubs a muted video by scroll
     progress; data-bg-frames="path/{i}.jpg" data-bg-frame-count="N" draws an image
     sequence to a canvas. Both fall back to the still image if assets are missing.

   Section attributes:
     data-bg="key"            layer key (sections sharing a key share a layer)
     data-bg-src="…jpg"       still image (required)
     data-bg-pos="50% 50%"    background-position (desktop)   [optional]
     data-bg-pos-m="25% 30%"  background-position (≤760px)    [optional]
     data-bg-veil="center|left|right|soft|none"               [default none]
     data-bg-tint="#1f1f38"   tint colour for left/right veils [optional]
     data-bg-video="…mp4"     scroll-scrubbed video           [optional]
     data-bg-frames="dir/{i}.jpg" data-bg-frame-count="120" data-bg-frame-pad="4"  [optional]
     data-fade="out|inout"    sticky content fade behaviour   [optional]
*/
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = Array.from(document.querySelectorAll('[data-bg]'));
  if (!sections.length) return;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* ---------- Build the fixed layer stack ---------- */
  const stack = document.createElement('div');
  stack.className = 'bgstack';
  stack.setAttribute('aria-hidden', 'true');
  document.body.prepend(stack);

  const layers = new Map(); // key -> layer record

  const makeLayer = (sec) => {
    const key = sec.dataset.bg;
    const el = document.createElement('div');
    el.className = 'bgl';
    el.dataset.layer = key;
    if (sec.dataset.bgTint) el.style.setProperty('--tint', sec.dataset.bgTint);
    if (sec.dataset.bgPos) el.style.setProperty('--pos', sec.dataset.bgPos);
    if (sec.dataset.bgPosM) el.style.setProperty('--pos-m', sec.dataset.bgPosM);

    const img = document.createElement('div');
    img.className = 'bgl__img';
    // portrait screens can declare their own still via data-bg-src-m
    const stillSrc = (window.matchMedia('(max-aspect-ratio: 1/1)').matches && sec.dataset.bgSrcM)
      ? sec.dataset.bgSrcM : sec.dataset.bgSrc;
    if (stillSrc) img.style.backgroundImage = `url("${stillSrc}")`;
    el.appendChild(img);

    // Optional scroll-scrubbed video (still image stays underneath as fallback/poster)
    let video = null;
    if (sec.dataset.bgVideo && !reduce) {
      video = document.createElement('video');
      video.className = 'bgl__video';
      video.muted = true; video.playsInline = true; video.preload = 'auto';
      video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
      video.src = sec.dataset.bgVideo;
      video.addEventListener('loadeddata', () => el.classList.add('has-video'));
      video.addEventListener('error', () => { el.classList.remove('has-video'); video = null; });
      el.appendChild(video);
    }

    // Optional image sequence drawn on a canvas (scroll-scrubbed, lerped for smoothness).
    // Frames load lazily (6 lanes, playback order) once the section comes within range.
    // A second, portrait cut can be declared with data-bg-frames-m — the active cut follows
    // the viewport live (rotate / resize), and only the cut in use is downloaded.
    let seq = null;
    if (sec.dataset.bgFrames && sec.dataset.bgFrameCount && !reduce) {
      const count = parseInt(sec.dataset.bgFrameCount, 10) || 0;
      const pad = parseInt(sec.dataset.bgFramePad || '4', 10);
      const canvas = document.createElement('canvas');
      canvas.className = 'bgl__canvas';
      el.appendChild(canvas);

      const makeSet = (tpl) => {
        if (!tpl) return null;
        const urls = [];
        for (let i = 0; i < count; i++) urls.push(tpl.replace('{i}', String(i + 1).padStart(pad, '0')));
        return { urls, frames: new Array(count), started: false };
      };
      const sets = { land: makeSet(sec.dataset.bgFrames), port: makeSet(sec.dataset.bgFramesM) };
      const mqP = window.matchMedia('(max-aspect-ratio: 1/1)');
      const pick = () => (mqP.matches && sets.port ? 'port' : 'land');

      seq = {
        canvas, ctx: canvas.getContext('2d'), sets, count,
        key: pick(), playhead: 0, target: 0, last: -1, lastKey: '', el,
      };

      const loadSet = (key) => {
        const set = seq.sets[key];
        if (!set || set.started) return;
        set.started = true;
        let next = 0;
        const pump = () => {
          if (next >= count) return;
          const i = next++;
          const im = new Image();
          im.decoding = 'async';
          im.onload = () => {
            set.frames[i] = im;
            if (!el.classList.contains('has-frames')) { el.classList.add('has-frames'); seq.last = -1; }
            pump();
          };
          im.onerror = () => { pump(); };
          im.src = set.urls[i];
        };
        for (let k = 0; k < 6; k++) pump(); // 6 parallel lanes, in order
      };
      seq.start = () => loadSet(seq.key);
      seq.started = true; // legacy flag; loading is per-set now

      const onFlip = () => {
        const next = pick();
        if (next === seq.key) return;
        seq.key = next;
        seq.last = -1; seq.lastKey = '';
        loadSet(next); // lazy: only fetched if the viewport actually flips
      };
      if (mqP.addEventListener) mqP.addEventListener('change', onFlip);
      else mqP.addListener(onFlip);
      window.addEventListener('resize', onFlip);
    }

    const veil = document.createElement('div');
    veil.className = 'bgl__veil bgl__veil--' + (sec.dataset.bgVeil || 'none');
    el.appendChild(veil);

    stack.appendChild(el);
    return { key, el, img, video, seq, opacity: 0, shown: 0, progress: 0.5, weight: 0 };
  };

  sections.forEach((sec) => { if (!layers.has(sec.dataset.bg)) layers.set(sec.dataset.bg, makeLayer(sec)); });

  /* ---------- Frame drawing (cover-fit; canvas sized on resize only) ---------- */
  const sizeCanvases = () => {
    layers.forEach((rec) => {
      if (!rec.seq) return;
      rec.seq.canvas.width = window.innerWidth;
      rec.seq.canvas.height = window.innerHeight;
      rec.seq.last = -1; // force redraw at the new size
    });
  };
  window.addEventListener('resize', sizeCanvases);
  sizeCanvases();

  /* A sequence may be shared by several stacked sections (e.g. the story block and the pinned
     walk below it). Scrub across their COMBINED range so playback is one continuous take:
     starts when the first section's top enters at the viewport bottom, ends when the last
     section's bottom reaches it. */
  const measureSeqRanges = () => {
    const vh = window.innerHeight;
    layers.forEach((rec) => {
      if (!rec.seq) return;
      let top = Infinity, bottom = -Infinity;
      for (const sec of sections) {
        if (sec.dataset.bg !== rec.key) continue;
        const r = sec.getBoundingClientRect();
        top = Math.min(top, r.top + window.scrollY);
        bottom = Math.max(bottom, r.bottom + window.scrollY);
      }
      if (!isFinite(top)) return;
      rec.seq.scrubStart = top - vh;
      rec.seq.scrubEnd = Math.max(bottom - vh, top - vh + 1);
    });
  };
  measureSeqRanges();
  window.addEventListener('resize', measureSeqRanges);
  window.addEventListener('load', measureSeqRanges);

  const nearestLoaded = (set, want) => {
    if (!set) return -1;
    let i = want;
    while (i >= 0 && !set.frames[i]) i--;   // nearest already-loaded frame at or below the target
    return i;
  };

  const drawFrameIndex = (s, idx) => {
    // draw from the active cut; while its frames are still arriving after an
    // orientation flip, keep showing the other cut instead of going blank
    let key = s.key;
    let i = nearestLoaded(s.sets[key], idx);
    if (i < 0) {
      key = key === 'port' ? 'land' : 'port';
      i = nearestLoaded(s.sets[key], idx);
      if (i < 0) return;
    }
    if (i === s.last && key === s.lastKey) return;
    const im = s.sets[key].frames[i];
    const cw = s.canvas.width, ch = s.canvas.height;
    if (!cw || !ch) return;
    const r = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * r, h = im.naturalHeight * r;
    s.ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    s.last = i; s.lastKey = key;
  };

  /* Persistent smoother: eases each visible sequence's playhead toward its scroll target,
     so scrubbing (both directions) glides instead of stepping. Early-exits when idle. */
  const smoothLoop = () => {
    layers.forEach((rec) => {
      const s = rec.seq;
      if (!s || !s.started || rec.shown <= 0.005) return;
      const targetFrame = s.target * (s.count - 1);
      const d = targetFrame - s.playhead;
      if (Math.abs(d) > 0.01) {
        s.playhead += d * 0.16;
        if (Math.abs(targetFrame - s.playhead) < 0.05) s.playhead = targetFrame;
      }
      drawFrameIndex(s, clamp(Math.round(s.playhead), 0, s.count - 1));
    });
    requestAnimationFrame(smoothLoop);
  };
  requestAnimationFrame(smoothLoop);

  /* ---------- Per-frame update ---------- */
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    layers.forEach((rec) => {
      rec.opacity = 0; rec.weight = 0; rec.progress = 0;
      // Scrub position across the sequence's combined section range (bidirectional).
      if (rec.seq && rec.seq.scrubEnd != null) {
        rec.seq.target = clamp((window.scrollY - rec.seq.scrubStart) / (rec.seq.scrubEnd - rec.seq.scrubStart), 0, 1);
      }
    });

    for (const sec of sections) {
      const r = sec.getBoundingClientRect();
      if (r.bottom <= -vh || r.top >= vh * 2) { if (sec.dataset.fade) sec.style.setProperty('--fade', sec.dataset.fade === 'out' ? '1' : '0'); continue; }

      // Fraction of the viewport this section covers (drives layer opacity)
      const covered = clamp(Math.min(r.bottom, vh) - Math.max(r.top, 0), 0, vh) / vh;
      // Progress of the section through the viewport: 0 = top at bottom edge, 1 = bottom at top edge
      const p = clamp((vh - r.top) / (vh + r.height), 0, 1);

      const rec = layers.get(sec.dataset.bg);
      if (rec) {
        rec.opacity = clamp(rec.opacity + covered, 0, 1);
        // weighted progress so shared layers drift smoothly
        rec.progress = (rec.progress * rec.weight + p * covered) / Math.max(rec.weight + covered, 1e-6);
        rec.weight += covered;
        if (rec.seq) rec.seq.start(); // lazy: first time a section comes within range
      }

      // Sticky content fades (hero / promo)
      if (sec.dataset.fade) {
        // progress inside the section's own scroll span (0 = pinned start, 1 = pinned end)
        const span = Math.max(r.height - vh, 1);
        const q = clamp(-r.top / span, 0, 1);
        let fade;
        if (sec.dataset.fade === 'out') fade = 1 - smooth(0.45, 0.85, q);
        else fade = smooth(0.0, 0.22, q) * (1 - smooth(0.62, 0.92, q));
        sec.style.setProperty('--fade', fade.toFixed(3));
        sec.style.setProperty('--rise', ((1 - fade) * 24).toFixed(1));
      }
    }

    // True dissolve: while a layer ABOVE is partially visible, hold the layer beneath at full
    // opacity (otherwise two half-transparent layers dip to dark mid-transition).
    const list = Array.from(layers.values()); // DOM order = stacking order (bottom -> top)
    for (let i = 0; i < list.length; i++) {
      const raw = list[i].opacity;
      let heldUnder = false;
      if (raw > 0.001) {
        for (let j = i + 1; j < list.length; j++) { if (list[j].opacity > 0.001 && list[j].opacity < 0.999) { heldUnder = true; break; } }
      }
      list[i].shown = heldUnder ? 1 : raw;
    }

    layers.forEach((rec) => {
      const o = smooth(0, 1, rec.shown);
      rec.el.style.opacity = o.toFixed(3);
      rec.el.style.visibility = o > 0.005 ? 'visible' : 'hidden';
      if (o > 0.005) {
        if (!reduce) {
          const s = 1.04 + rec.progress * 0.08;
          const ty = (0.5 - rec.progress) * 5; // vh
          rec.img.style.transform = `scale(${s.toFixed(4)}) translate3d(0, ${ty.toFixed(2)}vh, 0)`;
        }
        if (rec.video && rec.video.readyState >= 2 && isFinite(rec.video.duration)) {
          const t = rec.progress * rec.video.duration;
          if (Math.abs(rec.video.currentTime - t) > 1 / 30) { try { rec.video.currentTime = t; } catch (e) { /* seeking */ } }
        }
        // (image sequences are drawn by smoothLoop, not here)
      }
    });
  };

  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', onScroll);
  update();
})();
