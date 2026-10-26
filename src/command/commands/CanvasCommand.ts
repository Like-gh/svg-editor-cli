import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { NumberFormat } from '../../shared/NumberFormat.js';
import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `canvas [w] [h]`：无参显示画布尺寸，带参修改尺寸。
 *
 * 类别随参数而变（OQ-16）：
 * - 无参 = **显示类**（不锁 undo/redo）；
 * - 带参 = **文档类**（改尺寸后锁死 undo/redo）。
 */
export class CanvasCommand extends Command {
  readonly name = 'canvas';
  readonly usage = 'canvas [w] [h]';
  readonly summary = 'show or resize canvas';

  private resized = false;

  constructor(private readonly args: readonly Argument[]) {
    super();
  }

  /** 类别由是否真的改了尺寸决定。 */
  get category(): CommandCategory {
    return this.resized ? 'document' : 'display';
  }

  override execute(session: EditorSession): CommandResult {
    const document = session.requireDocument();
    if (this.args.length === 0) {
      return CommandResult.of(
        `canvas ${NumberFormat.format(document.width)}x${NumberFormat.format(document.height)}`,
      );
    }
    if (this.args.length !== 2) {
      throw this.usageError();
    }
    const width = this.parseNumber(this.args[0].value, 'width');
    const height = this.parseNumber(this.args[1].value, 'height');
    document.setSize(width, height);
    this.resized = true;
    return CommandResult.of(
      `canvas ${NumberFormat.format(width)}x${NumberFormat.format(height)} updated`,
    );
  }

  override afterExecute(session: EditorSession): void {
    if (this.resized) {
      session.history.lock();
    }
  }
}
