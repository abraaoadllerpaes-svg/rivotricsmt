import { useState, useEffect, useRef } from "react";

// ─── FIREBASE REST API ────────────────────────────────────────
const DB = "https://rivotricsmt-default-rtdb.firebaseio.com";
const fb = {
  get:    async p => { try { const r = await fetch(`${DB}${p}.json`); return r.json(); } catch { return null; } },
  set:    async (p,d) => { try { const r = await fetch(`${DB}${p}.json`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}); return r.json(); } catch { return null; } },
  push:   async (p,d) => { try { const r = await fetch(`${DB}${p}.json`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}); return r.json(); } catch { return null; } },
  delete: async p => { try { await fetch(`${DB}${p}.json`,{method:"DELETE"}); } catch {} },
  patch:  async (p,d) => { try { const r = await fetch(`${DB}${p}.json`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}); return r.json(); } catch { return null; } },
};
const toArr = obj => obj ? Object.entries(obj).map(([id,v])=>({...v,id})) : [];

// ─── CONSTANTES ───────────────────────────────────────────────
const MAPS = ["Mirage","Inferno","Nuke","Dust2","Ancient","Anubis","Overpass"];
const MAP_ICONS = {Mirage:"🏜️",Inferno:"🔥",Nuke:"☢️",Dust2:"🏜️",Ancient:"🏛️",Anubis:"🐺",Overpass:"🌉"};
const ICON_STEAM   = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAcABwDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAABwgCBQYD/8QAKxAAAgIBAwMBBwUAAAAAAAAAAQIDBAUABhEHEjEhCBMUMkFxgSJSYZGx/8QAGAEAAgMAAAAAAAAAAAAAAAAAAwQBAgX/xAAfEQABBQACAwEAAAAAAAAAAAABAAIDBBESEwVBwVH/2gAMAwEAAhEDEQA/AE1hjaV+xfP+asamLNiaOvDHNYnlYJHHGpLOxPACqPUkn6a2u0+k++cxsFN6YXBTZXFSSyRu9MiWWIoeCGjH6v55AI4Ojd7InSDcd63mN6zwSYx6tGerhmsxtG7W5I+BKpI5UIp4DgeW9PlOtKKCJsPY46lXvcX8Qlv3lsPdm0Ugl3FtzL4hLAJhN2o8QfjyASOCR9R5Gsxp4/afv7Xx/T3K4NMTXw1q3DBDDivioZpWtpOjmwVjd+zsjWRTI3DSe8AIPGkhtx+6tSR/tYjS80OMEgGAokcmuLdRi9m/rZufprabD07sD4axYE707KAxs5ADcN8yEqoAPPHIHIOmB6p9ZWydSazs4z4jJ3a/w088AZZDH3K3c5KgB1C9q9vdwHchh6covq0obizlGAQVMpajiA4Cd/IX7A+Pxo1SzBHnazc9j7+pK9Vsyb0PzfR+H0iBuFK2KqyXr78yOSwDNy8z/n1Pr5OhdNI0szyv8zsWP3Op3LVq5OZ7diWxKfLyOWP9nXHUX7xtOGDAFfx9I1Wnm7k4r//Z";
const ICON_GC      = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAcABwDASIAAhEBAxEB/8QAGgAAAgIDAAAAAAAAAAAAAAAABwgFBgAECf/EACoQAAEDAwIGAgIDAQAAAAAAAAECAwQFBhEAIQcIEhMxUSJBYYEVMnGi/8QAFgEBAQEAAAAAAAAAAAAAAAAAAwAE/8QAHxEAAgICAQUAAAAAAAAAAAAAAQIDEQAEBRITMUFR/9oADAMBAAIRAxEAPwAT8qfAORxaqL9YrMh2DasB3tPuNHDsp3APabJBCQAQVKPjIAGTlLUVSj8rPDN1u361TbJjy0gBTU+OmdITn7WVhak5zn5Y/G2tWmyneG/IrFq1rhTE1Ntsy0OpGVIfldKlu/6lTpIz46R61zwkPPSJDkiQ6t551RW44tRUpaickknckn71ZY+nGLl44TXxYsu87BnUegOojrktTochP8Y8EA5DgB6G07EFSMdJySFYxpB9Erh5bV2VO336ZIrFSpdrzXUPyIaXlJTLUn+qu34P18lD6SQDgYguK1GgUO6ERKa12mFRW1hHUTg7pO599Of3rY2jMkHfYUMxrvQvP2FNnDHaXMFMXy6DhBHtl6s12QxIpjb7ih2URFg9K8DcrQFKSBskBCVEncaEsnhld0VxpUdiPIOArqZkJT0H0erG49jOqbGfejPofjuuMvNnqQtCilST7BHjVyg8ULqjMhpx2JLIGAt5n5f8kZ/el0E1ZLWbqv1VYW++1HTQ9Ne7vCPZVIq1BhyapdNwSJC+38kOylraYT5JJUd1bY28fWc6Dt81sXBc8upICksqUEMpV5CEjA/Zxk/knWXHdVduABFSnKWyk5SygBDYPvA8n8nJ1CaXkN5ZUEEQIUffJOFx+g0TmeUgsfngDP/Z";
const ICON_FACEIT  = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAcABwDASIAAhEBAxEB/8QAGQAAAwEBAQAAAAAAAAAAAAAABQYHBAMI/8QALBAAAgEDAgUDAgcAAAAAAAAAAQIDBAURAAYSITFhcRQiMhNiFUFDUoKh0f/EABcBAAMBAAAAAAAAAAAAAAAAAAABAgT/xAAkEQACAgEEAQQDAAAAAAAAAAABAgMRABIhMWHwBEFRoXGB0f/aAAwDAQACEQMRAD8A8fWa3zXS5wUEGA8rYLHoijmzHsACT409QbX2QwIesv7leXFGkeD3+Ogu21S37fmr0PFUVZMWV/TjBGV8k4J7Bf3aPbdtl4vETfhNNHVFfki1MSuP4swP9azStGFLytpUbc197ZqjSQkRxJqY78WfPPbAu5ttWmK2SV1gnr5fTEGpiqgvEEPLjXAHIHAPnP5HSfqo7gpn23upLY7rUt6dBUjqjl196915lfGdTy/UcVBd6ilgkLxIwKEn3BSAQG+4A4PcHTgkVgChtSLBxeoiZGIcUymiO/Nv13hDaFckdQ9tqOcFUQEycBZOg8Bs8J8gn46ZaOitMXOczNKrHgkiqljZRyxyIyD11PNbxerwOl2rx4qH/wB1bId64PdZCOoonkdX/MdbrWQU7VF4mnlq2jVY4fryCVicexGI6jIJP2qR1I1PppJJpnmldpJJGLOzHJYnmSddautrKvh9XV1FRw54fqyFsZ64zrPojj0j6/GE0ms3d3uT8nP/2Q==";

// ─── SCORE & SEEDS ────────────────────────────────────────────
function calcScore(p){
  const hasGC=p.gcLevel!=="";const hasFC=p.faceitLevel!=="";
  let gc=0,fc=0;
  if(hasGC){gc=(Number(p.gcLevel)/20)*100;}
  if(hasFC){fc=(Number(p.faceitLevel)/10)*100;}
  if(hasGC&&hasFC)return fc*0.55+gc*0.45;if(hasFC)return fc;if(hasGC)return gc;return 0;
}
function assignSeeds(players){
  if(!players.length)return[];
  const scored=players.map(p=>({...p,_score:calcScore(p)})).sort((a,b)=>b._score-a._score);
  return scored.map((p,i)=>{const pct=(i/Math.max(scored.length-1,1))*100;const seed=pct<=20?1:pct<=40?2:pct<=60?3:pct<=80?4:5;return{...p,score:p._score,seed};});
}
const SEED_COLORS={
  1:{text:"text-yellow-400",border:"border-yellow-500/50",bg:"bg-yellow-500/10"},
  2:{text:"text-orange-400",border:"border-orange-500/50",bg:"bg-orange-500/10"},
  3:{text:"text-blue-400",border:"border-blue-500/50",bg:"bg-blue-500/10"},
  4:{text:"text-zinc-300",border:"border-zinc-500/50",bg:"bg-zinc-500/10"},
  5:{text:"text-zinc-500",border:"border-zinc-700/50",bg:"bg-zinc-800/30"},
};

// ─── UI COMPONENTS ────────────────────────────────────────────
function Badge({children,color="orange"}){
  const c={orange:"bg-orange-500/20 text-orange-400 border-orange-500/40",blue:"bg-blue-500/20 text-blue-400 border-blue-500/40",green:"bg-green-500/20 text-green-400 border-green-500/40",red:"bg-red-500/20 text-red-400 border-red-500/40",gray:"bg-zinc-700/40 text-zinc-400 border-zinc-600/40"};
  return <span className={`text-xs font-mono px-2 py-0.5 rounded border ${c[color]}`}>{children}</span>;
}
function Spinner(){return <div className="w-5 h-5 border-2 border-zinc-600 border-t-orange-400 rounded-full animate-spin"/>;}

// ─── TILE DE INFORMAÇÃO (MixTab) ──────────────────────────────
function InfoTile({icon,label,value,accent="default"}){
  const fills={default:"border-zinc-700 bg-zinc-800/40",orange:"border-orange-500/30 bg-orange-500/5",green:"border-green-500/30 bg-green-500/5",red:"border-red-500/30 bg-red-500/5"};
  const texts={default:"text-zinc-100",orange:"text-orange-400",green:"text-green-400",red:"text-red-400"};
  return(
    <div className={`rounded-xl border px-4 py-3 ${fills[accent]}`}>
      <div className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-1">{icon} {label}</div>
      <div className={`font-bold text-sm ${texts[accent]}`}>{value}</div>
    </div>
  );
}

