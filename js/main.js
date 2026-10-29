/* GATO — Grand Theft Gato VI
   Small, dependency-free interactions. */
(() => {
  'use strict';

  /* =====================================================================
     CONFIG — fill these in when you have them. Empty string = not shown.
     ===================================================================== */
  const GATO = {
    ticker: '$GATO',
    contract: 'TBA',
    buy: '',                 // e.g. DEX / launchpad URL — all "Pre-Purr Now" buttons link here when set
    socials: {
      x: 'https://x.com/gta6catgato',
      telegram: 'https://t.me/gta6catgato',
      instagram: '',
      youtube: '',
      tiktok: '',
      discord: '',
    },
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Toast ---------- */
  const toast = $('#toast');
  let toastTimer;
  const say = (msg, ms = 2600) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), ms);
  };

  /* ---------- Wire config: buy links, CA chip, socials ---------- */
  if (GATO.buy) {
    $$('.js-buy').forEach((a) => {
      a.href = GATO.buy;
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }
  const caChip = $('#caChip');
  const caText = $('#caText');
  if (caChip && caText && GATO.contract) {
    caText.textContent = GATO.contract;
    caChip.hidden = false;
    caChip.setAttribute('aria-label', `Copy contract address ${GATO.contract}`);
    caChip.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(GATO.contract);
        say('CA copied. He saw you do it.');
      } catch {
        say('Could not copy. Long-press it like it\'s 2009.');
      }
    });
  }
  Object.entries(GATO.socials).forEach(([key, url]) => {
    $$(`a[data-social="${key}"]`).forEach((a) => {
      if (url) {
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
      } else {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          say('Link coming soon. He is not in a hurry.');
        });
      }
    });
  });

  /* ---------- Nav: scrolled state + mobile toggle ---------- */
  const body = document.body;
  const navLinks = $('#navLinks');
  const navToggle = $('#navToggle');

  const onScroll = () => body.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    navLinks.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('is-open')) {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.focus();
      }
    });
  }

  /* ---------- Active nav link tracking ---------- */
  const sectionLinks = $$('.nav__links a[href^="#"]');
  const sections = sectionLinks
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          sectionLinks.forEach((a) =>
            a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id)
          );
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$('.reveal');
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 1.1 && r.bottom > 0;
  };
  revealEls.forEach((el) => { if (inView(el)) el.classList.add('is-visible'); });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Days on the ATM (Trailer 2 dropped May 6, 2025) ---------- */
  const daysEl = $('#daysOnAtm');
  if (daysEl) {
    const start = Date.UTC(2025, 4, 6);
    const days = Math.max(0, Math.floor((Date.now() - start) / 86400000));
    if (reduceMotion || document.hidden) {
      daysEl.textContent = days.toLocaleString();
    } else {
      let t0 = null;
      const dur = 1400;
      const tick = (t) => {
        if (t0 === null) t0 = t;
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        daysEl.textContent = Math.round(days * eased).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      setTimeout(() => { daysEl.textContent = days.toLocaleString(); }, dur + 400);
    }
  }

  /* ---------- Medallion easter egg ---------- */
  const medallion = $('#medallion');
  const stars = $('#wantedStars');
  const lines = [
    'Gato did not move.',
    'Insufficient funds.',
    'He blinked. Slowly. That was a threat.',
    'The clerk is not in charge.',
    'Nine lives. Zero moves.',
    "That'll be $4.99 and your dignity.",
    'Please step away from the ATM.',
    'He saw Jason first.',
    'Another day in paradise. His.',
    'This transaction has been declined by the cat.',
  ];
  let presses = 0;
  if (medallion) {
    medallion.addEventListener('click', () => {
      presses += 1;
      medallion.classList.remove('is-shaking');
      void medallion.offsetWidth;
      medallion.classList.add('is-shaking');

      if (presses % 6 === 0) {
        say('★★★★★★ WANTED LEVEL: MAXIMUM. He still hasn\'t moved.', 3600);
        if (stars) {
          stars.classList.remove('is-blinking');
          void stars.offsetWidth;
          stars.classList.add('is-blinking');
        }
      } else {
        say(lines[(presses - 1) % lines.length]);
      }
    });
  }

  /* ---------- Media grid: mark tiles whose image doesn't exist yet ---------- */
  $$('.tile[data-src]').forEach((tile) => {
    const src = tile.getAttribute('data-src');
    const img = new Image();
    img.onload = () => {
      if (tile.classList.contains('tile--portrait')) {
        tile.style.backgroundImage = `url("${src}"), radial-gradient(60% 60% at 50% 46%, rgba(255,45,149,.28), transparent 70%)`;
        tile.style.backgroundSize = '76%, cover';
        tile.style.backgroundPosition = 'center 42%, center';
      } else {
        tile.style.backgroundImage = `url("${src}")`;
      }
      tile.classList.remove('is-missing');
    };
    img.onerror = () => {
      tile.classList.add('is-missing');
      tile.removeAttribute('href');
      tile.setAttribute('aria-disabled', 'true');
    };
    img.src = src;
  });

  /* ---------- Media grid: collapsed by default, "Show all" expands ---------- */
  const mediaGrid = $('#mediaGrid');
  const mediaToggle = $('#mediaToggle');
  if (mediaGrid && mediaToggle) {
    const total = mediaGrid.querySelectorAll('.tile').length;
    const setLabel = (open) => { mediaToggle.textContent = open ? 'Show less' : `Show all artwork (${total})`; };
    setLabel(false);
    mediaToggle.addEventListener('click', () => {
      const open = mediaGrid.classList.toggle('is-open');
      mediaToggle.setAttribute('aria-expanded', String(open));
      setLabel(open);
      if (open) {
        // newly displayed tiles were hidden from the observer — reveal them now
        $$('.tile--more', mediaGrid).forEach((t) => t.classList.add('is-visible'));
      } else {
        mediaGrid.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });
    // deep link #media opens it
    if (location.hash === '#media') { mediaGrid.classList.add('is-open'); mediaToggle.setAttribute('aria-expanded', 'true'); setLabel(true); $$('.tile--more', mediaGrid).forEach((t) => t.classList.add('is-visible')); }
  }

  /* ---------- Signup (no backend — it's a meme) ---------- */
  const form = $('#signup');
  const msg = $('#signupMsg');
  if (form && msg) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#email', form);
      const val = (email && email.value.trim()) || '';
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      if (!ok) {
        msg.textContent = 'That is not an email. He can tell.';
        if (email) email.focus();
        return;
      }
      msg.textContent = "You're on the list. He'll get to it. Eventually.";
      form.reset();
      say('Bodega propaganda: incoming.');
    });
  }

  /* ---------- Newswire articles ----------
     Full posts open in an in-page reader; [data-article] anchors trigger it.
     (Guarded: only index.html has the reader markup.) */
  const NEWS = {
    'extended-nap': {
      kicker: 'Announcement',
      title: 'Gato: An Extended Nap',
      date: 'August 6, 2026',
      iso: '2026-08-06',
      img: 'assets/bg/cast.jpg',
      alt: 'The crew of the Marin Family Bodega, with Gato front and center.',
      body: [
        'On August 27, Gato will do what he does best, for longer than he has ever done it: nothing. An Extended Nap is a special live broadcast from the counter of the Marin Family Bodega, in which Gato is expected to remain asleep for a duration experts are calling "honestly impressive."',
        'Filmed in a single continuous shot with zero camera movement — out of respect — An Extended Nap features appearances from Hector Marin (restocking), two customers (confused), and the ceiling fan (load-bearing).',
        'Viewers can expect breathing, one ear twitch at approximately minute forty, and the growing feeling that they, too, should be resting. Analysts predict it will be the most-watched instance of nothing in Leonida history, narrowly beating the DMV.',
        'An Extended Nap premieres August 27, only on the ATM. He will not be doing press.',
      ],
      links: [{ label: 'Get notified when he wakes up', href: '#propaganda' }],
    },
    'pre-purr': {
      kicker: 'Editions',
      title: 'Pre-Purr Gato on June 25',
      date: 'June 24, 2026',
      iso: '2026-06-24',
      img: 'assets/bg/boxart.jpg',
      alt: 'GATO box art: Gato in classic key-art style.',
      body: [
        'Beginning June 25, you will be able to Pre-Purr Gato — the act of committing, in advance, to a cat who has committed to nothing.',
        'The Standard Edition includes Gato. The Ultimate Gato Edition includes Gato, a deluxe sense of superiority, and the Vintage Mice City Pack — a flashback to 1986, when the catnip burned brightest and the mice were plentiful.',
        'Those who Pre-Purr will receive no early access of any kind, because he is a cat, and he is already there. What you are purchasing is the feeling. The feeling is real. It lives on Ethereum.',
        'Physical editions were considered. He knocked them off the shelf.',
      ],
      links: [{ label: 'Pre-Purr Now', href: '#propaganda' }],
    },
    'nov-19': {
      kicker: 'A Message From The Bodega',
      title: "Gato Is Now Set to Move Off the ATM November 19, 2026 (He Won't)",
      date: 'November 6, 2025',
      iso: '2025-11-06',
      img: 'assets/bg/gato.jpg',
      alt: 'Gato on the ATM inside the bodega, not moving.',
      body: [
        'We are writing to share an update. Gato is now set to move off the ATM on Thursday, November 19, 2026. We know this is later than many of you were hoping, and we appreciate that you have been standing in the store this entire time.',
        'The additional months will allow him to finish the nap with the level of polish you have come to expect. Moving off an ATM at this scale has never been attempted by this cat, and getting it right means not rushing the stretch, the slow blink, or the moment where he looks at the floor and reconsiders.',
        'To be clear: he will not be moving off the ATM on November 19, 2026. The date is real. The move is not. He has been on the ATM since May 6, 2025, and considers the arrangement permanent. The ATM has stopped dispensing cash and now dispenses respect.',
        'Thank you for your patience. He has not noticed it.',
      ],
      links: [{ label: 'Read his rap sheet', href: '#rapsheet' }],
    },
    'trailer-2': {
      kicker: 'Origin',
      title: 'Cat Spotted on ATM in Trailer 2; Internet Loses Its Mind',
      date: 'May 6, 2025',
      iso: '2025-05-06',
      img: 'assets/gta-cat.png',
      alt: 'The original trailer frame: a brown tabby cat sitting on an ATM.',
      body: [
        'On May 6, 2025, the second trailer for the most significant gaming release ever ran for two minutes and forty-eight seconds. For roughly one of those seconds, a brown tabby cat sat on an ATM inside a Leonida bodega. The trailer has been viewed hundreds of millions of times. We are confident the cat is the reason.',
        'Within hours, the frame had been isolated, enhanced, printed, and argued about. Names were proposed. Petitions were started. A man in Ohio claimed it was his cat. It was not his cat.',
        'The community settled on Gato — because he is a cat, and that is the word for cat. He has since become the calmest thing ever associated with Vice City, and the only resident whose record is entirely misdemeanors.',
        'Gato now lives on Ethereum, where he continues to sit completely still while everything around him moves very fast.',
      ],
      links: [
        { label: 'Watch Trailer 2', href: 'https://www.youtube.com/watch?v=VQRLujxTm3c', external: true },
        { label: 'Read the story', href: '#story' },
      ],
    },
  };

  const articleEl = $('#article');
  if (articleEl) {
    const panel = $('#articlePanel');
    const imgEl = $('#articleImg');
    const kickerEl = $('#articleKicker');
    const titleEl = $('#articleTitle');
    const dateEl = $('#articleDate');
    const textEl = $('#articleText');
    const linksEl = $('#articleLinks');
    const closeBtn = $('.article__close', articleEl);
    let lastFocus = null;
    let hideTimer = null;

    const closeArticle = () => {
      if (articleEl.hidden) return;
      articleEl.classList.remove('is-on');
      body.classList.remove('article-open');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { articleEl.hidden = true; }, 380);
      if (lastFocus) { lastFocus.focus(); lastFocus = null; }
    };

    const openArticle = (slug) => {
      const a = NEWS[slug];
      if (!a) return;
      imgEl.src = a.img;
      imgEl.alt = a.alt || '';
      kickerEl.textContent = a.kicker || 'Newswire';
      titleEl.textContent = a.title;
      dateEl.textContent = a.date;
      dateEl.setAttribute('datetime', a.iso);
      textEl.textContent = '';
      a.body.forEach((para) => {
        const p = document.createElement('p');
        p.textContent = para;
        textEl.appendChild(p);
      });
      linksEl.textContent = '';
      (a.links || []).forEach((l) => {
        const link = document.createElement('a');
        link.className = 'link';
        link.href = l.href;
        link.textContent = l.label;
        if (l.external) { link.target = '_blank'; link.rel = 'noopener'; }
        else link.addEventListener('click', closeArticle); // close, then let the anchor scroll
        linksEl.appendChild(link);
      });
      clearTimeout(hideTimer);
      lastFocus = document.activeElement;
      articleEl.hidden = false;
      panel.scrollTop = 0;
      requestAnimationFrame(() => articleEl.classList.add('is-on'));
      body.classList.add('article-open');
      closeBtn.focus();
    };

    $$('[data-article]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openArticle(el.dataset.article);
      });
    });
    $$('[data-article-close]', articleEl).forEach((el) => el.addEventListener('click', closeArticle));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeArticle(); });

    const newsAll = $('#newsAll');
    if (newsAll) {
      newsAll.addEventListener('click', (e) => {
        e.preventDefault();
        say("That's the whole Newswire. He doesn't do much.");
      });
    }
  }

  /* ---------- v2: propaganda pill opens the signup; Remind Me toast ---------- */
  const propBtn = $('#propagandaBtn');
  if (propBtn && form) {
    propBtn.addEventListener('click', () => {
      const open = form.classList.toggle('is-open');
      propBtn.setAttribute('aria-expanded', String(open));
      if (open) { const email = $('#email', form); if (email) email.focus(); }
    });
    // Deep links (#propaganda) open it too
    if (location.hash === '#propaganda') { form.classList.add('is-open'); propBtn.setAttribute('aria-expanded', 'true'); }
    window.addEventListener('hashchange', () => { if (location.hash === '#propaganda') { form.classList.add('is-open'); propBtn.setAttribute('aria-expanded', 'true'); } });
  }
  const remind = $('#remindBtn');
  if (remind) {
    remind.addEventListener('click', () => say("He'll remind you. He won't. He's asleep."));
  }

  /* ---------- Cookie settings ---------- */
  const cookieLink = $('#cookieLink');
  if (cookieLink) {
    cookieLink.addEventListener('click', (e) => {
      e.preventDefault();
      say('He ate the cookies.');
    });
  }

  /* ---------- Placeholder footer links ---------- */
  $$('.footer__links a[href="#"]:not(#cookieLink)').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      say('Link coming soon. He is not in a hurry.');
    });
  });

  /* ---------- Theme music: loops, remembers your choice, mute button ----------
     Same hardened setup as the solo site:
       - the volume ramp guarantees its endpoint via setTimeout (rAF alone can be
         starved while the page isn't painting, stranding audio at volume 0)
       - unlock listeners stay armed until the 'playing' event confirms sound
       - browsers do NOT count scrolling as user activation, so while audio is
         blocked a "Tap for sound" prompt appears; any click/tap/key starts it
       - the button bars animate only while audio is genuinely playing
     (Guarded: the parked v2 pages load this file without the audio markup.)    */
  const audio = $('#theme');
  const soundBtn = $('#soundBtn');
  const soundHint = $('#soundHint');
  let startTheme = null; // set below; called by the loading screen's Enter click
  if (audio && soundBtn) {
    const clampV = (v, a, b) => Math.min(b, Math.max(a, v));
    const VOL = 0.55;
    const STORE = 'gato-muted';
    let muted = localStorage.getItem(STORE) === '1';
    let wantPlaying = false;

    audio.loop = true;
    audio.volume = muted ? 0 : VOL;

    const paintBtn = () => {
      soundBtn.setAttribute('aria-pressed', String(muted));
      soundBtn.setAttribute('aria-label', muted ? 'Unmute music' : 'Mute music');
      soundBtn.title = muted ? 'Unmute music' : 'Mute music';
    };

    let volRAF = null, volTimer = null;
    const rampTo = (to, ms = 1200) => {
      cancelAnimationFrame(volRAF);
      clearTimeout(volTimer);
      const target = clampV(to, 0, 1);
      const from = audio.volume;
      const t0 = performance.now();
      const finish = () => {
        cancelAnimationFrame(volRAF);
        clearTimeout(volTimer);
        audio.volume = target;            // guaranteed endpoint
        if (target === 0) audio.pause();
      };
      const step = (t) => {
        const k = clampV((t - t0) / ms, 0, 1);
        audio.volume = clampV(from + (target - from) * (k * k * (3 - 2 * k)), 0, 1);
        if (k < 1) volRAF = requestAnimationFrame(step);
        else finish();
      };
      volRAF = requestAnimationFrame(step);
      volTimer = setTimeout(finish, ms + 250);
    };

    const UNLOCK = ['pointerdown', 'pointerup', 'keydown', 'touchstart', 'touchend', 'wheel', 'scroll', 'click'];
    let armed = false;
    const unlock = () => { if (!muted) start(); };
    const showHint = (on) => {
      if (!soundHint) return;
      if (on) { soundHint.hidden = false; requestAnimationFrame(() => soundHint.classList.add('is-on')); }
      else { soundHint.classList.remove('is-on'); setTimeout(() => { soundHint.hidden = true; }, 450); }
    };
    const arm = () => {
      if (armed) return;
      armed = true;
      UNLOCK.forEach((e) => window.addEventListener(e, unlock, { passive: true }));
      showHint(!muted);   // scrolling can't unlock audio — ask for the one tap that can
    };
    const disarm = () => {
      if (!armed) return;
      armed = false;
      UNLOCK.forEach((e) => window.removeEventListener(e, unlock));
      showHint(false);
    };

    const start = () => {
      if (muted) return;
      wantPlaying = true;
      audio.volume = 0;                   // fade up from silence on success
      const p = audio.play();
      if (p && p.catch) {
        p.catch(() => {
          audio.volume = VOL;             // never leave it stuck silent
          arm();                          // keep listening for a real interaction
        });
      }
    };

    // The only reliable signal that sound is actually coming out.
    audio.addEventListener('playing', () => {
      disarm();
      soundBtn.classList.add('is-playing');
      rampTo(VOL, 1200);
    });
    audio.addEventListener('pause', () => soundBtn.classList.remove('is-playing'));

    if (soundHint) {
      soundHint.addEventListener('click', (e) => {
        e.stopPropagation();
        muted = false;
        localStorage.setItem(STORE, '0');
        paintBtn();
        start();
      });
    }

    soundBtn.addEventListener('click', () => {
      muted = !muted;
      localStorage.setItem(STORE, muted ? '1' : '0');
      paintBtn();
      if (muted) {
        wantPlaying = false;
        disarm();
        showHint(false);
        rampTo(0, 400);
        say('Muted. He prefers it quiet anyway.');
      } else {
        start();
        say('Theme on.');
      }
    });

    // NOTE: no pause-on-visibilitychange here. Embedded browsers (like the app
    // preview) can report the document "hidden" while it is plainly on screen,
    // which killed the music seconds after Enter. The loop just keeps playing;
    // the mute button is the control.

    paintBtn();
    soundBtn.hidden = false;
    soundBtn.classList.add('is-ready');
    startTheme = start;
    // With the loading screen, playback starts from its Enter click instead —
    // that click is guaranteed user activation, so play() is allowed.
    if (!$('#loader')) start();
  }

  /* ---------- Loading screen ----------
     Preloads the first-view images, holds the bar for a beat, then swaps it
     for an Enter button. Entering starts the music (see above) and crossfades
     out from under the logo, which is pinned onto the hero logo — a match cut.
     (Guarded: only index.html has the markup.) */
  const loader = $('#loader');
  if (loader) {
    const fill = $('#loaderFill');
    const pctEl = $('#loaderPct');
    const noteEl = $('#loaderNote');
    const enterBtn = $('#enterBtn');
    const MIN_MS = 1800;

    const notes = ['Waking the cat…', 'Loading Vice City…', 'Polishing the neon…', 'Counting his days on the ATM…'];
    let noteI = 0;
    const noteTimer = setInterval(() => { noteI = (noteI + 1) % notes.length; noteEl.textContent = notes[noteI]; }, 2200);

    // First-view assets only — everything below the fold lazy-loads as you scroll.
    const ASSETS = ['assets/title-display.png', 'assets/bg/hero.jpg', 'assets/logo-1024.jpg', 'assets/logo-256.png', 'assets/bg/cast.jpg'];
    let loadedN = 0;
    const bootAt = performance.now();

    // Pin the loading-screen logo exactly onto the hero logo behind it, so the
    // crossfade out doesn't move the mark at all.
    const loaderLogo = $('.loader__logo');
    const loaderInner = $('.loader__inner');
    const heroLogo = $('.logo-mark__img');
    const matchLogo = () => {
      if (!loaderLogo || !loaderInner || !heroLogo) return;
      loaderInner.style.transform = 'none';
      const h = heroLogo.getBoundingClientRect();
      if (!h.width) return;
      loaderLogo.style.width = h.width + 'px';
      const l = loaderLogo.getBoundingClientRect();
      loaderInner.style.transform = `translateY(${(h.top - l.top).toFixed(1)}px)`;
    };
    matchLogo();
    // the hero stack shifts when the web fonts swap in — re-pin, don't jump
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(matchLogo);
    window.addEventListener('load', matchLogo);
    window.addEventListener('resize', matchLogo);

    let readied = false;
    const ready = () => {
      if (readied) return;
      readied = true;
      clearInterval(noteTimer);
      noteEl.textContent = localStorage.getItem('gato-muted') === '1'
        ? 'He remembers you like it quiet.'
        : 'Sound on. He insists.';
      enterBtn.hidden = false;
      requestAnimationFrame(() => loader.classList.add('is-ready'));
    };

    // The bar tracks whichever is slower: the real download or the minimum
    // display time, so a fast connection still sees the screen, not a flash.
    const paint = () => {
      const shown = Math.min(loadedN / ASSETS.length, (performance.now() - bootAt) / MIN_MS, 1);
      fill.style.width = (shown * 100).toFixed(1) + '%';
      pctEl.textContent = Math.round(shown * 100);
      if (shown >= 1) ready();
      else requestAnimationFrame(paint);
    };

    enterBtn.addEventListener('click', () => {
      if (startTheme) startTheme();   // inside the click = user activation, audio allowed
      matchLogo();
      loader.classList.add('is-clearing');
      setTimeout(() => {
        loader.classList.add('is-done');
        document.body.classList.remove('is-loading');
        window.scrollTo(0, 0);
        // the scrollbar just came back — let scroll-fx re-measure its ranges
        window.dispatchEvent(new Event('resize'));
        setTimeout(() => { loader.remove(); window.removeEventListener('resize', matchLogo); }, 800);
      }, 300);
    });

    ASSETS.forEach((src) => {
      const im = new Image();
      im.onload = im.onerror = () => { loadedN++; };
      im.src = src;
    });
    requestAnimationFrame(paint);
  }
})();
