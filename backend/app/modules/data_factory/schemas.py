"""数据工厂 - Pydantic schemas"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator


class ToolParam(BaseModel):
    """工具参数定义"""
    name: str
    label: str
    type: str = "string"  # string / number / boolean / json / text
    required: bool = False
    default: Any = None
    placeholder: str = ""
    options: list[dict[str, str]] | None = None  # [{label, value}]


class ToolInfo(BaseModel):
    """工具信息"""
    name: str
    label: str
    description: str
    category: str
    params: list[ToolParam] = []


class ToolCategory(BaseModel):
    """工具分类"""
    name: str
    label: str
    icon: str = ""
    tools: list[ToolInfo] = []


class ToolExecuteRequest(BaseModel):
    """工具执行请求"""
    tool_name: str
    params: dict[str, Any] = {}
    tags: str = ""


class BatchExecuteRequest(BaseModel):
    """批量生成请求"""
    tool_name: str
    params: dict[str, Any] = {}
    count: int = 5
    tags: str = ""


class DataFactoryRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None = None
    tool_name: str
    tool_category: str
    input_data: dict[str, Any] | None = None
    output_data: str | None = None
    tags: str | None = None
    tool_scenario: str | None = None
    is_saved: bool = False
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    @classmethod
    def datetime_to_str(cls, v: datetime | str | None) -> str | None:
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%d %H:%M:%S")
        return v


class UsageStats(BaseModel):
    total_executions: int = 0
    today_executions: int = 0
    tool_count: int = 0
    category_count: int = 0
    top_tools: list[dict[str, Any]] = []


class VariableFunction(BaseModel):
    """变量函数信息（供其他模块引用）"""
    name: str
    label: str
    description: str
    category: str
    example: str = ""
