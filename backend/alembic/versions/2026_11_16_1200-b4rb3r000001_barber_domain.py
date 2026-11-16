"""barber domain: pseudo, services, schedule, bookings, notifications

Revision ID: b4rb3r000001
Revises: 64524c63b666
Create Date: 2026-11-16 12:00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'b4rb3r000001'
down_revision: Union[str, None] = '64524c63b666'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column('created_time', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_time', sa.DateTime(timezone=True), nullable=True),
    ]


def upgrade() -> None:
    # --- user.pseudo (unique, case-insensitive) ---------------------------
    op.add_column('user', sa.Column('pseudo', sa.String(length=30), nullable=True))
    op.create_index('ix_user_pseudo_lower', 'user', [sa.text('lower(pseudo)')], unique=True)

    # --- services ----------------------------------------------------------
    service = op.create_table(
        'barber_service',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('price', sa.Integer(), nullable=False, comment='FCFA'),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        *_timestamps(),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('price >= 0', name='ck_barber_service_price'),
        sa.CheckConstraint('duration_minutes BETWEEN 5 AND 600', name='ck_barber_service_duration'),
    )
    op.create_index('ix_barber_service_id', 'barber_service', ['id'])

    # --- settings (single row; env defaults apply until it exists) ---------
    op.create_table(
        'barber_settings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('display_name', sa.String(length=120), nullable=False),
        sa.Column('whatsapp_number', sa.String(length=20), nullable=True),
        sa.Column('call_number', sa.String(length=20), nullable=True),
        sa.Column('slot_step_minutes', sa.Integer(), nullable=False),
        sa.Column('travel_buffer_minutes', sa.Integer(), nullable=False),
        sa.Column('pending_expiry_minutes', sa.Integer(), nullable=False),
        sa.Column('cancel_min_hours', sa.Integer(), nullable=False),
        sa.Column('min_lead_minutes', sa.Integer(), nullable=False),
        sa.Column('horizon_days', sa.Integer(), nullable=False),
        sa.Column('communes', postgresql.JSONB(), nullable=False, server_default='[]'),
        *_timestamps(),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_barber_settings_id', 'barber_settings', ['id'])

    # --- schedule ---------------------------------------------------------
    working = op.create_table(
        'barber_working_day',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('weekday', sa.SmallInteger(), nullable=False, unique=True),
        sa.Column('is_open', sa.Boolean(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('weekday BETWEEN 0 AND 6', name='ck_working_day_weekday'),
        sa.CheckConstraint('end_time > start_time', name='ck_working_day_range'),
    )
    op.create_index('ix_barber_working_day_id', 'barber_working_day', ['id'])
    breaks = op.create_table(
        'barber_break',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('weekday', sa.SmallInteger(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('label', sa.String(length=80), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('weekday BETWEEN 0 AND 6', name='ck_break_weekday'),
        sa.CheckConstraint('end_time > start_time', name='ck_break_range'),
    )
    op.create_index('ix_barber_break_id', 'barber_break', ['id'])
    op.create_index('ix_barber_break_weekday', 'barber_break', ['weekday'])
    op.create_table(
        'barber_blocked_period',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('start_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reason', sa.String(length=200), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('end_at > start_at', name='ck_blocked_range'),
    )
    op.create_index('ix_barber_blocked_period_id', 'barber_blocked_period', ['id'])
    op.create_index('ix_barber_blocked_period_start_at', 'barber_blocked_period', ['start_at'])

    # --- bookings -----------------------------------------------------------
    op.create_table(
        'barber_booking',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('reference', sa.String(length=12), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id', ondelete='SET NULL'), nullable=True),
        sa.Column('service_id', sa.Integer(), sa.ForeignKey('barber_service.id', ondelete='SET NULL'), nullable=True),
        sa.Column('service_name', sa.String(length=120), nullable=False),
        sa.Column('price', sa.Integer(), nullable=False, comment='FCFA, snapshot'),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('start_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('blocked_until', sa.DateTime(timezone=True), nullable=False),
        sa.Column('customer_phone', sa.String(length=20), nullable=False),
        sa.Column('customer_pseudo', sa.String(length=30), nullable=True),
        sa.Column('commune', sa.String(length=60), nullable=False),
        sa.Column('quartier', sa.String(length=80), nullable=False),
        sa.Column('address', sa.String(length=300), nullable=False),
        sa.Column('landmark', sa.String(length=300), nullable=True),
        sa.Column('note', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='PENDING'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_by', sa.String(length=10), nullable=True),
        sa.Column('status_reason', sa.String(length=300), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('blocked_until >= end_at AND end_at > start_at', name='ck_booking_range'),
        sa.CheckConstraint("status IN ('PENDING','CONFIRMED','REJECTED','CANCELLED','COMPLETED')",
                           name='ck_booking_status'),
    )
    op.create_index('ix_barber_booking_id', 'barber_booking', ['id'])
    op.create_index('ix_barber_booking_reference', 'barber_booking', ['reference'], unique=True)
    op.create_index('ix_barber_booking_user_id', 'barber_booking', ['user_id'])
    op.create_index('ix_barber_booking_start_at', 'barber_booking', ['start_at'])
    op.create_index('ix_barber_booking_status', 'barber_booking', ['status'])
    op.create_index('ix_barber_booking_expires_at', 'barber_booking', ['expires_at'])
    op.create_index('ix_barber_booking_customer_phone', 'barber_booking', ['customer_phone'])
    # Double-booking guard enforced by PostgreSQL (GiST on a tstzrange; no
    # extension needed since there is no equality column).
    op.execute(
        "ALTER TABLE barber_booking ADD CONSTRAINT ex_barber_booking_no_overlap "
        "EXCLUDE USING gist (tstzrange(start_at, blocked_until, '[)') WITH &&) "
        "WHERE (status IN ('PENDING', 'CONFIRMED'))"
    )

    # --- notification outbox ------------------------------------------------
    op.create_table(
        'barber_notification',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('x_id', sa.String(length=32), nullable=False, unique=True),
        sa.Column('booking_id', sa.Integer(), sa.ForeignKey('barber_booking.id', ondelete='CASCADE'), nullable=True),
        sa.Column('recipient', sa.String(length=20), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('kind', sa.String(length=40), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=10), nullable=False, server_default='pending'),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('next_attempt_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error', sa.String(length=500), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_barber_notification_id', 'barber_notification', ['id'])
    op.create_index('ix_barber_notification_booking_id', 'barber_notification', ['booking_id'])
    op.create_index('ix_barber_notification_status', 'barber_notification', ['status'])
    op.create_index('ix_barber_notification_next_attempt_at', 'barber_notification', ['next_attempt_at'])

    # --- seed data (editable from the dashboard) ----------------------------
    op.bulk_insert(service, [
        {'name': 'Coupe avec la machine du client', 'price': 10000, 'duration_minutes': 45,
         'description': 'Vous fournissez votre tondeuse.', 'is_active': True, 'sort_order': 1},
        {'name': 'Coupe avec la machine du barbier', 'price': 15000, 'duration_minutes': 45,
         'description': 'Le barbier vient avec son matériel.', 'is_active': True, 'sort_order': 2},
    ])
    from datetime import time
    op.bulk_insert(working, [
        {'weekday': d, 'is_open': d != 6, 'start_time': time(9, 0), 'end_time': time(19, 0)} for d in range(7)
    ])
    op.bulk_insert(breaks, [
        {'weekday': d, 'start_time': time(13, 0), 'end_time': time(14, 0), 'label': 'Pause déjeuner'}
        for d in range(6)
    ])


def downgrade() -> None:
    op.drop_table('barber_notification')
    op.drop_table('barber_booking')
    op.drop_table('barber_blocked_period')
    op.drop_table('barber_break')
    op.drop_table('barber_working_day')
    op.drop_table('barber_settings')
    op.drop_table('barber_service')
    op.drop_index('ix_user_pseudo_lower', table_name='user')
    op.drop_column('user', 'pseudo')
