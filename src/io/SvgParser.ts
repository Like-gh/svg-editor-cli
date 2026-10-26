import { XMLParser } from 'fast-xml-parser';
import { CommandError } from '../shared/CommandError.js';
import { Container } from '../domain/Container.js';
import { DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, Document } from '../domain/Document.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgParseResult } from './SvgParseResult.js';

/**
 * XML 解析后的中间节点（保留文档顺序）。
 */
export type RawNode = {
  /** 标签名 */
  readonly tag: string;
  /** 属性表 */
  readonly attributes: Readonly<Record<string, string>>;
  /** 子节点（按文档顺序） */
  readonly children: readonly RawNode[];
  /** 文本内容 */
  readonly text: string;
};

/**
 * SVG 文本 → 文档。
 *
 * 职责（R-61 ~ R-64）：
 * - 用 `fast-xml-parser` 的 `preserveOrder` 保留文档顺序（SVG 绘制顺序 = 文档顺序）；
 * - 按 {@link ShapeFactory} 构造形状（不按标签分派）；
 * - 缺 id 自动补齐并产出逐行告警；
 * - 未识别的元素忽略并告警（OQ-06），未建模的属性忽略且不写回（OQ-08）。
 */
export class SvgParser {
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    preserveOrder: true,
    parseAttributeValue: false,
    parseTagValue: false,
    trimValues: true,
  });

  /**
   * @param factory 形状工厂（类型名 → 实例的唯一映射点）
   */
  constructor(private readonly factory: ShapeFactory) {}

  /**
   * 解析 SVG 文本。
   *
   * @param xml SVG 文本
   * @returns 文档 + 告警行
   * @throws CommandError 无法解析或缺少根 `<svg>` 元素
   */
  parse(xml: string): SvgParseResult {
    const parsed = this.xmlParser.parse(xml);
    const roots = this.toNodes(Array.isArray(parsed) ? parsed : [parsed]);
    const rootNode = roots.find((node) => node.tag === 'svg');
    if (rootNode === undefined) {
      throw new CommandError('missing <svg> root element');
    }

    const warnings: string[] = [];
    const usedIds = new Set<string>();
    this.collectIds(rootNode, usedIds);
    const counters = new Map<string, number>();

    const document = new Document(
      this.readSize(rootNode.attributes['width'], DEFAULT_CANVAS_WIDTH),
      this.readSize(rootNode.attributes['height'], DEFAULT_CANVAS_HEIGHT),
    );
    this.buildChildren(rootNode, document, warnings, counters, usedIds);
    return new SvgParseResult(document, warnings);
  }

  /** 把解析结果转成保留顺序的节点列表。 */
  private toNodes(entries: unknown[]): RawNode[] {
    const nodes: RawNode[] = [];
    for (const entry of entries) {
      const record = this.asRecord(entry);
      if (record === null) {
        continue;
      }
      for (const [key, value] of Object.entries(record)) {
        if (key === ':@' || key === '#text') {
          continue;
        }
        if (key.startsWith('?') || key.startsWith('!')) {
          // XML 声明 / DOCTYPE / 注释等指令节点，忽略
          continue;
        }
        const children = Array.isArray(value) ? this.toNodes(value) : [];
        nodes.push({
          tag: key,
          attributes: this.readAttributes(record[':@']),
          children,
          text: this.readText(value),
        });
      }
    }
    return nodes;
  }

  /** 读取属性表（去掉 fast-xml-parser 的 `@_` 前缀）。 */
  private readAttributes(value: unknown): Record<string, string> {
    const attributes: Record<string, string> = {};
    const record = this.asRecord(value);
    if (record === null) {
      return attributes;
    }
    for (const [key, raw] of Object.entries(record)) {
      if (!key.startsWith('@_')) {
        continue;
      }
      attributes[key.slice(2)] = typeof raw === 'string' ? raw : String(raw);
    }
    return attributes;
  }

  /** 读取子文本。 */
  private readText(value: unknown): string {
    if (!Array.isArray(value)) {
      return '';
    }
    let text = '';
    for (const item of value) {
      const record = this.asRecord(item);
      if (record === null) {
        continue;
      }
      const textValue = record['#text'];
      if (typeof textValue === 'string') {
        text += textValue;
      }
    }
    return text.trim();
  }

  /** 收集整棵树里已存在的 id（自动补 id 时用于避让）。 */
  private collectIds(node: RawNode, usedIds: Set<string>): void {
    const id = node.attributes['id'];
    if (id !== undefined && id !== '') {
      usedIds.add(id);
    }
    for (const child of node.children) {
      this.collectIds(child, usedIds);
    }
  }

  /** 递归构造子节点。 */
  private buildChildren(
    node: RawNode,
    parent: Container,
    warnings: string[],
    counters: Map<string, number>,
    usedIds: Set<string>,
  ): void {
    for (const child of node.children) {
      if (!this.factory.isSupported(child.tag)) {
        // OQ-06：未建模的元素忽略 + 一行告警，不建节点、不计入元素数
        warnings.push(`warning: skipped unsupported element: <${child.tag}>`);
        continue;
      }
      const attributes: Record<string, string> = { ...child.attributes };
      const originalId = attributes['id'];
      if (originalId === undefined || originalId === '') {
        const assigned = this.assignId(child.tag, counters, usedIds);
        warnings.push(`warning: assigned id ${assigned} to unnamed <${child.tag}>`);
        attributes['id'] = assigned;
      }
      // 内容型参数（如 text 元素的 `text`）来自 XML 子文本，按 schema 定位参数名
      const contentParam = this.factory.contentParamName(child.tag);
      if (contentParam !== undefined && child.text !== '') {
        attributes[contentParam] = child.text;
      }
      // 未建模属性显式告警（QA 缺陷 D-02 的修法）：
      // 本阶段**不做属性透传**——若透传 transform，对含 transform 的容器执行
      // move / scale（本阶段作用于子孙自身坐标）会与组级变换叠加，
      // 得到"看似保真、实则语义错误"的结果；完整解法是**组变换建模**，
      // 超出本阶段范围（与复合图形插件化同理：留缝不实现）。
      // 因此选择"显式告警 + 文档声明"，让用户明确知道信息被丢弃了。
      const modeled = this.factory.modeledAttributeNames(child.tag);
      for (const name of Object.keys(attributes)) {
        if (modeled.includes(name)) {
          continue;
        }
        warnings.push(
          `warning: skipped attribute ${name} on ${child.tag}#${attributes['id'] ?? ''}`,
        );
      }
      const shape = this.factory.createFromXml(child.tag, attributes);
      if (shape === undefined) {
        warnings.push(`warning: skipped unsupported element: <${child.tag}>`);
        continue;
      }
      parent.addChild(shape);
      if (shape.isContainer()) {
        this.buildChildren(child, shape, warnings, counters, usedIds);
      }
    }
  }

  /**
   * 自动补 id：按"标签名 + 序号"，序号从 1 起；与既有 id 冲突则顺延。
   */
  private assignId(tag: string, counters: Map<string, number>, usedIds: Set<string>): string {
    let sequence = (counters.get(tag) ?? 0) + 1;
    counters.set(tag, sequence);
    let candidate = `${tag}${sequence}`;
    while (usedIds.has(candidate)) {
      sequence += 1;
      candidate = `${tag}${sequence}`;
      counters.set(tag, sequence);
    }
    usedIds.add(candidate);
    return candidate;
  }

  /** 读取尺寸属性，缺省或非法时退回默认值。 */
  private readSize(value: string | undefined, fallback: number): number {
    if (value === undefined) {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  /** 把 unknown 安全地转成对象视图。 */
  private asRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }
}
