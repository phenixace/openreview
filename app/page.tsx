"use client";

import { useMemo, useState } from "react";

type OriginKey = "dynasty" | "ordinary" | "wild";
type Method = "manual" | "auto";
type Phase = "training" | "research" | "paper" | "review" | "decision" | "ending";
type SkillKey = "theory" | "engineering" | "writing" | "detection" | "politics";

type Skills = Record<SkillKey, number>;

type PaperMods = {
  quality: number;
  novelty: number;
  rigor: number;
};

type RandomEvent = {
  icon: string;
  title: string;
  body: string;
  effect: string;
  stamina?: number;
  favor?: number;
  reputation?: number;
  mods?: Partial<PaperMods>;
};

type MonthlyActionResult = {
  status: "success" | "failed" | "recovered";
  label: string;
  detail: string;
};

type Paper = {
  id: number;
  title: string;
  topic: string;
  method: Method;
  quality: number;
  novelty: number;
  rigor: number;
  aiSmell: number;
  abstract: string;
  venue: string;
};

type Decision = {
  accepted: boolean;
  probability: number;
  scores: number[];
  review: string;
  areaChair: string;
  poolSize: number;
  autoShare: number;
  acceptedRate: number;
  rankPercentile: number;
  detectedBy: number;
  distribution: number[];
  eliteOverride: boolean;
};

type Ending = {
  icon: string;
  title: string;
  subtitle: string;
  body: string;
  tone: "good" | "mixed" | "bad";
};

const MAX_SEMESTERS = 12;
const TRAINING_MONTHS = 3;

const skillCatalog: Record<
  SkillKey,
  { name: string; short: string; icon: string; description: string }
> = {
  theory: {
    name: "理论基础",
    short: "理论",
    icon: "∑",
    description: "每级提高论文 novelty，更容易看出“旧 idea 新名词”。",
  },
  engineering: {
    name: "实验工程",
    short: "工程",
    icon: "⌘",
    description: "每级提高严谨度，也能识别可疑的过分平滑曲线。",
  },
  writing: {
    name: "论文写作",
    short: "写作",
    icon: "Aa",
    description: "每级提高成品品质，降低 Reviewer #2 的阅读耐心损耗。",
  },
  detection: {
    name: "学术鉴伪",
    short: "鉴伪",
    icon: "⌕",
    description: "更容易发现 AutoResearch 模板、幻觉引用和批量实验痕迹。",
  },
  politics: {
    name: "学术人情",
    short: "人情",
    icon: "♟",
    description: "增加圈内好感，并降低给大组低分后的报复强度。",
  },
};

const randomEvents: RandomEvent[] = [
  {
    icon: "▦",
    title: "GPU 排队系统发生哲学错误",
    body: "你排在自己后面。管理员解释说这是 eventually consistent。",
    effect: "本学期严谨度 −7，精力 −4",
    stamina: -4,
    mods: { rigor: -7 },
  },
  {
    icon: "☕",
    title: "在咖啡机旁偶遇 Area Chair",
    body: "你们讨论天气，全程没有提论文。离开时他问：『你叫什么来着？』",
    effect: "圈内好感 +3，声望 −2",
    favor: 3,
    reputation: -2,
  },
  {
    icon: "↗",
    title: "AutoResearch 发布新版本",
    body: "现在它会自动生成 limitations，并把 limitation 写成未来工作的卖点。",
    effect: "你的 idea 在睡觉时被批量搜索了；Novelty −5",
    mods: { novelty: -5 },
  },
  {
    icon: "⚠",
    title: "数据集许可证突然更新",
    body: "昨天还能商用，今天只能用于『非悲伤目的』。你删掉了半张主表。",
    effect: "品质 −6，严谨度 −5",
    mods: { quality: -6, rigor: -5 },
  },
  {
    icon: "✦",
    title: "组会灵光一现",
    body: "你在导师提问前的 0.7 秒想通了核心 lemma，并假装早就知道。",
    effect: "Novelty +5，精力 −7；导师要求明天给出证明",
    stamina: -7,
    mods: { novelty: 5 },
  },
  {
    icon: "⌁",
    title: "引用机器人深夜关注了你",
    body: "第二天你的 h-index 增加 1，随后平台判定异常引用并给主页加了黄标。",
    effect: "好感 +2，品质 −3",
    favor: 2,
    mods: { quality: -3 },
  },
  {
    icon: "☂",
    title: "小同行抢先挂了 arXiv",
    body: "标题与你的草稿只有三个介词不同。你被迫把贡献从方法改成视角。",
    effect: "Novelty −8，写作经验 +1",
    mods: { novelty: -8, quality: 4 },
  },
  {
    icon: "✓",
    title: "Artifact Evaluation 意外通过",
    body: "复现委员会没有发现你把随机种子命名为 final_final_2。",
    effect: "严谨度 +5，精力 −8；你负责维护代码直到退休",
    stamina: -8,
    reputation: 2,
    mods: { rigor: 5 },
  },
  {
    icon: "✉",
    title: "导师凌晨两点回复：Looks good",
    body: "两分钟后又补了一句：『Maybe rethink the whole framing.』",
    effect: "精力 −4，写作品质 −3",
    stamina: -4,
    mods: { quality: -3 },
  },
  {
    icon: "♨",
    title: "实验室服务器温度达到新 SOTA",
    body: "你们用论文 rebuttal 扇风，发现这可能是本项目最稳定的应用场景。",
    effect: "精力 −7，实验严谨度 −4",
    stamina: -7,
    mods: { rigor: -4 },
  },
  {
    icon: "◉",
    title: "大佬转发了你的预印本",
    body: "只写了一个“Interesting.”。你花了两天分析句号的情感倾向。",
    effect: "好感 +5，声望 +2，Novelty −4；全赛道都看见了",
    favor: 5,
    reputation: 2,
    mods: { novelty: -4 },
  },
  {
    icon: "∞",
    title: "Deadline 延长 48 小时",
    body: "你没有多出 48 小时，只是多熬了两个晚上。",
    effect: "品质 +3，精力 −11",
    stamina: -11,
    mods: { quality: 3 },
  },
  {
    icon: "▣",
    title: "LLM Reviewer 泄露了 system prompt",
    body: "唯一规则是：『如果不确定，请要求更多实验。』社区表示符合预期。",
    effect: "若本月学鉴伪则效果加倍，但精力 −5",
    stamina: -5,
    reputation: 2,
  },
  {
    icon: "♡",
    title: "你认真帮同门改了一篇论文",
    body: "论文中了，作者列表里没有你，但婚礼座位给你安排在主桌。",
    effect: "圈内好感 +5，精力 −9",
    favor: 5,
    stamina: -9,
  },
  {
    icon: "⚖",
    title: "共同一作顺序开始量子叠加",
    body: "提交前你排第一，PDF 里你排第二，组会汇报时大家说『都一样』。",
    effect: "声望 −5，精力 −6",
    reputation: -5,
    stamina: -6,
  },
  {
    icon: "▧",
    title: "Benchmark 被曝测试集污染",
    body: "你的最好结果依然有效，只是现在它证明了模型拥有文件系统。",
    effect: "品质 −8，严谨度 −8",
    mods: { quality: -8, rigor: -8 },
  },
  {
    icon: "¥",
    title: "云算力账单通过了显著性检验",
    body: "p < 0.001，证明你的银行卡余额与实验轮数显著负相关。",
    effect: "精力 −6，后续实验严谨度 −3",
    stamina: -6,
    mods: { rigor: -3 },
  },
  {
    icon: "↺",
    title: "会议临时修改评审表",
    body: "你擅长的三项指标被合并为『整体感觉』，权重由 Reviewer #2 自行理解。",
    effect: "技能加成被随机性部分抵消；品质 −4",
    mods: { quality: -4 },
  },
  {
    icon: "☾",
    title: "实验室停电半天",
    body: "服务器停了，Slack 也停了。你第一次发现窗外存在自然光。",
    effect: "精力 +15，但实验进度归零了一小块；严谨度 −3",
    stamina: 15,
    mods: { rigor: -3 },
  },
  {
    icon: "✚",
    title: "校医院强制你休息三天",
    body: "医生看完你的作息记录，认为这份数据本身就违反科研伦理。",
    effect: "精力 +18，品质 −3；你错过了一次组会",
    stamina: 18,
    mods: { quality: -3 },
  },
  {
    icon: "⊘",
    title: "论文被秒拒，意外省下 rebuttal",
    body: "系统用 14 秒判断主题不符。你获得了原计划用于争辩的完整周末。",
    effect: "精力 +10，声望 −4",
    stamina: 10,
    reputation: -4,
  },
];

