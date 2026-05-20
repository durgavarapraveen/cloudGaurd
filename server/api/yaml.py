from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from yaml_loader.yaml_loader import (
    delete_policy,
    edit_policy_by_id,
    get_policies,
    get_policy_by_id,
    get_policy_by_provider,
    store_yaml,
)

from middlewares.userPermissions import require_permission

router = APIRouter(
    prefix="/yaml",
    tags=["YAML Loader"],
)


class YAMLUploadRequest(BaseModel):
    provider: str
    service: str
    yaml_content: str


@router.post(
    "/upload",
    dependencies=[Depends(require_permission("yaml:upload"))],
    include_in_schema=False,
)
@router.post("/upload/", dependencies=[Depends(require_permission("yaml:upload"))])
async def upload_yaml(request: YAMLUploadRequest):
    try:
        document_id = await store_yaml(
            request.provider,
            request.service,
            request.yaml_content,
        )
        return {"message": "YAML content stored successfully", "id": document_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/policies",
    dependencies=[Depends(require_permission("yaml:policies:read"))],
)
async def get_yaml_policies(provider: str = None, service: str = None):
    resources = await get_policies(provider.lower() if provider else None, service)
    return {"resources": resources}


@router.get(
    "/policies/{provider}",
    dependencies=[Depends(require_permission("yaml:policies:read"))],
)
async def get_yaml_policies_by_provider(provider: str):
    resources = await get_policy_by_provider(provider.lower())
    return {"resources": resources}


@router.delete(
    "/policies/{document_id}",
    dependencies=[Depends(require_permission("yaml:policies:delete"))],
)
async def delete_yaml_policy(document_id: str):
    try:
        deleted = await delete_policy(document_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Policy not found")
        return {"message": "Policy deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/policy/{document_id}",
    dependencies=[Depends(require_permission("yaml:policies:read"))],
)
async def get_yaml_policy(document_id: str):
    try:
        policy = await get_policy_by_id(document_id)
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        return {"policy": policy}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put(
    "/policy/{document_id}",
    dependencies=[Depends(require_permission("yaml:policies:edit"))],
)
async def edit_yaml_policy(document_id: str, request: YAMLUploadRequest):
    try:
        updated = await edit_policy_by_id(
            document_id,
            request.provider,
            request.service,
            request.yaml_content,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Policy not found")
        return {
            "message": "Policy updated successfully",
            "id": document_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
