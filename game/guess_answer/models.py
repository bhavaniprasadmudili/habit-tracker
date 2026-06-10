from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL


class SurveyQuestion(models.Model):
    CATEGORY_CHOICES = [
        ('GK', 'GK'),
        ('TECH', 'TECH'),
        ('MOVIES', 'Movies'),
        ('SPORTS', 'Sports'),
        ('ENGLISH', 'English'),
        ('IAS', 'IAS'),
        ('GATE', 'GATE'),
        ('PROGRAMMING', 'Programming'),
    ]

    prompt = models.CharField(max_length=500)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='GK')
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # reward for participating
    reward_coins = models.PositiveIntegerField(default=5)

    class Meta:
        indexes = [
            models.Index(fields=['active']),
        ]

    def __str__(self):
        return self.prompt


class PopularityAnswer(models.Model):
    question = models.ForeignKey(SurveyQuestion, on_delete=models.CASCADE, related_name='popularity_answers')
    text = models.CharField(max_length=200)
    # store popularity score (e.g., relative % or rank weight)
    score = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('question', 'text')

    def __str__(self):
        return f"{self.question_id}: {self.text} ({self.score})"


class GuessSubmission(models.Model):
    question = models.ForeignKey(SurveyQuestion, on_delete=models.CASCADE, related_name='submissions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='guess_submissions')
    guess_text = models.CharField(max_length=200)

    # computed after reveal/submit
    popularity_score = models.PositiveIntegerField(default=0)
    points = models.PositiveIntegerField(default=0)

    revealed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'question']),
        ]
        unique_together = ('question', 'user')

    def __str__(self):
        return f"{self.user_id} -> {self.question_id}" 

