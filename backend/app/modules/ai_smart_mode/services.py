"""AI 智能模式 - 执行服务

集成 browser-use Agent，提供浏览器自动化执行能力。
当 browser-use 未安装时使用模拟模式。
"""
from __future__ import annotations

import io
import json
import logging
import os
import threading
import time
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

# 全局停止信号字典: {execution_id: should_stop}
STOP_SIGNALS: dict[int, bool] = {}

# 全局后台线程字典: {execution_id: thread}
EXECUTION_THREADS: dict[int, threading.Thread] = {}

try:
    from langchain_openai import ChatOpenAI
    HAS_LANGCHAIN = True
except ImportError:
    ChatOpenAI = None
    HAS_LANGCHAIN = False

try:
    from browser_use import Agent as BrowserUseAgent
    HAS_BROWSER_USE = True
except ImportError:
    BrowserUseAgent = None
    HAS_BROWSER_USE = False


def should_stop(execution_id: int) -> bool:
    """检查是否收到停止信号"""
    return STOP_SIGNALS.get(execution_id, False)


def _get_llm(model_name: str = "gpt-4", temperature: float = 0.1) -> Any:
    """获取 LLM 实例（从 settings 读取配置）"""
    if not HAS_LANGCHAIN:
        return None
    try:
        from app.config import settings as app_settings
        from app.modules.settings.crud import get_settings_dict
        from app.database import async_session

        # 尝试从数据库读取 AI 模型配置
        import asyncio
        loop = asyncio.new_event_loop()
        try:
            async def _get_config():
                async with async_session() as db:
                    s = await get_settings_dict(db)
                    return {
                        "api_base": s.get("ai_api_base", ""),
                        "api_key": s.get("ai_api_key", ""),
                        "model_name": s.get("ai_model_name", model_name),
                    }
            config = loop.run_until_complete(_get_config())
        finally:
            loop.close()

        return ChatOpenAI(
            model=config["model_name"],
            openai_api_base=config["api_base"] or None,
            openai_api_key=config["api_key"] or None,
            temperature=temperature,
        )
    except Exception as e:
        logger.warning(f"获取 LLM 配置失败: {e}")
        return ChatOpenAI(model=model_name, temperature=temperature)


def run_full_process_sync(
    execution_id: int,
    task_description: str,
    target_url: str | None = None,
    execution_mode: str = "text",
    enable_gif: bool = False,
    update_callback=None,
) -> dict[str, Any]:
    """同步执行 AI 浏览器任务全流程

    Args:
        execution_id: 执行记录 ID
        task_description: 自然语言任务描述
        target_url: 目标 URL
        execution_mode: text/vision
        enable_gif: 是否录制 GIF
        update_callback: 状态更新回调函数(execution_id, data_dict)

    Returns:
        {"status": ..., "summary": ..., "planned_tasks": ..., "execution_log": ..., "gif_recording": ..., "error": ...}
    """
    log_entries = []
    result = {
        "status": "running",
        "summary": "",
        "planned_tasks": [],
        "execution_log": [],
        "gif_recording": None,
        "error": None,
        "started_at": datetime.now().isoformat(),
    }

    def add_log(step: str, status: str = "running", detail: str = ""):
        entry = {
            "time": datetime.now().strftime("%H:%M:%S"),
            "step": step,
            "status": status,
            "detail": detail,
        }
        log_entries.append(entry)
        result["execution_log"] = log_entries
        if update_callback:
            try:
                update_callback(execution_id, {"execution_log": log_entries})
            except Exception:
                pass

    try:
        # 步骤1: 分析任务
        add_log("AI 正在分析任务...", "running")
        if should_stop(execution_id):
            result["status"] = "cancelled"
            return result

        # 规划任务步骤
        planned_tasks = _plan_tasks(task_description, target_url, execution_mode)
        result["planned_tasks"] = planned_tasks
        add_log(f"任务规划完成，共 {len(planned_tasks)} 个步骤", "completed",
                json.dumps(planned_tasks, ensure_ascii=False))
        if update_callback:
            try:
                update_callback(execution_id, {"planned_tasks": planned_tasks})
            except Exception:
                pass

        if should_stop(execution_id):
            result["status"] = "cancelled"
            return result

        # 步骤2: 执行浏览器操作
        if HAS_BROWSER_USE and HAS_LANGCHAIN:
            add_log("正在初始化 browser-use Agent...", "running")
            browser_result = _execute_with_browser_use(
                execution_id, task_description, target_url, execution_mode, enable_gif, add_log
            )
            result.update(browser_result)
        else:
            add_log("browser-use 未安装，使用模拟执行模式", "completed",
                    "安装 browser-use: pip install browser-use")
            mock_result = _execute_mock(
                execution_id, task_description, target_url, add_log
            )
            result.update(mock_result)

        # 步骤3: 汇总
        if should_stop(execution_id):
            result["status"] = "cancelled"
            add_log("任务已被用户取消", "cancelled")
        elif result["status"] != "failed":
            result["status"] = "completed"
            add_log("AI 执行完成", "completed")

        # 生成总结
        result["summary"] = _generate_summary(result)

    except Exception as e:
        logger.exception("AI 执行异常")
        result["status"] = "failed"
        result["error"] = str(e)
        add_log(f"执行异常: {e}", "failed")

    result["completed_at"] = datetime.now().isoformat()
    return result


