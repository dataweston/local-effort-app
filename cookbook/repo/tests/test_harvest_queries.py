from harvest.ia_search import build_query as build_ia_query
from harvest.dpla_search import build_query_plan
from harvest.terms import load_terms


def test_ia_query_uses_external_terms():
    query = build_ia_query()
    terms = load_terms()
    assert '"ladies aid"' in query
    assert 'Hennepin County' in query
    for deny in terms["deny"]["keywords"]:
        assert deny.lower() in query.lower()
        assert "AND NOT" in query


def test_dpla_plan_includes_negative_and_spatial():
    plan = build_query_plan()
    query = plan["query"]
    assert "-diet" in query
    spatial_terms = plan["spatial_terms"]
    assert any("County" in term for term in spatial_terms)
    subject_filter = plan["subject_filter"]
    assert subject_filter is None or "ladies aid" in subject_filter
