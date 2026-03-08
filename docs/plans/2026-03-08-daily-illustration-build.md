# Daily Illustration Build System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 每天定时自动提炼当日 LarryBot 工作内容，生成一张叙事插画，更新到 agent.nanopromptlab.com 网站展示。

**Architecture:** 
1. `scripts/daily-build.sh` — 主构建脚本，读取 memory 日记 + git commits，提炼摘要，调用 `baoyu-image-gen` skill 生成插画，更新 `diary.html`，git commit + push
2. systemd timer — 每天 Asia/Shanghai 08:00（UTC 00:00）触发
3. `diary.html` — 展示每日插画（卡片顶部图片区域）

**Tech Stack:** bash, bun/ts (baoyu-image-gen), Python (html 更新), systemd timer, Google Imagen API

---

## 数据流

```
memory/YYYY-MM-DD.md  ──┐
git log --since yesterday ──┤→ 摘要提炼(LLM) → 叙事插画 Prompt → Google Imagen
openclaw session history ──┘                                         ↓
                                                          illustrations/YYYY-MM-DD.png
                                                                      ↓
                                                          diary.html 插入新卡片 (顶部含图)
                                                                      ↓
                                                          git commit + push → 网站自动更新
```

---

## 插画风格规范（每次生成都用这个 base prompt）

```
Style: narrative illustration, single scene, cinematic lighting
Characters: Larry (tech entrepreneur, casual hoodie, Chinese male, 30s) leading a team of glowing AI robot assistants
Setting: futuristic minimal workspace, orange-red accent color (#FF4B2B)
Mood: focused, energetic, productive
Aspect ratio: 16:9
NO text overlay, NO speech bubbles
Today's scene: [当日摘要提炼的场景描述]
```

---

## Task 1: 创建脚本目录和基础结构

**Files:**
- Create: `agent-site/scripts/daily-build.sh`
- Create: `agent-site/scripts/summarize.ts`
- Create: `agent-site/scripts/update-diary.py`

**Step 1: 创建 scripts 目录**
```bash
mkdir -p /root/.openclaw/workspace/agent-site/scripts
```

**Step 2: 验证目录存在**
```bash
ls /root/.openclaw/workspace/agent-site/scripts
```
Expected: 空目录，无报错

**Step 3: Commit**
```bash
cd /root/.openclaw/workspace/agent-site
git add scripts/
git commit -m "feat: add scripts directory for daily build system"
```

---

## Task 2: 编写摘要提炼脚本 `summarize.ts`

**Files:**
- Create: `agent-site/scripts/summarize.ts`

**功能：** 读取 memory/YYYY-MM-DD.md + 当日 git commits，调用 OpenAI/Google LLM，输出 JSON：
```json
{
  "summary": "今天莱德带着AI团队...",
  "scene_prompt": "Larry is reviewing a RAG pipeline diagram on holographic screen...",
  "diary_title": "RAG流水线调优：从失忆到全知",
  "tags": ["RAG", "技术", "自动化"]
}
```

**Step 1: 编写 summarize.ts**

```typescript
#!/usr/bin/env bun
/**
 * summarize.ts - 读取当日工作记录，提炼摘要和插画 prompt
 * Usage: bun summarize.ts [YYYY-MM-DD]
 */

import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const date = process.argv[2] || new Date().toISOString().split("T")[0];
const WORKSPACE = "/root/.openclaw/workspace";
const SITE_DIR = `${WORKSPACE}/agent-site`;

// 1. 读取 memory 日记
const memoryPath = `${WORKSPACE}/memory/${date}.md`;
const memoryContent = existsSync(memoryPath)
  ? readFileSync(memoryPath, "utf-8")
  : "(no memory file for this date)";

// 2. 读取当日 git commits
let gitLog = "";
try {
  gitLog = execSync(
    `git -C ${WORKSPACE} log --since="${date} 00:00:00" --until="${date} 23:59:59" --pretty=format:"%h %s" 2>/dev/null || true`
  ).toString();
} catch (_) {
  gitLog = "(no git commits)";
}

// 3. 组合上下文
const context = `
=== Memory (${date}) ===
${memoryContent}

