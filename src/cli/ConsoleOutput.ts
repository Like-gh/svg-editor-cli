/**
 * stdout 写入端口。
 *
 * 抽成端口是为了让 REPL 可测：测试可以替换成收集输出的实现，
 * 而不必真的往终端打印。
 */
export class ConsoleOutput {
  /** 原样写出（不追加换行），用于提示符。 */
  write(text: string): void {
    process.stdout.write(text);
  }

  /** 写出一行。 */
  writeLine(line: string): void {
    process.stdout.write(`${line}\n`);
  }
}
