# svg-editor-cli — 质量验收报告（Lab1 Phase 1）

> 版本：**最终验收版 v2.0**｜验收基线：`cee6a34` ~ `1869ddd`（main 分支，未 push、未打 tag）
> 作者：QA 工程师 严过关（Yan）｜角色：**独立验收方**（不复读实现方自述，全部结论亲自复现）
> 上游文档：`docs/PRD.md` **v1.1**、`docs/ARCHITECTURE.md` v1.0、`docs/IMPLEMENTATION.md`（含 Δ-1~Δ-8）、`doc/README.md`
>
> **编号约定**（全文统一，勿混）：
> - **D-01 ~ D-09** = **QA 缺陷**（本报告 §3 / §8）
> - **Δ-1 ~ Δ-8** = **实现与架构方案的差异**（`docs/IMPLEMENTATION.md` §1.3，本报告 §4 引用）
> - **R-xx / E-xx / T-xx** = PRD 的需求 / 错误文案 / 逐字会话契约编号
> - **L-1 ~ L-12** = 实现报告的已知限制编号
> - **O-01 ~ O-12** = QA 观察项（不构成缺陷，§3.4）

---

## 0. 结论摘要

| 维度 | 最终结论 |
|---|---|
| **总体判定** | ✅ **通过验收**。逐字契约、错误文案、失败原子性、架构硬约束全部达标；本轮 4 个缺陷已修复并复验通过。 |
| 测试规模 | **275 条 / 19 个测试文件**（黄金 178 + 既有单元/IO 97），**275 全绿、0 失败** |
| 逐字契约 T-xx | **25 / 25 通过**（另含 §6 完整 transcript 33 行、§6.1 流程图会话 15 行的整段字节级比对） |
| 逐字错误文案 E-xx | **E-01 ~ E-18 全部 18 条通过**（49 条错误用例 + 每条之后追加四维原子性断言） |
| 失败原子性 | **12 / 12 通过**（30 轮混合压测 + 10 轮重复压测 + 8 种组合场景） |
| 架构硬约束 | **12 / 12 通过**（`src/` 66 个源文件**全量扫描**，非抽样）：零 `switch (`、零 `\bbox\b`、零 `data-kind`、一类一文件、依赖矩阵零违规 |
| 覆盖率 | 语句 **89.39%**、分支 **90.40%**、函数 **92.83%**、行 **89.39%** |
| 缺陷闭环 | **D-01 ~ D-07 全部闭环**（4 个改码修复 + 3 个归口文档修订）；**新增 2 条 P2 文档缺陷（D-08 / D-09）**待订正 |
| 四道闸门 | `typecheck` 零错误 ／ `test` 275 全绿 ／ `check:deps` 66 文件零违规 ／ `build` 零错误且 `dist/index.js` 可运行 |

> **一句话交付结论**：命令 → 文档变更 → 逐字回显三者一一对应，失败原子性可断言，
> 架构硬约束被固化为可执行断言；本轮 QA 提出的 7 个缺陷全部闭环（4 个改码 + 3 个改文档），
> 剩余 2 条 P2 均为**文档交叉引用 / 表述订正**，不涉及任何代码。

---

## 1. 测试矩阵（最终）

### 1.1 分类 × 用例数 × 结果

| 分类 | 测试文件 | 用例数 | 通过 | 失败 | 覆盖要点 |
|---|---|:--:|:--:|:--:|---|
| **逐字契约（T-xx）** | `test/golden/session.spec.ts` | 28 | 28 | 0 | PRD §4.9 的 **T-01 ~ T-25 全部 25 条**逐字断言（`toBe` 完全相等，不用包含式匹配、不忽略空白）；T-07 / T-19 的 `tree` 逐字等于规格 §5.1 与 §6 原文（col=19，每一列空格参与比较）；另含 **§6 完整 transcript（33 行）** 与 **§6.1 流程图会话（15 行）** 的整段字节级比对 |
| **逐字错误文案（E-xx）** | `test/golden/errors.spec.ts` | 53 | 53 | 0 | **E-01 ~ E-18 全部 18 条**逐字断言 + 31 条触发路径变体；**每条错误用例之后追加原子性断言**（`tree` 文本 / 文档结构 / id 集合 / undo-redo 栈与 IO 锁，四维逐字比对） |
| **原子性** | `test/golden/atomicity.spec.ts` | 12 | 12 | 0 | 30 轮「成功编辑 → 失败命令 → 四维比对」混合压测 + 10 轮重复压测 + 8 种组合场景（出错后继续编辑 / undo / redo / undo+redo、group 中途出错、ungroup 后出错、保存失败后 undo、读入失败后文档不变、IO 锁下的出错与解锁） |
| **对抗场景** | `test/golden/adversarial.spec.ts` | 55 | 55 | 0 | 自造刁钻输入：id 大小写敏感共存、自动补 id 冲突顺延（`rect1` 占用 → 补 `rect2`/`rect3`）、E-07 的容器/子孙组合（与参数顺序无关）、ungroup 的"占据原位置"、addto 的子孙/自加/同父容器不重复入列、scale 的绝对坐标递归与非法因子、set 的白名单/容器/文本、undo/redo 栈空与清空、IO 锁优先级与解禁、显示类命令不入栈、`in` 子句与引号交互、浮点（`0.1+0.2 → 0.3`、`12.5` 原样、整数不带 `.0`）、极端输入（200 字符 id / 中文 id / 含空格 id / 负坐标 / 大数值 / 中文与尖括号文本）、tree 子树模式与列对齐边界、read→save 往返保真、save 路径语义链 |
| **架构约束** | `test/golden/architecture.spec.ts` | 12 | 12 | 0 | 四类硬约束**全量静态扫描** `src/`（66 文件）：零 `switch (`、零 `\bbox\b` 词边界命中、零 `data-kind`、一类一文件（文件名 = 类名）、依赖方向矩阵零违规、两处「待重构点①②」标注存在 |
| **进程级端到端** | `test/golden/cli-e2e.spec.ts` | 4 | 4 | 0 | 以**子进程**跑真正的 `src/index.ts` + 管道 stdin：stdout 与规格 transcript 同形、横幅后无空行、注释/空行无结果输出、错误单行且进程不中断 |
| **缺陷专项回归** | `test/golden/qa-defect-fixes.spec.ts` | 14 | 14 | 0 | 实现方为本轮 4 个缺陷补的专项回归（含 T-18 不被破坏的反向断言） |
| **黄金小计** | `test/golden/**`（7 文件） | **178** | **178** | **0** | |
| 既有单元 / IO | `test/unit/**`（10）、`test/io/**`（2） | 97 | 97 | 0 | 工程师已有用例，本次未改动 |
| **总计** | **19 个测试文件** | **275** | **275** | **0** | **全绿** |

### 1.2 「没有用例被删除或弱化」的证明

QA 保留的 3 条红灯用例在实现方修复后**自动转绿**，且断言强度**一字未改**：

```
$ git diff ebe06e7..HEAD --stat -- test/golden/session.spec.ts \
    test/golden/errors.spec.ts test/golden/atomicity.spec.ts \
    test/golden/architecture.spec.ts test/golden/adversarial.spec.ts \
    test/golden/cli-e2e.spec.ts test/support/
（输出为空 = QA 的 6 个黄金文件 + 4 个夹具文件相对 QA 上一次提交**逐字节相同**）

$ git diff ebe06e7..HEAD --stat -- test/
 test/fixtures/unmodeled.svg         |   6 ++
 test/golden/qa-defect-fixes.spec.ts | 185 ++++++++++++++++++++++++++++++++++++
 2 files changed, 191 insertions(+)
```

即：实现方**只新增**了 1 个 fixture 与 1 个回归文件（+14 例），
**未删除、未改写、未弱化 QA 的任何一条断言**（275 − 261 = 14，全部来自新增文件）。

---

## 2. 逐条结论表（对照 PRD **v1.1**）

> PRD v1.1 实际枚举 **55 条 R-xx**（P0 44 / P1 9 / P2 2）、**18 条 E-xx**、**25 条 T-xx**。
> v1.1 的修订记录（§9 PR-1 ~ PR-6）已吸收 QA 提出的 O-11、D-03、O-06、D-06、D-07、D-02 六项。

### 2.1 需求条目 R-01 ~ R-95（55 条）

#### CLI 外壳与 REPL

