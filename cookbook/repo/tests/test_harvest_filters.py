from harvest.filters import HarvestFilter


def test_filter_accepts_midwest_pdf_record():
    record = {
        "title": "St. Paul Parish Cookbook",
        "description": "Collection of recipes from Ramsey County, Minnesota church",
        "metadata": {
            "files": [
                {"name": "cookbook.pdf", "format": "Text PDF"}
            ]
        }
    }
    filt = HarvestFilter(min_score=3)
    result = filt.accepts(record)
    assert result.score >= filt.min_score
    assert result.details["has_digital_assets"]
    assert "ramsey county" in result.details["matched_locations"]["counties"]


def test_filter_rejects_corporate_dietpamphlet():
    record = {
        "title": "Corporate Diet Secrets",
        "description": "Weight loss tips from a corporate wellness program",
        "metadata": {}
    }
    filt = HarvestFilter(min_score=3)
    result = filt.accepts(record)
    assert result.score < filt.min_score
    assert "contains_excluded_terms" in result.details["reasons"]
