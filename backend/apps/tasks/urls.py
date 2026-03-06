from django.urls import path
from . import views

urlpatterns = [
    path('', views.TaskListCreateView.as_view(), name='task-list-create'),
    path('stats/', views.TaskStatsView.as_view(), name='task-stats'),
    path('<int:pk>/', views.TaskDetailView.as_view(), name='task-detail'),
]
