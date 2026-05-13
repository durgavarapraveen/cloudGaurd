const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND;
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
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
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
    const res = await fetch(`${BASE}/auth/logout/${userId}`, {
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
    const res = await fetch(`${BASE}/users/create`, {
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
    const res = await fetch(`${BASE}/users/id/${userId}`, {
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
  allUsers: async (): Promise<[UserProfile]> => {
    const res = await fetch(`${BACKEND_URL}/users`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Users Fetch Failed"));
    }
    return res.json();
  },

  allRoles: async (): Promise<[Roles]> => {
    const res = await fetch(`${BACKEND_URL}/roles`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      throw new Error(await parseApiError(res, "Failed to fetch all Roles"));
    }
    return res.json();
  },

  editRolesforUser: async (user_id: string, roles: string[]): Promise<any> => {
    const res = await fetch(`${BACKEND_URL}/users/edit-roles/${user_id}`, {
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

  deleteUser: async (user_id: string): Promise<any> => {
    const res = await fetch(`${BACKEND_URL}/users/delete/${user_id}`, {
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
    const res = await fetch(`${BACKEND_URL}/users/create`, {
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
    const res = await fetch(`${BACKEND_URL}/roles/`, {
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
    const res = await fetch(`${BACKEND_URL}/permissions/`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      const errorMessage = await parseApiError(
        res,
        "Failed to Fetch Permissions",
      );

      toast.error(errorMessage);

      throw new Error(errorMessage);
    }
    return res.json();
  },

  createNewPermission: async ({
    permission_name,
  }: {
    permission_name: string;
  }) => {
    const res = await fetch(`${BACKEND_URL}/permissions/create`, {
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

  deletePermission: async (id: string): Promise<any> => {
    const res = await fetch(`${BACKEND_URL}/permissions/delete/${id}`, {
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
    const res = await fetch(`${BACKEND_URL}/roles/create`, {
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

  deleteRoles: async (id: string): Promise<any> => {
    const res = await fetch(`${BACKEND_URL}/roles/delete/${id}`, {
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
  scan: async (params?: {
    regions?: string[];
    services?: string[];
    severities?: string[];
  }): Promise<ScanResult> => {
    const url = new URL(`${BASE}/aws/scan`);
    if (params?.regions)
      params.regions.forEach((r) => url.searchParams.append("regions", r));
    if (params?.services)
      params.services.forEach((s) => url.searchParams.append("services", s));
    if (params?.severities)
      params.severities.forEach((s) =>
        url.searchParams.append("severities", s),
      );
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Scan failed: ${res.statusText}`);
    return res.json();
  },

  // Summary only — maps to GET /aws/summary
  summary: async (regions?: string[]): Promise<{ summary: Summary }> => {
    const url = new URL(`${BASE}/aws/summary`);
    regions?.forEach((r) => url.searchParams.append("regions", r));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Summary failed: ${res.statusText}`);
    return res.json();
  },

  // Failed findings only — maps to GET /aws/failed
  failed: async (
    regions?: string[],
  ): Promise<{ failed_findings: Finding[] }> => {
    const url = new URL(`${BASE}/aws/failed`);
    regions?.forEach((r) => url.searchParams.append("regions", r));
    const res = await fetch(url.toString());
    if (!res.ok)
      throw new Error(`Failed findings fetch failed: ${res.statusText}`);
    return res.json();
  },

  // Filter by severity — maps to GET /aws/severity/{severity}
  bySeverity: async (
    severity: string,
    regions?: string[],
  ): Promise<{ severity: string; findings: Finding[] }> => {
    const url = new URL(`${BASE}/aws/severity/${severity}`);
    regions?.forEach((r) => url.searchParams.append("regions", r));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Severity filter failed: ${res.statusText}`);
    return res.json();
  },

  // Filter by service — maps to GET /aws/service/{service}
  byService: async (
    service: string,
    regions?: string[],
  ): Promise<{ service: string; findings: Finding[] }> => {
    const url = new URL(`${BASE}/aws/service/${service}`);
    regions?.forEach((r) => url.searchParams.append("regions", r));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Service filter failed: ${res.statusText}`);
    return res.json();
  },
};

// ─── AWS Policies  /aws/policies/* ────────────────────────────

export const awsPoliciesApi = {
  // All rules — maps to GET /aws/policies/
  all: async (): Promise<PoliciesResponse> => {
    const res = await fetch(`${BASE}/aws/policies/`);
    if (!res.ok) throw new Error(`Policies fetch failed: ${res.statusText}`);
    return res.json();
  },

  // Summary — maps to GET /aws/policies/summary
  summary: async (): Promise<{ success: boolean; summary: PolicySummary }> => {
    const res = await fetch(`${BASE}/aws/policies/summary`);
    if (!res.ok) throw new Error(`Policy summary failed: ${res.statusText}`);
    return res.json();
  },

  // By service — maps to GET /aws/policies/service/{service}
  byService: async (
    service: string,
  ): Promise<{ success: boolean; count: number; rules: Rule[] }> => {
    const res = await fetch(`${BASE}/aws/policies/service/${service}`);
    if (!res.ok)
      throw new Error(`Policy service filter failed: ${res.statusText}`);
    return res.json();
  },

  // By severity — maps to GET /aws/policies/severity/{severity}
  bySeverity: async (
    severity: string,
  ): Promise<{ success: boolean; count: number; rules: Rule[] }> => {
    const res = await fetch(`${BASE}/aws/policies/severity/${severity}`);
    if (!res.ok)
      throw new Error(`Policy severity filter failed: ${res.statusText}`);
    return res.json();
  },
};

// ─── AWS Scanner  /aws/scanner/* ──────────────────────────────

export const awsScannerApi = {
  // Raw resource collection — maps to GET /aws/scanner/scan
  scan: async ({ services }: { services: string[] }): Promise<any> => {
    if (!services || services.length === 0) {
      throw new Error("No services selected");
    }

    // Convert array to comma-separated string for URL
    const serviceParam = encodeURIComponent(services.join(","));

    const res = await fetch(`${BASE}/aws/scanner/scan/${serviceParam}`);
    if (!res.ok) throw new Error(`Scanner failed: ${res.statusText}`);
    return res.json();
  },

  downloadExcel: async ({ services }: { services: string[] }): Promise<any> => {
    if (!services || services.length === 0) {
      throw new Error("No services selected");
    }
    // Convert array to comma-separated string for URL
    const serviceParam = encodeURIComponent(services.join(","));

    const res = await fetch(`${BASE}/aws/scanner/export/${serviceParam}`);
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
    const res = await fetch(`${BASE}/azure/policies/`);
    if (!res.ok)
      throw new Error(`Azure policies fetch failed: ${res.statusText}`);
    return res.json();
  },

  summary: async (): Promise<{ success: boolean; summary: PolicySummary }> => {
    const res = await fetch(`${BASE}/azure/policies/summary`);
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

    console.log("Fetching policies with URL:", url);
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`YAML policies fetch failed: ${res.statusText}`);
    return res.json();
  },

  createPolicy: async (
    provider: string,
    service: string,
    yamlContent: string,
  ): Promise<void> => {
    const res = await fetch(`${BASE}/yaml/upload/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, service, yaml_content: yamlContent }),
    });
    if (!res.ok)
      throw new Error(`YAML policy creation failed: ${res.statusText}`);
  },

  deletePolicy: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE}/yaml/policies/${id}`, {
      method: "DELETE",
    });
    if (!res.ok)
      throw new Error(`YAML policy deletion failed: ${res.statusText}`);
  },

  getPolicyById: async (id: string): Promise<any> => {
    const res = await fetch(`${BASE}/yaml/policy/${id}`);

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
    const res = await fetch(`${BASE}/yaml/policy/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
