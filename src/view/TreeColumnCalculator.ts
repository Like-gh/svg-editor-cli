/**
 * tree 的一行（供列对齐器计算）。
 */
export type TreeRow = {
  /** 层级深度：整树模式下根 `<svg>` 为 0，其直接子节点为 1 */
  readonly depth: number;
  /** 标题文本（`tag#id`） */
  readonly header: string;
  /** 该行是否带属性行（容器不带，因此不参与列宽计算） */
  readonly hasAttributeRow: boolean;
};

/**
 * tree 属性列对齐器 —— **C8 规则的唯一实现**。
 *
 * 规则（PRD §6.1）：
 * 1. `endCol(n) = 4 × depth(n) + len(header(n))`（树形前缀长度恰为 4 × depth）；
 * 2. `col = 2 + max{ endCol(n) | 该行带属性行 }`（容器不参与计算）；
 * 3. 每行补空格数 = `max(1, col − endCol(n))`（名字过长时至少留 1 个空格）。
 *
 * 它不认识任何图形类型，只看"有没有属性行 / 标题多长 / 第几层"。
 */
export class TreeColumnCalculator {
  /** 标题结束列。 */
  static endColumn(row: TreeRow): number {
    return row.depth * 4 + row.header.length;
  }

  /** 全局属性列（所有带属性行的节点共享同一绝对列）。 */
  static column(rows: readonly TreeRow[]): number {
    let widest = 0;
    for (const row of rows) {
      if (!row.hasAttributeRow) {
        continue;
      }
      const end = TreeColumnCalculator.endColumn(row);
      if (end > widest) {
        widest = end;
      }
    }
    return widest + 2;
  }

  /** 某行需要补的空格数。 */
  static padding(row: TreeRow, column: number): number {
    return Math.max(1, column - TreeColumnCalculator.endColumn(row));
  }
}
