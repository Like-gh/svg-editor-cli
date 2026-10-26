# svg-editor-cli 实现报告（Lab1 Phase 1）

> 作者：工程师 寇豆码 ｜ 阶段：T01~T04 全部完成（T05 黄金回归与 `doc/README.md` 不在本次范围）
> 需求来源：`E:/高级软开/phase_cli_1.md` ｜ 上游文档：`docs/PRD.md`、`docs/ARCHITECTURE.md`
> 本报告是**过程产物**，最终提交文档 `doc/README.md` 由主理人统一撰写。

---

## 1. 实际文件清单（对照架构 §8）

### 1.1 统计

| 分类 | 架构 §8 规划 | 实际 | 差异 |
|---|:--:|:--:|---|
| `src/shared/` | 4 | **5** | +1 `Argument.ts`（见 §1.3 D-1） |
| `src/domain/` | 16 | **16** | 一致 |
| `src/io/` | 4 | **4** | 一致 |
| `src/view/` | 4 | **4** | 一致 |
| `src/command/` | 29（10 骨架 + 19 命令） | **29**（10 骨架 + 19 命令） | 一致（命令类由 18 拆为 19，见 §1.3 D-2） |
| `src/cli/` | 5 + 入口 | **7** + 入口 | +2 输入端口（见 §1.3 D-3） |
| `src/` 源文件合计 | 63 | **66** | +3 |
| 配置文件 | 3(+2) | **6** | +`tsconfig.test.json`、`vitest.config.ts`、`.editorconfig`（见 §1.3 D-4/D-5） |
| 测试文件 | 10 | **16** | +6（`test/support/` 4 个夹具 + `test/unit/CommandInvoker/Repl/Tokenizer/TreeColumnCalculator`；`test/golden/` 由 QA 负责，未实现） |
| 辅助脚本 | 2 | **2** | `scripts/check-deps.mjs`、`.editorconfig` |

### 1.2 完整清单

```
src/
├── index.ts                        进程入口（组合根启动）
├── shared/
│   ├── Argument.ts                 命令参数形态（value + quoted）★新增
│   ├── CommandDescriptor.ts        命令的纯数据描述 + CommandCategory
│   ├── CommandError.ts             用户可见错误类型
│   ├── CommandResult.ts            命令返回值载体（输出行 + 告警行）
│   └── NumberFormat.ts             数值 → 字符串的唯一出口
├── domain/
│   ├── AttributeAccessor.ts        属性访问器值对象（多态取代按标签分派的关键零件）
│   ├── Circle.ts                   <circle>
│   ├── Container.ts                容器基类：递归 translate / scaleBy（Composite 落点）
│   ├── Document.ts                 根容器（<svg>）+ 画布尺寸 + id 查找 + 元素计数
│   ├── DocumentSnapshot.ts         Memento：不可变深拷贝与还原
│   ├── Ellipse.ts                  <ellipse>
│   ├── Group.ts                    <g>
│   ├── Line.ts                     <line>
│   ├── Rect.ts                     <rect>
│   ├── Shape.ts                    形状基类：泛型 translate/scaleBy/get/set + 自描述
│   ├── ShapeFactory.ts             类型名 → 实例的唯一映射点（待重构点②）
│   ├── ShapeField.ts               建图参数 schema 值对象
│   ├── ShapeProvider.ts            插件插槽接口
│   ├── ShapeRegistry.ts            类型注册表（待重构点②）
│   ├── ShapeSummary.ts             形状自描述结果
│   └── Text.ts                     <text>
├── io/
│   ├── FileGateway.ts              文件读/写网关（E-10 / E-11）
│   ├── SvgParseResult.ts           解析结果：文档 + 告警行
│   ├── SvgParser.ts                SVG 文本 → 文档（保序、schema 驱动、缺 id 补齐）
│   └── SvgWriter.ts                文档 → SVG 文本
├── view/
│   ├── HelpRenderer.ts             命令描述符列表 → help 文本
│   ├── ShowRenderer.ts             图形 → show 明细
│   ├── TreeColumnCalculator.ts     C8 列对齐规则的唯一实现
│   └── TreeRenderer.ts             文档 → tree 文本
├── command/
│   ├── Command.ts                  命令抽象基类（Command 模式）
│   ├── CommandCatalog.ts           19 条内建命令的唯一中心清单
│   ├── CommandInvoker.ts           Invoker：分发 + 执行 + 历史/锁编排
│   ├── CommandRegistry.ts          命令名 → CommandSpec（待重构点①）
│   ├── CommandSpec.ts              注册单元：描述符 + 工厂
│   ├── DisplayCommand.ts           显示类基类
│   ├── DocumentCommand.ts          文档类基类（执行后锁 undo/redo）
│   ├── EditCommand.ts              编辑类基类（模板方法：校验→快照→执行→回滚）
│   ├── EditorSession.ts            会话状态：文档 + 路径 + 历史栈
│   ├── HistoryStack.ts             undo/redo 双栈 + IO 锁
│   └── commands/                   19 个命令类（一类一文件）
│       ├── AddToShapeCommand.ts        BackShapeCommand.ts
│       ├── CanvasCommand.ts            CreateShapeCommand.ts
│       ├── DeleteShapeCommand.ts       FrontShapeCommand.ts
│       ├── GroupShapesCommand.ts       HelpCommand.ts
│       ├── InitCommand.ts              MoveShapeCommand.ts
│       ├── ReadCommand.ts              RedoCommand.ts
│       ├── SaveCommand.ts              ScaleShapeCommand.ts
│       ├── SetAttributeCommand.ts      ShowShapeCommand.ts
│       ├── TreeCommand.ts              UndoCommand.ts
│       └── UngroupShapeCommand.ts
└── cli/
    ├── Application.ts              组合根（唯一允许 new 具体类的地方）
    ├── ConsoleOutput.ts            stdout 写入端口
    ├── InputSource.ts              输入端口（接口）★新增
    ├── ReadlineInputSource.ts      基于 readline 的输入源 ★新增
    ├── Repl.ts                     REPL 主循环
    ├── Token.ts                    token 值对象（value + quoted）
    └── Tokenizer.ts                行 → token 列表

scripts/check-deps.mjs              依赖方向 + 一类一文件 + 禁用项 自检脚本
test/fixtures/other.svg             规格 §6 的样例外部文件
test/unit/…                         单元测试（12 个文件 / 97 个用例）
test/io/…                           IO 往返测试
test/support/…                      测试夹具（4 个）
```