=== Git Commits (${date}) ===
${gitLog || "(none)"}
`;

// 4. 调用 LLM 提炼摘要
const prompt = `
你是莱德（Larry）的 AI 总指挥莱德Bot，正在为个人品牌网站 agent.nanopromptlab.com 生成每日工作日记摘要。

请阅读以下当日工作记录，提炼出：
1. 一句中文摘要（30字以内），描述今天最重要的事
2. 一个英文叙事插画场景描述（50字以内），描述莱德带着AI团队做这件事的画面，用于 Google Imagen 生图。风格要求：narrative illustration, Larry (tech entrepreneur, casual hoodie, Chinese male, 30s) leading glowing AI robot assistants, futuristic minimal workspace, orange-red accent, focused energetic mood
3. 一个适合展示的中文日记标题（20字以内）
4. 2-4个适合的标签，从以下选：产品/技术/内容/自动化/多Agent/RAG/部署

输出严格 JSON 格式：
{
  "summary": "中文摘要",
  "scene_prompt": "English scene description for image generation",
  "diary_title": "日记标题",
  "tags": ["tag1", "tag2"]
}

工作记录：
${context}
`;

// 5. 调用 OpenAI API
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 500,
  }),
});

const data = await response.json() as any;
const result = JSON.parse(data.choices[0].message.content);
console.log(JSON.stringify(result, null, 2));
```

**Step 2: 测试脚本（dry run）**
```bash
cd /root/.openclaw/workspace/agent-site
OPENAI_API_KEY=$(grep OPENAI_API_KEY ~/.baoyu-skills/.env | cut -d= -f2) \
  bun scripts/summarize.ts 2026-03-08
```
Expected: 输出 JSON，含 summary / scene_prompt / diary_title / tags

**Step 3: Commit**
```bash
git add scripts/summarize.ts
git commit -m "feat: add summarize.ts - daily work summary extractor"
```

---

## Task 3: 编写 diary.html 更新脚本 `update-diary.py`

**Files:**
- Create: `agent-site/scripts/update-diary.py`

**功能：** 在 diary.html 的 `#diaryList` 顶部插入新卡片（含插画图片）

**Step 1: 编写 update-diary.py**

```python
#!/usr/bin/env python3
"""
update-diary.py - 在 diary.html 顶部插入当日日记卡片（含插画）
Usage: python3 update-diary.py --date YYYY-MM-DD --title "标题" --tags "tag1,tag2" --image illustrations/YYYY-MM-DD.png
"""

import argparse
import re
from pathlib import Path
from datetime import datetime

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--tags", required=True)  # comma-separated
    parser.add_argument("--image", required=True)  # relative path
    parser.add_argument("--diary", default="diary.html")
    args = parser.parse_args()

    diary_path = Path(args.diary)
    content = diary_path.read_text(encoding="utf-8")

    tags = [t.strip() for t in args.tags.split(",")]
    tags_html = "".join(f'<span class="tag">{t}</span>' for t in tags)
    data_tags = ",".join(tags)

    # 新卡片 HTML（含顶部插画图）
    new_card = f'''    <div class="diary-card diary-card--illustrated" data-tags="{data_tags}">
      <img class="diary-illustration" src="{args.image}" alt="每日插画 {args.date}" loading="lazy">
      <div class="diary-day">{args.date}</div>
      <div>
        <div class="diary-title">{args.title}</div>
        <div class="diary-tags">
          {tags_html}
        </div>
      </div>
    </div>'''

    # 插入到 #diaryList 内部顶部
    marker = '<div id="diaryList"'
    idx = content.find(marker)
    if idx == -1:
        print("ERROR: #diaryList not found in diary.html")
        exit(1)

    # 找到 > 结束位置
    tag_end = content.find(">", idx) + 1
    new_content = content[:tag_end] + "\n" + new_card + "\n" + content[tag_end:]

    # 更新同步时间
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    new_content = re.sub(
        r'最后同步：[\d\-: UTC]+',
        f'最后同步：{now}',
        new_content
    )

    diary_path.write_text(new_content, encoding="utf-8")
    print(f"✅ Inserted diary card for {args.date}: {args.title}")

if __name__ == "__main__":
    main()
```

