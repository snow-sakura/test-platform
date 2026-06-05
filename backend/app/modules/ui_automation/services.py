"""UI 自动化测试模块 - 业务服务层

包含：元素定位验证、脚本执行引擎、通知发送。
"""
from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


# ==============================
# 元素定位验证
# ==============================


LOCATOR_MAP = {
    "id": "id",
    "name": "name",
    "css": "css selector",
    "xpath": "xpath",
    "class": "class name",
    "text": "text",
    "link_text": "link text",
    "partial_link_text": "partial link text",
    "tag_name": "tag name",
}

# Playwright 定位策略映射（当 playwright 可用时）
PLAYWRIGHT_LOCATOR_MAP = {
    "id": "#",
    "css": "css=",
    "xpath": "xpath=",
    "text": "text=",
    "class": ".",
}


async def validate_locator(
    url: str,
    locator_type: str,
    locator_value: str,
    timeout_ms: int = 10000,
) -> dict[str, Any]:
    """验证元素定位器是否能在目标页面上找到元素。

    使用 Playwright 打开页面并尝试定位元素。
    如果 Playwright 不可用，返回基于规则的模拟验证结果。
    """
    try:
        return await _validate_with_playwright(url, locator_type, locator_value, timeout_ms)
    except ImportError:
        logger.warning("playwright 未安装，使用规则模拟验证")
        return _validate_with_rules(locator_type, locator_value)
    except Exception as e:
        return {"found": False, "error": str(e), "locator_type": locator_type, "locator_value": locator_value}


async def _validate_with_playwright(
    url: str, locator_type: str, locator_value: str, timeout_ms: int,
) -> dict[str, Any]:
    """使用 Playwright 验证元素定位"""
    from playwright.async_api import async_playwright  # type: ignore[import-untyped]

    async with async_playwright() as p:
        browser = None
        page = None
        try:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)

            # 构造定位器
            pw_type = PLAYWRIGHT_LOCATOR_MAP.get(locator_type, locator_type)
            locator_str = f"{pw_type}{locator_value}" if pw_type in ("#", ".", "text=", "css=") else locator_value

            element = page.locator(locator_str)
            count = await element.count()

            return {
                "found": count > 0,
                "count": count,
                "locator_type": locator_type,
                "locator_value": locator_value,
                "error": None if count > 0 else f"未找到匹配元素 (type={locator_type}, value={locator_value})",
            }
        except Exception as e:
            return {
                "found": False,
                "locator_type": locator_type,
                "locator_value": locator_value,
                "error": str(e),
            }
        finally:
            if browser:
                await browser.close()


def _validate_with_rules(locator_type: str, locator_value: str) -> dict[str, Any]:
    """基于规则的模拟验证（无 Playwright 时使用）"""
    # 基本格式检查
    if not locator_value.strip():
        return {"found": False, "error": "定位器值为空", "locator_type": locator_type, "locator_value": locator_value}

    if locator_type == "xpath":
        # 检查 XPath 基本语法
        if not locator_value.startswith(("//", "(", "./")):
            return {"found": False, "error": "XPath 格式无效，应以 // 或 ( 开头", "locator_type": locator_type, "locator_value": locator_value}
    elif locator_type == "css":
        if any(c in locator_value for c in " !\"'(),;"):
            return {"found": False, "error": "CSS 选择器包含非法字符", "locator_type": locator_type, "locator_value": locator_value}

    return {"found": True, "locator_type": locator_type, "locator_value": locator_value, "note": "模拟验证（仅格式检查）"}


# ==============================
# 脚本执行引擎
# ==============================


async def execute_script(
    steps: list[dict],
    url: str | None = None,
    browser_type: str = "chromium",
    headless: bool = True,
    timeout_ms: int = 30000,
    screenshot_on_failure: bool = True,
) -> dict[str, Any]:
    """执行脚本步骤序列。

    使用 Playwright 依次执行每个步骤，记录操作日志并截图。
    """
    try:
        return await _execute_with_playwright(steps, url, browser_type, headless, timeout_ms, screenshot_on_failure)
    except ImportError:
        logger.warning("playwright 未安装，使用模拟执行模式")
        return _execute_mock(steps)


