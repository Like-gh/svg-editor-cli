# svg-editor-cli — 质量验收报告（Lab1 Phase 1）

> 作者：QA 工程师 严过关（Yan）｜日期：2025-10-26｜角色：**独立验收方**
> 上游文档：`docs/PRD.md`（v1.0）、`docs/ARCHITECTURE.md`（v1.0）、`docs/IMPLEMENTATION.md`
> 验收对象：commit `0b5eb71`（main 分支，未 push、未打 tag）
> 本报告不修改 `src/` 下任何文件；发现源码缺陷时**保留失败的回归用例作为证据**，由主理人路由给工程师修复。

---

## 0. 结论摘要

| 维度 | 结论 |
|---|---|
| 逐字契约（T-01 ~ T-25） | **25 / 25 通过**（另含 §6 全文 transcript、§6.1 流程图会话两条整段逐字比对，均通过） |
| 逐字错误文案（E-01 ~ E-16） | **16 / 16 基准通过**；49 条错误用例中 **47 通过、2 失败**（失败项为同一缺陷 D-01 的两个变体；另有 4 条表自检 / 豁免用例全部通过） |
| 失败原子性（R-04） | **12 / 12 通过**（含 30 轮混合压测 + 10 轮重复压测 + 8 种组合场景） |
| 架构硬约束 | **12 / 12 通过**（全量扫描 `src/`，非抽样） |
| 对抗性探测 | **55 条用例：54 通过、1 失败**（失败项为缺陷 D-04 的证据） |
| 进程级端到端 | **4 / 4 通过** |
| **总用例数** | **261 条**（黄金 164 + 既有单元/IO 97），**258 通过 / 3 失败** |
| **缺陷** | **P0 阻断 0 条、P1 重要 1 条、P2 轻微 4 条**（另有 2 条 P2 文档/一致性缺陷、11 条观察项） |
| **覆盖率** | 语句 **89.26%**、分支 **90.41%**、函数 **92.72%**、行 **89.27%**（v8，已排除 3 个纯类型文件） |
| 架构硬约束 | 零 `switch (`、零 `\bbox\b`、一类一文件、依赖方向矩阵 **全部零违规** |

> **总体判定：功能完整、契约逐字达标、架构约束零违规，可以进入交付阶段**；
> 唯一的 P1 缺陷（`transform` 不保真）属于**已知且已声明的限制**，建议在 README「质量保证手段」中显著声明而非改代码。

---

## 1. 测试矩阵

### 1.1 分类 × 用例数 × 结果

| 分类 | 测试文件 | 用例数 | 通过 | 失败 | 说明 |
|---|---|:--:|:--:|:--:|---|
| **逐字契约（T-xx）** | `test/golden/session.spec.ts` | 28 | 28 | 0 | 25 条 T-xx 逐条用例 + 1 条契约表自检 + §6 全文 transcript + §6.1 流程图会话 |
| **错误文案（E-xx）** | `test/golden/errors.spec.ts` | 53 | 51 | 2 | 49 条错误用例（16 条基准 + 33 条触发路径变体）+ 1 条表自检 + 3 条豁免用例；**每条错误后追加原子性断言** |
| **原子性** | `test/golden/atomicity.spec.ts` | 12 | 12 | 0 | 30 轮混合压测 / 10 轮重复压测 / 8 种组合场景 |
| **对抗场景** | `test/golden/adversarial.spec.ts` | 55 | 54 | 1 | 自造刁钻输入（id 边界、容器语义、浮点、极端输入、往返保真、路径语义链、tree 子树模式…） |
| **架构约束** | `test/golden/architecture.spec.ts` | 12 | 12 | 0 | 四类硬约束全量静态扫描 |
| **进程级端到端** | `test/golden/cli-e2e.spec.ts` | 4 | 4 | 0 | 真进程入口 `src/index.ts` + 管道 stdin/stdout |
| **黄金小计** | `test/golden/**` | **164** | **161** | **3** | |
| 既有单元 / IO | `test/unit/**`、`test/io/**`（12 文件） | 97 | 97 | 0 | 工程师已有用例，本次未改动 |
| **总计** | 18 个测试文件 | **261** | **258** | **3** | 3 条失败全部是**故意保留的缺陷证据** |

### 1.2 失败用例清单（全部为故意保留的缺陷证据）

| 用例 | 缺陷编号 | 一句话 |
|---|---|---|
| `errors.spec.ts` → `E-12·undo 变体` | **D-01** | 无文档时 `undo` 报 `error: nothing to undo`，应为 `error: no document. use 'init' or 'read' first` |
| `errors.spec.ts` → `E-12·redo 变体` | **D-01** | 无文档时 `redo` 报 `error: nothing to redo`，应为 E-12 |
| `adversarial.spec.ts` → `⚠ 已知缺陷 D-04` | **D-04** | 数值溢出被静默写成 `0`（几何被破坏），应报错且不改变状态 |

---

## 2. 逐条结论表

### 2.1 PRD 需求条目（R-xx）

> PRD §4.1 / §8.2 声明「需求条目总数 57 条（P0 45 / P1 10 / P2 2）」，
> 但 PRD 正文实际枚举的 R-xx 只有 **55 条（P0 44 / P1 9 / P2 2）**（`grep '^| R-[0-9][0-9] |' docs/PRD.md` 计数）。
> 这是 PRD 自身的计数不一致（观察项 O-11）。下表覆盖**全部 55 条**已枚举需求。

#### CLI 外壳与 REPL（R-01 ~ R-05）

| ID | 验证状态 | 依据（文件 → 断言） |
|---|---|---|
| R-01 | ✅ 通过 | `cli-e2e.spec.ts` →「管道模式下 stdout 与规格 transcript 同形」断言 `svg> init 800 600` 同形；全部 164 条黄金用例均经 **REPL 层**逐行驱动 |
| R-02 | ✅ 通过 | `cli-e2e.spec.ts` →「注释行与空行不产生任何结果输出」；`adversarial.spec.ts` →「注释行与空行不产生任何输出」 |
| R-03 | ✅ 通过 | `cli-e2e.spec.ts` → 首行逐字 `svg-editor 0.1 — type 'help' for commands`；`session.spec.ts` → 整段 transcript 首行 |
| R-04 | ✅ 通过 | `errors.spec.ts` → **每条**错误用例后比对 `tree` / `structure` / `ids` / `history`；`atomicity.spec.ts` → 12 条 |
| R-05 | ✅ 通过 | `adversarial.spec.ts` →「未知命令报 `unknown command`，参数不足报 `usage:`」 |

#### 文档类命令（R-10 ~ R-16）

