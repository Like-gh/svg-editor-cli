import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandError } from '../../shared/CommandError.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { ShowRenderer } from '../../view/ShowRenderer.js';
import { DisplayCommand } from '../DisplayCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `show <id>`：单个图形的属性明细。
 *
 * 显示类命令：不进入 undo 栈（R-42）。
 */
export class ShowShapeCommand extends DisplayCommand {
  readonly name = 'show';
  readonly usage = 'show <id>';
  readonly summary = 'show one shape in detail';
  readonly category: CommandCategory = 'display';

  private readonly renderer = new ShowRenderer();

  constructor(private readonly args: readonly Argument[]) {
    super();
  }

  override execute(session: EditorSession): CommandResult {
    const document = session.requireDocument();
    if (this.args.length !== 1) {
      throw this.usageError();
    }
    const id = this.args[0].value;
    const shape = document.findById(id);
    if (shape === undefined) {
      throw new CommandError(`no such shape: ${id}`);
    }
    return CommandResult.ofLines(this.renderer.render(shape));
  }
}
