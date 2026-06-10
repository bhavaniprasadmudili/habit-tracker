from typing import Final


ROLE_USER: Final[str] = "USER"
ROLE_ADMIN: Final[str] = "ADMIN"
ROLE_MODERATOR: Final[str] = "MODERATOR"
ROLE_FINANCE: Final[str] = "FINANCE"
ROLE_QUIZ_MANAGER: Final[str] = "QUIZ_MANAGER"
ROLE_SUPPORT: Final[str] = "SUPPORT"


ROLE_CHOICES = [
    (ROLE_USER, "User"),
    (ROLE_ADMIN, "Admin"),
    (ROLE_MODERATOR, "Moderator"),
    (ROLE_QUIZ_MANAGER, "Quiz Manager"),
    (ROLE_FINANCE, "Finance"),
    (ROLE_SUPPORT, "Support"),
]

