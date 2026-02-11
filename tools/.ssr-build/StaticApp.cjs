var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/lib/ReactPropTypesSecret.js
var require_ReactPropTypesSecret = __commonJS({
  "node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/lib/ReactPropTypesSecret.js"(exports2, module2) {
    "use strict";
    var ReactPropTypesSecret = "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";
    module2.exports = ReactPropTypesSecret;
  }
});

// node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/factoryWithThrowingShims.js
var require_factoryWithThrowingShims = __commonJS({
  "node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/factoryWithThrowingShims.js"(exports2, module2) {
    "use strict";
    var ReactPropTypesSecret = require_ReactPropTypesSecret();
    function emptyFunction() {
    }
    function emptyFunctionWithReset() {
    }
    emptyFunctionWithReset.resetWarningCache = emptyFunction;
    module2.exports = function() {
      function shim(props, propName, componentName, location, propFullName, secret) {
        if (secret === ReactPropTypesSecret) {
          return;
        }
        var err = new Error(
          "Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types"
        );
        err.name = "Invariant Violation";
        throw err;
      }
      ;
      shim.isRequired = shim;
      function getShim() {
        return shim;
      }
      ;
      var ReactPropTypes = {
        array: shim,
        bigint: shim,
        bool: shim,
        func: shim,
        number: shim,
        object: shim,
        string: shim,
        symbol: shim,
        any: shim,
        arrayOf: getShim,
        element: shim,
        elementType: shim,
        instanceOf: getShim,
        node: shim,
        objectOf: getShim,
        oneOf: getShim,
        oneOfType: getShim,
        shape: getShim,
        exact: getShim,
        checkPropTypes: emptyFunctionWithReset,
        resetWarningCache: emptyFunction
      };
      ReactPropTypes.PropTypes = ReactPropTypes;
      return ReactPropTypes;
    };
  }
});

// node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/index.js
var require_prop_types = __commonJS({
  "node_modules/.pnpm/prop-types@15.8.1/node_modules/prop-types/index.js"(exports2, module2) {
    if (false) {
      ReactIs = null;
      throwOnDirectAccess = true;
      module2.exports = null(ReactIs.isElement, throwOnDirectAccess);
    } else {
      module2.exports = require_factoryWithThrowingShims()();
    }
    var ReactIs;
    var throwOnDirectAccess;
  }
});

// node_modules/.pnpm/react-fast-compare@3.2.2/node_modules/react-fast-compare/index.js
var require_react_fast_compare = __commonJS({
  "node_modules/.pnpm/react-fast-compare@3.2.2/node_modules/react-fast-compare/index.js"(exports2, module2) {
    var hasElementType = typeof Element !== "undefined";
    var hasMap = typeof Map === "function";
    var hasSet = typeof Set === "function";
    var hasArrayBuffer = typeof ArrayBuffer === "function" && !!ArrayBuffer.isView;
    function equal(a, b) {
      if (a === b) return true;
      if (a && b && typeof a == "object" && typeof b == "object") {
        if (a.constructor !== b.constructor) return false;
        var length, i, keys;
        if (Array.isArray(a)) {
          length = a.length;
          if (length != b.length) return false;
          for (i = length; i-- !== 0; )
            if (!equal(a[i], b[i])) return false;
          return true;
        }
        var it;
        if (hasMap && a instanceof Map && b instanceof Map) {
          if (a.size !== b.size) return false;
          it = a.entries();
          while (!(i = it.next()).done)
            if (!b.has(i.value[0])) return false;
          it = a.entries();
          while (!(i = it.next()).done)
            if (!equal(i.value[1], b.get(i.value[0]))) return false;
          return true;
        }
        if (hasSet && a instanceof Set && b instanceof Set) {
          if (a.size !== b.size) return false;
          it = a.entries();
          while (!(i = it.next()).done)
            if (!b.has(i.value[0])) return false;
          return true;
        }
        if (hasArrayBuffer && ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
          length = a.length;
          if (length != b.length) return false;
          for (i = length; i-- !== 0; )
            if (a[i] !== b[i]) return false;
          return true;
        }
        if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
        if (a.valueOf !== Object.prototype.valueOf && typeof a.valueOf === "function" && typeof b.valueOf === "function") return a.valueOf() === b.valueOf();
        if (a.toString !== Object.prototype.toString && typeof a.toString === "function" && typeof b.toString === "function") return a.toString() === b.toString();
        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length) return false;
        for (i = length; i-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
        if (hasElementType && a instanceof Element) return false;
        for (i = length; i-- !== 0; ) {
          if ((keys[i] === "_owner" || keys[i] === "__v" || keys[i] === "__o") && a.$$typeof) {
            continue;
          }
          if (!equal(a[keys[i]], b[keys[i]])) return false;
        }
        return true;
      }
      return a !== a && b !== b;
    }
    module2.exports = function isEqual(a, b) {
      try {
        return equal(a, b);
      } catch (error) {
        if ((error.message || "").match(/stack|recursion/i)) {
          console.warn("react-fast-compare cannot handle circular refs");
          return false;
        }
        throw error;
      }
    };
  }
});

// node_modules/.pnpm/invariant@2.2.4/node_modules/invariant/invariant.js
var require_invariant = __commonJS({
  "node_modules/.pnpm/invariant@2.2.4/node_modules/invariant/invariant.js"(exports2, module2) {
    "use strict";
    var NODE_ENV = "production";
    var invariant = function(condition, format, a, b, c, d, e, f) {
      if (NODE_ENV !== "production") {
        if (format === void 0) {
          throw new Error("invariant requires an error message argument");
        }
      }
      if (!condition) {
        var error;
        if (format === void 0) {
          error = new Error(
            "Minified exception occurred; use the non-minified dev environment for the full error message and additional helpful warnings."
          );
        } else {
          var args = [a, b, c, d, e, f];
          var argIndex = 0;
          error = new Error(
            format.replace(/%s/g, function() {
              return args[argIndex++];
            })
          );
          error.name = "Invariant Violation";
        }
        error.framesToPop = 1;
        throw error;
      }
    };
    module2.exports = invariant;
  }
});

// node_modules/.pnpm/shallowequal@1.1.0/node_modules/shallowequal/index.js
var require_shallowequal = __commonJS({
  "node_modules/.pnpm/shallowequal@1.1.0/node_modules/shallowequal/index.js"(exports2, module2) {
    module2.exports = function shallowEqual(objA, objB, compare, compareContext) {
      var ret = compare ? compare.call(compareContext, objA, objB) : void 0;
      if (ret !== void 0) {
        return !!ret;
      }
      if (objA === objB) {
        return true;
      }
      if (typeof objA !== "object" || !objA || typeof objB !== "object" || !objB) {
        return false;
      }
      var keysA = Object.keys(objA);
      var keysB = Object.keys(objB);
      if (keysA.length !== keysB.length) {
        return false;
      }
      var bHasOwnProperty = Object.prototype.hasOwnProperty.bind(objB);
      for (var idx = 0; idx < keysA.length; idx++) {
        var key = keysA[idx];
        if (!bHasOwnProperty(key)) {
          return false;
        }
        var valueA = objA[key];
        var valueB = objB[key];
        ret = compare ? compare.call(compareContext, valueA, valueB, key) : void 0;
        if (ret === false || ret === void 0 && valueA !== valueB) {
          return false;
        }
      }
      return true;
    };
  }
});

// node_modules/.pnpm/react-helmet-async@1.3.0_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/react-helmet-async/lib/index.js
var require_lib = __commonJS({
  "node_modules/.pnpm/react-helmet-async@1.3.0_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/react-helmet-async/lib/index.js"(exports2) {
    var t = require("react");
    var e = require_prop_types();
    var r = require_react_fast_compare();
    var n = require_invariant();
    var i = require_shallowequal();
    function a(t2) {
      return t2 && "object" == typeof t2 && "default" in t2 ? t2 : { default: t2 };
    }
    var o = /* @__PURE__ */ a(t);
    var u = /* @__PURE__ */ a(e);
    var s = /* @__PURE__ */ a(r);
    var c = /* @__PURE__ */ a(n);
    var l = /* @__PURE__ */ a(i);
    function f() {
      return f = Object.assign || function(t2) {
        for (var e2 = 1; e2 < arguments.length; e2++) {
          var r2 = arguments[e2];
          for (var n2 in r2) Object.prototype.hasOwnProperty.call(r2, n2) && (t2[n2] = r2[n2]);
        }
        return t2;
      }, f.apply(this, arguments);
    }
    function d(t2, e2) {
      t2.prototype = Object.create(e2.prototype), t2.prototype.constructor = t2, p(t2, e2);
    }
    function p(t2, e2) {
      return p = Object.setPrototypeOf || function(t3, e3) {
        return t3.__proto__ = e3, t3;
      }, p(t2, e2);
    }
    function h(t2, e2) {
      if (null == t2) return {};
      var r2, n2, i2 = {}, a2 = Object.keys(t2);
      for (n2 = 0; n2 < a2.length; n2++) e2.indexOf(r2 = a2[n2]) >= 0 || (i2[r2] = t2[r2]);
      return i2;
    }
    var m = { BASE: "base", BODY: "body", HEAD: "head", HTML: "html", LINK: "link", META: "meta", NOSCRIPT: "noscript", SCRIPT: "script", STYLE: "style", TITLE: "title", FRAGMENT: "Symbol(react.fragment)" };
    var y = { rel: ["amphtml", "canonical", "alternate"] };
    var T = { type: ["application/ld+json"] };
    var g = { charset: "", name: ["robots", "description"], property: ["og:type", "og:title", "og:url", "og:image", "og:image:alt", "og:description", "twitter:url", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt", "twitter:card", "twitter:site"] };
    var b = Object.keys(m).map(function(t2) {
      return m[t2];
    });
    var v = { accesskey: "accessKey", charset: "charSet", class: "className", contenteditable: "contentEditable", contextmenu: "contextMenu", "http-equiv": "httpEquiv", itemprop: "itemProp", tabindex: "tabIndex" };
    var A = Object.keys(v).reduce(function(t2, e2) {
      return t2[v[e2]] = e2, t2;
    }, {});
    var C = function(t2, e2) {
      for (var r2 = t2.length - 1; r2 >= 0; r2 -= 1) {
        var n2 = t2[r2];
        if (Object.prototype.hasOwnProperty.call(n2, e2)) return n2[e2];
      }
      return null;
    };
    var O = function(t2) {
      var e2 = C(t2, m.TITLE), r2 = C(t2, "titleTemplate");
      if (Array.isArray(e2) && (e2 = e2.join("")), r2 && e2) return r2.replace(/%s/g, function() {
        return e2;
      });
      var n2 = C(t2, "defaultTitle");
      return e2 || n2 || void 0;
    };
    var S = function(t2) {
      return C(t2, "onChangeClientState") || function() {
      };
    };
    var E = function(t2, e2) {
      return e2.filter(function(e3) {
        return void 0 !== e3[t2];
      }).map(function(e3) {
        return e3[t2];
      }).reduce(function(t3, e3) {
        return f({}, t3, e3);
      }, {});
    };
    var I = function(t2, e2) {
      return e2.filter(function(t3) {
        return void 0 !== t3[m.BASE];
      }).map(function(t3) {
        return t3[m.BASE];
      }).reverse().reduce(function(e3, r2) {
        if (!e3.length) for (var n2 = Object.keys(r2), i2 = 0; i2 < n2.length; i2 += 1) {
          var a2 = n2[i2].toLowerCase();
          if (-1 !== t2.indexOf(a2) && r2[a2]) return e3.concat(r2);
        }
        return e3;
      }, []);
    };
    var x = function(t2, e2, r2) {
      var n2 = {};
      return r2.filter(function(e3) {
        return !!Array.isArray(e3[t2]) || (void 0 !== e3[t2] && console && "function" == typeof console.warn && console.warn("Helmet: " + t2 + ' should be of type "Array". Instead found type "' + typeof e3[t2] + '"'), false);
      }).map(function(e3) {
        return e3[t2];
      }).reverse().reduce(function(t3, r3) {
        var i2 = {};
        r3.filter(function(t4) {
          for (var r4, a3 = Object.keys(t4), o3 = 0; o3 < a3.length; o3 += 1) {
            var u3 = a3[o3], s3 = u3.toLowerCase();
            -1 === e2.indexOf(s3) || "rel" === r4 && "canonical" === t4[r4].toLowerCase() || "rel" === s3 && "stylesheet" === t4[s3].toLowerCase() || (r4 = s3), -1 === e2.indexOf(u3) || "innerHTML" !== u3 && "cssText" !== u3 && "itemprop" !== u3 || (r4 = u3);
          }
          if (!r4 || !t4[r4]) return false;
          var c2 = t4[r4].toLowerCase();
          return n2[r4] || (n2[r4] = {}), i2[r4] || (i2[r4] = {}), !n2[r4][c2] && (i2[r4][c2] = true, true);
        }).reverse().forEach(function(e3) {
          return t3.push(e3);
        });
        for (var a2 = Object.keys(i2), o2 = 0; o2 < a2.length; o2 += 1) {
          var u2 = a2[o2], s2 = f({}, n2[u2], i2[u2]);
          n2[u2] = s2;
        }
        return t3;
      }, []).reverse();
    };
    var P = function(t2, e2) {
      if (Array.isArray(t2) && t2.length) {
        for (var r2 = 0; r2 < t2.length; r2 += 1) if (t2[r2][e2]) return true;
      }
      return false;
    };
    var w = function(t2) {
      return Array.isArray(t2) ? t2.join("") : t2;
    };
    var L = function(t2, e2) {
      return Array.isArray(t2) ? t2.reduce(function(t3, r2) {
        return function(t4, e3) {
          for (var r3 = Object.keys(t4), n2 = 0; n2 < r3.length; n2 += 1) if (e3[r3[n2]] && e3[r3[n2]].includes(t4[r3[n2]])) return true;
          return false;
        }(r2, e2) ? t3.priority.push(r2) : t3.default.push(r2), t3;
      }, { priority: [], default: [] }) : { default: t2 };
    };
    var j = function(t2, e2) {
      var r2;
      return f({}, t2, ((r2 = {})[e2] = void 0, r2));
    };
    var M = [m.NOSCRIPT, m.SCRIPT, m.STYLE];
    var k = function(t2, e2) {
      return void 0 === e2 && (e2 = true), false === e2 ? String(t2) : String(t2).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
    };
    var H = function(t2) {
      return Object.keys(t2).reduce(function(e2, r2) {
        var n2 = void 0 !== t2[r2] ? r2 + '="' + t2[r2] + '"' : "" + r2;
        return e2 ? e2 + " " + n2 : n2;
      }, "");
    };
    var N = function(t2, e2) {
      return void 0 === e2 && (e2 = {}), Object.keys(t2).reduce(function(e3, r2) {
        return e3[v[r2] || r2] = t2[r2], e3;
      }, e2);
    };
    var D = function(t2, e2) {
      return e2.map(function(e3, r2) {
        var n2, i2 = ((n2 = { key: r2 })["data-rh"] = true, n2);
        return Object.keys(e3).forEach(function(t3) {
          var r3 = v[t3] || t3;
          "innerHTML" === r3 || "cssText" === r3 ? i2.dangerouslySetInnerHTML = { __html: e3.innerHTML || e3.cssText } : i2[r3] = e3[t3];
        }), o.default.createElement(t2, i2);
      });
    };
    var R = function(t2, e2, r2) {
      switch (t2) {
        case m.TITLE:
          return { toComponent: function() {
            return r3 = e2.titleAttributes, (n2 = { key: t3 = e2.title })["data-rh"] = true, i2 = N(r3, n2), [o.default.createElement(m.TITLE, i2, t3)];
            var t3, r3, n2, i2;
          }, toString: function() {
            return function(t3, e3, r3, n2) {
              var i2 = H(r3), a2 = w(e3);
              return i2 ? "<" + t3 + ' data-rh="true" ' + i2 + ">" + k(a2, n2) + "</" + t3 + ">" : "<" + t3 + ' data-rh="true">' + k(a2, n2) + "</" + t3 + ">";
            }(t2, e2.title, e2.titleAttributes, r2);
          } };
        case "bodyAttributes":
        case "htmlAttributes":
          return { toComponent: function() {
            return N(e2);
          }, toString: function() {
            return H(e2);
          } };
        default:
          return { toComponent: function() {
            return D(t2, e2);
          }, toString: function() {
            return function(t3, e3, r3) {
              return e3.reduce(function(e4, n2) {
                var i2 = Object.keys(n2).filter(function(t4) {
                  return !("innerHTML" === t4 || "cssText" === t4);
                }).reduce(function(t4, e5) {
                  var i3 = void 0 === n2[e5] ? e5 : e5 + '="' + k(n2[e5], r3) + '"';
                  return t4 ? t4 + " " + i3 : i3;
                }, ""), a2 = n2.innerHTML || n2.cssText || "", o2 = -1 === M.indexOf(t3);
                return e4 + "<" + t3 + ' data-rh="true" ' + i2 + (o2 ? "/>" : ">" + a2 + "</" + t3 + ">");
              }, "");
            }(t2, e2, r2);
          } };
      }
    };
    var q = function(t2) {
      var e2 = t2.baseTag, r2 = t2.bodyAttributes, n2 = t2.encode, i2 = t2.htmlAttributes, a2 = t2.noscriptTags, o2 = t2.styleTags, u2 = t2.title, s2 = void 0 === u2 ? "" : u2, c2 = t2.titleAttributes, l2 = t2.linkTags, f2 = t2.metaTags, d2 = t2.scriptTags, p2 = { toComponent: function() {
      }, toString: function() {
        return "";
      } };
      if (t2.prioritizeSeoTags) {
        var h2 = function(t3) {
          var e3 = t3.linkTags, r3 = t3.scriptTags, n3 = t3.encode, i3 = L(t3.metaTags, g), a3 = L(e3, y), o3 = L(r3, T);
          return { priorityMethods: { toComponent: function() {
            return [].concat(D(m.META, i3.priority), D(m.LINK, a3.priority), D(m.SCRIPT, o3.priority));
          }, toString: function() {
            return R(m.META, i3.priority, n3) + " " + R(m.LINK, a3.priority, n3) + " " + R(m.SCRIPT, o3.priority, n3);
          } }, metaTags: i3.default, linkTags: a3.default, scriptTags: o3.default };
        }(t2);
        p2 = h2.priorityMethods, l2 = h2.linkTags, f2 = h2.metaTags, d2 = h2.scriptTags;
      }
      return { priority: p2, base: R(m.BASE, e2, n2), bodyAttributes: R("bodyAttributes", r2, n2), htmlAttributes: R("htmlAttributes", i2, n2), link: R(m.LINK, l2, n2), meta: R(m.META, f2, n2), noscript: R(m.NOSCRIPT, a2, n2), script: R(m.SCRIPT, d2, n2), style: R(m.STYLE, o2, n2), title: R(m.TITLE, { title: s2, titleAttributes: c2 }, n2) };
    };
    var U = [];
    var Y = function(t2, e2) {
      var r2 = this;
      void 0 === e2 && (e2 = "undefined" != typeof document), this.instances = [], this.value = { setHelmet: function(t3) {
        r2.context.helmet = t3;
      }, helmetInstances: { get: function() {
        return r2.canUseDOM ? U : r2.instances;
      }, add: function(t3) {
        (r2.canUseDOM ? U : r2.instances).push(t3);
      }, remove: function(t3) {
        var e3 = (r2.canUseDOM ? U : r2.instances).indexOf(t3);
        (r2.canUseDOM ? U : r2.instances).splice(e3, 1);
      } } }, this.context = t2, this.canUseDOM = e2, e2 || (t2.helmet = q({ baseTag: [], bodyAttributes: {}, encodeSpecialCharacters: true, htmlAttributes: {}, linkTags: [], metaTags: [], noscriptTags: [], scriptTags: [], styleTags: [], title: "", titleAttributes: {} }));
    };
    var B = o.default.createContext({});
    var K = u.default.shape({ setHelmet: u.default.func, helmetInstances: u.default.shape({ get: u.default.func, add: u.default.func, remove: u.default.func }) });
    var _ = "undefined" != typeof document;
    var z = /* @__PURE__ */ function(t2) {
      function e2(r2) {
        var n2;
        return (n2 = t2.call(this, r2) || this).helmetData = new Y(n2.props.context, e2.canUseDOM), n2;
      }
      return d(e2, t2), e2.prototype.render = function() {
        return o.default.createElement(B.Provider, { value: this.helmetData.value }, this.props.children);
      }, e2;
    }(t.Component);
    z.canUseDOM = _, z.propTypes = { context: u.default.shape({ helmet: u.default.shape() }), children: u.default.node.isRequired }, z.defaultProps = { context: {} }, z.displayName = "HelmetProvider";
    var F = function(t2, e2) {
      var r2, n2 = document.head || document.querySelector(m.HEAD), i2 = n2.querySelectorAll(t2 + "[data-rh]"), a2 = [].slice.call(i2), o2 = [];
      return e2 && e2.length && e2.forEach(function(e3) {
        var n3 = document.createElement(t2);
        for (var i3 in e3) Object.prototype.hasOwnProperty.call(e3, i3) && ("innerHTML" === i3 ? n3.innerHTML = e3.innerHTML : "cssText" === i3 ? n3.styleSheet ? n3.styleSheet.cssText = e3.cssText : n3.appendChild(document.createTextNode(e3.cssText)) : n3.setAttribute(i3, void 0 === e3[i3] ? "" : e3[i3]));
        n3.setAttribute("data-rh", "true"), a2.some(function(t3, e4) {
          return r2 = e4, n3.isEqualNode(t3);
        }) ? a2.splice(r2, 1) : o2.push(n3);
      }), a2.forEach(function(t3) {
        return t3.parentNode.removeChild(t3);
      }), o2.forEach(function(t3) {
        return n2.appendChild(t3);
      }), { oldTags: a2, newTags: o2 };
    };
    var G = function(t2, e2) {
      var r2 = document.getElementsByTagName(t2)[0];
      if (r2) {
        for (var n2 = r2.getAttribute("data-rh"), i2 = n2 ? n2.split(",") : [], a2 = [].concat(i2), o2 = Object.keys(e2), u2 = 0; u2 < o2.length; u2 += 1) {
          var s2 = o2[u2], c2 = e2[s2] || "";
          r2.getAttribute(s2) !== c2 && r2.setAttribute(s2, c2), -1 === i2.indexOf(s2) && i2.push(s2);
          var l2 = a2.indexOf(s2);
          -1 !== l2 && a2.splice(l2, 1);
        }
        for (var f2 = a2.length - 1; f2 >= 0; f2 -= 1) r2.removeAttribute(a2[f2]);
        i2.length === a2.length ? r2.removeAttribute("data-rh") : r2.getAttribute("data-rh") !== o2.join(",") && r2.setAttribute("data-rh", o2.join(","));
      }
    };
    var W = function(t2, e2) {
      var r2 = t2.baseTag, n2 = t2.htmlAttributes, i2 = t2.linkTags, a2 = t2.metaTags, o2 = t2.noscriptTags, u2 = t2.onChangeClientState, s2 = t2.scriptTags, c2 = t2.styleTags, l2 = t2.title, f2 = t2.titleAttributes;
      G(m.BODY, t2.bodyAttributes), G(m.HTML, n2), function(t3, e3) {
        void 0 !== t3 && document.title !== t3 && (document.title = w(t3)), G(m.TITLE, e3);
      }(l2, f2);
      var d2 = { baseTag: F(m.BASE, r2), linkTags: F(m.LINK, i2), metaTags: F(m.META, a2), noscriptTags: F(m.NOSCRIPT, o2), scriptTags: F(m.SCRIPT, s2), styleTags: F(m.STYLE, c2) }, p2 = {}, h2 = {};
      Object.keys(d2).forEach(function(t3) {
        var e3 = d2[t3], r3 = e3.newTags, n3 = e3.oldTags;
        r3.length && (p2[t3] = r3), n3.length && (h2[t3] = d2[t3].oldTags);
      }), e2 && e2(), u2(t2, p2, h2);
    };
    var J = null;
    var Q = /* @__PURE__ */ function(t2) {
      function e2() {
        for (var e3, r3 = arguments.length, n2 = new Array(r3), i2 = 0; i2 < r3; i2++) n2[i2] = arguments[i2];
        return (e3 = t2.call.apply(t2, [this].concat(n2)) || this).rendered = false, e3;
      }
      d(e2, t2);
      var r2 = e2.prototype;
      return r2.shouldComponentUpdate = function(t3) {
        return !l.default(t3, this.props);
      }, r2.componentDidUpdate = function() {
        this.emitChange();
      }, r2.componentWillUnmount = function() {
        this.props.context.helmetInstances.remove(this), this.emitChange();
      }, r2.emitChange = function() {
        var t3, e3, r3 = this.props.context, n2 = r3.setHelmet, i2 = null, a2 = (t3 = r3.helmetInstances.get().map(function(t4) {
          var e4 = f({}, t4.props);
          return delete e4.context, e4;
        }), { baseTag: I(["href"], t3), bodyAttributes: E("bodyAttributes", t3), defer: C(t3, "defer"), encode: C(t3, "encodeSpecialCharacters"), htmlAttributes: E("htmlAttributes", t3), linkTags: x(m.LINK, ["rel", "href"], t3), metaTags: x(m.META, ["name", "charset", "http-equiv", "property", "itemprop"], t3), noscriptTags: x(m.NOSCRIPT, ["innerHTML"], t3), onChangeClientState: S(t3), scriptTags: x(m.SCRIPT, ["src", "innerHTML"], t3), styleTags: x(m.STYLE, ["cssText"], t3), title: O(t3), titleAttributes: E("titleAttributes", t3), prioritizeSeoTags: P(t3, "prioritizeSeoTags") });
        z.canUseDOM ? (e3 = a2, J && cancelAnimationFrame(J), e3.defer ? J = requestAnimationFrame(function() {
          W(e3, function() {
            J = null;
          });
        }) : (W(e3), J = null)) : q && (i2 = q(a2)), n2(i2);
      }, r2.init = function() {
        this.rendered || (this.rendered = true, this.props.context.helmetInstances.add(this), this.emitChange());
      }, r2.render = function() {
        return this.init(), null;
      }, e2;
    }(t.Component);
    Q.propTypes = { context: K.isRequired }, Q.displayName = "HelmetDispatcher";
    var V = ["children"];
    var X2 = ["children"];
    var Z = /* @__PURE__ */ function(t2) {
      function e2() {
        return t2.apply(this, arguments) || this;
      }
      d(e2, t2);
      var r2 = e2.prototype;
      return r2.shouldComponentUpdate = function(t3) {
        return !s.default(j(this.props, "helmetData"), j(t3, "helmetData"));
      }, r2.mapNestedChildrenToProps = function(t3, e3) {
        if (!e3) return null;
        switch (t3.type) {
          case m.SCRIPT:
          case m.NOSCRIPT:
            return { innerHTML: e3 };
          case m.STYLE:
            return { cssText: e3 };
          default:
            throw new Error("<" + t3.type + " /> elements are self-closing and can not contain children. Refer to our API for more information.");
        }
      }, r2.flattenArrayTypeChildren = function(t3) {
        var e3, r3 = t3.child, n2 = t3.arrayTypeChildren;
        return f({}, n2, ((e3 = {})[r3.type] = [].concat(n2[r3.type] || [], [f({}, t3.newChildProps, this.mapNestedChildrenToProps(r3, t3.nestedChildren))]), e3));
      }, r2.mapObjectTypeChildren = function(t3) {
        var e3, r3, n2 = t3.child, i2 = t3.newProps, a2 = t3.newChildProps, o2 = t3.nestedChildren;
        switch (n2.type) {
          case m.TITLE:
            return f({}, i2, ((e3 = {})[n2.type] = o2, e3.titleAttributes = f({}, a2), e3));
          case m.BODY:
            return f({}, i2, { bodyAttributes: f({}, a2) });
          case m.HTML:
            return f({}, i2, { htmlAttributes: f({}, a2) });
          default:
            return f({}, i2, ((r3 = {})[n2.type] = f({}, a2), r3));
        }
      }, r2.mapArrayTypeChildrenToProps = function(t3, e3) {
        var r3 = f({}, e3);
        return Object.keys(t3).forEach(function(e4) {
          var n2;
          r3 = f({}, r3, ((n2 = {})[e4] = t3[e4], n2));
        }), r3;
      }, r2.warnOnInvalidChildren = function(t3, e3) {
        return c.default(b.some(function(e4) {
          return t3.type === e4;
        }), "function" == typeof t3.type ? "You may be attempting to nest <Helmet> components within each other, which is not allowed. Refer to our API for more information." : "Only elements types " + b.join(", ") + " are allowed. Helmet does not support rendering <" + t3.type + "> elements. Refer to our API for more information."), c.default(!e3 || "string" == typeof e3 || Array.isArray(e3) && !e3.some(function(t4) {
          return "string" != typeof t4;
        }), "Helmet expects a string as a child of <" + t3.type + ">. Did you forget to wrap your children in braces? ( <" + t3.type + ">{``}</" + t3.type + "> ) Refer to our API for more information."), true;
      }, r2.mapChildrenToProps = function(t3, e3) {
        var r3 = this, n2 = {};
        return o.default.Children.forEach(t3, function(t4) {
          if (t4 && t4.props) {
            var i2 = t4.props, a2 = i2.children, o2 = h(i2, V), u2 = Object.keys(o2).reduce(function(t5, e4) {
              return t5[A[e4] || e4] = o2[e4], t5;
            }, {}), s2 = t4.type;
            switch ("symbol" == typeof s2 ? s2 = s2.toString() : r3.warnOnInvalidChildren(t4, a2), s2) {
              case m.FRAGMENT:
                e3 = r3.mapChildrenToProps(a2, e3);
                break;
              case m.LINK:
              case m.META:
              case m.NOSCRIPT:
              case m.SCRIPT:
              case m.STYLE:
                n2 = r3.flattenArrayTypeChildren({ child: t4, arrayTypeChildren: n2, newChildProps: u2, nestedChildren: a2 });
                break;
              default:
                e3 = r3.mapObjectTypeChildren({ child: t4, newProps: e3, newChildProps: u2, nestedChildren: a2 });
            }
          }
        }), this.mapArrayTypeChildrenToProps(n2, e3);
      }, r2.render = function() {
        var t3 = this.props, e3 = t3.children, r3 = h(t3, X2), n2 = f({}, r3), i2 = r3.helmetData;
        return e3 && (n2 = this.mapChildrenToProps(e3, n2)), !i2 || i2 instanceof Y || (i2 = new Y(i2.context, i2.instances)), i2 ? /* @__PURE__ */ o.default.createElement(Q, f({}, n2, { context: i2.value, helmetData: void 0 })) : /* @__PURE__ */ o.default.createElement(B.Consumer, null, function(t4) {
          return o.default.createElement(Q, f({}, n2, { context: t4 }));
        });
      }, e2;
    }(t.Component);
    Z.propTypes = { base: u.default.object, bodyAttributes: u.default.object, children: u.default.oneOfType([u.default.arrayOf(u.default.node), u.default.node]), defaultTitle: u.default.string, defer: u.default.bool, encodeSpecialCharacters: u.default.bool, htmlAttributes: u.default.object, link: u.default.arrayOf(u.default.object), meta: u.default.arrayOf(u.default.object), noscript: u.default.arrayOf(u.default.object), onChangeClientState: u.default.func, script: u.default.arrayOf(u.default.object), style: u.default.arrayOf(u.default.object), title: u.default.string, titleAttributes: u.default.object, titleTemplate: u.default.string, prioritizeSeoTags: u.default.bool, helmetData: u.default.object }, Z.defaultProps = { defer: true, encodeSpecialCharacters: true, prioritizeSeoTags: false }, Z.displayName = "Helmet", exports2.Helmet = Z, exports2.HelmetData = Y, exports2.HelmetProvider = z;
  }
});

// node_modules/.pnpm/@dnd-kit+utilities@3.2.2_react@18.2.0/node_modules/@dnd-kit/utilities/dist/utilities.cjs.production.min.js
var require_utilities_cjs_production_min = __commonJS({
  "node_modules/.pnpm/@dnd-kit+utilities@3.2.2_react@18.2.0/node_modules/@dnd-kit/utilities/dist/utilities.cjs.production.min.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var e = require("react");
    var t = "undefined" != typeof window && void 0 !== window.document && void 0 !== window.document.createElement;
    function n(e2) {
      const t2 = Object.prototype.toString.call(e2);
      return "[object Window]" === t2 || "[object global]" === t2;
    }
    function r(e2) {
      return "nodeType" in e2;
    }
    function o(e2) {
      var t2, o2;
      return e2 ? n(e2) ? e2 : r(e2) && null != (t2 = null == (o2 = e2.ownerDocument) ? void 0 : o2.defaultView) ? t2 : window : window;
    }
    function u(e2) {
      const { Document: t2 } = o(e2);
      return e2 instanceof t2;
    }
    function c(e2) {
      return !n(e2) && e2 instanceof o(e2).HTMLElement;
    }
    function s(e2) {
      return e2 instanceof o(e2).SVGElement;
    }
    var i = t ? e.useLayoutEffect : e.useEffect;
    function a(t2) {
      const n2 = e.useRef(t2);
      return i(() => {
        n2.current = t2;
      }), e.useCallback(function() {
        for (var e2 = arguments.length, t3 = new Array(e2), r2 = 0; r2 < e2; r2++) t3[r2] = arguments[r2];
        return null == n2.current ? void 0 : n2.current(...t3);
      }, []);
    }
    var l = {};
    function f(e2) {
      return function(t2) {
        for (var n2 = arguments.length, r2 = new Array(n2 > 1 ? n2 - 1 : 0), o2 = 1; o2 < n2; o2++) r2[o2 - 1] = arguments[o2];
        return r2.reduce((t3, n3) => {
          const r3 = Object.entries(n3);
          for (const [n4, o3] of r3) {
            const r4 = t3[n4];
            null != r4 && (t3[n4] = r4 + e2 * o3);
          }
          return t3;
        }, { ...t2 });
      };
    }
    var d = f(1);
    var p = f(-1);
    function x(e2) {
      return "clientX" in e2 && "clientY" in e2;
    }
    function m(e2) {
      if (!e2) return false;
      const { TouchEvent: t2 } = o(e2.target);
      return t2 && e2 instanceof t2;
    }
    var h = Object.freeze({ Translate: { toString(e2) {
      if (!e2) return;
      const { x: t2, y: n2 } = e2;
      return "translate3d(" + (t2 ? Math.round(t2) : 0) + "px, " + (n2 ? Math.round(n2) : 0) + "px, 0)";
    } }, Scale: { toString(e2) {
      if (!e2) return;
      const { scaleX: t2, scaleY: n2 } = e2;
      return "scaleX(" + t2 + ") scaleY(" + n2 + ")";
    } }, Transform: { toString(e2) {
      if (e2) return [h.Translate.toString(e2), h.Scale.toString(e2)].join(" ");
    } }, Transition: { toString(e2) {
      let { property: t2, duration: n2, easing: r2 } = e2;
      return t2 + " " + n2 + "ms " + r2;
    } } });
    var b = "a,frame,iframe,input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled),*[tabindex]";
    exports2.CSS = h, exports2.add = d, exports2.canUseDOM = t, exports2.findFirstFocusableNode = function(e2) {
      return e2.matches(b) ? e2 : e2.querySelector(b);
    }, exports2.getEventCoordinates = function(e2) {
      if (m(e2)) {
        if (e2.touches && e2.touches.length) {
          const { clientX: t2, clientY: n2 } = e2.touches[0];
          return { x: t2, y: n2 };
        }
        if (e2.changedTouches && e2.changedTouches.length) {
          const { clientX: t2, clientY: n2 } = e2.changedTouches[0];
          return { x: t2, y: n2 };
        }
      }
      return x(e2) ? { x: e2.clientX, y: e2.clientY } : null;
    }, exports2.getOwnerDocument = function(e2) {
      return e2 ? n(e2) ? e2.document : r(e2) ? u(e2) ? e2 : c(e2) || s(e2) ? e2.ownerDocument : document : document : document;
    }, exports2.getWindow = o, exports2.hasViewportRelativeCoordinates = x, exports2.isDocument = u, exports2.isHTMLElement = c, exports2.isKeyboardEvent = function(e2) {
      if (!e2) return false;
      const { KeyboardEvent: t2 } = o(e2.target);
      return t2 && e2 instanceof t2;
    }, exports2.isNode = r, exports2.isSVGElement = s, exports2.isTouchEvent = m, exports2.isWindow = n, exports2.subtract = p, exports2.useCombinedRefs = function() {
      for (var t2 = arguments.length, n2 = new Array(t2), r2 = 0; r2 < t2; r2++) n2[r2] = arguments[r2];
      return e.useMemo(() => (e2) => {
        n2.forEach((t3) => t3(e2));
      }, n2);
    }, exports2.useEvent = a, exports2.useInterval = function() {
      const t2 = e.useRef(null);
      return [e.useCallback((e2, n2) => {
        t2.current = setInterval(e2, n2);
      }, []), e.useCallback(() => {
        null !== t2.current && (clearInterval(t2.current), t2.current = null);
      }, [])];
    }, exports2.useIsomorphicLayoutEffect = i, exports2.useLatestValue = function(t2, n2) {
      void 0 === n2 && (n2 = [t2]);
      const r2 = e.useRef(t2);
      return i(() => {
        r2.current !== t2 && (r2.current = t2);
      }, n2), r2;
    }, exports2.useLazyMemo = function(t2, n2) {
      const r2 = e.useRef();
      return e.useMemo(() => {
        const e2 = t2(r2.current);
        return r2.current = e2, e2;
      }, [...n2]);
    }, exports2.useNodeRef = function(t2) {
      const n2 = a(t2), r2 = e.useRef(null), o2 = e.useCallback((e2) => {
        e2 !== r2.current && (null == n2 || n2(e2, r2.current)), r2.current = e2;
      }, []);
      return [r2, o2];
    }, exports2.usePrevious = function(t2) {
      const n2 = e.useRef();
      return e.useEffect(() => {
        n2.current = t2;
      }, [t2]), n2.current;
    }, exports2.useUniqueId = function(t2, n2) {
      return e.useMemo(() => {
        if (n2) return n2;
        const e2 = null == l[t2] ? 0 : l[t2] + 1;
        return l[t2] = e2, t2 + "-" + e2;
      }, [t2, n2]);
    };
  }
});

// node_modules/.pnpm/@dnd-kit+utilities@3.2.2_react@18.2.0/node_modules/@dnd-kit/utilities/dist/index.js
var require_dist = __commonJS({
  "node_modules/.pnpm/@dnd-kit+utilities@3.2.2_react@18.2.0/node_modules/@dnd-kit/utilities/dist/index.js"(exports2, module2) {
    "use strict";
    if (true) {
      module2.exports = require_utilities_cjs_production_min();
    } else {
      module2.exports = null;
    }
  }
});

// node_modules/.pnpm/@dnd-kit+accessibility@3.1.1_react@18.2.0/node_modules/@dnd-kit/accessibility/dist/accessibility.cjs.production.min.js
var require_accessibility_cjs_production_min = __commonJS({
  "node_modules/.pnpm/@dnd-kit+accessibility@3.1.1_react@18.2.0/node_modules/@dnd-kit/accessibility/dist/accessibility.cjs.production.min.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var e;
    var t = require("react");
    var n = (e = t) && "object" == typeof e && "default" in e ? e.default : e;
    var i = { display: "none" };
    exports2.HiddenText = function(e2) {
      let { id: t2, value: r } = e2;
      return n.createElement("div", { id: t2, style: i }, r);
    }, exports2.LiveRegion = function(e2) {
      let { id: t2, announcement: i2, ariaLiveType: r = "assertive" } = e2;
      return n.createElement("div", { id: t2, style: { position: "fixed", top: 0, left: 0, width: 1, height: 1, margin: -1, border: 0, padding: 0, overflow: "hidden", clip: "rect(0 0 0 0)", clipPath: "inset(100%)", whiteSpace: "nowrap" }, role: "status", "aria-live": r, "aria-atomic": true }, i2);
    }, exports2.useAnnouncement = function() {
      const [e2, n2] = t.useState("");
      return { announce: t.useCallback((e3) => {
        null != e3 && n2(e3);
      }, []), announcement: e2 };
    };
  }
});

// node_modules/.pnpm/@dnd-kit+accessibility@3.1.1_react@18.2.0/node_modules/@dnd-kit/accessibility/dist/index.js
var require_dist2 = __commonJS({
  "node_modules/.pnpm/@dnd-kit+accessibility@3.1.1_react@18.2.0/node_modules/@dnd-kit/accessibility/dist/index.js"(exports2, module2) {
    "use strict";
    if (true) {
      module2.exports = require_accessibility_cjs_production_min();
    } else {
      module2.exports = null;
    }
  }
});

// node_modules/.pnpm/@dnd-kit+core@6.3.1_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/@dnd-kit/core/dist/core.cjs.production.min.js
var require_core_cjs_production_min = __commonJS({
  "node_modules/.pnpm/@dnd-kit+core@6.3.1_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/@dnd-kit/core/dist/core.cjs.production.min.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var e;
    var t = require("react");
    var n = (e = t) && "object" == typeof e && "default" in e ? e.default : e;
    var r = require("react-dom");
    var o = require_dist();
    var i = require_dist2();
    var a = t.createContext(null);
    function s(e2) {
      const n2 = t.useContext(a);
      t.useEffect(() => {
        if (!n2) throw new Error("useDndMonitor must be used within a children of <DndContext>");
        return n2(e2);
      }, [e2, n2]);
    }
    var l = { draggable: "\n    To pick up a draggable item, press the space bar.\n    While dragging, use the arrow keys to move the item.\n    Press space again to drop the item in its new position, or press escape to cancel.\n  " };
    var c = { onDragStart(e2) {
      let { active: t2 } = e2;
      return "Picked up draggable item " + t2.id + ".";
    }, onDragOver(e2) {
      let { active: t2, over: n2 } = e2;
      return n2 ? "Draggable item " + t2.id + " was moved over droppable area " + n2.id + "." : "Draggable item " + t2.id + " is no longer over a droppable area.";
    }, onDragEnd(e2) {
      let { active: t2, over: n2 } = e2;
      return n2 ? "Draggable item " + t2.id + " was dropped over droppable area " + n2.id : "Draggable item " + t2.id + " was dropped.";
    }, onDragCancel(e2) {
      let { active: t2 } = e2;
      return "Dragging was cancelled. Draggable item " + t2.id + " was dropped.";
    } };
    function d(e2) {
      let { announcements: a2 = c, container: d2, hiddenTextDescribedById: u2, screenReaderInstructions: f2 = l } = e2;
      const { announce: v2, announcement: g2 } = i.useAnnouncement(), p2 = o.useUniqueId("DndLiveRegion"), [h2, b2] = t.useState(false);
      if (t.useEffect(() => {
        b2(true);
      }, []), s(t.useMemo(() => ({ onDragStart(e3) {
        let { active: t2 } = e3;
        v2(a2.onDragStart({ active: t2 }));
      }, onDragMove(e3) {
        let { active: t2, over: n2 } = e3;
        a2.onDragMove && v2(a2.onDragMove({ active: t2, over: n2 }));
      }, onDragOver(e3) {
        let { active: t2, over: n2 } = e3;
        v2(a2.onDragOver({ active: t2, over: n2 }));
      }, onDragEnd(e3) {
        let { active: t2, over: n2 } = e3;
        v2(a2.onDragEnd({ active: t2, over: n2 }));
      }, onDragCancel(e3) {
        let { active: t2, over: n2 } = e3;
        v2(a2.onDragCancel({ active: t2, over: n2 }));
      } }), [v2, a2])), !h2) return null;
      const m2 = n.createElement(n.Fragment, null, n.createElement(i.HiddenText, { id: u2, value: f2.draggable }), n.createElement(i.LiveRegion, { id: p2, announcement: g2 }));
      return d2 ? r.createPortal(m2, d2) : m2;
    }
    var u;
    function f() {
    }
    !function(e2) {
      e2.DragStart = "dragStart", e2.DragMove = "dragMove", e2.DragEnd = "dragEnd", e2.DragCancel = "dragCancel", e2.DragOver = "dragOver", e2.RegisterDroppable = "registerDroppable", e2.SetDroppableDisabled = "setDroppableDisabled", e2.UnregisterDroppable = "unregisterDroppable";
    }(u || (u = {}));
    var v = Object.freeze({ x: 0, y: 0 });
    function g(e2, t2) {
      return Math.sqrt(Math.pow(e2.x - t2.x, 2) + Math.pow(e2.y - t2.y, 2));
    }
    function p(e2, t2) {
      const n2 = o.getEventCoordinates(e2);
      return n2 ? (n2.x - t2.left) / t2.width * 100 + "% " + (n2.y - t2.top) / t2.height * 100 + "%" : "0 0";
    }
    function h(e2, t2) {
      let { data: { value: n2 } } = e2, { data: { value: r2 } } = t2;
      return n2 - r2;
    }
    function b(e2, t2) {
      let { data: { value: n2 } } = e2, { data: { value: r2 } } = t2;
      return r2 - n2;
    }
    function m(e2) {
      let { left: t2, top: n2, height: r2, width: o2 } = e2;
      return [{ x: t2, y: n2 }, { x: t2 + o2, y: n2 }, { x: t2, y: n2 + r2 }, { x: t2 + o2, y: n2 + r2 }];
    }
    function y(e2, t2) {
      if (!e2 || 0 === e2.length) return null;
      const [n2] = e2;
      return t2 ? n2[t2] : n2;
    }
    function x(e2, t2, n2) {
      return void 0 === t2 && (t2 = e2.left), void 0 === n2 && (n2 = e2.top), { x: t2 + 0.5 * e2.width, y: n2 + 0.5 * e2.height };
    }
    function w(e2, t2) {
      const n2 = Math.max(t2.top, e2.top), r2 = Math.max(t2.left, e2.left), o2 = Math.min(t2.left + t2.width, e2.left + e2.width), i2 = Math.min(t2.top + t2.height, e2.top + e2.height);
      if (r2 < o2 && n2 < i2) {
        const a2 = (o2 - r2) * (i2 - n2);
        return Number((a2 / (t2.width * t2.height + e2.width * e2.height - a2)).toFixed(4));
      }
      return 0;
    }
    var C = (e2) => {
      let { collisionRect: t2, droppableRects: n2, droppableContainers: r2 } = e2;
      const o2 = [];
      for (const e3 of r2) {
        const { id: r3 } = e3, i2 = n2.get(r3);
        if (i2) {
          const n3 = w(i2, t2);
          n3 > 0 && o2.push({ id: r3, data: { droppableContainer: e3, value: n3 } });
        }
      }
      return o2.sort(b);
    };
    function E(e2, t2) {
      const { top: n2, left: r2, bottom: o2, right: i2 } = t2;
      return n2 <= e2.y && e2.y <= o2 && r2 <= e2.x && e2.x <= i2;
    }
    function D(e2, t2) {
      return e2 && t2 ? { x: e2.left - t2.left, y: e2.top - t2.top } : v;
    }
    function R(e2) {
      return function(t2) {
        for (var n2 = arguments.length, r2 = new Array(n2 > 1 ? n2 - 1 : 0), o2 = 1; o2 < n2; o2++) r2[o2 - 1] = arguments[o2];
        return r2.reduce((t3, n3) => ({ ...t3, top: t3.top + e2 * n3.y, bottom: t3.bottom + e2 * n3.y, left: t3.left + e2 * n3.x, right: t3.right + e2 * n3.x }), { ...t2 });
      };
    }
    var S = R(1);
    function M(e2) {
      if (e2.startsWith("matrix3d(")) {
        const t2 = e2.slice(9, -1).split(/, /);
        return { x: +t2[12], y: +t2[13], scaleX: +t2[0], scaleY: +t2[5] };
      }
      if (e2.startsWith("matrix(")) {
        const t2 = e2.slice(7, -1).split(/, /);
        return { x: +t2[4], y: +t2[5], scaleX: +t2[0], scaleY: +t2[3] };
      }
      return null;
    }
    var N = { ignoreTransform: false };
    function O(e2, t2) {
      void 0 === t2 && (t2 = N);
      let n2 = e2.getBoundingClientRect();
      if (t2.ignoreTransform) {
        const { transform: t3, transformOrigin: r3 } = o.getWindow(e2).getComputedStyle(e2);
        t3 && (n2 = function(e3, t4, n3) {
          const r4 = M(t4);
          if (!r4) return e3;
          const { scaleX: o2, scaleY: i3, x: a3, y: s3 } = r4, l3 = e3.left - a3 - (1 - o2) * parseFloat(n3), c3 = e3.top - s3 - (1 - i3) * parseFloat(n3.slice(n3.indexOf(" ") + 1)), d2 = o2 ? e3.width / o2 : e3.width, u2 = i3 ? e3.height / i3 : e3.height;
          return { width: d2, height: u2, top: c3, right: l3 + d2, bottom: c3 + u2, left: l3 };
        }(n2, t3, r3));
      }
      const { top: r2, left: i2, width: a2, height: s2, bottom: l2, right: c2 } = n2;
      return { top: r2, left: i2, width: a2, height: s2, bottom: l2, right: c2 };
    }
    function A(e2) {
      return O(e2, { ignoreTransform: true });
    }
    function L(e2, t2) {
      const n2 = [];
      return e2 ? function r2(i2) {
        if (null != t2 && n2.length >= t2) return n2;
        if (!i2) return n2;
        if (o.isDocument(i2) && null != i2.scrollingElement && !n2.includes(i2.scrollingElement)) return n2.push(i2.scrollingElement), n2;
        if (!o.isHTMLElement(i2) || o.isSVGElement(i2)) return n2;
        if (n2.includes(i2)) return n2;
        const a2 = o.getWindow(e2).getComputedStyle(i2);
        return i2 !== e2 && function(e3, t3) {
          void 0 === t3 && (t3 = o.getWindow(e3).getComputedStyle(e3));
          const n3 = /(auto|scroll|overlay)/;
          return ["overflow", "overflowX", "overflowY"].some((e4) => {
            const r3 = t3[e4];
            return "string" == typeof r3 && n3.test(r3);
          });
        }(i2, a2) && n2.push(i2), function(e3, t3) {
          return void 0 === t3 && (t3 = o.getWindow(e3).getComputedStyle(e3)), "fixed" === t3.position;
        }(i2, a2) ? n2 : r2(i2.parentNode);
      }(e2) : n2;
    }
    function k(e2) {
      const [t2] = L(e2, 1);
      return null != t2 ? t2 : null;
    }
    function T(e2) {
      return o.canUseDOM && e2 ? o.isWindow(e2) ? e2 : o.isNode(e2) ? o.isDocument(e2) || e2 === o.getOwnerDocument(e2).scrollingElement ? window : o.isHTMLElement(e2) ? e2 : null : null : null;
    }
    function K(e2) {
      return o.isWindow(e2) ? e2.scrollX : e2.scrollLeft;
    }
    function P(e2) {
      return o.isWindow(e2) ? e2.scrollY : e2.scrollTop;
    }
    function I(e2) {
      return { x: K(e2), y: P(e2) };
    }
    var B;
    function z(e2) {
      return !(!o.canUseDOM || !e2) && e2 === document.scrollingElement;
    }
    function F(e2) {
      const t2 = { x: 0, y: 0 }, n2 = z(e2) ? { height: window.innerHeight, width: window.innerWidth } : { height: e2.clientHeight, width: e2.clientWidth }, r2 = { x: e2.scrollWidth - n2.width, y: e2.scrollHeight - n2.height };
      return { isTop: e2.scrollTop <= t2.y, isLeft: e2.scrollLeft <= t2.x, isBottom: e2.scrollTop >= r2.y, isRight: e2.scrollLeft >= r2.x, maxScroll: r2, minScroll: t2 };
    }
    !function(e2) {
      e2[e2.Forward = 1] = "Forward", e2[e2.Backward = -1] = "Backward";
    }(B || (B = {}));
    var W = { x: 0.2, y: 0.2 };
    function U(e2, t2, n2, r2, o2) {
      let { top: i2, left: a2, right: s2, bottom: l2 } = n2;
      void 0 === r2 && (r2 = 10), void 0 === o2 && (o2 = W);
      const { isTop: c2, isBottom: d2, isLeft: u2, isRight: f2 } = F(e2), v2 = { x: 0, y: 0 }, g2 = { x: 0, y: 0 }, p2 = t2.height * o2.y, h2 = t2.width * o2.x;
      return !c2 && i2 <= t2.top + p2 ? (v2.y = B.Backward, g2.y = r2 * Math.abs((t2.top + p2 - i2) / p2)) : !d2 && l2 >= t2.bottom - p2 && (v2.y = B.Forward, g2.y = r2 * Math.abs((t2.bottom - p2 - l2) / p2)), !f2 && s2 >= t2.right - h2 ? (v2.x = B.Forward, g2.x = r2 * Math.abs((t2.right - h2 - s2) / h2)) : !u2 && a2 <= t2.left + h2 && (v2.x = B.Backward, g2.x = r2 * Math.abs((t2.left + h2 - a2) / h2)), { direction: v2, speed: g2 };
    }
    function j(e2) {
      if (e2 === document.scrollingElement) {
        const { innerWidth: e3, innerHeight: t3 } = window;
        return { top: 0, left: 0, right: e3, bottom: t3, width: e3, height: t3 };
      }
      const { top: t2, left: n2, right: r2, bottom: o2 } = e2.getBoundingClientRect();
      return { top: t2, left: n2, right: r2, bottom: o2, width: e2.clientWidth, height: e2.clientHeight };
    }
    function q(e2) {
      return e2.reduce((e3, t2) => o.add(e3, I(t2)), v);
    }
    function H(e2, t2) {
      if (void 0 === t2 && (t2 = O), !e2) return;
      const { top: n2, left: r2, bottom: o2, right: i2 } = t2(e2);
      k(e2) && (o2 <= 0 || i2 <= 0 || n2 >= window.innerHeight || r2 >= window.innerWidth) && e2.scrollIntoView({ block: "center", inline: "center" });
    }
    var X2 = [["x", ["left", "right"], function(e2) {
      return e2.reduce((e3, t2) => e3 + K(t2), 0);
    }], ["y", ["top", "bottom"], function(e2) {
      return e2.reduce((e3, t2) => e3 + P(t2), 0);
    }]];
    var Y = class {
      constructor(e2, t2) {
        this.rect = void 0, this.width = void 0, this.height = void 0, this.top = void 0, this.bottom = void 0, this.right = void 0, this.left = void 0;
        const n2 = L(t2), r2 = q(n2);
        this.rect = { ...e2 }, this.width = e2.width, this.height = e2.height;
        for (const [e3, t3, o2] of X2) for (const i2 of t3) Object.defineProperty(this, i2, { get: () => {
          const t4 = o2(n2);
          return this.rect[i2] + (r2[e3] - t4);
        }, enumerable: true });
        Object.defineProperty(this, "rect", { enumerable: false });
      }
    };
    var V = class {
      constructor(e2) {
        this.target = void 0, this.listeners = [], this.removeAll = () => {
          this.listeners.forEach((e3) => {
            var t2;
            return null == (t2 = this.target) ? void 0 : t2.removeEventListener(...e3);
          });
        }, this.target = e2;
      }
      add(e2, t2, n2) {
        var r2;
        null == (r2 = this.target) || r2.addEventListener(e2, t2, n2), this.listeners.push([e2, t2, n2]);
      }
    };
    function J(e2, t2) {
      const n2 = Math.abs(e2.x), r2 = Math.abs(e2.y);
      return "number" == typeof t2 ? Math.sqrt(n2 ** 2 + r2 ** 2) > t2 : "x" in t2 && "y" in t2 ? n2 > t2.x && r2 > t2.y : "x" in t2 ? n2 > t2.x : "y" in t2 && r2 > t2.y;
    }
    var _;
    var G;
    function Q(e2) {
      e2.preventDefault();
    }
    function Z(e2) {
      e2.stopPropagation();
    }
    !function(e2) {
      e2.Click = "click", e2.DragStart = "dragstart", e2.Keydown = "keydown", e2.ContextMenu = "contextmenu", e2.Resize = "resize", e2.SelectionChange = "selectionchange", e2.VisibilityChange = "visibilitychange";
    }(_ || (_ = {})), (G = exports2.KeyboardCode || (exports2.KeyboardCode = {})).Space = "Space", G.Down = "ArrowDown", G.Right = "ArrowRight", G.Left = "ArrowLeft", G.Up = "ArrowUp", G.Esc = "Escape", G.Enter = "Enter", G.Tab = "Tab";
    var $ = { start: [exports2.KeyboardCode.Space, exports2.KeyboardCode.Enter], cancel: [exports2.KeyboardCode.Esc], end: [exports2.KeyboardCode.Space, exports2.KeyboardCode.Enter, exports2.KeyboardCode.Tab] };
    var ee = (e2, t2) => {
      let { currentCoordinates: n2 } = t2;
      switch (e2.code) {
        case exports2.KeyboardCode.Right:
          return { ...n2, x: n2.x + 25 };
        case exports2.KeyboardCode.Left:
          return { ...n2, x: n2.x - 25 };
        case exports2.KeyboardCode.Down:
          return { ...n2, y: n2.y + 25 };
        case exports2.KeyboardCode.Up:
          return { ...n2, y: n2.y - 25 };
      }
    };
    var te = class {
      constructor(e2) {
        this.props = void 0, this.autoScrollEnabled = false, this.referenceCoordinates = void 0, this.listeners = void 0, this.windowListeners = void 0, this.props = e2;
        const { event: { target: t2 } } = e2;
        this.props = e2, this.listeners = new V(o.getOwnerDocument(t2)), this.windowListeners = new V(o.getWindow(t2)), this.handleKeyDown = this.handleKeyDown.bind(this), this.handleCancel = this.handleCancel.bind(this), this.attach();
      }
      attach() {
        this.handleStart(), this.windowListeners.add(_.Resize, this.handleCancel), this.windowListeners.add(_.VisibilityChange, this.handleCancel), setTimeout(() => this.listeners.add(_.Keydown, this.handleKeyDown));
      }
      handleStart() {
        const { activeNode: e2, onStart: t2 } = this.props, n2 = e2.node.current;
        n2 && H(n2), t2(v);
      }
      handleKeyDown(e2) {
        if (o.isKeyboardEvent(e2)) {
          const { active: t2, context: n2, options: r2 } = this.props, { keyboardCodes: i2 = $, coordinateGetter: a2 = ee, scrollBehavior: s2 = "smooth" } = r2, { code: l2 } = e2;
          if (i2.end.includes(l2)) return void this.handleEnd(e2);
          if (i2.cancel.includes(l2)) return void this.handleCancel(e2);
          const { collisionRect: c2 } = n2.current, d2 = c2 ? { x: c2.left, y: c2.top } : v;
          this.referenceCoordinates || (this.referenceCoordinates = d2);
          const u2 = a2(e2, { active: t2, context: n2.current, currentCoordinates: d2 });
          if (u2) {
            const t3 = o.subtract(u2, d2), r3 = { x: 0, y: 0 }, { scrollableAncestors: i3 } = n2.current;
            for (const n3 of i3) {
              const o2 = e2.code, { isTop: i4, isRight: a3, isLeft: l3, isBottom: c3, maxScroll: d3, minScroll: f2 } = F(n3), v2 = j(n3), g2 = { x: Math.min(o2 === exports2.KeyboardCode.Right ? v2.right - v2.width / 2 : v2.right, Math.max(o2 === exports2.KeyboardCode.Right ? v2.left : v2.left + v2.width / 2, u2.x)), y: Math.min(o2 === exports2.KeyboardCode.Down ? v2.bottom - v2.height / 2 : v2.bottom, Math.max(o2 === exports2.KeyboardCode.Down ? v2.top : v2.top + v2.height / 2, u2.y)) }, p2 = o2 === exports2.KeyboardCode.Right && !a3 || o2 === exports2.KeyboardCode.Left && !l3, h2 = o2 === exports2.KeyboardCode.Down && !c3 || o2 === exports2.KeyboardCode.Up && !i4;
              if (p2 && g2.x !== u2.x) {
                const e3 = n3.scrollLeft + t3.x, i5 = o2 === exports2.KeyboardCode.Right && e3 <= d3.x || o2 === exports2.KeyboardCode.Left && e3 >= f2.x;
                if (i5 && !t3.y) return void n3.scrollTo({ left: e3, behavior: s2 });
                r3.x = i5 ? n3.scrollLeft - e3 : o2 === exports2.KeyboardCode.Right ? n3.scrollLeft - d3.x : n3.scrollLeft - f2.x, r3.x && n3.scrollBy({ left: -r3.x, behavior: s2 });
                break;
              }
              if (h2 && g2.y !== u2.y) {
                const e3 = n3.scrollTop + t3.y, i5 = o2 === exports2.KeyboardCode.Down && e3 <= d3.y || o2 === exports2.KeyboardCode.Up && e3 >= f2.y;
                if (i5 && !t3.x) return void n3.scrollTo({ top: e3, behavior: s2 });
                r3.y = i5 ? n3.scrollTop - e3 : o2 === exports2.KeyboardCode.Down ? n3.scrollTop - d3.y : n3.scrollTop - f2.y, r3.y && n3.scrollBy({ top: -r3.y, behavior: s2 });
                break;
              }
            }
            this.handleMove(e2, o.add(o.subtract(u2, this.referenceCoordinates), r3));
          }
        }
      }
      handleMove(e2, t2) {
        const { onMove: n2 } = this.props;
        e2.preventDefault(), n2(t2);
      }
      handleEnd(e2) {
        const { onEnd: t2 } = this.props;
        e2.preventDefault(), this.detach(), t2();
      }
      handleCancel(e2) {
        const { onCancel: t2 } = this.props;
        e2.preventDefault(), this.detach(), t2();
      }
      detach() {
        this.listeners.removeAll(), this.windowListeners.removeAll();
      }
    };
    function ne(e2) {
      return Boolean(e2 && "distance" in e2);
    }
    function re(e2) {
      return Boolean(e2 && "delay" in e2);
    }
    te.activators = [{ eventName: "onKeyDown", handler: (e2, t2, n2) => {
      let { keyboardCodes: r2 = $, onActivation: o2 } = t2, { active: i2 } = n2;
      const { code: a2 } = e2.nativeEvent;
      if (r2.start.includes(a2)) {
        const t3 = i2.activatorNode.current;
        return !(t3 && e2.target !== t3 || (e2.preventDefault(), null == o2 || o2({ event: e2.nativeEvent }), 0));
      }
      return false;
    } }];
    var oe = class {
      constructor(e2, t2, n2) {
        var r2;
        void 0 === n2 && (n2 = function(e3) {
          const { EventTarget: t3 } = o.getWindow(e3);
          return e3 instanceof t3 ? e3 : o.getOwnerDocument(e3);
        }(e2.event.target)), this.props = void 0, this.events = void 0, this.autoScrollEnabled = true, this.document = void 0, this.activated = false, this.initialCoordinates = void 0, this.timeoutId = null, this.listeners = void 0, this.documentListeners = void 0, this.windowListeners = void 0, this.props = e2, this.events = t2;
        const { event: i2 } = e2, { target: a2 } = i2;
        this.props = e2, this.events = t2, this.document = o.getOwnerDocument(a2), this.documentListeners = new V(this.document), this.listeners = new V(n2), this.windowListeners = new V(o.getWindow(a2)), this.initialCoordinates = null != (r2 = o.getEventCoordinates(i2)) ? r2 : v, this.handleStart = this.handleStart.bind(this), this.handleMove = this.handleMove.bind(this), this.handleEnd = this.handleEnd.bind(this), this.handleCancel = this.handleCancel.bind(this), this.handleKeydown = this.handleKeydown.bind(this), this.removeTextSelection = this.removeTextSelection.bind(this), this.attach();
      }
      attach() {
        const { events: e2, props: { options: { activationConstraint: t2, bypassActivationConstraint: n2 } } } = this;
        if (this.listeners.add(e2.move.name, this.handleMove, { passive: false }), this.listeners.add(e2.end.name, this.handleEnd), e2.cancel && this.listeners.add(e2.cancel.name, this.handleCancel), this.windowListeners.add(_.Resize, this.handleCancel), this.windowListeners.add(_.DragStart, Q), this.windowListeners.add(_.VisibilityChange, this.handleCancel), this.windowListeners.add(_.ContextMenu, Q), this.documentListeners.add(_.Keydown, this.handleKeydown), t2) {
          if (null != n2 && n2({ event: this.props.event, activeNode: this.props.activeNode, options: this.props.options })) return this.handleStart();
          if (re(t2)) return this.timeoutId = setTimeout(this.handleStart, t2.delay), void this.handlePending(t2);
          if (ne(t2)) return void this.handlePending(t2);
        }
        this.handleStart();
      }
      detach() {
        this.listeners.removeAll(), this.windowListeners.removeAll(), setTimeout(this.documentListeners.removeAll, 50), null !== this.timeoutId && (clearTimeout(this.timeoutId), this.timeoutId = null);
      }
      handlePending(e2, t2) {
        const { active: n2, onPending: r2 } = this.props;
        r2(n2, e2, this.initialCoordinates, t2);
      }
      handleStart() {
        const { initialCoordinates: e2 } = this, { onStart: t2 } = this.props;
        e2 && (this.activated = true, this.documentListeners.add(_.Click, Z, { capture: true }), this.removeTextSelection(), this.documentListeners.add(_.SelectionChange, this.removeTextSelection), t2(e2));
      }
      handleMove(e2) {
        var t2;
        const { activated: n2, initialCoordinates: r2, props: i2 } = this, { onMove: a2, options: { activationConstraint: s2 } } = i2;
        if (!r2) return;
        const l2 = null != (t2 = o.getEventCoordinates(e2)) ? t2 : v, c2 = o.subtract(r2, l2);
        if (!n2 && s2) {
          if (ne(s2)) {
            if (null != s2.tolerance && J(c2, s2.tolerance)) return this.handleCancel();
            if (J(c2, s2.distance)) return this.handleStart();
          }
          return re(s2) && J(c2, s2.tolerance) ? this.handleCancel() : void this.handlePending(s2, c2);
        }
        e2.cancelable && e2.preventDefault(), a2(l2);
      }
      handleEnd() {
        const { onAbort: e2, onEnd: t2 } = this.props;
        this.detach(), this.activated || e2(this.props.active), t2();
      }
      handleCancel() {
        const { onAbort: e2, onCancel: t2 } = this.props;
        this.detach(), this.activated || e2(this.props.active), t2();
      }
      handleKeydown(e2) {
        e2.code === exports2.KeyboardCode.Esc && this.handleCancel();
      }
      removeTextSelection() {
        var e2;
        null == (e2 = this.document.getSelection()) || e2.removeAllRanges();
      }
    };
    var ie = { cancel: { name: "pointercancel" }, move: { name: "pointermove" }, end: { name: "pointerup" } };
    var ae = class extends oe {
      constructor(e2) {
        const { event: t2 } = e2, n2 = o.getOwnerDocument(t2.target);
        super(e2, ie, n2);
      }
    };
    ae.activators = [{ eventName: "onPointerDown", handler: (e2, t2) => {
      let { nativeEvent: n2 } = e2, { onActivation: r2 } = t2;
      return !(!n2.isPrimary || 0 !== n2.button || (null == r2 || r2({ event: n2 }), 0));
    } }];
    var se = { move: { name: "mousemove" }, end: { name: "mouseup" } };
    var le;
    !function(e2) {
      e2[e2.RightClick = 2] = "RightClick";
    }(le || (le = {}));
    var ce = class extends oe {
      constructor(e2) {
        super(e2, se, o.getOwnerDocument(e2.event.target));
      }
    };
    ce.activators = [{ eventName: "onMouseDown", handler: (e2, t2) => {
      let { nativeEvent: n2 } = e2, { onActivation: r2 } = t2;
      return n2.button !== le.RightClick && (null == r2 || r2({ event: n2 }), true);
    } }];
    var de = { cancel: { name: "touchcancel" }, move: { name: "touchmove" }, end: { name: "touchend" } };
    var ue = class extends oe {
      constructor(e2) {
        super(e2, de);
      }
      static setup() {
        return window.addEventListener(de.move.name, e2, { capture: false, passive: false }), function() {
          window.removeEventListener(de.move.name, e2);
        };
        function e2() {
        }
      }
    };
    var fe;
    var ve;
    ue.activators = [{ eventName: "onTouchStart", handler: (e2, t2) => {
      let { nativeEvent: n2 } = e2, { onActivation: r2 } = t2;
      const { touches: o2 } = n2;
      return !(o2.length > 1 || (null == r2 || r2({ event: n2 }), 0));
    } }], (fe = exports2.AutoScrollActivator || (exports2.AutoScrollActivator = {}))[fe.Pointer = 0] = "Pointer", fe[fe.DraggableRect = 1] = "DraggableRect", (ve = exports2.TraversalOrder || (exports2.TraversalOrder = {}))[ve.TreeOrder = 0] = "TreeOrder", ve[ve.ReversedTreeOrder = 1] = "ReversedTreeOrder";
    var ge = { x: { [B.Backward]: false, [B.Forward]: false }, y: { [B.Backward]: false, [B.Forward]: false } };
    var pe;
    (pe = exports2.MeasuringStrategy || (exports2.MeasuringStrategy = {}))[pe.Always = 0] = "Always", pe[pe.BeforeDragging = 1] = "BeforeDragging", pe[pe.WhileDragging = 2] = "WhileDragging", (exports2.MeasuringFrequency || (exports2.MeasuringFrequency = {})).Optimized = "optimized";
    var he = /* @__PURE__ */ new Map();
    function be(e2, t2) {
      return o.useLazyMemo((n2) => e2 ? n2 || ("function" == typeof t2 ? t2(e2) : e2) : null, [t2, e2]);
    }
    function me(e2) {
      let { callback: n2, disabled: r2 } = e2;
      const i2 = o.useEvent(n2), a2 = t.useMemo(() => {
        if (r2 || "undefined" == typeof window || void 0 === window.ResizeObserver) return;
        const { ResizeObserver: e3 } = window;
        return new e3(i2);
      }, [r2]);
      return t.useEffect(() => () => null == a2 ? void 0 : a2.disconnect(), [a2]), a2;
    }
    function ye(e2) {
      return new Y(O(e2), e2);
    }
    function xe(e2, n2, r2) {
      void 0 === n2 && (n2 = ye);
      const [i2, a2] = t.useState(null);
      function s2() {
        a2((t2) => {
          if (!e2) return null;
          var o2;
          if (false === e2.isConnected) return null != (o2 = null != t2 ? t2 : r2) ? o2 : null;
          const i3 = n2(e2);
          return JSON.stringify(t2) === JSON.stringify(i3) ? t2 : i3;
        });
      }
      const l2 = function(e3) {
        let { callback: n3, disabled: r3 } = e3;
        const i3 = o.useEvent(n3), a3 = t.useMemo(() => {
          if (r3 || "undefined" == typeof window || void 0 === window.MutationObserver) return;
          const { MutationObserver: e4 } = window;
          return new e4(i3);
        }, [i3, r3]);
        return t.useEffect(() => () => null == a3 ? void 0 : a3.disconnect(), [a3]), a3;
      }({ callback(t2) {
        if (e2) for (const n3 of t2) {
          const { type: t3, target: r3 } = n3;
          if ("childList" === t3 && r3 instanceof HTMLElement && r3.contains(e2)) {
            s2();
            break;
          }
        }
      } }), c2 = me({ callback: s2 });
      return o.useIsomorphicLayoutEffect(() => {
        s2(), e2 ? (null == c2 || c2.observe(e2), null == l2 || l2.observe(document.body, { childList: true, subtree: true })) : (null == c2 || c2.disconnect(), null == l2 || l2.disconnect());
      }, [e2]), i2;
    }
    var we = [];
    function Ce(e2, n2) {
      void 0 === n2 && (n2 = []);
      const r2 = t.useRef(null);
      return t.useEffect(() => {
        r2.current = null;
      }, n2), t.useEffect(() => {
        const t2 = e2 !== v;
        t2 && !r2.current && (r2.current = e2), !t2 && r2.current && (r2.current = null);
      }, [e2]), r2.current ? o.subtract(e2, r2.current) : v;
    }
    function Ee(e2) {
      return t.useMemo(() => e2 ? function(e3) {
        const t2 = e3.innerWidth, n2 = e3.innerHeight;
        return { top: 0, left: 0, right: t2, bottom: n2, width: t2, height: n2 };
      }(e2) : null, [e2]);
    }
    var De = [];
    function Re(e2) {
      if (!e2) return null;
      if (e2.children.length > 1) return e2;
      const t2 = e2.children[0];
      return o.isHTMLElement(t2) ? t2 : e2;
    }
    var Se = [{ sensor: ae, options: {} }, { sensor: te, options: {} }];
    var Me = { current: {} };
    var Ne = { draggable: { measure: A }, droppable: { measure: A, strategy: exports2.MeasuringStrategy.WhileDragging, frequency: exports2.MeasuringFrequency.Optimized }, dragOverlay: { measure: O } };
    var Oe = class extends Map {
      get(e2) {
        var t2;
        return null != e2 && null != (t2 = super.get(e2)) ? t2 : void 0;
      }
      toArray() {
        return Array.from(this.values());
      }
      getEnabled() {
        return this.toArray().filter((e2) => {
          let { disabled: t2 } = e2;
          return !t2;
        });
      }
      getNodeFor(e2) {
        var t2, n2;
        return null != (t2 = null == (n2 = this.get(e2)) ? void 0 : n2.node.current) ? t2 : void 0;
      }
    };
    var Ae = { activatorEvent: null, active: null, activeNode: null, activeNodeRect: null, collisions: null, containerNodeRect: null, draggableNodes: /* @__PURE__ */ new Map(), droppableRects: /* @__PURE__ */ new Map(), droppableContainers: new Oe(), over: null, dragOverlay: { nodeRef: { current: null }, rect: null, setRef: f }, scrollableAncestors: [], scrollableAncestorRects: [], measuringConfiguration: Ne, measureDroppableContainers: f, windowRect: null, measuringScheduled: false };
    var Le = { activatorEvent: null, activators: [], active: null, activeNodeRect: null, ariaDescribedById: { draggable: "" }, dispatch: f, draggableNodes: /* @__PURE__ */ new Map(), over: null, measureDroppableContainers: f };
    var ke = t.createContext(Le);
    var Te = t.createContext(Ae);
    function Ke() {
      return { draggable: { active: null, initialCoordinates: { x: 0, y: 0 }, nodes: /* @__PURE__ */ new Map(), translate: { x: 0, y: 0 } }, droppable: { containers: new Oe() } };
    }
    function Pe(e2, t2) {
      switch (t2.type) {
        case u.DragStart:
          return { ...e2, draggable: { ...e2.draggable, initialCoordinates: t2.initialCoordinates, active: t2.active } };
        case u.DragMove:
          return null == e2.draggable.active ? e2 : { ...e2, draggable: { ...e2.draggable, translate: { x: t2.coordinates.x - e2.draggable.initialCoordinates.x, y: t2.coordinates.y - e2.draggable.initialCoordinates.y } } };
        case u.DragEnd:
        case u.DragCancel:
          return { ...e2, draggable: { ...e2.draggable, active: null, initialCoordinates: { x: 0, y: 0 }, translate: { x: 0, y: 0 } } };
        case u.RegisterDroppable: {
          const { element: n2 } = t2, { id: r2 } = n2, o2 = new Oe(e2.droppable.containers);
          return o2.set(r2, n2), { ...e2, droppable: { ...e2.droppable, containers: o2 } };
        }
        case u.SetDroppableDisabled: {
          const { id: n2, key: r2, disabled: o2 } = t2, i2 = e2.droppable.containers.get(n2);
          if (!i2 || r2 !== i2.key) return e2;
          const a2 = new Oe(e2.droppable.containers);
          return a2.set(n2, { ...i2, disabled: o2 }), { ...e2, droppable: { ...e2.droppable, containers: a2 } };
        }
        case u.UnregisterDroppable: {
          const { id: n2, key: r2 } = t2, o2 = e2.droppable.containers.get(n2);
          if (!o2 || r2 !== o2.key) return e2;
          const i2 = new Oe(e2.droppable.containers);
          return i2.delete(n2), { ...e2, droppable: { ...e2.droppable, containers: i2 } };
        }
        default:
          return e2;
      }
    }
    function Ie(e2) {
      let { disabled: n2 } = e2;
      const { active: r2, activatorEvent: i2, draggableNodes: a2 } = t.useContext(ke), s2 = o.usePrevious(i2), l2 = o.usePrevious(null == r2 ? void 0 : r2.id);
      return t.useEffect(() => {
        if (!n2 && !i2 && s2 && null != l2) {
          if (!o.isKeyboardEvent(s2)) return;
          if (document.activeElement === s2.target) return;
          const e3 = a2.get(l2);
          if (!e3) return;
          const { activatorNode: t2, node: n3 } = e3;
          if (!t2.current && !n3.current) return;
          requestAnimationFrame(() => {
            for (const e4 of [t2.current, n3.current]) {
              if (!e4) continue;
              const t3 = o.findFirstFocusableNode(e4);
              if (t3) {
                t3.focus();
                break;
              }
            }
          });
        }
      }, [i2, n2, a2, l2, s2]), null;
    }
    function Be(e2, t2) {
      let { transform: n2, ...r2 } = t2;
      return null != e2 && e2.length ? e2.reduce((e3, t3) => t3({ transform: e3, ...r2 }), n2) : n2;
    }
    var ze = t.createContext({ ...v, scaleX: 1, scaleY: 1 });
    var Fe;
    !function(e2) {
      e2[e2.Uninitialized = 0] = "Uninitialized", e2[e2.Initializing = 1] = "Initializing", e2[e2.Initialized = 2] = "Initialized";
    }(Fe || (Fe = {}));
    var We = t.memo(function(e2) {
      var i2, s2, l2, c2;
      let { id: f2, accessibility: g2, autoScroll: p2 = true, children: h2, sensors: b2 = Se, collisionDetection: m2 = C, measuring: x2, modifiers: w2, ...E2 } = e2;
      const R2 = t.useReducer(Pe, void 0, Ke), [M2, N2] = R2, [A2, K2] = function() {
        const [e3] = t.useState(() => /* @__PURE__ */ new Set()), n2 = t.useCallback((t2) => (e3.add(t2), () => e3.delete(t2)), [e3]);
        return [t.useCallback((t2) => {
          let { type: n3, event: r2 } = t2;
          e3.forEach((e4) => {
            var t3;
            return null == (t3 = e4[n3]) ? void 0 : t3.call(e4, r2);
          });
        }, [e3]), n2];
      }(), [P2, F2] = t.useState(Fe.Uninitialized), W2 = P2 === Fe.Initialized, { draggable: { active: j2, nodes: H2, translate: X3 }, droppable: { containers: V2 } } = M2, J2 = null != j2 ? H2.get(j2) : null, _2 = t.useRef({ initial: null, translated: null }), G2 = t.useMemo(() => {
        var e3;
        return null != j2 ? { id: j2, data: null != (e3 = null == J2 ? void 0 : J2.data) ? e3 : Me, rect: _2 } : null;
      }, [j2, J2]), Q2 = t.useRef(null), [Z2, $2] = t.useState(null), [ee2, te2] = t.useState(null), ne2 = o.useLatestValue(E2, Object.values(E2)), re2 = o.useUniqueId("DndDescribedBy", f2), oe2 = t.useMemo(() => V2.getEnabled(), [V2]), ie2 = t.useMemo(() => ({ draggable: { ...Ne.draggable, ...null == ae2 ? void 0 : ae2.draggable }, droppable: { ...Ne.droppable, ...null == ae2 ? void 0 : ae2.droppable }, dragOverlay: { ...Ne.dragOverlay, ...null == ae2 ? void 0 : ae2.dragOverlay } }), [null == (ae2 = x2) ? void 0 : ae2.draggable, null == ae2 ? void 0 : ae2.droppable, null == ae2 ? void 0 : ae2.dragOverlay]);
      var ae2;
      const { droppableRects: se2, measureDroppableContainers: le2, measuringScheduled: ce2 } = function(e3, n2) {
        let { dragging: r2, dependencies: i3, config: a2 } = n2;
        const [s3, l3] = t.useState(null), { frequency: c3, measure: d2, strategy: u2 } = a2, f3 = t.useRef(e3), v2 = function() {
          switch (u2) {
            case exports2.MeasuringStrategy.Always:
              return false;
            case exports2.MeasuringStrategy.BeforeDragging:
              return r2;
            default:
              return !r2;
          }
        }(), g3 = o.useLatestValue(v2), p3 = t.useCallback(function(e4) {
          void 0 === e4 && (e4 = []), g3.current || l3((t2) => null === t2 ? e4 : t2.concat(e4.filter((e5) => !t2.includes(e5))));
        }, [g3]), h3 = t.useRef(null), b3 = o.useLazyMemo((t2) => {
          if (v2 && !r2) return he;
          if (!t2 || t2 === he || f3.current !== e3 || null != s3) {
            const t3 = /* @__PURE__ */ new Map();
            for (let n3 of e3) {
              if (!n3) continue;
              if (s3 && s3.length > 0 && !s3.includes(n3.id) && n3.rect.current) {
                t3.set(n3.id, n3.rect.current);
                continue;
              }
              const e4 = n3.node.current, r3 = e4 ? new Y(d2(e4), e4) : null;
              n3.rect.current = r3, r3 && t3.set(n3.id, r3);
            }
            return t3;
          }
          return t2;
        }, [e3, s3, r2, v2, d2]);
        return t.useEffect(() => {
          f3.current = e3;
        }, [e3]), t.useEffect(() => {
          v2 || p3();
        }, [r2, v2]), t.useEffect(() => {
          s3 && s3.length > 0 && l3(null);
        }, [JSON.stringify(s3)]), t.useEffect(() => {
          v2 || "number" != typeof c3 || null !== h3.current || (h3.current = setTimeout(() => {
            p3(), h3.current = null;
          }, c3));
        }, [c3, v2, p3, ...i3]), { droppableRects: b3, measureDroppableContainers: p3, measuringScheduled: null != s3 };
      }(oe2, { dragging: W2, dependencies: [X3.x, X3.y], config: ie2.droppable }), de2 = function(e3, t2) {
        const n2 = null != t2 ? e3.get(t2) : void 0, r2 = n2 ? n2.node.current : null;
        return o.useLazyMemo((e4) => {
          var n3;
          return null == t2 ? null : null != (n3 = null != r2 ? r2 : e4) ? n3 : null;
        }, [r2, t2]);
      }(H2, j2), ue2 = t.useMemo(() => ee2 ? o.getEventCoordinates(ee2) : null, [ee2]), fe2 = function() {
        const e3 = W2 && !(false === (null == Z2 ? void 0 : Z2.autoScrollEnabled)) && !("object" == typeof p2 ? false === p2.enabled : false === p2);
        return "object" == typeof p2 ? { ...p2, enabled: e3 } : { enabled: e3 };
      }(), ve2 = function(e3, t2) {
        return be(e3, t2);
      }(de2, ie2.draggable.measure);
      !function(e3) {
        let { activeNode: n2, measure: r2, initialRect: i3, config: a2 = true } = e3;
        const s3 = t.useRef(false), { x: l3, y: c3 } = "boolean" == typeof a2 ? { x: a2, y: a2 } : a2;
        o.useIsomorphicLayoutEffect(() => {
          if (!l3 && !c3 || !n2) return void (s3.current = false);
          if (s3.current || !i3) return;
          const e4 = null == n2 ? void 0 : n2.node.current;
          if (!e4 || false === e4.isConnected) return;
          const t2 = D(r2(e4), i3);
          if (l3 || (t2.x = 0), c3 || (t2.y = 0), s3.current = true, Math.abs(t2.x) > 0 || Math.abs(t2.y) > 0) {
            const n3 = k(e4);
            n3 && n3.scrollBy({ top: t2.y, left: t2.x });
          }
        }, [n2, l3, c3, i3, r2]);
      }({ activeNode: null != j2 ? H2.get(j2) : null, config: fe2.layoutShiftCompensation, initialRect: ve2, measure: ie2.draggable.measure });
      const pe2 = xe(de2, ie2.draggable.measure, ve2), ye2 = xe(de2 ? de2.parentElement : null), Oe2 = t.useRef({ activatorEvent: null, active: null, activeNode: de2, collisionRect: null, collisions: null, droppableRects: se2, draggableNodes: H2, draggingNode: null, draggingNodeRect: null, droppableContainers: V2, over: null, scrollableAncestors: [], scrollAdjustedTranslate: null }), Ae2 = V2.getNodeFor(null == (i2 = Oe2.current.over) ? void 0 : i2.id), Le2 = function(e3) {
        let { measure: n2 } = e3;
        const [r2, i3] = t.useState(null), a2 = me({ callback: t.useCallback((e4) => {
          for (const { target: t2 } of e4) if (o.isHTMLElement(t2)) {
            i3((e5) => {
              const r3 = n2(t2);
              return e5 ? { ...e5, width: r3.width, height: r3.height } : r3;
            });
            break;
          }
        }, [n2]) }), s3 = t.useCallback((e4) => {
          const t2 = Re(e4);
          null == a2 || a2.disconnect(), t2 && (null == a2 || a2.observe(t2)), i3(t2 ? n2(t2) : null);
        }, [n2, a2]), [l3, c3] = o.useNodeRef(s3);
        return t.useMemo(() => ({ nodeRef: l3, rect: r2, setRef: c3 }), [r2, l3, c3]);
      }({ measure: ie2.dragOverlay.measure }), We2 = null != (s2 = Le2.nodeRef.current) ? s2 : de2, Ue2 = W2 ? null != (l2 = Le2.rect) ? l2 : pe2 : null, je2 = Boolean(Le2.nodeRef.current && Le2.rect), qe2 = D(He2 = je2 ? null : pe2, be(He2));
      var He2;
      const Xe2 = Ee(We2 ? o.getWindow(We2) : null), Ye2 = function(e3) {
        const n2 = t.useRef(e3), r2 = o.useLazyMemo((t2) => e3 ? t2 && t2 !== we && e3 && n2.current && e3.parentNode === n2.current.parentNode ? t2 : L(e3) : we, [e3]);
        return t.useEffect(() => {
          n2.current = e3;
        }, [e3]), r2;
      }(W2 ? null != Ae2 ? Ae2 : de2 : null), Ve2 = function(e3, n2) {
        void 0 === n2 && (n2 = O);
        const [r2] = e3, i3 = Ee(r2 ? o.getWindow(r2) : null), [a2, s3] = t.useState(De);
        function l3() {
          s3(() => e3.length ? e3.map((e4) => z(e4) ? i3 : new Y(n2(e4), e4)) : De);
        }
        const c3 = me({ callback: l3 });
        return o.useIsomorphicLayoutEffect(() => {
          null == c3 || c3.disconnect(), l3(), e3.forEach((e4) => null == c3 ? void 0 : c3.observe(e4));
        }, [e3]), a2;
      }(Ye2), Je2 = Be(w2, { transform: { x: X3.x - qe2.x, y: X3.y - qe2.y, scaleX: 1, scaleY: 1 }, activatorEvent: ee2, active: G2, activeNodeRect: pe2, containerNodeRect: ye2, draggingNodeRect: Ue2, over: Oe2.current.over, overlayNodeRect: Le2.rect, scrollableAncestors: Ye2, scrollableAncestorRects: Ve2, windowRect: Xe2 }), _e2 = ue2 ? o.add(ue2, X3) : null, Ge2 = function(e3) {
        const [n2, r2] = t.useState(null), i3 = t.useRef(e3), a2 = t.useCallback((e4) => {
          const t2 = T(e4.target);
          t2 && r2((e5) => e5 ? (e5.set(t2, I(t2)), new Map(e5)) : null);
        }, []);
        return t.useEffect(() => {
          const t2 = i3.current;
          if (e3 !== t2) {
            n3(t2);
            const o2 = e3.map((e4) => {
              const t3 = T(e4);
              return t3 ? (t3.addEventListener("scroll", a2, { passive: true }), [t3, I(t3)]) : null;
            }).filter((e4) => null != e4);
            r2(o2.length ? new Map(o2) : null), i3.current = e3;
          }
          return () => {
            n3(e3), n3(t2);
          };
          function n3(e4) {
            e4.forEach((e5) => {
              const t3 = T(e5);
              null == t3 || t3.removeEventListener("scroll", a2);
            });
          }
        }, [a2, e3]), t.useMemo(() => e3.length ? n2 ? Array.from(n2.values()).reduce((e4, t2) => o.add(e4, t2), v) : q(e3) : v, [e3, n2]);
      }(Ye2), Qe2 = Ce(Ge2), Ze2 = Ce(Ge2, [pe2]), $e2 = o.add(Je2, Qe2), et2 = Ue2 ? S(Ue2, Je2) : null, tt2 = G2 && et2 ? m2({ active: G2, collisionRect: et2, droppableRects: se2, droppableContainers: oe2, pointerCoordinates: _e2 }) : null, nt = y(tt2, "id"), [rt, ot] = t.useState(null), it = function(e3, t2, n2) {
        return { ...e3, scaleX: t2 && n2 ? t2.width / n2.width : 1, scaleY: t2 && n2 ? t2.height / n2.height : 1 };
      }(je2 ? Je2 : o.add(Je2, Ze2), null != (c2 = null == rt ? void 0 : rt.rect) ? c2 : null, pe2), at = t.useRef(null), st = t.useCallback((e3, t2) => {
        let { sensor: n2, options: o2 } = t2;
        if (null == Q2.current) return;
        const i3 = H2.get(Q2.current);
        if (!i3) return;
        const a2 = e3.nativeEvent, s3 = new n2({ active: Q2.current, activeNode: i3, event: a2, options: o2, context: Oe2, onAbort(e4) {
          if (!H2.get(e4)) return;
          const { onDragAbort: t3 } = ne2.current, n3 = { id: e4 };
          null == t3 || t3(n3), A2({ type: "onDragAbort", event: n3 });
        }, onPending(e4, t3, n3, r2) {
          if (!H2.get(e4)) return;
          const { onDragPending: o3 } = ne2.current, i4 = { id: e4, constraint: t3, initialCoordinates: n3, offset: r2 };
          null == o3 || o3(i4), A2({ type: "onDragPending", event: i4 });
        }, onStart(e4) {
          const t3 = Q2.current;
          if (null == t3) return;
          const n3 = H2.get(t3);
          if (!n3) return;
          const { onDragStart: o3 } = ne2.current, i4 = { activatorEvent: a2, active: { id: t3, data: n3.data, rect: _2 } };
          r.unstable_batchedUpdates(() => {
            null == o3 || o3(i4), F2(Fe.Initializing), N2({ type: u.DragStart, initialCoordinates: e4, active: t3 }), A2({ type: "onDragStart", event: i4 }), $2(at.current), te2(a2);
          });
        }, onMove(e4) {
          N2({ type: u.DragMove, coordinates: e4 });
        }, onEnd: l3(u.DragEnd), onCancel: l3(u.DragCancel) });
        function l3(e4) {
          return async function() {
            const { active: t3, collisions: n3, over: o3, scrollAdjustedTranslate: i4 } = Oe2.current;
            let s4 = null;
            if (t3 && i4) {
              const { cancelDrop: r2 } = ne2.current;
              s4 = { activatorEvent: a2, active: t3, collisions: n3, delta: i4, over: o3 }, e4 === u.DragEnd && "function" == typeof r2 && await Promise.resolve(r2(s4)) && (e4 = u.DragCancel);
            }
            Q2.current = null, r.unstable_batchedUpdates(() => {
              N2({ type: e4 }), F2(Fe.Uninitialized), ot(null), $2(null), te2(null), at.current = null;
              const t4 = e4 === u.DragEnd ? "onDragEnd" : "onDragCancel";
              if (s4) {
                const e5 = ne2.current[t4];
                null == e5 || e5(s4), A2({ type: t4, event: s4 });
              }
            });
          };
        }
        at.current = s3;
      }, [H2]), lt = function(e3, n2) {
        return t.useMemo(() => e3.reduce((e4, t2) => {
          const { sensor: r2 } = t2;
          return [...e4, ...r2.activators.map((e5) => ({ eventName: e5.eventName, handler: n2(e5.handler, t2) }))];
        }, []), [e3, n2]);
      }(b2, t.useCallback((e3, t2) => (n2, r2) => {
        const o2 = n2.nativeEvent, i3 = H2.get(r2);
        null !== Q2.current || !i3 || o2.dndKit || o2.defaultPrevented || true === e3(n2, t2.options, { active: i3 }) && (o2.dndKit = { capturedBy: t2.sensor }, Q2.current = r2, st(n2, t2));
      }, [H2, st]));
      !function(e3) {
        t.useEffect(() => {
          if (!o.canUseDOM) return;
          const t2 = e3.map((e4) => {
            let { sensor: t3 } = e4;
            return null == t3.setup ? void 0 : t3.setup();
          });
          return () => {
            for (const e4 of t2) null == e4 || e4();
          };
        }, e3.map((e4) => {
          let { sensor: t2 } = e4;
          return t2;
        }));
      }(b2), o.useIsomorphicLayoutEffect(() => {
        pe2 && P2 === Fe.Initializing && F2(Fe.Initialized);
      }, [pe2, P2]), t.useEffect(() => {
        const { onDragMove: e3 } = ne2.current, { active: t2, activatorEvent: n2, collisions: o2, over: i3 } = Oe2.current;
        if (!t2 || !n2) return;
        const a2 = { active: t2, activatorEvent: n2, collisions: o2, delta: { x: $e2.x, y: $e2.y }, over: i3 };
        r.unstable_batchedUpdates(() => {
          null == e3 || e3(a2), A2({ type: "onDragMove", event: a2 });
        });
      }, [$e2.x, $e2.y]), t.useEffect(() => {
        const { active: e3, activatorEvent: t2, collisions: n2, droppableContainers: o2, scrollAdjustedTranslate: i3 } = Oe2.current;
        if (!e3 || null == Q2.current || !t2 || !i3) return;
        const { onDragOver: a2 } = ne2.current, s3 = o2.get(nt), l3 = s3 && s3.rect.current ? { id: s3.id, rect: s3.rect.current, data: s3.data, disabled: s3.disabled } : null, c3 = { active: e3, activatorEvent: t2, collisions: n2, delta: { x: i3.x, y: i3.y }, over: l3 };
        r.unstable_batchedUpdates(() => {
          ot(l3), null == a2 || a2(c3), A2({ type: "onDragOver", event: c3 });
        });
      }, [nt]), o.useIsomorphicLayoutEffect(() => {
        Oe2.current = { activatorEvent: ee2, active: G2, activeNode: de2, collisionRect: et2, collisions: tt2, droppableRects: se2, draggableNodes: H2, draggingNode: We2, draggingNodeRect: Ue2, droppableContainers: V2, over: rt, scrollableAncestors: Ye2, scrollAdjustedTranslate: $e2 }, _2.current = { initial: Ue2, translated: et2 };
      }, [G2, de2, tt2, et2, H2, We2, Ue2, se2, V2, rt, Ye2, $e2]), function(e3) {
        let { acceleration: n2, activator: r2 = exports2.AutoScrollActivator.Pointer, canScroll: i3, draggingRect: a2, enabled: s3, interval: l3 = 5, order: c3 = exports2.TraversalOrder.TreeOrder, pointerCoordinates: d2, scrollableAncestors: u2, scrollableAncestorRects: f3, delta: v2, threshold: g3 } = e3;
        const p3 = function(e4) {
          let { delta: t2, disabled: n3 } = e4;
          const r3 = o.usePrevious(t2);
          return o.useLazyMemo((e5) => {
            if (n3 || !r3 || !e5) return ge;
            const o2 = Math.sign(t2.x - r3.x), i4 = Math.sign(t2.y - r3.y);
            return { x: { [B.Backward]: e5.x[B.Backward] || -1 === o2, [B.Forward]: e5.x[B.Forward] || 1 === o2 }, y: { [B.Backward]: e5.y[B.Backward] || -1 === i4, [B.Forward]: e5.y[B.Forward] || 1 === i4 } };
          }, [n3, t2, r3]);
        }({ delta: v2, disabled: !s3 }), [h3, b3] = o.useInterval(), m3 = t.useRef({ x: 0, y: 0 }), y2 = t.useRef({ x: 0, y: 0 }), x3 = t.useMemo(() => {
          switch (r2) {
            case exports2.AutoScrollActivator.Pointer:
              return d2 ? { top: d2.y, bottom: d2.y, left: d2.x, right: d2.x } : null;
            case exports2.AutoScrollActivator.DraggableRect:
              return a2;
          }
        }, [r2, a2, d2]), w3 = t.useRef(null), C2 = t.useCallback(() => {
          const e4 = w3.current;
          e4 && e4.scrollBy(m3.current.x * y2.current.x, m3.current.y * y2.current.y);
        }, []), E3 = t.useMemo(() => c3 === exports2.TraversalOrder.TreeOrder ? [...u2].reverse() : u2, [c3, u2]);
        t.useEffect(() => {
          if (s3 && u2.length && x3) {
            for (const e4 of E3) {
              if (false === (null == i3 ? void 0 : i3(e4))) continue;
              const t2 = u2.indexOf(e4), r3 = f3[t2];
              if (!r3) continue;
              const { direction: o2, speed: a3 } = U(e4, r3, x3, n2, g3);
              for (const e5 of ["x", "y"]) p3[e5][o2[e5]] || (a3[e5] = 0, o2[e5] = 0);
              if (a3.x > 0 || a3.y > 0) return b3(), w3.current = e4, h3(C2, l3), m3.current = a3, void (y2.current = o2);
            }
            m3.current = { x: 0, y: 0 }, y2.current = { x: 0, y: 0 }, b3();
          } else b3();
        }, [n2, C2, i3, b3, s3, l3, JSON.stringify(x3), JSON.stringify(p3), h3, u2, E3, f3, JSON.stringify(g3)]);
      }({ ...fe2, delta: X3, draggingRect: et2, pointerCoordinates: _e2, scrollableAncestors: Ye2, scrollableAncestorRects: Ve2 });
      const ct = t.useMemo(() => ({ active: G2, activeNode: de2, activeNodeRect: pe2, activatorEvent: ee2, collisions: tt2, containerNodeRect: ye2, dragOverlay: Le2, draggableNodes: H2, droppableContainers: V2, droppableRects: se2, over: rt, measureDroppableContainers: le2, scrollableAncestors: Ye2, scrollableAncestorRects: Ve2, measuringConfiguration: ie2, measuringScheduled: ce2, windowRect: Xe2 }), [G2, de2, pe2, ee2, tt2, ye2, Le2, H2, V2, se2, rt, le2, Ye2, Ve2, ie2, ce2, Xe2]), dt = t.useMemo(() => ({ activatorEvent: ee2, activators: lt, active: G2, activeNodeRect: pe2, ariaDescribedById: { draggable: re2 }, dispatch: N2, draggableNodes: H2, over: rt, measureDroppableContainers: le2 }), [ee2, lt, G2, pe2, N2, re2, H2, rt, le2]);
      return n.createElement(a.Provider, { value: K2 }, n.createElement(ke.Provider, { value: dt }, n.createElement(Te.Provider, { value: ct }, n.createElement(ze.Provider, { value: it }, h2)), n.createElement(Ie, { disabled: false === (null == g2 ? void 0 : g2.restoreFocus) })), n.createElement(d, { ...g2, hiddenTextDescribedById: re2 }));
    });
    var Ue = t.createContext(null);
    var je = "button";
    function qe() {
      return t.useContext(Te);
    }
    var He = { timeout: 25 };
    function Xe(e2) {
      let { animation: r2, children: i2 } = e2;
      const [a2, s2] = t.useState(null), [l2, c2] = t.useState(null), d2 = o.usePrevious(i2);
      return i2 || a2 || !d2 || s2(d2), o.useIsomorphicLayoutEffect(() => {
        if (!l2) return;
        const e3 = null == a2 ? void 0 : a2.props.id;
        null != (null == a2 ? void 0 : a2.key) && null != e3 ? Promise.resolve(r2(e3, l2)).then(() => {
          s2(null);
        }) : s2(null);
      }, [r2, a2, l2]), n.createElement(n.Fragment, null, i2, a2 ? t.cloneElement(a2, { ref: c2 }) : null);
    }
    var Ye = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    function Ve(e2) {
      let { children: t2 } = e2;
      return n.createElement(ke.Provider, { value: Le }, n.createElement(ze.Provider, { value: Ye }, t2));
    }
    var Je = { position: "fixed", touchAction: "none" };
    var _e = (e2) => o.isKeyboardEvent(e2) ? "transform 250ms ease" : void 0;
    var Ge = t.forwardRef((e2, t2) => {
      let { as: r2, activatorEvent: i2, adjustScale: a2, children: s2, className: l2, rect: c2, style: d2, transform: u2, transition: f2 = _e } = e2;
      if (!c2) return null;
      const v2 = a2 ? u2 : { ...u2, scaleX: 1, scaleY: 1 }, g2 = { ...Je, width: c2.width, height: c2.height, top: c2.top, left: c2.left, transform: o.CSS.Transform.toString(v2), transformOrigin: a2 && i2 ? p(i2, c2) : void 0, transition: "function" == typeof f2 ? f2(i2) : f2, ...d2 };
      return n.createElement(r2, { className: l2, style: g2, ref: t2 }, s2);
    });
    var Qe = (e2) => (t2) => {
      let { active: n2, dragOverlay: r2 } = t2;
      const o2 = {}, { styles: i2, className: a2 } = e2;
      if (null != i2 && i2.active) for (const [e3, t3] of Object.entries(i2.active)) void 0 !== t3 && (o2[e3] = n2.node.style.getPropertyValue(e3), n2.node.style.setProperty(e3, t3));
      if (null != i2 && i2.dragOverlay) for (const [e3, t3] of Object.entries(i2.dragOverlay)) void 0 !== t3 && r2.node.style.setProperty(e3, t3);
      return null != a2 && a2.active && n2.node.classList.add(a2.active), null != a2 && a2.dragOverlay && r2.node.classList.add(a2.dragOverlay), function() {
        for (const [e3, t3] of Object.entries(o2)) n2.node.style.setProperty(e3, t3);
        null != a2 && a2.active && n2.node.classList.remove(a2.active);
      };
    };
    var Ze = { duration: 250, easing: "ease", keyframes: (e2) => {
      let { transform: { initial: t2, final: n2 } } = e2;
      return [{ transform: o.CSS.Transform.toString(t2) }, { transform: o.CSS.Transform.toString(n2) }];
    }, sideEffects: Qe({ styles: { active: { opacity: "0" } } }) };
    var $e = 0;
    function et(e2) {
      return t.useMemo(() => {
        if (null != e2) return $e++, $e;
      }, [e2]);
    }
    var tt = n.memo((e2) => {
      let { adjustScale: r2 = false, children: i2, dropAnimation: a2, style: s2, transition: l2, modifiers: c2, wrapperElement: d2 = "div", className: u2, zIndex: f2 = 999 } = e2;
      const { activatorEvent: v2, active: g2, activeNodeRect: p2, containerNodeRect: h2, draggableNodes: b2, droppableContainers: m2, dragOverlay: y2, over: x2, measuringConfiguration: w2, scrollableAncestors: C2, scrollableAncestorRects: E2, windowRect: D2 } = qe(), R2 = t.useContext(ze), S2 = et(null == g2 ? void 0 : g2.id), N2 = Be(c2, { activatorEvent: v2, active: g2, activeNodeRect: p2, containerNodeRect: h2, draggingNodeRect: y2.rect, over: x2, overlayNodeRect: y2.rect, scrollableAncestors: C2, scrollableAncestorRects: E2, transform: R2, windowRect: D2 }), O2 = be(p2), A2 = function(e3) {
        let { config: t2, draggableNodes: n2, droppableContainers: r3, measuringConfiguration: i3 } = e3;
        return o.useEvent((e4, a3) => {
          if (null === t2) return;
          const s3 = n2.get(e4);
          if (!s3) return;
          const l3 = s3.node.current;
          if (!l3) return;
          const c3 = Re(a3);
          if (!c3) return;
          const { transform: d3 } = o.getWindow(a3).getComputedStyle(a3), u3 = M(d3);
          if (!u3) return;
          const f3 = "function" == typeof t2 ? t2 : function(e5) {
            const { duration: t3, easing: n3, sideEffects: r4, keyframes: o2 } = { ...Ze, ...e5 };
            return (e6) => {
              let { active: i4, dragOverlay: a4, transform: s4, ...l4 } = e6;
              if (!t3) return;
              const c4 = { x: s4.x - (a4.rect.left - i4.rect.left), y: s4.y - (a4.rect.top - i4.rect.top), scaleX: 1 !== s4.scaleX ? i4.rect.width * s4.scaleX / a4.rect.width : 1, scaleY: 1 !== s4.scaleY ? i4.rect.height * s4.scaleY / a4.rect.height : 1 }, d4 = o2({ ...l4, active: i4, dragOverlay: a4, transform: { initial: s4, final: c4 } }), [u4] = d4, f4 = d4[d4.length - 1];
              if (JSON.stringify(u4) === JSON.stringify(f4)) return;
              const v3 = null == r4 ? void 0 : r4({ active: i4, dragOverlay: a4, ...l4 }), g3 = a4.node.animate(d4, { duration: t3, easing: n3, fill: "forwards" });
              return new Promise((e7) => {
                g3.onfinish = () => {
                  null == v3 || v3(), e7();
                };
              });
            };
          }(t2);
          return H(l3, i3.draggable.measure), f3({ active: { id: e4, data: s3.data, node: l3, rect: i3.draggable.measure(l3) }, draggableNodes: n2, dragOverlay: { node: a3, rect: i3.dragOverlay.measure(c3) }, droppableContainers: r3, measuringConfiguration: i3, transform: u3 });
        });
      }({ config: a2, draggableNodes: b2, droppableContainers: m2, measuringConfiguration: w2 });
      return n.createElement(Ve, null, n.createElement(Xe, { animation: A2 }, g2 && S2 ? n.createElement(Ge, { key: S2, id: g2.id, ref: O2 ? y2.setRef : void 0, as: d2, activatorEvent: v2, adjustScale: r2, className: u2, transition: l2, rect: O2, style: { zIndex: f2, ...s2 }, transform: N2 }, i2) : null));
    });
    exports2.DndContext = We, exports2.DragOverlay = tt, exports2.KeyboardSensor = te, exports2.MouseSensor = ce, exports2.PointerSensor = ae, exports2.TouchSensor = ue, exports2.applyModifiers = Be, exports2.closestCenter = (e2) => {
      let { collisionRect: t2, droppableRects: n2, droppableContainers: r2 } = e2;
      const o2 = x(t2, t2.left, t2.top), i2 = [];
      for (const e3 of r2) {
        const { id: t3 } = e3, r3 = n2.get(t3);
        if (r3) {
          const n3 = g(x(r3), o2);
          i2.push({ id: t3, data: { droppableContainer: e3, value: n3 } });
        }
      }
      return i2.sort(h);
    }, exports2.closestCorners = (e2) => {
      let { collisionRect: t2, droppableRects: n2, droppableContainers: r2 } = e2;
      const o2 = m(t2), i2 = [];
      for (const e3 of r2) {
        const { id: t3 } = e3, r3 = n2.get(t3);
        if (r3) {
          const n3 = m(r3), a2 = o2.reduce((e4, t4, r4) => e4 + g(n3[r4], t4), 0), s2 = Number((a2 / 4).toFixed(4));
          i2.push({ id: t3, data: { droppableContainer: e3, value: s2 } });
        }
      }
      return i2.sort(h);
    }, exports2.defaultAnnouncements = c, exports2.defaultCoordinates = v, exports2.defaultDropAnimation = Ze, exports2.defaultDropAnimationSideEffects = Qe, exports2.defaultKeyboardCoordinateGetter = ee, exports2.defaultScreenReaderInstructions = l, exports2.getClientRect = O, exports2.getFirstCollision = y, exports2.getScrollableAncestors = L, exports2.pointerWithin = (e2) => {
      let { droppableContainers: t2, droppableRects: n2, pointerCoordinates: r2 } = e2;
      if (!r2) return [];
      const o2 = [];
      for (const e3 of t2) {
        const { id: t3 } = e3, i2 = n2.get(t3);
        if (i2 && E(r2, i2)) {
          const n3 = m(i2).reduce((e4, t4) => e4 + g(r2, t4), 0), a2 = Number((n3 / 4).toFixed(4));
          o2.push({ id: t3, data: { droppableContainer: e3, value: a2 } });
        }
      }
      return o2.sort(h);
    }, exports2.rectIntersection = C, exports2.useDndContext = qe, exports2.useDndMonitor = s, exports2.useDraggable = function(e2) {
      let { id: n2, data: r2, disabled: i2 = false, attributes: a2 } = e2;
      const s2 = o.useUniqueId("Draggable"), { activators: l2, activatorEvent: c2, active: d2, activeNodeRect: u2, ariaDescribedById: f2, draggableNodes: v2, over: g2 } = t.useContext(ke), { role: p2 = je, roleDescription: h2 = "draggable", tabIndex: b2 = 0 } = null != a2 ? a2 : {}, m2 = (null == d2 ? void 0 : d2.id) === n2, y2 = t.useContext(m2 ? ze : Ue), [x2, w2] = o.useNodeRef(), [C2, E2] = o.useNodeRef(), D2 = function(e3, n3) {
        return t.useMemo(() => e3.reduce((e4, t2) => {
          let { eventName: r3, handler: o2 } = t2;
          return e4[r3] = (e5) => {
            o2(e5, n3);
          }, e4;
        }, {}), [e3, n3]);
      }(l2, n2), R2 = o.useLatestValue(r2);
      return o.useIsomorphicLayoutEffect(() => (v2.set(n2, { id: n2, key: s2, node: x2, activatorNode: C2, data: R2 }), () => {
        const e3 = v2.get(n2);
        e3 && e3.key === s2 && v2.delete(n2);
      }), [v2, n2]), { active: d2, activatorEvent: c2, activeNodeRect: u2, attributes: t.useMemo(() => ({ role: p2, tabIndex: b2, "aria-disabled": i2, "aria-pressed": !(!m2 || p2 !== je) || void 0, "aria-roledescription": h2, "aria-describedby": f2.draggable }), [i2, p2, b2, m2, h2, f2.draggable]), isDragging: m2, listeners: i2 ? void 0 : D2, node: x2, over: g2, setNodeRef: w2, setActivatorNodeRef: E2, transform: y2 };
    }, exports2.useDroppable = function(e2) {
      let { data: n2, disabled: r2 = false, id: i2, resizeObserverConfig: a2 } = e2;
      const s2 = o.useUniqueId("Droppable"), { active: l2, dispatch: c2, over: d2, measureDroppableContainers: f2 } = t.useContext(ke), v2 = t.useRef({ disabled: r2 }), g2 = t.useRef(false), p2 = t.useRef(null), h2 = t.useRef(null), { disabled: b2, updateMeasurementsFor: m2, timeout: y2 } = { ...He, ...a2 }, x2 = o.useLatestValue(null != m2 ? m2 : i2), w2 = me({ callback: t.useCallback(() => {
        g2.current ? (null != h2.current && clearTimeout(h2.current), h2.current = setTimeout(() => {
          f2(Array.isArray(x2.current) ? x2.current : [x2.current]), h2.current = null;
        }, y2)) : g2.current = true;
      }, [y2]), disabled: b2 || !l2 }), C2 = t.useCallback((e3, t2) => {
        w2 && (t2 && (w2.unobserve(t2), g2.current = false), e3 && w2.observe(e3));
      }, [w2]), [E2, D2] = o.useNodeRef(C2), R2 = o.useLatestValue(n2);
      return t.useEffect(() => {
        w2 && E2.current && (w2.disconnect(), g2.current = false, w2.observe(E2.current));
      }, [E2, w2]), t.useEffect(() => (c2({ type: u.RegisterDroppable, element: { id: i2, key: s2, disabled: r2, node: E2, rect: p2, data: R2 } }), () => c2({ type: u.UnregisterDroppable, key: s2, id: i2 })), [i2]), t.useEffect(() => {
        r2 !== v2.current.disabled && (c2({ type: u.SetDroppableDisabled, id: i2, key: s2, disabled: r2 }), v2.current.disabled = r2);
      }, [i2, s2, r2, c2]), { active: l2, rect: p2, isOver: (null == d2 ? void 0 : d2.id) === i2, node: E2, over: d2, setNodeRef: D2 };
    }, exports2.useSensor = function(e2, n2) {
      return t.useMemo(() => ({ sensor: e2, options: null != n2 ? n2 : {} }), [e2, n2]);
    }, exports2.useSensors = function() {
      for (var e2 = arguments.length, n2 = new Array(e2), r2 = 0; r2 < e2; r2++) n2[r2] = arguments[r2];
      return t.useMemo(() => [...n2].filter((e3) => null != e3), [...n2]);
    };
  }
});

// node_modules/.pnpm/@dnd-kit+core@6.3.1_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/@dnd-kit/core/dist/index.js
var require_dist3 = __commonJS({
  "node_modules/.pnpm/@dnd-kit+core@6.3.1_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/@dnd-kit/core/dist/index.js"(exports2, module2) {
    "use strict";
    if (true) {
      module2.exports = require_core_cjs_production_min();
    } else {
      module2.exports = null;
    }
  }
});

// node_modules/.pnpm/@dnd-kit+sortable@8.0.0_@dnd-kit+core@6.3.1_react-dom@18.2.0_react@18.2.0__react@18.2.0__react@18.2.0/node_modules/@dnd-kit/sortable/dist/sortable.cjs.production.min.js
var require_sortable_cjs_production_min = __commonJS({
  "node_modules/.pnpm/@dnd-kit+sortable@8.0.0_@dnd-kit+core@6.3.1_react-dom@18.2.0_react@18.2.0__react@18.2.0__react@18.2.0/node_modules/@dnd-kit/sortable/dist/sortable.cjs.production.min.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var e;
    var t = require("react");
    var r = (e = t) && "object" == typeof e && "default" in e ? e.default : e;
    var n = require_dist3();
    var o = require_dist();
    function i(e2, t2, r2) {
      const n2 = e2.slice();
      return n2.splice(r2 < 0 ? n2.length + r2 : r2, 0, n2.splice(t2, 1)[0]), n2;
    }
    function a(e2, t2) {
      return e2.reduce((e3, r2, n2) => {
        const o2 = t2.get(r2);
        return o2 && (e3[n2] = o2), e3;
      }, Array(e2.length));
    }
    function s(e2) {
      return null !== e2 && e2 >= 0;
    }
    var d = { scaleX: 1, scaleY: 1 };
    var l = (e2) => {
      let { rects: t2, activeIndex: r2, overIndex: n2, index: o2 } = e2;
      const a2 = i(t2, n2, r2), s2 = t2[o2], d2 = a2[o2];
      return d2 && s2 ? { x: d2.left - s2.left, y: d2.top - s2.top, scaleX: d2.width / s2.width, scaleY: d2.height / s2.height } : null;
    };
    var c = { scaleX: 1, scaleY: 1 };
    var u = r.createContext({ activeIndex: -1, containerId: "Sortable", disableTransforms: false, items: [], overIndex: -1, useDragOverlay: false, sortedRects: [], strategy: l, disabled: { draggable: false, droppable: false } });
    var f = (e2) => {
      let { id: t2, items: r2, activeIndex: n2, overIndex: o2 } = e2;
      return i(r2, n2, o2).indexOf(t2);
    };
    var p = (e2) => {
      let { containerId: t2, isSorting: r2, wasDragging: n2, index: o2, items: i2, newIndex: a2, previousItems: s2, previousContainerId: d2, transition: l2 } = e2;
      return !(!l2 || !n2 || s2 !== i2 && o2 === a2 || !r2 && (a2 === o2 || t2 !== d2));
    };
    var g = { duration: 200, easing: "ease" };
    var b = o.CSS.Transition.toString({ property: "transform", duration: 0, easing: "linear" });
    var x = { roleDescription: "sortable" };
    function v(e2) {
      if (!e2) return false;
      const t2 = e2.data.current;
      return !!(t2 && "sortable" in t2 && "object" == typeof t2.sortable && "containerId" in t2.sortable && "items" in t2.sortable && "index" in t2.sortable);
    }
    var h = [n.KeyboardCode.Down, n.KeyboardCode.Right, n.KeyboardCode.Up, n.KeyboardCode.Left];
    function I(e2, t2) {
      return !(!v(e2) || !v(t2)) && e2.data.current.sortable.containerId === t2.data.current.sortable.containerId;
    }
    exports2.SortableContext = function(e2) {
      let { children: i2, id: s2, items: d2, strategy: c2 = l, disabled: f2 = false } = e2;
      const { active: p2, dragOverlay: g2, droppableRects: b2, over: x2, measureDroppableContainers: v2 } = n.useDndContext(), h2 = o.useUniqueId("Sortable", s2), I2 = Boolean(null !== g2.rect), y = t.useMemo(() => d2.map((e3) => "object" == typeof e3 && "id" in e3 ? e3.id : e3), [d2]), m = null != p2, w = p2 ? y.indexOf(p2.id) : -1, C = x2 ? y.indexOf(x2.id) : -1, R = t.useRef(y), S = !function(e3, t2) {
        if (e3 === t2) return true;
        if (e3.length !== t2.length) return false;
        for (let r2 = 0; r2 < e3.length; r2++) if (e3[r2] !== t2[r2]) return false;
        return true;
      }(y, R.current), D = -1 !== C && -1 === w || S, O = /* @__PURE__ */ function(e3) {
        return "boolean" == typeof e3 ? { draggable: e3, droppable: e3 } : e3;
      }(f2);
      o.useIsomorphicLayoutEffect(() => {
        S && m && v2(y);
      }, [S, y, m, v2]), t.useEffect(() => {
        R.current = y;
      }, [y]);
      const N = t.useMemo(() => ({ activeIndex: w, containerId: h2, disabled: O, disableTransforms: D, items: y, overIndex: C, useDragOverlay: I2, sortedRects: a(y, b2), strategy: c2 }), [w, h2, O.draggable, O.droppable, D, y, C, b2, I2, c2]);
      return r.createElement(u.Provider, { value: N }, i2);
    }, exports2.arrayMove = i, exports2.arraySwap = function(e2, t2, r2) {
      const n2 = e2.slice();
      return n2[t2] = e2[r2], n2[r2] = e2[t2], n2;
    }, exports2.defaultAnimateLayoutChanges = p, exports2.defaultNewIndexGetter = f, exports2.hasSortableData = v, exports2.horizontalListSortingStrategy = (e2) => {
      var t2;
      let { rects: r2, activeNodeRect: n2, activeIndex: o2, overIndex: i2, index: a2 } = e2;
      const s2 = null != (t2 = r2[o2]) ? t2 : n2;
      if (!s2) return null;
      const l2 = function(e3, t3, r3) {
        const n3 = e3[t3], o3 = e3[t3 - 1], i3 = e3[t3 + 1];
        return n3 && (o3 || i3) ? r3 < t3 ? o3 ? n3.left - (o3.left + o3.width) : i3.left - (n3.left + n3.width) : i3 ? i3.left - (n3.left + n3.width) : n3.left - (o3.left + o3.width) : 0;
      }(r2, a2, o2);
      if (a2 === o2) {
        const e3 = r2[i2];
        return e3 ? { x: o2 < i2 ? e3.left + e3.width - (s2.left + s2.width) : e3.left - s2.left, y: 0, ...d } : null;
      }
      return a2 > o2 && a2 <= i2 ? { x: -s2.width - l2, y: 0, ...d } : a2 < o2 && a2 >= i2 ? { x: s2.width + l2, y: 0, ...d } : { x: 0, y: 0, ...d };
    }, exports2.rectSortingStrategy = l, exports2.rectSwappingStrategy = (e2) => {
      let t2, r2, { activeIndex: n2, index: o2, rects: i2, overIndex: a2 } = e2;
      return o2 === n2 && (t2 = i2[o2], r2 = i2[a2]), o2 === a2 && (t2 = i2[o2], r2 = i2[n2]), r2 && t2 ? { x: r2.left - t2.left, y: r2.top - t2.top, scaleX: r2.width / t2.width, scaleY: r2.height / t2.height } : null;
    }, exports2.sortableKeyboardCoordinates = (e2, t2) => {
      let { context: { active: r2, collisionRect: i2, droppableRects: a2, droppableContainers: s2, over: d2, scrollableAncestors: l2 } } = t2;
      if (h.includes(e2.code)) {
        if (e2.preventDefault(), !r2 || !i2) return;
        const t3 = [];
        s2.getEnabled().forEach((r3) => {
          if (!r3 || null != r3 && r3.disabled) return;
          const o2 = a2.get(r3.id);
          if (o2) switch (e2.code) {
            case n.KeyboardCode.Down:
              i2.top < o2.top && t3.push(r3);
              break;
            case n.KeyboardCode.Up:
              i2.top > o2.top && t3.push(r3);
              break;
            case n.KeyboardCode.Left:
              i2.left > o2.left && t3.push(r3);
              break;
            case n.KeyboardCode.Right:
              i2.left < o2.left && t3.push(r3);
          }
        });
        const f2 = n.closestCorners({ active: r2, collisionRect: i2, droppableRects: a2, droppableContainers: t3, pointerCoordinates: null });
        let p2 = n.getFirstCollision(f2, "id");
        if (p2 === (null == d2 ? void 0 : d2.id) && f2.length > 1 && (p2 = f2[1].id), null != p2) {
          const e3 = s2.get(r2.id), t4 = s2.get(p2), d3 = t4 ? a2.get(t4.id) : null, f3 = null == t4 ? void 0 : t4.node.current;
          if (f3 && d3 && e3 && t4) {
            const r3 = n.getScrollableAncestors(f3).some((e4, t5) => l2[t5] !== e4), a3 = I(e3, t4), s3 = (u2 = t4, !(!v(c2 = e3) || !v(u2)) && !!I(c2, u2) && c2.data.current.sortable.index < u2.data.current.sortable.index), p3 = r3 || !a3 ? { x: 0, y: 0 } : { x: s3 ? i2.width - d3.width : 0, y: s3 ? i2.height - d3.height : 0 }, g2 = { x: d3.left, y: d3.top };
            return p3.x && p3.y ? g2 : o.subtract(g2, p3);
          }
        }
      }
      var c2, u2;
    }, exports2.useSortable = function(e2) {
      let { animateLayoutChanges: r2 = p, attributes: i2, disabled: a2, data: d2, getNewIndex: l2 = f, id: c2, strategy: v2, resizeObserverConfig: h2, transition: I2 = g } = e2;
      const { items: y, containerId: m, activeIndex: w, disabled: C, disableTransforms: R, sortedRects: S, overIndex: D, useDragOverlay: O, strategy: N } = t.useContext(u), E = function(e3, t2) {
        var r3, n2;
        return "boolean" == typeof e3 ? { draggable: e3, droppable: false } : { draggable: null != (r3 = null == e3 ? void 0 : e3.draggable) ? r3 : t2.draggable, droppable: null != (n2 = null == e3 ? void 0 : e3.droppable) ? n2 : t2.droppable };
      }(a2, C), K = y.indexOf(c2), L = t.useMemo(() => ({ sortable: { containerId: m, index: K, items: y }, ...d2 }), [m, d2, K, y]), T = t.useMemo(() => y.slice(y.indexOf(c2)), [y, c2]), { rect: M, node: A, isOver: k, setNodeRef: X2 } = n.useDroppable({ id: c2, data: L, disabled: E.droppable, resizeObserverConfig: { updateMeasurementsFor: T, ...h2 } }), { active: Y, activatorEvent: j, activeNodeRect: q, attributes: z, setNodeRef: U, listeners: B, isDragging: F, over: P, setActivatorNodeRef: _, transform: G } = n.useDraggable({ id: c2, data: L, attributes: { ...x, ...i2 }, disabled: E.draggable }), H = o.useCombinedRefs(X2, U), J = Boolean(Y), Q = J && !R && s(w) && s(D), V = !O && F, W = V && Q ? G : null, Z = Q ? null != W ? W : (null != v2 ? v2 : N)({ rects: S, activeNodeRect: q, activeIndex: w, overIndex: D, index: K }) : null, $ = s(w) && s(D) ? l2({ id: c2, items: y, activeIndex: w, overIndex: D }) : K, ee = null == Y ? void 0 : Y.id, te = t.useRef({ activeId: ee, items: y, newIndex: $, containerId: m }), re = y !== te.current.items, ne = r2({ active: Y, containerId: m, isDragging: F, isSorting: J, id: c2, index: K, items: y, newIndex: te.current.newIndex, previousItems: te.current.items, previousContainerId: te.current.containerId, transition: I2, wasDragging: null != te.current.activeId }), oe = function(e3) {
        let { disabled: r3, index: i3, node: a3, rect: s2 } = e3;
        const [d3, l3] = t.useState(null), c3 = t.useRef(i3);
        return o.useIsomorphicLayoutEffect(() => {
          if (!r3 && i3 !== c3.current && a3.current) {
            const e4 = s2.current;
            if (e4) {
              const t2 = n.getClientRect(a3.current, { ignoreTransform: true }), r4 = { x: e4.left - t2.left, y: e4.top - t2.top, scaleX: e4.width / t2.width, scaleY: e4.height / t2.height };
              (r4.x || r4.y) && l3(r4);
            }
          }
          i3 !== c3.current && (c3.current = i3);
        }, [r3, i3, a3, s2]), t.useEffect(() => {
          d3 && l3(null);
        }, [d3]), d3;
      }({ disabled: !ne, index: K, node: A, rect: M });
      return t.useEffect(() => {
        J && te.current.newIndex !== $ && (te.current.newIndex = $), m !== te.current.containerId && (te.current.containerId = m), y !== te.current.items && (te.current.items = y);
      }, [J, $, m, y]), t.useEffect(() => {
        if (ee === te.current.activeId) return;
        if (ee && !te.current.activeId) return void (te.current.activeId = ee);
        const e3 = setTimeout(() => {
          te.current.activeId = ee;
        }, 50);
        return () => clearTimeout(e3);
      }, [ee]), { active: Y, activeIndex: w, attributes: z, data: L, rect: M, index: K, newIndex: $, items: y, isOver: k, isSorting: J, isDragging: F, listeners: B, node: A, overIndex: D, over: P, setNodeRef: H, setActivatorNodeRef: _, setDroppableNodeRef: X2, setDraggableNodeRef: U, transform: null != oe ? oe : Z, transition: oe || re && te.current.newIndex === K ? b : V && !o.isKeyboardEvent(j) || !I2 ? void 0 : J || ne ? o.CSS.Transition.toString({ ...I2, property: "transform" }) : void 0 };
    }, exports2.verticalListSortingStrategy = (e2) => {
      var t2;
      let { activeIndex: r2, activeNodeRect: n2, index: o2, rects: i2, overIndex: a2 } = e2;
      const s2 = null != (t2 = i2[r2]) ? t2 : n2;
      if (!s2) return null;
      if (o2 === r2) {
        const e3 = i2[a2];
        return e3 ? { x: 0, y: r2 < a2 ? e3.top + e3.height - (s2.top + s2.height) : e3.top - s2.top, ...c } : null;
      }
      const d2 = function(e3, t3, r3) {
        const n3 = e3[t3], o3 = e3[t3 - 1], i3 = e3[t3 + 1];
        return n3 ? r3 < t3 ? o3 ? n3.top - (o3.top + o3.height) : i3 ? i3.top - (n3.top + n3.height) : 0 : i3 ? i3.top - (n3.top + n3.height) : o3 ? n3.top - (o3.top + o3.height) : 0 : 0;
      }(i2, o2, r2);
      return o2 > r2 && o2 <= a2 ? { x: 0, y: -s2.height - d2, ...c } : o2 < r2 && o2 >= a2 ? { x: 0, y: s2.height + d2, ...c } : { x: 0, y: 0, ...c };
    };
  }
});

// node_modules/.pnpm/@dnd-kit+sortable@8.0.0_@dnd-kit+core@6.3.1_react-dom@18.2.0_react@18.2.0__react@18.2.0__react@18.2.0/node_modules/@dnd-kit/sortable/dist/index.js
var require_dist4 = __commonJS({
  "node_modules/.pnpm/@dnd-kit+sortable@8.0.0_@dnd-kit+core@6.3.1_react-dom@18.2.0_react@18.2.0__react@18.2.0__react@18.2.0/node_modules/@dnd-kit/sortable/dist/index.js"(exports2, module2) {
    "use strict";
    if (true) {
      module2.exports = require_sortable_cjs_production_min();
    } else {
      module2.exports = null;
    }
  }
});

// node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/tslib.es6.mjs
var tslib_es6_exports = {};
__export(tslib_es6_exports, {
  __addDisposableResource: () => __addDisposableResource,
  __assign: () => __assign,
  __asyncDelegator: () => __asyncDelegator,
  __asyncGenerator: () => __asyncGenerator,
  __asyncValues: () => __asyncValues,
  __await: () => __await,
  __awaiter: () => __awaiter,
  __classPrivateFieldGet: () => __classPrivateFieldGet,
  __classPrivateFieldIn: () => __classPrivateFieldIn,
  __classPrivateFieldSet: () => __classPrivateFieldSet,
  __createBinding: () => __createBinding,
  __decorate: () => __decorate,
  __disposeResources: () => __disposeResources,
  __esDecorate: () => __esDecorate,
  __exportStar: () => __exportStar,
  __extends: () => __extends,
  __generator: () => __generator,
  __importDefault: () => __importDefault,
  __importStar: () => __importStar,
  __makeTemplateObject: () => __makeTemplateObject,
  __metadata: () => __metadata,
  __param: () => __param,
  __propKey: () => __propKey,
  __read: () => __read,
  __rest: () => __rest,
  __rewriteRelativeImportExtension: () => __rewriteRelativeImportExtension,
  __runInitializers: () => __runInitializers,
  __setFunctionName: () => __setFunctionName,
  __spread: () => __spread,
  __spreadArray: () => __spreadArray,
  __spreadArrays: () => __spreadArrays,
  __values: () => __values,
  default: () => tslib_es6_default
});
function __extends(d, b) {
  if (typeof b !== "function" && b !== null)
    throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
function __rest(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
    t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
        t[p[i]] = s[p[i]];
    }
  return t;
}
function __decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function __param(paramIndex, decorator) {
  return function(target, key) {
    decorator(target, key, paramIndex);
  };
}
function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) {
    if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
    return f;
  }
  var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _, done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
    var context = {};
    for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
    for (var p in contextIn.access) context.access[p] = contextIn.access[p];
    context.addInitializer = function(f) {
      if (done) throw new TypeError("Cannot add initializers after decoration has completed");
      extraInitializers.push(accept(f || null));
    };
    var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
    if (kind === "accessor") {
      if (result === void 0) continue;
      if (result === null || typeof result !== "object") throw new TypeError("Object expected");
      if (_ = accept(result.get)) descriptor.get = _;
      if (_ = accept(result.set)) descriptor.set = _;
      if (_ = accept(result.init)) initializers.unshift(_);
    } else if (_ = accept(result)) {
      if (kind === "field") initializers.unshift(_);
      else descriptor[key] = _;
    }
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
}
function __runInitializers(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) {
    value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  }
  return useValue ? value : void 0;
}
function __propKey(x) {
  return typeof x === "symbol" ? x : "".concat(x);
}
function __setFunctionName(f, name, prefix) {
  if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
  return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
}
function __metadata(metadataKey, metadataValue) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
function __generator(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1) throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
  return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0:
        case 1:
          t = op;
          break;
        case 4:
          _.label++;
          return { value: op[1], done: false };
        case 5:
          _.label++;
          y = op[1];
          op = [0];
          continue;
        case 7:
          op = _.ops.pop();
          _.trys.pop();
          continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
            _ = 0;
            continue;
          }
          if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
            _.label = op[1];
            break;
          }
          if (op[0] === 6 && _.label < t[1]) {
            _.label = t[1];
            t = op;
            break;
          }
          if (t && _.label < t[2]) {
            _.label = t[2];
            _.ops.push(op);
            break;
          }
          if (t[2]) _.ops.pop();
          _.trys.pop();
          continue;
      }
      op = body.call(thisArg, _);
    } catch (e) {
      op = [6, e];
      y = 0;
    } finally {
      f = t = 0;
    }
    if (op[0] & 5) throw op[1];
    return { value: op[0] ? op[1] : void 0, done: true };
  }
}
function __exportStar(m, o) {
  for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}
function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
    next: function() {
      if (o && i >= o.length) o = void 0;
      return { value: o && o[i++], done: !o };
    }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
}
function __spread() {
  for (var ar = [], i = 0; i < arguments.length; i++)
    ar = ar.concat(__read(arguments[i]));
  return ar;
}
function __spreadArrays() {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
  for (var r = Array(s), k = 0, i = 0; i < il; i++)
    for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
      r[k] = a[j];
  return r;
}
function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
}
function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}
function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function() {
    return this;
  }, i;
  function awaitReturn(f) {
    return function(v) {
      return Promise.resolve(v).then(f, reject);
    };
  }
  function verb(n, f) {
    if (g[n]) {
      i[n] = function(v) {
        return new Promise(function(a, b) {
          q.push([n, v, a, b]) > 1 || resume(n, v);
        });
      };
      if (f) i[n] = f(i[n]);
    }
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
  }
}
function __asyncDelegator(o) {
  var i, p;
  return i = {}, verb("next"), verb("throw", function(e) {
    throw e;
  }), verb("return"), i[Symbol.iterator] = function() {
    return this;
  }, i;
  function verb(n, f) {
    i[n] = o[n] ? function(v) {
      return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v;
    } : f;
  }
}
function __asyncValues(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
    return this;
  }, i);
  function verb(n) {
    i[n] = o[n] && function(v) {
      return new Promise(function(resolve, reject) {
        v = o[n](v), settle(resolve, reject, v.done, v.value);
      });
    };
  }
  function settle(resolve, reject, d, v) {
    Promise.resolve(v).then(function(v2) {
      resolve({ value: v2, done: d });
    }, reject);
  }
}
function __makeTemplateObject(cooked, raw) {
  if (Object.defineProperty) {
    Object.defineProperty(cooked, "raw", { value: raw });
  } else {
    cooked.raw = raw;
  }
  return cooked;
}
function __importStar(mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) {
    for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
  }
  __setModuleDefault(result, mod);
  return result;
}
function __importDefault(mod) {
  return mod && mod.__esModule ? mod : { default: mod };
}
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
function __classPrivateFieldIn(state, receiver) {
  if (receiver === null || typeof receiver !== "object" && typeof receiver !== "function") throw new TypeError("Cannot use 'in' operator on non-object");
  return typeof state === "function" ? receiver === state : state.has(receiver);
}
function __addDisposableResource(env2, value, async) {
  if (value !== null && value !== void 0) {
    if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
    var dispose, inner;
    if (async) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      dispose = value[Symbol.asyncDispose];
    }
    if (dispose === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      dispose = value[Symbol.dispose];
      if (async) inner = dispose;
    }
    if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
    if (inner) dispose = function() {
      try {
        inner.call(this);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    env2.stack.push({ value, dispose, async });
  } else if (async) {
    env2.stack.push({ async: true });
  }
  return value;
}
function __disposeResources(env2) {
  function fail(e) {
    env2.error = env2.hasError ? new _SuppressedError(e, env2.error, "An error was suppressed during disposal.") : e;
    env2.hasError = true;
  }
  var r, s = 0;
  function next() {
    while (r = env2.stack.pop()) {
      try {
        if (!r.async && s === 1) return s = 0, env2.stack.push(r), Promise.resolve().then(next);
        if (r.dispose) {
          var result = r.dispose.call(r.value);
          if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
            fail(e);
            return next();
          });
        } else s |= 1;
      } catch (e) {
        fail(e);
      }
    }
    if (s === 1) return env2.hasError ? Promise.reject(env2.error) : Promise.resolve();
    if (env2.hasError) throw env2.error;
  }
  return next();
}
function __rewriteRelativeImportExtension(path, preserveJsx) {
  if (typeof path === "string" && /^\.\.?\//.test(path)) {
    return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function(m, tsx, d, ext, cm) {
      return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : d + ext + "." + cm.toLowerCase() + "js";
    });
  }
  return path;
}
var extendStatics, __assign, __createBinding, __setModuleDefault, ownKeys, _SuppressedError, tslib_es6_default;
var init_tslib_es6 = __esm({
  "node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/tslib.es6.mjs"() {
    extendStatics = function(d, b) {
      extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
        d2.__proto__ = b2;
      } || function(d2, b2) {
        for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
      };
      return extendStatics(d, b);
    };
    __assign = function() {
      __assign = Object.assign || function __assign2(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    __createBinding = Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    };
    __setModuleDefault = Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    };
    ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o2) {
        var ar = [];
        for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
      var e = new Error(message);
      return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };
    tslib_es6_default = {
      __extends,
      __assign,
      __rest,
      __decorate,
      __param,
      __esDecorate,
      __runInitializers,
      __propKey,
      __setFunctionName,
      __metadata,
      __awaiter,
      __generator,
      __createBinding,
      __exportStar,
      __values,
      __read,
      __spread,
      __spreadArrays,
      __spreadArray,
      __await,
      __asyncGenerator,
      __asyncDelegator,
      __asyncValues,
      __makeTemplateObject,
      __importStar,
      __importDefault,
      __classPrivateFieldGet,
      __classPrivateFieldSet,
      __classPrivateFieldIn,
      __addDisposableResource,
      __disposeResources,
      __rewriteRelativeImportExtension
    };
  }
});

// node_modules/.pnpm/react-remove-scroll-bar@2.3.8_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll-bar/dist/es5/constants.js
var require_constants = __commonJS({
  "node_modules/.pnpm/react-remove-scroll-bar@2.3.8_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll-bar/dist/es5/constants.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.removedBarSizeVariable = exports2.noScrollbarsClassName = exports2.fullWidthClassName = exports2.zeroRightClassName = void 0;
    exports2.zeroRightClassName = "right-scroll-bar-position";
    exports2.fullWidthClassName = "width-before-scroll-bar";
    exports2.noScrollbarsClassName = "with-scroll-bars-hidden";
    exports2.removedBarSizeVariable = "--removed-body-scroll-bar-size";
  }
});

// node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/assignRef.js
var require_assignRef = __commonJS({
  "node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/assignRef.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.assignRef = void 0;
    function assignRef(ref, value) {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref) {
        ref.current = value;
      }
      return ref;
    }
    exports2.assignRef = assignRef;
  }
});

// node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/useRef.js
var require_useRef = __commonJS({
  "node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/useRef.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.useCallbackRef = void 0;
    var react_1 = require("react");
    function useCallbackRef2(initialValue, callback) {
      var ref = (0, react_1.useState)(function() {
        return {
          // value
          value: initialValue,
          // last callback
          callback,
          // "memoized" public interface
          facade: {
            get current() {
              return ref.value;
            },
            set current(value) {
              var last = ref.value;
              if (last !== value) {
                ref.value = value;
                ref.callback(value, last);
              }
            }
          }
        };
      })[0];
      ref.callback = callback;
      return ref.facade;
    }
    exports2.useCallbackRef = useCallbackRef2;
  }
});

// node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/createRef.js
var require_createRef = __commonJS({
  "node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/createRef.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createCallbackRef = void 0;
    function createCallbackRef(callback) {
      var current = null;
      return {
        get current() {
          return current;
        },
        set current(value) {
          var last = current;
          if (last !== value) {
            current = value;
            callback(value, last);
          }
        }
      };
    }
    exports2.createCallbackRef = createCallbackRef;
  }
});

// node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/mergeRef.js
var require_mergeRef = __commonJS({
  "node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/mergeRef.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.mergeRefs = void 0;
    var assignRef_1 = require_assignRef();
    var createRef_1 = require_createRef();
    function mergeRefs(refs) {
      return (0, createRef_1.createCallbackRef)(function(newValue) {
        return refs.forEach(function(ref) {
          return (0, assignRef_1.assignRef)(ref, newValue);
        });
      });
    }
    exports2.mergeRefs = mergeRefs;
  }
});

// node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/useMergeRef.js
var require_useMergeRef = __commonJS({
  "node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/useMergeRef.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.useMergeRefs = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var React50 = tslib_1.__importStar(require("react"));
    var assignRef_1 = require_assignRef();
    var useRef_1 = require_useRef();
    var useIsomorphicLayoutEffect = typeof window !== "undefined" ? React50.useLayoutEffect : React50.useEffect;
    var currentValues = /* @__PURE__ */ new WeakMap();
    function useMergeRefs(refs, defaultValue) {
      var callbackRef = (0, useRef_1.useCallbackRef)(defaultValue || null, function(newValue) {
        return refs.forEach(function(ref) {
          return (0, assignRef_1.assignRef)(ref, newValue);
        });
      });
      useIsomorphicLayoutEffect(function() {
        var oldValue = currentValues.get(callbackRef);
        if (oldValue) {
          var prevRefs_1 = new Set(oldValue);
          var nextRefs_1 = new Set(refs);
          var current_1 = callbackRef.current;
          prevRefs_1.forEach(function(ref) {
            if (!nextRefs_1.has(ref)) {
              (0, assignRef_1.assignRef)(ref, null);
            }
          });
          nextRefs_1.forEach(function(ref) {
            if (!prevRefs_1.has(ref)) {
              (0, assignRef_1.assignRef)(ref, current_1);
            }
          });
        }
        currentValues.set(callbackRef, refs);
      }, [refs]);
      return callbackRef;
    }
    exports2.useMergeRefs = useMergeRefs;
  }
});

// node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/useTransformRef.js
var require_useTransformRef = __commonJS({
  "node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/useTransformRef.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.useTransformRef = void 0;
    var assignRef_1 = require_assignRef();
    var useRef_1 = require_useRef();
    function useTransformRef(ref, transformer) {
      return (0, useRef_1.useCallbackRef)(null, function(value) {
        return (0, assignRef_1.assignRef)(ref, transformer(value));
      });
    }
    exports2.useTransformRef = useTransformRef;
  }
});

// node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/transformRef.js
var require_transformRef = __commonJS({
  "node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/transformRef.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.transformRef = void 0;
    var assignRef_1 = require_assignRef();
    var createRef_1 = require_createRef();
    function transformRef(ref, transformer) {
      return (0, createRef_1.createCallbackRef)(function(value) {
        return (0, assignRef_1.assignRef)(ref, transformer(value));
      });
    }
    exports2.transformRef = transformRef;
  }
});

// node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/refToCallback.js
var require_refToCallback = __commonJS({
  "node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/refToCallback.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.useRefToCallback = exports2.refToCallback = void 0;
    function refToCallback(ref) {
      return function(newValue) {
        if (typeof ref === "function") {
          ref(newValue);
        } else if (ref) {
          ref.current = newValue;
        }
      };
    }
    exports2.refToCallback = refToCallback;
    var nullCallback = function() {
      return null;
    };
    var weakMem = /* @__PURE__ */ new WeakMap();
    var weakMemoize = function(ref) {
      var usedRef = ref || nullCallback;
      var storedRef = weakMem.get(usedRef);
      if (storedRef) {
        return storedRef;
      }
      var cb = refToCallback(usedRef);
      weakMem.set(usedRef, cb);
      return cb;
    };
    function useRefToCallback(ref) {
      return weakMemoize(ref);
    }
    exports2.useRefToCallback = useRefToCallback;
  }
});

// node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/index.js
var require_es5 = __commonJS({
  "node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@19.2.0_react@18.2.0/node_modules/use-callback-ref/dist/es5/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.useRefToCallback = exports2.refToCallback = exports2.transformRef = exports2.useTransformRef = exports2.useMergeRefs = exports2.mergeRefs = exports2.createCallbackRef = exports2.useCallbackRef = exports2.assignRef = void 0;
    var assignRef_1 = require_assignRef();
    Object.defineProperty(exports2, "assignRef", { enumerable: true, get: function() {
      return assignRef_1.assignRef;
    } });
    var useRef_1 = require_useRef();
    Object.defineProperty(exports2, "useCallbackRef", { enumerable: true, get: function() {
      return useRef_1.useCallbackRef;
    } });
    var createRef_1 = require_createRef();
    Object.defineProperty(exports2, "createCallbackRef", { enumerable: true, get: function() {
      return createRef_1.createCallbackRef;
    } });
    var mergeRef_1 = require_mergeRef();
    Object.defineProperty(exports2, "mergeRefs", { enumerable: true, get: function() {
      return mergeRef_1.mergeRefs;
    } });
    var useMergeRef_1 = require_useMergeRef();
    Object.defineProperty(exports2, "useMergeRefs", { enumerable: true, get: function() {
      return useMergeRef_1.useMergeRefs;
    } });
    var useTransformRef_1 = require_useTransformRef();
    Object.defineProperty(exports2, "useTransformRef", { enumerable: true, get: function() {
      return useTransformRef_1.useTransformRef;
    } });
    var transformRef_1 = require_transformRef();
    Object.defineProperty(exports2, "transformRef", { enumerable: true, get: function() {
      return transformRef_1.transformRef;
    } });
    var refToCallback_1 = require_refToCallback();
    Object.defineProperty(exports2, "refToCallback", { enumerable: true, get: function() {
      return refToCallback_1.refToCallback;
    } });
    Object.defineProperty(exports2, "useRefToCallback", { enumerable: true, get: function() {
      return refToCallback_1.useRefToCallback;
    } });
  }
});

// node_modules/.pnpm/detect-node-es@1.1.0/node_modules/detect-node-es/es5/node.js
var require_node = __commonJS({
  "node_modules/.pnpm/detect-node-es@1.1.0/node_modules/detect-node-es/es5/node.js"(exports2, module2) {
    module2.exports.isNode = Object.prototype.toString.call(typeof process !== "undefined" ? process : 0) === "[object process]";
  }
});

// node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/env.js
var require_env = __commonJS({
  "node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/env.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.env = void 0;
    var detect_node_es_1 = require_node();
    exports2.env = {
      isNode: detect_node_es_1.isNode,
      forceCache: false
    };
  }
});

// node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/hook.js
var require_hook = __commonJS({
  "node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/hook.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.useSidecar = void 0;
    var react_1 = require("react");
    var env_1 = require_env();
    var cache = /* @__PURE__ */ new WeakMap();
    var NO_OPTIONS = {};
    function useSidecar(importer, effect) {
      var options = effect && effect.options || NO_OPTIONS;
      if (env_1.env.isNode && !options.ssr) {
        return [null, null];
      }
      return useRealSidecar(importer, effect);
    }
    exports2.useSidecar = useSidecar;
    function useRealSidecar(importer, effect) {
      var options = effect && effect.options || NO_OPTIONS;
      var couldUseCache = env_1.env.forceCache || env_1.env.isNode && !!options.ssr || !options.async;
      var _a = (0, react_1.useState)(couldUseCache ? function() {
        return cache.get(importer);
      } : void 0), Car = _a[0], setCar = _a[1];
      var _b = (0, react_1.useState)(null), error = _b[0], setError = _b[1];
      (0, react_1.useEffect)(function() {
        if (!Car) {
          importer().then(function(car) {
            var resolved = effect ? effect.read() : car.default || car;
            if (!resolved) {
              console.error("Sidecar error: with importer", importer);
              var error_1;
              if (effect) {
                console.error("Sidecar error: with medium", effect);
                error_1 = new Error("Sidecar medium was not found");
              } else {
                error_1 = new Error("Sidecar was not found in exports");
              }
              setError(function() {
                return error_1;
              });
              throw error_1;
            }
            cache.set(importer, resolved);
            setCar(function() {
              return resolved;
            });
          }, function(e) {
            return setError(function() {
              return e;
            });
          });
        }
      }, []);
      return [Car, error];
    }
  }
});

// node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/hoc.js
var require_hoc = __commonJS({
  "node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/hoc.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.sidecar = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var React50 = tslib_1.__importStar(require("react"));
    var hook_1 = require_hook();
    function sidecar(importer, errorComponent) {
      var ErrorCase = function() {
        return errorComponent;
      };
      return function Sidecar(props) {
        var _a = (0, hook_1.useSidecar)(importer, props.sideCar), Car = _a[0], error = _a[1];
        if (error && errorComponent) {
          return ErrorCase;
        }
        return Car ? React50.createElement(Car, tslib_1.__assign({}, props)) : null;
      };
    }
    exports2.sidecar = sidecar;
  }
});

// node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/config.js
var require_config = __commonJS({
  "node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/config.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.setConfig = exports2.config = void 0;
    exports2.config = {
      onError: function(e) {
        return console.error(e);
      }
    };
    var setConfig = function(conf) {
      Object.assign(exports2.config, conf);
    };
    exports2.setConfig = setConfig;
  }
});

// node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/medium.js
var require_medium = __commonJS({
  "node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/medium.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createSidecarMedium = exports2.createMedium = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    function ItoI(a) {
      return a;
    }
    function innerCreateMedium(defaults, middleware) {
      if (middleware === void 0) {
        middleware = ItoI;
      }
      var buffer = [];
      var assigned = false;
      var medium = {
        read: function() {
          if (assigned) {
            throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
          }
          if (buffer.length) {
            return buffer[buffer.length - 1];
          }
          return defaults;
        },
        useMedium: function(data) {
          var item = middleware(data, assigned);
          buffer.push(item);
          return function() {
            buffer = buffer.filter(function(x) {
              return x !== item;
            });
          };
        },
        assignSyncMedium: function(cb) {
          assigned = true;
          while (buffer.length) {
            var cbs = buffer;
            buffer = [];
            cbs.forEach(cb);
          }
          buffer = {
            push: function(x) {
              return cb(x);
            },
            filter: function() {
              return buffer;
            }
          };
        },
        assignMedium: function(cb) {
          assigned = true;
          var pendingQueue = [];
          if (buffer.length) {
            var cbs = buffer;
            buffer = [];
            cbs.forEach(cb);
            pendingQueue = buffer;
          }
          var executeQueue = function() {
            var cbs2 = pendingQueue;
            pendingQueue = [];
            cbs2.forEach(cb);
          };
          var cycle = function() {
            return Promise.resolve().then(executeQueue);
          };
          cycle();
          buffer = {
            push: function(x) {
              pendingQueue.push(x);
              cycle();
            },
            filter: function(filter) {
              pendingQueue = pendingQueue.filter(filter);
              return buffer;
            }
          };
        }
      };
      return medium;
    }
    function createMedium(defaults, middleware) {
      if (middleware === void 0) {
        middleware = ItoI;
      }
      return innerCreateMedium(defaults, middleware);
    }
    exports2.createMedium = createMedium;
    function createSidecarMedium(options) {
      if (options === void 0) {
        options = {};
      }
      var medium = innerCreateMedium(null);
      medium.options = tslib_1.__assign({ async: true, ssr: false }, options);
      return medium;
    }
    exports2.createSidecarMedium = createSidecarMedium;
  }
});

// node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/renderProp.js
var require_renderProp = __commonJS({
  "node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/renderProp.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.renderCar = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var React50 = tslib_1.__importStar(require("react"));
    var react_1 = require("react");
    function renderCar(WrappedComponent, defaults) {
      function State(_a) {
        var stateRef = _a.stateRef, props = _a.props;
        var renderTarget = (0, react_1.useCallback)(function SideTarget() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          (0, react_1.useLayoutEffect)(function() {
            stateRef.current(args);
          });
          return null;
        }, []);
        return React50.createElement(WrappedComponent, tslib_1.__assign({}, props, { children: renderTarget }));
      }
      var Children5 = React50.memo(function(_a) {
        var stateRef = _a.stateRef, defaultState = _a.defaultState, children = _a.children;
        var _b = (0, react_1.useState)(defaultState.current), state = _b[0], setState = _b[1];
        (0, react_1.useEffect)(function() {
          stateRef.current = setState;
        }, []);
        return children.apply(void 0, state);
      }, function() {
        return true;
      });
      return function Combiner(props) {
        var defaultState = React50.useRef(defaults(props));
        var ref = React50.useRef(function(state) {
          return defaultState.current = state;
        });
        return React50.createElement(
          React50.Fragment,
          null,
          React50.createElement(State, { stateRef: ref, props }),
          React50.createElement(Children5, { stateRef: ref, defaultState, children: props.children })
        );
      };
    }
    exports2.renderCar = renderCar;
  }
});

// node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/exports.js
var require_exports = __commonJS({
  "node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/exports.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.exportSidecar = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var React50 = tslib_1.__importStar(require("react"));
    var SideCar = function(_a) {
      var sideCar = _a.sideCar, rest = tslib_1.__rest(_a, ["sideCar"]);
      if (!sideCar) {
        throw new Error("Sidecar: please provide `sideCar` property to import the right car");
      }
      var Target = sideCar.read();
      if (!Target) {
        throw new Error("Sidecar medium not found");
      }
      return React50.createElement(Target, tslib_1.__assign({}, rest));
    };
    SideCar.isSideCarExport = true;
    function exportSidecar(medium, exported) {
      medium.useMedium(exported);
      return SideCar;
    }
    exports2.exportSidecar = exportSidecar;
  }
});

// node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/index.js
var require_es52 = __commonJS({
  "node_modules/.pnpm/use-sidecar@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/use-sidecar/dist/es5/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.exportSidecar = exports2.renderCar = exports2.createSidecarMedium = exports2.createMedium = exports2.setConfig = exports2.useSidecar = exports2.sidecar = void 0;
    var hoc_1 = require_hoc();
    Object.defineProperty(exports2, "sidecar", { enumerable: true, get: function() {
      return hoc_1.sidecar;
    } });
    var hook_1 = require_hook();
    Object.defineProperty(exports2, "useSidecar", { enumerable: true, get: function() {
      return hook_1.useSidecar;
    } });
    var config_1 = require_config();
    Object.defineProperty(exports2, "setConfig", { enumerable: true, get: function() {
      return config_1.setConfig;
    } });
    var medium_1 = require_medium();
    Object.defineProperty(exports2, "createMedium", { enumerable: true, get: function() {
      return medium_1.createMedium;
    } });
    Object.defineProperty(exports2, "createSidecarMedium", { enumerable: true, get: function() {
      return medium_1.createSidecarMedium;
    } });
    var renderProp_1 = require_renderProp();
    Object.defineProperty(exports2, "renderCar", { enumerable: true, get: function() {
      return renderProp_1.renderCar;
    } });
    var exports_1 = require_exports();
    Object.defineProperty(exports2, "exportSidecar", { enumerable: true, get: function() {
      return exports_1.exportSidecar;
    } });
  }
});

// node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/medium.js
var require_medium2 = __commonJS({
  "node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/medium.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.effectCar = void 0;
    var use_sidecar_1 = require_es52();
    exports2.effectCar = (0, use_sidecar_1.createSidecarMedium)();
  }
});

// node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/UI.js
var require_UI = __commonJS({
  "node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/UI.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RemoveScroll = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var React50 = tslib_1.__importStar(require("react"));
    var constants_1 = require_constants();
    var use_callback_ref_1 = require_es5();
    var medium_1 = require_medium2();
    var nothing = function() {
      return;
    };
    var RemoveScroll2 = React50.forwardRef(function(props, parentRef) {
      var ref = React50.useRef(null);
      var _a = React50.useState({
        onScrollCapture: nothing,
        onWheelCapture: nothing,
        onTouchMoveCapture: nothing
      }), callbacks = _a[0], setCallbacks = _a[1];
      var forwardProps = props.forwardProps, children = props.children, className = props.className, removeScrollBar = props.removeScrollBar, enabled = props.enabled, shards = props.shards, sideCar = props.sideCar, noRelative = props.noRelative, noIsolation = props.noIsolation, inert = props.inert, allowPinchZoom = props.allowPinchZoom, _b = props.as, Container = _b === void 0 ? "div" : _b, gapMode = props.gapMode, rest = tslib_1.__rest(props, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]);
      var SideCar = sideCar;
      var containerRef = (0, use_callback_ref_1.useMergeRefs)([ref, parentRef]);
      var containerProps = tslib_1.__assign(tslib_1.__assign({}, rest), callbacks);
      return React50.createElement(
        React50.Fragment,
        null,
        enabled && React50.createElement(SideCar, { sideCar: medium_1.effectCar, removeScrollBar, shards, noRelative, noIsolation, inert, setCallbacks, allowPinchZoom: !!allowPinchZoom, lockRef: ref, gapMode }),
        forwardProps ? React50.cloneElement(React50.Children.only(children), tslib_1.__assign(tslib_1.__assign({}, containerProps), { ref: containerRef })) : React50.createElement(Container, tslib_1.__assign({}, containerProps, { className, ref: containerRef }), children)
      );
    });
    exports2.RemoveScroll = RemoveScroll2;
    RemoveScroll2.defaultProps = {
      enabled: true,
      removeScrollBar: true,
      inert: false
    };
    RemoveScroll2.classNames = {
      fullWidth: constants_1.fullWidthClassName,
      zeroRight: constants_1.zeroRightClassName
    };
  }
});

// node_modules/.pnpm/get-nonce@1.0.1/node_modules/get-nonce/dist/es5/index.js
var require_es53 = __commonJS({
  "node_modules/.pnpm/get-nonce@1.0.1/node_modules/get-nonce/dist/es5/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var currentNonce;
    exports2.setNonce = function(nonce) {
      currentNonce = nonce;
    };
    exports2.getNonce = function() {
      if (currentNonce) {
        return currentNonce;
      }
      if (typeof __webpack_nonce__ !== "undefined") {
        return __webpack_nonce__;
      }
      return void 0;
    };
  }
});

// node_modules/.pnpm/react-style-singleton@2.2.3_@types+react@19.2.0_react@18.2.0/node_modules/react-style-singleton/dist/es5/singleton.js
var require_singleton = __commonJS({
  "node_modules/.pnpm/react-style-singleton@2.2.3_@types+react@19.2.0_react@18.2.0/node_modules/react-style-singleton/dist/es5/singleton.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.stylesheetSingleton = void 0;
    var get_nonce_1 = require_es53();
    function makeStyleTag() {
      if (!document)
        return null;
      var tag = document.createElement("style");
      tag.type = "text/css";
      var nonce = (0, get_nonce_1.getNonce)();
      if (nonce) {
        tag.setAttribute("nonce", nonce);
      }
      return tag;
    }
    function injectStyles(tag, css) {
      if (tag.styleSheet) {
        tag.styleSheet.cssText = css;
      } else {
        tag.appendChild(document.createTextNode(css));
      }
    }
    function insertStyleTag(tag) {
      var head = document.head || document.getElementsByTagName("head")[0];
      head.appendChild(tag);
    }
    var stylesheetSingleton = function() {
      var counter = 0;
      var stylesheet = null;
      return {
        add: function(style) {
          if (counter == 0) {
            if (stylesheet = makeStyleTag()) {
              injectStyles(stylesheet, style);
              insertStyleTag(stylesheet);
            }
          }
          counter++;
        },
        remove: function() {
          counter--;
          if (!counter && stylesheet) {
            stylesheet.parentNode && stylesheet.parentNode.removeChild(stylesheet);
            stylesheet = null;
          }
        }
      };
    };
    exports2.stylesheetSingleton = stylesheetSingleton;
  }
});

// node_modules/.pnpm/react-style-singleton@2.2.3_@types+react@19.2.0_react@18.2.0/node_modules/react-style-singleton/dist/es5/hook.js
var require_hook2 = __commonJS({
  "node_modules/.pnpm/react-style-singleton@2.2.3_@types+react@19.2.0_react@18.2.0/node_modules/react-style-singleton/dist/es5/hook.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.styleHookSingleton = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var React50 = tslib_1.__importStar(require("react"));
    var singleton_1 = require_singleton();
    var styleHookSingleton = function() {
      var sheet = (0, singleton_1.stylesheetSingleton)();
      return function(styles, isDynamic) {
        React50.useEffect(function() {
          sheet.add(styles);
          return function() {
            sheet.remove();
          };
        }, [styles && isDynamic]);
      };
    };
    exports2.styleHookSingleton = styleHookSingleton;
  }
});

// node_modules/.pnpm/react-style-singleton@2.2.3_@types+react@19.2.0_react@18.2.0/node_modules/react-style-singleton/dist/es5/component.js
var require_component = __commonJS({
  "node_modules/.pnpm/react-style-singleton@2.2.3_@types+react@19.2.0_react@18.2.0/node_modules/react-style-singleton/dist/es5/component.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.styleSingleton = void 0;
    var hook_1 = require_hook2();
    var styleSingleton = function() {
      var useStyle = (0, hook_1.styleHookSingleton)();
      var Sheet = function(_a) {
        var styles = _a.styles, dynamic = _a.dynamic;
        useStyle(styles, dynamic);
        return null;
      };
      return Sheet;
    };
    exports2.styleSingleton = styleSingleton;
  }
});

// node_modules/.pnpm/react-style-singleton@2.2.3_@types+react@19.2.0_react@18.2.0/node_modules/react-style-singleton/dist/es5/index.js
var require_es54 = __commonJS({
  "node_modules/.pnpm/react-style-singleton@2.2.3_@types+react@19.2.0_react@18.2.0/node_modules/react-style-singleton/dist/es5/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.styleHookSingleton = exports2.stylesheetSingleton = exports2.styleSingleton = void 0;
    var component_1 = require_component();
    Object.defineProperty(exports2, "styleSingleton", { enumerable: true, get: function() {
      return component_1.styleSingleton;
    } });
    var singleton_1 = require_singleton();
    Object.defineProperty(exports2, "stylesheetSingleton", { enumerable: true, get: function() {
      return singleton_1.stylesheetSingleton;
    } });
    var hook_1 = require_hook2();
    Object.defineProperty(exports2, "styleHookSingleton", { enumerable: true, get: function() {
      return hook_1.styleHookSingleton;
    } });
  }
});

// node_modules/.pnpm/react-remove-scroll-bar@2.3.8_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll-bar/dist/es5/utils.js
var require_utils = __commonJS({
  "node_modules/.pnpm/react-remove-scroll-bar@2.3.8_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll-bar/dist/es5/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getGapWidth = exports2.zeroGap = void 0;
    exports2.zeroGap = {
      left: 0,
      top: 0,
      right: 0,
      gap: 0
    };
    var parse = function(x) {
      return parseInt(x || "", 10) || 0;
    };
    var getOffset = function(gapMode) {
      var cs = window.getComputedStyle(document.body);
      var left = cs[gapMode === "padding" ? "paddingLeft" : "marginLeft"];
      var top = cs[gapMode === "padding" ? "paddingTop" : "marginTop"];
      var right = cs[gapMode === "padding" ? "paddingRight" : "marginRight"];
      return [parse(left), parse(top), parse(right)];
    };
    var getGapWidth = function(gapMode) {
      if (gapMode === void 0) {
        gapMode = "margin";
      }
      if (typeof window === "undefined") {
        return exports2.zeroGap;
      }
      var offsets = getOffset(gapMode);
      var documentWidth = document.documentElement.clientWidth;
      var windowWidth = window.innerWidth;
      return {
        left: offsets[0],
        top: offsets[1],
        right: offsets[2],
        gap: Math.max(0, windowWidth - documentWidth + offsets[2] - offsets[0])
      };
    };
    exports2.getGapWidth = getGapWidth;
  }
});

// node_modules/.pnpm/react-remove-scroll-bar@2.3.8_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll-bar/dist/es5/component.js
var require_component2 = __commonJS({
  "node_modules/.pnpm/react-remove-scroll-bar@2.3.8_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll-bar/dist/es5/component.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RemoveScrollBar = exports2.useLockAttribute = exports2.lockAttribute = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var React50 = tslib_1.__importStar(require("react"));
    var react_style_singleton_1 = require_es54();
    var constants_1 = require_constants();
    var utils_1 = require_utils();
    var Style = (0, react_style_singleton_1.styleSingleton)();
    exports2.lockAttribute = "data-scroll-locked";
    var getStyles = function(_a, allowRelative, gapMode, important) {
      var left = _a.left, top = _a.top, right = _a.right, gap = _a.gap;
      if (gapMode === void 0) {
        gapMode = "margin";
      }
      return "\n  .".concat(constants_1.noScrollbarsClassName, " {\n   overflow: hidden ").concat(important, ";\n   padding-right: ").concat(gap, "px ").concat(important, ";\n  }\n  body[").concat(exports2.lockAttribute, "] {\n    overflow: hidden ").concat(important, ";\n    overscroll-behavior: contain;\n    ").concat([
        allowRelative && "position: relative ".concat(important, ";"),
        gapMode === "margin" && "\n    padding-left: ".concat(left, "px;\n    padding-top: ").concat(top, "px;\n    padding-right: ").concat(right, "px;\n    margin-left:0;\n    margin-top:0;\n    margin-right: ").concat(gap, "px ").concat(important, ";\n    "),
        gapMode === "padding" && "padding-right: ".concat(gap, "px ").concat(important, ";")
      ].filter(Boolean).join(""), "\n  }\n  \n  .").concat(constants_1.zeroRightClassName, " {\n    right: ").concat(gap, "px ").concat(important, ";\n  }\n  \n  .").concat(constants_1.fullWidthClassName, " {\n    margin-right: ").concat(gap, "px ").concat(important, ";\n  }\n  \n  .").concat(constants_1.zeroRightClassName, " .").concat(constants_1.zeroRightClassName, " {\n    right: 0 ").concat(important, ";\n  }\n  \n  .").concat(constants_1.fullWidthClassName, " .").concat(constants_1.fullWidthClassName, " {\n    margin-right: 0 ").concat(important, ";\n  }\n  \n  body[").concat(exports2.lockAttribute, "] {\n    ").concat(constants_1.removedBarSizeVariable, ": ").concat(gap, "px;\n  }\n");
    };
    var getCurrentUseCounter = function() {
      var counter = parseInt(document.body.getAttribute(exports2.lockAttribute) || "0", 10);
      return isFinite(counter) ? counter : 0;
    };
    var useLockAttribute = function() {
      React50.useEffect(function() {
        document.body.setAttribute(exports2.lockAttribute, (getCurrentUseCounter() + 1).toString());
        return function() {
          var newCounter = getCurrentUseCounter() - 1;
          if (newCounter <= 0) {
            document.body.removeAttribute(exports2.lockAttribute);
          } else {
            document.body.setAttribute(exports2.lockAttribute, newCounter.toString());
          }
        };
      }, []);
    };
    exports2.useLockAttribute = useLockAttribute;
    var RemoveScrollBar = function(_a) {
      var noRelative = _a.noRelative, noImportant = _a.noImportant, _b = _a.gapMode, gapMode = _b === void 0 ? "margin" : _b;
      (0, exports2.useLockAttribute)();
      var gap = React50.useMemo(function() {
        return (0, utils_1.getGapWidth)(gapMode);
      }, [gapMode]);
      return React50.createElement(Style, { styles: getStyles(gap, !noRelative, gapMode, !noImportant ? "!important" : "") });
    };
    exports2.RemoveScrollBar = RemoveScrollBar;
  }
});

// node_modules/.pnpm/react-remove-scroll-bar@2.3.8_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll-bar/dist/es5/index.js
var require_es55 = __commonJS({
  "node_modules/.pnpm/react-remove-scroll-bar@2.3.8_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll-bar/dist/es5/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getGapWidth = exports2.removedBarSizeVariable = exports2.noScrollbarsClassName = exports2.fullWidthClassName = exports2.zeroRightClassName = exports2.RemoveScrollBar = void 0;
    var component_1 = require_component2();
    Object.defineProperty(exports2, "RemoveScrollBar", { enumerable: true, get: function() {
      return component_1.RemoveScrollBar;
    } });
    var constants_1 = require_constants();
    Object.defineProperty(exports2, "zeroRightClassName", { enumerable: true, get: function() {
      return constants_1.zeroRightClassName;
    } });
    Object.defineProperty(exports2, "fullWidthClassName", { enumerable: true, get: function() {
      return constants_1.fullWidthClassName;
    } });
    Object.defineProperty(exports2, "noScrollbarsClassName", { enumerable: true, get: function() {
      return constants_1.noScrollbarsClassName;
    } });
    Object.defineProperty(exports2, "removedBarSizeVariable", { enumerable: true, get: function() {
      return constants_1.removedBarSizeVariable;
    } });
    var utils_1 = require_utils();
    Object.defineProperty(exports2, "getGapWidth", { enumerable: true, get: function() {
      return utils_1.getGapWidth;
    } });
  }
});

// node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/aggresiveCapture.js
var require_aggresiveCapture = __commonJS({
  "node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/aggresiveCapture.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.nonPassive = void 0;
    var passiveSupported = false;
    if (typeof window !== "undefined") {
      try {
        options = Object.defineProperty({}, "passive", {
          get: function() {
            passiveSupported = true;
            return true;
          }
        });
        window.addEventListener("test", options, options);
        window.removeEventListener("test", options, options);
      } catch (err) {
        passiveSupported = false;
      }
    }
    var options;
    exports2.nonPassive = passiveSupported ? { passive: false } : false;
  }
});

// node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/handleScroll.js
var require_handleScroll = __commonJS({
  "node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/handleScroll.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.handleScroll = exports2.locationCouldBeScrolled = void 0;
    var alwaysContainsScroll = function(node) {
      return node.tagName === "TEXTAREA";
    };
    var elementCanBeScrolled = function(node, overflow) {
      if (!(node instanceof Element)) {
        return false;
      }
      var styles = window.getComputedStyle(node);
      return (
        // not-not-scrollable
        styles[overflow] !== "hidden" && // contains scroll inside self
        !(styles.overflowY === styles.overflowX && !alwaysContainsScroll(node) && styles[overflow] === "visible")
      );
    };
    var elementCouldBeVScrolled = function(node) {
      return elementCanBeScrolled(node, "overflowY");
    };
    var elementCouldBeHScrolled = function(node) {
      return elementCanBeScrolled(node, "overflowX");
    };
    var locationCouldBeScrolled = function(axis, node) {
      var ownerDocument = node.ownerDocument;
      var current = node;
      do {
        if (typeof ShadowRoot !== "undefined" && current instanceof ShadowRoot) {
          current = current.host;
        }
        var isScrollable = elementCouldBeScrolled(axis, current);
        if (isScrollable) {
          var _a = getScrollVariables(axis, current), scrollHeight = _a[1], clientHeight = _a[2];
          if (scrollHeight > clientHeight) {
            return true;
          }
        }
        current = current.parentNode;
      } while (current && current !== ownerDocument.body);
      return false;
    };
    exports2.locationCouldBeScrolled = locationCouldBeScrolled;
    var getVScrollVariables = function(_a) {
      var scrollTop = _a.scrollTop, scrollHeight = _a.scrollHeight, clientHeight = _a.clientHeight;
      return [
        scrollTop,
        scrollHeight,
        clientHeight
      ];
    };
    var getHScrollVariables = function(_a) {
      var scrollLeft = _a.scrollLeft, scrollWidth = _a.scrollWidth, clientWidth = _a.clientWidth;
      return [
        scrollLeft,
        scrollWidth,
        clientWidth
      ];
    };
    var elementCouldBeScrolled = function(axis, node) {
      return axis === "v" ? elementCouldBeVScrolled(node) : elementCouldBeHScrolled(node);
    };
    var getScrollVariables = function(axis, node) {
      return axis === "v" ? getVScrollVariables(node) : getHScrollVariables(node);
    };
    var getDirectionFactor = function(axis, direction) {
      return axis === "h" && direction === "rtl" ? -1 : 1;
    };
    var handleScroll = function(axis, endTarget, event, sourceDelta, noOverscroll) {
      var directionFactor = getDirectionFactor(axis, window.getComputedStyle(endTarget).direction);
      var delta = directionFactor * sourceDelta;
      var target = event.target;
      var targetInLock = endTarget.contains(target);
      var shouldCancelScroll = false;
      var isDeltaPositive = delta > 0;
      var availableScroll = 0;
      var availableScrollTop = 0;
      do {
        if (!target) {
          break;
        }
        var _a = getScrollVariables(axis, target), position = _a[0], scroll_1 = _a[1], capacity = _a[2];
        var elementScroll = scroll_1 - capacity - directionFactor * position;
        if (position || elementScroll) {
          if (elementCouldBeScrolled(axis, target)) {
            availableScroll += elementScroll;
            availableScrollTop += position;
          }
        }
        var parent_1 = target.parentNode;
        target = parent_1 && parent_1.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? parent_1.host : parent_1;
      } while (
        // portaled content
        !targetInLock && target !== document.body || // self content
        targetInLock && (endTarget.contains(target) || endTarget === target)
      );
      if (isDeltaPositive && (noOverscroll && Math.abs(availableScroll) < 1 || !noOverscroll && delta > availableScroll)) {
        shouldCancelScroll = true;
      } else if (!isDeltaPositive && (noOverscroll && Math.abs(availableScrollTop) < 1 || !noOverscroll && -delta > availableScrollTop)) {
        shouldCancelScroll = true;
      }
      return shouldCancelScroll;
    };
    exports2.handleScroll = handleScroll;
  }
});

// node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/SideEffect.js
var require_SideEffect = __commonJS({
  "node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/SideEffect.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RemoveScrollSideCar = exports2.getDeltaXY = exports2.getTouchXY = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var React50 = tslib_1.__importStar(require("react"));
    var react_remove_scroll_bar_1 = require_es55();
    var react_style_singleton_1 = require_es54();
    var aggresiveCapture_1 = require_aggresiveCapture();
    var handleScroll_1 = require_handleScroll();
    var getTouchXY = function(event) {
      return "changedTouches" in event ? [event.changedTouches[0].clientX, event.changedTouches[0].clientY] : [0, 0];
    };
    exports2.getTouchXY = getTouchXY;
    var getDeltaXY = function(event) {
      return [event.deltaX, event.deltaY];
    };
    exports2.getDeltaXY = getDeltaXY;
    var extractRef = function(ref) {
      return ref && "current" in ref ? ref.current : ref;
    };
    var deltaCompare = function(x, y) {
      return x[0] === y[0] && x[1] === y[1];
    };
    var generateStyle = function(id) {
      return "\n  .block-interactivity-".concat(id, " {pointer-events: none;}\n  .allow-interactivity-").concat(id, " {pointer-events: all;}\n");
    };
    var idCounter = 0;
    var lockStack = [];
    function RemoveScrollSideCar(props) {
      var shouldPreventQueue = React50.useRef([]);
      var touchStartRef = React50.useRef([0, 0]);
      var activeAxis = React50.useRef();
      var id = React50.useState(idCounter++)[0];
      var Style = React50.useState(react_style_singleton_1.styleSingleton)[0];
      var lastProps = React50.useRef(props);
      React50.useEffect(function() {
        lastProps.current = props;
      }, [props]);
      React50.useEffect(function() {
        if (props.inert) {
          document.body.classList.add("block-interactivity-".concat(id));
          var allow_1 = tslib_1.__spreadArray([props.lockRef.current], (props.shards || []).map(extractRef), true).filter(Boolean);
          allow_1.forEach(function(el) {
            return el.classList.add("allow-interactivity-".concat(id));
          });
          return function() {
            document.body.classList.remove("block-interactivity-".concat(id));
            allow_1.forEach(function(el) {
              return el.classList.remove("allow-interactivity-".concat(id));
            });
          };
        }
        return;
      }, [props.inert, props.lockRef.current, props.shards]);
      var shouldCancelEvent = React50.useCallback(function(event, parent) {
        if ("touches" in event && event.touches.length === 2 || event.type === "wheel" && event.ctrlKey) {
          return !lastProps.current.allowPinchZoom;
        }
        var touch = (0, exports2.getTouchXY)(event);
        var touchStart = touchStartRef.current;
        var deltaX = "deltaX" in event ? event.deltaX : touchStart[0] - touch[0];
        var deltaY = "deltaY" in event ? event.deltaY : touchStart[1] - touch[1];
        var currentAxis;
        var target = event.target;
        var moveDirection = Math.abs(deltaX) > Math.abs(deltaY) ? "h" : "v";
        if ("touches" in event && moveDirection === "h" && target.type === "range") {
          return false;
        }
        var canBeScrolledInMainDirection = (0, handleScroll_1.locationCouldBeScrolled)(moveDirection, target);
        if (!canBeScrolledInMainDirection) {
          return true;
        }
        if (canBeScrolledInMainDirection) {
          currentAxis = moveDirection;
        } else {
          currentAxis = moveDirection === "v" ? "h" : "v";
          canBeScrolledInMainDirection = (0, handleScroll_1.locationCouldBeScrolled)(moveDirection, target);
        }
        if (!canBeScrolledInMainDirection) {
          return false;
        }
        if (!activeAxis.current && "changedTouches" in event && (deltaX || deltaY)) {
          activeAxis.current = currentAxis;
        }
        if (!currentAxis) {
          return true;
        }
        var cancelingAxis = activeAxis.current || currentAxis;
        return (0, handleScroll_1.handleScroll)(cancelingAxis, parent, event, cancelingAxis === "h" ? deltaX : deltaY, true);
      }, []);
      var shouldPrevent = React50.useCallback(function(_event) {
        var event = _event;
        if (!lockStack.length || lockStack[lockStack.length - 1] !== Style) {
          return;
        }
        var delta = "deltaY" in event ? (0, exports2.getDeltaXY)(event) : (0, exports2.getTouchXY)(event);
        var sourceEvent = shouldPreventQueue.current.filter(function(e) {
          return e.name === event.type && (e.target === event.target || event.target === e.shadowParent) && deltaCompare(e.delta, delta);
        })[0];
        if (sourceEvent && sourceEvent.should) {
          if (event.cancelable) {
            event.preventDefault();
          }
          return;
        }
        if (!sourceEvent) {
          var shardNodes = (lastProps.current.shards || []).map(extractRef).filter(Boolean).filter(function(node) {
            return node.contains(event.target);
          });
          var shouldStop = shardNodes.length > 0 ? shouldCancelEvent(event, shardNodes[0]) : !lastProps.current.noIsolation;
          if (shouldStop) {
            if (event.cancelable) {
              event.preventDefault();
            }
          }
        }
      }, []);
      var shouldCancel = React50.useCallback(function(name, delta, target, should) {
        var event = { name, delta, target, should, shadowParent: getOutermostShadowParent(target) };
        shouldPreventQueue.current.push(event);
        setTimeout(function() {
          shouldPreventQueue.current = shouldPreventQueue.current.filter(function(e) {
            return e !== event;
          });
        }, 1);
      }, []);
      var scrollTouchStart = React50.useCallback(function(event) {
        touchStartRef.current = (0, exports2.getTouchXY)(event);
        activeAxis.current = void 0;
      }, []);
      var scrollWheel = React50.useCallback(function(event) {
        shouldCancel(event.type, (0, exports2.getDeltaXY)(event), event.target, shouldCancelEvent(event, props.lockRef.current));
      }, []);
      var scrollTouchMove = React50.useCallback(function(event) {
        shouldCancel(event.type, (0, exports2.getTouchXY)(event), event.target, shouldCancelEvent(event, props.lockRef.current));
      }, []);
      React50.useEffect(function() {
        lockStack.push(Style);
        props.setCallbacks({
          onScrollCapture: scrollWheel,
          onWheelCapture: scrollWheel,
          onTouchMoveCapture: scrollTouchMove
        });
        document.addEventListener("wheel", shouldPrevent, aggresiveCapture_1.nonPassive);
        document.addEventListener("touchmove", shouldPrevent, aggresiveCapture_1.nonPassive);
        document.addEventListener("touchstart", scrollTouchStart, aggresiveCapture_1.nonPassive);
        return function() {
          lockStack = lockStack.filter(function(inst) {
            return inst !== Style;
          });
          document.removeEventListener("wheel", shouldPrevent, aggresiveCapture_1.nonPassive);
          document.removeEventListener("touchmove", shouldPrevent, aggresiveCapture_1.nonPassive);
          document.removeEventListener("touchstart", scrollTouchStart, aggresiveCapture_1.nonPassive);
        };
      }, []);
      var removeScrollBar = props.removeScrollBar, inert = props.inert;
      return React50.createElement(
        React50.Fragment,
        null,
        inert ? React50.createElement(Style, { styles: generateStyle(id) }) : null,
        removeScrollBar ? React50.createElement(react_remove_scroll_bar_1.RemoveScrollBar, { noRelative: props.noRelative, gapMode: props.gapMode }) : null
      );
    }
    exports2.RemoveScrollSideCar = RemoveScrollSideCar;
    function getOutermostShadowParent(node) {
      var shadowParent = null;
      while (node !== null) {
        if (node instanceof ShadowRoot) {
          shadowParent = node.host;
          node = node.host;
        }
        node = node.parentNode;
      }
      return shadowParent;
    }
  }
});

// node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/sidecar.js
var require_sidecar = __commonJS({
  "node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/sidecar.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var use_sidecar_1 = require_es52();
    var SideEffect_1 = require_SideEffect();
    var medium_1 = require_medium2();
    exports2.default = (0, use_sidecar_1.exportSidecar)(medium_1.effectCar, SideEffect_1.RemoveScrollSideCar);
  }
});

// node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/Combination.js
var require_Combination = __commonJS({
  "node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/Combination.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var React50 = tslib_1.__importStar(require("react"));
    var UI_1 = require_UI();
    var sidecar_1 = tslib_1.__importDefault(require_sidecar());
    var ReactRemoveScroll = React50.forwardRef(function(props, ref) {
      return React50.createElement(UI_1.RemoveScroll, tslib_1.__assign({}, props, { ref, sideCar: sidecar_1.default }));
    });
    ReactRemoveScroll.classNames = UI_1.RemoveScroll.classNames;
    exports2.default = ReactRemoveScroll;
  }
});

// node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/index.js
var require_es56 = __commonJS({
  "node_modules/.pnpm/react-remove-scroll@2.7.1_@types+react@19.2.0_react@18.2.0/node_modules/react-remove-scroll/dist/es5/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RemoveScroll = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var Combination_1 = tslib_1.__importDefault(require_Combination());
    exports2.RemoveScroll = Combination_1.default;
  }
});

// node_modules/.pnpm/aria-hidden@1.2.6/node_modules/aria-hidden/dist/es5/index.js
var require_es57 = __commonJS({
  "node_modules/.pnpm/aria-hidden@1.2.6/node_modules/aria-hidden/dist/es5/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.suppressOthers = exports2.supportsInert = exports2.inertOthers = exports2.hideOthers = void 0;
    var getDefaultParent = function(originalTarget) {
      if (typeof document === "undefined") {
        return null;
      }
      var sampleTarget = Array.isArray(originalTarget) ? originalTarget[0] : originalTarget;
      return sampleTarget.ownerDocument.body;
    };
    var counterMap = /* @__PURE__ */ new WeakMap();
    var uncontrolledNodes = /* @__PURE__ */ new WeakMap();
    var markerMap = {};
    var lockCount = 0;
    var unwrapHost = function(node) {
      return node && (node.host || unwrapHost(node.parentNode));
    };
    var correctTargets = function(parent, targets) {
      return targets.map(function(target) {
        if (parent.contains(target)) {
          return target;
        }
        var correctedTarget = unwrapHost(target);
        if (correctedTarget && parent.contains(correctedTarget)) {
          return correctedTarget;
        }
        console.error("aria-hidden", target, "in not contained inside", parent, ". Doing nothing");
        return null;
      }).filter(function(x) {
        return Boolean(x);
      });
    };
    var applyAttributeToOthers = function(originalTarget, parentNode, markerName, controlAttribute) {
      var targets = correctTargets(parentNode, Array.isArray(originalTarget) ? originalTarget : [originalTarget]);
      if (!markerMap[markerName]) {
        markerMap[markerName] = /* @__PURE__ */ new WeakMap();
      }
      var markerCounter = markerMap[markerName];
      var hiddenNodes = [];
      var elementsToKeep = /* @__PURE__ */ new Set();
      var elementsToStop = new Set(targets);
      var keep = function(el) {
        if (!el || elementsToKeep.has(el)) {
          return;
        }
        elementsToKeep.add(el);
        keep(el.parentNode);
      };
      targets.forEach(keep);
      var deep = function(parent) {
        if (!parent || elementsToStop.has(parent)) {
          return;
        }
        Array.prototype.forEach.call(parent.children, function(node) {
          if (elementsToKeep.has(node)) {
            deep(node);
          } else {
            try {
              var attr = node.getAttribute(controlAttribute);
              var alreadyHidden = attr !== null && attr !== "false";
              var counterValue = (counterMap.get(node) || 0) + 1;
              var markerValue = (markerCounter.get(node) || 0) + 1;
              counterMap.set(node, counterValue);
              markerCounter.set(node, markerValue);
              hiddenNodes.push(node);
              if (counterValue === 1 && alreadyHidden) {
                uncontrolledNodes.set(node, true);
              }
              if (markerValue === 1) {
                node.setAttribute(markerName, "true");
              }
              if (!alreadyHidden) {
                node.setAttribute(controlAttribute, "true");
              }
            } catch (e) {
              console.error("aria-hidden: cannot operate on ", node, e);
            }
          }
        });
      };
      deep(parentNode);
      elementsToKeep.clear();
      lockCount++;
      return function() {
        hiddenNodes.forEach(function(node) {
          var counterValue = counterMap.get(node) - 1;
          var markerValue = markerCounter.get(node) - 1;
          counterMap.set(node, counterValue);
          markerCounter.set(node, markerValue);
          if (!counterValue) {
            if (!uncontrolledNodes.has(node)) {
              node.removeAttribute(controlAttribute);
            }
            uncontrolledNodes.delete(node);
          }
          if (!markerValue) {
            node.removeAttribute(markerName);
          }
        });
        lockCount--;
        if (!lockCount) {
          counterMap = /* @__PURE__ */ new WeakMap();
          counterMap = /* @__PURE__ */ new WeakMap();
          uncontrolledNodes = /* @__PURE__ */ new WeakMap();
          markerMap = {};
        }
      };
    };
    var hideOthers2 = function(originalTarget, parentNode, markerName) {
      if (markerName === void 0) {
        markerName = "data-aria-hidden";
      }
      var targets = Array.from(Array.isArray(originalTarget) ? originalTarget : [originalTarget]);
      var activeParentNode = parentNode || getDefaultParent(originalTarget);
      if (!activeParentNode) {
        return function() {
          return null;
        };
      }
      targets.push.apply(targets, Array.from(activeParentNode.querySelectorAll("[aria-live], script")));
      return applyAttributeToOthers(targets, activeParentNode, markerName, "aria-hidden");
    };
    exports2.hideOthers = hideOthers2;
    var inertOthers = function(originalTarget, parentNode, markerName) {
      if (markerName === void 0) {
        markerName = "data-inert-ed";
      }
      var activeParentNode = parentNode || getDefaultParent(originalTarget);
      if (!activeParentNode) {
        return function() {
          return null;
        };
      }
      return applyAttributeToOthers(originalTarget, activeParentNode, markerName, "inert");
    };
    exports2.inertOthers = inertOthers;
    var supportsInert = function() {
      return typeof HTMLElement !== "undefined" && HTMLElement.prototype.hasOwnProperty("inert");
    };
    exports2.supportsInert = supportsInert;
    var suppressOthers = function(originalTarget, parentNode, markerName) {
      if (markerName === void 0) {
        markerName = "data-suppressed";
      }
      return ((0, exports2.supportsInert)() ? exports2.inertOthers : exports2.hideOthers)(originalTarget, parentNode, markerName);
    };
    exports2.suppressOthers = suppressOthers;
  }
});

// src/components/menu/FoodItemModal.jsx
var FoodItemModal_exports = {};
__export(FoodItemModal_exports, {
  default: () => FoodItemModal_default
});
var import_react27, import_framer_motion7, import_jsx_runtime34, backdrop, modal, FoodItemModal, FoodItemModal_default;
var init_FoodItemModal = __esm({
  "src/components/menu/FoodItemModal.jsx"() {
    import_react27 = __toESM(require("react"));
    import_framer_motion7 = require("framer-motion");
    import_jsx_runtime34 = require("react/jsx-runtime");
    backdrop = {
      visible: { opacity: 1 },
      hidden: { opacity: 0 }
    };
    modal = {
      hidden: { y: "-50px", opacity: 0 },
      visible: { y: "0", opacity: 1, transition: { delay: 0.1 } }
    };
    FoodItemModal = ({ item, onClose }) => {
      return /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
        import_framer_motion7.motion.div,
        {
          className: "fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4",
          variants: backdrop,
          initial: "hidden",
          animate: "visible",
          exit: "hidden",
          onClick: onClose,
          children: /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)(
            import_framer_motion7.motion.div,
            {
              variants: modal,
              className: "bg-white rounded-lg shadow-xl max-w-lg w-full p-8 relative",
              onClick: (e) => e.stopPropagation(),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
                  "button",
                  {
                    onClick: onClose,
                    className: "absolute top-4 right-4 text-neutral-500 hover:text-neutral-800 text-2xl",
                    children: "\xD7"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("h3", { className: "text-3xl font-bold mb-4", children: item.name }),
                /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("p", { className: "text-body mb-6", children: item.description }),
                /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("h4", { className: "font-bold text-lg mb-2", children: "Ingredients:" }),
                  /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("ul", { className: "list-disc list-inside text-neutral-600 space-y-1", children: item.ingredients.map((ingredient, index) => /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("li", { children: ingredient }, index)) })
                ] })
              ]
            }
          )
        }
      );
    };
    FoodItemModal_default = FoodItemModal;
  }
});

// src/components/menu/FeedbackForm.jsx
var FeedbackForm_exports = {};
__export(FeedbackForm_exports, {
  default: () => FeedbackForm_default
});
var import_react28, import_framer_motion8, import_jsx_runtime35, FeedbackForm, FeedbackForm_default;
var init_FeedbackForm = __esm({
  "src/components/menu/FeedbackForm.jsx"() {
    import_react28 = __toESM(require("react"));
    import_framer_motion8 = require("framer-motion");
    import_jsx_runtime35 = require("react/jsx-runtime");
    FeedbackForm = () => {
      const [formData, setFormData] = (0, import_react28.useState)({
        name: "",
        email: "",
        phone: "",
        category: "requests",
        message: ""
      });
      const [status, setStatus] = (0, import_react28.useState)({ type: "", message: "" });
      const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
      };
      const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.message) {
          setStatus({ type: "error", message: "Please enter a message before submitting." });
          return;
        }
        setStatus({ type: "loading", message: "" });
        try {
          const payload = {
            name: formData.name,
            email: formData.email,
            subject: `Happy Monday Feedback (${formData.category})`,
            message: formData.message,
            type: "feedback",
            category: formData.category
          };
          const res = await fetch("/api/messages/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const errorText = await res.text();
            console.error("API Error Response:", errorText);
            throw new Error(errorText);
          }
          setStatus({ type: "success", message: "Thank you! Your feedback has been submitted." });
          setFormData({ name: "", email: "", phone: "", category: "requests", message: "" });
          setTimeout(() => {
            setStatus({ type: "", message: "" });
          }, 5e3);
        } catch (err) {
          setStatus({
            type: "error",
            message: "Could not submit feedback. Please try again or contact us at yum@localeffortfood.com"
          });
        }
      };
      return /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { className: "max-w-2xl bg-neutral-50 border border-neutral-200 p-8 rounded-lg", children: /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { className: "grid sm:grid-cols-2 gap-6", children: /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("label", { htmlFor: "category", className: "block text-sm font-medium text-neutral-700", children: "Category" }),
          /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)(
            "select",
            {
              id: "category",
              name: "category",
              value: formData.category,
              onChange: handleChange,
              className: "mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("option", { value: "requests", children: "Requests" }),
                /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("option", { value: "quality", children: "Quality Feedback" }),
                /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("option", { value: "other", children: "Other" })
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("label", { htmlFor: "message", className: "block text-sm font-medium text-neutral-700", children: "Message" }),
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
            "textarea",
            {
              id: "message",
              name: "message",
              rows: "4",
              value: formData.message,
              onChange: handleChange,
              required: true,
              className: "mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "grid sm:grid-cols-2 gap-6", children: [
          /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("label", { htmlFor: "name", className: "block text-sm font-medium text-neutral-700", children: "Name (Optional)" }),
            /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
              "input",
              {
                type: "text",
                name: "name",
                id: "name",
                value: formData.name,
                onChange: handleChange,
                className: "mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("label", { htmlFor: "email", className: "block text-sm font-medium text-neutral-700", children: "Email (Optional)" }),
            /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
              "input",
              {
                type: "email",
                name: "email",
                id: "email",
                value: formData.email,
                onChange: handleChange,
                className: "mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
            import_framer_motion8.motion.button,
            {
              type: "submit",
              className: "btn btn-primary",
              whileHover: { scale: 1.03 },
              whileTap: { scale: 0.98 },
              disabled: status.type === "loading",
              children: status.type === "loading" ? "Sending..." : "Submit Feedback"
            }
          ),
          status.message && /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
            "p",
            {
              className: `text-sm ${status.type === "success" ? "text-green-600" : "text-red-600"}`,
              children: status.message
            }
          )
        ] })
      ] }) });
    };
    FeedbackForm_default = FeedbackForm;
  }
});

// src/components/layout/LoadingSpinner.jsx
var LoadingSpinner_exports = {};
__export(LoadingSpinner_exports, {
  LoadingSpinner: () => LoadingSpinner
});
var import_react29, import_framer_motion9, import_jsx_runtime36, LoadingSpinner;
var init_LoadingSpinner = __esm({
  "src/components/layout/LoadingSpinner.jsx"() {
    import_react29 = __toESM(require("react"));
    import_framer_motion9 = require("framer-motion");
    import_jsx_runtime36 = require("react/jsx-runtime");
    LoadingSpinner = () => /* @__PURE__ */ (0, import_jsx_runtime36.jsx)(
      import_framer_motion9.motion.div,
      {
        className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        children: /* @__PURE__ */ (0, import_jsx_runtime36.jsxs)("div", { className: "text-center", children: [
          /* @__PURE__ */ (0, import_jsx_runtime36.jsx)(
            import_framer_motion9.motion.div,
            {
              className: "w-16 h-16 mx-auto mb-4 border-4 border-orange-200 border-t-orange-500 rounded-full",
              animate: { rotate: 360 },
              transition: { duration: 1, repeat: Infinity, ease: "linear" }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime36.jsx)(
            import_framer_motion9.motion.p,
            {
              className: "text-gray-600 font-medium",
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: 0.2 },
              children: "Just a moment"
            }
          )
        ] })
      }
    );
  }
});

// src/ssr/StaticApp.jsx
var StaticApp_exports = {};
__export(StaticApp_exports, {
  default: () => StaticApp
});
module.exports = __toCommonJS(StaticApp_exports);
var import_react33 = __toESM(require("react"));
var import_react_router_dom6 = require("react-router-dom");
var import_react_helmet_async7 = __toESM(require_lib());

// src/components/layout/Header.jsx
var import_react = __toESM(require("react"));
var import_react_router_dom = require("react-router-dom");
var import_framer_motion = require("framer-motion");

// src/config/fullPageNav.js
var FULLPAGE_PAGES = [
  { id: "home", label: "Home" },
  { id: "weekly-meals", label: "Weekly Meals" },
  { id: "small-events", label: "Small Events" },
  { id: "for-businesses", label: "For Business" },
  { id: "about", label: "About" },
  { id: "local-pizza", label: "Local Pizza" }
];

// src/components/layout/Header.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var Header = () => {
  const [isOpen, setIsOpen] = (0, import_react.useState)(false);
  const navigate = (0, import_react_router_dom.useNavigate)();
  const location = (0, import_react_router_dom.useLocation)();
  const navItems = FULLPAGE_PAGES.slice(1);
  (0, import_react.useEffect)(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);
  const handleNavigate = (index) => {
    const page = FULLPAGE_PAGES[index];
    if (!page) return;
    const hash = page.id === "home" ? "" : `#${page.id}`;
    const target = hash ? `/${hash}` : "/";
    if (location.pathname !== "/") {
      navigate(target);
      setIsOpen(false);
      return;
    }
    if (typeof window !== "undefined" && typeof window.scrollToPage === "function") {
      window.scrollToPage(index);
    }
    if (hash) {
      if (location.hash !== hash) {
        navigate({ pathname: "/", hash }, { replace: true });
      }
    } else if (location.hash) {
      navigate({ pathname: "/" }, { replace: true });
    }
    setIsOpen(false);
  };
  const handleHoverOn = (event) => {
    if (event.currentTarget.dataset.active === "true") return;
    event.currentTarget.style.backgroundColor = "var(--color-bg-secondary)";
    event.currentTarget.style.color = "var(--color-text-primary)";
  };
  const handleHoverOff = (event) => {
    if (event.currentTarget.dataset.active === "true") return;
    event.currentTarget.style.backgroundColor = "transparent";
    event.currentTarget.style.color = "var(--color-text-primary)";
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "header",
    {
      className: "fixed left-0 right-0 z-50 shadow-sm",
      style: {
        top: "var(--announcement-offset, 0px)",
        backgroundColor: "var(--color-bg-page)",
        borderBottom: "1px solid var(--color-border-default)"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between px-6 py-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              onClick: () => handleNavigate(0),
              className: "flex items-center gap-3",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  import_framer_motion.motion.span,
                  {
                    className: "text-2xl font-bold tracking-tight",
                    style: {
                      color: "var(--color-text-primary)",
                      fontFamily: "'National Park', 'General Sans', sans-serif",
                      fontWeight: 700,
                      letterSpacing: "-0.02em"
                    },
                    whileHover: { scale: 1.03 },
                    transition: { type: "spring", stiffness: 300, damping: 20 },
                    children: "Local Effort"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "span",
                  {
                    className: "text-sm font-medium",
                    style: {
                      color: "var(--color-text-primary)",
                      fontFamily: "'Office Code Pro', monospace"
                    },
                    children: "always mostly local"
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", { className: "hidden md:flex gap-1", children: navItems.map((page, index) => {
            const pageIndex = index + 1;
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                "data-menu-btn": true,
                "data-page-index": pageIndex,
                "data-active": "false",
                onClick: () => handleNavigate(pageIndex),
                className: "px-4 py-2 rounded-md text-sm font-medium transition-all group",
                style: {
                  backgroundColor: "transparent",
                  color: "var(--color-text-primary)",
                  fontFamily: "'Office Code Pro', monospace"
                },
                onMouseEnter: handleHoverOn,
                onMouseLeave: handleHoverOff,
                children: page.label
              },
              page.id
            );
          }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              onClick: () => setIsOpen((v) => !v),
              className: "md:hidden z-50 w-9 h-7 flex flex-col justify-between",
              "aria-label": "Toggle menu",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "span",
                  {
                    className: `block h-0.5 w-full bg-slate-900 transition-transform ${isOpen ? "rotate-45 translate-y-[10px]" : ""}`
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "span",
                  {
                    className: `block h-0.5 w-full bg-slate-900 transition-opacity ${isOpen ? "opacity-0" : "opacity-100"}`
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "span",
                  {
                    className: `block h-0.5 w-full bg-slate-900 transition-transform ${isOpen ? "-rotate-45 -translate-y-[10px]" : ""}`
                  }
                )
              ]
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_framer_motion.AnimatePresence, { children: isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_framer_motion.motion.div,
          {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            className: "md:hidden fixed inset-0 bg-[var(--color-bg-page)]",
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              import_framer_motion.motion.nav,
              {
                initial: "hidden",
                animate: "show",
                exit: "hidden",
                variants: {
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.08, delayChildren: 0.12 }
                  }
                },
                className: "flex flex-col items-center justify-center h-full space-y-6 px-6",
                children: FULLPAGE_PAGES.map((page, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  import_framer_motion.motion.button,
                  {
                    type: "button",
                    onClick: () => handleNavigate(index),
                    className: "text-3xl uppercase text-center text-slate-900",
                    style: { fontFamily: "'Office Code Pro', monospace" },
                    variants: { hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } },
                    children: page.label
                  },
                  page.id
                ))
              }
            )
          }
        ) })
      ]
    }
  );
};

// src/store/cart/CartContext.jsx
var import_react2 = __toESM(require("react"));
var import_jsx_runtime2 = require("react/jsx-runtime");
var CartContext = (0, import_react2.createContext)(null);
function reducer(state, action) {
  switch (action.type) {
    case "init":
      return action.payload || state;
    case "add": {
      const { productId, variationId, unitPrice, title, image } = action.payload;
      const key = `${productId}:${variationId || ""}`;
      const qty = Math.max(1, action.payload.qty || 1);
      const next = { ...state, items: { ...state.items || {} } };
      const existing = next.items[key];
      next.items[key] = existing ? { ...existing, qty: existing.qty + qty } : { key, productId, variationId, unitPrice, qty, title, image };
      next.updatedAt = Date.now();
      return next;
    }
    case "remove": {
      const next = { ...state, items: { ...state.items || {} } };
      delete next.items[action.key];
      next.updatedAt = Date.now();
      return next;
    }
    case "updateQty": {
      const next = { ...state, items: { ...state.items || {} } };
      const li = next.items[action.key];
      if (!li) return state;
      li.qty = Math.max(0, action.qty);
      if (li.qty === 0) delete next.items[action.key];
      next.updatedAt = Date.now();
      return next;
    }
    case "clear":
      return { items: {}, updatedAt: Date.now() };
    default:
      return state;
  }
}
var initial = { items: {}, updatedAt: 0 };
function CartProvider({ children }) {
  const [state, dispatch] = (0, import_react2.useReducer)(reducer, initial);
  const [open, setOpen] = (0, import_react2.useState)(false);
  (0, import_react2.useEffect)(() => {
    try {
      const raw = localStorage.getItem("le_cart");
      if (raw) dispatch({ type: "init", payload: JSON.parse(raw) });
    } catch (e) {
    }
  }, []);
  (0, import_react2.useEffect)(() => {
    try {
      localStorage.setItem("le_cart", JSON.stringify(state));
    } catch (e) {
    }
  }, [state]);
  const add = (0, import_react2.useCallback)((payload) => dispatch({ type: "add", payload }), []);
  const remove = (0, import_react2.useCallback)((key) => dispatch({ type: "remove", key }), []);
  const updateQty = (0, import_react2.useCallback)((key, qty) => dispatch({ type: "updateQty", key, qty }), []);
  const clear = (0, import_react2.useCallback)(() => dispatch({ type: "clear" }), []);
  const openCart = (0, import_react2.useCallback)(() => setOpen(true), []);
  const closeCart = (0, import_react2.useCallback)(() => setOpen(false), []);
  const itemsArr = (0, import_react2.useMemo)(() => Object.values(state.items || {}), [state.items]);
  const totalQty = (0, import_react2.useMemo)(() => itemsArr.reduce((s, i) => s + (i.qty || 0), 0), [itemsArr]);
  const subtotal = (0, import_react2.useMemo)(() => itemsArr.reduce((s, i) => s + i.unitPrice * i.qty, 0), [itemsArr]);
  const value = (0, import_react2.useMemo)(() => ({
    items: itemsArr,
    map: state.items,
    totalQty,
    add,
    remove,
    updateQty,
    clear,
    subtotal,
    open,
    openCart,
    closeCart
  }), [itemsArr, state.items, totalQty, add, remove, updateQty, clear, subtotal, open, openCart, closeCart]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(CartContext.Provider, { value, children });
}
function useCart() {
  const ctx = (0, import_react2.useContext)(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

// src/components/seo/DefaultSeo.jsx
var import_react3 = __toESM(require("react"));
var import_react_helmet_async = __toESM(require_lib());
var import_react_router_dom2 = require("react-router-dom");

// src/config/siteMetadata.js
var SITE_NAME = "Local Effort Food Co.";
var SITE_URL = "https://localeffortfood.com";
var DEFAULT_DESCRIPTION = "Local Effort Food Co. is a Minneapolis personal chef team offering in-home dinners, meal prep Minneapolis plans, and small-event catering built around Minnesota-grown ingredients.";
var DEFAULT_KEYWORDS = [
  "personal chef",
  "Twin Cities catering",
  "personal chef Minneapolis",
  "meal prep Minneapolis",
  "meal plan Minneapolis",
  "how much does a personal chef cost",
  "private dining",
  "farm to table",
  "Local Effort Food Co."
];
var CONTACT_EMAIL = "yum@localeffortfood.com";
var SOCIAL_LINKS = [
  "https://www.instagram.com/localeffortfood",
  "https://www.facebook.com/localeffortfood",
  "https://www.tiktok.com/@localeffort",
  "https://www.thumbtack.com/mn/saint-paul/personal-chefs/weston-smith/service/429294230165643268"
];

// src/config/routes.js
var PUBLIC_ROUTES = [
  {
    path: "/",
    title: "Local Effort Food Co. \u2014 Minneapolis Personal Chef",
    description: "Local Effort Food Co. is a Minneapolis personal chef team offering in-home dinners, meal prep plans, and small-event catering built around Minnesota-grown ingredients.",
    prerender: true
  },
  {
    path: "/releases",
    title: "Press & Releases \u2014 Local Effort Food Co.",
    description: "News, press coverage, and updates from Local Effort Food Co.",
    prerender: true
  },
  {
    path: "/sale",
    title: "Shop \u2014 Local Effort Food Co.",
    description: "Order from Local Effort Food Co. Fresh, local, Minneapolis-made.",
    prerender: true
  },
  {
    path: "/weekly",
    title: "Weekly Updates \u2014 Local Effort Food Co.",
    description: "Weekly menus, stories, and updates from the Local Effort kitchen.",
    prerender: true
  },
  {
    path: "/happymonday",
    title: "For Happy Monday \u2014 Local Effort Food Co.",
    description: "Local Effort menu and ordering for Happy Monday.",
    prerender: true
  },
  {
    path: "/pizza-party",
    title: "Pizza Party \u2014 Local Effort Food Co.",
    description: "Book a wood-fired pizza party with Local Effort in Minneapolis-St. Paul.",
    prerender: true
  },
  {
    path: "/winterdinner",
    title: "Winter Dinner \u2014 Local Effort Food Co.",
    description: "Seasonal winter dinner experience from Local Effort.",
    prerender: false
  },
  {
    path: "/winterpizza",
    title: "Winter Pizza \u2014 Local Effort Food Co.",
    description: "Winter pizza pop-up from Local Effort.",
    prerender: false
  },
  {
    path: "/february",
    title: "February Menu \u2014 Local Effort Food Co.",
    description: "February seasonal menu from Local Effort Food Co.",
    prerender: false
  },
  {
    path: "/psyche",
    title: "Psyche \u2014 Local Effort Food Co.",
    description: "Psyche experience by Local Effort Food Co.",
    prerender: false
  },
  {
    path: "/januarymeals",
    title: "January Meals \u2014 Local Effort Food Co.",
    description: "January meal prep offerings from Local Effort.",
    prerender: false
  },
  {
    path: "/calendar",
    title: "Calendar \u2014 Local Effort Food Co.",
    description: "Event and booking calendar for Local Effort Food Co.",
    prerender: false
  }
];
var INTERNAL_ROUTES = [
  "/auth",
  "/inbox",
  "/campaigns",
  "/admin/",
  "/weeklydemo",
  "/weekly-order",
  "/catherine-schedule",
  "/partners/",
  "/schedule/"
];

// src/data/cloudinaryContent.js
var import_meta = {};
var cloudinaryConfig = {
  cloudName: typeof import_meta !== "undefined" && import_meta.env?.VITE_CLOUDINARY_CLOUD_NAME || "dokyhfvyd"
};
var heroPublicId = "vjuesai2mxfavpq9d2df";
var heroVersion = "1759456148";
var heroFallbackSrc = "/gallery/IMG_3145.jpg";

// src/components/seo/DefaultSeo.jsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var buildOgImageUrl = () => {
  const cloudName = cloudinaryConfig?.cloudName;
  if (cloudName && heroPublicId) {
    const versionSegment = heroVersion ? `/v${heroVersion}` : "";
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_1200${versionSegment}/${heroPublicId}.jpg`;
  }
  if (heroFallbackSrc) {
    return `${SITE_URL}${heroFallbackSrc}`;
  }
  return `${SITE_URL}/gallery/logo.png`;
};
var DefaultSeo = () => {
  const location = (0, import_react_router_dom2.useLocation)();
  const routeMeta = PUBLIC_ROUTES.find((r) => r.path === location.pathname);
  const pageTitle = routeMeta?.title || SITE_NAME;
  const pageDescription = routeMeta?.description || DEFAULT_DESCRIPTION;
  const shouldNoindex = INTERNAL_ROUTES.some((p) => location.pathname === p || location.pathname.startsWith(p));
  const canonicalUrl = (0, import_react3.useMemo)(() => {
    const path = location.pathname || "/";
    const search = location.search || "";
    const normalized = path === "/" ? "/" : path;
    try {
      const url = new URL(SITE_URL);
      url.pathname = normalized;
      url.search = search;
      if (normalized !== "/" && url.pathname.endsWith("/")) {
        url.pathname = url.pathname.replace(/\/+$/, "");
      }
      return url.toString();
    } catch (err) {
      return `${SITE_URL}${normalized}${search}`;
    }
  }, [location.pathname, location.search]);
  const ogImageUrl = (0, import_react3.useMemo)(() => buildOgImageUrl(), []);
  const structuredData = (0, import_react3.useMemo)(() => {
    const organizationId = `${SITE_URL}#organization`;
    const websiteId = `${SITE_URL}#website`;
    return [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
        email: CONTACT_EMAIL,
        sameAs: SOCIAL_LINKS,
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer service",
            email: CONTACT_EMAIL,
            areaServed: ["US"],
            availableLanguage: ["English"]
          }
        ],
        logo: `${SITE_URL}/gallery/logo.png`
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": websiteId,
        name: SITE_NAME,
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
        inLanguage: "en-US",
        publisher: { "@id": organizationId },
        potentialAction: [
          {
            "@type": "SearchAction",
            target: `${SITE_URL}/api/support/search?q={query}`,
            "query-input": "required name=query"
          },
          {
            "@type": "SearchAction",
            target: `${SITE_URL}/api/public/site?q={query}`,
            "query-input": "optional name=query"
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: pageTitle,
        isPartOf: { "@id": websiteId },
        inLanguage: "en-US",
        description: pageDescription
      }
    ];
  }, [canonicalUrl, pageTitle, pageDescription]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_react_helmet_async.Helmet, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("title", { children: pageTitle }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { name: "description", content: pageDescription }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { name: "keywords", content: DEFAULT_KEYWORDS.join(", ") }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { property: "og:site_name", content: SITE_NAME }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { property: "og:type", content: "website" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { property: "og:title", content: pageTitle }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { property: "og:description", content: pageDescription }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { property: "og:url", content: canonicalUrl }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { property: "og:image", content: ogImageUrl }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { property: "og:locale", content: "en_US" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { property: "og:see_also", content: `${SITE_URL}/ai/manifest.json` }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { name: "twitter:card", content: "summary_large_image" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { name: "twitter:title", content: pageTitle }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { name: "twitter:description", content: pageDescription }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { name: "twitter:image", content: ogImageUrl }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("meta", { name: "twitter:site", content: "@localeffortfood" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "meta",
      {
        name: "robots",
        content: shouldNoindex ? "noindex, nofollow" : "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("link", { rel: "canonical", href: canonicalUrl }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("link", { rel: "alternate", type: "text/plain", href: `${SITE_URL}/ai.txt` }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("link", { rel: "alternate", type: "application/json", href: `${SITE_URL}/ai/manifest.json` }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("script", { type: "application/ld+json", children: JSON.stringify(structuredData) })
  ] });
};
var DefaultSeo_default = DefaultSeo;

// src/pages/FullPageDemoPage.jsx
var import_react13 = __toESM(require("react"));
var import_framer_motion3 = require("framer-motion");
var import_core = __toESM(require_dist3());
var import_sortable = __toESM(require_dist4());
var import_utilities = __toESM(require_dist());

// src/components/fullpage/FullPageContainer.jsx
var import_react5 = __toESM(require("react"));
var import_react_router_dom3 = require("react-router-dom");

// src/hooks/useFullPageScroll.js
var import_react4 = require("react");
var useFullPageScroll = (sectionRefs, enableKeyboard = true, scrollDirection = "vertical") => {
  const [activeSection, setActiveSection] = (0, import_react4.useState)(0);
  const [moveDirection, setMoveDirection] = (0, import_react4.useState)(0);
  const lastScrollPos = (0, import_react4.useRef)(0);
  const scrollToSection = (0, import_react4.useCallback)((index) => {
    if (index < 0 || index >= sectionRefs.length) return;
    const section = sectionRefs[index]?.current;
    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: scrollDirection === "horizontal" ? "nearest" : "start",
        inline: scrollDirection === "horizontal" ? "start" : "nearest"
      });
      setMoveDirection(index > activeSection ? 1 : -1);
    }
  }, [sectionRefs, activeSection, scrollDirection]);
  (0, import_react4.useEffect)(() => {
    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.5
      // Section is "active" when 50% visible
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = sectionRefs.findIndex(
            (ref) => ref.current === entry.target
          );
          if (index !== -1 && index !== activeSection) {
            setActiveSection(index);
            const currentScrollPos = scrollDirection === "horizontal" ? window.scrollX : window.scrollY;
            setMoveDirection(currentScrollPos > lastScrollPos.current ? 1 : -1);
            lastScrollPos.current = currentScrollPos;
          }
        }
      });
    }, options);
    sectionRefs.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });
    return () => {
      sectionRefs.forEach((ref) => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      });
    };
  }, [sectionRefs, activeSection, scrollDirection]);
  (0, import_react4.useEffect)(() => {
    if (!enableKeyboard) return;
    const handleKeyDown = (e) => {
      if (scrollDirection === "horizontal") {
        switch (e.key) {
          case "ArrowRight":
          case "PageDown":
            e.preventDefault();
            scrollToSection(activeSection + 1);
            break;
          case "ArrowLeft":
          case "PageUp":
            e.preventDefault();
            scrollToSection(activeSection - 1);
            break;
          case "Home":
            e.preventDefault();
            scrollToSection(0);
            break;
          case "End":
            e.preventDefault();
            scrollToSection(sectionRefs.length - 1);
            break;
          default:
            break;
        }
      } else {
        switch (e.key) {
          case "ArrowDown":
          case "PageDown":
            e.preventDefault();
            scrollToSection(activeSection + 1);
            break;
          case "ArrowUp":
          case "PageUp":
            e.preventDefault();
            scrollToSection(activeSection - 1);
            break;
          case "Home":
            e.preventDefault();
            scrollToSection(0);
            break;
          case "End":
            e.preventDefault();
            scrollToSection(sectionRefs.length - 1);
            break;
          default:
            break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSection, enableKeyboard, scrollToSection, sectionRefs.length, scrollDirection]);
  return {
    activeSection,
    scrollToSection,
    direction: moveDirection
  };
};

// src/components/fullpage/FullPageContainer.jsx
var import_jsx_runtime4 = require("react/jsx-runtime");
var FullPageContainer = ({
  pages,
  enableKeyboard = true,
  snapType = "mandatory",
  onPageChange,
  children
}) => {
  const location = (0, import_react_router_dom3.useLocation)();
  const containerRef = (0, import_react5.useRef)(null);
  const pageRefs = (0, import_react5.useRef)(
    pages.map(() => import_react5.default.createRef())
  );
  const { activeSection: activePage, scrollToSection: scrollToPage } = useFullPageScroll(
    pageRefs.current,
    enableKeyboard,
    "horizontal"
  );
  (0, import_react5.useEffect)(() => {
    if (window) {
      window.scrollToPage = scrollToPage;
    }
  }, [scrollToPage]);
  (0, import_react5.useEffect)(() => {
    if (onPageChange) {
      onPageChange(activePage);
    }
  }, [activePage, onPageChange]);
  (0, import_react5.useEffect)(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const pageIndex = pages.findIndex((page) => page.id === id);
      if (pageIndex !== -1) {
        setTimeout(() => {
          scrollToPage(pageIndex);
        }, 600);
      }
    }
  }, [location.hash, pages, scrollToPage]);
  const childrenWithRefs = import_react5.Children.map(children, (child, index) => {
    if (!child) return null;
    return (0, import_react5.cloneElement)(child, {
      ref: pageRefs.current[index],
      id: pages[index]?.id || child.props.id
    });
  });
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    "div",
    {
      ref: containerRef,
      className: "fullpage-container",
      style: {
        scrollSnapType: `x ${snapType}`
      },
      children: childrenWithRefs
    }
  );
};
var FullPageContainer_default = FullPageContainer;

// src/components/fullpage/FullPageSection.jsx
var import_react6 = __toESM(require("react"));
var import_framer_motion2 = require("framer-motion");

// src/utils/animations.js
var fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
};
var fullPageSectionReveal = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
  }
};
var fullPageSlideUp = {
  hidden: { opacity: 0, y: 100 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: [0.4, 0, 0.2, 1] }
  }
};
var fullPageFadeScale = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
  }
};
var fullPageStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

// src/components/fullpage/FullPageSection.jsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var FullPageSection = (0, import_react6.forwardRef)(
  ({
    id,
    className = "",
    animation = "sectionReveal",
    animationDelay = 0,
    children,
    ...props
  }, ref) => {
    const animationVariants = {
      sectionReveal: fullPageSectionReveal,
      slideUp: fullPageSlideUp,
      fadeScale: fullPageFadeScale,
      stagger: fullPageStagger
    };
    const selectedVariant = animationVariants[animation] || fullPageSectionReveal;
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      import_framer_motion2.motion.div,
      {
        ref,
        id,
        className: `fullpage-section ${className}`,
        variants: selectedVariant,
        initial: "hidden",
        whileInView: "visible",
        viewport: { once: true, amount: 0.3 },
        transition: {
          ...selectedVariant.visible?.transition,
          delay: animationDelay
        },
        ...props,
        children
      }
    );
  }
);
FullPageSection.displayName = "FullPageSection";
var FullPageSection_default = FullPageSection;

// src/components/common/cloudinaryImage.jsx
var import_react7 = __toESM(require("react"));
var import_react8 = require("@cloudinary/react");
var import_url_gen = require("@cloudinary/url-gen");
var import_resize = require("@cloudinary/url-gen/actions/resize");
var import_gravity = require("@cloudinary/url-gen/qualifiers/gravity");
var import_quality = require("@cloudinary/url-gen/qualifiers/quality");
var import_format = require("@cloudinary/url-gen/qualifiers/format");
var import_delivery = require("@cloudinary/url-gen/actions/delivery");
var import_react9 = require("react");
var import_jsx_runtime6 = require("react/jsx-runtime");
var import_meta2 = {};
var CLOUD_NAME = import_meta2.env?.VITE_CLOUDINARY_CLOUD_NAME || typeof process !== "undefined" && process?.env?.CLOUDINARY_CLOUD_NAME || "dokyhfvyd";
var cld = new import_url_gen.Cloudinary({
  cloud: {
    cloudName: CLOUD_NAME
  }
});
var CloudinaryImage = ({ publicId, alt, width, height, className, containerClassName, imgClassName, containerStyle, disableLazy = false, fallbackSrc, resizeMode = "fill", placeholderMode = "blur", sizes, responsiveSteps = [480, 768, 1024, 1366, 1600, 1920], eager = false, version }) => {
  const [loaded, setLoaded] = (0, import_react9.useState)(false);
  const [error, setError] = (0, import_react9.useState)(false);
  const imgRef = (0, import_react9.useRef)(null);
  if (!publicId) {
    const placeholderStyle = {
      width: width ? `${width}px` : "100%",
      height: height ? `${height}px` : "100%",
      backgroundColor: "#f0f0f0",
      // A light gray placeholder
      display: "inline-block"
    };
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: placeholderStyle, className });
  }
  const myImage = cld.image(publicId);
  if (version) {
    myImage.setVersion(version);
  }
  const phW = 80;
  const phH = Math.max(20, Math.round((height || 80) * (phW / (width || 80))));
  const placeholderImg = cld.image(publicId);
  if (version) {
    placeholderImg.setVersion(version);
  }
  placeholderImg.resize((0, import_resize.fill)(phW, phH)).quality(20).format((0, import_format.auto)());
  const placeholderUrl = placeholderImg.toURL();
  myImage.quality((0, import_quality.auto)()).format((0, import_format.auto)()).delivery((0, import_delivery.dpr)("auto"));
  if (width && height) {
    if (resizeMode === "fit") {
      myImage.resize((0, import_resize.fit)(width, height));
    } else if (resizeMode === "pad") {
      myImage.resize((0, import_resize.pad)(width, height));
    } else {
      myImage.resize((0, import_resize.fill)(width, height).gravity((0, import_gravity.autoGravity)()));
    }
  }
  (0, import_react9.useEffect)(() => {
    let mounted = true;
    let el = null;
    let pollTimer = null;
    let onLoad = null;
    let onError = null;
    const fallbackTimeout = setTimeout(() => {
      if (mounted) setLoaded(true);
    }, 2500);
    const attachListener = () => {
      el = imgRef.current && imgRef.current.querySelector("img");
      if (!el) {
        pollTimer = setTimeout(attachListener, 200);
        return;
      }
      onLoad = () => {
        if (!mounted) return;
        clearTimeout(fallbackTimeout);
        setLoaded(true);
      };
      onError = () => {
        if (!mounted) return;
        setError(true);
        if (typeof window !== "undefined") {
          console.warn("[CloudinaryImage] failed to load", { cloudName: CLOUD_NAME, publicId });
        }
      };
      el.addEventListener("load", onLoad);
      el.addEventListener("error", onError);
      if (el.complete) onLoad();
    };
    attachListener();
    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      if (pollTimer) clearTimeout(pollTimer);
      if (el && onLoad) el.removeEventListener("load", onLoad);
      if (el && onError) el.removeEventListener("error", onError);
    };
  }, [publicId, version]);
  if (error && fallbackSrc) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "img",
      {
        src: fallbackSrc,
        alt,
        width,
        height,
        className,
        style: { objectFit: "cover" }
      }
    );
  }
  const baseStyle = placeholderMode === "blur" ? { backgroundImage: `url(${placeholderUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: placeholderMode === "solid" ? "transparent" : "#f3f4f6" };
  const imgStyle = (() => {
    const s = {};
    if (width && height) {
      s.width = "100%";
      s.height = "100%";
    }
    if (resizeMode === "fit" || resizeMode === "pad") {
      s.objectFit = "contain";
    } else {
      s.objectFit = "cover";
    }
    return s;
  })();
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
    "div",
    {
      ref: imgRef,
      className: `${containerClassName || className || ""} relative overflow-hidden w-full`,
      style: { ...baseStyle, ...containerStyle || {} },
      children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        import_react8.AdvancedImage,
        {
          cldImg: myImage,
          alt,
          className: `transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName || ""}`,
          sizes,
          loading: eager ? "eager" : "lazy",
          style: imgStyle,
          plugins: (() => {
            const base = [(0, import_react8.responsive)({ steps: responsiveSteps })];
            const isLazy = !eager && !disableLazy;
            return isLazy ? [...base, (0, import_react8.lazyload)()] : base;
          })()
        }
      )
    }
  );
};
var cloudinaryImage_default = CloudinaryImage;

// src/components/common/PhotoGrid.jsx
var import_react10 = __toESM(require("react"));
var import_jsx_runtime7 = require("react/jsx-runtime");
function PhotoGrid({ tags, title, perPage = 24, layout, masonry = false, className = "", ...rest }) {
  const tagList = (0, import_react10.useMemo)(() => Array.isArray(tags) ? tags.filter(Boolean) : [tags].filter(Boolean), [tags]);
  const [images, setImages] = (0, import_react10.useState)([]);
  const [loading, setLoading] = (0, import_react10.useState)(false);
  const [error, setError] = (0, import_react10.useState)(null);
  (0, import_react10.useEffect)(() => {
    let abort = false;
    const controller = new AbortController();
    (async () => {
      if (!tagList.length) {
        setImages([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const fetches = tagList.map(async (t) => {
          const res = await fetch(`/api/search-images?query=${encodeURIComponent(t)}&per_page=${perPage}`, { signal: controller.signal });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || `Failed loading tag ${t}`);
          return Array.isArray(data.images) ? data.images : [];
        });
        const results = await Promise.all(fetches);
        if (abort) return;
        const merged = [].concat(...results);
        const seen = /* @__PURE__ */ new Set();
        const unique = merged.filter((img) => {
          const key = img.asset_id || img.public_id || img.publicId;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setImages(unique);
      } catch (e) {
        if (abort) return;
        setError(e.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
      controller.abort();
    };
  }, [tagList.join(","), perPage]);
  if (!tagList.length) return null;
  const useMasonry = masonry || String(layout || "").toLowerCase() === "masonry";
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("section", { className: ["space-y-4", className].filter(Boolean).join(" "), ...rest, children: [
    title ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h3", { className: "text-2xl font-bold", children: title }) : null,
    loading ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { children: "Loading photos\u2026" }) : error ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "text-red-700 bg-red-50 border border-red-200 p-3 rounded", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "font-semibold", children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "text-sm mt-1", children: "If this persists, check Cloudinary env vars and the serverless function logs." })
    ] }) : images.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "text-sm text-gray-600", children: "No photos found." }) : useMasonry ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]", children: images.map((img, idx) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      "div",
      {
        className: "mb-4 break-inside-avoid border p-2 bg-white rounded-lg overflow-hidden",
        children: img.thumbnail_url ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          "img",
          {
            src: img.thumbnail_url,
            alt: img.context?.alt || "Grid image",
            className: "rounded-lg w-full h-auto",
            loading: "lazy"
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          cloudinaryImage_default,
          {
            publicId: img.public_id || img.publicId,
            alt: img.context?.alt || "Grid image",
            width: 800,
            className: "rounded-lg w-full h-auto"
          }
        )
      },
      (img.asset_id || img.public_id || idx) + ":" + idx
    )) }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: images.map((img, idx) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "border p-2 bg-white rounded-lg overflow-hidden", children: img.thumbnail_url ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      "img",
      {
        src: img.thumbnail_url,
        alt: img.context?.alt || "Grid image",
        className: "rounded-lg object-cover w-full h-full aspect-square",
        loading: "lazy"
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      cloudinaryImage_default,
      {
        publicId: img.public_id || img.publicId,
        alt: img.context?.alt || "Grid image",
        width: 600,
        height: 600,
        className: "rounded-lg object-cover w-full h-full aspect-square"
      }
    ) }, (img.asset_id || img.public_id || idx) + ":" + idx)) })
  ] });
}

// src/components/ui/SectionHeader.jsx
var import_react11 = __toESM(require("react"));
var import_jsx_runtime8 = require("react/jsx-runtime");
function SectionHeader({ overline, title, className = "" }) {
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: ["space-y-2", className].filter(Boolean).join(" "), children: [
    overline ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "heading-overline", children: overline }) : null,
    title ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("h2", { className: "heading-xl heading-balance", children: title }) : null
  ] });
}

// src/components/forms/AskChefForm.jsx
var import_react12 = __toESM(require("react"));

// src/components/ui/dialog.jsx
var React26 = __toESM(require("react"));

// node_modules/.pnpm/@radix-ui+react-dialog@1.1.15_@types+react-dom@18.3.1_@types+react@19.2.0_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/@radix-ui/react-dialog/dist/index.mjs
var React25 = __toESM(require("react"), 1);

// node_modules/.pnpm/@radix-ui+primitive@1.1.3/node_modules/@radix-ui/primitive/dist/index.mjs
var canUseDOM = !!(typeof window !== "undefined" && window.document && window.document.createElement);
function composeEventHandlers(originalEventHandler, ourEventHandler, { checkForDefaultPrevented = true } = {}) {
  return function handleEvent(event) {
    originalEventHandler?.(event);
    if (checkForDefaultPrevented === false || !event.defaultPrevented) {
      return ourEventHandler?.(event);
    }
  };
}

// node_modules/.pnpm/@radix-ui+react-compose-refs@1.1.2_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-compose-refs/dist/index.mjs
var React9 = __toESM(require("react"), 1);
function setRef(ref, value) {
  if (typeof ref === "function") {
    return ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
function composeRefs(...refs) {
  return (node) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup == "function") {
        hasCleanup = true;
      }
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup == "function") {
            cleanup();
          } else {
            setRef(refs[i], null);
          }
        }
      };
    }
  };
}
function useComposedRefs(...refs) {
  return React9.useCallback(composeRefs(...refs), refs);
}

// node_modules/.pnpm/@radix-ui+react-context@1.1.2_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-context/dist/index.mjs
var React10 = __toESM(require("react"), 1);
var import_jsx_runtime9 = require("react/jsx-runtime");
function createContext22(rootComponentName, defaultContext) {
  const Context = React10.createContext(defaultContext);
  const Provider = (props) => {
    const { children, ...context } = props;
    const value = React10.useMemo(() => context, Object.values(context));
    return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Context.Provider, { value, children });
  };
  Provider.displayName = rootComponentName + "Provider";
  function useContext22(consumerName) {
    const context = React10.useContext(Context);
    if (context) return context;
    if (defaultContext !== void 0) return defaultContext;
    throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
  }
  return [Provider, useContext22];
}
function createContextScope(scopeName, createContextScopeDeps = []) {
  let defaultContexts = [];
  function createContext32(rootComponentName, defaultContext) {
    const BaseContext = React10.createContext(defaultContext);
    const index = defaultContexts.length;
    defaultContexts = [...defaultContexts, defaultContext];
    const Provider = (props) => {
      const { scope, children, ...context } = props;
      const Context = scope?.[scopeName]?.[index] || BaseContext;
      const value = React10.useMemo(() => context, Object.values(context));
      return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Context.Provider, { value, children });
    };
    Provider.displayName = rootComponentName + "Provider";
    function useContext22(consumerName, scope) {
      const Context = scope?.[scopeName]?.[index] || BaseContext;
      const context = React10.useContext(Context);
      if (context) return context;
      if (defaultContext !== void 0) return defaultContext;
      throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
    }
    return [Provider, useContext22];
  }
  const createScope = () => {
    const scopeContexts = defaultContexts.map((defaultContext) => {
      return React10.createContext(defaultContext);
    });
    return function useScope(scope) {
      const contexts = scope?.[scopeName] || scopeContexts;
      return React10.useMemo(
        () => ({ [`__scope${scopeName}`]: { ...scope, [scopeName]: contexts } }),
        [scope, contexts]
      );
    };
  };
  createScope.scopeName = scopeName;
  return [createContext32, composeContextScopes(createScope, ...createContextScopeDeps)];
}
function composeContextScopes(...scopes) {
  const baseScope = scopes[0];
  if (scopes.length === 1) return baseScope;
  const createScope = () => {
    const scopeHooks = scopes.map((createScope2) => ({
      useScope: createScope2(),
      scopeName: createScope2.scopeName
    }));
    return function useComposedScopes(overrideScopes) {
      const nextScopes = scopeHooks.reduce((nextScopes2, { useScope, scopeName }) => {
        const scopeProps = useScope(overrideScopes);
        const currentScope = scopeProps[`__scope${scopeName}`];
        return { ...nextScopes2, ...currentScope };
      }, {});
      return React10.useMemo(() => ({ [`__scope${baseScope.scopeName}`]: nextScopes }), [nextScopes]);
    };
  };
  createScope.scopeName = baseScope.scopeName;
  return createScope;
}

// node_modules/.pnpm/@radix-ui+react-id@1.1.1_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-id/dist/index.mjs
var React12 = __toESM(require("react"), 1);

// node_modules/.pnpm/@radix-ui+react-use-layout-effect@1.1.1_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-use-layout-effect/dist/index.mjs
var React11 = __toESM(require("react"), 1);
var useLayoutEffect2 = globalThis?.document ? React11.useLayoutEffect : () => {
};

// node_modules/.pnpm/@radix-ui+react-id@1.1.1_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-id/dist/index.mjs
var useReactId = React12[" useId ".trim().toString()] || (() => void 0);
var count = 0;
function useId(deterministicId) {
  const [id, setId] = React12.useState(useReactId());
  useLayoutEffect2(() => {
    if (!deterministicId) setId((reactId) => reactId ?? String(count++));
  }, [deterministicId]);
  return deterministicId || (id ? `radix-${id}` : "");
}

// node_modules/.pnpm/@radix-ui+react-use-controllable-state@1.2.2_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-use-controllable-state/dist/index.mjs
var React13 = __toESM(require("react"), 1);
var React22 = __toESM(require("react"), 1);
var useInsertionEffect = React13[" useInsertionEffect ".trim().toString()] || useLayoutEffect2;
function useControllableState({
  prop,
  defaultProp,
  onChange = () => {
  },
  caller
}) {
  const [uncontrolledProp, setUncontrolledProp, onChangeRef] = useUncontrolledState({
    defaultProp,
    onChange
  });
  const isControlled = prop !== void 0;
  const value = isControlled ? prop : uncontrolledProp;
  if (true) {
    const isControlledRef = React13.useRef(prop !== void 0);
    React13.useEffect(() => {
      const wasControlled = isControlledRef.current;
      if (wasControlled !== isControlled) {
        const from = wasControlled ? "controlled" : "uncontrolled";
        const to = isControlled ? "controlled" : "uncontrolled";
        console.warn(
          `${caller} is changing from ${from} to ${to}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
        );
      }
      isControlledRef.current = isControlled;
    }, [isControlled, caller]);
  }
  const setValue = React13.useCallback(
    (nextValue) => {
      if (isControlled) {
        const value2 = isFunction(nextValue) ? nextValue(prop) : nextValue;
        if (value2 !== prop) {
          onChangeRef.current?.(value2);
        }
      } else {
        setUncontrolledProp(nextValue);
      }
    },
    [isControlled, prop, setUncontrolledProp, onChangeRef]
  );
  return [value, setValue];
}
function useUncontrolledState({
  defaultProp,
  onChange
}) {
  const [value, setValue] = React13.useState(defaultProp);
  const prevValueRef = React13.useRef(value);
  const onChangeRef = React13.useRef(onChange);
  useInsertionEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  React13.useEffect(() => {
    if (prevValueRef.current !== value) {
      onChangeRef.current?.(value);
      prevValueRef.current = value;
    }
  }, [value, prevValueRef]);
  return [value, setValue, onChangeRef];
}
function isFunction(value) {
  return typeof value === "function";
}
var SYNC_STATE = Symbol("RADIX:SYNC_STATE");

// node_modules/.pnpm/@radix-ui+react-dismissable-layer@1.1.11_@types+react-dom@18.3.1_@types+react@19.2.0_react-do_6egxp5znpyk3c7yb7fm5vbccse/node_modules/@radix-ui/react-dismissable-layer/dist/index.mjs
var React18 = __toESM(require("react"), 1);

// node_modules/.pnpm/@radix-ui+react-primitive@2.1.3_@types+react-dom@18.3.1_@types+react@19.2.0_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/@radix-ui/react-primitive/dist/index.mjs
var React15 = __toESM(require("react"), 1);
var ReactDOM = __toESM(require("react-dom"), 1);

// node_modules/.pnpm/@radix-ui+react-slot@1.2.3_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-slot/dist/index.mjs
var React14 = __toESM(require("react"), 1);
var import_jsx_runtime10 = require("react/jsx-runtime");
// @__NO_SIDE_EFFECTS__
function createSlot(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone(ownerName);
  const Slot2 = React14.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    const childrenArray = React14.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (React14.Children.count(newElement) > 1) return React14.Children.only(null);
          return React14.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(SlotClone, { ...slotProps, ref: forwardedRef, children: React14.isValidElement(newElement) ? React14.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
// @__NO_SIDE_EFFECTS__
function createSlotClone(ownerName) {
  const SlotClone = React14.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    if (React14.isValidElement(children)) {
      const childrenRef = getElementRef(children);
      const props2 = mergeProps(slotProps, children.props);
      if (children.type !== React14.Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return React14.cloneElement(children, props2);
    }
    return React14.Children.count(children) > 1 ? React14.Children.only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER = Symbol("radix.slottable");
function isSlottable(child) {
  return React14.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER;
}
function mergeProps(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}

// node_modules/.pnpm/@radix-ui+react-primitive@2.1.3_@types+react-dom@18.3.1_@types+react@19.2.0_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/@radix-ui/react-primitive/dist/index.mjs
var import_jsx_runtime11 = require("react/jsx-runtime");
var NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul"
];
var Primitive = NODES.reduce((primitive, node) => {
  const Slot2 = createSlot(`Primitive.${node}`);
  const Node2 = React15.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot2 : node;
    if (typeof window !== "undefined") {
      window[Symbol.for("radix-ui")] = true;
    }
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node2.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node2 };
}, {});
function dispatchDiscreteCustomEvent(target, event) {
  if (target) ReactDOM.flushSync(() => target.dispatchEvent(event));
}

// node_modules/.pnpm/@radix-ui+react-use-callback-ref@1.1.1_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs
var React16 = __toESM(require("react"), 1);
function useCallbackRef(callback) {
  const callbackRef = React16.useRef(callback);
  React16.useEffect(() => {
    callbackRef.current = callback;
  });
  return React16.useMemo(() => (...args) => callbackRef.current?.(...args), []);
}

// node_modules/.pnpm/@radix-ui+react-use-escape-keydown@1.1.1_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-use-escape-keydown/dist/index.mjs
var React17 = __toESM(require("react"), 1);
function useEscapeKeydown(onEscapeKeyDownProp, ownerDocument = globalThis?.document) {
  const onEscapeKeyDown = useCallbackRef(onEscapeKeyDownProp);
  React17.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onEscapeKeyDown(event);
      }
    };
    ownerDocument.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => ownerDocument.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [onEscapeKeyDown, ownerDocument]);
}

// node_modules/.pnpm/@radix-ui+react-dismissable-layer@1.1.11_@types+react-dom@18.3.1_@types+react@19.2.0_react-do_6egxp5znpyk3c7yb7fm5vbccse/node_modules/@radix-ui/react-dismissable-layer/dist/index.mjs
var import_jsx_runtime12 = require("react/jsx-runtime");
var DISMISSABLE_LAYER_NAME = "DismissableLayer";
var CONTEXT_UPDATE = "dismissableLayer.update";
var POINTER_DOWN_OUTSIDE = "dismissableLayer.pointerDownOutside";
var FOCUS_OUTSIDE = "dismissableLayer.focusOutside";
var originalBodyPointerEvents;
var DismissableLayerContext = React18.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set()
});
var DismissableLayer = React18.forwardRef(
  (props, forwardedRef) => {
    const {
      disableOutsidePointerEvents = false,
      onEscapeKeyDown,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      onDismiss,
      ...layerProps
    } = props;
    const context = React18.useContext(DismissableLayerContext);
    const [node, setNode] = React18.useState(null);
    const ownerDocument = node?.ownerDocument ?? globalThis?.document;
    const [, force] = React18.useState({});
    const composedRefs = useComposedRefs(forwardedRef, (node2) => setNode(node2));
    const layers = Array.from(context.layers);
    const [highestLayerWithOutsidePointerEventsDisabled] = [...context.layersWithOutsidePointerEventsDisabled].slice(-1);
    const highestLayerWithOutsidePointerEventsDisabledIndex = layers.indexOf(highestLayerWithOutsidePointerEventsDisabled);
    const index = node ? layers.indexOf(node) : -1;
    const isBodyPointerEventsDisabled = context.layersWithOutsidePointerEventsDisabled.size > 0;
    const isPointerEventsEnabled = index >= highestLayerWithOutsidePointerEventsDisabledIndex;
    const pointerDownOutside = usePointerDownOutside((event) => {
      const target = event.target;
      const isPointerDownOnBranch = [...context.branches].some((branch) => branch.contains(target));
      if (!isPointerEventsEnabled || isPointerDownOnBranch) return;
      onPointerDownOutside?.(event);
      onInteractOutside?.(event);
      if (!event.defaultPrevented) onDismiss?.();
    }, ownerDocument);
    const focusOutside = useFocusOutside((event) => {
      const target = event.target;
      const isFocusInBranch = [...context.branches].some((branch) => branch.contains(target));
      if (isFocusInBranch) return;
      onFocusOutside?.(event);
      onInteractOutside?.(event);
      if (!event.defaultPrevented) onDismiss?.();
    }, ownerDocument);
    useEscapeKeydown((event) => {
      const isHighestLayer = index === context.layers.size - 1;
      if (!isHighestLayer) return;
      onEscapeKeyDown?.(event);
      if (!event.defaultPrevented && onDismiss) {
        event.preventDefault();
        onDismiss();
      }
    }, ownerDocument);
    React18.useEffect(() => {
      if (!node) return;
      if (disableOutsidePointerEvents) {
        if (context.layersWithOutsidePointerEventsDisabled.size === 0) {
          originalBodyPointerEvents = ownerDocument.body.style.pointerEvents;
          ownerDocument.body.style.pointerEvents = "none";
        }
        context.layersWithOutsidePointerEventsDisabled.add(node);
      }
      context.layers.add(node);
      dispatchUpdate();
      return () => {
        if (disableOutsidePointerEvents && context.layersWithOutsidePointerEventsDisabled.size === 1) {
          ownerDocument.body.style.pointerEvents = originalBodyPointerEvents;
        }
      };
    }, [node, ownerDocument, disableOutsidePointerEvents, context]);
    React18.useEffect(() => {
      return () => {
        if (!node) return;
        context.layers.delete(node);
        context.layersWithOutsidePointerEventsDisabled.delete(node);
        dispatchUpdate();
      };
    }, [node, context]);
    React18.useEffect(() => {
      const handleUpdate = () => force({});
      document.addEventListener(CONTEXT_UPDATE, handleUpdate);
      return () => document.removeEventListener(CONTEXT_UPDATE, handleUpdate);
    }, []);
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
      Primitive.div,
      {
        ...layerProps,
        ref: composedRefs,
        style: {
          pointerEvents: isBodyPointerEventsDisabled ? isPointerEventsEnabled ? "auto" : "none" : void 0,
          ...props.style
        },
        onFocusCapture: composeEventHandlers(props.onFocusCapture, focusOutside.onFocusCapture),
        onBlurCapture: composeEventHandlers(props.onBlurCapture, focusOutside.onBlurCapture),
        onPointerDownCapture: composeEventHandlers(
          props.onPointerDownCapture,
          pointerDownOutside.onPointerDownCapture
        )
      }
    );
  }
);
DismissableLayer.displayName = DISMISSABLE_LAYER_NAME;
var BRANCH_NAME = "DismissableLayerBranch";
var DismissableLayerBranch = React18.forwardRef((props, forwardedRef) => {
  const context = React18.useContext(DismissableLayerContext);
  const ref = React18.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, ref);
  React18.useEffect(() => {
    const node = ref.current;
    if (node) {
      context.branches.add(node);
      return () => {
        context.branches.delete(node);
      };
    }
  }, [context.branches]);
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(Primitive.div, { ...props, ref: composedRefs });
});
DismissableLayerBranch.displayName = BRANCH_NAME;
function usePointerDownOutside(onPointerDownOutside, ownerDocument = globalThis?.document) {
  const handlePointerDownOutside = useCallbackRef(onPointerDownOutside);
  const isPointerInsideReactTreeRef = React18.useRef(false);
  const handleClickRef = React18.useRef(() => {
  });
  React18.useEffect(() => {
    const handlePointerDown = (event) => {
      if (event.target && !isPointerInsideReactTreeRef.current) {
        let handleAndDispatchPointerDownOutsideEvent2 = function() {
          handleAndDispatchCustomEvent(
            POINTER_DOWN_OUTSIDE,
            handlePointerDownOutside,
            eventDetail,
            { discrete: true }
          );
        };
        var handleAndDispatchPointerDownOutsideEvent = handleAndDispatchPointerDownOutsideEvent2;
        const eventDetail = { originalEvent: event };
        if (event.pointerType === "touch") {
          ownerDocument.removeEventListener("click", handleClickRef.current);
          handleClickRef.current = handleAndDispatchPointerDownOutsideEvent2;
          ownerDocument.addEventListener("click", handleClickRef.current, { once: true });
        } else {
          handleAndDispatchPointerDownOutsideEvent2();
        }
      } else {
        ownerDocument.removeEventListener("click", handleClickRef.current);
      }
      isPointerInsideReactTreeRef.current = false;
    };
    const timerId = window.setTimeout(() => {
      ownerDocument.addEventListener("pointerdown", handlePointerDown);
    }, 0);
    return () => {
      window.clearTimeout(timerId);
      ownerDocument.removeEventListener("pointerdown", handlePointerDown);
      ownerDocument.removeEventListener("click", handleClickRef.current);
    };
  }, [ownerDocument, handlePointerDownOutside]);
  return {
    // ensures we check React component tree (not just DOM tree)
    onPointerDownCapture: () => isPointerInsideReactTreeRef.current = true
  };
}
function useFocusOutside(onFocusOutside, ownerDocument = globalThis?.document) {
  const handleFocusOutside = useCallbackRef(onFocusOutside);
  const isFocusInsideReactTreeRef = React18.useRef(false);
  React18.useEffect(() => {
    const handleFocus = (event) => {
      if (event.target && !isFocusInsideReactTreeRef.current) {
        const eventDetail = { originalEvent: event };
        handleAndDispatchCustomEvent(FOCUS_OUTSIDE, handleFocusOutside, eventDetail, {
          discrete: false
        });
      }
    };
    ownerDocument.addEventListener("focusin", handleFocus);
    return () => ownerDocument.removeEventListener("focusin", handleFocus);
  }, [ownerDocument, handleFocusOutside]);
  return {
    onFocusCapture: () => isFocusInsideReactTreeRef.current = true,
    onBlurCapture: () => isFocusInsideReactTreeRef.current = false
  };
}
function dispatchUpdate() {
  const event = new CustomEvent(CONTEXT_UPDATE);
  document.dispatchEvent(event);
}
function handleAndDispatchCustomEvent(name, handler, detail, { discrete }) {
  const target = detail.originalEvent.target;
  const event = new CustomEvent(name, { bubbles: false, cancelable: true, detail });
  if (handler) target.addEventListener(name, handler, { once: true });
  if (discrete) {
    dispatchDiscreteCustomEvent(target, event);
  } else {
    target.dispatchEvent(event);
  }
}

// node_modules/.pnpm/@radix-ui+react-focus-scope@1.1.7_@types+react-dom@18.3.1_@types+react@19.2.0_react-dom@18.2._dhkdyyxeakawqe2hoiycn4cg2m/node_modules/@radix-ui/react-focus-scope/dist/index.mjs
var React19 = __toESM(require("react"), 1);
var import_jsx_runtime13 = require("react/jsx-runtime");
var AUTOFOCUS_ON_MOUNT = "focusScope.autoFocusOnMount";
var AUTOFOCUS_ON_UNMOUNT = "focusScope.autoFocusOnUnmount";
var EVENT_OPTIONS = { bubbles: false, cancelable: true };
var FOCUS_SCOPE_NAME = "FocusScope";
var FocusScope = React19.forwardRef((props, forwardedRef) => {
  const {
    loop = false,
    trapped = false,
    onMountAutoFocus: onMountAutoFocusProp,
    onUnmountAutoFocus: onUnmountAutoFocusProp,
    ...scopeProps
  } = props;
  const [container, setContainer] = React19.useState(null);
  const onMountAutoFocus = useCallbackRef(onMountAutoFocusProp);
  const onUnmountAutoFocus = useCallbackRef(onUnmountAutoFocusProp);
  const lastFocusedElementRef = React19.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, (node) => setContainer(node));
  const focusScope = React19.useRef({
    paused: false,
    pause() {
      this.paused = true;
    },
    resume() {
      this.paused = false;
    }
  }).current;
  React19.useEffect(() => {
    if (trapped) {
      let handleFocusIn2 = function(event) {
        if (focusScope.paused || !container) return;
        const target = event.target;
        if (container.contains(target)) {
          lastFocusedElementRef.current = target;
        } else {
          focus(lastFocusedElementRef.current, { select: true });
        }
      }, handleFocusOut2 = function(event) {
        if (focusScope.paused || !container) return;
        const relatedTarget = event.relatedTarget;
        if (relatedTarget === null) return;
        if (!container.contains(relatedTarget)) {
          focus(lastFocusedElementRef.current, { select: true });
        }
      }, handleMutations2 = function(mutations) {
        const focusedElement = document.activeElement;
        if (focusedElement !== document.body) return;
        for (const mutation of mutations) {
          if (mutation.removedNodes.length > 0) focus(container);
        }
      };
      var handleFocusIn = handleFocusIn2, handleFocusOut = handleFocusOut2, handleMutations = handleMutations2;
      document.addEventListener("focusin", handleFocusIn2);
      document.addEventListener("focusout", handleFocusOut2);
      const mutationObserver = new MutationObserver(handleMutations2);
      if (container) mutationObserver.observe(container, { childList: true, subtree: true });
      return () => {
        document.removeEventListener("focusin", handleFocusIn2);
        document.removeEventListener("focusout", handleFocusOut2);
        mutationObserver.disconnect();
      };
    }
  }, [trapped, container, focusScope.paused]);
  React19.useEffect(() => {
    if (container) {
      focusScopesStack.add(focusScope);
      const previouslyFocusedElement = document.activeElement;
      const hasFocusedCandidate = container.contains(previouslyFocusedElement);
      if (!hasFocusedCandidate) {
        const mountEvent = new CustomEvent(AUTOFOCUS_ON_MOUNT, EVENT_OPTIONS);
        container.addEventListener(AUTOFOCUS_ON_MOUNT, onMountAutoFocus);
        container.dispatchEvent(mountEvent);
        if (!mountEvent.defaultPrevented) {
          focusFirst(removeLinks(getTabbableCandidates(container)), { select: true });
          if (document.activeElement === previouslyFocusedElement) {
            focus(container);
          }
        }
      }
      return () => {
        container.removeEventListener(AUTOFOCUS_ON_MOUNT, onMountAutoFocus);
        setTimeout(() => {
          const unmountEvent = new CustomEvent(AUTOFOCUS_ON_UNMOUNT, EVENT_OPTIONS);
          container.addEventListener(AUTOFOCUS_ON_UNMOUNT, onUnmountAutoFocus);
          container.dispatchEvent(unmountEvent);
          if (!unmountEvent.defaultPrevented) {
            focus(previouslyFocusedElement ?? document.body, { select: true });
          }
          container.removeEventListener(AUTOFOCUS_ON_UNMOUNT, onUnmountAutoFocus);
          focusScopesStack.remove(focusScope);
        }, 0);
      };
    }
  }, [container, onMountAutoFocus, onUnmountAutoFocus, focusScope]);
  const handleKeyDown = React19.useCallback(
    (event) => {
      if (!loop && !trapped) return;
      if (focusScope.paused) return;
      const isTabKey = event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey;
      const focusedElement = document.activeElement;
      if (isTabKey && focusedElement) {
        const container2 = event.currentTarget;
        const [first, last] = getTabbableEdges(container2);
        const hasTabbableElementsInside = first && last;
        if (!hasTabbableElementsInside) {
          if (focusedElement === container2) event.preventDefault();
        } else {
          if (!event.shiftKey && focusedElement === last) {
            event.preventDefault();
            if (loop) focus(first, { select: true });
          } else if (event.shiftKey && focusedElement === first) {
            event.preventDefault();
            if (loop) focus(last, { select: true });
          }
        }
      }
    },
    [loop, trapped, focusScope.paused]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Primitive.div, { tabIndex: -1, ...scopeProps, ref: composedRefs, onKeyDown: handleKeyDown });
});
FocusScope.displayName = FOCUS_SCOPE_NAME;
function focusFirst(candidates, { select = false } = {}) {
  const previouslyFocusedElement = document.activeElement;
  for (const candidate of candidates) {
    focus(candidate, { select });
    if (document.activeElement !== previouslyFocusedElement) return;
  }
}
function getTabbableEdges(container) {
  const candidates = getTabbableCandidates(container);
  const first = findVisible(candidates, container);
  const last = findVisible(candidates.reverse(), container);
  return [first, last];
}
function getTabbableCandidates(container) {
  const nodes = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      const isHiddenInput = node.tagName === "INPUT" && node.type === "hidden";
      if (node.disabled || node.hidden || isHiddenInput) return NodeFilter.FILTER_SKIP;
      return node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}
function findVisible(elements, container) {
  for (const element of elements) {
    if (!isHidden(element, { upTo: container })) return element;
  }
}
function isHidden(node, { upTo }) {
  if (getComputedStyle(node).visibility === "hidden") return true;
  while (node) {
    if (upTo !== void 0 && node === upTo) return false;
    if (getComputedStyle(node).display === "none") return true;
    node = node.parentElement;
  }
  return false;
}
function isSelectableInput(element) {
  return element instanceof HTMLInputElement && "select" in element;
}
function focus(element, { select = false } = {}) {
  if (element && element.focus) {
    const previouslyFocusedElement = document.activeElement;
    element.focus({ preventScroll: true });
    if (element !== previouslyFocusedElement && isSelectableInput(element) && select)
      element.select();
  }
}
var focusScopesStack = createFocusScopesStack();
function createFocusScopesStack() {
  let stack = [];
  return {
    add(focusScope) {
      const activeFocusScope = stack[0];
      if (focusScope !== activeFocusScope) {
        activeFocusScope?.pause();
      }
      stack = arrayRemove(stack, focusScope);
      stack.unshift(focusScope);
    },
    remove(focusScope) {
      stack = arrayRemove(stack, focusScope);
      stack[0]?.resume();
    }
  };
}
function arrayRemove(array, item) {
  const updatedArray = [...array];
  const index = updatedArray.indexOf(item);
  if (index !== -1) {
    updatedArray.splice(index, 1);
  }
  return updatedArray;
}
function removeLinks(items) {
  return items.filter((item) => item.tagName !== "A");
}

// node_modules/.pnpm/@radix-ui+react-portal@1.1.9_@types+react-dom@18.3.1_@types+react@19.2.0_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/@radix-ui/react-portal/dist/index.mjs
var React20 = __toESM(require("react"), 1);
var import_react_dom = __toESM(require("react-dom"), 1);
var import_jsx_runtime14 = require("react/jsx-runtime");
var PORTAL_NAME = "Portal";
var Portal = React20.forwardRef((props, forwardedRef) => {
  const { container: containerProp, ...portalProps } = props;
  const [mounted, setMounted] = React20.useState(false);
  useLayoutEffect2(() => setMounted(true), []);
  const container = containerProp || mounted && globalThis?.document?.body;
  return container ? import_react_dom.default.createPortal(/* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Primitive.div, { ...portalProps, ref: forwardedRef }), container) : null;
});
Portal.displayName = PORTAL_NAME;

// node_modules/.pnpm/@radix-ui+react-presence@1.1.5_@types+react-dom@18.3.1_@types+react@19.2.0_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/@radix-ui/react-presence/dist/index.mjs
var React23 = __toESM(require("react"), 1);
var React21 = __toESM(require("react"), 1);
function useStateMachine(initialState, machine) {
  return React21.useReducer((state, event) => {
    const nextState = machine[state][event];
    return nextState ?? state;
  }, initialState);
}
var Presence = (props) => {
  const { present, children } = props;
  const presence = usePresence(present);
  const child = typeof children === "function" ? children({ present: presence.isPresent }) : React23.Children.only(children);
  const ref = useComposedRefs(presence.ref, getElementRef2(child));
  const forceMount = typeof children === "function";
  return forceMount || presence.isPresent ? React23.cloneElement(child, { ref }) : null;
};
Presence.displayName = "Presence";
function usePresence(present) {
  const [node, setNode] = React23.useState();
  const stylesRef = React23.useRef(null);
  const prevPresentRef = React23.useRef(present);
  const prevAnimationNameRef = React23.useRef("none");
  const initialState = present ? "mounted" : "unmounted";
  const [state, send] = useStateMachine(initialState, {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended"
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted"
    },
    unmounted: {
      MOUNT: "mounted"
    }
  });
  React23.useEffect(() => {
    const currentAnimationName = getAnimationName(stylesRef.current);
    prevAnimationNameRef.current = state === "mounted" ? currentAnimationName : "none";
  }, [state]);
  useLayoutEffect2(() => {
    const styles = stylesRef.current;
    const wasPresent = prevPresentRef.current;
    const hasPresentChanged = wasPresent !== present;
    if (hasPresentChanged) {
      const prevAnimationName = prevAnimationNameRef.current;
      const currentAnimationName = getAnimationName(styles);
      if (present) {
        send("MOUNT");
      } else if (currentAnimationName === "none" || styles?.display === "none") {
        send("UNMOUNT");
      } else {
        const isAnimating = prevAnimationName !== currentAnimationName;
        if (wasPresent && isAnimating) {
          send("ANIMATION_OUT");
        } else {
          send("UNMOUNT");
        }
      }
      prevPresentRef.current = present;
    }
  }, [present, send]);
  useLayoutEffect2(() => {
    if (node) {
      let timeoutId;
      const ownerWindow = node.ownerDocument.defaultView ?? window;
      const handleAnimationEnd = (event) => {
        const currentAnimationName = getAnimationName(stylesRef.current);
        const isCurrentAnimation = currentAnimationName.includes(CSS.escape(event.animationName));
        if (event.target === node && isCurrentAnimation) {
          send("ANIMATION_END");
          if (!prevPresentRef.current) {
            const currentFillMode = node.style.animationFillMode;
            node.style.animationFillMode = "forwards";
            timeoutId = ownerWindow.setTimeout(() => {
              if (node.style.animationFillMode === "forwards") {
                node.style.animationFillMode = currentFillMode;
              }
            });
          }
        }
      };
      const handleAnimationStart = (event) => {
        if (event.target === node) {
          prevAnimationNameRef.current = getAnimationName(stylesRef.current);
        }
      };
      node.addEventListener("animationstart", handleAnimationStart);
      node.addEventListener("animationcancel", handleAnimationEnd);
      node.addEventListener("animationend", handleAnimationEnd);
      return () => {
        ownerWindow.clearTimeout(timeoutId);
        node.removeEventListener("animationstart", handleAnimationStart);
        node.removeEventListener("animationcancel", handleAnimationEnd);
        node.removeEventListener("animationend", handleAnimationEnd);
      };
    } else {
      send("ANIMATION_END");
    }
  }, [node, send]);
  return {
    isPresent: ["mounted", "unmountSuspended"].includes(state),
    ref: React23.useCallback((node2) => {
      stylesRef.current = node2 ? getComputedStyle(node2) : null;
      setNode(node2);
    }, [])
  };
}
function getAnimationName(styles) {
  return styles?.animationName || "none";
}
function getElementRef2(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}

// node_modules/.pnpm/@radix-ui+react-focus-guards@1.1.3_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-focus-guards/dist/index.mjs
var React24 = __toESM(require("react"), 1);
var count2 = 0;
function useFocusGuards() {
  React24.useEffect(() => {
    const edgeGuards = document.querySelectorAll("[data-radix-focus-guard]");
    document.body.insertAdjacentElement("afterbegin", edgeGuards[0] ?? createFocusGuard());
    document.body.insertAdjacentElement("beforeend", edgeGuards[1] ?? createFocusGuard());
    count2++;
    return () => {
      if (count2 === 1) {
        document.querySelectorAll("[data-radix-focus-guard]").forEach((node) => node.remove());
      }
      count2--;
    };
  }, []);
}
function createFocusGuard() {
  const element = document.createElement("span");
  element.setAttribute("data-radix-focus-guard", "");
  element.tabIndex = 0;
  element.style.outline = "none";
  element.style.opacity = "0";
  element.style.position = "fixed";
  element.style.pointerEvents = "none";
  return element;
}

// node_modules/.pnpm/@radix-ui+react-dialog@1.1.15_@types+react-dom@18.3.1_@types+react@19.2.0_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/@radix-ui/react-dialog/dist/index.mjs
var import_react_remove_scroll = __toESM(require_es56(), 1);
var import_aria_hidden = __toESM(require_es57(), 1);
var import_jsx_runtime15 = require("react/jsx-runtime");
var DIALOG_NAME = "Dialog";
var [createDialogContext, createDialogScope] = createContextScope(DIALOG_NAME);
var [DialogProvider, useDialogContext] = createDialogContext(DIALOG_NAME);
var Dialog = (props) => {
  const {
    __scopeDialog,
    children,
    open: openProp,
    defaultOpen,
    onOpenChange,
    modal: modal2 = true
  } = props;
  const triggerRef = React25.useRef(null);
  const contentRef = React25.useRef(null);
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
    caller: DIALOG_NAME
  });
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
    DialogProvider,
    {
      scope: __scopeDialog,
      triggerRef,
      contentRef,
      contentId: useId(),
      titleId: useId(),
      descriptionId: useId(),
      open,
      onOpenChange: setOpen,
      onOpenToggle: React25.useCallback(() => setOpen((prevOpen) => !prevOpen), [setOpen]),
      modal: modal2,
      children
    }
  );
};
Dialog.displayName = DIALOG_NAME;
var TRIGGER_NAME = "DialogTrigger";
var DialogTrigger = React25.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...triggerProps } = props;
    const context = useDialogContext(TRIGGER_NAME, __scopeDialog);
    const composedTriggerRef = useComposedRefs(forwardedRef, context.triggerRef);
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      Primitive.button,
      {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": context.open,
        "aria-controls": context.contentId,
        "data-state": getState(context.open),
        ...triggerProps,
        ref: composedTriggerRef,
        onClick: composeEventHandlers(props.onClick, context.onOpenToggle)
      }
    );
  }
);
DialogTrigger.displayName = TRIGGER_NAME;
var PORTAL_NAME2 = "DialogPortal";
var [PortalProvider, usePortalContext] = createDialogContext(PORTAL_NAME2, {
  forceMount: void 0
});
var DialogPortal = (props) => {
  const { __scopeDialog, forceMount, children, container } = props;
  const context = useDialogContext(PORTAL_NAME2, __scopeDialog);
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(PortalProvider, { scope: __scopeDialog, forceMount, children: React25.Children.map(children, (child) => /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Presence, { present: forceMount || context.open, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Portal, { asChild: true, container, children: child }) })) });
};
DialogPortal.displayName = PORTAL_NAME2;
var OVERLAY_NAME = "DialogOverlay";
var DialogOverlay = React25.forwardRef(
  (props, forwardedRef) => {
    const portalContext = usePortalContext(OVERLAY_NAME, props.__scopeDialog);
    const { forceMount = portalContext.forceMount, ...overlayProps } = props;
    const context = useDialogContext(OVERLAY_NAME, props.__scopeDialog);
    return context.modal ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Presence, { present: forceMount || context.open, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(DialogOverlayImpl, { ...overlayProps, ref: forwardedRef }) }) : null;
  }
);
DialogOverlay.displayName = OVERLAY_NAME;
var Slot = createSlot("DialogOverlay.RemoveScroll");
var DialogOverlayImpl = React25.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...overlayProps } = props;
    const context = useDialogContext(OVERLAY_NAME, __scopeDialog);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(import_react_remove_scroll.RemoveScroll, { as: Slot, allowPinchZoom: true, shards: [context.contentRef], children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
        Primitive.div,
        {
          "data-state": getState(context.open),
          ...overlayProps,
          ref: forwardedRef,
          style: { pointerEvents: "auto", ...overlayProps.style }
        }
      ) })
    );
  }
);
var CONTENT_NAME = "DialogContent";
var DialogContent = React25.forwardRef(
  (props, forwardedRef) => {
    const portalContext = usePortalContext(CONTENT_NAME, props.__scopeDialog);
    const { forceMount = portalContext.forceMount, ...contentProps } = props;
    const context = useDialogContext(CONTENT_NAME, props.__scopeDialog);
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Presence, { present: forceMount || context.open, children: context.modal ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(DialogContentModal, { ...contentProps, ref: forwardedRef }) : /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(DialogContentNonModal, { ...contentProps, ref: forwardedRef }) });
  }
);
DialogContent.displayName = CONTENT_NAME;
var DialogContentModal = React25.forwardRef(
  (props, forwardedRef) => {
    const context = useDialogContext(CONTENT_NAME, props.__scopeDialog);
    const contentRef = React25.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, context.contentRef, contentRef);
    React25.useEffect(() => {
      const content = contentRef.current;
      if (content) return (0, import_aria_hidden.hideOthers)(content);
    }, []);
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      DialogContentImpl,
      {
        ...props,
        ref: composedRefs,
        trapFocus: context.open,
        disableOutsidePointerEvents: true,
        onCloseAutoFocus: composeEventHandlers(props.onCloseAutoFocus, (event) => {
          event.preventDefault();
          context.triggerRef.current?.focus();
        }),
        onPointerDownOutside: composeEventHandlers(props.onPointerDownOutside, (event) => {
          const originalEvent = event.detail.originalEvent;
          const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
          const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
          if (isRightClick) event.preventDefault();
        }),
        onFocusOutside: composeEventHandlers(
          props.onFocusOutside,
          (event) => event.preventDefault()
        )
      }
    );
  }
);
var DialogContentNonModal = React25.forwardRef(
  (props, forwardedRef) => {
    const context = useDialogContext(CONTENT_NAME, props.__scopeDialog);
    const hasInteractedOutsideRef = React25.useRef(false);
    const hasPointerDownOutsideRef = React25.useRef(false);
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      DialogContentImpl,
      {
        ...props,
        ref: forwardedRef,
        trapFocus: false,
        disableOutsidePointerEvents: false,
        onCloseAutoFocus: (event) => {
          props.onCloseAutoFocus?.(event);
          if (!event.defaultPrevented) {
            if (!hasInteractedOutsideRef.current) context.triggerRef.current?.focus();
            event.preventDefault();
          }
          hasInteractedOutsideRef.current = false;
          hasPointerDownOutsideRef.current = false;
        },
        onInteractOutside: (event) => {
          props.onInteractOutside?.(event);
          if (!event.defaultPrevented) {
            hasInteractedOutsideRef.current = true;
            if (event.detail.originalEvent.type === "pointerdown") {
              hasPointerDownOutsideRef.current = true;
            }
          }
          const target = event.target;
          const targetIsTrigger = context.triggerRef.current?.contains(target);
          if (targetIsTrigger) event.preventDefault();
          if (event.detail.originalEvent.type === "focusin" && hasPointerDownOutsideRef.current) {
            event.preventDefault();
          }
        }
      }
    );
  }
);
var DialogContentImpl = React25.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, trapFocus, onOpenAutoFocus, onCloseAutoFocus, ...contentProps } = props;
    const context = useDialogContext(CONTENT_NAME, __scopeDialog);
    const contentRef = React25.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, contentRef);
    useFocusGuards();
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(import_jsx_runtime15.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
        FocusScope,
        {
          asChild: true,
          loop: true,
          trapped: trapFocus,
          onMountAutoFocus: onOpenAutoFocus,
          onUnmountAutoFocus: onCloseAutoFocus,
          children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
            DismissableLayer,
            {
              role: "dialog",
              id: context.contentId,
              "aria-describedby": context.descriptionId,
              "aria-labelledby": context.titleId,
              "data-state": getState(context.open),
              ...contentProps,
              ref: composedRefs,
              onDismiss: () => context.onOpenChange(false)
            }
          )
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(import_jsx_runtime15.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(TitleWarning, { titleId: context.titleId }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(DescriptionWarning, { contentRef, descriptionId: context.descriptionId })
      ] })
    ] });
  }
);
var TITLE_NAME = "DialogTitle";
var DialogTitle = React25.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...titleProps } = props;
    const context = useDialogContext(TITLE_NAME, __scopeDialog);
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Primitive.h2, { id: context.titleId, ...titleProps, ref: forwardedRef });
  }
);
DialogTitle.displayName = TITLE_NAME;
var DESCRIPTION_NAME = "DialogDescription";
var DialogDescription = React25.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...descriptionProps } = props;
    const context = useDialogContext(DESCRIPTION_NAME, __scopeDialog);
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Primitive.p, { id: context.descriptionId, ...descriptionProps, ref: forwardedRef });
  }
);
DialogDescription.displayName = DESCRIPTION_NAME;
var CLOSE_NAME = "DialogClose";
var DialogClose = React25.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...closeProps } = props;
    const context = useDialogContext(CLOSE_NAME, __scopeDialog);
    return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      Primitive.button,
      {
        type: "button",
        ...closeProps,
        ref: forwardedRef,
        onClick: composeEventHandlers(props.onClick, () => context.onOpenChange(false))
      }
    );
  }
);
DialogClose.displayName = CLOSE_NAME;
function getState(open) {
  return open ? "open" : "closed";
}
var TITLE_WARNING_NAME = "DialogTitleWarning";
var [WarningProvider, useWarningContext] = createContext22(TITLE_WARNING_NAME, {
  contentName: CONTENT_NAME,
  titleName: TITLE_NAME,
  docsSlug: "dialog"
});
var TitleWarning = ({ titleId }) => {
  const titleWarningContext = useWarningContext(TITLE_WARNING_NAME);
  const MESSAGE = `\`${titleWarningContext.contentName}\` requires a \`${titleWarningContext.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${titleWarningContext.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${titleWarningContext.docsSlug}`;
  React25.useEffect(() => {
    if (titleId) {
      const hasTitle = document.getElementById(titleId);
      if (!hasTitle) console.error(MESSAGE);
    }
  }, [MESSAGE, titleId]);
  return null;
};
var DESCRIPTION_WARNING_NAME = "DialogDescriptionWarning";
var DescriptionWarning = ({ contentRef, descriptionId }) => {
  const descriptionWarningContext = useWarningContext(DESCRIPTION_WARNING_NAME);
  const MESSAGE = `Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${descriptionWarningContext.contentName}}.`;
  React25.useEffect(() => {
    const describedById = contentRef.current?.getAttribute("aria-describedby");
    if (descriptionId && describedById) {
      const hasDescription = document.getElementById(descriptionId);
      if (!hasDescription) console.warn(MESSAGE);
    }
  }, [MESSAGE, contentRef, descriptionId]);
  return null;
};
var Root = Dialog;
var Portal2 = DialogPortal;
var Overlay = DialogOverlay;
var Content = DialogContent;
var Title = DialogTitle;
var Description = DialogDescription;
var Close = DialogClose;

// src/components/ui/dialog.jsx
var import_lucide_react = require("lucide-react");

// src/lib/utils.js
function cx(...args) {
  const classes = [];
  const push = (v) => {
    if (v) classes.push(String(v));
  };
  const walk = (a) => {
    for (const x of a) {
      const t = typeof x;
      if (!x) continue;
      if (t === "string" || t === "number") {
        push(x);
        continue;
      }
      if (Array.isArray(x)) {
        walk(x);
        continue;
      }
      if (t === "object") {
        for (const k in x) if (Object.prototype.hasOwnProperty.call(x, k) && x[k]) push(k);
      }
    }
  };
  walk(args);
  return classes.join(" ");
}
function cn(...inputs) {
  return cx(...inputs);
}

// src/components/ui/dialog.jsx
var import_jsx_runtime16 = require("react/jsx-runtime");
var Dialog2 = Root;
var DialogPortal2 = ({ className, children, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Portal2, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className: cn("fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto sm:items-center", className), children }) });
DialogPortal2.displayName = Portal2.displayName;
var DialogOverlay2 = React26.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
  Overlay,
  {
    ref,
    className: cn("fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0", className),
    ...props
  }
));
DialogOverlay2.displayName = Overlay.displayName;
var DialogContent2 = React26.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(DialogPortal2, { children: [
  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(DialogOverlay2, {}),
  /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
    Content,
    {
      ref,
      className: cn(
        "relative z-[1000] m-4 w-full max-w-2xl origin-center scale-100 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 sm:m-6",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(Close, { className: "absolute right-5 top-5 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { className: "sr-only", children: "Close" }),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(import_lucide_react.X, { className: "h-4 w-4" })
        ] })
      ]
    }
  )
] }));
DialogContent2.displayName = Content.displayName;
var DialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className: cn("flex flex-col space-y-2 text-center sm:text-left", className), ...props });
DialogHeader.displayName = "DialogHeader";
var DialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className: cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className), ...props });
DialogFooter.displayName = "DialogFooter";
var DialogTitle2 = React26.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Title, { ref, className: cn("text-left text-2xl font-semibold text-slate-900", className), ...props }));
DialogTitle2.displayName = Title.displayName;
var DialogDescription2 = React26.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Description, { ref, className: cn("text-left text-sm text-slate-600", className), ...props }));
DialogDescription2.displayName = Description.displayName;

// src/components/ui/button.jsx
var React27 = __toESM(require("react"));
var import_jsx_runtime17 = require("react/jsx-runtime");
var baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60";
var variantClasses = {
  default: "bg-[var(--color-accent)] text-white hover:bg-orange-600 focus-visible:ring-[var(--color-accent)]",
  secondary: "bg-slate-900 text-white hover:bg-black focus-visible:ring-slate-900",
  outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-500",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400"
};
var sizeClasses = {
  default: "h-10 px-4 py-2",
  lg: "h-11 px-5",
  sm: "h-9 px-3 text-sm",
  icon: "h-10 w-10"
};
var Button = React27.forwardRef(({ className = "", variant = "default", size = "default", ...props }, ref) => {
  const variantClass = variantClasses[variant] || variantClasses.default;
  const sizeClass = sizeClasses[size] || sizeClasses.default;
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
    "button",
    {
      ref,
      className: cn(baseClasses, variantClass, sizeClass, className),
      ...props
    }
  );
});
Button.displayName = "Button";

// src/components/ui/input.jsx
var React28 = __toESM(require("react"));
var import_jsx_runtime18 = require("react/jsx-runtime");
var Input = React28.forwardRef(({ className = "", type = "text", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
  "input",
  {
    ref,
    type,
    className: cn(
      "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60",
      className
    ),
    ...props
  }
));
Input.displayName = "Input";

// src/components/ui/textarea.jsx
var React29 = __toESM(require("react"));
var import_jsx_runtime19 = require("react/jsx-runtime");
var Textarea = React29.forwardRef(({ className = "", rows = 3, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
  "textarea",
  {
    ref,
    rows,
    className: cn(
      "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60",
      className
    ),
    ...props
  }
));
Textarea.displayName = "Textarea";

// src/components/ui/label.jsx
var React30 = __toESM(require("react"));
var import_jsx_runtime20 = require("react/jsx-runtime");
var Label = React30.forwardRef(({ className = "", children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("label", { ref, className: cn("text-sm font-semibold text-slate-700", className), ...props, children }));
Label.displayName = "Label";

// src/components/forms/AskChefForm.jsx
var import_jsx_runtime21 = require("react/jsx-runtime");
var AskChefForm = ({ open, onOpenChange, dialogClassName = "" }) => {
  const [formData, setFormData] = (0, import_react12.useState)({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [status, setStatus] = (0, import_react12.useState)("idle");
  const dialogClasses = ["sm:max-w-[500px]", dialogClassName].filter(Boolean).join(" ");
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (status !== "idle") setStatus("idle");
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject || "Question for the Chef",
        message: formData.message,
        type: "ask-chef"
      };
      const response = await fetch("/api/messages/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      setStatus("success");
      setTimeout(() => {
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: ""
        });
        setStatus("idle");
        onOpenChange(false);
      }, 2e3);
    } catch (error) {
      setStatus("error");
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Dialog2, { open, onOpenChange, children: /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(DialogContent2, { className: dialogClasses, children: [
    /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(DialogHeader, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(DialogTitle2, { children: "Ask a Chef" }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(DialogDescription2, { children: "Have a question? Send us a message and we'll get back to you soon." })
    ] }),
    status === "success" ? /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "py-8 text-center", children: [
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { className: "mb-4 text-5xl", children: "\u2713" }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("h3", { className: "mb-2 text-lg font-semibold text-green-700", children: "Thank you!" }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("p", { className: "text-sm text-slate-600", children: "We've received your message and will get back to you shortly." })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "space-y-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Label, { htmlFor: "name", children: "Name *" }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          Input,
          {
            id: "name",
            name: "name",
            value: formData.name,
            onChange: handleChange,
            placeholder: "Your name",
            required: true
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "space-y-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Label, { htmlFor: "email", children: "Email *" }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          Input,
          {
            id: "email",
            name: "email",
            type: "email",
            value: formData.email,
            onChange: handleChange,
            placeholder: "your@email.com",
            required: true
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "space-y-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Label, { htmlFor: "phone", children: "Phone Number *" }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          Input,
          {
            id: "phone",
            name: "phone",
            type: "tel",
            value: formData.phone,
            onChange: handleChange,
            placeholder: "(000) 000-0000",
            required: true
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "space-y-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Label, { htmlFor: "subject", children: "Subject" }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          Input,
          {
            id: "subject",
            name: "subject",
            value: formData.subject,
            onChange: handleChange,
            placeholder: "What's this about?"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "space-y-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Label, { htmlFor: "message", children: "Message *" }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          Textarea,
          {
            id: "message",
            name: "message",
            value: formData.message,
            onChange: handleChange,
            placeholder: "Type your question or message here...",
            rows: 5,
            required: true
          }
        )
      ] }),
      status === "error" && /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "rounded-md bg-red-50 p-3 text-sm text-red-700", children: [
        "We couldn't submit your message. Please try again or email us directly at",
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("a", { href: "mailto:yum@localeffortfood.com", className: "underline", children: "yum@localeffortfood.com" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "flex justify-end gap-3 pt-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          Button,
          {
            type: "button",
            variant: "outline",
            onClick: () => onOpenChange(false),
            disabled: status === "submitting",
            children: "Cancel"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Button, { type: "submit", disabled: status === "submitting", children: status === "submitting" ? "Sending..." : "Submit" })
      ] })
    ] })
  ] }) });
};

// public/business.json?raw
var business_default = {
  name: "Local Effort Food Co.",
  description: "Personal chef and event catering serving Minneapolis, St. Paul, Roseville, and the Twin Cities. In-home private dinners, weekly meal prep, and small event catering.",
  services: ["personal chef", "meal prep", "event catering"],
  serviceArea: ["Minneapolis", "St. Paul", "Roseville", "Twin Cities", "Minnesota", "Western Wisconsin"],
  telephone: "+1-612-555-XXXX",
  url: "https://localeffortfood.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "ENTER ACTUAL BUSINESS ADDRESS",
    addressLocality: "Minneapolis",
    addressRegion: "MN",
    postalCode: "554xx",
    addressCountry: "US"
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 44.9778,
    longitude: -93.265
  },
  sameAs: [
    "https://www.instagram.com/localeffortfood",
    "https://www.facebook.com/localeffortfood",
    "https://www.tiktok.com/@localeffort"
  ]
};

// public/reviews/thumbtack.json?raw
var thumbtack_default = [
  {
    quote: "Weston freaking (he\u2019s going to make me curse) Smith!! [b] Weston was the best decision I could\u2019ve made for my wife\u2019s birthday. [/b] He has a light presence to him and he\u2019s very thoughtful in his approach. Not only is he very easy to talk to, he uses local ingredients sourced from Minnesota and Wisconsin. I can\u2019t speak enough on how great he paired all of the flavors of every dish. He cleaned up after himself and [i]there\u2019s a reason why Weston Smith is #1.[/i]",
    author: "PASTOR B.",
    context: "Thumbtack \xB7 Verified \xB7 Feb 16, 2024 \xB7 5\u2605"
  },
  {
    quote: "Had Weston over to cook a plated dinner for the family after our daughter\u2019s birthday. Prompt concise details to organize and we loved the local ingredients. [b]Definitely recommend for intimate and delicious dinners.[/b]",
    author: "Alexander E.",
    context: "Thumbtack \xB7 Verified \xB7 Jan 28, 2024 \xB7 5\u2605"
  },
  {
    quote: "From the initial inquiry through to the final bite of delicious food every detail and expectation was exceeded. The menu was original and also appealing to our entire dinner party. The food and ingredients were sourced locally and of the best quality, every dish was prepared perfectly. [b]It was not just a meal, but an experience[/b] and we were all so grateful for the wonderful evening! Many thanks!",
    author: "Melissa S.",
    context: "Thumbtack \xB7 Verified \xB7 Sep 4, 2023 \xB7 5\u2605"
  },
  {
    quote: "Weston was so gracious as to add our event to his schedule last minute despite already being booked earlier in the day. Everyone was impressed with the great menu, delicious food (kids included!) and friendly service.",
    author: "Amanda W.",
    context: "Thumbtack \xB7 Verified \xB7 Aug 22, 2023 \xB7 5\u2605"
  },
  {
    quote: "I hired Weston as a gift to my partner for our anniversary. The experience could not have been more amazing! Weston was extremely responsive on Thumbtack, and quickly made adjustments to the menu based on our preferences. He was very fun to chat with while he was cooking, and had a lot of details to share about the ingredients he was using. We are excited to hire Weston again, and would recommend him to anyone!",
    author: "Kendra W.",
    context: "Thumbtack \xB7 Verified \xB7 Jul 28, 2023 \xB7 5\u2605"
  },
  {
    quote: "Think of the Taste, Quality, Creativity and Service of the best restaurant in Minneapolis and then bring it to your home\u2026 that\u2019s what Weston delivers! I hired Weston for a small dinner party for my husbands birthday. He was very responsive, worked with me on planning a menu that exceeded expectations for my budget and taste, and helped with making excellent wine recommendations. He was a pleasure to have at my home and presented everything beautifully. He was efficient and thorough in cleaning up afterwards. [b]Did I mention the FOOD WAS OUT OF THIS WORLD?[/b] Highly recommend! Hire him today! I\u2019m already trying to figure out when we can have him back again\u2026",
    author: "Emily K.",
    context: "Thumbtack \xB7 Verified \xB7 Mar 26, 2023 \xB7 5\u2605"
  },
  {
    quote: "[b]Weston with Local Effort Food Co is phenomenal![/b] We hired him for our anniversary and the food was spectacular! He was incredibly responsive in the planning process and we enjoyed hearing his stories while he cooked. [b]Plus, we scheduled him after the kids went to bed [/b] which was the perfect ending to our day! We will absolutely be hiring him again!",
    author: "Ashley G.",
    context: "Thumbtack \xB7 Verified \xB7 Oct 30, 2022 \xB7 5\u2605"
  },
  {
    quote: "We hired Weston to cook for a group of 10 for a couples shower we were hosting. He absolutely surpassed all our expectations! He was very responsive and easy to work with setting the menu. But best of all, his imagination and menus made for a yummy dining experience vs just a meal. We would definitely hire him again- and would highly recommend!",
    author: "Susan B.",
    context: "Thumbtack \xB7 Verified \xB7 Aug 30, 2022 \xB7 5\u2605"
  },
  {
    quote: "We were looking for a special way to celebrate my wife\u2019s birthday. We found Weston through thumbtack and booked him to cook a special dinner for 6. It was amazing! His communication up front was excellent, he uses local fresh ingredients and the food was great! He is friendly, professional, and no mess to clean after. We will be booking Weston again.",
    author: "Brad G.",
    context: "Thumbtack \xB7 Verified \xB7 Jul 25, 2022 \xB7 5\u2605"
  },
  {
    quote: "It\u2019s such a pleasure to work with people who not only have the necessary expertise for a great culinary experience but who also clearly care [i]very deeply[/i] about what they are doing! Highest recommendation.",
    author: "Garett S.",
    context: "Thumbtack \xB7 Verified \xB7 Jan 16, 2022 \xB7 5\u2605"
  }
];

// src/data/staticContent.js
var safeParse = (jsonString, fallback) => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
};
var businessInfo = safeParse(business_default, {});
var thumbtackReviews = safeParse(thumbtack_default, []);

// src/partners/happymonday/menuItems.js
var HAPPY_MONDAY_MENU_ITEMS = [
  { id: 1, name: "Egg Salad Sandwich", price: 5.1, category: "Sandwiches" },
  { id: 2, name: "Turkey Breast", price: 6.1, category: "Sandwiches" },
  { id: 3, name: "Roast Beef", price: 7.1, category: "Sandwiches" },
  { id: 4, name: "Pastrami", price: 7.1, category: "Sandwiches" },
  { id: 5, name: "Mortadella", price: 7.1, category: "Sandwiches" },
  { id: 6, name: "Vegetable", price: 6.1, category: "Sandwiches" },
  { id: 7, name: '12" Cheese', price: 7.1, category: "Pizza" },
  { id: 8, name: '4" Cheese', price: 3.6, category: "Pizza" },
  { id: 9, name: '4" Pepperoni', price: 3.6, category: "Pizza" },
  { id: 10, name: '12" Pepperoni', price: 8.1, category: "Pizza" },
  { id: 11, name: '12" Seasonal', price: 8.1, category: "Pizza" },
  { id: 12, name: '12" Supreme', price: 8.1, category: "Pizza" },
  { id: 13, name: '12" Gluten Free', price: 8.1, category: "Pizza" },
  { id: 14, name: "Beet Salad", price: 5.1, category: "Salads" },
  { id: 15, name: "Pasta Salad (gluten free)", price: 3.1, category: "Salads" },
  { id: 16, name: "Yogurt & Granola (gluten free)", price: 3.1, category: "Breakfast" },
  { id: 17, name: "Yogurt & Granola with chocolate (gluten free)", price: 4.1, category: "Breakfast" },
  { id: 18, name: "Chia Pudding", price: 3.1, category: "Breakfast" },
  { id: 19, name: "Chia Pudding (dairy free)", price: 4.1, category: "Breakfast" }
];

// src/pages/FullPageDemoPage.jsx
var import_jsx_runtime22 = require("react/jsx-runtime");
var SMALL_EVENT_CONFIG = {
  dinner: {
    label: "Dinner party",
    baseRate: 85,
    minimumTotal: 0,
    minGuests: 4,
    maxGuests: 16,
    staffingGuestsPer: 8,
    staffingHourly: 45,
    staffingHours: 4,
    rangeMin: 0.9,
    rangeMax: 1.2
  },
  pizza: {
    label: "Pizza Party",
    baseRate: 85,
    minimumTotal: 0,
    minGuests: 4,
    maxGuests: 16,
    staffingGuestsPer: 8,
    staffingHourly: 45,
    staffingHours: 4,
    rangeMin: 0.9,
    rangeMax: 1.2
  },
  weddings: {
    label: "Weddings",
    baseRate: 45,
    minimumTotal: 0,
    maxGuests: 50,
    staffingGuestsPer: 12,
    staffingHourly: 55,
    staffingHours: 6,
    rangeMin: 0.92,
    rangeMax: 1.25
  },
  holiday: {
    label: "Small events",
    baseRate: 45,
    minimumTotal: 0,
    maxGuests: 75,
    staffingGuestsPer: 15,
    staffingHourly: 40,
    staffingHours: 4,
    rangeMin: 0.9,
    rangeMax: 1.18
  }
};
var EVENT_TYPES = Object.keys(SMALL_EVENT_CONFIG);
var DEFAULT_DEPOSIT_PERCENT = 0.15;
var ESTIMATE_LIFESPAN_DAYS = 5;
var ANNOUNCEMENT_HEIGHT = 56;
var BUSINESS_CONTACT_OPTIONS = {
  wholesale: "Wholesale",
  consulting: "Restaurant consulting",
  collaborations: "Collaborations"
};
var SMALL_EVENTS_CONTACT_OPTIONS = {
  dinner: "Dinner at your home",
  weddings: "Weddings and showers",
  holiday: "Small events and holiday parties"
};
var ABOUT_INFO_BLOCKS = [
  {
    title: "At a glance",
    items: [
      "Founded in 2022",
      "Based in Minneapolis, MN",
      "100% locally sourced focus"
    ]
  },
  {
    title: "Foods we specialize in",
    items: [
      "sourdough breads from local grain",
      "fresh pasta",
      "pies, cakes, pastry and patisserie",
      "braised meat, smoked meat, cured meat",
      "kid's food",
      "bean-to-bar chocolate",
      "100% local pizza"
    ]
  },
  {
    title: "Services we offer",
    items: [
      "Meal planning and nutrition support for families",
      "Catering and events built around local ingredients",
      "Completely local pizzas - our specialty"
    ]
  },
  {
    title: "Principles",
    items: [
      "Celebrating home cooks",
      "Supporting family nutrition",
      "Spending with local producers",
      "Collaborating with Minnesota organizations",
      "Sharing and shaping Minnesota food culture"
    ]
  },
  {
    title: "How we stay local",
    items: [
      "Minnesota-first sourcing; regional when sensible",
      "Seasonal menus; preserve when possible",
      "Direct relationships with farms and mills",
      "Reasonable exceptions for essentials (like olive oil)",
      "Transparency: ask us about any ingredient"
    ]
  }
];
var formatCurrency = (value, options = {}) => {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0
  } = options;
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits,
    maximumFractionDigits
  }).format(safeValue);
};
var centsToDollars = (value) => {
  const cents = Number(value);
  if (!Number.isFinite(cents)) return 0;
  return cents / 100;
};
var toDateInputValue = (date) => {
  if (!date) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
};
var addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
var createSmallEventDefaults = (type) => ({
  type,
  estimateId: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  eventDate: "",
  eventTime: "",
  alternateDates: "",
  guestCount: "",
  location: "",
  serviceStyle: "",
  menuNotes: "",
  dietary: "",
  rentals: "",
  budgetRange: "",
  notes: "",
  courses: "",
  plannerInfo: "",
  celebrationType: "",
  kitchenAccess: "",
  wantsAccount: false,
  accountEmail: "",
  accountPassword: "",
  expiresAt: "",
  holdId: "",
  holdSlotId: "",
  holdUntil: "",
  holdStatus: "",
  depositOverridePercent: "",
  depositOverrideAmount: "",
  depositStatus: "unpaid",
  serverEstimate: null,
  lastEditedAt: (/* @__PURE__ */ new Date()).toISOString()
});
var buildInitialAvailability = () => {
  const today = /* @__PURE__ */ new Date();
  const makeSlot = (daysOut, type, status, notes = "") => ({
    id: `slot-${type}-${daysOut}`,
    date: toDateInputValue(addDays(today, daysOut)),
    type,
    status,
    notes,
    source: "manual"
  });
  return [
    makeSlot(4, "dinner", "open", "Weeknight availability"),
    makeSlot(5, "pizza", "open", "Oven ready"),
    makeSlot(6, "holiday", "open", "Weeknight availability"),
    makeSlot(8, "dinner", "blocked", "Staffing hold"),
    makeSlot(9, "pizza", "open", "Friday night"),
    makeSlot(10, "weddings", "open", "Preferred Saturday"),
    makeSlot(12, "holiday", "open", "Corporate-friendly"),
    makeSlot(15, "weddings", "blocked", "Venue conflict"),
    makeSlot(18, "dinner", "open", "Weekend window"),
    makeSlot(19, "pizza", "blocked", "Private event"),
    makeSlot(21, "holiday", "open", "Holiday week"),
    makeSlot(24, "weddings", "open", "Saturday or Sunday")
  ];
};
var BRAND_TOKENS = {
  bgPage: "var(--color-bg-page)",
  bgSection: "var(--color-bg-section)",
  bgSecondary: "var(--color-bg-secondary)",
  bgStrong: "var(--color-border-strong)",
  textPrimary: "var(--color-text-primary)",
  textInverse: "var(--color-text-inverse)",
  borderDefault: "var(--color-border-default)",
  surfaceMuted: "var(--color-surface-muted)",
  overlayStrong: "var(--color-overlay-strong)"
};
var getImageId = (img) => img.asset_id || img.public_id;
var getImageScale = (id) => {
  if (!id) return 1;
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1e3;
  }
  const normalized = hash / 1e3;
  return 0.85 + normalized * 0.45;
};
var GalleryItem = ({
  id,
  img,
  index,
  pos,
  layoutReady,
  onSelect,
  onPrefetch,
  disableDrag
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = (0, import_sortable.useSortable)({ id, disabled: disableDrag });
  const dragOffset = isDragging && transform ? transform : { x: 0, y: 0 };
  const style = {
    position: "absolute",
    width: pos.width,
    height: pos.height,
    transform: import_utilities.CSS.Translate.toString({
      x: pos.x + dragOffset.x,
      y: pos.y + dragOffset.y
    }),
    transition: isDragging ? "none" : transition || "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
    opacity: layoutReady ? 1 : 0,
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 50 : 1,
    willChange: "transform",
    pointerEvents: layoutReady ? "auto" : "none",
    touchAction: "none"
  };
  return /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
    "div",
    {
      ref: setNodeRef,
      style,
      className: `gallery-tile ${isDragging ? "is-dragging" : ""}`,
      onMouseEnter: () => img?.large_url && onPrefetch(img.large_url),
      onClick: () => onSelect(id),
      ...attributes,
      ...listeners,
      children: img.thumbnail_url ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
        "img",
        {
          src: img.thumbnail_url,
          alt: img.context?.alt || "Gallery image",
          className: "gallery-image w-full h-full block select-none pointer-events-none object-cover",
          draggable: false,
          loading: "eager",
          decoding: "async",
          fetchpriority: index < 20 ? "high" : "auto",
          style: {
            transition: "none",
            display: "block"
          }
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
        cloudinaryImage_default,
        {
          publicId: img.public_id,
          alt: img.context?.alt || "Gallery image",
          width: Math.floor(pos.width),
          className: "gallery-image w-full h-full block select-none pointer-events-none object-cover",
          disableLazy: index < 20
        }
      )
    }
  );
};
var FullPageDemoPage = () => {
  const [activePage, setActivePage] = (0, import_react13.useState)(0);
  const [images, setImages] = (0, import_react13.useState)([]);
  const [loading, setLoading] = (0, import_react13.useState)(true);
  const [selected, setSelected] = (0, import_react13.useState)(null);
  const [activeDragId, setActiveDragId] = (0, import_react13.useState)(null);
  const prefetched = (0, import_react13.useRef)(/* @__PURE__ */ new Set());
  const closeBtnRef = (0, import_react13.useRef)(null);
  const lastDragEndRef = (0, import_react13.useRef)(0);
  const [columnOrder, setColumnOrder] = (0, import_react13.useState)([]);
  const [positions, setPositions] = (0, import_react13.useState)({});
  const [galleryHeight, setGalleryHeight] = (0, import_react13.useState)(2e3);
  const [layoutConfig, setLayoutConfig] = (0, import_react13.useState)({ columns: 0, columnWidth: 0, gap: 10 });
  const containerRef = (0, import_react13.useRef)(null);
  const [layoutReady, setLayoutReady] = (0, import_react13.useState)(false);
  const [orderOpen, setOrderOpen] = (0, import_react13.useState)(false);
  const [smallEventsDialog, setSmallEventsDialog] = (0, import_react13.useState)(null);
  const [smallEventForms, setSmallEventForms] = (0, import_react13.useState)(() => ({
    dinner: createSmallEventDefaults("dinner"),
    pizza: createSmallEventDefaults("pizza"),
    weddings: createSmallEventDefaults("weddings"),
    holiday: createSmallEventDefaults("holiday")
  }));
  const [availabilitySlots, setAvailabilitySlots] = (0, import_react13.useState)(() => buildInitialAvailability());
  const [calendarHolds, setCalendarHolds] = (0, import_react13.useState)([]);
  const [isCalendarAdmin, setIsCalendarAdmin] = (0, import_react13.useState)(false);
  const [adminSlotDraft, setAdminSlotDraft] = (0, import_react13.useState)({
    date: "",
    type: "dinner",
    status: "open",
    notes: "",
    applyToAllTypes: false
  });
  const [smallEventsSessionToken, setSmallEventsSessionToken] = (0, import_react13.useState)("");
  const [smallEventsSaving, setSmallEventsSaving] = (0, import_react13.useState)(false);
  const [smallEventsNotice, setSmallEventsNotice] = (0, import_react13.useState)("");
  const [availabilityLoading, setAvailabilityLoading] = (0, import_react13.useState)(false);
  const [showWaitlistForm, setShowWaitlistForm] = (0, import_react13.useState)(false);
  const [waitlistStatus, setWaitlistStatus] = (0, import_react13.useState)("idle");
  const [waitlist, setWaitlist] = (0, import_react13.useState)({
    name: "",
    email: "",
    phone: "",
    familySize: "",
    children: "",
    daysPerWeek: "",
    mealsPerDay: "",
    allergies: "",
    questions: ""
  });
  const [mealPlanImages, setMealPlanImages] = (0, import_react13.useState)([]);
  const [mealPlanLoading, setMealPlanLoading] = (0, import_react13.useState)(false);
  const [mealPlanError, setMealPlanError] = (0, import_react13.useState)(null);
  const [aboutGalleryImages, setAboutGalleryImages] = (0, import_react13.useState)([]);
  const [aboutGalleryLoading, setAboutGalleryLoading] = (0, import_react13.useState)(false);
  const [aboutGalleryError, setAboutGalleryError] = (0, import_react13.useState)(null);
  const [pizzaImages, setPizzaImages] = (0, import_react13.useState)([]);
  const [pizzaLoading, setPizzaLoading] = (0, import_react13.useState)(false);
  const [pizzaError, setPizzaError] = (0, import_react13.useState)(null);
  const [partners, setPartners] = (0, import_react13.useState)([]);
  const [businessPanel, setBusinessPanel] = (0, import_react13.useState)(null);
  const [wholesaleEmail, setWholesaleEmail] = (0, import_react13.useState)("");
  const [wholesaleSubmitted, setWholesaleSubmitted] = (0, import_react13.useState)(false);
  const [wholesaleMenuItems, setWholesaleMenuItems] = (0, import_react13.useState)([]);
  const [wholesaleMenuLoading, setWholesaleMenuLoading] = (0, import_react13.useState)(false);
  const [wholesaleMenuError, setWholesaleMenuError] = (0, import_react13.useState)("");
  const [officeLunchesOpen, setOfficeLunchesOpen] = (0, import_react13.useState)(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = (0, import_react13.useState)(false);
  const [quoteDialogType, setQuoteDialogType] = (0, import_react13.useState)("");
  const [quoteName, setQuoteName] = (0, import_react13.useState)("");
  const [quoteEmail, setQuoteEmail] = (0, import_react13.useState)("");
  const [quoteMessage, setQuoteMessage] = (0, import_react13.useState)("");
  const [quoteStatus, setQuoteStatus] = (0, import_react13.useState)("idle");
  const [quoteError, setQuoteError] = (0, import_react13.useState)("");
  const [announcementVisible, setAnnouncementVisible] = (0, import_react13.useState)(false);
  const [announcementOpen, setAnnouncementOpen] = (0, import_react13.useState)(false);
  const [caseStudyImage, setCaseStudyImage] = (0, import_react13.useState)(null);
  const [aboutFaqOpen, setAboutFaqOpen] = (0, import_react13.useState)(0);
  const [showFeedback, setShowFeedback] = (0, import_react13.useState)(false);
  const [fb, setFb] = (0, import_react13.useState)({ name: "", email: "", sentiment: "positive", message: "" });
  const [fbStatus, setFbStatus] = (0, import_react13.useState)("idle");
  const [liveFeedback, setLiveFeedback] = (0, import_react13.useState)([]);
  const [businessContactOpen, setBusinessContactOpen] = (0, import_react13.useState)(false);
  const [businessContactType, setBusinessContactType] = (0, import_react13.useState)("wholesale");
  const [businessContactName, setBusinessContactName] = (0, import_react13.useState)("");
  const [businessContactEmail, setBusinessContactEmail] = (0, import_react13.useState)("");
  const [businessContactPhone, setBusinessContactPhone] = (0, import_react13.useState)("");
  const [businessContactOrg, setBusinessContactOrg] = (0, import_react13.useState)("");
  const [businessContactMessage, setBusinessContactMessage] = (0, import_react13.useState)("");
  const [businessContactStatus, setBusinessContactStatus] = (0, import_react13.useState)("idle");
  const [businessContactError, setBusinessContactError] = (0, import_react13.useState)("");
  const [smallEventsContactOpen, setSmallEventsContactOpen] = (0, import_react13.useState)(false);
  const [smallEventsContactType, setSmallEventsContactType] = (0, import_react13.useState)("dinner");
  const [smallEventsContactName, setSmallEventsContactName] = (0, import_react13.useState)("");
  const [smallEventsContactEmail, setSmallEventsContactEmail] = (0, import_react13.useState)("");
  const [smallEventsContactPhone, setSmallEventsContactPhone] = (0, import_react13.useState)("");
  const [smallEventsContactMessage, setSmallEventsContactMessage] = (0, import_react13.useState)("");
  const [smallEventsContactStatus, setSmallEventsContactStatus] = (0, import_react13.useState)("idle");
  const [smallEventsContactError, setSmallEventsContactError] = (0, import_react13.useState)("");
  const [askChefOpen, setAskChefOpen] = (0, import_react13.useState)(false);
  const pages = FULLPAGE_PAGES;
  const sensors = (0, import_core.useSensors)(
    (0, import_core.useSensor)(import_core.PointerSensor, { activationConstraint: { distance: 8 } })
  );
  (0, import_react13.useEffect)(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("smallEventsSessionToken") || "";
    if (stored) setSmallEventsSessionToken(stored);
  }, []);
  const getStoredAdminToken = () => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("smallEventsAdminToken") || "";
  };
  const buildSmallEventsHeaders = (overrides = {}) => {
    const headers = { "Content-Type": "application/json", ...overrides };
    if (smallEventsSessionToken) {
      headers.Authorization = `Bearer ${smallEventsSessionToken}`;
    }
    const adminToken = getStoredAdminToken();
    if (adminToken) {
      headers["x-admin-token"] = adminToken;
    }
    return headers;
  };
  const loadSmallEventsAvailability = async (type) => {
    setAvailabilityLoading(true);
    try {
      const query = type ? `?type=${encodeURIComponent(type)}` : "";
      const res = await fetch(`/api/small-events/availability${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed loading availability");
      setAvailabilitySlots(Array.isArray(data?.slots) ? data.slots : []);
      setCalendarHolds(Array.isArray(data?.holds) ? data.holds : []);
    } catch (error) {
      console.error("Small events availability load error:", error);
    } finally {
      setAvailabilityLoading(false);
    }
  };
  const updateSmallEventForm = (type, field, value) => {
    setSmallEventForms((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
        lastEditedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    }));
  };
  const getSmallEventForm = (type) => smallEventForms[type] || createSmallEventDefaults(type);
  const parseGuestCount = (value) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const clampGuestCount = (value, config) => {
    if (value === "" || value === null || value === void 0) return 0;
    let count3 = parseGuestCount(value);
    if (count3 <= 0) return 0;
    if (config?.minGuests && count3 < config.minGuests) count3 = config.minGuests;
    if (config?.maxGuests && count3 > config.maxGuests) count3 = config.maxGuests;
    return count3;
  };
  const getDepositPercent = (form) => {
    const override = parseFloat(form.depositOverridePercent);
    if (!Number.isNaN(override) && override > 0) return override / 100;
    return DEFAULT_DEPOSIT_PERCENT;
  };
  const getEstimateExpiry = (form) => {
    if (form?.expiresAt) {
      const parsed = new Date(form.expiresAt);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const base = form?.lastEditedAt ? new Date(form.lastEditedAt) : /* @__PURE__ */ new Date();
    return addDays(base, ESTIMATE_LIFESPAN_DAYS);
  };
  const handleBusinessSelect = (panel) => {
    setBusinessPanel(panel);
    if (panel === "office") {
      setOfficeLunchesOpen(true);
    }
  };
  const handleWholesaleSubmit = (event) => {
    event.preventDefault();
    if (!wholesaleEmail) return;
    setWholesaleSubmitted(true);
  };
  const openQuoteDialog = (type) => {
    const form = getSmallEventForm(type);
    setQuoteDialogType(type);
    setQuoteName(form.contactName || "");
    setQuoteEmail(form.contactEmail || "");
    setQuoteMessage("");
    setQuoteStatus("idle");
    setQuoteError("");
    setQuoteDialogOpen(true);
  };
  const buildQuoteMessage = (type) => {
    const config = SMALL_EVENT_CONFIG[type];
    const form = getSmallEventForm(type);
    const estimate = getEstimateForType(type);
    const depositPercent = getDepositPercent(form);
    const depositLabel = form.depositOverrideAmount ? `${formatCurrency(Number(form.depositOverrideAmount), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} flat` : `${Math.round(depositPercent * 100)}%`;
    const guestCount = clampGuestCount(form.guestCount, config);
    const fallbackHold = form.estimateId ? calendarHolds.find((hold2) => hold2.estimateId === form.estimateId) : null;
    const hold = getHoldForSlot(form.holdSlotId) || fallbackHold;
    const lines = [];
    const addLine = (label, value) => {
      if (value === void 0 || value === null || value === "") return;
      lines.push(`${label}: ${value}`);
    };
    addLine("Event type", config?.label || type);
    addLine("Guest count", guestCount || form.guestCount);
    addLine("Contact name", form.contactName || quoteName);
    addLine("Contact email", form.contactEmail || quoteEmail);
    addLine("Contact phone", form.contactPhone);
    addLine("Event date", form.eventDate);
    addLine("Event time", form.eventTime);
    addLine("Location", form.location);
    addLine("Service style", form.serviceStyle);
    addLine("Menu notes", form.menuNotes);
    addLine("Dietary notes", form.dietary);
    addLine("Rentals or staffing", form.rentals);
    if (type === "dinner" || type === "pizza") {
      addLine("Course count", form.courses);
      addLine("Kitchen access", form.kitchenAccess);
    }
    if (type === "weddings") {
      addLine("Planner or contact", form.plannerInfo);
      addLine("Meal moments", form.celebrationType);
    }
    if (type === "holiday") {
      addLine("Occasion", form.celebrationType);
      addLine("Setup needs", form.kitchenAccess);
    }
    if (estimate && (guestCount || form.guestCount)) {
      addLine("Estimate range", `${formatCurrency(estimate.estimateMin)} - ${formatCurrency(estimate.estimateMax)}`);
      if (type === "weddings" && estimate.coordinationFee) {
        addLine("Event coordination (5%)", formatCurrency(estimate.coordinationFee));
      }
      addLine(
        "Deposit",
        `${depositLabel} (${formatCurrency(estimate.depositAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
      );
    }
    if (hold) {
      addLine("Hold status", hold.status || "hold");
      if (hold.holdUntil) {
        addLine("Hold until", new Date(hold.holdUntil).toLocaleString());
      }
      if (hold.slotId) {
        addLine("Hold slot", hold.slotId);
      }
    }
    const note = quoteMessage.trim();
    if (note) {
      lines.push("");
      lines.push("Customer note:");
      lines.push(note);
    }
    return lines.join("\n");
  };
  const submitQuoteMessage = async (event) => {
    event.preventDefault();
    const type = quoteDialogType;
    if (!type) return;
    setQuoteStatus("sending");
    setQuoteError("");
    try {
      const config = SMALL_EVENT_CONFIG[type];
      const payload = {
        name: quoteName || void 0,
        email: quoteEmail || void 0,
        subject: `Small events quote request: ${config?.label || type}`,
        category: "small-events",
        type,
        message: buildQuoteMessage(type)
      };
      const res = await fetch("/api/messages/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Unable to send message");
      setQuoteStatus("success");
    } catch (error) {
      setQuoteStatus("error");
      setQuoteError(error.message || "Unable to send message");
    }
  };
  const getEstimateForType = (type) => {
    const config = SMALL_EVENT_CONFIG[type];
    const form = getSmallEventForm(type);
    if (!config) return null;
    if (form.serverEstimate) return form.serverEstimate;
    const guestCount = clampGuestCount(form.guestCount, config);
    const staffingCount = guestCount ? Math.max(1, Math.ceil(guestCount / config.staffingGuestsPer)) : 0;
    const staffingCost = staffingCount * config.staffingHourly * config.staffingHours;
    const foodCost = guestCount * config.baseRate;
    const baseSubtotal = Math.max(foodCost + staffingCost, config.minimumTotal);
    const coordinationFee = type === "weddings" ? baseSubtotal * 0.05 : 0;
    const subtotal = baseSubtotal + coordinationFee;
    const estimateMin = subtotal * config.rangeMin;
    const estimateMax = subtotal * config.rangeMax;
    const depositPercent = getDepositPercent(form);
    const depositAmount = form.depositOverrideAmount ? Number(form.depositOverrideAmount) : subtotal * depositPercent;
    return {
      guestCount,
      staffingCount,
      staffingCost,
      coordinationFee,
      subtotal,
      estimateMin,
      estimateMax,
      depositPercent,
      depositAmount
    };
  };
  const applyEstimateResponse = (type, estimate, hold) => {
    if (!estimate) return;
    const serverEstimate = {
      guestCount: estimate.guestCount || 0,
      staffingCount: estimate.staffingCount || 0,
      staffingCost: centsToDollars(estimate.staffingCostCents || 0),
      coordinationFee: centsToDollars(estimate.coordinationFeeCents || 0),
      subtotal: centsToDollars(estimate.subtotalCents || 0),
      estimateMin: centsToDollars(estimate.estimateMinCents || 0),
      estimateMax: centsToDollars(estimate.estimateMaxCents || 0),
      depositPercent: estimate.depositPercent ? estimate.depositPercent / 100 : DEFAULT_DEPOSIT_PERCENT,
      depositAmount: centsToDollars(estimate.depositAmountCents || 0)
    };
    setSmallEventForms((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        estimateId: estimate.id,
        depositStatus: estimate.depositStatus || prev[type].depositStatus,
        lastEditedAt: estimate.lastEditedAt || prev[type].lastEditedAt,
        expiresAt: estimate.expiresAt || prev[type].expiresAt,
        holdSlotId: hold?.slotId || prev[type].holdSlotId,
        holdUntil: hold?.holdUntil || prev[type].holdUntil,
        holdStatus: hold?.status || prev[type].holdStatus,
        serverEstimate
      }
    }));
  };
  const applyEstimateToForm = (type, estimate) => {
    if (!estimate) return;
    const serverEstimate = {
      guestCount: estimate.guestCount || 0,
      staffingCount: estimate.staffingCount || 0,
      staffingCost: centsToDollars(estimate.staffingCostCents || 0),
      coordinationFee: centsToDollars(estimate.coordinationFeeCents || 0),
      subtotal: centsToDollars(estimate.subtotalCents || 0),
      estimateMin: centsToDollars(estimate.estimateMinCents || 0),
      estimateMax: centsToDollars(estimate.estimateMaxCents || 0),
      depositPercent: estimate.depositPercent ? estimate.depositPercent / 100 : DEFAULT_DEPOSIT_PERCENT,
      depositAmount: centsToDollars(estimate.depositAmountCents || 0)
    };
    setSmallEventForms((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        estimateId: estimate.id,
        contactName: estimate.contactName || "",
        contactEmail: estimate.contactEmail || "",
        contactPhone: estimate.contactPhone || "",
        guestCount: estimate.guestCount || "",
        eventDate: estimate.eventDate || "",
        eventTime: estimate.eventTime || "",
        alternateDates: estimate.alternateDates || "",
        location: estimate.location || "",
        serviceStyle: estimate.serviceStyle || "",
        budgetRange: estimate.budgetRange || "",
        menuNotes: estimate.menuNotes || "",
        dietary: estimate.dietary || "",
        rentals: estimate.rentals || "",
        notes: estimate.notes || "",
        courses: estimate.courses || "",
        plannerInfo: estimate.plannerInfo || "",
        celebrationType: estimate.celebrationType || "",
        kitchenAccess: estimate.kitchenAccess || "",
        depositStatus: estimate.depositStatus || prev[type].depositStatus,
        lastEditedAt: estimate.lastEditedAt || prev[type].lastEditedAt,
        expiresAt: estimate.expiresAt || prev[type].expiresAt,
        holdSlotId: estimate.hold?.slotId || prev[type].holdSlotId,
        holdUntil: estimate.hold?.holdUntil || prev[type].holdUntil,
        holdStatus: estimate.hold?.status || prev[type].holdStatus,
        serverEstimate
      }
    }));
  };
  const saveEstimate = async (type, options = {}) => {
    const form = getSmallEventForm(type);
    setSmallEventsSaving(true);
    setSmallEventsNotice("");
    try {
      const payload = {
        estimateId: form.estimateId || void 0,
        type,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        guestCount: form.guestCount,
        eventDate: form.eventDate,
        eventTime: form.eventTime,
        alternateDates: form.alternateDates,
        location: form.location,
        serviceStyle: form.serviceStyle,
        budgetRange: form.budgetRange,
        menuNotes: form.menuNotes,
        dietary: form.dietary,
        rentals: form.rentals,
        notes: form.notes,
        courses: form.courses,
        plannerInfo: form.plannerInfo,
        celebrationType: form.celebrationType,
        kitchenAccess: form.kitchenAccess,
        depositOverridePercent: form.depositOverridePercent,
        depositOverrideAmount: form.depositOverrideAmount,
        accountEmail: form.accountEmail,
        accountPassword: form.accountPassword,
        wantsAccount: form.wantsAccount,
        extend: options.extend || false
      };
      const res = await fetch("/api/small-events/estimates", {
        method: "POST",
        headers: buildSmallEventsHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save estimate");
      if (data?.sessionToken && typeof window !== "undefined") {
        window.localStorage.setItem("smallEventsSessionToken", data.sessionToken);
        setSmallEventsSessionToken(data.sessionToken);
      }
      applyEstimateResponse(type, data?.estimate, data?.hold);
      setSmallEventsNotice("Estimate saved.");
      return data?.estimate || null;
    } catch (error) {
      console.error("Small events save error:", error);
      setSmallEventsNotice(error.message || "Unable to save estimate.");
      return null;
    } finally {
      setSmallEventsSaving(false);
    }
  };
  const loadLatestEstimate = async (type) => {
    setSmallEventsNotice("");
    try {
      const res = await fetch("/api/small-events/estimates", {
        headers: buildSmallEventsHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load saved estimates");
      const items = Array.isArray(data?.items) ? data.items : [];
      const match = items.find((item) => item.type === type);
      if (!match) {
        setSmallEventsNotice("No saved estimate found for this event type.");
        return;
      }
      applyEstimateToForm(type, match);
      setSmallEventsNotice("Loaded your saved estimate.");
    } catch (error) {
      console.error("Load estimate error:", error);
      setSmallEventsNotice(error.message || "Unable to load estimate.");
    }
  };
  const getHoldForSlot = (slotId) => {
    if (!slotId) return null;
    const hold = calendarHolds.find((item) => item.slotId === slotId);
    if (!hold) return null;
    const holdTime = new Date(hold.holdUntil).getTime();
    if (hold.status !== "confirmed" && holdTime < Date.now()) return null;
    return hold;
  };
  const holdSlot = async (slotId, type) => {
    if (!slotId) return;
    const form = getSmallEventForm(type);
    let estimateId = form.estimateId;
    if (!estimateId) {
      const saved = await saveEstimate(type);
      estimateId = saved?.id || "";
    }
    if (!estimateId) {
      setSmallEventsNotice("Save the estimate before holding a date.");
      return;
    }
    try {
      const res = await fetch("/api/small-events/holds", {
        method: "POST",
        headers: buildSmallEventsHeaders(),
        body: JSON.stringify({ estimateId, slotId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to hold slot");
      applyEstimateResponse(type, data?.estimate, data?.hold);
      await loadSmallEventsAvailability();
    } catch (error) {
      console.error("Hold slot error:", error);
      setSmallEventsNotice(error.message || "Unable to hold slot.");
    }
  };
  const releaseHold = async (_slotId, type) => {
    const form = getSmallEventForm(type);
    if (!form.estimateId) return;
    try {
      const res = await fetch(`/api/small-events/holds?estimateId=${encodeURIComponent(form.estimateId)}`, {
        method: "DELETE",
        headers: buildSmallEventsHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to release hold");
      applyEstimateResponse(type, data?.estimate, null);
      await loadSmallEventsAvailability();
    } catch (error) {
      console.error("Release hold error:", error);
      setSmallEventsNotice(error.message || "Unable to release hold.");
    }
  };
  const startDepositCheckout = async (type) => {
    const form = getSmallEventForm(type);
    if (!form.estimateId) {
      setSmallEventsNotice("Save the estimate before paying a deposit.");
      return;
    }
    try {
      const res = await fetch("/api/small-events/checkout", {
        method: "POST",
        headers: buildSmallEventsHeaders(),
        body: JSON.stringify({ estimateId: form.estimateId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to start checkout");
      if (data?.url) {
        window.open(data.url, "_blank", "noopener");
      }
      setSmallEventForms((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          depositStatus: "pending"
        }
      }));
    } catch (error) {
      console.error("Deposit checkout error:", error);
      setSmallEventsNotice(error.message || "Unable to start deposit checkout.");
    }
  };
  const extendEstimate = async (type) => {
    await saveEstimate(type, { extend: true });
  };
  const updateAdminDraft = (field, value) => {
    setAdminSlotDraft((prev) => ({ ...prev, [field]: value }));
  };
  const applyAdminAvailability = async () => {
    if (!adminSlotDraft.date) return;
    try {
      const res = await fetch("/api/small-events/availability", {
        method: "POST",
        headers: buildSmallEventsHeaders(),
        body: JSON.stringify(adminSlotDraft)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update availability");
      await loadSmallEventsAvailability();
    } catch (error) {
      console.error("Admin availability update error:", error);
      setSmallEventsNotice(error.message || "Unable to update availability.");
    }
  };
  const clearExpiredHolds = async () => {
    try {
      const res = await fetch("/api/small-events/holds/cleanup", {
        method: "POST",
        headers: buildSmallEventsHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to clear holds");
      await loadSmallEventsAvailability();
    } catch (error) {
      console.error("Hold cleanup error:", error);
      setSmallEventsNotice(error.message || "Unable to clear holds.");
    }
  };
  const formatSlotDate = (value) => {
    if (!value) return "TBD";
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return value;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const renderSmallEventDialogContent = (type) => {
    const config = SMALL_EVENT_CONFIG[type];
    const form = getSmallEventForm(type);
    const estimate = getEstimateForType(type);
    const expiresAt = getEstimateExpiry(form);
    const fallbackHold = form.estimateId ? calendarHolds.find((hold) => hold.estimateId === form.estimateId) : null;
    const holdsOnSlot = getHoldForSlot(form.holdSlotId) || fallbackHold;
    const slots = availabilitySlots.filter((slot) => slot.type === type).sort((a, b) => a.date.localeCompare(b.date));
    const holdsBySlot = new Map(calendarHolds.map((hold) => [hold.slotId, hold]));
    const depositPercent = getDepositPercent(form);
    const depositLabel = form.depositOverrideAmount ? `${formatCurrency(Number(form.depositOverrideAmount), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} flat` : `${Math.round(depositPercent * 100)}%`;
    const introCopy = {
      dinner: {
        title: "Plan a cozy dinner party",
        subtitle: "Share what you can, and we will fill in the details together."
      },
      pizza: {
        title: "Plan a Pizza Party",
        subtitle: "Tell us the basics and we will bring the pizza party plan."
      },
      weddings: {
        title: "Plan the celebration feast",
        subtitle: "From welcome bites to late-night snacks, we help map the flow."
      },
      holiday: {
        title: "Plan your small event",
        subtitle: "Tell us the vibe and we will craft the menu around it."
      }
    };
    const intro = introCopy[type] || introCopy.holiday;
    const guestMin = config?.minGuests || 1;
    const guestMax = config?.maxGuests;
    const guestLimitLabel = [
      config?.minGuests ? `min ${config.minGuests}` : null,
      config?.maxGuests ? `max ${config.maxGuests}` : null
    ].filter(Boolean).join(", ");
    const selectedSlot = form.holdSlotId ? slots.find((slot) => slot.id === form.holdSlotId) : null;
    const selectedSlotLabel = selectedSlot ? formatSlotDate(selectedSlot.date) : "";
    const selectAvailabilitySlot = (slot) => {
      updateSmallEventForm(type, "eventDate", slot.date);
      updateSmallEventForm(type, "holdSlotId", slot.id);
    };
    const slotsByDate = new Map(slots.map((slot) => [slot.date, slot]));
    const getSlotStatusMeta = (slot) => {
      const hold = holdsBySlot.get(slot.id);
      const isHeldByCurrent = hold?.estimateId && hold.estimateId === form.estimateId;
      const isUnavailable = slot.status === "blocked" || !isHeldByCurrent && slot.status !== "open";
      const statusKey = slot.status === "open" ? "open" : slot.status === "blocked" ? "blocked" : isHeldByCurrent ? "held" : slot.status;
      const statusLabel = slot.status === "open" ? "Open" : slot.status === "blocked" ? "Blocked" : isHeldByCurrent ? "Your hold" : slot.status === "confirmed" ? "Confirmed" : "Held";
      return { hold, isHeldByCurrent, isUnavailable, statusKey, statusLabel };
    };
    const buildCalendarMonths = (count3 = 2) => {
      const today = /* @__PURE__ */ new Date();
      const firstSlotDate = slots.length ? new Date(slots[0].date) : today;
      const base = firstSlotDate > today ? firstSlotDate : today;
      const cursor = new Date(base.getFullYear(), base.getMonth(), 1);
      const months = [];
      for (let i = 0; i < count3; i += 1) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        const monthStart = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDay = monthStart.getDay();
        const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;
        const cells = [];
        for (let cell = 0; cell < totalCells; cell += 1) {
          const dayNumber = cell - startDay + 1;
          if (dayNumber < 1 || dayNumber > daysInMonth) {
            cells.push({ key: `empty-${year}-${month}-${cell}`, isOutside: true });
            continue;
          }
          const dateValue = new Date(year, month, dayNumber);
          const dateString = toDateInputValue(dateValue);
          cells.push({
            key: dateString,
            date: dateString,
            day: dayNumber,
            slot: slotsByDate.get(dateString) || null
          });
        }
        months.push({
          key: `${year}-${month}`,
          label: monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          cells
        });
        cursor.setMonth(month + 1);
      }
      return months;
    };
    const calendarSpan = (() => {
      if (slots.length === 0) return 2;
      const today = /* @__PURE__ */ new Date();
      const firstSlotDate = new Date(slots[0].date);
      const base = firstSlotDate > today ? firstSlotDate : today;
      const lastSlotDate = new Date(slots[slots.length - 1].date);
      const monthDiff = (lastSlotDate.getFullYear() - base.getFullYear()) * 12 + (lastSlotDate.getMonth() - base.getMonth());
      return Math.min(4, Math.max(2, monthDiff + 1));
    })();
    const calendarMonths = buildCalendarMonths(calendarSpan);
    if (!config) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "space-y-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-banner", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "form-fun-title", children: intro.title }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { className: "form-fun-help", children: intro.subtitle })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "form-fun-title", children: "Say hello" }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "form-fun-tag", children: "2 min" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { className: "form-fun-help", children: "Tell us who to follow up with." }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-3 grid gap-3 md:grid-cols-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Your name" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "text",
                  className: "mt-1",
                  value: form.contactName,
                  onChange: (e) => updateSmallEventForm(type, "contactName", e.target.value),
                  placeholder: "Full name"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Best email" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "email",
                  className: "mt-1",
                  value: form.contactEmail,
                  onChange: (e) => updateSmallEventForm(type, "contactEmail", e.target.value),
                  placeholder: "name@example.com"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Phone (optional)" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "tel",
                  className: "mt-1",
                  value: form.contactPhone,
                  onChange: (e) => updateSmallEventForm(type, "contactPhone", e.target.value),
                  placeholder: "(555) 555-5555"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("label", { className: "form-fun-label", children: [
                "Guest count",
                guestLimitLabel ? ` (${guestLimitLabel})` : ""
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "number",
                  min: guestMin,
                  max: guestMax,
                  className: "mt-1",
                  value: form.guestCount,
                  onChange: (e) => updateSmallEventForm(type, "guestCount", e.target.value),
                  placeholder: "ex: 18"
                }
              )
            ] })
          ] })
        ] }),
        (type === "dinner" || type === "pizza") && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "form-fun-title", children: type === "pizza" ? "Pizza party details" : "Dinner details" }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "form-fun-tag", children: type === "pizza" ? "Pizza" : "In-home" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { className: "form-fun-help", children: "Share your kitchen setup and service flow." }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-3 grid gap-3 md:grid-cols-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: type === "pizza" ? "Rounds or courses" : "Course count" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
                "select",
                {
                  className: "mt-1",
                  value: form.courses,
                  onChange: (e) => updateSmallEventForm(type, "courses", e.target.value),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value: "", children: "Select" }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value: "3", children: "3 courses" }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value: "4", children: "4 courses" }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value: "5", children: "5+ courses" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Kitchen setup" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "text",
                  className: "mt-1",
                  value: form.kitchenAccess,
                  onChange: (e) => updateSmallEventForm(type, "kitchenAccess", e.target.value),
                  placeholder: "Full kitchen, limited oven, etc."
                }
              )
            ] })
          ] })
        ] }),
        type === "weddings" && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "form-fun-title", children: "Wedding details" }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "form-fun-tag", children: "Celebrate" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { className: "form-fun-help", children: "Let us know who is coordinating and the flow." }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-3 grid gap-3 md:grid-cols-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Planner or point of contact" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "text",
                  className: "mt-1",
                  value: form.plannerInfo,
                  onChange: (e) => updateSmallEventForm(type, "plannerInfo", e.target.value),
                  placeholder: "Planner name or role"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Meal moments" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "text",
                  className: "mt-1",
                  value: form.celebrationType,
                  onChange: (e) => updateSmallEventForm(type, "celebrationType", e.target.value),
                  placeholder: "Rehearsal, reception, late-night bites"
                }
              )
            ] })
          ] })
        ] }),
        type === "holiday" && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "form-fun-title", children: "Event details" }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "form-fun-tag", children: "Vibe" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { className: "form-fun-help", children: "Tell us the occasion and setup." }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-3 grid gap-3 md:grid-cols-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Occasion" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "text",
                  className: "mt-1",
                  value: form.celebrationType,
                  onChange: (e) => updateSmallEventForm(type, "celebrationType", e.target.value),
                  placeholder: "Holiday party, corporate event, birthday"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Setup needs" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "text",
                  className: "mt-1",
                  value: form.kitchenAccess,
                  onChange: (e) => updateSmallEventForm(type, "kitchenAccess", e.target.value),
                  placeholder: "Buffet table, heating, power"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "form-fun-title", children: "Menu vibes" }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "form-fun-tag", children: "Food" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { className: "form-fun-help", children: "Pick a style and any must-haves." }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-3 grid gap-3 md:grid-cols-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Serving style" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
                "select",
                {
                  className: "mt-1",
                  value: form.serviceStyle,
                  onChange: (e) => updateSmallEventForm(type, "serviceStyle", e.target.value),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value: "", children: "Select style" }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value: "plated", children: "Plated" }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value: "family", children: "Family-style" }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value: "buffet", children: "Buffet" }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value: "dropoff", children: "Drop-off" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Menu wishes" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "textarea",
                {
                  className: "mt-1",
                  rows: 2,
                  value: form.menuNotes,
                  onChange: (e) => updateSmallEventForm(type, "menuNotes", e.target.value),
                  placeholder: "Cuisine, courses, favorite ingredients"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "md:col-span-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Allergies or needs" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "textarea",
                {
                  className: "mt-1",
                  rows: 2,
                  value: form.dietary,
                  onChange: (e) => updateSmallEventForm(type, "dietary", e.target.value),
                  placeholder: "Allergies, restrictions, medical notes"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "md:col-span-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Extras to plan for" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "textarea",
                {
                  className: "mt-1",
                  rows: 2,
                  value: form.rentals,
                  onChange: (e) => updateSmallEventForm(type, "rentals", e.target.value),
                  placeholder: "Rentals, bar service, cleanup, extra staff"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "form-fun-title", children: "Save your progress" }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "form-fun-tag", children: "Optional" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { className: "form-fun-help", children: "We can email a save link so you can return later." }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-3 grid gap-3 md:grid-cols-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "md:col-span-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Where should we send the link?" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "email",
                  className: "mt-1",
                  value: form.accountEmail,
                  onChange: (e) => updateSmallEventForm(type, "accountEmail", e.target.value),
                  placeholder: "email for save link"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("label", { className: "form-fun-label md:col-span-2 flex items-center gap-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: form.wantsAccount,
                  onChange: (e) => updateSmallEventForm(type, "wantsAccount", e.target.checked)
                }
              ),
              "Create an account so you can edit anytime (we'll save your date for 24 hours)"
            ] }),
            form.wantsAccount && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(import_jsx_runtime22.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Account email" }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "input",
                  {
                    type: "email",
                    className: "mt-1",
                    value: form.accountEmail,
                    onChange: (e) => updateSmallEventForm(type, "accountEmail", e.target.value),
                    placeholder: "name@example.com"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Password" }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "input",
                  {
                    type: "password",
                    className: "mt-1",
                    value: form.accountPassword,
                    onChange: (e) => updateSmallEventForm(type, "accountPassword", e.target.value),
                    placeholder: "Create a password"
                  }
                )
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-4 form-fun-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
              "button",
              {
                type: "button",
                className: "form-fun-cta rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300",
                onClick: () => saveEstimate(type),
                disabled: smallEventsSaving,
                children: smallEventsSaving ? "Saving..." : "Save estimate"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
              "button",
              {
                type: "button",
                className: "form-fun-chip-btn rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400",
                onClick: () => extendEstimate(type),
                children: "Extend 5 days"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
              "button",
              {
                type: "button",
                className: "form-fun-chip-btn rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400",
                onClick: () => loadLatestEstimate(type),
                children: "Load saved estimate"
              }
            )
          ] }),
          smallEventsNotice && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "mt-2 text-xs text-slate-600", children: smallEventsNotice }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-2 text-xs text-slate-500", children: [
            "Estimate expires on ",
            expiresAt.toLocaleDateString(),
            " (5 days from last update)."
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
            "button",
            {
              type: "button",
              className: "form-fun-link mt-3",
              onClick: () => openQuoteDialog(type),
              children: "contact us about your quote"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "form-fun-title", children: "Estimate range" }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "form-fun-tag", children: "Live" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "mt-2 text-2xl font-bold text-slate-900", children: estimate ? `${formatCurrency(estimate.estimateMin)} - ${formatCurrency(estimate.estimateMax)}` : formatCurrency(0) }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-2 text-xs text-slate-600", children: [
            "Based on ",
            estimate?.guestCount || 0,
            " guests, ",
            estimate?.staffingCount || 0,
            " staff."
          ] }),
          type === "weddings" && estimate?.coordinationFee > 0 && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "text-xs text-slate-600", children: [
            "Includes a 5% event coordination line item (",
            formatCurrency(estimate.coordinationFee),
            ")."
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-xs text-slate-500", children: "Rentals, tax, and bar packages are estimated separately." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "form-fun-title", children: "Hold your date" }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "form-fun-tag", children: "24h" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-2 text-xs text-slate-600", children: [
            depositLabel,
            " deposit holds your date."
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-2 text-lg font-semibold text-slate-900", children: [
            "Deposit due:",
            " ",
            estimate ? formatCurrency(estimate.depositAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : formatCurrency(0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
            "button",
            {
              type: "button",
              className: "form-fun-cta mt-3 w-full rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300",
              onClick: () => startDepositCheckout(type),
              disabled: !holdsOnSlot || form.depositStatus === "paid",
              children: form.depositStatus === "paid" ? "Deposit received" : form.depositStatus === "pending" ? "Deposit started" : "Pay deposit via Square"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "mt-2 text-xs text-slate-500", children: holdsOnSlot ? holdsOnSlot.status === "confirmed" ? "Date confirmed. Final balance due before service." : `Hold active until ${new Date(holdsOnSlot.holdUntil).toLocaleString()}.` : "No date hold yet. We will confirm availability after we connect." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-fun-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "form-fun-title", children: "When and where" }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "form-fun-tag", children: "Dates" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { className: "form-fun-help", children: "Select an open date on the calendar. Admins set open and blocked dates by event type." }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "availability-calendar", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "availability-header", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "availability-title", children: "Available dates" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "button",
                {
                  type: "button",
                  className: "availability-refresh",
                  onClick: () => loadSmallEventsAvailability(),
                  children: "Refresh"
                }
              )
            ] }),
            availabilityLoading ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "availability-empty", children: "Loading available dates..." }) : slots.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "availability-empty", children: "No open dates yet. Add your ideal date below." }) : /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "availability-calendar-grid", children: calendarMonths.map((month) => /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "availability-month", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "availability-month-title", children: month.label }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "availability-weekdays", children: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { children: label }, label)) }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "availability-days", children: month.cells.map((cell) => {
                if (cell.isOutside) {
                  return /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "availability-day is-outside" }, cell.key);
                }
                const slot = cell.slot;
                if (!slot) {
                  return /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "div",
                    {
                      className: "availability-day is-unlisted",
                      title: "No availability set",
                      children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { children: cell.day })
                    },
                    cell.key
                  );
                }
                const meta = getSlotStatusMeta(slot);
                const isSelected = selectedSlot?.id === slot.id;
                return /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "button",
                  {
                    type: "button",
                    className: `availability-day ${isSelected ? "is-selected" : ""}`,
                    "data-status": meta.statusKey,
                    disabled: meta.isUnavailable,
                    onClick: () => selectAvailabilitySlot(slot),
                    title: slot.notes || meta.statusLabel,
                    children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { children: cell.day })
                  },
                  cell.key
                );
              }) })
            ] }, month.key)) }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "availability-legend", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { "data-status": "open", children: "Open" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { "data-status": "held", children: "Held" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { "data-status": "blocked", children: "Blocked" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "availability-footer", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "availability-selected", children: selectedSlotLabel ? `Selected: ${selectedSlotLabel}` : "Select an open date above." }),
              selectedSlot?.notes && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "availability-notes", children: selectedSlot.notes }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "availability-actions", children: holdsOnSlot && selectedSlot?.id === holdsOnSlot.slotId ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "button",
                {
                  type: "button",
                  className: "form-fun-chip-btn rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400",
                  onClick: () => releaseHold(holdsOnSlot.slotId, type),
                  children: "Release hold"
                }
              ) : /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "button",
                {
                  type: "button",
                  className: "form-fun-chip-btn rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400",
                  onClick: () => selectedSlot && holdSlot(selectedSlot.id, type),
                  disabled: !selectedSlot || selectedSlot.status !== "open" || !form.estimateId,
                  children: holdsOnSlot ? "Move hold here" : "Hold this date"
                }
              ) }),
              !form.estimateId && selectedSlot && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "availability-note", children: "Save your estimate before placing a 24-hour hold." })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-3 grid gap-3 md:grid-cols-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Ideal date" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "date",
                  className: "mt-1",
                  value: form.eventDate,
                  onChange: (e) => updateSmallEventForm(type, "eventDate", e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Ideal time" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "text",
                  className: "mt-1",
                  value: form.eventTime,
                  onChange: (e) => updateSmallEventForm(type, "eventTime", e.target.value),
                  placeholder: "ex: 6:30-9:30 PM"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "md:col-span-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", children: "Location or venue" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "text",
                  className: "mt-1",
                  value: form.location,
                  onChange: (e) => updateSmallEventForm(type, "location", e.target.value),
                  placeholder: "Address or venue name"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-sm font-semibold text-slate-900", children: "Admin controls" }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("label", { className: "flex items-center gap-2 text-xs text-slate-600", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: isCalendarAdmin,
                  onChange: (e) => setIsCalendarAdmin(e.target.checked)
                }
              ),
              "Admin mode"
            ] })
          ] }),
          isCalendarAdmin && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-3 space-y-3 text-xs text-slate-700", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "grid grid-cols-2 gap-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "font-semibold text-slate-600", children: "Date" }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "input",
                  {
                    type: "date",
                    className: "mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs",
                    value: adminSlotDraft.date,
                    onChange: (e) => updateAdminDraft("date", e.target.value)
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "font-semibold text-slate-600", children: "Event type" }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "select",
                  {
                    className: "mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs",
                    value: adminSlotDraft.type,
                    onChange: (e) => updateAdminDraft("type", e.target.value),
                    children: EVENT_TYPES.map((eventType) => /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value: eventType, children: SMALL_EVENT_CONFIG[eventType].label }, eventType))
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "grid grid-cols-2 gap-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "font-semibold text-slate-600", children: "Status" }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
                  "select",
                  {
                    className: "mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs",
                    value: adminSlotDraft.status,
                    onChange: (e) => updateAdminDraft("status", e.target.value),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value: "open", children: "Open" }),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value: "blocked", children: "Blocked" })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "font-semibold text-slate-600", children: "Notes" }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "input",
                  {
                    type: "text",
                    className: "mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs",
                    value: adminSlotDraft.notes,
                    onChange: (e) => updateAdminDraft("notes", e.target.value),
                    placeholder: "Reason or label"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("label", { className: "flex items-center gap-2 text-xs text-slate-600", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: adminSlotDraft.applyToAllTypes,
                  onChange: (e) => updateAdminDraft("applyToAllTypes", e.target.checked)
                }
              ),
              "Apply to all event types"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
              "button",
              {
                type: "button",
                className: "w-full rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800",
                onClick: applyAdminAvailability,
                children: "Save availability update"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
              "button",
              {
                type: "button",
                className: "w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400",
                onClick: clearExpiredHolds,
                children: "Clear expired holds"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "rounded-md border border-slate-200 bg-white px-3 py-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-xs font-semibold text-slate-600", children: "Deposit override" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-2 grid grid-cols-2 gap-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "text-[11px] text-slate-500", children: "Percent" }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "input",
                    {
                      type: "number",
                      min: "1",
                      max: "100",
                      className: "mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs",
                      value: form.depositOverridePercent,
                      onChange: (e) => updateSmallEventForm(type, "depositOverridePercent", e.target.value),
                      placeholder: "15"
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "text-[11px] text-slate-500", children: "Flat amount" }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "input",
                    {
                      type: "number",
                      min: "0",
                      className: "mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs",
                      value: form.depositOverrideAmount,
                      onChange: (e) => updateSmallEventForm(type, "depositOverrideAmount", e.target.value),
                      placeholder: "1500"
                    }
                  )
                ] })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-[11px] text-slate-500", children: "Manual slots now. Ready for Google calendar sync later." })
          ] })
        ] })
      ] })
    ] });
  };
  const handlePageChange = (index) => {
    setActivePage(index);
    document.querySelectorAll("nav button[data-menu-btn]").forEach((btn) => {
      const pageIndex = parseInt(btn.getAttribute("data-page-index"), 10);
      const isActive = Number.isFinite(pageIndex) && pageIndex === index;
      btn.dataset.active = isActive ? "true" : "false";
      btn.style.backgroundColor = isActive ? BRAND_TOKENS.bgStrong : "transparent";
      btn.style.color = isActive ? BRAND_TOKENS.textInverse : BRAND_TOKENS.textPrimary;
    });
  };
  const shuffle = (0, import_react13.useCallback)((arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);
  const fetchImages = (0, import_react13.useCallback)(async () => {
    setLoading(true);
    const apiUrl = "/api/search-images?per_page=100";
    try {
      const response = await fetch(apiUrl);
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("API endpoint not found");
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Search failed (${response.status})`);
      }
      const imgs = Array.isArray(data.images) ? data.images : [];
      setImages(shuffle(imgs));
    } catch (err) {
      console.error("Error fetching images:", err);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [shuffle]);
  (0, import_react13.useEffect)(() => {
    fetchImages();
  }, [fetchImages]);
  (0, import_react13.useEffect)(() => {
    const timer = setTimeout(() => setAnnouncementVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);
  (0, import_react13.useEffect)(() => {
    if (typeof document === "undefined") return;
    const offset = announcementVisible && activePage === 0 ? `${ANNOUNCEMENT_HEIGHT}px` : "0px";
    document.documentElement.style.setProperty("--announcement-offset", offset);
    return () => {
      document.documentElement.style.removeProperty("--announcement-offset");
    };
  }, [announcementVisible, activePage]);
  (0, import_react13.useEffect)(() => {
    if (smallEventsDialog) {
      loadSmallEventsAvailability();
      setSmallEventsNotice("");
    }
  }, [smallEventsDialog]);
  (0, import_react13.useEffect)(() => {
    let abort = false;
    const controller = new AbortController();
    (async () => {
      setMealPlanLoading(true);
      setMealPlanError(null);
      try {
        const res = await fetch("/api/search-images?query=mealplan&per_page=24", { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed loading meal plan photos");
        const imgs = Array.isArray(data.images) ? data.images : [];
        if (!abort) setMealPlanImages(imgs);
      } catch (e) {
        if (!abort) setMealPlanError(e.message || String(e));
      } finally {
        if (!abort) setMealPlanLoading(false);
      }
    })();
    return () => {
      abort = true;
      controller.abort();
    };
  }, []);
  (0, import_react13.useEffect)(() => {
    let abort = false;
    const controller = new AbortController();
    (async () => {
      setAboutGalleryLoading(true);
      setAboutGalleryError(null);
      try {
        const res = await fetch("/api/search-images?query=aboutus&per_page=12", { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed loading about photos");
        const imgs = Array.isArray(data.images) ? data.images : [];
        if (!abort) setAboutGalleryImages(imgs);
      } catch (e) {
        if (!abort) setAboutGalleryError(e.message || String(e));
      } finally {
        if (!abort) setAboutGalleryLoading(false);
      }
    })();
    return () => {
      abort = true;
      controller.abort();
    };
  }, []);
  (0, import_react13.useEffect)(() => {
    let abort = false;
    const controller = new AbortController();
    (async () => {
      setPizzaLoading(true);
      setPizzaError(null);
      try {
        const res = await fetch("/api/search-images?query=pizza&per_page=24", { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed loading pizza photos");
        const imgs = Array.isArray(data.images) ? data.images : [];
        if (!abort) setPizzaImages(imgs);
      } catch (e) {
        if (!abort) setPizzaError(e.message || String(e));
      } finally {
        if (!abort) setPizzaLoading(false);
      }
    })();
    return () => {
      abort = true;
      controller.abort();
    };
  }, []);
  (0, import_react13.useEffect)(() => {
    let mounted = true;
    fetch("/api/search-images?query=partner&per_page=48").then((r) => r.ok ? r.json() : null).then((data) => {
      if (!mounted || !data || !Array.isArray(data.images)) return;
      const items = data.images.map((img) => {
        const ctx = img.context && (img.context.custom || img.context);
        return {
          publicId: img.public_id || img.publicId,
          name: ctx && (ctx.name || ctx.title || ctx.alt) || img.public_id || "Partner",
          url: ctx && (ctx.url || ctx.link || ctx.href)
        };
      }).filter((p) => p.publicId);
      setPartners(items);
    }).catch(() => {
    });
    return () => {
      mounted = false;
    };
  }, []);
  (0, import_react13.useEffect)(() => {
    setWholesaleMenuLoading(true);
    setWholesaleMenuError("");
    try {
      const mapped = HAPPY_MONDAY_MENU_ITEMS.map((item, index) => {
        const priceValue = Number(item.price);
        return {
          id: item.id || `${item.name || "item"}-${index}`,
          name: item.name || "Menu item",
          category: item.category || "Menu",
          price: formatCurrency(Number.isFinite(priceValue) ? priceValue : 0, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })
        };
      });
      setWholesaleMenuItems(mapped);
    } catch (err) {
      setWholesaleMenuItems([]);
      setWholesaleMenuError(err?.message || "Unable to load wholesale menu");
    } finally {
      setWholesaleMenuLoading(false);
    }
  }, []);
  const wholesaleMenuSections = (0, import_react13.useMemo)(() => {
    const sections = [];
    const categoryMap = /* @__PURE__ */ new Map();
    wholesaleMenuItems.forEach((item) => {
      const category = item.category || "Menu";
      if (!categoryMap.has(category)) {
        const section = { category, items: [] };
        categoryMap.set(category, section);
        sections.push(section);
      }
      categoryMap.get(category).items.push(item);
    });
    return sections;
  }, [wholesaleMenuItems]);
  const imageById = (0, import_react13.useMemo)(() => {
    const map = /* @__PURE__ */ new Map();
    images.forEach((img) => {
      map.set(getImageId(img), img);
    });
    return map;
  }, [images]);
  const imageIndexById = (0, import_react13.useMemo)(() => {
    const map = /* @__PURE__ */ new Map();
    images.forEach((img, idx) => {
      map.set(getImageId(img), idx);
    });
    return map;
  }, [images]);
  const aboutMasonryItems = (0, import_react13.useMemo)(() => {
    const mixed = [];
    const blocks = ABOUT_INFO_BLOCKS;
    const gallery = aboutGalleryImages;
    const total = Math.max(blocks.length, gallery.length);
    for (let i = 0; i < total; i += 1) {
      if (blocks[i]) mixed.push({ type: "info", block: blocks[i], key: `info-${blocks[i].title}` });
      if (gallery[i]) mixed.push({ type: "image", img: gallery[i], key: `img-${gallery[i].asset_id || gallery[i].public_id || i}` });
    }
    return mixed;
  }, [aboutGalleryImages]);
  const flatOrder = (0, import_react13.useMemo)(() => columnOrder.flat(), [columnOrder]);
  const orderedImages = (0, import_react13.useMemo)(() => flatOrder.map((id) => imageById.get(id)).filter(Boolean), [flatOrder, imageById]);
  const getColumnCount = (0, import_react13.useCallback)((width) => {
    if (width < 768) return 3;
    if (width >= 1024) return 6;
    return 5;
  }, []);
  const buildColumnOrder = (0, import_react13.useCallback)((ids, config) => {
    const { columns, columnWidth, gap } = config;
    const nextColumns = Array.from({ length: columns }, () => []);
    const columnHeights = new Array(columns).fill(0);
    ids.forEach((imgId) => {
      const img = imageById.get(imgId);
      if (!img) return;
      const imgWidth = img.width || 400;
      const imgHeight = img.height || 500;
      const aspectRatio = imgWidth / imgHeight;
      const height = columnWidth / aspectRatio * getImageScale(imgId);
      const targetColumn = columnHeights.indexOf(Math.min(...columnHeights));
      nextColumns[targetColumn].push(imgId);
      columnHeights[targetColumn] += height + gap;
    });
    return nextColumns;
  }, [imageById]);
  (0, import_react13.useEffect)(() => {
    const updateLayoutConfig = () => {
      const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
      const columns = getColumnCount(containerWidth);
      const gap = 10;
      const columnWidth = Math.floor((containerWidth - gap * (columns - 1)) / columns);
      setLayoutConfig((prev) => {
        if (prev.columns === columns && prev.columnWidth === columnWidth && prev.gap === gap) {
          return prev;
        }
        return { columns, columnWidth, gap };
      });
    };
    updateLayoutConfig();
    window.addEventListener("resize", updateLayoutConfig);
    return () => window.removeEventListener("resize", updateLayoutConfig);
  }, [getColumnCount]);
  (0, import_react13.useEffect)(() => {
    if (images.length === 0) {
      setColumnOrder([]);
      setLayoutReady(false);
      return;
    }
    if (!layoutConfig.columns) return;
    const nextOrder = images.map(getImageId);
    setColumnOrder((prev) => {
      const prevFlat = prev.flat();
      const nextSet = new Set(nextOrder);
      const filtered = prevFlat.filter((id) => nextSet.has(id));
      const filteredSet = new Set(filtered);
      const appended = nextOrder.filter((id) => !filteredSet.has(id));
      const merged = [...filtered, ...appended];
      if (prev.length === layoutConfig.columns && appended.length === 0 && filtered.length === prevFlat.length) {
        return prev;
      }
      return buildColumnOrder(merged, layoutConfig);
    });
  }, [images, layoutConfig, buildColumnOrder]);
  (0, import_react13.useEffect)(() => {
    if (columnOrder.length === 0 || !layoutConfig.columns) return;
    const { columns, columnWidth, gap } = layoutConfig;
    const newPositions = {};
    const columnHeights = new Array(columns).fill(0);
    columnOrder.forEach((column, columnIndex) => {
      let y = 0;
      column.forEach((imgId) => {
        const img = imageById.get(imgId);
        if (!img) return;
        const imgWidth = img.width || 400;
        const imgHeight = img.height || 500;
        const aspectRatio = imgWidth / imgHeight;
        const height = columnWidth / aspectRatio * getImageScale(imgId);
        const x = columnIndex * (columnWidth + gap);
        newPositions[imgId] = {
          x,
          y,
          column: columnIndex,
          width: columnWidth,
          height
        };
        y += height + gap;
      });
      columnHeights[columnIndex] = y;
    });
    setPositions(newPositions);
    const nextHeight = columnHeights.length ? Math.max(...columnHeights) : 0;
    setGalleryHeight(Math.max(nextHeight, 400));
    setLayoutReady(Object.keys(newPositions).length > 0);
  }, [columnOrder, layoutConfig, imageById]);
  const handleDragStart = (0, import_react13.useCallback)((event) => {
    setActiveDragId(event.active.id);
  }, []);
  const handleDragCancel = (0, import_react13.useCallback)(() => {
    setActiveDragId(null);
  }, []);
  const handleDragEnd = (0, import_react13.useCallback)((event) => {
    const { active, delta } = event;
    setActiveDragId(null);
    lastDragEndRef.current = Date.now();
    if (!active?.id) return;
    if (!layoutConfig.columns) return;
    if (layoutConfig.columnWidth <= 0) return;
    if (!positions[active.id]) return;
    const startPos = positions[active.id];
    const nextX = startPos.x + (delta?.x || 0);
    const nextY = startPos.y + (delta?.y || 0);
    const columnWidth = layoutConfig.columnWidth;
    const columnGap = layoutConfig.gap;
    const columnStride = columnWidth + columnGap;
    let targetColumn = Math.round(nextX / columnStride);
    targetColumn = Math.max(0, Math.min(layoutConfig.columns - 1, targetColumn));
    setColumnOrder((prev) => {
      if (prev.length === 0) return prev;
      let sourceColumn = -1;
      let sourceIndex = -1;
      prev.forEach((column, colIndex) => {
        const idx = column.indexOf(active.id);
        if (idx !== -1) {
          sourceColumn = colIndex;
          sourceIndex = idx;
        }
      });
      if (sourceColumn === -1) return prev;
      const nextColumns = prev.map((column) => column.slice());
      nextColumns[sourceColumn].splice(sourceIndex, 1);
      const targetItems = nextColumns[targetColumn] || [];
      let insertIndex = targetItems.length;
      for (let i = 0; i < targetItems.length; i += 1) {
        const itemId = targetItems[i];
        const itemPos = positions[itemId];
        if (!itemPos) continue;
        if (nextY < itemPos.y + itemPos.height * 0.5) {
          insertIndex = i;
          break;
        }
      }
      targetItems.splice(insertIndex, 0, active.id);
      nextColumns[targetColumn] = targetItems;
      return nextColumns;
    });
  }, [layoutConfig, positions]);
  const handleSelectImage = (0, import_react13.useCallback)((id) => {
    if (activeDragId) return;
    if (Date.now() - lastDragEndRef.current < 200) return;
    const img = imageById.get(id);
    const idx = imageIndexById.get(id);
    if (!img || idx === void 0) return;
    setSelected({ img, idx });
  }, [activeDragId, imageById, imageIndexById]);
  const closeLightbox = (0, import_react13.useCallback)(() => setSelected(null), []);
  const prefetchImage = (0, import_react13.useCallback)((url) => {
    if (!url || typeof document === "undefined") return;
    if (prefetched.current.has(url)) return;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    prefetched.current.add(url);
  }, []);
  const resetWaitlist = () => setWaitlist({
    name: "",
    email: "",
    phone: "",
    familySize: "",
    children: "",
    daysPerWeek: "",
    mealsPerDay: "",
    allergies: "",
    questions: ""
  });
  const handleWaitlistChange = (field, value) => {
    setWaitlist((prev) => ({ ...prev, [field]: value }));
    if (waitlistStatus !== "idle") setWaitlistStatus("idle");
  };
  const handleWaitlistSubmit = async (event) => {
    event.preventDefault();
    setWaitlistStatus("sending");
    try {
      const lines = [
        "Weekly Meal Prep Waitlist signup",
        `Name: ${waitlist.name}`,
        `Email: ${waitlist.email}`,
        `Phone: ${waitlist.phone || "(not provided)"}`,
        `Family size: ${waitlist.familySize || "(not provided)"}`,
        `Children & ages: ${waitlist.children || "(not provided)"}`,
        `Days per week: ${waitlist.daysPerWeek || "(not provided)"}`,
        `Meals per day: ${waitlist.mealsPerDay || "(not provided)"}`,
        `Allergies or medical comments: ${waitlist.allergies || "(none noted)"}`,
        "",
        "Questions or notes:",
        waitlist.questions || "(none provided)"
      ];
      const payload = {
        name: waitlist.name,
        email: waitlist.email,
        phone: waitlist.phone,
        subject: "Meal Prep Waitlist signup",
        type: "meal-prep-waitlist",
        message: lines.join("\n")
      };
      const res = await fetch("/api/messages/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      setWaitlistStatus("success");
      resetWaitlist();
    } catch (_error) {
      setWaitlistStatus("error");
    }
  };
  (0, import_react13.useEffect)(() => {
    const onKey = (e) => {
      if (!selected) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") {
        const next = (selected.idx + 1) % images.length;
        setSelected({ img: images[next], idx: next });
      }
      if (e.key === "ArrowLeft") {
        const prev = (selected.idx - 1 + images.length) % images.length;
        setSelected({ img: images[prev], idx: prev });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, images, closeLightbox]);
  (0, import_react13.useEffect)(() => {
    if (selected && closeBtnRef.current) closeBtnRef.current.focus();
  }, [selected]);
  const aboutFaqItems = [
    {
      question: "What is Local Effort?",
      answer: "Local Effort is a Minnesota-based team of chefs focused on seasonal high-integrity cooking for homes, events, and partner businesses."
    },
    {
      question: "Where do you serve?",
      answer: "Most of our services are available all across the Twin Cities metro. Our pizzas can be enjoyed at Happy Monday Coffee in Roseville."
    },
    {
      question: "What kinds of services do you offer?",
      answer: "Fancy home dinners, food for small events and weddings, weekly prepared meal plans (when openings exist), and pizza parties using our mobile setup. Those are the main products. More abstractly, we're private chefs open to most situations where seriously good food is needed."
    },
    {
      question: "What's included in a pizza party?",
      answer: "We bring the high-temperature oven, dough, ingredients, and crew. We can also use your in-home oven. We tailor service to your guest count, timing, and space so it runs smooth and feels hosted, not chaotic. We'll bring some extra food like salads or desserts, if you'd like."
    },
    {
      question: "How many guests can you serve?",
      answer: "We specialize in smaller events, like home-dinners for 2-16 people, or platters and apps for parties 50-100. We're open to larger events in some situations."
    },
    {
      question: "Do you accommodate allergies and dietary preferences?",
      answer: "Of course. Full accomodation. As custom as possible. We don't have a gluten free crust yet."
    },
    {
      question: "How do menus get set?",
      answer: "We build menus around seasonal ingredients and your preferences. You can share must-haves, dislikes, dietary needs, and the vibe in the request form, then we finalize details together."
    },
    {
      question: "How does event pricing work?",
      answer: "Pricing depends on guest count, staffing, service style, and final ingredients. The event page generates a ballpark range and sets a cost for a deposit, to hold the date. We confirm the final quote with you after details are verified. Email us directly if you prefer."
    },
    {
      question: "What is the deposit and hold policy?",
      answer: "A 15% deposit holds your date. Deposits are handled through Square."
    },
    {
      question: "Can you help with rentals or staffing?",
      answer: "Yes, usually. We will utilize a coordinator if your event needs rentals (tables/chairs/linens/kitchen equipment) or additional service staff."
    }
  ];
  const renderInlineMarkup = (text) => {
    if (!text) return null;
    const raw = String(text);
    if (!/\[(?:\/)?[bi]\]/.test(raw)) return raw;
    const tokens = raw.split(/(\[\/?b\]|\[\/?i\])/);
    const root = { type: null, children: [] };
    const stack = [root];
    tokens.forEach((token) => {
      if (!token) return;
      if (token === "[b]") {
        const node = { type: "b", children: [] };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
        return;
      }
      if (token === "[/b]") {
        if (stack.length > 1) stack.pop();
        return;
      }
      if (token === "[i]") {
        const node = { type: "i", children: [] };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
        return;
      }
      if (token === "[/i]") {
        if (stack.length > 1) stack.pop();
        return;
      }
      stack[stack.length - 1].children.push(token);
    });
    let key = 0;
    const renderNodes = (node) => node.children.map((child) => {
      if (typeof child === "string") return child;
      const Tag = child.type === "b" ? "strong" : "em";
      return /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(Tag, { children: renderNodes(child) }, `inline-${key++}`);
    });
    return renderNodes(root);
  };
  const formatFeedbackDate = (0, import_react13.useCallback)((value) => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    if (typeof value === "object") {
      if (typeof value.toDate === "function") {
        const parsed = value.toDate();
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      const seconds = value.seconds ?? value._seconds;
      if (typeof seconds === "number") {
        const parsed = new Date(seconds * 1e3);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
    }
    return null;
  }, []);
  const formatFeedbackContext = (0, import_react13.useCallback)((entry) => {
    const date = formatFeedbackDate(entry?.createdAt);
    if (!date) return "Feedback";
    const label = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    return `Feedback \xB7 ${label}`;
  }, [formatFeedbackDate]);
  const normalizeFeedbackEntry = (0, import_react13.useCallback)((entry) => {
    if (!entry) return null;
    const quote = entry.comment || entry.quote || "";
    if (!quote) return null;
    return {
      id: entry.id || `feedback-${Date.now()}`,
      quote,
      author: entry.customerId || entry.author || "Guest",
      context: entry.context || formatFeedbackContext(entry)
    };
  }, [formatFeedbackContext]);
  const resetBusinessContact = (0, import_react13.useCallback)(() => {
    setBusinessContactName("");
    setBusinessContactEmail("");
    setBusinessContactPhone("");
    setBusinessContactOrg("");
    setBusinessContactMessage("");
    setBusinessContactStatus("idle");
    setBusinessContactError("");
  }, []);
  const openBusinessContact = (0, import_react13.useCallback)((type) => {
    setBusinessContactType(type);
    setBusinessContactOpen(true);
    setBusinessContactStatus("idle");
    setBusinessContactError("");
  }, []);
  const resetSmallEventsContact = (0, import_react13.useCallback)(() => {
    setSmallEventsContactName("");
    setSmallEventsContactEmail("");
    setSmallEventsContactPhone("");
    setSmallEventsContactMessage("");
    setSmallEventsContactStatus("idle");
    setSmallEventsContactError("");
  }, []);
  const openSmallEventsContact = (0, import_react13.useCallback)((type) => {
    setSmallEventsContactType(type);
    setSmallEventsContactOpen(true);
    setSmallEventsContactStatus("idle");
    setSmallEventsContactError("");
  }, []);
  const reviews = thumbtackReviews;
  const feedbackItems = (0, import_react13.useMemo)(() => {
    const dynamic = Array.isArray(liveFeedback) ? liveFeedback : [];
    const staticReviews = Array.isArray(reviews) ? reviews : [];
    return [...dynamic, ...staticReviews];
  }, [liveFeedback, reviews]);
  (0, import_react13.useEffect)(() => {
    let mounted = true;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/feedback?limit=50", { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!mounted || !res.ok) return;
        const items = Array.isArray(data.items) ? data.items : [];
        const normalized = items.map(normalizeFeedbackEntry).filter(Boolean);
        if (mounted) setLiveFeedback(normalized);
      } catch (_err) {
      }
    })();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [normalizeFeedbackEntry]);
  const faqStructuredData = (0, import_react13.useMemo)(
    () => JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: aboutFaqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer
        }
      }))
    }),
    [aboutFaqItems]
  );
  const FeedbackModal = (0, import_react13.useMemo)(() => {
    if (!showFeedback) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4", role: "dialog", "aria-modal": "true", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-card w-full max-w-lg relative", children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
        "button",
        {
          className: "absolute right-4 top-4 text-sm underline",
          onClick: () => setShowFeedback(false),
          "aria-label": "Close feedback",
          children: "Close"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("h4", { className: "text-xl font-bold mb-2", children: "Send Feedback" }),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { className: "text-sm text-gray-600 mb-4", children: "We read every note. Thanks for helping us improve." }),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
        "form",
        {
          onSubmit: async (e) => {
            e.preventDefault();
            setFbStatus("sending");
            try {
              const rating = fb.sentiment === "positive" ? 5 : fb.sentiment === "neutral" ? 3 : 1;
              const feedbackPayload = {
                rating,
                comment: fb.message,
                customerId: fb.name || "Guest",
                orderId: fb.email || null
              };
              const messagePayload = {
                name: fb.name,
                email: fb.email,
                subject: `Website feedback (${fb.sentiment})`,
                message: fb.message,
                type: "feedback"
              };
              const [feedbackResult, messageResult] = await Promise.allSettled([
                fetch("/api/feedback", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(feedbackPayload)
                }),
                fetch("/api/messages/submit", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(messagePayload)
                })
              ]);
              if (feedbackResult.status !== "fulfilled") {
                throw new Error("Failed to save feedback");
              }
              const feedbackRes = feedbackResult.value;
              const feedbackData = await feedbackRes.json().catch(() => ({}));
              if (!feedbackRes.ok) throw new Error(feedbackData.error || "Failed to save feedback");
              if (messageResult.status === "fulfilled" && !messageResult.value.ok) {
                const messageText = await messageResult.value.text().catch(() => "");
                console.warn("Feedback email failed:", messageText || messageResult.value.status);
              }
              const newEntry = normalizeFeedbackEntry({
                id: feedbackData.id,
                comment: fb.message,
                customerId: fb.name || "Guest",
                createdAt: /* @__PURE__ */ new Date()
              });
              if (newEntry) {
                setLiveFeedback((prev) => [newEntry, ...prev.filter((item) => item?.id !== newEntry.id)]);
              }
              setFbStatus("sent");
              setFb({ name: "", email: "", sentiment: "positive", message: "" });
              setTimeout(() => setShowFeedback(false), 900);
            } catch (_e) {
              setFbStatus("error");
            }
          },
          className: "space-y-3",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "fb-name", children: "Name" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("input", { id: "fb-name", className: "input", value: fb.name, onChange: (e) => setFb({ ...fb, name: e.target.value }), required: true })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "fb-email", children: "Email" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("input", { id: "fb-email", type: "email", className: "input", value: fb.email, onChange: (e) => setFb({ ...fb, email: e.target.value }), required: true })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "fb-sentiment", children: "Type" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "flex gap-4", id: "fb-sentiment", children: ["positive", "neutral", "negative"].map((s) => /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("label", { className: "inline-flex items-center gap-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("input", { type: "radio", name: "sentiment", value: s, checked: fb.sentiment === s, onChange: () => setFb({ ...fb, sentiment: s }) }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "capitalize", children: s })
              ] }, s)) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "fb-message", children: "Message" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("textarea", { id: "fb-message", className: "textarea", value: fb.message, onChange: (e) => setFb({ ...fb, message: e.target.value }), rows: 5, required: true })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("button", { type: "submit", className: "btn btn-primary", disabled: fbStatus === "sending", children: fbStatus === "sending" ? "Sending..." : "Send feedback" }),
              fbStatus === "sent" && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "text-green-700 text-sm", children: "Thanks! Sent." }),
              fbStatus === "error" && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "text-red-700 text-sm", children: "Could not send. Try again." })
            ] })
          ]
        }
      )
    ] }) });
  }, [showFeedback, fb, fbStatus, normalizeFeedbackEntry]);
  const PartnerGrid = () => {
    const items = (partners || []).filter((p) => p && p.publicId);
    if (!items.length) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 items-center px-4", children: items.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
      import_framer_motion3.motion.a,
      {
        href: p.url || "#",
        onClick: (e) => {
          if (!p.url) e.preventDefault();
          if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "partner_click", { partner: p.name || p.publicId });
          }
        },
        className: "flex items-center justify-center p-3 bg-white rounded-lg shadow-sm",
        "aria-label": p.name || `Partner ${i + 1}`,
        rel: "noopener noreferrer",
        target: p.url ? "_blank" : void 0,
        initial: { opacity: 0, scale: 0.98 },
        whileInView: { opacity: 1, scale: 1 },
        viewport: { once: true },
        transition: { duration: 0.25, ease: "easeOut", delay: i * 0.03 },
        children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "w-full", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "relative w-full", style: { paddingTop: "18.2%" }, children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
          cloudinaryImage_default,
          {
            publicId: p.publicId,
            alt: p.name || `Partner ${i + 1}`,
            width: 1e3,
            height: 250,
            containerClassName: "absolute inset-0",
            imgClassName: "w-full h-full grayscale hover:grayscale-0 transition-all",
            resizeMode: "fit",
            placeholderMode: "solid",
            containerStyle: { backgroundImage: "none", backgroundColor: "transparent" },
            sizes: "(max-width: 640px) 32vw, (max-width: 1024px) 20vw, 16vw",
            responsiveSteps: [320, 560, 820, 1e3]
          }
        ) }) })
      },
      (p.publicId || i) + i
    )) });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "fullpage-demo", children: [
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_framer_motion3.AnimatePresence, { children: announcementVisible && activePage === 0 && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
      import_framer_motion3.motion.button,
      {
        type: "button",
        className: "announcement-bar",
        initial: { opacity: 0, y: -12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
        transition: { duration: 0.35, ease: "easeOut" },
        onClick: () => setAnnouncementOpen(true),
        children: [
          "try ",
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "announcement-highlight", children: "local pizza" }),
          " and more at Happy Monday Coffee in Roseville"
        ]
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
      FullPageContainer_default,
      {
        pages,
        enableKeyboard: true,
        onPageChange: handlePageChange,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
            FullPageSection_default,
            {
              id: "home",
              style: { backgroundColor: BRAND_TOKENS.bgPage },
              animation: "fadeScale",
              children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "div",
                {
                  className: "w-full h-full overflow-y-auto",
                  style: {
                    paddingTop: announcementVisible && activePage === 0 ? `calc(5rem + ${ANNOUNCEMENT_HEIGHT}px)` : "5rem"
                  },
                  children: loading ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-center py-20", style: { color: BRAND_TOKENS.textPrimary }, children: "Loading images..." }) : images.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-center py-20", style: { color: BRAND_TOKENS.textPrimary }, children: "No images found." }) : !layoutReady ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-center py-20", style: { color: BRAND_TOKENS.textPrimary }, children: "Loading images..." }) : /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    import_core.DndContext,
                    {
                      sensors,
                      collisionDetection: import_core.closestCenter,
                      onDragStart: handleDragStart,
                      onDragEnd: handleDragEnd,
                      onDragCancel: handleDragCancel,
                      children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_sortable.SortableContext, { items: flatOrder, children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                        "div",
                        {
                          ref: containerRef,
                          className: "relative w-full",
                          style: { minHeight: `${galleryHeight}px` },
                          children: orderedImages.map((img, idx) => {
                            const imgId = getImageId(img);
                            const pos = positions[imgId] || { x: 0, y: 0, width: 300, height: 400 };
                            return /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                              GalleryItem,
                              {
                                id: imgId,
                                img,
                                index: idx,
                                pos,
                                layoutReady,
                                onSelect: handleSelectImage,
                                onPrefetch: prefetchImage,
                                disableDrag: !layoutReady
                              },
                              imgId
                            );
                          })
                        }
                      ) })
                    }
                  )
                }
              )
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
            FullPageSection_default,
            {
              id: "weekly-meals",
              style: { backgroundColor: BRAND_TOKENS.bgSection },
              children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "relative h-full pt-20", children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "flex items-start", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
                    "div",
                    {
                      className: "group mt-6 ml-4 md:mt-8 md:ml-8 lg:mt-[50px] lg:ml-[50px]",
                      style: {
                        padding: "12px 16px",
                        backgroundColor: BRAND_TOKENS.surfaceMuted,
                        borderRadius: "6px"
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                          "div",
                          {
                            className: "line-through group-hover:italic",
                            style: {
                              color: BRAND_TOKENS.textPrimary,
                              fontFamily: "'Office Code Pro', monospace",
                              fontSize: "18px",
                              fontWeight: 600
                            },
                            children: "Pickup on Sundays"
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                          "button",
                          {
                            type: "button",
                            className: "inline-block line-through group-hover:italic",
                            disabled: true,
                            "aria-disabled": "true",
                            style: {
                              marginTop: "12px",
                              color: BRAND_TOKENS.textPrimary,
                              fontFamily: "'Office Code Pro', monospace",
                              fontSize: "16px",
                              fontWeight: 600,
                              textDecoration: "underline",
                              cursor: "not-allowed",
                              opacity: 0.6
                            },
                            children: "order here"
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    import_framer_motion3.motion.span,
                    {
                      "aria-hidden": "true",
                      style: {
                        marginTop: "72px",
                        marginLeft: "24px",
                        marginRight: "24px",
                        color: BRAND_TOKENS.textPrimary,
                        fontSize: "24px"
                      },
                      animate: { x: [0, 10, 0] },
                      transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
                      children: "\u2192"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "mt-6 ml-4 md:mt-8 md:ml-8 lg:mt-[50px] lg:ml-[50px]", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
                    "div",
                    {
                      className: "rounded-md border border-slate-300 bg-white/80 px-4 py-3",
                      style: { fontFamily: "'Office Code Pro', monospace" },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-sm font-semibold text-slate-900", children: "Waiting list" }),
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "mt-1 text-xs text-slate-600", children: "We'll let you know when space opens up." }),
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                          "button",
                          {
                            type: "button",
                            className: "mt-3 w-full rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800",
                            onClick: () => {
                              resetWaitlist();
                              setWaitlistStatus("idle");
                              setShowWaitlistForm(true);
                            },
                            children: "Join the waitlist"
                          }
                        )
                      ]
                    }
                  ) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "mt-12 px-4 md:px-8 lg:px-[50px]", children: mealPlanLoading ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-sm text-gray-600", children: "Loading photos..." }) : mealPlanError ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-sm text-red-700", children: mealPlanError }) : /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "mb-4 break-inside-avoid border p-4 bg-white/70 rounded-lg", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "div",
                    {
                      style: {
                        fontFamily: "'Yomogi', cursive",
                        color: BRAND_TOKENS.textPrimary,
                        fontSize: "22px",
                        lineHeight: 1.5
                      },
                      children: "From a few meals a week to complete meal replacement. We make wholesome home cooked meals from high integrity local ingredients. We ensure that you eat real food all week."
                    }
                  ) }),
                  mealPlanImages.map((img, idx) => /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "div",
                    {
                      className: "mb-4 break-inside-avoid border p-2 bg-white rounded-lg overflow-hidden",
                      children: img.thumbnail_url ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                        "img",
                        {
                          src: img.thumbnail_url,
                          alt: img.context?.alt || "Meal prep image",
                          className: "rounded-lg w-full h-auto",
                          loading: "lazy"
                        }
                      ) : /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                        cloudinaryImage_default,
                        {
                          publicId: img.public_id || img.publicId,
                          alt: img.context?.alt || "Meal prep image",
                          width: 800,
                          className: "rounded-lg w-full h-auto"
                        }
                      )
                    },
                    (img.asset_id || img.public_id || idx) + ":" + idx
                  ))
                ] }) })
              ] })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
            FullPageSection_default,
            {
              id: "small-events",
              style: { backgroundColor: BRAND_TOKENS.bgSection },
              children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "relative w-full h-full pt-20 overflow-y-auto", children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "relative min-h-[520px] h-[70vh]", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "img",
                    {
                      src: "https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_1600/vjuesai2mxfavpq9d2df",
                      alt: "Small Events",
                      className: "absolute inset-0 w-full h-full object-cover",
                      style: { objectPosition: "center" }
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "relative z-10 flex items-start justify-center h-full pt-24", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "small-events-cta", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "small-events-guide", "aria-hidden": "true", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "small-events-guide-text", children: "BOOK TODAY" }),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "small-events-guide-arrow" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                      "div",
                      {
                        style: {
                          display: "table",
                          borderCollapse: "separate",
                          borderSpacing: "16px"
                        },
                        children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { style: { display: "table-row" }, children: [
                          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { display: "table-cell" }, children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                            "button",
                            {
                              type: "button",
                              onClick: () => setSmallEventsDialog("dinner"),
                              className: "px-6 py-5 rounded-md border border-white/70 bg-white/80 text-left text-base font-semibold text-slate-900 hover:bg-white",
                              style: { fontFamily: "'Office Code Pro', monospace" },
                              children: "dinner party in my home"
                            }
                          ) }),
                          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { display: "table-cell" }, children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                            "button",
                            {
                              type: "button",
                              onClick: () => setSmallEventsDialog("weddings"),
                              className: "px-6 py-5 rounded-md border border-white/70 bg-white/80 text-left text-base font-semibold text-slate-900 hover:bg-white",
                              style: { fontFamily: "'Office Code Pro', monospace" },
                              children: "weddings"
                            }
                          ) }),
                          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { display: "table-cell" }, children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                            "button",
                            {
                              type: "button",
                              onClick: () => setSmallEventsDialog("holiday"),
                              className: "px-6 py-5 rounded-md border border-white/70 bg-white/80 text-left text-base font-semibold text-slate-900 hover:bg-white",
                              style: { fontFamily: "'Office Code Pro', monospace" },
                              children: "small events and holiday parties"
                            }
                          ) })
                        ] })
                      }
                    )
                  ] }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "absolute bottom-8 left-0 right-0 z-10 flex justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "a",
                    {
                      href: "/february",
                      className: "px-8 py-5 rounded-md border-2 border-rose-400 bg-rose-500/90 text-white text-lg font-semibold hover:bg-rose-600 transition-colors shadow-lg",
                      style: { fontFamily: "'Office Code Pro', monospace" },
                      children: "home dinners in february"
                    }
                  ) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "px-8 pb-16 pt-10", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "small-events-testimonial", children: [
                    '"Local Effort is truly top tier."',
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "small-events-testimonial-author", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                      "a",
                      {
                        href: "https://soupsistersmn.com",
                        target: "_blank",
                        rel: "noreferrer",
                        children: "Alyssa Andes"
                      }
                    ) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "mt-10", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "partnerships-grid columns-2 md:columns-3 lg:columns-4 [column-fill:_balance]", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "partnerships-card break-inside-avoid", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                        "button",
                        {
                          type: "button",
                          className: "partnerships-title partnerships-title-link",
                          onClick: () => openSmallEventsContact("dinner"),
                          children: "dinner at your home"
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "partnerships-copy" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "partnerships-card break-inside-avoid", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                        "button",
                        {
                          type: "button",
                          className: "partnerships-title partnerships-title-link",
                          onClick: () => openSmallEventsContact("weddings"),
                          children: "weddings and showers"
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "partnerships-copy" })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "partnerships-card break-inside-avoid", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                        "button",
                        {
                          type: "button",
                          className: "partnerships-title partnerships-title-link",
                          onClick: () => openSmallEventsContact("holiday"),
                          children: "small events and holiday parties"
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "partnerships-copy" })
                    ] })
                  ] }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "mt-12", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    PhotoGrid,
                    {
                      tags: ["event", "dinner"],
                      perPage: 8,
                      layout: "masonry",
                      className: "small-events-gallery"
                    }
                  ) })
                ] })
              ] })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
            FullPageSection_default,
            {
              id: "for-businesses",
              style: { backgroundColor: BRAND_TOKENS.bgSection },
              children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "business-tab", children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
                  "div",
                  {
                    className: "business-hero",
                    style: {
                      backgroundImage: "url('https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_1600/n4xtzathcmkkqdzq5im4?_a=BAMAK+eA0')"
                    },
                    role: "img",
                    "aria-label": "Local Effort for businesses",
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-hero-scrim", "aria-hidden": "true" }),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "business-hero-content", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "business-panel", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-eyebrow", children: "For businesses" }),
                          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-heading", children: "Partner with Local Effort" }),
                          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-subtitle", children: "You're working directly with the chefs. We're here to support your local food needs." }),
                          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "business-actions", children: [
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                              "button",
                              {
                                type: "button",
                                className: `business-link ${businessPanel === "wholesale" ? "is-active" : ""}`,
                                onClick: () => handleBusinessSelect("wholesale"),
                                children: "cafes, bars, grocery stores and other retail settings interested in wholesale"
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                              "button",
                              {
                                type: "button",
                                className: `business-link ${businessPanel === "office" ? "is-active" : ""}`,
                                onClick: () => handleBusinessSelect("office"),
                                children: "office lunches (coming soon)"
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                              "button",
                              {
                                type: "button",
                                className: `business-link ${businessPanel === "pizza" ? "is-active" : ""}`,
                                onClick: () => handleBusinessSelect("pizza"),
                                children: "open a pizza shop"
                              }
                            )
                          ] })
                        ] }),
                        businessPanel && businessPanel !== "office" && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "business-reveal", children: [
                          businessPanel === "wholesale" && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-stack", children: !wholesaleSubmitted ? /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("form", { className: "business-form", onSubmit: handleWholesaleSubmit, children: [
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "business-label", htmlFor: "wholesale-email", children: "Email for menu access" }),
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                              "input",
                              {
                                id: "wholesale-email",
                                type: "email",
                                className: "business-input",
                                placeholder: "you@company.com",
                                value: wholesaleEmail,
                                onChange: (e) => setWholesaleEmail(e.target.value),
                                required: true
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("button", { type: "submit", className: "business-btn", children: "Get menu + pricing" }),
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-note", children: "We'll send a copy of the pricing sheet too." }),
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-note", children: "fridge and freezer-friendly foods for display cases, grab and go fridges, and menus, delivered fresh. available within approx. 15 miles of 55449, or anywhere in metro along Highway 35w." })
                          ] }) : /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "business-menu", children: [
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-menu-title", children: "Wholesale menu unlocked" }),
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-note", children: "Here is a starter list with partner pricing." }),
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "business-menu-list", children: [
                              wholesaleMenuLoading && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-note", children: "Loading menu..." }),
                              !wholesaleMenuLoading && wholesaleMenuError && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-note", children: wholesaleMenuError }),
                              !wholesaleMenuLoading && !wholesaleMenuError && wholesaleMenuItems.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-note", children: "Menu updates are in progress. Email us for current pricing." }),
                              !wholesaleMenuLoading && !wholesaleMenuError && wholesaleMenuSections.map((section) => /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "business-menu-section", children: [
                                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-menu-category", children: section.category }),
                                section.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "business-menu-row", children: [
                                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { children: item.name }),
                                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "business-price", children: item.price })
                                ] }, item.id || item.name))
                              ] }, section.category))
                            ] }),
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                              "button",
                              {
                                type: "button",
                                className: "business-btn business-btn-secondary",
                                onClick: () => setWholesaleSubmitted(false),
                                children: "Use a different email"
                              }
                            )
                          ] }) }),
                          businessPanel === "pizza" && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "business-stack", children: [
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-menu-title", children: "Open a pizza shop" }),
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "business-note", children: "Reach Weston directly to start the conversation." }),
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("a", { className: "business-email", href: "mailto:weston@localeffortfood.com", children: "weston@localeffortfood.com" })
                          ] })
                        ] })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("section", { className: "case-study-section", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "case-study-header", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "case-study-title", children: "case study: customer portal for happy monday" }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "case-study-subtitle", children: "a lightweight portal where customers can get more information, like ingredients and nutrition, as well as provide feedback and make custom requests." })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "case-study-scroll", role: "region", "aria-label": "Happy Monday case study", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "case-study-grid", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "case-study-card case-study-text", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "case-study-tag", children: "Goal" }),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "case-study-copy", children: [
                        "create a way for a cafe food vendor to have a direct relationship with end customers.",
                        " ",
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                          "a",
                          {
                            href: "https://www.localeffortfood.com/happymonday",
                            target: "_blank",
                            rel: "noreferrer",
                            className: "underline underline-offset-4",
                            children: "see it in action"
                          }
                        ),
                        "."
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "case-study-card case-study-image case-study-expand",
                        onClick: () => setCaseStudyImage({
                          src: "/gallery/hmw%20(1).png",
                          alt: "Happy Monday portal preview"
                        }),
                        children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                          "img",
                          {
                            src: "/gallery/hmw%20(1).png",
                            alt: "Happy Monday portal preview",
                            loading: "lazy"
                          }
                        )
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "case-study-card case-study-text", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "case-study-tag", children: "Experience" }),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "case-study-copy", children: "customers are empowered to chat directly with the chef about their dietary needs and preferences, and have the opportunity to customize their experience at their favorite place." })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "case-study-card case-study-image case-study-expand",
                        onClick: () => setCaseStudyImage({
                          src: "/gallery/hmw%20(2).png",
                          alt: "Happy Monday meals grid"
                        }),
                        children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                          "img",
                          {
                            src: "/gallery/hmw%20(2).png",
                            alt: "Happy Monday meals grid",
                            loading: "lazy"
                          }
                        )
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "case-study-card case-study-text", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "case-study-tag", children: "What's next" }),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "case-study-copy", children: "b2c pre-ordering, subscriptions and notifications for 'DROPS' or new products, discounts and loyalty features, and more ideas about improving vendor-customer relationships in cafe settings." })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "case-study-card case-study-image case-study-expand",
                        onClick: () => setCaseStudyImage({
                          src: "/gallery/hmw%20(3).png",
                          alt: "Happy Monday meal prep detail"
                        }),
                        children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                          "img",
                          {
                            src: "/gallery/hmw%20(3).png",
                            alt: "Happy Monday meal prep detail",
                            loading: "lazy"
                          }
                        )
                      }
                    )
                  ] }) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("section", { className: "partnerships-section", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "partnerships-grid", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "partnerships-card", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "partnerships-title partnerships-title-link",
                        onClick: () => openBusinessContact("wholesale"),
                        children: "wholesale"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "partnerships-copy", children: "pizza, sandwiches, salads, and other standbys, with the same commitments to local and high-integrity ingredients. always minnesotan made, always midwest ingredients, always delicious and nutritionally sound." })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "partnerships-card", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "partnerships-title partnerships-title-link",
                        onClick: () => openBusinessContact("consulting"),
                        children: "restaurant consulting"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "partnerships-copy", children: "front-of-house and back-of-house solutions. improve your restaurant group's tech stack, ingredient sourcing, menu design, service feel, and more. we are restaurant veterans with substantial experience in every dimension of this weird business. we're here to help you make your vision sharper, crisper, cooler, higher impact." })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "partnerships-card", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "partnerships-title partnerships-title-link",
                        onClick: () => openBusinessContact("collaborations"),
                        children: "collaborations"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "partnerships-copy", children: [
                      "always very open and interested in working with other creatives and businesses from all domains: political organizers, artists, bakers, farmers and ag workers, event coordinators, small and large businesses - we want to bring ",
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "partnerships-highlight", children: "local food" }),
                      " to your audience."
                    ] })
                  ] })
                ] }) })
              ] })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
            FullPageSection_default,
            {
              id: "about",
              style: { backgroundColor: BRAND_TOKENS.bgSection },
              children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "about-tab relative w-full h-full pt-20 overflow-y-auto", children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "relative w-full h-[70vh] min-h-[420px]", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "img",
                  {
                    src: "https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_1600/jo9pxtjng8zpt4yo4rcz?_a=BAMAK+eA0",
                    alt: "About Local Effort",
                    className: "w-full h-full object-contain",
                    style: { objectPosition: "center", backgroundColor: BRAND_TOKENS.bgSection }
                  }
                ) }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "px-8 py-12", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "about-bio", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "about-bio-eyebrow", children: "Who we are" }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "about-bio-copy", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("p", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("strong", { children: "We're a knockout team of experienced kitchen professionals" }),
                        " offering our services as personal chefs and value-added producers. We bring Minnesotan and Midwest ingredients to everyday meals and special events with a farm-to-table ethic."
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { children: "We love platters and cassoulets and juleps and celery and croque monsieur and white rice, we love vegetables and meats and grain and nuts and grapes and HAZELNUTS and ducks and lamb and the weird great awesome people who make them and keep making them. We love meeting our growers. We love living in an city where shopping locally is valued and not hard to do." }),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { children: "We feel strongly about choosing food grown and produced closer to home. It's a duty, and a gift, and it's at the center of our practice and culture. We care about flavor and nutrition in equal measure. We're the realest people make the localest food." })
                    ] })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "about-info-masonry", children: [
                    aboutGalleryLoading && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "about-info-status", children: "Loading photos..." }),
                    aboutGalleryError && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "about-info-status about-info-status-error", children: aboutGalleryError }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]", children: aboutMasonryItems.map((item, idx) => {
                      if (item.type === "image") {
                        const img = item.img;
                        return /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                          "div",
                          {
                            className: "mb-4 break-inside-avoid border p-2 bg-white rounded-lg overflow-hidden",
                            children: img.thumbnail_url ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                              "img",
                              {
                                src: img.thumbnail_url,
                                alt: img.context?.alt || "About gallery image",
                                className: "rounded-lg w-full h-auto",
                                loading: "lazy"
                              }
                            ) : /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                              cloudinaryImage_default,
                              {
                                publicId: img.public_id || img.publicId,
                                alt: img.context?.alt || "About gallery image",
                                width: 800,
                                className: "rounded-lg w-full h-auto"
                              }
                            )
                          },
                          item.key || `about-image-${idx}`
                        );
                      }
                      const block = item.block;
                      const isHtml = block.type === "html" && block.content;
                      return /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "about-info-card mb-4 break-inside-avoid", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "about-info-title", children: block.title }),
                        isHtml ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                          "div",
                          {
                            className: "about-info-lines",
                            dangerouslySetInnerHTML: { __html: block.content }
                          }
                        ) : /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("ul", { className: "about-info-list", children: (block.items || []).map((text) => /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("li", { children: text }, text)) })
                      ] }, item.key || `about-info-${idx}`);
                    }) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("section", { className: "py-12", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "max-w-6xl mx-auto px-4 md:px-6 lg:px-8", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(SectionHeader, { overline: "Community", title: "Our Partners" }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(PartnerGrid, {})
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("section", { className: "about-feedback", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "max-w-6xl mx-auto px-4 md:px-6 lg:px-8", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "about-feedback-header", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "about-feedback-title", children: "Feedback" }),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "about-feedback-extra", children: [
                        "Want to",
                        " ",
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("button", { type: "button", className: "about-feedback-link", onClick: () => setShowFeedback(true), children: "provide feedback" }),
                        "?"
                      ] })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "feedback-grid columns-2 md:columns-3 lg:columns-4 [column-fill:_balance]", children: feedbackItems.map((review, idx) => /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("figure", { className: "feedback-quote break-inside-avoid", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("blockquote", { className: "feedback-quote-text", children: [
                        '"',
                        renderInlineMarkup(String(review.quote || "").trim()),
                        '"'
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("figcaption", { className: "feedback-quote-footer", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "feedback-quote-author", children: review.author || "Customer" }),
                        review.context && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "feedback-quote-context", children: review.context })
                      ] })
                    ] }, review.id || `${review.author || "review"}-${idx}`)) })
                  ] }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "script",
                    {
                      type: "application/ld+json",
                      dangerouslySetInnerHTML: { __html: faqStructuredData }
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "about-faq", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "about-faq-title", children: "FAQ" }),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "about-faq-list", children: aboutFaqItems.map((item, idx) => {
                      const isOpen = aboutFaqOpen === idx;
                      const questionId = `about-faq-question-${idx}`;
                      const answerId = `about-faq-answer-${idx}`;
                      return /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: `about-faq-item ${isOpen ? "is-open" : ""}`, children: [
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
                          "button",
                          {
                            type: "button",
                            className: "about-faq-question",
                            onClick: () => setAboutFaqOpen(isOpen ? null : idx),
                            id: questionId,
                            "aria-expanded": isOpen,
                            "aria-controls": answerId,
                            children: [
                              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { children: item.question }),
                              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "about-faq-icon", children: isOpen ? "-" : "+" })
                            ]
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                          "div",
                          {
                            id: answerId,
                            className: "about-faq-answer",
                            role: "region",
                            "aria-labelledby": questionId,
                            "aria-hidden": !isOpen,
                            children: item.answer
                          }
                        )
                      ] }, item.question);
                    }) })
                  ] })
                ] })
              ] })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
            FullPageSection_default,
            {
              id: "local-pizza",
              style: { backgroundColor: BRAND_TOKENS.bgSection },
              children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "relative w-full h-full pt-20 overflow-y-auto", children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "relative min-h-[520px] h-[70vh]", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "img",
                    {
                      src: "/gallery/5Z0A5737-Edit.jpg",
                      alt: "Local pizza",
                      className: "absolute inset-0 h-full w-full object-cover",
                      style: { objectPosition: "center" }
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "relative z-10 flex h-full flex-col items-start justify-end gap-6 px-8 pb-16 md:flex-row md:items-end md:justify-between", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
                      "div",
                      {
                        className: "max-w-lg rounded-lg border border-white/60 bg-white/85 p-5 text-slate-900 shadow-lg",
                        style: { fontFamily: "'Office Code Pro', monospace" },
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-xs font-semibold uppercase tracking-wide text-slate-600", children: "Local pizza" }),
                          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "mt-2 text-lg font-semibold", children: "Local Pizza in your freezer" }),
                          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-2 text-sm text-slate-700", children: [
                            "Local Pizza is 100% midwest ingredients. Find us at Happy Monday in Roseville, and soon on",
                            " ",
                            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                              "a",
                              {
                                href: "https://mnfood.club/?afmc=1y",
                                target: "_blank",
                                rel: "noreferrer",
                                className: "underline underline-offset-4",
                                children: "MN Food Club"
                              }
                            ),
                            ". Host a pizza party at your home, office, or business today."
                          ] })
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "pizza-cta",
                        onClick: () => setSmallEventsDialog("pizza"),
                        children: "book a pizza party"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "relative z-10 px-8 pb-16 pt-10", children: pizzaLoading ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-sm text-gray-600", children: "Loading photos..." }) : pizzaError ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-sm text-red-700", children: pizzaError }) : /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "mb-4 break-inside-avoid border p-4 bg-white/70 rounded-lg", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
                    "div",
                    {
                      style: {
                        fontFamily: "'Yomogi', cursive",
                        color: BRAND_TOKENS.textPrimary,
                        fontSize: "22px",
                        lineHeight: 1.5
                      },
                      children: [
                        "cheese:",
                        " ",
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                          "a",
                          {
                            href: "https://grandecheese.com/cheeses/mozzarella/",
                            target: "_blank",
                            rel: "noreferrer",
                            className: "underline underline-offset-4",
                            children: "grande mozzarella"
                          }
                        ),
                        ". grain:",
                        " ",
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                          "a",
                          {
                            href: "https://www.bakersfieldflourandbread.com/",
                            target: "_blank",
                            rel: "noreferrer",
                            className: "underline underline-offset-4",
                            children: "bakers field"
                          }
                        ),
                        ". tomato:",
                        " ",
                        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                          "a",
                          {
                            href: "https://deifratelli.com/",
                            target: "_blank",
                            rel: "noreferrer",
                            className: "underline underline-offset-4",
                            children: "dei fratelli"
                          }
                        ),
                        ". pepperoni: many."
                      ]
                    }
                  ) }),
                  pizzaImages.map((img, idx) => /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "div",
                    {
                      className: "mb-4 break-inside-avoid border p-2 bg-white rounded-lg overflow-hidden",
                      children: img.thumbnail_url ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                        "img",
                        {
                          src: img.thumbnail_url,
                          alt: img.context?.alt || "Pizza image",
                          className: "rounded-lg w-full h-auto",
                          loading: "lazy"
                        }
                      ) : /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                        cloudinaryImage_default,
                        {
                          publicId: img.public_id || img.publicId,
                          alt: img.context?.alt || "Pizza image",
                          width: 800,
                          className: "rounded-lg w-full h-auto"
                        }
                      )
                    },
                    (img.asset_id || img.public_id || idx) + ":" + idx
                  ))
                ] }) })
              ] })
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("footer", { className: "fullpage-demo-footer", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "fullpage-demo-footer-inner", children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "fullpage-demo-footer-brand", children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "fullpage-demo-footer-name", children: "Local Effort Inc." }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "fullpage-demo-footer-location", children: "Roseville, MN" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("nav", { className: "fullpage-demo-footer-links", "aria-label": "Footer", children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("a", { href: "#about", className: "fullpage-demo-footer-link", children: "About" }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("a", { href: "/releases", className: "fullpage-demo-footer-link", children: "Press" }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("a", { href: "/happymonday", className: "fullpage-demo-footer-link", children: "For Happy Monday" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "fullpage-demo-footer-actions", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
        "button",
        {
          type: "button",
          className: "fullpage-demo-footer-button",
          onClick: () => setAskChefOpen(true),
          children: "Ask a chef"
        }
      ) })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
      AskChefForm,
      {
        open: askChefOpen,
        onOpenChange: setAskChefOpen,
        dialogClassName: "fullpage-demo-scope"
      }
    ),
    FeedbackModal,
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(import_framer_motion3.AnimatePresence, { children: selected && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
      import_framer_motion3.motion.div,
      {
        className: "fixed inset-0 z-[60] flex items-center justify-center p-4 cursor-pointer",
        style: { backgroundColor: BRAND_TOKENS.overlayStrong },
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        onClick: closeLightbox,
        children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
          import_framer_motion3.motion.div,
          {
            initial: { scale: 0.9, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0.9, opacity: 0 },
            className: "relative w-full max-w-[92vw] max-h-[85vh]",
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "lightbox-scroll", children: selected.img.large_url ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "img",
                {
                  src: selected.img.large_url,
                  alt: selected.img.context?.alt || "Large gallery image",
                  decoding: "async",
                  fetchPriority: "high",
                  className: "lightbox-image object-contain rounded-lg shadow-2xl"
                }
              ) : /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                cloudinaryImage_default,
                {
                  publicId: selected.img.public_id,
                  alt: selected.img.context?.alt || "Large gallery image",
                  width: 2e3,
                  height: 2e3,
                  disableLazy: true,
                  eager: true,
                  className: "lightbox-image object-contain rounded-lg shadow-2xl"
                }
              ) }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "button",
                {
                  ref: closeBtnRef,
                  onClick: closeLightbox,
                  className: "absolute -top-4 -right-4 w-12 h-12 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-800 text-3xl font-light transition-colors shadow-lg",
                  "aria-label": "Close",
                  children: "\xD7"
                }
              )
            ]
          }
        )
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(Dialog2, { open: orderOpen, onOpenChange: setOrderOpen, children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogContent2, { className: "fullpage-demo-scope sm:max-w-[520px]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogHeader, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogTitle2, { children: "Weekly Meals Ordering" }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogDescription2, { children: "Demo menu and ordering flow. We will replace this with the real system." })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "space-y-4 text-slate-900", children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "rounded-lg border border-slate-200 bg-white p-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-sm font-semibold", children: "Small Menu" }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "mt-3 space-y-2 text-sm", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { children: "Roasted lemon chicken" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { children: "$14" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { children: "Herb tofu bowl" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { children: "$12" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { children: "Seasonal veggie lasagna" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { children: "$13" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "font-semibold", children: "Pickup window" }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "mt-1 text-slate-700", children: "Sundays, 4:00-6:00 PM" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
          "button",
          {
            type: "button",
            className: "w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800",
            onClick: () => setOrderOpen(false),
            children: "Place demo order"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(Dialog2, { open: announcementOpen, onOpenChange: setAnnouncementOpen, children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogContent2, { className: "fullpage-demo-scope sm:max-w-[520px]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogHeader, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogTitle2, { children: "Happy Monday Coffee" }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
          "img",
          {
            src: "/gallery/hmw%20(1).png",
            alt: "Happy Monday Coffee",
            className: "announcement-map-image",
            loading: "lazy"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogDescription2, { children: [
          "Our favorite coffee shop,",
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
            "a",
            {
              href: "https://www.happymonday.company",
              target: "_blank",
              rel: "noreferrer",
              className: "underline underline-offset-4",
              children: "Happy Monday Coffee"
            }
          ),
          ", has our sandwiches and salads in their grab-and-go fridge, and our frozen pizzas in their freezer. Drop in and try one out."
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "announcement-map", children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "announcement-map-title", children: "Google Maps" }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "announcement-map-media", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "announcement-map-embed", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
          "iframe",
          {
            title: "Happy Monday Coffee on Google Maps",
            src: "https://www.google.com/maps?q=Happy%20Monday%20Coffee%2C%202420%20Cleveland%20Ave%20N%2C%20Roseville%2C%20MN%2055113&output=embed",
            loading: "lazy",
            allowFullScreen: true,
            referrerPolicy: "no-referrer-when-downgrade",
            className: "announcement-map-iframe"
          }
        ) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
          "a",
          {
            href: "https://www.google.com/maps/search/?api=1&query=Happy%20Monday%20Coffee%2C%202420%20Cleveland%20Ave%20N%2C%20Roseville%2C%20MN%2055113",
            target: "_blank",
            rel: "noreferrer",
            className: "announcement-map-link",
            children: "2420 Cleveland Ave N, Roseville, MN 55113"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(Dialog2, { open: smallEventsDialog === "dinner", onOpenChange: (open) => setSmallEventsDialog(open ? "dinner" : null), children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogContent2, { className: "fullpage-demo-scope small-events-dialog max-h-[85vh] overflow-y-auto sm:max-w-[980px]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogHeader, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogTitle2, { className: "small-events-title", children: "Dinner party in my home" }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogDescription2, { className: "small-events-description", children: "Chef-led, multi-course dinners with seasonal menus, staffing, and a 15% deposit to hold the date." })
      ] }),
      renderSmallEventDialogContent("dinner")
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(Dialog2, { open: smallEventsDialog === "pizza", onOpenChange: (open) => setSmallEventsDialog(open ? "pizza" : null), children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogContent2, { className: "fullpage-demo-scope small-events-dialog max-h-[85vh] overflow-y-auto sm:max-w-[980px]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogHeader, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogTitle2, { className: "small-events-title", children: "Pizza Party" }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogDescription2, { className: "small-events-description", children: "Wood-fired pizza parties with full service, staffing, and a 15% deposit to hold the date." })
      ] }),
      renderSmallEventDialogContent("pizza")
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(Dialog2, { open: smallEventsDialog === "weddings", onOpenChange: (open) => setSmallEventsDialog(open ? "weddings" : null), children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogContent2, { className: "fullpage-demo-scope small-events-dialog max-h-[85vh] overflow-y-auto sm:max-w-[980px]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogHeader, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogTitle2, { className: "small-events-title", children: "Weddings" }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogDescription2, { className: "small-events-description", children: "Flexible packages for rehearsal dinners, receptions, and late-night bites with deposit holds." })
      ] }),
      renderSmallEventDialogContent("weddings")
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(Dialog2, { open: smallEventsDialog === "holiday", onOpenChange: (open) => setSmallEventsDialog(open ? "holiday" : null), children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogContent2, { className: "fullpage-demo-scope small-events-dialog max-h-[85vh] overflow-y-auto sm:max-w-[980px]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogHeader, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogTitle2, { className: "small-events-title", children: "Small events and holiday parties" }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogDescription2, { className: "small-events-description", children: "Drop-off or staffed menus for work parties, milestones, and holiday hosting." })
      ] }),
      renderSmallEventDialogContent("holiday")
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
      Dialog2,
      {
        open: quoteDialogOpen,
        onOpenChange: (open) => {
          setQuoteDialogOpen(open);
          if (!open) {
            setQuoteStatus("idle");
            setQuoteError("");
          }
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogContent2, { className: "fullpage-demo-scope sm:max-w-[600px]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogHeader, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogTitle2, { children: "Contact us about your quote" }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogDescription2, { children: "We'll send your note plus the current quote details to our team." })
          ] }),
          quoteStatus === "success" ? /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "space-y-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-sm text-slate-700", children: "Message sent. We'll reply soon." }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
              "button",
              {
                type: "button",
                className: "form-fun-cta w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800",
                onClick: () => setQuoteDialogOpen(false),
                children: "Close"
              }
            )
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("form", { className: "form-fun-card space-y-4", onSubmit: submitQuoteMessage, children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "text-xs text-slate-600", children: [
              "Quote type: ",
              SMALL_EVENT_CONFIG[quoteDialogType]?.label || "Small events"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "grid gap-4 md:grid-cols-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", htmlFor: "quote-name", children: "Name" }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "input",
                  {
                    id: "quote-name",
                    type: "text",
                    className: "mt-1 w-full",
                    value: quoteName,
                    onChange: (e) => setQuoteName(e.target.value),
                    placeholder: "Your name"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", htmlFor: "quote-email", children: "Email" }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "input",
                  {
                    id: "quote-email",
                    type: "email",
                    className: "mt-1 w-full",
                    value: quoteEmail,
                    onChange: (e) => setQuoteEmail(e.target.value),
                    placeholder: "you@company.com"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "form-fun-label", htmlFor: "quote-message", children: "Message" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "textarea",
                {
                  id: "quote-message",
                  className: "mt-1 w-full",
                  rows: 4,
                  value: quoteMessage,
                  onChange: (e) => setQuoteMessage(e.target.value),
                  placeholder: "What would you like to clarify or adjust?"
                }
              )
            ] }),
            quoteStatus === "error" && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-sm text-red-700", children: quoteError }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
              "button",
              {
                type: "submit",
                className: "form-fun-cta w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800",
                disabled: quoteStatus === "sending",
                children: quoteStatus === "sending" ? "Sending..." : "Send message"
              }
            )
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
      Dialog2,
      {
        open: businessContactOpen,
        onOpenChange: (open) => {
          setBusinessContactOpen(open);
          if (!open) resetBusinessContact();
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogContent2, { className: "fullpage-demo-scope sm:max-w-[560px]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogHeader, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogTitle2, { children: [
              "Contact us about ",
              BUSINESS_CONTACT_OPTIONS[businessContactType] || "partnerships"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogDescription2, { children: "Share a few details and we'll follow up with next steps." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
            "form",
            {
              className: "space-y-4",
              onSubmit: async (e) => {
                e.preventDefault();
                if (businessContactStatus === "sending") return;
                setBusinessContactStatus("sending");
                setBusinessContactError("");
                try {
                  const typeLabel = BUSINESS_CONTACT_OPTIONS[businessContactType] || "Partnerships";
                  const lines = [
                    `Partnership type: ${typeLabel}`,
                    businessContactOrg ? `Organization: ${businessContactOrg}` : null,
                    businessContactPhone ? `Phone: ${businessContactPhone}` : null,
                    businessContactMessage ? `Message: ${businessContactMessage}` : null
                  ].filter(Boolean);
                  const payload = {
                    name: businessContactName,
                    email: businessContactEmail,
                    subject: `Business inquiry: ${typeLabel}`,
                    message: lines.join("\n"),
                    type: "business-partnership"
                  };
                  const res = await fetch("/api/messages/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                  });
                  if (!res.ok) throw new Error(await res.text());
                  setBusinessContactStatus("sent");
                  resetBusinessContact();
                  setTimeout(() => setBusinessContactOpen(false), 800);
                } catch (error) {
                  setBusinessContactError(error?.message || "Unable to send message.");
                  setBusinessContactStatus("error");
                }
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "business-contact-type", children: "Partnership type" }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "select",
                    {
                      id: "business-contact-type",
                      className: "input",
                      value: businessContactType,
                      onChange: (e) => setBusinessContactType(e.target.value),
                      children: Object.entries(BUSINESS_CONTACT_OPTIONS).map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value, children: label }, value))
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "business-contact-name", children: "Name" }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "input",
                    {
                      id: "business-contact-name",
                      className: "input",
                      value: businessContactName,
                      onChange: (e) => setBusinessContactName(e.target.value),
                      required: true
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "business-contact-email", children: "Email" }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "input",
                    {
                      id: "business-contact-email",
                      type: "email",
                      className: "input",
                      value: businessContactEmail,
                      onChange: (e) => setBusinessContactEmail(e.target.value),
                      required: true
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "business-contact-org", children: "Organization" }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "input",
                    {
                      id: "business-contact-org",
                      className: "input",
                      value: businessContactOrg,
                      onChange: (e) => setBusinessContactOrg(e.target.value),
                      placeholder: "Optional"
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "business-contact-phone", children: "Phone (optional)" }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "input",
                    {
                      id: "business-contact-phone",
                      type: "tel",
                      className: "input",
                      value: businessContactPhone,
                      onChange: (e) => setBusinessContactPhone(e.target.value),
                      placeholder: "Optional"
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "business-contact-message", children: "Message" }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "textarea",
                    {
                      id: "business-contact-message",
                      className: "textarea",
                      rows: 5,
                      value: businessContactMessage,
                      onChange: (e) => setBusinessContactMessage(e.target.value),
                      required: true
                    }
                  )
                ] }),
                businessContactError && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-sm text-red-700", children: businessContactError }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "button",
                  {
                    type: "submit",
                    className: "btn btn-primary w-full",
                    disabled: businessContactStatus === "sending",
                    children: businessContactStatus === "sending" ? "Sending..." : "Send request"
                  }
                )
              ]
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
      Dialog2,
      {
        open: smallEventsContactOpen,
        onOpenChange: (open) => {
          setSmallEventsContactOpen(open);
          if (!open) resetSmallEventsContact();
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogContent2, { className: "fullpage-demo-scope sm:max-w-[560px]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogHeader, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogTitle2, { children: [
              "Contact us about ",
              SMALL_EVENTS_CONTACT_OPTIONS[smallEventsContactType] || "small events"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogDescription2, { children: "Share a few details and we'll follow up with next steps." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
            "form",
            {
              className: "space-y-4",
              onSubmit: async (e) => {
                e.preventDefault();
                if (smallEventsContactStatus === "sending") return;
                setSmallEventsContactStatus("sending");
                setSmallEventsContactError("");
                try {
                  const typeLabel = SMALL_EVENTS_CONTACT_OPTIONS[smallEventsContactType] || "Small events";
                  const lines = [
                    `Event type: ${typeLabel}`,
                    smallEventsContactPhone ? `Phone: ${smallEventsContactPhone}` : null,
                    smallEventsContactMessage ? `Message: ${smallEventsContactMessage}` : null
                  ].filter(Boolean);
                  const payload = {
                    name: smallEventsContactName,
                    email: smallEventsContactEmail,
                    subject: `Small events inquiry: ${typeLabel}`,
                    message: lines.join("\n"),
                    type: "small-events-inquiry"
                  };
                  const res = await fetch("/api/messages/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                  });
                  if (!res.ok) throw new Error(await res.text());
                  setSmallEventsContactStatus("sent");
                  resetSmallEventsContact();
                  setTimeout(() => setSmallEventsContactOpen(false), 800);
                } catch (error) {
                  setSmallEventsContactError(error?.message || "Unable to send message.");
                  setSmallEventsContactStatus("error");
                }
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "small-events-contact-type", children: "Event type" }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "select",
                    {
                      id: "small-events-contact-type",
                      className: "input",
                      value: smallEventsContactType,
                      onChange: (e) => setSmallEventsContactType(e.target.value),
                      children: Object.entries(SMALL_EVENTS_CONTACT_OPTIONS).map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value, children: label }, value))
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "small-events-contact-name", children: "Name" }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "input",
                    {
                      id: "small-events-contact-name",
                      className: "input",
                      value: smallEventsContactName,
                      onChange: (e) => setSmallEventsContactName(e.target.value),
                      required: true
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "small-events-contact-email", children: "Email" }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "input",
                    {
                      id: "small-events-contact-email",
                      type: "email",
                      className: "input",
                      value: smallEventsContactEmail,
                      onChange: (e) => setSmallEventsContactEmail(e.target.value),
                      required: true
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "small-events-contact-phone", children: "Phone (optional)" }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "input",
                    {
                      id: "small-events-contact-phone",
                      type: "tel",
                      className: "input",
                      value: smallEventsContactPhone,
                      onChange: (e) => setSmallEventsContactPhone(e.target.value),
                      placeholder: "Optional"
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "small-events-contact-message", children: "Message" }),
                  /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                    "textarea",
                    {
                      id: "small-events-contact-message",
                      className: "textarea",
                      rows: 5,
                      value: smallEventsContactMessage,
                      onChange: (e) => setSmallEventsContactMessage(e.target.value),
                      required: true
                    }
                  )
                ] }),
                smallEventsContactError && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "text-sm text-red-700", children: smallEventsContactError }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "button",
                  {
                    type: "submit",
                    className: "btn btn-primary w-full",
                    disabled: smallEventsContactStatus === "sending",
                    children: smallEventsContactStatus === "sending" ? "Sending..." : "Send request"
                  }
                )
              ]
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(Dialog2, { open: officeLunchesOpen, onOpenChange: setOfficeLunchesOpen, children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(DialogContent2, { className: "fullpage-demo-scope sm:max-w-[900px]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogTitle2, { children: "Office lunches (coming soon)" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "overflow-hidden rounded-xl border border-slate-200 bg-white", children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
        "img",
        {
          src: "/gallery/Screenshot%20(168).png",
          alt: "Office lunches preview",
          className: "h-auto w-full object-cover",
          loading: "lazy"
        }
      ) })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
      Dialog2,
      {
        open: Boolean(caseStudyImage),
        onOpenChange: (open) => {
          if (!open) setCaseStudyImage(null);
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(DialogContent2, { className: "fullpage-demo-scope case-study-lightbox sm:max-w-[900px]", children: caseStudyImage && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
          "img",
          {
            src: caseStudyImage.src,
            alt: caseStudyImage.alt,
            className: "w-full h-auto",
            loading: "eager"
          }
        ) })
      }
    ),
    showWaitlistForm && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
      "div",
      {
        className: "fixed inset-0 z-[70] flex items-start justify-center bg-black/60 px-4 py-8 overflow-y-auto",
        role: "dialog",
        "aria-modal": "true",
        children: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "form-card w-full max-w-xl max-h-[90vh] overflow-y-auto relative", children: [
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
            "button",
            {
              type: "button",
              className: "absolute right-4 top-4 text-sm underline z-10",
              onClick: () => {
                setShowWaitlistForm(false);
                setWaitlistStatus("idle");
                resetWaitlist();
              },
              children: "Close"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("h2", { className: "text-2xl font-bold mb-2", children: "Join the waiting list" }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { className: "text-sm text-gray-600 mb-4", children: "We'll reach out when weekly meal pickup slots reopen." }),
          /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("form", { onSubmit: handleWaitlistSubmit, className: "space-y-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "weekly-waitlist-name", children: "Name" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  id: "weekly-waitlist-name",
                  className: "input",
                  value: waitlist.name,
                  onChange: (e) => handleWaitlistChange("name", e.target.value),
                  required: true
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "grid md:grid-cols-2 gap-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "weekly-waitlist-email", children: "Email" }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "input",
                  {
                    id: "weekly-waitlist-email",
                    type: "email",
                    className: "input",
                    value: waitlist.email,
                    onChange: (e) => handleWaitlistChange("email", e.target.value),
                    required: true
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "weekly-waitlist-phone", children: "Phone number" }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "input",
                  {
                    id: "weekly-waitlist-phone",
                    className: "input",
                    value: waitlist.phone,
                    onChange: (e) => handleWaitlistChange("phone", e.target.value),
                    required: true
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "weekly-waitlist-family", children: "Family size" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "input",
                {
                  id: "weekly-waitlist-family",
                  className: "input",
                  placeholder: "e.g. 2 adults, 2 kids",
                  value: waitlist.familySize,
                  onChange: (e) => handleWaitlistChange("familySize", e.target.value),
                  required: true
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "weekly-waitlist-children", children: "Children & ages" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "textarea",
                {
                  id: "weekly-waitlist-children",
                  className: "textarea",
                  rows: 2,
                  value: waitlist.children,
                  onChange: (e) => handleWaitlistChange("children", e.target.value),
                  placeholder: "Tell us about school schedules, toddlers, or teens."
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "grid md:grid-cols-2 gap-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "weekly-waitlist-days", children: "Days per week" }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "input",
                  {
                    id: "weekly-waitlist-days",
                    className: "input",
                    placeholder: "How many days should we cover?",
                    value: waitlist.daysPerWeek,
                    onChange: (e) => handleWaitlistChange("daysPerWeek", e.target.value),
                    required: true
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "weekly-waitlist-meals", children: "Meals per day" }),
                /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                  "input",
                  {
                    id: "weekly-waitlist-meals",
                    className: "input",
                    placeholder: "Breakfast, lunch, dinner?",
                    value: waitlist.mealsPerDay,
                    onChange: (e) => handleWaitlistChange("mealsPerDay", e.target.value),
                    required: true
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "weekly-waitlist-allergies", children: "Allergies or medical comments" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "textarea",
                {
                  id: "weekly-waitlist-allergies",
                  className: "textarea",
                  rows: 3,
                  value: waitlist.allergies,
                  onChange: (e) => handleWaitlistChange("allergies", e.target.value),
                  placeholder: "Include any dietary restrictions, allergies, or doctor notes."
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("label", { className: "label", htmlFor: "weekly-waitlist-questions", children: "Questions for the team" }),
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
                "textarea",
                {
                  id: "weekly-waitlist-questions",
                  className: "textarea",
                  rows: 3,
                  value: waitlist.questions,
                  onChange: (e) => handleWaitlistChange("questions", e.target.value),
                  placeholder: "Anything else we should know?"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "flex flex-wrap items-center gap-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("button", { type: "submit", className: "btn btn-primary", disabled: waitlistStatus === "sending", children: waitlistStatus === "sending" ? "Submitting..." : "Join waitlist" }),
              waitlistStatus === "success" && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "text-green-700 text-sm", children: "Thanks! We'll be in touch." }),
              waitlistStatus === "error" && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { className: "text-red-700 text-sm", children: "We couldn't submit your request. Please try again." })
            ] })
          ] })
        ] })
      }
    )
  ] });
};
var FullPageDemoPage_default = FullPageDemoPage;

// src/pages/ReleasesPage.jsx
var import_react14 = __toESM(require("react"));
var import_react_helmet_async2 = __toESM(require_lib());
var import_react_router_dom4 = require("react-router-dom");
var import_jsx_runtime23 = require("react/jsx-runtime");
var typewriterFonts = "'IBM Plex Mono', 'Courier Prime', 'Courier New', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'";
var releaseDate = "Sep 30, 2025";
var pressFacts = [
  { label: "Founded", value: "2022" },
  { label: "Headquarters", value: "Minneapolis, Minnesota" },
  {
    label: "Service Areas",
    value: "Minneapolis, St. Paul, Roseville, the Twin Cities, and Western Wisconsin"
  },
  {
    label: "Core Services",
    value: "Personal chef experiences, weekly meal prep, intimate event catering, and 100% local pizzas"
  }
];
var leadership = [
  {
    name: "Weston Smith",
    title: "Chef & Co-Founder",
    bio: "Trained in fine dining in New York after beginnings in Portland coffee. Leads culinary direction with a focus on Minnesota-grown ingredients."
  },
  {
    name: "Catherine Olsen",
    title: "Chef & Co-Founder",
    bio: "Minneapolis native and veteran baker who brings warmth, hospitality, and deep local sourcing relationships to the kitchen."
  }
];
var campaignHighlights = [
  "Goal: Handcraft and deliver 1,000 wood-fired pizzas made with 100% local Midwest ingredients.",
  "Purpose: Fund expanded capacity and improve quality control, in the service of opening a pizza shop next year.",
  "Backer Rewards: Pizzas, pies, events, and premium special offers like sockeye bottarga.",
  "Timeline: 30-day crowdfunding campaign with weekly progress updates and community tastings."
];
var pressAssets = [
  {
    label: "Website",
    value: "https://localeffortfood.com",
    href: "https://localeffortfood.com"
  },
  {
    label: "Crowdfunding Hub",
    value: "Join the pizza campaign",
    href: "/crowdfunding"
  },
  {
    label: "Media Gallery",
    value: "High-resolution kitchen & event photography",
    href: "/gallery"
  },
  {
    label: "Service Overview",
    value: "Menus, pricing, and service areas",
    href: "/services"
  }
];
var ReleasesPage = () => {
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(import_jsx_runtime23.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(import_react_helmet_async2.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("title", { children: "Releases | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "meta",
        {
          name: "description",
          content: "Press releases and media resources from Local Effort Food Co., the Minneapolis-based personal chef and catering team."
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("link", { rel: "canonical", href: "https://localeffortfood.com/releases" }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("link", { rel: "alternate", type: "application/rss+xml", title: "Local Effort Releases RSS", href: "/api/feeds/releases.rss" }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("link", { rel: "alternate", type: "application/atom+xml", title: "Local Effort Releases Atom", href: "/api/feeds/releases.atom" }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("script", { type: "application/ld+json", children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            name: "Local Effort Food Co.",
            url: "https://localeffortfood.com",
            foundingDate: "2022",
            address: { "@type": "PostalAddress", addressLocality: "Roseville", addressRegion: "MN", addressCountry: "US" },
            areaServed: ["Minneapolis", "St. Paul", "Twin Cities", "Western Wisconsin"],
            sameAs: [
              "https://www.instagram.com/localeffort",
              "https://www.tiktok.com/@localeffort"
            ]
          },
          {
            "@type": "NewsArticle",
            headline: "Roseville-Based Local Effort Seeks Support to Craft 1,000 Fully Local Pizzas",
            datePublished: "2025-09-30",
            dateModified: "2025-09-30",
            description: "Local Effort Food Co. launches a community-backed effort to craft 1,000 pizzas using 100% Midwestern ingredients.",
            author: { "@type": "Organization", name: "Local Effort Food Co." },
            publisher: { "@type": "Organization", name: "Local Effort Food Co." },
            mainEntityOfPage: { "@type": "WebPage", "@id": "https://localeffortfood.com/releases" }
          }
        ]
      }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { className: "bg-neutral-50 py-16", children: /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "max-w-5xl mx-auto px-4 md:px-6 lg:px-8", children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
        "section",
        {
          className: "bg-white border border-neutral-200 shadow-xl shadow-neutral-900/5 rounded-2xl overflow-hidden",
          style: { fontFamily: typewriterFonts },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { className: "bg-neutral-900 text-neutral-100 px-6 py-3 text-xs tracking-[0.4em] uppercase", children: "Press Release" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "px-6 py-8 md:px-10 md:py-12 space-y-8", children: [
              /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("header", { className: "space-y-4", children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "flex flex-col gap-1 text-neutral-600 text-sm uppercase tracking-[0.3em]", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { children: "For Immediate Release" }),
                  /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { children: releaseDate })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "grid gap-3 md:grid-cols-[2fr,1fr] md:items-start", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "space-y-3", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("h1", { className: "heading-xl heading-balance", children: "Roseville-Based Local Effort Seeks Support to Craft 1,000 Fully Local Pizzas" }),
                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: "text-base text-neutral-700 leading-relaxed", children: "Roseville-based Local Effort Food Co. invites the community to back its most ambitious pizza initiative yet\u2014building a thousand pies sourced entirely from Midwestern growers, millers, and producers." })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("aside", { className: "md:justify-self-end md:text-right text-sm text-neutral-700", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: "font-semibold text-neutral-900", children: "Media Contact" }),
                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: "Weston Smith" }),
                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: "Local Effort Food Co." }),
                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("a", { href: "mailto:yum@localeffortfood.com", className: "underline underline-offset-4 hover:opacity-80", children: "yum@localeffortfood.com" }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("a", { href: "https://localeffortfood.com", className: "underline underline-offset-4 hover:opacity-80", children: "localeffortfood.com" }) })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "space-y-5 text-[1.02rem] leading-relaxed text-neutral-800", children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: "The crowdfunding campaign energizes Local Effort's obsession with 100% regional sourcing. Every crust, sauce, and topping will trace back to Minnesota and Midwest farms, mills, creameries, and co-ops that the chef team has partnered with since 2022." }),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: "Backers will help finance upgraded capacity and purchasing power, unlocking more neighborhood pop-ups, farmers market collaborations, and last-mile delivery runs throughout Minneapolis, St. Paul, and Western Wisconsin." }),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: "\u201CThis is truly Local Pizza,\u201D said Weston Smith, chef and co-founder of Local Effort. \u201CThe grain, the cheese, the tomatoes all tell a story about producing food in the Midwest. If we sell a thousand pies, we'll focus on opening a shop.\u201D" }),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: "Supporters can choose from tiered rewards including apple pies, special invite-only parties and events, premium home events, and exclusive seasonal toppings co-developed with local growers. Weekly progress bulletins and tasting events will keep the community connected as milestones are reached on the path to 1,000 pizzas." })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("section", { "aria-labelledby": "campaign-highlights", className: "space-y-3", children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("h2", { id: "campaign-highlights", className: "heading-overline text-neutral-600", children: "Campaign Snapshot" }),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("ul", { className: "space-y-3 text-neutral-800", children: campaignHighlights.map((item) => /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("li", { className: "pl-5 relative", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "absolute left-0 top-2 h-2 w-2 rounded-full bg-neutral-900", "aria-hidden": "true" }),
                  item
                ] }, item)) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "space-y-5 text-[1.02rem] leading-relaxed text-neutral-800", children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: "Local Effort has grown from intimate in-home dinners to weekly meal prep and private events by doubling down on local-first commitments. The pizza program translates that ethos into a universally beloved format." }),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("p", { children: [
                  "The crowdfunding page is live now at",
                  " ",
                  /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(import_react_router_dom4.Link, { to: "/crowdfunding", className: "underline underline-offset-4 font-semibold", children: "localeffortfood.com/crowdfunding" }),
                  ". Early backers will unlock surprise collaborations with partner farms and organizations across the Twin Cities."
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("footer", { className: "pt-6 border-t border-dashed border-neutral-300", children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: "uppercase tracking-[0.3em] text-xs text-neutral-600", children: "About Local Effort" }),
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: "mt-3 text-[1.02rem] leading-relaxed text-neutral-800", children: "Local Effort Food Co. is a Roseville-based personal chef and catering team specializing in locally sourced cuisine. Since 2022, the team has designed in-home dinners, weekly meal prep, and small events that keep Midwestern ingredients at the center of every menu." })
              ] })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("section", { className: "mt-16 space-y-8", children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "space-y-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("h2", { className: "heading-xl heading-balance", children: "Press kit" }),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: "text-neutral-600 max-w-3xl", children: "Download-ready facts, leadership bios, and campaign details to support coverage of Local Effort's 1,000 pizza crowdfunding initiative." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "grid gap-6 lg:grid-cols-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm", children: [
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("h3", { className: "text-lg font-semibold text-neutral-900", children: "Fast Facts" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("dl", { className: "mt-4 space-y-3 text-neutral-700", children: pressFacts.map(({ label, value }) => /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "flex flex-col", children: [
              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("dt", { className: "text-xs uppercase tracking-[0.25em] text-neutral-500", children: label }),
              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("dd", { className: "text-base", children: value })
            ] }, label)) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm", children: [
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("h3", { className: "text-lg font-semibold text-neutral-900", children: "Leadership" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("ul", { className: "mt-4 space-y-4 text-neutral-700", children: leadership.map(({ name, title, bio }) => /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("li", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: "text-base font-semibold text-neutral-900", children: name }),
              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: "text-sm uppercase tracking-[0.2em] text-neutral-500", children: title }),
              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: "mt-2 text-sm leading-relaxed", children: bio })
            ] }, name)) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm lg:col-span-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("h3", { className: "text-lg font-semibold text-neutral-900", children: "Campaign Assets" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "mt-4 grid gap-4 sm:grid-cols-2", children: [
              pressAssets.map(({ label, value, href }) => /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                "a",
                {
                  href,
                  className: "group flex flex-col justify-between rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-400 hover:shadow",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "text-xs uppercase tracking-[0.25em] text-neutral-500", children: label }),
                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "mt-2 text-base text-neutral-900 group-hover:underline group-hover:underline-offset-4", children: value })
                  ]
                },
                label
              )),
              /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
                "a",
                {
                  href: "/press/local-effort-press-kit.pdf",
                  className: "group flex flex-col justify-between rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-400 hover:shadow",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "text-xs uppercase tracking-[0.25em] text-neutral-500", children: "Press Kit PDF" }),
                    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "mt-2 text-base text-neutral-900 group-hover:underline group-hover:underline-offset-4", children: "Download press kit (PDF)" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm", children: [
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("h3", { className: "text-lg font-semibold text-neutral-900", children: "Media Contact" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("p", { className: "mt-3 text-sm text-neutral-600", children: [
              "Local Effort Food Co.",
              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("br", {}),
              "Minneapolis, MN"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("p", { className: "mt-4 text-sm text-neutral-700", children: [
              "Email:",
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("a", { href: "mailto:yum@localeffortfood.com", className: "underline underline-offset-4 hover:opacity-80", children: "yum@localeffortfood.com" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("p", { className: "mt-1 text-sm text-neutral-700", children: [
              "Instagram:",
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("a", { href: "https://www.instagram.com/localeffort", className: "underline underline-offset-4 hover:opacity-80", children: "@localeffort" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("p", { className: "mt-1 text-sm text-neutral-700", children: [
              "TikTok:",
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("a", { href: "https://www.tiktok.com/@localeffort", className: "underline underline-offset-4 hover:opacity-80", children: "@localeffort" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: "mt-6", children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
              import_react_router_dom4.Link,
              {
                to: "/crowdfunding",
                className: "inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold tracking-wide text-white transition hover:bg-neutral-800",
                children: "View crowdfunding campaign"
              }
            ) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm", children: [
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("h3", { className: "text-lg font-semibold text-neutral-900", children: "Story Angles" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("ul", { className: "mt-4 space-y-3 text-neutral-700", children: [
              /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("li", { className: "pl-4 relative", children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "absolute left-0 top-2 h-2 w-2 rounded-full bg-neutral-900", "aria-hidden": "true" }),
                "Farm-to-pizza supply chains featuring grain cooperatives, creameries, and seasonal produce."
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("li", { className: "pl-4 relative", children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "absolute left-0 top-2 h-2 w-2 rounded-full bg-neutral-900", "aria-hidden": "true" }),
                "Growing a chef-led small business through community-backed crowdfunding."
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("li", { className: "pl-4 relative", children: [
                /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "absolute left-0 top-2 h-2 w-2 rounded-full bg-neutral-900", "aria-hidden": "true" }),
                "How Local Effort's weekly meal prep program informs fast-casual pizza innovation."
              ] })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("section", { className: "mt-24", "aria-labelledby": "archive-heading", children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("h2", { id: "archive-heading", className: "heading-lg heading-balance mb-6", children: "Previous release (archived)" }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("details", { className: "group bg-white rounded-2xl border border-neutral-200 shadow-sm", children: [
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("summary", { className: "cursor-pointer list-none px-6 py-4 flex items-center justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "font-medium text-neutral-800", children: "Local Effort Launches Crowdfunding Campaign to Craft 1,000 Local Pizzas" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "text-xs text-neutral-500 group-open:hidden", children: "Expand" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "text-xs text-neutral-500 hidden group-open:inline", children: "Collapse" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "px-6 pb-8 space-y-5 text-neutral-800 text-[0.97rem] leading-relaxed", children: [
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: "Minneapolis-based Local Effort Food Co. invites the community to back its most ambitious pizza initiative yet\u2014building a thousand pies sourced entirely from Midwestern growers, millers, and makers." }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: "The crowdfunding campaign energizes Local Effort's obsession with 100% regional sourcing. Every crust, sauce, and topping will trace back to Minnesota and Midwest farms, mills, creameries, and co-ops that the chef team has partnered with since 2022." }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: "Backers will help finance upgraded cold storage and a mobile pizza rig, unlocking more neighborhood pop-ups, farmers market collaborations, and last-mile delivery runs throughout Minneapolis, St. Paul, and Western Wisconsin." }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: "\u201CPizzas can tell the whole story of a foodshed,\u201D said Weston Smith, chef and co-founder of Local Effort. \u201CWhen we layer house-fermented dough with seasonal produce, heritage grains, and regional cheeses, we showcase the farms that feed us. This campaign invites people to invest in that community table.\u201D" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: "Supporters can choose from tiered rewards including limited pizza drops, family meal prep bundles, and exclusive seasonal toppings co-developed with local growers. Weekly progress bulletins and tasting events will keep the community connected as milestones are reached on the path to 1,000 pizzas." }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: "Local Effort has grown from intimate in-home dinners to weekly meal prep and community events by doubling down on relationships with Minnesota farmers, grain cooperatives, and dairy makers. The pizza program translates that ethos into a handheld, shareable format that can reach more tables without compromising sourcing." })
          ] })
        ] })
      ] })
    ] }) })
  ] });
};
var ReleasesPage_default = ReleasesPage;

// src/pages/SalePage.jsx
var import_react21 = __toESM(require("react"));
var import_react_helmet_async3 = __toESM(require_lib());
var import_framer_motion5 = require("framer-motion");

// src/store/components/ProductCard.jsx
var import_react17 = __toESM(require("react"));
var import_react18 = require("@portabletext/react");

// src/utils/portableTextComponents.jsx
var import_react15 = __toESM(require("react"));
var import_image_url = __toESM(require("@sanity/image-url"));

// src/sanityClient.js
var import_client = require("@sanity/client");
var import_meta3 = {};
var rawBuildEnv = typeof import_meta3 !== "undefined" && import_meta3.env ? import_meta3.env : {};
var runtimeWindowEnv = typeof window !== "undefined" && window.__SANITY_CONFIG__ ? window.__SANITY_CONFIG__ : {};
var env = { ...rawBuildEnv, ...runtimeWindowEnv };
var projectId = env.VITE_APP_SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID || env.SANITY_PROJECT_ID || env.PROJECT_ID;
var dataset = env.VITE_APP_SANITY_DATASET || env.VITE_SANITY_DATASET || env.SANITY_DATASET || env.DATASET;
var createProxyClient = () => {
  return {
    fetch: async (query, params = {}) => {
      try {
        const response = await fetch("/api/sanity-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, params })
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "fetch-failed" }));
          throw new Error(error.message || error.error || "Sanity query failed");
        }
        const data = await response.json();
        return data.result;
      } catch (err) {
        console.error("Sanity proxy fetch error:", err);
        throw err;
      }
    }
  };
};
var client = null;
try {
  if (projectId && dataset) {
    if (typeof window !== "undefined") {
      client = createProxyClient();
    } else {
      client = (0, import_client.createClient)({ projectId, dataset, useCdn: true, apiVersion: "2023-05-03" });
    }
  } else {
    client = {
      fetch: async () => {
        throw new Error("Sanity client unavailable");
      }
    };
  }
} catch (e) {
  console.warn("Failed to initialize Sanity client:", e && (e.message || e));
  client = {
    fetch: async () => {
      throw new Error("Sanity client unavailable");
    }
  };
}
var sanityClient_default = client;

// src/utils/portableTextComponents.jsx
var import_jsx_runtime24 = require("react/jsx-runtime");
var accentLinkClass = "text-[var(--color-accent)] underline underline-offset-4 decoration-[var(--color-accent)] hover:opacity-80 transition-colors";
function DefaultLink({ children, value }) {
  const href = typeof value?.href === "string" && value.href.trim() ? value.href : "#";
  const explicitTarget = value?.target || value?.blank;
  const isExternal = /^https?:/i.test(href);
  const shouldOpenNewTab = explicitTarget === "_blank" || explicitTarget === true || explicitTarget === void 0 && isExternal;
  const target = shouldOpenNewTab ? "_blank" : void 0;
  const rel = shouldOpenNewTab ? "noopener noreferrer" : void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("a", { href, target, rel, className: accentLinkClass, children });
}
var imageBuilder = null;
try {
  imageBuilder = (0, import_image_url.default)(sanityClient_default);
} catch (error) {
  imageBuilder = null;
}
function resolveImageUrl(value) {
  if (value?.asset?.url) {
    return value.asset.url;
  }
  if (!value?.asset?._ref || !imageBuilder) {
    return "";
  }
  try {
    return imageBuilder.image(value).width(1600).quality(80).fit("max").url();
  } catch (error) {
    return "";
  }
}
function DefaultPortableTextImage({ value }) {
  const src = resolveImageUrl(value);
  if (!src) {
    return null;
  }
  const alt = typeof value?.alt === "string" ? value.alt : "";
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
    "img",
    {
      src,
      alt,
      loading: "lazy",
      className: "my-4 w-full rounded-md object-contain"
    }
  );
}
function createPortableTextComponents(overrides = {}) {
  const { marks: providedMarks = {}, types: providedTypes = {}, ...rest } = overrides;
  return {
    ...rest,
    marks: {
      link: DefaultLink,
      ...providedMarks
    },
    types: {
      image: DefaultPortableTextImage,
      ...providedTypes
    }
  };
}
var portableTextComponents = createPortableTextComponents();

// src/components/common/ToastProvider.jsx
var import_react16 = __toESM(require("react"));
var import_jsx_runtime25 = require("react/jsx-runtime");
var ToastContext = (0, import_react16.createContext)({ notify: () => {
} });
function useToast() {
  return (0, import_react16.useContext)(ToastContext);
}

// src/store/components/ProductCard.jsx
var import_jsx_runtime26 = require("react/jsx-runtime");
function ProductCard({ product }) {
  const { add, map, updateQty, open, openCart } = useCart();
  const { notify } = useToast();
  const [variantIdx, setVariantIdx] = (0, import_react17.useState)(0);
  const [showDetails, setShowDetails] = (0, import_react17.useState)(false);
  const [selectedAddOns, setSelectedAddOns] = (0, import_react17.useState)({});
  const [isDairyFree, setIsDairyFree] = (0, import_react17.useState)(false);
  const dialogRef = (0, import_react17.useRef)(null);
  const closeBtnRef = (0, import_react17.useRef)(null);
  const prevFocusRef = (0, import_react17.useRef)(null);
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const hasAddOns = Array.isArray(product.addOns) && product.addOns.length > 0;
  const chosen = hasVariants ? product.variants[Math.max(0, Math.min(variantIdx, product.variants.length - 1))] : null;
  const basePrice = chosen?.price ?? (product.salePrice ?? product.price);
  const addOnsTotal = hasAddOns ? Object.keys(selectedAddOns).reduce((sum, idx) => {
    if (selectedAddOns[idx]) {
      return sum + (product.addOns[idx]?.additionalCost || 0);
    }
    return sum;
  }, 0) : 0;
  const dairyFreePrice = isDairyFree && product.offerDairyFree ? product.dairyFreeCost || 0 : 0;
  const price = basePrice + addOnsTotal + dairyFreePrice;
  (0, import_react17.useEffect)(() => {
    if (showDetails && hasAddOns) {
      const defaults = {};
      product.addOns.forEach((addon, idx) => {
        if (addon.defaultSelected) {
          defaults[idx] = true;
        }
      });
      setSelectedAddOns(defaults);
    }
  }, [showDetails, hasAddOns, product.addOns]);
  const images = (0, import_react17.useMemo)(() => {
    const arr = Array.isArray(product?.images) ? product.images : [];
    return arr.map((i) => typeof i === "string" ? i : i?.url || i?.asset?.url || null).filter(Boolean);
  }, [product]);
  const primary = images[0];
  const rest = images.slice(1);
  const variantSelectId = (0, import_react17.useMemo)(() => `variant-select-${product.id || "p"}`, [product.id]);
  const handleAdd = () => {
    const variationId = chosen?.squareVariationId || product.squareVariationId || null;
    const key2 = `${product.id}:${variationId || ""}`;
    const inCart = map?.[key2]?.qty || 0;
    if (product.inventoryManaged) {
      const left = (typeof product.inventory === "number" ? product.inventory : Infinity) - inCart;
      if (left <= 0) return;
    }
    add({ productId: product.id, variationId, unitPrice: price, qty: 1, title: product.title, image: primary });
    notify("Added to cart", { actionLabel: open ? void 0 : "View cart", onAction: open ? void 0 : openCart });
  };
  const key = `${product.id}:${chosen?.squareVariationId || product.squareVariationId || ""}`;
  const inCartQty = map?.[key]?.qty || 0;
  const formatted = (0, import_react17.useMemo)(() => `$${(price / 100).toFixed(2)}`, [price]);
  (0, import_react17.useEffect)(() => {
    if (!showDetails) return;
    prevFocusRef.current = document.activeElement;
    const dlg = dialogRef.current;
    if (closeBtnRef.current) {
      try {
        closeBtnRef.current.focus();
      } catch (e) {
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setShowDetails(false);
        return;
      }
      if (e.key === "Tab" && dlg) {
        const focusable = dlg.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusable).filter((el) => el.offsetParent !== null);
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      const prev = prevFocusRef.current;
      if (prev && prev.focus) {
        try {
          prev.focus();
        } catch (e) {
        }
      }
    };
  }, [showDetails]);
  return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(
    "div",
    {
      className: cn(
        "group relative rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden",
        "transition hover:shadow-md"
      ),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
          "div",
          {
            className: "relative aspect-[4/3] w-full bg-neutral-100 overflow-hidden cursor-pointer",
            role: "button",
            tabIndex: 0,
            onClick: () => setShowDetails(true),
            onKeyDown: (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowDetails(true);
              }
            },
            children: primary ? /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)(import_jsx_runtime26.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                "img",
                {
                  src: primary,
                  alt: product.title,
                  loading: "lazy",
                  className: cn(
                    "absolute inset-0 h-full w-full object-cover",
                    rest[0] ? "transition-opacity duration-300 opacity-100 group-hover:opacity-0" : ""
                  )
                }
              ),
              rest[0] ? /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                "img",
                {
                  src: rest[0],
                  alt: "",
                  "aria-hidden": "true",
                  loading: "lazy",
                  className: "absolute inset-0 h-full w-full object-cover transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                }
              ) : null,
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                "div",
                {
                  className: cn(
                    "pointer-events-none absolute inset-x-0 bottom-0 transition-opacity duration-200",
                    "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                  ),
                  children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "pointer-events-none bg-gradient-to-t from-black/70 to-transparent text-white p-3", children: product.shortDescription ? /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("p", { className: "text-xs leading-snug line-clamp-2", children: product.shortDescription }) : null })
                }
              )
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "w-full h-full grid place-items-center text-neutral-400", children: "No image" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "p-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "flex items-baseline justify-between gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("h3", { className: "text-base font-semibold leading-tight line-clamp-2", children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
              "button",
              {
                type: "button",
                className: "text-left w-full cursor-pointer hover:underline focus:outline-none",
                onClick: () => setShowDetails(true),
                children: product.title
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "text-sm font-mono", children: [
              product.salePrice && /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("span", { className: "text-neutral-400 line-through mr-1", children: [
                "$",
                (product.price / 100).toFixed(2)
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { className: "text-rose-600 font-bold", children: formatted })
            ] })
          ] }),
          product.shortDescription && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("p", { className: "text-sm text-neutral-600 mt-1 line-clamp-2", children: product.shortDescription }),
          /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "mt-3 flex gap-2 items-center", children: [
            hasVariants && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
              "select",
              {
                className: "input",
                value: variantIdx,
                onChange: (e) => setVariantIdx(Number(e.target.value) || 0),
                "aria-label": "Choose a variant",
                children: product.variants.map((v, i) => /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("option", { value: i, children: v.name || `Option ${i + 1}` }, v.squareVariationId || v.name || i))
              }
            ),
            inCartQty > 0 && /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "inline-flex items-center gap-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("button", { className: "btn", onClick: () => updateQty(key, Math.max(0, inCartQty - 1)), "aria-label": "Decrease quantity", children: "-" }),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { className: "min-w-[2ch] text-center text-sm", children: inCartQty }),
              /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("button", { className: "btn", onClick: () => updateQty(key, inCartQty + 1), "aria-label": "Increase quantity", children: "+" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
              "button",
              {
                className: "btn btn-primary",
                onClick: handleAdd,
                disabled: product.inventoryManaged && (product.inventory ?? 0) <= inCartQty,
                "aria-disabled": product.inventoryManaged && (product.inventory ?? 0) <= inCartQty,
                title: product.inventoryManaged && (product.inventory ?? 0) <= inCartQty ? "Out of stock" : "Add to cart",
                children: product.inventoryManaged && (product.inventory ?? 0) <= inCartQty ? "Out of stock" : inCartQty > 0 ? "Add one more" : "Add to cart"
              }
            )
          ] })
        ] }),
        showDetails && /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "fixed inset-0 z-[60]", "aria-hidden": !showDetails, children: [
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "absolute inset-0 bg-black/50", onClick: () => setShowDetails(false) }),
          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
            "div",
            {
              className: "absolute inset-x-3 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-10 bottom-10 md:top-1/2 md:-translate-y-1/2 md:bottom-auto w-auto md:w-[720px] max-w-[95vw]",
              role: "dialog",
              "aria-modal": "true",
              "aria-labelledby": `product-dialog-title-${product.id}`,
              ref: dialogRef,
              children: /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "bg-white rounded-xl shadow-2xl border overflow-hidden flex flex-col h-full md:h-auto", children: [
                /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "flex items-start justify-between p-4 border-b", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("h3", { id: `product-dialog-title-${product.id}`, className: "text-lg font-semibold", children: product.title }),
                  /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("button", { ref: closeBtnRef, className: "btn", onClick: () => setShowDetails(false), "aria-label": "Close", children: "\u2715" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4 p-4 overflow-auto", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { children: [
                    primary ? /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("img", { src: primary, alt: product.title, className: "w-full h-56 md:h-72 object-cover rounded" }) : /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "w-full h-56 md:h-72 grid place-items-center text-neutral-400 bg-neutral-100 rounded", children: "No image" }),
                    rest.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "mt-2 grid grid-cols-4 gap-2", children: [primary, ...rest].slice(0, 8).map((u, i) => /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "block", children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("img", { src: u, alt: "", className: "w-full h-16 object-cover rounded" }) }, i)) })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "text-xl font-semibold", children: formatted }),
                    hasVariants && /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "mt-3", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("label", { className: "block text-sm font-medium mb-1", htmlFor: variantSelectId, children: "Choose an option" }),
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                        "select",
                        {
                          className: "input w-full",
                          id: variantSelectId,
                          value: variantIdx,
                          onChange: (e) => setVariantIdx(Number(e.target.value) || 0),
                          children: product.variants.map((v, i) => /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("option", { value: i, children: v.name || `Option ${i + 1}` }, v.squareVariationId || v.name || i))
                        }
                      )
                    ] }),
                    hasAddOns && /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "mt-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("h4", { className: "text-sm font-semibold mb-2", children: "Customize Your Order" }),
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "space-y-2", children: product.addOns.map((addon, idx) => /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("label", { className: "flex items-center justify-between gap-2 text-sm cursor-pointer hover:bg-white p-2 rounded transition", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "flex items-center gap-2", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                            "input",
                            {
                              type: "checkbox",
                              checked: selectedAddOns[idx] || false,
                              onChange: (e) => setSelectedAddOns((prev) => ({ ...prev, [idx]: e.target.checked })),
                              className: "rounded border-neutral-300"
                            }
                          ),
                          /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { children: addon.name })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { className: "text-neutral-600 font-mono text-xs", children: addon.additionalCost > 0 ? `+$${(addon.additionalCost / 100).toFixed(2)}` : "Free" })
                      ] }, idx)) })
                    ] }),
                    product.offerDairyFree && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200", children: /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("label", { className: "flex items-center justify-between gap-2 text-sm cursor-pointer", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "flex items-center gap-2", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                          "input",
                          {
                            type: "checkbox",
                            checked: isDairyFree,
                            onChange: (e) => setIsDairyFree(e.target.checked),
                            className: "rounded border-blue-300"
                          }
                        ),
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { className: "font-medium", children: "Dairy-Free Option" })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { className: "text-neutral-600 font-mono text-xs", children: product.dairyFreeCost > 0 ? `+$${(product.dairyFreeCost / 100).toFixed(2)}` : "Same price" })
                    ] }) }),
                    Array.isArray(product.longDescriptionBlocks) && product.longDescriptionBlocks.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "prose prose-sm mt-4 max-w-none", children: /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(import_react18.PortableText, { value: product.longDescriptionBlocks, components: portableTextComponents }) }) : product.longDescription ? /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("p", { className: "text-sm text-neutral-700 mt-4 whitespace-pre-wrap", children: product.longDescription }) : null,
                    /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "mt-6 flex gap-2 items-center", children: [
                      inCartQty > 0 && /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "inline-flex items-center gap-2", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("button", { className: "btn", onClick: () => updateQty(key, Math.max(0, inCartQty - 1)), "aria-label": "Decrease quantity", children: "-" }),
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("span", { className: "min-w-[2ch] text-center text-sm", children: inCartQty }),
                        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("button", { className: "btn", onClick: () => updateQty(key, inCartQty + 1), "aria-label": "Increase quantity", children: "+" })
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
                        "button",
                        {
                          className: "btn btn-primary",
                          onClick: handleAdd,
                          disabled: product.inventoryManaged && (product.inventory ?? 0) <= inCartQty,
                          "aria-disabled": product.inventoryManaged && (product.inventory ?? 0) <= inCartQty,
                          children: product.inventoryManaged && (product.inventory ?? 0) <= inCartQty ? "Out of stock" : inCartQty > 0 ? "Add one more" : "Add to cart"
                        }
                      )
                    ] })
                  ] })
                ] })
              ] })
            }
          )
        ] })
      ]
    }
  );
}

// src/store/components/CheckoutPanel.jsx
var import_react19 = __toESM(require("react"));
var import_jsx_runtime27 = require("react/jsx-runtime");
var import_meta4 = {};
function CheckoutPanel({ store = "sale" }) {
  const { items, subtotal, open, closeCart, clear, remove, updateQty } = useCart();
  const [processing, setProcessing] = (0, import_react19.useState)(false);
  const [error, setError] = (0, import_react19.useState)("");
  const [name, setName] = (0, import_react19.useState)("");
  const [email, setEmail] = (0, import_react19.useState)("");
  const [pickup, setPickup] = (0, import_react19.useState)(true);
  const [phone, setPhone] = (0, import_react19.useState)("");
  const [address, setAddress] = (0, import_react19.useState)({ line1: "", line2: "", city: "", state: "", postal: "" });
  const cardRef = import_react19.default.useRef(null);
  const cardElRef = import_react19.default.useRef(null);
  import_react19.default.useEffect(() => {
    const appId = import_meta4?.env?.VITE_SQUARE_APP_ID || window?.__SQUARE_APP_ID__;
    const locationId = import_meta4?.env?.VITE_SQUARE_LOCATION_ID || window?.__SQUARE_LOCATION_ID__;
    if (!open) return;
    if (!items || items.length === 0) return;
    setError("");
    if (!appId || !locationId) {
      setError("Square not configured");
      return;
    }
    let canceled = false;
    (async () => {
      try {
        if (!document.getElementById("sq-wpsdk")) {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.id = "sq-wpsdk";
            s.src = "https://web.squarecdn.com/v1/square.js";
            s.onload = resolve;
            s.onerror = () => reject(new Error("Square SDK failed"));
            document.head.appendChild(s);
          });
        }
        if (canceled) return;
        const ensureSquare = () => new Promise((resolve, reject) => {
          let tries = 0;
          const t = setInterval(() => {
            tries++;
            if (window.Square && typeof window.Square.payments === "function") {
              clearInterval(t);
              resolve();
            } else if (tries > 50) {
              clearInterval(t);
              reject(new Error("Square SDK not ready"));
            }
          }, 100);
        });
        await ensureSquare();
        const p = window.Square ? window.Square.payments(appId, locationId) : null;
        if (!p) throw new Error("Square payments unavailable");
        if (cardRef.current && typeof cardRef.current.destroy === "function") {
          try {
            cardRef.current.destroy();
          } catch (e) {
          }
          cardRef.current = null;
        }
        const card = await p.card();
        cardRef.current = card;
        if (cardElRef.current) {
          await card.attach("#sq-card");
        }
      } catch (e) {
        setError(e?.message ? `Payment form failed: ${e.message}` : "Payment form failed to load");
      }
    })();
    return () => {
      canceled = true;
    };
  }, [open, items]);
  import_react19.default.useEffect(() => {
    if (!open && cardRef.current && typeof cardRef.current.destroy === "function") {
      try {
        cardRef.current.destroy();
      } catch (e) {
      }
      cardRef.current = null;
    }
  }, [open]);
  const onSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError("");
    try {
      let token = null;
      if (cardRef.current) {
        const result = await cardRef.current.tokenize();
        if (result.status !== "OK") {
          const msg = result?.errors && result.errors[0]?.message || result?.status || "Card details invalid";
          throw new Error(msg);
        }
        token = result.token;
      }
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name, email, phone },
          pickup,
          address: pickup ? null : address,
          items: items.map((i) => ({ productId: i.productId, variationId: i.variationId, qty: i.qty, unitPrice: i.unitPrice, title: i.title })),
          token,
          store
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      clear();
      closeCart();
      alert("Order placed!");
    } catch (e2) {
      setError(e2.message || "Checkout failed");
    } finally {
      setProcessing(false);
    }
  };
  if (!open) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("div", { className: "fixed inset-0 bg-black/40 z-50", children: /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl p-4 overflow-auto", children: [
    /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "flex items-center justify-between mb-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("h3", { className: "text-xl font-semibold", children: "Your Cart" }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("button", { className: "btn", onClick: closeCart, children: "Close" })
    ] }),
    items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("p", { className: "text-sm text-neutral-600", children: "Your cart is empty." }) : /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)(import_jsx_runtime27.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("ul", { className: "divide-y", children: items.map((i) => /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("li", { className: "py-2 flex items-center gap-3", children: [
        i.image && /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("img", { src: i.image, alt: "", className: "w-12 h-12 object-cover rounded" }),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "flex-1", children: [
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("div", { className: "font-medium text-sm", children: i.title }),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "text-xs text-neutral-600", children: [
            "$",
            (i.unitPrice / 100).toFixed(2),
            " each"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "flex items-center gap-2 mt-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
              "button",
              {
                type: "button",
                onClick: () => updateQty(i.key, Math.max(0, i.qty - 1)),
                className: "h-7 w-7 rounded-full border border-neutral-300 text-sm font-semibold text-neutral-600 hover:border-neutral-400 hover:text-neutral-900",
                "aria-label": "Decrease quantity",
                children: "\u2212"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("span", { className: "min-w-[2rem] text-center text-sm font-semibold", children: i.qty }),
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
              "button",
              {
                type: "button",
                onClick: () => updateQty(i.key, i.qty + 1),
                className: "h-7 w-7 rounded-full border border-neutral-300 text-sm font-semibold text-neutral-600 hover:border-neutral-400 hover:text-neutral-900",
                "aria-label": "Increase quantity",
                children: "+"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
              "button",
              {
                type: "button",
                onClick: () => remove(i.key),
                className: "ml-auto text-xs text-red-600 hover:text-red-800 underline",
                "aria-label": "Remove item",
                children: "Remove"
              }
            )
          ] })
        ] })
      ] }, i.key)) }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "mt-4 border-t pt-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "flex justify-between items-center text-sm mb-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("span", { children: "Subtotal" }),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("span", { children: [
            "$",
            (subtotal / 100).toFixed(2)
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
          "button",
          {
            type: "button",
            onClick: () => {
              if (window.confirm("Are you sure you want to clear your cart?")) {
                clear();
              }
            },
            className: "text-xs text-red-600 hover:text-red-800 underline",
            children: "Clear cart"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("p", { className: "text-xs text-neutral-500 mt-1", children: "Tax calculated by Square." })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("form", { onSubmit, className: "mt-4 space-y-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("label", { className: "label", htmlFor: "co-name", children: "Name" }),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("input", { id: "co-name", className: "input w-full", value: name, onChange: (e) => setName(e.target.value), required: true })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("label", { className: "label", htmlFor: "co-email", children: "Email" }),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("input", { id: "co-email", type: "email", className: "input w-full", value: email, onChange: (e) => setEmail(e.target.value), required: true })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("label", { className: "label", htmlFor: "co-phone", children: "Phone" }),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("input", { id: "co-phone", type: "tel", className: "input w-full", value: phone, onChange: (e) => setPhone(e.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("input", { id: "pickup", type: "checkbox", checked: pickup, onChange: (e) => setPickup(e.target.checked) }),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("label", { htmlFor: "pickup", children: "Pickup / local service" })
        ] }),
        !pickup && /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "grid grid-cols-1 gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("label", { className: "label", htmlFor: "addr1", children: "Address line 1" }),
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("input", { id: "addr1", className: "input w-full", value: address.line1, onChange: (e) => setAddress({ ...address, line1: e.target.value }), required: true })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("label", { className: "label", htmlFor: "addr2", children: "Address line 2 (optional)" }),
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("input", { id: "addr2", className: "input w-full", value: address.line2, onChange: (e) => setAddress({ ...address, line2: e.target.value }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("label", { className: "label", htmlFor: "city", children: "City" }),
              /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("input", { id: "city", className: "input w-full", value: address.city, onChange: (e) => setAddress({ ...address, city: e.target.value }), required: true })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("label", { className: "label", htmlFor: "state", children: "State" }),
              /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("input", { id: "state", className: "input w-full", value: address.state, onChange: (e) => setAddress({ ...address, state: e.target.value }), required: true })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("label", { className: "label", htmlFor: "zip", children: "Postal code" }),
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("input", { id: "zip", className: "input w-full", value: address.postal, onChange: (e) => setAddress({ ...address, postal: e.target.value }), required: true })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("div", { className: "rounded-md border p-3 text-sm text-neutral-600", children: /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("div", { id: "sq-card", ref: cardElRef, className: "min-h-[52px]" }) }),
        error && /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("div", { className: "text-sm text-red-600", children: error }),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("button", { type: "submit", className: "btn btn-primary w-full", disabled: processing, children: processing ? "Processing\u2026" : "Checkout" })
      ] })
    ] })
  ] }) });
}

// src/pages/SalePage.jsx
var import_react22 = require("@portabletext/react");

// src/components/sale/DraggableMasonry.jsx
var import_react20 = __toESM(require("react"));
var import_framer_motion4 = require("framer-motion");
var import_jsx_runtime28 = require("react/jsx-runtime");
var DraggableMasonry = ({ images = [] }) => {
  const [imageOrder, setImageOrder] = (0, import_react20.useState)([]);
  const [positions, setPositions] = (0, import_react20.useState)({});
  const [rotations, setRotations] = (0, import_react20.useState)({});
  const containerRef = (0, import_react20.useRef)(null);
  const [isDragging, setIsDragging] = (0, import_react20.useState)(null);
  const [lightboxImage, setLightboxImage] = (0, import_react20.useState)(null);
  const dragStartTime = (0, import_react20.useRef)(0);
  const dragStartPos = (0, import_react20.useRef)({ x: 0, y: 0 });
  (0, import_react20.useEffect)(() => {
    if (images.length > 0 && imageOrder.length === 0) {
      setImageOrder(images.map((img) => img.id));
      const rots = {};
      images.forEach((img) => {
        rots[img.id] = (Math.random() - 0.5) * 3;
      });
      setRotations(rots);
    }
  }, [images, imageOrder.length]);
  (0, import_react20.useEffect)(() => {
    if (imageOrder.length === 0) return;
    const calculatePositions = () => {
      const newPositions = {};
      const columns = 3;
      const columnHeights = new Array(columns).fill(0);
      const baseGap = 16;
      const columnWidth = 310;
      imageOrder.forEach((imgId) => {
        const img = images.find((i) => i.id === imgId);
        if (!img) return;
        const shortestCol = columnHeights.indexOf(Math.min(...columnHeights));
        const randomOffset = {
          x: (Math.random() - 0.5) * 20,
          y: (Math.random() - 0.5) * 10
        };
        const x = shortestCol * columnWidth + randomOffset.x;
        const y = columnHeights[shortestCol] + baseGap + randomOffset.y;
        newPositions[imgId] = { x, y, column: shortestCol };
        columnHeights[shortestCol] += (img.height || 380) + baseGap;
      });
      setPositions(newPositions);
    };
    calculatePositions();
  }, [imageOrder, images]);
  const handleDragStart = (id) => {
    setIsDragging(id);
    dragStartTime.current = Date.now();
    dragStartPos.current = positions[id] || { x: 0, y: 0 };
  };
  const handleDragEnd = (id, event, info) => {
    const dragDuration = Date.now() - dragStartTime.current;
    const dragDistance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
    if (dragDuration < 300 && dragDistance < 10) {
      const img = images.find((i) => i.id === id);
      if (img) {
        setLightboxImage(img);
        setIsDragging(null);
        return;
      }
    }
    setIsDragging(null);
    const currentPos = positions[id];
    if (!currentPos) return;
    const newX = currentPos.x + info.offset.x;
    const newY = currentPos.y + info.offset.y;
    const columnWidth = 310;
    const targetColumn = Math.max(0, Math.min(2, Math.round(newX / columnWidth)));
    const columnImages = [[], [], []];
    imageOrder.forEach((imgId) => {
      if (imgId === id) return;
      const pos = positions[imgId];
      if (pos) {
        columnImages[pos.column].push({
          id: imgId,
          y: pos.y,
          height: images.find((i) => i.id === imgId)?.height || 380
        });
      }
    });
    columnImages.forEach((col) => col.sort((a, b) => a.y - b.y));
    const targetColumnImages = columnImages[targetColumn];
    let insertIndex = targetColumnImages.length;
    for (let i = 0; i < targetColumnImages.length; i++) {
      if (newY < targetColumnImages[i].y) {
        insertIndex = i;
        break;
      }
    }
    const newOrder = [];
    const columnsToProcess = [[], [], []];
    imageOrder.forEach((imgId) => {
      if (imgId === id) return;
      const pos = positions[imgId];
      if (pos) {
        columnsToProcess[pos.column].push(imgId);
      }
    });
    columnsToProcess[targetColumn].splice(insertIndex, 0, id);
    const maxLength = Math.max(...columnsToProcess.map((col) => col.length));
    for (let i = 0; i < maxLength; i++) {
      columnsToProcess.forEach((col) => {
        if (col[i]) newOrder.push(col[i]);
      });
    }
    setImageOrder(newOrder);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)(import_jsx_runtime28.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
      "div",
      {
        ref: containerRef,
        className: "relative w-full",
        style: { minHeight: "1000px" },
        children: images.map((img, idx) => {
          const pos = positions[img.id] || { x: 0, y: 0, column: 0 };
          const rotation = rotations[img.id] || 0;
          const isBeingDragged = isDragging === img.id;
          return /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
            import_framer_motion4.motion.div,
            {
              drag: true,
              dragMomentum: false,
              dragElastic: 0.05,
              onDragStart: () => handleDragStart(img.id),
              onDragEnd: (e, info) => handleDragEnd(img.id, e, info),
              style: {
                position: "absolute",
                width: img.width || 300,
                cursor: isBeingDragged ? "grabbing" : "grab",
                zIndex: isBeingDragged ? 5 : 1
              },
              animate: {
                x: pos.x,
                y: pos.y,
                rotate: rotation,
                opacity: 1,
                scale: 1
              },
              whileHover: {
                scale: 1.08,
                rotate: rotation + (Math.random() - 0.5) * 2,
                zIndex: 3,
                transition: { type: "spring", stiffness: 400, damping: 25 }
              },
              whileDrag: {
                scale: 1.12,
                rotate: rotation + (Math.random() - 0.5) * 3,
                zIndex: 5,
                transition: { type: "spring", stiffness: 400, damping: 25 }
              },
              initial: {
                opacity: 0,
                scale: 0.7,
                x: pos.x,
                y: pos.y,
                rotate: rotation - 10
              },
              transition: {
                type: "spring",
                stiffness: 260,
                damping: 26,
                delay: idx * 0.04
              },
              className: "shadow-xl hover:shadow-2xl transition-shadow duration-300",
              children: /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("div", { className: "relative bg-white p-3 pb-8 rounded-sm", children: [
                /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
                  "img",
                  {
                    src: img.url,
                    alt: `Pie gallery ${idx + 1}`,
                    className: "w-full h-auto select-none pointer-events-none",
                    draggable: false,
                    loading: "lazy"
                  }
                ),
                idx % 2 === 0 ? /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
                  "div",
                  {
                    className: "absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-6 bg-amber-200/80 shadow-md",
                    style: {
                      transform: `translateX(-50%) rotate(${(Math.random() - 0.5) * 6}deg)`,
                      backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,.1) 2px, rgba(255,255,255,.1) 4px)"
                    }
                  }
                ) : idx % 3 === 0 ? /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)(import_jsx_runtime28.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("div", { className: "absolute -top-1.5 -left-1.5 w-10 h-7 bg-orange-200/70 rotate-[-20deg] shadow-sm" }),
                  /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("div", { className: "absolute -top-1.5 -right-1.5 w-10 h-7 bg-amber-200/70 rotate-[20deg] shadow-sm" })
                ] }) : /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
                  "div",
                  {
                    className: "absolute -top-2 right-4 w-14 h-6 bg-yellow-200/80 shadow-md",
                    style: {
                      transform: `rotate(${(Math.random() - 0.5) * 8}deg)`
                    }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
                  "div",
                  {
                    className: "absolute inset-0 pointer-events-none rounded-sm",
                    style: { boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)" }
                  }
                )
              ] })
            },
            img.id
          );
        })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(import_framer_motion4.AnimatePresence, { children: lightboxImage && /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
      import_framer_motion4.motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        onClick: () => setLightboxImage(null),
        className: "fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out",
        children: /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)(
          import_framer_motion4.motion.div,
          {
            initial: { scale: 0.8, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0.8, opacity: 0 },
            className: "relative max-w-6xl max-h-[90vh]",
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
                "img",
                {
                  src: lightboxImage.url,
                  alt: "Enlarged view",
                  className: "w-full h-full object-contain rounded-lg shadow-2xl"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
                "button",
                {
                  onClick: () => setLightboxImage(null),
                  className: "absolute -top-4 -right-4 w-12 h-12 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-800 text-3xl font-light transition-colors shadow-lg",
                  "aria-label": "Close",
                  children: "\xD7"
                }
              )
            ]
          }
        )
      }
    ) })
  ] });
};
var DraggableMasonry_default = DraggableMasonry;

// src/pages/SalePage.jsx
var import_jsx_runtime29 = require("react/jsx-runtime");
var SalePage = () => {
  const { totalQty, openCart } = useCart();
  const [products, setProducts] = (0, import_react21.useState)([]);
  const [loading, setLoading] = (0, import_react21.useState)(true);
  const [saleIntro, setSaleIntro] = (0, import_react21.useState)({ title: "", titleIcon: null, subheading: "", intro: [] });
  const [galleryImages, setGalleryImages] = (0, import_react21.useState)([]);
  const [lightboxImage, setLightboxImage] = (0, import_react21.useState)(null);
  (0, import_react21.useEffect)(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/store/products?store=sale");
        const data = res.ok ? await res.json() : { products: [] };
        if (!alive) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
      } catch (e) {
        if (!alive) return;
        setProducts([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    (async () => {
      try {
        const doc = await sanityClient_default.fetch('*[_type == "salePage"][0]{ title, titleIcon, subheading, intro }').catch(() => null);
        if (!alive) return;
        if (doc) setSaleIntro({
          title: doc.title || "",
          titleIcon: doc.titleIcon || null,
          subheading: doc.subheading || "",
          intro: Array.isArray(doc.intro) ? doc.intro : []
        });
      } catch (_) {
      }
    })();
    (async () => {
      try {
        const images = [];
        try {
          const cloudinaryRes = await fetch("/api/search-images?query=pie&per_page=50", {
            headers: { Accept: "application/json" }
          });
          if (cloudinaryRes.ok) {
            const cloudinaryData = await cloudinaryRes.json();
            if (Array.isArray(cloudinaryData.images)) {
              images.push(...cloudinaryData.images.map((img) => ({
                id: img.asset_id || img.public_id,
                url: img.thumbnail_url || img.large_url,
                width: img.width ? Math.min(img.width, 320) : 300,
                height: img.height ? Math.round(Math.min(img.width, 320) / img.width * img.height) : 380
              })));
            }
          }
        } catch (e) {
          console.error("Cloudinary fetch failed:", e);
        }
        const localImages = [
          "2f4a4f32-21ae-47fc-bcf1-f4e2439294bc_3000.jpg",
          "819af5c9-a882-4a4d-a1f1-357762a78ebd_3000.jpg",
          "927eec02-f5a6-4501-8a83-edd2af06f973_3000.jpg",
          "a847c096-4191-454a-82a2-35e6fd246b2a_2645.jpg",
          "DP-14936-049.jpg",
          "DP-15526-010.jpg",
          "DP-30169-001.jpg",
          "DP800004.jpg",
          "DP823463.jpg",
          "DP885938.jpg",
          "DPB874625.jpg",
          "DT1939.jpg",
          "DT4854.jpg"
        ];
        localImages.forEach((filename, idx) => {
          images.push({
            id: `local-${idx}`,
            url: `/images/${filename}`,
            width: 300,
            height: 380
          });
        });
        for (let i = images.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [images[i], images[j]] = [images[j], images[i]];
        }
        if (!alive) return;
        setGalleryImages(images);
      } catch (e) {
        console.error("Error fetching gallery images:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const schema = (0, import_react21.useMemo)(() => {
    const items = (products || []).map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Product",
        name: p.title,
        image: Array.isArray(p.images) ? p.images.filter(Boolean) : p.images ? [p.images] : [],
        description: p.shortDescription,
        sku: p.squareVariationId || p.squareItemId || p.id,
        offers: {
          "@type": "Offer",
          priceCurrency: "USD",
          price: (p.salePrice ?? p.price) / 100,
          availability: "https://schema.org/InStock"
        }
      }
    }));
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Sale",
      itemListElement: items
    };
  }, [products]);
  return /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("div", { className: "relative min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50", children: [
    /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)(import_react_helmet_async3.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("title", { children: "SALE | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("meta", { name: "description", content: "Shop Local Effort sale items. Pickup/local service with on-site checkout." }),
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("link", { rel: "canonical", href: "https://localeffortfood.com/sale" }),
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("script", { type: "application/ld+json", children: JSON.stringify(schema) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(
      "div",
      {
        className: "absolute inset-0 opacity-30",
        style: {
          backgroundImage: "radial-gradient(circle, rgba(251, 146, 60, 0.15) 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("div", { className: "relative mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8", children: [
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "mb-8", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)(
        import_framer_motion5.motion.div,
        {
          initial: { opacity: 0, y: -20 },
          animate: { opacity: 1, y: 0 },
          className: "relative inline-block",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "bg-white/90 backdrop-blur-md px-8 py-6 rounded-2xl shadow-xl border-2 border-orange-200/50", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-6", children: [
              /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("div", { className: "flex-1", children: [
                saleIntro.title && /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("h1", { className: "text-4xl md:text-5xl font-bold text-neutral-900 mb-2 tracking-tight flex items-center gap-3", children: [
                  saleIntro.titleIcon && /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("span", { className: "text-5xl md:text-6xl", role: "img", "aria-label": "icon", children: saleIntro.titleIcon.provider === "emoji" ? saleIntro.titleIcon.name : saleIntro.titleIcon.name || "\u2728" }),
                  /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("span", { children: saleIntro.title })
                ] }),
                saleIntro.subheading && /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("h2", { className: "text-xl md:text-2xl font-semibold text-neutral-700 mb-2", children: saleIntro.subheading }),
                Array.isArray(saleIntro.intro) && saleIntro.intro.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "prose prose-neutral max-w-none mt-3", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(import_react22.PortableText, { value: saleIntro.intro, components: portableTextComponents }) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "flex-shrink-0", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)(
                "button",
                {
                  onClick: openCart,
                  className: "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 whitespace-nowrap text-lg",
                  children: [
                    "Cart (",
                    totalQty,
                    ")"
                  ]
                }
              ) })
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "absolute -top-2 -right-2 w-16 h-10 bg-amber-100/80 rotate-12 shadow-md rounded-sm" }),
            /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "absolute -bottom-2 -left-2 w-16 h-10 bg-orange-100/80 -rotate-12 shadow-md rounded-sm" })
          ]
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)(
        import_framer_motion5.motion.div,
        {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { delay: 0.5 },
          className: "hidden lg:flex items-center gap-2 mb-4 text-sm text-neutral-600",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("span", { className: "text-2xl", children: "\u{1F446}" }),
            /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("span", { className: "font-medium", children: "drag the photos around to create your own layout" })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12", children: [
        /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "hidden lg:block lg:col-span-7 relative z-0", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "relative", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(DraggableMasonry_default, { images: galleryImages }) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "lg:col-span-5 relative z-10", children: loading ? /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border-2 border-orange-200/50", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "animate-pulse text-neutral-600", children: "Loading delicious pies..." }) }) }) : /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "space-y-6", children: (products || []).map((p, idx) => /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)(
          import_framer_motion5.motion.div,
          {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: idx * 0.1 },
            whileHover: { scale: 1.02 },
            className: "group relative",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-300" }),
              /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "relative bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border-2 border-orange-200/50 overflow-hidden transition-all duration-300 group-hover:shadow-2xl", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(ProductCard, { product: p }) }),
              idx % 3 === 0 && /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "absolute -top-1 -right-1 w-12 h-8 bg-amber-100/70 rotate-12 shadow-sm pointer-events-none" })
            ]
          },
          p.id
        )) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "lg:hidden", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)(
          import_framer_motion5.motion.div,
          {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { delay: 0.3 },
            className: "mt-8",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("h2", { className: "text-2xl font-bold text-neutral-900 mb-4 text-center", children: "gallery \u{1F4F8}" }),
              /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("p", { className: "text-xs text-neutral-500 text-center mb-4", children: "for best experience, view on a monitor" }),
              /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "columns-2 gap-4 space-y-4", children: galleryImages.map((img, i) => /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(
                import_framer_motion5.motion.div,
                {
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 },
                  transition: { delay: 0.3 + i * 0.05 },
                  className: "break-inside-avoid mb-4 rounded-lg overflow-hidden shadow-md bg-white p-2 cursor-pointer active:scale-95 transition-transform",
                  onClick: () => setLightboxImage(img),
                  children: /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(
                    "img",
                    {
                      src: img.url,
                      alt: `Pie ${i + 1}`,
                      className: "w-full h-auto object-cover rounded",
                      loading: "lazy"
                    }
                  )
                },
                img.id
              )) })
            ]
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(import_framer_motion5.AnimatePresence, { children: lightboxImage && /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(
      import_framer_motion5.motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        onClick: () => setLightboxImage(null),
        className: "fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out",
        children: /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)(
          import_framer_motion5.motion.div,
          {
            initial: { scale: 0.8, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0.8, opacity: 0 },
            className: "relative max-w-6xl max-h-[90vh]",
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(
                "img",
                {
                  src: lightboxImage.url,
                  alt: "Enlarged view",
                  className: "w-full h-full object-contain rounded-lg shadow-2xl"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(
                "button",
                {
                  onClick: () => setLightboxImage(null),
                  className: "absolute -top-4 -right-4 w-12 h-12 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-800 text-3xl font-light transition-colors shadow-lg",
                  "aria-label": "Close",
                  children: "\xD7"
                }
              )
            ]
          }
        )
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(CheckoutPanel, {})
  ] });
};
var SalePage_default = SalePage;

// src/pages/WeeklyList.jsx
var import_react23 = __toESM(require("react"));
var import_react_helmet_async4 = __toESM(require_lib());
var import_react_router_dom5 = require("react-router-dom");
var import_jsx_runtime30 = require("react/jsx-runtime");
var WeeklyList = () => {
  const [posts, setPosts] = (0, import_react23.useState)([]);
  const [error, setError] = (0, import_react23.useState)("");
  (0, import_react23.useEffect)(() => {
    let mounted = true;
    (async () => {
      try {
        const q = `*[_type == "blogPost"] | order(publishedAt desc)[0...50]{ title, "slug": slug.current, excerpt, publishedAt, mainImage }`;
        const items = await sanityClient_default.fetch(q);
        if (mounted) setPosts(items || []);
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to load posts");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)("div", { className: "mx-auto max-w-3xl px-4 md:px-6 lg:px-8 py-10", children: [
    /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_react_helmet_async4.Helmet, { children: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("title", { children: "Weekly Meal Prep Journal | Local Effort" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("h1", { className: "heading-xl heading-balance mb-6", children: "Weekly meal prep journal" }),
    error && /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("div", { className: "text-red-700 bg-red-50 border border-red-200 p-3 rounded mb-4", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)("ul", { className: "space-y-4", children: [
      posts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)("li", { className: "border rounded-lg p-4 hover:bg-gray-50 shadow-sm", children: [
        /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_react_router_dom5.Link, { to: `/weekly/${p.slug}`, className: "text-xl font-semibold hover:underline", children: p.title }),
        /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("div", { className: "text-sm text-gray-500 mt-1", children: p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "" }),
        p.excerpt && /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("p", { className: "text-gray-700 mt-2", children: p.excerpt })
      ] }, p.slug)),
      !posts.length && !error && /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("li", { children: "No posts yet." })
    ] })
  ] });
};
var WeeklyList_default = WeeklyList;

// src/pages/happymondaypage.jsx
var import_react30 = __toESM(require("react"));
var import_react_helmet_async5 = __toESM(require_lib());
var import_framer_motion10 = require("framer-motion");

// src/components/menu/FoodItemCard.jsx
var import_react24 = __toESM(require("react"));
var import_framer_motion6 = require("framer-motion");
var import_jsx_runtime31 = require("react/jsx-runtime");
var FoodItemCard = ({ item, onClick }) => {
  return /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)(
    import_framer_motion6.motion.div,
    {
      variants: fadeInUp,
      onClick,
      className: "border border-neutral-200 rounded-lg p-6 cursor-pointer hover:shadow-lg hover:border-neutral-400 transition-all duration-300 bg-white",
      whileHover: { scale: 1.03 },
      whileTap: { scale: 0.98 },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("h4", { className: "text-xl font-bold text-neutral-800", children: item.name }),
        /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { className: "text-neutral-600 mt-2 line-clamp-2", children: item.description })
      ]
    }
  );
};
var FoodItemCard_default = FoodItemCard;

// src/components/ErrorBoundary.jsx
var import_react25 = __toESM(require("react"));
var import_jsx_runtime32 = require("react/jsx-runtime");
var ErrorBoundary = class extends import_react25.default.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught", error, info);
    this.setState({ info });
  }
  render() {
    const { error, info } = this.state;
    if (error) {
      return /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { style: { padding: 24, fontFamily: "system-ui, Arial", color: "#111" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("h1", { children: "Application error" }),
        /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("p", { style: { whiteSpace: "pre-wrap" }, children: String(error && (error.message || error)) }),
        info && info.componentStack && /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("details", { style: { marginTop: 12, whiteSpace: "pre-wrap" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("summary", { children: "Component stack" }),
          /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { children: info.componentStack })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { style: { marginTop: 12 }, children: /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("button", { onClick: () => window.location.reload(), children: "Reload" }) })
      ] });
    }
    return this.props.children;
  }
};
var ErrorBoundary_default = ErrorBoundary;

// src/components/ui/Separator.jsx
var import_react26 = __toESM(require("react"));
var import_jsx_runtime33 = require("react/jsx-runtime");
function Separator({ className = "", orientation = "horizontal", decorative = true, ...props }) {
  const isHorizontal = orientation !== "vertical";
  const base = isHorizontal ? "h-px w-full my-12" : "w-px h-full mx-4";
  const classes = [base, "bg-neutral-200", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ (0, import_jsx_runtime33.jsx)("div", { role: decorative ? "none" : "separator", "aria-orientation": orientation, className: classes, ...props });
}

// src/pages/happymondaypage.jsx
var import_jsx_runtime37 = require("react/jsx-runtime");
var BlockContent = (0, import_react30.lazy)(() => import("@sanity/block-content-to-react"));
var FoodItemModal2 = (0, import_react30.lazy)(() => Promise.resolve().then(() => (init_FoodItemModal(), FoodItemModal_exports)));
var FeedbackForm2 = (0, import_react30.lazy)(() => Promise.resolve().then(() => (init_FeedbackForm(), FeedbackForm_exports)));
var LoadingSpinner2 = (0, import_react30.lazy)(() => Promise.resolve().then(() => (init_LoadingSpinner(), LoadingSpinner_exports)).then((mod) => ({ default: mod.LoadingSpinner })));
var HappyMondayPage = () => {
  const [menuItems, setMenuItems] = (0, import_react30.useState)([]);
  const [pageContent, setPageContent] = (0, import_react30.useState)(null);
  const [selectedItem, setSelectedItem] = (0, import_react30.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react30.useState)(true);
  (0, import_react30.useEffect)(() => {
    const query = `{
      "menuItems": *[_type == "menuItems"],
      "pageContent": *[_type == "happyMondayPage"][0]
    }`;
    sanityClient_default.fetch(query).then((data) => {
      setMenuItems(data.menuItems || []);
      setPageContent(data.pageContent);
      setIsLoading(false);
    }).catch(console.error);
  }, []);
  const handleCardClick = (item) => {
    setSelectedItem(item);
  };
  const handleCloseModal = () => {
    setSelectedItem(null);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime37.jsxs)(import_jsx_runtime37.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime37.jsxs)(import_react_helmet_async5.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("title", { children: "Happy Monday | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(
        "meta",
        {
          name: "description",
          content: "Explore our special Happy Monday menu, made with the finest local ingredients."
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsxs)("div", { className: "space-y-24 mb-24", children: [
      /* @__PURE__ */ (0, import_jsx_runtime37.jsxs)("section", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8", children: [
        pageContent && /* @__PURE__ */ (0, import_jsx_runtime37.jsxs)("div", { className: "text-center mb-12", children: [
          /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(SectionHeader, { overline: "Weekly Special", title: pageContent.title }),
          /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("div", { className: "flex justify-center mt-8 mb-8", children: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(
            "img",
            {
              src: "https://www.localeffortfood.com/gallery/IMG_3145.jpg",
              alt: "Happy Monday",
              className: "max-w-full h-auto rounded-lg shadow-lg",
              style: { width: "50%" }
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("div", { className: "prose lg:prose-lg mx-auto max-w-3xl", children: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(ErrorBoundary_default, { children: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(import_react30.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("div", { className: "text-center", children: "Loading content\u2026" }), children: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(BlockContent, { blocks: pageContent.body, client: sanityClient_default }) }) }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("div", { className: "text-center mb-8", children: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("h2", { className: "text-2xl font-semibold", children: "Ingredient Lists" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(import_react30.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("div", { className: "flex justify-center items-center h-64", children: "Loading\u2026" }), children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("div", { className: "flex justify-center items-center h-64", children: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(LoadingSpinner2, {}) }) : /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(
          import_framer_motion10.motion.div,
          {
            className: "grid md:grid-cols-2 lg:grid-cols-3 gap-6",
            initial: "initial",
            animate: "animate",
            variants: { animate: { transition: { staggerChildren: 0.1 } } },
            children: menuItems.map((item) => /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(FoodItemCard_default, { item, onClick: () => handleCardClick(item) }, item._id))
          }
        ) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime37.jsxs)("section", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8", children: [
        /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(SectionHeader, { overline: "Help Us Improve", title: "Feedback" }),
        /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("p", { className: "text-body mb-8 max-w-2xl", children: "Have a suggestion, a request, or feedback on our quality? We'd love to hear it. Your input helps us grow and improve." }),
        /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(ErrorBoundary_default, { children: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(import_react30.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("div", { className: "text-center p-8", children: "Loading form\u2026" }), children: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(FeedbackForm2, {}) }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(Separator, {})
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(import_framer_motion10.AnimatePresence, { children: selectedItem && /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(ErrorBoundary_default, { children: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(import_react30.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("div", { className: "fixed inset-0 flex items-center justify-center", children: "Loading\u2026" }), children: /* @__PURE__ */ (0, import_jsx_runtime37.jsx)(FoodItemModal2, { item: selectedItem, onClose: handleCloseModal }) }) }) })
  ] });
};
var happymondaypage_default = HappyMondayPage;

// src/pages/PizzaPartyPage.jsx
var import_react32 = __toESM(require("react"));
var import_react_helmet_async6 = __toESM(require_lib());
var import_framer_motion11 = require("framer-motion");

// src/hooks/useSquareCard.js
var import_react31 = require("react");
var import_meta5 = {};
var SQUARE_SCRIPT_ATTR = "data-square-sdk";
var squareScriptState = { url: null, promise: null };
var readSquareRuntimeConfig = () => {
  if (typeof window === "undefined") {
    return {
      appId: null,
      locationId: null,
      sdkUrl: "",
      isSandbox: false,
      environment: "production"
    };
  }
  const runtimeAppId = window.__SQUARE_APP_ID__ || import_meta5?.env?.VITE_SQUARE_APP_ID || window.SQUARE_APPLICATION_ID || "";
  const envHintRaw = (window.__SQUARE_ENV__ ?? import_meta5?.env?.VITE_SQUARE_ENV ?? "").toString().trim().toLowerCase();
  const hostname = window.location?.hostname || "";
  let isSandbox = false;
  if (["sandbox", "dev", "development", "test"].includes(envHintRaw)) {
    isSandbox = true;
  } else if (["production", "prod", "live"].includes(envHintRaw)) {
    isSandbox = false;
  } else if (runtimeAppId.startsWith("sandbox-")) {
    isSandbox = true;
  } else if (/localhost$/i.test(hostname) || hostname === "127.0.0.1") {
    isSandbox = true;
  }
  const sdkUrl = isSandbox ? "https://sandbox.web.squarecdn.com/v1/square.js" : "https://web.squarecdn.com/v1/square.js";
  return {
    appId: runtimeAppId || null,
    locationId: window.__SQUARE_LOCATION_ID__ || import_meta5?.env?.VITE_SQUARE_LOCATION_ID || window.SQUARE_LOCATION_ID || null,
    sdkUrl,
    isSandbox,
    environment: isSandbox ? "sandbox" : "production"
  };
};
var getSquareSecurityState = () => {
  if (typeof window === "undefined") {
    return {
      secureContext: false,
      secureForSquare: false,
      hostname: "",
      protocol: ""
    };
  }
  const { protocol = "", hostname = "" } = window.location || {};
  const normalizedProtocol = protocol.toLowerCase();
  const secureContext = typeof window.isSecureContext === "boolean" ? window.isSecureContext : normalizedProtocol === "https:";
  const secureForSquare = normalizedProtocol === "https:" || hostname === "localhost";
  return {
    secureContext,
    secureForSquare,
    hostname,
    protocol: normalizedProtocol
  };
};
var ensureSquareSdkScript = (sdkUrl, isSandbox) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Square SDK requires a browser environment."));
  }
  if (squareScriptState.promise && squareScriptState.url === sdkUrl) {
    return squareScriptState.promise;
  }
  let script = document.querySelector(`script[${SQUARE_SCRIPT_ATTR}]`);
  if (script && (script.getAttribute("src") || "") !== sdkUrl) {
    script.parentElement?.removeChild(script);
    script = null;
  }
  const promise = new Promise((resolve, reject) => {
    let scriptEl = script;
    const cleanup = () => {
      if (!scriptEl) return;
      scriptEl.removeEventListener("load", handleLoad);
      scriptEl.removeEventListener("error", handleError);
    };
    const handleLoad = () => {
      if (scriptEl) {
        scriptEl.setAttribute("data-square-loaded", "true");
      }
      cleanup();
      resolve();
    };
    const handleError = (event) => {
      cleanup();
      const err = event instanceof Error ? event : new Error("Failed to load Square SDK");
      reject(err);
    };
    if (scriptEl) {
      scriptEl.dataset.squareSdkEnv = isSandbox ? "sandbox" : "production";
      const alreadyLoaded = scriptEl.getAttribute("data-square-loaded") === "true";
      if (alreadyLoaded || window.Square) {
        resolve();
        return;
      }
      scriptEl.addEventListener("load", handleLoad, { once: true });
      scriptEl.addEventListener("error", handleError, { once: true });
    } else {
      scriptEl = document.createElement("script");
      scriptEl.src = sdkUrl;
      scriptEl.async = true;
      scriptEl.dataset.squareSdk = "true";
      scriptEl.dataset.squareSdkEnv = isSandbox ? "sandbox" : "production";
      scriptEl.addEventListener("load", handleLoad, { once: true });
      scriptEl.addEventListener("error", handleError, { once: true });
      document.head.appendChild(scriptEl);
    }
  }).catch((err) => {
    if (squareScriptState.url === sdkUrl) {
      squareScriptState = { url: null, promise: null };
    }
    throw err;
  });
  squareScriptState = { url: sdkUrl, promise };
  return promise;
};
function useSquareCard(containerId, enabled, deps = []) {
  const paymentsRef = (0, import_react31.useRef)(null);
  const cardRef = (0, import_react31.useRef)(null);
  const cardInstanceIdRef = (0, import_react31.useRef)(0);
  const activeCardInstanceIdRef = (0, import_react31.useRef)(0);
  const lastTokenRef = (0, import_react31.useRef)({ token: null, cardInstanceId: 0, at: 0 });
  const [cardLoaded, setCardLoaded] = (0, import_react31.useState)(false);
  const [attempts, setAttempts] = (0, import_react31.useState)(0);
  const attemptsRef = (0, import_react31.useRef)(0);
  const [error, setError] = (0, import_react31.useState)("");
  const [loadingScript, setLoadingScript] = (0, import_react31.useState)(false);
  const attachStartedRef = (0, import_react31.useRef)(false);
  const securityState = getSquareSecurityState();
  const [envInfo, setEnvInfo] = (0, import_react31.useState)({
    appId: null,
    locationId: null,
    sdkUrl: null,
    sandbox: false,
    mismatch: false,
    environment: null,
    attempts: 0,
    secureContext: securityState.secureContext,
    secureForSquare: securityState.secureForSquare,
    hostname: securityState.hostname,
    protocol: securityState.protocol
  });
  const cleanupContainer = (0, import_react31.useCallback)(() => {
    if (typeof document === "undefined") return;
    try {
      const node = typeof containerId === "string" ? document.querySelector(containerId) : containerId;
      if (node && node.childNodes && node.childNodes.length > 0) {
        node.innerHTML = "";
      }
    } catch (_) {
    }
  }, [containerId]);
  const destroyCardInstance = (0, import_react31.useCallback)(() => {
    const card = cardRef.current;
    cardRef.current = null;
    attachStartedRef.current = false;
    activeCardInstanceIdRef.current = 0;
    lastTokenRef.current = { token: null, cardInstanceId: 0, at: 0 };
    const finalize = () => {
      cleanupContainer();
      setCardLoaded(false);
    };
    if (!card) {
      finalize();
      return;
    }
    try {
      const maybePromise = typeof card.destroy === "function" ? card.destroy() : void 0;
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.catch(() => {
        }).finally(finalize);
        return;
      }
    } catch (_) {
    }
    finalize();
  }, [cleanupContainer]);
  const reset = (0, import_react31.useCallback)(() => {
    try {
      destroyCardInstance();
      paymentsRef.current = null;
      setError("");
      setAttempts(0);
      attemptsRef.current = 0;
    } catch (_) {
    }
  }, [destroyCardInstance]);
  (0, import_react31.useEffect)(() => {
    if (!enabled) return;
    let cancelled = false;
    const config = readSquareRuntimeConfig();
    const security = getSquareSecurityState();
    setEnvInfo((info) => ({
      ...info,
      appId: config.appId,
      locationId: config.locationId,
      sdkUrl: config.sdkUrl,
      sandbox: config.isSandbox,
      environment: config.environment,
      mismatch: false,
      secureContext: security.secureContext,
      secureForSquare: security.secureForSquare,
      hostname: security.hostname,
      protocol: security.protocol
    }));
    if (!security.secureForSquare) {
      setLoadingScript(false);
      setError("Payments require HTTPS or running on http://localhost.");
      return;
    }
    setLoadingScript(true);
    ensureSquareSdkScript(config.sdkUrl, config.isSandbox).then(() => {
      if (cancelled) return;
      setLoadingScript(false);
      setError((prev) => prev && prev.toLowerCase().includes("payment script") ? "" : prev);
    }).catch((err) => {
      if (cancelled) return;
      setLoadingScript(false);
      setError((prev) => prev || err?.message || "Failed to load payment script.");
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  (0, import_react31.useEffect)(() => {
    if (!enabled) return;
    const abortController = new AbortController();
    const { signal } = abortController;
    const config = readSquareRuntimeConfig();
    const security = getSquareSecurityState();
    setEnvInfo((info) => ({
      ...info,
      secureContext: security.secureContext,
      secureForSquare: security.secureForSquare,
      hostname: security.hostname,
      protocol: security.protocol
    }));
    if (!security.secureForSquare) {
      setError("Payments require HTTPS or running on http://localhost.");
      return () => abortController.abort();
    }
    if (!config.appId || !config.locationId) {
      setError("Payment not available: missing Square configuration.");
      return () => abortController.abort();
    }
    const waitForSquare = async () => {
      if (window.Square) return;
      const start = Date.now();
      while (!signal.aborted) {
        if (window.Square) return;
        if (Date.now() - start > 2e4) {
          throw new Error("Payment form failed to load (script not ready).");
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      throw new DOMException("Aborted", "AbortError");
    };
    const waitForContainer = () => new Promise((resolve, reject) => {
      let observer;
      let interval;
      let timeout;
      const resolveWith = (node) => {
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        resolve(node);
      };
      const rejectWith = (err) => {
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
        } else {
          reject(err);
        }
      };
      const cleanup = () => {
        if (observer) observer.disconnect();
        if (interval) clearInterval(interval);
        if (timeout) clearTimeout(timeout);
        if (signal) signal.removeEventListener("abort", onAbort);
      };
      const lookup = () => {
        if (signal.aborted) {
          cleanup();
          reject(new DOMException("Aborted", "AbortError"));
          return true;
        }
        const node = typeof containerId === "string" ? document.querySelector(containerId) : containerId;
        if (node) {
          cleanup();
          resolveWith(node);
          return true;
        }
        return false;
      };
      const onAbort = () => {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (lookup()) return;
      const observerRoot = document.body || document.documentElement;
      try {
        observer = new MutationObserver(() => {
          lookup();
        });
        observer.observe(observerRoot, { childList: true, subtree: true });
      } catch (_) {
        observer = void 0;
      }
      interval = setInterval(() => {
        lookup();
      }, 150);
      signal.addEventListener("abort", onAbort, { once: true });
      timeout = setTimeout(() => {
        cleanup();
        rejectWith(new Error("Payment container not found (timed out)."));
      }, 12e4);
    });
    const scheduleRetry = (delay = 800) => {
      if (signal.aborted) return;
      if (attemptsRef.current >= 5) return;
      setTimeout(() => {
        if (!signal.aborted) {
          init();
        }
      }, delay);
    };
    const init = async () => {
      try {
        if (cardRef.current || attachStartedRef.current) return;
        setAttempts((a) => {
          const next = a + 1;
          attemptsRef.current = next;
          return next;
        });
        await ensureSquareSdkScript(config.sdkUrl, config.isSandbox);
        await waitForSquare();
        if (signal.aborted) return;
        if (!window.Square || typeof window.Square.payments !== "function") {
          throw new Error("Square payments API unavailable.");
        }
        const envUpper = typeof config.environment === "string" ? config.environment.toUpperCase() : "";
        const isValidEnv = envUpper === "SANDBOX" || envUpper === "PRODUCTION";
        const payments = isValidEnv ? window.Square.payments(config.appId, config.locationId, { environment: envUpper }) : window.Square.payments(config.appId, config.locationId);
        paymentsRef.current = payments;
        const card = await payments.card();
        const container = await waitForContainer();
        if (signal.aborted) return;
        attachStartedRef.current = true;
        cleanupContainer();
        await card.attach(container);
        if (!signal.aborted) {
          cardRef.current = card;
          cardInstanceIdRef.current += 1;
          activeCardInstanceIdRef.current = cardInstanceIdRef.current;
          setCardLoaded(true);
          setError("");
        }
      } catch (e) {
        if (signal.aborted) return;
        if (false) {
          console.debug("[Square:init:error]", e);
        }
        const msg = e?.message || "Payment initialization failed";
        attachStartedRef.current = false;
        if (msg.includes("secure context")) {
          setError("Payments require HTTPS or running on http://localhost.");
        } else if (msg.includes("Invalid App ID")) {
          setError("Invalid Square App ID.");
        } else if (msg.includes("Unexpected token")) {
          setError("Payment script parse error.");
          scheduleRetry(1500);
        } else if (msg.includes("network")) {
          setError("Network error initializing payment form.");
          scheduleRetry(1200);
        } else if (msg === "Payment container not found (timed out).") {
          scheduleRetry(300);
        } else if (msg === "Payment form failed to load (script not ready).") {
          setError(msg);
          scheduleRetry(500);
        } else if (msg === "Square payments API unavailable.") {
          setError("Square payments API unavailable.");
          scheduleRetry(800);
        } else {
          setError(msg);
          scheduleRetry(1500);
        }
      }
    };
    init();
    return () => {
      abortController.abort();
      destroyCardInstance();
      paymentsRef.current = null;
    };
  }, [enabled, containerId, destroyCardInstance, cleanupContainer, ...deps]);
  (0, import_react31.useEffect)(() => {
    setEnvInfo((info) => ({ ...info, attempts }));
  }, [attempts]);
  const withTimeout = async (promise, ms, message) => {
    let timer;
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      });
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  const tokenize = async () => {
    if (!cardRef.current) throw new Error(error || "Card form not ready");
    const result = await withTimeout(
      cardRef.current.tokenize(),
      2e4,
      "Card verification timed out. Please try again."
    );
    if (result.status !== "OK") {
      const first = result?.errors?.[0];
      const msg = first?.message || first?.code || result.status || "Card details invalid";
      lastTokenRef.current = { token: null, cardInstanceId: 0, at: 0 };
      throw new Error(msg);
    }
    const activeId = activeCardInstanceIdRef.current;
    lastTokenRef.current = { token: result.token, cardInstanceId: activeId, at: Date.now() };
    return result.token;
  };
  const verifyBuyer = async (token, details) => {
    const payments = paymentsRef.current;
    if (!payments || typeof payments.verifyBuyer !== "function") {
      throw new Error("Buyer verification is unavailable. Please try hosted checkout.");
    }
    const activeId = activeCardInstanceIdRef.current;
    const last = lastTokenRef.current;
    if (!token || !last.token || last.token !== token || last.cardInstanceId !== activeId) {
      throw new Error("Card details expired. Please re-enter your card information.");
    }
    try {
      const result = await withTimeout(
        payments.verifyBuyer(token, details),
        2e4,
        "Buyer verification timed out. Please try again."
      );
      const verificationToken = result?.token || result?.verificationToken;
      if (!verificationToken) {
        const first = result?.errors?.[0];
        const msg = first?.message || first?.code || "Buyer verification failed.";
        throw new Error(msg);
      }
      return verificationToken;
    } catch (err) {
      lastTokenRef.current = { token: null, cardInstanceId: 0, at: 0 };
      throw err;
    }
  };
  return { cardLoaded, error, loadingScript, tokenize, verifyBuyer, reset, envInfo };
}

// src/lib/checkoutAttemptId.js
var resolveStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage || null;
  } catch (_) {
    return null;
  }
};
var generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${rand}`;
};
var getOrCreateCheckoutAttemptId = (storageKey) => {
  if (!storageKey) {
    return generateId();
  }
  const storage = resolveStorage();
  if (!storage) {
    return generateId();
  }
  const existing = storage.getItem(storageKey);
  if (existing && existing.trim()) {
    return existing;
  }
  const next = generateId();
  storage.setItem(storageKey, next);
  return next;
};
var clearCheckoutAttemptId = (storageKey) => {
  const storage = resolveStorage();
  if (!storage || !storageKey) return;
  storage.removeItem(storageKey);
};

// src/pages/PizzaPartyPage.jsx
var import_jsx_runtime38 = require("react/jsx-runtime");
var import_meta6 = {};
async function fetchPizzaImages(setter, setError, setLoading) {
  try {
    const res = await fetch("/api/search-images?query=pizza&per_page=8");
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    setter(Array.isArray(data.images) ? data.images : []);
  } catch (e) {
    console.error("Failed to load pizza images", e);
    setError(e.message || "Error loading images");
  } finally {
    setLoading(false);
  }
}
var PIZZA_PARTY_DATES = [
  { label: "Oct 2", isoDate: "2024-10-02" },
  { label: "Oct 3", isoDate: "2024-10-03" },
  { label: "Oct 4", isoDate: "2024-10-04" },
  { label: "Oct 9", isoDate: "2024-10-09" },
  { label: "Oct 10", isoDate: "2024-10-10" },
  { label: "Oct 11", isoDate: "2024-10-11" },
  { label: "Oct 16", isoDate: "2024-10-16" },
  { label: "Oct 17", isoDate: "2024-10-17" }
];
var SOLD_OUT_OVERRIDES = ["Oct 2", "Oct 3", "Oct 4"];
var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var toLocalDate = (isoDate) => {
  if (!isoDate) return null;
  const parts = isoDate.split("-").map((part) => parseInt(part, 10));
  if (parts.length !== 3 || parts.some((val) => Number.isNaN(val))) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};
var formatDateLabel = (isoDate, fallbackLabel) => {
  const dateObj = toLocalDate(isoDate);
  if (!dateObj) return fallbackLabel || isoDate;
  return `${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getDate()}`;
};
var DISPLAY_YEAR = 2025;
var projectDateToYear = (isoDate, targetYear) => {
  const baseDate = toLocalDate(isoDate);
  if (!baseDate) return null;
  const projected = new Date(baseDate);
  projected.setHours(0, 0, 0, 0);
  projected.setFullYear(targetYear);
  return projected;
};
var PizzaPartyPage = () => {
  const canonical = "https://localeffort.app/pizza-party";
  const siteName = "Local Effort";
  const pageTitle = "Book Your Pizza Party - Pay a Deposit | Local Effort";
  const pageDescription = "Pay a deposit to book your pizza party. $75 deposit reserves your date. Estimated $450 for parties of 15 guests with premium wood-fired pizza and local ingredients.";
  const startOfToday = (() => {
    const d = /* @__PURE__ */ new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const upcomingDates = PIZZA_PARTY_DATES.map((entry) => {
    const projectedDate = projectDateToYear(entry.isoDate, DISPLAY_YEAR);
    if (!projectedDate || projectedDate < startOfToday) return null;
    const isoDate = projectedDate.toISOString().slice(0, 10);
    const label = entry.label || formatDateLabel(isoDate, entry.label);
    return {
      ...entry,
      label,
      isoDate,
      dateObj: projectedDate,
      weekday: projectedDate.toLocaleDateString("en-US", { weekday: "short" })
    };
  }).filter(Boolean).sort((a, b) => a.dateObj && b.dateObj ? a.dateObj - b.dateObj : 0);
  const availabilityYears = Array.from(new Set(upcomingDates.map((entry) => entry.dateObj?.getFullYear()).filter(Boolean)));
  const availabilityMonthLabel = upcomingDates.length ? upcomingDates[0].dateObj.toLocaleString("en-US", { month: "long" }) : "Upcoming";
  const availabilityYearLabel = availabilityYears.length === 0 ? String((/* @__PURE__ */ new Date()).getFullYear()) : availabilityYears.join(" / ");
  const eventStartHour = "17:00:00";
  const timezoneOffset = "-05:00";
  const eventsSchema = upcomingDates.map(({ isoDate }) => ({
    "@type": "Event",
    name: "Private Mobile Pizza Party",
    description: "On-site artisanal wood-fired pizza experience (up to 15 guests). $75 deposit to book.",
    startDate: `${isoDate}T${eventStartHour}${timezoneOffset}`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: "Client Provided Location",
      address: { "@type": "PostalAddress", addressRegion: "MN", addressCountry: "US" }
    },
    organizer: { "@type": "Organization", name: siteName, url: canonical.replace("/pizza-party", "/") },
    offers: {
      "@type": "Offer",
      price: "75",
      priceCurrency: "USD",
      availability: "https://schema.org/LimitedAvailability",
      url: canonical,
      validFrom: (/* @__PURE__ */ new Date()).toISOString()
    }
  }));
  const serviceSchema = {
    "@type": "Service",
    name: "Pizza Party Booking - Deposit Required",
    description: pageDescription,
    provider: {
      "@type": "LocalBusiness",
      name: siteName,
      areaServed: { "@type": "Place", name: "Minnesota" }
    },
    offers: {
      "@type": "Offer",
      price: "75",
      priceCurrency: "USD",
      description: "$75 deposit to reserve your date. Estimated $450 for parties of 15 guests."
    },
    category: "Catering",
    additionalType: "https://schema.org/FoodEstablishment"
  };
  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: canonical.replace("/pizza-party", "/") },
      { "@type": "ListItem", position: 2, name: "Pizza Party", item: canonical }
    ]
  };
  const jsonLd = [serviceSchema, ...eventsSchema, breadcrumbSchema];
  const [images, setImages] = (0, import_react32.useState)([]);
  const [error, setError] = (0, import_react32.useState)(null);
  const [loading, setLoading] = (0, import_react32.useState)(true);
  const [bookingState, setBookingState] = (0, import_react32.useState)({});
  const [soldOutDates, setSoldOutDates] = (0, import_react32.useState)(() => new Set(SOLD_OUT_OVERRIDES));
  const [showModal, setShowModal] = (0, import_react32.useState)(false);
  const [selectedDate, setSelectedDate] = (0, import_react32.useState)(null);
  const squareEnabled = showModal;
  const { cardLoaded, error: cardError, loadingScript, tokenize, verifyBuyer, reset, envInfo } = useSquareCard("#pp-card-container", squareEnabled, [squareEnabled]);
  const checkoutAttemptRef = (0, import_react32.useRef)("");
  const attemptStorageKey = "le:checkoutAttempt:pizza-party";
  const resolveCheckoutAttemptId = (0, import_react32.useCallback)(() => {
    if (checkoutAttemptRef.current) return checkoutAttemptRef.current;
    const next = getOrCreateCheckoutAttemptId(attemptStorageKey);
    checkoutAttemptRef.current = next;
    return next;
  }, []);
  const clearCheckoutAttempt = (0, import_react32.useCallback)(() => {
    checkoutAttemptRef.current = "";
    clearCheckoutAttemptId(attemptStorageKey);
  }, []);
  const [bookedDate, setBookedDate] = (0, import_react32.useState)(null);
  const [justBooked, setJustBooked] = (0, import_react32.useState)(false);
  const [email, setEmail] = (0, import_react32.useState)("");
  const [fullName, setFullName] = (0, import_react32.useState)("");
  const [phone, setPhone] = (0, import_react32.useState)("");
  const [address, setAddress] = (0, import_react32.useState)({ line1: "", line2: "", city: "", state: "MN", postal: "" });
  const [mealTime, setMealTime] = (0, import_react32.useState)("5:00 PM");
  const [pizzaRequests, setPizzaRequests] = (0, import_react32.useState)("");
  const [addOnEnabled, setAddOnEnabled] = (0, import_react32.useState)(false);
  const [guestCount, setGuestCount] = (0, import_react32.useState)(10);
  const [submitting, setSubmitting] = (0, import_react32.useState)(false);
  const isValidEmail = (val) => /.+@.+\..+/.test(val.trim());
  const formatPhone = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    if (digits.length < 4) return digits;
    if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };
  const isValidPhone = (val) => val.replace(/\D/g, "").length === 10;
  const formatPostal = (val) => val.replace(/[^0-9]/g, "").slice(0, 5);
  const isValidAddress = (a) => a.line1.trim().length > 3 && a.city.trim().length > 1 && a.postal.trim().length >= 5;
  const basePrice = 75;
  const estimatedTotal = 450;
  const addOnTotal = addOnEnabled ? guestCount * 9 : 0;
  const grandTotal = basePrice + addOnTotal;
  (0, import_react32.useEffect)(() => {
    let active = true;
    fetchPizzaImages((imgs) => {
      if (active) setImages(imgs);
    }, (err) => active && setError(err), (val) => active && setLoading(val));
    const fetchCalendarDates = async () => {
      try {
        const res = await fetch("/api/calendar/events?event_type=pizza_party&visibility=public&status=scheduled");
        if (res.ok) {
          const events = await res.json();
          const calendarDates = events.filter((e) => e.is_bookable && e.start_date).map((e) => ({
            label: new Date(e.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            isoDate: e.start_date
          }));
          if (calendarDates.length > 0) {
          }
        }
      } catch (err) {
        console.warn("Failed to load calendar dates, using fallback:", err);
      }
    };
    fetchCalendarDates();
    return () => {
      active = false;
    };
  }, []);
  (0, import_react32.useEffect)(() => {
    let mounted = true;
    const loadAvailability = async () => {
      try {
        const res = await fetch("/api/store/pizza-party-status");
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (!mounted || !data?.soldOutDates) return;
        setSoldOutDates((prev) => {
          const next = new Set(prev);
          data.soldOutDates.filter(Boolean).forEach((label) => next.add(label));
          return next;
        });
      } catch (err) {
        if (false) {
          console.warn("[pizza-party] availability load failed", err);
        }
      }
    };
    loadAvailability();
    const timer = setInterval(loadAvailability, 5 * 60 * 1e3);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);
  (0, import_react32.useEffect)(() => {
    if (selectedDate && soldOutDates.has(selectedDate)) {
      setSelectedDate(null);
    }
  }, [selectedDate, soldOutDates]);
  (0, import_react32.useEffect)(() => {
    if (!showModal) return;
    const apiKey = window.GOOGLE_PLACES_KEY || import_meta6?.env?.VITE_GOOGLE_PLACES_KEY;
    if (!apiKey) return;
    const existing = document.querySelector("script[data-gplaces]");
    if (existing) return;
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=__lpPlacesInit`;
    s.async = true;
    s.dataset.gplaces = "true";
    window.__lpPlacesInit = () => {
      try {
        const input = document.querySelector("#pp-address-line1");
        if (!input || !window.google || !window.google.maps) return;
        const ac = new window.google.maps.places.Autocomplete(input, { types: ["address"], componentRestrictions: { country: "us" } });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place || !Array.isArray(place.address_components)) return;
          const comp = (type) => place.address_components.find((c) => c.types.includes(type))?.long_name || "";
          const streetNumber = comp("street_number");
          const route = comp("route");
          const locality = comp("locality") || comp("sublocality") || "";
          const admin = comp("administrative_area_level_1") || "";
          const postal = comp("postal_code") || "";
          setAddress((a) => ({
            ...a,
            line1: [streetNumber, route].filter(Boolean).join(" ") || a.line1,
            city: locality || a.city,
            state: admin || a.state,
            postal: postal || a.postal
          }));
        });
      } catch (_) {
      }
    };
    document.head.appendChild(s);
    return () => {
      try {
        delete window.__lpPlacesInit;
      } catch (_) {
      }
    };
  }, [showModal]);
  (0, import_react32.useEffect)(() => {
    const params = new URLSearchParams(window.location.search);
    const b = params.get("booked");
    if (b) {
      setBookedDate(b);
      params.delete("booked");
      const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);
  const openModal = (date) => {
    try {
      if (typeof reset === "function") {
        reset();
      }
    } catch (err) {
      if (false) {
        console.error("[pizza-party] failed to reset payment form", err);
      }
    }
    setShowModal(true);
    setSelectedDate(date);
  };
  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    setEmail("");
    setAddOnEnabled(false);
    setGuestCount(10);
    clearCheckoutAttempt();
  };
  const submitBooking = async () => {
    if (!selectedDate) return;
    if (submitting) return;
    if (!fullName.trim() || !isValidEmail(email) || !isValidPhone(phone) || !isValidAddress(address)) {
      setBookingState((s) => ({ ...s, [selectedDate]: { ...s[selectedDate] || {}, error: "Please complete required contact & address fields." } }));
      return;
    }
    setSubmitting(true);
    const date = selectedDate;
    setBookingState((s) => ({ ...s, [date]: { loading: true } }));
    try {
      let token;
      try {
        token = await tokenize();
      } catch (e) {
        throw new Error(e?.message || "Card not ready");
      }
      const basePriceCents = 3e4;
      const addOnPricePerGuestCents = 900;
      const guestsInt = addOnEnabled ? guestCount : 0;
      const amountCents = basePriceCents + (guestsInt > 0 ? guestsInt * addOnPricePerGuestCents : 0);
      const nameParts = fullName.trim().split(" ");
      const verificationDetails = {
        amount: (amountCents / 100).toFixed(2),
        currencyCode: "USD",
        intent: "CHARGE",
        billingContact: {
          givenName: nameParts[0] || void 0,
          familyName: nameParts.slice(1).join(" ") || void 0,
          email: email.trim() || void 0,
          phone: phone.trim() || void 0,
          addressLines: [address?.line1, address?.line2].filter(Boolean),
          city: address?.city || void 0,
          state: address?.state || void 0,
          postalCode: address?.postal || void 0,
          countryCode: "US"
        }
      };
      const verificationToken = await verifyBuyer(token, verificationDetails);
      const checkoutAttemptId = resolveCheckoutAttemptId();
      const res = await fetch("/api/store/pizza-party-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date,
          email: email.trim(),
          name: fullName.trim(),
          phone: phone.trim(),
          address,
          mealTime,
          pizzaRequests,
          addOnGuests: addOnEnabled ? guestCount : 0,
          token,
          verificationToken,
          checkoutAttemptId,
          basePriceCents,
          addOnPricePerGuestCents
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Payment failed");
      setBookingState((s) => ({ ...s, [date]: { loading: false, success: true, paymentId: data.paymentId } }));
      setBookedDate(date);
      setJustBooked(true);
      closeModal();
      clearCheckoutAttempt();
      try {
        fetch("/api/store/pizza-party-receipt", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paymentId: data.paymentId, date, email: email.trim(), addOnGuests: addOnEnabled ? guestCount : 0 })
        }).catch(() => {
        });
      } catch (_) {
      }
      setTimeout(() => setJustBooked(false), 6e3);
    } catch (e) {
      setBookingState((s) => ({ ...s, [date]: { loading: false, error: e.message || "Error" } }));
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(import_jsx_runtime38.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(import_react_helmet_async6.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("title", { children: pageTitle }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("meta", { name: "description", content: pageDescription }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("link", { rel: "canonical", href: canonical }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("meta", { property: "og:title", content: pageTitle }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("meta", { property: "og:description", content: pageDescription }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("meta", { property: "og:type", content: "website" }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("meta", { property: "og:url", content: canonical }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("meta", { property: "og:site_name", content: siteName }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("meta", { property: "og:locale", content: "en_US" }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("meta", { name: "twitter:card", content: "summary_large_image" }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("meta", { name: "twitter:title", content: pageTitle }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("meta", { name: "twitter:description", content: pageDescription }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("script", { type: "application/ld+json", children: JSON.stringify(jsonLd) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { className: "space-y-16", children: bookedDate && /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: `p-4 rounded-lg border bg-green-50 text-green-800 text-sm shadow-sm flex items-start gap-3 transition-all ${justBooked ? "border-green-400 ring-2 ring-green-300" : "border-green-300"}`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "font-semibold", children: "Booked!" }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("span", { children: [
        "Your reservation for ",
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("strong", { children: bookedDate }),
        " was received. We\\'ll follow up to confirm details."
      ] })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "mx-auto max-w-6xl px-4 py-10 space-y-14", children: [
      /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "text-center space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("h1", { className: "heading-display heading-balance", children: "Pizza party special" }),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("p", { className: "mt-2 text-xl md:text-2xl text-neutral-800 max-w-3xl mx-auto leading-relaxed", children: [
          "Host an unforgettable pizza experience right in your home. We bring the oven, the dough, and the vibes. We call it ",
          /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("strong", { children: "Local Pizza" }),
          "."
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("section", { children: /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "relative rounded-2xl border bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6 md:p-10 overflow-hidden", children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { className: "absolute inset-0 pointer-events-none opacity-[0.15]", style: { backgroundImage: "radial-gradient(circle at 30% 30%, #fb923c, transparent 60%)" } }),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "relative grid md:grid-cols-3 gap-8 items-center", children: [
          /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "md:col-span-2 space-y-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("h2", { className: "heading-lg heading-balance", children: "Pizza party in your home" }),
            /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("ul", { className: "list-disc list-inside text-neutral-700 text-sm md:text-base space-y-1", children: [
              /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("li", { children: "Up to 15 guests" }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("li", { children: "100% local midwest ingredients, slow-fermented sourdough crust" }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("li", { children: "We handle setup, firing & service" }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("li", { children: "Includes 2 hours of active pizza making/eating time" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "flex flex-col items-center justify-center gap-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "text-center space-y-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "text-5xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent", children: [
                "$",
                basePrice
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { className: "mt-1 text-xs uppercase tracking-wider text-neutral-500", children: "Deposit to Reserve" }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "text-sm text-neutral-600", children: [
                "Est. $",
                estimatedTotal,
                " for 15 guests"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("button", { type: "button", onClick: () => openModal(null), className: "inline-flex items-center rounded-md bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-3 shadow-sm transition-colors", children: "Book / Pay Deposit" })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("section", { id: "dates", children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("h3", { className: "text-lg font-semibold mb-3 flex items-center gap-2", children: [
          "Available ",
          availabilityMonthLabel,
          " Dates",
          /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "text-[10px] font-mono bg-neutral-200 rounded px-1.5 py-0.5", children: availabilityYearLabel })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { className: "mx-auto max-w-4xl", children: upcomingDates.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { className: "rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-600", children: "More pizza party dates are coming soon. Reach out if you need a custom date." }) : /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("ul", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4", children: upcomingDates.map(({ label, weekday }) => {
          const st = bookingState[label] || {};
          const isSoldOut = soldOutDates.has(label);
          return /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("li", { className: `relative group rounded-xl border bg-white/80 backdrop-blur-sm shadow-sm px-3 py-3 flex flex-col items-start justify-between h-28 overflow-hidden ${isSoldOut ? "opacity-80" : ""}`, children: [
            /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "w-full flex items-start justify-between gap-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { children: [
                weekday && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "block text-[10px] uppercase tracking-wide text-neutral-500", children: weekday }),
                /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "font-semibold text-neutral-800 text-sm tracking-tight", children: label })
              ] }),
              st.loading && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "text-[10px] text-orange-600 animate-pulse", children: "..." })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
              "button",
              {
                type: "button",
                disabled: st.loading || isSoldOut,
                onClick: () => openModal(label),
                className: `mt-auto inline-flex justify-center items-center rounded-md px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-colors border ${st.loading || isSoldOut ? "bg-neutral-200 text-neutral-500 border-neutral-200 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700 text-white border-orange-600"}`,
                "aria-label": `Book pizza party on ${label}`,
                children: isSoldOut ? "Sold out" : st.loading ? "Processing" : "Book"
              }
            ),
            isSoldOut && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wide bg-rose-100 text-rose-700 rounded px-2 py-0.5", children: "Sold Out" }),
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { className: "pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-orange-50/40 to-rose-50/40" })
          ] }, label);
        }) }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("section", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "flex items-center justify-between mb-5", children: [
          /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("h3", { className: "text-xl font-semibold", children: "Pizza Inspiration" }),
          loading && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { className: "text-sm text-neutral-500 animate-pulse", children: "Loading..." })
        ] }),
        error && /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "p-4 mb-6 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm", children: [
          "Could not load images: ",
          error
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "columns-2 md:columns-3 lg:columns-4 gap-3 [column-fill:_balance]", children: [
          images.map((img, idx) => /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(import_framer_motion11.motion.figure, { className: "mb-3 break-inside-avoid rounded-lg overflow-hidden shadow-sm bg-neutral-100", whileHover: { scale: 1.02 }, children: /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
            "img",
            {
              src: img.thumbnail_url,
              alt: `Wood-fired pizza ${idx + 1}`,
              loading: "lazy",
              className: "w-full h-auto block",
              decoding: "async",
              fetchPriority: idx < 2 ? "high" : "auto"
            }
          ) }, img.asset_id || img.public_id)),
          !loading && images.length === 0 && !error && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "text-sm text-neutral-500", children: "No images found yet. Tag some photos in Cloudinary with 'pizza'." })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("section", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("h3", { className: "text-xl font-semibold mt-24 mb-6", children: "FAQ" }),
        /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "space-y-6", children: [
          /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("h4", { className: "font-medium text-neutral-900", children: "What pizzas does this include?" }),
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "text-sm text-neutral-700 mt-1", children: "We have some signature favorites, or we're happy to take requests." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("h4", { className: "font-medium text-neutral-900", children: "Does it include anything besides pizza?" }),
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "text-sm text-neutral-700 mt-1", children: "This offer is just for pizza, but we can build a bigger package if you like. It's easy to add additional sides like salads and dessert." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("h4", { className: "font-medium text-neutral-900", children: "What kind of pizza do you make?" }),
            /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "text-sm text-neutral-700 mt-1", children: "Minnesotan-style. It's sort of neapolitan, sort of New York. Puffy, crispy, chewy crusts. It's our own thing." })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(import_framer_motion11.AnimatePresence, { children: showModal && /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(import_framer_motion11.motion.div, { className: "fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { className: "absolute inset-0 bg-black/40 backdrop-blur-sm", onClick: closeModal }),
      /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)(
        import_framer_motion11.motion.div,
        {
          initial: { scale: 0.9, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0.9, opacity: 0 },
          transition: { type: "spring", stiffness: 220, damping: 20 },
          className: "relative w-full max-w-md rounded-xl bg-white shadow-lg border p-6 space-y-5 mt-10 mb-10 max-h-[90vh] overflow-y-auto",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("h3", { className: "text-lg font-semibold", children: selectedDate ? `Book ${selectedDate}` : "Select a Date" }),
                /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "text-xs text-neutral-500 mt-0.5", children: selectedDate ? "Confirm your details below." : "Choose a date to continue." })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("button", { onClick: closeModal, className: "text-neutral-400 hover:text-neutral-600", "aria-label": "Close", children: "\u2715" })
            ] }),
            !selectedDate && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { className: "space-y-2", children: /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("ul", { className: "max-h-48 overflow-auto border rounded-md divide-y", children: upcomingDates.map(({ label }) => {
              const isSoldOut = soldOutDates.has(label);
              return /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("li", { className: "flex items-center justify-between px-3 py-2 text-sm", children: [
                /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { children: label }),
                /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
                  "button",
                  {
                    type: "button",
                    onClick: () => !isSoldOut ? setSelectedDate(label) : null,
                    disabled: isSoldOut,
                    className: `text-xs font-semibold px-2 py-1 rounded-md ${isSoldOut ? "bg-neutral-200 text-neutral-500 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700 text-white"}`,
                    children: isSoldOut ? "Sold out" : "Select"
                  }
                )
              ] }, label);
            }) }) }),
            selectedDate && /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "space-y-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("label", { className: "block text-sm font-medium", children: [
                "Name",
                /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("input", { type: "text", value: fullName, onChange: (e) => setFullName(e.target.value), placeholder: "Your full name", className: "mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("label", { className: "block text-sm font-medium", children: [
                "Email",
                /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", className: "mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("label", { className: "block text-sm font-medium", children: [
                "Phone",
                /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("input", { type: "tel", value: phone, onChange: (e) => setPhone(formatPhone(e.target.value)), placeholder: "(555) 123-4567", className: "mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("fieldset", { className: "border rounded-md p-3 space-y-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("legend", { className: "text-xs font-semibold uppercase tracking-wide text-neutral-600", children: "Address" }),
                /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "grid grid-cols-1 gap-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("input", { id: "pp-address-line1", value: address.line1, onChange: (e) => setAddress((a) => ({ ...a, line1: e.target.value })), placeholder: "Street address", className: "rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" }),
                  /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("input", { value: address.line2, onChange: (e) => setAddress((a) => ({ ...a, line2: e.target.value })), placeholder: "Apt / Suite (optional)", className: "rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" }),
                  /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "grid grid-cols-6 gap-2", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("input", { value: address.city, onChange: (e) => setAddress((a) => ({ ...a, city: e.target.value })), placeholder: "City", className: "col-span-3 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" }),
                    /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("input", { value: address.state, onChange: (e) => setAddress((a) => ({ ...a, state: e.target.value })), placeholder: "State", className: "col-span-1 rounded-md border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" }),
                    /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("input", { value: address.postal, onChange: (e) => setAddress((a) => ({ ...a, postal: formatPostal(e.target.value) })), placeholder: "ZIP", className: "col-span-2 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "grid grid-cols-2 gap-4", children: [
                /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("label", { className: "block text-sm font-medium", children: [
                  "Mealtime",
                  /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("select", { value: mealTime, onChange: (e) => setMealTime(e.target.value), className: "mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500", children: ["4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM"].map((t) => /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("option", { value: t, children: t }, t)) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("label", { className: "block text-sm font-medium", children: [
                  "Guests",
                  /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
                    "input",
                    {
                      type: "number",
                      min: 1,
                      max: 50,
                      value: guestCount,
                      onChange: (e) => setGuestCount(Math.max(1, Math.min(50, Number(e.target.value)))),
                      className: "mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "space-y-2 border rounded-md p-3", children: [
                /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("label", { className: "flex items-center gap-2 text-sm font-medium", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("input", { type: "checkbox", checked: addOnEnabled, onChange: (e) => setAddOnEnabled(e.target.checked) }),
                  /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { children: "Add salads & dessert ($9 / guest)" })
                ] }),
                addOnEnabled && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { className: "flex items-center gap-3 pl-6", children: /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("span", { className: "text-xs text-neutral-500", children: [
                  "Add-on total: $",
                  addOnTotal
                ] }) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("label", { className: "block text-sm font-medium", children: [
                "Pizza Requests (optional)",
                /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("textarea", { value: pizzaRequests, onChange: (e) => setPizzaRequests(e.target.value), placeholder: "Favorite styles, dietary notes, special requests...", rows: 3, className: "mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "space-y-1 pt-2 border-t text-sm", children: [
                /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "flex items-center justify-between font-medium", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { children: "Deposit (due now)" }),
                  /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("span", { children: [
                    "$",
                    grandTotal
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "flex items-center justify-between text-neutral-600 text-xs", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("span", { children: "Estimated total (15 guests)" }),
                  /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("span", { children: [
                    "$",
                    estimatedTotal
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "flex gap-3 pt-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("button", { onClick: closeModal, type: "button", className: "flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-50", children: "Cancel" }),
              /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(
                "button",
                {
                  onClick: selectedDate ? submitBooking : void 0,
                  type: "button",
                  disabled: selectedDate ? bookingState[selectedDate]?.loading || submitting || !cardLoaded || !!cardError || loadingScript || !isValidEmail(email) || !fullName.trim() || !isValidPhone(phone) || !isValidAddress(address) : false,
                  className: `flex-1 rounded-md text-sm font-semibold px-4 py-2 shadow disabled:opacity-60 disabled:cursor-not-allowed ${selectedDate ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-neutral-200 text-neutral-500 cursor-not-allowed"}`,
                  children: selectedDate ? bookingState[selectedDate]?.loading || submitting ? "Processing\u2026" : !fullName.trim() ? "Enter Name" : !isValidEmail(email) ? "Enter Email" : !isValidPhone(phone) ? "Phone Needed" : !isValidAddress(address) ? "Address Needed" : "Pay Deposit" : "Select a Date"
                }
              )
            ] }),
            selectedDate && bookingState[selectedDate]?.error && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "text-xs text-rose-600 pt-2", children: bookingState[selectedDate].error }),
            selectedDate && bookingState[selectedDate]?.success && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "text-xs text-emerald-600 pt-2", children: "Payment successful! We will confirm shortly." }),
            cardError && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "text-xs text-rose-600 pt-2", children: cardError }),
            /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "mt-4 border rounded-md p-4 bg-white", "aria-label": "Pizza party card form", children: [
              /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("div", { id: "pp-card-container", className: "min-h-[88px]" }),
              !cardLoaded && !cardError && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "mt-2 text-xs text-neutral-500", children: loadingScript ? "Loading payment library\u2026" : "Initializing secure payment form\u2026" }),
              (cardError || selectedDate && bookingState[selectedDate]?.error) && /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "mt-2 text-[10px] text-rose-600 space-y-1", children: [
                cardError && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { children: cardError }),
                /* @__PURE__ */ (0, import_jsx_runtime38.jsx)(FallbackLink, { date: selectedDate, email, addOnGuests: addOnEnabled ? guestCount : 0 })
              ] })
            ] })
          ]
        }
      )
    ] }) }),
    false
  ] });
};
var FallbackLink = ({ date, email, addOnGuests }) => {
  const [url, setUrl] = import_react32.default.useState(null);
  const [loading, setLoading] = import_react32.default.useState(false);
  const [err, setErr] = import_react32.default.useState("");
  const build = async () => {
    if (loading) return;
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      if (date) qs.set("date", date);
      if (email) qs.set("email", email);
      if (addOnGuests) qs.set("addOnGuests", String(addOnGuests));
      const res = await fetch(`/api/store/pizza-party-link?${qs.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Link creation failed");
      setUrl(data.url);
    } catch (e) {
      setErr(e?.message || "Failed to create link");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime38.jsxs)("div", { className: "space-y-1", children: [
    !url && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("button", { type: "button", onClick: build, className: "underline text-[10px]", children: "Get fallback hosted checkout" }),
    loading && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { children: "Building link\u2026" }),
    err && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { className: "text-rose-600", children: err }),
    url && /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime38.jsx)("a", { href: url, className: "text-orange-600 underline", target: "_blank", rel: "noopener noreferrer", children: "Open hosted Square checkout" }) })
  ] });
};
FallbackLink.propTypes = {};
var PizzaPartyPage_default = PizzaPartyPage;

// src/ssr/StaticApp.jsx
var import_jsx_runtime39 = require("react/jsx-runtime");
function StaticApp({ helmetContext }) {
  const location = (0, import_react_router_dom6.useLocation)();
  const isFullPageHome = location.pathname === "/";
  return /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(import_react_helmet_async7.HelmetProvider, { context: helmetContext, children: /* @__PURE__ */ (0, import_jsx_runtime39.jsxs)(CartProvider, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(DefaultSeo_default, {}),
    /* @__PURE__ */ (0, import_jsx_runtime39.jsxs)("div", { className: "app-root min-h-screen flex flex-col", children: [
      /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(Header, {}),
      /* @__PURE__ */ (0, import_jsx_runtime39.jsx)("main", { className: "flex-1", style: { paddingTop: isFullPageHome ? 0 : "5rem" }, children: /* @__PURE__ */ (0, import_jsx_runtime39.jsxs)(import_react_router_dom6.Routes, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(import_react_router_dom6.Route, { path: "/", element: /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(FullPageDemoPage_default, {}) }),
        /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(import_react_router_dom6.Route, { path: "/releases", element: /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(ReleasesPage_default, {}) }),
        /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(import_react_router_dom6.Route, { path: "/sale", element: /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(SalePage_default, {}) }),
        /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(import_react_router_dom6.Route, { path: "/weekly", element: /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(WeeklyList_default, {}) }),
        /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(import_react_router_dom6.Route, { path: "/happymonday", element: /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(happymondaypage_default, {}) }),
        /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(import_react_router_dom6.Route, { path: "/pizza-party", element: /* @__PURE__ */ (0, import_jsx_runtime39.jsx)(PizzaPartyPage_default, {}) })
      ] }) })
    ] })
  ] }) });
}
