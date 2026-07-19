"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import StatCard from "@/components/StatCard";
import PieChart from "@/components/PieChart";
import { dashboard, orders, products, collections as collectionsApi } from "@/lib/api";
import type {
  CollectionAdminDto,
  MonthlyStatsDto,
  OrderAdminDto,
  BestSellerDto,
  PeriodRevenueDto,
  PeriodType,
  CategoryRevenueDto,
  CollectionRevenueDto,
  TopCustomerDto,
  OrderStatusCountDto,
  ProductVariantOptionDto,
  TopViewedProductDto,
  SearchKeywordDto,
  TrackingSummaryDto,
  LowConversionProductDto,
  RankedProductDto,
} from "@/lib/types";

const PERIOD_OPTIONS: { label: string; value: PeriodType; periods: number }[] = [
  { label: "NGÀY", value: "Daily", periods: 30 },
  { label: "TUẦN", value: "Weekly", periods: 12 },
  { label: "THÁNG", value: "Monthly", periods: 12 },
  { label: "QUÝ", value: "Quarterly", periods: 8 },
  { label: "NĂM", value: "Yearly", periods: 5 },
];

const BAR_COLORS = [
  "#000000", "#775a19", "#495f84", "#8B7355", "#C4A882",
  "#5C4033", "#6B8E23", "#A0522D", "#CD853F", "#B8860B",
  "#2F4F4F", "#8B4513", "#556B2F", "#9932CC", "#191970",
  "#3CB371", "#D2691E", "#708090", "#9ACD32", "#B22222",
];

const STATUS_COLORS: Record<string, string> = {
  Pending: "#775a19",
  Confirmed: "#495f84",
  Processing: "#8B7355",
  Shipping: "#5C4033",
  Completed: "#000000",
  Cancelled: "#ba1a1a",
};

const STATUS_LABELS: Record<string, string> = {
  Pending: "Chờ xử lý",
  Confirmed: "Đã xác nhận",
  Processing: "Đang xử lý",
  Shipping: "Đang giao",
  Completed: "Hoàn tất",
  Cancelled: "Đã hủy",
};

type BottomTab = "products" | "collections" | "customers";

