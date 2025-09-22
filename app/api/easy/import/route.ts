export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
type Item = { id:string; text:string; easy?:string };
export async function POST(req: NextRequest){
  try{
    const { lawId, items } = await req.json();
    if(!lawId || !Array.isArray(items)) return NextResponse.json({error:"invalid payload"},{status:400});
    const norm: Item[] = items.map((it:any,i:number)=>({
      id:String(it?.id ?? i+1), text:String(it?.text??"").trim(), easy:String(it?.easy??"").trim()
    })).filter(x=>x.text);
    const dir="public/easy"; if(!existsSync(dir)) await mkdir(dir,{recursive:true});
    await writeFile(`${dir}/${lawId}.json`, JSON.stringify({lawId,count:norm.length,items:norm},null,2), "utf8");
    return NextResponse.json({ok:true, path:`/easy/${lawId}.json`, count:norm.length});
  }catch(e:any){ return NextResponse.json({error:e?.message||String(e)},{status:500}); }
}
