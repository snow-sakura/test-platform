"""手工测试全生命周期管理 - API 路由"""
from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.modules.auth.dependencies import get_current_user

from .crud import (
    batch_delete_cases, create_attachment, create_case, create_comment,
    create_report, create_review, create_step, create_suite, create_version,
    delete_case, delete_comment, delete_report, delete_review,
    delete_step, delete_suite, delete_version, get_case,
    get_case_comment_count, get_case_step_count, get_cases,
    get_my_review_tasks, get_plan, get_plans, get_report, get_review,
    get_reviews, get_run, get_reports, get_suite, get_suites,
    get_test_management_dashboard_stats, get_version, get_versions,
    submit_review_assignment, update_case, update_plan, update_report,
    update_review, update_run_case, update_step, update_suite,
    update_version,
)
from .models import (
    TestManagementCaseAttachment, TestManagementCaseComment,
    TestManagementCaseStep, TestManagementReviewAssignment,
    TestManagementRunCase,
)
from .schemas import (
    PlanCreate, PlanResponse, PlanUpdate,
    ReportCreate, ReportResponse,
    ReviewCommentCreate, ReviewCommentResponse,
    ReviewCreate, ReviewDetailResponse, ReviewResponse,
    ReviewTemplateCreate, ReviewTemplateResponse,
    ReviewUpdate, RunCaseUpdate, RunResponse,
    TestCaseAttachmentResponse, TestCaseCommentCreate,
    TestCaseCommentResponse, TestCaseCreate, TestCaseDetailResponse,
    TestCaseListResponse, TestCaseStepResponse, TestCaseUpdate,
    TestManagementDashboardStats, TestSuiteCreate, TestSuiteDetailResponse,
    TestSuiteResponse, TestSuiteUpdate, VersionCreate, VersionResponse,
    VersionUpdate,
)

router = APIRouter(
    prefix="/api/test-management",
    dependencies=[Depends(get_current_user)],
    tags=["test-management"],
)


# ==============================
# 仪表盘
# ==============================


