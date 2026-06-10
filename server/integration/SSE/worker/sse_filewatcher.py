# # backend/workers/file_watcher.py

# import asyncio
# import json
# from pathlib import Path
# from watchfiles import awatch
# from sse_manager import manager

# WATCH_DIR = "./watched_files"

# async def watch_files():
#     async for changes in awatch(WATCH_DIR):
#         for change_type, path in changes:
#             event_data = json.dumps({
#                 "type": change_type.name,   # ADDED, MODIFIED, DELETED
#                 "file": Path(path).name,
#                 "path": path,
#             })
#             # In real app, resolve which user owns this path
#             # For now, broadcast to all
#             await manager.broadcast("file_change", event_data)