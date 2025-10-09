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
    module2.exports = function shallowEqual(objA, objB, compare2, compareContext) {
      var ret = compare2 ? compare2.call(compareContext, objA, objB) : void 0;
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
        ret = compare2 ? compare2.call(compareContext, valueA, valueB, key) : void 0;
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
function __setFunctionName(f, name2, prefix) {
  if (typeof name2 === "symbol") name2 = name2.description ? "[".concat(name2.description, "]") : "";
  return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name2) : name2 });
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
function __addDisposableResource(env3, value, async) {
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
    env3.stack.push({ value, dispose, async });
  } else if (async) {
    env3.stack.push({ async: true });
  }
  return value;
}
function __disposeResources(env3) {
  function fail(e) {
    env3.error = env3.hasError ? new _SuppressedError(e, env3.error, "An error was suppressed during disposal.") : e;
    env3.hasError = true;
  }
  var r, s = 0;
  function next() {
    while (r = env3.stack.pop()) {
      try {
        if (!r.async && s === 1) return s = 0, env3.stack.push(r), Promise.resolve().then(next);
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
    if (s === 1) return env3.hasError ? Promise.reject(env3.error) : Promise.resolve();
    if (env3.hasError) throw env3.error;
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
    function assignRef(ref3, value) {
      if (typeof ref3 === "function") {
        ref3(value);
      } else if (ref3) {
        ref3.current = value;
      }
      return ref3;
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
      var ref3 = (0, react_1.useState)(function() {
        return {
          // value
          value: initialValue,
          // last callback
          callback,
          // "memoized" public interface
          facade: {
            get current() {
              return ref3.value;
            },
            set current(value) {
              var last = ref3.value;
              if (last !== value) {
                ref3.value = value;
                ref3.callback(value, last);
              }
            }
          }
        };
      })[0];
      ref3.callback = callback;
      return ref3.facade;
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
        return refs.forEach(function(ref3) {
          return (0, assignRef_1.assignRef)(ref3, newValue);
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
    var React65 = tslib_1.__importStar(require("react"));
    var assignRef_1 = require_assignRef();
    var useRef_1 = require_useRef();
    var useIsomorphicLayoutEffect2 = typeof window !== "undefined" ? React65.useLayoutEffect : React65.useEffect;
    var currentValues = /* @__PURE__ */ new WeakMap();
    function useMergeRefs(refs, defaultValue) {
      var callbackRef = (0, useRef_1.useCallbackRef)(defaultValue || null, function(newValue) {
        return refs.forEach(function(ref3) {
          return (0, assignRef_1.assignRef)(ref3, newValue);
        });
      });
      useIsomorphicLayoutEffect2(function() {
        var oldValue = currentValues.get(callbackRef);
        if (oldValue) {
          var prevRefs_1 = new Set(oldValue);
          var nextRefs_1 = new Set(refs);
          var current_1 = callbackRef.current;
          prevRefs_1.forEach(function(ref3) {
            if (!nextRefs_1.has(ref3)) {
              (0, assignRef_1.assignRef)(ref3, null);
            }
          });
          nextRefs_1.forEach(function(ref3) {
            if (!prevRefs_1.has(ref3)) {
              (0, assignRef_1.assignRef)(ref3, current_1);
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
    function useTransformRef(ref3, transformer) {
      return (0, useRef_1.useCallbackRef)(null, function(value) {
        return (0, assignRef_1.assignRef)(ref3, transformer(value));
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
    function transformRef(ref3, transformer) {
      return (0, createRef_1.createCallbackRef)(function(value) {
        return (0, assignRef_1.assignRef)(ref3, transformer(value));
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
    function refToCallback(ref3) {
      return function(newValue) {
        if (typeof ref3 === "function") {
          ref3(newValue);
        } else if (ref3) {
          ref3.current = newValue;
        }
      };
    }
    exports2.refToCallback = refToCallback;
    var nullCallback = function() {
      return null;
    };
    var weakMem = /* @__PURE__ */ new WeakMap();
    var weakMemoize = function(ref3) {
      var usedRef = ref3 || nullCallback;
      var storedRef = weakMem.get(usedRef);
      if (storedRef) {
        return storedRef;
      }
      var cb = refToCallback(usedRef);
      weakMem.set(usedRef, cb);
      return cb;
    };
    function useRefToCallback(ref3) {
      return weakMemoize(ref3);
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
    var cache2 = /* @__PURE__ */ new WeakMap();
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
        return cache2.get(importer);
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
            cache2.set(importer, resolved);
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
    var React65 = tslib_1.__importStar(require("react"));
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
        return Car ? React65.createElement(Car, tslib_1.__assign({}, props)) : null;
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
    function innerCreateMedium(defaults, middleware2) {
      if (middleware2 === void 0) {
        middleware2 = ItoI;
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
          var item = middleware2(data, assigned);
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
    function createMedium(defaults, middleware2) {
      if (middleware2 === void 0) {
        middleware2 = ItoI;
      }
      return innerCreateMedium(defaults, middleware2);
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
    var React65 = tslib_1.__importStar(require("react"));
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
        return React65.createElement(WrappedComponent, tslib_1.__assign({}, props, { children: renderTarget }));
      }
      var Children4 = React65.memo(function(_a) {
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
        var defaultState = React65.useRef(defaults(props));
        var ref3 = React65.useRef(function(state) {
          return defaultState.current = state;
        });
        return React65.createElement(
          React65.Fragment,
          null,
          React65.createElement(State, { stateRef: ref3, props }),
          React65.createElement(Children4, { stateRef: ref3, defaultState, children: props.children })
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
    var React65 = tslib_1.__importStar(require("react"));
    var SideCar = function(_a) {
      var sideCar = _a.sideCar, rest = tslib_1.__rest(_a, ["sideCar"]);
      if (!sideCar) {
        throw new Error("Sidecar: please provide `sideCar` property to import the right car");
      }
      var Target = sideCar.read();
      if (!Target) {
        throw new Error("Sidecar medium not found");
      }
      return React65.createElement(Target, tslib_1.__assign({}, rest));
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
    var React65 = tslib_1.__importStar(require("react"));
    var constants_1 = require_constants();
    var use_callback_ref_1 = require_es5();
    var medium_1 = require_medium2();
    var nothing = function() {
      return;
    };
    var RemoveScroll2 = React65.forwardRef(function(props, parentRef) {
      var ref3 = React65.useRef(null);
      var _a = React65.useState({
        onScrollCapture: nothing,
        onWheelCapture: nothing,
        onTouchMoveCapture: nothing
      }), callbacks = _a[0], setCallbacks = _a[1];
      var forwardProps = props.forwardProps, children = props.children, className = props.className, removeScrollBar = props.removeScrollBar, enabled = props.enabled, shards = props.shards, sideCar = props.sideCar, noRelative = props.noRelative, noIsolation = props.noIsolation, inert = props.inert, allowPinchZoom = props.allowPinchZoom, _b = props.as, Container = _b === void 0 ? "div" : _b, gapMode = props.gapMode, rest = tslib_1.__rest(props, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]);
      var SideCar = sideCar;
      var containerRef = (0, use_callback_ref_1.useMergeRefs)([ref3, parentRef]);
      var containerProps = tslib_1.__assign(tslib_1.__assign({}, rest), callbacks);
      return React65.createElement(
        React65.Fragment,
        null,
        enabled && React65.createElement(SideCar, { sideCar: medium_1.effectCar, removeScrollBar, shards, noRelative, noIsolation, inert, setCallbacks, allowPinchZoom: !!allowPinchZoom, lockRef: ref3, gapMode }),
        forwardProps ? React65.cloneElement(React65.Children.only(children), tslib_1.__assign(tslib_1.__assign({}, containerProps), { ref: containerRef })) : React65.createElement(Container, tslib_1.__assign({}, containerProps, { className, ref: containerRef }), children)
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
      var counter2 = 0;
      var stylesheet = null;
      return {
        add: function(style) {
          if (counter2 == 0) {
            if (stylesheet = makeStyleTag()) {
              injectStyles(stylesheet, style);
              insertStyleTag(stylesheet);
            }
          }
          counter2++;
        },
        remove: function() {
          counter2--;
          if (!counter2 && stylesheet) {
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
    var React65 = tslib_1.__importStar(require("react"));
    var singleton_1 = require_singleton();
    var styleHookSingleton = function() {
      var sheet = (0, singleton_1.stylesheetSingleton)();
      return function(styles, isDynamic) {
        React65.useEffect(function() {
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
    var React65 = tslib_1.__importStar(require("react"));
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
      var counter2 = parseInt(document.body.getAttribute(exports2.lockAttribute) || "0", 10);
      return isFinite(counter2) ? counter2 : 0;
    };
    var useLockAttribute = function() {
      React65.useEffect(function() {
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
      var gap = React65.useMemo(function() {
        return (0, utils_1.getGapWidth)(gapMode);
      }, [gapMode]);
      return React65.createElement(Style, { styles: getStyles(gap, !noRelative, gapMode, !noImportant ? "!important" : "") });
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
    var React65 = tslib_1.__importStar(require("react"));
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
    var extractRef = function(ref3) {
      return ref3 && "current" in ref3 ? ref3.current : ref3;
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
      var shouldPreventQueue = React65.useRef([]);
      var touchStartRef = React65.useRef([0, 0]);
      var activeAxis = React65.useRef();
      var id = React65.useState(idCounter++)[0];
      var Style = React65.useState(react_style_singleton_1.styleSingleton)[0];
      var lastProps = React65.useRef(props);
      React65.useEffect(function() {
        lastProps.current = props;
      }, [props]);
      React65.useEffect(function() {
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
      var shouldCancelEvent = React65.useCallback(function(event, parent) {
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
      var shouldPrevent = React65.useCallback(function(_event) {
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
      var shouldCancel = React65.useCallback(function(name2, delta, target, should) {
        var event = { name: name2, delta, target, should, shadowParent: getOutermostShadowParent(target) };
        shouldPreventQueue.current.push(event);
        setTimeout(function() {
          shouldPreventQueue.current = shouldPreventQueue.current.filter(function(e) {
            return e !== event;
          });
        }, 1);
      }, []);
      var scrollTouchStart = React65.useCallback(function(event) {
        touchStartRef.current = (0, exports2.getTouchXY)(event);
        activeAxis.current = void 0;
      }, []);
      var scrollWheel = React65.useCallback(function(event) {
        shouldCancel(event.type, (0, exports2.getDeltaXY)(event), event.target, shouldCancelEvent(event, props.lockRef.current));
      }, []);
      var scrollTouchMove = React65.useCallback(function(event) {
        shouldCancel(event.type, (0, exports2.getTouchXY)(event), event.target, shouldCancelEvent(event, props.lockRef.current));
      }, []);
      React65.useEffect(function() {
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
      return React65.createElement(
        React65.Fragment,
        null,
        inert ? React65.createElement(Style, { styles: generateStyle(id) }) : null,
        removeScrollBar ? React65.createElement(react_remove_scroll_bar_1.RemoveScrollBar, { noRelative: props.noRelative, gapMode: props.gapMode }) : null
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
    var React65 = tslib_1.__importStar(require("react"));
    var UI_1 = require_UI();
    var sidecar_1 = tslib_1.__importDefault(require_sidecar());
    var ReactRemoveScroll = React65.forwardRef(function(props, ref3) {
      return React65.createElement(UI_1.RemoveScroll, tslib_1.__assign({}, props, { ref: ref3, sideCar: sidecar_1.default }));
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
var import_react29, import_framer_motion8, import_jsx_runtime31, backdrop, modal, FoodItemModal, FoodItemModal_default;
var init_FoodItemModal = __esm({
  "src/components/menu/FoodItemModal.jsx"() {
    import_react29 = __toESM(require("react"));
    import_framer_motion8 = require("framer-motion");
    import_jsx_runtime31 = require("react/jsx-runtime");
    backdrop = {
      visible: { opacity: 1 },
      hidden: { opacity: 0 }
    };
    modal = {
      hidden: { y: "-50px", opacity: 0 },
      visible: { y: "0", opacity: 1, transition: { delay: 0.1 } }
    };
    FoodItemModal = ({ item, onClose }) => {
      return /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(
        import_framer_motion8.motion.div,
        {
          className: "fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4",
          variants: backdrop,
          initial: "hidden",
          animate: "visible",
          exit: "hidden",
          onClick: onClose,
          children: /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)(
            import_framer_motion8.motion.div,
            {
              variants: modal,
              className: "bg-white rounded-lg shadow-xl max-w-lg w-full p-8 relative",
              onClick: (e) => e.stopPropagation(),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime31.jsx)(
                  "button",
                  {
                    onClick: onClose,
                    className: "absolute top-4 right-4 text-neutral-500 hover:text-neutral-800 text-2xl",
                    children: "\xD7"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("h3", { className: "text-3xl font-bold mb-4", children: item.name }),
                /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("p", { className: "text-body mb-6", children: item.description }),
                /* @__PURE__ */ (0, import_jsx_runtime31.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("h4", { className: "font-bold text-lg mb-2", children: "Ingredients:" }),
                  /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("ul", { className: "list-disc list-inside text-neutral-600 space-y-1", children: item.ingredients.map((ingredient, index) => /* @__PURE__ */ (0, import_jsx_runtime31.jsx)("li", { children: ingredient }, index)) })
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

// src/firebaseConfig.js
var import_app, import_firestore, import_database, import_auth, import_meta6, initializeAppCheck, ReCaptchaV3Provider, loadAppCheck, env2, firebaseConfig, app, db, realtimeDb, auth, googleProvider, firebaseProjectId;
var init_firebaseConfig = __esm({
  "src/firebaseConfig.js"() {
    import_app = require("firebase/app");
    import_firestore = require("firebase/firestore");
    import_database = require("firebase/database");
    import_auth = require("firebase/auth");
    import_meta6 = {};
    loadAppCheck = () => import("firebase/app-check").then((m) => {
      initializeAppCheck = m.initializeAppCheck;
      ReCaptchaV3Provider = m.ReCaptchaV3Provider;
    }).catch(() => {
    });
    env2 = (typeof import_meta6 !== "undefined" ? import_meta6.env : {}) || {};
    firebaseConfig = {
      apiKey: env2.VITE_API_KEY || env2.VITE_FIREBASE_API_KEY || env2.REACT_APP_API_KEY,
      authDomain: env2.VITE_AUTH_DOMAIN || env2.VITE_FIREBASE_AUTH_DOMAIN || env2.REACT_APP_AUTH_DOMAIN,
      projectId: env2.VITE_PROJECT_ID || env2.VITE_FIREBASE_PROJECT_ID || env2.REACT_APP_PROJECT_ID,
      storageBucket: env2.VITE_STORAGE_BUCKET || env2.VITE_FIREBASE_STORAGE_BUCKET || env2.REACT_APP_STORAGE_BUCKET,
      messagingSenderId: env2.VITE_MESSAGING_SENDER_ID || env2.VITE_FIREBASE_MESSAGING_SENDER_ID || env2.REACT_APP_MESSAGING_SENDER_ID,
      appId: env2.VITE_APP_ID || env2.VITE_FIREBASE_APP_ID || env2.REACT_APP_APP_ID,
      databaseURL: env2.VITE_DATABASE_URL || env2.VITE_FIREBASE_DATABASE_URL || env2.REACT_APP_DATABASE_URL || env2.REACT_APP_FIREBASE_DATABASE_URL || void 0
    };
    app = null;
    try {
      if (firebaseConfig.apiKey) {
        app = (0, import_app.initializeApp)(firebaseConfig);
        const siteKey = env2.VITE_APPCHECK_SITE_KEY || env2.VITE_RECAPTCHA_SITE_KEY;
        if (siteKey) {
          loadAppCheck().then(() => {
            if (initializeAppCheck && ReCaptchaV3Provider) {
              try {
                initializeAppCheck(app, {
                  provider: new ReCaptchaV3Provider(siteKey),
                  isTokenAutoRefreshEnabled: true
                });
              } catch (e) {
                console.warn("App Check initialization failed:", e && (e.message || e));
              }
            }
          });
        }
      } else {
        console.warn("Firebase config missing \u2014 auth/comments disabled on client.");
      }
    } catch (e) {
      console.warn("Failed to initialize Firebase app:", e && (e.message || e));
    }
    db = app ? (0, import_firestore.getFirestore)(app) : null;
    realtimeDb = app ? (0, import_database.getDatabase)(app) : null;
    auth = app ? (0, import_auth.getAuth)(app) : null;
    googleProvider = app ? new import_auth.GoogleAuthProvider() : null;
    firebaseProjectId = firebaseConfig.projectId || null;
  }
});

// src/components/menu/FeedbackForm.jsx
var FeedbackForm_exports = {};
__export(FeedbackForm_exports, {
  default: () => FeedbackForm_default
});
var import_react30, import_framer_motion9, import_database2, import_jsx_runtime32, FeedbackForm, FeedbackForm_default;
var init_FeedbackForm = __esm({
  "src/components/menu/FeedbackForm.jsx"() {
    import_react30 = __toESM(require("react"));
    import_framer_motion9 = require("framer-motion");
    import_database2 = require("firebase/database");
    init_firebaseConfig();
    import_jsx_runtime32 = require("react/jsx-runtime");
    FeedbackForm = () => {
      const [formData, setFormData] = (0, import_react30.useState)({
        name: "",
        email: "",
        phone: "",
        category: "requests",
        message: ""
      });
      const [status, setStatus] = (0, import_react30.useState)({ type: "", message: "" });
      const handleChange = (e) => {
        const { name: name2, value } = e.target;
        setFormData((prev) => ({ ...prev, [name2]: value }));
      };
      const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.message) {
          setStatus({ type: "error", message: "Please enter a message before submitting." });
          return;
        }
        setStatus({ type: "loading", message: "Submitting..." });
        if (!realtimeDb) {
          setStatus({ type: "error", message: "Feedback is unavailable right now. Please try again later." });
          return;
        }
        try {
          const feedbackCollectionRef = (0, import_database2.ref)(realtimeDb, "feedback");
          const newFeedbackRef = (0, import_database2.push)(feedbackCollectionRef);
          const submittedAtMs = Date.now();
          await (0, import_database2.set)(newFeedbackRef, {
            ...formData,
            submittedAt: (0, import_database2.serverTimestamp)(),
            submittedAtMs
          });
          setStatus({ type: "success", message: "Thank you! Your feedback has been sent." });
          setFormData({ name: "", email: "", phone: "", category: "requests", message: "" });
        } catch (error) {
          console.error("Error adding document: ", error);
          setStatus({ type: "error", message: "Something went wrong. Please try again." });
        }
      };
      return /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "max-w-2xl bg-neutral-50 border border-neutral-200 p-8 rounded-lg", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("div", { className: "grid sm:grid-cols-2 gap-6", children: /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("label", { htmlFor: "category", className: "block text-sm font-medium text-neutral-700", children: "Category" }),
          /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)(
            "select",
            {
              id: "category",
              name: "category",
              value: formData.category,
              onChange: handleChange,
              className: "mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("option", { value: "requests", children: "Requests" }),
                /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("option", { value: "quality", children: "Quality Feedback" }),
                /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("option", { value: "other", children: "Other" })
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("label", { htmlFor: "message", className: "block text-sm font-medium text-neutral-700", children: "Message" }),
          /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "grid sm:grid-cols-2 gap-6", children: [
          /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("label", { htmlFor: "name", className: "block text-sm font-medium text-neutral-700", children: "Name (Optional)" }),
            /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
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
          /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime32.jsx)("label", { htmlFor: "email", className: "block text-sm font-medium text-neutral-700", children: "Email (Optional)" }),
            /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime32.jsxs)("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
            import_framer_motion9.motion.button,
            {
              type: "submit",
              className: "btn btn-primary",
              whileHover: { scale: 1.03 },
              whileTap: { scale: 0.98 },
              disabled: status.type === "loading",
              children: status.type === "loading" ? "Sending..." : "Submit Feedback"
            }
          ),
          status.message && /* @__PURE__ */ (0, import_jsx_runtime32.jsx)(
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
var import_react31, import_framer_motion10, import_jsx_runtime33, LoadingSpinner;
var init_LoadingSpinner = __esm({
  "src/components/layout/LoadingSpinner.jsx"() {
    import_react31 = __toESM(require("react"));
    import_framer_motion10 = require("framer-motion");
    import_jsx_runtime33 = require("react/jsx-runtime");
    LoadingSpinner = () => /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
      import_framer_motion10.motion.div,
      {
        className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        children: /* @__PURE__ */ (0, import_jsx_runtime33.jsxs)("div", { className: "text-center", children: [
          /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
            import_framer_motion10.motion.div,
            {
              className: "w-16 h-16 mx-auto mb-4 border-4 border-orange-200 border-t-orange-500 rounded-full",
              animate: { rotate: 360 },
              transition: { duration: 1, repeat: Infinity, ease: "linear" }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime33.jsx)(
            import_framer_motion10.motion.p,
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

// node_modules/.pnpm/use-sync-external-store@1.6.0_react@18.2.0/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.production.js
var require_use_sync_external_store_shim_production = __commonJS({
  "node_modules/.pnpm/use-sync-external-store@1.6.0_react@18.2.0/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.production.js"(exports2) {
    "use strict";
    var React65 = require("react");
    function is(x, y) {
      return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
    }
    var objectIs = "function" === typeof Object.is ? Object.is : is;
    var useState26 = React65.useState;
    var useEffect27 = React65.useEffect;
    var useLayoutEffect4 = React65.useLayoutEffect;
    var useDebugValue2 = React65.useDebugValue;
    function useSyncExternalStore$2(subscribe, getSnapshot) {
      var value = getSnapshot(), _useState = useState26({ inst: { value, getSnapshot } }), inst = _useState[0].inst, forceUpdate = _useState[1];
      useLayoutEffect4(
        function() {
          inst.value = value;
          inst.getSnapshot = getSnapshot;
          checkIfSnapshotChanged(inst) && forceUpdate({ inst });
        },
        [subscribe, value, getSnapshot]
      );
      useEffect27(
        function() {
          checkIfSnapshotChanged(inst) && forceUpdate({ inst });
          return subscribe(function() {
            checkIfSnapshotChanged(inst) && forceUpdate({ inst });
          });
        },
        [subscribe]
      );
      useDebugValue2(value);
      return value;
    }
    function checkIfSnapshotChanged(inst) {
      var latestGetSnapshot = inst.getSnapshot;
      inst = inst.value;
      try {
        var nextValue = latestGetSnapshot();
        return !objectIs(inst, nextValue);
      } catch (error) {
        return true;
      }
    }
    function useSyncExternalStore$1(subscribe, getSnapshot) {
      return getSnapshot();
    }
    var shim = "undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement ? useSyncExternalStore$1 : useSyncExternalStore$2;
    exports2.useSyncExternalStore = void 0 !== React65.useSyncExternalStore ? React65.useSyncExternalStore : shim;
  }
});

// node_modules/.pnpm/use-sync-external-store@1.6.0_react@18.2.0/node_modules/use-sync-external-store/shim/index.js
var require_shim = __commonJS({
  "node_modules/.pnpm/use-sync-external-store@1.6.0_react@18.2.0/node_modules/use-sync-external-store/shim/index.js"(exports2, module2) {
    "use strict";
    if (true) {
      module2.exports = require_use_sync_external_store_shim_production();
    } else {
      module2.exports = null;
    }
  }
});

// src/ssr/StaticApp.jsx
var StaticApp_exports = {};
__export(StaticApp_exports, {
  default: () => StaticApp
});
module.exports = __toCommonJS(StaticApp_exports);
var import_react49 = __toESM(require("react"));
var import_react_router_dom7 = require("react-router-dom");
var import_react_helmet_async13 = __toESM(require_lib());

// src/components/layout/Header.jsx
var import_react = __toESM(require("react"));
var import_react_router_dom = require("react-router-dom");
var import_framer_motion = require("framer-motion");
var import_jsx_runtime = require("react/jsx-runtime");
var logo = "/gallery/logo.png?text=Local+Effort&font=mono";
var links = [
  { path: "/services", name: "Services", children: [
    { path: "/services#event-request", name: "Submit an event request" }
  ] },
  { path: "/pricing", name: "Pricing" },
  { path: "/menu", name: "Menus" },
  { path: "/pizza-party", name: "Pizza Party" },
  { path: "/book-food-truck", name: "Book a Food Truck", tag: "Beta" },
  { path: "/about", name: "About" },
  // { path: '/happy-monday', name: 'Happy Monday' }, // temporarily hidden
  { path: "/gallery", name: "Gallery" }
  // { path: '/releases', name: 'Releases' }, // temporarily hidden
];
var SHOW_FUNDRAISER = true;
var Header = () => {
  const [isOpen, setIsOpen] = (0, import_react.useState)(false);
  const [openMobileSection, setOpenMobileSection] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "sticky top-0 z-40 bg-white backdrop-blur supports-[backdrop-filter]:bg-white/70 md:bg-white/80", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mx-auto max-w-6xl px-2 md:px-5 lg:px-6 h-14 flex items-center justify-between", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.NavLink, { to: "/", onClick: () => setIsOpen(false), className: "flex items-center gap-2", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        import_framer_motion.motion.img,
        {
          src: logo,
          alt: "Local Effort Logo",
          className: "h-7 w-auto rounded-md border border-black",
          whileHover: { scale: 1.03 },
          transition: { type: "spring", stiffness: 300, damping: 20 }
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", { className: "hidden md:flex items-center gap-2 font-mono text-[0.9rem]", children: [
        links.map(({ path, name: name2, sale, children, tag }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "relative group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.NavLink, { to: path, className: "relative px-2 py-1 rounded", children: ({ isActive }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            sale ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `inline-flex items-center rounded-md px-2 py-1 text-white shadow-sm transition-transform ${isActive ? "scale-[1.02]" : ""}`, style: { backgroundColor: "#e11d48" }, children: name2 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "inline-flex items-center gap-1 transition-colors hover:text-neutral-900 text-neutral-700", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: name2 }),
              tag && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-rose-500", children: tag })
            ] }),
            !sale && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              import_framer_motion.motion.span,
              {
                layoutId: "nav-underline",
                className: "absolute left-2 right-2 -bottom-0.5 h-0.5 bg-[var(--color-accent)]",
                initial: false,
                animate: { opacity: isActive ? 1 : 0 },
                transition: { duration: 0.2 }
              }
            )
          ] }) }),
          children && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute left-0 mt-1", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-1 rounded-md border bg-white shadow-lg py-1 min-w-[220px]", children: children.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.NavLink, { to: c.path, className: "block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50", children: c.name }, c.path)) }) }) })
        ] }, path)),
        SHOW_FUNDRAISER && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.NavLink, { to: "/crowdfunding", className: "ml-2", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_framer_motion.motion.span,
          {
            whileHover: { scale: 1.03 },
            whileTap: { scale: 0.98 },
            className: "inline-flex items-center rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-semibold text-white shadow-sm",
            children: "Crowdfunding"
          }
        ) })
      ] }),
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
                className: `block h-0.5 w-full bg-black transition-transform ${isOpen ? "rotate-45 translate-y-[10px]" : ""}`
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "span",
              {
                className: `block h-0.5 w-full bg-black transition-opacity ${isOpen ? "opacity-0" : "opacity-100"}`
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "span",
              {
                className: `block h-0.5 w-full bg-black transition-transform ${isOpen ? "-rotate-45 -translate-y-[10px]" : ""}`
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
        className: "md:hidden fixed inset-0 bg-white",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
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
            className: "flex flex-col items-center justify-center h-full space-y-6 font-mono px-6",
            children: [
              links.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                import_framer_motion.motion.div,
                {
                  variants: { hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } },
                  children: !l.children ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    import_react_router_dom.NavLink,
                    {
                      to: l.path,
                      onClick: () => setIsOpen(false),
                      className: `block text-3xl uppercase text-center ${l.sale ? "bg-rose-600 text-white px-4 py-2 rounded-md" : ""}`,
                      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "flex items-center justify-center gap-2", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: l.name }),
                        l.tag && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-rose-500", children: l.tag })
                      ] })
                    }
                  ) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "w-full max-w-md", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                      "button",
                      {
                        type: "button",
                        onClick: () => setOpenMobileSection(openMobileSection === l.path ? null : l.path),
                        className: "w-full text-3xl uppercase text-center flex items-center justify-center gap-2",
                        "aria-expanded": openMobileSection === l.path,
                        "aria-controls": `section-${l.path}`,
                        children: [
                          l.name,
                          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                            "svg",
                            {
                              xmlns: "http://www.w3.org/2000/svg",
                              className: `h-6 w-6 transition-transform ${openMobileSection === l.path ? "rotate-180" : ""}`,
                              viewBox: "0 0 20 20",
                              fill: "currentColor",
                              "aria-hidden": "true",
                              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { fillRule: "evenodd", d: "M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z", clipRule: "evenodd" })
                            }
                          )
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_framer_motion.AnimatePresence, { initial: false, children: openMobileSection === l.path && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      import_framer_motion.motion.div,
                      {
                        id: `section-${l.path}`,
                        initial: { height: 0, opacity: 0 },
                        animate: { height: "auto", opacity: 1 },
                        exit: { height: 0, opacity: 0 },
                        transition: { duration: 0.2 },
                        className: "overflow-hidden mt-2",
                        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex flex-col items-center space-y-2", children: l.children.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                          import_react_router_dom.NavLink,
                          {
                            to: c.path,
                            onClick: () => setIsOpen(false),
                            className: "text-base text-neutral-800 hover:text-black",
                            children: c.name
                          },
                          c.path
                        )) })
                      }
                    ) })
                  ] })
                },
                l.path
              )),
              SHOW_FUNDRAISER && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_framer_motion.motion.div, { variants: { hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                import_react_router_dom.NavLink,
                {
                  to: "/crowdfunding",
                  onClick: () => setIsOpen(false),
                  className: "text-2xl uppercase bg-[var(--color-accent)] text-white px-6 py-3 rounded font-semibold",
                  children: "Crowdfunding"
                }
              ) })
            ]
          }
        )
      }
    ) })
  ] });
};

// src/components/layout/Footer.jsx
var import_react2 = __toESM(require("react"));
var import_jsx_runtime2 = require("react/jsx-runtime");
var Footer = () => {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("footer", { className: "mt-16 border-t border-neutral-200", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8 font-mono text-sm text-neutral-700", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
        "\xA9 ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " Local Effort"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-neutral-500", children: "Roseville, MN \xB7 Midwest" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "mt-2 text-neutral-600", children: [
        "Service Areas:",
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("a", { href: "/personal-chef-minneapolis", className: "underline underline-offset-4 hover:opacity-80", children: "Minneapolis" }),
        " ",
        "|",
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("a", { href: "/personal-chef-st-paul", className: "underline underline-offset-4 hover:opacity-80", children: "St. Paul" }),
        " ",
        "|",
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("a", { href: "/personal-chef-twin-cities", className: "underline underline-offset-4 hover:opacity-80", children: "Twin Cities" }),
        " ",
        "|",
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("a", { href: "/personal-chef-minnesota", className: "underline underline-offset-4 hover:opacity-80", children: "Minnesota" }),
        " ",
        "|",
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("a", { href: "/personal-chef-wisconsin", className: "underline underline-offset-4 hover:opacity-80", children: "Wisconsin" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex gap-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "a",
        {
          href: "/releases",
          className: "underline underline-offset-4 hover:opacity-80",
          children: "Press"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "a",
        {
          href: "https://www.tiktok.com/@localeffort",
          className: "underline underline-offset-4 hover:opacity-80",
          children: "TikTok (@localeffort)"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "a",
        {
          href: "https://instagram.com/localeffort",
          className: "underline underline-offset-4 hover:opacity-80",
          children: "Instagram"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "a",
        {
          href: "https://facebook.com/localeffort",
          className: "underline underline-offset-4 hover:opacity-80",
          children: "Facebook"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "a",
        {
          href: "https://www.thumbtack.com/mn/saint-paul/personal-chefs/weston-smith/service/429294230165643268",
          className: "underline underline-offset-4 hover:opacity-80",
          children: "Thumbtack"
        }
      )
    ] })
  ] }) }) });
};

// src/pages/HomePage.jsx
var import_react15 = __toESM(require("react"));
var import_react_router_dom3 = require("react-router-dom");
var import_react_helmet_async2 = __toESM(require_lib());

// src/components/common/ServiceCard.jsx
var import_react3 = __toESM(require("react"));
var import_react_router_dom2 = require("react-router-dom");
var import_framer_motion2 = require("framer-motion");

// src/utils/animations.js
var fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
};
var fadeInLeft = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
};
var scaleOnHover = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
  transition: { type: "spring", stiffness: 400, damping: 25 }
};

// src/components/common/ServiceCard.jsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var ServiceCard = ({ to = "#", title, description, children }) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
  import_framer_motion2.motion.div,
  {
    ...scaleOnHover,
    className: "group rounded-xl bg-neutral-50 p-8 shadow-sm ring-1 ring-neutral-200 transition-shadow hover:shadow-md",
    initial: { opacity: 0, y: 10 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_react_router_dom2.Link, { to, className: "block h-full", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h4", { className: "text-2xl font-bold uppercase tracking-tight", children: title }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "font-mono text-neutral-600 min-h-[5.5rem] mt-2", children: description }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "font-mono text-sm inline-block underline underline-offset-4 group-hover:translate-x-0.5 transition-transform", children: "Learn More \u2192" })
      ] }),
      children && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "mt-4", children })
    ]
  }
);
var ServiceCard_default = ServiceCard;

// src/pages/HomePage.jsx
var import_framer_motion3 = require("framer-motion");

// src/components/common/cloudinaryImage.jsx
var import_react4 = __toESM(require("react"));
var import_react5 = require("@cloudinary/react");
var import_url_gen = require("@cloudinary/url-gen");
var import_resize = require("@cloudinary/url-gen/actions/resize");
var import_gravity = require("@cloudinary/url-gen/qualifiers/gravity");
var import_quality = require("@cloudinary/url-gen/qualifiers/quality");
var import_format = require("@cloudinary/url-gen/qualifiers/format");
var import_delivery = require("@cloudinary/url-gen/actions/delivery");
var import_react6 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
var import_meta = {};
var CLOUD_NAME = import_meta.env?.VITE_CLOUDINARY_CLOUD_NAME || typeof process !== "undefined" && process?.env?.CLOUDINARY_CLOUD_NAME || "dokyhfvyd";
var cld = new import_url_gen.Cloudinary({
  cloud: {
    cloudName: CLOUD_NAME
  }
});
var CloudinaryImage = ({ publicId, alt, width, height, className, containerClassName, imgClassName, containerStyle, disableLazy = false, fallbackSrc, resizeMode = "fill", placeholderMode = "blur", sizes, responsiveSteps = [480, 768, 1024, 1400, 2e3, 2600, 3200], eager = false, version }) => {
  const [loaded, setLoaded] = (0, import_react6.useState)(false);
  const [error, setError] = (0, import_react6.useState)(false);
  const imgRef = (0, import_react6.useRef)(null);
  if (!publicId) {
    const placeholderStyle = {
      width: width ? `${width}px` : "100%",
      height: height ? `${height}px` : "100%",
      backgroundColor: "#f0f0f0",
      // A light gray placeholder
      display: "inline-block"
    };
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: placeholderStyle, className });
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
  (0, import_react6.useEffect)(() => {
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
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
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
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    "div",
    {
      ref: imgRef,
      className: `${containerClassName || className || ""} relative overflow-hidden w-full`,
      style: { ...baseStyle, ...containerStyle || {} },
      children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        import_react5.AdvancedImage,
        {
          cldImg: myImage,
          alt,
          className: `transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName || ""}`,
          sizes,
          loading: eager ? "eager" : "lazy",
          style: imgStyle,
          plugins: (() => {
            const base = [(0, import_react5.responsive)({ steps: responsiveSteps })];
            const isLazy = !eager && !disableLazy;
            return isLazy ? [...base, (0, import_react5.lazyload)()] : base;
          })()
        }
      )
    }
  );
};
var cloudinaryImage_default = CloudinaryImage;

// src/pages/HomePage.jsx
var import_react16 = require("react");

// src/data/cloudinaryContent.js
var import_meta2 = {};
var cloudinaryConfig = {
  cloudName: typeof import_meta2 !== "undefined" && import_meta2.env?.VITE_CLOUDINARY_CLOUD_NAME || "dokyhfvyd"
};
var heroPublicId = "vjuesai2mxfavpq9d2df";
var heroVersion = "1759456148";
var heroFallbackSrc = "/gallery/IMG_3145.jpg";

// src/components/common/TestimonialsCarousel.jsx
var import_react9 = __toESM(require("react"));

// src/components/common/EmblaCarousel.jsx
var import_react8 = __toESM(require("react"));

// node_modules/.pnpm/embla-carousel-react@8.6.0_react@18.2.0/node_modules/embla-carousel-react/esm/embla-carousel-react.esm.js
var import_react7 = require("react");

// node_modules/.pnpm/embla-carousel-reactive-utils@8.6.0_embla-carousel@8.6.0/node_modules/embla-carousel-reactive-utils/esm/embla-carousel-reactive-utils.esm.js
function isObject(subject) {
  return Object.prototype.toString.call(subject) === "[object Object]";
}
function isRecord(subject) {
  return isObject(subject) || Array.isArray(subject);
}
function canUseDOM() {
  return !!(typeof window !== "undefined" && window.document && window.document.createElement);
}
function areOptionsEqual(optionsA, optionsB) {
  const optionsAKeys = Object.keys(optionsA);
  const optionsBKeys = Object.keys(optionsB);
  if (optionsAKeys.length !== optionsBKeys.length) return false;
  const breakpointsA = JSON.stringify(Object.keys(optionsA.breakpoints || {}));
  const breakpointsB = JSON.stringify(Object.keys(optionsB.breakpoints || {}));
  if (breakpointsA !== breakpointsB) return false;
  return optionsAKeys.every((key) => {
    const valueA = optionsA[key];
    const valueB = optionsB[key];
    if (typeof valueA === "function") return `${valueA}` === `${valueB}`;
    if (!isRecord(valueA) || !isRecord(valueB)) return valueA === valueB;
    return areOptionsEqual(valueA, valueB);
  });
}
function sortAndMapPluginToOptions(plugins) {
  return plugins.concat().sort((a, b) => a.name > b.name ? 1 : -1).map((plugin) => plugin.options);
}
function arePluginsEqual(pluginsA, pluginsB) {
  if (pluginsA.length !== pluginsB.length) return false;
  const optionsA = sortAndMapPluginToOptions(pluginsA);
  const optionsB = sortAndMapPluginToOptions(pluginsB);
  return optionsA.every((optionA, index) => {
    const optionB = optionsB[index];
    return areOptionsEqual(optionA, optionB);
  });
}

// node_modules/.pnpm/embla-carousel@8.6.0/node_modules/embla-carousel/esm/embla-carousel.esm.js
function isNumber(subject) {
  return typeof subject === "number";
}
function isString(subject) {
  return typeof subject === "string";
}
function isBoolean(subject) {
  return typeof subject === "boolean";
}
function isObject2(subject) {
  return Object.prototype.toString.call(subject) === "[object Object]";
}
function mathAbs(n) {
  return Math.abs(n);
}
function mathSign(n) {
  return Math.sign(n);
}
function deltaAbs(valueB, valueA) {
  return mathAbs(valueB - valueA);
}
function factorAbs(valueB, valueA) {
  if (valueB === 0 || valueA === 0) return 0;
  if (mathAbs(valueB) <= mathAbs(valueA)) return 0;
  const diff = deltaAbs(mathAbs(valueB), mathAbs(valueA));
  return mathAbs(diff / valueB);
}
function roundToTwoDecimals(num) {
  return Math.round(num * 100) / 100;
}
function arrayKeys(array) {
  return objectKeys(array).map(Number);
}
function arrayLast(array) {
  return array[arrayLastIndex(array)];
}
function arrayLastIndex(array) {
  return Math.max(0, array.length - 1);
}
function arrayIsLastIndex(array, index) {
  return index === arrayLastIndex(array);
}
function arrayFromNumber(n, startAt = 0) {
  return Array.from(Array(n), (_, i) => startAt + i);
}
function objectKeys(object) {
  return Object.keys(object);
}
function objectsMergeDeep(objectA, objectB) {
  return [objectA, objectB].reduce((mergedObjects, currentObject) => {
    objectKeys(currentObject).forEach((key) => {
      const valueA = mergedObjects[key];
      const valueB = currentObject[key];
      const areObjects = isObject2(valueA) && isObject2(valueB);
      mergedObjects[key] = areObjects ? objectsMergeDeep(valueA, valueB) : valueB;
    });
    return mergedObjects;
  }, {});
}
function isMouseEvent(evt, ownerWindow) {
  return typeof ownerWindow.MouseEvent !== "undefined" && evt instanceof ownerWindow.MouseEvent;
}
function Alignment(align, viewSize) {
  const predefined = {
    start,
    center,
    end
  };
  function start() {
    return 0;
  }
  function center(n) {
    return end(n) / 2;
  }
  function end(n) {
    return viewSize - n;
  }
  function measure(n, index) {
    if (isString(align)) return predefined[align](n);
    return align(viewSize, n, index);
  }
  const self = {
    measure
  };
  return self;
}
function EventStore() {
  let listeners = [];
  function add(node, type, handler, options = {
    passive: true
  }) {
    let removeListener;
    if ("addEventListener" in node) {
      node.addEventListener(type, handler, options);
      removeListener = () => node.removeEventListener(type, handler, options);
    } else {
      const legacyMediaQueryList = node;
      legacyMediaQueryList.addListener(handler);
      removeListener = () => legacyMediaQueryList.removeListener(handler);
    }
    listeners.push(removeListener);
    return self;
  }
  function clear() {
    listeners = listeners.filter((remove) => remove());
  }
  const self = {
    add,
    clear
  };
  return self;
}
function Animations(ownerDocument, ownerWindow, update, render) {
  const documentVisibleHandler = EventStore();
  const fixedTimeStep = 1e3 / 60;
  let lastTimeStamp = null;
  let accumulatedTime = 0;
  let animationId = 0;
  function init() {
    documentVisibleHandler.add(ownerDocument, "visibilitychange", () => {
      if (ownerDocument.hidden) reset();
    });
  }
  function destroy() {
    stop();
    documentVisibleHandler.clear();
  }
  function animate(timeStamp) {
    if (!animationId) return;
    if (!lastTimeStamp) {
      lastTimeStamp = timeStamp;
      update();
      update();
    }
    const timeElapsed = timeStamp - lastTimeStamp;
    lastTimeStamp = timeStamp;
    accumulatedTime += timeElapsed;
    while (accumulatedTime >= fixedTimeStep) {
      update();
      accumulatedTime -= fixedTimeStep;
    }
    const alpha = accumulatedTime / fixedTimeStep;
    render(alpha);
    if (animationId) {
      animationId = ownerWindow.requestAnimationFrame(animate);
    }
  }
  function start() {
    if (animationId) return;
    animationId = ownerWindow.requestAnimationFrame(animate);
  }
  function stop() {
    ownerWindow.cancelAnimationFrame(animationId);
    lastTimeStamp = null;
    accumulatedTime = 0;
    animationId = 0;
  }
  function reset() {
    lastTimeStamp = null;
    accumulatedTime = 0;
  }
  const self = {
    init,
    destroy,
    start,
    stop,
    update,
    render
  };
  return self;
}
function Axis(axis, contentDirection) {
  const isRightToLeft = contentDirection === "rtl";
  const isVertical = axis === "y";
  const scroll = isVertical ? "y" : "x";
  const cross = isVertical ? "x" : "y";
  const sign = !isVertical && isRightToLeft ? -1 : 1;
  const startEdge = getStartEdge();
  const endEdge = getEndEdge();
  function measureSize(nodeRect) {
    const {
      height,
      width
    } = nodeRect;
    return isVertical ? height : width;
  }
  function getStartEdge() {
    if (isVertical) return "top";
    return isRightToLeft ? "right" : "left";
  }
  function getEndEdge() {
    if (isVertical) return "bottom";
    return isRightToLeft ? "left" : "right";
  }
  function direction(n) {
    return n * sign;
  }
  const self = {
    scroll,
    cross,
    startEdge,
    endEdge,
    measureSize,
    direction
  };
  return self;
}
function Limit(min = 0, max = 0) {
  const length = mathAbs(min - max);
  function reachedMin(n) {
    return n < min;
  }
  function reachedMax(n) {
    return n > max;
  }
  function reachedAny(n) {
    return reachedMin(n) || reachedMax(n);
  }
  function constrain(n) {
    if (!reachedAny(n)) return n;
    return reachedMin(n) ? min : max;
  }
  function removeOffset(n) {
    if (!length) return n;
    return n - length * Math.ceil((n - max) / length);
  }
  const self = {
    length,
    max,
    min,
    constrain,
    reachedAny,
    reachedMax,
    reachedMin,
    removeOffset
  };
  return self;
}
function Counter(max, start, loop) {
  const {
    constrain
  } = Limit(0, max);
  const loopEnd = max + 1;
  let counter2 = withinLimit(start);
  function withinLimit(n) {
    return !loop ? constrain(n) : mathAbs((loopEnd + n) % loopEnd);
  }
  function get() {
    return counter2;
  }
  function set3(n) {
    counter2 = withinLimit(n);
    return self;
  }
  function add(n) {
    return clone().set(get() + n);
  }
  function clone() {
    return Counter(max, get(), loop);
  }
  const self = {
    get,
    set: set3,
    add,
    clone
  };
  return self;
}
function DragHandler(axis, rootNode, ownerDocument, ownerWindow, target, dragTracker, location, animation, scrollTo, scrollBody, scrollTarget, index, eventHandler, percentOfView, dragFree, dragThreshold, skipSnaps, baseFriction, watchDrag) {
  const {
    cross: crossAxis,
    direction
  } = axis;
  const focusNodes = ["INPUT", "SELECT", "TEXTAREA"];
  const nonPassiveEvent = {
    passive: false
  };
  const initEvents = EventStore();
  const dragEvents = EventStore();
  const goToNextThreshold = Limit(50, 225).constrain(percentOfView.measure(20));
  const snapForceBoost = {
    mouse: 300,
    touch: 400
  };
  const freeForceBoost = {
    mouse: 500,
    touch: 600
  };
  const baseSpeed = dragFree ? 43 : 25;
  let isMoving = false;
  let startScroll = 0;
  let startCross = 0;
  let pointerIsDown = false;
  let preventScroll = false;
  let preventClick = false;
  let isMouse = false;
  function init(emblaApi) {
    if (!watchDrag) return;
    function downIfAllowed(evt) {
      if (isBoolean(watchDrag) || watchDrag(emblaApi, evt)) down(evt);
    }
    const node = rootNode;
    initEvents.add(node, "dragstart", (evt) => evt.preventDefault(), nonPassiveEvent).add(node, "touchmove", () => void 0, nonPassiveEvent).add(node, "touchend", () => void 0).add(node, "touchstart", downIfAllowed).add(node, "mousedown", downIfAllowed).add(node, "touchcancel", up).add(node, "contextmenu", up).add(node, "click", click, true);
  }
  function destroy() {
    initEvents.clear();
    dragEvents.clear();
  }
  function addDragEvents() {
    const node = isMouse ? ownerDocument : rootNode;
    dragEvents.add(node, "touchmove", move, nonPassiveEvent).add(node, "touchend", up).add(node, "mousemove", move, nonPassiveEvent).add(node, "mouseup", up);
  }
  function isFocusNode(node) {
    const nodeName = node.nodeName || "";
    return focusNodes.includes(nodeName);
  }
  function forceBoost() {
    const boost = dragFree ? freeForceBoost : snapForceBoost;
    const type = isMouse ? "mouse" : "touch";
    return boost[type];
  }
  function allowedForce(force, targetChanged) {
    const next = index.add(mathSign(force) * -1);
    const baseForce = scrollTarget.byDistance(force, !dragFree).distance;
    if (dragFree || mathAbs(force) < goToNextThreshold) return baseForce;
    if (skipSnaps && targetChanged) return baseForce * 0.5;
    return scrollTarget.byIndex(next.get(), 0).distance;
  }
  function down(evt) {
    const isMouseEvt = isMouseEvent(evt, ownerWindow);
    isMouse = isMouseEvt;
    preventClick = dragFree && isMouseEvt && !evt.buttons && isMoving;
    isMoving = deltaAbs(target.get(), location.get()) >= 2;
    if (isMouseEvt && evt.button !== 0) return;
    if (isFocusNode(evt.target)) return;
    pointerIsDown = true;
    dragTracker.pointerDown(evt);
    scrollBody.useFriction(0).useDuration(0);
    target.set(location);
    addDragEvents();
    startScroll = dragTracker.readPoint(evt);
    startCross = dragTracker.readPoint(evt, crossAxis);
    eventHandler.emit("pointerDown");
  }
  function move(evt) {
    const isTouchEvt = !isMouseEvent(evt, ownerWindow);
    if (isTouchEvt && evt.touches.length >= 2) return up(evt);
    const lastScroll = dragTracker.readPoint(evt);
    const lastCross = dragTracker.readPoint(evt, crossAxis);
    const diffScroll = deltaAbs(lastScroll, startScroll);
    const diffCross = deltaAbs(lastCross, startCross);
    if (!preventScroll && !isMouse) {
      if (!evt.cancelable) return up(evt);
      preventScroll = diffScroll > diffCross;
      if (!preventScroll) return up(evt);
    }
    const diff = dragTracker.pointerMove(evt);
    if (diffScroll > dragThreshold) preventClick = true;
    scrollBody.useFriction(0.3).useDuration(0.75);
    animation.start();
    target.add(direction(diff));
    evt.preventDefault();
  }
  function up(evt) {
    const currentLocation = scrollTarget.byDistance(0, false);
    const targetChanged = currentLocation.index !== index.get();
    const rawForce = dragTracker.pointerUp(evt) * forceBoost();
    const force = allowedForce(direction(rawForce), targetChanged);
    const forceFactor = factorAbs(rawForce, force);
    const speed = baseSpeed - 10 * forceFactor;
    const friction = baseFriction + forceFactor / 50;
    preventScroll = false;
    pointerIsDown = false;
    dragEvents.clear();
    scrollBody.useDuration(speed).useFriction(friction);
    scrollTo.distance(force, !dragFree);
    isMouse = false;
    eventHandler.emit("pointerUp");
  }
  function click(evt) {
    if (preventClick) {
      evt.stopPropagation();
      evt.preventDefault();
      preventClick = false;
    }
  }
  function pointerDown() {
    return pointerIsDown;
  }
  const self = {
    init,
    destroy,
    pointerDown
  };
  return self;
}
function DragTracker(axis, ownerWindow) {
  const logInterval = 170;
  let startEvent;
  let lastEvent;
  function readTime(evt) {
    return evt.timeStamp;
  }
  function readPoint(evt, evtAxis) {
    const property = evtAxis || axis.scroll;
    const coord = `client${property === "x" ? "X" : "Y"}`;
    return (isMouseEvent(evt, ownerWindow) ? evt : evt.touches[0])[coord];
  }
  function pointerDown(evt) {
    startEvent = evt;
    lastEvent = evt;
    return readPoint(evt);
  }
  function pointerMove(evt) {
    const diff = readPoint(evt) - readPoint(lastEvent);
    const expired = readTime(evt) - readTime(startEvent) > logInterval;
    lastEvent = evt;
    if (expired) startEvent = evt;
    return diff;
  }
  function pointerUp(evt) {
    if (!startEvent || !lastEvent) return 0;
    const diffDrag = readPoint(lastEvent) - readPoint(startEvent);
    const diffTime = readTime(evt) - readTime(startEvent);
    const expired = readTime(evt) - readTime(lastEvent) > logInterval;
    const force = diffDrag / diffTime;
    const isFlick = diffTime && !expired && mathAbs(force) > 0.1;
    return isFlick ? force : 0;
  }
  const self = {
    pointerDown,
    pointerMove,
    pointerUp,
    readPoint
  };
  return self;
}
function NodeRects() {
  function measure(node) {
    const {
      offsetTop,
      offsetLeft,
      offsetWidth,
      offsetHeight
    } = node;
    const offset = {
      top: offsetTop,
      right: offsetLeft + offsetWidth,
      bottom: offsetTop + offsetHeight,
      left: offsetLeft,
      width: offsetWidth,
      height: offsetHeight
    };
    return offset;
  }
  const self = {
    measure
  };
  return self;
}
function PercentOfView(viewSize) {
  function measure(n) {
    return viewSize * (n / 100);
  }
  const self = {
    measure
  };
  return self;
}
function ResizeHandler(container, eventHandler, ownerWindow, slides, axis, watchResize, nodeRects) {
  const observeNodes = [container].concat(slides);
  let resizeObserver;
  let containerSize;
  let slideSizes = [];
  let destroyed = false;
  function readSize(node) {
    return axis.measureSize(nodeRects.measure(node));
  }
  function init(emblaApi) {
    if (!watchResize) return;
    containerSize = readSize(container);
    slideSizes = slides.map(readSize);
    function defaultCallback(entries) {
      for (const entry of entries) {
        if (destroyed) return;
        const isContainer = entry.target === container;
        const slideIndex = slides.indexOf(entry.target);
        const lastSize = isContainer ? containerSize : slideSizes[slideIndex];
        const newSize = readSize(isContainer ? container : slides[slideIndex]);
        const diffSize = mathAbs(newSize - lastSize);
        if (diffSize >= 0.5) {
          emblaApi.reInit();
          eventHandler.emit("resize");
          break;
        }
      }
    }
    resizeObserver = new ResizeObserver((entries) => {
      if (isBoolean(watchResize) || watchResize(emblaApi, entries)) {
        defaultCallback(entries);
      }
    });
    ownerWindow.requestAnimationFrame(() => {
      observeNodes.forEach((node) => resizeObserver.observe(node));
    });
  }
  function destroy() {
    destroyed = true;
    if (resizeObserver) resizeObserver.disconnect();
  }
  const self = {
    init,
    destroy
  };
  return self;
}
function ScrollBody(location, offsetLocation, previousLocation, target, baseDuration, baseFriction) {
  let scrollVelocity = 0;
  let scrollDirection = 0;
  let scrollDuration = baseDuration;
  let scrollFriction = baseFriction;
  let rawLocation = location.get();
  let rawLocationPrevious = 0;
  function seek() {
    const displacement = target.get() - location.get();
    const isInstant = !scrollDuration;
    let scrollDistance = 0;
    if (isInstant) {
      scrollVelocity = 0;
      previousLocation.set(target);
      location.set(target);
      scrollDistance = displacement;
    } else {
      previousLocation.set(location);
      scrollVelocity += displacement / scrollDuration;
      scrollVelocity *= scrollFriction;
      rawLocation += scrollVelocity;
      location.add(scrollVelocity);
      scrollDistance = rawLocation - rawLocationPrevious;
    }
    scrollDirection = mathSign(scrollDistance);
    rawLocationPrevious = rawLocation;
    return self;
  }
  function settled() {
    const diff = target.get() - offsetLocation.get();
    return mathAbs(diff) < 1e-3;
  }
  function duration() {
    return scrollDuration;
  }
  function direction() {
    return scrollDirection;
  }
  function velocity() {
    return scrollVelocity;
  }
  function useBaseDuration() {
    return useDuration(baseDuration);
  }
  function useBaseFriction() {
    return useFriction(baseFriction);
  }
  function useDuration(n) {
    scrollDuration = n;
    return self;
  }
  function useFriction(n) {
    scrollFriction = n;
    return self;
  }
  const self = {
    direction,
    duration,
    velocity,
    seek,
    settled,
    useBaseFriction,
    useBaseDuration,
    useFriction,
    useDuration
  };
  return self;
}
function ScrollBounds(limit, location, target, scrollBody, percentOfView) {
  const pullBackThreshold = percentOfView.measure(10);
  const edgeOffsetTolerance = percentOfView.measure(50);
  const frictionLimit = Limit(0.1, 0.99);
  let disabled = false;
  function shouldConstrain() {
    if (disabled) return false;
    if (!limit.reachedAny(target.get())) return false;
    if (!limit.reachedAny(location.get())) return false;
    return true;
  }
  function constrain(pointerDown) {
    if (!shouldConstrain()) return;
    const edge = limit.reachedMin(location.get()) ? "min" : "max";
    const diffToEdge = mathAbs(limit[edge] - location.get());
    const diffToTarget = target.get() - location.get();
    const friction = frictionLimit.constrain(diffToEdge / edgeOffsetTolerance);
    target.subtract(diffToTarget * friction);
    if (!pointerDown && mathAbs(diffToTarget) < pullBackThreshold) {
      target.set(limit.constrain(target.get()));
      scrollBody.useDuration(25).useBaseFriction();
    }
  }
  function toggleActive(active) {
    disabled = !active;
  }
  const self = {
    shouldConstrain,
    constrain,
    toggleActive
  };
  return self;
}
function ScrollContain(viewSize, contentSize, snapsAligned, containScroll, pixelTolerance) {
  const scrollBounds = Limit(-contentSize + viewSize, 0);
  const snapsBounded = measureBounded();
  const scrollContainLimit = findScrollContainLimit();
  const snapsContained = measureContained();
  function usePixelTolerance(bound, snap) {
    return deltaAbs(bound, snap) <= 1;
  }
  function findScrollContainLimit() {
    const startSnap = snapsBounded[0];
    const endSnap = arrayLast(snapsBounded);
    const min = snapsBounded.lastIndexOf(startSnap);
    const max = snapsBounded.indexOf(endSnap) + 1;
    return Limit(min, max);
  }
  function measureBounded() {
    return snapsAligned.map((snapAligned, index) => {
      const {
        min,
        max
      } = scrollBounds;
      const snap = scrollBounds.constrain(snapAligned);
      const isFirst = !index;
      const isLast = arrayIsLastIndex(snapsAligned, index);
      if (isFirst) return max;
      if (isLast) return min;
      if (usePixelTolerance(min, snap)) return min;
      if (usePixelTolerance(max, snap)) return max;
      return snap;
    }).map((scrollBound) => parseFloat(scrollBound.toFixed(3)));
  }
  function measureContained() {
    if (contentSize <= viewSize + pixelTolerance) return [scrollBounds.max];
    if (containScroll === "keepSnaps") return snapsBounded;
    const {
      min,
      max
    } = scrollContainLimit;
    return snapsBounded.slice(min, max);
  }
  const self = {
    snapsContained,
    scrollContainLimit
  };
  return self;
}
function ScrollLimit(contentSize, scrollSnaps, loop) {
  const max = scrollSnaps[0];
  const min = loop ? max - contentSize : arrayLast(scrollSnaps);
  const limit = Limit(min, max);
  const self = {
    limit
  };
  return self;
}
function ScrollLooper(contentSize, limit, location, vectors) {
  const jointSafety = 0.1;
  const min = limit.min + jointSafety;
  const max = limit.max + jointSafety;
  const {
    reachedMin,
    reachedMax
  } = Limit(min, max);
  function shouldLoop(direction) {
    if (direction === 1) return reachedMax(location.get());
    if (direction === -1) return reachedMin(location.get());
    return false;
  }
  function loop(direction) {
    if (!shouldLoop(direction)) return;
    const loopDistance = contentSize * (direction * -1);
    vectors.forEach((v) => v.add(loopDistance));
  }
  const self = {
    loop
  };
  return self;
}
function ScrollProgress(limit) {
  const {
    max,
    length
  } = limit;
  function get(n) {
    const currentLocation = n - max;
    return length ? currentLocation / -length : 0;
  }
  const self = {
    get
  };
  return self;
}
function ScrollSnaps(axis, alignment, containerRect, slideRects, slidesToScroll) {
  const {
    startEdge,
    endEdge
  } = axis;
  const {
    groupSlides
  } = slidesToScroll;
  const alignments = measureSizes().map(alignment.measure);
  const snaps = measureUnaligned();
  const snapsAligned = measureAligned();
  function measureSizes() {
    return groupSlides(slideRects).map((rects) => arrayLast(rects)[endEdge] - rects[0][startEdge]).map(mathAbs);
  }
  function measureUnaligned() {
    return slideRects.map((rect) => containerRect[startEdge] - rect[startEdge]).map((snap) => -mathAbs(snap));
  }
  function measureAligned() {
    return groupSlides(snaps).map((g) => g[0]).map((snap, index) => snap + alignments[index]);
  }
  const self = {
    snaps,
    snapsAligned
  };
  return self;
}
function SlideRegistry(containSnaps, containScroll, scrollSnaps, scrollContainLimit, slidesToScroll, slideIndexes) {
  const {
    groupSlides
  } = slidesToScroll;
  const {
    min,
    max
  } = scrollContainLimit;
  const slideRegistry = createSlideRegistry();
  function createSlideRegistry() {
    const groupedSlideIndexes = groupSlides(slideIndexes);
    const doNotContain = !containSnaps || containScroll === "keepSnaps";
    if (scrollSnaps.length === 1) return [slideIndexes];
    if (doNotContain) return groupedSlideIndexes;
    return groupedSlideIndexes.slice(min, max).map((group, index, groups) => {
      const isFirst = !index;
      const isLast = arrayIsLastIndex(groups, index);
      if (isFirst) {
        const range = arrayLast(groups[0]) + 1;
        return arrayFromNumber(range);
      }
      if (isLast) {
        const range = arrayLastIndex(slideIndexes) - arrayLast(groups)[0] + 1;
        return arrayFromNumber(range, arrayLast(groups)[0]);
      }
      return group;
    });
  }
  const self = {
    slideRegistry
  };
  return self;
}
function ScrollTarget(loop, scrollSnaps, contentSize, limit, targetVector) {
  const {
    reachedAny,
    removeOffset,
    constrain
  } = limit;
  function minDistance(distances) {
    return distances.concat().sort((a, b) => mathAbs(a) - mathAbs(b))[0];
  }
  function findTargetSnap(target) {
    const distance = loop ? removeOffset(target) : constrain(target);
    const ascDiffsToSnaps = scrollSnaps.map((snap, index2) => ({
      diff: shortcut(snap - distance, 0),
      index: index2
    })).sort((d1, d2) => mathAbs(d1.diff) - mathAbs(d2.diff));
    const {
      index
    } = ascDiffsToSnaps[0];
    return {
      index,
      distance
    };
  }
  function shortcut(target, direction) {
    const targets = [target, target + contentSize, target - contentSize];
    if (!loop) return target;
    if (!direction) return minDistance(targets);
    const matchingTargets = targets.filter((t) => mathSign(t) === direction);
    if (matchingTargets.length) return minDistance(matchingTargets);
    return arrayLast(targets) - contentSize;
  }
  function byIndex(index, direction) {
    const diffToSnap = scrollSnaps[index] - targetVector.get();
    const distance = shortcut(diffToSnap, direction);
    return {
      index,
      distance
    };
  }
  function byDistance(distance, snap) {
    const target = targetVector.get() + distance;
    const {
      index,
      distance: targetSnapDistance
    } = findTargetSnap(target);
    const reachedBound = !loop && reachedAny(target);
    if (!snap || reachedBound) return {
      index,
      distance
    };
    const diffToSnap = scrollSnaps[index] - targetSnapDistance;
    const snapDistance = distance + shortcut(diffToSnap, 0);
    return {
      index,
      distance: snapDistance
    };
  }
  const self = {
    byDistance,
    byIndex,
    shortcut
  };
  return self;
}
function ScrollTo(animation, indexCurrent, indexPrevious, scrollBody, scrollTarget, targetVector, eventHandler) {
  function scrollTo(target) {
    const distanceDiff = target.distance;
    const indexDiff = target.index !== indexCurrent.get();
    targetVector.add(distanceDiff);
    if (distanceDiff) {
      if (scrollBody.duration()) {
        animation.start();
      } else {
        animation.update();
        animation.render(1);
        animation.update();
      }
    }
    if (indexDiff) {
      indexPrevious.set(indexCurrent.get());
      indexCurrent.set(target.index);
      eventHandler.emit("select");
    }
  }
  function distance(n, snap) {
    const target = scrollTarget.byDistance(n, snap);
    scrollTo(target);
  }
  function index(n, direction) {
    const targetIndex = indexCurrent.clone().set(n);
    const target = scrollTarget.byIndex(targetIndex.get(), direction);
    scrollTo(target);
  }
  const self = {
    distance,
    index
  };
  return self;
}
function SlideFocus(root, slides, slideRegistry, scrollTo, scrollBody, eventStore, eventHandler, watchFocus) {
  const focusListenerOptions = {
    passive: true,
    capture: true
  };
  let lastTabPressTime = 0;
  function init(emblaApi) {
    if (!watchFocus) return;
    function defaultCallback(index) {
      const nowTime = (/* @__PURE__ */ new Date()).getTime();
      const diffTime = nowTime - lastTabPressTime;
      if (diffTime > 10) return;
      eventHandler.emit("slideFocusStart");
      root.scrollLeft = 0;
      const group = slideRegistry.findIndex((group2) => group2.includes(index));
      if (!isNumber(group)) return;
      scrollBody.useDuration(0);
      scrollTo.index(group, 0);
      eventHandler.emit("slideFocus");
    }
    eventStore.add(document, "keydown", registerTabPress, false);
    slides.forEach((slide, slideIndex) => {
      eventStore.add(slide, "focus", (evt) => {
        if (isBoolean(watchFocus) || watchFocus(emblaApi, evt)) {
          defaultCallback(slideIndex);
        }
      }, focusListenerOptions);
    });
  }
  function registerTabPress(event) {
    if (event.code === "Tab") lastTabPressTime = (/* @__PURE__ */ new Date()).getTime();
  }
  const self = {
    init
  };
  return self;
}
function Vector1D(initialValue) {
  let value = initialValue;
  function get() {
    return value;
  }
  function set3(n) {
    value = normalizeInput(n);
  }
  function add(n) {
    value += normalizeInput(n);
  }
  function subtract(n) {
    value -= normalizeInput(n);
  }
  function normalizeInput(n) {
    return isNumber(n) ? n : n.get();
  }
  const self = {
    get,
    set: set3,
    add,
    subtract
  };
  return self;
}
function Translate(axis, container) {
  const translate = axis.scroll === "x" ? x : y;
  const containerStyle = container.style;
  let previousTarget = null;
  let disabled = false;
  function x(n) {
    return `translate3d(${n}px,0px,0px)`;
  }
  function y(n) {
    return `translate3d(0px,${n}px,0px)`;
  }
  function to(target) {
    if (disabled) return;
    const newTarget = roundToTwoDecimals(axis.direction(target));
    if (newTarget === previousTarget) return;
    containerStyle.transform = translate(newTarget);
    previousTarget = newTarget;
  }
  function toggleActive(active) {
    disabled = !active;
  }
  function clear() {
    if (disabled) return;
    containerStyle.transform = "";
    if (!container.getAttribute("style")) container.removeAttribute("style");
  }
  const self = {
    clear,
    to,
    toggleActive
  };
  return self;
}
function SlideLooper(axis, viewSize, contentSize, slideSizes, slideSizesWithGaps, snaps, scrollSnaps, location, slides) {
  const roundingSafety = 0.5;
  const ascItems = arrayKeys(slideSizesWithGaps);
  const descItems = arrayKeys(slideSizesWithGaps).reverse();
  const loopPoints = startPoints().concat(endPoints());
  function removeSlideSizes(indexes, from) {
    return indexes.reduce((a, i) => {
      return a - slideSizesWithGaps[i];
    }, from);
  }
  function slidesInGap(indexes, gap) {
    return indexes.reduce((a, i) => {
      const remainingGap = removeSlideSizes(a, gap);
      return remainingGap > 0 ? a.concat([i]) : a;
    }, []);
  }
  function findSlideBounds(offset) {
    return snaps.map((snap, index) => ({
      start: snap - slideSizes[index] + roundingSafety + offset,
      end: snap + viewSize - roundingSafety + offset
    }));
  }
  function findLoopPoints(indexes, offset, isEndEdge) {
    const slideBounds = findSlideBounds(offset);
    return indexes.map((index) => {
      const initial = isEndEdge ? 0 : -contentSize;
      const altered = isEndEdge ? contentSize : 0;
      const boundEdge = isEndEdge ? "end" : "start";
      const loopPoint = slideBounds[index][boundEdge];
      return {
        index,
        loopPoint,
        slideLocation: Vector1D(-1),
        translate: Translate(axis, slides[index]),
        target: () => location.get() > loopPoint ? initial : altered
      };
    });
  }
  function startPoints() {
    const gap = scrollSnaps[0];
    const indexes = slidesInGap(descItems, gap);
    return findLoopPoints(indexes, contentSize, false);
  }
  function endPoints() {
    const gap = viewSize - scrollSnaps[0] - 1;
    const indexes = slidesInGap(ascItems, gap);
    return findLoopPoints(indexes, -contentSize, true);
  }
  function canLoop() {
    return loopPoints.every(({
      index
    }) => {
      const otherIndexes = ascItems.filter((i) => i !== index);
      return removeSlideSizes(otherIndexes, viewSize) <= 0.1;
    });
  }
  function loop() {
    loopPoints.forEach((loopPoint) => {
      const {
        target,
        translate,
        slideLocation
      } = loopPoint;
      const shiftLocation = target();
      if (shiftLocation === slideLocation.get()) return;
      translate.to(shiftLocation);
      slideLocation.set(shiftLocation);
    });
  }
  function clear() {
    loopPoints.forEach((loopPoint) => loopPoint.translate.clear());
  }
  const self = {
    canLoop,
    clear,
    loop,
    loopPoints
  };
  return self;
}
function SlidesHandler(container, eventHandler, watchSlides) {
  let mutationObserver;
  let destroyed = false;
  function init(emblaApi) {
    if (!watchSlides) return;
    function defaultCallback(mutations) {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          emblaApi.reInit();
          eventHandler.emit("slidesChanged");
          break;
        }
      }
    }
    mutationObserver = new MutationObserver((mutations) => {
      if (destroyed) return;
      if (isBoolean(watchSlides) || watchSlides(emblaApi, mutations)) {
        defaultCallback(mutations);
      }
    });
    mutationObserver.observe(container, {
      childList: true
    });
  }
  function destroy() {
    if (mutationObserver) mutationObserver.disconnect();
    destroyed = true;
  }
  const self = {
    init,
    destroy
  };
  return self;
}
function SlidesInView(container, slides, eventHandler, threshold) {
  const intersectionEntryMap = {};
  let inViewCache = null;
  let notInViewCache = null;
  let intersectionObserver;
  let destroyed = false;
  function init() {
    intersectionObserver = new IntersectionObserver((entries) => {
      if (destroyed) return;
      entries.forEach((entry) => {
        const index = slides.indexOf(entry.target);
        intersectionEntryMap[index] = entry;
      });
      inViewCache = null;
      notInViewCache = null;
      eventHandler.emit("slidesInView");
    }, {
      root: container.parentElement,
      threshold
    });
    slides.forEach((slide) => intersectionObserver.observe(slide));
  }
  function destroy() {
    if (intersectionObserver) intersectionObserver.disconnect();
    destroyed = true;
  }
  function createInViewList(inView) {
    return objectKeys(intersectionEntryMap).reduce((list, slideIndex) => {
      const index = parseInt(slideIndex);
      const {
        isIntersecting
      } = intersectionEntryMap[index];
      const inViewMatch = inView && isIntersecting;
      const notInViewMatch = !inView && !isIntersecting;
      if (inViewMatch || notInViewMatch) list.push(index);
      return list;
    }, []);
  }
  function get(inView = true) {
    if (inView && inViewCache) return inViewCache;
    if (!inView && notInViewCache) return notInViewCache;
    const slideIndexes = createInViewList(inView);
    if (inView) inViewCache = slideIndexes;
    if (!inView) notInViewCache = slideIndexes;
    return slideIndexes;
  }
  const self = {
    init,
    destroy,
    get
  };
  return self;
}
function SlideSizes(axis, containerRect, slideRects, slides, readEdgeGap, ownerWindow) {
  const {
    measureSize,
    startEdge,
    endEdge
  } = axis;
  const withEdgeGap = slideRects[0] && readEdgeGap;
  const startGap = measureStartGap();
  const endGap = measureEndGap();
  const slideSizes = slideRects.map(measureSize);
  const slideSizesWithGaps = measureWithGaps();
  function measureStartGap() {
    if (!withEdgeGap) return 0;
    const slideRect = slideRects[0];
    return mathAbs(containerRect[startEdge] - slideRect[startEdge]);
  }
  function measureEndGap() {
    if (!withEdgeGap) return 0;
    const style = ownerWindow.getComputedStyle(arrayLast(slides));
    return parseFloat(style.getPropertyValue(`margin-${endEdge}`));
  }
  function measureWithGaps() {
    return slideRects.map((rect, index, rects) => {
      const isFirst = !index;
      const isLast = arrayIsLastIndex(rects, index);
      if (isFirst) return slideSizes[index] + startGap;
      if (isLast) return slideSizes[index] + endGap;
      return rects[index + 1][startEdge] - rect[startEdge];
    }).map(mathAbs);
  }
  const self = {
    slideSizes,
    slideSizesWithGaps,
    startGap,
    endGap
  };
  return self;
}
function SlidesToScroll(axis, viewSize, slidesToScroll, loop, containerRect, slideRects, startGap, endGap, pixelTolerance) {
  const {
    startEdge,
    endEdge,
    direction
  } = axis;
  const groupByNumber = isNumber(slidesToScroll);
  function byNumber(array, groupSize) {
    return arrayKeys(array).filter((i) => i % groupSize === 0).map((i) => array.slice(i, i + groupSize));
  }
  function bySize(array) {
    if (!array.length) return [];
    return arrayKeys(array).reduce((groups, rectB, index) => {
      const rectA = arrayLast(groups) || 0;
      const isFirst = rectA === 0;
      const isLast = rectB === arrayLastIndex(array);
      const edgeA = containerRect[startEdge] - slideRects[rectA][startEdge];
      const edgeB = containerRect[startEdge] - slideRects[rectB][endEdge];
      const gapA = !loop && isFirst ? direction(startGap) : 0;
      const gapB = !loop && isLast ? direction(endGap) : 0;
      const chunkSize = mathAbs(edgeB - gapB - (edgeA + gapA));
      if (index && chunkSize > viewSize + pixelTolerance) groups.push(rectB);
      if (isLast) groups.push(array.length);
      return groups;
    }, []).map((currentSize, index, groups) => {
      const previousSize = Math.max(groups[index - 1] || 0);
      return array.slice(previousSize, currentSize);
    });
  }
  function groupSlides(array) {
    return groupByNumber ? byNumber(array, slidesToScroll) : bySize(array);
  }
  const self = {
    groupSlides
  };
  return self;
}
function Engine(root, container, slides, ownerDocument, ownerWindow, options, eventHandler) {
  const {
    align,
    axis: scrollAxis,
    direction,
    startIndex,
    loop,
    duration,
    dragFree,
    dragThreshold,
    inViewThreshold,
    slidesToScroll: groupSlides,
    skipSnaps,
    containScroll,
    watchResize,
    watchSlides,
    watchDrag,
    watchFocus
  } = options;
  const pixelTolerance = 2;
  const nodeRects = NodeRects();
  const containerRect = nodeRects.measure(container);
  const slideRects = slides.map(nodeRects.measure);
  const axis = Axis(scrollAxis, direction);
  const viewSize = axis.measureSize(containerRect);
  const percentOfView = PercentOfView(viewSize);
  const alignment = Alignment(align, viewSize);
  const containSnaps = !loop && !!containScroll;
  const readEdgeGap = loop || !!containScroll;
  const {
    slideSizes,
    slideSizesWithGaps,
    startGap,
    endGap
  } = SlideSizes(axis, containerRect, slideRects, slides, readEdgeGap, ownerWindow);
  const slidesToScroll = SlidesToScroll(axis, viewSize, groupSlides, loop, containerRect, slideRects, startGap, endGap, pixelTolerance);
  const {
    snaps,
    snapsAligned
  } = ScrollSnaps(axis, alignment, containerRect, slideRects, slidesToScroll);
  const contentSize = -arrayLast(snaps) + arrayLast(slideSizesWithGaps);
  const {
    snapsContained,
    scrollContainLimit
  } = ScrollContain(viewSize, contentSize, snapsAligned, containScroll, pixelTolerance);
  const scrollSnaps = containSnaps ? snapsContained : snapsAligned;
  const {
    limit
  } = ScrollLimit(contentSize, scrollSnaps, loop);
  const index = Counter(arrayLastIndex(scrollSnaps), startIndex, loop);
  const indexPrevious = index.clone();
  const slideIndexes = arrayKeys(slides);
  const update = ({
    dragHandler,
    scrollBody: scrollBody2,
    scrollBounds,
    options: {
      loop: loop2
    }
  }) => {
    if (!loop2) scrollBounds.constrain(dragHandler.pointerDown());
    scrollBody2.seek();
  };
  const render = ({
    scrollBody: scrollBody2,
    translate,
    location: location2,
    offsetLocation: offsetLocation2,
    previousLocation: previousLocation2,
    scrollLooper,
    slideLooper,
    dragHandler,
    animation: animation2,
    eventHandler: eventHandler2,
    scrollBounds,
    options: {
      loop: loop2
    }
  }, alpha) => {
    const shouldSettle = scrollBody2.settled();
    const withinBounds = !scrollBounds.shouldConstrain();
    const hasSettled = loop2 ? shouldSettle : shouldSettle && withinBounds;
    const hasSettledAndIdle = hasSettled && !dragHandler.pointerDown();
    if (hasSettledAndIdle) animation2.stop();
    const interpolatedLocation = location2.get() * alpha + previousLocation2.get() * (1 - alpha);
    offsetLocation2.set(interpolatedLocation);
    if (loop2) {
      scrollLooper.loop(scrollBody2.direction());
      slideLooper.loop();
    }
    translate.to(offsetLocation2.get());
    if (hasSettledAndIdle) eventHandler2.emit("settle");
    if (!hasSettled) eventHandler2.emit("scroll");
  };
  const animation = Animations(ownerDocument, ownerWindow, () => update(engine), (alpha) => render(engine, alpha));
  const friction = 0.68;
  const startLocation = scrollSnaps[index.get()];
  const location = Vector1D(startLocation);
  const previousLocation = Vector1D(startLocation);
  const offsetLocation = Vector1D(startLocation);
  const target = Vector1D(startLocation);
  const scrollBody = ScrollBody(location, offsetLocation, previousLocation, target, duration, friction);
  const scrollTarget = ScrollTarget(loop, scrollSnaps, contentSize, limit, target);
  const scrollTo = ScrollTo(animation, index, indexPrevious, scrollBody, scrollTarget, target, eventHandler);
  const scrollProgress = ScrollProgress(limit);
  const eventStore = EventStore();
  const slidesInView = SlidesInView(container, slides, eventHandler, inViewThreshold);
  const {
    slideRegistry
  } = SlideRegistry(containSnaps, containScroll, scrollSnaps, scrollContainLimit, slidesToScroll, slideIndexes);
  const slideFocus = SlideFocus(root, slides, slideRegistry, scrollTo, scrollBody, eventStore, eventHandler, watchFocus);
  const engine = {
    ownerDocument,
    ownerWindow,
    eventHandler,
    containerRect,
    slideRects,
    animation,
    axis,
    dragHandler: DragHandler(axis, root, ownerDocument, ownerWindow, target, DragTracker(axis, ownerWindow), location, animation, scrollTo, scrollBody, scrollTarget, index, eventHandler, percentOfView, dragFree, dragThreshold, skipSnaps, friction, watchDrag),
    eventStore,
    percentOfView,
    index,
    indexPrevious,
    limit,
    location,
    offsetLocation,
    previousLocation,
    options,
    resizeHandler: ResizeHandler(container, eventHandler, ownerWindow, slides, axis, watchResize, nodeRects),
    scrollBody,
    scrollBounds: ScrollBounds(limit, offsetLocation, target, scrollBody, percentOfView),
    scrollLooper: ScrollLooper(contentSize, limit, offsetLocation, [location, offsetLocation, previousLocation, target]),
    scrollProgress,
    scrollSnapList: scrollSnaps.map(scrollProgress.get),
    scrollSnaps,
    scrollTarget,
    scrollTo,
    slideLooper: SlideLooper(axis, viewSize, contentSize, slideSizes, slideSizesWithGaps, snaps, scrollSnaps, offsetLocation, slides),
    slideFocus,
    slidesHandler: SlidesHandler(container, eventHandler, watchSlides),
    slidesInView,
    slideIndexes,
    slideRegistry,
    slidesToScroll,
    target,
    translate: Translate(axis, container)
  };
  return engine;
}
function EventHandler() {
  let listeners = {};
  let api;
  function init(emblaApi) {
    api = emblaApi;
  }
  function getListeners(evt) {
    return listeners[evt] || [];
  }
  function emit(evt) {
    getListeners(evt).forEach((e) => e(api, evt));
    return self;
  }
  function on(evt, cb) {
    listeners[evt] = getListeners(evt).concat([cb]);
    return self;
  }
  function off(evt, cb) {
    listeners[evt] = getListeners(evt).filter((e) => e !== cb);
    return self;
  }
  function clear() {
    listeners = {};
  }
  const self = {
    init,
    emit,
    off,
    on,
    clear
  };
  return self;
}
var defaultOptions = {
  align: "center",
  axis: "x",
  container: null,
  slides: null,
  containScroll: "trimSnaps",
  direction: "ltr",
  slidesToScroll: 1,
  inViewThreshold: 0,
  breakpoints: {},
  dragFree: false,
  dragThreshold: 10,
  loop: false,
  skipSnaps: false,
  duration: 25,
  startIndex: 0,
  active: true,
  watchDrag: true,
  watchResize: true,
  watchSlides: true,
  watchFocus: true
};
function OptionsHandler(ownerWindow) {
  function mergeOptions(optionsA, optionsB) {
    return objectsMergeDeep(optionsA, optionsB || {});
  }
  function optionsAtMedia(options) {
    const optionsAtMedia2 = options.breakpoints || {};
    const matchedMediaOptions = objectKeys(optionsAtMedia2).filter((media) => ownerWindow.matchMedia(media).matches).map((media) => optionsAtMedia2[media]).reduce((a, mediaOption) => mergeOptions(a, mediaOption), {});
    return mergeOptions(options, matchedMediaOptions);
  }
  function optionsMediaQueries(optionsList) {
    return optionsList.map((options) => objectKeys(options.breakpoints || {})).reduce((acc, mediaQueries) => acc.concat(mediaQueries), []).map(ownerWindow.matchMedia);
  }
  const self = {
    mergeOptions,
    optionsAtMedia,
    optionsMediaQueries
  };
  return self;
}
function PluginsHandler(optionsHandler) {
  let activePlugins = [];
  function init(emblaApi, plugins) {
    activePlugins = plugins.filter(({
      options
    }) => optionsHandler.optionsAtMedia(options).active !== false);
    activePlugins.forEach((plugin) => plugin.init(emblaApi, optionsHandler));
    return plugins.reduce((map, plugin) => Object.assign(map, {
      [plugin.name]: plugin
    }), {});
  }
  function destroy() {
    activePlugins = activePlugins.filter((plugin) => plugin.destroy());
  }
  const self = {
    init,
    destroy
  };
  return self;
}
function EmblaCarousel(root, userOptions, userPlugins) {
  const ownerDocument = root.ownerDocument;
  const ownerWindow = ownerDocument.defaultView;
  const optionsHandler = OptionsHandler(ownerWindow);
  const pluginsHandler = PluginsHandler(optionsHandler);
  const mediaHandlers = EventStore();
  const eventHandler = EventHandler();
  const {
    mergeOptions,
    optionsAtMedia,
    optionsMediaQueries
  } = optionsHandler;
  const {
    on,
    off,
    emit
  } = eventHandler;
  const reInit = reActivate;
  let destroyed = false;
  let engine;
  let optionsBase = mergeOptions(defaultOptions, EmblaCarousel.globalOptions);
  let options = mergeOptions(optionsBase);
  let pluginList = [];
  let pluginApis;
  let container;
  let slides;
  function storeElements() {
    const {
      container: userContainer,
      slides: userSlides
    } = options;
    const customContainer = isString(userContainer) ? root.querySelector(userContainer) : userContainer;
    container = customContainer || root.children[0];
    const customSlides = isString(userSlides) ? container.querySelectorAll(userSlides) : userSlides;
    slides = [].slice.call(customSlides || container.children);
  }
  function createEngine(options2) {
    const engine2 = Engine(root, container, slides, ownerDocument, ownerWindow, options2, eventHandler);
    if (options2.loop && !engine2.slideLooper.canLoop()) {
      const optionsWithoutLoop = Object.assign({}, options2, {
        loop: false
      });
      return createEngine(optionsWithoutLoop);
    }
    return engine2;
  }
  function activate(withOptions, withPlugins) {
    if (destroyed) return;
    optionsBase = mergeOptions(optionsBase, withOptions);
    options = optionsAtMedia(optionsBase);
    pluginList = withPlugins || pluginList;
    storeElements();
    engine = createEngine(options);
    optionsMediaQueries([optionsBase, ...pluginList.map(({
      options: options2
    }) => options2)]).forEach((query3) => mediaHandlers.add(query3, "change", reActivate));
    if (!options.active) return;
    engine.translate.to(engine.location.get());
    engine.animation.init();
    engine.slidesInView.init();
    engine.slideFocus.init(self);
    engine.eventHandler.init(self);
    engine.resizeHandler.init(self);
    engine.slidesHandler.init(self);
    if (engine.options.loop) engine.slideLooper.loop();
    if (container.offsetParent && slides.length) engine.dragHandler.init(self);
    pluginApis = pluginsHandler.init(self, pluginList);
  }
  function reActivate(withOptions, withPlugins) {
    const startIndex = selectedScrollSnap();
    deActivate();
    activate(mergeOptions({
      startIndex
    }, withOptions), withPlugins);
    eventHandler.emit("reInit");
  }
  function deActivate() {
    engine.dragHandler.destroy();
    engine.eventStore.clear();
    engine.translate.clear();
    engine.slideLooper.clear();
    engine.resizeHandler.destroy();
    engine.slidesHandler.destroy();
    engine.slidesInView.destroy();
    engine.animation.destroy();
    pluginsHandler.destroy();
    mediaHandlers.clear();
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    mediaHandlers.clear();
    deActivate();
    eventHandler.emit("destroy");
    eventHandler.clear();
  }
  function scrollTo(index, jump, direction) {
    if (!options.active || destroyed) return;
    engine.scrollBody.useBaseFriction().useDuration(jump === true ? 0 : options.duration);
    engine.scrollTo.index(index, direction || 0);
  }
  function scrollNext(jump) {
    const next = engine.index.add(1).get();
    scrollTo(next, jump, -1);
  }
  function scrollPrev(jump) {
    const prev = engine.index.add(-1).get();
    scrollTo(prev, jump, 1);
  }
  function canScrollNext() {
    const next = engine.index.add(1).get();
    return next !== selectedScrollSnap();
  }
  function canScrollPrev() {
    const prev = engine.index.add(-1).get();
    return prev !== selectedScrollSnap();
  }
  function scrollSnapList() {
    return engine.scrollSnapList;
  }
  function scrollProgress() {
    return engine.scrollProgress.get(engine.offsetLocation.get());
  }
  function selectedScrollSnap() {
    return engine.index.get();
  }
  function previousScrollSnap() {
    return engine.indexPrevious.get();
  }
  function slidesInView() {
    return engine.slidesInView.get();
  }
  function slidesNotInView() {
    return engine.slidesInView.get(false);
  }
  function plugins() {
    return pluginApis;
  }
  function internalEngine() {
    return engine;
  }
  function rootNode() {
    return root;
  }
  function containerNode() {
    return container;
  }
  function slideNodes() {
    return slides;
  }
  const self = {
    canScrollNext,
    canScrollPrev,
    containerNode,
    internalEngine,
    destroy,
    off,
    on,
    emit,
    plugins,
    previousScrollSnap,
    reInit,
    rootNode,
    scrollNext,
    scrollPrev,
    scrollProgress,
    scrollSnapList,
    scrollTo,
    selectedScrollSnap,
    slideNodes,
    slidesInView,
    slidesNotInView
  };
  activate(userOptions, userPlugins);
  setTimeout(() => eventHandler.emit("init"), 0);
  return self;
}
EmblaCarousel.globalOptions = void 0;

// node_modules/.pnpm/embla-carousel-react@8.6.0_react@18.2.0/node_modules/embla-carousel-react/esm/embla-carousel-react.esm.js
function useEmblaCarousel(options = {}, plugins = []) {
  const storedOptions = (0, import_react7.useRef)(options);
  const storedPlugins = (0, import_react7.useRef)(plugins);
  const [emblaApi, setEmblaApi] = (0, import_react7.useState)();
  const [viewport, setViewport] = (0, import_react7.useState)();
  const reInit = (0, import_react7.useCallback)(() => {
    if (emblaApi) emblaApi.reInit(storedOptions.current, storedPlugins.current);
  }, [emblaApi]);
  (0, import_react7.useEffect)(() => {
    if (areOptionsEqual(storedOptions.current, options)) return;
    storedOptions.current = options;
    reInit();
  }, [options, reInit]);
  (0, import_react7.useEffect)(() => {
    if (arePluginsEqual(storedPlugins.current, plugins)) return;
    storedPlugins.current = plugins;
    reInit();
  }, [plugins, reInit]);
  (0, import_react7.useEffect)(() => {
    if (canUseDOM() && viewport) {
      EmblaCarousel.globalOptions = useEmblaCarousel.globalOptions;
      const newEmblaApi = EmblaCarousel(viewport, storedOptions.current, storedPlugins.current);
      setEmblaApi(newEmblaApi);
      return () => newEmblaApi.destroy();
    } else {
      setEmblaApi(void 0);
    }
  }, [viewport, setEmblaApi]);
  return [setViewport, emblaApi];
}
useEmblaCarousel.globalOptions = void 0;

// src/components/common/EmblaCarousel.jsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var import_meta3 = {};
function buildCloudinarySrcSet(publicId, cloudName) {
  if (!publicId || !cloudName) return null;
  const widths = [480, 768, 1024, 1400, 2e3];
  const parts = widths.map((w) => `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_${w}/${publicId} ${w}w`);
  return parts.join(", ");
}
function buildCloudinaryUrl(publicId, cloudName, w = 1400) {
  if (!publicId || !cloudName) return "";
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_${w}/${publicId}`;
}
function EmblaCarousel2({
  slides = [],
  autoPlayMs = 6e3,
  heightClass = "h-[46vh] md:h-[56vh] lg:h-[64vh]",
  contain = true,
  showThumbs = true
}) {
  const cloudName = typeof import_meta3 !== "undefined" && import_meta3.env?.VITE_CLOUDINARY_CLOUD_NAME || "";
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });
  (0, import_react8.useEffect)(() => {
    if (!emblaApi || !autoPlayMs) return void 0;
    const interval = setInterval(() => {
      try {
        emblaApi.scrollNext();
      } catch {
      }
    }, autoPlayMs);
    return () => clearInterval(interval);
  }, [emblaApi, autoPlayMs]);
  const onThumbClick = (0, import_react8.useCallback)((index) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);
  if (!slides.length) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "w-full", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "overflow-hidden rounded-xl", ref: emblaRef, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "flex touch-pan-y", children: slides.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "min-w-0 flex-[0_0_100%] relative", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: `w-full ${heightClass} bg-neutral-100`, children: s.node ? s.node : s.src || s.publicId ? (() => {
      const publicId = s.publicId || null;
      const src = s.src || (publicId ? buildCloudinaryUrl(publicId, cloudName, 1400) : "");
      const srcSet = publicId ? buildCloudinarySrcSet(publicId, cloudName) : null;
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
        "img",
        {
          src,
          srcSet: srcSet || void 0,
          sizes: "(min-width: 1024px) 100vw, 100vw",
          alt: s.alt || "",
          className: `w-full h-full ${contain ? "object-contain" : "object-cover"}`,
          loading: i === 0 ? "eager" : "lazy"
        }
      );
    })() : null }) }, (s.key || i) + "")) }) }),
    showThumbs && slides.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mt-3 flex justify-center gap-2", children: slides.map(
      (s, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
        "button",
        {
          className: "w-2.5 h-2.5 rounded-full bg-neutral-800/70 aria-[current=true]:bg-neutral-900",
          "aria-current": i === 0 ? void 0 : void 0,
          onClick: () => onThumbClick(i),
          "aria-label": `Go to slide ${i + 1}`
        },
        `t-${s.key || i}`
      )
    ) })
  ] });
}

// src/components/common/TestimonialsCarousel.jsx
var import_jsx_runtime6 = require("react/jsx-runtime");
function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function TestimonialsCarousel({ items: items2 = [], title = "Testimonials", headingExtra = null, maxLines = 5 }) {
  const [business, setBusiness] = (0, import_react9.useState)(null);
  (0, import_react9.useEffect)(() => {
    let mounted = true;
    fetch("/business.json").then((r) => r.ok ? r.json() : null).then((data) => {
      if (mounted) setBusiness(data || null);
    }).catch(() => {
    });
    return () => {
      mounted = false;
    };
  }, []);
  function parseDateFromContext(ctx) {
    if (!ctx) return void 0;
    const m = String(ctx).match(/[A-Za-z]{3,9} \d{1,2}, \d{4}/);
    if (!m) return void 0;
    const d = new Date(m[0]);
    if (isNaN(d)) return void 0;
    return d.toISOString().slice(0, 10);
  }
  const reviewsJsonLd = (0, import_react9.useMemo)(() => {
    if (!items2 || !items2.length) return null;
    const subj = {
      "@type": "ProfessionalService",
      name: business && business.name || "Local Effort",
      url: business && business.url || "https://localeffortfood.com/"
    };
    const graph = items2.slice(0, 20).map((t) => ({
      "@type": "Review",
      reviewBody: String(t.quote || "").trim(),
      author: { "@type": "Person", name: t.author || "Customer" },
      reviewRating: /5★/.test(String(t.context || "")) ? { "@type": "Rating", ratingValue: 5, bestRating: 5 } : void 0,
      publisher: t.context ? { "@type": "Organization", name: String(t.context).split("\xB7")[0].trim() } : void 0,
      datePublished: parseDateFromContext(t.context),
      itemReviewed: subj
    }));
    return { "@context": "https://schema.org", "@graph": graph };
  }, [items2, business]);
  const slides = (0, import_react9.useMemo)(() => {
    if (!items2.length) return [];
    const randomized = shuffle(items2);
    const groups = chunk(randomized, 3);
    return groups.map((group, idx) => ({
      key: `t-slide-${idx}`,
      node: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "grid md:grid-cols-3 gap-6", children: group.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(TestimonialCard, { t, maxLines }, i)) })
    }));
  }, [items2]);
  if (!slides.length) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8", children: [
    reviewsJsonLd && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("script", { type: "application/ld+json", children: JSON.stringify(reviewsJsonLd) }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mb-6 border-b border-neutral-300 pb-3 flex items-end justify-between gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "text-heading uppercase", children: title }),
      headingExtra
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(EmblaCarousel2, { slides, autoPlayMs: 7e3, contain: false, heightClass: "h-auto", showThumbs: false })
  ] });
}
function TestimonialCard({ t, maxLines = 5 }) {
  const [expanded, setExpanded] = (0, import_react9.useState)(false);
  const quote = String(t.quote || "").trim();
  const author = t.author || "Anonymous";
  const context = t.context;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("blockquote", { className: "p-6 rounded-xl bg-white shadow flex flex-col", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
      "p",
      {
        className: `text-body italic ${expanded ? "" : "line-clamp-" + maxLines}`,
        style: !expanded ? { display: "-webkit-box", WebkitLineClamp: maxLines, WebkitBoxOrient: "vertical", overflow: "hidden" } : void 0,
        children: [
          "\u201C",
          quote,
          "\u201D"
        ]
      }
    ),
    quote.length > 220 && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { className: "mt-2 text-sm underline self-start", onClick: () => setExpanded((v) => !v), "aria-expanded": expanded, children: expanded ? "See less" : "See more" }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("footer", { className: "mt-4 text-sm text-neutral-600", children: [
      "\u2014 ",
      author,
      context ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "block text-neutral-400 mt-1", children: context }) : null
    ] })
  ] });
}

// src/sanityClient.js
var import_client = require("@sanity/client");
var import_meta4 = {};
var rawBuildEnv = typeof import_meta4 !== "undefined" && import_meta4.env ? import_meta4.env : {};
var runtimeWindowEnv = typeof window !== "undefined" && window.__SANITY_CONFIG__ ? window.__SANITY_CONFIG__ : {};
var nodeEnv = typeof process !== "undefined" && process.env ? process.env : {};
var env = { ...nodeEnv, ...rawBuildEnv, ...runtimeWindowEnv };
var projectId = env.VITE_APP_SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID || env.SANITY_PROJECT_ID || env.PROJECT_ID;
var dataset = env.VITE_APP_SANITY_DATASET || env.VITE_SANITY_DATASET || env.SANITY_DATASET || env.DATASET;
var client = null;
try {
  if (projectId && dataset) {
    client = (0, import_client.createClient)({ projectId, dataset, useCdn: true, apiVersion: "2023-05-03" });
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

// src/pages/HomePage.jsx
var import_react17 = require("@portabletext/react");

// src/utils/portableTextComponents.jsx
var import_react10 = __toESM(require("react"));
var import_jsx_runtime7 = require("react/jsx-runtime");
var accentLinkClass = "text-[var(--color-accent)] underline underline-offset-4 decoration-[var(--color-accent)] hover:opacity-80 transition-colors";
function DefaultLink({ children, value }) {
  const href = typeof value?.href === "string" && value.href.trim() ? value.href : "#";
  const explicitTarget = value?.target || value?.blank;
  const isExternal = /^https?:/i.test(href);
  const shouldOpenNewTab = explicitTarget === "_blank" || explicitTarget === true || explicitTarget === void 0 && isExternal;
  const target = shouldOpenNewTab ? "_blank" : void 0;
  const rel = shouldOpenNewTab ? "noopener noreferrer" : void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("a", { href, target, rel, className: accentLinkClass, children });
}
function createPortableTextComponents(overrides = {}) {
  const providedMarks = overrides.marks || {};
  return {
    ...overrides,
    marks: {
      link: DefaultLink,
      ...providedMarks
    }
  };
}
var portableTextComponents = createPortableTextComponents();

// src/components/ui/SectionHeader.jsx
var import_react11 = __toESM(require("react"));
var import_jsx_runtime8 = require("react/jsx-runtime");
function SectionHeader({ overline, title, className = "" }) {
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: ["space-y-2", className].filter(Boolean).join(" "), children: [
    overline ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "heading-overline", children: overline }) : null,
    title ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("h2", { className: "heading-xl heading-balance", children: title }) : null
  ] });
}

// src/components/ui/Separator.jsx
var import_react12 = __toESM(require("react"));
var import_jsx_runtime9 = require("react/jsx-runtime");
function Separator({ className = "", orientation = "horizontal", decorative = true, ...props }) {
  const isHorizontal = orientation !== "vertical";
  const base = isHorizontal ? "h-px w-full my-12" : "w-px h-full mx-4";
  const classes = [base, "bg-neutral-200", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { role: decorative ? "none" : "separator", "aria-orientation": orientation, className: classes, ...props });
}

// src/components/home/GiftCardDialog.jsx
var import_react14 = __toESM(require("react"));
var import_react_helmet_async = __toESM(require_lib());
var import_lucide_react2 = require("lucide-react");

// src/components/ui/dialog.jsx
var React27 = __toESM(require("react"));

// node_modules/.pnpm/@radix-ui+react-dialog@1.1.15_@types+react-dom@18.3.1_@types+react@19.2.0_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/@radix-ui/react-dialog/dist/index.mjs
var React26 = __toESM(require("react"), 1);

// node_modules/.pnpm/@radix-ui+primitive@1.1.3/node_modules/@radix-ui/primitive/dist/index.mjs
var canUseDOM2 = !!(typeof window !== "undefined" && window.document && window.document.createElement);
function composeEventHandlers(originalEventHandler, ourEventHandler, { checkForDefaultPrevented = true } = {}) {
  return function handleEvent(event) {
    originalEventHandler?.(event);
    if (checkForDefaultPrevented === false || !event.defaultPrevented) {
      return ourEventHandler?.(event);
    }
  };
}

// node_modules/.pnpm/@radix-ui+react-compose-refs@1.1.2_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-compose-refs/dist/index.mjs
var React10 = __toESM(require("react"), 1);
function setRef(ref3, value) {
  if (typeof ref3 === "function") {
    return ref3(value);
  } else if (ref3 !== null && ref3 !== void 0) {
    ref3.current = value;
  }
}
function composeRefs(...refs) {
  return (node) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref3) => {
      const cleanup = setRef(ref3, node);
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
  return React10.useCallback(composeRefs(...refs), refs);
}

// node_modules/.pnpm/@radix-ui+react-context@1.1.2_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-context/dist/index.mjs
var React11 = __toESM(require("react"), 1);
var import_jsx_runtime10 = require("react/jsx-runtime");
function createContext2(rootComponentName, defaultContext) {
  const Context = React11.createContext(defaultContext);
  const Provider = (props) => {
    const { children, ...context } = props;
    const value = React11.useMemo(() => context, Object.values(context));
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Context.Provider, { value, children });
  };
  Provider.displayName = rootComponentName + "Provider";
  function useContext22(consumerName) {
    const context = React11.useContext(Context);
    if (context) return context;
    if (defaultContext !== void 0) return defaultContext;
    throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
  }
  return [Provider, useContext22];
}
function createContextScope(scopeName, createContextScopeDeps = []) {
  let defaultContexts = [];
  function createContext32(rootComponentName, defaultContext) {
    const BaseContext = React11.createContext(defaultContext);
    const index = defaultContexts.length;
    defaultContexts = [...defaultContexts, defaultContext];
    const Provider = (props) => {
      const { scope, children, ...context } = props;
      const Context = scope?.[scopeName]?.[index] || BaseContext;
      const value = React11.useMemo(() => context, Object.values(context));
      return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Context.Provider, { value, children });
    };
    Provider.displayName = rootComponentName + "Provider";
    function useContext22(consumerName, scope) {
      const Context = scope?.[scopeName]?.[index] || BaseContext;
      const context = React11.useContext(Context);
      if (context) return context;
      if (defaultContext !== void 0) return defaultContext;
      throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
    }
    return [Provider, useContext22];
  }
  const createScope = () => {
    const scopeContexts = defaultContexts.map((defaultContext) => {
      return React11.createContext(defaultContext);
    });
    return function useScope(scope) {
      const contexts = scope?.[scopeName] || scopeContexts;
      return React11.useMemo(
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
      return React11.useMemo(() => ({ [`__scope${baseScope.scopeName}`]: nextScopes }), [nextScopes]);
    };
  };
  createScope.scopeName = baseScope.scopeName;
  return createScope;
}

// node_modules/.pnpm/@radix-ui+react-id@1.1.1_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-id/dist/index.mjs
var React13 = __toESM(require("react"), 1);

// node_modules/.pnpm/@radix-ui+react-use-layout-effect@1.1.1_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-use-layout-effect/dist/index.mjs
var React12 = __toESM(require("react"), 1);
var useLayoutEffect2 = globalThis?.document ? React12.useLayoutEffect : () => {
};

// node_modules/.pnpm/@radix-ui+react-id@1.1.1_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-id/dist/index.mjs
var useReactId = React13[" useId ".trim().toString()] || (() => void 0);
var count = 0;
function useId(deterministicId) {
  const [id, setId] = React13.useState(useReactId());
  useLayoutEffect2(() => {
    if (!deterministicId) setId((reactId) => reactId ?? String(count++));
  }, [deterministicId]);
  return deterministicId || (id ? `radix-${id}` : "");
}

// node_modules/.pnpm/@radix-ui+react-use-controllable-state@1.2.2_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-use-controllable-state/dist/index.mjs
var React14 = __toESM(require("react"), 1);
var React22 = __toESM(require("react"), 1);
var useInsertionEffect = React14[" useInsertionEffect ".trim().toString()] || useLayoutEffect2;
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
    const isControlledRef = React14.useRef(prop !== void 0);
    React14.useEffect(() => {
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
  const setValue = React14.useCallback(
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
  const [value, setValue] = React14.useState(defaultProp);
  const prevValueRef = React14.useRef(value);
  const onChangeRef = React14.useRef(onChange);
  useInsertionEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  React14.useEffect(() => {
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
var React19 = __toESM(require("react"), 1);

// node_modules/.pnpm/@radix-ui+react-primitive@2.1.3_@types+react-dom@18.3.1_@types+react@19.2.0_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/@radix-ui/react-primitive/dist/index.mjs
var React16 = __toESM(require("react"), 1);
var ReactDOM = __toESM(require("react-dom"), 1);

// node_modules/.pnpm/@radix-ui+react-slot@1.2.3_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-slot/dist/index.mjs
var React15 = __toESM(require("react"), 1);
var import_jsx_runtime11 = require("react/jsx-runtime");
// @__NO_SIDE_EFFECTS__
function createSlot(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone(ownerName);
  const Slot2 = React15.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    const childrenArray = React15.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (React15.Children.count(newElement) > 1) return React15.Children.only(null);
          return React15.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(SlotClone, { ...slotProps, ref: forwardedRef, children: React15.isValidElement(newElement) ? React15.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
// @__NO_SIDE_EFFECTS__
function createSlotClone(ownerName) {
  const SlotClone = React15.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    if (React15.isValidElement(children)) {
      const childrenRef = getElementRef(children);
      const props2 = mergeProps(slotProps, children.props);
      if (children.type !== React15.Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return React15.cloneElement(children, props2);
    }
    return React15.Children.count(children) > 1 ? React15.Children.only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER = Symbol("radix.slottable");
function isSlottable(child) {
  return React15.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER;
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
var import_jsx_runtime12 = require("react/jsx-runtime");
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
  const Node2 = React16.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot2 : node;
    if (typeof window !== "undefined") {
      window[Symbol.for("radix-ui")] = true;
    }
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node2.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node2 };
}, {});
function dispatchDiscreteCustomEvent(target, event) {
  if (target) ReactDOM.flushSync(() => target.dispatchEvent(event));
}

// node_modules/.pnpm/@radix-ui+react-use-callback-ref@1.1.1_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs
var React17 = __toESM(require("react"), 1);
function useCallbackRef(callback) {
  const callbackRef = React17.useRef(callback);
  React17.useEffect(() => {
    callbackRef.current = callback;
  });
  return React17.useMemo(() => (...args) => callbackRef.current?.(...args), []);
}

// node_modules/.pnpm/@radix-ui+react-use-escape-keydown@1.1.1_@types+react@19.2.0_react@18.2.0/node_modules/@radix-ui/react-use-escape-keydown/dist/index.mjs
var React18 = __toESM(require("react"), 1);
function useEscapeKeydown(onEscapeKeyDownProp, ownerDocument = globalThis?.document) {
  const onEscapeKeyDown = useCallbackRef(onEscapeKeyDownProp);
  React18.useEffect(() => {
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
var import_jsx_runtime13 = require("react/jsx-runtime");
var DISMISSABLE_LAYER_NAME = "DismissableLayer";
var CONTEXT_UPDATE = "dismissableLayer.update";
var POINTER_DOWN_OUTSIDE = "dismissableLayer.pointerDownOutside";
var FOCUS_OUTSIDE = "dismissableLayer.focusOutside";
var originalBodyPointerEvents;
var DismissableLayerContext = React19.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set()
});
var DismissableLayer = React19.forwardRef(
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
    const context = React19.useContext(DismissableLayerContext);
    const [node, setNode] = React19.useState(null);
    const ownerDocument = node?.ownerDocument ?? globalThis?.document;
    const [, force] = React19.useState({});
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
    React19.useEffect(() => {
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
    React19.useEffect(() => {
      return () => {
        if (!node) return;
        context.layers.delete(node);
        context.layersWithOutsidePointerEventsDisabled.delete(node);
        dispatchUpdate();
      };
    }, [node, context]);
    React19.useEffect(() => {
      const handleUpdate = () => force({});
      document.addEventListener(CONTEXT_UPDATE, handleUpdate);
      return () => document.removeEventListener(CONTEXT_UPDATE, handleUpdate);
    }, []);
    return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
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
var DismissableLayerBranch = React19.forwardRef((props, forwardedRef) => {
  const context = React19.useContext(DismissableLayerContext);
  const ref3 = React19.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, ref3);
  React19.useEffect(() => {
    const node = ref3.current;
    if (node) {
      context.branches.add(node);
      return () => {
        context.branches.delete(node);
      };
    }
  }, [context.branches]);
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(Primitive.div, { ...props, ref: composedRefs });
});
DismissableLayerBranch.displayName = BRANCH_NAME;
function usePointerDownOutside(onPointerDownOutside, ownerDocument = globalThis?.document) {
  const handlePointerDownOutside = useCallbackRef(onPointerDownOutside);
  const isPointerInsideReactTreeRef = React19.useRef(false);
  const handleClickRef = React19.useRef(() => {
  });
  React19.useEffect(() => {
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
  const isFocusInsideReactTreeRef = React19.useRef(false);
  React19.useEffect(() => {
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
function handleAndDispatchCustomEvent(name2, handler, detail, { discrete }) {
  const target = detail.originalEvent.target;
  const event = new CustomEvent(name2, { bubbles: false, cancelable: true, detail });
  if (handler) target.addEventListener(name2, handler, { once: true });
  if (discrete) {
    dispatchDiscreteCustomEvent(target, event);
  } else {
    target.dispatchEvent(event);
  }
}

// node_modules/.pnpm/@radix-ui+react-focus-scope@1.1.7_@types+react-dom@18.3.1_@types+react@19.2.0_react-dom@18.2._dhkdyyxeakawqe2hoiycn4cg2m/node_modules/@radix-ui/react-focus-scope/dist/index.mjs
var React20 = __toESM(require("react"), 1);
var import_jsx_runtime14 = require("react/jsx-runtime");
var AUTOFOCUS_ON_MOUNT = "focusScope.autoFocusOnMount";
var AUTOFOCUS_ON_UNMOUNT = "focusScope.autoFocusOnUnmount";
var EVENT_OPTIONS = { bubbles: false, cancelable: true };
var FOCUS_SCOPE_NAME = "FocusScope";
var FocusScope = React20.forwardRef((props, forwardedRef) => {
  const {
    loop = false,
    trapped = false,
    onMountAutoFocus: onMountAutoFocusProp,
    onUnmountAutoFocus: onUnmountAutoFocusProp,
    ...scopeProps
  } = props;
  const [container, setContainer] = React20.useState(null);
  const onMountAutoFocus = useCallbackRef(onMountAutoFocusProp);
  const onUnmountAutoFocus = useCallbackRef(onUnmountAutoFocusProp);
  const lastFocusedElementRef = React20.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, (node) => setContainer(node));
  const focusScope = React20.useRef({
    paused: false,
    pause() {
      this.paused = true;
    },
    resume() {
      this.paused = false;
    }
  }).current;
  React20.useEffect(() => {
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
  React20.useEffect(() => {
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
  const handleKeyDown = React20.useCallback(
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
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Primitive.div, { tabIndex: -1, ...scopeProps, ref: composedRefs, onKeyDown: handleKeyDown });
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
function removeLinks(items2) {
  return items2.filter((item) => item.tagName !== "A");
}

// node_modules/.pnpm/@radix-ui+react-portal@1.1.9_@types+react-dom@18.3.1_@types+react@19.2.0_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/@radix-ui/react-portal/dist/index.mjs
var React21 = __toESM(require("react"), 1);
var import_react_dom = __toESM(require("react-dom"), 1);
var import_jsx_runtime15 = require("react/jsx-runtime");
var PORTAL_NAME = "Portal";
var Portal = React21.forwardRef((props, forwardedRef) => {
  const { container: containerProp, ...portalProps } = props;
  const [mounted, setMounted] = React21.useState(false);
  useLayoutEffect2(() => setMounted(true), []);
  const container = containerProp || mounted && globalThis?.document?.body;
  return container ? import_react_dom.default.createPortal(/* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Primitive.div, { ...portalProps, ref: forwardedRef }), container) : null;
});
Portal.displayName = PORTAL_NAME;

// node_modules/.pnpm/@radix-ui+react-presence@1.1.5_@types+react-dom@18.3.1_@types+react@19.2.0_react-dom@18.2.0_react@18.2.0__react@18.2.0/node_modules/@radix-ui/react-presence/dist/index.mjs
var React23 = __toESM(require("react"), 1);
var React24 = __toESM(require("react"), 1);
function useStateMachine(initialState, machine) {
  return React24.useReducer((state, event) => {
    const nextState = machine[state][event];
    return nextState ?? state;
  }, initialState);
}
var Presence = (props) => {
  const { present, children } = props;
  const presence = usePresence(present);
  const child = typeof children === "function" ? children({ present: presence.isPresent }) : React23.Children.only(children);
  const ref3 = useComposedRefs(presence.ref, getElementRef2(child));
  const forceMount = typeof children === "function";
  return forceMount || presence.isPresent ? React23.cloneElement(child, { ref: ref3 }) : null;
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
var React25 = __toESM(require("react"), 1);
var count2 = 0;
function useFocusGuards() {
  React25.useEffect(() => {
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
var import_jsx_runtime16 = require("react/jsx-runtime");
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
  const triggerRef = React26.useRef(null);
  const contentRef = React26.useRef(null);
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
    caller: DIALOG_NAME
  });
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
      onOpenToggle: React26.useCallback(() => setOpen((prevOpen) => !prevOpen), [setOpen]),
      modal: modal2,
      children
    }
  );
};
Dialog.displayName = DIALOG_NAME;
var TRIGGER_NAME = "DialogTrigger";
var DialogTrigger = React26.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...triggerProps } = props;
    const context = useDialogContext(TRIGGER_NAME, __scopeDialog);
    const composedTriggerRef = useComposedRefs(forwardedRef, context.triggerRef);
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(PortalProvider, { scope: __scopeDialog, forceMount, children: React26.Children.map(children, (child) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Presence, { present: forceMount || context.open, children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Portal, { asChild: true, container, children: child }) })) });
};
DialogPortal.displayName = PORTAL_NAME2;
var OVERLAY_NAME = "DialogOverlay";
var DialogOverlay = React26.forwardRef(
  (props, forwardedRef) => {
    const portalContext = usePortalContext(OVERLAY_NAME, props.__scopeDialog);
    const { forceMount = portalContext.forceMount, ...overlayProps } = props;
    const context = useDialogContext(OVERLAY_NAME, props.__scopeDialog);
    return context.modal ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Presence, { present: forceMount || context.open, children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(DialogOverlayImpl, { ...overlayProps, ref: forwardedRef }) }) : null;
  }
);
DialogOverlay.displayName = OVERLAY_NAME;
var Slot = createSlot("DialogOverlay.RemoveScroll");
var DialogOverlayImpl = React26.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...overlayProps } = props;
    const context = useDialogContext(OVERLAY_NAME, __scopeDialog);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(import_react_remove_scroll.RemoveScroll, { as: Slot, allowPinchZoom: true, shards: [context.contentRef], children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
var DialogContent = React26.forwardRef(
  (props, forwardedRef) => {
    const portalContext = usePortalContext(CONTENT_NAME, props.__scopeDialog);
    const { forceMount = portalContext.forceMount, ...contentProps } = props;
    const context = useDialogContext(CONTENT_NAME, props.__scopeDialog);
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Presence, { present: forceMount || context.open, children: context.modal ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(DialogContentModal, { ...contentProps, ref: forwardedRef }) : /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(DialogContentNonModal, { ...contentProps, ref: forwardedRef }) });
  }
);
DialogContent.displayName = CONTENT_NAME;
var DialogContentModal = React26.forwardRef(
  (props, forwardedRef) => {
    const context = useDialogContext(CONTENT_NAME, props.__scopeDialog);
    const contentRef = React26.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, context.contentRef, contentRef);
    React26.useEffect(() => {
      const content = contentRef.current;
      if (content) return (0, import_aria_hidden.hideOthers)(content);
    }, []);
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
var DialogContentNonModal = React26.forwardRef(
  (props, forwardedRef) => {
    const context = useDialogContext(CONTENT_NAME, props.__scopeDialog);
    const hasInteractedOutsideRef = React26.useRef(false);
    const hasPointerDownOutsideRef = React26.useRef(false);
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
var DialogContentImpl = React26.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, trapFocus, onOpenAutoFocus, onCloseAutoFocus, ...contentProps } = props;
    const context = useDialogContext(CONTENT_NAME, __scopeDialog);
    const contentRef = React26.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, contentRef);
    useFocusGuards();
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
        FocusScope,
        {
          asChild: true,
          loop: true,
          trapped: trapFocus,
          onMountAutoFocus: onOpenAutoFocus,
          onUnmountAutoFocus: onCloseAutoFocus,
          children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(TitleWarning, { titleId: context.titleId }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(DescriptionWarning, { contentRef, descriptionId: context.descriptionId })
      ] })
    ] });
  }
);
var TITLE_NAME = "DialogTitle";
var DialogTitle = React26.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...titleProps } = props;
    const context = useDialogContext(TITLE_NAME, __scopeDialog);
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Primitive.h2, { id: context.titleId, ...titleProps, ref: forwardedRef });
  }
);
DialogTitle.displayName = TITLE_NAME;
var DESCRIPTION_NAME = "DialogDescription";
var DialogDescription = React26.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...descriptionProps } = props;
    const context = useDialogContext(DESCRIPTION_NAME, __scopeDialog);
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Primitive.p, { id: context.descriptionId, ...descriptionProps, ref: forwardedRef });
  }
);
DialogDescription.displayName = DESCRIPTION_NAME;
var CLOSE_NAME = "DialogClose";
var DialogClose = React26.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...closeProps } = props;
    const context = useDialogContext(CLOSE_NAME, __scopeDialog);
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
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
var [WarningProvider, useWarningContext] = createContext2(TITLE_WARNING_NAME, {
  contentName: CONTENT_NAME,
  titleName: TITLE_NAME,
  docsSlug: "dialog"
});
var TitleWarning = ({ titleId }) => {
  const titleWarningContext = useWarningContext(TITLE_WARNING_NAME);
  const MESSAGE = `\`${titleWarningContext.contentName}\` requires a \`${titleWarningContext.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${titleWarningContext.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${titleWarningContext.docsSlug}`;
  React26.useEffect(() => {
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
  React26.useEffect(() => {
    const describedById = contentRef.current?.getAttribute("aria-describedby");
    if (descriptionId && describedById) {
      const hasDescription = document.getElementById(descriptionId);
      if (!hasDescription) console.warn(MESSAGE);
    }
  }, [MESSAGE, contentRef, descriptionId]);
  return null;
};
var Root = Dialog;
var Trigger = DialogTrigger;
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
  const push3 = (v) => {
    if (v) classes.push(String(v));
  };
  const walk = (a) => {
    for (const x of a) {
      const t = typeof x;
      if (!x) continue;
      if (t === "string" || t === "number") {
        push3(x);
        continue;
      }
      if (Array.isArray(x)) {
        walk(x);
        continue;
      }
      if (t === "object") {
        for (const k in x) if (Object.prototype.hasOwnProperty.call(x, k) && x[k]) push3(k);
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
var import_jsx_runtime17 = require("react/jsx-runtime");
var Dialog2 = Root;
var DialogTrigger2 = Trigger;
var DialogPortal2 = ({ className, children, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(Portal2, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: cn("fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto sm:items-center", className), children }) });
DialogPortal2.displayName = Portal2.displayName;
var DialogOverlay2 = React27.forwardRef(({ className, ...props }, ref3) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
  Overlay,
  {
    ref: ref3,
    className: cn("fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0", className),
    ...props
  }
));
DialogOverlay2.displayName = Overlay.displayName;
var DialogContent2 = React27.forwardRef(({ className, children, ...props }, ref3) => /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(DialogPortal2, { children: [
  /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(DialogOverlay2, {}),
  /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
    Content,
    {
      ref: ref3,
      className: cn(
        "relative z-[1000] m-4 w-full max-w-2xl origin-center scale-100 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 sm:m-6",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(Close, { className: "absolute right-5 top-5 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { className: "sr-only", children: "Close" }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(import_lucide_react.X, { className: "h-4 w-4" })
        ] })
      ]
    }
  )
] }));
DialogContent2.displayName = Content.displayName;
var DialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: cn("flex flex-col space-y-2 text-center sm:text-left", className), ...props });
DialogHeader.displayName = "DialogHeader";
var DialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className), ...props });
DialogFooter.displayName = "DialogFooter";
var DialogTitle2 = React27.forwardRef(({ className, ...props }, ref3) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(Title, { ref: ref3, className: cn("text-left text-2xl font-semibold text-slate-900", className), ...props }));
DialogTitle2.displayName = Title.displayName;
var DialogDescription2 = React27.forwardRef(({ className, ...props }, ref3) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(Description, { ref: ref3, className: cn("text-left text-sm text-slate-600", className), ...props }));
DialogDescription2.displayName = Description.displayName;

// src/hooks/useSquareCard.js
var import_react13 = require("react");
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
  const paymentsRef = (0, import_react13.useRef)(null);
  const cardRef = (0, import_react13.useRef)(null);
  const [cardLoaded, setCardLoaded] = (0, import_react13.useState)(false);
  const [attempts, setAttempts] = (0, import_react13.useState)(0);
  const attemptsRef = (0, import_react13.useRef)(0);
  const [error, setError] = (0, import_react13.useState)("");
  const [loadingScript, setLoadingScript] = (0, import_react13.useState)(false);
  const attachStartedRef = (0, import_react13.useRef)(false);
  const securityState = getSquareSecurityState();
  const [envInfo, setEnvInfo] = (0, import_react13.useState)({
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
  const cleanupContainer = (0, import_react13.useCallback)(() => {
    if (typeof document === "undefined") return;
    try {
      const node = typeof containerId === "string" ? document.querySelector(containerId) : containerId;
      if (node && node.childNodes && node.childNodes.length > 0) {
        node.innerHTML = "";
      }
    } catch (_) {
    }
  }, [containerId]);
  const destroyCardInstance = (0, import_react13.useCallback)(() => {
    const card = cardRef.current;
    cardRef.current = null;
    attachStartedRef.current = false;
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
  const reset = (0, import_react13.useCallback)(() => {
    try {
      destroyCardInstance();
      paymentsRef.current = null;
      setError("");
      setAttempts(0);
      attemptsRef.current = 0;
    } catch (_) {
    }
  }, [destroyCardInstance]);
  (0, import_react13.useEffect)(() => {
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
  (0, import_react13.useEffect)(() => {
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
  (0, import_react13.useEffect)(() => {
    setEnvInfo((info) => ({ ...info, attempts }));
  }, [attempts]);
  const tokenize = async () => {
    if (!cardRef.current) throw new Error(error || "Card form not ready");
    const result = await cardRef.current.tokenize();
    if (result.status !== "OK") {
      const first = result?.errors?.[0];
      const msg = first?.message || first?.code || result.status || "Card details invalid";
      throw new Error(msg);
    }
    return result.token;
  };
  return { cardLoaded, error, loadingScript, tokenize, reset, envInfo };
}

// src/components/home/GiftCardDialog.jsx
var import_jsx_runtime18 = require("react/jsx-runtime");
var presetAmounts = [100, 150, 200, 250, 350, 500];
var initialForm = {
  amount: 150,
  customAmount: "",
  cardType: "digital",
  deliveryTarget: "recipient",
  shipTo: "recipient",
  sendOn: "",
  buyerName: "",
  buyerEmail: "",
  buyerPhone: "",
  recipientName: "",
  recipientEmail: "",
  recipientPhone: "",
  note: "",
  shippingLine1: "",
  shippingLine2: "",
  shippingCity: "",
  shippingState: "",
  shippingPostal: ""
};
var normalizeAmount = (amount, customValue) => {
  if (customValue) {
    const value = Number(customValue);
    if (!Number.isNaN(value) && value > 0) {
      return value;
    }
  }
  return amount;
};
var GiftCardDialog = ({ className = "" }) => {
  const defaultSiteUrl = "https://localeffort.app";
  const siteUrl = typeof window !== "undefined" ? window.location.origin : defaultSiteUrl;
  const giftCardImage = heroFallbackSrc ? heroFallbackSrc.startsWith("http") ? heroFallbackSrc : `${siteUrl}${heroFallbackSrc}` : void 0;
  const productSchema = (0, import_react14.useMemo)(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Local Effort Gift Card",
      description: "Local Effort gift cards cover private chef dinners, pizza parties, and hospitality across Minneapolis-St. Paul.",
      brand: { "@type": "Organization", name: "Local Effort" },
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: "50",
        highPrice: "500",
        availability: "https://schema.org/InStock",
        url: `${siteUrl}/#gift-cards`
      }
    };
    if (giftCardImage) {
      schema.image = [giftCardImage];
    }
    return schema;
  }, [giftCardImage, siteUrl]);
  const [open, setOpen] = (0, import_react14.useState)(false);
  const [form, setForm] = (0, import_react14.useState)(initialForm);
  const [status, setStatus] = (0, import_react14.useState)("idle");
  const [error, setError] = (0, import_react14.useState)("");
  const [success, setSuccess] = (0, import_react14.useState)(null);
  const amountValue = (0, import_react14.useMemo)(() => normalizeAmount(form.amount, form.customAmount), [form.amount, form.customAmount]);
  const canChoosePhysical = amountValue >= 250;
  const { cardLoaded, error: squareError, tokenize, reset: resetSquare } = useSquareCard("#gift-card-card-container", open, [amountValue]);
  const handleDialogOpenChange = (0, import_react14.useCallback)((nextOpen) => {
    if (!nextOpen) {
      resetSquare();
      setForm(initialForm);
      setStatus("idle");
      setError("");
      setSuccess(null);
    }
    setOpen(nextOpen);
  }, [resetSquare]);
  (0, import_react14.useEffect)(() => {
    if (!canChoosePhysical && form.cardType === "physical") {
      setForm((prev) => ({ ...prev, cardType: "digital" }));
    }
  }, [canChoosePhysical, form.cardType]);
  (0, import_react14.useEffect)(() => {
    if (form.cardType !== "digital" || form.deliveryTarget !== "recipient") {
      setForm((prev) => prev.sendOn ? { ...prev, sendOn: "" } : prev);
    }
  }, [form.cardType, form.deliveryTarget]);
  const handleAmountClick = (value) => {
    setForm((prev) => ({ ...prev, amount: value, customAmount: "" }));
  };
  const handleInputChange = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === "processing") return;
    const resolvedAmount = amountValue;
    if (!resolvedAmount || resolvedAmount < 50) {
      setError("Gift card must be at least $50.");
      return;
    }
    const { buyerName, buyerEmail, recipientEmail, cardType, deliveryTarget, sendOn } = form;
    if (!buyerName.trim() || !buyerEmail.trim()) {
      setError("Buyer name and email are required.");
      return;
    }
    if (deliveryTarget === "recipient" && !recipientEmail.trim()) {
      setError("Recipient email is required when sending directly to them.");
      return;
    }
    if (sendOn && cardType !== "digital") {
      setError("Scheduled delivery is only available for digital gift cards.");
      return;
    }
    let sendOnIso = null;
    if (sendOn) {
      const parsed = new Date(sendOn);
      if (Number.isNaN(parsed.getTime())) {
        setError("Please provide a valid send date.");
        return;
      }
      const now = /* @__PURE__ */ new Date();
      const minAhead = 5 * 60 * 1e3;
      if (parsed.getTime() <= now.getTime() + minAhead) {
        setError("Please choose a send time at least 5 minutes from now.");
        return;
      }
      sendOnIso = parsed.toISOString();
    }
    if (cardType === "physical") {
      if (!form.shippingLine1.trim() || !form.shippingCity.trim() || !form.shippingState.trim() || !form.shippingPostal.trim()) {
        setError("Complete shipping details are required for physical cards.");
        return;
      }
    }
    try {
      setStatus("processing");
      setError("");
      const token = await tokenize();
      const payload = {
        amount: resolvedAmount,
        token,
        cardType,
        deliveryTarget,
        note: form.note,
        buyer: {
          name: form.buyerName,
          email: form.buyerEmail,
          phone: form.buyerPhone
        },
        recipient: {
          name: form.recipientName,
          email: form.recipientEmail,
          phone: form.recipientPhone
        },
        sendOn: sendOnIso,
        shipping: cardType === "physical" ? {
          shipTo: form.shipTo,
          address: {
            line1: form.shippingLine1,
            line2: form.shippingLine2,
            city: form.shippingCity,
            state: form.shippingState,
            postal: form.shippingPostal
          }
        } : null
      };
      const response = await fetch("/api/store/gift-card-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Checkout failed");
      }
      const data = await response.json();
      setSuccess({
        code: data.code,
        amount: data.amount,
        cardType: data.cardType,
        deliveryTarget,
        sendOn: data.sendOn || sendOnIso
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err?.message || "Something went wrong while processing your gift card.");
    }
  };
  const amountLabel = (0, import_react14.useMemo)(() => `$${amountValue.toFixed(2)}`, [amountValue]);
  const disableSubmit = !cardLoaded || status === "processing";
  const minSendOn = (0, import_react14.useMemo)(() => {
    const base = /* @__PURE__ */ new Date();
    base.setMinutes(base.getMinutes() + 10);
    return base.toISOString().slice(0, 16);
  }, [open]);
  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      if (Number.isNaN(date.getTime())) return "";
      return new Intl.DateTimeFormat(void 0, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
    } catch (err) {
      return "";
    }
  };
  const renderSuccess = () => {
    const scheduledCopy = success?.sendOn ? formatDateTime(success.sendOn) : "";
    return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "rounded-2xl border border-emerald-100 bg-emerald-50/80 p-6 text-center", children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_lucide_react2.Sparkles, { className: "mx-auto h-10 w-10 text-emerald-500" }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("h3", { className: "mt-4 text-2xl font-semibold text-emerald-700", children: success?.sendOn ? "Gift card scheduled!" : "Gift card sent!" }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "text-sm text-emerald-700", children: success?.sendOn ? `We'll deliver the gift card email to the ${success?.deliveryTarget === "recipient" ? "recipient" : "buyer"} on ${scheduledCopy}.` : "We just delivered the gift card email and a confirmation receipt. Save this code for your records." }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "mt-4 rounded-xl border border-emerald-200 bg-white px-4 py-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "text-xs font-semibold uppercase tracking-[0.32em] text-emerald-500", children: "Gift card code" }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "mt-2 text-2xl font-mono font-bold tracking-widest text-slate-900", children: success?.code || "Pending" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("p", { className: "mt-4 text-sm text-slate-600", children: [
          "Amount: ",
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "font-semibold", children: amountLabel }),
          " - Type: ",
          success?.cardType === "physical" ? "Leather physical card + digital code" : "Digital"
        ] }),
        success?.sendOn && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "text-xs text-slate-500", children: "You'll also get a reminder email when it goes out." }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "button",
          {
            type: "button",
            className: "mt-5 inline-flex items-center justify-center rounded-full border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100",
            onClick: () => {
              if (success?.code) navigator.clipboard?.writeText(success.code).catch(() => {
              });
            },
            children: "Copy code"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        "button",
        {
          type: "button",
          className: "btn btn-primary",
          onClick: () => handleDialogOpenChange(false),
          children: "Close"
        }
      ) })
    ] });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_react_helmet_async.Helmet, { children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("script", { type: "application/ld+json", children: JSON.stringify(productSchema) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(Dialog2, { open, onOpenChange: handleDialogOpenChange, children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(DialogTrigger2, { asChild: true, children: /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("button", { className: cn("btn btn-primary flex items-center gap-2 shadow-sm", className), children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_lucide_react2.Gift, { className: "h-4 w-4" }),
        "Buy Gift Card"
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(DialogContent2, { className: "max-h-[90vh] overflow-y-auto", children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(DialogHeader, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(DialogTitle2, { children: "Gift a Local Effort experience" }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(DialogDescription2, { children: "Choose the amount, pick digital or leather gift card, and we will send it instantly with all the right instructions." })
        ] }),
        status === "success" && success ? renderSuccess() : /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("form", { className: "space-y-6", onSubmit: handleSubmit, children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("section", { className: "space-y-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "text-sm font-semibold uppercase tracking-[0.24em] text-orange-500", children: "Amount" }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "flex flex-wrap gap-2", children: [
              presetAmounts.map((value) => {
                const active = form.customAmount === "" && form.amount === value;
                return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: cn(
                      "rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold transition",
                      active ? "border-orange-500 bg-orange-500 text-white" : "bg-white text-slate-700 hover:border-orange-400 hover:text-orange-500"
                    ),
                    onClick: () => handleAmountClick(value),
                    children: [
                      "$",
                      value
                    ]
                  },
                  value
                );
              }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "flex items-center gap-2 rounded-full border border-dashed border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-orange-300", children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "text-slate-500", children: "Other" }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                  "input",
                  {
                    type: "number",
                    min: "50",
                    step: "10",
                    value: form.customAmount,
                    onChange: (event) => {
                      const { value } = event.target;
                      setForm((prev) => ({ ...prev, customAmount: value }));
                    },
                    className: "w-24 border-none bg-transparent text-sm focus:outline-none focus:ring-0",
                    placeholder: "250"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("p", { className: "text-xs text-slate-500", children: [
              amountLabel,
              " selected. Physical leather cards unlock at $250+."
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("section", { className: "grid gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("h4", { className: "text-sm font-semibold text-slate-700", children: "Delivery preferences" }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "flex flex-wrap gap-2", children: [
              { value: "recipient", label: "Email recipient" },
              { value: "buyer", label: "Email me" }
            ].map((option) => /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
              "button",
              {
                type: "button",
                onClick: () => setForm((prev) => ({ ...prev, deliveryTarget: option.value })),
                className: cn(
                  "flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition",
                  form.deliveryTarget === option.value ? "border-orange-500 bg-orange-500/10 text-orange-600" : "border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-500"
                ),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_lucide_react2.Mail, { className: "h-4 w-4" }),
                  option.label
                ]
              },
              option.value
            )) }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "flex flex-wrap gap-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                "button",
                {
                  type: "button",
                  onClick: () => setForm((prev) => ({ ...prev, cardType: "digital" })),
                  className: cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition",
                    form.cardType === "digital" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600"
                  ),
                  children: "Instant digital"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                "button",
                {
                  type: "button",
                  disabled: !canChoosePhysical,
                  onClick: () => setForm((prev) => ({ ...prev, cardType: "physical" })),
                  className: cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition",
                    form.cardType === "physical" ? "border-amber-500 bg-amber-500/10 text-amber-600" : canChoosePhysical ? "border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600" : "border-dashed border-slate-200 text-slate-400"
                  ),
                  children: "Leather keepsake"
                }
              )
            ] }),
            !canChoosePhysical && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "text-xs text-slate-500", children: "Select $250 or more to ship a physical leather card along with the digital code." }),
            form.cardType === "physical" && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "space-y-3 rounded-xl border border-amber-100 bg-white p-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "flex gap-3", children: [
                { value: "recipient", label: "Ship to recipient" },
                { value: "buyer", label: "Ship to me" }
              ].map((option) => /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
                "button",
                {
                  type: "button",
                  onClick: () => setForm((prev) => ({ ...prev, shipTo: option.value })),
                  className: cn(
                    "flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
                    form.shipTo === option.value ? "border-amber-500 bg-amber-500/15 text-amber-700" : "border-amber-200 text-amber-500 hover:border-amber-300"
                  ),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_lucide_react2.MapPin, { className: "h-3.5 w-3.5" }),
                    option.label
                  ]
                },
                option.value
              )) }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "grid gap-3 md:grid-cols-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "md:col-span-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { className: "label", htmlFor: "gift-shipping-line1", children: "Street address" }),
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("input", { id: "gift-shipping-line1", className: "input", value: form.shippingLine1, onChange: handleInputChange("shippingLine1") })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "md:col-span-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { className: "label", htmlFor: "gift-shipping-line2", children: "Apartment, suite (optional)" }),
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("input", { id: "gift-shipping-line2", className: "input", value: form.shippingLine2, onChange: handleInputChange("shippingLine2") })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { className: "label", htmlFor: "gift-shipping-city", children: "City" }),
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("input", { id: "gift-shipping-city", className: "input", value: form.shippingCity, onChange: handleInputChange("shippingCity") })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { className: "label", htmlFor: "gift-shipping-state", children: "State" }),
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("input", { id: "gift-shipping-state", className: "input", value: form.shippingState, onChange: handleInputChange("shippingState") })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { className: "label", htmlFor: "gift-shipping-postal", children: "Postal code" }),
                  /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("input", { id: "gift-shipping-postal", className: "input", value: form.shippingPostal, onChange: handleInputChange("shippingPostal") })
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("section", { className: "grid gap-4 md:grid-cols-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "space-y-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("h4", { className: "text-sm font-semibold text-slate-700", children: "Buyer details" }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { className: "label", htmlFor: "gift-buyer-name", children: "Your name" }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("input", { id: "gift-buyer-name", className: "input", value: form.buyerName, onChange: handleInputChange("buyerName"), required: true })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { className: "label", htmlFor: "gift-buyer-email", children: "Email" }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("input", { id: "gift-buyer-email", className: "input", type: "email", value: form.buyerEmail, onChange: handleInputChange("buyerEmail"), required: true })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { className: "label", htmlFor: "gift-buyer-phone", children: "Phone (optional)" }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("input", { id: "gift-buyer-phone", className: "input", value: form.buyerPhone, onChange: handleInputChange("buyerPhone") })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "space-y-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("h4", { className: "text-sm font-semibold text-slate-700", children: "Recipient details" }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { className: "label", htmlFor: "gift-recipient-name", children: "Recipient name" }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("input", { id: "gift-recipient-name", className: "input", value: form.recipientName, onChange: handleInputChange("recipientName") })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { className: "label", htmlFor: "gift-recipient-email", children: "Recipient email" }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("input", { id: "gift-recipient-email", className: "input", type: "email", value: form.recipientEmail, onChange: handleInputChange("recipientEmail"), placeholder: "hello@friend.com" })
              ] }),
              form.cardType === "digital" && form.deliveryTarget === "recipient" && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { className: "label", htmlFor: "gift-send-on", children: "Send on (optional)" }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
                  "input",
                  {
                    id: "gift-send-on",
                    type: "datetime-local",
                    className: "input",
                    value: form.sendOn,
                    onChange: handleInputChange("sendOn"),
                    min: minSendOn
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "mt-1 text-xs text-slate-500", children: "Choose a future date and time (your local timezone) to deliver the email automatically. Leave blank to send it right away." })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { className: "label", htmlFor: "gift-recipient-phone", children: "Recipient phone (optional)" }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("input", { id: "gift-recipient-phone", className: "input", value: form.recipientPhone, onChange: handleInputChange("recipientPhone") })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("section", { className: "space-y-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { className: "label", htmlFor: "gift-note", children: "Note for the recipient (optional)" }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
              "textarea",
              {
                id: "gift-note",
                className: "input min-h-[90px]",
                value: form.note,
                onChange: handleInputChange("note"),
                placeholder: "Add a short note to appear inside the gift email."
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("section", { className: "space-y-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("h4", { className: "text-sm font-semibold text-slate-700", children: "Gift card FAQ" }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("details", { className: "group rounded-xl border border-slate-200 bg-white p-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("summary", { className: "flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-700", children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { children: "How much should I buy?" }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "text-xl leading-none text-slate-400 transition group-open:rotate-45", children: "+" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "mt-2 text-sm text-slate-600", children: "A simple dinner family style is around $65/person. A super fancy coursed dinner with wine and scallops is $115/person plus a discretionary wine budget (an additional $50-$150/person recommended). Pizzas are usually around $15 and pies are around $30. That's the range." })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("details", { className: "group rounded-xl border border-slate-200 bg-white p-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("summary", { className: "flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-700", children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { children: "Leather???" }),
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "text-xl leading-none text-slate-400 transition group-open:rotate-45", children: "+" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "mt-2 text-sm text-slate-600", children: "We hand-letter a short note into leather from Tandy Leather. It's a souvenir that makes a big impact as a gift." })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("section", { className: "space-y-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "text-sm font-semibold text-slate-700", children: "Payment details" }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "min-h-[96px] rounded-lg border border-slate-200 bg-white p-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { id: "gift-card-card-container", className: "min-h-[64px]" }),
              !cardLoaded && !squareError && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "mt-2 text-sm text-slate-500", children: "Loading secure card entry..." }),
              squareError && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "mt-2 text-sm text-red-600", children: squareError })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "text-xs text-slate-400", children: "We use Square to process payments securely. The card is charged immediately and refunds are available on request within 14 days (if unused)." })
          ] }),
          error && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600", children: error }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(DialogFooter, { className: "items-center justify-between gap-3 sm:flex-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "text-xs text-slate-500", children: [
              amountLabel,
              " - ",
              form.cardType === "physical" ? "Digital + leather card" : "Instant digital card"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
              "button",
              {
                type: "submit",
                className: cn("btn btn-primary flex items-center gap-2", disableSubmit && "opacity-60"),
                disabled: disableSubmit,
                children: [
                  status === "processing" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_lucide_react2.Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(import_lucide_react2.Gift, { className: "h-4 w-4" }),
                  status === "processing" ? "Processing..." : "Send gift card"
                ]
              }
            )
          ] })
        ] })
      ] })
    ] })
  ] });
};
var GiftCardDialog_default = GiftCardDialog;

// src/pages/HomePage.jsx
var import_jsx_runtime19 = require("react/jsx-runtime");
var HomePage = () => {
  const navigate = (0, import_react_router_dom3.useNavigate)();
  const [partners, setPartners] = (0, import_react15.useState)([]);
  (0, import_react16.useEffect)(() => {
    let mounted = true;
    fetch("/api/search-images?query=partner&per_page=48").then((r) => r.ok ? r.json() : null).then((data) => {
      if (!mounted || !data || !Array.isArray(data.images)) return;
      const items2 = data.images.map((img) => {
        const ctx = img.context && (img.context.custom || img.context);
        return {
          publicId: img.public_id || img.publicId,
          name: ctx && (ctx.name || ctx.title || ctx.alt) || img.public_id || "Partner",
          url: ctx && (ctx.url || ctx.link || ctx.href)
        };
      }).filter((p) => p.publicId);
      setPartners(items2);
    }).catch(() => {
    });
    return () => {
      mounted = false;
    };
  }, []);
  const [reviews, setReviews] = (0, import_react15.useState)([]);
  const [events, setEvents] = (0, import_react15.useState)([]);
  const [eventModal, setEventModal] = (0, import_react15.useState)(null);
  const [business, setBusiness] = (0, import_react15.useState)(null);
  const parseEventDate = (value) => {
    if (!value) return null;
    const iso = value.includes("T") ? value : `${value}T00:00:00`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  (0, import_react16.useEffect)(() => {
    let mounted = true;
    fetch("/business.json").then((r) => r.ok ? r.json() : null).then((data) => {
      if (mounted) setBusiness(data || null);
    }).catch(() => {
    });
    return () => {
      mounted = false;
    };
  }, []);
  (0, import_react16.useEffect)(() => {
    let mounted = true;
    fetch("/reviews/thumbtack.json").then((r) => r.ok ? r.json() : null).then((ext) => {
      if (!mounted || !Array.isArray(ext) || !ext.length) return;
      setReviews((prev) => {
        const seen = /* @__PURE__ */ new Set();
        const merged = [...ext, ...prev].filter((t) => {
          const k = `${(t.quote || "").trim()}|${(t.author || "").trim()}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        return merged;
      });
    }).catch(() => {
    });
    return () => {
      mounted = false;
    };
  }, []);
  (0, import_react16.useEffect)(() => {
    let mounted = true;
    (async () => {
      try {
        const items2 = await sanityClient_default.fetch(`*[_type == "publicEvent"]|order(startDate asc){ _id, location, startDate, endDate, foodType, ticketsUrl, description }`).catch(() => []);
        if (!mounted) return;
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = (items2 || []).filter((ev) => {
          const end = parseEventDate(ev.endDate) || parseEventDate(ev.startDate);
          if (!end) return false;
          end.setHours(23, 59, 59, 999);
          return end >= today;
        });
        setEvents(upcoming);
      } catch (_) {
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  const PartnerGrid = () => {
    const items2 = (partners || []).filter((p) => p && p.publicId);
    if (!items2.length) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 items-center px-4", children: items2.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
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
        children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "w-full", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "relative w-full", style: { paddingTop: "18.2%" }, children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
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
  const heroImage = {
    publicId: heroPublicId,
    alt: "Local Effort \u2014 hero",
    version: heroVersion
  };
  const heroVersionSegment = heroImage.version ? `/v${heroImage.version}` : "";
  const imageJsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/f_auto,q_auto${heroVersionSegment}/${heroImage.publicId}`,
    name: heroImage.alt,
    description: "A sample of the professional in-home dining experience by Local Effort.",
    creator: {
      "@type": "Organization",
      name: "Local Effort"
    }
  };
  const homeFaqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Do you serve Minneapolis and St. Paul?",
        acceptedAnswer: { "@type": "Answer", text: "Yes. We regularly serve Minneapolis, St. Paul, Roseville, and the Twin Cities metro." }
      },
      {
        "@type": "Question",
        name: "What types of services do you offer?",
        acceptedAnswer: { "@type": "Answer", text: "Personal chef dinners, weekly meal prep, and small event catering up to about 50 guests." }
      },
      {
        "@type": "Question",
        name: "Do you handle dietary restrictions?",
        acceptedAnswer: { "@type": "Answer", text: "Absolutely. We can accommodate common restrictions and preferences with advance notice." }
      }
    ]
  };
  const partnersJsonLd = partners && partners.length ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Partners",
    itemListElement: partners.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "ImageObject",
        name: p.name || `Partner ${idx + 1}`,
        contentUrl: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/f_auto,q_auto/${p.publicId}`,
        url: p.url || void 0
      }
    }))
  } : null;
  const [showFeedback, setShowFeedback] = (0, import_react15.useState)(false);
  const [fb, setFb] = (0, import_react15.useState)({ name: "", email: "", sentiment: "positive", message: "" });
  const [fbStatus, setFbStatus] = (0, import_react15.useState)("idle");
  function SubscribeForm() {
    const [email, setEmail] = (0, import_react15.useState)("");
    const [status, setStatus] = (0, import_react15.useState)("idle");
    return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
      "form",
      {
        onSubmit: async (e) => {
          e.preventDefault();
          if (!email) return;
          setStatus("sending");
          try {
            const res = await fetch("/api/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email })
            });
            if (!res.ok) throw new Error(await res.text());
            setStatus("ok");
            setEmail("");
          } catch (_e) {
            setStatus("error");
          }
        },
        className: "mt-4 flex gap-3",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
            "input",
            {
              type: "email",
              required: true,
              placeholder: "you@example.com",
              className: "input flex-1",
              value: email,
              onChange: (e) => setEmail(e.target.value),
              "aria-label": "Email address"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { type: "submit", className: "btn btn-primary", disabled: status === "sending", children: status === "sending" ? "Subscribing\u2026" : "Subscribe" }),
          status === "ok" && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "text-green-700 text-sm self-center", children: "Thanks! You\u2019re on the list." }),
          status === "error" && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "text-red-700 text-sm self-center", children: "Couldn\u2019t subscribe." })
        ]
      }
    );
  }
  const FeedbackModal = (0, import_react15.useMemo)(() => {
    if (!showFeedback) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4", role: "dialog", "aria-modal": "true", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "form-card w-full max-w-lg relative", children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
        "button",
        {
          className: "absolute right-4 top-4 text-sm underline",
          onClick: () => setShowFeedback(false),
          "aria-label": "Close feedback",
          children: "Close"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("h4", { className: "text-xl font-bold mb-2", children: "Send Feedback" }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("p", { className: "text-sm text-gray-600 mb-4", children: "We read every note. Thanks for helping us improve." }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
        "form",
        {
          onSubmit: async (e) => {
            e.preventDefault();
            setFbStatus("sending");
            try {
              const payload = {
                name: fb.name,
                email: fb.email,
                subject: `Website feedback (${fb.sentiment})`,
                message: fb.message,
                type: "feedback"
              };
              const res = await fetch("/api/messages/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
              if (!res.ok) throw new Error(await res.text());
              setFbStatus("sent");
              setFb({ name: "", email: "", sentiment: "positive", message: "" });
              setTimeout(() => setShowFeedback(false), 900);
            } catch (_e) {
              setFbStatus("error");
            }
          },
          className: "space-y-3",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("label", { className: "label", htmlFor: "fb-name", children: "Name" }),
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("input", { id: "fb-name", className: "input", value: fb.name, onChange: (e) => setFb({ ...fb, name: e.target.value }), required: true })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("label", { className: "label", htmlFor: "fb-email", children: "Email" }),
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("input", { id: "fb-email", type: "email", className: "input", value: fb.email, onChange: (e) => setFb({ ...fb, email: e.target.value }), required: true })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("label", { className: "label", htmlFor: "fb-sentiment", children: "Type" }),
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "flex gap-4", id: "fb-sentiment", children: ["positive", "neutral", "negative"].map((s) => /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("label", { className: "inline-flex items-center gap-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("input", { type: "radio", name: "sentiment", value: s, checked: fb.sentiment === s, onChange: () => setFb({ ...fb, sentiment: s }) }),
                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "capitalize", children: s })
              ] }, s)) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("label", { className: "label", htmlFor: "fb-message", children: "Message" }),
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("textarea", { id: "fb-message", className: "textarea", value: fb.message, onChange: (e) => setFb({ ...fb, message: e.target.value }), rows: 5, required: true })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { type: "submit", className: "btn btn-primary", disabled: fbStatus === "sending", children: fbStatus === "sending" ? "Sending\u2026" : "Send feedback" }),
              fbStatus === "sent" && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "text-green-700 text-sm", children: "Thanks! Sent." }),
              fbStatus === "error" && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "text-red-700 text-sm", children: "Could not send. Try again." })
            ] })
          ]
        }
      )
    ] }) });
  }, [showFeedback, fb, fbStatus]);
  function EventsWidget({ asCard = false }) {
    if (!events || events.length === 0) return null;
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    const formatListDate = (event) => {
      const start = parseEventDate(event.startDate);
      const end = parseEventDate(event.endDate);
      if (!start) return "";
      const includeYear = start.getFullYear() > currentYear;
      if (end && end.getTime() !== start.getTime()) {
        const opts2 = { month: "short", day: "numeric" };
        if (includeYear) opts2.year = "numeric";
        return `starts ${new Intl.DateTimeFormat("en-US", opts2).format(start)}`;
      }
      const opts = { weekday: "short", month: "short", day: "numeric" };
      if (includeYear) opts.year = "numeric";
      return new Intl.DateTimeFormat("en-US", opts).format(start);
    };
    const formatModalDate = (event) => {
      const start = parseEventDate(event.startDate);
      const end = parseEventDate(event.endDate);
      if (!start) return "";
      const includeYearStart = start.getFullYear() > currentYear || end && end.getFullYear() !== start.getFullYear();
      const baseOptions = { weekday: "short", month: "short", day: "numeric" };
      const startLabel = new Intl.DateTimeFormat("en-US", includeYearStart ? { ...baseOptions, year: "numeric" } : baseOptions).format(start);
      if (end && end.getTime() !== start.getTime()) {
        const includeYearEnd = end.getFullYear() > currentYear || end.getFullYear() !== start.getFullYear();
        const endLabel = new Intl.DateTimeFormat("en-US", includeYearEnd ? { ...baseOptions, year: "numeric" } : baseOptions).format(end);
        return `${startLabel} - ${endLabel}`;
      }
      return startLabel;
    };
    const content = /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "border rounded-lg p-4 bg-white shadow-sm", children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("h3", { className: "text-lg font-semibold mb-2", children: "upcoming public events." }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("ul", { className: "divide-y", children: events.map((ev) => {
        const dateLabel = formatListDate(ev);
        const detailLabel = [dateLabel, ev.foodType || "Food"].filter(Boolean).join(" - ");
        return /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("li", { className: "py-2", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          "button",
          {
            className: "text-left hover:underline",
            onClick: () => setEventModal(ev),
            children: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { className: "flex flex-col sm:flex-row sm:items-baseline sm:gap-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "font-semibold text-slate-800", children: ev.location }),
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "text-sm text-slate-600", children: detailLabel })
            ] })
          }
        ) }, ev._id);
      }) })
    ] });
    if (asCard) return content;
    return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "max-w-6xl mx-auto px-4 mt-8", children: [
      content,
      eventModal && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "bg-white rounded-lg shadow-xl max-w-lg w-full p-5 relative", children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { className: "absolute right-3 top-3 text-sm underline", onClick: () => setEventModal(null), children: "Close" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("h4", { className: "text-xl font-bold mb-1", children: eventModal.location }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("p", { className: "text-sm text-gray-600 mb-3", children: formatModalDate(eventModal) }),
        eventModal.description && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "prose max-w-none", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_react17.PortableText, { value: eventModal.description, components: portableTextComponents }) }),
        eventModal.ticketsUrl && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("a", { className: "btn btn-primary mt-4 inline-block", href: eventModal.ticketsUrl, target: "_blank", rel: "noreferrer", children: "Get tickets" })
      ] }) })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_jsx_runtime19.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_react_helmet_async2.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("title", { children: "Personal Chef Minneapolis \u2014 Local Effort | In-home Chef \u2022 Event Catering" }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
        "meta",
        {
          name: "description",
          content: "Local Effort \u2014 Personal chef & event catering serving Minneapolis, St. Paul, and the Twin Cities. Private in-home dinners, weekly meal prep, and small event catering."
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("link", { rel: "canonical", href: "https://localeffortfood.com/" }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
        "link",
        {
          rel: "preload",
          as: "image",
          href: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/f_auto,q_auto,w_2400${heroVersionSegment}/${heroImage.publicId}`,
          imageSrcSet: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/f_auto,q_auto,w_800${heroVersionSegment}/${heroImage.publicId} 800w, https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/f_auto,q_auto,w_1200${heroVersionSegment}/${heroImage.publicId} 1200w, https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/f_auto,q_auto,w_1800${heroVersionSegment}/${heroImage.publicId} 1800w, https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/f_auto,q_auto,w_2400${heroVersionSegment}/${heroImage.publicId} 2400w, https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/f_auto,q_auto,w_3200${heroVersionSegment}/${heroImage.publicId} 3200w`,
          imageSizes: "(min-width: 1536px) 768px, (min-width: 1280px) 688px, (min-width: 1024px) 50vw, 100vw"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("script", { type: "application/ld+json", children: JSON.stringify(imageJsonLd) }),
      partnersJsonLd && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("script", { type: "application/ld+json", children: JSON.stringify(partnersJsonLd) }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("script", { type: "application/ld+json", children: JSON.stringify((() => {
        const src = business || {};
        const address = {
          "@type": "PostalAddress",
          addressLocality: src.address && src.address.addressLocality || "Roseville",
          addressRegion: src.address && src.address.addressRegion || "MN",
          addressCountry: src.address && src.address.addressCountry || "US",
          streetAddress: src.address && src.address.streetAddress ? src.address.streetAddress : void 0,
          postalCode: src.address && src.address.postalCode ? src.address.postalCode : void 0
        };
        const biz = {
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          name: src.name || "Local Effort Food Co.",
          url: src.url || "https://localeffortfood.com/",
          description: src.description || "Personal chef & event catering serving Minneapolis, St. Paul, and the Twin Cities.",
          image: imageJsonLd.contentUrl,
          areaServed: Array.isArray(src.serviceArea) && src.serviceArea.length ? src.serviceArea : ["Minneapolis", "St. Paul", "Twin Cities", "Roseville", "Minnesota", "Western Wisconsin"],
          address,
          sameAs: Array.isArray(src.sameAs) ? src.sameAs : ["https://www.instagram.com/localeffortfood", "https://www.facebook.com/localeffortfood", "https://www.tiktok.com/@localeffort"],
          telephone: src.telephone || void 0,
          priceRange: "$$",
          service: {
            "@type": "Service",
            name: "Personal Chef (In-home)",
            description: "Private chef dinners, meal prep, and event catering in the Twin Cities metro."
          }
        };
        if (src.geo && typeof src.geo === "object" && Number.isFinite(src.geo.latitude) && Number.isFinite(src.geo.longitude)) {
          biz.geo = { "@type": "GeoCoordinates", latitude: src.geo.latitude, longitude: src.geo.longitude };
        }
        const reviewList = (Array.isArray(reviews) ? reviews.slice(0, 12) : []).map((r) => ({
          "@type": "Review",
          reviewBody: r.quote,
          author: { "@type": "Person", name: r.author || "Customer" },
          reviewRating: r.context && /5★/.test(r.context) ? { "@type": "Rating", ratingValue: 5, bestRating: 5 } : void 0,
          publisher: r.context ? { "@type": "Organization", name: r.context.split("\xB7")[0].trim() } : void 0
        }));
        const ratings = reviewList.map((r) => r.reviewRating && r.reviewRating.ratingValue || 0).filter(Boolean);
        if (ratings.length) {
          biz.aggregateRating = {
            "@type": "AggregateRating",
            ratingValue: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1),
            reviewCount: ratings.length
          };
        }
        biz.review = reviewList;
        biz.hasOfferCatalog = {
          "@type": "OfferCatalog",
          name: "Services",
          itemListElement: [
            { "@type": "Service", name: "Personal Chef", areaServed: ["Twin Cities"] },
            { "@type": "Service", name: "Weekly Meal Prep", areaServed: ["Twin Cities"] },
            { "@type": "Service", name: "Event Catering", areaServed: ["Twin Cities"] }
          ]
        };
        return biz;
      })()) }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("script", { type: "application/ld+json", children: JSON.stringify(homeFaqJsonLd) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "space-y-24", children: [
      !cloudinaryConfig.cloudName && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "card bg-yellow-100 border-yellow-400 text-body", children: "Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME in your environment." }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("section", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8 grid md:grid-cols-2 gap-8 items-center min-h-[60vh]", children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
            import_framer_motion3.motion.h1,
            {
              variants: fadeInLeft,
              initial: "initial",
              animate: "animate",
              className: "heading-display",
              children: [
                "Minnesotan food ",
                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "heading-accent", children: "for your functions." })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
            import_framer_motion3.motion.h2,
            {
              variants: fadeInLeft,
              initial: "initial",
              animate: "animate",
              transition: { delay: 0.05 },
              className: "heading-subtitle text-neutral-600",
              children: "Personal chef services in Minneapolis\u2013St. Paul"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
            import_framer_motion3.motion.p,
            {
              variants: fadeInUp,
              initial: "initial",
              animate: "animate",
              className: "mt-6 md:mt-8 text-body max-w-md",
              children: [
                "Event hospitality and personal chef services, with an obsessive focus on local ingredients.",
                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("br", {}),
                /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("br", {}),
                "Think of us for special occasions and special events. Count on us for weekly home cooked meals. We're comfortable in homes, offices, bars and cafes, parks, vineyards, and uh.. anywhere, really."
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "mt-8 flex flex-wrap gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
              import_framer_motion3.motion.button,
              {
                whileHover: { scale: 1.03 },
                whileTap: { scale: 0.98 },
                onClick: () => navigate("/services#event-request"),
                className: "btn btn-primary text-lg",
                children: "Book an event"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(GiftCardDialog_default, { className: "text-lg px-5 py-3" }),
            /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { className: "sr-only", children: [
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("a", { href: "/personal-chef-minneapolis", className: "btn", children: "Personal Chef Minneapolis" }),
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("a", { href: "/personal-chef-st-paul", className: "btn", children: "Personal Chef St. Paul" }),
              /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("a", { href: "/personal-chef-twin-cities", className: "btn", children: "Twin Cities Personal Chef" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          import_framer_motion3.motion.div,
          {
            className: "w-full min-h-[400px] h-full rounded-xl overflow-hidden",
            initial: { opacity: 0, y: 10 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.6 },
            children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
              cloudinaryImage_default,
              {
                publicId: heroImage.publicId,
                version: heroImage.version,
                alt: heroImage.alt,
                containerClassName: "w-full h-full",
                imgClassName: "w-full h-full object-cover object-center",
                fallbackSrc: heroFallbackSrc,
                sizes: "(min-width: 1536px) 768px, (min-width: 1280px) 688px, (min-width: 1024px) 50vw, 100vw",
                responsiveSteps: [600, 900, 1200, 1600, 2e3, 2600, 3200],
                eager: true
              }
            )
          }
        )
      ] }),
      eventModal && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "bg-white rounded-lg shadow-xl max-w-lg w-full p-5 relative", children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { className: "absolute right-3 top-3 text-sm underline", onClick: () => setEventModal(null), children: "Close" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("h4", { className: "text-xl font-bold mb-1", children: eventModal.location }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("p", { className: "text-sm text-gray-600 mb-3", children: [
          eventModal.startDate,
          eventModal.endDate && eventModal.endDate !== eventModal.startDate ? ` \u2013 ${eventModal.endDate}` : ""
        ] }),
        eventModal.description && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "prose max-w-none", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_react17.PortableText, { value: eventModal.description, components: portableTextComponents }) }),
        eventModal.ticketsUrl && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("a", { className: "btn btn-primary mt-4 inline-block", href: eventModal.ticketsUrl, target: "_blank", rel: "noreferrer", children: "Get tickets" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("section", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "grid md:grid-cols-2 gap-6 items-start", children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(EventsWidget, { asCard: true }) }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "form-card h-full", children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("h3", { className: "text-xl font-bold", children: "Subscribe to our email list" }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("p", { className: "text-sm text-gray-600 mt-1", children: "Occasional updates about seasonal menus, events, and meal prep openings." }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(SubscribeForm, {})
        ] }) })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("section", { className: "py-12", children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "max-w-6xl mx-auto px-4 md:px-6 lg:px-8", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(SectionHeader, { overline: "Community", title: "Our Partners" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(PartnerGrid, {})
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("section", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8", children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(SectionHeader, { overline: "Capabilities", title: "What We Do" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "grid md:grid-cols-3 gap-6", children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
            ServiceCard_default,
            {
              to: "/events",
              title: "Dinners & Events",
              description: "in-home dinner parties and small events up to 50"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
            ServiceCard_default,
            {
              to: "/meal-prep",
              title: "Weekly Meal Plans",
              description: "Nutritious, locally-sourced weekly menus and plans."
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
            ServiceCard_default,
            {
              to: "/pizza-party",
              title: "Pizza Parties",
              description: "Local Pizza at your party (or bar). We'll bring the oven."
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(Separator, {}),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
        TestimonialsCarousel,
        {
          items: reviews,
          title: "Feedback",
          headingExtra: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { className: "text-sm text-neutral-600", children: [
            "Want to ",
            /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { className: "underline", onClick: () => setShowFeedback(true), children: "provide feedback" }),
            "?"
          ] })
        }
      ),
      FeedbackModal
    ] })
  ] });
};
var HomePage_default = HomePage;

// src/pages/AboutUsPage.jsx
var import_react22 = __toESM(require("react"));
var import_react_helmet_async3 = __toESM(require_lib());

// src/components/ui/ModernButton.jsx
var import_react18 = __toESM(require("react"));
var import_prop_types = __toESM(require_prop_types());
var import_framer_motion4 = require("framer-motion");
var import_jsx_runtime20 = require("react/jsx-runtime");
var ModernButton = ({
  as: Component = "button",
  children,
  variant = "primary",
  size = "md",
  icon = null,
  onClick,
  className = "",
  disabled = false,
  href,
  target,
  rel,
  ...props
}) => {
  const baseClasses2 = "btn optimize-rendering";
  const variantClasses2 = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost"
  };
  const sizeClasses2 = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };
  const Tag = (0, import_framer_motion4.motion)(Component);
  const motionProps = Component === "button" ? { disabled } : {};
  return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
    Tag,
    {
      className: `${baseClasses2} ${variantClasses2[variant]} ${sizeClasses2[size]} ${className}`,
      onClick,
      href: Component === "a" ? href : void 0,
      target: Component === "a" ? target : void 0,
      rel: Component === "a" ? rel : void 0,
      ...motionProps,
      whileHover: { scale: disabled ? 1 : 1.02 },
      whileTap: { scale: disabled ? 1 : 0.98 },
      transition: { type: "spring", stiffness: 400, damping: 25 },
      ...props,
      children: [
        icon && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { className: "mr-2", children: icon }),
        children
      ]
    }
  );
};
ModernButton.propTypes = {
  children: import_prop_types.default.node,
  variant: import_prop_types.default.oneOf(["primary", "secondary", "ghost"]),
  size: import_prop_types.default.oneOf(["sm", "md", "lg"]),
  icon: import_prop_types.default.node,
  as: import_prop_types.default.oneOfType([import_prop_types.default.string, import_prop_types.default.elementType]),
  onClick: import_prop_types.default.func,
  className: import_prop_types.default.string,
  disabled: import_prop_types.default.bool,
  href: import_prop_types.default.string,
  target: import_prop_types.default.string,
  rel: import_prop_types.default.string
};
ModernButton.defaultProps = {
  variant: "primary",
  size: "md",
  icon: null,
  className: "",
  disabled: false
};

// src/components/common/PhotoGrid.jsx
var import_react19 = __toESM(require("react"));
var import_jsx_runtime21 = require("react/jsx-runtime");
function PhotoGrid({ tags, title, perPage = 24, layout, masonry = false, className = "", ...rest }) {
  const tagList = (0, import_react19.useMemo)(() => Array.isArray(tags) ? tags.filter(Boolean) : [tags].filter(Boolean), [tags]);
  const [images, setImages] = (0, import_react19.useState)([]);
  const [loading, setLoading] = (0, import_react19.useState)(false);
  const [error, setError] = (0, import_react19.useState)(null);
  (0, import_react19.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("section", { className: ["space-y-4", className].filter(Boolean).join(" "), ...rest, children: [
    title ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("h3", { className: "text-2xl font-bold", children: title }) : null,
    loading ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("p", { children: "Loading photos\u2026" }) : error ? /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "text-red-700 bg-red-50 border border-red-200 p-3 rounded", children: [
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("p", { className: "font-semibold", children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("p", { className: "text-sm mt-1", children: "If this persists, check Cloudinary env vars and the serverless function logs." })
    ] }) : images.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("p", { className: "text-sm text-gray-600", children: "No photos found." }) : useMasonry ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { className: "columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]", children: images.map((img, idx) => /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
      "div",
      {
        className: "mb-4 break-inside-avoid border p-2 bg-white rounded-lg overflow-hidden",
        children: img.thumbnail_url ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          "img",
          {
            src: img.thumbnail_url,
            alt: img.context?.alt || "Grid image",
            className: "rounded-lg w-full h-auto",
            loading: "lazy"
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
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
    )) }) : /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: images.map((img, idx) => /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { className: "border p-2 bg-white rounded-lg overflow-hidden", children: img.thumbnail_url ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
      "img",
      {
        src: img.thumbnail_url,
        alt: img.context?.alt || "Grid image",
        className: "rounded-lg object-cover w-full h-full aspect-square",
        loading: "lazy"
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
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

// src/components/AspectRatio.jsx
var import_react20 = __toESM(require("react"));
var import_jsx_runtime22 = require("react/jsx-runtime");
function AspectRatio({ ratio = 4 / 3, children, className = "", style = {}, ...props }) {
  const paddingTop = `${100 / ratio}%`;
  return /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: ["relative w-full overflow-hidden", className].filter(Boolean).join(" "), style, ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { style: { paddingTop } }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "absolute inset-0", children })
  ] });
}

// src/components/ChefCard.jsx
var import_react21 = __toESM(require("react"));
var import_jsx_runtime23 = require("react/jsx-runtime");
function ChefCard({ name: name2, bio, imageSrc, imageAlt, className = "", textClass = "prose-lite max-w-none" }) {
  const fallbackSrc = "/gallery/catherine.jpg";
  const src = imageSrc || fallbackSrc;
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
    "figure",
    {
      className: [
        "card",
        "p-5 md:p-6",
        "ring-1 ring-neutral-200",
        "bg-white",
        "transition-transform duration-200 ease-out hover:scale-[1.01] hover:shadow-md",
        className
      ].filter(Boolean).join(" "),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(AspectRatio, { ratio: 4 / 3, className: "rounded-xl overflow-hidden bg-neutral-100", children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
          "img",
          {
            src,
            alt: imageAlt || name2,
            loading: "lazy",
            width: 1200,
            height: 900,
            className: "absolute inset-0 h-full w-full object-contain bg-neutral-100",
            onError: (e) => {
              if (e.currentTarget.src.indexOf(fallbackSrc) === -1) e.currentTarget.src = fallbackSrc;
            }
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("figcaption", { className: "mt-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("h3", { className: "text-xl font-semibold tracking-tight", children: name2 }),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { className: ["mt-2 text-neutral-700", textClass].filter(Boolean).join(" "), children: bio })
        ] })
      ]
    }
  );
}

// src/pages/AboutUsPage.jsx
var import_jsx_runtime24 = require("react/jsx-runtime");
var AboutUsPage = () => {
  const services = [
    "Meal planning and nutrition support for families",
    "Sourcing and shopping directly from Minnesota producers",
    "Catering and events built around local ingredients",
    "Completely local pizzas \u2014 our specialty"
  ];
  const specialties = [
    "Seasonal vegetables and composed salads",
    "Fresh pastas, grains, and hearty soups",
    "Local, from-scratch pizzas",
    "Thoughtful braises and shared plates",
    "Breads and simple, elegant desserts"
  ];
  const chefs = [
    {
      name: "Weston Smith",
      bio: "Began in coffee in Portland, trained in fine dining in New York, opened Weston Fine Foods (a chocolate shop in the North Loop during the pandemic), and has been focused on Local Effort since 2022.",
      imageSrc: "/gallery/IMG-1013.JPG",
      imageAlt: "Chef Weston Smith"
    },
    {
      name: "Catherine Olsen",
      bio: "Born and raised in Minneapolis. A skilled baker with a lifelong career in food, including Wuollet Bakery, Lucia\u2019s, and Churchill Street. She brings warmth, craft, and deep local roots to our kitchen.",
      imageSrc: "/gallery/catherine.jpg",
      imageAlt: "Chef Catherine Olsen"
    }
  ];
  const photoGrids = [
    { id: "photos-kitchen", tags: ["team", "kitchen"], title: "In the kitchen", perPage: 8 },
    { id: "photos-events", tags: ["event", "dinner"], title: "At events", perPage: 8 }
  ];
  const whatWeDoMicrocopy = "We bring Minnesota-grown ingredients into everyday meals and special events.";
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)(import_jsx_runtime24.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)(import_react_helmet_async3.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("title", { children: "About | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
        "meta",
        {
          name: "description",
          content: "Obsessively local since 2022 \u2014 because it\u2019s healthier, tastier, and better for Minnesota."
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("meta", { property: "og:title", content: "About | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("meta", { property: "og:description", content: "Obsessively local since 2022 \u2014 because it\u2019s healthier, tastier, and better for Minnesota." }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("meta", { property: "og:type", content: "website" }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("meta", { property: "og:image", content: "https://res.cloudinary.com/dokyhfvyd/image/upload/v1758464124/jo9pxtjng8zpt4yo4rcz.jpg" }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("meta", { name: "twitter:card", content: "summary_large_image" }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("meta", { name: "twitter:title", content: "About | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("meta", { name: "twitter:description", content: "Obsessively local since 2022 \u2014 because it\u2019s healthier, tastier, and better for Minnesota." }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("meta", { name: "twitter:image", content: "https://res.cloudinary.com/dokyhfvyd/image/upload/v1758464124/jo9pxtjng8zpt4yo4rcz.jpg" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("main", { id: "main", className: "container-page", children: /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("article", { className: "space-y-16 md:space-y-24", "aria-labelledby": "about-hero-title", children: [
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("header", { className: "relative overflow-hidden rounded-2xl ring-1 ring-neutral-200 bg-gradient-to-br from-neutral-50 to-white", children: /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "grid gap-10 md:grid-cols-2 md:items-center p-8 md:p-12 lg:p-16", children: [
        /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("h1", { id: "about-hero-title", className: "heading-display heading-balance", children: "Local Effort" }),
          /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("p", { className: "mt-4 text-lg text-neutral-700 max-w-xl", children: "Obsessively local since 2022 \u2014 because it\u2019s healthier, tastier, and better for Minnesota." }),
          /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-700 shadow-sm", children: [
            /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("span", { className: "inline-block h-2 w-2 rounded-full bg-emerald-500", "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("span", { children: "Since 2022" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("div", { className: "w-full", children: /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(AspectRatio, { ratio: 4 / 3, className: "rounded-xl shadow-sm ring-1 ring-neutral-200 max-h-[480px] bg-neutral-100", children: /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
          "img",
          {
            src: "https://res.cloudinary.com/dokyhfvyd/image/upload/v1758464124/jo9pxtjng8zpt4yo4rcz.jpg",
            alt: "Local Effort chefs cooking",
            width: 1600,
            height: 1200,
            className: "absolute inset-0 w-full h-full object-cover",
            loading: "lazy"
          }
        ) }) })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(Separator, {}),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("section", { "aria-labelledby": "our-story-title", className: "space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(SectionHeader, { overline: "Background", title: "Our Story" }),
        /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "grid gap-6 md:grid-cols-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "prose-lite md:col-span-2 space-y-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("p", { children: "Weston is from all over, and Catherine is from Minneapolis. We're chefs and married parents, lifelong restaurant and hospitality professionals, home cooks from the heart." }),
            /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("p", { children: [
              "Weston did it like this:",
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("br", {}),
              "coffee> food runner> wine> management> kitchen",
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("br", {}),
              "Catherine did it like this:",
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("br", {}),
              "coffee> restaurant> patisserie> grocery> mom>>>"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("p", { children: "We're a knockout team of widely experienced kitchen professionals. We love platters and cassoulets and juleps and celery and croque monsieur and white rice, we love vegetables and meats and grain and nuts and grapes and HAZELNUTS and ducks and lamb and the weird great awesome people who make them and keep making them. We love meeting our growers. We love living in an city where shopping locally is valued and not hard to do." }),
            /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("p", { children: "We feel strongly about choosing food grown and produced closer to home. It's a duty, and a gift, and it's at the center of our practice and culture. We're the realest people make the localest food." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "space-y-2 text-sm text-neutral-700", children: [
            /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("h3", { className: "text-base font-semibold text-neutral-900", children: "At a glance" }),
            /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("ul", { className: "list-disc pl-5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: "Founded in 2022" }),
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: "Based in Minneapolis, MN" }),
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: "100% locally sourced focus" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(Separator, {}),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("section", { "aria-labelledby": "what-we-do-title", className: "space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(SectionHeader, { overline: "Capabilities", title: "What We Do" }),
        /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "grid gap-6 md:grid-cols-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("p", { className: "prose-lite md:col-span-2", children: whatWeDoMicrocopy }),
          /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "space-y-6 text-sm text-neutral-700", children: [
            /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("h3", { className: "text-base font-semibold text-neutral-900", children: "Foods we specialize in" }),
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("ul", { className: "list-disc pl-5 mt-2", children: specialties.map((v) => /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: v }, v)) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("h3", { className: "text-base font-semibold text-neutral-900", children: "Services we offer" }),
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("ul", { className: "list-disc pl-5 mt-2", children: services.map((s) => /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: s }, s)) })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("section", { "aria-label": "Photo galleries", className: "space-y-12", children: photoGrids.map((pg) => /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(SectionHeader, { overline: "Gallery", title: pg.title }),
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
          PhotoGrid,
          {
            tags: pg.tags,
            perPage: 8,
            layout: "masonry",
            "aria-labelledby": pg.id
          }
        )
      ] }, pg.id)) }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(Separator, {}),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("section", { "aria-labelledby": "meet-chefs-title", className: "space-y-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(SectionHeader, { overline: "Team", title: "Meet the Chefs" }),
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("div", { className: "grid gap-8 md:grid-cols-2", children: chefs.map((c) => /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(ChefCard, { name: c.name, bio: c.bio, imageSrc: c.imageSrc, imageAlt: c.imageAlt }, c.name)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(Separator, {}),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("section", { "aria-labelledby": "values-title", className: "space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(SectionHeader, { overline: "Principles", title: "What We Value" }),
        /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "grid gap-6 md:grid-cols-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("p", { className: "prose-lite md:col-span-2", children: "We care about flavor and nutrition in equal measure. We cook with care, spend with purpose, and look for long-term relationships \u2014 with families who invite us in, and with producers who grow the food we serve." }),
          /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "space-y-2 text-sm text-neutral-700", children: [
            /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("h3", { className: "text-base font-semibold text-neutral-900", children: "Principles" }),
            /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("ul", { className: "list-disc pl-5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: "Celebrating home cooks" }),
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: "Supporting family nutrition" }),
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: "Spending with local producers" }),
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: "Collaborating with Minnesota organizations" }),
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: "Sharing and shaping Minnesota food culture" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(Separator, {}),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("section", { "aria-labelledby": "local-title", className: "space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(SectionHeader, { overline: "Philosophy", title: "What We Mean by Local" }),
        /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "grid gap-6 md:grid-cols-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("p", { className: "prose-lite md:col-span-2", children: "\u201CLocal\u201D is more than a trend for us \u2014 it\u2019s the backbone of how we cook and shop. We prioritize Minnesota-grown ingredients, plan menus around the seasons, and maintain relationships with small producers so we can tell you where your food comes from." }),
          /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { className: "space-y-2 text-sm text-neutral-700", children: [
            /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("h3", { className: "text-base font-semibold text-neutral-900", children: "How we apply it" }),
            /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("ul", { className: "list-disc pl-5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: "Minnesota-first sourcing; regional when sensible" }),
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: "Seasonal menus; preserve when possible" }),
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: "Direct relationships with farms and mills" }),
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: "Reasonable exceptions for essentials (e.g., spices)" }),
              /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("li", { children: "Transparency: ask us about any ingredient" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(Separator, {}),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("section", { "aria-labelledby": "why-us-title", className: "space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(SectionHeader, { overline: "Partner With Us", title: "Why Work With Us" }),
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("p", { className: "prose-lite max-w-4xl", children: "Clients trust us for our professional experience, pride in ingredients, and equal care for nutrition and flavor. We keep presentation humble, but our food \u2014 and our commitment to your happiness \u2014 is anything but." })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("section", { "aria-labelledby": "cta-title", className: "space-y-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(SectionHeader, { overline: "Get Started", title: "Let\u2019s Cook Something Local" }),
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("p", { className: "prose-lite max-w-3xl", children: "We\u2019d love to bring Minnesota-grown food to your table or event." }),
        /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
          ModernButton,
          {
            as: "a",
            href: "https://www.localeffortfood.com/services#event-request",
            "aria-label": "Submit Event Request",
            size: "md",
            variant: "primary",
            children: "Submit Event Request"
          }
        ) })
      ] })
    ] }) })
  ] });
};
var AboutUsPage_default = AboutUsPage;

// src/pages/ServicesPage.jsx
var import_react23 = __toESM(require("react"));
var import_react_router_dom4 = require("react-router-dom");
var import_react_helmet_async4 = __toESM(require_lib());
var import_jsx_runtime25 = require("react/jsx-runtime");
var ServicesPage = () => {
  const navigate = (0, import_react_router_dom4.useNavigate)();
  const location = (0, import_react_router_dom4.useLocation)();
  (0, import_react23.useEffect)(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      }
    }
  }, [location.hash]);
  const initialForm2 = (0, import_react23.useMemo)(
    () => ({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      eventDate: "",
      // MM-DD-YYYY
      city: "",
      state: "",
      zip: "",
      eventType: "",
      guestCount: "",
      notes: "",
      sendCopy: false
    }),
    []
  );
  const [form, setForm] = (0, import_react23.useState)(initialForm2);
  const [submitting, setSubmitting] = (0, import_react23.useState)(false);
  const [result, setResult] = (0, import_react23.useState)(null);
  const [bookHero, setBookHero] = (0, import_react23.useState)(null);
  const [business, setBusiness] = (0, import_react23.useState)(null);
  const required = (v) => String(v || "").trim().length > 0;
  const handleChange = (e) => {
    const { name: name2, type, checked, value } = e.target;
    setForm((f) => ({ ...f, [name2]: type === "checkbox" ? checked : value }));
  };
  const reset = () => setForm(initialForm2);
  (0, import_react23.useEffect)(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch(`/api/search-images?query=book&per_page=1`);
        if (!res.ok) throw new Error(`Book image failed: ${res.status}`);
        const data = await res.json();
        if (abort) return;
        const first = (data.images || [])[0];
        if (first) setBookHero(first.public_id);
      } catch (_e) {
      }
    })();
    return () => {
      abort = true;
    };
  }, []);
  (0, import_react23.useEffect)(() => {
    let mounted = true;
    fetch("/business.json").then((r) => r.ok ? r.json() : null).then((data) => {
      if (mounted) setBusiness(data || null);
    }).catch(() => {
    });
    return () => {
      mounted = false;
    };
  }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    if (!required(form.firstName) || !required(form.lastName) || !required(form.phone) || !required(form.email)) {
      setResult({ ok: false, message: "Please complete first name, last name, phone, and email." });
      return;
    }
    try {
      setSubmitting(true);
      const resp = await fetch("/api/events/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          eventDate: form.eventDate,
          city: form.city,
          state: form.state,
          zip: form.zip,
          eventType: form.eventType,
          guestCount: form.guestCount,
          notes: form.notes,
          sendCopy: !!form.sendCopy
        })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Failed to submit");
      setResult({ ok: true, message: "thank you so much! we'll get right back to you." });
      reset();
    } catch (err) {
      setResult({ ok: false, message: err.message || "Submission failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(import_jsx_runtime25.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(import_react_helmet_async4.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("title", { children: "Services | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
        "meta",
        {
          name: "description",
          content: "Explore the personal chef and catering services offered by Local Effort."
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("script", { type: "application/ld+json", children: JSON.stringify((() => {
        const src = business || {};
        return {
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          name: src.name || "Local Effort",
          url: (src.url || "https://localeffortfood.com") + "/services",
          areaServed: Array.isArray(src.serviceArea) && src.serviceArea.length ? src.serviceArea : ["Minneapolis", "St. Paul", "Twin Cities", "Roseville", "Minnesota", "Western Wisconsin"],
          sameAs: Array.isArray(src.sameAs) ? src.sameAs : void 0,
          telephone: src.telephone || void 0,
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Services",
            itemListElement: [
              { "@type": "Service", name: "Personal Chef", description: "In-home private dinners and small gatherings." },
              { "@type": "Service", name: "Weekly Meal Prep", description: "Nutritious, locally-sourced weekly menus and plans." },
              { "@type": "Service", name: "Event Catering", description: "Small event catering with seasonal, local ingredients." }
            ]
          }
        };
      })()) }),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("script", { type: "application/ld+json", children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "How far in advance should I book?", acceptedAnswer: { "@type": "Answer", text: "As early as you can\u2014two to four weeks is helpful, but we can sometimes accommodate short notice." } },
          { "@type": "Question", name: "What is the typical group size?", acceptedAnswer: { "@type": "Answer", text: "We specialize in intimate dinners and small events up to about 50 guests." } },
          { "@type": "Question", name: "Can you customize the menu?", acceptedAnswer: { "@type": "Answer", text: "Yes. We tailor menus around your tastes, dietary needs, and seasonal local ingredients." } }
        ]
      }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "space-y-16 mx-auto max-w-6xl px-4 md:px-6 lg:px-8", children: [
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(SectionHeader, { overline: "Capabilities", title: "Services" }),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-8", children: [
        /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "card space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("h3", { className: "text-heading", children: "Dinners & Events" }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "text-body", children: "in-home dinner parties and small events up to 50" }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("button", { onClick: () => navigate("/events"), className: "text-body text-sm underline", children: "Details \u2192" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "card space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("h3", { className: "text-heading", children: "Weekly Meal Plans" }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "text-body", children: "Nutritious, locally-sourced meals delivered weekly." }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("button", { onClick: () => navigate("/meal-prep"), className: "text-body text-sm underline", children: "Details \u2192" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "card space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("h3", { className: "text-heading", children: "Pizza Parties" }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "text-body", children: "local pizza at your party. we'll bring the oven." }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
            "button",
            {
              onClick: () => navigate("/pizza-party"),
              className: "text-body text-sm underline",
              children: "Details \u2192"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("div", { className: "text-center", children: /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("span", { className: "sr-only", children: [
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("a", { href: "/personal-chef-minneapolis", className: "btn btn-ghost", children: "Personal Chef Minneapolis" }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("a", { href: "/personal-chef-st-paul", className: "btn btn-ghost", children: "Personal Chef St. Paul" }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("a", { href: "/personal-chef-twin-cities", className: "btn btn-ghost", children: "Twin Cities Personal Chef" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(Separator, {}),
      /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("section", { id: "event-request", className: "pt-10", children: /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "max-w-3xl mx-auto", children: [
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(SectionHeader, { overline: "Get Started", title: "Book an event" }),
        bookHero && /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("div", { className: "w-full h-[30vh] md:h-[36vh] lg:h-[42vh] rounded-xl overflow-hidden mb-6", children: /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
          cloudinaryImage_default,
          {
            publicId: bookHero,
            alt: "Book an event",
            className: "w-full h-full object-cover",
            sizes: "100vw",
            eager: true
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "text-body mb-6 text-center", children: "Tell us about your event and we\u2019ll follow up with availability and a tailored menu." }),
        /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("div", { className: "form-card", children: /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("label", { className: "block text-sm font-medium", htmlFor: "firstName", children: "Contact Name *" }),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "grid md:grid-cols-2 gap-4 mt-1", children: [
              /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                "input",
                {
                  id: "firstName",
                  name: "firstName",
                  value: form.firstName,
                  onChange: handleChange,
                  className: "w-full border rounded-md p-2",
                  placeholder: "First Name",
                  required: true
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                "input",
                {
                  id: "lastName",
                  name: "lastName",
                  value: form.lastName,
                  onChange: handleChange,
                  className: "w-full border rounded-md p-2",
                  placeholder: "Last Name",
                  required: true
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "hint mt-1", children: "This field is required." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "grid md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("label", { className: "block text-sm font-medium", htmlFor: "phone", children: "Phone Number *" }),
              /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                "input",
                {
                  type: "tel",
                  id: "phone",
                  name: "phone",
                  value: form.phone,
                  onChange: handleChange,
                  className: "mt-1 w-full border rounded-md p-2",
                  placeholder: "(000) 000-0000",
                  required: true
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("label", { className: "block text-sm font-medium", htmlFor: "email", children: "E-mail *" }),
              /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                "input",
                {
                  type: "email",
                  id: "email",
                  name: "email",
                  value: form.email,
                  onChange: handleChange,
                  className: "mt-1 w-full border rounded-md p-2",
                  placeholder: "example@example.com",
                  required: true
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("label", { className: "block text-sm font-medium", htmlFor: "eventDate", children: "Event Date" }),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
              "input",
              {
                type: "date",
                id: "eventDate",
                name: "eventDate",
                value: form.eventDate,
                onChange: handleChange,
                className: "mt-1 w-full border rounded-md p-2"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "hint mt-1", children: "Choose a date from the calendar." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("label", { className: "block text-sm font-medium", htmlFor: "city", children: "Where will the event take place?" }),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "grid md:grid-cols-3 gap-4 mt-1", children: [
              /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                "input",
                {
                  id: "city",
                  name: "city",
                  value: form.city,
                  onChange: handleChange,
                  className: "w-full border rounded-md p-2",
                  placeholder: "City"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(
                "select",
                {
                  id: "state",
                  name: "state",
                  value: form.state,
                  onChange: handleChange,
                  className: "w-full border rounded-md p-2 bg-white",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("option", { value: "", children: "Please Select" }),
                    ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"].map((s) => /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("option", { value: s, children: s }, s))
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
                "input",
                {
                  id: "zip",
                  name: "zip",
                  value: form.zip,
                  onChange: handleChange,
                  className: "w-full border rounded-md p-2",
                  placeholder: "Zip Code"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("label", { className: "block text-sm font-medium", htmlFor: "eventType", children: "Event Type" }),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)(
              "select",
              {
                id: "eventType",
                name: "eventType",
                value: form.eventType,
                onChange: handleChange,
                className: "mt-1 w-full border rounded-md p-2 bg-white",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("option", { value: "", children: "Please Select" }),
                  /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("option", { children: "Home Dinner" }),
                  /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("option", { children: "Small Event" }),
                  /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("option", { children: "Wedding" }),
                  /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("option", { children: "Baby Shower" }),
                  /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("option", { children: "Pizza Party" }),
                  /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("option", { children: "Other" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("label", { className: "block text-sm font-medium", htmlFor: "guestCount", children: "Estimated guest count" }),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
              "input",
              {
                type: "number",
                id: "guestCount",
                name: "guestCount",
                value: form.guestCount,
                onChange: handleChange,
                className: "mt-1 w-full border rounded-md p-2",
                placeholder: "ex: 23",
                min: "1"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("label", { className: "block text-sm font-medium", htmlFor: "notes", children: "Tell us more! What sort of meal are you thinking? Which foods do you like? What questions do you have for us straight away?" }),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
              "textarea",
              {
                id: "notes",
                name: "notes",
                value: form.notes,
                onChange: handleChange,
                className: "mt-1 w-full border rounded-md p-2",
                rows: 4,
                placeholder: "Type here..."
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("label", { className: "inline-flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("input", { type: "checkbox", name: "sendCopy", checked: form.sendCopy, onChange: handleChange }),
            /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("span", { className: "text-sm", children: "Email me a copy of this request" })
          ] }),
          result && /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("div", { className: "text-sm " + (result.ok ? "text-green-700" : "text-red-700"), children: result.message }),
          /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("div", { className: "actions", children: /* @__PURE__ */ (0, import_jsx_runtime25.jsx)(
            "button",
            {
              type: "submit",
              disabled: submitting,
              className: "btn btn-primary",
              children: submitting ? "Submitting\u2026" : "Submit"
            }
          ) })
        ] }) })
      ] }) })
    ] })
  ] });
};
var ServicesPage_default = ServicesPage;

// src/pages/PricingPage.jsx
var import_react25 = __toESM(require("react"));
var import_react_helmet_async5 = __toESM(require_lib());

// src/components/pricing/CostEstimator.jsx
var import_react24 = __toESM(require("react"));
var import_jsx_runtime26 = require("react/jsx-runtime");
var CostEstimator = () => {
  const [userAnswers, setUserAnswers] = (0, import_react24.useState)({});
  const [currentQuestionKey, setCurrentQuestionKey] = (0, import_react24.useState)("start");
  const [questionPath, setQuestionPath] = (0, import_react24.useState)([]);
  const [finalCost, setFinalCost] = (0, import_react24.useState)(0);
  const [breakdown, setBreakdown] = (0, import_react24.useState)([]);
  const [showResults, setShowResults] = (0, import_react24.useState)(false);
  const questions = {
    start: {
      id: "serviceType",
      title: "What kind of service are you looking for?",
      type: "options",
      options: [
        { text: "Weekly Meal Plan", value: "mealPlan" },
        { text: "Small Event or Party", value: "smallEvent" },
        { text: "Intimate Dinner at Home", value: "dinnerAtHome" },
        { text: "Pizza Party", value: "pizzaParty" }
      ],
      next: (answer) => `${answer}_q1`
    },
    mealPlan_q1: {
      id: "numPeople",
      title: "How many people?",
      type: "number",
      placeholder: "e.g., 2",
      next: "mealPlan_q2"
    },
    mealPlan_q2: {
      id: "meals",
      title: "Meals per week?",
      type: "multi_number",
      fields: [
        { id: "breakfasts", label: "Breakfasts" },
        { id: "lunches", label: "Lunches" },
        { id: "dinners", label: "Dinners" }
      ],
      next: "mealPlan_q3"
    },
    mealPlan_q3: {
      id: "billing",
      title: "Billing preference?",
      type: "options",
      options: [
        { text: "Weekly", value: "weekly" },
        { text: "Monthly (10% off)", value: "monthly" },
        { text: "Seasonally (20% off)", value: "seasonal" }
      ],
      next: "end"
    },
    smallEvent_q1: {
      id: "numPeople",
      title: "How many guests?",
      type: "number",
      placeholder: "e.g., 25",
      next: "smallEvent_q2"
    },
    dinnerAtHome_q1: {
      id: "numPeople",
      title: "How many guests?",
      type: "number",
      placeholder: "e.g., 4",
      next: "smallEvent_q2"
    },
    smallEvent_q2: {
      id: "serviceStyle",
      title: "Service style?",
      type: "options",
      options: [
        { text: "Food Drop-off", value: "dropoff" },
        { text: "Passed Appetizers", value: "passedApps" },
        { text: "Buffet Style", value: "buffet" },
        { text: "Buffet & Passed Apps", value: "buffetAndPassed" },
        { text: "Plated Meal", value: "plated" }
      ],
      next: "smallEvent_q4"
    },
    smallEvent_q4: {
      id: "sensitivity",
      title: "Focus for the event?",
      type: "options",
      options: [
        { text: "Premium / Unforgettable", value: "quality_sensitive" },
        { text: "Budget-friendly / Impressive", value: "price_sensitive" }
      ],
      next: "end"
    },
    pizzaParty_q1: {
      id: "numPeople",
      title: "How many people?",
      type: "number",
      placeholder: "e.g., 20",
      next: "pizzaParty_q2"
    },
    pizzaParty_q2: {
      id: "addons",
      title: "Add-ons (salads, etc.)?",
      type: "options",
      options: [
        { text: "Yes", value: true },
        { text: "No, just pizza", value: false }
      ],
      next: "end"
    }
  };
  const calculateCost = (answers) => {
    let totalCost = 0;
    const people = parseInt(answers.numPeople) || 1;
    switch (answers.serviceType) {
      case "mealPlan":
        totalCost = people * ((parseInt(answers.breakfasts) || 0) * 15 + (parseInt(answers.lunches) || 0) * 20 + (parseInt(answers.dinners) || 0) * 25);
        break;
      case "smallEvent":
        totalCost = people * 75;
        break;
      case "dinnerAtHome":
        totalCost = people * 120;
        break;
      case "pizzaParty":
        totalCost = 300 + (people > 15 ? (people - 15) * 18 : 0);
        break;
      default:
        totalCost = 0;
    }
    const summary = [`Estimated cost for ${people} person(s): $${totalCost.toFixed(2)}`];
    switch (answers.serviceType) {
      case "mealPlan":
        summary.push("Includes weekly breakfasts, lunches, and dinners.");
        break;
      case "smallEvent":
        summary.push("Covers staffing, setup, and cleanup for your event.");
        break;
      case "dinnerAtHome":
        summary.push("Private chef experience with in-home service.");
        break;
      case "pizzaParty":
        summary.push("Wood-fired pizza service with optional add-ons.");
        break;
      default:
        break;
    }
    setFinalCost(totalCost);
    setBreakdown(summary);
    setShowResults(true);
  };
  const handleAnswer = (question, value) => {
    const newAnswers = { ...userAnswers };
    if (question.type === "multi_number") {
      Object.assign(newAnswers, value);
    } else {
      newAnswers[question.id] = value;
    }
    setUserAnswers(newAnswers);
    setQuestionPath([...questionPath, currentQuestionKey]);
    let nextKey = typeof question.next === "function" ? question.next(value) : question.next;
    if (!nextKey || nextKey === "end") {
      calculateCost(newAnswers);
    } else {
      setCurrentQuestionKey(nextKey);
    }
  };
  const restart = () => {
    setUserAnswers({});
    setCurrentQuestionKey("start");
    setQuestionPath([]);
    setShowResults(false);
  };
  if (showResults) {
    return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "border border-gray-900 p-8 text-center", children: [
      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("h3", { className: "heading-lg heading-balance", children: "All-inclusive ballpark estimate" }),
      /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("p", { className: "text-6xl font-bold my-4", children: [
        "$",
        finalCost.toFixed(2)
      ] }),
      breakdown.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "bg-gray-200 p-4 text-left mb-6 font-mono text-sm", children: breakdown.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("p", { children: item }, index)) }),
      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("button", { onClick: restart, className: "mt-6 text-sm underline font-mono", children: "Start Over" })
    ] });
  }
  const currentQData = questions[currentQuestionKey];
  return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "relative w-full border border-gray-900 p-8 min-h-[400px]", children: [
    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("h2", { className: "heading-lg heading-balance mb-6", children: currentQData.title }),
    currentQData.type === "options" && /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("div", { className: "space-y-3 font-mono", children: currentQData.options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
      "button",
      {
        onClick: () => handleAnswer(currentQData, opt.value),
        className: "w-full text-left p-4 border border-gray-900 hover:bg-gray-200 block",
        children: opt.text
      },
      opt.value.toString()
    )) }),
    currentQData.type === "number" && /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
        "input",
        {
          type: "number",
          id: `input-${currentQData.id}`,
          placeholder: currentQData.placeholder,
          className: "w-full p-4 text-xl border-b-2 border-gray-900 outline-none bg-transparent font-mono",
          onKeyPress: (e) => {
            if (e.key === "Enter") {
              handleAnswer(currentQData, e.target.value || "0");
            }
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
        "button",
        {
          onClick: () => handleAnswer(
            currentQData,
            document.getElementById(`input-${currentQData.id}`).value || "0"
          ),
          className: "mt-6 bg-gray-900 text-white font-mono py-2 px-4 hover:bg-gray-700",
          children: "OK"
        }
      )
    ] }),
    currentQData.type === "multi_number" && /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "font-mono space-y-4", children: [
      currentQData.fields.map((field) => /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "grid grid-cols-2 items-center gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("label", { htmlFor: `input-${field.id}`, className: "text-lg", children: field.label }),
        /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
          "input",
          {
            type: "number",
            id: `input-${field.id}`,
            placeholder: "0",
            className: "p-3 text-lg border-b-2 border-gray-900 outline-none bg-transparent"
          }
        )
      ] }, field.id)),
      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
        "button",
        {
          onClick: () => {
            const multiValue = {};
            currentQData.fields.forEach((field) => {
              multiValue[field.id] = document.getElementById(`input-${field.id}`).value || "0";
            });
            handleAnswer(currentQData, multiValue);
          },
          className: "mt-6 bg-gray-900 text-white font-mono py-2 px-4 hover:bg-gray-700 !ml-auto !block",
          children: "OK"
        }
      )
    ] })
  ] });
};

// src/pages/PricingPage.jsx
var import_framer_motion5 = require("framer-motion");

// src/data/pricingFaq.json
var pricingFaq_default = [
  {
    name: "How much does a weekly meal plan cost?",
    answer: "Weekly meal prep plans begin around $275 per person per week for 15 meals. This is a median price based on typical variables. Pricing is always calculated for the client's actual needs and we discount for couples, families, and longer-term billing."
  },
  {
    name: "What is the cost for a small event or party?",
    answer: "A simple food drop-off service starts as low as $25 per person. Full-service coursed and plated meals typically range from $55 to $125 per guest, based on ingredients."
  },
  {
    name: "How much does an intimate dinner at home cost?",
    answer: "An intimate dinner at your home generally ranges from $95 to $135 per person depending on guest count, number of courses, and specialty sourcing."
  },
  {
    name: "How much is a private pizza party?",
    answer: "Private pizza parties start at $300 for groups up to 15 and scale with additional toppings, sides, travel distance, and service style."
  }
];

// src/pages/PricingPage.jsx
var import_jsx_runtime27 = require("react/jsx-runtime");
var PricingPage = () => {
  const faqEntities = pricingFaq_default.map((item) => ({
    "@type": "Question",
    name: item.name,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer
    }
  }));
  return /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)(import_jsx_runtime27.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)(import_react_helmet_async5.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("title", { children: "How Much Does a Personal Chef Cost? | Minneapolis Personal Chef Pricing \u2014 Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
        "meta",
        {
          name: "description",
          content: "How much does a personal chef cost? See Minneapolis\u2013St. Paul price ranges for in-home dinners, weekly meal prep, and small events. Use our estimator for a quick ballpark."
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("link", { rel: "canonical", href: "https://localeffortfood.com/pricing" }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("meta", { name: "robots", content: "index,follow" }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
        "meta",
        {
          name: "keywords",
          content: "how much does a personal chef cost, personal chef cost Minneapolis, private chef cost, personal chef pricing, cost of personal chef per person, weekly meal prep cost, private chef Minneapolis pricing"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("meta", { property: "og:type", content: "website" }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("meta", { property: "og:url", content: "https://localeffortfood.com/pricing" }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("meta", { property: "og:title", content: "How Much Does a Personal Chef Cost? Minneapolis Personal Chef Pricing \u2014 Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("meta", { property: "og:description", content: "See typical costs for personal chefs in Minneapolis\u2013St. Paul: in-home dinners, weekly meal prep, and small events. Try the estimator for a quick ballpark." }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("meta", { property: "og:image", content: "/gallery/logo.png?text=Local+Effort&font=mono" }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("meta", { name: "twitter:card", content: "summary_large_image" }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("meta", { name: "twitter:title", content: "How Much Does a Personal Chef Cost? Minneapolis Personal Chef Pricing \u2014 Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("meta", { name: "twitter:description", content: "See typical personal chef costs in Minneapolis\u2013St. Paul and use our estimator to get a quick ballpark for your event or weekly meals." }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("meta", { name: "twitter:image", content: "/gallery/logo.png?text=Local+Effort&font=mono" }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
        "script",
        {
          type: "application/ld+json",
          children: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqEntities })
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "space-y-16 max-w-5xl mx-auto px-4 py-12", children: [
      /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)(
        import_framer_motion5.motion.div,
        {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5 },
          className: "text-center space-y-4",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("h1", { className: "heading-display heading-balance", children: "Personal chef pricing, simplified." }),
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("p", { className: "heading-subtitle text-neutral-600 max-w-3xl mx-auto", children: "It\u2019s not as expensive as you think." }),
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("p", { className: "text-lg text-gray-700 max-w-3xl mx-auto", children: "We tailor pricing closely to your needs. We try to stay competitive to an evening at a nice restaurant, (or to the price of takeout, depending on the request). Oftentimes, we're the much better deal." }),
            /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("p", { className: "text-lg text-gray-700 max-w-3xl mx-auto mt-4", children: [
              "Below is a handy tool that can take some of the mystery out. We'll finalize the actual price ",
              /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("a", { href: "/services#event-request", className: "underline", children: "together" }),
              "."
            ] })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)(
        import_framer_motion5.motion.section,
        {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.5 },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("h2", { className: "heading-xl heading-underline", children: "Cost estimator" }),
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(CostEstimator, {})
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)(
        import_framer_motion5.motion.section,
        {
          id: "pricing-faq",
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.5 },
          className: "space-y-4",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("h2", { className: "heading-xl heading-underline", children: "Personal chef pricing FAQ" }),
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("p", { className: "text-gray-700", children: "Weekly meal prep plans begin around $275 per person per week for 15 meals. This is a median price based on typical variables. Pricing is always calculated for each client's actual needs, with discounts for couples, families, and longer-term billing." }),
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("h3", { className: "text-lg font-semibold mt-4", children: "How much does a personal chef cost in Minneapolis?" }),
            /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("div", { className: "space-y-6", children: pricingFaq_default.map((item) => /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "border border-gray-200 rounded-lg p-6", children: [
              /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("h4", { className: "text-xl font-semibold", children: item.name }),
              /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("p", { className: "text-gray-700 mt-2", children: item.answer })
            ] }, item.name)) })
          ]
        }
      )
    ] })
  ] });
};
var PricingPage_default = PricingPage;

// src/pages/MenuPage.jsx
var import_react26 = __toESM(require("react"));
var import_react_helmet_async6 = __toESM(require_lib());

// src/data/sampleMenus.js
var sampleMenus = [
  {
    id: 1,
    title: "Cabin dinner for 12 in May",
    description: "",
    sections: [
      {
        course: "Start",
        items: [
          {
            name: "Sourdough focaccia with spring herbs",
            note: "",
            dietary: [],
            imagePublicId: "dishes/focaccia_spring_herbs"
          },
          {
            name: "Roasted beets over labneh",
            note: "local beets, fresh strained yogurt, citrus and hazelnut",
            dietary: ["v", "gf"],
            imagePublicId: "dishes/beets_labneh"
          },
          {
            name: "Asparagus salad",
            note: "bacon, hazelnut, parmesan",
            dietary: ["gf"],
            imagePublicId: "dishes/asparagus_salad_bacon"
          },
          {
            name: "Agnolotti",
            note: "fresh pasta filled with ricotta and gouda, served with butter and crispy mushroom, honey",
            dietary: [],
            imagePublicId: "dishes/agnolotti_ricotta"
          }
        ]
      },
      {
        course: "Main",
        items: [
          {
            name: "Rainbow trout",
            note: "raised in Forest Hills, wrapped in fennel and broweston iled cabbage, with asparagus and potato puree",
            dietary: ["gf"],
            imagePublicId: "dishes/rainbow_trout_fennel"
          },
          {
            name: "Chicken ballotine",
            note: "with chewy carrots, ramps, sherry jus",
            dietary: [],
            imagePublicId: "dishes/chicken_ballotine_carrots"
          }
        ]
      },
      {
        course: "Dessert",
        items: [
          {
            name: "Strawberry shortcake",
            note: "",
            dietary: [],
            imagePublicId: "dishes/strawberry_shortcake"
          }
        ]
      }
    ]
  },
  {
    id: 2,
    title: "Office Party for 20",
    description: "(Stationary, substantial appetizers)",
    sections: [
      {
        course: "Menu",
        items: [
          {
            name: "Charcuterie spread",
            note: "duck breast 'prosciutto,' beef bresaola from Indiana, Wisconsin gouda, Minnesota 'camembert,' candied hazelnuts, pickled vegetables, flax crackers, jam, and a pate",
            dietary: [],
            imagePublicId: "events/charcuterie_spread_full"
          },
          {
            name: "Sourdough focaccia",
            note: "with herbes de Provence",
            dietary: [],
            imagePublicId: "dishes/focaccia_provence"
          },
          {
            name: "Beets over labneh",
            note: "local beets treated very nicely, over fresh strained yogurt, with citrus and hazelnut",
            dietary: ["v", "gf"],
            imagePublicId: "dishes/beets_labneh_citrus"
          },
          {
            name: "Simple carrot salad",
            note: "julienned carrots tossed in cilantro and pistachio",
            dietary: ["v", "gf"],
            imagePublicId: "dishes/carrot_salad_pistachio"
          },
          {
            name: "Duck Pastrami sliders",
            note: "on fresh buns with aioli and pickled cabbage",
            dietary: [],
            imagePublicId: "dishes/duck_sliders"
          }
        ]
      }
    ]
  },
  {
    id: 3,
    title: "Home Event, University gala, 13 guests",
    description: "",
    sections: [
      {
        course: "Passed Apps",
        items: [
          {
            name: "Grilled Lamb loin Skewers",
            note: "marinated in onion and mint",
            dietary: [],
            imagePublicId: "dishes/lamb_skewers_mint"
          },
          {
            name: "Grilled Vegetable skewers",
            note: "early season",
            dietary: ["v", "gf"],
            imagePublicId: "dishes/veg_skewers_summer"
          },
          {
            name: "Walleye brandade",
            note: "on house crackers",
            dietary: [],
            imagePublicId: "dishes/walleye_brandade_crackers"
          }
        ]
      },
      {
        course: "Start",
        items: [
          {
            name: "Pork Belly Porchetta with spaetzle",
            note: "served with peas and carrots, applesauce",
            dietary: [],
            imagePublicId: "dishes/porchetta_spaetzle"
          },
          {
            name: "Sourdough focaccia for the table",
            note: "",
            dietary: [],
            imagePublicId: "dishes/focaccia_table"
          }
        ]
      },
      {
        course: "Main",
        items: [
          {
            name: "Duck leg confit",
            note: "with red polenta and mushrooms",
            dietary: ["gf"],
            imagePublicId: "dishes/duck_confit_polenta"
          },
          {
            name: "Alaskan Sockeye",
            note: "wrapped in charred cabbage and fennel, served with crispy russet potatoes",
            dietary: ["gf"],
            imagePublicId: "dishes/sockeye_cabbage"
          },
          {
            name: "Pheasant ballotine",
            note: "mushroom, carrot, celery root puree",
            dietary: [],
            imagePublicId: "dishes/pheasant_ballotine"
          }
        ]
      },
      {
        course: "Dessert",
        items: [
          {
            name: "Citrus tart",
            note: "blood orange, Meyer lemon, kumquat",
            dietary: [],
            imagePublicId: "dishes/citrus_tart"
          },
          {
            name: "Torta Caprese",
            note: "dense chocolate hazelnut cake",
            dietary: [],
            imagePublicId: "dishes/torta_caprese"
          }
        ]
      }
    ]
  },
  {
    id: 4,
    title: "Bar Brava Industry Night",
    description: "",
    sections: [
      {
        course: "Menu",
        items: [
          {
            name: "Sloppy Joe",
            note: "on fresh potato bun with purple slaw and white onion",
            dietary: [],
            imagePublicId: "dishes/sloppy_joe"
          },
          {
            name: "Pate en Croute",
            note: "with lamb and duck, served with watercress and mustard",
            dietary: [],
            imagePublicId: "dishes/pate_en_croute"
          },
          {
            name: "Lamb neck",
            note: "over white beans with leek confit and tomato vinaigrette",
            dietary: [],
            imagePublicId: "dishes/lamb_neck_beans"
          },
          {
            name: "Chef's Big Salad",
            note: "fresh greens, beets, carrots, potatoes - add trout",
            dietary: ["v", "gf"],
            imagePublicId: "dishes/chefs_salad"
          },
          {
            name: "Cheese and crackers",
            note: "with jam",
            dietary: [],
            imagePublicId: "dishes/cheese_crackers"
          },
          {
            name: "Duck Prosciutto",
            note: "with pickles",
            dietary: [],
            imagePublicId: "dishes/duck_prosciutto"
          },
          {
            name: "Sourdough Focaccia",
            note: "",
            dietary: [],
            imagePublicId: "dishes/focaccia_plain"
          }
        ]
      },
      {
        course: "Dessert",
        items: [
          { name: "Carrot cake", note: "", dietary: [], imagePublicId: "dishes/carrot_cake" },
          {
            name: "Hazelnut Butter Cup",
            note: "",
            dietary: [],
            imagePublicId: "dishes/hazelnut_cup"
          }
        ]
      }
    ]
  },
  {
    id: 5,
    title: "January Wedding for 60",
    description: "",
    sections: [
      {
        course: "Stationary",
        items: [
          {
            name: "Charcuterie and Cheese spread",
            note: "local meat and cheeses, including duck \u2018prosciutto\u2019, accoutrement like pickles, nuts, chips, jams, sourdough bread and crackers, dips",
            dietary: [],
            imagePublicId: "events/charcuterie_wedding"
          }
        ]
      },
      {
        course: "Passed",
        items: [
          {
            name: "Squash toast",
            note: "ricotta, roasted Kabocha squash, sage honey, fermented chili flake and olive oil",
            dietary: ["v", "gf"],
            imagePublicId: "dishes/squash_toast"
          },
          {
            name: "Charred Date Cruller Bites",
            note: "Pork skin, balsalmic",
            dietary: [],
            imagePublicId: "dishes/date_cruller"
          }
        ]
      },
      {
        course: "Seated and shared - Vegetable dishes",
        items: [
          {
            name: "White wine-Poached Leeks over mustard vinaigrette",
            note: "",
            dietary: ["v", "gf"],
            imagePublicId: "dishes/poached_leeks"
          },
          {
            name: "Roasted beets over cultured labneh with citrus and hazelnuts",
            note: "",
            dietary: ["v", "gf"],
            imagePublicId: "dishes/beets_labneh_wedding"
          },
          {
            name: "Smoky cauliflower in lemon cream with watercress and pistachio dukkuh",
            note: "",
            dietary: ["v"],
            imagePublicId: "dishes/smoky_cauliflower"
          },
          {
            name: "Raw carrots, julienned and dressed in cilantro and pistachio",
            note: "",
            dietary: ["v", "gf"],
            imagePublicId: "dishes/raw_carrots_julienned"
          },
          {
            name: "Roasted Winter chicories and cabbages, goat cheese, pepitas, citrus",
            note: "",
            dietary: ["v", "gf"],
            imagePublicId: "dishes/winter_chicories"
          },
          {
            name: "Purple sweet potato salad, warm/German style, tahini aioli, red onion and hominy",
            note: "",
            dietary: ["v"],
            imagePublicId: "dishes/sweet_potato_salad"
          }
        ]
      },
      {
        course: "Seated and shared - Meat dishes",
        items: [
          {
            name: "Braised bison and spaetzle, carrots and peas",
            note: "",
            dietary: [],
            imagePublicId: "dishes/bison_spaetzle"
          },
          {
            name: "Cassoulet, duck confit with white bean and lamb sausage",
            note: "",
            dietary: [],
            imagePublicId: "dishes/cassoulet"
          },
          {
            name: "Chicken Ballontine, rolled and sliced, with mushroom and gravy",
            note: "",
            dietary: [],
            imagePublicId: "dishes/chicken_ballotine_gravy"
          },
          {
            name: "Rainbow Trout over potato galette, gruyere",
            note: "",
            dietary: ["gf"],
            imagePublicId: "dishes/trout_galette"
          }
        ]
      },
      {
        course: "Desserts",
        items: [
          {
            name: "Cookie plates",
            note: "ex. Cardamom citrus shortbread, hazelnut linzer with plum, cranberry oat bars",
            dietary: [],
            imagePublicId: "events/cookie_plates"
          }
        ]
      }
    ]
  },
  {
    id: 6,
    title: "Late Spring Wedding for 130",
    description: "",
    sections: [
      {
        course: "Start/Share",
        items: [
          {
            name: "Sourdough Focaccia \u201Cbreadsticks\u201D",
            note: "",
            dietary: [],
            imagePublicId: "dishes/focaccia_sticks"
          },
          {
            name: "All-belly Porchetta, braised in cider",
            note: "",
            dietary: [],
            imagePublicId: "dishes/porchetta_cider"
          },
          {
            name: "Skewers - lamb and vegetable",
            note: "",
            dietary: [],
            imagePublicId: "dishes/mixed_skewers"
          },
          {
            name: "Crackers, Pickles and pickled fish, Walleye Brandade",
            note: "",
            dietary: [],
            imagePublicId: "dishes/pickled_fish_crackers"
          },
          {
            name: "Crudite, Bagna Cauda",
            note: "",
            dietary: ["v"],
            imagePublicId: "dishes/crudite_bagna_cauda"
          },
          {
            name: "Lamb hand pies, carrots potatoes and peas",
            note: "",
            dietary: [],
            imagePublicId: "dishes/lamb_hand_pies"
          }
        ]
      },
      {
        course: "Main",
        items: [
          {
            name: "Duck leg confit, over red polenta and grilled asparagus",
            note: "",
            dietary: ["gf"],
            imagePublicId: "dishes/duck_confit_asparagus"
          },
          {
            name: "Alaskan Sockeye, wild mushroom risotto with peas",
            note: "",
            dietary: ["gf"],
            imagePublicId: "dishes/sockeye_risotto"
          }
        ]
      },
      {
        course: "Desserts",
        items: [
          {
            name: "Hazelnut linzer with jam",
            note: "",
            dietary: [],
            imagePublicId: "dishes/hazelnut_linzer"
          },
          {
            name: "Millionaire shortbread",
            note: "",
            dietary: [],
            imagePublicId: "dishes/millionaire_shortbread"
          },
          {
            name: "Coconut macaron",
            note: "",
            dietary: [],
            imagePublicId: "dishes/coconut_macaron"
          },
          {
            name: "Cornish Fairing",
            note: "",
            dietary: [],
            imagePublicId: "dishes/cornish_fairing"
          }
        ]
      }
    ]
  },
  {
    id: 7,
    title: "Bachelorette Party, Summer, 11 Guests",
    description: "",
    sections: [
      {
        course: "Start",
        items: [
          {
            name: "Sourdough focaccia - basil and cherry tomato",
            note: "",
            dietary: ["v"],
            imagePublicId: "dishes/focaccia_basil_tomato"
          },
          {
            name: "Prosciutto and melon",
            note: "",
            dietary: [],
            imagePublicId: "dishes/prosciutto_melon"
          },
          {
            name: "Snap pea salad, fresh yogurt and strawberry, hazelnut",
            note: "",
            dietary: ["gf"],
            imagePublicId: "dishes/snap_pea_salad"
          }
        ]
      },
      {
        course: "Main",
        items: [
          {
            name: "Sockeye salmon OR Hanger Steak OR chicken breast paillard",
            note: "grilled sweet corn and summer squash, fregola sarda, heirloom tomato",
            dietary: ["gf"],
            imagePublicId: "dishes/summer_grill_platter"
          }
        ]
      },
      {
        course: "Dessert",
        items: [
          {
            name: "Blueberry tart - vanilla creme",
            note: "",
            dietary: [],
            imagePublicId: "dishes/blueberry_tart"
          }
        ]
      }
    ]
  },
  {
    id: 8,
    title: "Home Event, Christmas Work Party, 50 guests - Sample 1",
    description: "",
    sections: [
      {
        course: "To start",
        items: [
          {
            name: "Salo (cured pork fat), garlic, sourdough bread, pickles",
            note: "",
            dietary: [],
            imagePublicId: "dishes/salo_platter"
          },
          {
            name: "Stuffed cabbage rolls",
            note: "",
            dietary: [],
            imagePublicId: "dishes/cabbage_rolls"
          },
          {
            name: "Beets with dill",
            note: "",
            dietary: ["v", "gf"],
            imagePublicId: "dishes/beets_dill"
          },
          {
            name: "Potatoes filled with mushroom",
            note: "",
            dietary: ["v"],
            imagePublicId: "dishes/stuffed_potatoes"
          },
          {
            name: "Fresh watermelon, pickled watermelon",
            note: "",
            dietary: ["v"],
            imagePublicId: "dishes/watermelon_salad"
          },
          {
            name: "Seasonal greens",
            note: "",
            dietary: ["v"],
            imagePublicId: "dishes/seasonal_greens"
          },
          { name: "Olive salad", note: "", dietary: ["v"], imagePublicId: "dishes/olive_salad" }
        ]
      },
      {
        course: "Main",
        items: [
          {
            name: "Kabob/shashlik - mountains of skewers",
            note: "including: roasted chicken, steak, lamb, tomatoes, mushrooms, and seasonal vegetables, garlic sauce and other sauces and marinades",
            dietary: [],
            imagePublicId: "events/kabob_skewers"
          }
        ]
      }
    ]
  },
  {
    id: 9,
    title: "Home Event, Christmas Work Party, 50 guests - Sample 2",
    description: "",
    sections: [
      {
        course: "Start",
        items: [
          {
            name: "Sourdough focaccia with olive oil and za'atar",
            note: "",
            dietary: ["v"],
            imagePublicId: "dishes/focaccia_zaatar"
          },
          { name: "Fresh ricotta", note: "", dietary: [], imagePublicId: "dishes/fresh_ricotta" },
          {
            name: "Spring/summer salad - based on availability",
            note: "",
            dietary: ["v", "gf"],
            imagePublicId: "dishes/spring_salad"
          }
        ]
      },
      {
        course: "Mid-course",
        items: [
          {
            name: "Agnolotti, filled with artichoke and shitake, with crispy sunchokes drizzled with honey",
            note: "",
            dietary: [],
            imagePublicId: "dishes/agnolotti_artichoke"
          }
        ]
      },
      {
        course: "Main",
        items: [
          {
            name: "Beef tenderloin, finished in foie gras butter and leek ash",
            note: "",
            dietary: [],
            imagePublicId: "dishes/beef_tenderloin_foie"
          },
          {
            name: "Asparagus, cured egg yolk, parmesan",
            note: "",
            dietary: ["v", "gf"],
            imagePublicId: "dishes/asparagus_egg_yolk"
          }
        ]
      },
      {
        course: "Movement - Dessert and outdoor fire",
        items: [
          {
            name: "Raspberry marshmallow, with chocolate graham shortbread",
            note: "",
            dietary: [],
            imagePublicId: "dishes/raspberry_marshmallow"
          },
          { name: "Cognac, or Scotch", note: "", dietary: [], imagePublicId: "events/cognac_fire" }
        ]
      }
    ]
  },
  {
    id: 10,
    title: "Home Event, Christmas Work Party, 50 guests - Sample 3",
    description: "",
    sections: [
      {
        course: "Stationary",
        items: [
          {
            name: "Charcuterie and cheese",
            note: "mix of local and import with crudites, olives, jams, nuts, pickles, housemade chips and crackers",
            dietary: [],
            imagePublicId: "events/charcuterie_christmas"
          },
          {
            name: "Fresh Bread - sourdough with local flour",
            note: "focaccia and baguette with olive oil and butter",
            dietary: ["v"],
            imagePublicId: "dishes/bread_basket"
          }
        ]
      },
      {
        course: "Passed and Placed",
        items: [
          {
            name: "Carrot salad with pistachio and cilantro",
            note: "",
            dietary: ["v"],
            imagePublicId: "dishes/carrot_salad_cilantro"
          },
          { name: "Frites", note: "", dietary: ["v"], imagePublicId: "dishes/frites" },
          {
            name: "James Beard's onion sandwich",
            note: "onion and mayo with parsley on white bread, crusts cut off",
            dietary: [],
            imagePublicId: "dishes/onion_sandwich"
          },
          {
            name: "Duck egg with duck bacon and asparagus",
            note: "",
            dietary: [],
            imagePublicId: "dishes/duck_egg_bacon"
          },
          {
            name: "Scallop and apple",
            note: "",
            dietary: [],
            imagePublicId: "dishes/scallop_apple"
          },
          {
            name: "Short rib nigiri",
            note: "",
            dietary: [],
            imagePublicId: "dishes/short_rib_nigiri"
          },
          {
            name: "Croque Monsieur",
            note: "",
            dietary: [],
            imagePublicId: "dishes/croque_monsieur"
          }
        ]
      },
      {
        course: "Desserts",
        items: [
          {
            name: "Cookie plate",
            note: "Chocolate Chip, Hazelnut Linzer, + 3rd undecided option",
            dietary: [],
            imagePublicId: "dishes/cookie_plate_christmas"
          },
          {
            name: '"Twinkies"',
            note: "citrus chiffon filled with foie gras buttercream",
            dietary: [],
            imagePublicId: "dishes/foie_twinkie"
          },
          {
            name: "Japanese cheesecake",
            note: "",
            dietary: [],
            imagePublicId: "dishes/japanese_cheesecake"
          }
        ]
      }
    ]
  },
  {
    id: 11,
    title: "Home Event, Christmas Work Party, 50 guests - Sample 4",
    description: "",
    sections: [
      {
        course: "Stationary",
        items: [
          {
            name: "Charcuterie and cheese platters",
            note: "including: breseola, cured pork tenderloin, marinated olives, pickled beets, tomato jam, 3-5 cheeses, candied walnuts, duck rillettes, house crackers and chips",
            dietary: [],
            imagePublicId: "events/charcuterie_platters_full"
          },
          {
            name: "Garlic focaccia",
            note: "",
            dietary: ["v"],
            imagePublicId: "dishes/garlic_focaccia"
          },
          {
            name: "Carrot salad with pistachio and coriander",
            note: "",
            dietary: ["v"],
            imagePublicId: "dishes/carrot_salad_coriander"
          }
        ]
      },
      {
        course: "Passed",
        items: [
          {
            name: "Duck egg with duck pastrami",
            note: "",
            dietary: [],
            imagePublicId: "dishes/duck_egg_pastrami"
          },
          {
            name: "Kabocha squash toast, ricotta and persimmon honey",
            note: "",
            dietary: ["v"],
            imagePublicId: "dishes/kabocha_toast"
          },
          {
            name: "Perfect Beef tenderloin bites",
            note: "",
            dietary: [],
            imagePublicId: "dishes/beef_tenderloin_bites"
          }
        ]
      },
      {
        course: "Main",
        items: [
          {
            name: "Duck confit with potato puree",
            note: "",
            dietary: ["gf"],
            imagePublicId: "dishes/duck_confit_puree"
          },
          {
            name: "Sockeye with fennel puree",
            note: "",
            dietary: ["gf"],
            imagePublicId: "dishes/sockeye_fennel_puree"
          }
        ]
      },
      {
        course: "Desserts",
        items: [
          {
            name: "Torta Caprese",
            note: "",
            dietary: [],
            imagePublicId: "dishes/torta_caprese_chocolate"
          },
          {
            name: "Chocolate-hazelnut tart",
            note: "",
            dietary: [],
            imagePublicId: "dishes/chocolate_hazelnut_tart"
          }
        ]
      }
    ]
  }
];

// src/pages/MenuPage.jsx
var import_framer_motion6 = require("framer-motion");
var import_jsx_runtime28 = require("react/jsx-runtime");
var ServiceCard2 = ({ title, description, children, isOpen = false }) => /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)(
  import_framer_motion6.motion.div,
  {
    className: `group rounded-xl bg-neutral-50 shadow-sm ring-1 ring-neutral-200 transition-all hover:shadow-md ` + (isOpen ? "p-8" : "p-4 md:p-5"),
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
    children: [
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("h4", { className: isOpen ? "text-2xl font-bold uppercase tracking-tight" : "text-xl font-bold uppercase tracking-tight", children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("p", { className: isOpen ? "font-mono text-neutral-600 min-h-[2rem] mt-2" : "font-mono text-neutral-600 mt-1", children: description }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("div", { className: isOpen ? "mt-4" : "mt-2", children })
    ]
  }
);
function MenuPage() {
  const [openMenu, setOpenMenu] = (0, import_react26.useState)(null);
  const [hoveredKey, setHoveredKey] = (0, import_react26.useState)(null);
  const [lookup, setLookup] = (0, import_react26.useState)({});
  const toggleMenu = (id) => setOpenMenu(openMenu === id ? null : id);
  const menuJsonLd = (0, import_react26.useMemo)(() => {
    const menuSections = sampleMenus.map((m) => ({
      "@type": "Menu",
      name: m.title,
      hasMenuSection: (m.sections || []).map((s) => ({
        "@type": "MenuSection",
        name: s.course,
        hasMenuItem: (s.items || []).map((it) => ({ "@type": "MenuItem", name: it.name }))
      }))
    }));
    return {
      "@context": "https://schema.org",
      "@type": "Restaurant",
      name: "Local Effort",
      url: "https://localeffortfood.com/menu",
      servesCuisine: ["American", "Local", "Farm to Table", "Seasonal"],
      areaServed: "Twin Cities, MN",
      hasMenu: menuSections
    };
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("div", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8", children: [
    /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)(import_react_helmet_async6.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("title", { children: "Past Menu Examples | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("meta", { name: "description", content: "Real menus from recent events, showcasing wide options and locally sourced food." }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("link", { rel: "canonical", href: "https://localeffortfood.com/menu" }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("script", { type: "application/ld+json", children: JSON.stringify(menuJsonLd) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("h1", { className: "heading-xl heading-balance text-center", children: "Past menu examples." }),
    /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("div", { className: "prose-lite max-w-3xl mx-auto text-center mb-8", children: /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("p", { children: 'these are all real menus from events in the past couple years, just to show how wide the options are. We love to "make it local."' }) }),
    /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: sampleMenus.map((menu) => {
      const isOpen = openMenu === menu.id;
      return /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)(ServiceCard2, { title: menu.title, description: menu.description || "", isOpen, children: [
        /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
          "button",
          {
            onClick: () => toggleMenu(menu.id),
            className: "mt-2 text-sm font-medium text-blue-600 hover:underline",
            children: isOpen ? "Hide Sections \u25B2" : "View More \u25BC"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
          import_framer_motion6.motion.div,
          {
            initial: { height: 0, opacity: 0 },
            animate: { height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 },
            transition: { duration: 0.3 },
            className: "overflow-hidden mt-4",
            children: isOpen && menu.sections.map((section, idx) => /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("div", { className: "mt-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("h5", { className: "text-lg font-semibold", children: section.course }),
              /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("ul", { className: "list-disc list-inside mt-2 space-y-1", children: section.items.map((item, i) => {
                const hasImage = typeof item.imagePublicId === "string" && item.imagePublicId.trim().length > 0;
                const itemKey = `${menu.id}-${section.course}-${i}`;
                const previewPublicId = hasImage ? item.imagePublicId : lookup[itemKey];
                const handleEnter = async () => {
                  if (hasImage) {
                    setHoveredKey(itemKey);
                    return;
                  }
                  setHoveredKey(itemKey);
                  if (lookup[itemKey]) return;
                  const slug = String(item.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
                  if (!slug) return;
                  try {
                    const res = await fetch(`/api/search-images?query=${encodeURIComponent(slug)}&per_page=1`);
                    if (!res.ok) return;
                    const data = await res.json();
                    const first = (data.images || [])[0];
                    if (first && first.public_id) {
                      setLookup((prev) => ({ ...prev, [itemKey]: first.public_id }));
                    }
                  } catch (_) {
                  }
                };
                return /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)(
                  "li",
                  {
                    onMouseEnter: handleEnter,
                    onMouseLeave: () => setHoveredKey(null),
                    className: `relative py-1 ${hasImage || lookup[itemKey] ? "cursor-pointer" : "cursor-default"}`,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("span", { className: `font-medium ${hasImage || lookup[itemKey] ? "underline decoration-dotted underline-offset-2" : ""}`, children: item.name }),
                      hasImage || lookup[itemKey] ? /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("span", { className: "ml-1 align-middle inline-block text-neutral-500", title: "Preview available", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("path", { d: "M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z", stroke: "currentColor", strokeWidth: "1.5" }),
                        /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("path", { d: "M9 11l3 3 3-3 4 5H5l4-5z", stroke: "currentColor", strokeWidth: "1.5" }),
                        /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("circle", { cx: "8", cy: "9", r: "1.5", fill: "currentColor" })
                      ] }) }) : null,
                      item.note && /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("span", { className: "text-gray-600 italic", children: [
                        " \u2014 ",
                        item.note
                      ] }),
                      item.dietary?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("span", { className: "ml-2 text-sm text-green-600", children: [
                        "[",
                        item.dietary.join(", "),
                        "]"
                      ] }),
                      (hasImage || previewPublicId) && /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(import_framer_motion6.AnimatePresence, { children: hoveredKey === itemKey && /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
                        import_framer_motion6.motion.div,
                        {
                          className: "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-white rounded-lg shadow-xl z-20 w-48 h-48 pointer-events-none",
                          initial: { opacity: 0, y: 10, scale: 0.9 },
                          animate: { opacity: 1, y: 0, scale: 1 },
                          exit: { opacity: 0, y: 10, scale: 0.9 },
                          transition: { duration: 0.2, ease: "easeInOut" },
                          children: /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(
                            cloudinaryImage_default,
                            {
                              publicId: previewPublicId,
                              alt: item.name,
                              width: 200,
                              height: 200,
                              className: "rounded-md w-full h-full object-cover",
                              placeholderMode: "none"
                            }
                          )
                        }
                      ) })
                    ]
                  },
                  i
                );
              }) })
            ] }, idx))
          }
        )
      ] }, menu.id);
    }) })
  ] });
}

// src/pages/HappyMondayPage.jsx
var import_react32 = __toESM(require("react"));
var import_react_helmet_async7 = __toESM(require_lib());
var import_framer_motion11 = require("framer-motion");

// src/components/menu/FoodItemCard.jsx
var import_react27 = __toESM(require("react"));
var import_framer_motion7 = require("framer-motion");
var import_jsx_runtime29 = require("react/jsx-runtime");
var FoodItemCard = ({ item, onClick }) => {
  return /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)(
    import_framer_motion7.motion.div,
    {
      variants: fadeInUp,
      onClick,
      className: "border border-neutral-200 rounded-lg p-6 cursor-pointer hover:shadow-lg hover:border-neutral-400 transition-all duration-300 bg-white",
      whileHover: { scale: 1.03 },
      whileTap: { scale: 0.98 },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("h4", { className: "text-xl font-bold text-neutral-800", children: item.name }),
        /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("p", { className: "text-neutral-600 mt-2 line-clamp-2", children: item.description })
      ]
    }
  );
};
var FoodItemCard_default = FoodItemCard;

// src/components/ErrorBoundary.jsx
var import_react28 = __toESM(require("react"));
var import_jsx_runtime30 = require("react/jsx-runtime");
var ErrorBoundary = class extends import_react28.default.Component {
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
      return /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)("div", { style: { padding: 24, fontFamily: "system-ui, Arial", color: "#111" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("h1", { children: "Application error" }),
        /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("p", { style: { whiteSpace: "pre-wrap" }, children: String(error && (error.message || error)) }),
        info && info.componentStack && /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)("details", { style: { marginTop: 12, whiteSpace: "pre-wrap" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("summary", { children: "Component stack" }),
          /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("div", { children: info.componentStack })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("div", { style: { marginTop: 12 }, children: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("button", { onClick: () => window.location.reload(), children: "Reload" }) })
      ] });
    }
    return this.props.children;
  }
};
var ErrorBoundary_default = ErrorBoundary;

// src/pages/HappyMondayPage.jsx
var import_jsx_runtime34 = require("react/jsx-runtime");
var BlockContent = (0, import_react32.lazy)(() => import("@sanity/block-content-to-react"));
var FoodItemModal2 = (0, import_react32.lazy)(() => Promise.resolve().then(() => (init_FoodItemModal(), FoodItemModal_exports)));
var FeedbackForm2 = (0, import_react32.lazy)(() => Promise.resolve().then(() => (init_FeedbackForm(), FeedbackForm_exports)));
var LoadingSpinner2 = (0, import_react32.lazy)(() => Promise.resolve().then(() => (init_LoadingSpinner(), LoadingSpinner_exports)).then((mod) => ({ default: mod.LoadingSpinner })));
var HappyMondayPage = () => {
  const [menuItems, setMenuItems] = (0, import_react32.useState)([]);
  const [pageContent, setPageContent] = (0, import_react32.useState)(null);
  const [selectedItem, setSelectedItem] = (0, import_react32.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react32.useState)(true);
  (0, import_react32.useEffect)(() => {
    const query3 = `{
      "menuItems": *[_type == "menuItems"],
      "pageContent": *[_type == "happyMondayPage"][0]
    }`;
    sanityClient_default.fetch(query3).then((data) => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)(import_jsx_runtime34.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)(import_react_helmet_async7.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("title", { children: "Happy Monday | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
        "meta",
        {
          name: "description",
          content: "Explore our special Happy Monday menu, made with the finest local ingredients."
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "space-y-24 mb-24", children: [
      /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("section", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8", children: [
        pageContent && /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("div", { className: "text-center mb-12", children: [
          /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(SectionHeader, { overline: "Weekly Special", title: pageContent.title }),
          /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "prose lg:prose-lg mx-auto max-w-3xl", children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(ErrorBoundary_default, { children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(import_react32.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "text-center", children: "Loading content\u2026" }), children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(BlockContent, { blocks: pageContent.body, client: sanityClient_default }) }) }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(import_react32.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "flex justify-center items-center h-64", children: "Loading\u2026" }), children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "flex justify-center items-center h-64", children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(LoadingSpinner2, {}) }) : /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(
          import_framer_motion11.motion.div,
          {
            className: "grid md:grid-cols-2 lg:grid-cols-3 gap-6",
            initial: "initial",
            animate: "animate",
            variants: { animate: { transition: { staggerChildren: 0.1 } } },
            children: menuItems.map((item) => /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(FoodItemCard_default, { item, onClick: () => handleCardClick(item) }, item._id))
          }
        ) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime34.jsxs)("section", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8", children: [
        /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(SectionHeader, { overline: "Help Us Improve", title: "Feedback" }),
        /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("p", { className: "text-body mb-8 max-w-2xl", children: "Have a suggestion, a request, or feedback on our quality? We'd love to hear it. Your input helps us grow and improve." }),
        /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(ErrorBoundary_default, { children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(import_react32.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "text-center p-8", children: "Loading form\u2026" }), children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(FeedbackForm2, {}) }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(Separator, {})
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(import_framer_motion11.AnimatePresence, { children: selectedItem && /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(ErrorBoundary_default, { children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(import_react32.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)("div", { className: "fixed inset-0 flex items-center justify-center", children: "Loading\u2026" }), children: /* @__PURE__ */ (0, import_jsx_runtime34.jsx)(FoodItemModal2, { item: selectedItem, onClose: handleCloseModal }) }) }) })
  ] });
};
var HappyMondayPage_default = HappyMondayPage;

// src/pages/GalleryPage.jsx
var import_react33 = __toESM(require("react"));
var import_react_helmet_async8 = __toESM(require_lib());
var import_framer_motion12 = require("framer-motion");
var import_jsx_runtime35 = require("react/jsx-runtime");
var GalleryPage = () => {
  const [images, setImages] = (0, import_react33.useState)([]);
  const [nextCursor, setNextCursor] = (0, import_react33.useState)(null);
  const [query3, setQuery] = (0, import_react33.useState)("");
  const [loading, setLoading] = (0, import_react33.useState)(true);
  const [loadingMore, setLoadingMore] = (0, import_react33.useState)(false);
  const [error, setError] = (0, import_react33.useState)(null);
  const [selected, setSelected] = (0, import_react33.useState)(null);
  const staticFallback = [
    {
      src: "/gallery/5Z0A5729-Edit.jpg",
      alt: "Private chef plated dish \u2014 Local Effort Personal Chef \u2014 Minneapolis",
      caption: "Private chef plated dish \u2014 Local Effort, Minneapolis in-home chef."
    },
    {
      src: "/gallery/5Z0A5665-Edit.jpg",
      alt: "Seasonal menu \u2014 Local Effort Personal Chef \u2014 Twin Cities",
      caption: "Seasonal menu \u2014 Local Effort, Twin Cities personal chef."
    },
    {
      src: "/gallery/IMG_3145.jpg",
      alt: "Private dinner service \u2014 Local Effort Personal Chef \u2014 St. Paul",
      caption: "Private dinner service \u2014 Local Effort, St. Paul personal chef."
    }
  ];
  const fallbackLoadedRef = (0, import_react33.useRef)(false);
  const prefetched = (0, import_react33.useRef)(/* @__PURE__ */ new Set());
  const tryLoadFallback = (0, import_react33.useCallback)(async () => {
    if (fallbackLoadedRef.current) return null;
    return new Promise((resolve) => {
      const already = typeof window !== "undefined" && window.photoData;
      const finish = () => {
        const list = window && window.photoData || [];
        if (Array.isArray(list) && list.length) {
          const mapped = list.map((p, i) => ({
            asset_id: p.src || String(i),
            public_id: p.src || String(i),
            context: { alt: p.title || "Gallery image" },
            thumbnail_url: p.src,
            large_url: p.src
          }));
          fallbackLoadedRef.current = true;
          resolve(mapped);
        } else {
          resolve(null);
        }
      };
      if (already) return finish();
      const s = document.createElement("script");
      s.src = "/gallery/photos.js";
      s.async = true;
      s.onload = finish;
      s.onerror = () => resolve(null);
      document.body.appendChild(s);
    });
  }, []);
  const closeBtnRef = (0, import_react33.useRef)(null);
  const PAGE_SIZE = 36;
  const shuffle2 = (0, import_react33.useCallback)((arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);
  const fetchImages = (0, import_react33.useCallback)(async (opts = {}) => {
    const { append = false, cursor = null, signal, mode = "initial" } = opts;
    if (mode === "loadMore") {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    const q = query3 ? `query=${encodeURIComponent(query3)}&` : "";
    const c = cursor ? `next_cursor=${encodeURIComponent(cursor)}&` : "";
    const apiUrl = `/api/search-images?${q}${c}per_page=${PAGE_SIZE}`;
    try {
      const response = await fetch(apiUrl, { signal });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await response.text().catch(() => "");
        const msg = text && text.includes("<!DOCTYPE") ? "API endpoint not found - got HTML instead of JSON" : text || "Unexpected non-JSON response";
        throw new Error(msg);
      }
      const data = await response.json();
      if (!response.ok) {
        const details = data && (data.error || data.details || JSON.stringify(data));
        throw new Error(`Search failed (${response.status}): ${details}`);
      }
      const imgs = Array.isArray(data.images) ? data.images : [];
      const batch = shuffle2(imgs);
      setImages((prev) => append ? [...prev, ...batch] : batch);
      setNextCursor(data.next_cursor || null);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Error fetching images:", err);
      if (mode === "loadMore") {
        setError(err.message || String(err));
      } else {
        try {
          const fallback = await tryLoadFallback();
          if (fallback && fallback.length) {
            setImages(shuffle2(fallback));
            setError("Showing fallback images while the gallery API is unavailable.");
          } else {
            setError(err.message || String(err));
          }
        } catch (_) {
          setError(err.message || String(err));
        }
      }
    } finally {
      if (mode === "loadMore") {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [query3, shuffle2, tryLoadFallback]);
  const ensurePreconnect = (0, import_react33.useCallback)(() => {
    if (typeof document === "undefined") return;
    const id = "cld-preconnect";
    if (document.getElementById(id)) return;
    const link1 = document.createElement("link");
    link1.id = id;
    link1.rel = "preconnect";
    link1.href = "https://res.cloudinary.com";
    link1.crossOrigin = "";
    document.head.appendChild(link1);
    const link2 = document.createElement("link");
    link2.rel = "dns-prefetch";
    link2.href = "https://res.cloudinary.com";
    document.head.appendChild(link2);
  }, []);
  const prefetchImage = (0, import_react33.useCallback)((url) => {
    if (!url || typeof document === "undefined") return;
    if (prefetched.current.has(url)) return;
    try {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = url;
      document.head.appendChild(link);
    } catch (_) {
    }
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    prefetched.current.add(url);
  }, []);
  (0, import_react33.useEffect)(() => {
    const controller = new AbortController();
    const handler = setTimeout(() => {
      setError(null);
      setNextCursor(null);
      fetchImages({ append: false, cursor: null, signal: controller.signal, mode: "initial" });
    }, 300);
    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [query3, fetchImages]);
  const openLightbox = (0, import_react33.useCallback)(
    (img, idx) => {
      setSelected({ img, idx });
      if (img && img.large_url) {
        ensurePreconnect();
        prefetchImage(img.large_url);
      }
      const nextIdx = (idx + 1) % images.length;
      const next = images[nextIdx];
      if (next && next.large_url) {
        prefetchImage(next.large_url);
      }
    },
    [setSelected, images, prefetchImage, ensurePreconnect]
  );
  const closeLightbox = (0, import_react33.useCallback)(() => setSelected(null), [setSelected]);
  (0, import_react33.useEffect)(() => {
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
  (0, import_react33.useEffect)(() => {
    if (selected && closeBtnRef.current) closeBtnRef.current.focus();
  }, [selected]);
  return /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)(import_jsx_runtime35.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)(import_react_helmet_async8.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("title", { children: "pictures of food. | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("meta", { name: "description", content: "A visual gallery of dinners, events, meal prep, and plates from Local Effort." }),
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("link", { rel: "preconnect", href: "https://res.cloudinary.com", crossOrigin: "" }),
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("link", { rel: "dns-prefetch", href: "https://res.cloudinary.com" }),
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("script", { type: "application/ld+json", children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Restaurant",
        name: "Local Effort",
        url: "https://localeffortfood.com/gallery",
        image: images.slice(0, 8).map((i) => i.large_url || i.thumbnail_url).filter(Boolean),
        servesCuisine: ["American", "Local", "Seasonal"],
        sameAs: ["https://www.instagram.com/localeffortfood", "https://www.facebook.com/localeffortfood", "https://www.tiktok.com/@localeffort"]
      }) }),
      images.slice(0, 12).map((img, idx) => /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("script", { type: "application/ld+json", children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ImageObject",
        contentUrl: img.large_url || img.thumbnail_url,
        thumbnail: img.thumbnail_url || void 0,
        name: img.context?.alt || "Local Effort gallery image",
        description: img.context?.alt || void 0,
        creator: { "@type": "Organization", name: "Local Effort Food Co." }
      }) }, `imgld-${idx}`))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "container mx-auto px-4 py-8", children: [
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("h1", { className: "heading-xl heading-balance text-center", children: "Pictures of food." }),
      /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
        "input",
        {
          type: "text",
          value: query3,
          onChange: (e) => setQuery(e.target.value),
          placeholder: "Search by tag (e.g., pizza, events, mealplan, plates, dinner, eggs)...",
          className: "w-full max-w-md mx-auto block p-3 border rounded-md mb-8"
        }
      ),
      loading ? /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(import_jsx_runtime35.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { className: "columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]", children: staticFallback.map((img, idx) => /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("figure", { className: "mb-4 w-full break-inside-avoid border p-2 bg-white rounded-lg overflow-hidden", children: [
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
          "img",
          {
            src: img.src,
            alt: img.alt,
            className: "rounded-lg w-full h-auto",
            width: 1200,
            height: 800,
            loading: "lazy",
            decoding: "async"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("figcaption", { className: "text-xs text-neutral-600 mt-2", children: img.caption })
      ] }, `fallback-${idx}`)) }) }) : error ? /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "text-red-600 bg-red-50 p-4 rounded", children: [
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("h3", { className: "font-bold", children: "Error Details:" }),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("p", { children: error }),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("p", { className: "mt-2 text-sm", children: "This usually means:" }),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("ul", { className: "list-disc ml-6 text-sm", children: [
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("li", { children: "The /api/search-images.js file wasn't created properly" }),
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("li", { children: "Environment variables aren't set in Vercel" }),
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("li", { children: "The serverless function has an error" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("p", { className: "mt-2 text-sm", children: "Check the browser Network tab and Vercel function logs." })
      ] }) : images.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "text-center p-8", children: [
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("p", { children: "No images found." }),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("p", { className: "text-sm text-gray-600 mt-2", children: "Try removing search terms or check that you have images in your Cloudinary account." })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)(import_jsx_runtime35.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { className: "columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]", children: images.map((img, idx) => /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("figure", { className: "mb-4 w-full break-inside-avoid border p-2 bg-white rounded-lg overflow-hidden", children: [
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
            "button",
            {
              type: "button",
              onClick: () => openLightbox(img, idx),
              onMouseEnter: () => img?.large_url && prefetchImage(img.large_url),
              "aria-label": img.context?.alt || `Gallery image ${idx + 1}`,
              className: "block",
              children: img.thumbnail_url ? /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
                "img",
                {
                  src: img.thumbnail_url,
                  alt: img.context?.alt || "Private chef plated dish \u2014 Local Effort Personal Chef \u2014 Minneapolis / St. Paul",
                  className: "rounded-lg w-full h-auto",
                  width: img.width || void 0,
                  height: img.height || void 0,
                  style: img.width && img.height ? { aspectRatio: `${img.width} / ${img.height}` } : void 0,
                  loading: "lazy",
                  decoding: "async"
                }
              ) : /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
                cloudinaryImage_default,
                {
                  publicId: img.public_id,
                  alt: img.context?.alt || "Private chef plated dish \u2014 Local Effort Personal Chef \u2014 Minneapolis / St. Paul",
                  width: 800,
                  className: "rounded-lg w-full h-auto",
                  containerStyle: img.width && img.height ? { aspectRatio: `${img.width} / ${img.height}` } : void 0
                }
              )
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("figcaption", { className: "text-xs text-neutral-600 mt-2", children: img.context?.alt || "Private chef plated seared trout \u2014 Local Effort Personal Chef \u2014 Minneapolis" })
        ] }, img.asset_id)) }),
        /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("noscript", { children: /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("figure", { className: "gallery-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("img", { src: "/gallery/5Z0A5729-Edit.jpg", width: "1200", height: "800", alt: "Private chef plated dish \u2014 Local Effort Personal Chef \u2014 Minneapolis" }),
            /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("figcaption", { children: "Private chef plated dish \u2014 Local Effort, Minneapolis in-home chef." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("figure", { className: "gallery-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("img", { src: "/gallery/5Z0A5665-Edit.jpg", width: "1200", height: "800", alt: "Seasonal menu \u2014 Local Effort Personal Chef \u2014 Twin Cities" }),
            /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("figcaption", { children: "Seasonal menu \u2014 Local Effort, Twin Cities personal chef." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("figure", { className: "gallery-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("img", { src: "/gallery/IMG_3145.jpg", width: "1200", height: "800", alt: "Private dinner service \u2014 Local Effort Personal Chef \u2014 St. Paul" }),
            /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("figcaption", { children: "Private dinner service \u2014 Local Effort, St. Paul personal chef." })
          ] })
        ] }) }),
        nextCursor && /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { className: "mt-6 text-center", children: /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
          "button",
          {
            type: "button",
            onClick: () => {
              if (loadingMore) return;
              setError(null);
              fetchImages({ append: true, cursor: nextCursor, mode: "loadMore" });
            },
            className: "px-4 py-2 rounded bg-black text-white hover:bg-neutral-800 disabled:opacity-50",
            disabled: loading || loadingMore,
            children: loadingMore ? "Loading\u2026" : "Load more"
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(import_framer_motion12.AnimatePresence, { children: selected && /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
      import_framer_motion12.motion.div,
      {
        className: "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        onClick: closeLightbox,
        children: /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
          import_framer_motion12.motion.div,
          {
            className: "max-w-5xl w-full max-h-full",
            initial: { y: 20, scale: 0.98 },
            animate: { y: 0, scale: 1 },
            exit: { y: 20, scale: 0.98 },
            onClick: (e) => e.stopPropagation(),
            children: /* @__PURE__ */ (0, import_jsx_runtime35.jsxs)("div", { className: "relative overflow-hidden", children: [
              /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
                "button",
                {
                  ref: closeBtnRef,
                  className: "absolute right-2 top-2 z-10 bg-black/60 text-white rounded-full p-2",
                  onClick: closeLightbox,
                  "aria-label": "Close image",
                  children: "\u2715"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime35.jsx)("div", { className: "flex items-center justify-center p-2", children: selected.img.large_url ? /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
                "img",
                {
                  src: selected.img.large_url,
                  alt: selected.img.context?.alt || "Large gallery image",
                  decoding: "async",
                  fetchPriority: "high",
                  className: "w-full h-auto max-h-[90vh] object-contain"
                }
              ) : /* @__PURE__ */ (0, import_jsx_runtime35.jsx)(
                cloudinaryImage_default,
                {
                  publicId: selected.img.public_id,
                  alt: selected.img.context?.alt || "Large gallery image",
                  width: 1400,
                  height: 1e3,
                  disableLazy: true,
                  eager: true,
                  className: "w-full h-auto max-h-[90vh] object-contain"
                }
              ) })
            ] })
          }
        )
      }
    ) })
  ] });
};
var GalleryPage_default = GalleryPage;

// src/pages/EventsPage.jsx
var import_react34 = __toESM(require("react"));
var import_react_helmet_async9 = __toESM(require_lib());
var import_jsx_runtime36 = require("react/jsx-runtime");
var EventsPage = () => /* @__PURE__ */ (0, import_jsx_runtime36.jsxs)(import_jsx_runtime36.Fragment, { children: [
  /* @__PURE__ */ (0, import_jsx_runtime36.jsxs)(import_react_helmet_async9.Helmet, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("title", { children: "Dinners & Events | Local Effort" }),
    /* @__PURE__ */ (0, import_jsx_runtime36.jsx)(
      "meta",
      {
        name: "description",
        content: "Let Local Effort cater your next event. We specialize in in-home dining for parties of 2 to 50."
      }
    )
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime36.jsxs)("div", { className: "space-y-16", children: [
    /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("h1", { className: "heading-display heading-balance", children: "Dinners & events" }),
    /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("p", { className: "font-mono text-lg max-w-3xl", children: "We bring our passion for food and hospitality to your home or venue. We specialize in cooking for parties from 2 to 50 people." })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime36.jsx)("div", { className: "container mx-auto px-4 py-8", children: /* @__PURE__ */ (0, import_jsx_runtime36.jsx)(PhotoGrid, { tags: ["dinner", "event"], title: "Dinners & events photos", perPage: 24 }) })
] });
var EventsPage_default = EventsPage;

// src/pages/MealPrepPage.jsx
var import_react39 = __toESM(require("react"));
var import_react_helmet_async10 = __toESM(require_lib());

// src/components/common/VennDiagram.jsx
var import_react35 = __toESM(require("react"));
var import_jsx_runtime37 = require("react/jsx-runtime");
var VennDiagram = () => {
  const svgStyle = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: "10px"
  };
  const circleStyle = { mixBlendMode: "multiply" };
  const labelStyle = { fontSize: "10px", fontWeight: "bold", fill: "#000", textAnchor: "middle" };
  const centerLabelStyle = { ...labelStyle, fontSize: "8px", fill: "#FFFFFF" };
  return /* @__PURE__ */ (0, import_jsx_runtime37.jsxs)("svg", { viewBox: "0 0 300 200", xmlns: "http://www.w3.org/2000/svg", style: svgStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("circle", { cx: "115", cy: "120", r: "50", fill: "#fde047", style: circleStyle }),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("circle", { cx: "185", cy: "120", r: "50", fill: "#67e8f9", style: circleStyle }),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("circle", { cx: "150", cy: "70", r: "50", fill: "#fca5a5", style: circleStyle }),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("text", { x: "100", y: "130", style: labelStyle, children: "Cost Efficiency" }),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("text", { x: "200", y: "130", style: labelStyle, children: "Local Ingredients" }),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("text", { x: "150", y: "55", style: labelStyle, children: "Perfect Nutrition" }),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("text", { x: "150", y: "105", style: centerLabelStyle, children: "Foundation" }),
    /* @__PURE__ */ (0, import_jsx_runtime37.jsx)("text", { x: "150", y: "115", style: centerLabelStyle, children: "Meal Plan" })
  ] });
};

// src/components/mealprep/MenuList.jsx
var import_react36 = __toESM(require("react"));
var import_jsx_runtime38 = require("react/jsx-runtime");

// src/components/mealprep/MenuDetail.jsx
var import_react37 = __toESM(require("react"));
var import_jsx_runtime39 = require("react/jsx-runtime");

// src/components/mealprep/Comments.jsx
var import_react38 = __toESM(require("react"));
var import_database3 = require("firebase/database");
init_firebaseConfig();
var import_jsx_runtime40 = require("react/jsx-runtime");

// src/data/mealPrepClients.js
var mealPrepClients = [
  {
    key: "davidAllison",
    name: "David & Allison",
    clientName: "David and Allison",
    emails: [
      // 'david@example.com', 'allison@example.com'
    ]
  },
  {
    key: "sanjay",
    name: "Sanjay",
    clientName: "Sanjay",
    emails: [
      // 'sanjay@example.com'
    ]
  },
  {
    key: "shelley",
    name: "Shelley",
    clientName: "Shelley",
    emails: [
      // 'shelley@example.com'
    ]
  }
];
function getAssignedClientNameForUser(user) {
  if (!user) return null;
  const email = (user.email || "").toLowerCase();
  const name2 = (user.displayName || "").toLowerCase();
  for (const c of mealPrepClients) {
    for (const e of c.emails) {
      if (email && e && email === String(e).toLowerCase()) return c.clientName;
    }
  }
  if (name2.includes("sanjay")) return "Sanjay";
  if (name2.includes("shelley")) return "Shelley";
  if (name2.includes("david") || name2.includes("allison")) return "David and Allison";
  return null;
}

// src/utils/userProfiles.js
init_firebaseConfig();
var import_firestore2 = require("firebase/firestore");
async function saveUserProfile(uid, data) {
  if (!db || !uid) return null;
  const ref3 = (0, import_firestore2.doc)(db, "userProfiles", uid);
  const payload = {
    uid,
    ...data,
    updatedAt: import_firestore2.serverTimestamp ? (0, import_firestore2.serverTimestamp)() : /* @__PURE__ */ new Date()
  };
  await (0, import_firestore2.setDoc)(ref3, payload, { merge: true });
  return payload;
}
async function getUserProfile(uid) {
  if (!db || !uid) return null;
  const ref3 = (0, import_firestore2.doc)(db, "userProfiles", uid);
  const snap = await (0, import_firestore2.getDoc)(ref3);
  return snap.exists() ? snap.data() : null;
}

// src/pages/MealPrepPage.jsx
var import_react_router_dom5 = require("react-router-dom");
var import_jsx_runtime41 = require("react/jsx-runtime");
var MealPrepPage = () => {
  const user = null;
  const [menus, setMenus] = (0, import_react39.useState)([]);
  const [loading, setLoading] = (0, import_react39.useState)(false);
  const [error, setError] = (0, import_react39.useState)(null);
  const [selected, setSelected] = (0, import_react39.useState)(null);
  const [filterName] = (0, import_react39.useState)("");
  const [assignedClient, setAssignedClient] = (0, import_react39.useState)(null);
  const [openSection, setOpenSection] = (0, import_react39.useState)(null);
  (0, import_react39.useEffect)(() => {
    let mounted = true;
    (async () => {
      if (!user) {
        setAssignedClient(null);
        return;
      }
      let clientName = null;
      try {
        const profile = await getUserProfile(user.uid);
        clientName = profile?.mealPrepClientName || null;
      } catch (_e) {
      }
      if (!clientName) {
        clientName = getAssignedClientNameForUser(user);
      }
      if (clientName) {
        try {
          await saveUserProfile(user.uid, {
            mealPrepClientName: clientName,
            email: user.email || null,
            displayName: user.displayName || null
          });
        } catch (_e) {
        }
      }
      if (mounted) setAssignedClient(clientName);
    })();
    return () => {
      mounted = false;
    };
  }, [user]);
  (0, import_react39.useEffect)(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        if (!sanityClient_default || !sanityClient_default.fetch) {
          throw new Error("Content service unavailable");
        }
        const data = await sanityClient_default.fetch(
          `*[_type == "mealPrepMenu" && published == true] | order(date desc)[0...50]{
            _id, date, clientName, menu, notes
          }`
        );
        if (mounted) setMenus(data || []);
      } catch (e) {
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);
  const filtered = (0, import_react39.useMemo)(() => {
    const base = assignedClient ? menus.filter((m) => (m.clientName || "").toLowerCase() === assignedClient.toLowerCase()) : menus;
    const q = filterName.trim().toLowerCase();
    if (!q) return base;
    return base.filter((m) => (m.clientName || "").toLowerCase().includes(q));
  }, [menus, filterName, assignedClient]);
  const mealPrepFaq = [
    {
      question: "What does the Minneapolis meal prep service include?",
      answer: "Our Minneapolis personal chef team plans menus, shops for local ingredients, cooks in-home or in our commissary kitchen, and delivers labeled meals with reheating notes."
    },
    {
      question: "Do you offer flexible meal plan Minneapolis subscriptions?",
      answer: "Yes. Choose a Foundation Plan with 21 meals per week or build a custom meal plan Minneapolis schedule that covers breakfasts, lunches, dinners, snacks, or postpartum support."
    },
    {
      question: "How far in advance should I book meal prep?",
      answer: "Most households schedule recurring deliveries two to four weeks in advance. We keep a few last-minute spots open for new Minneapolis meal prep clients when possible."
    }
  ];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: mealPrepFaq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
  return /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)(import_jsx_runtime41.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)(import_react_helmet_async10.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("title", { children: "Meal Prep Minneapolis & Custom Meal Plans | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(
        "meta",
        {
          name: "description",
          content: "Meal prep Minneapolis services from Local Effort Food Co. include chef-prepared meals, labeled reheating notes, and flexible meal plan Minneapolis subscriptions for families and busy professionals."
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(
        "meta",
        {
          name: "keywords",
          content: "meal prep Minneapolis, meal plan Minneapolis, Minneapolis personal chef, weekly meal prep, custom meal plan"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("link", { rel: "canonical", href: "https://localeffortfood.com/meal-prep" }),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("script", { type: "application/ld+json", children: JSON.stringify(faqJsonLd) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "space-y-16 mx-auto max-w-6xl px-4 md:px-6 lg:px-8", children: [
      /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("header", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("h1", { className: "heading-display heading-balance", children: "Weekly meal prep" }),
        /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("div", { className: "flex items-center gap-3" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("section", { className: "space-y-4 max-w-3xl", children: [
        /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("p", { className: "text-body", children: "Basic, good nutrition from local Midwest sources. We offer a Foundation Plan and are happy to create custom plans for any diet." }),
        /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("p", { className: "text-body", children: "Looking for meal prep Minneapolis support between events? Our chefs cook, portion, and package complete menus so your family has reheatable dinners, lunches, and snacks. Prefer variety? Build a meal plan Minneapolis subscription with rotating cuisines, macros, and ingredient sourcing that fits your schedule." }),
        /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex gap-2 items-center text-sm text-gray-700", children: [
          /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("a", { href: "#menus", className: "underline", children: "View current menus" }),
          assignedClient ? /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("span", { children: [
            "for ",
            /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("strong", { children: assignedClient })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("span", { className: "italic", children: "no client assigned yet" })
        ] })
      ] }),
      false,
      /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("section", { className: "space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("h3", { className: "text-2xl font-bold", children: "Meal Prep Minneapolis Gallery" }),
        /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(PhotoGrid, { tags: "mealplan", perPage: 24, masonry: true })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("section", { className: "space-y-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("h3", { className: "text-2xl font-bold", children: "Meal Plan Options" }),
        /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "grid md:grid-cols-2 gap-6", children: [
          /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "border border-gray-900 rounded-md overflow-hidden", children: [
            /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)(
              "button",
              {
                type: "button",
                className: "w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100",
                onClick: () => setOpenSection(openSection === "foundation" ? null : "foundation"),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("span", { className: "text-xl font-bold", children: "Foundation Meal Plan" }),
                  /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("span", { className: "text-sm text-gray-600", children: openSection === "foundation" ? "Hide \u25B2" : "View More \u25BC" })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(
              "div",
              {
                className: `transition-[max-height,opacity] duration-300 ease-in-out ${openSection === "foundation" ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`,
                children: /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "p-6", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(VennDiagram, {}),
                  /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("p", { className: "font-mono mt-6 max-w-2xl", children: "Inspired by the 'Protocol' by Bryan Johnson, this plan provides up to 21 meals/week at ~1800 calories/day." })
                ] })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "border border-gray-900 rounded-md overflow-hidden", children: [
            /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)(
              "button",
              {
                type: "button",
                className: "w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100",
                onClick: () => setOpenSection(openSection === "custom" ? null : "custom"),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("span", { className: "text-xl font-bold", children: "Custom Plan" }),
                  /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("span", { className: "text-sm text-gray-600", children: openSection === "custom" ? "Hide \u25B2" : "View More \u25BC" })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(
              "div",
              {
                className: `transition-[max-height,opacity] duration-300 ease-in-out ${openSection === "custom" ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`,
                children: /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("div", { className: "p-6", children: /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("p", { className: "text-body", children: "We tailor plans to your needs (gluten-free, vegetarian, high-protein, etc.). Tell us your goals and preferences and we\u2019ll propose a weekly plan and schedule." }) })
              }
            )
          ] })
        ] })
      ] }),
      false,
      /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("section", { className: "mt-10", children: /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(WeeklyJournalEmbeds, {}) })
    ] })
  ] });
};
var MealPrepPage_default = MealPrepPage;
function WeeklyJournalEmbeds() {
  const [posts, setPosts] = (0, import_react39.useState)([]);
  (0, import_react39.useEffect)(() => {
    let mounted = true;
    (async () => {
      try {
        const q = `*[_type == "blogPost"] | order(publishedAt desc)[0...3]{ title, "slug": slug.current, excerpt, publishedAt }`;
        const items2 = await sanityClient_default.fetch(q);
        if (mounted) setPosts(items2 || []);
      } catch (_) {
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  if (!posts.length) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "border rounded-lg p-5 bg-white shadow-sm", children: [
    /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("h3", { className: "text-xl font-bold", children: "Weekly Meal Prep Journal" }),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_react_router_dom5.Link, { to: "/weekly", className: "text-sm underline", children: "View more" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("div", { className: "mt-4 grid gap-4 sm:grid-cols-2", children: posts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime41.jsxs)("article", { className: "rounded-md ring-1 ring-neutral-200 p-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("h4", { className: "text-lg font-semibold", children: /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_react_router_dom5.Link, { to: `/weekly/${p.slug}`, className: "hover:underline", children: p.title }) }),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("div", { className: "text-sm text-gray-500 mt-1", children: p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "" }),
      p.excerpt && /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("p", { className: "text-gray-700 mt-2", children: p.excerpt }),
      /* @__PURE__ */ (0, import_jsx_runtime41.jsx)("div", { className: "mt-3", children: /* @__PURE__ */ (0, import_jsx_runtime41.jsx)(import_react_router_dom5.Link, { to: `/weekly/${p.slug}`, className: "btn btn-ghost px-3 py-1 text-sm", children: "Read" }) })
    ] }, p.slug)) })
  ] });
}

// src/pages/PartnerPortalPage.jsx
var import_react40 = __toESM(require("react"));
var import_react_helmet_async11 = __toESM(require_lib());
var import_react_router_dom6 = require("react-router-dom");

// src/config/partnerTools.js
var PARTNER_TOOLS = [
  {
    key: "happymonday",
    name: "Happy Monday",
    description: "Planning & operations app (internal partner app).",
    type: "internal",
    route: "/partners/happymonday",
    icon: "ClipboardList",
    public: true
  },
  {
    key: "inbox",
    name: "Inbox",
    description: "Mailbox (Brevo) for inbound messages.",
    type: "internal",
    route: "https://app.brevo.com/",
    icon: "Inbox"
  },
  {
    key: "studio",
    name: "Sanity Studio",
    description: "Content management studio (opens in new tab).",
    type: "external",
    href: "https://www.sanity.io/@oz5yeSAiw/studio/q4scncd6uaeyzxo567jir45u/default",
    icon: "FileText"
  },
  {
    key: "zafa",
    name: "ZAFA Events",
    description: "Events management utilities for ZAFA.",
    type: "internal",
    route: "/partners/zafa-events",
    icon: "Calendar",
    public: true
    // Source pending: add local-effort-zafa-events/src and embed its App here.
  },
  {
    key: "gallant",
    name: "Gallant Hawking",
    description: "Landing builder / micro-site utilities.",
    type: "internal",
    route: "/partners/gallant-hawking",
    icon: "LayoutDashboard",
    public: true
    // Embedded directly via component import
  },
  {
    key: "placemaker",
    name: "Placemaker Workspace",
    description: "Masonry board with costing tile + shared notepad.",
    type: "internal",
    route: "/partners/placemaker",
    icon: "PenSquare",
    public: true
  },
  {
    key: "aacrm",
    name: "AACRM Workspace",
    description: "Embedded AACRM Next.js partner tool.",
    type: "internal",
    route: "/partners/aacrm",
    icon: "Briefcase",
    public: true
  },
  {
    key: "tinydiner",
    name: "Tiny Diner Weddings",
    description: "Booking & intake portal for Tiny Diner weddings.",
    type: "internal",
    route: "/partners/tiny-diner",
    icon: "CalendarHeart"
  }
];

// src/pages/PartnerPortalPage.jsx
var Icons = __toESM(require("lucide-react"));
var import_jsx_runtime42 = require("react/jsx-runtime");
var PartnerPortalPage = () => {
  return /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)(import_jsx_runtime42.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)(import_react_helmet_async11.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("title", { children: "Partner Portal | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("meta", { name: "description", content: "Tools and resources for Local Effort partners." })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("h1", { className: "heading-display heading-balance", children: "Partner portal" }),
      /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("p", { className: "text-body max-w-2xl", children: "Public tools and links for partners. No sign-in required." }),
      /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(ToolGrid, {})
    ] })
  ] });
};
var PartnerPortalPage_default = PartnerPortalPage;
function ToolGrid() {
  const visible = PARTNER_TOOLS;
  return /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: visible.map((t) => {
    const Icon = Icons[t.icon] || Icons.AppWindow;
    const isExternal = t.type === "external" && t.href;
    const content = /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("div", { className: "group block p-5 border rounded-xl hover:shadow transition bg-white", children: /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("span", { className: "inline-flex items-center justify-center w-10 h-10 rounded-lg bg-neutral-100 group-hover:bg-neutral-200", children: /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(Icon, { className: "w-5 h-5 text-neutral-800" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime42.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("div", { className: "font-semibold", children: t.name }),
        /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("div", { className: "text-sm text-neutral-600", children: t.description })
      ] })
    ] }) });
    return isExternal ? /* @__PURE__ */ (0, import_jsx_runtime42.jsx)("a", { href: t.href, target: "_blank", rel: "noopener noreferrer", children: content }, t.key) : /* @__PURE__ */ (0, import_jsx_runtime42.jsx)(import_react_router_dom6.Link, { to: t.route, children: content }, t.key);
  }) });
}

// src/pages/CrowdfundingPage.jsx
var import_react47 = __toESM(require("react"));

// node_modules/.pnpm/swr@2.3.6_react@18.2.0/node_modules/swr/dist/index/index.mjs
var import_react43 = __toESM(require("react"), 1);
var import_shim = __toESM(require_shim(), 1);

// node_modules/.pnpm/swr@2.3.6_react@18.2.0/node_modules/swr/dist/_internal/config-context-client-BoS53ST9.mjs
var import_react41 = __toESM(require("react"), 1);

// node_modules/.pnpm/swr@2.3.6_react@18.2.0/node_modules/swr/dist/_internal/events.mjs
var events_exports = {};
__export(events_exports, {
  ERROR_REVALIDATE_EVENT: () => ERROR_REVALIDATE_EVENT,
  FOCUS_EVENT: () => FOCUS_EVENT,
  MUTATE_EVENT: () => MUTATE_EVENT,
  RECONNECT_EVENT: () => RECONNECT_EVENT
});
var FOCUS_EVENT = 0;
var RECONNECT_EVENT = 1;
var MUTATE_EVENT = 2;
var ERROR_REVALIDATE_EVENT = 3;

// node_modules/.pnpm/dequal@2.0.3/node_modules/dequal/lite/index.mjs
var has = Object.prototype.hasOwnProperty;
function dequal(foo, bar) {
  var ctor, len;
  if (foo === bar) return true;
  if (foo && bar && (ctor = foo.constructor) === bar.constructor) {
    if (ctor === Date) return foo.getTime() === bar.getTime();
    if (ctor === RegExp) return foo.toString() === bar.toString();
    if (ctor === Array) {
      if ((len = foo.length) === bar.length) {
        while (len-- && dequal(foo[len], bar[len])) ;
      }
      return len === -1;
    }
    if (!ctor || typeof foo === "object") {
      len = 0;
      for (ctor in foo) {
        if (has.call(foo, ctor) && ++len && !has.call(bar, ctor)) return false;
        if (!(ctor in bar) || !dequal(foo[ctor], bar[ctor])) return false;
      }
      return Object.keys(bar).length === len;
    }
  }
  return foo !== foo && bar !== bar;
}

// node_modules/.pnpm/swr@2.3.6_react@18.2.0/node_modules/swr/dist/_internal/config-context-client-BoS53ST9.mjs
var SWRGlobalState = /* @__PURE__ */ new WeakMap();
var noop = () => {
};
var UNDEFINED = (
  /*#__NOINLINE__*/
  noop()
);
var OBJECT = Object;
var isUndefined = (v) => v === UNDEFINED;
var isFunction2 = (v) => typeof v == "function";
var mergeObjects = (a, b) => ({
  ...a,
  ...b
});
var isPromiseLike = (x) => isFunction2(x.then);
var EMPTY_CACHE = {};
var INITIAL_CACHE = {};
var STR_UNDEFINED = "undefined";
var isWindowDefined = typeof window != STR_UNDEFINED;
var isDocumentDefined = typeof document != STR_UNDEFINED;
var isLegacyDeno = isWindowDefined && "Deno" in window;
var hasRequestAnimationFrame = () => isWindowDefined && typeof window["requestAnimationFrame"] != STR_UNDEFINED;
var createCacheHelper = (cache2, key) => {
  const state = SWRGlobalState.get(cache2);
  return [
    // Getter
    () => !isUndefined(key) && cache2.get(key) || EMPTY_CACHE,
    // Setter
    (info) => {
      if (!isUndefined(key)) {
        const prev = cache2.get(key);
        if (!(key in INITIAL_CACHE)) {
          INITIAL_CACHE[key] = prev;
        }
        state[5](key, mergeObjects(prev, info), prev || EMPTY_CACHE);
      }
    },
    // Subscriber
    state[6],
    // Get server cache snapshot
    () => {
      if (!isUndefined(key)) {
        if (key in INITIAL_CACHE) return INITIAL_CACHE[key];
      }
      return !isUndefined(key) && cache2.get(key) || EMPTY_CACHE;
    }
  ];
};
var online = true;
var isOnline = () => online;
var [onWindowEvent, offWindowEvent] = isWindowDefined && window.addEventListener ? [
  window.addEventListener.bind(window),
  window.removeEventListener.bind(window)
] : [
  noop,
  noop
];
var isVisible = () => {
  const visibilityState = isDocumentDefined && document.visibilityState;
  return isUndefined(visibilityState) || visibilityState !== "hidden";
};
var initFocus = (callback) => {
  if (isDocumentDefined) {
    document.addEventListener("visibilitychange", callback);
  }
  onWindowEvent("focus", callback);
  return () => {
    if (isDocumentDefined) {
      document.removeEventListener("visibilitychange", callback);
    }
    offWindowEvent("focus", callback);
  };
};
var initReconnect = (callback) => {
  const onOnline = () => {
    online = true;
    callback();
  };
  const onOffline = () => {
    online = false;
  };
  onWindowEvent("online", onOnline);
  onWindowEvent("offline", onOffline);
  return () => {
    offWindowEvent("online", onOnline);
    offWindowEvent("offline", onOffline);
  };
};
var preset = {
  isOnline,
  isVisible
};
var defaultConfigOptions = {
  initFocus,
  initReconnect
};
var IS_REACT_LEGACY = !import_react41.default.useId;
var IS_SERVER = !isWindowDefined || isLegacyDeno;
var rAF = (f) => hasRequestAnimationFrame() ? window["requestAnimationFrame"](f) : setTimeout(f, 1);
var useIsomorphicLayoutEffect = IS_SERVER ? import_react41.useEffect : import_react41.useLayoutEffect;
var navigatorConnection = typeof navigator !== "undefined" && navigator.connection;
var slowConnection = !IS_SERVER && navigatorConnection && ([
  "slow-2g",
  "2g"
].includes(navigatorConnection.effectiveType) || navigatorConnection.saveData);
var table = /* @__PURE__ */ new WeakMap();
var getTypeName = (value) => OBJECT.prototype.toString.call(value);
var isObjectTypeName = (typeName, type) => typeName === `[object ${type}]`;
var counter = 0;
var stableHash = (arg) => {
  const type = typeof arg;
  const typeName = getTypeName(arg);
  const isDate = isObjectTypeName(typeName, "Date");
  const isRegex = isObjectTypeName(typeName, "RegExp");
  const isPlainObject = isObjectTypeName(typeName, "Object");
  let result;
  let index;
  if (OBJECT(arg) === arg && !isDate && !isRegex) {
    result = table.get(arg);
    if (result) return result;
    result = ++counter + "~";
    table.set(arg, result);
    if (Array.isArray(arg)) {
      result = "@";
      for (index = 0; index < arg.length; index++) {
        result += stableHash(arg[index]) + ",";
      }
      table.set(arg, result);
    }
    if (isPlainObject) {
      result = "#";
      const keys = OBJECT.keys(arg).sort();
      while (!isUndefined(index = keys.pop())) {
        if (!isUndefined(arg[index])) {
          result += index + ":" + stableHash(arg[index]) + ",";
        }
      }
      table.set(arg, result);
    }
  } else {
    result = isDate ? arg.toJSON() : type == "symbol" ? arg.toString() : type == "string" ? JSON.stringify(arg) : "" + arg;
  }
  return result;
};
var serialize = (key) => {
  if (isFunction2(key)) {
    try {
      key = key();
    } catch (err) {
      key = "";
    }
  }
  const args = key;
  key = typeof key == "string" ? key : (Array.isArray(key) ? key.length : key) ? stableHash(key) : "";
  return [
    key,
    args
  ];
};
var __timestamp = 0;
var getTimestamp = () => ++__timestamp;
async function internalMutate(...args) {
  const [cache2, _key, _data, _opts] = args;
  const options = mergeObjects({
    populateCache: true,
    throwOnError: true
  }, typeof _opts === "boolean" ? {
    revalidate: _opts
  } : _opts || {});
  let populateCache = options.populateCache;
  const rollbackOnErrorOption = options.rollbackOnError;
  let optimisticData = options.optimisticData;
  const rollbackOnError = (error) => {
    return typeof rollbackOnErrorOption === "function" ? rollbackOnErrorOption(error) : rollbackOnErrorOption !== false;
  };
  const throwOnError = options.throwOnError;
  if (isFunction2(_key)) {
    const keyFilter = _key;
    const matchedKeys = [];
    const it = cache2.keys();
    for (const key of it) {
      if (
        // Skip the special useSWRInfinite and useSWRSubscription keys.
        !/^\$(inf|sub)\$/.test(key) && keyFilter(cache2.get(key)._k)
      ) {
        matchedKeys.push(key);
      }
    }
    return Promise.all(matchedKeys.map(mutateByKey));
  }
  return mutateByKey(_key);
  async function mutateByKey(_k) {
    const [key] = serialize(_k);
    if (!key) return;
    const [get, set3] = createCacheHelper(cache2, key);
    const [EVENT_REVALIDATORS, MUTATION, FETCH, PRELOAD] = SWRGlobalState.get(cache2);
    const startRevalidate = () => {
      const revalidators = EVENT_REVALIDATORS[key];
      const revalidate = isFunction2(options.revalidate) ? options.revalidate(get().data, _k) : options.revalidate !== false;
      if (revalidate) {
        delete FETCH[key];
        delete PRELOAD[key];
        if (revalidators && revalidators[0]) {
          return revalidators[0](MUTATE_EVENT).then(() => get().data);
        }
      }
      return get().data;
    };
    if (args.length < 3) {
      return startRevalidate();
    }
    let data = _data;
    let error;
    let isError = false;
    const beforeMutationTs = getTimestamp();
    MUTATION[key] = [
      beforeMutationTs,
      0
    ];
    const hasOptimisticData = !isUndefined(optimisticData);
    const state = get();
    const displayedData = state.data;
    const currentData = state._c;
    const committedData = isUndefined(currentData) ? displayedData : currentData;
    if (hasOptimisticData) {
      optimisticData = isFunction2(optimisticData) ? optimisticData(committedData, displayedData) : optimisticData;
      set3({
        data: optimisticData,
        _c: committedData
      });
    }
    if (isFunction2(data)) {
      try {
        data = data(committedData);
      } catch (err) {
        error = err;
        isError = true;
      }
    }
    if (data && isPromiseLike(data)) {
      data = await data.catch((err) => {
        error = err;
        isError = true;
      });
      if (beforeMutationTs !== MUTATION[key][0]) {
        if (isError) throw error;
        return data;
      } else if (isError && hasOptimisticData && rollbackOnError(error)) {
        populateCache = true;
        set3({
          data: committedData,
          _c: UNDEFINED
        });
      }
    }
    if (populateCache) {
      if (!isError) {
        if (isFunction2(populateCache)) {
          const populateCachedData = populateCache(data, committedData);
          set3({
            data: populateCachedData,
            error: UNDEFINED,
            _c: UNDEFINED
          });
        } else {
          set3({
            data,
            error: UNDEFINED,
            _c: UNDEFINED
          });
        }
      }
    }
    MUTATION[key][1] = getTimestamp();
    Promise.resolve(startRevalidate()).then(() => {
      set3({
        _c: UNDEFINED
      });
    });
    if (isError) {
      if (throwOnError) throw error;
      return;
    }
    return data;
  }
}
var revalidateAllKeys = (revalidators, type) => {
  for (const key in revalidators) {
    if (revalidators[key][0]) revalidators[key][0](type);
  }
};
var initCache = (provider, options) => {
  if (!SWRGlobalState.has(provider)) {
    const opts = mergeObjects(defaultConfigOptions, options);
    const EVENT_REVALIDATORS = /* @__PURE__ */ Object.create(null);
    const mutate2 = internalMutate.bind(UNDEFINED, provider);
    let unmount = noop;
    const subscriptions = /* @__PURE__ */ Object.create(null);
    const subscribe = (key, callback) => {
      const subs = subscriptions[key] || [];
      subscriptions[key] = subs;
      subs.push(callback);
      return () => subs.splice(subs.indexOf(callback), 1);
    };
    const setter = (key, value, prev) => {
      provider.set(key, value);
      const subs = subscriptions[key];
      if (subs) {
        for (const fn of subs) {
          fn(value, prev);
        }
      }
    };
    const initProvider = () => {
      if (!SWRGlobalState.has(provider)) {
        SWRGlobalState.set(provider, [
          EVENT_REVALIDATORS,
          /* @__PURE__ */ Object.create(null),
          /* @__PURE__ */ Object.create(null),
          /* @__PURE__ */ Object.create(null),
          mutate2,
          setter,
          subscribe
        ]);
        if (!IS_SERVER) {
          const releaseFocus = opts.initFocus(setTimeout.bind(UNDEFINED, revalidateAllKeys.bind(UNDEFINED, EVENT_REVALIDATORS, FOCUS_EVENT)));
          const releaseReconnect = opts.initReconnect(setTimeout.bind(UNDEFINED, revalidateAllKeys.bind(UNDEFINED, EVENT_REVALIDATORS, RECONNECT_EVENT)));
          unmount = () => {
            releaseFocus && releaseFocus();
            releaseReconnect && releaseReconnect();
            SWRGlobalState.delete(provider);
          };
        }
      }
    };
    initProvider();
    return [
      provider,
      mutate2,
      initProvider,
      unmount
    ];
  }
  return [
    provider,
    SWRGlobalState.get(provider)[4]
  ];
};
var onErrorRetry = (_, __, config, revalidate, opts) => {
  const maxRetryCount = config.errorRetryCount;
  const currentRetryCount = opts.retryCount;
  const timeout = ~~((Math.random() + 0.5) * (1 << (currentRetryCount < 8 ? currentRetryCount : 8))) * config.errorRetryInterval;
  if (!isUndefined(maxRetryCount) && currentRetryCount > maxRetryCount) {
    return;
  }
  setTimeout(revalidate, timeout, opts);
};
var compare = dequal;
var [cache, mutate] = initCache(/* @__PURE__ */ new Map());
var defaultConfig = mergeObjects(
  {
    // events
    onLoadingSlow: noop,
    onSuccess: noop,
    onError: noop,
    onErrorRetry,
    onDiscarded: noop,
    // switches
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    revalidateIfStale: true,
    shouldRetryOnError: true,
    // timeouts
    errorRetryInterval: slowConnection ? 1e4 : 5e3,
    focusThrottleInterval: 5 * 1e3,
    dedupingInterval: 2 * 1e3,
    loadingTimeout: slowConnection ? 5e3 : 3e3,
    // providers
    compare,
    isPaused: () => false,
    cache,
    mutate,
    fallback: {}
  },
  // use web preset by default
  preset
);
var mergeConfigs = (a, b) => {
  const v = mergeObjects(a, b);
  if (b) {
    const { use: u1, fallback: f1 } = a;
    const { use: u2, fallback: f2 } = b;
    if (u1 && u2) {
      v.use = u1.concat(u2);
    }
    if (f1 && f2) {
      v.fallback = mergeObjects(f1, f2);
    }
  }
  return v;
};
var SWRConfigContext = (0, import_react41.createContext)({});
var SWRConfig = (props) => {
  const { value } = props;
  const parentConfig = (0, import_react41.useContext)(SWRConfigContext);
  const isFunctionalConfig = isFunction2(value);
  const config = (0, import_react41.useMemo)(() => isFunctionalConfig ? value(parentConfig) : value, [
    isFunctionalConfig,
    parentConfig,
    value
  ]);
  const extendedConfig = (0, import_react41.useMemo)(() => isFunctionalConfig ? config : mergeConfigs(parentConfig, config), [
    isFunctionalConfig,
    parentConfig,
    config
  ]);
  const provider = config && config.provider;
  const cacheContextRef = (0, import_react41.useRef)(UNDEFINED);
  if (provider && !cacheContextRef.current) {
    cacheContextRef.current = initCache(provider(extendedConfig.cache || cache), config);
  }
  const cacheContext = cacheContextRef.current;
  if (cacheContext) {
    extendedConfig.cache = cacheContext[0];
    extendedConfig.mutate = cacheContext[1];
  }
  useIsomorphicLayoutEffect(() => {
    if (cacheContext) {
      cacheContext[2] && cacheContext[2]();
      return cacheContext[3];
    }
  }, []);
  return (0, import_react41.createElement)(SWRConfigContext.Provider, mergeObjects(props, {
    value: extendedConfig
  }));
};

// node_modules/.pnpm/swr@2.3.6_react@18.2.0/node_modules/swr/dist/_internal/constants.mjs
var INFINITE_PREFIX = "$inf$";

// node_modules/.pnpm/swr@2.3.6_react@18.2.0/node_modules/swr/dist/_internal/index.mjs
var import_react42 = __toESM(require("react"), 1);
var enableDevtools = isWindowDefined && window.__SWR_DEVTOOLS_USE__;
var use = enableDevtools ? window.__SWR_DEVTOOLS_USE__ : [];
var setupDevTools = () => {
  if (enableDevtools) {
    window.__SWR_DEVTOOLS_REACT__ = import_react42.default;
  }
};
var normalize = (args) => {
  return isFunction2(args[1]) ? [
    args[0],
    args[1],
    args[2] || {}
  ] : [
    args[0],
    null,
    (args[1] === null ? args[2] : args[1]) || {}
  ];
};
var useSWRConfig = () => {
  const parentConfig = (0, import_react42.useContext)(SWRConfigContext);
  const mergedConfig = (0, import_react42.useMemo)(() => mergeObjects(defaultConfig, parentConfig), [
    parentConfig
  ]);
  return mergedConfig;
};
var middleware = (useSWRNext) => (key_, fetcher_, config) => {
  const fetcher = fetcher_ && ((...args) => {
    const [key] = serialize(key_);
    const [, , , PRELOAD] = SWRGlobalState.get(cache);
    if (key.startsWith(INFINITE_PREFIX)) {
      return fetcher_(...args);
    }
    const req = PRELOAD[key];
    if (isUndefined(req)) return fetcher_(...args);
    delete PRELOAD[key];
    return req;
  });
  return useSWRNext(key_, fetcher, config);
};
var BUILT_IN_MIDDLEWARE = use.concat(middleware);
var withArgs = (hook) => {
  return function useSWRArgs(...args) {
    const fallbackConfig = useSWRConfig();
    const [key, fn, _config] = normalize(args);
    const config = mergeConfigs(fallbackConfig, _config);
    let next = hook;
    const { use: use3 } = config;
    const middleware2 = (use3 || []).concat(BUILT_IN_MIDDLEWARE);
    for (let i = middleware2.length; i--; ) {
      next = middleware2[i](next);
    }
    return next(key, fn || config.fetcher || null, config);
  };
};
var subscribeCallback = (key, callbacks, callback) => {
  const keyedRevalidators = callbacks[key] || (callbacks[key] = []);
  keyedRevalidators.push(callback);
  return () => {
    const index = keyedRevalidators.indexOf(callback);
    if (index >= 0) {
      keyedRevalidators[index] = keyedRevalidators[keyedRevalidators.length - 1];
      keyedRevalidators.pop();
    }
  };
};
setupDevTools();

// node_modules/.pnpm/swr@2.3.6_react@18.2.0/node_modules/swr/dist/index/index.mjs
var noop2 = () => {
};
var UNDEFINED2 = (
  /*#__NOINLINE__*/
  noop2()
);
var use2 = import_react43.default.use || // This extra generic is to avoid TypeScript mixing up the generic and JSX sytax
// and emitting an error.
// We assume that this is only for the `use(thenable)` case, not `use(context)`.
// https://github.com/facebook/react/blob/aed00dacfb79d17c53218404c52b1c7aa59c4a89/packages/react-server/src/ReactFizzThenable.js#L45
((thenable) => {
  switch (thenable.status) {
    case "pending":
      throw thenable;
    case "fulfilled":
      return thenable.value;
    case "rejected":
      throw thenable.reason;
    default:
      thenable.status = "pending";
      thenable.then((v) => {
        thenable.status = "fulfilled";
        thenable.value = v;
      }, (e) => {
        thenable.status = "rejected";
        thenable.reason = e;
      });
      throw thenable;
  }
});
var WITH_DEDUPE = {
  dedupe: true
};
var resolvedUndef = Promise.resolve(UNDEFINED);
var useSWRHandler = (_key, fetcher, config) => {
  const { cache: cache2, compare: compare2, suspense, fallbackData, revalidateOnMount, revalidateIfStale, refreshInterval, refreshWhenHidden, refreshWhenOffline, keepPreviousData } = config;
  const [EVENT_REVALIDATORS, MUTATION, FETCH, PRELOAD] = SWRGlobalState.get(cache2);
  const [key, fnArg] = serialize(_key);
  const initialMountedRef = (0, import_react43.useRef)(false);
  const unmountedRef = (0, import_react43.useRef)(false);
  const keyRef = (0, import_react43.useRef)(key);
  const fetcherRef = (0, import_react43.useRef)(fetcher);
  const configRef = (0, import_react43.useRef)(config);
  const getConfig = () => configRef.current;
  const isActive = () => getConfig().isVisible() && getConfig().isOnline();
  const [getCache, setCache, subscribeCache, getInitialCache] = createCacheHelper(cache2, key);
  const stateDependencies = (0, import_react43.useRef)({}).current;
  const fallback = isUndefined(fallbackData) ? isUndefined(config.fallback) ? UNDEFINED : config.fallback[key] : fallbackData;
  const isEqual = (prev, current) => {
    for (const _ in stateDependencies) {
      const t = _;
      if (t === "data") {
        if (!compare2(prev[t], current[t])) {
          if (!isUndefined(prev[t])) {
            return false;
          }
          if (!compare2(returnedData, current[t])) {
            return false;
          }
        }
      } else {
        if (current[t] !== prev[t]) {
          return false;
        }
      }
    }
    return true;
  };
  const getSnapshot = (0, import_react43.useMemo)(() => {
    const shouldStartRequest = (() => {
      if (!key) return false;
      if (!fetcher) return false;
      if (!isUndefined(revalidateOnMount)) return revalidateOnMount;
      if (getConfig().isPaused()) return false;
      if (suspense) return false;
      return revalidateIfStale !== false;
    })();
    const getSelectedCache = (state) => {
      const snapshot = mergeObjects(state);
      delete snapshot._k;
      if (!shouldStartRequest) {
        return snapshot;
      }
      return {
        isValidating: true,
        isLoading: true,
        ...snapshot
      };
    };
    const cachedData2 = getCache();
    const initialData = getInitialCache();
    const clientSnapshot = getSelectedCache(cachedData2);
    const serverSnapshot = cachedData2 === initialData ? clientSnapshot : getSelectedCache(initialData);
    let memorizedSnapshot = clientSnapshot;
    return [
      () => {
        const newSnapshot = getSelectedCache(getCache());
        const compareResult = isEqual(newSnapshot, memorizedSnapshot);
        if (compareResult) {
          memorizedSnapshot.data = newSnapshot.data;
          memorizedSnapshot.isLoading = newSnapshot.isLoading;
          memorizedSnapshot.isValidating = newSnapshot.isValidating;
          memorizedSnapshot.error = newSnapshot.error;
          return memorizedSnapshot;
        } else {
          memorizedSnapshot = newSnapshot;
          return newSnapshot;
        }
      },
      () => serverSnapshot
    ];
  }, [
    cache2,
    key
  ]);
  const cached = (0, import_shim.useSyncExternalStore)((0, import_react43.useCallback)(
    (callback) => subscribeCache(key, (current, prev) => {
      if (!isEqual(prev, current)) callback();
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      cache2,
      key
    ]
  ), getSnapshot[0], getSnapshot[1]);
  const isInitialMount = !initialMountedRef.current;
  const hasRevalidator = EVENT_REVALIDATORS[key] && EVENT_REVALIDATORS[key].length > 0;
  const cachedData = cached.data;
  const data = isUndefined(cachedData) ? fallback && isPromiseLike(fallback) ? use2(fallback) : fallback : cachedData;
  const error = cached.error;
  const laggyDataRef = (0, import_react43.useRef)(data);
  const returnedData = keepPreviousData ? isUndefined(cachedData) ? isUndefined(laggyDataRef.current) ? data : laggyDataRef.current : cachedData : data;
  const shouldDoInitialRevalidation = (() => {
    if (hasRevalidator && !isUndefined(error)) return false;
    if (isInitialMount && !isUndefined(revalidateOnMount)) return revalidateOnMount;
    if (getConfig().isPaused()) return false;
    if (suspense) return isUndefined(data) ? false : revalidateIfStale;
    return isUndefined(data) || revalidateIfStale;
  })();
  const defaultValidatingState = !!(key && fetcher && isInitialMount && shouldDoInitialRevalidation);
  const isValidating = isUndefined(cached.isValidating) ? defaultValidatingState : cached.isValidating;
  const isLoading = isUndefined(cached.isLoading) ? defaultValidatingState : cached.isLoading;
  const revalidate = (0, import_react43.useCallback)(
    async (revalidateOpts) => {
      const currentFetcher = fetcherRef.current;
      if (!key || !currentFetcher || unmountedRef.current || getConfig().isPaused()) {
        return false;
      }
      let newData;
      let startAt;
      let loading = true;
      const opts = revalidateOpts || {};
      const shouldStartNewRequest = !FETCH[key] || !opts.dedupe;
      const callbackSafeguard = () => {
        if (IS_REACT_LEGACY) {
          return !unmountedRef.current && key === keyRef.current && initialMountedRef.current;
        }
        return key === keyRef.current;
      };
      const finalState = {
        isValidating: false,
        isLoading: false
      };
      const finishRequestAndUpdateState = () => {
        setCache(finalState);
      };
      const cleanupState = () => {
        const requestInfo = FETCH[key];
        if (requestInfo && requestInfo[1] === startAt) {
          delete FETCH[key];
        }
      };
      const initialState = {
        isValidating: true
      };
      if (isUndefined(getCache().data)) {
        initialState.isLoading = true;
      }
      try {
        if (shouldStartNewRequest) {
          setCache(initialState);
          if (config.loadingTimeout && isUndefined(getCache().data)) {
            setTimeout(() => {
              if (loading && callbackSafeguard()) {
                getConfig().onLoadingSlow(key, config);
              }
            }, config.loadingTimeout);
          }
          FETCH[key] = [
            currentFetcher(fnArg),
            getTimestamp()
          ];
        }
        ;
        [newData, startAt] = FETCH[key];
        newData = await newData;
        if (shouldStartNewRequest) {
          setTimeout(cleanupState, config.dedupingInterval);
        }
        if (!FETCH[key] || FETCH[key][1] !== startAt) {
          if (shouldStartNewRequest) {
            if (callbackSafeguard()) {
              getConfig().onDiscarded(key);
            }
          }
          return false;
        }
        finalState.error = UNDEFINED;
        const mutationInfo = MUTATION[key];
        if (!isUndefined(mutationInfo) && // case 1
        (startAt <= mutationInfo[0] || // case 2
        startAt <= mutationInfo[1] || // case 3
        mutationInfo[1] === 0)) {
          finishRequestAndUpdateState();
          if (shouldStartNewRequest) {
            if (callbackSafeguard()) {
              getConfig().onDiscarded(key);
            }
          }
          return false;
        }
        const cacheData = getCache().data;
        finalState.data = compare2(cacheData, newData) ? cacheData : newData;
        if (shouldStartNewRequest) {
          if (callbackSafeguard()) {
            getConfig().onSuccess(newData, key, config);
          }
        }
      } catch (err) {
        cleanupState();
        const currentConfig = getConfig();
        const { shouldRetryOnError } = currentConfig;
        if (!currentConfig.isPaused()) {
          finalState.error = err;
          if (shouldStartNewRequest && callbackSafeguard()) {
            currentConfig.onError(err, key, currentConfig);
            if (shouldRetryOnError === true || isFunction2(shouldRetryOnError) && shouldRetryOnError(err)) {
              if (!getConfig().revalidateOnFocus || !getConfig().revalidateOnReconnect || isActive()) {
                currentConfig.onErrorRetry(err, key, currentConfig, (_opts) => {
                  const revalidators = EVENT_REVALIDATORS[key];
                  if (revalidators && revalidators[0]) {
                    revalidators[0](events_exports.ERROR_REVALIDATE_EVENT, _opts);
                  }
                }, {
                  retryCount: (opts.retryCount || 0) + 1,
                  dedupe: true
                });
              }
            }
          }
        }
      }
      loading = false;
      finishRequestAndUpdateState();
      return true;
    },
    // `setState` is immutable, and `eventsCallback`, `fnArg`, and
    // `keyValidating` are depending on `key`, so we can exclude them from
    // the deps array.
    //
    // FIXME:
    // `fn` and `config` might be changed during the lifecycle,
    // but they might be changed every render like this.
    // `useSWR('key', () => fetch('/api/'), { suspense: true })`
    // So we omit the values from the deps array
    // even though it might cause unexpected behaviors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      key,
      cache2
    ]
  );
  const boundMutate = (0, import_react43.useCallback)(
    // Use callback to make sure `keyRef.current` returns latest result every time
    (...args) => {
      return internalMutate(cache2, keyRef.current, ...args);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useIsomorphicLayoutEffect(() => {
    fetcherRef.current = fetcher;
    configRef.current = config;
    if (!isUndefined(cachedData)) {
      laggyDataRef.current = cachedData;
    }
  });
  useIsomorphicLayoutEffect(() => {
    if (!key) return;
    const softRevalidate = revalidate.bind(UNDEFINED, WITH_DEDUPE);
    let nextFocusRevalidatedAt = 0;
    if (getConfig().revalidateOnFocus) {
      const initNow = Date.now();
      nextFocusRevalidatedAt = initNow + getConfig().focusThrottleInterval;
    }
    const onRevalidate = (type, opts = {}) => {
      if (type == events_exports.FOCUS_EVENT) {
        const now = Date.now();
        if (getConfig().revalidateOnFocus && now > nextFocusRevalidatedAt && isActive()) {
          nextFocusRevalidatedAt = now + getConfig().focusThrottleInterval;
          softRevalidate();
        }
      } else if (type == events_exports.RECONNECT_EVENT) {
        if (getConfig().revalidateOnReconnect && isActive()) {
          softRevalidate();
        }
      } else if (type == events_exports.MUTATE_EVENT) {
        return revalidate();
      } else if (type == events_exports.ERROR_REVALIDATE_EVENT) {
        return revalidate(opts);
      }
      return;
    };
    const unsubEvents = subscribeCallback(key, EVENT_REVALIDATORS, onRevalidate);
    unmountedRef.current = false;
    keyRef.current = key;
    initialMountedRef.current = true;
    setCache({
      _k: fnArg
    });
    if (shouldDoInitialRevalidation) {
      if (!FETCH[key]) {
        if (isUndefined(data) || IS_SERVER) {
          softRevalidate();
        } else {
          rAF(softRevalidate);
        }
      }
    }
    return () => {
      unmountedRef.current = true;
      unsubEvents();
    };
  }, [
    key
  ]);
  useIsomorphicLayoutEffect(() => {
    let timer;
    function next() {
      const interval = isFunction2(refreshInterval) ? refreshInterval(getCache().data) : refreshInterval;
      if (interval && timer !== -1) {
        timer = setTimeout(execute, interval);
      }
    }
    function execute() {
      if (!getCache().error && (refreshWhenHidden || getConfig().isVisible()) && (refreshWhenOffline || getConfig().isOnline())) {
        revalidate(WITH_DEDUPE).then(next);
      } else {
        next();
      }
    }
    next();
    return () => {
      if (timer) {
        clearTimeout(timer);
        timer = -1;
      }
    };
  }, [
    refreshInterval,
    refreshWhenHidden,
    refreshWhenOffline,
    key
  ]);
  (0, import_react43.useDebugValue)(returnedData);
  if (suspense) {
    const hasKeyButNoData = key && isUndefined(data);
    if (!IS_REACT_LEGACY && IS_SERVER && hasKeyButNoData) {
      throw new Error("Fallback data is required when using Suspense in SSR.");
    }
    if (hasKeyButNoData) {
      fetcherRef.current = fetcher;
      configRef.current = config;
      unmountedRef.current = false;
    }
    const req = PRELOAD[key];
    const mutateReq = !isUndefined(req) && hasKeyButNoData ? boundMutate(req) : resolvedUndef;
    use2(mutateReq);
    if (!isUndefined(error) && hasKeyButNoData) {
      throw error;
    }
    const revalidation = hasKeyButNoData ? revalidate(WITH_DEDUPE) : resolvedUndef;
    if (!isUndefined(returnedData) && hasKeyButNoData) {
      revalidation.status = "fulfilled";
      revalidation.value = true;
    }
    use2(revalidation);
  }
  const swrResponse = {
    mutate: boundMutate,
    get data() {
      stateDependencies.data = true;
      return returnedData;
    },
    get error() {
      stateDependencies.error = true;
      return error;
    },
    get isValidating() {
      stateDependencies.isValidating = true;
      return isValidating;
    },
    get isLoading() {
      stateDependencies.isLoading = true;
      return isLoading;
    }
  };
  return swrResponse;
};
var SWRConfig2 = OBJECT.defineProperty(SWRConfig, "defaultValue", {
  value: defaultConfig
});
var useSWR = withArgs(useSWRHandler);

// src/pages/CrowdfundingPage.jsx
var import_prop_types2 = __toESM(require_prop_types());
var import_react_helmet_async12 = __toESM(require_lib());
var import_react48 = require("@portabletext/react");

// src/lib/useSquarePayments.ts
var import_react44 = require("react");
var import_meta7 = {};
var SQUARE_SCRIPT_ATTR2 = "data-square-sdk";
var scriptState = {
  promise: null,
  url: null
};
var resolveEnvHint = () => {
  const env3 = import_meta7?.env || {};
  const raw = typeof window !== "undefined" && window.__SQUARE_ENV__ || env3?.VITE_SQUARE_ENV || "";
  return String(raw || "").trim().toLowerCase();
};
var getSquareConfig = () => {
  const env3 = import_meta7?.env || {};
  const appId = typeof window !== "undefined" && (window.__SQUARE_APP_ID__ || window.SQUARE_APPLICATION_ID || null) || env3?.VITE_SQUARE_APP_ID || null;
  const locationId = typeof window !== "undefined" && (window.__SQUARE_LOCATION_ID__ || window.SQUARE_LOCATION_ID || null) || env3?.VITE_SQUARE_LOCATION_ID || null;
  const envHint = resolveEnvHint();
  let isSandbox = false;
  if (envHint) {
    if (["sandbox", "dev", "development", "test"].includes(envHint)) {
      isSandbox = true;
    } else if (["prod", "production", "live"].includes(envHint)) {
      isSandbox = false;
    }
  } else if (appId && appId.startsWith("sandbox-")) {
    isSandbox = true;
  } else if (typeof window !== "undefined") {
    const hostname = window.location?.hostname || "";
    if (/localhost$/i.test(hostname) || hostname === "127.0.0.1") {
      isSandbox = true;
    }
  } else if (env3?.MODE && env3.MODE !== "production") {
    isSandbox = true;
  }
  const sdkUrl = isSandbox ? "https://sandbox.web.squarecdn.com/v1/square.js" : "https://web.squarecdn.com/v1/square.js";
  return {
    appId: appId || null,
    locationId: locationId || null,
    sdkUrl,
    isSandbox,
    environment: isSandbox ? "sandbox" : "production"
  };
};
var loadSquareSdk = (sdkUrl, isSandbox) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Square SDK requires a browser environment."));
  }
  if (scriptState.promise && scriptState.url === sdkUrl) {
    return scriptState.promise;
  }
  const startMs = performance?.now?.() ?? Date.now();
  console.log("[square] requesting Square Web Payments SDK", { sdkUrl });
  const promise = new Promise((resolve, reject) => {
    let script = document.querySelector(`script[${SQUARE_SCRIPT_ATTR2}]`);
    const finish = (success, error) => {
      if (script) {
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
      }
      if (success) {
        const elapsed = Math.round((performance?.now?.() ?? Date.now()) - startMs);
        console.log("[square] Square Web Payments SDK loaded", { sdkUrl, elapsed });
        resolve();
      } else {
        reject(error || new Error("Failed to load Square Web Payments SDK."));
      }
    };
    const onLoad = () => {
      if (script) {
        script.dataset.squareLoaded = "true";
      }
      finish(true);
    };
    const onError = (event) => {
      const message = typeof event === "string" ? event : "Failed to load Square Web Payments SDK";
      finish(false, new Error(message));
    };
    if (script && script.src !== sdkUrl) {
      script.parentElement?.removeChild(script);
      script = null;
    }
    if (!script) {
      script = document.createElement("script");
      script.async = true;
      script.src = sdkUrl;
      script.setAttribute(SQUARE_SCRIPT_ATTR2, "true");
      script.dataset.squareSdkEnv = isSandbox ? "sandbox" : "production";
      document.head.appendChild(script);
    } else if (script.dataset.squareLoaded === "true" || window.Square) {
      finish(true);
      return;
    }
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
  }).catch((err) => {
    if (scriptState.url === sdkUrl) {
      scriptState.promise = null;
      scriptState.url = null;
    }
    console.error("[square] Square Web Payments SDK failed to load", err);
    throw err;
  });
  scriptState.promise = promise;
  scriptState.url = sdkUrl;
  return promise;
};
var useSquarePayments = () => {
  const config = (0, import_react44.useMemo)(() => getSquareConfig(), []);
  const [payments, setPayments] = (0, import_react44.useState)(null);
  const [loading, setLoading] = (0, import_react44.useState)(false);
  const [error, setError] = (0, import_react44.useState)(null);
  const initRef = (0, import_react44.useRef)(false);
  (0, import_react44.useEffect)(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (typeof window === "undefined") {
      setError("Square payments require a browser environment.");
      return;
    }
    if (!config.appId || !config.locationId) {
      const message = "Square configuration missing application or location ID.";
      console.error("[square] missing configuration for Square Web Payments", config);
      setError(message);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadSquareSdk(config.sdkUrl, config.isSandbox).then(() => {
      const square = window.Square;
      if (!square?.payments) {
        throw new Error("Square payments API is unavailable after script load.");
      }
      return square.payments(config.appId, config.locationId);
    }).then((instance) => {
      if (cancelled) {
        return;
      }
      console.log("[square] Square payments initialized", {
        locationId: config.locationId,
        environment: config.environment
      });
      setPayments(instance);
      setError(null);
    }).catch((err) => {
      if (!cancelled) {
        console.error("[square] failed to initialize Square payments", err);
        setError(err?.message || "Failed to initialize Square payments.");
      }
    }).finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [config]);
  return {
    payments,
    loading,
    error,
    appId: config.appId,
    locationId: config.locationId,
    isSandbox: config.isSandbox,
    sdkUrl: config.sdkUrl,
    environment: config.environment
  };
};

// src/components/ui/button.jsx
var React56 = __toESM(require("react"));
var import_jsx_runtime43 = require("react/jsx-runtime");
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
var Button = React56.forwardRef(({ className = "", variant = "default", size = "default", ...props }, ref3) => {
  const variantClass = variantClasses[variant] || variantClasses.default;
  const sizeClass = sizeClasses[size] || sizeClasses.default;
  return /* @__PURE__ */ (0, import_jsx_runtime43.jsx)(
    "button",
    {
      ref: ref3,
      className: cn(baseClasses, variantClass, sizeClass, className),
      ...props
    }
  );
});
Button.displayName = "Button";

// src/components/ui/card.jsx
var React57 = __toESM(require("react"));
var import_jsx_runtime44 = require("react/jsx-runtime");
var Card = React57.forwardRef(({ className = "", children, ...props }, ref3) => /* @__PURE__ */ (0, import_jsx_runtime44.jsx)(
  "div",
  {
    ref: ref3,
    className: cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className),
    ...props,
    children
  }
));
Card.displayName = "Card";
var CardHeader = ({ className = "", children, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime44.jsx)("div", { className: cn("space-y-1.5 border-b border-slate-100 px-6 py-5", className), ...props, children });
CardHeader.displayName = "CardHeader";
var CardTitle = ({ className = "", children, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime44.jsx)("h3", { className: cn("text-lg font-semibold text-slate-900", className), ...props, children });
CardTitle.displayName = "CardTitle";
var CardDescription = ({ className = "", children, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime44.jsx)("p", { className: cn("text-sm text-slate-500", className), ...props, children });
CardDescription.displayName = "CardDescription";
var CardContent = ({ className = "", children, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime44.jsx)("div", { className: cn("px-6 py-5", className), ...props, children });
CardContent.displayName = "CardContent";
var CardFooter = ({ className = "", children, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime44.jsx)("div", { className: cn("flex items-center gap-3 px-6 py-4 border-t border-slate-100", className), ...props, children });
CardFooter.displayName = "CardFooter";

// src/components/ui/input.jsx
var React58 = __toESM(require("react"));
var import_jsx_runtime45 = require("react/jsx-runtime");
var Input = React58.forwardRef(({ className = "", type = "text", ...props }, ref3) => /* @__PURE__ */ (0, import_jsx_runtime45.jsx)(
  "input",
  {
    ref: ref3,
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
var React59 = __toESM(require("react"));
var import_jsx_runtime46 = require("react/jsx-runtime");
var Textarea = React59.forwardRef(({ className = "", rows = 3, ...props }, ref3) => /* @__PURE__ */ (0, import_jsx_runtime46.jsx)(
  "textarea",
  {
    ref: ref3,
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
var React60 = __toESM(require("react"));
var import_jsx_runtime47 = require("react/jsx-runtime");
var Label = React60.forwardRef(({ className = "", children, ...props }, ref3) => /* @__PURE__ */ (0, import_jsx_runtime47.jsx)("label", { ref: ref3, className: cn("text-sm font-semibold text-slate-700", className), ...props, children }));
Label.displayName = "Label";

// src/components/crowdfunding/PrioritiesPie.jsx
var import_react45 = __toESM(require("react"));

// src/lib/devConsole.js
var import_meta8 = {};
var getMode = () => {
  try {
    if (typeof import_meta8 !== "undefined" && import_meta8?.env?.MODE) {
      return import_meta8.env.MODE;
    }
  } catch (error) {
  }
  return typeof process !== "undefined" && process.env && "production" ? "production" : "development";
};
var isDev = () => getMode() !== "production";
var callConsole = (method, args) => {
  if (!isDev()) return;
  if (!(method in console)) return;
  console[method](...args);
};
var devConsole = {
  log: (...args) => callConsole("log", args),
  warn: (...args) => callConsole("warn", args),
  error: (...args) => callConsole("error", args),
  info: (...args) => callConsole("info", args),
  assert: (condition, ...args) => {
    if (!isDev()) return;
    console.assert(condition, ...args);
  }
};
var devConsole_default = devConsole;

// src/components/crowdfunding/PrioritiesPie.jsx
var import_jsx_runtime48 = require("react/jsx-runtime");
var items = {
  fulfillment: [
    { name: "Cheese", amount: 900 },
    { name: "Flour", amount: 150 },
    { name: "Other ingredients", amount: 500 }
  ],
  debt: [
    { name: "Car", amount: 1800 },
    { name: "Will", amount: 1500 },
    { name: "Adam", amount: 1800 }
  ],
  equipment: [
    { name: "Two additional ovens", amount: 1e3 * 2 },
    { name: "Assorted pizza tools", amount: 500 }
  ],
  marketing: [
    { name: "Ads", amount: 1e3 },
    { name: "Packaging/Stickers", amount: 400 },
    { name: "Video/Sound", amount: 1200 }
  ]
};
var GOAL = 25e3;
var PIZZA_PRICE = 15;
var PIZZAS_NEEDED = Math.ceil(GOAL / PIZZA_PRICE);

// src/components/common/ToastProvider.jsx
var import_react46 = __toESM(require("react"));
var import_jsx_runtime49 = require("react/jsx-runtime");
var ToastContext = (0, import_react46.createContext)({ notify: () => {
} });
function useToast() {
  return (0, import_react46.useContext)(ToastContext);
}

// src/lib/firebaseCrowdfunding.js
var import_app2 = require("firebase/app");
var import_firestore3 = require("firebase/firestore");
var import_meta9 = {};
var cachedApp = null;
var initAttempted = false;
var getEnv = () => {
  if (typeof import_meta9 !== "undefined" && import_meta9.env) {
    return import_meta9.env;
  }
  return {};
};
var readEnvValue = (suffix) => {
  const env3 = getEnv();
  return env3[`VITE_FIREBASE_${suffix}`] || env3[`NEXT_PUBLIC_FIREBASE_${suffix}`] || env3[`PUBLIC_FIREBASE_${suffix}`] || null;
};
var buildFirebaseConfig = () => {
  const apiKey = readEnvValue("API_KEY");
  const authDomain = readEnvValue("AUTH_DOMAIN");
  const projectId2 = readEnvValue("PROJECT_ID");
  const appId = readEnvValue("APP_ID");
  const messagingSenderId = readEnvValue("MESSAGING_SENDER_ID");
  const databaseURL = readEnvValue("DATABASE_URL") || readEnvValue("DATABASEURL") || void 0;
  if (!apiKey || !authDomain || !projectId2 || !appId || !messagingSenderId) {
    return null;
  }
  const config = {
    apiKey,
    authDomain,
    projectId: projectId2,
    appId,
    messagingSenderId
  };
  if (databaseURL) {
    config.databaseURL = databaseURL;
  }
  return config;
};
var getFirebaseAppInstance = () => {
  if (typeof window === "undefined") {
    return null;
  }
  if (cachedApp) {
    return cachedApp;
  }
  if (initAttempted) {
    return null;
  }
  initAttempted = true;
  const config = buildFirebaseConfig();
  if (!config) {
    devConsole_default.warn?.("[firebase] missing client configuration for crowdfunding");
    return null;
  }
  try {
    cachedApp = (0, import_app2.getApps)()[0] ?? (0, import_app2.initializeApp)(config);
    return cachedApp;
  } catch (error) {
    cachedApp = null;
    devConsole_default.warn?.("[firebase] failed to initialize client app", error);
    return null;
  }
};
var normalizeTimestamp = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && typeof value.toDate === "function") {
    try {
      return value.toDate();
    } catch (error) {
      return null;
    }
  }
  return null;
};
var sanitizeFeedbackText = (value) => String(value || "").replace(/\r/g, "").trim();
var sanitizeFeedbackRating = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const rounded = Math.round(num);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
};
var watchCrowdfundingTotals = ({ onUpdate, onError } = {}) => {
  const app2 = getFirebaseAppInstance();
  if (!app2) {
    return null;
  }
  try {
    const firestore = (0, import_firestore3.getFirestore)(app2);
    const totalsRef = (0, import_firestore3.doc)(firestore, "aggregates", "crowdfunding");
    return (0, import_firestore3.onSnapshot)(
      totalsRef,
      (snapshot) => {
        const raw = snapshot.exists() ? snapshot.data() || {} : {};
        const pizzas = Number(raw.pizzas);
        const backers = Number(raw.backers);
        const goal = Number(raw.goal);
        const updatedAt = normalizeTimestamp(raw.updatedAt);
        if (onUpdate) {
          onUpdate({
            pizzas: Number.isFinite(pizzas) ? pizzas : null,
            backers: Number.isFinite(backers) ? backers : null,
            goal: Number.isFinite(goal) && goal > 0 ? goal : null,
            updatedAt
          });
        }
      },
      (error) => {
        devConsole_default.warn?.("[firebase] crowdfunding totals listener error", error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    devConsole_default.warn?.("[firebase] crowdfunding totals listener failed", error);
    if (onError) onError(error);
    return null;
  }
};
var watchPizzaFeedback = ({ limit = 8, onUpdate, onError } = {}) => {
  const app2 = getFirebaseAppInstance();
  if (!app2) {
    return null;
  }
  const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 30) : 8;
  try {
    const firestore = (0, import_firestore3.getFirestore)(app2);
    const feedbackRef = (0, import_firestore3.collection)(firestore, "crowdfund_feedback");
    const feedbackQuery = (0, import_firestore3.query)(
      feedbackRef,
      (0, import_firestore3.orderBy)("createdAtMs", "desc"),
      (0, import_firestore3.limit)(normalizedLimit)
    );
    return (0, import_firestore3.onSnapshot)(
      feedbackQuery,
      (snapshot) => {
        const entries = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() || {};
          const comment = sanitizeFeedbackText(data.comment || data.message);
          if (!comment) {
            return null;
          }
          return {
            id: docSnap.id || `feedback-${data.createdAtMs || Date.now()}`,
            comment,
            rating: sanitizeFeedbackRating(data.rating),
            createdAt: normalizeTimestamp(data.createdAt) ?? null
          };
        }).filter(Boolean);
        if (onUpdate) {
          onUpdate(entries);
        }
      },
      (error) => {
        devConsole_default.warn?.("[firebase] pizza feedback listener error", error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    devConsole_default.warn?.("[firebase] pizza feedback listener failed", error);
    if (onError) onError(error);
    return null;
  }
};

// src/pages/CrowdfundingPage.jsx
var import_jsx_runtime50 = require("react/jsx-runtime");
var import_meta10 = {};
var REALTIME_DATABASE_URL = "https://local-effort-default-rtdb.firebaseio.com/";
var FIREBASE_DATABASE_PATTERN = /firebase database/gi;
var createFirebaseDatabaseRegex = () => new RegExp(FIREBASE_DATABASE_PATTERN);
function isPortableTextBlocks(value) {
  return Array.isArray(value) && value.some(
    (item) => item && typeof item === "object" && item._type === "block" && Array.isArray(item.children)
  );
}
function replaceFirebaseDatabaseInPortableBlocks(blocks) {
  if (!isPortableTextBlocks(blocks)) {
    return blocks;
  }
  let changed = false;
  let markCounter = 0;
  const processed = blocks.map((block, blockIndex) => {
    if (!block || typeof block !== "object" || !Array.isArray(block.children)) {
      return block;
    }
    let blockChanged = false;
    const newChildren = [];
    let markDefs = Array.isArray(block.markDefs) ? [...block.markDefs] : [];
    let linkMarkKey = null;
    const ensureLinkMarkKey = () => {
      if (linkMarkKey) {
        return linkMarkKey;
      }
      const existing = markDefs.find(
        (def) => def && def._type === "link" && typeof def.href === "string" && def.href === REALTIME_DATABASE_URL
      );
      if (existing && existing._key) {
        linkMarkKey = existing._key;
        return linkMarkKey;
      }
      markCounter += 1;
      linkMarkKey = `realtime-db-link-${blockIndex}-${markCounter}`;
      markDefs = [
        ...markDefs,
        {
          _key: linkMarkKey,
          _type: "link",
          href: REALTIME_DATABASE_URL
        }
      ];
      return linkMarkKey;
    };
    block.children.forEach((child) => {
      if (!child || child._type !== "span" || typeof child.text !== "string") {
        newChildren.push(child);
        return;
      }
      const text = child.text;
      const regex = createFirebaseDatabaseRegex();
      let match;
      let lastIndex = 0;
      let localChanged = false;
      let segmentIndex = 0;
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = regex.lastIndex;
        if (start > lastIndex) {
          const slice = text.slice(lastIndex, start);
          if (slice) {
            newChildren.push({
              ...child,
              _key: child._key ? `${child._key}-${segmentIndex++}` : void 0,
              text: slice,
              marks: Array.isArray(child.marks) ? [...child.marks] : []
            });
          }
        }
        const markKey = ensureLinkMarkKey();
        newChildren.push({
          ...child,
          _key: child._key ? `${child._key}-${segmentIndex++}` : void 0,
          text: "Realtime Database",
          marks: [...Array.isArray(child.marks) ? child.marks : [], markKey]
        });
        lastIndex = end;
        localChanged = true;
      }
      if (!localChanged) {
        newChildren.push(child);
        return;
      }
      if (lastIndex < text.length) {
        const tail = text.slice(lastIndex);
        if (tail) {
          newChildren.push({
            ...child,
            _key: child._key ? `${child._key}-${segmentIndex++}` : void 0,
            text: tail,
            marks: Array.isArray(child.marks) ? [...child.marks] : []
          });
        }
      }
      blockChanged = true;
    });
    if (!blockChanged) {
      return block;
    }
    changed = true;
    return {
      ...block,
      children: newChildren,
      markDefs
    };
  });
  return changed ? processed : blocks;
}
function replaceFirebaseDatabaseInValue(value) {
  if (typeof value === "string") {
    return value.replace(FIREBASE_DATABASE_PATTERN, "Realtime Database");
  }
  if (isPortableTextBlocks(value)) {
    return replaceFirebaseDatabaseInPortableBlocks(value);
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    const replaced = value.map(
      (item) => item.replace(FIREBASE_DATABASE_PATTERN, "Realtime Database")
    );
    const changed = replaced.some((item, index) => item !== value[index]);
    return changed ? replaced : value;
  }
  return value;
}
function replaceFirebaseDatabaseMentions(campaign) {
  if (!campaign || typeof campaign !== "object") {
    return campaign;
  }
  const next = { ...campaign };
  next.description = replaceFirebaseDatabaseInValue(next.description);
  next.story = replaceFirebaseDatabaseInValue(next.story);
  next.goals = replaceFirebaseDatabaseInValue(next.goals);
  if (Array.isArray(next.faq)) {
    next.faq = next.faq.map((item) => ({
      ...item,
      question: replaceFirebaseDatabaseInValue(item?.question),
      answer: replaceFirebaseDatabaseInValue(item?.answer)
    }));
  }
  if (Array.isArray(next.updates)) {
    next.updates = next.updates.map((update) => ({
      ...update,
      body: replaceFirebaseDatabaseInValue(update?.body)
    }));
  }
  if (Array.isArray(next.events)) {
    next.events = next.events.map((event) => ({
      ...event,
      description: replaceFirebaseDatabaseInValue(event?.description)
    }));
  }
  if (Array.isArray(next.rewardTiers)) {
    next.rewardTiers = next.rewardTiers.map((tier) => ({
      ...tier,
      description: replaceFirebaseDatabaseInValue(tier?.description)
    }));
  }
  return next;
}
var DEFAULT_DISCOUNT_LABEL = "Complimentary contribution";
function applyDiscountToCents(amountCents, discount) {
  const baseAmount = Math.max(0, Math.round(Number(amountCents) || 0));
  if (!discount || typeof discount !== "object") {
    return baseAmount;
  }
  if (discount.type === "full") {
    return 0;
  }
  const reduction = discount.reduction;
  if (!reduction || typeof reduction !== "object") {
    return baseAmount;
  }
  const reductionType = reduction.type;
  if (reductionType === "percent") {
    const percent = Number(reduction.value);
    if (!Number.isFinite(percent) || percent <= 0) {
      return baseAmount;
    }
    if (percent >= 100) {
      return 0;
    }
    const multiplier = 1 - percent / 100;
    return Math.max(0, Math.round(baseAmount * multiplier));
  }
  if (reductionType === "fixed") {
    const deduction = Math.max(0, Math.round(Number(reduction.value) || 0));
    if (!deduction) {
      return baseAmount;
    }
    return Math.max(0, baseAmount - deduction);
  }
  return baseAmount;
}
var summaryFetcher = async (url) => {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
};
var StatBox = ({ value, label }) => /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { children: [
  /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-3xl font-bold", children: value }),
  /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-gray-600", children: label })
] });
StatBox.propTypes = {
  value: import_prop_types2.default.oneOfType([import_prop_types2.default.string, import_prop_types2.default.number]).isRequired,
  label: import_prop_types2.default.string.isRequired
};
var RewardTierCard = ({ tier, onSelect, busy, selected }) => {
  if (!tier) {
    return null;
  }
  const pieCountLabel = tier.pieCount ? `${tier.pieCount.toLocaleString()} pies` : null;
  const pizzaCountLabel = tier.pizzaCount ? `${tier.pizzaCount.toLocaleString()} pizzas` : null;
  const moneyLabel = tier.amount ? `$${tier.amount.toLocaleString()}` : null;
  const isAvailable = typeof tier.amount === "number" && tier.amount > 0;
  const headline = pieCountLabel ? `${pieCountLabel} - ${tier.title}` : pizzaCountLabel ? `${pizzaCountLabel} - ${tier.title}` : `Pledge ${moneyLabel || "$0"} or more`;
  const handleSelect = () => {
    if (!isAvailable || busy) return;
    if (onSelect) onSelect(tier);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)(
    Card,
    {
      role: isAvailable ? "button" : void 0,
      tabIndex: isAvailable ? 0 : void 0,
      "aria-pressed": selected ? "true" : "false",
      "aria-disabled": !isAvailable || busy ? "true" : "false",
      onClick: handleSelect,
      onKeyDown: (event) => {
        if (!isAvailable || busy) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect();
        }
      },
      className: cn(
        "card transition-colors border-slate-200 hover:border-[var(--color-accent)] focus-within:border-[var(--color-accent)]",
        isAvailable ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]" : "cursor-not-allowed opacity-60",
        selected && "border-[var(--color-accent)] shadow-lg"
      ),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)(CardHeader, { className: "space-y-2 border-none px-5 pt-5 pb-0", children: [
          /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(CardTitle, { className: "text-xl font-semibold text-slate-900", children: headline }),
          !pizzaCountLabel && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-base font-semibold text-[var(--color-accent)]", children: tier.title })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)(CardContent, { className: "space-y-3 px-5 pb-4 pt-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-sm text-slate-600 leading-relaxed", children: tier.description }),
          tier.limit && /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { className: "text-xs font-semibold uppercase tracking-[0.2em] text-slate-500", children: [
            "Limited - ",
            tier.limit,
            " left"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)(CardFooter, { className: "flex items-center gap-3 px-5 pb-5 pt-0 border-none", children: [
          /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
            Button,
            {
              type: "button",
              variant: selected ? "secondary" : "default",
              className: "flex-1",
              disabled: !isAvailable || busy,
              onClick: (event) => {
                event.stopPropagation();
                handleSelect();
              },
              children: selected ? "Reward selected" : isAvailable ? "Select this reward" : "Unavailable online"
            }
          ),
          !isAvailable && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("span", { className: "text-xs text-slate-500", children: "Contact us to claim." })
        ] })
      ]
    }
  );
};
RewardTierCard.propTypes = {
  tier: import_prop_types2.default.shape({
    pizzaCount: import_prop_types2.default.number,
    pieCount: import_prop_types2.default.number,
    amount: import_prop_types2.default.number,
    title: import_prop_types2.default.string,
    description: import_prop_types2.default.string,
    limit: import_prop_types2.default.number
  }),
  onSelect: import_prop_types2.default.func,
  busy: import_prop_types2.default.bool,
  selected: import_prop_types2.default.bool
};
var tierIdentifier = (tier) => (tier?._id || tier?.id || tier?.title || "").toString();
var REWARD_PREFERENCE_OPTIONS = [
  { value: "public pizza party", label: "Public pizza party" },
  { value: "deliver to my home", label: "Deliver to my home" },
  { value: "make live at my home", label: "Make live at my home" },
  { value: "frozen pizza", label: "Frozen pizza" },
  { value: "i'm open or im not sure", label: "I\u2019m open or I\u2019m not sure" }
];
var CAMPAIGN_EXTENSION_DATE_STRING = "2025-12-10T23:59:59-06:00";
var CAMPAIGN_EXTENSION_DEADLINE = (() => {
  const parsed = new Date(CAMPAIGN_EXTENSION_DATE_STRING);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
})();
var CrowdfundingPage = () => {
  const [campaignData, setCampaignData] = (0, import_react47.useState)(null);
  const [activeTab, setActiveTab] = (0, import_react47.useState)("story");
  const [paying, setPaying] = (0, import_react47.useState)(false);
  const [payError, setPayError] = (0, import_react47.useState)("");
  const [funderName, setFunderName] = (0, import_react47.useState)("");
  const [email, setEmail] = (0, import_react47.useState)("");
  const [phone, setPhone] = (0, import_react47.useState)("");
  const [notes, setNotes] = (0, import_react47.useState)("");
  const [squareDiscountCode, setSquareDiscountCode] = (0, import_react47.useState)("");
  const [discountState, setDiscountState] = (0, import_react47.useState)({
    status: "idle",
    code: "",
    discount: null,
    message: ""
  });
  const notify = "none";
  const [showForm, setShowForm] = (0, import_react47.useState)(false);
  const [pizzaQty, setPizzaQty] = (0, import_react47.useState)(1);
  const [checkoutResult, setCheckoutResult] = (0, import_react47.useState)(null);
  const [formNotice, setFormNotice] = (0, import_react47.useState)("");
  const [referralInput, setReferralInput] = (0, import_react47.useState)("");
  const [referralState, setReferralState] = (0, import_react47.useState)({
    status: "idle",
    valid: false,
    participant: null,
    code: ""
  });
  const [selectedTierId, setSelectedTierId] = (0, import_react47.useState)("");
  const [subscribeEmail, setSubscribeEmail] = (0, import_react47.useState)("");
  const [subscribeStatus, setSubscribeStatus] = (0, import_react47.useState)("idle");
  const [subscribeMessage, setSubscribeMessage] = (0, import_react47.useState)("");
  const [rewardPreference, setRewardPreference] = (0, import_react47.useState)(REWARD_PREFERENCE_OPTIONS[0].value);
  const [feedbackRating, setFeedbackRating] = (0, import_react47.useState)(5);
  const [feedbackMessage, setFeedbackMessage] = (0, import_react47.useState)("");
  const [feedbackNotice, setFeedbackNotice] = (0, import_react47.useState)("");
  const [feedbackStatus, setFeedbackStatus] = (0, import_react47.useState)("idle");
  const [feedbackEntries, setFeedbackEntries] = (0, import_react47.useState)([]);
  const [statusData, setStatusData] = (0, import_react47.useState)(null);
  const [heroExtras, setHeroExtras] = (0, import_react47.useState)([]);
  const [heroError, setHeroError] = (0, import_react47.useState)("");
  const [heroLoading, setHeroLoading] = (0, import_react47.useState)(false);
  const [activeHeroIndex, setActiveHeroIndex] = (0, import_react47.useState)(0);
  const [feedbackSubmitting, setFeedbackSubmitting] = (0, import_react47.useState)(false);
  const [feedbackLoading, setFeedbackLoading] = (0, import_react47.useState)(false);
  const [feedbackFetchError, setFeedbackFetchError] = (0, import_react47.useState)("");
  const [realtimeTotals, setRealtimeTotals] = (0, import_react47.useState)(null);
  const [feedbackRealtimeStatus, setFeedbackRealtimeStatus] = (0, import_react47.useState)("idle");
  const [galleryImages, setGalleryImages] = (0, import_react47.useState)([]);
  const [galleryLoading, setGalleryLoading] = (0, import_react47.useState)(false);
  const [galleryError, setGalleryError] = (0, import_react47.useState)("");
  const feedbackFallbackStatusRef = (0, import_react47.useRef)(null);
  const galleryLoadedRef = (0, import_react47.useRef)(false);
  const [eventModal, setEventModal] = (0, import_react47.useState)(null);
  const { data: summaryData, error: summaryError } = useSWR(
    "/api/crowdfunding/summary",
    summaryFetcher,
    {
      refreshInterval: 3e4,
      revalidateOnFocus: true
    }
  );
  const summaryPizzas = Number(summaryData?.pizzas);
  const summaryBackers = Number(summaryData?.backers);
  const summaryGoal = Number(summaryData?.goal);
  const summaryTotalsAvailable = !summaryError && Number.isFinite(summaryPizzas) && summaryPizzas >= 0;
  const summaryBackersAvailable = !summaryError && Number.isFinite(summaryBackers) && summaryBackers >= 0;
  const livePizzas = Number.isFinite(Number(realtimeTotals?.pizzas)) ? Number(realtimeTotals.pizzas) : null;
  const liveBackers = Number.isFinite(Number(realtimeTotals?.backers)) ? Number(realtimeTotals.backers) : null;
  const liveGoal = Number.isFinite(Number(realtimeTotals?.goal)) ? Number(realtimeTotals.goal) : null;
  (0, import_react47.useEffect)(() => {
    if (typeof window === "undefined") {
      return void 0;
    }
    let unsubscribe = null;
    let active = true;
    try {
      const maybeUnsubscribe = watchCrowdfundingTotals({
        onUpdate: (data) => {
          if (!active) return;
          setRealtimeTotals(data);
        },
        onError: (error) => {
          if (!active) return;
          if (error) {
            devConsole_default.warn("[crowdfunding] realtime totals listener error", error);
          }
        }
      });
      if (typeof maybeUnsubscribe === "function") {
        unsubscribe = maybeUnsubscribe;
      } else if (active) {
        devConsole_default.warn("[crowdfunding] realtime totals disabled - missing client configuration?");
      }
    } catch (error) {
      if (active) {
        devConsole_default.warn("[crowdfunding] failed to start realtime totals listener", error);
      }
    }
    return () => {
      active = false;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);
  (0, import_react47.useEffect)(() => {
    if (activeTab === "gallery" && !galleryLoadedRef.current) {
      galleryLoadedRef.current = true;
      setGalleryLoading(true);
      const endpoints = [
        "/api/search-images?query=pizza&per_page=50",
        "/api/search-images?query=pie&per_page=50"
      ];
      Promise.all(
        endpoints.map(async (url) => {
          try {
            const response = await fetch(url, { headers: { Accept: "application/json" } });
            const payload = await response.json().catch(() => ({}));
            const images = Array.isArray(payload?.images) ? payload.images : [];
            return { ok: response.ok, images };
          } catch (error) {
            devConsole_default.warn("[crowdfunding] gallery fetch failed", error);
            return { ok: false, images: [] };
          }
        })
      ).then((results) => {
        const merged = [];
        const seen = /* @__PURE__ */ new Set();
        results.forEach(({ ok, images }) => {
          if (!ok || !images.length) {
            return;
          }
          images.forEach((img) => {
            const id = img?.asset_id || img?.public_id;
            if (!id || seen.has(id)) {
              return;
            }
            seen.add(id);
            merged.push(img);
          });
        });
        if (merged.length === 0) {
          setGalleryError("No images found yet.");
        }
        setGalleryImages(merged);
      }).catch((error) => {
        setGalleryError(error?.message || "Error loading gallery");
      }).finally(() => setGalleryLoading(false));
    }
  }, [activeTab]);
  (0, import_react47.useEffect)(() => {
    if (typeof window === "undefined") {
      return void 0;
    }
    let unsubscribe = null;
    let active = true;
    setFeedbackRealtimeStatus("connecting");
    setFeedbackLoading(true);
    try {
      const maybeUnsubscribe = watchPizzaFeedback({
        limit: 8,
        onUpdate: (entries) => {
          if (!active) return;
          setFeedbackEntries(entries);
          setFeedbackLoading(false);
          setFeedbackFetchError("");
          setFeedbackRealtimeStatus("ready");
        },
        onError: (error) => {
          if (!active) return;
          setFeedbackLoading(false);
          setFeedbackRealtimeStatus("error");
          if (error) {
            devConsole_default.warn("[crowdfunding] realtime pizza feedback listener error", error);
          }
        }
      });
      if (typeof maybeUnsubscribe === "function") {
        unsubscribe = maybeUnsubscribe;
      } else if (active) {
        setFeedbackRealtimeStatus("disabled");
        setFeedbackLoading(false);
        devConsole_default.warn("[crowdfunding] realtime pizza feedback disabled - missing client configuration?");
      }
    } catch (error) {
      if (active) {
        setFeedbackRealtimeStatus("error");
        setFeedbackLoading(false);
        devConsole_default.warn("[crowdfunding] failed to start realtime pizza feedback listener", error);
      }
    }
    return () => {
      active = false;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);
  (0, import_react47.useEffect)(() => {
    if (feedbackRealtimeStatus === "ready") {
      feedbackFallbackStatusRef.current = null;
      return void 0;
    }
    if (!["disabled", "error"].includes(feedbackRealtimeStatus)) {
      return void 0;
    }
    if (feedbackFallbackStatusRef.current === feedbackRealtimeStatus) {
      return void 0;
    }
    feedbackFallbackStatusRef.current = feedbackRealtimeStatus;
    let cancelled = false;
    setFeedbackLoading(true);
    setFeedbackFetchError("");
    const loadFeedback = async () => {
      try {
        const res = await fetch("/api/crowdfund/pizza-feedback?limit=8", {
          headers: { Accept: "application/json" }
        });
        let data = null;
        try {
          data = await res.json();
        } catch (_) {
          data = null;
        }
        if (!res.ok) {
          const message = data && data.error || "Unable to reach the pizza feedback service right now.";
          throw new Error(message);
        }
        const entries = Array.isArray(data?.entries) ? data.entries.map((entry) => {
          const rawRating = Number(entry.rating);
          const normalizedRating = Number.isFinite(rawRating) && rawRating > 0 ? rawRating : null;
          const comment = typeof entry.comment === "string" && entry.comment.trim() ? entry.comment.trim() : typeof entry.message === "string" ? entry.message.trim() : "";
          return {
            id: entry.id || `feedback-${entry.createdAt || Date.now()}`,
            rating: normalizedRating,
            comment
          };
        }).filter((entry) => entry.comment) : [];
        if (!cancelled) {
          setFeedbackEntries(entries);
        }
      } catch (err) {
        if (!cancelled) {
          setFeedbackFetchError(
            err?.message || "Unable to reach the pizza feedback service right now."
          );
        }
      } finally {
        if (!cancelled) {
          setFeedbackLoading(false);
        }
      }
    };
    loadFeedback();
    return () => {
      cancelled = true;
    };
  }, [feedbackRealtimeStatus]);
  const emailValid = (0, import_react47.useMemo)(() => !email || /.+@.+\..+/.test(email), [email]);
  const phoneDigits = (0, import_react47.useMemo)(() => phone.replace(/\D/g, ""), [phone]);
  const phoneValid = (0, import_react47.useMemo)(() => !phone || phoneDigits.length >= 10, [phone, phoneDigits]);
  (0, import_react47.useEffect)(() => {
    const slug = "local-pizza-by-local-effort-let-s-make-1000-pizzas";
    const query3 = `*[_type == "crowdfundingCampaign" && slug.current == $slug][0]{
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
    }`;
    const params = { slug };
    const doFetch = async () => {
      try {
        const data = await sanityClient_default.fetch(query3, params);
        setCampaignData(replaceFirebaseDatabaseMentions(data));
      } catch (err) {
        try {
          const msg = err && err.message ? err.message : String(err);
          devConsole_default.error("Sanity fetch error message:", msg);
          if (err && err.response && typeof err.response.text === "function") {
            const body = await err.response.text();
            devConsole_default.error("Sanity fetch response body:", body);
          }
        } catch (logErr) {
          devConsole_default.error("Error while logging Sanity error:", logErr);
        }
        try {
          const fallback = `*[_type == "crowdfundingCampaign"][0]{
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
          }`;
          const fbData = await sanityClient_default.fetch(fallback);
          if (fbData) {
            devConsole_default.warn("Loaded fallback campaign (first in dataset)");
            setCampaignData(replaceFirebaseDatabaseMentions(fbData));
            return;
          }
        } catch (fbErr) {
          devConsole_default.error("Fallback fetch also failed:", fbErr && (fbErr.message || fbErr));
        }
        devConsole_default.warn("Failed to load campaign data.");
      } finally {
      }
    };
    doFetch();
  }, []);
  const rewardTiers = campaignData?.rewardTiers || [];
  const visibleTiers = (0, import_react47.useMemo)(() => {
    const hasValid = referralState.valid && referralState.code;
    return rewardTiers.filter((t) => {
      if (!t?.referralOnly) return true;
      if (!hasValid) return false;
      if (t.referralCode && typeof t.referralCode === "string") {
        return t.referralCode.trim().toLowerCase() === referralState.code.trim().toLowerCase();
      }
      return true;
    });
  }, [rewardTiers, referralState]);
  const hasPayableTier = (0, import_react47.useMemo)(
    () => visibleTiers.some((t) => typeof t?.amount === "number" && t.amount > 0),
    [visibleTiers]
  );
  const firstPayTier = (0, import_react47.useMemo)(
    () => visibleTiers.find((t) => typeof t?.amount === "number" && t.amount > 0) || null,
    [visibleTiers]
  );
  (0, import_react47.useEffect)(() => {
    if (!selectedTierId) return;
    const exists = visibleTiers.some((tier) => tierIdentifier(tier) === selectedTierId);
    if (!exists) setSelectedTierId("");
  }, [selectedTierId, visibleTiers]);
  const activeTier = (0, import_react47.useMemo)(() => {
    if (selectedTierId) {
      const matched = visibleTiers.find((tier) => tierIdentifier(tier) === selectedTierId);
      if (matched) return matched;
    }
    return firstPayTier;
  }, [selectedTierId, visibleTiers, firstPayTier]);
  const activeTierId = (0, import_react47.useMemo)(() => tierIdentifier(activeTier), [activeTier]);
  const currencyFormatter = (0, import_react47.useMemo)(
    () => new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }),
    []
  );
  const activeTierAmountLabel = (0, import_react47.useMemo)(() => {
    if (!activeTier || typeof activeTier.amount !== "number") return "";
    return currencyFormatter.format(activeTier.amount);
  }, [activeTier, currencyFormatter]);
  const trimmedDiscountCode = (0, import_react47.useMemo)(() => squareDiscountCode.trim(), [squareDiscountCode]);
  const appliedDiscount = (0, import_react47.useMemo)(() => {
    if (!trimmedDiscountCode) return null;
    if (discountState.status !== "applied") return null;
    if (!discountState.code || !discountState.discount) return null;
    if (discountState.code.toLowerCase() !== trimmedDiscountCode.toLowerCase()) return null;
    return discountState.discount;
  }, [trimmedDiscountCode, discountState]);
  const baseCartTotalCents = (0, import_react47.useMemo)(() => {
    if (!activeTier || typeof activeTier.amount !== "number") return 0;
    const totalDollars = activeTier.amount * Math.max(1, pizzaQty);
    return Math.max(0, Math.round(totalDollars * 100));
  }, [activeTier, pizzaQty]);
  const discountedTotalCents = (0, import_react47.useMemo)(
    () => applyDiscountToCents(baseCartTotalCents, appliedDiscount),
    [baseCartTotalCents, appliedDiscount]
  );
  const requiresPayment = discountedTotalCents > 0;
  const discountedTotalLabel = (0, import_react47.useMemo)(() => {
    if (discountedTotalCents <= 0) {
      return "Free";
    }
    return currencyFormatter.format(discountedTotalCents / 100);
  }, [discountedTotalCents, currencyFormatter]);
  (0, import_react47.useEffect)(() => {
    if (showForm && !activeTier) {
      setShowForm(false);
      setFormNotice(
        hasPayableTier ? "That reward is no longer available. Please pick another tier to continue." : "Online checkout is temporarily unavailable. Email hello@localeffortfood.com to pledge."
      );
    }
  }, [showForm, activeTier, hasPayableTier]);
  (0, import_react47.useEffect)(() => {
    if (!showForm && hasPayableTier && activeTier) {
      setFormNotice("");
    }
  }, [showForm, hasPayableTier, activeTier]);
  const handleTierSelect = (tier) => {
    if (!tier || typeof tier.amount !== "number" || tier.amount <= 0) {
      setFormNotice(
        "Online checkout is only available for paid rewards. Please choose another tier."
      );
      return;
    }
    setSelectedTierId(tierIdentifier(tier));
    setFormNotice("");
    setShowForm(true);
  };
  const handleSubscribe = async (event) => {
    event.preventDefault();
    const emailValue = subscribeEmail.trim();
    if (!emailValue) {
      setSubscribeStatus("error");
      setSubscribeMessage("Please enter an email address.");
      return;
    }
    setSubscribeStatus("loading");
    setSubscribeMessage("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailValue })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Subscription failed");
      }
      setSubscribeStatus("success");
      setSubscribeMessage("Thanks! Check your inbox soon.");
      setSubscribeEmail("");
    } catch (err) {
      setSubscribeStatus("error");
      setSubscribeMessage(err.message || "Something went wrong. Please try again.");
    }
  };
  const handleFeedbackSubmit = (0, import_react47.useCallback)(
    async (event) => {
      event.preventDefault();
      if (feedbackSubmitting) return;
      const message = feedbackMessage.trim();
      const ratingValue = Number(feedbackRating);
      if (!message) {
        setFeedbackStatus("error");
        setFeedbackNotice("Please share a quick note about the pizza.");
        return;
      }
      setFeedbackStatus("loading");
      setFeedbackNotice("Saving your note...");
      try {
        const response = await fetch("/api/crowdfund/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, message })
        });
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || "Could not save your note. Please try again.");
        }
        const payload = await response.json().catch(() => ({}));
        const fallbackEntry = {
          id: `feedback-${Date.now()}`,
          name: name || DEFAULT_FEEDBACK_NAME,
          message,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        const entry = normalizeFeedbackEntry(payload.entry) || normalizeFeedbackEntry(fallbackEntry);
        if (entry) {
          setFeedbackEntries((prev) => {
            const withoutDuplicate = entry.id ? prev.filter((item) => item.id !== entry.id) : prev;
            return [entry, ...withoutDuplicate].slice(0, 8);
          });
        }
        setFeedbackName("");
        setFeedbackMessage("");
      } catch (err) {
        setFeedbackStatus("error");
        setFeedbackNotice(err?.message || "Could not save your note. Please try again.");
      }
      if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
        setFeedbackStatus("error");
        setFeedbackNotice("Please choose how much you loved the pizza.");
        return;
      }
      setFeedbackStatus("idle");
      setFeedbackNotice("");
      setFeedbackSubmitting(true);
      try {
        const res = await fetch("/api/crowdfund/pizza-feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ rating: ratingValue, message })
        });
        let data = null;
        try {
          data = await res.json();
        } catch (_) {
          data = null;
        }
        if (!res.ok) {
          const messageText = data && data.error || "We had trouble saving your pizza note. Please try again.";
          throw new Error(messageText);
        }
        const payloadEntry = data?.entry;
        const nextEntry = {
          id: payloadEntry && payloadEntry.id || `feedback-${Date.now()}`,
          rating: Number.isFinite(Number(payloadEntry?.rating)) ? Number(payloadEntry.rating) : ratingValue,
          comment: typeof payloadEntry?.comment === "string" && payloadEntry.comment.trim() ? payloadEntry.comment.trim() : typeof payloadEntry?.message === "string" && payloadEntry.message.trim() ? payloadEntry.message.trim() : message
        };
        setFeedbackEntries((prev) => {
          const safePrev = Array.isArray(prev) ? prev.filter((item) => item && item.id !== nextEntry.id) : [];
          return [nextEntry, ...safePrev].slice(0, 8);
        });
        setFeedbackFetchError("");
        setFeedbackMessage("");
        setFeedbackRating(5);
        setFeedbackStatus("success");
        setFeedbackNotice("Thanks for spreading the pizza love!");
      } catch (err) {
        setFeedbackStatus("error");
        setFeedbackNotice(
          err?.message || "We had trouble saving your pizza note. Please try again."
        );
      } finally {
        setFeedbackSubmitting(false);
      }
    },
    [feedbackMessage, feedbackRating, feedbackSubmitting]
  );
  const {
    title: campaignTitle,
    description,
    faq: faqRaw,
    story: storyRaw,
    backers: backersRaw,
    endDate,
    piesSold: piesSoldRaw
  } = campaignData || {};
  const baseBackers = typeof backersRaw === "number" ? backersRaw : 0;
  const piesSold = typeof piesSoldRaw === "number" ? piesSoldRaw : 0;
  const faq = Array.isArray(faqRaw) ? faqRaw : [];
  const story = Array.isArray(storyRaw) ? storyRaw : [];
  const title = campaignTitle || "Crowdfunding";
  const heroSlides = (0, import_react47.useMemo)(() => {
    const slides = [
      {
        id: "hero-main",
        src: HERO_MAIN_IMAGE,
        alt: title || "Local Effort pizza celebration"
      }
    ];
    heroExtras.forEach((img) => {
      if (!img?.src) return;
      if (img.src === HERO_MAIN_IMAGE) return;
      slides.push({
        id: img.id || img.src,
        src: img.src,
        alt: img.alt || title || "Pizza photo from our community"
      });
    });
    return slides;
  }, [title, heroExtras]);
  const totalHeroSlides = heroSlides.length;
  (0, import_react47.useEffect)(() => {
    if (activeHeroIndex >= totalHeroSlides) {
      setActiveHeroIndex(0);
    }
  }, [activeHeroIndex, totalHeroSlides]);
  const {
    payments,
    loading: paymentsLoading,
    error: paymentsError,
    environment: squareEnvironment,
    sdkUrl: squareSdkUrl,
    appId: squareAppId,
    locationId: squareLocationId,
    isSandbox: squareIsSandbox
  } = useSquarePayments();
  const cardContainerRef = (0, import_react47.useRef)(null);
  const cardInstanceRef = (0, import_react47.useRef)(null);
  const cardInitRef = (0, import_react47.useRef)(false);
  const [cardReady, setCardReady] = (0, import_react47.useState)(false);
  const [cardError, setCardError] = (0, import_react47.useState)("");
  const { notify: notifyToast } = useToast();
  (0, import_react47.useEffect)(() => {
    setDiscountState((prev) => {
      if (!trimmedDiscountCode) {
        if (prev.status === "idle" && !prev.code && !prev.discount && !prev.message) {
          return prev;
        }
        return { status: "idle", code: "", discount: null, message: "" };
      }
      if (!prev.code) {
        return prev;
      }
      if (prev.code.toLowerCase() === trimmedDiscountCode.toLowerCase()) {
        return prev;
      }
      return { status: "idle", code: "", discount: null, message: "" };
    });
  }, [trimmedDiscountCode]);
  const handleDiscountApply = (0, import_react47.useCallback)(async () => {
    if (!trimmedDiscountCode) {
      setDiscountState({ status: "idle", code: "", discount: null, message: "" });
      return;
    }
    setDiscountState({
      status: "checking",
      code: trimmedDiscountCode,
      discount: null,
      message: ""
    });
    try {
      const res = await fetch("/api/crowdfund/discount-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: trimmedDiscountCode })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Unable to validate that discount code.");
      }
      if (!data?.valid) {
        setDiscountState({
          status: "invalid",
          code: trimmedDiscountCode,
          discount: null,
          message: "That code is not valid for this crowdfunding campaign."
        });
        return;
      }
      const discount = data.discount || null;
      setDiscountState({
        status: "applied",
        code: trimmedDiscountCode,
        discount,
        message: data.message || ""
      });
      notifyToast("Discount applied.", { type: "success" });
    } catch (err) {
      setDiscountState({
        status: "error",
        code: trimmedDiscountCode,
        discount: null,
        message: err?.message || "Unable to validate that discount code."
      });
    }
  }, [trimmedDiscountCode, notifyToast]);
  const rememberPendingContribution = (0, import_react47.useCallback)((cartItems, name2, discountCode) => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) return;
    try {
      localStorage.setItem("cf_items", JSON.stringify(cartItems));
      if (name2) {
        localStorage.setItem("cf_name", name2);
      } else {
        localStorage.removeItem("cf_name");
      }
      const trimmedDiscount = typeof discountCode === "string" ? discountCode.trim() : "";
      if (trimmedDiscount) {
        localStorage.setItem("cf_discount", trimmedDiscount);
      } else {
        localStorage.removeItem("cf_discount");
      }
    } catch (err) {
      devConsole_default.warn("[square] [crowdfunding] failed to persist pending contribution", err);
    }
  }, []);
  const clearPendingContribution = (0, import_react47.useCallback)(() => {
    try {
      localStorage.removeItem("cf_items");
      localStorage.removeItem("cf_name");
      localStorage.removeItem("cf_discount");
    } catch (err) {
      devConsole_default.warn("[square] [crowdfunding] failed to clear pending contribution", err);
    }
  }, []);
  const destroyCard = (0, import_react47.useCallback)(() => {
    const card = cardInstanceRef.current;
    if (card) {
      devConsole_default.log("[square] [crowdfunding] destroying card instance");
      cardInstanceRef.current = null;
      try {
        const maybe = card.destroy?.();
        if (maybe && typeof maybe.then === "function") {
          maybe.catch(
            (err) => devConsole_default.warn("[square] [crowdfunding] card destroy warning", err)
          );
          maybe.catch((err) => devConsole_default.warn("[square] [crowdfunding] card destroy warning", err));
        }
      } catch (err) {
        devConsole_default.warn("[square] [crowdfunding] card destroy error", err);
      }
    }
    if (cardContainerRef.current) {
      cardContainerRef.current.innerHTML = "";
    }
    cardInitRef.current = false;
    setCardReady(false);
  }, []);
  const handlePaymentSuccess = (0, import_react47.useCallback)(
    ({
      pizzasPurchased = 0,
      totalCents,
      paymentId,
      newTotal: newTotal2,
      funderName: funderName2,
      viaRedirect = false
    } = {}) => {
      const pizzas = Number.isFinite(pizzasPurchased) ? Math.max(0, Math.round(pizzasPurchased)) : 0;
      const totalLabel = typeof totalCents === "number" ? currencyFormatter.format(Math.max(totalCents, 0) / 100) : null;
      setPayError("");
      setCheckoutResult({
        pizzasPurchased: pizzas,
        totalLabel,
        paymentId: paymentId || null,
        viaRedirect,
        funderName: funderName2 || "",
        timestamp: Date.now()
      });
      setShowForm(false);
      setFormNotice("");
      setPizzaQty(1);
      setSelectedTierId("");
      if (typeof newTotal2 === "number" || pizzas > 0) {
        setCampaignData((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          if (typeof newTotal2 === "number" && Number.isFinite(newTotal2)) {
            next.pizzasSold = newTotal2;
          } else {
            const current = typeof next.pizzasSold === "number" ? next.pizzasSold : 0;
            next.pizzasSold = current + pizzas;
          }
          return next;
        });
      }
      destroyCard();
      notifyToast("Thanks! Your contribution has been processed.", { type: "success" });
    },
    [
      currencyFormatter,
      destroyCard,
      notifyToast,
      setCampaignData,
      setCheckoutResult,
      setFormNotice,
      setPayError,
      setPizzaQty,
      setSelectedTierId,
      setShowForm
    ]
  );
  (0, import_react47.useEffect)(() => {
    if (!showForm) {
      destroyCard();
    }
  }, [showForm, destroyCard]);
  (0, import_react47.useEffect)(() => {
    if (paymentsError) {
      notifyToast(paymentsError, { type: "error" });
    }
  }, [paymentsError, notifyToast]);
  (0, import_react47.useEffect)(() => {
    if (!requiresPayment) {
      destroyCard();
      return;
    }
    if (!payments || !showForm || !activeTier) {
      return;
    }
    const container = cardContainerRef.current;
    if (!container) {
      return;
    }
    if (cardInitRef.current) {
      return;
    }
    let cancelled = false;
    cardInitRef.current = true;
    setCardError("");
    setCardReady(false);
    devConsole_default.log("[square] [crowdfunding] initializing card", {
      tier: activeTier?.title || null,
      amount: activeTier?.amount || null
    });
    payments.card().then((card) => {
      if (!card) {
        throw new Error("Square card component unavailable.");
      }
      if (cancelled) {
        try {
          card.destroy?.();
        } catch (_) {
        }
        return null;
      }
      cardInstanceRef.current = card;
      return card.attach(container);
    }).then((result) => {
      if (cancelled || result === null) {
        return;
      }
      setCardReady(true);
      devConsole_default.log("[square] [crowdfunding] card attached");
    }).catch((err) => {
      if (cancelled) {
        return;
      }
      devConsole_default.error("[square] [crowdfunding] card init failed", err);
      const message = err?.message || "Unable to load the payment form.";
      setCardError(message);
      notifyToast(message, { type: "error" });
      destroyCard();
    });
    return () => {
      cancelled = true;
    };
  }, [payments, showForm, activeTier, requiresPayment, notifyToast, destroyCard]);
  (0, import_react47.useEffect)(() => {
    return () => {
      devConsole_default.log("[square] [crowdfunding] page unmount cleanup");
      destroyCard();
    };
  }, [destroyCard]);
  (0, import_react47.useEffect)(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      (async () => {
        let confirmOk = false;
        try {
          const raw = localStorage.getItem("cf_items");
          const items2 = raw ? JSON.parse(raw) : [];
          const name2 = localStorage.getItem("cf_name") || void 0;
          const discountCode = localStorage.getItem("cf_discount") || void 0;
          if (Array.isArray(items2) && items2.length > 0) {
            const res = await fetch("/api/crowdfund/confirm-payment", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ items: items2, funderName: name2, discountCode })
            });
            if (res.ok) {
              setConfirmMsg("Thanks! Your contribution has been recorded.");
            }
            const pizzasPurchased = items2.filter((item) => item && item.type === "pizza").reduce((sum, item) => {
              const pizzaCount = Number(item?.pizzaCount);
              const quantity = Number(item?.quantity);
              if (Number.isFinite(pizzaCount) && pizzaCount > 0) return sum + pizzaCount;
              if (Number.isFinite(quantity) && quantity > 0) return sum + quantity;
              return sum + 1;
            }, 0);
            const totalCents = items2.reduce((sum, item) => {
              const price = Number(item?.priceCents);
              const quantity = Number(item?.quantity);
              const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
              if (!Number.isFinite(price) || price <= 0) return sum;
              return sum + price * qty;
            }, 0);
            handlePaymentSuccess({
              pizzasPurchased,
              totalCents,
              newTotal,
              funderName: name2,
              viaRedirect: true
            });
            if (!confirmOk) {
              notifyToast(
                "Payment succeeded, but updating our counter failed. We will reconcile shortly.",
                { type: "warning" }
              );
            }
          } else {
            handlePaymentSuccess({ pizzasPurchased: 0, viaRedirect: true });
          }
        } catch (err) {
          console.warn("[crowdfunding] hosted checkout success handling failed", err);
        } finally {
          clearPendingContribution();
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("payment");
            window.history.replaceState({}, document.title, url.toString());
          } catch (_) {
          }
        }
      })();
    }
  }, [clearPendingContribution, handlePaymentSuccess, notifyToast]);
  const tokenizeCard = (0, import_react47.useCallback)(async () => {
    const card = cardInstanceRef.current;
    if (!card) {
      const message = "Payment form is not ready yet.";
      notifyToast(message, { type: "error" });
      throw new Error(message);
    }
    const result = await card.tokenize();
    devConsole_default.log("[square] [crowdfunding] tokenize result", result);
    if (result.status !== "OK" || !result.token) {
      const message = Array.isArray(result.errors) && result.errors[0]?.message || "Unable to verify card details.";
      notifyToast(message, { type: "error" });
      throw new Error(message);
    }
    return result.token;
  }, [notifyToast]);
  const contribute = async (items2) => {
    setPayError("");
    setPaying(true);
    try {
      const normalizedItems = items2.map((raw) => {
        const priceCents = Math.max(0, Math.round(Number(raw.price) || 0));
        const quantity = Math.max(1, Math.round(Number(raw.quantity) || 1));
        return {
          name: raw.name || "Contribution",
          priceCents,
          quantity,
          type: raw.type,
          pizzaCount: raw.pizzaCount
        };
      });
      const checkoutItemsPayload = normalizedItems.map((item) => ({
        name: item.name,
        price: item.priceCents,
        quantity: item.quantity,
        type: item.type,
        pizzaCount: item.pizzaCount
      }));
      const totalCents = normalizedItems.reduce(
        (sum, item) => sum + item.priceCents * item.quantity,
        0
      );
      const trimmedDiscount = trimmedDiscountCode;
      const discountFromState = appliedDiscount;
      const totalAfterLocalDiscount = applyDiscountToCents(totalCents, discountFromState);
      const discountEliminatesPayment = totalAfterLocalDiscount <= 0;
      const finalizeWithoutPayment = async (discountInfo) => {
        const recordRes = await fetch("/api/crowdfund/confirm-payment", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            items: checkoutItemsPayload,
            funderName,
            email: email.trim() || void 0,
            phone: phone.trim() || void 0,
            notes: notes || void 0,
            notify,
            discountCode: trimmedDiscount || void 0
          })
        });
        const recordData = await recordRes.json().catch(() => ({}));
        if (!recordRes.ok) {
          throw new Error(recordData?.error || "Failed to record contribution.");
        }
        const successMessage = discountInfo ? `${discountInfo.label || DEFAULT_DISCOUNT_LABEL}. We've recorded your contribution.` : "Thanks! Your contribution has been recorded.";
        setConfirmMsg(successMessage);
        notifyToast(successMessage, { type: "success" });
        setSquareDiscountCode("");
        setDiscountState({ status: "idle", code: "", discount: null, message: "" });
        clearPendingContribution();
      };
      if (discountEliminatesPayment) {
        await finalizeWithoutPayment(discountFromState);
        return;
      }
      try {
        const linkItems = normalizedItems.map((item) => ({
          name: item.name,
          price: Number((item.priceCents / 100).toFixed(2)),
          quantity: item.quantity,
          type: item.type,
          pizzaCount: item.pizzaCount
        }));
        const linkRes = await fetch("/api/crowdfund/contribute", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            items: linkItems,
            funderName: funderName || void 0,
            discountCode: trimmedDiscount || void 0
          })
        });
        if (linkRes.ok) {
          const linkData = await linkRes.json().catch(() => ({}));
          if (linkData?.comped) {
            await finalizeWithoutPayment(linkData.discount || discountFromState);
            return;
          }
          if (linkData?.url) {
            const itemsForStorage = normalizedItems.map((item) => ({
              name: item.name,
              type: item.type,
              pizzaCount: item.pizzaCount,
              quantity: item.quantity,
              priceCents: item.priceCents
            }));
            rememberPendingContribution(
              itemsForStorage,
              funderName?.trim() || "",
              trimmedDiscount || ""
            );
            notifyToast("Redirecting to secure checkout\u2026", { type: "success" });
            window.location.assign(linkData.url);
            return;
          }
        }
      } catch (linkErr) {
        devConsole_default.warn("[square] [crowdfunding] payment link attempt failed", linkErr);
      }
      let token;
      try {
        token = await tokenizeCard();
      } catch (tokErr) {
        throw new Error(tokErr?.message || "Card not ready");
      }
      const payload = {
        items: checkoutItemsPayload,
        funderName,
        email: email.trim() || void 0,
        phone: phone.trim() || void 0,
        notes: notes || void 0,
        rewardPreference,
        notify,
        token,
        pizzaQty,
        discountCode: trimmedDiscount || void 0
      };
      const res = await fetch("/api/crowdfund/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let msg = data.error || "Checkout failed";
        if (typeof msg === "string" && msg.startsWith("[")) {
          try {
            const parsed = JSON.parse(msg);
            if (Array.isArray(parsed) && parsed[0]?.code) {
              msg = `Square error: ${parsed[0].code}${parsed[0].detail ? " - " + parsed[0].detail : ""}`;
            }
          } catch (_) {
          }
        }
        throw new Error(msg);
      }
      if (data?.comped) {
        await finalizeWithoutPayment(data.discount || discountFromState);
        return;
      }
      setConfirmMsg("Thanks! Your contribution has been processed.");
      setSquareDiscountCode("");
      setDiscountState({ status: "idle", code: "", discount: null, message: "" });
      notifyToast("Payment complete. Thanks for fueling pizza!", { type: "success" });
    } catch (e) {
      setPayError(e?.message || "Payment failed");
      notifyToast(e?.message || "Payment failed", { type: "error" });
    } finally {
      setPaying(false);
    }
  };
  const updates = (0, import_react47.useMemo)(() => {
    if (!Array.isArray(campaignData?.updates)) return [];
    return campaignData.updates.filter((update) => {
      if (!update) return false;
      const hasBodyArray = Array.isArray(update.body) && update.body.some(Boolean);
      return Boolean(update.title) || hasBodyArray || Boolean(update.body);
    }).map((update, index) => {
      const publishedAt = update.publishedAt || null;
      const date = publishedAt ? new Date(publishedAt) : null;
      const timestamp = date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
      const normalized = {
        ...update,
        _id: update._id || `update-${index}`,
        _publishedTimestamp: timestamp
      };
      return normalized;
    }).sort((a, b) => b._publishedTimestamp - a._publishedTimestamp).map(({ _publishedTimestamp, ...rest }) => rest);
  }, [campaignData?.updates]);
  const parseEventDate = (0, import_react47.useCallback)((value) => {
    if (!value) return null;
    const iso = value.includes("T") ? value : `${value}T00:00:00`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }, []);
  const formatUpdateDate = (0, import_react47.useCallback)((value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }, []);
  const normalizeEvents = (0, import_react47.useCallback)(
    (eventsSource, sourceLabel) => {
      const items2 = Array.isArray(eventsSource) ? eventsSource : [];
      if (!items2.length) return [];
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      return items2.filter(Boolean).map((ev, index) => ({
        ...ev,
        _key: ev?._key || ev?._id || `${sourceLabel || "event"}-${index}`
      })).filter((ev) => {
        const start = parseEventDate(ev.startDate);
        if (!start) return false;
        const end = parseEventDate(ev.endDate) || start;
        const boundary = new Date(end);
        boundary.setHours(23, 59, 59, 999);
        return boundary >= today;
      }).sort((a, b) => {
        const aStart = parseEventDate(a.startDate);
        const bStart = parseEventDate(b.startDate);
        if (!aStart && !bStart) return 0;
        if (!aStart) return 1;
        if (!bStart) return -1;
        return aStart - bStart;
      });
    },
    [parseEventDate]
  );
  const campaignEvents = campaignData?.events;
  const campaignFeaturedEvents = campaignData?.featuredPublicEvents;
  const upcomingEvents = (0, import_react47.useMemo)(
    () => normalizeEvents(campaignEvents, "campaign"),
    [campaignEvents, normalizeEvents]
  );
  const featuredPublicEvents = (0, import_react47.useMemo)(
    () => normalizeEvents(campaignFeaturedEvents, "public"),
    [campaignFeaturedEvents, normalizeEvents]
  );
  (0, import_react47.useEffect)(() => {
    if (!eventModal) return;
    const stillExists = upcomingEvents.some(
      (ev) => (ev._key || ev._id) === (eventModal._key || eventModal._id)
    );
    if (!stillExists) {
      setEventModal(null);
    }
  }, [eventModal, upcomingEvents, featuredPublicEvents]);
  const formatListDate = (0, import_react47.useCallback)(
    (event) => {
      const start = parseEventDate(event?.startDate);
      const end = parseEventDate(event?.endDate);
      if (!start) return "";
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const includeYear = start.getFullYear() > currentYear;
      if (end && end.getTime() !== start.getTime()) {
        const opts2 = { month: "short", day: "numeric" };
        if (includeYear) opts2.year = "numeric";
        return `starts ${new Intl.DateTimeFormat("en-US", opts2).format(start)}`;
      }
      const opts = { weekday: "short", month: "short", day: "numeric" };
      if (includeYear) opts.year = "numeric";
      return new Intl.DateTimeFormat("en-US", opts).format(start);
    },
    [parseEventDate]
  );
  const formatModalDate = (0, import_react47.useCallback)(
    (event) => {
      const start = parseEventDate(event?.startDate);
      const end = parseEventDate(event?.endDate);
      if (!start) return "";
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const baseOptions = { weekday: "short", month: "short", day: "numeric" };
      const includeYearStart = start.getFullYear() > currentYear || end && end.getFullYear() !== start.getFullYear();
      const startLabel = new Intl.DateTimeFormat(
        "en-US",
        includeYearStart ? { ...baseOptions, year: "numeric" } : baseOptions
      ).format(start);
      if (end && end.getTime() !== start.getTime()) {
        const includeYearEnd = end.getFullYear() > currentYear || end.getFullYear() !== start.getFullYear();
        const endLabel = new Intl.DateTimeFormat(
          "en-US",
          includeYearEnd ? { ...baseOptions, year: "numeric" } : baseOptions
        ).format(end);
        return `${startLabel} - ${endLabel}`;
      }
      return startLabel;
    },
    [parseEventDate]
  );
  const hasCampaignEvents = upcomingEvents.length > 0;
  const hasFeaturedPublicEvents = featuredPublicEvents.length > 0;
  const statusPizzasSold = Number.isFinite(statusData?.pizzasSold) ? statusData.pizzasSold : null;
  const statusPizzaGoal = Number.isFinite(statusData?.goal) ? statusData.goal : null;
  const pizzasSold = (statusPizzasSold ?? campaignData?.pizzasSold ?? campaignData?.raisedAmount ?? 0) || 0;
  const pizzaGoal = (statusPizzaGoal ?? campaignData?.pizzaGoal ?? campaignData?.goal ?? 1e3) || 1e3;
  return /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)(import_jsx_runtime50.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-16", children: [
      /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("div", { className: "mx-auto w-full max-w-5xl px-4 py-10 lg:px-8", children: /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "grid gap-8 lg:grid-cols-[2fr_1fr] lg:items-start", children: [
        /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-6", children: [
          payError && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-sm text-red-600", children: payError }),
          !showForm && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
            Button,
            {
              type: "button",
              onClick: () => {
                if (checkoutResult) {
                  setCheckoutResult(null);
                  setPayError("");
                }
                if (!activeTier) {
                  setFormNotice("Reward tiers are loading. Please try again in a moment.");
                  return;
                }
                setSelectedTierId(tierIdentifier(activeTier));
                setFormNotice("");
                setShowForm(true);
              },
              className: "w-full text-lg h-12",
              disabled: !hasPayableTier || paying,
              children: checkoutResult ? "Make another pledge" : "I want pizza"
            }
          ),
          (formNotice || !hasPayableTier && !showForm) && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-sm text-slate-600", children: formNotice || "Online checkout is temporarily unavailable. Email hello@localeffortfood.com to pledge." }),
          showForm && activeTier && /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)(
            "form",
            {
              className: "space-y-6",
              onSubmit: (event) => {
                event.preventDefault();
                if (!activeTier || typeof activeTier.amount !== "number") return;
                contribute([
                  {
                    name: activeTier.title || "Pizza",
                    price: Math.round(activeTier.amount * 100),
                    type: "pizza",
                    pizzaCount: pizzaQty,
                    quantity: pizzaQty
                  }
                ]);
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "grid grid-cols-1 gap-4", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-2", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(Label, { htmlFor: "cf-name", children: "Name" }),
                    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                      Input,
                      {
                        id: "cf-name",
                        placeholder: "Name",
                        autoComplete: "name",
                        value: funderName,
                        onChange: (e) => setFunderName(e.target.value)
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-2", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(Label, { htmlFor: "cf-email", children: "Email" }),
                    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                      Input,
                      {
                        id: "cf-email",
                        type: "email",
                        autoComplete: "email",
                        placeholder: "you@example.com",
                        value: email,
                        onChange: (e) => setEmail(e.target.value)
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-2", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(Label, { htmlFor: "cf-phone", children: "Phone" }),
                    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                      Input,
                      {
                        id: "cf-phone",
                        type: "tel",
                        inputMode: "tel",
                        autoComplete: "tel",
                        placeholder: "(555) 555-1234",
                        value: phone,
                        onChange: (e) => setPhone(e.target.value)
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(Label, { htmlFor: "cf-referral", children: "Referral code (optional)" }),
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "flex flex-col gap-2 sm:flex-row", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                      Input,
                      {
                        id: "cf-referral",
                        placeholder: "Referral code",
                        value: referralInput,
                        onChange: (e) => setReferralInput(e.target.value),
                        className: "sm:flex-1"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                      Button,
                      {
                        type: "button",
                        variant: "outline",
                        className: "sm:w-32",
                        disabled: !referralInput || referralState.status === "checking",
                        onClick: async () => {
                          const code = (referralInput || "").trim();
                          if (!code) return;
                          setReferralState({
                            status: "checking",
                            valid: false,
                            participant: null,
                            code
                          });
                          try {
                            const resp = await fetch("/api/referrals/validate", {
                              method: "POST",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({ code })
                            });
                            const data = await resp.json().catch(() => ({}));
                            if (resp.ok && data && data.valid) {
                              setReferralState({
                                status: "ok",
                                valid: true,
                                participant: data.participant || null,
                                code
                              });
                            } else {
                              setReferralState({
                                status: "ok",
                                valid: false,
                                participant: null,
                                code
                              });
                            }
                          } catch (_) {
                            setReferralState({
                              status: "error",
                              valid: false,
                              participant: null,
                              code
                            });
                          }
                        },
                        children: referralState.status === "checking" ? "Checking..." : "Apply"
                      }
                    )
                  ] })
                ] }),
                referralState.status === "ok" && referralState.valid && /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { className: "text-sm text-emerald-700", children: [
                  "Code applied",
                  referralState.participant?.name ? ` for ${referralState.participant.name}` : "",
                  "."
                ] }),
                referralState.status === "ok" && !referralState.valid && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-sm text-red-600", children: "That code is not valid." }),
                referralState.status === "error" && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-sm text-red-600", children: "Unable to validate that code right now." }),
                /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(Label, { htmlFor: "cf-square-discount", children: "Square discount code (optional)" }),
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "flex flex-col gap-2 sm:flex-row", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                      Input,
                      {
                        id: "cf-square-discount",
                        placeholder: "Discount code",
                        autoComplete: "off",
                        value: squareDiscountCode,
                        onChange: (e) => setSquareDiscountCode(e.target.value),
                        className: "sm:flex-1"
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                      Button,
                      {
                        type: "button",
                        variant: "outline",
                        className: "sm:w-32",
                        disabled: !trimmedDiscountCode || discountState.status === "checking",
                        onClick: handleDiscountApply,
                        children: discountState.status === "checking" ? "Checking\u2026" : "Apply"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-xs text-slate-500", children: "Apply a complimentary or promo code before checking out." }),
                  discountState.status === "applied" && /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { className: "text-sm text-emerald-700", children: [
                    discountState.discount?.label || DEFAULT_DISCOUNT_LABEL,
                    discountedTotalCents <= 0 ? " \u2014 no payment required." : " applied."
                  ] }),
                  discountState.status === "invalid" && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-sm text-red-600", children: discountState.message || "That code is not valid for this crowdfunding campaign." }),
                  discountState.status === "error" && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-sm text-red-600", children: discountState.message || "Unable to validate that discount code right now." }),
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                    Input,
                    {
                      id: "cf-square-discount",
                      placeholder: "Discount code",
                      autoComplete: "off",
                      value: squareDiscountCode,
                      onChange: (e) => setSquareDiscountCode(e.target.value)
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-xs text-slate-500", children: "We'll include this code with your secure Square checkout." })
                ] }),
                activeTier && /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-end", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-2", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(Label, { htmlFor: "pizza-qty", children: "Quantity" }),
                    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                      Input,
                      {
                        id: "pizza-qty",
                        type: "number",
                        min: 1,
                        max: 50,
                        value: pizzaQty,
                        onChange: (e) => setPizzaQty(Math.max(1, Math.min(50, Number(e.target.value) || 1))),
                        className: "w-28"
                      }
                    )
                  ] }),
                  activeTierAmountLabel && /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { className: "text-sm text-slate-600 sm:pb-2", children: [
                    "Each pledge: ",
                    activeTierAmountLabel
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(Label, { htmlFor: "cf-notes", children: "Notes (optional)" }),
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                    Textarea,
                    {
                      id: "cf-notes",
                      placeholder: "Any notes for us",
                      value: notes,
                      onChange: (e) => setNotes(e.target.value),
                      className: "min-h-[100px]"
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("span", { className: "text-sm font-semibold text-slate-700", children: "Preferred reward setting" }),
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                    "fieldset",
                    {
                      className: "grid gap-2 sm:grid-cols-2",
                      role: "group",
                      "aria-label": "Preferred reward setting",
                      children: REWARD_PREFERENCE_OPTIONS.map((option) => /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)(
                        "label",
                        {
                          className: cn(
                            "flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors",
                            rewardPreference === option.value ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]" : "hover:border-[var(--color-accent)]"
                          ),
                          children: [
                            /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                              "input",
                              {
                                type: "radio",
                                name: "rewardPreference",
                                value: option.value,
                                checked: rewardPreference === option.value,
                                onChange: (event) => setRewardPreference(event.target.value),
                                className: "h-4 w-4 border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                              }
                            ),
                            /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("span", { className: "text-slate-700", children: option.label })
                          ]
                        },
                        option.value
                      ))
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(Label, { htmlFor: "cf-card-container", children: "Payment details" }),
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                    "div",
                    {
                      id: "cf-card-container",
                      ref: cardContainerRef,
                      className: cn(
                        "border rounded-md p-4 min-h-[88px]",
                        requiresPayment ? "bg-white" : "border-dashed bg-slate-50 flex items-center"
                      ),
                      "aria-label": "Card payment form",
                      children: requiresPayment ? /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)(import_jsx_runtime50.Fragment, { children: [
                        !cardReady && !cardError && !paymentsError && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-sm text-gray-500", children: paymentsLoading ? "Loading secure payment form\u2026" : "Preparing secure payment form\u2026" }),
                        (cardError || paymentsError) && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-sm text-red-600", children: cardError || paymentsError })
                      ] }) : /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-sm text-slate-600", children: "No payment required for this contribution." })
                    }
                  )
                ] }),
                email && !emailValid && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-xs text-red-600", children: "Please enter a valid email." }),
                phone && !phoneValid && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-xs text-red-600", children: "Phone should have at least 10 digits." }),
                /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                  Button,
                  {
                    type: "submit",
                    disabled: !activeTier || paying || requiresPayment && (!cardReady || !!cardError || !!paymentsError) || !emailValid || !phoneValid,
                    className: "w-full text-lg h-12",
                    children: paying ? "Processing..." : requiresPayment ? `Buy ${discountedTotalLabel}` : "Complete contribution"
                  }
                )
              ]
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("h3", { className: "text-lg font-semibold text-slate-900", children: "How it works" }),
            /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("ol", { className: "space-y-3 text-sm text-slate-700", children: [
              /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("li", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("span", { className: "font-semibold text-slate-900", children: "1." }),
                " ",
                "Order a pizza, or 5 pizzas, or 10 pizzas, or 100 pizzas. Add on a pie or 2."
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("li", { className: "space-y-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("span", { className: "font-semibold text-slate-900", children: "2." }),
                  " ",
                  "Select your pickup style."
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "pl-5 space-y-2", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("span", { className: "font-semibold text-slate-900", children: "2a." }),
                    " ",
                    "Look at the list of pickup events. Each event will have its own menu. You can claim your pizzas at one of these events, or\u2026"
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("span", { className: "font-semibold text-slate-900", children: "2b." }),
                    " ",
                    "You can have the pizzas delivered to your home. You can even have the pizzas made at your home or office: the chef, the oven, the dough, the whole thing. Minimum 5 pizzas for delivery and 15 for in-home parties."
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("li", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("span", { className: "font-semibold text-slate-900", children: "3." }),
                " ",
                "Tell your friends about Local Pizza, the pizza made entirely from Midwestern produced ingredients."
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)(Card, { className: "border-0 bg-slate-900 text-white shadow-xl", children: [
            /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)(CardHeader, { className: "px-5 py-4 space-y-1 border-none", children: [
              /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(CardTitle, { className: "text-lg font-semibold tracking-wide uppercase text-amber-300", children: "Follow along as we raise" }),
              /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(CardDescription, { className: "text-sm text-slate-200", children: "Get pizza updates, milestones, and openings first." })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(CardContent, { className: "px-5 py-4", children: /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("form", { className: "space-y-4", onSubmit: handleSubscribe, children: [
              /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                  Label,
                  {
                    htmlFor: "cf-subscribe-email",
                    className: "text-sm font-medium text-white",
                    children: "Email address"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                  Input,
                  {
                    id: "cf-subscribe-email",
                    type: "email",
                    autoComplete: "email",
                    placeholder: "you@example.com",
                    value: subscribeEmail,
                    onChange: (event) => setSubscribeEmail(event.target.value),
                    disabled: subscribeStatus === "loading",
                    className: "border-slate-700 bg-slate-800 text-white placeholder:text-slate-400"
                  }
                )
              ] }),
              subscribeMessage && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                "p",
                {
                  className: subscribeStatus === "success" ? "text-sm text-emerald-300" : "text-sm text-red-300",
                  children: subscribeMessage
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                Button,
                {
                  type: "submit",
                  className: "w-full bg-amber-400 text-slate-900 hover:bg-amber-300",
                  disabled: subscribeStatus === "loading",
                  children: subscribeStatus === "loading" ? "Subscribing\u2026" : "Subscribe"
                }
              )
            ] }) })
          ] }),
          (import_meta10?.env?.MODE || "production") !== "production" && /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "mt-4 p-4 border rounded text-xs space-y-1 bg-gray-50", children: [
            /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "font-semibold", children: "Square Diagnostics" }),
            /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { children: [
              "SDK URL: ",
              squareSdkUrl
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { children: [
              "Environment: ",
              squareEnvironment || "unknown"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { children: [
              "App ID present: ",
              squareAppId ? "yes" : "no"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { children: [
              "Location ID present: ",
              squareLocationId ? "yes" : "no"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { children: [
              "Sandbox mode: ",
              squareIsSandbox ? "true" : "false"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { children: [
              "Payments ready: ",
              payments ? "true" : "false",
              " | Loading:",
              " ",
              paymentsLoading ? "true" : "false"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { children: [
              "Card ready: ",
              cardReady ? "true" : "false"
            ] }),
            cardError && /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { className: "text-red-600", children: [
              "Card error: ",
              cardError
            ] }),
            paymentsError && /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { className: "text-red-600", children: [
              "Payments error: ",
              paymentsError
            ] })
          ] }),
          rewardTiers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
            SectionHeader,
            {
              overline: "Rewards",
              title: "Ways to eat",
              className: "pt-2"
            }
          ),
          rewardTiers.map((tier) => {
            const tierId = tierIdentifier(tier);
            return /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
              RewardTierCard,
              {
                tier,
                busy: paying,
                onSelect: handleTierSelect,
                selected: tierId === activeTierId
              },
              tierId || tier?.title || tier?.amount || Math.random()
            );
          })
        ] })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("section", { className: "rounded-3xl border border-slate-200 bg-white p-6 md:p-10 shadow-sm", children: /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "mx-auto flex max-w-4xl flex-col gap-10 md:flex-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "md:w-1/2 space-y-6", children: [
          /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(SectionHeader, { overline: "Share the pizza love", title: "Pizza feedback" }),
          /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-base text-slate-600", children: "Leave a quick note about what you enjoy most. Your kind words help us keep the pizza party going for our neighbors." }),
          /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("form", { className: "space-y-4", onSubmit: handleFeedbackSubmit, children: [
            /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(Label, { htmlFor: "pizza-feedback-rating", children: "How was your pizza?" }),
              /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                "select",
                {
                  id: "pizza-feedback-rating",
                  value: feedbackRating,
                  onChange: (event) => {
                    setFeedbackRating(Number(event.target.value));
                    if (feedbackStatus !== "idle") {
                      setFeedbackStatus("idle");
                      setFeedbackNotice("");
                    }
                  },
                  className: "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400",
                  children: [5, 4, 3, 2, 1].map((value) => /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("option", { value, children: `${value} / 5` }, value))
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-xs text-slate-500", children: "5 = legendary pizza party, 1 = needs another try." })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "space-y-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(Label, { htmlFor: "pizza-feedback-message", children: "What made your pizza special?" }),
              /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
                Textarea,
                {
                  id: "pizza-feedback-message",
                  value: feedbackMessage,
                  onChange: (event) => {
                    setFeedbackMessage(event.target.value);
                    if (feedbackStatus !== "idle") {
                      setFeedbackStatus("idle");
                      setFeedbackNotice("");
                    }
                  },
                  placeholder: "The wood-fired char and fresh basil blew me away!",
                  className: "min-h-[120px]"
                }
              )
            ] }),
            feedbackNotice && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
              "p",
              {
                className: feedbackStatus === "error" ? "text-sm text-red-600" : "text-sm text-emerald-600",
                "aria-live": "polite",
                children: feedbackNotice
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
              Button,
              {
                type: "submit",
                className: "w-full sm:w-auto",
                disabled: feedbackStatus === "loading",
                children: feedbackStatus === "loading" ? "Saving..." : "Share feedback"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "md:w-1/2 space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("h3", { className: "text-lg font-semibold text-slate-900", children: "Recent happy pizza thoughts" }),
          feedbackLoading ? /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-sm text-slate-500", children: "Loading pizza love\u2026" }) : feedbackEntries.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("ul", { className: "space-y-4", children: feedbackEntries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)(
            "li",
            {
              className: "rounded-2xl border border-amber-100 bg-amber-50/70 p-4 shadow-sm",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("p", { className: "text-sm text-amber-900", children: [
                  "\u201C",
                  entry.comment,
                  "\u201D"
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "mt-2 text-xs font-semibold uppercase tracking-wide text-amber-700", children: Number.isFinite(entry.rating) ? `Rating: ${"\u2B50\uFE0F".repeat(Math.max(1, Math.min(5, entry.rating)))} (${entry.rating}/5)` : "Rating: shared anonymously" })
              ]
            },
            entry.id
          )) }) : /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-sm text-slate-500", children: feedbackFetchError ? "We couldn\u2019t load recent pizza notes. Share yours to kick things off!" : "No pizza notes yet\u2014be the first to share your experience!" }),
          feedbackFetchError && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-xs text-red-600", children: feedbackFetchError })
        ] })
      ] }) })
    ] }),
    eventModal && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("div", { className: "fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4", children: /* @__PURE__ */ (0, import_jsx_runtime50.jsxs)("div", { className: "bg-white rounded-lg shadow-xl max-w-lg w-full p-5 relative", children: [
      /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
        "button",
        {
          type: "button",
          className: "absolute right-3 top-3 text-sm underline",
          onClick: () => setEventModal(null),
          children: "Close"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("h4", { className: "text-xl font-bold mb-1", children: eventModal.location }),
      /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("p", { className: "text-sm text-gray-600 mb-3", children: formatModalDate(eventModal) }),
      eventModal.description && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)("div", { className: "prose max-w-none", children: /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(import_react48.PortableText, { value: eventModal.description, components: portableComponents }) }),
      eventModal.ticketsUrl && /* @__PURE__ */ (0, import_jsx_runtime50.jsx)(
        "a",
        {
          className: "btn btn-primary mt-4 inline-block",
          href: eventModal.ticketsUrl,
          target: "_blank",
          rel: "noreferrer",
          children: "Get tickets"
        }
      )
    ] }) })
  ] });
};
var CrowdfundingPage_default = CrowdfundingPage;

// src/ssr/StaticApp.jsx
var import_jsx_runtime51 = require("react/jsx-runtime");
function StaticApp({ helmetContext }) {
  return /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(import_react_helmet_async13.HelmetProvider, { context: helmetContext, children: /* @__PURE__ */ (0, import_jsx_runtime51.jsxs)("div", { className: "app-root min-h-screen flex flex-col", children: [
    /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(Header, {}),
    /* @__PURE__ */ (0, import_jsx_runtime51.jsx)("main", { className: "flex-1", children: /* @__PURE__ */ (0, import_jsx_runtime51.jsxs)(import_react_router_dom7.Routes, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(import_react_router_dom7.Route, { path: "/", element: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(HomePage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(import_react_router_dom7.Route, { path: "/about", element: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(AboutUsPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(import_react_router_dom7.Route, { path: "/services", element: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(ServicesPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(import_react_router_dom7.Route, { path: "/pricing", element: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(PricingPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(import_react_router_dom7.Route, { path: "/menu", element: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(MenuPage, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(import_react_router_dom7.Route, { path: "/happy-monday", element: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(HappyMondayPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(import_react_router_dom7.Route, { path: "/gallery", element: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(GalleryPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(import_react_router_dom7.Route, { path: "/events", element: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(EventsPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(import_react_router_dom7.Route, { path: "/meal-prep", element: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(MealPrepPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(import_react_router_dom7.Route, { path: "/partner-portal", element: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(PartnerPortalPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(import_react_router_dom7.Route, { path: "/crowdfunding", element: /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(CrowdfundingPage_default, {}) })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime51.jsx)(Footer, {})
  ] }) });
}
/*! Bundled license information:

use-sync-external-store/cjs/use-sync-external-store-shim.production.js:
  (**
   * @license React
   * use-sync-external-store-shim.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
