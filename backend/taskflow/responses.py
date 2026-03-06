"""Standardized API response helpers."""
from rest_framework.response import Response
from rest_framework import status


def success_response(data=None, message="Success", status_code=status.HTTP_200_OK):
    return Response(
        {
            'success': True,
            'message': message,
            'data': data,
        },
        status=status_code,
    )


def error_response(error="An error occurred", status_code=status.HTTP_400_BAD_REQUEST):
    return Response(
        {
            'success': False,
            'error': error,
            'data': None,
        },
        status=status_code,
    )
