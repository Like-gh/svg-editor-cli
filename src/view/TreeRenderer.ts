import { NumberFormat } from '../shared/NumberFormat.js';
import { Document } from '../domain/Document.js';
import { Shape } from '../domain/Shape.js';
import { TreeColumnCalculator } from './TreeColumnCalculator.js';

/**
 * tree 输出中的一个节点行（渲染器内部结构）。
 */
export type TreeEntry = {
  /** 层级深度 */
  readonly depth: number;
  /** 标题文本（`tag#id`） */
  readonly header: string;
  /** 属性行整串；容器为空串 */
  readonly attributeLine: string;
  /** 树形前缀（`├── ` / `└── ` / `│   ` / 空格填充） */
  readonly prefix: string;
};

/**
 * 文档 → tree 文本。
 *
 * 职责边界：只做"遍历结构 + 生成树形前缀 + 调用列对齐器补空格"，
 * 属性内容一律来自形状的多态自描述（describeForTree），
 * 因此渲染器里没有任何按图形类型的分支。
 */
export class TreeRenderer {
  /**
   * 渲染整棵树。
   *
   * @param document 当前文档
   * @returns 首行 `svg (W×H)` + 各节点行
   */
  render(document: Document): string[] {
    const entries = this.collect(document.children, 1, '');
    const lines = [
      `svg (${NumberFormat.format(document.width)}x${NumberFormat.format(document.height)})`,
    ];
    lines.push(...this.renderEntries(entries));
    return lines;
  }

  /**
   * 渲染以某个形状为根的子树。
   *
   * 子树模式的根行**只输出 `tag#id`**（OQ-02），其下节点相对 depth 从 1 起。
   *
   * @param root 子树根
   */
  renderSubtree(root: Shape): string[] {
    const summary = root.describeForTree();
    const children = root.isContainer() ? root.children : [];
    const entries = this.collect(children, 1, '');
    const lines = [summary.header];
    lines.push(...this.renderEntries(entries));
    return lines;
  }

  /** 深度优先收集节点行（含树形前缀）。 */
  private collect(
    children: readonly Shape[],
    depth: number,
    ancestorPrefix: string,
  ): TreeEntry[] {
    const entries: TreeEntry[] = [];
    children.forEach((child, index) => {
      const isLast = index === children.length - 1;
      const prefix = `${ancestorPrefix}${isLast ? '└── ' : '├── '}`;
      const summary = child.describeForTree();
      entries.push({
        depth,
        header: summary.header,
        attributeLine: summary.attributeLine,
        prefix,
      });
      if (child.isContainer()) {
        entries.push(
          ...this.collect(
            child.children,
            depth + 1,
            `${ancestorPrefix}${isLast ? '    ' : '│   '}`,
          ),
        );
      }
    });
    return entries;
  }

  /** 按全局单列规则渲染节点行。 */
  private renderEntries(entries: readonly TreeEntry[]): string[] {
    const rows = entries.map((entry) => ({
      depth: entry.depth,
      header: entry.header,
      hasAttributeRow: entry.attributeLine.length > 0,
    }));
    const column = TreeColumnCalculator.column(rows);
    return entries.map((entry, index) => {
      if (entry.attributeLine.length === 0) {
        return `${entry.prefix}${entry.header}`;
      }
      const padding = TreeColumnCalculator.padding(rows[index], column);
      return `${entry.prefix}${entry.header}${' '.repeat(padding)}${entry.attributeLine}`;
    });
  }
}
