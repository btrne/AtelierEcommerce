interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  trend?: {
    direction: "up" | "down";
    value: string;
  };
  alert?: {
    text: string;
  };
  error?: boolean;
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  alert,
  error,
}: StatCardProps) {
  return (
    <div
      className={`bg-surface-container-low p-8 border relative overflow-hidden group ${
        error ? "border-error/20" : "border-outline-variant/50"
      }`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <span className="material-symbols-outlined text-[48px]">
          {icon}
        </span>
      </div>
      <p
        className={`font-label-caps text-label-caps mb-4 ${
          error ? "text-error" : "text-secondary"
        }`}
      >
        {title}
      </p>
      <p
        className={`font-headline-md ${
          error ? "text-error" : "text-primary"
        }`}
      >
        {value}
      </p>
      {trend && (
        <p className="font-body-md text-[12px] text-on-surface-variant mt-2 flex items-center">
          <span
            className={`material-symbols-outlined text-[16px] mr-1 ${
              trend.direction === "up" ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend.direction === "up" ? "trending_up" : "trending_down"}
          </span>
          <span
            className={`font-bold ${
              trend.direction === "up" ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend.value}
          </span>
          <span className="text-on-surface-variant ml-1">so với tháng trước</span>
        </p>
      )}
      {alert && (
        <p className="font-body-md text-[12px] text-secondary mt-2 font-bold italic underline">
          {alert.text}
        </p>
      )}
    </div>
  );
}
