import{x as Le,F as $e,r as a,R as e,X as Re}from"./index-CrRo1lfI.js";import{L as _e,G as qe,I as je}from"./GoogleCalendarSync-Bt8hdtGU.js";import{R as X}from"./refresh-cw-C40o0N8E.js";import{S as ae,C as ze,U as Pe}from"./users-round-CmlTzV1n.js";import{S as Ee}from"./shopping-cart-CEfedVhn.js";import{H as Te}from"./house-DP9Apltx.js";import{M as le,C as ge,a as Oe}from"./message-square-D7VzyjOH.js";import{F as se}from"./file-text-DqxRSdqD.js";import{L as Fe}from"./log-in-BnIIPeAb.js";import{S as fe}from"./send-Za9vfxIR.js";import{P as oe}from"./plus-DqJJTGJT.js";import{C as Me}from"./circle-check-D2jKnvOm.js";import{C as Be}from"./copy-Cm_E-AEv.js";import{M as Ve}from"./minus-DzQ5T7dm.js";import{U as He}from"./upload-BtvR8cjj.js";import"./circle-alert-BcYKVJfJ.js";import"./check-DQenD5-Z.js";import"./loader-circle--lQaGg0Y.js";import"./calendar-DbNede6Q.js";/**
 * @license lucide-react v0.451.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ae=Le("Soup",[["path",{d:"M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z",key:"4rw317"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M19.5 12 22 6",key:"shfsr5"}],["path",{d:"M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62",key:"rpc6vp"}],["path",{d:"M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62",key:"1lf63m"}],["path",{d:"M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62",key:"97tijn"}]]);/**
 * @license lucide-react v0.451.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Se=Le("UserPlus",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]),J=[{id:"today",label:"Today",icon:Te},{id:"calendar",label:"Calendar",icon:ze},{id:"chat",label:"Chat",icon:le},{id:"docs",label:"Docs",icon:se},{id:"people",label:"People",icon:Pe},{id:"shifts",label:"Shifts",icon:ge}],re={id:"weeklyMealPrep",label:"Weekly Meal Prep",icon:Ae},Ge=[{key:"glutenFree",label:"Gluten free"},{key:"nutAllergy",label:"Nut allergy"},{key:"vegetarian",label:"Vegetarian"},{key:"dairyFree",label:"Dairy free"}],Je=["Tuesday, 2pm-4pm","Tuesday, 4pm-6pm","Wednesday, 2pm-4pm","Wednesday, 4pm-6pm"],We=[["glutenFree","Gluten free"],["dairyFree","Dairy free"],["containsPork","Contains pork"],["containsNuts","Contains nuts"],["containsDairy","Contains dairy"]],Ye="noodleboy.",ke="le:securityMenuAccess",Qe="this menu is designed especially for the security team at Neon Kitchen. Please enter your password to order.";function ne(){return new Date().toISOString().slice(0,10)}function ue(t,r){const n=new Date(`${t}T00:00:00`);return n.setDate(n.getDate()+r),n.toISOString().slice(0,10)}function me(t){return t?new Date(`${String(t).slice(0,10)}T00:00:00`).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}):""}function ce(t){if(!t)return"";const[r,n]=String(t).split(":"),d=new Date;return d.setHours(Number(r),Number(n||0),0,0),d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}function ve(t){if(!t)return"";const r=Date.now()-new Date(t).getTime(),n=Math.max(0,Math.floor(r/6e4));if(n<2)return"now";if(n<60)return`${n}m`;const d=Math.floor(n/60);return d<24?`${d}h`:`${Math.floor(d/24)}d`}async function C(t,r,n={}){const h=await fetch(`${t}`,{...n,headers:{...n.body?{"Content-Type":"application/json"}:{},...r?{Authorization:`Bearer ${r}`}:{},...n.headers||{}}}),c=await h.json().catch(()=>({}));if(!h.ok)throw new Error(c.error||"Request failed");return c}function pe(t){const r=typeof crypto<"u"&&crypto.randomUUID?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;return`${t}:${r}`}function De(){if(typeof window>"u")return{visitorId:pe("visitor"),sessionId:pe("session")};const t=window.localStorage;let r=t.getItem("le:localistVisitorId"),n=t.getItem("le:localistSessionId");return r||(r=pe("visitor"),t.setItem("le:localistVisitorId",r)),n||(n=pe("session"),t.setItem("le:localistSessionId",n)),{visitorId:r,sessionId:n}}function he(){if(typeof window>"u")return{localistToken:"",entrySource:"direct",path:"",referrer:""};const t=new URLSearchParams(window.location.search);return{localistToken:t.get("localist")||"",entrySource:t.get("shared")==="1"?"shared":"direct",path:`${window.location.pathname}${window.location.search}`,referrer:document.referrer||""}}function ie(t,r={}){if(!(typeof window>"u"))try{const n={eventType:t,occurredAt:new Date().toISOString(),...De(),...he(),...r};C("/api/hub/localist-activity",null,{method:"POST",body:JSON.stringify(n),keepalive:!0}).catch(()=>{})}catch{}}function U({title:t,icon:r,action:n,children:d}){return e.createElement("section",{className:"hub-panel"},e.createElement("div",{className:"hub-panel-head"},e.createElement("div",{className:"hub-panel-title"},r&&e.createElement(r,{size:15,"aria-hidden":"true"}),e.createElement("h2",null,t)),n),d)}function z({label:t,children:r}){return e.createElement("label",{className:"hub-field"},e.createElement("span",null,t),r)}function Ke({auth:t,inviteToken:r}){const[n,d]=a.useState(r?"signup":"signin"),[h,c]=a.useState(null),[u,g]=a.useState(""),[o,p]=a.useState(""),[S,b]=a.useState(""),[m,I]=a.useState(""),[x,s]=a.useState(""),[f,w]=a.useState(!1);a.useEffect(()=>{r&&C(`/api/hub/profile?invite=${encodeURIComponent(r)}`).then(N=>{c(N.invite),g(N.invite.email||""),b(N.invite.displayNameHint||"")}).catch(N=>s(N.message))},[r]);const T=async N=>{N.preventDefault(),s(""),w(!0);try{n==="signup"?(await t.signUpWithEmail(u,o,{display_name:S}),await t.signInWithEmail(u,o)):await t.signInWithEmail(u,o)}catch(j){s(j.message||"Unable to sign in")}finally{w(!1)}};return e.createElement("main",{className:"hub-auth-screen"},e.createElement("div",{className:"hub-auth-card"},e.createElement("div",{className:"hub-brand"},e.createElement(ae,{size:42,"aria-hidden":"true"}),e.createElement("div",null,e.createElement("h1",null,"Local Effort Hub"),e.createElement("p",null,"Staff calendar, messages, documents, and shift pickup."))),h&&e.createElement("div",{className:"hub-notice"},"Invite for ",h.email,". Access: ",h.accessLevel,"."),e.createElement("form",{onSubmit:T,className:"hub-form"},e.createElement(z,{label:"Email"},e.createElement("input",{type:"email",value:u,onChange:N=>g(N.target.value),autoComplete:"email",required:!0})),e.createElement(z,{label:"Password"},e.createElement("input",{type:"password",value:o,onChange:N=>p(N.target.value),autoComplete:n==="signup"?"new-password":"current-password",minLength:8,required:!0})),n==="signup"&&e.createElement(e.Fragment,null,e.createElement(z,{label:"Display name"},e.createElement("input",{value:S,onChange:N=>b(N.target.value),required:!0})),e.createElement(z,{label:"Role or title"},e.createElement("input",{value:m,onChange:N=>I(N.target.value)}))),x&&e.createElement("p",{className:"hub-error"},x),e.createElement("button",{className:"hub-primary-button",type:"submit",disabled:f},e.createElement(Fe,{size:20,"aria-hidden":"true"}),f?"Working...":n==="signup"?"Create profile":"Sign in")),e.createElement("button",{className:"hub-text-button",type:"button",onClick:()=>d(n==="signup"?"signin":"signup")},n==="signup"?"I already have a Hub account":"I have an invite and need a profile"),e.createElement("p",{className:"hub-help"},"Use email and password. Invite links control who can create staff, customer, or privileged profiles.")))}function Xe({accessToken:t,inviteToken:r,onDone:n}){const[d,h]=a.useState(null),[c,u]=a.useState(""),[g,o]=a.useState(""),[p,S]=a.useState("");a.useEffect(()=>{r&&C(`/api/hub/profile?invite=${encodeURIComponent(r)}`).then(m=>{h(m.invite),u(m.invite.displayNameHint||"")}).catch(m=>S(m.message))},[r]);const b=async m=>{m.preventDefault(),S("");try{await C("/api/hub/profile",t,{method:"POST",body:JSON.stringify({inviteToken:r,displayName:c,title:g})}),n()}catch(I){S(I.message)}};return e.createElement("main",{className:"hub-auth-screen"},e.createElement("div",{className:"hub-auth-card"},e.createElement("h1",null,"Finish Hub Profile"),d&&e.createElement("p",{className:"hub-help"},"Invite access: ",d.accessLevel),e.createElement("form",{className:"hub-form",onSubmit:b},e.createElement(z,{label:"Display name"},e.createElement("input",{value:c,onChange:m=>u(m.target.value),required:!0})),e.createElement(z,{label:"Role or title"},e.createElement("input",{value:g,onChange:m=>o(m.target.value)})),p&&e.createElement("p",{className:"hub-error"},p),e.createElement("button",{className:"hub-primary-button",type:"submit"},"Enter Hub"))))}function Ze({calendar:t,docs:r,conversations:n,shifts:d,setTab:h}){const c=t.filter(p=>String(p.startsAt||"").startsWith(ne())),u=d.filter(p=>p.open).slice(0,4),g=r.slice(0,4),o=n.slice(0,4);return e.createElement("div",{className:"hub-grid"},e.createElement(U,{title:"Today",icon:Te,action:e.createElement("button",{onClick:()=>h("calendar")},"Open calendar")},e.createElement("div",{className:"hub-list"},c.length===0&&e.createElement("p",{className:"hub-empty"},"No scheduled items today."),c.map(p=>e.createElement("div",{className:"hub-row",key:p.id},e.createElement("strong",null,p.title),e.createElement("span",null,ce(String(p.startsAt||"").slice(11,16))," ",p.subtitle||""))))),e.createElement(U,{title:"Open Shifts",icon:ge,action:e.createElement("button",{onClick:()=>h("shifts")},"View shifts")},e.createElement("div",{className:"hub-list"},u.length===0&&e.createElement("p",{className:"hub-empty"},"No open shifts."),u.map(p=>e.createElement("div",{className:"hub-row",key:p.id},e.createElement("strong",null,p.title),e.createElement("span",null,me(p.date)," at ",ce(p.startTime)))))),e.createElement(U,{title:"Recent Chat",icon:le,action:e.createElement("button",{onClick:()=>h("chat")},"Open chat")},e.createElement("div",{className:"hub-list"},o.map(p=>e.createElement("div",{className:"hub-row",key:p.id||p.objectId},e.createElement("strong",null,p.title),e.createElement("span",null,p.preview||"No messages yet"))))),e.createElement(U,{title:"Documents",icon:se,action:e.createElement("button",{onClick:()=>h("docs")},"Open docs")},e.createElement("div",{className:"hub-list"},g.length===0&&e.createElement("p",{className:"hub-empty"},"No documents published."),g.map(p=>e.createElement("div",{className:"hub-row",key:p.id},e.createElement("strong",null,p.title),e.createElement("span",null,p.category," / ",p.visibility))))))}function et({accessToken:t,profile:r}){const[n,d]=a.useState(ne()),[h,c]=a.useState([]),[u,g]=a.useState(!1),[o,p]=a.useState("all"),S=a.useCallback(async()=>{g(!0);try{const x=await C(`/api/hub/calendar?view=week&date=${n}`,t);c(x.objects||[])}finally{g(!1)}},[t,n]);a.useEffect(()=>{S()},[S]);const b=a.useMemo(()=>{const x=String((r==null?void 0:r.displayName)||"").toLowerCase();return o==="available"?h.filter(s=>{var f;return((f=s.metadata)==null?void 0:f.optional)||s.subtitle===null}):o==="mine"?h.filter(s=>{var w;return(((w=s.metadata)==null?void 0:w.people)||[]).some(T=>String(T||"").toLowerCase()===x)}):h},[h,r,o]),m=a.useMemo(()=>h.filter(x=>{var w,T;const s=`${x.title||""} ${x.subtitle||""} ${((w=x.metadata)==null?void 0:w.category)||""}`.toLowerCase();return(((T=x.metadata)==null?void 0:T.people)||[]).some(N=>String(N||"").toLowerCase().includes("weston"))&&(s.includes("kitchen time")||s.includes("office hours"))}),[h]),I=a.useMemo(()=>{const x=new Map;return b.forEach(s=>{var w;const f=String(s.startsAt||((w=s.metadata)==null?void 0:w.date)||"").slice(0,10)||n;x.set(f,[...x.get(f)||[],s])}),[...x.entries()].sort(([s],[f])=>s.localeCompare(f))},[b,n]);return e.createElement(U,{title:"Calendar",icon:ze,action:e.createElement("div",{className:"hub-button-row"},e.createElement("button",{onClick:()=>d(ue(n,-7))},"Previous"),e.createElement("button",{onClick:()=>d(ne())},"Today"),e.createElement("button",{onClick:()=>d(ue(n,7))},"Next"),e.createElement("button",{className:o==="mine"?"is-active":"",onClick:()=>p("mine")},"My shifts"),e.createElement("button",{className:o==="available"?"is-active":"",onClick:()=>p("available")},"Available shifts"),e.createElement("button",{className:o==="all"?"is-active":"",onClick:()=>p("all")},"All events"),e.createElement(qe,{accessToken:t,weekStart:n}),e.createElement("button",{onClick:S},e.createElement(X,{size:13})))},u&&e.createElement("p",{className:"hub-empty"},"Loading calendar..."),e.createElement("div",{className:"hub-calendar-shell"},e.createElement("div",{className:"hub-calendar-list"},I.map(([x,s])=>e.createElement("section",{className:"hub-day",key:x},e.createElement("h3",null,me(x)),s.map(f=>{var w;return e.createElement("div",{className:"hub-calendar-item",key:f.id},e.createElement("span",null,ce(String(f.startsAt||"").slice(11,16))||"Any time"),e.createElement("strong",null,f.title),e.createElement("small",null,f.subtitle||f.type," ",(w=f.metadata)!=null&&w.optional?"/ open shift":""))}))),!u&&I.length===0&&e.createElement("p",{className:"hub-empty"},"No calendar items this week.")),e.createElement("aside",{className:"hub-calendar-widget"},e.createElement("strong",null,"Weston kitchen time"),e.createElement("strong",null,"Weston office hours"),m.length===0?e.createElement("span",null,"Waiting on weeklydemo categories."):m.map(x=>{var s;return e.createElement("div",{key:x.id},e.createElement("span",null,me(String(x.startsAt||((s=x.metadata)==null?void 0:s.date)||"").slice(0,10))),e.createElement("small",null,ce(String(x.startsAt||"").slice(11,16))||"Any time"," / ",x.title))}))))}function tt({accessToken:t,people:r,currentUserId:n}){const[d,h]=a.useState([]),[c,u]=a.useState(null),[g,o]=a.useState([]),[p,S]=a.useState(""),b=a.useCallback(async()=>{var f;const s=await C("/api/hub/conversations",t);h(s.conversations||[]),!c&&((f=s.conversations)!=null&&f.length)&&u(s.conversations[0])},[t,c]),m=a.useCallback(async s=>{if(!s)return;if(!s.id){const w=await C("/api/hub/conversations",t,{method:"POST",body:JSON.stringify({mode:"general",action:"ensure"})});u(w.thread);return}const f=await C(`/api/hub/conversations?threadId=${encodeURIComponent(s.id)}`,t);o(f.messages||[])},[t]);a.useEffect(()=>{b().catch(()=>{})},[b]),a.useEffect(()=>{m(c).catch(()=>{})},[c,m]);const I=async s=>{const f=await C("/api/hub/conversations",t,{method:"POST",body:JSON.stringify({mode:"dm",targetUserId:s.userId,action:"ensure"})});u(f.thread),await b()},x=async s=>{s.preventDefault();const f=p.trim();if(!f)return;const w=(c==null?void 0:c.objectType)==="hub_dm",T=w?c.objectId.split(":").find(N=>N&&N!==n):void 0;await C("/api/hub/conversations",t,{method:"POST",body:JSON.stringify({mode:w?"dm":"general",targetUserId:T,body:f})}),S(""),await b(),await m(c)};return e.createElement("div",{className:"hub-chat-layout"},e.createElement(U,{title:"Chats",icon:le},e.createElement("div",{className:"hub-list"},d.map(s=>e.createElement("button",{className:`hub-row hub-row-button ${(c==null?void 0:c.id)===s.id?"is-active":""}`,key:s.id||s.objectId,onClick:()=>u(s)},e.createElement("strong",null,s.title),e.createElement("span",null,s.preview||"No messages yet"," ",s.lastMessageAt?`/ ${ve(s.lastMessageAt)}`:"")))),e.createElement("h3",{className:"hub-subhead"},"Message a person"),e.createElement("div",{className:"hub-list"},r.map(s=>e.createElement("button",{className:"hub-row hub-row-button",key:s.id,onClick:()=>I(s)},e.createElement("strong",null,s.displayName),e.createElement("span",null,s.title||s.accessLevel))))),e.createElement(U,{title:(c==null?void 0:c.title)||"General",icon:le},e.createElement("div",{className:"hub-message-list"},g.length===0&&e.createElement("p",{className:"hub-empty"},"No messages yet."),g.map(s=>e.createElement("div",{className:"hub-message",key:s.id},e.createElement("strong",null,s.senderRole||"staff"," / ",ve(s.createdAt)),e.createElement("p",null,s.body)))),e.createElement("form",{className:"hub-compose",onSubmit:x},e.createElement("input",{value:p,onChange:s=>S(s.target.value),placeholder:"Write a clear update..."}),e.createElement("button",{type:"submit"},e.createElement(fe,{size:13,"aria-hidden":"true"})," Send"))))}function at({accessToken:t,docs:r,reloadDocs:n,isPrivileged:d}){var b;const[h,c]=a.useState(((b=r[0])==null?void 0:b.id)||null),[u,g]=a.useState(null),[o,p]=a.useState({title:"",summary:"",body:"",category:"sop",visibility:"staff"});a.useEffect(()=>{h&&C(`/api/hub/docs?id=${encodeURIComponent(h)}`,t).then(m=>g(m.document)).catch(()=>g(null))},[t,h]),a.useEffect(()=>{!h&&r[0]&&c(r[0].id)},[r,h]);const S=async m=>{m.preventDefault();const I=await C("/api/hub/docs",t,{method:"POST",body:JSON.stringify(o)});p({title:"",summary:"",body:"",category:"sop",visibility:"staff"}),await n(),c(I.document.id)};return e.createElement("div",{className:"hub-doc-layout"},e.createElement(U,{title:"Documents",icon:se},e.createElement("div",{className:"hub-list"},r.length===0&&e.createElement("p",{className:"hub-empty"},"No documents yet."),r.map(m=>e.createElement("button",{className:`hub-row hub-row-button ${h===m.id?"is-active":""}`,key:m.id,onClick:()=>c(m.id)},e.createElement("strong",null,m.title),e.createElement("span",null,m.category," / ",m.visibility))))),e.createElement(U,{title:(u==null?void 0:u.title)||"Document",icon:se},u?e.createElement("article",{className:"hub-doc-body"},e.createElement("p",{className:"hub-doc-summary"},u.summary),e.createElement("pre",null,u.body)):e.createElement("p",{className:"hub-empty"},"Choose a document.")),d&&e.createElement(U,{title:"Publish Document",icon:oe},e.createElement("form",{className:"hub-form",onSubmit:S},e.createElement(z,{label:"Title"},e.createElement("input",{value:o.title,onChange:m=>p({...o,title:m.target.value}),required:!0})),e.createElement(z,{label:"Summary"},e.createElement("input",{value:o.summary,onChange:m=>p({...o,summary:m.target.value})})),e.createElement(z,{label:"Category"},e.createElement("input",{value:o.category,onChange:m=>p({...o,category:m.target.value})})),e.createElement(z,{label:"Visibility"},e.createElement("select",{value:o.visibility,onChange:m=>p({...o,visibility:m.target.value})},e.createElement("option",{value:"staff"},"Staff"),e.createElement("option",{value:"privileged"},"Privileged"))),e.createElement(z,{label:"Body"},e.createElement("textarea",{value:o.body,onChange:m=>p({...o,body:m.target.value}),rows:8,required:!0})),e.createElement("button",{className:"hub-primary-button",type:"submit"},e.createElement(oe,{size:13})," Publish"))))}function nt({people:t,onMessage:r}){return e.createElement(U,{title:"People",icon:Pe},e.createElement("div",{className:"hub-people-grid"},t.map(n=>e.createElement("div",{className:"hub-person",key:n.id},e.createElement("strong",null,n.displayName),e.createElement("span",null,n.title||n.accessLevel),e.createElement("small",null,n.email),e.createElement("button",{onClick:()=>r(n)},e.createElement(le,{size:13})," Message")))))}function lt({accessToken:t,isPrivileged:r}){const[n,d]=a.useState(ne()),[h,c]=a.useState([]),[u,g]=a.useState({title:"",date:ne(),startTime:"09:00",endTime:""}),o=a.useCallback(async()=>{const b=await C(`/api/hub/shifts?from=${n}&to=${ue(n,14)}`,t);c(b.shifts||[])},[t,n]);a.useEffect(()=>{o().catch(()=>{})},[o]);const p=async b=>{await C("/api/hub/shifts",t,{method:"POST",body:JSON.stringify({action:"claim",plannerCardId:b.id})}),await o()},S=async b=>{b.preventDefault(),await C("/api/hub/shifts",t,{method:"POST",body:JSON.stringify(u)}),g({title:"",date:ne(),startTime:"09:00",endTime:""}),await o()};return e.createElement("div",{className:"hub-grid"},e.createElement(U,{title:"Staff Shifts",icon:ge,action:e.createElement("button",{onClick:()=>d(ue(n,14))},"Next 2 weeks")},e.createElement("div",{className:"hub-list"},h.map(b=>e.createElement("div",{className:"hub-shift",key:b.id},e.createElement("div",null,e.createElement("strong",null,b.title),e.createElement("span",null,me(b.date)," / ",ce(b.startTime)," ",b.endTime?`to ${ce(b.endTime)}`:""),e.createElement("small",null,b.people.length?`Assigned: ${b.people.join(", ")}`:"No one assigned yet")),b.open?e.createElement("button",{className:"hub-shift-action",onClick:()=>p(b)},e.createElement(Me,{size:14})," Pick up"):e.createElement("span",{className:"hub-pill"},"Covered"))))),r&&e.createElement(U,{title:"Add Open Shift",icon:oe},e.createElement("form",{className:"hub-form",onSubmit:S},e.createElement(z,{label:"Shift name"},e.createElement("input",{value:u.title,onChange:b=>g({...u,title:b.target.value}),required:!0})),e.createElement(z,{label:"Date"},e.createElement("input",{type:"date",value:u.date,onChange:b=>g({...u,date:b.target.value}),required:!0})),e.createElement(z,{label:"Start"},e.createElement("input",{type:"time",value:u.startTime,onChange:b=>g({...u,startTime:b.target.value}),required:!0})),e.createElement(z,{label:"End"},e.createElement("input",{type:"time",value:u.endTime,onChange:b=>g({...u,endTime:b.target.value})})),e.createElement("button",{className:"hub-primary-button",type:"submit"},e.createElement(oe,{size:13})," Add shift"))))}function Ne({body:t}){const r=String(t||"").split(`
`);return e.createElement("div",{className:"hub-markdown-preview"},r.map((n,d)=>n.startsWith("### ")?e.createElement("h4",{key:d},n.slice(4)):n.startsWith("## ")?e.createElement("h3",{key:d},n.slice(3)):n.startsWith("# ")?e.createElement("h2",{key:d},n.slice(2)):n.startsWith("- ")?e.createElement("p",{key:d},"• ",n.slice(2)):n.trim()?e.createElement("p",{key:d},n):e.createElement("br",{key:d})))}function rt({accessToken:t,profile:r,isPrivileged:n}){const[d,h]=a.useState({customers:[],notes:[],mode:"staff"}),[c,u]=a.useState("production"),[g,o]=a.useState(""),[p,S]=a.useState(!1),[b,m]=a.useState(""),[I,x]=a.useState(!1),s=a.useRef(""),f=a.useRef(c),w=d.mode!=="customer",T=a.useCallback(async({keepStatus:E=!1}={})=>{var M,O;S(!0);try{const A=await C("/api/hub/weekly-meal-prep",t);h(A);const y=(A.notes||[]).find(k=>k.id===f.current)||((M=A.notes)==null?void 0:M[0]);if(y){f.current=y.id,u(y.id);const k=((O=y.document)==null?void 0:O.body)||"";o(k),s.current=k}E||m("")}catch(A){m(A.message||"Unable to load weekly meal prep.")}finally{S(!1)}},[t]);a.useEffect(()=>{T().catch(()=>{})},[T]),a.useEffect(()=>{if(!w||g===s.current)return;m("Saving...");const E=window.setTimeout(async()=>{var M,O;try{const A=await C("/api/hub/weekly-meal-prep",t,{method:"POST",body:JSON.stringify({tabId:c,body:g})});s.current=((O=(M=A.note)==null?void 0:M.document)==null?void 0:O.body)||g,m(`Saved ${new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}`)}catch(A){m(A.message||"Autosave failed.")}},900);return()=>window.clearTimeout(E)},[t,c,w,g]);const N=E=>{var A;const M=d.notes.find(y=>y.id===E);f.current=E,u(E);const O=((A=M==null?void 0:M.document)==null?void 0:A.body)||"";o(O),s.current=O},j=(r==null?void 0:r.accessLevel)==="customer"?"Customer view":n?"Privileged view: staff and customer":"Staff view";return e.createElement("div",{className:"hub-meal-prep"},e.createElement(U,{title:"Active Customer Profiles",icon:Ae,action:e.createElement("div",{className:"hub-button-row"},e.createElement("span",{className:"hub-pill"},j),e.createElement("button",{onClick:()=>T()},e.createElement(X,{size:13})))},p&&e.createElement("p",{className:"hub-empty"},"Loading meal prep..."),e.createElement("div",{className:"hub-customer-table-wrap"},e.createElement("table",{className:"hub-customer-table"},e.createElement("thead",null,e.createElement("tr",null,e.createElement("th",null,"Customer"),e.createElement("th",null,"Plan"),e.createElement("th",null,"Profile"),e.createElement("th",null,"Latest Order"),e.createElement("th",null,"Brain Signals"))),e.createElement("tbody",null,d.customers.map(E=>{var M,O,A,y,k,L,$;return e.createElement("tr",{key:E.id},e.createElement("td",null,e.createElement("strong",null,E.name),e.createElement("span",null,E.users.map(V=>V.email).join(", ")||E.slug)),e.createElement("td",null,E.planSummary||E.priceTierDefault||"No plan rules"),e.createElement("td",null,e.createElement("span",null,E.profile.householdSize||"Household not set"),e.createElement("small",null,E.profile.deliveryNotes||E.profile.address||"")),e.createElement("td",null,E.latestOrder?e.createElement(e.Fragment,null,e.createElement("span",null,me(String(E.latestOrder.weekStart).slice(0,10))," / ",E.latestOrder.itemCount," items"),e.createElement("small",null,E.latestOrder.items.slice(0,3).map(V=>`${V.quantity}x ${V.title}`).join("; "))):"No order yet"),e.createElement("td",null,e.createElement("span",null,((A=(O=(M=E.brain)==null?void 0:M.inferences)==null?void 0:O[0])==null?void 0:A.summary)||((L=(k=(y=E.brain)==null?void 0:y.assertions)==null?void 0:k[0])==null?void 0:L.dst)||"No active brain signal"),(($=E.brain)==null?void 0:$.properties)&&e.createElement("small",null,E.brain.properties.householdSize||E.brain.properties.slug||"")))}),!p&&d.customers.length===0&&e.createElement("tr",null,e.createElement("td",{colSpan:"5"},"No customer profiles are linked yet.")))))),e.createElement(U,{title:"Shared Prep Notes",icon:se,action:e.createElement("div",{className:"hub-button-row"},e.createElement("button",{className:I?"":"is-active",onClick:()=>x(!1)},"Edit"),e.createElement("button",{className:I?"is-active":"",onClick:()=>x(!0)},"Preview"))},e.createElement("div",{className:"hub-wordpad-tabs"},(d.notes||[]).map(E=>e.createElement("button",{key:E.id,className:c===E.id?"is-active":"",onClick:()=>N(E.id)},E.title)),e.createElement("span",null,b||"Autosaves to Drafts-backed hub docs")),w?I?e.createElement(Ne,{body:g}):e.createElement("textarea",{className:"hub-wordpad",value:g,onChange:E=>o(E.target.value),spellCheck:"true",placeholder:`# Production
- Prep notes
- Packout questions
- Delivery changes`}):e.createElement(Ne,{body:g||"No staff note published yet."})))}function it({accessToken:t,reloadDocs:r}){var q,Y,ee,P;const[n,d]=a.useState({email:"",accessLevel:"staff",displayNameHint:""}),[h,c]=a.useState(null),[u,g]=a.useState({sourceType:"brain_inbox",sourceId:"",title:"",visibility:"staff"}),[o,p]=a.useState(null),[S,b]=a.useState(""),[m,I]=a.useState(""),[x,s]=a.useState(!1),[f,w]=a.useState(null),[T,N]=a.useState("Loading activity..."),[j,E]=a.useState(null),[M,O]=a.useState("Loading orders..."),A=async i=>{i.preventDefault();const l=await C("/api/hub/invites",t,{method:"POST",body:JSON.stringify(n)});c(l.invite)},y=async i=>{i.preventDefault(),await C("/api/hub/brain-publish",t,{method:"POST",body:JSON.stringify(u)}),g({sourceType:"brain_inbox",sourceId:"",title:"",visibility:"staff"}),await r()},k=async()=>{I(""),s(!0);try{const i=await C("/api/hub/localist-window",t,{method:"POST",body:JSON.stringify({action:"create",hoursValid:48})});p(i.window),b(`Local Effort Localist menu is live for 48 hours: ${i.window.url} Reply STOP to opt out.`),I("Link ready."),R().catch(()=>{})}catch(i){I(i.message||"Unable to create link.")}finally{s(!1)}},L=async()=>{var i,l,v,D,_;if(o!=null&&o.url){I("Sending SMS through Brevo..."),s(!0);try{const F=new URL(o.url,window.location.origin).searchParams.get("localist");if(!F)throw new Error("Localist token missing from generated link.");const B=await C("/api/hub/localist-window",t,{method:"POST",body:JSON.stringify({action:"sendSms",token:F,message:S})});p(B.window);const te=(i=B.brevo)!=null&&i.status?` Brevo status: ${B.brevo.status}.`:"",Q=Number((v=(l=B.brevo)==null?void 0:l.statistics)==null?void 0:v.sent),ye=Number.isFinite(Q)?` Sent count: ${Q}.`:"";I(`SMS submitted to Brevo as campaign ${((D=B.brevo)==null?void 0:D.campaignId)||((_=B.window)==null?void 0:_.smsCampaignId)||""}.${te}${ye}`.trim()),R().catch(()=>{})}catch(F){I(F.message||"Unable to send SMS.")}finally{s(!1)}}},$=async()=>{var i;I("Checking SMS setup..."),s(!0);try{const v=(await C("/api/hub/localist-window",t,{method:"POST",body:JSON.stringify({action:"smsStatus"})})).sms||{};if(v.ready)I(`SMS setup ready. Sender: ${v.sender}. Brevo list IDs: ${(v.listIds||[]).join(", ")}.`);else{const D=[v.hasApiKey?null:"BREVO_API_KEY",(i=v.listIds)!=null&&i.length?null:"BREVO_LOCALIST_LIST_ID",v.sender?null:"BREVO_LOCALIST_SMS_SENDER"].filter(Boolean).join(", ");I(`SMS setup is incomplete. Missing: ${D||"unknown config"}.`)}}catch(l){I(l.message||"Unable to check SMS setup.")}finally{s(!1)}},V=async()=>{!(o!=null&&o.url)||!navigator.clipboard||(await navigator.clipboard.writeText(o.url),I("Link copied."))},R=a.useCallback(async()=>{N("Loading activity...");try{const i=await C("/api/hub/localist-activity?limit=8",t);w(i.windows||[]),N("")}catch(i){w([]),N(i.message||"Unable to load Localist activity.")}},[t]),G=a.useCallback(async()=>{O("Loading orders...");try{const i=await C("/api/hub/localist-orders?hours=168&limit=50",t);E(i),O("")}catch(i){E({orders:[],summary:{}}),O(i.message||"Unable to load Localist orders.")}},[t]);a.useEffect(()=>{R().catch(()=>{})},[R]),a.useEffect(()=>{G().catch(()=>{})},[G]);const Z=i=>`${Math.round((Number(i)||0)*100)}%`,W=i=>i?new Date(i).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"Not yet";return e.createElement("div",{className:"hub-grid"},e.createElement(U,{title:"Invite User",icon:Se},e.createElement("form",{className:"hub-form",onSubmit:A},e.createElement(z,{label:"Email"},e.createElement("input",{type:"email",value:n.email,onChange:i=>d({...n,email:i.target.value}),required:!0})),e.createElement(z,{label:"Access"},e.createElement("select",{value:n.accessLevel,onChange:i=>d({...n,accessLevel:i.target.value})},e.createElement("option",{value:"staff"},"Staff"),e.createElement("option",{value:"customer"},"Customer"),e.createElement("option",{value:"privileged"},"Privileged"))),e.createElement(z,{label:"Name hint"},e.createElement("input",{value:n.displayNameHint,onChange:i=>d({...n,displayNameHint:i.target.value})})),e.createElement("button",{className:"hub-primary-button",type:"submit"},e.createElement(Se,{size:13})," Create invite")),h&&e.createElement("div",{className:"hub-copy-box"},e.createElement("strong",null,"Invite link"),e.createElement("input",{readOnly:!0,value:h.url||"",onFocus:i=>i.target.select()}))),e.createElement(U,{title:"Send Brain to Hub",icon:je},e.createElement("form",{className:"hub-form",onSubmit:y},e.createElement(z,{label:"Source"},e.createElement("select",{value:u.sourceType,onChange:i=>g({...u,sourceType:i.target.value})},e.createElement("option",{value:"brain_inbox"},"Brain inbox item"),e.createElement("option",{value:"brain_entity"},"Brain entity"))),e.createElement(z,{label:"Source ID"},e.createElement("input",{value:u.sourceId,onChange:i=>g({...u,sourceId:i.target.value}),required:!0})),e.createElement(z,{label:"Hub title"},e.createElement("input",{value:u.title,onChange:i=>g({...u,title:i.target.value})})),e.createElement(z,{label:"Visibility"},e.createElement("select",{value:u.visibility,onChange:i=>g({...u,visibility:i.target.value})},e.createElement("option",{value:"staff"},"Staff"),e.createElement("option",{value:"privileged"},"Privileged"))),e.createElement("button",{className:"hub-primary-button",type:"submit"},e.createElement(se,{size:13})," Publish as doc"))),e.createElement(U,{title:"Localist Window",icon:Ee},e.createElement("div",{className:"hub-form"},e.createElement("div",{className:"hub-button-row"},e.createElement("button",{type:"button",onClick:k,disabled:x},e.createElement(oe,{size:13})," Generate link"),e.createElement("button",{type:"button",onClick:L,disabled:x||!(o!=null&&o.url)},e.createElement(fe,{size:13})," Send SMS"),e.createElement("button",{type:"button",onClick:$,disabled:x},e.createElement(X,{size:13})," Check SMS")),(o==null?void 0:o.url)&&e.createElement(e.Fragment,null,e.createElement(z,{label:"Link"},e.createElement("input",{readOnly:!0,value:o.url,onFocus:i=>i.target.select()})),e.createElement(z,{label:"Message"},e.createElement("textarea",{rows:4,value:S,onChange:i=>b(i.target.value)})),e.createElement("div",{className:"hub-button-row"},e.createElement("button",{type:"button",onClick:V},e.createElement(Be,{size:13})," Copy link"),o.smsSentAt&&e.createElement("span",{className:"hub-pill"},"Sent"))),m&&e.createElement("p",{className:"hub-empty"},m))),e.createElement(U,{title:"Localist Activity",icon:ge,action:e.createElement("button",{type:"button",onClick:R},e.createElement(X,{size:13}))},T&&e.createElement("p",{className:"hub-empty"},T),f&&f.length===0&&!T&&e.createElement("p",{className:"hub-empty"},"No Localist activity has been recorded yet."),e.createElement("div",{className:"hub-localist-analytics"},(f||[]).map(i=>{const l=i.metrics||{};return e.createElement("article",{className:"hub-localist-window-card",key:i.id},e.createElement("div",{className:"hub-localist-window-head"},e.createElement("div",null,e.createElement("strong",null,i.valid?"Active window":"Closed window"),e.createElement("span",null,"Expires ",W(i.expiresAt))),i.smsCampaignId&&e.createElement("span",{className:"hub-pill"},"Brevo ",i.smsCampaignId)),e.createElement("div",{className:"hub-metric-grid"},e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Visitors"),e.createElement("strong",null,l.uniqueVisitors||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Shared visitors"),e.createElement("strong",null,l.sharedVisitors||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Shares"),e.createElement("strong",null,l.shareEvents||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Share rate"),e.createElement("strong",null,Z(l.shareRate))),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Carts"),e.createElement("strong",null,l.cartsStarted||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Abandoned"),e.createElement("strong",null,l.abandonedCarts||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Checkout starts"),e.createElement("strong",null,l.checkoutStarts||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Paid"),e.createElement("strong",null,l.checkoutSuccesses||0))),e.createElement("small",null,"Last activity ",W(l.lastActivityAt),i.smsSentAt?` / SMS sent ${W(i.smsSentAt)}`:""))}))),e.createElement(U,{title:"Localist Orders",icon:Oe,action:e.createElement("button",{type:"button",onClick:G},e.createElement(X,{size:13}))},M&&e.createElement("p",{className:"hub-empty"},M),j&&e.createElement("div",{className:"hub-localist-analytics"},e.createElement("div",{className:"hub-metric-grid"},e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Paid"),e.createElement("strong",null,((q=j.summary)==null?void 0:q.paidCount)||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Paid total"),e.createElement("strong",null,be(((Y=j.summary)==null?void 0:Y.paidTotalCents)||0))),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Pending"),e.createElement("strong",null,((ee=j.summary)==null?void 0:ee.pendingCount)||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"All orders"),e.createElement("strong",null,((P=j.summary)==null?void 0:P.orderCount)||0))),(j.orders||[]).length===0&&!M&&e.createElement("p",{className:"hub-empty"},"No Localist orders have been recorded yet."),(j.orders||[]).map(i=>e.createElement("article",{className:"hub-localist-window-card",key:i.id},e.createElement("div",{className:"hub-localist-window-head"},e.createElement("div",null,e.createElement("strong",null,i.customerName),e.createElement("span",null,i.status," / ",be(i.totalCents),i.paidAt?` / paid ${W(i.paidAt)}`:` / started ${W(i.checkoutStartedAt)}`)),e.createElement("span",{className:"hub-pill"},i.pickupWindow)),e.createElement("div",{className:"hub-localist-order-detail"},i.customerEmail&&e.createElement("span",null,"Email: ",i.customerEmail),i.customerPhone&&e.createElement("span",null,"Phone: ",i.customerPhone),i.customerNote&&e.createElement("span",null,"Notes/allergies: ",i.customerNote),i.squareOrderId&&e.createElement("span",null,"Square order: ",i.squareOrderId),i.squareReceiptUrl&&e.createElement("span",null,"Square receipt: ",i.squareReceiptUrl),i.brainInboxItemId&&e.createElement("span",null,"Brain inbox: ",i.brainInboxItemId)),e.createElement("div",{className:"hub-localist-order-items"},(i.items||[]).map(l=>{var v;return e.createElement("span",{key:`${i.id}-${l.id}`},l.quantity,"x ",l.name,(v=l.customerOptions)!=null&&v.length?` (${l.customerOptions.join(", ")})`:"")})))))))}function be(t){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format((Number(t)||0)/100)}function st(t){const r=String(t||"").trim();if(!r)return null;const n=r.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);if(!n)return null;const d=Number(n[1]);return Number.isFinite(d)&&d>0?Math.round(d*100):null}function ot(t){return String(t||"").replace(/\D/g,"").slice(0,10)}function Ce(t){const r=ot(t);return r.length<=3?r:r.length<=6?`(${r.slice(0,3)}) ${r.slice(3)}`:`(${r.slice(0,3)}) ${r.slice(3,6)}-${r.slice(6)}`}function xe({area:t="localist",menuName:r="Localist",successName:n="Localist",showChat:d=!0}){const[h,c]=a.useState(null),[u,g]=a.useState(null),[o,p]=a.useState({}),[S,b]=a.useState(""),[m,I]=a.useState(""),[x,s]=a.useState(""),[f,w]=a.useState(""),[T,N]=a.useState({}),[j,E]=a.useState(""),[M,O]=a.useState(()=>new URLSearchParams(window.location.search).get("checkout")===`${t}-success`?"success":"idle"),[A,y]=a.useState(""),k=a.useRef(!1);a.useEffect(()=>{C(`/api/hub/localist-menu?area=${encodeURIComponent(t)}`).then(l=>{var v;g(l.content||null),c(l.items||[]),t==="localist"&&ie("localist.menu.loaded",{metadata:{itemCount:((v=l.items)==null?void 0:v.length)||0}})}).catch(()=>{g(null),c([])})},[t]);const L=a.useMemo(()=>(h||[]).map(l=>{const v=Number(l.priceCents),D=Number.isFinite(v)&&v>0?Math.round(v):st(l.price);return{...l,priceCents:D}}),[h]),$=a.useMemo(()=>L.map(l=>({...l,quantity:Number(o[l._id])||0,customerOptions:T[l._id]||{}})).filter(l=>l.quantity>0),[L,o,T]),V=$.reduce((l,v)=>l+(v.priceCents||0)*v.quantity,0),R=$.reduce((l,v)=>l+v.quantity,0),G=M==="loading",Z=t==="localist",W=R>0&&V>0&&S.trim()&&(!Z||x)&&!G,q=a.useMemo(()=>({totalQuantity:R,totalCents:V,items:$.map(l=>({id:l._id,name:l.name,quantity:l.quantity,priceCents:l.priceCents||0,customerOptions:l.customerOptions}))}),[$,V,R]);a.useEffect(()=>{if(R<=0)return;const l=window.setTimeout(()=>{t==="localist"&&ie("localist.cart.updated",{cart:q})},600);return()=>window.clearTimeout(l)},[t,q,R]),a.useEffect(()=>{M!=="success"||k.current||(k.current=!0,t==="localist"&&ie("localist.checkout.success",{metadata:{returnedFromSquare:!0}}))},[t,M]);const Y=(l,v)=>{const D=L.find(te=>te._id===l),_=Number(D==null?void 0:D.inventoryCount),F=Number.isFinite(_)&&_>=0?Math.min(20,Math.round(_)):20,B=Math.max(0,Math.min(Number(v)||0,F));p(te=>{const Q={...te};return B?Q[l]=B:delete Q[l],Q})},ee=(l,v,D)=>{N(_=>{const F={..._[l]||{}};return D?F[v]=!0:delete F[v],{..._,[l]:F}})},P=async()=>{const{localistToken:l}=he();if(!l)return;const v=new URL(window.location.href);v.searchParams.set("localist",l),v.searchParams.set("shared","1"),v.searchParams.delete("checkout");const D=v.toString();let _="clipboard";try{navigator.share?(_="web_share",await navigator.share({title:"Local Effort Localist menu",url:D})):navigator.clipboard?await navigator.clipboard.writeText(D):window.prompt("Copy Localist link",D),ie("localist.link.shared",{shareMethod:_}),E(_==="web_share"?"Share opened.":"Shared link copied.")}catch{E("")}},i=async l=>{if(l.preventDefault(),!!W){O("loading"),y("");try{const v=new URLSearchParams(window.location.search),D=De(),_=he();t==="localist"&&ie("localist.checkout.started",{cart:q});const F=await C("/api/hub/localist-checkout",null,{method:"POST",body:JSON.stringify({name:S,phone:Ce(m),pickupWindow:Z?x:"",note:f,localistToken:v.get("localist")||"",visitorId:D.visitorId,sessionId:D.sessionId,entrySource:_.entrySource,sourceArea:t,items:$.map(B=>({id:B._id,quantity:B.quantity,customerOptions:B.customerOptions}))})});if(!F.url)throw new Error("Square did not return a checkout link.");window.location.href=F.url}catch(v){y(v.message||"Unable to start checkout."),O("idle")}}};return M==="success"?e.createElement(e.Fragment,null,e.createElement(U,{title:"Payment Received",icon:Me},e.createElement("p",{className:"hub-empty",style:{color:"var(--hub-accent)",fontSize:20}},"Thanks",S?`, ${S}`:"","! Square has processed your ",n," checkout."),e.createElement("button",{className:"hub-primary-button",style:{marginTop:16},type:"button",onClick:()=>{O("idle"),p({}),b(""),I(""),s(""),w(""),N({})}},"Place another order")),d&&e.createElement(Ie,null)):e.createElement(e.Fragment,null,e.createElement(U,{title:"Place an Order",icon:Ee},u&&e.createElement("section",{className:"hub-localist-intro"},u.eyebrow&&e.createElement("small",null,u.eyebrow),u.headline&&e.createElement("h3",null,u.headline),u.body&&e.createElement("p",null,u.body),u.note&&e.createElement("span",null,u.note)),t==="localist"&&he().localistToken&&e.createElement("div",{className:"hub-localist-share"},e.createElement("button",{type:"button",onClick:P},e.createElement(fe,{size:13})," Share menu"),j&&e.createElement("span",null,j)),h===null&&e.createElement("p",{className:"hub-empty"},"Loading ",r," menu..."),h!==null&&h.length===0&&e.createElement("p",{className:"hub-empty"},"No items available."),h!==null&&h.length>0&&e.createElement("form",{className:"hub-form hub-localist-form",onSubmit:i},e.createElement("div",{className:"hub-localist-list"},L.map(l=>{const v=Number(o[l._id])||0,D=Number(l.inventoryCount),_=Number.isFinite(D)&&D>=0,F=_?Math.round(D):null,B=F===0,te=_?Math.min(20,F):20,Q=!l.priceCents||B,ye=T[l._id]||{},we=We.filter(([H])=>{var de;return(de=l.dietaryFlags)==null?void 0:de[H]}).map(([,H])=>H);return e.createElement("div",{key:l._id,className:`hub-row hub-localist-item${B?" is-sold-out":""}`},e.createElement("div",{className:"hub-localist-item-copy"},e.createElement("strong",null,l.name,e.createElement("span",{className:"hub-localist-price"},l.price||(l.priceCents?be(l.priceCents):"No checkout price"))),_&&e.createElement("span",{className:`hub-localist-inventory${B?" is-sold-out":""}`},F," available",B?" - sold out":""),l.description&&e.createElement("span",null,l.description),we.length>0&&e.createElement("div",{className:"hub-localist-flags"},we.map(H=>e.createElement("span",{key:H},H))),e.createElement("div",{className:"hub-localist-options","aria-label":`${l.name} dietary options`},Ge.map(H=>e.createElement("label",{key:H.key,className:"hub-localist-option"},e.createElement("input",{type:"checkbox",checked:ye[H.key]===!0,onChange:de=>ee(l._id,H.key,de.target.checked)}),e.createElement("span",null,H.label))))),e.createElement("div",{className:"hub-localist-quantity","aria-label":`${l.name} quantity`},e.createElement("button",{type:"button",onClick:()=>Y(l._id,v-1),disabled:v===0,"aria-label":`Remove ${l.name}`},e.createElement(Ve,{size:13})),e.createElement("input",{value:v,inputMode:"numeric","aria-label":`${l.name} quantity`,onChange:H=>Y(l._id,Number(H.target.value)),disabled:Q}),e.createElement("button",{type:"button",onClick:()=>Y(l._id,v+1),disabled:Q||v>=te,"aria-label":`Add ${l.name}`},e.createElement(oe,{size:13}))))})),e.createElement(z,{label:"Your name"},e.createElement("input",{value:S,onChange:l=>b(l.target.value),autoComplete:"name",required:!0})),e.createElement(z,{label:"Phone (optional)"},e.createElement("input",{value:Ce(m),onChange:l=>I(l.target.value),inputMode:"numeric",autoComplete:"tel"})),Z&&e.createElement(z,{label:"Pickup window"},e.createElement("select",{value:x,onChange:l=>s(l.target.value),required:!0},e.createElement("option",{value:""},"Select pickup window"),Je.map(l=>e.createElement("option",{key:l,value:l},l)))),e.createElement(z,{label:"Notes (optional)"},e.createElement("input",{value:f,onChange:l=>w(l.target.value),placeholder:"Allergies, delivery instructions..."})),e.createElement("div",{className:"hub-localist-checkout"},e.createElement("div",null,e.createElement("span",null,"Total"),e.createElement("strong",null,be(V)),e.createElement("small",null,R?`${R} item${R===1?"":"s"}`:"Choose items above")),e.createElement("button",{className:"hub-primary-button",type:"submit",disabled:!W},e.createElement(Oe,{size:13})," ",G?"Opening Square...":"Checkout with Square")),A&&e.createElement("p",{className:"hub-error"},A))),d&&e.createElement(Ie,null))}const ct=["image/gif","image/png","image/jpeg","image/webp"],ut=1*1024*1024,mt=/(https?:\/\/[^\s<]+)/gi;function dt(t){try{const r=new URL(t),n=r.hostname.toLowerCase(),d=r.href.toLowerCase();return!(/\.(gif|png|jpe?g|webp)(\?|#|$)/.test(d)||d.startsWith("data:image/"))&&(n.includes("giphy.com")||n.includes("tenor.com"))}catch{return!1}}function pt({text:t}){if(!t)return null;const r=String(t).split(mt);return e.createElement("p",null,r.map((n,d)=>/^https?:\/\//i.test(n)?e.createElement("a",{href:n,target:"_blank",rel:"noreferrer",key:`${n}-${d}`},n):n))}function Ie(){const[t,r]=a.useState([]),[n,d]=a.useState(()=>typeof window>"u"?"":window.localStorage.getItem("le:localistChatName")||""),[h,c]=a.useState(()=>typeof window>"u"?"":window.localStorage.getItem("le:localistChatName")||""),[u,g]=a.useState(()=>typeof window>"u"?!1:!!window.localStorage.getItem("le:localistChatName")),[o,p]=a.useState(""),[S,b]=a.useState(""),[m,I]=a.useState(null),[x,s]=a.useState(!1),[f,w]=a.useState(""),T=a.useRef(null),N=a.useCallback(async()=>{const y=await C("/api/hub/localist-chat");r(y.messages||[])},[]);a.useEffect(()=>{N().catch(()=>{});const y=window.setInterval(()=>N().catch(()=>{}),1e4);return()=>window.clearInterval(y)},[N]);const j=y=>{y.preventDefault();const k=h.trim();k&&(d(k),g(!0),w(""),typeof window<"u"&&window.localStorage.setItem("le:localistChatName",k))},E=()=>{g(!1),c(n)},M=y=>{var $;const k=($=y.target.files)==null?void 0:$[0];if(!k)return;if(w(""),!ct.includes(k.type)){w("Upload a GIF, PNG, JPG, or WebP image."),y.target.value="";return}if(k.size>ut){w("Upload must be 1 MB or smaller."),y.target.value="";return}const L=new FileReader;L.onload=()=>{I({dataUrl:String(L.result||""),name:k.name,mimeType:k.type})},L.onerror=()=>w("Unable to read that upload."),L.readAsDataURL(k),y.target.value=""},O=()=>{I(null),T.current&&(T.current.value="")},A=async y=>{y.preventDefault();const k=n.trim(),L=o.trim(),$=S.trim();if(!(!u||!k||!L&&!$&&!m)){s(!0),w("");try{await C("/api/hub/localist-chat",null,{method:"POST",body:JSON.stringify({senderName:k,body:L,imageUrl:$,imageUpload:m})}),p(""),b(""),O(),await N()}catch(V){w(V.message||"Unable to send message.")}finally{s(!1)}}};return e.createElement(U,{title:"Localist Chat",icon:le},e.createElement("div",{className:"hub-message-list hub-localist-chat-list"},t.length===0&&e.createElement("p",{className:"hub-empty"},"No messages yet."),t.map(y=>{var k;return e.createElement("div",{className:"hub-message",key:y.id},e.createElement("strong",null,y.senderName||"Guest"," / ",ve(y.createdAt)),e.createElement(pt,{text:y.body}),(k=y.attachments)==null?void 0:k.map(L=>L.type==="image"&&L.url?dt(L.url)?e.createElement("div",{className:"hub-message-attachment",key:L.url},e.createElement("iframe",{src:L.url,title:"GIF",loading:"lazy"}),e.createElement("a",{className:"hub-message-attachment-source",href:L.url,target:"_blank",rel:"noreferrer"},"Open GIF")):e.createElement("a",{className:"hub-message-attachment",href:L.url,target:"_blank",rel:"noreferrer",key:L.url},e.createElement("img",{src:L.url,alt:L.name||"",loading:"lazy"})):null))})),u?e.createElement("form",{className:"hub-form hub-localist-chat-form",onSubmit:A},e.createElement("div",{className:"hub-localist-chat-identity"},e.createElement("span",null,n),e.createElement("button",{type:"button",onClick:E},"Change")),e.createElement(z,{label:"Message"},e.createElement("textarea",{value:o,onChange:y=>p(y.target.value),placeholder:"Ask a question or share an update...",rows:2})),e.createElement(z,{label:"Image/GIF link"},e.createElement("input",{value:S,onChange:y=>b(y.target.value),placeholder:"https://...",inputMode:"url",autoComplete:"url"})),e.createElement("div",{className:"hub-localist-chat-upload"},e.createElement("input",{ref:T,type:"file",accept:"image/gif,image/png,image/jpeg,image/webp",onChange:M}),e.createElement("button",{type:"button",onClick:()=>{var y;return(y=T.current)==null?void 0:y.click()}},e.createElement(He,{size:13})," Upload"),m&&e.createElement("div",{className:"hub-localist-upload-preview"},e.createElement("img",{src:m.dataUrl,alt:""}),e.createElement("span",null,m.name),e.createElement("button",{type:"button",onClick:O,"aria-label":"Remove upload"},e.createElement(Re,{size:13})))),e.createElement("button",{className:"hub-primary-button",type:"submit",disabled:x||!o.trim()&&!S.trim()&&!m},e.createElement(fe,{size:13})," ",x?"Sending...":"Send"),f&&e.createElement("p",{className:"hub-error"},f)):e.createElement("form",{className:"hub-form hub-localist-chat-join",onSubmit:j},e.createElement(z,{label:"Name"},e.createElement("input",{value:h,onChange:y=>c(y.target.value),autoComplete:"name",required:!0})),e.createElement("button",{className:"hub-primary-button",type:"submit",disabled:!h.trim()},e.createElement(le,{size:13})," Join chat"),f&&e.createElement("p",{className:"hub-error"},f)))}function ht({children:t}){const[r,n]=a.useState(()=>typeof window>"u"?!1:window.sessionStorage.getItem(ke)==="1"),[d,h]=a.useState(""),[c,u]=a.useState(""),g=o=>{if(o.preventDefault(),d===Ye){typeof window<"u"&&window.sessionStorage.setItem(ke,"1"),n(!0),h(""),u("");return}u("Incorrect password.")};return r?t:e.createElement(U,{title:"Security at Neon",icon:ae},e.createElement("form",{className:"hub-form hub-security-password-form",onSubmit:g},e.createElement("p",{className:"hub-security-password-prompt"},Qe),e.createElement(z,{label:"Password"},e.createElement("input",{type:"password",value:d,onChange:o=>h(o.target.value),autoComplete:"current-password",autoFocus:!0,required:!0})),e.createElement("button",{className:"hub-primary-button",type:"submit",disabled:!d},e.createElement(ae,{size:13})," Enter menu"),c&&e.createElement("p",{className:"hub-error"},c)))}function Ue(){return e.createElement(ht,null,e.createElement(xe,{area:"security",menuName:"Security at Neon",successName:"Security at Neon",showChat:!1}))}function bt(){return e.createElement("div",{className:"hub-app hub-app-guest"},e.createElement("style",null,K),e.createElement("main",{className:"hub-main"},e.createElement("header",{className:"hub-topbar"},e.createElement("div",null,e.createElement("h1",null,"Security at Neon"),e.createElement("p",null,"Security menu"))),e.createElement("div",{className:"hub-guest-content"},e.createElement(Ue,null))))}function gt(){return e.createElement(e.Fragment,null,e.createElement("style",null,K),e.createElement("main",{className:"hub-auth-screen"},e.createElement("section",{className:"hub-auth-card"},e.createElement("div",{className:"hub-brand"},e.createElement(ae,{size:24}),e.createElement("div",null,e.createElement("h1",null,"This menu has closed"),e.createElement("p",null,"The Localist link is no longer live."))))))}function ft({localistWindow:t}){const r=t!=null&&t.expiresAt?new Date(t.expiresAt).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"",n=a.useRef(!1);return a.useEffect(()=>{n.current||(n.current=!0,ie("localist.window.viewed",{metadata:{windowId:(t==null?void 0:t.id)||"",expiresAt:(t==null?void 0:t.expiresAt)||""}}))},[t]),e.createElement("div",{className:"hub-app hub-app-guest"},e.createElement("style",null,K),e.createElement("main",{className:"hub-main"},e.createElement("header",{className:"hub-topbar"},e.createElement("div",null,e.createElement("h1",null,"Localist"),e.createElement("p",null,r?`Open until ${r}`:"Localist view"))),e.createElement("div",{className:"hub-guest-content"},e.createElement(xe,null))))}function $t(){var Y,ee;const t=$e(),r=new URLSearchParams(window.location.search).get("invite")||"",n=new URLSearchParams(window.location.search).get("localist")||"",h=window.location.pathname.replace(/\/+$/,"").toLowerCase()==="/hub/security",[c,u]=a.useState(null),[g,o]=a.useState(!1),[p,S]=a.useState({loaded:!n,window:null}),[b,m]=a.useState(h?"security":"today"),[I,x]=a.useState([]),[s,f]=a.useState([]),[w,T]=a.useState([]),[N,j]=a.useState([]),[E,M]=a.useState([]);a.useEffect(()=>{let P=document.querySelector('meta[name="robots"]');return P||(P=document.createElement("meta"),P.setAttribute("name","robots"),document.head.appendChild(P)),P.setAttribute("content","noindex, nofollow"),()=>{P.setAttribute("content","")}},[]),a.useEffect(()=>{n&&(S({loaded:!1,window:null}),C(`/api/hub/localist-window?token=${encodeURIComponent(n)}`).then(P=>S({loaded:!0,window:P.window||null})).catch(()=>S({loaded:!0,window:null})))},[n]);const O=a.useCallback(async()=>{if(t.accessToken){o(!1);try{const P=await C("/api/hub/profile",t.accessToken);u(P.profile||null)}finally{o(!0)}}},[t.accessToken]),A=a.useCallback(async()=>{const P=await C("/api/hub/docs",t.accessToken);f(P.documents||[])},[t.accessToken]),y=a.useCallback(async()=>{if(!t.accessToken||!c||c.accessLevel==="customer")return;const P=ne(),[i,l,v,D,_]=await Promise.all([C("/api/hub/people",t.accessToken),C("/api/hub/docs",t.accessToken),C(`/api/hub/calendar?view=week&date=${P}`,t.accessToken),C("/api/hub/conversations",t.accessToken),C(`/api/hub/shifts?from=${P}&to=${ue(P,14)}`,t.accessToken)]);x(i.people||[]),f(l.documents||[]),T(v.objects||[]),j(D.conversations||[]),M(_.shifts||[])},[t.accessToken,c]);a.useEffect(()=>{O().catch(()=>o(!0))},[O]),a.useEffect(()=>{y().catch(()=>{})},[y]);const k=!!c&&(c.accessLevel==="privileged"||c.isPrivileged||t.isAdmin),L=!!c&&c.accessLevel==="localist",$=!!c&&c.accessLevel==="customer",V={id:"admin",label:"Admin",icon:ae},R={id:"localist",label:"Localist",icon:Ee},G={id:"security",label:"Security at Neon",icon:ae},Z=L?[R]:$?[re]:k?[...J,re,V,R,G]:[...J,re,R,G],W=L?[R]:$?[re]:k?[J[0],J[1],re,J[3],J[5],V,R,G]:[J[0],J[1],re,J[2],J[3],J[5],R,G],q=L?"localist":$?"weeklyMealPrep":b;return n?p.loaded?(Y=p.window)!=null&&Y.valid?e.createElement(ft,{localistWindow:p.window}):e.createElement(gt,null):e.createElement(e.Fragment,null,e.createElement("style",null,K),e.createElement("main",{className:"hub-auth-screen"},e.createElement(X,{className:"animate-spin",size:36}))):h?e.createElement(bt,null):t.loading?e.createElement(e.Fragment,null,e.createElement("style",null,K),e.createElement("main",{className:"hub-auth-screen"},e.createElement(X,{className:"animate-spin",size:36}))):t.user?g&&!c?e.createElement(e.Fragment,null,e.createElement("style",null,K),e.createElement(Xe,{accessToken:t.accessToken,inviteToken:r,onDone:O})):g?e.createElement("div",{className:"hub-app"},e.createElement("style",null,K),e.createElement("aside",{className:"hub-sidebar"},e.createElement("div",{className:"hub-logo"},e.createElement(ae,{size:18}),e.createElement("div",null,e.createElement("strong",null,"Hub"),e.createElement("span",null,c.displayName))),e.createElement("nav",null,Z.map(({id:P,label:i,icon:l})=>e.createElement("button",{key:P,className:q===P?"is-active":"",onClick:()=>m(P)},e.createElement(l,{size:15,"aria-hidden":"true"}),i))),e.createElement("button",{className:"hub-signout",onClick:t.signOut},e.createElement(_e,{size:13})," Sign out")),e.createElement("main",{className:"hub-main"},e.createElement("header",{className:"hub-topbar"},e.createElement("div",null,e.createElement("h1",null,((ee=Z.find(P=>P.id===q))==null?void 0:ee.label)||"Hub"),e.createElement("p",null,L?"Localist view":$?"Customer view":k?"Privileged view":"Staff view")),e.createElement("button",{onClick:y},e.createElement(X,{size:13})," Refresh")),q==="today"&&e.createElement(Ze,{calendar:w,docs:s,conversations:N,shifts:E,setTab:m}),q==="calendar"&&e.createElement(et,{accessToken:t.accessToken,profile:c}),q==="chat"&&e.createElement(tt,{accessToken:t.accessToken,people:I,currentUserId:c.userId}),q==="docs"&&e.createElement(at,{accessToken:t.accessToken,docs:s,reloadDocs:A,isPrivileged:k}),q==="people"&&e.createElement(nt,{people:I,onMessage:()=>m("chat")}),q==="shifts"&&e.createElement(lt,{accessToken:t.accessToken,isPrivileged:k}),q==="weeklyMealPrep"&&e.createElement(rt,{accessToken:t.accessToken,profile:c,isPrivileged:k}),q==="admin"&&k&&e.createElement(it,{accessToken:t.accessToken,reloadDocs:A}),q==="localist"&&e.createElement(xe,null),q==="security"&&e.createElement(Ue,null)),e.createElement("nav",{className:"hub-mobile-nav"},W.map(({id:P,label:i,icon:l})=>e.createElement("button",{key:P,className:q===P?"is-active":"",onClick:()=>m(P)},e.createElement(l,{size:18}),e.createElement("span",null,i))))):e.createElement(e.Fragment,null,e.createElement("style",null,K),e.createElement("main",{className:"hub-auth-screen"},e.createElement(X,{className:"animate-spin",size:36}))):e.createElement(e.Fragment,null,e.createElement("style",null,K),e.createElement(Ke,{auth:t,inviteToken:r}))}const K=`
.hub-app {
  --hub-bg: #f5f3ee;
  --hub-panel: #ffffff;
  --hub-ink: #1a1d1b;
  --hub-muted: #6b7068;
  --hub-border: #e0dbd0;
  --hub-border-light: #ece8e0;
  --hub-accent: #345c51;
  --hub-accent-bg: #eaf1ee;
  --hub-accent-text: #ffffff;
  --hub-row-hover: #f8f6f1;
  min-height: 100vh;
  display: flex;
  background: var(--hub-bg);
  color: var(--hub-ink);
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1.5;
}

/* ── Sidebar ── */
.hub-sidebar {
  width: 216px;
  min-width: 216px;
  background: #eee9df;
  border-right: 1px solid var(--hub-border);
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}
.hub-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 10px;
  border-bottom: 1px solid var(--hub-border);
  margin-bottom: 4px;
}
.hub-logo strong { display: block; font-size: 14px; font-weight: 700; line-height: 1; }
.hub-logo span { display: block; font-size: 11px; color: var(--hub-muted); margin-top: 2px; }
.hub-sidebar nav { display: flex; flex-direction: column; gap: 1px; flex: 1; }
.hub-sidebar nav button {
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--hub-ink);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
}
.hub-sidebar nav button:hover { background: rgba(0,0,0,0.05); }
.hub-sidebar nav button.is-active {
  background: var(--hub-accent);
  color: var(--hub-accent-text);
  font-weight: 600;
}
.hub-signout {
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--hub-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--hub-border);
}
.hub-signout:hover { color: #7a2f2f; }

/* ── Main area ── */
.hub-main { flex: 1; min-width: 0; padding: 16px 20px 72px; overflow: auto; }
.hub-app-guest .hub-main { max-width: 760px; margin: 0 auto; width: 100%; }
.hub-guest-content { display: grid; gap: 12px; }
.hub-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--hub-border);
}
.hub-topbar h1 { margin: 0; font-size: 17px; font-weight: 600; line-height: 1.2; }
.hub-topbar p { margin: 2px 0 0; font-size: 11px; color: var(--hub-muted); }
.hub-topbar button,
.hub-panel-head button,
.hub-button-row button,
.hub-person button,
.hub-shift-action {
  height: 28px;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  background: var(--hub-panel);
  color: var(--hub-ink);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.hub-topbar button:hover,
.hub-panel-head button:hover,
.hub-button-row button:hover,
.hub-person button:hover,
.hub-shift-action:hover { background: var(--hub-row-hover); }
.hub-button-row { display: flex; gap: 4px; }
.hub-button-row button.is-active { background: var(--hub-accent-bg); color: var(--hub-accent); border-color: #b9d1c8; }

/* ── Grid & panels ── */
.hub-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.hub-panel {
  background: var(--hub-panel);
  border: 1px solid var(--hub-border);
  border-radius: 7px;
  overflow: hidden;
}
.hub-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--hub-border-light);
}
.hub-panel-title { display: flex; align-items: center; gap: 7px; }
.hub-panel h2 { margin: 0; font-size: 13px; font-weight: 600; }
.hub-subhead { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--hub-muted); margin: 12px 14px 4px; }

