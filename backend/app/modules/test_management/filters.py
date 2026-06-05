"""测试管理模块 - 查询条件组装"""
from __future__ import annotations

from sqlalchemy import Select, select

from .models import TestManagementCase


def apply_case_filters(
    query: Select,
    project_id: int | None = None,
    status: str | None = None,
    priority: str | None = None,
    case_type: str | None = None,
    search: str | None = None,
) -> Select:
    """组装测试用例列表的查询条件"""
    if project_id:
        query = query.where(TestManagementCase.project_id == project_id)
    if status:
        query = query.where(TestManagementCase.status == status)
    if priority:
        query = query.where(TestManagementCase.priority == priority)
    if case_type:
        query = query.where(TestManagementCase.case_type == case_type)
    if search:
        like = f"%{search}%"
        query = query.where(TestManagementCase.title.like(like))
    return query