| ID | 状态 | 依据（文件 → 断言） |
|---|---|---|
| R-01 | ✅ | `cli-e2e.spec.ts` →「管道模式下 stdout 与规格 transcript 同形」断言 `svg> init 800 600` 同形；全部 178 条黄金用例均经 **REPL 层**逐行驱动 |
| R-02 | ✅ | `cli-e2e.spec.ts` →「注释行与空行不产生任何结果输出」；`adversarial.spec.ts` →「注释行与空行不产生任何输出」 |
| R-03 | ✅ | `cli-e2e.spec.ts` → 首行逐字 `svg-editor 0.1 — type 'help' for commands`；`session.spec.ts` → 整段 transcript 首行 |
| R-04 | ✅ | `errors.spec.ts` → **每条**错误用例后比对 `tree` / `structure` / `ids` / `history`；`atomicity.spec.ts` → 12 条 |
| R-05 | ✅ | `adversarial.spec.ts` →「未知命令报 `unknown command`，参数不足报 `usage:`」 |

#### 文档类命令

| ID | 状态 | 依据 |
|---|---|---|
| R-10 | ✅ | `session.spec.ts` → **T-01** `canvas 800x600 created`；无参默认 800×600 见 `adversarial.spec.ts` |
| R-11 | ✅ | `session.spec.ts` → **T-18**（告警行 + `read other.svg (7 elements)`）；画布 400×300 见 **T-19** |
| R-12 | ✅ | **T-16** `saved to demo.svg (5 elements)`；`adversarial.spec.ts` →「init 之后从未保存过时，无参 save 报专属文案」「显式 save 之后，无参 save 保存到同一个文件」「read 之后无参 save 保存到读入的路径」；v1.1 已按实测把措辞写实（PR-2），并新增 **E-18** 覆盖"两者皆无"分支 |
| R-13 | ✅ | **T-16** `(5 elements)`、**T-18** `(7 elements)`；容器子孙计入见 `adversarial.spec.ts` →「保存产物是标准 SVG」 |
| R-14 | ✅ | `adversarial.spec.ts` → `canvas 800x600` |
| R-15 | ✅ | `adversarial.spec.ts` → `canvas 400x300 updated`，改尺寸后 undo 被锁（E-14） |
| R-16 | ✅ | `adversarial.spec.ts` →「init / read 之后 undo 报 E-14（锁优先于栈空）」；`errors.spec.ts` → **E-14·read 变体** |

#### 图形编辑类命令

| ID | 状态 | 依据 |
|---|---|---|
| R-20 | ✅ | **T-02 ~ T-05**（rect/text/circle/rect）+ `adversarial.spec.ts` → ellipse/line/g |
| R-21 | ✅ | **T-21**、**T-22**；`errors.spec.ts` → **E-03**、**E-04** |
| R-22 | ✅ | **T-25** `error: unknown shape type: box (is the plugin loaded?)`；`errors.spec.ts` → **E-05**（含 `hexagon` 变体） |
| R-23 | ✅ | `errors.spec.ts` → **E-01**；`adversarial.spec.ts` →「r1 与 R1 是两个不同的 id，可以共存」「id 查找大小写敏感」 |
| R-24 | ✅ | **T-14**、**T-15**；容器连带子孙见 `atomicity.spec.ts` |
| R-25 | ✅ | **T-08**（叶子绝对位置）、**T-23**（容器增量）、**T-24**（容器撤销负增量） |
| R-26 | ✅ | `adversarial.spec.ts` →「作用于容器时递归到每个子孙各自相乘（绝对坐标语义）」「factor 为 0 或负数时报 E-09」 |
| R-27 | ✅ | `errors.spec.ts` → **E-13**；`adversarial.spec.ts` →「白名单外属性报 E-13」「容器只接受绘制属性」 |
| R-28 | ✅ | **T-11** `text#title updated: text="My Diagram v2"` |
| R-29 | ✅ | **T-06**；成员从原父容器摘出见 `adversarial.spec.ts` →「group 一次 undo 即复原全部成员」 |
| R-30 | ✅ | **T-13**；`adversarial.spec.ts` →「成员是『容器 + 其子孙』时点名该容器 id，且与参数顺序无关」；v1.1 已把括注改写为"那个自身包含了另一成员作为子孙的容器"（PR-3），与实现一致 |
| R-31 | ✅ | `errors.spec.ts` → **E-08**；`adversarial.spec.ts` →「普通容器解散后，子图形占据原容器的位置」 |
| R-32 | ✅ | `errors.spec.ts` → **E-03/E-04（addto 变体）**；`adversarial.spec.ts` →「把元素移进它当前所在的父容器：移到末尾且不重复入列」 |
| R-33 | ✅ | `adversarial.spec.ts` →「front / back 语义」 |
| R-34 | ✅ | `adversarial.spec.ts` →「scale 容器递归」「set 容器写入容器自身」「ungroup 提升子孙」——容器与叶子走同一套接口 |

#### 撤销 / 重做

| ID | 状态 | 依据 |
|---|---|---|
| R-40 | ✅ | `adversarial.spec.ts` →「撤销到栈空报 E-15」「undo 后产生新编辑会清空 redo 栈，再 redo 报 E-16」 |
| R-41 | ✅ | `adversarial.spec.ts` →「group 一次 undo 即复原全部成员的父容器与位置（R-41）」 |
| R-42 | ✅ | `adversarial.spec.ts` →「显示类命令（tree / show / help）不进入 undo 栈（R-42）」 |
| R-43 | ✅ | `errors.spec.ts` → **E-14**（undo/redo/read 三变体）；`atomicity.spec.ts` →「一次编辑之后 IO 锁解除，undo 恢复正常」 |
| R-44 | ✅ | **T-09**、**T-12**、**T-15**、**T-24**（move / set / delete / 容器 move 四种 undo 文案） |
| R-45 | ✅ | **T-10**；`adversarial.spec.ts` →「redo 回显与原命令首次执行逐字相同（R-45）」 |

#### 显示类命令

| ID | 状态 | 依据 |
|---|---|---|
| R-50 | ✅ | **T-07**、**T-19** 逐字；容器行只有 `tag#id` |
| R-51 | ✅ | **T-07**（col=19：`rect#bg` 后 8 / `text#title` 后 5 / `circle#c1` 后 2 / `rect#box` 后 3 空格）、**T-19**；§6.1 树 col=32 逐字见 `session.spec.ts`；列对齐边界见 `adversarial.spec.ts` →「对抗：tree 的子树模式与列对齐边界」 |
| R-52 | ✅ | `adversarial.spec.ts` →「对抗：show 的逐字格式（R-52 / PRD §5.2）」→「`show c1` 逐字等于规格 §5.2 的三行」「顶层元素的 parent 写作 svg」 |
| R-53 | ✅ | `adversarial.spec.ts` →「help 覆盖 §3 全部 19 个命令名（R-53 / R-94）」 |
| R-54 | ✅ | `adversarial.spec.ts` →「空文档的 tree 逐字只有 `svg (800x600)` 一行（R-54）」「`tree <叶子>` 逐字只有 `tag#id` 一行（R-54）」 |

#### SVG 读写契约

| ID | 状态 | 依据 |
|---|---|---|
| R-60 | ✅ | `adversarial.spec.ts` →「保存产物是标准 SVG：XML 声明 + xmlns + width/height + viewBox（R-60）」 |
| R-61 | ✅ | `adversarial.spec.ts` →「读入 → 保存 → 再读入：结构、层级、id、几何、paint、文本逐字一致」；未建模属性按 v1.1（PR-6）**忽略但产出 `warning: skipped attribute …` 告警**，`qa-defect-fixes.spec.ts` → D-02 组含 T-18 反向回归 |
| R-62 | ✅ | **T-18**（告警逐字且在汇总行之前） |
| R-63 | ✅ | `adversarial.spec.ts` →「已有 rect1 时，无名 `<rect>` 顺延为 rect2 并打印实际 id」「自动补 id 的序号按同标签计数」 |
| R-64 | ✅ | `adversarial.spec.ts` →「未设置的 fill / stroke 不写入 SVG（R-64）」；浮点见「小数原样保留，整数不带 .0」 |

#### 工程与流程约束

