"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { customRequests, conversations } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import ProductSuggestions from "@/components/ProductSuggestions";
import type { CustomRequestAdminDto, ConversationDto, MessageDto, PaginatedList } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5097/api";

const CUSTOM_STATUSES = ["Quoted", "Confirmed", "InProgress", "Completed", "Cancelled"];

const statusDot: Record<string, string> = {
  Quoted: "bg-secondary",
  Confirmed: "bg-primary",
  InProgress: "bg-primary",
  Completed: "bg-secondary",
  Cancelled: "bg-error",
};

const statusLabel: Record<string, string> = {
  Quoted: "Chờ xác nhận",
  Confirmed: "Đã xác nhận",
  InProgress: "Đang chế tác",
  Completed: "Hoàn thành",
  Cancelled: "Đã hủy",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", minimumFractionDigits: 0 }).format(amount);

function Timeline({ req }: { req: CustomRequestAdminDto }) {
  const steps = [
    { label: "Báo giá", key: "createdAt" as const, date: req.createdAt, done: true },
    { label: "Khách xác nhận", key: "customerConfirmedAt" as const, date: req.customerConfirmedAt, done: !!req.customerConfirmedAt },
    { label: "Đang chế tác", key: "startedAt" as const, date: req.startedAt, done: !!req.startedAt },
    { label: "Hoàn thành", key: "finishedAt" as const, date: req.finishedAt, done: !!req.finishedAt },
  ];

  const cancelled = req.status === "Cancelled";

  return (
    <div className="flex justify-between items-start gap-1">
      {steps.map((s, i) => (
        <div key={s.key} className="flex-1 relative">
          <div className="flex items-center">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 z-10 ${
              cancelled && i > 1 ? "bg-error text-on-error" : s.done ? "bg-secondary text-white" : "bg-outline-variant text-on-surface-variant"
            }`}>
              {cancelled && i > 1 ? "✕" : s.done ? "✓" : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 ${cancelled && i > 1 ? "bg-error/40" : s.done ? "bg-secondary" : "bg-outline-variant"}`} />
            )}
          </div>
          <p className="text-[10px] mt-1 text-on-surface-variant">{s.label}</p>
          <p className="text-[9px] text-on-surface-variant/60 whitespace-nowrap">
            {s.date ? new Date(s.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

function CreateRequestModal({
  convId,
  convUserName,
  onClose,
  onCreated,
}: {
  convId: number;
  convUserName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) { showToast("Vui lòng nhập mô tả", "error"); return; }
    if (!price) { showToast("Vui lòng nhập giá báo", "error"); return; }
    setSubmitting(true);
    try {
      await conversations.createCustomRequest(
        convId,
        description.trim(),
        Number(price),
        date ? new Date(date).toISOString() : null,
        undefined
      );
      showToast("Tạo yêu cầu chế tác thành công", "success");
      onCreated();
      onClose();
    } catch (err: any) {
      showToast(err.message || "Lỗi", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="TẠO YÊU CẦU CHẾ TÁC"
      onSubmit={handleSubmit}
      submitLabel="Tạo yêu cầu"
      submitting={submitting}
    >
      <div>
        <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">KHÁCH HÀNG</label>
        <p className="font-body-md text-body-md pb-2 border-b border-outline-variant">{convUserName}</p>
      </div>
      <div>
        <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">MÔ TẢ</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary resize-none"
        />
      </div>
      <div>
        <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">GIÁ BÁO (VNĐ)</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">NGÀY HOÀN THÀNH DỰ KIẾN</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
        />
      </div>
    </Modal>
  );
}

function ChatPanel({
  convId,
  convName,
  messages,
  loading,
  onSend,
  onUpload,
  replyText,
  setReplyText,
  sending,
  fileRef,
  msgsEndRef,
  children,
}: {
  convId: number;
  convName: string;
  messages: MessageDto[];
  loading: boolean;
  onSend: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  replyText: string;
  setReplyText: (v: string) => void;
  sending: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  msgsEndRef: React.RefObject<HTMLDivElement | null>;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex items-center gap-3">
        <div className="w-10 h-10 bg-surface-container-high flex items-center justify-center font-label-caps text-label-caps">
          {convName?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body-md font-bold truncate">{convName}</p>
        </div>
        {children}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface-container-low/30">
        {loading ? (
          <div className="text-center text-on-surface-variant animate-pulse py-8">Đang tải...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-on-surface-variant py-8">Chưa có tin nhắn</div>
        ) : (
          <>
            {messages.map((msg) => (
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
                    {msg.sender === "AI" && <ProductSuggestions suggestions={msg.productSuggestions || []} />}
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
            ))}
          </>
        )}
        <div ref={msgsEndRef} />
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
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
          <div className="flex-1 flex gap-3">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              placeholder="Nhập tin nhắn..."
              className="flex-1 border border-outline-variant bg-surface px-4 py-3 font-body-md text-body-md outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={onSend}
              disabled={sending || !replyText.trim()}
              className="bg-primary text-white font-label-caps text-label-caps px-6 py-3 hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {sending ? "..." : "GỬI"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 1: Hội thoại (split panel như support) ────────────────────────

function ConversationsTab() {
  const { showToast } = useToast();
  const [data, setData] = useState<ConversationDto[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalCount: 0, hasNextPage: false });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<ConversationDto | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [createConvId, setCreateConvId] = useState<number | null>(null);
  const [createName, setCreateName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadData = useCallback(async (p: number, s: string) => {
    setLoading(true);
    try {
      const res = await conversations.admin({ type: "Consulting", page: p, pageSize: 20, search: s || undefined }) as PaginatedList<ConversationDto>;
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
    loadData(1, search);
  }, [loadData, search]);

  useEffect(() => { loadFirstPage(); }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadData(1, search);
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    e.target.value = "";
  };

  const loadMore = () => {
    loadData(pagination.page + 1, search);
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

  const openCreateRequest = () => {
    if (!selectedConv) return;
    setCreateConvId(selectedConv.id);
    setCreateName(selectedConv.userName || `User #${selectedConv.userId}`);
  };

  return (
    <div className="flex flex-1 min-h-0">
      {/* Left: conversation list */}
      <div className="w-[320px] border-r border-outline-variant flex flex-col">
        <div className="p-3 border-b border-outline-variant">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm hội thoại..."
            className="w-full border border-outline-variant bg-surface px-3 py-2 font-body-md text-body-md outline-none focus:border-primary transition-colors"
          />
        </div>

        {loading && data.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant animate-pulse p-4">Đang tải...</div>
        ) : data.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant p-4">Chưa có hội thoại</div>
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
                      {c.title && (
                        <p className="font-body-md text-body-md font-medium truncate mt-0.5">{c.title}</p>
                      )}
                      <p className={`font-body-md text-body-md text-on-surface-variant truncate${c.title ? "" : " mt-0.5"}`}>
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

      {/* Right: chat panel */}
      {!selectedConv ? (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant">
          Chọn hội thoại để xem tin nhắn
        </div>
      ) : (
        <ChatPanel
          convId={selectedConv.id}
          convName={selectedConv.userName || `User #${selectedConv.userId}`}
          messages={messages}
          loading={messagesLoading}
          onSend={handleSend}
          onUpload={handleUpload}
          replyText={replyText}
          setReplyText={setReplyText}
          sending={sending}
          fileRef={fileRef}
          msgsEndRef={messagesEndRef}
        >
          <button
            onClick={openCreateRequest}
            className="font-label-caps text-button-text border border-secondary px-4 py-2 text-secondary hover:bg-secondary hover:text-white transition-all"
          >
            TẠO YÊU CẦU
          </button>
        </ChatPanel>
      )}

      {createConvId && (
        <CreateRequestModal
          convId={createConvId}
          convUserName={createName}
          onClose={() => setCreateConvId(null)}
          onCreated={() => { setSelectedConv(null); loadFirstPage(); }}
        />
      )}
    </div>
  );
}

// ─── Tab 2: Yêu cầu chế tác (bảng) ──────────────────────────────────

function RequestsTab() {
  const { showToast } = useToast();
  const [data, setData] = useState<CustomRequestAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [chatConv, setChatConv] = useState<CustomRequestAdminDto | null>(null);
  const [chatMsgs, setChatMsgs] = useState<MessageDto[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const msgsEndRef = useRef<HTMLDivElement>(null);

  const fetchRequests = useCallback(() => {
    setLoading(true);
    customRequests
      .admin({ page, pageSize: 15, status: statusFilter || undefined })
      .then((res) => { setData(res.items); setTotalPages(res.totalPages); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  const openChat = async (req: CustomRequestAdminDto) => {
    setChatConv(req);
    setChatMsgs([]);
    if (!req.conversationId) return;
    setChatLoading(true);
    try {
      const msgs = await conversations.messages(req.conversationId);
      setChatMsgs(Array.isArray(msgs) ? msgs : []);
    } catch (err: any) {
      showToast(err.message || "Lỗi tải tin nhắn", "error");
    } finally {
      setChatLoading(false);
    }
  };

  const handleSend = async () => {
    if (!chatConv?.conversationId || !replyText.trim()) return;
    setSending(true);
    try {
      const msg = await conversations.sendMessage(chatConv.conversationId, replyText.trim());
      setChatMsgs((prev) => [...prev, msg]);
      setReplyText("");
    } catch (err: any) {
      showToast(err.message || "Lỗi gửi tin nhắn", "error");
    } finally {
      setSending(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatConv?.conversationId) return;
    try {
      const token = localStorage.getItem("admin_token");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/files/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      const msg = await conversations.sendMessage(chatConv.conversationId, "", [url]);
      setChatMsgs((prev) => [...prev, msg]);
    } catch { showToast("Upload ảnh thất bại", "error"); }
    e.target.value = "";
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="p-4 border-b border-outline-variant">
        <div className="flex gap-2 flex-wrap">
          {["", ...CUSTOM_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); setChatConv(null); }}
              className={`font-label-caps text-button-text px-3 py-1.5 border transition-all ${
                statusFilter === s
                  ? "bg-primary text-white border-primary"
                  : "border-outline-variant text-on-surface-variant hover:border-primary"
              }`}
            >
              {s ? statusLabel[s] || s : "TẤT CẢ"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container-high sticky top-0">
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">MÃ</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">KHÁCH HÀNG</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">MÔ TẢ</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">GIÁ BÁO</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">NGÀY HK</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">TRẠNG THÁI</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">CHAT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-on-surface-variant">Không có yêu cầu</td>
              </tr>
            ) : (
              data.map((req) => (
                <tr key={req.id} className="transition-colors hover:bg-surface-container-lowest">
                  <td className="p-3 font-body-md font-bold">#{req.id}</td>
                  <td className="p-3">
                    <span className="font-body-md">{req.userName || `User #${req.userId}`}</span>
                  </td>
                  <td className="p-3 font-body-md text-body-md text-on-surface-variant max-w-[200px] truncate">
                    {req.description || "—"}
                  </td>
                  <td className="p-3 font-body-md font-bold text-secondary">
                    {req.quotedPrice ? formatCurrency(req.quotedPrice) : "—"}
                  </td>
                  <td className="p-3 font-body-md text-on-surface-variant">
                    {req.estimatedFinishDate ? new Date(req.estimatedFinishDate).toLocaleDateString("vi-VN") : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${statusDot[req.status] || "bg-outline-variant"}`} />
                      <span className="font-body-md text-body-md">{statusLabel[req.status] || req.status}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => openChat(req)}
                      className="text-on-surface-variant hover:text-secondary transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chat</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 p-4 border-t border-outline-variant">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 font-label-caps text-label-caps border ${
                page === p
                  ? "bg-primary text-white border-primary"
                  : "border-outline-variant text-on-surface-variant hover:border-primary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {chatConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6" onClick={() => setChatConv(null)}>
          <div
            className="w-full max-w-2xl h-[80vh] bg-surface flex flex-col border border-outline-variant"
            onClick={(e) => e.stopPropagation()}
          >
            {!chatConv.conversationId ? (
              <div className="flex-1 flex items-center justify-center text-on-surface-variant p-6">
                Yêu cầu này chưa có hội thoại
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-container-high flex items-center justify-center font-label-caps text-label-caps">
                    {chatConv.userName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md font-bold truncate">{chatConv.userName || `User #${chatConv.userId}`}</p>
                    <p className="font-label-caps text-[10px] text-on-surface-variant">Yêu cầu #{chatConv.id}</p>
                  </div>
                  <button onClick={() => setChatConv(null)} className="text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {chatConv.conversationId && (
                  <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-lowest/60">
                    <Timeline req={chatConv} />
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface-container-low/30">
                  {chatLoading ? (
                    <div className="text-center text-on-surface-variant animate-pulse py-8">Đang tải...</div>
                  ) : chatMsgs.length === 0 ? (
                    <div className="text-center text-on-surface-variant py-8">Chưa có tin nhắn</div>
                  ) : (
                    <>
                      {chatMsgs.map((msg) => (
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
                              {msg.sender === "AI" && <ProductSuggestions suggestions={msg.productSuggestions || []} />}
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
                      ))}
                    </>
                  )}
                  <div ref={msgsEndRef} />
                </div>

                <div className="px-6 py-4 border-t border-outline-variant bg-surface">
                  <div className="flex gap-3 items-end">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-10 h-10 shrink-0 flex items-center justify-center border border-outline-variant hover:bg-surface-container-low transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">image</span>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
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
      )}
    </div>
  );
}

const TABS = [
  { key: "conversations", label: "Hội thoại" },
  { key: "requests", label: "Yêu cầu chế tác" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function CustomRequestsPage() {
  const [tab, setTab] = useState<Tab>("conversations");

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] border border-outline-variant bg-surface">
      <div className="flex border-b border-outline-variant">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-4 font-label-caps text-label-caps tracking-wider transition-colors ${
              tab === t.key
                ? "text-primary border-b-2 border-primary bg-surface-container-low"
                : "text-on-surface-variant hover:text-secondary hover:bg-surface-container-low"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "conversations" ? <ConversationsTab /> : <RequestsTab />}
    </div>
  );
}
