import { Argument } from '../../shared/Argument.js';
import { CommandCategory } from '../../shared/CommandDescriptor.js';
import { CommandError } from '../../shared/CommandError.js';
import { CommandResult } from '../../shared/CommandResult.js';
import { Container } from '../../domain/Container.js';
import { Document } from '../../domain/Document.js';
import { ShapeFactory } from '../../domain/ShapeFactory.js';
import { ShapeProvider } from '../../domain/ShapeProvider.js';
import { Command } from '../Command.js';
 import { EditCommand } from '../EditCommand.js';
import type { EditorSession } from '../EditorSession.js';

/**
 * `create <type> <id> [params…] [in <containerId>]`：创建图形。
 *
 * 该命令**完全由 schema 驱动**（零类型分支）：
 * - 位置参数按 {@link ShapeProvider.params} 顺序映射到属性；
 * - `in <containerId>` 子句直接指定父容器；
 * - 未注册类型走 E-05 逐字错误，并自带 `(is the plugin loaded?)` 提示。
 */
export class CreateShapeCommand extends EditCommand {
  readonly name = 'create';
  readonly usage = 'create <type> <id> [params…] [in <containerId>]';
  readonly summary = 'create a shape';
  readonly category: CommandCategory = 'edit';

  private readonly typeName: string;
  private readonly shapeId: string;
  private readonly provider: ShapeProvider;
  private readonly props: Record<string, string>;
  private readonly containerId: string | null;
  private createdTag = '';

  constructor(
    args: readonly Argument[],
    private readonly factory: ShapeFactory,
  ) {
    super();
    if (args.length < 2) {
      throw this.usageError();
    }
    this.typeName = args[0].value;
    this.shapeId = args[1].value;

    let rest = args.slice(2);
    this.containerId = null;
    // `in` 只有在未被引号包裹时才是子句关键字
    const keyword = rest.length >= 2 ? rest[rest.length - 2] : undefined;
    if (keyword !== undefined && keyword.value === 'in' && !keyword.quoted) {
      this.containerId = rest[rest.length - 1].value;
      rest = rest.slice(0, rest.length - 2);
    }

    // E-05：未注册类型（复合图形类型属后续插件化阶段，内核不实现）
    this.provider = this.factory.requireProvider(this.typeName);

    const values: Record<string, string> = { id: this.shapeId };
    const params = this.provider.params;
    if (rest.length > params.length) {
      throw this.usageError();
    }
    for (let index = 0; index < params.length; index += 1) {
      const field = params[index];
      if (index < rest.length) {
        const raw = rest[index].value;
        if (field.kind === 'number' && !Command.isNumeric(raw)) {
          throw new CommandError(`invalid value for ${field.name}: ${raw}`);
        }
        values[field.name] = raw;
      } else if (field.required) {
        throw this.usageError();
      }
    }
    this.props = values;
  }

  protected override apply(document: Document, session: EditorSession): CommandResult {
    void session;
    if (document.findById(this.shapeId) !== undefined) {
      throw new CommandError(`id already exists: ${this.shapeId}`);
    }
    let parent: Container = document;
    if (this.containerId !== null) {
      const target = document.findById(this.containerId);
      if (target === undefined) {
        throw new CommandError(`no such container: ${this.containerId}`);
      }
      if (!target.isContainer()) {
        throw new CommandError(`not a container: ${this.containerId}`);
      }
      parent = target;
    }
    const shape = this.provider.create(this.props);
    this.createdTag = shape.tag;
    parent.addChild(shape);
    const suffix = this.containerId === null ? '' : ` in ${parent.tag}#${parent.id}`;
    return CommandResult.of(`${shape.tag}#${shape.id} created${suffix}`);
  }

  protected override undoMessage(document: Document): CommandResult {
    void document;
    return CommandResult.of(`${this.createdTag}#${this.shapeId} deleted`);
  }
}
