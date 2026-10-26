import { AttributeAccessor } from './AttributeAccessor.js';
import { Shape } from './Shape.js';
import { ShapeField } from './ShapeField.js';
import { ShapeSummary } from './ShapeSummary.js';

/**
 * 文本 `<text>`：几何属性 x / y，文本内容是**子文本**而不是属性。
 *
 * tree 中不显示 paint（与 line 一致，OQ-05），paint 用 show 查看。
 */
export class Text extends Shape {
  /** 类型名（注册表键）。 */
  static readonly typeName = 'text';

  /** 建图参数 schema（与实例访问器同源）。 */
  static readonly params: readonly ShapeField[] = [
    new ShapeField('x', 'position', 'x', 'number', true),
    new ShapeField('y', 'position', 'y', 'number', true),
    new ShapeField('text', 'content', 'none', 'string', true),
  ];

  readonly tag = 'text';

  private xValue = 0;
  private yValue = 0;
  private content = '';

  constructor(id: string, x = 0, y = 0, content = '') {
    super(id);
    this.xValue = x;
    this.yValue = y;
    this.content = content;
  }

  /** 由 props 创建实例（工厂与 XML 解析共用）。 */
  static create(props: Readonly<Record<string, string>>): Text {
    const text = new Text(props['id'] ?? '');
    text.xValue = Shape.optionalNumber(props['x'], 0);
    text.yValue = Shape.optionalNumber(props['y'], 0);
    text.content = props['text'] ?? '';
    text.applyPaintProps(props);
    return text;
  }

  protected override accessors(): readonly AttributeAccessor[] {
    return [
      new AttributeAccessor('x', 'position', 'x', () => this.format(this.xValue), (value) => {
        this.xValue = Shape.requireNumber(value, 'x');
      }),
      new AttributeAccessor('y', 'position', 'y', () => this.format(this.yValue), (value) => {
        this.yValue = Shape.requireNumber(value, 'y');
      }),
      new AttributeAccessor('text', 'content', 'none', () => this.content, (value) => {
        this.content = value;
      }),
      ...this.paintAccessors(),
    ];
  }

  /** tree 属性行：`(20,40) "My Diagram"`（坐标对 + 双引号包裹内容）。 */
  override describeForTree(): ShapeSummary {
    const line = `(${this.format(this.xValue)},${this.format(this.yValue)}) "${this.content}"`;
    return new ShapeSummary(`${this.tag}#${this.id}`, line);
  }

  /** show 明细：几何一行、内容一行、paint 一行。 */
  override describeForShow(): ShapeSummary {
    const details: string[] = [
      `x=${this.format(this.xValue)} y=${this.format(this.yValue)}`,
      `text="${this.content}"`,
    ];
    const paints = this.paintEntries();
    if (paints.length > 0) {
      details.push(paints.join(' '));
    }
    return new ShapeSummary(`${this.tag}#${this.id}`, '', details);
  }

  override position(): { readonly x: number; readonly y: number } {
    return { x: this.xValue, y: this.yValue };
  }

  /** 文本内容是子文本，序列化时不能写成 XML 属性。 */
  override toSvgXml(indent: string): string {
    const attributes = this.svgAttributes();
    const attributeText = attributes.length === 0 ? '' : ` ${attributes.join(' ')}`;
    return `${indent}<${this.tag}${attributeText}>${Shape.escapeXml(this.content)}</${this.tag}>`;
  }

  override clone(): Text {
    const copy = new Text(this.id, this.xValue, this.yValue, this.content);
    copy.copyPaintFrom(this);
    return copy;
  }
}
