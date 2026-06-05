"""数据工厂 - API 路由"""
from __future__ import annotations

import base64
import io
import json
import logging

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.rbac.service import require_permission

from .crud import (
    create_record, delete_record, get_records, get_today_executions, get_top_tools,
)
from .models import DataFactoryRecord
from .schemas import (
    BatchExecuteRequest, DataFactoryRecordResponse, ToolCategory,
    ToolExecuteRequest, UsageStats, VariableFunction,
)
from .tools import (
    TOOL_CATEGORIES, ToolFunctionResolver, execute_tool,
    get_all_variable_functions, get_category_count, get_tool_count,
)

logger = logging.getLogger(__name__)

# 工具函数解析器全局实例
tool_resolver = ToolFunctionResolver()

router = APIRouter(dependencies=[Depends(get_current_user)], tags=["data-factory"])


# ====== 工具分类 ======

@router.get("/categories", response_model=list[ToolCategory])
async def list_categories(_=Depends(require_permission("data_factory.view"))):
    """获取工具分类列表（含工具定义）"""
    return TOOL_CATEGORIES


@router.get("/categories/{category_name}", response_model=ToolCategory)
async def get_category(category_name: str, _=Depends(require_permission("data_factory.view"))):
    """获取单个分类详情"""
    for cat in TOOL_CATEGORIES:
        if cat.name == category_name:
            return cat
    raise HTTPException(status_code=404, detail="分类不存在")


# ====== 工具执行 ======

@router.post("/execute")
async def execute_tool_endpoint(
    data: ToolExecuteRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("data_factory.create")),
):
    """执行数据生成工具"""
    try:
        output = execute_tool(data.tool_name, data.params)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("工具执行异常: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="工具执行失败")

    # 获取工具分类
    category = ""
    for cat in TOOL_CATEGORIES:
        for tool in cat.tools:
            if tool.name == data.tool_name:
                category = cat.name
                break

    # 保存执行记录
    try:
        await create_record(db, {
            "tool_name": data.tool_name,
            "tool_category": category,
            "input_data": data.params,
            "output_data": output[:1000],
            "tags": data.tags,
        })
    except Exception as e:
        logger.warning(f"保存记录失败: {e}")

    return {"tool_name": data.tool_name, "output": output}


@router.post("/batch-execute")
async def batch_execute(
    data: BatchExecuteRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("data_factory.create")),
):
    """批量生成数据"""
    results = []
    for i in range(data.count):
        try:
            output = execute_tool(data.tool_name, data.params)
            results.append({"index": i + 1, "output": output})
        except Exception as e:
            results.append({"index": i + 1, "error": str(e)})

    # 保存批量记录
    try:
        category = ""
        for cat in TOOL_CATEGORIES:
            for tool in cat.tools:
                if tool.name == data.tool_name:
                    category = cat.name
                    break
        await create_record(db, {
            "tool_name": data.tool_name,
            "tool_category": category,
            "input_data": {**data.params, "_batch_count": data.count},
            "output_data": json.dumps(results[:5], ensure_ascii=False),
            "tags": data.tags,
        })
    except Exception as e:
        logger.warning(f"保存记录失败: {e}")

    return {"tool_name": data.tool_name, "count": data.count, "results": results}


# ====== 执行记录 ======

@router.get("/records", response_model=dict)
async def list_records(
    tag: str | None = Query(None),
    tool_name: str | None = Query(None),
    tool_category: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("data_factory.view")),
):
    """获取执行记录"""
    skip = (page - 1) * page_size
    records, total = await get_records(db, tag, tool_name, tool_category, skip, page_size)
    return {
        "count": total,
        "results": [DataFactoryRecordResponse.model_validate(r) for r in records],
    }


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record_endpoint(record_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("data_factory.delete"))):
    """删除执行记录"""
    record = await db.get(DataFactoryRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    await delete_record(db, record)


# ====== 统计 ======

@router.get("/stats", response_model=UsageStats)
async def get_stats(db: AsyncSession = Depends(get_db), _=Depends(require_permission("data_factory.view"))):
    """获取数据工厂使用统计"""
    total_result = await db.execute(
        select(func.count(DataFactoryRecord.id))
    )
    total_executions = total_result.scalar() or 0

    today_count = await get_today_executions(db)
    top_tools = await get_top_tools(db)

    return UsageStats(
        total_executions=total_executions,
        today_executions=today_count,
        tool_count=get_tool_count(),
        category_count=get_category_count(),
        top_tools=top_tools,
    )


# ====== 变量函数（供其他模块引用） ======

@router.get("/variable-functions", response_model=list[VariableFunction])
async def list_variable_functions(_=Depends(require_permission("data_factory.view"))):
    """获取所有变量函数列表"""
    return get_all_variable_functions()


@router.post("/resolve-variables")
async def resolve_variables(
    text: str = Query(..., description="包含 ${func(args)} 的文本"),
    _=Depends(require_permission("data_factory.create")),
):
    """解析变量函数"""
    resolved = tool_resolver.resolve(text)
    return {"original": text, "resolved": resolved}


@router.post("/download-static-file")
async def download_static_file(
    data: dict = Body(..., description="工具执行请求: {tool_name, params}"),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("data_factory.create")),
):
    """生成并下载静态文件（条形码/二维码等）

    接收 {tool_name, params}，执行工具，将 base64 图片解码返回文件。
    如果结果不是 base64 图片格式，则返回文本文件。
    """
    tool_name = data.get("tool_name", "")
    params = data.get("params", {})

    if not tool_name:
        raise HTTPException(status_code=400, detail="tool_name 不能为空")

    try:
        result = execute_tool(tool_name, params)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("工具执行异常: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="工具执行失败")

    # 尝试解码为图片文件
    try:
        decoded = base64.b64decode(result)

        # 检测文件类型
        if decoded[:8] == b'\x89PNG\r\n\x1a\n':
            media_type = "image/png"
            ext = ".png"
        elif decoded[:3] == b'\xff\xd8\xff':
            media_type = "image/jpeg"
            ext = ".jpg"
        elif decoded[:6] in (b'GIF87a', b'GIF89a'):
            media_type = "image/gif"
            ext = ".gif"
        elif decoded[:4] == b'RIFF' and decoded[8:12] == b'WEBP':
            media_type = "image/webp"
            ext = ".webp"
        elif decoded[:4] == b'%PDF':
            media_type = "application/pdf"
            ext = ".pdf"
        elif decoded[:2] == b'PK':
            media_type = "application/zip"
            ext = ".zip"
        else:
            # 不是已知的二进制格式，返回文本
            return StreamingResponse(
                io.StringIO(result),
                media_type="text/plain; charset=utf-8",
                headers={"Content-Disposition": f"attachment; filename={tool_name}_output.txt"},
            )

        return StreamingResponse(
            io.BytesIO(decoded),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={tool_name}_output{ext}"},
        )
    except ValueError:
        # 不是 base64，返回文本
        return StreamingResponse(
            io.StringIO(result),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={tool_name}_output.txt"},
        )
    except Exception as e:
        logger.warning(f"文件下载处理异常: {e}")
        return StreamingResponse(
            io.StringIO(result),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={tool_name}_output.txt"},
        )
