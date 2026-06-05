"""feat: 性能测试模块 + CI/CD 建表（合并迁移）

Revision ID: ff1234567890
Revises: 4a95d1c5b1e3
Create Date: 2026-06-05 18:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = "ff1234567890"
down_revision: Union[str, Sequence[str], None] = "4a95d1c5b1e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """创建新表，删除旧表"""

    # ----- 删除旧 performance 表（pref_ 前缀，之前实现遗留） -----
    op.execute("DROP TABLE IF EXISTS perf_reports")
    op.execute("DROP TABLE IF EXISTS perf_executions")
    op.execute("DROP TABLE IF EXISTS perf_scenarios")

    # ----- 创建新 performance_* 表 -----
    op.create_table(
        "performance_jmx_files",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False, comment="文件 ID"),
        sa.Column("project_id", sa.Integer(), nullable=False, comment="项目 ID"),
        sa.Column("name", sa.String(200), nullable=False, comment="文件名称"),
        sa.Column("description", sa.Text(), nullable=True, comment="描述"),
        sa.Column("file_path", sa.String(500), nullable=False, comment="存储路径"),
        sa.Column("file_size", sa.Integer(), nullable=False, comment="文件大小（字节）"),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, comment="创建时间"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        comment="JMeter JMX 文件",
        mysql_engine="InnoDB",
        mysql_default_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_table(
        "performance_scenes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False, comment="场景 ID"),
        sa.Column("project_id", sa.Integer(), nullable=False, comment="项目 ID"),
        sa.Column("name", sa.String(200), nullable=False, comment="场景名称"),
        sa.Column("description", sa.Text(), nullable=True, comment="描述"),
        sa.Column("scenario_type", sa.String(20), nullable=False, comment="httpx / jmeter"),
        sa.Column("config", mysql.JSON(), nullable=True, comment="场景配置"),
        sa.Column("status", sa.String(20), nullable=False, comment="draft/ready/archived"),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, comment="创建时间"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, comment="更新时间"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        comment="压测场景",
        mysql_engine="InnoDB",
        mysql_default_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_table(
        "performance_executions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False, comment="执行 ID"),
        sa.Column("scene_id", sa.Integer(), nullable=False, comment="关联场景"),
        sa.Column("status", sa.String(20), nullable=False, comment="pending/running/completed/failed"),
        sa.Column("config_snapshot", mysql.JSON(), nullable=True, comment="执行时的配置快照"),
        sa.Column("concurrent_users", sa.Integer(), nullable=True, comment="并发用户数"),
        sa.Column("total_requests", sa.Integer(), nullable=True, comment="总请求数"),
        sa.Column("total_duration_ms", sa.Integer(), nullable=True, comment="总耗时(ms)"),
        sa.Column("avg_response_time_ms", sa.Float(), nullable=True, comment="平均响应时间(ms)"),
        sa.Column("p50_response_time_ms", sa.Float(), nullable=True, comment="P50 响应时间(ms)"),
        sa.Column("p90_response_time_ms", sa.Float(), nullable=True, comment="P90 响应时间(ms)"),
        sa.Column("p95_response_time_ms", sa.Float(), nullable=True, comment="P95 响应时间(ms)"),
        sa.Column("p99_response_time_ms", sa.Float(), nullable=True, comment="P99 响应时间(ms)"),
        sa.Column("error_rate", sa.Float(), nullable=True, comment="错误率(0-1)"),
        sa.Column("throughput", sa.Float(), nullable=True, comment="吞吐量(req/s)"),
        sa.Column("error_message", sa.Text(), nullable=True, comment="错误信息"),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True, comment="开始时间"),
        sa.Column("completed_at", sa.DateTime(), nullable=True, comment="完成时间"),
        sa.Column("created_at", sa.DateTime(), nullable=False, comment="创建时间"),
        sa.ForeignKeyConstraint(["scene_id"], ["performance_scenes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        comment="压测执行记录",
        mysql_engine="InnoDB",
        mysql_default_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_table(
        "performance_reports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False, comment="报告 ID"),
        sa.Column("execution_id", sa.Integer(), nullable=False, comment="关联执行"),
        sa.Column("name", sa.String(200), nullable=False, comment="报告名称"),
        sa.Column("summary", sa.Text(), nullable=True, comment="报告摘要"),
        sa.Column("content", mysql.JSON(), nullable=True, comment="详细报告内容"),
        sa.Column("created_at", sa.DateTime(), nullable=False, comment="创建时间"),
        sa.ForeignKeyConstraint(["execution_id"], ["performance_executions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        comment="压测报告",
        mysql_engine="InnoDB",
        mysql_default_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # ----- CI/CD 表 -----
    op.create_table(
        "ci_pipelines",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False, comment="管道 ID"),
        sa.Column("ci_type", sa.String(20), nullable=False, comment="CI 类型: gitlab/github/jenkins"),
        sa.Column("external_pipeline_id", sa.String(255), nullable=True, comment="外部 CI 管道 ID"),
        sa.Column("external_project", sa.String(500), nullable=True, comment="外部项目全称"),
        sa.Column("external_ref", sa.String(255), nullable=True, comment="外部分支/Tag 引用"),
        sa.Column("status", sa.String(20), nullable=False, comment="pending/running/completed/failed/aborted"),
        sa.Column("trigger_event", sa.String(100), nullable=True, comment="触发事件类型"),
        sa.Column("commit_sha", sa.String(100), nullable=True, comment="提交 SHA"),
        sa.Column("commit_message", sa.Text(), nullable=True, comment="提交消息"),
        sa.Column("author", sa.String(200), nullable=True, comment="提交作者"),
        sa.Column("total_steps", sa.Integer(), nullable=False, comment="总步骤数"),
        sa.Column("passed_steps", sa.Integer(), nullable=False, comment="通过步骤数"),
        sa.Column("failed_steps", sa.Integer(), nullable=False, comment="失败步骤数"),
        sa.Column("started_at", sa.DateTime(), nullable=True, comment="开始时间"),
        sa.Column("completed_at", sa.DateTime(), nullable=True, comment="完成时间"),
        sa.Column("duration_ms", sa.Integer(), nullable=True, comment="总耗时(ms)"),
        sa.Column("created_at", sa.DateTime(), nullable=False, comment="创建时间"),
        sa.PrimaryKeyConstraint("id"),
        comment="CI 管道记录",
        mysql_engine="InnoDB",
        mysql_default_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_table(
        "ci_pipeline_steps",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False, comment="步骤 ID"),
        sa.Column("pipeline_id", sa.Integer(), nullable=False, comment="所属管道 ID"),
        sa.Column("step_order", sa.Integer(), nullable=False, comment="执行顺序"),
        sa.Column("module_type", sa.String(30), nullable=False, comment="模块类型"),
        sa.Column("module_config", mysql.JSON(), nullable=True, comment="模块配置"),
        sa.Column("status", sa.String(20), nullable=False, comment="状态"),
        sa.Column("result", mysql.JSON(), nullable=True, comment="执行结果摘要"),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["pipeline_id"], ["ci_pipelines.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        comment="CI 管道步骤",
        mysql_engine="InnoDB",
        mysql_default_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_table(
        "ci_api_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False, comment="Token ID"),
        sa.Column("name", sa.String(100), nullable=False, comment="Token 名称"),
        sa.Column("token", sa.String(255), nullable=False, comment="Token 哈希值"),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
        comment="CI/CD API Token",
        mysql_engine="InnoDB",
        mysql_default_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_table(
        "ci_webhook_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False, comment="事件 ID"),
        sa.Column("ci_type", sa.String(20), nullable=False, comment="CI 类型"),
        sa.Column("event_type", sa.String(100), nullable=True),
        sa.Column("pipeline_id", sa.Integer(), nullable=True),
        sa.Column("source_ip", sa.String(45), nullable=True, comment="来源 IP"),
        sa.Column("raw_payload", mysql.JSON(), nullable=True, comment="原始回调数据"),
        sa.Column("received_at", sa.DateTime(), nullable=False, comment="接收时间"),
        sa.ForeignKeyConstraint(["pipeline_id"], ["ci_pipelines.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        comment="Webhook 事件记录",
        mysql_engine="InnoDB",
        mysql_default_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )


def downgrade() -> None:
    """回滚：删除新表，恢复旧表"""
    op.drop_table("ci_webhook_events")
    op.drop_table("ci_api_tokens")
    op.drop_table("ci_pipeline_steps")
    op.drop_table("ci_pipelines")
    op.drop_table("performance_reports")
    op.drop_table("performance_executions")
    op.drop_table("performance_scenes")
    op.drop_table("performance_jmx_files")
