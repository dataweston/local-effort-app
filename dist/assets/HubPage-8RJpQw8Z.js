import{x as X,F as Y,r as i,R as e}from"./index-C2rNgJwe.js";import{R as $}from"./refresh-cw-BpUy2hV6.js";import{S as M,C as V,U as W}from"./users-round-BwTmnj5W.js";import{H as _}from"./house-C-egWb1B.js";import{M as P,C as R}from"./message-square-Cl7dMCeX.js";import{F as O}from"./file-text-BaLeSeUa.js";import{L as Z,I as ee}from"./log-out-CZT58lCE.js";import{L as te}from"./log-in-DDLEtKSU.js";import{S as ae}from"./send-CNNH0nMc.js";import{P as H}from"./plus-CT7zAia4.js";import{C as ne}from"./circle-check-DTwPN1qx.js";/**
 * @license lucide-react v0.451.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=X("UserPlus",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]),F=[{id:"today",label:"Today",icon:_},{id:"calendar",label:"Calendar",icon:V},{id:"chat",label:"Chat",icon:P},{id:"docs",label:"Docs",icon:O},{id:"people",label:"People",icon:W},{id:"shifts",label:"Shifts",icon:R}];function k(){return new Date().toISOString().slice(0,10)}function A(t,s){const a=new Date(`${t}T00:00:00`);return a.setDate(a.getDate()+s),a.toISOString().slice(0,10)}function q(t){return t?new Date(`${String(t).slice(0,10)}T00:00:00`).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}):""}function L(t){if(!t)return"";const[s,a]=String(t).split(":"),h=new Date;return h.setHours(Number(s),Number(a||0),0,0),h.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}function J(t){if(!t)return"";const s=Date.now()-new Date(t).getTime(),a=Math.max(0,Math.floor(s/6e4));if(a<2)return"now";if(a<60)return`${a}m`;const h=Math.floor(a/60);return h<24?`${h}h`:`${Math.floor(h/24)}d`}async function g(t,s,a={}){const b=await fetch(`${t}`,{...a,headers:{...a.body?{"Content-Type":"application/json"}:{},...s?{Authorization:`Bearer ${s}`}:{},...a.headers||{}}}),u=await b.json().catch(()=>({}));if(!b.ok)throw new Error(u.error||"Request failed");return u}function v({title:t,icon:s,action:a,children:h}){return e.createElement("section",{className:"hub-panel"},e.createElement("div",{className:"hub-panel-head"},e.createElement("div",{className:"hub-panel-title"},s&&e.createElement(s,{size:22,"aria-hidden":"true"}),e.createElement("h2",null,t)),a),h)}function E({label:t,children:s}){return e.createElement("label",{className:"hub-field"},e.createElement("span",null,t),s)}function ie({auth:t,inviteToken:s}){const[a,h]=i.useState(s?"signup":"signin"),[b,u]=i.useState(null),[n,d]=i.useState(""),[p,r]=i.useState(""),[c,l]=i.useState(""),[o,N]=i.useState(""),[C,m]=i.useState(""),[x,w]=i.useState(!1);i.useEffect(()=>{s&&g(`/api/hub/profile?invite=${encodeURIComponent(s)}`).then(y=>{u(y.invite),d(y.invite.email||""),l(y.invite.displayNameHint||"")}).catch(y=>m(y.message))},[s]);const S=async y=>{y.preventDefault(),m(""),w(!0);try{a==="signup"?(await t.signUpWithEmail(n,p,{display_name:c}),await t.signInWithEmail(n,p)):await t.signInWithEmail(n,p)}catch(z){m(z.message||"Unable to sign in")}finally{w(!1)}};return e.createElement("main",{className:"hub-auth-screen"},e.createElement("div",{className:"hub-auth-card"},e.createElement("div",{className:"hub-brand"},e.createElement(M,{size:42,"aria-hidden":"true"}),e.createElement("div",null,e.createElement("h1",null,"Local Effort Hub"),e.createElement("p",null,"Staff calendar, messages, documents, and shift pickup."))),b&&e.createElement("div",{className:"hub-notice"},"Invite for ",b.email,". Access: ",b.accessLevel,"."),e.createElement("form",{onSubmit:S,className:"hub-form"},e.createElement(E,{label:"Email"},e.createElement("input",{type:"email",value:n,onChange:y=>d(y.target.value),autoComplete:"email",required:!0})),e.createElement(E,{label:"Password"},e.createElement("input",{type:"password",value:p,onChange:y=>r(y.target.value),autoComplete:a==="signup"?"new-password":"current-password",minLength:8,required:!0})),a==="signup"&&e.createElement(e.Fragment,null,e.createElement(E,{label:"Display name"},e.createElement("input",{value:c,onChange:y=>l(y.target.value),required:!0})),e.createElement(E,{label:"Role or title"},e.createElement("input",{value:o,onChange:y=>N(y.target.value)}))),C&&e.createElement("p",{className:"hub-error"},C),e.createElement("button",{className:"hub-primary-button",type:"submit",disabled:x},e.createElement(te,{size:20,"aria-hidden":"true"}),x?"Working...":a==="signup"?"Create profile":"Sign in")),e.createElement("button",{className:"hub-text-button",type:"button",onClick:()=>h(a==="signup"?"signin":"signup")},a==="signup"?"I already have a Hub account":"I have an invite and need a profile"),e.createElement("p",{className:"hub-help"},"Use email and password. Invite links control who can create staff or privileged profiles.")))}function le({accessToken:t,inviteToken:s,onDone:a}){const[h,b]=i.useState(null),[u,n]=i.useState(""),[d,p]=i.useState(""),[r,c]=i.useState("");i.useEffect(()=>{s&&g(`/api/hub/profile?invite=${encodeURIComponent(s)}`).then(o=>{b(o.invite),n(o.invite.displayNameHint||"")}).catch(o=>c(o.message))},[s]);const l=async o=>{o.preventDefault(),c("");try{await g("/api/hub/profile",t,{method:"POST",body:JSON.stringify({inviteToken:s,displayName:u,title:d})}),a()}catch(N){c(N.message)}};return e.createElement("main",{className:"hub-auth-screen"},e.createElement("div",{className:"hub-auth-card"},e.createElement("h1",null,"Finish Hub Profile"),h&&e.createElement("p",{className:"hub-help"},"Invite access: ",h.accessLevel),e.createElement("form",{className:"hub-form",onSubmit:l},e.createElement(E,{label:"Display name"},e.createElement("input",{value:u,onChange:o=>n(o.target.value),required:!0})),e.createElement(E,{label:"Role or title"},e.createElement("input",{value:d,onChange:o=>p(o.target.value)})),r&&e.createElement("p",{className:"hub-error"},r),e.createElement("button",{className:"hub-primary-button",type:"submit"},"Enter Hub"))))}function re({calendar:t,docs:s,conversations:a,shifts:h,setTab:b}){const u=t.filter(r=>String(r.startsAt||"").startsWith(k())),n=h.filter(r=>r.open).slice(0,4),d=s.slice(0,4),p=a.slice(0,4);return e.createElement("div",{className:"hub-grid"},e.createElement(v,{title:"Today",icon:_,action:e.createElement("button",{onClick:()=>b("calendar")},"Open calendar")},e.createElement("div",{className:"hub-list"},u.length===0&&e.createElement("p",{className:"hub-empty"},"No scheduled items today."),u.map(r=>e.createElement("div",{className:"hub-row",key:r.id},e.createElement("strong",null,r.title),e.createElement("span",null,L(String(r.startsAt||"").slice(11,16))," ",r.subtitle||""))))),e.createElement(v,{title:"Open Shifts",icon:R,action:e.createElement("button",{onClick:()=>b("shifts")},"View shifts")},e.createElement("div",{className:"hub-list"},n.length===0&&e.createElement("p",{className:"hub-empty"},"No open shifts."),n.map(r=>e.createElement("div",{className:"hub-row",key:r.id},e.createElement("strong",null,r.title),e.createElement("span",null,q(r.date)," at ",L(r.startTime)))))),e.createElement(v,{title:"Recent Chat",icon:P,action:e.createElement("button",{onClick:()=>b("chat")},"Open chat")},e.createElement("div",{className:"hub-list"},p.map(r=>e.createElement("div",{className:"hub-row",key:r.id||r.objectId},e.createElement("strong",null,r.title),e.createElement("span",null,r.preview||"No messages yet"))))),e.createElement(v,{title:"Documents",icon:O,action:e.createElement("button",{onClick:()=>b("docs")},"Open docs")},e.createElement("div",{className:"hub-list"},d.length===0&&e.createElement("p",{className:"hub-empty"},"No documents published."),d.map(r=>e.createElement("div",{className:"hub-row",key:r.id},e.createElement("strong",null,r.title),e.createElement("span",null,r.category," / ",r.visibility))))))}function se({accessToken:t}){const[s,a]=i.useState(k()),[h,b]=i.useState([]),[u,n]=i.useState(!1),d=i.useCallback(async()=>{n(!0);try{const r=await g(`/api/hub/calendar?view=week&date=${s}`,t);b(r.objects||[])}finally{n(!1)}},[t,s]);i.useEffect(()=>{d()},[d]);const p=i.useMemo(()=>{const r=new Map;return h.forEach(c=>{var o;const l=String(c.startsAt||((o=c.metadata)==null?void 0:o.date)||"").slice(0,10)||s;r.set(l,[...r.get(l)||[],c])}),[...r.entries()].sort(([c],[l])=>c.localeCompare(l))},[h,s]);return e.createElement(v,{title:"Calendar",icon:V,action:e.createElement("div",{className:"hub-button-row"},e.createElement("button",{onClick:()=>a(A(s,-7))},"Previous"),e.createElement("button",{onClick:()=>a(k())},"Today"),e.createElement("button",{onClick:()=>a(A(s,7))},"Next"),e.createElement("button",{onClick:d},e.createElement($,{size:18})))},u&&e.createElement("p",{className:"hub-empty"},"Loading calendar..."),e.createElement("div",{className:"hub-calendar-list"},p.map(([r,c])=>e.createElement("section",{className:"hub-day",key:r},e.createElement("h3",null,q(r)),c.map(l=>{var o;return e.createElement("div",{className:"hub-calendar-item",key:l.id},e.createElement("span",null,L(String(l.startsAt||"").slice(11,16))||"Any time"),e.createElement("strong",null,l.title),e.createElement("small",null,l.subtitle||l.type," ",(o=l.metadata)!=null&&o.optional?"/ open shift":""))}))),!u&&p.length===0&&e.createElement("p",{className:"hub-empty"},"No calendar items this week.")))}function oe({accessToken:t,people:s,currentUserId:a}){const[h,b]=i.useState([]),[u,n]=i.useState(null),[d,p]=i.useState([]),[r,c]=i.useState(""),l=i.useCallback(async()=>{var x;const m=await g("/api/hub/conversations",t);b(m.conversations||[]),!u&&((x=m.conversations)!=null&&x.length)&&n(m.conversations[0])},[t,u]),o=i.useCallback(async m=>{if(!m)return;if(!m.id){const w=await g("/api/hub/conversations",t,{method:"POST",body:JSON.stringify({mode:"general",action:"ensure"})});n(w.thread);return}const x=await g(`/api/hub/conversations?threadId=${encodeURIComponent(m.id)}`,t);p(x.messages||[])},[t]);i.useEffect(()=>{l().catch(()=>{})},[l]),i.useEffect(()=>{o(u).catch(()=>{})},[u,o]);const N=async m=>{const x=await g("/api/hub/conversations",t,{method:"POST",body:JSON.stringify({mode:"dm",targetUserId:m.userId,action:"ensure"})});n(x.thread),await l()},C=async m=>{m.preventDefault();const x=r.trim();if(!x)return;const w=(u==null?void 0:u.objectType)==="hub_dm",S=w?u.objectId.split(":").find(y=>y&&y!==a):void 0;await g("/api/hub/conversations",t,{method:"POST",body:JSON.stringify({mode:w?"dm":"general",targetUserId:S,body:x})}),c(""),await l(),await o(u)};return e.createElement("div",{className:"hub-chat-layout"},e.createElement(v,{title:"Chats",icon:P},e.createElement("div",{className:"hub-list"},h.map(m=>e.createElement("button",{className:`hub-row hub-row-button ${(u==null?void 0:u.id)===m.id?"is-active":""}`,key:m.id||m.objectId,onClick:()=>n(m)},e.createElement("strong",null,m.title),e.createElement("span",null,m.preview||"No messages yet"," ",m.lastMessageAt?`/ ${J(m.lastMessageAt)}`:"")))),e.createElement("h3",{className:"hub-subhead"},"Message a person"),e.createElement("div",{className:"hub-list"},s.map(m=>e.createElement("button",{className:"hub-row hub-row-button",key:m.id,onClick:()=>N(m)},e.createElement("strong",null,m.displayName),e.createElement("span",null,m.title||m.accessLevel))))),e.createElement(v,{title:(u==null?void 0:u.title)||"General",icon:P},e.createElement("div",{className:"hub-message-list"},d.length===0&&e.createElement("p",{className:"hub-empty"},"No messages yet."),d.map(m=>e.createElement("div",{className:"hub-message",key:m.id},e.createElement("strong",null,m.senderRole||"staff"," / ",J(m.createdAt)),e.createElement("p",null,m.body)))),e.createElement("form",{className:"hub-compose",onSubmit:C},e.createElement("input",{value:r,onChange:m=>c(m.target.value),placeholder:"Write a clear update..."}),e.createElement("button",{type:"submit"},e.createElement(ae,{size:21,"aria-hidden":"true"})," Send"))))}function ce({accessToken:t,docs:s,reloadDocs:a,isPrivileged:h}){var l;const[b,u]=i.useState(((l=s[0])==null?void 0:l.id)||null),[n,d]=i.useState(null),[p,r]=i.useState({title:"",summary:"",body:"",category:"sop",visibility:"staff"});i.useEffect(()=>{b&&g(`/api/hub/docs?id=${encodeURIComponent(b)}`,t).then(o=>d(o.document)).catch(()=>d(null))},[t,b]),i.useEffect(()=>{!b&&s[0]&&u(s[0].id)},[s,b]);const c=async o=>{o.preventDefault();const N=await g("/api/hub/docs",t,{method:"POST",body:JSON.stringify(p)});r({title:"",summary:"",body:"",category:"sop",visibility:"staff"}),await a(),u(N.document.id)};return e.createElement("div",{className:"hub-doc-layout"},e.createElement(v,{title:"Documents",icon:O},e.createElement("div",{className:"hub-list"},s.length===0&&e.createElement("p",{className:"hub-empty"},"No documents yet."),s.map(o=>e.createElement("button",{className:`hub-row hub-row-button ${b===o.id?"is-active":""}`,key:o.id,onClick:()=>u(o.id)},e.createElement("strong",null,o.title),e.createElement("span",null,o.category," / ",o.visibility))))),e.createElement(v,{title:(n==null?void 0:n.title)||"Document",icon:O},n?e.createElement("article",{className:"hub-doc-body"},e.createElement("p",{className:"hub-doc-summary"},n.summary),e.createElement("pre",null,n.body)):e.createElement("p",{className:"hub-empty"},"Choose a document.")),h&&e.createElement(v,{title:"Publish Document",icon:H},e.createElement("form",{className:"hub-form",onSubmit:c},e.createElement(E,{label:"Title"},e.createElement("input",{value:p.title,onChange:o=>r({...p,title:o.target.value}),required:!0})),e.createElement(E,{label:"Summary"},e.createElement("input",{value:p.summary,onChange:o=>r({...p,summary:o.target.value})})),e.createElement(E,{label:"Category"},e.createElement("input",{value:p.category,onChange:o=>r({...p,category:o.target.value})})),e.createElement(E,{label:"Visibility"},e.createElement("select",{value:p.visibility,onChange:o=>r({...p,visibility:o.target.value})},e.createElement("option",{value:"staff"},"Staff"),e.createElement("option",{value:"privileged"},"Privileged"))),e.createElement(E,{label:"Body"},e.createElement("textarea",{value:p.body,onChange:o=>r({...p,body:o.target.value}),rows:8,required:!0})),e.createElement("button",{className:"hub-primary-button",type:"submit"},e.createElement(H,{size:20})," Publish"))))}function ue({people:t,onMessage:s}){return e.createElement(v,{title:"People",icon:W},e.createElement("div",{className:"hub-people-grid"},t.map(a=>e.createElement("div",{className:"hub-person",key:a.id},e.createElement("strong",null,a.displayName),e.createElement("span",null,a.title||a.accessLevel),e.createElement("small",null,a.email),e.createElement("button",{onClick:()=>s(a)},e.createElement(P,{size:18})," Message")))))}function me({accessToken:t,isPrivileged:s}){const[a,h]=i.useState(k()),[b,u]=i.useState([]),[n,d]=i.useState({title:"",date:k(),startTime:"09:00",endTime:""}),p=i.useCallback(async()=>{const l=await g(`/api/hub/shifts?from=${a}&to=${A(a,14)}`,t);u(l.shifts||[])},[t,a]);i.useEffect(()=>{p().catch(()=>{})},[p]);const r=async l=>{await g("/api/hub/shifts",t,{method:"POST",body:JSON.stringify({action:"claim",plannerCardId:l.id})}),await p()},c=async l=>{l.preventDefault(),await g("/api/hub/shifts",t,{method:"POST",body:JSON.stringify(n)}),d({title:"",date:k(),startTime:"09:00",endTime:""}),await p()};return e.createElement("div",{className:"hub-grid"},e.createElement(v,{title:"Staff Shifts",icon:R,action:e.createElement("button",{onClick:()=>h(A(a,14))},"Next 2 weeks")},e.createElement("div",{className:"hub-list"},b.map(l=>e.createElement("div",{className:"hub-shift",key:l.id},e.createElement("div",null,e.createElement("strong",null,l.title),e.createElement("span",null,q(l.date)," / ",L(l.startTime)," ",l.endTime?`to ${L(l.endTime)}`:""),e.createElement("small",null,l.people.length?`Assigned: ${l.people.join(", ")}`:"No one assigned yet")),l.open?e.createElement("button",{onClick:()=>r(l)},e.createElement(ne,{size:19})," Pick up"):e.createElement("span",{className:"hub-pill"},"Covered"))))),s&&e.createElement(v,{title:"Add Open Shift",icon:H},e.createElement("form",{className:"hub-form",onSubmit:c},e.createElement(E,{label:"Shift name"},e.createElement("input",{value:n.title,onChange:l=>d({...n,title:l.target.value}),required:!0})),e.createElement(E,{label:"Date"},e.createElement("input",{type:"date",value:n.date,onChange:l=>d({...n,date:l.target.value}),required:!0})),e.createElement(E,{label:"Start"},e.createElement("input",{type:"time",value:n.startTime,onChange:l=>d({...n,startTime:l.target.value}),required:!0})),e.createElement(E,{label:"End"},e.createElement("input",{type:"time",value:n.endTime,onChange:l=>d({...n,endTime:l.target.value})})),e.createElement("button",{className:"hub-primary-button",type:"submit"},e.createElement(H,{size:20})," Add shift"))))}function de({accessToken:t,reloadDocs:s}){const[a,h]=i.useState({email:"",accessLevel:"staff",displayNameHint:""}),[b,u]=i.useState(null),[n,d]=i.useState({sourceType:"brain_inbox",sourceId:"",title:"",visibility:"staff"}),p=async c=>{c.preventDefault();const l=await g("/api/hub/invites",t,{method:"POST",body:JSON.stringify(a)});u(l.invite)},r=async c=>{c.preventDefault(),await g("/api/hub/brain-publish",t,{method:"POST",body:JSON.stringify(n)}),d({sourceType:"brain_inbox",sourceId:"",title:"",visibility:"staff"}),await s()};return e.createElement("div",{className:"hub-grid"},e.createElement(v,{title:"Invite User",icon:B},e.createElement("form",{className:"hub-form",onSubmit:p},e.createElement(E,{label:"Email"},e.createElement("input",{type:"email",value:a.email,onChange:c=>h({...a,email:c.target.value}),required:!0})),e.createElement(E,{label:"Access"},e.createElement("select",{value:a.accessLevel,onChange:c=>h({...a,accessLevel:c.target.value})},e.createElement("option",{value:"staff"},"Staff"),e.createElement("option",{value:"privileged"},"Privileged"))),e.createElement(E,{label:"Name hint"},e.createElement("input",{value:a.displayNameHint,onChange:c=>h({...a,displayNameHint:c.target.value})})),e.createElement("button",{className:"hub-primary-button",type:"submit"},e.createElement(B,{size:20})," Create invite")),b&&e.createElement("div",{className:"hub-copy-box"},e.createElement("strong",null,"Invite link"),e.createElement("input",{readOnly:!0,value:b.url||"",onFocus:c=>c.target.select()}))),e.createElement(v,{title:"Send Brain to Hub",icon:ee},e.createElement("form",{className:"hub-form",onSubmit:r},e.createElement(E,{label:"Source"},e.createElement("select",{value:n.sourceType,onChange:c=>d({...n,sourceType:c.target.value})},e.createElement("option",{value:"brain_inbox"},"Brain inbox item"),e.createElement("option",{value:"brain_entity"},"Brain entity"))),e.createElement(E,{label:"Source ID"},e.createElement("input",{value:n.sourceId,onChange:c=>d({...n,sourceId:c.target.value}),required:!0})),e.createElement(E,{label:"Hub title"},e.createElement("input",{value:n.title,onChange:c=>d({...n,title:c.target.value})})),e.createElement(E,{label:"Visibility"},e.createElement("select",{value:n.visibility,onChange:c=>d({...n,visibility:c.target.value})},e.createElement("option",{value:"staff"},"Staff"),e.createElement("option",{value:"privileged"},"Privileged"))),e.createElement("button",{className:"hub-primary-button",type:"submit"},e.createElement(O,{size:20})," Publish as doc"))))}function ke(){var j;const t=Y(),s=new URLSearchParams(window.location.search).get("invite")||"",[a,h]=i.useState(null),[b,u]=i.useState(!1),[n,d]=i.useState("today"),[p,r]=i.useState([]),[c,l]=i.useState([]),[o,N]=i.useState([]),[C,m]=i.useState([]),[x,w]=i.useState([]);i.useEffect(()=>{let f=document.querySelector('meta[name="robots"]');return f||(f=document.createElement("meta"),f.setAttribute("name","robots"),document.head.appendChild(f)),f.setAttribute("content","noindex, nofollow"),()=>{f.setAttribute("content","")}},[]);const S=i.useCallback(async()=>{if(t.accessToken){u(!1);try{const f=await g("/api/hub/profile",t.accessToken);h(f.profile||null)}finally{u(!0)}}},[t.accessToken]),y=i.useCallback(async()=>{const f=await g("/api/hub/docs",t.accessToken);l(f.documents||[])},[t.accessToken]),z=i.useCallback(async()=>{if(!t.accessToken||!a)return;const f=k(),[T,I,G,K,Q]=await Promise.all([g("/api/hub/people",t.accessToken),g("/api/hub/docs",t.accessToken),g(`/api/hub/calendar?view=week&date=${f}`,t.accessToken),g("/api/hub/conversations",t.accessToken),g(`/api/hub/shifts?from=${f}&to=${A(f,14)}`,t.accessToken)]);r(T.people||[]),l(I.documents||[]),N(G.objects||[]),m(K.conversations||[]),w(Q.shifts||[])},[t.accessToken,a]);i.useEffect(()=>{S().catch(()=>u(!0))},[S]),i.useEffect(()=>{z().catch(()=>{})},[z]);const D=!!a&&(a.accessLevel==="privileged"||a.isPrivileged||t.isAdmin),U=D?[...F,{id:"admin",label:"Admin",icon:M}]:F;return t.loading?e.createElement("main",{className:"hub-auth-screen"},e.createElement($,{className:"animate-spin",size:36})):t.user?b&&!a?e.createElement(le,{accessToken:t.accessToken,inviteToken:s,onDone:S}):b?e.createElement("div",{className:"hub-app"},e.createElement("style",null,pe),e.createElement("aside",{className:"hub-sidebar"},e.createElement("div",{className:"hub-logo"},e.createElement(M,{size:30}),e.createElement("div",null,e.createElement("strong",null,"Hub"),e.createElement("span",null,a.displayName))),e.createElement("nav",null,U.map(({id:f,label:T,icon:I})=>e.createElement("button",{key:f,className:n===f?"is-active":"",onClick:()=>d(f)},e.createElement(I,{size:23,"aria-hidden":"true"}),T))),e.createElement("button",{className:"hub-signout",onClick:t.signOut},e.createElement(Z,{size:20})," Sign out")),e.createElement("main",{className:"hub-main"},e.createElement("header",{className:"hub-topbar"},e.createElement("div",null,e.createElement("h1",null,((j=U.find(f=>f.id===n))==null?void 0:j.label)||"Hub"),e.createElement("p",null,D?"Privileged view":"Staff view")),e.createElement("button",{onClick:z},e.createElement($,{size:21})," Refresh")),n==="today"&&e.createElement(re,{calendar:o,docs:c,conversations:C,shifts:x,setTab:d}),n==="calendar"&&e.createElement(se,{accessToken:t.accessToken}),n==="chat"&&e.createElement(oe,{accessToken:t.accessToken,people:p,currentUserId:a.userId}),n==="docs"&&e.createElement(ce,{accessToken:t.accessToken,docs:c,reloadDocs:y,isPrivileged:D}),n==="people"&&e.createElement(ue,{people:p,onMessage:()=>d("chat")}),n==="shifts"&&e.createElement(me,{accessToken:t.accessToken,isPrivileged:D}),n==="admin"&&D&&e.createElement(de,{accessToken:t.accessToken,reloadDocs:y})),e.createElement("nav",{className:"hub-mobile-nav"},U.slice(0,6).map(({id:f,label:T,icon:I})=>e.createElement("button",{key:f,className:n===f?"is-active":"",onClick:()=>d(f)},e.createElement(I,{size:21}),e.createElement("span",null,T))))):e.createElement("main",{className:"hub-auth-screen"},e.createElement($,{className:"animate-spin",size:36})):e.createElement(ie,{auth:t,inviteToken:s})}const pe=`
.hub-app {
  --hub-bg: #f7f5ef;
  --hub-panel: #fffdf8;
  --hub-ink: #1f2520;
  --hub-muted: #687064;
  --hub-border: #d8d2c4;
  --hub-accent: #345c51;
  --hub-accent-text: #ffffff;
  min-height: 100vh;
  display: flex;
  background: var(--hub-bg);
  color: var(--hub-ink);
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.hub-sidebar {
  width: 260px;
  background: #ebe6d9;
  border-right: 1px solid var(--hub-border);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.hub-logo { display: flex; align-items: center; gap: 12px; padding: 8px; }
.hub-logo strong { display: block; font-size: 28px; line-height: 1; }
.hub-logo span { display: block; font-size: 15px; color: var(--hub-muted); margin-top: 4px; }
.hub-sidebar nav { display: grid; gap: 8px; }
.hub-sidebar nav button, .hub-signout, .hub-topbar button, .hub-panel-head button, .hub-button-row button, .hub-person button, .hub-shift button {
  min-height: 52px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--hub-ink);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  font-size: 18px;
  font-weight: 700;
}
.hub-sidebar nav button.is-active, .hub-mobile-nav button.is-active {
  background: var(--hub-accent);
  color: var(--hub-accent-text);
}
.hub-signout { margin-top: auto; color: #7a2f2f; }
.hub-main { flex: 1; min-width: 0; padding: 22px; padding-bottom: 88px; overflow: auto; }
.hub-topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.hub-topbar h1 { margin: 0; font-size: 34px; line-height: 1.05; }
.hub-topbar p { margin: 6px 0 0; font-size: 17px; color: var(--hub-muted); }
.hub-topbar button, .hub-panel-head button, .hub-button-row button, .hub-person button, .hub-shift button { background: var(--hub-panel); border-color: var(--hub-border); }
.hub-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.hub-panel {
  background: var(--hub-panel);
  border: 1px solid var(--hub-border);
  border-radius: 8px;
  padding: 18px;
  box-shadow: 0 1px 0 rgba(0,0,0,0.04);
}
.hub-panel-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.hub-panel-title { display: flex; align-items: center; gap: 10px; }
.hub-panel h2 { margin: 0; font-size: 26px; }
.hub-subhead { font-size: 18px; margin: 20px 0 10px; }
.hub-list { display: grid; gap: 9px; }
.hub-row, .hub-shift {
  border: 1px solid var(--hub-border);
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
  text-align: left;
}
.hub-row strong, .hub-shift strong { display: block; font-size: 20px; line-height: 1.25; }
.hub-row span, .hub-shift span, .hub-shift small { display: block; color: var(--hub-muted); font-size: 16px; margin-top: 4px; }
.hub-row-button { width: 100%; cursor: pointer; }
.hub-row-button.is-active { outline: 3px solid rgba(52, 92, 81, 0.25); border-color: var(--hub-accent); }
.hub-empty { color: var(--hub-muted); font-size: 18px; margin: 0; }
.hub-calendar-list { display: grid; gap: 14px; }
.hub-day h3 { font-size: 21px; margin: 0 0 8px; }
.hub-calendar-item {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 6px 14px;
  padding: 13px;
  border: 1px solid var(--hub-border);
  border-radius: 8px;
  background: #fff;
  margin-bottom: 8px;
}
.hub-calendar-item span { font-size: 17px; font-weight: 800; color: var(--hub-accent); }
.hub-calendar-item strong { font-size: 19px; }
.hub-calendar-item small { grid-column: 2; color: var(--hub-muted); font-size: 15px; }
.hub-chat-layout { display: grid; grid-template-columns: minmax(280px, 380px) 1fr; gap: 18px; }
.hub-doc-layout { display: grid; grid-template-columns: minmax(260px, 360px) 1fr minmax(260px, 360px); gap: 18px; }
.hub-message-list { min-height: 48vh; max-height: 58vh; overflow: auto; display: grid; align-content: start; gap: 10px; }
.hub-message { border: 1px solid var(--hub-border); background: #fff; border-radius: 8px; padding: 12px; }
.hub-message strong { color: var(--hub-muted); font-size: 14px; }
.hub-message p { margin: 6px 0 0; font-size: 18px; line-height: 1.45; }
.hub-compose { display: flex; gap: 10px; margin-top: 14px; }
.hub-compose input, .hub-field input, .hub-field select, .hub-field textarea, .hub-copy-box input {
  width: 100%;
  border: 1px solid var(--hub-border);
  border-radius: 8px;
  padding: 13px 14px;
  font-size: 18px;
  background: #fff;
  color: var(--hub-ink);
}
.hub-compose button, .hub-primary-button {
  min-height: 52px;
  border: 0;
  border-radius: 8px;
  background: var(--hub-accent);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 18px;
}
.hub-doc-body pre {
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 18px;
  line-height: 1.55;
}
.hub-doc-summary { color: var(--hub-muted); font-size: 18px; }
.hub-people-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.hub-person { border: 1px solid var(--hub-border); border-radius: 8px; background: #fff; padding: 15px; display: grid; gap: 6px; }
.hub-person strong { font-size: 21px; }
.hub-person span, .hub-person small { color: var(--hub-muted); font-size: 15px; overflow-wrap: anywhere; }
.hub-shift { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.hub-pill { border: 1px solid var(--hub-border); border-radius: 999px; padding: 8px 12px; font-weight: 800; color: var(--hub-accent); }
.hub-form { display: grid; gap: 13px; }
.hub-field span { display: block; margin-bottom: 6px; font-size: 15px; font-weight: 800; color: var(--hub-muted); }
.hub-copy-box { margin-top: 14px; display: grid; gap: 8px; }
.hub-auth-screen { min-height: 100vh; display: grid; place-items: center; background: var(--hub-bg, #f7f5ef); padding: 18px; }
.hub-auth-card { width: min(520px, 100%); background: #fffdf8; border: 1px solid #d8d2c4; border-radius: 8px; padding: 24px; }
.hub-brand { display: flex; gap: 14px; align-items: center; margin-bottom: 18px; }
.hub-brand h1, .hub-auth-card h1 { font-size: 32px; margin: 0; }
.hub-brand p, .hub-help { color: #687064; font-size: 17px; line-height: 1.45; }
.hub-notice { background: #edf5f1; border: 1px solid #b9d1c8; padding: 12px; border-radius: 8px; margin-bottom: 14px; font-weight: 800; }
.hub-error { color: #9b2f2f; font-weight: 800; margin: 0; }
.hub-text-button { border: 0; background: transparent; color: #345c51; font-weight: 800; font-size: 17px; margin-top: 14px; }
.hub-mobile-nav { display: none; }
@media (max-width: 900px) {
  .hub-app { display: block; }
  .hub-sidebar { display: none; }
  .hub-main { padding: 14px; padding-bottom: 88px; }
  .hub-topbar h1 { font-size: 28px; }
  .hub-grid, .hub-chat-layout, .hub-doc-layout { grid-template-columns: 1fr; }
  .hub-panel { padding: 14px; }
  .hub-panel h2 { font-size: 23px; }
  .hub-calendar-item { grid-template-columns: 1fr; }
  .hub-calendar-item small { grid-column: auto; }
  .hub-shift { align-items: stretch; flex-direction: column; }
  .hub-compose { flex-direction: column; }
  .hub-mobile-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    background: #ebe6d9;
    border-top: 1px solid var(--hub-border);
    padding: 6px;
  }
  .hub-mobile-nav button {
    min-height: 58px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--hub-ink);
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 800;
  }
}
`;export{ke as default};