| ID | 状态 | 依据 |
|---|---|---|
| R-80 | ✅ | `architecture.spec.ts` →「每个 `src/**/*.ts` 恰好声明 1 个顶层类型」「文件名 = 类名」「`src/` 内零 `switch (` 分派」 |
| R-81 | ✅ | `architecture.spec.ts` →「零 `switch (`」「命令注册表标注『待重构点①』」「图形类型注册表标注『待重构点②』」 |
| R-82 | ✅ | `doc/README.md` 已交付，含四节（架构方案 / 过程记录 / 一致性自查 / 质量保证手段） |
| R-83 | ⏳ | 提交历史体现分步推进（16 次提交）；**推送远程与 `final` tag 由主理人统一执行**（QA 未 push、未打 tag、未改历史） |
| R-84 | ✅ | `doc/README.md` §2「过程记录」已含 AI 协作的发现/确认/纠正链（与本报告 §8 同源） |
| R-85 | ✅ | `architecture.spec.ts` →「`src/` 内零 `\bbox\b` 词边界命中」「零 `data-kind` 插件标记」 |

#### 增强项

| ID | 状态 | 依据 |
|---|---|---|
| R-90 | ✅ | `adversarial.spec.ts` →「set 容器写入容器自身」（`show g1` → `children=1` + `fill=#f5a623`）、「set text 内容回显带双引号」 |
| R-91 | ✅ | `adversarial.spec.ts` → `scaled by 2` / `created with 2 children` / `ungrouped` / `added to g#g1` / `moved to front` / `moved to back` |
| R-92 | ✅ | `adversarial.spec.ts` →「group 成员来自不同父容器时的顺序」（命令行顺序，见 O-07） |
| R-93 | ✅ | `adversarial.spec.ts` →「0.1 + 0.2 的浮点噪声被抹平为 0.3」「小数原样保留，整数不带 .0」；**溢出路径已修**（见 D-04 闭环） |
| R-94 | ✅ | `adversarial.spec.ts` →「help 覆盖 §3 全部 19 个命令名」；输出与 PRD Q10 版式逐字一致 |
| R-95 | ⏳ | PRD §2.2 Out of Scope（本阶段明确不做）；`doc/README.md`「变化点假设」已说明留缝理由 |

### 2.2 逐字错误文案 E-01 ~ E-18（18 条）

| # | 逐字期望 | 状态 | 依据（`test/golden/errors.spec.ts`） |
|---|---|:--:|---|
| E-01 | `error: id already exists: r1` | ✅ | `E-01`（create）+ `E-01·group 变体`；错误后四维状态逐字不变 |
| E-02 | `error: no such shape: r9` | ✅ | `E-02` 及 10 个触发路径变体（delete/move/scale/set/front/back/show/tree/group 成员/addto） |
| E-03 | `error: no such container: node9` | ✅ | `E-03` + `E-03·addto 变体` |
| E-04 | `error: not a container: start` | ✅ | `E-04` + `E-04·addto 变体`；v1.1 已把 `ungroup` 补入触发条件（PR-4） |
| E-05 | `error: unknown shape type: hexagon (is the plugin loaded?)` | ✅ | `E-05`（box）+ `E-05·其它类型名变体`（hexagon） |
| E-06 | `error: cannot ungroup composite shape: n1` | ✅ | `E-06`（用 `test/support/CompositeGroupStub.ts` 打开内核中不可达的分支，验证"文案到位"） |
| E-07 | `error: cannot group a container into its own descendant: g1` | ✅ | `E-07`；另有 `adversarial.spec.ts` 的 3 种容器/子孙组合与顺序无关性 |
| E-08 | `error: cannot ungroup top-level container: scene` | ✅ | `E-08` |
| E-09 | `error: scale factor must be positive` | ✅ | `E-09`（factor=0）+ `E-09·负数变体` |
| E-10 | `error: cannot read file: a.svg` | ✅ | `E-10`；另测非法 XML / 非 `<svg>` 根 → 同样归入 E-10 |
| E-11 | `error: cannot write file: a.svg` | ✅ | `E-11`（目录不存在） |
| E-12 | `error: no document. use 'init' or 'read' first` | ✅ | 17 个变体**全部通过**（含 `undo` / `redo` —— 修复前为红，见 D-01 闭环）；另有 3 条豁免用例（`help` / `init` / `read` 在无文档时不报 E-12） |
| E-13 | `error: unknown attribute: opacity` | ✅ | `E-13` |
| E-14 | `error: undo not allowed after io command` | ✅ | `E-14`（save 后 undo/redo 变体）+ `E-14·read 变体` |
| E-15 | `error: nothing to undo` | ✅ | `E-15` |
| E-16 | `error: nothing to redo` | ✅ | `E-16` + `E-16·新编辑清空 redo 栈变体` |
| **E-17** | `error: invalid id: must not be empty` | ✅ | **v1.1 新增**（PR-5）。`qa-defect-fixes.spec.ts` → D-07 组 4 例：空串 id、纯空白 id、`group` 空新容器 id、`group` 空成员 id，四者均不改变状态。QA 独立复验：4 条命令逐字一致且 `tree`/结构/id 集合不变 |
| **E-18** | `error: no file path. use 'save <file.svg>'` | ✅ | **v1.1 新增**（PR-5）。`adversarial.spec.ts` →「init 之后从未保存过时，无参 save 报专属文案」逐字一致 |

### 2.3 逐字会话契约 T-01 ~ T-25（25 条）

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
| T-18 | `read other.svg` | 告警行 + `read other.svg (7 elements)` | ✅ | 同上；**D-02 修复后仍只有 1 行告警**（`qa-defect-fixes.spec.ts` 含反向断言） |
| T-19 | `tree` | §6 八行（col=19） | ✅ | 同上 |
| T-20 | `create g node1` | `g#node1 created` | ✅ | 同上 |
| T-21 | `create rect start 120 100 160 60 #4a90d9 in node1` | `rect#start created in g#node1` | ✅ | 同上 |
| T-22 | `create text start-label 155 135 "开始" in node1` | `text#start-label created in g#node1` | ✅ | 同上 |
| T-23 | `move node2 0 100` | `g#node2 moved by (0,100)` | ✅ | 同上 |
| T-24 | `undo` | `g#node2 moved back by (0,-100)` | ✅ | 同上 |
| T-25 | `create box n1 120 100 160 60 "开始"` | `error: unknown shape type: box (is the plugin loaded?)` | ✅ | 同上 |

**断言方式**：全部 `toBe`（完全相等），无包含式匹配、无忽略空白。
多行输出用 `expect(actual.join('\n')).toBe(expected.join('\n'))` 做**整段字节级比对**。

**额外整段比对**（比 T-xx 更强的证据）：

| 用例 | 内容 | 状态 |
|---|---|:--:|
| §6 完整 transcript | 规格 §6 代码块的**全部 33 行 stdout**（含启动横幅）逐字相同 | ✅ |
| §6.1 流程图会话 | 规格 §6.1 的 15 行逐字相同，`tree` 与 **PRD §6.3 的归一版本（col=32）** 逐字相同 | ✅ |

---

## 3. 缺陷清单与最终状态

### 3.0 缺陷状态总表

