import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { NumberFormat } from '../../shared/NumberFormat.js';
import { DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, Document } from '../../domain/Document.js';
import { DocumentCommand } from '../DocumentCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `init [w] [h]`：新建空画布。
 *
 * 文档类命令：执行后清空历史栈并锁死 undo/redo（R-16 / Q5）。
 */
export class InitCommand extends DocumentCommand {
  readonly name = 'init';
  readonly usage = 'init [w] [h]';
  readonly summary = 'new empty canvas';
  readonly category: CommandCategory = 'document';

  constructor(private readonly args: readonly Argument[]) {
    super();
  }

  override execute(session: EditorSession): CommandResult {
    if (this.args.length > 2) {
      throw this.usageError();
    }
    const width = this.args.length > 0 ? this.parseNumber(this.args[0].value, 'width') : DEFAULT_CANVAS_WIDTH;
    const height = this.args.length > 1 ? this.parseNumber(this.args[1].value, 'height') : DEFAULT_CANVAS_HEIGHT;
    session.replaceDocument(new Document(width, height), null);
    return CommandResult.of(
      `canvas ${NumberFormat.format(width)}x${NumberFormat.format(height)} created`,
    );
  }

  override afterExecute(session: EditorSession): void {
    session.history.clear();
    super.afterExecute(session);
  }
}
