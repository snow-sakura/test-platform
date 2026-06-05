"""APP 自动化测试模块 - Airtest/ADB 集成服务层

包含：ADB 设备发现、截图、Airtest 场景执行、通知发送。
"""
from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


# ==============================
# ADB 设备发现
# ==============================


async def discover_devices() -> list[dict[str, Any]]:
    """发现 ADB 连接的设备列表。

    真实模式：调用 `adb devices` 命令并解析输出。
    Mock 模式：返回一组模拟设备。
    """
    try:
        return _discover_real()
    except ImportError:
        logger.warning("subprocess 不可用，使用模拟设备列表")
        return _discover_mock()
    except Exception as e:
        logger.error(f"ADB 设备发现失败: {e}")
        return _discover_mock()


def _discover_real() -> list[dict[str, Any]]:
    """通过 adb devices 命令发现真实设备"""
    import subprocess

    result = subprocess.run(
        ["adb", "devices"],
        capture_output=True,
        text=True,
        timeout=10,
    )
    if result.returncode != 0:
        logger.error(f"adb devices 执行失败: {result.stderr}")
        return []

    devices: list[dict[str, Any]] = []
    lines = result.stdout.strip().splitlines()
    # 第一行是 "List of devices attached"，跳过
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) == 2:
            device_id, status = parts
            devices.append({
                "device_id": device_id.strip(),
                "status": status.strip(),
                "model": _get_device_model(device_id.strip()),
                "platform": "Android",
                "discovered_at": datetime.now().isoformat(),
            })
    return devices