| 编号 | 一句话 | 级别 | 最终状态 | 验证方式与证据 |
|---|---|:--:|---|---|
| **D-01** | 无文档时 `undo`/`redo` 报 E-15/E-16，应报 E-12 | P2 | ✅ **已修复并复验** | `errors.spec.ts` → `E-12·undo 变体` / `E-12·redo 变体` 由红转绿；三个优先级分支 QA 独立复验：① 无文档 → E-12 ② 有文档 + IO 锁 → E-14（锁优先）③ 有文档 + 栈空 → E-15 / E-16 |
| **D-02** | 读入含 `transform` 的外部 SVG 后再 `save`，容器变换被静默丢弃 | P1 | ✅ **已按裁决关闭**（改为读入时逐个显式告警 + 文档声明，登记为 L-1/L-2 与变化点 V-3） | `qa-defect-fixes.spec.ts` → D-02 组 2 例；QA 独立复验：`read unmodeled.svg` 输出 2 行告警（`warning: skipped attribute transform on g#diagram`、`warning: skipped attribute opacity on rect#a`）**均在汇总行之前**；**T-18 未被破坏**（`read other.svg` 仍只有 1 行告警） |
| **D-03** | `save` 无参保存到"最近一次显式 save 的路径"，与 R-12 字面不符 | P2 | ✅ **归口文档修订**（PRD v1.1 PR-2 改写 R-12 措辞，并新增 E-18 覆盖"两者皆无"） | `adversarial.spec.ts` →「init 之后从未保存过时，无参 save 报专属文案」「显式 save 之后…」「read 之后…」三条链路全部逐字符合 v1.1 新措辞 |
| **D-04** | 数值溢出被静默写成 `0`（几何被破坏且无任何提示） | P2 | ✅ **已修复并复验** | `adversarial.spec.ts` →「⚠ 已知缺陷 D-04：数值溢出被静默写成 0」由红转绿；QA 独立复验：`move big 1e308 1e308` → 单行 `error: invalid value for x: Infinity`，且 `tree`/结构/id 集合**逐字不变**、`x` 仍为 `1e+308`；`scale big 1e308` 同族处理；`set r1 x abc` → `error: invalid value for x: abc`，`set r1 x 42` 正常 |
| **D-05** | L-8 声明的"额外文案"清单不完整（实际 3 条，非 2 条） | P2 | ✅ **归口文档修订**（`docs/IMPLEMENTATION.md` L-8 已更新为 **4 条**） | `docs/IMPLEMENTATION.md` L-8 逐条列出 `invalid value for <name>: <raw>`、`internal error: <msg>`、`warning: skipped unsupported element: <tag>`、`warning: skipped attribute <name> on <tag>#<id>`；四条均在实际行为中复现 |
| **D-06** | `ungroup` 作用于叶子时复用 E-04 文案，超出 E-04 声明的触发条件 | P2 | ✅ **归口文档修订**（PRD v1.1 PR-4 把 `ungroup` 补入 E-04 触发条件） | `docs/PRD.md` v1.1 E-04 行已含 `ungroup`；行为未变（`error: not a container: a`），已由 `adversarial.spec.ts` 覆盖 |
| **D-07** | 允许创建空 id（`create rect "" …` → 畸形标题 `rect#`） | P2 | ✅ **已修复并复验**（新增 **E-17**） | `qa-defect-fixes.spec.ts` → D-07 组 4 例；QA 独立复验：空串 id、纯空白 id、`group` 空新容器 id、`group` 空成员 id 四者均输出 `error: invalid id: must not be empty`，且 `tree`/结构/id 集合逐字不变 |
| **D-08** | `docs/PRD.md` PR-5 把"save 无参无路径"问题记为 **D-09**，与本报告的缺陷编号 **D-03** 不一致 | **P2（新发现）** | ⏳ **待订正**（一行文字） | 全仓交叉引用审计：`docs/PRD.md` 仅此一处编号错指；其余 D-01~D-07 引用全部正确。**修法**：把 PRD PR-5 的 "D-09" 改为 "D-03" |
| **D-09** | `doc/README.md` §4.4 第 2 点把「§6 完整 transcript 逐字节比对」归给 `test/golden/cli-e2e.spec.ts`，但该文件实际比对的是**硬编码的 4 条命令**的进程级输出；§6 完整 transcript（33 行）的逐字比对实际位于 `test/golden/session.spec.ts` | **P2（新发现）** | ⏳ **待订正**（表述） | 源码核对：`test/golden/cli-e2e.spec.ts` 的期望值是写死的 9 行（banner + 3 条命令 + 提示符），**不**从规格文件抽取；`test/golden/session.spec.ts` →「整段 stdout 与规格逐字相同（含启动横幅）」才是 33 行 §6 transcript 的比对。**修法**：README §4.4 第 2 点改为「§6 完整 transcript 的 33 行整段字节级比对位于 `test/golden/session.spec.ts`；`cli-e2e.spec.ts` 负责进程级冒烟（真实 `src/index.ts` + 管道 stdin 的提示符/回显形态）」 |

### 3.1 P0 阻断 —— 0 条

未发现导致功能不可用、数据损坏或交付阻断的问题。

### 3.2 P1 重要 —— 1 条（D-02，已按裁决关闭）

#### D-02　读入含 `transform` 的外部 SVG 后再 `save`，容器变换被静默丢弃

| 项 | 内容 |
|---|---|
| **原症状** | `SvgParser` 不解析 `transform`、`SvgWriter` 不写回，读入带 `<g transform="translate(60,40)">` 的外部 SVG 后再 `save`，位移消失，**产物的视觉结果与原文件不同**，且用户毫不知情。 |
| **严重级别** | **P1 重要**（唯一一条）——规格 §0.1 把 `transform` 明确列为 `<g>` 的核心能力，PRD **G3** 承诺"外部 SVG 能读入、补 id 后继续编辑，结构与属性不丢失" |
| **裁决与修法** | 主理人确认**不做属性透传**，改为**读入时逐个显式告警 + 文档声明**。理由：① 静默丢弃的顾虑已被告警完全覆盖（读入当场可见）；② `extraAttributes` 与"内核只建模白名单属性"的既有取向相反（要往形状状态里塞一张本阶段不解释的表，`set` 白名单 / `tree` / `show` 契约 / 元素计数都需为它额外表态）；③ **透传 `transform` 会引入语义错误而非消除它**——本阶段 `move`/`scale` 作用于子孙自身坐标，叠加未解释的组级变换后，用户要"平移 10"实际会平移 10 + 变换量，**看似保真、实则错误**比诚实的丢弃更危险。完整解法是**组变换建模**（`docs/IMPLEMENTATION.md` 变化点 V-3），属独立阶段。 |
| **实现** | `ShapeFactory.modeledAttributeNames()` 按 provider schema 算出"被建模的属性名集合"（`id` + 建图参数 + 三个绘制属性），集合外的属性逐个告警 `warning: skipped attribute <name> on <tag>#<id>`，告警在 `read` 汇总行**之前**输出（`src/io/SvgParser.ts`、`src/domain/ShapeFactory.ts`） |
| **QA 独立复验** | ① `read unmodeled.svg` → 逐字输出 2 行告警，**均在汇总行之前**：<br>`warning: skipped attribute transform on g#diagram`<br>`warning: skipped attribute opacity on rect#a`<br>`read unmodeled.svg (2 elements)`<br>② **T-18 未被破坏**：`read other.svg` 仍**只有 1 行**告警（`warning: assigned id rect1 to unnamed <rect>`）+ `read other.svg (7 elements)`<br>③ 混合场景抽查：无名 + 未建模属性 → 先补 id 告警再报属性告警（均在汇总行前）；未知元素 `<path>` → 只出 `skipped unsupported element`（不重复报属性）；`line` 的 `stroke`/`stroke-width`、`ellipse` → **不产生**告警（已在建模集合内） |
| **回归用例** | `test/golden/qa-defect-fixes.spec.ts` → D-02 组 2 例 |
| **最终状态** | ✅ **已按裁决关闭**；残留边界（属性仍被丢弃，只是**当场可见**）已在 `docs/IMPLEMENTATION.md` L-1 / L-2 与 PRD v1.1 PR-6 中写明，并挂到变化点 V-3 |

### 3.3 P2 轻微 —— 6 条（D-01、D-03 ~ D-07，均已闭环）