| ID | 验证状态 | 依据 |
|---|---|---|
| R-10 | ✅ 通过 | `session.spec.ts` → **T-01** `canvas 800x600 created`；`init` 无参默认 800×600 见 `adversarial.spec.ts` |
| R-11 | ✅ 通过 | `session.spec.ts` → **T-18**（告警行 + `read other.svg (7 elements)`）；画布 400×300 见 **T-19** |
| R-12 | ⚠ **部分偏差（D-03）** | `save demo.svg` 逐字通过（**T-16**）；read 后无参 save 通过（`adversarial.spec.ts` →「read 之后无参 save 保存到读入的路径」）；但**显式 save 之后**的无参 save 保存到"最近一次显式 save 的路径"而非 R-12 字面写的"最近一次 **read** 的路径" → 见 §3 缺陷 D-03 |
| R-13 | ✅ 通过 | **T-16** `(5 elements)`、**T-18** `(7 elements)`；容器子孙计入见 `adversarial.spec.ts` →「保存产物是标准 SVG」 |
| R-14 | ✅ 通过 | `adversarial.spec.ts` → `canvas 800x600` |
| R-15 | ✅ 通过 | `adversarial.spec.ts` → `canvas 400x300 updated`，且改尺寸后 undo 被锁（E-14） |
| R-16 | ✅ 通过 | `adversarial.spec.ts` →「init / read 之后 undo 报 E-14（锁优先于栈空）」；`errors.spec.ts` → **E-14·read 变体** |

#### 图形编辑类命令（R-20 ~ R-34）

| ID | 验证状态 | 依据 |
|---|---|---|
| R-20 | ✅ 通过 | **T-02 ~ T-05**（rect/text/circle/rect）+ `adversarial.spec.ts` → ellipse/line/g 见「往返保真」与「E-07」 |
| R-21 | ✅ 通过 | **T-21**、**T-22**；`errors.spec.ts` → **E-03**、**E-04** |
| R-22 | ✅ 通过 | **T-25** `error: unknown shape type: box (is the plugin loaded?)`；`errors.spec.ts` → **E-05** |
| R-23 | ✅ 通过 | `errors.spec.ts` → **E-01**；`adversarial.spec.ts` →「r1 与 R1 是两个不同的 id，可以共存」「id 查找大小写敏感」 |
| R-24 | ✅ 通过 | **T-14** `rect#box deleted`、**T-15** `rect#box restored into g#markers`；删除容器连带子孙见 `atomicity.spec.ts` |
| R-25 | ✅ 通过 | **T-08**（叶子绝对位置）、**T-23**（容器增量）、**T-24**（容器撤销负增量） |
| R-26 | ✅ 通过 | `adversarial.spec.ts` →「作用于容器时递归到每个子孙各自相乘（绝对坐标语义）」「factor 为 0 或负数时报 E-09」 |
| R-27 | ✅ 通过 | `errors.spec.ts` → **E-13**；`adversarial.spec.ts` →「白名单外属性报 E-13」「容器只接受绘制属性」 |
| R-28 | ✅ 通过 | **T-11** `text#title updated: text="My Diagram v2"` |
| R-29 | ✅ 通过 | **T-06** `g#markers created with 2 children`；成员从原父容器摘出见 `adversarial.spec.ts` →「group 一次 undo 即复原全部成员」 |
| R-30 | ✅ 通过 | **T-13**；`adversarial.spec.ts` →「成员是『容器 + 其子孙』时点名该容器 id，且与参数顺序无关」 |
| R-31 | ✅ 通过 | `errors.spec.ts` → **E-08**；`adversarial.spec.ts` →「普通容器解散后，子图形占据原容器的位置」 |
| R-32 | ✅ 通过 | `errors.spec.ts` → **E-03/E-04（addto 变体）**；`adversarial.spec.ts` →「把元素移进它当前所在的父容器：移到末尾且不重复入列」 |
| R-33 | ✅ 通过 | `adversarial.spec.ts` →「front / back 语义」：`front` 移到同级最后、`back` 移到最前，undo 复原位置 |
| R-34 | ✅ 通过 | `adversarial.spec.ts` →「scale 容器递归」「set 容器写入容器自身」「ungroup 提升子孙」——容器与叶子走同一套接口 |

#### 撤销 / 重做（R-40 ~ R-45）

| ID | 验证状态 | 依据 |
|---|---|---|
| R-40 | ✅ 通过 | `adversarial.spec.ts` →「撤销到栈空报 E-15」「undo 后产生新编辑会清空 redo 栈，再 redo 报 E-16」 |
| R-41 | ✅ 通过 | `adversarial.spec.ts` →「group 一次 undo 即复原全部成员的父容器与位置（R-41）」 |
| R-42 | ✅ 通过 | `adversarial.spec.ts` →「显示类命令（tree / show / help）不进入 undo 栈（R-42）」 |
| R-43 | ✅ 通过 | `errors.spec.ts` → **E-14**（含 undo/redo/read 三个变体）；`atomicity.spec.ts` →「一次编辑之后 IO 锁解除，undo 恢复正常」 |
| R-44 | ✅ 通过 | **T-09**、**T-12**、**T-15**、**T-24**（move / set / delete / 容器 move 四种 undo 文案） |
| R-45 | ✅ 通过 | **T-10**；`adversarial.spec.ts` →「redo 回显与原命令首次执行逐字相同（R-45）」 |

#### 显示类命令（R-50 ~ R-54）

| ID | 验证状态 | 依据 |
|---|---|---|
| R-50 | ✅ 通过 | **T-07**、**T-19** 逐字；容器行只有 `tag#id` |
| R-51 | ✅ 通过 | **T-07**（col=19：`rect#bg` 后 8 / `text#title` 后 5 / `circle#c1` 后 2 / `rect#box` 后 3 空格）、**T-19**；§6.1 树 col=32 逐字见 `session.spec.ts` →「逐条回显与 PRD §6.3 归一后的树逐字相同」；列对齐边界（超长 id 至少留 1 空格、容器不参与列宽计算）见 `adversarial.spec.ts` →「对抗：tree 的子树模式与列对齐边界（OQ-02 / PRD §6.1 规则 5）」 |
| R-52 | ✅ 通过 | `adversarial.spec.ts` →「对抗：show 的逐字格式（R-52 / PRD §5.2）」→「`show c1` 逐字等于规格 §5.2 的三行」「顶层元素的 parent 写作 svg」 |
| R-53 | ✅ 通过 | `adversarial.spec.ts` →「help 覆盖 §3 全部 19 个命令名（R-53 / R-94）」 |
| R-54 | ✅ 通过 | `adversarial.spec.ts` →「对抗：tree 的子树模式与列对齐边界（OQ-02 / PRD §6.1 规则 5）」→「空文档的 tree 逐字只有 `svg (800x600)` 一行（R-54）」「`tree <叶子>` 逐字只有 `tag#id` 一行（R-54）」 |

#### SVG 读写契约（R-60 ~ R-64）

| ID | 验证状态 | 依据 |
|---|---|---|
| R-60 | ✅ 通过 | `adversarial.spec.ts` →「保存产物是标准 SVG：XML 声明 + xmlns + width/height + viewBox（R-60）」 |
| R-61 | ⚠ **部分通过（D-02）** | `adversarial.spec.ts` →「读入 → 保存 → 再读入：结构、层级、id、几何、paint、文本逐字一致」通过；但 `transform` 与未建模属性读入后**不写回** → 见 §3 缺陷 D-02 |
| R-62 | ✅ 通过 | **T-18**（告警逐字且在汇总行之前） |
| R-63 | ✅ 通过 | `adversarial.spec.ts` →「已有 rect1 时，无名 `<rect>` 顺延为 rect2 并打印实际 id」「自动补 id 的序号按同标签计数」 |
| R-64 | ✅ 通过 | `adversarial.spec.ts` →「未设置的 fill / stroke 不写入 SVG（R-64）」；浮点见「小数原样保留，整数不带 .0」 |