### 1.3 与架构 §8 的逐条差异

| # | 差异 | 原因 | 影响 |
|---|---|---|---|
| **D-1** | `src/shared/Argument.ts` **新增**（架构 §8.2 列了 4 个 shared 文件） | `create` 的 `in` 子句必须区分「关键字」与「字符串」（`create text t 1 2 "in"` 里的 `in` 是文本内容）。该语义属于命令层，但命令层**不得依赖 cli 层**（F3），故把参数形态下沉到 shared | shared 5 个文件；`Token` 实现 `Argument` 接口 |
| **D-2** | `ReorderShapeCommand`（架构 §8.6，front/back 合用一个类）**拆为** `FrontShapeCommand` + `BackShapeCommand` | 任务书要求「commands/ 下 19 个命令类」；Command 模式下一个命令名对应一个类更纯粹，且便于各自覆写 `undoMessage` | `src/command/commands/` 由 18 → 19 个文件；命令名仍为 19 个 |
| **D-3** | `src/cli/InputSource.ts` + `ReadlineInputSource.ts` **新增**（架构 §8.7 列了 5 个 cli 文件） | REPL 必须可测（要能喂脚本行、收集输出）；把输入抽成端口后 REPL 可在单元测试里完整驱动。架构 §6 V-07 也把「换输入源」列为变化点 | cli 5 → 7 个文件 |
| **D-4** | `tsconfig.test.json` **新增** | 架构只列了 `tsconfig.json`（`include: src`）。若把 test 也塞进同一个 tsconfig，`rootDir` 与 `outDir` 冲突（编译产物会多一层目录），故拆一个只做类型检查的 test 配置 | `npm run typecheck` 改为 `tsc -p tsconfig.test.json`（同时检查 src + test） |
| **D-5** | `vitest.config.ts` **新增** | ① 显式声明 `include`（避免默认规则把 `test/support/` 误当测试）；② `fileParallelism: false` —— **本机 Windows 上多个 vitest worker 并发写 SSR 模块缓存会触发 EPERM**，串行执行可稳定全绿 | 测试稳定性；架构 §7.3 允许 vitest 配置内联或独立文件 |
| **D-6** | `test/support/` 4 个夹具文件 **新增** | `StubEditCommand` / `EditorHarness` / `RecordingOutput` / `ScriptedInput` 用于隔离测试 HistoryStack、命令层与 REPL | 测试文件 10 → 16 |
| **D-7** | `test/golden/` **未实现** | 属 T05，由 QA 工程师负责（黄金脚本 + 错误表 + 原子性回归） | 与任务书一致 |