def _plan_tasks(
    task_description: str,
    target_url: str | None = None,
    execution_mode: str = "text",
) -> list[dict[str, Any]]:
    """AI 分析任务并规划执行步骤"""
    if HAS_LANGCHAIN:
        try:
            llm = _get_llm()
            if llm:
                prompt = (
                    f"你是一个测试工程师。请将以下任务拆解为有序的执行步骤。\n\n"
                    f"任务: {task_description}\n"
                    f"目标URL: {target_url or '未指定'}\n"
                    f"执行模式: {execution_mode}\n\n"
                    f"请直接返回 JSON 数组，每个元素包含 step(步骤描述) 和 action(操作类型: navigate/click/input/assert/wait)。\n"
                    f"不要包含 markdown 代码块标记。"
                )
                resp = llm.invoke(prompt)
                content = resp.content if hasattr(resp, "content") else str(resp)
                # 清理可能的 markdown 标记
                content = content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                tasks = json.loads(content)
                if isinstance(tasks, list):
                    return tasks
        except Exception as e:
            logger.warning(f"AI 任务规划失败: {e}")

    # 降级: 返回模拟规划
    return [
        {"step": f"打开目标页面: {target_url or '目标应用'}", "action": "navigate"},
        {"step": "分析页面内容", "action": "wait"},
        {"step": "执行任务操作", "action": "click"},
        {"step": "验证执行结果", "action": "assert"},
    ]


def _execute_with_browser_use(
    execution_id: int,
    task_description: str,
    target_url: str | None = None,
    execution_mode: str = "text",
    enable_gif: bool = False,
    add_log=None,
) -> dict[str, Any]:
    """使用 browser-use Agent 执行浏览器操作"""
    result: dict[str, Any] = {
        "status": "completed",
        "gif_recording": None,
        "error": None,
    }

    try:
        llm = _get_llm()
        if not llm:
            raise RuntimeError("无法初始化 LLM")

        full_task = task_description
        if target_url:
            full_task = f"在浏览器中打开 {target_url}，然后{task_description}"

        agent = BrowserUseAgent(
            task=full_task,
            llm=llm,
            use_vision=(execution_mode == "vision"),
            generate_gif=enable_gif,
        )

        steps_completed = 0
        for step_result in agent.run():
            steps_completed += 1
            if should_stop(execution_id):
                agent.stop()
                break

            if add_log:
                step_info = getattr(step_result, "model_dump", None)
                if step_info:
                    info = step_info()
                else:
                    info = {"step": str(step_result)}
                add_log(
                    f"执行步骤 {steps_completed}",
                    "completed" if not getattr(step_result, "error", None) else "failed",
                    json.dumps(info, ensure_ascii=False),
                )

        result["steps_completed"] = steps_completed

        # 处理 GIF 录制
        if enable_gif and hasattr(agent, "history") and hasattr(agent.history, "gif_path"):
            gif_path = agent.history.gif_path
            if gif_path and os.path.exists(gif_path):
                result["gif_recording"] = _process_gif_recording(gif_path, execution_id)

    except Exception as e:
        logger.exception("browser-use 执行失败")
        result["status"] = "failed"
        result["error"] = str(e)
        if add_log:
            add_log(f"browser-use 执行异常: {e}", "failed")

    return result


def _execute_mock(
    execution_id: int,
    task_description: str,
    target_url: str | None = None,
    add_log=None,
) -> dict[str, Any]:
    """模拟执行（当 browser-use 未安装时）"""
    time.sleep(1)
    if add_log:
        add_log(f"模拟: 正在访问 {target_url or '目标页面'}", "completed")
        time.sleep(0.5)
        add_log("模拟: 页面加载完成", "completed")
        time.sleep(0.5)
        add_log("模拟: 执行操作", "completed")
        time.sleep(0.5)
        add_log("模拟: 验证结果通过", "completed")
        time.sleep(0.3)

    return {
        "status": "completed",
        "steps_completed": 4,
        "gif_recording": None,
        "error": None,
    }


