"use client";
import { useEffect, useState } from "react";
type Easy={lawId:string;count:number;items:{id:string;text:string;easy?:string}[]};
export default function Page({params}:{params:{lawId:string}}){
  const {lawId}=params as any;
  const [data,setData]=useState<Easy|null>(null);
  useEffect(()=>{(async()=>{try{const r=await fetch(`/easy/${lawId}.json`); if(r.ok)setData(await r.json());}catch{}})();},[lawId]);
  return <div className="max-w-3xl mx-auto p-6 space-y-4">
    <h1 className="text-2xl font-bold">Easyビュー: {lawId}</h1>
    {!data? <div className="text-red-600">/public/easy/{lawId}.json が見つかりません。</div> :
      <ul className="space-y-2">{data.items.map(it=>
        <li key={it.id} className="border rounded p-3">
          <div className="text-xs text-gray-500">ID: {it.id}</div>
          <div>原文: {it.text}</div>
          {it.easy && <div className="font-medium mt-1">やさしい: {it.easy}</div>}
        </li>)}
      </ul>}
  </div>;
}
