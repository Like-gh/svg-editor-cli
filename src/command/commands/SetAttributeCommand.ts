import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandError } from '../../shared/CommandError.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { Document } from '../../domain/Document.js';
import { Command } from '../Command.js';
 import { EditCommand } from '../EditCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `set <id> <attr> <value>`：设置属性。
 *
 * 白名单 = fill / stroke / stroke-width + 各类型自身的几何属性 + text 的文本内容。
 * 白名单外报 E-13 逐字错误。
 *
 * 作用于容器时（OQ-01 方案 A）：白名单命中即写入**容器自身**属性，
 * 靠 SVG 继承语义生效，不手动传播；容器不支持几何属性。
 */
export class SetAttributeCommand extends EditCommand {
  readonly name = 'set';
  readonly usage = 'set <id> <attr> <value>';
  readonly summary = 'set an attribute';
  readonly category: CommandCategory = 'edit';

  private readonly shapeId: string;
  private readonly attribute: string;
  private readonly value: string;

  constructor(args: readonly Argument[]) {
    super();
    if (args.length !== 3) {
      throw this.usageError();
    }
    this.shapeId = args[0].value;
    this.attribute = args[1].value;
    this.value = args[2].value;
  }

  protected override apply(document: Document, session: EditorSession): CommandResult {
    void session;
    const shape = document.findById(this.shapeId);
    if (shape === undefined) {
      throw new CommandError(`no such shape: ${this.shapeId}`);
    }
    shape.setAttribute(this.attribute, this.value);
    return CommandResult.of(
      `${shape.tag}#${shape.id} updated: ${this.attribute}=${SetAttributeCommand.formatValue(this.value)}`,
    );
  }

  protected override undoMessage(document: Document): CommandResult {
    const shape = document.findById(this.shapeId);
    if (shape === undefined) {
      throw new CommandError(`no such shape: ${this.shapeId}`);
    }
    const previous = shape.getAttribute(this.attribute);
    if (previous === undefined) {
      return CommandResult.of(`${shape.tag}#${shape.id} updated: ${this.attribute} removed`);
    }
    return CommandResult.of(
      `${shape.tag}#${shape.id} updated: ${this.attribute}=${SetAttributeCommand.formatValue(previous)}`,
    );
  }

  /** 数值不加引号，其余加双引号（`text="My Diagram"` / `fill="#f5a623"`）。 */
  private static formatValue(value: string): string {
    return Command.isNumeric(value) ? value : `"${value}"`;
  }
}
