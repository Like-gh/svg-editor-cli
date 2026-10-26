import { describe, expect, it } from 'vitest';
import { GoldenSession } from '../support/GoldenSession.js';
import { captureState } from '../support/SessionState.js';
import { TempWorkspace } from '../support/TempWorkspace.js';

/**
 * 失败原子性回归（R-04 / C6 / 架构 §11.8）。
 *
 * 契约：**任意命令报错后，文档树、id 集合、undo/redo 栈三者均与执行前完全一致**。
 *
 * 本文件覆盖：
 * 1. 连续多轮「出错命令 → tree 比对」；
 * 2. 组合场景：出错后继续编辑、出错后 undo、出错后 redo、
 *    出错后 undo + redo、group 中途出错、ungroup 之后出错、
 *    保存失败之后 undo、IO 锁状态下的出错。
 */

/** 断言"出错前后状态逐字相同"。 */
async function expectUnchanged(
  session: GoldenSession,
  before: Awaited<ReturnType<typeof captureState>>,
): Promise<void> {
  const after = await captureState(session);
  expect(after.tree).toBe(before.tree);
  expect(after.structure).toBe(before.structure);
  expect(after.ids).toBe(before.ids);
  expect(after.history).toBe(before.history);
}

describe('连续多轮「出错命令 → tree 比对」', () => {
  it('30 轮混合成功 / 失败命令，失败后状态始终不变', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');

    const failing = [
      'create rect ok0 0 0 1 1',
      'delete ghost',
      'move ghost 1 1',
      'set ghost fill red',
      'group bad ghost',
      'ungroup ghost',
      'addto ghost x',
      'front ghost',
      'back ghost',
      'scale ghost 2',
      'create polygon p 1 2 3',
      'create box b 1 2 3 4 "x"',
      'create rect x 0 0 1 1 in missing',
      'show ghost',
      'tree ghost',
      'set bg opacity 1',
    ];

    let successfulCreates = 0;
    for (let round = 0; round < 30; round += 1) {
      // 每轮先做一次成功的编辑，让文档持续演进
      const id = `ok${round}`;
      const created = await session.exec(`create rect ${id} ${round} ${round} 10 10`);
      expect(created[0]).toBe(`rect#${id} created`);
      successfulCreates += 1;

      // 再执行一条必然失败的命令
      const failingCommand = failing[round % failing.length];
      const before = await captureState(session);
      const output = await session.exec(failingCommand);
      expect(output.length).toBe(1);
      expect(output[0].startsWith('error: ')).toBe(true);
      await expectUnchanged(session, before);
    }

    expect(successfulCreates).toBe(30);
  });

  it('同一批失败命令重复 10 次，文档不发生任何漂移', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect bg 0 0 800 600 #ffffff');
    await session.exec('create g g1');
    await session.exec('create circle c1 10 10 5 red in g1');

    const before = await captureState(session);
    for (let round = 0; round < 10; round += 1) {
      await session.exec('create rect bg 0 0 1 1');
      await session.exec('group bad c1 g1');
      await session.exec('ungroup g1');
      await session.exec('scale g1 -1');
      await session.exec('delete nothere');
      await session.exec('read missing.svg');
    }
    await expectUnchanged(session, before);
  });
});

