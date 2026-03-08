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
    parser.add_argument("--tags", required=True)   # comma-separated
    parser.add_argument("--image", required=True)  # relative path
    parser.add_argument("--diary", default="diary.html")
    args = parser.parse_args()

    diary_path = Path(args.diary)
    if not diary_path.exists():
        print(f"ERROR: {args.diary} not found")
        exit(1)

    content = diary_path.read_text(encoding="utf-8")

    tags = [t.strip() for t in args.tags.split(",") if t.strip()]
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

    # 插入到 #diaryList 内部顶部（找到开标签的 >）
    marker = 'id="diaryList"'
    idx = content.find(marker)
    if idx == -1:
        print("ERROR: #diaryList not found in diary.html")
        exit(1)

    # 找到这个标签的 > 结束位置
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
