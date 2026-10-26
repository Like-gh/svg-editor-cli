import { describe, expect, it } from 'vitest';
import { GoldenSession } from '../support/GoldenSession.js';
import { captureState } from '../support/SessionState.js';
import { TempWorkspace } from '../support/TempWorkspace.js';

/**
 * QA 验收发现、本轮修复的 4 个缺陷的回归用例。
 *
 * - D-01：无文档时 `undo` / `redo` 报 E-12 而不是 E-15 / E-16；
 * - D-04：数值溢出不得静默写成 0（几何被破坏且无任何提示）；
 * - D-07：空 id 必须被拒绝（否则产生畸形标题 `rect#`）；
 * - D-02：未建模属性读入时必须显式告警（不得静默丢弃）。
 *
 * 这些用例与 QA 的 `test/golden/` 套件并列，不改动 QA 的任何断言。
 */
describe('回归 D-01：无文档时 undo / redo 报 E-12', () => {
  it('undo：无文档时报 no document，而不是 nothing to undo', async () => {
    const session = new GoldenSession();
    expect(await session.exec('undo')).toEqual([
      "error: no document. use 'init' or 'read' first",
    ]);
    expect(session.session.document).toBeNull();
  });

  it('redo：无文档时报 no document，而不是 nothing to redo', async () => {
    const session = new GoldenSession();
    expect(await session.exec('redo')).toEqual([
      "error: no document. use 'init' or 'read' first",
    ]);
    expect(session.session.document).toBeNull();
  });

  it('有文档但 IO 锁着时仍报 undo not allowed（锁优先于栈空，OQ-11）', async () => {
    const workspace = new TempWorkspace();
    try {
      const session = new GoldenSession();
      await session.exec('init 800 600');
      await session.exec('create rect r1 0 0 1 1');
      await session.exec('save demo.svg');
      expect(await session.exec('undo')).toEqual([
        'error: undo not allowed after io command',
      ]);
      expect(await session.exec('redo')).toEqual([
        'error: undo not allowed after io command',
      ]);
    } finally {
      workspace.cleanup();
    }
  });

  it('有文档且撤销栈为空时仍报 nothing to undo（E-15 不变）', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    // init 之后历史被锁；一次编辑命令解锁，再撤销使撤销栈真正为空
    await session.exec('create rect r1 0 0 1 1');
    await session.exec('undo');
    expect(await session.exec('undo')).toEqual(['error: nothing to undo']);
  });

  it('有文档且重做栈为空时仍报 nothing to redo（E-16 不变）', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 1 1');
    await session.exec('undo');
    // 新的编辑命令清空重做栈
    await session.exec('create rect r2 0 0 1 1');
    expect(await session.exec('redo')).toEqual(['error: nothing to redo']);
  });
});

describe('回归 D-04：数值溢出不得静默归零', () => {
  it('move 溢出时报错且几何保持原值', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect big 1e308 1e308 1 1');
    const before = await captureState(session);
    const output = await session.exec('move big 1e308 1e308');
    expect(output).toHaveLength(1);
    expect(output[0]).toBe('error: invalid value for x: Infinity');
    const after = await captureState(session);
    expect(after.tree).toBe(before.tree);
    expect(after.structure).toBe(before.structure);
  });

  it('scale 溢出时报错且几何保持原值', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect big 1e308 1e308 1 1');
    const before = await captureState(session);
    const output = await session.exec('scale big 1e10');
    expect(output).toHaveLength(1);
    expect(output[0].startsWith('error: invalid value for ')).toBe(true);
    const after = await captureState(session);
    expect(after.tree).toBe(before.tree);
  });

  it('溢出发生在容器的子孙上时同样报错并整体回滚', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create g g1');
    await session.exec('create rect big 1e308 1e308 1 1 in g1');
    const before = await captureState(session);
    const output = await session.exec('move g1 1e308 1e308');
    expect(output).toHaveLength(1);
    expect(output[0].startsWith('error: ')).toBe(true);
    const after = await captureState(session);
    expect(after.tree).toBe(before.tree);
    expect(after.structure).toBe(before.structure);
  });
});

describe('回归 D-07：空 id 必须被拒绝', () => {
  it('create 空 id 报 invalid id: must not be empty 且不建节点', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    const before = await captureState(session);
    expect(await session.exec('create rect "" 0 0 1 1')).toEqual([
      'error: invalid id: must not be empty',
    ]);
    const after = await captureState(session);
    expect(after.structure).toBe(before.structure);
    expect(after.ids).toBe(before.ids);
  });

  it('create 纯空白 id 同样被拒绝', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    expect(await session.exec('create rect "   " 0 0 1 1')).toEqual([
      'error: invalid id: must not be empty',
    ]);
  });

  it('group 的新容器 id 为空时被拒绝', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 1 1');
    const before = await captureState(session);
    expect(await session.exec('group "" r1')).toEqual([
      'error: invalid id: must not be empty',
    ]);
    expect((await captureState(session)).structure).toBe(before.structure);
  });

  it('group 的成员 id 为空时被拒绝', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 1 1');
    expect(await session.exec('group g1 ""')).toEqual([
      'error: invalid id: must not be empty',
    ]);
  });
});

describe('回归 D-02：未建模属性读入时显式告警', () => {
  it('transform / opacity 等未建模属性逐个告警，且在 read 汇总行之前', async () => {
    const workspace = new TempWorkspace();
    try {
      workspace.copyFixture('unmodeled.svg');
      const session = new GoldenSession();
      const output = await session.exec('read unmodeled.svg');
      expect(output).toEqual([
        'warning: skipped attribute transform on g#diagram',
        'warning: skipped attribute opacity on rect#a',
        'read unmodeled.svg (2 elements)',
      ]);
    } finally {
      workspace.cleanup();
    }
  });

  it('规格 §6 的 other.svg 不含未建模属性 → 不得产生额外告警（T-18）', async () => {
    const workspace = new TempWorkspace();
    try {
      workspace.copyFixture('other.svg');
      const session = new GoldenSession();
      const output = await session.exec('read other.svg');
      expect(output).toEqual([
        'warning: assigned id rect1 to unnamed <rect>',
        'read other.svg (7 elements)',
      ]);
    } finally {
      workspace.cleanup();
    }
  });
});
