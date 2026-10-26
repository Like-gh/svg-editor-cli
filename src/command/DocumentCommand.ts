import { Command } from './Command.js';
import type { EditorSession } from './EditorSession.js';

/**
 * 文档类命令基类：执行后**锁死 undo/redo**（R-43）。
 *
 * 锁与栈分离：栈里保留了什么命令与"能不能撤销"是两件事，
 * `save` 之后历史内容仍在，但入口被锁住。
 */
export abstract class DocumentCommand extends Command {
  /**
   * 上锁：IO / 文档类命令之后禁止 undo 与 redo。
   *
   * @param session 当前会话
   */
  override afterExecute(session: EditorSession): void {
    session.history.lock();
  }
}
