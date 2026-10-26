import { ConsoleOutput } from '../../src/cli/ConsoleOutput.js';

/**
 * 测试替身：把输出收集到内存，而不是写到终端。
 *
 * `lines` 只含完整行（writeLine 产生的），
 * `raw` 含全部字节（含没有换行的提示符）。
 */
export class RecordingOutput extends ConsoleOutput {
  readonly lines: string[] = [];
  readonly raw: string[] = [];

  override write(text: string): void {
    this.raw.push(text);
  }

  override writeLine(line: string): void {
    this.raw.push(`${line}\n`);
    this.lines.push(line);
  }

  /** 收集到的全部输出（行数组）。 */
  text(): string {
    return this.lines.join('\n');
  }
}