**Step 2: 测试（dry run，先备份）**
```bash
cd /root/.openclaw/workspace/agent-site
cp diary.html diary.html.bak
python3 scripts/update-diary.py \
  --date 2026-03-08 \
  --title "测试日记标题" \
  --tags "技术,自动化" \
  --image illustrations/2026-03-08.png
# 检查输出
head -80 diary.html | grep -A10 "diaryList"
# 回滚
cp diary.html.bak diary.html
```
Expected: 看到新卡片插入到 diaryList 顶部

**Step 3: Commit**
```bash
git add scripts/update-diary.py
git commit -m "feat: add update-diary.py - insert illustrated diary card"
```

---

## Task 4: 添加插画 CSS 样式

**Files:**
- Modify: `agent-site/style.css`

**Step 1: 在 style.css 末尾追加**

```css
/* === 每日插画卡片 === */
.diary-card--illustrated {
  padding: 0;
  overflow: hidden;
  flex-direction: column;
}

.diary-card--illustrated .diary-day,
.diary-card--illustrated > div {
  padding: 12px 16px;
}

.diary-illustration {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
  border-bottom: 1px solid rgba(255, 75, 43, 0.15);
}
```

**Step 2: 验证样式（本地预览）**
- 用浏览器打开 `http://localhost:8766/diary.html`
- 确认插画卡片有图片区域，不破坏现有卡片布局

**Step 3: Commit**
```bash
git add style.css
git commit -m "feat: add diary illustration card styles"
```

---

## Task 5: 编写主构建脚本 `daily-build.sh`

**Files:**
- Create: `agent-site/scripts/daily-build.sh`

**Step 1: 编写 daily-build.sh**

```bash
#!/bin/bash
# daily-build.sh - 每日自动构建：提炼摘要 → 生成插画 → 更新diary.html → git push
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
source ~/.baoyu-skills/.env 2>/dev/null || true
export OPENAI_API_KEY GOOGLE_API_KEY

echo "🚀 [daily-build] Starting build for $DATE"

# Step 1: 提炼摘要
echo "📝 Step 1: Summarizing today's work..."
SUMMARY_JSON=$(bun "$SCRIPTS_DIR/summarize.ts" "$DATE")
echo "$SUMMARY_JSON"

SCENE_PROMPT=$(echo "$SUMMARY_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['scene_prompt'])")
DIARY_TITLE=$(echo "$SUMMARY_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['diary_title'])")
TAGS=$(echo "$SUMMARY_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(','.join(d['tags']))")

echo "  Scene: $SCENE_PROMPT"
echo "  Title: $DIARY_TITLE"
echo "  Tags:  $TAGS"

# Step 2: 生成插画（baoyu-image-gen, Google Imagen, 16:9）
echo "🎨 Step 2: Generating illustration..."
FULL_PROMPT="Narrative illustration, single scene, cinematic lighting. ${SCENE_PROMPT}. No text overlay, no speech bubbles, no watermarks. Orange-red accent color (#FF4B2B). Futuristic minimal workspace background."

npx -y bun "$IMAGE_GEN_SKILL/scripts/main.ts" \
  --prompt "$FULL_PROMPT" \
  --image "$IMAGE_OUT" \
  --ar 16:9 \
  --provider google \
  --quality 2k

echo "  ✅ Image saved: $IMAGE_OUT"

# Step 3: 更新 diary.html
echo "📄 Step 3: Updating diary.html..."
cd "$SITE_DIR"
python3 "$SCRIPTS_DIR/update-diary.py" \
  --date "$DATE" \
  --title "$DIARY_TITLE" \
  --tags "$TAGS" \
  --image "illustrations/${DATE}.png"

# Step 4: Git commit + push
echo "📦 Step 4: Committing and pushing..."
git add illustrations/"${DATE}.png" diary.html
git commit -m "auto: daily illustration + diary [$DATE]"
git push origin master

echo "✅ [daily-build] Done! https://agent.nanopromptlab.com/diary.html"
```

