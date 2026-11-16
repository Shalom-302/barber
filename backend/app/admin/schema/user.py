from datetime import datetime

import re

from pydantic import ConfigDict, EmailStr, Field, HttpUrl, field_validator, model_validator
from typing_extensions import Self

from backend.common.enums import StatusType
from backend.common.schema import SchemaBase
from backend.app.admin.schema.role import GetRoleListDetails



class UserBase(SchemaBase):
    firstname: str | None = None
    lastname: str | None = None
    fullname: str | None = None
    phone: str | None = None
    pseudo: str | None = None
    email_verified: bool = False
    country_code: str | None = None
    profile_image: dict | None = None
    

class UserLoginSchema(SchemaBase):
    email: EmailStr
    password: str


class UserRegister(SchemaBase):
    password: str
    email: EmailStr


class UserUpdate(UserBase):
    pass


class UpdateUserParam(SchemaBase):
    firstname: str | None = None
    lastname: str | None = None
    email: EmailStr | None = None
    phone: str | None = None


# 3-30 characters: letters (accents included), digits, . _ - or single inner
# spaces; must start and end with a letter or digit. (Ported from Foody.)
_PSEUDO_RE = re.compile(r"^[0-9A-Za-zÀ-ÖØ-öø-ÿ](?:[0-9A-Za-zÀ-ÖØ-öø-ÿ._\- ]{1,28})[0-9A-Za-zÀ-ÖØ-öø-ÿ]$")
# A client must not pass for the business.
_RESERVED = ('admin', 'barber', 'support', 'moderat')


def normalize_pseudo(value: str) -> str:
    pseudo = ' '.join(value.split())
    if not _PSEUDO_RE.match(pseudo):
        raise ValueError('Pseudo invalide : 3 à 30 caractères, lettres, chiffres, espaces, « . », « _ » ou « - ».')
    if any(word in pseudo.lower() for word in _RESERVED):
        raise ValueError('Ce pseudo est réservé, choisissez-en un autre.')
    return pseudo


class UpdateMeParam(SchemaBase):
    """Fields a user may change on its own profile."""
    firstname: str | None = Field(default=None, max_length=80)
    lastname: str | None = Field(default=None, max_length=80)
    pseudo: str | None = Field(default=None, max_length=40)

    @field_validator('pseudo')
    @classmethod
    def _pseudo(cls, v: str | None) -> str | None:
        return normalize_pseudo(v) if v is not None else None


class UserResetPassword(SchemaBase):
    new_password: str
    confirm_password: str


class UserInfoSchemaBase(UserBase):
    email: EmailStr | None = None



class GetUserInfoNoRelationDetail(UserInfoSchemaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    x_id: str
    profile_image: dict | None = None
    status: bool
    join_time: datetime = None
    last_login_time: datetime | None = None



class GetUserInfoListDetails(GetUserInfoNoRelationDetail):
    model_config = ConfigDict(from_attributes=True)

    roles: list[GetRoleListDetails] | None = []


class GetCurrentUserInfoDetail(GetUserInfoListDetails):
    model_config = ConfigDict(from_attributes=True)

    roles: list[GetRoleListDetails] | list[str] | None = []

    @model_validator(mode='after')
    def handel(self) -> Self:
        """Dealing with sectors and roles"""
        roles = self.roles
        if roles:
            self.roles = [{'name': role.name} for role in roles]  # type: ignore
        return self


class CurrentUserIns(GetUserInfoListDetails):
    model_config = ConfigDict(from_attributes=True)


class UpdatePasswordParam(SchemaBase):
    old_password: str
    new_password: str
    confirm_password: str
