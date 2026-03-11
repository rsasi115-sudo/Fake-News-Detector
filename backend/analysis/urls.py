"""
Analysis URL configuration.
"""

from django.urls import path

from analysis.views import SubmitAnalysisView

app_name = "analysis"

urlpatterns = [
    path("submit/", SubmitAnalysisView.as_view(), name="submit"),
]
