import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandError } from '../../shared/CommandError.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { Document } from '../../domain/Document.js';
import { EditCommand } from '../EditCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `delete <id>`：删除图形（容器则连同全部子孙）。
 */
export class DeleteShapeCommand extends EditCommand {
  readonly name = 'delete';
  readonly usage = 'delete <id>';
  readonly summary = 'delete a shape';
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
    if (parent !== null) {
      parent.removeChild(shape);
    }
    return CommandResult.of(`${shape.tag}#${shape.id} deleted`);
  }

  protected override undoMessage(document: Document): CommandResult {
    const shape = document.findById(this.shapeId);
    if (shape === undefined) {
      return CommandResult.of(`${this.shapeId} deleted`);
    }
    return CommandResult.of(`${shape.tag}#${shape.id} restored into ${shape.parentLabel()}`);
  }
}
