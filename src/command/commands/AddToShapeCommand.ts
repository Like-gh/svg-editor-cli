import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandError } from '../../shared/CommandError.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { Document } from '../../domain/Document.js';
import { EditCommand } from '../EditCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `addto <gid> <id>`：把已有图形移入容器（作为最后一个子节点）。
 *
 * 目标容器是源图形的子孙时报专属文案（OQ-12）。
 */
export class AddToShapeCommand extends EditCommand {
  readonly name = 'addto';
  readonly usage = 'addto <gid> <id>';
  readonly summary = 'move a shape into a container';
  readonly category: CommandCategory = 'edit';

  private readonly groupId: string;
  private readonly shapeId: string;

  constructor(args: readonly Argument[]) {
    super();
    if (args.length !== 2) {
      throw this.usageError();
    }
    this.groupId = args[0].value;
    this.shapeId = args[1].value;
  }

  protected override apply(document: Document, session: EditorSession): CommandResult {
    void session;
    const target = document.findById(this.groupId);
    if (target === undefined) {
      throw new CommandError(`no such container: ${this.groupId}`);
    }
    if (!target.isContainer()) {
      throw new CommandError(`not a container: ${this.groupId}`);
    }
    const source = document.findById(this.shapeId);
    if (source === undefined) {
      throw new CommandError(`no such shape: ${this.shapeId}`);
    }
    if (target.contains(source)) {
      throw new CommandError(
        `cannot add a container into its own descendant: ${this.shapeId}`,
      );
    }
    target.addChild(source);
    return CommandResult.of(`${source.tag}#${source.id} added to ${target.tag}#${target.id}`);
  }

  protected override undoMessage(document: Document): CommandResult {
    const shape = document.findById(this.shapeId);
    if (shape === undefined) {
      throw new CommandError(`no such shape: ${this.shapeId}`);
    }
    return CommandResult.of(`${shape.tag}#${shape.id} restored to ${shape.parentLabel()}`);
  }
}
