"""接口测试模块核心服务

包含：变量解析器、请求执行器、通知发送器
"""
from __future__ import annotations

import hashlib
import hmac
import json
import random
import re
import string as str_mod
import time
import uuid
from base64 import b64encode
from datetime import datetime

import httpx

from .crud import create_request_history, get_environment, get_request
from .models import ApiEnvironment, ApiRequest, ApiNotificationConfig


class VariableResolver:
    """环境变量解析器

    解析 ${variable_name} 和 ${function_name(args)} 语法
    支持的函数:
      - ${random_str(n)}: 生成指定长度的随机字符串
      - ${random_int(min, max)}: 生成指定范围的随机整数
      - ${timestamp()}: 当前时间戳（秒）
      - ${uuid()}: 生成 UUID
    """

    function_registry = {
        "random_str": lambda n: "".join(random.choices(str_mod.ascii_letters + str_mod.digits, k=int(n))),
        "random_int": lambda min_v, max_v: str(random.randint(int(min_v), int(max_v))),
        "timestamp": lambda: str(int(time.time())),
        "uuid": lambda: str(uuid.uuid4()),
    }

    def __init__(self, variables: dict[str, str] | None = None):
        """初始化解析器

        Args:
            variables: 环境变量键值对，如 {"base_url": "http://api.example.com"}
        """
        self.variables = variables or {}

    @classmethod
    def build_from_environments(
        cls, global_envs: list[ApiEnvironment],
        local_envs: list[ApiEnvironment],
    ) -> VariableResolver:
        """从环境对象构建解析器（全局变量 + 局部变量，局部覆盖全局）"""
        merged = {}
        # 先注入全局激活的环境变量
        for env in global_envs:
            if env.is_active and env.variables:
                merged.update(env.variables)
        # 再注入局部激活的环境变量（覆盖）
        for env in local_envs:
            if env.is_active and env.variables:
                merged.update(env.variables)
        return cls(merged)

    def resolve(self, text: str) -> str:
        """解析字符串中的 ${var} 和 ${func(args)} 占位符

        Args:
            text: 可能包含占位符的字符串

        Returns:
            解析后的字符串
        """
        if not text:
            return text

        def replacer(match: re.Match) -> str:
            expression = match.group(1)

            # 检查是否为函数调用: func_name(args)
            func_match = re.match(r"(\w+)\((.*)\)", expression)
            if func_match:
                func_name = func_match.group(1)
                args_str = func_match.group(2)
                if func_name in self.function_registry:
                    args = [a.strip() for a in args_str.split(",") if a.strip()]
                    try:
                        return self.function_registry[func_name](*args)
                    except (TypeError, ValueError):
                        return match.group(0)  # 解析失败，返回原文
                return match.group(0)  # 未知函数，返回原文

            # 简单变量替换
            return self.variables.get(expression, match.group(0))

        return re.sub(r"\$\{([^}]+)\}", replacer, text)

    def resolve_dict(self, data: dict) -> dict:
        """递归解析字典中所有字符串值"""
        resolved = {}
        for key, value in data.items():
            if isinstance(value, str):
                resolved[key] = self.resolve(value)
            elif isinstance(value, dict):
                resolved[key] = self.resolve_dict(value)
            elif isinstance(value, list):
                resolved[key] = [
                    self.resolve(item) if isinstance(item, str)
                    else self.resolve_dict(item) if isinstance(item, dict)
                    else item
                    for item in value
                ]
            else:
                resolved[key] = value
        return resolved


