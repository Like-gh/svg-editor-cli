import { describe, expect, it } from 'vitest';
import { Circle } from '../../src/domain/Circle.js';
import { Document } from '../../src/domain/Document.js';
import { Group } from '../../src/domain/Group.js';
import { Rect } from '../../src/domain/Rect.js';

describe('Document', () => {
  it('默认画布为 800x600', () => {
    const document = new Document();
    expect(document.width).toBe(800);
    expect(document.height).toBe(600);
  });

  it('元素计数含容器与其子孙（口径：除根 svg 外）', () => {
    const document = new Document(800, 600);
    document.addChild(new Rect('bg', 0, 0, 800, 600));
    document.addChild(new Rect('title', 0, 0, 10, 10));
    const group = new Group('markers');
    group.addChild(new Circle('c1', 100, 100, 20));
    group.addChild(new Rect('box', 200, 80, 60, 60));
    document.addChild(group);
    expect(document.elementCount()).toBe(5);
  });

  it('findById 递归查找子孙且大小写敏感', () => {
    const document = new Document();
    const group = new Group('markers');
    group.addChild(new Circle('c1', 100, 100, 20));
    document.addChild(group);
    expect(document.findById('c1')).toBeDefined();
    expect(document.findById('C1')).toBeUndefined();
    expect(document.findById('svg')).toBeUndefined();
  });

  it('contains 判定子孙关系（E-07 检测所需）', () => {
    const outer = new Group('outer');
    const inner = new Group('inner');
    const leaf = new Rect('leaf', 0, 0, 1, 1);
    inner.addChild(leaf);
    outer.addChild(inner);
    expect(outer.contains(leaf)).toBe(true);
    expect(outer.contains(outer)).toBe(false);
  });

  it('addChild 会把形状从原父容器摘出', () => {
    const document = new Document();
    const group = new Group('g1');
    const rect = new Rect('r1', 0, 0, 1, 1);
    document.addChild(rect);
    group.addChild(rect);
    expect(document.children).toHaveLength(0);
    expect(group.children).toHaveLength(1);
    expect(rect.parent).toBe(group);
  });

  it('removeChild 清理父子关系', () => {
    const group = new Group('g1');
    const rect = new Rect('r1', 0, 0, 1, 1);
    group.addChild(rect);
    expect(group.removeChild(rect)).toBe(true);
    expect(group.removeChild(rect)).toBe(false);
    expect(rect.parent).toBeNull();
  });

  it('setSize 只改画布尺寸，不动元素坐标', () => {
    const document = new Document(800, 600);
    const rect = new Rect('r1', 10, 20, 30, 40);
    document.addChild(rect);
    document.setSize(400, 300);
    expect(document.width).toBe(400);
    expect(document.height).toBe(300);
    expect(rect.getAttribute('x')).toBe('10');
  });
});