const restEvents: RandomEvent[] = [
  {
    icon: "☾",
    title: "你把 Slack 卸载了整整一天",
    body: "第二天重装后有 47 条未读消息，其中 46 条是“收到”。",
    effect: "精力 +20；本月不增加技能",
    stamina: 20,
  },
  {
    icon: "☕",
    title: "导师在你闭眼时发来 Quick Question",
    body: "这个 quick question 有 23 页附件。你礼貌地只看了摘要，然后继续睡。",
    effect: "精力 +7，写作品质 −2；休息勉强成立",
    stamina: 7,
    mods: { quality: -2 },
  },
  {
    icon: "♨",
    title: "校医院判定你需要强制离线",
    body: "医生看完作息记录，认为这份时间序列本身就不符合科研伦理。",
    effect: "精力 +16，圈内好感 −2；你错过了一次无结论组会",
    stamina: 16,
    favor: -2,
  },
  {
    icon: "⊘",
    title: "你睡到自然醒，也睡过了组会",
    body: "导师没有发现，因为导师也没来。大家一致认为会议顺利结束。",
    effect: "精力 +13，声望 −2；本月不增加技能",
    stamina: 13,
    reputation: -2,
  },
  {
    icon: "▤",
    title: "你尝试休假，但自动邮件暴露了休假",
    body: "小同行得知你 24 小时没有提交新实验，立即宣布赛道进入窗口期。",
    effect: "精力 +9，Novelty −3；休息期间 idea 继续贬值",
    stamina: 9,
    mods: { novelty: -3 },
  },
];

const origins = {
  dynasty: {
    name: "学阀世家",
    badge: "简单 · 出生即 SOTA",
    flavor: "家族群里有三位 AC。挂 arXiv 相当于实名投票。",
    favor: 72,
    stamina: 92,
    base: 8,
    arxiv: 12,
    arxivExposure: 0,
    accent: "gold",
  },
  ordinary: {
    name: "普通组",
    badge: "标准 · 学术工薪阶层",
    flavor: "算力要排队，idea 要防撞。挂 arXiv 会吸引小同行。",
    favor: 28,
    stamina: 84,
    base: 0,
    arxiv: -10,
    arxivExposure: 18,
    accent: "teal",
  },
  wild: {
    name: "导师失联",
    badge: "困难 · 单机博士",
    flavor: "导师最后上线于 189 天前。好消息：没人阻止你创新。",
    favor: 8,
    stamina: 74,
    base: -7,
    arxiv: -14,
    arxivExposure: 26,
    accent: "coral",
  },
} as const;

const topics = [
  {
    name: "大模型推理",
    nouns: ["Self-Reflective", "Latent", "Budget-Aware", "Verifier-Guided"],
    objects: ["Reasoning", "Test-Time Search", "Chain-of-Thought", "Deliberation"],
  },
  {
    name: "多模态",
    nouns: ["Omni", "Grounded", "Cross-Modal", "Pixel-Aligned"],
    objects: ["World Models", "Token Fusion", "Embodied Agents", "Visual Reasoning"],
  },
  {
    name: "AI for Science",
    nouns: ["Symmetry-Aware", "Neural", "Foundation", "Diffusion-Based"],
    objects: ["Protein Design", "Weather Forecasting", "Molecule Search", "PDE Solvers"],
  },
  {
    name: "智能体",
    nouns: ["Society-of-Mind", "Tool-Augmented", "Memory-Centric", "Self-Evolving"],
    objects: ["Web Agents", "Research Agents", "Code Agents", "Agentic Workflows"],
  },
  {
    name: "生成模型",
    nouns: ["Rectified", "Consistency", "Autoregressive", "Preference-Aligned"],
    objects: ["Video Synthesis", "Flow Matching", "Image Editing", "World Simulation"],
  },
];

const venues = ["NeurIPS", "ICLR", "ICML", "ACL"];

const rivalTitles = [
  "Benchmarking Benchmarks That Benchmark Other Benchmarks",
  "Scaling Laws for Reviewer Confidence Without Evidence",
  "We Need No Baselines: A Manifesto for Emergent Performance",
  "Rebuttal Is All You Need",
  "Gradient Descent on the Program Committee",
];

const rivalGroups = [
  "隔壁组 · 你们共享一块 A100",
  "同赛道新星 · 上周刚 follow 你",
  "海外豪门实验室 · 匿名但不完全匿名",
  "前同门 · 知道你的每一个 ablation",
];

const aiTechniques = [
  "RLVR",
  "Test-Time Scaling",
  "Flow Matching",
  "Mixture-of-Experts",
  "Retrieval-Augmented Generation",
  "Direct Preference Optimization",
  "Constitutional Decoding",
  "KV-Cache Compression",
  "Speculative Decoding",
  "Latent Diffusion",
  "Neural Operators",
  "Mechanistic Interpretability",
  "Synthetic Data Distillation",
  "Self-Rewarding Models",
  "Process Reward Models",
  "Inference-Time Search",
];

const aiDomains = [
  "Reasoning Agents",
  "Vision-Language Models",
  "World Models",
  "Embodied Foundation Models",
  "Long-Context LLMs",
  "Code Generation",
  "Multimodal Alignment",
  "Scientific Discovery",
  "Video Generation",
  "Protein Language Models",
  "Web Agents",
  "Small Language Models",
  "Agentic RAG",
  "Robotic Manipulation",
];

const aiClaims = [
  "Scaling Without Scaling",
  "The Bitter Lesson, Reheated",
  "Less Compute, More Reviewer Confidence",
  "A Simple Baseline That Requires 512 GPUs",
  "Emergence at the Edge of Significance",
  "No Training Required (Except Pretraining)",
  "One Model to Prompt Them All",
  "Towards Actually General Intelligence",
  "Rethinking the Rethinking",
  "When More Data Is Not Enough but Still Helps",
  "All You Need Is a Better Acronym",
  "A Unified Framework for Everything",
];

const rejectReviewLibrary = [
  "该方法提升 0.8%，过小而没有意义；若提升更大，我又会担心结果不可信。",
  "论文缺少与 Reviewer #2 尚未公开工作的比较。作者应当预见 concurrent work。",
  "Novelty 较低，因为我在阅读后已经能理解这个想法，说明它可能过于显然。",
  "实验过于充分，反而让我怀疑本文主要是 engineering。建议补充理论证明。",
  "理论证明很多，但缺少真实世界部署。建议在至少三个国家上线后再投。",
  "作者选择蓝色作为主曲线，但蓝色通常暗示 baseline。视觉叙事不够严谨。",
  "我没有运行代码，因此无法复现结果。代码看起来可以运行，这一点不足以说服我。",
  "写作非常清晰，可能掩盖了问题本身并不够困难。建议增加一些不必要的符号。",
  "本文引用了 63 篇工作，却遗漏了与本稿最相关的 14 篇匿名审稿人工作。",
  "Motivation 没有 motivate 到我个人。作者需要重新思考问题是否值得解决。",
  "所有 ablation 都支持作者结论，这在统计上显得过于配合。",
  "结果只在公开 benchmark 上有效。建议在一个不存在数据集上验证泛化能力。",
  "我同意其他审稿人的所有观点，尤其是那些目前还没有出现的观点。",
  "该方向很重要，但也正因如此，不应由本文这样一篇具体工作定义。",
  "论文比截止页数少一页。作者显然还有空间补充我想看的实验。",
  "Rebuttal 回答了我的问题，但这改变了论文，因此我只能按原版继续拒绝。",
  "方法性能优于 SOTA，但没有解释 SOTA 为什么愿意被它超过。",
  "置信度：5。理由：我对自己的困惑非常有信心。",
];

const acceptReviewLibrary = [
  "方法扎实，实验完整。虽然不是我的方法，但我努力克服了这一点。",
  "这篇论文回答了一个真实问题，并且罕见地没有把更多算力写成理论贡献。",
  "作者的 rebuttal 很有说服力，尤其是连续 11 次感谢审稿人的部分。",
  "我尝试寻找致命缺陷，但 deadline 先到了。倾向接收。",
  "结果令人信服，代码似乎也存在。对于本会议而言已经属于超额完成。",
];

