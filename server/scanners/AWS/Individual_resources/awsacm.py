import logging

from scanners.AWS.utils import safe_call, paginate

logger = logging.getLogger(__name__)


def scan_acm(session, region):

    # logger.info(f"Scanning ACM in {region}")

    client = session.client(
        "acm",
        region_name=region
    )

    results = []

    # ─────────────────────────────
    # ACM CERTIFICATES
    # ─────────────────────────────

    certificates = paginate(
        client,
        "list_certificates",
        "CertificateSummaryList"
    )

    for cert_summary in certificates:

        cert_arn = cert_summary.get("CertificateArn")

        detail_resp = safe_call(
            client.describe_certificate,
            CertificateArn=cert_arn
        )

        if not detail_resp:
            continue

        cert = detail_resp.get(
            "Certificate",
            {}
        )

        tags_resp = safe_call(
            client.list_tags_for_certificate,
            CertificateArn=cert_arn
        )

        domain_validation_options = []

        for option in cert.get(
            "DomainValidationOptions",
            []
        ):

            domain_validation_options.append({

                "domain_name":
                    option.get("DomainName"),

                "validation_domain":
                    option.get("ValidationDomain"),

                "validation_method":
                    option.get("ValidationMethod"),

                "validation_status":
                    option.get("ValidationStatus"),

                "resource_record":
                    option.get("ResourceRecord"),

                "http_redirect":
                    option.get("HttpRedirect")
            })

        renewal_summary = cert.get(
            "RenewalSummary",
            {}
        )

        resource = {

            "service": "acm",

            "resource_type":
                "acm_certificate",

            "resource_id":
                cert_arn,

            "resource_name":
                cert.get("DomainName"),

            "arn":
                cert_arn,

            "region":
                region,

            "configuration": {

                # Basic Info
                "domain_name":
                    cert.get("DomainName"),

                "subject_alternative_names":
                    cert.get("SubjectAlternativeNames", []),

                "status":
                    cert.get("Status"),

                "type":
                    cert.get("Type"),

                "issuer":
                    cert.get("Issuer"),

                "serial":
                    cert.get("Serial"),

                "subject":
                    cert.get("Subject"),

                "key_algorithm":
                    cert.get("KeyAlgorithm"),

                "signature_algorithm":
                    cert.get("SignatureAlgorithm"),

                # Dates
                "created_at":
                    cert.get("CreatedAt").isoformat()
                    if cert.get("CreatedAt") else None,

                "issued_at":
                    cert.get("IssuedAt").isoformat()
                    if cert.get("IssuedAt") else None,

                "imported_at":
                    cert.get("ImportedAt").isoformat()
                    if cert.get("ImportedAt") else None,

                "revoked_at":
                    cert.get("RevokedAt").isoformat()
                    if cert.get("RevokedAt") else None,

                "not_before":
                    cert.get("NotBefore").isoformat()
                    if cert.get("NotBefore") else None,

                "not_after":
                    cert.get("NotAfter").isoformat()
                    if cert.get("NotAfter") else None,

                # Usage / Validation
                "in_use_by":
                    cert.get("InUseBy", []),

                "renewal_eligibility":
                    cert.get("RenewalEligibility"),

                "domain_validation_options":
                    domain_validation_options,

                "failure_reason":
                    cert.get("FailureReason"),

                # Transparency Logging
                "options":
                    cert.get("Options", {}),

                # Renewal
                "renewal_summary": {

                    "renewal_status":
                        renewal_summary.get("RenewalStatus"),

                    "renewal_status_reason":
                        renewal_summary.get("RenewalStatusReason"),

                    "updated_at":
                        renewal_summary.get("UpdatedAt").isoformat()
                        if renewal_summary.get("UpdatedAt") else None,

                    "domain_validation_options":
                        renewal_summary.get(
                            "DomainValidationOptions",
                            []
                        )
                },

                # Private CA
                "certificate_authority_arn":
                    cert.get("CertificateAuthorityArn"),

                # Export / Managed By
                "exported":
                    cert.get("Exported"),

                "managed_by":
                    cert.get("ManagedBy"),

                # Extended Key Usages
                "extended_key_usages":
                    cert.get("ExtendedKeyUsages", []),

                # Key Usages
                "key_usages":
                    cert.get("KeyUsages", []),

                # Transparency Logging Enabled
                "certificate_transparency_logging":
                    cert.get("Options", {}).get(
                        "CertificateTransparencyLoggingPreference"
                    ),

                # SAN Count
                "san_count":
                    len(
                        cert.get(
                            "SubjectAlternativeNames",
                            []
                        )
                    ),

                # Is Expired
                "is_expired":
                    (
                        cert.get("Status") == "EXPIRED"
                    ),

                # Is Imported
                "is_imported":
                    (
                        cert.get("Type") == "IMPORTED"
                    ),

                # Is Amazon Issued
                "is_amazon_issued":
                    (
                        cert.get("Type") == "AMAZON_ISSUED"
                    )
            },

            "tags":
                tags_resp.get("Tags", [])
                if tags_resp else []
        }

        results.append(resource)

    logger.info(f"ACM {region} → {len(results)} resources")

    return results