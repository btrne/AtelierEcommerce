"use client";

import { useEffect, useState } from "react";
import { categories, collections } from "@/lib/api";
import { useToast } from "@/components/Toast";
import type { CategoryAdminDto, CollectionAdminDto } from "@/lib/types";

export interface ProductFormData {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  story: string;
  categoryId: number;
  isFeatured: boolean;
  isPreorder: boolean;
  isActive: boolean;
  collectionIds: number[];
}

interface Props {
  initialData?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => Promise<void>;
  loading?: boolean;
  submitLabel?: string;
  formRef?: React.RefObject<HTMLFormElement | null>;
  hideSubmitButton?: boolean;
}

const inputStyle = "w-full bg-transparent font-body-md text-body-md pb-1.5 pt-1 border-0 border-b border-outline-variant outline-none focus:border-primary transition-colors";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-outline-variant"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </button>
      <span className="font-label-caps text-button-text text-on-surface-variant group-hover:text-on-surface transition-colors">{label}</span>
    </label>
  );
}

export default function ProductForm({ initialData, onSubmit, loading, submitLabel = "LƯU", formRef, hideSubmitButton }: Props) {
  const { showToast } = useToast();
  const [catList, setCatList] = useState<CategoryAdminDto[]>([]);
  const [colList, setColList] = useState<CollectionAdminDto[]>([]);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [form, setForm] = useState<ProductFormData>({
    name: initialData?.name || "",
    slug: initialData?.slug || "",
    shortDescription: initialData?.shortDescription || "",
    description: initialData?.description || "",
    story: initialData?.story || "",
    categoryId: initialData?.categoryId || 0,
    isFeatured: initialData?.isFeatured ?? false,
    isPreorder: initialData?.isPreorder ?? false,
    isActive: initialData?.isActive ?? true,
    collectionIds: initialData?.collectionIds || [],
  });

  useEffect(() => {
    categories.admin().then(setCatList).catch(() => {});
    collections.admin().then(setColList).catch(() => {});
  }, []);

  const autoSlug = (name: string) => name.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  useEffect(() => {
    if (!slugManuallyEdited && form.name) {
      setForm((prev) => ({ ...prev, slug: autoSlug(prev.name) }));
    }
  }, [form.name, slugManuallyEdited]);

  const handleChange = (field: keyof ProductFormData, value: unknown) => {
    if (field === "slug") setSlugManuallyEdited(true);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCollection = (id: number) => {
    setForm((prev) => ({
      ...prev,
      collectionIds: prev.collectionIds.includes(id)
        ? prev.collectionIds.filter((c) => c !== id)
        : [...prev.collectionIds, id],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast("Tên sản phẩm là bắt buộc");
    if (!form.categoryId) return showToast("Danh mục là bắt buộc");
    onSubmit(form);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">

      {/* Thông tin cơ bản */}
      <section className="bg-white border border-outline-variant">
        <div className="border-b border-outline-variant px-5 py-3">
          <h4 className="font-label-caps text-button-text text-primary tracking-wider">THÔNG TIN CƠ BẢN</h4>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="block font-label-caps text-button-text text-on-surface-variant mb-0.5 tracking-wider">
              TÊN SẢN PHẨM <span className="text-error">*</span>
            </label>
            <input
              type="text" value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Nhập tên sản phẩm"
              className={inputStyle}
            />
          </div>
          <div>
            <label className="block font-label-caps text-button-text text-on-surface-variant mb-0.5 tracking-wider">SLUG</label>
            <input
              type="text" value={form.slug}
              onChange={(e) => handleChange("slug", e.target.value)}
              placeholder="atelier-classic-tote"
              className={inputStyle}
            />
          </div>
          <div>
            <label className="block font-label-caps text-button-text text-on-surface-variant mb-0.5 tracking-wider">
              DANH MỤC <span className="text-error">*</span>
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => handleChange("categoryId", Number(e.target.value))}
              className={inputStyle + " appearance-none"}
            >
              <option value={0}>— Chọn danh mục —</option>
              {catList.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Mô tả */}
      <section className="bg-white border border-outline-variant">
        <div className="border-b border-outline-variant px-5 py-3">
          <h4 className="font-label-caps text-button-text text-primary tracking-wider">MÔ TẢ</h4>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="block font-label-caps text-button-text text-on-surface-variant mb-0.5 tracking-wider">MÔ TẢ NGẮN</label>
            <input
              type="text" value={form.shortDescription}
              onChange={(e) => handleChange("shortDescription", e.target.value)}
              placeholder="Mô tả ngắn cho sản phẩm"
              className={inputStyle}
            />
          </div>
          <div>
            <label className="block font-label-caps text-button-text text-on-surface-variant mb-0.5 tracking-wider">MÔ TẢ CHI TIẾT</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              className={inputStyle + " resize-y min-h-[80px]"}
              placeholder="Mô tả chi tiết sản phẩm..."
            />
          </div>
          <div>
            <label className="block font-label-caps text-button-text text-on-surface-variant mb-0.5 tracking-wider">STORY (CÂU CHUYỆN SẢN PHẨM)</label>
            <textarea
              value={form.story}
              onChange={(e) => handleChange("story", e.target.value)}
              rows={4}
              className={inputStyle + " resize-y min-h-[100px]"}
              placeholder="Câu chuyện, cảm hứng về sản phẩm..."
            />
          </div>
        </div>
      </section>

      {/* Bộ sưu tập */}
      <section className="bg-white border border-outline-variant">
        <div className="border-b border-outline-variant px-5 py-3">
          <h4 className="font-label-caps text-button-text text-primary tracking-wider">BỘ SƯU TẬP</h4>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            {colList.map((col) => {
              const selected = form.collectionIds.includes(col.id);
              return (
                <button
                  key={col.id} type="button"
                  onClick={() => toggleCollection(col.id)}
                  className={`flex items-center gap-1.5 font-label-caps text-label-caps px-3 py-1.5 border transition-all ${
                    selected
                      ? "bg-primary text-white border-primary"
                      : "border-outline-variant text-on-surface-variant hover:border-primary"
                  }`}
                >
                  {selected && <span className="material-symbols-outlined text-[14px]">check</span>}
                  {col.name}
                </button>
              );
            })}
            {colList.length === 0 && (
              <span className="text-body-md text-on-surface-variant">Không có bộ sưu tập nào</span>
            )}
          </div>
        </div>
      </section>

      {/* Trạng thái */}
      <section className="bg-white border border-outline-variant">
        <div className="border-b border-outline-variant px-5 py-3">
          <h4 className="font-label-caps text-button-text text-primary tracking-wider">TRẠNG THÁI</h4>
        </div>
        <div className="p-5 flex flex-wrap gap-6">
          <Toggle checked={form.isFeatured} onChange={(v) => handleChange("isFeatured", v)} label="NỔI BẬT" />
          <Toggle checked={form.isPreorder} onChange={(v) => handleChange("isPreorder", v)} label="PRE-ORDER" />
          <Toggle checked={form.isActive} onChange={(v) => handleChange("isActive", v)} label="ĐANG BÁN" />
        </div>
      </section>

      {/* Actions */}
      {!hideSubmitButton && (
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white font-label-caps text-label-caps px-6 py-2.5 hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "ĐANG XỬ LÝ..." : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
