import { Argument } from '../shared/Argument.js';
import { CommandCategory } from '../shared/CommandDescriptor.js';
import { CommandError } from '../shared/CommandError.js';
import { CommandResult } from '../shared/CommandResult.js';
import type { EditorSession } from './EditorSession.js';

/**
 * 命令抽象基类 —— **Command 模式的 Command 角色**。
 *
 * 每个命令对象封装三件事：自己的参数、执行逻辑、（编辑类的）撤销逻辑。
 * 命令对象**有状态且不可复用**：每次执行都由 {@link CommandSpec} 新建实例。
 *
 * 类别差异由类层次（EditCommand / DocumentCommand / DisplayCommand）承担，
 * 因此 Invoker 内不存在任何 category 的 if/switch。
 */
export abstract class Command {
  /** 命令名（分派键）。 */
  abstract readonly name: string;

  /** 参数错误文案使用的 usage 串。 */
  abstract readonly usage: string;

  /** 一句话说明。 */
  abstract readonly summary: string;

  /** 命令类别。 */
  abstract readonly category: CommandCategory;

  /**
   * 执行命令。
   *
   * @param session 当前会话（持有文档与历史栈）
   */
  abstract execute(session: EditorSession): CommandResult;

  /**
   * 执行成功后的钩子（模板方法）。
   *
   * 基类默认空实现；编辑类覆写为"解锁 + 入栈"，文档类覆写为"上锁"。
   *
   * @param session 当前会话
   */
  afterExecute(session: EditorSession): void {
    void session;
  }

  /** 参数不足/过多时的统一错误（OQ-15）。 */
  protected usageError(): CommandError {
    return new CommandError(`usage: ${this.usage}`);
  }

  /**
   * 解析数值参数。
   *
   * @param raw 原始文本
   * @param label 参数名（用于错误文案）
   */
  protected parseNumber(raw: string, label: string): number {
    const parsed = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(parsed)) {
      throw new CommandError(`invalid value for ${label}: ${raw}`);
    }
    return parsed;
  }

  /** 参数是否可解析为有限数值。 */
  protected static isNumeric(raw: string): boolean {
    return raw.trim() !== '' && Number.isFinite(Number(raw));
  }

  /** 把 token 列表转成参数文本列表。 */
  protected static texts(args: readonly Argument[]): string[] {
    return args.map((argument) => argument.value);
  }
}
