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
    typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
  return new URL(backendUrl(path), origin);
}

import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type Status = "PASS" | "FAIL" | "ERROR" | "SKIP";

export const awsServices = [
  "EC2",
  "S3",
  "IAM",
  "RDS",
  "Lambda",
  "VPC",
  "CloudTrail",
  "CloudWatch",
  "EKS",
  "ECS",
  "EBS",
  "EFS",
  "ACM",
  "RAM",
  "PrivateLink",
  "KMS",
  "ECR",
  "Elasticache",
  "Route53",
  "TransitGateway",
] as const;

export const azureServices = [
  "Virtual Machines",
  "Storage Accounts",
  "Azure Active Directory",
  "SQL Database",
  "Functions",
  "Virtual Network",
  "Monitor",
] as const;

export const googleCloudServices = [
  "Compute Engine",
  "Cloud Storage",
  "Identity and Access Management",
  "Cloud SQL",
  "Cloud Functions",
  "Virtual Private Cloud",
  "Cloud Logging",
] as const;

export interface Finding {
  rule_id: string;
  rule_title: string;
  severity: Severity;
  service: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  region: string;
  status: Status;
  actual_value: string | null;
  expected_value: string | null;
  operator: string;
  remediation: string;
  source_file: string;
  checked_at: string;
}

export interface Summary {
  score: number;
  total: number;
  passed: number;
  failed: number;
  errored: number;
  by_severity: Record<Severity, number>;
  by_service: Record<string, number>;
}

export interface ScanResult {
  findings: Finding[];
  summary: Summary;
  scan_metadata?: {
    account_id: string;
    regions: string[];
    scanned_at: string;
  };
}

export interface DashboardScan {
  id: string;
  cloud_account_id: string;
  account_id: string | null;
  account_name: string | null;
  provider: string | null;
  scan_status: string;
  started_at: string | null;
  completed_at: string | null;
  scan_duration_seconds: number | null;
  regions_scanned: string[];
  services_scanned: string[];
  scan_metadata: Record<string, unknown>;
  total_resources: number;
  total_checks: number;
  total_passed: number;
  total_failed: number;
  total_warning: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  created_at: string | null;
}

export interface DashboardScansResponse {
  success: boolean;
  count: number;
  scans: DashboardScan[];
}

export interface CloudInventoryResource {
  id: string;
  cloud_account_id: string | null;
  provider: string;
  service: string;
  resource_type: string;
  resource_id: string;
  resource_name: string | null;
  arn: string | null;
  region: string | null;
  tags: Record<string, unknown>;
  configuration: Record<string, unknown>;
  first_seen: string | null;
  last_seen: string | null;
}

export interface DashboardScanDetail {
  success: boolean;
  scan: DashboardScan;
  findings: Finding[];
  inventory: CloudInventoryResource[];
  inventory_by_service: Record<string, CloudInventoryResource[]>;
  counts: {
    findings: number;
    inventory: number;
  };
}

export interface Rule {
  _id: string;
  id: string;
  title: string;
  severity: Severity;
  service: string;
  provider?: string;
  resource_type: string;
  description?: string;
  remediation?: string;
  cis_reference?: string;
  _source_file?: string;
  check: {
    path: string;
    operator: string;
    value?: string;
  };
}

export interface PoliciesResponse {
  success: boolean;
  total: number;
  rules: Rule[];
}

export interface PolicySummary {
  total_rules: number;
  by_service: Record<string, number>;
  by_severity: Record<string, number>;
  by_file: Record<string, number>;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password?: string;
  roles?: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
  permissions: string[];
  message: string;
}

export interface UserProfile {
  id?: string;
  user_id: string;
  username: string;
  email: string;
  is_active?: boolean;
  is_deleted?: boolean;
  roles?: Array<string | { name: string }>;
  created_at?: string;
}

export interface ScannerResource {
  resource_id?: string;
  resource_name?: string;
  region?: string;
  [key: string]: unknown;
}

export interface ScannerResult {
  resources?: Record<string, ScannerResource[]>;
  summary?: {
    total_resources: number;
    by_service?: Record<string, number>;
  };
}

