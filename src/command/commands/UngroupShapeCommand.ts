import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandError } from '../../shared/CommandError.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { Document } from '../../domain/Document.js';
import { EditCommand } from '../EditCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `ungroup <gid>`：解散容器。
 *
 * 子图形提升到原容器的父级，并**占据原容器原来的位置**。
 * - 根级容器（`<svg>` 的直接子节点）→ E-08；
 * - 复合图形（内部结构由插件拥有）→ E-06（本阶段不可达，文案保留到位）。
 */
export class UngroupShapeCommand extends EditCommand {
  readonly name = 'ungroup';
  readonly usage = 'ungroup <gid>';
  readonly summary = 'dissolve a container';
  readonly category: CommandCategory = 'edit';

  private readonly groupId: string;
  private childCount = 0;

  constructor(args: readonly Argument[]) {
    super();
    if (args.length !== 1) {
      throw this.usageError();
    }
    this.groupId = args[0].value;
  }

  protected override apply(document: Document, session: EditorSession): CommandResult {
    void session;
    const shape = document.findById(this.groupId);
    if (shape === undefined) {
      throw new CommandError(`no such shape: ${this.groupId}`);
    }
    if (shape.isComposite()) {
      throw new CommandError(`cannot ungroup composite shape: ${this.groupId}`);
    }
    if (!shape.isContainer()) {
      throw new CommandError(`not a container: ${this.groupId}`);
    }
    const parent = shape.parent;
    if (parent === null || parent === document) {
      throw new CommandError(`cannot ungroup top-level container: ${this.groupId}`);
    }
    const index = parent.indexOfChild(shape);
    const children = [...shape.children];
    this.childCount = children.length;
    parent.removeChild(shape);
    children.forEach((child, offset) => {
      parent.addChild(child, index + offset);
    });
    return CommandResult.of(`g#${this.groupId} ungrouped`);
  }

  protected override undoMessage(document: Document): CommandResult {
    void document;
    return CommandResult.of(`g#${this.groupId} regrouped with ${this.childCount} children`);
  }
}
