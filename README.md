# Internship Blog · 实习成长档案

这是一个用于记录实习经历、学习心得、技术沉淀、项目复盘、图片证据和面试素材的暖色系个人博客。

## 怎么打开

直接双击 `index.html` 即可打开。

如果你想用本地服务打开，可以在当前目录运行：

```bash
python -m http.server 5173
```

然后浏览器访问：

```text
http://localhost:5173
```

## 已实现功能

- 暖色系玻璃拟态 UI
- GSAP + ScrollTrigger 滚动入场动画
- 卡片悬浮 3D tilt 动效
- 实习记录搜索与分类筛选
- 技术关键词云
- 实习成长时间线：支持在页面上新增、编辑、删除、恢复默认模板
- 图片证据墙：支持点击/拖拽上传，自动压缩后保存到浏览器本地
- 今日速记：保存到浏览器本地，并自动优化排版
- 更稳的速记编号识别：不会把 `127.0.0.1`、版本号、路径误判成编号
- 面试素材库：STAR 事例、项目表达模板、高频追问清单
- 面试问题记录：支持新增问题、回答思路、关联证据和关键词

## 本地自动归档工具

我已经加入一套不依赖 ChatGPT 定时任务的本地归档工具：

```text
Internship Blog/
├─ tools/
│  ├─ archive-daily-note.ps1
│  └─ install-nightly-archive-task.ps1
└─ data/
   └─ daily-notes/
      ├─ TEMPLATE.md
      └─ 2026-06-19.md
```

### 每天怎么写

复制：

```text
data/daily-notes/TEMPLATE.md
```

改名为当天日期，例如：

```text
data/daily-notes/2026-06-20.md
```

然后按模板填写：今天做了什么、遇到的问题、解决过程、结果证据、面试可讲、下一步。

### 手动归档某一天

在项目根目录打开 PowerShell，运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\archive-daily-note.ps1 -NoteDate 2026-06-19
```

它会把 `data/daily-notes/2026-06-19.md` 自动写入 `data/entries.js`，并在 `data/backups/` 里备份旧版 `entries.js`。

### 安装每天凌晨 4 点自动归档

在项目根目录打开 PowerShell，运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\install-nightly-archive-task.ps1
```

这个会创建 Windows 任务计划：

```text
InternshipBlogDailyArchive
```

默认每天凌晨 4 点归档“前一天”的 Markdown 速记。例如 6 月 21 日凌晨 4 点，会尝试归档：

```text
data/daily-notes/2026-06-20.md
```

取消这个本地计划任务：

```powershell
Unregister-ScheduledTask -TaskName InternshipBlogDailyArchive -Confirm:$false
```

## 如何新增正式记录

可以优先使用上面的本地自动归档工具。也可以打开 `data/entries.js`，按下面格式手动新增一条：

```js
{
  id: 6,
  date: "2026-06-24",
  type: "技术笔记",
  title: "这里写标题",
  summary: "这里写摘要：今天做了什么、问题是什么、如何解决、结果如何证明。",
  tags: ["STM32", "PID", "调试"],
  project: "项目名称",
  result: "最终结果或可展示产出"
}
```

建议每条记录都包含这四个点：

1. 我负责什么。
2. 我遇到什么难点。
3. 我怎么排查和解决。
4. 我如何证明结果有效。

## 保存逻辑说明

这个网站有两种保存方式：

### 1. 正式记录：保存到项目文件

`data/entries.js` 里的内容属于正式记录，会跟着项目文件一起保存、备份和上传 GitHub。今天的记录已经整理进 `data/entries.js`，并加入了“查看详细复盘”的展开内容。

适合放：日报、项目复盘、技术笔记、面试可讲故事、重要结果证据。

### 2. 页面临时记录：保存到浏览器本地

下面这些内容会保存在浏览器本地 `localStorage` 里：

- 今日速记
- 图片证据墙
- 实习成长时间线的页面编辑结果
- 面试问题记录

这些内容刷新页面不会丢，但它们只存在当前浏览器里。换浏览器、清理浏览器缓存或换电脑后，这些本地内容可能看不到。重要内容建议定期整理进 `data/entries.js` 或复制到文档里。

## 目录结构

```text
Internship Blog/
├─ index.html
├─ styles.css
├─ app.js
├─ data/
│  └─ entries.js
└─ assets/
   ├─ internship-hero.svg
   └─ hyperframes-scene.svg
```

`hyperframes-scene.svg` 目前只是遗留插图素材，页面视频回顾模块已经删除。

## 面试复盘建议

周末可以固定整理一次：

- 本周最有价值的产出是什么？
- 哪个问题最难？为什么难？
- 我用了哪些调试方法？
- 有没有截图、数据、Demo、文档作为证据？
- 这个经历能不能改写成 STAR 故事？
- 面试官可能追问什么？我的回答有没有证据支撑？
