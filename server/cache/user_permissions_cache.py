from cachetools import TTLCache

permissions_cache = TTLCache(
    maxsize=1000,
    ttl=600
)