const rejectReviewEasterEggs = [
  {
    id: "cite-me",
    text: "你的论文和我的工作很像，但你还没有引用我的论文。虽然双盲使你理论上不知道我是谁，我仍认为这体现了 related work 不充分，因此拒稿。",
    acEcho: "Reviewer #2 指出了一个无法在双盲阶段具体说明、但显然非常重要的引用缺失。建议作者自行领会。",
  },
  {
    id: "out-of-scope",
    text: "我觉得这篇文章 out of scope。虽然它与征稿启事中的前三个关键词完全一致，但与我个人理解的 scope 不一致。",
    acEcho: "关于 scope，评审意见存在分歧。考虑到 Reviewer #2 使用了英文短语，委员会认为其判断较为专业。",
  },
  {
    id: "llm-chaos",
    text: "本文没有讨论量子引力对 token 熵的影响，也缺少在水下机器人、古典诗歌和 8-bit 蛋白质上的消融。建议作者证明梯度在非欧几里得星期二收敛。",
    acEcho: "Reviewer #2 提出了富有前瞻性的跨领域问题。虽然部分建议难以解析，作者仍应认真补充水下、诗歌与星期二实验。",
  },
  {
    id: "temperature-zero",
    text: "你所有 LLM 实验的 temperature 都设为 0。我觉得这不对：temperature=0 意味着模型没有创造力，也意味着实验过度可复现。Instant reject。",
    acEcho: "委员会同意 temperature 是大模型的灵魂。作者未探索灵魂温度，构成方法学上的重大缺失。",
  },
];

const arxivReviewEasterEgg = {
  id: "compare-yourself",
  text: "我在 arXiv 上确认了作者身份。我觉得这篇工作和你之前的研究方向不一致：为什么不对比你自己之前的工作？这种不连续性令人担忧。",
  acEcho: "Reviewer #2 基于公开预印本进行了额外尽调。虽然这削弱了匿名性，但增强了委员会的故事连续性判断。",
};

