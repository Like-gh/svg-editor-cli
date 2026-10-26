import { InputSource } from '../../src/cli/InputSource.js';

/**
 * 测试替身：按脚本逐行喂入输入，喂完返回 EOF。
 */
export class ScriptedInput implements InputSource {
  private index = 0;

  constructor(private readonly lines: readonly string[]) {}

  /** 读入下一行；脚本用尽返回 null（EOF）。 */
  readLine(): Promise<string | null> {
    const line = this.lines[this.index];
    this.index += 1;
    return Promise.resolve(line === undefined ? null : line);
  }
}