export interface UserRolesResponse {
  roles: string[];
}

export interface ApiMessageResponse {
  message?: string;
  success?: boolean;
}

export interface Roles {
  role_id: string;
  name: string;
  permissions?: Array<string>;
  is_deleted: boolean;
}

export interface Permission {
  id: string;
  name: string;
}

export interface Role {
  role_id: string;
  name: string;
  permissions: string[];
}

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};

  const token = window.localStorage.getItem("cloudguard_access_token");
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

const ACCESS_TOKEN_KEY = "cloudguard_access_token";
const REFRESH_TOKEN_KEY = "cloudguard_refresh_token";
const USER_ID_KEY = "cloudguard_user_id";
const PERMISSIONS_KEY = "cloudguard_permissions";

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

async function refreshAccessToken(): Promise<LoginResponse> {
  if (typeof window === "undefined") {
    throw new Error("Token refresh is only available in the browser");
  }

  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const res = await fetch(`${BASE}/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, "Session expired"));
  }

  const session = (await res.json()) as LoginResponse;
  saveRefreshedSession(session);
  return session;
}

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
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
    throw Error(`Could not connect to backend at ${BASE}`);
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

  allRoles: async (): Promise<[Roles]> => {
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
};

// ─── AWS Validator  /aws/* ─────────────────────────────────────

export const awsApi = {
  // Full scan with optional filters — maps to GET /aws/scan
  scan: async (
    account_uuid?: string,
    params?: {
      regions?: string[];
      services?: string[];
      severities?: string[];
    },
  ): Promise<ScanResult> => {
    const url = backendSearchUrl(`/aws/scan`);
    if (params?.regions)
      params.regions.forEach((r) => url.searchParams.append("regions", r));
    if (params?.services)
      params.services.forEach((s) => url.searchParams.append("services", s));
    if (params?.severities)
      params.severities.forEach((s) =>
        url.searchParams.append("severities", s),
      );
    const res = await apiFetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(account_uuid ? { account_uuid } : {}),
    });
    if (!res.ok) throw new Error(`Scan failed: ${res.statusText}`);
    const body = await res.json();
    if (body?.success === false) {
      throw new Error(body.error ?? "Scan failed");
    }
    return body;
  },

  // Summary only — maps to GET /aws/summary
  summary: async (regions?: string[]): Promise<{ summary: Summary }> => {
    const url = backendSearchUrl(`/aws/summary`);
    regions?.forEach((r) => url.searchParams.append("regions", r));
    const res = await apiFetch(url.toString(), {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Summary failed: ${res.statusText}`);
    return res.json();
  },

  // Failed findings only — maps to GET /aws/failed
  failed: async (
    regions?: string[],
  ): Promise<{ failed_findings: Finding[] }> => {
    const url = backendSearchUrl(`/aws/failed`);
    regions?.forEach((r) => url.searchParams.append("regions", r));
    const res = await apiFetch(url.toString(), {
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(`Failed findings fetch failed: ${res.statusText}`);
    return res.json();
  },

  // Filter by severity — maps to GET /aws/severity/{severity}
  bySeverity: async (
    severity: string,
    regions?: string[],
  ): Promise<{ severity: string; findings: Finding[] }> => {
    const url = backendSearchUrl(`/aws/severity/${severity}`);
    regions?.forEach((r) => url.searchParams.append("regions", r));
    const res = await apiFetch(url.toString(), {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Severity filter failed: ${res.statusText}`);
    return res.json();
  },

  // Filter by service — maps to GET /aws/service/{service}
  byService: async (
    service: string,
    regions?: string[],
  ): Promise<{ service: string; findings: Finding[] }> => {
    const url = backendSearchUrl(`/aws/service/${service}`);
    regions?.forEach((r) => url.searchParams.append("regions", r));
    const res = await apiFetch(url.toString(), {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Service filter failed: ${res.statusText}`);
    return res.json();
  },
};

// ─── AWS Policies  /aws/policies/* ────────────────────────────

export const dashboardApi = {
  recentScans: async (limit = 100): Promise<DashboardScansResponse> => {
    const url = backendSearchUrl(`/dashboard/recent-scans`);
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
};

export const awsPoliciesApi = {
  // All rules — maps to GET /aws/policies/
  all: async (): Promise<PoliciesResponse> => {
    const res = await apiFetch(`${BASE}/aws/policies/`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Policies fetch failed: ${res.statusText}`);
    return res.json();
  },

  // Summary — maps to GET /aws/policies/summary
  summary: async (): Promise<{ success: boolean; summary: PolicySummary }> => {
    const res = await apiFetch(`${BASE}/aws/policies/summary`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Policy summary failed: ${res.statusText}`);
    return res.json();
  },

  // By service — maps to GET /aws/policies/service/{service}
  byService: async (
    service: string,
  ): Promise<{ success: boolean; count: number; rules: Rule[] }> => {
    const res = await apiFetch(`${BASE}/aws/policies/service/${service}`, {
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(`Policy service filter failed: ${res.statusText}`);
    return res.json();
  },

  // By severity — maps to GET /aws/policies/severity/{severity}
  bySeverity: async (
    severity: string,
  ): Promise<{ success: boolean; count: number; rules: Rule[] }> => {
    const res = await apiFetch(`${BASE}/aws/policies/severity/${severity}`, {
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(`Policy severity filter failed: ${res.statusText}`);
    return res.json();
  },
};

// ─── AWS Scanner  /aws/scanner/* ──────────────────────────────

export const awsScannerApi = {
  // Raw resource collection — maps to GET /aws/scanner/scan
  scan: async ({
    services,
  }: {
    services: string[];
  }): Promise<ScannerResult> => {
    if (!services || services.length === 0) {
      throw new Error("No services selected");
    }

    // Convert array to comma-separated string for URL
    const serviceParam = encodeURIComponent(services.join(","));

    const res = await apiFetch(`${BASE}/aws/scanner/scan/${serviceParam}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Scanner failed: ${res.statusText}`);
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
    // Convert array to comma-separated string for URL
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
};

// ─── Azure Policies  /azure/policies/* ───────────────────────

export const azurePoliciesApi = {
  all: async (): Promise<PoliciesResponse> => {
    const res = await apiFetch(`${BASE}/azure/policies/`, {
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(`Azure policies fetch failed: ${res.statusText}`);
    return res.json();
  },

  summary: async (): Promise<{ success: boolean; summary: PolicySummary }> => {
    const res = await apiFetch(`${BASE}/azure/policies/summary`, {
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(`Azure policy summary failed: ${res.statusText}`);
    return res.json();
  },
};

// ─── YAML Policies  /yaml/* ──────────────────────────────

export const yamlApi = {
  getPolicies: async (details: { provider: string | null }): Promise<[]> => {
    let url = `${BASE}/yaml/policies/`;
    if (details.provider) url = `${BASE}/yaml/policies/${details.provider}`;

    const res = await apiFetch(url, {
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(`YAML policies fetch failed: ${res.statusText}`);
    return res.json();
  },

  createPolicy: async (
    provider: string,
    service: string,
    yamlContent: string,
  ): Promise<void> => {
    const res = await apiFetch(`${BASE}/yaml/upload/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ provider, service, yaml_content: yamlContent }),
    });
    if (!res.ok)
      throw new Error(`YAML policy creation failed: ${res.statusText}`);
  },

  deletePolicy: async (id: string): Promise<void> => {
    const res = await apiFetch(`${BASE}/yaml/policies/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok)
      throw new Error(`YAML policy deletion failed: ${res.statusText}`);
  },

  getPolicyById: async (id: string): Promise<{ policy: unknown }> => {
    const res = await apiFetch(`${BASE}/yaml/policy/${id}`, {
      headers: authHeaders(),
    });

    if (!res.ok)
      throw new Error(`YAML policy fetch by ID failed: ${res.statusText}`);
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
      throw new Error(`YAML policy update failed: ${res.statusText}`);
  },
};
