import { Argument } from '../shared/Argument.js';
import { CommandDescriptor } from '../shared/CommandDescriptor.js';
import { Command } from './Command.js';

/**
 * 命令的注册单元：描述符 + 命令工厂。
 *
 * 工厂是闭包而非命令类本身，因为**命令对象有状态、不可复用**：
 * 每次执行都必须新建一个实例。
 */
export class CommandSpec {
  /**
   * @param descriptor 命令的纯数据描述（供 help 渲染与 usage 错误文案）
   * @param factory 命令实例工厂
   */
  constructor(
    readonly descriptor: CommandDescriptor,
    private readonly factory: (args: readonly Argument[]) => Command,
  ) {}

  /**
   * 新建一个命令实例。
   *
   * @param args 命令参数
   */
  create(args: readonly Argument[]): Command {
    return this.factory(args);
  }
}
