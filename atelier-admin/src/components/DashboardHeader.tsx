"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/api";
import { useNotifications } from "@/hooks/useNotifications";

export default function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<{
    fullName: string;
    email: string;
    roles: string[];
  } | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  useEffect(() => {
    setProfile(auth.getUserProfile());
    const path = pathname;
    if (path === "/") setPageTitle("Bảng Điều Khiển");
    else if (path.startsWith("/products")) setPageTitle("Sản Phẩm");
    else if (path.startsWith("/orders")) setPageTitle("Đơn Hàng");
    else if (path.startsWith("/users")) setPageTitle("Người Dùng");
    else if (path.startsWith("/categories")) setPageTitle("Danh Mục");
    else if (path.startsWith("/collections")) setPageTitle("Bộ Sưu Tập");
    else if (path.startsWith("/vouchers")) setPageTitle("Mã Giảm Giá");
    else if (path.startsWith("/attributes")) setPageTitle("Thuộc Tính");
    else if (path.startsWith("/inventory")) setPageTitle("Tồn Kho");
    else if (path.startsWith("/custom-requests")) setPageTitle("Yêu Cầu Chế Tác");
    else if (path.startsWith("/ratings")) setPageTitle("Đánh Giá");
    else if (path.startsWith("/roles")) setPageTitle("Vai Trò");
    else if (path.startsWith("/support")) setPageTitle("Hỗ Trợ");
    else if (path.startsWith("/payments")) setPageTitle("Thanh Toán");
    else if (path.startsWith("/shipping")) setPageTitle("Vận Chuyển");
  }, [pathname]);

  // Close bell dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    auth.logout();
    router.push("/login");
  };

  const initials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AD";

  const handleBellClick = () => {
    setBellOpen((v) => !v);
  };

  const handleNotificationClick = (n: (typeof notifications)[0]) => {
    markAsRead(n.id);
    setBellOpen(false);
    if (n.referenceType === "Conversation") {
      router.push("/support?convId=" + n.referenceId);
    } else if (n.referenceType === "ConsultingConversation") {
      router.push("/custom-requests");
    } else if (n.referenceType === "CustomRequest") {
      router.push("/custom-requests");
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "NewConversation":
        return "forum";
      case "NewMessage":
        return "chat";
      case "CustomRequestConfirmed":
        return "check_circle";
      case "CustomRequestRejected":
        return "cancel";
      default:
        return "notifications";
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  return (
    <header className="h-[100px] px-8 flex justify-between items-center bg-surface border-b border-outline-variant/30 sticky top-0 z-10">
      <div>
        <h2 className="font-headline-md text-headline-md text-primary">
          {pageTitle}
        </h2>
      </div>
      <div className="flex items-center space-x-8">
        <div ref={bellRef} className="relative">
          <button
            onClick={handleBellClick}
            className="relative p-2 text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">
              notifications
            </span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-error text-on-error text-[10px] w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-surface border border-outline-variant/30 shadow-xl flex flex-col z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
                <span className="font-label-caps text-label-caps text-primary">
                  Thông báo
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-on-surface-variant hover:text-primary transition-colors"
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-on-surface-variant text-sm">
                    Không có thông báo
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isRead = unreadCount === 0
                      ? true
                      : !notifications
                          .slice(0, unreadCount)
                          .some((x) => x.id === n.id);
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 ${
                          !isRead ? "bg-surface-container-low" : ""
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-xl mt-0.5 ${
                            n.type === "CustomRequestConfirmed"
                              ? "text-green-600"
                              : n.type === "CustomRequestRejected"
                                ? "text-red-600"
                                : "text-primary"
                          }`}
                        >
                          {typeIcon(n.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-xs text-on-surface-variant truncate mt-0.5">
                              {n.body}
                            </p>
                          )}
                          <p className="text-[10px] text-outline mt-1">
                            {timeAgo(n.createdAt)}
                          </p>
                        </div>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col text-right">
          <span className="font-label-caps text-label-caps text-primary">
            {profile?.fullName || "ADMIN"}
          </span>
          <span className="font-body-md text-[12px] text-on-surface-variant">
            {profile?.roles?.join(", ") || "Quản trị viên"}
          </span>
        </div>
        <div className="h-12 w-12 bg-primary flex items-center justify-center overflow-hidden">
          <div className="w-full h-full bg-on-surface-variant/30 flex items-center justify-center text-on-primary font-label-caps text-sm">
            {initials}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 text-on-surface-variant hover:text-error transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-label-caps text-[11px]">ĐĂNG XUẤT</span>
        </button>
      </div>
    </header>
  );
}
