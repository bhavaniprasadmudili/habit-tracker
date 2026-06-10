from __future__ import annotations

from django.db import transaction
from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdminRole
from fraud.models import FraudSignal
from guess_answer.models import GuessSubmission, SurveyQuestion
from leaderboard.models import Leaderboard
from notifications.models import Notification
from payouts.models import CoinToCashConversion, WithdrawRequest
from quiz.models import Quiz, QuizAttempt
from spin.models import SaturdaySpinEvent
from tasks.models import DailyTask, DailyTaskCompletion
from users.models import User, UserSession
from wallet.models import Wallet, WalletLedger


DEFAULT_PAGE_SIZE = 20


def _parse_boolean(value, default=True):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _parse_page_size(request):
    try:
        limit = int(request.query_params.get("page_size", DEFAULT_PAGE_SIZE))
    except (TypeError, ValueError):
        limit = DEFAULT_PAGE_SIZE
    return max(1, min(limit, 100))


def _parse_page(request):
    try:
        page = int(request.query_params.get("page", 1))
    except (TypeError, ValueError):
        page = 1
    return max(1, page)


def _quiz_payload(quiz):
    return {
        "id": quiz.id,
        "category": quiz.category,
        "question": quiz.question,
        "option1": quiz.option1,
        "option2": quiz.option2,
        "option3": quiz.option3,
        "option4": quiz.option4,
        "correct_answer": quiz.correct_answer,
        "reward_coins": quiz.reward_coins,
        "start_time": quiz.start_time.isoformat() if quiz.start_time else None,
        "end_time": quiz.end_time.isoformat() if quiz.end_time else None,
        "active": quiz.active,
        "created_at": quiz.created_at.isoformat(),
        "updated_at": quiz.updated_at.isoformat(),
    }


def _task_payload(task):
    return {
        "id": task.id,
        "task_type": task.task_type,
        "title": task.title,
        "description": task.description,
        "coins_reward": task.coins_reward,
        "cash_reward": task.cash_reward,
        "is_active": task.is_active,
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat(),
    }


def _survey_payload(question):
    return {
        "id": question.id,
        "prompt": question.prompt,
        "category": question.category,
        "active": question.active,
        "reward_coins": question.reward_coins,
        "created_at": question.created_at.isoformat(),
    }


def _wallet_payload(user):
    wallet = getattr(user, "wallet", None)
    if wallet is None:
        wallet = Wallet.objects.get_or_create(user=user)[0]
    return {
        "coins": wallet.coins,
        "cashpendingwithdrawn": wallet.cashpendingwithdrawn,
        "withdrawn_amount": wallet.withdrawn_amount,
    }