class RequestExecutor:
    """HTTP 请求执行器

    使用 httpx.AsyncClient 发送真实 HTTP 请求
    """

    def __init__(self, timeout: int = 30, follow_redirects: bool = True):
        self.timeout = timeout
        self.follow_redirects = follow_redirects

    async def execute(
        self,
        method: str,
        url: str,
        headers: dict | None = None,
        query_params: dict | None = None,
        body: dict | None = None,
        body_type: str = "none",
    ) -> tuple[int, dict, str, float]:
        """执行 HTTP 请求

        Args:
            method: HTTP 方法
            url: 请求 URL
            headers: 请求头
            query_params: URL 查询参数
            body: 请求体
            body_type: 请求体类型 (none/json/form-data/x-www-form-urlencoded)

        Returns:
            (status_code, response_headers, response_body_text, elapsed_ms)
        """
        start_time = time.time()

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(self.timeout),
            follow_redirects=self.follow_redirects,
            verify=False,  # 忽略 SSL 证书验证（测试场景常用）
        ) as client:
            kwargs = {
                "method": method.upper(),
                "url": url,
                "headers": headers or {},
                "params": query_params or {},
            }

            if body_type == "json" and body:
                kwargs["json"] = body
            elif body_type == "form-data" and body:
                files = {}
                for key, value in (body or {}).items():
                    if isinstance(value, dict) and value.get("_type") == "file":
                        files[key] = (value.get("filename", "file"), value.get("content", ""))
                    else:
                        files[key] = (None, str(value))
                kwargs["files"] = files if files else None
            elif body_type == "x-www-form-urlencoded" and body:
                kwargs["data"] = body
            elif body and body_type != "none":
                kwargs["data"] = body if isinstance(body, str) else json.dumps(body)

            try:
                response = await client.request(**kwargs)
                elapsed_ms = (time.time() - start_time) * 1000

                resp_headers = dict(response.headers)
                resp_body = response.text

                return response.status_code, resp_headers, resp_body, round(elapsed_ms, 2)
            except httpx.TimeoutException:
                return 0, {}, json.dumps({"error": "请求超时"}), (time.time() - start_time) * 1000
            except httpx.ConnectError as e:
                return 0, {}, json.dumps({"error": f"连接失败: {str(e)}"}), (time.time() - start_time) * 1000
            except Exception as e:
                return 0, {}, json.dumps({"error": f"请求异常: {str(e)}"}), (time.time() - start_time) * 1000


class NotificationSender:
    """通知发送器

    支持飞书、企业微信、钉钉的 Webhook 消息发送
    """

    @classmethod
    async def send(
        cls,
        config: ApiNotificationConfig,
        title: str,
        content: str,
    ) -> tuple[bool, str]:
        """发送通知

        Args:
            config: 通知配置
            title: 消息标题
            content: 消息内容

        Returns:
            (是否成功, 响应信息)
        """
        if config.notify_type == "feishu":
            return await cls._send_feishu(config.webhook_url, config.secret, title, content)
        elif config.notify_type == "wechat":
            return await cls._send_wechat(config.webhook_url, title, content)
        elif config.notify_type == "dingtalk":
            return await cls._send_dingtalk(config.webhook_url, config.secret, title, content)
        return False, f"不支持的通知类型: {config.notify_type}"

    @classmethod
    async def _send_feishu(
        cls, webhook_url: str, secret: str | None, title: str, content: str,
    ) -> tuple[bool, str]:
        """发送飞书机器人消息"""
        try:
            timestamp = str(int(time.time()))
            sign = ""
            if secret:
                string_to_sign = f"{timestamp}\n{secret}"
                sign = b64encode(
                    hmac.new(
                        secret.encode("utf-8"),
                        string_to_sign.encode("utf-8"),
                        hashlib.sha256,
                    ).digest()
                ).decode("utf-8")

            payload = {
                "timestamp": timestamp,
                "sign": sign,
                "msg_type": "post",
                "content": {
                    "post": {
                        "zh_cn": {
                            "title": title,
                            "content": [[{"tag": "text", "text": content}]],
                        }
                    }
                },
            }

            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(webhook_url, json=payload)
                return response.is_success, response.text
        except Exception as e:
            return False, str(e)

    @classmethod
    async def _send_wechat(
        cls, webhook_url: str, title: str, content: str,
    ) -> tuple[bool, str]:
        """发送企业微信机器人消息"""
        try:
            payload = {
                "msgtype": "markdown",
                "markdown": {
                    "content": f"## {title}\n{content}",
                },
            }
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(webhook_url, json=payload)
                return response.is_success, response.text
        except Exception as e:
            return False, str(e)

    @classmethod
    async def _send_dingtalk(
        cls, webhook_url: str, secret: str | None, title: str, content: str,
    ) -> tuple[bool, str]:
        """发送钉钉机器人消息"""
        try:
            url = webhook_url
            if secret:
                timestamp = str(int(round(time.time() * 1000)))
                string_to_sign = f"{timestamp}\n{secret}"
                sign = b64encode(
                    hmac.new(
                        secret.encode("utf-8"),
                        string_to_sign.encode("utf-8"),
                        hashlib.sha256,
                    ).digest()
                ).decode("utf-8")
                url = f"{webhook_url}&timestamp={timestamp}&sign={sign}"

            payload = {
                "msgtype": "markdown",
                "markdown": {
                    "title": title,
                    "text": f"# {title}\n{content}",
                },
            }
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(url, json=payload)
                return response.is_success, response.text
        except Exception as e:
            return False, str(e)