async def _execute_with_playwright(
    steps: list[dict], url: str | None, browser_type: str,
    headless: bool, timeout_ms: int, screenshot_on_failure: bool,
) -> dict[str, Any]:
    """使用 Playwright 真机执行"""
    from playwright.async_api import async_playwright  # type: ignore[import-untyped]

    start_time = time.time()
    step_results = []
    screenshots = []
    script_passed = True
    error_message = None

    browser_map = {"chromium": "chromium", "firefox": "firefox", "webkit": "webkit"}

    async with async_playwright() as p:
        browser_type_obj = getattr(p, browser_map.get(browser_type, "chromium"))
        browser = None
        page = None

        try:
            browser = await browser_type_obj.launch(headless=headless)
            for i, step in enumerate(steps):
                step_start = time.time()
                step_result = {"step_number": step.get("step_number", i + 1), "action": step.get("action_type"), "success": False, "error": None}

                try:
                    if page is None:
                        page = await browser.new_page()
                        if url:
                            await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)

                    action = step.get("action_type")
                    element_id = step.get("element_id")
                    input_value = step.get("input_value")
                    wait_seconds = step.get("wait_seconds", 0)
                    locator = step.get("locator")

                    if wait_seconds:
                        await page.wait_for_timeout(int(wait_seconds * 1000))

                    if action == "navigate":
                        target_url = input_value or url
                        if target_url:
                            await page.goto(target_url, wait_until="domcontentloaded", timeout=timeout_ms)

                    elif action == "click":
                        if locator:
                            await page.click(locator)
                        step_result["success"] = True

                    elif action == "input":
                        if locator and input_value is not None:
                            await page.fill(locator, str(input_value))
                        step_result["success"] = True

                    elif action == "select":
                        if locator and input_value:
                            await page.select_option(locator, input_value)
                        step_result["success"] = True

                    elif action == "wait":
                        await page.wait_for_timeout(int(wait_seconds * 1000) if wait_seconds else 1000)
                        step_result["success"] = True

                    elif action == "assert":
                        if locator:
                            count = await page.locator(locator).count()
                            step_result["success"] = count > 0
                            if not step_result["success"]:
                                step_result["error"] = f"断言失败：未找到元素 {locator}"
                        elif input_value:
                            body_text = await page.text_content("body")
                            step_result["success"] = input_value in (body_text or "")
                            if not step_result["success"]:
                                step_result["error"] = f"断言失败：页面未包含文本 '{input_value}'"

                    elif action == "scroll":
                        if input_value:
                            await page.evaluate(f"window.scrollTo(0, {input_value})")
                        else:
                            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                        step_result["success"] = True

                    elif action == "hover":
                        if locator:
                            await page.hover(locator)
                        step_result["success"] = True

                    elif action == "screenshot":
                        screenshot = await page.screenshot(full_page=True)
                        screenshots.append(screenshot)
                        step_result["success"] = True

                except Exception as step_err:
                    step_result["success"] = False
                    step_result["error"] = str(step_err)
                    if script_passed:
                        script_passed = False
                        error_message = str(step_err)
                    if screenshot_on_failure and page:
                        screenshot = await page.screenshot(full_page=True)
                        screenshots.append(screenshot)

                step_result["elapsed_ms"] = round((time.time() - step_start) * 1000, 2)
                step_results.append(step_result)

                if not step_result["success"] and action not in ("assert",):
                    script_passed = False
                    error_message = step_result["error"]
                    break

        except Exception as e:
            script_passed = False
            error_message = str(e)
        finally:
            if browser:
                await browser.close()

    return {
        "passed": script_passed,
        "duration_ms": round((time.time() - start_time) * 1000, 2),
        "steps": step_results,
        "screenshots": screenshots,
        "error": error_message,
        "started_at": datetime.now().isoformat(),
    }


def _execute_mock(steps: list[dict]) -> dict[str, Any]:
    """模拟执行（无 Playwright 时使用）"""
    start_time = time.time()
    step_results = []
    script_passed = True
    error_message = None

    for step in steps:
        step_result = {
            "step_number": step.get("step_number", 0),
            "action": step.get("action_type"),
            "success": True,
            "error": None,
            "elapsed_ms": 0,
        }

        action = step.get("action_type", "")
        if action in ("click", "input", "navigate", "wait", "select", "scroll", "hover", "screenshot"):
            step_result["success"] = True
        elif action == "assert":
            step_result["success"] = True
            step_result["note"] = "模拟断言（默认通过）"
        else:
            step_result["success"] = False
            step_result["error"] = f"未知操作: {action}"

        step_result["elapsed_ms"] = 50  # 模拟 50ms
        step_results.append(step_result)

    return {
        "passed": script_passed,
        "duration_ms": round((time.time() - start_time) * 1000, 2),
        "steps": step_results,
        "screenshots": [],
        "error": error_message,
        "started_at": datetime.now().isoformat(),
        "note": "模拟执行模式 — 未安装 Playwright",
    }


# 通知发送已移至 app/utils/notification.py
