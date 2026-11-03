(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  /* ===================== DATOS (si no existe datos.js se usan estos) ===================== */
  const T = [
    ['NERVI', 'Los nervios', 'Todo era nuevo. Hasta el silencio se sentía bonito contigo cerca.'],
    ['RISAS', 'Las risas', 'Empezamos a reírnos de cosas que nadie más entendía.'],
    ['ABRAZ', 'Los abrazos', 'Descubrí que tu abrazo es capaz de arreglar un día entero.'],
    ['SUENO', 'Los sueños', 'Empecé a imaginar planes largos, de esos que incluyen un nosotros.'],
    ['CALMA', 'La calma', 'Contigo aprendí que la paz también tiene nombre.'],
    ['MEDIO', 'Medio año', 'Medio año. Y todavía me queda todo por descubrirte.'],
    ['ASTRO', 'Las estrellas', 'Mitad del camino. Desde aquí arriba se ven las estrellas.'],
    ['HOGAR', 'El hogar', 'Mi lugar favorito resultó ser donde tú estás.'],
    ['VUELO', 'El vuelo', 'Cada día contigo es un despegue, hasta los lunes.'],
    ['FELIZ', 'La felicidad', 'Ya no cuento lo que me hace feliz. Son demasiadas cosas y casi todas son tuyas.'],
    ['NUBES', 'Las nubes', 'Hubo días nublados y los cruzamos juntos. Así se llega lejos.'],
    ['UNAÑO', 'Un año entero', 'Un año entero. Elegiría este mismo vuelo otras mil veces.'],
    ['FARO', 'El faro', 'Eres la luz a la que siempre quiero volver.'],
    ['AHORA', 'Ahora', 'Hoy, catorce meses. Y la mejor parte del viaje sigue siendo tú.']
  ];
  const DEF = {
    nombre: 'Izamar',
    firma: 'Tu copiloto',
    inicio: [2025, 8, 4],
    carta: 'Catorce meses y todavía me sorprende lo fácil que es amarte. Gracias por quedarte, por reírte conmigo y por hacer que cualquier lugar se sienta como casa. Este vuelo no tiene hora de llegada. Sigo aquí, a tu lado, mirando por la misma ventanilla.',
    fotoFinal: 'fotos/foto15.jpg',
    paradas: T.map((t, i) => ({ fix: t[0], titulo: t[1], texto: t[2], poema: [], foto: `fotos/foto${String(i + 1).padStart(2, '0')}.jpg` })),
    voz: {}
  };
  const D = Object.assign({}, DEF, window.DATOS || {});
  const N = D.nombre;
  const V = Object.assign({
    bienvenida: [`Buenas noches, ${N}. Te habla tu copiloto. Bienvenida al vuelo 0409, con destino a mi corazón. Hoy no hay turbulencia, solo catorce escalas. Abre la ventanilla.`,
                 `Buenas noches, ${N}. Te habla tu copiloto. Bienvenida al vuelo cero cuatro cero nueve, con destino a mi corazón. Hoy no hay turbulencia, solo catorce escalas. Abre la ventanilla.`],
    crucero: `Hemos alcanzado la altitud de crucero. Ya puedes desabrocharte el cinturón. Vamos a recordar nuestros catorce meses.`,
    turbulencia: `Atención. Pasamos por unas nubes. Agárrate de mi mano.`,
    descenso: `Iniciamos el descenso. Abróchate el cinturón. Allá abajo hay algo amarillo esperándote.`,
    girasoles: `Es un campo de girasoles, ${N}. Lo sé, son tus favoritos.`,
    aterrizaje: `Hemos aterrizado. Bienvenida a casa, ${N}. Destino final: tú.`
  }, D.voz || {});

  /* ===================== utilidades ===================== */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const mod = (a, n) => ((a % n) + n) % n;
  const pad = n => String(n).padStart(2, '0');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const MES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const fmtDate = d => `${pad(d.getDate())} ${MES[d.getMonth()]} ${d.getFullYear()}`;
  const thousands = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* estado de la escena */
  const S = { alt: 0, speed: 0, sky: 0, field: 0, shade: 1, engine: 0, shake: 0, prog: 0 };
  function tween(key, to, ms, ease = smooth) {
    return new Promise(res => {
      const from = S[key], t0 = performance.now();
      if (RM) ms = 1;
      (function f(t) {
        const e = clamp((t - t0) / ms);
        S[key] = lerp(from, to, ease(e));
        if (e < 1) requestAnimationFrame(f); else res();
      })(t0);
    });
  }

  /* ===================== código de barras ===================== */
  (() => {
    let x = 0, out = '', seed = 409;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    while (x < 194) { const w = 1 + Math.floor(rnd() * 3.2); if (rnd() > .32) out += `<rect x="${x}" y="0" width="${w}" height="38"/>`; x += w + 1 + Math.floor(rnd() * 2); }
    $('bars').innerHTML = out;
    $('pname').textContent = N;
  })();

  /* ===================== audio: música, motor, campanita ===================== */
  let ac = null, master = null, engGain = null, musOut = null, musEl = null;
  const AU = { music: true, voice: true, ducked: false };

  function initAudio() {
    if (ac) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination);
      // motor: ruido grave
      const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
      engGain = ac.createGain(); engGain.gain.value = 0;
      src.connect(lp); lp.connect(engGain); engGain.connect(master); src.start();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { ac = null; }
    startMusic();
  }

  function startMusic() {
    // 1) si existe musica.mp3 en el repositorio, se usa; 2) si no, música generada
    let decided = false;
    const synth = () => { if (decided) return; decided = true; startSynth(); };
    try {
      musEl = new Audio('musica.mp3'); musEl.loop = true; musEl.volume = .5;
      musEl.addEventListener('error', synth);
      const p = musEl.play();
      if (p && p.then) p.then(() => { decided = true; applyMusic(); }).catch(synth);
    } catch (e) { synth(); }
  }

  function startSynth() {
    if (!ac) return;
    musEl = null;
    musOut = ac.createGain(); musOut.gain.value = 0; musOut.connect(master);
    const bus = ac.createGain(); bus.connect(musOut);
    const dl = ac.createDelay(1); dl.delayTime.value = .42;
    const fb = ac.createGain(); fb.gain.value = .4;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;
    bus.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(musOut);
    const CH = [
      [130.81, 196.0, 261.63, 329.63, 493.88],   // Do mayor 9
      [110.0, 164.81, 220.0, 261.63, 392.0],     // La menor
      [87.31, 130.81, 174.61, 220.0, 329.63],    // Fa mayor
      [98.0, 146.83, 196.0, 246.94, 392.0]       // Sol
    ];
    let k = 0;
    const pad = () => {
      const ch = CH[k++ % CH.length], t = ac.currentTime;
      ch.forEach((f, i) => [-6, 6].forEach(dt => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = i < 2 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = dt;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.04, t + 3); g.gain.linearRampToValueAtTime(.028, t + 6); g.gain.linearRampToValueAtTime(0, t + 10);
        o.connect(g); g.connect(bus); o.start(t); o.stop(t + 10.2);
      }));
    };
    const PENT = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    const bell = () => {
      const t = ac.currentTime, f = PENT[Math.floor(Math.random() * PENT.length)];
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + 3.2);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + 3.3);
    };
    pad(); setInterval(pad, 8000);
    setInterval(() => { if (Math.random() > .25) bell(); }, 3300);
    applyMusic();
  }

  function applyMusic() {
    const level = !AU.music ? 0 : AU.ducked ? .16 : .5;
    if (musEl) musEl.volume = level;
    if (musOut && ac) musOut.gain.setTargetAtTime(level, ac.currentTime, .4);
  }
  function duck(on) { AU.ducked = on; applyMusic(); }

  function tone(f, t0, dur, vol) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .015); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + .05);
  }
  const ding = () => { if (!ac) return; const t = ac.currentTime; tone(1174.7, t, 1.3, .1); tone(880, t + .3, 1.6, .1); };
  const arpeggio = () => { if (!ac) return; const t = ac.currentTime; [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, t + i * .16, 2, .08)); };
  const PE = [0, 2, 4, 7, 9];
  const starNote = n => { if (!ac) return; tone(261.63 * Math.pow(2, (PE[n % 5] + 12 * Math.floor(n / 5)) / 12), ac.currentTime, 1.8, .13); };

  $('tMus').addEventListener('click', e => { AU.music = !AU.music; e.currentTarget.setAttribute('aria-pressed', AU.music); applyMusic(); });
  $('tVoz').addEventListener('click', e => { AU.voice = !AU.voice; e.currentTarget.setAttribute('aria-pressed', AU.voice); if (!AU.voice) stopSay(); });

  /* ===================== voz del copiloto ===================== */
  const VA = new Audio(); VA.preload = 'auto';
  let sayId = 0, voices = [];
  const loadVoices = () => { try { voices = speechSynthesis.getVoices(); } catch (e) { voices = []; } };
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', loadVoices); }
  function pickVoice() {
    const es = voices.filter(v => /^es/i.test(v.lang));
    for (const l of ['es-VE', 'es-MX', 'es-419', 'es-US', 'es-CO', 'es-AR', 'es-ES']) {
      const m = es.filter(v => v.lang.replace('_', '-').toLowerCase() === l.toLowerCase());
      if (m.length) return m.find(v => /google|natural|online|premium|enhanced/i.test(v.name)) || m[0];
    }
    return es[0] || null;
  }
  function stopSay() { sayId++; try { speechSynthesis.cancel(); } catch (e) {} try { VA.onended = null; VA.onerror = null; VA.pause(); } catch (e) {} $('who').classList.remove('on'); duck(false); }
  // say(subtítulo, texto hablado opcional, id de archivo mp3 opcional: voz/ID.mp3)
  function say(text, spoken, fileId) {
    const id = ++sayId;
    try { speechSynthesis.cancel(); } catch (e) {}
    $('sub').textContent = text;
    return new Promise(res => {
      let done = false;
      const est = Math.max(2400, text.length * 62);
      const fin = () => { if (done) return; done = true; clearTimeout(wd); if (id === sayId) { $('who').classList.remove('on'); duck(false); } res(); };
      const wd = setTimeout(fin, est + 6000);
      if (!AU.voice) { setTimeout(fin, est); return; }
      $('who').classList.add('on'); duck(true);
      let fell = false;
      const tts = () => {
        if (fell) return; fell = true;
        if (!('speechSynthesis' in window)) { setTimeout(fin, est); return; }
        try {
          const u = new SpeechSynthesisUtterance(spoken || text);
          const v = pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'es-419';
          u.rate = .95; u.pitch = .85; u.volume = 1;
          u.onend = fin; u.onerror = fin;
          speechSynthesis.speak(u);
        } catch (e) { setTimeout(fin, est); }
      };
      if (fileId) {
        try {
          const ruta = [`voz/${fileId}.mp3`, `${fileId}.mp3`, `voz/voz/${fileId}.mp3`]; let ri = 0;
          VA.onended = fin;
          VA.onerror = () => { ri++; if (ri < ruta.length) { VA.src = ruta[ri]; const q = VA.play(); if (q && q.catch) q.catch(() => {}); } else tts(); };
          VA.src = ruta[0];
          const p = VA.play(); if (p && p.catch) p.catch(tts);
        } catch (e) { tts(); }
      } else tts();
    });
  }

  /* ===================== escena (canvas) ===================== */
  const cv = $('scene'), g = cv.getContext('2d');
  let w = 0, h = 0, stars = [], clouds = [], city = [];
  const OFF = { cloud: 0, ground: 0 };
  const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const KEYS = [[0, '#070b1e', '#101a40'], [.5, '#0a1030', '#1b2558'], [.8, '#1a1747', '#3a2c70'], [1, '#34276f', '#e58a52']].map(k => [k[0], hex(k[1]), hex(k[2])]);
  const mix = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  function skyAt(p) {
    let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = clamp((p - a[0]) / (b[0] - a[0]));
    return [mix(a[1], b[1], t), mix(a[2], b[2], t)];
  }
  const horizon = () => h * (.6 + .1 * S.alt);

  function resize() {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round(w * h / 3200) }, () => ({ x: Math.random() * w, y: Math.random() * h * .85, r: Math.random() * 1.2 + .3, t: Math.random() * 6.28, s: .6 + Math.random() * 1.8 }));
    clouds = Array.from({ length: 13 }, (_, i) => ({ x: Math.random() * w * 1.6, y: Math.random() * h * .75, w: w * (.5 + Math.random() * .7), h: h * (.1 + Math.random() * .1), z: .25 + Math.random() * .75, a: .05 + Math.random() * .07, seed: Math.random() * 6 }));
    // ciudades: grupos de luces
    city = [];
    for (let c = 0; c < 16; c++) {
      const cx = Math.random() * w * 2, cd = Math.random();
      for (let j = 0; j < 22; j++) city.push({ x: cx + (Math.random() - .5) * w * .35, d: clamp(cd + (Math.random() - .5) * .25), s: Math.random() * 6 });
    }
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(cv);
  addEventListener('resize', resize);

  function cloud(c, cr, cg, cb, k) {
    const x = mod(c.x - OFF.cloud * c.z * 60, w * 1.6 + c.w) - c.w * .5, y = c.y;
    for (let j = 0; j < 5; j++) {
      const bx = x + (j - 2) * c.w * .2, by = y + Math.sin(j * 2.1 + c.seed) * c.h * .25, r = c.h * (.6 + .3 * Math.sin(j * 1.3 + c.seed));
      const gr = g.createRadialGradient(bx, by, 0, bx, by, r);
      gr.addColorStop(0, `rgba(${cr},${cg},${cb},${c.a * k})`); gr.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      g.fillStyle = gr; g.fillRect(bx - r, by - r, 2 * r, 2 * r);
    }
  }

  function draw(t) {
    if (!w) return;
    const sk = skyAt(S.sky), dawn = smooth((S.sky - .72) / .28), yH = horizon();
    g.save();
    if (S.shake > .01) g.translate((Math.random() - .5) * S.shake * 9, (Math.random() - .5) * S.shake * 9);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, rgb(sk[0])); gr.addColorStop(1, rgb(sk[1]));
    g.fillStyle = gr; g.fillRect(-12, -12, w + 24, h + 24);

    if (dawn > 0) {
      const rg = g.createRadialGradient(w * .3, yH, 0, w * .3, yH, w * .8);
      rg.addColorStop(0, `rgba(255,200,110,${.85 * dawn})`); rg.addColorStop(1, 'rgba(255,160,90,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
      g.fillStyle = `rgba(255,228,150,${dawn})`; g.beginPath(); g.arc(w * .3, yH - w * .03 + (1 - dawn) * 50, w * .07, 0, 6.283); g.fill();
    }
    // estrellas y luna
    const sa = 1 - dawn * .9;
    for (const s of stars) {
      g.globalAlpha = clamp((.45 + .55 * Math.sin(t * s.s + s.t)) * sa);
      g.fillStyle = '#eef1ff'; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;
    if (dawn < .85) {
      const mx = w * .78, my = h * .2, mr = w * .06, ma = 1 - dawn * 1.2;
      const mg = g.createRadialGradient(mx, my, mr * .5, mx, my, mr * 4);
      mg.addColorStop(0, `rgba(230,238,255,${.35 * ma})`); mg.addColorStop(1, 'rgba(230,238,255,0)');
      g.fillStyle = mg; g.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
      g.fillStyle = `rgba(247,249,255,${ma})`; g.beginPath(); g.arc(mx, my, mr, 0, 6.283); g.fill();
    }
    const k = smooth((S.sky - .75) / .25), cr = lerp(214, 255, k) | 0, cg = lerp(222, 196, k) | 0, cb = lerp(255, 158, k) | 0;
    const cvis = .35 + .65 * smooth(S.alt / .5);
    for (const c of clouds) if (c.z < .6) cloud(c, cr, cg, cb, cvis);

    // suelo (despegue y aterrizaje)
    const ga = 1 - smooth(S.alt / .35);
    if (ga > .01) {
      g.globalAlpha = ga;
      const bg = g.createLinearGradient(0, yH, 0, h); bg.addColorStop(0, dawn > .3 ? '#3a2a4a' : '#0b1128'); bg.addColorStop(1, '#04060f');
      g.fillStyle = bg; g.fillRect(0, yH, w, h - yH);
      if (S.field > .01) {
        g.globalAlpha = ga * S.field;
        const fg = g.createLinearGradient(0, yH, 0, h); fg.addColorStop(0, '#6b5a22'); fg.addColorStop(1, '#2d3a14');
        g.fillStyle = fg; g.fillRect(0, yH, w, h - yH);
      }
      g.globalAlpha = ga * (1 - S.field);
      for (const c of city) {
        const y = yH + Math.pow(c.d, 1.7) * (h - yH), x = mod(c.x - OFF.ground * (.15 + c.d), w * 2) - w * .3;
        if (x < -4 || x > w + 4) continue;
        g.fillStyle = `rgba(255,${200 + c.s * 8 | 0},${140 + c.s * 10 | 0},${.55 + .45 * Math.sin(t * 2 + c.s)})`;
        g.beginPath(); g.arc(x, y, .8 + c.d * 2.4, 0, 6.283); g.fill();
      }
      if (S.field > .01) {
        g.globalAlpha = ga * S.field;
        for (let r = 0; r < 18; r++) {
          const d = (r + 1) / 18, y = yH + Math.pow(d, 1.6) * (h - yH), sz = 2 + d * d * 15, gap = sz * 2, off = OFF.ground * (.15 + d) + r * 13;
          for (let x = -(off % gap); x < w + gap; x += gap) {
            g.fillStyle = '#ffc72c'; g.beginPath(); g.arc(x, y, sz, 0, 6.283); g.fill();
            g.fillStyle = '#47280f'; g.beginPath(); g.arc(x, y, sz * .38, 0, 6.283); g.fill();
          }
        }
      }
      g.globalAlpha = 1;
    }
    for (const c of clouds) if (c.z >= .6) cloud(c, cr, cg, cb, cvis * 1.3);

    // ala (punta izquierda con luz roja y destello blanco)
    const bob = Math.sin(t * .9) * 2 + (S.alt < .3 ? -S.alt * 10 : 0);
    g.save(); g.translate(0, bob);
    const wg = g.createLinearGradient(0, h * .72, 0, h);
    wg.addColorStop(0, '#5b627c'); wg.addColorStop(.25, '#2b3048'); wg.addColorStop(1, '#10132a');
    g.fillStyle = wg; g.beginPath();
    g.moveTo(w * 1.03, h * .87); g.lineTo(w * .15, h * .75); g.lineTo(w * .1, h * .77);
    g.lineTo(w * .52, h * .93); g.lineTo(w * .6, h * 1.04); g.lineTo(w * 1.03, h * 1.04); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(200,210,255,.3)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(w * 1.03, h * .87); g.lineTo(w * .15, h * .75); g.stroke();
    const lx = w * .118, ly = h * .762, pulse = .6 + .4 * Math.sin(t * 3);
    const rl = g.createRadialGradient(lx, ly, 0, lx, ly, w * .07);
    rl.addColorStop(0, `rgba(255,70,60,${.9 * pulse})`); rl.addColorStop(1, 'rgba(255,70,60,0)');
    g.fillStyle = rl; g.fillRect(lx - w * .07, ly - w * .07, w * .14, w * .14);
    const ph = t % 1.5;
    if (ph < .07 || (ph > .17 && ph < .24)) {
      const sg = g.createRadialGradient(lx, ly, 0, lx, ly, w * .16);
      sg.addColorStop(0, 'rgba(255,255,255,.95)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sg; g.fillRect(lx - w * .16, ly - w * .16, w * .32, w * .32);
    }
    g.restore();
    g.restore();
  }

  /* ===================== bucle ===================== */
  let last = 0, hudT = 0, engT = 0;
  const cabin = $('cabin');
  function loop(ts) {
    const t = ts / 1000, dt = Math.min(.05, t - last || .016); last = t;
    if (!cabin.hidden) {
      OFF.cloud += S.speed * dt; OFF.ground += S.speed * dt * 900 * (1.25 - S.alt);
      $('shade').style.transform = `translateY(${(-(1 - S.shade) * 104).toFixed(1)}%)`;
      draw(t);
      hudT += dt; if (hudT > .25) {
        hudT = 0;
        const alt = Math.round(36000 * smooth(S.alt) / 100) * 100;
        $('alt').textContent = thousands(alt) + ' ft';
        $('dist').textContent = thousands(Math.round(10512 * (1 - S.prog))) + ' km';
      }
      engT += dt; if (engT > .1 && ac && engGain) { engT = 0; engGain.gain.setTargetAtTime(S.engine * .3, ac.currentTime, .25); }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ===================== imágenes: prueba rutas alternativas ===================== */
  function loadImg(img, src) {
    return new Promise(resolve => {
      const base = src.split('/').pop();
      const tries = [src, 'fotos%20/' + base, base, 'fotos/fotos/' + base, base.replace(/\.jpg$/i, '.jpeg'), 'fotos/' + base.replace(/\.jpg$/i, '.jpeg'), 'fotos/' + base.toUpperCase(), 'foto/' + base, 'imagenes/' + base];
      let i = 0;
      img.removeAttribute('src'); img.style.opacity = 0;
      img.onload = () => { img.style.opacity = 1; img.onload = null; img.onerror = null; resolve(true); };
      img.onerror = () => {
        i++;
        if (i < tries.length) img.src = tries[i];
        else {
          img.onload = null; img.onerror = null;
          img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700"><rect width="600" height="700" fill="#2a2f55"/><text x="300" y="340" fill="#ffcf5a" font-family="monospace" font-size="26" text-anchor="middle">No encuentro la foto</text><text x="300" y="385" fill="#eaeeff" font-family="monospace" font-size="24" text-anchor="middle">${src}</text></svg>`);
          img.style.opacity = 1; resolve(false);
        }
      };
      img.src = tries[0];
    });
  }
  const precargar = () => { D.paradas.forEach(p => loadImg(new Image(), p.foto)); loadImg(new Image(), D.fotoFinal); };

  /* ===================== recuerdos ===================== */
  const start = new Date(D.inicio[0], D.inicio[1], D.inicio[2]);
  async function showCard(p, i) {
    const d = new Date(D.inicio[0], D.inicio[1] + i + 1, D.inicio[2]);
    const listo = loadImg($('mImg'), p.foto); $('mC1').textContent = `Mes ${pad(i + 1)}`; $('mC2').textContent = fmtDate(d);
    $('mEy').textContent = `Escala ${pad(i + 1)} · ${p.fix}`; $('mTit').textContent = p.titulo;
    const poem = (p.poema && p.poema.length) ? p.poema : [p.texto];
    $('mPoem').innerHTML = poem.map(l => String(l).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))).join('<br>');
    await Promise.race([listo, sleep(3000)]);
    const m = $('mem'); m.hidden = false; m.scrollTop = 0;
    return new Promise(res => { $('mGo').onclick = () => { m.hidden = true; res(); }; });
  }

  /* ===================== ventanilla de estrellas (corazón) ===================== */
  function playStars() {
    const NS = 14, pts = [];
    for (let k = 0; k < NS; k++) {
      const t = 2 * Math.PI * k / NS;
      pts.push([120 + 96 * Math.pow(Math.sin(t), 3), 128 - 6 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
    }
    let bg = '', s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 46; i++) bg += `<circle cx="${(r() * 240) | 0}" cy="${(r() * 300) | 0}" r="${(.4 + r() * .9).toFixed(2)}" style="animation-delay:${(r() * 4).toFixed(1)}s"/>`;
    const segs = pts.map((p, k) => { const q = pts[(k + 1) % NS]; return `<line class="seg" x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}"/>`; }).join('');
    const sts = pts.map((p, k) => `<g class="star" data-k="${k}" tabindex="0" role="button" aria-label="Estrella ${k + 1} de ${NS}" transform="translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})"><circle class="hit" r="19"/><circle class="core" r="3.4" style="--d:${(k * .27).toFixed(2)}s"/><path class="spark" d="M0 -11 L2 -2 L11 0 L2 2 L0 11 L-2 2 L-11 0 L-2 -2Z"/></g>`).join('');
    $('heart').innerHTML = `<g class="bgs">${bg}</g><path id="hfill" d="M${pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L')}Z"/>${segs}${sts}`;
    const lit = new Set(), sg = [...$('heart').querySelectorAll('.seg')], msg = $('sMsg'), go = $('sGo');
    msg.textContent = 'Hay 14 estrellas apagadas. Tócalas.'; msg.classList.remove('done'); go.hidden = true;
    const light = el => {
      const k = +el.dataset.k; if (lit.has(k)) return;
      lit.add(k); el.classList.add('lit'); starNote(lit.size - 1);
      sg.forEach((x, i) => { if (lit.has(i) && lit.has((i + 1) % NS)) x.classList.add('on'); });
      if (lit.size === NS) {
        $('hfill').classList.add('on'); msg.classList.add('done'); go.hidden = false; setTimeout(arpeggio, 350);
        msg.textContent = '14 meses, 14 estrellas. Y todavía nos queda un cielo entero por encender.';
      } else msg.textContent = `${lit.size} de ${NS} encendidas`;
    };
    $('heart').querySelectorAll('.star').forEach(el => {
      el.onclick = () => light(el);
      el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); light(el); } };
    });
    $('stars').hidden = false; $('stars').scrollTop = 0;
    return new Promise(res => { go.onclick = () => { $('stars').hidden = true; res(); }; });
  }

  /* ===================== girasol (semillas en ángulo áureo) ===================== */
  function buildSunflower() {
    const petal = 'M0 -32 C 13 -46 16 -70 0 -92 C -16 -70 -13 -46 0 -32Z';
    let back = '', front = '', seeds = '';
    for (let i = 0; i < 20; i++) {
      back += `<path class="petal" style="--a:${i * 18 + 9}deg;--d:${(.2 + i * .035).toFixed(2)}s" d="${petal}" fill="#e39a12"/>`;
      front += `<path class="petal" style="--a:${i * 18}deg;--d:${(.5 + i * .035).toFixed(2)}s" d="${petal}" fill="#ffc72c" stroke="#e5a010" stroke-width="1"/>`;
    }
    for (let n = 1; n <= 230; n++) { const rr = 2.05 * Math.sqrt(n), a = n * 2.399963; seeds += `<circle cx="${(rr * Math.cos(a)).toFixed(1)}" cy="${(rr * Math.sin(a)).toFixed(1)}" r="${(.9 + n / 230 * .95).toFixed(2)}" fill="${n % 3 ? '#2b180a' : '#9a6a30'}"/>`; }
    $('sf').innerHTML = `<path class="stem" d="M120 112 C 118 190 126 250 120 326" fill="none" stroke="#5f9a46" stroke-width="7" stroke-linecap="round"/>
      <g class="leaf" style="transform-origin:122px 250px"><path d="M122 252 C 150 222 190 224 206 240 C 184 262 148 266 122 252Z" fill="#4f8d3a"/></g>
      <g class="leaf" style="transform-origin:120px 280px"><path d="M119 284 C 92 256 54 258 38 274 C 58 296 94 298 119 284Z" fill="#6aab4c"/></g>
      <g transform="translate(120 112)">${back}${front}<circle class="disc" r="33" fill="#47280f"/><g class="seeds">${seeds}</g></g>`;
  }
  function tick() {
    let s = Math.max(0, Math.floor((Date.now() - start) / 1000));
    const d = Math.floor(s / 86400); s %= 86400;
    $('c-d').textContent = d; $('c-h').textContent = pad(Math.floor(s / 3600)); $('c-m').textContent = pad(Math.floor(s % 3600 / 60)); $('c-s').textContent = pad(s % 60);
  }
  function showFinal() {
    const listoF = loadImg($('fImg'), D.fotoFinal); $('fLetter').textContent = D.carta; $('fSign').textContent = D.firma;
    buildSunflower(); tick(); setInterval(tick, 1000);
    const f = $('fin'); f.hidden = false; f.scrollTop = 0;
    setTimeout(() => { $('sf').classList.add('bloom'); setTimeout(() => $('sf').classList.add('sway'), 3200); arpeggio(); }, 900);
    $('again').onclick = () => location.reload();
  }

  /* ===================== el vuelo ===================== */
  const setBelt = on => { $('belt').classList.toggle('on', on); ding(); };

  async function despegue() {
    S.engine = .5; S.shade = 1; setBelt(true);
    const intro = say(V.bienvenida[0], V.bienvenida[1], 'bienvenida');
    await sleep(RM ? 100 : 6500);
    tween('shade', 0, 2600);                     // sube la persiana
    tween('speed', 2.6, 6000); tween('engine', 1, 5000);
    await intro; await sleep(RM ? 100 : 1200);
    S.shake = .35; await say('Preparados para el despegue.', null, 'despegue');
    tween('alt', 1, 9000); tween('sky', .12, 9000);
    await sleep(RM ? 100 : 3500); S.shake = .12;
    await sleep(RM ? 100 : 2500); S.shake = 0;
    tween('speed', 1, 3000); tween('engine', .45, 4000);
    setBelt(false);
    await say(V.crucero, null, 'crucero');
  }

  async function parada(i) {
    const p = D.paradas[i], n = i + 1;
    tween('prog', n / 15, 2500);
    tween('sky', lerp(.12, .55, i / 13), 3000);
    if (i === 10) {                                  // turbulencia suave
      S.shake = .55; tween('speed', 1.8, 800);
      await say(V.turbulencia, null, 'turbulencia'); S.shake = 0; tween('speed', 1, 1500);
    }
    await say(`Escala ${n}. ${p.titulo}.`, null, 'escala' + pad(n));
    ding(); await sleep(RM ? 50 : 600);
    say(p.texto, p.vozTexto, 'p' + pad(n));         // la voz lee el mensaje mientras se ve el recuerdo
    await showCard(p, i);
    stopSay();
    if (i === 6) { await sleep(300); await playStars(); }
    tween('speed', 1.7, 900); await sleep(RM ? 50 : 900); tween('speed', 1, 1500);
  }

  async function aterrizaje() {
    tween('prog', 1, 9000); setBelt(true);
    tween('sky', 1, 14000); tween('speed', .8, 4000);
    await say(V.descenso, null, 'descenso');
    tween('alt', 0, 11000); tween('engine', .8, 4000);
    await sleep(RM ? 50 : 3500); tween('field', 1, 6000);
    await say(V.girasoles, null, 'girasoles');
    await sleep(RM ? 50 : 3500);
    S.shake = .7; tween('speed', .2, 3000); tween('engine', 0, 5000);
    await sleep(RM ? 50 : 900); S.shake = 0;
    await say(V.aterrizaje, null, 'aterrizaje');
    await sleep(RM ? 50 : 800);
    showFinal();
  }

  async function volar(desde) {
    if (desde === 'final') { S.alt = 1; S.speed = 1; S.sky = .6; S.shade = 0; S.engine = .45; S.prog = .9; await aterrizaje(); return; }
    if (desde === 0) await despegue();
    else { S.alt = 1; S.speed = 1; S.shade = 0; S.engine = .45; S.sky = lerp(.12, .55, desde / 13); S.prog = desde / 15; }
    for (let i = desde; i < D.paradas.length; i++) await parada(i);
    await aterrizaje();
  }

  /* ===================== deslizar para despegar ===================== */
  const gate = $('gate'), track = $('slide'), knob = $('knob'), fill = $('fill'), slabel = $('slabel');
  let drag = false, sx = 0, dx = 0, max = 0, flying = false;
  const setDx = (v, m) => { knob.style.transform = `translateX(${v}px)`; fill.style.width = (v + 56) + 'px'; slabel.style.opacity = String(clamp(1 - (m ? v / m : 0) * 1.2)); };
  knob.addEventListener('pointerdown', e => { if (flying) return; drag = true; sx = e.clientX; max = track.clientWidth - knob.offsetWidth - 8; knob.setPointerCapture(e.pointerId); knob.style.transition = 'none'; fill.style.transition = 'none'; });
  knob.addEventListener('pointermove', e => { if (!drag) return; dx = clamp(e.clientX - sx, 0, max); setDx(dx, max); });
  const release = () => {
    if (!drag) return; drag = false;
    if (dx >= max * .86) { setDx(max, max); iniciar(0); }
    else { knob.style.transition = 'transform .35s cubic-bezier(.2,.9,.3,1)'; fill.style.transition = 'width .35s'; dx = 0; setDx(0, max); }
  };
  knob.addEventListener('pointerup', release); knob.addEventListener('pointercancel', release);
  knob.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); iniciar(0); } });

  function iniciar(desde) {
    if (flying) return; flying = true;
    initAudio(); precargar();
    try { speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (e) {}   // desbloquea la voz en iPhone
    try { VA.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='; VA.play().catch(() => {}); } catch (e) {}   // desbloquea el audio
    gate.classList.add('away');
    setTimeout(() => { gate.hidden = true; cabin.hidden = false; resize(); volar(desde); }, RM ? 50 : 800);
  }

  // Para probar partes sin esperar: index.html#parada5  o  index.html#final
  const hsh = location.hash.replace('#', '');
  if (/^parada\d+$/.test(hsh)) { const n = clamp(parseInt(hsh.slice(6), 10) - 1, 0, 13); gate.hidden = true; cabin.hidden = false; resize(); setTimeout(() => { initAudio(); volar(n); }, 50); flying = true; }
  else if (hsh === 'final') { gate.hidden = true; cabin.hidden = false; resize(); flying = true; setTimeout(() => volar('final'), 50); }
})();
