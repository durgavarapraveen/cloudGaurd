import logging

from scanners.AWS.utils import paginate, safe_call

logger = logging.getLogger(__name__)


def scan_lambda(session, region):

    client = session.client(
        "lambda",
        region_name=region
    )

    results = []

    functions = paginate(
        client,
        "list_functions",
        "Functions"
    )

    for fn in functions:

        policy = safe_call(
            client.get_policy,
            FunctionName=fn["FunctionName"]
        )

        tags = safe_call(
            client.list_tags,
            Resource=fn["FunctionArn"]
        )

        resource = {

            "service": "lambda",

            "resource_type":
                "lambda_function",

            "resource_id":
                fn.get("FunctionArn"),

            "resource_name":
                fn.get("FunctionName"),

            "arn":
                fn.get("FunctionArn"),

            "region":
                region,

            "configuration": {

                "runtime":
                    fn.get("Runtime"),

                "handler":
                    fn.get("Handler"),

                "role":
                    fn.get("Role"),

                "timeout":
                    fn.get("Timeout"),

                "memory_size":
                    fn.get("MemorySize"),

                "last_modified":
                    fn.get("LastModified"),

                "kms_key_arn":
                    fn.get("KMSKeyArn"),

                "vpc_config":
                    fn.get("VpcConfig", {}),

                "environment":
                    fn.get("Environment", {}),

                "layers":
                    fn.get("Layers", []),

                "tracing_config":
                    fn.get("TracingConfig", {}),

                "public_policy":
                    policy if policy else None
            },

            "tags":
                tags.get("Tags", {})
                if tags else {}
        }

        results.append(resource)

    logger.info(f"Lambda {region} → {len(results)} resources")

    return results