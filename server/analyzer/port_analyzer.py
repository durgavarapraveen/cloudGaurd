from typing import List, Dict, Any


SENSITIVE_PORTS = {
    22:    ("SSH",           "CRITICAL"),
    3389:  ("RDP",           "CRITICAL"),
    2379:  ("etcd",          "CRITICAL"),
    2380:  ("etcd peer",     "CRITICAL"),
    3306:  ("MySQL",         "HIGH"),
    5432:  ("PostgreSQL",    "HIGH"),
    27017: ("MongoDB",       "HIGH"),
    6379:  ("Redis",         "HIGH"),
    9200:  ("Elasticsearch", "HIGH"),
    9300:  ("Elasticsearch", "HIGH"),
    1433:  ("MSSQL",         "HIGH"),
    1521:  ("Oracle DB",     "HIGH"),
    5439:  ("Redshift",      "HIGH"),
    9092:  ("Kafka",         "HIGH"),
    9094:  ("Kafka TLS",     "HIGH"),
    11211: ("Memcached",     "HIGH"),
    445:   ("SMB",           "HIGH"),
    8080:  ("HTTP Alt",      "MEDIUM"),
    8443:  ("HTTPS Alt",     "MEDIUM"),
}

OPEN_CIDRS = {"0.0.0.0/0", "::/0"}


def run_port_analysis(resources: List[Any]) -> List[Dict]:
    """
    Reads ec2_security_group resources from DB.
    Flags any inbound rule that opens a sensitive port to 0.0.0.0/0.
    """
    findings = []

    for r in resources:
        if r.resource_type != "ec2_security_group":
            continue

        config        = r.configuration or {}
        inbound_rules = config.get("inbound_rules") or config.get("ip_permissions", [])

        for rule in inbound_rules:
            from_port = rule.get("FromPort", 0)
            to_port   = rule.get("ToPort",   65535)
            protocol  = rule.get("IpProtocol", "tcp")

            # -1 means all traffic
            if protocol == "-1":
                from_port, to_port = 0, 65535

            open_cidrs_found = _open_cidrs_in_rule(rule)
            if not open_cidrs_found:
                continue

            for port, (service_name, severity) in SENSITIVE_PORTS.items():
                if from_port <= port <= to_port:
                    findings.append({
                        "id": r.id,
                        "check":         "EXPOSED_PORT",
                        "resource_type": "ec2_security_group",
                        "resource_id":   r.resource_id,
                        "resource_name": r.resource_name,
                        "region":        r.region,
                        "service":       r.service,
                        "severity":      severity,
                        "port":          port,
                        "protocol":      protocol,
                        "service_name":  service_name,
                        "open_cidrs":    open_cidrs_found,
                        "detail": (
                            f"Port {port} ({service_name}) open to "
                            f"{', '.join(open_cidrs_found)}"
                        ),
                        "remediation": (
                            f"Restrict SG {r.resource_id} port {port} "
                            f"to specific trusted CIDRs."
                        ),
                    })

    return findings


def _open_cidrs_in_rule(rule: Dict) -> List[str]:
    found = []
    for ip in rule.get("IpRanges", []):
        if ip.get("CidrIp") in OPEN_CIDRS:
            found.append(ip["CidrIp"])
    for ip in rule.get("Ipv6Ranges", []):
        if ip.get("CidrIpv6") in OPEN_CIDRS:
            found.append(ip["CidrIpv6"])
    return found