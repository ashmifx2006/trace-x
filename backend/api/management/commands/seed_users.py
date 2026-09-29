from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
class Command(BaseCommand):
    help = "Create demo analyst accounts (demo passwords, change for any real use)"
    def handle(self, *a, **k):
        for name, pw in (("analyst", "trace-x-demo"), ("admin", "trace-x-admin")):
            u, new = User.objects.get_or_create(username=name)
            if new: u.set_password(pw); u.is_staff = name == "admin"; u.save()
        self.stdout.write("Users: analyst / trace-x-demo, admin / trace-x-admin")
