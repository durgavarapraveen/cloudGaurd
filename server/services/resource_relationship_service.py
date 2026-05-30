from aiohttp import ClientError
from fastapi import HTTPException, Request
from datetime import datetime, date
from uuid import UUID
import json
import hashlib
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from models.resource_relationship_model import ResourceRelationShip
from models.relationship_rules_model import RelationShipRule
from models.resources_model import Resources

from repository.cloudAccount_repository import getCloudAccountwithIdentifier_Repository

async def build_relationships_service(db: AsyncSession, cloud_account_id: str):
    
    resources = await db.execute(
        select(Resources).where(
            Resources.cloud_account_id == cloud_account_id,
            Resources.is_deleted == False,
        )
    )

    resources = resources.scalars().all()
    
    resource_index = {}
    for r in resources:
        resource_index[
            (r.resource_type, r.resource_id)
        ] = r
        
    
    await db.execute(
        delete(ResourceRelationShip).where(
            ResourceRelationShip.cloud_account_id == cloud_account_id
        )
    )
    
    rules = await db.execute(
        select(RelationShipRule)
    )

    rules = rules.scalars().all()
    
    relationships = []

    for rule in rules:
        source_resources = [
            r for r in resources
            if r.resource_type == rule.source_type
        ]
        
        for source in source_resources:
            values = extract_values(
                source,
                rule.target_field
            )
            
            print(f"{source.resource_type} => {values}")

            if not values:
                continue

            if not isinstance(values, list):
                values = [values]

            for value in values:

                target = resource_index.get(
                    (
                        rule.target_type,
                        value
                    )
                )

                if target:
                    
                    relationships.append(
                        ResourceRelationShip(
                            source_id=source.id,
                            target_id=target.id,
                            relation=rule.relation,
                            cloud_account_id=source.cloud_account_id,
                            organization_id=source.organization_id
                        )
                    )
            
    if relationships:
        db.add_all(relationships)
        await db.commit()
            
    
    
def extract_values(data, path):

    keys = path.split(".")
    current = data

    for i, key in enumerate(keys):

        #
        # Array syntax
        #

        if "[]" in key:

            clean_key = key.replace("[]", "")

            arr = get_value(current, clean_key) or []

            result = []

            remaining = ".".join(keys[i + 1:])

            for item in arr:

                value = extract_values(
                    item,
                    remaining
                )

                if isinstance(value, list):
                    result.extend(value)

                elif value is not None:
                    result.append(value)

            return result

        #
        # Normal access
        #

        current = get_value(current, key)

        if current is None:
            return None

    return current


def get_value(obj, key):

    if isinstance(obj, dict):
        return obj.get(key)

    return getattr(obj, key, None)


async def get_relation_resource_service(db: AsyncSession, cloudIdentifier: str, resource_id: str, request: Request):
    cloud = await getCloudAccountwithIdentifier_Repository(db=db, indentifier=cloudIdentifier, request=request)
    
    if not cloud:
        raise HTTPException(status_code = 404, detail="No cloud account Found")
    
    relations = await db.execute(
        select(ResourceRelationShip)
        .where(ResourceRelationShip.cloud_account_id == cloud.id, ResourceRelationShip.source_id == resource_id)
        .options(selectinload(ResourceRelationShip.source), selectinload(ResourceRelationShip.target))
    )
    
    relations = relations.scalars().all()
    return relations

async def get_relation_resource_account(db: AsyncSession, cloudIdentifier: str,request: Request):
    cloud = await getCloudAccountwithIdentifier_Repository(db=db, indentifier=cloudIdentifier, request=request)
    
    if not cloud:
        raise HTTPException(status_code = 404, detail="No cloud account Found")
    
    relations = await db.execute(
        select(ResourceRelationShip)
        .where(ResourceRelationShip.cloud_account_id == cloud.id)
        .options(selectinload(ResourceRelationShip.source), selectinload(ResourceRelationShip.target))
    )
    
    relations = relations.scalars().all()
    return relations