class AdminOverviewView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        today = timezone.localdate()
        active_sessions = UserSession.objects.filter(is_active=True)
        active_session_count = active_sessions.count()
        recent_active_activity = active_sessions.filter(last_seen_at__gte=timezone.now() - timezone.timedelta(minutes=15)).count()

        summary = {
            "users": {
                "total": User.objects.count(),
                "active": User.objects.filter(is_active=True).count(),
                "admins": User.objects.filter(role="ADMIN").count(),
                "new_today": User.objects.filter(created_at__date=today).count(),
            },
            "wallet": {
                "total_coins": User.objects.aggregate(total=Sum("coins"))["total"] or 0,
                "total_wallet_balance": User.objects.aggregate(total=Sum("wallet_balance"))["total"] or 0,
            },
            "activity": {
                "quizzes": Quiz.objects.count(),
                "active_quizzes": Quiz.objects.filter(active=True).count(),
                "questions": SurveyQuestion.objects.count(),
                "active_tasks": DailyTask.objects.filter(is_active=True).count(),
                "notifications_today": Notification.objects.filter(created_at__date=today).count(),
                "pending_withdrawals": WithdrawRequest.objects.filter(status=WithdrawRequest.STATUS_PENDING).count(),
                "open_fraud_signals": FraudSignal.objects.filter(is_resolved=False).count(),
                "active_sessions": active_session_count,
                "active_sessions_last_15m": recent_active_activity,
            },
            "top_users": [
                {
                    "id": user.id,
                    "phone": user.phone,
                    "name": user.name,
                    "coins": user.coins,
                    "wallet_balance": user.wallet_balance,
                }
                for user in User.objects.order_by("-coins")[:5]
            ],
        }

        recent_users = [
            {
                "id": user.id,
                "phone": user.phone,
                "name": user.name,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat(),
            }
            for user in User.objects.order_by("-created_at")[:5]
        ]
        recent_ledger = [
            {
                "id": ledger.id,
                "user": ledger.user.phone,
                "entry_type": ledger.entry_type,
                "coins_delta": ledger.coins_delta,
                "cash_delta": ledger.cash_delta,
                "reason": ledger.reason,
                "created_at": ledger.created_at.isoformat(),
            }
            for ledger in WalletLedger.objects.select_related("user").order_by("-created_at")[:8]
        ]
        live_sessions = [
            {
                "id": session.id,
                "user": session.user.phone,
                "device_id": session.device_id,
                "ip_address": str(session.ip_address) if session.ip_address else None,
                "user_agent": session.user_agent,
                "login_at": session.login_at.isoformat(),
                "logout_at": session.logout_at.isoformat() if session.logout_at else None,
                "is_active": session.is_active,
                "last_seen_at": session.last_seen_at.isoformat(),
            }
            for session in active_sessions.order_by("-last_seen_at")[:20]
        ]

        return Response(
            {
                "summary": summary,
                "recent_users": recent_users,
                "recent_ledger": recent_ledger,
                "live_sessions": live_sessions,
            }
        )


class AdminSessionsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        queryset = UserSession.objects.select_related("user").order_by("-last_seen_at")
        active_only = request.query_params.get("active_only")
        if active_only in {"1", "true", "yes"}:
            queryset = queryset.filter(is_active=True)
        return Response(
            {
                "items": [
                    {
                        "id": session.id,
                        "user": session.user.phone,
                        "device_id": session.device_id,
                        "ip_address": str(session.ip_address) if session.ip_address else None,
                        "user_agent": session.user_agent,
                        "login_at": session.login_at.isoformat(),
                        "logout_at": session.logout_at.isoformat() if session.logout_at else None,
                        "is_active": session.is_active,
                        "last_seen_at": session.last_seen_at.isoformat(),
                    }
                    for session in queryset[:100]
                ]
            }
        )


