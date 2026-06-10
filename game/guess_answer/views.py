from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SurveyQuestion, GuessSubmission
from .serializers import (
    SurveyQuestionSerializer,
    SubmitGuessSerializer,
    GuessResultSerializer,
    PopularityAnswerSerializer,
)


class GuessQuestionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = SurveyQuestion.objects.filter(active=True).order_by('-created_at')[:50]
        return Response(SurveyQuestionSerializer(qs, many=True).data)


class SubmitGuessView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        s = SubmitGuessSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        question = SurveyQuestion.objects.select_for_update().get(id=s.validated_data['question_id'], active=True)
        guess_text = s.validated_data['guess_text'].strip()

        # enforce 1 guess per question per user
        submission, created = GuessSubmission.objects.select_for_update().get_or_create(
            user=request.user,
            question=question,
            defaults={'guess_text': guess_text},
        )

        if not created:
            # already submitted: don't change guess in v1
            return Response({'detail': 'Already submitted for this question'}, status=status.HTTP_200_OK)

        # v1: points computed later on reveal; set popularity_score=0 until reveal
        return Response({'detail': 'Guess submitted'}, status=status.HTTP_201_CREATED)


class RevealQuestionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        question_id = request.data.get('question_id')
        if not question_id:
            return Response({'detail': 'question_id required'}, status=status.HTTP_400_BAD_REQUEST)

        question = SurveyQuestion.objects.select_for_update().filter(id=question_id, active=True).first()
        if not question:
            return Response({'detail': 'Question not found'}, status=status.HTTP_404_NOT_FOUND)

        answers = list(question.popularity_answers.all().order_by('-score'))

        # compute points for all submissions (v1: exact text match)
        submissions = GuessSubmission.objects.select_for_update().filter(question=question, revealed=False)

        updated = []
        for sub in submissions:
            match = next((a for a in answers if a.text.lower() == sub.guess_text.strip().lower()), None)
            pop_score = match.score if match else 0
            points = pop_score
            sub.popularity_score = pop_score
            sub.points = points
            sub.revealed = True
            sub.save(update_fields=['popularity_score', 'points', 'revealed'])
            updated.append(sub)

        return Response(
            {
                'question': SurveyQuestionSerializer(question).data,
                'answers': PopularityAnswerSerializer(answers, many=True).data,
                'submissions': GuessResultSerializer(updated, many=True).data,
            },
            status=status.HTTP_200_OK,
        )

