# CLAUDE.md — agent-site 项目记忆

> 这是 LarryBot（莱德的 AI 总指挥）的项目记忆文件。
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
├── index.html          # 主页：Hero + 数字卡片 + 4大能力 + 技能商店 + CTA
├── diary.html          # 工作日记：可筛选标签，日记卡片列表
├── science.html        # 原理科普：5章结构（Agent/Skill/RAG/多Agent/Context）
├── skills.html         # 技能商店：8个技能包完整卡片
├── style.css           # 全局样式，龙虾橙红配色
├── COPY.md             # 全站文案库（591行，25KB）
├── illustrations/      # AI 生成插画目录
│   ├── multi-agent-team.png
│   ├── todays-deployment-flow.png
│   └── YYYY-MM-DD.png  # 每日自动生成的插画（待实现）
└── CLAUDE.md           # 本文件
```

---

## 🏗️ 基础设施

| 组件 | 详情 |
|------|------|
| HTTP 服务 | `agent-http.service` (systemd)，端口 **8766**，`python3 -m http.server` 或 nginx |
| Tunnel | `agent-tunnel.service` (systemd)，Cloudflare Tunnel → `agent.nanopromptlab.com` |
| Git | 项目在 `/root/.openclaw/workspace/agent-site/`，已关联 GitHub |

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

---

## 🎯 待实现：每日定时构建 + 插画生成

> **Larry 的需求（2026-03-08）**：
> 1. 每天定时构建部署一次
> 2. 每天生成一张插画（展示当天做的事情）
> 3. 在网站 diary.html 上展示插画

### 设计思路（待确认）

**数据来源**：从 git commits 读取当天的工作记录  
**插画生成**：调用 AI 图像生成 API，根据当日摘要生成插图，存入 `illustrations/YYYY-MM-DD.png`  
**展示方式**：diary.html 每条日记卡片顶部显示对应日期插画  
**触发时机**：每天 UTC 00:00（或 Asia/Shanghai 08:00）执行  

### 实现步骤（TODO）

- [ ] 确认插画数据来源（git commits / 手动日志 / 飞书）
- [ ] 确认 AI 图像生成 API（DALL-E / Stability / 其他）
- [ ] 编写 `scripts/daily-build.sh`
  - 读取当日工作摘要
  - 调用图像生成 API → 存入 `illustrations/YYYY-MM-DD.png`
  - 更新 `diary.html` 插入新日记卡片+插画
  - git commit + push
- [ ] 配置 crontab 或 systemd timer
- [ ] 在 `diary.html` 展示插画（卡片顶部图片区域）

---

## 🎨 设计规范

- **主色**：龙虾橙红 `#FF4B2B` 或类似
- **字体风格**：无衬线，简洁硬朗
- **标签体系**：`产品` `技术` `内容` `自动化` `多Agent` `RAG` `部署`
- **金句风格**（参考 COPY.md）：
  - "Prompt 是一次性的对话，Context 是持续运行的系统。"
  - "不上 RAG 的 AI 系统，就是把失忆症患者放在客服岗位。"
  - "SaaS 是租房，本地部署是买房。"

---

## 📋 历史里程碑

| 日期 | 事件 |
|------|------|
| 2026-03-05 | ai-news-radar 项目部署全流程打通 |
| 2026-03-06 | main Agent 升级为莱德（总指挥），图像生成能力上线 |
| 2026-03-06 | 初始网站建立，4页面 HTML + Cloudflare Tunnel + systemd |
| 2026-03-06 | 龙虾橙红配色迭代 v2 |
| 2026-03-08 | COPY.md 全站文案完成（591行），自动同步 cron 上线 |
| 2026-03-08 | 需求提出：每日定时构建 + AI 插画生成（待实现） |

---

## ⚠️ 注意事项

1. **不要动 `style.css` 的配色变量**，龙虾橙红是品牌核心
2. **diary.html 的日记卡片**按日期倒序排列，最新在最前
3. **git commit 格式**：`auto: <描述> [YYYY-MM-DD HH:MM UTC]`
4. **插画目录**：`illustrations/`，命名用 `YYYY-MM-DD.png`
5. **端口 8766** 是 agent 专用，不要改动

---

## 🔗 相关文件

- 全站文案：`COPY.md`
- 全局样式：`style.css`  
- 主页：`index.html`
- 日记页：`diary.html`（插画展示的主战场）
- 技能商店：`skills.html`
- 原理科普：`science.html`