/* ── Lists & rows ── */
.hub-list { display: flex; flex-direction: column; }
.hub-row {
  border-bottom: 1px solid var(--hub-border-light);
  background: transparent;
  padding: 8px 14px;
  text-align: left;
}
.hub-row:last-child { border-bottom: none; }
.hub-row strong { display: block; font-size: 13px; font-weight: 600; line-height: 1.35; }
.hub-row span { display: block; color: var(--hub-muted); font-size: 11px; margin-top: 1px; }
.hub-row-button { width: 100%; cursor: pointer; background: transparent; border: none; }
.hub-row-button:hover { background: var(--hub-row-hover); }
.hub-row-button.is-active { background: var(--hub-accent-bg); }
.hub-row-button.is-active strong { color: var(--hub-accent); }
.hub-empty { color: var(--hub-muted); font-size: 12px; margin: 0; padding: 10px 14px; }

/* ── Calendar ── */
.hub-calendar-list { display: flex; flex-direction: column; gap: 16px; padding: 12px 14px; }
.hub-calendar-shell { display: grid; grid-template-columns: minmax(0, 1fr) 240px; gap: 12px; align-items: start; }
.hub-day h3 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--hub-muted); margin: 0 0 6px; }
.hub-calendar-item {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 2px 10px;
  padding: 7px 10px;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  background: var(--hub-panel);
  margin-bottom: 4px;
}
.hub-calendar-item span { font-size: 11px; font-weight: 700; color: var(--hub-accent); }
.hub-calendar-item strong { font-size: 13px; font-weight: 600; }
.hub-calendar-item small { grid-column: 2; color: var(--hub-muted); font-size: 11px; }
.hub-calendar-widget {
  margin: 12px 14px 12px 0;
  border: 1px solid var(--hub-border);
  border-radius: 6px;
  background: var(--hub-bg);
  padding: 10px;
  display: grid;
  gap: 6px;
}
.hub-calendar-widget strong { font-size: 12px; }
.hub-calendar-widget span,
.hub-calendar-widget small { color: var(--hub-muted); font-size: 11px; }

