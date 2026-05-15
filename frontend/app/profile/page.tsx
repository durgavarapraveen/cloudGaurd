"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Users,
  Search,
  Trash2,
  Pencil,
  UserPlus,
  Mail,
  User,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { UsersProfile, UserProfile, CreateUserPayload, Roles } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";

interface EditRolesModalProps {
  user: UserProfile;
  onClose: () => void;
  onSave: (roles: string[]) => void;
}

interface CreateUserModalProps {
  onClose: () => void;
  onCreate: (user: CreateUserPayload) => void;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editRolesOpen, setEditRolesOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const data = await UsersProfile.allUsers();
        console.log(data);
        setUsers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, users]);

  async function handleDeleteUser(user_id: string) {
    if (!user_id) return;

    try {
      const res = await UsersProfile.deleteUser(user_id);

      if (res) {
        setUsers((prev) => prev.filter((u) => u.user_id !== user_id));

        toast.success("User deleted successfully");
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRoleUpdate(updatedRoles: string[]) {
    if (!selectedUser) return;

    try {
      const res = await UsersProfile.editRolesforUser(
        selectedUser.user_id,
        updatedRoles,
      );
      if (res.roles)
        setUsers((prev) =>
          prev.map((user) =>
            user.user_id === selectedUser.user_id
              ? {
                  ...user,
                  roles: updatedRoles,
                }
              : user,
          ),
        );
    } catch (e) {
      console.log(e);
    }

    setEditRolesOpen(false);
  }

  async function handleCreateNewUser(user: CreateUserPayload) {
    console.log(user);

    try {
      const res = await UsersProfile.createUserFromAdmin({
        username: user.username,
        email: user.email,
        roles: user.roles ?? [],
      });

      if (res) {
        toast.success("User Created");

        const data = {
          user_id: res.id,
          email: res.email,
          is_active: res.is_active,
          roles: user.roles,
          username: res.username,
        };

        setUsers((prev) => [...prev, data]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreateUserOpen(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white px-6 py-8">
      <Toaster />
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 mb-4">
              <Shield className="w-3.5 h-3.5" />
              RBAC & Identity Management
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              User Management
            </h1>

            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              Manage users, assign roles, control permissions, and monitor
              account access across your CloudGuard environment.
            </p>
          </div>

          <button
            onClick={() => setCreateUserOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Create User
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-white/[0.06] bg-[#0c1020] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Users</p>
                <h2 className="text-3xl font-semibold mt-2">{users.length}</h2>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#0c1020] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Users</p>
                <h2 className="text-3xl font-semibold mt-2">
                  {users.filter((u) => u.is_active).length}
                </h2>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#0c1020] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Disabled Users</p>
                <h2 className="text-3xl font-semibold mt-2">
                  {users.filter((u) => !u.is_active).length}
                </h2>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0c1020] p-5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name or email"
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-11 pr-4 py-3 text-sm outline-none focus:border-emerald-500/40"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0c1020] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/[0.06] bg-white/[0.02]">
                <tr>
                  <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-6 py-4">
                    User
                  </th>
                  <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-6 py-4">
                    Roles
                  </th>
                  <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-6 py-4">
                    Status
                  </th>
                  <th className="text-right text-xs uppercase tracking-wider text-slate-500 px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      Loading users...
                    </td>
                  </tr>
                )}

                {!loading && filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No users found
                    </td>
                  </tr>
                )}

                {filteredUsers.map((user) => (
                  <tr
                    key={user.user_id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-all"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold">
                          {user.username[0].toUpperCase()}
                        </div>

                        <div>
                          <h3 className="text-sm font-medium text-white">
                            {user.username}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {user.roles &&
                          user.roles.map((role: string | { name: string }) => {
                            const roleName =
                              typeof role === "string" ? role : role.name;
                            return (
                              <span
                                key={roleName}
                                className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400"
                              >
                                {roleName}
                              </span>
                            );
                          })}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs text-green-400">
                          <span className="w-2 h-2 rounded-full bg-green-400" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-400">
                          <span className="w-2 h-2 rounded-full bg-red-400" />
                          Disabled
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setEditRolesOpen(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-400 hover:bg-blue-500/20 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit Roles
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user.user_id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Roles Modal */}
      {editRolesOpen && selectedUser && (
        <EditRolesModal
          user={selectedUser}
          onClose={() => setEditRolesOpen(false)}
          onSave={handleRoleUpdate}
        />
      )}

      {/* Create User Modal */}
      {createUserOpen && (
        <CreateUserModal
          onClose={() => setCreateUserOpen(false)}
          onCreate={(newUser) => handleCreateNewUser(newUser)}
        />
      )}
    </div>
  );
}

function EditRolesModal({ user, onClose, onSave }: EditRolesModalProps) {
  const [roles, setRoles] = useState<string[]>(
    user.roles?.map((role) => (typeof role === "string" ? role : role.name)) ??
      [],
  );

  const [allRoles, setAllRoles] = useState<Roles[]>([]);

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  useEffect(() => {
    const fetchAllRoles = async () => {
      try {
        const allroles = await UsersProfile.allRoles();
        setAllRoles(allroles);
      } catch (e) {
        console.log(e);
      }
    };

    fetchAllRoles();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-5">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0c1020] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Edit User Roles</h2>
            <p className="text-sm text-slate-400 mt-1">
              Update role assignments for {user.username}
            </p>
          </div>

          <button onClick={onClose} className="text-slate-500 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {allRoles &&
            allRoles.map((role) => {
              const active = roles.includes(role.name);

              return (
                <button
                  key={role.role_id}
                  onClick={() => toggleRole(role.name)}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium capitalize">{role.name}</h3>

                      <p className="text-xs text-slate-400 mt-1">
                        Access level for {role.name} operations
                      </p>

                      {role.permissions && (
                        <div className="mt-3 max-h-50 overflow-y-auto flex flex-wrap gap-2 pr-2">
                          {role.permissions.map((perm, idx) => (
                            <span
                              key={`${role.role_id}-${idx}`}
                              className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300 whitespace-nowrap"
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {active && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              );
            })}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.04]"
          >
            Cancel
          </button>

          <button
            onClick={() => onSave(roles)}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateUserModal({ onClose, onCreate }: CreateUserModalProps) {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [roles, setRoles] = useState<string[]>([]);

  const [allRoles, setAllRoles] = useState<Roles[]>([]);

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  useEffect(() => {
    const fetchAllRoles = async () => {
      try {
        const allroles = await UsersProfile.allRoles();
        setAllRoles(allroles);
      } catch (e) {
        console.log(e);
      }
    };

    fetchAllRoles();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-5">
      <div className="w-full max-w-xl rounded-2xl border border-white/[0.08] bg-[#0c1020] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Create New User</h2>
            <p className="text-sm text-slate-400 mt-1">
              Add a new user account to CloudGuard.
            </p>
          </div>

          <button onClick={onClose} className="text-slate-500 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Username
              </span>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-4 py-3 text-sm outline-none focus:border-emerald-500/40"
                  placeholder="john"
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Email
              </span>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-4 py-3 text-sm outline-none focus:border-emerald-500/40"
                  placeholder="john@company.com"
                />
              </div>
            </label>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Assign Roles</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {allRoles.map((role) => {
                const active = roles.includes(role.name);

                return (
                  <button
                    key={role.role_id}
                    onClick={() => toggleRole(role.name)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      active
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="capitalize text-sm font-medium">
                        {role.name}
                      </span>

                      {active && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.04]"
            >
              Cancel
            </button>

            <button
              onClick={() =>
                onCreate({
                  username,
                  email,
                  roles,
                })
              }
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20"
            >
              Create User
            </button>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
