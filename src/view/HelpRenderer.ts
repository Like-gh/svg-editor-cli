import { CommandDescriptor } from '../shared/CommandDescriptor.js';

/**
 * 命令描述符列表 → help 文本。
 *
 * 版式逐字复现 PRD Q10：先 `commands:`，再按 helpLine 分组，
 * 同行片段用 ` / ` 连接；带说明的行把说明对齐到第 36 列。
 *
 * 它**只依赖 shared 的描述符接口**，因此 view 层不必依赖 command 层。
 */
export class HelpRenderer {
  /** 说明文字所在的绝对列（0 基）。 */
  static readonly SUMMARY_COLUMN = 36;

  /**
   * 渲染 help 文本。
   *
   * @param descriptors 全部命令的描述符
   */
  render(descriptors: readonly CommandDescriptor[]): string[] {
    const groups = new Map<number, CommandDescriptor[]>();
    for (const descriptor of descriptors) {
      const group = groups.get(descriptor.helpLine);
      if (group === undefined) {
        groups.set(descriptor.helpLine, [descriptor]);
      } else {
        group.push(descriptor);
      }
    }
    const lines = ['commands:'];
    for (const key of [...groups.keys()].sort((left, right) => left - right)) {
      const group = groups.get(key) ?? [];
      const usage = group.map((descriptor) => descriptor.helpUsage).join(' / ');
      const summary = group.find((descriptor) => descriptor.helpSummary !== undefined)?.helpSummary;
      if (summary === undefined) {
        lines.push(`  ${usage}`);
      } else {
        lines.push(`  ${usage.padEnd(HelpRenderer.SUMMARY_COLUMN - 2)}${summary}`);
      }
    }
    return lines;
  }
}