@router.get("/dashboard/stats", response_model=TestManagementDashboardStats)
async def dashboard_stats(
    project_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """获取测试管理仪表盘统计"""
    return await get_test_management_dashboard_stats(db, project_id)


# ==============================
# 测试用例 CRUD
# ==============================


@router.get("/cases", response_model=dict)
async def list_cases(
    project_id: int = Query(..., description="项目 ID"),
    status: str | None = Query(None),
    priority: str | None = Query(None),
    case_type: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取项目下的测试用例列表（分页+筛选）"""
    skip = (page - 1) * page_size
    cases, total = await get_cases(db, project_id, status, priority, case_type, search, skip, page_size)

    # 批量计算步骤数和评论数
    case_ids = [c.id for c in cases]
    step_counts = await get_case_step_count(db, case_ids) if case_ids else {}
    comment_counts = await get_case_comment_count(db, case_ids) if case_ids else {}

    items = []
    for c in cases:
        item = TestCaseListResponse.model_validate(c)
        item.step_count = step_counts.get(c.id, 0)
        item.comment_count = comment_counts.get(c.id, 0)
        items.append(item)

    return {"count": total, "results": items}


@router.get("/cases/{case_id}", response_model=TestCaseDetailResponse)
async def retrieve_case(case_id: int, db: AsyncSession = Depends(get_db)):
    """获取测试用例详情"""
    case = await get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    return TestCaseDetailResponse.model_validate(case)


@router.post("/cases", response_model=TestCaseDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_new_case(
    project_id: int = Query(..., description="项目 ID"),
    data: TestCaseCreate = ...,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """创建测试用例"""
    case = await create_case(db, project_id, current_user.id, data.model_dump())
    case = await get_case(db, case.id)  # 重新加载关联数据
    return TestCaseDetailResponse.model_validate(case)


@router.put("/cases/{case_id}", response_model=TestCaseDetailResponse)
async def update_existing_case(
    case_id: int,
    data: TestCaseUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新测试用例"""
    case = await get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    await update_case(db, case, data.model_dump(exclude_unset=True, mode="json"))
    case = await get_case(db, case_id)
    return TestCaseDetailResponse.model_validate(case)


@router.delete("/cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_case(case_id: int, db: AsyncSession = Depends(get_db)):
    """删除测试用例"""
    case = await get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    await delete_case(db, case)


@router.post("/cases/batch-delete", status_code=status.HTTP_204_NO_CONTENT)
async def batch_delete_cases_endpoint(
    ids: list[int],
    db: AsyncSession = Depends(get_db),
):
    """批量删除测试用例"""
    await batch_delete_cases(db, ids)


# ==============================
# 测试步骤
# ==============================


@router.post("/cases/{case_id}/steps", response_model=TestCaseStepResponse, status_code=status.HTTP_201_CREATED)
async def create_new_step(
    case_id: int,
    step_number: int = Query(...),
    action: str = Query(...),
    expected_result: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """添加测试步骤"""
    case = await get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    step = await create_step(db, case_id, {
        "step_number": step_number, "action": action, "expected_result": expected_result,
    })
    return TestCaseStepResponse.model_validate(step)


@router.put("/cases/{case_id}/steps/{step_id}", response_model=TestCaseStepResponse)
async def update_existing_step(
    case_id: int, step_id: int, data: dict,
    db: AsyncSession = Depends(get_db),
):
    """更新测试步骤"""
    step = await db.get(TestManagementCaseStep, step_id)
    if not step or step.case_id != case_id:
        raise HTTPException(status_code=404, detail="步骤不存在")
    step = await update_step(db, step, data)
    return TestCaseStepResponse.model_validate(step)


@router.delete("/cases/{case_id}/steps/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_step(
    case_id: int, step_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除测试步骤"""
    step = await db.get(TestManagementCaseStep, step_id)
    if not step or step.case_id != case_id:
        raise HTTPException(status_code=404, detail="步骤不存在")
    await delete_step(db, step)


# ==============================
# 评论
# ==============================


@router.get("/cases/{case_id}/comments", response_model=list[TestCaseCommentResponse])
async def list_case_comments(case_id: int, db: AsyncSession = Depends(get_db)):
    """获取用例评论"""
    case = await get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    return [TestCaseCommentResponse.model_validate(c) for c in case.comments]


@router.post("/cases/{case_id}/comments", response_model=TestCaseCommentResponse, status_code=status.HTTP_201_CREATED)
async def create_case_comment(
    case_id: int,
    data: TestCaseCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """添加评论"""
    case = await get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    comment = await create_comment(db, case_id, current_user.id, data.content)
    return TestCaseCommentResponse.model_validate(comment)


@router.delete("/cases/{case_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case_comment(
    case_id: int, comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """删除评论"""
    comment = await db.get(TestManagementCaseComment, comment_id)
    if not comment or comment.case_id != case_id:
        raise HTTPException(status_code=404, detail="评论不存在")
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能删除自己的评论")
    await delete_comment(db, comment)


# ==============================
# 附件上传
# ==============================


@router.post("/cases/{case_id}/attachments", response_model=TestCaseAttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_case_attachment(
    case_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """上传测试用例附件"""
    case = await get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")

    # 保存文件
    upload_dir = Path(settings.MEDIA_ROOT) / "test_management" / str(case_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix if file.filename else ""
    saved_name = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / saved_name

    content = await file.read()
    file_path.write_bytes(content)

    # 创建记录
    from .crud import create_attachment
    attachment = await create_attachment(
        db, case_id, current_user.id,
        filename=file.filename or saved_name,
        file_path=str(file_path.relative_to(Path(settings.MEDIA_ROOT).parent)),
        file_size=len(content),
    )
    return TestCaseAttachmentResponse.model_validate(attachment)


@router.delete("/cases/{case_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case_attachment(
    case_id: int, attachment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除附件"""
    att = await db.get(TestManagementCaseAttachment, attachment_id)
    if not att or att.case_id != case_id:
        raise HTTPException(status_code=404, detail="附件不存在")
    # 删除文件
    file_path = Path(settings.MEDIA_ROOT).parent / att.file_path
    if file_path.exists():
        file_path.unlink()
    await db.delete(att)
    await db.flush()


# ==============================
# 测试套件
# ==============================


@router.get("/suites", response_model=dict)
async def list_suites(
    project_id: int = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取项目下的测试套件列表"""
    skip = (page - 1) * page_size
    suites, total = await get_suites(db, project_id, skip, page_size)
    items = []
    for s in suites:
        item = TestSuiteResponse.model_validate(s)
        item.case_count = len(s.case_links) if s.case_links else 0
        items.append(item)
    return {"count": total, "results": items}


@router.get("/suites/{suite_id}", response_model=TestSuiteDetailResponse)
async def retrieve_suite(suite_id: int, db: AsyncSession = Depends(get_db)):
    """获取套件详情"""
    suite = await get_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")
    resp = TestSuiteDetailResponse.model_validate(suite)
    resp.case_count = len(suite.case_links) if suite.case_links else 0
    return resp


@router.post("/suites", response_model=TestSuiteResponse, status_code=status.HTTP_201_CREATED)
async def create_new_suite(
    project_id: int = Query(...),
    data: TestSuiteCreate = ...,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """创建测试套件"""
    suite = await create_suite(db, project_id, current_user.id, data.model_dump())
    return TestSuiteResponse.model_validate(suite)


@router.put("/suites/{suite_id}", response_model=TestSuiteResponse)
async def update_existing_suite(suite_id: int, data: TestSuiteUpdate, db: AsyncSession = Depends(get_db)):
    """更新套件"""
    suite = await get_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")
    suite = await update_suite(db, suite, data.model_dump(exclude_unset=True, mode="json"))
    return TestSuiteResponse.model_validate(suite)


@router.delete("/suites/{suite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_suite(suite_id: int, db: AsyncSession = Depends(get_db)):
    """删除套件"""
    suite = await get_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")
    await delete_suite(db, suite)


# ==============================
# 版本管理
# ==============================


@router.get("/versions", response_model=dict)
async def list_versions(
    project_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取版本列表"""
    skip = (page - 1) * page_size
    versions, total = await get_versions(db, project_id, skip, page_size)
    return {
        "count": total,
        "results": [VersionResponse.model_validate(v) for v in versions],
    }


@router.post("/versions", response_model=VersionResponse, status_code=status.HTTP_201_CREATED)
async def create_new_version(
    data: VersionCreate = ...,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """创建版本"""
    version = await create_version(db, current_user.id, data.model_dump())
    return VersionResponse.model_validate(version)


@router.put("/versions/{version_id}", response_model=VersionResponse)
async def update_existing_version(version_id: int, data: VersionUpdate, db: AsyncSession = Depends(get_db)):
    """更新版本"""
    version = await get_version(db, version_id)
    if not version:
        raise HTTPException(status_code=404, detail="版本不存在")
    version = await update_version(db, version, data.model_dump(exclude_unset=True, mode="json"))
    return VersionResponse.model_validate(version)


@router.delete("/versions/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_version(version_id: int, db: AsyncSession = Depends(get_db)):
    """删除版本"""
    version = await get_version(db, version_id)
    if not version:
        raise HTTPException(status_code=404, detail="版本不存在")
    await delete_version(db, version)


# ==============================
# 评审管理
# ==============================


@router.get("/reviews", response_model=dict)
async def list_reviews(
    project_id: int | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取评审列表"""
    skip = (page - 1) * page_size
    reviews, total = await get_reviews(db, project_id, status, skip=skip, limit=page_size)
    return {
        "count": total,
        "results": [ReviewResponse.model_validate(r) for r in reviews],
    }


@router.get("/reviews/my-tasks", response_model=list[ReviewResponse])
async def my_review_tasks(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """获取我的评审任务"""
    reviews = await get_my_review_tasks(db, current_user.id)
    return [ReviewResponse.model_validate(r) for r in reviews]


@router.get("/reviews/{review_id}", response_model=ReviewDetailResponse)
async def retrieve_review(review_id: int, db: AsyncSession = Depends(get_db)):
    """获取评审详情"""
    review = await get_review(db, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="评审不存在")
    resp = ReviewDetailResponse.model_validate(review)
    resp.case_count = len(review.case_links) if review.case_links else 0
    total = len(review.assignments) if review.assignments else 0
    completed = sum(1 for a in review.assignments if a.status == "completed") if review.assignments else 0
    resp.progress = {"total": total, "completed": completed, "pending": total - completed}
    return resp


@router.post("/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_new_review(
    data: ReviewCreate = ...,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """创建评审"""
    review = await create_review(db, current_user.id, data.model_dump())
    return ReviewResponse.model_validate(review)


@router.put("/reviews/{review_id}", response_model=ReviewResponse)
async def update_existing_review(review_id: int, data: ReviewUpdate, db: AsyncSession = Depends(get_db)):
    """更新评审"""
    review = await get_review(db, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="评审不存在")
    review = await update_review(db, review, data.model_dump(exclude_unset=True, mode="json"))
    return ReviewResponse.model_validate(review)


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_review(review_id: int, db: AsyncSession = Depends(get_db)):
    """删除评审"""
    review = await get_review(db, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="评审不存在")
    await delete_review(db, review)


@router.post("/reviews/{review_id}/submit")
async def submit_review(
    review_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """提交评审意见"""
    result = await db.execute(
        select(TestManagementReviewAssignment)
        .where(TestManagementReviewAssignment.review_id == review_id)
        .where(TestManagementReviewAssignment.reviewer_id == current_user.id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="未找到评审分配记录")
    await submit_review_assignment(db, assignment, data)
    return {"message": "评审已提交"}


# ==============================
# 执行管理
# ==============================


@router.get("/plans", response_model=dict)
async def list_plans(
    project_id: int = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取测试计划列表"""
    skip = (page - 1) * page_size
    plans, total = await get_plans(db, project_id, skip, page_size)
    items = []
    for p in plans:
        item = PlanResponse.model_validate(p)
        item.run_count = len(p.runs) if p.runs else 0
        items.append(item)
    return {"count": total, "results": items}


@router.post("/plans", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_new_plan(
    data: PlanCreate = ...,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """创建测试计划"""
    plan = await create_plan(db, current_user.id, data.model_dump())
    return PlanResponse.model_validate(plan)


@router.put("/plans/{plan_id}", response_model=PlanResponse)
async def update_existing_plan(plan_id: int, data: PlanUpdate, db: AsyncSession = Depends(get_db)):
    """更新计划"""
    plan = await get_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="计划不存在")
    await update_plan(db, plan, data.model_dump(exclude_unset=True, mode="json"))
    return PlanResponse.model_validate(plan)


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    """删除计划"""
    plan = await get_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="计划不存在")
    await delete_plan(db, plan)


@router.get("/runs/{run_id}", response_model=RunResponse)
async def retrieve_run(run_id: int, db: AsyncSession = Depends(get_db)):
    """获取执行详情"""
    run = await get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="执行不存在")
    resp = RunResponse.model_validate(run)
    cases = run.run_cases or []
    resp.total_cases = len(cases)
    resp.passed = sum(1 for c in cases if c.status == "passed")
    resp.failed = sum(1 for c in cases if c.status == "failed")
    resp.blocked = sum(1 for c in cases if c.status == "blocked")
    resp.untested = sum(1 for c in cases if c.status == "untested")
    return resp


@router.put("/runs/{run_id}/cases/{run_case_id}")
async def update_run_case_status(
    run_id: int, run_case_id: int,
    data: RunCaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """更新执行用例状态"""
    run_case = await db.get(TestManagementRunCase, run_case_id)
    if not run_case or run_case.run_id != run_id:
        raise HTTPException(status_code=404, detail="执行用例不存在")
    await update_run_case(db, run_case, data.model_dump(exclude_unset=True, mode="json"), current_user.id)
    return {"message": "状态已更新"}


# ==============================
# 报告管理
# ==============================


@router.get("/reports", response_model=dict)
async def list_reports(
    project_id: int = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取报告列表"""
    skip = (page - 1) * page_size
    reports, total = await get_reports(db, project_id, skip, page_size)
    return {
        "count": total,
        "results": [ReportResponse.model_validate(r) for r in reports],
    }


@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_new_report(
    project_id: int = Query(...),
    data: ReportCreate = ...,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """创建报告"""
    report = await create_report(db, project_id, current_user.id, data.model_dump())
    return ReportResponse.model_validate(report)


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_report(report_id: int, db: AsyncSession = Depends(get_db)):
    """删除报告"""
    report = await get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    await delete_report(db, report)
