from django.db import transaction
from rest_framework import serializers

from .models import SurveyQuestion, PopularityAnswer, GuessSubmission


class SurveyQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyQuestion
        fields = ['id', 'prompt', 'category', 'reward_coins', 'active', 'created_at']


class PopularityAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = PopularityAnswer
        fields = ['id', 'text', 'score']


class SubmitGuessSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    guess_text = serializers.CharField(max_length=200)

    def validate_question_id(self, value):
        if not SurveyQuestion.objects.filter(id=value, active=True).exists():
            raise serializers.ValidationError('Question not found or inactive')
        return value


class RevealQuestionSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()


class GuessResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuessSubmission
        fields = [
            'question',
            'guess_text',
            'revealed',
            'popularity_score',
            'points',
            'created_at',
        ]


class RevealPayloadSerializer(serializers.Serializer):
    question = SurveyQuestionSerializer()
    answers = PopularityAnswerSerializer(many=True)
    submissions = GuessResultSerializer(many=True)

    @staticmethod
    @transaction.atomic
    def compute_points(question: SurveyQuestion, guess_text: str):
        # scoring rule v1: points = popularity score of the matching answer (exact match)
        # If guess doesn't match any known answer, points = 0.
        match = question.popularity_answers.filter(text__iexact=guess_text.strip()).first()
        if not match:
            return 0, 0
        return match.score, match.score

