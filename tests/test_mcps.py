HEADERS = {"X-API-Key": "test-key"}


def test_list_mcps(test_client):
    response = test_client.get("/api/v1/mcps", headers=HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "test-mcp"
    assert data[0]["status"] == "reachable"


def test_list_tools(test_client):
    response = test_client.get("/api/v1/mcps/test-mcp/tools", headers=HEADERS)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_list_resources(test_client):
    response = test_client.get("/api/v1/mcps/test-mcp/resources", headers=HEADERS)
    assert response.status_code == 200


def test_list_prompts(test_client):
    response = test_client.get("/api/v1/mcps/test-mcp/prompts", headers=HEADERS)
    assert response.status_code == 200


def test_server_not_found(test_client):
    response = test_client.get("/api/v1/mcps/nonexistent/tools", headers=HEADERS)
    assert response.status_code == 404
