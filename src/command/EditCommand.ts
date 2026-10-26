import { CommandError } from '../shared/CommandError.js';
import { CommandResult } from '../shared/CommandResult.js';
import { Document } from '../domain/Document.js';
import { DocumentSnapshot } from '../domain/DocumentSnapshot.js';
import { Command } from './Command.js';
import type { EditorSession } from './EditorSession.js';

/**
 * 编辑类命令基类 —— Command 模式的骨架 + **Template Method**。
 *
 * `execute()` 的骨架固定为：**校验 → 捕获快照 → 执行 → 异常回滚**。
 * 子类只写 `apply()`（唯一的变更点）与 `undoMessage()`（撤销文案），
 * 因此 19 个命令共享同一条"失败原子性 + 一个 undo 单元"的不变量。
 */
export abstract class EditCommand extends Command {
  private snapshot: DocumentSnapshot | null = null;

  /**
   * 执行编辑命令（模板方法；子类不应覆写，请覆写 apply / undoMessage）。
   *
   * @param session 当前会话
   */
  override execute(session: EditorSession): CommandResult {
    const document = session.requireDocument();
    this.validate(document);
    const before = DocumentSnapshot.capture(document);
    try {
      const result = this.apply(document, session);
      this.snapshot = before;
      return result;
    } catch (error) {
      // 原子性兜底：任何意外异常都不允许留下半成品
      before.restoreTo(document);
      throw error;
    }
  }

  /**
   * 执行成功后入历史栈，并解除 IO 锁（R-43："直到下一次编辑命令重新解禁"）。
   *
   * @param session 当前会话
   */
  override afterExecute(session: EditorSession): void {
    session.history.unlock();
    session.history.push(this);
  }

  /**
   * 撤销：用快照还原文档，再由命令自己生成 undo 文案。
   *
   * @param session 当前会话
   */
  undo(session: EditorSession): CommandResult {
    const document = session.requireDocument();
    if (this.snapshot === null) {
      throw new CommandError('nothing to undo');
    }
    this.snapshot.restoreTo(document);
    return this.undoMessage(document);
  }

  /**
   * 重做：再次执行 apply，因此回显与首次执行**逐字相同**（R-45）。
   *
   * @param session 当前会话
   */
  redo(session: EditorSession): CommandResult {
    const document = session.requireDocument();
    this.validate(document);
    return this.apply(document, session);
  }

  /**
   * 只读校验：不改变任何状态（绝大多数错误在这里就发生）。
   *
   * @param document 当前文档
   */
  protected validate(document: Document): void {
    void document;
  }

  /**
   * 真正的变更（唯一的变更点）。
   *
   * @param document 当前文档
   * @param session 当前会话
   */
  protected abstract apply(document: Document, session: EditorSession): CommandResult;

  /**
   * 撤销文案：在快照还原**之后**生成，保证文案与状态一致。
   *
   * @param document 已还原的文档
   */
  protected abstract undoMessage(document: Document): CommandResult;
}