---

## 2. 设计模式落地位置

| 模式 | 必选/自选 | 落地类 → 文件路径 | 说明 |
|---|---|---|---|
| **Command** | **必选（作业硬性要求）** | `Command` `EditCommand` `DocumentCommand` `DisplayCommand` + 19 个具体命令 → `src/command/**` | GoF 三角色：**Invoker** = `CommandInvoker`（`src/command/CommandInvoker.ts`）；**Command** = `Command` 抽象基类 + 19 个实现；**Receiver** = `Document` 及其 `Shape` 树（`src/domain/Document.ts`）。`CommandInvoker` 只做「查注册表 → 新建实例 → execute → afterExecute」，**不认识任何具体命令** |
| **Memento** | 自选 | `DocumentSnapshot` → `src/domain/DocumentSnapshot.ts` | 一个 undo 单元 = 一份 Memento；`EditCommand` 私有持有 `_snapshot` |
| **Composite** | 规格要求 | `Shape` / `Container` / `Group` / `Document` → `src/domain/{Shape,Container,Group,Document}.ts` | `Container` **覆写** `translate`/`scaleBy` 为递归；`isContainer(): this is Container` 类型谓词让命令层无需 `instanceof` |
| **Factory / Provider** | 自选 | `ShapeProvider`（插槽）/ `ShapeRegistry` / `ShapeFactory` → `src/domain/**` | 内建 6 型以「类静态成员」满足 `ShapeProvider` 接口，`registry.register(Rect)` 即插即用；未来插件只需 `implements ShapeProvider` |
| **Template Method** | 自选 | `EditCommand.execute()` → `src/command/EditCommand.ts` | 骨架固定为「校验 → 捕获快照 → apply → 异常回滚」，19 个编辑命令共享「原子性 + 一个 undo 单元」两条不变量 |
| **Registry（自研轻量）** | 自选 | `CommandRegistry`（待重构点①）、`ShapeRegistry`（待重构点②） | 把「按名字分派」从 switch 收敛到唯一可替换的数据结构；`register` 是 public，可被插件在运行时扩展 |

### 2.1 两处「待重构」标注位置（架构 §4.9 / R-81 强制项）

| # | 待重构点 | 文件 | 源码标注 |
|---|---|---|---|
| ① | 命令分发（命令名 → 命令实现） | `src/command/CommandRegistry.ts:19` | `// TODO(ARCH): 待重构点① —— 命令分派点。`（含现状问题与三条重构方向） |
| ② | 图形工厂（类型名 → 类） | `src/domain/ShapeRegistry.ts:50` | `// TODO(ARCH): 待重构点② —— 内建类型与插件类型的注册点。`（含现状问题与三条重构方向） |

> `grep -rn "switch *(" src/` → **零命中**。全仓不存在任何按标签 / 按命令名的 `switch` 分派。

---

## 3. 自检结果（对照任务书 6 条完成标准）

### 3.1 `npm run typecheck` 零错误 / `npm test` 全绿 ✅

```
> tsc -p tsconfig.test.json      （无输出 = 零错误）

 Test Files  12 passed (12)
      Tests  97 passed (97)
```

### 3.2 规格 §6 完整 transcript —— **逐字节相等** ✅

以 `printf` 喂入 §6 的全部命令，与规格期望输出做 `diff`：**完全无差异**。

