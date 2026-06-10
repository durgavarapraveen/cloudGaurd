import { Edge, Node } from "@xyflow/react";

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

export interface RootLoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
  permissions: string[];
  message: string;
  github_connected: boolean;
  cloud_account_connected: boolean;
  username: string;
  email: string;
  last_scan_at: string;
}

export interface RootLoginResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
  userId?: string;
  permissions: string[];
  message: string;
  slug: string;
}

export interface UserProfile {
  id?: string;
  user_id: string;
  username: string;
  email: string;
  is_active?: boolean;
  is_deleted?: boolean;
  roles?: Array<string | { name: string }>;
  groups?: Array<string | { name: string }>;
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

export interface CreateCloudAccount {
  provider: string;
  account_name: string;
  account_identifier: string;
  credentials: Record<string, string>;
}

export type CloudAccount = {
  id: string;
  provider: string;
  account_identifier: string;
  account_name: string;
  region?: string;
  status?: string;
  last_scan?: string;
};

export type ResourceItem = {
  service: string;
  resource_id: string;
};

export interface ResourceSummaryResponse {
  cloud_account_id: string;
  fetched_date: string;
  id: string;
  newly_added_resources_count: number;
  organization_id: string;
  provider: string;
  total_resources_fetched_count: number;
  updated_resources_count: number;
  updated_resource_ids: ResourceItem[];
  newly_added_resource_ids: ResourceItem[];
  deleted_resources_count: number;
  deleted_resources_ids: ResourceItem[];
}

export interface ResourceDetailResponse {
  data: [ResourceResponse];
  summary: ResourceDetailsSummary;
  pagination: PaginationMeta;
}

export interface ResourceDetailsSummary {
  total_resources: string;
  total_services: number;
  resources_per_service: Record<string, number>;
}

export interface ResourceResponse {
  id: string;
  service: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  arn: string;
}

export type PaginationMeta = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export interface CreateUserbyRootUser {
  username: string;
  email: string;
  organizationId: string;
}

export interface createOrganization {
  name: string;
  slug: string;
  description: string;
}

export type Scheduler = {
  id: string;
  name: string;
  fetch_time: string;
  frequency: number;
  stop_date: string;
  is_active: boolean;
};

export type CreateSchedulerPayload = {
  name: string;
  fetch_time: string;
  frequency: number;
  stop_date: string;
};

export type ResourceSummary = {
  id: string;
  provider: string;
  total_resources_fetched_count: number;
  updated_resources_count: number;
  newly_added_resources_count: number;
  updated_resource_ids: string[];
  newly_added_resource_ids: string[];
  fetched_date: string;
  cloud_account_id: string;
};

export type SchedulerDetail = {
  id: string;
  name: string;
  fetch_time: string;
  frequency: number;
  stop_date: string;
  is_active: boolean;
  resource_summary: ResourceSummary[];
  job_running: boolean;
  next_run: string | null;
  trigger: string | null;
  last_scan: string;
};

export interface GroupUser {
  user_id: string;
  username: string;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  users: UserProfile[];
  permissions: string[];
}

export interface CreateGroupPayload {
  name: string;
  description: string;
  permissions: string[];
}

export type DriftStatus =
  | "new"
  | "assigned"
  | "in-progress"
  | "resolved"
  | "ignored";

export interface DriftResource {
  id: string;
  resource_id: string;
  resource_name: string;
  resource_type: string;
  issue_with_resource: string;
  status: DriftStatus;
  comments: Comment[];
  assigned_to_id?: string;
  assigned_to?: Group;
  first_seen: string;
  resource: ResourceDetailResponse;
}

export interface Comment {
  comment: string;
  entity_id: string;
  created_at: string;
  user: UserProfile;
}

export interface PaginatedDrifts {
  items: DriftResource[];
  total: number;
  page: number;
  page_size: number;
}

export const ALL_STATUSES: DriftStatus[] = [
  "assigned",
  "in-progress",
  "resolved",
  "ignored",
];

export interface ResourceMeta {
  resource_type: string;
  resource_name: string;
  service?: string;
}
export interface ResourceRelationship {
  id?: string;
  source_id: string;
  target_id: string;
  relation: string;
  source: ResourceMeta;
  target: ResourceMeta;
}

export interface NodeData {
  label: string;
  resourceType: string;
  resourceId: string;
  connectionCount: number;
  isFocal?: boolean; // true for the blast-radius centre node
  depth?: number; // hop distance from focal node
  [key: string]: unknown;
}

export interface Graph_ResourceRow {
  id: string;
  name: string;
  type: string;
  connectionCount: number;
}

export type ResourceGraphNode = Node<NodeData, "resource">;
export type ResourceGraphEdge = Edge<{ relation?: string }, "relation">;

export interface ResourceDetail {
  id: string;
  resource_name: string;
  resource_type: string;
  resource_id: string;
  [key: string]: unknown; // backend may return any extra fields
}

export interface VersionHistory {
  version_number: number;
  hashValue: string;
  recorded_at: string;
  id: string;
  resource_id: string;
  resource_name: string;
  [key: string]: unknown;
}
