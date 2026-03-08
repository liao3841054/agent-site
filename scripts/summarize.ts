#!/usr/bin/env bun
/**
 * summarize.ts - 读取当日工作记录，提炼摘要和插画 prompt
 * Usage: bun summarize.ts [YYYY-MM-DD]
 */

import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const date = process.argv[2] || new Date().toISOString().split("T")[0];
const WORKSPACE = "/root/.openclaw/workspace";

// 1. 读取 memory 日记
const memoryPath = `${WORKSPACE}/memory/${date}.md`;
const memoryContent = existsSync(memoryPath)
  ? readFileSync(memoryPath, "utf-8")
  : "(no memory file for this date)";

// 2. 读取当日 git commits（从 workspace）
let gitLog = "";
try {
  gitLog = execSync(
    `git -C "${WORKSPACE}" log --since="${date} 00:00:00" --until="${date} 23:59:59" --pretty=format:"%h %s" 2>/dev/null || true`,
    { encoding: "utf-8" }
  ).toString().trim();
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

// 4. 读取当前日记数量用于计算 Day N
import { readFileSync as _readFileSync } from "fs";
let dayNumber = 1;
try {
  const diaryHtml = _readFileSync(`${WORKSPACE}/agent-site/diary.html`, "utf-8");
  const matches = diaryHtml.match(/class="diary-card/g);
  dayNumber = (matches ? matches.length : 0) + 1;
} catch (_) {}

// 5. 调用 LLM 提炼摘要
const llmPrompt = `
你是 Larry 的 AI 总指挥 LarryBot。Larry 是一位有12年经验的 AI 落地创业者，正在用 AI 团队构建个人品牌站 agent.nanopromptlab.com。

请阅读以下当日工作记录，写一篇「每日进化日报」，风格参考：

> Day 11：从1个人变成一支团队
> 今天是转折点。三万不再是「一个AI」了。
> 8角色团队上线：总指挥、笔杆子、参谋……每个角色有自己的记忆、自己的Skill库。
> 老板说：「这不是一个人了，这是一支军队。」

【写作要求】
- Day 编号是 ${dayNumber}，标题要是一句有力的进化判断（非任务描述）
- 开头一句定调：今天是什么转折点/节点
- 正文2-4句叙事：有角色、有动作、有具体成果，可加引用语增加真实感
- **忽略执行细节**（改哪个文件/API），聚焦"升级了什么能力/打通了什么瓶颈"
- 标题风格要有锋芒，像万维刚：下判断，不温吞

【同时提炼】
- 今天的可量化数字（commits数/新技能数/新功能数等，从记录中提取，没有就不填）
- 一句对读者的行动启发（让人看完想抄作业）
- 英文插画场景描述（用于 AI 生图）：具体的决定性时刻画面，有视觉隐喻，不要泛泛的"办公室场景"

【输出严格 JSON】
{
  "day_number": ${dayNumber},
  "diary_title": "Day ${dayNumber}：[进化节点名称，20字以内]",
  "hook": "开头定调句（30字以内，有转折感）",
  "body": "正文叙事（60-100字，有角色有动作有引用语）",
  "stats": {
    "commits": 数字或null,
    "new_skills": 数字或null,
    "new_features": 数字或null
  },
  "insight": "行动启发一句话（25字以内）",
  "scene_prompt": "English narrative illustration (60 words max): Larry (tech entrepreneur, casual hoodie, Chinese male, 30s) + glowing AI robot assistants at a decisive cinematic moment capturing today's evolution. Specific visual metaphor for the breakthrough. Futuristic minimal workspace, orange-red accent #FF4B2B, dramatic lighting. NO text, NO speech bubbles.",
  "tags": ["tag1", "tag2"]
}

标签从以下选2-4个：产品/技术/内容/自动化/多Agent/RAG/部署

工作记录：
${context}
`;

// 5. 尝试 Google Gemini（如果 OpenAI 不可用则回退）
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("No GOOGLE_API_KEY");
  
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 500,
        },
      }),
    }
  );
  const data = await res.json() as any;
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.candidates[0].content.parts[0].text;
}

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    }),
  });
  const data = await res.json() as any;
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.choices[0].message.content;
}

let rawJson: string;

// Try OpenAI first, fallback to Gemini
try {
  rawJson = await callOpenAI(llmPrompt);
} catch (err) {
  console.error("OpenAI failed, trying Gemini:", (err as Error).message);
  try {
    rawJson = await callGemini(llmPrompt);
  } catch (err2) {
    // Ultimate fallback: generate default based on date
    console.error("Gemini also failed:", (err2 as Error).message);
    rawJson = JSON.stringify({
      day_number: dayNumber,
      diary_title: `Day ${dayNumber}：AI 团队持续进化中`,
      hook: "今天系统又往前走了一步。",
      body: "Larry 带着 AI 团队持续构建，每一天都是新的进化节点。自动化流水线稳定运行，能力边界在悄悄扩张。",
      stats: { commits: null, new_skills: null, new_features: null },
      insight: "系统每天跑，能力每天长，复利在悄悄生效。",
      scene_prompt: `Larry stands at the center of a command bridge, surrounded by holographic displays showing AI agent activity logs, orange-red data streams flowing between glowing robot assistants, each handling different tasks autonomously, futuristic minimal workspace, dramatic overhead lighting`,
      tags: ["自动化", "多Agent", "技术"]
    });
  }
}

const result = JSON.parse(rawJson);
console.log(JSON.stringify(result, null, 2));