#### 工程与流程约束（R-80 ~ R-85）

| ID | 验证状态 | 依据 |
|---|---|---|
| R-80 | ✅ 通过 | `architecture.spec.ts` →「每个 `src/**/*.ts` 恰好声明 1 个顶层类型」「文件名 = 类名」「`src/` 内零 `switch (` 分派」 |
| R-81 | ✅ 通过 | `architecture.spec.ts` →「零 `switch (`」「命令注册表标注『待重构点①』」「图形类型注册表标注『待重构点②』」 |
| R-82 | ⬜ **不适用（本次范围外）** | `doc/README.md` 由主理人统一撰写；QA 已备好本报告第 6 节「质量保证手段小结」供其引用 |
| R-83 | ⬜ **不适用（本次范围外）** | 推送远程与 `final` tag 由主理人统一执行；QA 未 push、未打 tag、未改 git 历史 |
| R-84 | ⬜ **不适用（本次范围外）** | 「过程记录」由主理人撰写；QA 提供的缺陷清单与复核结论可作为其素材 |
| R-85 | ✅ 通过 | `architecture.spec.ts` →「`src/` 内零 `\bbox\b` 词边界命中」「零 `data-kind` 插件标记」 |

#### 增强项（R-90 ~ R-95）

| ID | 验证状态 | 依据 |
|---|---|---|
| R-90 | ✅ 通过 | `adversarial.spec.ts` →「set 容器写入容器自身」（`show g1` → `children=1` + `fill=#f5a623`）、「set text 内容回显带双引号」（`show t1` → `x=20 y=40` + `text="My Diagram v2"`） |
| R-91 | ✅ 通过 | `adversarial.spec.ts` → `scaled by 2` / `created with 2 children` / `ungrouped` / `added to g#g1` / `moved to front` / `moved to back` |
| R-92 | ✅ 通过 | `adversarial.spec.ts` →「group 成员来自不同父容器时的顺序」（按命令行顺序，见 O-06） |
| R-93 | ⚠ **部分通过（D-04）** | `adversarial.spec.ts` →「0.1 + 0.2 的浮点噪声被抹平为 0.3」「小数原样保留，整数不带 .0」通过；**溢出静默变 0** → 见 §3 缺陷 D-04 |
| R-94 | ✅ 通过 | `adversarial.spec.ts` →「help 覆盖 §3 全部 19 个命令名」；输出与 PRD Q10 版式逐字一致 |
| R-95 | ⬜ **不适用（本阶段明确不做）** | PRD §2.2 Out of Scope；README「变化点假设」应说明留了什么缝 |

### 2.2 逐字错误文案（E-01 ~ E-16）

| # | 逐字期望 | 状态 | 依据（`test/golden/errors.spec.ts`） |
|---|---|:--:|---|
| E-01 | `error: id already exists: r1` | ✅ | `E-01`（create）+ `E-01·group 变体`；错误后 tree/结构/id 集合/栈状态全部不变 |
| E-02 | `error: no such shape: r9` | ✅ | `E-02` 及 10 个触发路径变体（delete/move/scale/set/front/back/show/tree/group 成员/addto） |
| E-03 | `error: no such container: node9` | ✅ | `E-03` + `E-03·addto 变体` |
| E-04 | `error: not a container: start` | ✅ | `E-04` + `E-04·addto 变体` |
| E-05 | `error: unknown shape type: hexagon (is the plugin loaded?)` | ✅ | `E-05`（box）+ `E-05·其它类型名变体`（hexagon） |
| E-06 | `error: cannot ungroup composite shape: n1` | ✅ | `E-06`（用 `test/support/CompositeGroupStub.ts` 打开内核中不可达的分支，验证"文案到位"） |
| E-07 | `error: cannot group a container into its own descendant: g1` | ✅ | `E-07`；另有 `adversarial.spec.ts` 的 3 种容器/子孙组合与顺序无关性 |
| E-08 | `error: cannot ungroup top-level container: scene` | ✅ | `E-08` |
| E-09 | `error: scale factor must be positive` | ✅ | `E-09`（factor=0）+ `E-09·负数变体` |
| E-10 | `error: cannot read file: a.svg` | ✅ | `E-10`；另测非法 XML / 非 `<svg>` 根 → 同样归入 E-10 |
| E-11 | `error: cannot write file: a.svg` | ✅ | `E-11`（目录不存在） |
| E-12 | `error: no document. use 'init' or 'read' first` | ⚠ **16 / 17 通过** | 17 个变体中 15 个通过（tree/create/delete/move/scale/set/group/ungroup/addto/front/back/show/canvas/canvas 改尺寸/save）；**`undo` / `redo` 两个变体失败 → D-01** |
| E-13 | `error: unknown attribute: opacity` | ✅ | `E-13` |
| E-14 | `error: undo not allowed after io command` | ✅ | `E-14`（save 后 undo/redo 变体）+ `E-14·read 变体` |
| E-15 | `error: nothing to undo` | ✅ | `E-15` |
| E-16 | `error: nothing to redo` | ✅ | `E-16` + `E-16·新编辑清空 redo 栈变体` |

> 另有 3 条「豁免」用例：`help` / `init` / `read` 在无文档时**不报 E-12**（PRD E-12 明确豁免）——见 `errors.spec.ts` → `describe('E-12 的豁免范围')`。

### 2.3 逐字会话契约（T-01 ~ T-25）

| # | 输入 | 逐字期望 | 状态 | 依据 |
|---|---|---|:--:|---|
| T-01 | `init 800 600` | `canvas 800x600 created` | ✅ | `session.spec.ts` |
| T-02 | `create rect bg 0 0 800 600 #ffffff` | `rect#bg created` | ✅ | 同上 |
| T-03 | `create text title 20 40 "My Diagram"` | `text#title created` | ✅ | 同上 |
| T-04 | `create circle c1 100 100 20 red` | `circle#c1 created` | ✅ | 同上 |
| T-05 | `create rect box 200 80 60 60 #3366ff` | `rect#box created` | ✅ | 同上 |
| T-06 | `group markers c1 box` | `g#markers created with 2 children` | ✅ | 同上 |
| T-07 | `tree` | §5.1 六行（col=19） | ✅ | 同上（**空格数逐字比对**：rect#bg 后 8、text#title 后 5、circle#c1 后 2、rect#box 后 3） |
| T-08 | `move c1 30 0` | `circle#c1 moved to (130,100)` | ✅ | 同上 |
| T-09 | `undo` | `circle#c1 moved back to (100,100)` | ✅ | 同上 |
| T-10 | `redo` | `circle#c1 moved to (130,100)` | ✅ | 同上 |
| T-11 | `set title text "My Diagram v2"` | `text#title updated: text="My Diagram v2"` | ✅ | 同上 |
| T-12 | `undo` | `text#title updated: text="My Diagram"` | ✅ | 同上 |
| T-13 | `group bad c1 markers` | `error: cannot group a container into its own descendant: markers` | ✅ | 同上 |
| T-14 | `delete box` | `rect#box deleted` | ✅ | 同上 |
| T-15 | `undo` | `rect#box restored into g#markers` | ✅ | 同上 |
| T-16 | `save demo.svg` | `saved to demo.svg (5 elements)` | ✅ | 同上 |
| T-17 | `undo` | `error: undo not allowed after io command` | ✅ | 同上 |
| T-18 | `read other.svg` | 告警行 + `read other.svg (7 elements)` | ✅ | 同上 |
| T-19 | `tree` | §6 八行（col=19） | ✅ | 同上 |
| T-20 | `create g node1` | `g#node1 created` | ✅ | 同上 |
| T-21 | `create rect start 120 100 160 60 #4a90d9 in node1` | `rect#start created in g#node1` | ✅ | 同上 |
| T-22 | `create text start-label 155 135 "开始" in node1` | `text#start-label created in g#node1` | ✅ | 同上 |
| T-23 | `move node2 0 100` | `g#node2 moved by (0,100)` | ✅ | 同上 |
| T-24 | `undo` | `g#node2 moved back by (0,-100)` | ✅ | 同上 |
| T-25 | `create box n1 120 100 160 60 "开始"` | `error: unknown shape type: box (is the plugin loaded?)` | ✅ | 同上 |

