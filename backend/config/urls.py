"""
Root URL configuration for TruthLens backend.
"""

from django.contrib import admin
from django.urls import include, path

from analysis.views import HistoryDetailView, HistoryListView, RerunAnalysisView
from config.views import HealthCheckView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthCheckView.as_view(), name="health-check"),
    path("api/auth/", include("accounts.urls")),
    path("api/analysis/", include("analysis.urls")),
    path("api/history/", HistoryListView.as_view(), name="history-list"),
    path("api/history/<int:pk>/", HistoryDetailView.as_view(), name="history-detail"),
    path("api/history/<int:pk>/rerun/", RerunAnalysisView.as_view(), name="history-rerun"),
]