| 编号 | 缺陷 | 严重级别 | 最终状态 | 验证方式与证据 |
|---|---|:--:|---|---|
| **D-01** | 无文档时 `undo`/`redo` 报 `error: nothing to undo` / `nothing to redo`，应报 E-12 | P2 | ✅ **已修复** | 修法：`UndoCommand` / `RedoCommand` 的 `execute()` 前置 `session.requireDocument()`。**回归**：`errors.spec.ts` → `E-12·undo 变体`、`E-12·redo 变体` 由红转绿。**QA 三分支复验**：<br>① 无文档 → `error: no document. use 'init' or 'read' first`（undo / redo 均是）<br>② 有文档 + IO 锁着 → `error: undo not allowed after io command`（**锁优先于栈空**，OQ-11 不变）<br>③ 有文档 + 已解锁 + 栈空 → `error: nothing to undo`；redo 栈真为空 → `error: nothing to redo` |
| **D-03** | `save` 无参的路径语义与 R-12 字面表述不一致 | P2 | ✅ **归口文档修订** | PRD v1.1 PR-2 把 R-12 改写为"无参时保存到最近一次**显式 save** 的路径；若从未显式 save 过，则退回最近一次 `read` 的路径；两者皆无 → E-18"，与实现**完全一致**，代码零改动。**回归**：`adversarial.spec.ts` → 三条 save 路径链路用例 |
| **D-04** | 数值溢出被静默写成 `0` | P2 | ✅ **已修复** | 修法：`Shape.translate` / `scaleBy` 在写回前做有限性闸门，非有限则抛 `invalid value for <属性名>: <原始值>`；`Shape.svgAttributes()` 另加落盘兜底。**回归**：`adversarial.spec.ts` → D-04 用例由红转绿。**QA 复验**：`move big 1e308 1e308` → 单行 `error: invalid value for x: Infinity`，`tree`/结构/id 集合**逐字不变**，`x` 仍为 `1e+308`；`scale big 1e308` → 同族 `error: invalid value for x: Infinity`；`set r1 x abc` → `error: invalid value for x: abc`；`set r1 x 42` → 正常 `rect#r1 updated: x=42` |
| **D-05** | L-8 额外文案清单不完整 | P2 | ✅ **归口文档修订** | `docs/IMPLEMENTATION.md` L-8 已由 2 条更新为 **4 条**（新增 `warning: skipped unsupported element: <tag>` 与 `warning: skipped attribute <name> on <tag>#<id>`），四条均在实际行为中复现 |
| **D-06** | `ungroup` 作用于叶子复用 E-04 文案，超出 E-04 触发条件 | P2 | ✅ **归口文档修订** | PRD v1.1 PR-4 把 `ungroup` 补入 E-04 触发条件；行为不变，PR 不影响实现 |
| **D-07** | 允许创建空 id | P2 | ✅ **已修复**（新增 **E-17**） | 修法：`CreateShapeCommand` / `GroupShapesCommand` 在 `validate()`（**快照捕获之前**）拒绝空串/纯空白 id，抛 `error: invalid id: must not be empty`；`create` 与 `group`（新容器 id + 成员 id）都覆盖。**回归**：`qa-defect-fixes.spec.ts` → D-07 组 4 例。**QA 复验**：4 条命令逐字一致，且 `tree`/结构/id 集合逐字不变 |

### 3.4 观察项（不构成缺陷，共 12 条；PRD v1.1 已吸收其中 6 条）

| # | 观察 | 最终结论 |
|---|---|---|
| O-01 | **L-5「横幅后不打印空行」的解释成立** | ✅ **成立，且有决定性证据**：规格 §6.1 的 transcript 代码块里**根本没有横幅行**，却同样在 `$ npm run cli` 与第一条 `svg> ` 之间有一个空行 —— 该空行只能是代码块内的**段落分隔**。§6 中 `group` / `read` 前也有同样空行，更不可能由任何输出规则产生。`cli-e2e.spec.ts` 断言横幅后紧接 `svg> `。**不需要改。** |
| O-02 | **L-6「管道模式回显输入行」成立** | ✅ 成立。`cli-e2e.spec.ts` 实测管道下 stdout 为 `svg> init 800 600`（与规格 transcript 同形）；TTY 下由终端回显，程序不重复输出。 |
| O-03 | **L-7「undo 单元 = 全量文档快照」成立** | ✅ 成立。`DocumentSnapshot.capture()` 走 `Document.clone()` 深拷贝。代价 O(文档规模)；`DocumentSnapshot` 已封装为类，可替换为差量 Memento（变化点 V-8）。 |
| O-04 | **L-8 第一条 `invalid value for <name>: <raw>` 成立** | ✅ 成立。实测 `create rect r2 0 0 x 1` → `error: invalid value for width: x`；`move r2 1 abc` → `error: invalid value for dy: abc`；`set neg x abc` → `error: invalid value for x: abc`；溢出后追加 `invalid value for x: Infinity`。 |
| O-05 | **L-8 第二条 `internal error: <msg>` 存在于代码但未构造出触发路径** | `src/cli/Repl.ts` 的 `Repl.describe()` 确有该兜底分支（把非 `CommandError` 压成单行）。QA 尝试了非法 XML、非 `<svg>` 根、3000 层深嵌套等路径，均被上层 catch 转为 E-10，**未能触发**。属防御性兜底，**不必改**。 |
| O-06 | **PRD R-30 括注与 §6 逐字示例措辞相反** | ✅ **PRD v1.1 PR-3 已改写**为"点名的是**那个自身包含了另一成员作为子孙的容器**"，与 §6 逐字示例及实现**三方一致**。实现本就正确，无需改码。 |
| O-07 | **规格 §3「保持相对顺序」与 PRD R-92「命令行顺序」在跨父容器 group 时冲突** | 实现按 PRD R-92（命令行顺序），与 §6 示例一致（二者无差异时相同）。`doc/README.md`「一致性自查」已说明采用 R-92 口径。 |
| O-08 | **`scale` 的 undo 文案用倒数因子** | `scale g1 3` 的 undo 文案是 `g#g1 scaled back by 0.3333333333`，而实际是快照精确还原。文案来自 PRD OQ-03 的建议值，**无契约约束**，仅作记录。 |
| O-09 | **`set <text> text 5` 回显 `text=5`（数值不加引号）** | L-9 的"数值不加引号"规则外推到文本内容后的结果，无契约约束，仅作记录。 |
| O-10 | **错误优先级：构造期错误先于 E-12** | `create box …` / `scale x -1` / 参数缺失等**构造期**错误在 `execute()` 之前抛出，因此无文档时它们报 E-05 / E-09 / `usage:` 而**不是** E-12。PRD 未规定优先级，**不作缺陷**；建议 README 写明"错误优先级：参数/类型校验 → 文档存在性 → 目标存在性"。 |
| O-11 | **PRD 的需求条目计数自相矛盾** | ✅ **PRD v1.1 PR-1 已更正**为 55 条（P0 44 / P1 9 / P2 2）。本报告 §2.1 按 55 条逐条验证。 |
| O-12 | **新告警机制会放大"噪声"** | 读入含 `text-anchor` / `font-size` 的 `<text>`（规格 §0.1 自己的示例 SVG 就有）会各产生一行告警——规格 §0.1 示例整体读入会得到 **6 行告警**（transform ×2、补 id ×2、text-anchor、font-size）。这是"显式告警"设计的**预期行为**（信息损失当场可见），但建议在 `doc/README.md`「已知限制」里提一句"读入外部 SVG 常见的 `text-anchor` / `font-size` / `class` / `transform` 均会告警"，避免使用者误以为出错。 |

---

## 4. 架构约束审计结论

> **抽样方式：全量扫描 `src/**`（66 个 `.ts` 文件），不是抽样。**
> 实现见 `test/golden/architecture.spec.ts`（12 条用例）；`scripts/check-deps.mjs` 提供同等判定的独立入口
> （`npm run check:deps`，退出码非 0 即违规）。两者**互为冗余**：约束违反会让 `npm test` 变红，而不只是脚本报错。

| # | 硬约束 | 审计方式 | 结论 |
|---|---|---|:--:|
| **C3-1** | `src/` 内**零** `switch (` 分派 | 对 66 个源文件逐个正则扫描 `/switch\s*\(/` | ✅ **零命中**。全仓不存在任何按标签 / 按命令名的 `switch` 分派；两处"按名字分派"（`CommandRegistry` / `ShapeRegistry`）用 `Map` 查找实现。 |
| **C3-2** | `src/` 内**零** `\bbox\b` 词边界命中 | 逐文件正则 `/\bbox\b/i`。**`viewBox` 天然不命中**（`viewBox` 的 "box" 前是字母 `w`，不构成词边界），无需额外白名单 | ✅ **零命中**。复合图形类型及其派生标识符 `data-kind` 在内核中**完全不存在**。 |
| **C2** | 每个 `.ts` 恰好**一个**顶层类型，且**文件名 = 类名** | 逐文件提取 `/^(?:export\s+)?(?:abstract\s+)?(?:class\|interface)\s+(\w+)/gm` 的全部匹配，与文件名比对 | ✅ **66 / 66 全部通过**（`src/index.ts` 为进程入口、不声明类型，按设计豁免）。 |
| **§5.3** | 模块依赖方向不越界 | 逐文件解析 `import` 语句 → 解析目标模块 → 与架构 §5.3 依赖矩阵比对 | ✅ **零违规**。组合根 `src/cli/Application.ts` 与进程入口 `src/index.ts` 的豁免与理由已写进脚本注释。 |
| **C4** | 两处"按名字分派"必须被显式标注为「待重构」 | 检查 `CommandRegistry.ts` 含 `待重构点①` + `TODO(ARCH)`；`ShapeRegistry.ts` 含 `待重构点②` + `TODO(ARCH)` | ✅ **两处均已标注**，满足 PRD R-81 与架构 §4.9。 |