**Step 2: 赋予执行权限**
```bash
chmod +x /root/.openclaw/workspace/agent-site/scripts/daily-build.sh
```

**Step 3: 端到端测试（今天的日期）**
```bash
cd /root/.openclaw/workspace/agent-site
bash scripts/daily-build.sh 2026-03-08
```
Expected: 
- `illustrations/2026-03-08.png` 生成
- `diary.html` 顶部出现新卡片（含图）
- git commit 成功

**Step 4: Commit 脚本本身**
```bash
git add scripts/daily-build.sh
git commit -m "feat: add daily-build.sh - main build orchestrator"
```

---

## Task 6: 配置 systemd timer（每天 08:00 CST 触发）

**Files:**
- Create: `/etc/systemd/system/agent-daily-build.service`
- Create: `/etc/systemd/system/agent-daily-build.timer`

**Step 1: 创建 service 文件**

```ini
# /etc/systemd/system/agent-daily-build.service
[Unit]
Description=Agent Site Daily Illustration Build
After=network.target

[Service]
Type=oneshot
User=root
WorkingDirectory=/root/.openclaw/workspace/agent-site
ExecStart=/bin/bash /root/.openclaw/workspace/agent-site/scripts/daily-build.sh
StandardOutput=journal
StandardError=journal
EnvironmentFile=-/root/.baoyu-skills/.env

[Install]
WantedBy=multi-user.target
```

**Step 2: 创建 timer 文件（UTC 00:00 = CST 08:00）**

```ini
# /etc/systemd/system/agent-daily-build.timer
[Unit]
Description=Agent Site Daily Build Timer (08:00 CST = 00:00 UTC)
Requires=agent-daily-build.service

[Timer]
OnCalendar=*-*-* 00:00:00 UTC
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

**Step 3: 启用 timer**
```bash
systemctl daemon-reload
systemctl enable --now agent-daily-build.timer
systemctl status agent-daily-build.timer
```
Expected: timer 状态 active (waiting)，Next trigger 显示明天 00:00 UTC

**Step 4: 手动测试触发一次**
```bash
systemctl start agent-daily-build.service
journalctl -u agent-daily-build.service -f --no-pager -n 50
```
Expected: 看到完整构建日志，最后 "Done! https://agent.nanopromptlab.com/diary.html"

---

## Task 7: 更新 CLAUDE.md 记录完成状态

**Files:**
- Modify: `agent-site/CLAUDE.md`

**Step 1: 在 CLAUDE.md 的"待实现"部分更新为已完成**

将 TODO 全部勾选，新增：
```markdown
### 每日构建系统（已完成 2026-03-08）

- ✅ `scripts/summarize.ts` — 读取 memory + git log，LLM 提炼摘要 + 插画 prompt
- ✅ `scripts/update-diary.py` — 在 diary.html 顶部插入日记卡片（含插画）
- ✅ `scripts/daily-build.sh` — 主构建脚本，串联上述步骤
- ✅ `systemd timer` — `agent-daily-build.timer`，每天 UTC 00:00 触发
- ✅ `style.css` — 添加 `.diary-card--illustrated` 样式

**触发方式：**
- 自动：每天 UTC 00:00（CST 08:00）
- 手动：`systemctl start agent-daily-build.service`
- 本地测试：`bash scripts/daily-build.sh [YYYY-MM-DD]`
```

**Step 2: Commit**
```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md - daily build system complete"
git push origin master
```

---

## 完成验收标准

- [ ] `bash scripts/daily-build.sh 2026-03-08` 全程无报错
- [ ] `illustrations/2026-03-08.png` 存在，是 16:9 叙事插画
- [ ] `diary.html` 顶部第一张卡片有插画图片
- [ ] `https://agent.nanopromptlab.com/diary.html` 显示新卡片+图
- [ ] `systemctl status agent-daily-build.timer` 显示 active (waiting)
- [ ] 日志中无 ERROR

---

## 回滚方案

```bash
# 如果 diary.html 损坏
cd /root/.openclaw/workspace/agent-site
git checkout HEAD~1 -- diary.html

# 停止 timer
systemctl stop agent-daily-build.timer
systemctl disable agent-daily-build.timer
```