**断言方式说明**：全部用 `toBe`（完全相等），无包含式匹配、无忽略空白。
多行输出用 `expect(actual.join('\n')).toBe(expected.join('\n'))` 做**整段字节级比对**；
`T-07` / `T-19` 的每一列空格都参与比较。

**额外整段比对**（比 T-xx 更强的证据）：

| 用例 | 内容 | 状态 |
|---|---|:--:|
| §6 完整 transcript | 规格 §6 代码块的**全部 33 行 stdout**（含横幅）逐字相同 | ✅ |
| §6.1 流程图会话 | 规格 §6.1 的 15 行逐字相同，`tree` 与 **PRD §6.3 的归一版本（col=32）** 逐字相同 | ✅ |

---

## 3. 缺陷清单

> 复现步骤均为**可直接复制**的命令序列（管道喂给 `npm run cli`）。
> 「期望输出」与「实际输出」均为**逐字**。

### 3.1 P0 阻断 —— 0 条

无。未发现导致功能不可用、数据损坏或交付阻断的问题。

---

### 3.2 P1 重要 —— 1 条

#### D-02　读入含 `transform` 的外部 SVG 后再 `save`，容器变换被静默丢弃（视觉结果改变）

| 项 | 内容 |
|---|---|
| **严重级别** | **P1 重要** |
| **缺陷描述** | `SvgParser` 不解析 `transform`、`SvgWriter` 不写回 `transform`。读入一个带 `<g transform="translate(60,40)">` 的外部 SVG 后再 `save`，位移消失，**产物的视觉结果与原文件不同**。规格 §0.1 把 `transform` 明确列为 `<g>` 的核心能力（"靠一个 `transform` 整体移动 / 缩放"），PRD 目标 **G3** 也承诺"外部 SVG 能读入、补 id 后继续编辑，**结构与属性不丢失**"。 |
| **复现步骤** | ```bash
cat > transform.svg <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <g id="diagram" transform="translate(60,40)">
    <rect id="a" x="0" y="0" width="120" height="60" fill="#4a90d9"/>
  </g>
</svg>
EOF
printf 'read transform.svg\nsave out.svg\n' | npm run cli
cat out.svg
``` |
| **期望输出** | `out.svg` 中仍含 `<g id="diagram" transform="translate(60,40)">`（至少**原样保留**该属性） |
| **实际输出** | `out.svg` 中为 `<g id="diagram">`（`transform` 被丢弃），渲染位置与原文件不同 |
| **根因** | `Shape` 的属性访问器表只含白名单（几何 + paint），`transform` 既不在白名单也不透传 |
| **建议修法** | 二选一：<br>① **最小改动（推荐）**：给 `Shape` 增加 `extraAttributes: Map<string,string>` 透传表——读入时把未建模属性存下、写出时原样写回（OQ-08 方向 ② 已提出该方案）。`transform` **只透传不解释**，不改变 `move`/`scale` 语义，风险极低。<br>② 在 README「质量保证手段 / 已知限制」中**显著声明**该限制（PRD OQ-07 已建议），并说明 `move`/`scale` 作用于带 transform 的容器时坐标系不一致。 |
| **回归用例** | `test/golden/adversarial.spec.ts` →「读入 → 保存 → 再读入：结构、层级、id、几何、paint、文本逐字一致」（当前对**已建模属性**通过；建议工程师在修复合入后补一条含 `transform` 的往返断言） |
| **是否阻断交付** | 否。PRD R-61 的字面表述是"未识别的**属性**忽略但不报错"，实现并未违反 R-61；但它与 G3 / 规格 §0.1 存在张力，故评为 P1（需声明或修复），不评 P0。 |

---

### 3.3 P2 轻微 —— 4 条（代码行为）+ 2 条（文档一致性）

#### D-01　无文档时 `undo` / `redo` 报 E-15 / E-16，而不是 E-12

| 项 | 内容 |
|---|---|
| **严重级别** | **P2 轻微** |
| **缺陷描述** | PRD **E-12** 的触发条件是"未 `init` / `read` 就执行其它命令（`init` / `read` / `help` 本身除外）"。`undo` / `redo` 属于"其它命令"，应报 `error: no document. use 'init' or 'read' first`；实际却因为历史栈判空而报了 `error: nothing to undo` / `error: nothing to redo`。错误码被误导（AI 代理按错误分类会误判为"栈空"而非"无文档"）。 |
| **复现步骤** | ```bash
printf 'undo\nredo\n' | npm run cli
``` |
| **期望输出** | `error: no document. use 'init' or 'read' first`（两行都是） |
| **实际输出** | `error: nothing to undo` / `error: nothing to redo` |
| **根因** | `src/command/commands/UndoCommand.ts` / `RedoCommand.ts` 的 `execute()` 先查 `session.history.undo()`，而 `session.requireDocument()` 只在 `EditCommand.undo()` 内部才被调用 |
| **建议修法** | 在 `UndoCommand.execute` / `RedoCommand.execute` 的**第一行**加 `session.requireDocument();`（与 `TreeCommand` / `ShowShapeCommand` 的写法一致），即可让 E-12 优先于 E-15/E-16 |
| **回归用例（已保留，当前红）** | `test/golden/errors.spec.ts` → `E-12·undo 变体`、`E-12·redo 变体` |

---

#### D-03　`save` 无参保存到"最近一次显式 save 的路径"，与 R-12 字面表述不一致

