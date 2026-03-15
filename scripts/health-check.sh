#!/usr/bin/env bash
set -euo pipefail

ENDPOINT=${1:-http://localhost:8080}
PASS=0; FAIL=0

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

check() {
  local name=$1; local cmd=$2
  if eval "$cmd" &>/dev/null; then
    echo -e "${GREEN}[PASS]${NC} $name"; ((PASS++))
  else
    echo -e "${RED}[FAIL]${NC} $name"; ((FAIL++))
  fi
}

echo "NEXUS v4 Health Check — $ENDPOINT"
echo "========================================"

check "API liveness"   "curl -sf ${ENDPOINT}/health/live"
check "API readiness"  "curl -sf ${ENDPOINT}/health/ready"
check "Switcher"       "curl -sf ${ENDPOINT}/api/v1/switcher/health"
check "NMOS registry"  "curl -sf ${ENDPOINT}/api/v1/nmos/health"
check "Multiviewer"    "curl -sf ${ENDPOINT}/api/v1/multiviewer/layout"
check "Storage API"    "curl -sf ${ENDPOINT}/api/v1/recorder/storage"

# PTP check
PTP=$(curl -sf "${ENDPOINT}/api/v1/ptp/status" 2>/dev/null || echo '{}')
OFFSET=$(echo "$PTP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(abs(d.get('offset',999)))" 2>/dev/null || echo 999)
if   [ "$OFFSET" -lt 50  ]; then echo -e "${GREEN}[PASS]${NC} PTP offset (${OFFSET}ns)"; ((PASS++))
elif [ "$OFFSET" -lt 100 ]; then echo -e "${YELLOW}[WARN]${NC} PTP offset elevated (${OFFSET}ns)"; ((PASS++))
else                              echo -e "${RED}[FAIL]${NC} PTP offset critical (${OFFSET}ns)"; ((FAIL++))
fi

echo "========================================"
echo -e "Passed: ${GREEN}${PASS}${NC}  Failed: ${RED}${FAIL}${NC}"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
