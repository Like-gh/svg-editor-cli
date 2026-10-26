import { describe, expect, it } from 'vitest';
import { GoldenSession } from '../support/GoldenSession.js';
import { TempWorkspace } from '../support/TempWorkspace.js';

/**
 * PRD §4.9「§6 典型会话逐字契约」—— **T-01 ~ T-25 全部 25 条**。
 *
 * 断言方式：**完全相等**（`toBe`）。
 * - 不用包含式匹配；
 * - 不忽略空白（`tree` 的每一列对齐都参与比较）；
 * - 在 **REPL 层**断言，因此 `error: ` 前缀、单行输出、告警行序都在契约内。
 *
 * 每个用例都从零重放前置契约（§6 会话是有序的），
 * 因此任一条契约出错时，失败点唯一、不会级联。
 */

/** 一条逐字契约。 */
type Contract = {
  /** 契约编号（T-01 ~ T-25） */
  readonly id: string;
  /** 输入行（逐字） */
  readonly input: string;
  /** 期望输出（逐字，逐行） */
  readonly expected: readonly string[];
  /** 前置命令（在目标命令之前执行，不参与本条断言） */
  readonly setup?: readonly string[];
};

/** §6 会话与 §6.1 流程图会话中用到的树文本。 */
const TREE_SECTION_5_1 = [
  'svg (800x600)',
  '├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff',
  '├── text#title     (20,40) "My Diagram"',
  '└── g#markers',
  '    ├── circle#c1  cx=100 cy=100 r=20 fill=red',
  '    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
] as const;

const TREE_SECTION_6 = [
  'svg (400x300)',
  '├── rect#rect1     x=0 y=0 w=400 h=300 fill=#ffffff',
  '├── text#t1        (10,290) "imported"',
  '├── circle#c1      cx=50 cy=50 r=10',
  '├── g#g1',
  '│   ├── rect#r2    x=0 y=0 w=10 h=10',
  '│   └── circle#c2  cx=5 cy=5 r=2',
  '└── ellipse#e1     cx=1 cy=2 rx=3 ry=4',
] as const;

/**
 * §6.1 两节点流程图的树。
 *
 * PRD §6.3 给出的「全局单列 `col = 32`」版本：
 * `endCol = 4×depth + len(tag#id)` 的最大值出现在 `text#process-label`
 * （depth 3，len 18 → 30），故 `col = 30 + 2 = 32`。
 */
const TREE_SECTION_6_1 = [
  'svg (800x600)',
  '└── g#flowchart',
  '    ├── g#node1',
  '    │   ├── rect#start          x=120 y=100 w=160 h=60 fill=#4a90d9',
  '    │   └── text#start-label    (155,135) "开始"',
  '    ├── g#node2',
  '    │   ├── rect#process        x=520 y=100 w=160 h=60 fill=#f5a623',
  '    │   └── text#process-label  (545,135) "处理数据"',
  '    └── line#arrow1             (280,130) -> (520,130)',
] as const;

