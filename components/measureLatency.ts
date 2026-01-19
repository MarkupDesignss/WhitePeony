export async function measureLatency(
  url: string,
  timeoutMs: number
): Promise<number> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response || !response.ok) return -1;
    return Date.now() - start;
  } catch {
    clearTimeout(timer);
    return -1;
  }
}
