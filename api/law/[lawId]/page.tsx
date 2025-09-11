import { getLawXml } from "@/lib/egov";

export default async function LawDetail({ params }: { params: { lawId: string } }) {
  const xml = await getLawXml(params.lawId);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-bold break-all">Law: {params.lawId}</h1>
      <details open className="border rounded-xl p-4">
        <summary className="cursor-pointer font-semibold">Raw XML</summary>
        <pre className="overflow-auto text-sm mt-3">{xml}</pre>
      </details>
    </main>
  );
}