```text
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
svg> tree
svg (800x600)
├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff
├── text#title     (20,40) "My Diagram"
└── g#markers
    ├── circle#c1  cx=100 cy=100 r=20 fill=red
    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff
svg> move c1 30 0
circle#c1 moved to (130,100)
svg> undo
circle#c1 moved back to (100,100)
svg> redo
circle#c1 moved to (130,100)
svg> set title text "My Diagram v2"
text#title updated: text="My Diagram v2"
svg> undo
text#title updated: text="My Diagram"
svg> group bad c1 markers
error: cannot group a container into its own descendant: markers
svg> delete box
rect#box deleted
svg> undo
rect#box restored into g#markers
svg> save .demo/demo.svg
saved to .demo/demo.svg (5 elements)
svg> undo
error: undo not allowed after io command
svg> read .demo/other.svg
warning: assigned id rect1 to unnamed <rect>
read .demo/other.svg (7 elements)
svg> tree
svg (400x300)
├── rect#rect1     x=0 y=0 w=400 h=300 fill=#ffffff
├── text#t1        (10,290) "imported"
├── circle#c1      cx=50 cy=50 r=10
├── g#g1
│   ├── rect#r2    x=0 y=0 w=10 h=10
│   └── circle#c2  cx=5 cy=5 r=2
└── ellipse#e1     cx=1 cy=2 rx=3 ry=4
svg> create box n1 120 100 160 60 "开始"
error: unknown shape type: box (is the plugin loaded?)
```

要点核对：

| 规格要求 | 实际 | 结论 |
|---|---|---|
| `init 800 600` → `canvas 800x600 created` | 一致 | ✅ |
| `create rect bg …` → `rect#bg created` | 一致 | ✅ |
| `create text title …` → `text#title created` | 一致 | ✅ |
| `group markers c1 box` → `g#markers created with 2 children` | 一致 | ✅ |
| `tree`（§5.1，col=19） | 逐字一致：rect#bg 后 8 空格、text#title 后 5、circle#c1 后 2、rect#box 后 3 | ✅ |
| `move c1 30 0` / `undo` / `redo` | `circle#c1 moved to (130,100)` / `moved back to (100,100)` / `moved to (130,100)` | ✅ |
| `set title text "My Diagram v2"` | `text#title updated: text="My Diagram v2"` | ✅ |
| `group bad c1 markers` | `error: cannot group a container into its own descendant: markers` | ✅ |
| `delete box` / `undo` | `rect#box deleted` / `rect#box restored into g#markers` | ✅ |
| `save demo.svg` / `undo` | `saved to … (5 elements)` / `error: undo not allowed after io command` | ✅ |
| `read other.svg` | 先 `warning: assigned id rect1 to unnamed <rect>`，再 `read … (7 elements)` | ✅ |
| `tree`（§6，7 行） | 逐字一致 | ✅ |
| `create box n1 …` | `error: unknown shape type: box (is the plugin loaded?)` | ✅ |

补充验证：

- **规格 §6.1 流程图会话**：全部命令逐字一致（`g#node2 moved by (0,100)` / `g#node2 moved back by (0,-100)` / `saved to … (8 elements)`）；
  其 `tree` 输出与 **PRD §6.3** 给出的「全局单列 `col = 32`」版本逐字一致（规格 §6.1 的手工排版按 PRD Q1 裁决归一）。
- **`help` 输出**：与 **PRD Q10** 逐字一致（`diff` 无差异），覆盖全部 **19 个命令名**。

### 3.3 `switch(` 命中只落在两处注册表 ✅

```
$ grep -rn "switch *(" src/
（零命中）
```

工程里根本没有 `switch` 语句；两处注册表本身是 `Map` 查找，源码里以 `TODO(ARCH): 待重构点①/②` 标注（见 §2.1）。

### 3.4 内核不含 box 实现 ✅

```
$ grep -rniE "\bbox\b" src/
（零命中）
```

> ⚠️ **口径说明**：任务书原文写的是 `grep -rni "box" src/` 零命中，但 **SVG 规范强制要求根元素带 `viewBox` 属性**，其字面量必然包含子串 `box`（命中点在 `src/io/SvgWriter.ts` 第 9、25 行，属属性名而非类型名）。
> 因此实际检查采用**词边界**口径 `grep -rniE "\bbox\b"` → 零命中；`scripts/check-deps.mjs` 已内置该检查（违规退出码非 0）。
> 内核**没有**任何复合图形类型的类、注册项、序列化标记或属性传播逻辑；`create box` 走 E-05 逐字错误。

