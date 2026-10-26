import { describe, expect, it } from 'vitest';
import { CommandError } from '../../src/shared/CommandError.js';
import { HistoryStack } from '../../src/command/HistoryStack.js';
import { StubEditCommand } from '../support/StubEditCommand.js';

describe('HistoryStack', () => {
  it('push 后可 undo，undo 出来的命令进入 redo 栈', () => {
    const history = new HistoryStack();
    const command = new StubEditCommand('a');
    history.push(command);
    expect(history.canUndo()).toBe(true);
    expect(history.undo()).toBe(command);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);
  });

  it('redo 弹回 undo 栈', () => {
    const history = new HistoryStack();
    const command = new StubEditCommand('a');
    history.push(command);
    history.undo();
    expect(history.redo()).toBe(command);
    expect(history.canRedo()).toBe(false);
    expect(history.canUndo()).toBe(true);
  });

  it('任何新的 push 都清空 redo 栈（R-40）', () => {
    const history = new HistoryStack();
    history.push(new StubEditCommand('a'));
    history.undo();
    expect(history.canRedo()).toBe(true);
    history.push(new StubEditCommand('b'));
    expect(history.canRedo()).toBe(false);
  });

  it('栈空时 undo 报 nothing to undo，redo 报 nothing to redo', () => {
    const history = new HistoryStack();
    expect(() => history.undo()).toThrowError(new CommandError('nothing to undo'));
    expect(() => history.redo()).toThrowError(new CommandError('nothing to redo'));
  });

  it('锁优先于栈空（OQ-11）：锁住时一律报 undo not allowed after io command', () => {
    const history = new HistoryStack();
    history.lock();
    expect(() => history.undo()).toThrowError(
      new CommandError('undo not allowed after io command'),
    );
    expect(() => history.redo()).toThrowError(
      new CommandError('undo not allowed after io command'),
    );
  });

  it('unlock 之后恢复栈行为', () => {
    const history = new HistoryStack();
    const command = new StubEditCommand('a');
    history.push(command);
    history.lock();
    history.unlock();
    expect(history.undo()).toBe(command);
  });

  it('clear 清空双栈但不影响锁状态', () => {
    const history = new HistoryStack();
    history.push(new StubEditCommand('a'));
    history.clear();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });
});