const reviewCopy: Record<number, string> = {
  2: "作者声称“显著提升”，但我个人没有被显著打动。建议补 17 个数据集。",
  4: "工作具有一定意义。优点是完整，缺点是和我没发表的 idea 有点像。",
  6: "方法扎实、实验充分。我愿意让它占用一个宝贵名额。",
  8: "这是本轮少见的清晰工作。虽然会挤压我自己的录用率，我仍给高分。",
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function skillBonus(level: number) {
  return Math.floor(Math.sqrt(level) * 3);
}

function trainingSuccessChance(level: number, stamina: number, haiyouMode: boolean) {
  if (level >= 8) return 0;
  const fatiguePenalty = stamina < 25 ? 24 : stamina < 50 ? 13 : stamina < 75 ? 6 : 0;
  return clamp(72 - level * 7 - fatiguePenalty - (haiyouMode ? 9 : 0), 18, 76);
}

const trainingFailureReasons = [
  "你看完了全部课程，但只记住老师说“这个很 straightforward”。",
  "实验跑通了，技能点却被环境依赖截胡。",
  "你认真做了笔记，第二天发现笔记总结的是另一个领域。",
  "课程证书已到账，知识仍在分布式系统中 eventual consistency。",
  "本月努力通过了形式审查，没有通过能力审查。",
] as const;

function isAdverseEvent(event: RandomEvent) {
  return (
    (event.stamina ?? 0) < 0 ||
    (event.reputation ?? 0) < 0 ||
    (event.mods?.quality ?? 0) < 0 ||
    (event.mods?.novelty ?? 0) < 0 ||
    (event.mods?.rigor ?? 0) < 0
  );
}

function statWord(value: number, kind: "quality" | "novelty" | "rigor") {
  if (value >= 86) {
    return kind === "novelty" ? "像真的新东西" : kind === "rigor" ? "审稿人找不到针眼" : "可以写进组史";
  }
  if (value >= 70) {
    return kind === "novelty" ? "有一点灵光" : kind === "rigor" ? "基本经得起追问" : "像一篇正常论文";
  }
  if (value >= 52) {
    return kind === "novelty" ? "换了三个名词" : kind === "rigor" ? "误差棒正在路上" : "rebuttal 还有救";
  }
  return kind === "novelty" ? "与去年工作高度相似" : kind === "rigor" ? "消融实验失踪" : "适合放在 future work";
}

function makePaper(method: Method, semester: number, skills: Skills, mods: PaperMods): Paper {
  const topic = pick(topics);
  const prefix = pick(topic.nouns);
  const object = pick(topic.objects);
  const quality = clamp(
    (method === "manual" ? randomInt(46, 86) : randomInt(26, 84)) + skillBonus(skills.writing) + mods.quality,
    1,
    100,
  );
  const novelty = clamp(
    (method === "manual" ? randomInt(38, 84) : randomInt(28, 96)) + skillBonus(skills.theory) + mods.novelty,
    1,
    100,
  );
  const rigor = clamp(
    (method === "manual" ? randomInt(52, 90) : randomInt(18, 72)) + skillBonus(skills.engineering) + mods.rigor,
    1,
    100,
  );
  const aiSmell = method === "manual" ? randomInt(2, 20) : randomInt(58, 99);
  const technique = pick(aiTechniques);
  const domain = pick(aiDomains);
  const claim = pick(aiClaims);
  const title = pick([
    `${prefix} ${object}: ${claim}`,
    `${technique} Meets ${domain}: ${claim}`,
    `Do ${domain} Really Need ${technique}?`,
    `${claim}: ${technique} for ${domain}`,
    `Beyond ${technique}: ${prefix} ${domain}`,
    `${domain} Are Secretly ${object}`,
    `Scaling ${technique} with ${prefix} ${object}`,
    `On the Surprising Ineffectiveness of ${technique} for ${domain}`,
  ]);

  const manualAbstract = `我们从一个不方便写进摘要的问题出发，提出 ${prefix} ${object}。在 ${randomInt(
    4,
    11,
  )} 个基准上进行了完整对照，并报告失败案例。结果显示：努力不一定有用，但至少误差棒是对的。`;
  const autoAbstract = `AutoResearch 在凌晨 03:17 自主发现 ${prefix} ${object}，随后引用了 ${randomInt(
    31,
    94,
  )} 篇论文，其中 ${randomInt(2, 9)} 篇可能不存在。实验曲线非常平滑，平滑得令人不安。`;

  return {
    id: Date.now(),
    title,
    topic: topic.name,
    method,
    quality,
    novelty,
    rigor,
    aiSmell,
    abstract: method === "manual" ? manualAbstract : autoAbstract,
    venue: `${pick(venues)} 20${27 + Math.floor(semester / 2)}`,
  };
}

function getEnding(accepts: number, favor: number, stamina: number, reputation: number): Ending {
  if (accepts < 3 && accepts === 0) {
    return {
      icon: "🛒",
      title: "找不到工作，流落街头",
      subtitle: "ENDING 00 · Reviewer #2 仍然认为你缺少实验",
      body: "十二个学期，零篇录用。你把办公椅改造成了购物车，并在天桥下继续回复审稿意见。",
      tone: "bad",
    };
  }
  if (accepts < 3) {
    return {
      icon: "🚰",
      title: "延毕：组里饮水机大师兄",
      subtitle: "ENDING 02 · Facility Management Track",
      body: `你以 ${accepts}/3 篇录用留校再战。你熟悉每台服务器的脾气，也知道饮水机换桶的最佳实践。`,
      tone: "mixed",
    };
  }
  if (accepts >= 5 && reputation >= 68) {
    return {
      icon: "🏆",
      title: "进大厂，成为人生赢家",
      subtitle: "ENDING S · Staff Researcher（审批中）",
      body: "你的论文数和人脉形成了正反馈。入职第一天，老板让你把 AutoResearch 接进季度 OKR。",
      tone: "good",
    };
  }
  if (accepts >= 4 && favor >= 72) {
    return {
      icon: "✈️",
      title: "海优回国",
      subtitle: "ENDING A · 青年人才答辩限定版",
      body: "你带着四篇论文、三封推荐信和一张延迟报销的机票回国，开始评审下一代博士生。",
      tone: "good",
    };
  }
  if (stamina <= 14) {
    return {
      icon: "📦",
      title: "毕业了，但找不到工作",
      subtitle: "ENDING C− · 精神状态 under review",
      body: "三篇录用刚好换来学位，却没剩下力气准备面试。你暂住实验室，把学位帽当枕头。",
      tone: "bad",
    };
  }
  return {
    icon: "💼",
    title: "顺利毕业，进小厂打工",
    subtitle: "ENDING B · Applied Scientist（大小周）",
    body: "你按时交了论文、论文也按时交了你。公司承诺不让你写 rebuttal，只让你写周报。",
    tone: "good",
  };
}

function getExhaustionEnding(accepts: number): Ending {
  return {
    icon: "🔌",
    title: "精力归零：已从学术系统断开",
    subtitle: "ENDING E · Connection reset by peer review",
    body:
      accepts === 2
        ? "你离毕业只差一篇，离床只差三步。系统把你的长期离线状态识别为主动退学。"
        : `你带着 ${accepts}/3 篇录用退出实验室。导师在三个月后回复：Take care, and minor comments attached.`,
    tone: "bad",
  };
}

function getHaiyouEnding(accepts: number): Ending {
  if (accepts >= 10) {
    return {
      icon: "🌏",
      title: "十篇达成：海优回国",
      subtitle: "ENDING S+ · 材料已进入校内第七轮审核",
      body: "你用十篇录用证明了自己能在随机系统里稳定抽中。回国答辩时，专家问的第一个问题是：年龄是否刚好超线。",
      tone: "good",
    };
  }
  return {
    icon: "🧳",
    title: "海优未达标：全球博后巡回赛",
    subtitle: "ENDING H− · Next stop: another fixed-term contract",
    body: `你已有 ${accepts} 篇录用，足够博士毕业，却还差 ${10 - accepts} 篇够到海优线。你拖着行李去下一站继续刷新随机种子。`,
    tone: "mixed",
  };
}

export default function Home() {
  const [originKey, setOriginKey] = useState<OriginKey>("ordinary");
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<Phase>("training");
  const [semester, setSemester] = useState(1);
  const [targetAccepts, setTargetAccepts] = useState<3 | 10>(3);
  const [trainingMonth, setTrainingMonth] = useState(1);
  const [skills, setSkills] = useState<Skills>({
    theory: 0,
    engineering: 1,
    writing: 0,
    detection: 0,
    politics: 0,
  });
  const [paperMods, setPaperMods] = useState<PaperMods>({ quality: 0, novelty: 0, rigor: 0 });
  const [currentEvent, setCurrentEvent] = useState<RandomEvent | null>(null);
  const [monthlyActionResult, setMonthlyActionResult] = useState<MonthlyActionResult | null>(null);
  const [accepts, setAccepts] = useState(0);
  const [favor, setFavor] = useState<number>(origins.ordinary.favor);
  const [stamina, setStamina] = useState<number>(origins.ordinary.stamina);
  const [reputation, setReputation] = useState(20);
  const [paper, setPaper] = useState<Paper | null>(null);
  const [arxiv, setArxiv] = useState(false);
  const [bid, setBid] = useState(false);
  const [reviewScore, setReviewScore] = useState<number | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [ending, setEnding] = useState<Ending | null>(null);
  const [submitted, setSubmitted] = useState(0);
  const [retaliation, setRetaliation] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "系统提示：匿名评审是一种大家都猜得到但不能说的匿名。",
  ]);

  const origin = origins[originKey];
  const year = Math.ceil(semester / 2);
  const canBid = favor >= 55;
  const haiyouMode = targetAccepts === 10;
  const maxSemesters = haiyouMode ? 24 : MAX_SEMESTERS;
  const autoShare = clamp(18 + (semester - 1) * 6 + (haiyouMode ? 12 : 0), 18, haiyouMode ? 94 : 84);
  const poolSize = 4200 + semester * 1450 + Math.round(autoShare * 37) + (haiyouMode ? 7600 : 0);
  const rival = useMemo(
    () => {
      const isAuto = randomInt(1, 100) <= autoShare;
      const isBigLab = randomInt(1, 100) <= 34;
      const detectability = randomInt(38, 94);
      const detectionPower =
        skills.detection * 17 + skills.engineering * 4 + skills.writing * 2 + randomInt(0, 42);
      return {
        title: pick(rivalTitles),
        group: isBigLab ? "大组匿名投稿 · 作者列表打码后仍占两行" : pick(rivalGroups),
        quality: randomInt(42, 92),
        confidence: randomInt(2, 5),
        improvement: randomInt(2, 9),
        isAuto,
        isBigLab,
        detectability,
        detected: isAuto && detectionPower >= detectability,
        suspicion: isAuto ? clamp(detectionPower - detectability + 55, 12, 99) : randomInt(3, 31),
      };
    },
    [submitted, autoShare, skills.detection, skills.engineering, skills.writing],
  );

  const startGame = () => {
    const selected = origins[originKey];
    setFavor(selected.favor);
    setStamina(selected.stamina);
    setReputation(originKey === "dynasty" ? 44 : originKey === "wild" ? 8 : 20);
    setSkills(
      originKey === "dynasty"
        ? { theory: 0, engineering: 0, writing: 1, detection: 1, politics: 3 }
        : originKey === "wild"
          ? { theory: 2, engineering: 0, writing: 0, detection: 1, politics: 0 }
          : { theory: 0, engineering: 2, writing: 1, detection: 0, politics: 0 },
    );
    setStarted(true);
    setPhase("training");
    setCurrentEvent(null);
    setMonthlyActionResult(null);
    setLogs([`你以「${selected.name}」身份注册 PeerReview。毕业要求：3 篇录用。`]);
  };

  const addLog = (message: string) => {
    setLogs((current) => [message, ...current].slice(0, 8));
  };

  const applyMonthlyEvent = (event: RandomEvent, baseStaminaChange = 0) => {
    setStamina((value) => clamp(value + baseStaminaChange + (event.stamina ?? 0), 0, 100));
    if (event.favor) setFavor((value) => clamp(value + event.favor!, 0, 100));
    if (event.reputation) setReputation((value) => clamp(value + event.reputation!, 0, 100));
    if (event.mods) {
      setPaperMods((value) => ({
        quality: value.quality + (event.mods?.quality ?? 0),
        novelty: value.novelty + (event.mods?.novelty ?? 0),
        rigor: value.rigor + (event.mods?.rigor ?? 0),
      }));
    }
  };

  const trainSkill = (key: SkillKey) => {
    if (currentEvent || skills[key] >= 8) return;
    const adverseEvents = randomEvents.filter(isAdverseEvent);
    const recoveryEvents = randomEvents.filter((event) => (event.stamina ?? 0) > 0);
    const event =
      randomInt(1, 100) <= (haiyouMode ? 86 : 76)
        ? pick(adverseEvents)
        : randomInt(1, 100) <= 38
          ? pick(recoveryEvents)
          : pick(randomEvents);
    const skill = skillCatalog[key];
    const successChance = trainingSuccessChance(skills[key], stamina, haiyouMode);
    const succeeded = randomInt(1, 100) <= successChance;
    const gainedLevels = succeeded && event.title.includes("system prompt") && key === "detection" ? 2 : succeeded ? 1 : 0;
    if (gainedLevels > 0) {
      setSkills((value) => ({
        ...value,
        [key]: clamp(value[key] + gainedLevels, 0, 8),
      }));
      if (key === "politics") setFavor((value) => clamp(value + 2, 0, 100));
      setMonthlyActionResult({
        status: "success",
        label: `进修成功 · ${skill.name} +${gainedLevels}`,
        detail: `本月成功率 ${successChance}%。知识暂时同意留在你的脑子里。`,
      });
    } else {
      setMonthlyActionResult({
        status: "failed",
        label: `进修失败 · ${skill.name} +0`,
        detail: `${pick(trainingFailureReasons)}（本月成功率 ${successChance}%）`,
      });
    }
    applyMonthlyEvent(event, -4);
    setCurrentEvent(event);
    addLog(
      `第 ${semester} 学期 · ${trainingMonth} 月：进修「${skill.name}」${succeeded ? `成功 +${gainedLevels}` : "失败 +0"}，并触发「${event.title}」。`,
    );
  };

  const restMonth = () => {
    if (currentEvent) return;
    const event = pick(restEvents);
    const recovered = event.stamina ?? 0;
    applyMonthlyEvent(event);
    setMonthlyActionResult({
      status: "recovered",
      label: `休整完成 · 精力 +${recovered}`,
      detail: "本月不增加任何技能。学术系统将你的睡眠记录为低产出。",
    });
    setCurrentEvent(event);
    addLog(`第 ${semester} 学期 · ${trainingMonth} 月：选择休整，恢复 ${recovered} 点精力，触发「${event.title}」。`);
  };

  const continueMonth = () => {
    setCurrentEvent(null);
    setMonthlyActionResult(null);
    if (stamina <= 0) {
      setEnding(getExhaustionEnding(accepts));
      setPhase("ending");
      addLog("精力归零。你没有提交下一份论文，而是提交了门禁卡。");
      return;
    }
    if (trainingMonth >= TRAINING_MONTHS) {
      setPhase("research");
      return;
    }
    setTrainingMonth((value) => value + 1);
  };

  const doResearch = (method: Method) => {
    const nextPaper = makePaper(method, semester, skills, paperMods);
    const nextStamina = clamp(stamina - (method === "manual" ? 20 : 9), 0, 100);
    setPaper(nextPaper);
    setArxiv(false);
    setBid(false);
    setPhase("paper");
    setStamina(nextStamina);
    setReputation((value) => clamp(value + (method === "manual" ? 5 : -1), 0, 100));
    addLog(
      method === "manual"
        ? `第 ${semester} 学期：你亲手做完实验，咖啡机获得共同一作。`
        : `第 ${semester} 学期：AutoResearch 用 11 分钟完成了选题、实验和自我感动。`,
    );
    if (nextStamina <= 0) {
      setEnding(getExhaustionEnding(accepts));
      setPhase("ending");
      addLog("论文还没写完，你先写完了退学申请。");
    }
  };

  const submitPaper = () => {
    if (!paper) return;
    const reviewCost = 6 + Math.floor(autoShare / 24) + (haiyouMode ? 5 : 0);
    const nextStamina = clamp(stamina - reviewCost, 0, 100);
    setStamina(nextStamina);
    if (nextStamina <= 0) {
      setEnding(getExhaustionEnding(accepts));
      setPhase("ending");
      addLog(`本轮暴涨的审稿负担消耗了 ${reviewCost} 点精力。你倒在了 conflict 表格前。`);
      return;
    }
    if (bid && !canBid) setBid(false);
    if (bid) setFavor((value) => clamp(value - 18, 0, 100));
    setSubmitted((value) => value + 1);
    setReviewScore(null);
    setPhase("review");
    addLog(
      `${paper.venue} 投稿完成${arxiv ? "，并同步挂上 arXiv" : ""}${bid ? "，还请熟人 bid 了" : ""}。`,
    );
  };

  const calculateDecision = () => {
    if (!paper || reviewScore === null) return;
    const quotaEffect = reviewScore >= 8 ? -10 : reviewScore >= 6 ? -5 : reviewScore <= 2 ? 7 : 2;
    const arxivEffect = arxiv ? origin.arxiv : 0;
    const arxivExposureRisk = arxiv && originKey !== "dynasty" ? origin.arxivExposure : 0;
    const bidEffect = bid ? 16 : 0;
    const reviewerDetectionChance = clamp(
      paper.aiSmell - 34 + autoShare * 0.16 + arxivExposureRisk,
      2,
      95,
    );
    const detectedBy = [0, 1, 2].filter(() => randomInt(1, 100) <= reviewerDetectionChance).length;
    const smellPenalty = detectedBy * -8;
    const composite =
      paper.quality * 0.35 +
      paper.novelty * 0.29 +
      paper.rigor * 0.25 +
      origin.base +
      arxivEffect +
      bidEffect +
      quotaEffect +
      smellPenalty -
      retaliation;
    const rankPercentile = clamp(
      Math.round(104 - composite + autoShare * 0.09 + (haiyouMode ? 11 : 0) + randomInt(-15, 16)),
      1,
      99,
    );
    const acceptedRate = haiyouMode ? randomInt(22, 27) : randomInt(28, 32);
    const nearCutoff = rankPercentile <= acceptedRate + 14;
    const strictTop = rankPercentile <= acceptedRate;
    const eliteRescue = originKey === "dynasty" ? (haiyouMode ? 6 : 10) : 0;
    const fuzzyProbability = strictTop ? (haiyouMode ? 36 : 48) : nearCutoff ? (haiyouMode ? 11 : 18) : 3;
    const probability = clamp(
      fuzzyProbability +
        eliteRescue +
        bidEffect * 0.35 +
        (paper.quality - 65) * 0.15 -
        detectedBy * 5 -
        arxivExposureRisk * 0.45 -
        retaliation * 0.7 +
        randomInt(-9, 5),
      3,
      haiyouMode ? 68 : 82,
    );
    const accepted = randomInt(1, 100) <= probability;
    const centerBase = Math.round(composite / 13);
    const center = clamp(centerBase + randomInt(-1, 1), 2, 9);
    const scores = [
      clamp(center + randomInt(-2, 1), 1, 10),
      clamp(center + randomInt(-1, 2), 1, 10),
      clamp(center + randomInt(-2, 2), 1, 10),
    ];
    const eliteOverride =
      accepted && originKey === "dynasty" && (rankPercentile > acceptedRate || scores.reduce((a, b) => a + b, 0) / 3 < 5);
    const distribution = [
      Math.round(10 + autoShare * 0.12),
      Math.round(17 + autoShare * 0.08),
      Math.round(27 + autoShare * 0.04),
      Math.round(25 - autoShare * 0.06),
      Math.round(21 - autoShare * 0.18),
    ];

    const contextualReviews = [
      ...(detectedBy >= 2
        ? [`该稿件被 ${detectedBy}/3 位审稿人判定为疑似 AutoResearch 产物。文字流畅，但有一种 token 预算充足的美。`]
        : []),
      ...(arxiv && originKey !== "dynasty"
        ? [
            `公开预印本使匿名性近似失效：暴露风险 +${arxivExposureRisk}%。我碰巧在 arXiv 看过，也碰巧与作者在同一条赛道。`,
          ]
        : []),
      ...(retaliation > 0
        ? ["本文技术上没有明显问题，但社区中有可信消息认为作者需要先学习如何尊重领域传统。"]
        : []),
      ...(eliteOverride
        ? ["分数偏低。Area Chair 提醒我们应当关注作者团队的长期贡献与潜在影响。"]
        : []),
    ];
    const reviewPool = accepted
      ? [...acceptReviewLibrary, ...contextualReviews]
      : [...rejectReviewLibrary, ...contextualReviews];
    const selectedEasterEgg = !accepted
      ? arxiv && randomInt(1, 100) <= 42
        ? arxivReviewEasterEgg
        : randomInt(1, 100) <= 34
          ? pick(rejectReviewEasterEggs)
          : null
      : null;
    const review = `Reviewer #2：${selectedEasterEgg?.text ?? pick(reviewPool)}`;
    const areaChair =
      selectedEasterEgg?.acEcho ??
      (accepted
        ? eliteOverride
          ? "虽然未进入分数 Top 30%，但该团队在本领域有持续影响力。经酌情讨论，建议录用。"
          : "分数存在争议，但模糊录用带允许少量随机游走。作者本轮幸运地走进了会场。"
        : strictTop
          ? "该稿件位于分数 Top 30% 附近，但受到领域平衡、随机性与不可见因素影响，建议拒稿。"
          : "综合考虑评审意见与本年度玄学波动，建议作者下一轮继续为社区做贡献。");

    setDecision({
      accepted,
      probability: Math.round(probability),
      scores,
      review,
      areaChair,
      poolSize,
      autoShare,
      acceptedRate,
      rankPercentile,
      detectedBy,
      distribution,
      eliteOverride,
    });
    setPhase("decision");
    setFavor((value) =>
      clamp(value + (reviewScore >= 8 ? 12 : reviewScore >= 6 ? 7 : reviewScore <= 2 ? -13 : -5), 0, 100),
    );
    setReputation((value) =>
      clamp(value + (accepted ? 12 : -3) + (reviewScore >= 6 ? 3 : -2), 0, 100),
    );
    if (accepted) setAccepts((value) => value + 1);
    if (rival.isBigLab && reviewScore <= 4) {
      const revenge = clamp(randomInt(10, 24) - Math.floor(skills.politics * 1.5), 3, 24);
      setRetaliation((value) => clamp(value + revenge, 0, 40));
      addLog(`你给大组论文打了 ${reviewScore} 分。匿名大佬记住了你的写作习惯：后续投稿隐藏惩罚 +${revenge}。`);
    }
    addLog(
      `${paper.venue} 决议：${accepted ? "ACCEPT" : "REJECT"}；投稿 ${poolSize.toLocaleString()} 篇，名义录用率 ${acceptedRate}%。`,
    );
  };

  const advanceSemester = (enteringHaiyou = haiyouMode) => {
    setSemester((value) => value + 1);
    setStamina((value) => clamp(value + (enteringHaiyou ? 8 : 13), 0, 100));
    setRetaliation((value) => clamp(value - (enteringHaiyou ? 1 : 3), 0, 40));
    setTrainingMonth(1);
    setPaperMods({ quality: 0, novelty: 0, rigor: 0 });
    setCurrentEvent(null);
    setMonthlyActionResult(null);
    setPaper(null);
    setDecision(null);
    setReviewScore(null);
    setArxiv(false);
    setBid(false);
    setPhase("training");
    addLog(
      enteringHaiyou
        ? "海优加压阶段：短暂休整只恢复 8 点精力，投稿池和审稿负担继续扩大。"
        : "固定事件：学期结束，学校强制关闭实验室两天。精力 +13。",
    );
  };

  const finishCurrentPath = () => {
    setEnding(haiyouMode ? getHaiyouEnding(accepts) : getEnding(accepts, favor, stamina, reputation));
    setPhase("ending");
  };

  const challengeHaiyou = () => {
    setTargetAccepts(10);
    addLog("你已满足博士毕业线，却选择暂不结算，开启海优加压模式：目标 10 篇。");
    advanceSemester(true);
  };

  const continueGame = () => {
    const newAccepts = accepts;
    if (stamina <= 0) {
      setEnding(getExhaustionEnding(newAccepts));
      setPhase("ending");
      return;
    }
    if (newAccepts >= targetAccepts || semester >= maxSemesters) {
      setEnding(haiyouMode ? getHaiyouEnding(newAccepts) : getEnding(newAccepts, favor, stamina, reputation));
      setPhase("ending");
      return;
    }
    advanceSemester();
  };

  const resetGame = () => {
    setStarted(false);
    setPhase("training");
    setSemester(1);
    setTargetAccepts(3);
    setTrainingMonth(1);
    setSkills({ theory: 0, engineering: 1, writing: 0, detection: 0, politics: 0 });
    setPaperMods({ quality: 0, novelty: 0, rigor: 0 });
    setCurrentEvent(null);
    setMonthlyActionResult(null);
    setAccepts(0);
    setSubmitted(0);
    setPaper(null);
    setDecision(null);
    setEnding(null);
    setRetaliation(0);
    setOriginKey("ordinary");
    setFavor(origins.ordinary.favor);
    setStamina(origins.ordinary.stamina);
    setReputation(20);
    setLogs(["系统提示：匿名评审是一种大家都猜得到但不能说的匿名。"]);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="PeerReview 首页">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span className="brand-name">PeerReview</span>
          <span className="beta">BETA</span>
        </div>
        <nav className="topnav" aria-label="主导航">
          <button className="nav-item active" type="button"><span>▤</span> 投稿</button>
          <button className="nav-item" type="button"><span>◇</span> 评审</button>
          <button className="nav-item" type="button"><span>◌</span> 讨论</button>
          <button className="nav-item" type="button"><span>⚑</span> 八卦</button>
        </nav>
        <div className="deadline">
          <span className="pulse-dot" />
          距离 deadline：<strong>{Math.max(0, maxSemesters - semester)} 个学期</strong>
        </div>
        <div className="avatar" aria-label="匿名博士生">匿</div>
      </header>

      <div className="conference-strip">
        <div>
          <span className="eyebrow">NEURAL INFORMATION PROCESSING SYSTEMS · PARODY EDITION</span>
          <h1>PhD Survival Track</h1>
        </div>
        <div className="conference-meta">
          <span>本轮投稿池 {poolSize.toLocaleString()} 篇 · AutoResearch {autoShare}%</span>
          <span className="status-pill">
            {started ? `${haiyouMode ? "HAIYOU MODE · " : ""}Year ${year} · Semester ${semester}` : "PROFILE SETUP"}
          </span>
        </div>
      </div>

      <main className={`workspace ${!started ? "setup-workspace" : ""}`}>
        <aside className="sidebar">
          <section className="profile-card">
            <div className="profile-top">
              <div className="profile-avatar">PhD</div>
              <div>
                <strong>{started ? origin.name : "Anonymous Student"}</strong>
                <span>{started ? origin.badge : "身份尚未验证"}</span>
              </div>
            </div>
            <div className="graduation-ring" style={{ "--progress": `${Math.min(accepts / targetAccepts, 1) * 360}deg` } as React.CSSProperties}>
              <div><strong>{accepts}</strong><span>/ {targetAccepts}</span></div>
            </div>
            <p className="ring-label">{haiyouMode ? "海优论文进度 · 难度已提升" : "毕业录用进度"}</p>
          </section>

          <section className="side-section">
            <h2>学术生命体征</h2>
            <Metric label="精力值" value={stamina} tone="coral" />
            <Metric label="圈内好感" value={favor} tone="teal" />
            <Metric label="学术声望" value={reputation} tone="gold" />
            {retaliation > 0 && <Metric label="大佬凝视" value={retaliation * 2.5} tone="coral" />}
          </section>

          <section className="side-section skill-sidebar">
            <h2>技能树</h2>
            {(Object.keys(skillCatalog) as SkillKey[]).map((key) => (
              <div className="skill-mini" key={key}>
                <span>{skillCatalog[key].short}</span>
                <div>
                  {Array.from({ length: 5 }, (_, index) => (
                    <i key={index} className={skills[key] > index ? "filled" : ""} />
                  ))}
                </div>
                <b>Lv.{skills[key]}</b>
              </div>
            ))}
          </section>

          <section className="side-section">
            <h2>{haiyouMode ? "海优里程碑" : "毕业清单"}</h2>
            <ul className="checklist">
              {(haiyouMode ? [3, 5, 10] : [1, 2, 3]).map((milestone) => (
                <li key={milestone} className={accepts >= milestone ? "done" : ""}>
                  <span>{accepts >= milestone ? "✓" : milestone}</span>
                  {haiyouMode && milestone === 3 ? "博士毕业资格" : milestone === 10 ? "海优申请线" : `顶会论文 × ${milestone}`}
                </li>
              ))}
            </ul>
          </section>

          <div className="satire-note">
            <span>DISCLAIMER</span>
            本游戏纯属虚构。如有雷同，说明评审系统运行正常。
          </div>
        </aside>

        <section className="main-panel">
          {!started && (
            <div className="setup-card">
              <div className="setup-heading">
                <span className="kicker">NEW GAME · 身世抽卡，但允许重抽</span>
                <h2>请选择你的学术出生点</h2>
                <p>你有 12 个学期。至少中三篇顶会，才能离开这个页面。</p>
              </div>
              <div className="origin-grid">
                {(Object.keys(origins) as OriginKey[]).map((key) => {
                  const item = origins[key];
                  return (
                    <button
                      type="button"
                      key={key}
                      className={`origin-card ${item.accent} ${originKey === key ? "selected" : ""}`}
                      onClick={() => setOriginKey(key)}
                      aria-pressed={originKey === key}
                    >
                      <span className="origin-radio">{originKey === key ? "●" : "○"}</span>
                      <strong>{item.name}</strong>
                      <small>{item.badge}</small>
                      <p>{item.flavor}</p>
                      <div className="origin-stats">
                        <span>初始人脉 <b>{item.favor}</b></span>
                        <span>投稿修正 <b>{item.base >= 0 ? "+" : ""}{item.base}%</b></span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button className="primary large" type="button" onClick={startGame}>
                注册账号并开始受苦 <span>→</span>
              </button>
            </div>
          )}

          {started && phase === "research" && (
            <div className="phase-card">
              <PhaseHeader
                step="01 / RESEARCH"
                title={`第 ${semester} 学期：做点研究`}
                description="选择一种可靠的生产关系。品质、novelty 和严谨度由模板与概率共同负责。"
              />
              <div className="semester-buffs">
                <span>技能边际递减后的本学期修正</span>
                <b>品质 {paperMods.quality + skillBonus(skills.writing) >= 0 ? "+" : ""}{paperMods.quality + skillBonus(skills.writing)}</b>
                <b>Novelty {paperMods.novelty + skillBonus(skills.theory) >= 0 ? "+" : ""}{paperMods.novelty + skillBonus(skills.theory)}</b>
                <b>严谨度 {paperMods.rigor + skillBonus(skills.engineering) >= 0 ? "+" : ""}{paperMods.rigor + skillBonus(skills.engineering)}</b>
              </div>
              <div className="method-grid">
                <button className="method-card manual" type="button" onClick={() => doResearch("manual")}>
                  <div className="method-icon">✎</div>
                  <div className="method-title">
                    <span>路线 A</span>
                    <h3>自己认真做</h3>
                  </div>
                  <p>读论文、跑实验、怀疑人生。慢，但 reviewer 比较难抓到不存在的引用。</p>
                  <ul>
                    <li><b>高</b> 严谨度与稳定品质</li>
                    <li><b>−20</b> 精力值</li>
                    <li><b>+5</b> 学术声望</li>
                  </ul>
                  <span className="method-cta">熬夜六个月 →</span>
                </button>
                <button className="method-card auto" type="button" onClick={() => doResearch("auto")}>
                  <div className="terminal-bar"><i /><i /><i /><span>autoresearch.sh</span></div>
                  <div className="method-icon bot">⌁</div>
                  <div className="method-title">
                    <span>路线 B</span>
                    <h3>启动 AutoResearch</h3>
                  </div>
                  <p>从选题到 rebuttal 全自动。产出极快，质量分布像 loss curve 一样不可解释。</p>
                  <ul>
                    <li><b>极高方差</b> novelty</li>
                    <li><b>−9</b> 精力值</li>
                    <li><b>+?</b> 幻觉引用</li>
                  </ul>
                  <span className="method-cta">运行 11 分钟 →</span>
                </button>
              </div>
              <div className="probability-footnote">
                <span>概率披露</span>
                认真做不保证中稿，AutoResearch 也不保证翻车。系统只保证你会再投一次。
              </div>
            </div>
          )}

          {started && phase === "training" && (
            <div className="phase-card">
              <PhaseHeader
                step={`MONTH ${trainingMonth} / ${TRAINING_MONTHS} · SKILL PHASE`}
                title={`第 ${semester} 学期 · ${trainingMonth} 月行动`}
                description="每月可尝试进修一项技能，或放弃成长换取精力。进修可能失败，随机事件不会缺席。"
              />
              {!currentEvent ? (
                <>
                  <div className="month-roadmap" aria-label="本学期月份进度">
                    {Array.from({ length: TRAINING_MONTHS }, (_, index) => (
                      <div
                        className={trainingMonth > index + 1 ? "done" : trainingMonth === index + 1 ? "active" : ""}
                        key={index}
                      >
                        <span>{trainingMonth > index + 1 ? "✓" : index + 1}</span>
                        <b>{index + 1} 月</b>
                      </div>
                    ))}
                  </div>
                  <div className="skill-grid">
                    {(Object.keys(skillCatalog) as SkillKey[]).map((key) => {
                      const item = skillCatalog[key];
                      const successChance = trainingSuccessChance(skills[key], stamina, haiyouMode);
                      const maxed = skills[key] >= 8;
                      return (
                        <button
                          type="button"
                          className="skill-card"
                          disabled={maxed}
                          key={key}
                          onClick={() => trainSkill(key)}
                        >
                          <span className="skill-icon">{item.icon}</span>
                          <span className="skill-copy">
                            <small>CURRENT · LV.{skills[key]} · COST 4 ENERGY</small>
                            <strong>{item.name}</strong>
                            <p>{item.description}</p>
                          </span>
                          <span className="skill-add">
                            {maxed ? "MAX" : `${successChance}%`}
                            <small>{maxed ? "已满级" : "升级成功"}</small>
                          </span>
                        </button>
                      );
                    })}
                    <button type="button" className="skill-card recovery-card" onClick={restMonth}>
                      <span className="skill-icon">☾</span>
                      <span className="skill-copy">
                        <small>RECOVERY · OCCUPIES THIS MONTH</small>
                        <strong>休整恢复精力</strong>
                        <p>恢复 7–20 点精力，不增加技能；仍可能错过组会、被导师叫醒或让 idea 贬值。</p>
                      </span>
                      <span className="skill-add recovery">
                        +7~20
                        <small>精力</small>
                      </span>
                    </button>
                  </div>
                  <div className="probability-footnote">
                    <span>风险披露</span>
                    技能成功率随等级、疲劳和海优模式下降；失败同样消耗 4 点精力。负面或带严重副作用的事件概率约 {haiyouMode ? "86" : "76"}%。
                  </div>
                </>
              ) : (
                <div className="event-reveal">
                  <div className="event-tape">MONTHLY RESULT · 月度结算</div>
                  <div className="event-icon">{currentEvent.icon}</div>
                  {monthlyActionResult && (
                    <div className={`monthly-outcome ${monthlyActionResult.status}`}>
                      <strong>{monthlyActionResult.label}</strong>
                      <span>{monthlyActionResult.detail}</span>
                    </div>
                  )}
                  <span className="kicker">以及，本月随机事件准时抵达</span>
                  <h3>{currentEvent.title}</h3>
                  <p>{currentEvent.body}</p>
                  <div className="event-effect">{currentEvent.effect}</div>
                  <button className="primary large" type="button" onClick={continueMonth}>
                    {trainingMonth >= TRAINING_MONTHS ? "结束进修，开始做研究" : `接受现实，进入 ${trainingMonth + 1} 月`} <span>→</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {started && phase === "paper" && paper && (
            <div className="phase-card">
              <PhaseHeader
                step="02 / SUBMISSION"
                title="论文已出炉，请决定如何曝光"
                description="匿名投稿系统不会询问你是否焦虑，因为答案已经写在 cookie 里。"
              />
              <article className="paper-sheet">
                <div className="paper-topline">
                  <span className={`method-tag ${paper.method}`}>{paper.method === "manual" ? "HUMAN-MADE" : "AUTO-RESEARCHED"}</span>
                  <span>{paper.venue} · Conference Submission</span>
                </div>
                <h3>{paper.title}</h3>
                <div className="authors">Anonymous Author(s) · <span>身份将在 Reddit 上揭晓</span></div>
                <div className="paper-tags"><span>{paper.topic}</span><span>oral（希望）</span><span>reproducible（大概）</span></div>
                <h4>Abstract</h4>
                <p>{paper.abstract}</p>
                <div className="stats-grid">
                  <PaperStat label="品质" value={paper.quality} note={statWord(paper.quality, "quality")} />
                  <PaperStat label="Novelty" value={paper.novelty} note={statWord(paper.novelty, "novelty")} />
                  <PaperStat label="严谨度" value={paper.rigor} note={statWord(paper.rigor, "rigor")} />
                  <PaperStat label="AI 味" value={paper.aiSmell} note={paper.aiSmell > 70 ? "Reviewer GPT 闻到了" : "暂未触发检测器"} danger={paper.aiSmell > 70} />
                </div>
              </article>

              <div className="submission-options">
                <label className={`option-row ${arxiv ? "checked" : ""}`}>
                  <input type="checkbox" checked={arxiv} onChange={(event) => setArxiv(event.target.checked)} />
                  <span className="fake-check">{arxiv ? "✓" : ""}</span>
                  <span className="option-copy">
                    <strong>同步挂 arXiv</strong>
                    <small>
                      {originKey === "dynasty"
                        ? "学术大咖 buff：公开身份会被委员会解释为长期影响力。"
                        : "风险提示：匿名性下降，小同行攻击与 AutoResearch 痕迹识别概率同时上升。"}
                    </small>
                  </span>
                  <span className={`risk-chip ${originKey === "dynasty" ? "positive" : "negative"}`}>
                    {originKey === "dynasty" ? `+${origin.arxiv}% 先验` : `+${origin.arxivExposure}% 暴露风险`}
                  </span>
                </label>

                <label className={`option-row ${bid ? "checked" : ""} ${!canBid ? "locked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={bid}
                    disabled={!canBid}
                    onChange={(event) => setBid(event.target.checked)}
                  />
                  <span className="fake-check">{bid ? "✓" : canBid ? "" : "⌕"}</span>
                  <span className="option-copy">
                    <strong>找熟人 bid 这篇论文</strong>
                    <small>{canBid ? "消耗 18 好感，显著提高遇到友军的概率。" : `圈内好感达到 55 解锁（当前 ${favor}）。给同行高分会涨好感。`}</small>
                  </span>
                  <span className="risk-chip positive">{canBid ? "+16% 友军" : "LOCKED"}</span>
                </label>
              </div>

              <div className="action-row">
                <button className="ghost" type="button" onClick={() => setPhase("research")}>撤回重做</button>
                <button className="primary" type="button" onClick={submitPaper}>提交至 {paper.venue} <span>→</span></button>
              </div>
            </div>
          )}

          {started && phase === "review" && paper && (
            <div className="phase-card">
              <PhaseHeader
                step="03 / PEER REVIEW"
                title="轮到你审小同行了"
                description="本会名额固定。给同行高分会提高你自己的低分概率，但可能积累人情。"
              />
              <article className="review-assignment">
                <div className="assignment-banner">
                  <span>REVIEW ASSIGNMENT #{String(8841 + submitted * 11)}</span>
                  <b>Due in 03:47:12</b>
                </div>
                <div className="assignment-body">
                  <div className="rival-paper">
                    <span className="tiny-label">TITLE</span>
                    <h3>{rival.title}</h3>
                    <p className="rival-group">{rival.group}</p>
                    <div className="rival-flags">
                      {rival.isBigLab && <span className="biglab">大组先验 · 谨慎打分</span>}
                      {rival.detected ? (
                        <span className="auto-detected">⚠ 疑似 AutoResearch · 置信度 {rival.suspicion}%</span>
                      ) : rival.isAuto ? (
                        <span className="auto-hidden">模板痕迹不明 · 鉴伪 Lv.{skills.detection} 未识别</span>
                      ) : (
                        <span>人工写作痕迹较强</span>
                      )}
                    </div>
                    <span className="tiny-label">ABSTRACT</span>
                    <p>本文提出一个直觉上合理、实验上昂贵、与你当前工作非常接近的方法。作者报告了 {rival.improvement}% 的提升，并请求审稿人关注“潜在的广泛影响”。</p>
                    <div className="hidden-signal">系统偷偷告诉你：论文真实品质约 {rival.quality}/100</div>
                  </div>
                  <div className="score-panel">
                    <div className="score-heading">
                      <span>Overall score</span>
                      <small>Confidence: {rival.confidence}/5</small>
                    </div>
                    <div className="score-buttons" role="radiogroup" aria-label="给同行的总评分">
                      {[2, 4, 6, 8].map((score) => (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={reviewScore === score}
                          key={score}
                          className={reviewScore === score ? "selected" : ""}
                          onClick={() => setReviewScore(score)}
                        >
                          <b>{score}</b>
                          <span>{score === 2 ? "Strong Reject" : score === 4 ? "Borderline" : score === 6 ? "Weak Accept" : "Strong Accept"}</span>
                        </button>
                      ))}
                    </div>
                    <div className="review-preview">
                      <span>自动生成的评语</span>
                      <p>{reviewScore ? reviewCopy[reviewScore] : "请先选择一个分数。善意与名额不可兼得。"}</p>
                    </div>
                    {reviewScore !== null && (
                      <div className={`consequence ${reviewScore >= 6 ? "kind" : "harsh"}`}>
                        {rival.isBigLab && reviewScore <= 4
                          ? `大组预警：低分可能触发报复。学术人情 Lv.${skills.politics} 可削弱惩罚。`
                          : rival.detected && reviewScore >= 6
                            ? "检测偏差：社区普遍给疑似 AutoResearch 低分；你的高分会显得非常醒目。"
                            : reviewScore >= 6
                              ? `好人税：自己录用率 ${reviewScore === 8 ? "−10%" : "−5%"} · 圈内好感上升`
                              : `零和红利：自己录用率 +${reviewScore === 2 ? "7" : "2"}% · 小同行记仇`}
                      </div>
                    )}
                  </div>
                </div>
              </article>
              <div className="action-row">
                <span className="anonymity">◉ Double-blind-ish review</span>
                <button className="primary" type="button" disabled={reviewScore === null} onClick={calculateDecision}>
                  提交评审并查看命运 <span>→</span>
                </button>
              </div>
            </div>
          )}

          {started && phase === "decision" && paper && decision && (
            <div className="phase-card">
              <PhaseHeader
                step="04 / DECISION"
                title={`${paper.venue} 决议已发布`}
                description="感谢你为社区提供免费的高质量劳动。以下是社区对你的回礼。"
              />
              <div className={`decision-card ${decision.accepted ? "accepted" : "rejected"}`}>
                <div className="decision-ribbon">{decision.accepted ? "ACCEPT" : "REJECT"}</div>
                <div className="decision-main">
                  <span className="tiny-label">PAPER</span>
                  <h3>{paper.title}</h3>
                  <div className="reviewer-scores">
                    {decision.scores.map((score, index) => (
                      <div key={index}>
                        <span>Reviewer #{index + 1}</span>
                        <b>{score}</b>
                        <small>/ 10</small>
                      </div>
                    ))}
                  </div>
                  {decision.detectedBy > 0 && (
                    <div className="detection-notice">
                      ⚠ {decision.detectedBy}/3 位审稿人认为本文疑似 AutoResearch 产物，并在评分时施加了负向先验。
                    </div>
                  )}
                  <blockquote>{decision.review}</blockquote>
                  <div className="ac-note">
                    <span>AREA CHAIR META-REVIEW</span>
                    <p>{decision.areaChair}</p>
                  </div>
                </div>
                <div className="decision-aside">
                  <span>模糊录用概率</span>
                  <strong>{decision.probability}%</strong>
                  <small>排名约 Top {decision.rankPercentile}%<br />名义录用率 {decision.acceptedRate}%</small>
                </div>
              </div>
              <section className="distribution-card">
                <div className="distribution-heading">
                  <div>
                    <span className="kicker">CONFERENCE SCORE DISTRIBUTION</span>
                    <h3>{decision.poolSize.toLocaleString()} 篇投稿的本轮分数分布</h3>
                  </div>
                  <div>
                    <span>AutoResearch 投稿</span>
                    <b>{decision.autoShare}%</b>
                  </div>
                  <div>
                    <span>最终录用</span>
                    <b>{decision.acceptedRate}%</b>
                  </div>
                </div>
                <div className="histogram">
                  {decision.distribution.map((value, index) => (
                    <div key={index}>
                      <span style={{ height: `${Math.max(18, value * 3.2)}px` }}><i>{value}%</i></span>
                      <b>{["1–2", "3–4", "5–6", "7–8", "9–10"][index]}</b>
                    </div>
                  ))}
                </div>
                <div className="fuzzy-note">
                  <span>30% 模糊录用带</span>
                  分数决定大致位置，随机性、领域平衡、关系与“长期影响力”决定门朝哪边开。
                  {decision.eliteOverride && <b> 本轮触发：大组低分捞回。</b>}
                </div>
              </section>
              <div className="action-row">
                <span className="result-progress">
                  已录用 <b>{accepts}</b> / {targetAccepts}
                </span>
                {targetAccepts === 3 && accepts >= 3 ? (
                  <div className="ambition-actions">
                    <button className="ghost" type="button" onClick={finishCurrentPath}>见好就收，申请毕业</button>
                    <button className="primary danger-primary" type="button" onClick={challengeHaiyou}>
                      放弃安稳，挑战海优 3/10 <span>→</span>
                    </button>
                  </div>
                ) : (
                  <button className="primary" type="button" onClick={continueGame}>
                    {accepts >= targetAccepts
                      ? haiyouMode ? "提交海优申请" : "提交毕业申请"
                      : semester >= maxSemesters ? "查看最终结局" : haiyouMode ? "进入下一个高压学期" : "进入下一学期"} <span>→</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {started && phase === "ending" && ending && (
            <div className={`ending-card ${ending.tone}`}>
              <div className="ending-confetti" aria-hidden="true">✦ · ✧ · ✦ · ✧ · ✦</div>
              <div className="ending-icon">{ending.icon}</div>
              <span className="kicker">FINAL DECISION</span>
              <h2>{ending.title}</h2>
              <h3>{ending.subtitle}</h3>
              <p>{ending.body}</p>
              <div className="ending-stats">
                <div><span>录用</span><b>{accepts}</b></div>
                <div><span>好感</span><b>{favor}</b></div>
                <div><span>声望</span><b>{reputation}</b></div>
                <div><span>精力</span><b>{stamina}</b></div>
              </div>
              <button className="primary large" type="button" onClick={resetGame}>换个身世再来一局 ↻</button>
            </div>
          )}
        </section>

        <aside className="activity-panel">
          <section className="activity-card system-card">
            <div className="activity-title">
              <h2>系统状态</h2>
              <span className="live">LIVE</span>
            </div>
            <div className="system-row"><span>Reviewer 模型</span><b>LLM-R2.5</b></div>
            <div className="system-row"><span>本轮投稿</span><b>{poolSize.toLocaleString()}</b></div>
            <div className="system-row"><span>AutoResearch</span><b className="warning">{autoShare}%</b></div>
            <div className="system-row"><span>本轮名额</span><b>约 30%</b></div>
            <div className="system-row"><span>利益冲突</span><b>自觉申报</b></div>
            <div className="system-row"><span>双盲状态</span><b className="warning">薛定谔的盲</b></div>
          </section>

          <section className="activity-card">
            <div className="activity-title"><h2>事件日志</h2><span>最近 {logs.length} 条</span></div>
            <ol className="timeline">
              {logs.map((log, index) => (
                <li key={`${log}-${index}`} className={index === 0 ? "latest" : ""}>
                  <span>{index === 0 ? "NOW" : `−${index}`}</span>
                  <p>{log}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="activity-card rumor-card">
            <span className="kicker">TRENDING ON 学术小红书</span>
            <p>“听说今年 Area Chair 全是 agent，真人只负责道歉。”</p>
            <div><span>匿名用户 42</span><b>♡ {109 + submitted * 7}</b></div>
          </section>
        </aside>
      </main>

      <footer>
        <span>PeerReview™ is a fictional satire. No gradients, no guarantees.</span>
        <span>v0.1 · Built for everyone still waiting on Reviewer #2</span>
      </footer>
    </div>
  );
}

function PhaseHeader({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="phase-heading">
      <span className="kicker">{step}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="metric">
      <div><span>{label}</span><b>{value}</b></div>
      <div className="metric-track"><i className={tone} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function PaperStat({
  label,
  value,
  note,
  danger,
}: {
  label: string;
  value: number;
  note: string;
  danger?: boolean;
}) {
  return (
    <div className={`paper-stat ${danger ? "danger" : ""}`}>
      <div><span>{label}</span><b>{value}</b></div>
      <div className="stat-track"><i style={{ width: `${value}%` }} /></div>
      <small>{note}</small>
    </div>
  );
}
