import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GoldenSession } from '../support/GoldenSession.js';
import { TempWorkspace } from '../support/TempWorkspace.js';
import { captureState } from '../support/SessionState.js';

/**
 * 对抗性回归 —— 用**自己构造的刁钻输入**探测实现的边界行为。
 *
 * 覆盖任务书点名的场景：id 大小写敏感、自动补 id 的冲突顺延、
 * E-07 的容器/子孙组合、ungroup 的位置语义、addto 的子孙与同父容器、
 * scale 的容器递归与非法因子、set 的白名单/容器/文本、
 * undo/redo 的栈空与清空、IO 锁优先级、显示类命令不入栈、
 * `in` 子句的目标校验、浮点回显、极端输入、read→save 往返保真。
 */

/** 读取某个图形的某个几何属性（从 tree 的属性行里取）。 */
async function attributeOf(
  session: GoldenSession,
  id: string,
  attribute: string,
): Promise<string | undefined> {
  const tree = await session.exec('tree');
  const line = tree.find((candidate) => candidate.includes(`#${id} `));
  if (line === undefined) {
    return undefined;
  }
  const match = new RegExp(`${attribute}=(\\S+)`).exec(line);
  return match?.[1];
}

describe('对抗：id 唯一性与大小写敏感', () => {
  it('r1 与 R1 是两个不同的 id，可以共存', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    expect((await session.exec('create rect r1 0 0 1 1'))[0]).toBe('rect#r1 created');
    expect((await session.exec('create rect R1 0 0 1 1'))[0]).toBe('rect#R1 created');
    expect(session.idSet()).toEqual(['R1', 'r1']);
  });

  it('id 查找大小写敏感：show R1 不会命中 r1', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 1 1');
    expect((await session.exec('show R1'))[0]).toBe('error: no such shape: R1');
  });
});

describe('对抗：外部 SVG 缺 id 自动补齐的冲突顺延', () => {
  it('已有 rect1 时，无名 <rect> 顺延为 rect2 并打印实际 id', async () => {
    const workspace = new TempWorkspace();
    try {
      const session = new GoldenSession();
      await session.exec('init 800 600');
      // 手工写入一个「已有 rect1 + 两个无名 rect」的外部文件
      writeFixture(
        'conflict.svg',
        `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect id="rect1" x="0" y="0" width="10" height="10"/>
  <rect x="1" y="1" width="10" height="10"/>
  <rect x="2" y="2" width="10" height="10"/>
</svg>
`,
      );
      const output = await session.exec('read conflict.svg');
      expect(output).toEqual([
        'warning: assigned id rect2 to unnamed <rect>',
        'warning: assigned id rect3 to unnamed <rect>',
        'read conflict.svg (3 elements)',
      ]);
      expect(session.idSet()).toEqual(['rect1', 'rect2', 'rect3']);
    } finally {
      workspace.cleanup();
    }
  });

  it('自动补 id 的序号按同标签计数（circle1 / text1 各自起算）', async () => {
    const workspace = new TempWorkspace();
    try {
      const session = new GoldenSession();
      await session.exec('init 800 600');
      writeFixture(
        'mixed.svg',
        `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <circle cx="1" cy="1" r="1"/>
  <text x="1" y="1">hi</text>
  <circle cx="2" cy="2" r="2"/>
</svg>
`,
      );
      const output = await session.exec('read mixed.svg');
      expect(output).toEqual([
        'warning: assigned id circle1 to unnamed <circle>',
        'warning: assigned id text1 to unnamed <text>',
        'warning: assigned id circle2 to unnamed <circle>',
        'read mixed.svg (3 elements)',
      ]);
    } finally {
      workspace.cleanup();
    }
  });
});

