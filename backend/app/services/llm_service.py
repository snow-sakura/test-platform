"""大模型服务：基于 LiteLLM 的统一 LLM 接口

支持 GPT-4/DeepSeek/Kimi/Claude 等模型，配置来源 settings 实例
"""
from __future__ import annotations

import json
from typing import Any

from app.config import settings

try:
    import litellm
except ImportError:
    litellm = None


# System prompts
EXTRACT_TEST_POINTS_PROMPT = """你是一个专业的测试工程师。请根据以下 PRD 文档内容，提取出所有可能的测试点。

要求：
1. 每个测试点需要包含：标题(title)、描述(description)、优先级(priority: HIGH/MEDIUM/LOW)、分类(category: 功能/UI/性能/安全/兼容性)
2. 测试点要覆盖正常流程、异常流程、边界值
3. 直接返回 JSON 数组，不要包含 markdown 代码块标记

示例输出格式：
[
  {"title": "用户登录-正常流程", "description": "验证用户使用正确的用户名和密码可以成功登录", "priority": "HIGH", "category": "功能"},
  {"title": "用户登录-密码错误", "description": "验证用户输入错误密码时登录失败并提示", "priority": "HIGH", "category": "功能"}
]"""


GENERATE_TEST_CASES_PROMPT = """你是一个资深的测试工程师。请根据以下测试点，生成详细的测试用例。

要求：
1. 每个用例需要包含：标题(title)、前置条件(precondition)、测试步骤(steps)、预期结果(expected_result)、优先级(priority: HIGH/MEDIUM/LOW)、用例类型(case_type: 功能/性能/安全/兼容性/UI)
2. 测试步骤(steps)是数组，每步包含：step(操作步骤) 和 expected_result(预期结果)
3. 直接返回 JSON 数组，不要包含 markdown 代码块标记

示例输出格式：
[
  {
    "title": "用户登录-正常场景",
    "precondition": "已注册有效账号",
    "steps": [
      {"step": "打开登录页面", "expected_result": "显示登录表单"},
      {"step": "输入正确的用户名和密码，点击登录", "expected_result": "登录成功，跳转到首页"}
    ],
    "expected_result": "用户使用正确凭据可以成功登录系统",
    "priority": "HIGH",
    "case_type": "功能"
  }
]"""


def _build_rag_context(rag_results: list[dict] | None = None) -> str:
    """构建 RAG 上下文文本"""
    if not rag_results:
        return ""
    context_parts = ["\n\n参考知识库中的相关信息："]
    for i, doc in enumerate(rag_results):
        context_parts.append(f"\n[{i + 1}] {doc.get('content', '')}")
    return "\n".join(context_parts)


async def extract_test_points(
    document_content: str,
    rag_context: str | None = None,
) -> list[dict[str, Any]]:
    """调用 LLM 提取测试点

    Args:
        document_content: 文档解析后的纯文本内容
        rag_context: RAG 知识库检索到的相关上下文（可选）

    Returns:
        测试点列表，每项含 title/description/priority/category
    """
    if litellm is None:
        raise ImportError("litellm 未安装，请执行: pip install litellm")

    user_content = f"以下是 PRD 文档内容：\n\n{document_content}"
    if rag_context:
        user_content += f"\n\n{rag_context}"

    response = await litellm.acompletion(
        model=settings.LLM_MODEL or "gpt-4",
        messages=[
            {"role": "system", "content": EXTRACT_TEST_POINTS_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.3,
        max_tokens=4000,
        api_key=settings.LLM_API_KEY,
        api_base=settings.LLM_BASE_URL or None,
    )

    content = response.choices[0].message.content
    if not content:
        return []

    # 尝试提取 JSON（兼容 markdown 代码块包装的响应）
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[-1]
        if "```" in content:
            content = content.rsplit("```", 1)[0]

    try:
        return json.loads(content.strip())
    except json.JSONDecodeError:
        return []


async def generate_test_cases(
    test_point_data: dict[str, Any],
    rag_context: str | None = None,
) -> list[dict[str, Any]]:
    """调用 LLM 根据测试点生成测试用例

    Args:
        test_point_data: 测试点信息（title/description/priority/category）
        rag_context: RAG 知识库检索到的相关上下文（可选）

    Returns:
        测试用例列表，每项含 title/precondition/steps/expected_result/priority/case_type
    """
    if litellm is None:
        raise ImportError("litellm 未安装，请执行: pip install litellm")

    tp_json = json.dumps(test_point_data, ensure_ascii=False)
    user_content = f"请根据以下测试点生成测试用例：\n\n{tp_json}"
    if rag_context:
        user_content += f"\n\n{rag_context}"

    response = await litellm.acompletion(
        model=settings.LLM_MODEL or "gpt-4",
        messages=[
            {"role": "system", "content": GENERATE_TEST_CASES_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.3,
        max_tokens=4000,
        api_key=settings.LLM_API_KEY,
        api_base=settings.LLM_BASE_URL or None,
    )

    content = response.choices[0].message.content
    if not content:
        return []

    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[-1]
        if "```" in content:
            content = content.rsplit("```", 1)[0]

    try:
        return json.loads(content.strip())
    except json.JSONDecodeError:
        return []
