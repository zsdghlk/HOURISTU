export const dynamic = 'force-static';

// 204 No Content で返して 404 を防ぐ（最速の消し方）
export async function GET() {
  return new Response(null, {
    status: 204,
    headers: { 'Content-Type': 'image/x-icon', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
