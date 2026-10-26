/**
 * 数值 → 字符串的**唯一出口**。
 *
 * 契约（R-93 / OQ-14）：
 * - 整数不带 `.0`（`100` 而不是 `100.0`）；
 * - 小数保留 10 位小数后去尾零（`12.5` 保持不变，`0.1 + 0.2` 被抹平成 `0.3`）。
 */
export class NumberFormat {
  /** 去噪精度：小数保留的位数。 */
  private static readonly DECIMAL_PLACES = 10;

  /**
   * 把数值格式化成回显用的字符串。
   *
   * @param value 待格式化的数值
   * @returns 整数原样；小数去尾零后的字符串
   */
  static format(value: number): string {
    if (!Number.isFinite(value)) {
      return '0';
    }
    if (Number.isInteger(value)) {
      // -0 会被 String() 渲染成 "0"，这里显式处理避免 "-0"
      return Object.is(value, -0) ? '0' : String(value);
    }
    const fixed = value.toFixed(NumberFormat.DECIMAL_PLACES);
    return fixed.replace(/0+$/, '').replace(/\.$/, '');
  }
}
