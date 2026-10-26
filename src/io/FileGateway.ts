import { CommandError } from '../shared/CommandError.js';
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * 文件读写网关：把"字节 ↔ 文本"这件事隔离在 IO 层。
 *
 * 失败一律转换为 {@link CommandError}，
 * 由调用方补上文件名，得到 E-10 / E-11 的逐字文案。
 */
export class FileGateway {
  /**
   * 读取文本文件。
   *
   * @param path 文件路径
   * @returns 文件内容
   * @throws CommandError 文件不存在或不可读（`cannot read file: <path>`）
   */
  readText(path: string): string {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      throw new CommandError(`cannot read file: ${path}`);
    }
  }

  /**
   * 写入文本文件。
   *
   * @param path 文件路径
   * @param content 文件内容
   * @throws CommandError 路径不可写（`cannot write file: <path>`）
   */
  writeText(path: string, content: string): void {
    try {
      writeFileSync(path, content, 'utf8');
    } catch {
      throw new CommandError(`cannot write file: ${path}`);
    }
  }
}
