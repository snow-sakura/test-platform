"""性能测试模块 - 服务层（httpx 引擎 / JMeter 集成 / SSE 进度）"""
from __future__ import annotations

import asyncio
import csv
import io
import json
import os
import re
import subprocess
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db

from .crud import create_execution, get_execution, get_scene, update_execution
from .models import PerformanceExecution, PerformanceReport

PERFORMANCE_UPLOAD_DIR = Path(settings.MEDIA_ROOT) / "performance"
PERFORMANCE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ==============================
# httpx 异步压测引擎
# ==============================


async def run_httpx_load_test(
    execution_id: int,
    scene_config: dict,
    sse_queue: asyncio.Queue | None = None,
):
    """httpx 异步压测执行

    scene_config 示例:
    {
        "url": "http://example.com/api/test",
        "method": "GET",
        "headers": {"Authorization": "Bearer xxx"},
        "body": {},
        "concurrent_users": 10,
        "duration_seconds": 30,
        "ramp_up_seconds": 5,
    }
    """
    url = scene_config.get("url", "")
    method = scene_config.get("method", "GET").upper()
    headers = scene_config.get("headers", {})
    body = scene_config.get("body")
    concurrent = scene_config.get("concurrent_users", 10)
    duration = scene_config.get("duration_seconds", 30)
    ramp_up = scene_config.get("ramp_up_seconds", 5)

    if not url:
        raise ValueError("压测 URL 不能为空")

    # 延迟注入 db session
    from app.database import get_db
    async for db in get_db():
        try:
            execution = await get_execution(db, execution_id)
            if not execution:
                return
            execution.status = "running"
            execution.started_at = datetime.now(timezone.utc)
            await db.flush()

            await _sse_put(sse_queue, {"type": "status", "data": "running"})

            # 并发执行
            results = await _run_concurrent_requests(
                url, method, headers, body, concurrent, duration, ramp_up, sse_queue,
            )

            # 计算统计
            stats = _compute_stats(results, duration)
            execution.status = "completed"
            execution.concurrent_users = concurrent
            execution.total_requests = stats["total_requests"]
            execution.total_duration_ms = int(stats["total_duration_ms"])
            execution.avg_response_time_ms = round(stats["avg"], 2)
            execution.p50_response_time_ms = round(stats["p50"], 2)
            execution.p90_response_time_ms = round(stats["p90"], 2)
            execution.p95_response_time_ms = round(stats["p95"], 2)
            execution.p99_response_time_ms = round(stats["p99"], 2)
            execution.error_rate = round(stats["error_rate"], 4)
            execution.throughput = round(stats["throughput"], 2)
            execution.completed_at = datetime.now(timezone.utc)
            await db.flush()

            # 自动生成报告
            report_data = _build_report_data(execution, stats, results)
            report = PerformanceReport(
                execution_id=execution.id,
                name=f"压测报告 #{execution.id}",
                summary=f"总请求 {stats['total_requests']}，错误率 {stats['error_rate']*100:.1f}%，平均响应 {stats['avg']:.0f}ms",
                content=report_data,
            )
            db.add(report)
            await db.commit()

            await _sse_put(sse_queue, {"type": "complete", "data": {
                "total_requests": stats["total_requests"],
                "avg_response_time_ms": stats["avg"],
                "error_rate": stats["error_rate"],
            }})
        except Exception as e:
            execution = await get_execution(db, execution_id)
            if execution:
                execution.status = "failed"
                execution.error_message = str(e)[:500]
                execution.completed_at = datetime.now(timezone.utc)
                await db.commit()
            await _sse_put(sse_queue, {"type": "error", "data": str(e)})


async def _run_concurrent_requests(
    url: str, method: str, headers: dict, body: dict | None,
    concurrent: int, duration: int, ramp_up: int,
    sse_queue: asyncio.Queue | None = None,
) -> list[dict]:
    """并发压测执行"""
    results = []
    lock = asyncio.Lock()
    start_time = time.monotonic()
    end_time = start_time + duration
    ramp_up_interval = ramp_up / max(concurrent, 1)

    async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
        async def worker(worker_id: int):
            # Ramp-up delay
            await asyncio.sleep(worker_id * ramp_up_interval)

            while time.monotonic() < end_time:
                req_start = time.monotonic()
                try:
                    resp = await client.request(method, url, json=body)
                    status = resp.status_code
                    resp_size = len(resp.content)
                except Exception as e:
                    status = 0
                    resp_size = 0

                elapsed = (time.monotonic() - req_start) * 1000  # ms
                async with lock:
                    results.append({
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "elapsed_ms": round(elapsed, 2),
                        "status": status,
                        "size": resp_size,
                        "success": 200 <= status < 400,
                    })

                    # 每 100 次推送进度
                    if len(results) % 100 == 0:
                        await _sse_put(sse_queue, {
                            "type": "progress",
                            "data": {
                                "completed": len(results),
                                "elapsed_seconds": round(time.monotonic() - start_time, 1),
                            },
                        })

        workers = [asyncio.create_task(worker(i)) for i in range(concurrent)]
        await asyncio.gather(*workers, return_exceptions=True)

    return results


