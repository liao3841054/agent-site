# CLAUDE.md — agent-site 项目记忆

> 这是 LarryBot（Larry 的 AI 总指挥）的项目记忆文件。
> 每次进入这个项目，先读这个文件，不要重新发明轮子。

---

## 🌐 项目定位

**网站**：`https://agent.nanopromptlab.com`  
**目的**：Larry 的 AI 团队个人品牌展示站，展示 AI 落地能力、工作日记、原理科普、技能商店。  
**风格参考**：sanwan.ai 风格，龙虾橙红配色，硬朗简洁。

---

## 📁 目录结构

```
/root/.openclaw/workspace/agent-site/
├── index.html          # 主页：Hero + 日记轮播 + 统计双栏 + 4大能力 Tab + 技能预览 + CTA
├── diary.html          # 工作日记：统计栏 + 标签筛选 + 故事性日记卡片（Day 1~88，含摘要）
├── science.html        # 原理科普：5章结构（Agent/Skill/RAG/多Agent/Context）
├── skills.html         # 技能商店：8个品牌化技能包（非实际安装列表）
├── style.css           # 全局样式，龙虾橙红配色（825行）
├── COPY.md             # 全站文案库（591行，25KB）—— 所有文案的权威来源
├── illustrations/      # AI 生成插画目录
│   ├── multi-agent-team.png
│   ├── todays-deployment-flow.png
│   └── YYYY-MM-DD.png  # 每日自动生成的插画
└── CLAUDE.md           # 本文件
```

---

## 🏗️ 基础设施

| 组件 | 详情 |
|------|------|
| HTTP 服务 | `agent-http.service` (systemd)，端口 **8766**，`python3 -m http.server` 或 nginx |
| Tunnel | `agent-tunnel.service` (systemd)，Cloudflare Tunnel → `agent.nanopromptlab.com` |
| Git | 项目在 `/root/.openclaw/workspace/agent-site/`，已关联 GitHub (`liao3841054/agent-site`) |

**服务管理命令**：
```bash
systemctl status agent-http.service
systemctl status agent-tunnel.service
systemctl restart agent-http.service
```

---

## 🤖 自动化任务（已实现）

### 现有 cron（diary+skills 同步）
每小时左右自动同步日记和技能数据到页面，commit 格式：
```
auto: sync diary+skills [2026-03-08 01:08 UTC]
```

### 每日构建系统（已完成 2026-03-08）

- ✅ `scripts/summarize.ts` — 读取 memory + git log，LLM 提炼摘要 + 插画 prompt（OpenAI fallback → Gemini）
- ✅ `scripts/update-diary.py` — 在 diary.html 顶部插入日记卡片（含插画）
- ✅ `scripts/daily-build.sh` — 主构建脚本，串联上述步骤
- ✅ `systemd timer` — `agent-daily-build.timer`，每天 UTC 00:00（CST 08:00）触发
- ✅ `style.css` — 添加 `.diary-card--illustrated` 样式

**触发方式：**
- 自动：每天 UTC 00:00（CST 08:00）by `agent-daily-build.timer`
- 手动：`systemctl start agent-daily-build.service`
- 本地测试：`bash scripts/daily-build.sh [YYYY-MM-DD]`

**LLM 提炼逻辑：**
- 优先 OpenAI gpt-4o-mini；如 quota 耗尽，自动 fallback 到 Gemini 2.0 Flash
- 如两者都失败，使用硬编码默认 prompt（保证流程不中断）

