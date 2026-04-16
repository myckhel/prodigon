#!/usr/bin/env bash
# =============================================================================
# Health check for all services
# Usage: bash scripts/check_health.sh
# =============================================================================

echo "Checking service health..."
echo ""

check_service() {
    local name=$1
    local url=$2
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    if [ "$response" = "200" ]; then
        echo "  ✓ $name ($url) — healthy"
    else
        echo "  ✗ $name ($url) — unreachable (HTTP $response)"
    fi
}

check_service "API Gateway"    "http://localhost:8000/health"
check_service "Model Service"  "http://localhost:8001/health"
check_service "Worker Service" "http://localhost:8002/health"

echo ""
