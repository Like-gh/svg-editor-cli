import { Document } from '../domain/Document.js';

/**
 * 解析结果载体：文档 + 告警行。
 *
 * 告警（如读入时自动补 id）逐字保留，由命令层放进 CommandResult.warnings，
 * 保证"全部告警在 read 汇总行之前输出"。
 */
export class SvgParseResult {
  /**
   * @param document 解析出的文档
   * @param warnings 告警行（已含 `warning: ` 前缀）
   */
  constructor(
    readonly document: Document,
    readonly warnings: readonly string[] = [],
  ) {}
}
