def test_missing_api_key(test_client):
    response = test_client.get("/api/v1/mcps")
    assert response.status_code == 401


def test_invalid_api_key(test_client):
    response = test_client.get("/api/v1/mcps", headers={"X-API-Key": "wrong-key"})
    assert response.status_code == 403


def test_valid_api_key(test_client):
    response = test_client.get("/api/v1/mcps", headers={"X-API-Key": "test-key"})
    assert response.status_code == 200
