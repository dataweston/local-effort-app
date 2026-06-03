const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index.esm-DxrGtp16.js","assets/index-C2rNgJwe.js","assets/index-Csw2DyC9.css"])))=>i.map(i=>d[i]);
import{_ as ga,r as ei,d as ma,R as Pe}from"./index-C2rNgJwe.js";const _a=()=>{};var $s={};/**
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
 */const Mr=function(i){const e=[];let n=0;for(let s=0;s<i.length;s++){let o=i.charCodeAt(s);o<128?e[n++]=o:o<2048?(e[n++]=o>>6|192,e[n++]=o&63|128):(o&64512)===55296&&s+1<i.length&&(i.charCodeAt(s+1)&64512)===56320?(o=65536+((o&1023)<<10)+(i.charCodeAt(++s)&1023),e[n++]=o>>18|240,e[n++]=o>>12&63|128,e[n++]=o>>6&63|128,e[n++]=o&63|128):(e[n++]=o>>12|224,e[n++]=o>>6&63|128,e[n++]=o&63|128)}return e},ya=function(i){const e=[];let n=0,s=0;for(;n<i.length;){const o=i[n++];if(o<128)e[s++]=String.fromCharCode(o);else if(o>191&&o<224){const c=i[n++];e[s++]=String.fromCharCode((o&31)<<6|c&63)}else if(o>239&&o<365){const c=i[n++],l=i[n++],E=i[n++],w=((o&7)<<18|(c&63)<<12|(l&63)<<6|E&63)-65536;e[s++]=String.fromCharCode(55296+(w>>10)),e[s++]=String.fromCharCode(56320+(w&1023))}else{const c=i[n++],l=i[n++];e[s++]=String.fromCharCode((o&15)<<12|(c&63)<<6|l&63)}}return e.join("")},Ur={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(i,e){if(!Array.isArray(i))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,s=[];for(let o=0;o<i.length;o+=3){const c=i[o],l=o+1<i.length,E=l?i[o+1]:0,w=o+2<i.length,v=w?i[o+2]:0,b=c>>2,S=(c&3)<<4|E>>4;let A=(E&15)<<2|v>>6,x=v&63;w||(x=64,l||(A=64)),s.push(n[b],n[S],n[A],n[x])}return s.join("")},encodeString(i,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(i):this.encodeByteArray(Mr(i),e)},decodeString(i,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(i):ya(this.decodeStringToByteArray(i,e))},decodeStringToByteArray(i,e){this.init_();const n=e?this.charToByteMapWebSafe_:this.charToByteMap_,s=[];for(let o=0;o<i.length;){const c=n[i.charAt(o++)],E=o<i.length?n[i.charAt(o)]:0;++o;const v=o<i.length?n[i.charAt(o)]:64;++o;const S=o<i.length?n[i.charAt(o)]:64;if(++o,c==null||E==null||v==null||S==null)throw new Ia;const A=c<<2|E>>4;if(s.push(A),v!==64){const x=E<<4&240|v>>2;if(s.push(x),S!==64){const L=v<<6&192|S;s.push(L)}}}return s},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let i=0;i<this.ENCODED_VALS.length;i++)this.byteToCharMap_[i]=this.ENCODED_VALS.charAt(i),this.charToByteMap_[this.byteToCharMap_[i]]=i,this.byteToCharMapWebSafe_[i]=this.ENCODED_VALS_WEBSAFE.charAt(i),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]]=i,i>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)]=i,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)]=i)}}};class Ia extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const Ea=function(i){const e=Mr(i);return Ur.encodeByteArray(e,!0)},mn=function(i){return Ea(i).replace(/\./g,"")},_n=function(i){try{return Ur.decodeString(i,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
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
 */function wa(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const va=()=>wa().__FIREBASE_DEFAULTS__,Ta=()=>{if(typeof process>"u"||typeof $s>"u")return;const i=$s.__FIREBASE_DEFAULTS__;if(i)return JSON.parse(i)},Aa=()=>{if(typeof document>"u")return;let i;try{i=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=i&&_n(i[1]);return e&&JSON.parse(e)},Ai=()=>{try{return _a()||va()||Ta()||Aa()}catch(i){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${i}`);return}},xr=i=>{var e,n;return(n=(e=Ai())==null?void 0:e.emulatorHosts)==null?void 0:n[i]},Sa=i=>{const e=xr(i);if(!e)return;const n=e.lastIndexOf(":");if(n<=0||n+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const s=parseInt(e.substring(n+1),10);return e[0]==="["?[e.substring(1,n-1),s]:[e.substring(0,n),s]},Vr=()=>{var i;return(i=Ai())==null?void 0:i.config},Fr=i=>{var e;return(e=Ai())==null?void 0:e[`_${i}`]};/**
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
 */class ba{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,n)=>{this.resolve=e,this.reject=n})}wrapCallback(e){return(n,s)=>{n?this.reject(n):this.resolve(s),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(n):e(n,s))}}}/**
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
 */function Bt(i){try{return(i.startsWith("http://")||i.startsWith("https://")?new URL(i).hostname:i).endsWith(".cloudworkstations.dev")}catch{return!1}}async function jr(i){return(await fetch(i,{credentials:"include"})).ok}/**
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
 */function Ca(i,e){if(i.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const n={alg:"none",type:"JWT"},s=e||"demo-project",o=i.iat||0,c=i.sub||i.user_id;if(!c)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const l={iss:`https://securetoken.google.com/${s}`,aud:s,iat:o,exp:o+3600,auth_time:o,sub:c,user_id:c,firebase:{sign_in_provider:"custom",identities:{}},...i};return[mn(JSON.stringify(n)),mn(JSON.stringify(l)),""].join(".")}const Dt={};function Pa(){const i={prod:[],emulator:[]};for(const e of Object.keys(Dt))Dt[e]?i.emulator.push(e):i.prod.push(e);return i}function Ra(i){let e=document.getElementById(i),n=!1;return e||(e=document.createElement("div"),e.setAttribute("id",i),n=!0),{created:n,element:e}}let Ws=!1;function Br(i,e){if(typeof window>"u"||typeof document>"u"||!Bt(window.location.host)||Dt[i]===e||Dt[i]||Ws)return;Dt[i]=e;function n(A){return`__firebase__banner__${A}`}const s="__firebase__banner",c=Pa().prod.length>0;function l(){const A=document.getElementById(s);A&&A.remove()}function E(A){A.style.display="flex",A.style.background="#7faaf0",A.style.position="fixed",A.style.bottom="5px",A.style.left="5px",A.style.padding=".5em",A.style.borderRadius="5px",A.style.alignItems="center"}function w(A,x){A.setAttribute("width","24"),A.setAttribute("id",x),A.setAttribute("height","24"),A.setAttribute("viewBox","0 0 24 24"),A.setAttribute("fill","none"),A.style.marginLeft="-6px"}function v(){const A=document.createElement("span");return A.style.cursor="pointer",A.style.marginLeft="16px",A.style.fontSize="24px",A.innerHTML=" &times;",A.onclick=()=>{Ws=!0,l()},A}function b(A,x){A.setAttribute("id",x),A.innerText="Learn more",A.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",A.setAttribute("target","__blank"),A.style.paddingLeft="5px",A.style.textDecoration="underline"}function S(){const A=Ra(s),x=n("text"),L=document.getElementById(x)||document.createElement("span"),F=n("learnmore"),U=document.getElementById(F)||document.createElement("a"),X=n("preprendIcon"),Y=document.getElementById(X)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(A.created){const Z=A.element;E(Z),b(U,F);const Ee=v();w(Y,X),Z.append(Y,L,U,Ee),document.body.appendChild(Z)}c?(L.innerText="Preview backend disconnected.",Y.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(Y.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,L.innerText="Preview backend running in this workspace."),L.setAttribute("id",x)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",S):S()}/**
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
 */function K(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function ka(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(K())}function Na(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function Da(){const i=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof i=="object"&&i.id!==void 0}function Oa(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function La(){const i=K();return i.indexOf("MSIE ")>=0||i.indexOf("Trident/")>=0}function Ma(){try{return typeof indexedDB=="object"}catch{return!1}}function Ua(){return new Promise((i,e)=>{try{let n=!0;const s="validate-browser-context-for-indexeddb-analytics-module",o=self.indexedDB.open(s);o.onsuccess=()=>{o.result.close(),n||self.indexedDB.deleteDatabase(s),i(!0)},o.onupgradeneeded=()=>{n=!1},o.onerror=()=>{var c;e(((c=o.error)==null?void 0:c.message)||"")}}catch(n){e(n)}})}/**
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
 */const xa="FirebaseError";class Ie extends Error{constructor(e,n,s){super(n),this.code=e,this.customData=s,this.name=xa,Object.setPrototypeOf(this,Ie.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Ht.prototype.create)}}class Ht{constructor(e,n,s){this.service=e,this.serviceName=n,this.errors=s}create(e,...n){const s=n[0]||{},o=`${this.service}/${e}`,c=this.errors[e],l=c?Va(c,s):"Error",E=`${this.serviceName}: ${l} (${o}).`;return new Ie(o,E,s)}}function Va(i,e){return i.replace(Fa,(n,s)=>{const o=e[s];return o!=null?String(o):`<${s}?>`})}const Fa=/\{\$([^}]+)}/g;/**
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
 */function zs(i){return JSON.parse(i)}/**
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
 */const ja=function(i){let e={},n={},s={},o="";try{const c=i.split(".");e=zs(_n(c[0])||""),n=zs(_n(c[1])||""),o=c[2],s=n.d||{},delete n.d}catch{}return{header:e,claims:n,data:s,signature:o}},$u=function(i){const e=ja(i).claims;return typeof e=="object"&&e.hasOwnProperty("iat")?e.iat:null};function Ba(i){for(const e in i)if(Object.prototype.hasOwnProperty.call(i,e))return!1;return!0}function Xe(i,e){if(i===e)return!0;const n=Object.keys(i),s=Object.keys(e);for(const o of n){if(!s.includes(o))return!1;const c=i[o],l=e[o];if(Gs(c)&&Gs(l)){if(!Xe(c,l))return!1}else if(c!==l)return!1}for(const o of s)if(!n.includes(o))return!1;return!0}function Gs(i){return i!==null&&typeof i=="object"}/**
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
 */function $t(i){const e=[];for(const[n,s]of Object.entries(i))Array.isArray(s)?s.forEach(o=>{e.push(encodeURIComponent(n)+"="+encodeURIComponent(o))}):e.push(encodeURIComponent(n)+"="+encodeURIComponent(s));return e.length?"&"+e.join("&"):""}function Ha(i,e){const n=new $a(i,e);return n.subscribe.bind(n)}class $a{constructor(e,n){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=n,this.task.then(()=>{e(this)}).catch(s=>{this.error(s)})}next(e){this.forEachObserver(n=>{n.next(e)})}error(e){this.forEachObserver(n=>{n.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,n,s){let o;if(e===void 0&&n===void 0&&s===void 0)throw new Error("Missing Observer.");Wa(e,["next","error","complete"])?o=e:o={next:e,error:n,complete:s},o.next===void 0&&(o.next=ti),o.error===void 0&&(o.error=ti),o.complete===void 0&&(o.complete=ti);const c=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?o.error(this.finalError):o.complete()}catch{}}),this.observers.push(o),c}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let n=0;n<this.observers.length;n++)this.sendOne(n,e)}sendOne(e,n){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{n(this.observers[e])}catch(s){typeof console<"u"&&console.error&&console.error(s)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function Wa(i,e){if(typeof i!="object"||i===null)return!1;for(const n of e)if(n in i&&typeof i[n]=="function")return!0;return!1}function ti(){}/**
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
 */const za=1e3,Ga=2,qa=4*60*60*1e3,Ka=.5;function Wu(i,e=za,n=Ga){const s=e*Math.pow(n,i),o=Math.round(Ka*s*(Math.random()-.5)*2);return Math.min(qa,s+o)}/**
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
 */function tt(i){return i&&i._delegate?i._delegate:i}class Ye{constructor(e,n,s){this.name=e,this.instanceFactory=n,this.type=s,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
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
 */const We="[DEFAULT]";/**
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
 */class Ja{constructor(e,n){this.name=e,this.container=n,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const n=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(n)){const s=new ba;if(this.instancesDeferred.set(n,s),this.isInitialized(n)||this.shouldAutoInitialize())try{const o=this.getOrInitializeService({instanceIdentifier:n});o&&s.resolve(o)}catch{}}return this.instancesDeferred.get(n).promise}getImmediate(e){const n=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),s=(e==null?void 0:e.optional)??!1;if(this.isInitialized(n)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:n})}catch(o){if(s)return null;throw o}else{if(s)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(Ya(e))try{this.getOrInitializeService({instanceIdentifier:We})}catch{}for(const[n,s]of this.instancesDeferred.entries()){const o=this.normalizeInstanceIdentifier(n);try{const c=this.getOrInitializeService({instanceIdentifier:o});s.resolve(c)}catch{}}}}clearInstance(e=We){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(n=>"INTERNAL"in n).map(n=>n.INTERNAL.delete()),...e.filter(n=>"_delete"in n).map(n=>n._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=We){return this.instances.has(e)}getOptions(e=We){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:n={}}=e,s=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(s))throw Error(`${this.name}(${s}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const o=this.getOrInitializeService({instanceIdentifier:s,options:n});for(const[c,l]of this.instancesDeferred.entries()){const E=this.normalizeInstanceIdentifier(c);s===E&&l.resolve(o)}return o}onInit(e,n){const s=this.normalizeInstanceIdentifier(n),o=this.onInitCallbacks.get(s)??new Set;o.add(e),this.onInitCallbacks.set(s,o);const c=this.instances.get(s);return c&&e(c,s),()=>{o.delete(e)}}invokeOnInitCallbacks(e,n){const s=this.onInitCallbacks.get(n);if(s)for(const o of s)try{o(e,n)}catch{}}getOrInitializeService({instanceIdentifier:e,options:n={}}){let s=this.instances.get(e);if(!s&&this.component&&(s=this.component.instanceFactory(this.container,{instanceIdentifier:Xa(e),options:n}),this.instances.set(e,s),this.instancesOptions.set(e,n),this.invokeOnInitCallbacks(s,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,s)}catch{}return s||null}normalizeInstanceIdentifier(e=We){return this.component?this.component.multipleInstances?e:We:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function Xa(i){return i===We?void 0:i}function Ya(i){return i.instantiationMode==="EAGER"}/**
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
 */class Za{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const n=this.getProvider(e.name);if(n.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);n.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const n=new Ja(e,this);return this.providers.set(e,n),n}getProviders(){return Array.from(this.providers.values())}}/**
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
 */var D;(function(i){i[i.DEBUG=0]="DEBUG",i[i.VERBOSE=1]="VERBOSE",i[i.INFO=2]="INFO",i[i.WARN=3]="WARN",i[i.ERROR=4]="ERROR",i[i.SILENT=5]="SILENT"})(D||(D={}));const Qa={debug:D.DEBUG,verbose:D.VERBOSE,info:D.INFO,warn:D.WARN,error:D.ERROR,silent:D.SILENT},ec=D.INFO,tc={[D.DEBUG]:"log",[D.VERBOSE]:"log",[D.INFO]:"info",[D.WARN]:"warn",[D.ERROR]:"error"},nc=(i,e,...n)=>{if(e<i.logLevel)return;const s=new Date().toISOString(),o=tc[e];if(o)console[o](`[${s}]  ${i.name}:`,...n);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class Si{constructor(e){this.name=e,this._logLevel=ec,this._logHandler=nc,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in D))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?Qa[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,D.DEBUG,...e),this._logHandler(this,D.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,D.VERBOSE,...e),this._logHandler(this,D.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,D.INFO,...e),this._logHandler(this,D.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,D.WARN,...e),this._logHandler(this,D.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,D.ERROR,...e),this._logHandler(this,D.ERROR,...e)}}const ic=(i,e)=>e.some(n=>i instanceof n);let qs,Ks;function sc(){return qs||(qs=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function rc(){return Ks||(Ks=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Hr=new WeakMap,di=new WeakMap,$r=new WeakMap,ni=new WeakMap,bi=new WeakMap;function oc(i){const e=new Promise((n,s)=>{const o=()=>{i.removeEventListener("success",c),i.removeEventListener("error",l)},c=()=>{n(Le(i.result)),o()},l=()=>{s(i.error),o()};i.addEventListener("success",c),i.addEventListener("error",l)});return e.then(n=>{n instanceof IDBCursor&&Hr.set(n,i)}).catch(()=>{}),bi.set(e,i),e}function ac(i){if(di.has(i))return;const e=new Promise((n,s)=>{const o=()=>{i.removeEventListener("complete",c),i.removeEventListener("error",l),i.removeEventListener("abort",l)},c=()=>{n(),o()},l=()=>{s(i.error||new DOMException("AbortError","AbortError")),o()};i.addEventListener("complete",c),i.addEventListener("error",l),i.addEventListener("abort",l)});di.set(i,e)}let fi={get(i,e,n){if(i instanceof IDBTransaction){if(e==="done")return di.get(i);if(e==="objectStoreNames")return i.objectStoreNames||$r.get(i);if(e==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return Le(i[e])},set(i,e,n){return i[e]=n,!0},has(i,e){return i instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in i}};function cc(i){fi=i(fi)}function hc(i){return i===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...n){const s=i.call(ii(this),e,...n);return $r.set(s,e.sort?e.sort():[e]),Le(s)}:rc().includes(i)?function(...e){return i.apply(ii(this),e),Le(Hr.get(this))}:function(...e){return Le(i.apply(ii(this),e))}}function lc(i){return typeof i=="function"?hc(i):(i instanceof IDBTransaction&&ac(i),ic(i,sc())?new Proxy(i,fi):i)}function Le(i){if(i instanceof IDBRequest)return oc(i);if(ni.has(i))return ni.get(i);const e=lc(i);return e!==i&&(ni.set(i,e),bi.set(e,i)),e}const ii=i=>bi.get(i);function uc(i,e,{blocked:n,upgrade:s,blocking:o,terminated:c}={}){const l=indexedDB.open(i,e),E=Le(l);return s&&l.addEventListener("upgradeneeded",w=>{s(Le(l.result),w.oldVersion,w.newVersion,Le(l.transaction),w)}),n&&l.addEventListener("blocked",w=>n(w.oldVersion,w.newVersion,w)),E.then(w=>{c&&w.addEventListener("close",()=>c()),o&&w.addEventListener("versionchange",v=>o(v.oldVersion,v.newVersion,v))}).catch(()=>{}),E}const dc=["get","getKey","getAll","getAllKeys","count"],fc=["put","add","delete","clear"],si=new Map;function Js(i,e){if(!(i instanceof IDBDatabase&&!(e in i)&&typeof e=="string"))return;if(si.get(e))return si.get(e);const n=e.replace(/FromIndex$/,""),s=e!==n,o=fc.includes(n);if(!(n in(s?IDBIndex:IDBObjectStore).prototype)||!(o||dc.includes(n)))return;const c=async function(l,...E){const w=this.transaction(l,o?"readwrite":"readonly");let v=w.store;return s&&(v=v.index(E.shift())),(await Promise.all([v[n](...E),o&&w.done]))[0]};return si.set(e,c),c}cc(i=>({...i,get:(e,n,s)=>Js(e,n)||i.get(e,n,s),has:(e,n)=>!!Js(e,n)||i.has(e,n)}));/**
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
 */class pc{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(n=>{if(gc(n)){const s=n.getImmediate();return`${s.library}/${s.version}`}else return null}).filter(n=>n).join(" ")}}function gc(i){const e=i.getComponent();return(e==null?void 0:e.type)==="VERSION"}const pi="@firebase/app",Xs="0.14.3";/**
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
 */const _e=new Si("@firebase/app"),mc="@firebase/app-compat",_c="@firebase/analytics-compat",yc="@firebase/analytics",Ic="@firebase/app-check-compat",Ec="@firebase/app-check",wc="@firebase/auth",vc="@firebase/auth-compat",Tc="@firebase/database",Ac="@firebase/data-connect",Sc="@firebase/database-compat",bc="@firebase/functions",Cc="@firebase/functions-compat",Pc="@firebase/installations",Rc="@firebase/installations-compat",kc="@firebase/messaging",Nc="@firebase/messaging-compat",Dc="@firebase/performance",Oc="@firebase/performance-compat",Lc="@firebase/remote-config",Mc="@firebase/remote-config-compat",Uc="@firebase/storage",xc="@firebase/storage-compat",Vc="@firebase/firestore",Fc="@firebase/ai",jc="@firebase/firestore-compat",Bc="firebase",Hc="12.3.0";/**
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
 */const gi="[DEFAULT]",$c={[pi]:"fire-core",[mc]:"fire-core-compat",[yc]:"fire-analytics",[_c]:"fire-analytics-compat",[Ec]:"fire-app-check",[Ic]:"fire-app-check-compat",[wc]:"fire-auth",[vc]:"fire-auth-compat",[Tc]:"fire-rtdb",[Ac]:"fire-data-connect",[Sc]:"fire-rtdb-compat",[bc]:"fire-fn",[Cc]:"fire-fn-compat",[Pc]:"fire-iid",[Rc]:"fire-iid-compat",[kc]:"fire-fcm",[Nc]:"fire-fcm-compat",[Dc]:"fire-perf",[Oc]:"fire-perf-compat",[Lc]:"fire-rc",[Mc]:"fire-rc-compat",[Uc]:"fire-gcs",[xc]:"fire-gcs-compat",[Vc]:"fire-fst",[jc]:"fire-fst-compat",[Fc]:"fire-vertex","fire-js":"fire-js",[Bc]:"fire-js-all"};/**
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
 */const xt=new Map,Wc=new Map,mi=new Map;function Ys(i,e){try{i.container.addComponent(e)}catch(n){_e.debug(`Component ${e.name} failed to register with FirebaseApp ${i.name}`,n)}}function lt(i){const e=i.name;if(mi.has(e))return _e.debug(`There were multiple attempts to register component ${e}.`),!1;mi.set(e,i);for(const n of xt.values())Ys(n,i);for(const n of Wc.values())Ys(n,i);return!0}function Ci(i,e){const n=i.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),i.container.getProvider(e)}function te(i){return i==null?!1:i.settings!==void 0}/**
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
 */const zc={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},Me=new Ht("app","Firebase",zc);/**
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
 */class Gc{constructor(e,n,s){this._isDeleted=!1,this._options={...e},this._config={...n},this._name=n.name,this._automaticDataCollectionEnabled=n.automaticDataCollectionEnabled,this._container=s,this.container.addComponent(new Ye("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw Me.create("app-deleted",{appName:this._name})}}/**
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
 */const ft=Hc;function Wr(i,e={}){let n=i;typeof e!="object"&&(e={name:e});const s={name:gi,automaticDataCollectionEnabled:!0,...e},o=s.name;if(typeof o!="string"||!o)throw Me.create("bad-app-name",{appName:String(o)});if(n||(n=Vr()),!n)throw Me.create("no-options");const c=xt.get(o);if(c){if(Xe(n,c.options)&&Xe(s,c.config))return c;throw Me.create("duplicate-app",{appName:o})}const l=new Za(o);for(const w of mi.values())l.addComponent(w);const E=new Gc(n,s,l);return xt.set(o,E),E}function Pi(i=gi){const e=xt.get(i);if(!e&&i===gi&&Vr())return Wr();if(!e)throw Me.create("no-app",{appName:i});return e}function qc(){return Array.from(xt.values())}function Ue(i,e,n){let s=$c[i]??i;n&&(s+=`-${n}`);const o=s.match(/\s|\//),c=e.match(/\s|\//);if(o||c){const l=[`Unable to register library "${s}" with version "${e}":`];o&&l.push(`library name "${s}" contains illegal characters (whitespace or "/")`),o&&c&&l.push("and"),c&&l.push(`version name "${e}" contains illegal characters (whitespace or "/")`),_e.warn(l.join(" "));return}lt(new Ye(`${s}-version`,()=>({library:s,version:e}),"VERSION"))}/**
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
 */const Kc="firebase-heartbeat-database",Jc=1,Vt="firebase-heartbeat-store";let ri=null;function zr(){return ri||(ri=uc(Kc,Jc,{upgrade:(i,e)=>{switch(e){case 0:try{i.createObjectStore(Vt)}catch(n){console.warn(n)}}}}).catch(i=>{throw Me.create("idb-open",{originalErrorMessage:i.message})})),ri}async function Xc(i){try{const n=(await zr()).transaction(Vt),s=await n.objectStore(Vt).get(Gr(i));return await n.done,s}catch(e){if(e instanceof Ie)_e.warn(e.message);else{const n=Me.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});_e.warn(n.message)}}}async function Zs(i,e){try{const s=(await zr()).transaction(Vt,"readwrite");await s.objectStore(Vt).put(e,Gr(i)),await s.done}catch(n){if(n instanceof Ie)_e.warn(n.message);else{const s=Me.create("idb-set",{originalErrorMessage:n==null?void 0:n.message});_e.warn(s.message)}}}function Gr(i){return`${i.name}!${i.options.appId}`}/**
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
 */const Yc=1024,Zc=30;class Qc{constructor(e){this.container=e,this._heartbeatsCache=null;const n=this.container.getProvider("app").getImmediate();this._storage=new th(n),this._heartbeatsCachePromise=this._storage.read().then(s=>(this._heartbeatsCache=s,s))}async triggerHeartbeat(){var e,n;try{const o=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),c=Qs();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((n=this._heartbeatsCache)==null?void 0:n.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===c||this._heartbeatsCache.heartbeats.some(l=>l.date===c))return;if(this._heartbeatsCache.heartbeats.push({date:c,agent:o}),this._heartbeatsCache.heartbeats.length>Zc){const l=nh(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(l,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(s){_e.warn(s)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const n=Qs(),{heartbeatsToSend:s,unsentEntries:o}=eh(this._heartbeatsCache.heartbeats),c=mn(JSON.stringify({version:2,heartbeats:s}));return this._heartbeatsCache.lastSentHeartbeatDate=n,o.length>0?(this._heartbeatsCache.heartbeats=o,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),c}catch(n){return _e.warn(n),""}}}function Qs(){return new Date().toISOString().substring(0,10)}function eh(i,e=Yc){const n=[];let s=i.slice();for(const o of i){const c=n.find(l=>l.agent===o.agent);if(c){if(c.dates.push(o.date),er(n)>e){c.dates.pop();break}}else if(n.push({agent:o.agent,dates:[o.date]}),er(n)>e){n.pop();break}s=s.slice(1)}return{heartbeatsToSend:n,unsentEntries:s}}class th{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Ma()?Ua().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const n=await Xc(this.app);return n!=null&&n.heartbeats?n:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const s=await this.read();return Zs(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??s.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const s=await this.read();return Zs(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??s.lastSentHeartbeatDate,heartbeats:[...s.heartbeats,...e.heartbeats]})}else return}}function er(i){return mn(JSON.stringify({version:2,heartbeats:i})).length}function nh(i){if(i.length===0)return-1;let e=0,n=i[0].date;for(let s=1;s<i.length;s++)i[s].date<n&&(n=i[s].date,e=s);return e}/**
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
 */function ih(i){lt(new Ye("platform-logger",e=>new pc(e),"PRIVATE")),lt(new Ye("heartbeat",e=>new Qc(e),"PRIVATE")),Ue(pi,Xs,i),Ue(pi,Xs,"esm2020"),Ue("fire-js","")}ih("");var sh="firebase",rh="12.3.0";/**
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
 */Ue(sh,rh,"app");var tr=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Ri;(function(){var i;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(g,u){function f(){}f.prototype=u.prototype,g.F=u.prototype,g.prototype=new f,g.prototype.constructor=g,g.D=function(m,p,y){for(var d=Array(arguments.length-2),J=2;J<arguments.length;J++)d[J-2]=arguments[J];return u.prototype[p].apply(m,d)}}function n(){this.blockSize=-1}function s(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(s,n),s.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function o(g,u,f){f||(f=0);const m=Array(16);if(typeof u=="string")for(var p=0;p<16;++p)m[p]=u.charCodeAt(f++)|u.charCodeAt(f++)<<8|u.charCodeAt(f++)<<16|u.charCodeAt(f++)<<24;else for(p=0;p<16;++p)m[p]=u[f++]|u[f++]<<8|u[f++]<<16|u[f++]<<24;u=g.g[0],f=g.g[1],p=g.g[2];let y=g.g[3],d;d=u+(y^f&(p^y))+m[0]+3614090360&4294967295,u=f+(d<<7&4294967295|d>>>25),d=y+(p^u&(f^p))+m[1]+3905402710&4294967295,y=u+(d<<12&4294967295|d>>>20),d=p+(f^y&(u^f))+m[2]+606105819&4294967295,p=y+(d<<17&4294967295|d>>>15),d=f+(u^p&(y^u))+m[3]+3250441966&4294967295,f=p+(d<<22&4294967295|d>>>10),d=u+(y^f&(p^y))+m[4]+4118548399&4294967295,u=f+(d<<7&4294967295|d>>>25),d=y+(p^u&(f^p))+m[5]+1200080426&4294967295,y=u+(d<<12&4294967295|d>>>20),d=p+(f^y&(u^f))+m[6]+2821735955&4294967295,p=y+(d<<17&4294967295|d>>>15),d=f+(u^p&(y^u))+m[7]+4249261313&4294967295,f=p+(d<<22&4294967295|d>>>10),d=u+(y^f&(p^y))+m[8]+1770035416&4294967295,u=f+(d<<7&4294967295|d>>>25),d=y+(p^u&(f^p))+m[9]+2336552879&4294967295,y=u+(d<<12&4294967295|d>>>20),d=p+(f^y&(u^f))+m[10]+4294925233&4294967295,p=y+(d<<17&4294967295|d>>>15),d=f+(u^p&(y^u))+m[11]+2304563134&4294967295,f=p+(d<<22&4294967295|d>>>10),d=u+(y^f&(p^y))+m[12]+1804603682&4294967295,u=f+(d<<7&4294967295|d>>>25),d=y+(p^u&(f^p))+m[13]+4254626195&4294967295,y=u+(d<<12&4294967295|d>>>20),d=p+(f^y&(u^f))+m[14]+2792965006&4294967295,p=y+(d<<17&4294967295|d>>>15),d=f+(u^p&(y^u))+m[15]+1236535329&4294967295,f=p+(d<<22&4294967295|d>>>10),d=u+(p^y&(f^p))+m[1]+4129170786&4294967295,u=f+(d<<5&4294967295|d>>>27),d=y+(f^p&(u^f))+m[6]+3225465664&4294967295,y=u+(d<<9&4294967295|d>>>23),d=p+(u^f&(y^u))+m[11]+643717713&4294967295,p=y+(d<<14&4294967295|d>>>18),d=f+(y^u&(p^y))+m[0]+3921069994&4294967295,f=p+(d<<20&4294967295|d>>>12),d=u+(p^y&(f^p))+m[5]+3593408605&4294967295,u=f+(d<<5&4294967295|d>>>27),d=y+(f^p&(u^f))+m[10]+38016083&4294967295,y=u+(d<<9&4294967295|d>>>23),d=p+(u^f&(y^u))+m[15]+3634488961&4294967295,p=y+(d<<14&4294967295|d>>>18),d=f+(y^u&(p^y))+m[4]+3889429448&4294967295,f=p+(d<<20&4294967295|d>>>12),d=u+(p^y&(f^p))+m[9]+568446438&4294967295,u=f+(d<<5&4294967295|d>>>27),d=y+(f^p&(u^f))+m[14]+3275163606&4294967295,y=u+(d<<9&4294967295|d>>>23),d=p+(u^f&(y^u))+m[3]+4107603335&4294967295,p=y+(d<<14&4294967295|d>>>18),d=f+(y^u&(p^y))+m[8]+1163531501&4294967295,f=p+(d<<20&4294967295|d>>>12),d=u+(p^y&(f^p))+m[13]+2850285829&4294967295,u=f+(d<<5&4294967295|d>>>27),d=y+(f^p&(u^f))+m[2]+4243563512&4294967295,y=u+(d<<9&4294967295|d>>>23),d=p+(u^f&(y^u))+m[7]+1735328473&4294967295,p=y+(d<<14&4294967295|d>>>18),d=f+(y^u&(p^y))+m[12]+2368359562&4294967295,f=p+(d<<20&4294967295|d>>>12),d=u+(f^p^y)+m[5]+4294588738&4294967295,u=f+(d<<4&4294967295|d>>>28),d=y+(u^f^p)+m[8]+2272392833&4294967295,y=u+(d<<11&4294967295|d>>>21),d=p+(y^u^f)+m[11]+1839030562&4294967295,p=y+(d<<16&4294967295|d>>>16),d=f+(p^y^u)+m[14]+4259657740&4294967295,f=p+(d<<23&4294967295|d>>>9),d=u+(f^p^y)+m[1]+2763975236&4294967295,u=f+(d<<4&4294967295|d>>>28),d=y+(u^f^p)+m[4]+1272893353&4294967295,y=u+(d<<11&4294967295|d>>>21),d=p+(y^u^f)+m[7]+4139469664&4294967295,p=y+(d<<16&4294967295|d>>>16),d=f+(p^y^u)+m[10]+3200236656&4294967295,f=p+(d<<23&4294967295|d>>>9),d=u+(f^p^y)+m[13]+681279174&4294967295,u=f+(d<<4&4294967295|d>>>28),d=y+(u^f^p)+m[0]+3936430074&4294967295,y=u+(d<<11&4294967295|d>>>21),d=p+(y^u^f)+m[3]+3572445317&4294967295,p=y+(d<<16&4294967295|d>>>16),d=f+(p^y^u)+m[6]+76029189&4294967295,f=p+(d<<23&4294967295|d>>>9),d=u+(f^p^y)+m[9]+3654602809&4294967295,u=f+(d<<4&4294967295|d>>>28),d=y+(u^f^p)+m[12]+3873151461&4294967295,y=u+(d<<11&4294967295|d>>>21),d=p+(y^u^f)+m[15]+530742520&4294967295,p=y+(d<<16&4294967295|d>>>16),d=f+(p^y^u)+m[2]+3299628645&4294967295,f=p+(d<<23&4294967295|d>>>9),d=u+(p^(f|~y))+m[0]+4096336452&4294967295,u=f+(d<<6&4294967295|d>>>26),d=y+(f^(u|~p))+m[7]+1126891415&4294967295,y=u+(d<<10&4294967295|d>>>22),d=p+(u^(y|~f))+m[14]+2878612391&4294967295,p=y+(d<<15&4294967295|d>>>17),d=f+(y^(p|~u))+m[5]+4237533241&4294967295,f=p+(d<<21&4294967295|d>>>11),d=u+(p^(f|~y))+m[12]+1700485571&4294967295,u=f+(d<<6&4294967295|d>>>26),d=y+(f^(u|~p))+m[3]+2399980690&4294967295,y=u+(d<<10&4294967295|d>>>22),d=p+(u^(y|~f))+m[10]+4293915773&4294967295,p=y+(d<<15&4294967295|d>>>17),d=f+(y^(p|~u))+m[1]+2240044497&4294967295,f=p+(d<<21&4294967295|d>>>11),d=u+(p^(f|~y))+m[8]+1873313359&4294967295,u=f+(d<<6&4294967295|d>>>26),d=y+(f^(u|~p))+m[15]+4264355552&4294967295,y=u+(d<<10&4294967295|d>>>22),d=p+(u^(y|~f))+m[6]+2734768916&4294967295,p=y+(d<<15&4294967295|d>>>17),d=f+(y^(p|~u))+m[13]+1309151649&4294967295,f=p+(d<<21&4294967295|d>>>11),d=u+(p^(f|~y))+m[4]+4149444226&4294967295,u=f+(d<<6&4294967295|d>>>26),d=y+(f^(u|~p))+m[11]+3174756917&4294967295,y=u+(d<<10&4294967295|d>>>22),d=p+(u^(y|~f))+m[2]+718787259&4294967295,p=y+(d<<15&4294967295|d>>>17),d=f+(y^(p|~u))+m[9]+3951481745&4294967295,g.g[0]=g.g[0]+u&4294967295,g.g[1]=g.g[1]+(p+(d<<21&4294967295|d>>>11))&4294967295,g.g[2]=g.g[2]+p&4294967295,g.g[3]=g.g[3]+y&4294967295}s.prototype.v=function(g,u){u===void 0&&(u=g.length);const f=u-this.blockSize,m=this.C;let p=this.h,y=0;for(;y<u;){if(p==0)for(;y<=f;)o(this,g,y),y+=this.blockSize;if(typeof g=="string"){for(;y<u;)if(m[p++]=g.charCodeAt(y++),p==this.blockSize){o(this,m),p=0;break}}else for(;y<u;)if(m[p++]=g[y++],p==this.blockSize){o(this,m),p=0;break}}this.h=p,this.o+=u},s.prototype.A=function(){var g=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);g[0]=128;for(var u=1;u<g.length-8;++u)g[u]=0;u=this.o*8;for(var f=g.length-8;f<g.length;++f)g[f]=u&255,u/=256;for(this.v(g),g=Array(16),u=0,f=0;f<4;++f)for(let m=0;m<32;m+=8)g[u++]=this.g[f]>>>m&255;return g};function c(g,u){var f=E;return Object.prototype.hasOwnProperty.call(f,g)?f[g]:f[g]=u(g)}function l(g,u){this.h=u;const f=[];let m=!0;for(let p=g.length-1;p>=0;p--){const y=g[p]|0;m&&y==u||(f[p]=y,m=!1)}this.g=f}var E={};function w(g){return-128<=g&&g<128?c(g,function(u){return new l([u|0],u<0?-1:0)}):new l([g|0],g<0?-1:0)}function v(g){if(isNaN(g)||!isFinite(g))return S;if(g<0)return U(v(-g));const u=[];let f=1;for(let m=0;g>=f;m++)u[m]=g/f|0,f*=4294967296;return new l(u,0)}function b(g,u){if(g.length==0)throw Error("number format error: empty string");if(u=u||10,u<2||36<u)throw Error("radix out of range: "+u);if(g.charAt(0)=="-")return U(b(g.substring(1),u));if(g.indexOf("-")>=0)throw Error('number format error: interior "-" character');const f=v(Math.pow(u,8));let m=S;for(let y=0;y<g.length;y+=8){var p=Math.min(8,g.length-y);const d=parseInt(g.substring(y,y+p),u);p<8?(p=v(Math.pow(u,p)),m=m.j(p).add(v(d))):(m=m.j(f),m=m.add(v(d)))}return m}var S=w(0),A=w(1),x=w(16777216);i=l.prototype,i.m=function(){if(F(this))return-U(this).m();let g=0,u=1;for(let f=0;f<this.g.length;f++){const m=this.i(f);g+=(m>=0?m:4294967296+m)*u,u*=4294967296}return g},i.toString=function(g){if(g=g||10,g<2||36<g)throw Error("radix out of range: "+g);if(L(this))return"0";if(F(this))return"-"+U(this).toString(g);const u=v(Math.pow(g,6));var f=this;let m="";for(;;){const p=Ee(f,u).g;f=X(f,p.j(u));let y=((f.g.length>0?f.g[0]:f.h)>>>0).toString(g);if(f=p,L(f))return y+m;for(;y.length<6;)y="0"+y;m=y+m}},i.i=function(g){return g<0?0:g<this.g.length?this.g[g]:this.h};function L(g){if(g.h!=0)return!1;for(let u=0;u<g.g.length;u++)if(g.g[u]!=0)return!1;return!0}function F(g){return g.h==-1}i.l=function(g){return g=X(this,g),F(g)?-1:L(g)?0:1};function U(g){const u=g.g.length,f=[];for(let m=0;m<u;m++)f[m]=~g.g[m];return new l(f,~g.h).add(A)}i.abs=function(){return F(this)?U(this):this},i.add=function(g){const u=Math.max(this.g.length,g.g.length),f=[];let m=0;for(let p=0;p<=u;p++){let y=m+(this.i(p)&65535)+(g.i(p)&65535),d=(y>>>16)+(this.i(p)>>>16)+(g.i(p)>>>16);m=d>>>16,y&=65535,d&=65535,f[p]=d<<16|y}return new l(f,f[f.length-1]&-2147483648?-1:0)};function X(g,u){return g.add(U(u))}i.j=function(g){if(L(this)||L(g))return S;if(F(this))return F(g)?U(this).j(U(g)):U(U(this).j(g));if(F(g))return U(this.j(U(g)));if(this.l(x)<0&&g.l(x)<0)return v(this.m()*g.m());const u=this.g.length+g.g.length,f=[];for(var m=0;m<2*u;m++)f[m]=0;for(m=0;m<this.g.length;m++)for(let p=0;p<g.g.length;p++){const y=this.i(m)>>>16,d=this.i(m)&65535,J=g.i(p)>>>16,Fe=g.i(p)&65535;f[2*m+2*p]+=d*Fe,Y(f,2*m+2*p),f[2*m+2*p+1]+=y*Fe,Y(f,2*m+2*p+1),f[2*m+2*p+1]+=d*J,Y(f,2*m+2*p+1),f[2*m+2*p+2]+=y*J,Y(f,2*m+2*p+2)}for(g=0;g<u;g++)f[g]=f[2*g+1]<<16|f[2*g];for(g=u;g<2*u;g++)f[g]=0;return new l(f,0)};function Y(g,u){for(;(g[u]&65535)!=g[u];)g[u+1]+=g[u]>>>16,g[u]&=65535,u++}function Z(g,u){this.g=g,this.h=u}function Ee(g,u){if(L(u))throw Error("division by zero");if(L(g))return new Z(S,S);if(F(g))return u=Ee(U(g),u),new Z(U(u.g),U(u.h));if(F(u))return u=Ee(g,U(u)),new Z(U(u.g),u.h);if(g.g.length>30){if(F(g)||F(u))throw Error("slowDivide_ only works with positive integers.");for(var f=A,m=u;m.l(g)<=0;)f=we(f),m=we(m);var p=Q(f,1),y=Q(m,1);for(m=Q(m,2),f=Q(f,2);!L(m);){var d=y.add(m);d.l(g)<=0&&(p=p.add(f),y=d),m=Q(m,1),f=Q(f,1)}return u=X(g,p.j(u)),new Z(p,u)}for(p=S;g.l(u)>=0;){for(f=Math.max(1,Math.floor(g.m()/u.m())),m=Math.ceil(Math.log(f)/Math.LN2),m=m<=48?1:Math.pow(2,m-48),y=v(f),d=y.j(u);F(d)||d.l(g)>0;)f-=m,y=v(f),d=y.j(u);L(y)&&(y=A),p=p.add(y),g=X(g,d)}return new Z(p,g)}i.B=function(g){return Ee(this,g).h},i.and=function(g){const u=Math.max(this.g.length,g.g.length),f=[];for(let m=0;m<u;m++)f[m]=this.i(m)&g.i(m);return new l(f,this.h&g.h)},i.or=function(g){const u=Math.max(this.g.length,g.g.length),f=[];for(let m=0;m<u;m++)f[m]=this.i(m)|g.i(m);return new l(f,this.h|g.h)},i.xor=function(g){const u=Math.max(this.g.length,g.g.length),f=[];for(let m=0;m<u;m++)f[m]=this.i(m)^g.i(m);return new l(f,this.h^g.h)};function we(g){const u=g.g.length+1,f=[];for(let m=0;m<u;m++)f[m]=g.i(m)<<1|g.i(m-1)>>>31;return new l(f,g.h)}function Q(g,u){const f=u>>5;u%=32;const m=g.g.length-f,p=[];for(let y=0;y<m;y++)p[y]=u>0?g.i(y+f)>>>u|g.i(y+f+1)<<32-u:g.i(y+f);return new l(p,g.h)}s.prototype.digest=s.prototype.A,s.prototype.reset=s.prototype.u,s.prototype.update=s.prototype.v,l.prototype.add=l.prototype.add,l.prototype.multiply=l.prototype.j,l.prototype.modulo=l.prototype.B,l.prototype.compare=l.prototype.l,l.prototype.toNumber=l.prototype.m,l.prototype.toString=l.prototype.toString,l.prototype.getBits=l.prototype.i,l.fromNumber=v,l.fromString=b,Ri=l}).apply(typeof tr<"u"?tr:typeof self<"u"?self:typeof window<"u"?window:{});var cn=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};(function(){var i,e=Object.defineProperty;function n(t){t=[typeof globalThis=="object"&&globalThis,t,typeof window=="object"&&window,typeof self=="object"&&self,typeof cn=="object"&&cn];for(var r=0;r<t.length;++r){var a=t[r];if(a&&a.Math==Math)return a}throw Error("Cannot find global object")}var s=n(this);function o(t,r){if(r)e:{var a=s;t=t.split(".");for(var h=0;h<t.length-1;h++){var _=t[h];if(!(_ in a))break e;a=a[_]}t=t[t.length-1],h=a[t],r=r(h),r!=h&&r!=null&&e(a,t,{configurable:!0,writable:!0,value:r})}}o("Symbol.dispose",function(t){return t||Symbol("Symbol.dispose")}),o("Array.prototype.values",function(t){return t||function(){return this[Symbol.iterator]()}}),o("Object.entries",function(t){return t||function(r){var a=[],h;for(h in r)Object.prototype.hasOwnProperty.call(r,h)&&a.push([h,r[h]]);return a}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var c=c||{},l=this||self;function E(t){var r=typeof t;return r=="object"&&t!=null||r=="function"}function w(t,r,a){return t.call.apply(t.bind,arguments)}function v(t,r,a){return v=w,v.apply(null,arguments)}function b(t,r){var a=Array.prototype.slice.call(arguments,1);return function(){var h=a.slice();return h.push.apply(h,arguments),t.apply(this,h)}}function S(t,r){function a(){}a.prototype=r.prototype,t.Z=r.prototype,t.prototype=new a,t.prototype.constructor=t,t.Ob=function(h,_,I){for(var T=Array(arguments.length-2),P=2;P<arguments.length;P++)T[P-2]=arguments[P];return r.prototype[_].apply(h,T)}}var A=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?t=>t&&AsyncContext.Snapshot.wrap(t):t=>t;function x(t){const r=t.length;if(r>0){const a=Array(r);for(let h=0;h<r;h++)a[h]=t[h];return a}return[]}function L(t,r){for(let h=1;h<arguments.length;h++){const _=arguments[h];var a=typeof _;if(a=a!="object"?a:_?Array.isArray(_)?"array":a:"null",a=="array"||a=="object"&&typeof _.length=="number"){a=t.length||0;const I=_.length||0;t.length=a+I;for(let T=0;T<I;T++)t[a+T]=_[T]}else t.push(_)}}class F{constructor(r,a){this.i=r,this.j=a,this.h=0,this.g=null}get(){let r;return this.h>0?(this.h--,r=this.g,this.g=r.next,r.next=null):r=this.i(),r}}function U(t){l.setTimeout(()=>{throw t},0)}function X(){var t=g;let r=null;return t.g&&(r=t.g,t.g=t.g.next,t.g||(t.h=null),r.next=null),r}class Y{constructor(){this.h=this.g=null}add(r,a){const h=Z.get();h.set(r,a),this.h?this.h.next=h:this.g=h,this.h=h}}var Z=new F(()=>new Ee,t=>t.reset());class Ee{constructor(){this.next=this.g=this.h=null}set(r,a){this.h=r,this.g=a,this.next=null}reset(){this.next=this.g=this.h=null}}let we,Q=!1,g=new Y,u=()=>{const t=Promise.resolve(void 0);we=()=>{t.then(f)}};function f(){for(var t;t=X();){try{t.h.call(t.g)}catch(a){U(a)}var r=Z;r.j(t),r.h<100&&(r.h++,t.next=r.g,r.g=t)}Q=!1}function m(){this.u=this.u,this.C=this.C}m.prototype.u=!1,m.prototype.dispose=function(){this.u||(this.u=!0,this.N())},m.prototype[Symbol.dispose]=function(){this.dispose()},m.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function p(t,r){this.type=t,this.g=this.target=r,this.defaultPrevented=!1}p.prototype.h=function(){this.defaultPrevented=!0};var y=function(){if(!l.addEventListener||!Object.defineProperty)return!1;var t=!1,r=Object.defineProperty({},"passive",{get:function(){t=!0}});try{const a=()=>{};l.addEventListener("test",a,r),l.removeEventListener("test",a,r)}catch{}return t}();function d(t){return/^[\s\xa0]*$/.test(t)}function J(t,r){p.call(this,t?t.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,t&&this.init(t,r)}S(J,p),J.prototype.init=function(t,r){const a=this.type=t.type,h=t.changedTouches&&t.changedTouches.length?t.changedTouches[0]:null;this.target=t.target||t.srcElement,this.g=r,r=t.relatedTarget,r||(a=="mouseover"?r=t.fromElement:a=="mouseout"&&(r=t.toElement)),this.relatedTarget=r,h?(this.clientX=h.clientX!==void 0?h.clientX:h.pageX,this.clientY=h.clientY!==void 0?h.clientY:h.pageY,this.screenX=h.screenX||0,this.screenY=h.screenY||0):(this.clientX=t.clientX!==void 0?t.clientX:t.pageX,this.clientY=t.clientY!==void 0?t.clientY:t.pageY,this.screenX=t.screenX||0,this.screenY=t.screenY||0),this.button=t.button,this.key=t.key||"",this.ctrlKey=t.ctrlKey,this.altKey=t.altKey,this.shiftKey=t.shiftKey,this.metaKey=t.metaKey,this.pointerId=t.pointerId||0,this.pointerType=t.pointerType,this.state=t.state,this.i=t,t.defaultPrevented&&J.Z.h.call(this)},J.prototype.h=function(){J.Z.h.call(this);const t=this.i;t.preventDefault?t.preventDefault():t.returnValue=!1};var Fe="closure_listenable_"+(Math.random()*1e6|0),Mo=0;function Uo(t,r,a,h,_){this.listener=t,this.proxy=null,this.src=r,this.type=a,this.capture=!!h,this.ha=_,this.key=++Mo,this.da=this.fa=!1}function Jt(t){t.da=!0,t.listener=null,t.proxy=null,t.src=null,t.ha=null}function Xt(t,r,a){for(const h in t)r.call(a,t[h],h,t)}function xo(t,r){for(const a in t)r.call(void 0,t[a],a,t)}function Wi(t){const r={};for(const a in t)r[a]=t[a];return r}const zi="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function Gi(t,r){let a,h;for(let _=1;_<arguments.length;_++){h=arguments[_];for(a in h)t[a]=h[a];for(let I=0;I<zi.length;I++)a=zi[I],Object.prototype.hasOwnProperty.call(h,a)&&(t[a]=h[a])}}function Yt(t){this.src=t,this.g={},this.h=0}Yt.prototype.add=function(t,r,a,h,_){const I=t.toString();t=this.g[I],t||(t=this.g[I]=[],this.h++);const T=Rn(t,r,h,_);return T>-1?(r=t[T],a||(r.fa=!1)):(r=new Uo(r,this.src,I,!!h,_),r.fa=a,t.push(r)),r};function Pn(t,r){const a=r.type;if(a in t.g){var h=t.g[a],_=Array.prototype.indexOf.call(h,r,void 0),I;(I=_>=0)&&Array.prototype.splice.call(h,_,1),I&&(Jt(r),t.g[a].length==0&&(delete t.g[a],t.h--))}}function Rn(t,r,a,h){for(let _=0;_<t.length;++_){const I=t[_];if(!I.da&&I.listener==r&&I.capture==!!a&&I.ha==h)return _}return-1}var kn="closure_lm_"+(Math.random()*1e6|0),Nn={};function qi(t,r,a,h,_){if(Array.isArray(r)){for(let I=0;I<r.length;I++)qi(t,r[I],a,h,_);return null}return a=Xi(a),t&&t[Fe]?t.J(r,a,E(h)?!!h.capture:!1,_):Vo(t,r,a,!1,h,_)}function Vo(t,r,a,h,_,I){if(!r)throw Error("Invalid event type");const T=E(_)?!!_.capture:!!_;let P=On(t);if(P||(t[kn]=P=new Yt(t)),a=P.add(r,a,h,T,I),a.proxy)return a;if(h=Fo(),a.proxy=h,h.src=t,h.listener=a,t.addEventListener)y||(_=T),_===void 0&&(_=!1),t.addEventListener(r.toString(),h,_);else if(t.attachEvent)t.attachEvent(Ji(r.toString()),h);else if(t.addListener&&t.removeListener)t.addListener(h);else throw Error("addEventListener and attachEvent are unavailable.");return a}function Fo(){function t(a){return r.call(t.src,t.listener,a)}const r=jo;return t}function Ki(t,r,a,h,_){if(Array.isArray(r))for(var I=0;I<r.length;I++)Ki(t,r[I],a,h,_);else h=E(h)?!!h.capture:!!h,a=Xi(a),t&&t[Fe]?(t=t.i,I=String(r).toString(),I in t.g&&(r=t.g[I],a=Rn(r,a,h,_),a>-1&&(Jt(r[a]),Array.prototype.splice.call(r,a,1),r.length==0&&(delete t.g[I],t.h--)))):t&&(t=On(t))&&(r=t.g[r.toString()],t=-1,r&&(t=Rn(r,a,h,_)),(a=t>-1?r[t]:null)&&Dn(a))}function Dn(t){if(typeof t!="number"&&t&&!t.da){var r=t.src;if(r&&r[Fe])Pn(r.i,t);else{var a=t.type,h=t.proxy;r.removeEventListener?r.removeEventListener(a,h,t.capture):r.detachEvent?r.detachEvent(Ji(a),h):r.addListener&&r.removeListener&&r.removeListener(h),(a=On(r))?(Pn(a,t),a.h==0&&(a.src=null,r[kn]=null)):Jt(t)}}}function Ji(t){return t in Nn?Nn[t]:Nn[t]="on"+t}function jo(t,r){if(t.da)t=!0;else{r=new J(r,this);const a=t.listener,h=t.ha||t.src;t.fa&&Dn(t),t=a.call(h,r)}return t}function On(t){return t=t[kn],t instanceof Yt?t:null}var Ln="__closure_events_fn_"+(Math.random()*1e9>>>0);function Xi(t){return typeof t=="function"?t:(t[Ln]||(t[Ln]=function(r){return t.handleEvent(r)}),t[Ln])}function W(){m.call(this),this.i=new Yt(this),this.M=this,this.G=null}S(W,m),W.prototype[Fe]=!0,W.prototype.removeEventListener=function(t,r,a,h){Ki(this,t,r,a,h)};function z(t,r){var a,h=t.G;if(h)for(a=[];h;h=h.G)a.push(h);if(t=t.M,h=r.type||r,typeof r=="string")r=new p(r,t);else if(r instanceof p)r.target=r.target||t;else{var _=r;r=new p(h,t),Gi(r,_)}_=!0;let I,T;if(a)for(T=a.length-1;T>=0;T--)I=r.g=a[T],_=Zt(I,h,!0,r)&&_;if(I=r.g=t,_=Zt(I,h,!0,r)&&_,_=Zt(I,h,!1,r)&&_,a)for(T=0;T<a.length;T++)I=r.g=a[T],_=Zt(I,h,!1,r)&&_}W.prototype.N=function(){if(W.Z.N.call(this),this.i){var t=this.i;for(const r in t.g){const a=t.g[r];for(let h=0;h<a.length;h++)Jt(a[h]);delete t.g[r],t.h--}}this.G=null},W.prototype.J=function(t,r,a,h){return this.i.add(String(t),r,!1,a,h)},W.prototype.K=function(t,r,a,h){return this.i.add(String(t),r,!0,a,h)};function Zt(t,r,a,h){if(r=t.i.g[String(r)],!r)return!0;r=r.concat();let _=!0;for(let I=0;I<r.length;++I){const T=r[I];if(T&&!T.da&&T.capture==a){const P=T.listener,H=T.ha||T.src;T.fa&&Pn(t.i,T),_=P.call(H,h)!==!1&&_}}return _&&!h.defaultPrevented}function Bo(t,r){if(typeof t!="function")if(t&&typeof t.handleEvent=="function")t=v(t.handleEvent,t);else throw Error("Invalid listener argument");return Number(r)>2147483647?-1:l.setTimeout(t,r||0)}function Yi(t){t.g=Bo(()=>{t.g=null,t.i&&(t.i=!1,Yi(t))},t.l);const r=t.h;t.h=null,t.m.apply(null,r)}class Ho extends m{constructor(r,a){super(),this.m=r,this.l=a,this.h=null,this.i=!1,this.g=null}j(r){this.h=arguments,this.g?this.i=!0:Yi(this)}N(){super.N(),this.g&&(l.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function mt(t){m.call(this),this.h=t,this.g={}}S(mt,m);var Zi=[];function Qi(t){Xt(t.g,function(r,a){this.g.hasOwnProperty(a)&&Dn(r)},t),t.g={}}mt.prototype.N=function(){mt.Z.N.call(this),Qi(this)},mt.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Mn=l.JSON.stringify,$o=l.JSON.parse,Wo=class{stringify(t){return l.JSON.stringify(t,void 0)}parse(t){return l.JSON.parse(t,void 0)}};function es(){}function zo(){}var _t={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function Un(){p.call(this,"d")}S(Un,p);function xn(){p.call(this,"c")}S(xn,p);var nt={},ts=null;function Vn(){return ts=ts||new W}nt.Ia="serverreachability";function ns(t){p.call(this,nt.Ia,t)}S(ns,p);function yt(t){const r=Vn();z(r,new ns(r))}nt.STAT_EVENT="statevent";function is(t,r){p.call(this,nt.STAT_EVENT,t),this.stat=r}S(is,p);function G(t){const r=Vn();z(r,new is(r,t))}nt.Ja="timingevent";function ss(t,r){p.call(this,nt.Ja,t),this.size=r}S(ss,p);function It(t,r){if(typeof t!="function")throw Error("Fn must not be null and must be a function");return l.setTimeout(function(){t()},r)}function Et(){this.g=!0}Et.prototype.ua=function(){this.g=!1};function Go(t,r,a,h,_,I){t.info(function(){if(t.g)if(I){var T="",P=I.split("&");for(let O=0;O<P.length;O++){var H=P[O].split("=");if(H.length>1){const $=H[0];H=H[1];const ae=$.split("_");T=ae.length>=2&&ae[1]=="type"?T+($+"="+H+"&"):T+($+"=redacted&")}}}else T=null;else T=I;return"XMLHTTP REQ ("+h+") [attempt "+_+"]: "+r+`
`+a+`
`+T})}function qo(t,r,a,h,_,I,T){t.info(function(){return"XMLHTTP RESP ("+h+") [ attempt "+_+"]: "+r+`
`+a+`
`+I+" "+T})}function it(t,r,a,h){t.info(function(){return"XMLHTTP TEXT ("+r+"): "+Jo(t,a)+(h?" "+h:"")})}function Ko(t,r){t.info(function(){return"TIMEOUT: "+r})}Et.prototype.info=function(){};function Jo(t,r){if(!t.g)return r;if(!r)return null;try{const I=JSON.parse(r);if(I){for(t=0;t<I.length;t++)if(Array.isArray(I[t])){var a=I[t];if(!(a.length<2)){var h=a[1];if(Array.isArray(h)&&!(h.length<1)){var _=h[0];if(_!="noop"&&_!="stop"&&_!="close")for(let T=1;T<h.length;T++)h[T]=""}}}}return Mn(I)}catch{return r}}var Fn={NO_ERROR:0,TIMEOUT:8},Xo={},rs;function jn(){}S(jn,es),jn.prototype.g=function(){return new XMLHttpRequest},rs=new jn;function wt(t){return encodeURIComponent(String(t))}function Yo(t){var r=1;t=t.split(":");const a=[];for(;r>0&&t.length;)a.push(t.shift()),r--;return t.length&&a.push(t.join(":")),a}function ve(t,r,a,h){this.j=t,this.i=r,this.l=a,this.S=h||1,this.V=new mt(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new os}function os(){this.i=null,this.g="",this.h=!1}var as={},Bn={};function Hn(t,r,a){t.M=1,t.A=en(oe(r)),t.u=a,t.R=!0,cs(t,null)}function cs(t,r){t.F=Date.now(),Qt(t),t.B=oe(t.A);var a=t.B,h=t.S;Array.isArray(h)||(h=[String(h)]),ws(a.i,"t",h),t.C=0,a=t.j.L,t.h=new os,t.g=Fs(t.j,a?r:null,!t.u),t.P>0&&(t.O=new Ho(v(t.Y,t,t.g),t.P)),r=t.V,a=t.g,h=t.ba;var _="readystatechange";Array.isArray(_)||(_&&(Zi[0]=_.toString()),_=Zi);for(let I=0;I<_.length;I++){const T=qi(a,_[I],h||r.handleEvent,!1,r.h||r);if(!T)break;r.g[T.key]=T}r=t.J?Wi(t.J):{},t.u?(t.v||(t.v="POST"),r["Content-Type"]="application/x-www-form-urlencoded",t.g.ea(t.B,t.v,t.u,r)):(t.v="GET",t.g.ea(t.B,t.v,null,r)),yt(),Go(t.i,t.v,t.B,t.l,t.S,t.u)}ve.prototype.ba=function(t){t=t.target;const r=this.O;r&&Se(t)==3?r.j():this.Y(t)},ve.prototype.Y=function(t){try{if(t==this.g)e:{const P=Se(this.g),H=this.g.ya(),O=this.g.ca();if(!(P<3)&&(P!=3||this.g&&(this.h.h||this.g.la()||Ps(this.g)))){this.K||P!=4||H==7||(H==8||O<=0?yt(3):yt(2)),$n(this);var r=this.g.ca();this.X=r;var a=Zo(this);if(this.o=r==200,qo(this.i,this.v,this.B,this.l,this.S,P,r),this.o){if(this.U&&!this.L){t:{if(this.g){var h,_=this.g;if((h=_.g?_.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!d(h)){var I=h;break t}}I=null}if(t=I)it(this.i,this.l,t,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,Wn(this,t);else{this.o=!1,this.m=3,G(12),je(this),vt(this);break e}}if(this.R){t=!0;let $;for(;!this.K&&this.C<a.length;)if($=Qo(this,a),$==Bn){P==4&&(this.m=4,G(14),t=!1),it(this.i,this.l,null,"[Incomplete Response]");break}else if($==as){this.m=4,G(15),it(this.i,this.l,a,"[Invalid Chunk]"),t=!1;break}else it(this.i,this.l,$,null),Wn(this,$);if(hs(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),P!=4||a.length!=0||this.h.h||(this.m=1,G(16),t=!1),this.o=this.o&&t,!t)it(this.i,this.l,a,"[Invalid Chunked Response]"),je(this),vt(this);else if(a.length>0&&!this.W){this.W=!0;var T=this.j;T.g==this&&T.aa&&!T.P&&(T.j.info("Great, no buffering proxy detected. Bytes received: "+a.length),Zn(T),T.P=!0,G(11))}}else it(this.i,this.l,a,null),Wn(this,a);P==4&&je(this),this.o&&!this.K&&(P==4?Ms(this.j,this):(this.o=!1,Qt(this)))}else fa(this.g),r==400&&a.indexOf("Unknown SID")>0?(this.m=3,G(12)):(this.m=0,G(13)),je(this),vt(this)}}}catch{}finally{}};function Zo(t){if(!hs(t))return t.g.la();const r=Ps(t.g);if(r==="")return"";let a="";const h=r.length,_=Se(t.g)==4;if(!t.h.i){if(typeof TextDecoder>"u")return je(t),vt(t),"";t.h.i=new l.TextDecoder}for(let I=0;I<h;I++)t.h.h=!0,a+=t.h.i.decode(r[I],{stream:!(_&&I==h-1)});return r.length=0,t.h.g+=a,t.C=0,t.h.g}function hs(t){return t.g?t.v=="GET"&&t.M!=2&&t.j.Aa:!1}function Qo(t,r){var a=t.C,h=r.indexOf(`
`,a);return h==-1?Bn:(a=Number(r.substring(a,h)),isNaN(a)?as:(h+=1,h+a>r.length?Bn:(r=r.slice(h,h+a),t.C=h+a,r)))}ve.prototype.cancel=function(){this.K=!0,je(this)};function Qt(t){t.T=Date.now()+t.H,ls(t,t.H)}function ls(t,r){if(t.D!=null)throw Error("WatchDog timer not null");t.D=It(v(t.aa,t),r)}function $n(t){t.D&&(l.clearTimeout(t.D),t.D=null)}ve.prototype.aa=function(){this.D=null;const t=Date.now();t-this.T>=0?(Ko(this.i,this.B),this.M!=2&&(yt(),G(17)),je(this),this.m=2,vt(this)):ls(this,this.T-t)};function vt(t){t.j.I==0||t.K||Ms(t.j,t)}function je(t){$n(t);var r=t.O;r&&typeof r.dispose=="function"&&r.dispose(),t.O=null,Qi(t.V),t.g&&(r=t.g,t.g=null,r.abort(),r.dispose())}function Wn(t,r){try{var a=t.j;if(a.I!=0&&(a.g==t||zn(a.h,t))){if(!t.L&&zn(a.h,t)&&a.I==3){try{var h=a.Ba.g.parse(r)}catch{h=null}if(Array.isArray(h)&&h.length==3){var _=h;if(_[0]==0){e:if(!a.v){if(a.g)if(a.g.F+3e3<t.F)on(a),sn(a);else break e;Yn(a),G(18)}}else a.xa=_[1],0<a.xa-a.K&&_[2]<37500&&a.F&&a.A==0&&!a.C&&(a.C=It(v(a.Va,a),6e3));fs(a.h)<=1&&a.ta&&(a.ta=void 0)}else He(a,11)}else if((t.L||a.g==t)&&on(a),!d(r))for(_=a.Ba.g.parse(r),r=0;r<_.length;r++){let O=_[r];const $=O[0];if(!($<=a.K))if(a.K=$,O=O[1],a.I==2)if(O[0]=="c"){a.M=O[1],a.ba=O[2];const ae=O[3];ae!=null&&(a.ka=ae,a.j.info("VER="+a.ka));const $e=O[4];$e!=null&&(a.za=$e,a.j.info("SVER="+a.za));const be=O[5];be!=null&&typeof be=="number"&&be>0&&(h=1.5*be,a.O=h,a.j.info("backChannelRequestTimeoutMs_="+h)),h=a;const Ce=t.g;if(Ce){const an=Ce.g?Ce.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(an){var I=h.h;I.g||an.indexOf("spdy")==-1&&an.indexOf("quic")==-1&&an.indexOf("h2")==-1||(I.j=I.l,I.g=new Set,I.h&&(Gn(I,I.h),I.h=null))}if(h.G){const Qn=Ce.g?Ce.g.getResponseHeader("X-HTTP-Session-Id"):null;Qn&&(h.wa=Qn,M(h.J,h.G,Qn))}}a.I=3,a.l&&a.l.ra(),a.aa&&(a.T=Date.now()-t.F,a.j.info("Handshake RTT: "+a.T+"ms")),h=a;var T=t;if(h.na=Vs(h,h.L?h.ba:null,h.W),T.L){ps(h.h,T);var P=T,H=h.O;H&&(P.H=H),P.D&&($n(P),Qt(P)),h.g=T}else Os(h);a.i.length>0&&rn(a)}else O[0]!="stop"&&O[0]!="close"||He(a,7);else a.I==3&&(O[0]=="stop"||O[0]=="close"?O[0]=="stop"?He(a,7):Xn(a):O[0]!="noop"&&a.l&&a.l.qa(O),a.A=0)}}yt(4)}catch{}}var ea=class{constructor(t,r){this.g=t,this.map=r}};function us(t){this.l=t||10,l.PerformanceNavigationTiming?(t=l.performance.getEntriesByType("navigation"),t=t.length>0&&(t[0].nextHopProtocol=="hq"||t[0].nextHopProtocol=="h2")):t=!!(l.chrome&&l.chrome.loadTimes&&l.chrome.loadTimes()&&l.chrome.loadTimes().wasFetchedViaSpdy),this.j=t?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function ds(t){return t.h?!0:t.g?t.g.size>=t.j:!1}function fs(t){return t.h?1:t.g?t.g.size:0}function zn(t,r){return t.h?t.h==r:t.g?t.g.has(r):!1}function Gn(t,r){t.g?t.g.add(r):t.h=r}function ps(t,r){t.h&&t.h==r?t.h=null:t.g&&t.g.has(r)&&t.g.delete(r)}us.prototype.cancel=function(){if(this.i=gs(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const t of this.g.values())t.cancel();this.g.clear()}};function gs(t){if(t.h!=null)return t.i.concat(t.h.G);if(t.g!=null&&t.g.size!==0){let r=t.i;for(const a of t.g.values())r=r.concat(a.G);return r}return x(t.i)}var ms=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function ta(t,r){if(t){t=t.split("&");for(let a=0;a<t.length;a++){const h=t[a].indexOf("=");let _,I=null;h>=0?(_=t[a].substring(0,h),I=t[a].substring(h+1)):_=t[a],r(_,I?decodeURIComponent(I.replace(/\+/g," ")):"")}}}function Te(t){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let r;t instanceof Te?(this.l=t.l,Tt(this,t.j),this.o=t.o,this.g=t.g,At(this,t.u),this.h=t.h,qn(this,vs(t.i)),this.m=t.m):t&&(r=String(t).match(ms))?(this.l=!1,Tt(this,r[1]||"",!0),this.o=St(r[2]||""),this.g=St(r[3]||"",!0),At(this,r[4]),this.h=St(r[5]||"",!0),qn(this,r[6]||"",!0),this.m=St(r[7]||"")):(this.l=!1,this.i=new Ct(null,this.l))}Te.prototype.toString=function(){const t=[];var r=this.j;r&&t.push(bt(r,_s,!0),":");var a=this.g;return(a||r=="file")&&(t.push("//"),(r=this.o)&&t.push(bt(r,_s,!0),"@"),t.push(wt(a).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a=this.u,a!=null&&t.push(":",String(a))),(a=this.h)&&(this.g&&a.charAt(0)!="/"&&t.push("/"),t.push(bt(a,a.charAt(0)=="/"?sa:ia,!0))),(a=this.i.toString())&&t.push("?",a),(a=this.m)&&t.push("#",bt(a,oa)),t.join("")},Te.prototype.resolve=function(t){const r=oe(this);let a=!!t.j;a?Tt(r,t.j):a=!!t.o,a?r.o=t.o:a=!!t.g,a?r.g=t.g:a=t.u!=null;var h=t.h;if(a)At(r,t.u);else if(a=!!t.h){if(h.charAt(0)!="/")if(this.g&&!this.h)h="/"+h;else{var _=r.h.lastIndexOf("/");_!=-1&&(h=r.h.slice(0,_+1)+h)}if(_=h,_==".."||_==".")h="";else if(_.indexOf("./")!=-1||_.indexOf("/.")!=-1){h=_.lastIndexOf("/",0)==0,_=_.split("/");const I=[];for(let T=0;T<_.length;){const P=_[T++];P=="."?h&&T==_.length&&I.push(""):P==".."?((I.length>1||I.length==1&&I[0]!="")&&I.pop(),h&&T==_.length&&I.push("")):(I.push(P),h=!0)}h=I.join("/")}else h=_}return a?r.h=h:a=t.i.toString()!=="",a?qn(r,vs(t.i)):a=!!t.m,a&&(r.m=t.m),r};function oe(t){return new Te(t)}function Tt(t,r,a){t.j=a?St(r,!0):r,t.j&&(t.j=t.j.replace(/:$/,""))}function At(t,r){if(r){if(r=Number(r),isNaN(r)||r<0)throw Error("Bad port number "+r);t.u=r}else t.u=null}function qn(t,r,a){r instanceof Ct?(t.i=r,aa(t.i,t.l)):(a||(r=bt(r,ra)),t.i=new Ct(r,t.l))}function M(t,r,a){t.i.set(r,a)}function en(t){return M(t,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),t}function St(t,r){return t?r?decodeURI(t.replace(/%25/g,"%2525")):decodeURIComponent(t):""}function bt(t,r,a){return typeof t=="string"?(t=encodeURI(t).replace(r,na),a&&(t=t.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),t):null}function na(t){return t=t.charCodeAt(0),"%"+(t>>4&15).toString(16)+(t&15).toString(16)}var _s=/[#\/\?@]/g,ia=/[#\?:]/g,sa=/[#\?]/g,ra=/[#\?@]/g,oa=/#/g;function Ct(t,r){this.h=this.g=null,this.i=t||null,this.j=!!r}function Be(t){t.g||(t.g=new Map,t.h=0,t.i&&ta(t.i,function(r,a){t.add(decodeURIComponent(r.replace(/\+/g," ")),a)}))}i=Ct.prototype,i.add=function(t,r){Be(this),this.i=null,t=st(this,t);let a=this.g.get(t);return a||this.g.set(t,a=[]),a.push(r),this.h+=1,this};function ys(t,r){Be(t),r=st(t,r),t.g.has(r)&&(t.i=null,t.h-=t.g.get(r).length,t.g.delete(r))}function Is(t,r){return Be(t),r=st(t,r),t.g.has(r)}i.forEach=function(t,r){Be(this),this.g.forEach(function(a,h){a.forEach(function(_){t.call(r,_,h,this)},this)},this)};function Es(t,r){Be(t);let a=[];if(typeof r=="string")Is(t,r)&&(a=a.concat(t.g.get(st(t,r))));else for(t=Array.from(t.g.values()),r=0;r<t.length;r++)a=a.concat(t[r]);return a}i.set=function(t,r){return Be(this),this.i=null,t=st(this,t),Is(this,t)&&(this.h-=this.g.get(t).length),this.g.set(t,[r]),this.h+=1,this},i.get=function(t,r){return t?(t=Es(this,t),t.length>0?String(t[0]):r):r};function ws(t,r,a){ys(t,r),a.length>0&&(t.i=null,t.g.set(st(t,r),x(a)),t.h+=a.length)}i.toString=function(){if(this.i)return this.i;if(!this.g)return"";const t=[],r=Array.from(this.g.keys());for(let h=0;h<r.length;h++){var a=r[h];const _=wt(a);a=Es(this,a);for(let I=0;I<a.length;I++){let T=_;a[I]!==""&&(T+="="+wt(a[I])),t.push(T)}}return this.i=t.join("&")};function vs(t){const r=new Ct;return r.i=t.i,t.g&&(r.g=new Map(t.g),r.h=t.h),r}function st(t,r){return r=String(r),t.j&&(r=r.toLowerCase()),r}function aa(t,r){r&&!t.j&&(Be(t),t.i=null,t.g.forEach(function(a,h){const _=h.toLowerCase();h!=_&&(ys(this,h),ws(this,_,a))},t)),t.j=r}function ca(t,r){const a=new Et;if(l.Image){const h=new Image;h.onload=b(Ae,a,"TestLoadImage: loaded",!0,r,h),h.onerror=b(Ae,a,"TestLoadImage: error",!1,r,h),h.onabort=b(Ae,a,"TestLoadImage: abort",!1,r,h),h.ontimeout=b(Ae,a,"TestLoadImage: timeout",!1,r,h),l.setTimeout(function(){h.ontimeout&&h.ontimeout()},1e4),h.src=t}else r(!1)}function ha(t,r){const a=new Et,h=new AbortController,_=setTimeout(()=>{h.abort(),Ae(a,"TestPingServer: timeout",!1,r)},1e4);fetch(t,{signal:h.signal}).then(I=>{clearTimeout(_),I.ok?Ae(a,"TestPingServer: ok",!0,r):Ae(a,"TestPingServer: server error",!1,r)}).catch(()=>{clearTimeout(_),Ae(a,"TestPingServer: error",!1,r)})}function Ae(t,r,a,h,_){try{_&&(_.onload=null,_.onerror=null,_.onabort=null,_.ontimeout=null),h(a)}catch{}}function la(){this.g=new Wo}function Kn(t){this.i=t.Sb||null,this.h=t.ab||!1}S(Kn,es),Kn.prototype.g=function(){return new tn(this.i,this.h)};function tn(t,r){W.call(this),this.H=t,this.o=r,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}S(tn,W),i=tn.prototype,i.open=function(t,r){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=t,this.D=r,this.readyState=1,Rt(this)},i.send=function(t){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const r={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};t&&(r.body=t),(this.H||l).fetch(new Request(this.D,r)).then(this.Pa.bind(this),this.ga.bind(this))},i.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,Pt(this)),this.readyState=0},i.Pa=function(t){if(this.g&&(this.l=t,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=t.headers,this.readyState=2,Rt(this)),this.g&&(this.readyState=3,Rt(this),this.g)))if(this.responseType==="arraybuffer")t.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof l.ReadableStream<"u"&&"body"in t){if(this.j=t.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;Ts(this)}else t.text().then(this.Oa.bind(this),this.ga.bind(this))};function Ts(t){t.j.read().then(t.Ma.bind(t)).catch(t.ga.bind(t))}i.Ma=function(t){if(this.g){if(this.o&&t.value)this.response.push(t.value);else if(!this.o){var r=t.value?t.value:new Uint8Array(0);(r=this.B.decode(r,{stream:!t.done}))&&(this.response=this.responseText+=r)}t.done?Pt(this):Rt(this),this.readyState==3&&Ts(this)}},i.Oa=function(t){this.g&&(this.response=this.responseText=t,Pt(this))},i.Na=function(t){this.g&&(this.response=t,Pt(this))},i.ga=function(){this.g&&Pt(this)};function Pt(t){t.readyState=4,t.l=null,t.j=null,t.B=null,Rt(t)}i.setRequestHeader=function(t,r){this.A.append(t,r)},i.getResponseHeader=function(t){return this.h&&this.h.get(t.toLowerCase())||""},i.getAllResponseHeaders=function(){if(!this.h)return"";const t=[],r=this.h.entries();for(var a=r.next();!a.done;)a=a.value,t.push(a[0]+": "+a[1]),a=r.next();return t.join(`\r
`)};function Rt(t){t.onreadystatechange&&t.onreadystatechange.call(t)}Object.defineProperty(tn.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(t){this.m=t?"include":"same-origin"}});function As(t){let r="";return Xt(t,function(a,h){r+=h,r+=":",r+=a,r+=`\r
`}),r}function Jn(t,r,a){e:{for(h in a){var h=!1;break e}h=!0}h||(a=As(a),typeof t=="string"?a!=null&&wt(a):M(t,r,a))}function V(t){W.call(this),this.headers=new Map,this.L=t||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}S(V,W);var ua=/^https?$/i,da=["POST","PUT"];i=V.prototype,i.Fa=function(t){this.H=t},i.ea=function(t,r,a,h){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+t);r=r?r.toUpperCase():"GET",this.D=t,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():rs.g(),this.g.onreadystatechange=A(v(this.Ca,this));try{this.B=!0,this.g.open(r,String(t),!0),this.B=!1}catch(I){Ss(this,I);return}if(t=a||"",a=new Map(this.headers),h)if(Object.getPrototypeOf(h)===Object.prototype)for(var _ in h)a.set(_,h[_]);else if(typeof h.keys=="function"&&typeof h.get=="function")for(const I of h.keys())a.set(I,h.get(I));else throw Error("Unknown input type for opt_headers: "+String(h));h=Array.from(a.keys()).find(I=>I.toLowerCase()=="content-type"),_=l.FormData&&t instanceof l.FormData,!(Array.prototype.indexOf.call(da,r,void 0)>=0)||h||_||a.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[I,T]of a)this.g.setRequestHeader(I,T);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(t),this.v=!1}catch(I){Ss(this,I)}};function Ss(t,r){t.h=!1,t.g&&(t.j=!0,t.g.abort(),t.j=!1),t.l=r,t.o=5,bs(t),nn(t)}function bs(t){t.A||(t.A=!0,z(t,"complete"),z(t,"error"))}i.abort=function(t){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=t||7,z(this,"complete"),z(this,"abort"),nn(this))},i.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),nn(this,!0)),V.Z.N.call(this)},i.Ca=function(){this.u||(this.B||this.v||this.j?Cs(this):this.Xa())},i.Xa=function(){Cs(this)};function Cs(t){if(t.h&&typeof c<"u"){if(t.v&&Se(t)==4)setTimeout(t.Ca.bind(t),0);else if(z(t,"readystatechange"),Se(t)==4){t.h=!1;try{const I=t.ca();e:switch(I){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var r=!0;break e;default:r=!1}var a;if(!(a=r)){var h;if(h=I===0){let T=String(t.D).match(ms)[1]||null;!T&&l.self&&l.self.location&&(T=l.self.location.protocol.slice(0,-1)),h=!ua.test(T?T.toLowerCase():"")}a=h}if(a)z(t,"complete"),z(t,"success");else{t.o=6;try{var _=Se(t)>2?t.g.statusText:""}catch{_=""}t.l=_+" ["+t.ca()+"]",bs(t)}}finally{nn(t)}}}}function nn(t,r){if(t.g){t.m&&(clearTimeout(t.m),t.m=null);const a=t.g;t.g=null,r||z(t,"ready");try{a.onreadystatechange=null}catch{}}}i.isActive=function(){return!!this.g};function Se(t){return t.g?t.g.readyState:0}i.ca=function(){try{return Se(this)>2?this.g.status:-1}catch{return-1}},i.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},i.La=function(t){if(this.g){var r=this.g.responseText;return t&&r.indexOf(t)==0&&(r=r.substring(t.length)),$o(r)}};function Ps(t){try{if(!t.g)return null;if("response"in t.g)return t.g.response;switch(t.F){case"":case"text":return t.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in t.g)return t.g.mozResponseArrayBuffer}return null}catch{return null}}function fa(t){const r={};t=(t.g&&Se(t)>=2&&t.g.getAllResponseHeaders()||"").split(`\r
`);for(let h=0;h<t.length;h++){if(d(t[h]))continue;var a=Yo(t[h]);const _=a[0];if(a=a[1],typeof a!="string")continue;a=a.trim();const I=r[_]||[];r[_]=I,I.push(a)}xo(r,function(h){return h.join(", ")})}i.ya=function(){return this.o},i.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function kt(t,r,a){return a&&a.internalChannelParams&&a.internalChannelParams[t]||r}function Rs(t){this.za=0,this.i=[],this.j=new Et,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=kt("failFast",!1,t),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=kt("baseRetryDelayMs",5e3,t),this.Za=kt("retryDelaySeedMs",1e4,t),this.Ta=kt("forwardChannelMaxRetries",2,t),this.va=kt("forwardChannelRequestTimeoutMs",2e4,t),this.ma=t&&t.xmlHttpFactory||void 0,this.Ua=t&&t.Rb||void 0,this.Aa=t&&t.useFetchStreams||!1,this.O=void 0,this.L=t&&t.supportsCrossDomainXhr||!1,this.M="",this.h=new us(t&&t.concurrentRequestLimit),this.Ba=new la,this.S=t&&t.fastHandshake||!1,this.R=t&&t.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=t&&t.Pb||!1,t&&t.ua&&this.j.ua(),t&&t.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&t&&t.detectBufferingProxy||!1,this.ia=void 0,t&&t.longPollingTimeout&&t.longPollingTimeout>0&&(this.ia=t.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}i=Rs.prototype,i.ka=8,i.I=1,i.connect=function(t,r,a,h){G(0),this.W=t,this.H=r||{},a&&h!==void 0&&(this.H.OSID=a,this.H.OAID=h),this.F=this.X,this.J=Vs(this,null,this.W),rn(this)};function Xn(t){if(ks(t),t.I==3){var r=t.V++,a=oe(t.J);if(M(a,"SID",t.M),M(a,"RID",r),M(a,"TYPE","terminate"),Nt(t,a),r=new ve(t,t.j,r),r.M=2,r.A=en(oe(a)),a=!1,l.navigator&&l.navigator.sendBeacon)try{a=l.navigator.sendBeacon(r.A.toString(),"")}catch{}!a&&l.Image&&(new Image().src=r.A,a=!0),a||(r.g=Fs(r.j,null),r.g.ea(r.A)),r.F=Date.now(),Qt(r)}xs(t)}function sn(t){t.g&&(Zn(t),t.g.cancel(),t.g=null)}function ks(t){sn(t),t.v&&(l.clearTimeout(t.v),t.v=null),on(t),t.h.cancel(),t.m&&(typeof t.m=="number"&&l.clearTimeout(t.m),t.m=null)}function rn(t){if(!ds(t.h)&&!t.m){t.m=!0;var r=t.Ea;we||u(),Q||(we(),Q=!0),g.add(r,t),t.D=0}}function pa(t,r){return fs(t.h)>=t.h.j-(t.m?1:0)?!1:t.m?(t.i=r.G.concat(t.i),!0):t.I==1||t.I==2||t.D>=(t.Sa?0:t.Ta)?!1:(t.m=It(v(t.Ea,t,r),Us(t,t.D)),t.D++,!0)}i.Ea=function(t){if(this.m)if(this.m=null,this.I==1){if(!t){this.V=Math.floor(Math.random()*1e5),t=this.V++;const _=new ve(this,this.j,t);let I=this.o;if(this.U&&(I?(I=Wi(I),Gi(I,this.U)):I=this.U),this.u!==null||this.R||(_.J=I,I=null),this.S)e:{for(var r=0,a=0;a<this.i.length;a++){t:{var h=this.i[a];if("__data__"in h.map&&(h=h.map.__data__,typeof h=="string")){h=h.length;break t}h=void 0}if(h===void 0)break;if(r+=h,r>4096){r=a;break e}if(r===4096||a===this.i.length-1){r=a+1;break e}}r=1e3}else r=1e3;r=Ds(this,_,r),a=oe(this.J),M(a,"RID",t),M(a,"CVER",22),this.G&&M(a,"X-HTTP-Session-Id",this.G),Nt(this,a),I&&(this.R?r="headers="+wt(As(I))+"&"+r:this.u&&Jn(a,this.u,I)),Gn(this.h,_),this.Ra&&M(a,"TYPE","init"),this.S?(M(a,"$req",r),M(a,"SID","null"),_.U=!0,Hn(_,a,null)):Hn(_,a,r),this.I=2}}else this.I==3&&(t?Ns(this,t):this.i.length==0||ds(this.h)||Ns(this))};function Ns(t,r){var a;r?a=r.l:a=t.V++;const h=oe(t.J);M(h,"SID",t.M),M(h,"RID",a),M(h,"AID",t.K),Nt(t,h),t.u&&t.o&&Jn(h,t.u,t.o),a=new ve(t,t.j,a,t.D+1),t.u===null&&(a.J=t.o),r&&(t.i=r.G.concat(t.i)),r=Ds(t,a,1e3),a.H=Math.round(t.va*.5)+Math.round(t.va*.5*Math.random()),Gn(t.h,a),Hn(a,h,r)}function Nt(t,r){t.H&&Xt(t.H,function(a,h){M(r,h,a)}),t.l&&Xt({},function(a,h){M(r,h,a)})}function Ds(t,r,a){a=Math.min(t.i.length,a);const h=t.l?v(t.l.Ka,t.l,t):null;e:{var _=t.i;let P=-1;for(;;){const H=["count="+a];P==-1?a>0?(P=_[0].g,H.push("ofs="+P)):P=0:H.push("ofs="+P);let O=!0;for(let $=0;$<a;$++){var I=_[$].g;const ae=_[$].map;if(I-=P,I<0)P=Math.max(0,_[$].g-100),O=!1;else try{I="req"+I+"_"||"";try{var T=ae instanceof Map?ae:Object.entries(ae);for(const[$e,be]of T){let Ce=be;E(be)&&(Ce=Mn(be)),H.push(I+$e+"="+encodeURIComponent(Ce))}}catch($e){throw H.push(I+"type="+encodeURIComponent("_badmap")),$e}}catch{h&&h(ae)}}if(O){T=H.join("&");break e}}T=void 0}return t=t.i.splice(0,a),r.G=t,T}function Os(t){if(!t.g&&!t.v){t.Y=1;var r=t.Da;we||u(),Q||(we(),Q=!0),g.add(r,t),t.A=0}}function Yn(t){return t.g||t.v||t.A>=3?!1:(t.Y++,t.v=It(v(t.Da,t),Us(t,t.A)),t.A++,!0)}i.Da=function(){if(this.v=null,Ls(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var t=4*this.T;this.j.info("BP detection timer enabled: "+t),this.B=It(v(this.Wa,this),t)}},i.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,G(10),sn(this),Ls(this))};function Zn(t){t.B!=null&&(l.clearTimeout(t.B),t.B=null)}function Ls(t){t.g=new ve(t,t.j,"rpc",t.Y),t.u===null&&(t.g.J=t.o),t.g.P=0;var r=oe(t.na);M(r,"RID","rpc"),M(r,"SID",t.M),M(r,"AID",t.K),M(r,"CI",t.F?"0":"1"),!t.F&&t.ia&&M(r,"TO",t.ia),M(r,"TYPE","xmlhttp"),Nt(t,r),t.u&&t.o&&Jn(r,t.u,t.o),t.O&&(t.g.H=t.O);var a=t.g;t=t.ba,a.M=1,a.A=en(oe(r)),a.u=null,a.R=!0,cs(a,t)}i.Va=function(){this.C!=null&&(this.C=null,sn(this),Yn(this),G(19))};function on(t){t.C!=null&&(l.clearTimeout(t.C),t.C=null)}function Ms(t,r){var a=null;if(t.g==r){on(t),Zn(t),t.g=null;var h=2}else if(zn(t.h,r))a=r.G,ps(t.h,r),h=1;else return;if(t.I!=0){if(r.o)if(h==1){a=r.u?r.u.length:0,r=Date.now()-r.F;var _=t.D;h=Vn(),z(h,new ss(h,a)),rn(t)}else Os(t);else if(_=r.m,_==3||_==0&&r.X>0||!(h==1&&pa(t,r)||h==2&&Yn(t)))switch(a&&a.length>0&&(r=t.h,r.i=r.i.concat(a)),_){case 1:He(t,5);break;case 4:He(t,10);break;case 3:He(t,6);break;default:He(t,2)}}}function Us(t,r){let a=t.Qa+Math.floor(Math.random()*t.Za);return t.isActive()||(a*=2),a*r}function He(t,r){if(t.j.info("Error code "+r),r==2){var a=v(t.bb,t),h=t.Ua;const _=!h;h=new Te(h||"//www.google.com/images/cleardot.gif"),l.location&&l.location.protocol=="http"||Tt(h,"https"),en(h),_?ca(h.toString(),a):ha(h.toString(),a)}else G(2);t.I=0,t.l&&t.l.pa(r),xs(t),ks(t)}i.bb=function(t){t?(this.j.info("Successfully pinged google.com"),G(2)):(this.j.info("Failed to ping google.com"),G(1))};function xs(t){if(t.I=0,t.ja=[],t.l){const r=gs(t.h);(r.length!=0||t.i.length!=0)&&(L(t.ja,r),L(t.ja,t.i),t.h.i.length=0,x(t.i),t.i.length=0),t.l.oa()}}function Vs(t,r,a){var h=a instanceof Te?oe(a):new Te(a);if(h.g!="")r&&(h.g=r+"."+h.g),At(h,h.u);else{var _=l.location;h=_.protocol,r=r?r+"."+_.hostname:_.hostname,_=+_.port;const I=new Te(null);h&&Tt(I,h),r&&(I.g=r),_&&At(I,_),a&&(I.h=a),h=I}return a=t.G,r=t.wa,a&&r&&M(h,a,r),M(h,"VER",t.ka),Nt(t,h),h}function Fs(t,r,a){if(r&&!t.L)throw Error("Can't create secondary domain capable XhrIo object.");return r=t.Aa&&!t.ma?new V(new Kn({ab:a})):new V(t.ma),r.Fa(t.L),r}i.isActive=function(){return!!this.l&&this.l.isActive(this)};function js(){}i=js.prototype,i.ra=function(){},i.qa=function(){},i.pa=function(){},i.oa=function(){},i.isActive=function(){return!0},i.Ka=function(){};function ee(t,r){W.call(this),this.g=new Rs(r),this.l=t,this.h=r&&r.messageUrlParams||null,t=r&&r.messageHeaders||null,r&&r.clientProtocolHeaderRequired&&(t?t["X-Client-Protocol"]="webchannel":t={"X-Client-Protocol":"webchannel"}),this.g.o=t,t=r&&r.initMessageHeaders||null,r&&r.messageContentType&&(t?t["X-WebChannel-Content-Type"]=r.messageContentType:t={"X-WebChannel-Content-Type":r.messageContentType}),r&&r.sa&&(t?t["X-WebChannel-Client-Profile"]=r.sa:t={"X-WebChannel-Client-Profile":r.sa}),this.g.U=t,(t=r&&r.Qb)&&!d(t)&&(this.g.u=t),this.A=r&&r.supportsCrossDomainXhr||!1,this.v=r&&r.sendRawJson||!1,(r=r&&r.httpSessionIdParam)&&!d(r)&&(this.g.G=r,t=this.h,t!==null&&r in t&&(t=this.h,r in t&&delete t[r])),this.j=new rt(this)}S(ee,W),ee.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},ee.prototype.close=function(){Xn(this.g)},ee.prototype.o=function(t){var r=this.g;if(typeof t=="string"){var a={};a.__data__=t,t=a}else this.v&&(a={},a.__data__=Mn(t),t=a);r.i.push(new ea(r.Ya++,t)),r.I==3&&rn(r)},ee.prototype.N=function(){this.g.l=null,delete this.j,Xn(this.g),delete this.g,ee.Z.N.call(this)};function Bs(t){Un.call(this),t.__headers__&&(this.headers=t.__headers__,this.statusCode=t.__status__,delete t.__headers__,delete t.__status__);var r=t.__sm__;if(r){e:{for(const a in r){t=a;break e}t=void 0}(this.i=t)&&(t=this.i,r=r!==null&&t in r?r[t]:void 0),this.data=r}else this.data=t}S(Bs,Un);function Hs(){xn.call(this),this.status=1}S(Hs,xn);function rt(t){this.g=t}S(rt,js),rt.prototype.ra=function(){z(this.g,"a")},rt.prototype.qa=function(t){z(this.g,new Bs(t))},rt.prototype.pa=function(t){z(this.g,new Hs)},rt.prototype.oa=function(){z(this.g,"b")},ee.prototype.send=ee.prototype.o,ee.prototype.open=ee.prototype.m,ee.prototype.close=ee.prototype.close,Fn.NO_ERROR=0,Fn.TIMEOUT=8,Fn.HTTP_ERROR=6,Xo.COMPLETE="complete",zo.EventType=_t,_t.OPEN="a",_t.CLOSE="b",_t.ERROR="c",_t.MESSAGE="d",W.prototype.listen=W.prototype.J,V.prototype.listenOnce=V.prototype.K,V.prototype.getLastError=V.prototype.Ha,V.prototype.getLastErrorCode=V.prototype.ya,V.prototype.getStatus=V.prototype.ca,V.prototype.getResponseJson=V.prototype.La,V.prototype.getResponseText=V.prototype.la,V.prototype.send=V.prototype.ea,V.prototype.setWithCredentials=V.prototype.Fa}).apply(typeof cn<"u"?cn:typeof self<"u"?self:typeof window<"u"?window:{});const nr="@firebase/firestore",ir="4.9.2";/**
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
 */class q{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}q.UNAUTHENTICATED=new q(null),q.GOOGLE_CREDENTIALS=new q("google-credentials-uid"),q.FIRST_PARTY=new q("first-party-uid"),q.MOCK_USER=new q("mock-user");/**
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
 */let Wt="12.3.0";/**
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
 */const ut=new Si("@firebase/firestore");function ie(i,...e){if(ut.logLevel<=D.DEBUG){const n=e.map(ki);ut.debug(`Firestore (${Wt}): ${i}`,...n)}}function qr(i,...e){if(ut.logLevel<=D.ERROR){const n=e.map(ki);ut.error(`Firestore (${Wt}): ${i}`,...n)}}function oh(i,...e){if(ut.logLevel<=D.WARN){const n=e.map(ki);ut.warn(`Firestore (${Wt}): ${i}`,...n)}}function ki(i){if(typeof i=="string")return i;try{/**
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
*/return function(n){return JSON.stringify(n)}(i)}catch{return i}}/**
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
 */function Ft(i,e,n){let s="Unexpected state";typeof e=="string"?s=e:n=e,Kr(i,s,n)}function Kr(i,e,n){let s=`FIRESTORE (${Wt}) INTERNAL ASSERTION FAILED: ${e} (ID: ${i.toString(16)})`;if(n!==void 0)try{s+=" CONTEXT: "+JSON.stringify(n)}catch{s+=" CONTEXT: "+n}throw qr(s),new Error(s)}function Ot(i,e,n,s){let o="Unexpected state";typeof n=="string"?o=n:s=n,i||Kr(e,o,s)}/**
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
 */const k={CANCELLED:"cancelled",INVALID_ARGUMENT:"invalid-argument",FAILED_PRECONDITION:"failed-precondition"};class N extends Ie{constructor(e,n){super(e,n),this.code=e,this.message=n,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
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
 */class Lt{constructor(){this.promise=new Promise((e,n)=>{this.resolve=e,this.reject=n})}}/**
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
 */class Jr{constructor(e,n){this.user=n,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class ah{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,n){e.enqueueRetryable(()=>n(q.UNAUTHENTICATED))}shutdown(){}}class ch{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,n){this.changeListener=n,e.enqueueRetryable(()=>n(this.token.user))}shutdown(){this.changeListener=null}}class hh{constructor(e){this.t=e,this.currentUser=q.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,n){Ot(this.o===void 0,42304);let s=this.i;const o=w=>this.i!==s?(s=this.i,n(w)):Promise.resolve();let c=new Lt;this.o=()=>{this.i++,this.currentUser=this.u(),c.resolve(),c=new Lt,e.enqueueRetryable(()=>o(this.currentUser))};const l=()=>{const w=c;e.enqueueRetryable(async()=>{await w.promise,await o(this.currentUser)})},E=w=>{ie("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=w,this.o&&(this.auth.addAuthTokenListener(this.o),l())};this.t.onInit(w=>E(w)),setTimeout(()=>{if(!this.auth){const w=this.t.getImmediate({optional:!0});w?E(w):(ie("FirebaseAuthCredentialsProvider","Auth not yet detected"),c.resolve(),c=new Lt)}},0),l()}getToken(){const e=this.i,n=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(n).then(s=>this.i!==e?(ie("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):s?(Ot(typeof s.accessToken=="string",31837,{l:s}),new Jr(s.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return Ot(e===null||typeof e=="string",2055,{h:e}),new q(e)}}class lh{constructor(e,n,s){this.P=e,this.T=n,this.I=s,this.type="FirstParty",this.user=q.FIRST_PARTY,this.A=new Map}R(){return this.I?this.I():null}get headers(){this.A.set("X-Goog-AuthUser",this.P);const e=this.R();return e&&this.A.set("Authorization",e),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A}}class uh{constructor(e,n,s){this.P=e,this.T=n,this.I=s}getToken(){return Promise.resolve(new lh(this.P,this.T,this.I))}start(e,n){e.enqueueRetryable(()=>n(q.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class sr{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class dh{constructor(e,n){this.V=n,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,te(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,n){Ot(this.o===void 0,3512);const s=c=>{c.error!=null&&ie("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${c.error.message}`);const l=c.token!==this.m;return this.m=c.token,ie("FirebaseAppCheckTokenProvider",`Received ${l?"new":"existing"} token.`),l?n(c.token):Promise.resolve()};this.o=c=>{e.enqueueRetryable(()=>s(c))};const o=c=>{ie("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=c,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit(c=>o(c)),setTimeout(()=>{if(!this.appCheck){const c=this.V.getImmediate({optional:!0});c?o(c):ie("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.p)return Promise.resolve(new sr(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(n=>n?(Ot(typeof n.token=="string",44558,{tokenResult:n}),this.m=n.token,new sr(n.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
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
 */function fh(i){const e=typeof self<"u"&&(self.crypto||self.msCrypto),n=new Uint8Array(i);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(n);else for(let s=0;s<i;s++)n[s]=Math.floor(256*Math.random());return n}/**
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
 */class ph{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",n=62*Math.floor(4.129032258064516);let s="";for(;s.length<20;){const o=fh(40);for(let c=0;c<o.length;++c)s.length<20&&o[c]<n&&(s+=e.charAt(o[c]%62))}return s}}function Ve(i,e){return i<e?-1:i>e?1:0}function gh(i,e){const n=Math.min(i.length,e.length);for(let s=0;s<n;s++){const o=i.charAt(s),c=e.charAt(s);if(o!==c)return oi(o)===oi(c)?Ve(o,c):oi(o)?1:-1}return Ve(i.length,e.length)}const mh=55296,_h=57343;function oi(i){const e=i.charCodeAt(0);return e>=mh&&e<=_h}/**
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
 */const rr="__name__";class ce{constructor(e,n,s){n===void 0?n=0:n>e.length&&Ft(637,{offset:n,range:e.length}),s===void 0?s=e.length-n:s>e.length-n&&Ft(1746,{length:s,range:e.length-n}),this.segments=e,this.offset=n,this.len=s}get length(){return this.len}isEqual(e){return ce.comparator(this,e)===0}child(e){const n=this.segments.slice(this.offset,this.limit());return e instanceof ce?e.forEach(s=>{n.push(s)}):n.push(e),this.construct(n)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let n=0;n<this.length;n++)if(this.get(n)!==e.get(n))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let n=0;n<this.length;n++)if(this.get(n)!==e.get(n))return!1;return!0}forEach(e){for(let n=this.offset,s=this.limit();n<s;n++)e(this.segments[n])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,n){const s=Math.min(e.length,n.length);for(let o=0;o<s;o++){const c=ce.compareSegments(e.get(o),n.get(o));if(c!==0)return c}return Ve(e.length,n.length)}static compareSegments(e,n){const s=ce.isNumericId(e),o=ce.isNumericId(n);return s&&!o?-1:!s&&o?1:s&&o?ce.extractNumericId(e).compare(ce.extractNumericId(n)):gh(e,n)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return Ri.fromString(e.substring(4,e.length-2))}}class ne extends ce{construct(e,n,s){return new ne(e,n,s)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const n=[];for(const s of e){if(s.indexOf("//")>=0)throw new N(k.INVALID_ARGUMENT,`Invalid segment (${s}). Paths must not contain // in them.`);n.push(...s.split("/").filter(o=>o.length>0))}return new ne(n)}static emptyPath(){return new ne([])}}const yh=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class ze extends ce{construct(e,n,s){return new ze(e,n,s)}static isValidIdentifier(e){return yh.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),ze.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===rr}static keyField(){return new ze([rr])}static fromServerFormat(e){const n=[];let s="",o=0;const c=()=>{if(s.length===0)throw new N(k.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);n.push(s),s=""};let l=!1;for(;o<e.length;){const E=e[o];if(E==="\\"){if(o+1===e.length)throw new N(k.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const w=e[o+1];if(w!=="\\"&&w!=="."&&w!=="`")throw new N(k.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);s+=w,o+=2}else E==="`"?(l=!l,o++):E!=="."||l?(s+=E,o++):(c(),o++)}if(c(),l)throw new N(k.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new ze(n)}static emptyPath(){return new ze([])}}/**
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
 */class Ge{constructor(e){this.path=e}static fromPath(e){return new Ge(ne.fromString(e))}static fromName(e){return new Ge(ne.fromString(e).popFirst(5))}static empty(){return new Ge(ne.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&ne.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,n){return ne.comparator(e.path,n.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new Ge(new ne(e.slice()))}}function Ih(i,e,n,s){if(e===!0&&s===!0)throw new N(k.INVALID_ARGUMENT,`${i} and ${n} cannot be used together.`)}function Eh(i){return typeof i=="object"&&i!==null&&(Object.getPrototypeOf(i)===Object.prototype||Object.getPrototypeOf(i)===null)}function wh(i){if(i===void 0)return"undefined";if(i===null)return"null";if(typeof i=="string")return i.length>20&&(i=`${i.substring(0,20)}...`),JSON.stringify(i);if(typeof i=="number"||typeof i=="boolean")return""+i;if(typeof i=="object"){if(i instanceof Array)return"an array";{const e=function(s){return s.constructor?s.constructor.name:null}(i);return e?`a custom ${e} object`:"an object"}}return typeof i=="function"?"a function":Ft(12329,{type:typeof i})}function vh(i,e){if("_delegate"in i&&(i=i._delegate),!(i instanceof e)){if(e.name===i.constructor.name)throw new N(k.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const n=wh(i);throw new N(k.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${n}`)}}return i}/**
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
 */function B(i,e){const n={typeString:i};return e&&(n.value=e),n}function zt(i,e){if(!Eh(i))throw new N(k.INVALID_ARGUMENT,"JSON must be an object");let n;for(const s in e)if(e[s]){const o=e[s].typeString,c="value"in e[s]?{value:e[s].value}:void 0;if(!(s in i)){n=`JSON missing required field: '${s}'`;break}const l=i[s];if(o&&typeof l!==o){n=`JSON field '${s}' must be a ${o}.`;break}if(c!==void 0&&l!==c.value){n=`Expected '${s}' field to equal '${c.value}'`;break}}if(n)throw new N(k.INVALID_ARGUMENT,n);return!0}/**
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
 */const or=-62135596800,ar=1e6;class he{static now(){return he.fromMillis(Date.now())}static fromDate(e){return he.fromMillis(e.getTime())}static fromMillis(e){const n=Math.floor(e/1e3),s=Math.floor((e-1e3*n)*ar);return new he(n,s)}constructor(e,n){if(this.seconds=e,this.nanoseconds=n,n<0)throw new N(k.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+n);if(n>=1e9)throw new N(k.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+n);if(e<or)throw new N(k.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new N(k.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/ar}_compareTo(e){return this.seconds===e.seconds?Ve(this.nanoseconds,e.nanoseconds):Ve(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:he._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(zt(e,he._jsonSchema))return new he(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-or;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}he._jsonSchemaVersion="firestore/timestamp/1.0",he._jsonSchema={type:B("string",he._jsonSchemaVersion),seconds:B("number"),nanoseconds:B("number")};function Th(i){return i.name==="IndexedDbTransactionError"}/**
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
 */class Ah extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
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
 */class Ze{constructor(e){this.binaryString=e}static fromBase64String(e){const n=function(o){try{return atob(o)}catch(c){throw typeof DOMException<"u"&&c instanceof DOMException?new Ah("Invalid base64 string: "+c):c}}(e);return new Ze(n)}static fromUint8Array(e){const n=function(o){let c="";for(let l=0;l<o.length;++l)c+=String.fromCharCode(o[l]);return c}(e);return new Ze(n)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(n){return btoa(n)}(this.binaryString)}toUint8Array(){return function(n){const s=new Uint8Array(n.length);for(let o=0;o<n.length;o++)s[o]=n.charCodeAt(o);return s}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return Ve(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}Ze.EMPTY_BYTE_STRING=new Ze("");const _i="(default)";class yn{constructor(e,n){this.projectId=e,this.database=n||_i}static empty(){return new yn("","")}get isDefaultDatabase(){return this.database===_i}isEqual(e){return e instanceof yn&&e.projectId===this.projectId&&e.database===this.database}}/**
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
 */class Sh{constructor(e,n=null,s=[],o=[],c=null,l="F",E=null,w=null){this.path=e,this.collectionGroup=n,this.explicitOrderBy=s,this.filters=o,this.limit=c,this.limitType=l,this.startAt=E,this.endAt=w,this.Ie=null,this.Ee=null,this.de=null,this.startAt,this.endAt}}function bh(i){return new Sh(i)}/**
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
 */var cr,R;(R=cr||(cr={}))[R.OK=0]="OK",R[R.CANCELLED=1]="CANCELLED",R[R.UNKNOWN=2]="UNKNOWN",R[R.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",R[R.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",R[R.NOT_FOUND=5]="NOT_FOUND",R[R.ALREADY_EXISTS=6]="ALREADY_EXISTS",R[R.PERMISSION_DENIED=7]="PERMISSION_DENIED",R[R.UNAUTHENTICATED=16]="UNAUTHENTICATED",R[R.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",R[R.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",R[R.ABORTED=10]="ABORTED",R[R.OUT_OF_RANGE=11]="OUT_OF_RANGE",R[R.UNIMPLEMENTED=12]="UNIMPLEMENTED",R[R.INTERNAL=13]="INTERNAL",R[R.UNAVAILABLE=14]="UNAVAILABLE",R[R.DATA_LOSS=15]="DATA_LOSS";/**
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
 */new Ri([4294967295,4294967295],0);/**
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
 */const Ch=41943040;/**
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
 */const Ph=1048576;function ai(){return typeof document<"u"?document:null}/**
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
 */class Rh{constructor(e,n,s=1e3,o=1.5,c=6e4){this.Mi=e,this.timerId=n,this.d_=s,this.A_=o,this.R_=c,this.V_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.V_=0}g_(){this.V_=this.R_}p_(e){this.cancel();const n=Math.floor(this.V_+this.y_()),s=Math.max(0,Date.now()-this.f_),o=Math.max(0,n-s);o>0&&ie("ExponentialBackoff",`Backing off for ${o} ms (base delay: ${this.V_} ms, delay with jitter: ${n} ms, last attempt: ${s} ms ago)`),this.m_=this.Mi.enqueueAfterDelay(this.timerId,o,()=>(this.f_=Date.now(),e())),this.V_*=this.A_,this.V_<this.d_&&(this.V_=this.d_),this.V_>this.R_&&(this.V_=this.R_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.V_}}/**
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
 */class Ni{constructor(e,n,s,o,c){this.asyncQueue=e,this.timerId=n,this.targetTimeMs=s,this.op=o,this.removalCallback=c,this.deferred=new Lt,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(l=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,n,s,o,c){const l=Date.now()+s,E=new Ni(e,n,l,o,c);return E.start(s),E}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new N(k.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}var hr,lr;(lr=hr||(hr={})).Ma="default",lr.Cache="cache";/**
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
 */function kh(i){const e={};return i.timeoutSeconds!==void 0&&(e.timeoutSeconds=i.timeoutSeconds),e}/**
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
 */const ur=new Map;/**
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
 */const Xr="firestore.googleapis.com",dr=!0;class fr{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new N(k.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=Xr,this.ssl=dr}else this.host=e.host,this.ssl=e.ssl??dr;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=Ch;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<Ph)throw new N(k.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}Ih("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=kh(e.experimentalLongPollingOptions??{}),function(s){if(s.timeoutSeconds!==void 0){if(isNaN(s.timeoutSeconds))throw new N(k.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (must not be NaN)`);if(s.timeoutSeconds<5)throw new N(k.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (minimum allowed value is 5)`);if(s.timeoutSeconds>30)throw new N(k.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(s,o){return s.timeoutSeconds===o.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class Yr{constructor(e,n,s,o){this._authCredentials=e,this._appCheckCredentials=n,this._databaseId=s,this._app=o,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new fr({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new N(k.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new N(k.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new fr(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(s){if(!s)return new ah;switch(s.type){case"firstParty":return new uh(s.sessionIndex||"0",s.iamToken||null,s.authTokenFactory||null);case"provider":return s.client;default:throw new N(k.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(n){const s=ur.get(n);s&&(ie("ComponentProvider","Removing Datastore"),ur.delete(n),s.terminate())}(this),Promise.resolve()}}function Nh(i,e,n,s={}){var v;i=vh(i,Yr);const o=Bt(e),c=i._getSettings(),l={...c,emulatorOptions:i._getEmulatorOptions()},E=`${e}:${n}`;o&&(jr(`https://${E}`),Br("Firestore",!0)),c.host!==Xr&&c.host!==E&&oh("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const w={...c,host:E,ssl:o,emulatorOptions:s};if(!Xe(w,l)&&(i._setSettings(w),s.mockUserToken)){let b,S;if(typeof s.mockUserToken=="string")b=s.mockUserToken,S=q.MOCK_USER;else{b=Ca(s.mockUserToken,(v=i._app)==null?void 0:v.options.projectId);const A=s.mockUserToken.sub||s.mockUserToken.user_id;if(!A)throw new N(k.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");S=new q(A)}i._authCredentials=new ch(new Jr(b,S))}}/**
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
 */class Di{constructor(e,n,s){this.converter=n,this._query=s,this.type="query",this.firestore=e}withConverter(e){return new Di(this.firestore,e,this._query)}}class le{constructor(e,n,s){this.converter=n,this._key=s,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new Oi(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new le(this.firestore,e,this._key)}toJSON(){return{type:le._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,n,s){if(zt(n,le._jsonSchema))return new le(e,s||null,new Ge(ne.fromString(n.referencePath)))}}le._jsonSchemaVersion="firestore/documentReference/1.0",le._jsonSchema={type:B("string",le._jsonSchemaVersion),referencePath:B("string")};class Oi extends Di{constructor(e,n,s){super(e,n,bh(s)),this._path=s,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new le(this.firestore,null,new Ge(e))}withConverter(e){return new Oi(this.firestore,e,this._path)}}/**
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
 */const pr="AsyncQueue";class gr{constructor(e=Promise.resolve()){this.Xu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new Rh(this,"async_queue_retry"),this._c=()=>{const s=ai();s&&ie(pr,"Visibility state changed to "+s.visibilityState),this.M_.w_()},this.ac=e;const n=ai();n&&typeof n.addEventListener=="function"&&n.addEventListener("visibilitychange",this._c)}get isShuttingDown(){return this.ec}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.uc(),this.cc(e)}enterRestrictedMode(e){if(!this.ec){this.ec=!0,this.sc=e||!1;const n=ai();n&&typeof n.removeEventListener=="function"&&n.removeEventListener("visibilitychange",this._c)}}enqueue(e){if(this.uc(),this.ec)return new Promise(()=>{});const n=new Lt;return this.cc(()=>this.ec&&this.sc?Promise.resolve():(e().then(n.resolve,n.reject),n.promise)).then(()=>n.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Xu.push(e),this.lc()))}async lc(){if(this.Xu.length!==0){try{await this.Xu[0](),this.Xu.shift(),this.M_.reset()}catch(e){if(!Th(e))throw e;ie(pr,"Operation failed with retryable error: "+e)}this.Xu.length>0&&this.M_.p_(()=>this.lc())}}cc(e){const n=this.ac.then(()=>(this.rc=!0,e().catch(s=>{throw this.nc=s,this.rc=!1,qr("INTERNAL UNHANDLED ERROR: ",mr(s)),s}).then(s=>(this.rc=!1,s))));return this.ac=n,n}enqueueAfterDelay(e,n,s){this.uc(),this.oc.indexOf(e)>-1&&(n=0);const o=Ni.createAndSchedule(this,e,n,s,c=>this.hc(c));return this.tc.push(o),o}uc(){this.nc&&Ft(47125,{Pc:mr(this.nc)})}verifyOperationInProgress(){}async Tc(){let e;do e=this.ac,await e;while(e!==this.ac)}Ic(e){for(const n of this.tc)if(n.timerId===e)return!0;return!1}Ec(e){return this.Tc().then(()=>{this.tc.sort((n,s)=>n.targetTimeMs-s.targetTimeMs);for(const n of this.tc)if(n.skipDelay(),e!=="all"&&n.timerId===e)break;return this.Tc()})}dc(e){this.oc.push(e)}hc(e){const n=this.tc.indexOf(e);this.tc.splice(n,1)}}function mr(i){let e=i.message||"";return i.stack&&(e=i.stack.includes(i.message)?i.stack:i.message+`
`+i.stack),e}class Dh extends Yr{constructor(e,n,s,o){super(e,n,s,o),this.type="firestore",this._queue=new gr,this._persistenceKey=(o==null?void 0:o.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new gr(e),this._firestoreClient=void 0,await e}}}function Oh(i,e){const n=typeof i=="object"?i:Pi(),s=typeof i=="string"?i:_i,o=Ci(n,"firestore").getImmediate({identifier:s});if(!o._initialized){const c=Sa("firestore");c&&Nh(o,...c)}return o}/**
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
 */class fe{constructor(e){this._byteString=e}static fromBase64String(e){try{return new fe(Ze.fromBase64String(e))}catch(n){throw new N(k.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+n)}}static fromUint8Array(e){return new fe(Ze.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:fe._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(zt(e,fe._jsonSchema))return fe.fromBase64String(e.bytes)}}fe._jsonSchemaVersion="firestore/bytes/1.0",fe._jsonSchema={type:B("string",fe._jsonSchemaVersion),bytes:B("string")};/**
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
 */class Zr{constructor(...e){for(let n=0;n<e.length;++n)if(e[n].length===0)throw new N(k.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new ze(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}/**
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
 */class Ke{constructor(e,n){if(!isFinite(e)||e<-90||e>90)throw new N(k.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(n)||n<-180||n>180)throw new N(k.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+n);this._lat=e,this._long=n}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return Ve(this._lat,e._lat)||Ve(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:Ke._jsonSchemaVersion}}static fromJSON(e){if(zt(e,Ke._jsonSchema))return new Ke(e.latitude,e.longitude)}}Ke._jsonSchemaVersion="firestore/geoPoint/1.0",Ke._jsonSchema={type:B("string",Ke._jsonSchemaVersion),latitude:B("number"),longitude:B("number")};/**
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
 */class Je{constructor(e){this._values=(e||[]).map(n=>n)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(s,o){if(s.length!==o.length)return!1;for(let c=0;c<s.length;++c)if(s[c]!==o[c])return!1;return!0}(this._values,e._values)}toJSON(){return{type:Je._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(zt(e,Je._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(n=>typeof n=="number"))return new Je(e.vectorValues);throw new N(k.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}Je._jsonSchemaVersion="firestore/vectorValue/1.0",Je._jsonSchema={type:B("string",Je._jsonSchemaVersion),vectorValues:B("object")};const Lh=new RegExp("[~\\*/\\[\\]]");function Mh(i,e,n){if(e.search(Lh)>=0)throw _r(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,i);try{return new Zr(...e.split("."))._internalPath}catch{throw _r(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,i)}}function _r(i,e,n,s,o){let c=`Function ${e}() called with invalid data`;c+=". ";let l="";return new N(k.INVALID_ARGUMENT,c+i+l)}/**
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
 */class Qr{constructor(e,n,s,o,c){this._firestore=e,this._userDataWriter=n,this._key=s,this._document=o,this._converter=c}get id(){return this._key.path.lastSegment()}get ref(){return new le(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new Uh(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const n=this._document.data.field(eo("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n)}}}class Uh extends Qr{data(){return super.data()}}function eo(i,e){return typeof e=="string"?Mh(i,e):e instanceof Zr?e._internalPath:e._delegate._internalPath}class hn{constructor(e,n){this.hasPendingWrites=e,this.fromCache=n}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class ot extends Qr{constructor(e,n,s,o,c,l){super(e,n,s,o,l),this._firestore=e,this._firestoreImpl=e,this.metadata=c}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const n=new un(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(n,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,n={}){if(this._document){const s=this._document.data.field(eo("DocumentSnapshot.get",e));if(s!==null)return this._userDataWriter.convertValue(s,n.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new N(k.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,n={};return n.type=ot._jsonSchemaVersion,n.bundle="",n.bundleSource="DocumentSnapshot",n.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?n:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),n.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),n)}}ot._jsonSchemaVersion="firestore/documentSnapshot/1.0",ot._jsonSchema={type:B("string",ot._jsonSchemaVersion),bundleSource:B("string","DocumentSnapshot"),bundleName:B("string"),bundle:B("string")};class un extends ot{data(e={}){return super.data(e)}}class Mt{constructor(e,n,s,o){this._firestore=e,this._userDataWriter=n,this._snapshot=o,this.metadata=new hn(o.hasPendingWrites,o.fromCache),this.query=s}get docs(){const e=[];return this.forEach(n=>e.push(n)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,n){this._snapshot.docs.forEach(s=>{e.call(n,new un(this._firestore,this._userDataWriter,s.key,s,new hn(this._snapshot.mutatedKeys.has(s.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const n=!!e.includeMetadataChanges;if(n&&this._snapshot.excludesMetadataChanges)throw new N(k.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===n||(this._cachedChanges=function(o,c){if(o._snapshot.oldDocs.isEmpty()){let l=0;return o._snapshot.docChanges.map(E=>{const w=new un(o._firestore,o._userDataWriter,E.doc.key,E.doc,new hn(o._snapshot.mutatedKeys.has(E.doc.key),o._snapshot.fromCache),o.query.converter);return E.doc,{type:"added",doc:w,oldIndex:-1,newIndex:l++}})}{let l=o._snapshot.oldDocs;return o._snapshot.docChanges.filter(E=>c||E.type!==3).map(E=>{const w=new un(o._firestore,o._userDataWriter,E.doc.key,E.doc,new hn(o._snapshot.mutatedKeys.has(E.doc.key),o._snapshot.fromCache),o.query.converter);let v=-1,b=-1;return E.type!==0&&(v=l.indexOf(E.doc.key),l=l.delete(E.doc.key)),E.type!==1&&(l=l.add(E.doc),b=l.indexOf(E.doc.key)),{type:xh(E.type),doc:w,oldIndex:v,newIndex:b}})}}(this,n),this._cachedChangesIncludeMetadataChanges=n),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new N(k.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=Mt._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=ph.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const n=[],s=[],o=[];return this.docs.forEach(c=>{c._document!==null&&(n.push(c._document),s.push(this._userDataWriter.convertObjectMap(c._document.data.value.mapValue.fields,"previous")),o.push(c.ref.path))}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function xh(i){switch(i){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return Ft(61501,{type:i})}}Mt._jsonSchemaVersion="firestore/querySnapshot/1.0",Mt._jsonSchema={type:B("string",Mt._jsonSchemaVersion),bundleSource:B("string","QuerySnapshot"),bundleName:B("string"),bundle:B("string")};(function(e,n=!0){(function(o){Wt=o})(ft),lt(new Ye("firestore",(s,{instanceIdentifier:o,options:c})=>{const l=s.getProvider("app").getImmediate(),E=new Dh(new hh(s.getProvider("auth-internal")),new dh(l,s.getProvider("app-check-internal")),function(v,b){if(!Object.prototype.hasOwnProperty.apply(v.options,["projectId"]))throw new N(k.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new yn(v.options.projectId,b)}(l,o),l);return c={useFetchStreams:n,...c},E._setSettings(c),E},"PUBLIC").setMultipleInstances(!0)),Ue(nr,ir,e),Ue(nr,ir,"esm2020")})();function to(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const Vh=to,no=new Ht("auth","Firebase",to());/**
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
 */const In=new Si("@firebase/auth");function Fh(i,...e){In.logLevel<=D.WARN&&In.warn(`Auth (${ft}): ${i}`,...e)}function dn(i,...e){In.logLevel<=D.ERROR&&In.error(`Auth (${ft}): ${i}`,...e)}/**
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
 */function de(i,...e){throw Mi(i,...e)}function re(i,...e){return Mi(i,...e)}function Li(i,e,n){const s={...Vh(),[e]:n};return new Ht("auth","Firebase",s).create(e,{appName:i.name})}function xe(i){return Li(i,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function io(i,e,n){const s=n;if(!(e instanceof s))throw s.name!==e.constructor.name&&de(i,"argument-error"),Li(i,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function Mi(i,...e){if(typeof i!="string"){const n=e[0],s=[...e.slice(1)];return s[0]&&(s[0].appName=i.name),i._errorFactory.create(n,...s)}return no.create(i,...e)}function C(i,e,...n){if(!i)throw Mi(e,...n)}function ge(i){const e="INTERNAL ASSERTION FAILED: "+i;throw dn(e),new Error(e)}function ye(i,e){i||ge(e)}/**
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
 */function yi(){var i;return typeof self<"u"&&((i=self.location)==null?void 0:i.href)||""}function jh(){return yr()==="http:"||yr()==="https:"}function yr(){var i;return typeof self<"u"&&((i=self.location)==null?void 0:i.protocol)||null}/**
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
 */function Bh(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(jh()||Da()||"connection"in navigator)?navigator.onLine:!0}function Hh(){if(typeof navigator>"u")return null;const i=navigator;return i.languages&&i.languages[0]||i.language||null}/**
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
 */class Gt{constructor(e,n){this.shortDelay=e,this.longDelay=n,ye(n>e,"Short delay should be less than long delay!"),this.isMobile=ka()||Oa()}get(){return Bh()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
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
 */function Ui(i,e){ye(i.emulator,"Emulator should always be set here");const{url:n}=i.emulator;return e?`${n}${e.startsWith("/")?e.slice(1):e}`:n}/**
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
 */class so{static initialize(e,n,s){this.fetchImpl=e,n&&(this.headersImpl=n),s&&(this.responseImpl=s)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;ge("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;ge("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;ge("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
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
 */const $h={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
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
 */const Wh=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],zh=new Gt(3e4,6e4);function xi(i,e){return i.tenantId&&!e.tenantId?{...e,tenantId:i.tenantId}:e}async function pt(i,e,n,s,o={}){return ro(i,o,async()=>{let c={},l={};s&&(e==="GET"?l=s:c={body:JSON.stringify(s)});const E=$t({key:i.config.apiKey,...l}).slice(1),w=await i._getAdditionalHeaders();w["Content-Type"]="application/json",i.languageCode&&(w["X-Firebase-Locale"]=i.languageCode);const v={method:e,headers:w,...c};return Na()||(v.referrerPolicy="no-referrer"),i.emulatorConfig&&Bt(i.emulatorConfig.host)&&(v.credentials="include"),so.fetch()(await oo(i,i.config.apiHost,n,E),v)})}async function ro(i,e,n){i._canInitEmulator=!1;const s={...$h,...e};try{const o=new qh(i),c=await Promise.race([n(),o.promise]);o.clearNetworkTimeout();const l=await c.json();if("needConfirmation"in l)throw ln(i,"account-exists-with-different-credential",l);if(c.ok&&!("errorMessage"in l))return l;{const E=c.ok?l.errorMessage:l.error.message,[w,v]=E.split(" : ");if(w==="FEDERATED_USER_ID_ALREADY_LINKED")throw ln(i,"credential-already-in-use",l);if(w==="EMAIL_EXISTS")throw ln(i,"email-already-in-use",l);if(w==="USER_DISABLED")throw ln(i,"user-disabled",l);const b=s[w]||w.toLowerCase().replace(/[_\s]+/g,"-");if(v)throw Li(i,b,v);de(i,b)}}catch(o){if(o instanceof Ie)throw o;de(i,"network-request-failed",{message:String(o)})}}async function Gh(i,e,n,s,o={}){const c=await pt(i,e,n,s,o);return"mfaPendingCredential"in c&&de(i,"multi-factor-auth-required",{_serverResponse:c}),c}async function oo(i,e,n,s){const o=`${e}${n}?${s}`,c=i,l=c.config.emulator?Ui(i.config,o):`${i.config.apiScheme}://${o}`;return Wh.includes(n)&&(await c._persistenceManagerAvailable,c._getPersistenceType()==="COOKIE")?c._getPersistence()._getFinalTarget(l).toString():l}class qh{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((n,s)=>{this.timer=setTimeout(()=>s(re(this.auth,"network-request-failed")),zh.get())})}}function ln(i,e,n){const s={appName:i.name};n.email&&(s.email=n.email),n.phoneNumber&&(s.phoneNumber=n.phoneNumber);const o=re(i,e,s);return o.customData._tokenResponse=n,o}/**
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
 */async function Kh(i,e){return pt(i,"POST","/v1/accounts:delete",e)}async function En(i,e){return pt(i,"POST","/v1/accounts:lookup",e)}/**
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
 */function Ut(i){if(i)try{const e=new Date(Number(i));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function Jh(i,e=!1){const n=tt(i),s=await n.getIdToken(e),o=Vi(s);C(o&&o.exp&&o.auth_time&&o.iat,n.auth,"internal-error");const c=typeof o.firebase=="object"?o.firebase:void 0,l=c==null?void 0:c.sign_in_provider;return{claims:o,token:s,authTime:Ut(ci(o.auth_time)),issuedAtTime:Ut(ci(o.iat)),expirationTime:Ut(ci(o.exp)),signInProvider:l||null,signInSecondFactor:(c==null?void 0:c.sign_in_second_factor)||null}}function ci(i){return Number(i)*1e3}function Vi(i){const[e,n,s]=i.split(".");if(e===void 0||n===void 0||s===void 0)return dn("JWT malformed, contained fewer than 3 sections"),null;try{const o=_n(n);return o?JSON.parse(o):(dn("Failed to decode base64 JWT payload"),null)}catch(o){return dn("Caught error parsing JWT payload as JSON",o==null?void 0:o.toString()),null}}function Ir(i){const e=Vi(i);return C(e,"internal-error"),C(typeof e.exp<"u","internal-error"),C(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
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
 */async function jt(i,e,n=!1){if(n)return e;try{return await e}catch(s){throw s instanceof Ie&&Xh(s)&&i.auth.currentUser===i&&await i.auth.signOut(),s}}function Xh({code:i}){return i==="auth/user-disabled"||i==="auth/user-token-expired"}/**
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
 */class Yh{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const n=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),n}else{this.errorBackoff=3e4;const s=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,s)}}schedule(e=!1){if(!this.isRunning)return;const n=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},n)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
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
 */class Ii{constructor(e,n){this.createdAt=e,this.lastLoginAt=n,this._initializeTime()}_initializeTime(){this.lastSignInTime=Ut(this.lastLoginAt),this.creationTime=Ut(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
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
 */async function wn(i){var S;const e=i.auth,n=await i.getIdToken(),s=await jt(i,En(e,{idToken:n}));C(s==null?void 0:s.users.length,e,"internal-error");const o=s.users[0];i._notifyReloadListener(o);const c=(S=o.providerUserInfo)!=null&&S.length?ao(o.providerUserInfo):[],l=Qh(i.providerData,c),E=i.isAnonymous,w=!(i.email&&o.passwordHash)&&!(l!=null&&l.length),v=E?w:!1,b={uid:o.localId,displayName:o.displayName||null,photoURL:o.photoUrl||null,email:o.email||null,emailVerified:o.emailVerified||!1,phoneNumber:o.phoneNumber||null,tenantId:o.tenantId||null,providerData:l,metadata:new Ii(o.createdAt,o.lastLoginAt),isAnonymous:v};Object.assign(i,b)}async function Zh(i){const e=tt(i);await wn(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function Qh(i,e){return[...i.filter(s=>!e.some(o=>o.providerId===s.providerId)),...e]}function ao(i){return i.map(({providerId:e,...n})=>({providerId:e,uid:n.rawId||"",displayName:n.displayName||null,email:n.email||null,phoneNumber:n.phoneNumber||null,photoURL:n.photoUrl||null}))}/**
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
 */async function el(i,e){const n=await ro(i,{},async()=>{const s=$t({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:o,apiKey:c}=i.config,l=await oo(i,o,"/v1/token",`key=${c}`),E=await i._getAdditionalHeaders();E["Content-Type"]="application/x-www-form-urlencoded";const w={method:"POST",headers:E,body:s};return i.emulatorConfig&&Bt(i.emulatorConfig.host)&&(w.credentials="include"),so.fetch()(l,w)});return{accessToken:n.access_token,expiresIn:n.expires_in,refreshToken:n.refresh_token}}async function tl(i,e){return pt(i,"POST","/v2/accounts:revokeToken",xi(i,e))}/**
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
 */class at{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){C(e.idToken,"internal-error"),C(typeof e.idToken<"u","internal-error"),C(typeof e.refreshToken<"u","internal-error");const n="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):Ir(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,n)}updateFromIdToken(e){C(e.length!==0,"internal-error");const n=Ir(e);this.updateTokensAndExpiration(e,null,n)}async getToken(e,n=!1){return!n&&this.accessToken&&!this.isExpired?this.accessToken:(C(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,n){const{accessToken:s,refreshToken:o,expiresIn:c}=await el(e,n);this.updateTokensAndExpiration(s,o,Number(c))}updateTokensAndExpiration(e,n,s){this.refreshToken=n||null,this.accessToken=e||null,this.expirationTime=Date.now()+s*1e3}static fromJSON(e,n){const{refreshToken:s,accessToken:o,expirationTime:c}=n,l=new at;return s&&(C(typeof s=="string","internal-error",{appName:e}),l.refreshToken=s),o&&(C(typeof o=="string","internal-error",{appName:e}),l.accessToken=o),c&&(C(typeof c=="number","internal-error",{appName:e}),l.expirationTime=c),l}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new at,this.toJSON())}_performRefresh(){return ge("not implemented")}}/**
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
 */function Re(i,e){C(typeof i=="string"||typeof i>"u","internal-error",{appName:e})}class se{constructor({uid:e,auth:n,stsTokenManager:s,...o}){this.providerId="firebase",this.proactiveRefresh=new Yh(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=n,this.stsTokenManager=s,this.accessToken=s.accessToken,this.displayName=o.displayName||null,this.email=o.email||null,this.emailVerified=o.emailVerified||!1,this.phoneNumber=o.phoneNumber||null,this.photoURL=o.photoURL||null,this.isAnonymous=o.isAnonymous||!1,this.tenantId=o.tenantId||null,this.providerData=o.providerData?[...o.providerData]:[],this.metadata=new Ii(o.createdAt||void 0,o.lastLoginAt||void 0)}async getIdToken(e){const n=await jt(this,this.stsTokenManager.getToken(this.auth,e));return C(n,this.auth,"internal-error"),this.accessToken!==n&&(this.accessToken=n,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),n}getIdTokenResult(e){return Jh(this,e)}reload(){return Zh(this)}_assign(e){this!==e&&(C(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(n=>({...n})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const n=new se({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return n.metadata._copy(this.metadata),n}_onReload(e){C(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,n=!1){let s=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),s=!0),n&&await wn(this),await this.auth._persistUserIfCurrent(this),s&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(te(this.auth.app))return Promise.reject(xe(this.auth));const e=await this.getIdToken();return await jt(this,Kh(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,n){const s=n.displayName??void 0,o=n.email??void 0,c=n.phoneNumber??void 0,l=n.photoURL??void 0,E=n.tenantId??void 0,w=n._redirectEventId??void 0,v=n.createdAt??void 0,b=n.lastLoginAt??void 0,{uid:S,emailVerified:A,isAnonymous:x,providerData:L,stsTokenManager:F}=n;C(S&&F,e,"internal-error");const U=at.fromJSON(this.name,F);C(typeof S=="string",e,"internal-error"),Re(s,e.name),Re(o,e.name),C(typeof A=="boolean",e,"internal-error"),C(typeof x=="boolean",e,"internal-error"),Re(c,e.name),Re(l,e.name),Re(E,e.name),Re(w,e.name),Re(v,e.name),Re(b,e.name);const X=new se({uid:S,auth:e,email:o,emailVerified:A,displayName:s,isAnonymous:x,photoURL:l,phoneNumber:c,tenantId:E,stsTokenManager:U,createdAt:v,lastLoginAt:b});return L&&Array.isArray(L)&&(X.providerData=L.map(Y=>({...Y}))),w&&(X._redirectEventId=w),X}static async _fromIdTokenResponse(e,n,s=!1){const o=new at;o.updateFromServerResponse(n);const c=new se({uid:n.localId,auth:e,stsTokenManager:o,isAnonymous:s});return await wn(c),c}static async _fromGetAccountInfoResponse(e,n,s){const o=n.users[0];C(o.localId!==void 0,"internal-error");const c=o.providerUserInfo!==void 0?ao(o.providerUserInfo):[],l=!(o.email&&o.passwordHash)&&!(c!=null&&c.length),E=new at;E.updateFromIdToken(s);const w=new se({uid:o.localId,auth:e,stsTokenManager:E,isAnonymous:l}),v={uid:o.localId,displayName:o.displayName||null,photoURL:o.photoUrl||null,email:o.email||null,emailVerified:o.emailVerified||!1,phoneNumber:o.phoneNumber||null,tenantId:o.tenantId||null,providerData:c,metadata:new Ii(o.createdAt,o.lastLoginAt),isAnonymous:!(o.email&&o.passwordHash)&&!(c!=null&&c.length)};return Object.assign(w,v),w}}/**
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
 */const Er=new Map;function me(i){ye(i instanceof Function,"Expected a class definition");let e=Er.get(i);return e?(ye(e instanceof i,"Instance stored in cache mismatched with class"),e):(e=new i,Er.set(i,e),e)}/**
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
 */class co{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,n){this.storage[e]=n}async _get(e){const n=this.storage[e];return n===void 0?null:n}async _remove(e){delete this.storage[e]}_addListener(e,n){}_removeListener(e,n){}}co.type="NONE";const wr=co;/**
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
 */function fn(i,e,n){return`firebase:${i}:${e}:${n}`}class ct{constructor(e,n,s){this.persistence=e,this.auth=n,this.userKey=s;const{config:o,name:c}=this.auth;this.fullUserKey=fn(this.userKey,o.apiKey,c),this.fullPersistenceKey=fn("persistence",o.apiKey,c),this.boundEventHandler=n._onStorageEvent.bind(n),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const n=await En(this.auth,{idToken:e}).catch(()=>{});return n?se._fromGetAccountInfoResponse(this.auth,n,e):null}return se._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const n=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,n)return this.setCurrentUser(n)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,n,s="authUser"){if(!n.length)return new ct(me(wr),e,s);const o=(await Promise.all(n.map(async v=>{if(await v._isAvailable())return v}))).filter(v=>v);let c=o[0]||me(wr);const l=fn(s,e.config.apiKey,e.name);let E=null;for(const v of n)try{const b=await v._get(l);if(b){let S;if(typeof b=="string"){const A=await En(e,{idToken:b}).catch(()=>{});if(!A)break;S=await se._fromGetAccountInfoResponse(e,A,b)}else S=se._fromJSON(e,b);v!==c&&(E=S),c=v;break}}catch{}const w=o.filter(v=>v._shouldAllowMigration);return!c._shouldAllowMigration||!w.length?new ct(c,e,s):(c=w[0],E&&await c._set(l,E.toJSON()),await Promise.all(n.map(async v=>{if(v!==c)try{await v._remove(l)}catch{}})),new ct(c,e,s))}}/**
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
 */function vr(i){const e=i.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(fo(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(ho(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(go(e))return"Blackberry";if(mo(e))return"Webos";if(lo(e))return"Safari";if((e.includes("chrome/")||uo(e))&&!e.includes("edge/"))return"Chrome";if(po(e))return"Android";{const n=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,s=i.match(n);if((s==null?void 0:s.length)===2)return s[1]}return"Other"}function ho(i=K()){return/firefox\//i.test(i)}function lo(i=K()){const e=i.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function uo(i=K()){return/crios\//i.test(i)}function fo(i=K()){return/iemobile/i.test(i)}function po(i=K()){return/android/i.test(i)}function go(i=K()){return/blackberry/i.test(i)}function mo(i=K()){return/webos/i.test(i)}function Fi(i=K()){return/iphone|ipad|ipod/i.test(i)||/macintosh/i.test(i)&&/mobile/i.test(i)}function nl(i=K()){var e;return Fi(i)&&!!((e=window.navigator)!=null&&e.standalone)}function il(){return La()&&document.documentMode===10}function _o(i=K()){return Fi(i)||po(i)||mo(i)||go(i)||/windows phone/i.test(i)||fo(i)}/**
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
 */function yo(i,e=[]){let n;switch(i){case"Browser":n=vr(K());break;case"Worker":n=`${vr(K())}-${i}`;break;default:n=i}const s=e.length?e.join(","):"FirebaseCore-web";return`${n}/JsCore/${ft}/${s}`}/**
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
 */class sl{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,n){const s=c=>new Promise((l,E)=>{try{const w=e(c);l(w)}catch(w){E(w)}});s.onAbort=n,this.queue.push(s);const o=this.queue.length-1;return()=>{this.queue[o]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const n=[];try{for(const s of this.queue)await s(e),s.onAbort&&n.push(s.onAbort)}catch(s){n.reverse();for(const o of n)try{o()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:s==null?void 0:s.message})}}}/**
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
 */async function rl(i,e={}){return pt(i,"GET","/v2/passwordPolicy",xi(i,e))}/**
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
 */const ol=6;class al{constructor(e){var s;const n=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=n.minPasswordLength??ol,n.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=n.maxPasswordLength),n.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=n.containsLowercaseCharacter),n.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=n.containsUppercaseCharacter),n.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=n.containsNumericCharacter),n.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=n.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((s=e.allowedNonAlphanumericCharacters)==null?void 0:s.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const n={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,n),this.validatePasswordCharacterOptions(e,n),n.isValid&&(n.isValid=n.meetsMinPasswordLength??!0),n.isValid&&(n.isValid=n.meetsMaxPasswordLength??!0),n.isValid&&(n.isValid=n.containsLowercaseLetter??!0),n.isValid&&(n.isValid=n.containsUppercaseLetter??!0),n.isValid&&(n.isValid=n.containsNumericCharacter??!0),n.isValid&&(n.isValid=n.containsNonAlphanumericCharacter??!0),n}validatePasswordLengthOptions(e,n){const s=this.customStrengthOptions.minPasswordLength,o=this.customStrengthOptions.maxPasswordLength;s&&(n.meetsMinPasswordLength=e.length>=s),o&&(n.meetsMaxPasswordLength=e.length<=o)}validatePasswordCharacterOptions(e,n){this.updatePasswordCharacterOptionsStatuses(n,!1,!1,!1,!1);let s;for(let o=0;o<e.length;o++)s=e.charAt(o),this.updatePasswordCharacterOptionsStatuses(n,s>="a"&&s<="z",s>="A"&&s<="Z",s>="0"&&s<="9",this.allowedNonAlphanumericCharacters.includes(s))}updatePasswordCharacterOptionsStatuses(e,n,s,o,c){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=n)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=s)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=o)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=c))}}/**
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
 */class cl{constructor(e,n,s,o){this.app=e,this.heartbeatServiceProvider=n,this.appCheckServiceProvider=s,this.config=o,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Tr(this),this.idTokenSubscription=new Tr(this),this.beforeStateQueue=new sl(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=no,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=o.sdkClientVersion,this._persistenceManagerAvailable=new Promise(c=>this._resolvePersistenceManagerAvailable=c)}_initializeWithPersistence(e,n){return n&&(this._popupRedirectResolver=me(n)),this._initializationPromise=this.queue(async()=>{var s,o,c;if(!this._deleted&&(this.persistenceManager=await ct.create(this,e),(s=this._resolvePersistenceManagerAvailable)==null||s.call(this),!this._deleted)){if((o=this._popupRedirectResolver)!=null&&o._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(n),this.lastNotifiedUid=((c=this.currentUser)==null?void 0:c.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const n=await En(this,{idToken:e}),s=await se._fromGetAccountInfoResponse(this,n,e);await this.directlySetCurrentUser(s)}catch(n){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",n),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var c;if(te(this.app)){const l=this.app.settings.authIdToken;return l?new Promise(E=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(l).then(E,E))}):this.directlySetCurrentUser(null)}const n=await this.assertedPersistence.getCurrentUser();let s=n,o=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const l=(c=this.redirectUser)==null?void 0:c._redirectEventId,E=s==null?void 0:s._redirectEventId,w=await this.tryRedirectSignIn(e);(!l||l===E)&&(w!=null&&w.user)&&(s=w.user,o=!0)}if(!s)return this.directlySetCurrentUser(null);if(!s._redirectEventId){if(o)try{await this.beforeStateQueue.runMiddleware(s)}catch(l){s=n,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(l))}return s?this.reloadAndSetCurrentUserOrClear(s):this.directlySetCurrentUser(null)}return C(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===s._redirectEventId?this.directlySetCurrentUser(s):this.reloadAndSetCurrentUserOrClear(s)}async tryRedirectSignIn(e){let n=null;try{n=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return n}async reloadAndSetCurrentUserOrClear(e){try{await wn(e)}catch(n){if((n==null?void 0:n.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=Hh()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(te(this.app))return Promise.reject(xe(this));const n=e?tt(e):null;return n&&C(n.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(n&&n._clone(this))}async _updateCurrentUser(e,n=!1){if(!this._deleted)return e&&C(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),n||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return te(this.app)?Promise.reject(xe(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return te(this.app)?Promise.reject(xe(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(me(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const n=this._getPasswordPolicyInternal();return n.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):n.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await rl(this),n=new al(e);this.tenantId===null?this._projectPasswordPolicy=n:this._tenantPasswordPolicies[this.tenantId]=n}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new Ht("auth","Firebase",e())}onAuthStateChanged(e,n,s){return this.registerStateListener(this.authStateSubscription,e,n,s)}beforeAuthStateChanged(e,n){return this.beforeStateQueue.pushCallback(e,n)}onIdTokenChanged(e,n,s){return this.registerStateListener(this.idTokenSubscription,e,n,s)}authStateReady(){return new Promise((e,n)=>{if(this.currentUser)e();else{const s=this.onAuthStateChanged(()=>{s(),e()},n)}})}async revokeAccessToken(e){if(this.currentUser){const n=await this.currentUser.getIdToken(),s={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:n};this.tenantId!=null&&(s.tenantId=this.tenantId),await tl(this,s)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,n){const s=await this.getOrInitRedirectPersistenceManager(n);return e===null?s.removeCurrentUser():s.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const n=e&&me(e)||this._popupRedirectResolver;C(n,this,"argument-error"),this.redirectPersistenceManager=await ct.create(this,[me(n._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var n,s;return this._isInitialized&&await this.queue(async()=>{}),((n=this._currentUser)==null?void 0:n._redirectEventId)===e?this._currentUser:((s=this.redirectUser)==null?void 0:s._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var n;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((n=this.currentUser)==null?void 0:n.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,n,s,o){if(this._deleted)return()=>{};const c=typeof n=="function"?n:n.next.bind(n);let l=!1;const E=this._isInitialized?Promise.resolve():this._initializationPromise;if(C(E,this,"internal-error"),E.then(()=>{l||c(this.currentUser)}),typeof n=="function"){const w=e.addObserver(n,s,o);return()=>{l=!0,w()}}else{const w=e.addObserver(n);return()=>{l=!0,w()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return C(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=yo(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var o;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const n=await((o=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:o.getHeartbeatsHeader());n&&(e["X-Firebase-Client"]=n);const s=await this._getAppCheckToken();return s&&(e["X-Firebase-AppCheck"]=s),e}async _getAppCheckToken(){var n;if(te(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((n=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:n.getToken());return e!=null&&e.error&&Fh(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function gt(i){return tt(i)}class Tr{constructor(e){this.auth=e,this.observer=null,this.addObserver=Ha(n=>this.observer=n)}get next(){return C(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
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
 */let ji={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function hl(i){ji=i}function ll(i){return ji.loadJS(i)}function ul(){return ji.gapiScript}function dl(i){return`__${i}${Math.floor(Math.random()*1e6)}`}/**
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
 */function fl(i,e){const n=Ci(i,"auth");if(n.isInitialized()){const o=n.getImmediate(),c=n.getOptions();if(Xe(c,e??{}))return o;de(o,"already-initialized")}return n.initialize({options:e})}function pl(i,e){const n=(e==null?void 0:e.persistence)||[],s=(Array.isArray(n)?n:[n]).map(me);e!=null&&e.errorMap&&i._updateErrorMap(e.errorMap),i._initializeWithPersistence(s,e==null?void 0:e.popupRedirectResolver)}function gl(i,e,n){const s=gt(i);C(/^https?:\/\//.test(e),s,"invalid-emulator-scheme");const o=!1,c=Io(e),{host:l,port:E}=ml(e),w=E===null?"":`:${E}`,v={url:`${c}//${l}${w}/`},b=Object.freeze({host:l,port:E,protocol:c.replace(":",""),options:Object.freeze({disableWarnings:o})});if(!s._canInitEmulator){C(s.config.emulator&&s.emulatorConfig,s,"emulator-config-failed"),C(Xe(v,s.config.emulator)&&Xe(b,s.emulatorConfig),s,"emulator-config-failed");return}s.config.emulator=v,s.emulatorConfig=b,s.settings.appVerificationDisabledForTesting=!0,Bt(l)?(jr(`${c}//${l}${w}`),Br("Auth",!0)):_l()}function Io(i){const e=i.indexOf(":");return e<0?"":i.substr(0,e+1)}function ml(i){const e=Io(i),n=/(\/\/)?([^?#/]+)/.exec(i.substr(e.length));if(!n)return{host:"",port:null};const s=n[2].split("@").pop()||"",o=/^(\[[^\]]+\])(:|$)/.exec(s);if(o){const c=o[1];return{host:c,port:Ar(s.substr(c.length+1))}}else{const[c,l]=s.split(":");return{host:c,port:Ar(l)}}}function Ar(i){if(!i)return null;const e=Number(i);return isNaN(e)?null:e}function _l(){function i(){const e=document.createElement("p"),n=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",n.position="fixed",n.width="100%",n.backgroundColor="#ffffff",n.border=".1em solid #000000",n.color="#b50000",n.bottom="0px",n.left="0px",n.margin="0px",n.zIndex="10000",n.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",i):i())}/**
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
 */class Eo{constructor(e,n){this.providerId=e,this.signInMethod=n}toJSON(){return ge("not implemented")}_getIdTokenResponse(e){return ge("not implemented")}_linkToIdToken(e,n){return ge("not implemented")}_getReauthenticationResolver(e){return ge("not implemented")}}/**
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
 */async function ht(i,e){return Gh(i,"POST","/v1/accounts:signInWithIdp",xi(i,e))}/**
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
 */const yl="http://localhost";class Qe extends Eo{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const n=new Qe(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(n.idToken=e.idToken),e.accessToken&&(n.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(n.nonce=e.nonce),e.pendingToken&&(n.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(n.accessToken=e.oauthToken,n.secret=e.oauthTokenSecret):de("argument-error"),n}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const n=typeof e=="string"?JSON.parse(e):e,{providerId:s,signInMethod:o,...c}=n;if(!s||!o)return null;const l=new Qe(s,o);return l.idToken=c.idToken||void 0,l.accessToken=c.accessToken||void 0,l.secret=c.secret,l.nonce=c.nonce,l.pendingToken=c.pendingToken||null,l}_getIdTokenResponse(e){const n=this.buildRequest();return ht(e,n)}_linkToIdToken(e,n){const s=this.buildRequest();return s.idToken=n,ht(e,s)}_getReauthenticationResolver(e){const n=this.buildRequest();return n.autoCreate=!1,ht(e,n)}buildRequest(){const e={requestUri:yl,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const n={};this.idToken&&(n.id_token=this.idToken),this.accessToken&&(n.access_token=this.accessToken),this.secret&&(n.oauth_token_secret=this.secret),n.providerId=this.providerId,this.nonce&&!this.pendingToken&&(n.nonce=this.nonce),e.postBody=$t(n)}return e}}/**
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
 */class Sn{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
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
 */class qt extends Sn{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
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
 */class Ne extends qt{constructor(){super("facebook.com")}static credential(e){return Qe._fromParams({providerId:Ne.PROVIDER_ID,signInMethod:Ne.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Ne.credentialFromTaggedObject(e)}static credentialFromError(e){return Ne.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Ne.credential(e.oauthAccessToken)}catch{return null}}}Ne.FACEBOOK_SIGN_IN_METHOD="facebook.com";Ne.PROVIDER_ID="facebook.com";/**
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
 */class pe extends qt{constructor(){super("google.com"),this.addScope("profile")}static credential(e,n){return Qe._fromParams({providerId:pe.PROVIDER_ID,signInMethod:pe.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:n})}static credentialFromResult(e){return pe.credentialFromTaggedObject(e)}static credentialFromError(e){return pe.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:n,oauthAccessToken:s}=e;if(!n&&!s)return null;try{return pe.credential(n,s)}catch{return null}}}pe.GOOGLE_SIGN_IN_METHOD="google.com";pe.PROVIDER_ID="google.com";/**
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
 */class De extends qt{constructor(){super("github.com")}static credential(e){return Qe._fromParams({providerId:De.PROVIDER_ID,signInMethod:De.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return De.credentialFromTaggedObject(e)}static credentialFromError(e){return De.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return De.credential(e.oauthAccessToken)}catch{return null}}}De.GITHUB_SIGN_IN_METHOD="github.com";De.PROVIDER_ID="github.com";/**
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
 */class Oe extends qt{constructor(){super("twitter.com")}static credential(e,n){return Qe._fromParams({providerId:Oe.PROVIDER_ID,signInMethod:Oe.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:n})}static credentialFromResult(e){return Oe.credentialFromTaggedObject(e)}static credentialFromError(e){return Oe.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:n,oauthTokenSecret:s}=e;if(!n||!s)return null;try{return Oe.credential(n,s)}catch{return null}}}Oe.TWITTER_SIGN_IN_METHOD="twitter.com";Oe.PROVIDER_ID="twitter.com";/**
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
 */class dt{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,n,s,o=!1){const c=await se._fromIdTokenResponse(e,s,o),l=Sr(s);return new dt({user:c,providerId:l,_tokenResponse:s,operationType:n})}static async _forOperation(e,n,s){await e._updateTokensIfNecessary(s,!0);const o=Sr(s);return new dt({user:e,providerId:o,_tokenResponse:s,operationType:n})}}function Sr(i){return i.providerId?i.providerId:"phoneNumber"in i?"phone":null}/**
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
 */class vn extends Ie{constructor(e,n,s,o){super(n.code,n.message),this.operationType=s,this.user=o,Object.setPrototypeOf(this,vn.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:n.customData._serverResponse,operationType:s}}static _fromErrorAndOperation(e,n,s,o){return new vn(e,n,s,o)}}function wo(i,e,n,s){return(e==="reauthenticate"?n._getReauthenticationResolver(i):n._getIdTokenResponse(i)).catch(c=>{throw c.code==="auth/multi-factor-auth-required"?vn._fromErrorAndOperation(i,c,e,s):c})}async function Il(i,e,n=!1){const s=await jt(i,e._linkToIdToken(i.auth,await i.getIdToken()),n);return dt._forOperation(i,"link",s)}/**
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
 */async function El(i,e,n=!1){const{auth:s}=i;if(te(s.app))return Promise.reject(xe(s));const o="reauthenticate";try{const c=await jt(i,wo(s,o,e,i),n);C(c.idToken,s,"internal-error");const l=Vi(c.idToken);C(l,s,"internal-error");const{sub:E}=l;return C(i.uid===E,s,"user-mismatch"),dt._forOperation(i,o,c)}catch(c){throw(c==null?void 0:c.code)==="auth/user-not-found"&&de(s,"user-mismatch"),c}}/**
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
 */async function wl(i,e,n=!1){if(te(i.app))return Promise.reject(xe(i));const s="signIn",o=await wo(i,s,e),c=await dt._fromIdTokenResponse(i,s,o);return n||await i._updateCurrentUser(c.user),c}function vl(i,e,n,s){return tt(i).onIdTokenChanged(e,n,s)}function Tl(i,e,n){return tt(i).beforeAuthStateChanged(e,n)}function Al(i,e,n,s){return tt(i).onAuthStateChanged(e,n,s)}const Tn="__sak";/**
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
 */class vo{constructor(e,n){this.storageRetriever=e,this.type=n}_isAvailable(){try{return this.storage?(this.storage.setItem(Tn,"1"),this.storage.removeItem(Tn),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,n){return this.storage.setItem(e,JSON.stringify(n)),Promise.resolve()}_get(e){const n=this.storage.getItem(e);return Promise.resolve(n?JSON.parse(n):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
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
 */const Sl=1e3,bl=10;class To extends vo{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,n)=>this.onStorageEvent(e,n),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=_o(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const n of Object.keys(this.listeners)){const s=this.storage.getItem(n),o=this.localCache[n];s!==o&&e(n,o,s)}}onStorageEvent(e,n=!1){if(!e.key){this.forAllChangedKeys((l,E,w)=>{this.notifyListeners(l,w)});return}const s=e.key;n?this.detachListener():this.stopPolling();const o=()=>{const l=this.storage.getItem(s);!n&&this.localCache[s]===l||this.notifyListeners(s,l)},c=this.storage.getItem(s);il()&&c!==e.newValue&&e.newValue!==e.oldValue?setTimeout(o,bl):o()}notifyListeners(e,n){this.localCache[e]=n;const s=this.listeners[e];if(s)for(const o of Array.from(s))o(n&&JSON.parse(n))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,n,s)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:n,newValue:s}),!0)})},Sl)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,n){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(n)}_removeListener(e,n){this.listeners[e]&&(this.listeners[e].delete(n),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,n){await super._set(e,n),this.localCache[e]=JSON.stringify(n)}async _get(e){const n=await super._get(e);return this.localCache[e]=JSON.stringify(n),n}async _remove(e){await super._remove(e),delete this.localCache[e]}}To.type="LOCAL";const Cl=To;/**
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
 */class Ao extends vo{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,n){}_removeListener(e,n){}}Ao.type="SESSION";const So=Ao;/**
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
 */function Pl(i){return Promise.all(i.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(n){return{fulfilled:!1,reason:n}}}))}/**
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
 */class bn{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const n=this.receivers.find(o=>o.isListeningto(e));if(n)return n;const s=new bn(e);return this.receivers.push(s),s}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const n=e,{eventId:s,eventType:o,data:c}=n.data,l=this.handlersMap[o];if(!(l!=null&&l.size))return;n.ports[0].postMessage({status:"ack",eventId:s,eventType:o});const E=Array.from(l).map(async v=>v(n.origin,c)),w=await Pl(E);n.ports[0].postMessage({status:"done",eventId:s,eventType:o,response:w})}_subscribe(e,n){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(n)}_unsubscribe(e,n){this.handlersMap[e]&&n&&this.handlersMap[e].delete(n),(!n||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}bn.receivers=[];/**
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
 */function Bi(i="",e=10){let n="";for(let s=0;s<e;s++)n+=Math.floor(Math.random()*10);return i+n}/**
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
 */class Rl{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,n,s=50){const o=typeof MessageChannel<"u"?new MessageChannel:null;if(!o)throw new Error("connection_unavailable");let c,l;return new Promise((E,w)=>{const v=Bi("",20);o.port1.start();const b=setTimeout(()=>{w(new Error("unsupported_event"))},s);l={messageChannel:o,onMessage(S){const A=S;if(A.data.eventId===v)switch(A.data.status){case"ack":clearTimeout(b),c=setTimeout(()=>{w(new Error("timeout"))},3e3);break;case"done":clearTimeout(c),E(A.data.response);break;default:clearTimeout(b),clearTimeout(c),w(new Error("invalid_response"));break}}},this.handlers.add(l),o.port1.addEventListener("message",l.onMessage),this.target.postMessage({eventType:e,eventId:v,data:n},[o.port2])}).finally(()=>{l&&this.removeMessageHandler(l)})}}/**
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
 */function ue(){return window}function kl(i){ue().location.href=i}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */function bo(){return typeof ue().WorkerGlobalScope<"u"&&typeof ue().importScripts=="function"}async function Nl(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function Dl(){var i;return((i=navigator==null?void 0:navigator.serviceWorker)==null?void 0:i.controller)||null}function Ol(){return bo()?self:null}/**
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
 */const Co="firebaseLocalStorageDb",Ll=1,An="firebaseLocalStorage",Po="fbase_key";class Kt{constructor(e){this.request=e}toPromise(){return new Promise((e,n)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{n(this.request.error)})})}}function Cn(i,e){return i.transaction([An],e?"readwrite":"readonly").objectStore(An)}function Ml(){const i=indexedDB.deleteDatabase(Co);return new Kt(i).toPromise()}function Ei(){const i=indexedDB.open(Co,Ll);return new Promise((e,n)=>{i.addEventListener("error",()=>{n(i.error)}),i.addEventListener("upgradeneeded",()=>{const s=i.result;try{s.createObjectStore(An,{keyPath:Po})}catch(o){n(o)}}),i.addEventListener("success",async()=>{const s=i.result;s.objectStoreNames.contains(An)?e(s):(s.close(),await Ml(),e(await Ei()))})})}async function br(i,e,n){const s=Cn(i,!0).put({[Po]:e,value:n});return new Kt(s).toPromise()}async function Ul(i,e){const n=Cn(i,!1).get(e),s=await new Kt(n).toPromise();return s===void 0?null:s.value}function Cr(i,e){const n=Cn(i,!0).delete(e);return new Kt(n).toPromise()}const xl=800,Vl=3;class Ro{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await Ei(),this.db)}async _withRetries(e){let n=0;for(;;)try{const s=await this._openDb();return await e(s)}catch(s){if(n++>Vl)throw s;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return bo()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=bn._getInstance(Ol()),this.receiver._subscribe("keyChanged",async(e,n)=>({keyProcessed:(await this._poll()).includes(n.key)})),this.receiver._subscribe("ping",async(e,n)=>["keyChanged"])}async initializeSender(){var n,s;if(this.activeServiceWorker=await Nl(),!this.activeServiceWorker)return;this.sender=new Rl(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(n=e[0])!=null&&n.fulfilled&&(s=e[0])!=null&&s.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||Dl()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await Ei();return await br(e,Tn,"1"),await Cr(e,Tn),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,n){return this._withPendingWrite(async()=>(await this._withRetries(s=>br(s,e,n)),this.localCache[e]=n,this.notifyServiceWorker(e)))}async _get(e){const n=await this._withRetries(s=>Ul(s,e));return this.localCache[e]=n,n}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(n=>Cr(n,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(o=>{const c=Cn(o,!1).getAll();return new Kt(c).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const n=[],s=new Set;if(e.length!==0)for(const{fbase_key:o,value:c}of e)s.add(o),JSON.stringify(this.localCache[o])!==JSON.stringify(c)&&(this.notifyListeners(o,c),n.push(o));for(const o of Object.keys(this.localCache))this.localCache[o]&&!s.has(o)&&(this.notifyListeners(o,null),n.push(o));return n}notifyListeners(e,n){this.localCache[e]=n;const s=this.listeners[e];if(s)for(const o of Array.from(s))o(n)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),xl)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,n){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(n)}_removeListener(e,n){this.listeners[e]&&(this.listeners[e].delete(n),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}Ro.type="LOCAL";const Fl=Ro;new Gt(3e4,6e4);/**
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
 */function Hi(i,e){return e?me(e):(C(i._popupRedirectResolver,i,"argument-error"),i._popupRedirectResolver)}/**
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
 */class $i extends Eo{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return ht(e,this._buildIdpRequest())}_linkToIdToken(e,n){return ht(e,this._buildIdpRequest(n))}_getReauthenticationResolver(e){return ht(e,this._buildIdpRequest())}_buildIdpRequest(e){const n={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(n.idToken=e),n}}function jl(i){return wl(i.auth,new $i(i),i.bypassAuthState)}function Bl(i){const{auth:e,user:n}=i;return C(n,e,"internal-error"),El(n,new $i(i),i.bypassAuthState)}async function Hl(i){const{auth:e,user:n}=i;return C(n,e,"internal-error"),Il(n,new $i(i),i.bypassAuthState)}/**
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
 */class ko{constructor(e,n,s,o,c=!1){this.auth=e,this.resolver=s,this.user=o,this.bypassAuthState=c,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(n)?n:[n]}execute(){return new Promise(async(e,n)=>{this.pendingPromise={resolve:e,reject:n};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(s){this.reject(s)}})}async onAuthEvent(e){const{urlResponse:n,sessionId:s,postBody:o,tenantId:c,error:l,type:E}=e;if(l){this.reject(l);return}const w={auth:this.auth,requestUri:n,sessionId:s,tenantId:c||void 0,postBody:o||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(E)(w))}catch(v){this.reject(v)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return jl;case"linkViaPopup":case"linkViaRedirect":return Hl;case"reauthViaPopup":case"reauthViaRedirect":return Bl;default:de(this.auth,"internal-error")}}resolve(e){ye(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){ye(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
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
 */const $l=new Gt(2e3,1e4);async function Wl(i,e,n){if(te(i.app))return Promise.reject(re(i,"operation-not-supported-in-this-environment"));const s=gt(i);io(i,e,Sn);const o=Hi(s,n);return new qe(s,"signInViaPopup",e,o).executeNotNull()}class qe extends ko{constructor(e,n,s,o,c){super(e,n,o,c),this.provider=s,this.authWindow=null,this.pollId=null,qe.currentPopupAction&&qe.currentPopupAction.cancel(),qe.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return C(e,this.auth,"internal-error"),e}async onExecution(){ye(this.filter.length===1,"Popup operations only handle one event");const e=Bi();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(n=>{this.reject(n)}),this.resolver._isIframeWebStorageSupported(this.auth,n=>{n||this.reject(re(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(re(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,qe.currentPopupAction=null}pollUserCancellation(){const e=()=>{var n,s;if((s=(n=this.authWindow)==null?void 0:n.window)!=null&&s.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(re(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,$l.get())};e()}}qe.currentPopupAction=null;/**
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
 */const zl="pendingRedirect",pn=new Map;class Gl extends ko{constructor(e,n,s=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],n,void 0,s),this.eventId=null}async execute(){let e=pn.get(this.auth._key());if(!e){try{const s=await ql(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(s)}catch(n){e=()=>Promise.reject(n)}pn.set(this.auth._key(),e)}return this.bypassAuthState||pn.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const n=await this.auth._redirectUserForId(e.eventId);if(n)return this.user=n,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function ql(i,e){const n=Do(e),s=No(i);if(!await s._isAvailable())return!1;const o=await s._get(n)==="true";return await s._remove(n),o}async function Kl(i,e){return No(i)._set(Do(e),"true")}function Jl(i,e){pn.set(i._key(),e)}function No(i){return me(i._redirectPersistence)}function Do(i){return fn(zl,i.config.apiKey,i.name)}/**
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
 */function Xl(i,e,n){return Yl(i,e,n)}async function Yl(i,e,n){if(te(i.app))return Promise.reject(xe(i));const s=gt(i);io(i,e,Sn),await s._initializationPromise;const o=Hi(s,n);return await Kl(o,s),o._openRedirect(s,e,"signInViaRedirect")}async function Zl(i,e){return await gt(i)._initializationPromise,Oo(i,e,!1)}async function Oo(i,e,n=!1){if(te(i.app))return Promise.reject(xe(i));const s=gt(i),o=Hi(s,e),l=await new Gl(s,o,n).execute();return l&&!n&&(delete l.user._redirectEventId,await s._persistUserIfCurrent(l.user),await s._setRedirectUser(null,e)),l}/**
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
 */const Ql=10*60*1e3;class eu{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let n=!1;return this.consumers.forEach(s=>{this.isEventForConsumer(e,s)&&(n=!0,this.sendToConsumer(e,s),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!tu(e)||(this.hasHandledPotentialRedirect=!0,n||(this.queuedRedirectEvent=e,n=!0)),n}sendToConsumer(e,n){var s;if(e.error&&!Lo(e)){const o=((s=e.error.code)==null?void 0:s.split("auth/")[1])||"internal-error";n.onError(re(this.auth,o))}else n.onAuthEvent(e)}isEventForConsumer(e,n){const s=n.eventId===null||!!e.eventId&&e.eventId===n.eventId;return n.filter.includes(e.type)&&s}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=Ql&&this.cachedEventUids.clear(),this.cachedEventUids.has(Pr(e))}saveEventToCache(e){this.cachedEventUids.add(Pr(e)),this.lastProcessedEventTime=Date.now()}}function Pr(i){return[i.type,i.eventId,i.sessionId,i.tenantId].filter(e=>e).join("-")}function Lo({type:i,error:e}){return i==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function tu(i){switch(i.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return Lo(i);default:return!1}}/**
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
 */async function nu(i,e={}){return pt(i,"GET","/v1/projects",e)}/**
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
 */const iu=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,su=/^https?/;async function ru(i){if(i.config.emulator)return;const{authorizedDomains:e}=await nu(i);for(const n of e)try{if(ou(n))return}catch{}de(i,"unauthorized-domain")}function ou(i){const e=yi(),{protocol:n,hostname:s}=new URL(e);if(i.startsWith("chrome-extension://")){const l=new URL(i);return l.hostname===""&&s===""?n==="chrome-extension:"&&i.replace("chrome-extension://","")===e.replace("chrome-extension://",""):n==="chrome-extension:"&&l.hostname===s}if(!su.test(n))return!1;if(iu.test(i))return s===i;const o=i.replace(/\./g,"\\.");return new RegExp("^(.+\\."+o+"|"+o+")$","i").test(s)}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */const au=new Gt(3e4,6e4);function Rr(){const i=ue().___jsl;if(i!=null&&i.H){for(const e of Object.keys(i.H))if(i.H[e].r=i.H[e].r||[],i.H[e].L=i.H[e].L||[],i.H[e].r=[...i.H[e].L],i.CP)for(let n=0;n<i.CP.length;n++)i.CP[n]=null}}function cu(i){return new Promise((e,n)=>{var o,c,l;function s(){Rr(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{Rr(),n(re(i,"network-request-failed"))},timeout:au.get()})}if((c=(o=ue().gapi)==null?void 0:o.iframes)!=null&&c.Iframe)e(gapi.iframes.getContext());else if((l=ue().gapi)!=null&&l.load)s();else{const E=dl("iframefcb");return ue()[E]=()=>{gapi.load?s():n(re(i,"network-request-failed"))},ll(`${ul()}?onload=${E}`).catch(w=>n(w))}}).catch(e=>{throw gn=null,e})}let gn=null;function hu(i){return gn=gn||cu(i),gn}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */const lu=new Gt(5e3,15e3),uu="__/auth/iframe",du="emulator/auth/iframe",fu={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},pu=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function gu(i){const e=i.config;C(e.authDomain,i,"auth-domain-config-required");const n=e.emulator?Ui(e,du):`https://${i.config.authDomain}/${uu}`,s={apiKey:e.apiKey,appName:i.name,v:ft},o=pu.get(i.config.apiHost);o&&(s.eid=o);const c=i._getFrameworks();return c.length&&(s.fw=c.join(",")),`${n}?${$t(s).slice(1)}`}async function mu(i){const e=await hu(i),n=ue().gapi;return C(n,i,"internal-error"),e.open({where:document.body,url:gu(i),messageHandlersFilter:n.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:fu,dontclear:!0},s=>new Promise(async(o,c)=>{await s.restyle({setHideOnLeave:!1});const l=re(i,"network-request-failed"),E=ue().setTimeout(()=>{c(l)},lu.get());function w(){ue().clearTimeout(E),o(s)}s.ping(w).then(w,()=>{c(l)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
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
 */const _u={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},yu=500,Iu=600,Eu="_blank",wu="http://localhost";class kr{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function vu(i,e,n,s=yu,o=Iu){const c=Math.max((window.screen.availHeight-o)/2,0).toString(),l=Math.max((window.screen.availWidth-s)/2,0).toString();let E="";const w={..._u,width:s.toString(),height:o.toString(),top:c,left:l},v=K().toLowerCase();n&&(E=uo(v)?Eu:n),ho(v)&&(e=e||wu,w.scrollbars="yes");const b=Object.entries(w).reduce((A,[x,L])=>`${A}${x}=${L},`,"");if(nl(v)&&E!=="_self")return Tu(e||"",E),new kr(null);const S=window.open(e||"",E,b);C(S,i,"popup-blocked");try{S.focus()}catch{}return new kr(S)}function Tu(i,e){const n=document.createElement("a");n.href=i,n.target=e;const s=document.createEvent("MouseEvent");s.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),n.dispatchEvent(s)}/**
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
 */const Au="__/auth/handler",Su="emulator/auth/handler",bu=encodeURIComponent("fac");async function Nr(i,e,n,s,o,c){C(i.config.authDomain,i,"auth-domain-config-required"),C(i.config.apiKey,i,"invalid-api-key");const l={apiKey:i.config.apiKey,appName:i.name,authType:n,redirectUrl:s,v:ft,eventId:o};if(e instanceof Sn){e.setDefaultLanguage(i.languageCode),l.providerId=e.providerId||"",Ba(e.getCustomParameters())||(l.customParameters=JSON.stringify(e.getCustomParameters()));for(const[b,S]of Object.entries({}))l[b]=S}if(e instanceof qt){const b=e.getScopes().filter(S=>S!=="");b.length>0&&(l.scopes=b.join(","))}i.tenantId&&(l.tid=i.tenantId);const E=l;for(const b of Object.keys(E))E[b]===void 0&&delete E[b];const w=await i._getAppCheckToken(),v=w?`#${bu}=${encodeURIComponent(w)}`:"";return`${Cu(i)}?${$t(E).slice(1)}${v}`}function Cu({config:i}){return i.emulator?Ui(i,Su):`https://${i.authDomain}/${Au}`}/**
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
 */const hi="webStorageSupport";class Pu{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=So,this._completeRedirectFn=Oo,this._overrideRedirectResult=Jl}async _openPopup(e,n,s,o){var l;ye((l=this.eventManagers[e._key()])==null?void 0:l.manager,"_initialize() not called before _openPopup()");const c=await Nr(e,n,s,yi(),o);return vu(e,c,Bi())}async _openRedirect(e,n,s,o){await this._originValidation(e);const c=await Nr(e,n,s,yi(),o);return kl(c),new Promise(()=>{})}_initialize(e){const n=e._key();if(this.eventManagers[n]){const{manager:o,promise:c}=this.eventManagers[n];return o?Promise.resolve(o):(ye(c,"If manager is not set, promise should be"),c)}const s=this.initAndGetManager(e);return this.eventManagers[n]={promise:s},s.catch(()=>{delete this.eventManagers[n]}),s}async initAndGetManager(e){const n=await mu(e),s=new eu(e);return n.register("authEvent",o=>(C(o==null?void 0:o.authEvent,e,"invalid-auth-event"),{status:s.onEvent(o.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:s},this.iframes[e._key()]=n,s}_isIframeWebStorageSupported(e,n){this.iframes[e._key()].send(hi,{type:hi},o=>{var l;const c=(l=o==null?void 0:o[0])==null?void 0:l[hi];c!==void 0&&n(!!c),de(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const n=e._key();return this.originValidationPromises[n]||(this.originValidationPromises[n]=ru(e)),this.originValidationPromises[n]}get _shouldInitProactively(){return _o()||lo()||Fi()}}const Ru=Pu;var Dr="@firebase/auth",Or="1.11.0";/**
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
 */class ku{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const n=this.auth.onIdTokenChanged(s=>{e((s==null?void 0:s.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,n),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const n=this.internalListeners.get(e);n&&(this.internalListeners.delete(e),n(),this.updateProactiveRefresh())}assertAuthConfigured(){C(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
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
 */function Nu(i){switch(i){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function Du(i){lt(new Ye("auth",(e,{options:n})=>{const s=e.getProvider("app").getImmediate(),o=e.getProvider("heartbeat"),c=e.getProvider("app-check-internal"),{apiKey:l,authDomain:E}=s.options;C(l&&!l.includes(":"),"invalid-api-key",{appName:s.name});const w={apiKey:l,authDomain:E,clientPlatform:i,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:yo(i)},v=new cl(s,o,c,w);return pl(v,n),v},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,n,s)=>{e.getProvider("auth-internal").initialize()})),lt(new Ye("auth-internal",e=>{const n=gt(e.getProvider("auth").getImmediate());return(s=>new ku(s))(n)},"PRIVATE").setInstantiationMode("EXPLICIT")),Ue(Dr,Or,Nu(i)),Ue(Dr,Or,"esm2020")}/**
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
 */const Ou=5*60,Lu=Fr("authIdTokenMaxAge")||Ou;let Lr=null;const Mu=i=>async e=>{const n=e&&await e.getIdTokenResult(),s=n&&(new Date().getTime()-Date.parse(n.issuedAtTime))/1e3;if(s&&s>Lu)return;const o=n==null?void 0:n.token;Lr!==o&&(Lr=o,await fetch(i,{method:o?"POST":"DELETE",headers:o?{Authorization:`Bearer ${o}`}:{}}))};function Uu(i=Pi()){const e=Ci(i,"auth");if(e.isInitialized())return e.getImmediate();const n=fl(i,{popupRedirectResolver:Ru,persistence:[Fl,Cl,So]}),s=Fr("authTokenSyncURL");if(s&&typeof isSecureContext=="boolean"&&isSecureContext){const c=new URL(s,location.origin);if(location.origin===c.origin){const l=Mu(c.toString());Tl(n,l,()=>l(n.currentUser)),vl(n,E=>l(E))}}const o=xr("auth");return o&&gl(n,`http://${o}`),n}function xu(){var i;return((i=document.getElementsByTagName("head"))==null?void 0:i[0])??document}hl({loadJS(i){return new Promise((e,n)=>{const s=document.createElement("script");s.setAttribute("src",i),s.onload=e,s.onerror=o=>{const c=re("internal-error");c.customData=o,n(c)},s.type="text/javascript",s.charset="UTF-8",xu().appendChild(s)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});Du("Browser");const Vu={BASE_URL:"/",DEV:!1,MODE:"production",PROD:!0,SSR:!1,VITE_AACRM_URL:"https://aacrm-liard.vercel.app/",VITE_ADMIN_EMAILS:"dataweston@gmail.com",VITE_FIREBASE_API_KEY:"AIzaSyBz4HcPinj3wkeTqVirTVl0bujE0buX6G8",VITE_FIREBASE_APP_ID:"1:641158626848:web:afa272e28d8567c988c645",VITE_FIREBASE_AUTH_DOMAIN:"local-effort.firebaseapp.com",VITE_FIREBASE_MESSAGING_SENDER_ID:"641158626848",VITE_FIREBASE_PROJECT_ID:"local-effort",VITE_FIREBASE_STORAGE_BUCKET:"local-effort.firebasestorage.app",VITE_PAIKKA_DISCOUNT_CODE:"localpaikka",VITE_PAIKKA_DISCOUNT_PRICE_CENTS:"1000",VITE_RECAPTCHA_SITE_KEY:"6LdZrMUrAAAAAFtPSDPGZY1aCKZsF6rPqvZgY2Dl",VITE_SANITY_DATASET:"localeffort",VITE_SQUARE_APP_ID:"sq0idp-MdP--aFEHvkdEce7A0A6xg",VITE_SQUARE_ENV:"production",VITE_SQUARE_LOCATION_ID:"LG7Z6X1Y9C5YX",VITE_SUPABASE_ANON_KEY:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cHdwY3NiYWlkcHlrZ2hxenh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODAyODcsImV4cCI6MjA2OTY1NjI4N30.YDkEG3TqBEKU8xPBZ8_RsIr68S6u-zAJ0GRNEqJt_Io",VITE_SUPABASE_URL:"https://qupwpcsbaidpykghqzxt.supabase.co",VITE_TINY_DINER_URL:"https://tiny-weddings.vercel.app/",VITE_TINY_WEDDINGS_URL:"https://tiny-wedding-1.vercel.app/",VITE_USDA_API_KEY:"7HAXJh5etgdxuqCqPnP108jJlmhSqwJzdjl5pWUD"};let wi,vi;const Fu=()=>ga(()=>import("./index.esm-DxrGtp16.js"),__vite__mapDeps([0,1,2])).then(i=>{wi=i.initializeAppCheck,vi=i.ReCaptchaV3Provider}).catch(()=>{}),j=(typeof import.meta<"u"?Vu:{})||{},Ti={apiKey:j.VITE_API_KEY||j.VITE_FIREBASE_API_KEY||j.REACT_APP_API_KEY,authDomain:j.VITE_AUTH_DOMAIN||j.VITE_FIREBASE_AUTH_DOMAIN||j.REACT_APP_AUTH_DOMAIN,projectId:j.VITE_PROJECT_ID||j.VITE_FIREBASE_PROJECT_ID||j.REACT_APP_PROJECT_ID,storageBucket:j.VITE_STORAGE_BUCKET||j.VITE_FIREBASE_STORAGE_BUCKET||j.REACT_APP_STORAGE_BUCKET,messagingSenderId:j.VITE_MESSAGING_SENDER_ID||j.VITE_FIREBASE_MESSAGING_SENDER_ID||j.REACT_APP_MESSAGING_SENDER_ID,appId:j.VITE_APP_ID||j.VITE_FIREBASE_APP_ID||j.REACT_APP_APP_ID};let et=null;try{if(Ti.apiKey){et=qc().length?Pi():Wr(Ti);const e=j.VITE_APPCHECK_SITE_KEY||j.VITE_RECAPTCHA_SITE_KEY;e&&typeof window<"u"&&Fu().then(()=>{if(wi&&vi)try{wi(et,{provider:new vi(e),isTokenAutoRefreshEnabled:!0})}catch(n){console.warn("App Check initialization failed:",n&&(n.message||n))}})}else console.warn("Firebase config missing — auth/comments disabled on client.")}catch(i){console.warn("Failed to initialize Firebase app:",i&&(i.message||i))}et&&Oh(et);const ke=et?Uu(et):null,li=et?new pe:null;Ti.projectId;function ju(){const[i,e]=ei.useState(null),[n,s]=ei.useState(!0);return ei.useEffect(()=>{if(!ke)return s(!1),()=>{};const o=Al(ke,c=>{e(c||null),s(!1)});return()=>o()},[]),{user:i,loading:n}}function Bu(){const i=ma(),{user:e,loading:n}=ju(),[s,o]=Pe.useState(""),[c,l]=Pe.useState(!1);Pe.useEffect(()=>{(async()=>{if(ke)try{const w=await Zl(ke);w&&w.user&&i("/partner-portal",{replace:!0})}catch(w){o(ui(w))}})(),!n&&e&&i("/partner-portal",{replace:!0})},[e,n,i]);const E=async()=>{if(o(""),!ke||!li){o("Sign-in is unavailable. Missing Firebase configuration.");return}l(!0);try{await Wl(ke,li),i("/partner-portal",{replace:!0})}catch(w){const v=w&&w.code?String(w.code):"";if(v.includes("popup-blocked")||v.includes("popup-closed-by-user")||v.includes("cancelled-popup-request"))try{await Xl(ke,li);return}catch(b){o(ui(b))}else o(ui(w))}finally{l(!1)}};return Pe.createElement("div",{className:"mx-auto max-w-md p-6 text-center"},Pe.createElement("h1",{className:"heading-lg mb-4"},"Sign in"),s&&Pe.createElement("div",{className:"mb-4 p-3 rounded bg-red-50 text-red-700 text-sm text-left"},s),Pe.createElement("button",{onClick:E,disabled:c,className:"px-4 py-2 rounded bg-black text-white disabled:opacity-60"},c?"Working…":"Continue with Google"),!ke&&Pe.createElement("p",{className:"mt-4 text-sm text-gray-600"},"Tip: Add Firebase env vars on the server and authorize your Vercel domain in Firebase Auth."))}function ui(i){return i?(i.message||String(i)).replace(/^Firebase: /,"").replace(/\(auth\/[\w-]+\)\.?$/,"").trim():"Unexpected error."}const zu=Object.freeze(Object.defineProperty({__proto__:null,default:Bu},Symbol.toStringTag,{value:"Module"}));export{zu as A,Ye as C,ba as D,Ht as E,Si as L,Ci as _,tt as a,wa as b,Wu as c,Ma as d,Ur as e,lt as f,Pi as g,$u as i,Ue as r};
