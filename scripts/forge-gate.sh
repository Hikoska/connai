#!/bin/bash
# forge-gate.sh — Pre-commit quality gate for Forge relay commits
# Run: bash scripts/forge-gate.sh <file_or_dir>
# Returns: 0 = pass, 1 = fail (with reason)

TARGET="${1:-.}"
ERRORS=0

echo "🔍 Forge Gate running on: $TARGET"

# Rule 1: No pages/ directory files (except empty)
if find "$TARGET" -path "*/pages/*.tsx" -o -path "*/pages/*.ts" 2>/dev/null | grep -v "node_modules" | grep -q .; then
  echo "❌ FAIL: Pages Router file detected. Use src/app/ instead."
  find "$TARGET" -path "*/pages/*.tsx" -o -path "*/pages/*.ts" | grep -v "node_modules"
  ERRORS=$((ERRORS + 1))
fi

# Rule 2: No @nuxtjs imports
if grep -r "@nuxtjs/" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | grep -q .; then
  echo "❌ FAIL: @nuxtjs/* import found. This is Next.js, not Nuxt."
  grep -r "@nuxtjs/" "$TARGET" --include="*.ts" --include="*.tsx" | grep -v "node_modules"
  ERRORS=$((ERRORS + 1))
fi

# Rule 3: No react-router-dom
if grep -r "react-router-dom" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | grep -q .; then
  echo "❌ FAIL: react-router-dom found. Use next/navigation."
  ERRORS=$((ERRORS + 1))
fi

# Rule 4: No next/router (should be next/navigation)
if grep -r "from 'next/router'" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | grep -q .; then
  echo "❌ FAIL: next/router import found. Replace with next/navigation."
  grep -r "from 'next/router'" "$TARGET" --include="*.ts" --include="*.tsx" | grep -v "node_modules"
  ERRORS=$((ERRORS + 1))
fi

# Rule 5: No bad Supabase import paths
if grep -r "from '../../supabase'\|from '../supabase'\|from 'supabase'" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | grep -q .; then
  echo "❌ FAIL: Wrong Supabase import. Use: import { createClient } from '@/lib/supabase/client'"
  ERRORS=$((ERRORS + 1))
fi

# Rule 6: Hook components missing 'use client'
for f in $(find "$TARGET" -name "*.tsx" | grep -v "node_modules"); do
  if grep -q "useState\|useEffect\|useChat\|useRouter\|usePathname\|useRef\|useCallback" "$f"; then
    if ! grep -q "'use client'" "$f" && ! grep -q '"use client"' "$f"; then
      echo "❌ FAIL: $f uses hooks but is missing 'use client' directive"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

# Summary
if [ $ERRORS -eq 0 ]; then
  echo "✅ GATE PASSED — safe to commit"
  exit 0
else
  echo "❌ GATE FAILED — $ERRORS issue(s) found. Fix before committing."
  exit 1
fi
