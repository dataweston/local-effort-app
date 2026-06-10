import{x as Le,F as ze,r as a,R as e,X as Pe}from"./index-DScw1kxE.js";import{R as Y}from"./refresh-cw-CBAmpiaX.js";import{S as ce,C as Ee,U as xe}from"./users-round-Dcjq_uIJ.js";import{S as he,a as me}from"./shopping-cart-C6JfiJ-_.js";import{H as we}from"./house-BlDbNOVV.js";import{M as Z,C as de,a as Se}from"./message-square-zhz6nxez.js";import{F as ne}from"./file-text-B76dR5vV.js";import{L as Te,I as Oe}from"./log-out-CmfjYkxD.js";import{L as Ae}from"./log-in-C-3Maq3X.js";import{P as ae}from"./plus-DKR24AbL.js";import{C as Ne}from"./circle-check-khUmWk2n.js";import{C as De}from"./copy-CBSpVffD.js";import{M as Ue}from"./minus-pu6p7L4V.js";import{U as $e}from"./upload-G2r0qA6u.js";/**
 * @license lucide-react v0.451.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fe=Le("UserPlus",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]),V=[{id:"today",label:"Today",icon:we},{id:"calendar",label:"Calendar",icon:Ee},{id:"chat",label:"Chat",icon:Z},{id:"docs",label:"Docs",icon:ne},{id:"people",label:"People",icon:xe},{id:"shifts",label:"Shifts",icon:de}],Me=[{key:"glutenFree",label:"Gluten free"},{key:"nutAllergy",label:"Nut allergy"},{key:"vegetarian",label:"Vegetarian"},{key:"dairyFree",label:"Dairy free"}],qe=["Tuesday, 2pm-4pm","Tuesday, 4pm-6pm","Wednesday, 2pm-4pm","Wednesday, 4pm-6pm"],Re=[["glutenFree","Gluten free"],["dairyFree","Dairy free"],["containsPork","Contains pork"],["containsNuts","Contains nuts"],["containsDairy","Contains dairy"]];function X(){return new Date().toISOString().slice(0,10)}function le(t,r){const n=new Date(`${t}T00:00:00`);return n.setDate(n.getDate()+r),n.toISOString().slice(0,10)}function be(t){return t?new Date(`${String(t).slice(0,10)}T00:00:00`).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}):""}function re(t){if(!t)return"";const[r,n]=String(t).split(":"),d=new Date;return d.setHours(Number(r),Number(n||0),0,0),d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}function pe(t){if(!t)return"";const r=Date.now()-new Date(t).getTime(),n=Math.max(0,Math.floor(r/6e4));if(n<2)return"now";if(n<60)return`${n}m`;const d=Math.floor(n/60);return d<24?`${d}h`:`${Math.floor(d/24)}d`}async function w(t,r,n={}){const b=await fetch(`${t}`,{...n,headers:{...n.body?{"Content-Type":"application/json"}:{},...r?{Authorization:`Bearer ${r}`}:{},...n.headers||{}}}),h=await b.json().catch(()=>({}));if(!b.ok)throw new Error(h.error||"Request failed");return h}function se(t){const r=typeof crypto<"u"&&crypto.randomUUID?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;return`${t}:${r}`}function ke(){if(typeof window>"u")return{visitorId:se("visitor"),sessionId:se("session")};const t=window.localStorage;let r=t.getItem("le:localistVisitorId"),n=t.getItem("le:localistSessionId");return r||(r=se("visitor"),t.setItem("le:localistVisitorId",r)),n||(n=se("session"),t.setItem("le:localistSessionId",n)),{visitorId:r,sessionId:n}}function oe(){if(typeof window>"u")return{localistToken:"",entrySource:"direct",path:"",referrer:""};const t=new URLSearchParams(window.location.search);return{localistToken:t.get("localist")||"",entrySource:t.get("shared")==="1"?"shared":"direct",path:`${window.location.pathname}${window.location.search}`,referrer:document.referrer||""}}function te(t,r={}){if(!(typeof window>"u"))try{const n={eventType:t,occurredAt:new Date().toISOString(),...ke(),...oe(),...r};w("/api/hub/localist-activity",null,{method:"POST",body:JSON.stringify(n),keepalive:!0}).catch(()=>{})}catch{}}function A({title:t,icon:r,action:n,children:d}){return e.createElement("section",{className:"hub-panel"},e.createElement("div",{className:"hub-panel-head"},e.createElement("div",{className:"hub-panel-title"},r&&e.createElement(r,{size:15,"aria-hidden":"true"}),e.createElement("h2",null,t)),n),d)}function N({label:t,children:r}){return e.createElement("label",{className:"hub-field"},e.createElement("span",null,t),r)}function _e({auth:t,inviteToken:r}){const[n,d]=a.useState(r?"signup":"signin"),[b,h]=a.useState(null),[c,g]=a.useState(""),[u,o]=a.useState(""),[v,s]=a.useState(""),[m,I]=a.useState(""),[$,p]=a.useState(""),[L,z]=a.useState(!1);a.useEffect(()=>{r&&w(`/api/hub/profile?invite=${encodeURIComponent(r)}`).then(S=>{h(S.invite),g(S.invite.email||""),s(S.invite.displayNameHint||"")}).catch(S=>p(S.message))},[r]);const U=async S=>{S.preventDefault(),p(""),z(!0);try{n==="signup"?(await t.signUpWithEmail(c,u,{display_name:v}),await t.signInWithEmail(c,u)):await t.signInWithEmail(c,u)}catch(q){p(q.message||"Unable to sign in")}finally{z(!1)}};return e.createElement("main",{className:"hub-auth-screen"},e.createElement("div",{className:"hub-auth-card"},e.createElement("div",{className:"hub-brand"},e.createElement(ce,{size:42,"aria-hidden":"true"}),e.createElement("div",null,e.createElement("h1",null,"Local Effort Hub"),e.createElement("p",null,"Staff calendar, messages, documents, and shift pickup."))),b&&e.createElement("div",{className:"hub-notice"},"Invite for ",b.email,". Access: ",b.accessLevel,"."),e.createElement("form",{onSubmit:U,className:"hub-form"},e.createElement(N,{label:"Email"},e.createElement("input",{type:"email",value:c,onChange:S=>g(S.target.value),autoComplete:"email",required:!0})),e.createElement(N,{label:"Password"},e.createElement("input",{type:"password",value:u,onChange:S=>o(S.target.value),autoComplete:n==="signup"?"new-password":"current-password",minLength:8,required:!0})),n==="signup"&&e.createElement(e.Fragment,null,e.createElement(N,{label:"Display name"},e.createElement("input",{value:v,onChange:S=>s(S.target.value),required:!0})),e.createElement(N,{label:"Role or title"},e.createElement("input",{value:m,onChange:S=>I(S.target.value)}))),$&&e.createElement("p",{className:"hub-error"},$),e.createElement("button",{className:"hub-primary-button",type:"submit",disabled:L},e.createElement(Ae,{size:20,"aria-hidden":"true"}),L?"Working...":n==="signup"?"Create profile":"Sign in")),e.createElement("button",{className:"hub-text-button",type:"button",onClick:()=>d(n==="signup"?"signin":"signup")},n==="signup"?"I already have a Hub account":"I have an invite and need a profile"),e.createElement("p",{className:"hub-help"},"Use email and password. Invite links control who can create staff or privileged profiles.")))}function je({accessToken:t,inviteToken:r,onDone:n}){const[d,b]=a.useState(null),[h,c]=a.useState(""),[g,u]=a.useState(""),[o,v]=a.useState("");a.useEffect(()=>{r&&w(`/api/hub/profile?invite=${encodeURIComponent(r)}`).then(m=>{b(m.invite),c(m.invite.displayNameHint||"")}).catch(m=>v(m.message))},[r]);const s=async m=>{m.preventDefault(),v("");try{await w("/api/hub/profile",t,{method:"POST",body:JSON.stringify({inviteToken:r,displayName:h,title:g})}),n()}catch(I){v(I.message)}};return e.createElement("main",{className:"hub-auth-screen"},e.createElement("div",{className:"hub-auth-card"},e.createElement("h1",null,"Finish Hub Profile"),d&&e.createElement("p",{className:"hub-help"},"Invite access: ",d.accessLevel),e.createElement("form",{className:"hub-form",onSubmit:s},e.createElement(N,{label:"Display name"},e.createElement("input",{value:h,onChange:m=>c(m.target.value),required:!0})),e.createElement(N,{label:"Role or title"},e.createElement("input",{value:g,onChange:m=>u(m.target.value)})),o&&e.createElement("p",{className:"hub-error"},o),e.createElement("button",{className:"hub-primary-button",type:"submit"},"Enter Hub"))))}function Fe({calendar:t,docs:r,conversations:n,shifts:d,setTab:b}){const h=t.filter(o=>String(o.startsAt||"").startsWith(X())),c=d.filter(o=>o.open).slice(0,4),g=r.slice(0,4),u=n.slice(0,4);return e.createElement("div",{className:"hub-grid"},e.createElement(A,{title:"Today",icon:we,action:e.createElement("button",{onClick:()=>b("calendar")},"Open calendar")},e.createElement("div",{className:"hub-list"},h.length===0&&e.createElement("p",{className:"hub-empty"},"No scheduled items today."),h.map(o=>e.createElement("div",{className:"hub-row",key:o.id},e.createElement("strong",null,o.title),e.createElement("span",null,re(String(o.startsAt||"").slice(11,16))," ",o.subtitle||""))))),e.createElement(A,{title:"Open Shifts",icon:de,action:e.createElement("button",{onClick:()=>b("shifts")},"View shifts")},e.createElement("div",{className:"hub-list"},c.length===0&&e.createElement("p",{className:"hub-empty"},"No open shifts."),c.map(o=>e.createElement("div",{className:"hub-row",key:o.id},e.createElement("strong",null,o.title),e.createElement("span",null,be(o.date)," at ",re(o.startTime)))))),e.createElement(A,{title:"Recent Chat",icon:Z,action:e.createElement("button",{onClick:()=>b("chat")},"Open chat")},e.createElement("div",{className:"hub-list"},u.map(o=>e.createElement("div",{className:"hub-row",key:o.id||o.objectId},e.createElement("strong",null,o.title),e.createElement("span",null,o.preview||"No messages yet"))))),e.createElement(A,{title:"Documents",icon:ne,action:e.createElement("button",{onClick:()=>b("docs")},"Open docs")},e.createElement("div",{className:"hub-list"},g.length===0&&e.createElement("p",{className:"hub-empty"},"No documents published."),g.map(o=>e.createElement("div",{className:"hub-row",key:o.id},e.createElement("strong",null,o.title),e.createElement("span",null,o.category," / ",o.visibility))))))}function Be({accessToken:t}){const[r,n]=a.useState(X()),[d,b]=a.useState([]),[h,c]=a.useState(!1),g=a.useCallback(async()=>{c(!0);try{const o=await w(`/api/hub/calendar?view=week&date=${r}`,t);b(o.objects||[])}finally{c(!1)}},[t,r]);a.useEffect(()=>{g()},[g]);const u=a.useMemo(()=>{const o=new Map;return d.forEach(v=>{var m;const s=String(v.startsAt||((m=v.metadata)==null?void 0:m.date)||"").slice(0,10)||r;o.set(s,[...o.get(s)||[],v])}),[...o.entries()].sort(([v],[s])=>v.localeCompare(s))},[d,r]);return e.createElement(A,{title:"Calendar",icon:Ee,action:e.createElement("div",{className:"hub-button-row"},e.createElement("button",{onClick:()=>n(le(r,-7))},"Previous"),e.createElement("button",{onClick:()=>n(X())},"Today"),e.createElement("button",{onClick:()=>n(le(r,7))},"Next"),e.createElement("button",{onClick:g},e.createElement(Y,{size:13})))},h&&e.createElement("p",{className:"hub-empty"},"Loading calendar..."),e.createElement("div",{className:"hub-calendar-list"},u.map(([o,v])=>e.createElement("section",{className:"hub-day",key:o},e.createElement("h3",null,be(o)),v.map(s=>{var m;return e.createElement("div",{className:"hub-calendar-item",key:s.id},e.createElement("span",null,re(String(s.startsAt||"").slice(11,16))||"Any time"),e.createElement("strong",null,s.title),e.createElement("small",null,s.subtitle||s.type," ",(m=s.metadata)!=null&&m.optional?"/ open shift":""))}))),!h&&u.length===0&&e.createElement("p",{className:"hub-empty"},"No calendar items this week.")))}function He({accessToken:t,people:r,currentUserId:n}){const[d,b]=a.useState([]),[h,c]=a.useState(null),[g,u]=a.useState([]),[o,v]=a.useState(""),s=a.useCallback(async()=>{var L;const p=await w("/api/hub/conversations",t);b(p.conversations||[]),!h&&((L=p.conversations)!=null&&L.length)&&c(p.conversations[0])},[t,h]),m=a.useCallback(async p=>{if(!p)return;if(!p.id){const z=await w("/api/hub/conversations",t,{method:"POST",body:JSON.stringify({mode:"general",action:"ensure"})});c(z.thread);return}const L=await w(`/api/hub/conversations?threadId=${encodeURIComponent(p.id)}`,t);u(L.messages||[])},[t]);a.useEffect(()=>{s().catch(()=>{})},[s]),a.useEffect(()=>{m(h).catch(()=>{})},[h,m]);const I=async p=>{const L=await w("/api/hub/conversations",t,{method:"POST",body:JSON.stringify({mode:"dm",targetUserId:p.userId,action:"ensure"})});c(L.thread),await s()},$=async p=>{p.preventDefault();const L=o.trim();if(!L)return;const z=(h==null?void 0:h.objectType)==="hub_dm",U=z?h.objectId.split(":").find(S=>S&&S!==n):void 0;await w("/api/hub/conversations",t,{method:"POST",body:JSON.stringify({mode:z?"dm":"general",targetUserId:U,body:L})}),v(""),await s(),await m(h)};return e.createElement("div",{className:"hub-chat-layout"},e.createElement(A,{title:"Chats",icon:Z},e.createElement("div",{className:"hub-list"},d.map(p=>e.createElement("button",{className:`hub-row hub-row-button ${(h==null?void 0:h.id)===p.id?"is-active":""}`,key:p.id||p.objectId,onClick:()=>c(p)},e.createElement("strong",null,p.title),e.createElement("span",null,p.preview||"No messages yet"," ",p.lastMessageAt?`/ ${pe(p.lastMessageAt)}`:"")))),e.createElement("h3",{className:"hub-subhead"},"Message a person"),e.createElement("div",{className:"hub-list"},r.map(p=>e.createElement("button",{className:"hub-row hub-row-button",key:p.id,onClick:()=>I(p)},e.createElement("strong",null,p.displayName),e.createElement("span",null,p.title||p.accessLevel))))),e.createElement(A,{title:(h==null?void 0:h.title)||"General",icon:Z},e.createElement("div",{className:"hub-message-list"},g.length===0&&e.createElement("p",{className:"hub-empty"},"No messages yet."),g.map(p=>e.createElement("div",{className:"hub-message",key:p.id},e.createElement("strong",null,p.senderRole||"staff"," / ",pe(p.createdAt)),e.createElement("p",null,p.body)))),e.createElement("form",{className:"hub-compose",onSubmit:$},e.createElement("input",{value:o,onChange:p=>v(p.target.value),placeholder:"Write a clear update..."}),e.createElement("button",{type:"submit"},e.createElement(me,{size:13,"aria-hidden":"true"})," Send"))))}function Ve({accessToken:t,docs:r,reloadDocs:n,isPrivileged:d}){var s;const[b,h]=a.useState(((s=r[0])==null?void 0:s.id)||null),[c,g]=a.useState(null),[u,o]=a.useState({title:"",summary:"",body:"",category:"sop",visibility:"staff"});a.useEffect(()=>{b&&w(`/api/hub/docs?id=${encodeURIComponent(b)}`,t).then(m=>g(m.document)).catch(()=>g(null))},[t,b]),a.useEffect(()=>{!b&&r[0]&&h(r[0].id)},[r,b]);const v=async m=>{m.preventDefault();const I=await w("/api/hub/docs",t,{method:"POST",body:JSON.stringify(u)});o({title:"",summary:"",body:"",category:"sop",visibility:"staff"}),await n(),h(I.document.id)};return e.createElement("div",{className:"hub-doc-layout"},e.createElement(A,{title:"Documents",icon:ne},e.createElement("div",{className:"hub-list"},r.length===0&&e.createElement("p",{className:"hub-empty"},"No documents yet."),r.map(m=>e.createElement("button",{className:`hub-row hub-row-button ${b===m.id?"is-active":""}`,key:m.id,onClick:()=>h(m.id)},e.createElement("strong",null,m.title),e.createElement("span",null,m.category," / ",m.visibility))))),e.createElement(A,{title:(c==null?void 0:c.title)||"Document",icon:ne},c?e.createElement("article",{className:"hub-doc-body"},e.createElement("p",{className:"hub-doc-summary"},c.summary),e.createElement("pre",null,c.body)):e.createElement("p",{className:"hub-empty"},"Choose a document.")),d&&e.createElement(A,{title:"Publish Document",icon:ae},e.createElement("form",{className:"hub-form",onSubmit:v},e.createElement(N,{label:"Title"},e.createElement("input",{value:u.title,onChange:m=>o({...u,title:m.target.value}),required:!0})),e.createElement(N,{label:"Summary"},e.createElement("input",{value:u.summary,onChange:m=>o({...u,summary:m.target.value})})),e.createElement(N,{label:"Category"},e.createElement("input",{value:u.category,onChange:m=>o({...u,category:m.target.value})})),e.createElement(N,{label:"Visibility"},e.createElement("select",{value:u.visibility,onChange:m=>o({...u,visibility:m.target.value})},e.createElement("option",{value:"staff"},"Staff"),e.createElement("option",{value:"privileged"},"Privileged"))),e.createElement(N,{label:"Body"},e.createElement("textarea",{value:u.body,onChange:m=>o({...u,body:m.target.value}),rows:8,required:!0})),e.createElement("button",{className:"hub-primary-button",type:"submit"},e.createElement(ae,{size:13})," Publish"))))}function Je({people:t,onMessage:r}){return e.createElement(A,{title:"People",icon:xe},e.createElement("div",{className:"hub-people-grid"},t.map(n=>e.createElement("div",{className:"hub-person",key:n.id},e.createElement("strong",null,n.displayName),e.createElement("span",null,n.title||n.accessLevel),e.createElement("small",null,n.email),e.createElement("button",{onClick:()=>r(n)},e.createElement(Z,{size:13})," Message")))))}function Ge({accessToken:t,isPrivileged:r}){const[n,d]=a.useState(X()),[b,h]=a.useState([]),[c,g]=a.useState({title:"",date:X(),startTime:"09:00",endTime:""}),u=a.useCallback(async()=>{const s=await w(`/api/hub/shifts?from=${n}&to=${le(n,14)}`,t);h(s.shifts||[])},[t,n]);a.useEffect(()=>{u().catch(()=>{})},[u]);const o=async s=>{await w("/api/hub/shifts",t,{method:"POST",body:JSON.stringify({action:"claim",plannerCardId:s.id})}),await u()},v=async s=>{s.preventDefault(),await w("/api/hub/shifts",t,{method:"POST",body:JSON.stringify(c)}),g({title:"",date:X(),startTime:"09:00",endTime:""}),await u()};return e.createElement("div",{className:"hub-grid"},e.createElement(A,{title:"Staff Shifts",icon:de,action:e.createElement("button",{onClick:()=>d(le(n,14))},"Next 2 weeks")},e.createElement("div",{className:"hub-list"},b.map(s=>e.createElement("div",{className:"hub-shift",key:s.id},e.createElement("div",null,e.createElement("strong",null,s.title),e.createElement("span",null,be(s.date)," / ",re(s.startTime)," ",s.endTime?`to ${re(s.endTime)}`:""),e.createElement("small",null,s.people.length?`Assigned: ${s.people.join(", ")}`:"No one assigned yet")),s.open?e.createElement("button",{className:"hub-shift-action",onClick:()=>o(s)},e.createElement(Ne,{size:14})," Pick up"):e.createElement("span",{className:"hub-pill"},"Covered"))))),r&&e.createElement(A,{title:"Add Open Shift",icon:ae},e.createElement("form",{className:"hub-form",onSubmit:v},e.createElement(N,{label:"Shift name"},e.createElement("input",{value:c.title,onChange:s=>g({...c,title:s.target.value}),required:!0})),e.createElement(N,{label:"Date"},e.createElement("input",{type:"date",value:c.date,onChange:s=>g({...c,date:s.target.value}),required:!0})),e.createElement(N,{label:"Start"},e.createElement("input",{type:"time",value:c.startTime,onChange:s=>g({...c,startTime:s.target.value}),required:!0})),e.createElement(N,{label:"End"},e.createElement("input",{type:"time",value:c.endTime,onChange:s=>g({...c,endTime:s.target.value})})),e.createElement("button",{className:"hub-primary-button",type:"submit"},e.createElement(ae,{size:13})," Add shift"))))}function Qe({accessToken:t,reloadDocs:r}){var i,f,P,O;const[n,d]=a.useState({email:"",accessLevel:"staff",displayNameHint:""}),[b,h]=a.useState(null),[c,g]=a.useState({sourceType:"brain_inbox",sourceId:"",title:"",visibility:"staff"}),[u,o]=a.useState(null),[v,s]=a.useState(""),[m,I]=a.useState(""),[$,p]=a.useState(!1),[L,z]=a.useState(null),[U,S]=a.useState("Loading activity..."),[q,F]=a.useState(null),[B,_]=a.useState("Loading orders..."),R=async l=>{l.preventDefault();const E=await w("/api/hub/invites",t,{method:"POST",body:JSON.stringify(n)});h(E.invite)},y=async l=>{l.preventDefault(),await w("/api/hub/brain-publish",t,{method:"POST",body:JSON.stringify(c)}),g({sourceType:"brain_inbox",sourceId:"",title:"",visibility:"staff"}),await r()},k=async()=>{I(""),p(!0);try{const l=await w("/api/hub/localist-window",t,{method:"POST",body:JSON.stringify({action:"create",hoursValid:48})});o(l.window),s(`Local Effort Localist menu is live for 48 hours: ${l.window.url} Reply STOP to opt out.`),I("Link ready."),T().catch(()=>{})}catch(l){I(l.message||"Unable to create link.")}finally{p(!1)}},C=async()=>{var l,E,M,H,ie;if(u!=null&&u.url){I("Sending SMS through Brevo..."),p(!0);try{const K=new URL(u.url,window.location.origin).searchParams.get("localist");if(!K)throw new Error("Localist token missing from generated link.");const D=await w("/api/hub/localist-window",t,{method:"POST",body:JSON.stringify({action:"sendSms",token:K,message:v})});o(D.window);const ee=(l=D.brevo)!=null&&l.status?` Brevo status: ${D.brevo.status}.`:"",ge=Number((M=(E=D.brevo)==null?void 0:E.statistics)==null?void 0:M.sent),Ie=Number.isFinite(ge)?` Sent count: ${ge}.`:"";I(`SMS submitted to Brevo as campaign ${((H=D.brevo)==null?void 0:H.campaignId)||((ie=D.window)==null?void 0:ie.smsCampaignId)||""}.${ee}${Ie}`.trim()),T().catch(()=>{})}catch(K){I(K.message||"Unable to send SMS.")}finally{p(!1)}}},j=async()=>{var l;I("Checking SMS setup..."),p(!0);try{const M=(await w("/api/hub/localist-window",t,{method:"POST",body:JSON.stringify({action:"smsStatus"})})).sms||{};if(M.ready)I(`SMS setup ready. Sender: ${M.sender}. Brevo list IDs: ${(M.listIds||[]).join(", ")}.`);else{const H=[M.hasApiKey?null:"BREVO_API_KEY",(l=M.listIds)!=null&&l.length?null:"BREVO_LOCALIST_LIST_ID",M.sender?null:"BREVO_LOCALIST_SMS_SENDER"].filter(Boolean).join(", ");I(`SMS setup is incomplete. Missing: ${H||"unknown config"}.`)}}catch(E){I(E.message||"Unable to check SMS setup.")}finally{p(!1)}},J=async()=>{!(u!=null&&u.url)||!navigator.clipboard||(await navigator.clipboard.writeText(u.url),I("Link copied."))},T=a.useCallback(async()=>{S("Loading activity...");try{const l=await w("/api/hub/localist-activity?limit=8",t);z(l.windows||[]),S("")}catch(l){z([]),S(l.message||"Unable to load Localist activity.")}},[t]),G=a.useCallback(async()=>{_("Loading orders...");try{const l=await w("/api/hub/localist-orders?hours=168&limit=50",t);F(l),_("")}catch(l){F({orders:[],summary:{}}),_(l.message||"Unable to load Localist orders.")}},[t]);a.useEffect(()=>{T().catch(()=>{})},[T]),a.useEffect(()=>{G().catch(()=>{})},[G]);const W=l=>`${Math.round((Number(l)||0)*100)}%`,x=l=>l?new Date(l).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"Not yet";return e.createElement("div",{className:"hub-grid"},e.createElement(A,{title:"Invite User",icon:fe},e.createElement("form",{className:"hub-form",onSubmit:R},e.createElement(N,{label:"Email"},e.createElement("input",{type:"email",value:n.email,onChange:l=>d({...n,email:l.target.value}),required:!0})),e.createElement(N,{label:"Access"},e.createElement("select",{value:n.accessLevel,onChange:l=>d({...n,accessLevel:l.target.value})},e.createElement("option",{value:"staff"},"Staff"),e.createElement("option",{value:"privileged"},"Privileged"))),e.createElement(N,{label:"Name hint"},e.createElement("input",{value:n.displayNameHint,onChange:l=>d({...n,displayNameHint:l.target.value})})),e.createElement("button",{className:"hub-primary-button",type:"submit"},e.createElement(fe,{size:13})," Create invite")),b&&e.createElement("div",{className:"hub-copy-box"},e.createElement("strong",null,"Invite link"),e.createElement("input",{readOnly:!0,value:b.url||"",onFocus:l=>l.target.select()}))),e.createElement(A,{title:"Send Brain to Hub",icon:Oe},e.createElement("form",{className:"hub-form",onSubmit:y},e.createElement(N,{label:"Source"},e.createElement("select",{value:c.sourceType,onChange:l=>g({...c,sourceType:l.target.value})},e.createElement("option",{value:"brain_inbox"},"Brain inbox item"),e.createElement("option",{value:"brain_entity"},"Brain entity"))),e.createElement(N,{label:"Source ID"},e.createElement("input",{value:c.sourceId,onChange:l=>g({...c,sourceId:l.target.value}),required:!0})),e.createElement(N,{label:"Hub title"},e.createElement("input",{value:c.title,onChange:l=>g({...c,title:l.target.value})})),e.createElement(N,{label:"Visibility"},e.createElement("select",{value:c.visibility,onChange:l=>g({...c,visibility:l.target.value})},e.createElement("option",{value:"staff"},"Staff"),e.createElement("option",{value:"privileged"},"Privileged"))),e.createElement("button",{className:"hub-primary-button",type:"submit"},e.createElement(ne,{size:13})," Publish as doc"))),e.createElement(A,{title:"Localist Window",icon:he},e.createElement("div",{className:"hub-form"},e.createElement("div",{className:"hub-button-row"},e.createElement("button",{type:"button",onClick:k,disabled:$},e.createElement(ae,{size:13})," Generate link"),e.createElement("button",{type:"button",onClick:C,disabled:$||!(u!=null&&u.url)},e.createElement(me,{size:13})," Send SMS"),e.createElement("button",{type:"button",onClick:j,disabled:$},e.createElement(Y,{size:13})," Check SMS")),(u==null?void 0:u.url)&&e.createElement(e.Fragment,null,e.createElement(N,{label:"Link"},e.createElement("input",{readOnly:!0,value:u.url,onFocus:l=>l.target.select()})),e.createElement(N,{label:"Message"},e.createElement("textarea",{rows:4,value:v,onChange:l=>s(l.target.value)})),e.createElement("div",{className:"hub-button-row"},e.createElement("button",{type:"button",onClick:J},e.createElement(De,{size:13})," Copy link"),u.smsSentAt&&e.createElement("span",{className:"hub-pill"},"Sent"))),m&&e.createElement("p",{className:"hub-empty"},m))),e.createElement(A,{title:"Localist Activity",icon:de,action:e.createElement("button",{type:"button",onClick:T},e.createElement(Y,{size:13}))},U&&e.createElement("p",{className:"hub-empty"},U),L&&L.length===0&&!U&&e.createElement("p",{className:"hub-empty"},"No Localist activity has been recorded yet."),e.createElement("div",{className:"hub-localist-analytics"},(L||[]).map(l=>{const E=l.metrics||{};return e.createElement("article",{className:"hub-localist-window-card",key:l.id},e.createElement("div",{className:"hub-localist-window-head"},e.createElement("div",null,e.createElement("strong",null,l.valid?"Active window":"Closed window"),e.createElement("span",null,"Expires ",x(l.expiresAt))),l.smsCampaignId&&e.createElement("span",{className:"hub-pill"},"Brevo ",l.smsCampaignId)),e.createElement("div",{className:"hub-metric-grid"},e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Visitors"),e.createElement("strong",null,E.uniqueVisitors||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Shared visitors"),e.createElement("strong",null,E.sharedVisitors||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Shares"),e.createElement("strong",null,E.shareEvents||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Share rate"),e.createElement("strong",null,W(E.shareRate))),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Carts"),e.createElement("strong",null,E.cartsStarted||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Abandoned"),e.createElement("strong",null,E.abandonedCarts||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Checkout starts"),e.createElement("strong",null,E.checkoutStarts||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Paid"),e.createElement("strong",null,E.checkoutSuccesses||0))),e.createElement("small",null,"Last activity ",x(E.lastActivityAt),l.smsSentAt?` / SMS sent ${x(l.smsSentAt)}`:""))}))),e.createElement(A,{title:"Localist Orders",icon:Se,action:e.createElement("button",{type:"button",onClick:G},e.createElement(Y,{size:13}))},B&&e.createElement("p",{className:"hub-empty"},B),q&&e.createElement("div",{className:"hub-localist-analytics"},e.createElement("div",{className:"hub-metric-grid"},e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Paid"),e.createElement("strong",null,((i=q.summary)==null?void 0:i.paidCount)||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Paid total"),e.createElement("strong",null,ue(((f=q.summary)==null?void 0:f.paidTotalCents)||0))),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"Pending"),e.createElement("strong",null,((P=q.summary)==null?void 0:P.pendingCount)||0)),e.createElement("div",{className:"hub-metric"},e.createElement("span",null,"All orders"),e.createElement("strong",null,((O=q.summary)==null?void 0:O.orderCount)||0))),(q.orders||[]).length===0&&!B&&e.createElement("p",{className:"hub-empty"},"No Localist orders have been recorded yet."),(q.orders||[]).map(l=>e.createElement("article",{className:"hub-localist-window-card",key:l.id},e.createElement("div",{className:"hub-localist-window-head"},e.createElement("div",null,e.createElement("strong",null,l.customerName),e.createElement("span",null,l.status," / ",ue(l.totalCents),l.paidAt?` / paid ${x(l.paidAt)}`:` / started ${x(l.checkoutStartedAt)}`)),e.createElement("span",{className:"hub-pill"},l.pickupWindow)),e.createElement("div",{className:"hub-localist-order-detail"},l.customerEmail&&e.createElement("span",null,"Email: ",l.customerEmail),l.customerPhone&&e.createElement("span",null,"Phone: ",l.customerPhone),l.customerNote&&e.createElement("span",null,"Notes/allergies: ",l.customerNote),l.squareOrderId&&e.createElement("span",null,"Square order: ",l.squareOrderId),l.squareReceiptUrl&&e.createElement("span",null,"Square receipt: ",l.squareReceiptUrl),l.brainInboxItemId&&e.createElement("span",null,"Brain inbox: ",l.brainInboxItemId)),e.createElement("div",{className:"hub-localist-order-items"},(l.items||[]).map(E=>{var M;return e.createElement("span",{key:`${l.id}-${E.id}`},E.quantity,"x ",E.name,(M=E.customerOptions)!=null&&M.length?` (${E.customerOptions.join(", ")})`:"")})))))))}function ue(t){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format((Number(t)||0)/100)}function Ye(t){const r=String(t||"").trim();if(!r)return null;const n=r.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);if(!n)return null;const d=Number(n[1]);return Number.isFinite(d)&&d>0?Math.round(d*100):null}function Ke(t){return String(t||"").replace(/\D/g,"").slice(0,10)}function ye(t){const r=Ke(t);return r.length<=3?r:r.length<=6?`(${r.slice(0,3)}) ${r.slice(3)}`:`(${r.slice(0,3)}) ${r.slice(3,6)}-${r.slice(6)}`}function Ce(){const[t,r]=a.useState(null),[n,d]=a.useState(null),[b,h]=a.useState({}),[c,g]=a.useState(""),[u,o]=a.useState(""),[v,s]=a.useState(""),[m,I]=a.useState(""),[$,p]=a.useState({}),[L,z]=a.useState(""),[U,S]=a.useState(()=>new URLSearchParams(window.location.search).get("checkout")==="localist-success"?"success":"idle"),[q,F]=a.useState(""),B=a.useRef(!1);a.useEffect(()=>{w("/api/hub/localist-menu").then(i=>{var f;d(i.content||null),r(i.items||[]),te("localist.menu.loaded",{metadata:{itemCount:((f=i.items)==null?void 0:f.length)||0}})}).catch(()=>{d(null),r([])})},[]);const _=a.useMemo(()=>(t||[]).map(i=>{const f=Number(i.priceCents),P=Number.isFinite(f)&&f>0?Math.round(f):Ye(i.price);return{...i,priceCents:P}}),[t]),R=a.useMemo(()=>_.map(i=>({...i,quantity:Number(b[i._id])||0,customerOptions:$[i._id]||{}})).filter(i=>i.quantity>0),[_,b,$]),y=R.reduce((i,f)=>i+(f.priceCents||0)*f.quantity,0),k=R.reduce((i,f)=>i+f.quantity,0),C=U==="loading",j=k>0&&y>0&&c.trim()&&v&&!C,J=a.useMemo(()=>({totalQuantity:k,totalCents:y,items:R.map(i=>({id:i._id,name:i.name,quantity:i.quantity,priceCents:i.priceCents||0,customerOptions:i.customerOptions}))}),[R,y,k]);a.useEffect(()=>{if(k<=0)return;const i=window.setTimeout(()=>{te("localist.cart.updated",{cart:J})},600);return()=>window.clearTimeout(i)},[J,k]),a.useEffect(()=>{U!=="success"||B.current||(B.current=!0,te("localist.checkout.success",{metadata:{returnedFromSquare:!0}}))},[U]);const T=(i,f)=>{const P=_.find(M=>M._id===i),O=Number(P==null?void 0:P.inventoryCount),l=Number.isFinite(O)&&O>=0?Math.min(20,Math.round(O)):20,E=Math.max(0,Math.min(Number(f)||0,l));h(M=>{const H={...M};return E?H[i]=E:delete H[i],H})},G=(i,f,P)=>{p(O=>{const l={...O[i]||{}};return P?l[f]=!0:delete l[f],{...O,[i]:l}})},W=async()=>{const{localistToken:i}=oe();if(!i)return;const f=new URL(window.location.href);f.searchParams.set("localist",i),f.searchParams.set("shared","1"),f.searchParams.delete("checkout");const P=f.toString();let O="clipboard";try{navigator.share?(O="web_share",await navigator.share({title:"Local Effort Localist menu",url:P})):navigator.clipboard?await navigator.clipboard.writeText(P):window.prompt("Copy Localist link",P),te("localist.link.shared",{shareMethod:O}),z(O==="web_share"?"Share opened.":"Shared link copied.")}catch{z("")}},x=async i=>{if(i.preventDefault(),!!j){S("loading"),F("");try{const f=new URLSearchParams(window.location.search),P=ke(),O=oe();te("localist.checkout.started",{cart:J});const l=await w("/api/hub/localist-checkout",null,{method:"POST",body:JSON.stringify({name:c,phone:ye(u),pickupWindow:v,note:m,localistToken:f.get("localist")||"",visitorId:P.visitorId,sessionId:P.sessionId,entrySource:O.entrySource,items:R.map(E=>({id:E._id,quantity:E.quantity,customerOptions:E.customerOptions}))})});if(!l.url)throw new Error("Square did not return a checkout link.");window.location.href=l.url}catch(f){F(f.message||"Unable to start checkout."),S("idle")}}};return U==="success"?e.createElement(e.Fragment,null,e.createElement(A,{title:"Payment Received",icon:Ne},e.createElement("p",{className:"hub-empty",style:{color:"var(--hub-accent)",fontSize:20}},"Thanks",c?`, ${c}`:"","! Square has processed your Localist checkout."),e.createElement("button",{className:"hub-primary-button",style:{marginTop:16},type:"button",onClick:()=>{S("idle"),h({}),g(""),o(""),s(""),I(""),p({})}},"Place another order")),e.createElement(ve,null)):e.createElement(e.Fragment,null,e.createElement(A,{title:"Place an Order",icon:he},n&&e.createElement("section",{className:"hub-localist-intro"},n.eyebrow&&e.createElement("small",null,n.eyebrow),n.headline&&e.createElement("h3",null,n.headline),n.body&&e.createElement("p",null,n.body),n.note&&e.createElement("span",null,n.note)),oe().localistToken&&e.createElement("div",{className:"hub-localist-share"},e.createElement("button",{type:"button",onClick:W},e.createElement(me,{size:13})," Share menu"),L&&e.createElement("span",null,L)),t===null&&e.createElement("p",{className:"hub-empty"},"Loading menu..."),t!==null&&t.length===0&&e.createElement("p",{className:"hub-empty"},"No items available."),t!==null&&t.length>0&&e.createElement("form",{className:"hub-form hub-localist-form",onSubmit:x},e.createElement("div",{className:"hub-localist-list"},_.map(i=>{const f=Number(b[i._id])||0,P=Number(i.inventoryCount),O=Number.isFinite(P)&&P>=0,l=O?Math.round(P):null,E=l===0,M=O?Math.min(20,l):20,H=!i.priceCents||E,ie=$[i._id]||{},K=Re.filter(([D])=>{var ee;return(ee=i.dietaryFlags)==null?void 0:ee[D]}).map(([,D])=>D);return e.createElement("div",{key:i._id,className:`hub-row hub-localist-item${E?" is-sold-out":""}`},e.createElement("div",{className:"hub-localist-item-copy"},e.createElement("strong",null,i.name,e.createElement("span",{className:"hub-localist-price"},i.price||(i.priceCents?ue(i.priceCents):"No checkout price"))),O&&e.createElement("span",{className:`hub-localist-inventory${E?" is-sold-out":""}`},l," available",E?" - sold out":""),i.description&&e.createElement("span",null,i.description),K.length>0&&e.createElement("div",{className:"hub-localist-flags"},K.map(D=>e.createElement("span",{key:D},D))),e.createElement("div",{className:"hub-localist-options","aria-label":`${i.name} dietary options`},Me.map(D=>e.createElement("label",{key:D.key,className:"hub-localist-option"},e.createElement("input",{type:"checkbox",checked:ie[D.key]===!0,onChange:ee=>G(i._id,D.key,ee.target.checked)}),e.createElement("span",null,D.label))))),e.createElement("div",{className:"hub-localist-quantity","aria-label":`${i.name} quantity`},e.createElement("button",{type:"button",onClick:()=>T(i._id,f-1),disabled:f===0,"aria-label":`Remove ${i.name}`},e.createElement(Ue,{size:13})),e.createElement("input",{value:f,inputMode:"numeric","aria-label":`${i.name} quantity`,onChange:D=>T(i._id,Number(D.target.value)),disabled:H}),e.createElement("button",{type:"button",onClick:()=>T(i._id,f+1),disabled:H||f>=M,"aria-label":`Add ${i.name}`},e.createElement(ae,{size:13}))))})),e.createElement(N,{label:"Your name"},e.createElement("input",{value:c,onChange:i=>g(i.target.value),autoComplete:"name",required:!0})),e.createElement(N,{label:"Phone (optional)"},e.createElement("input",{value:ye(u),onChange:i=>o(i.target.value),inputMode:"numeric",autoComplete:"tel"})),e.createElement(N,{label:"Pickup window"},e.createElement("select",{value:v,onChange:i=>s(i.target.value),required:!0},e.createElement("option",{value:""},"Select pickup window"),qe.map(i=>e.createElement("option",{key:i,value:i},i)))),e.createElement(N,{label:"Notes (optional)"},e.createElement("input",{value:m,onChange:i=>I(i.target.value),placeholder:"Allergies, delivery instructions..."})),e.createElement("div",{className:"hub-localist-checkout"},e.createElement("div",null,e.createElement("span",null,"Total"),e.createElement("strong",null,ue(y)),e.createElement("small",null,k?`${k} item${k===1?"":"s"}`:"Choose items above")),e.createElement("button",{className:"hub-primary-button",type:"submit",disabled:!j},e.createElement(Se,{size:13})," ",C?"Opening Square...":"Checkout with Square")),q&&e.createElement("p",{className:"hub-error"},q))),e.createElement(ve,null))}const Xe=["image/gif","image/png","image/jpeg","image/webp"],Ze=1*1024*1024,We=/(https?:\/\/[^\s<]+)/gi;function et(t){try{const r=new URL(t),n=r.hostname.toLowerCase(),d=r.href.toLowerCase();return!(/\.(gif|png|jpe?g|webp)(\?|#|$)/.test(d)||d.startsWith("data:image/"))&&(n.includes("giphy.com")||n.includes("tenor.com"))}catch{return!1}}function tt({text:t}){if(!t)return null;const r=String(t).split(We);return e.createElement("p",null,r.map((n,d)=>/^https?:\/\//i.test(n)?e.createElement("a",{href:n,target:"_blank",rel:"noreferrer",key:`${n}-${d}`},n):n))}function ve(){const[t,r]=a.useState([]),[n,d]=a.useState(()=>typeof window>"u"?"":window.localStorage.getItem("le:localistChatName")||""),[b,h]=a.useState(()=>typeof window>"u"?"":window.localStorage.getItem("le:localistChatName")||""),[c,g]=a.useState(()=>typeof window>"u"?!1:!!window.localStorage.getItem("le:localistChatName")),[u,o]=a.useState(""),[v,s]=a.useState(""),[m,I]=a.useState(null),[$,p]=a.useState(!1),[L,z]=a.useState(""),U=a.useRef(null),S=a.useCallback(async()=>{const y=await w("/api/hub/localist-chat");r(y.messages||[])},[]);a.useEffect(()=>{S().catch(()=>{});const y=window.setInterval(()=>S().catch(()=>{}),1e4);return()=>window.clearInterval(y)},[S]);const q=y=>{y.preventDefault();const k=b.trim();k&&(d(k),g(!0),z(""),typeof window<"u"&&window.localStorage.setItem("le:localistChatName",k))},F=()=>{g(!1),h(n)},B=y=>{var j;const k=(j=y.target.files)==null?void 0:j[0];if(!k)return;if(z(""),!Xe.includes(k.type)){z("Upload a GIF, PNG, JPG, or WebP image."),y.target.value="";return}if(k.size>Ze){z("Upload must be 1 MB or smaller."),y.target.value="";return}const C=new FileReader;C.onload=()=>{I({dataUrl:String(C.result||""),name:k.name,mimeType:k.type})},C.onerror=()=>z("Unable to read that upload."),C.readAsDataURL(k),y.target.value=""},_=()=>{I(null),U.current&&(U.current.value="")},R=async y=>{y.preventDefault();const k=n.trim(),C=u.trim(),j=v.trim();if(!(!c||!k||!C&&!j&&!m)){p(!0),z("");try{await w("/api/hub/localist-chat",null,{method:"POST",body:JSON.stringify({senderName:k,body:C,imageUrl:j,imageUpload:m})}),o(""),s(""),_(),await S()}catch(J){z(J.message||"Unable to send message.")}finally{p(!1)}}};return e.createElement(A,{title:"Localist Chat",icon:Z},e.createElement("div",{className:"hub-message-list hub-localist-chat-list"},t.length===0&&e.createElement("p",{className:"hub-empty"},"No messages yet."),t.map(y=>{var k;return e.createElement("div",{className:"hub-message",key:y.id},e.createElement("strong",null,y.senderName||"Guest"," / ",pe(y.createdAt)),e.createElement(tt,{text:y.body}),(k=y.attachments)==null?void 0:k.map(C=>C.type==="image"&&C.url?et(C.url)?e.createElement("div",{className:"hub-message-attachment",key:C.url},e.createElement("iframe",{src:C.url,title:"GIF",loading:"lazy"}),e.createElement("a",{className:"hub-message-attachment-source",href:C.url,target:"_blank",rel:"noreferrer"},"Open GIF")):e.createElement("a",{className:"hub-message-attachment",href:C.url,target:"_blank",rel:"noreferrer",key:C.url},e.createElement("img",{src:C.url,alt:C.name||"",loading:"lazy"})):null))})),c?e.createElement("form",{className:"hub-form hub-localist-chat-form",onSubmit:R},e.createElement("div",{className:"hub-localist-chat-identity"},e.createElement("span",null,n),e.createElement("button",{type:"button",onClick:F},"Change")),e.createElement(N,{label:"Message"},e.createElement("textarea",{value:u,onChange:y=>o(y.target.value),placeholder:"Ask a question or share an update...",rows:2})),e.createElement(N,{label:"Image/GIF link"},e.createElement("input",{value:v,onChange:y=>s(y.target.value),placeholder:"https://...",inputMode:"url",autoComplete:"url"})),e.createElement("div",{className:"hub-localist-chat-upload"},e.createElement("input",{ref:U,type:"file",accept:"image/gif,image/png,image/jpeg,image/webp",onChange:B}),e.createElement("button",{type:"button",onClick:()=>{var y;return(y=U.current)==null?void 0:y.click()}},e.createElement($e,{size:13})," Upload"),m&&e.createElement("div",{className:"hub-localist-upload-preview"},e.createElement("img",{src:m.dataUrl,alt:""}),e.createElement("span",null,m.name),e.createElement("button",{type:"button",onClick:_,"aria-label":"Remove upload"},e.createElement(Pe,{size:13})))),e.createElement("button",{className:"hub-primary-button",type:"submit",disabled:$||!u.trim()&&!v.trim()&&!m},e.createElement(me,{size:13})," ",$?"Sending...":"Send"),L&&e.createElement("p",{className:"hub-error"},L)):e.createElement("form",{className:"hub-form hub-localist-chat-join",onSubmit:q},e.createElement(N,{label:"Name"},e.createElement("input",{value:b,onChange:y=>h(y.target.value),autoComplete:"name",required:!0})),e.createElement("button",{className:"hub-primary-button",type:"submit",disabled:!b.trim()},e.createElement(Z,{size:13})," Join chat"),L&&e.createElement("p",{className:"hub-error"},L)))}function at(){return e.createElement(e.Fragment,null,e.createElement("style",null,Q),e.createElement("main",{className:"hub-auth-screen"},e.createElement("section",{className:"hub-auth-card"},e.createElement("div",{className:"hub-brand"},e.createElement(ce,{size:24}),e.createElement("div",null,e.createElement("h1",null,"This menu has closed"),e.createElement("p",null,"The Localist link is no longer live."))))))}function nt({localistWindow:t}){const r=t!=null&&t.expiresAt?new Date(t.expiresAt).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"",n=a.useRef(!1);return a.useEffect(()=>{n.current||(n.current=!0,te("localist.window.viewed",{metadata:{windowId:(t==null?void 0:t.id)||"",expiresAt:(t==null?void 0:t.expiresAt)||""}}))},[t]),e.createElement("div",{className:"hub-app hub-app-guest"},e.createElement("style",null,Q),e.createElement("main",{className:"hub-main"},e.createElement("header",{className:"hub-topbar"},e.createElement("div",null,e.createElement("h1",null,"Localist"),e.createElement("p",null,r?`Open until ${r}`:"Localist view"))),e.createElement("div",{className:"hub-guest-content"},e.createElement(Ce,null))))}function yt(){var G,W;const t=ze(),r=new URLSearchParams(window.location.search).get("invite")||"",n=new URLSearchParams(window.location.search).get("localist")||"",[d,b]=a.useState(null),[h,c]=a.useState(!1),[g,u]=a.useState({loaded:!n,window:null}),[o,v]=a.useState("today"),[s,m]=a.useState([]),[I,$]=a.useState([]),[p,L]=a.useState([]),[z,U]=a.useState([]),[S,q]=a.useState([]);a.useEffect(()=>{let x=document.querySelector('meta[name="robots"]');return x||(x=document.createElement("meta"),x.setAttribute("name","robots"),document.head.appendChild(x)),x.setAttribute("content","noindex, nofollow"),()=>{x.setAttribute("content","")}},[]),a.useEffect(()=>{n&&(u({loaded:!1,window:null}),w(`/api/hub/localist-window?token=${encodeURIComponent(n)}`).then(x=>u({loaded:!0,window:x.window||null})).catch(()=>u({loaded:!0,window:null})))},[n]);const F=a.useCallback(async()=>{if(t.accessToken){c(!1);try{const x=await w("/api/hub/profile",t.accessToken);b(x.profile||null)}finally{c(!0)}}},[t.accessToken]),B=a.useCallback(async()=>{const x=await w("/api/hub/docs",t.accessToken);$(x.documents||[])},[t.accessToken]),_=a.useCallback(async()=>{if(!t.accessToken||!d)return;const x=X(),[i,f,P,O,l]=await Promise.all([w("/api/hub/people",t.accessToken),w("/api/hub/docs",t.accessToken),w(`/api/hub/calendar?view=week&date=${x}`,t.accessToken),w("/api/hub/conversations",t.accessToken),w(`/api/hub/shifts?from=${x}&to=${le(x,14)}`,t.accessToken)]);m(i.people||[]),$(f.documents||[]),L(P.objects||[]),U(O.conversations||[]),q(l.shifts||[])},[t.accessToken,d]);a.useEffect(()=>{F().catch(()=>c(!0))},[F]),a.useEffect(()=>{_().catch(()=>{})},[_]);const R=!!d&&(d.accessLevel==="privileged"||d.isPrivileged||t.isAdmin),y=!!d&&d.accessLevel==="localist",k={id:"admin",label:"Admin",icon:ce},C={id:"localist",label:"Localist",icon:he},j=y?[C]:R?[...V,k,C]:[...V,C],J=y?[C]:R?[V[0],V[1],V[3],V[5],k,C]:[V[0],V[1],V[2],V[3],V[5],C],T=y?"localist":o;return n?g.loaded?(G=g.window)!=null&&G.valid?e.createElement(nt,{localistWindow:g.window}):e.createElement(at,null):e.createElement(e.Fragment,null,e.createElement("style",null,Q),e.createElement("main",{className:"hub-auth-screen"},e.createElement(Y,{className:"animate-spin",size:36}))):t.loading?e.createElement(e.Fragment,null,e.createElement("style",null,Q),e.createElement("main",{className:"hub-auth-screen"},e.createElement(Y,{className:"animate-spin",size:36}))):t.user?h&&!d?e.createElement(e.Fragment,null,e.createElement("style",null,Q),e.createElement(je,{accessToken:t.accessToken,inviteToken:r,onDone:F})):h?e.createElement("div",{className:"hub-app"},e.createElement("style",null,Q),e.createElement("aside",{className:"hub-sidebar"},e.createElement("div",{className:"hub-logo"},e.createElement(ce,{size:18}),e.createElement("div",null,e.createElement("strong",null,"Hub"),e.createElement("span",null,d.displayName))),e.createElement("nav",null,j.map(({id:x,label:i,icon:f})=>e.createElement("button",{key:x,className:T===x?"is-active":"",onClick:()=>v(x)},e.createElement(f,{size:15,"aria-hidden":"true"}),i))),e.createElement("button",{className:"hub-signout",onClick:t.signOut},e.createElement(Te,{size:13})," Sign out")),e.createElement("main",{className:"hub-main"},e.createElement("header",{className:"hub-topbar"},e.createElement("div",null,e.createElement("h1",null,((W=j.find(x=>x.id===T))==null?void 0:W.label)||"Hub"),e.createElement("p",null,y?"Localist view":R?"Privileged view":"Staff view")),e.createElement("button",{onClick:_},e.createElement(Y,{size:13})," Refresh")),T==="today"&&e.createElement(Fe,{calendar:p,docs:I,conversations:z,shifts:S,setTab:v}),T==="calendar"&&e.createElement(Be,{accessToken:t.accessToken}),T==="chat"&&e.createElement(He,{accessToken:t.accessToken,people:s,currentUserId:d.userId}),T==="docs"&&e.createElement(Ve,{accessToken:t.accessToken,docs:I,reloadDocs:B,isPrivileged:R}),T==="people"&&e.createElement(Je,{people:s,onMessage:()=>v("chat")}),T==="shifts"&&e.createElement(Ge,{accessToken:t.accessToken,isPrivileged:R}),T==="admin"&&R&&e.createElement(Qe,{accessToken:t.accessToken,reloadDocs:B}),T==="localist"&&e.createElement(Ce,null)),e.createElement("nav",{className:"hub-mobile-nav"},J.map(({id:x,label:i,icon:f})=>e.createElement("button",{key:x,className:T===x?"is-active":"",onClick:()=>v(x)},e.createElement(f,{size:18}),e.createElement("span",null,i))))):e.createElement(e.Fragment,null,e.createElement("style",null,Q),e.createElement("main",{className:"hub-auth-screen"},e.createElement(Y,{className:"animate-spin",size:36}))):e.createElement(e.Fragment,null,e.createElement("style",null,Q),e.createElement(_e,{auth:t,inviteToken:r}))}const Q=`
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
  .hub-grid, .hub-chat-layout, .hub-doc-layout { grid-template-columns: 1fr; }
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
    grid-template-columns: repeat(6, 1fr);
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
`;export{yt as default};
