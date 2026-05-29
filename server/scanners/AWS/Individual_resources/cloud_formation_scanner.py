import logging

from scanners.AWS.utils import paginate, safe_call

logger = logging.getLogger(__name__)


def scan_cloudformation(session, region):

    # logger.info(f"Scanning CloudFormation in {region}")

    client = session.client(
        "cloudformation",
        region_name=region
    )

    results = []

    # ─────────────────────────────
    # STACKS
    # ─────────────────────────────

    stacks = paginate(
        client,
        "describe_stacks",
        "Stacks"
    )

    for stack in stacks:

        stack_name = stack.get(
            "StackName"
        )

        stack_id = stack.get(
            "StackId"
        )

        # ─────────────────────────
        # Template
        # ─────────────────────────

        template_resp = safe_call(
            client.get_template,
            StackName=stack_name
        )

        template_body = (
            template_resp.get("TemplateBody")
            if template_resp else None
        )

        template_stage = (
            template_resp.get("StagesAvailable")
            if template_resp else []
        )

        # ─────────────────────────
        # Stack Policy
        # ─────────────────────────

        stack_policy_resp = safe_call(
            client.get_stack_policy,
            StackName=stack_name
        )

        # ─────────────────────────
        # Drift Detection
        # ─────────────────────────

        drift_resp = safe_call(
            client.describe_stack_drift_detection_status,
            StackDriftDetectionId=stack.get(
                "DriftInformation",
                {}
            ).get(
                "StackDriftStatus"
            )
        )

        # ─────────────────────────
        # Stack Resources
        # ─────────────────────────

        stack_resources_resp = paginate(
            client,
            "list_stack_resources",
            "StackResourceSummaries",
            StackName=stack_name
        )

        stack_resources = []

        for resource in stack_resources_resp:

            stack_resources.append({

                "logical_resource_id":
                    resource.get(
                        "LogicalResourceId"
                    ),

                "physical_resource_id":
                    resource.get(
                        "PhysicalResourceId"
                    ),

                "resource_type":
                    resource.get("ResourceType"),

                "resource_status":
                    resource.get(
                        "ResourceStatus"
                    ),

                "resource_status_reason":
                    resource.get(
                        "ResourceStatusReason"
                    ),

                "last_updated_timestamp":
                    resource.get(
                        "LastUpdatedTimestamp"
                    ).isoformat()
                    if resource.get(
                        "LastUpdatedTimestamp"
                    ) else None,

                "drift_information":
                    resource.get(
                        "DriftInformation",
                        {}
                    ),

                "module_info":
                    resource.get("ModuleInfo")
            })

        # ─────────────────────────
        # Stack Events
        # ─────────────────────────

        stack_events_resp = paginate(
            client,
            "describe_stack_events",
            "StackEvents",
            StackName=stack_name
        )

        stack_events = []

        for event in stack_events_resp[:50]:

            stack_events.append({

                "event_id":
                    event.get("EventId"),

                "logical_resource_id":
                    event.get(
                        "LogicalResourceId"
                    ),

                "physical_resource_id":
                    event.get(
                        "PhysicalResourceId"
                    ),

                "resource_type":
                    event.get("ResourceType"),

                "resource_status":
                    event.get(
                        "ResourceStatus"
                    ),

                "resource_status_reason":
                    event.get(
                        "ResourceStatusReason"
                    ),

                "timestamp":
                    event.get(
                        "Timestamp"
                    ).isoformat()
                    if event.get(
                        "Timestamp"
                    ) else None
            })

        # ─────────────────────────
        # Change Sets
        # ─────────────────────────

        change_sets_resp = safe_call(
            client.list_change_sets,
            StackName=stack_name
        )

        change_sets = []

        if change_sets_resp:

            for cs in change_sets_resp.get(
                "Summaries",
                []
            ):

                change_sets.append({

                    "change_set_name":
                        cs.get("ChangeSetName"),

                    "change_set_id":
                        cs.get("ChangeSetId"),

                    "status":
                        cs.get("Status"),

                    "execution_status":
                        cs.get(
                            "ExecutionStatus"
                        ),

                    "creation_time":
                        cs.get(
                            "CreationTime"
                        ).isoformat()
                        if cs.get(
                            "CreationTime"
                        ) else None,

                    "description":
                        cs.get("Description")
                })

        # ─────────────────────────
        # Termination Protection
        # ─────────────────────────

        termination_protection_resp = safe_call(
            client.describe_termination_protection,
            StackName=stack_name
        )

        termination_protection = (
            termination_protection_resp.get(
                "TerminationProtectionEnabled",
                False
            )
            if termination_protection_resp else False
        )

        # ─────────────────────────
        # Exports
        # ─────────────────────────

        exports = []

        for output in stack.get(
            "Outputs",
            []
        ):

            if output.get("ExportName"):

                exports.append({

                    "export_name":
                        output.get("ExportName"),

                    "output_key":
                        output.get("OutputKey"),

                    "output_value":
                        output.get("OutputValue")
                })

        # ─────────────────────────
        # Security / IAM Analysis
        # ─────────────────────────

        capabilities = stack.get(
            "Capabilities",
            []
        )

        uses_iam = any(

            cap in [
                "CAPABILITY_IAM",
                "CAPABILITY_NAMED_IAM",
                "CAPABILITY_AUTO_EXPAND"
            ]

            for cap in capabilities
        )

        # ─────────────────────────
        # Resource Object
        # ─────────────────────────

        resource = {

            "service": "cloudformation",

            "resource_type":
                "cloudformation_stack",

            "resource_id":
                stack_id,

            "resource_name":
                stack_name,

            "arn":
                stack_id,

            "region":
                region,

            "configuration": {

                # Basic Info
                "stack_name":
                    stack_name,

                "stack_status":
                    stack.get("StackStatus"),

                "stack_status_reason":
                    stack.get(
                        "StackStatusReason"
                    ),

                "description":
                    stack.get("Description"),

                "disable_rollback":
                    stack.get(
                        "DisableRollback"
                    ),

                "role_arn":
                    stack.get("RoleARN"),

                "parent_id":
                    stack.get("ParentId"),

                "root_id":
                    stack.get("RootId"),

                # Dates
                "creation_time":
                    stack.get(
                        "CreationTime"
                    ).isoformat()
                    if stack.get(
                        "CreationTime"
                    ) else None,

                "last_updated_time":
                    stack.get(
                        "LastUpdatedTime"
                    ).isoformat()
                    if stack.get(
                        "LastUpdatedTime"
                    ) else None,

                "deletion_time":
                    stack.get(
                        "DeletionTime"
                    ).isoformat()
                    if stack.get(
                        "DeletionTime"
                    ) else None,

                # Drift
                "drift_information":
                    stack.get(
                        "DriftInformation",
                        {}
                    ),

                "drift_detection":
                    drift_resp
                    if drift_resp else {},

                # Rollback
                "rollback_configuration":
                    stack.get(
                        "RollbackConfiguration",
                        {}
                    ),

                # Template
                "template":
                    template_body,

                "template_stage":
                    template_stage,

                # Parameters
                "parameters":
                    stack.get(
                        "Parameters",
                        []
                    ),

                # Outputs
                "outputs":
                    stack.get(
                        "Outputs",
                        []
                    ),

                "exports":
                    exports,

                # Notifications
                "notification_arns":
                    stack.get(
                        "NotificationARNs",
                        []
                    ),

                # Capabilities
                "capabilities":
                    capabilities,

                "uses_iam_capabilities":
                    uses_iam,

                # Stack Policy
                "stack_policy":
                    stack_policy_resp.get(
                        "StackPolicyBody"
                    )
                    if stack_policy_resp else None,

                # Resources
                "resources":
                    stack_resources,

                "resource_count":
                    len(stack_resources),

                # Events
                "recent_events":
                    stack_events,

                # Change Sets
                "change_sets":
                    change_sets,

                "change_set_count":
                    len(change_sets),

                # Termination Protection
                "termination_protection":
                    termination_protection,

                # Stack Metadata
                "enable_termination_protection":
                    termination_protection,

                "retain_except_on_create":
                    stack.get(
                        "RetainExceptOnCreate"
                    ),

                # Derived Security Flags
                "is_failed":
                    "FAILED" in str(
                        stack.get("StackStatus")
                    ),

                "is_deleted":
                    stack.get("StackStatus")
                    == "DELETE_COMPLETE",

                "is_drifted":
                    stack.get(
                        "DriftInformation",
                        {}
                    ).get(
                        "StackDriftStatus"
                    ) == "DRIFTED",

                "rollback_disabled":
                    stack.get(
                        "DisableRollback",
                        False
                    ),

                "has_termination_protection":
                    termination_protection,

                "contains_iam_resources":
                    uses_iam,

                "has_notifications":
                    len(
                        stack.get(
                            "NotificationARNs",
                            []
                        )
                    ) > 0
            },

            "tags":
                stack.get("Tags", [])
        }

        results.append(resource)

    logger.info(
        f"CloudFormation {region} → {len(results)} resources"
    )

    return results