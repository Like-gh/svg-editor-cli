import { Argument } from '../shared/Argument.js';
import { CommandError } from '../shared/CommandError.js';
import { CommandResult } from '../shared/CommandResult.js';
import { CommandRegistry } from './CommandRegistry.js';
import { CommandSpec } from './CommandSpec.js';
import type { EditorSession } from './EditorSession.js';

/**
 * 命令调用者 —— **Command 模式的 Invoker 角色**。
 *
 * 它只做四件事：查注册表 → 新建命令实例 → execute → afterExecute。
 * **不包含任何业务逻辑，也不认识任何具体命令**；
 * 命令类别差异由 afterExecute 的多态承担（无 category 分支）。
 */
export class CommandInvoker {
  /**
   * @param registry 命令注册表
   * @param session 当前会话
   */
  constructor(
    private readonly registry: CommandRegistry,
    private readonly session: EditorSession,
  ) {}

  /**
   * 执行一条命令。
   *
   * @param name 命令名
   * @param args 命令参数
   * @returns 命令结果
   * @throws CommandError 未知命令（`unknown command: <name>`）或命令内部错误
   */
  invoke(name: string, args: readonly Argument[]): CommandResult {
    const spec = this.registry.find(name);
    if (spec === undefined) {
      throw new CommandError(`unknown command: ${name}`);
    }
    const command = this.createCommand(spec, args);
    const result = command.execute(this.session);
    command.afterExecute(this.session);
    return result;
  }

  /** 从注册单元创建命令实例（命令有状态，必须每次新建）。 */
  private createCommand(spec: CommandSpec, args: readonly Argument[]) {
    return spec.create(args);
  }
}
