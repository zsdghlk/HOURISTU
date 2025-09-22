"use client";
import { useMemo, useState } from "react";

function autoParse(input: string){
  const t = input.trim();
  if(!t) return [];
  if((t.startsWith("[")&&t.endsWith("]"))||(t.startsWith("{")&&t.endsWith("}"))){
    try{
      const j = JSON.parse(t);
      const arr = Array.isArray(j) ? j : Array.isArray(j?.items) ? j.items : null;
      if(arr) return arr.map((x:any,i:number)=>({id:String(x?.id??i+1),text:String(x?.text??""),easy:String(x?.easy??"")}))
                      .filter((x:any)=>x.text);
    }catch{}
  }
  return t.replace(/\r\n/g,"\n").split("\n").map((text,i)=>({id:String(i+1),text:text.trim(),easy:""})).filter(x=>x.text);
}

export default function PasteEasyPage(){
  const [lawId,setLawId]=useState("");
  const [raw,setRaw]=useState("");
  const items = useMemo(()=>autoParse(raw),[raw]);

  const onSave=async()=>{
    if(!lawId) return alert("lawId を入力してください");
    const r = await fetch("/api/easy/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lawId,items})});
    if(!r.ok){ return alert("保存失敗: "+(await r.text())); }
    location.href = `/easy/view/${lawId}`;
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">貼るだけ Easy 取り込み</h1>
      <label className="block text-sm font-medium">lawId</label>
      <input className="w-full border rounded p-2" placeholder="例: 132AC0000000048" value={lawId} onChange={e=>setLawId(e.target.value.trim())}/>
      <label className="block text-sm font-medium mt-4">貼り付け（JSON配列 or 行テキスト）</label>
      <textarea className="w-full border rounded p-2 min-h-[220px] font-mono text-sm" value={raw} onChange={e=>setRaw(e.target.value)}
        placeholder='例) [{"id":"1","text":"原文","easy":"やさしい"}] もしくは 行ごとに原文だけ貼る'/>
      <button onClick={onSave} disabled={!lawId||items.length===0}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">保存する（{items.length}件）</button>
      <div>
        <h2 className="font-semibold">プレビュー（先頭5件）</h2>
        <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">{JSON.stringify(items.slice(0,5),null,2)}</pre>
      </div>
    </div>
  );
}