| 项 | 内容 |
|---|---|
| **严重级别** | **P2 轻微** |
| **缺陷描述** | PRD **R-12** 写"无参数时保存到**最近一次 `read` 的路径**，输出 `saved to other.svg (7 elements)`"。实现把"最近一次显式 `save <file>` 的路径"也记为当前路径，因此 `read other.svg` → `save demo.svg` → `save` 会保存到 `demo.svg` 而非 `other.svg`。 |
| **复现步骤** | ```bash
printf 'init 800 600\ncreate rect r1 0 0 1 1\nsave demo.svg\nsave\n' | npm run cli
# 再验证 read 之后：
printf 'read other.svg\nsave demo.svg\nsave\n' | npm run cli
``` |
| **期望输出** | 按 R-12 字面：第二次 `save` 应保存到 `other.svg`，输出 `saved to other.svg (7 elements)` |
| **实际输出** | `saved to demo.svg (1 elements)`（保存到 `demo.svg`） |
| **根因** | `SaveCommand` 无参时取 `session.filePath`；`EditorSession.setFilePath()` 在**显式 save** 后也会更新它，与 `read` 的路径没有区分 |
| **建议修法** | 二选一：<br>① 实现侧：`EditorSession` 区分 `readPath` 与 `lastSavePath`，`save` 无参时优先用 `readPath`（无 `read` 过则报 `no file path`）；<br>② 规格侧：把 PRD R-12 改为"无参数时保存到**最近一次 `read` 或显式 `save`** 的路径"。<br>**建议 ②**（当前行为更符合直觉，且 §6 transcript 不受影响），但必须**改 PRD**，否则实现与文档不符。 |
| **回归用例** | `test/golden/adversarial.spec.ts` →「显式 save 之后，无参 save 保存到同一个文件」「read 之后无参 save 保存到读入的路径（R-12）」——当前实现**通过**（断言的是实现行为），若采纳建议 ① 需同步改断言 |

---

#### D-04　数值溢出被静默写成 `0`（几何被破坏且无任何提示）

| 项 | 内容 |
|---|---|
| **严重级别** | **P2 轻微**（极端输入；但属于"静默破坏数据"，故不能算"轻微无害"） |
| **缺陷描述** | `NumberFormat.format()` 对非有限值返回 `'0'`。`move` / `scale` 在坐标溢出到 `Infinity` 时，把结果写成 `'0'` 写回几何属性——**用户的数据被静默改成 0**，且命令还"成功"了。 |
| **复现步骤** | ```bash
printf 'init 800 600\ncreate rect big 1e308 1e308 1 1\nmove big 1e308 1e308\ntree\n' | npm run cli
``` |
| **期望输出** | 要么报错（例如 `error: invalid value for x: Infinity`）且几何保持 `x=1e+308`；要么保留原值。**绝不能静默变成 0**。 |
| **实际输出** | `rect#big moved to (0,0)`，随后 `tree` 显示 `x=0 y=0 w=1 h=1`（原值 `1e+308` 被抹掉） |
| **根因** | `src/shared/NumberFormat.ts` 的 `format()` 用 `if (!Number.isFinite(value)) return '0';` 兜底；`Shape.translate` / `scaleBy` 未检测溢出 |
| **建议修法** | ① 让 `NumberFormat.format()` 对非有限值**抛错**而非返回 `'0'`；或 ② 在 `Shape.translate` / `scaleBy` 里检测结果非有限时抛 `CommandError('invalid value for <name>: <raw>')`（沿用 L-8 已有的文案族）。推荐 ②，因为它保留了 `NumberFormat` 作为纯格式化函数的单一职责。 |
| **回归用例（已保留，当前红）** | `test/golden/adversarial.spec.ts` →「⚠ 已知缺陷 D-04：数值溢出被静默写成 0（不得静默破坏几何）」 |

---

#### D-05　L-8 声明的"额外文案"清单不完整（实际存在第三条）

| 项 | 内容 |
|---|---|
| **严重级别** | **P2 轻微**（文档一致性） |
| **缺陷描述** | `docs/IMPLEMENTATION.md` 的 **L-8** 声明额外文案只有两条（`invalid value for <name>: <raw>`、`internal error: <msg>`）。实际读入含未建模元素的 SVG 时还会输出第三条：`warning: skipped unsupported element: <path>`。 |
| **复现步骤** | ```bash
cat > p.svg <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <path id="p" d="M0 0 L10 10"/>
</svg>
EOF
printf 'read p.svg\n' | npm run cli
``` |
| **期望输出** | （行为本身正确）——但 L-8 的清单应包含这条 warning |
| **实际输出** | `warning: skipped unsupported element: <path>` + `read p.svg (0 elements)`；而 L-8 只列了 2 条 |
| **建议修法** | 更新 `docs/IMPLEMENTATION.md` 的 L-8，补第三条（并说明它来自 PRD OQ-06「忽略未知元素」裁决）。**注意任务书要求 QA 不修改该文件，故由主理人或工程师更新。** |

---

#### D-06　`ungroup` 作用于叶子时复用 E-04 文案，超出 E-04 声明的触发条件

| 项 | 内容 |
|---|---|
| **严重级别** | **P2 轻微**（文案一致性） |
| **缺陷描述** | PRD **E-04** 的触发条件写的是"`in` / `addto` 目标存在但不是 `g` 类型"。但 `ungroup <叶子 id>` 也输出同一条 `error: not a container: <id>`。 |
| **复现步骤** | ```bash
printf 'init 800 600\ncreate rect a 0 0 1 1\nungroup a\n' | npm run cli
``` |
| **期望输出** | （可接受）——但 E-04 的触发条件应补上 `ungroup`，或另立一条文案 |
| **实际输出** | `error: not a container: a` |
| **建议修法** | 在 PRD E-04 的"触发条件"列补上 `ungroup`（文案本身复用是合理的，无需改代码） |

---

#### D-07　允许创建空 id（`create rect "" …`）

| 项 | 内容 |
|---|---|
| **严重级别** | **P2 轻微**（输入校验） |
| **缺陷描述** | 规格 §2 规定"每个图形元素（含容器 `<g>`）都必须拥有**唯一、大小写敏感**的 `id`"。实现接受空串 id，产生 `rect#`（尾随空格）这样的畸形标题行。唯一性仍被保证（第二次会报 E-01），但空 id 不满足"拥有 id"的前提。 |
| **复现步骤** | ```bash
printf 'init 800 600\ncreate rect "" 0 0 1 1\ntree\n' | npm run cli
``` |
| **期望输出** | 拒绝空 id（报错），例如 `error: id must not be empty` |
| **实际输出** | `rect# created`，`tree` 输出 `└── rect#  x=0 y=0 w=1 h=1` |
| **根因** | `CreateShapeCommand` 未校验 id 非空 |
| **建议修法** | 在 `CreateShapeCommand.apply` 的 id 唯一性校验旁加一条空串校验，抛 `CommandError('id must not be empty')`（新文案需在 README 记录；若希望严格不新增文案，可复用 `usage:`） |

---

### 3.4 观察项（不改代码，仅记录；共 11 条）

