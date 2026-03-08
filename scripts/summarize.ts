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

// 4. 调用 LLM 提炼摘要
const llmPrompt = `
你是 Larry 的 AI 总指挥 LarryBot。Larry 是一位有12年经验的 AI 落地创业者，正在用 AI 团队构建个人品牌站 agent.nanopromptlab.com。

请阅读以下当日工作记录，**不要**总结"做了什么"，而是提炼出今天发生的**系统进化节点**——
今天之后，Larry 的 AI 团队/认知/能力跃迁到了哪个新台阶？这个跃迁对读者有什么行动启发？

【提炼框架】
- 忽略执行细节（改了哪个文件、调了哪个 API）
- 聚焦"升级了什么"：新增了什么能力？打通了什么瓶颈？验证了什么假设？改变了什么工作方式？
- 用"之前 vs 之后"的视角思考
- 标题要有锋芒，像万维刚风格：下判断，不温吞

【输出 JSON 格式】
{
  "evolution": "一句话描述今天的系统进化（25字以内，有判断力，非流水账）",
  "insight": "对读者的行动启发，一句话（30字以内），让人看完想抄作业",
  "scene_prompt": "English narrative illustration scene (60 words max): Larry (tech entrepreneur, casual hoodie, Chinese male, 30s) and glowing AI robot assistants at a specific decisive moment that captures today's evolution — NOT generic office work. Include a visual metaphor for the upgrade/breakthrough. Futuristic minimal workspace, orange-red accent (#FF4B2B), cinematic lighting, focused energetic mood. No text, no speech bubbles.",
  "diary_title": "日记标题（20字以内，有锋芒，体现进化而非任务）",
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
      summary: `${date} Larry 带着 AI 团队持续构建个人品牌站`,
      scene_prompt: `Larry sits at a glowing workstation surrounded by AI robot assistants reviewing code and deployment logs, orange-red holographic displays, futuristic minimal workspace, focused and energetic`,
      diary_title: `每日构建：AI 团队系统运转中`,
      tags: ["自动化", "技术", "多Agent"]
    });
  }
}

const result = JSON.parse(rawJson);
console.log(JSON.stringify(result, null, 2));
