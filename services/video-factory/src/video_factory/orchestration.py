from __future__ import annotations

from collections.abc import Callable
from typing import Any, TypeVar, cast

F = TypeVar("F", bound=Callable[..., Any])

try:
    from prefect import flow as prefect_flow
    from prefect import task as prefect_task
except ImportError:  # Local core mode intentionally works without Prefect installed.
    prefect_flow = None
    prefect_task = None


def flow(*decorator_args: Any, **decorator_kwargs: Any) -> Callable[[F], F] | F:
    if prefect_flow is not None:
        return cast(Any, prefect_flow)(*decorator_args, **decorator_kwargs)

    if decorator_args and callable(decorator_args[0]) and len(decorator_args) == 1:
        return cast(F, decorator_args[0])

    def decorator(function: F) -> F:
        return function

    return decorator


def task(*decorator_args: Any, **decorator_kwargs: Any) -> Callable[[F], F] | F:
    if prefect_task is not None:
        return cast(Any, prefect_task)(*decorator_args, **decorator_kwargs)

    if decorator_args and callable(decorator_args[0]) and len(decorator_args) == 1:
        return cast(F, decorator_args[0])

    def decorator(function: F) -> F:
        return function

    return decorator
