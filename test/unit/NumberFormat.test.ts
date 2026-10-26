import { describe, expect, it } from 'vitest';
import { NumberFormat } from '../../src/shared/NumberFormat.js';

describe('NumberFormat', () => {
  it('整数不带 .0', () => {
    expect(NumberFormat.format(100)).toBe('100');
    expect(NumberFormat.format(0)).toBe('0');
    expect(NumberFormat.format(-40)).toBe('-40');
  });

  it('小数保留原值', () => {
    expect(NumberFormat.format(12.5)).toBe('12.5');
    expect(NumberFormat.format(0.25)).toBe('0.25');
  });

  it('抹平浮点噪声（OQ-14：保留 10 位小数后去尾零）', () => {
    expect(NumberFormat.format(0.1 + 0.2)).toBe('0.3');
    expect(NumberFormat.format(1 / 3)).toBe('0.3333333333');
  });

  it('非有限数退化为 0，不产生 NaN/Infinity 字样', () => {
    expect(NumberFormat.format(Number.NaN)).toBe('0');
    expect(NumberFormat.format(Number.POSITIVE_INFINITY)).toBe('0');
  });

  it('负零不渲染为 -0', () => {
    expect(NumberFormat.format(-0)).toBe('0');
  });
});
