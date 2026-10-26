import { CommandError } from '../shared/CommandError.js';
import { EditCommand } from './EditCommand.js';

/**
 * 撤销 / 重做双栈 + IO 锁。
 *
 * 物理载体：栈内存的是**命令对象**（命令自带 Memento），
 * 因此 undo 时既能拿到状态（快照）也能拿到文案生成逻辑（命令自己知道怎么写）。
 *
 * 锁与栈分离：锁只决定"能不能撤销"，栈决定"撤销什么"；
 * 锁的判定优先级高于栈空（OQ-11：IO 后一律报 `undo not allowed after io command`）。
 */
export class HistoryStack {
  private readonly undoStack: EditCommand[] = [];
  private readonly redoStack: EditCommand[] = [];
  private locked = false;

  /**
   * 压入一个已执行的编辑命令。
   *
   * 任何新的编辑都会**清空 redo 栈**（R-40："undo 后若有新编辑，redo 栈清空"）。
   *
   * @param command 已执行的编辑命令
   */
  push(command: EditCommand): void {
    this.undoStack.push(command);
    this.redoStack.length = 0;
  }

  /**
   * 弹出一个可撤销的命令（并移入 redo 栈）。
   *
   * @returns 被弹出的命令
   * @throws CommandError 已锁（E-14）或栈空（E-15）
   */
  undo(): EditCommand {
    if (this.locked) {
      throw new CommandError('undo not allowed after io command');
    }
    const command = this.undoStack.pop();
    if (command === undefined) {
      throw new CommandError('nothing to undo');
    }
    this.redoStack.push(command);
    return command;
  }

  /**
   * 弹出一个可重做的命令（并移回 undo 栈）。
   *
   * @returns 被弹出的命令
   * @throws CommandError 已锁（E-14）或 redo 栈空（E-16）
   */
  redo(): EditCommand {
    if (this.locked) {
      throw new CommandError('undo not allowed after io command');
    }
    const command = this.redoStack.pop();
    if (command === undefined) {
      throw new CommandError('nothing to redo');
    }
    this.undoStack.push(command);
    return command;
  }

  /** 上锁：文档类命令执行后禁止 undo/redo。 */
  lock(): void {
    this.locked = true;
  }

  /** 解锁：下一次编辑命令执行后自动调用。 */
  unlock(): void {
    this.locked = false;
  }

  /** 清空双栈（init / read 之后旧历史没有意义）。 */
  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  /** 当前是否处于锁状态。 */
  isLocked(): boolean {
    return this.locked;
  }

  /** 撤销栈是否有内容。 */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** 重做栈是否有内容。 */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
