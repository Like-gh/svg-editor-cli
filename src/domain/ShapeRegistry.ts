import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import { ShapeProvider } from './ShapeProvider.js';
import { Text } from './Text.js';

/**
 * 图形类型注册表：类型名 → {@link ShapeProvider}。
 *
 * 这是**两处允许的"按名字分派"之一**（另一处是命令注册表），
 * 也是未来插件自注册的唯一入口（`register` 是 public）。
 */
export class ShapeRegistry {
  private readonly providers = new Map<string, ShapeProvider>();

  /**
   * 注册一个类型。
   *
   * @param provider 类型提供者
   */
  register(provider: ShapeProvider): void {
    this.providers.set(provider.typeName, provider);
  }

  /**
   * 按类型名查找。
   *
   * @param typeName 类型名
   * @returns 找到的提供者；未注册返回 undefined
   */
  find(typeName: string): ShapeProvider | undefined {
    return this.providers.get(typeName);
  }

  /** 已注册的全部类型名。 */
  typeNames(): string[] {
    return [...this.providers.keys()];
  }

  /**
   * 创建"已注册全部内建类型"的注册表 —— 内建类型注册的唯一清单。
   *
   * 内建类型不额外编写 Provider 类：它们的静态成员在结构上满足
   * {@link ShapeProvider} 接口，因此直接注册类即可。
   */
  static withBuiltins(): ShapeRegistry {
    const registry = new ShapeRegistry();
    // TODO(ARCH): 待重构点② —— 内建类型与插件类型的注册点。
    // 现状：内建类型以"类静态成员"充当 Provider，与插件类型不完全同构。
    // 方向：把"从 XML 属性构造"也纳入 ShapeProvider（fromXml），
    //       或为每个内建类型补一个 XxxShapeProvider 类。
    registry.register(Rect);
    registry.register(Circle);
    registry.register(Ellipse);
    registry.register(Line);
    registry.register(Text);
    registry.register(Group);
    return registry;
  }
}
