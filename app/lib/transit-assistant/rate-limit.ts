// 每個 IP 的簡易流量限制。預設用記憶體內的滑動視窗（單一伺服器執行個體有效，
// 重啟或多執行個體部署時不會共享狀態）。若設定了 Upstash Redis REST 的環境變數，
// 會改用 Upstash 做跨執行個體的流量限制（僅用 fetch 呼叫 REST API，不需要額外套件）。
//
// 可選環境變數（不設定則自動退回記憶體限制，交通小幫手仍可正常使用）：
//   UPSTASH_REDIS_REST_URL=
//   UPSTASH_REDIS_REST_TOKEN=

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX || 8);

const memStore = new Map<string, number[]>();

function checkMemory(ip: string): boolean {
  const now = Date.now();
  const prev = memStore.get(ip) ?? [];
  const recent = prev.filter((t) => now - t < WINDOW_MS);

  if (memStore.size > 5000) {
    // 粗略清掉早已過期的紀錄，避免長時間執行的伺服器記憶體無限成長
    for (const [key, hits] of memStore) {
      if (hits.every((t) => now - t >= WINDOW_MS)) memStore.delete(key);
    }
  }

  if (recent.length >= MAX_REQUESTS) {
    memStore.set(ip, recent);
    return false;
  }
  recent.push(now);
  memStore.set(ip, recent);
  return true;
}

async function checkUpstash(ip: string): Promise<boolean | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const key = `teagarden:transit-assistant:rl:${ip}`;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, String(WINDOW_MS), "NX"],
      ]),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ result?: number }>;
    const count = Number(data?.[0]?.result ?? 0);
    return count > 0 && count <= MAX_REQUESTS;
  } catch {
    return null; // Upstash 不可用時，退回記憶體限制而不是直接放行或整個功能掛掉
  }
}

/** 回傳 true 表示這次請求可以放行 */
export async function checkRateLimit(ip: string): Promise<boolean> {
  const upstashResult = await checkUpstash(ip);
  if (upstashResult !== null) return upstashResult;
  return checkMemory(ip);
}
