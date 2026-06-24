window.INTERNSHIP_ENTRIES = [
  {
    id: 1,
    date: "2026-06-19",
    type: "实习日报",
    title: "搭建 DevSpace 本地连接与实习博客",
    summary: "今天主要完成两件事：一是把 ChatGPT 网页版通过自定义 MCP、Cloudflare Tunnel 和本机 DevSpace 连接到本地项目目录；二是搭建了一个暖色系实习记录博客，用来沉淀实习经历、技术笔记、图片证据、时间线和面试素材。",
    tags: ["DevSpace", "MCP", "Cloudflare Tunnel", "前端博客", "面试复盘"],
    project: "Internship Blog / DevSpace 本地连接",
    result: "ChatGPT 已能通过 DevSpace 访问本地项目，博客页面完成并可本地打开",
    sections: [
      {
        heading: "今天做了什么",
        items: [
          "在 Windows 上搭建 ChatGPT 网页版 → 自定义 MCP 连接器 → Cloudflare Tunnel 公网转发 → 本机 DevSpace → 本地项目目录的工作流。",
          "使用 cloudflared / trycloudflare.com 将本机 127.0.0.1:7676 暴露为公网地址，并反复调整 allowedRoots。",
          "编写并迭代 .bat / .ps1 启动脚本，最终使用 v7 anyroot 版本，解决 config.json 写入 UTF-8 BOM 导致 DevSpace JSON 解析失败的问题。",
          "确认本地 /mcp 和公网 /mcp 都可以访问 DevSpace，并用 devspace config get 检查 host、port、allowedRoots、publicBaseUrl 是否一致。",
          "搭建 Internship Blog 网站：暖色系 UI、动画效果、SVG 插图、实习记录、技术沉淀、图片证据墙、今日速记、时间线编辑、面试问题记录等功能。",
          "尝试通过 GitHub / gh 上传项目，但当前聊天没有 GitHub 工具，本机也未识别 gh 命令，暂时先不上传。"
        ]
      },
      {
        heading: "遇到的问题",
        items: [
          "一开始 DevSpace 暴露错目录：想访问 E:\\4-7、HJ-ZE STM32智能小车，但 ChatGPT 实际看到 C:\\Users\\34494，说明旧实例或旧连接器仍把用户主目录作为 allowed root。",
          "Cloudflare Tunnel 地址和 DevSpace 配置地址不一致：ChatGPT 里曾填过旧的 trycloudflare 地址，但 DevSpace 实际启动后显示的是另一个地址，导致创建连接器失败。",
          "MCP 连接器认证相关问题：OAuth、Owner password、token 长度等信息反复干扰判断。",
          "脚本写入 config.json 时带 BOM，导致 DevSpace JSON 解析失败。",
          "最初博客的今日速记排版太像大段纯文本，后来又出现把 127.0.0.1、Cloudflare、DevSpace 误判成编号徽章的问题。"
        ]
      },
      {
        heading: "结果证据",
        items: [
          "devspace config get 能看到配置已改为 127.0.0.1:7676，allowedRoots 指向指定目录，publicBaseUrl 与 cloudflared 输出的 trycloudflare 地址一致。",
          "ChatGPT 能通过 DevSpace 读取 C:\\Users\\34494\\Desktop\\Internship Blog 下的 index.html、styles.css、app.js、data/entries.js、assets 等文件。",
          "博客已实现本地可打开的实习记录系统，支持记录、搜索、筛选、图片上传、本地速记、成长时间线编辑、面试问题记录。",
          "删除了视频回顾模块，保留核心实习复盘功能。"
        ]
      },
      {
        heading: "面试可讲",
        items: [
          "这件事可以包装成一次“本地开发工具链集成与问题排查”的经历：目标是让 AI 助手安全访问指定本地项目；难点是公网隧道、MCP 地址一致性、allowedRoots 权限边界和 JSON 编码问题；行动是通过配置检查、地址对齐、脚本迭代和最小验证逐步定位；结果是形成可复用的本地 DevSpace 连接方案和实习复盘站点。"
        ]
      },
      {
        heading: "下一步",
        items: [
          "补充截图证据：DevSpace 配置截图、Cloudflare 地址截图、博客页面截图。",
          "后续每次做项目时，都按“问题 → 排查 → 证据 → 面试表达”的结构沉淀。",
          "等 GitHub 工具或 GitHub CLI 可用后，再把项目初始化为 Git 仓库并推送到远程。"
        ]
      }
    ]
  }
];

window.INTERNSHIP_MILESTONES = [
  { date: "06/19 上午", title: "打通 DevSpace 本地连接", detail: "完成 ChatGPT 自定义 MCP、Cloudflare Tunnel、公网 /mcp、本地 DevSpace、allowedRoots 的联调。" },
  { date: "06/19 下午", title: "搭建实习记录博客", detail: "生成暖色系前端页面，加入动画、插图、记录卡片、技术沉淀、图片证据墙、今日速记和面试素材库。" },
  { date: "06/19 晚上", title: "优化复盘体验", detail: "修复速记排版和编号识别问题，新增面试问题记录、可编辑成长时间线，并删除视频回顾模块。" },
  { date: "下一步", title: "整理证据并准备上传", detail: "补充关键截图，等 GitHub 工具或 GitHub CLI 可用后再推送到远程仓库。" }
];