def _compute_stats(results: list[dict], duration: int) -> dict:
    """计算压测统计数据"""
    if not results:
        return {"total_requests": 0, "avg": 0, "p50": 0, "p90": 0, "p95": 0, "p99": 0,
                "error_rate": 0, "throughput": 0, "total_duration_ms": duration * 1000}

    latencies = sorted(r["elapsed_ms"] for r in results)
    n = len(latencies)
    errors = sum(1 for r in results if not r["success"])

    def percentile(data, p):
        idx = max(0, min(len(data) - 1, int(len(data) * p / 100)))
        return data[idx]

    return {
        "total_requests": n,
        "avg": sum(latencies) / n,
        "p50": percentile(latencies, 50),
        "p90": percentile(latencies, 90),
        "p95": percentile(latencies, 95),
        "p99": percentile(latencies, 99),
        "error_rate": errors / n if n else 0,
        "throughput": n / duration if duration else 0,
        "total_duration_ms": duration * 1000,
    }


def _build_report_data(execution: PerformanceExecution, stats: dict, results: list[dict]) -> dict:
    """构建压测报告内容"""
    # 时间序列聚合（每 5 秒一个 bucket）
    buckets: dict[int, dict] = {}
    for r in results:
        ts = r["timestamp"]
        try:
            bucket_key = int(datetime.fromisoformat(ts).timestamp()) // 5
        except (ValueError, TypeError):
            continue
        if bucket_key not in buckets:
            buckets[bucket_key] = {"count": 0, "errors": 0, "total_latency": 0}
        buckets[bucket_key]["count"] += 1
        buckets[bucket_key]["total_latency"] += r["elapsed_ms"]
        if not r["success"]:
            buckets[bucket_key]["errors"] += 1

    time_series = [
        {
            "time": bucket_key * 5,
            "rps": round(b["count"] / 5, 2),
            "avg_latency_ms": round(b["total_latency"] / b["count"], 2) if b["count"] else 0,
            "error_count": b["errors"],
        }
        for bucket_key, b in sorted(buckets.items())
    ]

    return {
        "summary": {
            "total_requests": stats["total_requests"],
            "avg_response_time_ms": stats["avg"],
            "p50_ms": stats["p50"],
            "p90_ms": stats["p90"],
            "p95_ms": stats["p95"],
            "p99_ms": stats["p99"],
            "error_rate": stats["error_rate"],
            "throughput": stats["throughput"],
        },
        "time_series": time_series,
        "status_counts": _compute_status_counts(results),
    }


def _compute_status_counts(results: list[dict]) -> dict:
    """统计各 HTTP 状态码数量"""
    counts: dict[str, int] = {}
    for r in results:
        key = str(r["status"])
        counts[key] = counts.get(key, 0) + 1
    return counts


# ==============================
# JMeter 集成
# ==============================


