"""Task CRUD views with role-based filtering."""
from rest_framework import generics, filters, status, permissions
from rest_framework.views import APIView
from django.db.models import Q
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Task
from .serializers import TaskSerializer, TaskCreateSerializer
from apps.authentication.permissions import IsOwnerOrAdmin, IsAdmin
from taskflow.responses import success_response, error_response


class TaskListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/tasks/        — List tasks (own tasks for users; all for admins)
    POST /api/v1/tasks/        — Create a new task
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'tags']
    ordering_fields = ['created_at', 'due_date', 'priority', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        qs = Task.objects.all() if user.is_admin else Task.objects.filter(user=user)

        # Query-param filters
        status_filter = self.request.query_params.get('status')
        priority_filter = self.request.query_params.get('priority')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if priority_filter:
            qs = qs.filter(priority=priority_filter)
        return qs

    def get_serializer_class(self):
        return TaskCreateSerializer if self.request.method == 'POST' else TaskSerializer

    @swagger_auto_schema(
        operation_summary="List tasks",
        manual_parameters=[
            openapi.Parameter('status', openapi.IN_QUERY, type=openapi.TYPE_STRING,
                              enum=['todo', 'in_progress', 'done']),
            openapi.Parameter('priority', openapi.IN_QUERY, type=openapi.TYPE_STRING,
                              enum=['low', 'medium', 'high']),
            openapi.Parameter('search', openapi.IN_QUERY, type=openapi.TYPE_STRING),
        ]
    )
    def get(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return success_response(data=serializer.data)

    @swagger_auto_schema(
        operation_summary="Create a new task",
        request_body=TaskCreateSerializer,
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return error_response(serializer.errors)
        task = serializer.save()
        return success_response(
            data=TaskSerializer(task).data,
            message="Task created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/tasks/<id>/  — Get a task
    PATCH  /api/v1/tasks/<id>/  — Update a task (owner or admin)
    DELETE /api/v1/tasks/<id>/  — Delete a task (owner or admin)
    """
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        return Task.objects.all() if user.is_admin else Task.objects.filter(user=user)

    @swagger_auto_schema(operation_summary="Get task by ID")
    def get(self, request, *args, **kwargs):
        task = self.get_object()
        return success_response(data=self.get_serializer(task).data)

    @swagger_auto_schema(operation_summary="Update a task (partial)")
    def patch(self, request, *args, **kwargs):
        task = self.get_object()
        serializer = self.get_serializer(task, data=request.data, partial=True)
        if not serializer.is_valid():
            return error_response(serializer.errors)
        serializer.save()
        return success_response(data=serializer.data, message="Task updated.")

    @swagger_auto_schema(operation_summary="Delete a task")
    def delete(self, request, *args, **kwargs):
        task = self.get_object()
        task.delete()
        return success_response(message="Task deleted.", status_code=status.HTTP_204_NO_CONTENT)

    # Disable full PUT
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']


class TaskStatsView(APIView):
    """GET /api/v1/tasks/stats/ — Task statistics for the current user (or all, if admin)."""
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(operation_summary="Get task statistics")
    def get(self, request):
        user = request.user
        qs = Task.objects.all() if user.is_admin else Task.objects.filter(user=user)
        stats = {
            'total': qs.count(),
            'todo': qs.filter(status='todo').count(),
            'in_progress': qs.filter(status='in_progress').count(),
            'done': qs.filter(status='done').count(),
            'high_priority': qs.filter(priority='high').count(),
        }
        return success_response(data=stats)