export default function Dashboard() {
  const router = useRouter();
  const [monthlyStatsData, setMonthlyStatsData] = useState<MonthlyStatsDto | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderAdminDto[]>([]);
  const [bestSellers, setBestSellers] = useState<BestSellerDto[]>([]);
  const [periodData, setPeriodData] = useState<PeriodRevenueDto[]>([]);
  const [categoryRevenue, setCategoryRevenue] = useState<CategoryRevenueDto[]>([]);
  const [collectionRevenue, setCollectionRevenue] = useState<CollectionRevenueDto[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomerDto[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatusCountDto[]>([]);
  const [lowStockItems, setLowStockItems] = useState<ProductVariantOptionDto[]>([]);
  const [collectionBannerMap, setCollectionBannerMap] = useState<Record<number, string>>({});
  const [topViewed, setTopViewed] = useState<TopViewedProductDto[]>([]);
  const [searchKeywords, setSearchKeywords] = useState<SearchKeywordDto[]>([]);
  const [trackingSummary, setTrackingSummary] = useState<TrackingSummaryDto | null>(null);
  const [lowConversion, setLowConversion] = useState<LowConversionProductDto[]>([]);
  const [topAddToCart, setTopAddToCart] = useState<RankedProductDto[]>([]);
  const [topWishlist, setTopWishlist] = useState<RankedProductDto[]>([]);
  const [topSearched, setTopSearched] = useState<RankedProductDto[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("Daily");
  const [bottomTab, setBottomTab] = useState<BottomTab>("products");
  const [analyticsTab, setAnalyticsTab] = useState<string>("addToCart");
  const [viewedDays, setViewedDays] = useState(7);
  const [analyticsDays, setAnalyticsDays] = useState(7);
  const [loading, setLoading] = useState(true);

  const fetchPeriodData = useCallback(async (period: PeriodType) => {
    try {
      const opt = PERIOD_OPTIONS.find((o) => o.value === period);
      const data = await dashboard.revenueByPeriod(period, opt?.periods ?? 12);
      setPeriodData(data);
    } catch (err) {
      console.error("Period fetch error:", err);
    }
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          ordersData, bestSellersData, monthlyData,
          catRev, colRev, customers, orderStat,
          variantsData, collectionsData,
        ] = await Promise.all([
          orders.admin({ page: 1, pageSize: 3 }),
          dashboard.bestSellers(5),
          dashboard.monthlyStats(),
          dashboard.revenueByCategory(),
          dashboard.revenueByCollection(),
          dashboard.topCustomers(5),
          dashboard.orderStatus(),
          products.variants(),
          collectionsApi.admin(),
        ]);
        setMonthlyStatsData(monthlyData);
        setRecentOrders(ordersData.items);
        setBestSellers(bestSellersData);
        setCategoryRevenue(catRev);
        setCollectionRevenue(colRev);
        setTopCustomers(customers);
        setOrderStatus(orderStat);
        const lowStock = variantsData.filter((v) => v.quantity < 20);
        setLowStockItems(lowStock);
        const bannerMap: Record<number, string> = {};
        (collectionsData as CollectionAdminDto[]).forEach((c) => {
          if (c.bannerImageUrl) bannerMap[c.id] = c.bannerImageUrl;
        });
        setCollectionBannerMap(bannerMap);
        const [topViewedData, searchKwData, trackingSumData, lowConvData, addToCartData, wishlistData, searchedData] = await Promise.all([
          dashboard.topViewed(7, 5),
          dashboard.searchKeywords(7, 5),
          dashboard.trackingSummary(7),
          dashboard.lowConversion(5),
          dashboard.topAddToCart(analyticsDays, 5),
          dashboard.topWishlist(analyticsDays, 5),
          dashboard.topSearched(analyticsDays, 5),
        ]);
        setTopViewed(topViewedData);
        setSearchKeywords(searchKwData);
        setTrackingSummary(trackingSumData);
        setLowConversion(lowConvData);
        setTopAddToCart(addToCartData);
        setTopWishlist(wishlistData);
        setTopSearched(searchedData);
        await fetchPeriodData("Daily");
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [fetchPeriodData]);

  const handlePeriodChange = async (period: PeriodType) => {
    setSelectedPeriod(period);
    setLoading(true);
    await fetchPeriodData(period);
    setLoading(false);
  };

  const handleViewedDaysChange = async (days: number) => {
    setViewedDays(days);
    try {
      const [viewed, keywords] = await Promise.all([
        dashboard.topViewed(days, 5),
        dashboard.searchKeywords(days, 5),
      ]);
      setTopViewed(viewed);
      setSearchKeywords(keywords);
    } catch (err) {
      console.error("Viewed data fetch error:", err);
    }
  };

  const handleAnalyticsDaysChange = async (days: number) => {
    setAnalyticsDays(days);
    try {
      const [addToCart, wishlist, searched] = await Promise.all([
        dashboard.topAddToCart(days, 5),
        dashboard.topWishlist(days, 5),
        dashboard.topSearched(days, 5),
      ]);
      setTopAddToCart(addToCart);
      setTopWishlist(wishlist);
      setTopSearched(searched);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatCompact = (amount: number) => {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} tr`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
    return String(amount);
  };

  const formatTrend = (current: number, previous: number) => {
    if (!previous) return current > 0 ? { direction: "up" as const, value: "+100%" } : undefined;
    const pct = ((current - previous) / previous) * 100;
    return {
      direction: (pct >= 0 ? "up" : "down") as "up" | "down",
      value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
    };
  };

  const revenueTrend = useMemo(
    () => formatTrend(monthlyStatsData?.revenue ?? 0, monthlyStatsData?.prevRevenue ?? 0),
    [monthlyStatsData]
  );
  const ordersTrend = useMemo(
    () => formatTrend(monthlyStatsData?.totalOrders ?? 0, monthlyStatsData?.prevTotalOrders ?? 0),
    [monthlyStatsData]
  );
  const customerTrendValue = useMemo(
    () => formatTrend(monthlyStatsData?.newCustomers ?? 0, monthlyStatsData?.prevNewCustomers ?? 0),
    [monthlyStatsData]
  );

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      Pending: "MỚI",
      Confirmed: "ĐÃ XÁC NHẬN",
      Processing: "ĐANG XỬ LÝ",
      Shipping: "ĐANG GIAO",
      Completed: "HOÀN TẤT",
      Cancelled: "ĐÃ HUỶ",
    };
    return map[status] || status;
  };

  const statusClass = (status: string) => {
    const map: Record<string, string> = {
      Pending: "bg-primary text-white",
      Confirmed: "bg-secondary text-white",
      Processing: "bg-tertiary text-white",
      Shipping: "bg-secondary-container text-on-secondary-container",
      Completed: "bg-surface-container-high text-on-surface",
      Cancelled: "bg-error text-white",
    };
    return map[status] || "bg-surface-container-high text-on-surface-variant";
  };

  const maxRevenue = periodData.length
    ? Math.max(...periodData.map((d) => d.totalRevenue), 1)
    : 1;

  const categoryPieData = useMemo(
    () =>
      categoryRevenue.map((c) => ({
        label: c.categoryName,
        value: c.totalRevenue,
        color: BAR_COLORS[c.categoryId % BAR_COLORS.length],
      })),
    [categoryRevenue]
  );

  const statusPieData = useMemo(
    () =>
      orderStatus.map((s) => ({
        label: STATUS_LABELS[s.status] || s.status,
        value: s.count,
        color: STATUS_COLORS[s.status] || "#74777f",
      })),
    [orderStatus]
  );

  if (loading && !monthlyStatsData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse font-body-md text-body-md text-on-surface-variant">
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  const tabContent = () => {
    switch (bottomTab) {
      case "products":
        return (
          <div className="space-y-3">
            {bestSellers.map((item, i) => (
              <div
                key={item.productVariantId + "-" + i}
                className="flex items-center gap-4 p-4 border border-outline-variant bg-surface hover:bg-surface-container-low transition-colors"
              >
                <span className="font-label-caps text-[14px] text-secondary w-6 text-center">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="w-12 h-12 bg-surface-container-high border border-outline-variant flex-shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined flex items-center justify-center h-full text-on-surface-variant/30">
                      image
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-md font-bold text-primary truncate">
                    {item.productName}
                  </p>
                  <p className="font-body-md text-[12px] text-on-surface-variant truncate">
                    {item.variantName}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-body-md font-bold text-secondary">
                    {formatCompact(item.totalRevenue)}
                  </p>
                  <p className="font-body-md text-[11px] text-on-surface-variant">
                    {item.totalQuantity} đã bán
                  </p>
                </div>
              </div>
            ))}
            {bestSellers.length === 0 && (
              <p className="font-body-md text-on-surface-variant italic py-8 text-center">
                Chưa có dữ liệu
              </p>
            )}
          </div>
        );
      case "collections":
        return (
          <div className="space-y-3">
            {collectionRevenue.map((col, i) => {
              const bannerUrl = collectionBannerMap[col.collectionId];
              return (
                <div
                  key={col.collectionId + "-" + i}
                  className="flex items-center gap-4 p-4 border border-outline-variant bg-surface hover:bg-surface-container-low transition-colors"
                >
                  <div className="w-12 h-12 bg-surface-container-high border border-outline-variant flex-shrink-0 overflow-hidden">
                    {bannerUrl ? (
                      <img
                        src={bannerUrl}
                        alt={col.collectionName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center font-label-caps text-label-caps text-white"
                        style={{ backgroundColor: BAR_COLORS[(col.collectionId + 5) % BAR_COLORS.length] }}
                      >
                        {col.collectionName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md font-bold text-primary truncate">
                      {col.collectionName}
                    </p>
                    <p className="font-body-md text-[12px] text-on-surface-variant">
                      {col.productCount} sản phẩm
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-body-md font-bold text-secondary">
                      {formatCompact(col.totalRevenue)}
                    </p>
                    <p className="font-body-md text-[11px] text-on-surface-variant">
                      {col.orderCount} đơn hàng
                    </p>
                  </div>
                </div>
              );
            })}
            {collectionRevenue.length === 0 && (
              <p className="font-body-md text-on-surface-variant italic py-8 text-center">
                Chưa có dữ liệu
              </p>
            )}
          </div>
        );
      case "customers":
        return (
          <div className="space-y-3">
            {topCustomers.map((c, i) => (
              <div
                key={c.userId + "-" + i}
                className="flex items-center gap-4 p-4 border border-outline-variant bg-surface hover:bg-surface-container-low transition-colors"
              >
                <span className="font-label-caps text-[14px] text-secondary w-6 text-center">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="w-12 h-12 bg-primary flex items-center justify-center font-label-caps text-label-caps text-white flex-shrink-0">
                  {c.fullName?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-md font-bold text-primary truncate">
                    {c.fullName}
                  </p>
                  <p className="font-body-md text-[12px] text-on-surface-variant truncate">
                    {c.email}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-body-md font-bold text-secondary">
                    {formatCompact(c.totalSpent)}
                  </p>
                  <p className="font-body-md text-[11px] text-on-surface-variant">
                    {c.orderCount} đơn hàng
                  </p>
                </div>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <p className="font-body-md text-on-surface-variant italic py-8 text-center">
                Chưa có dữ liệu
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="DOANH THU THEO THÁNG"
          value={formatCurrency(monthlyStatsData?.revenue ?? 0)}
          icon="payments"
          trend={revenueTrend}
        />
        <StatCard
          title="TỔNG ĐƠN HÀNG TRONG THÁNG"
          value={String(monthlyStatsData?.totalOrders ?? 0)}
          icon="shopping_cart"
          trend={ordersTrend}
        />
        <StatCard
          title="TỔNG KHÁCH HÀNG TRONG THÁNG"
          value={String(monthlyStatsData?.newCustomers ?? 0)}
          icon="person_add"
          trend={customerTrendValue}
        />
        <StatCard
          title="TỈ LỆ CHUYỂN ĐỔI"
          value={trackingSummary ? `${trackingSummary.conversionRate}%` : "—"}
          icon="trending_up"
          trend={trackingSummary
            ? {
                direction: trackingSummary.conversionRate >= 2 ? ("up" as const) : ("down" as const),
                value: `${trackingSummary.conversionRate.toFixed(1)}%`,
              }
            : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-end">
            <h3 className="font-label-caps text-label-caps text-primary border-b-2 border-secondary pb-2">
              BIỂU ĐỒ DOANH THU
            </h3>
            <div className="flex space-x-4">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handlePeriodChange(opt.value)}
                  className={`font-label-caps text-[10px] transition-colors ${
                    selectedPeriod === opt.value
                      ? "text-primary border-b border-primary"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full border border-outline-variant bg-white p-6">
            {periodData.length > 0 ? (
              <div className="flex flex-col" style={{ height: 340 }}>
                <div className="flex items-end gap-1.5" style={{ height: 290 }}>
                  {periodData.map((d, i) => (
                    <div
                      key={"bar-" + i}
                      className="flex-1 flex flex-col items-center justify-end relative group"
                      style={{ height: "100%" }}
                    >
                      <div
                        className="w-full transition-all duration-300 hover:opacity-80"
                        style={{
                          height: `${Math.max((d.totalRevenue / maxRevenue) * 100, 2)}%`,
                          backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                        }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-surface-container-high text-on-surface font-body-md text-[11px] px-2 py-1 whitespace-nowrap z-10 border border-outline-variant shadow-sm">
                          {formatCurrency(d.totalRevenue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5" style={{ height: 50 }}>
                  {periodData.map((d, i) => {
                    const skipLabel = periodData.length > 20 && i % 3 !== 0;
                    return (
                      <div key={"label-" + i} className="flex-1 text-center overflow-hidden pt-1">
                        {!skipLabel && (
                          <span className="text-[9px] text-on-surface-variant block leading-tight">
                            {d.label.length > 7 ? d.label.slice(0, 6) + "…" : d.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center" style={{ height: 340 }}>
                <p className="font-body-md text-on-surface-variant italic">
                  Chưa có dữ liệu doanh thu
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <h3 className="font-label-caps text-label-caps text-primary border-b-2 border-secondary pb-2">
            ĐƠN HÀNG MỚI NHẤT
          </h3>
          <div className="space-y-4">
            {recentOrders.map((order, i) => (
              <div
                key={order.id + "-" + i}
                className="p-5 border border-outline-variant bg-surface hover:bg-surface-container-low transition-colors group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="font-label-caps text-[10px] text-on-surface-variant">
                    {order.orderCode}
                  </span>
                  <span
                    className={`font-label-caps text-[10px] px-2 py-1 ${statusClass(order.orderStatus)}`}
                  >
                    {statusLabel(order.orderStatus)}
                  </span>
                </div>
                <p className="font-body-md font-bold text-primary">
                  {order.shippingContactName}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-body-md text-[13px]">{order.shippingContactName}</span>
                  <span className="font-body-md font-bold text-secondary">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
            <button className="w-full py-4 border border-primary font-label-caps text-[11px] text-primary hover:bg-primary hover:text-white transition-all duration-300">
              XEM TẤT CẢ ĐƠN HÀNG
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-6">
          <h3 className="font-label-caps text-label-caps text-primary border-b-2 border-secondary pb-2">
            DOANH THU THEO DANH MỤC
          </h3>
          <div className="border border-outline-variant bg-white p-6 flex justify-center">
            <PieChart
              data={categoryPieData}
              size={220}
              innerRadius={60}
              formatter={(v) => formatCompact(v)}
            />
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="font-label-caps text-label-caps text-primary border-b-2 border-secondary pb-2">
            TRẠNG THÁI ĐƠN HÀNG
          </h3>
          <div className="border border-outline-variant bg-white p-6 flex justify-center">
            <PieChart
              data={statusPieData}
              size={220}
              innerRadius={60}
              formatter={(v) => String(v) + " đơn"}
            />
          </div>
        </section>
      </div>

      {/* Top Viewed + Search Keywords */}
      {(topViewed.length > 0 || searchKeywords.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {topViewed.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-end justify-between border-b-2 border-secondary pb-2">
                <h3 className="font-label-caps text-label-caps text-primary">
                  SẢN PHẨM XEM NHIỀU
                </h3>
                <div className="flex space-x-3">
                  {[
                    { label: "7 NGÀY", days: 7 },
                    { label: "30 NGÀY", days: 30 },
                    { label: "90 NGÀY", days: 90 },
                    { label: "365 NGÀY", days: 365 },
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      onClick={() => handleViewedDaysChange(opt.days)}
                      className={`font-label-caps text-[10px] transition-colors ${
                        viewedDays === opt.days
                          ? "text-primary border-b border-primary"
                          : "text-on-surface-variant hover:text-primary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {topViewed.map((item, i) => (
                  <div key={item.productId + "-" + i} className="flex items-center gap-3 p-3 border border-outline-variant bg-surface hover:bg-surface-container-low transition-colors">
                    <span className="font-label-caps text-[14px] text-secondary w-6 text-center">{String(i + 1).padStart(2, "0")}</span>
                    <div className="w-10 h-10 bg-surface-container-high border border-outline-variant flex-shrink-0 overflow-hidden">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined flex items-center justify-center h-full text-on-surface-variant/30 text-sm">image</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md font-bold text-primary truncate">{item.productName}</p>
                    </div>
                    <span className="font-body-md font-bold text-secondary">{item.views}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {searchKeywords.length > 0 && (
            <section className="space-y-4">
              <h3 className="font-label-caps text-label-caps text-primary border-b-2 border-secondary pb-2">
                TỪ KHÓA TÌM KIẾM ({viewedDays} NGÀY)
              </h3>
              <div className="space-y-2">
                {searchKeywords.map((item, i) => (
                  <div key={item.keyword} className="flex items-center gap-3 p-3 border border-outline-variant bg-surface hover:bg-surface-container-low transition-colors">
                    <span className="font-label-caps text-[14px] text-secondary w-6 text-center">{String(i + 1).padStart(2, "0")}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md font-bold text-primary truncate">&ldquo;{item.keyword}&rdquo;</p>
                    </div>
                    <span className="font-body-md font-bold text-secondary">{item.count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Product Analytics Section */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b-2 border-secondary pb-2">
          <h3 className="font-label-caps text-label-caps text-primary">
            PHÂN TÍCH SẢN PHẨM
          </h3>
          <div className="flex space-x-3">
            {[
              { label: "7 NGÀY", days: 7 },
              { label: "30 NGÀY", days: 30 },
              { label: "90 NGÀY", days: 90 },
              { label: "365 NGÀY", days: 365 },
            ].map((opt) => (
              <button
                key={opt.days}
                onClick={() => handleAnalyticsDaysChange(opt.days)}
                className={`font-label-caps text-[10px] transition-colors ${
                  analyticsDays === opt.days
                    ? "text-primary border-b border-primary"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex space-x-8 border-b border-outline-variant/30">
          {([
            { key: "addToCart", label: "THÊM GIỎ" },
            { key: "wishlist", label: "YÊU THÍCH" },
            { key: "searched", label: "TÌM KIẾM" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAnalyticsTab(tab.key)}
              className={`font-label-caps text-label-caps pb-3 transition-colors ${
                analyticsTab === tab.key
                  ? "text-primary border-b-2 border-secondary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant -mt-2">
          {analyticsTab === "addToCart"
            ? "Sản phẩm được thêm vào giỏ hàng nhiều nhất"
            : analyticsTab === "wishlist"
            ? "Sản phẩm được yêu thích nhiều nhất"
            : "Sản phẩm được tìm kiếm nhiều nhất"}
        </p>
        <div className="space-y-2">
          {(analyticsTab === "addToCart" ? topAddToCart : analyticsTab === "wishlist" ? topWishlist : topSearched).map((item, i) => (
            <div key={item.productId + "-" + i} className="flex items-center gap-3 p-3 border border-outline-variant bg-surface hover:bg-surface-container-low transition-colors">
              <span className="font-label-caps text-[14px] text-secondary w-6 text-center">{String(i + 1).padStart(2, "0")}</span>
              <div className="w-10 h-10 bg-surface-container-high border border-outline-variant flex-shrink-0 overflow-hidden">
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined flex items-center justify-center h-full text-on-surface-variant/30 text-sm">image</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body-md font-bold text-primary truncate">{item.productName}</p>
              </div>
              <span className="font-body-md font-bold text-secondary">{item.count}</span>
            </div>
          ))}
          {((analyticsTab === "addToCart" ? topAddToCart : analyticsTab === "wishlist" ? topWishlist : topSearched).length === 0) && (
            <p className="font-body-md text-on-surface-variant italic py-8 text-center">
              Chưa có dữ liệu
            </p>
          )}
        </div>
      </section>

      {/* Low Conversion Products */}
      {lowConversion.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-label-caps text-label-caps text-error border-b-2 border-error pb-2">
            SẢN PHẨM CẦN CẢI THIỆN (xem nhiều - mua ít)
          </h3>
          <div className="overflow-x-auto border border-outline-variant">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-container-high">
                  <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center w-1/3">SẢN PHẨM</th>
                  <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center w-1/5">LƯỢT XEM</th>
                  <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center w-1/5">THÊM GIỎ</th>
                  <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center w-1/5">CVR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {lowConversion.map((item, i) => (
                  <tr key={item.productId + "-" + i} className="table-row-hover transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0">
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-on-surface-variant/30 text-sm">inventory_2</span>
                          )}
                        </div>
                        <span className="font-body-md font-bold text-primary">{item.productName}</span>
                      </div>
                    </td>
                    <td className="p-3 font-body-md text-body-md text-center">{item.views}</td>
                    <td className="p-3 font-body-md text-body-md text-center">{item.cartAdds}</td>
                    <td className="p-3 text-center">
                      <span className={`font-body-md font-bold ${item.conversionRate < 5 ? "text-error" : "text-secondary"}`}>
                        {item.conversionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="space-y-6">
        <div className="flex space-x-8 border-b border-outline-variant/30">
          {([
            { key: "products" as BottomTab, label: "SẢN PHẨM BÁN CHẠY" },
            { key: "collections" as BottomTab, label: "BỘ SƯU TẬP BÁN CHẠY" },
            { key: "customers" as BottomTab, label: "KHÁCH HÀNG CÓ CHI TIÊU CAO" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setBottomTab(tab.key)}
              className={`font-label-caps text-label-caps pb-3 transition-colors ${
                bottomTab === tab.key
                  ? "text-primary border-b-2 border-secondary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {tabContent()}
      </section>

      {lowStockItems.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-label-caps text-label-caps text-primary border-b-2 border-secondary pb-2">
            DANH SÁCH TỒN KHO THẤP
          </h3>
          <div className="overflow-x-auto border border-outline-variant">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-container-high">
                  <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center w-1/4">SẢN PHẨM</th>
                  <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center w-1/4">SKU</th>
                  <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center w-1/4">PHÂN LOẠI</th>
                  <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center w-1/4">TỒN KHO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {lowStockItems.map((item, i) => (
                  <tr
                    key={item.id + "-" + i}
                    onClick={() => router.push(`/inventory?variantId=${item.id}`)}
                    className="table-row-hover transition-colors cursor-pointer"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0">
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-on-surface-variant/30 text-sm">inventory_2</span>
                          )}
                        </div>
                        <span className="font-body-md text-center">{item.productName}</span>
                      </div>
                    </td>
                    <td className="p-3 font-body-md text-body-md text-on-surface-variant text-center">{item.sku}</td>
                    <td className="p-3 font-body-md text-body-md text-on-surface-variant text-center">{item.attributeSummary || "—"}</td>
                    <td className="p-3 text-center">
                      <span className={`font-body-md ${item.quantity <= 5 ? "text-error" : "text-secondary"}`}>
                        {item.quantity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
