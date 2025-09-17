
function cx(...args) {
  const classes = [];
  const push = (v) => { if (v) classes.push(String(v)); };
  const walk = (a) => {
    for (const x of a) {
      const t = typeof x;
      if (!x) continue;
      if (t === 'string' || t === 'number') { push(x); continue; }
      if (Array.isArray(x)) { walk(x); continue; }
      if (t === 'object') {
        for (const k in x) if (Object.prototype.hasOwnProperty.call(x, k) && x[k]) push(k);
      }
    }
  };
  walk(args);
  return classes.join(' ');
}

export function cn(...inputs) {
  return cx(...inputs);
}