/* ── Chat ── */
.hub-chat-layout { display: grid; grid-template-columns: minmax(220px, 280px) 1fr; gap: 12px; }
.hub-doc-layout { display: grid; grid-template-columns: minmax(200px, 260px) 1fr minmax(200px, 280px); gap: 12px; }
.hub-message-list {
  min-height: 50vh;
  max-height: 60vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
}
.hub-message { padding: 8px 10px; background: var(--hub-bg); border-radius: 5px; }
.hub-message strong { color: var(--hub-muted); font-size: 11px; display: block; margin-bottom: 3px; }
.hub-message p { margin: 0; font-size: 13px; line-height: 1.45; }
.hub-compose { display: flex; gap: 6px; padding: 10px 14px; border-top: 1px solid var(--hub-border-light); }

/* ── Inputs & forms ── */
.hub-compose input,
.hub-field input,
.hub-field select,
.hub-field textarea,
.hub-copy-box input {
  width: 100%;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  padding: 0 10px;
  height: 32px;
  font-size: 13px;
  background: var(--hub-panel);
  color: var(--hub-ink);
}
.hub-field textarea { height: auto; padding: 8px 10px; }
.hub-compose button, .hub-primary-button {
  height: 32px;
  border: 0;
  border-radius: 5px;
  background: var(--hub-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  cursor: pointer;
  white-space: nowrap;
}
.hub-primary-button:disabled { opacity: 0.45; cursor: not-allowed; }
.hub-form { display: grid; gap: 10px; padding: 12px 14px; }
.hub-field span { display: block; margin-bottom: 4px; font-size: 11px; font-weight: 600; color: var(--hub-muted); text-transform: uppercase; letter-spacing: 0.03em; }

/* ── Docs ── */
.hub-doc-body { padding: 12px 14px; }
.hub-doc-body pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.6; }
.hub-doc-summary { color: var(--hub-muted); font-size: 12px; margin: 0 0 10px; }

