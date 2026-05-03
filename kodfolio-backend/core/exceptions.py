"""Custom exception handler — все ошибки в едином формате."""
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    # Унифицированный формат:
    # {"error": {"code": <http_code>, "message": "...", "details": {...}}}
    detail = response.data
    message = "Request failed"

    if isinstance(detail, dict):
        # Берём первое сообщение если есть
        if "detail" in detail:
            message = str(detail["detail"])
        else:
            first_key = next(iter(detail), None)
            if first_key:
                first_val = detail[first_key]
                message = str(first_val[0]) if isinstance(first_val, list) else str(first_val)
    elif isinstance(detail, list) and detail:
        message = str(detail[0])

    response.data = {
        "error": {
            "code": response.status_code,
            "message": message,
            "details": detail,
        }
    }
    return response


class BaseAPIError(Exception):
    """Базовое исключение для бизнес-логики."""

    default_code = 400
    default_message = "Business rule violated"

    def __init__(self, message: str | None = None, code: int | None = None):
        self.message = message or self.default_message
        self.code = code or self.default_code
        super().__init__(self.message)
