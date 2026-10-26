/**
 * 输入端口：REPL 只依赖"能逐行读入"这一件事。
 *
 * 抽成端口既便于测试（喂入脚本行），
 * 也为将来接脚本回放 / GUI 留出缝隙（架构 §6 V-07）。
 */
export interface InputSource {
  /**
   * 读入一行。
   *
   * @returns 输入内容；到达 EOF 返回 null
   */
  readLine(): Promise<string | null>;
}
