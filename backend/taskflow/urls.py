"""taskflow URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
    openapi.Info(
        title="TaskFlow API",
        default_version='v1',
        description="""
## TaskFlow REST API

A scalable, JWT-secured task management API with role-based access control.

### Authentication
Use the `/api/v1/auth/login/` endpoint to obtain a JWT token.  
Include it in all protected requests as:  
`Authorization: Bearer <your_token>`

### Roles
- **user** – Can manage their own tasks
- **admin** – Can manage all users and all tasks
        """,
        terms_of_service="https://example.com/terms/",
        contact=openapi.Contact(email="admin@taskflow.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # API v1 routes
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/tasks/', include('apps.tasks.urls')),

    # Swagger / ReDoc docs
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('api/schema.json', schema_view.without_ui(cache_timeout=0), name='schema-json'),
]
