"use client";

import { useEffect, useState } from "react";
import { roles as rolesApi, adminUsers } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import ToggleSwitch from "@/components/ToggleSwitch";
import type { RoleDto, UserAdminDto } from "@/lib/types";

export default function RolesPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // Role CRUD state
  const [data, setData] = useState<RoleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoleDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", isActive: true });

  // User management state
  const [users, setUsers] = useState<UserAdminDto[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAdminDto | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  // Create user state
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ fullName: "", email: "", password: "", phone: "" });
  const [createUserRoleIds, setCreateUserRoleIds] = useState<number[]>([]);

  const fetchData = () => {
    setLoading(true);
    rolesApi
      .admin()
      .then((res: any) => setData(Array.isArray(res) ? res : res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchUsers = () => {
    setUsersLoading(true);
    adminUsers
      .list({ pageSize: 100 })
      .then((res) => setUsers(res.items))
      .catch(console.error)
      .finally(() => setUsersLoading(false));
  };

  useEffect(() => { fetchData(); fetchUsers(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name: "", isActive: true });
    setModalOpen(true);
  };

  const openEdit = (r: RoleDto) => {
    setEditing(r);
    setForm({ code: r.code, name: r.name, isActive: r.isActive });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await rolesApi.update(editing.id, form);
        showToast("Cập nhật vai trò thành công", "success");
      } else {
        await rolesApi.create(form);
        showToast("Tạo vai trò thành công", "success");
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
    if (await confirm("Xóa vai trò này?")) {
      try {
        await rolesApi.delete(id);
        showToast("Xóa vai trò thành công", "success");
        fetchData();
      } catch (err: any) {
        showToast(err.message || "Lỗi", "error");
      }
    }
  };

  const openUserRoles = (user: UserAdminDto) => {
    setEditingUser(user);
    setSelectedRoleIds(
      data.filter((r) => user.roles.includes(r.name)).map((r) => r.id)
    );
    setUserModalOpen(true);
  };

  const toggleUserRole = (roleId: number) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const openCreateUser = () => {
    setCreateUserForm({ fullName: "", email: "", password: "", phone: "" });
    setCreateUserRoleIds([]);
    setCreateUserModalOpen(true);
  };

  const toggleCreateUserRole = (roleId: number) => {
    setCreateUserRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleCreateUser = async () => {
    if (!createUserForm.fullName.trim() || !createUserForm.email.trim() || !createUserForm.password.trim()) {
      showToast("Vui lòng nhập đầy đủ thông tin", "warning");
      return;
    }
    setCreateUserLoading(true);
    try {
      await adminUsers.create({
        fullName: createUserForm.fullName,
        email: createUserForm.email,
        password: createUserForm.password,
        phone: createUserForm.phone || undefined,
        roleIds: createUserRoleIds,
      });
      showToast("Tạo tài khoản thành công", "success");
      setCreateUserModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || "Lỗi", "error");
    } finally {
      setCreateUserLoading(false);
    }
  };

  const saveUserRoles = async () => {
    if (!editingUser) return;
    setSavingRoles(true);
    try {
      const currentRoleIds = data
        .filter((r) => editingUser.roles.includes(r.name))
        .map((r) => r.id);

      const toAdd = selectedRoleIds.filter((id) => !currentRoleIds.includes(id));
      const toRemove = currentRoleIds.filter((id) => !selectedRoleIds.includes(id));

      for (const roleId of toAdd) {
        await adminUsers.assignRole(editingUser.id, roleId);
      }
      for (const roleId of toRemove) {
        await adminUsers.removeRole(editingUser.id, roleId);
      }

      showToast("Cập nhật vai trò người dùng thành công", "success");
      setUserModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || "Lỗi", "error");
    } finally {
      setSavingRoles(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Vai trò */}
      <div className="flex justify-end">
        <button onClick={openCreate} className="bg-primary text-white font-label-caps text-label-caps px-4 py-2 hover:bg-primary/90">
          + THÊM VAI TRÒ
        </button>
      </div>

      <div className="overflow-x-auto border border-outline-variant">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">VAI TRÒ</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">MÃ</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">NGƯỜI DÙNG</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">KÍCH HOẠT</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-on-surface-variant">Chưa có vai trò</td>
              </tr>
            ) : (
              data.map((r) => (
                <tr key={r.id} className="table-row-hover transition-colors">
                  <td className="p-3 font-body-md font-bold">{r.name}</td>
                  <td className="p-3 font-body-md text-body-md text-on-surface-variant">{r.code}</td>
                  <td className="p-3 text-center font-body-md">{r.userCount}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${r.isActive ? "bg-secondary" : "bg-error"}`} />
                  </td>
                  <td className="p-3 text-right flex justify-end gap-2">
                    <button onClick={() => openEdit(r)} className="font-label-caps text-button-text border border-primary px-3 py-1.5 hover:bg-primary hover:text-white transition-all">
                      SỬA
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="font-label-caps text-button-text border border-error text-error px-3 py-1.5 hover:bg-error hover:text-white transition-all">
                      XÓA
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Người dùng */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline-md text-headline-md text-primary">NGƯỜI DÙNG</h3>
          <button onClick={openCreateUser} className="bg-primary text-white font-label-caps text-label-caps px-4 py-2 hover:bg-primary/90">
            + TẠO TÀI KHOẢN
          </button>
        </div>
        <div className="overflow-x-auto border border-outline-variant">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-container-high">
                <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">TÊN</th>
                <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">EMAIL</th>
                <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">VAI TRÒ</th>
                <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {usersLoading ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-on-surface-variant">Không có người dùng</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="table-row-hover transition-colors">
                    <td className="p-3 font-body-md font-bold">{u.fullName}</td>
                    <td className="p-3 font-body-md text-body-md text-on-surface-variant">{u.email}</td>
                    <td className="p-3 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {u.roles.length === 0 ? (
                          <span className="text-body-md text-on-surface-variant">—</span>
                        ) : (
                          u.roles.map((role) => (
                            <span key={role} className="font-label-caps text-label-caps bg-surface-container-high px-2 py-0.5">
                              {role}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => openUserRoles(u)} className="font-label-caps text-button-text border border-primary px-3 py-1.5 hover:bg-primary hover:text-white transition-all">
                        SỬA VAI TRÒ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal chỉnh sửa vai trò */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "SỬA VAI TRÒ" : "THÊM VAI TRÒ"}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Cập nhật" : "Tạo"}
        submitting={submitting}
      >
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">MÃ VAI TRÒ</label>
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="Admin, Manager..."
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">TÊN VAI TRÒ</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Quản trị viên..."
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-3">
          <ToggleSwitch checked={form.isActive} onChange={(checked) => setForm({ ...form, isActive: checked })} />
          <span className="font-body-md text-body-md">Kích hoạt</span>
        </div>
      </Modal>

      {/* Modal phân vai trò cho người dùng */}
      <Modal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={`VAI TRÒ — ${editingUser?.fullName || ""}`}
        onSubmit={saveUserRoles}
        submitLabel="Lưu"
        submitting={savingRoles}
      >
        <p className="font-body-md text-body-md text-on-surface-variant mb-4">{editingUser?.email}</p>
        <div className="space-y-3">
          {data.map((r) => (
            <label key={r.id} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedRoleIds.includes(r.id)}
                onChange={() => toggleUserRole(r.id)}
                className="w-4 h-4 accent-primary"
              />
              <span className="font-body-md text-body-md group-hover:text-on-surface transition-colors">{r.name}</span>
            </label>
          ))}
          {data.length === 0 && (
            <p className="text-body-md text-on-surface-variant">Chưa có vai trò nào</p>
          )}
        </div>
      </Modal>

      {/* Modal tạo tài khoản*/}
      <Modal
        open={createUserModalOpen}
        onClose={() => setCreateUserModalOpen(false)}
        title="TẠO TÀI KHOẢN"
        onSubmit={handleCreateUser}
        submitLabel="Tạo"
        submitting={createUserLoading}
      >
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">HỌ VÀ TÊN</label>
          <input
            value={createUserForm.fullName}
            onChange={(e) => setCreateUserForm({ ...createUserForm, fullName: e.target.value })}
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">EMAIL</label>
          <input
            type="email"
            value={createUserForm.email}
            onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">MẬT KHẨU</label>
          <input
            type="password"
            value={createUserForm.password}
            onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">SỐ ĐIỆN THOẠI</label>
          <input
            value={createUserForm.phone}
            onChange={(e) => setCreateUserForm({ ...createUserForm, phone: e.target.value })}
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md outline-none focus:border-primary"
          />
        </div>
        <div className="space-y-3">
          <p className="font-label-caps text-label-caps text-on-surface-variant">VAI TRÒ</p>
          {data.map((r) => (
            <label key={r.id} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={createUserRoleIds.includes(r.id)}
                onChange={() => toggleCreateUserRole(r.id)}
                className="w-4 h-4 accent-primary"
              />
              <span className="font-body-md text-body-md group-hover:text-on-surface transition-colors">{r.name}</span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