**分层矩阵实测明细**（架构 §5.3，✔ = 允许、✘ = 禁止）：

| 依赖方 ＼ 被依赖 | shared | domain | io | view | command | cli |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `shared` | — | ✘ | ✘ | ✘ | ✘ | ✘ |
| `domain` | ✔ | — | ✘ | ✘ | ✘ | ✘ |
| `io` | ✔ | ✔ | — | ✘ | ✘ | ✘ |
| `view` | ✔ | ✔ | ✘ | — | ✘ | ✘ |
| `command` | ✔ | ✔ | ✔ | ✔ | — | ✘ |
| `cli` | ✔ | ✘ | ✘ | ✘ | ✔ | — |

- QA 追加的更严断言（各自独立成用例）：`domain` 不得 import `io`/`view`/`command`/`cli`；`view` 不得 import `command`/`io`；`command` 不得 import `cli`；`shared` 不得依赖任何其它模块。
- **实现与架构方案的差异**统一用 **Δ-1 ~ Δ-8** 编号（`docs/IMPLEMENTATION.md` §1.3），与本报告的缺陷编号 **D-xx** 互不混用；本轮新增 **Δ-7**（`test/golden/` 由 QA 实现 + 缺陷回归文件）、**Δ-8**（`test/fixtures/unmodeled.svg`）。
- `npm run check:deps` 独立复核输出：`依赖方向检查通过：扫描 66 个源文件，无违规。`

---

## 5. 质量度量（真实输出原文）

### 5.1 `npm run typecheck`

```
> svg-editor-cli@0.1.0 typecheck
> tsc -p tsconfig.test.json
```
**零错误、零输出**（覆盖 `src/**/*.ts` + `test/**/*.ts`，`strict` 模式）。

### 5.2 `npm test`

```
 Test Files  19 passed (19)
      Tests  275 passed (275)
   Duration  10.35s
```

> 最终复跑（`11904a9` 之后、实现方声明"不再动源码"之后）：仍为 **19 文件 / 275 全绿 / 0 失败**。

### 5.3 `npm run check:deps`

```
> svg-editor-cli@0.1.0 check:deps
> node scripts/check-deps.mjs

依赖方向检查通过：扫描 66 个源文件，无违规。
```

### 5.4 `npm run test:coverage`（v8 provider，`reportOnFailure: true`）

```
All files          |   89.39 |    90.4 |   92.83 |   89.39 |
 src               |       0 |       0 |       0 |       0 |
 src/cli           |    45.9 |   84.61 |   63.63 |    45.9 |
 src/command       |   97.88 |   97.36 |      95 |   97.88 |
 src/domain        |   93.97 |   91.79 |   92.56 |   93.97 |
 src/io            |   93.56 |    84.5 |     100 |   93.56 |
 src/shared        |   95.55 |     100 |    87.5 |   95.55 |
 src/view          |     100 |  97.43 |     100 |     100 |
```

| 范围 | 语句 | 分支 | 函数 | 行 |
|---|:--:|:--:|:--:|:--:|
| **全部 `src/`** | **89.39%** | **90.40%** | **92.83%** | **89.39%** |
| `src/command/` | 97.88% | 97.36% | 95.00% | 97.88% |
| `src/domain/` | 93.97% | 91.79% | 92.56% | 93.97% |
| `src/view/` | 100% | 97.43% | 100% | 100% |
| `src/io/` | 93.56% | 84.50% | 100% | 93.56% |
| `src/shared/` | 95.55% | 100% | 87.50% | 95.55% |
| `src/cli/` | 45.90% | 84.61% | 63.63% | 45.90% |
| `src/index.ts` | 0% | — | — | 0% |

**口径说明**：
- 已排除 3 个**纯类型文件**（`shared/Argument.ts`、`domain/ShapeProvider.ts`、`cli/InputSource.ts`）—— 只含 `interface`，编译后没有可执行语句，v8 会记成 0%，属统计噪声。
- `src/cli/` 偏低的原因是 `Application.ts` / `ReadlineInputSource.ts` / `index.ts` 是**进程入口**，只在 `cli-e2e.spec.ts` 里以**子进程**方式被端到端验证（子进程不计入 v8 覆盖率），因此**行为已被覆盖但统计上显示为 0%**。
- `vitest.config.ts` 已设 `coverage.reportOnFailure: true`，保证**有失败用例时也能产出覆盖率报告**。

### 5.5 `npm run build`（构建闸门）

```
> svg-editor-cli@0.1.0 build
> tsc -p tsconfig.json
```
**零错误**，产物 `dist/index.js` 可直接运行（`node dist/index.js` 正常输出横幅与提示符）。

> 至此四道闸门（typecheck / test / check:deps / build）全绿，
> 加覆盖率度量（§5.4）——**最终验收复跑于 `11904a9` 之后，结论不变**。

### 5.6 用例统计

| 类别 | 文件 | 用例数 |
|---|---|:--:|
| 逐字契约 T-xx | `session.spec.ts` | 28 |
| 逐字错误文案 E-xx | `errors.spec.ts` | 53 |
| 原子性 | `atomicity.spec.ts` | 12 |
| 对抗场景 | `adversarial.spec.ts` | 55 |
| 架构约束 | `architecture.spec.ts` | 12 |
| 进程级端到端 | `cli-e2e.spec.ts` | 4 |
| 缺陷专项回归 | `qa-defect-fixes.spec.ts` | 14 |
| 既有单元 / IO | `test/unit/**`（10）、`test/io/**`（2） | 97 |
| **总计** | **19** | **275** |

---

## 6. 已知限制复核（L-1 ~ L-12 逐条判定，v1.1 后的最终状态）

> 判定依据：**QA 亲自复现**，不采信实现方自述。

| # | 实现方自述 | 判定 | QA 复现结论与证据 |
|---|---|:--:|---|
| **L-1** | 读入 `transform` 不保真 | ✅ 成立（**已由 D-02 关闭**：改为读入即告警） | 复现：读入带 `<g transform="translate(60,40)">` 的文件 → `save` 后 `transform` 消失，**但读入当场输出** `warning: skipped attribute transform on g#diagram`。信息损失**可见**了；完整解法（组变换建模）已挂到变化点 V-3。 |
| **L-2** | 未建模属性不写回 | ✅ 成立（**已由 D-02 关闭**：逐个告警） | 复现：`opacity="0.5"`、`class="x"` 读入后 `save` 均被丢弃，**且各有一行告警**。PRD v1.1 PR-6 已把 R-61 措辞改为"忽略、**不报错**但产出告警"。 |
| **L-3** | 允许 id = `svg` | ✅ 成立（**可接受**） | 复现：`create rect svg 0 0 1 1` → `rect#svg created`；`show svg` → `rect#svg  parent=svg`（父级显示标签名，语义不歧义）。PRD OQ-13 建议"允许，仅在 README 记录"。**无需改代码。** |
| **L-4** | `save` 无参保存到「读入时的路径」 | ✅ 成立（**PRD v1.1 PR-2 已按实测写实**） | 三段链路实测：`init` 后无参 save → `error: no file path. use 'save <file.svg>'`（新增 E-18）；`save demo.svg` 后无参 save → `saved to demo.svg (1 elements)`；`read other.svg` 后无参 save → `saved to other.svg (7 elements)`。**与 v1.1 的 R-12 新措辞完全一致。** |
| **L-5** | 横幅后**不**打印空行 | ✅ **确认成立（解释正确，无需改）** | **决定性证据**：规格 §6.1 的 transcript 代码块**没有横幅行**，却同样在 `$ npm run cli` 与第一条 `svg> ` 之间有一个空行 → 该空行只能是代码块内的**段落分隔**。§6 中 `group` / `read` 前也有同样空行，更不可能由输出规则产生。实测 CLI：横幅后紧接 `svg> `。**QA 独立判定：L-5 成立。** |
| **L-6** | 管道模式下回显输入行 | ✅ 成立（**可接受**） | 实测（管道）：`svg> init 800 600` 与 transcript 同形；TTY 下由终端回显，程序不重复输出。`cli-e2e.spec.ts` 已固化为端到端断言。 |
| **L-7** | undo 单元 = 全量文档快照 | ✅ 成立（**可接受**） | `DocumentSnapshot.capture()` → `Document.clone()` 深拷贝。代价 O(文档规模)；已封装为类，可替换为差量 Memento（变化点 V-8）。**建议 README 声明。** |
| **L-8** | 额外的错误/告警文案 | ✅ 成立（**清单已由 2 条补为 4 条**，D-05 关闭） | ① `invalid value for <name>: <raw>`：成立（实测 4 处，含溢出）；② `internal error: <msg>`：兜底分支存在但**未构造出触发路径**；③ `warning: skipped unsupported element: <tag>`：成立；④ `warning: skipped attribute <name> on <tag>#<id>`：成立（D-02 修法新增）。**清单已与实现一致。** |
| **L-9** | `set` 的引号规则 | ✅ 成立 | 实测：`set r1 x 42` → `rect#r1 updated: x=42`；`set r1 fill #abc` → `rect#r1 updated: fill="#abc"`；`set t1 text "My Diagram v2"` → `text="My Diagram v2"`。与 PRD OQ-03 的三条样例完全吻合。边界见 O-09。 |
| **L-10** | `addto` 冲突文案点名**源图形 id** | ✅ 成立 | 实测：`addto inner outer`（outer 是 inner 的祖先）→ `error: cannot add a container into its own descendant: outer`（点名源 `outer`）；`addto g1 g1` → 同文案点名 `g1`。与文案句意"把（源）容器加进它自己的子孙"一致。 |
| **L-11** | `group` 成员重复复用 E-01 文案 | ✅ 成立 | 实测：`group dup r1 r1` → `error: id already exists: r1`。文案可接受。 |
| **L-12** | vitest `fileParallelism: false`（Windows EPERM 规避） | ✅ 成立（**可接受**） | 本机（Windows）复跑 19 个文件串行通过，耗时 11.2s。属环境限制而非设计缺陷；已在 `vitest.config.ts` 注释说明。**建议 README 记录。** |

