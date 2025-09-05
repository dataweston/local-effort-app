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

// node_modules/prop-types/lib/ReactPropTypesSecret.js
var require_ReactPropTypesSecret = __commonJS({
  "node_modules/prop-types/lib/ReactPropTypesSecret.js"(exports2, module2) {
    "use strict";
    var ReactPropTypesSecret = "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";
    module2.exports = ReactPropTypesSecret;
  }
});

// node_modules/prop-types/factoryWithThrowingShims.js
var require_factoryWithThrowingShims = __commonJS({
  "node_modules/prop-types/factoryWithThrowingShims.js"(exports2, module2) {
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

// node_modules/prop-types/index.js
var require_prop_types = __commonJS({
  "node_modules/prop-types/index.js"(exports2, module2) {
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

// node_modules/react-fast-compare/index.js
var require_react_fast_compare = __commonJS({
  "node_modules/react-fast-compare/index.js"(exports2, module2) {
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

// node_modules/invariant/invariant.js
var require_invariant = __commonJS({
  "node_modules/invariant/invariant.js"(exports2, module2) {
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

// node_modules/shallowequal/index.js
var require_shallowequal = __commonJS({
  "node_modules/shallowequal/index.js"(exports2, module2) {
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

// node_modules/react-helmet-async/lib/index.js
var require_lib = __commonJS({
  "node_modules/react-helmet-async/lib/index.js"(exports2) {
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
    var X = ["children"];
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
        var t3 = this.props, e3 = t3.children, r3 = h(t3, X), n2 = f({}, r3), i2 = r3.helmetData;
        return e3 && (n2 = this.mapChildrenToProps(e3, n2)), !i2 || i2 instanceof Y || (i2 = new Y(i2.context, i2.instances)), i2 ? /* @__PURE__ */ o.default.createElement(Q, f({}, n2, { context: i2.value, helmetData: void 0 })) : /* @__PURE__ */ o.default.createElement(B.Consumer, null, function(t4) {
          return o.default.createElement(Q, f({}, n2, { context: t4 }));
        });
      }, e2;
    }(t.Component);
    Z.propTypes = { base: u.default.object, bodyAttributes: u.default.object, children: u.default.oneOfType([u.default.arrayOf(u.default.node), u.default.node]), defaultTitle: u.default.string, defer: u.default.bool, encodeSpecialCharacters: u.default.bool, htmlAttributes: u.default.object, link: u.default.arrayOf(u.default.object), meta: u.default.arrayOf(u.default.object), noscript: u.default.arrayOf(u.default.object), onChangeClientState: u.default.func, script: u.default.arrayOf(u.default.object), style: u.default.arrayOf(u.default.object), title: u.default.string, titleAttributes: u.default.object, titleTemplate: u.default.string, prioritizeSeoTags: u.default.bool, helmetData: u.default.object }, Z.defaultProps = { defer: true, encodeSpecialCharacters: true, prioritizeSeoTags: false }, Z.displayName = "Helmet", exports2.Helmet = Z, exports2.HelmetData = Y, exports2.HelmetProvider = z;
  }
});

// src/components/menu/FoodItemModal.jsx
var FoodItemModal_exports = {};
__export(FoodItemModal_exports, {
  default: () => FoodItemModal_default
});
var import_react20, import_framer_motion7, import_jsx_runtime16, backdrop, modal, FoodItemModal, FoodItemModal_default;
var init_FoodItemModal = __esm({
  "src/components/menu/FoodItemModal.jsx"() {
    import_react20 = __toESM(require("react"));
    import_framer_motion7 = require("framer-motion");
    import_jsx_runtime16 = require("react/jsx-runtime");
    backdrop = {
      visible: { opacity: 1 },
      hidden: { opacity: 0 }
    };
    modal = {
      hidden: { y: "-50px", opacity: 0 },
      visible: { y: "0", opacity: 1, transition: { delay: 0.1 } }
    };
    FoodItemModal = ({ item, onClose }) => {
      return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
        import_framer_motion7.motion.div,
        {
          className: "fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4",
          variants: backdrop,
          initial: "hidden",
          animate: "visible",
          exit: "hidden",
          onClick: onClose,
          children: /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
            import_framer_motion7.motion.div,
            {
              variants: modal,
              className: "bg-white rounded-lg shadow-xl max-w-lg w-full p-8 relative",
              onClick: (e) => e.stopPropagation(),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                  "button",
                  {
                    onClick: onClose,
                    className: "absolute top-4 right-4 text-neutral-500 hover:text-neutral-800 text-2xl",
                    children: "\xD7"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("h3", { className: "text-3xl font-bold mb-4", children: item.name }),
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("p", { className: "text-body mb-6", children: item.description }),
                /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("h4", { className: "font-bold text-lg mb-2", children: "Ingredients:" }),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("ul", { className: "list-disc list-inside text-neutral-600 space-y-1", children: item.ingredients.map((ingredient, index) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("li", { children: ingredient }, index)) })
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
var import_app, import_firestore, import_auth, import_meta5, env2, firebaseConfig, app, db, auth, googleProvider, signInWithGoogle, signOutUser;
var init_firebaseConfig = __esm({
  "src/firebaseConfig.js"() {
    import_app = require("firebase/app");
    import_firestore = require("firebase/firestore");
    import_auth = require("firebase/auth");
    import_meta5 = {};
    env2 = (typeof import_meta5 !== "undefined" ? import_meta5.env : {}) || {};
    firebaseConfig = {
      apiKey: env2.VITE_API_KEY || env2.VITE_FIREBASE_API_KEY || env2.REACT_APP_API_KEY,
      authDomain: env2.VITE_AUTH_DOMAIN || env2.VITE_FIREBASE_AUTH_DOMAIN || env2.REACT_APP_AUTH_DOMAIN,
      projectId: env2.VITE_PROJECT_ID || env2.VITE_FIREBASE_PROJECT_ID || env2.REACT_APP_PROJECT_ID,
      storageBucket: env2.VITE_STORAGE_BUCKET || env2.VITE_FIREBASE_STORAGE_BUCKET || env2.REACT_APP_STORAGE_BUCKET,
      messagingSenderId: env2.VITE_MESSAGING_SENDER_ID || env2.VITE_FIREBASE_MESSAGING_SENDER_ID || env2.REACT_APP_MESSAGING_SENDER_ID,
      appId: env2.VITE_APP_ID || env2.VITE_FIREBASE_APP_ID || env2.REACT_APP_APP_ID
    };
    app = null;
    try {
      if (firebaseConfig.apiKey) {
        app = (0, import_app.initializeApp)(firebaseConfig);
      } else {
        console.warn("Firebase config missing \u2014 auth/comments disabled on client.");
      }
    } catch (e) {
      console.warn("Failed to initialize Firebase app:", e && (e.message || e));
    }
    db = app ? (0, import_firestore.getFirestore)(app) : null;
    auth = app ? (0, import_auth.getAuth)(app) : null;
    googleProvider = app ? new import_auth.GoogleAuthProvider() : null;
    signInWithGoogle = () => {
      if (!auth || !googleProvider) return Promise.reject(new Error("Auth not configured"));
      return (0, import_auth.signInWithPopup)(auth, googleProvider);
    };
    signOutUser = () => {
      if (!auth) return Promise.resolve();
      return (0, import_auth.signOut)(auth);
    };
  }
});

// src/components/menu/FeedbackForm.jsx
var FeedbackForm_exports = {};
__export(FeedbackForm_exports, {
  default: () => FeedbackForm_default
});
var import_react21, import_framer_motion8, import_firestore2, import_jsx_runtime17, FeedbackForm, FeedbackForm_default;
var init_FeedbackForm = __esm({
  "src/components/menu/FeedbackForm.jsx"() {
    import_react21 = __toESM(require("react"));
    import_framer_motion8 = require("framer-motion");
    import_firestore2 = require("firebase/firestore");
    init_firebaseConfig();
    import_jsx_runtime17 = require("react/jsx-runtime");
    FeedbackForm = () => {
      const [formData, setFormData] = (0, import_react21.useState)({
        name: "",
        email: "",
        phone: "",
        category: "requests",
        message: ""
      });
      const [status, setStatus] = (0, import_react21.useState)({ type: "", message: "" });
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
        setStatus({ type: "loading", message: "Submitting..." });
        try {
          await (0, import_firestore2.addDoc)((0, import_firestore2.collection)(db, "feedback"), {
            ...formData,
            submittedAt: (0, import_firestore2.serverTimestamp)()
          });
          setStatus({ type: "success", message: "Thank you! Your feedback has been sent." });
          setFormData({ name: "", email: "", phone: "", category: "requests", message: "" });
        } catch (error) {
          console.error("Error adding document: ", error);
          setStatus({ type: "error", message: "Something went wrong. Please try again." });
        }
      };
      return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "max-w-2xl bg-neutral-50 border border-neutral-200 p-8 rounded-lg", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "grid sm:grid-cols-2 gap-6", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("label", { htmlFor: "category", className: "block text-sm font-medium text-neutral-700", children: "Category" }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
            "select",
            {
              id: "category",
              name: "category",
              value: formData.category,
              onChange: handleChange,
              className: "mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("option", { value: "requests", children: "Requests" }),
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("option", { value: "quality", children: "Quality Feedback" }),
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("option", { value: "other", children: "Other" })
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("label", { htmlFor: "message", className: "block text-sm font-medium text-neutral-700", children: "Message" }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "grid sm:grid-cols-2 gap-6", children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("label", { htmlFor: "name", className: "block text-sm font-medium text-neutral-700", children: "Name (Optional)" }),
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("label", { htmlFor: "email", className: "block text-sm font-medium text-neutral-700", children: "Email (Optional)" }),
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
          status.message && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
var import_react22, import_framer_motion9, import_jsx_runtime18, LoadingSpinner;
var init_LoadingSpinner = __esm({
  "src/components/layout/LoadingSpinner.jsx"() {
    import_react22 = __toESM(require("react"));
    import_framer_motion9 = require("framer-motion");
    import_jsx_runtime18 = require("react/jsx-runtime");
    LoadingSpinner = () => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      import_framer_motion9.motion.div,
      {
        className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        children: /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "text-center", children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            import_framer_motion9.motion.div,
            {
              className: "w-16 h-16 mx-auto mb-4 border-4 border-orange-200 border-t-orange-500 rounded-full",
              animate: { rotate: 360 },
              transition: { duration: 1, repeat: Infinity, ease: "linear" }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            import_framer_motion9.motion.p,
            {
              className: "text-gray-600 font-medium",
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: 0.2 },
              children: "Preparing something delicious..."
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
var import_react35 = __toESM(require("react"));
var import_react_router_dom7 = require("react-router-dom");
var import_react_helmet_async12 = __toESM(require_lib());

// src/components/layout/Header.jsx
var import_react = __toESM(require("react"));
var import_react_router_dom = require("react-router-dom");
var import_framer_motion = require("framer-motion");
var import_jsx_runtime = require("react/jsx-runtime");
var logo = "/gallery/logo.png?text=Local+Effort&font=mono";
var links = [
  { path: "/services", name: "Services" },
  { path: "/pricing", name: "Pricing" },
  { path: "/menu", name: "Menus" },
  { path: "/about", name: "About" },
  // { path: '/happy-monday', name: 'Happy Monday' }, // temporarily hidden
  { path: "/gallery", name: "Gallery" }
];
var SHOW_FUNDRAISER = false;
var Header = () => {
  const [isOpen, setIsOpen] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "sticky top-0 z-40 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-neutral-200", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.NavLink, { to: "/", onClick: () => setIsOpen(false), className: "flex items-center gap-2", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        import_framer_motion.motion.img,
        {
          src: logo,
          alt: "Local Effort Logo",
          className: "h-9 w-auto",
          whileHover: { scale: 1.03 },
          transition: { type: "spring", stiffness: 300, damping: 20 }
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", { className: "hidden md:flex items-center gap-2 font-mono text-[0.9rem]", children: [
        links.map(({ path, name }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.NavLink, { to: path, className: "relative px-2 py-1 rounded", children: ({ isActive }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "transition-colors hover:text-neutral-900 text-neutral-700", children: name }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            import_framer_motion.motion.span,
            {
              layoutId: "nav-underline",
              className: "absolute left-2 right-2 -bottom-0.5 h-0.5 bg-[var(--color-accent)]",
              initial: false,
              animate: { opacity: isActive ? 1 : 0 },
              transition: { duration: 0.2 }
            }
          )
        ] }) }, path)),
        SHOW_FUNDRAISER && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_router_dom.NavLink, { to: "/crowdfunding", className: "ml-2", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_framer_motion.motion.span,
          {
            whileHover: { scale: 1.03 },
            whileTap: { scale: 0.98 },
            className: "inline-flex items-center rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-semibold text-white shadow-sm",
            children: "Fundraiser"
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
        className: "md:hidden fixed inset-0 bg-neutral-50",
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
            className: "flex flex-col items-center justify-center h-full space-y-6 font-mono",
            children: [
              links.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                import_framer_motion.motion.div,
                {
                  variants: { hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } },
                  children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    import_react_router_dom.NavLink,
                    {
                      to: l.path,
                      onClick: () => setIsOpen(false),
                      className: "text-3xl uppercase",
                      children: l.name
                    }
                  )
                },
                l.path
              )),
              SHOW_FUNDRAISER && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_framer_motion.motion.div, { variants: { hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                import_react_router_dom.NavLink,
                {
                  to: "/crowdfunding",
                  onClick: () => setIsOpen(false),
                  className: "text-2xl uppercase bg-[var(--color-accent)] text-white px-6 py-3 rounded font-semibold",
                  children: "Fundraiser"
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
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-neutral-500", children: "Roseville, MN \xB7 Midwest" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex gap-4", children: [
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
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("a", { href: "/partner-portal", className: "underline underline-offset-4 hover:opacity-80", children: "Partner Portal" })
    ] })
  ] }) }) });
};

// src/pages/HomePage.jsx
var import_react10 = __toESM(require("react"));
var import_react_router_dom3 = require("react-router-dom");
var import_react_helmet_async = __toESM(require_lib());

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
var CloudinaryImage = ({ publicId, alt, width, height, className, containerClassName, imgClassName, containerStyle, disableLazy = false, fallbackSrc, resizeMode = "fill", placeholderMode = "blur", sizes, responsiveSteps = [480, 768, 1024, 1400], eager = false }) => {
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
  const phW = 80;
  const phH = Math.max(20, Math.round((height || 80) * (phW / (width || 80))));
  const placeholderImg = cld.image(publicId).resize((0, import_resize.fill)(phW, phH)).quality(20).format((0, import_format.auto)());
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
  }, [publicId]);
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
  const baseStyle = placeholderMode === "blur" ? { backgroundImage: `url(${placeholderUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: "#f3f4f6" };
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
var import_react11 = require("react");

// src/data/cloudinaryContent.js
var import_meta2 = {};
var cloudinaryConfig = {
  cloudName: typeof import_meta2 !== "undefined" && import_meta2.env?.VITE_CLOUDINARY_CLOUD_NAME || "dokyhfvyd"
};
var heroPublicId = "site/hero/home-hero-1";
var heroFallbackSrc = "/gallery/IMG_3145.jpg";
var peoplePublicIds = {
  // Provided by user
  weston: "site/people/weston",
  // Update this to your actual public_id when ready
  catherine: "site/people/catherine"
};

// src/components/common/TestimonialsCarousel.jsx
var import_react9 = __toESM(require("react"));

// src/components/common/EmblaCarousel.jsx
var import_react8 = __toESM(require("react"));

// node_modules/embla-carousel-react/esm/embla-carousel-react.esm.js
var import_react7 = require("react");

// node_modules/embla-carousel-reactive-utils/esm/embla-carousel-reactive-utils.esm.js
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

// node_modules/embla-carousel/esm/embla-carousel.esm.js
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
  let counter = withinLimit(start);
  function withinLimit(n) {
    return !loop ? constrain(n) : mathAbs((loopEnd + n) % loopEnd);
  }
  function get() {
    return counter;
  }
  function set(n) {
    counter = withinLimit(n);
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
    set,
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
  function set(n) {
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
    set,
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
    }) => options2)]).forEach((query2) => mediaHandlers.add(query2, "change", reActivate));
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

// node_modules/embla-carousel-react/esm/embla-carousel-react.esm.js
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
function TestimonialsCarousel({ items = [], title = "Testimonials", headingExtra = null, maxLines = 5 }) {
  const slides = (0, import_react9.useMemo)(() => {
    if (!items.length) return [];
    const randomized = shuffle(items);
    const groups = chunk(randomized, 3);
    return groups.map((group, idx) => ({
      key: `t-slide-${idx}`,
      node: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "grid md:grid-cols-3 gap-6", children: group.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(TestimonialCard, { t, maxLines }, i)) })
    }));
  }, [items]);
  if (!slides.length) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8", children: [
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

// src/pages/HomePage.jsx
var import_jsx_runtime7 = require("react/jsx-runtime");
var HomePage = () => {
  const navigate = (0, import_react_router_dom3.useNavigate)();
  const [partners, setPartners] = (0, import_react10.useState)([]);
  (0, import_react11.useEffect)(() => {
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
  const [reviews, setReviews] = (0, import_react10.useState)([]);
  (0, import_react11.useEffect)(() => {
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
  const PartnerGrid = () => {
    const items = (partners || []).filter((p) => p && p.publicId);
    if (!items.length) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 items-center px-4", children: items.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      import_framer_motion3.motion.a,
      {
        href: p.url || "#",
        onClick: (e) => {
          if (!p.url) e.preventDefault();
          if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "partner_click", { partner: p.name || p.publicId });
          }
        },
        className: "flex items-center justify-center p-4 bg-white rounded-lg shadow-sm",
        "aria-label": p.name || `Partner ${i + 1}`,
        rel: "noopener noreferrer",
        target: p.url ? "_blank" : void 0,
        initial: { opacity: 0, y: 10 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.3, delay: i * 0.03 },
        children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "w-full", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "relative w-full", style: { paddingTop: "26%" }, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          cloudinaryImage_default,
          {
            publicId: p.publicId,
            alt: p.name || `Partner ${i + 1}`,
            width: 1200,
            height: 320,
            containerClassName: "absolute inset-0",
            imgClassName: "w-full h-full",
            resizeMode: "fit",
            sizes: "(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 22vw",
            responsiveSteps: [360, 640, 900, 1200]
          }
        ) }) })
      },
      (p.publicId || i) + i
    )) });
  };
  const heroImage = { publicId: heroPublicId, alt: "Local Effort \u2014 hero" };
  const imageJsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/f_auto,q_auto/${heroImage.publicId}`,
    name: heroImage.alt,
    description: "A sample of the professional in-home dining experience by Local Effort.",
    creator: {
      "@type": "Organization",
      name: "Local Effort"
    }
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
  const [showFeedback, setShowFeedback] = (0, import_react10.useState)(false);
  const [fb, setFb] = (0, import_react10.useState)({ name: "", email: "", sentiment: "positive", message: "" });
  const [fbStatus, setFbStatus] = (0, import_react10.useState)("idle");
  function SubscribeForm() {
    const [email, setEmail] = (0, import_react10.useState)("");
    const [status, setStatus] = (0, import_react10.useState)("idle");
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
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
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
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
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "submit", className: "btn btn-primary", disabled: status === "sending", children: status === "sending" ? "Subscribing\u2026" : "Subscribe" }),
          status === "ok" && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "text-green-700 text-sm self-center", children: "Thanks! You\u2019re on the list." }),
          status === "error" && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "text-red-700 text-sm self-center", children: "Couldn\u2019t subscribe." })
        ]
      }
    );
  }
  const FeedbackModal = (0, import_react10.useMemo)(() => {
    if (!showFeedback) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4", role: "dialog", "aria-modal": "true", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "form-card w-full max-w-lg relative", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        "button",
        {
          className: "absolute right-4 top-4 text-sm underline",
          onClick: () => setShowFeedback(false),
          "aria-label": "Close feedback",
          children: "Close"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h4", { className: "text-xl font-bold mb-2", children: "Send Feedback" }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "text-sm text-gray-600 mb-4", children: "We read every note. Thanks for helping us improve." }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
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
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("label", { className: "label", htmlFor: "fb-name", children: "Name" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("input", { id: "fb-name", className: "input", value: fb.name, onChange: (e) => setFb({ ...fb, name: e.target.value }), required: true })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("label", { className: "label", htmlFor: "fb-email", children: "Email" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("input", { id: "fb-email", type: "email", className: "input", value: fb.email, onChange: (e) => setFb({ ...fb, email: e.target.value }), required: true })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("label", { className: "label", htmlFor: "fb-sentiment", children: "Type" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "flex gap-4", id: "fb-sentiment", children: ["positive", "neutral", "negative"].map((s) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("label", { className: "inline-flex items-center gap-2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("input", { type: "radio", name: "sentiment", value: s, checked: fb.sentiment === s, onChange: () => setFb({ ...fb, sentiment: s }) }),
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "capitalize", children: s })
              ] }, s)) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("label", { className: "label", htmlFor: "fb-message", children: "Message" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("textarea", { id: "fb-message", className: "textarea", value: fb.message, onChange: (e) => setFb({ ...fb, message: e.target.value }), rows: 5, required: true })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "submit", className: "btn btn-primary", disabled: fbStatus === "sending", children: fbStatus === "sending" ? "Sending\u2026" : "Send feedback" }),
              fbStatus === "sent" && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "text-green-700 text-sm", children: "Thanks! Sent." }),
              fbStatus === "error" && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "text-red-700 text-sm", children: "Could not send. Try again." })
            ] })
          ]
        }
      )
    ] }) });
  }, [showFeedback, fb, fbStatus]);
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_react_helmet_async.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("title", { children: "Local Effort | Personal Chef & Event Catering in Roseville, MN" }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        "meta",
        {
          name: "description",
          content: "Local Effort offers personal chef services, event catering, and weekly meal plans in Roseville, MN."
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("script", { type: "application/ld+json", children: JSON.stringify(imageJsonLd) }),
      partnersJsonLd && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("script", { type: "application/ld+json", children: JSON.stringify(partnersJsonLd) }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("script", { type: "application/ld+json", children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": ["Restaurant", "Caterer"],
        name: "Local Effort",
        url: "https://local-effort-app.vercel.app/",
        address: { "@type": "PostalAddress", addressLocality: "Roseville", addressRegion: "MN", addressCountry: "US" },
        servesCuisine: ["American", "Local", "Farm to Table", "Seasonal"],
        priceRange: "$$"
      }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "space-y-24", children: [
      !cloudinaryConfig.cloudName && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "card bg-yellow-100 border-yellow-400 text-body", children: "Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME in your environment." }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("section", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8 grid md:grid-cols-2 gap-8 items-center min-h-[60vh]", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            import_framer_motion3.motion.h2,
            {
              variants: fadeInLeft,
              initial: "initial",
              animate: "animate",
              className: "text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] leading-[1.02]",
              children: "Minnesotan Food"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            import_framer_motion3.motion.h3,
            {
              variants: fadeInLeft,
              initial: "initial",
              animate: "animate",
              transition: { delay: 0.05 },
              className: "text-4xl md:text-6xl font-bold uppercase text-neutral-400 tracking-[-0.02em] leading-[1.0] -mt-3 md:-mt-5 lg:-mt-6",
              children: "For Your Functions."
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            import_framer_motion3.motion.p,
            {
              variants: fadeInUp,
              initial: "initial",
              animate: "animate",
              className: "mt-6 md:mt-8 text-body max-w-md",
              children: "Event hospitality and personal chef services, with an obsessive focus on local ingredients."
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            import_framer_motion3.motion.button,
            {
              whileHover: { scale: 1.03 },
              whileTap: { scale: 0.98 },
              onClick: () => navigate("/services#event-request"),
              className: "btn btn-primary mt-8 text-lg",
              children: "Book an event"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          import_framer_motion3.motion.div,
          {
            className: "w-full min-h-[400px] h-full rounded-xl overflow-hidden",
            initial: { opacity: 0, y: 10 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.6 },
            children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              cloudinaryImage_default,
              {
                publicId: heroImage.publicId,
                alt: heroImage.alt,
                width: 600,
                height: 600,
                className: "w-full h-full object-cover",
                fallbackSrc: heroFallbackSrc,
                sizes: "(min-width: 1024px) 50vw, 100vw",
                eager: true
              }
            )
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("section", { className: "mx-auto max-w-3xl px-4 md:px-6 lg:px-8", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "form-card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h3", { className: "text-xl font-bold", children: "Subscribe to our email list" }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "text-sm text-gray-600 mt-1", children: "Occasional updates about seasonal menus, events, and meal prep openings." }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(SubscribeForm, {})
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("section", { className: "py-12", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h3", { className: "text-heading uppercase text-center mb-4", children: "Our Partners" }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { className: "text-center text-sm text-gray-600 max-w-2xl mx-auto mb-6", children: "Proud partners who help make this project possible. Support local \u2014 shop and collaborate with them." }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(PartnerGrid, {})
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("section", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h3", { className: "text-heading uppercase mb-6 border-b border-neutral-300 pb-3", children: "What We Do" }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "grid md:grid-cols-3 gap-6", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            ServiceCard_default,
            {
              to: "/events",
              title: "Dinners & Events",
              description: "in-home dinner parties and small events up to 50"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            ServiceCard_default,
            {
              to: "/meal-prep",
              title: "Weekly Meal Plans",
              description: "Nutritious, locally-sourced weekly menus and plans."
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            ServiceCard_default,
            {
              to: "/pizza-party",
              title: "Pizza Parties",
              description: "Local Pizza at your party (or bar). We'll bring the oven."
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        TestimonialsCarousel,
        {
          items: reviews,
          title: "Feedback",
          headingExtra: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "text-sm text-neutral-600", children: [
            "Want to ",
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { className: "underline", onClick: () => setShowFeedback(true), children: "provide feedback" }),
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
var import_react12 = __toESM(require("react"));
var import_react_helmet_async2 = __toESM(require_lib());

// src/sanityClient.js
var import_client = require("@sanity/client");
var import_meta4 = {};
var env = (typeof import_meta4 !== "undefined" ? import_meta4.env : {}) || {};
var projectId = env.VITE_APP_SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID;
var dataset = env.VITE_APP_SANITY_DATASET || env.VITE_SANITY_DATASET;
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

// src/pages/AboutUsPage.jsx
var import_jsx_runtime8 = require("react/jsx-runtime");
var AboutUsPage = () => {
  const [aboutData, setAboutData] = (0, import_react12.useState)(null);
  const [loading, setLoading] = (0, import_react12.useState)(true);
  (0, import_react12.useEffect)(() => {
    const query2 = `{
      "page": *[_type == "page" && slug.current == "about-us"][0]{ title, introduction },
  "persons": *[_type == "person"]{ name, role, bio, image{asset->{_ref}}, headshot{ asset{ public_id }, alt } }
    }`;
    let mounted = true;
    (async () => {
      try {
        const data = await sanityClient_default.fetch(query2);
        if (!mounted) return;
        setAboutData(data);
      } catch (err) {
        console.error("Failed to load About page data:", err);
        setAboutData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  if (loading) return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { children: "Loading..." });
  if (!aboutData) return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { children: "Could not load page data." });
  const { page, persons = [] } = aboutData;
  const weston = persons.find((p) => p.name && p.name.includes("Weston")) || {};
  const catherine = persons.find((p) => p.name && p.name.includes("Catherine")) || {};
  const westonPublicId = weston?.headshot?.asset?.public_id || peoplePublicIds.weston;
  const catherinePublicId = catherine?.headshot?.asset?.public_id || peoplePublicIds.catherine;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_react_helmet_async2.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("title", { children: [
        page?.title || "About Us",
        " | Local Effort"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        "meta",
        {
          name: "description",
          content: page?.introduction || "Meet the chefs behind Local Effort."
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "space-y-16", children: [
      !page && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "card text-body bg-yellow-100 border-yellow-400", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("strong", { children: "Content Missing:" }),
        ' Please ensure a "Page" document with the exact slug "about-us" has been created and published in your Sanity Studio.'
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("h2", { className: "text-hero uppercase border-b border-gray-900 pb-4", children: page?.title }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "prose-lite max-w-3xl", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { children: page?.introduction }) }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "grid md:grid-cols-2 gap-8", children: [
        persons.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "card text-body md:col-span-2 bg-yellow-100 border-yellow-400", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("strong", { children: "Content Missing:" }),
          ' Please ensure "Person" documents for the team have been created and published in your Sanity Studio.'
        ] }),
        weston && (westonPublicId || weston.headshot) && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("h3", { className: "text-heading", children: weston.name }),
          westonPublicId ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "my-4", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            cloudinaryImage_default,
            {
              publicId: westonPublicId,
              alt: weston?.headshot?.alt || weston?.name || "Team member headshot",
              width: 600,
              height: 400,
              className: "rounded-md w-full h-auto object-cover",
              fallbackSrc: "/gallery/IMG_3145.jpg"
            }
          ) }) : null,
          weston?.role && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "text-body text-gray-600 mb-4", children: weston.role }),
          weston?.bio && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "text-body", children: weston.bio })
        ] }),
        catherine && (catherinePublicId || catherine.headshot) && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("h3", { className: "text-heading", children: catherine.name }),
          catherinePublicId ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "my-4", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            cloudinaryImage_default,
            {
              publicId: catherinePublicId,
              alt: catherine?.headshot?.alt || catherine?.name || "Team member headshot",
              width: 600,
              height: 400,
              className: "rounded-md w-full h-auto object-cover",
              fallbackSrc: "/gallery/catherine.jpg"
            }
          ) }) : null,
          catherine?.role && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "text-body text-gray-600 mb-4", children: catherine.role }),
          catherine?.bio && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "text-body", children: catherine.bio })
        ] })
      ] })
    ] })
  ] });
};
var AboutUsPage_default = AboutUsPage;

