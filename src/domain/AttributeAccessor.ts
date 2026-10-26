import type { ShapeFieldRole } from './ShapeField.js';

/**
 * 属性访问器：形状的"可读写属性"的自描述单元。
 *
 * 它是**多态取代按标签分派**的关键零件：
 * 基类的 translate / scaleBy / getAttribute / setAttribute
 * 只需遍历访问器表，完全不需要知道具体图形类型。
 */
export class AttributeAccessor {
  /**
   * @param name 属性名
   * @param role 语义角色
   * @param axis 所属坐标轴（x / y / none）
   * @param reader 读取函数（返回 undefined 表示该属性当前未设置）
   * @param writer 写入函数
   */
  constructor(
    readonly name: string,
    readonly role: ShapeFieldRole,
    readonly axis: 'x' | 'y' | 'none',
    private readonly reader: () => string | undefined,
    private readonly writer: (value: string) => void,
  ) {}

  /** 读取当前值；未设置返回 undefined。 */
  get(): string | undefined {
    return this.reader();
  }

  /** 写入新值。 */
  set(value: string): void {
    this.writer(value);
  }
}
