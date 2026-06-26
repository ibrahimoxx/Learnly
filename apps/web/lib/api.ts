const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "http://127.0.0.1:8000";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      signal: controller.signal,
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`${response.status}: ${body || path}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}
