from django.db import migrations


NEW_USD_PRICES = {
    "under_18": 0.99,
    "standard": 2.99,
    "premium": 7.99,
}

ORIGINAL_KES_PRICES = {
    "under_18": {"price_min_kes": 50, "price_max_kes": 100},
    "standard": {"price_min_kes": 200, "price_max_kes": 350},
    "premium": {"price_min_kes": 500, "price_max_kes": 800},
}


def update_prices_to_usd(apps, schema_editor):
    SubscriptionTier = apps.get_model("billing", "SubscriptionTier")
    for code, price in NEW_USD_PRICES.items():
        SubscriptionTier.objects.filter(code=code).update(
            price_min_usd=price,
            price_max_usd=price,
            price_min_kes=None,
            price_max_kes=None,
        )


def revert_prices_to_kes(apps, schema_editor):
    SubscriptionTier = apps.get_model("billing", "SubscriptionTier")
    for code, kes in ORIGINAL_KES_PRICES.items():
        SubscriptionTier.objects.filter(code=code).update(
            price_min_usd=None,
            price_max_usd=None,
            **kes,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0002_seed_subscription_tiers"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="subscriptiontier",
            options={"ordering": ["price_min_usd"]},
        ),
        migrations.RenameField(
            model_name="paymenttransaction",
            old_name="amount_kes",
            new_name="amount_usd",
        ),
        migrations.RenameField(
            model_name="doctorsubscription",
            old_name="price_kes",
            new_name="price_usd",
        ),
        migrations.RunPython(update_prices_to_usd, revert_prices_to_kes),
    ]
