from django.test import TestCase
from rest_framework.test import APIClient
class ApiSmoke(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        User.objects.create_user('t', password='pw'); self.c = APIClient()
        self.tok = self.c.post('/api/auth/login/', {'username': 't', 'password': 'pw'}, format='json').json()['token']; self.c.credentials(HTTP_AUTHORIZATION='Bearer ' + self.tok)
    def test_requires_auth(self): self.assertEqual(APIClient().get('/api/networks/').status_code, 401)
    def test_bad_login(self): self.assertEqual(APIClient().post('/api/auth/login/', {'username': 't', 'password': 'x'}, format='json').status_code, 401)
    def test_read_endpoints(self):
        for u in ["/api/dashboard/summary/", "/api/transactions/", "/api/accounts/", "/api/networks/", "/api/alerts/", "/api/graph/", "/api/system/", "/api/search/?q=ACC"]:
            self.assertEqual(self.c.get(u).status_code, 200, u)
    def test_case_flow(self):
        nid = self.c.get("/api/networks/").json()[0]["id"]
        r = self.c.post("/api/cases/", {"network_id": nid}, format="json"); self.assertEqual(r.status_code, 201); cid = r.json()["case_id"]
        self.assertEqual(self.c.post("/api/cases/", {"network_id": nid}, format="json").status_code, 409)
        tx = self.c.get(f"/api/networks/{nid}/").json()["events"][0]["tx_id"]
        self.assertEqual(self.c.post(f"/api/cases/{cid}/evidence/", {"tx_id": tx, "comment": "x"}, format="json").status_code, 201)
        self.assertEqual(self.c.get(f"/api/networks/{nid}/report/?token={self.tok}").status_code, 200)
