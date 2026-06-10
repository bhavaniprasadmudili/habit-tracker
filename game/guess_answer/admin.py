from django.contrib import admin

from .models import SurveyQuestion, PopularityAnswer, GuessSubmission


@admin.register(SurveyQuestion)
class SurveyQuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'prompt', 'category', 'active', 'reward_coins', 'created_at')
    list_filter = ('category', 'active')
    search_fields = ('prompt',)


@admin.register(PopularityAnswer)
class PopularityAnswerAdmin(admin.ModelAdmin):
    list_display = ('id', 'question', 'text', 'score')
    search_fields = ('text',)


@admin.register(GuessSubmission)
class GuessSubmissionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'question',
        'user',
        'guess_text',
        'popularity_score',
        'points',
        'revealed',
        'created_at',
    )
    list_filter = ('revealed',)
    search_fields = ('guess_text',)