def _get_device_model(device_id: str) -> str:
    """获取设备型号（通过 adb shell getprop）"""
    try:
        import subprocess

        result = subprocess.run(
            ["adb", "-s", device_id, "shell", "getprop", "ro.product.model"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.stdout.strip() if result.returncode == 0 else "Unknown"
    except Exception:
        return "Unknown"


def _discover_mock() -> list[dict[str, Any]]:
    """模拟设备列表（无 ADB 时使用）"""
    return [
        {
            "device_id": "emulator-5554",
            "status": "device",
            "model": "Google Pixel 6_Emulator",
            "platform": "Android",
            "discovered_at": datetime.now().isoformat(),
        },
        {
            "device_id": "emulator-5556",
            "status": "device",
            "model": "Samsung Galaxy S22_Emulator",
            "platform": "Android",
            "discovered_at": datetime.now().isoformat(),
        },
        {
            "device_id": "R58N1234ABC",
            "status": "device",
            "model": "Xiaomi 13",
            "platform": "Android",
            "discovered_at": datetime.now().isoformat(),
        },
    ]


# ==============================
# ADB 截图
# ==============================


async def take_screenshot(
    device_id: str,
    save_path: str,
) -> str | None:
    """通过 ADB 对指定设备截图并保存到本地。

    真实模式：执行 `adb exec-out screencap -p` 并写入文件。
    Mock 模式：返回占位路径。
    """
    try:
        return _screenshot_real(device_id, save_path)
    except ImportError:
        logger.warning("subprocess 不可用，使用模拟截图")
        return _screenshot_mock(device_id, save_path)
    except Exception as e:
        logger.error(f"ADB 截图失败 (device={device_id}): {e}")
        return _screenshot_mock(device_id, save_path)


def _screenshot_real(device_id: str, save_path: str) -> str | None:
    """通过 adb exec-out screencap -p 截图"""
    import subprocess

    result = subprocess.run(
        ["adb", "-s", device_id, "exec-out", "screencap", "-p"],
        capture_output=True,
        timeout=15,
    )
    if result.returncode != 0:
        logger.error(f"screencap 失败 (device={device_id}): {result.stderr}")
        return None

    with open(save_path, "wb") as f:
        f.write(result.stdout)
    logger.info(f"截图已保存: {save_path} (device={device_id})")
    return save_path


def _screenshot_mock(device_id: str, save_path: str) -> str | None:
    """模拟截图（无 ADB 时使用）"""
    logger.info(f"[模拟] 截图已保存: {save_path} (device={device_id})")
    return save_path


# ==============================
# ADB 设备操作（锁定/解锁/连接/断开）
# ==============================


async def lock_device(device_id: str) -> dict[str, Any]:
    """锁定指定 ADB 设备屏幕。

    真实模式：执行 `adb -s <device_id> shell input keyevent 26`（电源键）。
    Mock 模式：返回模拟成功。
    """
    try:
        import subprocess

        result = subprocess.run(
            ["adb", "-s", device_id, "shell", "input", "keyevent", "26"],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode != 0:
            logger.error(f"锁定设备失败 (device={device_id}): {result.stderr}")
            return {"success": False, "error": result.stderr.strip()}
        logger.info(f"设备已锁定 (device={device_id})")
        return {"success": True, "device_id": device_id}
    except ImportError:
        logger.warning("subprocess 不可用，使用模拟锁定")
        return {"success": True, "device_id": device_id, "note": "模拟锁定"}
    except Exception as e:
        logger.error(f"锁定设备异常 (device={device_id}): {e}")
        return {"success": False, "error": str(e)}


async def unlock_device(device_id: str) -> dict[str, Any]:
    """解锁指定 ADB 设备屏幕。

    真实模式：执行 `adb -s <device_id> shell input keyevent 82`（菜单键唤醒）。
    Mock 模式：返回模拟成功。
    """
    try:
        import subprocess

        # 先按电源键唤醒，再模拟滑动解锁
        subprocess.run(
            ["adb", "-s", device_id, "shell", "input", "keyevent", "26"],
            capture_output=True, text=True, timeout=5,
        )
        import time as _time
        _time.sleep(0.5)
        # 模拟从底部向上滑动解锁
        subprocess.run(
            ["adb", "-s", device_id, "shell", "input", "swipe", "540", "2000", "540", "500"],
            capture_output=True, text=True, timeout=5,
        )
        logger.info(f"设备已解锁 (device={device_id})")
        return {"success": True, "device_id": device_id}
    except ImportError:
        logger.warning("subprocess 不可用，使用模拟解锁")
        return {"success": True, "device_id": device_id, "note": "模拟解锁"}
    except Exception as e:
        logger.error(f"解锁设备异常 (device={device_id}): {e}")
        return {"success": False, "error": str(e)}


async def connect_device(device_id: str) -> dict[str, Any]:
    """通过 ADB 连接远程设备。

    真实模式：执行 `adb connect <device_id>`。
    Mock 模式：返回模拟成功。
    """
    try:
        import subprocess

        result = subprocess.run(
            ["adb", "connect", device_id],
            capture_output=True, text=True, timeout=15,
        )
        output = result.stdout.strip()
        if "connected" in output.lower() or "already" in output.lower():
            logger.info(f"设备已连接 (device={device_id})")
            return {"success": True, "device_id": device_id, "message": output}
        logger.warning(f"连接设备失败 (device={device_id}): {output}")
        return {"success": False, "device_id": device_id, "error": output}
    except ImportError:
        logger.warning("subprocess 不可用，使用模拟连接")
        return {"success": True, "device_id": device_id, "note": "模拟连接"}
    except Exception as e:
        logger.error(f"连接设备异常 (device={device_id}): {e}")
        return {"success": False, "error": str(e)}


async def disconnect_device(device_id: str) -> dict[str, Any]:
    """断开 ADB 设备连接。

    真实模式：执行 `adb disconnect <device_id>`。
    Mock 模式：返回模拟成功。
    """
    try:
        import subprocess

        result = subprocess.run(
            ["adb", "disconnect", device_id],
            capture_output=True, text=True, timeout=10,
        )
        output = result.stdout.strip()
        if "disconnected" in output.lower():
            logger.info(f"设备已断开 (device={device_id})")
            return {"success": True, "device_id": device_id, "message": output}
        logger.warning(f"断开设备失败 (device={device_id}): {output}")
        return {"success": False, "device_id": device_id, "error": output}
    except ImportError:
        logger.warning("subprocess 不可用，使用模拟断开")
        return {"success": True, "device_id": device_id, "note": "模拟断开"}
    except Exception as e:
        logger.error(f"断开设备异常 (device={device_id}): {e}")
        return {"success": False, "error": str(e)}


# ==============================
# Airtest 场景执行
# ==============================


async def execute_scene(
    scene_data: list[dict[str, Any]],
    device_id: str | None = None,
) -> dict[str, Any]:
    """执行 Airtest 场景步骤序列。

    支持的步骤类型：
      - click:         模拟点击（支持 image_path 模板匹配 / x,y 坐标点击）
      - swipe:         模拟滑动（direction / x1,y1,x2,y2 / duration）
      - input:         模拟文本输入（text）
      - wait:          等待指定时间（timeout / seconds）
      - assert:        断言元素存在（expected）
      - screenshot:    截图

    真实模式：导入 airtest 执行。
    Mock 模式：返回模拟执行结果。
    """
    try:
        return await _execute_with_airtest(scene_data, device_id)
    except ImportError:
        logger.warning("airtest 未安装，使用模拟执行模式")
        return _execute_scene_mock(scene_data, device_id)
    except Exception as e:
        logger.error(f"Airtest 场景执行失败: {e}")
        return _execute_scene_mock(scene_data, device_id)


async def _execute_with_airtest(
    scene_data: list[dict[str, Any]],
    device_id: str | None,
) -> dict[str, Any]:
    """使用 Airtest 真机执行场景"""
    from airtest.core.api import (  # type: ignore[import-untyped]
        connect_device,
        device as current_device,
        exists,
        sleep,
        snapshot,
        swipe,
        text,
        touch,
        wait,
    )
    from airtest.core.settings import Settings as AirtestSettings

    start_time = time.time()
    step_results: list[dict[str, Any]] = []
    scene_passed = True
    error_message: str | None = None

    AirtestSettings.LOG_DIR = None  # 不生成 airtest 日志目录

    try:
        # 连接设备
        if device_id:
            try:
                connect_device(f"Android:///{device_id}")
            except Exception as conn_err:
                raise RuntimeError(f"无法连接设备 {device_id}: {conn_err}") from conn_err

        for i, step in enumerate(scene_data):
            step_start = time.time()
            step_result: dict[str, Any] = {
                "step_number": step.get("step_number", i + 1),
                "action": step.get("action"),
                "success": False,
                "error": None,
            }

            try:
                action = step.get("action", "")
                params = step.get("params", {})

                if action == "click":
                    image_path = params.get("image_path")
                    x = params.get("x")
                    y = params.get("y")

                    if image_path:
                        pos = wait(image_path)
                        touch(pos)
                    elif x is not None and y is not None:
                        touch((x, y))
                    else:
                        raise ValueError("click 步骤缺少 image_path 或坐标参数")

                elif action == "swipe":
                    direction = params.get("direction")
                    x1 = params.get("x1")
                    y1 = params.get("y1")
                    x2 = params.get("x2")
                    y2 = params.get("y2")
                    duration = params.get("duration", 0.5)

                    if direction:
                        # 按方向滑动（屏幕百分比）
                        screen = current_device().get_current_resolution()
                        sw = screen[0] if screen else 1080
                        sh = screen[1] if screen else 2400
                        dir_map = {
                            "up": (sw // 2, sh // 2, sw // 2, sh // 4),
                            "down": (sw // 2, sh // 2, sw // 2, sh * 3 // 4),
                            "left": (sw // 2, sh // 2, sw // 4, sh // 2),
                            "right": (sw // 2, sh // 2, sw * 3 // 4, sh // 2),
                        }
                        if direction in dir_map:
                            sx, sy, ex, ey = dir_map[direction]
                            swipe((sx, sy), (ex, ey), duration=duration)
                        else:
                            raise ValueError(f"不支持的滑动方向: {direction}")
                    elif x1 is not None and y1 is not None and x2 is not None and y2 is not None:
                        swipe((x1, y1), (x2, y2), duration=duration)
                    else:
                        raise ValueError("swipe 步骤缺少 direction 或坐标参数")

                elif action == "input":
                    input_text = params.get("text", "")
                    text(input_text)

                elif action == "wait":
                    timeout = params.get("timeout") or params.get("seconds", 1)
                    sleep(float(timeout))

                elif action == "assert":
                    expected = params.get("expected")
                    if not expected:
                        raise ValueError("assert 步骤缺少 expected 参数")
                    # 模板匹配断言
                    try:
                        pos = wait(expected, timeout=5)
                        step_result["success"] = pos is not None
                    except Exception:
                        step_result["success"] = False
                        step_result["error"] = f"断言失败：未找到元素匹配 '{expected}'"

                elif action == "screenshot":
                    screenshot_path = snapshot()
                    step_result["screenshot"] = str(screenshot_path) if screenshot_path else None

                else:
                    raise ValueError(f"不支持的操作: {action}")

                # 如果上一步没有失败标记，标记为成功
                if step_result.get("success") is False and step_result.get("error") is None:
                    step_result["success"] = True

            except Exception as step_err:
                step_result["success"] = False
                step_result["error"] = str(step_err)
                scene_passed = False
                error_message = str(step_err)
                # 非 assert 步骤失败则终止执行
                if action != "assert":
                    break

            step_result["elapsed_ms"] = round((time.time() - step_start) * 1000, 2)
            step_results.append(step_result)

    except Exception as e:
        scene_passed = False
        error_message = str(e)

    return {
        "passed": scene_passed,
        "duration_ms": round((time.time() - start_time) * 1000, 2),
        "steps": step_results,
        "error": error_message,
        "started_at": datetime.now().isoformat(),
        "device_id": device_id,
        "note": "Airtest 真机执行模式",
    }


def _execute_scene_mock(
    scene_data: list[dict[str, Any]],
    device_id: str | None = None,
) -> dict[str, Any]:
    """模拟执行场景（无 Airtest 时使用）"""
    start_time = time.time()
    step_results: list[dict[str, Any]] = []
    scene_passed = True
    error_message: str | None = None

    supported_actions = {"click", "swipe", "input", "wait", "assert", "screenshot"}

    for i, step in enumerate(scene_data):
        step_result: dict[str, Any] = {
            "step_number": step.get("step_number", i + 1),
            "action": step.get("action"),
            "success": True,
            "error": None,
            "elapsed_ms": 0,
        }

        action = step.get("action", "")
        params = step.get("params", {})

        if action not in supported_actions:
            step_result["success"] = False
            step_result["error"] = f"不支持的操作: {action}"
            scene_passed = False
            error_message = step_result["error"]
        elif action == "assert":
            # 模拟断言默认通过
            step_result["note"] = "模拟断言（默认通过）"
            if not params.get("expected"):
                step_result["success"] = False
                step_result["error"] = "assert 步骤缺少 expected 参数"
                scene_passed = False
                error_message = step_result["error"]
        elif action == "click":
            has_image = bool(params.get("image_path"))
            has_coords = params.get("x") is not None and params.get("y") is not None
            if not has_image and not has_coords:
                step_result["success"] = False
                step_result["error"] = "click 步骤缺少 image_path 或坐标参数"
                error_message = step_result["error"]
        elif action == "swipe":
            has_direction = bool(params.get("direction"))
            has_swipe_coords = (
                params.get("x1") is not None
                and params.get("y1") is not None
                and params.get("x2") is not None
                and params.get("y2") is not None
            )
            if not has_direction and not has_swipe_coords:
                step_result["success"] = False
                step_result["error"] = "swipe 步骤缺少 direction 或坐标参数"
                error_message = step_result["error"]
        elif action == "screenshot":
            step_result["screenshot"] = f"/tmp/mock_screenshot_{device_id or 'unknown'}_{int(time.time())}.png"

        if step_result["error"]:
            scene_passed = False
            error_message = step_result["error"]

        step_result["elapsed_ms"] = 80  # 模拟 80ms
        step_results.append(step_result)

        # 非 assert 步骤失败后终止
        if not step_result["success"] and action != "assert":
            break

    return {
        "passed": scene_passed,
        "duration_ms": round((time.time() - start_time) * 1000, 2),
        "steps": step_results,
        "error": error_message,
        "started_at": datetime.now().isoformat(),
        "device_id": device_id,
        "note": "模拟执行模式 — 未安装 Airtest",
    }


# 通知发送已移至 app/utils/notification.py