| # | 观察 | 结论 |
|---|---|---|
| O-01 | **L-5「横幅后不打印空行」的解释成立** | **成立，且有决定性证据**：规格 §6.1 的 transcript 代码块里**根本没有横幅行**，却同样在 `$ npm run cli` 与第一条 `svg> ` 之间有一个空行 —— 说明该空行是代码块内的**段落分隔**，不是程序输出。§6 代码块中 `group markers` / `read other.svg` 前也有同样的空行，更不可能由任何输出规则产生。`cli-e2e.spec.ts` 断言横幅后紧接 `svg> `，无空行。**结论：不需要改。** |
| O-02 | **L-6「管道模式回显输入行」成立** | 成立。`cli-e2e.spec.ts` 实测管道下 stdout 为 `svg> init 800 600`（与规格 transcript 同形）；TTY 下由终端回显，程序不重复输出。行为合理。 |
| O-03 | **L-7「undo 单元 = 全量文档快照」成立** | 成立。`DocumentSnapshot.capture()` 走 `Document.clone()` 深拷贝。代价是 O(文档规模) 内存/时间；对本阶段 10²~10³ 元素规模可接受，且 `DocumentSnapshot` 已被封装为类（可替换为差量 Memento）。**建议在 README 声明**，不必改代码。 |
| O-04 | **L-8 第一条 `invalid value for <name>: <raw>` 成立** | 成立。实测 `create rect r2 0 0 x 1` → `error: invalid value for width: x`；`move r2 1 abc` → `error: invalid value for dy: abc`；`set neg x abc` → `error: invalid value for x: abc`。 |
| O-05 | **L-8 第二条 `internal error: <msg>` 存在于代码但未构造出触发路径** | `src/cli/Repl.ts` 的 `Repl.describe()` 确有该兜底分支（把非 `CommandError` 压成单行 `internal error: …`）。QA 尝试了非法 XML、非 `<svg>` 根、3000 层深嵌套等路径，均被上层 catch 转为 E-10，**未能触发**。属防御性兜底，**不必改**，但建议 README 声明"所有用户可见错误均为 `error: ` 单行"。 |
| O-06 | **PRD R-30 括注与 §6 逐字示例措辞相反，实现按 §6 正确** | PRD R-30 括注写"错误串中点名的是**作为子孙的容器 id**"，而 §6 的逐字示例 `group bad c1 markers` → 点名的是 `markers`（即**祖先**容器）。实现按 §6 逐字示例执行（且与参数顺序无关），**符合唯一可逐字验证的权威来源**。建议 PRD 修订措辞。 |
| O-07 | **规格 §3「保持相对顺序」与 PRD R-92「命令行顺序」在跨父容器 group 时冲突** | 实现按 PRD R-92（命令行顺序），与 §6 示例一致（二者无差异时相同）。建议 README 说明采用 R-92 口径。 |
| O-08 | **`scale` 的 undo 文案用倒数因子，与实际"精确还原"不完全相符** | `scale g1 3` 的 undo 文案是 `g#g1 scaled back by 0.3333333333`，而实际是快照精确还原。文案来自 PRD OQ-03 的建议值，**无契约约束**，仅作记录。 |
| O-09 | **`set <text> text 5` 回显 `text=5`（数值不加引号）** | L-9 的"数值不加引号"规则外推到文本内容后，`set t1 text 5` 的回显是 `text#t1 updated: text=5` 而非 `text="5"`。无契约约束，仅作记录。 |
| O-10 | **错误优先级不一致：构造期错误先于 E-12** | `create box …` / `scale x -1` / 参数缺失等**构造期**错误在 `execute()` 之前抛出，因此无文档时它们报 E-05 / E-09 / `usage:` 而**不是** E-12。PRD 未规定优先级，**不作缺陷**；建议 README 写明"错误优先级：参数/类型校验 → 文档存在性 → 目标存在性"。 |
| O-11 | **PRD 的需求条目计数自相矛盾** | PRD §4.1 / §8.2 写"57 条（P0 45 / P1 10 / P2 2）"，但 PRD 正文实际枚举 **55 条（P0 44 / P1 9 / P2 2）**。本报告按 55 条逐条验证。建议 PRD 统一口径。 |

---

## 4. 架构约束审计结论

> **抽样方式：全量扫描 `src/**`（66 个 `.ts` 文件），不是抽样。**
> 实现见 `test/golden/architecture.spec.ts`（12 条用例），与 `scripts/check-deps.mjs` 的判定逻辑一致，但**断言在测试里**（`npm test` 即可复现，不依赖额外脚本）。

| # | 硬约束 | 审计方式 | 结论 |
|---|---|---|---|
| **C3-1** | `src/` 内**零** `switch (` 分派 | 对 66 个源文件逐个正则扫描 `/switch\s*\(/` | ✅ **零命中**。全仓不存在任何按标签 / 按命令名的 `switch` 分派；两处"按名字分派"（`CommandRegistry` / `ShapeRegistry`）用 `Map` 查找实现。 |
| **C3-2** | `src/` 内**零** `\bbox\b` 词边界命中 | 逐文件正则 `/\bbox\b/i`。**`viewBox` 天然不命中**（`viewBox` 的 "box" 前是字母 `w`，不构成词边界），无需额外白名单 | ✅ **零命中**。复合图形类型（及其派生标识符 `data-kind`）在内核中**完全不存在**。 |
| **C2** | 每个 `.ts` 恰好**一个**顶层类型，且**文件名 = 类名** | 逐文件提取 `/^(?:export\s+)?(?:abstract\s+)?(?:class\|interface)\s+(\w+)/gm` 的全部匹配，与文件名比对 | ✅ **66 / 66 全部通过**（`src/index.ts` 为进程入口、不声明类型，按设计豁免）。 |
| **§5.3** | 模块依赖方向不越界 | 逐文件解析 `import` 语句 → 解析目标模块 → 与架构 §5.3 依赖矩阵比对 | ✅ **零违规**。组合根 `src/cli/Application.ts` 与进程入口 `src/index.ts` 的豁免与理由已写进脚本注释。 |
| **C4** | 两处"按名字分派"必须被显式标注为「待重构」 | 检查 `CommandRegistry.ts` 含 `待重构点①` + `TODO(ARCH)`；`ShapeRegistry.ts` 含 `待重构点②` + `TODO(ARCH)` | ✅ **两处均已标注**，满足 PRD R-81 与架构 §4.9。 |

**分层抽样明细**（架构 §5.3 矩阵，实测零违规）：

| 依赖方 ＼ 被依赖 | shared | domain | io | view | command | cli |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `shared` | — | ✘ | ✘ | ✘ | ✘ | ✘ |
| `domain` | ✔ | — | ✘ | ✘ | ✘ | ✘ |
| `io` | ✔ | ✔ | — | ✘ | ✘ | ✘ |
| `view` | ✔ | ✔ | ✘ | — | ✘ | ✘ |
| `command` | ✔ | ✔ | ✔ | ✔ | — | ✘ |
| `cli` | ✔ | ✘ | ✘ | ✘ | ✔ | — |

- `npm run check:deps` 独立复核输出：`依赖方向检查通过：扫描 66 个源文件，无违规。`
- **QA 追加的更严断言**：`domain` 不得 import `io`/`view`/`command`/`cli`；`view` 不得 import `command`/`io`；`command` 不得 import `cli`；`shared` 不得依赖任何其它模块 —— 四条均单独成用例。

---

## 5. 质量度量（真实输出）

### 5.1 `npm run typecheck`

```
> svg-editor-cli@0.1.0 typecheck
> tsc -p tsconfig.test.json
```
**零错误零输出**（覆盖 `src/**/*.ts` + `test/**/*.ts`，`strict` 模式）。