async def run_suite_execution(
    db_session_factory,
    suite: ApiTestSuite,
    environment_id: int | None = None,
) -> dict:
    """执行测试套件

    遍历套件中的请求列表，逐个执行并检测断言

    Args:
        db_session_factory: 异步 session 工厂
        suite: 测试套件对象
        environment_id: 可选的环境 ID

    Returns:
        SuiteExecuteResult 格式字典
    """
    started_at = time.time()

    # 获取需要执行的请求
    request_ids = suite.request_ids or []
    async with db_session_factory() as db:
        requests_map = {}
        for rid in request_ids:
            req = await get_request(db, rid)
            if req:
                requests_map[rid] = req

        # 准备变量解析器
        resolver = None
        if environment_id:
            env = await get_environment(db, environment_id)
            if env and env.variables:
                resolver = VariableResolver(env.variables)

    executor = RequestExecutor()
    results = []

    for req_id in request_ids:
        req = requests_map.get(req_id)
        if not req:
            results.append({
                "request_id": req_id,
                "request_name": "未知请求",
                "method": "?",
                "url": "?",
                "status_code": None,
                "elapsed_ms": 0,
                "passed": False,
                "error": "请求不存在",
            })
            continue

        # 变量解析
        resolved_url = resolver.resolve(req.url) if resolver else req.url
        resolved_headers = resolver.resolve_dict(req.headers or {}) if resolver else (req.headers or {})
        resolved_body = resolver.resolve_dict(req.body or {}) if resolver else (req.body or {})
        resolved_params = resolver.resolve_dict(req.query_params or {}) if resolver else (req.query_params or {})

        # 执行请求
        status_code, resp_headers, resp_body, elapsed_ms = await executor.execute(
            method=req.method,
            url=resolved_url,
            headers=resolved_headers,
            query_params=resolved_params,
            body=resolved_body or None,
            body_type=req.body_type or "none",
        )

        # 断言检查
        expected = req.expected_response or {}
        passed = True
        error_msg = None

        if expected.get("status_code") and status_code != expected["status_code"]:
            passed = False
            error_msg = f"预期状态码 {expected['status_code']}，实际 {status_code}"
        elif expected.get("body_contains"):
            if expected["body_contains"] not in (resp_body or ""):
                passed = False
                error_msg = f"响应体未包含预期内容: {expected['body_contains']}"

        results.append({
            "request_id": req.id,
            "request_name": req.name,
            "method": req.method,
            "url": resolved_url,
            "status_code": status_code,
            "elapsed_ms": elapsed_ms,
            "passed": passed,
            "error": error_msg,
        })

        # 记录历史
        async with db_session_factory() as db:
            await create_request_history(db, {
                "request_id": req.id,
                "project_id": suite.project_id,
                "method": req.method,
                "url": resolved_url,
                "headers": resolved_headers,
                "query_params": resolved_params,
                "body": resolved_body,
                "response_status": status_code,
                "response_body": resp_body[:50000] if resp_body else None,  # 截断长响应体
                "response_headers": dict(resp_headers),
                "elapsed_time": elapsed_ms,
            })

    duration_ms = round((time.time() - started_at) * 1000, 2)
    finished_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    total = len(results)
    passed_count = sum(1 for r in results if r["passed"])
    failed_count = total - passed_count

    return {
        "suite_id": suite.id,
        "suite_name": suite.name,
        "total": total,
        "passed": passed_count,
        "failed": failed_count,
        "results": results,
        "duration_ms": duration_ms,
        "started_at": datetime.fromtimestamp(started_at).strftime("%Y-%m-%d %H:%M:%S"),
        "finished_at": finished_at,
    }