describe('对抗：group 的祖先 / 子孙冲突检测（E-07）', () => {
  it('成员是「容器 + 其子孙」时点名该容器 id，且与参数顺序无关', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create g g1');
    await session.exec('create g g2 in g1');
    await session.exec('create rect r1 0 0 1 1 in g2');

    expect((await session.exec('group bad g1 g2'))[0]).toBe(
      'error: cannot group a container into its own descendant: g1',
    );
    expect((await session.exec('group bad g2 g1'))[0]).toBe(
      'error: cannot group a container into its own descendant: g1',
    );
    expect((await session.exec('group bad g1 r1'))[0]).toBe(
      'error: cannot group a container into its own descendant: g1',
    );
    // 失败后文档不变
    expect(session.idSet()).not.toContain('bad');
  });

  it('容器与其子孙容器同组时报错（不是新建 gid）', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create g g1');
    await session.exec('create g g2 in g1');
    const output = await session.exec('group bad g1 g2');
    expect(output[0]).toBe('error: cannot group a container into its own descendant: g1');
    expect(output[0]).not.toContain('bad');
  });

  it('成员 id 重复时复用 E-01 文案', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 1 1');
    expect((await session.exec('group dup r1 r1'))[0]).toBe('error: id already exists: r1');
  });

  it('group 一次 undo 即复原全部成员的父容器与位置（R-41）', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create g g1');
    await session.exec('create rect a 0 0 1 1 in g1');
    await session.exec('create rect b 0 0 1 1');
    await session.exec('create rect c 0 0 1 1');
    const before = await captureState(session);

    expect((await session.exec('group ng b c'))[0]).toBe('g#ng created with 2 children');
    expect(session.structure()).toContain('g#ng');

    await session.exec('undo');
    expect(session.structure()).toBe(before.structure);
  });
});

describe('对抗：ungroup 的位置语义', () => {
  it('根级容器报 E-08', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create g scene');
    expect((await session.exec('ungroup scene'))[0]).toBe(
      'error: cannot ungroup top-level container: scene',
    );
  });

  it('普通容器解散后，子图形占据原容器的位置', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect a 0 0 1 1');
    await session.exec('create g outer');
    await session.exec('create g inner in outer');
    await session.exec('create rect b 0 0 1 1 in inner');
    await session.exec('create rect c 0 0 1 1');

    expect((await session.exec('ungroup inner'))[0]).toBe('g#inner ungrouped');
    // inner 的子图形 b 提升到 outer，占据 inner 原来的位置
    const tree = await session.exec('tree');
    expect(tree.join('\n')).toBe(
      [
        'svg (800x600)',
        '├── rect#a      x=0 y=0 w=1 h=1',
        '├── g#outer',
        '│   └── rect#b  x=0 y=0 w=1 h=1',
        '└── rect#c      x=0 y=0 w=1 h=1',
      ].join('\n'),
    );
  });

  it('解散后容器不再存在', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create g outer');
    await session.exec('create g inner in outer');
    await session.exec('ungroup inner');
    expect((await session.exec('ungroup inner'))[0]).toBe('error: no such shape: inner');
  });
});

describe('对抗：addto 的结构安全', () => {
  it('目标容器是源容器的子孙时报专属文案（点名源图形 id）', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create g outer');
    await session.exec('create g inner in outer');
    expect((await session.exec('addto inner outer'))[0]).toBe(
      'error: cannot add a container into its own descendant: outer',
    );
  });

  it('容器不能被加进自己', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create g g1');
    expect((await session.exec('addto g1 g1'))[0]).toBe(
      'error: cannot add a container into its own descendant: g1',
    );
  });

  it('把元素移进它当前所在的父容器：移到末尾且不重复入列', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create g g1');
    await session.exec('create rect r1 0 0 1 1 in g1');
    await session.exec('create rect r2 0 0 1 1 in g1');

    expect((await session.exec('addto g1 r1'))[0]).toBe('rect#r1 added to g#g1');
    const tree = await session.exec('tree');
    expect(tree.join('\n')).toBe(
      [
        'svg (800x600)',
        '└── g#g1',
        '    ├── rect#r2  x=0 y=0 w=1 h=1',
        '    └── rect#r1  x=0 y=0 w=1 h=1',
      ].join('\n'),
    );
    // r1 只出现一次
    expect(tree.filter((line) => line.includes('rect#r1')).length).toBe(1);
  });
});

