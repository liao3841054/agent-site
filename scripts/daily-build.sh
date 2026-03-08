#!/bin/bash
# daily-build.sh - 每日自动构建：提炼摘要 → 生成插画 → 更新 diary.html → git push
# Usage: bash daily-build.sh [YYYY-MM-DD]

set -e

DATE="${1:-$(date +%Y-%m-%d)}"
SITE_DIR="/root/.openclaw/workspace/agent-site"
WORKSPACE="/root/.openclaw/workspace"
SCRIPTS_DIR="$SITE_DIR/scripts"
ILLUS_DIR="$SITE_DIR/illustrations"
IMAGE_GEN_SKILL="/root/.openclaw/workspace/baoyu-skills/skills/baoyu-image-gen"
IMAGE_OUT="$ILLUS_DIR/${DATE}.png"

# 加载环境变量
if [ -f ~/.baoyu-skills/.env ]; then
  set -a
  source ~/.baoyu-skills/.env
  set +a
fi

echo "🚀 [daily-build] Starting build for $DATE"
echo "   SITE_DIR:  $SITE_DIR"
echo "   IMAGE_OUT: $IMAGE_OUT"

# 确保 illustrations 目录存在
mkdir -p "$ILLUS_DIR"

# ── Step 1: 提炼摘要 ──────────────────────────────────────────────────────────
echo ""
echo "📝 Step 1: Summarizing today's work..."

SUMMARY_JSON=$(bun "$SCRIPTS_DIR/summarize.ts" "$DATE")
echo "$SUMMARY_JSON"

SCENE_PROMPT=$(echo "$SUMMARY_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['scene_prompt'])")
DIARY_TITLE=$(echo "$SUMMARY_JSON"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['diary_title'])")
HOOK=$(echo "$SUMMARY_JSON"         | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('hook',''))")
BODY=$(echo "$SUMMARY_JSON"         | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('body',''))")
INSIGHT=$(echo "$SUMMARY_JSON"      | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('insight',''))")
STATS=$(echo "$SUMMARY_JSON"        | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('stats',{})))")
TAGS=$(echo "$SUMMARY_JSON"         | python3 -c "import sys,json; d=json.load(sys.stdin); print(','.join(d['tags']))")

echo "  Title:   $DIARY_TITLE"
echo "  Hook:    $HOOK"
echo "  Insight: $INSIGHT"
echo "  Tags:    $TAGS"

# ── Step 2: 生成插画（baoyu-image-gen, Google Imagen, 16:9）──────────────────
echo ""
echo "🎨 Step 2: Generating illustration..."

FULL_PROMPT="Narrative illustration, single scene, cinematic lighting. ${SCENE_PROMPT}. No text overlay, no speech bubbles, no watermarks. Orange-red accent color (#FF4B2B). Futuristic minimal workspace background."

bun "$IMAGE_GEN_SKILL/scripts/main.ts" \
  --prompt "$FULL_PROMPT" \
  --image "$IMAGE_OUT" \
  --ar 16:9 \
  --provider google

if [ ! -f "$IMAGE_OUT" ]; then
  echo "❌ Image not generated: $IMAGE_OUT"
  exit 1
fi

echo "  ✅ Image saved: $IMAGE_OUT ($(du -sh "$IMAGE_OUT" | cut -f1))"

# ── Step 3: 更新 diary.html ───────────────────────────────────────────────────
echo ""
echo "📄 Step 3: Updating diary.html..."

cd "$SITE_DIR"
python3 "$SCRIPTS_DIR/update-diary.py" \
  --date "$DATE" \
  --title "$DIARY_TITLE" \
  --tags "$TAGS" \
  --image "illustrations/${DATE}.png" \
  --hook "$HOOK" \
  --body "$BODY" \
  --insight "$INSIGHT" \
  --stats "$STATS"

# ── Step 4: Git commit + push ─────────────────────────────────────────────────
echo ""
echo "📦 Step 4: Committing and pushing..."

git -C "$SITE_DIR" add "illustrations/${DATE}.png" diary.html style.css
git -C "$SITE_DIR" commit -m "auto: daily illustration + diary [$DATE]" || echo "  (nothing new to commit)"
git -C "$SITE_DIR" push origin master && echo "  ✅ Pushed to remote" || echo "  ⚠️  Push failed (maybe no remote configured)"

echo ""
echo "✅ [daily-build] Done! https://agent.nanopromptlab.com/diary.html"
