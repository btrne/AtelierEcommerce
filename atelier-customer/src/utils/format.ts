export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "pending": return "text-secondary bg-secondary/10";
    case "confirmed": return "text-on-surface bg-surface-container-low";
    case "processing": return "text-on-surface-variant bg-surface-container";
    case "shipped": return "text-on-surface bg-surface-container-high";
    case "delivered": return "text-on-surface border border-secondary/30";
    case "completed": return "text-on-surface bg-surface-container-high";
    case "cancelled": return "text-error border border-error/30";
    default: return "text-on-surface-variant";
  }
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    processing: "Đang xử lý",
    shipping: "Đang giao",
    shipped: "Đang giao",
    delivered: "Đã giao",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
  };
  return map[status.toLowerCase()] || status;
}

export function getShipmentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Chờ xử lý",
    shipping: "Đang giao",
    shipped: "Đã lấy hàng",
    delivered: "Đã giao",
    cancelled: "Đã hủy",
  };
  return map[status.toLowerCase()] || status;
}
