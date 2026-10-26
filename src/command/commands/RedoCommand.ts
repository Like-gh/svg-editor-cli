import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `redo`：重做上一次被撤销的编辑命令。
 *
 * 锁优先（OQ-11）；redo 栈为空时报 `nothing to redo`。
 * 重做 = 再次 apply，因此回显与原命令首次执行**逐字相同**（R-45）。
 */
export class RedoCommand extends Command {
  readonly name = 'redo';
  readonly usage = 'redo';
  readonly summary = 'redo the last undone edit';
  readonly category: CommandCategory = 'meta';

  override execute(session: EditorSession): CommandResult {
    // 与 undo 同理：文档检查前置于历史栈检查（E-12 优先于 E-16）。
    session.requireDocument();
    const command = session.history.redo();
    return command.redo(session);
  }
}
