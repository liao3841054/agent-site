#!/usr/bin/env python3
"""
update-diary.py - 在 diary.html 顶部插入当日日记卡片（日报格式）
Usage: python3 update-diary.py --date YYYY-MM-DD --title "Day N：标题" --tags "tag1,tag2"
       --image illustrations/YYYY-MM-DD.png [--hook "定调句"] [--body "正文"] 
       [--insight "行动启发"] [--stats '{"commits":3}']
"""

import argparse
import re
import json
from pathlib import Path
from datetime import datetime, timezone


def build_stats_html(stats_json: str) -> str:
    """根据 stats 字典生成数字卡片 HTML"""
    try:
        stats = json.loads(stats_json) if stats_json else {}
    except Exception:
        stats = {}

    items = []
    label_map = {
        "commits":      ("📦", "commits"),
        "new_skills":   ("⚡", "新技能"),
        "new_features": ("🚀", "新功能"),
        "messages":     ("📨", "条消息"),
        "agents":       ("👥", "Agent上线"),
    }
    for key, (emoji, label) in label_map.items():
        val = stats.get(key)
        if val is not None:
            items.append(f'<span class="diary-stat">{emoji} +{val} {label}</span>')

    if not items:
        return ""
    return f'<div class="diary-stats">{"".join(items)}</div>'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date",    required=True)
    parser.add_argument("--title",   required=True)
    parser.add_argument("--tags",    required=True)
    parser.add_argument("--image",   required=True)
    parser.add_argument("--hook",    default="")     # 定调句
    parser.add_argument("--body",    default="")     # 正文叙事
    parser.add_argument("--insight", default="")     # 行动启发
    parser.add_argument("--stats",   default="{}")   # JSON 统计数字
    parser.add_argument("--diary",   default="diary.html")
    args = parser.parse_args()

    diary_path = Path(args.diary)
    if not diary_path.exists():
        print(f"ERROR: {args.diary} not found")
        exit(1)

    content = diary_path.read_text(encoding="utf-8")

    tags = [t.strip() for t in args.tags.split(",") if t.strip()]
    tags_html = "".join(f'<span class="tag">{t}</span>' for t in tags)
    data_tags = ",".join(tags)

    # 统计数字行
    stats_html = build_stats_html(args.stats)

    # 可选字段区块
    hook_html    = f'<p class="diary-hook">{args.hook}</p>' if args.hook else ""
    body_html    = f'<p class="diary-body">{args.body}</p>' if args.body else ""
    insight_html = f'<div class="diary-insight">💡 {args.insight}</div>' if args.insight else ""

    # 完整卡片 HTML（对标 Day 11 格式）
    new_card = f'''    <div class="diary-card diary-card--illustrated" data-tags="{data_tags}">
      <img class="diary-illustration" src="{args.image}" alt="插画 {args.date}" loading="lazy">
      <div class="diary-card-body">
        <div class="diary-day">{args.date}</div>
        <div class="diary-title">{args.title}</div>
        {hook_html}
        {body_html}
        {stats_html}
        {insight_html}
        <div class="diary-tags">{tags_html}</div>
      </div>
    </div>'''

    # 插入到 #diaryList 内部顶部
    marker = 'id="diaryList"'
    idx = content.find(marker)
    if idx == -1:
        print("ERROR: #diaryList not found in diary.html")
        exit(1)

    tag_end = content.find(">", idx) + 1
    new_content = content[:tag_end] + "\n" + new_card + "\n" + content[tag_end:]

    # 更新同步时间
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    new_content = re.sub(
        r'最后同步：[\d\-: UTC]+',
        f'最后同步：{now}',
        new_content
    )

    diary_path.write_text(new_content, encoding="utf-8")
    print(f"✅ Inserted diary card for {args.date}: {args.title}")


if __name__ == "__main__":
    main()
