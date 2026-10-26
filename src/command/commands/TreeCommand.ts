import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandError } from '../../shared/CommandError.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { TreeRenderer } from '../../view/TreeRenderer.js';
import { DisplayCommand } from '../DisplayCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `tree [id]`：结构树（默认全文档）。
 *
 * 显示类命令：不进入 undo 栈（R-42）。
 * 渲染交给 {@link TreeRenderer}，命令本身不关心版式。
 */
export class TreeCommand extends DisplayCommand {
  readonly name = 'tree';
  readonly usage = 'tree [id]';
  readonly summary = 'show the structure tree';
  readonly category: CommandCategory = 'display';

  private readonly renderer = new TreeRenderer();

  constructor(private readonly args: readonly Argument[]) {
    super();
  }

  override execute(session: EditorSession): CommandResult {
    const document = session.requireDocument();
    if (this.args.length === 0) {
      return CommandResult.ofLines(this.renderer.render(document));
    }
    if (this.args.length !== 1) {
      throw this.usageError();
    }
    const id = this.args[0].value;
    const shape = document.findById(id);
    if (shape === undefined) {
      throw new CommandError(`no such shape: ${id}`);
    }
    return CommandResult.ofLines(this.renderer.renderSubtree(shape));
  }
}