async def run_jmeter_test(
    execution_id: int,
    jmx_path: str,
    scene_config: dict,
    sse_queue: asyncio.Queue | None = None,
):
    """执行 JMeter 压测"""
    async for db in get_db():
        try:
            execution = await get_execution(db, execution_id)
            if not execution:
                return

            execution.status = "running"
            execution.started_at = datetime.now(timezone.utc)
            await db.flush()

            await _sse_put(sse_queue, {"type": "status", "data": "running"})

            # 生成输出文件路径
            output_dir = PERFORMANCE_UPLOAD_DIR / f"jmeter_{execution_id}"
            output_dir.mkdir(parents=True, exist_ok=True)
            jtl_path = output_dir / "results.jtl"
            report_dir = output_dir / "report"

            # 检查 jmeter 命令
            jmeter_cmd = scene_config.get("jmeter_path", "jmeter")

            # 额外 JMeter 参数
            jmeter_args = scene_config.get("jmeter_args", "")
            props = scene_config.get("properties", {})

            cmd = [
                jmeter_cmd, "-n",
                "-t", jmx_path,
                "-l", str(jtl_path),
                "-e", "-o", str(report_dir),
            ]
            for k, v in props.items():
                cmd.extend(["-J", f"{k}={v}"])
            if jmeter_args:
                cmd.extend(jmeter_args.split())

            await _sse_put(sse_queue, {"type": "progress", "data": {"message": "JMeter 进程已启动"}})

            # 异步执行 JMeter
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            # 轮询 stdout 获取进度
            async def _read_stdout():
                line_count = 0
                while True:
                    line = await process.stdout.readline()
                    if not line:
                        break
                    line_count += 1
                    if line_count % 50 == 0:
                        await _sse_put(sse_queue, {
                            "type": "progress",
                            "data": {"message": line.decode().strip()},
                        })

            asyncio.create_task(_read_stdout())
            await process.wait()

            if process.returncode != 0:
                stderr = (await process.stderr.read()).decode()
                raise RuntimeError(f"JMeter 执行失败: {stderr[:500]}")

            # 解析 JTL 结果
            stats = _parse_jtl(str(jtl_path))
            concurrent = scene_config.get("concurrent_users", 1)

            execution.status = "completed"
            execution.concurrent_users = concurrent
            execution.total_requests = stats["total_requests"]
            execution.avg_response_time_ms = round(stats["avg"], 2)
            execution.p50_response_time_ms = round(stats["p50"], 2)
            execution.p90_response_time_ms = round(stats["p90"], 2)
            execution.p95_response_time_ms = round(stats["p95"], 2)
            execution.p99_response_time_ms = round(stats["p99"], 2)
            execution.error_rate = round(stats["error_rate"], 4)
            execution.throughput = round(stats["throughput"], 2)
            execution.completed_at = datetime.now(timezone.utc)
            await db.flush()

            # 自动生成报告
            report = PerformanceReport(
                execution_id=execution.id,
                name=f"JMeter 压测报告 #{execution.id}",
                summary=f"总请求 {stats['total_requests']}，错误率 {stats['error_rate']*100:.1f}%，平均响应 {stats['avg']:.0f}ms",
                content=stats,
            )
            db.add(report)
            await db.commit()

            await _sse_put(sse_queue, {"type": "complete", "data": stats})
        except Exception as e:
            execution = await get_execution(db, execution_id)
            if execution:
                execution.status = "failed"
                execution.error_message = str(e)[:500]
                execution.completed_at = datetime.now(timezone.utc)
                await db.commit()
            await _sse_put(sse_queue, {"type": "error", "data": str(e)})


def _parse_jtl(jtl_path: str) -> dict:
    """解析 JMeter JTL (CSV) 结果文件"""
    latencies = []
    success_count = 0
    fail_count = 0

    with open(jtl_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            elapsed = row.get("elapsed", "0")
            try:
                latencies.append(float(elapsed))
            except ValueError:
                latencies.append(0)

            success = row.get("success", "true")
            if success.lower() == "true":
                success_count += 1
            else:
                fail_count += 1

    if not latencies:
        return {"total_requests": 0, "avg": 0, "p50": 0, "p90": 0, "p95": 0, "p99": 0,
                "error_rate": 0, "throughput": 0}

    latencies.sort()
    n = len(latencies)

    def percentile(data, p):
        idx = max(0, min(len(data) - 1, int(len(data) * p / 100)))
        return data[idx]

    total_duration_seconds = scene_exec_time = 1  # fallback
    try:
        import pandas as pd
        df = pd.read_csv(jtl_path)
        if "timeStamp" in df.columns:
            time_range = df["timeStamp"].max() - df["timeStamp"].min()
            scene_exec_time = max(time_range / 1000, 1)
    except ImportError:
        scene_exec_time = 1

    return {
        "total_requests": n,
        "avg": sum(latencies) / n,
        "p50": percentile(latencies, 50),
        "p90": percentile(latencies, 90),
        "p95": percentile(latencies, 95),
        "p99": percentile(latencies, 99),
        "error_rate": fail_count / n if n else 0,
        "throughput": n / scene_exec_time,
    }


# ==============================
# SSE 工具
# ==============================


async def _sse_put(queue: asyncio.Queue | None, data: dict):
    """向 SSE 队列推送消息"""
    if queue is not None:
        await queue.put(data)
