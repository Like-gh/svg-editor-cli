import { describe, expect, it } from 'vitest';
import { GoldenSession } from '../support/GoldenSession.js';
import { CompositeGroupStub } from '../support/CompositeGroupStub.js';
import { captureState } from '../support/SessionState.js';
import { TempWorkspace } from '../support/TempWorkspace.js';

/**
 * PRD §4.8「错误信息逐字表」—— **E-01 ~ E-16 全部 16 条**。
 *
 * 断言方式：**完全相等**（`toBe`），单行输出，前缀 `error: ` 只出现一次。
 *
 * 每条错误用例之后追加**原子性断言**（R-04 / C6）：
 * 失败之后 `tree` 的输出、文档结构、id 集合、undo/redo 栈状态
 * 必须与出错前**逐字相同**——失败不允许改变任何状态。
 */

/** 一条错误契约。 */
type ErrorCase = {
  /** 契约编号（E-01 ~ E-16；同一条的其它触发路径用 `·` 后缀标注） */
  readonly id: string;
  /** 触发命令（逐字） */
  readonly input: string;
  /** 期望错误行（逐字，含 `error: ` 前缀） */
  readonly expected: string;
  /** 前置命令 */
  readonly setup: readonly string[];
  /** 前置的额外准备（用于构造内核不可达的状态） */
  readonly prepare?: (session: GoldenSession) => void;
  /** 该用例是否处于"尚无文档"状态 */
  readonly withoutDocument?: boolean;
};

/** 状态快照：出错前后必须逐字相同。 */

/** 采集当前会话的可比较状态。 */
const capture = captureState;

const BASE_SETUP = ['init 800 600'] as const;

