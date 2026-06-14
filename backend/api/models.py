from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    age = models.IntegerField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    is_free_tier = models.BooleanField(default=False)
    is_chw = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.age is not None:
            self.is_free_tier = self.age <= 25
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username


class SymptomSubmission(models.Model):
    RISK_TIER_CHOICES = [
        ("monitor", "Monitor"),
        ("refer", "Refer"),
        ("urgent", "Urgent"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="symptom_submissions"
    )

    age = models.IntegerField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    user_type = models.CharField(max_length=100, blank=True)

    last_period = models.DateField(null=True, blank=True)
    cycle_length = models.CharField(max_length=50, blank=True)
    cycle_regularity = models.CharField(max_length=50, blank=True)

    bleeding_volume = models.CharField(max_length=50, blank=True)
    bleeding_days = models.CharField(max_length=50, blank=True)

    pain_level = models.IntegerField(default=0)

    symptoms = models.JSONField(default=list, blank=True)
    other_symptoms = models.TextField(blank=True)

    ai_result = models.JSONField(default=dict, blank=True)
    risk_tier = models.CharField(
        max_length=10, choices=RISK_TIER_CHOICES, default="monitor"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} — {self.risk_tier} — {self.created_at:%Y-%m-%d}"