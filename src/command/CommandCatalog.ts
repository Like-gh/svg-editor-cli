import { CommandCategory, CommandDescriptor } from '../shared/CommandDescriptor.js';
import { FileGateway } from '../io/FileGateway.js';
import { SvgParser } from '../io/SvgParser.js';
import { SvgWriter } from '../io/SvgWriter.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { CommandRegistry } from './CommandRegistry.js';
import { CommandSpec } from './CommandSpec.js';
import { AddToShapeCommand } from './commands/AddToShapeCommand.js';
import { BackShapeCommand } from './commands/BackShapeCommand.js';
import { CanvasCommand } from './commands/CanvasCommand.js';
import { CreateShapeCommand } from './commands/CreateShapeCommand.js';
import { DeleteShapeCommand } from './commands/DeleteShapeCommand.js';
import { FrontShapeCommand } from './commands/FrontShapeCommand.js';
import { GroupShapesCommand } from './commands/GroupShapesCommand.js';
import { HelpCommand } from './commands/HelpCommand.js';
import { InitCommand } from './commands/InitCommand.js';
import { MoveShapeCommand } from './commands/MoveShapeCommand.js';
import { ReadCommand } from './commands/ReadCommand.js';
import { RedoCommand } from './commands/RedoCommand.js';
import { SaveCommand } from './commands/SaveCommand.js';
import { ScaleShapeCommand } from './commands/ScaleShapeCommand.js';
import { SetAttributeCommand } from './commands/SetAttributeCommand.js';
import { ShowShapeCommand } from './commands/ShowShapeCommand.js';
import { TreeCommand } from './commands/TreeCommand.js';
import { UndoCommand } from './commands/UndoCommand.js';
import { UngroupShapeCommand } from './commands/UngroupShapeCommand.js';

/**
 * 内建命令的**唯一中心清单**：19 个命令名 → 实现类 → 描述符。
 *
 * 描述符同时携带两套用法文本：
 * - `usage`：参数错误文案用（`[params…]` 使用 Unicode 省略号）；
 * - `helpUsage`：help 列表用（`[params...]` 使用三个英文点）。
 * 两处必须分别逐字，不得统一（OQ-15）。
 */
export class CommandCatalog {
  /**
   * 生成 19 条内建命令的注册单元。
   *
   * @param gateway 文件读写网关
   * @param parser SVG 解析器
   * @param writer SVG 序列化器
   * @param factory 形状工厂
   * @param registry 命令注册表（供 help 渲染读取描述符；延迟求值避免循环依赖）
   */
  static defaults(
    gateway: FileGateway,
    parser: SvgParser,
    writer: SvgWriter,
    factory: ShapeFactory,
    registry: CommandRegistry,
  ): CommandSpec[] {
    return [
      new CommandSpec(
        new CommandDescriptor(
          'init',
          'init [w] [h]',
          'new empty canvas',
          'document',
          'init [w] [h]',
          0,
          'new empty canvas',
        ),
        (args) => new InitCommand(args),
      ),
      new CommandSpec(
        new CommandDescriptor(
          'read',
          'read <file.svg>',
          'read svg file',
          'document',
          'read <file.svg>',
          1,
          'read svg file',
        ),
        (args) => new ReadCommand(args, gateway, parser),
      ),
      new CommandSpec(
        new CommandDescriptor(
          'save',
          'save [file.svg]',
          'save document',
          'document',
          'save [file.svg]',
          2,
          'save document',
        ),
        (args) => new SaveCommand(args, gateway, writer),
      ),
      new CommandSpec(
        new CommandDescriptor(
          'canvas',
          'canvas [w] [h]',
          'show or resize canvas',
          'document',
          'canvas [w] [h]',
          3,
          'show or resize canvas',
        ),
        (args) => new CanvasCommand(args),
      ),
      new CommandSpec(
        new CommandDescriptor(
          'create',
          'create <type> <id> [params…] [in <containerId>]',
          'create a shape',
          'edit',
          'create <type> <id> [params...] [in <containerId>]',
          4,
        ),
        (args) => new CreateShapeCommand(args, factory),
      ),
      new CommandSpec(
        new CommandDescriptor('delete', 'delete <id>', 'delete a shape', 'edit', 'delete <id>', 5),
        (args) => new DeleteShapeCommand(args),
      ),
      new CommandSpec(
        new CommandDescriptor(
          'move',
          'move <id> <dx> <dy>',
          'move a shape',
          'edit',
          'move <id> <dx> <dy>',
          5,
        ),
        (args) => new MoveShapeCommand(args),
      ),
      new CommandSpec(
        new CommandDescriptor(
          'scale',
          'scale <id> <factor>',
          'scale a shape',
          'edit',
          'scale <id> <factor>',
          5,
        ),
        (args) => new ScaleShapeCommand(args),
      ),
      new CommandSpec(
        new CommandDescriptor(
          'set',
          'set <id> <attr> <value>',
          'set an attribute',
          'edit',
          'set <id> <attr> <value>',
          6,
        ),
        (args) => new SetAttributeCommand(args),
      ),
      new CommandSpec(
        new CommandDescriptor(
          'group',
          'group <newGid> <id1> <id2>…',
          'group shapes into a container',
          'edit',
          'group <newGid> <id...>',
          6,
        ),
        (args) => new GroupShapesCommand(args),
      ),
      new CommandSpec(
        new CommandDescriptor(
          'ungroup',
          'ungroup <gid>',
          'dissolve a container',
          'edit',
          'ungroup <gid>',
          6,
        ),
        (args) => new UngroupShapeCommand(args),
      ),
      new CommandSpec(
        new CommandDescriptor(
          'addto',
          'addto <gid> <id>',
          'move a shape into a container',
          'edit',
          'addto <gid> <id>',
          7,
        ),
        (args) => new AddToShapeCommand(args),
      ),
      new CommandSpec(
        new CommandDescriptor(
          'front',
          'front <id>',
          'move a shape to the front',
          'edit',
          'front <id>',
          7,
        ),
        (args) => new FrontShapeCommand(args),
      ),
      new CommandSpec(
        new CommandDescriptor(
          'back',
          'back <id>',
          'move a shape to the back',
          'edit',
          'back <id>',
          7,
        ),
        (args) => new BackShapeCommand(args),
      ),
      new CommandSpec(
        new CommandDescriptor('tree', 'tree [id]', 'show the structure tree', 'display', 'tree [id]', 8),
        (args) => new TreeCommand(args),
      ),
      new CommandSpec(
        new CommandDescriptor(
          'show',
          'show <id>',
          'show one shape in detail',
          'display',
          'show <id>',
          8,
        ),
        (args) => new ShowShapeCommand(args),
      ),
      new CommandSpec(
        new CommandDescriptor('undo', 'undo', 'undo the last edit', 'meta', 'undo', 8),
        () => new UndoCommand(),
      ),
      new CommandSpec(
        new CommandDescriptor('redo', 'redo', 'redo the last undone edit', 'meta', 'redo', 8),
        () => new RedoCommand(),
      ),
      new CommandSpec(
        new CommandDescriptor('help', 'help', 'show all commands', 'display', 'help', 8),
        () => new HelpCommand(() => registry.descriptors()),
      ),
    ];
  }

  /** 内建命令类别常量集合（供文档与测试引用）。 */
  static categories(): readonly CommandCategory[] {
    return ['edit', 'document', 'display', 'meta'];
  }
}
