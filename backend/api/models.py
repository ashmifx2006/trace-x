from django.db import models
class Case(models.Model):
    case_id = models.CharField(max_length=20, unique=True)
    network_id = models.CharField(max_length=20)
    title = models.CharField(max_length=200)
    priority = models.CharField(max_length=10, default="HIGH")
    status = models.CharField(max_length=20, default="New")
    analyst = models.CharField(max_length=80, default="Analyst")
    risk = models.IntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
class Note(models.Model):
    case = models.ForeignKey(Case, related_name="notes", on_delete=models.CASCADE)
    text = models.TextField()
    created = models.DateTimeField(auto_now_add=True)
class Evidence(models.Model):
    case = models.ForeignKey(Case, related_name="evidence", on_delete=models.CASCADE)
    tx_id = models.CharField(max_length=30)
    comment = models.TextField(blank=True)
    created = models.DateTimeField(auto_now_add=True)
