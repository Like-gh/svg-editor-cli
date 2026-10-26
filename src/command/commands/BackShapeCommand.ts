import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandError } from '../../shared/CommandError.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { Document } from '../../domain/Document.js';
import { EditCommand } from '../EditCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `back <id>`：把图形移到同级最后。
 *
 * SVG 的绘制顺序 = 文档顺序，因此"最后"= 同级**第一个**。
 */
export class BackShapeCommand extends EditCommand {
  readonly name = 'back';
  readonly usage = 'back <id>';
  readonly summary = 'move a shape to the back';
  readonly category: CommandCategory = 'edit';

  private readonly shapeId: string;

  constructor(args: readonly Argument[]) {
    super();
    if (args.length !== 1) {
      throw this.usageError();
    }
    this.shapeId = args[0].value;
  }

  protected override apply(document: Document, session: EditorSession): CommandResult {
    void session;
    const shape = document.findById(this.shapeId);
    if (shape === undefined) {
      throw new CommandError(`no such shape: ${this.shapeId}`);
    }
    const parent = shape.parent;
    if (parent === null) {
      throw new CommandError(`no such shape: ${this.shapeId}`);
    }
    parent.removeChild(shape);
    parent.addChild(shape, 0);
    return CommandResult.of(`${shape.tag}#${shape.id} moved to back`);
  }

  protected override undoMessage(document: Document): CommandResult {
    const shape = document.findById(this.shapeId);
    if (shape === undefined) {
      throw new CommandError(`no such shape: ${this.shapeId}`);
    }
    return CommandResult.of(`${shape.tag}#${shape.id} restored to original position`);
  }
}
