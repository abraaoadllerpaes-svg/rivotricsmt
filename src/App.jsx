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

const GC_LEVELS = [
  {level:0,minPts:0,maxPts:99},{level:1,minPts:100,maxPts:249},{level:2,minPts:250,maxPts:449},
  {level:3,minPts:450,maxPts:699},{level:4,minPts:700,maxPts:999},{level:5,minPts:1000,maxPts:1349},
  {level:6,minPts:1350,maxPts:1749},{level:7,minPts:1750,maxPts:2199},{level:8,minPts:2200,maxPts:2699},
  {level:9,minPts:2700,maxPts:3249},{level:10,minPts:3250,maxPts:3849},{level:11,minPts:3850,maxPts:4499},
  {level:12,minPts:4500,maxPts:5199},{level:13,minPts:5200,maxPts:5949},{level:14,minPts:5950,maxPts:6749},
  {level:15,minPts:6750,maxPts:7599},{level:16,minPts:7600,maxPts:8499},{level:17,minPts:8500,maxPts:9449},
  {level:18,minPts:9450,maxPts:10449},{level:19,minPts:10450,maxPts:11499},
  {level:20,minPts:11500,maxPts:12999},{level:21,minPts:13000,maxPts:99999},
];
const FACEIT_LEVELS = [
  {level:1,minElo:100,maxElo:500},{level:2,minElo:501,maxElo:750},{level:3,minElo:751,maxElo:900},
  {level:4,minElo:901,maxElo:1050},{level:5,minElo:1051,maxElo:1200},{level:6,minElo:1201,maxElo:1350},
  {level:7,minElo:1351,maxElo:1530},{level:8,minElo:1531,maxElo:1750},{level:9,minElo:1751,maxElo:2000},
  {level:10,minElo:2001,maxElo:99999},
];

// ─── SCORE & SEEDS ────────────────────────────────────────────
function calcEloProgress(elo,lvl){if(!lvl)return 0.5;const r=lvl.maxElo-lvl.minElo;if(r<=0||lvl.maxElo===99999)return 1;return Math.min(Math.max((elo-lvl.minElo)/r,0),1);}
function calcPtsProgress(pts,lvl){if(!lvl)return 0.5;const r=lvl.maxPts-lvl.minPts;if(r<=0||lvl.maxPts===99999)return 1;return Math.min(Math.max((pts-lvl.minPts)/r,0),1);}
function calcScore(p){
  const hasGC=p.gcLevel!==""&&p.gcPoints!=="";const hasFC=p.faceitLevel!==""&&p.faceitElo!=="";
  let gc=0,fc=0;
  if(hasGC){const lvl=GC_LEVELS[Number(p.gcLevel)];gc=(Number(p.gcLevel)/21*0.70+calcPtsProgress(Number(p.gcPoints),lvl)*0.30)*100;}
  if(hasFC){const lvl=FACEIT_LEVELS[Number(p.faceitLevel)-1];fc=(Number(p.faceitLevel)/10*0.70+calcEloProgress(Number(p.faceitElo),lvl)*0.30)*100;}
  if(hasGC&&hasFC)return fc*0.55+gc*0.45;if(hasFC)return fc;if(hasGC)return gc;return 0;
}
function assignSeeds(players){
  if(!players.length)return[];
  const scored=players.map(p=>({...p,_score:calcScore(p)})).sort((a,b)=>{
    if(Math.abs(a._score-b._score)>0.01)return b._score-a._score;
    if(b.faceitElo!==a.faceitElo)return(Number(b.faceitElo)||0)-(Number(a.faceitElo)||0);
    if(b.faceitLevel!==a.faceitLevel)return(Number(b.faceitLevel)||0)-(Number(a.faceitLevel)||0);
    if(b.gcPoints!==a.gcPoints)return(Number(b.gcPoints)||0)-(Number(a.gcPoints)||0);
    return(Number(b.gcLevel)||0)-(Number(a.gcLevel)||0);
  });
  return scored.map((p,i)=>{const pct=(i/Math.max(scored.length-1,1))*100;const seed=pct<=20?1:pct<=40?2:pct<=60?3:pct<=80?4:5;return{...p,score:p._score,seed};});
}
const SEED_COLORS={
  1:{text:"text-yellow-400",border:"border-yellow-500/50",bg:"bg-yellow-500/10"},
  2:{text:"text-orange-400",border:"border-orange-500/50",bg:"bg-orange-500/10"},
  3:{text:"text-blue-400",border:"border-blue-500/50",bg:"bg-blue-500/10"},
  4:{text:"text-zinc-300",border:"border-zinc-500/50",bg:"bg-zinc-500/10"},
  5:{text:"text-zinc-500",border:"border-zinc-700/50",bg:"bg-zinc-800/30"},
};

// ─── UI ───────────────────────────────────────────────────────
function Badge({children,color="orange"}){
  const c={orange:"bg-orange-500/20 text-orange-400 border-orange-500/40",blue:"bg-blue-500/20 text-blue-400 border-blue-500/40",green:"bg-green-500/20 text-green-400 border-green-500/40",red:"bg-red-500/20 text-red-400 border-red-500/40",gray:"bg-zinc-700/40 text-zinc-400 border-zinc-600/40"};
  return <span className={`text-xs font-mono px-2 py-0.5 rounded border ${c[color]}`}>{children}</span>;
}
function ScoreBar({score,max=100}){
  return <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-700" style={{width:`${Math.min((score/max)*100,100)}%`}}/></div>;
}
function Spinner(){return <div className="w-5 h-5 border-2 border-zinc-600 border-t-orange-400 rounded-full animate-spin"/>;}

// InputF fora do PlayersTab para evitar perda de foco a cada tecla
function InputF({label,k,type="text",ph="",value,onChange}){
  return(
    <div className="flex flex-col gap-1">
      <label className="text-xs text-zinc-500 font-mono uppercase tracking-widest">{label}</label>
      <input type={type} value={value} onChange={e=>onChange(k, type==="number"?Number(e.target.value):e.target.value)} placeholder={ph}
        className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"/>
    </div>
  );
}

