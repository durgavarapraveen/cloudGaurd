"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ShieldCheck, KeyRound } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { Role, Permission, RolesPermissions } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const [newRole, setNewRole] = useState("");
  const [newPermission, setNewPermission] = useState("");

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

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
      .catch((e: unknown) => {
        console.error(e);
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
      console.log(res);
      setPermissions((prev) => [...prev, res]);

      setNewPermission("");

      toast.success("Permission created");
    } catch (e) {
      console.error(e);
    }
  }

  async function createRole() {
    if (!newRole.trim()) return;
    const data = {
      name: newRole,
      permissions: selectedPermissions,
    };
    const res = await RolesPermissions.createNewRole(data);
    setRoles((prev) => [...prev, res]);
    setNewRole("");
    setSelectedPermissions([]);
    toast.success("Role created");
  }

  async function deleteRole(id: string) {
    try {
      const res = await RolesPermissions.deleteRoles(id);
      console.log(res);
      setRoles((prev) => prev.filter((r) => r.role_id !== id));

      toast.success("Role deleted");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to delete role"));
    }
  }

  async function deletePermission(id: string) {
    try {
      const res = await RolesPermissions.deletePermission(id);
      console.log(res);
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

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <Toaster />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROLES */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold">Roles</h2>
          </div>

          <div className="flex gap-3 mb-4">
            <input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Role name"
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-2 outline-none"
            />

            <button
              onClick={createRole}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-5">
            <p className="text-sm text-slate-400 mb-3">Select permissions</p>

            <div className="max-h-[200px] overflow-y-auto flex flex-wrap gap-2">
              {permissions.map((perm) => (
                <button
                  key={perm.id}
                  onClick={() => togglePermission(perm.name)}
                  className={`px-3 py-1 rounded-lg text-sm border transition ${
                    selectedPermissions.includes(perm.name)
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  {perm.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {roles.map((role) => (
              <div
                key={role.role_id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium capitalize">{role.name}</h3>

                    <div className="mt-3 max-h-[120px] overflow-y-auto flex flex-wrap gap-2">
                      {role.permissions?.map((perm, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteRole(role.role_id)}
                    className="text-red-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PERMISSIONS */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 mb-6">
            <KeyRound className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-semibold">Permissions</h2>
          </div>

          <div className="flex gap-3 mb-6">
            <input
              value={newPermission}
              onChange={(e) => setNewPermission(e.target.value)}
              placeholder="Permission name"
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-2 outline-none"
            />

            <button
              onClick={createPermission}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {permissions.map((perm) => (
              <div
                key={perm.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center justify-between"
              >
                <span>{perm.name}</span>

                <button
                  onClick={() => deletePermission(perm.id)}
                  className="text-red-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
