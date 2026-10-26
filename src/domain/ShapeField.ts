/**
 * 参数在语义上的角色。
 *
 * 角色决定基类里的**泛型算法**如何作用，无需任何按标签的分支：
 * - `position`：位置量，参与平移与缩放；
 * - `size`：尺寸量，只参与缩放；
 * - `endpoint`：端点量（如直线的 x2/y2），既参与平移也参与缩放；
 * - `content`：文本内容，不参与几何运算；
 * - `paint`：绘制属性（fill / stroke / stroke-width），不参与几何运算。
 */
export type ShapeFieldRole = 'position' | 'size' | 'endpoint' | 'content' | 'paint';

/** 参数的数据类型，决定 `create` 时是否做数值校验。 */
export type ShapeFieldKind = 'number' | 'color' | 'string';

/**
 * 参数 schema 的值对象：描述"某个图形类型接受哪些参数、参数是什么语义"。
 *
 * 它与 {@link AttributeAccessor} 同源（name / role / axis 一致），
 * 目的是让"建图参数"与"可设置属性"不会各自漂移。
 */
export class ShapeField {
  /**
   * @param name 属性名
   * @param role 语义角色
   * @param axis 所属坐标轴（x / y / none）
   * @param kind 数据类型
   * @param required 是否必填（`create` 时缺省即报 usage 错误）
   */
  constructor(
    readonly name: string,
    readonly role: ShapeFieldRole,
    readonly axis: 'x' | 'y' | 'none',
    readonly kind: ShapeFieldKind,
    readonly required: boolean = true,
  ) {}
}
