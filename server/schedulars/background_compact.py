# scheduler/background_compat.py

import asyncio
from typing import Callable, Any


class DirectBackgroundTasks:
    """
    Drop-in replacement for FastAPI's BackgroundTasks outside request context.
    Instead of queuing tasks to run after the HTTP response, runs them
    immediately as asyncio tasks (fire and forget).
    """

    def add_task(self, func: Callable, *args: Any, **kwargs: Any):
        if asyncio.iscoroutinefunction(func):
            asyncio.create_task(func(*args, **kwargs))
        else:
            loop = asyncio.get_event_loop()
            loop.run_in_executor(None, lambda: func(*args, **kwargs))