"""Global custom exception handler for consistent error responses."""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            'success': False,
            'status_code': response.status_code,
            'error': _extract_error(response.data),
            'data': None,
        }
        return Response(error_data, status=response.status_code)

    # Unhandled exceptions → 500
    logger.exception("Unhandled exception: %s", exc)
    return Response(
        {
            'success': False,
            'status_code': 500,
            'error': 'Internal server error. Please try again later.',
            'data': None,
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def _extract_error(data):
    if isinstance(data, dict):
        for key in ('detail', 'non_field_errors'):
            if key in data:
                val = data[key]
                return str(val[0]) if isinstance(val, list) else str(val)
        # Return first field error
        for key, val in data.items():
            msg = val[0] if isinstance(val, list) else val
            return f"{key}: {msg}"
    if isinstance(data, list):
        return str(data[0])
    return str(data)
