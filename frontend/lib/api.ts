const BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND ||
  "/backend"
)
  .trim()
  .replace(/\/$/, "");

function backendUrl(path: string) {
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function backendSearchUrl(path: string) {
  const origin =
    typeof window === "undefined"
      ? "http://localhost:3000"
      : window.location.origin;
  return new URL(backendUrl(path), origin);
}

import toast from "react-hot-toast";
import {
  ACCESS_TOKEN_KEY,
  PERMISSIONS_KEY,
  REFRESH_TOKEN_KEY,
  USER_ID_KEY,
} from "./session-keys";
import {
  ApiMessageResponse,
  CreateCloudAccount,
  CreateGroupPayload,
  createOrganization,
  CreateSchedulerPayload,
  CreateUserbyRootUser,
  CreateUserPayload,
  DashboardScanDetail,
  DashboardScansResponse,
  Finding,
  Group,
  LoginPayload,
  LoginResponse,
  PaginationMeta,
  Permission,
  PoliciesResponse,
  PolicySummary,
  ResourceDetailResponse,
  ResourceSummaryResponse,
  Role,
  Roles,
  RootLoginPayload,
  RootLoginResponse,
  ScannerResult,
  ScanResult,
  SchedulerDetail,
  Summary,
  UserProfile,
  UserRolesResponse,
} from "./props";
import { Rule } from "postcss";

// ─── Types ────────────────────────────────────────────────────

function normalizeResourceSummary(
  summary: ResourceSummaryResponse,
): ResourceSummaryResponse {
  return {
    ...summary,
    updated_resource_ids:
      summary.updated_resource_ids ?? summary.updated_resource_ids ?? [],
    newly_added_resource_ids:
      summary.newly_added_resource_ids ??
      summary.newly_added_resource_ids ??
      [],
  };
}

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};

  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_ID_KEY);
  window.localStorage.removeItem(PERMISSIONS_KEY);
}

function saveRefreshedSession(session: LoginResponse) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
  window.localStorage.setItem(USER_ID_KEY, session.user_id);
  window.localStorage.setItem(
    PERMISSIONS_KEY,
    JSON.stringify(session.permissions ?? []),
  );
}

