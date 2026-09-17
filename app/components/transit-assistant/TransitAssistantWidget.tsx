"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { ChatIcon } from "../icons";
import ChatWindow, { type ChatMessage, type PendingOrigin } from "./ChatWindow";
import { EMPTY_CONVERSATION_STATE, type ConversationState } from "../../lib/transit-assistant/conversation";

type PanelState = "closed" | "open" | "minimized";

// 對話紀錄＋結構化行程狀態只存在瀏覽器的 sessionStorage：同一分頁重新整理可以恢復，
// 關閉分頁就會自動清除，不會寫入資料庫，也完全不含 GPS 座標（座標只在瀏覽器端算完最近站就丟棄）。
const SESSION_KEY = "teagarden-transit-assistant-session-v1";

interface StoredSession {
  messages: ChatMessage[];
  conversationState: ConversationState;
}

function loadSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession> | null;
    if (!parsed || !Array.isArray(parsed.messages)) return null;
    return {
      messages: parsed.messages,
      conversationState: { ...EMPTY_CONVERSATION_STATE, ...(parsed.conversationState ?? {}) },
    };
  } catch {
    return null;
  }
}

function saveSession(session: StoredSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage 不可用時（例如無痕模式限制）靜默忽略，聊天功能仍可正常使用，只是重整頁面後不會恢復
  }
}

export default function TransitAssistantWidget() {
  const { t } = useLanguage();
  const [panelState, setPanelState] = useState<PanelState>("closed");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState>(EMPTY_CONVERSATION_STATE);
  const [pendingOrigin, setPendingOrigin] = useState<PendingOrigin | null>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // 故意在掛載後才讀取 sessionStorage，避免 SSR/CSR 輸出不一致造成 hydration 錯誤
  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages(stored.messages);
      setConversationState(stored.conversationState);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSession({ messages, conversationState });
  }, [hydrated, messages, conversationState]);

  function clearConversation() {
    setMessages([]);
    setConversationState(EMPTY_CONVERSATION_STATE);
    setPendingOrigin(null);
    setAiUnavailable(false);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // 忽略
    }
  }

  if (panelState === "closed") {
    return (
      <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2">
        <span className="rounded-full bg-pine-dark px-3 py-1.5 text-xs font-medium text-paper shadow-md">
          {t.assistantHelpPrompt}
        </span>
        <button
          type="button"
          onClick={() => setPanelState("open")}
          aria-label={t.assistantButtonLabel}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-pine text-paper shadow-lg shadow-pine-dark/40 transition hover:bg-pine-dark focus:outline-none focus:ring-2 focus:ring-gold-soft sm:h-16 sm:w-16"
        >
          <ChatIcon className="h-7 w-7" />
        </button>
      </div>
    );
  }

  if (panelState === "minimized") {
    return (
      <button
        type="button"
        onClick={() => setPanelState("open")}
        className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 rounded-full bg-pine px-4 py-3 text-sm font-medium text-paper shadow-lg shadow-pine-dark/40 hover:bg-pine-dark"
      >
        <ChatIcon className="h-5 w-5" />
        {t.assistantButtonLabel}
      </button>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[380px]">
      <ChatWindow
        messages={messages}
        setMessages={setMessages}
        conversationState={conversationState}
        setConversationState={setConversationState}
        pendingOrigin={pendingOrigin}
        setPendingOrigin={setPendingOrigin}
        aiUnavailable={aiUnavailable}
        setAiUnavailable={setAiUnavailable}
        onMinimize={() => setPanelState("minimized")}
        onClose={() => setPanelState("closed")}
        onClearConversation={clearConversation}
      />
    </div>
  );
}
