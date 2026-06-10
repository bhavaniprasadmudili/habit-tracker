from django.urls import path

from .views import GuessQuestionListView, SubmitGuessView, RevealQuestionView

urlpatterns = [
    path('questions/', GuessQuestionListView.as_view(), name='guess-questions'),
    path('submit/', SubmitGuessView.as_view(), name='guess-submit'),
    path('reveal/', RevealQuestionView.as_view(), name='guess-reveal'),
]