class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        page = _parse_page(request)
        page_size = _parse_page_size(request)
        queryset = User.objects.all().order_by("-created_at")

        search = request.query_params.get("search", "").strip()
        role = request.query_params.get("role")
        status = request.query_params.get("status")

        if search:
            queryset = queryset.filter(phone__icontains=search) | queryset.filter(name__icontains=search)
        if role and role != "ALL":
            queryset = queryset.filter(role=role)
        if status == "active":
            queryset = queryset.filter(is_active=True)
        elif status == "inactive":
            queryset = queryset.filter(is_active=False)

        count = queryset.distinct().count()
        offset = (page - 1) * page_size
        users = queryset.distinct()[offset : offset + page_size]
        return Response(
            {
                "items": [
                    {
                        "id": user.id,
                        "phone": user.phone,
                        "name": user.name,
                        "role": user.role,
                        "is_active": user.is_active,
                        "coins": user.coins,
                        "wallet_balance": user.wallet_balance,
                        "upi_id": user.upi_id,
                        "created_at": user.created_at.isoformat(),
                    }
                    for user in users
                ],
                "page": page,
                "page_size": page_size,
                "count": count,
            }
        )


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        quiz_attempts = QuizAttempt.objects.filter(user=user).count()
        correct_quizzes = QuizAttempt.objects.filter(user=user, is_correct=True).count()
        guess_submissions = GuessSubmission.objects.filter(user=user).count()
        task_completions = DailyTaskCompletion.objects.filter(user=user).count()
        pending_withdrawals = WithdrawRequest.objects.filter(user=user, status=WithdrawRequest.STATUS_PENDING).count()
        fraud_signals = FraudSignal.objects.filter(user=user).order_by("-created_at")[:10]
        notifications = Notification.objects.filter(user=user).order_by("-created_at")[:10]
        top_leaderboards = Leaderboard.objects.filter(user=user).order_by("-updated_at")[:5]
        recent_ledger = WalletLedger.objects.filter(user=user).order_by("-created_at")[:10]

        return Response(
            {
                "user": {
                    "id": user.id,
                    "phone": user.phone,
                    "name": user.name,
                    "role": user.role,
                    "is_active": user.is_active,
                    "coins": user.coins,
                    "wallet_balance": user.wallet_balance,
                    "upi_id": user.upi_id,
                    "device_id": user.device_id,
                    "referral_code": user.referral_code,
                    "created_at": user.created_at.isoformat(),
                },
                "wallet": _wallet_payload(user),
                "stats": {
                    "quiz_attempts": quiz_attempts,
                    "correct_quizzes": correct_quizzes,
                    "guess_submissions": guess_submissions,
                    "task_completions": task_completions,
                    "pending_withdrawals": pending_withdrawals,
                },
                "recent_ledger": [
                    {
                        "id": ledger.id,
                        "entry_type": ledger.entry_type,
                        "coins_delta": ledger.coins_delta,
                        "cash_delta": ledger.cash_delta,
                        "reason": ledger.reason,
                        "created_at": ledger.created_at.isoformat(),
                    }
                    for ledger in recent_ledger
                ],
                "fraud_signals": [
                    {
                        "id": signal.id,
                        "signal_type": signal.signal_type,
                        "severity": signal.severity,
                        "description": signal.description,
                        "is_resolved": signal.is_resolved,
                        "resolution_note": signal.resolution_note,
                        "created_at": signal.created_at.isoformat(),
                    }
                    for signal in fraud_signals
                ],
                "notifications": [
                    {
                        "id": notification.id,
                        "title": notification.title,
                        "message": notification.message,
                        "notification_type": notification.notification_type,
                        "is_read": notification.is_read,
                        "created_at": notification.created_at.isoformat(),
                    }
                    for notification in notifications
                ],
                "leaderboards": [
                    {
                        "id": entry.id,
                        "leaderboard_type": entry.leaderboard_type,
                        "category": entry.category,
                        "score": entry.score,
                        "rank": entry.rank,
                        "updated_at": entry.updated_at.isoformat(),
                    }
                    for entry in top_leaderboards
                ],
            }
        )


class AdminUserStatusView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        action = (request.data.get("action") or "").lower()

        if action == "suspend":
            user.is_active = False
        elif action in {"activate", "restore"}:
            user.is_active = True
        elif action == "ban":
            user.is_active = False
        else:
            return Response({"detail": "Unsupported action"}, status=status.HTTP_400_BAD_REQUEST)

        user.save(update_fields=["is_active", "updated_at"])
        return Response({"status": user.is_active, "action": action, "user": {"id": user.id, "phone": user.phone}})


class AdminWalletSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        conversion = CoinToCashConversion.objects.first()
        return Response(
            {
                "conversion": {
                    "coins_per_rupee": conversion.coins_per_rupee if conversion else 100,
                    "min_withdrawal_coins": conversion.min_withdrawal_coins if conversion else 1000,
                    "max_withdrawal_coins": conversion.max_withdrawal_coins if conversion else 100000,
                },
                "total_coins": User.objects.aggregate(total=Sum("coins"))["total"] or 0,
                "total_wallet_balance": User.objects.aggregate(total=Sum("wallet_balance"))["total"] or 0,
                "recent_ledger": [
                    {
                        "id": ledger.id,
                        "user": ledger.user.phone,
                        "entry_type": ledger.entry_type,
                        "coins_delta": ledger.coins_delta,
                        "cash_delta": ledger.cash_delta,
                        "reason": ledger.reason,
                        "created_at": ledger.created_at.isoformat(),
                    }
                    for ledger in WalletLedger.objects.select_related("user").order_by("-created_at")[:15]
                ],
            }
        )


