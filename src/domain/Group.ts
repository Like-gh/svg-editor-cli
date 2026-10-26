import { Container } from './Container.js';
import { ShapeField } from './ShapeField.js';

/**
 * 分组容器 `<g>`：本阶段唯一的用户可见容器类型。
 *
 * 容器与叶子的操作接口完全一致（Composite 语义），
 * `move` / `scale` / `set` / `delete` 对 `<g>` 与叶子一视同仁。
 */
export class Group extends Container {
  /** 类型名（注册表键）。 */
  static readonly typeName = 'g';

  /** 建图参数 schema：`create g <id>` 不接受任何参数。 */
  static readonly params: readonly ShapeField[] = [];

  readonly tag = 'g';

  constructor(id: string) {
    super(id);
  }

  /** 由 props 创建实例（工厂与 XML 解析共用）。 */
  static create(props: Readonly<Record<string, string>>): Group {
    const group = new Group(props['id'] ?? '');
    group.applyPaintProps(props);
    return group;
  }

  /** 创建空的同类型副本（深拷贝用）。 */
  protected override cloneEmpty(): Container {
    return new Group(this.id);
  }
}
