// 極簡的記憶體短時間快取，用於「相同問題 + 相近時間範圍」時跳過 OpenAI 呼叫，降低費用。
// 只快取 OpenAI 解析出來的結構化 JSON（不含班次計算結果，班次本來就即時算，不需要快取）。

import type { ParseOutcome } from "./openai-parser";

interface Entry {
  value: ParseOutcome;
  expiresAt: number;
}

const TTL_MS = Number(process.env.ASSISTANT_CACHE_TTL_MS || 5 * 60_000);
const store = new Map<string, Entry>();

export function makeParseCacheKey(message: string, nowDateISO: string, contextJson: string | null): string {
  // 以 5 分鐘為一個時間桶，過了桶界自然失效，避免「現在」「明天」等相對時間用到過期解析結果。
  // contextJson 一併加入 key：同一句「晚一班」在不同對話上下文下代表完全不同的意思，
  // 不能共用快取結果，否則會把 A 對話的解析結果誤套用到 B 對話。
  const bucket = Math.floor(Date.now() / TTL_MS);
  return `${nowDateISO}::${bucket}::${contextJson ?? ""}::${message.trim().toLowerCase()}`;
}

export function getCachedParse(key: string): ParseOutcome | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedParse(key: string, value: ParseOutcome): void {
  if (store.size > 2000) {
    const oldestKey = store.keys().next().value;
    if (oldestKey) store.delete(oldestKey);
  }
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}