**插画风格：**
- 16:9 叙事插画，Larry + AI 机器人团队
- 橙红色 (#FF4B2B) accent，极简未来感工作台
- Google Imagen via `baoyu-image-gen` skill

---

## 🎨 设计规范

- **主色**：龙虾橙红 `#FF4B2B` 或类似
- **字体风格**：无衬线，简洁硬朗
- **标签体系**：`产品` `技术` `内容` `自动化` `多Agent` `RAG` `部署`
- **金句风格**（参考 COPY.md）：
  - "Prompt 是一次性的对话，Context 是持续运行的系统。"
  - "不上 RAG 的 AI 系统，就是把失忆症患者放在客服岗位。"
  - "SaaS 是租房，本地部署是买房。"

### skills.html 设计思路（v2，2026-03-11）
- **8张卡片**，每张：所属成员 + 技能数徽章 + 标题 + 标签 + 描述 + 模块列表
- 卡片顶部 hover 时出现橙红色 2px border-top 线
- 顶部引用金句 block（左橙线风格）
- 标签筛选按技能类型过滤（与 diary.html 筛选逻辑同构）
- **内容来源**：完全来自 COPY.md 的 `skills.html 技能商店文案` 章节

### diary.html 设计思路（v2，2026-03-11）
- 顶部统计栏（88+天 / 3成员 / 40+技能 / 7×24）
- 每条日记有 Day 编号橙红徽章 + 日期 + 标题 + 摘要一句话
- **内容来源**：标题完全来自 COPY.md 的「日记/日志条目标题」章节，摘要自行提炼
- 卡片倒序排列（Day 88 → Day 1），最新在前

### index.html 设计思路（已有）
- Hero → 日记轮播（JS 自动翻页，3条/屏）→ 统计双栏（左：故事梗概文字，右：数字卡片）→ 4大能力 Tab → 技能预览（3列网格）→ CTA
- 统计数字用 CountUp 动画（IntersectionObserver 触发）
- 4大能力用 Tab 切换（Context Engineering / RAG / 本地部署 / 多Agent）

---

## 📋 历史里程碑

| 日期 | 事件 |
|------|------|
| 2026-03-05 | ai-news-radar 项目部署全流程打通 |
| 2026-03-06 | main Agent 升级为 Larry（总指挥），图像生成能力上线 |
| 2026-03-06 | 初始网站建立，4页面 HTML + Cloudflare Tunnel + systemd |
| 2026-03-06 | 龙虾橙红配色迭代 v2 |
| 2026-03-08 | COPY.md 全站文案完成（591行），自动同步 cron 上线 |
| 2026-03-08 | 每日构建系统 + AI 插画生成完成（systemd timer 激活）|
| 2026-03-11 | P0 完成：skills.html 重写为8个品牌化技能包；diary.html 修复为故事性标题 + 统计栏 |
| 2026-03-11 | P1-8 完成：diary.html + skills.html 补全 twitter:card / og:image SEO meta |

---

## 🎯 开发待办（来自 TODO.md，Larry 已确认方向）

### ✅ 已完成
- [x] **P0-1**：skills.html 重写 → 8个品牌化技能包（COPY.md 来源）
- [x] **P0-2**：diary.html 标题治理 → 15条故事性标题（Day 1~88）
- [x] **P1-8**：全站 SEO meta 补全（og:image / twitter:card）

### 🔜 待开发（需 Larry 拍板顺序）
- [ ] **P1-1**：首页日记轮播加 AI 生成封面插画
- [ ] **P1-3**：diary.html 日记卡片批量插画覆盖
- [ ] **P1-4**：giscus 留言板接入（需 GitHub Repo 开启 Discussions）
- [ ] **P1-5**：日记详情页（`diary/` 子目录，15个 HTML 文件）
- [ ] **P1-6**：技能详情页（`skills/` 子目录，8个 HTML 文件）
- [ ] **P1-2**：footer 社媒链接（公众号/GitHub/X）补真实 URL（占位已加）

---

## ⚠️ 注意事项

1. **不要动 `style.css` 的配色变量**，龙虾橙红是品牌核心
2. **diary.html 的日记卡片**按日期倒序排列，最新在最前
3. **git commit 格式**：`feat/fix/auto: <描述> [YYYY-MM-DD HH:MM UTC]`
4. **插画目录**：`illustrations/`，命名用 `YYYY-MM-DD.png`
5. **端口 8766** 是 agent 专用，不要改动
6. **skills.html 内容**永远来自 COPY.md，不要用实际安装的 clawhub 技能列表替换
7. **每日构建脚本** (`scripts/update-diary.py`) 会在 diary.html 顶部插入新卡片，注意不要破坏 HTML 结构

---

## 🔗 相关文件

- 全站文案：`COPY.md`（**权威来源，所有文案先查这里**）
- 全局样式：`style.css`
- 主页：`index.html`
- 日记页：`diary.html`（插画展示的主战场）
- 技能商店：`skills.html`
- 原理科普：`science.html`
- 开发待办：`TODO.md`（优先级排序）
- 分析报告：`findings.md`（sanwan.ai 对标分析，约9800字）
