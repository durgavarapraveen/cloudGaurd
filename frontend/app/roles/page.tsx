"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  ShieldCheck,
  KeyRound,
  Layers3,
  Check,
  Pencil,
  X,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { Role, Permission, RolesPermissions } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const [newRole, setNewRole] = useState("");
  const [newPermission, setNewPermission] = useState("");

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [showRoles, setShowRoles] = useState(true);

  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const [editRoleName, setEditRoleName] = useState("");

  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    Promise.all([
      RolesPermissions.allRoles(),
      RolesPermissions.allPermissions(),
    ])
      .then(([rolesRes, permissionsRes]) => {
        if (!active) return;

        setRoles(rolesRes);
        setPermissions(permissionsRes);
      })
      .catch((e) => {
        console.error(e);
        toast.error("Failed to load data");
      });

    return () => {
      active = false;
    };
  }, []);

  async function createPermission() {
    if (!newPermission.trim()) return;

    try {
      const res = await RolesPermissions.createNewPermission({
        permission_name: newPermission,
      });

      setPermissions((prev) => [...prev, res]);
      setNewPermission("");
      toast.success("Permission created");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to create permission"));
    }
  }

  async function createRole() {
    if (!newRole.trim()) return;

    try {
      const data = {
        name: newRole,
        permissions: selectedPermissions,
      };

      const res = await RolesPermissions.createNewRole(data);

      setRoles((prev) => [...prev, res]);
      setNewRole("");
      setSelectedPermissions([]);

      toast.success("Role created");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to create role"));
    }
  }

  async function deleteRole(id: string) {
    try {
      await RolesPermissions.deleteRoles(id);

      setRoles((prev) => prev.filter((r) => r.role_id !== id));

      toast.success("Role deleted");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to delete role"));
    }
  }

  async function deletePermission(id: string) {
    try {
      await RolesPermissions.deletePermission(id);

      setPermissions((prev) => prev.filter((p) => p.id !== id));

      toast.success("Permission deleted");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to delete permission"));
    }
  }

  function togglePermission(permission: string) {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission],
    );
  }

  function startEditRole(role: Role) {
    setEditingRoleId(role.role_id);
    setEditRoleName(role.name);
    setEditPermissions(role.permissions || []);
  }

  function cancelEditRole() {
    setEditingRoleId(null);
    setEditRoleName("");
    setEditPermissions([]);
  }

  function toggleEditPermission(permission: string) {
    setEditPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission],
    );
  }

  async function updateRole(roleId: string) {
    try {
      const payload = {
        name: editRoleName,
        permissions: editPermissions,
      };

      // replace with your api
      const updatedRole = await RolesPermissions.updateRole(roleId, payload);

      setRoles((prev) =>
        prev.map((role) => (role.role_id === roleId ? updatedRole : role)),
      );

      toast.success("Role updated");

      cancelEditRole();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to update role"));
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white px-4 py-8">
      <Toaster />

      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Roles & Permissions
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage access control for your platform
            </p>
          </div>

          <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.04] p-1">
            <button
              onClick={() => setShowRoles(true)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition ${
                showRoles
                  ? "bg-emerald-500 text-white"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Roles
            </button>

            <button
              onClick={() => setShowRoles(false)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition ${
                !showRoles
                  ? "bg-cyan-500 text-white"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <KeyRound className="h-4 w-4" />
              Permissions
            </button>
          </div>
        </div>

        {/* CONTENT */}
        {showRoles ? (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            {/* CREATE ROLE */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/15 p-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold">Create Role</h2>
                  <p className="text-sm text-slate-400">
                    Assign permissions to roles
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Enter role name"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-emerald-500/40"
                />

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-300">
                      Permissions
                    </p>

                    <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-slate-400">
                      {selectedPermissions.length} selected
                    </span>
                  </div>

                  <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                    {permissions.map((perm) => {
                      const active = selectedPermissions.includes(perm.name);

                      return (
                        <button
                          key={perm.id}
                          onClick={() => togglePermission(perm.name)}
                          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                            active
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                          }`}
                        >
                          <span>{perm.name}</span>

                          {active && (
                            <div className="h-2 w-2 rounded-full bg-emerald-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={createRole}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 font-medium transition hover:bg-emerald-600"
                >
                  <Plus className="h-4 w-4" />
                  Create Role
                </button>
              </div>
            </div>

            {/* ROLES LIST */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">All Roles</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Existing platform roles
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
                  <Layers3 className="h-4 w-4" />
                  {roles.length} Roles
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {roles.map((role) => {
                  const isEditing = editingRoleId === role.role_id;

                  return (
                    <div
                      key={role.role_id}
                      className="group rounded-3xl border border-white/10 bg-[#0f172a]/70 p-5 transition hover:border-emerald-500/20"
                    >
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {isEditing ? (
                            <input
                              value={editRoleName}
                              onChange={(e) => setEditRoleName(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm outline-none focus:border-emerald-500/40"
                            />
                          ) : (
                            <>
                              <h3 className="text-lg font-semibold capitalize">
                                {role.name}
                              </h3>

                              <p className="mt-1 text-xs text-slate-400">
                                {role.permissions?.length || 0} permissions
                              </p>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => updateRole(role.role_id)}
                                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400 hover:bg-emerald-500/20"
                              >
                                <Check className="h-4 w-4" />
                              </button>

                              <button
                                onClick={cancelEditRole}
                                className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-300 hover:bg-white/[0.06]"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditRole(role)}
                                className="rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-2 text-cyan-400 opacity-0 transition hover:bg-cyan-500/10 group-hover:opacity-100"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => deleteRole(role.role_id)}
                                className="rounded-xl border border-red-500/10 bg-red-500/5 p-2 text-red-400 opacity-0 transition hover:bg-red-500/10 group-hover:opacity-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="flex max-h-[220px] flex-wrap gap-2 overflow-y-auto">
                          {permissions.map((perm) => {
                            const active = editPermissions.includes(perm.name);

                            return (
                              <button
                                key={perm.id}
                                onClick={() => toggleEditPermission(perm.name)}
                                className={`rounded-xl border px-3 py-2 text-xs transition ${
                                  active
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.06]"
                                }`}
                              >
                                {perm.name}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto">
                          {role.permissions?.map((perm, idx) => (
                            <span
                              key={idx}
                              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300"
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Permissions</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Manage application permissions
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
                {permissions.length} Permissions
              </div>
            </div>

            <div className="mb-8 flex flex-col gap-3 sm:flex-row">
              <input
                value={newPermission}
                onChange={(e) => setNewPermission(e.target.value)}
                placeholder="Enter permission name"
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition focus:border-cyan-500/40"
              />

              <button
                onClick={createPermission}
                className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 font-medium transition hover:bg-cyan-600"
              >
                <Plus className="h-4 w-4" />
                Add Permission
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {permissions.map((perm) => (
                <div
                  key={perm.id}
                  className="group flex items-center justify-between rounded-2xl border border-white/10 bg-[#0f172a]/70 px-4 py-4 transition hover:border-cyan-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-cyan-500/10 p-2">
                      <KeyRound className="h-4 w-4 text-cyan-400" />
                    </div>

                    <span className="text-sm font-medium">{perm.name}</span>
                  </div>

                  <button
                    onClick={() => deletePermission(perm.id)}
                    className="rounded-lg p-2 text-red-400 opacity-0 transition hover:bg-red-500/10 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
