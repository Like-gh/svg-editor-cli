import { CommandCategory, CommandDescriptor } from '../../shared/CommandDescriptor.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { HelpRenderer } from '../../view/HelpRenderer.js';
import { DisplayCommand } from '../DisplayCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `help`：显示全部命令与语法。
 *
 * 显示类命令：不进入 undo 栈（R-42）；**没有文档时也能执行**（E-12 明确豁免 help）。
 */
export class HelpCommand extends DisplayCommand {
  readonly name = 'help';
  readonly usage = 'help';
  readonly summary = 'show all commands';
  readonly category: CommandCategory = 'display';

  private readonly renderer = new HelpRenderer();

  /**
   * @param descriptors 提供命令描述符的函数（延迟求值，避免注册表初始化时的循环依赖）
   */
  constructor(private readonly descriptors: () => readonly CommandDescriptor[]) {
    super();
  }

  override execute(session: EditorSession): CommandResult {
    void session;
    return CommandResult.ofLines(this.renderer.render(this.descriptors()));
  }
}