describe('对抗：scale 的容器语义与非法因子', () => {
  it('作用于容器时递归到每个子孙各自相乘（绝对坐标语义）', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create g g1');
    await session.exec('create rect r1 10 20 30 40 in g1');
    await session.exec('create g g2 in g1');
    await session.exec('create circle c1 5 6 7 in g2');

    expect((await session.exec('scale g1 2'))[0]).toBe('g#g1 scaled by 2');
    expect(await attributeOf(session, 'r1', 'x')).toBe('20');
    expect(await attributeOf(session, 'r1', 'y')).toBe('40');
    expect(await attributeOf(session, 'r1', 'w')).toBe('60');
    expect(await attributeOf(session, 'r1', 'h')).toBe('80');
    expect(await attributeOf(session, 'c1', 'cx')).toBe('10');
    expect(await attributeOf(session, 'c1', 'cy')).toBe('12');
    expect(await attributeOf(session, 'c1', 'r')).toBe('14');

    await session.exec('undo');
    expect(await attributeOf(session, 'r1', 'x')).toBe('10');
    expect(await attributeOf(session, 'c1', 'r')).toBe('7');
  });

  it('factor 为 0 或负数时报 E-09，且不改变几何', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create circle c1 100 100 20');
    const before = await captureState(session);
    expect((await session.exec('scale c1 0'))[0]).toBe(
      'error: scale factor must be positive',
    );
    expect((await session.exec('scale c1 -1'))[0]).toBe(
      'error: scale factor must be positive',
    );
    const after = await captureState(session);
    expect(after.structure).toBe(before.structure);
  });
});

describe('对抗：set 的白名单、容器与文本', () => {
  it('白名单外属性报 E-13', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 1 1');
    expect((await session.exec('set r1 opacity 0.5'))[0]).toBe(
      'error: unknown attribute: opacity',
    );
  });

  it('容器只接受绘制属性，几何属性报 E-13', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create g g1');
    expect((await session.exec('set g1 x 10'))[0]).toBe('error: unknown attribute: x');
  });

  it('set 容器写入容器自身（不传播给子孙）', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create g g1');
    await session.exec('create rect r1 0 0 1 1 in g1');
    expect((await session.exec('set g1 fill #f5a623'))[0]).toBe(
      'g#g1 updated: fill="#f5a623"',
    );
    const show = await session.exec('show g1');
    expect(show).toEqual(['g#g1  parent=svg', '  children=1', '  fill=#f5a623']);
    // 子孙没有被传播
    const showChild = await session.exec('show r1');
    expect(showChild).toEqual(['rect#r1  parent=g#g1', '  x=0 y=0 width=1 height=1']);
  });

  it('set text 内容回显带双引号', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create text t1 20 40 "My Diagram"');
    expect((await session.exec('set t1 text "My Diagram v2"'))[0]).toBe(
      'text#t1 updated: text="My Diagram v2"',
    );
    expect((await session.exec('show t1'))).toEqual([
      'text#t1  parent=svg',
      '  x=20 y=40',
      '  text="My Diagram v2"',
    ]);
  });

  it('数值属性不加引号，非数值加引号（L-9）', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 1 1');
    expect((await session.exec('set r1 x 42'))[0]).toBe('rect#r1 updated: x=42');
    expect((await session.exec('set r1 fill #abc'))[0]).toBe('rect#r1 updated: fill="#abc"');
  });
});

describe('对抗：undo / redo 的栈语义', () => {
  it('撤销到栈空报 E-15', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 1 1');
    await session.exec('undo');
    expect((await session.exec('undo'))[0]).toBe('error: nothing to undo');
  });

  it('undo 后产生新编辑会清空 redo 栈，再 redo 报 E-16', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 1 1');
    await session.exec('undo');
    expect(session.historyState().canRedo).toBe(true);
    await session.exec('create rect r2 0 0 1 1');
    expect(session.historyState().canRedo).toBe(false);
    expect((await session.exec('redo'))[0]).toBe('error: nothing to redo');
  });

  it('redo 回显与原命令首次执行逐字相同（R-45）', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create circle c1 100 100 20');
    const first = await session.exec('move c1 30 0');
    await session.exec('undo');
    const redone = await session.exec('redo');
    expect(redone[0]).toBe(first[0]);
    expect(redone[0]).toBe('circle#c1 moved to (130,100)');
  });

  it('显示类命令（tree / show / help）不进入 undo 栈（R-42）', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 1 1');
    await session.exec('tree');
    await session.exec('show r1');
    await session.exec('help');
    expect((await session.exec('undo'))[0]).toBe('rect#r1 deleted');
    expect(session.idSet()).toEqual([]);
  });
});

