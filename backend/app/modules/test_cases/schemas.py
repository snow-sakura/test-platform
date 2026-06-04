"""测试用例相关的 Pydantic 请求/响应模型"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_serializer


class TestCaseStep(BaseModel):
    """测试步骤模型"""
    step: str
    expected_result: str


class TestCaseCreate(BaseModel):
    """创建测试用例请求"""
    test_point_id: int
    title: str
    precondition: Optional[str] = None
    steps: list[TestCaseStep] = []
    expected_result: Optional[str] = None
    priority: str = "MEDIUM"
    case_type: Optional[str] = None


class TestCaseUpdate(BaseModel):
    """更新测试用例请求（所有字段可选）"""
    title: Optional[str] = None
    precondition: Optional[str] = None
    steps: Optional[list[TestCaseStep]] = None
    expected_result: Optional[str] = None
    priority: Optional[str] = None
    case_type: Optional[str] = None


class TestCaseResponse(BaseModel):
    """测试用例响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    test_point_id: int
    case_number: str | None = None
    title: str
    precondition: str | None = None
    steps: list | None = None
    expected_result: str | None = None
    priority: str
    case_type: str | None = None
    created_at: datetime | None = None

    @field_serializer("created_at")
    def serialize_datetime(self, value: datetime | None) -> str | None:
        return value.strftime("%Y-%m-%d %H:%M:%S") if value else None
