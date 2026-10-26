import { CommandDescriptor } from '../shared/CommandDescriptor.js';
import { CommandSpec } from './CommandSpec.js';

/**
 * 命令注册表：命令名 → {@link CommandSpec}。
 *
 * 这是**两处允许的"按名字分派"之一（待重构点①）**。
 * 之所以允许按名字分派，是因为命令本身是可插拔的：
 * 新增命令 = 加一个类 + 加一行注册，而不是改一个中央 switch。
 */
export class CommandRegistry {
  private readonly specs = new Map<string, CommandSpec>();

  /**
   * 注册命令。
   *
   * @param spec 命令注册单元
   */
  // TODO(ARCH): 待重构点① —— 命令分派点。
  // 现状：已是 Map 注册表而非 switch，但 CommandCatalog 仍是中心清单，
  //       且 spec.create 的闭包把参数解析耦合在注册处。
  // 方向：① 参数解析下沉到命令类（Command.parse 自解析）；
  //       ② 引入 CommandProvider 概念，插件可自带命令注册；
  //       ③ 长期形态：注册表由能力声明驱动（每条命令声明自己的参数 schema）。
  register(spec: CommandSpec): void {
    this.specs.set(spec.descriptor.name, spec);
  }

  /**
   * 按命令名查找。
   *
   * @param name 命令名
   * @returns 注册单元；未注册返回 undefined
   */
  find(name: string): CommandSpec | undefined {
    return this.specs.get(name);
  }

  /** 全部已注册命令。 */
  all(): CommandSpec[] {
    return [...this.specs.values()];
  }

  /** 全部已注册命令的描述符（help 渲染的数据源）。 */
  descriptors(): CommandDescriptor[] {
    return this.all().map((spec) => spec.descriptor);
  }
}
