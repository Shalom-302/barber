import sqlalchemy as sa
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql.functions import current_timestamp
from sqlalchemy import func

from datetime import datetime


from backend.common.model import Base, id_key, get_id
from backend.utils.timezone import timezone
from .associations import user_role



class User(Base):
    id: Mapped[id_key] = mapped_column(init=False)
    x_id: Mapped[str] = mapped_column(sa.String(32), init=False, unique=True, default=get_id)
    firstname: Mapped[str] = mapped_column(sa.String, init=False, nullable=True)
    lastname: Mapped[str] = mapped_column(sa.String, init=False, index=True, nullable=True)
    # Login identifiers: an account has an email (+ password) and/or a phone
    # number (WhatsApp OTP). Phone is stored normalized (digits, country code
    # first, no '+'), see backend.utils.phone.
    phone: Mapped[str | None] = mapped_column(sa.String(20), init=False, index=True, unique=True, nullable=True, default=None)
    email: Mapped[str | None] = mapped_column(sa.String(200), index=True, unique=True, nullable=True, default=None)
    password: Mapped[str | None] = mapped_column(sa.String, nullable=True, default=None)
    salt: Mapped[str | None] = mapped_column(sa.String, nullable=True, default=None)
    # Public display name chosen at sign-up (unique, case-insensitive).
    pseudo: Mapped[str | None] = mapped_column(sa.String(30), init=False, nullable=True, default=None)
    status: Mapped[bool] = mapped_column(sa.Boolean, default=True, server_default='1')  # User account status (False: deactivated, True: normal)
    # Several devices may stay logged in (phone + computer).
    is_multi_login: Mapped[bool] = mapped_column(sa.Boolean(), nullable=False, default=True, server_default='1')
    last_login_time: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), init=False, onupdate=func.now(), default=current_timestamp())
    join_time: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), init=False, default=current_timestamp())

    __table_args__ = (
        sa.Index('ix_user_pseudo_lower', func.lower(sa.text('pseudo')), unique=True),
    )

    # User related roles 
    roles: Mapped[list["Role"]] = relationship(secondary=user_role, init=False, lazy="joined")