# agent-site 开发待办清单

> 生成时间：2026-03-08
> 基于 sanwan.ai 对标分析，详见 findings.md

---

## 🔴 P0 — 立刻修复（影响核心体验）

### P0-1：修复 skills.html 内容错位
- **功能描述**：将技能商店从"实际安装技能列表"改为 COPY.md 中的品牌化技能包（8个）
- **复杂度**：低（1-2h）
- **页面**：skills.html
- **实现思路**：按 COPY.md 的8个技能包重写 HTML 卡片，使用中文卖点文案

### P0-2：日记标题内容治理
- **功能描述**：将 diary.html 中的"Conversation Summary"等无意义标题替换为 COPY.md 中故事性标题（Day 1~18+）
- **复杂度**：低（1-2h）
- **页面**：diary.html
- **实现思路**：手动编辑日记卡片，对应 COPY.md 里18条故事性标题

---

## 🟠 P1 — 近期开发（显著提升体验）

### P1-1：首页日记轮播加插画
- **功能描述**：首页轮播每条日记显示 AI 生成封面图（而不是纯文字）
- **复杂度**：中（半天）
- **页面**：index.html
- **实现思路**：
  - 扩展 `diaryItems` 数组加 `img` 字段
  - 批量生成插画（baoyu-cover-image）
  - 加左右翻页按钮（`‹` `›`）

### P1-2：首页加社媒/外链入口
- **功能描述**：Footer + Hero 加入公众号/GitHub/X（Twitter）链接
- **复杂度**：低（1h）
- **页面**：全局 footer
- **实现思路**：Footer 加 icon 链接

### P1-3：diary.html 插画覆盖率提升
- **功能描述**：对主要日记（18条）批量生成 AI 插画并显示
- **复杂度**：中（半天）
- **页面**：diary.html
- **实现思路**：批量调用 baoyu-cover-image，更新卡片为 `diary-card--illustrated` 样式

### P1-4：留言板（giscus 接入）
- **功能描述**：接入 GitHub Discussions + giscus，让访客可以留言
- **复杂度**：低（2h，主要是 GitHub Repo 设置）
- **页面**：index.html, diary.html 底部
- **实现思路**：
  1. 开启 GitHub Repo Discussions
  2. giscus.app 获取嵌入代码
  3. 加入各页 footer 上方

### P1-5：日记详情页
- **功能描述**：每条日记有独立 HTML 详情页（diary/day1.html 等），支持深阅读和锚点
- **复杂度**：中（1天）
- **页面**：新增 diary/ 子目录
- **实现思路**：
  1. 创建 diary/ 目录，为18条日记各建 HTML 文件
  2. diary.html 卡片点击跳转详情页
  3. 详情页底部加"上一篇/下一篇"导航

### P1-6：技能详情页
- **功能描述**：每个技能包有独立详情页（skills/content-pipeline.html 等）
- **复杂度**：中（半天）
- **页面**：新增 skills/ 子目录
- **实现思路**：创建 skills/ 目录，为8个技能包各建 HTML 文件，skills.html 卡片点击跳转

### P1-7：首页统计数字卡片升级（双栏）
- **功能描述**：统计区改为"故事梗概 + 媒体效应"双栏布局（参考 sanwan.ai）
- **复杂度**：低（2h）
- **页面**：index.html
- **实现思路**：左栏故事梗概（带 emoji），右栏媒体效应（真实数据）

### P1-8：SEO 优化（OG 图 + 结构化数据）
- **功能描述**：每页加 og:image/og:title/og:description + JSON-LD + sitemap.xml
- **复杂度**：低（2h）
- **页面**：全部页面 head 区
- **实现思路**：统一加 Open Graph meta tags，生成 sitemap.xml

---

## 🟡 P2 — 未来规划（锦上添花）

### P2-1：文章页（articles.html）
- **功能描述**：新增深度文章页，存放字数更长的内容（参考 sanwan.ai/articles.html）
- **复杂度**：中
- **页面**：新增 articles.html + articles/ 子目录

### P2-2：多语言（EN 英文版）
- **功能描述**：关键页面提供英文版（触达海外受众）
- **复杂度**：高（翻译全站 + 创建 en/ 子目录）
- **页面**：en/ 子目录

### P2-3：科普页 CountUp 动态数字
- **功能描述**：science.html 数据展示区加入数字滚动动画
- **复杂度**：低（直接复用 index.html 代码）
- **页面**：science.html

### P2-4：滚动进入动画（scroll-reveal）
- **功能描述**：各卡片进入视口时淡入上移动画
- **复杂度**：低
- **页面**：全局 style.css

### P2-5：技能商店搜索/筛选
- **功能描述**：技能页加搜索框 + 标签筛选（官方/技术/内容/必装等）
- **复杂度**：中
- **页面**：skills.html

### P2-6：日记页搜索功能
- **功能描述**：日记页加搜索框，支持关键词搜索
- **复杂度**：低
- **页面**：diary.html

---

## 快速行动指南

**今天能搞定（P0，1-4小时）：**
1. 重写 skills.html → 改成品牌化8个技能包
2. 批量替换 diary.html 标题 → 改成故事性日记标题

**本周完成（P1，2-3天）：**
3. 首页轮播加插画 + 左右翻页按钮
4. giscus 留言板接入
5. SEO meta 标签补全 + sitemap.xml
6. 首页统计双栏升级
7. 社媒外链 footer

**下个阶段（P1 深度内容，1周）：**
8. 日记详情页（diary/ 子目录，18个 HTML）
9. 技能详情页（skills/ 子目录，8个 HTML）
10. diary.html 插画批量覆盖

---

*详细分析见 findings.md*