describe('对抗：IO 锁的优先级与解禁', () => {
  it('save 之后 undo 报 E-14（即使栈非空）', async () => {
    const workspace = new TempWorkspace();
    try {
      const session = new GoldenSession();
      await session.exec('init 800 600');
      await session.exec('create rect r1 0 0 1 1');
      await session.exec('save demo.svg');
      expect(session.historyState().canUndo).toBe(true);
      expect((await session.exec('undo'))[0]).toBe('error: undo not allowed after io command');
      expect((await session.exec('redo'))[0]).toBe('error: undo not allowed after io command');
    } finally {
      workspace.cleanup();
    }
  });

  it('下一次编辑命令执行后 undo 恢复可用（R-43）', async () => {
    const workspace = new TempWorkspace();
    try {
      const session = new GoldenSession();
      await session.exec('init 800 600');
      await session.exec('create rect r1 0 0 1 1');
      await session.exec('save demo.svg');
      expect((await session.exec('undo'))[0]).toBe('error: undo not allowed after io command');
      await session.exec('create rect r2 0 0 1 1');
      expect((await session.exec('undo'))[0]).toBe('rect#r2 deleted');
    } finally {
      workspace.cleanup();
    }
  });

  it('init / read 之后 undo 报 E-14（锁优先于栈空，OQ-11）', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    expect((await session.exec('undo'))[0]).toBe('error: undo not allowed after io command');
  });
});

describe('对抗：create 的 in 子句目标校验', () => {
  it('目标不存在报 E-03', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    expect((await session.exec('create rect start 120 100 160 60 #4a90d9 in node9'))[0]).toBe(
      'error: no such container: node9',
    );
  });

  it('目标存在但不是容器报 E-04', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect start 120 100 160 60 #4a90d9');
    expect((await session.exec('create rect s2 0 0 1 1 in start'))[0]).toBe(
      'error: not a container: start',
    );
  });

  it('引号包裹的 "in" 是文本内容而不是子句关键字', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create g g1');
    expect((await session.exec('create text t1 0 0 "in"'))[0]).toBe('text#t1 created');
    expect((await session.exec('show t1'))[2]).toBe('  text="in"');
    expect((await session.exec('create text t2 0 0 "in" in g1'))[0]).toBe(
      'text#t2 created in g#g1',
    );
  });
});

describe('对抗：浮点数的回显口径（R-93 / Q12）', () => {
  it('0.1 + 0.2 的浮点噪声被抹平为 0.3', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0.1 0.2 1 1');
    expect((await session.exec('move r1 0.2 0.1'))[0]).toBe('rect#r1 moved to (0.3,0.3)');
    expect(await attributeOf(session, 'r1', 'x')).toBe('0.3');
  });

  it('小数原样保留，整数不带 .0', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect half 12.5 12.5 1 1');
    expect(await attributeOf(session, 'half', 'x')).toBe('12.5');
    expect(await attributeOf(session, 'half', 'y')).toBe('12.5');
    await session.exec('create rect whole 10 20 1 1');
    expect(await attributeOf(session, 'whole', 'x')).toBe('10');
  });

  it('⚠ 已知缺陷 D-03：数值溢出被静默写成 0（不得静默破坏几何）', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect big 1e308 1e308 1 1');
    const output = await session.exec('move big 1e308 1e308');
    // 期望：要么报错（且几何不变），要么保留数值；绝不能静默变成 0
    expect(output.length).toBe(1);
    expect(output[0].startsWith('error: ')).toBe(true);
    expect(await attributeOf(session, 'big', 'x')).toBe('1e+308');
  });
});

