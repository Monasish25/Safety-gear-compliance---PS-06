"""001_initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-08 23:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('email', sa.String(255), unique=True, index=True, nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False, server_default='VIEWER'),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('force_password_change', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    # 2. refresh_tokens
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(255), unique=True, index=True, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    # 3. login_audit
    op.create_table(
        'login_audit',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('email', sa.String(255), index=True, nullable=False),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('ip_address', sa.String(100), nullable=True),
        sa.Column('reason', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    # 4. shifts
    op.create_table(
        'shifts',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(50), unique=True, nullable=False),
        sa.Column('entry_time', sa.String(10), nullable=False),
        sa.Column('end_time', sa.String(10), nullable=False),
        sa.Column('grace_period_minutes', sa.Integer(), server_default='10', nullable=False),
        sa.Column('check_in_window_minutes', sa.Integer(), server_default='60', nullable=False),
    )

    # 5. zones
    op.create_table(
        'zones',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(100), unique=True, nullable=False),
        sa.Column('req_helmet', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('req_vest', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('req_shoes', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('req_gloves', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('req_goggles', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('capacity_per_shift', sa.Integer(), server_default='50', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
    )

    # 6. workers
    op.create_table(
        'workers',
        sa.Column('worker_id', sa.String(50), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('department', sa.String(100), nullable=False),
        sa.Column('position', sa.String(100), nullable=False),
        sa.Column('badge_type', sa.String(20), server_default='QR', nullable=False),
        sa.Column('joining_date', sa.String(20), nullable=False),
        sa.Column('active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('photo_url', sa.Text(), nullable=True),
        sa.Column('attendance_rate', sa.Float(), server_default='100.0', nullable=False),
        sa.Column('shift_id', sa.Integer(), sa.ForeignKey('shifts.id'), nullable=False),
        sa.Column('default_zone_id', sa.Integer(), sa.ForeignKey('zones.id'), nullable=False),
        sa.Column('qr_token_hash', sa.String(255), index=True, nullable=True),
        sa.Column('qr_issued_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('qr_revoked', sa.Boolean(), server_default='false', nullable=False),
    )

    # 7. attendance
    op.create_table(
        'attendance',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('worker_id', sa.String(50), sa.ForeignKey('workers.worker_id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.String(20), index=True, nullable=False),
        sa.Column('shift_id', sa.Integer(), sa.ForeignKey('shifts.id'), nullable=False),
        sa.Column('check_in', sa.String(10), nullable=True),
        sa.Column('check_out', sa.String(10), nullable=True),
        sa.Column('working_hours', sa.String(50), nullable=True),
        sa.Column('status', sa.String(50), server_default='not_scanned', nullable=False),
        sa.Column('helmet', sa.String(20), server_default='NOT_VISIBLE', nullable=False),
        sa.Column('vest', sa.String(20), server_default='NOT_VISIBLE', nullable=False),
        sa.Column('shoes', sa.String(20), server_default='NOT_VISIBLE', nullable=False),
        sa.Column('gloves', sa.String(20), server_default='NOT_VISIBLE', nullable=False),
        sa.Column('goggles', sa.String(20), server_default='NOT_VISIBLE', nullable=False),
        sa.Column('default_zone_id', sa.Integer(), sa.ForeignKey('zones.id'), nullable=False),
        sa.Column('assigned_zone_id', sa.Integer(), sa.ForeignKey('zones.id'), nullable=False),
        sa.Column('decision', sa.String(50), server_default='ALLOWED', nullable=False),
        sa.Column('transfer_reason', sa.Text(), nullable=True),
        sa.Column('manual_override', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.UniqueConstraint('worker_id', 'date', name='uq_worker_date'),
    )

    # 8. zone_assignments
    op.create_table(
        'zone_assignments',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('attendance_id', sa.Integer(), sa.ForeignKey('attendance.id', ondelete='SET NULL'), nullable=True),
        sa.Column('worker_id', sa.String(50), sa.ForeignKey('workers.worker_id', ondelete='CASCADE'), nullable=False),
        sa.Column('work_date', sa.String(20), nullable=False),
        sa.Column('shift_id', sa.Integer(), sa.ForeignKey('shifts.id'), nullable=False),
        sa.Column('from_zone_id', sa.Integer(), sa.ForeignKey('zones.id'), nullable=False),
        sa.Column('to_zone_id', sa.Integer(), sa.ForeignKey('zones.id'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('missing_items', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(50), server_default='AUTO', nullable=False),
        sa.Column('approved_by', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    # 9. scan_events
    op.create_table(
        'scan_events',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), index=True, nullable=False),
        sa.Column('time', sa.String(20), nullable=False),
        sa.Column('gate', sa.String(100), nullable=False),
        sa.Column('source', sa.String(20), server_default='CAMERA', nullable=False),
        sa.Column('worker_id', sa.String(50), nullable=True),
        sa.Column('worker_name', sa.String(255), nullable=True),
        sa.Column('shift_id', sa.Integer(), nullable=True),
        sa.Column('default_zone_id', sa.Integer(), nullable=True),
        sa.Column('assigned_zone_id', sa.Integer(), nullable=True),
        sa.Column('helmet', sa.String(20), server_default='NOT_VISIBLE', nullable=False),
        sa.Column('vest', sa.String(20), server_default='NOT_VISIBLE', nullable=False),
        sa.Column('shoes', sa.String(20), server_default='NOT_VISIBLE', nullable=False),
        sa.Column('gloves', sa.String(20), server_default='NOT_VISIBLE', nullable=False),
        sa.Column('goggles', sa.String(20), server_default='NOT_VISIBLE', nullable=False),
        sa.Column('result', sa.String(50), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('image_path', sa.Text(), nullable=True),
        sa.Column('annotated_image_path', sa.Text(), nullable=True),
        sa.Column('detections', sa.JSON(), nullable=True),
        sa.Column('confidence', sa.JSON(), nullable=True),
        sa.Column('zone_decision', sa.String(50), nullable=True),
        sa.Column('needs_review', sa.Boolean(), server_default='false', nullable=False),
    )

    # 10. detection_feedback
    op.create_table(
        'detection_feedback',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('scan_event_id', sa.String(50), nullable=False),
        sa.Column('corrected_by', sa.String(255), nullable=False),
        sa.Column('corrected_states', sa.JSON(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    # 11. system_settings
    op.create_table(
        'system_settings',
        sa.Column('id', sa.Integer(), primary_key=True, default=1),
        sa.Column('settings_json', sa.JSON(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('detection_feedback')
    op.drop_table('system_settings')
    op.drop_table('scan_events')
    op.drop_table('zone_assignments')
    op.drop_table('attendance')
    op.drop_table('workers')
    op.drop_table('zones')
    op.drop_table('shifts')
    op.drop_table('login_audit')
    op.drop_table('refresh_tokens')
    op.drop_table('users')
