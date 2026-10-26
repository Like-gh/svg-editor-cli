import { describe, expect, it } from 'vitest';
import { TreeColumnCalculator } from '../../src/view/TreeColumnCalculator.js';

describe('TreeColumnCalculator（PRD §6.1 列对齐规则）', () => {
  it('§5.1 示例：col = 19', () => {
    const rows = [
      { depth: 1, header: 'rect#bg', hasAttributeRow: true },
      { depth: 1, header: 'text#title', hasAttributeRow: true },
      { depth: 1, header: 'g#markers', hasAttributeRow: false },
      { depth: 2, header: 'circle#c1', hasAttributeRow: true },
      { depth: 2, header: 'rect#box', hasAttributeRow: true },
    ];
    expect(TreeColumnCalculator.column(rows)).toBe(19);
  });

  it('容器行不参与列宽计算', () => {
    const withContainer = [
      { depth: 1, header: 'g#a-very-long-container-name', hasAttributeRow: false },
      { depth: 2, header: 'r#x', hasAttributeRow: true },
    ];
    expect(TreeColumnCalculator.column(withContainer)).toBe(2 + (2 * 4 + 'r#x'.length));
  });

  it('补空格数 = col − endCol', () => {
    const row = { depth: 1, header: 'rect#bg', hasAttributeRow: true };
    expect(TreeColumnCalculator.endColumn(row)).toBe(11);
    expect(TreeColumnCalculator.padding(row, 19)).toBe(8);
  });

  it('名字过长时至少保留 1 个空格', () => {
    const row = { depth: 2, header: 'a-very-long-shape-id', hasAttributeRow: true };
    expect(TreeColumnCalculator.padding(row, 10)).toBe(1);
  });

  it('没有任何属性行时列为 2', () => {
    expect(TreeColumnCalculator.column([{ depth: 1, header: 'g#a', hasAttributeRow: false }])).toBe(2);
  });

  it('endCol = 4 × depth + len(header)（树形前缀长度恰为 4×depth）', () => {
    expect(TreeColumnCalculator.endColumn({ depth: 1, header: 'abc', hasAttributeRow: true })).toBe(7);
    expect(TreeColumnCalculator.endColumn({ depth: 3, header: 'abc', hasAttributeRow: true })).toBe(15);
  });
});