---

## 7. 质量保证手段小结（**可直接搬用**）

> 本节按"可直接引用进 `doc/README.md`「质量保证手段」节"的标准撰写，措辞已去口语化。

### 7.1 三道可复现的闸门

1. **类型闸门**：`npm run typecheck`（`tsc -p tsconfig.test.json`）覆盖 `src/` 与 `test/` 全部文件，`strict` 模式，**零错误**。
2. **依赖与结构闸门**：`npm run check:deps`（`scripts/check-deps.mjs`）把架构方案里的硬约束变成**可执行断言**——模块依赖方向 6×6 矩阵、禁止 `switch (`、禁止 `\bbox\b`（复合图形实现）、一类一文件（文件名 = 类名、每文件恰好 1 个顶层类型）；任一违规**退出码非 0**。同一套判定又被 `test/golden/architecture.spec.ts` 引用，因此**约束违反会让 `npm test` 变红**，而不只是脚本报错。
3. **功能闸门**：`npm test` —— **275 条用例 / 19 个测试文件全绿**。

### 7.2 逐字契约：最硬的一条防线

规格把大量验收点写成**逐字输出**（错误文案、`tree`/`show` 形态、命令回显），这类契约无法靠"看起来对"来验收。本项目的做法是：

1. **把逐字期望直接写进测试**，断言一律用完全相等（`toBe`），**不允许包含式匹配、不允许忽略空白**；多行输出用 `expect(actual.join('\n')).toBe(expected.join('\n'))` 做整段字节级比对。`tree` 的**列对齐空格数**（如 §5.1 的 col=19：8 / 5 / 2 / 3 个空格）全部参与比较。
2. **整段 transcript 比对**：规格 §6 的完整会话（33 行 stdout，含启动横幅）在 `test/golden/session.spec.ts` 中被逐字节比对；规格 §6.1 的两节点流程图会话（15 行，`tree` 按 PRD Q1 裁决的全局单列规则 `col = 32` 归一）同样逐字比对。
3. **错误表全覆盖**：PRD 的 **E-01 ~ E-18 全部 18 条**逐字断言，并额外派生 31 条**触发路径变体**（同一条文案在 delete / move / scale / set / front / back / show / tree / group 成员 / addto / canvas / save / undo / redo 等入口下都成立），确保"文案对了"且"该报错的地方都报了"。
4. **进程级冒烟**：`test/golden/cli-e2e.spec.ts` 以**子进程**运行真正的 `src/index.ts`（管道 stdin/stdout），验证真实环境下的提示符、输入回显、横幅与错误行形态，避免"命令层绿、真进程挂"。

### 7.3 失败原子性：可断言的"不改变任何状态"

规格要求"命令失败不改变任何状态"，这条最容易被实现悄悄破坏。本项目把它做成了**四维逐字比对**：

- 每一条错误用例在断言错误文案之后，立刻再执行一次 `tree` 并与出错前的输出**逐字比对**；
- 同时比对**文档结构串**（层级 + id，不含列对齐空格，捕捉"看不见"的结构变化）、**id 集合**（捕捉 id 泄漏 / 误删）、**undo-redo 栈与 IO 锁状态**（捕捉历史污染）；
- 另有 `test/golden/atomicity.spec.ts` 做**连续多轮**压测：30 轮「成功编辑 → 失败命令 → 四维比对」混合压测、10 轮同一批失败命令重复压测（验证无状态漂移），以及 8 种组合场景（出错后继续编辑、出错后 undo、**出错后 redo**、出错后 undo+redo、group 中途出错、ungroup 之后出错、保存失败之后 undo 仍可用、读入失败之后当前文档保持不变、IO 锁状态下的出错不解锁）。

### 7.4 缺陷即证据：把红灯留给修复

发现源码缺陷时，**不改源码、不弱化断言**，而是**保留一条失败的回归用例**作为证据交给实现方。修复后该用例**自动转绿**，无需人工改测试。本轮 QA 提出的 7 个缺陷全部走完这条链路：

- **改码修复 4 个**（D-01 错误码优先级、D-04 数值溢出静默归零、D-07 空 id 被接受、D-02 未建模属性静默丢弃）—— QA 保留的红灯用例由红转绿，断言强度一字未改；
- **归口文档修订 3 个**（D-03 `save` 路径语义、D-05 L-8 清单不完整、D-06 `ungroup` 复用 E-04 文案）—— PRD 升版至 v1.1 吸收，实现零改动。

### 7.5 独立验收与交叉复核

- QA 以**独立验收方**身份工作：实现方的自述与自检结论**默认不成立**，一律由 QA 亲自复现（含 L-1 ~ L-12 逐条复核，其中 L-4、L-5、L-8 的结论被修正）。
- 关键结论**交叉复核**：`tree` 列对齐规则由 QA 独立演算（`col = 2 + max(4×depth + len(tag#id))`）并与规格 §5.1 / §6（col=19）、PRD §6.3（col=32）双向验证；规格 §6 transcript 除测试用例外，再由主理人用独立脚本（从规格文件正则抽取）复核一次，结果零差异。
- **文档一致性**也被当作缺陷对待：PRD 条目计数自相矛盾（55 vs 57）、R-30 括注与逐字示例矛盾、PRD 内部缺陷编号错指、README 对测试文件的归属描述失准 —— 均已记录并指派订正。

### 7.6 可复现的度量

- 覆盖率：`npm run test:coverage`（v8 provider；`coverage.reportOnFailure: true` 保证有红用例时也能产出数据）——语句 **89.39%**、分支 **90.40%**、函数 **92.83%**、行 **89.39%**。已排除 3 个纯类型文件（无运行时语句）；`src/cli/` 偏低是因为进程入口由子进程端到端验证、不计入 v8 统计。
- 用例规模：**275 条 / 19 个文件**；黄金套件 178 条（占 65%），其中逐字契约 + 逐字错误文案 + 原子性三类 93 条直接对应规格的"可断言"要求。
- 回归套件与实现同仓同跑，`npm test` 一条命令即可复现全部结论。

---

## 8. 缺陷闭环记录（发现 → 根因 → 修法 → 回归用例 → 最终状态）

> 本节按"可读的闭环链"组织，供 `doc/README.md`「过程记录」节直接取材。

### 8.1 闭环总览

