from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core import signing
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

def make_token(username): return signing.dumps({"u": username})
def user_from_token(t):
    try: name = signing.loads(t, max_age=86400)["u"]
    except signing.BadSignature: return None
    return User.objects.filter(username=name).first()

class TokenAuth(BaseAuthentication):
    """Bearer token (or ?token= for PDF downloads). Tokens are signed and expire after 24h."""
    def authenticate(self, request):
        h = request.headers.get("Authorization", ""); t = h[7:] if h.startswith("Bearer ") else request.GET.get("token")
        if not t: return None
        u = user_from_token(t)
        if not u: raise AuthenticationFailed("Invalid or expired token")
        return (u, None)
    def authenticate_header(self, request): return "Bearer"
