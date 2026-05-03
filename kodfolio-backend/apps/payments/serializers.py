from decimal import Decimal

from rest_framework import serializers

from .models import Payment, Transaction


class TransactionSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True, default=None)

    class Meta:
        model = Transaction
        fields = (
            "id",
            "type",
            "amount",
            "user_email",
            "description",
            "stripe_transfer_id",
            "created_at",
        )
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    task_id = serializers.UUIDField(source="task.id", read_only=True)
    task_title = serializers.CharField(source="task.title", read_only=True)
    transactions = TransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id",
            "task_id",
            "task_title",
            "amount",
            "platform_fee",
            "mentor_fee",
            "student_payout",
            "status",
            "is_mock",
            "held_at",
            "released_at",
            "refunded_at",
            "created_at",
            "transactions",
        )
        read_only_fields = fields


class SplitsRequestSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0.01")
    )
    has_reviews = serializers.BooleanField(default=True)