/** T-01 ~ T-25 逐字契约表（顺序即 §6 / §6.1 会话的推进顺序）。 */
const CONTRACTS: readonly Contract[] = [
  {
    id: 'T-01',
    input: 'init 800 600',
    expected: ['canvas 800x600 created'],
  },
  {
    id: 'T-02',
    input: 'create rect bg 0 0 800 600 #ffffff',
    expected: ['rect#bg created'],
  },
  {
    id: 'T-03',
    input: 'create text title 20 40 "My Diagram"',
    expected: ['text#title created'],
  },
  {
    id: 'T-04',
    input: 'create circle c1 100 100 20 red',
    expected: ['circle#c1 created'],
  },
  {
    id: 'T-05',
    input: 'create rect box 200 80 60 60 #3366ff',
    expected: ['rect#box created'],
  },
  {
    id: 'T-06',
    input: 'group markers c1 box',
    expected: ['g#markers created with 2 children'],
  },
  {
    id: 'T-07',
    input: 'tree',
    expected: TREE_SECTION_5_1,
  },
  {
    id: 'T-08',
    input: 'move c1 30 0',
    expected: ['circle#c1 moved to (130,100)'],
  },
  {
    id: 'T-09',
    input: 'undo',
    expected: ['circle#c1 moved back to (100,100)'],
  },
  {
    id: 'T-10',
    input: 'redo',
    expected: ['circle#c1 moved to (130,100)'],
  },
  {
    id: 'T-11',
    input: 'set title text "My Diagram v2"',
    expected: ['text#title updated: text="My Diagram v2"'],
  },
  {
    id: 'T-12',
    input: 'undo',
    expected: ['text#title updated: text="My Diagram"'],
  },
  {
    id: 'T-13',
    input: 'group bad c1 markers',
    expected: ['error: cannot group a container into its own descendant: markers'],
  },
  {
    id: 'T-14',
    input: 'delete box',
    expected: ['rect#box deleted'],
  },
  {
    id: 'T-15',
    input: 'undo',
    expected: ['rect#box restored into g#markers'],
  },
  {
    id: 'T-16',
    input: 'save demo.svg',
    expected: ['saved to demo.svg (5 elements)'],
  },
  {
    id: 'T-17',
    input: 'undo',
    expected: ['error: undo not allowed after io command'],
  },
  {
    id: 'T-18',
    input: 'read other.svg',
    expected: [
      'warning: assigned id rect1 to unnamed <rect>',
      'read other.svg (7 elements)',
    ],
  },
  {
    id: 'T-19',
    input: 'tree',
    expected: TREE_SECTION_6,
  },
  {
    id: 'T-20',
    input: 'create g node1',
    expected: ['g#node1 created'],
  },
  {
    id: 'T-21',
    input: 'create rect start 120 100 160 60 #4a90d9 in node1',
    expected: ['rect#start created in g#node1'],
  },
  {
    id: 'T-22',
    input: 'create text start-label 155 135 "开始" in node1',
    expected: ['text#start-label created in g#node1'],
  },
  {
    id: 'T-23',
    input: 'move node2 0 100',
    expected: ['g#node2 moved by (0,100)'],
    setup: ['create g flowchart', 'create g node2 in flowchart'],
  },
  {
    id: 'T-24',
    input: 'undo',
    expected: ['g#node2 moved back by (0,-100)'],
  },
  {
    id: 'T-25',
    input: 'create box n1 120 100 160 60 "开始"',
    expected: ['error: unknown shape type: box (is the plugin loaded?)'],
  },
];

/**
 * 重放前置契约直到（不含）第 index 条。
 *
 * 前置契约的输出也会被比对；不一致时抛出**指名契约编号**的错误，
 * 使失败原因唯一可定位。
 */
async function replay(
  session: GoldenSession,
  contracts: readonly Contract[],
  index: number,
): Promise<void> {
  for (let position = 0; position < index; position += 1) {
    const contract = contracts[position];
    for (const setup of contract.setup ?? []) {
      await session.exec(setup);
    }
    const actual = await session.exec(contract.input);
    const expected = contract.expected;
    const matched =
      actual.length === expected.length &&
      actual.every((line, lineIndex) => line === expected[lineIndex]);
    if (!matched) {
      throw new Error(
        `前置契约 ${contract.id} 的输出与逐字期望不符。\n` +
          `实际：${JSON.stringify(actual)}\n` +
          `期望：${JSON.stringify(expected)}`,
      );
    }
  }
}

describe('PRD §4.9 逐字会话契约 T-01 ~ T-25', () => {
  it('契约表本身覆盖 25 条且编号连续', () => {
    expect(CONTRACTS.length).toBe(25);
    CONTRACTS.forEach((contract, index) => {
      expect(contract.id).toBe(`T-${String(index + 1).padStart(2, '0')}`);
    });
  });

  for (const [index, contract] of CONTRACTS.entries()) {
    it(`${contract.id}｜${contract.input}`, async () => {
      const workspace = new TempWorkspace();
      try {
        workspace.copyFixture('other.svg');
        const session = new GoldenSession();
        await replay(session, CONTRACTS, index);
        for (const setup of contract.setup ?? []) {
          await session.exec(setup);
        }
        const actual = await session.exec(contract.input);
        expect(actual.length).toBe(contract.expected.length);
        contract.expected.forEach((line, lineIndex) => {
          expect(actual[lineIndex]).toBe(line);
        });
      } finally {
        workspace.cleanup();
      }
    });
  }
});

