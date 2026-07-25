# PeerReview™ — 3 Accepts or Perish

一款关于 AutoResearch、LLM reviewer 与博士毕业线的单人网页讽刺游戏。

玩家要在 4 年、每年 5 轮的学术赛季中拿到至少 3 篇顶会录用。会议按 ICML、ACL、NeurIPS、AAAI、ICLR 循环；每轮包含月度技能进修、休整、social 大佬、随机事件、论文生产、arXiv / bid 决策、同行评审和一个约 30% 录用率但不严格按分数排序的会议决议。达到毕业线后，还可以开启额外 5 年、共 25 轮的海优挑战。

## 玩法

- 选择学阀世家、普通组或导师失联三种开局。
- 每月进修理论、工程、写作、学术鉴伪或学术人情。
- 自己认真研究，或让 AutoResearch 高方差出稿。
- 识别同行的 AutoResearch 痕迹，同时承担给大组低分后的报复风险。
- 观察每轮投稿量、AutoResearch 占比和评分分布。
- 解锁饮水机大师兄、海优回国、大厂赢家等结局。
- 结局、彩蛋和主动举报结果会匿名写入 Supabase；结局页也可以提交匿名反馈。

## Supabase

项目使用 publishable key 从浏览器写入受 RLS 保护的表，不需要、也绝不能在前端使用 secret key。首次启用时，在 Supabase SQL Editor 执行 [`supabase/schema.sql`](supabase/schema.sql)；原始事件与反馈仅项目管理员可读，匿名玩家只能新增记录。

## 本地运行

```bash
pnpm install
pnpm dev
```

## GitHub Pages

仓库自带 GitHub Actions 发布流程。推送到 `main` 后，会构建静态版本并发布到 GitHub Pages。