function getAccessTokenPayload(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;

  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const payload = token?.split(".")[1];
  if (!payload) return null;

  try {
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<LoginResponse> {
  if (typeof window === "undefined") {
    throw new Error("Token refresh is only available in the browser");
  }

  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);

  console.debug("[refresh] key:", REFRESH_TOKEN_KEY, "found:", !!refreshToken);
  console.debug("[refresh] all localStorage keys:", Object.keys(localStorage));

  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const payload = getAccessTokenPayload();
  const refreshPath =
    payload?.privilege === "rootUser"
      ? "/root_user/refresh-token"
      : "/auth/refresh-token";

  const res = await fetch(`${BASE}${refreshPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    clearStoredSession();
    throw new Error(await parseApiError(res, "Session expired"));
  }

  const session = (await res.json()) as LoginResponse;
  saveRefreshedSession(session);
  return session;
}

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const hostname = window.location.hostname;
  const slug = hostname.split(".")[0];
  const requestInit = {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      ...authHeaders(),
      "X-Tenant-Slug": slug,
    },
  };

  let res: Response;
  try {
    res = await fetch(input, requestInit);
  } catch {
    throw new Error(`Could not connect to backend at ${BASE}`);
  }
  if (res.status !== 401) {
    return res;
  }

  try {
    await refreshAccessToken();
  } catch (error) {
    clearStoredSession();
    throw error;
  }

  return fetch(input, {
    ...requestInit,
    headers: {
      ...requestInit.headers,
      ...authHeaders(),
      "X-Tenant-Slug": slug,
    },
  });
}

async function apiFetchRootUser(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const requestInit = {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      ...authHeaders(),
    },
  };

  let res: Response;
  try {
    res = await fetch(input, requestInit);
  } catch {
    throw new Error(`Could not connect to backend at ${BASE}`);
  }
  if (res.status !== 401) {
    return res;
  }

  try {
    await refreshAccessToken();
  } catch (error) {
    clearStoredSession();
    throw error;
  }

  return fetch(input, {
    ...requestInit,
    headers: {
      ...requestInit.headers,
      ...authHeaders(),
    },
  });
}

async function parseApiError(res: Response, fallback: string) {
  try {
    const body = await res.json();
    return body?.detail ?? body?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export const rootUserAuthApi = {
  login: async (payload: RootLoginPayload): Promise<RootLoginResponse> => {
    const res = await fetch(`${BASE}/root_user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Login failed"));
    }
    const session = (await res.json()) as RootLoginResponse;
    return {
      ...session,
      user_id: session.user_id ?? session.userId ?? "",
      permissions: session.permissions ?? [],
    };
  },

  logout: async (userId: string): Promise<{ message: string }> => {
    const res = await apiFetch(`${BASE}/auth/logout/${userId}`, {
      method: "PUT",
      headers: authHeaders(),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Logout failed"));
    }
    return res.json();
  },
};

export const rootUserAPI = {
  organization: async (userId: string) => {
    const res = await apiFetchRootUser(
      `${BASE}/root_user/organizations/${userId}`,
    );
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Logout failed"));
    }
    return res.json();
  },

  allUsers: async (organizationId: string) => {
    const res = await apiFetchRootUser(
      `${BASE}/root_user/allUsers/${organizationId}`,
    );
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Logout failed"));
    }
    return res.json();
  },

  create_user: async (data: CreateUserbyRootUser) => {
    const res = await apiFetchRootUser(`${BASE}/root_user/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Logout failed"));
    }
    return res.json();
  },

  delete_user: async (userId: string) => {
    const res = await apiFetchRootUser(`${BASE}/root_user/delete/${userId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Logout failed"));
    }
    return res.json();
  },

  create_organization: async (data: createOrganization, userId: string) => {
    const res = await fetch(`${BASE}/root_user/create/organization/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Logout failed"));
    }
    return res.json();
  },
};

export const authApi = {
  register: async (
    payload: CreateUserPayload,
  ): Promise<{ message: string; user_id: string }> => {
    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Signup failed"));
    }
    return res.json();
  },

  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Login failed"));
    }
    return res.json();
  },

  logout: async (userId: string): Promise<{ message: string }> => {
    const res = await apiFetch(`${BASE}/auth/logout/${userId}`, {
      method: "PUT",
      headers: authHeaders(),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Logout failed"));
    }
    return res.json();
  },
};

export const usersApi = {
  create: async (payload: CreateUserPayload): Promise<UserProfile> => {
    const res = await apiFetch(`${BASE}/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "User creation failed"));
    }
    return res.json();
  },

  profile: async (userId: string): Promise<UserProfile> => {
    const res = await apiFetch(`${BASE}/users/id/${userId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Profile fetch failed"));
    }
    return res.json();
  },
};

// ---- Users Profile --------------------------------------
export const UsersProfile = {
  allUsers: async (): Promise<UserProfile[]> => {
    const res = await apiFetch(`${BASE}/users`);
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Users Fetch Failed"));
    }
    return res.json();
  },

  allRoles: async (): Promise<Roles[]> => {
    const res = await apiFetch(`${BASE}/roles`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Failed to fetch all Roles"));
    }
    return res.json();
  },

  editRolesforUser: async (
    user_id: string,
    roles: string[],
  ): Promise<UserRolesResponse> => {
    const res = await apiFetch(`${BASE}/users/edit-roles/${user_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        roles,
      }),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Failed to Update Roles"));
    }
    return await res.json();
  },

  deleteUser: async (user_id: string): Promise<ApiMessageResponse> => {
    const res = await apiFetch(`${BASE}/users/delete/${user_id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
    });
    if (!res.ok) {
      const errorMessage = await parseApiError(res, "Failed to Delete User");
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    return await res.json();
  },

  createUserFromAdmin: async ({
    username,
    email,
    roles,
  }: {
    username: string;
    email: string;
    roles: string[];
  }) => {
    const res = await apiFetch(`${BASE}/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        username,
        email,
        roles,
      }),
    });
    if (!res.ok) {
      const errorMessage = await parseApiError(res, "Failed to Delete User");
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    return await res.json();
  },
};

