import boto3
import traceback


def get_session(aws_key: str, aws_secret: str):
    try:
        # aws_key = os.getenv("AWS_ACCESS_KEY_ID")
        # aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY")

        session = boto3.Session(
            aws_access_key_id=aws_key,
            aws_secret_access_key=aws_secret,
        )

        sts = session.client("sts")

        identity = sts.get_caller_identity()

        return session

    except Exception as e:
        print("AWS validation failed")
        traceback.print_exc()
        raise e