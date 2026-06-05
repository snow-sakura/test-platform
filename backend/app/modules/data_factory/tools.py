"""数据工厂 - 80+ 数据生成工具

7 大类：测试数据 / JSON / 字符 / 编码 / 随机 / 加密 / Crontab
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import random
import re
import string
import time
import uuid
import csv
import io
import secrets
from datetime import datetime, timedelta
from typing import Any

from .schemas import ToolCategory, ToolInfo, ToolParam


# ====== 工具注册表 ======

_tool_registry: dict[str, callable] = {}


def register_tool(name: str):
    """装饰器：注册工具函数"""
    def decorator(func):
        _tool_registry[name] = func
        return func
    return decorator


def get_tool_function(name: str) -> callable | None:
    return _tool_registry.get(name)


def execute_tool(name: str, params: dict[str, Any] = None) -> str:
    """执行工具并返回字符串结果"""
    func = get_tool_function(name)
    if not func:
        raise ValueError(f"工具 '{name}' 不存在")
    result = func(**(params or {}))
    if isinstance(result, (dict, list)):
        return json.dumps(result, ensure_ascii=False, indent=2)
    return str(result)


# ====== 工具定义 ======

# ---- 1. 测试数据 (Test Data) ----

@register_tool("gen_username")
def gen_username(prefix: str = "test", suffix_digits: int = 4) -> str:
    """生成测试用户名"""
    return f"{prefix}{''.join(random.choices(string.digits, k=suffix_digits))}"

gen_username.__tool_info__ = ToolInfo(
    name="gen_username", label="生成用户名", description="生成测试用户名（前缀+随机数字）",
    category="testdata",
    params=[ToolParam(name="prefix", label="前缀", default="test"),
            ToolParam(name="suffix_digits", label="数字位数", type="number", default=4)],
)

@register_tool("gen_email")
def gen_email(prefix: str = "test", domain: str = "example.com") -> str:
    """生成测试邮箱"""
    return f"{prefix}{random.randint(100, 999)}@{domain}"

gen_email.__tool_info__ = ToolInfo(
    name="gen_email", label="生成邮箱", description="生成随机测试邮箱地址",
    category="testdata",
    params=[ToolParam(name="prefix", label="前缀", default="test"),
            ToolParam(name="domain", label="域名", default="example.com")],
)

@register_tool("gen_phone")
def gen_phone(prefix: str = "138") -> str:
    """生成测试手机号"""
    return f"{prefix}{''.join(random.choices(string.digits, k=8))}"

gen_phone.__tool_info__ = ToolInfo(
    name="gen_phone", label="生成手机号", description="生成中国大陆测试手机号",
    category="testdata",
    params=[ToolParam(name="prefix", label="号段", default="138")],
)

@register_tool("gen_id_card")
def gen_id_card() -> str:
    """生成测试身份证号（符合校验规则）"""
    areas = ["110101", "310101", "440101", "510101"]
    area = random.choice(areas)
    birth = datetime.now() - timedelta(days=random.randint(6570, 25000))
    birth_str = birth.strftime("%Y%m%d")
    seq = ''.join(random.choices(string.digits, k=3))
    base = area + birth_str + seq
    # 校验码
    weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    check_codes = "10X98765432"
    s = sum(int(base[i]) * weights[i] for i in range(17))
    return base + check_codes[s % 11]

gen_id_card.__tool_info__ = ToolInfo(
    name="gen_id_card", label="生成身份证号", description="生成符合校验规则的中国大陆身份证号",
    category="testdata",
)

@register_tool("gen_address")
def gen_address() -> str:
    """生成随机地址"""
    cities = ["北京市朝阳区", "上海市浦东新区", "广州市天河区", "深圳市南山区"]
    streets = ["中山路100号", "人民路200号", "科技路300号", "创新大道400号"]
    return f"{random.choice(cities)}{random.choice(streets)}"

gen_address.__tool_info__ = ToolInfo(
    name="gen_address", label="生成地址", description="生成随机中国地址",
    category="testdata",
)

@register_tool("gen_company")
def gen_company() -> str:
    """生成公司名"""
    prefixes = ["北京", "上海", "深圳", "杭州"]
    middles = ["云创", "智联", "星辰", "鼎新", "华创", "锐思"]
    suffixes = ["科技有限公司", "信息技术有限公司", "数据服务有限公司"]
    return f"{random.choice(prefixes)}{random.choice(middles)}{random.choice(suffixes)}"

gen_company.__tool_info__ = ToolInfo(
    name="gen_company", label="生成公司名", description="生成随机公司名称",
    category="testdata",
)

@register_tool("gen_bank_card")
def gen_bank_card() -> str:
    """生成测试银行卡号（Luhn 算法）"""
    bins = ["622202", "622203", "622208", "622909"]
    bin_str = random.choice(bins) + ''.join(random.choices(string.digits, k=9))
    # Luhn 计算校验位
    digits = [int(d) for d in bin_str]
    for i in range(len(digits) - 1, -1, -2):
        digits[i] *= 2
        if digits[i] > 9:
            digits[i] -= 9
    total = sum(digits)
    check = (10 - (total % 10)) % 10
    return bin_str + str(check)

gen_bank_card.__tool_info__ = ToolInfo(
    name="gen_bank_card", label="生成银行卡号", description="生成符合 Luhn 算法的测试银行卡号",
    category="testdata",
)

@register_tool("gen_url")
def gen_url(protocol: str = "https", domain: str = "test.com") -> str:
    """生成测试 URL"""
    paths = ["/api/v1", "/login", "/search", "/page", "/test"]
    return f"{protocol}://{domain}{random.choice(paths)}"

gen_url.__tool_info__ = ToolInfo(
    name="gen_url", label="生成 URL", description="生成随机测试 URL",
    category="testdata",
    params=[ToolParam(name="protocol", label="协议", default="https"),
            ToolParam(name="domain", label="域名", default="test.com")],
)

@register_tool("gen_ip")
def gen_ip() -> str:
    """生成随机 IP 地址"""
    return '.'.join(str(random.randint(1, 255)) for _ in range(4))

gen_ip.__tool_info__ = ToolInfo(
    name="gen_ip", label="生成 IP 地址", description="生成随机 IPv4 地址",
    category="testdata",
)

@register_tool("gen_user_agent")
def gen_user_agent() -> str:
    """生成随机 User-Agent"""
    agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
    ]
    return random.choice(agents)

gen_user_agent.__tool_info__ = ToolInfo(
    name="gen_user_agent", label="生成 User-Agent", description="生成随机浏览器 User-Agent",
    category="testdata",
)

@register_tool("gen_color")
def gen_color(format: str = "hex") -> str:
    """生成随机颜色"""
    r, g, b = random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)
    if format == "hex":
        return f"#{r:02x}{g:02x}{b:02x}"
    elif format == "rgb":
        return f"rgb({r}, {g}, {b})"
    return f"#{r:02x}{g:02x}{b:02x}"

gen_color.__tool_info__ = ToolInfo(
    name="gen_color", label="生成颜色", description="生成随机颜色值",
    category="testdata",
    params=[ToolParam(name="format", label="格式", default="hex",
                       options=[{"label": "Hex (#RRGGBB)", "value": "hex"},
                                {"label": "RGB", "value": "rgb"}])],
)

# ---- 2. JSON 工具 ----

@register_tool("json_validate")
def json_validate(input_str: str) -> str:
    """验证 JSON 格式"""
    try:
        parsed = json.loads(input_str)
        return json.dumps(parsed, ensure_ascii=False, indent=2, sort_keys=True)
    except json.JSONDecodeError as e:
        return f"JSON 格式错误: {e}"

json_validate.__tool_info__ = ToolInfo(
    name="json_validate", label="JSON 验证/格式化", description="验证 JSON 字符串格式并格式化输出",
    category="json",
    params=[ToolParam(name="input_str", label="JSON 字符串", type="text", required=True,
                       placeholder='{"key": "value"}')],
)

@register_tool("json_minify")
def json_minify(input_str: str) -> str:
    """压缩 JSON"""
    try:
        parsed = json.loads(input_str)
        return json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
    except json.JSONDecodeError as e:
        return f"JSON 格式错误: {e}"

json_minify.__tool_info__ = ToolInfo(
    name="json_minify", label="JSON 压缩", description="压缩 JSON 为单行格式",
    category="json",
    params=[ToolParam(name="input_str", label="JSON 字符串", type="text", required=True)],
)

@register_tool("json_to_yaml")
def json_to_yaml(input_str: str) -> str:
    """JSON 转 YAML"""
    try:
        parsed = json.loads(input_str)
        return _dict_to_yaml(parsed)
    except json.JSONDecodeError as e:
        return f"JSON 格式错误: {e}"

def _dict_to_yaml(d, indent=0):
    lines = []
    prefix = "  " * indent
    if isinstance(d, dict):
        for k, v in d.items():
            if isinstance(v, (dict, list)):
                lines.append(f"{prefix}{k}:")
                lines.append(_dict_to_yaml(v, indent + 1))
            else:
                lines.append(f"{prefix}{k}: {json.dumps(v, ensure_ascii=False)}")
    elif isinstance(d, list):
        for item in d:
            if isinstance(item, (dict, list)):
                lines.append(f"{prefix}-")
                lines.append(_dict_to_yaml(item, indent + 1))
            else:
                lines.append(f"{prefix}- {json.dumps(item, ensure_ascii=False)}")
    return "\n".join(lines)

json_to_yaml.__tool_info__ = ToolInfo(
    name="json_to_yaml", label="JSON 转 YAML", description="将 JSON 数据转换为 YAML 格式",
    category="json",
    params=[ToolParam(name="input_str", label="JSON 字符串", type="text", required=True)],
)

@register_tool("json_to_xml")
def json_to_xml(input_str: str, root_name: str = "root") -> str:
    """JSON 转 XML"""
    try:
        parsed = json.loads(input_str)
        return _dict_to_xml(parsed, root_name)
    except json.JSONDecodeError as e:
        return f"JSON 格式错误: {e}"

def _dict_to_xml(d, root_name="root"):
    lines = [f"<?xml version=\"1.0\" encoding=\"UTF-8\"?>", f"<{root_name}>"]
    def _walk(obj, indent=1):
        prefix = "  " * indent
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, (dict, list)):
                    lines.append(f"{prefix}<{k}>")
                    _walk(v, indent + 1)
                    lines.append(f"{prefix}</{k}>")
                else:
                    lines.append(f"{prefix}<{k}>{v}</{k}>")
        elif isinstance(obj, list):
            for item in obj:
                lines.append(f"{prefix}<item>")
                _walk(item, indent + 1)
                lines.append(f"{prefix}</item>")
    _walk(parsed)
    lines.append(f"</{root_name}>")
    return "\n".join(lines)

json_to_xml.__tool_info__ = ToolInfo(
    name="json_to_xml", label="JSON 转 XML", description="将 JSON 数据转换为 XML 格式",
    category="json",
    params=[ToolParam(name="input_str", label="JSON 字符串", type="text", required=True),
            ToolParam(name="root_name", label="根元素名", default="root")],
)

@register_tool("json_extract")
def json_extract(input_str: str, path: str) -> str:
    """JSON 路径提取"""
    try:
        parsed = json.loads(input_str)
        keys = path.strip(".").split(".")
        current = parsed
        for key in keys:
            if isinstance(current, dict):
                current = current.get(key, f"键 '{key}' 不存在")
            elif isinstance(current, list):
                try:
                    idx = int(key)
                    current = current[idx]
                except (ValueError, IndexError):
                    return f"列表索引 '{key}' 无效"
            else:
                return f"无法继续访问 '{key}'"
        return json.dumps(current, ensure_ascii=False, indent=2)
    except json.JSONDecodeError as e:
        return f"JSON 格式错误: {e}"

json_extract.__tool_info__ = ToolInfo(
    name="json_extract", label="JSON 路径提取", description="通过点分隔路径从 JSON 中提取值",
    category="json",
    params=[ToolParam(name="input_str", label="JSON 字符串", type="text", required=True),
            ToolParam(name="path", label="路径", required=True, placeholder="data.user.name")],
)

@register_tool("json_merge")
def json_merge(json_a: str, json_b: str) -> str:
    """合并两个 JSON"""
    try:
        a = json.loads(json_a)
        b = json.loads(json_b)
        if isinstance(a, dict) and isinstance(b, dict):
            a.update(b)
        elif isinstance(a, list) and isinstance(b, list):
            a.extend(b)
        else:
            return "不兼容的类型，无法合并"
        return json.dumps(a, ensure_ascii=False, indent=2)
    except json.JSONDecodeError as e:
        return f"JSON 格式错误: {e}"

json_merge.__tool_info__ = ToolInfo(
    name="json_merge", label="JSON 合并", description="合并两个 JSON 对象或数组",
    category="json",
    params=[ToolParam(name="json_a", label="JSON A", type="text", required=True),
            ToolParam(name="json_b", label="JSON B", type="text", required=True)],
)

@register_tool("json_schema_gen")
def json_schema_gen(input_str: str) -> str:
    """从 JSON 生成 JSON Schema"""
    try:
        parsed = json.loads(input_str)
        schema = _infer_schema(parsed)
        return json.dumps(schema, ensure_ascii=False, indent=2)
    except json.JSONDecodeError as e:
        return f"JSON 格式错误: {e}"

def _infer_schema(obj):
    if obj is None:
        return {"type": "null"}
    if isinstance(obj, bool):
        return {"type": "boolean"}
    if isinstance(obj, int):
        return {"type": "integer"}
    if isinstance(obj, float):
        return {"type": "number"}
    if isinstance(obj, str):
        return {"type": "string"}
    if isinstance(obj, list):
        if obj:
            return {"type": "array", "items": _infer_schema(obj[0])}
        return {"type": "array"}
    if isinstance(obj, dict):
        properties = {}
        required = []
        for k, v in obj.items():
            properties[k] = _infer_schema(v)
            required.append(k)
        return {"type": "object", "properties": properties, "required": required}
    return {}

json_schema_gen.__tool_info__ = ToolInfo(
    name="json_schema_gen", label="JSON 生成 Schema", description="从 JSON 示例自动推断 JSON Schema",
    category="json",
    params=[ToolParam(name="input_str", label="JSON 字符串", type="text", required=True)],
)

@register_tool("json_flatten")
def json_flatten(input_str: str, separator: str = ".") -> str:
    """JSON 扁平化（将嵌套 JSON 拍平为 key.path 格式）"""
    try:
        parsed = json.loads(input_str)
    except json.JSONDecodeError as e:
        return f"JSON 格式错误: {e}"

    result = {}

    def _flatten(obj, prefix=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                _flatten(v, f"{prefix}{separator}{k}" if prefix else k)
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                _flatten(v, f"{prefix}[{i}]")
        else:
            result[prefix] = obj

    _flatten(parsed)
    return json.dumps(result, ensure_ascii=False, indent=2)

json_flatten.__tool_info__ = ToolInfo(
    name="json_flatten", label="JSON 扁平化", description="将嵌套 JSON 拍平为 key.path 格式",
    category="json",
    params=[ToolParam(name="input_str", label="JSON 字符串", type="text", required=True,
                       placeholder='{"a": {"b": 1}}'),
            ToolParam(name="separator", label="分隔符", default=".")],
)

@register_tool("json_diff")
def json_diff(json_a: str, json_b: str) -> str:
    """JSON 对比（输出差异路径）"""
    try:
        a = json.loads(json_a)
        b = json.loads(json_b)
    except json.JSONDecodeError as e:
        return f"JSON 格式错误: {e}"

    differences = []

    def _compare(x, y, path=""):
        if x == y:
            return
        if type(x) != type(y):
            differences.append(f"{path}: 类型不同 ({type(x).__name__} vs {type(y).__name__})")
            differences.append(f"  - 值1: {json.dumps(x, ensure_ascii=False)}")
            differences.append(f"  - 值2: {json.dumps(y, ensure_ascii=False)}")
        elif isinstance(x, dict):
            for k in set(x) | set(y):
                _compare(x.get(k), y.get(k), f"{path}.{k}" if path else k)
        elif isinstance(x, list):
            for i in range(max(len(x), len(y))):
                if i >= len(x):
                    differences.append(f"{path}[{i}]: 新增元素 {json.dumps(y[i], ensure_ascii=False)}")
                elif i >= len(y):
                    differences.append(f"{path}[{i}]: 缺失元素 {json.dumps(x[i], ensure_ascii=False)}")
                else:
                    _compare(x[i], y[i], f"{path}[{i}]")
        else:
            differences.append(f"{path}: 值不同 ({x} vs {y})")

    _compare(a, b)
    if not differences:
        return "两个 JSON 完全相同"
    return "\n".join(differences)

json_diff.__tool_info__ = ToolInfo(
    name="json_diff", label="JSON 对比", description="对比两个 JSON 的差异并输出差异路径",
    category="json",
    params=[ToolParam(name="json_a", label="JSON A", type="text", required=True),
            ToolParam(name="json_b", label="JSON B", type="text", required=True)],
)

@register_tool("json_to_csv")
def json_to_csv(input_str: str) -> str:
    """JSON 转 CSV"""
    try:
        parsed = json.loads(input_str)
    except json.JSONDecodeError as e:
        return f"JSON 格式错误: {e}"

    # 确保是数组
    if isinstance(parsed, dict):
        parsed = [parsed]
    if not parsed:
        return ""

    # 收集所有 key
    def _get_keys(obj, prefix=""):
        keys = set()
        if isinstance(obj, dict):
            for k, v in obj.items():
                full_key = f"{prefix}.{k}" if prefix else k
                if isinstance(v, (dict, list)):
                    keys.update(_get_keys(v, full_key))
                else:
                    keys.add(full_key)
        elif isinstance(obj, list):
            keys.add(prefix)
        return keys

    all_keys = sorted(_get_keys(parsed[0]))

    def _get_value(obj, key_path):
        keys = key_path.split(".")
        current = obj
        for k in keys:
            if isinstance(current, dict):
                current = current.get(k)
            elif isinstance(current, list):
                try:
                    current = current[int(k)]
                except (ValueError, IndexError):
                    return ""
            if current is None:
                return ""
        if isinstance(current, (dict, list)):
            return json.dumps(current, ensure_ascii=False)
        return str(current)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(all_keys)
    for item in parsed:
        writer.writerow([_get_value(item, k) for k in all_keys])
    return output.getvalue()

json_to_csv.__tool_info__ = ToolInfo(
    name="json_to_csv", label="JSON 转 CSV", description="将 JSON 数组转换为 CSV 表格格式",
    category="json",
    params=[ToolParam(name="input_str", label="JSON 字符串", type="text", required=True,
                       placeholder='[{"name": "Alice", "age": 30}]')],
)

# ---- 3. 字符工具 (String) ----

@register_tool("str_case")
def str_case(input_str: str, case_type: str = "upper") -> str:
    """大小写转换"""
    if case_type == "upper":
        return input_str.upper()
    elif case_type == "lower":
        return input_str.lower()
    elif case_type == "camel":
        words = re.findall(r'[A-Za-z0-9]+', input_str)
        return words[0].lower() + ''.join(w.capitalize() for w in words[1:]) if words else ""
    elif case_type == "snake":
        s = re.sub(r'([A-Z])', r'_\1', input_str).lower().lstrip('_')
        return re.sub(r'[-\s]', '_', s)
    elif case_type == "pascal":
        words = re.findall(r'[A-Za-z0-9]+', input_str)
        return ''.join(w.capitalize() for w in words)
    elif case_type == "kebab":
        return re.sub(r'[_\s]', '-', input_str.lower())
    return input_str

str_case.__tool_info__ = ToolInfo(
    name="str_case", label="大小写转换", description="字符串大小写/命名风格转换",
    category="string",
    params=[ToolParam(name="input_str", label="输入字符串", required=True),
            ToolParam(name="case_type", label="转换类型", default="upper",
                       options=[{"label": "大写 (UPPER)", "value": "upper"},
                                {"label": "小写 (lower)", "value": "lower"},
                                {"label": "驼峰 (camelCase)", "value": "camel"},
                                {"label": "蛇形 (snake_case)", "value": "snake"},
                                {"label": "帕斯卡 (PascalCase)", "value": "pascal"},
                                {"label": "短横线 (kebab-case)", "value": "kebab"}])],
)

@register_tool("str_trim")
def str_trim(input_str: str) -> str:
    """去除空白"""
    return input_str.strip()

str_trim.__tool_info__ = ToolInfo(
    name="str_trim", label="去除空白", description="去除字符串首尾空白字符",
    category="string",
    params=[ToolParam(name="input_str", label="输入字符串", required=True)],
)

@register_tool("str_substring")
def str_substring(input_str: str, start: int = 0, end: int = 10) -> str:
    """截取子串"""
    return input_str[start:end]

str_substring.__tool_info__ = ToolInfo(
    name="str_substring", label="截取子串", description="按位置截取字符串子串",
    category="string",
    params=[ToolParam(name="input_str", label="输入字符串", required=True),
            ToolParam(name="start", label="起始位置", type="number", default=0),
            ToolParam(name="end", label="结束位置", type="number", default=10)],
)

@register_tool("str_replace")
def str_replace(input_str: str, old: str, new: str) -> str:
    """替换字符串"""
    return input_str.replace(old, new)

str_replace.__tool_info__ = ToolInfo(
    name="str_replace", label="替换字符串", description="替换字符串中的指定内容",
    category="string",
    params=[ToolParam(name="input_str", label="输入字符串", required=True),
            ToolParam(name="old", label="被替换的文本", required=True),
            ToolParam(name="new", label="替换为", required=True)],
)

@register_tool("str_repeat")
def str_repeat(input_str: str, count: int = 3, separator: str = "") -> str:
    """重复字符串"""
    return separator.join([input_str] * count)

str_repeat.__tool_info__ = ToolInfo(
    name="str_repeat", label="重复字符串", description="将字符串重复指定次数",
    category="string",
    params=[ToolParam(name="input_str", label="输入字符串", required=True),
            ToolParam(name="count", label="重复次数", type="number", default=3),
            ToolParam(name="separator", label="分隔符", default="")],
)

@register_tool("str_reverse")
def str_reverse(input_str: str) -> str:
    """反转字符串"""
    return input_str[::-1]

str_reverse.__tool_info__ = ToolInfo(
    name="str_reverse", label="反转字符串", description="反转字符串顺序",
    category="string",
    params=[ToolParam(name="input_str", label="输入字符串", required=True)],
)

@register_tool("str_pad")
def str_pad(input_str: str, width: int = 10, fill: str = "0", side: str = "left") -> str:
    """填充字符串"""
    if side == "left":
        return input_str.rjust(width, fill)
    elif side == "right":
        return input_str.ljust(width, fill)
    return input_str.rjust(width, fill)

str_pad.__tool_info__ = ToolInfo(
    name="str_pad", label="填充字符串", description="在字符串左侧或右侧填充指定字符",
    category="string",
    params=[ToolParam(name="input_str", label="输入字符串", required=True),
            ToolParam(name="width", label="总宽度", type="number", default=10),
            ToolParam(name="fill", label="填充字符", default="0"),
            ToolParam(name="side", label="填充方向", default="left",
                       options=[{"label": "左侧", "value": "left"},
                                {"label": "右侧", "value": "right"}])],
)

@register_tool("str_count")
def str_count(input_str: str, target: str = "") -> str:
    """统计字符/子串出现次数"""
    if target:
        count = input_str.count(target)
        return f"'{target}' 出现 {count} 次"
    return f"字符串长度: {len(input_str)}, 字符数: {len(input_str)}"

str_count.__tool_info__ = ToolInfo(
    name="str_count", label="字符统计", description="统计字符串长度或指定子串出现次数",
    category="string",
    params=[ToolParam(name="input_str", label="输入字符串", required=True),
            ToolParam(name="target", label="目标子串（可选）")],
)

@register_tool("str_extract")
def str_extract(input_str: str, pattern: str) -> str:
    """正则提取"""
    try:
        match = re.search(pattern, input_str)
        if match:
            return match.group(0)
        return "未匹配到结果"
    except re.error as e:
        return f"正则表达式错误: {e}"

str_extract.__tool_info__ = ToolInfo(
    name="str_extract", label="正则提取", description="使用正则表达式从字符串中提取内容",
    category="string",
    params=[ToolParam(name="input_str", label="输入字符串", required=True),
            ToolParam(name="pattern", label="正则表达式", required=True,
                       placeholder=r"\d+\.\d+\.\d+\.\d+")],
)

# ---- 4. 编码工具 (Encoding) ----

@register_tool("encode_base64")
def encode_base64(input_str: str) -> str:
    """Base64 编码"""
    return base64.b64encode(input_str.encode()).decode()

encode_base64.__tool_info__ = ToolInfo(
    name="encode_base64", label="Base64 编码", description="将字符串进行 Base64 编码",
    category="encoding",
    params=[ToolParam(name="input_str", label="输入字符串", required=True)],
)

@register_tool("decode_base64")
def decode_base64(input_str: str) -> str:
    """Base64 解码"""
    try:
        return base64.b64decode(input_str).decode()
    except Exception as e:
        return f"Base64 解码失败: {e}"

decode_base64.__tool_info__ = ToolInfo(
    name="decode_base64", label="Base64 解码", description="解码 Base64 字符串",
    category="encoding",
    params=[ToolParam(name="input_str", label="Base64 字符串", required=True)],
)

@register_tool("encode_url")
def encode_url(input_str: str) -> str:
    """URL 编码"""
    from urllib.parse import quote
    return quote(input_str, safe='')

encode_url.__tool_info__ = ToolInfo(
    name="encode_url", label="URL 编码", description="对字符串进行 URL 编码",
    category="encoding",
    params=[ToolParam(name="input_str", label="输入字符串", required=True)],
)

@register_tool("decode_url")
def decode_url(input_str: str) -> str:
    """URL 解码"""
    from urllib.parse import unquote
    try:
        return unquote(input_str)
    except Exception as e:
        return f"URL 解码失败: {e}"

decode_url.__tool_info__ = ToolInfo(
    name="decode_url", label="URL 解码", description="解码 URL 编码字符串",
    category="encoding",
    params=[ToolParam(name="input_str", label="URL 编码字符串", required=True)],
)

@register_tool("encode_html")
def encode_html(input_str: str) -> str:
    """HTML 实体编码"""
    import html
    return html.escape(input_str)

encode_html.__tool_info__ = ToolInfo(
    name="encode_html", label="HTML 实体编码", description="将特殊字符转换为 HTML 实体",
    category="encoding",
    params=[ToolParam(name="input_str", label="输入字符串", required=True)],
)

@register_tool("decode_html")
def decode_html(input_str: str) -> str:
    """HTML 实体解码"""
    import html
    return html.unescape(input_str)

decode_html.__tool_info__ = ToolInfo(
    name="decode_html", label="HTML 实体解码", description="将 HTML 实体还原为字符",
    category="encoding",
    params=[ToolParam(name="input_str", label="HTML 实体字符串", required=True)],
)

@register_tool("encode_unicode")
def encode_unicode(input_str: str) -> str:
    """Unicode 转义"""
    return ''.join(f'\\u{ord(c):04x}' for c in input_str)

encode_unicode.__tool_info__ = ToolInfo(
    name="encode_unicode", label="Unicode 转义", description="将字符串转换为 Unicode 转义序列",
    category="encoding",
    params=[ToolParam(name="input_str", label="输入字符串", required=True)],
)

@register_tool("decode_unicode")
def decode_unicode(input_str: str) -> str:
    """Unicode 解码"""
    try:
        return input_str.encode().decode('unicode-escape')
    except Exception as e:
        return f"Unicode 解码失败: {e}"

decode_unicode.__tool_info__ = ToolInfo(
    name="decode_unicode", label="Unicode 解码", description="将 Unicode 转义序列解码为字符串",
    category="encoding",
    params=[ToolParam(name="input_str", label="Unicode 转义字符串", required=True)],
)

@register_tool("encode_md5")
def encode_md5(input_str: str) -> str:
    """MD5 编码"""
    return hashlib.md5(input_str.encode()).hexdigest()

encode_md5.__tool_info__ = ToolInfo(
    name="encode_md5", label="MD5 哈希", description="计算字符串的 MD5 哈希值（不可逆）",
    category="encoding",
    params=[ToolParam(name="input_str", label="输入字符串", required=True)],
)

@register_tool("encode_sha1")
def encode_sha1(input_str: str) -> str:
    """SHA1 编码"""
    return hashlib.sha1(input_str.encode()).hexdigest()

encode_sha1.__tool_info__ = ToolInfo(
    name="encode_sha1", label="SHA1 哈希", description="计算字符串的 SHA1 哈希值",
    category="encoding",
    params=[ToolParam(name="input_str", label="输入字符串", required=True)],
)

@register_tool("encode_sha256")
def encode_sha256(input_str: str) -> str:
    """SHA256 编码"""
    return hashlib.sha256(input_str.encode()).hexdigest()

encode_sha256.__tool_info__ = ToolInfo(
    name="encode_sha256", label="SHA256 哈希", description="计算字符串的 SHA256 哈希值",
    category="encoding",
    params=[ToolParam(name="input_str", label="输入字符串", required=True)],
)

@register_tool("encode_unicode_escape")
def encode_unicode_escape(input_str: str) -> str:
    """Unicode 编码"""
    return input_str.encode('unicode_escape').decode()

encode_unicode_escape.__tool_info__ = ToolInfo(
    name="encode_unicode_escape", label="Unicode 编码", description="转义非 ASCII 字符为 Unicode 序列",
    category="encoding",
    params=[ToolParam(name="input_str", label="输入字符串", required=True)],
)

@register_tool("hex_encode")
def hex_encode(input_str: str) -> str:
    """十六进制编码"""
    return input_str.encode().hex()

hex_encode.__tool_info__ = ToolInfo(
    name="hex_encode", label="十六进制编码", description="将字符串编码为十六进制格式",
    category="encoding",
    params=[ToolParam(name="input_str", label="输入字符串", required=True)],
)

@register_tool("hex_decode")
def hex_decode(input_str: str) -> str:
    """十六进制解码"""
    try:
        return bytes.fromhex(input_str).decode()
    except Exception as e:
        return f"十六进制解码失败: {e}"

hex_decode.__tool_info__ = ToolInfo(
    name="hex_decode", label="十六进制解码", description="将十六进制字符串解码为原始字符串",
    category="encoding",
    params=[ToolParam(name="input_str", label="十六进制字符串", required=True)],
)

@register_tool("timestamp_to_date")
def timestamp_to_date(timestamp: float = 0, fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    """时间戳转日期字符串"""
    try:
        ts = timestamp if timestamp > 0 else datetime.now().timestamp()
        return datetime.fromtimestamp(ts).strftime(fmt)
    except Exception as e:
        return f"时间戳转换失败: {e}"

timestamp_to_date.__tool_info__ = ToolInfo(
    name="timestamp_to_date", label="时间戳转日期", description="将 Unix 时间戳转换为日期字符串",
    category="encoding",
    params=[ToolParam(name="timestamp", label="时间戳（秒）", type="number", default=0),
            ToolParam(name="fmt", label="日期格式", default="%Y-%m-%d %H:%M:%S")],
)

@register_tool("date_to_timestamp")
def date_to_timestamp(date_str: str = "2024-01-01", fmt: str = "%Y-%m-%d") -> str:
    """日期字符串转时间戳"""
    try:
        dt = datetime.strptime(date_str, fmt)
        return str(int(dt.timestamp()))
    except Exception as e:
        return f"日期解析失败: {e}"

date_to_timestamp.__tool_info__ = ToolInfo(
    name="date_to_timestamp", label="日期转时间戳", description="将日期字符串转换为 Unix 时间戳",
    category="encoding",
    params=[ToolParam(name="date_str", label="日期字符串", default="2024-01-01"),
            ToolParam(name="fmt", label="日期格式", default="%Y-%m-%d")],
)

@register_tool("color_to_hex")
def color_to_hex(r: int = 255, g: int = 0, b: int = 0) -> str:
    """RGB 转 Hex"""
    r, g, b = max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b))
    return f"#{r:02x}{g:02x}{b:02x}"

color_to_hex.__tool_info__ = ToolInfo(
    name="color_to_hex", label="RGB 转 Hex", description="将 RGB 颜色值转换为十六进制颜色",
    category="encoding",
    params=[ToolParam(name="r", label="红色 (0-255)", type="number", default=255),
            ToolParam(name="g", label="绿色 (0-255)", type="number", default=0),
            ToolParam(name="b", label="蓝色 (0-255)", type="number", default=0)],
)

@register_tool("color_to_rgb")
def color_to_rgb(hex_color: str = "#FF0000") -> str:
    """Hex 转 RGB"""
    try:
        hex_color = hex_color.lstrip("#")
        if len(hex_color) != 6:
            return "无效的十六进制颜色值"
        r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
        return f"rgb({r}, {g}, {b})"
    except ValueError as e:
        return f"颜色值解析失败: {e}"

color_to_rgb.__tool_info__ = ToolInfo(
    name="color_to_rgb", label="Hex 转 RGB", description="将十六进制颜色值转换为 RGB 格式",
    category="encoding",
    params=[ToolParam(name="hex_color", label="十六进制颜色", default="#FF0000")],
)

@register_tool("jwt_decode")
def jwt_decode(token: str = "") -> str:
    """JWT Token 解码（不验证签名，仅解析 payload）"""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return "无效的 JWT 格式，需要 3 段（header.payload.signature）"

        def _b64_decode(s: str) -> str:
            s = s + "=" * (4 - len(s) % 4)
            return base64.urlsafe_b64decode(s).decode("utf-8")

        header = json.loads(_b64_decode(parts[0]))
        payload = json.loads(_b64_decode(parts[1]))
        return json.dumps({
            "header": header,
            "payload": payload,
            "signature": f"{parts[2][:20]}...（共 {len(parts[2])} 字符）",
        }, ensure_ascii=False, indent=2)
    except Exception as e:
        return f"JWT 解码失败: {e}"

jwt_decode.__tool_info__ = ToolInfo(
    name="jwt_decode", label="JWT 解码", description="解码 JWT Token（不验证签名，仅解析 payload）",
    category="encoding",
    params=[ToolParam(name="token", label="JWT Token", required=True,
                       placeholder="eyJhbGciOiJIUzI1NiIs...")],
)

# ---- 5. 随机工具 (Random) ----

@register_tool("rand_int")
def rand_int(min_val: int = 1, max_val: int = 100) -> str:
    """随机整数"""
    return str(random.randint(min_val, max_val))

rand_int.__tool_info__ = ToolInfo(
    name="rand_int", label="随机整数", description="生成指定范围内的随机整数",
    category="random",
    params=[ToolParam(name="min_val", label="最小值", type="number", default=1),
            ToolParam(name="max_val", label="最大值", type="number", default=100)],
)

@register_tool("rand_float")
def rand_float(min_val: float = 0.0, max_val: float = 1.0, decimals: int = 2) -> str:
    """随机浮点数"""
    return f"{random.uniform(min_val, max_val):.{decimals}f}"

rand_float.__tool_info__ = ToolInfo(
    name="rand_float", label="随机浮点数", description="生成指定范围内的随机浮点数",
    category="random",
    params=[ToolParam(name="min_val", label="最小值", type="number", default=0.0),
            ToolParam(name="max_val", label="最大值", type="number", default=1.0),
            ToolParam(name="decimals", label="小数位数", type="number", default=2)],
)

@register_tool("rand_bool")
def rand_bool() -> str:
    """随机布尔值"""
    return str(random.choice([True, False]))

rand_bool.__tool_info__ = ToolInfo(
    name="rand_bool", label="随机布尔值", description="生成随机布尔值 (True/False)",
    category="random",
)

@register_tool("rand_string")
def rand_string(length: int = 8, chars: str = "all") -> str:
    """随机字符串"""
    pools = {"all": string.ascii_letters + string.digits,
             "letters": string.ascii_letters,
             "digits": string.digits,
             "alphanumeric": string.ascii_letters + string.digits,
             "chinese": "测试数据随机字符串生成"}
    pool = pools.get(chars, string.ascii_letters + string.digits)
    return ''.join(random.choices(pool, k=length))

rand_string.__tool_info__ = ToolInfo(
    name="rand_string", label="随机字符串", description="生成指定长度的随机字符串",
    category="random",
    params=[ToolParam(name="length", label="长度", type="number", default=8),
            ToolParam(name="chars", label="字符集", default="all",
                       options=[{"label": "全部", "value": "all"},
                                {"label": "字母", "value": "letters"},
                                {"label": "数字", "value": "digits"},
                                {"label": "字母+数字", "value": "alphanumeric"}])],
)

@register_tool("rand_date")
def rand_date(start_date: str = "2020-01-01", end_date: str = "2030-12-31", fmt: str = "%Y-%m-%d") -> str:
    """随机日期"""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    delta = (end - start).days
    random_date = start + timedelta(days=random.randint(0, delta))
    return random_date.strftime(fmt)

rand_date.__tool_info__ = ToolInfo(
    name="rand_date", label="随机日期", description="生成指定范围内的随机日期",
    category="random",
    params=[ToolParam(name="start_date", label="开始日期", default="2020-01-01"),
            ToolParam(name="end_date", label="结束日期", default="2030-12-31"),
            ToolParam(name="fmt", label="日期格式", default="%Y-%m-%d")],
)

@register_tool("rand_time")
def rand_time() -> str:
    """随机时间"""
    h, m, s = random.randint(0, 23), random.randint(0, 59), random.randint(0, 59)
    return f"{h:02d}:{m:02d}:{s:02d}"

rand_time.__tool_info__ = ToolInfo(
    name="rand_time", label="随机时间", description="生成随机时间 (HH:MM:SS)",
    category="random",
)

@register_tool("rand_datetime")
def rand_datetime(start_date: str = "2020-01-01", end_date: str = "2030-12-31") -> str:
    """随机日期时间"""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    delta = (end - start).total_seconds()
    random_dt = start + timedelta(seconds=random.randint(0, int(delta)))
    return random_dt.strftime("%Y-%m-%d %H:%M:%S")

rand_datetime.__tool_info__ = ToolInfo(
    name="rand_datetime", label="随机日期时间", description="生成随机日期时间 (YYYY-MM-DD HH:MM:SS)",
    category="random",
    params=[ToolParam(name="start_date", label="开始日期", default="2020-01-01"),
            ToolParam(name="end_date", label="结束日期", default="2030-12-31")],
)

@register_tool("rand_choice")
def rand_choice(options: str) -> str:
    """随机选择"""
    items = [o.strip() for o in options.split(",")]
    return random.choice(items)

rand_choice.__tool_info__ = ToolInfo(
    name="rand_choice", label="随机选择", description="从逗号分隔的列表中随机选择一项",
    category="random",
    params=[ToolParam(name="options", label="选项（逗号分隔）", required=True,
                       placeholder="苹果,香蕉,橘子,西瓜")],
)

@register_tool("rand_uuid")
def rand_uuid() -> str:
    """生成 UUID"""
    return str(uuid.uuid4())

rand_uuid.__tool_info__ = ToolInfo(
    name="rand_uuid", label="生成 UUID", description="生成随机 UUID v4",
    category="random",
)

@register_tool("rand_hex")
def rand_hex(length: int = 16) -> str:
    """随机十六进制"""
    return ''.join(random.choices('0123456789abcdef', k=length))

rand_hex.__tool_info__ = ToolInfo(
    name="rand_hex", label="随机十六进制", description="生成指定长度的随机十六进制字符串",
    category="random",
    params=[ToolParam(name="length", label="长度", type="number", default=16)],
)

@register_tool("rand_sample")
def rand_sample(items: str, count: int = 3) -> str:
    """随机抽样"""
    item_list = [i.strip() for i in items.split(",")]
    count = min(count, len(item_list))
    return ', '.join(random.sample(item_list, count))

rand_sample.__tool_info__ = ToolInfo(
    name="rand_sample", label="随机抽样", description="从列表中随机抽取指定数量的项",
    category="random",
    params=[ToolParam(name="items", label="列表（逗号分隔）", required=True),
            ToolParam(name="count", label="抽取数量", type="number", default=3)],
)

# ---- 6. 加密工具 (Crypto) ----

@register_tool("hmac_md5")
def hmac_md5(input_str: str, secret: str) -> str:
    """HMAC-MD5 签名"""
    return hmac.new(secret.encode(), input_str.encode(), hashlib.md5).hexdigest()

hmac_md5.__tool_info__ = ToolInfo(
    name="hmac_md5", label="HMAC-MD5", description="使用 HMAC-MD5 算法计算签名",
    category="crypto",
    params=[ToolParam(name="input_str", label="输入字符串", required=True),
            ToolParam(name="secret", label="密钥", required=True)],
)

@register_tool("hmac_sha1")
def hmac_sha1(input_str: str, secret: str) -> str:
    """HMAC-SHA1 签名"""
    return hmac.new(secret.encode(), input_str.encode(), hashlib.sha1).hexdigest()

hmac_sha1.__tool_info__ = ToolInfo(
    name="hmac_sha1", label="HMAC-SHA1", description="使用 HMAC-SHA1 算法计算签名",
    category="crypto",
    params=[ToolParam(name="input_str", label="输入字符串", required=True),
            ToolParam(name="secret", label="密钥", required=True)],
)

@register_tool("hmac_sha256")
def hmac_sha256(input_str: str, secret: str) -> str:
    """HMAC-SHA256 签名"""
    return hmac.new(secret.encode(), input_str.encode(), hashlib.sha256).hexdigest()

hmac_sha256.__tool_info__ = ToolInfo(
    name="hmac_sha256", label="HMAC-SHA256", description="使用 HMAC-SHA256 算法计算签名",
    category="crypto",
    params=[ToolParam(name="input_str", label="输入字符串", required=True),
            ToolParam(name="secret", label="密钥", required=True)],
)

@register_tool("aes_encrypt")
def aes_encrypt(input_str: str = "", key_hex: str = "", mode: str = "ECB", iv_hex: str = "") -> str:
    """AES 加密"""
    try:
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes as crypto_modes
        from cryptography.hazmat.primitives import padding
        from cryptography.hazmat.backends import default_backend
    except ImportError:
        return "AES 加密需要安装 cryptography 库"

    try:
        key = bytes.fromhex(key_hex) if key_hex else hashlib.sha256(b"default_key_for_aes").digest()[:16]
        if len(key) not in (16, 24, 32):
            key = key[:16] if len(key) > 16 else key.ljust(16, b"\0")

        data = input_str.encode("utf-8")
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(data) + padder.finalize()

        if mode.upper() == "ECB":
            cipher = Cipher(algorithms.AES(key), crypto_modes.ECB(), backend=default_backend())
        elif mode.upper() == "CBC":
            iv = bytes.fromhex(iv_hex) if iv_hex else b"\0" * 16
            iv = iv[:16].ljust(16, b"\0")
            cipher = Cipher(algorithms.AES(key), crypto_modes.CBC(iv), backend=default_backend())
        else:
            return f"不支持的加密模式: {mode}，支持 ECB/CBC"

        encryptor = cipher.encryptor()
        ct = encryptor.update(padded_data) + encryptor.finalize()
        return base64.b64encode(ct).decode()
    except Exception as e:
        return f"AES 加密失败: {e}"

aes_encrypt.__tool_info__ = ToolInfo(
    name="aes_encrypt", label="AES 加密", description="AES 加密（支持 ECB/CBC 模式，PKCS7 填充）",
    category="crypto",
    params=[ToolParam(name="input_str", label="明文", required=True),
            ToolParam(name="key_hex", label="密钥（十六进制，留空自动生成）"),
            ToolParam(name="mode", label="加密模式", default="ECB",
                       options=[{"label": "ECB", "value": "ECB"},
                                {"label": "CBC", "value": "CBC"}]),
            ToolParam(name="iv_hex", label="IV 向量（十六进制，CBC 模式需要）")],
)

@register_tool("aes_decrypt")
def aes_decrypt(input_str: str = "", key_hex: str = "", mode: str = "ECB", iv_hex: str = "") -> str:
    """AES 解密"""
    try:
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes as crypto_modes
        from cryptography.hazmat.primitives import padding
        from cryptography.hazmat.backends import default_backend
    except ImportError:
        return "AES 解密需要安装 cryptography 库"

    try:
        key = bytes.fromhex(key_hex) if key_hex else hashlib.sha256(b"default_key_for_aes").digest()[:16]
        if len(key) not in (16, 24, 32):
            key = key[:16] if len(key) > 16 else key.ljust(16, b"\0")

        ct = base64.b64decode(input_str)

        if mode.upper() == "ECB":
            cipher = Cipher(algorithms.AES(key), crypto_modes.ECB(), backend=default_backend())
        elif mode.upper() == "CBC":
            iv = bytes.fromhex(iv_hex) if iv_hex else b"\0" * 16
            iv = iv[:16].ljust(16, b"\0")
            cipher = Cipher(algorithms.AES(key), crypto_modes.CBC(iv), backend=default_backend())
        else:
            return f"不支持的加密模式: {mode}，支持 ECB/CBC"

        decryptor = cipher.decryptor()
        padded_data = decryptor.update(ct) + decryptor.finalize()
        unpadder = padding.PKCS7(128).unpadder()
        data = unpadder.update(padded_data) + unpadder.finalize()
        return data.decode("utf-8")
    except Exception as e:
        return f"AES 解密失败: {e}"

aes_decrypt.__tool_info__ = ToolInfo(
    name="aes_decrypt", label="AES 解密", description="AES 解密（支持 ECB/CBC 模式，PKCS7 填充）",
    category="crypto",
    params=[ToolParam(name="input_str", label="密文（Base64）", required=True),
            ToolParam(name="key_hex", label="密钥（十六进制，留空使用默认密钥）"),
            ToolParam(name="mode", label="加密模式", default="ECB",
                       options=[{"label": "ECB", "value": "ECB"},
                                {"label": "CBC", "value": "CBC"}]),
            ToolParam(name="iv_hex", label="IV 向量（十六进制，CBC 模式需要）")],
)

@register_tool("password_strength")
def password_strength(password: str = "") -> str:
    """密码强度检测（返回 weak/medium/strong）"""
    if not password:
        return json.dumps({"level": "weak", "score": 0, "feedback": ["请输入密码"]}, ensure_ascii=False)

    score = 0
    feedback = []

    if len(password) >= 8:
        score += 1
    else:
        feedback.append("长度不足 8 位")

    if len(password) >= 12:
        score += 1

    if re.search(r"[a-z]", password):
        score += 1
    else:
        feedback.append("缺少小写字母")

    if re.search(r"[A-Z]", password):
        score += 1
    else:
        feedback.append("缺少大写字母")

    if re.search(r"\d", password):
        score += 1
    else:
        feedback.append("缺少数字")

    if re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        score += 1
    else:
        feedback.append("缺少特殊字符")

    if score >= 6:
        level = "strong"
    elif score >= 3:
        level = "medium"
    else:
        level = "weak"

    return json.dumps({"level": level, "score": score, "feedback": feedback}, ensure_ascii=False)

password_strength.__tool_info__ = ToolInfo(
    name="password_strength", label="密码强度检测", description="检测密码强度等级（weak/medium/strong）",
    category="crypto",
    params=[ToolParam(name="password", label="密码", required=True, placeholder="输入要检测的密码")],
)

@register_tool("generate_salt")
def generate_salt(length: int = 16) -> str:
    """随机盐值生成（返回 hex 格式）"""
    return secrets.token_hex(length)

generate_salt.__tool_info__ = ToolInfo(
    name="generate_salt", label="生成随机盐值", description="生成指定长度的随机盐值（hex 格式）",
    category="crypto",
    params=[ToolParam(name="length", label="长度（字节）", type="number", default=16)],
)

@register_tool("hash_compare")
def hash_compare(hash_a: str = "", hash_b: str = "") -> str:
    """常量时间哈希比对"""
    if not hash_a or not hash_b:
        return "请提供两个哈希值进行比对"
    return "匹配" if hmac.compare_digest(hash_a, hash_b) else "不匹配"

hash_compare.__tool_info__ = ToolInfo(
    name="hash_compare", label="哈希比对", description="使用常量时间比较算法比对两个哈希值",
    category="crypto",
    params=[ToolParam(name="hash_a", label="哈希值 A", required=True),
            ToolParam(name="hash_b", label="哈希值 B", required=True)],
)

@register_tool("rsa_generate_keys")
def rsa_generate_keys(key_size: int = 2048) -> str:
    """RSA 密钥对生成（返回 PEM 格式公私钥）"""
    try:
        from cryptography.hazmat.primitives.asymmetric import rsa as rsa_asym
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.backends import default_backend
    except ImportError:
        return "RSA 密钥生成需要安装 cryptography 库"

    try:
        private_key = rsa_asym.generate_private_key(
            public_exponent=65537,
            key_size=key_size,
            backend=default_backend(),
        )
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode()

        public_key = private_key.public_key()
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode()

        return json.dumps({"private_key": private_pem, "public_key": public_pem}, ensure_ascii=False)
    except Exception as e:
        return f"RSA 密钥生成失败: {e}"

rsa_generate_keys.__tool_info__ = ToolInfo(
    name="rsa_generate_keys", label="RSA 密钥生成", description="生成 RSA 密钥对（PEM 格式）",
    category="crypto",
    params=[ToolParam(name="key_size", label="密钥长度", type="number", default=2048,
                       options=[{"label": "1024", "value": "1024"},
                                {"label": "2048", "value": "2048"},
                                {"label": "4096", "value": "4096"}])],
)

# ---- 7. Crontab 工具 ----

@register_tool("cron_parse")
def cron_parse(expression: str) -> str:
    """解析 Cron 表达式"""
    parts = expression.strip().split()
    if len(parts) != 5:
        return "无效的 Cron 表达式，需要 5 个字段"

    fields = ["分钟 (0-59)", "小时 (0-23)", "日期 (1-31)", "月份 (1-12)", "星期 (0-7)"]
    descriptions = []
    for i, (part, field) in enumerate(zip(parts, fields)):
        descriptions.append(f"  {field}: {part}")

    # 计算下次执行时间
    now = datetime.now()
    next_times = _get_next_cron_times(expression, now, 3)

    result = f"Cron 表达式解析:\n"
    result += "\n".join(descriptions)
    result += f"\n\n当前时间: {now.strftime('%Y-%m-%d %H:%M:%S')}"
    result += f"\n\n最近 3 次执行时间:"
    for i, t in enumerate(next_times, 1):
        result += f"\n  {i}. {t.strftime('%Y-%m-%d %H:%M:%S')}"
    return result

def _get_next_cron_times(expression: str, from_time: datetime, count: int = 3) -> list[datetime]:
    """计算 Cron 表达式未来的执行时间（简化版）"""
    parts = expression.strip().split()
    if len(parts) != 5:
        return []

    def _parse_field(field: str, min_val: int, max_val: int) -> set[int]:
        values = set()
        for part in field.split(","):
            if "/" in part:
                base, step = part.split("/")
                step = int(step)
                start = 0 if base == "*" else int(base)
                values.update(range(start, max_val + 1, step))
            elif part == "*":
                values.update(range(min_val, max_val + 1))
            elif "-" in part:
                a, b = map(int, part.split("-"))
                values.update(range(a, b + 1))
            else:
                values.add(int(part))
        return {v for v in values if min_val <= v <= max_val}

    minutes = _parse_field(parts[0], 0, 59)
    hours = _parse_field(parts[1], 0, 23)
    days = _parse_field(parts[2], 1, 31)
    months = _parse_field(parts[3], 1, 12)
    weekdays = _parse_field(parts[4], 0, 7)
    weekdays = {w % 7 for w in weekdays}  # 7 -> 0

    result = []
    current = from_time.replace(second=0, microsecond=0)
    for _ in range(365 * 24 * 6):  # 最多向前查找
        current += timedelta(minutes=1)
        if current.month in months and current.day in days and current.hour in hours and current.minute in minutes:
            if not weekdays or current.weekday() in weekdays:
                result.append(current)
                if len(result) >= count:
                    break
    return result

cron_parse.__tool_info__ = ToolInfo(
    name="cron_parse", label="Cron 表达式解析", description="解析 Cron 表达式并计算未来执行时间",
    category="crontab",
    params=[ToolParam(name="expression", label="Cron 表达式", required=True,
                       placeholder="*/5 * * * *")],
)

@register_tool("cron_generate")
def cron_generate(interval_type: str = "minute", interval: int = 5) -> str:
    """生成 Cron 表达式"""
    if interval_type == "minute":
        return f"*/{interval} * * * *    (每 {interval} 分钟)"
    elif interval_type == "hour":
        return f"0 */{interval} * * *    (每 {interval} 小时)"
    elif interval_type == "day":
        return f"0 9 * * *    (每天 09:00)"
    elif interval_type == "weekday":
        return f"0 9 * * 1-5    (工作日 09:00)"
    elif interval_type == "custom":
        return f"0 9 * * *    (请手动修改)"
    return f"*/{interval} * * * *"

cron_generate.__tool_info__ = ToolInfo(
    name="cron_generate", label="生成 Cron 表达式", description="按常用模式生成 Cron 表达式",
    category="crontab",
    params=[ToolParam(name="interval_type", label="间隔类型", default="minute",
                       options=[{"label": "分钟", "value": "minute"},
                                {"label": "小时", "value": "hour"},
                                {"label": "每天", "value": "day"},
                                {"label": "工作日", "value": "weekday"},
                                {"label": "自定义", "value": "custom"}]),
            ToolParam(name="interval", label="间隔数", type="number", default=5)],
)

@register_tool("cron_next_executions")
def cron_next_executions(expression: str = "*/5 * * * *", count: int = 5) -> str:
    """计算下次 N 次执行时间"""
    try:
        next_times = _get_next_cron_times(expression, datetime.now(), count)
        if not next_times:
            return "无效的 Cron 表达式或无法计算执行时间"
        lines = [f"Cron: {expression}", f"接下来 {count} 次执行时间:"]
        for i, t in enumerate(next_times, 1):
            lines.append(f"  {i}. {t.strftime('%Y-%m-%d %H:%M:%S')}")
        return "\n".join(lines)
    except Exception as e:
        return f"Cron 计算失败: {e}"

cron_next_executions.__tool_info__ = ToolInfo(
    name="cron_next_executions", label="Cron 执行时间", description="计算 Cron 表达式接下来 N 次执行时间",
    category="crontab",
    params=[ToolParam(name="expression", label="Cron 表达式", default="*/5 * * * *"),
            ToolParam(name="count", label="计算次数", type="number", default=5)],
)

@register_tool("cron_validate")
def cron_validate(expression: str = "") -> str:
    """Cron 表达式合法性校验"""
    try:
        parts = expression.strip().split()
        if len(parts) != 5:
            return json.dumps({"valid": False, "error": "需要 5 个字段（分 时 日 月 周）"}, ensure_ascii=False)

        field_names = ["分钟(0-59)", "小时(0-23)", "日期(1-31)", "月份(1-12)", "星期(0-7)"]
        ranges = [(0, 59), (0, 23), (1, 31), (1, 12), (0, 7)]
        errors = []

        for i, (part, (min_v, max_v)) in enumerate(zip(parts, ranges)):
            for item in part.split(","):
                item = item.strip()
                if item == "*":
                    continue
                base_val = item
                if "/" in item:
                    base_val = item.split("/")[1]
                if "-" in item:
                    a_val, b_val = map(int, item.split("-"))
                    if a_val < min_v or b_val > max_v:
                        errors.append(f"{field_names[i]}: 范围 {a_val}-{b_val} 超出 [{min_v}, {max_v}]")
                    continue
                val = int(base_val)
                if val < min_v or val > max_v:
                    errors.append(f"{field_names[i]}: 值 {val} 超出范围 [{min_v}, {max_v}]")

        if errors:
            return json.dumps({"valid": False, "errors": errors}, ensure_ascii=False)
        return json.dumps({"valid": True, "message": "Cron 表达式格式正确"}, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"valid": False, "error": f"解析错误: {e}"}, ensure_ascii=False)

cron_validate.__tool_info__ = ToolInfo(
    name="cron_validate", label="Cron 校验", description="校验 Cron 表达式格式和范围合法性",
    category="crontab",
    params=[ToolParam(name="expression", label="Cron 表达式", required=True,
                       placeholder="*/5 * * * *")],
)

# ---- 8. Mock 数据 (Mock Data) ----

@register_tool("mock_cn_name")
def mock_cn_name(gender: str = "random") -> str:
    """随机中文姓名"""
    surnames = ["王", "李", "张", "刘", "陈", "杨", "黄", "赵", "周", "吴", "徐", "孙", "马", "朱", "胡",
                 "郭", "何", "高", "林", "罗", "郑", "梁", "谢", "宋", "唐", "韩", "曹", "许", "邓", "萧",
                 "冯", "曾", "程", "蔡", "彭", "潘", "袁", "于", "董", "余", "苏", "叶", "吕", "魏", "蒋",
                 "田", "杜", "丁", "沈", "姜"]
    male_names = ["伟", "强", "磊", "军", "勇", "杰", "涛", "明", "超", "斌",
                   "平", "刚", "志", "建", "国", "文", "辉", "鹏", "飞", "浩"]
    female_names = ["芳", "娜", "敏", "静", "丽", "娟", "霞", "秀英", "婷", "琳",
                     "雪", "梅", "红", "燕", "慧", "倩", "洁", "萍", "玲"]

    surname = random.choice(surnames)
    if gender == "male":
        given = random.choice(male_names)
    elif gender == "female":
        given = random.choice(female_names)
    else:
        given = random.choice(male_names + female_names)
    return surname + given

mock_cn_name.__tool_info__ = ToolInfo(
    name="mock_cn_name", label="随机中文姓名", description="生成随机中文姓名（支持指定性别）",
    category="mockdata",
    params=[ToolParam(name="gender", label="性别", default="random",
                       options=[{"label": "随机", "value": "random"},
                                {"label": "男", "value": "male"},
                                {"label": "女", "value": "female"}])],
)

@register_tool("mock_cn_address")
def mock_cn_address() -> str:
    """随机中文地址"""
    provinces = ["北京市", "上海市", "广州市", "深圳市", "杭州市", "成都市",
                  "武汉市", "南京市", "西安市", "重庆市"]
    districts = ["朝阳区", "浦东新区", "天河区", "南山区", "西湖区", "武侯区",
                  "洪山区", "鼓楼区", "雁塔区", "渝中区"]
    streets = ["中山路", "人民路", "科技路", "创新大道", "建设路", "解放路",
                "和平路", "长江路", "学院路", "花园路"]
    number = f"{random.randint(1, 999)}号"
    unit = f"第{random.randint(1, 10)}栋{random.randint(1, 30)}层{random.randint(1, 4)}室"
    return f"{random.choice(provinces)}{random.choice(districts)}{random.choice(streets)}{number}{unit}"

mock_cn_address.__tool_info__ = ToolInfo(
    name="mock_cn_address", label="随机中文地址", description="生成随机中国大陆地址",
    category="mockdata",
)

@register_tool("mock_company_name")
def mock_company_name() -> str:
    """随机公司名"""
    regions = ["北京", "上海", "深圳", "广州", "杭州", "成都", "武汉", "南京", "西安", "重庆"]
    brands = ["云创", "智联", "星辰", "鼎新", "华创", "锐思", "天启", "博远", "睿达", "迅捷",
               "易联", "创想", "卓越", "恒通", "佳和", "诚铭", "华信", "瑞丰", "鼎盛", "兴业"]
    suffixes = ["科技有限公司", "信息技术有限公司", "数据服务有限公司", "网络技术有限公司",
                 "软件开发有限公司", "人工智能科技有限公司", "数字科技有限公司"]
    return f"{random.choice(regions)}{random.choice(brands)}{random.choice(suffixes)}"

mock_company_name.__tool_info__ = ToolInfo(
    name="mock_company_name", label="随机公司名", description="生成随机公司名称",
    category="mockdata",
)

@register_tool("mock_id_card")
def mock_id_card() -> str:
    """随机身份证号（符合校验规则）"""
    return gen_id_card()

mock_id_card.__tool_info__ = ToolInfo(
    name="mock_id_card", label="随机身份证号", description="生成符合校验规则的中国大陆身份证号（同 gen_id_card）",
    category="mockdata",
)

@register_tool("mock_bank_card")
def mock_bank_card() -> str:
    """随机银行卡号（符合 Luhn 算法）"""
    return gen_bank_card()

mock_bank_card.__tool_info__ = ToolInfo(
    name="mock_bank_card", label="随机银行卡号", description="生成符合 Luhn 算法的测试银行卡号（同 gen_bank_card）",
    category="mockdata",
)


# ====== 分类定义 ======

TOOL_CATEGORIES: list[ToolCategory] = [
    ToolCategory(name="testdata", label="测试数据", icon="FileTextOutlined", tools=[
        gen_username.__tool_info__, gen_email.__tool_info__, gen_phone.__tool_info__,
        gen_id_card.__tool_info__, gen_address.__tool_info__, gen_company.__tool_info__,
        gen_bank_card.__tool_info__, gen_url.__tool_info__, gen_ip.__tool_info__,
        gen_user_agent.__tool_info__, gen_color.__tool_info__,
    ]),
    ToolCategory(name="json", label="JSON 工具", icon="CodeOutlined", tools=[
        json_validate.__tool_info__, json_minify.__tool_info__, json_to_yaml.__tool_info__,
        json_to_xml.__tool_info__, json_extract.__tool_info__, json_merge.__tool_info__,
        json_schema_gen.__tool_info__, json_flatten.__tool_info__, json_diff.__tool_info__,
        json_to_csv.__tool_info__,
    ]),
    ToolCategory(name="string", label="字符工具", icon="FontSizeOutlined", tools=[
        str_case.__tool_info__, str_trim.__tool_info__, str_substring.__tool_info__,
        str_replace.__tool_info__, str_repeat.__tool_info__, str_reverse.__tool_info__,
        str_pad.__tool_info__, str_count.__tool_info__, str_extract.__tool_info__,
    ]),
    ToolCategory(name="encoding", label="编码转换", icon="SwapOutlined", tools=[
        encode_base64.__tool_info__, decode_base64.__tool_info__,
        encode_url.__tool_info__, decode_url.__tool_info__,
        encode_html.__tool_info__, decode_html.__tool_info__,
        encode_unicode.__tool_info__, decode_unicode.__tool_info__,
        encode_md5.__tool_info__, encode_sha1.__tool_info__, encode_sha256.__tool_info__,
        encode_unicode_escape.__tool_info__,
        hex_encode.__tool_info__, hex_decode.__tool_info__,
        timestamp_to_date.__tool_info__, date_to_timestamp.__tool_info__,
        color_to_hex.__tool_info__, color_to_rgb.__tool_info__,
        jwt_decode.__tool_info__,
    ]),
    ToolCategory(name="random", label="随机数据", icon="AuditOutlined", tools=[
        rand_int.__tool_info__, rand_float.__tool_info__, rand_bool.__tool_info__,
        rand_string.__tool_info__, rand_date.__tool_info__, rand_time.__tool_info__,
        rand_datetime.__tool_info__, rand_choice.__tool_info__, rand_uuid.__tool_info__,
        rand_hex.__tool_info__, rand_sample.__tool_info__,
    ]),
    ToolCategory(name="crypto", label="加密工具", icon="SafetyOutlined", tools=[
        hmac_md5.__tool_info__, hmac_sha1.__tool_info__, hmac_sha256.__tool_info__,
        aes_encrypt.__tool_info__, aes_decrypt.__tool_info__,
        password_strength.__tool_info__, generate_salt.__tool_info__,
        hash_compare.__tool_info__, rsa_generate_keys.__tool_info__,
    ]),
    ToolCategory(name="crontab", label="Crontab", icon="ClockCircleOutlined", tools=[
        cron_parse.__tool_info__, cron_generate.__tool_info__,
        cron_next_executions.__tool_info__, cron_validate.__tool_info__,
    ]),
    ToolCategory(name="mockdata", label="Mock 数据", icon="ThunderboltOutlined", tools=[
        mock_cn_name.__tool_info__, mock_cn_address.__tool_info__,
        mock_company_name.__tool_info__, mock_id_card.__tool_info__,
        mock_bank_card.__tool_info__,
    ]),
]


# ====== 工具函数解析器 ======

class ToolFunctionResolver:
    """工具函数解析器: ${function_name(args)}

    仅解析 ${func(a=1,b=2)} 格式，与 api_testing 模块的 VariableResolver（支持 ${var} 和位置参数）不同。
    使用全局工具注册表 _tool_registry 中的 80+ 装饰器注册函数。
    全局单例。
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    PATTERN = re.compile(r'\$\{(?P<name>[a-z_]+)\((?P<args>[^)]*)\)\}')

    def resolve(self, text: str) -> str:
        """解析文本中的所有 ${func(args)} 变量"""
        def _replace(match):
            name = match.group("name")
            args_str = match.group("args")
            args = self._parse_args(args_str)
            try:
                return execute_tool(name, args)
            except (ValueError, Exception) as e:
                return f"${{{name}({args_str})}}"

        return self.PATTERN.sub(_replace, text)

    def _parse_args(self, args_str: str) -> dict[str, Any]:
        """解析参数字符串 a=1,b=hello 为字典"""
        if not args_str.strip():
            return {}
        args = {}
        for part in args_str.split(","):
            if "=" in part:
                k, v = part.split("=", 1)
                k = k.strip()
                v = v.strip()
                # 尝试类型转换
                if v.lower() == "true":
                    v = True
                elif v.lower() == "false":
                    v = False
                else:
                    try:
                        if "." in v:
                            v = float(v)
                        else:
                            v = int(v)
                    except ValueError:
                        pass
                args[k] = v
        return args


def get_all_variable_functions() -> list[dict[str, str]]:
    """获取所有变量函数列表（供其他模块引用）"""
    functions = []
    for category in TOOL_CATEGORIES:
        for tool in category.tools:
            example = _build_example(tool)
            functions.append({
                "name": tool.name,
                "label": tool.label,
                "description": tool.description,
                "category": tool.category,
                "example": example,
            })
    return functions


def _build_example(tool: ToolInfo) -> str:
    """构建变量函数调用示例"""
    params = []
    for p in tool.params:
        if p.default is not None:
            params.append(f"{p.name}={p.default}")
    args = ",".join(params)
    return f"${{{tool.name}({args})}}"


# ====== 工具计数 ======

def get_tool_count() -> int:
    return len(_tool_registry)


def get_category_count() -> int:
    return len(TOOL_CATEGORIES)