// src/pages/ServicesPage.jsx
var import_react14 = __toESM(require("react"));
var import_react_router_dom4 = require("react-router-dom");
var import_react_helmet_async3 = __toESM(require_lib());

// src/components/common/PhotoGrid.jsx
var import_react13 = __toESM(require("react"));
var import_jsx_runtime9 = require("react/jsx-runtime");
function PhotoGrid({ tags, title, perPage = 24 }) {
  const tagList = (0, import_react13.useMemo)(() => Array.isArray(tags) ? tags.filter(Boolean) : [tags].filter(Boolean), [tags]);
  const [images, setImages] = (0, import_react13.useState)([]);
  const [loading, setLoading] = (0, import_react13.useState)(false);
  const [error, setError] = (0, import_react13.useState)(null);
  (0, import_react13.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { className: "space-y-4", children: [
    title ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { className: "text-2xl font-bold", children: title }) : null,
    loading ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { children: "Loading photos\u2026" }) : error ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "text-red-700 bg-red-50 border border-red-200 p-3 rounded", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: "font-semibold", children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: "text-sm mt-1", children: "If this persists, check Cloudinary env vars and the serverless function logs." })
    ] }) : images.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: "text-sm text-gray-600", children: "No photos found." }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: images.map((img, idx) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "border p-2 bg-white rounded-lg overflow-hidden", children: img.thumbnail_url ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      "img",
      {
        src: img.thumbnail_url,
        alt: img.context?.alt || "Grid image",
        className: "rounded-lg object-cover w-full h-full aspect-square",
        loading: "lazy"
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
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

// src/pages/ServicesPage.jsx
var import_jsx_runtime10 = require("react/jsx-runtime");
var ServicesPage = () => {
  const navigate = (0, import_react_router_dom4.useNavigate)();
  const location = (0, import_react_router_dom4.useLocation)();
  (0, import_react14.useEffect)(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      }
    }
  }, [location.hash]);
  const initialForm = (0, import_react14.useMemo)(
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
  const [form, setForm] = (0, import_react14.useState)(initialForm);
  const [submitting, setSubmitting] = (0, import_react14.useState)(false);
  const [result, setResult] = (0, import_react14.useState)(null);
  const [bookHero, setBookHero] = (0, import_react14.useState)(null);
  const required = (v) => String(v || "").trim().length > 0;
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };
  const reset = () => setForm(initialForm);
  (0, import_react14.useEffect)(() => {
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    if (!required(form.firstName) || !required(form.lastName) || !required(form.phone) || !required(form.email)) {
      setResult({ ok: false, message: "Please complete first name, last name, phone, and email." });
      return;
    }
    try {
      setSubmitting(true);
      const subject = `Event Request${form.guestCount ? `: ${form.guestCount} guests` : ""}${form.eventDate ? ` on ${form.eventDate}` : ""}`;
      const summary = [
        form.eventType ? `Event Type: ${form.eventType}` : null,
        form.eventDate ? `Event Date: ${form.eventDate}` : null,
        form.guestCount ? `Estimated Guests: ${form.guestCount}` : null,
        form.city || form.state || form.zip ? `Location: ${[form.city, form.state, form.zip].filter(Boolean).join(", ")}` : null
      ].filter(Boolean).join("\n");
      const message = `${summary}

Notes:
${form.notes || "(none)"}`;
      const resp = await fetch("/api/messages/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          phone: form.phone,
          subject,
          message,
          type: "event",
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
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_react_helmet_async3.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("title", { children: "Services | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        "meta",
        {
          name: "description",
          content: "Explore the personal chef and catering services offered by Local Effort."
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "space-y-16 mx-auto max-w-6xl px-4 md:px-6 lg:px-8", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("h2", { className: "text-4xl md:text-6xl font-bold uppercase border-b border-gray-900 pb-4", children: "Services" }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-8", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "card space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("h3", { className: "text-heading", children: "Dinners & Events" }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "text-body", children: "in-home dinner parties and small events up to 50" }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { onClick: () => navigate("/events"), className: "text-body text-sm underline", children: "Details \u2192" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "card space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("h3", { className: "text-heading", children: "Weekly Meal Plans" }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "text-body", children: "Nutritious, locally-sourced meals delivered weekly." }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { onClick: () => navigate("/meal-prep"), className: "text-body text-sm underline", children: "Details \u2192" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "card space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("h3", { className: "text-heading", children: "Pizza Parties" }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "text-body", children: "local pizza at your party. we'll bring the oven." }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
            "button",
            {
              onClick: () => navigate("/pizza-party"),
              className: "text-body text-sm underline",
              children: "Details \u2192"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(PhotoGrid, { tags: "service", title: "Service photos", perPage: 24 }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("section", { id: "event-request", className: "border-t border-neutral-200 pt-10", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "max-w-3xl mx-auto", children: [
        bookHero && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "w-full h-[30vh] md:h-[36vh] lg:h-[42vh] rounded-xl overflow-hidden mb-6", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          cloudinaryImage_default,
          {
            publicId: bookHero,
            alt: "Book an event",
            className: "w-full h-full object-cover",
            sizes: "100vw",
            eager: true
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("h3", { className: "mb-1 text-center text-2xl font-bold", children: "book an event" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "text-body mb-6 text-center", children: "Tell us about your event and we\u2019ll follow up with availability and a tailored menu." }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "form-card", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("label", { className: "block text-sm font-medium", htmlFor: "firstName", children: "Contact Name *" }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "grid md:grid-cols-2 gap-4 mt-1", children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "hint mt-1", children: "This field is required." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "grid md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("label", { className: "block text-sm font-medium", htmlFor: "phone", children: "Phone Number *" }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("label", { className: "block text-sm font-medium", htmlFor: "email", children: "E-mail *" }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("label", { className: "block text-sm font-medium", htmlFor: "eventDate", children: "Event Date" }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "hint mt-1", children: "Choose a date from the calendar." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("label", { className: "block text-sm font-medium", htmlFor: "city", children: "Where will the event take place?" }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "grid md:grid-cols-3 gap-4 mt-1", children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
              /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
                "select",
                {
                  id: "state",
                  name: "state",
                  value: form.state,
                  onChange: handleChange,
                  className: "w-full border rounded-md p-2 bg-white",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { value: "", children: "Please Select" }),
                    ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"].map((s) => /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { value: s, children: s }, s))
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("label", { className: "block text-sm font-medium", htmlFor: "eventType", children: "Event Type" }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
              "select",
              {
                id: "eventType",
                name: "eventType",
                value: form.eventType,
                onChange: handleChange,
                className: "mt-1 w-full border rounded-md p-2 bg-white",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { value: "", children: "Please Select" }),
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { children: "Home Dinner" }),
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { children: "Small Event" }),
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { children: "Wedding" }),
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { children: "Baby Shower" }),
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { children: "Pizza Party" }),
                  /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { children: "Other" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("label", { className: "block text-sm font-medium", htmlFor: "guestCount", children: "Estimated guest count" }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("label", { className: "block text-sm font-medium", htmlFor: "notes", children: "Tell us more! What sort of meal are you thinking? Which foods do you like? What questions do you have for us straight away?" }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "inline-flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("input", { type: "checkbox", name: "sendCopy", checked: form.sendCopy, onChange: handleChange }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "text-sm", children: "Email me a copy of this request" })
          ] }),
          result && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "text-sm " + (result.ok ? "text-green-700" : "text-red-700"), children: result.message }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "actions", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
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
var import_react16 = __toESM(require("react"));
var import_react_helmet_async4 = __toESM(require_lib());

// src/components/pricing/CostEstimator.jsx
var import_react15 = __toESM(require("react"));
var import_jsx_runtime11 = require("react/jsx-runtime");
var CostEstimator = () => {
  const [userAnswers, setUserAnswers] = (0, import_react15.useState)({});
  const [currentQuestionKey, setCurrentQuestionKey] = (0, import_react15.useState)("start");
  const [questionPath, setQuestionPath] = (0, import_react15.useState)([]);
  const [finalCost, setFinalCost] = (0, import_react15.useState)(0);
  const [breakdown, setBreakdown] = (0, import_react15.useState)([]);
  const [showResults, setShowResults] = (0, import_react15.useState)(false);
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
    setFinalCost(totalCost);
    setBreakdown([`Estimated cost for ${people} person(s): $${totalCost.toFixed(2)}`]);
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
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "border border-gray-900 p-8 text-center", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("h3", { className: "text-2xl font-bold", children: "All-Inclusive Ballpark Estimate" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("p", { className: "text-6xl font-bold my-4", children: [
        "$",
        finalCost.toFixed(2)
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "bg-gray-200 p-4 text-left mb-6 font-mono text-sm", children: [`- Based on your selections for a ${userAnswers.serviceType} service.`].map(
        (item, i) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { children: item }, i)
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { onClick: restart, className: "mt-6 text-sm underline font-mono", children: "Start Over" })
    ] });
  }
  const currentQData = questions[currentQuestionKey];
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "relative w-full border border-gray-900 p-8 min-h-[400px]", children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("h2", { className: "text-3xl font-bold mb-6", children: currentQData.title }),
    currentQData.type === "options" && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "space-y-3 font-mono", children: currentQData.options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      "button",
      {
        onClick: () => handleAnswer(currentQData, opt.value),
        className: "w-full text-left p-4 border border-gray-900 hover:bg-gray-200 block",
        children: opt.text
      },
      opt.value.toString()
    )) }),
    currentQData.type === "number" && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
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
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
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
    currentQData.type === "multi_number" && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "font-mono space-y-4", children: [
      currentQData.fields.map((field) => /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "grid grid-cols-2 items-center gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("label", { htmlFor: `input-${field.id}`, className: "text-lg", children: field.label }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          "input",
          {
            type: "number",
            id: `input-${field.id}`,
            placeholder: "0",
            className: "p-3 text-lg border-b-2 border-gray-900 outline-none bg-transparent"
          }
        )
      ] }, field.id)),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
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
var import_framer_motion4 = require("framer-motion");
var import_jsx_runtime12 = require("react/jsx-runtime");
var PricingPage = () => {
  const [openFaq, setOpenFaq] = (0, import_react16.useState)(null);
  const faqRefs = (0, import_react16.useRef)([]);
  const pricingFaqData = [
    {
      name: "How much does a weekly meal plan cost?",
      answer: "Our weekly meal plans range from $13.50 for lighter breakfast options to $24 for full dinner meals."
    },
    {
      name: "What is the cost for a small event or party?",
      answer: "A simple food drop-off service starts as low as $25 per person. Full-service events can range up to $85 per person or more."
    },
    {
      name: "How much does an intimate dinner at home cost?",
      answer: "An intimate dinner at your home generally ranges from $65 to $125 per person."
    },
    {
      name: "How much is a private pizza party?",
      answer: "Our private pizza parties start at $300 for groups of up to 15 people."
    }
  ];
  (0, import_react16.useEffect)(() => {
    if (openFaq !== null && faqRefs.current[openFaq]) {
      faqRefs.current[openFaq].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [openFaq]);
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_jsx_runtime12.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_react_helmet_async4.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("title", { children: "Pricing | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
        "meta",
        {
          name: "description",
          content: "Find pricing information for Local Effort's personal chef services."
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "space-y-16 max-w-5xl mx-auto px-4 py-12", children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
        import_framer_motion4.motion.div,
        {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5 },
          className: "text-center",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h2", { className: "text-4xl font-extrabold uppercase mb-4", children: "Pricing" }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { className: "text-lg text-gray-700 max-w-3xl mx-auto", children: "Use our estimator for a ballpark figure, or review our general pricing guidelines below." })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
        import_framer_motion4.motion.section,
        {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.5 },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h3", { className: "text-2xl font-bold uppercase mb-4", children: "Cost Estimator" }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(CostEstimator, {})
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
        import_framer_motion4.motion.section,
        {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.5 },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h3", { className: "text-2xl font-bold uppercase mb-4", children: "General Pricing FAQ" }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "space-y-2", children: pricingFaqData.map((item, index) => {
              const isOpen = openFaq === index;
              return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
                "div",
                {
                  ref: (el) => faqRefs.current[index] = el,
                  className: "bg-[#F5F5F5] border border-gray-300 rounded-lg overflow-hidden",
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
                      "button",
                      {
                        onClick: () => setOpenFaq(isOpen ? null : index),
                        className: "w-full p-6 text-left flex justify-between items-center",
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h3", { className: "text-xl font-semibold", children: item.name }),
                          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                            import_framer_motion4.motion.span,
                            {
                              animate: { rotate: isOpen ? 45 : 0 },
                              transition: { type: "spring", stiffness: 300, damping: 20 },
                              className: "text-3xl",
                              children: "+"
                            }
                          )
                        ]
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                      import_framer_motion4.motion.div,
                      {
                        initial: { height: 0, opacity: 0 },
                        animate: { height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 },
                        transition: { duration: 0.3 },
                        className: "overflow-hidden px-6 pt-0 pb-6 border-t border-gray-300",
                        children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { className: "text-gray-700 text-base", children: item.answer })
                      }
                    )
                  ]
                },
                index
              );
            }) })
          ]
        }
      )
    ] })
  ] });
};
var PricingPage_default = PricingPage;

