"""stub — 填补缺失的迁移（原 performance 模块迁移被移除后遗留）

Revision ID: afda5e3d1da6
Revises: 09ce76286de5
Create Date: 2026-06-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "afda5e3d1da6"
down_revision: Union[str, Sequence[str], None] = "09ce76286de5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """空操作 — 旧 performance 表已被手动清理"""
    pass


def downgrade() -> None:
    """空操作"""
    pass