//--------------------Roles & Permissions -----------------
export const RolesPermissions = {
  allRoles: async (): Promise<Role[]> => {
    const res = await apiFetch(`${BASE}/roles/`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      const errorMessage = await parseApiError(res, "Failed to Fetch Roles");
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    return res.json();
  },

  allPermissions: async (): Promise<Permission[]> => {
    const res = await apiFetch(`${BASE}/permissions/`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      const errorMessage = await parseApiError(
        res,
        "Failed to Fetch Permissions",
      );
      toast.error(errorMessage);
      throw Error(errorMessage);
    }
    return res.json();
  },

  createNewPermission: async ({
    permission_name,
  }: {
    permission_name: string;
  }) => {
    const res = await apiFetch(`${BASE}/permissions/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        permission_name,
      }),
    });

    if (!res.ok) {
      const errorMessage = await parseApiError(
        res,
        "Failed to Create Permission",
      );
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    return await res.json();
  },

  deletePermission: async (id: string): Promise<ApiMessageResponse> => {
    const res = await apiFetch(`${BASE}/permissions/delete/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
    });

    if (!res.ok) {
      const errorMessage = await parseApiError(
        res,
        "Failed to Delete Permission",
      );
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    return await res.json();
  },

  createNewRole: async ({
    name,
    permissions,
  }: {
    name: string;
    permissions: string[];
  }) => {
    const res = await apiFetch(`${BASE}/roles/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        permissions,
        name,
      }),
    });

    if (!res.ok) {
      const errorMessage = await parseApiError(res, "Failed to Create Role");
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    return await res.json();
  },

  deleteRoles: async (id: string): Promise<ApiMessageResponse> => {
    const res = await apiFetch(`${BASE}/roles/delete/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
    });

    if (!res.ok) {
      const errorMessage = await parseApiError(res, "Failed to Delete Role");
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    return await res.json();
  },

  updateRole: async (
    id: string,
    data: {
      name: string;
      permissions: string[];
    },
  ): Promise<Role> => {
    const res = await apiFetch(`${BASE}/roles/rolepermissions/id/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        name: data.name,
        permissions: data.permissions,
      }),
    });

    if (!res.ok) {
      const errorMessage = await parseApiError(res, "Failed to Delete Role");
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    return await res.json();
  },
};

// ─── Dash Board ────────────────────────────
export const dashboardApi = {
  recentScans: async (
    limit = 100,
    accountIdentifier: string,
  ): Promise<DashboardScansResponse> => {
    const url = backendSearchUrl(
      `/dashboard/recent-scans/${accountIdentifier}`,
    );
    url.searchParams.set("limit", String(limit));
    const res = await apiFetch(url.toString(), {
      headers: authHeaders(),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Dashboard scans fetch failed"));
    }
    return res.json();
  },

  scanDetails: async (scanId: string): Promise<DashboardScanDetail> => {
    const res = await apiFetch(`${BASE}/dashboard/scans/${scanId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Scan details fetch failed"));
    }
    return res.json();
  },

  scan: async (accountIdentifier: string): Promise<ScanResult> => {
    const url = backendSearchUrl(
      `/dashboard/scanServices/${accountIdentifier}`,
    );
    const res = await apiFetch(url.toString());
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Scan failed"));
    }
    const body = await res.json();
    if (body?.success === false) {
      throw new Error(body.error ?? "Scan failed");
    }
    return body;
  },
};

// // ─── AWS Policies  /aws/policies/* ────────────────────────────
// export const awsPoliciesApi = {
//   // All rules — maps to GET /aws/policies/
//   all: async (): Promise<PoliciesResponse> => {
//     const res = await apiFetch(`${BASE}/aws/policies/`, {
//       headers: authHeaders(),
//     });
//     if (!res.ok) throw new Error(`Policies fetch failed: ${res.statusText}`);
//     return res.json();
//   },

//   // Summary — maps to GET /aws/policies/summary
//   summary: async (): Promise<{ success: boolean; summary: PolicySummary }> => {
//     const res = await apiFetch(`${BASE}/aws/policies/summary`, {
//       headers: authHeaders(),
//     });
//     if (!res.ok) throw new Error(`Policy summary failed: ${res.statusText}`);
//     return res.json();
//   },

//   // By service — maps to GET /aws/policies/service/{service}
//   byService: async (
//     service: string,
//   ): Promise<{ success: boolean; count: number; rules: Rule[] }> => {
//     const res = await apiFetch(`${BASE}/aws/policies/service/${service}`, {
//       headers: authHeaders(),
//     });
//     if (!res.ok)
//       throw new Error(`Policy service filter failed: ${res.statusText}`);
//     return res.json();
//   },

//   // By severity — maps to GET /aws/policies/severity/{severity}
//   bySeverity: async (
//     severity: string,
//   ): Promise<{ success: boolean; count: number; rules: Rule[] }> => {
//     const res = await apiFetch(`${BASE}/aws/policies/severity/${severity}`, {
//       headers: authHeaders(),
//     });
//     if (!res.ok)
//       throw new Error(`Policy severity filter failed: ${res.statusText}`);
//     return res.json();
//   },
// };

// ─── AWS Scanner  /aws/scanner/* ──────────────────────────────
export const awsScannerApi = {
  // Raw resource collection — maps to GET /aws/scanner/scan
  scan: async ({
    services,
    account_identifier,
  }: {
    services: string[];
    account_identifier: string;
  }): Promise<ScannerResult> => {
    if (!services || services.length === 0) {
      throw new Error("No services selected");
    }

    const serviceParam = services.join(",");

    const res = await apiFetch(
      `${BASE}/resources/resources_cloud/${account_identifier}?services=${serviceParam}`,
      {
        headers: authHeaders(),
      },
    );

    if (!res.ok) {
      throw new Error(`Scanner failed: ${res.statusText}`);
    }

    return res.json();
  },

  downloadExcel: async ({
    services,
  }: {
    services: string[];
  }): Promise<Blob> => {
    if (!services || services.length === 0) {
      throw new Error("No services selected");
    }
    const serviceParam = encodeURIComponent(services.join(","));
    const res = await apiFetch(`${BASE}/aws/scanner/export/${serviceParam}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Scanner failed: ${res.statusText}`);
    const blob = await res.blob();
    const urls = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urls;
    a.download = "aws_resources.xlsx";
    a.click();
    return blob;
  },

  fetch_resources_db: async (): Promise<DashboardScanDetail> => {
    const res = await apiFetch(`${BASE}/dashboard/db`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Scan details fetch failed"));
    }
    return res.json();
  },

  fetch_resources_summary: async ({
    account_identifier,
  }: {
    account_identifier: string;
  }): Promise<ResourceSummaryResponse[]> => {
    const res = await apiFetch(
      `${BASE}/resources/summary/${account_identifier}`,
      {
        headers: authHeaders(),
      },
    );
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Scan details fetch failed"));
    }
    const body = (await res.json()) as ResourceSummaryResponse[];
    return body.map(normalizeResourceSummary);
  },

  fetch_resources_summary_with_ID: async ({
    resourceSummaryID,
  }: {
    resourceSummaryID: string;
  }): Promise<ResourceSummaryResponse> => {
    const res = await apiFetch(
      `${BASE}/resources/summary_ID/${resourceSummaryID}`,
      {
        headers: authHeaders(),
      },
    );
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Summary fetch failed"));
    }
    const body = (await res.json()) as ResourceSummaryResponse;
    const summary = Array.isArray(body) ? body[0] : body;
    if (!summary) {
      throw new Error("Resource summary not found");
    }
    return normalizeResourceSummary(summary);
  },

  fetch_resource_detail: async ({
    summaryId,
    resourceId,
  }: {
    summaryId: string;
    resourceId: string;
  }): Promise<ResourceDetailResponse> => {
    const res = await apiFetch(
      `${BASE}/resources/summary_ID/${summaryId}/${encodeURIComponent(resourceId)}`,
      {
        headers: authHeaders(),
      },
    );
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Summary fetch failed"));
    }
    return res.json();
  },

  fetch_resources: async ({
    account_identifier,
    page = 1,
    page_size = 50,
    service,
  }: {
    account_identifier: string;
    page?: number;
    page_size?: number;
    service?: string;
  }): Promise<{
    data: ResourceDetailResponse[];
    pagination: PaginationMeta;
  }> => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
      ...(service ? { service } : {}),
    });

    const res = await apiFetch(
      `${BASE}/resources/resources/${account_identifier}?${params}`,
      { headers: authHeaders() },
    );

    if (!res.ok) {
      throw new Error(await parseApiError(res, "Resources fetch failed"));
    }
    return res.json();
  },
};