| 编号 | 一句话 | 发现方式 | 根因 | 修法 | 回归用例 | 最终状态 |
|---|---|---|---|---|---|---|
| **D-01** | 无文档时 `undo`/`redo` 报的是"栈空"而不是"无文档" | QA 逐条复现 E-01~E-18 时发现 E-12 的 `undo`/`redo` 两个变体不匹配 | `UndoCommand` / `RedoCommand` 先查历史栈，`requireDocument()` 只在 `EditCommand.undo()` 内部才被调用 | 在两个命令的 `execute()` **第一行**前置 `session.requireDocument()`，让 E-12 优先于 E-15/E-16；IO 锁优先级（OQ-11）保持不变 | `errors.spec.ts` → `E-12·undo 变体`、`E-12·redo 变体`（**由红转绿**） | ✅ 已修复，QA 三分支复验通过 |
| **D-02** | 未建模属性（`transform` / `opacity`）被**静默**丢弃，产物视觉结果改变 | QA 读入外部 SVG 做往返保真测试时发现 `transform` 消失且无任何提示 | `SvgParser` 只提取建模属性，未建模的直接丢掉、不发任何信号 | **裁决：不做属性透传**（透传会让 `move`/`scale` 与组级变换叠加，产生"看似保真、实则语义错误"）；改为**读入时逐个显式告警** `warning: skipped attribute <name> on <tag>#<id>`，告警在汇总行之前；完整解法（组变换建模）挂到变化点 V-3 | `qa-defect-fixes.spec.ts` → D-02 组 2 例（含 T-18 反向回归） | ✅ 已按裁决关闭；PRD v1.1 PR-6 + L-1/L-2 写明 |
| **D-03** | `save` 无参的保存路径与 PRD R-12 字面表述不一致 | QA 逐条验证 L-4 的三段链路 | `SaveCommand` 无参时取 `session.filePath`，而 `EditorSession.setFilePath()` 在**显式 save** 后也会更新它 | **归口文档修订**：PRD v1.1 PR-2 把 R-12 写实为"最近一次显式 `save` 的路径；未显式 save 则退回最近一次 `read`；两者皆无 → E-18"，并新增 E-18 文案。**实现零改动** | `adversarial.spec.ts` → 三条 save 路径链路用例 | ✅ 归口文档修订完成 |
| **D-04** | 数值溢出被**静默写成 0**，几何被破坏而命令还"成功" | QA 用极端输入探测（`move big 1e308 1e308`） | `NumberFormat.format()` 对非有限值返回 `'0'` 作兜底；`Shape.translate` / `scaleBy` 未检测溢出 | 在**写回文档的路径**加有限性闸门：`translate` / `scaleBy` 写入前检查计算结果，非有限则抛 `invalid value for <属性名>: <原始值>`；异常走 `EditCommand.execute()` 既有的 try/catch 快照回滚，失败不留痕迹；`svgAttributes()` 另加落盘兜底 | `adversarial.spec.ts` → D-04 用例（**由红转绿**） | ✅ 已修复，QA 复验单行错误 + 状态逐字不变 |
| **D-05** | 实现报告声明"额外文案只有 2 条"，实际有 3 条 | QA 把 `docs/IMPLEMENTATION.md` 的 L-8 与实际行为逐条对照 | L-8 撰写时未包含 OQ-06 的"跳过未知元素"告警 | **归口文档修订**：L-8 更新为 **4 条**（新增 `warning: skipped unsupported element: <tag>` 与 D-02 新增的 `warning: skipped attribute …`） | 行为本身已被 `adversarial.spec.ts` 覆盖；文档由 IMPLEMENTATION.md 承载 | ✅ 归口文档修订完成 |
| **D-06** | `ungroup <叶子>` 复用 E-04 文案，但 E-04 的触发条件没列 `ungroup` | QA 探测 `ungroup` 作用于叶子时的输出 | 实现复用了 E-04 文案，但 PRD 未枚举该触发点 | **归口文档修订**：PRD v1.1 PR-4 把 `ungroup` 补入 E-04 触发条件。**实现零改动** | `adversarial.spec.ts` →「ungroup 之后再出错」 | ✅ 归口文档修订完成 |
| **D-07** | 空 id 被接受，产生畸形标题 `rect#` | QA 用极端输入探测（`create rect "" …`） | id 只做了"唯一性"检查，没有"非空"检查 | 在 `validate()`（**快照捕获之前**）拒绝空串 / 纯空白 id，抛 `error: invalid id: must not be empty`（新增文案，登记为 **E-17**）；`create` 与 `group`（新容器 id 与成员 id）都覆盖 | `qa-defect-fixes.spec.ts` → D-07 组 4 例 | ✅ 已修复，QA 复验 4 条命令逐字一致且状态不变 |
| **D-08** | PRD PR-5 把"save 无参无路径"问题记为 **D-09**，与实际编号 **D-03** 不符 | QA 复验时做全仓缺陷编号交叉引用审计 | 撰写 PR-5 时误用了另一套编号 | 把 PRD PR-5 的 "D-09" 改为 "D-03"（**一行文字**） | — （文档交叉引用，建议后续加一条"文档编号一致性"断言） | ⏳ **待订正** |
| **D-09** | `doc/README.md` §4.4 第 2 点把「§6 完整 transcript 逐字节比对」归给 `cli-e2e.spec.ts`，但该文件比对的是硬编码的 4 条命令 | QA 复验时核对 README 与测试源码的对应关系 | 撰写 README 时把"主理人独立脚本的抽取比对"与 QA 测试文件的职责混在了一起 | 改为：§6 完整 transcript（33 行）的整段字节级比对位于 `test/golden/session.spec.ts`；`cli-e2e.spec.ts` 负责进程级冒烟（真实 `src/index.ts` + 管道 stdin 的提示符/回显形态） | — （文档表述） | ⏳ **待订正** |

### 8.2 这条闭环链本身的三个可复用经验

1. **红灯用例是最便宜的接口文档**：把"期望的逐字输出"写进测试并让它变红，等于把缺陷的复现步骤、期望值与实际值**一次性固化**下来，交接成本几乎为零。
2. **"改码"与"改文档"都是合法闭环**：D-03 / D-05 / D-06 并非实现 bug，而是**规格与实现的口径差**。此时正确动作是让 PRD 升版吸收，而不是把实现改成另一种更"正确"的样子——本轮 3 条走文档修订、0 条返工。
3. **裁决要写清"为什么不做"**：D-02 最终选择"告警而非透传"，其价值不在结论本身，而在于把"透传 `transform` 会让 `move`/`scale` 叠加出错"这个**反例**写进了 PRD 与实现报告——后来者不会再重复走一遍这条看起来更"保真"的路。

---

## 9. 遗留事项

| # | 事项 | 级别 | 责任方 | 说明 |
|---|---|:--:|---|---|
| 1 | **D-08**：`docs/PRD.md` PR-5 的 "D-09" → "D-03" | P2 | 主理人 / 产品经理 | 一行文字 |
| 2 | **D-09**：`doc/README.md` §4.4 第 2 点关于 §6 transcript 比对归属的表述 | P2 | 主理人 | 一处表述订正（QA 不改他人文件） |
| 3 | **O-12**：在 `doc/README.md`「已知限制」里提一句"读入外部 SVG 常见的 `text-anchor` / `font-size` / `class` / `transform` 均会产生告警" | P2 | 主理人 | 避免使用者误以为出错 |
| 4 | **O-10**：在 README 写明错误优先级（参数/类型校验 → 文档存在性 → 目标存在性） | P2 | 主理人 | 说明为何 `create box` 在无文档时报 E-05 而非 E-12 |
| 5 | **O-03 / L-7 / L-12**：在 README 声明"undo 单元 = 全量快照（O(文档规模)）"与"测试串行执行（Windows EPERM 规避）" | P2 | 主理人 | 已知限制透明化 |
| 6 | **推送远程 + `final` tag** | — | 主理人 | 任务书 §1.1 要求；QA 未 push、未打 tag、未改 git 历史 |
| 7 | （可选）加一条"文档缺陷编号一致性"断言，锁住 D-08 这类错指 | P3 | QA | 本轮未加（提交范围限定为 `docs/QUALITY.md`） |

---

*本报告由 QA 工程师严过关独立产出；所有结论均由 `npm run typecheck` / `npm test` / `npm run check:deps` / `npm run test:coverage` 的真实输出与逐条回归用例支撑。本轮 QA 未修改 `src/` 下任何文件。*
