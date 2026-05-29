import logging

from scanners.AWS.utils import paginate, safe_call

logger = logging.getLogger(__name__)


def scan_elb(session, region):

    client = session.client(
        "elbv2",
        region_name=region
    )

    results = []

    load_balancers = paginate(
        client,
        "describe_load_balancers",
        "LoadBalancers"
    )

    for lb in load_balancers:

        attributes = safe_call(
            client.describe_load_balancer_attributes,
            LoadBalancerArn=lb["LoadBalancerArn"]
        )

        tags = safe_call(
            client.describe_tags,
            ResourceArns=[lb["LoadBalancerArn"]]
        )

        resource = {

            "service": "elb",

            "resource_type":
                "load_balancer",

            "resource_id":
                lb.get("LoadBalancerArn"),

            "resource_name":
                lb.get("LoadBalancerName"),

            "arn":
                lb.get("LoadBalancerArn"),

            "region":
                region,

            "configuration": {

                "type":
                    lb.get("Type"),

                "scheme":
                    lb.get("Scheme"),

                "state":
                    lb.get("State", {}).get("Code"),

                "vpc_id":
                    lb.get("VpcId"),

                "security_groups":
                    lb.get("SecurityGroups", []),

                "availability_zones":
                    lb.get("AvailabilityZones", []),

                "ip_address_type":
                    lb.get("IpAddressType"),

                "dns_name":
                    lb.get("DNSName"),

                "attributes":
                    attributes.get("Attributes", [])
                    if attributes else []
            },

            "tags":
                tags.get("TagDescriptions", [])
                if tags else []
        }

        results.append(resource)

    logger.info(f"ELB {region} → {len(results)} resources")

    return results