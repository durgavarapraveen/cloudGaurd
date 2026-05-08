from fastapi import Request, HTTPException

def require_permission(permission: str):
    async def checker(request: Request):
        # print(f"User ID: {request.state.user_id}")
        permissions = getattr(
            request.state,
            "permissions",
            []
        )
        print(f"User permissions: {permissions}")

        if permission not in permissions:
            raise HTTPException(
                status_code=403,
                detail="Permission denied"
            )

        return True

    return checker