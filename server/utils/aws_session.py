import boto3
import os
import traceback


def get_session():
    try:
        aws_key = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY")
        aws_region = os.getenv("AWS_REGION")

        session = boto3.Session(
            aws_access_key_id=aws_key,
            aws_secret_access_key=aws_secret,
            region_name=aws_region
        )

        sts = session.client("sts")

        identity = sts.get_caller_identity()

        return session

    except Exception as e:
        print("AWS validation failed")
        traceback.print_exc()
        raise e