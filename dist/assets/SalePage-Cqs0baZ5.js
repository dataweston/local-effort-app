import{r as n,R as t,m as f,F as h,C as b,W as w}from"./index-DzB0w3HL.js";import{P as E}from"./ProductCard-BcWAfmG8.js";import{C as x}from"./CheckoutPanel-931UBd1q.js";import{P as k,p as v}from"./portableTextComponents-BPisHdDy.js";const P=()=>{const[m,y]=n.useState([]),[o,d]=n.useState(!0),c=n.useRef(null),l=n.useRef(null),i=["2f4a4f32-21ae-47fc-bcf1-f4e2439294bc_3000.jpg","819af5c9-a882-4a4d-a1f1-357762a78ebd_3000.jpg","927eec02-f5a6-4501-8a83-edd2af06f973_3000.jpg","a847c096-4191-454a-82a2-35e6fd246b2a_2645.jpg","DP-14936-049.jpg","DP-15526-010.jpg","DP-30169-001.jpg","DP800004.jpg","DP823463.jpg","DP885938.jpg","DPB874625.jpg","DT1939.jpg","DT4854.jpg"],u=n.useCallback(async()=>{try{const r=await fetch("/api/search-images?query=pie&per_page=50");return r.ok?((await r.json()).images||[]).map(e=>{var s;return{id:e.asset_id||e.public_id,url:e.thumbnail_url||e.large_url,alt:((s=e.context)==null?void 0:s.alt)||"Pie image",source:"cloudinary"}}):[]}catch(r){return console.error("Error fetching Cloudinary images:",r),[]}},[]);return n.useEffect(()=>{let r=!0;return(async()=>{d(!0);const e=await u(),s=i.map((p,g)=>({id:`local-${g}`,url:`/images/${p}`,alt:`Sale image ${g+1}`,source:"local"}));if(r){const g=[...s,...e].sort(()=>Math.random()-.5);y(g),d(!1)}})(),()=>{r=!1}},[u]),n.useEffect(()=>{if(!c.current||m.length===0||o)return;const r=async()=>{if(window.Packery&&window.Draggabilly){a();return}if(!window.Packery){const e=document.createElement("script");e.src="https://unpkg.com/packery@2/dist/packery.pkgd.min.js",e.async=!0,document.body.appendChild(e),await new Promise(s=>{e.onload=s})}if(!window.Draggabilly){const e=document.createElement("script");e.src="https://unpkg.com/draggabilly@2/dist/draggabilly.pkgd.min.js",e.async=!0,document.body.appendChild(e),await new Promise(s=>{e.onload=s})}a()},a=()=>{!window.Packery||!c.current||setTimeout(()=>{try{const e=new window.Packery(c.current,{itemSelector:".masonry-item",gutter:12,percentPosition:!0,transitionDuration:"0.3s"});l.current=e,e.getItemElements().forEach(s=>{const p=new window.Draggabilly(s);e.bindDraggabillyEvents(p)})}catch(e){console.error("Error initializing Packery:",e)}},100)};return r(),()=>{l.current&&l.current.destroy&&l.current.destroy()}},[m,o]),o?t.createElement("div",{className:"flex items-center justify-center min-h-[400px]"},t.createElement("p",{className:"text-neutral-600 text-lg"},"Loading gallery...")):t.createElement("div",{className:"w-full py-4"},t.createElement("div",{ref:c,className:"masonry-grid"},m.map((r,a)=>t.createElement(f.div,{key:r.id,className:"masonry-item",initial:{opacity:0,scale:.9},animate:{opacity:1,scale:1},transition:{delay:a*.02,duration:.3},style:{width:`${Math.random()>.5?"25%":"33.333%"}`}},t.createElement("div",{className:"masonry-item-content"},t.createElement("img",{src:r.url,alt:r.alt,loading:"lazy",className:"w-full h-auto rounded-lg"}))))),t.createElement("style",{jsx:!0},`
        .masonry-grid {
          position: relative;
        }

        .masonry-item {
          float: left;
          padding: 6px;
          cursor: move;
          cursor: grab;
        }

        .masonry-item:active {
          cursor: grabbing;
        }

        .masonry-item-content {
          border: 3px solid #e5e7eb;
          border-radius: 12px;
          padding: 8px;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .masonry-item-content:hover {
          border-color: #f97316;
          box-shadow: 0 8px 16px rgba(249, 115, 22, 0.2);
          transform: translateY(-4px) scale(1.02);
        }

        .masonry-item-content img {
          display: block;
          transition: transform 0.3s ease;
        }

        .masonry-item-content:hover img {
          transform: scale(1.05);
        }

        .masonry-item.is-dragging {
          z-index: 100;
          opacity: 0.8;
        }

        .masonry-item.is-positioning-post-drag {
          transition: transform 0.4s ease;
        }
      `))},D=()=>{const{totalQty:m,openCart:y}=h(),[o,d]=n.useState([]),[c,l]=n.useState(!0),[i,u]=n.useState({subheading:"",intro:[]});n.useEffect(()=>{let a=!0;return(async()=>{try{const e=await fetch("/api/store/products?store=sale"),s=e.ok?await e.json():{products:[]};if(!a)return;d(Array.isArray(s.products)?s.products:[])}catch{if(!a)return;d([])}finally{a&&l(!1)}})(),(async()=>{try{const e=await b.fetch('*[_type == "salePage"][0]{ subheading, intro }').catch(()=>null);if(!a)return;e&&u({subheading:e.subheading||"",intro:Array.isArray(e.intro)?e.intro:[]})}catch{}})(),()=>{a=!1}},[]);const r=n.useMemo(()=>({"@context":"https://schema.org","@type":"ItemList",name:"Sale",itemListElement:(o||[]).map((e,s)=>({"@type":"ListItem",position:s+1,item:{"@type":"Product",name:e.title,image:Array.isArray(e.images)?e.images.filter(Boolean):e.images?[e.images]:[],description:e.shortDescription,sku:e.squareVariationId||e.squareItemId||e.id,offers:{"@type":"Offer",priceCurrency:"USD",price:(e.salePrice??e.price)/100,availability:"https://schema.org/InStock"}}}))}),[o]);return t.createElement("div",{className:"relative min-h-screen"},t.createElement(w,null,t.createElement("title",null,"SALE | Local Effort"),t.createElement("meta",{name:"description",content:"Shop Local Effort sale items. Pickup/local service with on-site checkout."}),t.createElement("link",{rel:"canonical",href:"https://localeffortfood.com/sale"}),t.createElement("script",{type:"application/ld+json"},JSON.stringify(r))),t.createElement("div",{className:"fixed inset-0 overflow-y-auto",style:{zIndex:0}},t.createElement(P,null)),t.createElement("div",{className:"relative",style:{zIndex:10}},t.createElement("div",{className:"mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8"},t.createElement("div",{className:"flex items-start justify-between mb-4 gap-4 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-md"},t.createElement("div",null,t.createElement("h1",{className:"heading-xl heading-balance"},"Sale"),i.subheading&&t.createElement("p",{className:"mt-1 text-neutral-700"},i.subheading),Array.isArray(i.intro)&&i.intro.length>0&&t.createElement("div",{className:"prose prose-neutral max-w-none mt-3"},t.createElement(k,{value:i.intro,components:v}))),t.createElement("button",{onClick:y,className:"btn btn-primary whitespace-nowrap"},"Cart (",m,")")),c?t.createElement("div",{className:"bg-white/95 backdrop-blur-sm p-8 rounded-lg shadow-md"},"Loading…"):t.createElement("div",{className:"grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6"},(o||[]).map(a=>t.createElement(f.div,{key:a.id,initial:{opacity:0,y:8},whileInView:{opacity:1,y:0},viewport:{once:!0},className:"bg-white/98 backdrop-blur-sm rounded-lg shadow-lg"},t.createElement(E,{product:a})))))),t.createElement(x,null))};export{D as default};
