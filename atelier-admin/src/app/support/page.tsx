"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { conversations } from "@/lib/api";
import { useToast } from "@/components/Toast";
import ProductSuggestions from "@/components/ProductSuggestions";
import type { ConversationDto, MessageDto, PaginatedList } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5097/api";

type FilterTab = "AI" | "Support";

function SupportContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [data, setData] = useState<ConversationDto[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalCount: 0, hasNextPage: false });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("Support");
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<ConversationDto | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoOpened = useRef(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadData = useCallback(async (f: FilterTab, p: number, s: string) => {
    setLoading(true);
    try {
      const res = await conversations.admin({ type: f === "AI" ? "AI" : "Support", page: p, pageSize: 20, search: s || undefined }) as PaginatedList<ConversationDto>;
      if (p === 1) {
        setData(res.items);
      } else {
        setData(prev => [...prev, ...res.items]);
      }
      setPagination({ page: p, totalCount: res.totalCount, hasNextPage: res.hasNextPage });
    } catch {
      showToast("Lỗi tải danh sách hội thoại", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadFirstPage = useCallback(() => {
    setSelectedConv(null);
    setMessages([]);
    loadData(filter, 1, search);
  }, [filter, loadData, search]);

  useEffect(() => {
    loadFirstPage();
  }, [filter]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadData(filter, 1, search);
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  useEffect(() => {
    if (autoOpened.current) return;
    const convId = searchParams.get("convId");
    if (!convId || data.length === 0) return;
    const conv = data.find((c) => c.id === Number(convId));
    if (conv) {
      autoOpened.current = true;
      selectConversation(conv);
    }
  }, [data, searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectConversation = async (conv: ConversationDto) => {
    setSelectedConv(conv);
    setReplyText("");
    setMessagesLoading(true);
    try {
      const msgs = await conversations.messages(conv.id);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err: any) {
      showToast(err.message || "Lỗi tải tin nhắn", "error");
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedConv || !replyText.trim()) return;
    setSending(true);
    try {
      const msg = await conversations.sendMessage(selectedConv.id, replyText.trim());
      setMessages((prev) => [...prev, msg]);
      setReplyText("");
    } catch (err: any) {
      showToast(err.message || "Lỗi gửi tin nhắn", "error");
    } finally {
      setSending(false);
    }
  };

  const loadMore = () => {
    loadData(filter, pagination.page + 1, search);
  };

  const timeLabel = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)}p`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
    return d.toLocaleDateString("vi-VN");
  };

  const filterTabs: FilterTab[] = ["Support", "AI"];

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] border border-outline-variant bg-surface">
      {/* Tabs */}
      <div className="flex border-b border-outline-variant">
        {filterTabs.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-4 font-label-caps text-label-caps tracking-wider transition-colors ${
              filter === f
                ? "text-primary border-b-2 border-primary bg-surface-container-low"
                : "text-on-surface-variant hover:text-secondary hover:bg-surface-container-low"
            }`}
          >
            {f === "AI" ? "🤖 AI Chat" : "👤 Hỗ trợ"}
          </button>
        ))}
      </div>

      {/* Split panel */}
      <div className="flex flex-1 min-h-0">
        {/* Conversation list */}
        <div className="w-[320px] border-r border-outline-variant flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-outline-variant">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm hội thoại..."
              className="w-full border border-outline-variant bg-surface px-3 py-2 font-body-md text-body-md outline-none focus:border-primary transition-colors"
            />
          </div>

          {loading && data.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant animate-pulse p-4">
              Đang tải...
            </div>
          ) : data.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant p-4">
              Chưa có hội thoại
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/30">
                {data.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectConversation(c)}
                    className={`w-full text-left p-4 hover:bg-surface-container-low transition-colors ${
                      selectedConv?.id === c.id ? "bg-surface-container-low" : ""
                    }`}
                  >
                        <div className="flex items-center gap-3">
                      <div className="w-10 h-10 shrink-0 bg-surface-container-high flex items-center justify-center font-label-caps text-label-caps">
                        {c.userName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-body-md font-bold truncate">{c.userName || `User #${c.userId}`}</span>
                          {c.lastMessageAt && (
                            <span className="text-[10px] text-on-surface-variant shrink-0">{timeLabel(c.lastMessageAt)}</span>
                          )}
                        </div>
                        <p className="font-body-md text-body-md text-on-surface-variant truncate mt-0.5">
                          {c.lastMessage || "—"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {pagination.hasNextPage && (
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full py-3 font-label-caps text-label-caps text-secondary hover:bg-surface-container-low disabled:opacity-50 transition-colors border-t border-outline-variant"
                >
                  {loading ? "Đang tải..." : `Xem thêm (${data.length}/${pagination.totalCount})`}
                </button>
              )}
            </>
          )}
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant">
              Chọn hội thoại để xem tin nhắn
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-container-high flex items-center justify-center font-label-caps text-label-caps">
                  {selectedConv.userName?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                  <p className="font-body-md font-bold">{selectedConv.userName || `User #${selectedConv.userId}`}</p>
                  <span className={`font-label-caps text-[10px] px-1.5 py-0.5 border ${
                    selectedConv.type === "AI" ? "border-blue-500 text-blue-600" : "border-green-500 text-green-600"
                  }`}>
                    {selectedConv.type === "AI" ? "AI" : "Hỗ trợ"}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface-container-low/30">
                {messagesLoading ? (
                  <div className="text-center text-on-surface-variant animate-pulse py-8">Đang tải...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-on-surface-variant py-8">Chưa có tin nhắn</div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id}>
                      <div className={`flex ${msg.sender === "Admin" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] px-4 py-3 ${
                          msg.sender === "Admin"
                            ? "bg-primary text-on-primary rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-lg"
                            : msg.sender === "AI"
                            ? "bg-surface-container-high border-l-2 border-secondary text-on-surface rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-lg"
                            : "bg-surface-container-lowest border-l-2 border-secondary text-on-surface rounded-tl-sm rounded-tr-lg rounded-br-lg rounded-bl-lg"
                        }`}>
                          {msg.messageText && <p className="font-body-md text-body-md">{msg.messageText}</p>}
                          {msg.imageUrls?.map((url, i) => (
                            <img key={i} src={url} alt="" className="mt-2 max-w-full max-h-48 object-cover" />
                          ))}
                          {msg.sender === "AI" && <ProductSuggestions suggestions={msg.productSuggestions ?? []} />}
                          <p className={`text-[11px] mt-1 ${
                            msg.sender === "Admin" ? "text-on-primary/60"
                            : msg.sender === "AI" ? "text-secondary/60"
                            : "text-on-surface-variant"
                          }`}>
                            {new Date(msg.createdAt).toLocaleString("vi-VN")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-6 py-4 border-t border-outline-variant bg-surface">
                <div className="flex gap-3 items-end">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-10 h-10 shrink-0 flex items-center justify-center border border-outline-variant hover:bg-surface-container-low transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">image</span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !selectedConv) return;
                      try {
                        const token = localStorage.getItem("admin_token");
                        const formData = new FormData();
                        formData.append("file", file);
                        const res = await fetch(`${API_BASE}/files/upload`, {
                          method: "POST",
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                          body: formData,
                        });
                        if (!res.ok) throw new Error("Upload failed");
                        const { url } = await res.json();
                        const msg = await conversations.sendMessage(selectedConv.id, "", [url]);
                        setMessages((prev) => [...prev, msg]);
                      } catch { showToast("Upload ảnh thất bại", "error"); }
                    }}
                  />
                  <div className="flex-1 flex gap-3">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Nhập tin nhắn..."
                      className="flex-1 border border-outline-variant bg-surface px-4 py-3 font-body-md text-body-md outline-none focus:border-primary transition-colors"
                    />
                    <button
                      onClick={handleSend}
                      disabled={sending || !replyText.trim()}
                      className="bg-primary text-white font-label-caps text-label-caps px-6 py-3 hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {sending ? "..." : "GỬI"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</div>}>
      <SupportContent />
    </Suspense>
  );
}
