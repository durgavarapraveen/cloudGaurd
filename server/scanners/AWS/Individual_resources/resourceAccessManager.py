import logging

from scanners.AWS.utils import safe_call, paginate

logger = logging.getLogger(__name__)


def scan_ram(session, region):

    # logger.info(f"Scanning RAM in {region}")

    client = session.client(
        "ram",
        region_name=region
    )

    results = []

    # ─────────────────────────────
    # RESOURCE SHARES OWNED BY ACCOUNT
    # ─────────────────────────────

    own_shares = paginate(
        client,
        "get_resource_shares",
        "resourceShares",
        resourceOwner="SELF"
    )

    for share in own_shares:

        share_arn = share.get(
            "resourceShareArn"
        )

        # ─────────────────────────
        # Shared Resources
        # ─────────────────────────

        resources_resp = paginate(
            client,
            "list_resources",
            "resources",
            resourceOwner="SELF",
            resourceShareArns=[share_arn]
        )

        resources = []

        for resource in resources_resp:

            resources.append({

                "arn":
                    resource.get("arn"),

                "type":
                    resource.get("type"),

                "resource_share_arn":
                    resource.get(
                        "resourceShareArn"
                    ),

                "status":
                    resource.get("status"),

                "creation_time":
                    resource.get(
                        "creationTime"
                    ).isoformat()
                    if resource.get(
                        "creationTime"
                    ) else None,

                "last_updated_time":
                    resource.get(
                        "lastUpdatedTime"
                    ).isoformat()
                    if resource.get(
                        "lastUpdatedTime"
                    ) else None
            })

        # ─────────────────────────
        # Principals
        # ─────────────────────────

        principals_resp = paginate(
            client,
            "list_principals",
            "principals",
            resourceOwner="SELF",
            resourceShareArns=[share_arn]
        )

        principals = []

        for principal in principals_resp:

            principals.append({

                "id":
                    principal.get("id"),

                "resource_share_arn":
                    principal.get(
                        "resourceShareArn"
                    ),

                "creation_time":
                    principal.get(
                        "creationTime"
                    ).isoformat()
                    if principal.get(
                        "creationTime"
                    ) else None,

                "last_updated_time":
                    principal.get(
                        "lastUpdatedTime"
                    ).isoformat()
                    if principal.get(
                        "lastUpdatedTime"
                    ) else None,

                "external":
                    principal.get("external"),

                "status":
                    principal.get("status")
            })

        # ─────────────────────────
        # Resource Share Associations
        # ─────────────────────────

        associations_resp = safe_call(
            client.get_resource_share_associations,
            associationType="PRINCIPAL",
            resourceShareArns=[share_arn]
        )

        associations = []

        if associations_resp:

            for assoc in associations_resp.get(
                "resourceShareAssociations",
                []
            ):

                associations.append({

                    "associated_entity":
                        assoc.get(
                            "associatedEntity"
                        ),

                    "association_type":
                        assoc.get(
                            "associationType"
                        ),

                    "status":
                        assoc.get("status"),

                    "status_message":
                        assoc.get(
                            "statusMessage"
                        ),

                    "creation_time":
                        assoc.get(
                            "creationTime"
                        ).isoformat()
                        if assoc.get(
                            "creationTime"
                        ) else None,

                    "last_updated_time":
                        assoc.get(
                            "lastUpdatedTime"
                        ).isoformat()
                        if assoc.get(
                            "lastUpdatedTime"
                        ) else None
                })

        resource = {

            "service": "ram",

            "resource_type":
                "ram_resource_share",

            "resource_id":
                share_arn,

            "resource_name":
                share.get("name"),

            "arn":
                share_arn,

            "region":
                region,

            "configuration": {

                # Basic Info
                "name":
                    share.get("name"),

                "status":
                    share.get("status"),

                "status_message":
                    share.get("statusMessage"),

                "feature_set":
                    share.get("featureSet"),

                "resource_share_status":
                    share.get("status"),

                # Ownership
                "owning_account_id":
                    share.get(
                        "owningAccountId"
                    ),

                "allow_external_principals":
                    share.get(
                        "allowExternalPrincipals",
                        False
                    ),

                # Dates
                "creation_time":
                    share.get(
                        "creationTime"
                    ).isoformat()
                    if share.get(
                        "creationTime"
                    ) else None,

                "last_updated_time":
                    share.get(
                        "lastUpdatedTime"
                    ).isoformat()
                    if share.get(
                        "lastUpdatedTime"
                    ) else None,

                # Resources
                "resources":
                    resources,

                "resource_count":
                    len(resources),

                # Principals
                "principals":
                    principals,

                "principal_count":
                    len(principals),

                # Associations
                "associations":
                    associations,

                "association_count":
                    len(associations),

                # Derived Security Flags
                "has_external_principals":
                    share.get(
                        "allowExternalPrincipals",
                        False
                    ),

                "is_active":
                    share.get("status")
                    == "ACTIVE",

                "is_deleted":
                    share.get("status")
                    == "DELETED",

                "has_shared_resources":
                    len(resources) > 0,

                "has_principals":
                    len(principals) > 0
            },

            "tags":
                share.get("tags", [])
        }

        results.append(resource)

    # ─────────────────────────────
    # RESOURCE SHARES SHARED WITH ME
    # ─────────────────────────────

    external_shares = paginate(
        client,
        "get_resource_shares",
        "resourceShares",
        resourceOwner="OTHER-ACCOUNTS"
    )

    for share in external_shares:

        share_arn = share.get(
            "resourceShareArn"
        )

        shared_resources_resp = paginate(
            client,
            "list_resources",
            "resources",
            resourceOwner="OTHER-ACCOUNTS",
            resourceShareArns=[share_arn]
        )

        shared_resources = []

        for resource in shared_resources_resp:

            shared_resources.append({

                "arn":
                    resource.get("arn"),

                "type":
                    resource.get("type"),

                "status":
                    resource.get("status")
            })

        resource = {

            "service": "ram",

            "resource_type":
                "ram_shared_with_me",

            "resource_id":
                share_arn,

            "resource_name":
                share.get("name"),

            "arn":
                share_arn,

            "region":
                region,

            "configuration": {

                # Basic Info
                "name":
                    share.get("name"),

                "status":
                    share.get("status"),

                "status_message":
                    share.get("statusMessage"),

                "feature_set":
                    share.get("featureSet"),

                # Ownership
                "owning_account_id":
                    share.get(
                        "owningAccountId"
                    ),

                "allow_external_principals":
                    share.get(
                        "allowExternalPrincipals",
                        False
                    ),

                # Dates
                "creation_time":
                    share.get(
                        "creationTime"
                    ).isoformat()
                    if share.get(
                        "creationTime"
                    ) else None,

                "last_updated_time":
                    share.get(
                        "lastUpdatedTime"
                    ).isoformat()
                    if share.get(
                        "lastUpdatedTime"
                    ) else None,

                # Shared Resources
                "shared_resources":
                    shared_resources,

                "shared_resource_count":
                    len(shared_resources),

                # Derived Flags
                "is_active":
                    share.get("status")
                    == "ACTIVE",

                "is_external_share":
                    True
            },

            "tags":
                share.get("tags", [])
        }

        results.append(resource)

    logger.info(f"RAM {region} → {len(results)} resources")

    return results