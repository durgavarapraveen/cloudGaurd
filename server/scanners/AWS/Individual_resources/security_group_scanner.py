import logging

from scanners.AWS.utils import paginate

logger = logging.getLogger(__name__)


def scan_security_groups(session, region):

    client = session.client(
        "ec2",
        region_name=region
    )

    results = []

    security_groups = paginate(
        client,
        "describe_security_groups",
        "SecurityGroups"
    )

    for sg in security_groups:

        resource = {

            "service": "security_group",

            "resource_type":
                "security_group",

            "resource_id":
                sg.get("GroupId"),

            "resource_name":
                sg.get("GroupName"),

            "arn":
                f"arn:aws:ec2:{region}::security-group/{sg.get('GroupId')}",

            "region":
                region,

            "configuration": {

                "description":
                    sg.get("Description"),

                "vpc_id":
                    sg.get("VpcId"),

                "inbound_rules":
                    sg.get("IpPermissions", []),

                "outbound_rules":
                    sg.get("IpPermissionsEgress", [])
            },

            "tags":
                sg.get("Tags", [])
        }

        results.append(resource)

    logger.info(
        f"Security Groups {region} → {len(results)} resources"
    )

    return results