"use client";

import { useEffect, useState } from "react";
import { attributes as attributesApi } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import type { AttributeDto } from "@/lib/types";

export default function AttributesPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<AttributeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AttributeDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [options, setOptions] = useState<string[]>([]);

  const fetchData = () => {
    setLoading(true);
    attributesApi
      .admin()
      .then((res: any) => setData(Array.isArray(res) ? res : res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setOptions([]);
    setModalOpen(true);
  };

  const openEdit = (attr: AttributeDto) => {
    setEditing(attr);
    setName(attr.name);
    setOptions(attr.options?.map((o) => o.value) || []);
    setModalOpen(true);
  };

  const addOption = () => setOptions([...options, ""]);

  const removeOption = (idx: number) => setOptions(options.filter((_, i) => i !== idx));

  const updateOption = (idx: number, value: string) => {
    const next = [...options];
    next[idx] = value;
    setOptions(next);
  };

  const isColorAttr = (n: string) => /màu|color|colour/i.test(n);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const newOptions = options.filter((o) => o.trim()).map((o) => o.trim());
      if (editing) {
        await attributesApi.update(editing.id, { name: name.trim() });
        const existingOptions = editing.options || [];
        const existingValues = existingOptions.map((o) => o.value);
        for (const opt of existingOptions) {
          if (!newOptions.includes(opt.value)) {
            await attributesApi.deleteOption(opt.id);
          }
        }
        for (const val of newOptions) {
          if (!existingValues.includes(val)) {
            await attributesApi.createOption(editing.id, val);
          }
        }
        showToast("Cập nhật thuộc tính thành công", "success");
      } else {
        const attr = await attributesApi.create({ name: name.trim() });
        for (const val of newOptions) {
          await attributesApi.createOption(attr.id, val);
        }
        showToast("Tạo thuộc tính thành công", "success");
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Lỗi", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (await confirm("Xóa thuộc tính này?")) {
      try {
        await attributesApi.delete(id);
        showToast("Xóa thuộc tính thành công", "success");
        fetchData();
      } catch (err: any) {
        showToast(err.message || "Lỗi", "error");
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button onClick={openCreate} className="bg-primary text-white font-label-caps text-label-caps px-4 py-2 hover:bg-primary/90">
          + THÊM THUỘC TÍNH
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</div>
        ) : data.length === 0 ? (
          <div className="col-span-full p-6 text-center text-on-surface-variant">Chưa có thuộc tính</div>
        ) : (
          data.map((attr) => (
            <div key={attr.id} className="border border-outline-variant bg-surface p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-body-md font-bold">{attr.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(attr)} className="font-label-caps text-button-text border border-primary px-2 py-0.5 hover:bg-primary hover:text-white transition-all">
                    SỬA
                  </button>
                  <button onClick={() => handleDelete(attr.id)} className="font-label-caps text-button-text border border-error text-error px-2 py-0.5 hover:bg-error hover:text-white transition-all">
                    XÓA
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {attr.options?.map((opt) => (
                  <span key={opt.id} className="font-label-caps text-label-caps bg-surface-container-high px-2 py-0.5 flex items-center gap-1.5">
                    {isColorAttr(attr.name) && /^#[0-9a-f]{6}$/i.test(opt.value) && (
                      <span className="w-3.5 h-3.5 rounded-full border border-outline-variant shrink-0" style={{ backgroundColor: opt.value }} />
                    )}
                    {opt.value}
                  </span>
                ))}
                {(!attr.options || attr.options.length === 0) && (
                  <span className="text-body-md text-on-surface-variant">Chưa có tuỳ chọn</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "SỬA THUỘC TÍNH" : "THÊM THUỘC TÍNH"}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Cập nhật" : "Tạo"}
        submitting={submitting}
      >
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">TÊN THUỘC TÍNH</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Kích thước, Màu sắc..."
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">TUỲ CHỌN</label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                {isColorAttr(name) ? (
                  <>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="color"
                        value={/^#[0-9a-f]{6}$/i.test(opt) ? opt : "#000000"}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        className="w-8 h-8 p-0 border border-outline-variant cursor-pointer"
                      />
                      <input
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        placeholder="#000000"
                        className="flex-1 border-b border-outline-variant bg-surface pb-1 font-body-md text-body-md outline-none focus:border-primary font-mono"
                      />
                      {/^#[0-9a-f]{6}$/i.test(opt) && (
                        <span className="w-5 h-5 rounded-full border border-outline-variant shrink-0" style={{ backgroundColor: opt }} />
                      )}
                    </div>
                  </>
                ) : (
                  <input
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder="Giá trị tuỳ chọn"
                    className="flex-1 border-b border-outline-variant bg-surface pb-1 font-body-md text-body-md outline-none focus:border-primary"
                  />
                )}
                <button onClick={() => removeOption(idx)} className="text-error hover:text-error/70">
                  <span className="material-symbols-outlined text-lg">remove_circle</span>
                </button>
              </div>
            ))}
          </div>
          <button onClick={addOption} className="mt-2 flex items-center gap-1 text-secondary font-label-caps text-label-caps hover:text-secondary/70 transition-colors">
            <span className="material-symbols-outlined text-lg">add_circle</span>
            THÊM TUỲ CHỌN
          </button>
        </div>
      </Modal>
    </div>
  );
}
