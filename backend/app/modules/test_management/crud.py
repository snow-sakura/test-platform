"""测试管理模块 - 数据库 CRUD 操作"""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .filters import apply_case_filters
from .models import (
    TestManagementCase, TestManagementCaseAttachment, TestManagementCaseComment,
    TestManagementCaseStep, TestManagementPlan, TestManagementReport,
    TestManagementReview, TestManagementReviewAssignment,
    TestManagementReviewComment, TestManagementReviewTemplate,
    TestManagementReportTemplate,
    TestManagementRun, TestManagementRunCase, TestManagementRunCaseHistory,
    TestManagementSuite, TestManagementSuiteCase, TestManagementVersion,
    TestManagementVersionProject,
)


# ==============================
# 测试用例 CRUD
# ==============================


async def create_case(db: AsyncSession, project_id: int, author_id: int, data: dict) -> TestManagementCase:
    """创建测试用例（含步骤）"""
    steps_data = data.pop("steps", [])
    case = TestManagementCase(project_id=project_id, author_id=author_id, **data)
    db.add(case)
    await db.flush()

    for step_data in steps_data:
        step = TestManagementCaseStep(case_id=case.id, **step_data)
        db.add(step)
    await db.flush()
    return case


async def get_case(db: AsyncSession, case_id: int) -> TestManagementCase | None:
    """获取测试用例详情（含步骤/评论/附件）"""
    result = await db.execute(
        select(TestManagementCase)
        .where(TestManagementCase.id == case_id)
        .options(
            selectinload(TestManagementCase.steps),
            selectinload(TestManagementCase.comments),
            selectinload(TestManagementCase.attachments),
        )
    )
    return result.scalar_one_or_none()


async def get_cases(
    db: AsyncSession,
    project_id: int | None = None,
    status: str | None = None,
    priority: str | None = None,
    case_type: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[TestManagementCase], int]:
    """获取测试用例列表（分页+筛选）"""
    query = select(TestManagementCase)
    query = apply_case_filters(query, project_id, status, priority, case_type, search)
    query = query.order_by(TestManagementCase.created_at.desc())

    # 计数
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # 分页
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    cases = list(result.scalars().all())

    return cases, total


async def update_case(db: AsyncSession, case: TestManagementCase, data: dict) -> TestManagementCase:
    """更新测试用例（含步骤替换）"""
    steps_data = data.pop("steps", None)

    for key, value in data.items():
        setattr(case, key, value)

    if steps_data is not None:
        # 删除旧步骤，创建新步骤
        await db.execute(
            delete(TestManagementCaseStep).where(TestManagementCaseStep.case_id == case.id)
        )
        for step_data in steps_data:
            step = TestManagementCaseStep(case_id=case.id, **step_data)
            db.add(step)

    await db.flush()
    return case


async def delete_case(db: AsyncSession, case: TestManagementCase) -> None:
    """删除测试用例（级联删除步骤/评论/附件）"""
    await db.delete(case)
    await db.flush()


async def batch_delete_cases(db: AsyncSession, case_ids: list[int]) -> None:
    """批量删除测试用例"""
    await db.execute(
        delete(TestManagementCase).where(TestManagementCase.id.in_(case_ids))
    )
    await db.flush()


async def get_case_step_count(db: AsyncSession, case_ids: list[int]) -> dict[int, int]:
    """批量获取用例的步骤数"""
    if not case_ids:
        return {}
    result = await db.execute(
        select(TestManagementCaseStep.case_id, func.count(TestManagementCaseStep.id))
        .where(TestManagementCaseStep.case_id.in_(case_ids))
        .group_by(TestManagementCaseStep.case_id)
    )
    return dict(result.all())


async def get_case_comment_count(db: AsyncSession, case_ids: list[int]) -> dict[int, int]:
    """批量获取用例的评论数"""
    if not case_ids:
        return {}
    result = await db.execute(
        select(TestManagementCaseComment.case_id, func.count(TestManagementCaseComment.id))
        .where(TestManagementCaseComment.case_id.in_(case_ids))
        .group_by(TestManagementCaseComment.case_id)
    )
    return dict(result.all())


