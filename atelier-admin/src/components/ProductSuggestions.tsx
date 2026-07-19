import type { AiProductSuggestion } from "@/lib/types";

const CUSTOMER_BASE = process.env.NEXT_PUBLIC_CUSTOMER_URL || "http://localhost:3001";

export default function ProductSuggestions({ suggestions }: { suggestions: AiProductSuggestion[] }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="font-label-caps text-label-caps text-secondary/70">Sản phẩm gợi ý</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((p) => (
          <a
            key={p.id}
            href={`${CUSTOMER_BASE}/products/${p.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2 border border-outline-variant rounded hover:bg-surface-container-low transition-colors min-w-0 max-w-[260px]"
          >
            {p.imageUrl && (
              <img src={p.imageUrl} alt="" className="w-12 h-12 object-cover shrink-0 rounded" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-body-md text-body-md font-medium truncate">{p.name}</p>
              <p className="font-label-caps text-label-caps text-secondary">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", minimumFractionDigits: 0 }).format(p.price)}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