// ─── ABA: JOGADORES ──────────────────────────────────────────
const EMPTY = {name:"",age:"",city:"",phone:"",steamUrl:"",gcUrl:"",faceitUrl:"",gcLevel:"",gcPoints:"",faceitLevel:"",faceitElo:""};

function PlayersTab({players,setPlayers,loading}){
  const [form,setForm]=useState(EMPTY);
  const [editing,setEditing]=useState(null);
  const [saving,setSaving]=useState(false);
  const [search,setSearch]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const save=async()=>{
    if(!form.name.trim())return;
    setSaving(true);
    try{
      if(editing!==null){
        const {id,...data}=form;
        await fb.set(`/players/${editing}`,{...data,updatedAt:Date.now()});
        setEditing(null);
      } else {
        await fb.push("/players",{...form,createdAt:Date.now()});
      }
      // Recarrega lista completa do Firebase para garantir que aparece
      const data=await fb.get("/players");
      setPlayers(toArr(data));
    }catch(e){console.error("Erro ao salvar:",e);}
    setForm({name:"",age:"",city:"",phone:"",steamUrl:"",gcUrl:"",faceitUrl:"",gcLevel:"",gcPoints:"",faceitLevel:"",faceitElo:""});
    setSaving(false);
  };
  const edit=(p)=>{setForm(p);setEditing(p.id);};
  const remove=async(id)=>{await fb.delete(`/players/${id}`);setPlayers(p=>p.filter(x=>x.id!==id));};

  const seeded=assignSeeds(players);
  const filtered=seeded.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||p.city?.toLowerCase().includes(search.toLowerCase()));
  const sorted=[...filtered].sort((a,b)=>b.score-a.score);

  // InputF agora é top-level (sem perda de foco)

  return (
    <div className="flex flex-col gap-6">
      {/* Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-orange-400 font-mono font-bold text-sm uppercase tracking-widest mb-5">
          {editing!==null?"✏ Editar Jogador":"＋ Cadastrar Jogador"}
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <InputF label="Nome / Nick" k="name" ph="ex: s1mple" value={form["name"]} onChange={set}/>
          <InputF label="Idade" k="age" type="number" ph="21" value={form["age"]} onChange={set}/>
          <InputF label="Cidade" k="city" ph="São Paulo" value={form["city"]} onChange={set}/>
          <InputF label="Telefone" k="phone" ph="(11) 99999-9999" value={form["phone"]} onChange={set}/>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <InputF label="Link Steam" k="steamUrl" ph="steamcommunity.com/id/..." value={form["steamUrl"]} onChange={set}/>
          <InputF label="Link GamersCLUB" k="gcUrl" ph="gamersclub.com.br/..." value={form["gcUrl"]} onChange={set}/>
          <InputF label="Link FACEIT" k="faceitUrl" ph="faceit.com/en/players/..." value={form["faceitUrl"]} onChange={set}/>
        </div>
        <div className="border-t border-zinc-800 pt-4 mt-2 mb-4">
          <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mb-3">Nível & Pontuação</p>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 rounded-full bg-green-400"/><span className="text-green-400 font-mono text-xs font-bold">GAMERSCLUB</span></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-500 font-mono uppercase">Level (0–21)</label>
                  <select value={form.gcLevel} onChange={e=>set("gcLevel",e.target.value===""?"":Number(e.target.value))} className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
                    <option value="">—</option>{GC_LEVELS.map(l=><option key={l.level} value={l.level}>Level {l.level}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-500 font-mono uppercase">Pontos GC</label>
                  <input type="number" value={form.gcPoints} onChange={e=>set("gcPoints",Number(e.target.value))} placeholder="ex: 3500"
                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-green-500"/>
                </div>
              </div>
              {form.gcLevel!==""&&<p className="text-xs text-zinc-500 mt-2 font-mono">Range: {GC_LEVELS[form.gcLevel]?.minPts} – {GC_LEVELS[form.gcLevel]?.maxPts===99999?"∞":GC_LEVELS[form.gcLevel]?.maxPts} pts</p>}
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 rounded-full bg-orange-400"/><span className="text-orange-400 font-mono text-xs font-bold">FACEIT</span></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-500 font-mono uppercase">Level (1–10)</label>
                  <select value={form.faceitLevel} onChange={e=>set("faceitLevel",e.target.value===""?"":Number(e.target.value))} className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-orange-500">
                    <option value="">—</option>{FACEIT_LEVELS.map(l=><option key={l.level} value={l.level}>Level {l.level}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-500 font-mono uppercase">ELO FACEIT</label>
                  <input type="number" value={form.faceitElo} onChange={e=>set("faceitElo",Number(e.target.value))} placeholder="ex: 1450"
                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500"/>
                </div>
              </div>
              {form.faceitLevel!==""&&<p className="text-xs text-zinc-500 mt-2 font-mono">Range: {FACEIT_LEVELS[form.faceitLevel-1]?.minElo} – {FACEIT_LEVELS[form.faceitLevel-1]?.maxElo===99999?"∞":FACEIT_LEVELS[form.faceitLevel-1]?.maxElo} ELO</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={save} disabled={saving}
            className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 text-black font-mono font-bold py-2.5 rounded-lg transition-colors text-sm uppercase tracking-wider flex items-center justify-center gap-2">
            {saving&&<Spinner/>}{editing!==null?"Salvar Edição":"Cadastrar"}
          </button>
          {editing!==null&&<button onClick={()=>{setEditing(null);setForm(EMPTY);}} className="px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono py-2.5 rounded-lg text-sm">Cancelar</button>}
        </div>
      </div>

      {/* Lista */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-zinc-300 font-mono font-bold text-sm uppercase tracking-widest">
            Jogadores <span className="text-orange-400">({players.length})</span>
            {loading&&<span className="ml-2 inline-flex"><Spinner/></span>}
          </h2>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..."
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500 w-48"/>
        </div>

        {players.length>0&&(
          <div className="flex gap-2 mb-3 flex-wrap">
            {[1,2,3,4,5].map(s=>(
              <div key={s} className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono ${SEED_COLORS[s].border} ${SEED_COLORS[s].bg}`}>
                <span className={`font-bold ${SEED_COLORS[s].text}`}>Seed {s}</span>
                <span className="text-zinc-600">{["Top 20%","21–40%","41–60%","61–80%","81–100%"][s-1]}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {sorted.length===0&&!loading&&(
            <div className="text-center text-zinc-600 font-mono py-12 border border-dashed border-zinc-800 rounded-xl">Nenhum jogador cadastrado ainda.</div>
          )}
          {sorted.map((p,rank)=>{
            const sc=SEED_COLORS[p.seed]||SEED_COLORS[5];
            return(
              <div key={p.id} className={`bg-zinc-900 border hover:border-zinc-600 rounded-xl p-4 flex items-center gap-4 transition-colors ${sc.border}`}>
                <div className={`w-10 h-10 rounded-lg border-2 flex flex-col items-center justify-center shrink-0 ${sc.border} ${sc.bg}`}>
                  <span className={`font-black text-xs leading-none ${sc.text}`}>S{p.seed}</span>
                  <span className="text-zinc-600 font-mono text-[9px]">#{rank+1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-zinc-100 font-bold text-sm">{p.name}</span>
                    {p.city&&<span className="text-zinc-500 text-xs">{p.city}</span>}
                    {p.age&&<Badge color="gray">{p.age}a</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {p.gcLevel!==""&&<Badge color="green">GC Lv.{p.gcLevel} · {p.gcPoints}pts</Badge>}
                    {p.faceitLevel!==""&&<Badge color="orange">FC Lv.{p.faceitLevel} · {p.faceitElo} ELO</Badge>}
                  </div>
                  <ScoreBar score={p.score}/>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-mono font-bold text-lg ${sc.text}`}>{p.score.toFixed(1)}</div>
                  <div className="text-zinc-600 font-mono text-xs">/ 100</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={()=>edit(p)} className="text-zinc-500 hover:text-zinc-200 transition-colors text-sm px-2">✏</button>
                  <button onClick={()=>remove(p.id)} className="text-zinc-600 hover:text-red-400 transition-colors text-sm px-2">✕</button>
                </div>
              </div>
            );
          })}
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

  const startDraft=()=>{
    if(!captainA||!captainB)return;
    setTeamA([captainA]);setTeamB([captainB]);setTurn("A");setStep("picking");
  };

  const pickPlayer=player=>{
    const newA=turn==="A"?[...teamA,player]:teamA;
    const newB=turn==="B"?[...teamB,player]:teamB;
    if(turn==="A")setTeamA(newA); else setTeamB(newB);
    if(newA.length>=5&&newB.length>=5){setStep("done");return;}
    setTurn(turn==="A"?"B":"A");
  };

  const saveResult=async()=>{
    if(!winner||!resultMap)return;
    setSaving(true);
    const match={
      date:Date.now(),map:resultMap,winner,
      teamA:teamA.map(p=>({id:p.id,name:p.name,seed:p.seed})),
      teamB:teamB.map(p=>({id:p.id,name:p.name,seed:p.seed})),
      nameA,nameB,
    };
    const res=await fb.push("/matches",match);
    if(res?.name) setMatches(m=>[{...match,id:res.name},...m]);
    setSaving(false);setShowResult(false);setWinner("");setResultMap("");
  };

  const reset=()=>{setPool([]);setCaptainA(null);setCaptainB(null);setTeamA([]);setTeamB([]);setTurn("A");setStep("setup");setShowResult(false);};

  if(step==="setup") return(
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-orange-400 font-mono font-bold text-sm uppercase tracking-widest mb-4">1. Pool de Jogadores</h2>
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          {ranked.map(p=>{
            const sc=SEED_COLORS[p.seed]||SEED_COLORS[5];
            return(
              <label key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${pool.includes(p.id)?"border-orange-500/50 bg-orange-500/5":"border-zinc-800 hover:border-zinc-700"}`}>
                <input type="checkbox" checked={pool.includes(p.id)} onChange={()=>togglePool(p.id)} className="accent-orange-500"/>
                <div className={`w-8 h-8 rounded border flex flex-col items-center justify-center shrink-0 text-xs font-bold ${sc.border} ${sc.bg} ${sc.text}`}>S{p.seed}</div>
                <div className="flex-1"><span className="text-zinc-200 font-bold text-sm">{p.name}</span><span className="text-zinc-500 text-xs ml-2">{p.city}</span></div>
                <div className="flex gap-1">
                  {p.gcLevel!==""&&<Badge color="green">GC {p.gcLevel}</Badge>}
                  {p.faceitLevel!==""&&<Badge color="orange">FC {p.faceitLevel}</Badge>}
                </div>
                <span className={`font-mono text-sm font-bold w-14 text-right ${sc.text}`}>{p.score.toFixed(0)}</span>
              </label>
            );
          })}
          {ranked.length===0&&<div className="text-zinc-600 font-mono text-sm text-center py-6">Cadastre jogadores primeiro.</div>}
        </div>
        <p className="text-xs text-zinc-600 mt-2">{pool.length} selecionado(s)</p>
      </div>

      {pool.length>=2&&(
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-orange-400 font-mono font-bold text-sm uppercase tracking-widest mb-4">2. Capitães & Times</h2>
          <div className="grid grid-cols-2 gap-4">
            {["A","B"].map(side=>{
              const cap=side==="A"?captainA:captainB;
              const other=side==="A"?captainB:captainA;
              const setCap=side==="A"?setCaptainA:setCaptainB;
              const nm=side==="A"?nameA:nameB;
              const setNm=side==="A"?setNameA:setNameB;
              return(
                <div key={side} className="flex flex-col gap-2">
                  <input value={nm} onChange={e=>setNm(e.target.value)} placeholder={`Nome do Time ${side}`}
                    className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-orange-500"/>
                  <select value={cap?.id||""} onChange={e=>{const p=poolPlayers.find(x=>x.id===e.target.value);setCap(p||null);}}
                    className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-orange-500">
                    <option value="">— Capitão —</option>
                    {poolPlayers.filter(p=>p.id!==other?.id).map(p=><option key={p.id} value={p.id}>{p.name} ({p.score.toFixed(0)} pts)</option>)}
                  </select>
                  {cap&&<div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-2">
                    <div className={`w-8 h-8 rounded border flex items-center justify-center text-xs font-bold ${SEED_COLORS[cap.seed]?.border} ${SEED_COLORS[cap.seed]?.bg} ${SEED_COLORS[cap.seed]?.text}`}>S{cap.seed}</div>
                    <div><div className="text-zinc-200 font-bold text-sm">{cap.name} 👑</div><div className={`font-mono text-xs ${SEED_COLORS[cap.seed]?.text}`}>{cap.score.toFixed(1)} pts</div></div>
                  </div>}
                </div>
              );
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
        <div className="px-6 text-center">
          <div className="text-zinc-500 font-mono text-xs">VS</div>
          {step==="done"&&<div className="text-green-400 font-mono text-xs mt-1">✓ PRONTO</div>}
        </div>
        <div className={`flex-1 text-center py-3 rounded-xl border-2 transition-all ${turn==="B"&&step!=="done"?"border-blue-500 bg-blue-500/10":"border-zinc-800"}`}>
          <div className="text-zinc-400 font-mono text-xs uppercase">{nameB}</div>
          <div className="text-2xl font-bold text-zinc-100">{teamB.length}<span className="text-zinc-600">/5</span></div>
        </div>
      </div>

      {step==="picking"&&(
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className={`text-sm font-mono font-bold uppercase mb-3 ${turn==="A"?"text-orange-400":"text-blue-400"}`}>🎯 Vez de {turn==="A"?nameA:nameB} escolher</div>
          <div className="flex flex-col gap-2">
            {pickable.map(p=>{
              const sc=SEED_COLORS[p.seed]||SEED_COLORS[5];
              return(
                <button key={p.id} onClick={()=>pickPlayer(p)}
                  className="flex items-center gap-3 p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-orange-500/50 rounded-lg transition-all text-left group">
                  <div className={`w-9 h-9 rounded border flex flex-col items-center justify-center text-xs font-bold shrink-0 ${sc.border} ${sc.bg} ${sc.text}`}>S{p.seed}</div>
                  <div className="flex-1">
                    <div className="text-zinc-200 font-bold text-sm">{p.name}</div>
                    <div className="flex gap-1 mt-0.5">
                      {p.gcLevel!==""&&<Badge color="green">GC {p.gcLevel}</Badge>}
                      {p.faceitLevel!==""&&<Badge color="orange">FC {p.faceitLevel}</Badge>}
                    </div>
                  </div>
                  <span className={`font-mono font-bold ${sc.text}`}>{p.score.toFixed(1)}</span>
                  <span className="text-zinc-500 group-hover:text-orange-400 transition-colors">+</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {[{team:teamA,name:nameA,color:"orange"},{team:teamB,name:nameB,color:"blue"}].map(({team,name,color})=>(
          <div key={name} className={`bg-zinc-900 border rounded-xl p-4 ${color==="orange"?"border-orange-500/30":"border-blue-500/30"}`}>
            <h3 className={`font-mono font-bold text-sm uppercase mb-3 ${color==="orange"?"text-orange-400":"text-blue-400"}`}>{name}</h3>
            {team.map((p,i)=>{
              const sc=SEED_COLORS[p.seed]||SEED_COLORS[5];
              return(
                <div key={p.id} className="flex items-center gap-2 py-2 border-b border-zinc-800 last:border-0">
                  <span className="text-zinc-600 font-mono text-xs w-4">{i===0?"C":i}</span>
                  <div className={`w-7 h-7 rounded border flex items-center justify-center text-xs font-bold ${i===0?"bg-yellow-500 border-yellow-400 text-black":sc.border+" "+sc.bg+" "+sc.text}`}>
                    {i===0?"C":"S"+p.seed}
                  </div>
                  <span className="text-zinc-200 text-sm flex-1">{p.name}{i===0&&" 👑"}</span>
                  <span className={`font-mono text-xs ${sc.text}`}>{p.score?.toFixed(0)}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {step==="done"&&!showResult&&(
        <button onClick={()=>setShowResult(true)}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-mono font-bold py-3 rounded-xl transition-colors text-sm uppercase tracking-wider">
          🏆 Registrar Resultado da Partida
        </button>
      )}

      {showResult&&(
        <div className="bg-zinc-900 border border-green-500/30 rounded-xl p-5">
          <h3 className="text-green-400 font-mono font-bold text-sm uppercase mb-4">Registrar Resultado</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500 font-mono uppercase">Mapa Jogado</label>
              <select value={resultMap} onChange={e=>setResultMap(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
                <option value="">— Selecionar —</option>
                {MAPS.map(m=><option key={m} value={m}>{MAP_ICONS[m]} {m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500 font-mono uppercase">Vencedor</label>
              <div className="flex gap-2">
                <button onClick={()=>setWinner("A")} className={`flex-1 py-2 rounded-lg border font-mono font-bold text-sm transition-all ${winner==="A"?"border-orange-500 bg-orange-500/20 text-orange-400":"border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}>{nameA}</button>
                <button onClick={()=>setWinner("B")} className={`flex-1 py-2 rounded-lg border font-mono font-bold text-sm transition-all ${winner==="B"?"border-blue-500 bg-blue-500/20 text-blue-400":"border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}>{nameB}</button>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={saveResult} disabled={!winner||!resultMap||saving}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white font-mono font-bold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
              {saving&&<Spinner/>}Salvar no Firebase
            </button>
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
  const {format,nameA,nameB,step,actions}=state;
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
          <div>
            <div className="text-zinc-400 font-mono text-xs uppercase mb-0.5">Passo {step+1} de {seq.length}</div>
            <div className="flex items-center gap-3">
              <span className={`font-mono font-black text-2xl ${AS[cur.action]?.text}`}>{cur.action}</span>
              <span className={`font-bold text-lg ${tc(cur.team)}`}>{cur.team==="A"?nameA:nameB}</span>
            </div>
          </div>
          {isOnline&&<div className={`text-xs font-mono px-3 py-1.5 rounded-lg border ${myTurn?"border-green-500/50 bg-green-500/10 text-green-400":"border-zinc-700 bg-zinc-800/50 text-zinc-500"}`}>{myTurn?"🟢 Sua vez":"⏳ Aguardando..."}</div>}
          {!isOnline&&<div className={`font-mono font-black text-4xl opacity-20 ${tc(cur.team)}`}>{cur.team}</div>}
        </div>
      )}
      {!isDone&&cur&&(
        <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 transition-opacity ${!myTurn?"opacity-40 pointer-events-none":""}`}>
          <div className="text-zinc-500 font-mono text-xs uppercase mb-4">{myTurn?`${cur.team==="A"?nameA:nameB} — escolha o mapa`:"Aguardando o adversário..."}</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {remaining.map(map=>(
              <div key={map} className="rounded-xl border border-zinc-700 bg-zinc-800/50 overflow-hidden hover:border-zinc-500 transition-all">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-2xl">{MAP_ICONS[map]||"🗺️"}</span>
                  <span className="text-zinc-100 font-bold text-base flex-1">{map}</span>
                </div>
                <div className="flex border-t border-zinc-700">
                  <button onClick={()=>cur.action==="BAN"&&onAction(map,"BAN")} disabled={cur.action!=="BAN"}
                    className={`flex-1 py-2.5 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${cur.action==="BAN"?"bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white cursor-pointer":"bg-zinc-900/50 text-zinc-700 cursor-not-allowed"}`}>✕ BAN</button>
                  <div className="w-px bg-zinc-700"/>
                  <button onClick={()=>cur.action==="PICK"&&onAction(map,"PICK")} disabled={cur.action!=="PICK"}
                    className={`flex-1 py-2.5 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${cur.action==="PICK"?"bg-green-500/20 hover:bg-green-600 text-green-400 hover:text-white cursor-pointer":"bg-zinc-900/50 text-zinc-700 cursor-not-allowed"}`}>✓ PICK</button>
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
                <div className="text-lg">{MAP_ICONS[a.map]}</div>
                <div className="text-green-300 font-bold text-sm">{a.map}</div>
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
  const [mode,setMode]=useState(null);
  const [format,setFormat]=useState("bo3");
  const [nameA,setNameA]=useState("Time A");
  const [nameB,setNameB]=useState("Time B");
  const [started,setStarted]=useState(false);
  const [localState,setLocalState]=useState({format:"bo3",nameA:"Time A",nameB:"Time B",step:0,actions:[]});
  const sobraFired=useRef(false);
  const [roomCode,setRoomCode]=useState("");
  const [joinCode,setJoinCode]=useState("");
  const [myTeam,setMyTeam]=useState(null);
  const [onlineState,setOnlineState]=useState(null);
  const [roomStatus,setRoomStatus]=useState("idle");
  const [copied,setCopied]=useState(false);
  const pollRef=useRef(null);

  const getRoomKey=code=>`/veto-rooms/${code}`;
  const loadRoom=async code=>{try{return await fb.get(getRoomKey(code));}catch{return null;}};
  const saveRoom=async(code,state)=>{try{await fb.set(getRoomKey(code),state);}catch{}};

  const startPolling=code=>{
    if(pollRef.current)clearInterval(pollRef.current);
    pollRef.current=setInterval(async()=>{const r=await loadRoom(code);if(r)setOnlineState(r);},1500);
  };
  useEffect(()=>()=>{if(pollRef.current)clearInterval(pollRef.current);},[]);

  // Auto sobra local
  useEffect(()=>{
    if(mode!=="local")return;
    const seq=localState.format==="bo3"?BO3_SEQ:BO1_SEQ;
    const cur=seq[localState.step];
    const rem=MAPS.filter(m=>!localState.actions.find(a=>a.map===m));
    if(cur?.action==="SOBRA"&&rem.length===1&&!sobraFired.current){
      sobraFired.current=true;const map=rem[0];
      setTimeout(()=>setLocalState(s=>({...s,actions:[...s.actions,{map,action:"SOBRA",team:null}],step:s.step+1})),400);
    }
  },[localState.step,mode]);

  // Auto sobra online (só time A resolve)
  useEffect(()=>{
    if(!onlineState||!roomCode||myTeam!=="A")return;
    const seq=onlineState.format==="bo3"?BO3_SEQ:BO1_SEQ;
    const cur=seq[onlineState.step];
    const rem=MAPS.filter(m=>!onlineState.actions.find(a=>a.map===m));
    if(cur?.action==="SOBRA"&&rem.length===1){
      const map=rem[0];
      setTimeout(async()=>{
        const fresh=await loadRoom(roomCode);
        if(fresh&&fresh.step===onlineState.step){
          const ns={...fresh,actions:[...fresh.actions,{map,action:"SOBRA",team:null}],step:fresh.step+1};
          await saveRoom(roomCode,ns);setOnlineState(ns);
        }
      },500);
    }
  },[onlineState?.step]);

  const handleLocalAction=(map,action)=>{
    const seq=localState.format==="bo3"?BO3_SEQ:BO1_SEQ;
    const cur=seq[localState.step];
    if(!cur||cur.action==="SOBRA")return;
    sobraFired.current=false;
    setLocalState(s=>({...s,actions:[...s.actions,{map,action,team:cur.team}],step:s.step+1}));
  };

  const handleOnlineAction=async(map,action)=>{
    if(!roomCode||!myTeam)return;
    const fresh=await loadRoom(roomCode);if(!fresh)return;
    const seq=fresh.format==="bo3"?BO3_SEQ:BO1_SEQ;
    const cur=seq[fresh.step];
    if(!cur||cur.team!==myTeam)return;
    const ns={...fresh,actions:[...fresh.actions,{map,action,team:cur.team}],step:fresh.step+1};
    await saveRoom(roomCode,ns);setOnlineState(ns);
  };

  const createRoom=async()=>{
    const code=genCode();
    const init={format,nameA,nameB,step:0,actions:[],createdAt:Date.now()};
    await saveRoom(code,init);setRoomCode(code);setMyTeam("A");setOnlineState(init);setRoomStatus("waiting");startPolling(code);
  };
  const joinRoom=async()=>{
    const code=joinCode.trim().toUpperCase();if(code.length<4)return;
    const room=await loadRoom(code);
    if(!room){setRoomStatus("error");return;}
    setRoomCode(code);setMyTeam("B");setOnlineState(room);setRoomStatus("connected");startPolling(code);
  };
  const copyCode=()=>{navigator.clipboard?.writeText(roomCode);setCopied(true);setTimeout(()=>setCopied(false),2000);};
  const resetAll=()=>{if(pollRef.current)clearInterval(pollRef.current);setMode(null);setStarted(false);setRoomCode("");setJoinCode("");setMyTeam(null);setOnlineState(null);setRoomStatus("idle");setLocalState({format:"bo3",nameA:"Time A",nameB:"Time B",step:0,actions:[]});sobraFired.current=false;};

  if(!mode) return(
    <div className="flex flex-col gap-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-orange-400 font-mono font-bold text-sm uppercase tracking-widest mb-2">Veto de Mapas</h2>
        <p className="text-zinc-500 text-sm mb-6">Escolha como quer jogar o veto:</p>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={()=>setMode("local")} className="flex flex-col items-center gap-3 p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-orange-500/50 rounded-xl transition-all group">
            <span className="text-4xl">🖥️</span>
            <div className="text-center"><div className="text-zinc-100 font-bold font-mono text-sm group-hover:text-orange-400 transition-colors">LOCAL</div><div className="text-zinc-500 text-xs mt-1">Dois times na mesma tela</div></div>
          </button>
          <button onClick={()=>setMode("online")} className="flex flex-col items-center gap-3 p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-blue-500/50 rounded-xl transition-all group">
            <span className="text-4xl">🌐</span>
            <div className="text-center"><div className="text-zinc-100 font-bold font-mono text-sm group-hover:text-blue-400 transition-colors">ONLINE</div><div className="text-zinc-500 text-xs mt-1">Cada time na sua casa • Firebase</div></div>
          </button>
        </div>
      </div>
    </div>
  );

  if(mode==="local"){
    if(!started) return(
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3"><button onClick={resetAll} className="text-zinc-500 hover:text-zinc-300 text-sm">← Voltar</button><h2 className="text-orange-400 font-mono font-bold text-sm uppercase">Veto Local</h2></div>
        <div className="grid grid-cols-2 gap-4">
          {[{l:"Time A",k:"nameA"},{l:"Time B",k:"nameB"}].map(({l,k})=>(
            <div key={k} className="flex flex-col gap-1"><label className="text-xs text-zinc-500 font-mono uppercase">{l}</label>
              <input value={k==="nameA"?nameA:nameB} onChange={e=>k==="nameA"?setNameA(e.target.value):setNameB(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-orange-500"/></div>
          ))}
        </div>
        <div><label className="text-xs text-zinc-500 font-mono uppercase tracking-widest block mb-3">Formato</label>
          <div className="grid grid-cols-2 gap-3">
            {[{v:"bo3",l:"Melhor de 3",d:"Ban Ban Pick Pick Ban Ban Sobra"},{v:"bo1",l:"Melhor de 1",d:"Ban Ban Ban Ban Ban Ban Sobra"}].map(f=>(
              <button key={f.v} onClick={()=>setFormat(f.v)} className={`p-4 rounded-xl border text-left transition-all ${format===f.v?"border-orange-500 bg-orange-500/10":"border-zinc-700 hover:border-zinc-600"}`}>
                <div className={`font-mono font-bold text-sm ${format===f.v?"text-orange-400":"text-zinc-300"}`}>{f.l}</div>
                <div className="text-zinc-500 text-xs mt-1 font-mono">{f.d}</div>
              </button>
            ))}
          </div>
        </div>
        <button onClick={()=>{setLocalState({format,nameA,nameB,step:0,actions:[]});sobraFired.current=false;setStarted(true);}} className="w-full bg-orange-500 hover:bg-orange-400 text-black font-mono font-bold py-3 rounded-xl text-sm uppercase">Iniciar Veto ▶</button>
      </div>
    );
    return(<div className="flex flex-col gap-5"><div className="flex items-center gap-3"><button onClick={resetAll} className="text-zinc-500 hover:text-zinc-300 text-sm font-mono">← Voltar</button><span className="text-zinc-400 font-mono text-xs uppercase">Veto Local — {format.toUpperCase()}</span></div><VetoBoard state={localState} myTeam={null} onAction={handleLocalAction} isOnline={false}/><button onClick={resetAll} className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 font-mono py-2.5 rounded-xl text-sm">↺ Novo Veto</button></div>);
  }

  if(mode==="online"){
    if(roomStatus==="idle") return(
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-2"><button onClick={resetAll} className="text-zinc-500 hover:text-zinc-300 text-sm">← Voltar</button><h2 className="text-blue-400 font-mono font-bold text-sm uppercase">Veto Online 🌐</h2></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-zinc-300 font-bold text-sm mb-1">Criar uma sala</div>
          <div className="text-zinc-500 text-xs mb-4">Você é o Time A e define as configurações</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[{l:"Seu time (A)",k:"nameA"},{l:"Time adversário (B)",k:"nameB"}].map(({l,k})=>(
              <div key={k} className="flex flex-col gap-1"><label className="text-xs text-zinc-500 font-mono uppercase">{l}</label>
                <input value={k==="nameA"?nameA:nameB} onChange={e=>k==="nameA"?setNameA(e.target.value):setNameB(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"/></div>
            ))}
          </div>
          <div className="flex gap-3 mb-4">
            {[{v:"bo3",l:"Melhor de 3"},{v:"bo1",l:"Melhor de 1"}].map(f=>(
              <button key={f.v} onClick={()=>setFormat(f.v)} className={`flex-1 py-2 rounded-lg border font-mono text-xs font-bold transition-all ${format===f.v?"border-blue-500 bg-blue-500/10 text-blue-400":"border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}>{f.l}</button>
            ))}
          </div>
          <button onClick={createRoom} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold py-3 rounded-xl text-sm uppercase">🔗 Criar Sala</button>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-zinc-300 font-bold text-sm mb-1">Entrar em uma sala</div>
          <div className="text-zinc-500 text-xs mb-4">Você é o Time B — cole o código que recebeu</div>
          <div className="flex gap-2">
            <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="CÓDIGO DA SALA" maxLength={6}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 font-mono uppercase placeholder-zinc-600 focus:outline-none focus:border-blue-500 tracking-widest"/>
            <button onClick={joinRoom} className="px-5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-mono font-bold rounded-lg text-sm">Entrar</button>
          </div>
          {roomStatus==="error"&&<p className="text-red-400 font-mono text-xs mt-2">Sala não encontrada. Verifique o código.</p>}
        </div>
      </div>
    );

    if(roomStatus==="waiting") return(
      <div className="flex flex-col gap-5">
        <div className="bg-zinc-900 border border-blue-500/30 rounded-xl p-6 text-center">
          <div className="text-blue-400 font-mono font-bold text-sm uppercase mb-4">Sala criada! Aguardando adversário...</div>
          <div className="bg-zinc-800 border-2 border-blue-500/50 rounded-2xl p-6 mb-4 inline-block mx-auto">
            <div className="text-zinc-500 font-mono text-xs uppercase mb-2">Código da sala</div>
            <div className="text-5xl font-black font-mono tracking-[0.3em] text-blue-300">{roomCode}</div>
          </div>
          <div className="text-zinc-500 text-sm mb-4">Mande esse código para o adversário entrar na sala</div>
          <div className="flex gap-3 justify-center">
            <button onClick={copyCode} className={`px-6 py-2.5 rounded-lg font-mono text-sm font-bold transition-all ${copied?"bg-green-600 text-white":"bg-blue-600 hover:bg-blue-500 text-white"}`}>{copied?"✓ Copiado!":"📋 Copiar Código"}</button>
            <button onClick={()=>setRoomStatus("connected")} className="px-6 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-mono text-sm font-bold rounded-lg">Já entrou → Começar</button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-5"><div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"/><span className="text-zinc-500 font-mono text-xs">Sincronizado via Firebase</span></div>
        </div>
        <button onClick={resetAll} className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 font-mono py-2.5 rounded-xl text-sm">↺ Cancelar</button>
      </div>
    );

    if(onlineState) return(
      <div className="flex flex-col gap-5">
        <div className="bg-zinc-900 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>
            <span className="text-zinc-300 font-mono text-xs">Sala <span className="text-blue-300 font-bold tracking-widest">{roomCode}</span></span>
            <span className={`font-mono text-xs px-2 py-0.5 rounded border ${myTeam==="A"?"border-orange-500/40 text-orange-400 bg-orange-500/10":"border-blue-500/40 text-blue-400 bg-blue-500/10"}`}>Você: {myTeam==="A"?onlineState.nameA:onlineState.nameB}</span>
          </div>
          <button onClick={copyCode} className="text-zinc-600 hover:text-zinc-400 font-mono text-xs">{copied?"✓ Copiado":"📋 Código"}</button>
        </div>
        <VetoBoard state={onlineState} myTeam={myTeam} onAction={handleOnlineAction} isOnline={true}/>
        <button onClick={resetAll} className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 font-mono py-2.5 rounded-xl text-sm">↺ Sair da Sala</button>
      </div>
    );
  }
  return null;
}

// ─── ABA: HISTÓRICO ───────────────────────────────────────────
function HistoryTab({matches,players,loadingMatches}){
  const [selectedPlayer,setSelectedPlayer]=useState(null);

  const playerMatches=pid=>matches.filter(m=>[...m.teamA,...m.teamB].find(p=>p.id===pid));
  const playerWins=pid=>playerMatches(pid).filter(m=>{const inA=m.teamA.find(p=>p.id===pid);return(inA&&m.winner==="A")||(!inA&&m.winner==="B");}).length;

  const fmt=ts=>new Date(ts).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"});

  const selP=selectedPlayer?players.find(p=>p.id===selectedPlayer):null;
  const selMatches=selectedPlayer?playerMatches(selectedPlayer):[];
  const selWins=selectedPlayer?playerWins(selectedPlayer):0;

  return(
    <div className="flex flex-col gap-5">
      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        {[{l:"Partidas",v:matches.length,c:"text-zinc-200"},{l:"Jogadores",v:players.length,c:"text-orange-400"},{l:"Mapa mais jogado",v:matches.length?[...MAPS].sort((a,b)=>matches.filter(m=>m.map===b).length-matches.filter(m=>m.map===a).length)[0]:"—",c:"text-blue-400"}].map(({l,v,c})=>(
          <div key={l} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className={`font-mono font-black text-2xl ${c}`}>{v}</div>
            <div className="text-zinc-500 font-mono text-xs mt-1">{l}</div>
          </div>
        ))}
      </div>

      {/* Busca por jogador */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="text-zinc-400 font-mono text-xs uppercase mb-3">📊 Estatísticas por Jogador</div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {players.map(p=>(
            <button key={p.id} onClick={()=>setSelectedPlayer(selectedPlayer===p.id?null:p.id)}
              className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold transition-all ${selectedPlayer===p.id?"border-orange-500 bg-orange-500/10 text-orange-400":"border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"}`}>
              {p.name}
            </button>
          ))}
          {players.length===0&&<span className="text-zinc-600 text-sm font-mono">Nenhum jogador cadastrado.</span>}
        </div>

        {selP&&(
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-black font-bold text-sm">{selP.name.slice(0,2).toUpperCase()}</div>
              <div><div className="text-zinc-100 font-bold">{selP.name}</div><div className="text-zinc-500 text-xs">{selP.city}</div></div>
              <div className="ml-auto flex gap-4 text-center">
                <div><div className="text-zinc-100 font-bold font-mono text-lg">{selMatches.length}</div><div className="text-zinc-500 text-xs font-mono">partidas</div></div>
                <div><div className="text-green-400 font-bold font-mono text-lg">{selWins}</div><div className="text-zinc-500 text-xs font-mono">vitórias</div></div>
                <div><div className="text-orange-400 font-bold font-mono text-lg">{selMatches.length?Math.round((selWins/selMatches.length)*100):0}%</div><div className="text-zinc-500 text-xs font-mono">win rate</div></div>
              </div>
            </div>
            {/* Evolução de Seed */}
            {selMatches.length>0&&(
              <div>
                <div className="text-zinc-500 font-mono text-xs uppercase mb-2">Evolução de Seed</div>
                <div className="flex gap-1 flex-wrap">
                  {selMatches.sort((a,b)=>a.date-b.date).map((m,i)=>{
                    const inA=m.teamA.find(p=>p.id===selectedPlayer);
                    const pp=(inA?m.teamA:m.teamB).find(p=>p.id===selectedPlayer);
                    const won=(inA&&m.winner==="A")||(!inA&&m.winner==="B");
                    const sc=SEED_COLORS[pp?.seed]||SEED_COLORS[5];
                    return(
                      <div key={i} title={`${fmt(m.date)} · ${MAP_ICONS[m.map]} ${m.map}`}
                        className={`w-8 h-8 rounded border flex flex-col items-center justify-center text-xs font-bold ${sc.border} ${sc.bg} ${sc.text}`}>
                        S{pp?.seed}
                        <div className={`text-[8px] ${won?"text-green-400":"text-red-400"}`}>{won?"W":"L"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {selMatches.length===0&&<div className="text-zinc-600 font-mono text-sm">Nenhuma partida registrada para {selP.name}.</div>}
          </div>
        )}
      </div>

      {/* Lista de partidas */}
      <div>
        <h2 className="text-zinc-300 font-mono font-bold text-sm uppercase tracking-widest mb-3">
          Partidas Registradas <span className="text-orange-400">({matches.length})</span>
          {loadingMatches&&<span className="ml-2 inline-flex"><Spinner/></span>}
        </h2>
        <div className="flex flex-col gap-3">
          {matches.length===0&&!loadingMatches&&(
            <div className="text-center text-zinc-600 font-mono py-12 border border-dashed border-zinc-800 rounded-xl">Nenhuma partida registrada ainda.<br/><span className="text-xs">Registre resultados na aba Draft.</span></div>
          )}
          {[...matches].sort((a,b)=>b.date-a.date).map(m=>(
            <div key={m.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{MAP_ICONS[m.map]||"🗺️"}</span>
                <span className="text-zinc-100 font-bold">{m.map}</span>
                <span className="text-zinc-600 font-mono text-xs ml-auto">{fmt(m.date)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{key:"A",team:m.teamA,name:m.nameA},{key:"B",team:m.teamB,name:m.nameB}].map(({key,team,name})=>{
                  const won=m.winner===key;
                  return(
                    <div key={key} className={`rounded-lg p-3 border ${won?"border-green-500/40 bg-green-500/5":"border-zinc-700 bg-zinc-800/30"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`font-mono font-bold text-xs ${won?"text-green-400":"text-zinc-500"}`}>{won?"🏆":""} {name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {team.map((p,i)=>{
                          const sc=SEED_COLORS[p.seed]||SEED_COLORS[5];
                          return(
                            <div key={i} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs ${sc.border} ${sc.bg}`}>
                              <span className={`font-bold ${sc.text}`}>S{p.seed}</span>
                              <span className="text-zinc-400">{p.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("players");
  const [players,setPlayers]=useState([]);
  const [matches,setMatches]=useState([]);
  const [loadingPlayers,setLoadingPlayers]=useState(true);
  const [loadingMatches,setLoadingMatches]=useState(true);

  useEffect(()=>{
    fb.get("/players").then(data=>{setPlayers(toArr(data));setLoadingPlayers(false);});
    fb.get("/matches").then(data=>{setMatches(toArr(data));setLoadingMatches(false);});
  },[]);

  const tabs=[
    {id:"players",label:"👤 Jogadores"},
    {id:"draft",label:"🎯 Draft"},
    {id:"veto",label:"🗺 Veto"},
    {id:"history",label:"📊 Histórico"},
  ];

  return(
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-4 py-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-500 to-yellow-400 flex items-center justify-center font-black text-black text-sm">CS</div>
              <div>
                <div className="font-black text-base leading-none text-zinc-100 tracking-wide">RIVOTRICSMT</div>
                <div className="text-orange-400 font-mono text-xs">Counter-Strike 2 · Firebase</div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {loadingPlayers?<Spinner/>:<><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/><span className="text-green-400 font-mono text-xs">{players.length} jogadores</span></>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {tab==="players"&&<PlayersTab players={players} setPlayers={setPlayers} loading={loadingPlayers}/>}
        {tab==="draft"&&<DraftTab players={players} matches={matches} setMatches={setMatches}/>}
        {tab==="veto"&&<VetoTab/>}
        {tab==="history"&&<HistoryTab matches={matches} players={players} loadingMatches={loadingMatches}/>}
      </div>

      <div className="border-t border-zinc-900 mt-12 py-4 text-center">
        <span className="text-zinc-700 font-mono text-xs">RIVOTRICSMT — v2.0 — Firebase Realtime Database</span>
      </div>
    </div>
  );
}
