# svg-editor-cli — Lab1 Phase 1 产品需求文档（简单 PRD）

> 需求来源：`E:/高级软开/phase_cli_1.md`（作业规格书，唯一权威来源，共 524 行）
> 文档版本：v1.1（QA 验收后修订，见 §9 修订记录）｜ 状态：已实现并通过验收 ｜ 编写：产品经理（许清楚）
> 适用项目：`E:/高级软开/svg-editor-cli`

---

## 目录

1. [产品概述](#1-产品概述)
2. [产品目标与范围边界](#2-产品目标与范围边界)
3. [用户故事](#3-用户故事)
4. [需求池](#4-需求池)
   - [4.1 优先级与验收总则](#41-优先级与验收总则)
   - [4.2 CLI 外壳与 REPL](#42-cli-外壳与-repl)
   - [4.3 文档类命令](#43-文档类命令)
   - [4.4 图形编辑类命令](#44-图形编辑类命令)
   - [4.5 撤销 / 重做](#45-撤销--重做)
   - [4.6 显示类命令](#46-显示类命令)
   - [4.7 SVG 读写契约](#47-svg-读写契约)
   - [4.8 错误信息逐字表](#48-错误信息逐字表)
   - [4.9 §6 典型会话逐字契约](#49-6-典型会话逐字契约)
   - [4.10 工程与流程约束](#410-工程与流程约束)
   - [4.11 P1 / P2 增强项](#411-p1--p2-增强项)
5. [交互稿](#5-交互稿)
6. [关键契约详解：tree 对齐规则](#6-关键契约详解tree-对齐规则)
7. [待确认问题与裁决建议](#7-待确认问题与裁决建议)
8. [附录](#8-附录)

---

## 1. 产品概述

### 1.1 一句话定义

`svg-editor-cli` 是一个 **纯终端的 SVG 结构化编辑器**：用户以「命令 + 图形 id」的方式增量构建 / 修改一棵 SVG 元素树，每条命令立即回显**逐字确定的结果摘要**，全部编辑动作可按「一条命令 = 一个撤销单元」回退，产物 `save` 出来的是**浏览器可直接打开的标准 SVG**。

### 1.2 目标用户与使用场景

| 用户 | 场景 | 核心诉求 |
|---|---|---|
| 流程图 / 框图作者 | 从零用命令画出「节点 + 连线」结构图 | 命令直白、层级关系显式、结果可回放 |
| 接手他人 SVG 的工程师 | 读入一个外部 `.svg` 并继续修改 | 缺 id 能自动补齐并明确告警，不中断流程 |
| AI 编码代理 | 依据自然语言批量产生 / 校验 CLI 操作序列 | 语法稳定、输出逐字可断言、错误可分类 |
| 课程评审者 | 验证架构与设计模式的落地 | 行为可预测、失败不污染状态、边界清晰 |

### 1.3 本阶段交付边界（一句话）

**做**：REPL + 6 种内建图形 + 容器（Composite）统一操作 + undo/redo + tree/show 显示 + SVG 读写 + 逐字输出契约。
**不做**：复合图形 `box` 及其插件化机制、结构路径寻址、GUI / 鼠标交互、跨 IO 的历史回退。

---

## 2. 产品目标与范围边界

### 2.1 产品目标（3 个，正交）

| 编号 | 目标 | 可度量含义 |
|---|---|---|
| **G1** | **确定性**：命令 → 文档变更 → 逐字回显，三者一一对应 | 任何命令的成功/失败输出字符串唯一确定；失败命令不改变任何状态（可断言） |
| **G2** | **统一心智模型**：容器与叶子共用一套操作语义 | `move` / `scale` / `set` / `delete` 对 `<g>` 与叶子图形行为一致，用户不需要为容器换一套语法 |
| **G3** | **产物可互操作**：CLI 进出都是标准 SVG | `save` 的文件能被浏览器直接打开；外部 SVG 能读入、补 id 后继续编辑，结构与属性不丢失 |

### 2.2 范围边界

| 分类 | 内容 |
|---|---|
| **In Scope（P0/P1）** | REPL 外壳与提示符；`init` / `read` / `save` / `canvas`；`create`(6 型) / `delete` / `move` / `scale` / `set` / `group` / `ungroup` / `addto` / `front` / `back`；`undo` / `redo`；`tree` / `show` / `help`；id 唯一性与外部文件缺 id 自动补齐；统一错误前缀与错误文案表；SVG 序列化 / 反序列化；undo 粒度与「IO 后禁 undo」规则 |
| **Out of Scope（明确不做）** | ① **复合图形 `box`（本阶段不实现）**——`create box` 必须报 `error: unknown shape type: box (is the plugin loaded?)`；② 插件化机制（`ShapeProvider` 插槽、`data-kind` 还原、降级策略）——属后续阶段；③ 结构路径寻址（如 `/canvas/g1/rect[2]`）；④ GUI / 鼠标通道；⑤ 跨 IO 操作的历史回退（明确禁止）；⑥ 多文件导入导出、SVG 编辑器以外的绘图能力 |
| **Later（仅记录语义，不作为本阶段需求）** | §4.4 定义的 `box` 完整语义（子部件 id 派生 `<id>-rect` / `<id>-label`、`set` 传播与便利属性、序列化标记 `data-kind="box"`、树中 `g#n1 (box)` 标注、递归嵌套）——**架构设计时应为其预留扩展缝隙，但本阶段不写任何实现** |

### 2.3 阶段边界（必须写进实现与文档的硬约束）

> **本阶段 `box` 复合图形不实现。**
> `create box <id> <x> <y> <w> <h> "<标题>"` 在本阶段**必须**返回：
> `error: unknown shape type: box (is the plugin loaded?)`
> 该错误串中的类型名随实际传入的类型名变化（`hexagon` → `error: unknown shape type: hexagon (is the plugin loaded?)`）。
> 架构方案中应体现「图形类型经由工厂注册、内核不内置 box」的扩展缝隙，但**不得出现 box 的实现代码**。

---

## 3. 用户故事

> 格式：As a [角色], I want [能力] so that [收益]

| 编号 | 用户故事 | 关联需求 |
|---|---|---|
| **US-1** | As a 流程图作者, I want 用 `id` 定位图形并立刻看到结果摘要, so that 我确信每一步都落在了预期的元素上 | R-20、R-23、R-25、R-30 |
| **US-2** | As a 流程图作者, I want 在 `create` 时用 `in` 直接指定父容器, so that 层级关系在创建那一刻就成立，不必事后收编 | R-21、R-28 |
| **US-3** | As a 结构审阅者, I want 用 `tree` 看到内联属性的结构树、用 `show` 看到单个图形的明细, so that 我不打开画布也能确认文档状态 | R-50 ~ R-52 |
| **US-4** | As a 谨慎的编辑者, I want 一条命令一个撤销单元地回退与重做, so that 我敢大胆试错 | R-33、R-40 ~ R-43 |
| **US-5** | As a 集成方, I want `save` 出来的是浏览器能直接打开的 SVG, so that 我可以用最便宜的方式验证效果 | R-60、R-12 |
| **US-6** | As a 接手他人 SVG 的用户, I want 读入缺 id 的文件时自动补齐并给出告警, so that 我能立刻继续编辑而不必手工改文件 | R-62、R-11 |
| **US-7** | As a AI 编码代理, I want 命令语法与输出逐字可断言, so that 我能用回归测试判断实现是否正确 | 全部 P0 需求 + §4.9 逐字契约表 |
| **US-8** | As a 脚本化用户, I want 把命令序列存成文件回放（`#` 开头为注释）, so that 复杂图形可以复现 | R-01、R-02 |

---

## 4. 需求池

### 4.1 优先级与验收总则

| 优先级 | 含义 | 交付要求 |
|---|---|---|
| **P0** | 必须有（Must have）。缺失即视为功能不完整 | 全部实现，且逐条通过验收断言 |
| **P1** | 应该有（Should have）。规格未明文规定但为完整性所需 | 实现；若延后需在 README 的"一致性自查"中记录原因 |
| **P2** | 可以有（Nice to have）。本阶段明确不做或仅作占位 | 在架构方案中说明"留了什么缝、为什么不做" |

**验收总则**

1. 验收标准以**精确到输出字符串**的方式给出；标注「逐字」的字符串，测试中必须以完全相等（`===`）断言，不允许包含式匹配、不允许忽略空白。
2. 缩进、列对齐、空格数量均属于契约的一部分（见 §6）。
3. 所有错误输出为**单行**，前缀固定 `error: `，命令失败**不改变任何状态**。
4. 需求来源标记：`【明文】`= 规格正文直接写明；`【示例】`= 由规格示例逐字推导；`【裁决】`= 规格未规定、由本 PRD 裁决（见第 7 章）。

**需求条目总数：55 条**（P0 44 条 / P1 9 条 / P2 2 条；另含错误文案表 16 行、逐字 transcript 契约 25 行作为 P0 表格随附）

> **PRD 修订记录（v1.1，QA 验收后）**：① 需求条目总数由 57 更正为 **55**（原文计数与表格实际条目不符）；② R-12 的"保存路径"措辞按实现实测收紧；③ R-30 的括注与 §6 逐字示例矛盾，按 §6 更正；④ E-04 触发条件补入 `ungroup`；⑤ 新增 E-17（空 id）。详见文末 §9。

---

### 4.2 CLI 外壳与 REPL

| ID | 需求 | 优先级 | 验收标准（可断言） | 来源 |
|---|---|---|---|---|
| R-01 | 提示符固定为 `svg> `，逐行读入 | P0 | 启动后每读入一行前打印 `svg> `；行内内容被解析为一条命令 | 【明文】§2 |
| R-02 | `#` 开头为注释，空行忽略 | P0 | 输入 `# 这是注释` 与空行 → **无任何输出**，文档状态不变 | 【明文】§2 |
| R-03 | 启动横幅 | P0 | 进程启动后**首行**输出 `svg-editor 0.1 — type 'help' for commands`（注意 `0.1` 后的破折号是 U+2014 em dash，句中单引号是 ASCII `'`），此后不再重复 | 【示例】§6 |
| R-04 | 失败原子性 | P0 | 任意命令报错后，文档树、id 集合、undo/redo 栈三者均与执行前完全一致（可对 `tree` 输出做前后 diff 断言） | 【明文】§2「命令失败不改变任何状态」 |
| R-05 | 未知命令 / 参数缺失的处理 | P1 | 未知命令 → 建议 `error: unknown command: foo`；参数不足 → 建议 `error: usage: create <type> <id> [params…] [in <containerId>]`；两种情况均不改变状态 | 【裁决】见 Q7 |

---

### 4.3 文档类命令

> **文档类命令执行后 undo/redo 被禁止**（详见 R-43）。

| ID | 需求 | 优先级 | 验收标准（可断言） | 来源 |
|---|---|---|---|---|
| R-10 | `init [w] [h]` 新建空画布 | P0 | `init 800 600` → 逐字输出 `canvas 800x600 created`；`init`（无参）→ 逐字输出 `canvas 800x600 created`（默认 800×600）；新建后文档为空树，画布尺寸 = 800×600 | 【示例】§6、§3 |
| R-11 | `read <file.svg>` 读入为当前文档 | P0 | 读入规格中的 `other.svg` → 先逐字输出 `warning: assigned id rect1 to unnamed <rect>`，再逐字输出 `read other.svg (7 elements)`；读入后画布尺寸 = 文件的 `width`×`height` = 400×300 | 【示例】§6 |
| R-12 | `save [file.svg]` 保存 | P0 | `save demo.svg` → 逐字输出 `saved to demo.svg (5 elements)`；**无参时**保存到"最近一次显式 `save` 的路径"；若从未显式 `save` 过，则保存到最近一次 `read` 的路径（输出 `saved to other.svg (7 elements)`）；若文档来自 `init` 且从未显式 `save` 过 → `error: no file path. use 'save <file.svg>'`（见 E-18） | 【示例】§6、§3 |
| R-13 | 元素计数口径 | P0 | `read` / `save` 回显中的 `(N elements)` = **文档内除根 `<svg>` 外的元素总数**（容器与其子孙均计入）。校验点：other.svg = 7；§6 会话中保存时 = 5（bg, title, c1, box, markers） | 【示例】§6 反推 |
| R-14 | `canvas` 无参 = 显示尺寸 | P1 | 建议逐字输出 `canvas 800x600`（与 `init` 的 `canvas 800x600 created` 同源格式，去掉 `created`） | 【裁决】见 Q3 |
| R-15 | `canvas <w> <h>` = 修改尺寸 | P1 | 修改画布 width/height；建议逐字输出 `canvas 800x600 updated`；**视作文档类命令**（执行后禁 undo/redo）；建议**不缩放**已有元素坐标 | 【裁决】见 Q3、Q4 |
| R-16 | 文档类命令清空编辑历史 | P0 | `init` / `read` 之后 undo 栈与 redo 栈均为空；`save` 不清空编辑栈内容，但会**锁死** undo/redo 入口（R-43） | 【裁决】见 Q5 |

---

### 4.4 图形编辑类命令

| ID | 需求 | 优先级 | 验收标准（可断言） | 来源 |
|---|---|---|---|---|
| R-20 | `create` 支持 6 种内建类型 | P0 | `create rect bg 0 0 800 600 #ffffff` → 逐字 `rect#bg created`；`create circle c1 100 100 20 red` → `circle#c1 created`；`create ellipse e1 1 2 3 4` → `ellipse#e1 created`；`create line l1 0 0 10 10` → `line#l1 created`；`create text t1 20 40 "My Diagram"` → `text#t1 created`；`create g g1` → `g#g1 created` | 【示例】§4.1、§6 |
| R-21 | `create ... in <containerId>` 尾缀 | P0 | `create rect start 120 100 160 60 #4a90d9 in node1` → 逐字 `rect#start created in g#node1`；`create g node2 in flowchart` → `g#node2 created in g#flowchart`；`create text start-label 155 135 "开始" in node1` → `text#start-label created in g#node1`；`create line arrow1 280 130 520 130 black in flowchart` → `line#arrow1 created in g#flowchart`。`in` 目标不存在 → 逐字 `error: no such container: node9`；`in` 目标存在但不是 `g` → 逐字 `error: not a container: start`；两种情况不改变状态 | 【示例】§4.1、§4.2 |
| R-22 | 未注册类型（**本阶段 box 必须报错**） | P0 | `create box n1 120 100 160 60 "开始"` → 逐字 `error: unknown shape type: box (is the plugin loaded?)`；不产生任何节点、不改变状态 | 【明文】§3、§4.4 阶段边界 |
| R-23 | id 唯一且大小写敏感 | P0 | 同一文档内 id 全局唯一：`create rect r1 0 0 1 1` 后再 `create rect r1 0 0 1 1` → 逐字 `error: id already exists: r1`；`r1` 与 `R1` 视为两个不同 id | 【明文】§2、§4.2 |
| R-24 | `delete <id>` | P0 | `delete box` → 逐字 `rect#box deleted`；删除容器 `g` 时其**全部子孙**一并删除 | 【示例】§3、§6 |
| R-25 | `move <id> <dx> <dy>` 平移 | P0 | **叶子**：`move c1 30 0`（c1 初始 cx=100,cy=100）→ 逐字 `circle#c1 moved to (130,100)`；**容器**：`move node2 0 100` → 逐字 `g#node2 moved by (0,100)`（容器用增量措辞，叶子用绝对位置措辞） | 【示例】§6、§6.1 |
| R-26 | `scale <id> <factor>` 等比缩放 | P0 | `factor` 同乘到该图形的**全部几何属性**（位置与尺寸）；作用于容器时**递归到每个子孙**；`factor ≤ 0` → 逐字 `error: scale factor must be positive`；成功回显建议 `circle#c1 scaled by 2`（P1，见 R-51 表下） | 【明文】§3、§4.2 |
| R-27 | `set <id> <attr> <value>` 白名单 | P0 | 白名单 = `fill` / `stroke` / `stroke-width` + 各类型自身几何属性（rect: `x` `y` `width` `height`；circle: `cx` `cy` `r`；ellipse: `cx` `cy` `rx` `ry`；line: `x1` `y1` `x2` `y2`；text: `x` `y`）+ text 元素的文本内容属性 `text`。白名单外 → 逐字 `error: unknown attribute: opacity` | 【明文】§4.1 |
| R-28 | `set` 成功回显 | P0 | `set title text "My Diagram v2"` → 逐字 `text#title updated: text="My Diagram v2"`（值带双引号） | 【示例】§6 |
| R-29 | `group <newGid> <id1> <id2>…` 收编 | P0 | `group markers c1 box` → 逐字 `g#markers created with 2 children`；被收编元素**从各自原父容器摘出**、保持相对顺序、成为新容器的子节点 | 【示例】§6、§3 |
| R-30 | `group` 的祖先/子孙冲突检测 | P0 | `group bad c1 markers`（c1 是 markers 的子孙）→ 逐字 `error: cannot group a container into its own descendant: markers`（错误串中点名的是**那个自身包含了另一成员作为子孙的容器**（此处为 `markers`），不是新 gid，也不是成员里的叶子）；不改变状态 | 【示例】§6、§4.2 |
| R-31 | `ungroup <gid>` 解散容器 | P0 | 子图形提升到原容器的**父级**、并**占据原容器原来的位置**（原顺序）；对根级容器（`<svg>` 的直接子节点）→ 逐字 `error: cannot ungroup top-level container: scene`；成功回显建议 `g#g1 ungrouped` | 【明文】§3、§4.2 |
| R-32 | `addto <gid> <id>` 移动归属 | P0 | 把已有图形移入指定容器，作为该容器的**最后一个子节点**；目标非容器 → `error: not a container: start`；成功回显建议 `rect#r1 added to g#g1` | 【明文】§3；回显见 Q8 |
| R-33 | `front <id>` / `back <id>` 调整 z-order | P0 | 在**同一父容器内**把目标移到最前 / 最后（SVG 绘制顺序 = 文档顺序，故"最前"= 同级最后一个）；成功回显建议 `rect#r1 moved to front` / `rect#r1 moved to back` | 【明文】§3；回显见 Q8 |
| R-34 | **Composite 统一操作语义** | P0 | `move` / `scale` / `set` / `delete` 对 `<g>` 与叶子图形**一视同仁**：对容器操作时语义为"整棵子树"（平移/缩放作用于全部子孙、删除连带子孙）。不存在"只能对叶子用"或"必须先 ungroup"的限制 | 【明文】§2.1 |

---

### 4.5 撤销 / 重做

| ID | 需求 | 优先级 | 验收标准（可断言） | 来源 |
|---|---|---|---|---|
| R-40 | undo / redo 基本行为 | P0 | `undo` 撤销最近一次**编辑**命令；`redo` 重做；撤销后若产生了新的编辑命令，**redo 栈被清空**（此后 `redo` 报 `error: nothing to redo`，建议文案，见 Q9） | 【明文】§3、§4.3 |
| R-41 | **一条编辑命令 = 一个 undo 单元** | P0 | `group markers c1 box` 整体是一个单元：`undo` 一次即恢复 c1 与 box 的原父容器与原位置（两个元素同时复原），不能分两次撤销 | 【明文】§4.3 |
| R-42 | 显示类命令不进 undo 栈 | P0 | `tree` / `show` / `help` 不产生 undo 单元：执行后再 `undo`，撤销的仍是它们之前的最后一次编辑 | 【明文】§4.3 |
| R-43 | **IO / 文档类命令后禁 undo-redo** | P0 | `init` / `read` / `save` / `canvas` 修改尺寸执行后，`undo` 与 `redo` 均逐字输出 `error: undo not allowed after io command`；该禁止**持续到下一次编辑命令执行**（编辑命令执行后 undo/redo 恢复正常） | 【明文】§4.3、§6 |
| R-44 | undo 的回显文案 | P0 | `move` 的 undo → 逐字 `circle#c1 moved back to (100,100)`（叶子：绝对位置）；`g#node2 moved back by (0,-100)`（容器：负增量）；`set` 的 undo → 逐字 `text#title updated: text="My Diagram"`（**沿用 `updated:` 措辞 + 旧值**，不用 `reverted`）；`delete` 的 undo → 逐字 `rect#box restored into g#markers`（含原父容器） | 【示例】§6、§6.1 |
| R-45 | redo 的回显文案 | P0 | `redo` 回显与**原命令成功时完全相同**的字符串：`move` → `circle#c1 moved to (130,100)`；`set` → `text#title updated: text="My Diagram v2"` | 【示例】§6 |

---

### 4.6 显示类命令

| ID | 需求 | 优先级 | 验收标准（可断言） | 来源 |
|---|---|---|---|---|
| R-50 | `tree` 结构树（属性内联） | P0 | 输出首行 `svg (800x600)`（当前画布尺寸），随后按文档顺序逐层输出树形行；**必须内联关键几何属性**（不能只列标签名）；行首树形字符固定 `├── ` / `└── ` / `│   ` / 空格填充；`g` 容器行**只有 `tag#id`，不带属性行** | 【示例】§5.1、§6 |
| R-51 | `tree` 的属性渲染与列对齐 | P0 | ① 各类型属性写法：rect → `x=0 y=0 w=800 h=600 fill=#ffffff`（树中用 `w`/`h` 缩写）；circle → `cx=100 cy=100 r=20 fill=red`；ellipse → `cx=1 cy=2 rx=3 ry=4`；line → `(280,130) -> (520,130)`；text → `(20,40) "My Diagram"`（坐标对 + 双引号包裹内容）。② `fill`/`stroke` 未设置时**不出现**（如 `rect#r2  x=0 y=0 w=10 h=10`）。③ 所有属性行对齐到**同一绝对列**，规则见 §6。④ `tree <id>` 只显示以该 id 为根的子树，首行为 `tag#id`（如 `g#n1`），其下按同样树形字符列出子节点 | 【示例】§5.1、§6、§6.1 |
| R-52 | `show <id>` 属性明细 | P0 | `show c1` → 逐字三行：<br>`circle#c1  parent=g#markers`<br>`  cx=100 cy=100 r=20`<br>`  fill=red`<br>（第 1 行 = `tag#id` + **两个空格** + `parent=<父容器id>`，顶层元素的 `parent` 建议为 `svg`；第 2 行起缩进 **2 个空格**，几何属性一行、绘制属性一行；未设置的属性不出现） | 【示例】§5.2 |
| R-53 | `help` 列出全部命令与语法 | P1 | 建议逐字格式见 Q10（`help` 至少要覆盖 §3 命令总表的全部 14 个命令名与语法） | 【裁决】§3 |
| R-54 | 文档为空 / 子树为叶子时的显示 | P1 | `init` 后 `tree` → 逐字仅 `svg (800x600)` 一行；`tree rect#bg`（叶子）→ 逐字仅 `rect#bg` 一行 | 【裁决】见 Q11 |

---

### 4.7 SVG 读写契约

| ID | 需求 | 优先级 | 验收标准（可断言） | 来源 |
|---|---|---|---|---|
| R-60 | `save` 产出标准 SVG | P0 | 文件首行 `<?xml version="1.0" encoding="UTF-8"?>`；根元素含 `xmlns="http://www.w3.org/2000/svg"`、`width`、`height`、`viewBox="0 0 <w> <h>"`；子元素按文档顺序写出；`save` 出来的文件能直接被浏览器打开显示 | 【明文】§0.1、§2 |
| R-61 | `read` 反序列化 | P0 | 解析并保留：元素顺序、嵌套层级、`id`、几何属性、`fill`/`stroke`/`stroke-width`、text 的文本内容；未识别的属性忽略但不报错 | 【示例】§6、§0.1 |
| R-62 | **外部 SVG 缺 id 自动补齐 + 告警** | P0 | 读入元素缺 `id` 时，按 **`标签名+序号`** 分配（序号按同标签计数，从 1 开始）：`<rect>` → `rect1`；逐字告警 `warning: assigned id rect1 to unnamed <rect>`；**每个**缺 id 元素打印**一行**告警，全部告警在 `read` 汇总行**之前**输出 | 【明文】§2、§6 |
| R-63 | 自动补 id 不得与既有 id 冲突 | P0 | 补齐时若 `rect1` 已被占用，序号顺延为 `rect2`（不覆盖既有 id），并按实际 id 打印告警 `warning: assigned id rect2 to unnamed <rect>` | 【裁决】见 Q2 |
| R-64 | 属性省略规则与浮点坐标 | P0 | 省略的 `fill`/`stroke` **不写入** SVG 属性（外观遵循 SVG 默认：`fill` 初值 black、`stroke` 初值 none）；坐标允许浮点（原点左上、x 向右、y 向下、单位 px） | 【明文】§2、§4.1 |

---

### 4.8 错误信息逐字表

> 全部错误输出为**单行**，前缀固定 `error: `，命令失败不改变任何状态。

| # | 错误串（逐字） | 触发条件 | 来源 |
|---|---|---|---|
| E-01 | `error: id already exists: r1` | `create` / `group` 的 id 与文档中已有 id 重复（大小写敏感） | 【明文】§4.2 |
| E-02 | `error: no such shape: r9` | 命令中的目标 id 不存在（`delete` / `move` / `scale` / `set` / `group` 成员 / `addto` / `front` / `back` / `show` / `tree`） | 【明文】§4.2 |
| E-03 | `error: no such container: node9` | `in <containerId>` / `addto` 的目标容器 id 不存在 | 【明文】§4.2 |
| E-04 | `error: not a container: start` | `in` / `addto` / `ungroup` 的目标存在但不是 `g` 类型 | 【明文】§4.2 |
| E-05 | `error: unknown shape type: hexagon (is the plugin loaded?)` | 类型名未注册（**本阶段 `create box` → `error: unknown shape type: box (is the plugin loaded?)`**） | 【明文】§4.2、§4.4 |
| E-06 | `error: cannot ungroup composite shape: n1` | `ungroup` 目标是复合图形（内部结构由插件拥有）。本阶段无 `box`，该分支**保留但不可达**，文案需实现到位以备后续阶段 | 【明文】§4.2、§4.4 |
| E-07 | `error: cannot group a container into its own descendant: g1` | `group` 的成员中同时包含某容器及其子孙（错误串点名**作为子孙的容器 id**） | 【明文】§4.2、§6 |
| E-08 | `error: cannot ungroup top-level container: scene` | `ungroup` 的目标是 `<svg>` 的直接子节点容器 | 【明文】§4.2 |
| E-09 | `error: scale factor must be positive` | `scale` 的 factor ≤ 0 | 【明文】§4.2 |
| E-10 | `error: cannot read file: a.svg` | `read` 的文件不存在 / 不可读 / 无法解析 | 【明文】§4.2 |
| E-11 | `error: cannot write file: a.svg` | `save` 目标路径不可写 / 目录不存在 | 【明文】§4.2 |
| E-12 | `error: no document. use 'init' or 'read' first` | 未 `init` / `read` 就执行其它命令（`init` / `read` / `help` 本身除外） | 【明文】§4.2 |
| E-13 | `error: unknown attribute: <attr>` | `set` 的属性不在白名单内（占位符替换为实际属性名，如 `error: unknown attribute: opacity`） | 【明文】§4.1 |
| E-14 | `error: undo not allowed after io command` | 文档类命令（`init` / `read` / `save` / `canvas` 改尺寸）执行后调用 `undo` 或 `redo` | 【明文】§4.3、§6 |
| E-15 | `error: nothing to undo` | `undo` 时撤销栈为空（建议文案） | 【裁决】见 Q9 |
| E-16 | `error: nothing to redo` | `redo` 时重做栈为空（建议文案；亦用于"undo 后有新编辑清空 redo 栈"的场景） | 【裁决】见 Q9 |
| E-17 | `error: invalid id: must not be empty` | `create` / `group` 的 id 为空串或纯空白（id 是唯一寻址依据，空 id 会产生畸形标题 `rect#`） | 【裁决】v1.1 新增，见 §9 |
| E-18 | `error: no file path. use 'save <file.svg>'` | `save` 无参，但当前文档来自 `init` 且从未显式 `save` 过（没有可回退的路径） | 【裁决】v1.1 新增，见 §9 |

> **告警文案（非错误，不改变任何状态）**：① `warning: assigned id <id> to unnamed <tag>` —— 读入外部 SVG 时自动补 id；② `warning: skipped unsupported element: <tag>` —— 读入未建模的元素标签（如 `<path>`），忽略且不计入元素数；③ `warning: skipped attribute <name> on <tag>#<id>` —— 读入未建模的属性（如 `transform`），忽略并在 §9 说明的语义边界内显式提示。

---

### 4.9 §6 典型会话逐字契约

> 整段可直接作为回归测试的黄金脚本（输入行 → 期望 stdout）。

| # | 输入（逐字） | 期望输出（逐字） | 备注 |
|---|---|---|---|
| T-01 | `init 800 600` | `canvas 800x600 created` | R-10 |
| T-02 | `create rect bg 0 0 800 600 #ffffff` | `rect#bg created` | R-20 |
| T-03 | `create text title 20 40 "My Diagram"` | `text#title created` | R-20 |
| T-04 | `create circle c1 100 100 20 red` | `circle#c1 created` | R-20 |
| T-05 | `create rect box 200 80 60 60 #3366ff` | `rect#box created` | R-20 |
| T-06 | `group markers c1 box` | `g#markers created with 2 children` | R-29 |
| T-07 | `tree` | `svg (800x600)`<br>`├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff`<br>`├── text#title     (20,40) "My Diagram"`<br>`└── g#markers`<br>`    ├── circle#c1  cx=100 cy=100 r=20 fill=red`<br>`    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff` | R-50/R-51 + §6 逐字 |
| T-08 | `move c1 30 0` | `circle#c1 moved to (130,100)` | R-25 |
| T-09 | `undo` | `circle#c1 moved back to (100,100)` | R-44 |
| T-10 | `redo` | `circle#c1 moved to (130,100)` | R-45 |
| T-11 | `set title text "My Diagram v2"` | `text#title updated: text="My Diagram v2"` | R-28 |
| T-12 | `undo` | `text#title updated: text="My Diagram"` | R-44 |
| T-13 | `group bad c1 markers` | `error: cannot group a container into its own descendant: markers` | E-07 |
| T-14 | `delete box` | `rect#box deleted` | R-24 |
| T-15 | `undo` | `rect#box restored into g#markers` | R-44 |
| T-16 | `save demo.svg` | `saved to demo.svg (5 elements)` | R-12 |
| T-17 | `undo` | `error: undo not allowed after io command` | E-14 |
| T-18 | `read other.svg` | `warning: assigned id rect1 to unnamed <rect>`<br>`read other.svg (7 elements)` | R-62 / R-11 |
| T-19 | `tree` | `svg (400x300)`<br>`├── rect#rect1     x=0 y=0 w=400 h=300 fill=#ffffff`<br>`├── text#t1        (10,290) "imported"`<br>`├── circle#c1      cx=50 cy=50 r=10`<br>`├── g#g1`<br>`│   ├── rect#r2    x=0 y=0 w=10 h=10`<br>`│   └── circle#c2  cx=5 cy=5 r=2`<br>`└── ellipse#e1     cx=1 cy=2 rx=3 ry=4` | R-51 + §6 逐字 |
| T-20 | `create g node1` | `g#node1 created` | R-20 |
| T-21 | `create rect start 120 100 160 60 #4a90d9 in node1` | `rect#start created in g#node1` | R-21 |
| T-22 | `create text start-label 155 135 "开始" in node1` | `text#start-label created in g#node1` | R-21 |
| T-23 | `move node2 0 100` | `g#node2 moved by (0,100)` | R-25 |
| T-24 | `undo` | `g#node2 moved back by (0,-100)` | R-44 |
| T-25 | `create box n1 120 100 160 60 "开始"` | `error: unknown shape type: box (is the plugin loaded?)` | E-05 / R-22 |

---

### 4.10 工程与流程约束

> 本节需求来自规格 §1 / §2.1，属于**可被检查**的约束；具体架构方案由架构师产出，本 PRD 只规定"必须满足什么"。

| ID | 需求 | 优先级 | 验收标准（可断言） | 来源 |
|---|---|---|---|---|
| R-80 | TypeScript + 面向对象实现 | P0 | 类层次 + 多态、字段封装；**一类一文件，文件名 = 类名**；禁止"贫血模型（公共数据袋）+ 过程式自由函数 + 到处 `switch(tag)` 分派"的写法 | 【明文】§2.1 |
| R-81 | **按名字分派只允许两处** | P0 | 全仓库中"按名字分派"只出现在：① **命令分发**（命令名 → 命令实现）；② **图形工厂**（类型名 → 类）。**架构方案（README「架构方案」节）必须显式标注这两处为「待重构」**，并说明重构方向 | 【明文】§2.1 |
| R-82 | 文档结构 | P0 | `doc/README.md`（Markdown）含四节：架构方案（模块划分 + 组件图/包图、设计模式与落地、依赖方向规则、变化点假设）、过程记录、一致性自查、质量保证手段 | 【明文】§1.2 |
| R-83 | Git 提交规范 | P0 | 全程 git 管理并推送远程仓库（GitHub 或 Gitee）；提交历史体现**分步推进**，禁止 one-shot 大提交；**最终提交处打 tag `final`**，且早于截止时间 | 【明文】§1.1 |
| R-84 | 使用 AI 智能体协作 | P0 | 过程记录中体现与 AI（Codex、Qoder 等）协作的**发现 / 确认 / 纠正**过程 | 【明文】§2.1、§1.2 |
| R-85 | 插件化扩展缝隙（不实现） | P0 | 内核**不含** box 的任何实现代码；但类型注册点（图形工厂）与命令注册点（命令分发）应允许后续插入 `ShapeProvider` 插件；README「变化点假设」中列出该项 | 【明文】§2.1、§4.4 |

---

### 4.11 P1 / P2 增强项

| ID | 需求 | 优先级 | 验收标准 | 来源 |
|---|---|---|---|---|
| R-90 | `show` 对容器 / text 的展示 | P1 | `show g1` → 逐字 `g#markers  parent=svg` + `  children=2`；`show t1` → 逐字 `text#title  parent=svg` + `  x=20 y=40` + `  text="My Diagram"`（属性名用 `set` 白名单中的 `width`/`height` 而非树中的 `w`/`h`） | 【裁决】见 Q6 |
| R-91 | `scale` / `group` / `ungroup` / `addto` / `front` / `back` 的成功回显 | P1 | 建议逐字：`circle#c1 scaled by 2`、`g#markers created with 2 children`、`g#g1 ungrouped`、`rect#r1 added to g#g1`、`rect#r1 moved to front`、`rect#r1 moved to back` | 【裁决】见 Q8 |
| R-92 | `group` 后子节点顺序 | P1 | 新容器子节点顺序 = 命令行中给出 id 的顺序（与"保持相对顺序"一致时无差异） | 【裁决】见 Q6 |
| R-93 | 数值格式化 | P1 | 整数坐标回显为 `100` 而非 `100.0`；小数保留原值（如 `12.5`） | 【裁决】见 Q12 |
| R-94 | `help` 完整文案 | P2 | 逐字覆盖 §3 全部 14 个命令与语法，建议见 Q10 | 【裁决】 |
| R-95 | 脚本回放 / 批量文件 | P2 | **本阶段不实现**；README「变化点假设」中说明"留了什么缝、为什么不做" | 【裁决】§1.2 |

---

## 5. 交互稿

### 5.1 REPL 会话形态

```text
$ npm run cli
svg-editor 0.1 — type 'help' for commands

svg> init 800 600
canvas 800x600 created
svg> create rect bg 0 0 800 600 #ffffff
rect#bg created
svg> create text title 20 40 "My Diagram"
text#title created
svg> create circle c1 100 100 20 red
circle#c1 created
svg> create rect box 200 80 60 60 #3366ff
rect#box created

svg> group markers c1 box
g#markers created with 2 children

svg> # 注释行：无输出
svg> create box n1 120 100 160 60 "开始"
error: unknown shape type: box (is the plugin loaded?)

svg> save demo.svg
saved to demo.svg (5 elements)
svg> undo
error: undo not allowed after io command
```

**形态约定**

- 提示符 `svg> ` 固定出现在每一行输入之前；用户输入与程序输出同屏，交替出现。
- 成功回显为**单行**摘要，格式 `<tag>#<id> <verb> …`。
- 错误回显为**单行** `error: …`，命令失败后文档不变，可直接重试。
- 注释与空行不产生任何输出。

### 5.2 `tree` 输出形态

```text
svg> tree
svg (800x600)
├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff
├── text#title     (20,40) "My Diagram"
└── g#markers
    ├── circle#c1  cx=100 cy=100 r=20 fill=red
    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff
```

- 首行 `svg (<w>x<h>)` = 画布尺寸。
- 树形字符：`├── `（非末子）、`└── `（末子）、`│   `（祖先延续）、空格（祖先已结束）。
- **容器行只有 `tag#id`，不带属性行**，也不参与属性列宽计算。
- 所有属性行对齐到**同一绝对列**（见 §6）。

### 5.3 `show` 输出形态

```text
svg> show c1
circle#c1  parent=g#markers
  cx=100 cy=100 r=20
  fill=red
```

- 第 1 行：`tag#id` + 两个空格 + `parent=<父容器id>`。
- 第 2 行起：缩进 2 空格，几何属性一行、绘制属性（`fill`/`stroke`/`stroke-width`）一行；未设置的属性不出现。

### 5.4 错误输出形态

```text
svg> delete r9
error: no such shape: r9
svg> tree
svg (800x600)
├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff
…                     ↑ 与出错前完全一致（失败不改变状态）
```

---

## 6. 关键契约详解：tree 对齐规则

### 6.1 规则（可实现、可断言）

1. **只统计带属性行的节点**：叶子节点有属性行；容器节点（`g`）**不产生属性行**，因此**不参与列宽计算**。
2. 对每个带属性行的节点计算 `endCol = 4 × depth + len("<tag>#<id>")`：
   - `depth` 从 1 起（根 `<svg>` 记 0，其直接子节点为 1）；
   - `4 × depth` 恰好等于该行树形前缀的绘制长度（`├── ` 4 字符，每深一层加 4）。
3. **属性列** `col = 2 + max(endCol)`（对本次 `tree` 输出内的全部带属性行取最大值）。
4. 渲染每个属性行时：在 `tag#id` 之后补足空格，使属性文本从第 `col` 列开始；空格数 = `col − (4×depth + len(tag#id))`。
5. 若某行的 `4×depth + len(tag#id)` 已 ≥ `col`（名字过长），该行至少保留 **1 个空格**。
6. 该列对**整棵树**统一生效（不同层级共享同一绝对列），这也是 §5.1 / §6 两处示例的共同特征。

### 6.2 用 §5.1 演算（结果必须逐字等于规格）

| 节点 | depth | 树形前缀长 | `len(tag#id)` | `endCol` |
|---|---|---|---|---|
| `rect#bg` | 1 | 4 | 7 | 11 |
| `text#title` | 1 | 4 | 10 | 14 |
| `circle#c1` | 2 | 8 | 9 | **17** |
| `rect#box` | 2 | 8 | 8 | 16 |

`col = 2 + 17 = 19` →

```text
├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff      ← 名称结束于 11，空 8 格 → 19
├── text#title     (20,40) "My Diagram"                    ← 名称结束于 14，空 5 格 → 19
└── g#markers                                                ← 容器，无属性行
    ├── circle#c1  cx=100 cy=100 r=20 fill=red             ← 名称结束于 17，空 2 格 → 19
    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff        ← 名称结束于 16，空 3 格 → 19
```

与规格 §5.1 / §6 逐字一致 ✅。

### 6.3 与 §6.1 示例的差异（见 Q1）

规格 §6.1 的目标结构块中，`text#process-label` 一行比其兄弟 `rect#process` 晚 2 列开始（自身 `endCol` 为 30，比同级最长者多 2），**同组两行互不对齐**，说明该块为手工排版。按 §6.1 规则重算该树时 `col = 32`，逐字结果为：

```text
svg (800x600)
└── g#flowchart
    ├── g#node1
    │   ├── rect#start          x=120 y=100 w=160 h=60 fill=#4a90d9
    │   └── text#start-label    (155,135) "开始"
    ├── g#node2
    │   ├── rect#process        x=520 y=100 w=160 h=60 fill=#f5a623
    │   └── text#process-label  (545,135) "处理数据"
    └── line#arrow1             (280,130) -> (520,130)
```

**结构、顺序、属性内容与规格完全一致，仅属性列位置不同**（差异 2~3 个空格）。裁决见 Q1。

---

## 7. 待确认问题与裁决建议

| # | 问题 | 规格现状 | 建议裁决 | 影响面 |
|---|---|---|---|---|
| **Q1** | **`tree` 属性列对齐规则存在自相矛盾**：§5.1 与 §6（两处）互为一致，可由"全局单列 = max(4×depth+len(name)) + 2"逐字复现；而 §6.1 的目标结构块内部即自相矛盾（`rect#process` 与 `text#process-label` 同组却分别起始于第 29 / 31 列），不可能由任何确定性规则产生 | 规格未给对齐规则 | **采纳全局单列规则**（§6.1），理由：它能逐字复现 §5.1 与 §6 两处、且被明确写为"显示格式"章节的示例；§6.1 视为手工排版，**仅空格不同、结构与内容相同**。若评审坚持逐字对齐 §6.1，则需为该块单列特判——不推荐 | R-51；QA 黄金文件 |
| **Q2** | 外部 SVG 自动补 id 的**序号口径**：只说"标签名+序号" | 未定义序号作用域与冲突处理 | 按**同标签计数**（`rect`→`rect1`、`rect2`…；`text`→`text1`…），序号从 1 起；若补出的 id 与既有 id 冲突则顺延；告警中的 id 为**实际补出的 id** | R-62、R-63 |
| **Q3** | `canvas` 两条分支的**输出文案**未给 | 规格只写"显示/修改尺寸" | 显示 → `canvas 800x600`；修改 → `canvas 800x600 updated`（与 `init` 的 `canvas 800x600 created` 同族） | R-14、R-15 |
| **Q4** | `canvas <w> <h>` 是否**缩放已有元素** | 未说明 | **不缩放**：只改根 `<svg>` 的 `width`/`height`；`viewBox` 保持不变（内容随画布缩放，不裁剪、不丢坐标） | R-15 |
| **Q5** | `init` / `read` 后**undo 栈**是否清空；`save` 后 undo 栈内容是否保留 | 规格只说 IO 后禁 undo/redo | `init`/`read` **清空** undo/redo 栈（新文档，旧历史无意义）；`save` **保留**栈内容但锁死入口，直到下一次编辑命令解锁 | R-16、R-43 |
| **Q6** | `show` 对容器 / text 的输出格式；`group` 后子节点顺序 | 未给 | 容器 → `g#markers  parent=svg` + `  children=2`；text → `text#title  parent=svg` + `  x=20 y=40` + `  text="My Diagram"`（属性名用 `set` 白名单的 `width`/`height`）。`group` 子节点顺序 = 命令行给出顺序 | R-90、R-92 |
| **Q7** | 未知命令 / 参数缺失的文案 | 未给 | `error: unknown command: foo`；`error: usage: create <type> <id> [params…] [in <containerId>]` | R-05 |
| **Q8** | `scale` / `ungroup` / `addto` / `front` / `back` 的成功文案 | 未给 | `circle#c1 scaled by 2`、`g#g1 ungrouped`、`rect#r1 added to g#g1`、`rect#r1 moved to front`、`rect#r1 moved to back` | R-26、R-31~R-33、R-91 |
| **Q9** | undo/redo 栈为空的文案 | 未给 | `error: nothing to undo` / `error: nothing to redo`（后者亦用于"undo 后有新编辑清空 redo 栈"） | R-40、E-15、E-16 |
| **Q10** | `help` 的输出格式 | 只说"显示全部命令与语法" | 建议逐字：<br>`commands:`<br>`  init [w] [h]                      new empty canvas`<br>`  read <file.svg>                   read svg file`<br>`  save [file.svg]                   save document`<br>`  canvas [w] [h]                    show or resize canvas`<br>`  create <type> <id> [params...] [in <containerId>]`<br>`  delete <id> / move <id> <dx> <dy> / scale <id> <factor>`<br>`  set <id> <attr> <value> / group <newGid> <id...> / ungroup <gid>`<br>`  addto <gid> <id> / front <id> / back <id>`<br>`  tree [id] / show <id> / undo / redo / help` | R-53、R-94 |
| **Q11** | 空文档 / 叶子子树的 `tree` 输出 | 未给 | 空文档 → 仅 `svg (800x600)`；叶子子树 → 仅 `rect#bg` | R-54 |
| **Q12** | 浮点数值的回显格式 | 未给 | 整数 → `100`（不带 `.0`）；小数 → 保留原值（`12.5`） | R-93 |
| **Q13** | 文档目录名：规格 §1.2 写 `doc/README.md`，而工程现状为 `docs/` | 规格与现状不一致 | **以规格为准**：最终提交物放 `doc/README.md`；`docs/PRD.md` 作为过程产物保留（若评审要求统一目录，则整体迁移到 `doc/`，并在此处记录修订） | R-82 |
| **Q14** | §6.1 中 `line#arrow1` 以 `black` 创建，但树中只显示 `(280,130) -> (520,130)`、**不显示 stroke** | 规格内部信息缺失 | **按规格逐字**：`line` 在树中只显示坐标对；`stroke` 通过 `show` 查看（保 §6.1 黄金文件逐字可用）。若评审希望树内联 stroke，则改为 `(280,130) -> (520,130) stroke=black`，并同步更新 §6.1 黄金 | R-51 |
| **Q15** | `group` 新容器的挂载位置未定义 | 未说明 | 新容器挂到**根画布**（`<svg>`）下，作为其最后一个子节点；若成员原本都在同一个父容器下，可选择"插入到该父容器的原位置"——**建议取前者**（实现更简单、行为更可预测） | R-29、R-92 |

---

## 8. 附录

### 8.1 术语

| 术语 | 含义 |
|---|---|
| 文档（document） | 当前内存中的一棵 SVG 元素树 + 画布尺寸；由 `init` / `read` 建立 |
| 元素（element） | 树中的节点；分**容器**（`g`）与**叶子**（rect/circle/ellipse/line/text）两类 |
| Composite 语义 | 容器与叶子共用同一套操作接口；容器操作作用于整棵子树 |
| 文档类命令 | `init` / `read` / `save` / `canvas`（改尺寸）；执行后禁 undo/redo |
| 编辑类命令 | `create` / `delete` / `move` / `scale` / `set` / `group` / `ungroup` / `addto` / `front` / `back`；一条 = 一个 undo 单元 |
| 显示类命令 | `tree` / `show` / `help`；不进 undo 栈 |
| undo 单元 | 一条编辑命令及其完整逆操作；`group` 多元素为一个单元 |

### 8.2 需求条目索引（速查）

| 分组 | 编号 | 条数 |
|---|---|---|
| CLI 外壳 | R-01 ~ R-05 | 5 |
| 文档类 | R-10 ~ R-16 | 7 |
| 图形编辑类 | R-20 ~ R-34 | 15 |
| 撤销重做 | R-40 ~ R-45 | 6 |
| 显示类 | R-50 ~ R-54 | 5 |
| SVG 读写 | R-60 ~ R-64 | 5 |
| 工程约束 | R-80 ~ R-85 | 6 |
| 增强项 | R-90 ~ R-95 | 6 |
| 错误表 | E-01 ~ E-16 | 16（逐字文案） |
| 逐字会话契约 | T-01 ~ T-25 | 25（逐字期望输出） |
| **合计需求条目** | | **55**（P0 44 / P1 9 / P2 2） |

### 8.3 引用

- 规格原文：`E:/高级软开/phase_cli_1.md`
  - §2 通用约定、§2.1 实现范式
  - §3 命令总表、§4.1 create 参数表、§4.2 错误信息约定、§4.3 undo/redo 粒度、§4.4 复合图形 `box`（后续阶段）
  - §5.1 tree、§5.2 show、§6 典型会话 transcript、§6.1 两节点流程图

---

## 9. 修订记录（v1.1 · QA 独立验收后）

> 本节记录 PRD 在实现与 QA 验收过程中被修订的内容。所有修订均由**规格原文**或**QA 实测证据**驱动，不降低任何验收强度；修订项同步反映在 `doc/README.md` 的「一致性自查」与「过程记录」中。

| # | 位置 | 修订前 | 修订后 | 驱动依据 |
|---|---|---|---|---|
| PR-1 | §4.1 / §8.2 计数 | 需求条目 57 条（P0 45 / P1 10 / P2 2） | **55 条（P0 44 / P1 9 / P2 2）** | 表格实际枚举 55 条 R-xx，原计数与表格不符（QA 观察项 O-11） |
| PR-2 | R-12 | 「无参时保存到最近一次 `read` 的路径」 | 明确为「最近一次**显式 save** 的路径；无显式 save 则退回最近一次 read 的路径；两者皆无 → E-18」 | 规格 §3 只规定"读入时的路径"，未规定"先 save 再无参 save"的链；实现取**更可预测**的语义并在此写实（QA 缺陷 D-03） |
| PR-3 | R-30 括注 | 「错误串中点名的是**作为子孙的容器 id**」 | 「点名的是**那个自身包含了另一成员作为子孙的容器**」 | 原括注与规格 §6 的逐字示例矛盾（§6 中 `markers` 是包含 `c1` 的**祖先**容器）。实现按 §6 正确，无需改码，仅修正文档表述（QA 观察项 O-06） |
| PR-4 | E-04 触发条件 | `in` / `addto` 目标存在但不是 `g` 类型 | 补入 `ungroup` | `ungroup <叶子>` 复用同一条文案；原文未枚举该触发点（QA 缺陷 D-06） |
| PR-5 | §4.8 | — | **新增 E-17**（空 id 拒绝）、**E-18**（save 无路径），并补充三条**告警文案**说明 | QA 缺陷 D-07（空 id 产生畸形标题 `rect#`）与 D-09（save 无参无路径）；告警为非错误、不改变状态 |
| PR-6 | R-61 | 「未识别的属性忽略但不报错」 | 「未识别的**属性**忽略、**不报错**但产出 `warning: skipped attribute …` 告警」；未识别的**元素**忽略并产出 `warning: skipped unsupported element: …` 告警 | QA 缺陷 D-02：未建模属性被**静默**丢弃是唯一 P1 问题。**决定不做属性透传**——若透传 `transform`，对含 transform 的容器执行 `move`/`scale`（本阶段作用于子孙自身坐标）会与组级变换叠加，产生"看似保真、实则语义错误"的结果；完整解法是**组变换建模**，超出本阶段范围（与 `box` 插件化同理：留缝不实现）。故改为**显式告警 + 文档声明** |