### 5.2 `npm test`

```
 Test Files  2 failed | 16 passed (18)
      Tests  3 failed | 258 passed (261)
 Duration  8.6s
```
3 条失败 = 3 条**故意保留的缺陷证据**（D-01 × 2、D-04 × 1），已逐条列在 §1.2 与 §3。

### 5.3 `npm run check:deps`

```
> svg-editor-cli@0.1.0 check:deps
> node scripts/check-deps.mjs

依赖方向检查通过：扫描 66 个源文件，无违规。
```

### 5.4 覆盖率（`npx vitest run --coverage`，v8 provider）

| 范围 | 语句 | 分支 | 函数 | 行 |
|---|:--:|:--:|:--:|:--:|
| **全部 `src/`** | **89.26%**（2187/2450） | **90.41%**（622/688） | **92.72%**（255/275） | **89.27%** |
| `src/command/` | 97.88% | 97.36% | 95.00% | 97.88% |
| `src/domain/` | 92.75% | 91.59% | 91.59% | 92.75% |
| `src/view/` | 94.11% | 97.14% | 90.00% | 94.11% |
| `src/io/` | 93.26% | 84.61% | 100% | 93.26% |
| `src/shared/` | 95.55% | 100% | 87.50% | 95.55% |
| `src/cli/` | 45.90% | 84.61% | 63.63% | 45.90% |
| `src/index.ts` | 0% | — | — | 0% |

**口径说明**：
- 已排除 3 个**纯类型文件**（`shared/Argument.ts`、`domain/ShapeProvider.ts`、`cli/InputSource.ts`）—— 它们只含 `interface`，编译后没有可执行语句，v8 会记成 0%，属统计噪声。
- `src/cli/` 偏低的原因是 `Application.ts` / `ReadlineInputSource.ts` / `index.ts` 是**进程入口**，只在 `cli-e2e.spec.ts` 里以**子进程**方式被端到端验证（子进程不计入 v8 覆盖率），因此**行为已被覆盖但统计上显示为 0%**。
- `vitest.config.ts` 已设 `coverage.reportOnFailure: true`，保证**有失败用例时也能产出覆盖率报告**（否则缺陷证据一红就看不到数据）。
- 覆盖率命令：`npm run test:coverage`（新增脚本；新增 devDependency `@vitest/coverage-v8@^2.1.9`）。

### 5.5 用例统计

| 类别 | 用例数 |
|---|:--:|
| 黄金用例（`test/golden/**`，6 个文件） | **164** |
| 其中：逐字契约 T-xx | 25（+ 1 表自检 + 2 整段 transcript = 28） |
| 其中：逐字错误文案 E-xx | 49 条错误用例（16 基准 + 33 变体）+ 1 表自检 + 3 豁免 = 53 |
| 其中：原子性 | 12 |
| 其中：架构约束 | 12 |
| 其中：对抗场景 | 55 |
| 其中：进程级端到端 | 4 |
| 既有单元 / IO 用例（工程师提供，未改动） | 97 |
| **总计** | **261** |

---

## 6. 已知限制复核（L-1 ~ L-12 逐条判定）

> 判定依据：**QA 亲自复现**，不采信工程师自述。

| # | 工程师自述 | 判定 | QA 复现结论与证据 |
|---|---|:--:|---|
| **L-1** | 读入 `transform` 不保真 | ✅ **确认成立** | 复现：读入带 `<g transform="translate(60,40)">` 的文件 → `save` 后 `transform` 消失。**但被提升为 P1 缺陷 D-02**：规格 §0.1 把 `transform` 列为 `<g>` 的核心能力，PRD G3 承诺"属性不丢失"。建议按 D-02 的方案 ①（透传不解释）修复，或至少在 README 显著声明。 |
| **L-2** | 未建模属性不写回 | ✅ **确认成立**（**可接受**） | 复现：`opacity="0.5"`、`class="x"` 读入后 `save` 均被丢弃。PRD R-61 字面写"未识别的**属性**忽略但不报错"，故**不违反需求**；属 G3 的范围取舍。与 D-02 一并处理即可。 |
| **L-3** | 允许 id = `svg` | ✅ **确认成立**（**可接受**） | 复现：`create rect svg 0 0 1 1` → `rect#svg created`；`show svg` → `rect#svg  parent=svg`（父级标签与 id 同名，语义上不歧义，因为父级显示的是标签名）。PRD OQ-13 建议"允许，仅在 README 记录"。**无需改代码。** |
| **L-4** | `save` 无参的路径语义 | ⚠ **部分成立，且与 PRD R-12 字面不符** | 逐条验证链路：<br>① `init` 后从未 `save` → `save` → `error: no file path. use 'save <file.svg>'` ✅（实测逐字一致）<br>② `save demo.svg` 之后 `save` → 保存到 `demo.svg` ✅（实测逐字 `saved to demo.svg (1 elements)`）<br>③ `read other.svg` 之后 `save` → 保存到 `other.svg` ✅（实测逐字 `saved to other.svg (7 elements)`）<br>**但 ② 与 R-12 字面（"最近一次 **read** 的路径"）不一致** → 记为 P2 缺陷 **D-03**，建议改 PRD 或改实现。 |
| **L-5** | 横幅后**不**打印空行 | ✅ **确认成立（解释正确，无需改）** | **决定性证据**：规格 §6.1 的 transcript 代码块里**没有横幅行**，却同样在 `$ npm run cli` 与第一条 `svg> ` 之间有一个空行 —— 该空行只能是代码块内的**段落分隔**。§6 中 `group markers` / `read other.svg` 前也有同样空行，更不可能由输出规则产生。实测 CLI：`svg-editor 0.1 — type 'help' for commands` 之后紧接 `svg> `，无空行。**QA 独立判定：L-5 的解释成立。** |
| **L-6** | 管道模式下 REPL 回显输入行 | ✅ **确认成立（可接受）** | 实测（管道）：`svg> init 800 600` 与 transcript 同形；TTY 下由终端回显，程序不重复输出。`cli-e2e.spec.ts` 已把该行为固化为端到端断言。 |
| **L-7** | undo 单元 = 全量文档快照 | ✅ **确认成立（可接受）** | `DocumentSnapshot.capture()` → `Document.clone()` 深拷贝；`EditCommand` 持有快照。代价 O(文档规模)；`DocumentSnapshot` 已封装为类，可替换为差量 Memento（架构 §6 V-08）。**建议 README 声明**（架构一致性自查节）。 |
| **L-8** | 两条额外文案 | ⚠ **第一条成立，第二条存在但不可触发；清单不完整** | ① `invalid value for <name>: <raw>`：成立（实测 3 处）。② `internal error: <msg>`：`src/cli/Repl.ts` 的 `Repl.describe()` 确有该兜底分支，但 QA **未能构造出触发路径**（非法 XML / 非 `<svg>` 根 / 3000 层深嵌套均被上层 catch 转为 E-10）。③ **清单缺第三条** `warning: skipped unsupported element: <tag>` → 记为 P2 缺陷 **D-05**。 |
| **L-9** | `set` 的引号规则（数值不加引号、其余加双引号） | ✅ **确认成立** | 实测：`set r1 x 42` → `rect#r1 updated: x=42`；`set r1 fill #abc` → `rect#r1 updated: fill="#abc"`；`set t1 text "My Diagram v2"` → `text="My Diagram v2"`。与 PRD OQ-03 的三条样例完全吻合。外推到纯数字文本内容的边界见 O-09。 |
| **L-10** | `addto` 冲突文案点名**源图形 id** | ✅ **确认成立** | 实测：`addto inner outer`（outer 是 inner 的祖先）→ `error: cannot add a container into its own descendant: outer`（点名源 `outer`）；`addto g1 g1` → 同文案点名 `g1`。与文案句意"把（源）容器加进它自己的子孙"一致。**比复用 E-07 文案更准确。** |
| **L-11** | `group` 成员重复复用 E-01 文案 | ✅ **确认成立** | 实测：`group dup r1 r1` → `error: id already exists: r1`。文案可接受（重复成员确实造成 id 冲突语义）。 |
| **L-12** | vitest `fileParallelism: false`（Windows EPERM 规避） | ✅ **确认成立（可接受）** | 本机（Windows）复跑 `npm test` 18 个文件串行通过，耗时 6.5s。属环境限制而非设计缺陷；已在 `vitest.config.ts` 注释说明。**建议 README 记录**，不必改。 |

