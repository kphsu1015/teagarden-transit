"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { useLanguage } from "../../context/LanguageContext";
import { HOMESTAY_STOP } from "../../lib/bus-data";
import { LINE_CONTACT_URL } from "../../lib/site";
import { resolveLocationText, nearestStopFromCoords, QUICK_LOCATIONS } from "../../lib/transit-assistant/locations";
import type { ConversationState } from "../../lib/transit-assistant/conversation";
import { MinimizeIcon, CloseIcon, SendIcon, LocationIcon, RefreshIcon, LineIcon, WhatsAppIcon } from "../icons";

const MAX_CHARS = 500;

/** 把訊息中的「💬 LINE ID：」「📱 WhatsApp：」這類標記換成實際的品牌圖示，其餘文字原樣顯示 */
function renderMessageLines(text: string) {
  const linePrefix = "💬 ";
  const whatsappPrefix = "📱 ";
  return text.split("\n").map((line, i) => {
    if (line.startsWith(linePrefix)) {
      return (
        <span key={i} className="flex items-center gap-1.5">
          <LineIcon className="h-4 w-4 shrink-0" />
          <span>{line.slice(linePrefix.length)}</span>
        </span>
      );
    }
    if (line.startsWith(whatsappPrefix)) {
      return (
        <span key={i} className="flex items-center gap-1.5">
          <WhatsAppIcon className="h-4 w-4 shrink-0" />
          <span>{line.slice(whatsappPrefix.length)}</span>
        </span>
      );
    }
    return (
      <span key={i} className="block">
        {line || " "}
      </span>
    );
  });
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** 僅開發模式：伺服器回傳的除錯資訊（AI 解析 JSON、搜尋時間窗、每班車排除原因），方便確認錯誤發生在 AI 解析還是班次計算 */
  debug?: unknown;
}

export interface PendingOrigin {
  key: string;
  display: string;
}

interface ApiResponse {
  ok: boolean;
  reply?: string;
  aiUnavailable?: boolean;
  error?: string;
  debug?: unknown;
  conversationState?: ConversationState;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  conversationState: ConversationState;
  setConversationState: Dispatch<SetStateAction<ConversationState>>;
  pendingOrigin: PendingOrigin | null;
  setPendingOrigin: Dispatch<SetStateAction<PendingOrigin | null>>;
  aiUnavailable: boolean;
  setAiUnavailable: Dispatch<SetStateAction<boolean>>;
  onMinimize: () => void;
  onClose: () => void;
  onClearConversation: () => void;
}

let msgCounter = 0;
function nextId(): string {
  msgCounter += 1;
  return `m${Date.now()}-${msgCounter}`;
}

