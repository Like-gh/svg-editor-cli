import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `undo`：撤销上一次编辑命令。
 *
 * 锁优先（OQ-11）：IO 锁着时一律报 `undo not allowed after io command`，
 * 否则栈空才报 `nothing to undo`。
 *
 * 回显由被撤销的命令自己产出（它知道自己的逆操作文案）。
 */
export class UndoCommand extends Command {
  readonly name = 'undo';
  readonly usage = 'undo';
  readonly summary = 'undo the last edit';
  readonly category: CommandCategory = 'meta';

  override execute(session: EditorSession): CommandResult {
    const command = session.history.undo();
    return command.undo(session);
  }
}
