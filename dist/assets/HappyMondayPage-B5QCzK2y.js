import{I as Ea,J as yu,K as vu,A as L,B as un,F as Eu,r as he,W as Tu,N as Iu,G as wu}from"./index-LrDjm4qp.js";import{s as so}from"./sanityClient-4FcahZR4.js";/*
object-assign
(c) Sindre Sorhus
@license MIT
*/var Wr,oo;function Le(){if(oo)return Wr;oo=1;var n=Object.getOwnPropertySymbols,t=Object.prototype.hasOwnProperty,e=Object.prototype.propertyIsEnumerable;function r(o){if(o==null)throw new TypeError("Object.assign cannot be called with null or undefined");return Object(o)}function s(){try{if(!Object.assign)return!1;var o=new String("abc");if(o[5]="de",Object.getOwnPropertyNames(o)[0]==="5")return!1;for(var l={},c=0;c<10;c++)l["_"+String.fromCharCode(c)]=c;var d=Object.getOwnPropertyNames(l).map(function(E){return l[E]});if(d.join("")!=="0123456789")return!1;var g={};return"abcdefghijklmnopqrst".split("").forEach(function(E){g[E]=E}),Object.keys(Object.assign({},g)).join("")==="abcdefghijklmnopqrst"}catch{return!1}}return Wr=s()?Object.assign:function(o,l){for(var c,d=r(o),g,E=1;E<arguments.length;E++){c=Object(arguments[E]);for(var w in c)t.call(c,w)&&(d[w]=c[w]);if(n){g=n(c);for(var T=0;T<g.length;T++)e.call(c,g[T])&&(d[g[T]]=c[g[T]])}}return d},Wr}var Qr,ao;function Au(){if(ao)return Qr;ao=1;var n="https://docs.sanity.io/help/";return Qr=function(e){return n+e},Qr}var Wn={exports:{}},Su=Wn.exports,lo;function bu(){return lo||(lo=1,(function(n,t){(function(e,r){n.exports=r()})(Su,(function(){function e(){return e=Object.assign||function(p){for(var m=1;m<arguments.length;m++){var y=arguments[m];for(var h in y)Object.prototype.hasOwnProperty.call(y,h)&&(p[h]=y[h])}return p},e.apply(this,arguments)}function r(p,m){if(p){if(typeof p=="string")return s(p,m);var y=Object.prototype.toString.call(p).slice(8,-1);if(y==="Object"&&p.constructor&&(y=p.constructor.name),y==="Map"||y==="Set")return Array.from(p);if(y==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(y))return s(p,m)}}function s(p,m){(m==null||m>p.length)&&(m=p.length);for(var y=0,h=new Array(m);y<m;y++)h[y]=p[y];return h}function o(p){var m=0;if(typeof Symbol>"u"||p[Symbol.iterator]==null){if(Array.isArray(p)||(p=r(p)))return function(){return m>=p.length?{done:!0}:{done:!1,value:p[m++]}};throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}return m=p[Symbol.iterator](),m.next.bind(m)}var l="image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg";function c(p){var m=p.split("-"),y=m[1],h=m[2],x=m[3];if(!y||!h||!x)throw new Error("Malformed asset _ref '"+p+`'. Expected an id like "`+l+'".');var k=h.split("x"),B=k[0],Q=k[1],at=+B,dt=+Q,vt=isFinite(at)&&isFinite(dt);if(!vt)throw new Error("Malformed asset _ref '"+p+`'. Expected an id like "`+l+'".');return{id:y,width:at,height:dt,format:x}}var d=function(m){var y=m;return y?typeof y._ref=="string":!1},g=function(m){var y=m;return y?typeof y._id=="string":!1},E=function(m){var y=m;return y&&y.asset?typeof y.asset.url=="string":!1};function w(p){if(!p)return null;var m;if(typeof p=="string"&&T(p))m={asset:{_ref:C(p)}};else if(typeof p=="string")m={asset:{_ref:p}};else if(d(p))m={asset:p};else if(g(p))m={asset:{_ref:p._id||""}};else if(E(p))m={asset:{_ref:C(p.asset.url)}};else if(typeof p.asset=="object")m=p;else return null;var y=p;return y.crop&&(m.crop=y.crop),y.hotspot&&(m.hotspot=y.hotspot),D(m)}function T(p){return/^https?:\/\//.test(""+p)}function C(p){var m=p.split("/").slice(-1);return("image-"+m[0]).replace(/\.([a-z]+)$/,"-$1")}function D(p){if(p.crop&&p.hotspot)return p;var m=e({},p);return m.crop||(m.crop={left:0,top:0,bottom:0,right:0}),m.hotspot||(m.hotspot={x:.5,y:.5,height:1,width:1}),m}var M=[["width","w"],["height","h"],["format","fm"],["download","dl"],["blur","blur"],["sharpen","sharp"],["invert","invert"],["orientation","or"],["minHeight","min-h"],["maxHeight","max-h"],["minWidth","min-w"],["maxWidth","max-w"],["quality","q"],["fit","fit"],["crop","crop"],["saturation","sat"],["auto","auto"],["dpr","dpr"],["pad","pad"]];function N(p){var m=e({},p||{}),y=m.source;delete m.source;var h=w(y);if(!h)return null;var x=h.asset._ref||h.asset._id||"",k=c(x),B=Math.round(h.crop.left*k.width),Q=Math.round(h.crop.top*k.height),at={left:B,top:Q,width:Math.round(k.width-h.crop.right*k.width-B),height:Math.round(k.height-h.crop.bottom*k.height-Q)},dt=h.hotspot.height*k.height/2,vt=h.hotspot.width*k.width/2,Nt=h.hotspot.x*k.width,ct=h.hotspot.y*k.height,Y={left:Nt-vt,top:ct-dt,right:Nt+vt,bottom:ct+dt};return m.rect||m.focalPoint||m.ignoreImageParams||m.crop||(m=e(e({},m),$({crop:at,hotspot:Y},m))),j(e(e({},m),{},{asset:k}))}function j(p){var m=p.baseUrl||"https://cdn.sanity.io",y=p.asset.id+"-"+p.asset.width+"x"+p.asset.height+"."+p.asset.format,h=m+"/images/"+p.projectId+"/"+p.dataset+"/"+y,x=[];if(p.rect){var k=p.rect,B=k.left,Q=k.top,at=k.width,dt=k.height,vt=B!==0||Q!==0||dt!==p.asset.height||at!==p.asset.width;vt&&x.push("rect="+B+","+Q+","+at+","+dt)}p.bg&&x.push("bg="+p.bg),p.focalPoint&&(x.push("fp-x="+p.focalPoint.x),x.push("fp-y="+p.focalPoint.y));var Nt=[p.flipHorizontal&&"h",p.flipVertical&&"v"].filter(Boolean).join("");return Nt&&x.push("flip="+Nt),M.forEach(function(ct){var Y=ct[0],zt=ct[1];typeof p[Y]<"u"?x.push(zt+"="+encodeURIComponent(p[Y])):typeof p[zt]<"u"&&x.push(zt+"="+encodeURIComponent(p[zt]))}),x.length===0?h:h+"?"+x.join("&")}function $(p,m){var y,h=m.width,x=m.height;if(!(h&&x))return{width:h,height:x,rect:p.crop};var k=p.crop,B=p.hotspot,Q=h/x,at=k.width/k.height;if(at>Q){var dt=k.height,vt=dt*Q,Nt=k.top,ct=(B.right-B.left)/2+B.left,Y=ct-vt/2;Y<k.left?Y=k.left:Y+vt>k.left+k.width&&(Y=k.left+k.width-vt),y={left:Math.round(Y),top:Math.round(Nt),width:Math.round(vt),height:Math.round(dt)}}else{var zt=k.width,Ft=zt/Q,Ar=k.left,Te=(B.bottom-B.top)/2+B.top,se=Te-Ft/2;se<k.top?se=k.top:se+Ft>k.top+k.height&&(se=k.top+k.height-Ft),y={left:Math.max(0,Math.floor(Ar)),top:Math.max(0,Math.floor(se)),width:Math.round(zt),height:Math.round(Ft)}}return{width:h,height:x,rect:y}}var H=["clip","crop","fill","fillmax","max","scale","min"],P=["top","bottom","left","right","center","focalpoint","entropy"],U=["format"];function G(p){return p?typeof p.clientConfig=="object":!1}function I(p){for(var m=M,y=o(m),h;!(h=y()).done;){var x=h.value,k=x[0],B=x[1];if(p===k||p===B)return k}return p}function _(p){var m=p;if(G(m)){var y=m.clientConfig,h=y.apiHost,x=y.projectId,k=y.dataset,B=h||"https://api.sanity.io";return new v(null,{baseUrl:B.replace(/^https:\/\/api\./,"https://cdn."),projectId:x,dataset:k})}return new v(null,p)}var v=(function(){function p(y,h){this.options=y?e(e({},y.options||{}),h||{}):e({},h||{})}var m=p.prototype;return m.withOptions=function(h){var x=h.baseUrl||this.options.baseUrl,k={baseUrl:x};for(var B in h)if(h.hasOwnProperty(B)){var Q=I(B);k[Q]=h[B]}return new p(this,e({baseUrl:x},k))},m.image=function(h){return this.withOptions({source:h})},m.dataset=function(h){return this.withOptions({dataset:h})},m.projectId=function(h){return this.withOptions({projectId:h})},m.bg=function(h){return this.withOptions({bg:h})},m.dpr=function(h){return this.withOptions({dpr:h})},m.width=function(h){return this.withOptions({width:h})},m.height=function(h){return this.withOptions({height:h})},m.focalPoint=function(h,x){return this.withOptions({focalPoint:{x:h,y:x}})},m.maxWidth=function(h){return this.withOptions({maxWidth:h})},m.minWidth=function(h){return this.withOptions({minWidth:h})},m.maxHeight=function(h){return this.withOptions({maxHeight:h})},m.minHeight=function(h){return this.withOptions({minHeight:h})},m.size=function(h,x){return this.withOptions({width:h,height:x})},m.blur=function(h){return this.withOptions({blur:h})},m.sharpen=function(h){return this.withOptions({sharpen:h})},m.rect=function(h,x,k,B){return this.withOptions({rect:{left:h,top:x,width:k,height:B}})},m.format=function(h){return this.withOptions({format:h})},m.invert=function(h){return this.withOptions({invert:h})},m.orientation=function(h){return this.withOptions({orientation:h})},m.quality=function(h){return this.withOptions({quality:h})},m.forceDownload=function(h){return this.withOptions({download:h})},m.flipHorizontal=function(){return this.withOptions({flipHorizontal:!0})},m.flipVertical=function(){return this.withOptions({flipVertical:!0})},m.ignoreImageParams=function(){return this.withOptions({ignoreImageParams:!0})},m.fit=function(h){if(H.indexOf(h)===-1)throw new Error('Invalid fit mode "'+h+'"');return this.withOptions({fit:h})},m.crop=function(h){if(P.indexOf(h)===-1)throw new Error('Invalid crop mode "'+h+'"');return this.withOptions({crop:h})},m.saturation=function(h){return this.withOptions({saturation:h})},m.auto=function(h){if(U.indexOf(h)===-1)throw new Error('Invalid auto mode "'+h+'"');return this.withOptions({auto:h})},m.pad=function(h){return this.withOptions({pad:h})},m.url=function(){return N(this.options)},m.toString=function(){return this.url()},p})();return _}))})(Wn)),Wn.exports}var Xr,uo;function Ta(){if(uo)return Xr;uo=1;var n=Au(),t=bu(),e=Le(),r=encodeURIComponent,s="You must either:\n  - Pass `projectId` and `dataset` to the block renderer\n  - Materialize images to include the `url` field.\n\nFor more information, see ".concat(n("block-content-image-materializing")),o=function(d){var g=d.imageOptions,E=Object.keys(g);if(!E.length)return"";var w=E.map(function(T){return"".concat(r(T),"=").concat(r(g[T]))});return"?".concat(w.join("&"))},l=function(d){var g=d.node,E=d.options,w=E.projectId,T=E.dataset,C=g.asset;if(!C)throw new Error("Image does not have required `asset` property");if(C.url)return C.url+o(E);if(!w||!T)throw new Error(s);var D=C._ref;if(!D)throw new Error("Invalid image reference in block, no `_ref` found on `asset`");return t(e({projectId:w,dataset:T},E.imageOptions||{})).image(g).toString()};return Xr=l,Xr}var Jr,co;function Ru(){if(co)return Jr;co=1;var n=Le(),t=Ta();return Jr=function(e,r){var s=r||{useDashedStyles:!1};function o(P){var U=P.node,G=P.serializers,I=P.options,_=P.isInline,v=P.children,p=U._type,m=G.types[p];if(!m){if(I.ignoreUnknownTypes)return console.warn('Unknown block type "'.concat(p,'", please specify a serializer for it in the `serializers.types` prop')),e(G.unknownType,{node:U,options:I,isInline:_},v);throw new Error('Unknown block type "'.concat(p,'", please specify a serializer for it in the `serializers.types` prop'))}return e(m,{node:U,options:I,isInline:_},v)}function l(P){var U=P.node,G=U.mark,I=U.children,_=typeof G=="string",v=_?G:G._type,p=P.serializers.marks[v];return p?e(p,P.node,I):(console.warn('Unknown mark type "'.concat(v,'", please specify a serializer for it in the `serializers.marks` prop')),e(P.serializers.unknownMark,null,I))}function c(P){var U=P.type==="bullet"?"ul":"ol";return e(U,null,P.children)}function d(P){var U=!P.node.style||P.node.style==="normal"?P.children:e(P.serializers.types.block,P,P.children);return e("li",null,U)}function g(P){return e("div",{style:{display:"none"}},'Unknown block type "'.concat(P.node._type,'", please specify a serializer for it in the `serializers.types` prop'))}function E(P){var U=P.node.style||"normal";return/^h\d/.test(U)?e(U,null,P.children):e(U==="blockquote"?"blockquote":"p",null,P.children)}function w(P,U){return e(P,null,U.children)}function T(P){var U=s.useDashedStyles?{"text-decoration":"underline"}:{textDecoration:"underline"};return e("span",{style:U},P.children)}function C(P){return e("del",null,P.children)}function D(P){return e("a",{href:P.mark.href},P.children)}function M(P){if(!P.node.asset)return null;var U=e("img",{src:t(P)});return P.isInline?U:e("figure",null,U)}function N(P,U,G,I){if(P===`
`&&U.hardBreak)return e(U.hardBreak,{key:"hb-".concat(G)});if(typeof P=="string")return U.text?e(U.text,{key:"text-".concat(G)},P):P;var _;P.children&&(_={children:P.children.map(function(p,m){return I.serializeNode(p,m,P.children,!0)})});var v=n({},P,_);return e(U.span,{key:P._key||"span-".concat(G),node:v,serializers:U})}var j=function(){return e("br")},$={strong:w.bind(null,"strong"),em:w.bind(null,"em"),code:w.bind(null,"code"),underline:T,"strike-through":C,link:D},H={types:{block:E,image:M},marks:$,list:c,listItem:d,block:o,span:l,hardBreak:j,unknownType:g,unknownMark:"span",container:"div",text:void 0,empty:""};return{defaultSerializers:H,serializeSpan:N}},Jr}var Yr,ho;function Cu(){if(ho)return Yr;ho=1;var n=["strong","em","code","underline","strike-through"],t=function(c){var d=c.children,g=c.markDefs;if(!d||!d.length)return[];var E=d.map(e),w={_type:"span",children:[]},T=[w];return d.forEach(function(C,D){var M=E[D];if(!M){var N=T[T.length-1];N.children.push(C);return}var j=1;if(T.length>1)for(j;j<T.length;j++){var $=T[j].markKey,H=M.indexOf($);if(H===-1)break;M.splice(H,1)}T=T.slice(0,j);var P=o(T);if(M.forEach(function(I){var _={_type:"span",_key:C._key,children:[],mark:g.find(function(v){return v._key===I})||I,markKey:I};P.children.push(_),T.push(_),P=_}),s(C)){for(var U=C.text.split(`
`),G=U.length;G-- >1;)U.splice(G,0,`
`);P.children=P.children.concat(U)}else P.children=P.children.concat(C)}),w.children};function e(l,c,d){if(!l.marks||l.marks.length===0)return l.marks||[];var g=l.marks.reduce(function(w,T){w[T]=w[T]?w[T]+1:1;for(var C=c+1;C<d.length;C++){var D=d[C];if(D.marks&&Array.isArray(D.marks)&&D.marks.indexOf(T)!==-1)w[T]++;else break}return w},{}),E=r.bind(null,g);return l.marks.slice().sort(E)}function r(l,c,d){var g=l[c]||0,E=l[d]||0;if(g!==E)return E-g;var w=n.indexOf(c),T=n.indexOf(d);return w!==T?w-T:c<d?-1:c>d?1:0}function s(l){return l._type==="span"&&typeof l.text=="string"&&(Array.isArray(l.marks)||typeof l.marks>"u")}function o(l){for(var c=l.length-1;c>=0;c--){var d=l[c];if(d._type==="span"&&d.children)return d}}return Yr=t,Yr}var Zr,fo;function Pu(){if(fo)return Zr;fo=1;var n=Le();function t(c){for(var d=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"html",g=[],E,w=0;w<c.length;w++){var T=c[w];if(!e(T)){g.push(T),E=null;continue}if(!E){E=s(T),g.push(E);continue}if(r(T,E)){E.children.push(T);continue}if(T.level>E.level){var C=s(T);if(d==="html"){var D=o(E),M=n({},D,{children:D.children.concat(C)});E.children[E.children.length-1]=M}else E.children.push(C);E=C;continue}if(T.level<E.level){var N=l(g[g.length-1],T);if(N){E=N,E.children.push(T);continue}E=s(T),g.push(E);continue}if(T.listItem!==E.listItem){var j=l(g[g.length-1],{level:T.level});if(j&&j.listItem===T.listItem){E=j,E.children.push(T);continue}else{E=s(T),g.push(E);continue}}console.warn("Unknown state encountered for block",T),g.push(T)}return g}function e(c){return!!c.listItem}function r(c,d){return c.level===d.level&&c.listItem===d.listItem}function s(c){return{_type:"list",_key:"".concat(c._key,"-parent"),level:c.level,listItem:c.listItem,children:[c]}}function o(c){return c.children&&c.children[c.children.length-1]}function l(c,d){var g=typeof d.listItem=="string";if(c._type==="list"&&c.level===d.level&&g&&c.listItem===d.listItem)return c;var E=o(c);return E?l(E,d):!1}return Zr=t,Zr}var ti,po;function Vu(){if(po)return ti;po=1;var n=Le();ti=function(r){return r.map(function(s){return s._key?s:n({_key:t(s)},s)})};function t(r){return e(JSON.stringify(r)).toString(36).replace(/[^A-Za-z0-9]/g,"")}function e(r){var s=0,o=r.length;if(o===0)return s;for(var l=0;l<o;l++)s=(s<<5)-s+r.charCodeAt(l),s&=s;return s}return ti}var ei,mo;function Ia(){if(mo)return ei;mo=1;function n(r){"@babel/helpers - typeof";return typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?n=function(o){return typeof o}:n=function(o){return o&&typeof Symbol=="function"&&o.constructor===Symbol&&o!==Symbol.prototype?"symbol":typeof o},n(r)}var t=Le(),e=function(s){return typeof s<"u"};return ei=function(s,o){return Object.keys(s).reduce(function(l,c){var d=n(s[c]);return d==="function"?l[c]=e(o[c])?o[c]:s[c]:d==="object"?l[c]=t({},s[c],o[c]):l[c]=typeof o[c]>"u"?s[c]:o[c],l},{})},ei}var ni,go;function Du(){if(go)return ni;go=1;var n=Le(),t=Cu(),e=Pu(),r=Vu(),s=Ia(),o=["projectId","dataset","imageOptions","ignoreUnknownTypes"],l=function(C){return typeof C<"u"},c={imageOptions:{},ignoreUnknownTypes:!0};function d(T,C,D,M){var N=n({},c,C),j=Array.isArray(N.blocks)?N.blocks:[N.blocks],$=r(j),H=e($,N.listNestMode),P=s(D,N.serializers||{}),U=o.reduce(function(x,k){var B=N[k];return l(B)&&(x[k]=B),x},{});function G(x,k,B,Q){return g(x)?p(x):E(x)?v(x,I(x,B)):w(x)?M(x,P,k,{serializeNode:G}):_(x,k,Q)}function I(x,k){for(var B=0,Q=0;Q<k.length;Q++){if(k[Q]===x)return B;E(k[Q])&&B++}return B}function _(x,k,B){var Q=t(x),at=Q.map(function(vt,Nt,ct){return G(vt,Nt,ct,!0)}),dt={key:x._key||"block-".concat(k),node:x,isInline:B,serializers:P,options:U};return T(P.block,dt,at)}function v(x,k){var B=x._key,Q=t(x),at=Q.map(G);return T(P.listItem,{node:x,serializers:P,index:k,key:B,options:U},at)}function p(x){var k=x.listItem,B=x.level,Q=x._key,at=x.children.map(G);return T(P.list,{key:Q,level:B,type:k,options:U},at)}var m=!!N.renderContainerOnSingleChild,y=H.map(G);if(m||y.length>1){var h=N.className?{className:N.className}:{};return T(P.container,h,y)}return y[0]?y[0]:typeof P.empty=="function"?T(P.empty):P.empty}function g(T){return T._type==="list"&&T.listItem}function E(T){return T._type==="block"&&T.listItem}function w(T){return typeof T=="string"||T.marks||T._type==="span"}return ni=d,ni}var ri,_o;function Nu(){if(_o)return ri;_o=1;var n=Ru(),t=Du(),e=Ta(),r=Ia();return ri={blocksToNodes:function(o,l,c,d){if(c)return t(o,l,c,d);var g=n(o);return t(o,l,g.defaultSerializers,g.serializeSpan)},getSerializers:n,getImageUrl:e,mergeSerializers:r},ri}var ii,yo;function wa(){return yo||(yo=1,ii=Nu()),ii}var si,vo;function xu(){if(vo)return si;vo=1;var n=Ea(),t=wa(),e=t.getSerializers,r=n.createElement,s=e(r),o=s.defaultSerializers,l=s.serializeSpan;return si={serializeSpan:l,serializers:o,renderProps:{nestMarks:!0}},si}var oi,Eo;function ku(){if(Eo)return oi;Eo=1;var n=Ea(),t=yu(),e=wa(),r=xu(),s=r.serializers,o=r.serializeSpan,l=r.renderProps,c=e.getImageUrl,d=e.blocksToNodes,g=e.mergeSerializers,E=n.createElement,w=function T(C){var D=g(T.defaultSerializers,C.serializers),M=Object.assign({},l,C,{serializers:D,blocks:C.blocks||[]});return d(E,M,s,o)};return w.defaultSerializers=s,w.getImageUrl=c,w.propTypes={className:t.string,renderContainerOnSingleChild:t.bool,ignoreUnknownTypes:t.bool,projectId:t.string,dataset:t.string,imageOptions:t.object,serializers:t.shape({types:t.object,marks:t.object,list:t.func,listItem:t.func,block:t.func,span:t.func}),blocks:t.oneOfType([t.arrayOf(t.shape({_type:t.string.isRequired})),t.shape({_type:t.string.isRequired})]).isRequired},w.defaultProps={ignoreUnknownTypes:!0,renderContainerOnSingleChild:!1,serializers:{},imageOptions:{}},oi=w,oi}var Ou=ku();const Mu=vu(Ou),Lu=({item:n,onClick:t})=>L.jsxs(un.div,{variants:Eu,onClick:t,className:"border border-neutral-200 rounded-lg p-6 cursor-pointer hover:shadow-lg hover:border-neutral-400 transition-all duration-300 bg-white",whileHover:{scale:1.03},whileTap:{scale:.98},children:[L.jsx("h4",{className:"text-xl font-bold text-neutral-800",children:n.name}),L.jsx("p",{className:"text-neutral-600 mt-2 line-clamp-2",children:n.description})]}),Fu={visible:{opacity:1},hidden:{opacity:0}},Uu={hidden:{y:"-50px",opacity:0},visible:{y:"0",opacity:1,transition:{delay:.1}}},ju=({item:n,onClose:t})=>L.jsx(un.div,{className:"fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4",variants:Fu,initial:"hidden",animate:"visible",exit:"hidden",onClick:t,children:L.jsxs(un.div,{variants:Uu,className:"bg-white rounded-lg shadow-xl max-w-lg w-full p-8 relative",onClick:e=>e.stopPropagation(),children:[L.jsx("button",{onClick:t,className:"absolute top-4 right-4 text-neutral-500 hover:text-neutral-800 text-2xl",children:"×"}),L.jsx("h3",{className:"text-3xl font-bold mb-4",children:n.name}),L.jsx("p",{className:"text-body mb-6",children:n.description}),L.jsxs("div",{children:[L.jsx("h4",{className:"font-bold text-lg mb-2",children:"Ingredients:"}),L.jsx("ul",{className:"list-disc list-inside text-neutral-600 space-y-1",children:n.ingredients.map((e,r)=>L.jsx("li",{children:e},r))})]})]})}),Bu=()=>{};var To={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Aa=function(n){const t=[];let e=0;for(let r=0;r<n.length;r++){let s=n.charCodeAt(r);s<128?t[e++]=s:s<2048?(t[e++]=s>>6|192,t[e++]=s&63|128):(s&64512)===55296&&r+1<n.length&&(n.charCodeAt(r+1)&64512)===56320?(s=65536+((s&1023)<<10)+(n.charCodeAt(++r)&1023),t[e++]=s>>18|240,t[e++]=s>>12&63|128,t[e++]=s>>6&63|128,t[e++]=s&63|128):(t[e++]=s>>12|224,t[e++]=s>>6&63|128,t[e++]=s&63|128)}return t},zu=function(n){const t=[];let e=0,r=0;for(;e<n.length;){const s=n[e++];if(s<128)t[r++]=String.fromCharCode(s);else if(s>191&&s<224){const o=n[e++];t[r++]=String.fromCharCode((s&31)<<6|o&63)}else if(s>239&&s<365){const o=n[e++],l=n[e++],c=n[e++],d=((s&7)<<18|(o&63)<<12|(l&63)<<6|c&63)-65536;t[r++]=String.fromCharCode(55296+(d>>10)),t[r++]=String.fromCharCode(56320+(d&1023))}else{const o=n[e++],l=n[e++];t[r++]=String.fromCharCode((s&15)<<12|(o&63)<<6|l&63)}}return t.join("")},Sa={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,t){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();const e=t?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let s=0;s<n.length;s+=3){const o=n[s],l=s+1<n.length,c=l?n[s+1]:0,d=s+2<n.length,g=d?n[s+2]:0,E=o>>2,w=(o&3)<<4|c>>4;let T=(c&15)<<2|g>>6,C=g&63;d||(C=64,l||(T=64)),r.push(e[E],e[w],e[T],e[C])}return r.join("")},encodeString(n,t){return this.HAS_NATIVE_SUPPORT&&!t?btoa(n):this.encodeByteArray(Aa(n),t)},decodeString(n,t){return this.HAS_NATIVE_SUPPORT&&!t?atob(n):zu(this.decodeStringToByteArray(n,t))},decodeStringToByteArray(n,t){this.init_();const e=t?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let s=0;s<n.length;){const o=e[n.charAt(s++)],c=s<n.length?e[n.charAt(s)]:0;++s;const g=s<n.length?e[n.charAt(s)]:64;++s;const w=s<n.length?e[n.charAt(s)]:64;if(++s,o==null||c==null||g==null||w==null)throw new qu;const T=o<<2|c>>4;if(r.push(T),g!==64){const C=c<<4&240|g>>2;if(r.push(C),w!==64){const D=g<<6&192|w;r.push(D)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}};class qu extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const $u=function(n){const t=Aa(n);return Sa.encodeByteArray(t,!0)},tr=function(n){return $u(n).replace(/\./g,"")},Hu=function(n){try{return Sa.decodeString(n,!0)}catch(t){console.error("base64Decode failed: ",t)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Gu(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ku=()=>Gu().__FIREBASE_DEFAULTS__,Wu=()=>{if(typeof process>"u"||typeof To>"u")return;const n=To.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},Qu=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const t=n&&Hu(n[1]);return t&&JSON.parse(t)},Ni=()=>{try{return Bu()||Ku()||Wu()||Qu()}catch(n){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${n}`);return}},Xu=n=>Ni()?.emulatorHosts?.[n],Ju=n=>{const t=Xu(n);if(!t)return;const e=t.lastIndexOf(":");if(e<=0||e+1===t.length)throw new Error(`Invalid host ${t} with no separate hostname and port!`);const r=parseInt(t.substring(e+1),10);return t[0]==="["?[t.substring(1,e-1),r]:[t.substring(0,e),r]},ba=()=>Ni()?.config;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yu{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((t,e)=>{this.resolve=t,this.reject=e})}wrapCallback(t){return(e,r)=>{e?this.reject(e):this.resolve(r),typeof t=="function"&&(this.promise.catch(()=>{}),t.length===1?t(e):t(e,r))}}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xi(n){try{return(n.startsWith("http://")||n.startsWith("https://")?new URL(n).hostname:n).endsWith(".cloudworkstations.dev")}catch{return!1}}async function Zu(n){return(await fetch(n,{credentials:"include"})).ok}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function tc(n,t){if(n.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const e={alg:"none",type:"JWT"},r=t||"demo-project",s=n.iat||0,o=n.sub||n.user_id;if(!o)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const l={iss:`https://securetoken.google.com/${r}`,aud:r,iat:s,exp:s+3600,auth_time:s,sub:o,user_id:o,firebase:{sign_in_provider:"custom",identities:{}},...n};return[tr(JSON.stringify(e)),tr(JSON.stringify(l)),""].join(".")}const nn={};function ec(){const n={prod:[],emulator:[]};for(const t of Object.keys(nn))nn[t]?n.emulator.push(t):n.prod.push(t);return n}function nc(n){let t=document.getElementById(n),e=!1;return t||(t=document.createElement("div"),t.setAttribute("id",n),e=!0),{created:e,element:t}}let Io=!1;function rc(n,t){if(typeof window>"u"||typeof document>"u"||!xi(window.location.host)||nn[n]===t||nn[n]||Io)return;nn[n]=t;function e(T){return`__firebase__banner__${T}`}const r="__firebase__banner",o=ec().prod.length>0;function l(){const T=document.getElementById(r);T&&T.remove()}function c(T){T.style.display="flex",T.style.background="#7faaf0",T.style.position="fixed",T.style.bottom="5px",T.style.left="5px",T.style.padding=".5em",T.style.borderRadius="5px",T.style.alignItems="center"}function d(T,C){T.setAttribute("width","24"),T.setAttribute("id",C),T.setAttribute("height","24"),T.setAttribute("viewBox","0 0 24 24"),T.setAttribute("fill","none"),T.style.marginLeft="-6px"}function g(){const T=document.createElement("span");return T.style.cursor="pointer",T.style.marginLeft="16px",T.style.fontSize="24px",T.innerHTML=" &times;",T.onclick=()=>{Io=!0,l()},T}function E(T,C){T.setAttribute("id",C),T.innerText="Learn more",T.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",T.setAttribute("target","__blank"),T.style.paddingLeft="5px",T.style.textDecoration="underline"}function w(){const T=nc(r),C=e("text"),D=document.getElementById(C)||document.createElement("span"),M=e("learnmore"),N=document.getElementById(M)||document.createElement("a"),j=e("preprendIcon"),$=document.getElementById(j)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(T.created){const H=T.element;c(H),E(N,M);const P=g();d($,j),H.append($,D,N,P),document.body.appendChild(H)}o?(D.innerText="Preview backend disconnected.",$.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):($.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,D.innerText="Preview backend running in this workspace."),D.setAttribute("id",C)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",w):w()}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ic(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function sc(){const n=Ni()?.forceEnvironment;if(n==="node")return!0;if(n==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function oc(){return!sc()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function ac(){try{return typeof indexedDB=="object"}catch{return!1}}function lc(){return new Promise((n,t)=>{try{let e=!0;const r="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(r);s.onsuccess=()=>{s.result.close(),e||self.indexedDB.deleteDatabase(r),n(!0)},s.onupgradeneeded=()=>{e=!1},s.onerror=()=>{t(s.error?.message||"")}}catch(e){t(e)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const uc="FirebaseError";class Fe extends Error{constructor(t,e,r){super(e),this.code=t,this.customData=r,this.name=uc,Object.setPrototypeOf(this,Fe.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Ra.prototype.create)}}class Ra{constructor(t,e,r){this.service=t,this.serviceName=e,this.errors=r}create(t,...e){const r=e[0]||{},s=`${this.service}/${t}`,o=this.errors[t],l=o?cc(o,r):"Error",c=`${this.serviceName}: ${l} (${s}).`;return new Fe(s,c,r)}}function cc(n,t){return n.replace(hc,(e,r)=>{const s=t[r];return s!=null?String(s):`<${r}?>`})}const hc=/\{\$([^}]+)}/g;function er(n,t){if(n===t)return!0;const e=Object.keys(n),r=Object.keys(t);for(const s of e){if(!r.includes(s))return!1;const o=n[s],l=t[s];if(wo(o)&&wo(l)){if(!er(o,l))return!1}else if(o!==l)return!1}for(const s of r)if(!e.includes(s))return!1;return!0}function wo(n){return n!==null&&typeof n=="object"}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function cn(n){return n&&n._delegate?n._delegate:n}class hn{constructor(t,e,r){this.name=t,this.instanceFactory=e,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(t){return this.instantiationMode=t,this}setMultipleInstances(t){return this.multipleInstances=t,this}setServiceProps(t){return this.serviceProps=t,this}setInstanceCreatedCallback(t){return this.onInstanceCreated=t,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ce="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fc{constructor(t,e){this.name=t,this.container=e,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(t){const e=this.normalizeInstanceIdentifier(t);if(!this.instancesDeferred.has(e)){const r=new Yu;if(this.instancesDeferred.set(e,r),this.isInitialized(e)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:e});s&&r.resolve(s)}catch{}}return this.instancesDeferred.get(e).promise}getImmediate(t){const e=this.normalizeInstanceIdentifier(t?.identifier),r=t?.optional??!1;if(this.isInitialized(e)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:e})}catch(s){if(r)return null;throw s}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(t){if(t.name!==this.name)throw Error(`Mismatching Component ${t.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=t,!!this.shouldAutoInitialize()){if(pc(t))try{this.getOrInitializeService({instanceIdentifier:ce})}catch{}for(const[e,r]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(e);try{const o=this.getOrInitializeService({instanceIdentifier:s});r.resolve(o)}catch{}}}}clearInstance(t=ce){this.instancesDeferred.delete(t),this.instancesOptions.delete(t),this.instances.delete(t)}async delete(){const t=Array.from(this.instances.values());await Promise.all([...t.filter(e=>"INTERNAL"in e).map(e=>e.INTERNAL.delete()),...t.filter(e=>"_delete"in e).map(e=>e._delete())])}isComponentSet(){return this.component!=null}isInitialized(t=ce){return this.instances.has(t)}getOptions(t=ce){return this.instancesOptions.get(t)||{}}initialize(t={}){const{options:e={}}=t,r=this.normalizeInstanceIdentifier(t.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:r,options:e});for(const[o,l]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(o);r===c&&l.resolve(s)}return s}onInit(t,e){const r=this.normalizeInstanceIdentifier(e),s=this.onInitCallbacks.get(r)??new Set;s.add(t),this.onInitCallbacks.set(r,s);const o=this.instances.get(r);return o&&t(o,r),()=>{s.delete(t)}}invokeOnInitCallbacks(t,e){const r=this.onInitCallbacks.get(e);if(r)for(const s of r)try{s(t,e)}catch{}}getOrInitializeService({instanceIdentifier:t,options:e={}}){let r=this.instances.get(t);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:dc(t),options:e}),this.instances.set(t,r),this.instancesOptions.set(t,e),this.invokeOnInitCallbacks(r,t),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,t,r)}catch{}return r||null}normalizeInstanceIdentifier(t=ce){return this.component?this.component.multipleInstances?t:ce:t}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function dc(n){return n===ce?void 0:n}function pc(n){return n.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mc{constructor(t){this.name=t,this.providers=new Map}addComponent(t){const e=this.getProvider(t.name);if(e.isComponentSet())throw new Error(`Component ${t.name} has already been registered with ${this.name}`);e.setComponent(t)}addOrOverwriteComponent(t){this.getProvider(t.name).isComponentSet()&&this.providers.delete(t.name),this.addComponent(t)}getProvider(t){if(this.providers.has(t))return this.providers.get(t);const e=new fc(t,this);return this.providers.set(t,e),e}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var W;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(W||(W={}));const gc={debug:W.DEBUG,verbose:W.VERBOSE,info:W.INFO,warn:W.WARN,error:W.ERROR,silent:W.SILENT},_c=W.INFO,yc={[W.DEBUG]:"log",[W.VERBOSE]:"log",[W.INFO]:"info",[W.WARN]:"warn",[W.ERROR]:"error"},vc=(n,t,...e)=>{if(t<n.logLevel)return;const r=new Date().toISOString(),s=yc[t];if(s)console[s](`[${r}]  ${n.name}:`,...e);else throw new Error(`Attempted to log a message with an invalid logType (value: ${t})`)};class Ca{constructor(t){this.name=t,this._logLevel=_c,this._logHandler=vc,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(t){if(!(t in W))throw new TypeError(`Invalid value "${t}" assigned to \`logLevel\``);this._logLevel=t}setLogLevel(t){this._logLevel=typeof t=="string"?gc[t]:t}get logHandler(){return this._logHandler}set logHandler(t){if(typeof t!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=t}get userLogHandler(){return this._userLogHandler}set userLogHandler(t){this._userLogHandler=t}debug(...t){this._userLogHandler&&this._userLogHandler(this,W.DEBUG,...t),this._logHandler(this,W.DEBUG,...t)}log(...t){this._userLogHandler&&this._userLogHandler(this,W.VERBOSE,...t),this._logHandler(this,W.VERBOSE,...t)}info(...t){this._userLogHandler&&this._userLogHandler(this,W.INFO,...t),this._logHandler(this,W.INFO,...t)}warn(...t){this._userLogHandler&&this._userLogHandler(this,W.WARN,...t),this._logHandler(this,W.WARN,...t)}error(...t){this._userLogHandler&&this._userLogHandler(this,W.ERROR,...t),this._logHandler(this,W.ERROR,...t)}}const Ec=(n,t)=>t.some(e=>n instanceof e);let Ao,So;function Tc(){return Ao||(Ao=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Ic(){return So||(So=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Pa=new WeakMap,mi=new WeakMap,Va=new WeakMap,ai=new WeakMap,ki=new WeakMap;function wc(n){const t=new Promise((e,r)=>{const s=()=>{n.removeEventListener("success",o),n.removeEventListener("error",l)},o=()=>{e(Yt(n.result)),s()},l=()=>{r(n.error),s()};n.addEventListener("success",o),n.addEventListener("error",l)});return t.then(e=>{e instanceof IDBCursor&&Pa.set(e,n)}).catch(()=>{}),ki.set(t,n),t}function Ac(n){if(mi.has(n))return;const t=new Promise((e,r)=>{const s=()=>{n.removeEventListener("complete",o),n.removeEventListener("error",l),n.removeEventListener("abort",l)},o=()=>{e(),s()},l=()=>{r(n.error||new DOMException("AbortError","AbortError")),s()};n.addEventListener("complete",o),n.addEventListener("error",l),n.addEventListener("abort",l)});mi.set(n,t)}let gi={get(n,t,e){if(n instanceof IDBTransaction){if(t==="done")return mi.get(n);if(t==="objectStoreNames")return n.objectStoreNames||Va.get(n);if(t==="store")return e.objectStoreNames[1]?void 0:e.objectStore(e.objectStoreNames[0])}return Yt(n[t])},set(n,t,e){return n[t]=e,!0},has(n,t){return n instanceof IDBTransaction&&(t==="done"||t==="store")?!0:t in n}};function Sc(n){gi=n(gi)}function bc(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(t,...e){const r=n.call(li(this),t,...e);return Va.set(r,t.sort?t.sort():[t]),Yt(r)}:Ic().includes(n)?function(...t){return n.apply(li(this),t),Yt(Pa.get(this))}:function(...t){return Yt(n.apply(li(this),t))}}function Rc(n){return typeof n=="function"?bc(n):(n instanceof IDBTransaction&&Ac(n),Ec(n,Tc())?new Proxy(n,gi):n)}function Yt(n){if(n instanceof IDBRequest)return wc(n);if(ai.has(n))return ai.get(n);const t=Rc(n);return t!==n&&(ai.set(n,t),ki.set(t,n)),t}const li=n=>ki.get(n);function Cc(n,t,{blocked:e,upgrade:r,blocking:s,terminated:o}={}){const l=indexedDB.open(n,t),c=Yt(l);return r&&l.addEventListener("upgradeneeded",d=>{r(Yt(l.result),d.oldVersion,d.newVersion,Yt(l.transaction),d)}),e&&l.addEventListener("blocked",d=>e(d.oldVersion,d.newVersion,d)),c.then(d=>{o&&d.addEventListener("close",()=>o()),s&&d.addEventListener("versionchange",g=>s(g.oldVersion,g.newVersion,g))}).catch(()=>{}),c}const Pc=["get","getKey","getAll","getAllKeys","count"],Vc=["put","add","delete","clear"],ui=new Map;function bo(n,t){if(!(n instanceof IDBDatabase&&!(t in n)&&typeof t=="string"))return;if(ui.get(t))return ui.get(t);const e=t.replace(/FromIndex$/,""),r=t!==e,s=Vc.includes(e);if(!(e in(r?IDBIndex:IDBObjectStore).prototype)||!(s||Pc.includes(e)))return;const o=async function(l,...c){const d=this.transaction(l,s?"readwrite":"readonly");let g=d.store;return r&&(g=g.index(c.shift())),(await Promise.all([g[e](...c),s&&d.done]))[0]};return ui.set(t,o),o}Sc(n=>({...n,get:(t,e,r)=>bo(t,e)||n.get(t,e,r),has:(t,e)=>!!bo(t,e)||n.has(t,e)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dc{constructor(t){this.container=t}getPlatformInfoString(){return this.container.getProviders().map(e=>{if(Nc(e)){const r=e.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(e=>e).join(" ")}}function Nc(n){return n.getComponent()?.type==="VERSION"}const _i="@firebase/app",Ro="0.14.1";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Wt=new Ca("@firebase/app"),xc="@firebase/app-compat",kc="@firebase/analytics-compat",Oc="@firebase/analytics",Mc="@firebase/app-check-compat",Lc="@firebase/app-check",Fc="@firebase/auth",Uc="@firebase/auth-compat",jc="@firebase/database",Bc="@firebase/data-connect",zc="@firebase/database-compat",qc="@firebase/functions",$c="@firebase/functions-compat",Hc="@firebase/installations",Gc="@firebase/installations-compat",Kc="@firebase/messaging",Wc="@firebase/messaging-compat",Qc="@firebase/performance",Xc="@firebase/performance-compat",Jc="@firebase/remote-config",Yc="@firebase/remote-config-compat",Zc="@firebase/storage",th="@firebase/storage-compat",eh="@firebase/firestore",nh="@firebase/ai",rh="@firebase/firestore-compat",ih="firebase",sh="12.1.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yi="[DEFAULT]",oh={[_i]:"fire-core",[xc]:"fire-core-compat",[Oc]:"fire-analytics",[kc]:"fire-analytics-compat",[Lc]:"fire-app-check",[Mc]:"fire-app-check-compat",[Fc]:"fire-auth",[Uc]:"fire-auth-compat",[jc]:"fire-rtdb",[Bc]:"fire-data-connect",[zc]:"fire-rtdb-compat",[qc]:"fire-fn",[$c]:"fire-fn-compat",[Hc]:"fire-iid",[Gc]:"fire-iid-compat",[Kc]:"fire-fcm",[Wc]:"fire-fcm-compat",[Qc]:"fire-perf",[Xc]:"fire-perf-compat",[Jc]:"fire-rc",[Yc]:"fire-rc-compat",[Zc]:"fire-gcs",[th]:"fire-gcs-compat",[eh]:"fire-fst",[rh]:"fire-fst-compat",[nh]:"fire-vertex","fire-js":"fire-js",[ih]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nr=new Map,ah=new Map,vi=new Map;function Co(n,t){try{n.container.addComponent(t)}catch(e){Wt.debug(`Component ${t.name} failed to register with FirebaseApp ${n.name}`,e)}}function rr(n){const t=n.name;if(vi.has(t))return Wt.debug(`There were multiple attempts to register component ${t}.`),!1;vi.set(t,n);for(const e of nr.values())Co(e,n);for(const e of ah.values())Co(e,n);return!0}function lh(n,t){const e=n.container.getProvider("heartbeat").getImmediate({optional:!0});return e&&e.triggerHeartbeat(),n.container.getProvider(t)}function uh(n){return n==null?!1:n.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ch={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},Zt=new Ra("app","Firebase",ch);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hh{constructor(t,e,r){this._isDeleted=!1,this._options={...t},this._config={...e},this._name=e.name,this._automaticDataCollectionEnabled=e.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new hn("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(t){this.checkDestroyed(),this._automaticDataCollectionEnabled=t}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(t){this._isDeleted=t}checkDestroyed(){if(this.isDeleted)throw Zt.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fh=sh;function Da(n,t={}){let e=n;typeof t!="object"&&(t={name:t});const r={name:yi,automaticDataCollectionEnabled:!0,...t},s=r.name;if(typeof s!="string"||!s)throw Zt.create("bad-app-name",{appName:String(s)});if(e||(e=ba()),!e)throw Zt.create("no-options");const o=nr.get(s);if(o){if(er(e,o.options)&&er(r,o.config))return o;throw Zt.create("duplicate-app",{appName:s})}const l=new mc(s);for(const d of vi.values())l.addComponent(d);const c=new hh(e,r,l);return nr.set(s,c),c}function dh(n=yi){const t=nr.get(n);if(!t&&n===yi&&ba())return Da();if(!t)throw Zt.create("no-app",{appName:n});return t}function Pe(n,t,e){let r=oh[n]??n;e&&(r+=`-${e}`);const s=r.match(/\s|\//),o=t.match(/\s|\//);if(s||o){const l=[`Unable to register library "${r}" with version "${t}":`];s&&l.push(`library name "${r}" contains illegal characters (whitespace or "/")`),s&&o&&l.push("and"),o&&l.push(`version name "${t}" contains illegal characters (whitespace or "/")`),Wt.warn(l.join(" "));return}rr(new hn(`${r}-version`,()=>({library:r,version:t}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ph="firebase-heartbeat-database",mh=1,fn="firebase-heartbeat-store";let ci=null;function Na(){return ci||(ci=Cc(ph,mh,{upgrade:(n,t)=>{switch(t){case 0:try{n.createObjectStore(fn)}catch(e){console.warn(e)}}}}).catch(n=>{throw Zt.create("idb-open",{originalErrorMessage:n.message})})),ci}async function gh(n){try{const e=(await Na()).transaction(fn),r=await e.objectStore(fn).get(xa(n));return await e.done,r}catch(t){if(t instanceof Fe)Wt.warn(t.message);else{const e=Zt.create("idb-get",{originalErrorMessage:t?.message});Wt.warn(e.message)}}}async function Po(n,t){try{const r=(await Na()).transaction(fn,"readwrite");await r.objectStore(fn).put(t,xa(n)),await r.done}catch(e){if(e instanceof Fe)Wt.warn(e.message);else{const r=Zt.create("idb-set",{originalErrorMessage:e?.message});Wt.warn(r.message)}}}function xa(n){return`${n.name}!${n.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _h=1024,yh=30;class vh{constructor(t){this.container=t,this._heartbeatsCache=null;const e=this.container.getProvider("app").getImmediate();this._storage=new Th(e),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){try{const e=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),r=Vo();if(this._heartbeatsCache?.heartbeats==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null)||this._heartbeatsCache.lastSentHeartbeatDate===r||this._heartbeatsCache.heartbeats.some(s=>s.date===r))return;if(this._heartbeatsCache.heartbeats.push({date:r,agent:e}),this._heartbeatsCache.heartbeats.length>yh){const s=Ih(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(s,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(t){Wt.warn(t)}}async getHeartbeatsHeader(){try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=Vo(),{heartbeatsToSend:e,unsentEntries:r}=Eh(this._heartbeatsCache.heartbeats),s=tr(JSON.stringify({version:2,heartbeats:e}));return this._heartbeatsCache.lastSentHeartbeatDate=t,r.length>0?(this._heartbeatsCache.heartbeats=r,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(t){return Wt.warn(t),""}}}function Vo(){return new Date().toISOString().substring(0,10)}function Eh(n,t=_h){const e=[];let r=n.slice();for(const s of n){const o=e.find(l=>l.agent===s.agent);if(o){if(o.dates.push(s.date),Do(e)>t){o.dates.pop();break}}else if(e.push({agent:s.agent,dates:[s.date]}),Do(e)>t){e.pop();break}r=r.slice(1)}return{heartbeatsToSend:e,unsentEntries:r}}class Th{constructor(t){this.app=t,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return ac()?lc().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const e=await gh(this.app);return e?.heartbeats?e:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(t){if(await this._canUseIndexedDBPromise){const r=await this.read();return Po(this.app,{lastSentHeartbeatDate:t.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:t.heartbeats})}else return}async add(t){if(await this._canUseIndexedDBPromise){const r=await this.read();return Po(this.app,{lastSentHeartbeatDate:t.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...t.heartbeats]})}else return}}function Do(n){return tr(JSON.stringify({version:2,heartbeats:n})).length}function Ih(n){if(n.length===0)return-1;let t=0,e=n[0].date;for(let r=1;r<n.length;r++)n[r].date<e&&(e=n[r].date,t=r);return t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wh(n){rr(new hn("platform-logger",t=>new Dc(t),"PRIVATE")),rr(new hn("heartbeat",t=>new vh(t),"PRIVATE")),Pe(_i,Ro,n),Pe(_i,Ro,"esm2020"),Pe("fire-js","")}wh("");var No=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Oi;(function(){var n;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function t(I,_){function v(){}v.prototype=_.prototype,I.D=_.prototype,I.prototype=new v,I.prototype.constructor=I,I.C=function(p,m,y){for(var h=Array(arguments.length-2),x=2;x<arguments.length;x++)h[x-2]=arguments[x];return _.prototype[m].apply(p,h)}}function e(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.B=Array(this.blockSize),this.o=this.h=0,this.s()}t(r,e),r.prototype.s=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function s(I,_,v){v||(v=0);var p=Array(16);if(typeof _=="string")for(var m=0;16>m;++m)p[m]=_.charCodeAt(v++)|_.charCodeAt(v++)<<8|_.charCodeAt(v++)<<16|_.charCodeAt(v++)<<24;else for(m=0;16>m;++m)p[m]=_[v++]|_[v++]<<8|_[v++]<<16|_[v++]<<24;_=I.g[0],v=I.g[1],m=I.g[2];var y=I.g[3],h=_+(y^v&(m^y))+p[0]+3614090360&4294967295;_=v+(h<<7&4294967295|h>>>25),h=y+(m^_&(v^m))+p[1]+3905402710&4294967295,y=_+(h<<12&4294967295|h>>>20),h=m+(v^y&(_^v))+p[2]+606105819&4294967295,m=y+(h<<17&4294967295|h>>>15),h=v+(_^m&(y^_))+p[3]+3250441966&4294967295,v=m+(h<<22&4294967295|h>>>10),h=_+(y^v&(m^y))+p[4]+4118548399&4294967295,_=v+(h<<7&4294967295|h>>>25),h=y+(m^_&(v^m))+p[5]+1200080426&4294967295,y=_+(h<<12&4294967295|h>>>20),h=m+(v^y&(_^v))+p[6]+2821735955&4294967295,m=y+(h<<17&4294967295|h>>>15),h=v+(_^m&(y^_))+p[7]+4249261313&4294967295,v=m+(h<<22&4294967295|h>>>10),h=_+(y^v&(m^y))+p[8]+1770035416&4294967295,_=v+(h<<7&4294967295|h>>>25),h=y+(m^_&(v^m))+p[9]+2336552879&4294967295,y=_+(h<<12&4294967295|h>>>20),h=m+(v^y&(_^v))+p[10]+4294925233&4294967295,m=y+(h<<17&4294967295|h>>>15),h=v+(_^m&(y^_))+p[11]+2304563134&4294967295,v=m+(h<<22&4294967295|h>>>10),h=_+(y^v&(m^y))+p[12]+1804603682&4294967295,_=v+(h<<7&4294967295|h>>>25),h=y+(m^_&(v^m))+p[13]+4254626195&4294967295,y=_+(h<<12&4294967295|h>>>20),h=m+(v^y&(_^v))+p[14]+2792965006&4294967295,m=y+(h<<17&4294967295|h>>>15),h=v+(_^m&(y^_))+p[15]+1236535329&4294967295,v=m+(h<<22&4294967295|h>>>10),h=_+(m^y&(v^m))+p[1]+4129170786&4294967295,_=v+(h<<5&4294967295|h>>>27),h=y+(v^m&(_^v))+p[6]+3225465664&4294967295,y=_+(h<<9&4294967295|h>>>23),h=m+(_^v&(y^_))+p[11]+643717713&4294967295,m=y+(h<<14&4294967295|h>>>18),h=v+(y^_&(m^y))+p[0]+3921069994&4294967295,v=m+(h<<20&4294967295|h>>>12),h=_+(m^y&(v^m))+p[5]+3593408605&4294967295,_=v+(h<<5&4294967295|h>>>27),h=y+(v^m&(_^v))+p[10]+38016083&4294967295,y=_+(h<<9&4294967295|h>>>23),h=m+(_^v&(y^_))+p[15]+3634488961&4294967295,m=y+(h<<14&4294967295|h>>>18),h=v+(y^_&(m^y))+p[4]+3889429448&4294967295,v=m+(h<<20&4294967295|h>>>12),h=_+(m^y&(v^m))+p[9]+568446438&4294967295,_=v+(h<<5&4294967295|h>>>27),h=y+(v^m&(_^v))+p[14]+3275163606&4294967295,y=_+(h<<9&4294967295|h>>>23),h=m+(_^v&(y^_))+p[3]+4107603335&4294967295,m=y+(h<<14&4294967295|h>>>18),h=v+(y^_&(m^y))+p[8]+1163531501&4294967295,v=m+(h<<20&4294967295|h>>>12),h=_+(m^y&(v^m))+p[13]+2850285829&4294967295,_=v+(h<<5&4294967295|h>>>27),h=y+(v^m&(_^v))+p[2]+4243563512&4294967295,y=_+(h<<9&4294967295|h>>>23),h=m+(_^v&(y^_))+p[7]+1735328473&4294967295,m=y+(h<<14&4294967295|h>>>18),h=v+(y^_&(m^y))+p[12]+2368359562&4294967295,v=m+(h<<20&4294967295|h>>>12),h=_+(v^m^y)+p[5]+4294588738&4294967295,_=v+(h<<4&4294967295|h>>>28),h=y+(_^v^m)+p[8]+2272392833&4294967295,y=_+(h<<11&4294967295|h>>>21),h=m+(y^_^v)+p[11]+1839030562&4294967295,m=y+(h<<16&4294967295|h>>>16),h=v+(m^y^_)+p[14]+4259657740&4294967295,v=m+(h<<23&4294967295|h>>>9),h=_+(v^m^y)+p[1]+2763975236&4294967295,_=v+(h<<4&4294967295|h>>>28),h=y+(_^v^m)+p[4]+1272893353&4294967295,y=_+(h<<11&4294967295|h>>>21),h=m+(y^_^v)+p[7]+4139469664&4294967295,m=y+(h<<16&4294967295|h>>>16),h=v+(m^y^_)+p[10]+3200236656&4294967295,v=m+(h<<23&4294967295|h>>>9),h=_+(v^m^y)+p[13]+681279174&4294967295,_=v+(h<<4&4294967295|h>>>28),h=y+(_^v^m)+p[0]+3936430074&4294967295,y=_+(h<<11&4294967295|h>>>21),h=m+(y^_^v)+p[3]+3572445317&4294967295,m=y+(h<<16&4294967295|h>>>16),h=v+(m^y^_)+p[6]+76029189&4294967295,v=m+(h<<23&4294967295|h>>>9),h=_+(v^m^y)+p[9]+3654602809&4294967295,_=v+(h<<4&4294967295|h>>>28),h=y+(_^v^m)+p[12]+3873151461&4294967295,y=_+(h<<11&4294967295|h>>>21),h=m+(y^_^v)+p[15]+530742520&4294967295,m=y+(h<<16&4294967295|h>>>16),h=v+(m^y^_)+p[2]+3299628645&4294967295,v=m+(h<<23&4294967295|h>>>9),h=_+(m^(v|~y))+p[0]+4096336452&4294967295,_=v+(h<<6&4294967295|h>>>26),h=y+(v^(_|~m))+p[7]+1126891415&4294967295,y=_+(h<<10&4294967295|h>>>22),h=m+(_^(y|~v))+p[14]+2878612391&4294967295,m=y+(h<<15&4294967295|h>>>17),h=v+(y^(m|~_))+p[5]+4237533241&4294967295,v=m+(h<<21&4294967295|h>>>11),h=_+(m^(v|~y))+p[12]+1700485571&4294967295,_=v+(h<<6&4294967295|h>>>26),h=y+(v^(_|~m))+p[3]+2399980690&4294967295,y=_+(h<<10&4294967295|h>>>22),h=m+(_^(y|~v))+p[10]+4293915773&4294967295,m=y+(h<<15&4294967295|h>>>17),h=v+(y^(m|~_))+p[1]+2240044497&4294967295,v=m+(h<<21&4294967295|h>>>11),h=_+(m^(v|~y))+p[8]+1873313359&4294967295,_=v+(h<<6&4294967295|h>>>26),h=y+(v^(_|~m))+p[15]+4264355552&4294967295,y=_+(h<<10&4294967295|h>>>22),h=m+(_^(y|~v))+p[6]+2734768916&4294967295,m=y+(h<<15&4294967295|h>>>17),h=v+(y^(m|~_))+p[13]+1309151649&4294967295,v=m+(h<<21&4294967295|h>>>11),h=_+(m^(v|~y))+p[4]+4149444226&4294967295,_=v+(h<<6&4294967295|h>>>26),h=y+(v^(_|~m))+p[11]+3174756917&4294967295,y=_+(h<<10&4294967295|h>>>22),h=m+(_^(y|~v))+p[2]+718787259&4294967295,m=y+(h<<15&4294967295|h>>>17),h=v+(y^(m|~_))+p[9]+3951481745&4294967295,I.g[0]=I.g[0]+_&4294967295,I.g[1]=I.g[1]+(m+(h<<21&4294967295|h>>>11))&4294967295,I.g[2]=I.g[2]+m&4294967295,I.g[3]=I.g[3]+y&4294967295}r.prototype.u=function(I,_){_===void 0&&(_=I.length);for(var v=_-this.blockSize,p=this.B,m=this.h,y=0;y<_;){if(m==0)for(;y<=v;)s(this,I,y),y+=this.blockSize;if(typeof I=="string"){for(;y<_;)if(p[m++]=I.charCodeAt(y++),m==this.blockSize){s(this,p),m=0;break}}else for(;y<_;)if(p[m++]=I[y++],m==this.blockSize){s(this,p),m=0;break}}this.h=m,this.o+=_},r.prototype.v=function(){var I=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);I[0]=128;for(var _=1;_<I.length-8;++_)I[_]=0;var v=8*this.o;for(_=I.length-8;_<I.length;++_)I[_]=v&255,v/=256;for(this.u(I),I=Array(16),_=v=0;4>_;++_)for(var p=0;32>p;p+=8)I[v++]=this.g[_]>>>p&255;return I};function o(I,_){var v=c;return Object.prototype.hasOwnProperty.call(v,I)?v[I]:v[I]=_(I)}function l(I,_){this.h=_;for(var v=[],p=!0,m=I.length-1;0<=m;m--){var y=I[m]|0;p&&y==_||(v[m]=y,p=!1)}this.g=v}var c={};function d(I){return-128<=I&&128>I?o(I,function(_){return new l([_|0],0>_?-1:0)}):new l([I|0],0>I?-1:0)}function g(I){if(isNaN(I)||!isFinite(I))return w;if(0>I)return N(g(-I));for(var _=[],v=1,p=0;I>=v;p++)_[p]=I/v|0,v*=4294967296;return new l(_,0)}function E(I,_){if(I.length==0)throw Error("number format error: empty string");if(_=_||10,2>_||36<_)throw Error("radix out of range: "+_);if(I.charAt(0)=="-")return N(E(I.substring(1),_));if(0<=I.indexOf("-"))throw Error('number format error: interior "-" character');for(var v=g(Math.pow(_,8)),p=w,m=0;m<I.length;m+=8){var y=Math.min(8,I.length-m),h=parseInt(I.substring(m,m+y),_);8>y?(y=g(Math.pow(_,y)),p=p.j(y).add(g(h))):(p=p.j(v),p=p.add(g(h)))}return p}var w=d(0),T=d(1),C=d(16777216);n=l.prototype,n.m=function(){if(M(this))return-N(this).m();for(var I=0,_=1,v=0;v<this.g.length;v++){var p=this.i(v);I+=(0<=p?p:4294967296+p)*_,_*=4294967296}return I},n.toString=function(I){if(I=I||10,2>I||36<I)throw Error("radix out of range: "+I);if(D(this))return"0";if(M(this))return"-"+N(this).toString(I);for(var _=g(Math.pow(I,6)),v=this,p="";;){var m=P(v,_).g;v=j(v,m.j(_));var y=((0<v.g.length?v.g[0]:v.h)>>>0).toString(I);if(v=m,D(v))return y+p;for(;6>y.length;)y="0"+y;p=y+p}},n.i=function(I){return 0>I?0:I<this.g.length?this.g[I]:this.h};function D(I){if(I.h!=0)return!1;for(var _=0;_<I.g.length;_++)if(I.g[_]!=0)return!1;return!0}function M(I){return I.h==-1}n.l=function(I){return I=j(this,I),M(I)?-1:D(I)?0:1};function N(I){for(var _=I.g.length,v=[],p=0;p<_;p++)v[p]=~I.g[p];return new l(v,~I.h).add(T)}n.abs=function(){return M(this)?N(this):this},n.add=function(I){for(var _=Math.max(this.g.length,I.g.length),v=[],p=0,m=0;m<=_;m++){var y=p+(this.i(m)&65535)+(I.i(m)&65535),h=(y>>>16)+(this.i(m)>>>16)+(I.i(m)>>>16);p=h>>>16,y&=65535,h&=65535,v[m]=h<<16|y}return new l(v,v[v.length-1]&-2147483648?-1:0)};function j(I,_){return I.add(N(_))}n.j=function(I){if(D(this)||D(I))return w;if(M(this))return M(I)?N(this).j(N(I)):N(N(this).j(I));if(M(I))return N(this.j(N(I)));if(0>this.l(C)&&0>I.l(C))return g(this.m()*I.m());for(var _=this.g.length+I.g.length,v=[],p=0;p<2*_;p++)v[p]=0;for(p=0;p<this.g.length;p++)for(var m=0;m<I.g.length;m++){var y=this.i(p)>>>16,h=this.i(p)&65535,x=I.i(m)>>>16,k=I.i(m)&65535;v[2*p+2*m]+=h*k,$(v,2*p+2*m),v[2*p+2*m+1]+=y*k,$(v,2*p+2*m+1),v[2*p+2*m+1]+=h*x,$(v,2*p+2*m+1),v[2*p+2*m+2]+=y*x,$(v,2*p+2*m+2)}for(p=0;p<_;p++)v[p]=v[2*p+1]<<16|v[2*p];for(p=_;p<2*_;p++)v[p]=0;return new l(v,0)};function $(I,_){for(;(I[_]&65535)!=I[_];)I[_+1]+=I[_]>>>16,I[_]&=65535,_++}function H(I,_){this.g=I,this.h=_}function P(I,_){if(D(_))throw Error("division by zero");if(D(I))return new H(w,w);if(M(I))return _=P(N(I),_),new H(N(_.g),N(_.h));if(M(_))return _=P(I,N(_)),new H(N(_.g),_.h);if(30<I.g.length){if(M(I)||M(_))throw Error("slowDivide_ only works with positive integers.");for(var v=T,p=_;0>=p.l(I);)v=U(v),p=U(p);var m=G(v,1),y=G(p,1);for(p=G(p,2),v=G(v,2);!D(p);){var h=y.add(p);0>=h.l(I)&&(m=m.add(v),y=h),p=G(p,1),v=G(v,1)}return _=j(I,m.j(_)),new H(m,_)}for(m=w;0<=I.l(_);){for(v=Math.max(1,Math.floor(I.m()/_.m())),p=Math.ceil(Math.log(v)/Math.LN2),p=48>=p?1:Math.pow(2,p-48),y=g(v),h=y.j(_);M(h)||0<h.l(I);)v-=p,y=g(v),h=y.j(_);D(y)&&(y=T),m=m.add(y),I=j(I,h)}return new H(m,I)}n.A=function(I){return P(this,I).h},n.and=function(I){for(var _=Math.max(this.g.length,I.g.length),v=[],p=0;p<_;p++)v[p]=this.i(p)&I.i(p);return new l(v,this.h&I.h)},n.or=function(I){for(var _=Math.max(this.g.length,I.g.length),v=[],p=0;p<_;p++)v[p]=this.i(p)|I.i(p);return new l(v,this.h|I.h)},n.xor=function(I){for(var _=Math.max(this.g.length,I.g.length),v=[],p=0;p<_;p++)v[p]=this.i(p)^I.i(p);return new l(v,this.h^I.h)};function U(I){for(var _=I.g.length+1,v=[],p=0;p<_;p++)v[p]=I.i(p)<<1|I.i(p-1)>>>31;return new l(v,I.h)}function G(I,_){var v=_>>5;_%=32;for(var p=I.g.length-v,m=[],y=0;y<p;y++)m[y]=0<_?I.i(y+v)>>>_|I.i(y+v+1)<<32-_:I.i(y+v);return new l(m,I.h)}r.prototype.digest=r.prototype.v,r.prototype.reset=r.prototype.s,r.prototype.update=r.prototype.u,l.prototype.add=l.prototype.add,l.prototype.multiply=l.prototype.j,l.prototype.modulo=l.prototype.A,l.prototype.compare=l.prototype.l,l.prototype.toNumber=l.prototype.m,l.prototype.toString=l.prototype.toString,l.prototype.getBits=l.prototype.i,l.fromNumber=g,l.fromString=E,Oi=l}).apply(typeof No<"u"?No:typeof self<"u"?self:typeof window<"u"?window:{});var zn=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var ka,en,Oa,Qn,Ei,Ma,La,Fa;(function(){var n,t=typeof Object.defineProperties=="function"?Object.defineProperty:function(i,a,u){return i==Array.prototype||i==Object.prototype||(i[a]=u.value),i};function e(i){i=[typeof globalThis=="object"&&globalThis,i,typeof window=="object"&&window,typeof self=="object"&&self,typeof zn=="object"&&zn];for(var a=0;a<i.length;++a){var u=i[a];if(u&&u.Math==Math)return u}throw Error("Cannot find global object")}var r=e(this);function s(i,a){if(a)t:{var u=r;i=i.split(".");for(var f=0;f<i.length-1;f++){var A=i[f];if(!(A in u))break t;u=u[A]}i=i[i.length-1],f=u[i],a=a(f),a!=f&&a!=null&&t(u,i,{configurable:!0,writable:!0,value:a})}}function o(i,a){i instanceof String&&(i+="");var u=0,f=!1,A={next:function(){if(!f&&u<i.length){var S=u++;return{value:a(S,i[S]),done:!1}}return f=!0,{done:!0,value:void 0}}};return A[Symbol.iterator]=function(){return A},A}s("Array.prototype.values",function(i){return i||function(){return o(this,function(a,u){return u})}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var l=l||{},c=this||self;function d(i){var a=typeof i;return a=a!="object"?a:i?Array.isArray(i)?"array":a:"null",a=="array"||a=="object"&&typeof i.length=="number"}function g(i){var a=typeof i;return a=="object"&&i!=null||a=="function"}function E(i,a,u){return i.call.apply(i.bind,arguments)}function w(i,a,u){if(!i)throw Error();if(2<arguments.length){var f=Array.prototype.slice.call(arguments,2);return function(){var A=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(A,f),i.apply(a,A)}}return function(){return i.apply(a,arguments)}}function T(i,a,u){return T=Function.prototype.bind&&Function.prototype.bind.toString().indexOf("native code")!=-1?E:w,T.apply(null,arguments)}function C(i,a){var u=Array.prototype.slice.call(arguments,1);return function(){var f=u.slice();return f.push.apply(f,arguments),i.apply(this,f)}}function D(i,a){function u(){}u.prototype=a.prototype,i.aa=a.prototype,i.prototype=new u,i.prototype.constructor=i,i.Qb=function(f,A,S){for(var V=Array(arguments.length-2),Z=2;Z<arguments.length;Z++)V[Z-2]=arguments[Z];return a.prototype[A].apply(f,V)}}function M(i){const a=i.length;if(0<a){const u=Array(a);for(let f=0;f<a;f++)u[f]=i[f];return u}return[]}function N(i,a){for(let u=1;u<arguments.length;u++){const f=arguments[u];if(d(f)){const A=i.length||0,S=f.length||0;i.length=A+S;for(let V=0;V<S;V++)i[A+V]=f[V]}else i.push(f)}}class j{constructor(a,u){this.i=a,this.j=u,this.h=0,this.g=null}get(){let a;return 0<this.h?(this.h--,a=this.g,this.g=a.next,a.next=null):a=this.i(),a}}function $(i){return/^[\s\xa0]*$/.test(i)}function H(){var i=c.navigator;return i&&(i=i.userAgent)?i:""}function P(i){return P[" "](i),i}P[" "]=function(){};var U=H().indexOf("Gecko")!=-1&&!(H().toLowerCase().indexOf("webkit")!=-1&&H().indexOf("Edge")==-1)&&!(H().indexOf("Trident")!=-1||H().indexOf("MSIE")!=-1)&&H().indexOf("Edge")==-1;function G(i,a,u){for(const f in i)a.call(u,i[f],f,i)}function I(i,a){for(const u in i)a.call(void 0,i[u],u,i)}function _(i){const a={};for(const u in i)a[u]=i[u];return a}const v="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function p(i,a){let u,f;for(let A=1;A<arguments.length;A++){f=arguments[A];for(u in f)i[u]=f[u];for(let S=0;S<v.length;S++)u=v[S],Object.prototype.hasOwnProperty.call(f,u)&&(i[u]=f[u])}}function m(i){var a=1;i=i.split(":");const u=[];for(;0<a&&i.length;)u.push(i.shift()),a--;return i.length&&u.push(i.join(":")),u}function y(i){c.setTimeout(()=>{throw i},0)}function h(){var i=dt;let a=null;return i.g&&(a=i.g,i.g=i.g.next,i.g||(i.h=null),a.next=null),a}class x{constructor(){this.h=this.g=null}add(a,u){const f=k.get();f.set(a,u),this.h?this.h.next=f:this.g=f,this.h=f}}var k=new j(()=>new B,i=>i.reset());class B{constructor(){this.next=this.g=this.h=null}set(a,u){this.h=a,this.g=u,this.next=null}reset(){this.next=this.g=this.h=null}}let Q,at=!1,dt=new x,vt=()=>{const i=c.Promise.resolve(void 0);Q=()=>{i.then(Nt)}};var Nt=()=>{for(var i;i=h();){try{i.h.call(i.g)}catch(u){y(u)}var a=k;a.j(i),100>a.h&&(a.h++,i.next=a.g,a.g=i)}at=!1};function ct(){this.s=this.s,this.C=this.C}ct.prototype.s=!1,ct.prototype.ma=function(){this.s||(this.s=!0,this.N())},ct.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function Y(i,a){this.type=i,this.g=this.target=a,this.defaultPrevented=!1}Y.prototype.h=function(){this.defaultPrevented=!0};var zt=(function(){if(!c.addEventListener||!Object.defineProperty)return!1;var i=!1,a=Object.defineProperty({},"passive",{get:function(){i=!0}});try{const u=()=>{};c.addEventListener("test",u,a),c.removeEventListener("test",u,a)}catch{}return i})();function Ft(i,a){if(Y.call(this,i?i.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,i){var u=this.type=i.type,f=i.changedTouches&&i.changedTouches.length?i.changedTouches[0]:null;if(this.target=i.target||i.srcElement,this.g=a,a=i.relatedTarget){if(U){t:{try{P(a.nodeName);var A=!0;break t}catch{}A=!1}A||(a=null)}}else u=="mouseover"?a=i.fromElement:u=="mouseout"&&(a=i.toElement);this.relatedTarget=a,f?(this.clientX=f.clientX!==void 0?f.clientX:f.pageX,this.clientY=f.clientY!==void 0?f.clientY:f.pageY,this.screenX=f.screenX||0,this.screenY=f.screenY||0):(this.clientX=i.clientX!==void 0?i.clientX:i.pageX,this.clientY=i.clientY!==void 0?i.clientY:i.pageY,this.screenX=i.screenX||0,this.screenY=i.screenY||0),this.button=i.button,this.key=i.key||"",this.ctrlKey=i.ctrlKey,this.altKey=i.altKey,this.shiftKey=i.shiftKey,this.metaKey=i.metaKey,this.pointerId=i.pointerId||0,this.pointerType=typeof i.pointerType=="string"?i.pointerType:Ar[i.pointerType]||"",this.state=i.state,this.i=i,i.defaultPrevented&&Ft.aa.h.call(this)}}D(Ft,Y);var Ar={2:"touch",3:"pen",4:"mouse"};Ft.prototype.h=function(){Ft.aa.h.call(this);var i=this.i;i.preventDefault?i.preventDefault():i.returnValue=!1};var Te="closure_listenable_"+(1e6*Math.random()|0),se=0;function zl(i,a,u,f,A){this.listener=i,this.proxy=null,this.src=a,this.type=u,this.capture=!!f,this.ha=A,this.key=++se,this.da=this.fa=!1}function An(i){i.da=!0,i.listener=null,i.proxy=null,i.src=null,i.ha=null}function Sn(i){this.src=i,this.g={},this.h=0}Sn.prototype.add=function(i,a,u,f,A){var S=i.toString();i=this.g[S],i||(i=this.g[S]=[],this.h++);var V=br(i,a,f,A);return-1<V?(a=i[V],u||(a.fa=!1)):(a=new zl(a,this.src,S,!!f,A),a.fa=u,i.push(a)),a};function Sr(i,a){var u=a.type;if(u in i.g){var f=i.g[u],A=Array.prototype.indexOf.call(f,a,void 0),S;(S=0<=A)&&Array.prototype.splice.call(f,A,1),S&&(An(a),i.g[u].length==0&&(delete i.g[u],i.h--))}}function br(i,a,u,f){for(var A=0;A<i.length;++A){var S=i[A];if(!S.da&&S.listener==a&&S.capture==!!u&&S.ha==f)return A}return-1}var Rr="closure_lm_"+(1e6*Math.random()|0),Cr={};function os(i,a,u,f,A){if(Array.isArray(a)){for(var S=0;S<a.length;S++)os(i,a[S],u,f,A);return null}return u=us(u),i&&i[Te]?i.K(a,u,g(f)?!!f.capture:!1,A):ql(i,a,u,!1,f,A)}function ql(i,a,u,f,A,S){if(!a)throw Error("Invalid event type");var V=g(A)?!!A.capture:!!A,Z=Vr(i);if(Z||(i[Rr]=Z=new Sn(i)),u=Z.add(a,u,f,V,S),u.proxy)return u;if(f=$l(),u.proxy=f,f.src=i,f.listener=u,i.addEventListener)zt||(A=V),A===void 0&&(A=!1),i.addEventListener(a.toString(),f,A);else if(i.attachEvent)i.attachEvent(ls(a.toString()),f);else if(i.addListener&&i.removeListener)i.addListener(f);else throw Error("addEventListener and attachEvent are unavailable.");return u}function $l(){function i(u){return a.call(i.src,i.listener,u)}const a=Hl;return i}function as(i,a,u,f,A){if(Array.isArray(a))for(var S=0;S<a.length;S++)as(i,a[S],u,f,A);else f=g(f)?!!f.capture:!!f,u=us(u),i&&i[Te]?(i=i.i,a=String(a).toString(),a in i.g&&(S=i.g[a],u=br(S,u,f,A),-1<u&&(An(S[u]),Array.prototype.splice.call(S,u,1),S.length==0&&(delete i.g[a],i.h--)))):i&&(i=Vr(i))&&(a=i.g[a.toString()],i=-1,a&&(i=br(a,u,f,A)),(u=-1<i?a[i]:null)&&Pr(u))}function Pr(i){if(typeof i!="number"&&i&&!i.da){var a=i.src;if(a&&a[Te])Sr(a.i,i);else{var u=i.type,f=i.proxy;a.removeEventListener?a.removeEventListener(u,f,i.capture):a.detachEvent?a.detachEvent(ls(u),f):a.addListener&&a.removeListener&&a.removeListener(f),(u=Vr(a))?(Sr(u,i),u.h==0&&(u.src=null,a[Rr]=null)):An(i)}}}function ls(i){return i in Cr?Cr[i]:Cr[i]="on"+i}function Hl(i,a){if(i.da)i=!0;else{a=new Ft(a,this);var u=i.listener,f=i.ha||i.src;i.fa&&Pr(i),i=u.call(f,a)}return i}function Vr(i){return i=i[Rr],i instanceof Sn?i:null}var Dr="__closure_events_fn_"+(1e9*Math.random()>>>0);function us(i){return typeof i=="function"?i:(i[Dr]||(i[Dr]=function(a){return i.handleEvent(a)}),i[Dr])}function Et(){ct.call(this),this.i=new Sn(this),this.M=this,this.F=null}D(Et,ct),Et.prototype[Te]=!0,Et.prototype.removeEventListener=function(i,a,u,f){as(this,i,a,u,f)};function Rt(i,a){var u,f=i.F;if(f)for(u=[];f;f=f.F)u.push(f);if(i=i.M,f=a.type||a,typeof a=="string")a=new Y(a,i);else if(a instanceof Y)a.target=a.target||i;else{var A=a;a=new Y(f,i),p(a,A)}if(A=!0,u)for(var S=u.length-1;0<=S;S--){var V=a.g=u[S];A=bn(V,f,!0,a)&&A}if(V=a.g=i,A=bn(V,f,!0,a)&&A,A=bn(V,f,!1,a)&&A,u)for(S=0;S<u.length;S++)V=a.g=u[S],A=bn(V,f,!1,a)&&A}Et.prototype.N=function(){if(Et.aa.N.call(this),this.i){var i=this.i,a;for(a in i.g){for(var u=i.g[a],f=0;f<u.length;f++)An(u[f]);delete i.g[a],i.h--}}this.F=null},Et.prototype.K=function(i,a,u,f){return this.i.add(String(i),a,!1,u,f)},Et.prototype.L=function(i,a,u,f){return this.i.add(String(i),a,!0,u,f)};function bn(i,a,u,f){if(a=i.i.g[String(a)],!a)return!0;a=a.concat();for(var A=!0,S=0;S<a.length;++S){var V=a[S];if(V&&!V.da&&V.capture==u){var Z=V.listener,pt=V.ha||V.src;V.fa&&Sr(i.i,V),A=Z.call(pt,f)!==!1&&A}}return A&&!f.defaultPrevented}function cs(i,a,u){if(typeof i=="function")u&&(i=T(i,u));else if(i&&typeof i.handleEvent=="function")i=T(i.handleEvent,i);else throw Error("Invalid listener argument");return 2147483647<Number(a)?-1:c.setTimeout(i,a||0)}function hs(i){i.g=cs(()=>{i.g=null,i.i&&(i.i=!1,hs(i))},i.l);const a=i.h;i.h=null,i.m.apply(null,a)}class Gl extends ct{constructor(a,u){super(),this.m=a,this.l=u,this.h=null,this.i=!1,this.g=null}j(a){this.h=arguments,this.g?this.i=!0:hs(this)}N(){super.N(),this.g&&(c.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Be(i){ct.call(this),this.h=i,this.g={}}D(Be,ct);var fs=[];function ds(i){G(i.g,function(a,u){this.g.hasOwnProperty(u)&&Pr(a)},i),i.g={}}Be.prototype.N=function(){Be.aa.N.call(this),ds(this)},Be.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Nr=c.JSON.stringify,Kl=c.JSON.parse,Wl=class{stringify(i){return c.JSON.stringify(i,void 0)}parse(i){return c.JSON.parse(i,void 0)}};function xr(){}xr.prototype.h=null;function ps(i){return i.h||(i.h=i.i())}function ms(){}var ze={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function kr(){Y.call(this,"d")}D(kr,Y);function Or(){Y.call(this,"c")}D(Or,Y);var oe={},gs=null;function Rn(){return gs=gs||new Et}oe.La="serverreachability";function _s(i){Y.call(this,oe.La,i)}D(_s,Y);function qe(i){const a=Rn();Rt(a,new _s(a))}oe.STAT_EVENT="statevent";function ys(i,a){Y.call(this,oe.STAT_EVENT,i),this.stat=a}D(ys,Y);function Ct(i){const a=Rn();Rt(a,new ys(a,i))}oe.Ma="timingevent";function vs(i,a){Y.call(this,oe.Ma,i),this.size=a}D(vs,Y);function $e(i,a){if(typeof i!="function")throw Error("Fn must not be null and must be a function");return c.setTimeout(function(){i()},a)}function He(){this.g=!0}He.prototype.xa=function(){this.g=!1};function Ql(i,a,u,f,A,S){i.info(function(){if(i.g)if(S)for(var V="",Z=S.split("&"),pt=0;pt<Z.length;pt++){var X=Z[pt].split("=");if(1<X.length){var Tt=X[0];X=X[1];var It=Tt.split("_");V=2<=It.length&&It[1]=="type"?V+(Tt+"="+X+"&"):V+(Tt+"=redacted&")}}else V=null;else V=S;return"XMLHTTP REQ ("+f+") [attempt "+A+"]: "+a+`
`+u+`
`+V})}function Xl(i,a,u,f,A,S,V){i.info(function(){return"XMLHTTP RESP ("+f+") [ attempt "+A+"]: "+a+`
`+u+`
`+S+" "+V})}function Ie(i,a,u,f){i.info(function(){return"XMLHTTP TEXT ("+a+"): "+Yl(i,u)+(f?" "+f:"")})}function Jl(i,a){i.info(function(){return"TIMEOUT: "+a})}He.prototype.info=function(){};function Yl(i,a){if(!i.g)return a;if(!a)return null;try{var u=JSON.parse(a);if(u){for(i=0;i<u.length;i++)if(Array.isArray(u[i])){var f=u[i];if(!(2>f.length)){var A=f[1];if(Array.isArray(A)&&!(1>A.length)){var S=A[0];if(S!="noop"&&S!="stop"&&S!="close")for(var V=1;V<A.length;V++)A[V]=""}}}}return Nr(u)}catch{return a}}var Cn={NO_ERROR:0,gb:1,tb:2,sb:3,nb:4,rb:5,ub:6,Ia:7,TIMEOUT:8,xb:9},Es={lb:"complete",Hb:"success",Ja:"error",Ia:"abort",zb:"ready",Ab:"readystatechange",TIMEOUT:"timeout",vb:"incrementaldata",yb:"progress",ob:"downloadprogress",Pb:"uploadprogress"},Mr;function Pn(){}D(Pn,xr),Pn.prototype.g=function(){return new XMLHttpRequest},Pn.prototype.i=function(){return{}},Mr=new Pn;function Qt(i,a,u,f){this.j=i,this.i=a,this.l=u,this.R=f||1,this.U=new Be(this),this.I=45e3,this.H=null,this.o=!1,this.m=this.A=this.v=this.L=this.F=this.S=this.B=null,this.D=[],this.g=null,this.C=0,this.s=this.u=null,this.X=-1,this.J=!1,this.O=0,this.M=null,this.W=this.K=this.T=this.P=!1,this.h=new Ts}function Ts(){this.i=null,this.g="",this.h=!1}var Is={},Lr={};function Fr(i,a,u){i.L=1,i.v=xn(qt(a)),i.m=u,i.P=!0,ws(i,null)}function ws(i,a){i.F=Date.now(),Vn(i),i.A=qt(i.v);var u=i.A,f=i.R;Array.isArray(f)||(f=[String(f)]),Ls(u.i,"t",f),i.C=0,u=i.j.J,i.h=new Ts,i.g=eo(i.j,u?a:null,!i.m),0<i.O&&(i.M=new Gl(T(i.Y,i,i.g),i.O)),a=i.U,u=i.g,f=i.ca;var A="readystatechange";Array.isArray(A)||(A&&(fs[0]=A.toString()),A=fs);for(var S=0;S<A.length;S++){var V=os(u,A[S],f||a.handleEvent,!1,a.h||a);if(!V)break;a.g[V.key]=V}a=i.H?_(i.H):{},i.m?(i.u||(i.u="POST"),a["Content-Type"]="application/x-www-form-urlencoded",i.g.ea(i.A,i.u,i.m,a)):(i.u="GET",i.g.ea(i.A,i.u,null,a)),qe(),Ql(i.i,i.u,i.A,i.l,i.R,i.m)}Qt.prototype.ca=function(i){i=i.target;const a=this.M;a&&$t(i)==3?a.j():this.Y(i)},Qt.prototype.Y=function(i){try{if(i==this.g)t:{const It=$t(this.g);var a=this.g.Ba();const Se=this.g.Z();if(!(3>It)&&(It!=3||this.g&&(this.h.h||this.g.oa()||$s(this.g)))){this.J||It!=4||a==7||(a==8||0>=Se?qe(3):qe(2)),Ur(this);var u=this.g.Z();this.X=u;e:if(As(this)){var f=$s(this.g);i="";var A=f.length,S=$t(this.g)==4;if(!this.h.i){if(typeof TextDecoder>"u"){ae(this),Ge(this);var V="";break e}this.h.i=new c.TextDecoder}for(a=0;a<A;a++)this.h.h=!0,i+=this.h.i.decode(f[a],{stream:!(S&&a==A-1)});f.length=0,this.h.g+=i,this.C=0,V=this.h.g}else V=this.g.oa();if(this.o=u==200,Xl(this.i,this.u,this.A,this.l,this.R,It,u),this.o){if(this.T&&!this.K){e:{if(this.g){var Z,pt=this.g;if((Z=pt.g?pt.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!$(Z)){var X=Z;break e}}X=null}if(u=X)Ie(this.i,this.l,u,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,jr(this,u);else{this.o=!1,this.s=3,Ct(12),ae(this),Ge(this);break t}}if(this.P){u=!0;let xt;for(;!this.J&&this.C<V.length;)if(xt=Zl(this,V),xt==Lr){It==4&&(this.s=4,Ct(14),u=!1),Ie(this.i,this.l,null,"[Incomplete Response]");break}else if(xt==Is){this.s=4,Ct(15),Ie(this.i,this.l,V,"[Invalid Chunk]"),u=!1;break}else Ie(this.i,this.l,xt,null),jr(this,xt);if(As(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),It!=4||V.length!=0||this.h.h||(this.s=1,Ct(16),u=!1),this.o=this.o&&u,!u)Ie(this.i,this.l,V,"[Invalid Chunked Response]"),ae(this),Ge(this);else if(0<V.length&&!this.W){this.W=!0;var Tt=this.j;Tt.g==this&&Tt.ba&&!Tt.M&&(Tt.j.info("Great, no buffering proxy detected. Bytes received: "+V.length),Gr(Tt),Tt.M=!0,Ct(11))}}else Ie(this.i,this.l,V,null),jr(this,V);It==4&&ae(this),this.o&&!this.J&&(It==4?Js(this.j,this):(this.o=!1,Vn(this)))}else gu(this.g),u==400&&0<V.indexOf("Unknown SID")?(this.s=3,Ct(12)):(this.s=0,Ct(13)),ae(this),Ge(this)}}}catch{}finally{}};function As(i){return i.g?i.u=="GET"&&i.L!=2&&i.j.Ca:!1}function Zl(i,a){var u=i.C,f=a.indexOf(`
`,u);return f==-1?Lr:(u=Number(a.substring(u,f)),isNaN(u)?Is:(f+=1,f+u>a.length?Lr:(a=a.slice(f,f+u),i.C=f+u,a)))}Qt.prototype.cancel=function(){this.J=!0,ae(this)};function Vn(i){i.S=Date.now()+i.I,Ss(i,i.I)}function Ss(i,a){if(i.B!=null)throw Error("WatchDog timer not null");i.B=$e(T(i.ba,i),a)}function Ur(i){i.B&&(c.clearTimeout(i.B),i.B=null)}Qt.prototype.ba=function(){this.B=null;const i=Date.now();0<=i-this.S?(Jl(this.i,this.A),this.L!=2&&(qe(),Ct(17)),ae(this),this.s=2,Ge(this)):Ss(this,this.S-i)};function Ge(i){i.j.G==0||i.J||Js(i.j,i)}function ae(i){Ur(i);var a=i.M;a&&typeof a.ma=="function"&&a.ma(),i.M=null,ds(i.U),i.g&&(a=i.g,i.g=null,a.abort(),a.ma())}function jr(i,a){try{var u=i.j;if(u.G!=0&&(u.g==i||Br(u.h,i))){if(!i.K&&Br(u.h,i)&&u.G==3){try{var f=u.Da.g.parse(a)}catch{f=null}if(Array.isArray(f)&&f.length==3){var A=f;if(A[0]==0){t:if(!u.u){if(u.g)if(u.g.F+3e3<i.F)Un(u),Ln(u);else break t;Hr(u),Ct(18)}}else u.za=A[1],0<u.za-u.T&&37500>A[2]&&u.F&&u.v==0&&!u.C&&(u.C=$e(T(u.Za,u),6e3));if(1>=Cs(u.h)&&u.ca){try{u.ca()}catch{}u.ca=void 0}}else ue(u,11)}else if((i.K||u.g==i)&&Un(u),!$(a))for(A=u.Da.g.parse(a),a=0;a<A.length;a++){let X=A[a];if(u.T=X[0],X=X[1],u.G==2)if(X[0]=="c"){u.K=X[1],u.ia=X[2];const Tt=X[3];Tt!=null&&(u.la=Tt,u.j.info("VER="+u.la));const It=X[4];It!=null&&(u.Aa=It,u.j.info("SVER="+u.Aa));const Se=X[5];Se!=null&&typeof Se=="number"&&0<Se&&(f=1.5*Se,u.L=f,u.j.info("backChannelRequestTimeoutMs_="+f)),f=u;const xt=i.g;if(xt){const Bn=xt.g?xt.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(Bn){var S=f.h;S.g||Bn.indexOf("spdy")==-1&&Bn.indexOf("quic")==-1&&Bn.indexOf("h2")==-1||(S.j=S.l,S.g=new Set,S.h&&(zr(S,S.h),S.h=null))}if(f.D){const Kr=xt.g?xt.g.getResponseHeader("X-HTTP-Session-Id"):null;Kr&&(f.ya=Kr,et(f.I,f.D,Kr))}}u.G=3,u.l&&u.l.ua(),u.ba&&(u.R=Date.now()-i.F,u.j.info("Handshake RTT: "+u.R+"ms")),f=u;var V=i;if(f.qa=to(f,f.J?f.ia:null,f.W),V.K){Ps(f.h,V);var Z=V,pt=f.L;pt&&(Z.I=pt),Z.B&&(Ur(Z),Vn(Z)),f.g=V}else Qs(f);0<u.i.length&&Fn(u)}else X[0]!="stop"&&X[0]!="close"||ue(u,7);else u.G==3&&(X[0]=="stop"||X[0]=="close"?X[0]=="stop"?ue(u,7):$r(u):X[0]!="noop"&&u.l&&u.l.ta(X),u.v=0)}}qe(4)}catch{}}var tu=class{constructor(i,a){this.g=i,this.map=a}};function bs(i){this.l=i||10,c.PerformanceNavigationTiming?(i=c.performance.getEntriesByType("navigation"),i=0<i.length&&(i[0].nextHopProtocol=="hq"||i[0].nextHopProtocol=="h2")):i=!!(c.chrome&&c.chrome.loadTimes&&c.chrome.loadTimes()&&c.chrome.loadTimes().wasFetchedViaSpdy),this.j=i?this.l:1,this.g=null,1<this.j&&(this.g=new Set),this.h=null,this.i=[]}function Rs(i){return i.h?!0:i.g?i.g.size>=i.j:!1}function Cs(i){return i.h?1:i.g?i.g.size:0}function Br(i,a){return i.h?i.h==a:i.g?i.g.has(a):!1}function zr(i,a){i.g?i.g.add(a):i.h=a}function Ps(i,a){i.h&&i.h==a?i.h=null:i.g&&i.g.has(a)&&i.g.delete(a)}bs.prototype.cancel=function(){if(this.i=Vs(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const i of this.g.values())i.cancel();this.g.clear()}};function Vs(i){if(i.h!=null)return i.i.concat(i.h.D);if(i.g!=null&&i.g.size!==0){let a=i.i;for(const u of i.g.values())a=a.concat(u.D);return a}return M(i.i)}function eu(i){if(i.V&&typeof i.V=="function")return i.V();if(typeof Map<"u"&&i instanceof Map||typeof Set<"u"&&i instanceof Set)return Array.from(i.values());if(typeof i=="string")return i.split("");if(d(i)){for(var a=[],u=i.length,f=0;f<u;f++)a.push(i[f]);return a}a=[],u=0;for(f in i)a[u++]=i[f];return a}function nu(i){if(i.na&&typeof i.na=="function")return i.na();if(!i.V||typeof i.V!="function"){if(typeof Map<"u"&&i instanceof Map)return Array.from(i.keys());if(!(typeof Set<"u"&&i instanceof Set)){if(d(i)||typeof i=="string"){var a=[];i=i.length;for(var u=0;u<i;u++)a.push(u);return a}a=[],u=0;for(const f in i)a[u++]=f;return a}}}function Ds(i,a){if(i.forEach&&typeof i.forEach=="function")i.forEach(a,void 0);else if(d(i)||typeof i=="string")Array.prototype.forEach.call(i,a,void 0);else for(var u=nu(i),f=eu(i),A=f.length,S=0;S<A;S++)a.call(void 0,f[S],u&&u[S],i)}var Ns=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function ru(i,a){if(i){i=i.split("&");for(var u=0;u<i.length;u++){var f=i[u].indexOf("="),A=null;if(0<=f){var S=i[u].substring(0,f);A=i[u].substring(f+1)}else S=i[u];a(S,A?decodeURIComponent(A.replace(/\+/g," ")):"")}}}function le(i){if(this.g=this.o=this.j="",this.s=null,this.m=this.l="",this.h=!1,i instanceof le){this.h=i.h,Dn(this,i.j),this.o=i.o,this.g=i.g,Nn(this,i.s),this.l=i.l;var a=i.i,u=new Qe;u.i=a.i,a.g&&(u.g=new Map(a.g),u.h=a.h),xs(this,u),this.m=i.m}else i&&(a=String(i).match(Ns))?(this.h=!1,Dn(this,a[1]||"",!0),this.o=Ke(a[2]||""),this.g=Ke(a[3]||"",!0),Nn(this,a[4]),this.l=Ke(a[5]||"",!0),xs(this,a[6]||"",!0),this.m=Ke(a[7]||"")):(this.h=!1,this.i=new Qe(null,this.h))}le.prototype.toString=function(){var i=[],a=this.j;a&&i.push(We(a,ks,!0),":");var u=this.g;return(u||a=="file")&&(i.push("//"),(a=this.o)&&i.push(We(a,ks,!0),"@"),i.push(encodeURIComponent(String(u)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),u=this.s,u!=null&&i.push(":",String(u))),(u=this.l)&&(this.g&&u.charAt(0)!="/"&&i.push("/"),i.push(We(u,u.charAt(0)=="/"?ou:su,!0))),(u=this.i.toString())&&i.push("?",u),(u=this.m)&&i.push("#",We(u,lu)),i.join("")};function qt(i){return new le(i)}function Dn(i,a,u){i.j=u?Ke(a,!0):a,i.j&&(i.j=i.j.replace(/:$/,""))}function Nn(i,a){if(a){if(a=Number(a),isNaN(a)||0>a)throw Error("Bad port number "+a);i.s=a}else i.s=null}function xs(i,a,u){a instanceof Qe?(i.i=a,uu(i.i,i.h)):(u||(a=We(a,au)),i.i=new Qe(a,i.h))}function et(i,a,u){i.i.set(a,u)}function xn(i){return et(i,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),i}function Ke(i,a){return i?a?decodeURI(i.replace(/%25/g,"%2525")):decodeURIComponent(i):""}function We(i,a,u){return typeof i=="string"?(i=encodeURI(i).replace(a,iu),u&&(i=i.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),i):null}function iu(i){return i=i.charCodeAt(0),"%"+(i>>4&15).toString(16)+(i&15).toString(16)}var ks=/[#\/\?@]/g,su=/[#\?:]/g,ou=/[#\?]/g,au=/[#\?@]/g,lu=/#/g;function Qe(i,a){this.h=this.g=null,this.i=i||null,this.j=!!a}function Xt(i){i.g||(i.g=new Map,i.h=0,i.i&&ru(i.i,function(a,u){i.add(decodeURIComponent(a.replace(/\+/g," ")),u)}))}n=Qe.prototype,n.add=function(i,a){Xt(this),this.i=null,i=we(this,i);var u=this.g.get(i);return u||this.g.set(i,u=[]),u.push(a),this.h+=1,this};function Os(i,a){Xt(i),a=we(i,a),i.g.has(a)&&(i.i=null,i.h-=i.g.get(a).length,i.g.delete(a))}function Ms(i,a){return Xt(i),a=we(i,a),i.g.has(a)}n.forEach=function(i,a){Xt(this),this.g.forEach(function(u,f){u.forEach(function(A){i.call(a,A,f,this)},this)},this)},n.na=function(){Xt(this);const i=Array.from(this.g.values()),a=Array.from(this.g.keys()),u=[];for(let f=0;f<a.length;f++){const A=i[f];for(let S=0;S<A.length;S++)u.push(a[f])}return u},n.V=function(i){Xt(this);let a=[];if(typeof i=="string")Ms(this,i)&&(a=a.concat(this.g.get(we(this,i))));else{i=Array.from(this.g.values());for(let u=0;u<i.length;u++)a=a.concat(i[u])}return a},n.set=function(i,a){return Xt(this),this.i=null,i=we(this,i),Ms(this,i)&&(this.h-=this.g.get(i).length),this.g.set(i,[a]),this.h+=1,this},n.get=function(i,a){return i?(i=this.V(i),0<i.length?String(i[0]):a):a};function Ls(i,a,u){Os(i,a),0<u.length&&(i.i=null,i.g.set(we(i,a),M(u)),i.h+=u.length)}n.toString=function(){if(this.i)return this.i;if(!this.g)return"";const i=[],a=Array.from(this.g.keys());for(var u=0;u<a.length;u++){var f=a[u];const S=encodeURIComponent(String(f)),V=this.V(f);for(f=0;f<V.length;f++){var A=S;V[f]!==""&&(A+="="+encodeURIComponent(String(V[f]))),i.push(A)}}return this.i=i.join("&")};function we(i,a){return a=String(a),i.j&&(a=a.toLowerCase()),a}function uu(i,a){a&&!i.j&&(Xt(i),i.i=null,i.g.forEach(function(u,f){var A=f.toLowerCase();f!=A&&(Os(this,f),Ls(this,A,u))},i)),i.j=a}function cu(i,a){const u=new He;if(c.Image){const f=new Image;f.onload=C(Jt,u,"TestLoadImage: loaded",!0,a,f),f.onerror=C(Jt,u,"TestLoadImage: error",!1,a,f),f.onabort=C(Jt,u,"TestLoadImage: abort",!1,a,f),f.ontimeout=C(Jt,u,"TestLoadImage: timeout",!1,a,f),c.setTimeout(function(){f.ontimeout&&f.ontimeout()},1e4),f.src=i}else a(!1)}function hu(i,a){const u=new He,f=new AbortController,A=setTimeout(()=>{f.abort(),Jt(u,"TestPingServer: timeout",!1,a)},1e4);fetch(i,{signal:f.signal}).then(S=>{clearTimeout(A),S.ok?Jt(u,"TestPingServer: ok",!0,a):Jt(u,"TestPingServer: server error",!1,a)}).catch(()=>{clearTimeout(A),Jt(u,"TestPingServer: error",!1,a)})}function Jt(i,a,u,f,A){try{A&&(A.onload=null,A.onerror=null,A.onabort=null,A.ontimeout=null),f(u)}catch{}}function fu(){this.g=new Wl}function du(i,a,u){const f=u||"";try{Ds(i,function(A,S){let V=A;g(A)&&(V=Nr(A)),a.push(f+S+"="+encodeURIComponent(V))})}catch(A){throw a.push(f+"type="+encodeURIComponent("_badmap")),A}}function kn(i){this.l=i.Ub||null,this.j=i.eb||!1}D(kn,xr),kn.prototype.g=function(){return new On(this.l,this.j)},kn.prototype.i=(function(i){return function(){return i}})({});function On(i,a){Et.call(this),this.D=i,this.o=a,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.u=new Headers,this.h=null,this.B="GET",this.A="",this.g=!1,this.v=this.j=this.l=null}D(On,Et),n=On.prototype,n.open=function(i,a){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.B=i,this.A=a,this.readyState=1,Je(this)},n.send=function(i){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");this.g=!0;const a={headers:this.u,method:this.B,credentials:this.m,cache:void 0};i&&(a.body=i),(this.D||c).fetch(new Request(this.A,a)).then(this.Sa.bind(this),this.ga.bind(this))},n.abort=function(){this.response=this.responseText="",this.u=new Headers,this.status=0,this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),1<=this.readyState&&this.g&&this.readyState!=4&&(this.g=!1,Xe(this)),this.readyState=0},n.Sa=function(i){if(this.g&&(this.l=i,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=i.headers,this.readyState=2,Je(this)),this.g&&(this.readyState=3,Je(this),this.g)))if(this.responseType==="arraybuffer")i.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if(typeof c.ReadableStream<"u"&&"body"in i){if(this.j=i.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.v=new TextDecoder;Fs(this)}else i.text().then(this.Ra.bind(this),this.ga.bind(this))};function Fs(i){i.j.read().then(i.Pa.bind(i)).catch(i.ga.bind(i))}n.Pa=function(i){if(this.g){if(this.o&&i.value)this.response.push(i.value);else if(!this.o){var a=i.value?i.value:new Uint8Array(0);(a=this.v.decode(a,{stream:!i.done}))&&(this.response=this.responseText+=a)}i.done?Xe(this):Je(this),this.readyState==3&&Fs(this)}},n.Ra=function(i){this.g&&(this.response=this.responseText=i,Xe(this))},n.Qa=function(i){this.g&&(this.response=i,Xe(this))},n.ga=function(){this.g&&Xe(this)};function Xe(i){i.readyState=4,i.l=null,i.j=null,i.v=null,Je(i)}n.setRequestHeader=function(i,a){this.u.append(i,a)},n.getResponseHeader=function(i){return this.h&&this.h.get(i.toLowerCase())||""},n.getAllResponseHeaders=function(){if(!this.h)return"";const i=[],a=this.h.entries();for(var u=a.next();!u.done;)u=u.value,i.push(u[0]+": "+u[1]),u=a.next();return i.join(`\r
`)};function Je(i){i.onreadystatechange&&i.onreadystatechange.call(i)}Object.defineProperty(On.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(i){this.m=i?"include":"same-origin"}});function Us(i){let a="";return G(i,function(u,f){a+=f,a+=":",a+=u,a+=`\r
`}),a}function qr(i,a,u){t:{for(f in u){var f=!1;break t}f=!0}f||(u=Us(u),typeof i=="string"?u!=null&&encodeURIComponent(String(u)):et(i,a,u))}function st(i){Et.call(this),this.headers=new Map,this.o=i||null,this.h=!1,this.v=this.g=null,this.D="",this.m=0,this.l="",this.j=this.B=this.u=this.A=!1,this.I=null,this.H="",this.J=!1}D(st,Et);var pu=/^https?$/i,mu=["POST","PUT"];n=st.prototype,n.Ha=function(i){this.J=i},n.ea=function(i,a,u,f){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+i);a=a?a.toUpperCase():"GET",this.D=i,this.l="",this.m=0,this.A=!1,this.h=!0,this.g=this.o?this.o.g():Mr.g(),this.v=this.o?ps(this.o):ps(Mr),this.g.onreadystatechange=T(this.Ea,this);try{this.B=!0,this.g.open(a,String(i),!0),this.B=!1}catch(S){js(this,S);return}if(i=u||"",u=new Map(this.headers),f)if(Object.getPrototypeOf(f)===Object.prototype)for(var A in f)u.set(A,f[A]);else if(typeof f.keys=="function"&&typeof f.get=="function")for(const S of f.keys())u.set(S,f.get(S));else throw Error("Unknown input type for opt_headers: "+String(f));f=Array.from(u.keys()).find(S=>S.toLowerCase()=="content-type"),A=c.FormData&&i instanceof c.FormData,!(0<=Array.prototype.indexOf.call(mu,a,void 0))||f||A||u.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[S,V]of u)this.g.setRequestHeader(S,V);this.H&&(this.g.responseType=this.H),"withCredentials"in this.g&&this.g.withCredentials!==this.J&&(this.g.withCredentials=this.J);try{qs(this),this.u=!0,this.g.send(i),this.u=!1}catch(S){js(this,S)}};function js(i,a){i.h=!1,i.g&&(i.j=!0,i.g.abort(),i.j=!1),i.l=a,i.m=5,Bs(i),Mn(i)}function Bs(i){i.A||(i.A=!0,Rt(i,"complete"),Rt(i,"error"))}n.abort=function(i){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.m=i||7,Rt(this,"complete"),Rt(this,"abort"),Mn(this))},n.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Mn(this,!0)),st.aa.N.call(this)},n.Ea=function(){this.s||(this.B||this.u||this.j?zs(this):this.bb())},n.bb=function(){zs(this)};function zs(i){if(i.h&&typeof l<"u"&&(!i.v[1]||$t(i)!=4||i.Z()!=2)){if(i.u&&$t(i)==4)cs(i.Ea,0,i);else if(Rt(i,"readystatechange"),$t(i)==4){i.h=!1;try{const V=i.Z();t:switch(V){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var a=!0;break t;default:a=!1}var u;if(!(u=a)){var f;if(f=V===0){var A=String(i.D).match(Ns)[1]||null;!A&&c.self&&c.self.location&&(A=c.self.location.protocol.slice(0,-1)),f=!pu.test(A?A.toLowerCase():"")}u=f}if(u)Rt(i,"complete"),Rt(i,"success");else{i.m=6;try{var S=2<$t(i)?i.g.statusText:""}catch{S=""}i.l=S+" ["+i.Z()+"]",Bs(i)}}finally{Mn(i)}}}}function Mn(i,a){if(i.g){qs(i);const u=i.g,f=i.v[0]?()=>{}:null;i.g=null,i.v=null,a||Rt(i,"ready");try{u.onreadystatechange=f}catch{}}}function qs(i){i.I&&(c.clearTimeout(i.I),i.I=null)}n.isActive=function(){return!!this.g};function $t(i){return i.g?i.g.readyState:0}n.Z=function(){try{return 2<$t(this)?this.g.status:-1}catch{return-1}},n.oa=function(){try{return this.g?this.g.responseText:""}catch{return""}},n.Oa=function(i){if(this.g){var a=this.g.responseText;return i&&a.indexOf(i)==0&&(a=a.substring(i.length)),Kl(a)}};function $s(i){try{if(!i.g)return null;if("response"in i.g)return i.g.response;switch(i.H){case"":case"text":return i.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in i.g)return i.g.mozResponseArrayBuffer}return null}catch{return null}}function gu(i){const a={};i=(i.g&&2<=$t(i)&&i.g.getAllResponseHeaders()||"").split(`\r
`);for(let f=0;f<i.length;f++){if($(i[f]))continue;var u=m(i[f]);const A=u[0];if(u=u[1],typeof u!="string")continue;u=u.trim();const S=a[A]||[];a[A]=S,S.push(u)}I(a,function(f){return f.join(", ")})}n.Ba=function(){return this.m},n.Ka=function(){return typeof this.l=="string"?this.l:String(this.l)};function Ye(i,a,u){return u&&u.internalChannelParams&&u.internalChannelParams[i]||a}function Hs(i){this.Aa=0,this.i=[],this.j=new He,this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null,this.Ya=this.U=0,this.Va=Ye("failFast",!1,i),this.F=this.C=this.u=this.s=this.l=null,this.X=!0,this.za=this.T=-1,this.Y=this.v=this.B=0,this.Ta=Ye("baseRetryDelayMs",5e3,i),this.cb=Ye("retryDelaySeedMs",1e4,i),this.Wa=Ye("forwardChannelMaxRetries",2,i),this.wa=Ye("forwardChannelRequestTimeoutMs",2e4,i),this.pa=i&&i.xmlHttpFactory||void 0,this.Xa=i&&i.Tb||void 0,this.Ca=i&&i.useFetchStreams||!1,this.L=void 0,this.J=i&&i.supportsCrossDomainXhr||!1,this.K="",this.h=new bs(i&&i.concurrentRequestLimit),this.Da=new fu,this.P=i&&i.fastHandshake||!1,this.O=i&&i.encodeInitMessageHeaders||!1,this.P&&this.O&&(this.O=!1),this.Ua=i&&i.Rb||!1,i&&i.xa&&this.j.xa(),i&&i.forceLongPolling&&(this.X=!1),this.ba=!this.P&&this.X&&i&&i.detectBufferingProxy||!1,this.ja=void 0,i&&i.longPollingTimeout&&0<i.longPollingTimeout&&(this.ja=i.longPollingTimeout),this.ca=void 0,this.R=0,this.M=!1,this.ka=this.A=null}n=Hs.prototype,n.la=8,n.G=1,n.connect=function(i,a,u,f){Ct(0),this.W=i,this.H=a||{},u&&f!==void 0&&(this.H.OSID=u,this.H.OAID=f),this.F=this.X,this.I=to(this,null,this.W),Fn(this)};function $r(i){if(Gs(i),i.G==3){var a=i.U++,u=qt(i.I);if(et(u,"SID",i.K),et(u,"RID",a),et(u,"TYPE","terminate"),Ze(i,u),a=new Qt(i,i.j,a),a.L=2,a.v=xn(qt(u)),u=!1,c.navigator&&c.navigator.sendBeacon)try{u=c.navigator.sendBeacon(a.v.toString(),"")}catch{}!u&&c.Image&&(new Image().src=a.v,u=!0),u||(a.g=eo(a.j,null),a.g.ea(a.v)),a.F=Date.now(),Vn(a)}Zs(i)}function Ln(i){i.g&&(Gr(i),i.g.cancel(),i.g=null)}function Gs(i){Ln(i),i.u&&(c.clearTimeout(i.u),i.u=null),Un(i),i.h.cancel(),i.s&&(typeof i.s=="number"&&c.clearTimeout(i.s),i.s=null)}function Fn(i){if(!Rs(i.h)&&!i.s){i.s=!0;var a=i.Ga;Q||vt(),at||(Q(),at=!0),dt.add(a,i),i.B=0}}function _u(i,a){return Cs(i.h)>=i.h.j-(i.s?1:0)?!1:i.s?(i.i=a.D.concat(i.i),!0):i.G==1||i.G==2||i.B>=(i.Va?0:i.Wa)?!1:(i.s=$e(T(i.Ga,i,a),Ys(i,i.B)),i.B++,!0)}n.Ga=function(i){if(this.s)if(this.s=null,this.G==1){if(!i){this.U=Math.floor(1e5*Math.random()),i=this.U++;const A=new Qt(this,this.j,i);let S=this.o;if(this.S&&(S?(S=_(S),p(S,this.S)):S=this.S),this.m!==null||this.O||(A.H=S,S=null),this.P)t:{for(var a=0,u=0;u<this.i.length;u++){e:{var f=this.i[u];if("__data__"in f.map&&(f=f.map.__data__,typeof f=="string")){f=f.length;break e}f=void 0}if(f===void 0)break;if(a+=f,4096<a){a=u;break t}if(a===4096||u===this.i.length-1){a=u+1;break t}}a=1e3}else a=1e3;a=Ws(this,A,a),u=qt(this.I),et(u,"RID",i),et(u,"CVER",22),this.D&&et(u,"X-HTTP-Session-Id",this.D),Ze(this,u),S&&(this.O?a="headers="+encodeURIComponent(String(Us(S)))+"&"+a:this.m&&qr(u,this.m,S)),zr(this.h,A),this.Ua&&et(u,"TYPE","init"),this.P?(et(u,"$req",a),et(u,"SID","null"),A.T=!0,Fr(A,u,null)):Fr(A,u,a),this.G=2}}else this.G==3&&(i?Ks(this,i):this.i.length==0||Rs(this.h)||Ks(this))};function Ks(i,a){var u;a?u=a.l:u=i.U++;const f=qt(i.I);et(f,"SID",i.K),et(f,"RID",u),et(f,"AID",i.T),Ze(i,f),i.m&&i.o&&qr(f,i.m,i.o),u=new Qt(i,i.j,u,i.B+1),i.m===null&&(u.H=i.o),a&&(i.i=a.D.concat(i.i)),a=Ws(i,u,1e3),u.I=Math.round(.5*i.wa)+Math.round(.5*i.wa*Math.random()),zr(i.h,u),Fr(u,f,a)}function Ze(i,a){i.H&&G(i.H,function(u,f){et(a,f,u)}),i.l&&Ds({},function(u,f){et(a,f,u)})}function Ws(i,a,u){u=Math.min(i.i.length,u);var f=i.l?T(i.l.Na,i.l,i):null;t:{var A=i.i;let S=-1;for(;;){const V=["count="+u];S==-1?0<u?(S=A[0].g,V.push("ofs="+S)):S=0:V.push("ofs="+S);let Z=!0;for(let pt=0;pt<u;pt++){let X=A[pt].g;const Tt=A[pt].map;if(X-=S,0>X)S=Math.max(0,A[pt].g-100),Z=!1;else try{du(Tt,V,"req"+X+"_")}catch{f&&f(Tt)}}if(Z){f=V.join("&");break t}}}return i=i.i.splice(0,u),a.D=i,f}function Qs(i){if(!i.g&&!i.u){i.Y=1;var a=i.Fa;Q||vt(),at||(Q(),at=!0),dt.add(a,i),i.v=0}}function Hr(i){return i.g||i.u||3<=i.v?!1:(i.Y++,i.u=$e(T(i.Fa,i),Ys(i,i.v)),i.v++,!0)}n.Fa=function(){if(this.u=null,Xs(this),this.ba&&!(this.M||this.g==null||0>=this.R)){var i=2*this.R;this.j.info("BP detection timer enabled: "+i),this.A=$e(T(this.ab,this),i)}},n.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.M=!0,Ct(10),Ln(this),Xs(this))};function Gr(i){i.A!=null&&(c.clearTimeout(i.A),i.A=null)}function Xs(i){i.g=new Qt(i,i.j,"rpc",i.Y),i.m===null&&(i.g.H=i.o),i.g.O=0;var a=qt(i.qa);et(a,"RID","rpc"),et(a,"SID",i.K),et(a,"AID",i.T),et(a,"CI",i.F?"0":"1"),!i.F&&i.ja&&et(a,"TO",i.ja),et(a,"TYPE","xmlhttp"),Ze(i,a),i.m&&i.o&&qr(a,i.m,i.o),i.L&&(i.g.I=i.L);var u=i.g;i=i.ia,u.L=1,u.v=xn(qt(a)),u.m=null,u.P=!0,ws(u,i)}n.Za=function(){this.C!=null&&(this.C=null,Ln(this),Hr(this),Ct(19))};function Un(i){i.C!=null&&(c.clearTimeout(i.C),i.C=null)}function Js(i,a){var u=null;if(i.g==a){Un(i),Gr(i),i.g=null;var f=2}else if(Br(i.h,a))u=a.D,Ps(i.h,a),f=1;else return;if(i.G!=0){if(a.o)if(f==1){u=a.m?a.m.length:0,a=Date.now()-a.F;var A=i.B;f=Rn(),Rt(f,new vs(f,u)),Fn(i)}else Qs(i);else if(A=a.s,A==3||A==0&&0<a.X||!(f==1&&_u(i,a)||f==2&&Hr(i)))switch(u&&0<u.length&&(a=i.h,a.i=a.i.concat(u)),A){case 1:ue(i,5);break;case 4:ue(i,10);break;case 3:ue(i,6);break;default:ue(i,2)}}}function Ys(i,a){let u=i.Ta+Math.floor(Math.random()*i.cb);return i.isActive()||(u*=2),u*a}function ue(i,a){if(i.j.info("Error code "+a),a==2){var u=T(i.fb,i),f=i.Xa;const A=!f;f=new le(f||"//www.google.com/images/cleardot.gif"),c.location&&c.location.protocol=="http"||Dn(f,"https"),xn(f),A?cu(f.toString(),u):hu(f.toString(),u)}else Ct(2);i.G=0,i.l&&i.l.sa(a),Zs(i),Gs(i)}n.fb=function(i){i?(this.j.info("Successfully pinged google.com"),Ct(2)):(this.j.info("Failed to ping google.com"),Ct(1))};function Zs(i){if(i.G=0,i.ka=[],i.l){const a=Vs(i.h);(a.length!=0||i.i.length!=0)&&(N(i.ka,a),N(i.ka,i.i),i.h.i.length=0,M(i.i),i.i.length=0),i.l.ra()}}function to(i,a,u){var f=u instanceof le?qt(u):new le(u);if(f.g!="")a&&(f.g=a+"."+f.g),Nn(f,f.s);else{var A=c.location;f=A.protocol,a=a?a+"."+A.hostname:A.hostname,A=+A.port;var S=new le(null);f&&Dn(S,f),a&&(S.g=a),A&&Nn(S,A),u&&(S.l=u),f=S}return u=i.D,a=i.ya,u&&a&&et(f,u,a),et(f,"VER",i.la),Ze(i,f),f}function eo(i,a,u){if(a&&!i.J)throw Error("Can't create secondary domain capable XhrIo object.");return a=i.Ca&&!i.pa?new st(new kn({eb:u})):new st(i.pa),a.Ha(i.J),a}n.isActive=function(){return!!this.l&&this.l.isActive(this)};function no(){}n=no.prototype,n.ua=function(){},n.ta=function(){},n.sa=function(){},n.ra=function(){},n.isActive=function(){return!0},n.Na=function(){};function jn(){}jn.prototype.g=function(i,a){return new Dt(i,a)};function Dt(i,a){Et.call(this),this.g=new Hs(a),this.l=i,this.h=a&&a.messageUrlParams||null,i=a&&a.messageHeaders||null,a&&a.clientProtocolHeaderRequired&&(i?i["X-Client-Protocol"]="webchannel":i={"X-Client-Protocol":"webchannel"}),this.g.o=i,i=a&&a.initMessageHeaders||null,a&&a.messageContentType&&(i?i["X-WebChannel-Content-Type"]=a.messageContentType:i={"X-WebChannel-Content-Type":a.messageContentType}),a&&a.va&&(i?i["X-WebChannel-Client-Profile"]=a.va:i={"X-WebChannel-Client-Profile":a.va}),this.g.S=i,(i=a&&a.Sb)&&!$(i)&&(this.g.m=i),this.v=a&&a.supportsCrossDomainXhr||!1,this.u=a&&a.sendRawJson||!1,(a=a&&a.httpSessionIdParam)&&!$(a)&&(this.g.D=a,i=this.h,i!==null&&a in i&&(i=this.h,a in i&&delete i[a])),this.j=new Ae(this)}D(Dt,Et),Dt.prototype.m=function(){this.g.l=this.j,this.v&&(this.g.J=!0),this.g.connect(this.l,this.h||void 0)},Dt.prototype.close=function(){$r(this.g)},Dt.prototype.o=function(i){var a=this.g;if(typeof i=="string"){var u={};u.__data__=i,i=u}else this.u&&(u={},u.__data__=Nr(i),i=u);a.i.push(new tu(a.Ya++,i)),a.G==3&&Fn(a)},Dt.prototype.N=function(){this.g.l=null,delete this.j,$r(this.g),delete this.g,Dt.aa.N.call(this)};function ro(i){kr.call(this),i.__headers__&&(this.headers=i.__headers__,this.statusCode=i.__status__,delete i.__headers__,delete i.__status__);var a=i.__sm__;if(a){t:{for(const u in a){i=u;break t}i=void 0}(this.i=i)&&(i=this.i,a=a!==null&&i in a?a[i]:void 0),this.data=a}else this.data=i}D(ro,kr);function io(){Or.call(this),this.status=1}D(io,Or);function Ae(i){this.g=i}D(Ae,no),Ae.prototype.ua=function(){Rt(this.g,"a")},Ae.prototype.ta=function(i){Rt(this.g,new ro(i))},Ae.prototype.sa=function(i){Rt(this.g,new io)},Ae.prototype.ra=function(){Rt(this.g,"b")},jn.prototype.createWebChannel=jn.prototype.g,Dt.prototype.send=Dt.prototype.o,Dt.prototype.open=Dt.prototype.m,Dt.prototype.close=Dt.prototype.close,Fa=function(){return new jn},La=function(){return Rn()},Ma=oe,Ei={mb:0,pb:1,qb:2,Jb:3,Ob:4,Lb:5,Mb:6,Kb:7,Ib:8,Nb:9,PROXY:10,NOPROXY:11,Gb:12,Cb:13,Db:14,Bb:15,Eb:16,Fb:17,ib:18,hb:19,jb:20},Cn.NO_ERROR=0,Cn.TIMEOUT=8,Cn.HTTP_ERROR=6,Qn=Cn,Es.COMPLETE="complete",Oa=Es,ms.EventType=ze,ze.OPEN="a",ze.CLOSE="b",ze.ERROR="c",ze.MESSAGE="d",Et.prototype.listen=Et.prototype.K,en=ms,st.prototype.listenOnce=st.prototype.L,st.prototype.getLastError=st.prototype.Ka,st.prototype.getLastErrorCode=st.prototype.Ba,st.prototype.getStatus=st.prototype.Z,st.prototype.getResponseJson=st.prototype.Oa,st.prototype.getResponseText=st.prototype.oa,st.prototype.send=st.prototype.ea,st.prototype.setWithCredentials=st.prototype.Ha,ka=st}).apply(typeof zn<"u"?zn:typeof self<"u"?self:typeof window<"u"?window:{});const xo="@firebase/firestore",ko="4.9.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class At{constructor(t){this.uid=t}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(t){return t.uid===this.uid}}At.UNAUTHENTICATED=new At(null),At.GOOGLE_CREDENTIALS=new At("google-credentials-uid"),At.FIRST_PARTY=new At("first-party-uid"),At.MOCK_USER=new At("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Ue="12.0.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const me=new Ca("@firebase/firestore");function Re(){return me.logLevel}function O(n,...t){if(me.logLevel<=W.DEBUG){const e=t.map(Mi);me.debug(`Firestore (${Ue}): ${n}`,...e)}}function ge(n,...t){if(me.logLevel<=W.ERROR){const e=t.map(Mi);me.error(`Firestore (${Ue}): ${n}`,...e)}}function mr(n,...t){if(me.logLevel<=W.WARN){const e=t.map(Mi);me.warn(`Firestore (${Ue}): ${n}`,...e)}}function Mi(n){if(typeof n=="string")return n;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/return(function(e){return JSON.stringify(e)})(n)}catch{return n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function q(n,t,e){let r="Unexpected state";typeof t=="string"?r=t:e=t,Ua(n,r,e)}function Ua(n,t,e){let r=`FIRESTORE (${Ue}) INTERNAL ASSERTION FAILED: ${t} (ID: ${n.toString(16)})`;if(e!==void 0)try{r+=" CONTEXT: "+JSON.stringify(e)}catch{r+=" CONTEXT: "+e}throw ge(r),new Error(r)}function ot(n,t,e,r){let s="Unexpected state";typeof e=="string"?s=e:r=e,n||Ua(t,s,r)}function tt(n,t){return n}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const R={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class F extends Fe{constructor(t,e){super(t,e),this.code=t,this.message=e,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class de{constructor(){this.promise=new Promise(((t,e)=>{this.resolve=t,this.reject=e}))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ja{constructor(t,e){this.user=e,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${t}`)}}class Ah{getToken(){return Promise.resolve(null)}invalidateToken(){}start(t,e){t.enqueueRetryable((()=>e(At.UNAUTHENTICATED)))}shutdown(){}}class Sh{constructor(t){this.token=t,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(t,e){this.changeListener=e,t.enqueueRetryable((()=>e(this.token.user)))}shutdown(){this.changeListener=null}}class bh{constructor(t){this.t=t,this.currentUser=At.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(t,e){ot(this.o===void 0,42304);let r=this.i;const s=d=>this.i!==r?(r=this.i,e(d)):Promise.resolve();let o=new de;this.o=()=>{this.i++,this.currentUser=this.u(),o.resolve(),o=new de,t.enqueueRetryable((()=>s(this.currentUser)))};const l=()=>{const d=o;t.enqueueRetryable((async()=>{await d.promise,await s(this.currentUser)}))},c=d=>{O("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=d,this.o&&(this.auth.addAuthTokenListener(this.o),l())};this.t.onInit((d=>c(d))),setTimeout((()=>{if(!this.auth){const d=this.t.getImmediate({optional:!0});d?c(d):(O("FirebaseAuthCredentialsProvider","Auth not yet detected"),o.resolve(),o=new de)}}),0),l()}getToken(){const t=this.i,e=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(e).then((r=>this.i!==t?(O("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(ot(typeof r.accessToken=="string",31837,{l:r}),new ja(r.accessToken,this.currentUser)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const t=this.auth&&this.auth.getUid();return ot(t===null||typeof t=="string",2055,{h:t}),new At(t)}}class Rh{constructor(t,e,r){this.P=t,this.T=e,this.I=r,this.type="FirstParty",this.user=At.FIRST_PARTY,this.A=new Map}R(){return this.I?this.I():null}get headers(){this.A.set("X-Goog-AuthUser",this.P);const t=this.R();return t&&this.A.set("Authorization",t),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A}}class Ch{constructor(t,e,r){this.P=t,this.T=e,this.I=r}getToken(){return Promise.resolve(new Rh(this.P,this.T,this.I))}start(t,e){t.enqueueRetryable((()=>e(At.FIRST_PARTY)))}shutdown(){}invalidateToken(){}}class Oo{constructor(t){this.value=t,this.type="AppCheck",this.headers=new Map,t&&t.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class Ph{constructor(t,e){this.V=e,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,uh(t)&&t.settings.appCheckToken&&(this.p=t.settings.appCheckToken)}start(t,e){ot(this.o===void 0,3512);const r=o=>{o.error!=null&&O("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${o.error.message}`);const l=o.token!==this.m;return this.m=o.token,O("FirebaseAppCheckTokenProvider",`Received ${l?"new":"existing"} token.`),l?e(o.token):Promise.resolve()};this.o=o=>{t.enqueueRetryable((()=>r(o)))};const s=o=>{O("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=o,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit((o=>s(o))),setTimeout((()=>{if(!this.appCheck){const o=this.V.getImmediate({optional:!0});o?s(o):O("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}}),0)}getToken(){if(this.p)return Promise.resolve(new Oo(this.p));const t=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(t).then((e=>e?(ot(typeof e.token=="string",44558,{tokenResult:e}),this.m=e.token,new Oo(e.token)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vh(n){const t=typeof self<"u"&&(self.crypto||self.msCrypto),e=new Uint8Array(n);if(t&&typeof t.getRandomValues=="function")t.getRandomValues(e);else for(let r=0;r<n;r++)e[r]=Math.floor(256*Math.random());return e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Li{static newId(){const t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",e=62*Math.floor(4.129032258064516);let r="";for(;r.length<20;){const s=Vh(40);for(let o=0;o<s.length;++o)r.length<20&&s[o]<e&&(r+=t.charAt(s[o]%62))}return r}}function J(n,t){return n<t?-1:n>t?1:0}function Ti(n,t){const e=Math.min(n.length,t.length);for(let r=0;r<e;r++){const s=n.charAt(r),o=t.charAt(r);if(s!==o)return hi(s)===hi(o)?J(s,o):hi(s)?1:-1}return J(n.length,t.length)}const Dh=55296,Nh=57343;function hi(n){const t=n.charCodeAt(0);return t>=Dh&&t<=Nh}function Ne(n,t,e){return n.length===t.length&&n.every(((r,s)=>e(r,t[s])))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Mo="__name__";class Ut{constructor(t,e,r){e===void 0?e=0:e>t.length&&q(637,{offset:e,range:t.length}),r===void 0?r=t.length-e:r>t.length-e&&q(1746,{length:r,range:t.length-e}),this.segments=t,this.offset=e,this.len=r}get length(){return this.len}isEqual(t){return Ut.comparator(this,t)===0}child(t){const e=this.segments.slice(this.offset,this.limit());return t instanceof Ut?t.forEach((r=>{e.push(r)})):e.push(t),this.construct(e)}limit(){return this.offset+this.length}popFirst(t){return t=t===void 0?1:t,this.construct(this.segments,this.offset+t,this.length-t)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(t){return this.segments[this.offset+t]}isEmpty(){return this.length===0}isPrefixOf(t){if(t.length<this.length)return!1;for(let e=0;e<this.length;e++)if(this.get(e)!==t.get(e))return!1;return!0}isImmediateParentOf(t){if(this.length+1!==t.length)return!1;for(let e=0;e<this.length;e++)if(this.get(e)!==t.get(e))return!1;return!0}forEach(t){for(let e=this.offset,r=this.limit();e<r;e++)t(this.segments[e])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(t,e){const r=Math.min(t.length,e.length);for(let s=0;s<r;s++){const o=Ut.compareSegments(t.get(s),e.get(s));if(o!==0)return o}return J(t.length,e.length)}static compareSegments(t,e){const r=Ut.isNumericId(t),s=Ut.isNumericId(e);return r&&!s?-1:!r&&s?1:r&&s?Ut.extractNumericId(t).compare(Ut.extractNumericId(e)):Ti(t,e)}static isNumericId(t){return t.startsWith("__id")&&t.endsWith("__")}static extractNumericId(t){return Oi.fromString(t.substring(4,t.length-2))}}class it extends Ut{construct(t,e,r){return new it(t,e,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...t){const e=[];for(const r of t){if(r.indexOf("//")>=0)throw new F(R.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);e.push(...r.split("/").filter((s=>s.length>0)))}return new it(e)}static emptyPath(){return new it([])}}const xh=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class _t extends Ut{construct(t,e,r){return new _t(t,e,r)}static isValidIdentifier(t){return xh.test(t)}canonicalString(){return this.toArray().map((t=>(t=t.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),_t.isValidIdentifier(t)||(t="`"+t+"`"),t))).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===Mo}static keyField(){return new _t([Mo])}static fromServerFormat(t){const e=[];let r="",s=0;const o=()=>{if(r.length===0)throw new F(R.INVALID_ARGUMENT,`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);e.push(r),r=""};let l=!1;for(;s<t.length;){const c=t[s];if(c==="\\"){if(s+1===t.length)throw new F(R.INVALID_ARGUMENT,"Path has trailing escape character: "+t);const d=t[s+1];if(d!=="\\"&&d!=="."&&d!=="`")throw new F(R.INVALID_ARGUMENT,"Path has invalid escape sequence: "+t);r+=d,s+=2}else c==="`"?(l=!l,s++):c!=="."||l?(r+=c,s++):(o(),s++)}if(o(),l)throw new F(R.INVALID_ARGUMENT,"Unterminated ` in path: "+t);return new _t(e)}static emptyPath(){return new _t([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class z{constructor(t){this.path=t}static fromPath(t){return new z(it.fromString(t))}static fromName(t){return new z(it.fromString(t).popFirst(5))}static empty(){return new z(it.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(t){return this.path.length>=2&&this.path.get(this.path.length-2)===t}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(t){return t!==null&&it.comparator(this.path,t.path)===0}toString(){return this.path.toString()}static comparator(t,e){return it.comparator(t.path,e.path)}static isDocumentKey(t){return t.length%2==0}static fromSegments(t){return new z(new it(t.slice()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ba(n,t,e){if(!e)throw new F(R.INVALID_ARGUMENT,`Function ${n}() cannot be called with an empty ${t}.`)}function kh(n,t,e,r){if(t===!0&&r===!0)throw new F(R.INVALID_ARGUMENT,`${n} and ${e} cannot be used together.`)}function Lo(n){if(!z.isDocumentKey(n))throw new F(R.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${n} has ${n.length}.`)}function Fo(n){if(z.isDocumentKey(n))throw new F(R.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${n} has ${n.length}.`)}function za(n){return typeof n=="object"&&n!==null&&(Object.getPrototypeOf(n)===Object.prototype||Object.getPrototypeOf(n)===null)}function Fi(n){if(n===void 0)return"undefined";if(n===null)return"null";if(typeof n=="string")return n.length>20&&(n=`${n.substring(0,20)}...`),JSON.stringify(n);if(typeof n=="number"||typeof n=="boolean")return""+n;if(typeof n=="object"){if(n instanceof Array)return"an array";{const t=(function(r){return r.constructor?r.constructor.name:null})(n);return t?`a custom ${t} object`:"an object"}}return typeof n=="function"?"a function":q(12329,{type:typeof n})}function qa(n,t){if("_delegate"in n&&(n=n._delegate),!(n instanceof t)){if(t.name===n.constructor.name)throw new F(R.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const e=Fi(n);throw new F(R.INVALID_ARGUMENT,`Expected type '${t.name}', but it was: ${e}`)}}return n}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ut(n,t){const e={typeString:n};return t&&(e.value=t),e}function yn(n,t){if(!za(n))throw new F(R.INVALID_ARGUMENT,"JSON must be an object");let e;for(const r in t)if(t[r]){const s=t[r].typeString,o="value"in t[r]?{value:t[r].value}:void 0;if(!(r in n)){e=`JSON missing required field: '${r}'`;break}const l=n[r];if(s&&typeof l!==s){e=`JSON field '${r}' must be a ${s}.`;break}if(o!==void 0&&l!==o.value){e=`Expected '${r}' field to equal '${o.value}'`;break}}if(e)throw new F(R.INVALID_ARGUMENT,e);return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Uo=-62135596800,jo=1e6;class rt{static now(){return rt.fromMillis(Date.now())}static fromDate(t){return rt.fromMillis(t.getTime())}static fromMillis(t){const e=Math.floor(t/1e3),r=Math.floor((t-1e3*e)*jo);return new rt(e,r)}constructor(t,e){if(this.seconds=t,this.nanoseconds=e,e<0)throw new F(R.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(e>=1e9)throw new F(R.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(t<Uo)throw new F(R.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t);if(t>=253402300800)throw new F(R.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/jo}_compareTo(t){return this.seconds===t.seconds?J(this.nanoseconds,t.nanoseconds):J(this.seconds,t.seconds)}isEqual(t){return t.seconds===this.seconds&&t.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:rt._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(t){if(yn(t,rt._jsonSchema))return new rt(t.seconds,t.nanoseconds)}valueOf(){const t=this.seconds-Uo;return String(t).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}rt._jsonSchemaVersion="firestore/timestamp/1.0",rt._jsonSchema={type:ut("string",rt._jsonSchemaVersion),seconds:ut("number"),nanoseconds:ut("number")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nt{static fromTimestamp(t){return new nt(t)}static min(){return new nt(new rt(0,0))}static max(){return new nt(new rt(253402300799,999999999))}constructor(t){this.timestamp=t}compareTo(t){return this.timestamp._compareTo(t.timestamp)}isEqual(t){return this.timestamp.isEqual(t.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dn=-1;function Oh(n,t){const e=n.toTimestamp().seconds,r=n.toTimestamp().nanoseconds+1,s=nt.fromTimestamp(r===1e9?new rt(e+1,0):new rt(e,r));return new ee(s,z.empty(),t)}function Mh(n){return new ee(n.readTime,n.key,dn)}class ee{constructor(t,e,r){this.readTime=t,this.documentKey=e,this.largestBatchId=r}static min(){return new ee(nt.min(),z.empty(),dn)}static max(){return new ee(nt.max(),z.empty(),dn)}}function Lh(n,t){let e=n.readTime.compareTo(t.readTime);return e!==0?e:(e=z.comparator(n.documentKey,t.documentKey),e!==0?e:J(n.largestBatchId,t.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fh="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Uh{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(t){this.onCommittedListeners.push(t)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach((t=>t()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ui(n){if(n.code!==R.FAILED_PRECONDITION||n.message!==Fh)throw n;O("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class b{constructor(t){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,t((e=>{this.isDone=!0,this.result=e,this.nextCallback&&this.nextCallback(e)}),(e=>{this.isDone=!0,this.error=e,this.catchCallback&&this.catchCallback(e)}))}catch(t){return this.next(void 0,t)}next(t,e){return this.callbackAttached&&q(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(e,this.error):this.wrapSuccess(t,this.result):new b(((r,s)=>{this.nextCallback=o=>{this.wrapSuccess(t,o).next(r,s)},this.catchCallback=o=>{this.wrapFailure(e,o).next(r,s)}}))}toPromise(){return new Promise(((t,e)=>{this.next(t,e)}))}wrapUserFunction(t){try{const e=t();return e instanceof b?e:b.resolve(e)}catch(e){return b.reject(e)}}wrapSuccess(t,e){return t?this.wrapUserFunction((()=>t(e))):b.resolve(e)}wrapFailure(t,e){return t?this.wrapUserFunction((()=>t(e))):b.reject(e)}static resolve(t){return new b(((e,r)=>{e(t)}))}static reject(t){return new b(((e,r)=>{r(t)}))}static waitFor(t){return new b(((e,r)=>{let s=0,o=0,l=!1;t.forEach((c=>{++s,c.next((()=>{++o,l&&o===s&&e()}),(d=>r(d)))})),l=!0,o===s&&e()}))}static or(t){let e=b.resolve(!1);for(const r of t)e=e.next((s=>s?b.resolve(s):r()));return e}static forEach(t,e){const r=[];return t.forEach(((s,o)=>{r.push(e.call(this,s,o))})),this.waitFor(r)}static mapArray(t,e){return new b(((r,s)=>{const o=t.length,l=new Array(o);let c=0;for(let d=0;d<o;d++){const g=d;e(t[g]).next((E=>{l[g]=E,++c,c===o&&r(l)}),(E=>s(E)))}}))}static doWhile(t,e){return new b(((r,s)=>{const o=()=>{t()===!0?e().next((()=>{o()}),s):r()};o()}))}}function jh(n){const t=n.match(/Android ([\d.]+)/i),e=t?t[1].split(".").slice(0,2).join("."):"-1";return Number(e)}function vn(n){return n.name==="IndexedDbTransactionError"}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ji{constructor(t,e){this.previousValue=t,e&&(e.sequenceNumberHandler=r=>this.ae(r),this.ue=r=>e.writeSequenceNumber(r))}ae(t){return this.previousValue=Math.max(t,this.previousValue),this.previousValue}next(){const t=++this.previousValue;return this.ue&&this.ue(t),t}}ji.ce=-1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bi=-1;function zi(n){return n==null}function ir(n){return n===0&&1/n==-1/0}function Bh(n){return typeof n=="number"&&Number.isInteger(n)&&!ir(n)&&n<=Number.MAX_SAFE_INTEGER&&n>=Number.MIN_SAFE_INTEGER}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $a="";function zh(n){let t="";for(let e=0;e<n.length;e++)t.length>0&&(t=Bo(t)),t=qh(n.get(e),t);return Bo(t)}function qh(n,t){let e=t;const r=n.length;for(let s=0;s<r;s++){const o=n.charAt(s);switch(o){case"\0":e+="";break;case $a:e+="";break;default:e+=o}}return e}function Bo(n){return n+$a+""}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zo(n){let t=0;for(const e in n)Object.prototype.hasOwnProperty.call(n,e)&&t++;return t}function je(n,t){for(const e in n)Object.prototype.hasOwnProperty.call(n,e)&&t(e,n[e])}function Ha(n){for(const t in n)if(Object.prototype.hasOwnProperty.call(n,t))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vt{constructor(t,e){this.comparator=t,this.root=e||mt.EMPTY}insert(t,e){return new Vt(this.comparator,this.root.insert(t,e,this.comparator).copy(null,null,mt.BLACK,null,null))}remove(t){return new Vt(this.comparator,this.root.remove(t,this.comparator).copy(null,null,mt.BLACK,null,null))}get(t){let e=this.root;for(;!e.isEmpty();){const r=this.comparator(t,e.key);if(r===0)return e.value;r<0?e=e.left:r>0&&(e=e.right)}return null}indexOf(t){let e=0,r=this.root;for(;!r.isEmpty();){const s=this.comparator(t,r.key);if(s===0)return e+r.left.size;s<0?r=r.left:(e+=r.left.size+1,r=r.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(t){return this.root.inorderTraversal(t)}forEach(t){this.inorderTraversal(((e,r)=>(t(e,r),!1)))}toString(){const t=[];return this.inorderTraversal(((e,r)=>(t.push(`${e}:${r}`),!1))),`{${t.join(", ")}}`}reverseTraversal(t){return this.root.reverseTraversal(t)}getIterator(){return new qn(this.root,null,this.comparator,!1)}getIteratorFrom(t){return new qn(this.root,t,this.comparator,!1)}getReverseIterator(){return new qn(this.root,null,this.comparator,!0)}getReverseIteratorFrom(t){return new qn(this.root,t,this.comparator,!0)}}class qn{constructor(t,e,r,s){this.isReverse=s,this.nodeStack=[];let o=1;for(;!t.isEmpty();)if(o=e?r(t.key,e):1,e&&s&&(o*=-1),o<0)t=this.isReverse?t.left:t.right;else{if(o===0){this.nodeStack.push(t);break}this.nodeStack.push(t),t=this.isReverse?t.right:t.left}}getNext(){let t=this.nodeStack.pop();const e={key:t.key,value:t.value};if(this.isReverse)for(t=t.left;!t.isEmpty();)this.nodeStack.push(t),t=t.right;else for(t=t.right;!t.isEmpty();)this.nodeStack.push(t),t=t.left;return e}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const t=this.nodeStack[this.nodeStack.length-1];return{key:t.key,value:t.value}}}class mt{constructor(t,e,r,s,o){this.key=t,this.value=e,this.color=r??mt.RED,this.left=s??mt.EMPTY,this.right=o??mt.EMPTY,this.size=this.left.size+1+this.right.size}copy(t,e,r,s,o){return new mt(t??this.key,e??this.value,r??this.color,s??this.left,o??this.right)}isEmpty(){return!1}inorderTraversal(t){return this.left.inorderTraversal(t)||t(this.key,this.value)||this.right.inorderTraversal(t)}reverseTraversal(t){return this.right.reverseTraversal(t)||t(this.key,this.value)||this.left.reverseTraversal(t)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(t,e,r){let s=this;const o=r(t,s.key);return s=o<0?s.copy(null,null,null,s.left.insert(t,e,r),null):o===0?s.copy(null,e,null,null,null):s.copy(null,null,null,null,s.right.insert(t,e,r)),s.fixUp()}removeMin(){if(this.left.isEmpty())return mt.EMPTY;let t=this;return t.left.isRed()||t.left.left.isRed()||(t=t.moveRedLeft()),t=t.copy(null,null,null,t.left.removeMin(),null),t.fixUp()}remove(t,e){let r,s=this;if(e(t,s.key)<0)s.left.isEmpty()||s.left.isRed()||s.left.left.isRed()||(s=s.moveRedLeft()),s=s.copy(null,null,null,s.left.remove(t,e),null);else{if(s.left.isRed()&&(s=s.rotateRight()),s.right.isEmpty()||s.right.isRed()||s.right.left.isRed()||(s=s.moveRedRight()),e(t,s.key)===0){if(s.right.isEmpty())return mt.EMPTY;r=s.right.min(),s=s.copy(r.key,r.value,null,null,s.right.removeMin())}s=s.copy(null,null,null,null,s.right.remove(t,e))}return s.fixUp()}isRed(){return this.color}fixUp(){let t=this;return t.right.isRed()&&!t.left.isRed()&&(t=t.rotateLeft()),t.left.isRed()&&t.left.left.isRed()&&(t=t.rotateRight()),t.left.isRed()&&t.right.isRed()&&(t=t.colorFlip()),t}moveRedLeft(){let t=this.colorFlip();return t.right.left.isRed()&&(t=t.copy(null,null,null,null,t.right.rotateRight()),t=t.rotateLeft(),t=t.colorFlip()),t}moveRedRight(){let t=this.colorFlip();return t.left.left.isRed()&&(t=t.rotateRight(),t=t.colorFlip()),t}rotateLeft(){const t=this.copy(null,null,mt.RED,null,this.right.left);return this.right.copy(null,null,this.color,t,null)}rotateRight(){const t=this.copy(null,null,mt.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,t)}colorFlip(){const t=this.left.copy(null,null,!this.left.color,null,null),e=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,t,e)}checkMaxDepth(){const t=this.check();return Math.pow(2,t)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw q(43730,{key:this.key,value:this.value});if(this.right.isRed())throw q(14113,{key:this.key,value:this.value});const t=this.left.check();if(t!==this.right.check())throw q(27949);return t+(this.isRed()?0:1)}}mt.EMPTY=null,mt.RED=!0,mt.BLACK=!1;mt.EMPTY=new class{constructor(){this.size=0}get key(){throw q(57766)}get value(){throw q(16141)}get color(){throw q(16727)}get left(){throw q(29726)}get right(){throw q(36894)}copy(t,e,r,s,o){return this}insert(t,e,r){return new mt(t,e)}remove(t,e){return this}isEmpty(){return!0}inorderTraversal(t){return!1}reverseTraversal(t){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yt{constructor(t){this.comparator=t,this.data=new Vt(this.comparator)}has(t){return this.data.get(t)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(t){return this.data.indexOf(t)}forEach(t){this.data.inorderTraversal(((e,r)=>(t(e),!1)))}forEachInRange(t,e){const r=this.data.getIteratorFrom(t[0]);for(;r.hasNext();){const s=r.getNext();if(this.comparator(s.key,t[1])>=0)return;e(s.key)}}forEachWhile(t,e){let r;for(r=e!==void 0?this.data.getIteratorFrom(e):this.data.getIterator();r.hasNext();)if(!t(r.getNext().key))return}firstAfterOrEqual(t){const e=this.data.getIteratorFrom(t);return e.hasNext()?e.getNext().key:null}getIterator(){return new qo(this.data.getIterator())}getIteratorFrom(t){return new qo(this.data.getIteratorFrom(t))}add(t){return this.copy(this.data.remove(t).insert(t,!0))}delete(t){return this.has(t)?this.copy(this.data.remove(t)):this}isEmpty(){return this.data.isEmpty()}unionWith(t){let e=this;return e.size<t.size&&(e=t,t=this),t.forEach((r=>{e=e.add(r)})),e}isEqual(t){if(!(t instanceof yt)||this.size!==t.size)return!1;const e=this.data.getIterator(),r=t.data.getIterator();for(;e.hasNext();){const s=e.getNext().key,o=r.getNext().key;if(this.comparator(s,o)!==0)return!1}return!0}toArray(){const t=[];return this.forEach((e=>{t.push(e)})),t}toString(){const t=[];return this.forEach((e=>t.push(e))),"SortedSet("+t.toString()+")"}copy(t){const e=new yt(this.comparator);return e.data=t,e}}class qo{constructor(t){this.iter=t}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lt{constructor(t){this.fields=t,t.sort(_t.comparator)}static empty(){return new Lt([])}unionWith(t){let e=new yt(_t.comparator);for(const r of this.fields)e=e.add(r);for(const r of t)e=e.add(r);return new Lt(e.toArray())}covers(t){for(const e of this.fields)if(e.isPrefixOf(t))return!0;return!1}isEqual(t){return Ne(this.fields,t.fields,((e,r)=>e.isEqual(r)))}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $h extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jt{constructor(t){this.binaryString=t}static fromBase64String(t){const e=(function(s){try{return atob(s)}catch(o){throw typeof DOMException<"u"&&o instanceof DOMException?new $h("Invalid base64 string: "+o):o}})(t);return new jt(e)}static fromUint8Array(t){const e=(function(s){let o="";for(let l=0;l<s.length;++l)o+=String.fromCharCode(s[l]);return o})(t);return new jt(e)}[Symbol.iterator](){let t=0;return{next:()=>t<this.binaryString.length?{value:this.binaryString.charCodeAt(t++),done:!1}:{value:void 0,done:!0}}}toBase64(){return(function(e){return btoa(e)})(this.binaryString)}toUint8Array(){return(function(e){const r=new Uint8Array(e.length);for(let s=0;s<e.length;s++)r[s]=e.charCodeAt(s);return r})(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(t){return J(this.binaryString,t.binaryString)}isEqual(t){return this.binaryString===t.binaryString}}jt.EMPTY_BYTE_STRING=new jt("");const Hh=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function _e(n){if(ot(!!n,39018),typeof n=="string"){let t=0;const e=Hh.exec(n);if(ot(!!e,46558,{timestamp:n}),e[1]){let s=e[1];s=(s+"000000000").substr(0,9),t=Number(s)}const r=new Date(n);return{seconds:Math.floor(r.getTime()/1e3),nanos:t}}return{seconds:gt(n.seconds),nanos:gt(n.nanos)}}function gt(n){return typeof n=="number"?n:typeof n=="string"?Number(n):0}function xe(n){return typeof n=="string"?jt.fromBase64String(n):jt.fromUint8Array(n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ga="server_timestamp",Ka="__type__",Wa="__previous_value__",Qa="__local_write_time__";function qi(n){return(n?.mapValue?.fields||{})[Ka]?.stringValue===Ga}function $i(n){const t=n.mapValue.fields[Wa];return qi(t)?$i(t):t}function sr(n){const t=_e(n.mapValue.fields[Qa].timestampValue);return new rt(t.seconds,t.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gh{constructor(t,e,r,s,o,l,c,d,g,E){this.databaseId=t,this.appId=e,this.persistenceKey=r,this.host=s,this.ssl=o,this.forceLongPolling=l,this.autoDetectLongPolling=c,this.longPollingOptions=d,this.useFetchStreams=g,this.isUsingEmulator=E}}const or="(default)";class ar{constructor(t,e){this.projectId=t,this.database=e||or}static empty(){return new ar("","")}get isDefaultDatabase(){return this.database===or}isEqual(t){return t instanceof ar&&t.projectId===this.projectId&&t.database===this.database}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xa="__type__",Kh="__max__",$n={mapValue:{}},Ja="__vector__",Ii="value";function ye(n){return"nullValue"in n?0:"booleanValue"in n?1:"integerValue"in n||"doubleValue"in n?2:"timestampValue"in n?3:"stringValue"in n?5:"bytesValue"in n?6:"referenceValue"in n?7:"geoPointValue"in n?8:"arrayValue"in n?9:"mapValue"in n?qi(n)?4:Qh(n)?9007199254740991:Wh(n)?10:11:q(28295,{value:n})}function Bt(n,t){if(n===t)return!0;const e=ye(n);if(e!==ye(t))return!1;switch(e){case 0:case 9007199254740991:return!0;case 1:return n.booleanValue===t.booleanValue;case 4:return sr(n).isEqual(sr(t));case 3:return(function(s,o){if(typeof s.timestampValue=="string"&&typeof o.timestampValue=="string"&&s.timestampValue.length===o.timestampValue.length)return s.timestampValue===o.timestampValue;const l=_e(s.timestampValue),c=_e(o.timestampValue);return l.seconds===c.seconds&&l.nanos===c.nanos})(n,t);case 5:return n.stringValue===t.stringValue;case 6:return(function(s,o){return xe(s.bytesValue).isEqual(xe(o.bytesValue))})(n,t);case 7:return n.referenceValue===t.referenceValue;case 8:return(function(s,o){return gt(s.geoPointValue.latitude)===gt(o.geoPointValue.latitude)&&gt(s.geoPointValue.longitude)===gt(o.geoPointValue.longitude)})(n,t);case 2:return(function(s,o){if("integerValue"in s&&"integerValue"in o)return gt(s.integerValue)===gt(o.integerValue);if("doubleValue"in s&&"doubleValue"in o){const l=gt(s.doubleValue),c=gt(o.doubleValue);return l===c?ir(l)===ir(c):isNaN(l)&&isNaN(c)}return!1})(n,t);case 9:return Ne(n.arrayValue.values||[],t.arrayValue.values||[],Bt);case 10:case 11:return(function(s,o){const l=s.mapValue.fields||{},c=o.mapValue.fields||{};if(zo(l)!==zo(c))return!1;for(const d in l)if(l.hasOwnProperty(d)&&(c[d]===void 0||!Bt(l[d],c[d])))return!1;return!0})(n,t);default:return q(52216,{left:n})}}function pn(n,t){return(n.values||[]).find((e=>Bt(e,t)))!==void 0}function ke(n,t){if(n===t)return 0;const e=ye(n),r=ye(t);if(e!==r)return J(e,r);switch(e){case 0:case 9007199254740991:return 0;case 1:return J(n.booleanValue,t.booleanValue);case 2:return(function(o,l){const c=gt(o.integerValue||o.doubleValue),d=gt(l.integerValue||l.doubleValue);return c<d?-1:c>d?1:c===d?0:isNaN(c)?isNaN(d)?0:-1:1})(n,t);case 3:return $o(n.timestampValue,t.timestampValue);case 4:return $o(sr(n),sr(t));case 5:return Ti(n.stringValue,t.stringValue);case 6:return(function(o,l){const c=xe(o),d=xe(l);return c.compareTo(d)})(n.bytesValue,t.bytesValue);case 7:return(function(o,l){const c=o.split("/"),d=l.split("/");for(let g=0;g<c.length&&g<d.length;g++){const E=J(c[g],d[g]);if(E!==0)return E}return J(c.length,d.length)})(n.referenceValue,t.referenceValue);case 8:return(function(o,l){const c=J(gt(o.latitude),gt(l.latitude));return c!==0?c:J(gt(o.longitude),gt(l.longitude))})(n.geoPointValue,t.geoPointValue);case 9:return Ho(n.arrayValue,t.arrayValue);case 10:return(function(o,l){const c=o.fields||{},d=l.fields||{},g=c[Ii]?.arrayValue,E=d[Ii]?.arrayValue,w=J(g?.values?.length||0,E?.values?.length||0);return w!==0?w:Ho(g,E)})(n.mapValue,t.mapValue);case 11:return(function(o,l){if(o===$n.mapValue&&l===$n.mapValue)return 0;if(o===$n.mapValue)return 1;if(l===$n.mapValue)return-1;const c=o.fields||{},d=Object.keys(c),g=l.fields||{},E=Object.keys(g);d.sort(),E.sort();for(let w=0;w<d.length&&w<E.length;++w){const T=Ti(d[w],E[w]);if(T!==0)return T;const C=ke(c[d[w]],g[E[w]]);if(C!==0)return C}return J(d.length,E.length)})(n.mapValue,t.mapValue);default:throw q(23264,{he:e})}}function $o(n,t){if(typeof n=="string"&&typeof t=="string"&&n.length===t.length)return J(n,t);const e=_e(n),r=_e(t),s=J(e.seconds,r.seconds);return s!==0?s:J(e.nanos,r.nanos)}function Ho(n,t){const e=n.values||[],r=t.values||[];for(let s=0;s<e.length&&s<r.length;++s){const o=ke(e[s],r[s]);if(o)return o}return J(e.length,r.length)}function Oe(n){return wi(n)}function wi(n){return"nullValue"in n?"null":"booleanValue"in n?""+n.booleanValue:"integerValue"in n?""+n.integerValue:"doubleValue"in n?""+n.doubleValue:"timestampValue"in n?(function(e){const r=_e(e);return`time(${r.seconds},${r.nanos})`})(n.timestampValue):"stringValue"in n?n.stringValue:"bytesValue"in n?(function(e){return xe(e).toBase64()})(n.bytesValue):"referenceValue"in n?(function(e){return z.fromName(e).toString()})(n.referenceValue):"geoPointValue"in n?(function(e){return`geo(${e.latitude},${e.longitude})`})(n.geoPointValue):"arrayValue"in n?(function(e){let r="[",s=!0;for(const o of e.values||[])s?s=!1:r+=",",r+=wi(o);return r+"]"})(n.arrayValue):"mapValue"in n?(function(e){const r=Object.keys(e.fields||{}).sort();let s="{",o=!0;for(const l of r)o?o=!1:s+=",",s+=`${l}:${wi(e.fields[l])}`;return s+"}"})(n.mapValue):q(61005,{value:n})}function Xn(n){switch(ye(n)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const t=$i(n);return t?16+Xn(t):16;case 5:return 2*n.stringValue.length;case 6:return xe(n.bytesValue).approximateByteSize();case 7:return n.referenceValue.length;case 9:return(function(r){return(r.values||[]).reduce(((s,o)=>s+Xn(o)),0)})(n.arrayValue);case 10:case 11:return(function(r){let s=0;return je(r.fields,((o,l)=>{s+=o.length+Xn(l)})),s})(n.mapValue);default:throw q(13486,{value:n})}}function Ai(n){return!!n&&"integerValue"in n}function Hi(n){return!!n&&"arrayValue"in n}function Jn(n){return!!n&&"mapValue"in n}function Wh(n){return(n?.mapValue?.fields||{})[Xa]?.stringValue===Ja}function rn(n){if(n.geoPointValue)return{geoPointValue:{...n.geoPointValue}};if(n.timestampValue&&typeof n.timestampValue=="object")return{timestampValue:{...n.timestampValue}};if(n.mapValue){const t={mapValue:{fields:{}}};return je(n.mapValue.fields,((e,r)=>t.mapValue.fields[e]=rn(r))),t}if(n.arrayValue){const t={arrayValue:{values:[]}};for(let e=0;e<(n.arrayValue.values||[]).length;++e)t.arrayValue.values[e]=rn(n.arrayValue.values[e]);return t}return{...n}}function Qh(n){return(((n.mapValue||{}).fields||{}).__type__||{}).stringValue===Kh}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ot{constructor(t){this.value=t}static empty(){return new Ot({mapValue:{}})}field(t){if(t.isEmpty())return this.value;{let e=this.value;for(let r=0;r<t.length-1;++r)if(e=(e.mapValue.fields||{})[t.get(r)],!Jn(e))return null;return e=(e.mapValue.fields||{})[t.lastSegment()],e||null}}set(t,e){this.getFieldsMap(t.popLast())[t.lastSegment()]=rn(e)}setAll(t){let e=_t.emptyPath(),r={},s=[];t.forEach(((l,c)=>{if(!e.isImmediateParentOf(c)){const d=this.getFieldsMap(e);this.applyChanges(d,r,s),r={},s=[],e=c.popLast()}l?r[c.lastSegment()]=rn(l):s.push(c.lastSegment())}));const o=this.getFieldsMap(e);this.applyChanges(o,r,s)}delete(t){const e=this.field(t.popLast());Jn(e)&&e.mapValue.fields&&delete e.mapValue.fields[t.lastSegment()]}isEqual(t){return Bt(this.value,t.value)}getFieldsMap(t){let e=this.value;e.mapValue.fields||(e.mapValue={fields:{}});for(let r=0;r<t.length;++r){let s=e.mapValue.fields[t.get(r)];Jn(s)&&s.mapValue.fields||(s={mapValue:{fields:{}}},e.mapValue.fields[t.get(r)]=s),e=s}return e.mapValue.fields}applyChanges(t,e,r){je(e,((s,o)=>t[s]=o));for(const s of r)delete t[s]}clone(){return new Ot(rn(this.value))}}function Ya(n){const t=[];return je(n.fields,((e,r)=>{const s=new _t([e]);if(Jn(r)){const o=Ya(r.mapValue).fields;if(o.length===0)t.push(s);else for(const l of o)t.push(s.child(l))}else t.push(s)})),new Lt(t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kt{constructor(t,e,r,s,o,l,c){this.key=t,this.documentType=e,this.version=r,this.readTime=s,this.createTime=o,this.data=l,this.documentState=c}static newInvalidDocument(t){return new kt(t,0,nt.min(),nt.min(),nt.min(),Ot.empty(),0)}static newFoundDocument(t,e,r,s){return new kt(t,1,e,nt.min(),r,s,0)}static newNoDocument(t,e){return new kt(t,2,e,nt.min(),nt.min(),Ot.empty(),0)}static newUnknownDocument(t,e){return new kt(t,3,e,nt.min(),nt.min(),Ot.empty(),2)}convertToFoundDocument(t,e){return!this.createTime.isEqual(nt.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=t),this.version=t,this.documentType=1,this.data=e,this.documentState=0,this}convertToNoDocument(t){return this.version=t,this.documentType=2,this.data=Ot.empty(),this.documentState=0,this}convertToUnknownDocument(t){return this.version=t,this.documentType=3,this.data=Ot.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=nt.min(),this}setReadTime(t){return this.readTime=t,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(t){return t instanceof kt&&this.key.isEqual(t.key)&&this.version.isEqual(t.version)&&this.documentType===t.documentType&&this.documentState===t.documentState&&this.data.isEqual(t.data)}mutableCopy(){return new kt(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lr{constructor(t,e){this.position=t,this.inclusive=e}}function Go(n,t,e){let r=0;for(let s=0;s<n.position.length;s++){const o=t[s],l=n.position[s];if(o.field.isKeyField()?r=z.comparator(z.fromName(l.referenceValue),e.key):r=ke(l,e.data.field(o.field)),o.dir==="desc"&&(r*=-1),r!==0)break}return r}function Ko(n,t){if(n===null)return t===null;if(t===null||n.inclusive!==t.inclusive||n.position.length!==t.position.length)return!1;for(let e=0;e<n.position.length;e++)if(!Bt(n.position[e],t.position[e]))return!1;return!0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ur{constructor(t,e="asc"){this.field=t,this.dir=e}}function Xh(n,t){return n.dir===t.dir&&n.field.isEqual(t.field)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Za{}class ft extends Za{constructor(t,e,r){super(),this.field=t,this.op=e,this.value=r}static create(t,e,r){return t.isKeyField()?e==="in"||e==="not-in"?this.createKeyFieldInFilter(t,e,r):new Yh(t,e,r):e==="array-contains"?new ef(t,r):e==="in"?new nf(t,r):e==="not-in"?new rf(t,r):e==="array-contains-any"?new sf(t,r):new ft(t,e,r)}static createKeyFieldInFilter(t,e,r){return e==="in"?new Zh(t,r):new tf(t,r)}matches(t){const e=t.data.field(this.field);return this.op==="!="?e!==null&&e.nullValue===void 0&&this.matchesComparison(ke(e,this.value)):e!==null&&ye(this.value)===ye(e)&&this.matchesComparison(ke(e,this.value))}matchesComparison(t){switch(this.op){case"<":return t<0;case"<=":return t<=0;case"==":return t===0;case"!=":return t!==0;case">":return t>0;case">=":return t>=0;default:return q(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class ne extends Za{constructor(t,e){super(),this.filters=t,this.op=e,this.Pe=null}static create(t,e){return new ne(t,e)}matches(t){return tl(this)?this.filters.find((e=>!e.matches(t)))===void 0:this.filters.find((e=>e.matches(t)))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce(((t,e)=>t.concat(e.getFlattenedFilters())),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function tl(n){return n.op==="and"}function el(n){return Jh(n)&&tl(n)}function Jh(n){for(const t of n.filters)if(t instanceof ne)return!1;return!0}function Si(n){if(n instanceof ft)return n.field.canonicalString()+n.op.toString()+Oe(n.value);if(el(n))return n.filters.map((t=>Si(t))).join(",");{const t=n.filters.map((e=>Si(e))).join(",");return`${n.op}(${t})`}}function nl(n,t){return n instanceof ft?(function(r,s){return s instanceof ft&&r.op===s.op&&r.field.isEqual(s.field)&&Bt(r.value,s.value)})(n,t):n instanceof ne?(function(r,s){return s instanceof ne&&r.op===s.op&&r.filters.length===s.filters.length?r.filters.reduce(((o,l,c)=>o&&nl(l,s.filters[c])),!0):!1})(n,t):void q(19439)}function rl(n){return n instanceof ft?(function(e){return`${e.field.canonicalString()} ${e.op} ${Oe(e.value)}`})(n):n instanceof ne?(function(e){return e.op.toString()+" {"+e.getFilters().map(rl).join(" ,")+"}"})(n):"Filter"}class Yh extends ft{constructor(t,e,r){super(t,e,r),this.key=z.fromName(r.referenceValue)}matches(t){const e=z.comparator(t.key,this.key);return this.matchesComparison(e)}}class Zh extends ft{constructor(t,e){super(t,"in",e),this.keys=il("in",e)}matches(t){return this.keys.some((e=>e.isEqual(t.key)))}}class tf extends ft{constructor(t,e){super(t,"not-in",e),this.keys=il("not-in",e)}matches(t){return!this.keys.some((e=>e.isEqual(t.key)))}}function il(n,t){return(t.arrayValue?.values||[]).map((e=>z.fromName(e.referenceValue)))}class ef extends ft{constructor(t,e){super(t,"array-contains",e)}matches(t){const e=t.data.field(this.field);return Hi(e)&&pn(e.arrayValue,this.value)}}class nf extends ft{constructor(t,e){super(t,"in",e)}matches(t){const e=t.data.field(this.field);return e!==null&&pn(this.value.arrayValue,e)}}class rf extends ft{constructor(t,e){super(t,"not-in",e)}matches(t){if(pn(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const e=t.data.field(this.field);return e!==null&&e.nullValue===void 0&&!pn(this.value.arrayValue,e)}}class sf extends ft{constructor(t,e){super(t,"array-contains-any",e)}matches(t){const e=t.data.field(this.field);return!(!Hi(e)||!e.arrayValue.values)&&e.arrayValue.values.some((r=>pn(this.value.arrayValue,r)))}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class of{constructor(t,e=null,r=[],s=[],o=null,l=null,c=null){this.path=t,this.collectionGroup=e,this.orderBy=r,this.filters=s,this.limit=o,this.startAt=l,this.endAt=c,this.Te=null}}function Wo(n,t=null,e=[],r=[],s=null,o=null,l=null){return new of(n,t,e,r,s,o,l)}function Gi(n){const t=tt(n);if(t.Te===null){let e=t.path.canonicalString();t.collectionGroup!==null&&(e+="|cg:"+t.collectionGroup),e+="|f:",e+=t.filters.map((r=>Si(r))).join(","),e+="|ob:",e+=t.orderBy.map((r=>(function(o){return o.field.canonicalString()+o.dir})(r))).join(","),zi(t.limit)||(e+="|l:",e+=t.limit),t.startAt&&(e+="|lb:",e+=t.startAt.inclusive?"b:":"a:",e+=t.startAt.position.map((r=>Oe(r))).join(",")),t.endAt&&(e+="|ub:",e+=t.endAt.inclusive?"a:":"b:",e+=t.endAt.position.map((r=>Oe(r))).join(",")),t.Te=e}return t.Te}function Ki(n,t){if(n.limit!==t.limit||n.orderBy.length!==t.orderBy.length)return!1;for(let e=0;e<n.orderBy.length;e++)if(!Xh(n.orderBy[e],t.orderBy[e]))return!1;if(n.filters.length!==t.filters.length)return!1;for(let e=0;e<n.filters.length;e++)if(!nl(n.filters[e],t.filters[e]))return!1;return n.collectionGroup===t.collectionGroup&&!!n.path.isEqual(t.path)&&!!Ko(n.startAt,t.startAt)&&Ko(n.endAt,t.endAt)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gr{constructor(t,e=null,r=[],s=[],o=null,l="F",c=null,d=null){this.path=t,this.collectionGroup=e,this.explicitOrderBy=r,this.filters=s,this.limit=o,this.limitType=l,this.startAt=c,this.endAt=d,this.Ie=null,this.Ee=null,this.de=null,this.startAt,this.endAt}}function af(n,t,e,r,s,o,l,c){return new gr(n,t,e,r,s,o,l,c)}function lf(n){return new gr(n)}function Qo(n){return n.filters.length===0&&n.limit===null&&n.startAt==null&&n.endAt==null&&(n.explicitOrderBy.length===0||n.explicitOrderBy.length===1&&n.explicitOrderBy[0].field.isKeyField())}function uf(n){return n.collectionGroup!==null}function sn(n){const t=tt(n);if(t.Ie===null){t.Ie=[];const e=new Set;for(const o of t.explicitOrderBy)t.Ie.push(o),e.add(o.field.canonicalString());const r=t.explicitOrderBy.length>0?t.explicitOrderBy[t.explicitOrderBy.length-1].dir:"asc";(function(l){let c=new yt(_t.comparator);return l.filters.forEach((d=>{d.getFlattenedFilters().forEach((g=>{g.isInequality()&&(c=c.add(g.field))}))})),c})(t).forEach((o=>{e.has(o.canonicalString())||o.isKeyField()||t.Ie.push(new ur(o,r))})),e.has(_t.keyField().canonicalString())||t.Ie.push(new ur(_t.keyField(),r))}return t.Ie}function pe(n){const t=tt(n);return t.Ee||(t.Ee=cf(t,sn(n))),t.Ee}function cf(n,t){if(n.limitType==="F")return Wo(n.path,n.collectionGroup,t,n.filters,n.limit,n.startAt,n.endAt);{t=t.map((s=>{const o=s.dir==="desc"?"asc":"desc";return new ur(s.field,o)}));const e=n.endAt?new lr(n.endAt.position,n.endAt.inclusive):null,r=n.startAt?new lr(n.startAt.position,n.startAt.inclusive):null;return Wo(n.path,n.collectionGroup,t,n.filters,n.limit,e,r)}}function bi(n,t,e){return new gr(n.path,n.collectionGroup,n.explicitOrderBy.slice(),n.filters.slice(),t,e,n.startAt,n.endAt)}function sl(n,t){return Ki(pe(n),pe(t))&&n.limitType===t.limitType}function ol(n){return`${Gi(pe(n))}|lt:${n.limitType}`}function tn(n){return`Query(target=${(function(e){let r=e.path.canonicalString();return e.collectionGroup!==null&&(r+=" collectionGroup="+e.collectionGroup),e.filters.length>0&&(r+=`, filters: [${e.filters.map((s=>rl(s))).join(", ")}]`),zi(e.limit)||(r+=", limit: "+e.limit),e.orderBy.length>0&&(r+=`, orderBy: [${e.orderBy.map((s=>(function(l){return`${l.field.canonicalString()} (${l.dir})`})(s))).join(", ")}]`),e.startAt&&(r+=", startAt: ",r+=e.startAt.inclusive?"b:":"a:",r+=e.startAt.position.map((s=>Oe(s))).join(",")),e.endAt&&(r+=", endAt: ",r+=e.endAt.inclusive?"a:":"b:",r+=e.endAt.position.map((s=>Oe(s))).join(",")),`Target(${r})`})(pe(n))}; limitType=${n.limitType})`}function Wi(n,t){return t.isFoundDocument()&&(function(r,s){const o=s.key.path;return r.collectionGroup!==null?s.key.hasCollectionId(r.collectionGroup)&&r.path.isPrefixOf(o):z.isDocumentKey(r.path)?r.path.isEqual(o):r.path.isImmediateParentOf(o)})(n,t)&&(function(r,s){for(const o of sn(r))if(!o.field.isKeyField()&&s.data.field(o.field)===null)return!1;return!0})(n,t)&&(function(r,s){for(const o of r.filters)if(!o.matches(s))return!1;return!0})(n,t)&&(function(r,s){return!(r.startAt&&!(function(l,c,d){const g=Go(l,c,d);return l.inclusive?g<=0:g<0})(r.startAt,sn(r),s)||r.endAt&&!(function(l,c,d){const g=Go(l,c,d);return l.inclusive?g>=0:g>0})(r.endAt,sn(r),s))})(n,t)}function hf(n){return(t,e)=>{let r=!1;for(const s of sn(n)){const o=ff(s,t,e);if(o!==0)return o;r=r||s.field.isKeyField()}return 0}}function ff(n,t,e){const r=n.field.isKeyField()?z.comparator(t.key,e.key):(function(o,l,c){const d=l.data.field(o),g=c.data.field(o);return d!==null&&g!==null?ke(d,g):q(42886)})(n.field,t,e);switch(n.dir){case"asc":return r;case"desc":return-1*r;default:return q(19790,{direction:n.dir})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ve{constructor(t,e){this.mapKeyFn=t,this.equalsFn=e,this.inner={},this.innerSize=0}get(t){const e=this.mapKeyFn(t),r=this.inner[e];if(r!==void 0){for(const[s,o]of r)if(this.equalsFn(s,t))return o}}has(t){return this.get(t)!==void 0}set(t,e){const r=this.mapKeyFn(t),s=this.inner[r];if(s===void 0)return this.inner[r]=[[t,e]],void this.innerSize++;for(let o=0;o<s.length;o++)if(this.equalsFn(s[o][0],t))return void(s[o]=[t,e]);s.push([t,e]),this.innerSize++}delete(t){const e=this.mapKeyFn(t),r=this.inner[e];if(r===void 0)return!1;for(let s=0;s<r.length;s++)if(this.equalsFn(r[s][0],t))return r.length===1?delete this.inner[e]:r.splice(s,1),this.innerSize--,!0;return!1}forEach(t){je(this.inner,((e,r)=>{for(const[s,o]of r)t(s,o)}))}isEmpty(){return Ha(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const df=new Vt(z.comparator);function cr(){return df}const al=new Vt(z.comparator);function Hn(...n){let t=al;for(const e of n)t=t.insert(e.key,e);return t}function ll(n){let t=al;return n.forEach(((e,r)=>t=t.insert(e,r.overlayedDocument))),t}function fe(){return on()}function ul(){return on()}function on(){return new ve((n=>n.toString()),((n,t)=>n.isEqual(t)))}const pf=new Vt(z.comparator),mf=new yt(z.comparator);function St(...n){let t=mf;for(const e of n)t=t.add(e);return t}const gf=new yt(J);function _f(){return gf}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Qi(n,t){if(n.useProto3Json){if(isNaN(t))return{doubleValue:"NaN"};if(t===1/0)return{doubleValue:"Infinity"};if(t===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:ir(t)?"-0":t}}function cl(n){return{integerValue:""+n}}function yf(n,t){return Bh(t)?cl(t):Qi(n,t)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _r{constructor(){this._=void 0}}function vf(n,t,e){return n instanceof mn?(function(s,o){const l={fields:{[Ka]:{stringValue:Ga},[Qa]:{timestampValue:{seconds:s.seconds,nanos:s.nanoseconds}}}};return o&&qi(o)&&(o=$i(o)),o&&(l.fields[Wa]=o),{mapValue:l}})(e,t):n instanceof gn?fl(n,t):n instanceof _n?dl(n,t):(function(s,o){const l=hl(s,o),c=Xo(l)+Xo(s.Ae);return Ai(l)&&Ai(s.Ae)?cl(c):Qi(s.serializer,c)})(n,t)}function Ef(n,t,e){return n instanceof gn?fl(n,t):n instanceof _n?dl(n,t):e}function hl(n,t){return n instanceof hr?(function(r){return Ai(r)||(function(o){return!!o&&"doubleValue"in o})(r)})(t)?t:{integerValue:0}:null}class mn extends _r{}class gn extends _r{constructor(t){super(),this.elements=t}}function fl(n,t){const e=pl(t);for(const r of n.elements)e.some((s=>Bt(s,r)))||e.push(r);return{arrayValue:{values:e}}}class _n extends _r{constructor(t){super(),this.elements=t}}function dl(n,t){let e=pl(t);for(const r of n.elements)e=e.filter((s=>!Bt(s,r)));return{arrayValue:{values:e}}}class hr extends _r{constructor(t,e){super(),this.serializer=t,this.Ae=e}}function Xo(n){return gt(n.integerValue||n.doubleValue)}function pl(n){return Hi(n)&&n.arrayValue.values?n.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tf{constructor(t,e){this.field=t,this.transform=e}}function If(n,t){return n.field.isEqual(t.field)&&(function(r,s){return r instanceof gn&&s instanceof gn||r instanceof _n&&s instanceof _n?Ne(r.elements,s.elements,Bt):r instanceof hr&&s instanceof hr?Bt(r.Ae,s.Ae):r instanceof mn&&s instanceof mn})(n.transform,t.transform)}class wf{constructor(t,e){this.version=t,this.transformResults=e}}class Ht{constructor(t,e){this.updateTime=t,this.exists=e}static none(){return new Ht}static exists(t){return new Ht(void 0,t)}static updateTime(t){return new Ht(t)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(t){return this.exists===t.exists&&(this.updateTime?!!t.updateTime&&this.updateTime.isEqual(t.updateTime):!t.updateTime)}}function Yn(n,t){return n.updateTime!==void 0?t.isFoundDocument()&&t.version.isEqual(n.updateTime):n.exists===void 0||n.exists===t.isFoundDocument()}class yr{}function ml(n,t){if(!n.hasLocalMutations||t&&t.fields.length===0)return null;if(t===null)return n.isNoDocument()?new _l(n.key,Ht.none()):new En(n.key,n.data,Ht.none());{const e=n.data,r=Ot.empty();let s=new yt(_t.comparator);for(let o of t.fields)if(!s.has(o)){let l=e.field(o);l===null&&o.length>1&&(o=o.popLast(),l=e.field(o)),l===null?r.delete(o):r.set(o,l),s=s.add(o)}return new Ee(n.key,r,new Lt(s.toArray()),Ht.none())}}function Af(n,t,e){n instanceof En?(function(s,o,l){const c=s.value.clone(),d=Yo(s.fieldTransforms,o,l.transformResults);c.setAll(d),o.convertToFoundDocument(l.version,c).setHasCommittedMutations()})(n,t,e):n instanceof Ee?(function(s,o,l){if(!Yn(s.precondition,o))return void o.convertToUnknownDocument(l.version);const c=Yo(s.fieldTransforms,o,l.transformResults),d=o.data;d.setAll(gl(s)),d.setAll(c),o.convertToFoundDocument(l.version,d).setHasCommittedMutations()})(n,t,e):(function(s,o,l){o.convertToNoDocument(l.version).setHasCommittedMutations()})(0,t,e)}function an(n,t,e,r){return n instanceof En?(function(o,l,c,d){if(!Yn(o.precondition,l))return c;const g=o.value.clone(),E=Zo(o.fieldTransforms,d,l);return g.setAll(E),l.convertToFoundDocument(l.version,g).setHasLocalMutations(),null})(n,t,e,r):n instanceof Ee?(function(o,l,c,d){if(!Yn(o.precondition,l))return c;const g=Zo(o.fieldTransforms,d,l),E=l.data;return E.setAll(gl(o)),E.setAll(g),l.convertToFoundDocument(l.version,E).setHasLocalMutations(),c===null?null:c.unionWith(o.fieldMask.fields).unionWith(o.fieldTransforms.map((w=>w.field)))})(n,t,e,r):(function(o,l,c){return Yn(o.precondition,l)?(l.convertToNoDocument(l.version).setHasLocalMutations(),null):c})(n,t,e)}function Sf(n,t){let e=null;for(const r of n.fieldTransforms){const s=t.data.field(r.field),o=hl(r.transform,s||null);o!=null&&(e===null&&(e=Ot.empty()),e.set(r.field,o))}return e||null}function Jo(n,t){return n.type===t.type&&!!n.key.isEqual(t.key)&&!!n.precondition.isEqual(t.precondition)&&!!(function(r,s){return r===void 0&&s===void 0||!(!r||!s)&&Ne(r,s,((o,l)=>If(o,l)))})(n.fieldTransforms,t.fieldTransforms)&&(n.type===0?n.value.isEqual(t.value):n.type!==1||n.data.isEqual(t.data)&&n.fieldMask.isEqual(t.fieldMask))}class En extends yr{constructor(t,e,r,s=[]){super(),this.key=t,this.value=e,this.precondition=r,this.fieldTransforms=s,this.type=0}getFieldMask(){return null}}class Ee extends yr{constructor(t,e,r,s,o=[]){super(),this.key=t,this.data=e,this.fieldMask=r,this.precondition=s,this.fieldTransforms=o,this.type=1}getFieldMask(){return this.fieldMask}}function gl(n){const t=new Map;return n.fieldMask.fields.forEach((e=>{if(!e.isEmpty()){const r=n.data.field(e);t.set(e,r)}})),t}function Yo(n,t,e){const r=new Map;ot(n.length===e.length,32656,{Re:e.length,Ve:n.length});for(let s=0;s<e.length;s++){const o=n[s],l=o.transform,c=t.data.field(o.field);r.set(o.field,Ef(l,c,e[s]))}return r}function Zo(n,t,e){const r=new Map;for(const s of n){const o=s.transform,l=e.data.field(s.field);r.set(s.field,vf(o,l,t))}return r}class _l extends yr{constructor(t,e){super(),this.key=t,this.precondition=e,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class bf extends yr{constructor(t,e){super(),this.key=t,this.precondition=e,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rf{constructor(t,e,r,s){this.batchId=t,this.localWriteTime=e,this.baseMutations=r,this.mutations=s}applyToRemoteDocument(t,e){const r=e.mutationResults;for(let s=0;s<this.mutations.length;s++){const o=this.mutations[s];o.key.isEqual(t.key)&&Af(o,t,r[s])}}applyToLocalView(t,e){for(const r of this.baseMutations)r.key.isEqual(t.key)&&(e=an(r,t,e,this.localWriteTime));for(const r of this.mutations)r.key.isEqual(t.key)&&(e=an(r,t,e,this.localWriteTime));return e}applyToLocalDocumentSet(t,e){const r=ul();return this.mutations.forEach((s=>{const o=t.get(s.key),l=o.overlayedDocument;let c=this.applyToLocalView(l,o.mutatedFields);c=e.has(s.key)?null:c;const d=ml(l,c);d!==null&&r.set(s.key,d),l.isValidDocument()||l.convertToNoDocument(nt.min())})),r}keys(){return this.mutations.reduce(((t,e)=>t.add(e.key)),St())}isEqual(t){return this.batchId===t.batchId&&Ne(this.mutations,t.mutations,((e,r)=>Jo(e,r)))&&Ne(this.baseMutations,t.baseMutations,((e,r)=>Jo(e,r)))}}class Xi{constructor(t,e,r,s){this.batch=t,this.commitVersion=e,this.mutationResults=r,this.docVersions=s}static from(t,e,r){ot(t.mutations.length===r.length,58842,{me:t.mutations.length,fe:r.length});let s=(function(){return pf})();const o=t.mutations;for(let l=0;l<o.length;l++)s=s.insert(o[l].key,r[l].version);return new Xi(t,e,r,s)}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cf{constructor(t,e){this.largestBatchId=t,this.mutation=e}getKey(){return this.mutation.key}isEqual(t){return t!==null&&this.mutation===t.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var lt,K;function Pf(n){switch(n){case R.OK:return q(64938);case R.CANCELLED:case R.UNKNOWN:case R.DEADLINE_EXCEEDED:case R.RESOURCE_EXHAUSTED:case R.INTERNAL:case R.UNAVAILABLE:case R.UNAUTHENTICATED:return!1;case R.INVALID_ARGUMENT:case R.NOT_FOUND:case R.ALREADY_EXISTS:case R.PERMISSION_DENIED:case R.FAILED_PRECONDITION:case R.ABORTED:case R.OUT_OF_RANGE:case R.UNIMPLEMENTED:case R.DATA_LOSS:return!0;default:return q(15467,{code:n})}}function Vf(n){if(n===void 0)return ge("GRPC error has no .code"),R.UNKNOWN;switch(n){case lt.OK:return R.OK;case lt.CANCELLED:return R.CANCELLED;case lt.UNKNOWN:return R.UNKNOWN;case lt.DEADLINE_EXCEEDED:return R.DEADLINE_EXCEEDED;case lt.RESOURCE_EXHAUSTED:return R.RESOURCE_EXHAUSTED;case lt.INTERNAL:return R.INTERNAL;case lt.UNAVAILABLE:return R.UNAVAILABLE;case lt.UNAUTHENTICATED:return R.UNAUTHENTICATED;case lt.INVALID_ARGUMENT:return R.INVALID_ARGUMENT;case lt.NOT_FOUND:return R.NOT_FOUND;case lt.ALREADY_EXISTS:return R.ALREADY_EXISTS;case lt.PERMISSION_DENIED:return R.PERMISSION_DENIED;case lt.FAILED_PRECONDITION:return R.FAILED_PRECONDITION;case lt.ABORTED:return R.ABORTED;case lt.OUT_OF_RANGE:return R.OUT_OF_RANGE;case lt.UNIMPLEMENTED:return R.UNIMPLEMENTED;case lt.DATA_LOSS:return R.DATA_LOSS;default:return q(39323,{code:n})}}(K=lt||(lt={}))[K.OK=0]="OK",K[K.CANCELLED=1]="CANCELLED",K[K.UNKNOWN=2]="UNKNOWN",K[K.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",K[K.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",K[K.NOT_FOUND=5]="NOT_FOUND",K[K.ALREADY_EXISTS=6]="ALREADY_EXISTS",K[K.PERMISSION_DENIED=7]="PERMISSION_DENIED",K[K.UNAUTHENTICATED=16]="UNAUTHENTICATED",K[K.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",K[K.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",K[K.ABORTED=10]="ABORTED",K[K.OUT_OF_RANGE=11]="OUT_OF_RANGE",K[K.UNIMPLEMENTED=12]="UNIMPLEMENTED",K[K.INTERNAL=13]="INTERNAL",K[K.UNAVAILABLE=14]="UNAVAILABLE",K[K.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */new Oi([4294967295,4294967295],0);class Df{constructor(t,e){this.databaseId=t,this.useProto3Json=e}}function Ri(n,t){return n.useProto3Json?`${new Date(1e3*t.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+t.nanoseconds).slice(-9)}Z`:{seconds:""+t.seconds,nanos:t.nanoseconds}}function Nf(n,t){return n.useProto3Json?t.toBase64():t.toUint8Array()}function xf(n,t){return Ri(n,t.toTimestamp())}function Ve(n){return ot(!!n,49232),nt.fromTimestamp((function(e){const r=_e(e);return new rt(r.seconds,r.nanos)})(n))}function yl(n,t){return Ci(n,t).canonicalString()}function Ci(n,t){const e=(function(s){return new it(["projects",s.projectId,"databases",s.database])})(n).child("documents");return t===void 0?e:e.child(t)}function kf(n){const t=it.fromString(n);return ot(zf(t),10190,{key:t.toString()}),t}function Pi(n,t){return yl(n.databaseId,t.path)}function Of(n){const t=kf(n);return t.length===4?it.emptyPath():Lf(t)}function Mf(n){return new it(["projects",n.databaseId.projectId,"databases",n.databaseId.database]).canonicalString()}function Lf(n){return ot(n.length>4&&n.get(4)==="documents",29091,{key:n.toString()}),n.popFirst(5)}function ta(n,t,e){return{name:Pi(n,t),fields:e.value.mapValue.fields}}function Ff(n,t){let e;if(t instanceof En)e={update:ta(n,t.key,t.value)};else if(t instanceof _l)e={delete:Pi(n,t.key)};else if(t instanceof Ee)e={update:ta(n,t.key,t.data),updateMask:Bf(t.fieldMask)};else{if(!(t instanceof bf))return q(16599,{Vt:t.type});e={verify:Pi(n,t.key)}}return t.fieldTransforms.length>0&&(e.updateTransforms=t.fieldTransforms.map((r=>(function(o,l){const c=l.transform;if(c instanceof mn)return{fieldPath:l.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof gn)return{fieldPath:l.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof _n)return{fieldPath:l.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof hr)return{fieldPath:l.field.canonicalString(),increment:c.Ae};throw q(20930,{transform:l.transform})})(0,r)))),t.precondition.isNone||(e.currentDocument=(function(s,o){return o.updateTime!==void 0?{updateTime:xf(s,o.updateTime)}:o.exists!==void 0?{exists:o.exists}:q(27497)})(n,t.precondition)),e}function Uf(n,t){return n&&n.length>0?(ot(t!==void 0,14353),n.map((e=>(function(s,o){let l=s.updateTime?Ve(s.updateTime):Ve(o);return l.isEqual(nt.min())&&(l=Ve(o)),new wf(l,s.transformResults||[])})(e,t)))):[]}function jf(n){let t=Of(n.parent);const e=n.structuredQuery,r=e.from?e.from.length:0;let s=null;if(r>0){ot(r===1,65062);const E=e.from[0];E.allDescendants?s=E.collectionId:t=t.child(E.collectionId)}let o=[];e.where&&(o=(function(w){const T=vl(w);return T instanceof ne&&el(T)?T.getFilters():[T]})(e.where));let l=[];e.orderBy&&(l=(function(w){return w.map((T=>(function(D){return new ur(Ce(D.field),(function(N){switch(N){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}})(D.direction))})(T)))})(e.orderBy));let c=null;e.limit&&(c=(function(w){let T;return T=typeof w=="object"?w.value:w,zi(T)?null:T})(e.limit));let d=null;e.startAt&&(d=(function(w){const T=!!w.before,C=w.values||[];return new lr(C,T)})(e.startAt));let g=null;return e.endAt&&(g=(function(w){const T=!w.before,C=w.values||[];return new lr(C,T)})(e.endAt)),af(t,s,l,o,c,"F",d,g)}function vl(n){return n.unaryFilter!==void 0?(function(e){switch(e.unaryFilter.op){case"IS_NAN":const r=Ce(e.unaryFilter.field);return ft.create(r,"==",{doubleValue:NaN});case"IS_NULL":const s=Ce(e.unaryFilter.field);return ft.create(s,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const o=Ce(e.unaryFilter.field);return ft.create(o,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const l=Ce(e.unaryFilter.field);return ft.create(l,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return q(61313);default:return q(60726)}})(n):n.fieldFilter!==void 0?(function(e){return ft.create(Ce(e.fieldFilter.field),(function(s){switch(s){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return q(58110);default:return q(50506)}})(e.fieldFilter.op),e.fieldFilter.value)})(n):n.compositeFilter!==void 0?(function(e){return ne.create(e.compositeFilter.filters.map((r=>vl(r))),(function(s){switch(s){case"AND":return"and";case"OR":return"or";default:return q(1026)}})(e.compositeFilter.op))})(n):q(30097,{filter:n})}function Ce(n){return _t.fromServerFormat(n.fieldPath)}function Bf(n){const t=[];return n.fields.forEach((e=>t.push(e.canonicalString()))),{fieldPaths:t}}function zf(n){return n.length>=4&&n.get(0)==="projects"&&n.get(2)==="databases"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qf{constructor(t){this.yt=t}}function $f(n){const t=jf({parent:n.parent,structuredQuery:n.structuredQuery});return n.limitType==="LAST"?bi(t,t.limit,"L"):t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hf{constructor(){this.Cn=new Gf}addToCollectionParentIndex(t,e){return this.Cn.add(e),b.resolve()}getCollectionParents(t,e){return b.resolve(this.Cn.getEntries(e))}addFieldIndex(t,e){return b.resolve()}deleteFieldIndex(t,e){return b.resolve()}deleteAllFieldIndexes(t){return b.resolve()}createTargetIndexes(t,e){return b.resolve()}getDocumentsMatchingTarget(t,e){return b.resolve(null)}getIndexType(t,e){return b.resolve(0)}getFieldIndexes(t,e){return b.resolve([])}getNextCollectionGroupToUpdate(t){return b.resolve(null)}getMinOffset(t,e){return b.resolve(ee.min())}getMinOffsetFromCollectionGroup(t,e){return b.resolve(ee.min())}updateCollectionGroup(t,e,r){return b.resolve()}updateIndexEntries(t,e){return b.resolve()}}class Gf{constructor(){this.index={}}add(t){const e=t.lastSegment(),r=t.popLast(),s=this.index[e]||new yt(it.comparator),o=!s.has(r);return this.index[e]=s.add(r),o}has(t){const e=t.lastSegment(),r=t.popLast(),s=this.index[e];return s&&s.has(r)}getEntries(t){return(this.index[t]||new yt(it.comparator)).toArray()}}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ea={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},El=41943040;class Pt{static withCacheSize(t){return new Pt(t,Pt.DEFAULT_COLLECTION_PERCENTILE,Pt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(t,e,r){this.cacheSizeCollectionThreshold=t,this.percentileToCollect=e,this.maximumSequenceNumbersToCollect=r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Pt.DEFAULT_COLLECTION_PERCENTILE=10,Pt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,Pt.DEFAULT=new Pt(El,Pt.DEFAULT_COLLECTION_PERCENTILE,Pt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),Pt.DISABLED=new Pt(-1,0,0);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Me{constructor(t){this.ar=t}next(){return this.ar+=2,this.ar}static ur(){return new Me(0)}static cr(){return new Me(-1)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const na="LruGarbageCollector",Kf=1048576;function ra([n,t],[e,r]){const s=J(n,e);return s===0?J(t,r):s}class Wf{constructor(t){this.Ir=t,this.buffer=new yt(ra),this.Er=0}dr(){return++this.Er}Ar(t){const e=[t,this.dr()];if(this.buffer.size<this.Ir)this.buffer=this.buffer.add(e);else{const r=this.buffer.last();ra(e,r)<0&&(this.buffer=this.buffer.delete(r).add(e))}}get maxValue(){return this.buffer.last()[0]}}class Qf{constructor(t,e,r){this.garbageCollector=t,this.asyncQueue=e,this.localStore=r,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Vr(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Vr(t){O(na,`Garbage collection scheduled in ${t}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",t,(async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(e){vn(e)?O(na,"Ignoring IndexedDB error during garbage collection: ",e):await Ui(e)}await this.Vr(3e5)}))}}class Xf{constructor(t,e){this.mr=t,this.params=e}calculateTargetCount(t,e){return this.mr.gr(t).next((r=>Math.floor(e/100*r)))}nthSequenceNumber(t,e){if(e===0)return b.resolve(ji.ce);const r=new Wf(e);return this.mr.forEachTarget(t,(s=>r.Ar(s.sequenceNumber))).next((()=>this.mr.pr(t,(s=>r.Ar(s))))).next((()=>r.maxValue))}removeTargets(t,e,r){return this.mr.removeTargets(t,e,r)}removeOrphanedDocuments(t,e){return this.mr.removeOrphanedDocuments(t,e)}collect(t,e){return this.params.cacheSizeCollectionThreshold===-1?(O("LruGarbageCollector","Garbage collection skipped; disabled"),b.resolve(ea)):this.getCacheSize(t).next((r=>r<this.params.cacheSizeCollectionThreshold?(O("LruGarbageCollector",`Garbage collection skipped; Cache size ${r} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),ea):this.yr(t,e)))}getCacheSize(t){return this.mr.getCacheSize(t)}yr(t,e){let r,s,o,l,c,d,g;const E=Date.now();return this.calculateTargetCount(t,this.params.percentileToCollect).next((w=>(w>this.params.maximumSequenceNumbersToCollect?(O("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${w}`),s=this.params.maximumSequenceNumbersToCollect):s=w,l=Date.now(),this.nthSequenceNumber(t,s)))).next((w=>(r=w,c=Date.now(),this.removeTargets(t,r,e)))).next((w=>(o=w,d=Date.now(),this.removeOrphanedDocuments(t,r)))).next((w=>(g=Date.now(),Re()<=W.DEBUG&&O("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${l-E}ms
	Determined least recently used ${s} in `+(c-l)+`ms
	Removed ${o} targets in `+(d-c)+`ms
	Removed ${w} documents in `+(g-d)+`ms
Total Duration: ${g-E}ms`),b.resolve({didRun:!0,sequenceNumbersCollected:s,targetsRemoved:o,documentsRemoved:w}))))}}function Jf(n,t){return new Xf(n,t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yf{constructor(){this.changes=new ve((t=>t.toString()),((t,e)=>t.isEqual(e))),this.changesApplied=!1}addEntry(t){this.assertNotApplied(),this.changes.set(t.key,t)}removeEntry(t,e){this.assertNotApplied(),this.changes.set(t,kt.newInvalidDocument(t).setReadTime(e))}getEntry(t,e){this.assertNotApplied();const r=this.changes.get(e);return r!==void 0?b.resolve(r):this.getFromCache(t,e)}getEntries(t,e){return this.getAllFromCache(t,e)}apply(t){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(t)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zf{constructor(t,e){this.overlayedDocument=t,this.mutatedFields=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class td{constructor(t,e,r,s){this.remoteDocumentCache=t,this.mutationQueue=e,this.documentOverlayCache=r,this.indexManager=s}getDocument(t,e){let r=null;return this.documentOverlayCache.getOverlay(t,e).next((s=>(r=s,this.remoteDocumentCache.getEntry(t,e)))).next((s=>(r!==null&&an(r.mutation,s,Lt.empty(),rt.now()),s)))}getDocuments(t,e){return this.remoteDocumentCache.getEntries(t,e).next((r=>this.getLocalViewOfDocuments(t,r,St()).next((()=>r))))}getLocalViewOfDocuments(t,e,r=St()){const s=fe();return this.populateOverlays(t,s,e).next((()=>this.computeViews(t,e,s,r).next((o=>{let l=Hn();return o.forEach(((c,d)=>{l=l.insert(c,d.overlayedDocument)})),l}))))}getOverlayedDocuments(t,e){const r=fe();return this.populateOverlays(t,r,e).next((()=>this.computeViews(t,e,r,St())))}populateOverlays(t,e,r){const s=[];return r.forEach((o=>{e.has(o)||s.push(o)})),this.documentOverlayCache.getOverlays(t,s).next((o=>{o.forEach(((l,c)=>{e.set(l,c)}))}))}computeViews(t,e,r,s){let o=cr();const l=on(),c=(function(){return on()})();return e.forEach(((d,g)=>{const E=r.get(g.key);s.has(g.key)&&(E===void 0||E.mutation instanceof Ee)?o=o.insert(g.key,g):E!==void 0?(l.set(g.key,E.mutation.getFieldMask()),an(E.mutation,g,E.mutation.getFieldMask(),rt.now())):l.set(g.key,Lt.empty())})),this.recalculateAndSaveOverlays(t,o).next((d=>(d.forEach(((g,E)=>l.set(g,E))),e.forEach(((g,E)=>c.set(g,new Zf(E,l.get(g)??null)))),c)))}recalculateAndSaveOverlays(t,e){const r=on();let s=new Vt(((l,c)=>l-c)),o=St();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(t,e).next((l=>{for(const c of l)c.keys().forEach((d=>{const g=e.get(d);if(g===null)return;let E=r.get(d)||Lt.empty();E=c.applyToLocalView(g,E),r.set(d,E);const w=(s.get(c.batchId)||St()).add(d);s=s.insert(c.batchId,w)}))})).next((()=>{const l=[],c=s.getReverseIterator();for(;c.hasNext();){const d=c.getNext(),g=d.key,E=d.value,w=ul();E.forEach((T=>{if(!o.has(T)){const C=ml(e.get(T),r.get(T));C!==null&&w.set(T,C),o=o.add(T)}})),l.push(this.documentOverlayCache.saveOverlays(t,g,w))}return b.waitFor(l)})).next((()=>r))}recalculateAndSaveOverlaysForDocumentKeys(t,e){return this.remoteDocumentCache.getEntries(t,e).next((r=>this.recalculateAndSaveOverlays(t,r)))}getDocumentsMatchingQuery(t,e,r,s){return(function(l){return z.isDocumentKey(l.path)&&l.collectionGroup===null&&l.filters.length===0})(e)?this.getDocumentsMatchingDocumentQuery(t,e.path):uf(e)?this.getDocumentsMatchingCollectionGroupQuery(t,e,r,s):this.getDocumentsMatchingCollectionQuery(t,e,r,s)}getNextDocuments(t,e,r,s){return this.remoteDocumentCache.getAllFromCollectionGroup(t,e,r,s).next((o=>{const l=s-o.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(t,e,r.largestBatchId,s-o.size):b.resolve(fe());let c=dn,d=o;return l.next((g=>b.forEach(g,((E,w)=>(c<w.largestBatchId&&(c=w.largestBatchId),o.get(E)?b.resolve():this.remoteDocumentCache.getEntry(t,E).next((T=>{d=d.insert(E,T)}))))).next((()=>this.populateOverlays(t,g,o))).next((()=>this.computeViews(t,d,g,St()))).next((E=>({batchId:c,changes:ll(E)})))))}))}getDocumentsMatchingDocumentQuery(t,e){return this.getDocument(t,new z(e)).next((r=>{let s=Hn();return r.isFoundDocument()&&(s=s.insert(r.key,r)),s}))}getDocumentsMatchingCollectionGroupQuery(t,e,r,s){const o=e.collectionGroup;let l=Hn();return this.indexManager.getCollectionParents(t,o).next((c=>b.forEach(c,(d=>{const g=(function(w,T){return new gr(T,null,w.explicitOrderBy.slice(),w.filters.slice(),w.limit,w.limitType,w.startAt,w.endAt)})(e,d.child(o));return this.getDocumentsMatchingCollectionQuery(t,g,r,s).next((E=>{E.forEach(((w,T)=>{l=l.insert(w,T)}))}))})).next((()=>l))))}getDocumentsMatchingCollectionQuery(t,e,r,s){let o;return this.documentOverlayCache.getOverlaysForCollection(t,e.path,r.largestBatchId).next((l=>(o=l,this.remoteDocumentCache.getDocumentsMatchingQuery(t,e,r,o,s)))).next((l=>{o.forEach(((d,g)=>{const E=g.getKey();l.get(E)===null&&(l=l.insert(E,kt.newInvalidDocument(E)))}));let c=Hn();return l.forEach(((d,g)=>{const E=o.get(d);E!==void 0&&an(E.mutation,g,Lt.empty(),rt.now()),Wi(e,g)&&(c=c.insert(d,g))})),c}))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ed{constructor(t){this.serializer=t,this.Lr=new Map,this.kr=new Map}getBundleMetadata(t,e){return b.resolve(this.Lr.get(e))}saveBundleMetadata(t,e){return this.Lr.set(e.id,(function(s){return{id:s.id,version:s.version,createTime:Ve(s.createTime)}})(e)),b.resolve()}getNamedQuery(t,e){return b.resolve(this.kr.get(e))}saveNamedQuery(t,e){return this.kr.set(e.name,(function(s){return{name:s.name,query:$f(s.bundledQuery),readTime:Ve(s.readTime)}})(e)),b.resolve()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nd{constructor(){this.overlays=new Vt(z.comparator),this.qr=new Map}getOverlay(t,e){return b.resolve(this.overlays.get(e))}getOverlays(t,e){const r=fe();return b.forEach(e,(s=>this.getOverlay(t,s).next((o=>{o!==null&&r.set(s,o)})))).next((()=>r))}saveOverlays(t,e,r){return r.forEach(((s,o)=>{this.St(t,e,o)})),b.resolve()}removeOverlaysForBatchId(t,e,r){const s=this.qr.get(r);return s!==void 0&&(s.forEach((o=>this.overlays=this.overlays.remove(o))),this.qr.delete(r)),b.resolve()}getOverlaysForCollection(t,e,r){const s=fe(),o=e.length+1,l=new z(e.child("")),c=this.overlays.getIteratorFrom(l);for(;c.hasNext();){const d=c.getNext().value,g=d.getKey();if(!e.isPrefixOf(g.path))break;g.path.length===o&&d.largestBatchId>r&&s.set(d.getKey(),d)}return b.resolve(s)}getOverlaysForCollectionGroup(t,e,r,s){let o=new Vt(((g,E)=>g-E));const l=this.overlays.getIterator();for(;l.hasNext();){const g=l.getNext().value;if(g.getKey().getCollectionGroup()===e&&g.largestBatchId>r){let E=o.get(g.largestBatchId);E===null&&(E=fe(),o=o.insert(g.largestBatchId,E)),E.set(g.getKey(),g)}}const c=fe(),d=o.getIterator();for(;d.hasNext()&&(d.getNext().value.forEach(((g,E)=>c.set(g,E))),!(c.size()>=s)););return b.resolve(c)}St(t,e,r){const s=this.overlays.get(r.key);if(s!==null){const l=this.qr.get(s.largestBatchId).delete(r.key);this.qr.set(s.largestBatchId,l)}this.overlays=this.overlays.insert(r.key,new Cf(e,r));let o=this.qr.get(e);o===void 0&&(o=St(),this.qr.set(e,o)),this.qr.set(e,o.add(r.key))}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rd{constructor(){this.sessionToken=jt.EMPTY_BYTE_STRING}getSessionToken(t){return b.resolve(this.sessionToken)}setSessionToken(t,e){return this.sessionToken=e,b.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ji{constructor(){this.Qr=new yt(ht.$r),this.Ur=new yt(ht.Kr)}isEmpty(){return this.Qr.isEmpty()}addReference(t,e){const r=new ht(t,e);this.Qr=this.Qr.add(r),this.Ur=this.Ur.add(r)}Wr(t,e){t.forEach((r=>this.addReference(r,e)))}removeReference(t,e){this.Gr(new ht(t,e))}zr(t,e){t.forEach((r=>this.removeReference(r,e)))}jr(t){const e=new z(new it([])),r=new ht(e,t),s=new ht(e,t+1),o=[];return this.Ur.forEachInRange([r,s],(l=>{this.Gr(l),o.push(l.key)})),o}Jr(){this.Qr.forEach((t=>this.Gr(t)))}Gr(t){this.Qr=this.Qr.delete(t),this.Ur=this.Ur.delete(t)}Hr(t){const e=new z(new it([])),r=new ht(e,t),s=new ht(e,t+1);let o=St();return this.Ur.forEachInRange([r,s],(l=>{o=o.add(l.key)})),o}containsKey(t){const e=new ht(t,0),r=this.Qr.firstAfterOrEqual(e);return r!==null&&t.isEqual(r.key)}}class ht{constructor(t,e){this.key=t,this.Yr=e}static $r(t,e){return z.comparator(t.key,e.key)||J(t.Yr,e.Yr)}static Kr(t,e){return J(t.Yr,e.Yr)||z.comparator(t.key,e.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class id{constructor(t,e){this.indexManager=t,this.referenceDelegate=e,this.mutationQueue=[],this.tr=1,this.Zr=new yt(ht.$r)}checkEmpty(t){return b.resolve(this.mutationQueue.length===0)}addMutationBatch(t,e,r,s){const o=this.tr;this.tr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const l=new Rf(o,e,r,s);this.mutationQueue.push(l);for(const c of s)this.Zr=this.Zr.add(new ht(c.key,o)),this.indexManager.addToCollectionParentIndex(t,c.key.path.popLast());return b.resolve(l)}lookupMutationBatch(t,e){return b.resolve(this.Xr(e))}getNextMutationBatchAfterBatchId(t,e){const r=e+1,s=this.ei(r),o=s<0?0:s;return b.resolve(this.mutationQueue.length>o?this.mutationQueue[o]:null)}getHighestUnacknowledgedBatchId(){return b.resolve(this.mutationQueue.length===0?Bi:this.tr-1)}getAllMutationBatches(t){return b.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(t,e){const r=new ht(e,0),s=new ht(e,Number.POSITIVE_INFINITY),o=[];return this.Zr.forEachInRange([r,s],(l=>{const c=this.Xr(l.Yr);o.push(c)})),b.resolve(o)}getAllMutationBatchesAffectingDocumentKeys(t,e){let r=new yt(J);return e.forEach((s=>{const o=new ht(s,0),l=new ht(s,Number.POSITIVE_INFINITY);this.Zr.forEachInRange([o,l],(c=>{r=r.add(c.Yr)}))})),b.resolve(this.ti(r))}getAllMutationBatchesAffectingQuery(t,e){const r=e.path,s=r.length+1;let o=r;z.isDocumentKey(o)||(o=o.child(""));const l=new ht(new z(o),0);let c=new yt(J);return this.Zr.forEachWhile((d=>{const g=d.key.path;return!!r.isPrefixOf(g)&&(g.length===s&&(c=c.add(d.Yr)),!0)}),l),b.resolve(this.ti(c))}ti(t){const e=[];return t.forEach((r=>{const s=this.Xr(r);s!==null&&e.push(s)})),e}removeMutationBatch(t,e){ot(this.ni(e.batchId,"removed")===0,55003),this.mutationQueue.shift();let r=this.Zr;return b.forEach(e.mutations,(s=>{const o=new ht(s.key,e.batchId);return r=r.delete(o),this.referenceDelegate.markPotentiallyOrphaned(t,s.key)})).next((()=>{this.Zr=r}))}ir(t){}containsKey(t,e){const r=new ht(e,0),s=this.Zr.firstAfterOrEqual(r);return b.resolve(e.isEqual(s&&s.key))}performConsistencyCheck(t){return this.mutationQueue.length,b.resolve()}ni(t,e){return this.ei(t)}ei(t){return this.mutationQueue.length===0?0:t-this.mutationQueue[0].batchId}Xr(t){const e=this.ei(t);return e<0||e>=this.mutationQueue.length?null:this.mutationQueue[e]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sd{constructor(t){this.ri=t,this.docs=(function(){return new Vt(z.comparator)})(),this.size=0}setIndexManager(t){this.indexManager=t}addEntry(t,e){const r=e.key,s=this.docs.get(r),o=s?s.size:0,l=this.ri(e);return this.docs=this.docs.insert(r,{document:e.mutableCopy(),size:l}),this.size+=l-o,this.indexManager.addToCollectionParentIndex(t,r.path.popLast())}removeEntry(t){const e=this.docs.get(t);e&&(this.docs=this.docs.remove(t),this.size-=e.size)}getEntry(t,e){const r=this.docs.get(e);return b.resolve(r?r.document.mutableCopy():kt.newInvalidDocument(e))}getEntries(t,e){let r=cr();return e.forEach((s=>{const o=this.docs.get(s);r=r.insert(s,o?o.document.mutableCopy():kt.newInvalidDocument(s))})),b.resolve(r)}getDocumentsMatchingQuery(t,e,r,s){let o=cr();const l=e.path,c=new z(l.child("__id-9223372036854775808__")),d=this.docs.getIteratorFrom(c);for(;d.hasNext();){const{key:g,value:{document:E}}=d.getNext();if(!l.isPrefixOf(g.path))break;g.path.length>l.length+1||Lh(Mh(E),r)<=0||(s.has(E.key)||Wi(e,E))&&(o=o.insert(E.key,E.mutableCopy()))}return b.resolve(o)}getAllFromCollectionGroup(t,e,r,s){q(9500)}ii(t,e){return b.forEach(this.docs,(r=>e(r)))}newChangeBuffer(t){return new od(this)}getSize(t){return b.resolve(this.size)}}class od extends Yf{constructor(t){super(),this.Nr=t}applyChanges(t){const e=[];return this.changes.forEach(((r,s)=>{s.isValidDocument()?e.push(this.Nr.addEntry(t,s)):this.Nr.removeEntry(r)})),b.waitFor(e)}getFromCache(t,e){return this.Nr.getEntry(t,e)}getAllFromCache(t,e){return this.Nr.getEntries(t,e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ad{constructor(t){this.persistence=t,this.si=new ve((e=>Gi(e)),Ki),this.lastRemoteSnapshotVersion=nt.min(),this.highestTargetId=0,this.oi=0,this._i=new Ji,this.targetCount=0,this.ai=Me.ur()}forEachTarget(t,e){return this.si.forEach(((r,s)=>e(s))),b.resolve()}getLastRemoteSnapshotVersion(t){return b.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(t){return b.resolve(this.oi)}allocateTargetId(t){return this.highestTargetId=this.ai.next(),b.resolve(this.highestTargetId)}setTargetsMetadata(t,e,r){return r&&(this.lastRemoteSnapshotVersion=r),e>this.oi&&(this.oi=e),b.resolve()}Pr(t){this.si.set(t.target,t);const e=t.targetId;e>this.highestTargetId&&(this.ai=new Me(e),this.highestTargetId=e),t.sequenceNumber>this.oi&&(this.oi=t.sequenceNumber)}addTargetData(t,e){return this.Pr(e),this.targetCount+=1,b.resolve()}updateTargetData(t,e){return this.Pr(e),b.resolve()}removeTargetData(t,e){return this.si.delete(e.target),this._i.jr(e.targetId),this.targetCount-=1,b.resolve()}removeTargets(t,e,r){let s=0;const o=[];return this.si.forEach(((l,c)=>{c.sequenceNumber<=e&&r.get(c.targetId)===null&&(this.si.delete(l),o.push(this.removeMatchingKeysForTargetId(t,c.targetId)),s++)})),b.waitFor(o).next((()=>s))}getTargetCount(t){return b.resolve(this.targetCount)}getTargetData(t,e){const r=this.si.get(e)||null;return b.resolve(r)}addMatchingKeys(t,e,r){return this._i.Wr(e,r),b.resolve()}removeMatchingKeys(t,e,r){this._i.zr(e,r);const s=this.persistence.referenceDelegate,o=[];return s&&e.forEach((l=>{o.push(s.markPotentiallyOrphaned(t,l))})),b.waitFor(o)}removeMatchingKeysForTargetId(t,e){return this._i.jr(e),b.resolve()}getMatchingKeysForTargetId(t,e){const r=this._i.Hr(e);return b.resolve(r)}containsKey(t,e){return b.resolve(this._i.containsKey(e))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tl{constructor(t,e){this.ui={},this.overlays={},this.ci=new ji(0),this.li=!1,this.li=!0,this.hi=new rd,this.referenceDelegate=t(this),this.Pi=new ad(this),this.indexManager=new Hf,this.remoteDocumentCache=(function(s){return new sd(s)})((r=>this.referenceDelegate.Ti(r))),this.serializer=new qf(e),this.Ii=new ed(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.li=!1,Promise.resolve()}get started(){return this.li}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(t){return this.indexManager}getDocumentOverlayCache(t){let e=this.overlays[t.toKey()];return e||(e=new nd,this.overlays[t.toKey()]=e),e}getMutationQueue(t,e){let r=this.ui[t.toKey()];return r||(r=new id(e,this.referenceDelegate),this.ui[t.toKey()]=r),r}getGlobalsCache(){return this.hi}getTargetCache(){return this.Pi}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Ii}runTransaction(t,e,r){O("MemoryPersistence","Starting transaction:",t);const s=new ld(this.ci.next());return this.referenceDelegate.Ei(),r(s).next((o=>this.referenceDelegate.di(s).next((()=>o)))).toPromise().then((o=>(s.raiseOnCommittedEvent(),o)))}Ai(t,e){return b.or(Object.values(this.ui).map((r=>()=>r.containsKey(t,e))))}}class ld extends Uh{constructor(t){super(),this.currentSequenceNumber=t}}class Yi{constructor(t){this.persistence=t,this.Ri=new Ji,this.Vi=null}static mi(t){return new Yi(t)}get fi(){if(this.Vi)return this.Vi;throw q(60996)}addReference(t,e,r){return this.Ri.addReference(r,e),this.fi.delete(r.toString()),b.resolve()}removeReference(t,e,r){return this.Ri.removeReference(r,e),this.fi.add(r.toString()),b.resolve()}markPotentiallyOrphaned(t,e){return this.fi.add(e.toString()),b.resolve()}removeTarget(t,e){this.Ri.jr(e.targetId).forEach((s=>this.fi.add(s.toString())));const r=this.persistence.getTargetCache();return r.getMatchingKeysForTargetId(t,e.targetId).next((s=>{s.forEach((o=>this.fi.add(o.toString())))})).next((()=>r.removeTargetData(t,e)))}Ei(){this.Vi=new Set}di(t){const e=this.persistence.getRemoteDocumentCache().newChangeBuffer();return b.forEach(this.fi,(r=>{const s=z.fromPath(r);return this.gi(t,s).next((o=>{o||e.removeEntry(s,nt.min())}))})).next((()=>(this.Vi=null,e.apply(t))))}updateLimboDocument(t,e){return this.gi(t,e).next((r=>{r?this.fi.delete(e.toString()):this.fi.add(e.toString())}))}Ti(t){return 0}gi(t,e){return b.or([()=>b.resolve(this.Ri.containsKey(e)),()=>this.persistence.getTargetCache().containsKey(t,e),()=>this.persistence.Ai(t,e)])}}class fr{constructor(t,e){this.persistence=t,this.pi=new ve((r=>zh(r.path)),((r,s)=>r.isEqual(s))),this.garbageCollector=Jf(this,e)}static mi(t,e){return new fr(t,e)}Ei(){}di(t){return b.resolve()}forEachTarget(t,e){return this.persistence.getTargetCache().forEachTarget(t,e)}gr(t){const e=this.wr(t);return this.persistence.getTargetCache().getTargetCount(t).next((r=>e.next((s=>r+s))))}wr(t){let e=0;return this.pr(t,(r=>{e++})).next((()=>e))}pr(t,e){return b.forEach(this.pi,((r,s)=>this.br(t,r,s).next((o=>o?b.resolve():e(s)))))}removeTargets(t,e,r){return this.persistence.getTargetCache().removeTargets(t,e,r)}removeOrphanedDocuments(t,e){let r=0;const s=this.persistence.getRemoteDocumentCache(),o=s.newChangeBuffer();return s.ii(t,(l=>this.br(t,l,e).next((c=>{c||(r++,o.removeEntry(l,nt.min()))})))).next((()=>o.apply(t))).next((()=>r))}markPotentiallyOrphaned(t,e){return this.pi.set(e,t.currentSequenceNumber),b.resolve()}removeTarget(t,e){const r=e.withSequenceNumber(t.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(t,r)}addReference(t,e,r){return this.pi.set(r,t.currentSequenceNumber),b.resolve()}removeReference(t,e,r){return this.pi.set(r,t.currentSequenceNumber),b.resolve()}updateLimboDocument(t,e){return this.pi.set(e,t.currentSequenceNumber),b.resolve()}Ti(t){let e=t.key.toString().length;return t.isFoundDocument()&&(e+=Xn(t.data.value)),e}br(t,e,r){return b.or([()=>this.persistence.Ai(t,e),()=>this.persistence.getTargetCache().containsKey(t,e),()=>{const s=this.pi.get(e);return b.resolve(s!==void 0&&s>r)}])}getCacheSize(t){return this.persistence.getRemoteDocumentCache().getSize(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zi{constructor(t,e,r,s){this.targetId=t,this.fromCache=e,this.Es=r,this.ds=s}static As(t,e){let r=St(),s=St();for(const o of e.docChanges)switch(o.type){case 0:r=r.add(o.doc.key);break;case 1:s=s.add(o.doc.key)}return new Zi(t,e.fromCache,r,s)}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ud{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(t){this._documentReadCount+=t}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cd{constructor(){this.Rs=!1,this.Vs=!1,this.fs=100,this.gs=(function(){return oc()?8:jh(ic())>0?6:4})()}initialize(t,e){this.ps=t,this.indexManager=e,this.Rs=!0}getDocumentsMatchingQuery(t,e,r,s){const o={result:null};return this.ys(t,e).next((l=>{o.result=l})).next((()=>{if(!o.result)return this.ws(t,e,s,r).next((l=>{o.result=l}))})).next((()=>{if(o.result)return;const l=new ud;return this.Ss(t,e,l).next((c=>{if(o.result=c,this.Vs)return this.bs(t,e,l,c.size)}))})).next((()=>o.result))}bs(t,e,r,s){return r.documentReadCount<this.fs?(Re()<=W.DEBUG&&O("QueryEngine","SDK will not create cache indexes for query:",tn(e),"since it only creates cache indexes for collection contains","more than or equal to",this.fs,"documents"),b.resolve()):(Re()<=W.DEBUG&&O("QueryEngine","Query:",tn(e),"scans",r.documentReadCount,"local documents and returns",s,"documents as results."),r.documentReadCount>this.gs*s?(Re()<=W.DEBUG&&O("QueryEngine","The SDK decides to create cache indexes for query:",tn(e),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(t,pe(e))):b.resolve())}ys(t,e){if(Qo(e))return b.resolve(null);let r=pe(e);return this.indexManager.getIndexType(t,r).next((s=>s===0?null:(e.limit!==null&&s===1&&(e=bi(e,null,"F"),r=pe(e)),this.indexManager.getDocumentsMatchingTarget(t,r).next((o=>{const l=St(...o);return this.ps.getDocuments(t,l).next((c=>this.indexManager.getMinOffset(t,r).next((d=>{const g=this.Ds(e,c);return this.Cs(e,g,l,d.readTime)?this.ys(t,bi(e,null,"F")):this.vs(t,g,e,d)}))))})))))}ws(t,e,r,s){return Qo(e)||s.isEqual(nt.min())?b.resolve(null):this.ps.getDocuments(t,r).next((o=>{const l=this.Ds(e,o);return this.Cs(e,l,r,s)?b.resolve(null):(Re()<=W.DEBUG&&O("QueryEngine","Re-using previous result from %s to execute query: %s",s.toString(),tn(e)),this.vs(t,l,e,Oh(s,dn)).next((c=>c)))}))}Ds(t,e){let r=new yt(hf(t));return e.forEach(((s,o)=>{Wi(t,o)&&(r=r.add(o))})),r}Cs(t,e,r,s){if(t.limit===null)return!1;if(r.size!==e.size)return!0;const o=t.limitType==="F"?e.last():e.first();return!!o&&(o.hasPendingWrites||o.version.compareTo(s)>0)}Ss(t,e,r){return Re()<=W.DEBUG&&O("QueryEngine","Using full collection scan to execute query:",tn(e)),this.ps.getDocumentsMatchingQuery(t,e,ee.min(),r)}vs(t,e,r,s){return this.ps.getDocumentsMatchingQuery(t,r,s).next((o=>(e.forEach((l=>{o=o.insert(l.key,l)})),o)))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hd="LocalStore";class fd{constructor(t,e,r,s){this.persistence=t,this.Fs=e,this.serializer=s,this.Ms=new Vt(J),this.xs=new ve((o=>Gi(o)),Ki),this.Os=new Map,this.Ns=t.getRemoteDocumentCache(),this.Pi=t.getTargetCache(),this.Ii=t.getBundleCache(),this.Bs(r)}Bs(t){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(t),this.indexManager=this.persistence.getIndexManager(t),this.mutationQueue=this.persistence.getMutationQueue(t,this.indexManager),this.localDocuments=new td(this.Ns,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.Ns.setIndexManager(this.indexManager),this.Fs.initialize(this.localDocuments,this.indexManager)}collectGarbage(t){return this.persistence.runTransaction("Collect garbage","readwrite-primary",(e=>t.collect(e,this.Ms)))}}function dd(n,t,e,r){return new fd(n,t,e,r)}async function Il(n,t){const e=tt(n);return await e.persistence.runTransaction("Handle user change","readonly",(r=>{let s;return e.mutationQueue.getAllMutationBatches(r).next((o=>(s=o,e.Bs(t),e.mutationQueue.getAllMutationBatches(r)))).next((o=>{const l=[],c=[];let d=St();for(const g of s){l.push(g.batchId);for(const E of g.mutations)d=d.add(E.key)}for(const g of o){c.push(g.batchId);for(const E of g.mutations)d=d.add(E.key)}return e.localDocuments.getDocuments(r,d).next((g=>({Ls:g,removedBatchIds:l,addedBatchIds:c})))}))}))}function pd(n,t){const e=tt(n);return e.persistence.runTransaction("Acknowledge batch","readwrite-primary",(r=>{const s=t.batch.keys(),o=e.Ns.newChangeBuffer({trackRemovals:!0});return(function(c,d,g,E){const w=g.batch,T=w.keys();let C=b.resolve();return T.forEach((D=>{C=C.next((()=>E.getEntry(d,D))).next((M=>{const N=g.docVersions.get(D);ot(N!==null,48541),M.version.compareTo(N)<0&&(w.applyToRemoteDocument(M,g),M.isValidDocument()&&(M.setReadTime(g.commitVersion),E.addEntry(M)))}))})),C.next((()=>c.mutationQueue.removeMutationBatch(d,w)))})(e,r,t,o).next((()=>o.apply(r))).next((()=>e.mutationQueue.performConsistencyCheck(r))).next((()=>e.documentOverlayCache.removeOverlaysForBatchId(r,s,t.batch.batchId))).next((()=>e.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(r,(function(c){let d=St();for(let g=0;g<c.mutationResults.length;++g)c.mutationResults[g].transformResults.length>0&&(d=d.add(c.batch.mutations[g].key));return d})(t)))).next((()=>e.localDocuments.getDocuments(r,s)))}))}function md(n){const t=tt(n);return t.persistence.runTransaction("Get last remote snapshot version","readonly",(e=>t.Pi.getLastRemoteSnapshotVersion(e)))}function gd(n,t){const e=tt(n);return e.persistence.runTransaction("Get next mutation batch","readonly",(r=>(t===void 0&&(t=Bi),e.mutationQueue.getNextMutationBatchAfterBatchId(r,t))))}class ia{constructor(){this.activeTargetIds=_f()}zs(t){this.activeTargetIds=this.activeTargetIds.add(t)}js(t){this.activeTargetIds=this.activeTargetIds.delete(t)}Gs(){const t={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(t)}}class _d{constructor(){this.Mo=new ia,this.xo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(t){}updateMutationState(t,e,r){}addLocalQueryTarget(t,e=!0){return e&&this.Mo.zs(t),this.xo[t]||"not-current"}updateQueryState(t,e,r){this.xo[t]=e}removeLocalQueryTarget(t){this.Mo.js(t)}isLocalQueryTarget(t){return this.Mo.activeTargetIds.has(t)}clearQueryState(t){delete this.xo[t]}getAllActiveQueryTargets(){return this.Mo.activeTargetIds}isActiveQueryTarget(t){return this.Mo.activeTargetIds.has(t)}start(){return this.Mo=new ia,Promise.resolve()}handleUserChange(t,e,r){}setOnlineState(t){}shutdown(){}writeSequenceNumber(t){}notifyBundleLoaded(t){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yd{Oo(t){}shutdown(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sa="ConnectivityMonitor";class oa{constructor(){this.No=()=>this.Bo(),this.Lo=()=>this.ko(),this.qo=[],this.Qo()}Oo(t){this.qo.push(t)}shutdown(){window.removeEventListener("online",this.No),window.removeEventListener("offline",this.Lo)}Qo(){window.addEventListener("online",this.No),window.addEventListener("offline",this.Lo)}Bo(){O(sa,"Network connectivity changed: AVAILABLE");for(const t of this.qo)t(0)}ko(){O(sa,"Network connectivity changed: UNAVAILABLE");for(const t of this.qo)t(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Gn=null;function Vi(){return Gn===null?Gn=(function(){return 268435456+Math.round(2147483648*Math.random())})():Gn++,"0x"+Gn.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fi="RestConnection",vd={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};class Ed{get $o(){return!1}constructor(t){this.databaseInfo=t,this.databaseId=t.databaseId;const e=t.ssl?"https":"http",r=encodeURIComponent(this.databaseId.projectId),s=encodeURIComponent(this.databaseId.database);this.Uo=e+"://"+t.host,this.Ko=`projects/${r}/databases/${s}`,this.Wo=this.databaseId.database===or?`project_id=${r}`:`project_id=${r}&database_id=${s}`}Go(t,e,r,s,o){const l=Vi(),c=this.zo(t,e.toUriEncodedString());O(fi,`Sending RPC '${t}' ${l}:`,c,r);const d={"google-cloud-resource-prefix":this.Ko,"x-goog-request-params":this.Wo};this.jo(d,s,o);const{host:g}=new URL(c),E=xi(g);return this.Jo(t,c,d,r,E).then((w=>(O(fi,`Received RPC '${t}' ${l}: `,w),w)),(w=>{throw mr(fi,`RPC '${t}' ${l} failed with error: `,w,"url: ",c,"request:",r),w}))}Ho(t,e,r,s,o,l){return this.Go(t,e,r,s,o)}jo(t,e,r){t["X-Goog-Api-Client"]=(function(){return"gl-js/ fire/"+Ue})(),t["Content-Type"]="text/plain",this.databaseInfo.appId&&(t["X-Firebase-GMPID"]=this.databaseInfo.appId),e&&e.headers.forEach(((s,o)=>t[o]=s)),r&&r.headers.forEach(((s,o)=>t[o]=s))}zo(t,e){const r=vd[t];return`${this.Uo}/v1/${e}:${r}`}terminate(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Td{constructor(t){this.Yo=t.Yo,this.Zo=t.Zo}Xo(t){this.e_=t}t_(t){this.n_=t}r_(t){this.i_=t}onMessage(t){this.s_=t}close(){this.Zo()}send(t){this.Yo(t)}o_(){this.e_()}__(){this.n_()}a_(t){this.i_(t)}u_(t){this.s_(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wt="WebChannelConnection";class Id extends Ed{constructor(t){super(t),this.c_=[],this.forceLongPolling=t.forceLongPolling,this.autoDetectLongPolling=t.autoDetectLongPolling,this.useFetchStreams=t.useFetchStreams,this.longPollingOptions=t.longPollingOptions}Jo(t,e,r,s,o){const l=Vi();return new Promise(((c,d)=>{const g=new ka;g.setWithCredentials(!0),g.listenOnce(Oa.COMPLETE,(()=>{try{switch(g.getLastErrorCode()){case Qn.NO_ERROR:const w=g.getResponseJson();O(wt,`XHR for RPC '${t}' ${l} received:`,JSON.stringify(w)),c(w);break;case Qn.TIMEOUT:O(wt,`RPC '${t}' ${l} timed out`),d(new F(R.DEADLINE_EXCEEDED,"Request time out"));break;case Qn.HTTP_ERROR:const T=g.getStatus();if(O(wt,`RPC '${t}' ${l} failed with status:`,T,"response text:",g.getResponseText()),T>0){let C=g.getResponseJson();Array.isArray(C)&&(C=C[0]);const D=C?.error;if(D&&D.status&&D.message){const M=(function(j){const $=j.toLowerCase().replace(/_/g,"-");return Object.values(R).indexOf($)>=0?$:R.UNKNOWN})(D.status);d(new F(M,D.message))}else d(new F(R.UNKNOWN,"Server responded with status "+g.getStatus()))}else d(new F(R.UNAVAILABLE,"Connection failed."));break;default:q(9055,{l_:t,streamId:l,h_:g.getLastErrorCode(),P_:g.getLastError()})}}finally{O(wt,`RPC '${t}' ${l} completed.`)}}));const E=JSON.stringify(s);O(wt,`RPC '${t}' ${l} sending request:`,s),g.send(e,"POST",E,r,15)}))}T_(t,e,r){const s=Vi(),o=[this.Uo,"/","google.firestore.v1.Firestore","/",t,"/channel"],l=Fa(),c=La(),d={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},g=this.longPollingOptions.timeoutSeconds;g!==void 0&&(d.longPollingTimeout=Math.round(1e3*g)),this.useFetchStreams&&(d.useFetchStreams=!0),this.jo(d.initMessageHeaders,e,r),d.encodeInitMessageHeaders=!0;const E=o.join("");O(wt,`Creating RPC '${t}' stream ${s}: ${E}`,d);const w=l.createWebChannel(E,d);this.I_(w);let T=!1,C=!1;const D=new Td({Yo:N=>{C?O(wt,`Not sending because RPC '${t}' stream ${s} is closed:`,N):(T||(O(wt,`Opening RPC '${t}' stream ${s} transport.`),w.open(),T=!0),O(wt,`RPC '${t}' stream ${s} sending:`,N),w.send(N))},Zo:()=>w.close()}),M=(N,j,$)=>{N.listen(j,(H=>{try{$(H)}catch(P){setTimeout((()=>{throw P}),0)}}))};return M(w,en.EventType.OPEN,(()=>{C||(O(wt,`RPC '${t}' stream ${s} transport opened.`),D.o_())})),M(w,en.EventType.CLOSE,(()=>{C||(C=!0,O(wt,`RPC '${t}' stream ${s} transport closed`),D.a_(),this.E_(w))})),M(w,en.EventType.ERROR,(N=>{C||(C=!0,mr(wt,`RPC '${t}' stream ${s} transport errored. Name:`,N.name,"Message:",N.message),D.a_(new F(R.UNAVAILABLE,"The operation could not be completed")))})),M(w,en.EventType.MESSAGE,(N=>{if(!C){const j=N.data[0];ot(!!j,16349);const $=j,H=$?.error||$[0]?.error;if(H){O(wt,`RPC '${t}' stream ${s} received error:`,H);const P=H.status;let U=(function(_){const v=lt[_];if(v!==void 0)return Vf(v)})(P),G=H.message;U===void 0&&(U=R.INTERNAL,G="Unknown error status: "+P+" with message "+H.message),C=!0,D.a_(new F(U,G)),w.close()}else O(wt,`RPC '${t}' stream ${s} received:`,j),D.u_(j)}})),M(c,Ma.STAT_EVENT,(N=>{N.stat===Ei.PROXY?O(wt,`RPC '${t}' stream ${s} detected buffering proxy`):N.stat===Ei.NOPROXY&&O(wt,`RPC '${t}' stream ${s} detected no buffering proxy`)})),setTimeout((()=>{D.__()}),0),D}terminate(){this.c_.forEach((t=>t.close())),this.c_=[]}I_(t){this.c_.push(t)}E_(t){this.c_=this.c_.filter((e=>e===t))}}function di(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vr(n){return new Df(n,!0)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wl{constructor(t,e,r=1e3,s=1.5,o=6e4){this.Mi=t,this.timerId=e,this.d_=r,this.A_=s,this.R_=o,this.V_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.V_=0}g_(){this.V_=this.R_}p_(t){this.cancel();const e=Math.floor(this.V_+this.y_()),r=Math.max(0,Date.now()-this.f_),s=Math.max(0,e-r);s>0&&O("ExponentialBackoff",`Backing off for ${s} ms (base delay: ${this.V_} ms, delay with jitter: ${e} ms, last attempt: ${r} ms ago)`),this.m_=this.Mi.enqueueAfterDelay(this.timerId,s,(()=>(this.f_=Date.now(),t()))),this.V_*=this.A_,this.V_<this.d_&&(this.V_=this.d_),this.V_>this.R_&&(this.V_=this.R_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.V_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const aa="PersistentStream";class wd{constructor(t,e,r,s,o,l,c,d){this.Mi=t,this.S_=r,this.b_=s,this.connection=o,this.authCredentialsProvider=l,this.appCheckCredentialsProvider=c,this.listener=d,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new wl(t,e)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Mi.enqueueAfterDelay(this.S_,6e4,(()=>this.k_())))}q_(t){this.Q_(),this.stream.send(t)}async k_(){if(this.O_())return this.close(0)}Q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(t,e){this.Q_(),this.U_(),this.M_.cancel(),this.D_++,t!==4?this.M_.reset():e&&e.code===R.RESOURCE_EXHAUSTED?(ge(e.toString()),ge("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):e&&e.code===R.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.K_(),this.stream.close(),this.stream=null),this.state=t,await this.listener.r_(e)}K_(){}auth(){this.state=1;const t=this.W_(this.D_),e=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then((([r,s])=>{this.D_===e&&this.G_(r,s)}),(r=>{t((()=>{const s=new F(R.UNKNOWN,"Fetching auth token failed: "+r.message);return this.z_(s)}))}))}G_(t,e){const r=this.W_(this.D_);this.stream=this.j_(t,e),this.stream.Xo((()=>{r((()=>this.listener.Xo()))})),this.stream.t_((()=>{r((()=>(this.state=2,this.v_=this.Mi.enqueueAfterDelay(this.b_,1e4,(()=>(this.O_()&&(this.state=3),Promise.resolve()))),this.listener.t_())))})),this.stream.r_((s=>{r((()=>this.z_(s)))})),this.stream.onMessage((s=>{r((()=>++this.F_==1?this.J_(s):this.onNext(s)))}))}N_(){this.state=5,this.M_.p_((async()=>{this.state=0,this.start()}))}z_(t){return O(aa,`close with error: ${t}`),this.stream=null,this.close(4,t)}W_(t){return e=>{this.Mi.enqueueAndForget((()=>this.D_===t?e():(O(aa,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve())))}}}class Ad extends wd{constructor(t,e,r,s,o,l){super(t,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",e,r,s,l),this.serializer=o}get X_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}K_(){this.X_&&this.ea([])}j_(t,e){return this.connection.T_("Write",t,e)}J_(t){return ot(!!t.streamToken,31322),this.lastStreamToken=t.streamToken,ot(!t.writeResults||t.writeResults.length===0,55816),this.listener.ta()}onNext(t){ot(!!t.streamToken,12678),this.lastStreamToken=t.streamToken,this.M_.reset();const e=Uf(t.writeResults,t.commitTime),r=Ve(t.commitTime);return this.listener.na(r,e)}ra(){const t={};t.database=Mf(this.serializer),this.q_(t)}ea(t){const e={streamToken:this.lastStreamToken,writes:t.map((r=>Ff(this.serializer,r)))};this.q_(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sd{}class bd extends Sd{constructor(t,e,r,s){super(),this.authCredentials=t,this.appCheckCredentials=e,this.connection=r,this.serializer=s,this.ia=!1}sa(){if(this.ia)throw new F(R.FAILED_PRECONDITION,"The client has already been terminated.")}Go(t,e,r,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([o,l])=>this.connection.Go(t,Ci(e,r),s,o,l))).catch((o=>{throw o.name==="FirebaseError"?(o.code===R.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new F(R.UNKNOWN,o.toString())}))}Ho(t,e,r,s,o){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([l,c])=>this.connection.Ho(t,Ci(e,r),s,l,c,o))).catch((l=>{throw l.name==="FirebaseError"?(l.code===R.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),l):new F(R.UNKNOWN,l.toString())}))}terminate(){this.ia=!0,this.connection.terminate()}}class Rd{constructor(t,e){this.asyncQueue=t,this.onlineStateHandler=e,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,(()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve()))))}ha(t){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${t.toString()}`),this.ca("Offline")))}set(t){this.Pa(),this.oa=0,t==="Online"&&(this.aa=!1),this.ca(t)}ca(t){t!==this.state&&(this.state=t,this.onlineStateHandler(t))}la(t){const e=`Could not reach Cloud Firestore backend. ${t}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.aa?(ge(e),this.aa=!1):O("OnlineStateTracker",e)}Pa(){this._a!==null&&(this._a.cancel(),this._a=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Tn="RemoteStore";class Cd{constructor(t,e,r,s,o){this.localStore=t,this.datastore=e,this.asyncQueue=r,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Set,this.da=[],this.Aa=o,this.Aa.Oo((l=>{r.enqueueAndForget((async()=>{wn(this)&&(O(Tn,"Restarting streams for network reachability change."),await(async function(d){const g=tt(d);g.Ea.add(4),await In(g),g.Ra.set("Unknown"),g.Ea.delete(4),await Er(g)})(this))}))})),this.Ra=new Rd(r,s)}}async function Er(n){if(wn(n))for(const t of n.da)await t(!0)}async function In(n){for(const t of n.da)await t(!1)}function wn(n){return tt(n).Ea.size===0}async function Al(n,t,e){if(!vn(t))throw t;n.Ea.add(1),await In(n),n.Ra.set("Offline"),e||(e=()=>md(n.localStore)),n.asyncQueue.enqueueRetryable((async()=>{O(Tn,"Retrying IndexedDB access"),await e(),n.Ea.delete(1),await Er(n)}))}function Sl(n,t){return t().catch((e=>Al(n,e,t)))}async function Tr(n){const t=tt(n),e=re(t);let r=t.Ta.length>0?t.Ta[t.Ta.length-1].batchId:Bi;for(;Pd(t);)try{const s=await gd(t.localStore,r);if(s===null){t.Ta.length===0&&e.L_();break}r=s.batchId,Vd(t,s)}catch(s){await Al(t,s)}bl(t)&&Rl(t)}function Pd(n){return wn(n)&&n.Ta.length<10}function Vd(n,t){n.Ta.push(t);const e=re(n);e.O_()&&e.X_&&e.ea(t.mutations)}function bl(n){return wn(n)&&!re(n).x_()&&n.Ta.length>0}function Rl(n){re(n).start()}async function Dd(n){re(n).ra()}async function Nd(n){const t=re(n);for(const e of n.Ta)t.ea(e.mutations)}async function xd(n,t,e){const r=n.Ta.shift(),s=Xi.from(r,t,e);await Sl(n,(()=>n.remoteSyncer.applySuccessfulWrite(s))),await Tr(n)}async function kd(n,t){t&&re(n).X_&&await(async function(r,s){if((function(l){return Pf(l)&&l!==R.ABORTED})(s.code)){const o=r.Ta.shift();re(r).B_(),await Sl(r,(()=>r.remoteSyncer.rejectFailedWrite(o.batchId,s))),await Tr(r)}})(n,t),bl(n)&&Rl(n)}async function la(n,t){const e=tt(n);e.asyncQueue.verifyOperationInProgress(),O(Tn,"RemoteStore received new credentials");const r=wn(e);e.Ea.add(3),await In(e),r&&e.Ra.set("Unknown"),await e.remoteSyncer.handleCredentialChange(t),e.Ea.delete(3),await Er(e)}async function Od(n,t){const e=tt(n);t?(e.Ea.delete(2),await Er(e)):t||(e.Ea.add(2),await In(e),e.Ra.set("Unknown"))}function re(n){return n.fa||(n.fa=(function(e,r,s){const o=tt(e);return o.sa(),new Ad(r,o.connection,o.authCredentials,o.appCheckCredentials,o.serializer,s)})(n.datastore,n.asyncQueue,{Xo:()=>Promise.resolve(),t_:Dd.bind(null,n),r_:kd.bind(null,n),ta:Nd.bind(null,n),na:xd.bind(null,n)}),n.da.push((async t=>{t?(n.fa.B_(),await Tr(n)):(await n.fa.stop(),n.Ta.length>0&&(O(Tn,`Stopping write stream with ${n.Ta.length} pending writes`),n.Ta=[]))}))),n.fa}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ts{constructor(t,e,r,s,o){this.asyncQueue=t,this.timerId=e,this.targetTimeMs=r,this.op=s,this.removalCallback=o,this.deferred=new de,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch((l=>{}))}get promise(){return this.deferred.promise}static createAndSchedule(t,e,r,s,o){const l=Date.now()+r,c=new ts(t,e,l,s,o);return c.start(r),c}start(t){this.timerHandle=setTimeout((()=>this.handleDelayElapsed()),t)}skipDelay(){return this.handleDelayElapsed()}cancel(t){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new F(R.CANCELLED,"Operation cancelled"+(t?": "+t:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget((()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then((t=>this.deferred.resolve(t)))):Promise.resolve()))}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Cl(n,t){if(ge("AsyncQueue",`${t}: ${n}`),vn(n))return new F(R.UNAVAILABLE,`${t}: ${n}`);throw n}class Md{constructor(){this.queries=ua(),this.onlineState="Unknown",this.Ca=new Set}terminate(){(function(e,r){const s=tt(e),o=s.queries;s.queries=ua(),o.forEach(((l,c)=>{for(const d of c.Sa)d.onError(r)}))})(this,new F(R.ABORTED,"Firestore shutting down"))}}function ua(){return new ve((n=>ol(n)),sl)}function Ld(n){n.Ca.forEach((t=>{t.next()}))}var ca,ha;(ha=ca||(ca={})).Ma="default",ha.Cache="cache";const Fd="SyncEngine";class Ud{constructor(t,e,r,s,o,l){this.localStore=t,this.remoteStore=e,this.eventManager=r,this.sharedClientState=s,this.currentUser=o,this.maxConcurrentLimboResolutions=l,this.Pu={},this.Tu=new ve((c=>ol(c)),sl),this.Iu=new Map,this.Eu=new Set,this.du=new Vt(z.comparator),this.Au=new Map,this.Ru=new Ji,this.Vu={},this.mu=new Map,this.fu=Me.cr(),this.onlineState="Unknown",this.gu=void 0}get isPrimaryClient(){return this.gu===!0}}async function jd(n,t,e){const r=$d(n);try{const s=await(function(l,c){const d=tt(l),g=rt.now(),E=c.reduce(((C,D)=>C.add(D.key)),St());let w,T;return d.persistence.runTransaction("Locally write mutations","readwrite",(C=>{let D=cr(),M=St();return d.Ns.getEntries(C,E).next((N=>{D=N,D.forEach(((j,$)=>{$.isValidDocument()||(M=M.add(j))}))})).next((()=>d.localDocuments.getOverlayedDocuments(C,D))).next((N=>{w=N;const j=[];for(const $ of c){const H=Sf($,w.get($.key).overlayedDocument);H!=null&&j.push(new Ee($.key,H,Ya(H.value.mapValue),Ht.exists(!0)))}return d.mutationQueue.addMutationBatch(C,g,j,c)})).next((N=>{T=N;const j=N.applyToLocalDocumentSet(w,M);return d.documentOverlayCache.saveOverlays(C,N.batchId,j)}))})).then((()=>({batchId:T.batchId,changes:ll(w)})))})(r.localStore,t);r.sharedClientState.addPendingMutation(s.batchId),(function(l,c,d){let g=l.Vu[l.currentUser.toKey()];g||(g=new Vt(J)),g=g.insert(c,d),l.Vu[l.currentUser.toKey()]=g})(r,s.batchId,e),await Ir(r,s.changes),await Tr(r.remoteStore)}catch(s){const o=Cl(s,"Failed to persist write");e.reject(o)}}function fa(n,t,e){const r=tt(n);if(r.isPrimaryClient&&e===0||!r.isPrimaryClient&&e===1){const s=[];r.Tu.forEach(((o,l)=>{const c=l.view.va(t);c.snapshot&&s.push(c.snapshot)})),(function(l,c){const d=tt(l);d.onlineState=c;let g=!1;d.queries.forEach(((E,w)=>{for(const T of w.Sa)T.va(c)&&(g=!0)})),g&&Ld(d)})(r.eventManager,t),s.length&&r.Pu.H_(s),r.onlineState=t,r.isPrimaryClient&&r.sharedClientState.setOnlineState(t)}}async function Bd(n,t){const e=tt(n),r=t.batch.batchId;try{const s=await pd(e.localStore,t);Vl(e,r,null),Pl(e,r),e.sharedClientState.updateMutationState(r,"acknowledged"),await Ir(e,s)}catch(s){await Ui(s)}}async function zd(n,t,e){const r=tt(n);try{const s=await(function(l,c){const d=tt(l);return d.persistence.runTransaction("Reject batch","readwrite-primary",(g=>{let E;return d.mutationQueue.lookupMutationBatch(g,c).next((w=>(ot(w!==null,37113),E=w.keys(),d.mutationQueue.removeMutationBatch(g,w)))).next((()=>d.mutationQueue.performConsistencyCheck(g))).next((()=>d.documentOverlayCache.removeOverlaysForBatchId(g,E,c))).next((()=>d.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(g,E))).next((()=>d.localDocuments.getDocuments(g,E)))}))})(r.localStore,t);Vl(r,t,e),Pl(r,t),r.sharedClientState.updateMutationState(t,"rejected",e),await Ir(r,s)}catch(s){await Ui(s)}}function Pl(n,t){(n.mu.get(t)||[]).forEach((e=>{e.resolve()})),n.mu.delete(t)}function Vl(n,t,e){const r=tt(n);let s=r.Vu[r.currentUser.toKey()];if(s){const o=s.get(t);o&&(e?o.reject(e):o.resolve(),s=s.remove(t)),r.Vu[r.currentUser.toKey()]=s}}async function Ir(n,t,e){const r=tt(n),s=[],o=[],l=[];r.Tu.isEmpty()||(r.Tu.forEach(((c,d)=>{l.push(r.pu(d,t,e).then((g=>{if((g||e)&&r.isPrimaryClient){const E=g?!g.fromCache:e?.targetChanges.get(d.targetId)?.current;r.sharedClientState.updateQueryState(d.targetId,E?"current":"not-current")}if(g){s.push(g);const E=Zi.As(d.targetId,g);o.push(E)}})))})),await Promise.all(l),r.Pu.H_(s),await(async function(d,g){const E=tt(d);try{await E.persistence.runTransaction("notifyLocalViewChanges","readwrite",(w=>b.forEach(g,(T=>b.forEach(T.Es,(C=>E.persistence.referenceDelegate.addReference(w,T.targetId,C))).next((()=>b.forEach(T.ds,(C=>E.persistence.referenceDelegate.removeReference(w,T.targetId,C)))))))))}catch(w){if(!vn(w))throw w;O(hd,"Failed to update sequence numbers: "+w)}for(const w of g){const T=w.targetId;if(!w.fromCache){const C=E.Ms.get(T),D=C.snapshotVersion,M=C.withLastLimboFreeSnapshotVersion(D);E.Ms=E.Ms.insert(T,M)}}})(r.localStore,o))}async function qd(n,t){const e=tt(n);if(!e.currentUser.isEqual(t)){O(Fd,"User change. New user:",t.toKey());const r=await Il(e.localStore,t);e.currentUser=t,(function(o,l){o.mu.forEach((c=>{c.forEach((d=>{d.reject(new F(R.CANCELLED,l))}))})),o.mu.clear()})(e,"'waitForPendingWrites' promise is rejected due to a user change."),e.sharedClientState.handleUserChange(t,r.removedBatchIds,r.addedBatchIds),await Ir(e,r.Ls)}}function $d(n){const t=tt(n);return t.remoteStore.remoteSyncer.applySuccessfulWrite=Bd.bind(null,t),t.remoteStore.remoteSyncer.rejectFailedWrite=zd.bind(null,t),t}class dr{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(t){this.serializer=vr(t.databaseInfo.databaseId),this.sharedClientState=this.Du(t),this.persistence=this.Cu(t),await this.persistence.start(),this.localStore=this.vu(t),this.gcScheduler=this.Fu(t,this.localStore),this.indexBackfillerScheduler=this.Mu(t,this.localStore)}Fu(t,e){return null}Mu(t,e){return null}vu(t){return dd(this.persistence,new cd,t.initialUser,this.serializer)}Cu(t){return new Tl(Yi.mi,this.serializer)}Du(t){return new _d}async terminate(){this.gcScheduler?.stop(),this.indexBackfillerScheduler?.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}dr.provider={build:()=>new dr};class Hd extends dr{constructor(t){super(),this.cacheSizeBytes=t}Fu(t,e){ot(this.persistence.referenceDelegate instanceof fr,46915);const r=this.persistence.referenceDelegate.garbageCollector;return new Qf(r,t.asyncQueue,e)}Cu(t){const e=this.cacheSizeBytes!==void 0?Pt.withCacheSize(this.cacheSizeBytes):Pt.DEFAULT;return new Tl((r=>fr.mi(r,e)),this.serializer)}}class Di{async initialize(t,e){this.localStore||(this.localStore=t.localStore,this.sharedClientState=t.sharedClientState,this.datastore=this.createDatastore(e),this.remoteStore=this.createRemoteStore(e),this.eventManager=this.createEventManager(e),this.syncEngine=this.createSyncEngine(e,!t.synchronizeTabs),this.sharedClientState.onlineStateHandler=r=>fa(this.syncEngine,r,1),this.remoteStore.remoteSyncer.handleCredentialChange=qd.bind(null,this.syncEngine),await Od(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(t){return(function(){return new Md})()}createDatastore(t){const e=vr(t.databaseInfo.databaseId),r=(function(o){return new Id(o)})(t.databaseInfo);return(function(o,l,c,d){return new bd(o,l,c,d)})(t.authCredentials,t.appCheckCredentials,r,e)}createRemoteStore(t){return(function(r,s,o,l,c){return new Cd(r,s,o,l,c)})(this.localStore,this.datastore,t.asyncQueue,(e=>fa(this.syncEngine,e,0)),(function(){return oa.v()?new oa:new yd})())}createSyncEngine(t,e){return(function(s,o,l,c,d,g,E){const w=new Ud(s,o,l,c,d,g);return E&&(w.gu=!0),w})(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,t.initialUser,t.maxConcurrentLimboResolutions,e)}async terminate(){await(async function(e){const r=tt(e);O(Tn,"RemoteStore shutting down."),r.Ea.add(5),await In(r),r.Aa.shutdown(),r.Ra.set("Unknown")})(this.remoteStore),this.datastore?.terminate(),this.eventManager?.terminate()}}Di.provider={build:()=>new Di};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ie="FirestoreClient";class Gd{constructor(t,e,r,s,o){this.authCredentials=t,this.appCheckCredentials=e,this.asyncQueue=r,this.databaseInfo=s,this.user=At.UNAUTHENTICATED,this.clientId=Li.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=o,this.authCredentials.start(r,(async l=>{O(ie,"Received user=",l.uid),await this.authCredentialListener(l),this.user=l})),this.appCheckCredentials.start(r,(l=>(O(ie,"Received new app check token=",l),this.appCheckCredentialListener(l,this.user))))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(t){this.authCredentialListener=t}setAppCheckTokenChangeListener(t){this.appCheckCredentialListener=t}terminate(){this.asyncQueue.enterRestrictedMode();const t=new de;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted((async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),t.resolve()}catch(e){const r=Cl(e,"Failed to shutdown persistence");t.reject(r)}})),t.promise}}async function pi(n,t){n.asyncQueue.verifyOperationInProgress(),O(ie,"Initializing OfflineComponentProvider");const e=n.configuration;await t.initialize(e);let r=e.initialUser;n.setCredentialChangeListener((async s=>{r.isEqual(s)||(await Il(t.localStore,s),r=s)})),t.persistence.setDatabaseDeletedListener((()=>n.terminate())),n._offlineComponents=t}async function da(n,t){n.asyncQueue.verifyOperationInProgress();const e=await Kd(n);O(ie,"Initializing OnlineComponentProvider"),await t.initialize(e,n.configuration),n.setCredentialChangeListener((r=>la(t.remoteStore,r))),n.setAppCheckTokenChangeListener(((r,s)=>la(t.remoteStore,s))),n._onlineComponents=t}async function Kd(n){if(!n._offlineComponents)if(n._uninitializedComponentsProvider){O(ie,"Using user provided OfflineComponentProvider");try{await pi(n,n._uninitializedComponentsProvider._offline)}catch(t){const e=t;if(!(function(s){return s.name==="FirebaseError"?s.code===R.FAILED_PRECONDITION||s.code===R.UNIMPLEMENTED:!(typeof DOMException<"u"&&s instanceof DOMException)||s.code===22||s.code===20||s.code===11})(e))throw e;mr("Error using user provided cache. Falling back to memory cache: "+e),await pi(n,new dr)}}else O(ie,"Using default OfflineComponentProvider"),await pi(n,new Hd(void 0));return n._offlineComponents}async function Wd(n){return n._onlineComponents||(n._uninitializedComponentsProvider?(O(ie,"Using user provided OnlineComponentProvider"),await da(n,n._uninitializedComponentsProvider._online)):(O(ie,"Using default OnlineComponentProvider"),await da(n,new Di))),n._onlineComponents}function Qd(n){return Wd(n).then((t=>t.syncEngine))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Dl(n){const t={};return n.timeoutSeconds!==void 0&&(t.timeoutSeconds=n.timeoutSeconds),t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pa=new Map;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Nl="firestore.googleapis.com",ma=!0;class ga{constructor(t){if(t.host===void 0){if(t.ssl!==void 0)throw new F(R.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=Nl,this.ssl=ma}else this.host=t.host,this.ssl=t.ssl??ma;if(this.isUsingEmulator=t.emulatorOptions!==void 0,this.credentials=t.credentials,this.ignoreUndefinedProperties=!!t.ignoreUndefinedProperties,this.localCache=t.localCache,t.cacheSizeBytes===void 0)this.cacheSizeBytes=El;else{if(t.cacheSizeBytes!==-1&&t.cacheSizeBytes<Kf)throw new F(R.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=t.cacheSizeBytes}kh("experimentalForceLongPolling",t.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",t.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!t.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:t.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!t.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=Dl(t.experimentalLongPollingOptions??{}),(function(r){if(r.timeoutSeconds!==void 0){if(isNaN(r.timeoutSeconds))throw new F(R.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (must not be NaN)`);if(r.timeoutSeconds<5)throw new F(R.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (minimum allowed value is 5)`);if(r.timeoutSeconds>30)throw new F(R.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (maximum allowed value is 30)`)}})(this.experimentalLongPollingOptions),this.useFetchStreams=!!t.useFetchStreams}isEqual(t){return this.host===t.host&&this.ssl===t.ssl&&this.credentials===t.credentials&&this.cacheSizeBytes===t.cacheSizeBytes&&this.experimentalForceLongPolling===t.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===t.experimentalAutoDetectLongPolling&&(function(r,s){return r.timeoutSeconds===s.timeoutSeconds})(this.experimentalLongPollingOptions,t.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===t.ignoreUndefinedProperties&&this.useFetchStreams===t.useFetchStreams}}class wr{constructor(t,e,r,s){this._authCredentials=t,this._appCheckCredentials=e,this._databaseId=r,this._app=s,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new ga({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new F(R.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(t){if(this._settingsFrozen)throw new F(R.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new ga(t),this._emulatorOptions=t.emulatorOptions||{},t.credentials!==void 0&&(this._authCredentials=(function(r){if(!r)return new Ah;switch(r.type){case"firstParty":return new Ch(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new F(R.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}})(t.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return(function(e){const r=pa.get(e);r&&(O("ComponentProvider","Removing Datastore"),pa.delete(e),r.terminate())})(this),Promise.resolve()}}function Xd(n,t,e,r={}){n=qa(n,wr);const s=xi(t),o=n._getSettings(),l={...o,emulatorOptions:n._getEmulatorOptions()},c=`${t}:${e}`;s&&(Zu(`https://${c}`),rc("Firestore",!0)),o.host!==Nl&&o.host!==c&&mr("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const d={...o,host:c,ssl:s,emulatorOptions:r};if(!er(d,l)&&(n._setSettings(d),r.mockUserToken)){let g,E;if(typeof r.mockUserToken=="string")g=r.mockUserToken,E=At.MOCK_USER;else{g=tc(r.mockUserToken,n._app?.options.projectId);const w=r.mockUserToken.sub||r.mockUserToken.user_id;if(!w)throw new F(R.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");E=new At(w)}n._authCredentials=new Sh(new ja(g,E))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class es{constructor(t,e,r){this.converter=e,this._query=r,this.type="query",this.firestore=t}withConverter(t){return new es(this.firestore,t,this._query)}}class bt{constructor(t,e,r){this.converter=e,this._key=r,this.type="document",this.firestore=t}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new te(this.firestore,this.converter,this._key.path.popLast())}withConverter(t){return new bt(this.firestore,t,this._key)}toJSON(){return{type:bt._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(t,e,r){if(yn(e,bt._jsonSchema))return new bt(t,r||null,new z(it.fromString(e.referencePath)))}}bt._jsonSchemaVersion="firestore/documentReference/1.0",bt._jsonSchema={type:ut("string",bt._jsonSchemaVersion),referencePath:ut("string")};class te extends es{constructor(t,e,r){super(t,e,lf(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const t=this._path.popLast();return t.isEmpty()?null:new bt(this.firestore,null,new z(t))}withConverter(t){return new te(this.firestore,t,this._path)}}function Jd(n,t,...e){if(n=cn(n),Ba("collection","path",t),n instanceof wr){const r=it.fromString(t,...e);return Fo(r),new te(n,null,r)}{if(!(n instanceof bt||n instanceof te))throw new F(R.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=n._path.child(it.fromString(t,...e));return Fo(r),new te(n.firestore,null,r)}}function Yd(n,t,...e){if(n=cn(n),arguments.length===1&&(t=Li.newId()),Ba("doc","path",t),n instanceof wr){const r=it.fromString(t,...e);return Lo(r),new bt(n,null,new z(r))}{if(!(n instanceof bt||n instanceof te))throw new F(R.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=n._path.child(it.fromString(t,...e));return Lo(r),new bt(n.firestore,n instanceof te?n.converter:null,new z(r))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _a="AsyncQueue";class ya{constructor(t=Promise.resolve()){this.Xu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new wl(this,"async_queue_retry"),this._c=()=>{const r=di();r&&O(_a,"Visibility state changed to "+r.visibilityState),this.M_.w_()},this.ac=t;const e=di();e&&typeof e.addEventListener=="function"&&e.addEventListener("visibilitychange",this._c)}get isShuttingDown(){return this.ec}enqueueAndForget(t){this.enqueue(t)}enqueueAndForgetEvenWhileRestricted(t){this.uc(),this.cc(t)}enterRestrictedMode(t){if(!this.ec){this.ec=!0,this.sc=t||!1;const e=di();e&&typeof e.removeEventListener=="function"&&e.removeEventListener("visibilitychange",this._c)}}enqueue(t){if(this.uc(),this.ec)return new Promise((()=>{}));const e=new de;return this.cc((()=>this.ec&&this.sc?Promise.resolve():(t().then(e.resolve,e.reject),e.promise))).then((()=>e.promise))}enqueueRetryable(t){this.enqueueAndForget((()=>(this.Xu.push(t),this.lc())))}async lc(){if(this.Xu.length!==0){try{await this.Xu[0](),this.Xu.shift(),this.M_.reset()}catch(t){if(!vn(t))throw t;O(_a,"Operation failed with retryable error: "+t)}this.Xu.length>0&&this.M_.p_((()=>this.lc()))}}cc(t){const e=this.ac.then((()=>(this.rc=!0,t().catch((r=>{throw this.nc=r,this.rc=!1,ge("INTERNAL UNHANDLED ERROR: ",va(r)),r})).then((r=>(this.rc=!1,r))))));return this.ac=e,e}enqueueAfterDelay(t,e,r){this.uc(),this.oc.indexOf(t)>-1&&(e=0);const s=ts.createAndSchedule(this,t,e,r,(o=>this.hc(o)));return this.tc.push(s),s}uc(){this.nc&&q(47125,{Pc:va(this.nc)})}verifyOperationInProgress(){}async Tc(){let t;do t=this.ac,await t;while(t!==this.ac)}Ic(t){for(const e of this.tc)if(e.timerId===t)return!0;return!1}Ec(t){return this.Tc().then((()=>{this.tc.sort(((e,r)=>e.targetTimeMs-r.targetTimeMs));for(const e of this.tc)if(e.skipDelay(),t!=="all"&&e.timerId===t)break;return this.Tc()}))}dc(t){this.oc.push(t)}hc(t){const e=this.tc.indexOf(t);this.tc.splice(e,1)}}function va(n){let t=n.message||"";return n.stack&&(t=n.stack.includes(n.message)?n.stack:n.message+`
`+n.stack),t}class xl extends wr{constructor(t,e,r,s){super(t,e,r,s),this.type="firestore",this._queue=new ya,this._persistenceKey=s?.name||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const t=this._firestoreClient.terminate();this._queue=new ya(t),this._firestoreClient=void 0,await t}}}function Zd(n,t){const e=typeof n=="object"?n:dh(),r=typeof n=="string"?n:or,s=lh(e,"firestore").getImmediate({identifier:r});if(!s._initialized){const o=Ju("firestore");o&&Xd(s,...o)}return s}function tp(n){if(n._terminated)throw new F(R.FAILED_PRECONDITION,"The client has already been terminated.");return n._firestoreClient||ep(n),n._firestoreClient}function ep(n){const t=n._freezeSettings(),e=(function(s,o,l,c){return new Gh(s,o,l,c.host,c.ssl,c.experimentalForceLongPolling,c.experimentalAutoDetectLongPolling,Dl(c.experimentalLongPollingOptions),c.useFetchStreams,c.isUsingEmulator)})(n._databaseId,n._app?.options.appId||"",n._persistenceKey,t);n._componentsProvider||t.localCache?._offlineComponentProvider&&t.localCache?._onlineComponentProvider&&(n._componentsProvider={_offline:t.localCache._offlineComponentProvider,_online:t.localCache._onlineComponentProvider}),n._firestoreClient=new Gd(n._authCredentials,n._appCheckCredentials,n._queue,e,n._componentsProvider&&(function(s){const o=s?._online.build();return{_offline:s?._offline.build(o),_online:o}})(n._componentsProvider))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mt{constructor(t){this._byteString=t}static fromBase64String(t){try{return new Mt(jt.fromBase64String(t))}catch(e){throw new F(R.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+e)}}static fromUint8Array(t){return new Mt(jt.fromUint8Array(t))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(t){return this._byteString.isEqual(t._byteString)}toJSON(){return{type:Mt._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(t){if(yn(t,Mt._jsonSchema))return Mt.fromBase64String(t.bytes)}}Mt._jsonSchemaVersion="firestore/bytes/1.0",Mt._jsonSchema={type:ut("string",Mt._jsonSchemaVersion),bytes:ut("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ns{constructor(...t){for(let e=0;e<t.length;++e)if(t[e].length===0)throw new F(R.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new _t(t)}isEqual(t){return this._internalPath.isEqual(t._internalPath)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rs{constructor(t){this._methodName=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gt{constructor(t,e){if(!isFinite(t)||t<-90||t>90)throw new F(R.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+t);if(!isFinite(e)||e<-180||e>180)throw new F(R.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+e);this._lat=t,this._long=e}get latitude(){return this._lat}get longitude(){return this._long}isEqual(t){return this._lat===t._lat&&this._long===t._long}_compareTo(t){return J(this._lat,t._lat)||J(this._long,t._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:Gt._jsonSchemaVersion}}static fromJSON(t){if(yn(t,Gt._jsonSchema))return new Gt(t.latitude,t.longitude)}}Gt._jsonSchemaVersion="firestore/geoPoint/1.0",Gt._jsonSchema={type:ut("string",Gt._jsonSchemaVersion),latitude:ut("number"),longitude:ut("number")};/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kt{constructor(t){this._values=(t||[]).map((e=>e))}toArray(){return this._values.map((t=>t))}isEqual(t){return(function(r,s){if(r.length!==s.length)return!1;for(let o=0;o<r.length;++o)if(r[o]!==s[o])return!1;return!0})(this._values,t._values)}toJSON(){return{type:Kt._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(t){if(yn(t,Kt._jsonSchema)){if(Array.isArray(t.vectorValues)&&t.vectorValues.every((e=>typeof e=="number")))return new Kt(t.vectorValues);throw new F(R.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}Kt._jsonSchemaVersion="firestore/vectorValue/1.0",Kt._jsonSchema={type:ut("string",Kt._jsonSchemaVersion),vectorValues:ut("object")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const np=/^__.*__$/;class rp{constructor(t,e,r){this.data=t,this.fieldMask=e,this.fieldTransforms=r}toMutation(t,e){return this.fieldMask!==null?new Ee(t,this.data,this.fieldMask,e,this.fieldTransforms):new En(t,this.data,e,this.fieldTransforms)}}function kl(n){switch(n){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw q(40011,{Ac:n})}}class is{constructor(t,e,r,s,o,l){this.settings=t,this.databaseId=e,this.serializer=r,this.ignoreUndefinedProperties=s,o===void 0&&this.Rc(),this.fieldTransforms=o||[],this.fieldMask=l||[]}get path(){return this.settings.path}get Ac(){return this.settings.Ac}Vc(t){return new is({...this.settings,...t},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}mc(t){const e=this.path?.child(t),r=this.Vc({path:e,fc:!1});return r.gc(t),r}yc(t){const e=this.path?.child(t),r=this.Vc({path:e,fc:!1});return r.Rc(),r}wc(t){return this.Vc({path:void 0,fc:!0})}Sc(t){return pr(t,this.settings.methodName,this.settings.bc||!1,this.path,this.settings.Dc)}contains(t){return this.fieldMask.find((e=>t.isPrefixOf(e)))!==void 0||this.fieldTransforms.find((e=>t.isPrefixOf(e.field)))!==void 0}Rc(){if(this.path)for(let t=0;t<this.path.length;t++)this.gc(this.path.get(t))}gc(t){if(t.length===0)throw this.Sc("Document fields must not be empty");if(kl(this.Ac)&&np.test(t))throw this.Sc('Document fields cannot begin and end with "__"')}}class ip{constructor(t,e,r){this.databaseId=t,this.ignoreUndefinedProperties=e,this.serializer=r||vr(t)}Cc(t,e,r,s=!1){return new is({Ac:t,methodName:e,Dc:r,path:_t.emptyPath(),fc:!1,bc:s},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function sp(n){const t=n._freezeSettings(),e=vr(n._databaseId);return new ip(n._databaseId,!!t.ignoreUndefinedProperties,e)}function op(n,t,e,r,s,o={}){const l=n.Cc(o.merge||o.mergeFields?2:0,t,e,s);Fl("Data must be an object, but it was:",l,r);const c=Ml(r,l);let d,g;if(o.merge)d=new Lt(l.fieldMask),g=l.fieldTransforms;else if(o.mergeFields){const E=[];for(const w of o.mergeFields){const T=ap(t,w,e);if(!l.contains(T))throw new F(R.INVALID_ARGUMENT,`Field '${T}' is specified in your field mask but missing from your input data.`);up(E,T)||E.push(T)}d=new Lt(E),g=l.fieldTransforms.filter((w=>d.covers(w.field)))}else d=null,g=l.fieldTransforms;return new rp(new Ot(c),d,g)}class ss extends rs{_toFieldTransform(t){return new Tf(t.path,new mn)}isEqual(t){return t instanceof ss}}function Ol(n,t){if(Ll(n=cn(n)))return Fl("Unsupported field value:",t,n),Ml(n,t);if(n instanceof rs)return(function(r,s){if(!kl(s.Ac))throw s.Sc(`${r._methodName}() can only be used with update() and set()`);if(!s.path)throw s.Sc(`${r._methodName}() is not currently supported inside arrays`);const o=r._toFieldTransform(s);o&&s.fieldTransforms.push(o)})(n,t),null;if(n===void 0&&t.ignoreUndefinedProperties)return null;if(t.path&&t.fieldMask.push(t.path),n instanceof Array){if(t.settings.fc&&t.Ac!==4)throw t.Sc("Nested arrays are not supported");return(function(r,s){const o=[];let l=0;for(const c of r){let d=Ol(c,s.wc(l));d==null&&(d={nullValue:"NULL_VALUE"}),o.push(d),l++}return{arrayValue:{values:o}}})(n,t)}return(function(r,s){if((r=cn(r))===null)return{nullValue:"NULL_VALUE"};if(typeof r=="number")return yf(s.serializer,r);if(typeof r=="boolean")return{booleanValue:r};if(typeof r=="string")return{stringValue:r};if(r instanceof Date){const o=rt.fromDate(r);return{timestampValue:Ri(s.serializer,o)}}if(r instanceof rt){const o=new rt(r.seconds,1e3*Math.floor(r.nanoseconds/1e3));return{timestampValue:Ri(s.serializer,o)}}if(r instanceof Gt)return{geoPointValue:{latitude:r.latitude,longitude:r.longitude}};if(r instanceof Mt)return{bytesValue:Nf(s.serializer,r._byteString)};if(r instanceof bt){const o=s.databaseId,l=r.firestore._databaseId;if(!l.isEqual(o))throw s.Sc(`Document reference is for database ${l.projectId}/${l.database} but should be for database ${o.projectId}/${o.database}`);return{referenceValue:yl(r.firestore._databaseId||s.databaseId,r._key.path)}}if(r instanceof Kt)return(function(l,c){return{mapValue:{fields:{[Xa]:{stringValue:Ja},[Ii]:{arrayValue:{values:l.toArray().map((g=>{if(typeof g!="number")throw c.Sc("VectorValues must only contain numeric values.");return Qi(c.serializer,g)}))}}}}}})(r,s);throw s.Sc(`Unsupported field value: ${Fi(r)}`)})(n,t)}function Ml(n,t){const e={};return Ha(n)?t.path&&t.path.length>0&&t.fieldMask.push(t.path):je(n,((r,s)=>{const o=Ol(s,t.mc(r));o!=null&&(e[r]=o)})),{mapValue:{fields:e}}}function Ll(n){return!(typeof n!="object"||n===null||n instanceof Array||n instanceof Date||n instanceof rt||n instanceof Gt||n instanceof Mt||n instanceof bt||n instanceof rs||n instanceof Kt)}function Fl(n,t,e){if(!Ll(e)||!za(e)){const r=Fi(e);throw r==="an object"?t.Sc(n+" a custom object"):t.Sc(n+" "+r)}}function ap(n,t,e){if((t=cn(t))instanceof ns)return t._internalPath;if(typeof t=="string")return Ul(n,t);throw pr("Field path arguments must be of type string or ",n,!1,void 0,e)}const lp=new RegExp("[~\\*/\\[\\]]");function Ul(n,t,e){if(t.search(lp)>=0)throw pr(`Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`,n,!1,void 0,e);try{return new ns(...t.split("."))._internalPath}catch{throw pr(`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,n,!1,void 0,e)}}function pr(n,t,e,r,s){const o=r&&!r.isEmpty(),l=s!==void 0;let c=`Function ${t}() called with invalid data`;e&&(c+=" (via `toFirestore()`)"),c+=". ";let d="";return(o||l)&&(d+=" (found",o&&(d+=` in field ${r}`),l&&(d+=` in document ${s}`),d+=")"),new F(R.INVALID_ARGUMENT,c+n+d)}function up(n,t){return n.some((e=>e.isEqual(t)))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jl{constructor(t,e,r,s,o){this._firestore=t,this._userDataWriter=e,this._key=r,this._document=s,this._converter=o}get id(){return this._key.path.lastSegment()}get ref(){return new bt(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const t=new cp(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(t)}return this._userDataWriter.convertValue(this._document.data.value)}}get(t){if(this._document){const e=this._document.data.field(Bl("DocumentSnapshot.get",t));if(e!==null)return this._userDataWriter.convertValue(e)}}}class cp extends jl{data(){return super.data()}}function Bl(n,t){return typeof t=="string"?Ul(n,t):t instanceof ns?t._internalPath:t._delegate._internalPath}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hp(n,t,e){let r;return r=n?n.toFirestore(t):t,r}class Kn{constructor(t,e){this.hasPendingWrites=t,this.fromCache=e}isEqual(t){return this.hasPendingWrites===t.hasPendingWrites&&this.fromCache===t.fromCache}}class De extends jl{constructor(t,e,r,s,o,l){super(t,e,r,s,l),this._firestore=t,this._firestoreImpl=t,this.metadata=o}exists(){return super.exists()}data(t={}){if(this._document){if(this._converter){const e=new Zn(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(e,t)}return this._userDataWriter.convertValue(this._document.data.value,t.serverTimestamps)}}get(t,e={}){if(this._document){const r=this._document.data.field(Bl("DocumentSnapshot.get",t));if(r!==null)return this._userDataWriter.convertValue(r,e.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new F(R.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const t=this._document,e={};return e.type=De._jsonSchemaVersion,e.bundle="",e.bundleSource="DocumentSnapshot",e.bundleName=this._key.toString(),!t||!t.isValidDocument()||!t.isFoundDocument()?e:(this._userDataWriter.convertObjectMap(t.data.value.mapValue.fields,"previous"),e.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),e)}}De._jsonSchemaVersion="firestore/documentSnapshot/1.0",De._jsonSchema={type:ut("string",De._jsonSchemaVersion),bundleSource:ut("string","DocumentSnapshot"),bundleName:ut("string"),bundle:ut("string")};class Zn extends De{data(t={}){return super.data(t)}}class ln{constructor(t,e,r,s){this._firestore=t,this._userDataWriter=e,this._snapshot=s,this.metadata=new Kn(s.hasPendingWrites,s.fromCache),this.query=r}get docs(){const t=[];return this.forEach((e=>t.push(e))),t}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(t,e){this._snapshot.docs.forEach((r=>{t.call(e,new Zn(this._firestore,this._userDataWriter,r.key,r,new Kn(this._snapshot.mutatedKeys.has(r.key),this._snapshot.fromCache),this.query.converter))}))}docChanges(t={}){const e=!!t.includeMetadataChanges;if(e&&this._snapshot.excludesMetadataChanges)throw new F(R.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===e||(this._cachedChanges=(function(s,o){if(s._snapshot.oldDocs.isEmpty()){let l=0;return s._snapshot.docChanges.map((c=>{const d=new Zn(s._firestore,s._userDataWriter,c.doc.key,c.doc,new Kn(s._snapshot.mutatedKeys.has(c.doc.key),s._snapshot.fromCache),s.query.converter);return c.doc,{type:"added",doc:d,oldIndex:-1,newIndex:l++}}))}{let l=s._snapshot.oldDocs;return s._snapshot.docChanges.filter((c=>o||c.type!==3)).map((c=>{const d=new Zn(s._firestore,s._userDataWriter,c.doc.key,c.doc,new Kn(s._snapshot.mutatedKeys.has(c.doc.key),s._snapshot.fromCache),s.query.converter);let g=-1,E=-1;return c.type!==0&&(g=l.indexOf(c.doc.key),l=l.delete(c.doc.key)),c.type!==1&&(l=l.add(c.doc),E=l.indexOf(c.doc.key)),{type:fp(c.type),doc:d,oldIndex:g,newIndex:E}}))}})(this,e),this._cachedChangesIncludeMetadataChanges=e),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new F(R.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const t={};t.type=ln._jsonSchemaVersion,t.bundleSource="QuerySnapshot",t.bundleName=Li.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const e=[],r=[],s=[];return this.docs.forEach((o=>{o._document!==null&&(e.push(o._document),r.push(this._userDataWriter.convertObjectMap(o._document.data.value.mapValue.fields,"previous")),s.push(o.ref.path))})),t.bundle=(this._firestore,this.query._query,t.bundleName,"NOT SUPPORTED"),t}}function fp(n){switch(n){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return q(61501,{type:n})}}ln._jsonSchemaVersion="firestore/querySnapshot/1.0",ln._jsonSchema={type:ut("string",ln._jsonSchemaVersion),bundleSource:ut("string","QuerySnapshot"),bundleName:ut("string"),bundle:ut("string")};function dp(n,t){const e=qa(n.firestore,xl),r=Yd(n),s=hp(n.converter,t);return pp(e,[op(sp(n.firestore),"addDoc",r._key,s,n.converter!==null,{}).toMutation(r._key,Ht.exists(!1))]).then((()=>r))}function pp(n,t){return(function(r,s){const o=new de;return r.asyncQueue.enqueueAndForget((async()=>jd(await Qd(r),s,o))),o.promise})(tp(n),t)}function mp(){return new ss("serverTimestamp")}(function(t,e=!0){(function(s){Ue=s})(fh),rr(new hn("firestore",((r,{instanceIdentifier:s,options:o})=>{const l=r.getProvider("app").getImmediate(),c=new xl(new bh(r.getProvider("auth-internal")),new Ph(l,r.getProvider("app-check-internal")),(function(g,E){if(!Object.prototype.hasOwnProperty.apply(g.options,["projectId"]))throw new F(R.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new ar(g.options.projectId,E)})(l,s),l);return o={useFetchStreams:e,...o},c._setSettings(o),c}),"PUBLIC").setMultipleInstances(!0)),Pe(xo,ko,t),Pe(xo,ko,"esm2020")})();var gp="firebase",_p="12.1.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Pe(gp,_p,"app");var be={};const yp={apiKey:be.REACT_APP_API_KEY,authDomain:be.REACT_APP_AUTH_DOMAIN,projectId:be.REACT_APP_PROJECT_ID,storageBucket:be.REACT_APP_STORAGE_BUCKET,messagingSenderId:be.REACT_APP_MESSAGING_SENDER_ID,appId:be.REACT_APP_APP_ID},vp=Da(yp),Ep=Zd(vp),Tp=()=>{const[n,t]=he.useState({name:"",email:"",phone:"",category:"requests",message:""}),[e,r]=he.useState({type:"",message:""}),s=l=>{const{name:c,value:d}=l.target;t(g=>({...g,[c]:d}))},o=async l=>{if(l.preventDefault(),!n.message){r({type:"error",message:"Please enter a message before submitting."});return}r({type:"loading",message:"Submitting..."});try{await dp(Jd(Ep,"feedback"),{...n,submittedAt:mp()}),r({type:"success",message:"Thank you! Your feedback has been sent."}),t({name:"",email:"",phone:"",category:"requests",message:""})}catch(c){console.error("Error adding document: ",c),r({type:"error",message:"Something went wrong. Please try again."})}};return L.jsx("div",{className:"max-w-2xl bg-neutral-50 border border-neutral-200 p-8 rounded-lg",children:L.jsxs("form",{onSubmit:o,className:"space-y-6",children:[L.jsx("div",{className:"grid sm:grid-cols-2 gap-6",children:L.jsxs("div",{children:[L.jsx("label",{htmlFor:"category",className:"block text-sm font-medium text-neutral-700",children:"Category"}),L.jsxs("select",{id:"category",name:"category",value:n.category,onChange:s,className:"mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary",children:[L.jsx("option",{value:"requests",children:"Requests"}),L.jsx("option",{value:"quality",children:"Quality Feedback"}),L.jsx("option",{value:"other",children:"Other"})]})]})}),L.jsxs("div",{children:[L.jsx("label",{htmlFor:"message",className:"block text-sm font-medium text-neutral-700",children:"Message"}),L.jsx("textarea",{id:"message",name:"message",rows:"4",value:n.message,onChange:s,required:!0,className:"mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary"})]}),L.jsxs("div",{className:"grid sm:grid-cols-2 gap-6",children:[L.jsxs("div",{children:[L.jsx("label",{htmlFor:"name",className:"block text-sm font-medium text-neutral-700",children:"Name (Optional)"}),L.jsx("input",{type:"text",name:"name",id:"name",value:n.name,onChange:s,className:"mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary"})]}),L.jsxs("div",{children:[L.jsx("label",{htmlFor:"email",className:"block text-sm font-medium text-neutral-700",children:"Email (Optional)"}),L.jsx("input",{type:"email",name:"email",id:"email",value:n.email,onChange:s,className:"mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary focus:ring-primary"})]})]}),L.jsxs("div",{className:"flex items-center justify-between",children:[L.jsx(un.button,{type:"submit",className:"btn btn-primary",whileHover:{scale:1.03},whileTap:{scale:.98},disabled:e.type==="loading",children:e.type==="loading"?"Sending...":"Submit Feedback"}),e.message&&L.jsx("p",{className:`text-sm ${e.type==="success"?"text-green-600":"text-red-600"}`,children:e.message})]})]})})},Sp=()=>{const[n,t]=he.useState([]),[e,r]=he.useState(null),[s,o]=he.useState(null),[l,c]=he.useState(!0);he.useEffect(()=>{so.fetch(`{
      "menuItems": *[_type == "menuItems"],
      "pageContent": *[_type == "happyMondayPage"][0]
    }`).then(w=>{t(w.menuItems||[]),r(w.pageContent),c(!1)}).catch(console.error)},[]);const d=E=>{o(E)},g=()=>{o(null)};return L.jsxs(L.Fragment,{children:[L.jsxs(Tu,{children:[L.jsx("title",{children:"Happy Monday | Local Effort"}),L.jsx("meta",{name:"description",content:"Explore our special Happy Monday menu, made with the finest local ingredients."})]}),L.jsxs("div",{className:"space-y-24 mb-24",children:[L.jsxs("section",{className:"mx-auto max-w-6xl px-4 md:px-6 lg:px-8",children:[e&&L.jsxs("div",{className:"text-center mb-12",children:[L.jsx("h2",{className:"text-heading uppercase mb-4",children:e.title}),L.jsx("div",{className:"prose lg:prose-lg mx-auto max-w-3xl",children:L.jsx(Mu,{blocks:e.body,client:so})})]}),l?L.jsx("div",{className:"flex justify-center items-center h-64",children:L.jsx(Iu,{})}):L.jsx(un.div,{className:"grid md:grid-cols-2 lg:grid-cols-3 gap-6",initial:"initial",animate:"animate",variants:{animate:{transition:{staggerChildren:.1}}},children:n.map(E=>L.jsx(Lu,{item:E,onClick:()=>d(E)},E._id))})]}),L.jsxs("section",{className:"mx-auto max-w-6xl px-4 md:px-6 lg:px-8",children:[L.jsx("h2",{className:"text-heading uppercase mb-6 border-b border-neutral-300 pb-3",children:"Feedback"}),L.jsx("p",{className:"text-body mb-8 max-w-2xl",children:"Have a suggestion, a request, or feedback on our quality? We'd love to hear it. Your input helps us grow and improve."}),L.jsx(Tp,{})]})]}),L.jsx(wu,{children:s&&L.jsx(ju,{item:s,onClose:g})})]})};export{Sp as default};
