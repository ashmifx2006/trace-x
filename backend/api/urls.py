from django.urls import path
from . import views as v
urlpatterns = [
    path("dashboard/summary/", v.summary), path("transactions/", v.transactions), path("transactions/<str:tid>/", v.transaction),
    path("accounts/", v.accounts), path("accounts/<str:aid>/", v.account), path("networks/", v.networks),
    path("networks/<str:nid>/", v.network), path("networks/<str:nid>/report/", v.report), path("alerts/", v.alerts),
    path("cases/", v.cases), path("cases/<str:cid>/", v.case_detail), path("cases/<str:cid>/notes/", v.add_note),
    path("auth/login/", v.login), path("graph/", v.graph), path("cases/<str:cid>/evidence/", v.add_evidence), path("upload/", v.upload), path("search/", v.search), path("system/", v.system),
]