describe('出错后的组合场景', () => {
  it('出错后继续编辑：只有成功的编辑改变状态', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 10 10');

    const before = await captureState(session);
    const failed = await session.exec('create rect r1 0 0 10 10');
    expect(failed[0]).toBe('error: id already exists: r1');
    await expectUnchanged(session, before);

    const ok = await session.exec('create rect r2 20 20 10 10');
    expect(ok[0]).toBe('rect#r2 created');
    const after = await captureState(session);
    expect(after.tree).not.toBe(before.tree);
    expect(after.ids).toContain('r2');
  });

  it('出错后 undo：撤销的仍是上一次成功的编辑', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 10 10');

    const beforeError = await captureState(session);
    const failed = await session.exec('delete ghost');
    expect(failed[0]).toBe('error: no such shape: ghost');
    await expectUnchanged(session, beforeError);

    const undone = await session.exec('undo');
    expect(undone[0]).toBe('rect#r1 deleted');
    // 撤销掉唯一一次创建之后，文档重新变空
    expect(session.structure()).toBe('');
    expect(session.idSet()).toEqual([]);
  });

  it('出错后 redo：失败命令不清空 redo 栈', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 10 10');
    await session.exec('undo');

    const before = await captureState(session);
    expect(before.history).toContain('"canRedo":true');

    const failed = await session.exec('delete ghost');
    expect(failed[0]).toBe('error: no such shape: ghost');
    await expectUnchanged(session, before);

    const redone = await session.exec('redo');
    expect(redone[0]).toBe('rect#r1 created');
    expect(session.idSet()).toContain('r1');
  });

  it('出错后 undo + redo：状态回到出错前', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 10 10');
    await session.exec('create rect r2 20 20 10 10');

    const before = await captureState(session);
    const failed = await session.exec('group bad r1 ghost');
    expect(failed[0]).toBe('error: no such shape: ghost');
    await expectUnchanged(session, before);

    await session.exec('undo');
    await session.exec('redo');
    await expectUnchanged(session, before);
  });

  it('group 成员中途出错：不会产生半成品容器', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 10 10');
    await session.exec('create circle c1 5 5 5');

    const before = await captureState(session);
    const failed = await session.exec('group g1 r1 ghost c1');
    expect(failed[0]).toBe('error: no such shape: ghost');
    await expectUnchanged(session, before);
    expect(session.idSet()).not.toContain('g1');

    const ok = await session.exec('group g1 r1 c1');
    expect(ok[0]).toBe('g#g1 created with 2 children');
  });

  it('ungroup 之后再出错：ungroup 的结果保持不变', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create g outer');
    await session.exec('create g inner in outer');
    await session.exec('create rect r1 0 0 10 10 in inner');
    const ungrouped = await session.exec('ungroup inner');
    expect(ungrouped[0]).toBe('g#inner ungrouped');

    const before = await captureState(session);
    const failed = await session.exec('ungroup inner');
    expect(failed[0]).toBe('error: no such shape: inner');
    await expectUnchanged(session, before);
  });

  it('保存失败之后 undo 仍然可用（失败的 save 不上锁）', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 10 10');

    const before = await captureState(session);
    const failed = await session.exec('save no_such_dir_xyz/a.svg');
    expect(failed[0]).toBe('error: cannot write file: no_such_dir_xyz/a.svg');
    await expectUnchanged(session, before);
    expect(before.history).toContain('"locked":false');

    const undone = await session.exec('undo');
    expect(undone[0]).toBe('rect#r1 deleted');
  });

  it('读入失败之后当前文档保持不变', async () => {
    const session = new GoldenSession();
    await session.exec('init 800 600');
    await session.exec('create rect r1 0 0 10 10');

    const before = await captureState(session);
    const failed = await session.exec('read missing.svg');
    expect(failed[0]).toBe('error: cannot read file: missing.svg');
    await expectUnchanged(session, before);
    expect(session.idSet()).toContain('r1');
  });

  it('IO 锁状态下的出错不会解锁，也不会改变栈', async () => {
    const workspace = new TempWorkspace();
    try {
      const session = new GoldenSession();
      await session.exec('init 800 600');
      await session.exec('create rect r1 0 0 10 10');
      await session.exec('save demo.svg');

      const before = await captureState(session);
      expect(before.history).toContain('"locked":true');

      const failed = await session.exec('delete ghost');
      expect(failed[0]).toBe('error: no such shape: ghost');
      await expectUnchanged(session, before);

      // 锁仍然生效
      const locked = await session.exec('undo');
      expect(locked[0]).toBe('error: undo not allowed after io command');
    } finally {
      workspace.cleanup();
    }
  });

  it('一次编辑之后 IO 锁解除，undo 恢复正常', async () => {
    const workspace = new TempWorkspace();
    try {
      const session = new GoldenSession();
      await session.exec('init 800 600');
      await session.exec('create rect r1 0 0 10 10');
      await session.exec('save demo.svg');

      const locked = await session.exec('undo');
      expect(locked[0]).toBe('error: undo not allowed after io command');

      await session.exec('create rect r2 10 10 10 10');
      const undone = await session.exec('undo');
      expect(undone[0]).toBe('rect#r2 deleted');
    } finally {
      workspace.cleanup();
    }
  });
});
