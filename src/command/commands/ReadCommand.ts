import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandError } from '../../shared/CommandError.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { FileGateway } from '../../io/FileGateway.js';
import { SvgParseResult } from '../../io/SvgParseResult.js';
import { SvgParser } from '../../io/SvgParser.js';
import { DocumentCommand } from '../DocumentCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `read <file.svg>`：读入 SVG 文件为当前文档。
 *
 * - 缺 id 自动补齐并**逐行告警**，全部告警在汇总行之前输出（R-62）；
 * - 读入失败不替换当前文档（先解析成功再替换引用，§11.8）；
 * - 文档类命令：清空历史栈并锁死 undo/redo。
 */
export class ReadCommand extends DocumentCommand {
  readonly name = 'read';
  readonly usage = 'read <file.svg>';
  readonly summary = 'read svg file';
  readonly category: CommandCategory = 'document';

  constructor(
    private readonly args: readonly Argument[],
    private readonly gateway: FileGateway,
    private readonly parser: SvgParser,
  ) {
    super();
  }

  override execute(session: EditorSession): CommandResult {
    if (this.args.length !== 1) {
      throw this.usageError();
    }
    const path = this.args[0].value;
    let parsed: SvgParseResult;
    try {
      parsed = this.parser.parse(this.gateway.readText(path));
    } catch {
      throw new CommandError(`cannot read file: ${path}`);
    }
    session.replaceDocument(parsed.document, path);
    return new CommandResult(
      [`read ${path} (${parsed.document.elementCount()} elements)`],
      parsed.warnings,
    );
  }

  override afterExecute(session: EditorSession): void {
    session.history.clear();
    super.afterExecute(session);
  }
}
