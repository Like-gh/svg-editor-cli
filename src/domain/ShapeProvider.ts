import type { Shape } from './Shape.js';
import type { ShapeField } from './ShapeField.js';

/**
 * 图形类型提供者的接口 —— **插件插槽**。
 *
 * 内建类型以"类自身的静态成员"在结构上满足该接口，
 * 因此 `registry.register(Rect)` 是合法的；未来的插件类型只需
 * `implements ShapeProvider` 再注册即可接入，内核零改动。
 *
 * 本阶段内核**没有任何外部实现**（复合图形类型属后续插件化阶段）。
 */
export interface ShapeProvider {
  /** 类型名（注册表键，也是 CLI 里 `create <type>` 的取值）。 */
  readonly typeName: string;

  /** 建图参数 schema（决定 `create` 如何解析位置参数）。 */
  readonly params: readonly ShapeField[];

  /**
   * 由属性表创建实例。
   *
   * @param props 属性表；含特殊键 `id`（图形 id），其余键与 params 同名
   */
  create(props: Readonly<Record<string, string>>): Shape;
}
