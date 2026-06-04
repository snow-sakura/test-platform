"""测试用例管理 API 路由"""
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.projects.crud import get_project
from app.modules.test_points.crud import get_test_point
from app.services.excel_exporter import export_test_cases_to_excel

from .crud import (
    create_test_case, delete_test_case, get_test_case,
    get_test_cases, update_test_case,
)
from .schemas import TestCaseCreate, TestCaseResponse, TestCaseUpdate

router = APIRouter(dependencies=[Depends(get_current_user)], tags=["test_cases"])


@router.post("/test-cases/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_test_cases(
    data: dict,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """AI 生成测试用例（异步），传入 {test_point_ids, knowledge_base_ids?}"""
    from app.modules.task_batches.crud import create_batch
    from app.services.task_processor import generate_test_cases_task

    project_id = data.get("project_id")
    test_point_ids = data.get("test_point_ids", [])
    knowledge_base_ids = data.get("knowledge_base_ids", [])

    if not project_id or not test_point_ids:
        raise HTTPException(status_code=400, detail="缺少 project_id 或 test_point_ids")

    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    batch = await create_batch(
        db, project_id=project_id,
        task_type="generate_test_cases",
        total_count=len(test_point_ids),
    )

    background_tasks.add_task(
        generate_test_cases_task, batch.id, test_point_ids, knowledge_base_ids
    )

    return {"batch_id": batch.id, "message": "测试用例生成任务已提交"}


@router.get("/test-cases/project/{project_id}", response_model=list[TestCaseResponse])
async def list_test_cases(
    project_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取项目下的测试用例列表"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    cases = await get_test_cases(db, project_id)
    return [TestCaseResponse.model_validate(c) for c in cases]


@router.get("/test-cases/{case_id}", response_model=TestCaseResponse)
async def retrieve_test_case(
    case_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取测试用例详情"""
    tc = await get_test_case(db, case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    return TestCaseResponse.model_validate(tc)


@router.post("/test-cases", response_model=TestCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_new_test_case(
    project_id: int = Query(..., description="所属项目 ID"),
    data: TestCaseCreate = ...,
    db: AsyncSession = Depends(get_db),
):
    """手动创建测试用例"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    tp = await get_test_point(db, data.test_point_id)
    if not tp:
        raise HTTPException(status_code=404, detail="测试点不存在")

    # 计算该测试点下的用例序号
    existing_cases = await get_test_cases(db, project_id)
    seq = sum(1 for c in existing_cases if c.test_point_id == data.test_point_id) + 1

    tc = await create_test_case(
        db, project_id=project_id,
        test_point_id=data.test_point_id,
        title=data.title,
        precondition=data.precondition,
        steps=[s.model_dump() for s in data.steps],
        expected_result=data.expected_result,
        priority=data.priority,
        case_type=data.case_type,
        case_number=f"TC-{data.test_point_id}-{seq:03d}",
    )
    return TestCaseResponse.model_validate(tc)


@router.put("/test-cases/{case_id}", response_model=TestCaseResponse)
async def update_existing_test_case(
    case_id: int,
    data: TestCaseUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新测试用例"""
    tc = await get_test_case(db, case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="测试用例不存在")

    update_data = data.model_dump(exclude_unset=True, mode="json")
    tc = await update_test_case(db, tc, update_data)
    return TestCaseResponse.model_validate(tc)


@router.delete("/test-cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_test_case(
    case_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除测试用例"""
    tc = await get_test_case(db, case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    await delete_test_case(db, tc)


@router.get("/test-cases/export/{project_id}")
async def export_test_cases_excel(
    project_id: int,
    db: AsyncSession = Depends(get_db),
):
    """导出项目测试用例为 Excel 文件"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    cases = await get_test_cases(db, project_id)
    excel_data = export_test_cases_to_excel(cases)

    return StreamingResponse(
        BytesIO(excel_data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename=test_cases_{project_id}.xlsx'
        },
    )
