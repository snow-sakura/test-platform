from sqlalchemy import Select, or_

from .models import Project


def apply_project_filters(query: Select, search: str = "", status: str = "") -> Select:
    """对查询应用筛选条件，模拟 Django FilterSet 行为。

    Args:
        query: SQLAlchemy Select 语句
        search: 搜索关键词（匹配 name 字段，不区分大小写，类似 icontains）
        status: 状态精确匹配（对应 Django FilterSet 的 exact 查询）

    Returns:
        应用筛选后的查询
    """
    if search:
        # 模拟 Django 的 name__icontains 行为：LIKE %keyword%
        query = query.where(Project.name.ilike(f"%{search}%"))

    if status:
        # 精确匹配状态（对应 Django FilterSet 的 status 精确筛选）
        query = query.where(Project.status == status)

    return query