// ─── ABA: JOGAR MIX ──────────────────────────────────────────
function MixTab({isAdmin,setShowLogin}){
  const [config,setConfig]=useState(null);
  const [loadingConfig,setLoadingConfig]=useState(true);
  const [editMode,setEditMode]=useState(false);
  const [editForm,setEditForm]=useState({local:"",date:"",time:"",value:"",maxPlayers:10,platform:"Gamers Club",pix:""});
  const [savingConfig,setSavingConfig]=useState(false);
  const [copiedPix,setCopiedPix]=useState(false);
  const [mixPlayers,setMixPlayers]=useState([]);
  const [loadingPlayers,setLoadingPlayers]=useState(true);
  const [signupName,setSignupName]=useState("");
  const [signupPhone,setSignupPhone]=useState("");
  const [signingUp,setSigningUp]=useState(false);
  const [signupDone,setSignupDone]=useState(false);
  const PLATFORMS=["Gamers Club","FACEIT","Servidor Privado","CS Matchmaking"];

  useEffect(()=>{
    fb.get("/mix-config").then(d=>{if(d){setConfig(d);setEditForm(d);}setLoadingConfig(false);});
    fb.get("/mix-players").then(d=>{setMixPlayers(toArr(d));setLoadingPlayers(false);});
  },[]);

  const saveConfig=async()=>{setSavingConfig(true);await fb.set("/mix-config",{...editForm,updatedAt:Date.now()});setConfig({...editForm});setEditMode(false);setSavingConfig(false);};
  const copyPix=()=>{const key=config?.pix||editForm.pix;if(key){navigator.clipboard?.writeText(key);setCopiedPix(true);setTimeout(()=>setCopiedPix(false),2000);}};
  const signup=async()=>{
    if(!signupName.trim()||!signupPhone.trim())return;
    setSigningUp(true);
    await fb.push("/mix-players",{name:signupName.trim(),phone:signupPhone.trim(),status:"Confirmado",createdAt:Date.now()});
    const d=await fb.get("/mix-players");setMixPlayers(toArr(d));
    setSignupName("");setSignupPhone("");setSigningUp(false);setSignupDone(true);
    setTimeout(()=>setSignupDone(false),3500);
  };
  const removePlayer=async(id)=>{await fb.delete(`/mix-players/${id}`);setMixPlayers(p=>p.filter(x=>x.id!==id));};
  const maskPhone=phone=>{if(!phone)return"—";const c=phone.replace(/\D/g,"");return c.length>=6?`(${c.slice(0,2)}) ****-${c.slice(-4)}`:"****";};
  const spotsLeft=config?Math.max(Number(config.maxPlayers)-mixPlayers.length,0):null;
  const pct=config?Math.min((mixPlayers.length/Number(config.maxPlayers))*100,100):0;

  return(
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-black font-black text-base">MX</div>
            <div><h2 className="text-zinc-100 font-black text-lg tracking-wide uppercase">Próximo Mix</h2><p className="text-orange-400 font-mono text-xs">Counter-Strike 2</p></div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin&&!editMode&&(<button onClick={()=>setEditMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-400 font-mono text-xs hover:bg-orange-500/20 transition-colors">✏ Editar</button>)}
            {!isAdmin&&(<button onClick={()=>setShowLogin(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-500 font-mono text-xs hover:border-zinc-500 transition-colors">🔒 Admin</button>)}
          </div>
        </div>
        <div className="p-6">
          {loadingConfig?<div className="flex justify-center py-8"><Spinner/></div>
          :editMode&&isAdmin?(
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {[{l:"📍 Local",k:"local",ph:"Ex: Arena CS Cuiabá"},{l:"👥 Qtd. Jogadores",k:"maxPlayers",type:"number",ph:"10"},{l:"📅 Data",k:"date",type:"date",ph:""},{l:"🕐 Hora",k:"time",type:"time",ph:""},{l:"💰 Valor (R$)",k:"value",type:"number",ph:"0.00"}].map(({l,k,type="text",ph})=>(
                  <div key={k} className="flex flex-col gap-1"><label className="text-xs text-zinc-500 font-mono uppercase tracking-widest">{l}</label>
                    <input type={type} step={k==="value"?"0.01":undefined} min={k==="value"||k==="maxPlayers"?"0":undefined} value={editForm[k]||""} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))} placeholder={ph} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-orange-500"/></div>
                ))}
                <div className="flex flex-col gap-1"><label className="text-xs text-zinc-500 font-mono uppercase tracking-widest">🎮 Plataforma</label>
                  <select value={editForm.platform||"Gamers Club"} onChange={e=>setEditForm(f=>({...f,platform:e.target.value}))} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-orange-500">
                    {PLATFORMS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select></div>
              </div>
              <div className="flex flex-col gap-1"><label className="text-xs text-zinc-500 font-mono uppercase tracking-widest">💳 Chave PIX</label>
                <input value={editForm.pix||""} onChange={e=>setEditForm(f=>({...f,pix:e.target.value}))} placeholder="CPF, e-mail, telefone ou chave aleatória" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-orange-500"/></div>
              <div className="flex gap-3 pt-1">
                <button onClick={saveConfig} disabled={savingConfig} className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 text-black font-mono font-bold py-2.5 rounded-xl text-sm uppercase flex items-center justify-center gap-2 transition-colors">{savingConfig&&<Spinner/>}💾 Salvar</button>
                <button onClick={()=>{setEditMode(false);setEditForm(config||editForm);}} className="px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-mono py-2.5 rounded-xl text-sm">Cancelar</button>
              </div>
            </div>
          ):config?(
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <InfoTile icon="📍" label="Local" value={config.local||"—"}/>
                <InfoTile icon="📅" label="Data" value={config.date?new Date(config.date+"T12:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"}):"—"}/>
                <InfoTile icon="🕐" label="Hora" value={config.time||"—"}/>
                <InfoTile icon="🎮" label="Plataforma" value={config.platform||"—"} accent="orange"/>
                <InfoTile icon="💰" label="Inscrição" value={config.value&&Number(config.value)>0?`R$ ${Number(config.value).toFixed(2)}`:"Gratuito"} accent="green"/>
                <InfoTile icon="👥" label="Vagas" value={`${mixPlayers.length} / ${config.maxPlayers}`} accent={spotsLeft===0?"red":spotsLeft<=3?"orange":"green"}/>
              </div>
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-zinc-500">Vagas preenchidas</span>
                  <span className={spotsLeft===0?"text-red-400":spotsLeft<=3?"text-orange-400":"text-green-400"}>{spotsLeft===0?"LOTADO":`${spotsLeft} vaga(s) livre(s)`}</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${spotsLeft===0?"bg-red-500":spotsLeft<=3?"bg-orange-500":"bg-green-500"}`} style={{width:`${pct}%`}}/></div>
              </div>
              {config.pix&&(
                <div className="flex items-center gap-3 bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0"><div className="text-xs text-zinc-500 font-mono uppercase mb-1">💳 Chave PIX para pagamento</div><div className="text-zinc-200 font-mono text-sm font-bold truncate">{config.pix}</div></div>
                  <button onClick={copyPix} className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all ${copiedPix?"bg-green-600 text-white":"bg-zinc-700 hover:bg-zinc-600 text-zinc-200"}`}>{copiedPix?"✓ Copiado!":"📋 Copiar"}</button>
                </div>
              )}
            </div>
          ):(
            <div className="text-center text-zinc-600 font-mono py-10 text-sm">{isAdmin?"Clique em 'Editar' para configurar o próximo Mix.":"Nenhum mix configurado ainda. Aguarde o administrador."}</div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-black font-black text-base">IN</div>
            <div><h2 className="text-zinc-100 font-black text-lg tracking-wide uppercase">Inscrição</h2><p className="text-green-400 font-mono text-xs">{mixPlayers.length} jogador(es) inscrito(s)</p></div>
          </div>
          {config&&(spotsLeft===0?<span className="text-red-400 font-mono text-xs border border-red-500/30 bg-red-500/10 px-3 py-1.5 rounded-lg font-bold">🔴 VAGAS ESGOTADAS</span>:<span className="text-green-400 font-mono text-xs border border-green-500/30 bg-green-500/10 px-3 py-1.5 rounded-lg font-bold">🟢 INSCRIÇÕES ABERTAS</span>)}
        </div>
        <div className="p-6 flex flex-col gap-6">
          {(!config||spotsLeft===null||spotsLeft>0)&&(
            <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-5">
              <h3 className="text-zinc-300 font-bold text-sm mb-4 uppercase tracking-wider font-mono">Entrar no Mix</h3>
              {signupDone?(
                <div className="text-center py-6"><div className="text-5xl mb-3">🎉</div><div className="text-green-400 font-bold text-lg">Inscrição confirmada!</div><div className="text-zinc-500 text-sm mt-1">Você está na lista. Boa sorte! 🔥</div></div>
              ):(
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1"><label className="text-xs text-zinc-500 font-mono uppercase">👤 Nome / Nickname *</label>
                      <input value={signupName} onChange={e=>setSignupName(e.target.value)} placeholder="Ex: s1mple" className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-green-500 transition-colors"/></div>
                    <div className="flex flex-col gap-1"><label className="text-xs text-zinc-500 font-mono uppercase">📱 Telefone / WhatsApp *</label>
                      <input value={signupPhone} onChange={e=>setSignupPhone(e.target.value)} placeholder="(11) 99999-9999" className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-green-500 transition-colors"/>
                      <p className="text-zinc-600 text-[10px] font-mono mt-0.5">🔒 Número oculto para outros jogadores</p></div>
                  </div>
                  <button onClick={signup} disabled={signingUp||!signupName.trim()||!signupPhone.trim()} className="w-full bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-mono font-black py-3 rounded-xl text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2">{signingUp?<><Spinner/>Processando...</>:"⚔️ ENTRAR NO MIX"}</button>
                </div>
              )}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-3"><h3 className="text-zinc-400 font-mono text-xs uppercase tracking-widest">Lista de Participantes</h3><span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-xs flex items-center justify-center font-bold">{mixPlayers.length}</span></div>
            {loadingPlayers?<div className="flex justify-center py-6"><Spinner/></div>
            :mixPlayers.length===0?<div className="text-center text-zinc-700 font-mono py-10 border border-dashed border-zinc-800 rounded-xl text-sm">Nenhum jogador inscrito ainda. Seja o primeiro! 🎮</div>
            :(
              <div className="flex flex-col gap-2">
                {mixPlayers.map((p,i)=>(
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl hover:border-zinc-600 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">{i+1}</div>
                    <div className="w-9 h-9 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-sm font-black text-orange-400 shrink-0">{p.name?.charAt(0)?.toUpperCase()||"?"}</div>
                    <div className="flex-1 min-w-0"><div className="text-zinc-100 font-bold text-sm truncate">{p.name}</div><div className="text-zinc-600 font-mono text-xs mt-0.5">{isAdmin?<span className="text-zinc-400">📱 {p.phone}</span>:<span>📱 {maskPhone(p.phone)}</span>}</div></div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-green-400"/>{p.status||"Confirmado"}</span>
                      {isAdmin&&<button onClick={()=>removePlayer(p.id)} className="text-zinc-600 hover:text-red-400 transition-colors text-sm px-1">✕</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ABA: JOGADORES (com formulário de cadastro) ──────────────
const EMPTY_PLAYER = {name:"",nick:"",city:"",steamUrl:"",gcUrl:"",faceitUrl:"",gcLevel:"",faceitLevel:""};

function RosterTab({players,setPlayers}){
  const [form,setForm]=useState(EMPTY_PLAYER);
  const [editing,setEditing]=useState(null);
  const [saving,setSaving]=useState(false);
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState(null);

  const setField=(k,v)=>setForm(f=>({...f,[k]:v}));

  const save=async()=>{
    if(!form.name.trim()||!form.nick.trim()||!form.city.trim()){
      alert("Preencha os campos obrigatórios: Nome, Nick e Cidade!");return;
    }
    setSaving(true);
    try{
      if(editing!==null){
        const{id,...data}=form;
        await fb.set(`/players/${editing}`,{...data,updatedAt:Date.now()});
        setEditing(null);
      }else{
        await fb.push("/players",{...form,createdAt:Date.now()});
      }
      const data=await fb.get("/players");
      setPlayers(toArr(data));
    }catch(e){console.error(e);}
    setForm(EMPTY_PLAYER);
    setSaving(false);
  };

  const startEdit=(p)=>{setForm(p);setEditing(p.id);setSelected(null);window.scrollTo({top:0,behavior:"smooth"});};
  const cancelEdit=()=>{setEditing(null);setForm(EMPTY_PLAYER);};
  const remove=async(id)=>{await fb.delete(`/players/${id}`);setPlayers(p=>p.filter(x=>x.id!==id));};

  const seeded=assignSeeds(players);
  const filtered=seeded
    .filter(p=>
      (p.name||"").toLowerCase().includes(search.toLowerCase())||
      (p.nick||"").toLowerCase().includes(search.toLowerCase())||
      (p.city||"").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a,b)=>b.score-a.score);

  const openLink=(e,url)=>{e.stopPropagation();window.open(url.startsWith("http")?url:"https://"+url,"_blank");};

  return(
    <div className="flex flex-col gap-6">

      {/* ══════════════════════════════════════
          FORMULÁRIO DE CADASTRO
      ══════════════════════════════════════ */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-orange-400 font-mono font-bold text-sm uppercase tracking-widest mb-5 flex items-center gap-2">
          {editing!==null?"✏ Editar Jogador":"＋ Cadastrar Jogador"}
        </h2>

        {/* Linha 1: Nome, Nick, Cidade */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            {l:"Nome *",    k:"name",  ph:"Nome completo"},
            {l:"Nick *",    k:"nick",  ph:"Ex: s1mple"},
            {l:"Cidade *",  k:"city",  ph:"Ex: Cuiabá"},
          ].map(({l,k,ph})=>(
            <div key={k} className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500 font-mono uppercase tracking-widest">{l}</label>
              <input value={form[k]||""} onChange={e=>setField(k,e.target.value)} placeholder={ph}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"/>
            </div>
          ))}
        </div>

        {/* Linha 2: Links */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            {l:"Link Steam",       k:"steamUrl",  ph:"steamcommunity.com/id/..."},
            {l:"Link GamersCLUB",  k:"gcUrl",     ph:"gamersclub.com.br/..."},
            {l:"Link FACEIT",      k:"faceitUrl", ph:"faceit.com/en/players/..."},
          ].map(({l,k,ph})=>(
            <div key={k} className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500 font-mono uppercase tracking-widest">{l}</label>
              <input value={form[k]||""} onChange={e=>setField(k,e.target.value)} placeholder={ph}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"/>
            </div>
          ))}
        </div>

        {/* Linha 3: Levels */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* GamersCLUB Level 0–20 */}
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-400"/>
              <span className="text-green-400 font-mono text-xs font-bold uppercase tracking-wider">GamersCLUB — Level</span>
            </div>
            <select value={form.gcLevel} onChange={e=>setField("gcLevel",e.target.value===""?"":Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
              <option value="">— Selecionar Level —</option>
              {Array.from({length:21},(_,i)=>i).map(l=>(
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
            {form.gcLevel!==""&&(
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded border bg-green-500/20 text-green-400 border-green-500/40">GC {form.gcLevel}</span>
                <span className="text-zinc-600 text-xs font-mono">selecionado</span>
              </div>
            )}
          </div>

          {/* FACEIT Level 0–10 */}
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-orange-400"/>
              <span className="text-orange-400 font-mono text-xs font-bold uppercase tracking-wider">FACEIT — Level</span>
            </div>
            <select value={form.faceitLevel} onChange={e=>setField("faceitLevel",e.target.value===""?"":Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-orange-500">
              <option value="">— Selecionar Level —</option>
              {Array.from({length:11},(_,i)=>i).map(l=>(
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
            {form.faceitLevel!==""&&(
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded border bg-orange-500/20 text-orange-400 border-orange-500/40">FC {form.faceitLevel}</span>
                <span className="text-zinc-600 text-xs font-mono">selecionado</span>
              </div>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button onClick={save} disabled={saving}
            className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-mono font-bold py-2.5 rounded-xl transition-colors text-sm uppercase tracking-wider flex items-center justify-center gap-2">
            {saving&&<Spinner/>}{editing!==null?"Salvar Edição":"Cadastrar Jogador"}
          </button>
          {editing!==null&&(
            <button onClick={cancelEdit} className="px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono py-2.5 rounded-xl text-sm transition-colors">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          LISTA DE JOGADORES
      ══════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-zinc-100 font-black text-xl">Jogadores</h2>
            <p className="text-zinc-500 text-xs mt-0.5">{players.length} cadastrados</p>
          </div>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..."
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500 w-44"/>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {/* Cabeçalho */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-950/50">
            <div className="col-span-1 text-zinc-600 font-mono text-xs uppercase">#</div>
            <div className="col-span-3 text-zinc-600 font-mono text-xs uppercase">Jogador</div>
            <div className="col-span-2 text-zinc-600 font-mono text-xs uppercase">Cidade</div>
            <div className="col-span-2 text-zinc-600 font-mono text-xs uppercase">GC / FC</div>
            <div className="col-span-2 text-zinc-600 font-mono text-xs uppercase">Score</div>
            <div className="col-span-2 text-zinc-600 font-mono text-xs uppercase text-right">Links</div>
          </div>

          {/* Linhas */}
          <div className="flex flex-col divide-y divide-zinc-800/50">
            {filtered.map((p,i)=>{
              const sc=SEED_COLORS[p.seed]||SEED_COLORS[5];
              const isOpen=selected===p.id;
              return(
                <div key={p.id}>
                  <div onClick={()=>setSelected(isOpen?null:p.id)}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer transition-colors hover:bg-zinc-800/40 ${isOpen?"bg-zinc-800/30":""}`}>

                    {/* # + Seed */}
                    <div className="col-span-1 flex items-center gap-1.5">
                      <span className="text-zinc-600 font-mono text-xs">{i+1}</span>
                      <div className={`w-6 h-6 rounded text-[10px] font-black flex items-center justify-center ${sc.bg} ${sc.text} border ${sc.border}`}>S{p.seed}</div>
                    </div>

                    {/* Nick + Nome */}
                    <div className="col-span-3 flex flex-col">
                      <span className="text-zinc-100 font-bold text-sm truncate">{p.nick||p.name}</span>
                      {p.nick&&<span className="text-zinc-500 text-xs truncate">{p.name}</span>}
                    </div>

                    {/* Cidade */}
                    <div className="col-span-2">
                      <span className="text-zinc-400 text-xs truncate">{p.city||"—"}</span>
                    </div>

                    {/* GC / FC badges */}
                    <div className="col-span-2 flex gap-1 flex-wrap">
                      {p.gcLevel!==""&&p.gcLevel!==undefined&&(
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-green-500/20 text-green-400 border-green-500/40">GC {p.gcLevel}</span>
                      )}
                      {p.faceitLevel!==""&&p.faceitLevel!==undefined&&(
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-orange-500/20 text-orange-400 border-orange-500/40">FC {p.faceitLevel}</span>
                      )}
                    </div>

                    {/* Score bar */}
                    <div className="col-span-2 flex flex-col gap-1">
                      <span className={`font-mono font-bold text-sm ${sc.text}`}>{p.score.toFixed(0)}</span>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${p.score}%`,background:"linear-gradient(to right, #f97316, #eab308)"}}/>
                      </div>
                    </div>

                    {/* Links + ações */}
                    <div className="col-span-2 flex gap-1 justify-end items-center">
                      {p.steamUrl&&(
                        <button onClick={e=>openLink(e,p.steamUrl)} title="Steam"
                          className="w-7 h-7 rounded border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/30 flex items-center justify-center transition-colors overflow-hidden">
                          <img src={ICON_STEAM} alt="Steam" className="w-5 h-5 object-contain"/>
                        </button>
                      )}
                      {p.gcUrl&&(
                        <button onClick={e=>openLink(e,p.gcUrl)} title="GamersCLUB"
                          className="w-7 h-7 rounded border border-green-500/40 bg-green-500/10 hover:bg-green-500/30 flex items-center justify-center transition-colors overflow-hidden">
                          <img src={ICON_GC} alt="GC" className="w-5 h-5 object-contain"/>
                        </button>
                      )}
                      {p.faceitUrl&&(
                        <button onClick={e=>openLink(e,p.faceitUrl)} title="FACEIT"
                          className="w-7 h-7 rounded border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/30 flex items-center justify-center transition-colors overflow-hidden">
                          <img src={ICON_FACEIT} alt="FACEIT" className="w-5 h-5 object-contain"/>
                        </button>
                      )}
                      <button onClick={e=>{e.stopPropagation();startEdit(p);}} title="Editar" className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors text-sm">✏</button>
                      <button onClick={e=>{e.stopPropagation();remove(p.id);}} title="Remover" className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors text-sm">✕</button>
                      <span className="text-zinc-700 text-xs">{isOpen?"▲":"▼"}</span>
                    </div>
                  </div>

                  {/* Linha expandida */}
                  {isOpen&&(
                    <div className="px-4 py-3 bg-zinc-950/60 border-t border-zinc-800/50">
                      <div className="flex flex-wrap gap-3">
                        {p.steamUrl&&(
                          <a href={p.steamUrl.startsWith("http")?p.steamUrl:"https://"+p.steamUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/15 text-blue-400 text-xs font-mono transition-colors">STEAM ↗</a>
                        )}
                        {p.gcUrl&&(
                          <a href={p.gcUrl.startsWith("http")?p.gcUrl:"https://"+p.gcUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/5 hover:bg-green-500/15 text-green-400 text-xs font-mono transition-colors">
                            GAMERSCLUB {p.gcLevel!==""&&p.gcLevel!==undefined?`· Lv.${p.gcLevel}`:""} ↗
                          </a>
                        )}
                        {p.faceitUrl&&(
                          <a href={p.faceitUrl.startsWith("http")?p.faceitUrl:"https://"+p.faceitUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/15 text-orange-400 text-xs font-mono transition-colors">
                            FACEIT {p.faceitLevel!==""&&p.faceitLevel!==undefined?`· Lv.${p.faceitLevel}`:""} ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filtered.length===0&&(
            <div className="text-center text-zinc-600 font-mono py-16">
              {players.length===0?"Nenhum jogador cadastrado ainda. Use o formulário acima!":"Nenhum resultado para a busca."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ABA: DRAFT ───────────────────────────────────────────────
function DraftTab({players,matches,setMatches}){
  const [pool,setPool]=useState([]);
  const [captainA,setCaptainA]=useState(null);
  const [captainB,setCaptainB]=useState(null);
  const [teamA,setTeamA]=useState([]);
  const [teamB,setTeamB]=useState([]);
  const [turn,setTurn]=useState("A");
  const [step,setStep]=useState("setup");
  const [nameA,setNameA]=useState("Time A");
  const [nameB,setNameB]=useState("Time B");
  const [showResult,setShowResult]=useState(false);
  const [resultMap,setResultMap]=useState("");
  const [winner,setWinner]=useState("");
  const [saving,setSaving]=useState(false);

  const seededAll=assignSeeds(players);
  const ranked=[...players].map(p=>{const s=seededAll.find(x=>x.id===p.id);return{...p,score:s?.score??calcScore(p),seed:s?.seed??null};}).sort((a,b)=>b.score-a.score);
  const poolPlayers=ranked.filter(p=>pool.includes(p.id));
  const pickable=poolPlayers.filter(p=>p.id!==captainA?.id&&p.id!==captainB?.id&&!teamA.find(x=>x.id===p.id)&&!teamB.find(x=>x.id===p.id));
  const togglePool=id=>setPool(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const startDraft=()=>{if(!captainA||!captainB)return;setTeamA([captainA]);setTeamB([captainB]);setTurn("A");setStep("picking");};
  const pickPlayer=player=>{
    const newA=turn==="A"?[...teamA,player]:teamA;const newB=turn==="B"?[...teamB,player]:teamB;
    if(turn==="A")setTeamA(newA);else setTeamB(newB);
    if(newA.length>=5&&newB.length>=5){setStep("done");return;}
    setTurn(turn==="A"?"B":"A");
  };
  const saveResult=async()=>{
    if(!winner||!resultMap)return;setSaving(true);
    const match={date:Date.now(),map:resultMap,winner,teamA:teamA.map(p=>({id:p.id,name:p.name,seed:p.seed})),teamB:teamB.map(p=>({id:p.id,name:p.name,seed:p.seed})),nameA,nameB};
    const res=await fb.push("/matches",match);
    if(res?.name)setMatches(m=>[{...match,id:res.name},...m]);
    setSaving(false);setShowResult(false);setWinner("");setResultMap("");
  };
  const reset=()=>{setPool([]);setCaptainA(null);setCaptainB(null);setTeamA([]);setTeamB([]);setTurn("A");setStep("setup");setShowResult(false);};

  if(step==="setup")return(
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-orange-400 font-mono font-bold text-sm uppercase tracking-widest mb-4">1. Pool de Jogadores</h2>
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          {ranked.map(p=>{const sc=SEED_COLORS[p.seed]||SEED_COLORS[5];return(
            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${pool.includes(p.id)?"border-orange-500/50 bg-orange-500/5":"border-zinc-800 hover:border-zinc-700"}`}>
              <input type="checkbox" checked={pool.includes(p.id)} onChange={()=>togglePool(p.id)} className="accent-orange-500 cursor-pointer"/>
              <div className={`w-8 h-8 rounded border flex flex-col items-center justify-center shrink-0 text-xs font-bold ${sc.border} ${sc.bg} ${sc.text}`}>S{p.seed}</div>
              <div className="flex-1"><span className="text-zinc-200 font-bold text-sm">{p.nick||p.name}</span>{p.nick&&<span className="text-zinc-500 text-xs ml-2">{p.name}</span>}<span className="text-zinc-600 text-xs ml-2">{p.city}</span></div>
              <div className="flex gap-1">
                {p.gcLevel!==""&&p.gcLevel!==undefined&&<Badge color="green">GC {p.gcLevel}</Badge>}
                {p.faceitLevel!==""&&p.faceitLevel!==undefined&&<Badge color="orange">FC {p.faceitLevel}</Badge>}
              </div>
              <span className={`font-mono text-sm font-bold w-14 text-right ${sc.text}`}>{p.score.toFixed(0)}</span>
            </div>
          );})}
          {ranked.length===0&&<div className="text-zinc-600 font-mono text-sm text-center py-6">Cadastre jogadores primeiro.</div>}
        </div>
        <p className="text-xs text-zinc-600 mt-2">{pool.length} selecionado(s)</p>
      </div>
      {pool.length>=2&&(
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-orange-400 font-mono font-bold text-sm uppercase tracking-widest mb-4">2. Capitães & Times</h2>
          <div className="grid grid-cols-2 gap-4">
            {["A","B"].map(side=>{
              const cap=side==="A"?captainA:captainB;const other=side==="A"?captainB:captainA;
              const setCap=side==="A"?setCaptainA:setCaptainB;const nm=side==="A"?nameA:nameB;const setNm=side==="A"?setNameA:setNameB;
              return(<div key={side} className="flex flex-col gap-2">
                <input value={nm} onChange={e=>setNm(e.target.value)} placeholder={`Nome do Time ${side}`} className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-orange-500"/>
                <select value={cap?.id||""} onChange={e=>{const p=poolPlayers.find(x=>x.id===e.target.value);setCap(p||null);}} className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-orange-500">
                  <option value="">— Capitão —</option>
                  {poolPlayers.filter(p=>p.id!==other?.id).map(p=><option key={p.id} value={p.id}>{p.nick||p.name} ({p.score.toFixed(0)} pts)</option>)}
                </select>
                {cap&&<div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-2">
                  <div className={`w-8 h-8 rounded border flex items-center justify-center text-xs font-bold ${SEED_COLORS[cap.seed]?.border} ${SEED_COLORS[cap.seed]?.bg} ${SEED_COLORS[cap.seed]?.text}`}>S{cap.seed}</div>
                  <div><div className="text-zinc-200 font-bold text-sm">{cap.nick||cap.name} 👑</div><div className={`font-mono text-xs ${SEED_COLORS[cap.seed]?.text}`}>{cap.score.toFixed(1)} pts</div></div>
                </div>}
              </div>);
            })}
          </div>
        </div>
      )}
      <button onClick={startDraft} disabled={!captainA||!captainB||pool.length<10}
        className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-mono font-bold py-3 rounded-xl transition-colors text-sm uppercase tracking-wider">
        {pool.length<10?`Selecione ao menos 10 jogadores (${pool.length}/10)`:"Iniciar Draft ▶"}
      </button>
    </div>
  );

  return(
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className={`flex-1 text-center py-3 rounded-xl border-2 transition-all ${turn==="A"&&step!=="done"?"border-orange-500 bg-orange-500/10":"border-zinc-800"}`}>
          <div className="text-zinc-400 font-mono text-xs uppercase">{nameA}</div>
          <div className="text-2xl font-bold text-zinc-100">{teamA.length}<span className="text-zinc-600">/5</span></div>
        </div>
        <div className="px-6 text-center"><div className="text-zinc-500 font-mono text-xs">VS</div>{step==="done"&&<div className="text-green-400 font-mono text-xs mt-1">✓ PRONTO</div>}</div>
        <div className={`flex-1 text-center py-3 rounded-xl border-2 transition-all ${turn==="B"&&step!=="done"?"border-blue-500 bg-blue-500/10":"border-zinc-800"}`}>
          <div className="text-zinc-400 font-mono text-xs uppercase">{nameB}</div>
          <div className="text-2xl font-bold text-zinc-100">{teamB.length}<span className="text-zinc-600">/5</span></div>
        </div>
      </div>
      {step==="picking"&&(
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className={`text-sm font-mono font-bold uppercase mb-3 ${turn==="A"?"text-orange-400":"text-blue-400"}`}>🎯 Vez de {turn==="A"?nameA:nameB} escolher</div>
          <div className="flex flex-col gap-2">
            {pickable.map(p=>{const sc=SEED_COLORS[p.seed]||SEED_COLORS[5];return(
              <button key={p.id} onClick={()=>pickPlayer(p)} className="flex items-center gap-3 p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-orange-500/50 rounded-lg transition-all text-left group">
                <div className={`w-9 h-9 rounded border flex flex-col items-center justify-center text-xs font-bold shrink-0 ${sc.border} ${sc.bg} ${sc.text}`}>S{p.seed}</div>
                <div className="flex-1"><div className="text-zinc-200 font-bold text-sm">{p.nick||p.name}</div>
                  <div className="flex gap-1 mt-0.5">
                    {p.gcLevel!==""&&p.gcLevel!==undefined&&<Badge color="green">GC {p.gcLevel}</Badge>}
                    {p.faceitLevel!==""&&p.faceitLevel!==undefined&&<Badge color="orange">FC {p.faceitLevel}</Badge>}
                  </div>
                </div>
                <span className={`font-mono font-bold ${sc.text}`}>{p.score.toFixed(1)}</span>
                <span className="text-zinc-500 group-hover:text-orange-400 transition-colors">+</span>
              </button>
            );})}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {[{team:teamA,name:nameA,color:"orange"},{team:teamB,name:nameB,color:"blue"}].map(({team,name,color})=>(
          <div key={name} className={`bg-zinc-900 border rounded-xl p-4 ${color==="orange"?"border-orange-500/30":"border-blue-500/30"}`}>
            <h3 className={`font-mono font-bold text-sm uppercase mb-3 ${color==="orange"?"text-orange-400":"text-blue-400"}`}>{name}</h3>
            {team.map((p,i)=>{const sc=SEED_COLORS[p.seed]||SEED_COLORS[5];return(
              <div key={p.id} className="flex items-center gap-2 py-2 border-b border-zinc-800 last:border-0">
                <span className="text-zinc-600 font-mono text-xs w-4">{i===0?"C":i}</span>
                <div className={`w-7 h-7 rounded border flex items-center justify-center text-xs font-bold ${i===0?"bg-yellow-500 border-yellow-400 text-black":sc.border+" "+sc.bg+" "+sc.text}`}>{i===0?"C":"S"+p.seed}</div>
                <span className="text-zinc-200 text-sm flex-1">{p.nick||p.name}{i===0&&" 👑"}</span>
                <span className={`font-mono text-xs ${sc.text}`}>{p.score?.toFixed(0)}</span>
              </div>
            );})}
          </div>
        ))}
      </div>
      {step==="done"&&!showResult&&(
        <button onClick={()=>setShowResult(true)} className="w-full bg-green-600 hover:bg-green-500 text-white font-mono font-bold py-3 rounded-xl transition-colors text-sm uppercase tracking-wider">🏆 Registrar Resultado da Partida</button>
      )}
      {showResult&&(
        <div className="bg-zinc-900 border border-green-500/30 rounded-xl p-5">
          <h3 className="text-green-400 font-mono font-bold text-sm uppercase mb-4">Registrar Resultado</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1"><label className="text-xs text-zinc-500 font-mono uppercase">Mapa Jogado</label>
              <select value={resultMap} onChange={e=>setResultMap(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
                <option value="">— Selecionar —</option>{MAPS.map(m=><option key={m} value={m}>{MAP_ICONS[m]} {m}</option>)}
              </select></div>
            <div className="flex flex-col gap-1"><label className="text-xs text-zinc-500 font-mono uppercase">Vencedor</label>
              <div className="flex gap-2">
                <button onClick={()=>setWinner("A")} className={`flex-1 py-2 rounded-lg border font-mono font-bold text-sm transition-all ${winner==="A"?"border-orange-500 bg-orange-500/20 text-orange-400":"border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}>{nameA}</button>
                <button onClick={()=>setWinner("B")} className={`flex-1 py-2 rounded-lg border font-mono font-bold text-sm transition-all ${winner==="B"?"border-blue-500 bg-blue-500/20 text-blue-400":"border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}>{nameB}</button>
              </div></div>
          </div>
          <div className="flex gap-3">
            <button onClick={saveResult} disabled={!winner||!resultMap||saving} className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white font-mono font-bold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2">{saving&&<Spinner/>}Salvar no Firebase</button>
            <button onClick={()=>setShowResult(false)} className="px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-mono py-2.5 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}
      <button onClick={reset} className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 font-mono py-2.5 rounded-xl transition-colors text-sm">↺ Reiniciar Draft</button>
    </div>
  );
}

// ─── ABA: VETO DE MAPAS ───────────────────────────────────────
const BO3_SEQ=[{action:"BAN",team:"A"},{action:"BAN",team:"B"},{action:"PICK",team:"A"},{action:"PICK",team:"B"},{action:"BAN",team:"A"},{action:"BAN",team:"B"},{action:"SOBRA",team:null}];
const BO1_SEQ=[{action:"BAN",team:"A"},{action:"BAN",team:"B"},{action:"BAN",team:"A"},{action:"BAN",team:"B"},{action:"BAN",team:"A"},{action:"BAN",team:"B"},{action:"SOBRA",team:null}];
const AS={BAN:{text:"text-red-400",border:"border-red-500/40",bg:"bg-red-500/10"},PICK:{text:"text-green-400",border:"border-green-500/40",bg:"bg-green-500/10"},SOBRA:{text:"text-yellow-400",border:"border-yellow-500/40",bg:"bg-yellow-500/10"}};
function genCode(){return Math.random().toString(36).substring(2,8).toUpperCase();}

function VetoBoard({state,myTeam,onAction,isOnline}){
  const{format,nameA,nameB,step,actions}=state;
  const seq=format==="bo3"?BO3_SEQ:BO1_SEQ;
  const remaining=MAPS.filter(m=>!actions.find(a=>a.map===m));
  const cur=seq[step];const isDone=step>=seq.length;
  const myTurn=!isOnline||(cur&&cur.team===myTeam);
  const played=actions.filter(a=>a.action==="PICK"||a.action==="SOBRA");
  const tc=t=>t==="A"?"text-orange-400":"text-blue-400";
  const tb=t=>t==="A"?"border-orange-500":"border-blue-500";
  const tbg=t=>t==="A"?"bg-orange-500/10":"bg-blue-500/10";
  return(
    <div className="flex flex-col gap-5">
      {!isDone&&cur&&(
        <div className={`rounded-xl border-2 px-5 py-4 flex items-center justify-between ${tb(cur.team)} ${tbg(cur.team)}`}>
          <div><div className="text-zinc-400 font-mono text-xs uppercase mb-0.5">Passo {step+1} de {seq.length}</div>
            <div className="flex items-center gap-3"><span className={`font-mono font-black text-2xl ${AS[cur.action]?.text}`}>{cur.action}</span><span className={`font-bold text-lg ${tc(cur.team)}`}>{cur.team==="A"?nameA:nameB}</span></div></div>
          {isOnline&&<div className={`text-xs font-mono px-3 py-1.5 rounded-lg border ${myTurn?"border-green-500/50 bg-green-500/10 text-green-400":"border-zinc-700 bg-zinc-800/50 text-zinc-500"}`}>{myTurn?"🟢 Sua vez":"⏳ Aguardando..."}</div>}
          {!isOnline&&<div className={`font-mono font-black text-4xl opacity-20 ${tc(cur.team)}`}>{cur.team}</div>}
        </div>
      )}
      {!isDone&&cur&&(
        <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 transition-opacity ${!myTurn?"opacity-40 pointer-events-none":""}`}>
          <div className="text-zinc-500 font-mono text-xs uppercase mb-4">{myTurn?`${cur.team==="A"?nameA:nameB} — escolha o mapa`:"Aguardando o adversário..."}</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {remaining.map(map=>(
              <div key={map} className="rounded-xl border border-zinc-700 overflow-hidden hover:border-zinc-500 transition-all">
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800/50"><span className="text-2xl">{MAP_ICONS[map]||"🗺️"}</span><span className="text-zinc-100 font-bold text-base flex-1">{map}</span></div>
                <div className="flex border-t border-zinc-700">
                  <button onClick={()=>cur.action==="BAN"&&onAction(map,"BAN")} disabled={cur.action!=="BAN"} className={`flex-1 py-2.5 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${cur.action==="BAN"?"bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white cursor-pointer":"bg-zinc-900/50 text-zinc-700 cursor-not-allowed"}`}>✕ BAN</button>
                  <div className="w-px bg-zinc-700"/>
                  <button onClick={()=>cur.action==="PICK"&&onAction(map,"PICK")} disabled={cur.action!=="PICK"} className={`flex-1 py-2.5 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${cur.action==="PICK"?"bg-green-500/20 hover:bg-green-600 text-green-400 hover:text-white cursor-pointer":"bg-zinc-900/50 text-zinc-700 cursor-not-allowed"}`}>✓ PICK</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {isDone&&(
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
          <div className="text-green-400 font-mono font-bold text-xl mb-3">✓ Veto Concluído!</div>
          <div className="flex justify-center gap-3 flex-wrap">
            {played.map(a=>(
              <div key={a.map} className="px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-lg">
                <div className="text-lg">{MAP_ICONS[a.map]}</div><div className="text-green-300 font-bold text-sm">{a.map}</div>
                <div className="text-green-600 font-mono text-xs">{a.action==="SOBRA"?"SOBRA":`PICK — ${a.team==="A"?nameA:nameB}`}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-zinc-500 font-mono text-xs uppercase mb-3">Histórico</div>
        <div className="flex flex-col gap-2">
          {actions.map((a,i)=>(
            <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${AS[a.action]?.border} ${AS[a.action]?.bg}`}>
              <span className="text-zinc-500 font-mono text-xs w-4">{i+1}</span>
              <span className={`font-mono font-bold text-xs w-10 ${AS[a.action]?.text}`}>{a.action}</span>
              {a.team&&<span className={`font-mono text-xs px-1.5 py-0.5 rounded border ${a.team==="A"?"border-orange-500/40 text-orange-400":"border-blue-500/40 text-blue-400"}`}>{a.team==="A"?nameA:nameB}</span>}
              {!a.team&&<span className="text-yellow-600 font-mono text-xs">★ sobra</span>}
              <span className="flex items-center gap-1.5 flex-1"><span>{MAP_ICONS[a.map]}</span><span className="text-zinc-200 font-bold text-sm">{a.map}</span></span>
            </div>
          ))}
          {actions.length===0&&<div className="text-zinc-700 text-sm font-mono text-center py-4">Aguardando início...</div>}
          {!isDone&&seq.slice(step).map((s,i)=>(
            <div key={`n${i}`} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-zinc-800/50 opacity-25">
              <span className="text-zinc-700 font-mono text-xs w-4">{step+i+1}</span>
              <span className={`font-mono font-bold text-xs w-10 ${AS[s.action]?.text}`}>{s.action}</span>
              {s.team&&<span className={`font-mono text-xs ${s.team==="A"?"text-orange-500":"text-blue-500"}`}>{s.team==="A"?nameA:nameB}</span>}
              {!s.team&&<span className="text-yellow-700 font-mono text-xs">★ sobra</span>}
              <span className="text-zinc-700 font-mono text-xs">aguardando...</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VetoTab(){
  const[mode,setMode]=useState(null);const[format,setFormat]=useState("bo3");const[nameA,setNameA]=useState("Time A");const[nameB,setNameB]=useState("Time B");
  const[started,setStarted]=useState(false);const[localState,setLocalState]=useState({format:"bo3",nameA:"Time A",nameB:"Time B",step:0,actions:[]});
  const sobraFired=useRef(false);const[roomCode,setRoomCode]=useState("");const[joinCode,setJoinCode]=useState("");
  const[myTeam,setMyTeam]=useState(null);const[onlineState,setOnlineState]=useState(null);const[roomStatus,setRoomStatus]=useState("idle");const[copied,setCopied]=useState(false);
  const pollRef=useRef(null);
  const getRoomKey=code=>`/veto-rooms/${code}`;
  const loadRoom=async code=>{try{return await fb.get(getRoomKey(code));}catch{return null;}};
  const saveRoom=async(code,state)=>{try{await fb.set(getRoomKey(code),state);}catch{}};
  const startPolling=code=>{if(pollRef.current)clearInterval(pollRef.current);pollRef.current=setInterval(async()=>{const r=await loadRoom(code);if(r)setOnlineState(r);},1500);};
  useEffect(()=>()=>{if(pollRef.current)clearInterval(pollRef.current);},[]);
  useEffect(()=>{if(mode!=="local")return;const seq=localState.format==="bo3"?BO3_SEQ:BO1_SEQ;const cur=seq[localState.step];const rem=MAPS.filter(m=>!localState.actions.find(a=>a.map===m));if(cur?.action==="SOBRA"&&rem.length===1&&!sobraFired.current){sobraFired.current=true;const map=rem[0];setTimeout(()=>setLocalState(s=>({...s,actions:[...s.actions,{map,action:"SOBRA",team:null}],step:s.step+1})),400);};},[localState.step,mode]);
  useEffect(()=>{if(!onlineState||!roomCode||myTeam!=="A")return;const seq=onlineState.format==="bo3"?BO3_SEQ:BO1_SEQ;const cur=seq[onlineState.step];const rem=MAPS.filter(m=>!onlineState.actions.find(a=>a.map===m));if(cur?.action==="SOBRA"&&rem.length===1){const map=rem[0];setTimeout(async()=>{const fresh=await loadRoom(roomCode);if(fresh&&fresh.step===onlineState.step){const ns={...fresh,actions:[...fresh.actions,{map,action:"SOBRA",team:null}],step:fresh.step+1};await saveRoom(roomCode,ns);setOnlineState(ns);}},500);};},[onlineState?.step]);
  const handleLocalAction=(map,action)=>{const seq=localState.format==="bo3"?BO3_SEQ:BO1_SEQ;const cur=seq[localState.step];if(!cur||cur.action==="SOBRA")return;sobraFired.current=false;setLocalState(s=>({...s,actions:[...s.actions,{map,action,team:cur.team}],step:s.step+1}));};
  const handleOnlineAction=async(map,action)=>{if(!roomCode||!myTeam)return;const fresh=await loadRoom(roomCode);if(!fresh)return;const seq=fresh.format==="bo3"?BO3_SEQ:BO1_SEQ;const cur=seq[fresh.step];if(!cur||cur.team!==myTeam)return;const ns={...fresh,actions:[...fresh.actions,{map,action,team:cur.team}],step:fresh.step+1};await saveRoom(roomCode,ns);setOnlineState(ns);};
  const createRoom=async()=>{const code=genCode();const init={format,nameA,nameB,step:0,actions:[],createdAt:Date.now()};await saveRoom(code,init);setRoomCode(code);setMyTeam("A");setOnlineState(init);setRoomStatus("waiting");startPolling(code);};
  const joinRoom=async()=>{const code=joinCode.trim().toUpperCase();if(code.length<4)return;const room=await loadRoom(code);if(!room){setRoomStatus("error");return;}setRoomCode(code);setMyTeam("B");setOnlineState(room);setRoomStatus("connected");startPolling(code);};
  const copyCode=()=>{navigator.clipboard?.writeText(roomCode);setCopied(true);setTimeout(()=>setCopied(false),2000);};
  const resetAll=()=>{if(pollRef.current)clearInterval(pollRef.current);setMode(null);setStarted(false);setRoomCode("");setJoinCode("");setMyTeam(null);setOnlineState(null);setRoomStatus("idle");setLocalState({format:"bo3",nameA:"Time A",nameB:"Time B",step:0,actions:[]});sobraFired.current=false;};

  if(!mode)return(<div className="flex flex-col gap-4"><div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"><h2 className="text-orange-400 font-mono font-bold text-sm uppercase tracking-widest mb-2">Veto de Mapas</h2><p className="text-zinc-500 text-sm mb-6">Escolha como quer jogar o veto:</p><div className="grid grid-cols-2 gap-4"><button onClick={()=>setMode("local")} className="flex flex-col items-center gap-3 p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-orange-500/50 rounded-xl transition-all group"><span className="text-4xl">🖥️</span><div className="text-center"><div className="text-zinc-100 font-bold font-mono text-sm group-hover:text-orange-400 transition-colors">LOCAL</div><div className="text-zinc-500 text-xs mt-1">Dois times na mesma tela</div></div></button><button onClick={()=>setMode("online")} className="flex flex-col items-center gap-3 p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-blue-500/50 rounded-xl transition-all group"><span className="text-4xl">🌐</span><div className="text-center"><div className="text-zinc-100 font-bold font-mono text-sm group-hover:text-blue-400 transition-colors">ONLINE</div><div className="text-zinc-500 text-xs mt-1">Cada time na sua casa • Firebase</div></div></button></div></div></div>);
  if(mode==="local"){if(!started)return(<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-5"><div className="flex items-center gap-3"><button onClick={resetAll} className="text-zinc-500 hover:text-zinc-300 text-sm">← Voltar</button><h2 className="text-orange-400 font-mono font-bold text-sm uppercase">Veto Local</h2></div><div className="grid grid-cols-2 gap-4">{[{l:"Time A",k:"nameA"},{l:"Time B",k:"nameB"}].map(({l,k})=>(<div key={k} className="flex flex-col gap-1"><label className="text-xs text-zinc-500 font-mono uppercase">{l}</label><input value={k==="nameA"?nameA:nameB} onChange={e=>k==="nameA"?setNameA(e.target.value):setNameB(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-orange-500"/></div>))}</div><div><label className="text-xs text-zinc-500 font-mono uppercase tracking-widest block mb-3">Formato</label><div className="grid grid-cols-2 gap-3">{[{v:"bo3",l:"Melhor de 3",d:"Ban Ban Pick Pick Ban Ban Sobra"},{v:"bo1",l:"Melhor de 1",d:"Ban Ban Ban Ban Ban Ban Sobra"}].map(f=>(<button key={f.v} onClick={()=>setFormat(f.v)} className={`p-4 rounded-xl border text-left transition-all ${format===f.v?"border-orange-500 bg-orange-500/10":"border-zinc-700 hover:border-zinc-600"}`}><div className={`font-mono font-bold text-sm ${format===f.v?"text-orange-400":"text-zinc-300"}`}>{f.l}</div><div className="text-zinc-500 text-xs mt-1 font-mono">{f.d}</div></button>))}</div></div><button onClick={()=>{setLocalState({format,nameA,nameB,step:0,actions:[]});sobraFired.current=false;setStarted(true);}} className="w-full bg-orange-500 hover:bg-orange-400 text-black font-mono font-bold py-3 rounded-xl text-sm uppercase">Iniciar Veto ▶</button></div>);
  return(<div className="flex flex-col gap-5"><div className="flex items-center gap-3"><button onClick={resetAll} className="text-zinc-500 hover:text-zinc-300 text-sm font-mono">← Voltar</button><span className="text-zinc-400 font-mono text-xs uppercase">Veto Local — {format.toUpperCase()}</span></div><VetoBoard state={localState} myTeam={null} onAction={handleLocalAction} isOnline={false}/><button onClick={resetAll} className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 font-mono py-2.5 rounded-xl text-sm">↺ Novo Veto</button></div>);}
  if(mode==="online"){
    if(roomStatus==="idle")return(<div className="flex flex-col gap-4"><div className="flex items-center gap-3 mb-2"><button onClick={resetAll} className="text-zinc-500 hover:text-zinc-300 text-sm">← Voltar</button><h2 className="text-blue-400 font-mono font-bold text-sm uppercase">Veto Online 🌐</h2></div><div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"><div className="text-zinc-300 font-bold text-sm mb-1">Criar uma sala</div><div className="text-zinc-500 text-xs mb-4">Você é o Time A e define as configurações</div><div className="grid grid-cols-2 gap-3 mb-4">{[{l:"Seu time (A)",k:"nameA"},{l:"Time adversário (B)",k:"nameB"}].map(({l,k})=>(<div key={k} className="flex flex-col gap-1"><label className="text-xs text-zinc-500 font-mono uppercase">{l}</label><input value={k==="nameA"?nameA:nameB} onChange={e=>k==="nameA"?setNameA(e.target.value):setNameB(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"/></div>))}</div><div className="flex gap-3 mb-4">{[{v:"bo3",l:"Melhor de 3"},{v:"bo1",l:"Melhor de 1"}].map(f=>(<button key={f.v} onClick={()=>setFormat(f.v)} className={`flex-1 py-2 rounded-lg border font-mono text-xs font-bold transition-all ${format===f.v?"border-blue-500 bg-blue-500/10 text-blue-400":"border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}>{f.l}</button>))}</div><button onClick={createRoom} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold py-3 rounded-xl text-sm uppercase">🔗 Criar Sala</button></div><div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"><div className="text-zinc-300 font-bold text-sm mb-1">Entrar em uma sala</div><div className="text-zinc-500 text-xs mb-4">Você é o Time B — cole o código que recebeu</div><div className="flex gap-2"><input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="CÓDIGO DA SALA" maxLength={6} className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 font-mono uppercase placeholder-zinc-600 focus:outline-none focus:border-blue-500 tracking-widest"/><button onClick={joinRoom} className="px-5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-mono font-bold rounded-lg text-sm">Entrar</button></div>{roomStatus==="error"&&<p className="text-red-400 font-mono text-xs mt-2">Sala não encontrada. Verifique o código.</p>}</div></div>);
    if(roomStatus==="waiting")return(<div className="flex flex-col gap-5"><div className="bg-zinc-900 border border-blue-500/30 rounded-xl p-6 text-center"><div className="text-blue-400 font-mono font-bold text-sm uppercase mb-4">Sala criada! Aguardando adversário...</div><div className="bg-zinc-800 border-2 border-blue-500/50 rounded-2xl p-6 mb-4 inline-block mx-auto"><div className="text-zinc-500 font-mono text-xs uppercase mb-2">Código da sala</div><div className="text-5xl font-black font-mono tracking-[0.3em] text-blue-300">{roomCode}</div></div><div className="text-zinc-500 text-sm mb-4">Mande esse código para o adversário entrar na sala</div><div className="flex gap-3 justify-center"><button onClick={copyCode} className={`px-6 py-2.5 rounded-lg font-mono text-sm font-bold transition-all ${copied?"bg-green-600 text-white":"bg-blue-600 hover:bg-blue-500 text-white"}`}>{copied?"✓ Copiado!":"📋 Copiar Código"}</button><button onClick={()=>setRoomStatus("connected")} className="px-6 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-mono text-sm font-bold rounded-lg">Já entrou → Começar</button></div><div className="flex items-center justify-center gap-2 mt-5"><div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"/><span className="text-zinc-500 font-mono text-xs">Sincronizado via Firebase</span></div></div><button onClick={resetAll} className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 font-mono py-2.5 rounded-xl text-sm">↺ Cancelar</button></div>);
    if(onlineState)return(<div className="flex flex-col gap-5"><div className="bg-zinc-900 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/><span className="text-zinc-300 font-mono text-xs">Sala <span className="text-blue-300 font-bold tracking-widest">{roomCode}</span></span><span className={`font-mono text-xs px-2 py-0.5 rounded border ${myTeam==="A"?"border-orange-500/40 text-orange-400 bg-orange-500/10":"border-blue-500/40 text-blue-400 bg-blue-500/10"}`}>Você: {myTeam==="A"?onlineState.nameA:onlineState.nameB}</span></div><button onClick={copyCode} className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">{copied?"✓ Copiado":"📋 Código"}</button></div><VetoBoard state={onlineState} myTeam={myTeam} onAction={handleOnlineAction} isOnline={true}/><button onClick={resetAll} className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 font-mono py-2.5 rounded-xl text-sm">↺ Sair da Sala</button></div>);
  }
  return null;
}

// ─── ABA: TABELAS ────────────────────────────────────────────

// ─── ABA: TABELAS — PROVA DE RESULTADO ───────────────────────

const PROOF_STATUS = {
  pending:  { text:"Pendente",  dot:"bg-orange-400", cls:"bg-orange-500/20 text-orange-400 border-orange-500/40" },
  approved: { text:"Validado",  dot:"bg-green-400",  cls:"bg-green-500/20  text-green-400  border-green-500/40"  },
  rejected: { text:"Rejeitado", dot:"bg-red-400",    cls:"bg-red-500/20    text-red-400    border-red-500/40"    },
};

// ─── MODAL: ENVIAR PROVA ─────────────────────────────────────
function ProofUploadModal({match, tournament, onClose, onSaved}){
  const [selMap,setSelMap]   = useState("");
  const [notes,setNotes]     = useState("");
  const [imgFile,setImgFile] = useState(null);
  const [imgPrev,setImgPrev] = useState(null);
  const [uploading,setUploading] = useState(false);
  const [dragging,setDragging]   = useState(false);
  const fileRef = useRef(null);

  const fmt = tournament?.format?.toUpperCase() || "—";
  const score = (match.score1 !== null && match.score2 !== null)
    ? `${match.score1} × ${match.score2}` : "— × —";

  const handleFile = file => {
    if (!file) return;
    const allowed = ["image/png","image/jpeg","image/jpg"];
    if (!allowed.includes(file.type)) { alert("Apenas PNG, JPG ou JPEG!"); return; }
    if (file.size > 4 * 1024 * 1024)  { alert("Máximo 4 MB por imagem."); return; }
    setImgFile(file);
    const r = new FileReader();
    r.onload = e => setImgPrev(e.target.result);
    r.readAsDataURL(file);
  };

  const handleDrop = e => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!imgFile) { alert("Selecione uma imagem de prova!"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async e => {
      const proof = {
        status:      "pending",
        notes,
        uploadedBy:  "Capitão",
        uploadedAt:  Date.now(),
        map:         selMap || MAPS[0],
        imageBase64: e.target.result,
        imageType:   imgFile.type,
        team1:  match.team1  || "TBD",
        team2:  match.team2  || "TBD",
        score1: match.score1,
        score2: match.score2,
        format: fmt,
      };
      await fb.set(`/match-proofs/${tournament.id}/${match.id}`, proof);
      onSaved(match.id, proof);
      setUploading(false);
      onClose();
    };
    reader.readAsDataURL(imgFile);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[95vh] flex flex-col"
           onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 text-base">↑</div>
            <div>
              <h3 className="text-zinc-100 font-bold text-sm">Enviar prova de resultado</h3>
              <p className="text-zinc-500 font-mono text-xs">{tournament?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors text-xl leading-none w-7 h-7 flex items-center justify-center">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">

          {/* Times + Placar + Formato */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Time 1</label>
              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-300 font-bold truncate">{match.team1||"TBD"}</div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Placar</label>
              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-orange-400 font-black text-center">{score}</div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Time 2</label>
              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-300 font-bold text-right truncate">{match.team2||"TBD"}</div>
            </div>
          </div>

          {/* Mapa + Formato */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Mapa jogado</label>
              <select value={selMap} onChange={e=>setSelMap(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-orange-500">
                <option value="">— Selecionar mapa —</option>
                {MAPS.map(m=><option key={m} value={m}>{MAP_ICONS[m]} {m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Formato</label>
              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-400 font-mono">{fmt}</div>
            </div>
          </div>

          {/* Upload área */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Imagem da prova *</label>
            {!imgPrev ? (
              <div
                onDragOver={e=>{e.preventDefault();setDragging(true);}}
                onDragLeave={()=>setDragging(false)}
                onDrop={handleDrop}
                onClick={()=>fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${dragging
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/30"}`}>
                <div className="text-4xl mb-2">🖼️</div>
                <div className="text-zinc-300 text-sm font-mono font-bold">Arraste ou clique para selecionar</div>
                <div className="text-zinc-600 text-xs mt-1">PNG · JPG · JPEG · máx 4 MB</div>
                <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg"
                  className="hidden" onChange={e=>handleFile(e.target.files[0])}/>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800">
                <img src={imgPrev} alt="Preview" className="w-full max-h-52 object-contain"/>
                <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/95 border-t border-zinc-700">
                  <span className="text-zinc-500 text-xs font-mono truncate max-w-[80%]">{imgFile?.name}</span>
                  <button onClick={()=>{setImgFile(null);setImgPrev(null);}}
                    className="w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center text-xs font-bold shrink-0 transition-colors">✕</button>
                </div>
              </div>
            )}
          </div>

          {/* Observação */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Observação (opcional)</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Algum detalhe sobre a partida..." rows={2}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500 resize-none"/>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-6 py-4 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-zinc-700 hover:border-zinc-500 text-zinc-400 font-mono text-sm rounded-xl transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={uploading||!imgFile}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-mono font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
            {uploading?<><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"/>Enviando...</>:"↑ Enviar prova"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL: VER PROVA ────────────────────────────────────────
function ProofViewModal({match, proof, isAdmin, onClose, onStatusChange}){
  const [changing, setChanging] = useState(false);
  const st = proof ? PROOF_STATUS[proof.status] : null;
  const date = proof?.uploadedAt
    ? new Date(proof.uploadedAt).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})
    : "—";

  const changeStatus = async status => {
    setChanging(true);
    await onStatusChange(match.id, status);
    setChanging(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[95vh] flex flex-col"
           onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-700/50 border border-zinc-600/50 flex items-center justify-center text-zinc-300 text-base">🖼</div>
            <h3 className="text-zinc-100 font-bold text-sm">Prova de resultado</h3>
          </div>
          <div className="flex items-center gap-3">
            {st && (
              <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${st.cls}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${st.dot} mr-1.5 align-middle`}/>
                {st.text}
              </span>
            )}
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors text-xl leading-none w-7 h-7 flex items-center justify-center">✕</button>
          </div>
        </div>

        {!proof ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-zinc-500 font-mono text-sm">Nenhuma prova enviada para esta partida.</div>
          </div>
        ) : (
          <div className="p-6 flex flex-col gap-4 overflow-y-auto">

            {/* Times + placar */}
            <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-zinc-100 font-bold text-sm flex-1 truncate">{proof.team1||"TBD"}</span>
                <div className="text-center shrink-0">
                  <div className="text-orange-400 font-black text-lg font-mono leading-none">
                    {proof.score1 !== null && proof.score2 !== null ? `${proof.score1}×${proof.score2}` : "—×—"}
                  </div>
                  {proof.map && (
                    <div className="text-zinc-500 font-mono text-[10px] mt-0.5">{MAP_ICONS[proof.map]} {proof.map}</div>
                  )}
                  {proof.format && (
                    <div className="text-zinc-600 font-mono text-[9px]">{proof.format}</div>
                  )}
                </div>
                <span className="text-zinc-100 font-bold text-sm flex-1 text-right truncate">{proof.team2||"TBD"}</span>
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-800/40 rounded-xl p-3">
                <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mb-1">Enviado por</div>
                <div className="text-zinc-200 text-sm font-bold">{proof.uploadedBy||"—"}</div>
              </div>
              <div className="bg-zinc-800/40 rounded-xl p-3">
                <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mb-1">Data e hora</div>
                <div className="text-zinc-300 text-xs font-mono">{date}</div>
              </div>
            </div>

            {/* Imagem */}
            {proof.imageBase64 && (
              <div className="rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800">
                <img src={proof.imageBase64} alt="Prova de resultado"
                  className="w-full object-contain max-h-64"/>
              </div>
            )}

            {/* Observação */}
            {proof.notes && (
              <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-3">
                <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mb-1">Observação</div>
                <div className="text-zinc-300 text-sm">{proof.notes}</div>
              </div>
            )}

            {/* Admin controls */}
            {isAdmin && (
              <div className="border-t border-zinc-800 pt-4">
                <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mb-3">Controles do administrador</div>
                <div className="flex gap-2">
                  <button
                    onClick={()=>changeStatus("approved")}
                    disabled={changing || proof.status === "approved"}
                    className={`flex-1 py-2.5 rounded-xl font-mono font-bold text-sm transition-colors flex items-center justify-center gap-1.5
                      ${proof.status === "approved"
                        ? "bg-green-600/20 text-green-500 border border-green-500/30 cursor-default"
                        : "bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"}`}>
                    {changing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "✓"} Aprovar
                  </button>
                  <button
                    onClick={()=>changeStatus("rejected")}
                    disabled={changing || proof.status === "rejected"}
                    className={`flex-1 py-2.5 rounded-xl font-mono font-bold text-sm transition-colors flex items-center justify-center gap-1.5
                      ${proof.status === "rejected"
                        ? "bg-red-600/20 text-red-500 border border-red-500/30 cursor-default"
                        : "bg-red-600/80 hover:bg-red-600 text-white disabled:opacity-50"}`}>
                    {changing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "✕"} Rejeitar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-zinc-800 px-6 py-4 shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 border border-zinc-700 hover:border-zinc-500 text-zinc-400 font-mono text-sm rounded-xl transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MATCH CARD (com prova) ───────────────────────────────────
function MatchCard({m, isAdmin, onClick, proof, onViewProof, onSendProof}){
  const isDone  = m.winner !== null;
  const isGF    = m.bracket === "GF";
  const isLFin  = m.label === "Lower Final";
  const st      = proof ? PROOF_STATUS[proof.status] : null;

  return(
    <div className={`rounded-lg border overflow-hidden w-48 transition-all relative
      ${isGF   ? "border-yellow-500/50 bg-yellow-500/5"
      : isLFin ? "border-purple-500/40 bg-purple-500/5"
      : isDone ? "border-zinc-700 bg-zinc-800/60"
      :          "border-zinc-700 bg-zinc-800/30"}`}>

      {/* Status badge — canto superior direito */}
      {st && (
        <div className="absolute top-1 right-1 z-10 pointer-events-none">
          <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 rounded-sm border ${st.cls} flex items-center gap-0.5`}>
            <span className={`w-1 h-1 rounded-full ${st.dot} shrink-0`}/>
            {st.text}
          </span>
        </div>
      )}

      {/* Label (Winner Final / Grand Final / etc.) */}
      {m.label && (
        <div className={`text-center text-[9px] font-mono uppercase py-0.5 font-bold
          ${isGF    ? "text-yellow-400 bg-yellow-500/10"
          : isLFin  ? "text-purple-400 bg-purple-500/10"
          :           "text-zinc-500 bg-zinc-800"}`}>
          {m.label}
        </div>
      )}

      {/* Time 1 */}
      <div onClick={()=>isAdmin&&onClick(m)}
        className={`flex items-center gap-2 px-2 py-1.5 border-b border-zinc-700/50 ${isAdmin?"cursor-pointer":""} ${m.winner===m.team1?"bg-orange-500/10":""}`}>
        <span className={`flex-1 text-xs font-bold truncate pr-4
          ${m.team1 ? m.winner===m.team1 ? "text-orange-300" : "text-zinc-200" : "text-zinc-600"}`}>
          {m.team1||"TBD"}
        </span>
        {isDone && (
          <span className={`font-mono text-xs font-black w-5 text-center rounded shrink-0
            ${m.winner===m.team1 ? "bg-orange-500 text-black" : "text-zinc-500"}`}>
            {m.score1??""}
          </span>
        )}
      </div>

      {/* Time 2 */}
      <div onClick={()=>isAdmin&&onClick(m)}
        className={`flex items-center gap-2 px-2 py-1.5 ${isAdmin?"cursor-pointer":""} ${m.winner===m.team2?"bg-orange-500/10":""}`}>
        <span className={`flex-1 text-xs font-bold truncate pr-4
          ${m.team2 ? m.winner===m.team2 ? "text-orange-300" : "text-zinc-200" : "text-zinc-600"}`}>
          {m.team2||"TBD"}
        </span>
        {isDone && (
          <span className={`font-mono text-xs font-black w-5 text-center rounded shrink-0
            ${m.winner===m.team2 ? "bg-orange-500 text-black" : "text-zinc-500"}`}>
            {m.score2??""}
          </span>
        )}
      </div>

      {/* Botões de prova */}
      <div className="flex border-t border-zinc-700/50 bg-zinc-900/60">
        <button
          onClick={e=>{e.stopPropagation(); onViewProof(m);}}
          className="flex-1 flex items-center justify-center gap-0.5 py-1.5 text-[9px] font-mono text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/40 transition-colors">
          🖼 <span>Ver prova</span>
        </button>
        <div className="w-px bg-zinc-700/50"/>
        <button
          onClick={e=>{e.stopPropagation(); onSendProof(m);}}
          className="flex-1 flex items-center justify-center gap-0.5 py-1.5 text-[9px] font-mono text-orange-500/80 hover:text-orange-400 hover:bg-zinc-700/40 transition-colors">
          ↑ <span>Enviar prova</span>
        </button>
      </div>
    </div>
  );
}

// ─── BRACKET COLUMN (com prova) ──────────────────────────────
function BracketColumn({label, rounds, isAdmin, onMatch, proofData, onViewProof, onSendProof}){
  return(
    <div className="flex flex-col gap-1 min-w-[12rem]">
      <div className="text-center text-zinc-500 font-mono text-[10px] uppercase tracking-wider mb-2 pb-1 border-b border-zinc-800">{label}</div>
      <div className="flex flex-col gap-2">
        {rounds.map(m=>(
          <MatchCard
            key={m.id}
            m={m}
            isAdmin={isAdmin}
            onClick={onMatch}
            proof={proofData?.[m.id]}
            onViewProof={onViewProof}
            onSendProof={onSendProof}
          />
        ))}
      </div>
    </div>
  );
}

// ─── ABA: TABELAS ────────────────────────────────────────────
function genBracket(teams){
  const n=teams.length;const seedings4=[[0,3],[1,2]];const seedings8=[[0,7],[3,4],[2,5],[1,6]];const seeds=n===4?seedings4:seedings8;
  let id=1;const mid=()=>`M${id++}`;const W=[];
  const wR1=seeds.map(([a,b])=>({id:mid(),bracket:"W",round:1,team1:teams[a]||"",team2:teams[b]||"",score1:null,score2:null,winner:null,loser:null,nextWin:null,nextLose:null}));
  W.push(wR1);let prev=wR1;let wr=2;
  while(prev.length>1){const cur=[];for(let i=0;i<prev.length;i+=2){const m={id:mid(),bracket:"W",round:wr,team1:null,team2:null,score1:null,score2:null,winner:null,loser:null,nextWin:null,nextLose:null};prev[i].nextWin=m.id;prev[i+1].nextWin=m.id;cur.push(m);}W.push(cur);prev=cur;wr++;}
  const wFinal=W[W.length-1][0];wFinal.label="Winner Final";const L=[];
  const lr1Pairs=n===4?[[0,1]]:[[0,3],[1,2]];
  const lR1=lr1Pairs.map(([a,b])=>({id:mid(),bracket:"L",round:1,team1:null,team2:null,score1:null,score2:null,winner:null,loser:null,nextWin:null,nextLose:null}));
  if(n===4){wR1[0].nextLose=lR1[0].id;wR1[1].nextLose=lR1[0].id;}else{wR1[0].nextLose=lR1[0].id;wR1[3].nextLose=lR1[0].id;wR1[1].nextLose=lR1[1].id;wR1[2].nextLose=lR1[1].id;}
  L.push(lR1);let lPrev=lR1;let lr=2;const wLosersPerRound=W.slice(1,-1);
  for(let wi=0;wi<wLosersPerRound.length;wi++){const wLosers=wLosersPerRound[wi];const challenge=lPrev.map((lm,i)=>{const wm=wLosers[i]||wLosers[0];const m={id:mid(),bracket:"L",round:lr,team1:null,team2:null,score1:null,score2:null,winner:null,loser:null,nextWin:null,nextLose:null};lm.nextWin=m.id;wm.nextLose=m.id;return m;});L.push(challenge);lr++;if(challenge.length>1){const norm=[];for(let i=0;i<challenge.length;i+=2){const m={id:mid(),bracket:"L",round:lr,team1:null,team2:null,score1:null,score2:null,winner:null,loser:null,nextWin:null,nextLose:null};challenge[i].nextWin=m.id;challenge[i+1].nextWin=m.id;norm.push(m);}L.push(norm);lr++;lPrev=norm;}else{lPrev=challenge;}}
  const lFinal={id:mid(),bracket:"L",round:lr,team1:null,team2:null,score1:null,score2:null,winner:null,loser:null,nextWin:null,nextLose:null,label:"Lower Final"};
  if(lPrev[0])lPrev[0].nextWin=lFinal.id;wFinal.nextLose=lFinal.id;L.push([lFinal]);
  const gf={id:mid(),bracket:"GF",round:0,team1:null,team2:null,score1:null,score2:null,winner:null,loser:null,label:"Grand Final"};
  wFinal.nextWin=gf.id;lFinal.nextWin=gf.id;
  const allMatches=[...W.flat(),...L.flat(),gf];return{W,L,gf,allMatches};
}

function TournamentTab({isAdmin,setShowLogin}){
  const[tournaments,setTournaments]=useState([]);const[loading,setLoading]=useState(true);const[view,setView]=useState("list");const[current,setCurrent]=useState(null);
  const[editMatch,setEditMatch]=useState(null);const[s1,setS1]=useState("");const[s2,setS2]=useState("");const[creating,setCreating]=useState(false);
  const[tName,setTName]=useState("");const[tFormat,setTFormat]=useState("md3");const[tCount,setTCount]=useState(8);const[tTeams,setTTeams]=useState(Array(8).fill(""));

  // ── Proof state ──────────────────────────────────────────────
  const [proofData,   setProofData]   = useState({});
  const [uploadModal, setUploadModal] = useState(null); // match obj
  const [viewModal,   setViewModal]   = useState(null); // match obj

  useEffect(()=>{fb.get("/tournaments").then(d=>{setTournaments(d?Object.entries(d).map(([id,v])=>({...v,id})):[]);setLoading(false);});} ,[]);

  // Carrega provas quando o torneio é aberto
  useEffect(()=>{
    if(current?.id){
      fb.get(`/match-proofs/${current.id}`).then(d=>setProofData(d||{}));
    } else {
      setProofData({});
    }
  },[current?.id]);

  const handleSaveProof = (matchId, proof) => {
    setProofData(prev => ({...prev, [matchId]: proof}));
  };

  const handleStatusChange = async (matchId, status) => {
    await fb.patch(`/match-proofs/${current.id}/${matchId}`, {status});
    setProofData(prev => ({...prev, [matchId]: {...(prev[matchId]||{}), status}}));
  };

  const createTournament=async()=>{if(!tName.trim())return;const filledTeams=tTeams.slice(0,tCount).map((t,i)=>t.trim()||`Time ${i+1}`);const{W,L,gf,allMatches}=genBracket(filledTeams);const t={name:tName,format:tFormat,teamCount:tCount,teams:filledTeams,matches:allMatches,wRounds:W.length,lRounds:L.length,status:"active",createdAt:Date.now()};setCreating(true);const res=await fb.push("/tournaments",t);if(res?.name){const nt={...t,id:res.name};setTournaments(ts=>[nt,...ts]);setCurrent(nt);setView("bracket");}setCreating(false);};

  const saveMatchResult=async()=>{if(!editMatch||!current)return;const sc1=Number(s1);const sc2=Number(s2);if(s1===""||s2==="")return;if(sc1===sc2){alert("Placar empatado!");return;}const winner=sc1>sc2?editMatch.team1:editMatch.team2;const loser=sc1>sc2?editMatch.team2:editMatch.team1;const updatedMatch={...editMatch,score1:sc1,score2:sc2,winner,loser};let newMatches=[...current.matches.map(m=>m.id===editMatch.id?updatedMatch:m)];const map=Object.fromEntries(newMatches.map(m=>[m.id,{...m}]));const place=(mid,name)=>{if(!mid||!map[mid])return;if(!map[mid].team1)map[mid].team1=name;else if(!map[mid].team2)map[mid].team2=name;};place(updatedMatch.nextWin,winner);place(updatedMatch.nextLose,loser);newMatches=Object.values(map);const updated={...current,matches:newMatches};await fb.set(`/tournaments/${current.id}/matches`,newMatches);setCurrent(updated);setTournaments(ts=>ts.map(t=>t.id===current.id?updated:t));setEditMatch(null);setS1("");setS2("");};

  const deleteTournament=async(id)=>{if(!window.confirm("Excluir este torneio?"))return;await fb.delete(`/tournaments/${id}`);setTournaments(ts=>ts.filter(t=>t.id!==id));if(current?.id===id){setCurrent(null);setView("list");}};

  const buildView=()=>{if(!current)return null;const wRounds=[];const lRounds=[];const maxWR=Math.max(...current.matches.filter(m=>m.bracket==="W").map(m=>m.round),0);const maxLR=Math.max(...current.matches.filter(m=>m.bracket==="L").map(m=>m.round),0);for(let r=1;r<=maxWR;r++)wRounds.push(current.matches.filter(m=>m.bracket==="W"&&m.round===r));for(let r=1;r<=maxLR;r++)lRounds.push(current.matches.filter(m=>m.bracket==="L"&&m.round===r));const gf=current.matches.find(m=>m.bracket==="GF");return{wRounds,lRounds,gf};};

  const bv=view==="bracket"&&current?buildView():null;

  // ── Handlers dos botões de prova ─────────────────────────────
  const openViewModal  = match => setViewModal(match);
  const openSendModal  = match => setUploadModal(match);

  if(view==="create")return(<div className="flex flex-col gap-5"><div className="flex items-center gap-3"><button onClick={()=>setView("list")} className="text-zinc-500 hover:text-zinc-300 text-sm font-mono">← Voltar</button><h2 className="text-orange-400 font-mono font-bold text-sm uppercase">Criar Torneio</h2></div><div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4"><div className="grid grid-cols-2 gap-4"><div className="flex flex-col gap-1"><label className="text-xs text-zinc-500 font-mono uppercase">Nome do Torneio</label><input value={tName} onChange={e=>setTName(e.target.value)} placeholder="Arena Cup" className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-orange-500"/></div><div className="flex flex-col gap-1"><label className="text-xs text-zinc-500 font-mono uppercase">Formato</label><div className="flex gap-2">{[{v:"md3",l:"MD3"},{v:"md1",l:"MD1"}].map(f=>(<button key={f.v} onClick={()=>setTFormat(f.v)} className={`flex-1 py-2 rounded-lg border font-mono text-sm font-bold transition-all ${tFormat===f.v?"border-orange-500 bg-orange-500/10 text-orange-400":"border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}>{f.l}</button>))}</div></div></div><div className="flex flex-col gap-1"><label className="text-xs text-zinc-500 font-mono uppercase">Número de Times</label><div className="flex gap-2">{[4,8].map(n=>(<button key={n} onClick={()=>{setTCount(n);setTTeams(Array(n).fill(""));}} className={`px-6 py-2 rounded-lg border font-mono text-sm font-bold transition-all ${tCount===n?"border-orange-500 bg-orange-500/10 text-orange-400":"border-zinc-700 text-zinc-500"}`}>{n} times</button>))}</div></div><div><label className="text-xs text-zinc-500 font-mono uppercase block mb-2">Nomes dos Times (por seed)</label><div className="grid grid-cols-2 gap-2">{Array(tCount).fill(0).map((_,i)=>(<div key={i} className="flex items-center gap-2"><span className="text-zinc-600 font-mono text-xs w-6 text-right">{i+1}.</span><input value={tTeams[i]||""} onChange={e=>{const t=[...tTeams];t[i]=e.target.value;setTTeams(t);}} placeholder={`Time ${i+1}`} className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-orange-500"/></div>))}</div></div><button onClick={createTournament} disabled={!tName.trim()||creating} className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 text-black font-mono font-bold py-3 rounded-xl text-sm uppercase flex items-center justify-center gap-2">{creating&&<div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"/>}Gerar Chaveamento ▶</button></div></div>);

  if(view==="bracket"&&current&&bv) return(
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={()=>setView("list")} className="text-zinc-500 hover:text-zinc-300 text-sm font-mono">← Voltar</button>
          <div>
            <h2 className="text-zinc-100 font-black text-lg">{current.name}</h2>
            <span className="text-zinc-500 font-mono text-xs">{current.format.toUpperCase()} · {current.teamCount} times · Double Elimination</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin&&<span className="text-orange-400 font-mono text-xs border border-orange-500/30 px-2 py-1 rounded">Clique no placar para editar</span>}
          {!isAdmin&&<button onClick={()=>setShowLogin(true)} className="text-zinc-500 font-mono text-xs border border-zinc-700 px-2 py-1 rounded hover:border-zinc-500">🔒 Editar</button>}
        </div>
      </div>

      {/* Legenda de status */}
      <div className="flex items-center gap-3 px-1">
        {Object.entries(PROOF_STATUS).map(([k,v])=>(
          <div key={k} className="flex items-center gap-1.5">
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${v.cls}`}>
              <span className={`inline-block w-1 h-1 rounded-full ${v.dot} mr-1 align-middle`}/>
              {v.text}
            </span>
          </div>
        ))}
        <span className="text-zinc-700 text-xs font-mono">← status da prova</span>
      </div>

      {/* Winner Bracket */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-orange-400 font-mono text-xs font-bold uppercase mb-4">🏆 Winner Bracket</div>
        <div className="flex gap-6 overflow-x-auto pb-2">
          {bv.wRounds.map((rnd,ri)=>(
            <BracketColumn
              key={ri}
              label={ri===bv.wRounds.length-1?"Winner Final":`Fase ${ri+1}`}
              rounds={rnd}
              isAdmin={isAdmin}
              onMatch={m=>{setEditMatch(m);setS1(m.score1??'');setS2(m.score2??'');}}
              proofData={proofData}
              onViewProof={openViewModal}
              onSendProof={openSendModal}
            />
          ))}
          {bv.gf&&(
            <BracketColumn
              label="Grand Final"
              rounds={[bv.gf]}
              isAdmin={isAdmin}
              onMatch={m=>{setEditMatch(m);setS1(m.score1??'');setS2(m.score2??'');}}
              proofData={proofData}
              onViewProof={openViewModal}
              onSendProof={openSendModal}
            />
          )}
        </div>
      </div>

      {/* Lower Bracket */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-blue-400 font-mono text-xs font-bold uppercase mb-4">📉 Lower Bracket</div>
        <div className="flex gap-6 overflow-x-auto pb-2">
          {bv.lRounds.map((rnd,ri)=>(
            <BracketColumn
              key={ri}
              label={`Perdedores F${ri+1}`}
              rounds={rnd}
              isAdmin={isAdmin}
              onMatch={m=>{setEditMatch(m);setS1(m.score1??'');setS2(m.score2??'');}}
              proofData={proofData}
              onViewProof={openViewModal}
              onSendProof={openSendModal}
            />
          ))}
        </div>
      </div>

      {/* Modal: editar placar (admin) */}
      {editMatch&&isAdmin&&(
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={()=>{setEditMatch(null);setS1("");setS2("");}}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-80 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="text-zinc-100 font-bold text-base mb-1">Resultado da Partida</h3>
            <p className="text-zinc-500 text-xs mb-4 font-mono">{current.format.toUpperCase()} · {current.format==="md3"?"Melhor de 3 mapas (ex: 2-0, 2-1)":"Melhor de 1 mapa (ex: 13-7)"}</p>
            <div className="flex flex-col gap-3 mb-4">
              {[{team:editMatch.team1,s:s1,setS:setS1},{team:editMatch.team2,s:s2,setS:setS2}].map(({team,s,setS},i)=>(
                <div key={i} className="flex items-center gap-3">
                  <span className="text-zinc-200 font-bold text-sm flex-1">{team||"TBD"}</span>
                  <input type="number" value={s} onChange={e=>setS(e.target.value)} min="0" className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-center text-zinc-200 font-mono font-bold text-lg focus:outline-none focus:border-orange-500"/>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={()=>{setEditMatch(null);setS1("");setS2("");}} className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 font-mono text-sm">Cancelar</button>
              <button onClick={saveMatchResult} disabled={s1===""||s2===""||Number(s1)===Number(s2)} className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 text-black font-mono font-bold text-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: enviar prova */}
      {uploadModal && (
        <ProofUploadModal
          match={uploadModal}
          tournament={current}
          onClose={()=>setUploadModal(null)}
          onSaved={handleSaveProof}
        />
      )}

      {/* Modal: ver prova */}
      {viewModal && (
        <ProofViewModal
          match={viewModal}
          proof={proofData[viewModal.id]}
          isAdmin={isAdmin}
          onClose={()=>setViewModal(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );

  return(
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-zinc-100 font-black text-xl">Tabelas</h2><p className="text-zinc-500 text-xs mt-0.5">Chaveamentos Double Elimination</p></div>
        {isAdmin
          ?<button onClick={()=>{setView("create");setTName("");setTFormat("md3");setTCount(8);setTTeams(Array(8).fill(""));}} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black font-mono font-bold rounded-lg text-sm">＋ Novo Torneio</button>
          :<button onClick={()=>setShowLogin(true)} className="flex items-center gap-2 px-4 py-2 border border-zinc-700 text-zinc-400 font-mono rounded-lg text-sm hover:border-zinc-500">🔒 Login Admin</button>
        }
      </div>
      {loading&&<div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-zinc-600 border-t-orange-400 rounded-full animate-spin"/></div>}
      <div className="flex flex-col gap-3">
        {tournaments.map(t=>(
          <div key={t.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 flex items-center gap-4 transition-colors cursor-pointer" onClick={()=>{setCurrent(t);setView("bracket");setProofData({});}}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-400 flex items-center justify-center font-black text-black text-sm shrink-0">🏆</div>
            <div className="flex-1">
              <div className="text-zinc-100 font-bold">{t.name}</div>
              <div className="text-zinc-500 text-xs mt-0.5 font-mono">{t.format.toUpperCase()} · {t.teamCount} times · Double Elimination · {new Date(t.createdAt).toLocaleDateString("pt-BR")}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-400 font-mono text-xs border border-orange-500/30 px-2 py-1 rounded">Ver Chave →</span>
              {isAdmin&&<button onClick={e=>{e.stopPropagation();deleteTournament(t.id);}} className="text-zinc-600 hover:text-red-400 transition-colors text-sm px-1">✕</button>}
            </div>
          </div>
        ))}
        {tournaments.length===0&&!loading&&(
          <div className="text-center text-zinc-600 font-mono py-16 border border-dashed border-zinc-800 rounded-xl">
            Nenhum torneio criado ainda.<br/>
            <span className="text-xs">{isAdmin?"Clique em '+ Novo Torneio' para começar.":"Faça login como admin para criar torneios."}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────
export default function App(){
  const[tab,setTab]=useState("mix");
  const[players,setPlayers]=useState([]);
  const[matches,setMatches]=useState([]);
  const[loadingPlayers,setLoadingPlayers]=useState(true);
  const[isAdmin,setIsAdmin]=useState(()=>sessionStorage.getItem("rivotricsmt_admin")==="1");
  const[showLogin,setShowLogin]=useState(false);
  const[loginPwd,setLoginPwd]=useState("");
  const[loginErr,setLoginErr]=useState(false);

  const ADMIN_PASSWORD="rivotricsmt@2025";
  const handleLogin=()=>{if(loginPwd===ADMIN_PASSWORD){setIsAdmin(true);sessionStorage.setItem("rivotricsmt_admin","1");setShowLogin(false);setLoginPwd("");setLoginErr(false);}else{setLoginErr(true);}};
  const handleLogout=()=>{setIsAdmin(false);sessionStorage.removeItem("rivotricsmt_admin");};

  useEffect(()=>{
    fb.get("/players").then(data=>{setPlayers(toArr(data));setLoadingPlayers(false);});
    fb.get("/matches").then(data=>{setMatches(toArr(data));});
  },[]);

  const tabs=[
    {id:"mix",   label:"🎮 Jogar Mix"},
    {id:"roster",label:"📋 Jogadores"},
    {id:"draft", label:"🎯 Draft"},
    {id:"veto",  label:"🗺 Veto"},
    {id:"history",label:"🏆 Tabelas"},
  ];

  return(
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-4 py-4">
            <button onClick={()=>setTab("mix")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-500 to-yellow-400 flex items-center justify-center font-black text-black text-sm">CS</div>
              <div><div className="font-black text-base leading-none text-zinc-100 tracking-wide">RIVOTRICSMT</div><div className="text-orange-400 font-mono text-xs">Counter-Strike 2 · Firebase</div></div>
            </button>
            <div className="ml-auto flex items-center gap-3">
              {loadingPlayers?<div className="w-5 h-5 border-2 border-zinc-600 border-t-orange-400 rounded-full animate-spin"/>:<><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/><span className="text-green-400 font-mono text-xs">{players.length} jogadores</span></>}
              {isAdmin?<button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-400 font-mono text-xs font-bold hover:bg-orange-500/20 transition-colors">🔓 Admin</button>:<button onClick={()=>setShowLogin(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 font-mono text-xs hover:border-zinc-500 transition-colors">🔒 Admin</button>}
            </div>
            {showLogin&&(
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={()=>{setShowLogin(false);setLoginErr(false);setLoginPwd("");}}>
                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-80 shadow-2xl" onClick={e=>e.stopPropagation()}>
                  <div className="text-center mb-5"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-400 flex items-center justify-center font-black text-black text-xl mx-auto mb-3">🔐</div><div className="text-zinc-100 font-bold text-lg">Acesso Admin</div><div className="text-zinc-500 text-xs mt-1">Digite a senha para acessar o painel</div></div>
                  <input type="password" value={loginPwd} onChange={e=>{setLoginPwd(e.target.value);setLoginErr(false);}} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Senha" className={`w-full bg-zinc-800 border rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none mb-3 ${loginErr?"border-red-500":"border-zinc-700 focus:border-orange-500"}`}/>
                  {loginErr&&<p className="text-red-400 font-mono text-xs mb-3 text-center">Senha incorreta!</p>}
                  <div className="flex gap-2"><button onClick={()=>{setShowLogin(false);setLoginErr(false);setLoginPwd("");}} className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 font-mono text-sm hover:bg-zinc-800">Cancelar</button><button onClick={handleLogin} className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-mono font-bold text-sm">Entrar</button></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-0">
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`px-5 py-3 font-mono text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${tab===t.id?"border-orange-500 text-orange-400":"border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {tab==="mix"    &&<MixTab isAdmin={isAdmin} setShowLogin={setShowLogin}/>}
        {tab==="roster" &&<RosterTab players={players} setPlayers={setPlayers}/>}
        {tab==="draft"  &&<DraftTab players={players} matches={matches} setMatches={setMatches}/>}
        {tab==="veto"   &&<VetoTab/>}
        {tab==="history"&&<TournamentTab isAdmin={isAdmin} setShowLogin={setShowLogin}/>}
      </div>

      <div className="border-t border-zinc-900 mt-12 py-4 text-center">
        <span className="text-zinc-700 font-mono text-xs">RIVOTRICSMT — v5.0 — Firebase Realtime Database</span>
      </div>
    </div>
  );
}