// // ─── Azure Policies  /azure/policies/* ───────────────────────
// export const azurePoliciesApi = {
//   all: async (): Promise<PoliciesResponse> => {
//     const res = await apiFetch(`${BASE}/azure/policies/`, {
//       headers: authHeaders(),
//     });
//     if (!res.ok)
//       throw new Error(`Azure policies fetch failed: ${res.statusText}`);
//     return res.json();
//   },

//   summary: async (): Promise<{ success: boolean; summary: PolicySummary }> => {
//     const res = await apiFetch(`${BASE}/azure/policies/summary`, {
//       headers: authHeaders(),
//     });
//     if (!res.ok)
//       throw new Error(`Azure policy summary failed: ${res.statusText}`);
//     return res.json();
//   },
// };

// ─── YAML Policies  /yaml/* ──────────────────────────────
export const yamlApi = {
  getPolicies: async (details: { provider: string | null }): Promise<[]> => {
    let url = `${BASE}/yaml/policies`;
    if (details.provider) url = `${BASE}/yaml/policies/${details.provider}`;
    const res = await apiFetch(url, {
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(await parseApiError(res, "YAML policies fetch failed"));
    return res.json();
  },

  createPolicy: async (
    provider: string,
    service: string,
    yamlContent: string,
  ): Promise<void> => {
    const res = await apiFetch(`${BASE}/yaml/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ provider, service, yaml_content: yamlContent }),
    });
    if (!res.ok)
      throw new Error(await parseApiError(res, "YAML policy creation failed"));
  },

  deletePolicy: async (id: string): Promise<void> => {
    const res = await apiFetch(`${BASE}/yaml/policies/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(await parseApiError(res, "YAML policy deletion failed"));
  },

  getPolicyById: async (id: string): Promise<{ policy: unknown }> => {
    const res = await apiFetch(`${BASE}/yaml/policy/${id}`, {
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(
        await parseApiError(res, "YAML policy fetch by ID failed"),
      );
    return res.json();
  },

  updatePolicy: async (
    id: string,
    provider: string,
    service: string,
    yamlContent: string,
  ): Promise<void> => {
    const res = await apiFetch(`${BASE}/yaml/policy/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        provider,
        service,
        yaml_content: yamlContent,
      }),
    });
    if (!res.ok)
      throw new Error(await parseApiError(res, "YAML policy update failed"));
  },
};

// ------------ Institutional Accounts ----------------
export const cloudAccounts = {
  getAllAccounts: async (): Promise<[]> => {
    const url = `${BASE}/cloud_accounts/`;
    const res = await apiFetch(url, {
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(`Cloud Accounts fetch failed: ${res.statusText}`);
    return res.json();
  },

  deleteAccount: async (id: string): Promise<[]> => {
    const url = `${BASE}/cloud-accounts/${id}`;
    const res = await apiFetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
    });
    if (!res.ok)
      throw new Error(`Cloud Accounts fetch failed: ${res.statusText}`);
    return res.json();
  },

  createPolicy: async (data: CreateCloudAccount): Promise<void> => {
    const res = await apiFetch(`${BASE}/cloud_accounts/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok)
      throw new Error(
        await parseApiError(res, "Cloud Account creation failed"),
      );
  },
};

// ------------------Schedulars ------------------
export const schedular = {
  getAllSchedulars: async (accountIdentifier: string): Promise<[]> => {
    const url = `${BASE}/schedulars/${accountIdentifier}`;
    const res = await apiFetch(url, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Schedular fetch failed: ${res.statusText}`);
    return res.json();
  },

  createSchedular: async (
    data: CreateSchedulerPayload,
    accountIdentifier: string,
  ): Promise<void> => {
    const res = await apiFetch(
      `${BASE}/schedulars/create/${accountIdentifier}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(data),
      },
    );
    if (!res.ok)
      throw new Error(await parseApiError(res, "Schedular creation failed"));
  },

  updateSchedular: async (
    data: CreateSchedulerPayload,
    schedularId: string,
  ): Promise<void> => {
    const res = await apiFetch(`${BASE}/schedulars/update/${schedularId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok)
      throw new Error(await parseApiError(res, "Schedular Updation failed"));
  },

  makeSchedularInactive: async (schedularId: string): Promise<[]> => {
    const url = `${BASE}/schedulars/inactive/${schedularId}`;
    const res = await apiFetch(url, {
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(`Schedular inactive failed: ${res.statusText}`);
    return res.json();
  },

  makeSchedularactive: async (schedularId: string): Promise<[]> => {
    const url = `${BASE}/schedulars/active/${schedularId}`;
    const res = await apiFetch(url, {
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(`Schedular inactive failed: ${res.statusText}`);
    return res.json();
  },

  getSchedularDetail: async (schedularId: string): Promise<SchedulerDetail> => {
    const url = `${BASE}/schedulars/schedular/${schedularId}`;
    const res = await apiFetch(url, {
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(`Schedular inactive failed: ${res.statusText}`);
    return res.json();
  },

  getSchedularStatus: async (schedularId: string): Promise<SchedulerDetail> => {
    const url = `${BASE}/schedulars/status/${schedularId}`;
    const res = await apiFetch(url, {
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(`Schedular inactive failed: ${res.statusText}`);
    return res.json();
  },

  deleteSchedular: async (schedularId: string): Promise<[]> => {
    const url = `${BASE}/schedulars/delete/${schedularId}`;
    const res = await apiFetch(url, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(`Schedular Deletion failed: ${res.statusText}`);
    return res.json();
  },
};

export const GroupsAPI = {
  async allGroups(): Promise<Group[]> {
    const url = `${BASE}/group/`;
    const res = await apiFetch(url);
    if (!res.ok) throw new Error("Failed to fetch groups");
    return res.json();
  },
  async createGroup(data: CreateGroupPayload): Promise<Group> {
    console.log(data);
    const url = `${BASE}/group/create`;
    const res = await apiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create group");
    return res.json();
  },
  async editGroup(id: string, data: CreateGroupPayload): Promise<Group> {
    const url = `${BASE}/group/edit/${id}`;
    const res = await apiFetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to edit group");
    return res.json();
  },
  async addUsers(id: string, userIds: string[]): Promise<Group> {
    console.log(id);
    const url = `${BASE}/group/addUsers/${id}`;
    const res = await apiFetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userIds),
    });
    if (!res.ok) throw new Error("Failed to add users");
    return res.json();
  },
  async deleteGroup(id: string): Promise<boolean> {
    const url = `${BASE}/group/delete/${id}`;
    const res = await fetch(url, { method: "DELETE" });
    return res.ok;
  },
};
