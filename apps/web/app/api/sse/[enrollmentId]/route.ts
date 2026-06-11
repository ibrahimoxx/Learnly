import { auth } from "@clerk/nextjs/server";
import { Agent, fetch as undiciFetch } from "undici";

const sseAgent = new Agent({ headersTimeout: 0, bodyTimeout: 0 });

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  const { enrollmentId } = await params;
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return new Response("Unauthorized", { status: 401 });

  const apiUrl = process.env.API_URL ?? "http://localhost:8000";
  let upstream: Awaited<ReturnType<typeof undiciFetch>>;
  try {
    upstream = await undiciFetch(
      `${apiUrl}/api/v1/enrollments/${enrollmentId}/progress/stream`,
      { headers: { Authorization: `Bearer ${token}` }, dispatcher: sseAgent }
    );
  } catch {
    return new Response("Stream unavailable", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Stream unavailable", { status: 502 });
  }

  return new Response(upstream.body as unknown as ReadableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
