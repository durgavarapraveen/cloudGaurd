export const publicRoutes = ["/", "/login", "/rootLogin"];

export const protectedRoutes = [
  "/organization/institution",
  "/organization/institution/linknewaccount",
  "/organization/roles",
  "/organization/profile",
  "/admin/organization",
  "/admin/:orgId",
  "/organization/:id",
  "/organization/:id/findings",
  "/organization/:id/policies",
  "/organization/:id/policies/create",
  "/organization/:id/policies/edit/:policyId",
  "/organization/:id/resource_summary",
  "/organization/:id/resource_summary/resources",
  "/organization/:id/resource_summary/:summary_id",
  "/organization/:id/schedular",
  "/organization/:id/schedular/:schedularId",
  "/organization/:id/schedular/details/:schId",
];
