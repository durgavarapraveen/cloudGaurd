from cachetools import TTLCache

organization_Id = TTLCache(
    maxsize=1000,
    ttl=600
)