describe('对抗：极端输入', () => {
  it('超长 id、中文 id、含空格 id 均可创建且可定位', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    const longId = 'x'.repeat(200);
    expect((await session.exec(`create rect ${longId} 0 0 1 1`))[0]).toBe(
      `rect#${longId} created`,
    );
    expect((await session.exec('create rect 图 0 0 1 1'))[0]).toBe('rect#图 created');
    expect((await session.exec('create rect "a b" 0 0 1 1'))[0]).toBe('rect#a b created');
    expect((await session.exec('show 图'))[0]).toBe('rect#图  parent=svg');
  });

  it('负坐标与大数值正常回显', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect neg -10 -20 5 5');
    expect(await attributeOf(session, 'neg', 'x')).toBe('-10');
    expect(await attributeOf(session, 'neg', 'y')).toBe('-20');
    await session.exec('create rect big 1000000 2000000 1 1');
    expect(await attributeOf(session, 'big', 'x')).toBe('1000000');
  });

  it('text 内容含中文与尖括号：可创建、可显示、序列化时被转义', async () => {
    const workspace = new TempWorkspace();
    try {
      const session = new GoldenSession();
      await session.exec('init 800 600');
      await session.exec('create text t1 -10 -20 "含中文与<尖括号>"');
      expect((await session.exec('show t1'))[2]).toBe('  text="含中文与<尖括号>"');
      await session.exec('save t.svg');
      const saved = readFileSync('t.svg', 'utf8');
      expect(saved).toContain('&lt;尖括号&gt;');
    } finally {
      workspace.cleanup();
    }
  });

  it('读入不存在的文件报 E-10，保存到不可写路径报 E-11', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    expect((await session.exec('read a.svg'))[0]).toBe('error: cannot read file: a.svg');
    expect((await session.exec('save no_such_dir_xyz/a.svg'))[0]).toBe(
      'error: cannot write file: no_such_dir_xyz/a.svg',
    );
  });
});

describe('对抗：read → save 的往返保真（R-61 / G3）', () => {
  it('读入 → 保存 → 再读入：结构、层级、id、几何、paint、文本逐字一致', async () => {
    const workspace = new TempWorkspace();
    try {
      workspace.copyFixture('other.svg');
      const session = new GoldenSession();
      const first = await session.exec('read other.svg');
      expect(first).toEqual([
        'warning: assigned id rect1 to unnamed <rect>',
        'read other.svg (7 elements)',
      ]);
      const tree1 = (await session.exec('tree')).join('\n');

      expect((await session.exec('save round1.svg'))[0]).toBe('saved to round1.svg (7 elements)');
      expect((await session.exec('read round1.svg'))[0]).toBe('read round1.svg (7 elements)');
      const tree2 = (await session.exec('tree')).join('\n');
      expect(tree2).toBe(tree1);

      await session.exec('save round2.svg');
      expect(readFileSync('round2.svg', 'utf8')).toBe(readFileSync('round1.svg', 'utf8'));
    } finally {
      workspace.cleanup();
    }
  });

  it('保存产物是标准 SVG：XML 声明 + xmlns + width/height + viewBox（R-60）', async () => {
    const workspace = new TempWorkspace();
    try {
      const session = new GoldenSession();
      await session.exec('init 400 300');
      await session.exec('create rect bg 0 0 400 300 #ffffff');
      await session.exec('save out.svg');
      const saved = readFileSync('out.svg', 'utf8');
      expect(saved.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
      expect(saved).toContain(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">',
      );
      expect(saved).toContain('<rect id="bg" x="0" y="0" width="400" height="300" fill="#ffffff"/>');
    } finally {
      workspace.cleanup();
    }
  });

  it('未设置的 fill / stroke 不写入 SVG（R-64）', async () => {
    const workspace = new TempWorkspace();
    try {
      const session = new GoldenSession();
      await session.exec('init 800 600');
      await session.exec('create rect bare 0 0 1 1');
      await session.exec('save bare.svg');
      expect(readFileSync('bare.svg', 'utf8')).toContain('<rect id="bare" x="0" y="0" width="1" height="1"/>');
    } finally {
      workspace.cleanup();
    }
  });
});

describe('对抗：save 的路径语义链（L-4）', () => {
  it('init 之后从未保存过时，无参 save 报专属文案', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 1 1');
    expect((await session.exec('save'))[0]).toBe("error: no file path. use 'save <file.svg>'");
  });

  it('显式 save 之后，无参 save 保存到同一个文件', async () => {
    const workspace = new TempWorkspace();
    try {
      const session = new GoldenSession();
      await session.exec('init 800 600');
      await session.exec('create rect r1 0 0 1 1');
      expect((await session.exec('save demo.svg'))[0]).toBe('saved to demo.svg (1 elements)');
      expect((await session.exec('save'))[0]).toBe('saved to demo.svg (1 elements)');
    } finally {
      workspace.cleanup();
    }
  });

  it('read 之后无参 save 保存到读入的路径（R-12）', async () => {
    const workspace = new TempWorkspace();
    try {
      workspace.copyFixture('other.svg');
      const session = new GoldenSession();
      await session.exec('read other.svg');
      expect((await session.exec('save'))[0]).toBe('saved to other.svg (7 elements)');
    } finally {
      workspace.cleanup();
    }
  });
});

