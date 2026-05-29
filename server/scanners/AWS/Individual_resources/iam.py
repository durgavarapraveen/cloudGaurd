import logging

from scanners.AWS.utils import safe_call, paginate

logger = logging.getLogger(__name__)


def scan_iam(session):

    # logger.info("Scanning IAM")

    client = session.client("iam")

    results = []

    # ─────────────────────────────
    # ACCOUNT PASSWORD POLICY
    # ─────────────────────────────

    password_policy_resp = safe_call(
        client.get_account_password_policy
    )

    if password_policy_resp:

        password_policy = password_policy_resp.get(
            "PasswordPolicy",
            {}
        )

        findings = []

        if not password_policy.get(
            "RequireSymbols"
        ):

            findings.append({

                "severity":
                    "LOW",

                "issue":
                    "Password policy does not require symbols"
            })

        if not password_policy.get(
            "RequireNumbers"
        ):

            findings.append({

                "severity":
                    "LOW",

                "issue":
                    "Password policy does not require numbers"
            })

        if not password_policy.get(
            "RequireUppercaseCharacters"
        ):

            findings.append({

                "severity":
                    "LOW",

                "issue":
                    "Password policy does not require uppercase letters"
            })

        if not password_policy.get(
            "RequireLowercaseCharacters"
        ):

            findings.append({

                "severity":
                    "LOW",

                "issue":
                    "Password policy does not require lowercase letters"
            })

        if (
            password_policy.get(
                "MinimumPasswordLength",
                0
            ) < 14
        ):

            findings.append({

                "severity":
                    "MEDIUM",

                "issue":
                    "Password minimum length less than 14"
            })

        if not password_policy.get(
            "ExpirePasswords"
        ):

            findings.append({

                "severity":
                    "LOW",

                "issue":
                    "Password expiration disabled"
            })

        results.append({

            "service": "iam",

            "resource_type":
                "iam_password_policy",

            "resource_id":
                "account-password-policy",

            "resource_name":
                "Account Password Policy",

            "arn":
                None,

            "region":
                "global",

            "configuration": {

                "minimum_password_length":
                    password_policy.get(
                        "MinimumPasswordLength"
                    ),

                "require_symbols":
                    password_policy.get(
                        "RequireSymbols"
                    ),

                "require_numbers":
                    password_policy.get(
                        "RequireNumbers"
                    ),

                "require_uppercase":
                    password_policy.get(
                        "RequireUppercaseCharacters"
                    ),

                "require_lowercase":
                    password_policy.get(
                        "RequireLowercaseCharacters"
                    ),

                "allow_users_to_change_password":
                    password_policy.get(
                        "AllowUsersToChangePassword"
                    ),

                "expire_passwords":
                    password_policy.get(
                        "ExpirePasswords"
                    ),

                "max_password_age":
                    password_policy.get(
                        "MaxPasswordAge"
                    ),

                "password_reuse_prevention":
                    password_policy.get(
                        "PasswordReusePrevention"
                    ),

                "hard_expiry":
                    password_policy.get(
                        "HardExpiry"
                    )
            },

            "tags": [],

            "security": {

                "status":
                    "PASS"
                    if not findings
                    else "FAIL",

                "findings":
                    findings
            }
        })

    # ─────────────────────────────
    # ACCOUNT SUMMARY
    # ─────────────────────────────

    summary_resp = safe_call(
        client.get_account_summary
    )

    if summary_resp:

        results.append({

            "service": "iam",

            "resource_type":
                "iam_account_summary",

            "resource_id":
                "account-summary",

            "resource_name":
                "IAM Account Summary",

            "arn":
                None,

            "region":
                "global",

            "configuration": {

                "summary_map":
                    summary_resp.get(
                        "SummaryMap",
                        {}
                    )
            },

            "tags": []
        })

    # ─────────────────────────────
    # ACCOUNT AUTHORIZATION DETAILS
    # ─────────────────────────────

    auth_details = safe_call(
        client.get_account_authorization_details
    )

    # ─────────────────────────────
    # USERS
    # ─────────────────────────────

    users = paginate(
        client,
        "list_users",
        "Users"
    )

    for user in users:

        username = user.get(
            "UserName"
        )

        findings = []

        # ─────────────────────────
        # MFA
        # ─────────────────────────

        mfa_resp = safe_call(
            client.list_mfa_devices,
            UserName=username
        )

        mfa_devices = (
            mfa_resp.get(
                "MFADevices",
                []
            )
            if mfa_resp else []
        )

        mfa_enabled = (
            len(mfa_devices) > 0
        )

        if not mfa_enabled:

            findings.append({

                "severity":
                    "HIGH",

                "issue":
                    "User does not have MFA enabled"
            })

        # ─────────────────────────
        # Access Keys
        # ─────────────────────────

        access_keys_resp = safe_call(
            client.list_access_keys,
            UserName=username
        )

        access_keys = []

        active_key_count = 0

        for key in (
            access_keys_resp.get(
                "AccessKeyMetadata",
                []
            )
            if access_keys_resp else []
        ):

            key_id = key.get(
                "AccessKeyId"
            )

            last_used_resp = safe_call(
                client.get_access_key_last_used,
                AccessKeyId=key_id
            )

            last_used = (
                last_used_resp.get(
                    "AccessKeyLastUsed",
                    {}
                )
                if last_used_resp else {}
            )

            if key.get("Status") == "Active":
                active_key_count += 1

            access_keys.append({

                "access_key_id":
                    key_id,

                "status":
                    key.get("Status"),

                "created":
                    key.get(
                        "CreateDate"
                    ).isoformat()
                    if key.get(
                        "CreateDate"
                    ) else None,

                "last_used_date":
                    last_used.get(
                        "LastUsedDate"
                    ).isoformat()
                    if last_used.get(
                        "LastUsedDate"
                    ) else None,

                "last_used_service":
                    last_used.get(
                        "ServiceName"
                    ),

                "last_used_region":
                    last_used.get(
                        "Region"
                    )
            })

        if active_key_count > 1:

            findings.append({

                "severity":
                    "LOW",

                "issue":
                    "User has multiple active access keys"
            })

        # ─────────────────────────
        # Policies
        # ─────────────────────────

        attached_policies_resp = safe_call(
            client.list_attached_user_policies,
            UserName=username
        )

        inline_policies_resp = safe_call(
            client.list_user_policies,
            UserName=username
        )

        groups_resp = safe_call(
            client.list_groups_for_user,
            UserName=username
        )

        attached_policies = (
            attached_policies_resp.get(
                "AttachedPolicies",
                []
            )
            if attached_policies_resp else []
        )

        inline_policies = (
            inline_policies_resp.get(
                "PolicyNames",
                []
            )
            if inline_policies_resp else []
        )

        groups = (
            groups_resp.get(
                "Groups",
                []
            )
            if groups_resp else []
        )
        
        inline_policy_documents = {}

        for policy_name in inline_policies:

            doc_resp = safe_call(
                client.get_user_policy,
                UserName=username,
                PolicyName=policy_name
            )

            if doc_resp:

                inline_policy_documents[
                    policy_name
                ] = doc_resp.get(
                    "PolicyDocument",
                    {}
                )

        # ─────────────────────────
        # Login Profile
        # ─────────────────────────

        login_profile_resp = safe_call(
            client.get_login_profile,
            UserName=username
        )

        has_console_access = (
            True
            if login_profile_resp
            else False
        )

        # ─────────────────────────
        # Permissions Boundary
        # ─────────────────────────

        permissions_boundary = user.get(
            "PermissionsBoundary",
            {}
        )

        # ─────────────────────────
        # Tags
        # ─────────────────────────

        tags_resp = safe_call(
            client.list_user_tags,
            UserName=username
        )

        tags = (
            tags_resp.get(
                "Tags",
                []
            )
            if tags_resp else []
        )

        # ─────────────────────────
        # Resource
        # ─────────────────────────

        resource = {

            "service": "iam",

            "resource_type":
                "iam_user",

            "resource_id":
                user.get("UserId"),

            "resource_name":
                username,

            "arn":
                user.get("Arn"),

            "region":
                "global",

            "configuration": {

                # Basic
                "path":
                    user.get("Path"),

                "created":
                    user.get(
                        "CreateDate"
                    ).isoformat()
                    if user.get(
                        "CreateDate"
                    ) else None,

                "password_last_used":
                    user.get(
                        "PasswordLastUsed"
                    ).isoformat()
                    if user.get(
                        "PasswordLastUsed"
                    ) else None,

                # MFA
                "mfa_enabled":
                    mfa_enabled,

                "mfa_devices":
                    mfa_devices,

                # Access Keys
                "access_keys":
                    access_keys,

                "active_access_key_count":
                    active_key_count,

                # Console Access
                "console_access":
                    has_console_access,

                # Policies
                "attached_policies":
                    attached_policies,

                "inline_policies":
                    inline_policies,
                
                "inline_policy_documents":
                    inline_policy_documents,

                # Groups
                "groups":
                    groups,

                # Permissions Boundary
                "permissions_boundary":
                    permissions_boundary,

                # Tags
                "tag_set":
                    tags,

                # Derived Flags
                "has_admin_access":
                    any(
                        p.get("PolicyName")
                        == "AdministratorAccess"
                        for p in attached_policies
                    ),

                "has_inline_policies":
                    len(inline_policies) > 0,

                "has_permissions_boundary":
                    bool(permissions_boundary)
            },

            "tags":
                tags,

            "security": {

                "status":
                    "PASS"
                    if not findings
                    else "FAIL",

                "findings":
                    findings
            }
        }

        results.append(resource)

    # ─────────────────────────────
    # ROLES
    # ─────────────────────────────

    roles = paginate(
        client,
        "list_roles",
        "Roles"
    )

    for role in roles:

        role_name = role.get(
            "RoleName"
        )

        findings = []

        # ─────────────────────────
        # Attached Policies
        # ─────────────────────────

        attached_resp = safe_call(
            client.list_attached_role_policies,
            RoleName=role_name
        )

        inline_resp = safe_call(
            client.list_role_policies,
            RoleName=role_name
        )

        instance_profiles_resp = safe_call(
            client.list_instance_profiles_for_role,
            RoleName=role_name
        )

        attached_policies = (
            attached_resp.get(
                "AttachedPolicies",
                []
            )
            if attached_resp else []
        )

        inline_policies = (
            inline_resp.get(
                "PolicyNames",
                []
            )
            if inline_resp else []
        )
        
        for policy_name in inline_policies:
            doc_resp = safe_call(
                client.get_role_policy,
                RoleName=role_name,
                PolicyName=policy_name
            )

        instance_profiles = (
            instance_profiles_resp.get(
                "InstanceProfiles",
                []
            )
            if instance_profiles_resp else []
        )

        # ─────────────────────────
        # Last Used
        # ─────────────────────────

        role_last_used = role.get(
            "RoleLastUsed",
            {}
        )

        # ─────────────────────────
        # Trust Policy
        # ─────────────────────────

        trust_policy = role.get(
            "AssumeRolePolicyDocument",
            {}
        )

        # ─────────────────────────
        # Admin Access Check
        # ─────────────────────────

        has_admin = any(

            p.get("PolicyName")
            == "AdministratorAccess"

            for p in attached_policies
        )

        if has_admin:

            findings.append({

                "severity":
                    "HIGH",

                "issue":
                    "Role has AdministratorAccess policy"
            })

        # ─────────────────────────
        # Resource
        # ─────────────────────────

        resource = {

            "service": "iam",

            "resource_type":
                "iam_role",

            "resource_id":
                role.get("RoleId"),

            "resource_name":
                role_name,

            "arn":
                role.get("Arn"),

            "region":
                "global",

            "configuration": {

                # Basic
                "path":
                    role.get("Path"),

                "description":
                    role.get("Description"),

                "created":
                    role.get(
                        "CreateDate"
                    ).isoformat()
                    if role.get(
                        "CreateDate"
                    ) else None,

                "max_session_duration":
                    role.get(
                        "MaxSessionDuration"
                    ),

                # Trust Policy
                "trust_policy":
                    trust_policy,

                # Policies
                "attached_policies":
                    attached_policies,

                "inline_policies":
                    inline_policies,
                    
                "inline_policy_documents":
                    inline_policy_documents,

                # Instance Profiles
                "instance_profiles":
                    instance_profiles,

                # Permissions Boundary
                "permissions_boundary":
                    role.get(
                        "PermissionsBoundary"
                    ),

                # Last Used
                "last_used":
                    role_last_used,

                "last_used_date":
                    role_last_used.get(
                        "LastUsedDate"
                    ).isoformat()
                    if role_last_used.get(
                        "LastUsedDate"
                    ) else None,

                "last_used_region":
                    role_last_used.get(
                        "Region"
                    ),

                # Tags
                "tag_set":
                    role.get("Tags", []),

                # Derived Flags
                "has_admin_access":
                    has_admin,

                "has_inline_policies":
                    len(inline_policies) > 0,

                "can_be_assumed_by_cross_account":
                    "AWS"
                    in str(trust_policy),

                "has_permissions_boundary":
                    bool(
                        role.get(
                            "PermissionsBoundary"
                        )
                    )
            },

            "tags":
                role.get("Tags", []),

            "security": {

                "status":
                    "PASS"
                    if not findings
                    else "FAIL",

                "findings":
                    findings
            }
        }

        results.append(resource)

    # ─────────────────────────────
    # GROUPS
    # ─────────────────────────────

    groups = paginate(
        client,
        "list_groups",
        "Groups"
    )

    for group in groups:

        group_name = group.get(
            "GroupName"
        )

        attached_resp = safe_call(
            client.list_attached_group_policies,
            GroupName=group_name
        )

        inline_resp = safe_call(
            client.list_group_policies,
            GroupName=group_name
        )

        group_users_resp = safe_call(
            client.get_group,
            GroupName=group_name
        )
        
        inline_policy_documents = {}

        for policy_name in inline_policies:

            doc_resp = safe_call(
                client.get_group_policy,
                GroupName=group_name,
                PolicyName=policy_name
            )

            if doc_resp:

                inline_policy_documents[
                    policy_name
                ] = doc_resp.get(
                    "PolicyDocument",
                    {}
                )

        resource = {

            "service": "iam",

            "resource_type":
                "iam_group",

            "resource_id":
                group.get("GroupId"),

            "resource_name":
                group_name,

            "arn":
                group.get("Arn"),

            "region":
                "global",

            "configuration": {

                "path":
                    group.get("Path"),

                "created":
                    group.get(
                        "CreateDate"
                    ).isoformat()
                    if group.get(
                        "CreateDate"
                    ) else None,

                "attached_policies":
                    attached_resp.get(
                        "AttachedPolicies",
                        []
                    )
                    if attached_resp else [],

                "inline_policies":
                    inline_resp.get(
                        "PolicyNames",
                        []
                    )
                    if inline_resp else [],
                    
                "inline_policy_documents":
                    inline_policy_documents,
                    
                

                "users":
                    group_users_resp.get(
                        "Users",
                        []
                    )
                    if group_users_resp else []
            },

            "tags": []
        }

        results.append(resource)

    # ─────────────────────────────
    # CUSTOMER MANAGED POLICIES
    # ─────────────────────────────

    policies = paginate(
        client,
        "list_policies",
        "Policies",
        Scope="Local"
    )

    for policy in policies:

        version_resp = safe_call(
            client.get_policy_version,
            PolicyArn=policy.get("Arn"),
            VersionId=policy.get(
                "DefaultVersionId"
            )
        )

        policy_doc = (
            version_resp.get(
                "PolicyVersion",
                {}
            ).get("Document")
            if version_resp else {}
        )

        results.append({

            "service": "iam",

            "resource_type":
                "iam_policy",

            "resource_id":
                policy.get("PolicyId"),

            "resource_name":
                policy.get("PolicyName"),

            "arn":
                policy.get("Arn"),

            "region":
                "global",

            "configuration": {

                "path":
                    policy.get("Path"),

                "description":
                    policy.get("Description"),

                "default_version_id":
                    policy.get(
                        "DefaultVersionId"
                    ),

                "attachment_count":
                    policy.get(
                        "AttachmentCount"
                    ),

                "permissions_boundary_usage_count":
                    policy.get(
                        "PermissionsBoundaryUsageCount"
                    ),

                "is_attachable":
                    policy.get(
                        "IsAttachable"
                    ),

                "policy_document":
                    policy_doc,

                "created":
                    policy.get(
                        "CreateDate"
                    ).isoformat()
                    if policy.get(
                        "CreateDate"
                    ) else None,

                "updated":
                    policy.get(
                        "UpdateDate"
                    ).isoformat()
                    if policy.get(
                        "UpdateDate"
                    ) else None
            },

            "tags": []
        })

    logger.info(
        f"IAM → {len(results)} resources"
    )

    return results