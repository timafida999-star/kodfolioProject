from django.contrib import admin

from .models import Payment, Transaction


class TransactionInline(admin.TabularInline):
    model = Transaction
    extra = 0
    readonly_fields = ("type", "amount", "user", "description", "stripe_transfer_id", "created_at")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "task",
        "amount",
        "status",
        "platform_fee",
        "mentor_fee",
        "student_payout",
        "is_mock",
        "created_at",
    )
    list_filter = ("status", "is_mock")
    search_fields = ("task__title", "stripe_intent_id")
    readonly_fields = (
        "stripe_intent_id",
        "held_at",
        "released_at",
        "refunded_at",
        "created_at",
        "updated_at",
    )
    raw_id_fields = ("task",)
    inlines = [TransactionInline]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("type", "amount", "user", "payment", "created_at")
    list_filter = ("type",)
    search_fields = ("description", "user__email", "stripe_transfer_id")
    raw_id_fields = ("payment", "user")
    readonly_fields = ("created_at",)