// src/pages/MenuPage.jsx
var import_react17 = __toESM(require("react"));
var import_react_helmet_async5 = __toESM(require_lib());

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
var import_framer_motion5 = require("framer-motion");
var import_jsx_runtime13 = require("react/jsx-runtime");
var ServiceCard2 = ({ title, description, children, isOpen = false }) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
  import_framer_motion5.motion.div,
  {
    className: `group rounded-xl bg-neutral-50 shadow-sm ring-1 ring-neutral-200 transition-all hover:shadow-md ` + (isOpen ? "p-8" : "p-4 md:p-5"),
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
    children: [
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("h4", { className: isOpen ? "text-2xl font-bold uppercase tracking-tight" : "text-xl font-bold uppercase tracking-tight", children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { className: isOpen ? "font-mono text-neutral-600 min-h-[2rem] mt-2" : "font-mono text-neutral-600 mt-1", children: description }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: isOpen ? "mt-4" : "mt-2", children })
    ]
  }
);
function MenuPage() {
  const [openMenu, setOpenMenu] = (0, import_react17.useState)(null);
  const [hoveredKey, setHoveredKey] = (0, import_react17.useState)(null);
  const [lookup, setLookup] = (0, import_react17.useState)({});
  const toggleMenu = (id) => setOpenMenu(openMenu === id ? null : id);
  const menuJsonLd = (0, import_react17.useMemo)(() => {
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
      url: "https://local-effort-app.vercel.app/menu",
      servesCuisine: ["American", "Italian", "Seasonal", "Local"],
      areaServed: "Portland, OR",
      hasMenu: menuSections
    };
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "container mx-auto px-4 py-8", children: [
    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(import_react_helmet_async5.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("title", { children: "Past Menu Examples | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("meta", { name: "description", content: "Real menus from recent events, showcasing wide options and locally sourced food." }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("script", { type: "application/ld+json", children: JSON.stringify(menuJsonLd) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("h1", { className: "text-4xl font-bold mb-4 text-center", children: "Past Menu Examples." }),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "prose-lite max-w-3xl mx-auto text-center mb-8", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { children: 'these are all real menus from events in the past couple years, just to show how wide the options are. We love to "make it local."' }) }),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: sampleMenus.map((menu) => {
      const isOpen = openMenu === menu.id;
      return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(ServiceCard2, { title: menu.title, description: menu.description || "", isOpen, children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          "button",
          {
            onClick: () => toggleMenu(menu.id),
            className: "mt-2 text-sm font-medium text-blue-600 hover:underline",
            children: isOpen ? "Hide Sections \u25B2" : "View More \u25BC"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          import_framer_motion5.motion.div,
          {
            initial: { height: 0, opacity: 0 },
            animate: { height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 },
            transition: { duration: 0.3 },
            className: "overflow-hidden mt-4",
            children: isOpen && menu.sections.map((section, idx) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "mt-4", children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("h5", { className: "text-lg font-semibold", children: section.course }),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("ul", { className: "list-disc list-inside mt-2 space-y-1", children: section.items.map((item, i) => {
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
                return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
                  "li",
                  {
                    onMouseEnter: handleEnter,
                    onMouseLeave: () => setHoveredKey(null),
                    className: `relative py-1 ${hasImage || lookup[itemKey] ? "cursor-pointer" : "cursor-default"}`,
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: `font-medium ${hasImage || lookup[itemKey] ? "underline decoration-dotted underline-offset-2" : ""}`, children: item.name }),
                      hasImage || lookup[itemKey] ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "ml-1 align-middle inline-block text-neutral-500", title: "Preview available", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("path", { d: "M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z", stroke: "currentColor", strokeWidth: "1.5" }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("path", { d: "M9 11l3 3 3-3 4 5H5l4-5z", stroke: "currentColor", strokeWidth: "1.5" }),
                        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("circle", { cx: "8", cy: "9", r: "1.5", fill: "currentColor" })
                      ] }) }) : null,
                      item.note && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "text-gray-600 italic", children: [
                        " \u2014 ",
                        item.note
                      ] }),
                      item.dietary?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "ml-2 text-sm text-green-600", children: [
                        "[",
                        item.dietary.join(", "),
                        "]"
                      ] }),
                      (hasImage || previewPublicId) && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(import_framer_motion5.AnimatePresence, { children: hoveredKey === itemKey && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                        import_framer_motion5.motion.div,
                        {
                          className: "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-white rounded-lg shadow-xl z-20 w-48 h-48 pointer-events-none",
                          initial: { opacity: 0, y: 10, scale: 0.9 },
                          animate: { opacity: 1, y: 0, scale: 1 },
                          exit: { opacity: 0, y: 10, scale: 0.9 },
                          transition: { duration: 0.2, ease: "easeInOut" },
                          children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
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
var import_react23 = __toESM(require("react"));
var import_react_helmet_async6 = __toESM(require_lib());
var import_framer_motion10 = require("framer-motion");

// src/components/menu/FoodItemCard.jsx
var import_react18 = __toESM(require("react"));
var import_framer_motion6 = require("framer-motion");
var import_jsx_runtime14 = require("react/jsx-runtime");
var FoodItemCard = ({ item, onClick }) => {
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
    import_framer_motion6.motion.div,
    {
      variants: fadeInUp,
      onClick,
      className: "border border-neutral-200 rounded-lg p-6 cursor-pointer hover:shadow-lg hover:border-neutral-400 transition-all duration-300 bg-white",
      whileHover: { scale: 1.03 },
      whileTap: { scale: 0.98 },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("h4", { className: "text-xl font-bold text-neutral-800", children: item.name }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("p", { className: "text-neutral-600 mt-2 line-clamp-2", children: item.description })
      ]
    }
  );
};
var FoodItemCard_default = FoodItemCard;

// src/components/ErrorBoundary.jsx
var import_react19 = __toESM(require("react"));
var import_jsx_runtime15 = require("react/jsx-runtime");
var ErrorBoundary = class extends import_react19.default.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught", error, info);
  }
  render() {
    if (this.state.error) {
      return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "p-6 bg-yellow-50 text-center", children: [
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("h3", { className: "font-bold", children: "Something failed to load." }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("p", { className: "text-sm text-gray-700 mt-2", children: this.state.error?.message }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
          "button",
          {
            type: "button",
            onClick: () => window.location.reload(),
            className: "mt-4 px-4 py-2 bg-blue-600 text-white rounded",
            children: "Reload"
          }
        )
      ] });
    }
    return this.props.children;
  }
};
var ErrorBoundary_default = ErrorBoundary;

// src/pages/HappyMondayPage.jsx
var import_jsx_runtime19 = require("react/jsx-runtime");
var BlockContent = (0, import_react23.lazy)(() => import("@sanity/block-content-to-react"));
var FoodItemModal2 = (0, import_react23.lazy)(() => Promise.resolve().then(() => (init_FoodItemModal(), FoodItemModal_exports)));
var FeedbackForm2 = (0, import_react23.lazy)(() => Promise.resolve().then(() => (init_FeedbackForm(), FeedbackForm_exports)));
var LoadingSpinner2 = (0, import_react23.lazy)(() => Promise.resolve().then(() => (init_LoadingSpinner(), LoadingSpinner_exports)).then((mod) => ({ default: mod.LoadingSpinner })));
var HappyMondayPage = () => {
  const [menuItems, setMenuItems] = (0, import_react23.useState)([]);
  const [pageContent, setPageContent] = (0, import_react23.useState)(null);
  const [selectedItem, setSelectedItem] = (0, import_react23.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react23.useState)(true);
  (0, import_react23.useEffect)(() => {
    const query2 = `{
      "menuItems": *[_type == "menuItems"],
      "pageContent": *[_type == "happyMondayPage"][0]
    }`;
    sanityClient_default.fetch(query2).then((data) => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_jsx_runtime19.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_react_helmet_async6.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("title", { children: "Happy Monday | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
        "meta",
        {
          name: "description",
          content: "Explore our special Happy Monday menu, made with the finest local ingredients."
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "space-y-24 mb-24", children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("section", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8", children: [
        pageContent && /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "text-center mb-12", children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("h2", { className: "text-heading uppercase mb-4", children: pageContent.title }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "prose lg:prose-lg mx-auto max-w-3xl", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(ErrorBoundary_default, { children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_react23.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "text-center", children: "Loading content\u2026" }), children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(BlockContent, { blocks: pageContent.body, client: sanityClient_default }) }) }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_react23.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "flex justify-center items-center h-64", children: "Loading\u2026" }), children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "flex justify-center items-center h-64", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(LoadingSpinner2, {}) }) : /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          import_framer_motion10.motion.div,
          {
            className: "grid md:grid-cols-2 lg:grid-cols-3 gap-6",
            initial: "initial",
            animate: "animate",
            variants: { animate: { transition: { staggerChildren: 0.1 } } },
            children: menuItems.map((item) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(FoodItemCard_default, { item, onClick: () => handleCardClick(item) }, item._id))
          }
        ) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("section", { className: "mx-auto max-w-6xl px-4 md:px-6 lg:px-8", children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("h2", { className: "text-heading uppercase mb-6 border-b border-neutral-300 pb-3", children: "Feedback" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("p", { className: "text-body mb-8 max-w-2xl", children: "Have a suggestion, a request, or feedback on our quality? We'd love to hear it. Your input helps us grow and improve." }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(ErrorBoundary_default, { children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_react23.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "text-center p-8", children: "Loading form\u2026" }), children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(FeedbackForm2, {}) }) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_framer_motion10.AnimatePresence, { children: selectedItem && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(ErrorBoundary_default, { children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(import_react23.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "fixed inset-0 flex items-center justify-center", children: "Loading\u2026" }), children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(FoodItemModal2, { item: selectedItem, onClose: handleCloseModal }) }) }) })
  ] });
};
var HappyMondayPage_default = HappyMondayPage;

// src/pages/GalleryPage.jsx
var import_react24 = __toESM(require("react"));
var import_react_helmet_async7 = __toESM(require_lib());
var import_framer_motion11 = require("framer-motion");
var import_jsx_runtime20 = require("react/jsx-runtime");
var GalleryPage = () => {
  const [images, setImages] = (0, import_react24.useState)([]);
  const [query2, setQuery] = (0, import_react24.useState)("");
  const [loading, setLoading] = (0, import_react24.useState)(true);
  const [error, setError] = (0, import_react24.useState)(null);
  const [selected, setSelected] = (0, import_react24.useState)(null);
  const fallbackLoadedRef = (0, import_react24.useRef)(false);
  const tryLoadFallback = (0, import_react24.useCallback)(async () => {
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
  const closeBtnRef = (0, import_react24.useRef)(null);
  (0, import_react24.useEffect)(() => {
    const controller = new AbortController();
    const handler = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = `/api/search-images${query2 ? `?query=${encodeURIComponent(query2)}&per_page=${PAGE_SIZE}` : `?per_page=${PAGE_SIZE}`}`;
        const response = await fetch(apiUrl, { signal: controller.signal });
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
        setImages(imgs);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error fetching images:", err);
        try {
          const fallback = await tryLoadFallback();
          if (fallback && fallback.length) {
            setImages(fallback);
            setError("Showing fallback images while the gallery API is unavailable.");
          } else {
            setError(err.message || String(err));
          }
        } catch (_) {
          setError(err.message || String(err));
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [query2]);
  const PAGE_SIZE = 36;
  const [visibleCount, setVisibleCount] = (0, import_react24.useState)(PAGE_SIZE);
  (0, import_react24.useEffect)(() => setVisibleCount(PAGE_SIZE), [images]);
  const openLightbox = (0, import_react24.useCallback)(
    (img, idx) => {
      setSelected({ img, idx });
      if (img && img.large_url) {
        const p = new Image();
        p.src = img.large_url;
      }
      const nextIdx = (idx + 1) % images.length;
      const next = images[nextIdx];
      if (next && next.large_url) {
        const pn = new Image();
        pn.src = next.large_url;
      }
    },
    [setSelected, images]
  );
  const closeLightbox = (0, import_react24.useCallback)(() => setSelected(null), [setSelected]);
  (0, import_react24.useEffect)(() => {
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
  (0, import_react24.useEffect)(() => {
    if (selected && closeBtnRef.current) closeBtnRef.current.focus();
  }, [selected]);
  return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(import_jsx_runtime20.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(import_react_helmet_async7.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("title", { children: "pictures of food. | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("meta", { name: "description", content: "A visual gallery of dinners, events, meal prep, and plates from Local Effort." }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("script", { type: "application/ld+json", children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Restaurant",
        name: "Local Effort",
        url: "https://local-effort-app.vercel.app/gallery",
        image: images.slice(0, 8).map((i) => i.large_url || i.thumbnail_url).filter(Boolean),
        servesCuisine: ["American", "Local", "Seasonal"],
        sameAs: []
      }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "container mx-auto px-4 py-8", children: [
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("h1", { className: "text-4xl font-bold mb-4 text-center", children: "pictures of food." }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
        "input",
        {
          type: "text",
          value: query2,
          onChange: (e) => setQuery(e.target.value),
          placeholder: "Search by tag (e.g., pizza, events, mealplan, plates, dinner, eggs)...",
          className: "w-full max-w-md mx-auto block p-3 border rounded-md mb-8"
        }
      ),
      loading ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { children: "Loading..." }) : error ? /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "text-red-600 bg-red-50 p-4 rounded", children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("h3", { className: "font-bold", children: "Error Details:" }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { children: error }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { className: "mt-2 text-sm", children: "This usually means:" }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("ul", { className: "list-disc ml-6 text-sm", children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("li", { children: "The /api/search-images.js file wasn't created properly" }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("li", { children: "Environment variables aren't set in Vercel" }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("li", { children: "The serverless function has an error" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { className: "mt-2 text-sm", children: "Check the browser Network tab and Vercel function logs." })
      ] }) : images.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "text-center p-8", children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { children: "No images found." }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { className: "text-sm text-gray-600 mt-2", children: "Try removing search terms or check that you have images in your Cloudinary account." })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: images.slice(0, visibleCount).map((img, idx) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
        import_framer_motion11.motion.button,
        {
          type: "button",
          onClick: () => openLightbox(img, idx),
          whileHover: { scale: 1.03 },
          whileTap: { scale: 0.98 },
          className: "border p-2 bg-white rounded-lg overflow-hidden",
          "aria-label": img.context?.alt || `Gallery image ${idx + 1}`,
          children: img.thumbnail_url ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
            "img",
            {
              src: img.thumbnail_url,
              alt: img.context?.alt || "Gallery image",
              className: "rounded-lg object-cover w-full h-full aspect-square",
              loading: "lazy"
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
            cloudinaryImage_default,
            {
              publicId: img.public_id,
              alt: img.context?.alt || "Gallery image",
              width: 600,
              height: 600,
              className: "rounded-lg object-cover w-full h-full aspect-square"
            }
          )
        },
        img.asset_id
      )) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(import_framer_motion11.AnimatePresence, { children: selected && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
      import_framer_motion11.motion.div,
      {
        className: "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        onClick: closeLightbox,
        children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
          import_framer_motion11.motion.div,
          {
            className: "max-w-5xl w-full max-h-full",
            initial: { y: 20, scale: 0.98 },
            animate: { y: 0, scale: 1 },
            exit: { y: 20, scale: 0.98 },
            onClick: (e) => e.stopPropagation(),
            children: /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "relative overflow-hidden", children: [
              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                "button",
                {
                  ref: closeBtnRef,
                  className: "absolute right-2 top-2 z-10 bg-black/60 text-white rounded-full p-2",
                  onClick: closeLightbox,
                  "aria-label": "Close image",
                  children: "\u2715"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "flex items-center justify-center p-2", children: selected.img.large_url ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                "img",
                {
                  src: selected.img.large_url,
                  alt: selected.img.context?.alt || "Large gallery image",
                  className: "w-full h-auto max-h-[90vh] object-contain"
                }
              ) : /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                cloudinaryImage_default,
                {
                  publicId: selected.img.public_id,
                  alt: selected.img.context?.alt || "Large gallery image",
                  width: 1400,
                  height: 1e3,
                  disableLazy: true,
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
var import_react25 = __toESM(require("react"));
var import_react_helmet_async8 = __toESM(require_lib());
var import_jsx_runtime21 = require("react/jsx-runtime");
var EventsPage = () => /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(import_jsx_runtime21.Fragment, { children: [
  /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(import_react_helmet_async8.Helmet, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("title", { children: "Dinners & Events | Local Effort" }),
    /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
      "meta",
      {
        name: "description",
        content: "Let Local Effort cater your next event. We specialize in in-home dining for parties of 2 to 50."
      }
    )
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "space-y-16", children: [
    /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("h2", { className: "text-5xl md:text-7xl font-bold uppercase", children: "Dinners & Events" }),
    /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("p", { className: "font-mono text-lg max-w-3xl", children: "We bring our passion for food and hospitality to your home or venue. We specialize in cooking for parties from 2 to 50 people." })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { className: "container mx-auto px-4 py-8", children: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(PhotoGrid, { tags: ["dinner", "event"], title: "Dinners & events photos", perPage: 24 }) })
] });
var EventsPage_default = EventsPage;

// src/pages/MealPrepPage.jsx
var import_react32 = __toESM(require("react"));
var import_react_helmet_async9 = __toESM(require_lib());

// src/components/common/VennDiagram.jsx
var import_react26 = __toESM(require("react"));
var import_jsx_runtime22 = require("react/jsx-runtime");
var VennDiagram = () => {
  const svgStyle = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: "10px"
  };
  const circleStyle = { mixBlendMode: "multiply" };
  const labelStyle = { fontSize: "10px", fontWeight: "bold", fill: "#000", textAnchor: "middle" };
  const centerLabelStyle = { ...labelStyle, fontSize: "8px", fill: "#FFFFFF" };
  return /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("svg", { viewBox: "0 0 300 200", xmlns: "http://www.w3.org/2000/svg", style: svgStyle, children: [
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("circle", { cx: "115", cy: "120", r: "50", fill: "#fde047", style: circleStyle }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("circle", { cx: "185", cy: "120", r: "50", fill: "#67e8f9", style: circleStyle }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("circle", { cx: "150", cy: "70", r: "50", fill: "#fca5a5", style: circleStyle }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("text", { x: "100", y: "130", style: labelStyle, children: "Cost Efficiency" }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("text", { x: "200", y: "130", style: labelStyle, children: "Local Ingredients" }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("text", { x: "150", y: "55", style: labelStyle, children: "Perfect Nutrition" }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("text", { x: "150", y: "105", style: centerLabelStyle, children: "Foundation" }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("text", { x: "150", y: "115", style: centerLabelStyle, children: "Meal Plan" })
  ] });
};

// src/hooks/useAuthUser.js
var import_react27 = require("react");
init_firebaseConfig();
var import_auth2 = require("firebase/auth");
function useAuthUser() {
  const [user, setUser] = (0, import_react27.useState)(null);
  const [loading, setLoading] = (0, import_react27.useState)(true);
  (0, import_react27.useEffect)(() => {
    if (!auth) {
      setLoading(false);
      return () => {
      };
    }
    const unsub = (0, import_auth2.onAuthStateChanged)(auth, (u) => {
      setUser(u || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  return { user, loading };
}

// src/components/mealprep/AuthButtons.jsx
var import_react28 = __toESM(require("react"));
init_firebaseConfig();
var import_jsx_runtime23 = require("react/jsx-runtime");
function AuthButtons({ user }) {
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { className: "flex items-center gap-3", children: !auth ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "text-sm text-gray-600", children: "Sign-in unavailable" }) : user ? /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(import_jsx_runtime23.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("span", { className: "text-sm text-gray-700", children: [
      "Hi, ",
      user.displayName || user.email
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { onClick: signOutUser, className: "px-3 py-2 text-sm rounded border", children: "Sign out" })
  ] }) : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { onClick: signInWithGoogle, className: "px-3 py-2 text-sm rounded border", children: "Sign in" }) });
}

// src/pages/MealPrepPage.jsx
init_firebaseConfig();

// src/components/mealprep/MenuList.jsx
var import_react29 = __toESM(require("react"));
var import_jsx_runtime24 = require("react/jsx-runtime");
function MenuList({ menus, onSelect }) {
  if (!menus || menus.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("p", { className: "text-gray-600", children: "No menus yet." });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("ul", { className: "divide-y divide-gray-200 border rounded-md", children: menus.map((m) => /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("li", { className: "p-4 flex items-center justify-between", children: [
    /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("p", { className: "font-semibold", children: m.clientName }),
      /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)("p", { className: "text-sm text-gray-500", children: [
        "Week of ",
        m.date
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(
      "button",
      {
        type: "button",
        className: "px-3 py-1 rounded bg-gray-900 text-white text-sm",
        onClick: () => onSelect && onSelect(m),
        children: "View"
      }
    )
  ] }, m._id)) });
}

// src/components/mealprep/MenuDetail.jsx
var import_react30 = __toESM(require("react"));
var import_jsx_runtime25 = require("react/jsx-runtime");
function MenuDetail({ menu, onBack }) {
  if (!menu) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("div", { className: "space-y-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("button", { onClick: onBack, className: "text-sm text-blue-600", children: "\u2190 Back" }),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("h4", { className: "text-2xl font-bold", children: menu.clientName }),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsxs)("p", { className: "text-gray-600", children: [
      "Week of ",
      menu.date
    ] }),
    menu.notes && /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("p", { className: "italic text-gray-700", children: menu.notes }),
    /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("ul", { className: "list-disc ml-6", children: menu.menu?.map((item, idx) => /* @__PURE__ */ (0, import_jsx_runtime25.jsx)("li", { children: item }, idx)) })
  ] });
}

// src/components/mealprep/Comments.jsx
var import_react31 = __toESM(require("react"));
init_firebaseConfig();
var import_firestore3 = require("firebase/firestore");
var import_jsx_runtime26 = require("react/jsx-runtime");
function Comments({ menuId, user }) {
  const [comments, setComments] = (0, import_react31.useState)([]);
  const [text, setText] = (0, import_react31.useState)("");
  const inputRef = (0, import_react31.useRef)(null);
  (0, import_react31.useEffect)(() => {
    if (!menuId || !db) return;
    const q = (0, import_firestore3.query)((0, import_firestore3.collection)(db, "mealprep_comments", menuId, "comments"), (0, import_firestore3.orderBy)("createdAt", "desc"));
    const unsub = (0, import_firestore3.onSnapshot)(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [menuId]);
  const submit = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    if (!db) return;
    await (0, import_firestore3.addDoc)((0, import_firestore3.collection)(db, "mealprep_comments", menuId, "comments"), {
      body,
      createdAt: (0, import_firestore3.serverTimestamp)(),
      uid: user?.uid || null,
      name: user?.displayName || "Anonymous"
    });
    setText("");
    inputRef.current?.focus();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("div", { className: "mt-8 border-t pt-4", children: [
    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("h5", { className: "font-semibold mb-2", children: "Comments" }),
    user ? /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("form", { onSubmit: submit, className: "flex gap-2 mb-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)(
        "input",
        {
          ref: inputRef,
          value: text,
          onChange: (e) => setText(e.target.value),
          className: "flex-1 border rounded px-3 py-2",
          placeholder: "Leave a comment"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("button", { className: "px-3 py-2 bg-gray-900 text-white rounded", type: "submit", children: "Post" })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("p", { className: "text-sm text-gray-600", children: "Sign in to comment." }),
    /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("ul", { className: "space-y-3", children: comments.map((c) => /* @__PURE__ */ (0, import_jsx_runtime26.jsxs)("li", { className: "border rounded p-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("p", { className: "text-sm text-gray-500", children: c.name || "Anon" }),
      /* @__PURE__ */ (0, import_jsx_runtime26.jsx)("p", { children: c.body })
    ] }, c.id)) })
  ] });
}

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
  const name = (user.displayName || "").toLowerCase();
  for (const c of mealPrepClients) {
    for (const e of c.emails) {
      if (email && e && email === String(e).toLowerCase()) return c.clientName;
    }
  }
  if (name.includes("sanjay")) return "Sanjay";
  if (name.includes("shelley")) return "Shelley";
  if (name.includes("david") || name.includes("allison")) return "David and Allison";
  return null;
}

// src/utils/userProfiles.js
init_firebaseConfig();
var import_firestore4 = require("firebase/firestore");
async function saveUserProfile(uid, data) {
  if (!db || !uid) return null;
  const ref = (0, import_firestore4.doc)(db, "userProfiles", uid);
  const payload = {
    uid,
    ...data,
    updatedAt: import_firestore4.serverTimestamp ? (0, import_firestore4.serverTimestamp)() : /* @__PURE__ */ new Date()
  };
  await (0, import_firestore4.setDoc)(ref, payload, { merge: true });
  return payload;
}
async function getUserProfile(uid) {
  if (!db || !uid) return null;
  const ref = (0, import_firestore4.doc)(db, "userProfiles", uid);
  const snap = await (0, import_firestore4.getDoc)(ref);
  return snap.exists() ? snap.data() : null;
}

// src/pages/MealPrepPage.jsx
var import_jsx_runtime27 = require("react/jsx-runtime");
var MealPrepPage = () => {
  const { user } = useAuthUser();
  const [menus, setMenus] = (0, import_react32.useState)([]);
  const [loading, setLoading] = (0, import_react32.useState)(false);
  const [error, setError] = (0, import_react32.useState)(null);
  const [selected, setSelected] = (0, import_react32.useState)(null);
  const [filterName] = (0, import_react32.useState)("");
  const [assignedClient, setAssignedClient] = (0, import_react32.useState)(null);
  const [openSection, setOpenSection] = (0, import_react32.useState)(null);
  (0, import_react32.useEffect)(() => {
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
  (0, import_react32.useEffect)(() => {
    let mounted = true;
    if (!user) {
      setMenus([]);
      setLoading(false);
      setError(null);
      return () => {
        mounted = false;
      };
    }
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
  const filtered = (0, import_react32.useMemo)(() => {
    const base = assignedClient ? menus.filter((m) => (m.clientName || "").toLowerCase() === assignedClient.toLowerCase()) : menus;
    const q = filterName.trim().toLowerCase();
    if (!q) return base;
    return base.filter((m) => (m.clientName || "").toLowerCase().includes(q));
  }, [menus, filterName, assignedClient]);
  return /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)(import_jsx_runtime27.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)(import_react_helmet_async9.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("title", { children: "Weekly Meal Prep | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
        "meta",
        {
          name: "description",
          content: "Our Foundation Meal Plan provides 21 nutritious meals per week from local Midwest sources."
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "space-y-8", children: [
      /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("h2", { className: "text-4xl md:text-6xl font-bold uppercase", children: "Weekly Meal Prep" }),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("div", { className: "flex items-center gap-3", children: user ? /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(AuthButtons, { user }) : auth ? /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
          "button",
          {
            type: "button",
            className: "btn btn-primary",
            onClick: async () => {
              try {
                await signInWithGoogle();
              } catch (e) {
                alert(`Sign-in unavailable: ${e?.message || e}`);
              }
            },
            children: "Sign in"
          }
        ) : null })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("p", { className: "font-mono text-lg max-w-3xl", children: "Basic, good nutrition from local Midwest sources. We offer a Foundation Plan and are happy to create custom plans for any diet." }),
      user && /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "flex gap-2 items-center text-sm text-gray-700", children: [
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("a", { href: "#menus", className: "underline", children: "View current menus" }),
        assignedClient ? /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("span", { children: [
          "for ",
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("strong", { children: assignedClient })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("span", { className: "italic", children: "no client assigned yet" })
      ] }),
      user && /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("section", { id: "menus", className: "space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("h3", { className: "text-2xl font-bold", children: "Current Menus" }),
        loading ? /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("p", { children: "Loading menus\u2026" }) : error ? /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "text-red-700 bg-red-50 border border-red-200 p-3 rounded", children: [
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("p", { className: "font-semibold", children: error }),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("p", { className: "text-sm mt-1", children: "If this persists, ensure Sanity env vars are set on the web app (VITE_APP_SANITY_PROJECT_ID, VITE_APP_SANITY_DATASET) and that the Studio has the new Meal Prep Menu content." })
        ] }) : !selected ? /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(MenuList, { menus: filtered, onSelect: setSelected }) : /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(MenuDetail, { menu: selected, onBack: () => setSelected(null) }),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(Comments, { menuId: selected._id, user })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(PhotoGrid, { tags: "mealplan", title: "Meal plan photos", perPage: 24 }),
      /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "grid md:grid-cols-2 gap-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "border border-gray-900 rounded-md overflow-hidden", children: [
          /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)(
            "button",
            {
              type: "button",
              className: "w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100",
              onClick: () => setOpenSection(openSection === "foundation" ? null : "foundation"),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("span", { className: "text-xl font-bold", children: "Foundation Meal Plan" }),
                /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("span", { className: "text-sm text-gray-600", children: openSection === "foundation" ? "Hide \u25B2" : "View More \u25BC" })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
            "div",
            {
              className: `transition-[max-height,opacity] duration-300 ease-in-out ${openSection === "foundation" ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`,
              children: /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "p-6", children: [
                /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(VennDiagram, {}),
                /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("p", { className: "font-mono mt-6 max-w-2xl", children: "Inspired by the 'Protocol' by Bryan Johnson, this plan provides up to 21 meals/week at ~1800 calories/day." })
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "border border-gray-900 rounded-md overflow-hidden", children: [
          /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)(
            "button",
            {
              type: "button",
              className: "w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100",
              onClick: () => setOpenSection(openSection === "custom" ? null : "custom"),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("span", { className: "text-xl font-bold", children: "Custom Plan" }),
                /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("span", { className: "text-sm text-gray-600", children: openSection === "custom" ? "Hide \u25B2" : "View More \u25BC" })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(
            "div",
            {
              className: `transition-[max-height,opacity] duration-300 ease-in-out ${openSection === "custom" ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`,
              children: /* @__PURE__ */ (0, import_jsx_runtime27.jsxs)("div", { className: "p-6", children: [
                /* @__PURE__ */ (0, import_jsx_runtime27.jsx)(VennDiagram, {}),
                /* @__PURE__ */ (0, import_jsx_runtime27.jsx)("p", { className: "font-mono mt-6 max-w-2xl", children: "We tailor plans to your needs (gluten-free, vegetarian, high-protein, etc.). Tell us your goals and preferences and we\u2019ll propose a weekly plan and schedule." })
              ] })
            }
          )
        ] })
      ] })
    ] })
  ] });
};
var MealPrepPage_default = MealPrepPage;

// src/pages/PartnerPortalPage.jsx
var import_react33 = __toESM(require("react"));
var import_react_helmet_async10 = __toESM(require_lib());
var import_react_router_dom5 = require("react-router-dom");

// src/config/partnerTools.js
var import_meta6 = {};
var PARTNER_TOOLS = [
  {
    key: "happymonday",
    name: "Happy Monday",
    description: "Menu management and feedback collector.",
    type: "internal",
    route: "/partners/happy-monday",
    icon: "ClipboardList"
  },
  {
    key: "inbox",
    name: "Inbox",
    description: "Mailbox (Brevo) for inbound messages.",
    type: "internal",
    route: "/inbox",
    icon: "Inbox"
  },
  {
    key: "studio",
    name: "Sanity Studio",
    description: "Content management studio (opens in new tab).",
    type: "external",
    href: "/studio",
    icon: "FileText"
  },
  {
    key: "zafa",
    name: "ZAFA Events",
    description: "Events management utilities for ZAFA.",
    type: "internal",
    route: "/partners/zafa-events",
    icon: "Calendar"
    // Source pending: add local-effort-zafa-events/src and embed its App here.
  },
  {
    key: "gallant",
    name: "Gallant Hawking",
    description: "Landing builder / micro-site utilities.",
    type: "internal",
    route: "/partners/gallant-hawking",
    icon: "LayoutDashboard"
    // Embedded directly via component import
  }
];
function hasAccess(profile, toolKey) {
  const roles = profile && (profile.roles || profile.tools || profile.apps) || [];
  if (roles === "all") return true;
  if (Array.isArray(roles) && (roles.includes("admin") || roles.includes("owner"))) return true;
  return Array.isArray(roles) ? roles.includes(toolKey) : false;
}
function isAdminProfile(profile) {
  const roles = profile && (profile.roles || profile.tools || profile.apps) || [];
  if (roles === "all") return true;
  return Array.isArray(roles) && (roles.includes("admin") || roles.includes("owner"));
}
function isAdminEmail(email) {
  if (!email) return false;
  const list = (import_meta6?.env?.VITE_ADMIN_EMAILS || import_meta6?.env?.VITE_OWNER_EMAILS || "").split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(String(email).toLowerCase());
}

// src/pages/PartnerPortalPage.jsx
var Icons = __toESM(require("lucide-react"));
var import_jsx_runtime28 = require("react/jsx-runtime");
var PartnerPortalPage = () => {
  const { user, loading } = useAuthUser();
  const [profile, setProfile] = import_react33.default.useState(null);
  const [pLoading, setPLoading] = import_react33.default.useState(false);
  import_react33.default.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return setProfile(null);
      setPLoading(true);
      try {
        const p = await getUserProfile(user.uid);
        if (!cancelled) setProfile(p || null);
      } finally {
        if (!cancelled) setPLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);
  return /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)(import_jsx_runtime28.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)(import_react_helmet_async10.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("title", { children: "Partner Portal | Local Effort" }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("meta", { name: "description", content: "Tools and resources for Local Effort partners." })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("h2", { className: "text-5xl md:text-7xl font-bold uppercase", children: "Partner Portal" }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("p", { className: "text-body max-w-2xl", children: "Welcome. Sign in to see your tools, or jump to the portal welcome." }),
      !loading && !user && /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("div", { className: "p-6 border rounded-md max-w-xl bg-neutral-50", children: [
        /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("h3", { className: "text-xl font-semibold mb-2", children: "Sign in required" }),
        /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("p", { className: "mb-4 text-gray-600", children: "Use your Google account to continue." }),
        /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("div", { className: "flex gap-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(import_react_router_dom5.Link, { to: "/auth", className: "inline-block px-4 py-2 rounded bg-black text-white", children: "Sign in" }),
          /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(import_react_router_dom5.Link, { to: "/partner-portal/welcome", className: "inline-block px-4 py-2 rounded border", children: "Portal welcome" })
        ] })
      ] }),
      user && /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(ToolGrid, { profile, user, loading: pLoading })
    ] })
  ] });
};
var PartnerPortalPage_default = PartnerPortalPage;
function ToolGrid({ profile, user }) {
  const isAdmin = isAdminProfile(profile) || isAdminEmail(user?.email);
  const visible = isAdmin ? PARTNER_TOOLS : PARTNER_TOOLS.filter((t) => hasAccess(profile, t.key));
  return /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: visible.map((t) => {
    const Icon = Icons[t.icon] || Icons.AppWindow;
    const isExternal = t.type === "external" && t.href;
    const content = /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("div", { className: "group block p-5 border rounded-xl hover:shadow transition bg-white", children: /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("span", { className: "inline-flex items-center justify-center w-10 h-10 rounded-lg bg-neutral-100 group-hover:bg-neutral-200", children: /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(Icon, { className: "w-5 h-5 text-neutral-800" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime28.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("div", { className: "font-semibold", children: t.name }),
        /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("div", { className: "text-sm text-neutral-600", children: t.description })
      ] })
    ] }) });
    return isExternal ? /* @__PURE__ */ (0, import_jsx_runtime28.jsx)("a", { href: t.href, target: "_blank", rel: "noopener noreferrer", children: content }, t.key) : /* @__PURE__ */ (0, import_jsx_runtime28.jsx)(import_react_router_dom5.Link, { to: t.route, children: content }, t.key);
  }) });
}

// src/pages/PartnerPortalWelcome.jsx
var import_react34 = __toESM(require("react"));
var import_react_helmet_async11 = __toESM(require_lib());
var import_react_router_dom6 = require("react-router-dom");
var Icons2 = __toESM(require("lucide-react"));
var import_jsx_runtime29 = require("react/jsx-runtime");
function PartnerPortalWelcome() {
  const { user, loading } = useAuthUser();
  const [profile, setProfile] = import_react34.default.useState(null);
  const [pLoading, setPLoading] = import_react34.default.useState(false);
  import_react34.default.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return setProfile(null);
      setPLoading(true);
      try {
        const p = await getUserProfile(user.uid);
        if (!cancelled) setProfile(p || null);
      } finally {
        if (!cancelled) setPLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);
  return /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)(import_jsx_runtime29.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)(import_react_helmet_async11.Helmet, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("title", { children: "Partner Portal | Welcome" }),
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("meta", { name: "description", content: "Local Effort partner tools and resources." })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("div", { className: "space-y-6", children: [
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("h2", { className: "text-5xl md:text-7xl font-bold uppercase", children: "Partner Portal" }),
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("p", { className: "text-body max-w-2xl", children: "Welcome! Access tools and resources for partners. Sign in to see your tools." }),
      !loading && !user && /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("div", { className: "p-6 border rounded-md max-w-xl bg-neutral-50", children: [
        /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("h3", { className: "text-xl font-semibold mb-2", children: "Sign in required" }),
        /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("p", { className: "mb-4 text-gray-600", children: "Use your Google account to continue." }),
        /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(import_react_router_dom6.Link, { to: "/auth", className: "inline-block px-4 py-2 rounded bg-black text-white", children: "Continue with Google" })
      ] }),
      user && /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(ToolGrid2, { profile, loading: pLoading })
    ] })
  ] });
}
function ToolGrid2({ profile }) {
  const { user } = useAuthUser();
  const isAdmin = isAdminProfile(profile) || isAdminEmail(user?.email);
  const visible = isAdmin ? PARTNER_TOOLS : PARTNER_TOOLS.filter((t) => hasAccess(profile, t.key));
  return /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: visible.map((t) => {
    const Icon = Icons2[t.icon] || Icons2.AppWindow;
    const isExternal = t.type === "external" && t.href;
    const content = /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "group block p-5 border rounded-xl hover:shadow transition bg-white", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("span", { className: "inline-flex items-center justify-center w-10 h-10 rounded-lg bg-neutral-100 group-hover:bg-neutral-200", children: /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(Icon, { className: "w-5 h-5 text-neutral-800" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime29.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "font-semibold", children: t.name }),
        /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("div", { className: "text-sm text-neutral-600", children: t.description })
      ] })
    ] }) });
    return isExternal ? /* @__PURE__ */ (0, import_jsx_runtime29.jsx)("a", { href: t.href, target: "_blank", rel: "noopener noreferrer", children: content }, t.key) : /* @__PURE__ */ (0, import_jsx_runtime29.jsx)(import_react_router_dom6.Link, { to: t.route, children: content }, t.key);
  }) });
}

// src/ssr/StaticApp.jsx
var import_jsx_runtime30 = require("react/jsx-runtime");
function StaticApp() {
  return /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_react_helmet_async12.HelmetProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)("div", { className: "app-root min-h-screen flex flex-col", children: [
    /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(Header, {}),
    /* @__PURE__ */ (0, import_jsx_runtime30.jsx)("main", { className: "flex-1", children: /* @__PURE__ */ (0, import_jsx_runtime30.jsxs)(import_react_router_dom7.Routes, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_react_router_dom7.Route, { path: "/", element: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(HomePage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_react_router_dom7.Route, { path: "/about", element: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(AboutUsPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_react_router_dom7.Route, { path: "/services", element: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(ServicesPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_react_router_dom7.Route, { path: "/pricing", element: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(PricingPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_react_router_dom7.Route, { path: "/menu", element: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(MenuPage, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_react_router_dom7.Route, { path: "/happy-monday", element: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(HappyMondayPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_react_router_dom7.Route, { path: "/gallery", element: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(GalleryPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_react_router_dom7.Route, { path: "/events", element: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(EventsPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_react_router_dom7.Route, { path: "/meal-prep", element: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(MealPrepPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_react_router_dom7.Route, { path: "/partner-portal", element: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(PartnerPortalPage_default, {}) }),
      /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(import_react_router_dom7.Route, { path: "/partner-portal/welcome", element: /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(PartnerPortalWelcome, {}) })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime30.jsx)(Footer, {})
  ] }) });
}
