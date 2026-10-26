import { describe, expect, it } from 'vitest';
import { Circle } from '../../src/domain/Circle.js';
import { Document } from '../../src/domain/Document.js';
import { DocumentSnapshot } from '../../src/domain/DocumentSnapshot.js';
import { Group } from '../../src/domain/Group.js';
import { Rect } from '../../src/domain/Rect.js';

describe('DocumentSnapshot（Memento）', () => {
  it('捕获与还原往返一致', () => {
    const document = new Document(800, 600);
    const group = new Group('markers');
    group.addChild(new Circle('c1', 100, 100, 20));
    document.addChild(new Rect('bg', 0, 0, 800, 600));
    document.addChild(group);

    const snapshot = document.captureSnapshot();

    document.addChild(new Rect('extra', 0, 0, 1, 1));
    group.translate(30, 0);
    document.setSize(400, 300);
    expect(document.elementCount()).toBe(4);

    snapshot.restoreTo(document);

    expect(document.elementCount()).toBe(3);
    expect(document.width).toBe(800);
    expect(document.height).toBe(600);
    const restored = document.findById('c1');
    expect(restored?.getAttribute('cx')).toBe('100');
  });

  it('快照与原文档互不共享对象（深拷贝）', () => {
    const document = new Document();
    document.addChild(new Rect('r1', 0, 0, 10, 10));
    const snapshot = DocumentSnapshot.capture(document);
    document.findById('r1')?.setAttribute('fill', 'red');
    snapshot.restoreTo(document);
    expect(document.findById('r1')?.getAttribute('fill')).toBeUndefined();
  });

  it('还原后 id 索引仍然可用', () => {
    const document = new Document();
    document.addChild(new Rect('r1', 0, 0, 10, 10));
    const snapshot = document.captureSnapshot();
    document.removeChild(document.children[0]);
    expect(document.findById('r1')).toBeUndefined();
    snapshot.restoreTo(document);
    expect(document.findById('r1')).toBeDefined();
  });
});