describe('对抗：show 的逐字格式（R-52 / PRD §5.2）', () => {
  it('`show c1` 逐字等于规格 §5.2 的三行', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect bg 0 0 800 600 #ffffff');
    await session.exec('create text title 20 40 "My Diagram"');
    await session.exec('create circle c1 100 100 20 red');
    await session.exec('create rect box 200 80 60 60 #3366ff');
    await session.exec('group markers c1 box');
    expect(await session.exec('show c1')).toEqual([
      'circle#c1  parent=g#markers',
      '  cx=100 cy=100 r=20',
      '  fill=red',
    ]);
  });

  it('顶层元素的 parent 写作 svg', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect bg 0 0 800 600 #ffffff');
    expect(await session.exec('show bg')).toEqual([
      'rect#bg  parent=svg',
      '  x=0 y=0 width=800 height=600',
      '  fill=#ffffff',
    ]);
  });
});

describe('对抗：REPL 外壳契约', () => {
  it('首行是横幅，其后**没有**空行（L-5）', async () => {
    const session = new GoldenSession();
    const output = await session.execAll(['init 800 600']);
    expect(output[0]).toBe("svg-editor 0.1 — type 'help' for commands");
    expect(output[1]).toBe('canvas 800x600 created');
    // 横幅与第一条命令之间不存在空行
    expect(output.some((line) => line === '')).toBe(false);
  });

  it('注释行与空行不产生任何输出（R-02）', async () => {
    const session = new GoldenSession();
    const output = await session.execAll(['# 这是注释', '', '   ', 'init 800 600']);
    expect(output).toEqual([GoldenSession.BANNER, 'canvas 800x600 created']);
  });

  it('help 覆盖 §3 全部 19 个命令名（R-53 / R-94）', async () => {
    const session = new GoldenSession();
    const output = await session.exec('help');
    const text = output.join('\n');
    for (const name of [
      'init',
      'read',
      'save',
      'canvas',
      'create',
      'delete',
      'move',
      'scale',
      'set',
      'group',
      'ungroup',
      'addto',
      'front',
      'back',
      'tree',
      'show',
      'undo',
      'redo',
      'help',
    ]) {
      expect(text).toContain(name);
    }
    expect(output[0]).toBe('commands:');
  });

  it('未知命令报 `unknown command`，参数不足报 `usage:`（R-05 / Q7）', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    expect((await session.exec('foo'))[0]).toBe('error: unknown command: foo');
    expect((await session.exec('create'))[0]).toBe(
      'error: usage: create <type> <id> [params…] [in <containerId>]',
    );
  });
});

/** 在当前工作目录写入一个 fixture 文件。 */
function writeFixture(name: string, content: string): void {
  writeFileSync(name, content, 'utf8');
}
