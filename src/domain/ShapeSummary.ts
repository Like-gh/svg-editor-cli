/**
 * 形状的自描述结果：渲染器（tree / show）唯一的输入。
 *
 * 由 {@link Shape.describeForTree} 与 {@link Shape.describeForShow} 多态产出，
 * 渲染器因此不需要知道任何图形类型。
 */
export class ShapeSummary {
  /**
   * @param header 标题行（`tag#id`）
   * @param attributeLine tree 的属性行；容器为空串（容器不参与列宽计算）
   * @param detailLines show 的明细行（几何行 / 内容行 / paint 行）
   */
  constructor(
    readonly header: string,
    readonly attributeLine: string,
    readonly detailLines: readonly string[] = [],
  ) {}

  /** 是否带属性行。 */
  hasAttributeLine(): boolean {
    return this.attributeLine.length > 0;
  }
}
