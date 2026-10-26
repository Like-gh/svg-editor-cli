import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandError } from '../../shared/CommandError.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { NumberFormat } from '../../shared/NumberFormat.js';
import { Document } from '../../domain/Document.js';
import { Position } from '../../domain/Shape.js';
import { EditCommand } from '../EditCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `move <id> <dx> <dy>`：平移（增量）。
 *
 * 回显措辞区分叶子与容器（Composite 语义但措辞不同）：
 * - 叶子 → `circle#c1 moved to (130,100)`（绝对位置）
 * - 容器 → `g#node2 moved by (0,100)`（增量）
 */
export class MoveShapeCommand extends EditCommand {
  readonly name = 'move';
  readonly usage = 'move <id> <dx> <dy>';
  readonly summary = 'move a shape';
  readonly category: CommandCategory = 'edit';

  private readonly shapeId: string;
  private readonly dx: number;
  private readonly dy: number;

  constructor(args: readonly Argument[]) {
    super();
    if (args.length !== 3) {
      throw this.usageError();
    }
    this.shapeId = args[0].value;
    this.dx = this.parseNumber(args[1].value, 'dx');
    this.dy = this.parseNumber(args[2].value, 'dy');
  }

  protected override apply(document: Document, session: EditorSession): CommandResult {
    void session;
    const shape = document.findById(this.shapeId);
    if (shape === undefined) {
      throw new CommandError(`no such shape: ${this.shapeId}`);
    }
    shape.translate(this.dx, this.dy);
    if (shape.isContainer()) {
      return CommandResult.of(
        `${shape.tag}#${shape.id} moved by (${NumberFormat.format(this.dx)},${NumberFormat.format(this.dy)})`,
      );
    }
    const position = shape.position() ?? { x: 0, y: 0 };
    return CommandResult.of(
      `${shape.tag}#${shape.id} moved to (${NumberFormat.format(position.x)},${NumberFormat.format(position.y)})`,
    );
  }

  protected override undoMessage(document: Document): CommandResult {
    const shape = document.findById(this.shapeId);
    if (shape === undefined) {
      throw new CommandError(`no such shape: ${this.shapeId}`);
    }
    if (shape.isContainer()) {
      return CommandResult.of(
        `${shape.tag}#${shape.id} moved back by (${NumberFormat.format(-this.dx)},${NumberFormat.format(-this.dy)})`,
      );
    }
    const position = shape.position() ?? { x: 0, y: 0 };
    return CommandResult.of(
      `${shape.tag}#${shape.id} moved back to (${NumberFormat.format(position.x)},${NumberFormat.format(position.y)})`,
    );
  }
}
