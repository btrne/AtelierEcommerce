"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { auth, conversations, aiChat, customRequestsApi, upload } from "@/lib/api";
import { useToast } from "@/components/Toast";
import type { ConversationDto, MessageDto, CustomRequestDto, AiProductSuggestion } from "@/lib/types";

interface LocalMessage {
  id: string;
  text: string;
  sender: "user" | "ai";
  createdAt: string;
  productSuggestions?: AiProductSuggestion[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return formatTime(iso);
  if (diff < 172800000) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function getConvTitle(c: ConversationDto): string {
  if (c.title) return c.title;
  if (c.lastMessage) return c.lastMessage.length > 50 ? c.lastMessage.slice(0, 50) + "..." : c.lastMessage;
  return "Hội thoại mới";
}

const typeLabel: Record<string, string> = { AI: "AI", Support: "Hỗ trợ", Consulting: "Chế tác" };
const typeBadge: Record<string, string> = {
  AI: "bg-blue-100 text-blue-700",
  Support: "bg-amber-100 text-amber-700",
  Consulting: "bg-purple-100 text-purple-700",
};

// ─── Product Card ──────────────────────────────────────────────────────

function ProductCard({ product }: { product: AiProductSuggestion }) {
  const showRange = product.priceMin && product.priceMax && product.priceMin !== product.priceMax;
  const linkSlug = product.slug || product.name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `sp-${product.id}`;
  return (
    <a
      href={`/products/${linkSlug}`}
      className="flex gap-3 p-2 border border-secondary/20 rounded-lg hover:bg-surface-container-low transition-colors min-w-[260px] shrink-0"
    >
      <div className="w-20 h-20 bg-surface-container-high rounded flex-shrink-0 overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="material-symbols-outlined text-3xl flex items-center justify-center w-full h-full text-outline">image</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{product.name}</p>
        {product.categoryName && (
          <p className="text-[11px] text-on-surface-variant">{product.categoryName}</p>
        )}
        <p className="text-sm font-semibold text-primary mt-0.5">
          {showRange
            ? `${product.priceMin!.toLocaleString()}₫ - ${product.priceMax!.toLocaleString()}₫`
            : `${product.price.toLocaleString()}₫`}
        </p>
        {product.description && (
          <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-2">{product.description}</p>
        )}
      </div>
    </a>
  );
}

// ─── Guest AI Chat ─────────────────────────────────────────────────────

function GuestAiChat() {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    const userMsg: LocalMessage = { id: Date.now().toString(), text, sender: "user", createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.sender === "user" ? "user" as const : "model" as const, text: m.text }));
      const res = await aiChat.chat({ message: text, history });
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        text: res.reply,
        sender: "ai",
        createdAt: new Date().toISOString(),
        productSuggestions: res.productSuggestions ?? [],
      }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        text: err?.message || "Xin lỗi, không thể kết nối đến AI. Vui lòng thử lại sau.",
        sender: "ai",
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-on-surface-variant text-sm mt-8">
            <p>Chào bạn! Tôi là trợ lý AI của Atelier.</p>
            <p className="mt-1">Tôi có thể tư vấn về sản phẩm, chế tác, đơn hàng và hơn thế nữa.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id}>
            <div className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] p-3 text-sm ${
                msg.sender === "user"
                  ? "bg-primary text-on-primary rounded-tl-xl rounded-tr-xl rounded-bl-xl"
                  : "bg-surface-container-low border border-secondary/10 rounded-tl-xl rounded-tr-xl rounded-br-xl"
              }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${msg.sender === "user" ? "text-on-primary/60" : "text-on-surface-variant"}`}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
            {msg.productSuggestions && msg.productSuggestions.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mt-1 ml-1">
                {msg.productSuggestions.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-container-low border border-secondary/10 rounded-tl-xl rounded-tr-xl rounded-br-xl p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-secondary/20 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Nhập tin nhắn..."
            className="flex-1 border border-secondary/30 px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-secondary"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-primary text-on-primary px-4 py-2 text-sm hover:bg-secondary transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-base">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Conversation Sidebar ─────────────────────────────────────────────

function ConversationSidebar({
  convs,
  loading,
  selectedId,
  onSelect,
  onNew,
}: {
  convs: ConversationDto[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (c: ConversationDto) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-on-surface-variant text-sm animate-pulse">Đang tải...</div>
        ) : convs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
            <span className="material-symbols-outlined text-3xl text-outline">chat</span>
            <p className="text-sm text-on-surface-variant">Chưa có hội thoại nào</p>
            <p className="text-xs text-on-surface-variant">Nhấn "Tạo hội thoại" để bắt đầu</p>
          </div>
        ) : (
          convs.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={`w-full text-left px-4 py-3 border-b border-secondary/10 transition-colors ${
                selectedId === c.id ? "bg-surface-container-low" : "hover:bg-surface-container-low"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-sm">chat</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <p className="text-sm font-medium truncate">{getConvTitle(c)}</p>
                    {c.lastMessageAt && (
                      <span className="text-[10px] text-on-surface-variant shrink-0">
                        {formatDate(c.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeBadge[c.type] || "bg-gray-100 text-gray-600"}`}>
                      {typeLabel[c.type] || c.type}
                    </span>
                    {c.lastMessage && (
                      <p className="text-xs text-on-surface-variant truncate">{c.lastMessage}</p>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
      <div className="p-3 border-t border-secondary/20">
        <button
          onClick={onNew}
          className="w-full bg-primary text-on-primary py-2.5 text-sm font-label-caps hover:bg-secondary transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">add</span>
          TẠO HỘI THOẠI MỚI
        </button>
      </div>
    </div>
  );
}

// ─── Chat View (Logged-in) ─────────────────────────────────────────────

function LoggedInChatView({
  conv,
  onBack,
  onRefresh,
}: {
  conv: ConversationDto;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (): Promise<MessageDto[] | null> => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await conversations.messages(conv.id);
      const data = Array.isArray(res) ? res : [];
      setMessages(data);
      return data;
    } catch (err: any) {
      setLoadError(err?.message || "Không thể tải tin nhắn");
      return null;
    } finally {
      setLoading(false);
    }
  }, [conv.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setSending(true);
    setInput("");

    // Show user message immediately
    const optimisticMsg: MessageDto = {
      id: -Date.now(),
      conversationId: conv.id,
      sender: "Customer",
      messageText: text,
      imageUrls: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      if (conv.type === "AI") {
        const history = messages.map((m) => ({ role: m.sender === "Customer" ? "user" as const : "model" as const, text: m.messageText }));
        await aiChat.chat({ message: text, conversationId: conv.id, history });
        await loadMessages();
      } else {
        const msg = await conversations.sendMessage(conv.id, text);
        setMessages((prev) => [...prev.slice(0, -1), msg]);
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setMessages((prev) => [...prev, {
        id: -Date.now() - 1,
        conversationId: conv.id,
        sender: "AI",
        messageText: "⚠️ " + (err?.message || "Không thể gửi tin nhắn, vui lòng thử lại sau."),
        imageUrls: [],
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await upload.file(file);
      const msg = await conversations.sendMessage(conv.id, "", [url]);
      setMessages((prev) => [...prev, msg]);
    } catch (err: any) {
      showToast(err?.message || "Không thể tải ảnh lên", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const title = getConvTitle(conv);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-secondary/20 bg-surface-container-low">
        <button onClick={onBack} className="material-symbols-outlined text-sm text-on-surface-variant">arrow_back</button>
        <span className="text-sm font-medium truncate">{title}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ml-auto ${typeBadge[conv.type] || "bg-gray-100 text-gray-600"}`}>
          {typeLabel[conv.type] || conv.type}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full text-on-surface-variant text-sm animate-pulse">Đang tải...</div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
            <span className="material-symbols-outlined text-2xl text-error">error</span>
            <p className="text-sm text-error">{loadError}</p>
            <button onClick={loadMessages} className="text-xs text-primary border border-primary/30 px-3 py-1">Thử lại</button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-on-surface-variant text-sm">Chưa có tin nhắn</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>
              <div className={`flex ${msg.sender === "Admin" || msg.sender === "AI" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] p-3 text-sm ${
                  msg.sender === "Admin" || msg.sender === "AI"
                    ? "bg-surface-container-low border border-secondary/10 rounded-tl-xl rounded-tr-xl rounded-br-xl"
                    : "bg-primary text-on-primary rounded-tl-xl rounded-tr-xl rounded-bl-xl"
                }`}>
                  {msg.sender === "AI" && (
                    <p className="text-[10px] text-secondary font-label-caps mb-1">AI</p>
                  )}
                  {msg.sender === "Admin" && (
                    <p className="text-[10px] text-on-surface-variant font-label-caps mb-1">Admin</p>
                  )}
                  {msg.messageText && <p className="whitespace-pre-wrap">{msg.messageText}</p>}
                  {msg.imageUrls?.map((url, i) => (
                    <img key={i} src={url} alt="" className="mt-2 max-w-full rounded" />
                  ))}
                  <p className={`text-[10px] mt-1 ${msg.sender === "Admin" || msg.sender === "AI" ? "text-on-surface-variant" : "text-on-primary/60"}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
              {(msg.sender === "AI" || msg.sender === "Admin") && msg.productSuggestions && msg.productSuggestions.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mt-1 ml-1">
                  {msg.productSuggestions.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-secondary/20 p-3 flex gap-2">
        {conv.type === "AI" ? null : (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-9 h-9 flex items-center justify-center border border-secondary/30 hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-base">{uploading ? "hourglass" : "image"}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Nhập tin nhắn..."
          className="flex-1 border border-secondary/30 px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-secondary"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="bg-primary text-on-primary px-4 py-2 text-sm hover:bg-secondary transition-colors disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-base">send</span>
        </button>
      </div>
    </div>
  );
}

// ─── Bespoke Requests View ────────────────────────────────────────────

function BespokeRequestsView({
  onBackToChat,
}: {
  onBackToChat: (conv?: ConversationDto) => void;
}) {
  const [requests, setRequests] = useState<CustomRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CustomRequestDto | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    customRequestsApi.my()
      .then(setRequests)
      .catch((err: any) => {
        showToast(err?.message || "Không thể tải yêu cầu chế tác", "error");
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleConfirm = async (id: number) => {
    try {
      await customRequestsApi.confirm(id);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "Confirmed", customerConfirmedAt: new Date().toISOString() } : r));
      if (selected?.id === id) setSelected({ ...selected, status: "Confirmed" });
    } catch (err: any) {
      showToast(err?.message || "Không thể xác nhận yêu cầu", "error");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await customRequestsApi.reject(id);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "Rejected" } : r));
      if (selected?.id === id) setSelected({ ...selected, status: "Rejected" });
    } catch (err: any) {
      showToast(err?.message || "Không thể từ chối yêu cầu", "error");
    }
  };

  const statusLabel: Record<string, string> = {
    Pending: "Chờ duyệt",
    Quoted: "Đã báo giá",
    Confirmed: "Đã xác nhận",
    Rejected: "Đã từ chối",
    InProgress: "Đang thực hiện",
    Completed: "Hoàn thành",
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-on-surface-variant text-sm">Đang tải...</div>;
  }

  if (selected) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-secondary/20 bg-surface-container-low">
          <button onClick={() => setSelected(null)} className="material-symbols-outlined text-sm text-on-surface-variant">arrow_back</button>
          <span className="text-sm font-medium">Yêu cầu #{selected.id}</span>
          {selected.conversationId && (
            <button
              onClick={async () => {
                try {
                  const convs = await conversations.my();
                  const found = (Array.isArray(convs) ? convs : []).find((c) => c.id === selected.conversationId);
                  if (found) onBackToChat(found);
                } catch (err: any) {
                  showToast(err?.message || "Không thể mở hội thoại", "error");
                }
              }}
              className="ml-auto text-[10px] text-primary border border-primary/30 px-2 py-0.5"
            >
              HỘI THOẠI
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selected.imageUrl && (
            <img src={selected.imageUrl} alt="" className="w-full rounded border border-secondary/20" />
          )}
          {selected.description && (
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Mô tả:</p>
              <p className="text-sm">{selected.description}</p>
            </div>
          )}
          {selected.quotedPrice != null && (
            <div className="flex justify-between border-b border-secondary/20 pb-2">
              <span className="text-sm text-on-surface-variant">Báo giá:</span>
              <span className="text-sm font-semibold">{selected.quotedPrice.toLocaleString()}₫</span>
            </div>
          )}
          {selected.estimatedFinishDate && (
            <div className="flex justify-between border-b border-secondary/20 pb-2">
              <span className="text-sm text-on-surface-variant">Dự kiến hoàn thành:</span>
              <span className="text-sm">{new Date(selected.estimatedFinishDate).toLocaleDateString("vi-VN")}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-secondary/20 pb-2">
            <span className="text-sm text-on-surface-variant">Trạng thái:</span>
            <span className={`text-sm ${
              selected.status === "Confirmed" || selected.status === "Completed" ? "text-green-600" :
              selected.status === "Quoted" ? "text-blue-600" :
              selected.status === "Rejected" ? "text-red-600" : "text-orange-600"
            }`}>{statusLabel[selected.status] || selected.status}</span>
          </div>
          {selected.customerConfirmedAt && (
            <div className="flex justify-between border-b border-secondary/20 pb-2">
              <span className="text-sm text-on-surface-variant">Xác nhận lúc:</span>
              <span className="text-sm">{new Date(selected.customerConfirmedAt).toLocaleString("vi-VN")}</span>
            </div>
          )}
          {selected.status === "Quoted" && (
            <div className="flex gap-3 pt-2">
              <button onClick={() => handleReject(selected.id)} className="flex-1 border border-secondary/30 px-4 py-2 text-sm hover:bg-surface-container-low transition-colors">
                Từ chối
              </button>
              <button onClick={() => handleConfirm(selected.id)} className="flex-1 bg-primary text-on-primary px-4 py-2 text-sm hover:bg-secondary transition-colors">
                Xác nhận
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-secondary/20 bg-surface-container-low flex items-center gap-2">
        <button onClick={() => onBackToChat()} className="material-symbols-outlined text-sm text-on-surface-variant">arrow_back</button>
        <span className="text-sm font-medium">Yêu cầu chế tác</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {requests.length === 0 && (
          <div className="text-center text-on-surface-variant text-sm mt-8">
            <span className="material-symbols-outlined text-3xl block mb-2">handyman</span>
            <p>Chưa có yêu cầu chế tác nào.</p>
            <p className="mt-1">Hãy liên hệ với admin để tạo yêu cầu chế tác riêng.</p>
          </div>
        )}
        {requests.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r)}
            className="w-full text-left border border-secondary/20 p-3 hover:bg-surface-container-low transition-colors"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">#{r.id}</span>
              <span className={`text-[10px] px-2 py-0.5 border ${
                r.status === "Confirmed" || r.status === "Completed" ? "border-green-500 text-green-600" :
                r.status === "Quoted" ? "border-blue-500 text-blue-600" :
                r.status === "Rejected" ? "border-red-500 text-red-600" :
                "border-orange-500 text-orange-600"
              }`}>
                {statusLabel[r.status] || r.status}
              </span>
            </div>
            {r.description && <p className="text-xs text-on-surface-variant line-clamp-2">{r.description}</p>}
            {r.quotedPrice != null && <p className="text-xs text-on-surface-variant mt-1">{r.quotedPrice.toLocaleString()}₫</p>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Side Drawer ───────────────────────────────────────────────────────

function SideDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[300]">
          <div className="absolute inset-0 bg-black/20" onClick={onClose} />
          <div className="absolute top-0 right-0 w-[480px] max-w-[96vw] h-full bg-background shadow-2xl flex flex-col animate-slide-in-right">
            {children}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main ChatBox ──────────────────────────────────────────────────────

export default function ChatBox() {
  const [open, setOpen] = useState(false);
  const [selectedConv, setSelectedConv] = useState<ConversationDto | null>(null);
  const [convs, setConvs] = useState<ConversationDto[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [profile, setProfile] = useState<{ id: number } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const { showToast } = useToast();
  const isLoggedIn = authReady && profile !== null;

  useEffect(() => {
    setProfile(auth.getProfile());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    const onStorage = () => setProfile(auth.getProfile());
    const onAuthChanged = () => setProfile(auth.getProfile());
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth-changed", onAuthChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-changed", onAuthChanged);
    };
  }, []);

  const loadConvs = useCallback(async (autoSelect = false) => {
    setConvsLoading(true);
    try {
      const res = await conversations.my();
      const list = Array.isArray(res) ? res : [];
      setConvs(list);
      if (autoSelect && list.length > 0) {
        setSelectedConv((prev) => prev ?? list[0]);
      }
    } catch (err: any) {
      showToast(err?.message || "Không thể tải danh sách hội thoại", "error");
    } finally {
      setConvsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (open) {
      const p = auth.getProfile();
      setProfile(p);
      setAuthReady(true);
    }
  }, [open]);

  const autoSelectedRef = useRef(false);

  useEffect(() => {
    if (open && isLoggedIn && !selectedConv) {
      if (!autoSelectedRef.current) {
        autoSelectedRef.current = true;
        loadConvs(true);
      } else {
        loadConvs(false);
      }
    }
    if (!open) {
      autoSelectedRef.current = false;
    }
  }, [open, isLoggedIn, selectedConv, loadConvs]);

  const handleNewConversation = async () => {
    const p = auth.getProfile();
    if (!p) return;
    try {
      const res = await conversations.create("AI");
      const newConv: ConversationDto = {
        id: res.conversationId,
        userId: p.id,
        type: "AI",
        title: undefined,
        startedAt: new Date().toISOString(),
        messageCount: 0,
      };
      setConvs((prev) => [newConv, ...prev]);
      setSelectedConv(newConv);
    } catch (err: any) {
      showToast(err?.message || "Không thể tạo hội thoại mới", "error");
    }
  };

  const handleSelectConv = (c: ConversationDto) => {
    setSelectedConv(c);
  };

  const handleBack = () => {
    setSelectedConv(null);
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <>
      <SideDrawer open={open} onClose={() => { setOpen(false); setSelectedConv(null); }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-secondary/20 bg-surface-container-low">
          <h3 className="font-headline text-lg">Trò chuyện</h3>
          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <button
                onClick={() => { setShowRequests((v) => !v); setSelectedConv(null); }}
                className={`text-[10px] px-2 py-1 border transition-colors ${
                  showRequests ? "bg-primary text-on-primary border-primary" : "border-secondary/30 hover:bg-surface-container-low"
                }`}
              >
                CHẾ TÁC
              </button>
            )}
            <button onClick={() => { setOpen(false); setSelectedConv(null); }} className="material-symbols-outlined text-on-surface-variant hover:text-primary">close</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {!isLoggedIn ? (
            authReady ? <GuestAiChat /> : <div className="flex items-center justify-center h-full text-on-surface-variant text-sm">Đang tải...</div>
          ) : showRequests ? (
            <BespokeRequestsView onBackToChat={(conv) => { setShowRequests(false); if (conv) setSelectedConv(conv); }} />
          ) : selectedConv ? (
            <LoggedInChatView conv={selectedConv} onBack={handleBack} onRefresh={loadConvs} />
          ) : (
            <ConversationSidebar
              convs={convs}
              loading={convsLoading}
              selectedId={null}
              onSelect={handleSelectConv}
              onNew={handleNewConversation}
            />
          )}
        </div>
      </SideDrawer>

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 md:right-8 z-[200] w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-xl hover:bg-secondary transition-colors"
      >
        <span className="material-symbols-outlined text-2xl">{open ? "close" : "chat"}</span>
      </button>
    </>
  );
}
