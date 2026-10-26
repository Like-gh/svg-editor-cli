/**
 * 命令返回值载体。
 *
 * 命令不直接写 stdout：它们把"要打印什么"装进 CommandResult，
 * 由 CLI 层统一输出，从而保证命令可在测试中被断言。
 */
export class CommandResult {
  /**
   * @param lines 正文行（逐字确定）
   * @param warnings 警告行（如读入时自动补 id 的告警），输出在正文之前
   */
  constructor(
    readonly lines: readonly string[] = [],
    readonly warnings: readonly string[] = [],
  ) {}

  /** 构造单行结果。 */
  static of(line: string): CommandResult {
    return new CommandResult([line]);
  }

  /** 构造多行结果。 */
  static ofLines(lines: readonly string[]): CommandResult {
    return new CommandResult(lines);
  }

  /** 空结果。 */
  static empty(): CommandResult {
    return new CommandResult();
  }
}
