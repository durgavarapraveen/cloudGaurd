from fastapi import Request, HTTPException

def require_permission(permission: str):

    async def checker(request: Request):

        permissions = getattr(
            request.state,
            "permissions",
            []
        )

        if permission not in permissions:
            raise HTTPException(
                status_code=403,
                detail="Permission denied"
            )

        return True

    return checker