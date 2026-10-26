import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { DisplayCommand } from '../DisplayCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `show <id>`：单个图形的属性明细。
 *
 * 显示类命令：不进入 undo 栈（R-42）。
 * T03 阶段先返回占位文本，渲染在 T04 阶段接入（架构 §10 T03-e）。
 */
export class ShowShapeCommand extends DisplayCommand {
  readonly name = 'show';
  readonly usage = 'show <id>';
  readonly summary = 'show one shape in detail';
  readonly category: CommandCategory = 'display';

  constructor(private readonly args: readonly Argument[]) {
    super();
  }

  override execute(session: EditorSession): CommandResult {
    session.requireDocument();
    return CommandResult.of('show (renderer pending)');
  }
}