const ERROR_CASES: readonly ErrorCase[] = [
  {
    id: 'E-01',
    input: 'create rect r1 0 0 1 1',
    expected: 'error: id already exists: r1',
    setup: [...BASE_SETUP, 'create rect r1 0 0 1 1'],
  },
  {
    id: 'E-01·group 变体',
    input: 'group r1 c1',
    expected: 'error: id already exists: r1',
    setup: [...BASE_SETUP, 'create rect r1 0 0 1 1', 'create circle c1 1 1 1'],
  },
  {
    id: 'E-02',
    input: 'delete r9',
    expected: 'error: no such shape: r9',
    setup: [...BASE_SETUP],
  },
  {
    id: 'E-02·move 变体',
    input: 'move r9 1 1',
    expected: 'error: no such shape: r9',
    setup: [...BASE_SETUP],
  },
  {
    id: 'E-02·scale 变体',
    input: 'scale r9 2',
    expected: 'error: no such shape: r9',
    setup: [...BASE_SETUP],
  },
  {
    id: 'E-02·set 变体',
    input: 'set r9 fill red',
    expected: 'error: no such shape: r9',
    setup: [...BASE_SETUP],
  },
  {
    id: 'E-02·front 变体',
    input: 'front r9',
    expected: 'error: no such shape: r9',
    setup: [...BASE_SETUP],
  },
  {
    id: 'E-02·back 变体',
    input: 'back r9',
    expected: 'error: no such shape: r9',
    setup: [...BASE_SETUP],
  },
  {
    id: 'E-02·show 变体',
    input: 'show r9',
    expected: 'error: no such shape: r9',
    setup: [...BASE_SETUP],
  },
  {
    id: 'E-02·tree 变体',
    input: 'tree r9',
    expected: 'error: no such shape: r9',
    setup: [...BASE_SETUP],
  },
  {
    id: 'E-02·group 成员变体',
    input: 'group g1 r9',
    expected: 'error: no such shape: r9',
    setup: [...BASE_SETUP],
  },
  {
    id: 'E-02·addto 变体',
    input: 'addto g1 r9',
    expected: 'error: no such shape: r9',
    setup: [...BASE_SETUP, 'create g g1'],
  },
  {
    id: 'E-03',
    input: 'create rect start 120 100 160 60 #4a90d9 in node9',
    expected: 'error: no such container: node9',
    setup: [...BASE_SETUP],
  },
  {
    id: 'E-03·addto 变体',
    input: 'addto node9 r1',
    expected: 'error: no such container: node9',
    setup: [...BASE_SETUP, 'create rect r1 0 0 1 1'],
  },
  {
    id: 'E-04',
    input: 'create rect s2 0 0 1 1 in start',
    expected: 'error: not a container: start',
    setup: [...BASE_SETUP, 'create rect start 120 100 160 60 #4a90d9'],
  },
  {
    id: 'E-04·addto 变体',
    input: 'addto start r2',
    expected: 'error: not a container: start',
    setup: [...BASE_SETUP, 'create rect start 120 100 160 60 #4a90d9', 'create rect r2 0 0 1 1'],
  },
  {
    id: 'E-05',
    input: 'create box n1 120 100 160 60 "开始"',
    expected: 'error: unknown shape type: box (is the plugin loaded?)',
    setup: [...BASE_SETUP],
  },
  {
    id: 'E-05·其它类型名变体',
    input: 'create hexagon h1',
    expected: 'error: unknown shape type: hexagon (is the plugin loaded?)',
    setup: [...BASE_SETUP],
  },
  {
    id: 'E-06',
    input: 'ungroup n1',
    expected: 'error: cannot ungroup composite shape: n1',
    setup: [...BASE_SETUP],
    prepare: (session: GoldenSession) => {
      session.session.document?.addChild(new CompositeGroupStub('n1'));
    },
  },
  {
    id: 'E-07',
    input: 'group bad r1 g1',
    expected: 'error: cannot group a container into its own descendant: g1',
    setup: [...BASE_SETUP, 'create g g1', 'create rect r1 0 0 1 1 in g1'],
  },
  {
    id: 'E-08',
    input: 'ungroup scene',
    expected: 'error: cannot ungroup top-level container: scene',
    setup: [...BASE_SETUP, 'create g scene'],
  },
  {
    id: 'E-09',
    input: 'scale c1 0',
    expected: 'error: scale factor must be positive',
    setup: [...BASE_SETUP, 'create circle c1 100 100 20'],
  },
  {
    id: 'E-09·负数变体',
    input: 'scale c1 -1',
    expected: 'error: scale factor must be positive',
    setup: [...BASE_SETUP, 'create circle c1 100 100 20'],
  },
  {
    id: 'E-10',
    input: 'read a.svg',
    expected: 'error: cannot read file: a.svg',
    setup: [...BASE_SETUP],
  },
  {
    id: 'E-11',
    input: 'save no_such_dir_xyz/a.svg',
    expected: 'error: cannot write file: no_such_dir_xyz/a.svg',
    setup: [...BASE_SETUP],
  },
  {
    id: 'E-12',
    input: 'tree',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-12·create 变体',
    input: 'create rect r1 0 0 1 1',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-12·delete 变体',
    input: 'delete r1',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-12·move 变体',
    input: 'move r1 1 1',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-12·scale 变体',
    input: 'scale r1 2',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-12·set 变体',
    input: 'set r1 fill red',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-12·group 变体',
    input: 'group g1 r1',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-12·ungroup 变体',
    input: 'ungroup g1',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-12·addto 变体',
    input: 'addto g1 r1',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-12·front 变体',
    input: 'front r1',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-12·back 变体',
    input: 'back r1',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-12·show 变体',
    input: 'show r1',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-12·canvas 显示变体',
    input: 'canvas',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-12·canvas 改尺寸变体',
    input: 'canvas 100 100',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-12·save 变体',
    input: 'save',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    // ⚠ 已知缺陷 D-01（见 docs/QUALITY.md）：无文档时 `undo` 命中的是
    // 历史栈判空（E-15），而不是 E-12。PRD E-12 的豁免名单只有
    // init / read / help，`undo` 属于"其它命令"，应报 E-12。
    // 本用例**故意保持失败**作为证据，等待工程师修复后自动转绿。
    id: 'E-12·undo 变体',
    input: 'undo',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    // ⚠ 同 D-01：`redo` 同理应为 E-12。
    id: 'E-12·redo 变体',
    input: 'redo',
    expected: "error: no document. use 'init' or 'read' first",
    setup: [],
    withoutDocument: true,
  },
  {
    id: 'E-13',
    input: 'set r1 opacity 0.5',
    expected: 'error: unknown attribute: opacity',
    setup: [...BASE_SETUP, 'create rect r1 0 0 1 1'],
  },
  {
    id: 'E-14',
    input: 'undo',
    expected: 'error: undo not allowed after io command',
    setup: [...BASE_SETUP, 'create rect r1 0 0 1 1', 'save demo.svg'],
  },
  {
    id: 'E-14·redo 变体',
    input: 'redo',
    expected: 'error: undo not allowed after io command',
    setup: [...BASE_SETUP, 'create rect r1 0 0 1 1', 'save demo.svg'],
  },
  {
    id: 'E-14·read 变体',
    input: 'undo',
    expected: 'error: undo not allowed after io command',
    setup: [...BASE_SETUP, 'create rect r1 0 0 1 1', 'init 400 300'],
  },
  {
    id: 'E-15',
    input: 'undo',
    expected: 'error: nothing to undo',
    setup: [...BASE_SETUP, 'create rect r1 0 0 1 1', 'undo'],
  },
  {
    id: 'E-16',
    input: 'redo',
    expected: 'error: nothing to redo',
    setup: [...BASE_SETUP, 'create rect r1 0 0 1 1'],
  },
  {
    id: 'E-16·新编辑清空 redo 栈变体',
    input: 'redo',
    expected: 'error: nothing to redo',
    setup: [...BASE_SETUP, 'create rect r1 0 0 1 1', 'undo', 'create rect r2 0 0 1 1'],
  },
];