export default function ChatWindow({
  messages,
  setMessages,
  conversationState,
  setConversationState,
  pendingOrigin,
  setPendingOrigin,
  aiUnavailable,
  setAiUnavailable,
  onMinimize,
  onClose,
  onClearConversation,
}: ChatWindowProps) {
  const { t, lang, sn } = useLanguage();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ id: "welcome", role: "assistant", text: t.assistantWelcome }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 語言切換時，若使用者尚未開始對話（只有初始的招呼語），同步更新招呼語的語言
  useEffect(() => {
    setMessages((prev) =>
      prev.length === 1 && prev[0].id === "welcome"
        ? [{ ...prev[0], text: t.assistantWelcome }]
        : prev
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.assistantWelcome]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function addAssistantMessage(text: string, debug?: unknown) {
    if (debug) console.debug("[transit-assistant] debug:", debug);
    setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text, debug }]);
  }
  function addUserMessage(text: string) {
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text }]);
  }

  async function submitQuick(originLabel: string, destLabel: string) {
    if (isSending) return;
    addUserMessage(`${originLabel} → ${destLabel}`);
    setIsSending(true);
    try {
      const res = await fetch("/api/transit-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "quick", originText: originLabel, destText: destLabel, lang }),
      });
      const data = (await res.json()) as ApiResponse;
      if (data.ok && data.reply) {
        addAssistantMessage(data.reply);
        if (data.conversationState) setConversationState(data.conversationState);
      } else {
        addAssistantMessage(t.assistantErrorGeneric);
      }
    } catch {
      addAssistantMessage(t.assistantErrorGeneric);
    } finally {
      setIsSending(false);
    }
  }

  function handleOriginSelected(key: string, displayLabel: string) {
    const isHomestay = key === HOMESTAY_STOP;
    if (!pendingOrigin) {
      if (isHomestay) {
        setPendingOrigin({ key, display: displayLabel });
        addAssistantMessage(t.assistantPendingOriginHint(displayLabel));
      } else {
        void submitQuick(displayLabel, sn(HOMESTAY_STOP));
      }
      return;
    }
    if (isHomestay) return; // 已經在等待目的地，重複點民宿相關按鈕不動作
    void submitQuick(pendingOrigin.display, displayLabel);
    setPendingOrigin(null);
  }

  function handleQuickTap(label: string) {
    const resolved = resolveLocationText(label);
    if (!resolved) return;
    handleOriginSelected(resolved.key, sn(resolved.key));
  }

  function requestLocation() {
    setConsentOpen(false);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      addAssistantMessage(t.assistantLocationUnsupported);
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const nearest = nearestStopFromCoords(pos.coords.latitude, pos.coords.longitude);
        const display = sn(nearest.key);
        addAssistantMessage(t.assistantLocationResolved(display));
        handleOriginSelected(nearest.key, display);
      },
      () => {
        setGeoLoading(false);
        addAssistantMessage(t.assistantLocationDenied);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }

  async function sendText(trimmed: string) {
    if (!trimmed || isSending) return;
    setPendingOrigin(null);
    addUserMessage(trimmed);
    setIsSending(true);
    try {
      const res = await fetch("/api/transit-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "text", message: trimmed, conversationState }),
      });
      const data = (await res.json()) as ApiResponse;
      if (data.aiUnavailable) {
        setAiUnavailable(true);
        addAssistantMessage(t.assistantFallbackBody);
      } else if (data.ok && data.reply) {
        addAssistantMessage(data.reply, data.debug);
        if (data.conversationState) setConversationState(data.conversationState);
      } else {
        addAssistantMessage(t.assistantErrorGeneric);
      }
    } catch {
      addAssistantMessage(t.assistantErrorGeneric);
    } finally {
      setIsSending(false);
    }
  }

  async function handleSend() {
    const trimmed = input.trim();
    const charCount = Array.from(trimmed).length;
    if (!trimmed || isSending) return;
    if (charCount > MAX_CHARS) {
      addAssistantMessage(t.assistantTooLong(charCount, MAX_CHARS));
      return;
    }
    setInput("");
    await sendText(trimmed);
  }

  const charCount = Array.from(input).length;
  const overLimit = charCount > MAX_CHARS;

  return (
    <div className="flex max-h-[75vh] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
      <div className="flex items-center justify-between gap-2 bg-pine-dark px-4 py-3 text-paper">
        <div>
          <p className="font-serif text-sm tracking-wide">{t.assistantTitle}</p>
          <p className="text-xs text-paper/70">{t.assistantSubtitle}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClearConversation}
            aria-label={t.assistantClearAria}
            title={t.assistantClearAria}
            className="flex h-8 w-8 items-center justify-center rounded-full text-paper/80 hover:bg-white/10 hover:text-paper"
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMinimize}
            aria-label={t.assistantMinimizeAria}
            className="flex h-8 w-8 items-center justify-center rounded-full text-paper/80 hover:bg-white/10 hover:text-paper"
          >
            <MinimizeIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.assistantCloseAria}
            className="flex h-8 w-8 items-center justify-center rounded-full text-paper/80 hover:bg-white/10 hover:text-paper"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-paper px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                m.role === "user" ? "bg-pine text-paper" : "border border-line bg-white text-ink"
              }`}
            >
              {renderMessageLines(m.text)}
            </div>
            {m.debug != null && (
              <details className="mt-1 max-w-[85%] rounded-lg bg-ink/5 px-2 py-1 text-[10px] text-ink-soft">
                <summary className="cursor-pointer select-none">Debug info (dev only)</summary>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(m.debug, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink-soft">
              {t.assistantThinking}
            </div>
          </div>
        )}

        {aiUnavailable && (
          <div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            <p className="font-medium">{t.assistantFallbackTitle}</p>
            <p className="mt-1">{t.assistantFallbackBody}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/bus"
                className="rounded-full border border-amber-700/40 bg-white px-3 py-1 font-medium text-amber-800 hover:bg-amber-100"
              >
                {t.assistantFallbackScheduleLabel}
              </Link>
              <a
                href={LINE_CONTACT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-amber-700/40 bg-white px-3 py-1 font-medium text-amber-800 hover:bg-amber-100"
              >
                {t.assistantFallbackLineLabel}
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-line bg-white px-4 py-3">
        {consentOpen && (
          <div className="mb-3 rounded-xl border border-line bg-paper-dim p-3 text-xs leading-5 text-ink-soft">
            <p className="font-medium text-ink">{t.assistantLocationConsentTitle}</p>
            <p className="mt-1">{t.assistantLocationConsentBody}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={requestLocation}
                className="rounded-full bg-pine px-3 py-1 font-medium text-paper hover:bg-pine-dark"
              >
                {t.assistantLocationConsentAllow}
              </button>
              <button
                type="button"
                onClick={() => setConsentOpen(false)}
                className="rounded-full border border-line px-3 py-1 font-medium text-ink-soft hover:bg-white"
              >
                {t.assistantLocationConsentCancel}
              </button>
            </div>
          </div>
        )}

        {conversationState.awaitingDriverOfferResponse && (
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => void sendText(t.assistantDriverOfferYes)}
              disabled={isSending}
              className="rounded-full bg-pine px-3 py-1.5 text-xs font-medium text-paper hover:bg-pine-dark disabled:opacity-50"
            >
              {t.assistantDriverOfferYes}
            </button>
            <button
              type="button"
              onClick={() => void sendText(t.assistantDriverOfferNo)}
              disabled={isSending}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-paper-dim disabled:opacity-50"
            >
              {t.assistantDriverOfferNo}
            </button>
          </div>
        )}

        {pendingOrigin && (
          <button
            type="button"
            onClick={() => setPendingOrigin(null)}
            aria-label={t.assistantResetAria}
            className="mb-2 inline-flex items-center gap-1 rounded-full bg-pine/10 px-3 py-1 text-xs font-medium text-pine-dark hover:bg-pine/20"
          >
            {pendingOrigin.display} ✕
          </button>
        )}

        <div className="mb-2">
          <p className="mb-1.5 text-xs font-medium text-ink-soft">{t.assistantQuickLabel}</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_LOCATIONS.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => handleQuickTap(loc)}
                disabled={isSending}
                className="rounded-full border border-line px-2.5 py-1 text-xs text-ink hover:border-pine hover:text-pine-dark disabled:opacity-50"
              >
                {sn(loc)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setConsentOpen(true)}
              disabled={isSending || geoLoading}
              className="flex items-center gap-1 rounded-full border border-gold-soft bg-gold-soft/10 px-2.5 py-1 text-xs font-medium text-gold hover:bg-gold-soft/20 disabled:opacity-50"
            >
              <LocationIcon className="h-3.5 w-3.5" />
              {geoLoading ? "…" : t.assistantUseLocationLabel}
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.assistantInputPlaceholder}
              disabled={isSending}
              maxLength={MAX_CHARS + 50}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine disabled:bg-paper-dim"
            />
            <p className={`mt-1 text-right text-[11px] ${overLimit ? "text-red-600" : "text-ink-soft/60"}`}>
              {charCount}/{MAX_CHARS}
            </p>
          </div>
          <button
            type="submit"
            disabled={isSending || !input.trim() || overLimit}
            aria-label={t.assistantSendAria}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine text-paper hover:bg-pine-dark disabled:opacity-40"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