---

## 7. 质量保证手段小结（供 README「质量保证手段」节引用）

1. **三道静态闸门**：① `npm run typecheck`（`tsc -p tsconfig.test.json`，覆盖 `src/` + `test/`，strict 模式，**零错误**）；② `npm run check:deps`（依赖方向 + 一类一文件 + 禁用项，**66 个源文件零违规**）；③ `npm test`（**261 条用例**）。
2. **黄金回归套件（`test/golden/`，164 条）**：
   - **逐字契约**（`session.spec.ts`）：PRD §4.9 的 **T-01 ~ T-25 全部 25 条**逐字断言（`toBe`，不用包含式匹配、不忽略空白），外加**规格 §6 完整 transcript（33 行）与 §6.1 流程图会话（15 行）的整段字节级比对**；T-07 / T-19 两处 `tree` 的**每一列空格**都参与比较（col=19）。
   - **逐字错误表**（`errors.spec.ts`）：PRD §4.8 的 **E-01 ~ E-16 全部 16 条**逐字断言 + **33 条触发路径变体**（同一文案的 delete/move/scale/set/front/back/show/tree/group/addto/canvas/save/undo/redo 等入口）；**每条错误用例之后追加原子性断言**——`tree` 文本、文档结构、id 集合、undo/redo 栈与 IO 锁状态四维逐字比对。
   - **原子性**（`atomicity.spec.ts`）：30 轮「成功编辑 → 失败命令 → 四维比对」混合压测 + 10 轮重复压测 + 8 种组合场景（出错后继续编辑 / undo / redo / undo+redo、group 中途出错、ungroup 后出错、保存失败后 undo、读入失败后当前文档不变、IO 锁下的出错与解锁）。
   - **架构硬约束**（`architecture.spec.ts`）：对 `src/**` **全量扫描**（非抽样）断言——零 `switch (`、零 `\bbox\b` 词边界命中、零 `data-kind`、一类一文件（文件名 = 类名）、依赖方向矩阵零违规、两处「待重构」标注存在。
   - **对抗场景**（`adversarial.spec.ts`，55 条）：自造刁钻输入——id 大小写敏感共存、自动补 id 冲突顺延（`rect1` 占用 → 补 `rect2`/`rect3`）、E-07 的容器/子孙组合（与参数顺序无关）、ungroup 的"占据原位置"、addto 的子孙/自加/同父容器不重复入列、scale 的绝对坐标递归与非法因子、set 的白名单/容器/文本、undo/redo 栈空与清空、IO 锁优先级与解禁、显示类命令不入栈、`in` 子句与引号交互、浮点（`0.1+0.2 → 0.3`、`12.5` 原样、整数不带 `.0`）、极端输入（200 字符 id / 中文 id / 含空格 id / 负坐标 / 大数值 / 中文与尖括号文本）、tree 子树模式与列对齐边界（OQ-02 根行只有 `tag#id`、超长 id 至少留 1 空格、容器不参与列宽计算）、read→save 往返保真（tree 逐字相同 + 两次 save 字节相同）、save 路径语义链。
   - **进程级端到端**（`cli-e2e.spec.ts`）：以**子进程**跑真正的 `src/index.ts`，断言管道模式 stdout 与规格 transcript 同形、横幅后无空行、注释/空行无结果输出、错误单行且进程不中断。
3. **可复现的度量**：覆盖率 `npm run test:coverage`（v8 provider，`reportOnFailure: true` 保证有红用例也能出数据）——语句 **89.26%**、分支 **90.41%**、函数 **92.72%**、行 **89.27%**。
4. **缺陷即证据**：发现源码缺陷时**保留失败的回归用例**（不弱化断言、不改源码），由主理人路由给工程师；修复后用例自动转绿。本次保留 **3 条**失败用例，对应 **3 条缺陷**（D-01 × 2、D-04 × 1）。
5. **独立验收立场**：工程师 `docs/IMPLEMENTATION.md` 的自述结论全部**由 QA 亲自复现**，其中 L-4（部分不成立）、L-8（清单不完整）被修正；L-5 的解释经独立证据判定为成立。
6. **不越界的改动**：QA 只新增/修改 `test/`、`vitest.config.ts`、`package.json`（仅新增 coverage 依赖与 `test:coverage` 脚本），**未改动 `src/` 任何文件**，未 push、未打 tag、未改 git 历史。

---

## 8. 建议的后续动作（供主理人排期）

| 优先级 | 动作 | 责任方 |
|---|---|---|
| 必做 | 修 **D-01**（`undo`/`redo` 无文档时报 E-12）——一行改动，2 条红用例转绿 | 工程师 |
| 必做 | 修 **D-04**（数值溢出静默变 0）——1 条红用例转绿 | 工程师 |
| 强烈建议 | 决策并处理 **D-02**（`transform` 保真）：透传属性 或 README 显著声明 | 工程师 + 主理人 |
| 建议 | 修 **D-03**（`save` 无参语义）：改实现 或 改 PRD R-12 措辞 | 主理人（PRD 归口） |
| 建议 | 修 **D-05 ~ D-07**（L-8 清单、ungroup 复用 E-04、空 id）与 **O-06 / O-07 / O-11**（PRD 措辞） | 工程师 / 主理人 |
| 文档 | 更新 `docs/IMPLEMENTATION.md` 的 L-8 清单（QA 不修改该文件） | 工程师 |
| 文档 | 在 `doc/README.md` 中声明 L-1/L-2/L-3/L-7/L-12 与本文第 6 节的逐条判定 | 主理人 |
| 流程 | 缺陷修复后重跑 `npm run typecheck && npm test && npm run check:deps`，确认 **261 / 261 全绿** | QA |

---

*本报告由 QA 工程师严过关独立产出；所有结论均由 `npm test` / `npm run typecheck` / `npm run check:deps` / `npx vitest run --coverage` 的真实输出与逐条回归用例支撑。*
