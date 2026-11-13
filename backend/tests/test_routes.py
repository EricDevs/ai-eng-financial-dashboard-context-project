from datetime import date

from fastapi.testclient import TestClient

from app import routes
from app.main import app
from app.routes import FinancialMovement, filter_movements_by_date, generate_mock_movements


client = TestClient(app)


def test_generate_mock_movements_returns_full_year_sorted_data():
    movements = generate_mock_movements(seed=42)

    assert len(movements) == 360
    assert movements == sorted(movements, key=lambda item: item.create_date)


def test_filter_movements_by_date_includes_range_edges():
    movements = generate_mock_movements(seed=42)
    target_date = movements[0].create_date

    filtered = filter_movements_by_date(movements, target_date, target_date)

    assert filtered
    assert all(movement.create_date == target_date for movement in filtered)


def test_health_endpoint_returns_ok():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_metrics_endpoint_respects_date_filters():
    base_response = client.get("/api/metrics")
    assert base_response.status_code == 200
    first_date = base_response.json()[0]["create_date"]

    response = client.get(
        "/api/metrics",
        params={"start_date": first_date, "end_date": first_date},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert all(item["create_date"] == first_date for item in payload)


def test_b2b_endpoint_only_returns_b2b_records():
    response = client.get("/api/metrics/b2b")

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert all(item["business_type"] == "B2B" for item in payload)
    assert payload == sorted(payload, key=lambda item: item["create_date"])


def test_b2c_endpoint_only_returns_b2c_records():
    response = client.get("/api/metrics/b2c")

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert all(item["business_type"] == "B2C" for item in payload)
    assert payload == sorted(payload, key=lambda item: item["create_date"])


def test_metrics_endpoint_filters_by_category():
    response = client.get("/api/metrics", params={"category": "sales"})

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert all(item["category"] == "sales" for item in payload)


def test_metrics_endpoint_filters_by_operation_type():
    response = client.get("/api/metrics", params={"operation_type": "income"})

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert all(item["operation_type"] == "income" for item in payload)


def test_b2b_endpoint_combines_new_filters():
    response = client.get(
        "/api/metrics/b2b",
        params={"operation_type": "outcome", "category": "suppliers"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert all(item["business_type"] == "B2B" for item in payload)
    assert all(item["operation_type"] == "outcome" for item in payload)
    assert all(item["category"] == "suppliers" for item in payload)


def test_metrics_facets_returns_filter_options_and_date_range():
    response = client.get("/api/metrics/facets")

    assert response.status_code == 200
    payload = response.json()
    assert sorted(payload["operation_types"]) == ["income", "outcome"]
    assert payload["business_types"] == ["B2B", "B2C"]
    assert payload["categories"] == [
        "administrative",
        "operational",
        "others",
        "sales",
        "suppliers",
    ]
    assert payload["min_date"] <= payload["max_date"]


def test_metrics_summary_by_month_returns_balances(monkeypatch):
    controlled_movements = [
        FinancialMovement(
            create_date=date(2024, 1, 5),
            amount=200.0,
            operation_type="income",
            category="sales",
            business_type="B2B",
        ),
        FinancialMovement(
            create_date=date(2024, 1, 20),
            amount=50.0,
            operation_type="outcome",
            category="suppliers",
            business_type="B2B",
        ),
        FinancialMovement(
            create_date=date(2024, 2, 10),
            amount=100.0,
            operation_type="income",
            category="sales",
            business_type="B2C",
        ),
        FinancialMovement(
            create_date=date(2024, 2, 15),
            amount=40.0,
            operation_type="outcome",
            category="operational",
            business_type="B2C",
        ),
        FinancialMovement(
            create_date=date(2024, 2, 20),
            amount=25.0,
            operation_type="income",
            category="others",
            business_type="B2B",
        ),
    ]
    monkeypatch.setattr(
        routes, "generate_mock_movements", lambda seed=None: controlled_movements
    )

    response = client.get("/api/metrics/summary", params={"group_by": "month"})

    assert response.status_code == 200
    payload = response.json()

    # Expected values computed independently from controlled_movements, not by
    # calling any backend helper:
    # 2024-01 -> income = 200.0 (movement 1 only)
    #            outcome = 50.0 (movement 2 only)
    #            net = 200.0 - 50.0 = 150.0
    # 2024-02 -> income = 100.0 + 25.0 = 125.0 (movements 3 and 5)
    #            outcome = 40.0 (movement 4 only)
    #            net = 125.0 - 40.0 = 85.0
    expected_by_period = {
        "2024-01": {"income": 200.0, "outcome": 50.0, "net": 150.0},
        "2024-02": {"income": 125.0, "outcome": 40.0, "net": 85.0},
    }

    periods = [item["period"] for item in payload]
    assert periods == ["2024-01", "2024-02"]

    for item in payload:
        expected = expected_by_period[item["period"]]
        assert item["income"] == expected["income"]
        assert item["outcome"] == expected["outcome"]
        assert item["net"] == expected["net"]


def test_metrics_summary_by_week_honors_business_type_filter():
    response = client.get(
        "/api/metrics/summary",
        params={"group_by": "week", "business_type": "B2C"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload


def test_top_categories_returns_limited_sorted_categories():
    response = client.get(
        "/api/metrics/categories/top",
        params={"operation_type": "outcome", "limit": 3},
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 3
    assert payload[0]["total_amount"] >= payload[1]["total_amount"]
    assert all(item["operation_type"] == "outcome" for item in payload)


def test_metrics_comparison_returns_delta_fields():
    response = client.get(
        "/api/metrics/comparison",
        params={"start_date": "2025-03-01", "end_date": "2025-03-31"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {
        "current_period",
        "previous_period",
        "delta_abs",
        "delta_pct",
    }


def test_metrics_alerts_returns_anomaly_candidates():
    response = client.get(
        "/api/metrics/alerts",
        params={"threshold": 0.2, "group_by": "month"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    if payload:
        first = payload[0]
        assert set(first.keys()) == {
            "period",
            "outcome_total",
            "baseline_average",
            "increase_ratio",
        }