class AdminWalletAdjustView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    @transaction.atomic
    def post(self, request):
        user_id = request.data.get("user_id")
        action = (request.data.get("action") or "").lower()
        amount = request.data.get("amount")
        reason = request.data.get("reason") or "Manual adjustment"
        try:
            amount = int(amount)
        except (TypeError, ValueError):
            return Response({"detail": "amount must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({"detail": "amount must be greater than 0"}, status=status.HTTP_400_BAD_REQUEST)

        user = get_object_or_404(User, pk=user_id)
        wallet = Wallet.objects.get_or_create(user=user)[0]

        previous_coins = wallet.coins
        if action == "add":
            wallet.coins += amount
            user.coins += amount
            entry_type = WalletLedger.TYPE_CREDIT
        elif action == "deduct":
            if user.coins < amount:
                return Response({"detail": "Insufficient coins"}, status=status.HTTP_400_BAD_REQUEST)
            wallet.coins -= amount
            user.coins -= amount
            entry_type = WalletLedger.TYPE_DEBIT
        elif action == "set":
            wallet.coins = amount
            user.coins = amount
            entry_type = WalletLedger.TYPE_CREDIT if amount >= previous_coins else WalletLedger.TYPE_DEBIT
        else:
            return Response({"detail": "Unsupported action"}, status=status.HTTP_400_BAD_REQUEST)

        user.save(update_fields=["coins", "updated_at"])
        wallet.save(update_fields=["coins"])
        WalletLedger.objects.create(
            user=user,
            entry_type=entry_type,
            reason=reason,
            coins_delta=amount if entry_type == WalletLedger.TYPE_CREDIT else -amount,
            cash_delta=0,
            reference_type="ADMIN_ADJUSTMENT",
            reference_id=str(user.id),
        )

        return Response({"user": {"id": user.id, "phone": user.phone, "coins": user.coins}, "wallet": _wallet_payload(user)})


class AdminWithdrawalsListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        status_filter = request.query_params.get("status")
        queryset = WithdrawRequest.objects.select_related("user").order_by("-requested_at")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return Response(
            {
                "items": [
                    {
                        "id": withdraw.id,
                        "user": withdraw.user.phone,
                        "amount_coins": withdraw.amount_coins,
                        "amount_cash": withdraw.amount_cash,
                        "upi_id": withdraw.upi_id,
                        "status": withdraw.status,
                        "requested_at": withdraw.requested_at.isoformat(),
                        "approved_at": withdraw.approved_at.isoformat() if withdraw.approved_at else None,
                        "completed_at": withdraw.completed_at.isoformat() if withdraw.completed_at else None,
                        "rejection_reason": withdraw.rejection_reason,
                    }
                    for withdraw in queryset[:50]
                ]
            }
        )


class AdminWithdrawActionView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, withdraw_id):
        withdraw = get_object_or_404(WithdrawRequest, pk=withdraw_id)
        action = (request.data.get("action") or "").lower()
        if action == "approve":
            withdraw.status = WithdrawRequest.STATUS_APPROVED
            withdraw.approved_at = timezone.now()
        elif action == "reject":
            withdraw.status = WithdrawRequest.STATUS_REJECTED
            withdraw.rejection_reason = request.data.get("reason") or "Rejected by admin"
        else:
            return Response({"detail": "Unsupported action"}, status=status.HTTP_400_BAD_REQUEST)
        withdraw.save(update_fields=["status", "approved_at", "rejection_reason", "updated_at"])
        return Response({"id": withdraw.id, "status": withdraw.status})


class AdminQuizListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        quizzes = Quiz.objects.order_by("-updated_at")
        return Response({"items": [_quiz_payload(quiz) for quiz in quizzes[:50]]})

    def post(self, request):
        required = ["category", "question", "option1", "option2", "option3", "option4", "correct_answer"]
        missing = [field for field in required if not request.data.get(field)]
        if missing:
            return Response({"detail": f"Missing fields: {', '.join(missing)}"}, status=status.HTTP_400_BAD_REQUEST)

        quiz = Quiz.objects.create(
            category=request.data.get("category"),
            question=request.data.get("question"),
            option1=request.data.get("option1"),
            option2=request.data.get("option2"),
            option3=request.data.get("option3"),
            option4=request.data.get("option4"),
            correct_answer=request.data.get("correct_answer"),
            reward_coins=int(request.data.get("reward_coins", 5)),
            start_time=request.data.get("start_time") or None,
            end_time=request.data.get("end_time") or None,
            active=_parse_boolean(request.data.get("active"), True),
        )
        return Response(_quiz_payload(quiz), status=status.HTTP_201_CREATED)


class AdminQuizDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, quiz_id):
        quiz = get_object_or_404(Quiz, pk=quiz_id)
        for field in ["category", "question", "option1", "option2", "option3", "option4", "correct_answer"]:
            if field in request.data:
                setattr(quiz, field, request.data[field])
        if "reward_coins" in request.data:
            quiz.reward_coins = int(request.data.get("reward_coins"))
        if "active" in request.data:
            quiz.active = _parse_boolean(request.data.get("active"), quiz.active)
        if "start_time" in request.data:
            quiz.start_time = request.data.get("start_time") or None
        if "end_time" in request.data:
            quiz.end_time = request.data.get("end_time") or None
        quiz.save()
        return Response(_quiz_payload(quiz))

    def delete(self, request, quiz_id):
        quiz = get_object_or_404(Quiz, pk=quiz_id)
        quiz.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminSpinView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        events = SaturdaySpinEvent.objects.order_by("-event_date")[:20]
        return Response(
            {
                "items": [
                    {
                        "id": event.id,
                        "event_date": event.event_date.isoformat(),
                        "prize_amount": event.prize_amount,
                        "active": event.active,
                        "winner_user": event.winner_user.phone if event.winner_user else None,
                        "winner_selected_at": event.winner_selected_at.isoformat() if event.winner_selected_at else None,
                        "live_users_count_snapshot": event.live_users_count_snapshot,
                    }
                    for event in events
                ]
            }
        )

    def post(self, request):
        event_date = request.data.get("event_date")
        prize_amount = request.data.get("prize_amount", 50)
        if not event_date:
            return Response({"detail": "event_date is required"}, status=status.HTTP_400_BAD_REQUEST)
        event, _ = SaturdaySpinEvent.objects.update_or_create(
            event_date=event_date,
            defaults={
                "prize_amount": int(prize_amount),
                "active": _parse_boolean(request.data.get("active"), True),
            },
        )
        return Response({"id": event.id, "event_date": event.event_date.isoformat(), "prize_amount": event.prize_amount})


class AdminGuessListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        questions = SurveyQuestion.objects.order_by("-created_at")[:50]
        return Response({"items": [_survey_payload(q) for q in questions]})

    def post(self, request):
        prompt = request.data.get("prompt")
        if not prompt:
            return Response({"detail": "prompt is required"}, status=status.HTTP_400_BAD_REQUEST)
        question = SurveyQuestion.objects.create(
            prompt=prompt,
            category=request.data.get("category", "GK"),
            active=_parse_boolean(request.data.get("active"), True),
            reward_coins=int(request.data.get("reward_coins", 5)),
        )
        return Response(_survey_payload(question), status=status.HTTP_201_CREATED)


class AdminGuessDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, question_id):
        question = get_object_or_404(SurveyQuestion, pk=question_id)
        if "prompt" in request.data:
            question.prompt = request.data.get("prompt")
        if "category" in request.data:
            question.category = request.data.get("category")
        if "active" in request.data:
            question.active = _parse_boolean(request.data.get("active"), question.active)
        if "reward_coins" in request.data:
            question.reward_coins = int(request.data.get("reward_coins"))
        question.save()
        return Response(_survey_payload(question))

    def delete(self, request, question_id):
        question = get_object_or_404(SurveyQuestion, pk=question_id)
        question.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminTaskListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        tasks = DailyTask.objects.order_by("-updated_at")[:50]
        return Response({"items": [_task_payload(task) for task in tasks]})

    def post(self, request):
        required = ["task_type", "title", "coins_reward"]
        missing = [field for field in required if not request.data.get(field)]
        if missing:
            return Response({"detail": f"Missing fields: {', '.join(missing)}"}, status=status.HTTP_400_BAD_REQUEST)
        task = DailyTask.objects.create(
            task_type=request.data.get("task_type"),
            title=request.data.get("title"),
            description=request.data.get("description", ""),
            coins_reward=int(request.data.get("coins_reward")),
            cash_reward=int(request.data.get("cash_reward", 0)),
            is_active=_parse_boolean(request.data.get("is_active"), True),
        )
        return Response(_task_payload(task), status=status.HTTP_201_CREATED)


class AdminTaskDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, task_id):
        task = get_object_or_404(DailyTask, pk=task_id)
        if "title" in request.data:
            task.title = request.data.get("title")
        if "description" in request.data:
            task.description = request.data.get("description", "")
        if "coins_reward" in request.data:
            task.coins_reward = int(request.data.get("coins_reward"))
        if "cash_reward" in request.data:
            task.cash_reward = int(request.data.get("cash_reward"))
        if "is_active" in request.data:
            task.is_active = _parse_boolean(request.data.get("is_active"), task.is_active)
        task.save()
        return Response(_task_payload(task))


class AdminFraudListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        signals = FraudSignal.objects.select_related("user").order_by("-created_at")[:50]
        return Response(
            {
                "items": [
                    {
                        "id": signal.id,
                        "user": signal.user.phone,
                        "signal_type": signal.signal_type,
                        "severity": signal.severity,
                        "description": signal.description,
                        "is_resolved": signal.is_resolved,
                        "resolution_note": signal.resolution_note,
                        "created_at": signal.created_at.isoformat(),
                    }
                    for signal in signals
                ]
            }
        )


class AdminFraudResolveView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, signal_id):
        signal = get_object_or_404(FraudSignal, pk=signal_id)
        signal.is_resolved = True
        signal.resolution_note = request.data.get("resolution_note") or "Resolved by admin"
        signal.save(update_fields=["is_resolved", "resolution_note"])
        return Response({"id": signal.id, "is_resolved": signal.is_resolved})


class AdminNotificationCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        user_id = request.data.get("user_id")
        title = request.data.get("title")
        message = request.data.get("message")
        notification_type = request.data.get("notification_type", "GENERAL")
        if not title or not message:
            return Response({"detail": "title and message are required"}, status=status.HTTP_400_BAD_REQUEST)

        if user_id:
            user = get_object_or_404(User, pk=user_id)
            Notification.objects.create(user=user, notification_type=notification_type, title=title, message=message)
            return Response({"created": 1, "user_id": user.id})

        recipients = User.objects.filter(is_active=True)
        created = Notification.objects.bulk_create(
            [
                Notification(
                    user=user,
                    notification_type=notification_type,
                    title=title,
                    message=message,
                )
                for user in recipients
            ]
        )
        return Response({"created": len(created)})


class AdminAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        return Response(
            {
                "summary": {
                    "users": User.objects.count(),
                    "active_users": User.objects.filter(is_active=True).count(),
                    "quiz_attempts": QuizAttempt.objects.count(),
                    "guess_submissions": GuessSubmission.objects.count(),
                    "tasks_completed": DailyTaskCompletion.objects.count(),
                    "pending_withdrawals": WithdrawRequest.objects.filter(status=WithdrawRequest.STATUS_PENDING).count(),
                    "open_fraud_signals": FraudSignal.objects.filter(is_resolved=False).count(),
                },
                "leaderboards": [
                    {
                        "id": entry.id,
                        "user": entry.user.phone,
                        "category": entry.category,
                        "leaderboard_type": entry.leaderboard_type,
                        "score": entry.score,
                        "rank": entry.rank,
                    }
                    for entry in Leaderboard.objects.order_by("-score")[:10]
                ],
            }
        )
