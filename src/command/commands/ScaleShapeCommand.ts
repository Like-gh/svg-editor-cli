import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandError } from '../../shared/CommandError.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { NumberFormat } from '../../shared/NumberFormat.js';
import { Document } from '../../domain/Document.js';
import { EditCommand } from '../EditCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `scale <id> <factor>`：等比缩放。
 *
 * factor 同乘到图形的全部几何属性；作用于容器时递归到每个子孙
 * （每个子孙各自相乘的绝对坐标语义，OQ-04）。
 */
export class ScaleShapeCommand extends EditCommand {
  readonly name = 'scale';
  readonly usage = 'scale <id> <factor>';
  readonly summary = 'scale a shape';
  readonly category: CommandCategory = 'edit';

  private readonly shapeId: string;
  private readonly factor: number;

  constructor(args: readonly Argument[]) {
    super();
    if (args.length !== 2) {
      throw this.usageError();
    }
    this.shapeId = args[0].value;
    this.factor = this.parseNumber(args[1].value, 'factor');
    if (this.factor <= 0) {
      throw new CommandError('scale factor must be positive');
    }
  }

  protected override apply(document: Document, session: EditorSession): CommandResult {
    void session;
    const shape = document.findById(this.shapeId);
    if (shape === undefined) {
      throw new CommandError(`no such shape: ${this.shapeId}`);
    }
    shape.scaleBy(this.factor);
    return CommandResult.of(
      `${shape.tag}#${shape.id} scaled by ${NumberFormat.format(this.factor)}`,
    );
  }

  protected override undoMessage(document: Document): CommandResult {
    const shape = document.findById(this.shapeId);
    if (shape === undefined) {
      throw new CommandError(`no such shape: ${this.shapeId}`);
    }
    return CommandResult.of(
      `${shape.tag}#${shape.id} scaled back by ${NumberFormat.format(1 / this.factor)}`,
    );
  }
}
