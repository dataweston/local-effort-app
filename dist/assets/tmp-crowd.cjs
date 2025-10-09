var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var CrowdfundingPage_DZb_slGa_exports = {};
__export(CrowdfundingPage_DZb_slGa_exports, {
  default: () => jr
});
module.exports = __toCommonJS(CrowdfundingPage_DZb_slGa_exports);
var import_index_xEz64G17 = require("./index-xEz64G17.js");
var import_portableTextComponents_yG0g42yZ = require("./portableTextComponents-yG0g42yZ.js");
var import_SectionHeader_CIhDF8f0 = require("./SectionHeader-CIhDF8f0.js");
var import_label_f3ShiFsw = require("./label-f3ShiFsw.js");
var import_button_DFNsXnQp = require("./button-DFNsXnQp.js");
var import_utils_BX5_YKFa = require("./utils-BX5-YKFa.js");
var import_devConsole_Dygp6vvt = require("./devConsole-Dygp6vvt.js");
var import_index_esm_CSeNQ_sZ = require("./index.esm-CSeNQ_sZ.js");
const import_meta = {};
var Ma = { exports: {} }, La = {};
/**
* @license React
* use-sync-external-store-shim.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var Je = import_index_xEz64G17.r;
function kn(e, a) {
  return e === a && (e !== 0 || 1 / e === 1 / a) || e !== e && a !== a;
}
var Cn = typeof Object.is == "function" ? Object.is : kn, Rn = Je.useState, An = Je.useEffect, _n = Je.useLayoutEffect, Tn = Je.useDebugValue;
function Dn(e, a) {
  var n = a(), l = Rn({ inst: { value: n, getSnapshot: a } }), u = l[0].inst, f = l[1];
  return _n(function() {
    u.value = n, u.getSnapshot = a, Ft(u) && f({ inst: u });
  }, [e, n, a]), An(function() {
    return Ft(u) && f({ inst: u }), e(function() {
      Ft(u) && f({ inst: u });
    });
  }, [e]), Tn(n), n;
}
function Ft(e) {
  var a = e.getSnapshot;
  e = e.value;
  try {
    var n = a();
    return !Cn(e, n);
  } catch {
    return true;
  }
}
function Fn(e, a) {
  return a();
}
var In = typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u" ? Fn : Dn;
La.useSyncExternalStore = Je.useSyncExternalStore !== void 0 ? Je.useSyncExternalStore : In;
Ma.exports = La;
var Pn = Ma.exports;
const qa = 0, Ua = 1, ja = 2, Sa = 3;
var xa = Object.prototype.hasOwnProperty;
function Ut(e, a) {
  var n, l;
  if (e === a) return true;
  if (e && a && (n = e.constructor) === a.constructor) {
    if (n === Date) return e.getTime() === a.getTime();
    if (n === RegExp) return e.toString() === a.toString();
    if (n === Array) {
      if ((l = e.length) === a.length) for (; l-- && Ut(e[l], a[l]); ) ;
      return l === -1;
    }
    if (!n || typeof e == "object") {
      l = 0;
      for (n in e) if (xa.call(e, n) && ++l && !xa.call(a, n) || !(n in a) || !Ut(e[n], a[n])) return false;
      return Object.keys(a).length === l;
    }
  }
  return e !== e && a !== a;
}
const ke = /* @__PURE__ */ new WeakMap(), Fe = () => {
}, K = Fe(), jt = Object, z = (e) => e === K, ge = (e) => typeof e == "function", Ie = (e, a) => ({ ...e, ...a }), $a = (e) => ge(e.then), It = {}, gt = {}, Jt = "undefined", ot = typeof window != Jt, $t = typeof document != Jt, On = ot && "Deno" in window, Mn = () => ot && typeof window.requestAnimationFrame != Jt, Va = (e, a) => {
  const n = ke.get(e);
  return [() => !z(a) && e.get(a) || It, (l) => {
    if (!z(a)) {
      const u = e.get(a);
      a in gt || (gt[a] = u), n[5](a, Ie(u, l), u || It);
    }
  }, n[6], () => !z(a) && a in gt ? gt[a] : !z(a) && e.get(a) || It];
};
let Vt = true;
const Ln = () => Vt, [Wt, Bt] = ot && window.addEventListener ? [window.addEventListener.bind(window), window.removeEventListener.bind(window)] : [Fe, Fe], qn = () => {
  const e = $t && document.visibilityState;
  return z(e) || e !== "hidden";
}, Un = (e) => ($t && document.addEventListener("visibilitychange", e), Wt("focus", e), () => {
  $t && document.removeEventListener("visibilitychange", e), Bt("focus", e);
}), jn = (e) => {
  const a = () => {
    Vt = true, e();
  }, n = () => {
    Vt = false;
  };
  return Wt("online", a), Wt("offline", n), () => {
    Bt("online", a), Bt("offline", n);
  };
}, $n = { isOnline: Ln, isVisible: qn }, Vn = { initFocus: Un, initReconnect: jn }, va = !import_index_xEz64G17.R.useId, st = !ot || On, Wn = (e) => Mn() ? window.requestAnimationFrame(e) : setTimeout(e, 1), Pt = st ? import_index_xEz64G17.r.useEffect : import_index_xEz64G17.r.useLayoutEffect, Ot = typeof navigator < "u" && navigator.connection, za = !st && Ot && (["slow-2g", "2g"].includes(Ot.effectiveType) || Ot.saveData), Et = /* @__PURE__ */ new WeakMap(), Bn = (e) => jt.prototype.toString.call(e), Mt = (e, a) => e === `[object ${a}]`;
let Hn = 0;
const Ht = (e) => {
  const a = typeof e, n = Bn(e), l = Mt(n, "Date"), u = Mt(n, "RegExp"), f = Mt(n, "Object");
  let y, m;
  if (jt(e) === e && !l && !u) {
    if (y = Et.get(e), y) return y;
    if (y = ++Hn + "~", Et.set(e, y), Array.isArray(e)) {
      for (y = "@", m = 0; m < e.length; m++) y += Ht(e[m]) + ",";
      Et.set(e, y);
    }
    if (f) {
      y = "#";
      const g = jt.keys(e).sort();
      for (; !z(m = g.pop()); ) z(e[m]) || (y += m + ":" + Ht(e[m]) + ",");
      Et.set(e, y);
    }
  } else y = l ? e.toJSON() : a == "symbol" ? e.toString() : a == "string" ? JSON.stringify(e) : "" + e;
  return y;
}, Kt = (e) => {
  if (ge(e)) try {
    e = e();
  } catch {
    e = "";
  }
  const a = e;
  return e = typeof e == "string" ? e : (Array.isArray(e) ? e.length : e) ? Ht(e) : "", [e, a];
};
let Yn = 0;
const Yt = () => ++Yn;
async function Wa(...e) {
  const [a, n, l, u] = e, f = Ie({ populateCache: true, throwOnError: true }, typeof u == "boolean" ? { revalidate: u } : u || {});
  let y = f.populateCache;
  const m = f.rollbackOnError;
  let g = f.optimisticData;
  const x = (w) => typeof m == "function" ? m(w) : m !== false, N = f.throwOnError;
  if (ge(n)) {
    const w = n, A = [], L = a.keys();
    for (const F of L) !/^\$(inf|sub)\$/.test(F) && w(a.get(F)._k) && A.push(F);
    return Promise.all(A.map(h));
  }
  return h(n);
  async function h(w) {
    const [A] = Kt(w);
    if (!A) return;
    const [L, F] = Va(a, A), [ce, b, P, G] = ke.get(a), ne = () => {
      const B = ce[A];
      return (ge(f.revalidate) ? f.revalidate(L().data, w) : f.revalidate !== false) && (delete P[A], delete G[A], B && B[0]) ? B[0](ja).then(() => L().data) : L().data;
    };
    if (e.length < 3) return ne();
    let k = l, Q, W = false;
    const I = Yt();
    b[A] = [I, 0];
    const Ee = !z(g), te = L(), we = te.data, re = te._c, le = z(re) ? we : re;
    if (Ee && (g = ge(g) ? g(le, we) : g, F({ data: g, _c: le })), ge(k)) try {
      k = k(le);
    } catch (B) {
      Q = B, W = true;
    }
    if (k && $a(k)) if (k = await k.catch((B) => {
      Q = B, W = true;
    }), I !== b[A][0]) {
      if (W) throw Q;
      return k;
    } else W && Ee && x(Q) && (y = true, F({ data: le, _c: K }));
    if (y && !W) if (ge(y)) {
      const B = y(k, le);
      F({ data: B, error: K, _c: K });
    } else F({ data: k, error: K, _c: K });
    if (b[A][1] = Yt(), Promise.resolve(ne()).then(() => {
      F({ _c: K });
    }), W) {
      if (N) throw Q;
      return;
    }
    return k;
  }
}
const ka = (e, a) => {
  for (const n in e) e[n][0] && e[n][0](a);
}, Gn = (e, a) => {
  if (!ke.has(e)) {
    const n = Ie(Vn, a), l = /* @__PURE__ */ Object.create(null), u = Wa.bind(K, e);
    let f = Fe;
    const y = /* @__PURE__ */ Object.create(null), m = (N, h) => {
      const w = y[N] || [];
      return y[N] = w, w.push(h), () => w.splice(w.indexOf(h), 1);
    }, g = (N, h, w) => {
      e.set(N, h);
      const A = y[N];
      if (A) for (const L of A) L(h, w);
    }, x = () => {
      if (!ke.has(e) && (ke.set(e, [l, /* @__PURE__ */ Object.create(null), /* @__PURE__ */ Object.create(null), /* @__PURE__ */ Object.create(null), u, g, m]), !st)) {
        const N = n.initFocus(setTimeout.bind(K, ka.bind(K, l, qa))), h = n.initReconnect(setTimeout.bind(K, ka.bind(K, l, Ua)));
        f = () => {
          N && N(), h && h(), ke.delete(e);
        };
      }
    };
    return x(), [e, u, x, f];
  }
  return [e, ke.get(e)[4]];
}, Jn = (e, a, n, l, u) => {
  const f = n.errorRetryCount, y = u.retryCount, m = ~~((Math.random() + 0.5) * (1 << (y < 8 ? y : 8))) * n.errorRetryInterval;
  !z(f) && y > f || setTimeout(l, m, u);
}, Kn = Ut, [Ba, Qn] = Gn(/* @__PURE__ */ new Map()), Xn = Ie({ onLoadingSlow: Fe, onSuccess: Fe, onError: Fe, onErrorRetry: Jn, onDiscarded: Fe, revalidateOnFocus: true, revalidateOnReconnect: true, revalidateIfStale: true, shouldRetryOnError: true, errorRetryInterval: za ? 1e4 : 5e3, focusThrottleInterval: 5 * 1e3, dedupingInterval: 2 * 1e3, loadingTimeout: za ? 5e3 : 3e3, compare: Kn, isPaused: () => false, cache: Ba, mutate: Qn, fallback: {} }, $n), Zn = (e, a) => {
  const n = Ie(e, a);
  if (a) {
    const { use: l, fallback: u } = e, { use: f, fallback: y } = a;
    l && f && (n.use = l.concat(f)), u && y && (n.fallback = Ie(u, y));
  }
  return n;
}, er = import_index_xEz64G17.r.createContext({}), tr = "$inf$", Ha = ot && window.__SWR_DEVTOOLS_USE__, ar = Ha ? window.__SWR_DEVTOOLS_USE__ : [], nr = () => {
  Ha && (window.__SWR_DEVTOOLS_REACT__ = import_index_xEz64G17.R);
}, rr = (e) => ge(e[1]) ? [e[0], e[1], e[2] || {}] : [e[0], null, (e[1] === null ? e[2] : e[1]) || {}], sr = () => {
  const e = import_index_xEz64G17.r.useContext(er);
  return import_index_xEz64G17.r.useMemo(() => Ie(Xn, e), [e]);
}, or = (e) => (a, n, l) => e(a, n && ((...f) => {
  const [y] = Kt(a), [, , , m] = ke.get(Ba);
  if (y.startsWith(tr)) return n(...f);
  const g = m[y];
  return z(g) ? n(...f) : (delete m[y], g);
}), l), ir = ar.concat(or), cr = (e) => function(...n) {
  const l = sr(), [u, f, y] = rr(n), m = Zn(l, y);
  let g = e;
  const { use: x } = m, N = (x || []).concat(ir);
  for (let h = N.length; h--; ) g = N[h](g);
  return g(u, f || m.fetcher || null, m);
}, lr = (e, a, n) => {
  const l = a[e] || (a[e] = []);
  return l.push(n), () => {
    const u = l.indexOf(n);
    u >= 0 && (l[u] = l[l.length - 1], l.pop());
  };
};
nr();
const Lt = import_index_xEz64G17.R.use || ((e) => {
  switch (e.status) {
    case "pending":
      throw e;
    case "fulfilled":
      return e.value;
    case "rejected":
      throw e.reason;
    default:
      throw e.status = "pending", e.then((a) => {
        e.status = "fulfilled", e.value = a;
      }, (a) => {
        e.status = "rejected", e.reason = a;
      }), e;
  }
}), qt = { dedupe: true }, Ca = Promise.resolve(K), ur = (e, a, n) => {
  const { cache: l, compare: u, suspense: f, fallbackData: y, revalidateOnMount: m, revalidateIfStale: g, refreshInterval: x, refreshWhenHidden: N, refreshWhenOffline: h, keepPreviousData: w } = n, [A, L, F, ce] = ke.get(l), [b, P] = Kt(e), G = import_index_xEz64G17.r.useRef(false), ne = import_index_xEz64G17.r.useRef(false), k = import_index_xEz64G17.r.useRef(b), Q = import_index_xEz64G17.r.useRef(a), W = import_index_xEz64G17.r.useRef(n), I = () => W.current, Ee = () => I().isVisible() && I().isOnline(), [te, we, re, le] = Va(l, b), B = import_index_xEz64G17.r.useRef({}).current, $ = z(y) ? z(n.fallback) ? K : n.fallback[b] : y, Pe = (S, v) => {
    for (const M in B) {
      const _ = M;
      if (_ === "data") {
        if (!u(S[_], v[_]) && (!z(S[_]) || !u(Ae, v[_]))) return false;
      } else if (v[_] !== S[_]) return false;
    }
    return true;
  }, Ne = import_index_xEz64G17.r.useMemo(() => {
    const S = !b || !a ? false : z(m) ? I().isPaused() || f ? false : g !== false : m, v = (J) => {
      const he = Ie(J);
      return delete he._k, S ? { isValidating: true, isLoading: true, ...he } : he;
    }, M = te(), _ = le(), q = v(M), Me = M === _ ? q : v(_);
    let U = q;
    return [() => {
      const J = v(te());
      return Pe(J, U) ? (U.data = J.data, U.isLoading = J.isLoading, U.isValidating = J.isValidating, U.error = J.error, U) : (U = J, J);
    }, () => Me];
  }, [l, b]), se = Pn.useSyncExternalStore(import_index_xEz64G17.r.useCallback((S) => re(b, (v, M) => {
    Pe(M, v) || S();
  }), [l, b]), Ne[0], Ne[1]), Ke = !G.current, it = A[b] && A[b].length > 0, ue = se.data, oe = z(ue) ? $ && $a($) ? Lt($) : $ : ue, Oe = se.error, Re = import_index_xEz64G17.r.useRef(oe), Ae = w ? z(ue) ? z(Re.current) ? oe : Re.current : ue : oe, ct = it && !z(Oe) ? false : Ke && !z(m) ? m : I().isPaused() ? false : f ? z(oe) ? false : g : z(oe) || g, Ve = !!(b && a && Ke && ct), lt = z(se.isValidating) ? Ve : se.isValidating, Qe = z(se.isLoading) ? Ve : se.isLoading, Se = import_index_xEz64G17.r.useCallback(async (S) => {
    const v = Q.current;
    if (!b || !v || ne.current || I().isPaused()) return false;
    let M, _, q = true;
    const Me = S || {}, U = !F[b] || !Me.dedupe, J = () => va ? !ne.current && b === k.current && G.current : b === k.current, he = { isValidating: false, isLoading: false }, wt = () => {
      we(he);
    }, Nt = () => {
      const X = F[b];
      X && X[1] === _ && delete F[b];
    }, St = { isValidating: true };
    z(te().data) && (St.isLoading = true);
    try {
      if (U && (we(St), n.loadingTimeout && z(te().data) && setTimeout(() => {
        q && J() && I().onLoadingSlow(b, n);
      }, n.loadingTimeout), F[b] = [v(P), Yt()]), [M, _] = F[b], M = await M, U && setTimeout(Nt, n.dedupingInterval), !F[b] || F[b][1] !== _) return U && J() && I().onDiscarded(b), false;
      he.error = K;
      const X = L[b];
      if (!z(X) && (_ <= X[0] || _ <= X[1] || X[1] === 0)) return wt(), U && J() && I().onDiscarded(b), false;
      const de = te().data;
      he.data = u(de, M) ? de : M, U && J() && I().onSuccess(M, b, n);
    } catch (X) {
      Nt();
      const de = I(), { shouldRetryOnError: We } = de;
      de.isPaused() || (he.error = X, U && J() && (de.onError(X, b, de), (We === true || ge(We) && We(X)) && (!I().revalidateOnFocus || !I().revalidateOnReconnect || Ee()) && de.onErrorRetry(X, b, de, (ut) => {
        const Ze = A[b];
        Ze && Ze[0] && Ze[0](Sa, ut);
      }, { retryCount: (Me.retryCount || 0) + 1, dedupe: true })));
    }
    return q = false, wt(), true;
  }, [b, l]), Xe = import_index_xEz64G17.r.useCallback((...S) => Wa(l, k.current, ...S), []);
  if (Pt(() => {
    Q.current = a, W.current = n, z(ue) || (Re.current = ue);
  }), Pt(() => {
    if (!b) return;
    const S = Se.bind(K, qt);
    let v = 0;
    I().revalidateOnFocus && (v = Date.now() + I().focusThrottleInterval);
    const _ = lr(b, A, (q, Me = {}) => {
      if (q == qa) {
        const U = Date.now();
        I().revalidateOnFocus && U > v && Ee() && (v = U + I().focusThrottleInterval, S());
      } else if (q == Ua) I().revalidateOnReconnect && Ee() && S();
      else {
        if (q == ja) return Se();
        if (q == Sa) return Se(Me);
      }
    });
    return ne.current = false, k.current = b, G.current = true, we({ _k: P }), ct && (F[b] || (z(oe) || st ? S() : Wn(S))), () => {
      ne.current = true, _();
    };
  }, [b]), Pt(() => {
    let S;
    function v() {
      const _ = ge(x) ? x(te().data) : x;
      _ && S !== -1 && (S = setTimeout(M, _));
    }
    function M() {
      !te().error && (N || I().isVisible()) && (h || I().isOnline()) ? Se(qt).then(v) : v();
    }
    return v(), () => {
      S && (clearTimeout(S), S = -1);
    };
  }, [x, N, h, b]), import_index_xEz64G17.r.useDebugValue(Ae), f) {
    const S = b && z(oe);
    if (!va && st && S) throw new Error("Fallback data is required when using Suspense in SSR.");
    S && (Q.current = a, W.current = n, ne.current = false);
    const v = ce[b], M = !z(v) && S ? Xe(v) : Ca;
    if (Lt(M), !z(Oe) && S) throw Oe;
    const _ = S ? Se(qt) : Ca;
    !z(Ae) && S && (_.status = "fulfilled", _.value = true), Lt(_);
  }
  return { mutate: Xe, get data() {
    return B.data = true, Ae;
  }, get error() {
    return B.error = true, Oe;
  }, get isValidating() {
    return B.isValidating = true, lt;
  }, get isLoading() {
    return B.isLoading = true, Qe;
  } };
}, dr = cr(ur), Qt = import_index_xEz64G17.r.forwardRef(({ className: e = "", children: a, ...n }, l) => import_index_xEz64G17.r.createElement("div", { ref: l, className: (0, import_utils_BX5_YKFa.c)("rounded-2xl border border-slate-200 bg-white shadow-sm", e), ...n }, a));
Qt.displayName = "Card";
const Xt = ({ className: e = "", children: a, ...n }) => import_index_xEz64G17.r.createElement("div", { className: (0, import_utils_BX5_YKFa.c)("space-y-1.5 border-b border-slate-100 px-6 py-5", e), ...n }, a);
Xt.displayName = "CardHeader";
const Zt = ({ className: e = "", children: a, ...n }) => import_index_xEz64G17.r.createElement("h3", { className: (0, import_utils_BX5_YKFa.c)("text-lg font-semibold text-slate-900", e), ...n }, a);
Zt.displayName = "CardTitle";
const Ya = ({ className: e = "", children: a, ...n }) => import_index_xEz64G17.r.createElement("p", { className: (0, import_utils_BX5_YKFa.c)("text-sm text-slate-500", e), ...n }, a);
Ya.displayName = "CardDescription";
const ea = ({ className: e = "", children: a, ...n }) => import_index_xEz64G17.r.createElement("div", { className: (0, import_utils_BX5_YKFa.c)("px-6 py-5", e), ...n }, a);
ea.displayName = "CardContent";
const Ga = ({ className: e = "", children: a, ...n }) => import_index_xEz64G17.r.createElement("div", { className: (0, import_utils_BX5_YKFa.c)("flex items-center gap-3 px-6 py-4 border-t border-slate-100", e), ...n }, a);
Ga.displayName = "CardFooter";
const Ra = { BASE_URL: "/", DEV: false, MODE: "production", PROD: true, SSR: false };
let rt = null, Aa = false;
const mr = () => typeof import_meta < "u" && Ra ? Ra : {}, je = (e) => {
  const a = mr();
  return a[`VITE_FIREBASE_${e}`] || a[`NEXT_PUBLIC_FIREBASE_${e}`] || a[`PUBLIC_FIREBASE_${e}`] || null;
}, fr = () => {
  const e = je("API_KEY"), a = je("AUTH_DOMAIN"), n = je("PROJECT_ID"), l = je("APP_ID"), u = je("MESSAGING_SENDER_ID"), f = je("DATABASE_URL") || je("DATABASEURL") || void 0;
  if (!e || !a || !n || !l || !u) return null;
  const y = { apiKey: e, authDomain: a, projectId: n, appId: l, messagingSenderId: u };
  return f && (y.databaseURL = f), y;
}, Ja = () => {
  var a, n, l, u;
  if (typeof window > "u") return null;
  if (rt) return rt;
  if (Aa) return null;
  Aa = true;
  const e = fr();
  if (!e) return (n = (a = import_devConsole_Dygp6vvt.d).warn) == null || n.call(a, "[firebase] missing client configuration for crowdfunding"), null;
  try {
    return rt = (0, import_index_esm_CSeNQ_sZ.b)()[0] ?? (0, import_index_esm_CSeNQ_sZ.i)(e), rt;
  } catch (f) {
    return rt = null, (u = (l = import_devConsole_Dygp6vvt.d).warn) == null || u.call(l, "[firebase] failed to initialize client app", f), null;
  }
}, Ka = (e) => {
  if (!e) return null;
  if (e instanceof Date) return e;
  if (typeof e == "string") {
    const a = new Date(e);
    return Number.isNaN(a.getTime()) ? null : a;
  }
  if (typeof e == "object" && typeof e.toDate == "function") try {
    return e.toDate();
  } catch {
    return null;
  }
  return null;
}, pr = (e) => String(e || "").replace(/\r/g, "").trim(), yr = (e) => {
  const a = Number(e);
  if (!Number.isFinite(a)) return null;
  const n = Math.round(a);
  return n < 1 || n > 5 ? null : n;
}, hr = ({ onUpdate: e, onError: a } = {}) => {
  var l, u;
  const n = Ja();
  if (!n) return null;
  try {
    const f = (0, import_index_esm_CSeNQ_sZ.g)(n), y = (0, import_index_esm_CSeNQ_sZ.d)(f, "aggregates", "crowdfunding");
    return (0, import_index_esm_CSeNQ_sZ.o)(y, (m) => {
      const g = m.exists() ? m.data() || {} : {}, x = Number(g.pizzas), N = Number(g.backers), h = Number(g.goal), w = Ka(g.updatedAt);
      e && e({ pizzas: Number.isFinite(x) ? x : null, backers: Number.isFinite(N) ? N : null, goal: Number.isFinite(h) && h > 0 ? h : null, updatedAt: w });
    }, (m) => {
      var g, x;
      (x = (g = import_devConsole_Dygp6vvt.d).warn) == null || x.call(g, "[firebase] crowdfunding totals listener error", m), a && a(m);
    });
  } catch (f) {
    return (u = (l = import_devConsole_Dygp6vvt.d).warn) == null || u.call(l, "[firebase] crowdfunding totals listener failed", f), a && a(f), null;
  }
}, br = ({ limit: e = 8, onUpdate: a, onError: n } = {}) => {
  var f, y;
  const l = Ja();
  if (!l) return null;
  const u = Number.isFinite(e) && e > 0 ? Math.min(Math.floor(e), 30) : 8;
  try {
    const m = (0, import_index_esm_CSeNQ_sZ.g)(l), g = (0, import_index_esm_CSeNQ_sZ.c)(m, "crowdfund_feedback"), x = (0, import_index_esm_CSeNQ_sZ.q)(g, (0, import_index_esm_CSeNQ_sZ.a)("createdAtMs", "desc"), (0, import_index_esm_CSeNQ_sZ.l)(u));
    return (0, import_index_esm_CSeNQ_sZ.o)(x, (N) => {
      const h = N.docs.map((w) => {
        const A = w.data() || {}, L = pr(A.comment || A.message);
        return L ? { id: w.id || `feedback-${A.createdAtMs || Date.now()}`, comment: L, rating: yr(A.rating), createdAt: Ka(A.createdAt) ?? null } : null;
      }).filter(Boolean);
      a && a(h);
    }, (N) => {
      var h, w;
      (w = (h = import_devConsole_Dygp6vvt.d).warn) == null || w.call(h, "[firebase] pizza feedback listener error", N), n && n(N);
    });
  } catch (m) {
    return (y = (f = import_devConsole_Dygp6vvt.d).warn) == null || y.call(f, "[firebase] pizza feedback listener failed", m), n && n(m), null;
  }
}, _a = "https://local-effort-default-rtdb.firebaseio.com/", Gt = /firebase database/gi, gr = () => new RegExp(Gt);
function Qa(e) {
  return Array.isArray(e) && e.some((a) => a && typeof a == "object" && a._type === "block" && Array.isArray(a.children));
}
function Er(e) {
  if (!Qa(e)) return e;
  let a = false, n = 0;
  const l = e.map((u, f) => {
    if (!u || typeof u != "object" || !Array.isArray(u.children)) return u;
    let y = false;
    const m = [];
    let g = Array.isArray(u.markDefs) ? [...u.markDefs] : [], x = null;
    const N = () => {
      if (x) return x;
      const h = g.find((w) => w && w._type === "link" && typeof w.href == "string" && w.href === _a);
      return h && h._key ? (x = h._key, x) : (n += 1, x = `realtime-db-link-${f}-${n}`, g = [...g, { _key: x, _type: "link", href: _a }], x);
    };
    return u.children.forEach((h) => {
      if (!h || h._type !== "span" || typeof h.text != "string") {
        m.push(h);
        return;
      }
      const w = h.text, A = gr();
      let L, F = 0, ce = false, b = 0;
      for (; (L = A.exec(w)) !== null; ) {
        const P = L.index, G = A.lastIndex;
        if (P > F) {
          const k = w.slice(F, P);
          k && m.push({ ...h, _key: h._key ? `${h._key}-${b++}` : void 0, text: k, marks: Array.isArray(h.marks) ? [...h.marks] : [] });
        }
        const ne = N();
        m.push({ ...h, _key: h._key ? `${h._key}-${b++}` : void 0, text: "Realtime Database", marks: [...Array.isArray(h.marks) ? h.marks : [], ne] }), F = G, ce = true;
      }
      if (!ce) {
        m.push(h);
        return;
      }
      if (F < w.length) {
        const P = w.slice(F);
        P && m.push({ ...h, _key: h._key ? `${h._key}-${b++}` : void 0, text: P, marks: Array.isArray(h.marks) ? [...h.marks] : [] });
      }
      y = true;
    }), y ? (a = true, { ...u, children: m, markDefs: g }) : u;
  });
  return a ? l : e;
}
function De(e) {
  if (typeof e == "string") return e.replace(Gt, "Realtime Database");
  if (Qa(e)) return Er(e);
  if (Array.isArray(e) && e.every((a) => typeof a == "string")) {
    const a = e.map((l) => l.replace(Gt, "Realtime Database"));
    return a.some((l, u) => l !== e[u]) ? a : e;
  }
  return e;
}
function Ta(e) {
  if (!e || typeof e != "object") return e;
  const a = { ...e };
  return a.description = De(a.description), a.story = De(a.story), a.goals = De(a.goals), Array.isArray(a.faq) && (a.faq = a.faq.map((n) => ({ ...n, question: De(n == null ? void 0 : n.question), answer: De(n == null ? void 0 : n.answer) }))), Array.isArray(a.updates) && (a.updates = a.updates.map((n) => ({ ...n, body: De(n == null ? void 0 : n.body) }))), Array.isArray(a.events) && (a.events = a.events.map((n) => ({ ...n, description: De(n == null ? void 0 : n.description) }))), Array.isArray(a.rewardTiers) && (a.rewardTiers = a.rewardTiers.map((n) => ({ ...n, description: De(n == null ? void 0 : n.description) }))), a;
}
const Da = "Complimentary contribution";
function Fa(e, a) {
  const n = Math.max(0, Math.round(Number(e) || 0));
  if (!a || typeof a != "object") return n;
  if (a.type === "full") return 0;
  const l = a.reduction;
  if (!l || typeof l != "object") return n;
  const u = l.type;
  if (u === "percent") {
    const f = Number(l.value);
    if (!Number.isFinite(f) || f <= 0) return n;
    if (f >= 100) return 0;
    const y = 1 - f / 100;
    return Math.max(0, Math.round(n * y));
  }
  if (u === "fixed") {
    const f = Math.max(0, Math.round(Number(l.value) || 0));
    return f ? Math.max(0, n - f) : n;
  }
  return n;
}
const wr = async (e) => {
  const a = await fetch(e, { headers: { Accept: "application/json" } });
  if (!a.ok) throw new Error(`Request failed with status ${a.status}`);
  return a.json();
};
import_index_xEz64G17.P.oneOfType([import_index_xEz64G17.P.string, import_index_xEz64G17.P.number]).isRequired, import_index_xEz64G17.P.string.isRequired;
const Xa = ({ tier: e, onSelect: a, busy: n, selected: l }) => {
  if (!e) return null;
  const u = e.pieCount ? `${e.pieCount.toLocaleString()} pies` : null, f = e.pizzaCount ? `${e.pizzaCount.toLocaleString()} pizzas` : null, y = e.amount ? `$${e.amount.toLocaleString()}` : null, m = typeof e.amount == "number" && e.amount > 0, g = u ? `${u} - ${e.title}` : f ? `${f} - ${e.title}` : `Pledge ${y || "$0"} or more`, x = () => {
    !m || n || a && a(e);
  };
  return import_index_xEz64G17.R.createElement(Qt, { role: m ? "button" : void 0, tabIndex: m ? 0 : void 0, "aria-pressed": l ? "true" : "false", "aria-disabled": !m || n ? "true" : "false", onClick: x, onKeyDown: (N) => {
    !m || n || (N.key === "Enter" || N.key === " ") && (N.preventDefault(), x());
  }, className: (0, import_utils_BX5_YKFa.c)("card transition-colors border-slate-200 hover:border-[var(--color-accent)] focus-within:border-[var(--color-accent)]", m ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]" : "cursor-not-allowed opacity-60", l && "border-[var(--color-accent)] shadow-lg") }, import_index_xEz64G17.R.createElement(Xt, { className: "space-y-2 border-none px-5 pt-5 pb-0" }, import_index_xEz64G17.R.createElement(Zt, { className: "text-xl font-semibold text-slate-900" }, g), !f && import_index_xEz64G17.R.createElement("p", { className: "text-base font-semibold text-[var(--color-accent)]" }, e.title)), import_index_xEz64G17.R.createElement(ea, { className: "space-y-3 px-5 pb-4 pt-4" }, import_index_xEz64G17.R.createElement("p", { className: "text-sm text-slate-600 leading-relaxed" }, e.description), e.limit && import_index_xEz64G17.R.createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Limited - ", e.limit, " left")), import_index_xEz64G17.R.createElement(Ga, { className: "flex items-center gap-3 px-5 pb-5 pt-0 border-none" }, import_index_xEz64G17.R.createElement(import_button_DFNsXnQp.B, { type: "button", variant: l ? "secondary" : "default", className: "flex-1", disabled: !m || n, onClick: (N) => {
    N.stopPropagation(), x();
  } }, l ? "Reward selected" : m ? "Select this reward" : "Unavailable online"), !m && import_index_xEz64G17.R.createElement("span", { className: "text-xs text-slate-500" }, "Contact us to claim.")));
};
Xa.propTypes = { tier: import_index_xEz64G17.P.shape({ pizzaCount: import_index_xEz64G17.P.number, pieCount: import_index_xEz64G17.P.number, amount: import_index_xEz64G17.P.number, title: import_index_xEz64G17.P.string, description: import_index_xEz64G17.P.string, limit: import_index_xEz64G17.P.number }), onSelect: import_index_xEz64G17.P.func, busy: import_index_xEz64G17.P.bool, selected: import_index_xEz64G17.P.bool };
const Ge = (e) => ((e == null ? void 0 : e._id) || (e == null ? void 0 : e.id) || (e == null ? void 0 : e.title) || "").toString(), Ia = [{ value: "public pizza party", label: "Public pizza party" }, { value: "deliver to my home", label: "Deliver to my home" }, { value: "make live at my home", label: "Make live at my home" }, { value: "frozen pizza", label: "Frozen pizza" }, { value: "i'm open or im not sure", label: "I\u2019m open or I\u2019m not sure" }], Nr = "2025-12-10T23:59:59-06:00";
(() => {
  const e = new Date(Nr);
  return Number.isNaN(e.getTime()) ? null : e;
})();
const jr = () => {
  var ba, ga;
  const [e, a] = import_index_xEz64G17.r.useState(null), [n, l] = import_index_xEz64G17.r.useState("story"), [u, f] = import_index_xEz64G17.r.useState(false), [y, m] = import_index_xEz64G17.r.useState(""), [g, x] = import_index_xEz64G17.r.useState(""), [N, h] = import_index_xEz64G17.r.useState(""), [w, A] = import_index_xEz64G17.r.useState(""), [L, F] = import_index_xEz64G17.r.useState(""), [ce, b] = import_index_xEz64G17.r.useState(""), [P, G] = import_index_xEz64G17.r.useState({ status: "idle", code: "", discount: null, message: "" }), ne = "none", [k, Q] = import_index_xEz64G17.r.useState(false), [W, I] = import_index_xEz64G17.r.useState(1), [Ee, te] = import_index_xEz64G17.r.useState(null), [we, re] = import_index_xEz64G17.r.useState(""), [le, B] = import_index_xEz64G17.r.useState(""), [$, Pe] = import_index_xEz64G17.r.useState({ status: "idle", valid: false, participant: null, code: "" }), [Ne, se] = import_index_xEz64G17.r.useState(""), [Ke, it] = import_index_xEz64G17.r.useState(""), [ue, oe] = import_index_xEz64G17.r.useState("idle"), [Oe, Re] = import_index_xEz64G17.r.useState(""), [Ae, ct] = import_index_xEz64G17.r.useState(Ia[0].value), [Ve, lt] = import_index_xEz64G17.r.useState(5), [Qe, Se] = import_index_xEz64G17.r.useState(""), [Xe, ye] = import_index_xEz64G17.r.useState(""), [S, v] = import_index_xEz64G17.r.useState("idle"), [M, _] = import_index_xEz64G17.r.useState([]), [q, Me] = import_index_xEz64G17.r.useState(null), [U, J] = import_index_xEz64G17.r.useState([]), [he, wt] = import_index_xEz64G17.r.useState(""), [Nt, St] = import_index_xEz64G17.r.useState(false), [X, de] = import_index_xEz64G17.r.useState(0), [We, ut] = import_index_xEz64G17.r.useState(false), [Ze, Le] = import_index_xEz64G17.r.useState(false), [xt, dt] = import_index_xEz64G17.r.useState(""), [ie, Za] = import_index_xEz64G17.r.useState(null), [et, tt] = import_index_xEz64G17.r.useState("idle"), [Sr, en] = import_index_xEz64G17.r.useState([]), [xr, ta] = import_index_xEz64G17.r.useState(false), [vr, aa] = import_index_xEz64G17.r.useState(""), vt = import_index_xEz64G17.r.useRef(null), na = import_index_xEz64G17.r.useRef(false), [me, ra] = import_index_xEz64G17.r.useState(null), { data: xe, error: zr } = dr("/api/crowdfunding/summary", wr, { refreshInterval: 3e4, revalidateOnFocus: true });
  Number(xe == null ? void 0 : xe.pizzas), Number(xe == null ? void 0 : xe.backers), Number(xe == null ? void 0 : xe.goal), Number.isFinite(Number(ie == null ? void 0 : ie.pizzas)) && Number(ie.pizzas), Number.isFinite(Number(ie == null ? void 0 : ie.backers)) && Number(ie.backers), Number.isFinite(Number(ie == null ? void 0 : ie.goal)) && Number(ie.goal), import_index_xEz64G17.r.useEffect(() => {
    if (typeof window > "u") return;
    let t = null, s = true;
    try {
      const i = hr({ onUpdate: (c) => {
        s && Za(c);
      }, onError: (c) => {
        s && c && import_devConsole_Dygp6vvt.d.warn("[crowdfunding] realtime totals listener error", c);
      } });
      typeof i == "function" ? t = i : s && import_devConsole_Dygp6vvt.d.warn("[crowdfunding] realtime totals disabled - missing client configuration?");
    } catch (i) {
      s && import_devConsole_Dygp6vvt.d.warn("[crowdfunding] failed to start realtime totals listener", i);
    }
    return () => {
      s = false, typeof t == "function" && t();
    };
  }, []), import_index_xEz64G17.r.useEffect(() => {
    if (n === "gallery" && !na.current) {
      na.current = true, ta(true);
      const t = ["/api/search-images?query=pizza&per_page=50", "/api/search-images?query=pie&per_page=50"];
      Promise.all(t.map(async (s) => {
        try {
          const i = await fetch(s, { headers: { Accept: "application/json" } }), c = await i.json().catch(() => ({})), p = Array.isArray(c == null ? void 0 : c.images) ? c.images : [];
          return { ok: i.ok, images: p };
        } catch (i) {
          return import_devConsole_Dygp6vvt.d.warn("[crowdfunding] gallery fetch failed", i), { ok: false, images: [] };
        }
      })).then((s) => {
        const i = [], c = /* @__PURE__ */ new Set();
        s.forEach(({ ok: p, images: d }) => {
          !p || !d.length || d.forEach((E) => {
            const T = (E == null ? void 0 : E.asset_id) || (E == null ? void 0 : E.public_id);
            !T || c.has(T) || (c.add(T), i.push(E));
          });
        }), i.length === 0 && aa("No images found yet."), en(i);
      }).catch((s) => {
        aa((s == null ? void 0 : s.message) || "Error loading gallery");
      }).finally(() => ta(false));
    }
  }, [n]), import_index_xEz64G17.r.useEffect(() => {
    if (typeof window > "u") return;
    let t = null, s = true;
    tt("connecting"), Le(true);
    try {
      const i = br({ limit: 8, onUpdate: (c) => {
        s && (_(c), Le(false), dt(""), tt("ready"));
      }, onError: (c) => {
        s && (Le(false), tt("error"), c && import_devConsole_Dygp6vvt.d.warn("[crowdfunding] realtime pizza feedback listener error", c));
      } });
      typeof i == "function" ? t = i : s && (tt("disabled"), Le(false), import_devConsole_Dygp6vvt.d.warn("[crowdfunding] realtime pizza feedback disabled - missing client configuration?"));
    } catch (i) {
      s && (tt("error"), Le(false), import_devConsole_Dygp6vvt.d.warn("[crowdfunding] failed to start realtime pizza feedback listener", i));
    }
    return () => {
      s = false, typeof t == "function" && t();
    };
  }, []), import_index_xEz64G17.r.useEffect(() => {
    if (et === "ready") {
      vt.current = null;
      return;
    }
    if (!["disabled", "error"].includes(et) || vt.current === et) return;
    vt.current = et;
    let t = false;
    return Le(true), dt(""), (async () => {
      try {
        const i = await fetch("/api/crowdfund/pizza-feedback?limit=8", { headers: { Accept: "application/json" } });
        let c = null;
        try {
          c = await i.json();
        } catch {
          c = null;
        }
        if (!i.ok) {
          const d = c && c.error || "Unable to reach the pizza feedback service right now.";
          throw new Error(d);
        }
        const p = Array.isArray(c == null ? void 0 : c.entries) ? c.entries.map((d) => {
          const E = Number(d.rating), T = Number.isFinite(E) && E > 0 ? E : null, ee = typeof d.comment == "string" && d.comment.trim() ? d.comment.trim() : typeof d.message == "string" ? d.message.trim() : "";
          return { id: d.id || `feedback-${d.createdAt || Date.now()}`, rating: T, comment: ee };
        }).filter((d) => d.comment) : [];
        t || _(p);
      } catch (i) {
        t || dt((i == null ? void 0 : i.message) || "Unable to reach the pizza feedback service right now.");
      } finally {
        t || Le(false);
      }
    })(), () => {
      t = true;
    };
  }, [et]);
  const sa = import_index_xEz64G17.r.useMemo(() => !N || /.+@.+\..+/.test(N), [N]), oa = import_index_xEz64G17.r.useMemo(() => w.replace(/\D/g, ""), [w]), ia = import_index_xEz64G17.r.useMemo(() => !w || oa.length >= 10, [w, oa]);
  import_index_xEz64G17.r.useEffect(() => {
    const t = "local-pizza-by-local-effort-let-s-make-1000-pizzas", s = `*[_type == "crowdfundingCampaign" && slug.current == $slug][0]{
      title,
      // Short description: prefer new field name, fallback to legacy if present
      "description": coalesce(description, shortDescription),
      // pizza-specific fields (keep legacy fields for backwards compatibility)
      pizzaGoal,
      pizzasSold,
      piesSold,
      goal,
      raisedAmount,
      backers,
      endDate,
      heroImage,
      story,
      goals,
      "featuredPublicEvents": featuredPublicEvents[]->{ _id, location, startDate, endDate, foodType, ticketsUrl, description },
      events[]{ _key, location, startDate, endDate, foodType, ticketsUrl, description },
      faq,
      "rewardTiers": rewardTiers[]->{ amount, pizzaCount, pieCount, title, description, limit, referralOnly, referralCode } | order(amount asc),
      "updates": order(
        updates[]->{
          _id,
          title,
          publishedAt,
          body
        },
        publishedAt desc
      )
    }`, i = { slug: t };
    (async () => {
      try {
        const p = await import_index_xEz64G17.c.fetch(s, i);
        a(Ta(p));
      } catch (p) {
        try {
          const d = p && p.message ? p.message : String(p);
          if (import_devConsole_Dygp6vvt.d.error("Sanity fetch error message:", d), p && p.response && typeof p.response.text == "function") {
            const E = await p.response.text();
            import_devConsole_Dygp6vvt.d.error("Sanity fetch response body:", E);
          }
        } catch (d) {
          import_devConsole_Dygp6vvt.d.error("Error while logging Sanity error:", d);
        }
        try {
          const E = await import_index_xEz64G17.c.fetch(`*[_type == "crowdfundingCampaign"][0]{
            title,
            "description": coalesce(description, shortDescription),
            pizzaGoal,
            pizzasSold,
            piesSold,
            goal,
            raisedAmount,
            backers,
            endDate,
            heroImage,
            story,
            goals,
            "featuredPublicEvents": featuredPublicEvents[]->{ _id, location, startDate, endDate, foodType, ticketsUrl, description },
            events[]{ _key, location, startDate, endDate, foodType, ticketsUrl, description },
            faq,
            "rewardTiers": rewardTiers[]->{ amount, pizzaCount, pieCount, title, description, limit, referralOnly, referralCode } | order(amount asc),
            "updates": order(
              updates[]->{
                _id,
                title,
                publishedAt,
                body
              },
              publishedAt desc
            )
          }`);
          if (E) {
            import_devConsole_Dygp6vvt.d.warn("Loaded fallback campaign (first in dataset)"), a(Ta(E));
            return;
          }
        } catch (d) {
          import_devConsole_Dygp6vvt.d.error("Fallback fetch also failed:", d && (d.message || d));
        }
        import_devConsole_Dygp6vvt.d.warn("Failed to load campaign data.");
      } finally {
      }
    })();
  }, []);
  const mt = (e == null ? void 0 : e.rewardTiers) || [], _e = import_index_xEz64G17.r.useMemo(() => {
    const t = $.valid && $.code;
    return mt.filter((s) => s != null && s.referralOnly ? t ? s.referralCode && typeof s.referralCode == "string" ? s.referralCode.trim().toLowerCase() === $.code.trim().toLowerCase() : true : false : true);
  }, [mt, $]), Be = import_index_xEz64G17.r.useMemo(() => _e.some((t) => typeof (t == null ? void 0 : t.amount) == "number" && t.amount > 0), [_e]), ca = import_index_xEz64G17.r.useMemo(() => _e.find((t) => typeof (t == null ? void 0 : t.amount) == "number" && t.amount > 0) || null, [_e]);
  import_index_xEz64G17.r.useEffect(() => {
    if (!Ne) return;
    _e.some((s) => Ge(s) === Ne) || se("");
  }, [Ne, _e]);
  const C = import_index_xEz64G17.r.useMemo(() => {
    if (Ne) {
      const t = _e.find((s) => Ge(s) === Ne);
      if (t) return t;
    }
    return ca;
  }, [Ne, _e, ca]), tn = import_index_xEz64G17.r.useMemo(() => Ge(C), [C]), He = import_index_xEz64G17.r.useMemo(() => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }), []), la = import_index_xEz64G17.r.useMemo(() => !C || typeof C.amount != "number" ? "" : He.format(C.amount), [C, He]), Z = import_index_xEz64G17.r.useMemo(() => ce.trim(), [ce]), zt = import_index_xEz64G17.r.useMemo(() => !Z || P.status !== "applied" || !P.code || !P.discount || P.code.toLowerCase() !== Z.toLowerCase() ? null : P.discount, [Z, P]), ua = import_index_xEz64G17.r.useMemo(() => {
    if (!C || typeof C.amount != "number") return 0;
    const t = C.amount * Math.max(1, W);
    return Math.max(0, Math.round(t * 100));
  }, [C, W]), at = import_index_xEz64G17.r.useMemo(() => Fa(ua, zt), [ua, zt]), Ye = at > 0, an = import_index_xEz64G17.r.useMemo(() => at <= 0 ? "Free" : He.format(at / 100), [at, He]);
  import_index_xEz64G17.r.useEffect(() => {
    k && !C && (Q(false), re(Be ? "That reward is no longer available. Please pick another tier to continue." : "Online checkout is temporarily unavailable. Email hello@localeffortfood.com to pledge."));
  }, [k, C, Be]), import_index_xEz64G17.r.useEffect(() => {
    !k && Be && C && re("");
  }, [k, Be, C]);
  const nn = (t) => {
    if (!t || typeof t.amount != "number" || t.amount <= 0) {
      re("Online checkout is only available for paid rewards. Please choose another tier.");
      return;
    }
    se(Ge(t)), re(""), Q(true);
  }, rn = async (t) => {
    t.preventDefault();
    const s = Ke.trim();
    if (!s) {
      oe("error"), Re("Please enter an email address.");
      return;
    }
    oe("loading"), Re("");
    try {
      const i = await fetch("/api/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: s }) });
      if (!i.ok) {
        const c = await i.text().catch(() => "");
        throw new Error(c || "Subscription failed");
      }
      oe("success"), Re("Thanks! Check your inbox soon."), it("");
    } catch (i) {
      oe("error"), Re(i.message || "Something went wrong. Please try again.");
    }
  }, sn = import_index_xEz64G17.r.useCallback(async (t) => {
    if (t.preventDefault(), We) return;
    const s = Qe.trim(), i = Number(Ve);
    if (!s) {
      v("error"), ye("Please share a quick note about the pizza.");
      return;
    }
    v("loading"), ye("Saving your note...");
    try {
      const c = await fetch("/api/crowdfund/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, message: s }) });
      if (!c.ok) {
        const T = await c.text().catch(() => "");
        throw new Error(T || "Could not save your note. Please try again.");
      }
      const p = await c.json().catch(() => ({})), d = { id: `feedback-${Date.now()}`, name: name || DEFAULT_FEEDBACK_NAME, message: s, createdAt: (/* @__PURE__ */ new Date()).toISOString() }, E = normalizeFeedbackEntry(p.entry) || normalizeFeedbackEntry(d);
      E && _((T) => {
        const ee = E.id ? T.filter((O) => O.id !== E.id) : T;
        return [E, ...ee].slice(0, 8);
      }), setFeedbackName(""), Se("");
    } catch (c) {
      v("error"), ye((c == null ? void 0 : c.message) || "Could not save your note. Please try again.");
    }
    if (!Number.isInteger(i) || i < 1 || i > 5) {
      v("error"), ye("Please choose how much you loved the pizza.");
      return;
    }
    v("idle"), ye(""), ut(true);
    try {
      const c = await fetch("/api/crowdfund/pizza-feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rating: i, message: s }) });
      let p = null;
      try {
        p = await c.json();
      } catch {
        p = null;
      }
      if (!c.ok) {
        const T = p && p.error || "We had trouble saving your pizza note. Please try again.";
        throw new Error(T);
      }
      const d = p == null ? void 0 : p.entry, E = { id: d && d.id || `feedback-${Date.now()}`, rating: Number.isFinite(Number(d == null ? void 0 : d.rating)) ? Number(d.rating) : i, comment: typeof (d == null ? void 0 : d.comment) == "string" && d.comment.trim() ? d.comment.trim() : typeof (d == null ? void 0 : d.message) == "string" && d.message.trim() ? d.message.trim() : s };
      _((T) => {
        const ee = Array.isArray(T) ? T.filter((O) => O && O.id !== E.id) : [];
        return [E, ...ee].slice(0, 8);
      }), dt(""), Se(""), lt(5), v("success"), ye("Thanks for spreading the pizza love!");
    } catch (c) {
      v("error"), ye((c == null ? void 0 : c.message) || "We had trouble saving your pizza note. Please try again.");
    } finally {
      ut(false);
    }
  }, [Qe, Ve, We]), { title: on, description: kr, faq: Cr, story: Rr, backers: Ar, endDate: _r, piesSold: Tr } = e || {}, kt = on || "Crowdfunding", da = import_index_xEz64G17.r.useMemo(() => {
    const t = [{ id: "hero-main", src: HERO_MAIN_IMAGE, alt: kt }];
    return U.forEach((s) => {
      s != null && s.src && s.src !== HERO_MAIN_IMAGE && t.push({ id: s.id || s.src, src: s.src, alt: s.alt || kt });
    }), t;
  }, [kt, U]).length;
  import_index_xEz64G17.r.useEffect(() => {
    X >= da && de(0);
  }, [X, da]);
  const { payments: Ct, loading: cn, error: qe } = (0, import_label_f3ShiFsw.u)(), ft = import_index_xEz64G17.r.useRef(null), pt = import_index_xEz64G17.r.useRef(null), Rt = import_index_xEz64G17.r.useRef(false), [ma, At] = import_index_xEz64G17.r.useState(false), [yt, fa] = import_index_xEz64G17.r.useState(""), { notify: H } = (0, import_index_xEz64G17.i)();
  import_index_xEz64G17.r.useEffect(() => {
    G((t) => Z ? !t.code || t.code.toLowerCase() === Z.toLowerCase() ? t : { status: "idle", code: "", discount: null, message: "" } : t.status === "idle" && !t.code && !t.discount && !t.message ? t : { status: "idle", code: "", discount: null, message: "" });
  }, [Z]);
  const ln = import_index_xEz64G17.r.useCallback(async () => {
    if (!Z) {
      G({ status: "idle", code: "", discount: null, message: "" });
      return;
    }
    G({ status: "checking", code: Z, discount: null, message: "" });
    try {
      const t = await fetch("/api/crowdfund/discount-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: Z }) }), s = await t.json().catch(() => ({}));
      if (!t.ok) throw new Error((s == null ? void 0 : s.error) || "Unable to validate that discount code.");
      if (!(s != null && s.valid)) {
        G({ status: "invalid", code: Z, discount: null, message: "That code is not valid for this crowdfunding campaign." });
        return;
      }
      const i = s.discount || null;
      G({ status: "applied", code: Z, discount: i, message: s.message || "" }), H("Discount applied.", { type: "success" });
    } catch (t) {
      G({ status: "error", code: Z, discount: null, message: (t == null ? void 0 : t.message) || "Unable to validate that discount code." });
    }
  }, [Z, H]), un = import_index_xEz64G17.r.useCallback((t, s, i) => {
    if (!(!Array.isArray(t) || t.length === 0)) try {
      localStorage.setItem("cf_items", JSON.stringify(t)), s ? localStorage.setItem("cf_name", s) : localStorage.removeItem("cf_name");
      const c = typeof i == "string" ? i.trim() : "";
      c ? localStorage.setItem("cf_discount", c) : localStorage.removeItem("cf_discount");
    } catch (c) {
      import_devConsole_Dygp6vvt.d.warn("[square] [crowdfunding] failed to persist pending contribution", c);
    }
  }, []), _t = import_index_xEz64G17.r.useCallback(() => {
    try {
      localStorage.removeItem("cf_items"), localStorage.removeItem("cf_name"), localStorage.removeItem("cf_discount");
    } catch (t) {
      import_devConsole_Dygp6vvt.d.warn("[square] [crowdfunding] failed to clear pending contribution", t);
    }
  }, []), ve = import_index_xEz64G17.r.useCallback(() => {
    var s;
    const t = pt.current;
    if (t) {
      import_devConsole_Dygp6vvt.d.log("[square] [crowdfunding] destroying card instance"), pt.current = null;
      try {
        const i = (s = t.destroy) == null ? void 0 : s.call(t);
        i && typeof i.then == "function" && (i.catch((c) => import_devConsole_Dygp6vvt.d.warn("[square] [crowdfunding] card destroy warning", c)), i.catch((c) => import_devConsole_Dygp6vvt.d.warn("[square] [crowdfunding] card destroy warning", c)));
      } catch (i) {
        import_devConsole_Dygp6vvt.d.warn("[square] [crowdfunding] card destroy error", i);
      }
    }
    ft.current && (ft.current.innerHTML = ""), Rt.current = false, At(false);
  }, []), Tt = import_index_xEz64G17.r.useCallback(({ pizzasPurchased: t = 0, totalCents: s, paymentId: i, newTotal: c, funderName: p, viaRedirect: d = false } = {}) => {
    const E = Number.isFinite(t) ? Math.max(0, Math.round(t)) : 0, T = typeof s == "number" ? He.format(Math.max(s, 0) / 100) : null;
    m(""), te({ pizzasPurchased: E, totalLabel: T, paymentId: i || null, viaRedirect: d, funderName: p || "", timestamp: Date.now() }), Q(false), re(""), I(1), se(""), (typeof c == "number" || E > 0) && a((ee) => {
      if (!ee) return ee;
      const O = { ...ee };
      if (typeof c == "number" && Number.isFinite(c)) O.pizzasSold = c;
      else {
        const V = typeof O.pizzasSold == "number" ? O.pizzasSold : 0;
        O.pizzasSold = V + E;
      }
      return O;
    }), ve(), H("Thanks! Your contribution has been processed.", { type: "success" });
  }, [He, ve, H, a, te, re, m, I, se, Q]);
  import_index_xEz64G17.r.useEffect(() => {
    k || ve();
  }, [k, ve]), import_index_xEz64G17.r.useEffect(() => {
    qe && H(qe, { type: "error" });
  }, [qe, H]), import_index_xEz64G17.r.useEffect(() => {
    if (!Ye) {
      ve();
      return;
    }
    if (!Ct || !k || !C) return;
    const t = ft.current;
    if (!t || Rt.current) return;
    let s = false;
    return Rt.current = true, fa(""), At(false), import_devConsole_Dygp6vvt.d.log("[square] [crowdfunding] initializing card", { tier: (C == null ? void 0 : C.title) || null, amount: (C == null ? void 0 : C.amount) || null }), Ct.card().then((i) => {
      var c;
      if (!i) throw new Error("Square card component unavailable.");
      if (s) {
        try {
          (c = i.destroy) == null || c.call(i);
        } catch {
        }
        return null;
      }
      return pt.current = i, i.attach(t);
    }).then((i) => {
      s || i === null || (At(true), import_devConsole_Dygp6vvt.d.log("[square] [crowdfunding] card attached"));
    }).catch((i) => {
      if (s) return;
      import_devConsole_Dygp6vvt.d.error("[square] [crowdfunding] card init failed", i);
      const c = (i == null ? void 0 : i.message) || "Unable to load the payment form.";
      fa(c), H(c, { type: "error" }), ve();
    }), () => {
      s = true;
    };
  }, [Ct, k, C, Ye, H, ve]), import_index_xEz64G17.r.useEffect(() => () => {
    import_devConsole_Dygp6vvt.d.log("[square] [crowdfunding] page unmount cleanup"), ve();
  }, [ve]), import_index_xEz64G17.r.useEffect(() => {
    new URLSearchParams(window.location.search).get("payment") === "success" && (async () => {
      let s = false;
      try {
        const i = localStorage.getItem("cf_items"), c = i ? JSON.parse(i) : [], p = localStorage.getItem("cf_name") || void 0, d = localStorage.getItem("cf_discount") || void 0;
        if (Array.isArray(c) && c.length > 0) {
          (await fetch("/api/crowdfund/confirm-payment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: c, funderName: p, discountCode: d }) })).ok && setConfirmMsg("Thanks! Your contribution has been recorded.");
          const T = c.filter((O) => O && O.type === "pizza").reduce((O, V) => {
            const ze = Number(V == null ? void 0 : V.pizzaCount), be = Number(V == null ? void 0 : V.quantity);
            return Number.isFinite(ze) && ze > 0 ? O + ze : Number.isFinite(be) && be > 0 ? O + be : O + 1;
          }, 0), ee = c.reduce((O, V) => {
            const ze = Number(V == null ? void 0 : V.priceCents), be = Number(V == null ? void 0 : V.quantity), Ue = Number.isFinite(be) && be > 0 ? be : 1;
            return !Number.isFinite(ze) || ze <= 0 ? O : O + ze * Ue;
          }, 0);
          Tt({ pizzasPurchased: T, totalCents: ee, newTotal, funderName: p, viaRedirect: true }), s || H("Payment succeeded, but updating our counter failed. We will reconcile shortly.", { type: "warning" });
        } else Tt({ pizzasPurchased: 0, viaRedirect: true });
      } catch (i) {
        console.warn("[crowdfunding] hosted checkout success handling failed", i);
      } finally {
        _t();
        try {
          const i = new URL(window.location.href);
          i.searchParams.delete("payment"), window.history.replaceState({}, document.title, i.toString());
        } catch {
        }
      }
    })();
  }, [_t, Tt, H]);
  const dn = import_index_xEz64G17.r.useCallback(async () => {
    var i;
    const t = pt.current;
    if (!t) {
      const c = "Payment form is not ready yet.";
      throw H(c, { type: "error" }), new Error(c);
    }
    const s = await t.tokenize();
    if (import_devConsole_Dygp6vvt.d.log("[square] [crowdfunding] tokenize result", s), s.status !== "OK" || !s.token) {
      const c = Array.isArray(s.errors) && ((i = s.errors[0]) == null ? void 0 : i.message) || "Unable to verify card details.";
      throw H(c, { type: "error" }), new Error(c);
    }
    return s.token;
  }, [H]), mn = async (t) => {
    var s;
    m(""), f(true);
    try {
      const i = t.map((D) => {
        const Y = Math.max(0, Math.round(Number(D.price) || 0)), j = Math.max(1, Math.round(Number(D.quantity) || 1));
        return { name: D.name || "Contribution", priceCents: Y, quantity: j, type: D.type, pizzaCount: D.pizzaCount };
      }), c = i.map((D) => ({ name: D.name, price: D.priceCents, quantity: D.quantity, type: D.type, pizzaCount: D.pizzaCount })), p = i.reduce((D, Y) => D + Y.priceCents * Y.quantity, 0), d = Z, E = zt, ee = Fa(p, E) <= 0, O = async (D) => {
        const Y = await fetch("/api/crowdfund/confirm-payment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: c, funderName: g, email: N.trim() || void 0, phone: w.trim() || void 0, notes: L || void 0, notify: ne, discountCode: d || void 0 }) }), j = await Y.json().catch(() => ({}));
        if (!Y.ok) throw new Error((j == null ? void 0 : j.error) || "Failed to record contribution.");
        const bt = D ? `${D.label || Da}. We've recorded your contribution.` : "Thanks! Your contribution has been recorded.";
        setConfirmMsg(bt), H(bt, { type: "success" }), b(""), G({ status: "idle", code: "", discount: null, message: "" }), _t();
      };
      if (ee) {
        await O(E);
        return;
      }
      try {
        const D = i.map((j) => ({ name: j.name, price: Number((j.priceCents / 100).toFixed(2)), quantity: j.quantity, type: j.type, pizzaCount: j.pizzaCount })), Y = await fetch("/api/crowdfund/contribute", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: D, funderName: g || void 0, discountCode: d || void 0 }) });
        if (Y.ok) {
          const j = await Y.json().catch(() => ({}));
          if (j != null && j.comped) {
            await O(j.discount || E);
            return;
          }
          if (j != null && j.url) {
            const bt = i.map((nt) => ({ name: nt.name, type: nt.type, pizzaCount: nt.pizzaCount, quantity: nt.quantity, priceCents: nt.priceCents }));
            un(bt, (g == null ? void 0 : g.trim()) || "", d || ""), H("Redirecting to secure checkout\u2026", { type: "success" }), window.location.assign(j.url);
            return;
          }
        }
      } catch (D) {
        import_devConsole_Dygp6vvt.d.warn("[square] [crowdfunding] payment link attempt failed", D);
      }
      let V;
      try {
        V = await dn();
      } catch (D) {
        throw new Error((D == null ? void 0 : D.message) || "Card not ready");
      }
      const ze = { items: c, funderName: g, email: N.trim() || void 0, phone: w.trim() || void 0, notes: L || void 0, rewardPreference: Ae, notify: ne, token: V, pizzaQty: W, discountCode: d || void 0 }, be = await fetch("/api/crowdfund/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(ze) }), Ue = await be.json().catch(() => ({}));
      if (!be.ok) {
        let D = Ue.error || "Checkout failed";
        if (typeof D == "string" && D.startsWith("[")) try {
          const Y = JSON.parse(D);
          Array.isArray(Y) && ((s = Y[0]) != null && s.code) && (D = `Square error: ${Y[0].code}${Y[0].detail ? " - " + Y[0].detail : ""}`);
        } catch {
        }
        throw new Error(D);
      }
      if (Ue != null && Ue.comped) {
        await O(Ue.discount || E);
        return;
      }
      setConfirmMsg("Thanks! Your contribution has been processed."), b(""), G({ status: "idle", code: "", discount: null, message: "" }), H("Payment complete. Thanks for fueling pizza!", { type: "success" });
    } catch (i) {
      m((i == null ? void 0 : i.message) || "Payment failed"), H((i == null ? void 0 : i.message) || "Payment failed", { type: "error" });
    } finally {
      f(false);
    }
  };
  import_index_xEz64G17.r.useMemo(() => Array.isArray(e == null ? void 0 : e.updates) ? e.updates.filter((t) => {
    if (!t) return false;
    const s = Array.isArray(t.body) && t.body.some(Boolean);
    return !!t.title || s || !!t.body;
  }).map((t, s) => {
    const i = t.publishedAt || null, c = i ? new Date(i) : null, p = c && !Number.isNaN(c.getTime()) ? c.getTime() : 0;
    return { ...t, _id: t._id || `update-${s}`, _publishedTimestamp: p };
  }).sort((t, s) => s._publishedTimestamp - t._publishedTimestamp).map(({ _publishedTimestamp: t, ...s }) => s) : [], [e == null ? void 0 : e.updates]);
  const fe = import_index_xEz64G17.r.useCallback((t) => {
    if (!t) return null;
    const s = t.includes("T") ? t : `${t}T00:00:00`, i = new Date(s);
    return Number.isNaN(i.getTime()) ? null : i;
  }, []);
  import_index_xEz64G17.r.useCallback((t) => {
    if (!t) return "";
    const s = new Date(t);
    return Number.isNaN(s.getTime()) ? "" : s.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }, []);
  const ht = import_index_xEz64G17.r.useCallback((t, s) => {
    const i = Array.isArray(t) ? t : [];
    if (!i.length) return [];
    const c = /* @__PURE__ */ new Date();
    return c.setHours(0, 0, 0, 0), i.filter(Boolean).map((p, d) => ({ ...p, _key: (p == null ? void 0 : p._key) || (p == null ? void 0 : p._id) || `${s || "event"}-${d}` })).filter((p) => {
      const d = fe(p.startDate);
      if (!d) return false;
      const E = fe(p.endDate) || d, T = new Date(E);
      return T.setHours(23, 59, 59, 999), T >= c;
    }).sort((p, d) => {
      const E = fe(p.startDate), T = fe(d.startDate);
      return !E && !T ? 0 : E ? T ? E - T : -1 : 1;
    });
  }, [fe]), pa = e == null ? void 0 : e.events, ya = e == null ? void 0 : e.featuredPublicEvents, Dt = import_index_xEz64G17.r.useMemo(() => ht(pa, "campaign"), [pa, ht]), ha = import_index_xEz64G17.r.useMemo(() => ht(ya, "public"), [ya, ht]);
  import_index_xEz64G17.r.useEffect(() => {
    if (!me) return;
    Dt.some((s) => (s._key || s._id) === (me._key || me._id)) || ra(null);
  }, [me, Dt, ha]), import_index_xEz64G17.r.useCallback((t) => {
    const s = fe(t == null ? void 0 : t.startDate), i = fe(t == null ? void 0 : t.endDate);
    if (!s) return "";
    const c = (/* @__PURE__ */ new Date()).getFullYear(), p = s.getFullYear() > c;
    if (i && i.getTime() !== s.getTime()) {
      const E = { month: "short", day: "numeric" };
      return p && (E.year = "numeric"), `starts ${new Intl.DateTimeFormat("en-US", E).format(s)}`;
    }
    const d = { weekday: "short", month: "short", day: "numeric" };
    return p && (d.year = "numeric"), new Intl.DateTimeFormat("en-US", d).format(s);
  }, [fe]);
  const fn = import_index_xEz64G17.r.useCallback((t) => {
    const s = fe(t == null ? void 0 : t.startDate), i = fe(t == null ? void 0 : t.endDate);
    if (!s) return "";
    const c = (/* @__PURE__ */ new Date()).getFullYear(), p = { weekday: "short", month: "short", day: "numeric" }, d = s.getFullYear() > c || i && i.getFullYear() !== s.getFullYear(), E = new Intl.DateTimeFormat("en-US", d ? { ...p, year: "numeric" } : p).format(s);
    if (i && i.getTime() !== s.getTime()) {
      const T = i.getFullYear() > c || i.getFullYear() !== s.getFullYear(), ee = new Intl.DateTimeFormat("en-US", T ? { ...p, year: "numeric" } : p).format(i);
      return `${E} - ${ee}`;
    }
    return E;
  }, [fe]);
  Dt.length > 0, ha.length > 0;
  const pn = Number.isFinite(q == null ? void 0 : q.pizzasSold) ? q.pizzasSold : null, yn = Number.isFinite(q == null ? void 0 : q.goal) ? q.goal : null;
  return pn ?? (e == null ? void 0 : e.pizzasSold) ?? (e == null || e.raisedAmount), yn ?? (e == null ? void 0 : e.pizzaGoal) ?? (e == null || e.goal), import_index_xEz64G17.R.createElement(import_index_xEz64G17.R.Fragment, null, import_index_xEz64G17.R.createElement("div", { className: "space-y-16" }, import_index_xEz64G17.R.createElement("div", { className: "mx-auto w-full max-w-5xl px-4 py-10 lg:px-8" }, import_index_xEz64G17.R.createElement("div", { className: "grid gap-8 lg:grid-cols-[2fr_1fr] lg:items-start" }, import_index_xEz64G17.R.createElement("div", { className: "space-y-6" }, y && import_index_xEz64G17.R.createElement("p", { className: "text-sm text-red-600" }, y), !k && import_index_xEz64G17.R.createElement(import_button_DFNsXnQp.B, { type: "button", onClick: () => {
    if (Ee && (te(null), m("")), !C) {
      re("Reward tiers are loading. Please try again in a moment.");
      return;
    }
    se(Ge(C)), re(""), Q(true);
  }, className: "w-full text-lg h-12", disabled: !Be || u }, Ee ? "Make another pledge" : "I want pizza"), (we || !Be && !k) && import_index_xEz64G17.R.createElement("p", { className: "text-sm text-slate-600" }, we || "Online checkout is temporarily unavailable. Email hello@localeffortfood.com to pledge."), k && C && import_index_xEz64G17.R.createElement("form", { className: "space-y-6", onSubmit: (t) => {
    t.preventDefault(), !(!C || typeof C.amount != "number") && mn([{ name: C.title || "Pizza", price: Math.round(C.amount * 100), type: "pizza", pizzaCount: W, quantity: W }]);
  } }, import_index_xEz64G17.R.createElement("div", { className: "grid grid-cols-1 gap-4" }, import_index_xEz64G17.R.createElement("div", { className: "space-y-2" }, import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.L, { htmlFor: "cf-name" }, "Name"), import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.I, { id: "cf-name", placeholder: "Name", autoComplete: "name", value: g, onChange: (t) => x(t.target.value) })), import_index_xEz64G17.R.createElement("div", { className: "space-y-2" }, import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.L, { htmlFor: "cf-email" }, "Email"), import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.I, { id: "cf-email", type: "email", autoComplete: "email", placeholder: "you@example.com", value: N, onChange: (t) => h(t.target.value) })), import_index_xEz64G17.R.createElement("div", { className: "space-y-2" }, import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.L, { htmlFor: "cf-phone" }, "Phone"), import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.I, { id: "cf-phone", type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "(555) 555-1234", value: w, onChange: (t) => A(t.target.value) }))), import_index_xEz64G17.R.createElement("div", { className: "space-y-2" }, import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.L, { htmlFor: "cf-referral" }, "Referral code (optional)"), import_index_xEz64G17.R.createElement("div", { className: "flex flex-col gap-2 sm:flex-row" }, import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.I, { id: "cf-referral", placeholder: "Referral code", value: le, onChange: (t) => B(t.target.value), className: "sm:flex-1" }), import_index_xEz64G17.R.createElement(import_button_DFNsXnQp.B, { type: "button", variant: "outline", className: "sm:w-32", disabled: !le || $.status === "checking", onClick: async () => {
    const t = (le || "").trim();
    if (t) {
      Pe({ status: "checking", valid: false, participant: null, code: t });
      try {
        const s = await fetch("/api/referrals/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: t }) }), i = await s.json().catch(() => ({}));
        s.ok && i && i.valid ? Pe({ status: "ok", valid: true, participant: i.participant || null, code: t }) : Pe({ status: "ok", valid: false, participant: null, code: t });
      } catch {
        Pe({ status: "error", valid: false, participant: null, code: t });
      }
    }
  } }, $.status === "checking" ? "Checking..." : "Apply"))), $.status === "ok" && $.valid && import_index_xEz64G17.R.createElement("p", { className: "text-sm text-emerald-700" }, "Code applied", (ba = $.participant) != null && ba.name ? ` for ${$.participant.name}` : "", "."), $.status === "ok" && !$.valid && import_index_xEz64G17.R.createElement("p", { className: "text-sm text-red-600" }, "That code is not valid."), $.status === "error" && import_index_xEz64G17.R.createElement("p", { className: "text-sm text-red-600" }, "Unable to validate that code right now."), import_index_xEz64G17.R.createElement("div", { className: "space-y-2" }, import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.L, { htmlFor: "cf-square-discount" }, "Square discount code (optional)"), import_index_xEz64G17.R.createElement("div", { className: "flex flex-col gap-2 sm:flex-row" }, import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.I, { id: "cf-square-discount", placeholder: "Discount code", autoComplete: "off", value: ce, onChange: (t) => b(t.target.value), className: "sm:flex-1" }), import_index_xEz64G17.R.createElement(import_button_DFNsXnQp.B, { type: "button", variant: "outline", className: "sm:w-32", disabled: !Z || P.status === "checking", onClick: ln }, P.status === "checking" ? "Checking\u2026" : "Apply")), import_index_xEz64G17.R.createElement("p", { className: "text-xs text-slate-500" }, "Apply a complimentary or promo code before checking out."), P.status === "applied" && import_index_xEz64G17.R.createElement("p", { className: "text-sm text-emerald-700" }, ((ga = P.discount) == null ? void 0 : ga.label) || Da, at <= 0 ? " \u2014 no payment required." : " applied."), P.status === "invalid" && import_index_xEz64G17.R.createElement("p", { className: "text-sm text-red-600" }, P.message || "That code is not valid for this crowdfunding campaign."), P.status === "error" && import_index_xEz64G17.R.createElement("p", { className: "text-sm text-red-600" }, P.message || "Unable to validate that discount code right now."), import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.I, { id: "cf-square-discount", placeholder: "Discount code", autoComplete: "off", value: ce, onChange: (t) => b(t.target.value) }), import_index_xEz64G17.R.createElement("p", { className: "text-xs text-slate-500" }, "We'll include this code with your secure Square checkout.")), C && import_index_xEz64G17.R.createElement("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-end" }, import_index_xEz64G17.R.createElement("div", { className: "space-y-2" }, import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.L, { htmlFor: "pizza-qty" }, "Quantity"), import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.I, { id: "pizza-qty", type: "number", min: 1, max: 50, value: W, onChange: (t) => I(Math.max(1, Math.min(50, Number(t.target.value) || 1))), className: "w-28" })), la && import_index_xEz64G17.R.createElement("p", { className: "text-sm text-slate-600 sm:pb-2" }, "Each pledge: ", la)), import_index_xEz64G17.R.createElement("div", { className: "space-y-2" }, import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.L, { htmlFor: "cf-notes" }, "Notes (optional)"), import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.T, { id: "cf-notes", placeholder: "Any notes for us", value: L, onChange: (t) => F(t.target.value), className: "min-h-[100px]" })), import_index_xEz64G17.R.createElement("div", { className: "space-y-2" }, import_index_xEz64G17.R.createElement("span", { className: "text-sm font-semibold text-slate-700" }, "Preferred reward setting"), import_index_xEz64G17.R.createElement("fieldset", { className: "grid gap-2 sm:grid-cols-2", role: "group", "aria-label": "Preferred reward setting" }, Ia.map((t) => import_index_xEz64G17.R.createElement("label", { key: t.value, className: (0, import_utils_BX5_YKFa.c)("flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors", Ae === t.value ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]" : "hover:border-[var(--color-accent)]") }, import_index_xEz64G17.R.createElement("input", { type: "radio", name: "rewardPreference", value: t.value, checked: Ae === t.value, onChange: (s) => ct(s.target.value), className: "h-4 w-4 border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]" }), import_index_xEz64G17.R.createElement("span", { className: "text-slate-700" }, t.label))))), import_index_xEz64G17.R.createElement("div", { className: "space-y-2" }, import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.L, { htmlFor: "cf-card-container" }, "Payment details"), import_index_xEz64G17.R.createElement("div", { id: "cf-card-container", ref: ft, className: (0, import_utils_BX5_YKFa.c)("border rounded-md p-4 min-h-[88px]", Ye ? "bg-white" : "border-dashed bg-slate-50 flex items-center"), "aria-label": "Card payment form" }, Ye ? import_index_xEz64G17.R.createElement(import_index_xEz64G17.R.Fragment, null, !ma && !yt && !qe && import_index_xEz64G17.R.createElement("p", { className: "text-sm text-gray-500" }, cn ? "Loading secure payment form\u2026" : "Preparing secure payment form\u2026"), (yt || qe) && import_index_xEz64G17.R.createElement("p", { className: "text-sm text-red-600" }, yt || qe)) : import_index_xEz64G17.R.createElement("p", { className: "text-sm text-slate-600" }, "No payment required for this contribution."))), N && !sa && import_index_xEz64G17.R.createElement("p", { className: "text-xs text-red-600" }, "Please enter a valid email."), w && !ia && import_index_xEz64G17.R.createElement("p", { className: "text-xs text-red-600" }, "Phone should have at least 10 digits."), import_index_xEz64G17.R.createElement(import_button_DFNsXnQp.B, { type: "submit", disabled: !C || u || Ye && (!ma || !!yt || !!qe) || !sa || !ia, className: "w-full text-lg h-12" }, u ? "Processing..." : Ye ? `Buy ${an}` : "Complete contribution"))), import_index_xEz64G17.R.createElement("div", { className: "space-y-4" }, import_index_xEz64G17.R.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4" }, import_index_xEz64G17.R.createElement("h3", { className: "text-lg font-semibold text-slate-900" }, "How it works"), import_index_xEz64G17.R.createElement("ol", { className: "space-y-3 text-sm text-slate-700" }, import_index_xEz64G17.R.createElement("li", null, import_index_xEz64G17.R.createElement("span", { className: "font-semibold text-slate-900" }, "1."), " ", "Order a pizza, or 5 pizzas, or 10 pizzas, or 100 pizzas. Add on a pie or 2."), import_index_xEz64G17.R.createElement("li", { className: "space-y-2" }, import_index_xEz64G17.R.createElement("div", null, import_index_xEz64G17.R.createElement("span", { className: "font-semibold text-slate-900" }, "2."), " ", "Select your pickup style."), import_index_xEz64G17.R.createElement("div", { className: "pl-5 space-y-2" }, import_index_xEz64G17.R.createElement("p", null, import_index_xEz64G17.R.createElement("span", { className: "font-semibold text-slate-900" }, "2a."), " ", "Look at the list of pickup events. Each event will have its own menu. You can claim your pizzas at one of these events, or\u2026"), import_index_xEz64G17.R.createElement("p", null, import_index_xEz64G17.R.createElement("span", { className: "font-semibold text-slate-900" }, "2b."), " ", "You can have the pizzas delivered to your home. You can even have the pizzas made at your home or office: the chef, the oven, the dough, the whole thing. Minimum 5 pizzas for delivery and 15 for in-home parties."))), import_index_xEz64G17.R.createElement("li", null, import_index_xEz64G17.R.createElement("span", { className: "font-semibold text-slate-900" }, "3."), " ", "Tell your friends about Local Pizza, the pizza made entirely from Midwestern produced ingredients."))), import_index_xEz64G17.R.createElement(Qt, { className: "border-0 bg-slate-900 text-white shadow-xl" }, import_index_xEz64G17.R.createElement(Xt, { className: "px-5 py-4 space-y-1 border-none" }, import_index_xEz64G17.R.createElement(Zt, { className: "text-lg font-semibold tracking-wide uppercase text-amber-300" }, "Follow along as we raise"), import_index_xEz64G17.R.createElement(Ya, { className: "text-sm text-slate-200" }, "Get pizza updates, milestones, and openings first.")), import_index_xEz64G17.R.createElement(ea, { className: "px-5 py-4" }, import_index_xEz64G17.R.createElement("form", { className: "space-y-4", onSubmit: rn }, import_index_xEz64G17.R.createElement("div", { className: "space-y-2" }, import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.L, { htmlFor: "cf-subscribe-email", className: "text-sm font-medium text-white" }, "Email address"), import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.I, { id: "cf-subscribe-email", type: "email", autoComplete: "email", placeholder: "you@example.com", value: Ke, onChange: (t) => it(t.target.value), disabled: ue === "loading", className: "border-slate-700 bg-slate-800 text-white placeholder:text-slate-400" })), Oe && import_index_xEz64G17.R.createElement("p", { className: ue === "success" ? "text-sm text-emerald-300" : "text-sm text-red-300" }, Oe), import_index_xEz64G17.R.createElement(import_button_DFNsXnQp.B, { type: "submit", className: "w-full bg-amber-400 text-slate-900 hover:bg-amber-300", disabled: ue === "loading" }, ue === "loading" ? "Subscribing\u2026" : "Subscribe")))), false, mt.length > 0 && import_index_xEz64G17.R.createElement(import_SectionHeader_CIhDF8f0.S, { overline: "Rewards", title: "Ways to eat", className: "pt-2" }), mt.map((t) => {
    const s = Ge(t);
    return import_index_xEz64G17.R.createElement(Xa, { key: s || (t == null ? void 0 : t.title) || (t == null ? void 0 : t.amount) || Math.random(), tier: t, busy: u, onSelect: nn, selected: s === tn });
  })))), import_index_xEz64G17.R.createElement("section", { className: "rounded-3xl border border-slate-200 bg-white p-6 md:p-10 shadow-sm" }, import_index_xEz64G17.R.createElement("div", { className: "mx-auto flex max-w-4xl flex-col gap-10 md:flex-row" }, import_index_xEz64G17.R.createElement("div", { className: "md:w-1/2 space-y-6" }, import_index_xEz64G17.R.createElement(import_SectionHeader_CIhDF8f0.S, { overline: "Share the pizza love", title: "Pizza feedback" }), import_index_xEz64G17.R.createElement("p", { className: "text-base text-slate-600" }, "Leave a quick note about what you enjoy most. Your kind words help us keep the pizza party going for our neighbors."), import_index_xEz64G17.R.createElement("form", { className: "space-y-4", onSubmit: sn }, import_index_xEz64G17.R.createElement("div", { className: "space-y-2" }, import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.L, { htmlFor: "pizza-feedback-rating" }, "How was your pizza?"), import_index_xEz64G17.R.createElement("select", { id: "pizza-feedback-rating", value: Ve, onChange: (t) => {
    lt(Number(t.target.value)), S !== "idle" && (v("idle"), ye(""));
  }, className: "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400" }, [5, 4, 3, 2, 1].map((t) => import_index_xEz64G17.R.createElement("option", { key: t, value: t }, `${t} / 5`))), import_index_xEz64G17.R.createElement("p", { className: "text-xs text-slate-500" }, "5 = legendary pizza party, 1 = needs another try.")), import_index_xEz64G17.R.createElement("div", { className: "space-y-2" }, import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.L, { htmlFor: "pizza-feedback-message" }, "What made your pizza special?"), import_index_xEz64G17.R.createElement(import_label_f3ShiFsw.T, { id: "pizza-feedback-message", value: Qe, onChange: (t) => {
    Se(t.target.value), S !== "idle" && (v("idle"), ye(""));
  }, placeholder: "The wood-fired char and fresh basil blew me away!", className: "min-h-[120px]" })), Xe && import_index_xEz64G17.R.createElement("p", { className: S === "error" ? "text-sm text-red-600" : "text-sm text-emerald-600", "aria-live": "polite" }, Xe), import_index_xEz64G17.R.createElement(import_button_DFNsXnQp.B, { type: "submit", className: "w-full sm:w-auto", disabled: S === "loading" }, S === "loading" ? "Saving..." : "Share feedback"))), import_index_xEz64G17.R.createElement("div", { className: "md:w-1/2 space-y-4" }, import_index_xEz64G17.R.createElement("h3", { className: "text-lg font-semibold text-slate-900" }, "Recent happy pizza thoughts"), Ze ? import_index_xEz64G17.R.createElement("p", { className: "text-sm text-slate-500" }, "Loading pizza love\u2026") : M.length > 0 ? import_index_xEz64G17.R.createElement("ul", { className: "space-y-4" }, M.map((t) => import_index_xEz64G17.R.createElement("li", { key: t.id, className: "rounded-2xl border border-amber-100 bg-amber-50/70 p-4 shadow-sm" }, import_index_xEz64G17.R.createElement("p", { className: "text-sm text-amber-900" }, "\u201C", t.comment, "\u201D"), import_index_xEz64G17.R.createElement("p", { className: "mt-2 text-xs font-semibold uppercase tracking-wide text-amber-700" }, Number.isFinite(t.rating) ? `Rating: ${"\u2B50\uFE0F".repeat(Math.max(1, Math.min(5, t.rating)))} (${t.rating}/5)` : "Rating: shared anonymously")))) : import_index_xEz64G17.R.createElement("p", { className: "text-sm text-slate-500" }, xt ? "We couldn\u2019t load recent pizza notes. Share yours to kick things off!" : "No pizza notes yet\u2014be the first to share your experience!"), xt && import_index_xEz64G17.R.createElement("p", { className: "text-xs text-red-600" }, xt))))), me && import_index_xEz64G17.R.createElement("div", { className: "fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" }, import_index_xEz64G17.R.createElement("div", { className: "bg-white rounded-lg shadow-xl max-w-lg w-full p-5 relative" }, import_index_xEz64G17.R.createElement("button", { type: "button", className: "absolute right-3 top-3 text-sm underline", onClick: () => ra(null) }, "Close"), import_index_xEz64G17.R.createElement("h4", { className: "text-xl font-bold mb-1" }, me.location), import_index_xEz64G17.R.createElement("p", { className: "text-sm text-gray-600 mb-3" }, fn(me)), me.description && import_index_xEz64G17.R.createElement("div", { className: "prose max-w-none" }, import_index_xEz64G17.R.createElement(import_portableTextComponents_yG0g42yZ.P, { value: me.description, components: portableComponents })), me.ticketsUrl && import_index_xEz64G17.R.createElement("a", { className: "btn btn-primary mt-4 inline-block", href: me.ticketsUrl, target: "_blank", rel: "noreferrer" }, "Get tickets"))));
};