describe('规格 §6 完整 transcript', () => {
  it('整段 stdout 与规格逐字相同（含启动横幅）', async () => {
    const workspace = new TempWorkspace();
    try {
      workspace.copyFixture('other.svg');
      const session = new GoldenSession();
      const actual = await session.execAll([
        'init 800 600',
        'create rect bg 0 0 800 600 #ffffff',
        'create text title 20 40 "My Diagram"',
        'create circle c1 100 100 20 red',
        'create rect box 200 80 60 60 #3366ff',
        'group markers c1 box',
        'tree',
        'move c1 30 0',
        'undo',
        'redo',
        'set title text "My Diagram v2"',
        'undo',
        'group bad c1 markers',
        'delete box',
        'undo',
        'save demo.svg',
        'undo',
        'read other.svg',
        'tree',
      ]);
      const expected = [
        GoldenSession.BANNER,
        'canvas 800x600 created',
        'rect#bg created',
        'text#title created',
        'circle#c1 created',
        'rect#box created',
        'g#markers created with 2 children',
        ...TREE_SECTION_5_1,
        'circle#c1 moved to (130,100)',
        'circle#c1 moved back to (100,100)',
        'circle#c1 moved to (130,100)',
        'text#title updated: text="My Diagram v2"',
        'text#title updated: text="My Diagram"',
        'error: cannot group a container into its own descendant: markers',
        'rect#box deleted',
        'rect#box restored into g#markers',
        'saved to demo.svg (5 elements)',
        'error: undo not allowed after io command',
        'warning: assigned id rect1 to unnamed <rect>',
        'read other.svg (7 elements)',
        ...TREE_SECTION_6,
      ];
      expect(actual.length).toBe(expected.length);
      expect(actual.join('\n')).toBe(expected.join('\n'));
    } finally {
      workspace.cleanup();
    }
  });
});

describe('规格 §6.1 两节点流程图会话', () => {
  it('逐条回显与 PRD §6.3 归一后的树逐字相同', async () => {
    const workspace = new TempWorkspace();
    try {
      const session = new GoldenSession();
      const actual = await session.execAll([
        'init 800 600',
        'create g flowchart',
        'create g node1 in flowchart',
        'create rect start 120 100 160 60 #4a90d9 in node1',
        'create text start-label 155 135 "开始" in node1',
        'create g node2 in flowchart',
        'create rect process 520 100 160 60 #f5a623 in node2',
        'create text process-label 545 135 "处理数据" in node2',
        'create line arrow1 280 130 520 130 black in flowchart',
        'tree',
        'move node2 0 100',
        'undo',
        'set process-label text "处理数据 v2"',
        'save flowchart.svg',
      ]);
      const expected = [
        GoldenSession.BANNER,
        'canvas 800x600 created',
        'g#flowchart created',
        'g#node1 created in g#flowchart',
        'rect#start created in g#node1',
        'text#start-label created in g#node1',
        'g#node2 created in g#flowchart',
        'rect#process created in g#node2',
        'text#process-label created in g#node2',
        'line#arrow1 created in g#flowchart',
        ...TREE_SECTION_6_1,
        'g#node2 moved by (0,100)',
        'g#node2 moved back by (0,-100)',
        'text#process-label updated: text="处理数据 v2"',
        'saved to flowchart.svg (8 elements)',
      ];
      expect(actual.length).toBe(expected.length);
      expect(actual.join('\n')).toBe(expected.join('\n'));
    } finally {
      workspace.cleanup();
    }
  });
});