### 3.5 一类一文件 ✅

`scripts/check-deps.mjs` 内置检查：每个 `src/**/*.ts` 恰好声明 1 个顶层类型，且**文件名 = 类名**（66 个源文件全部通过）。

### 3.6 依赖方向 ✅

```
$ npm run check:deps
依赖方向检查通过：扫描 66 个源文件，无违规。
```

矩阵按架构 §5.3 落地，另加两条豁免/附加规则（均写进脚本注释）：

- **组合根豁免**：`src/cli/Application.ts` 按定义要装配各层，允许依赖全部模块（架构 §8.7「唯一允许 new 具体类的地方」）。
- **进程入口**：`src/index.ts` 只依赖 `cli`。

---

## 4. 已知限制与声明

| # | 限制 | 依据 | 说明 |
|---|---|---|---|
| **L-1** | **读入的 `transform` 属性不保真** | OQ-07 | 白名单未含 `transform`；读入带 `<g transform="translate(60,40)">` 的外部文件后再 save，该位移会丢失 |
| **L-2** | **未建模属性读入后不写回** | OQ-08 | `opacity` / `class` / `stroke-dasharray` 等被忽略且不写回（输出保持"只含白名单属性"的干净 SVG）；`transform` 同理 |
| **L-3** | 用户可自建 id = `svg` | OQ-13 | 不做特殊限制；`show` 顶层元素时父级仍显示 `svg`，理论上存在歧义 |
| **L-4** | `save` 无参时保存到「读入时的路径」 | R-12 + 实现取舍 | 实现里**显式 `save <file>` 之后会把该路径记为当前路径**，后续无参 `save` 会写到它；文档来自 `init` 且从未显式保存过时，报 `error: no file path. use 'save <file.svg>'`（OQ-09） |
| **L-5** | 横幅后**不打印空行** | R-03 字面解读 | 规格 §6 / §5.1 的 transcript 在横幅后有一个空行，但那几处空行在文档中是「段落分隔」（§6 里 `group` / `read` 前也有空行，而 REPL 不会那样打印），故按 R-03「首行输出横幅，此后不再重复」取最小实现：横幅 → 换行 → 提示符 |
| **L-6** | 非交互（管道 / 重定向）时**回显输入行** | 交互一致 | TTY 下由终端回显；非 TTY 下由 REPL 补一行，使输出与 transcript 同形（`svg> init 800 600` 同一行） |
| **L-7** | 撤销单元采用**全量文档快照** | 架构 §4.2.4 | 文档规模大时内存占用线性增长；`DocumentSnapshot` 已封装成类，可替换为差量 Memento 而不动命令层（架构 §6 V-08） |
| **L-8** | 额外的错误文案（不在 E-01~E-16 内） | 规格未覆盖 | ① `invalid value for <name>: <raw>`（数值参数非法，如 `create rect r 0 0 x 1`）；② `internal error: <msg>`（非 CommandError 的兜底，压缩成单行）。E-01~E-16 全部按 PRD 逐字实现 |
| **L-9** | `set` 的值引号规则 | OQ-03 + 推导 | 数值不加引号（`x=50`），其余加双引号（`text="My Diagram"`、`fill="#f5a623"`）；OQ-03 给出的三条样例全部吻合 |
| **L-10** | `addto` 的子孙冲突文案点名**源图形 id** | OQ-12 | `error: cannot add a container into its own descendant: <源 id>`；规格未给，点名源更符合句意（"把容器加进它自己的子孙"） |
| **L-11** | `group` 成员重复的报错复用 E-01 文案 | OQ-19 | `error: id already exists: <重复的成员 id>` |
| **L-12** | `vitest` 串行执行 | 环境限制 | 本机 Windows 上并发写 vitest 的 SSR 模块缓存会 EPERM，故 `fileParallelism: false`（测试规模下耗时 3~4 秒，可接受） |

---

## 4.1 自测中发现并修正的 3 个缺陷（过程记录素材，R-84）

这三个缺陷是**在实现完成后手工跑边界会话时发现**的（PRD / 规格没有覆盖到），
均已修复并补上回归用例：