describe('PRD §4.8 错误信息逐字表 E-01 ~ E-16', () => {
  it('错误表覆盖 16 条基准契约（编号连续）', () => {
    const baseIds = ERROR_CASES.map((entry) => entry.id.split('·')[0]);
    const unique = [...new Set(baseIds)];
    expect(unique.length).toBe(16);
    unique.forEach((id, index) => {
      expect(id).toBe(`E-${String(index + 1).padStart(2, '0')}`);
    });
  });

  for (const errorCase of ERROR_CASES) {
    it(`${errorCase.id}｜${errorCase.input}`, async () => {
      // 一律在临时工作目录里跑：E-11 / E-14 会真的触碰文件系统
      const workspace = new TempWorkspace();
      try {
        const session = new GoldenSession();
        for (const line of errorCase.setup) {
          await session.exec(line);
        }
        errorCase.prepare?.(session);

        const before = await capture(session);
        const actual = await session.exec(errorCase.input);

        // 逐字：单行、前缀恰好一次
        expect(actual.length).toBe(1);
        expect(actual[0]).toBe(errorCase.expected);

        // 原子性（R-04）：失败不得改变任何状态
        const after = await capture(session);
        expect(after.tree).toBe(before.tree);
        expect(after.structure).toBe(before.structure);
        expect(after.ids).toBe(before.ids);
        expect(after.history).toBe(before.history);

        if (errorCase.withoutDocument === true) {
          expect(session.session.document).toBeNull();
        }
      } finally {
        workspace.cleanup();
      }
    });
  }
});

describe('E-12 的豁免范围', () => {
  it('没有文档时 help 仍可执行（E-12 明确豁免 help）', async () => {
    const session = new GoldenSession();
    const output = await session.exec('help');
    expect(output.length).toBeGreaterThan(0);
    expect(output[0]).toBe('commands:');
  });

  it('没有文档时 init 仍可执行', async () => {
    const session = new GoldenSession();
    const output = await session.exec('init 800 600');
    expect(output[0]).toBe('canvas 800x600 created');
  });

  it('没有文档时 read 仍可执行', async () => {
    const session = new GoldenSession();
    const output = await session.exec('read does_not_exist.svg');
    expect(output[0]).toBe('error: cannot read file: does_not_exist.svg');
  });
});
