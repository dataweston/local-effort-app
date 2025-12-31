import{af as C,r as g,R as e,X as ft,aa as ht}from"./index-BYJRxlmx.js";import{D as We}from"./download-9OnnSyz_.js";import{S as yt,D as Ae,T as Et,a as Nt}from"./trash-2-hsVwwJ0K.js";import{P as oe}from"./plus-CSFR6Y-z.js";import{u as vt}from"./useSquarePayments-sOwSgl_I.js";import{a as Be,C as Le,M as wt,P as Ct,F as kt,S as St}from"./search-DZRDU2hm.js";import{C as He}from"./circle-alert-CpSOeZ10.js";import{F as Ue}from"./file-text-CL8famcR.js";import{C as $t}from"./clipboard-list-hr8VjeXz.js";import{M as ye}from"./minus-YiIBU274.js";import{S as zt}from"./send-DMfJan8E.js";import{C as _t}from"./clock-DFfO1eqa.js";import{A as Dt}from"./arrow-left-Bvt3Sd2-.js";import{M as It}from"./mail-Bojj-I8k.js";const Pt=async n=>{if(!C||!n)return null;const{data:r,error:x}=await C.from("happymonday_users").select("*").eq("email",n.toLowerCase()).single();return x?(console.error("[HappyMonday] Error fetching user:",x),null):r},Ve=async()=>{if(!C)return null;const{data:n,error:r}=await C.from("happymonday_users").select("id").eq("email","hello@happymonday.company").single();return r?(console.error("[HappyMonday] Error fetching client user:",r),null):(n==null?void 0:n.id)||null},Ot=async({email:n,role:r,repair:x=!1}={})=>{if(!C)return null;const m=r==="admin"?"hello@happymonday.company":n,{data:o,error:$}=await C.rpc("happymonday_financial_snapshot",{p_user_email:m,p_update_balance:x});return $?(console.error("[HappyMonday] Error fetching financial snapshot:",$),null):o?{...o,balance_cents:o.calculated_balance_cents??o.balance_cents??0}:null},Ft=async(n,r=null,x=null)=>{if(!C||!n)return null;let m=n,o=x;if(r==="admin"){const s=await Ve();s&&(m=s,o="hello@happymonday.company")}const $=await Ot({email:o,role:r,repair:!0});if($)return $;const{data:_,error:v}=await C.from("happymonday_credits").select("*").eq("user_id",m).single();return v?(console.error("[HappyMonday] Error fetching credits (fallback):",v),null):_},Qe=async()=>{if(!C)return[];const n=C.from("happymonday_orders").select(`
      *,
      user:user_id(email, name, role),
      created_by_user:created_by(email, name, role)
    `).order("created_at",{ascending:!1}),{data:r,error:x}=await n;return x?(console.error("[HappyMonday] Error loading orders:",x),[]):r||[]},Mt=async({createdBy:n,orderNumber:r,orderDate:x,items:m,totalCents:o,notes:$,isClientOrder:_=!1})=>{if(!C)throw new Error("Supabase not configured");const{data:v}=await C.from("happymonday_users").select("id").eq("email","hello@happymonday.company").single();if(!v)throw new Error("Client user not found");const{data:s,error:S}=await C.from("happymonday_orders").insert({user_id:v.id,created_by:n,order_number:r,order_date:x,items:m,total_cents:o,notes:$,status:"unpaid",email_sent:!1}).select().single();if(S)throw console.error("[HappyMonday] Error creating order:",S),S;if(_&&s)try{await fetch("/api/happymonday/send-invoice-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:s.id})}),await C.from("happymonday_orders").update({email_sent:!0}).eq("id",s.id)}catch(D){console.error("[HappyMonday] Error sending email:",D)}return s},Rt=async(n,{items:r,totalCents:x,notes:m,orderDate:o,editedBy:$})=>{if(!C)throw new Error("Supabase not configured");const{data:_,error:v}=await C.rpc("update_happymonday_order",{p_order_id:n,p_items:r,p_total_cents:x,p_notes:m||"",p_order_date:o,p_edited_by:$});if(v)throw console.error("[HappyMonday] Error updating order:",v),v;return _},Tt=async()=>{if(!C)return{};const{data:n,error:r}=await C.from("happymonday_costing").select("*");if(r)return console.error("[HappyMonday] Error loading costing:",r),{};const x={};return(n||[]).forEach(m=>{x[m.item_id]={flour:Number(m.flour)||0,meat:Number(m.meat)||0,vegetables:Number(m.vegetables)||0,dairy:Number(m.dairy)||0,otherToppings:Number(m.other_toppings)||0,packaging:Number(m.packaging)||0,label:Number(m.label)||0,custom:m.custom||[]}}),x},jt=async n=>{if(!C)throw new Error("Supabase not configured");const r=Object.entries(n).map(([m,o])=>({item_id:parseInt(m),flour:o.flour||0,meat:o.meat||0,vegetables:o.vegetables||0,dairy:o.dairy||0,other_toppings:o.otherToppings||0,packaging:o.packaging||0,label:o.label||0,custom:o.custom||[],updated_at:new Date().toISOString()})),{error:x}=await C.from("happymonday_costing").upsert(r,{onConflict:"item_id"});if(x)throw console.error("[HappyMonday] Error saving costing:",x),x;return!0},qt=({items:n})=>{const[r,x]=g.useState(n.reduce((i,f)=>(i[f.id]={flour:0,meat:0,vegetables:0,dairy:0,otherToppings:0,packaging:0,label:0,custom:[]},i),{})),[m,o]=g.useState(!1),$=async()=>{o(!0);try{const i=await Tt();if(i&&Object.keys(i).length>0){const f=n.reduce((y,z)=>(y[z.id]={...r[z.id],...i[z.id]||{}},y),{});x(f)}}catch(i){console.error("Error loading costs:",i),alert("Error loading costs. Please check the console for details.")}o(!1)};g.useEffect(()=>{$()},[]);const _=async()=>{o(!0);try{await jt(r),alert("Costs saved successfully!")}catch(i){console.error("Error saving costs:",i),alert("Error saving costs. Please try again.")}o(!1)},v=(i,f,y,z=null)=>{const N={...r};z!==null?N[i].custom[z][f]=y:N[i][f]=parseFloat(y)||0,x(N)},s=i=>{var y;const f={...r};(y=f[i])!=null&&y.custom||(f[i].custom=[]),f[i].custom.push({name:"",cost:0}),x(f)},S=(i,f)=>{const y={...r};y[i].custom.splice(f,1),x(y)},D=i=>{const f=r[i];if(!f)return 0;const y=(f.custom||[]).reduce((z,N)=>z+(parseFloat(N.cost)||0),0);return(f.flour||0)+(f.meat||0)+(f.vegetables||0)+(f.dairy||0)+(f.otherToppings||0)+(f.packaging||0)+(f.label||0)+y},T=i=>{const f=[{name:"packaging",label:"Packaging"},{name:"label",label:"Label"}];let y=[];return i.category==="Sandwiches"?y=[{name:"flour",label:"Flour"},{name:"meat",label:"Meat"},{name:"vegetables",label:"Vegetables"},{name:"dairy",label:"Dairy"},{name:"otherToppings",label:"Other Toppings"}]:i.category==="Pizza"&&(y=[{name:"flour",label:"Dough/Flour"},{name:"meat",label:"Meat"},{name:"vegetables",label:"Vegetables"},{name:"dairy",label:"Cheese/Dairy"},{name:"otherToppings",label:"Sauce & Toppings"}]),[...y,...f].map(N=>{var j;return e.createElement("div",{key:N.name,className:"flex items-center"},e.createElement("label",{className:"w-1/2 text-sm text-slate-600"},N.label),e.createElement("div",{className:"w-1/2 relative"},e.createElement(Ae,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400",size:16}),e.createElement("input",{type:"number",step:"0.01",value:((j=r[i.id])==null?void 0:j[N.name])||"",onChange:P=>v(i.id,N.name,P.target.value),className:"w-full pl-8 pr-2 py-1 border border-slate-300 rounded-md",disabled:m})))})};return e.createElement("div",{className:"bg-white rounded-2xl shadow-xl p-6"},e.createElement("div",{className:"flex justify-between items-center mb-6"},e.createElement("h2",{className:"text-2xl font-bold text-slate-800"},"Costing Worksheet"),e.createElement("div",{className:"flex gap-2"},e.createElement("button",{onClick:$,disabled:m,className:"px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 bg-slate-500 hover:bg-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"},e.createElement(We,{size:18}),m?"Loading...":"Reload Costs"),e.createElement("button",{onClick:_,disabled:m,className:"px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"},e.createElement(yt,{size:18}),m?"Saving...":"Save Costs"))),e.createElement("div",{className:"grid md:grid-cols-2 lg:grid-cols-3 gap-6"},n.map(i=>{var f;return e.createElement("div",{key:i.id,className:`p-4 border border-slate-200 rounded-xl ${m?"bg-slate-50 opacity-50":""}`},e.createElement("h3",{className:"font-semibold text-slate-800 text-lg mb-2"},i.name),e.createElement("div",{className:"space-y-2"},T(i),(((f=r[i.id])==null?void 0:f.custom)||[]).map((y,z)=>e.createElement("div",{key:z,className:"flex items-center space-x-2"},e.createElement("input",{type:"text",placeholder:"Custom Ingredient",value:y.name,onChange:N=>v(i.id,"name",N.target.value,z),className:"w-1/2 px-2 py-1 border border-slate-300 rounded-md",disabled:m}),e.createElement("div",{className:"w-1/2 relative flex items-center"},e.createElement(Ae,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400",size:16}),e.createElement("input",{type:"number",step:"0.01",placeholder:"Cost",value:y.cost,onChange:N=>v(i.id,"cost",N.target.value,z),className:"w-full pl-8 pr-2 py-1 border border-slate-300 rounded-md",disabled:m}),e.createElement("button",{onClick:()=>S(i.id,z),className:"ml-2 text-red-500 hover:text-red-700",disabled:m},e.createElement(Et,{size:16}))))),e.createElement("button",{onClick:()=>s(i.id),className:"text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1",disabled:m},e.createElement(oe,{size:14})," Add Custom Ingredient")),e.createElement("div",{className:"border-t mt-4 pt-2 flex justify-between items-center"},e.createElement("span",{className:"font-semibold"},"Total Cost:"),e.createElement("span",{className:"font-bold text-blue-600"},"$",D(i.id).toFixed(2))))})))},At=({userId:n,currentBalance:r,onClose:x,onSuccess:m})=>{const{payments:o,loading:$,error:_}=vt(),[v,s]=g.useState(null),[S,D]=g.useState(""),[T,i]=g.useState(!1),[f,y]=g.useState(null),N=(Math.max(0,r)/100).toFixed(2);g.useEffect(()=>!o||v?void 0:((async()=>{try{const q=await o.card();await q.attach("#card-container"),s(q)}catch(q){console.error("[Square] Failed to initialize card",q),y("Failed to initialize payment form. Please try again.")}})(),()=>{v!=null&&v.destroy&&v.destroy()}),[o]);const j=async()=>{if(!v||!S||parseFloat(S)<=0){y("Please enter a valid payment amount");return}i(!0),y(null);try{const P=await v.tokenize();if(P.status==="OK"){const q=P.token,O=Math.round(parseFloat(S)*100),W=await fetch("/api/happymonday/process-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:n,token:q,amountCents:O})}),Q=await W.json();if(!W.ok)throw new Error(Q.error||"Payment failed");alert(`Payment of $${S} processed successfully!`),m()}else{const q=(P.errors||[]).map(O=>O.message).join(", ");throw new Error(q||"Card tokenization failed")}}catch(P){console.error("[Square] Payment error:",P),y(P.message||"Payment failed. Please try again.")}finally{i(!1)}};return e.createElement("div",{className:"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"},e.createElement("div",{className:"bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"},e.createElement("div",{className:"flex justify-between items-center mb-6"},e.createElement("h2",{className:"text-2xl font-bold text-slate-800 flex items-center gap-2"},e.createElement(Be,{size:24}),"Make a Payment"),e.createElement("button",{onClick:x,className:"p-2 hover:bg-slate-100 rounded-lg transition-colors",disabled:T},e.createElement(ft,{size:20}))),e.createElement("div",{className:"mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"},e.createElement("p",{className:"text-sm text-red-700 font-medium"},"Balance Due"),e.createElement("p",{className:"text-2xl font-bold text-red-600"},"$",N)),e.createElement("div",{className:"mb-6"},e.createElement("label",{className:"block text-sm font-medium text-slate-700 mb-2"},"Payment Amount"),e.createElement("div",{className:"relative"},e.createElement("span",{className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium"},"$"),e.createElement("input",{type:"number",min:"0",step:"0.01",value:S,onChange:P=>D(P.target.value),placeholder:N,className:"w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",disabled:T})),e.createElement("button",{onClick:()=>D(N),className:"mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"},"Pay full balance ($",N,")")),$&&e.createElement("div",{className:"mb-6 p-8 bg-slate-50 rounded-lg text-center"},e.createElement("div",{className:"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"}),e.createElement("p",{className:"text-sm text-slate-600"},"Loading payment form...")),_&&e.createElement("div",{className:"mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"},e.createElement(He,{size:20,className:"text-red-600 flex-shrink-0 mt-0.5"}),e.createElement("div",null,e.createElement("p",{className:"text-sm font-medium text-red-800"},"Payment Form Error"),e.createElement("p",{className:"text-sm text-red-700"},_))),!$&&!_&&e.createElement("div",{className:"mb-6"},e.createElement("label",{className:"block text-sm font-medium text-slate-700 mb-2"},"Card Information"),e.createElement("div",{id:"card-container",className:"border border-slate-300 rounded-lg p-3 min-h-[100px]"})),f&&e.createElement("div",{className:"mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"},e.createElement(He,{size:20,className:"text-red-600 flex-shrink-0 mt-0.5"}),e.createElement("p",{className:"text-sm text-red-700"},f)),e.createElement("div",{className:"mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"},e.createElement("p",{className:"text-xs text-blue-700"},"Payments are processed securely via Square. ACH payments are also available - please contact us at hello@localeffortfood.com to set up ACH payments.")),e.createElement("div",{className:"flex gap-3"},e.createElement("button",{onClick:x,className:"flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors",disabled:T},"Cancel"),e.createElement("button",{onClick:j,disabled:T||!v||!S||parseFloat(S)<=0||_,className:`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${T||!v||!S||parseFloat(S)<=0||_?"bg-slate-300 text-slate-500 cursor-not-allowed":"bg-green-500 hover:bg-green-600 text-white"}`},T?"Processing...":`Pay $${S||"0.00"}`))))},U=n=>{if(!n)return"";const[r,x,m]=n.split("T")[0].split("-");return new Date(r,x-1,m).toLocaleDateString()},Lt=()=>{const n=new Date,r=new Date(n);return r.setDate(r.getDate()-6),{startDate:r.toISOString().split("T")[0],endDate:n.toISOString().split("T")[0],status:"all",category:"all",searchText:""}},Ee=n=>{if(!n)return null;const r=n.split("T")[0].split("-").map(Number);return r.length<3||r.some(x=>Number.isNaN(x))?null:new Date(r[0],r[1]-1,r[2])},I=(n="")=>n.toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"),aa=()=>{const[n]=g.useState([{id:1,name:"Egg Salad Sandwich",price:5.1,category:"Sandwiches"},{id:2,name:"Turkey Breast",price:6.1,category:"Sandwiches"},{id:3,name:"Roast Beef",price:7.1,category:"Sandwiches"},{id:4,name:"Pastrami",price:7.1,category:"Sandwiches"},{id:5,name:"Mortadella",price:7.1,category:"Sandwiches"},{id:6,name:"Vegetable",price:6.1,category:"Sandwiches"},{id:7,name:'12" Cheese',price:7.1,category:"Pizza"},{id:8,name:'4" Cheese',price:3.6,category:"Pizza"},{id:9,name:'4" Pepperoni',price:3.6,category:"Pizza"},{id:10,name:'12" Pepperoni',price:8.1,category:"Pizza"},{id:11,name:'12" Seasonal',price:8.1,category:"Pizza"},{id:12,name:'12" Supreme',price:8.1,category:"Pizza"},{id:13,name:'12" Gluten Free',price:8.1,category:"Pizza"},{id:14,name:"Beet Salad",price:5.1,category:"Salads"},{id:15,name:"Pasta Salad (gluten free)",price:3.1,category:"Salads"},{id:16,name:"Yogurt & Granola (gluten free)",price:3.1,category:"Breakfast"},{id:17,name:"Yogurt & Granola with chocolate (gluten free)",price:4.1,category:"Breakfast"},{id:18,name:"Chia Pudding",price:3.1,category:"Breakfast"},{id:19,name:"Chia Pudding (dairy free)",price:4.1,category:"Breakfast"}]),{user:r,loading:x,signOut:m}=ht(),[o,$]=g.useState(null),[_,v]=g.useState(null),[s,S]=g.useState(null),[D,T]=g.useState(!1),[i,f]=g.useState(""),[y,z]=g.useState(""),[N,j]=g.useState(!1),P=async t=>{if(t.preventDefault(),!(!C||!i||!y)){j(!0);try{const{error:a}=await C.auth.signInWithPassword({email:i.trim(),password:y});a&&(console.error("Sign in error:",a),alert(`Login failed: ${a.message}`))}catch(a){console.error("Sign in error:",a),alert("Failed to sign in. Please try again.")}finally{j(!1)}}},q=async()=>{if(!C)throw new Error("Supabase not configured");j(!0);try{const a=`${window.location.origin}/partners/happy-monday`,{error:l}=await C.auth.signInWithOAuth({provider:"google",options:{redirectTo:a}});l&&(console.error("Sign in error:",l),alert("Failed to sign in with Google. Please try again."),j(!1))}catch(t){console.error("Sign in error:",t),alert("Failed to sign in. Please try again."),j(!1)}},[O,W]=g.useState("order"),[Q,Ne]=g.useState({}),[X,ve]=g.useState(!1),[we,Ce]=g.useState(""),[ke,Se]=g.useState(new Date().toISOString().split("T")[0]),[M,$e]=g.useState([]),[p,ie]=g.useState(null),[L,ze]=g.useState({orderId:null,reason:""}),[R,A]=g.useState(!1),[Ge,ce]=g.useState(!1),[V,Z]=g.useState(!1),[G,de]=g.useState({}),[_e,me]=g.useState(""),[De,ue]=g.useState(""),[h,pe]=g.useState(()=>Lt()),[ee,Ie]=g.useState(!1);g.useEffect(()=>{r!=null&&r.email?Y():($(null),S(null),T(!1),$e([]))},[r]);const Y=async()=>{if(r!=null&&r.email)try{A(!0),console.log("[HappyMonday] Loading user data for:",r.email);const t=await Pt(r.email);if(console.log("[HappyMonday] User data received:",t),!t){console.error("[HappyMonday] User not found in happymonday_users table. Email:",r.email),alert(`Your account (${r.email}) is not authorized for this portal. Please contact hello@localeffortfood.com`),await m();return}$(t),T(t.role==="admin");const a=await Ve();v(a);const l=await Ft(t.id,t.role,t.email);S(l),await Pe()}catch(t){console.error("Error loading user data:",t),alert("Error loading your data. Please try again.")}finally{A(!1)}},Pe=async()=>{try{const t=await Qe();$e(t)}catch(t){console.error("Error loading orders:",t)}},Oe=()=>Object.entries(Q).reduce((t,[a,l])=>{const d=n.find(w=>w.id===parseInt(a));return t+(d?d.price*l:0)},0),Fe=(t,a)=>{Ne(l=>{const d={...l},k=(d[t]||0)+a;return k===0?delete d[t]:d[t]=k,d})},te=(t,a)=>{de(l=>{const d={...l},k=(d[t]||0)+a;return k===0?delete d[t]:d[t]=k,d})},ae=()=>Object.entries(G).reduce((t,[a,l])=>{const d=n.find(w=>w.id===parseInt(a));return t+(d?d.price*l:0)},0),Ye=()=>{if(!p)return;de({...p.items}),me(p.notes||"");const t=p.order_date.split("T")[0];ue(t),Z(!0)},Je=()=>{Z(!1),de({}),me(""),ue("")},Ke=async()=>{if(!(!p||!o||R)){A(!0);try{const t=Math.round(ae()*100);await Rt(p.id,{items:G,totalCents:t,notes:_e,orderDate:De,editedBy:o.id}),await Pe(),await Y();const l=(await Qe()).find(d=>d.id===p.id);l&&ie(l),Z(!1),alert("Invoice updated successfully!")}catch(t){console.error("Error updating invoice:",t),alert(`Error updating invoice: ${t.message}`)}A(!1)}},Xe=async()=>{if(!(!X||Object.keys(Q).length===0||R||!o)){A(!0);try{const t=Math.round(Oe()*100),a=`HM-${Date.now()}`,l=!D;await Mt({createdBy:o.id,orderNumber:a,orderDate:ke,items:Q,totalCents:t,notes:we,isClientOrder:l}),Ne({}),ve(!1),Ce(""),Se(new Date().toISOString().split("T")[0]),await Y(),alert(l?"Order submitted successfully! An email has been sent to both you and Local Effort.":"Order created successfully!")}catch(t){console.error("Error submitting order:",t),alert("Error submitting order. Please try again.")}A(!1)}},Ze=async()=>{if(!(!L.orderId||!L.reason.trim()||R)){A(!0);try{await fetch("/api/happymonday/refund-request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:p.id,orderNumber:p.order_number,reason:L.reason,userEmail:o.email})}),alert(`Refund request submitted for order ${p.order_number||p.id}`),ze({orderId:null,reason:""})}catch(t){console.error("Error submitting refund request:",t),alert("Error submitting refund request. Please try again.")}A(!1)}},et=async t=>{if(!(!D||!confirm("Mark this order as paid? This will apply any available credits and close the invoice."))){A(!0);try{const{data:a,error:l}=await C.rpc("mark_happymonday_order_paid",{p_order_id:t,p_processed_by:o.id});if(l)throw l;await Y();const d=a;let w=`Order marked as paid!

`;d.credit_used>0&&(w+=`Credit applied: $${(d.credit_used/100).toFixed(2)}
`,w+=`New credit balance: $${Math.abs(d.new_credit_balance/100).toFixed(2)}
`,d.amount_remaining>0&&(w+=`
Remaining amount due: $${(d.amount_remaining/100).toFixed(2)}`)),alert(w)}catch(a){console.error("Error updating order:",a),alert("Error updating order. Please try again.")}A(!1)}},tt=t=>{const a=Object.entries(t.items).map(([d,w])=>{const k=re(parseInt(d)),B=k?k.price*w:0;return`
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${k?k.name:`Item ${d}`}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${w}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${k?k.price.toFixed(2):"0.00"}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">$${B.toFixed(2)}</td>
        </tr>
      `}).join(""),l=window.open("","_blank");l.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${t.order_number||t.id}</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              color: #1e293b;
            }
            .header {
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0 0 10px 0;
              color: #1e293b;
              font-size: 28px;
            }
            .header p {
              margin: 0;
              color: #64748b;
            }
            .invoice-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .details-section {
              flex: 1;
            }
            .details-section h3 {
              font-size: 14px;
              text-transform: uppercase;
              color: #64748b;
              margin: 0 0 10px 0;
              font-weight: 600;
            }
            .details-section p {
              margin: 5px 0;
              font-size: 14px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .status-paid { background: #d1fae5; color: #065f46; }
            .status-unpaid { background: #fed7aa; color: #92400e; }
            .status-partial { background: #fef3c7; color: #92400e; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background: #f1f5f9;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              font-size: 14px;
              text-transform: uppercase;
              color: #475569;
            }
            th:nth-child(2), th:nth-child(3), th:nth-child(4) {
              text-align: right;
            }
            .total-row {
              background: #f8fafc;
              font-weight: 700;
              font-size: 18px;
            }
            .total-row td {
              padding: 16px 12px;
              border-top: 2px solid #3b82f6;
            }
            .notes {
              background: #f8fafc;
              padding: 16px;
              border-radius: 8px;
              margin-top: 30px;
            }
            .notes h3 {
              margin: 0 0 8px 0;
              font-size: 14px;
              text-transform: uppercase;
              color: #64748b;
            }
            .notes p {
              margin: 0;
              font-size: 14px;
              line-height: 1.6;
            }
            .print-button {
              background: #3b82f6;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              margin-bottom: 20px;
            }
            .print-button:hover {
              background: #2563eb;
            }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print()">🖨️ Print Invoice</button>
          
          <div class="header">
            <h1>Local Effort Food</h1>
            <p>Happy Monday Partnership Invoice</p>
          </div>

          <div class="invoice-details">
            <div class="details-section">
              <h3>Invoice Details</h3>
              <p><strong>Invoice #:</strong> ${t.order_number||t.id}</p>
              <p><strong>Date:</strong> ${U(t.order_date)}</p>
              <p><strong>Status:</strong> <span class="status-badge status-${t.status}">${t.status.toUpperCase()}</span></p>
            </div>
            ${t.user?`
              <div class="details-section">
                <h3>Bill To</h3>
                <p><strong>Happy Monday</strong></p>
                <p>${t.user.email}</p>
              </div>
            `:""}
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${a}
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">Total Amount:</td>
                <td style="text-align: right; color: #3b82f6;">$${(t.total_cents/100).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          ${t.notes?`
            <div class="notes">
              <h3>Notes</h3>
              <p>${t.notes}</p>
            </div>
          `:""}
        </body>
      </html>
    `),l.document.close()},re=t=>n.find(a=>a.id===t),at=g.useMemo(()=>{const t=new Set(n.map(a=>a.category));return Array.from(t).sort()},[n]),u=g.useMemo(()=>{if(!(M!=null&&M.length))return{detailedRows:[],itemSummary:[],totals:{revenue:0,quantity:0,pizzaQuantity:0,pizzaRevenue:0,creditIssued:0},filteredOrdersCount:0};const t=h.startDate?Ee(h.startDate):null,a=h.endDate?Ee(h.endDate):null;a&&a.setHours(23,59,59,999);const l=h.searchText.trim().toLowerCase(),d=M.filter(c=>{const E=c.order_date?Ee(c.order_date):null;return!(t&&E&&E<t||a&&E&&E>a||h.status!=="all"&&c.status!==h.status)}),w=[];d.forEach(c=>{c!=null&&c.items&&Object.entries(c.items).forEach(([E,b])=>{const ne=Number(b)||0;if(ne===0)return;const H=re(parseInt(E,10)),fe=(H==null?void 0:H.category)||"Other",je=(H==null?void 0:H.name)||`Item ${E}`,qe=(H==null?void 0:H.price)??0,bt=qe*ne,gt=h.category==="all"||fe===h.category,xt=!l||[je,fe,c.order_number,c.notes].some(he=>he==null?void 0:he.toLowerCase().includes(l));!gt||!xt||w.push({orderId:c.id,orderNumber:c.order_number||c.id,date:c.order_date,status:c.status,notes:c.notes,itemId:parseInt(E,10),name:je,category:fe,quantity:ne,unitPrice:qe,total:bt})})});const k=new Map;w.forEach(c=>{k.has(c.name)||k.set(c.name,{name:c.name,category:c.category,quantity:0,total:0,orderNumbers:new Set});const E=k.get(c.name);E.quantity+=c.quantity,E.total+=c.total,E.orderNumbers.add(c.orderNumber)});const B=Array.from(k.values()).map(c=>({name:c.name,category:c.category,quantity:c.quantity,total:c.total,orderCount:c.orderNumbers.size})).sort((c,E)=>Math.abs(E.total)-Math.abs(c.total)),K=w.reduce((c,E)=>(c.revenue+=E.total,c.quantity+=E.quantity,E.category==="Pizza"&&(c.pizzaQuantity+=E.quantity,c.pizzaRevenue+=E.total),E.total<0&&(c.creditIssued+=E.total),c),{revenue:0,quantity:0,pizzaQuantity:0,pizzaRevenue:0,creditIssued:0});return{detailedRows:w,itemSummary:B,totals:K,filteredOrdersCount:d.length}},[M,h,n]),rt=["all","unpaid","partial","paid","refunded"],be=Oe(),ge=Object.keys(Q).length>0,J=(t,a)=>{pe(l=>({...l,[t]:a}))},Me=t=>{const a=new Date,l=new Date(a);l.setDate(a.getDate()-(t-1)),pe(d=>({...d,startDate:l.toISOString().split("T")[0],endDate:a.toISOString().split("T")[0]}))},st=()=>{const t=new Date,a=new Date(t),l=t.getDay(),d=l===0?6:l-1;a.setDate(t.getDate()-d);const w=new Date(a);w.setDate(a.getDate()+6),pe(k=>({...k,startDate:a.toISOString().split("T")[0],endDate:w.toISOString().split("T")[0]}))},F=t=>`${t<0?"-":""}$${Math.abs(t).toFixed(2)}`,lt=()=>h.startDate&&h.endDate?`${U(h.startDate)} – ${U(h.endDate)}`:h.startDate?`From ${U(h.startDate)}`:h.endDate?`Through ${U(h.endDate)}`:"All Dates",nt=()=>{if(!u.detailedRows.length){alert("No data to export for the selected filters.");return}const t=b=>b==null?'""':`"${b.toString().replace(/"/g,'""')}"`;if(typeof window>"u"||typeof document>"u")return;const a=["Order #","Date","Status","Item","Category","Quantity","Unit Price","Line Total","Notes"],l=u.detailedRows.map(b=>[b.orderNumber,b.date?b.date.split("T")[0]:"",b.status,b.name,b.category,b.quantity,b.unitPrice.toFixed(2),b.total.toFixed(2),b.notes||""].map(t).join(",")),d=[a.map(t).join(","),...l].join(`
`),w=new Blob([d],{type:"text/csv;charset=utf-8;"}),k=URL.createObjectURL(w),B=h.startDate||"start",K=h.endDate||"end",c=`happy-monday-report-${B}-to-${K}.csv`,E=document.createElement("a");E.href=k,E.setAttribute("download",c),document.body.appendChild(E),E.click(),document.body.removeChild(E),setTimeout(()=>URL.revokeObjectURL(k),1e3)},Re=({includePrintButton:t=!1}={})=>{const a=lt(),l=h.status==="all"?"All statuses":h.status.toUpperCase(),d=h.category==="all"?"All categories":h.category,w=h.searchText?I(h.searchText):"—",k=I((o==null?void 0:o.email)||"Happy Monday user"),B=I(new Date().toLocaleString()),K=u.itemSummary.length?u.itemSummary.map(b=>`
        <tr>
          <td>${I(b.name)}</td>
          <td>${I(b.category)}</td>
          <td style="text-align:right;">${b.quantity}</td>
          <td style="text-align:right;">${F(b.total)}</td>
          <td style="text-align:right;">${b.orderCount}</td>
        </tr>
      `).join(""):'<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:16px;">No items match the selected filters.</td></tr>',c=u.detailedRows.length?u.detailedRows.map(b=>`
        <tr>
          <td>${I(b.orderNumber)}</td>
          <td>${I(U(b.date))}</td>
          <td>${I(b.status.toUpperCase())}</td>
          <td>
            <div style="font-weight:600; color:#0f172a;">${I(b.name)}</div>
            <div style="font-size:12px; color:#64748b;">${I(b.category)}</div>
            ${b.notes?`<div style="margin-top:4px; font-size:11px; color:#94a3b8;">${I(b.notes)}</div>`:""}
          </td>
          <td style="text-align:right; ${b.quantity<0?"color:#dc2626;":""}">${b.quantity}</td>
          <td style="text-align:right;">${F(b.unitPrice)}</td>
          <td style="text-align:right; ${b.total<0?"color:#dc2626;":"color:#0f172a;"}">${F(b.total)}</td>
        </tr>
      `).join(""):'<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:16px;">No line items match the selected filters.</td></tr>';return`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Happy Monday Report</title>
    <style>
      @media print {
        body { margin: 0; }
        .print-button { display: none; }
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        padding: 40px;
        max-width: 900px;
        margin: 0 auto;
        background: #f1f5f9;
        color: #0f172a;
      }
      .card {
        background: #ffffff;
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
      }
      .header {
        border-bottom: 3px solid #3b82f6;
        padding-bottom: 24px;
        margin-bottom: 24px;
      }
      .header h1 {
        margin: 0;
        font-size: 32px;
        color: #0f172a;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .meta-tile {
        background: #f8fafc;
        border-radius: 12px;
        padding: 16px;
        border: 1px solid #e2e8f0;
      }
      .meta-tile span {
        display: block;
        font-size: 12px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #64748b;
      }
      .meta-tile strong {
        display: block;
        margin-top: 6px;
        font-size: 16px;
        color: #0f172a;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 32px;
      }
      thead {
        background: #eff6ff;
        color: #1d4ed8;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 12px;
      }
      th, td {
        padding: 14px 16px;
        border-bottom: 1px solid #e2e8f0;
      }
      th {
        text-align: left;
      }
      tbody tr:last-child td {
        border-bottom: none;
      }
      .summary-callout {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 20px;
        margin-bottom: 32px;
      }
      .summary-callout .tile {
        border-radius: 16px;
        padding: 20px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .summary-callout .tile h3 {
        margin: 0;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
      }
      .summary-callout .tile p {
        margin: 8px 0 0;
        font-size: 24px;
        font-weight: 700;
      }
      .print-button {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        margin-bottom: 20px;
      }
      .print-button:hover {
        background: #2563eb;
      }
    </style>
  </head>
  <body>
    ${t?`
      <button class="print-button" onclick="window.print()">🖨️ Save / Print</button>
    `:""}
    <div class="card">
      <div class="header">
        <h1>Local Effort ↔ Happy Monday</h1>
        <p style="margin:8px 0 0; color:#475569;">Custom invoice-style report</p>
      </div>

      <div class="meta-grid">
        <div class="meta-tile">
          <span>Date Range</span>
          <strong>${I(a)}</strong>
        </div>
        <div class="meta-tile">
          <span>Status</span>
          <strong>${I(l)}</strong>
        </div>
        <div class="meta-tile">
          <span>Category</span>
          <strong>${I(d)}</strong>
        </div>
        <div class="meta-tile">
          <span>Search</span>
          <strong>${w}</strong>
        </div>
      </div>

      <div class="meta-grid" style="margin-top:0;">
        <div class="meta-tile">
          <span>Requested By</span>
          <strong>${k}</strong>
        </div>
        <div class="meta-tile">
          <span>Generated</span>
          <strong>${B}</strong>
        </div>
        <div class="meta-tile">
          <span>Invoices Matched</span>
          <strong>${u.filteredOrdersCount}</strong>
        </div>
        <div class="meta-tile">
          <span>Line Items</span>
          <strong>${u.detailedRows.length}</strong>
        </div>
      </div>

      <div class="summary-callout">
        <div class="tile">
          <h3>Net Sales</h3>
          <p>${F(u.totals.revenue)}</p>
        </div>
        <div class="tile">
          <h3>Units Moved</h3>
          <p>${u.totals.quantity}</p>
        </div>
        <div class="tile">
          <h3>Pizza Sales</h3>
          <p>${F(u.totals.pizzaRevenue)}</p>
          <span style="font-size:12px; color:#64748b;">Units: ${u.totals.pizzaQuantity}</span>
        </div>
        <div class="tile">
          <h3>Credits / Adjustments</h3>
          <p style="color:#dc2626;">${F(u.totals.creditIssued)}</p>
        </div>
      </div>

      <h2 style="margin-bottom:12px;">Item Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th style="text-align:right;">Quantity</th>
            <th style="text-align:right;">Net</th>
            <th style="text-align:right;">Invoices</th>
          </tr>
        </thead>
        <tbody>
          ${K}
        </tbody>
      </table>

      <h2 style="margin-bottom:12px;">Line Items</h2>
      <table>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Date</th>
            <th>Status</th>
            <th>Item</th>
            <th style="text-align:right;">Qty</th>
            <th style="text-align:right;">Unit</th>
            <th style="text-align:right;">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${c}
        </tbody>
      </table>
    </div>
  </body>
</html>`},ot=()=>{if(!u.detailedRows.length){alert("Add at least one line item by adjusting the filters before exporting.");return}if(typeof window>"u")return;const t=Re({includePrintButton:!0}),a=window.open("","_blank");if(!a){alert("Your browser blocked the PDF preview. Please allow pop-ups for this site.");return}a.document.write(t),a.document.close(),a.focus()},it=async()=>{if(!u.detailedRows.length||ee){u.detailedRows.length||alert("No data to send. Try widening your filters first.");return}Ie(!0);try{const t=Re(),a=await fetch("/api/happymonday/send-report-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({htmlContent:t,filters:h,totals:u.totals,lineItemCount:u.detailedRows.length,invoiceCount:u.filteredOrdersCount,requestedBy:(o==null?void 0:o.email)||null})}),l=await a.json().catch(()=>({}));if(!a.ok)throw new Error((l==null?void 0:l.error)||"Unable to send report email.");alert("Report emailed to both partners. Check your inbox in a moment.")}catch(t){console.error("[HappyMonday] Error emailing report:",t),alert(t.message||"Failed to email report.")}finally{Ie(!1)}};if(x)return e.createElement("div",{className:"min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center"},e.createElement("div",{className:"text-center"},e.createElement("div",{className:"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"}),e.createElement("p",{className:"text-slate-600"},"Loading...")));if(!r)return e.createElement("div",{className:"min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4"},e.createElement("div",{className:"bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"},e.createElement("div",{className:"text-center mb-8"},e.createElement("h1",{className:"text-3xl font-bold text-slate-800 mb-2"},"Local Effort ↔ Happy Monday"),e.createElement("p",{className:"text-slate-600"},"Trade Order System")),e.createElement("button",{onClick:q,disabled:N,className:`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-4 ${N?"bg-slate-300 text-slate-500 cursor-not-allowed":"bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-300"}`},e.createElement("svg",{className:"w-5 h-5",viewBox:"0 0 24 24"},e.createElement("path",{fill:"#4285F4",d:"M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"}),e.createElement("path",{fill:"#34A853",d:"M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"}),e.createElement("path",{fill:"#FBBC05",d:"M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"}),e.createElement("path",{fill:"#EA4335",d:"M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"})),"Sign in with Google"),e.createElement("div",{className:"relative my-6"},e.createElement("div",{className:"absolute inset-0 flex items-center"},e.createElement("div",{className:"w-full border-t border-slate-300"})),e.createElement("div",{className:"relative flex justify-center text-sm"},e.createElement("span",{className:"px-2 bg-white text-slate-500"},"or sign in with email"))),e.createElement("form",{onSubmit:P,className:"space-y-4"},e.createElement("div",null,e.createElement("label",{htmlFor:"email",className:"block text-sm font-medium text-slate-700 mb-2"},"Email"),e.createElement("input",{id:"email",type:"email",value:i,onChange:t=>f(t.target.value),placeholder:"your@email.com",className:"w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",required:!0,disabled:N})),e.createElement("div",null,e.createElement("label",{htmlFor:"password",className:"block text-sm font-medium text-slate-700 mb-2"},"Password"),e.createElement("input",{id:"password",type:"password",value:y,onChange:t=>z(t.target.value),placeholder:"••••••••",className:"w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",required:!0,disabled:N})),e.createElement("button",{type:"submit",disabled:N||!i||!y,className:`w-full py-3 px-4 rounded-lg font-medium transition-colors ${N||!i||!y?"bg-slate-300 text-slate-500 cursor-not-allowed":"bg-blue-500 hover:bg-blue-600 text-white"}`},N?"Signing in...":"Sign In")),e.createElement("div",{className:"mt-6 p-3 bg-slate-50 rounded-lg border border-slate-200"},e.createElement("p",{className:"text-xs text-slate-600 text-center"},"Authorized users only. Contact ",e.createElement("a",{href:"mailto:hello@localeffortfood.com",className:"text-blue-600 hover:underline"},"hello@localeffortfood.com")," for access."))));const se=t=>`$${(Math.abs(t||0)/100).toFixed(2)}`,Te=(s==null?void 0:s.open_invoice_total_cents)??M.filter(t=>t.status==="unpaid"||t.status==="partial").reduce((t,a)=>t+a.total_cents,0),ct=(s==null?void 0:s.closed_invoice_total_cents)??M.filter(t=>t.status==="paid"||t.status==="refunded").reduce((t,a)=>t+a.total_cents,0),dt=(s==null?void 0:s.open_invoice_count)??M.filter(t=>t.status==="unpaid"||t.status==="partial").length,mt=(s==null?void 0:s.closed_invoice_count)??M.filter(t=>t.status==="paid"||t.status==="refunded").length,le=(s==null?void 0:s.balance_drift_cents)??0,xe=(Te||0)+((s==null?void 0:s.balance_cents)||0),ut=((s==null?void 0:s.balance_cents)||0)<0?"text-green-600":"text-red-600",pt=((s==null?void 0:s.balance_cents)||0)<0?"Credit Available":"Balance Due";return e.createElement("div",{className:"min-h-screen bg-gradient-to-br from-slate-50 to-blue-50"},e.createElement("div",{className:"container mx-auto px-4 py-8 max-w-4xl"},e.createElement("div",{className:"bg-white rounded-2xl shadow-xl p-6 mb-6"},e.createElement("div",{className:"flex justify-between items-start mb-4"},e.createElement("div",null,e.createElement("h1",{className:"text-4xl font-bold text-slate-800 mb-2"},"Local Effort ↔ Happy Monday"),e.createElement("p",{className:"text-slate-600"},"Trade Order System"),e.createElement("p",{className:"text-sm text-slate-500 mt-1"},"Logged in as: ",o==null?void 0:o.email," (",D?"Admin":"Client",")")),e.createElement("button",{onClick:m,className:"px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"},"Sign Out")),s&&e.createElement("div",{className:"flex justify-between items-center p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border-2 border-blue-200"},e.createElement("div",null,e.createElement("p",{className:"text-sm font-medium text-slate-600 uppercase tracking-wide"},pt),e.createElement("p",{className:`text-3xl font-bold ${ut}`},se(s.balance_cents)),s.opening_credit_cents>0&&e.createElement("p",{className:"text-xs text-slate-500 mt-1"},"Opening credit: ",se(s.opening_credit_cents)),Math.abs(le)>0&&e.createElement("p",{className:"text-xs text-amber-700 mt-1"},"Stored balance was off by ",se(le),"; auto-synced to the canonical ledger.")),!D&&((s==null?void 0:s.balance_cents)||0)>0&&e.createElement("button",{onClick:()=>ce(!0),className:"px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"},e.createElement(Be,{size:20}),"Make Payment"))),e.createElement("div",{className:"flex justify-center mb-8"},e.createElement("div",{className:"bg-white rounded-xl p-1 shadow-lg"},e.createElement("button",{onClick:()=>W("order"),className:`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${O==="order"?"bg-blue-500 text-white shadow-md":"text-slate-600 hover:text-blue-500"}`},e.createElement(Nt,{size:20})," New Order"),e.createElement("button",{onClick:()=>W("invoices"),className:`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${O==="invoices"?"bg-blue-500 text-white shadow-md":"text-slate-600 hover:text-blue-500"}`},e.createElement(Ue,{size:20})," Past Orders"),e.createElement("button",{onClick:()=>W("reports"),className:`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${O==="reports"?"bg-blue-500 text-white shadow-md":"text-slate-600 hover:text-blue-500"}`},e.createElement(Le,{size:20})," Reports"),(o==null?void 0:o.email)!=="hello@happymonday.company"&&e.createElement("button",{onClick:()=>W("costing"),className:`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${O==="costing"?"bg-blue-500 text-white shadow-md":"text-slate-600 hover:text-blue-500"}`},e.createElement($t,{size:20})," Costing"))),O==="order"&&e.createElement("div",{className:"grid lg:grid-cols-3 gap-8"},e.createElement("div",{className:"lg:col-span-2"},e.createElement("div",{className:"bg-white rounded-2xl shadow-xl p-6"},e.createElement("h2",{className:"text-2xl font-bold text-slate-800 mb-4"},"Available Items"),e.createElement("div",{className:"bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"},e.createElement("p",{className:"text-sm text-blue-800"},e.createElement("strong",null,"Tip:")," Use negative quantities to receive credit. For example, -3 sandwiches gives you $15.30 credit instead of charging you. This is useful for returns, credits, or promotional adjustments.")),e.createElement("div",{className:"grid gap-4"},n.map(t=>{const a=Q[t.id]||0;return e.createElement("div",{key:t.id,className:"flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"},e.createElement("div",{className:"flex-1"},e.createElement("h3",{className:"font-semibold text-slate-800"},t.name),e.createElement("p",{className:"text-sm text-slate-500"},t.category),e.createElement("p",{className:"text-lg font-bold text-blue-600"},"$",t.price.toFixed(2))),e.createElement("div",{className:"flex items-center gap-3"},e.createElement("button",{onClick:()=>Fe(t.id,-1),className:"w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"},e.createElement(ye,{size:16})),e.createElement("span",{className:`w-12 text-center font-medium ${a<0?"text-red-600":""}`},a),e.createElement("button",{onClick:()=>Fe(t.id,1),className:"w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"},e.createElement(oe,{size:16}))))})))),e.createElement("div",{className:"lg:col-span-1"},e.createElement("div",{className:"bg-white rounded-2xl shadow-xl p-6 sticky top-8"},e.createElement("h2",{className:"text-2xl font-bold text-slate-800 mb-6"},"Order Summary"),e.createElement("div",{className:"mb-4"},e.createElement("label",{htmlFor:"hm-order-date",className:"block text-sm font-medium text-slate-700 mb-2"},"Order Date"),e.createElement("input",{id:"hm-order-date",type:"date",value:ke,onChange:t=>Se(t.target.value),className:"w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"})),ge?e.createElement("div",{className:"space-y-2 mb-4"},Object.entries(Q).map(([t,a])=>{const l=re(parseInt(t)),d=l.price*a;return e.createElement("div",{key:t,className:"flex justify-between text-sm"},e.createElement("span",{className:a<0?"text-red-600":""},l.name," × ",a),e.createElement("span",{className:d<0?"text-red-600":""},"$",d.toFixed(2)))})):e.createElement("p",{className:"text-slate-500 text-center py-4"},"No items selected"),e.createElement("div",{className:"border-t pt-4 mb-6"},e.createElement("div",{className:"flex justify-between items-start"},e.createElement("div",null,e.createElement("span",{className:"text-xl font-bold"},"Total:"),be<0&&e.createElement("p",{className:"text-xs text-red-600 mt-1"},"Credit amount")),e.createElement("span",{className:`text-xl font-bold ${be<0?"text-red-600":"text-blue-600"}`},"$",be.toFixed(2)))),e.createElement("div",{className:"mb-6"},e.createElement("label",{htmlFor:"hm-special-instructions",className:"block text-sm font-medium text-slate-700 mb-2"},"Special Instructions"),e.createElement("textarea",{id:"hm-special-instructions",value:we,onChange:t=>Ce(t.target.value),className:"w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none",rows:"3",placeholder:"Any special requests or notes..."})),e.createElement("div",{className:"mb-6"},e.createElement("label",{className:"flex items-center gap-2 cursor-pointer"},e.createElement("input",{type:"checkbox",checked:X,onChange:t=>ve(t.target.checked),className:"w-4 h-4 text-blue-500 border-slate-300 rounded focus:ring-blue-500"}),e.createElement("span",{className:"text-sm text-slate-700"},"I confirm this order is correct"))),e.createElement("button",{onClick:Xe,disabled:!X||!ge||R,className:`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${X&&ge&&!R?"bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl":"bg-slate-200 text-slate-400 cursor-not-allowed"}`},e.createElement(zt,{size:20}),R?"Submitting...":"Submit Order")))),O==="invoices"&&!p&&e.createElement("div",{className:"bg-white rounded-2xl shadow-xl p-6"},e.createElement("h2",{className:"text-2xl font-bold text-slate-800 mb-6"},"Past Orders"),D&&M.length>0&&e.createElement("div",{className:"mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200"},e.createElement("h3",{className:"text-lg font-bold text-slate-800 mb-4"},"Financial Summary"),e.createElement("div",{className:"grid md:grid-cols-2 xl:grid-cols-4 gap-6"},e.createElement("div",null,e.createElement("p",{className:"text-sm font-medium text-slate-600 uppercase tracking-wide mb-1"},"Closed Invoices"),e.createElement("p",{className:"text-3xl font-bold text-slate-800"},"$",(ct/100).toFixed(2)),e.createElement("p",{className:"text-xs text-slate-500 mt-1"},mt," closed invoices")),e.createElement("div",null,e.createElement("p",{className:"text-sm font-medium text-slate-600 uppercase tracking-wide mb-1"},"Total Open Invoices"),e.createElement("p",{className:"text-3xl font-bold text-orange-600"},"$",(Te/100).toFixed(2)),e.createElement("p",{className:"text-xs text-slate-500 mt-1"},dt," unpaid/partial")),e.createElement("div",null,e.createElement("p",{className:"text-sm font-medium text-slate-600 uppercase tracking-wide mb-1"},"Client Standing Credit"),e.createElement("p",{className:`text-3xl font-bold ${((s==null?void 0:s.balance_cents)||0)<0?"text-green-600":"text-slate-600"}`},"$",Math.abs(((s==null?void 0:s.balance_cents)||0)/100).toFixed(2)),e.createElement("p",{className:"text-xs text-slate-500 mt-1"},((s==null?void 0:s.balance_cents)||0)<0?"Credit available":"No credit")),e.createElement("div",null,e.createElement("p",{className:"text-sm font-medium text-slate-600 uppercase tracking-wide mb-1"},"Net After Credit"),e.createElement("p",{className:`text-3xl font-bold ${xe<0?"text-green-600":"text-blue-600"}`},"$",(xe/100).toFixed(2)),e.createElement("p",{className:"text-xs text-slate-500 mt-1"},xe<0?"Credit remains after open invoices":"Amount owed after applying credit"))),Math.abs(le)>0&&e.createElement("p",{className:"text-xs text-amber-700 mt-4"},"Stored balance differed from canonical ledger by ",se(le),"; numbers above use the canonical calculation.")),M.length===0?e.createElement("p",{className:"text-slate-500 text-center py-8"},"No orders yet"):e.createElement("div",{className:"space-y-4"},M.map(t=>e.createElement("div",{key:t.id,onClick:()=>ie(t),className:"p-4 border border-slate-200 rounded-xl hover:border-blue-300 cursor-pointer transition-all hover:shadow-md"},e.createElement("div",{className:"flex justify-between items-start"},e.createElement("div",null,e.createElement("h3",{className:"font-semibold text-slate-800"},t.order_number||t.id),e.createElement("p",{className:"text-sm text-slate-500 flex items-center gap-1"},e.createElement(_t,{size:14}),U(t.order_date)),D&&t.user&&e.createElement("p",{className:"text-xs text-slate-500 mt-1"},"Client: ",t.user.email),t.notes&&e.createElement("p",{className:"text-sm text-slate-600 mt-1 flex items-center gap-1"},e.createElement(wt,{size:14}),t.notes)),e.createElement("div",{className:"text-right"},e.createElement("p",{className:"text-lg font-bold text-blue-600"},"$",(t.total_cents/100).toFixed(2)),e.createElement("span",{className:`inline-block px-2 py-1 rounded-full text-xs font-medium ${t.status==="paid"?"bg-green-100 text-green-800":t.status==="partial"?"bg-yellow-100 text-yellow-800":t.status==="refunded"?"bg-red-100 text-red-800":"bg-orange-100 text-orange-800"}`},t.status.toUpperCase()))))))),O==="invoices"&&p&&e.createElement("div",{className:"bg-white rounded-2xl shadow-xl p-6"},e.createElement("div",{className:"flex items-center justify-between mb-6"},e.createElement("div",{className:"flex items-center gap-4"},e.createElement("button",{onClick:()=>{ie(null),Z(!1)},className:"p-2 hover:bg-slate-100 rounded-lg transition-colors"},e.createElement(Dt,{size:20})),e.createElement("h2",{className:"text-2xl font-bold text-slate-800"},V?"Edit Invoice":"Invoice"," ",p.order_number||p.id)),e.createElement("div",{className:"flex gap-2"},!V&&e.createElement(e.Fragment,null,e.createElement("button",{onClick:()=>tt(p),className:"px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"},e.createElement(Ue,{size:18}),"Print"),D&&p.status==="unpaid"&&!p.is_closed&&e.createElement("button",{onClick:Ye,className:"px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"},"Edit Invoice"),D&&p.status!=="paid"&&e.createElement("button",{onClick:()=>et(p.id),className:"px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"},"Mark as Paid")),V&&e.createElement(e.Fragment,null,e.createElement("button",{onClick:Je,className:"px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg font-medium transition-colors",disabled:R},"Cancel"),e.createElement("button",{onClick:Ke,className:"px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors",disabled:R||Object.keys(G).length===0},R?"Saving...":"Save Changes")))),V?e.createElement(e.Fragment,null,e.createElement("div",{className:"mb-6"},e.createElement("div",{className:"bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4"},e.createElement("p",{className:"text-sm text-blue-800"},e.createElement("strong",null,"Edit Mode:")," You can add/remove items and adjust quantities. Use negative quantities to give credit (e.g., -3 sandwiches gives customer $15.30 credit instead of charging them).")),e.createElement("div",{className:"mb-4"},e.createElement("label",{htmlFor:"edit-order-date",className:"block text-sm font-medium text-slate-700 mb-2"},"Order Date"),e.createElement("input",{id:"edit-order-date",type:"date",value:De,onChange:t=>ue(t.target.value),className:"px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"})),e.createElement("h3",{className:"font-semibold text-slate-800 mb-4"},"Edit Items"),e.createElement("div",{className:"grid gap-4 mb-6"},n.map(t=>{const a=G[t.id]||0;return a===0?null:e.createElement("div",{key:t.id,className:"flex items-center justify-between p-4 border border-slate-200 rounded-xl"},e.createElement("div",{className:"flex-1"},e.createElement("h3",{className:"font-semibold text-slate-800"},t.name),e.createElement("p",{className:"text-sm text-slate-500"},t.category),e.createElement("p",{className:"text-lg font-bold text-blue-600"},"$",t.price.toFixed(2))),e.createElement("div",{className:"flex items-center gap-3"},e.createElement("button",{onClick:()=>te(t.id,-1),className:"w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"},e.createElement(ye,{size:16})),e.createElement("span",{className:`w-12 text-center font-medium ${a<0?"text-red-600":""}`},a),e.createElement("button",{onClick:()=>te(t.id,1),className:"w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"},e.createElement(oe,{size:16}))))})),e.createElement("h3",{className:"font-semibold text-slate-800 mb-4"},"Add More Items"),e.createElement("div",{className:"grid gap-4 mb-6 max-h-96 overflow-y-auto"},n.map(t=>(G[t.id]||0)!==0?null:e.createElement("div",{key:t.id,className:"flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"},e.createElement("div",{className:"flex-1"},e.createElement("h3",{className:"font-semibold text-slate-800"},t.name),e.createElement("p",{className:"text-sm text-slate-500"},t.category),e.createElement("p",{className:"text-lg font-bold text-blue-600"},"$",t.price.toFixed(2))),e.createElement("div",{className:"flex items-center gap-3"},e.createElement("button",{onClick:()=>te(t.id,-1),className:"w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors",title:"Add as credit (negative)"},e.createElement(ye,{size:16})),e.createElement("button",{onClick:()=>te(t.id,1),className:"w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"},e.createElement(oe,{size:16})))))),e.createElement("div",{className:"mb-6"},e.createElement("label",{htmlFor:"edit-notes",className:"block text-sm font-medium text-slate-700 mb-2"},"Notes"),e.createElement("textarea",{id:"edit-notes",value:_e,onChange:t=>me(t.target.value),className:"w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none",rows:"3",placeholder:"Any special requests or notes..."})),e.createElement("div",{className:"border-t pt-6"},e.createElement("div",{className:"flex justify-between items-center"},e.createElement("div",null,e.createElement("h3",{className:"font-semibold text-slate-800"},"New Total"),ae()<0&&e.createElement("p",{className:"text-sm text-red-600"},"Credit amount (will reduce customer balance)")),e.createElement("p",{className:`text-3xl font-bold ${ae()<0?"text-red-600":"text-blue-600"}`},"$",ae().toFixed(2)))))):e.createElement(e.Fragment,null,e.createElement("div",{className:"grid md:grid-cols-2 gap-6 mb-6"},e.createElement("div",null,e.createElement("h3",{className:"font-semibold text-slate-800 mb-2"},"Order Details"),e.createElement("p",{className:"text-sm text-slate-600"},"Date: ",U(p.order_date)),e.createElement("p",{className:"text-sm text-slate-600"},"Status: ",e.createElement("span",{className:`font-medium ${p.status==="paid"?"text-green-600":p.status==="partial"?"text-yellow-600":p.status==="refunded"?"text-red-600":"text-orange-600"}`},p.status.toUpperCase())),D&&p.user&&e.createElement("p",{className:"text-sm text-slate-600"},"Client: ",p.user.email),p.notes&&e.createElement("div",{className:"mt-2"},e.createElement("p",{className:"text-sm text-slate-600"},"Notes:"),e.createElement("p",{className:"text-sm text-slate-800"},p.notes))),e.createElement("div",{className:"text-right"},e.createElement("h3",{className:"font-semibold text-slate-800 mb-2"},"Total Amount"),e.createElement("p",{className:"text-3xl font-bold text-blue-600"},"$",(p.total_cents/100).toFixed(2)))),e.createElement("div",{className:"mb-6"},e.createElement("h3",{className:"font-semibold text-slate-800 mb-4"},"Items Ordered"),e.createElement("div",{className:"space-y-2"},Object.entries(p.items).map(([t,a])=>{const l=re(parseInt(t));return e.createElement("div",{key:t,className:"flex justify-between p-3 bg-slate-50 rounded-lg"},e.createElement("div",null,e.createElement("p",{className:"font-medium"},l?l.name:`Item ${t}`),e.createElement("p",{className:"text-sm text-slate-600"},"Quantity: ",a)),e.createElement("p",{className:"font-medium"},"$",l?(l.price*a).toFixed(2):"0.00"))})))),!V&&e.createElement("div",{className:"border-t pt-6"},e.createElement("h3",{className:"font-semibold text-slate-800 mb-4"},"Request Refund or Credit"),e.createElement("textarea",{value:L.orderId===p.id?L.reason:"",onChange:t=>ze({orderId:p.id,reason:t.target.value}),className:"w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-4",rows:"3",placeholder:"Please explain the reason for your refund or credit request..."}),e.createElement("button",{onClick:Ze,disabled:!L.reason.trim()||L.orderId!==p.id||R,className:`px-6 py-2 rounded-lg font-medium transition-all ${L.reason.trim()&&L.orderId===p.id&&!R?"bg-orange-500 hover:bg-orange-600 text-white":"bg-slate-200 text-slate-400 cursor-not-allowed"}`},R?"Submitting...":"Submit Refund Request"))),O==="reports"&&e.createElement("div",{className:"bg-white rounded-2xl shadow-xl p-6"},e.createElement("div",{className:"flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6"},e.createElement("div",null,e.createElement("h2",{className:"text-2xl font-bold text-slate-800"},"Custom Reports"),e.createElement("p",{className:"text-sm text-slate-500"},'Build quick breakdowns like "Pizza sales for last week" and send/save them just like invoices.')),e.createElement("div",{className:"flex flex-wrap gap-2"},e.createElement("button",{onClick:nt,disabled:!u.detailedRows.length,className:`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${u.detailedRows.length?"bg-blue-500 hover:bg-blue-600 text-white":"bg-slate-200 text-slate-500 cursor-not-allowed"}`},e.createElement(We,{size:18}),"Export CSV"),e.createElement("button",{onClick:ot,disabled:!u.detailedRows.length,className:`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${u.detailedRows.length?"bg-slate-900 hover:bg-slate-800 text-white":"bg-slate-200 text-slate-500 cursor-not-allowed"}`},e.createElement(Ct,{size:18}),"Download PDF"),e.createElement("button",{onClick:it,disabled:!u.detailedRows.length||ee,className:`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${!u.detailedRows.length||ee?"bg-slate-200 text-slate-500 cursor-not-allowed":"bg-green-600 hover:bg-green-700 text-white"}`},e.createElement(It,{size:18}),ee?"Emailing...":"Email Report"))),e.createElement("div",{className:"grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6"},e.createElement("div",{className:"p-4 border border-slate-200 rounded-xl bg-slate-50"},e.createElement("p",{className:"text-xs font-semibold text-slate-500 uppercase tracking-wide"},"Net Sales"),e.createElement("p",{className:"text-2xl font-bold text-slate-900"},F(u.totals.revenue)),e.createElement("p",{className:"text-xs text-slate-500 mt-1"},"Across ",u.filteredOrdersCount," invoices")),e.createElement("div",{className:"p-4 border border-slate-200 rounded-xl bg-slate-50"},e.createElement("p",{className:"text-xs font-semibold text-slate-500 uppercase tracking-wide"},"Units Moved"),e.createElement("p",{className:"text-2xl font-bold text-slate-900"},u.totals.quantity),e.createElement("p",{className:"text-xs text-slate-500 mt-1"},"Includes negative quantities for credits")),e.createElement("div",{className:"p-4 border border-slate-200 rounded-xl bg-slate-50"},e.createElement("p",{className:"text-xs font-semibold text-slate-500 uppercase tracking-wide"},"Pizza Sales"),e.createElement("p",{className:"text-2xl font-bold text-slate-900"},F(u.totals.pizzaRevenue)),e.createElement("p",{className:"text-xs text-slate-500 mt-1"},"Pizza units: ",u.totals.pizzaQuantity)),e.createElement("div",{className:"p-4 border border-slate-200 rounded-xl bg-slate-50"},e.createElement("p",{className:"text-xs font-semibold text-slate-500 uppercase tracking-wide"},"Credits / Adjustments"),e.createElement("p",{className:"text-2xl font-bold text-red-600"},F(u.totals.creditIssued)),e.createElement("p",{className:"text-xs text-slate-500 mt-1"},"Negative = credit back to client"))),e.createElement("div",{className:"bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6"},e.createElement("div",{className:"flex items-center gap-2 mb-4 text-slate-700 font-semibold"},e.createElement(kt,{size:16}),"Filter invoices"),e.createElement("div",{className:"grid gap-4 md:grid-cols-2 lg:grid-cols-4"},e.createElement("div",null,e.createElement("label",{htmlFor:"hm-report-start",className:"text-sm font-medium text-slate-600 mb-1 block"},"Start date"),e.createElement("input",{id:"hm-report-start",type:"date",value:h.startDate,onChange:t=>J("startDate",t.target.value),className:"w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"})),e.createElement("div",null,e.createElement("label",{htmlFor:"hm-report-end",className:"text-sm font-medium text-slate-600 mb-1 block"},"End date"),e.createElement("input",{id:"hm-report-end",type:"date",value:h.endDate,onChange:t=>J("endDate",t.target.value),className:"w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"})),e.createElement("div",null,e.createElement("label",{htmlFor:"hm-report-status",className:"text-sm font-medium text-slate-600 mb-1 block"},"Invoice status"),e.createElement("select",{id:"hm-report-status",value:h.status,onChange:t=>J("status",t.target.value),className:"w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"},rt.map(t=>e.createElement("option",{key:t,value:t},t==="all"?"All statuses":t.charAt(0).toUpperCase()+t.slice(1))))),e.createElement("div",null,e.createElement("label",{htmlFor:"hm-report-category",className:"text-sm font-medium text-slate-600 mb-1 block"},"Menu category"),e.createElement("select",{id:"hm-report-category",value:h.category,onChange:t=>J("category",t.target.value),className:"w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"},e.createElement("option",{value:"all"},"All categories"),at.map(t=>e.createElement("option",{key:t,value:t},t))))),e.createElement("div",{className:"grid gap-4 md:grid-cols-2 mt-4"},e.createElement("div",null,e.createElement("label",{htmlFor:"hm-report-search",className:"text-sm font-medium text-slate-600 mb-1 block"},"Keyword search"),e.createElement("div",{className:"relative"},e.createElement(St,{size:16,className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"}),e.createElement("input",{id:"hm-report-search",type:"text",value:h.searchText,onChange:t=>J("searchText",t.target.value),placeholder:"Pizza, sandwich, HM-123...",className:"w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"}))),e.createElement("div",{className:"flex flex-col gap-2"},e.createElement("span",{className:"text-sm font-medium text-slate-600"},"Quick ranges"),e.createElement("div",{className:"flex flex-wrap gap-2"},e.createElement("button",{onClick:st,className:"px-3 py-1.5 rounded-full border border-slate-300 text-sm hover:border-blue-400 hover:text-blue-600 transition-colors"},"This Week"),e.createElement("button",{onClick:()=>Me(7),className:"px-3 py-1.5 rounded-full border border-slate-300 text-sm hover:border-blue-400 hover:text-blue-600 transition-colors"},"Last 7 Days"),e.createElement("button",{onClick:()=>Me(30),className:"px-3 py-1.5 rounded-full border border-slate-300 text-sm hover:border-blue-400 hover:text-blue-600 transition-colors"},"Last 30 Days"))))),e.createElement("div",{className:"mb-6"},e.createElement("h3",{className:"text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2"},e.createElement(Le,{size:18})," Item breakdown"),u.itemSummary.length===0?e.createElement("p",{className:"text-sm text-slate-500"},"No items match the current filters."):e.createElement("div",{className:"overflow-x-auto border border-slate-100 rounded-xl"},e.createElement("table",{className:"w-full text-sm"},e.createElement("thead",{className:"bg-slate-50 text-slate-500 uppercase text-xs"},e.createElement("tr",null,e.createElement("th",{className:"text-left py-3 px-4"},"Item"),e.createElement("th",{className:"text-left py-3 px-4"},"Category"),e.createElement("th",{className:"text-right py-3 px-4"},"Quantity"),e.createElement("th",{className:"text-right py-3 px-4"},"Net"),e.createElement("th",{className:"text-right py-3 px-4"},"Invoices"))),e.createElement("tbody",null,u.itemSummary.map(t=>e.createElement("tr",{key:t.name,className:"border-t border-slate-100"},e.createElement("td",{className:"py-3 px-4"},e.createElement("p",{className:"font-medium text-slate-800"},t.name),e.createElement("p",{className:"text-xs text-slate-500"},F(t.total))),e.createElement("td",{className:"py-3 px-4 text-slate-600"},t.category),e.createElement("td",{className:"py-3 px-4 text-right font-semibold"},t.quantity),e.createElement("td",{className:"py-3 px-4 text-right font-semibold"},F(t.total)),e.createElement("td",{className:"py-3 px-4 text-right text-slate-600"},t.orderCount))))))),e.createElement("div",null,e.createElement("h3",{className:"text-lg font-semibold text-slate-800 mb-2"},"Line items (",u.detailedRows.length,")"),e.createElement("p",{className:"text-xs text-slate-500 mb-3"},"Showing ",u.detailedRows.length," line items from ",u.filteredOrdersCount," invoices."),u.detailedRows.length===0?e.createElement("p",{className:"text-sm text-slate-500"},"Adjust your filters to see invoice lines."):e.createElement("div",{className:"overflow-x-auto border border-slate-100 rounded-xl"},e.createElement("table",{className:"w-full text-sm"},e.createElement("thead",{className:"bg-slate-50 text-slate-500 uppercase text-xs"},e.createElement("tr",null,e.createElement("th",{className:"text-left py-3 px-4"},"Order #"),e.createElement("th",{className:"text-left py-3 px-4"},"Date"),e.createElement("th",{className:"text-left py-3 px-4"},"Status"),e.createElement("th",{className:"text-left py-3 px-4"},"Item"),e.createElement("th",{className:"text-right py-3 px-4"},"Qty"),e.createElement("th",{className:"text-right py-3 px-4"},"Unit"),e.createElement("th",{className:"text-right py-3 px-4"},"Line total"))),e.createElement("tbody",null,u.detailedRows.map(t=>e.createElement("tr",{key:`${t.orderId}-${t.itemId}-${t.name}-${t.quantity}-${t.total}-${t.date}`,className:"border-t border-slate-100"},e.createElement("td",{className:"py-3 px-4 font-medium text-slate-800"},t.orderNumber),e.createElement("td",{className:"py-3 px-4 text-slate-600"},U(t.date)),e.createElement("td",{className:"py-3 px-4"},e.createElement("span",{className:`px-2 py-1 rounded-full text-xs font-semibold ${t.status==="paid"?"bg-green-100 text-green-700":t.status==="partial"?"bg-yellow-100 text-yellow-700":t.status==="refunded"?"bg-red-100 text-red-700":"bg-slate-100 text-slate-700"}`},t.status.toUpperCase())),e.createElement("td",{className:"py-3 px-4 text-slate-700"},e.createElement("p",{className:"font-medium"},t.name),e.createElement("p",{className:"text-xs text-slate-500"},t.category)),e.createElement("td",{className:`py-3 px-4 text-right font-semibold ${t.quantity<0?"text-red-600":""}`},t.quantity),e.createElement("td",{className:"py-3 px-4 text-right"},F(t.unitPrice)),e.createElement("td",{className:`py-3 px-4 text-right font-semibold ${t.total<0?"text-red-600":"text-slate-900"}`},F(t.total))))))))),O==="costing"&&e.createElement(qt,{items:n}),Ge&&_&&s&&e.createElement(At,{userId:_,currentBalance:s.balance_cents,onClose:()=>ce(!1),onSuccess:()=>{ce(!1),Y()}})))};export{aa as default};
