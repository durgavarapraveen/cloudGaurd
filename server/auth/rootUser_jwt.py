from datetime import datetime, timedelta, timezone
import jwt
import uuid


ALGORITHM = "HS256"


def create_access_token(
    username: str,
    secret_key: str,
    expires_in: int = 15
) -> str:

    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(username),
        "type": "access",
        "privilege": "rootUser",
        "iat": now,
        "exp": now + timedelta(minutes=expires_in),
        "jti": str(uuid.uuid4())
    }

    return jwt.encode(
        payload,
        secret_key,
        algorithm=ALGORITHM
    )


def create_refresh_token(
    username: str,
    secret_key: str,
    expires_in: int = 7
) -> str:

    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(username),
        "type": "refresh",

        "iat": now,
        "exp": now + timedelta(days=expires_in),

        "jti": str(uuid.uuid4())
    }

    return jwt.encode(
        payload,
        secret_key,
        algorithm=ALGORITHM
    )
    
def verify_token(
    token: str,
    secret_key: str,
    expected_type: str
) -> dict:
    try:
        payload = jwt.decode(
            token,
            secret_key,
            algorithms=[ALGORITHM]
        )

        if payload.get("type") != expected_type:
            raise jwt.InvalidTokenError("Invalid token type")

        return payload

    except jwt.ExpiredSignatureError:
        raise Exception("Token has expired")
    except jwt.InvalidTokenError as e:
        raise Exception(f"Invalid token: {str(e)}")
    
def invalidate_token(token: str):
    #invalidate the token
    pass

def checkRefreshTokenValidity(token: str, secret_key: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            secret_key,
            algorithms=[ALGORITHM]
        )

        if payload.get("type") != "refresh":
            raise jwt.InvalidTokenError("Invalid token type")
        
        #if Token expired 
        if payload.get("exp") < datetime.now(timezone.utc).timestamp():
            raise jwt.ExpiredSignatureError(status_code=401, detail="Please Login again")
        
        # get user id from payload
        username = payload.get("sub")

        return username

    except jwt.ExpiredSignatureError:
        raise Exception("Token has expired")
    except jwt.InvalidTokenError as e:
        raise Exception(f"Invalid token: {str(e)}")
