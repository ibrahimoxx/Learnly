import { auth } from "@clerk/nextjs/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  const { enrollmentId } = await params;
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return new Response("Unauthorized", { status: 401 });

  const apiUrl = process.env.API_URL ?? "http://localhost:8000";
  let upstream: Response;
  try {
    upstream = await fetch(
      `${apiUrl}/api/v1/enrollments/${enrollmentId}/progress/stream`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    return new Response("Stream unavailable", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Stream unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
