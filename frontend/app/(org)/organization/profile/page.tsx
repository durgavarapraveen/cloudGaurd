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
  FolderOpen,
  Plus,
  ChevronRight,
  X,
  Layers,
  Lock,
  Check,
} from "lucide-react";
import { GroupsAPI, RolesPermissions, UsersProfile } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
  CreateGroupPayload,
  CreateUserPayload,
  Group,
  Permission,
  Roles,
  UserProfile,
} from "@/lib/props";

// ─── Modal Interfaces ─────────────────────────────────────────────────────────

interface EditRolesModalProps {
  user: UserProfile;
  onClose: () => void;
  onSave: (roles: string[]) => void;
}

interface CreateUserModalProps {
  onClose: () => void;
  onCreate: (user: CreateUserPayload) => void;
}

// ─── Root Page ────────────────────────────────────────────────────────────────

type Tab = "users" | "groups";

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<Tab>("users");

  return (
    <div className="min-h-screen bg-[#050816] text-white px-6 py-8">
      <Toaster />
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 mb-4">
            <Shield className="w-3.5 h-3.5" />
            RBAC & Identity Management
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Identity Management
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl">
            Manage users, assign roles, organize groups, and control permissions
            across your CloudGuard environment.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-[#0c1020] p-1 w-fit">
          <TabBtn
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
            icon={<Users className="w-4 h-4" />}
            label="Users"
          />
          <TabBtn
            active={activeTab === "groups"}
            onClick={() => setActiveTab("groups")}
            icon={<Layers className="w-4 h-4" />}
            label="Groups"
          />
        </div>

        {/* Tab Content */}
        {activeTab === "users" ? <UsersTab /> : <GroupsTab />}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
        active
          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
          : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editRolesOpen, setEditRolesOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await UsersProfile.allUsers();
        setUsers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.username.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, users],
  );

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
              ? { ...user, roles: updatedRoles }
              : user,
          ),
        );
    } catch (e) {
      console.error(e);
    }
    setEditRolesOpen(false);
  }

  async function handleCreateNewUser(user: CreateUserPayload) {
    try {
      const res = await UsersProfile.createUserFromAdmin({
        username: user.username,
        email: user.email,
        roles: user.roles ?? [],
      });
      if (res) {
        toast.success("User Created");
        setUsers((prev) => [
          ...prev,
          {
            user_id: res.id,
            email: res.email,
            is_active: res.is_active,
            roles: user.roles,
            username: res.username,
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreateUserOpen(false);
    }
  }

  return (
    <>
      {/* Stats + Action */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 flex-1">
          <StatCard
            label="Total Users"
            value={users.length}
            icon={<Users className="w-5 h-5" />}
            color="emerald"
          />
          <StatCard
            label="Active Users"
            value={users.filter((u) => u.is_active).length}
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Disabled Users"
            value={users.filter((u) => !u.is_active).length}
            icon={<XCircle className="w-5 h-5" />}
            color="red"
          />
        </div>
        <button
          onClick={() => setCreateUserOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all h-fit"
        >
          <UserPlus className="w-4 h-4" />
          Create User
        </button>
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

      {/* Table */}
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
                  Groups
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
                        user.roles.map(
                          (role: string | { name: string }, index: number) => {
                            const roleName =
                              typeof role === "string" ? role : role.name;
                            return (
                              <span
                                key={`${roleName}-${index}`}
                                className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400"
                              >
                                {roleName}
                              </span>
                            );
                          },
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {user.groups &&
                        user.groups.map(
                          (group: string | { name: string }, index: number) => {
                            const groupName =
                              typeof group === "string" ? group : group.name;
                            return (
                              <span
                                key={`${groupName}-${index}`}
                                className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400"
                              >
                                {groupName}
                              </span>
                            );
                          },
                        )}
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

      {editRolesOpen && selectedUser && (
        <EditRolesModal
          user={selectedUser}
          onClose={() => setEditRolesOpen(false)}
          onSave={handleRoleUpdate}
        />
      )}
      {createUserOpen && (
        <CreateUserModal
          onClose={() => setCreateUserOpen(false)}
          onCreate={handleCreateNewUser}
        />
      )}
    </>
  );
}

// ─── Groups Tab ───────────────────────────────────────────────────────────────

function GroupsTab() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Group | null>(null);
  const [addUsersTarget, setAddUsersTarget] = useState<Group | null>(null);
  const [detailTarget, setDetailTarget] = useState<Group | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await GroupsAPI.allGroups();
        setGroups(data);
        console.log(data);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load groups");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () =>
      groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [search, groups],
  );

  const totalMembers = useMemo(
    () => new Set(groups.flatMap((g) => g.users.map((u) => u.id))).size,
    [groups],
  );

  async function handleDelete(id: string) {
    try {
      const ok = await GroupsAPI.deleteGroup(id);
      if (ok) {
        setGroups((prev) => prev.filter((g) => g.id !== id));
        toast.success("Group deleted");
      }
    } catch {
      toast.error("Failed to delete group");
    }
  }

  async function handleCreate(data: CreateGroupPayload) {
    try {
      const created = await GroupsAPI.createGroup(data);
      setGroups((prev) => [
        ...prev,
        { ...created, users: created.users ?? [] },
      ]);
      toast.success("Group created");
    } catch {
      toast.error("Failed to create group");
    } finally {
      setCreateOpen(false);
    }
  }

  async function handleEdit(id: string, data: CreateGroupPayload) {
    try {
      const updated = await GroupsAPI.editGroup(id, data);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === id
            ? {
                ...g,
                name: updated.name,
                description: updated.description,
                permissions: updated.permissions,
              }
            : g,
        ),
      );
      toast.success("Group updated");
    } catch {
      toast.error("Failed to update group");
    } finally {
      setEditTarget(null);
    }
  }

  async function handleAddUsers(id: string, userIds: string[]) {
    console.log(id);
    try {
      const updated = await GroupsAPI.addUsers(id, userIds);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, users: updated.users ?? [] } : g,
        ),
      );
      toast.success("Members updated");
    } catch {
      toast.error("Failed to update members");
    } finally {
      setAddUsersTarget(null);
    }
  }

  return (
    <>
      {/* Stats + Action */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 flex-1">
          <StatCard
            label="Total Groups"
            value={groups.length}
            icon={<FolderOpen className="w-5 h-5" />}
            color="emerald"
          />
          <StatCard
            label="Total Members"
            value={totalMembers}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Empty Groups"
            value={groups.filter((g) => g.users.length === 0).length}
            icon={<FolderOpen className="w-5 h-5" />}
            color="amber"
          />
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all h-fit"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0c1020] p-5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups by name"
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-11 pr-4 py-3 text-sm outline-none focus:border-emerald-500/40"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0c1020] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/[0.06] bg-white/[0.02]">
              <tr>
                <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-6 py-4">
                  Group
                </th>
                <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-6 py-4">
                  Members
                </th>
                <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-6 py-4">
                  Permissions
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
                    Loading groups...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    No groups found
                  </td>
                </tr>
              )}
              {filtered.map((group, index) => (
                <tr
                  key={index}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-all"
                >
                  {/* Group name */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold">
                        {group.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white">
                          {group.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 max-w-[160px] truncate">
                          {group.description || (
                            <span className="italic">No description</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Members */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {group.users.slice(0, 4).map((u) => (
                          <div
                            key={u.user_id}
                            title={u.username[0].toUpperCase()}
                            className="w-7 h-7 rounded-full bg-blue-500/20 border-2 border-[#0c1020] flex items-center justify-center text-blue-300 text-xs font-semibold"
                          >
                            {u.username[0].toUpperCase()}
                          </div>
                        ))}
                        {group.users.length > 4 && (
                          <div className="w-7 h-7 rounded-full bg-white/10 border-2 border-[#0c1020] flex items-center justify-center text-slate-400 text-xs">
                            +{group.users.length - 4}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 ml-1">
                        {group.users.length}{" "}
                        {group.users.length === 1 ? "member" : "members"}
                      </span>
                    </div>
                  </td>

                  {/* Permissions */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1.5 flex-wrap max-w-[260px]">
                      {group.permissions && group.permissions.length > 0 ? (
                        <>
                          {group.permissions.slice(0, 2).map((perm) => (
                            <span
                              key={perm}
                              className="rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-400 whitespace-nowrap"
                            >
                              {perm}
                            </span>
                          ))}
                          {group.permissions.length > 2 && (
                            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-slate-500">
                              +{group.permissions.length - 2} more
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs italic text-slate-600">
                          No permissions
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <button
                        onClick={() => setDetailTarget(group)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.07] transition-all"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        View
                      </button>
                      <button
                        onClick={() => setAddUsersTarget(group)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-all"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add Users
                      </button>
                      <button
                        onClick={() => setEditTarget(group)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-400 hover:bg-blue-500/20 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(group.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 transition-all"
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

      {createOpen && (
        <GroupFormModal
          title="Create New Group"
          subtitle="Add a new group to CloudGuard."
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      )}
      {editTarget && (
        <GroupFormModal
          title="Edit Group"
          subtitle={`Update details for "${editTarget.name}"`}
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={(data) => handleEdit(editTarget.id, data)}
        />
      )}
      {addUsersTarget && (
        <AddUsersModal
          group={addUsersTarget}
          onClose={() => setAddUsersTarget(null)}
          onSave={(ids) => handleAddUsers(addUsersTarget.id, ids)}
        />
      )}
      {detailTarget && (
        <GroupDetailModal
          group={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </>
  );
}

// ─── Shared Stat Card ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "emerald" | "blue" | "red" | "amber";
}) {
  const colorMap = {
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  };
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0c1020] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <h2 className="text-3xl font-semibold mt-2">{value}</h2>
        </div>
        <div
          className={`w-12 h-12 rounded-xl border flex items-center justify-center ${colorMap[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function ModalShell({
  title,
  subtitle,
  onClose,
  wide,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-5">
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl border border-white/[0.08] bg-[#0c1020] p-6 max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 pr-1">{children}</div>
      </div>
    </div>
  );
}

// ─── Edit Roles Modal ─────────────────────────────────────────────────────────

function EditRolesModal({ user, onClose, onSave }: EditRolesModalProps) {
  const [roles, setRoles] = useState<string[]>(
    user.roles?.map((role) => (typeof role === "string" ? role : role.name)) ??
      [],
  );
  const [allRoles, setAllRoles] = useState<Roles[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await UsersProfile.allRoles();
        setAllRoles(r);
      } catch (e) {
        console.log(e);
      }
    })();
  }, []);

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  return (
    <ModalShell
      title="Edit User Roles"
      subtitle={`Update role assignments for ${user.username}`}
      onClose={onClose}
    >
      <div className="space-y-3">
        {allRoles.map((role) => {
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
                    <div className="mt-3 flex flex-wrap gap-2">
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
    </ModalShell>
  );
}

// ─── Create User Modal ────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onCreate }: CreateUserModalProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [allRoles, setAllRoles] = useState<Roles[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await UsersProfile.allRoles();
        setAllRoles(r);
      } catch (e) {
        console.log(e);
      }
    })();
  }, []);

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

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
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
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
                    className={`rounded-xl border p-4 text-left transition-all ${active ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"}`}
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
              onClick={() => onCreate({ username, email, roles })}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20"
            >
              Create User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Group Form Modal (Create / Edit) ─────────────────────────────────────────
// Matches backend schema: { name: str, permissions: list[str] }
// description is stored on the model but NOT in CreateNewGroup, so we show it
// read-only when editing. To save description you'd need a separate PATCH endpoint.

// Permissions are fetched from your existing UsersProfile.allRoles() permissions
// or you can swap allPermissions() if you have a dedicated endpoint.

function GroupFormModal({
  title,
  subtitle,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  initial?: Group;
  onClose: () => void;
  onSubmit: (data: CreateGroupPayload) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [permissions, setPermissions] = useState<string[]>(
    initial?.permissions ?? [],
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  // Collect all available permissions from roles
  const [availablePermissions, setAvailablePermissions] = useState<string[]>(
    [],
  );
  const [permInput, setPermInput] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const roles = await RolesPermissions.allPermissions();
        console.log(roles);
        // Flatten all permissions from all roles, deduplicate
        const all = Array.from(
          new Set(roles.flatMap((r: Permission) => r.name ?? [])),
        );
        setAvailablePermissions(all);
      } catch (e) {
        console.log(e);
      }
    })();
  }, []);

  function togglePermission(perm: string) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  }

  function addCustomPerm() {
    const trimmed = permInput.trim();
    if (trimmed && !permissions.includes(trimmed)) {
      setPermissions((prev) => [...prev, trimmed]);
      if (!availablePermissions.includes(trimmed)) {
        setAvailablePermissions((prev) => [...prev, trimmed]);
      }
    }
    setPermInput("");
  }

  const filtered = useMemo(
    () =>
      permInput.trim()
        ? availablePermissions.filter((p) =>
            p.toLowerCase().includes(permInput.toLowerCase()),
          )
        : availablePermissions,
    [permInput, availablePermissions],
  );

  return (
    <ModalShell title={title} subtitle={subtitle} onClose={onClose} wide>
      <div className="space-y-5">
        {/* Name */}
        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            Group Name
          </span>
          <div className="relative">
            <FolderOpen className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DevOps Team"
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-4 py-3 text-sm outline-none focus:border-emerald-500/40"
            />
          </div>
        </label>

        {/* Description (read-only when editing — not part of CreateNewGroup schema) */}

        <div className="space-y-2">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            Description
          </span>
          <div className="relative">
            <FolderOpen className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. DevOps Team"
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-4 py-3 text-sm outline-none focus:border-emerald-500/40"
            />
          </div>
        </div>

        {/* Permissions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-500">
              Permissions
            </span>
            {permissions.length > 0 && (
              <span className="text-xs text-emerald-400">
                {permissions.length} selected
              </span>
            )}
          </div>

          {/* Selected chips */}
          {permissions.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              {permissions.map((perm) => (
                <span
                  key={perm}
                  className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-400"
                >
                  {perm}
                  <button
                    onClick={() => togglePermission(perm)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search / add custom */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={permInput}
                onChange={(e) => setPermInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomPerm()}
                placeholder="Search or type a custom permission..."
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-4 py-3 text-sm outline-none focus:border-emerald-500/40"
              />
            </div>
            <button
              onClick={addCustomPerm}
              className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-400 hover:bg-violet-500/20 whitespace-nowrap"
            >
              + Add
            </button>
          </div>

          {/* Permission list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="text-sm text-slate-600 col-span-2 py-4 text-center">
                No permissions found
              </p>
            )}
            {filtered.map((perm) => {
              const active = permissions.includes(perm);
              return (
                <button
                  key={perm}
                  onClick={() => togglePermission(perm)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${
                    active
                      ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                      : "border-white/[0.06] bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="truncate">{perm}</span>
                  {active && <CheckCircle2 className="w-4 h-4 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/[0.06]">
        <button
          onClick={onClose}
          className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.04]"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit({ name, permissions, description })}
          disabled={!name.trim()}
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {initial ? "Save Changes" : "Create Group"}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Add Users to Group Modal ─────────────────────────────────────────────────

function AddUsersModal({
  group,
  onClose,
  onSave,
}: {
  group: Group;
  onClose: () => void;
  onSave: (userIds: string[]) => void;
}) {
  console.log(group);
  const [userIdInput, setUserIdInput] = useState("");
  const [staged, setStaged] = useState<string[]>(
    group.users.map((u) => u.id).filter((id): id is string => Boolean(id)),
  );
  const [allUsers, setAllUsers] = useState<UserProfile[]>();
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const users = await UsersProfile.allUsers();
        setAllUsers(users);
      } catch (e) {
        console.log(e);
      }
    })();
  }, []);

  const filteredUsers =
    allUsers?.filter((user) => {
      const q = search.toLowerCase();

      return (
        user.username?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q)
      );
    }) ?? [];

  function addId() {
    const trimmed = userIdInput.trim();
    if (trimmed && !staged.includes(trimmed))
      setStaged((prev) => [...prev, trimmed]);
    setUserIdInput("");
  }

  function removeId(id: string) {
    setStaged((prev) => prev.filter((x) => x !== id));
  }

  return (
    <ModalShell
      title="Add Users to Group"
      subtitle={`Manage members of "${group.name}"`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            User ID
          </span>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addId()}
                placeholder="Paste user ID and press Enter"
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-4 py-3 text-sm outline-none focus:border-emerald-500/40"
              />
            </div>
            <button
              onClick={addId}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20"
            >
              Add
            </button>
          </div>
        </label>
        <div className="max-h-52 overflow-y-auto space-y-2">
          {staged.length === 0 && (
            <p className="text-center text-sm text-slate-600 py-4">
              No users added yet.
            </p>
          )}
          {staged.map((id) => {
            const existing = allUsers?.find((u) => u.user_id === id);
            return (
              <div
                key={id}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-semibold">
                    {existing?.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm text-white">
                      {existing?.username ?? "Unknown User"}
                    </p>

                    <p className="text-xs text-slate-500">
                      {existing?.email ?? id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeId(id)}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="border-t border-white/[0.06] pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">
              Select Existing Users
            </h3>

            <span className="text-xs text-slate-500">
              {filteredUsers.length} users
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or email"
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-4 py-3 text-sm outline-none focus:border-emerald-500/40"
            />
          </div>

          {/* User list */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredUsers.slice(0, 5).map((user, index) => {
              const selected = staged.includes(user.user_id);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    if (selected) {
                      removeId(user.user_id);
                    } else {
                      setStaged((prev) => [...prev, user.user_id]);
                    }
                  }}
                  className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-colors text-left ${
                    selected
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-semibold">
                      {user.username?.[0]?.toUpperCase()}
                    </div>

                    <div>
                      <p className="text-sm text-white">{user.username}</p>

                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>

                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selected
                        ? "border-emerald-400 bg-emerald-400"
                        : "border-slate-600"
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 text-black" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.04]"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(staged)}
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20"
        >
          Save Members
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Group Detail Modal ───────────────────────────────────────────────────────

function GroupDetailModal({
  group,
  onClose,
}: {
  group: Group;
  onClose: () => void;
}) {
  return (
    <ModalShell
      title={group.name}
      subtitle={group.description ?? "No description provided."}
      onClose={onClose}
      wide
    >
      <div className="space-y-6">
        {/* Members */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Members · {group.users.length}
          </p>
          {group.users.length === 0 && (
            <p className="text-sm text-slate-600 text-center py-4">
              This group has no members yet.
            </p>
          )}
          {group.users.map((u) => (
            <div
              key={u.user_id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                {u.username[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{u.username}</p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />
            </div>
          ))}
        </div>

        {/* Permissions */}
        {group.permissions && group.permissions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Permissions · {group.permissions.length}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.permissions.map((perm) => (
                <div
                  key={perm}
                  className="flex items-center gap-2 rounded-xl border border-violet-500/15 bg-violet-500/[0.07] px-3 py-2"
                >
                  <Lock className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span className="text-xs text-violet-300 truncate">
                    {perm}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t border-white/[0.06]">
        <button
          onClick={onClose}
          className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.04]"
        >
          Close
        </button>
      </div>
    </ModalShell>
  );
}
