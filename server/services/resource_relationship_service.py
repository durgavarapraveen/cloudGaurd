from aiohttp import ClientError
from fastapi import HTTPException, Request
from datetime import datetime, date
from uuid import UUID
import json
import hashlib
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from models.resource_relationship_model import ResourceRelationShip
from models.relationship_rules_model import RelationShipRule
from models.resources_model import Resources

async def build_relationships_service(db: AsyncSession, cloud_account_id: str , organizationId: str):
    
    resources = await db.execute(
        select(Resources).where(
            Resources.cloud_account_id == cloud_account_id,
            Resources.is_deleted == False
        )
    )

    resources = resources.scalars().all()
    
    for r in resources:
        print(r.__dict__)
    
    
    resource_index = {}
    for r in resources:
        resource_index[
            (r.service, r.resource_id)
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
            print(source)
            values = extract_values(
                source.configuration,
                rule.source_field
            )
            print(f"rule .................{values}")

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
            
    print(relationships)
            
    
    
def extract_values(data, path):

    keys = path.split(".")

    current = data

    for key in keys:

        #
        # Array syntax
        #

        if "[]" in key:

            key = key.replace("[]", "")

            arr = current.get(key, [])

            result = []

            remaining = ".".join(
                keys[keys.index(key + "[]") + 1:]
            )

            for item in arr:

                value = extract_values(
                    item,
                    remaining
                )

                if isinstance(value, list):
                    result.extend(value)
                elif value:
                    result.append(value)

            return result

        if not isinstance(current, dict):
            return None

        current = current.get(key)

        if current is None:
            return None

    return current

