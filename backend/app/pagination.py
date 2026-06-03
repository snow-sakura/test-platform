from __future__ import annotations

import math
from typing import Generic, Sequence, TypeVar

from fastapi import Query
from pydantic import BaseModel
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

T = TypeVar("T")


class PageParams:
    """分页查询参数，与 DRF PageNumberPagination 兼容"""

    def __init__(
        self,
        page: int = Query(1, ge=1, description="页码"),
        page_size: int = Query(20, ge=1, le=100, alias="page_size", description="每页条数"),
        ordering: str = Query("", description="排序字段，- 前缀表示降序"),
    ):
        self.page = page
        self.page_size = page_size
        self.ordering = ordering


class PaginatedResponse(BaseModel, Generic[T]):
    """DRF 兼容的分页响应格式"""

    count: int
    next: str | None = None
    previous: str | None = None
    results: list[T]


async def paginate(
    db: AsyncSession,
    query: Select,
    page_params: PageParams,
    schema_type: type[T],
    base_url: str = "",
) -> PaginatedResponse[T]:
    """执行分页查询，返回 DRF 兼容的分页响应。

    支持：
    - page/page_size 分页
    - ordering 排序（如 name, -created_at）
    - 自动跳过 ORDER BY 进行高效 COUNT
    """
    # 1) 查询总数（去除 ORDER BY 以优化性能）
    count_subquery = query.order_by(None).subquery()
    total = (await db.execute(select(func.count()).select_from(count_subquery))).scalar() or 0

    # 2) 处理排序
    if page_params.ordering:
        order_col_name = page_params.ordering.lstrip("-")
        is_desc = page_params.ordering.startswith("-")
        col = query.selected_columns.get(order_col_name)
        if col is not None:
            query = query.order_by(col.desc() if is_desc else col)

    # 3) 分页
    offset = (page_params.page - 1) * page_params.page_size
    query = query.offset(offset).limit(page_params.page_size)
    rows = (await db.execute(query)).scalars().all()

    # 4) 构造 next/previous 链接
    total_pages = math.ceil(total / page_params.page_size) if total > 0 else 0
    next_url = f"{base_url}?page={page_params.page + 1}&page_size={page_params.page_size}" if page_params.page < total_pages else None
    previous_url = f"{base_url}?page={page_params.page - 1}&page_size={page_params.page_size}" if page_params.page > 1 and total_pages > 0 else None

    return PaginatedResponse(
        count=total,
        next=next_url,
        previous=previous_url,
        results=[schema_type.model_validate(row) for row in rows],
    )
