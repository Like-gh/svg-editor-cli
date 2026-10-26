import { CommandError } from '../shared/CommandError.js';
import { Shape } from './Shape.js';
import { ShapeProvider } from './ShapeProvider.js';
import { ShapeRegistry } from './ShapeRegistry.js';

/**
 * 图形工厂 —— **两处允许的"按名字分派"之一（待重构点②）**。
 *
 * 它是"类型名 → 实例"的唯一映射入口：
 * - CLI 的 `create <type>` 走 `create()`，未注册类型抛 E-05 逐字错误；
 * - XML 解析走 `createFromXml()`，未识别标签返回 undefined（由解析器产出告警）。
 */
export class ShapeFactory {
  /**
   * @param registry 类型注册表
   */
  constructor(private readonly registry: ShapeRegistry) {}

  /**
   * 取类型提供者。
   *
   * @param typeName 类型名
   * @returns 类型提供者
   * @throws CommandError 类型未注册（`unknown shape type: <type> (is the plugin loaded?)`）
   */
  requireProvider(typeName: string): ShapeProvider {
    const provider = this.registry.find(typeName);
    if (provider === undefined) {
      throw new CommandError(`unknown shape type: ${typeName} (is the plugin loaded?)`);
    }
    return provider;
  }

  /**
   * 按类型名创建实例。
   *
   * @param typeName 类型名
   * @param props 属性表（含 `id`）
   * @throws CommandError 类型未注册（E-05）
   */
  create(typeName: string, props: Readonly<Record<string, string>>): Shape {
    return this.requireProvider(typeName).create(props);
  }

  /**
   * 某类型是否已注册。
   *
   * @param typeName 类型名
   */
  isSupported(typeName: string): boolean {
    return this.registry.find(typeName) !== undefined;
  }

  /**
   * 该类型的内容型参数名（如 text 元素的 `text`）。
   *
   * 解析器据此把 XML 子文本喂给正确的参数，避免在解析器里硬编码类型名。
   *
   * @param typeName 类型名
   * @returns 内容参数名；该类型没有内容参数返回 undefined
   */
  contentParamName(typeName: string): string | undefined {
    const provider = this.registry.find(typeName);
    if (provider === undefined) {
      return undefined;
    }
    return provider.params.find((field) => field.role === 'content')?.name;
  }

  /**
   * 按 XML 标签创建实例（解析路径）。
   *
   * 与 `create` 的区别：未识别的标签**不报错**，而是返回 undefined，
   * 由调用方产出 `warning: skipped unsupported element: <tag>` 告警。
   *
   * @param tag XML 标签名
   * @param attrs XML 属性表
   */
  createFromXml(tag: string, attrs: Readonly<Record<string, string>>): Shape | undefined {
    const provider = this.registry.find(tag);
    if (provider === undefined) {
      return undefined;
    }
    return provider.create(attrs);
  }
}