# ==============================
# 测试步骤 CRUD
# ==============================


async def create_step(db: AsyncSession, case_id: int, data: dict) -> TestManagementCaseStep:
    step = TestManagementCaseStep(case_id=case_id, **data)
    db.add(step)
    await db.flush()
    return step


async def update_step(db: AsyncSession, step: TestManagementCaseStep, data: dict) -> TestManagementCaseStep:
    for key, value in data.items():
        setattr(step, key, value)
    await db.flush()
    return step


async def delete_step(db: AsyncSession, step: TestManagementCaseStep) -> None:
    await db.delete(step)
    await db.flush()


async def reorder_steps(db: AsyncSession, case_id: int, step_ids: list[int]) -> None:
    """重排步骤顺序（传入有序的 step_id 列表）"""
    for idx, step_id in enumerate(step_ids):
        await db.execute(
            update(TestManagementCaseStep)
            .where(TestManagementCaseStep.id == step_id)
            .where(TestManagementCaseStep.case_id == case_id)
            .values(step_number=idx + 1)
        )
    await db.flush()


# ==============================
# 评论 CRUD
# ==============================


async def create_comment(db: AsyncSession, case_id: int, author_id: int, content: str) -> TestManagementCaseComment:
    comment = TestManagementCaseComment(case_id=case_id, author_id=author_id, content=content)
    db.add(comment)
    await db.flush()
    return comment


async def delete_comment(db: AsyncSession, comment: TestManagementCaseComment) -> None:
    await db.delete(comment)
    await db.flush()


# ==============================
# 附件 CRUD
# ==============================


async def create_attachment(
    db: AsyncSession, case_id: int, uploaded_by: int,
    filename: str, file_path: str, file_size: int,
) -> TestManagementCaseAttachment:
    attachment = TestManagementCaseAttachment(
        case_id=case_id, uploaded_by=uploaded_by,
        filename=filename, file_path=file_path, file_size=file_size,
    )
    db.add(attachment)
    await db.flush()
    return attachment


# ==============================
# 套件 CRUD
# ==============================


async def create_suite(db: AsyncSession, project_id: int, author_id: int, data: dict) -> TestManagementSuite:
    case_ids = data.pop("case_ids", [])
    suite = TestManagementSuite(project_id=project_id, author_id=author_id, **data)
    db.add(suite)
    await db.flush()

    for idx, case_id in enumerate(case_ids):
        db.add(TestManagementSuiteCase(suite_id=suite.id, case_id=case_id, order=idx))
    await db.flush()
    return suite


async def get_suite(db: AsyncSession, suite_id: int) -> TestManagementSuite | None:
    result = await db.execute(
        select(TestManagementSuite)
        .where(TestManagementSuite.id == suite_id)
        .options(selectinload(TestManagementSuite.case_links))
    )
    return result.scalar_one_or_none()