/* ── People ── */
.hub-people-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; padding: 12px 14px; }
.hub-person {
  border: 1px solid var(--hub-border);
  border-radius: 6px;
  background: var(--hub-bg);
  padding: 10px 12px;
  display: grid;
  gap: 3px;
}
.hub-person strong { font-size: 13px; font-weight: 600; }
.hub-person span, .hub-person small { color: var(--hub-muted); font-size: 11px; overflow-wrap: anywhere; }
.hub-person button { margin-top: 6px; }

/* ── Shifts ── */
.hub-shift {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--hub-border-light);
}
.hub-shift:last-child { border-bottom: none; }
.hub-shift strong { display: block; font-size: 13px; font-weight: 600; }
.hub-shift span, .hub-shift small { display: block; color: var(--hub-muted); font-size: 11px; margin-top: 1px; }
.hub-pill {
  border: 1px solid var(--hub-border);
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--hub-accent);
  white-space: nowrap;
}

/* ── Weekly meal prep ── */
.hub-meal-prep { display: grid; gap: 12px; }
.hub-customer-table-wrap {
  max-height: min(430px, 52svh);
  overflow: auto;
  border-top: 1px solid var(--hub-border-light);
}
.hub-customer-table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  font-size: 12px;
}
.hub-customer-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--hub-panel);
  border-bottom: 1px solid var(--hub-border);
  color: var(--hub-muted);
  font-size: 11px;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 8px 10px;
}
.hub-customer-table td {
  vertical-align: top;
  border-bottom: 1px solid var(--hub-border-light);
  padding: 9px 10px;
}
.hub-customer-table strong,
.hub-customer-table span,
.hub-customer-table small {
  display: block;
}
.hub-customer-table small,
.hub-customer-table span:not(:first-child) {
  color: var(--hub-muted);
  font-size: 11px;
  margin-top: 2px;
}
.hub-wordpad-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--hub-border-light);
  overflow-x: auto;
}
.hub-wordpad-tabs button {
  height: 28px;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  background: var(--hub-panel);
  color: var(--hub-ink);
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.hub-wordpad-tabs button.is-active {
  background: var(--hub-accent-bg);
  border-color: #b9d1c8;
  color: var(--hub-accent);
}
.hub-wordpad-tabs span {
  margin-left: auto;
  color: var(--hub-muted);
  font-size: 11px;
  white-space: nowrap;
}
.hub-wordpad {
  width: 100%;
  min-height: 340px;
  border: 0;
  outline: 0;
  resize: vertical;
  padding: 12px 14px;
  background: #fff;
  color: var(--hub-ink);
  font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.hub-markdown-preview {
  min-height: 260px;
  padding: 12px 14px;
  background: #fff;
}
.hub-markdown-preview h2,
.hub-markdown-preview h3,
.hub-markdown-preview h4 { margin: 10px 0 5px; font-weight: 700; }
.hub-markdown-preview h2 { font-size: 17px; }
.hub-markdown-preview h3 { font-size: 15px; }
.hub-markdown-preview h4 { font-size: 13px; }
.hub-markdown-preview p {
  margin: 0 0 5px;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
}

/* ── Misc ── */
.hub-copy-box { padding: 0 14px 12px; display: grid; gap: 6px; }
.hub-copy-box strong { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--hub-muted); }
.hub-localist-analytics {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
}
.hub-localist-window-card {
  display: grid;
  gap: 8px;
  border: 1px solid var(--hub-border-light);
  border-radius: 6px;
  padding: 10px;
  background: var(--hub-bg);
}
.hub-localist-window-card small {
  color: var(--hub-muted);
  font-size: 11px;
}
.hub-localist-window-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.hub-localist-window-head strong,
.hub-metric strong {
  display: block;
  color: var(--hub-ink);
  font-size: 13px;
}
.hub-localist-window-head span,
.hub-metric span {
  display: block;
  color: var(--hub-muted);
  font-size: 11px;
}
.hub-localist-order-detail,
.hub-localist-order-items {
  display: grid;
  gap: 4px;
  color: var(--hub-muted);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.hub-localist-order-items {
  color: var(--hub-ink);
  font-weight: 600;
}
.hub-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.hub-metric {
  min-width: 0;
  border: 1px solid var(--hub-border-light);
  border-radius: 5px;
  padding: 6px 7px;
  background: #fff;
}
.hub-localist-intro { padding: 12px 14px; border-bottom: 1px solid var(--hub-border-light); background: var(--hub-accent-bg); }
.hub-localist-intro small { display: block; color: var(--hub-accent); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.hub-localist-intro h3 { margin: 0; font-size: 16px; line-height: 1.25; font-weight: 700; color: var(--hub-ink); }
.hub-localist-intro p { margin: 6px 0 0; font-size: 13px; line-height: 1.45; color: var(--hub-ink); white-space: pre-wrap; }
.hub-localist-intro span { display: block; margin-top: 6px; color: var(--hub-muted); font-size: 11px; }
.hub-security-password-form { gap: 12px; }
.hub-security-password-prompt {
  margin: 0;
  color: var(--hub-ink);
  font-size: 14px;
  line-height: 1.5;
}
.hub-localist-share {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--hub-border-light);
}
.hub-localist-share button {
  height: 30px;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  background: var(--hub-panel);
  color: var(--hub-ink);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  font-weight: 600;
  cursor: pointer;
}
.hub-localist-share span {
  min-width: 0;
  color: var(--hub-muted);
  font-size: 11px;
  text-align: right;
}
.hub-localist-form { gap: 12px; }
.hub-localist-list {
  display: grid;
  gap: 8px;
}
.hub-localist-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px;
  gap: 12px;
  align-items: center;
  border: 1px solid var(--hub-border-light);
  border-radius: 6px;
}
.hub-localist-item.is-sold-out {
  opacity: 0.68;
}
.hub-localist-item.is-sold-out .hub-localist-item-copy > strong,
.hub-localist-item.is-sold-out .hub-localist-item-copy > span:not(.hub-localist-inventory) {
  text-decoration: line-through;
}
.hub-localist-item-copy { min-width: 0; }
.hub-localist-item-copy strong {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 7px;
}
.hub-localist-price { color: var(--hub-accent); font-weight: 700; white-space: nowrap; }
.hub-localist-inventory {
  display: block;
  margin-top: 4px;
  color: var(--hub-muted);
  font-size: 11px;
  font-weight: 700;
}
.hub-localist-inventory.is-sold-out {
  color: #9b2f2f;
}
.hub-localist-flags,
.hub-localist-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.hub-localist-flags span {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  border: 1px solid var(--hub-border);
  border-radius: 999px;
  padding: 2px 8px;
  color: var(--hub-muted);
  background: #fff;
  font-size: 11px;
  font-weight: 600;
}
.hub-localist-option {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  border: 1px solid var(--hub-border-light);
  border-radius: 5px;
  padding: 3px 7px;
  background: #fff;
  color: var(--hub-ink);
  font-size: 11px;
  font-weight: 600;
}
.hub-localist-option input {
  width: 13px;
  height: 13px;
  margin: 0;
  accent-color: var(--hub-accent);
}
.hub-localist-quantity {
  width: 112px;
  height: 30px;
  display: grid;
  grid-template-columns: 30px 1fr 30px;
  align-items: stretch;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  overflow: hidden;
  background: var(--hub-panel);
}
.hub-localist-quantity button {
  border: 0;
  background: var(--hub-row-hover);
  color: var(--hub-ink);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.hub-localist-quantity button:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
.hub-localist-quantity input {
  min-width: 0;
  width: 100%;
  border: 0;
  border-left: 1px solid var(--hub-border);
  border-right: 1px solid var(--hub-border);
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--hub-ink);
  background: #fff;
}
.hub-localist-checkout {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--hub-border);
  border-radius: 6px;
  padding: 10px 12px;
  background: var(--hub-accent-bg);
}
.hub-localist-checkout span,
.hub-localist-checkout small {
  display: block;
  color: var(--hub-muted);
  font-size: 11px;
}
.hub-localist-checkout strong {
  display: block;
  color: var(--hub-ink);
  font-size: 18px;
  line-height: 1.2;
}
.hub-localist-chat-list {
  min-height: 240px;
  max-height: min(460px, 52svh);
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
.hub-localist-chat-list .hub-message {
  overflow-wrap: anywhere;
}
.hub-localist-chat-list .hub-message a {
  color: var(--hub-accent);
  font-weight: 600;
}
.hub-localist-chat-join {
  border-top: 1px solid var(--hub-border-light);
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}
.hub-localist-chat-form {
  border-top: 1px solid var(--hub-border-light);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
}
.hub-localist-chat-identity,
.hub-localist-chat-form .hub-field:nth-of-type(1),
.hub-localist-chat-upload,
.hub-localist-chat-form .hub-error {
  grid-column: 1 / -1;
}
.hub-localist-chat-identity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
  color: var(--hub-muted);
  font-size: 12px;
}
.hub-localist-chat-identity span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--hub-ink);
  font-weight: 700;
}
.hub-localist-chat-identity button,
.hub-localist-chat-upload > button,
.hub-localist-upload-preview button {
  height: 28px;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  background: var(--hub-panel);
  color: var(--hub-ink);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.hub-localist-chat-upload {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.hub-localist-chat-upload > input {
  display: none;
}
.hub-localist-upload-preview {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--hub-border-light);
  border-radius: 6px;
  padding: 5px;
  background: var(--hub-bg);
}
.hub-localist-upload-preview img {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  background: #fff;
}
.hub-localist-upload-preview span {
  min-width: 0;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--hub-muted);
  font-size: 11px;
  font-weight: 600;
}
.hub-localist-chat-form .hub-primary-button {
  justify-self: end;
  min-width: 140px;
}
.hub-message-attachment {
  display: block;
  margin-top: 8px;
  width: min(320px, 100%);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--hub-border-light);
  background: #fff;
}
.hub-message-attachment img {
  display: block;
  width: 100%;
  max-height: min(320px, 45svh);
  object-fit: contain;
  background: #fff;
}
.hub-message-attachment iframe {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-height: min(360px, 45svh);
  border: 0;
  background: #fff;
}
.hub-message-attachment-source {
  display: block;
  border-top: 1px solid var(--hub-border-light);
  padding: 7px 8px;
  background: var(--hub-bg);
  color: var(--hub-accent);
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
}

