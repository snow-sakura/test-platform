"""异步任务调度器（APScheduler AsyncIOScheduler）"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.memory import MemoryJobStore

# 全局调度器实例
scheduler = AsyncIOScheduler(jobstores={"default": MemoryJobStore()})


def start_scheduler():
    """启动调度器"""
    if not scheduler.running:
        scheduler.start()


def shutdown_scheduler():
    """关闭调度器"""
    if scheduler.running:
        scheduler.shutdown(wait=False)


def add_cron_job(func, cron_expr: str, job_id: str, args: list | None = None):
    """添加 cron 定时任务"""
    scheduler.add_job(
        func,
        "cron",
        id=job_id,
        replace_existing=True,
        args=args or [],
        **parse_cron(cron_expr),
    )


def add_interval_job(func, seconds: int, job_id: str, args: list | None = None):
    """添加间隔任务"""
    scheduler.add_job(
        func,
        "interval",
        id=job_id,
        replace_existing=True,
        seconds=seconds,
        args=args or [],
    )


def remove_job(job_id: str):
    """删除任务"""
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)


def pause_job(job_id: str):
    """暂停任务"""
    scheduler.pause_job(job_id)


def resume_job(job_id: str):
    """恢复任务"""
    scheduler.resume_job(job_id)


def parse_cron(expression: str) -> dict:
    """解析 cron 表达式为 APScheduler 参数

    支持 5 位标准 cron: "minute hour day month day_of_week"
    """
    parts = expression.strip().split()
    if len(parts) != 5:
        raise ValueError(f"无效的 cron 表达式: {expression}")

    return {
        "minute": parts[0],
        "hour": parts[1],
        "day": parts[2],
        "month": parts[3],
        "day_of_week": parts[4],
    }