async def get_suites(db: AsyncSession, project_id: int, skip: int = 0, limit: int = 20) -> tuple[list[TestManagementSuite], int]:
    query = select(TestManagementSuite).where(TestManagementSuite.project_id == project_id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(TestManagementSuite.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_suite(db: AsyncSession, suite: TestManagementSuite, data: dict) -> TestManagementSuite:
    case_ids = data.pop("case_ids", None)
    for key, value in data.items():
        setattr(suite, key, value)
    if case_ids is not None:
        await db.execute(
            delete(TestManagementSuiteCase).where(TestManagementSuiteCase.suite_id == suite.id)
        )
        for idx, case_id in enumerate(case_ids):
            db.add(TestManagementSuiteCase(suite_id=suite.id, case_id=case_id, order=idx))
    await db.flush()
    return suite


async def delete_suite(db: AsyncSession, suite: TestManagementSuite) -> None:
    await db.delete(suite)
    await db.flush()


# ==============================
# 版本 CRUD
# ==============================


async def create_version(db: AsyncSession, created_by: int, data: dict) -> TestManagementVersion:
    project_ids = data.pop("project_ids", [])
    version = TestManagementVersion(created_by=created_by, **data)
    db.add(version)
    await db.flush()
    for pid in project_ids:
        db.add(TestManagementVersionProject(version_id=version.id, project_id=pid))
    await db.flush()
    return version


async def get_version(db: AsyncSession, version_id: int) -> TestManagementVersion | None:
    result = await db.execute(
        select(TestManagementVersion).where(TestManagementVersion.id == version_id)
    )
    return result.scalar_one_or_none()


async def get_versions(db: AsyncSession, project_id: int | None = None, skip: int = 0, limit: int = 20) -> tuple[list[TestManagementVersion], int]:
    query = select(TestManagementVersion)
    if project_id:
        query = query.join(TestManagementVersionProject).where(
            TestManagementVersionProject.project_id == project_id
        )
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(TestManagementVersion.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_version(db: AsyncSession, version: TestManagementVersion, data: dict) -> TestManagementVersion:
    project_ids = data.pop("project_ids", None)
    for key, value in data.items():
        setattr(version, key, value)
    if project_ids is not None:
        await db.execute(
            delete(TestManagementVersionProject).where(TestManagementVersionProject.version_id == version.id)
        )
        for pid in project_ids:
            db.add(TestManagementVersionProject(version_id=version.id, project_id=pid))
    await db.flush()
    return version


async def delete_version(db: AsyncSession, version: TestManagementVersion) -> None:
    await db.delete(version)
    await db.flush()


# ==============================
# 评审 CRUD
# ==============================


async def create_review(db: AsyncSession, creator_id: int, data: dict) -> TestManagementReview:
    reviewer_ids = data.pop("reviewer_ids", [])
    project_ids = data.pop("project_ids", [])
    case_ids = data.pop("case_ids", [])
    data.pop("template_id", None)

    review = TestManagementReview(creator_id=creator_id, **data)
    db.add(review)
    await db.flush()

    for rid in reviewer_ids:
        db.add(TestManagementReviewAssignment(review_id=review.id, reviewer_id=rid))
    for pid in project_ids:
        db.add(TestManagementReviewProject(review_id=review.id, project_id=pid))
    for cid in case_ids:
        db.add(TestManagementReviewCase(review_id=review.id, case_id=cid))
    await db.flush()

    if reviewer_ids:
        review.status = "in_progress"
        await db.flush()

    return review


async def get_review(db: AsyncSession, review_id: int) -> TestManagementReview | None:
    result = await db.execute(
        select(TestManagementReview)
        .where(TestManagementReview.id == review_id)
        .options(
            selectinload(TestManagementReview.assignments),
            selectinload(TestManagementReview.comments),
            selectinload(TestManagementReview.case_links),
        )
    )
    return result.scalar_one_or_none()


async def get_reviews(
    db: AsyncSession,
    project_id: int | None = None,
    status: str | None = None,
    reviewer_id: int | None = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[TestManagementReview], int]:
    query = select(TestManagementReview)
    if project_id:
        query = query.join(TestManagementReviewProject).where(
            TestManagementReviewProject.project_id == project_id
        )
    if status:
        query = query.where(TestManagementReview.status == status)
    if reviewer_id:
        query = query.join(TestManagementReviewAssignment).where(
            TestManagementReviewAssignment.reviewer_id == reviewer_id
        )
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(TestManagementReview.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_review(db: AsyncSession, review: TestManagementReview, data: dict) -> TestManagementReview:
    for key, value in data.items():
        setattr(review, key, value)
    await db.flush()
    return review


async def delete_review(db: AsyncSession, review: TestManagementReview) -> None:
    await db.delete(review)
    await db.flush()


async def get_my_review_tasks(db: AsyncSession, user_id: int) -> list[TestManagementReview]:
    """获取当前用户的评审任务"""
    result = await db.execute(
        select(TestManagementReview)
        .join(TestManagementReviewAssignment)
        .where(TestManagementReviewAssignment.reviewer_id == user_id)
        .where(TestManagementReview.status.in_(["draft", "in_progress"]))
        .options(
            selectinload(TestManagementReview.assignments),
        )
    )
    return list(result.scalars().all())


# ==============================
# 评审分配 CRUD
# ==============================


async def submit_review_assignment(
    db: AsyncSession,
    assignment: TestManagementReviewAssignment,
    data: dict,
) -> TestManagementReviewAssignment:
    """提交评审意见"""
    assignment.status = "completed"
    assignment.comment = data.get("comment")
    assignment.checklist_results = data.get("checklist_results")
    assignment.completed_at = datetime.utcnow()
    await db.flush()

    # 检查是否所有分配人都已完成
    review = await get_review(db, assignment.review_id)
    if review:
        all_done = all(a.status == "completed" for a in review.assignments)
        if all_done:
            review.status = "completed"
            await db.flush()

    return assignment


async def create_review_assignments(
    db: AsyncSession, review_id: int, reviewer_ids: list[int],
) -> list[TestManagementReviewAssignment]:
    """为评审批量分配评审人"""
    assignments = []
    for rid in reviewer_ids:
        assignment = TestManagementReviewAssignment(review_id=review_id, reviewer_id=rid)
        db.add(assignment)
        assignments.append(assignment)
    await db.flush()
    return assignments


# ==============================
# 执行（计划/运行）CRUD
# ==============================


async def create_plan(db: AsyncSession, creator_id: int, data: dict) -> TestManagementPlan:
    case_ids = data.pop("case_ids", [])
    assignee_ids = data.pop("assignee_ids", [])
    plan = TestManagementPlan(creator_id=creator_id, **data)
    db.add(plan)
    await db.flush()

    # 为每个执行人创建 TestRun
    assignee_ids = assignee_ids or [None]
    for assignee_id in assignee_ids:
        run = TestManagementRun(
            plan_id=plan.id,
            name=f"{plan.name} - 第1轮",
            assignee_id=assignee_id,
            status="pending",
        )
        db.add(run)
        await db.flush()

        for cid in case_ids:
            db.add(TestManagementRunCase(run_id=run.id, case_id=cid, status="untested"))
    await db.flush()
    return plan


async def get_plan(db: AsyncSession, plan_id: int) -> TestManagementPlan | None:
    result = await db.execute(
        select(TestManagementPlan).where(TestManagementPlan.id == plan_id)
        .options(selectinload(TestManagementPlan.runs))
    )
    return result.scalar_one_or_none()


async def get_plans(
    db: AsyncSession, project_id: int, skip: int = 0, limit: int = 20, search: str | None = None,
) -> tuple[list[TestManagementPlan], int]:
    query = select(TestManagementPlan).where(TestManagementPlan.project_id == project_id)
    if search:
        query = query.where(TestManagementPlan.name.ilike(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(TestManagementPlan.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query.options(selectinload(TestManagementPlan.runs)))
    plans = list(result.scalars().all())
    return plans, total


async def update_plan(db: AsyncSession, plan: TestManagementPlan, data: dict) -> TestManagementPlan:
    for key, value in data.items():
        setattr(plan, key, value)
    await db.flush()
    return plan


async def delete_plan(db: AsyncSession, plan: TestManagementPlan) -> None:
    await db.delete(plan)
    await db.flush()


async def get_runs(
    db: AsyncSession,
    plan_id: int | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[TestManagementRun], int]:
    """获取执行列表"""
    query = select(TestManagementRun)
    if plan_id:
        query = query.where(TestManagementRun.plan_id == plan_id)
    if status:
        query = query.where(TestManagementRun.status == status)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(TestManagementRun.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query.options(selectinload(TestManagementRun.run_cases)))
    runs = list(result.scalars().all())
    return runs, total


async def get_run(db: AsyncSession, run_id: int) -> TestManagementRun | None:
    result = await db.execute(
        select(TestManagementRun).where(TestManagementRun.id == run_id)
        .options(selectinload(TestManagementRun.run_cases))
    )
    return result.scalar_one_or_none()


async def update_run_case(
    db: AsyncSession, run_case: TestManagementRunCase, data: dict, executed_by: int,
) -> TestManagementRunCase:
    """更新执行用例状态并记录历史"""
    for key, value in data.items():
        setattr(run_case, key, value)
    run_case.executed_by = executed_by
    run_case.executed_at = datetime.utcnow()
    await db.flush()

    # 记录历史
    history = TestManagementRunCaseHistory(
        run_case_id=run_case.id,
        status=run_case.status,
        actual_result=run_case.actual_result,
        executed_by=executed_by,
    )
    db.add(history)
    await db.flush()

    return run_case


# ==============================
# 运行（执行轮次）CRUD
# ==============================


async def create_run(
    db: AsyncSession, plan_id: int, name: str,
    assignee_id: int | None, case_ids: list[int],
) -> TestManagementRun:
    """创建执行（从计划发起）"""
    run = TestManagementRun(
        plan_id=plan_id, name=name,
        assignee_id=assignee_id, status="pending",
    )
    db.add(run)
    await db.flush()
    for cid in case_ids:
        db.add(TestManagementRunCase(run_id=run.id, case_id=cid, status="untested"))
    await db.flush()
    return run


# ==============================
# 报告 CRUD
# ==============================


async def create_report(db: AsyncSession, project_id: int, created_by: int, data: dict) -> TestManagementReport:
    report = TestManagementReport(project_id=project_id, created_by=created_by, **data)
    db.add(report)
    await db.flush()
    return report


async def get_report(db: AsyncSession, report_id: int) -> TestManagementReport | None:
    result = await db.execute(
        select(TestManagementReport).where(TestManagementReport.id == report_id)
    )
    return result.scalar_one_or_none()


async def get_reports(db: AsyncSession, project_id: int, skip: int = 0, limit: int = 20) -> tuple[list[TestManagementReport], int]:
    query = select(TestManagementReport).where(TestManagementReport.project_id == project_id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(TestManagementReport.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def delete_report(db: AsyncSession, report: TestManagementReport) -> None:
    await db.delete(report)
    await db.flush()


# ==============================
# 仪表盘统计
# ==============================


async def get_test_management_dashboard_stats(
    db: AsyncSession, project_id: int | None = None, current_user_id: int | None = None,
) -> dict:
    """获取测试管理仪表盘统计数据"""
    # 用例总数
    query = select(func.count(TestManagementCase.id))
    if project_id:
        query = query.where(TestManagementCase.project_id == project_id)
    total_cases = (await db.execute(query)).scalar() or 0

    # 套件数
    query = select(func.count(TestManagementSuite.id))
    if project_id:
        query = query.where(TestManagementSuite.project_id == project_id)
    total_suites = (await db.execute(query)).scalar() or 0

    # 计划数
    query = select(func.count(TestManagementPlan.id))
    if project_id:
        query = query.where(TestManagementPlan.project_id == project_id)
    total_plans = (await db.execute(query)).scalar() or 0

    # 执行数
    query = select(func.count(TestManagementRun.id))
    if project_id:
        query = query.join(TestManagementPlan).where(TestManagementPlan.project_id == project_id)
    total_runs = (await db.execute(query)).scalar() or 0

    # 进行中评审数
    total_reviews = (await db.execute(
        select(func.count(TestManagementReview.id))
    )).scalar() or 0

    # 今日执行数（统计 TestManagementRunCase 中 executed_at 为今日的记录）
    query = select(func.count(TestManagementRunCase.id)).where(
        func.date(TestManagementRunCase.executed_at) == date.today()
    )
    if project_id:
        query = query.join(TestManagementRun, TestManagementRunCase.run_id == TestManagementRun.id)\
            .join(TestManagementPlan, TestManagementRun.plan_id == TestManagementPlan.id)\
            .where(TestManagementPlan.project_id == project_id)
    today_executions = (await db.execute(query)).scalar() or 0

    # 我的待审评审数
    my_pending_reviews = 0
    if current_user_id:
        my_pending_reviews = (await db.execute(
            select(func.count(TestManagementReviewAssignment.id))
            .where(TestManagementReviewAssignment.reviewer_id == current_user_id)
            .where(TestManagementReviewAssignment.status == "pending")
        )).scalar() or 0

    # 通过率（通过的 / 通过的 + 失败的）
    pass_rate = 0.0
    passed_q = select(func.count(TestManagementRunCase.id)).where(TestManagementRunCase.status == "passed")
    failed_q = select(func.count(TestManagementRunCase.id)).where(TestManagementRunCase.status == "failed")
    if project_id:
        passed_q = passed_q.join(TestManagementRun, TestManagementRunCase.run_id == TestManagementRun.id)\
            .join(TestManagementPlan, TestManagementRun.plan_id == TestManagementPlan.id)\
            .where(TestManagementPlan.project_id == project_id)
        failed_q = failed_q.join(TestManagementRun, TestManagementRunCase.run_id == TestManagementRun.id)\
            .join(TestManagementPlan, TestManagementRun.plan_id == TestManagementPlan.id)\
            .where(TestManagementPlan.project_id == project_id)
    total_passed = (await db.execute(passed_q)).scalar() or 0
    total_failed = (await db.execute(failed_q)).scalar() or 0
    total_executed = total_passed + total_failed
    if total_executed > 0:
        pass_rate = total_passed / total_executed

    return {
        "total_cases": total_cases,
        "total_suites": total_suites,
        "total_plans": total_plans,
        "total_runs": total_runs,
        "total_reviews": total_reviews,
        "my_pending_reviews": my_pending_reviews,
        "pass_rate": pass_rate,
        "today_executions": today_executions,
    }


# ==============================
# 评审模板 CRUD
# ==============================


async def get_review_templates(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[TestManagementReviewTemplate]:
    """获取评审模板列表"""
    result = await db.execute(
        select(TestManagementReviewTemplate).offset(skip).limit(limit).order_by(TestManagementReviewTemplate.id)
    )
    return list(result.scalars().all())


async def get_review_template(db: AsyncSession, template_id: int) -> TestManagementReviewTemplate | None:
    """获取单个评审模板"""
    return await db.get(TestManagementReviewTemplate, template_id)


async def create_review_template(db: AsyncSession, data: dict) -> TestManagementReviewTemplate:
    """创建评审模板"""
    tmpl = TestManagementReviewTemplate(**data)
    db.add(tmpl)
    await db.flush()
    return tmpl


async def update_review_template(db: AsyncSession, tmpl: TestManagementReviewTemplate, data: dict) -> TestManagementReviewTemplate:
    """更新评审模板"""
    for key, value in data.items():
        setattr(tmpl, key, value)
    await db.flush()
    return tmpl


async def delete_review_template(db: AsyncSession, tmpl: TestManagementReviewTemplate) -> None:
    """删除评审模板"""
    await db.delete(tmpl)


# ==============================
# 报告模板 CRUD
# ==============================


async def get_report_templates(db: AsyncSession, skip: int = 0, limit: int = 100):
    """获取报告模板列表"""
    from .models import TestManagementReportTemplate
    result = await db.execute(
        select(TestManagementReportTemplate).offset(skip).limit(limit).order_by(TestManagementReportTemplate.id)
    )
    return list(result.scalars().all())


async def get_report_template(db: AsyncSession, template_id: int):
    """获取单个报告模板"""
    from .models import TestManagementReportTemplate
    return await db.get(TestManagementReportTemplate, template_id)


async def create_report_template(db: AsyncSession, data: dict):
    """创建报告模板"""
    from .models import TestManagementReportTemplate
    tmpl = TestManagementReportTemplate(**data)
    db.add(tmpl)
    await db.flush()
    return tmpl


async def delete_report_template(db: AsyncSession, tmpl):
    """删除报告模板"""
    await db.delete(tmpl)


async def update_report_template(db: AsyncSession, tmpl, data: dict):
    """更新报告模板"""
    from .models import TestManagementReportTemplate
    for key, value in data.items():
        setattr(tmpl, key, value)
    await db.flush()
    return tmpl
