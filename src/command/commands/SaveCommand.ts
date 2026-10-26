import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandError } from '../../shared/CommandError.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { FileGateway } from '../../io/FileGateway.js';
import { SvgWriter } from '../../io/SvgWriter.js';
import { DocumentCommand } from '../DocumentCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `save [file.svg]`：保存当前文档。
 *
 * - 无参数时保存到读入时的路径；文档来自 `init`（无路径）时报 OQ-09 的专属文案；
 * - 文档类命令：**保留**历史栈内容，但锁死 undo/redo 入口（Q5 / R-43）。
 */
export class SaveCommand extends DocumentCommand {
  readonly name = 'save';
  readonly usage = 'save [file.svg]';
  readonly summary = 'save document';
  readonly category: CommandCategory = 'document';

  constructor(
    private readonly args: readonly Argument[],
    private readonly gateway: FileGateway,
    private readonly writer: SvgWriter,
  ) {
    super();
  }

  override execute(session: EditorSession): CommandResult {
    if (this.args.length > 1) {
      throw this.usageError();
    }
    const document = session.requireDocument();
    const path = this.args.length === 1 ? this.args[0].value : session.filePath;
    if (path === null || path === '') {
      throw new CommandError("no file path. use 'save <file.svg>'");
    }
    this.gateway.writeText(path, this.writer.write(document));
    session.setFilePath(path);
    return CommandResult.of(`saved to ${path} (${document.elementCount()} elements)`);
  }
}
