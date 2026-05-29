import logging

from scanners.AWS.utils import safe_call, paginate

logger = logging.getLogger(__name__)


def scan_route53(session):

    # logger.info("Scanning Route53")

    client = session.client("route53")

    results = []

    # ─────────────────────────────
    # HOSTED ZONES
    # ─────────────────────────────

    hosted_zones_resp = safe_call(
        client.list_hosted_zones
    )

    for zone in (
        hosted_zones_resp.get(
            "HostedZones",
            []
        )
        if hosted_zones_resp else []
    ):

        zone_id = zone.get(
            "Id",
            ""
        ).split("/")[-1]

        zone_name = zone.get("Name")

        # ─────────────────────────
        # Resource Record Sets
        # ─────────────────────────

        records_resp = safe_call(
            client.list_resource_record_sets,
            HostedZoneId=zone_id
        )

        record_sets = []

        if records_resp:

            for record in records_resp.get(
                "ResourceRecordSets",
                []
            ):

                record_sets.append({

                    "name":
                        record.get("Name"),

                    "type":
                        record.get("Type"),

                    "ttl":
                        record.get("TTL"),

                    "resource_records":
                        record.get(
                            "ResourceRecords",
                            []
                        ),

                    "alias_target":
                        record.get(
                            "AliasTarget"
                        ),

                    "health_check_id":
                        record.get(
                            "HealthCheckId"
                        ),

                    "traffic_policy_instance_id":
                        record.get(
                            "TrafficPolicyInstanceId"
                        ),

                    "set_identifier":
                        record.get(
                            "SetIdentifier"
                        ),

                    "weight":
                        record.get("Weight"),

                    "region":
                        record.get("Region"),

                    "failover":
                        record.get("Failover"),

                    "multi_value_answer":
                        record.get(
                            "MultiValueAnswer"
                        )
                })

        # ─────────────────────────
        # Query Logging
        # ─────────────────────────

        logging_resp = safe_call(
            client.list_query_logging_configs,
            HostedZoneId=zone_id
        )

        query_logging_configs = (
            logging_resp.get(
                "QueryLoggingConfigs",
                []
            )
            if logging_resp else []
        )

        # ─────────────────────────
        # DNSSEC
        # ─────────────────────────

        dnssec_resp = safe_call(
            client.get_dnssec,
            HostedZoneId=zone_id
        )

        dnssec_status = (
            dnssec_resp.get(
                "Status",
                {}
            )
            if dnssec_resp else {}
        )

        key_signing_keys = (
            dnssec_resp.get(
                "KeySigningKeys",
                []
            )
            if dnssec_resp else []
        )

        # ─────────────────────────
        # Tags
        # ─────────────────────────

        tags_resp = safe_call(
            client.list_tags_for_resource,
            ResourceType="hostedzone",
            ResourceId=zone_id
        )

        resource = {

            "service": "route53",

            "resource_type":
                "route53_hosted_zone",

            "resource_id":
                zone_id,

            "resource_name":
                zone_name,

            "arn":
                f"arn:aws:route53:::hostedzone/{zone_id}",

            "region":
                "global",

            "configuration": {

                # Basic Info
                "hosted_zone_name":
                    zone_name,

                "caller_reference":
                    zone.get("CallerReference"),

                "private_zone":
                    zone.get(
                        "Config",
                        {}
                    ).get(
                        "PrivateZone",
                        False
                    ),

                "comment":
                    zone.get(
                        "Config",
                        {}
                    ).get("Comment"),

                # Record Sets
                "record_count":
                    zone.get(
                        "ResourceRecordSetCount"
                    ),

                "record_sets":
                    record_sets,

                # Query Logging
                "query_logging_enabled":
                    len(query_logging_configs) > 0,

                "query_logging_configs":
                    query_logging_configs,

                # DNSSEC
                "dnssec":
                    dnssec_status,

                "dnssec_enabled":
                    dnssec_status.get(
                        "ServeSignature"
                    ) == "SIGNING",

                "key_signing_keys":
                    key_signing_keys,

                # Derived Record Metrics
                "a_records":
                    len([
                        r for r in record_sets
                        if r.get("type") == "A"
                    ]),

                "aaaa_records":
                    len([
                        r for r in record_sets
                        if r.get("type") == "AAAA"
                    ]),

                "cname_records":
                    len([
                        r for r in record_sets
                        if r.get("type") == "CNAME"
                    ]),

                "mx_records":
                    len([
                        r for r in record_sets
                        if r.get("type") == "MX"
                    ]),

                "txt_records":
                    len([
                        r for r in record_sets
                        if r.get("type") == "TXT"
                    ]),

                # Security / Exposure Flags
                "is_private":
                    zone.get(
                        "Config",
                        {}
                    ).get(
                        "PrivateZone",
                        False
                    ),

                "is_public":
                    not zone.get(
                        "Config",
                        {}
                    ).get(
                        "PrivateZone",
                        False
                    ),

                "has_query_logging":
                    len(query_logging_configs) > 0,

                "has_dnssec":
                    dnssec_status.get(
                        "ServeSignature"
                    ) == "SIGNING"
            },

            "tags":
                tags_resp.get(
                    "ResourceTagSet",
                    {}
                ).get(
                    "Tags",
                    []
                )
                if tags_resp else []
        }

        results.append(resource)

    # ─────────────────────────────
    # HEALTH CHECKS
    # ─────────────────────────────

    health_checks_resp = safe_call(
        client.list_health_checks
    )

    for hc in (
        health_checks_resp.get(
            "HealthChecks",
            []
        )
        if health_checks_resp else []
    ):

        hc_id = hc.get("Id")

        config = hc.get(
            "HealthCheckConfig",
            {}
        )

        health_check_resp = safe_call(
            client.get_health_check,
            HealthCheckId=hc_id
        )

        health_check_tags_resp = safe_call(
            client.list_tags_for_resource,
            ResourceType="healthcheck",
            ResourceId=hc_id
        )

        resource = {

            "service": "route53",

            "resource_type":
                "route53_health_check",

            "resource_id":
                hc_id,

            "resource_name":
                hc_id,

            "arn":
                f"arn:aws:route53:::healthcheck/{hc_id}",

            "region":
                "global",

            "configuration": {

                # Basic Info
                "caller_reference":
                    hc.get("CallerReference"),

                "linked_service":
                    hc.get("LinkedService"),

                # Endpoint Info
                "type":
                    config.get("Type"),

                "fully_qualified_domain_name":
                    config.get(
                        "FullyQualifiedDomainName"
                    ),

                "ip_address":
                    config.get("IPAddress"),

                "endpoint":
                    (
                        config.get(
                            "FullyQualifiedDomainName"
                        )
                        or config.get("IPAddress")
                    ),

                "port":
                    config.get("Port"),

                "protocol":
                    config.get("Type"),

                "resource_path":
                    config.get("ResourcePath"),

                # Monitoring Settings
                "request_interval":
                    config.get(
                        "RequestInterval"
                    ),

                "failure_threshold":
                    config.get(
                        "FailureThreshold"
                    ),

                "measure_latency":
                    config.get(
                        "MeasureLatency"
                    ),

                "inverted":
                    config.get("Inverted"),

                "disabled":
                    config.get("Disabled"),

                "enable_sni":
                    config.get("EnableSNI"),

                # Alarm / Child Checks
                "child_health_checks":
                    config.get(
                        "ChildHealthChecks",
                        []
                    ),

                "health_threshold":
                    config.get(
                        "HealthThreshold"
                    ),

                # Regions
                "regions":
                    config.get(
                        "Regions",
                        []
                    ),

                # Derived Flags
                "is_https":
                    config.get("Type")
                    in [
                        "HTTPS",
                        "HTTPS_STR_MATCH"
                    ],

                "is_http":
                    config.get("Type")
                    in [
                        "HTTP",
                        "HTTP_STR_MATCH"
                    ],

                "is_tcp":
                    config.get("Type") == "TCP",

                "is_disabled":
                    config.get("Disabled", False),

                "latency_measurement_enabled":
                    config.get(
                        "MeasureLatency",
                        False
                    )
            },

            "tags":
                health_check_tags_resp.get(
                    "ResourceTagSet",
                    {}
                ).get(
                    "Tags",
                    []
                )
                if health_check_tags_resp else []
        }

        results.append(resource)

    logger.info(f"Route53 → {len(results)} resources")

    return results