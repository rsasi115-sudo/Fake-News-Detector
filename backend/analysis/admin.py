from django.contrib import admin

from analysis.models import AnalysisRequest, AnalysisResult, SourceCheck


class SourceCheckInline(admin.TabularInline):
    model = SourceCheck
    extra = 0


class AnalysisResultInline(admin.StackedInline):
    model = AnalysisResult
    extra = 0


@admin.register(AnalysisRequest)
class AnalysisRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "input_type", "short_input", "created_at")
    list_filter = ("input_type", "created_at")
    search_fields = ("input_value", "user__mobile")
    inlines = [AnalysisResultInline]

    @admin.display(description="Input (truncated)")
    def short_input(self, obj):
        return obj.input_value[:80]


@admin.register(AnalysisResult)
class AnalysisResultAdmin(admin.ModelAdmin):
    list_display = ("id", "request", "verdict", "credibility_score", "llm_provider", "llm_status", "llm_latency_ms", "created_at")
    list_filter = ("verdict", "llm_provider", "llm_status")
    search_fields = ("request__input_value",)
    readonly_fields = ("explainable_ai", "llm_error")
    inlines = [SourceCheckInline]


@admin.register(SourceCheck)
class SourceCheckAdmin(admin.ModelAdmin):
    list_display = ("id", "source_name", "verification_status", "match_percentage")
    list_filter = ("verification_status",)
    search_fields = ("source_name",)