def _process_gif_recording(source_path: str, execution_id: int) -> str:
    """处理 GIF 录制文件，移动到 media 目录"""
    try:
        from app.config import settings
        recording_dir = os.path.join(settings.MEDIA_ROOT, "ai_recordings")
        os.makedirs(recording_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_filename = f"ai_exec_{execution_id}_{timestamp}.gif"
        dest_path = os.path.join(recording_dir, dest_filename)

        import shutil
        shutil.copy2(source_path, dest_path)
        return f"media/ai_recordings/{dest_filename}"
    except Exception as e:
        logger.warning(f"GIF 录制处理失败: {e}")
        return source_path


def _generate_summary(result: dict[str, Any]) -> str:
    """生成执行总结"""
    status = result.get("status", "unknown")
    steps = result.get("steps_completed", 0)
    planned = result.get("planned_tasks", [])
    log = result.get("execution_log", [])
    error = result.get("error")

    summary_parts = [f"执行状态: {'成功' if status == 'completed' else '失败' if status == 'failed' else '已取消'}"]
    if planned:
        summary_parts.append(f"规划步骤: {len(planned)} 个")
    summary_parts.append(f"完成步骤: {steps}")
    if log:
        success_count = sum(1 for e in log if e.get("status") == "completed")
        total_count = len(log)
        summary_parts.append(f"操作记录: {success_count}/{total_count} 成功")
    if error:
        summary_parts.append(f"错误信息: {error}")

    return " | ".join(summary_parts)


def generate_pdf_report(record_data: dict) -> bytes:
    """基于 AI 执行记录生成 PDF 报告。

    使用 reportlab 生成包含执行概要、步骤详情、错误信息的 PDF 文档。
    当 reportlab 不可用时，回退到纯文本报告。
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
        )

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm)
        styles = getSampleStyleSheet()
        elements = []

        # 标题
        elements.append(Paragraph("AI 智能执行报告", styles['Title']))
        elements.append(Spacer(1, 12))

        # 执行概要
        elements.append(Paragraph(f"用例名称: {record_data.get('name', '-')}", styles['Heading2']))
        elements.append(Paragraph(f"状态: {record_data.get('status', '-')}", styles['Normal']))
        elements.append(Paragraph(f"开始时间: {record_data.get('started_at', '-')}", styles['Normal']))
        elements.append(Paragraph(f"完成时间: {record_data.get('completed_at', '-')}", styles['Normal']))
        elements.append(Paragraph(f"任务描述: {record_data.get('task_description', '-')}", styles['Normal']))
        elements.append(Paragraph(f"总结: {record_data.get('summary', '-')}", styles['Normal']))
        elements.append(Spacer(1, 12))

        # 规划步骤
        planned = record_data.get('planned_tasks', [])
        if planned:
            elements.append(Paragraph("规划步骤", styles['Heading2']))
            for i, task in enumerate(planned):
                elements.append(
                    Paragraph(f"{i+1}. {task.get('description', task.get('action', '-'))}", styles['Normal'])
                )
            elements.append(Spacer(1, 12))

        # 执行日志
        exec_log_raw = record_data.get('execution_log', '')
        if exec_log_raw:
            elements.append(Paragraph("执行日志", styles['Heading2']))
            try:
                exec_log = json.loads(exec_log_raw) if isinstance(exec_log_raw, str) else exec_log_raw
                if isinstance(exec_log, list):
                    # 构建日志表格
                    log_table_data = [["时间", "步骤", "状态", "详情"]]
                    for entry in exec_log:
                        log_table_data.append([
                            entry.get("time", ""),
                            entry.get("step", ""),
                            entry.get("status", ""),
                            (entry.get("detail", "") or "")[:60],
                        ])
                    if len(log_table_data) > 1:
                        log_table = Table(log_table_data, colWidths=[60, 200, 60, 220])
                        log_table.setStyle(TableStyle([
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#404040")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                            ("FONTSIZE", (0, 0), (-1, -1), 8),
                            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                            ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ]))
                        elements.append(log_table)
                    else:
                        elements.append(Paragraph("（无详细日志条目）", styles['Normal']))
                else:
                    elements.append(Paragraph(str(exec_log)[:2000], styles['Code']))
            except (json.JSONDecodeError, TypeError):
                text = exec_log_raw if isinstance(exec_log_raw, str) else str(exec_log_raw)
                if text:
                    elements.append(Paragraph(text[:2000], styles['Code']))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
    except ImportError:
        logger.warning("reportlab 未安装，回退到纯文本报告")
        # fallback: 纯文本报告
        text_lines = ["AI 智能执行报告", "=" * 40, ""]
        for k, v in record_data.items():
            if isinstance(v, (list, dict)):
                try:
                    v = json.dumps(v, ensure_ascii=False, indent=2)
                except (TypeError, ValueError):
                    v = str(v)
            text_lines.append(f"{k}: {v}")
            text_lines.append("")
        text = "\n".join(text_lines)
        return text.encode("utf-8")
