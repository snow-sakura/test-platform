"""AI 用例生成模块 - 核心服务

包含：LLM 调用封装、异步生成工作流、SSE 流式推送、用例解析
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime
from typing import Any

import httpx

from app.database import AsyncSessionLocal
from app.pagination import PageParams

from . import crud, models
from . import schemas

logger = logging.getLogger(__name__)

# 全局取消信号
STOP_SIGNALS: dict[str, bool] = {}

# 默认 Writer 提示词
DEFAULT_WRITER_PROMPT = """你是一个资深的测试工程师。请根据以下需求信息，生成详细的测试用例。

要求：
1. 每个用例需要包含：标题(title)、场景(scenario)、前置条件(preconditions)、测试步骤(steps)、预期结果(expected_result)、优先级(priority: HIGH/MEDIUM/LOW)
2. 测试步骤用换行分隔，每步标明序号
3. 以 Markdown 表格格式输出
4. 直接输出表格内容，不要包含无关说明

输出格式：
| 编号 | 场景 | 前置条件 | 测试步骤 | 预期结果 | 优先级 |
|------|------|----------|----------|----------|--------|
| 1 | 场景描述 | 前置条件 | 1.步骤1 2.步骤2 | 预期结果 | HIGH |"""

# 默认 Reviewer 提示词
DEFAULT_REVIEWER_PROMPT = """你是一个资深的测试评审工程师。请对以下 AI 生成的测试用例进行评审。

