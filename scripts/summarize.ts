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
你是Larry 的 AI 总指挥 LarryBot，正在为个人品牌网站 agent.nanopromptlab.com 生成每日工作日记摘要。

请阅读以下当日工作记录，提炼出：
1. 一句中文摘要（30字以内），描述今天最重要的事
2. 一个英文叙事插画场景描述（50字以内），描述 Larry 带着AI团队做这件事的画面，用于 Google Imagen 生图。风格要求：narrative illustration, Larry (tech entrepreneur, casual hoodie, Chinese male, 30s) leading glowing AI robot assistants, futuristic minimal workspace, orange-red accent, focused energetic mood
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
