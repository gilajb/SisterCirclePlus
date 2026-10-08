from django.db import migrations


TIERS = [
    {
        "code": "free",
        "name": "Free",
        "price_min_kes": 0,
        "price_max_kes": 0,
        "price_min_usd": 0,
        "price_max_usd": 0,
        "billing_cycle": "one_time",
        "self_serve": True,
        "features": [
            "One-time symptom intake, AI triage, and doctor referral",
            "Unlimited and ongoing for CHW-code or verified low-income-settlement users",
        ],
        "description": "Open to anyone.",
    },
    {
        "code": "under_18",
        "name": "Under-18 (discounted)",
        "price_min_kes": 50,
        "price_max_kes": 100,
        "price_min_usd": None,
        "price_max_usd": None,
        "billing_cycle": "monthly",
        "self_serve": False,
        "features": [
            "Standard-level access at a discounted, institutionally-gated price",
        ],
        "description": (
            "Institutionally gated only — unlocked via school partnership, CHW youth "
            "program, or NGO youth initiative enrollment code. No individual self-select "
            "signup path."
        ),
    },
    {
        "code": "standard",
        "name": "Standard",
        "price_min_kes": 200,
        "price_max_kes": 350,
        "price_min_usd": None,
        "price_max_usd": None,
        "billing_cycle": "monthly",
        "self_serve": True,
        "features": [
            "Unlimited triage",
            "Symptom history log",
            "Cycle/phase tracking",
            "Direct doctor referral link",
        ],
        "description": "Open self-signup, any age.",
    },
    {
        "code": "premium",
        "name": "Premium",
        "price_min_kes": 500,
        "price_max_kes": 800,
        "price_min_usd": None,
        "price_max_usd": None,
        "billing_cycle": "monthly",
        "self_serve": True,
        "features": [
            "Everything in Standard",
            "Multiple profiles",
            "Richer AI reports",
            "Priority processing",
            "Human doctor callback",
        ],
        "description": "Open self-signup, any age.",
    },
]


def seed_tiers(apps, schema_editor):
    SubscriptionTier = apps.get_model("billing", "SubscriptionTier")
    for tier in TIERS:
        SubscriptionTier.objects.update_or_create(code=tier["code"], defaults=tier)


def unseed_tiers(apps, schema_editor):
    SubscriptionTier = apps.get_model("billing", "SubscriptionTier")
    SubscriptionTier.objects.filter(code__in=[t["code"] for t in TIERS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_tiers, unseed_tiers),
    ]
