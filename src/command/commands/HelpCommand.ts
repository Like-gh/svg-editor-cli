import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { DisplayCommand } from '../DisplayCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `help`：显示全部命令与语法。
 *
 * 显示类命令：不进入 undo 栈（R-42）。
 * T03 阶段先返回占位文本，渲染在 T04 阶段接入（架构 §10 T03-e）。
 */
export class HelpCommand extends DisplayCommand {
  readonly name = 'help';
  readonly usage = 'help';
  readonly summary = 'show all commands';
  readonly category: CommandCategory = 'display';

  override execute(session: EditorSession): CommandResult {
    void session;
    return CommandResult.of('help (renderer pending)');
  }
}
