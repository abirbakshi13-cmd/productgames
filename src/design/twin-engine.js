import React from 'react';
/* Twin character engine. Black-and-white doodle characters with one splash of colour, built as an SVG string. */
(function () {
  function v(name, hex) { return 'var(--' + name + ',' + hex + ')'; }
  var INK = v('ink', '#1c1b1f');
  var WHITE = '#ffffff';
  var ACCENT = {
    signal: v('signal', '#ff5b2e'), butter: v('butter', '#fce38a'), sky: v('sky', '#bed8fa'),
    mint: v('mint', '#bfe8d1'), lilac: v('lilac', '#d8cff7'), blush: v('blush', '#f8c3d1')
  };
  var SKIN = { paper: '#ffffff', porcelain: '#fbe6d8', sand: '#efceb2', honey: '#d6a77f', bronze: '#a87452', deep: '#6f4630' };
  var TOP = { white: WHITE, black: INK };
  var HEIGHT = { short: 30, mid: 44, tall: 58 };
  var BUILD = { straight: { s: 36, w: 34, h: 33 }, curvy: { s: 33, w: 27, h: 37 }, broad: { s: 43, w: 39, h: 37 } };

  var PARTS = {
    head: ['round', 'bean', 'soft-square'],
    hair: ['messy', 'curly', 'bangs', 'spiky', 'afro', 'pony', 'long', 'cap', 'none'],
    hairColor: ['black', 'outline', 'accent'],
    skin: Object.keys(SKIN),
    glasses: ['none', 'round', 'square', 'shades'],
    top: ['hoodie', 'tee', 'shirt', 'stripe', 'jacket'],
    topColor: ['white', 'black'],
    accent: Object.keys(ACCENT),
    bottom: ['pants', 'shorts', 'skirt'],
    item: ['none', 'headphones', 'backpack', 'coffee', 'tote', 'scarf'],
    build: ['straight', 'curvy', 'broad'],
    height: ['short', 'mid', 'tall'],
    mood: ['chill', 'hyped', 'stressed', 'ugh', 'curious', 'sleepy']
  };
  var DEFAULTS = {
    head: 'round', hair: 'messy', hairColor: 'black', skin: 'paper', glasses: 'none',
    top: 'hoodie', topColor: 'white', accent: 'signal', bottom: 'pants', item: 'none',
    build: 'straight', height: 'mid', mood: 'chill'
  };
  var MOOD_COPY = {
    chill: 'Nothing wild today.', hyped: 'Good news for you.', stressed: 'This one messes with your day.',
    ugh: 'This one costs you.', curious: 'Worth knowing about.', sleepy: 'All caught up.'
  };

  var uid = 0;
  var LC = ' stroke-linecap="round" stroke-linejoin="round"';
  function st(fill, stroke, sw) { return 'fill:' + (fill || 'none') + (stroke ? ';stroke:' + stroke + ';stroke-width:' + sw : ''); }
  function path(d, fill, stroke, sw) { return '<path d="' + d + '" style="' + st(fill, stroke, sw) + '"' + LC + '/>'; }
  function circle(cx, cy, r, fill, stroke, sw) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" style="' + st(fill, stroke, sw) + '"/>'; }
  function ellipse(cx, cy, rx, ry, fill, stroke, sw) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" style="' + st(fill, stroke, sw) + '"/>'; }
  function rect(x, y, w, h, rx, fill, stroke, sw) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" style="' + st(fill, stroke, sw) + '"' + LC + '/>'; }
  function g(tx, ty, inner) { return '<g transform="translate(' + tx + ',' + ty + ')">' + inner + '</g>'; }

  function ring(r, from, to, step, rad) {
    var out = [];
    for (var a = from; a <= to; a += step) { var t = a * Math.PI / 180; out.push([+(r * Math.cos(t)).toFixed(1), +(r * Math.sin(t)).toFixed(1), rad]); }
    return out;
  }

  /* Hair in head-centred coordinates (head radius 46). back: behind the head. front: over it. lines: strands drawn only on outline hair. */
  var HAIR = {
    messy: {
      front: ['M-60,22 C-72,4 -62,-22 -50,-28 C-56,-52 -28,-66 -2,-61 C22,-72 58,-58 56,-30 C68,-18 66,8 55,18 C51,4 45,-6 37,-10 C31,-1 21,-3 16,-12 C8,-3 -6,-5 -10,-14 C-18,-4 -30,-6 -34,-15 C-41,-4 -47,8 -47,23 C-51,26 -57,26 -60,22 Z'],
      lines: ['M-30,-40 Q-20,-48 -8,-44', 'M14,-48 Q28,-50 36,-40']
    },
    curly: {
      front: ['M-46,-2 C-47,-38 -26,-52 0,-52 C26,-52 47,-38 46,-2 C36,-20 20,-26 0,-26 C-20,-26 -36,-20 -46,-2 Z'],
      circles: ring(44, -180, 0, 22.5, 15).concat([[-18, -26, 10], [0, -28, 10], [18, -26, 10]])
    },
    bangs: {
      back: ['M-53,-6 C-56,-50 -30,-62 0,-62 C30,-62 56,-50 53,-6 L54,44 Q54,52 46,52 L-46,52 Q-54,52 -54,44 Z'],
      front: ['M-52,12 C-56,-42 -28,-60 0,-60 C28,-60 56,-42 52,12 L45,12 L45,-10 L-45,-10 L-45,12 Z']
    },
    spiky: {
      front: ['M-48,-2 C-50,-30 -42,-42 -32,-47 L-28,-62 L-16,-51 L-6,-66 L5,-52 L18,-64 L23,-48 C40,-44 50,-30 48,-2 C40,-18 30,-22 22,-21 L15,-28 L6,-19 L-4,-27 L-12,-18 L-22,-25 C-34,-22 -42,-14 -48,-2 Z']
    },
    afro: {
      backCircles: ring(52, -200, 20, 20, 22).concat([[0, -34, 40]]),
      front: ['M-46,-2 C-47,-38 -26,-52 0,-52 C26,-52 47,-38 46,-2 C36,-20 20,-26 0,-26 C-20,-26 -36,-20 -46,-2 Z']
    },
    pony: {
      back: ['M18,-50 C30,-80 64,-86 70,-64 C74,-48 58,-46 50,-56 C44,-62 34,-56 30,-46 Z'],
      front: ['M-50,8 C-54,-40 -26,-58 2,-56 C30,-54 54,-38 50,8 C46,-8 38,-16 30,-16 C26,-8 18,-8 14,-16 C8,-8 0,-8 -4,-16 C-10,-8 -18,-8 -22,-16 C-30,-14 -42,-6 -50,8 Z'],
      lines: ['M-26,-38 Q-10,-48 8,-42', 'M40,-62 Q52,-70 62,-62']
    },
    long: {
      back: ['M-53,-6 C-56,-50 -30,-62 0,-62 C30,-62 56,-50 53,-6 L58,86 Q58,98 46,98 L-46,98 Q-58,98 -58,86 Z'],
      front: ['M-53,16 C-57,-42 -28,-60 0,-60 C28,-60 57,-42 53,16 C49,-10 30,-30 2,-34 C-28,-30 -49,-10 -53,16 Z']
    },
    cap: {
      tufts: true,
      front: ['M-48,-4 C-49,-42 -26,-58 0,-58 C26,-58 49,-42 48,-4 Z'],
      brim: 'M26,-12 Q58,-24 84,-14 Q92,-8 84,-2 L30,-2 Z'
    },
    none: {}
  };

  function hairLayer(h, part, color, stroke) {
    var out = '', i, P = h[part] || [], C = part === 'front' ? (h.circles || []) : (h.backCircles || []);
    for (i = 0; i < P.length; i++) out += path(P[i], INK, INK, 7);
    for (i = 0; i < C.length; i++) out += circle(C[i][0], C[i][1], C[i][2], INK, INK, 7);
    for (i = 0; i < P.length; i++) out += path(P[i], color);
    for (i = 0; i < C.length; i++) out += circle(C[i][0], C[i][1], C[i][2], color);
    if (part === 'front' && stroke && h.lines) for (i = 0; i < h.lines.length; i++) out += path(h.lines[i], 'none', INK, 3);
    return out;
  }

  function headShape(kind, skin) {
    if (kind === 'bean') return ellipse(0, -2, 43, 49, skin, INK, 4);
    if (kind === 'soft-square') return rect(-45, -45, 90, 92, 32, skin, INK, 4);
    return circle(0, 0, 46, skin, INK, 4);
  }

  /* Faces are just two dots and a mouth. */
  function face(mood, acc) {
    var dots = circle(-12, 6, 4.4, INK) + circle(12, 6, 4.4, INK), o = '';
    var font = "font:800 26px 'Bricolage Grotesque',system-ui,sans-serif;fill:" + INK;
    if (mood === 'hyped') {
      o += dots + path('M-9,15 Q0,30 9,15 Z', INK, INK, 3);
      o += ellipse(-25, 17, 6, 3.6, ACCENT.blush) + ellipse(25, 17, 6, 3.6, ACCENT.blush);
      o += path('M52,-44 L60,-54', 'none', acc, 4.5) + path('M58,-32 L70,-35', 'none', acc, 4.5) + path('M42,-56 L44,-67', 'none', acc, 4.5);
    } else if (mood === 'stressed') {
      o += dots + path('M-9,21 Q-4.5,16 0,21 Q4.5,26 9,21', 'none', INK, 3.2);
      o += path('M50,-30 Q59,-17 54,-10 Q50,-5 46,-10 Q42,-17 50,-30 Z', acc, INK, 3);
    } else if (mood === 'ugh') {
      o += dots + path('M-20,-7 L-8,-4', 'none', INK, 3.2) + path('M8,-4 L20,-7', 'none', INK, 3.2) + path('M-7,22 L7,22', 'none', INK, 3.4);
    } else if (mood === 'curious') {
      o += dots + ellipse(0, 21, 4.8, 6, INK);
      o += '<text x="52" y="-38" style="' + font + '">?</text>';
    } else if (mood === 'sleepy') {
      o += path('M-17,6 Q-12,10 -7,6', 'none', INK, 3.2) + path('M7,6 Q12,10 17,6', 'none', INK, 3.2) + path('M-4,21 L4,21', 'none', INK, 3);
      o += '<text x="48" y="-34" style="' + font.replace('26px', '18px') + '">z</text><text x="60" y="-48" style="' + font.replace('26px', '13px') + '">z</text>';
    } else {
      o += dots + path('M-7,17 Q0,25 7,17', 'none', INK, 3.4);
    }
    return o;
  }

  function glasses(kind) {
    if (kind === 'round') return circle(-13, 6, 11, 'none', INK, 3.4) + circle(13, 6, 11, 'none', INK, 3.4) + path('M-2,4 Q0,2 2,4', 'none', INK, 3) + path('M-24,3 L-44,-1', 'none', INK, 3) + path('M24,3 L44,-1', 'none', INK, 3);
    if (kind === 'square') return rect(-25, -4, 21, 18, 5, 'none', INK, 3.4) + rect(4, -4, 21, 18, 5, 'none', INK, 3.4) + path('M-4,3 L4,3', 'none', INK, 3) + path('M-25,2 L-44,-1', 'none', INK, 3) + path('M25,2 L44,-1', 'none', INK, 3);
    if (kind === 'shades') return path('M-27,-2 L-3,-2 L-4,8 Q-6,16 -15,16 Q-25,16 -26,8 Z', INK, INK, 3) + path('M27,-2 L3,-2 L4,8 Q6,16 15,16 Q25,16 26,8 Z', INK, INK, 3) + path('M-3,0 L3,0', 'none', INK, 3) + path('M-27,0 L-44,-2', 'none', INK, 3) + path('M27,0 L44,-2', 'none', INK, 3);
    return '';
  }

  function character(opts) {
    var o = {}, k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    if (opts) for (k in opts) if (opts[k] !== undefined) o[k] = opts[k];
    var id = 'tw' + (++uid);
    var G = 286, cx = 100;
    var L = HEIGHT[o.height] || 44, b = BUILD[o.build] || BUILD.straight;
    var tb = G - 8 - L, tt = tb - 66, hy = tt - 38, mid = tt + 36;
    var s = b.s, w = b.w, h = b.h;
    var skin = SKIN[o.skin] || WHITE;
    var acc = ACCENT[o.accent] || ACCENT.signal;
    var top = TOP[o.topColor] || WHITE, dark = o.topColor === 'black', line = dark ? WHITE : INK;
    var hairDef = HAIR[o.hair] || HAIR.none;
    var hairCol = o.hairColor === 'outline' ? WHITE : (o.hairColor === 'accent' ? acc : INK);
    var lhx = cx - s - 8, rhx = cx + s + 8, hdy = tt + 58;
    var out = '';

    out += ellipse(100, G - 1, 54, 6, INK).replace('"/>', ';opacity:.08"/>');

    /* behind the body */
    out += g(cx, hy, hairLayer(hairDef, 'back', hairCol, o.hairColor !== 'black'));

    /* legs */
    if (o.bottom === 'pants') {
      out += rect(cx - 18, tb - 8, 16, L + 2, 6, INK) + rect(cx + 2, tb - 8, 16, L + 2, 6, INK);
    } else {
      out += rect(cx - 17, tb - 4, 14, L - 2, 6, skin, INK, 3.5) + rect(cx + 3, tb - 4, 14, L - 2, 6, skin, INK, 3.5);
      if (o.bottom === 'shorts') out += path('M' + (cx - h + 1) + ',' + (tb - 8) + ' L' + (cx + h - 1) + ',' + (tb - 8) + ' L' + (cx + h + 1) + ',' + (tb + 16) + ' L' + (cx + 2) + ',' + (tb + 16) + ' L' + cx + ',' + (tb + 7) + ' L' + (cx - 2) + ',' + (tb + 16) + ' L' + (cx - h - 1) + ',' + (tb + 16) + ' Z', INK, INK, 3);
      else out += path('M' + (cx - h + 1) + ',' + (tb - 8) + ' L' + (cx + h - 1) + ',' + (tb - 8) + ' L' + (cx + h + 9) + ',' + (tb + 22) + ' Q' + cx + ',' + (tb + 27) + ' ' + (cx - h - 9) + ',' + (tb + 22) + ' Z', INK, INK, 3);
    }
    out += rect(cx - 25, G - 12, 23, 11, 5.5, WHITE, INK, 3.5) + rect(cx + 2, G - 12, 23, 11, 5.5, WHITE, INK, 3.5);

    /* arms as sleeves */
    var armL = 'M' + (cx - s + 8) + ',' + (tt + 14) + ' Q' + (cx - s - 10) + ',' + (tt + 26) + ' ' + lhx + ',' + hdy;
    var armR = 'M' + (cx + s - 8) + ',' + (tt + 14) + ' Q' + (cx + s + 10) + ',' + (tt + 26) + ' ' + rhx + ',' + hdy;
    out += path(armL, 'none', INK, 16) + path(armR, 'none', INK, 16) + path(armL, 'none', top, 8.5) + path(armR, 'none', top, 8.5);

    if (o.item === 'tote') {
      out += path('M' + (lhx - 9) + ',' + (hdy + 6) + ' Q' + (lhx - 2) + ',' + (hdy - 16) + ' ' + (lhx + 5) + ',' + (hdy + 6), 'none', INK, 3.5);
      out += rect(lhx - 17, hdy + 4, 30, 32, 5, acc, INK, 3.5);
    }

    /* torso */
    var torso = 'M' + (cx - s) + ',' + (tt + 12) + ' Q' + (cx - s) + ',' + tt + ' ' + (cx - s + 12) + ',' + tt +
      ' L' + (cx + s - 12) + ',' + tt + ' Q' + (cx + s) + ',' + tt + ' ' + (cx + s) + ',' + (tt + 12) +
      ' Q' + (cx + w) + ',' + mid + ' ' + (cx + h) + ',' + tb + ' L' + (cx - h) + ',' + tb +
      ' Q' + (cx - w) + ',' + mid + ' ' + (cx - s) + ',' + (tt + 12) + ' Z';
    out += '<clipPath id="' + id + 't"><path d="' + torso + '"/></clipPath>';
    out += path(torso, top, INK, 4);

    var neck = path('M' + (cx - 14) + ',' + (tt + 8) + ' Q' + cx + ',' + (tt + 21) + ' ' + (cx + 14) + ',' + (tt + 8), 'none', line, 3.4);
    if (o.top === 'tee') out += neck;
    if (o.top === 'hoodie') {
      out += path('M' + (cx - 29) + ',' + (tt + 3) + ' Q' + cx + ',' + (tt + 28) + ' ' + (cx + 29) + ',' + (tt + 3), 'none', line, 3.8);
      out += path('M' + (cx - 7) + ',' + (tt + 17) + ' L' + (cx - 8) + ',' + (tt + 34), 'none', line, 3) + path('M' + (cx + 7) + ',' + (tt + 17) + ' L' + (cx + 8) + ',' + (tt + 34), 'none', line, 3);
      out += path('M' + (cx - 22) + ',' + (tb - 4) + ' L' + (cx - 22) + ',' + (tb - 19) + ' Q' + (cx - 22) + ',' + (tb - 25) + ' ' + (cx - 16) + ',' + (tb - 25) + ' L' + (cx + 16) + ',' + (tb - 25) + ' Q' + (cx + 22) + ',' + (tb - 25) + ' ' + (cx + 22) + ',' + (tb - 19) + ' L' + (cx + 22) + ',' + (tb - 4), 'none', line, 3.4);
    }
    if (o.top === 'shirt') {
      out += path('M' + cx + ',' + (tt + 16) + ' L' + cx + ',' + (tb - 3), 'none', line, 3);
      out += path('M' + (cx - 16) + ',' + (tt + 5) + ' L' + (cx - 1) + ',' + (tt + 12) + ' L' + (cx - 10) + ',' + (tt + 23) + ' Z', top, line, 3.4);
      out += path('M' + (cx + 16) + ',' + (tt + 5) + ' L' + (cx + 1) + ',' + (tt + 12) + ' L' + (cx + 10) + ',' + (tt + 23) + ' Z', top, line, 3.4);
    }
    if (o.top === 'stripe') {
      var sc = dark ? WHITE : INK;
      out += '<g clip-path="url(#' + id + 't)">' + rect(cx - 60, tt + 28, 120, 6, 0, sc) + rect(cx - 60, tt + 42, 120, 6, 0, sc) + rect(cx - 60, tt + 56, 120, 6, 0, sc) + '</g>';
      out += path(torso, 'none', INK, 4) + neck;
    }
    if (o.top === 'jacket') {
      var inner = dark ? WHITE : INK;
      out += '<g clip-path="url(#' + id + 't)">' + path('M' + (cx - 11) + ',' + (tt - 2) + ' L' + (cx + 11) + ',' + (tt - 2) + ' L' + (cx + 11) + ',' + (tb + 4) + ' L' + (cx - 11) + ',' + (tb + 4) + ' Z', inner, INK, 3.4) + '</g>';
      out += path('M' + (cx - 11) + ',' + (tt + 4) + ' L' + (cx - 21) + ',' + (tt + 26), 'none', line, 3) + path('M' + (cx + 11) + ',' + (tt + 4) + ' L' + (cx + 21) + ',' + (tt + 26), 'none', line, 3);
    }

    if (o.item === 'backpack') {
      var x1 = cx - s + 13, x2 = cx + s - 13;
      out += path('M' + x1 + ',' + (tt + 2) + ' L' + (x1 + 2) + ',' + (tt + 50), 'none', INK, 11) + path('M' + x2 + ',' + (tt + 2) + ' L' + (x2 - 2) + ',' + (tt + 50), 'none', INK, 11);
      out += path('M' + x1 + ',' + (tt + 2) + ' L' + (x1 + 2) + ',' + (tt + 50), 'none', acc, 5) + path('M' + x2 + ',' + (tt + 2) + ' L' + (x2 - 2) + ',' + (tt + 50), 'none', acc, 5);
    }
    if (o.item === 'scarf') {
      out += path('M' + (cx - 30) + ',' + (tt + 2) + ' Q' + cx + ',' + (tt + 22) + ' ' + (cx + 30) + ',' + (tt + 2) + ' L' + (cx + 30) + ',' + (tt + 12) + ' Q' + cx + ',' + (tt + 32) + ' ' + (cx - 30) + ',' + (tt + 12) + ' Z', acc, INK, 3.4);
      out += path('M' + (cx + 10) + ',' + (tt + 20) + ' L' + (cx + 14) + ',' + (tt + 46) + ' L' + (cx + 24) + ',' + (tt + 44) + ' L' + (cx + 20) + ',' + (tt + 18) + ' Z', acc, INK, 3.4);
    }
    if (o.item === 'coffee') {
      out += path('M' + (rhx - 8) + ',' + (hdy - 18) + ' L' + (rhx + 8) + ',' + (hdy - 18) + ' L' + (rhx + 6) + ',' + (hdy + 5) + ' L' + (rhx - 6) + ',' + (hdy + 5) + ' Z', WHITE, INK, 3.4);
      out += rect(rhx - 7.4, hdy - 11, 14.8, 7, 1, acc);
      out += rect(rhx - 10, hdy - 24, 20, 7, 3.5, INK);
    }

    out += circle(lhx, hdy, 6.8, skin, INK, 3.5) + circle(rhx, hdy, 6.8, skin, INK, 3.5);

    /* head */
    var hd = '';
    if (hairDef.back && o.hair === 'pony') { /* ponytail already drawn behind */ }
    hd += circle(-46, 7, 8, skin, INK, 3.5) + circle(46, 7, 8, skin, INK, 3.5);
    hd += headShape(o.head, skin) + face(o.mood, acc);
    if (hairDef.tufts) hd += path('M-48,-4 Q-50,8 -44,14 Q-42,4 -40,-2 Z', INK, INK, 3) + path('M48,-4 Q50,8 44,14 Q42,4 40,-2 Z', INK, INK, 3);
    hd += hairLayer(hairDef, 'front', hairCol, o.hairColor !== 'black');
    if (hairDef.brim) hd += path(hairDef.brim, acc, INK, 3.6);
    hd += glasses(o.glasses);
    if (o.item === 'headphones') {
      hd += path('M-51,4 C-55,-68 55,-68 51,4', 'none', INK, 6.5);
      hd += rect(-62, -12, 17, 30, 8, acc, INK, 3.5) + rect(45, -12, 17, 30, 8, acc, INK, 3.5);
    }
    out += g(cx, hy, hd);

    var crop = o.crop === 'head';
    var vb = crop ? (cx - 76) + ' ' + (hy - 86) + ' 152 152' : '0 0 200 300';
    var size = o.size || 200;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="' + size + '" height="' + (crop ? size : Math.round(size * 1.5)) + '" role="img" aria-label="Your Twin, feeling ' + o.mood + '">' + out + '</svg>';
  }

  function blob(color, size) {
    var c = ACCENT[color] || ACCENT.butter;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="' + (size || 240) + '" height="' + (size || 240) + '" aria-hidden="true"><path d="M126,14 C176,12 224,48 226,104 C228,156 198,214 138,224 C80,234 22,206 14,146 C6,88 48,40 82,24 C96,18 110,14 126,14 Z" style="fill:' + c + '"/></svg>';
  }

  /* Line icons: 24px grid, 2px stroke, round caps and joins, drawn in currentColor. */
  var ICONS = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.5"/>',
    book: '<path d="M3.5 5h6a2.5 2.5 0 0 1 2.5 2.5V20a2 2 0 0 0-2-2H3.5z"/><path d="M20.5 5h-6A2.5 2.5 0 0 0 12 7.5V20a2 2 0 0 1 2-2h6.5z"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 13h18"/>',
    train: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 10h12M9 20l-2 2M15 20l2 2"/><circle cx="9.5" cy="13.5" r=".7"/><circle cx="14.5" cy="13.5" r=".7"/>',
    bike: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9 9 6.5H7"/>',
    car: '<path d="M4 15l2-6h12l2 6v3.5H4z"/><circle cx="8" cy="18.5" r="1.6"/><circle cx="16" cy="18.5" r="1.6"/>',
    walk: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7.5v6l-3 7.5M12 13.5l3 7.5M8 11l4-3 4 3"/>',
    house: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
    dorm: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4"/>',
    family: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9.5" r="2.4"/><path d="M3 20c0-3.3 2.2-5.5 5-5.5s5 2.2 5 5.5M14 20c0-2.6 1.3-4.3 3-4.3s3 1.7 3 4.3"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4.1 0 1.1-1 1.9-2.5 1.9-1.1 0-2.1-.5-2.6-1.3M12 6.5V8M12 16v1.5"/>',
    skip: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h7"/>',
    heart: '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/>',
    ballot: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M8 9V4h8v5M9.5 6.5l1.7 1.6L14.5 5"/>',
    feed: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    twin: '<circle cx="12" cy="12" r="8.5"/><circle cx="9.5" cy="11" r="1" fill="currentColor"/><circle cx="14.5" cy="11" r="1" fill="currentColor"/><path d="M9.5 14.5q2.5 2 5 0"/>',
    you: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>',
    flame: '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.1 2.4-4.6 3.4-7.4.9 1.4 1.1 2.6 1 3.6C12.6 10 13.5 7 13 3c3.4 2.4 5 5.9 5 9.4 0 5.2-2.5 8.6-6 8.6z"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    share: '<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    sources: '<path d="M6 3.5h8.5l4 4V20.5H6z"/><path d="M14 3.5v4.5h4.5M9 13h6M9 17h4"/>',
    route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    chat: '<path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    tap: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'
  };

  /* React wrappers so a Design canvas can mount the real character, blob and icons. React is read at render time. */
  var CHAR_KEYS = ['head', 'hair', 'hairColor', 'skin', 'glasses', 'top', 'topColor', 'accent', 'bottom', 'item', 'build', 'height', 'mood', 'size', 'crop'];
  function h() { return React.createElement.apply(null, arguments); }
  function Character(p) {
    var o = {}, k, i, look = p.look || {};
    for (k in look) o[k] = look[k];
    for (i = 0; i < CHAR_KEYS.length; i++) { k = CHAR_KEYS[i]; if (p[k] !== undefined && p[k] !== null && p[k] !== '') o[k] = p[k]; }
    if (o.size) o.size = parseFloat(o.size);
    return h('span', { className: 'tw-twin', dangerouslySetInnerHTML: { __html: character(o) } });
  }
  function Blob(p) {
    return h('span', { className: 'tw-blob', dangerouslySetInnerHTML: { __html: blob(p.color, parseFloat(p.size) || 240) } });
  }
  function Icon(p) {
    var s = parseFloat(p.size) || 22;
    return h('svg', { className: 'tw-icon', viewBox: '0 0 24 24', width: s, height: s, fill: 'none', stroke: 'currentColor', strokeWidth: p.weight || 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false', dangerouslySetInnerHTML: { __html: ICONS[p.name] || '' } });
  }
  function iconSvg(name, size) {
    return '<svg class="tw-icon" viewBox="0 0 24 24" width="' + (size || 22) + '" height="' + (size || 22) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  window.Twin = {
    character: character, blob: blob, icon: iconSvg, icons: Object.keys(ICONS),
    Character: Character, Blob: Blob, Icon: Icon,
    parts: PARTS, defaults: DEFAULTS, moodCopy: MOOD_COPY,
    swatches: { skin: SKIN, topColor: TOP, accent: ACCENT, hairColor: { black: '#1c1b1f', outline: '#ffffff', accent: '#ff5b2e' } }
  };
})();

export const Twin = window.Twin;
export const { Character, Blob, Icon } = window.Twin;
export default window.Twin;
