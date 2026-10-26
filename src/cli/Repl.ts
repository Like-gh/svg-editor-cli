import { CommandError } from '../shared/CommandError.js';
import { CommandInvoker } from '../command/CommandInvoker.js';
import { ConsoleOutput } from './ConsoleOutput.js';
import { InputSource } from './InputSource.js';
import { Tokenizer } from './Tokenizer.js';

/**
 * REPL 主循环：读行 → 分词 → 交给 Invoker → 打印结果。
 *
 * 交互契约（R-01 ~ R-03）：
 * - 提示符固定 `svg> `，逐行读入；
 * - `#` 开头为注释，空行忽略（**无任何输出**）；
 * - 命令异常 → 打印**单行** `error: <消息>`；
 * - EOF 退出。
 */
export class Repl {
  /** 启动横幅（em dash 为 U+2014，单引号为 ASCII）。 */
  static readonly BANNER = "svg-editor 0.1 — type 'help' for commands";

  /** 提示符。 */
  static readonly PROMPT = 'svg> ';

  /**
   * @param invoker 命令调用者
   * @param input 输入端口
   * @param output 输出端口
   * @param tokenizer 分词器
   * @param echoInput 非交互（管道 / 重定向）时是否回显输入行
   */
  constructor(
    private readonly invoker: CommandInvoker,
    private readonly input: InputSource,
    private readonly output: ConsoleOutput,
    private readonly tokenizer: Tokenizer,
    private readonly echoInput: boolean = false,
  ) {}

  /** 运行 REPL，直到输入结束。 */
  async run(): Promise<void> {
    this.output.writeLine(Repl.BANNER);
    for (;;) {
      this.output.write(Repl.PROMPT);
      const line = await this.input.readLine();
      if (line === null) {
        return;
      }
      if (this.echoInput) {
        // 非交互环境没有终端回显，这里补一行，使输出与交互形态一致
        this.output.writeLine(line);
      }
      this.handle(line);
    }
  }

  /** 处理一行输入（注释与空行直接忽略）。 */
  private handle(line: string): void {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      return;
    }
    const tokens = this.tokenizer.tokenize(trimmed);
    if (tokens.length === 0) {
      return;
    }
    try {
      const result = this.invoker.invoke(tokens[0].value, tokens.slice(1));
      for (const warning of result.warnings) {
        this.output.writeLine(warning);
      }
      for (const outputLine of result.lines) {
        this.output.writeLine(outputLine);
      }
    } catch (error) {
      this.output.writeLine(`error: ${Repl.describe(error)}`);
    }
  }

  /** 把异常压成单行可读文案。 */
  private static describe(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    const singleLine = message.replace(/\s*[\r\n]+\s*/g, ' ');
    if (error instanceof CommandError) {
      return singleLine;
    }
    return `internal error: ${singleLine}`;
  }
}
