import logging

from scanners.AWS.utils import safe_call, paginate

logger = logging.getLogger(__name__)


def scan_ecr(session, region):

    # logger.info(f"Scanning ECR in {region}")

    client = session.client(
        "ecr",
        region_name=region
    )

    results = []

    # ─────────────────────────────
    # ECR REPOSITORIES
    # ─────────────────────────────

    repositories = paginate(
        client,
        "describe_repositories",
        "repositories"
    )

    for repo in repositories:

        repo_name = repo.get("repositoryName")

        repo_arn = repo.get("repositoryArn")

        # ─────────────────────────
        # Additional Repository Info
        # ─────────────────────────

        lifecycle_resp = safe_call(
            client.get_lifecycle_policy,
            repositoryName=repo_name
        )

        lifecycle_preview_resp = safe_call(
            client.get_lifecycle_policy_preview,
            repositoryName=repo_name
        )

        policy_resp = safe_call(
            client.get_repository_policy,
            repositoryName=repo_name
        )

        tags_resp = safe_call(
            client.list_tags_for_resource,
            resourceArn=repo_arn
        )

        images_resp = safe_call(
            client.describe_images,
            repositoryName=repo_name,
            maxResults=100
        )

        image_scan_findings = []

        image_details = []

        latest_scan_status = None

        latest_scan_findings_summary = None

        if images_resp:

            for image in images_resp.get(
                "imageDetails",
                []
            ):

                image_info = {

                    "image_digest":
                        image.get("imageDigest"),

                    "image_tags":
                        image.get("imageTags", []),

                    "image_size_in_bytes":
                        image.get("imageSizeInBytes"),

                    "image_pushed_at":
                        image.get("imagePushedAt").isoformat()
                        if image.get("imagePushedAt") else None,

                    "image_manifest_media_type":
                        image.get("imageManifestMediaType"),

                    "artifact_media_type":
                        image.get("artifactMediaType"),

                    "last_recorded_pull_time":
                        image.get("lastRecordedPullTime").isoformat()
                        if image.get("lastRecordedPullTime") else None,

                    "image_scan_status":
                        image.get("imageScanStatus", {}),

                    "image_scan_findings_summary":
                        image.get(
                            "imageScanFindingsSummary",
                            {}
                        )
                }

                image_details.append(image_info)

                if not latest_scan_status:
                    latest_scan_status = image.get(
                        "imageScanStatus",
                        {}
                    )

                if not latest_scan_findings_summary:
                    latest_scan_findings_summary = image.get(
                        "imageScanFindingsSummary",
                        {}
                    )

        encryption_config = repo.get(
            "encryptionConfiguration",
            {}
        )

        scan_config = repo.get(
            "imageScanningConfiguration",
            {}
        )

        resource = {

            "service": "ecr",

            "resource_type":
                "ecr_repository",

            "resource_id":
                repo_arn,

            "resource_name":
                repo_name,

            "arn":
                repo_arn,

            "region":
                region,

            "configuration": {

                # Basic Repository Info
                "repository_name":
                    repo_name,

                "repository_uri":
                    repo.get("repositoryUri"),

                "registry_id":
                    repo.get("registryId"),

                "created_at":
                    repo.get("createdAt").isoformat()
                    if repo.get("createdAt") else None,

                # Image Tag Mutability
                "image_tag_mutability":
                    repo.get(
                        "imageTagMutability",
                        "MUTABLE"
                    ),

                "is_immutable":
                    repo.get(
                        "imageTagMutability"
                    ) == "IMMUTABLE",

                # Image Scanning
                "scan_on_push":
                    scan_config.get(
                        "scanOnPush",
                        False
                    ),

                "latest_scan_status":
                    latest_scan_status,

                "latest_scan_findings_summary":
                    latest_scan_findings_summary,

                # Encryption
                "encryption_configuration":
                    encryption_config,

                "encryption_type":
                    encryption_config.get(
                        "encryptionType"
                    ),

                "kms_key":
                    encryption_config.get(
                        "kmsKey"
                    ),

                "is_kms_encrypted":
                    encryption_config.get(
                        "encryptionType"
                    ) == "KMS",

                # Policies
                "repository_policy":
                    policy_resp.get("policyText")
                    if policy_resp else None,

                "lifecycle_policy":
                    lifecycle_resp.get(
                        "lifecyclePolicyText"
                    )
                    if lifecycle_resp else None,

                "lifecycle_policy_registry_id":
                    lifecycle_resp.get(
                        "registryId"
                    )
                    if lifecycle_resp else None,

                "lifecycle_policy_last_evaluated_at":
                    lifecycle_preview_resp.get(
                        "lastEvaluatedAt"
                    ).isoformat()
                    if (
                        lifecycle_preview_resp and
                        lifecycle_preview_resp.get(
                            "lastEvaluatedAt"
                        )
                    )
                    else None,

                # Images
                "image_count":
                    len(image_details),

                "images":
                    image_details,

                # Derived Security Flags
                "has_repository_policy":
                    policy_resp is not None,

                "has_lifecycle_policy":
                    lifecycle_resp is not None,

                "public_access_possible":
                    (
                        policy_resp is not None and
                        '"Principal":"*"' in str(
                            policy_resp.get(
                                "policyText",
                                ""
                            )
                        )
                    ),

                "scan_enabled":
                    scan_config.get(
                        "scanOnPush",
                        False
                    ),

                "mutable_tags":
                    repo.get(
                        "imageTagMutability"
                    ) == "MUTABLE"
            },

            "tags":
                tags_resp.get("tags", [])
                if tags_resp else []
        }

        results.append(resource)

    logger.info(f"ECR {region} → {len(results)} resources")

    return results