import { NumberFormat } from '../shared/NumberFormat.js';
import { Document } from '../domain/Document.js';

/**
 * 文档 → SVG 文本。
 *
 * 格式契约（R-60 / §11.7）：
 * - 首行 `<?xml version="1.0" encoding="UTF-8"?>`；
 * - 根元素含 `xmlns` / `width` / `height` / `viewBox`；
 * - 属性顺序：id → 几何（params 顺序）→ fill → stroke → stroke-width，未设置的不写；
 * - 每层缩进 2 空格，空容器自闭合。
 */
export class SvgWriter {
  /**
   * 序列化整个文档。
   *
   * @param document 目标文档
   * @returns 完整 SVG 文本（以换行结尾）
   */
  write(document: Document): string {
    const width = NumberFormat.format(document.width);
    const height = NumberFormat.format(document.height);
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
    lines.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    );
    for (const child of document.children) {
      lines.push(child.toSvgXml('  '));
    }
    lines.push('</svg>');
    return `${lines.join('\n')}\n`;
  }
}