/* ── Auth screens ── */
.hub-auth-screen { min-height: 100vh; display: grid; place-items: center; background: var(--hub-bg, #f5f3ee); padding: 18px; }
.hub-auth-card { width: min(440px, 100%); background: #fff; border: 1px solid var(--hub-border); border-radius: 8px; padding: 24px; }
.hub-auth-card .hub-form { padding: 0; }
.hub-brand { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.hub-brand h1, .hub-auth-card h1 { font-size: 20px; font-weight: 700; margin: 0; }
.hub-brand p, .hub-help { color: var(--hub-muted); font-size: 13px; line-height: 1.5; }
.hub-notice { background: #edf5f1; border: 1px solid #b9d1c8; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; font-weight: 600; }
.hub-error { color: #9b2f2f; font-weight: 600; font-size: 13px; margin: 0; }
.hub-text-button { border: 0; background: transparent; color: var(--hub-accent); font-weight: 600; font-size: 13px; margin-top: 10px; cursor: pointer; }

/* ── Mobile nav ── */
.hub-mobile-nav { display: none; }
@media (max-width: 900px) {
  .hub-app { display: block; }
  .hub-sidebar { display: none; }
  .hub-main { padding: 12px 12px 68px; }
  .hub-topbar { margin-bottom: 12px; }
  .hub-grid, .hub-chat-layout, .hub-doc-layout, .hub-calendar-shell { grid-template-columns: 1fr; }
  .hub-calendar-widget { margin: 0 14px 12px; }
  .hub-calendar-item { grid-template-columns: 1fr; }
  .hub-calendar-item small { grid-column: auto; }
  .hub-shift { flex-wrap: wrap; }
  .hub-compose { flex-direction: column; }
  .hub-metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hub-localist-window-head { flex-direction: column; }
  .hub-localist-share { align-items: stretch; flex-direction: column; }
  .hub-localist-share button { justify-content: center; width: 100%; min-height: 44px; }
  .hub-localist-share span { text-align: center; }
  .hub-localist-item { grid-template-columns: 1fr; align-items: stretch; }
  .hub-localist-quantity { width: 100%; grid-template-columns: 38px 1fr 38px; }
  .hub-localist-checkout { align-items: stretch; flex-direction: column; }
  .hub-localist-checkout .hub-primary-button { width: 100%; }
  .hub-localist-chat-list {
    min-height: 240px;
    max-height: min(430px, 52svh);
    padding: 10px 12px;
  }
  .hub-localist-chat-list .hub-message {
    padding: 10px 12px;
  }
  .hub-localist-chat-list .hub-message p {
    font-size: 14px;
    line-height: 1.5;
  }
  .hub-localist-chat-join,
  .hub-localist-chat-form {
    grid-template-columns: 1fr;
    gap: 9px;
    padding: 10px 12px 12px;
  }
  .hub-localist-chat-join .hub-primary-button {
    width: 100%;
    min-height: 44px;
  }
  .hub-localist-chat-form .hub-field,
  .hub-localist-chat-form .hub-field:nth-of-type(1),
  .hub-localist-chat-upload,
  .hub-localist-chat-form .hub-error {
    grid-column: 1;
  }
  .hub-localist-chat-identity {
    align-items: stretch;
    flex-direction: column;
  }
  .hub-localist-chat-identity button {
    justify-content: center;
    min-height: 40px;
  }
  .hub-localist-chat-form .hub-field input,
  .hub-localist-chat-form .hub-field textarea {
    min-height: 44px;
    font-size: 16px;
  }
  .hub-localist-chat-form .hub-field textarea {
    padding-top: 10px;
    resize: vertical;
  }
  .hub-localist-chat-form .hub-primary-button {
    justify-self: stretch;
    width: 100%;
    min-height: 44px;
  }
  .hub-localist-chat-upload {
    align-items: stretch;
    flex-direction: column;
  }
  .hub-localist-chat-upload > button {
    justify-content: center;
    min-height: 44px;
  }
  .hub-localist-upload-preview {
    width: 100%;
  }
  .hub-localist-upload-preview span {
    max-width: none;
  }
  .hub-message-attachment {
    width: 100%;
  }
  .hub-message-attachment img {
    max-height: min(320px, 42svh);
  }
  .hub-message-attachment iframe {
    max-height: min(360px, 42svh);
  }
  .hub-mobile-nav {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(48px, 1fr));
    background: #eee9df;
    border-top: 1px solid var(--hub-border);
    padding: 4px 4px 4px;
    padding-bottom: max(4px, env(safe-area-inset-bottom));
  }
  .hub-mobile-nav button {
    height: 48px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--hub-ink);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
  }
  .hub-mobile-nav button.is-active { color: var(--hub-accent); }
}
`;export{$t as default};
