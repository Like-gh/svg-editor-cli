import { Shape } from '../domain/Shape.js';

/**
 * 图形 → show 明细。
 *
 * 版式（PRD §5.3）：
 * - 第 1 行：`tag#id` + **两个空格** + `parent=<父容器 id 或 svg>`；
 * - 第 2 行起：缩进 2 个空格，几何属性一行、内容一行、paint 一行；
 * - 未设置的属性不出现。
 */
export class ShowRenderer {
  /**
   * 渲染单个图形的属性明细。
   *
   * @param shape 目标图形
   */
  render(shape: Shape): string[] {
    const summary = shape.describeForShow();
    const lines = [`${summary.header}  parent=${shape.parentLabel()}`];
    for (const detail of summary.detailLines) {
      lines.push(`  ${detail}`);
    }
    return lines;
  }
}
