export function seededRandom(seed: string): () => number {
  function xmur3(str: string) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function() {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  const seedFn = xmur3(seed);
  const a = seedFn(), b = seedFn(), c = seedFn(), d = seedFn();
  let _a = a, _b = b, _c = c, _d = d;
  return function sfc32() {
    _a >>>= 0; _b >>>= 0; _c >>>= 0; _d >>>= 0;
    let t = (_a + _b) | 0;
    _a = _b ^ (_b >>> 9);
    _b = (_c + (_c << 3)) | 0;
    _c = (_c << 21) | (_c >>> 11);
    _c = (_c + t) | 0;
    _d = (_d + 1) | 0;
    t = (t + _d) | 0;
    return ((t >>> 0) / 4294967296);
  };
}

export function shuffleDeterministic<T>(arr: T[], seed: string): T[] {
  const rnd = seededRandom(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