要求：
1. 检查用例是否覆盖了正常流程、异常流程、边界值
2. 检查步骤描述是否清晰可执行
3. 检查预期结果是否明确
4. 指出不足和改进建议
5. 以 Markdown 格式输出评审意见"""


class AIModelService:
    """封装 OpenAI 兼容 API 调用"""

    def __init__(self, config: models.AIModelConfig):
        self.api_base = config.api_base.rstrip("/")
        self.api_key = config.api_key
        self.model_name = config.model_name
        self.temperature = config.temperature
        self.max_tokens = config.max_tokens
        self.timeout = 120

    async def chat(self, messages: list[dict], stream: bool = False) -> str:
        """调用 LLM，返回完整响应文本"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "stream": stream,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.api_base}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            if stream:
                # 流式模式：逐块拼接
                full_text = ""
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        full_text += content
                    except json.JSONDecodeError:
                        continue
                return full_text
            else:
                data = response.json()
                return data["choices"][0]["message"]["content"]

    async def chat_stream(self, messages: list[dict]):
        """流式调用 LLM，逐块 yield"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "stream": True,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", f"{self.api_base}/chat/completions", headers=headers, json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue

    async def test_connection(self) -> tuple[bool, str]:
        """测试 API 连接"""
        try:
            await self.chat([
                {"role": "user", "content": "Hello"},
            ])
            return True, "连接成功"
        except Exception as e:
            return False, str(e)


# ==============================
# 异步生成工作流
# ==============================


async def generate_task_async(task_id: str):
    """后台执行 AI 用例生成任务（在独立会话中运行）"""
    async with AsyncSessionLocal() as db:
        try:
            task = await crud.get_task(db, task_id)
            if not task:
                logger.error(f"任务 {task_id} 不存在")
                return

            # 加载配置
            writer_config = await crud.get_ai_model_config(db, task.writer_config_id) if task.writer_config_id else None
            gen_config = await crud.get_generation_config(db, task.generation_config_id) if task.generation_config_id else None
            writer_prompt_obj = await crud.get_prompt_config(db, task.writer_prompt_id) if task.writer_prompt_id else None

            if not writer_config:
                await crud.update_task_progress(db, task.id, status="failed", error_message="未配置 Writer 模型", completed_at=datetime.now())
                return

            # 构建上下文
            context = ""
            if task.source_type == "document" and task.source_id:
                analysis = await crud.get_analysis(db, task.source_id)
                if analysis and analysis.result:
                    if isinstance(analysis.result, list):
                        context = "\n".join(
                            f"- {r.get('title', '')}: {r.get('description', '')}"
                            for r in analysis.result
                        )
                    elif isinstance(analysis.result, dict):
                        context = json.dumps(analysis.result, ensure_ascii=False)
            elif task.source_type == "text" and task.source_id:
                analysis = await crud.get_analysis(db, task.source_id)
                if analysis and analysis.analysis_text:
                    context = analysis.analysis_text

            if not context:
                await crud.update_task_progress(db, task.id, status="failed", error_message="无需求上下文", completed_at=datetime.now())
                return

            # 确定 Writer 提示词
            writer_prompt_text = DEFAULT_WRITER_PROMPT
            if writer_prompt_obj and writer_prompt_obj.content:
                writer_prompt_text = writer_prompt_obj.content

            # 确定用例数量
            case_count = gen_config.test_case_count if gen_config else 10

            # --- Phase 1: 生成 ---
            await crud.update_task_progress(db, task.id, status="generating", progress=5, started_at=datetime.now())

            service = AIModelService(writer_config)
            messages = [
                {"role": "system", "content": writer_prompt_text},
                {"role": "user", "content": f"请根据以下需求生成 {case_count} 个测试用例：\n\n{context}"},
            ]

            if task.mode == "stream":
                # 流式生成
                buffer = ""
                async for chunk in service.chat_stream(messages):
                    buffer += chunk
                    # 每 500 字符保存一次
                    if len(buffer) % 500 < len(chunk):
                        await crud.update_task_progress(db, task.id, stream_buffer=buffer)
                generated = buffer
            else:
                generated = await service.chat(messages, stream=False)

            await crud.update_task_progress(db, task.id, generated_content=generated, stream_buffer=generated, progress=60)

            # --- Phase 2: 评审（如配置开启） ---
            auto_review = gen_config.auto_review if gen_config else False
            review_feedback = ""
            if auto_review:
                reviewer_config = await crud.get_ai_model_config(db, task.reviewer_config_id) if task.reviewer_config_id else None
                reviewer_prompt_obj = await crud.get_prompt_config(db, task.reviewer_prompt_id) if task.reviewer_prompt_id else None

                if reviewer_config:
                    await crud.update_task_progress(db, task.id, status="reviewing", progress=70)
                    reviewer_prompt_text = DEFAULT_REVIEWER_PROMPT
                    if reviewer_prompt_obj and reviewer_prompt_obj.content:
                        reviewer_prompt_text = reviewer_prompt_obj.content

                    review_service = AIModelService(reviewer_config)
                    try:
                        review_feedback = await review_service.chat([
                            {"role": "system", "content": reviewer_prompt_text},
                            {"role": "user", "content": f"请评审以下测试用例：\n\n{generated}"},
                        ])
                    except Exception as e:
                        review_feedback = f"评审失败：{e}"

                    await crud.update_task_progress(db, task.id, review_feedback=review_feedback, progress=80)

                    # --- Phase 3: 修订 ---
                    if review_feedback and "失败" not in review_feedback[:20]:
                        await crud.update_task_progress(db, task.id, status="revising", progress=85)
                        try:
                            revised = await service.chat([
                                {"role": "system", "content": writer_prompt_text},
                                {"role": "user", "content": f"请根据以下评审意见，修订测试用例。\n\n原始用例：\n{generated}\n\n评审意见：\n{review_feedback}"},
                            ])
                            generated = revised
                        except Exception as e:
                            logger.warning(f"修订失败：{e}")

            # --- Phase 4: 完成 ---
            final = _sort_and_format_cases(generated)
            await crud.update_task_progress(
                db, task.id,
                status="completed", final_test_cases=final,
                progress=100, completed_at=datetime.now(),
            )

        except Exception as e:
            logger.exception(f"生成任务 {task_id} 失败")
            try:
                await crud.update_task_progress(db, task.id, status="failed", error_message=str(e), completed_at=datetime.now())
            except Exception:
                pass


def _sort_and_format_cases(content: str) -> str:
    """对生成的用例内容进行排序和格式化

    确保输出为结构清晰的 Markdown 格式
    """
    # 尝试提取表格
    lines = content.strip().split("\n")
    table_lines = [l for l in lines if "|" in l]

    if len(table_lines) >= 3:
        # 包含表头+分隔线+数据行
        return content.strip()

    # 非表格格式，添加编号
    case_pattern = re.compile(r"(?:^|\n)(?:用例[：:]?\s*|Case\s*#?\s*)?(\d+)[.、．\s]", re.IGNORECASE)
    if case_pattern.search(content):
        return content.strip()

    return content.strip()


async def stream_task_progress(task_id: str):
    """SSE 流式推送任务进度

    每 0.5 秒轮询数据库，推送增量内容
    """
    last_progress = -1
    last_buffer = ""

    while True:
        async with AsyncSessionLocal() as db:
            task = await crud.get_task(db, task_id)
            if not task:
                yield f"event: error\ndata: {json.dumps({'error': '任务不存在'})}\n\n"
                yield "event: done\ndata: {}\n\n"
                return

            # 进度变化
            if task.progress != last_progress:
                yield f"event: progress\ndata: {task.progress}\n\n"
                last_progress = task.progress

            # 流式缓冲增量
            if task.stream_buffer and len(task.stream_buffer) > len(last_buffer):
                delta = task.stream_buffer[len(last_buffer):]
                if delta:
                    yield f"event: content\ndata: {json.dumps({'delta': delta})}\n\n"
                last_buffer = task.stream_buffer or ""

            # 终端状态
            if task.status == "completed":
                final_data = {
                    "final": task.final_test_cases,
                    "feedback": task.review_feedback,
                    "generated": task.generated_content,
                }
                yield f"event: completed\ndata: {json.dumps(final_data)}\n\n"
                yield "event: done\ndata: {}\n\n"
                return
            elif task.status == "failed":
                yield f"event: error\ndata: {json.dumps({'error': task.error_message or '生成失败'})}\n\n"
                yield "event: done\ndata: {}\n\n"
                return
            elif task.status == "cancelled":
                yield "event: cancelled\ndata: {}\n\n"
                yield "event: done\ndata: {}\n\n"
                return

        await asyncio.sleep(0.5)


def parse_final_test_cases(content: str | None) -> list[dict[str, str]]:
    """解析 final_test_cases 内容为结构化列表

    优先 Markdown 表格格式，回退文本关键字提取
    """
    if not content or not content.strip():
        return []

    lines = content.strip().split("\n")
    table_lines = []
    in_table = False

    for line in lines:
        if line.strip().startswith("|"):
            in_table = True
            table_lines.append(line.strip())
        elif in_table and not line.strip():
            in_table = False
        elif in_table:
            table_lines.append(line.strip())
        else:
            # 尝试关键字提取
            pass

    # 解析 Markdown 表格
    if len(table_lines) >= 3:
        # 第一行是表头
        header = [h.strip().lower() for h in table_lines[0].split("|") if h.strip()]
        # 跳过第二行（分隔线）
        results = []
        for row_line in table_lines[2:]:
            cells = [c.strip() for c in row_line.split("|") if c.strip()]
            if len(cells) >= 2:
                row = {}
                for i, h in enumerate(header):
                    if i < len(cells):
                        # 映射列名
                        key_map = {
                            "编号": "number", "序号": "number", "caseid": "number",
                            "场景": "scenario", "名称": "title", "标题": "title",
                            "前置条件": "preconditions", "前置": "preconditions",
                            "测试步骤": "steps", "步骤": "steps",
                            "预期结果": "expected_result", "预期": "expected_result",
                            "优先级": "priority", "优先": "priority",
                        }
                        mapped_key = key_map.get(h, h)
                        row[mapped_key] = cells[i]
                if row:
                    results.append(row)
        return results

    # 回退：关键字提取
    results = []
    current = {}
    for line in lines:
        line = line.strip()
        if not line:
            if current:
                results.append(current)
                current = {}
            continue
        for key, prefix in [("title", "标题"), ("scenario", "场景"), ("preconditions", "前置条件"),
                            ("steps", "步骤"), ("expected_result", "预期结果"), ("priority", "优先级")]:
            if line.startswith(prefix) and "：" in line:
                current[key] = line.split("：", 1)[1]
                break
        else:
            # 无匹配前缀，追加到当前项的 steps
            if "steps" in current:
                current["steps"] += "\n" + line

    if current:
        results.append(current)
    return results


async def save_task_to_library(db, task: models.TestCaseGenerationTask, context_user_id: int = 1) -> int:
    """将任务的 final_test_cases 保存到测试用例库

    返回保存的用例数
    """
    from app.modules.test_management.models import TestManagementCase
    from app.modules.test_management.crud import create_case as create_test_management_case

    parsed = parse_final_test_cases(task.final_test_cases)
    saved_count = 0

    for item in parsed:
        title = item.get("title") or item.get("scenario") or "AI 生成用例"
        steps_data = []
        steps_text = item.get("steps", "")
        if steps_text:
            for i, step_line in enumerate(steps_text.strip().split("\n")):
                step_line = step_line.strip()
                if not step_line:
                    continue
                # 提取步骤号和操作
                step_match = re.match(r"^(\d+)[.、．\s]\s*(.*)", step_line)
                if step_match:
                    action = step_match.group(2)
                else:
                    action = step_line
                steps_data.append({
                    "step_number": i + 1,
                    "action": action,
                    "expected_result": item.get("expected_result", ""),
                })

        case_data = schemas.TestCaseCreate(
            title=title,
            description=item.get("scenario", ""),
            preconditions=item.get("preconditions", ""),
            priority=item.get("priority", "MEDIUM").upper(),
            status="draft",
            case_type="功能",
            steps=steps_data,
        )

        project_id = await _get_or_create_default_project(db, context_user_id)
        await create_test_management_case(db, project_id, context_user_id, case_data)
        saved_count += 1

    if saved_count > 0:
        await crud.update_task_progress(db, task.id, is_saved_to_records=True)

    return saved_count


async def _get_or_create_default_project(db, user_id: int) -> int:
    """获取或创建默认项目（AI 生成用例专用）"""
    from app.modules.projects.models import Project

    result = await db.execute(
        select(Project).where(Project.name == "AI 生成用例").limit(1)
    )
    project = result.scalar_one_or_none()
    if project:
        return project.id

    project = Project(name="AI 生成用例", description="AI 自动生成的测试用例", owner_id=user_id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project.id


# 需要为 save_task_to_library 添加必要的导入
from sqlalchemy import select  # noqa: E402
from app.modules.test_management.schemas import TestCaseCreate  # noqa: E402, F811