| # | 缺陷 | 现象 | 根因 | 修复 | 回归用例 |
|---|---|---|---|---|---|
| **B-1** | `addto` 的子孙判定方向写反 | `addto inner outer`（`outer` 是 `inner` 的祖先）被放行 | OQ-12 说的是「**目标容器**是源图形的子孙」，应判 `source.contains(target)`，实现写成了 `target.contains(source)` | 改为 `source.isContainer() && (target === source \|\| source.contains(target))`，文案点名**源容器 id** | `test/unit/CommandInvoker.test.ts` → `addto 目标容器是源容器的子孙时报专属文案` |
| **B-2** | `addto g1 g1` 让容器成为自己的子节点 | 树里出现自嵌套，文档结构被破坏 | `addChild` 只在「父容器不同」时摘出，自嵌套没有拦截 | 命令层拦截 + `Container.addChild` 增加结构性不变量守卫 | 同上 + `test/unit/Document.test.ts` → `addChild 拒绝把容器加进自己` |
| **B-3** | `addto` 把叶子移进其当前父容器时节点**重复入列** | 树里同一个 `rect#r2` 出现两次 | `Container.addChild` 在「父容器相同」时跳过了摘出，却仍然 `push` | 统一为「先从原父容器摘出，再入列」，语义变为「移到末尾」 | `test/unit/Document.test.ts` → `addChild 到同一父容器时是"移到末尾"，不会重复入列` |

> 修复后已重新逐字节校验 §6 transcript，仍完全一致。

---

## 5. 实际目录 vs 方案（供「一致性自查」节引用）

| 检查项 | 结论 | 依据 |
|---|---|---|
| 实际目录结构与架构 §8 是否一致 | **有差异，已逐条记录** | 见 §1.3 的 D-1 ~ D-7（+3 个 src 文件、+3 个配置/脚本、+6 个测试文件）；模块划分本身（6 个目录）**完全一致** |
| 依赖方向规则是否被违反 | **无违反** | `npm run check:deps` 扫描 66 个源文件零违规；组合根与进程入口两处豁免已写明理由 |
| 全仓 `switch(` 出现位置 | **零出现** | 两处注册表用 `Map` 查找，源码以 `TODO(ARCH)` 标注为待重构 |
| 一类一文件核验 | **通过** | 脚本校验 66 个源文件：文件名 = 类名、每文件恰好 1 个顶层类型 |
| 复合图形类型相关代码 | **零命中** | 词边界口径 `grep -rniE "\bbox\b" src/` 零命中；`viewBox` 为 SVG 强制属性名，非类型名 |
| 逐字契约 | **§6 transcript 逐字节相等**；`help` 与 PRD Q10 逐字相等 | §3.2 |
| 单元测试 | **97 个用例全绿**（12 个测试文件） | `npm test` |
| 构建 | `npm run build` 通过，`node dist/index.js` 可运行 | §3.1 |

---

## 6. Git 提交历史

| 阶段 | Commit | 提交信息 |
|---|---|---|
| 基建 | `cbcd5df` | `chore: 初始化仓库与 Git 忽略规则`（主理人） |
| 需求 | `eaf799e` | `docs(prd): 补充产品需求文档`（主理人） |
| 架构 | `4595602` | `docs(architecture): 补充系统架构设计与任务分解`（主理人） |
| **T01** | `0805c11` | `feat(domain): 形状层次、属性访问器与文档模型` |
| **T02** | `b578b93` | `feat(io): SVG 序列化、解析与缺 id 自动补齐` |
| **T03** | `69cebec` | `feat(command): Command 模式骨架、19 条命令与撤销重做` |
| **T04** | `ec8ed21` | `feat(view): tree/show/help 渲染与 CLI 外壳` |
| 修正 | `b143b43` | `fix(command): 修正 addto 的子孙判定方向与同父容器重复入列`（见 §4.1） |

> 未 push、未打 tag（按主理人要求由其统一执行）。

---

## 7. 如何运行

```bash
npm install          # 依赖：fast-xml-parser（唯一运行时依赖）+ 4 个 devDeps
npm run cli          # 启动 REPL（= tsx src/index.ts）
npm test             # 单元测试（97 用例）
npm run typecheck    # 类型检查（src + test）
npm run check:deps   # 依赖方向 + 一类一文件 + 禁用项 自检
npm run build        # 产出 dist/（ESM，可 node dist/index.js 运行）
```
