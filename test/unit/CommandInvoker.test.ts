import { describe, expect, it } from 'vitest';
import { EditorHarness } from '../support/EditorHarness.js';

/**
 * 命令层的端到端行为（不含渲染，渲染在 T04 接入）。
 */
describe('CommandInvoker / 命令层', () => {
  it('未知命令报 unknown command: foo', () => {
    const harness = new EditorHarness();
    expect(harness.error('foo')).toBe('unknown command: foo');
  });

  it('未建立文档时执行编辑命令报 E-12', () => {
    const harness = new EditorHarness();
    expect(harness.error('create', 'rect', 'r1', '0', '0', '1', '1')).toBe(
      "no document. use 'init' or 'read' first",
    );
  });

  it('init 建文档并回显 canvas 800x600 created', () => {
    const harness = new EditorHarness();
    expect(harness.run('init', '800', '600')).toEqual(['canvas 800x600 created']);
    expect(harness.run('init')).toEqual(['canvas 800x600 created']);
  });

  it('create 回显与 in 子句', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    expect(harness.run('create', 'rect', 'bg', '0', '0', '800', '600', '#ffffff')).toEqual([
      'rect#bg created',
    ]);
    expect(harness.run('create', 'g', 'node1')).toEqual(['g#node1 created']);
    expect(
      harness.run('create', 'rect', 'start', '120', '100', '160', '60', '#4a90d9', 'in', 'node1'),
    ).toEqual(['rect#start created in g#node1']);
  });

  it('未注册类型报 E-05 逐字错误（内核不含 box）', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    expect(harness.error('create', 'box', 'n1', '120', '100', '160', '60', '开始')).toBe(
      'unknown shape type: box (is the plugin loaded?)',
    );
    expect(harness.session.document?.elementCount()).toBe(0);
  });

  it('id 重复报 E-01；目标不存在报 E-02', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'rect', 'r1', '0', '0', '1', '1');
    expect(harness.error('create', 'rect', 'r1', '0', '0', '1', '1')).toBe('id already exists: r1');
    expect(harness.error('delete', 'r9')).toBe('no such shape: r9');
  });

  it('id 大小写敏感', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'rect', 'r1', '0', '0', '1', '1');
    expect(harness.run('create', 'rect', 'R1', '0', '0', '1', '1')).toEqual(['rect#R1 created']);
  });

  it('in 目标不存在 / 不是容器分别报 E-03 / E-04', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'rect', 'start', '0', '0', '1', '1');
    expect(harness.error('create', 'rect', 'x', '0', '0', '1', '1', 'in', 'node9')).toBe(
      'no such container: node9',
    );
    expect(harness.error('create', 'rect', 'x', '0', '0', '1', '1', 'in', 'start')).toBe(
      'not a container: start',
    );
  });

  it('参数不足报 usage 错误', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    expect(harness.error('create', 'rect', 'r1', '0', '0')).toBe(
      'usage: create <type> <id> [params…] [in <containerId>]',
    );
    expect(harness.error('move', 'r1')).toBe('usage: move <id> <dx> <dy>');
  });

  it('move / undo / redo 回显逐字一致', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'circle', 'c1', '100', '100', '20', 'red');
    expect(harness.run('move', 'c1', '30', '0')).toEqual(['circle#c1 moved to (130,100)']);
    expect(harness.run('undo')).toEqual(['circle#c1 moved back to (100,100)']);
    expect(harness.run('redo')).toEqual(['circle#c1 moved to (130,100)']);
  });

  it('容器 move 用增量措辞，undo 用负增量', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'g', 'node2');
    harness.run('create', 'rect', 'r1', '0', '0', '1', '1', 'in', 'node2');
    expect(harness.run('move', 'node2', '0', '100')).toEqual(['g#node2 moved by (0,100)']);
    expect(harness.run('undo')).toEqual(['g#node2 moved back by (0,-100)']);
  });

  it('set 回显与 undo 回显', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'text', 'title', '20', '40', 'My Diagram');
    expect(harness.run('set', 'title', 'text', 'My Diagram v2')).toEqual([
      'text#title updated: text="My Diagram v2"',
    ]);
    expect(harness.run('undo')).toEqual(['text#title updated: text="My Diagram"']);
  });

  it('set 白名单外的属性报 E-13', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'rect', 'r1', '0', '0', '1', '1');
    expect(harness.error('set', 'r1', 'opacity', '0.5')).toBe('unknown attribute: opacity');
  });

  it('group 收编并回显；子孙冲突报 E-07', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'circle', 'c1', '100', '100', '20', 'red');
    harness.run('create', 'rect', 'box', '200', '80', '60', '60', '#3366ff');
    expect(harness.run('group', 'markers', 'c1', 'box')).toEqual([
      'g#markers created with 2 children',
    ]);
    expect(harness.error('group', 'bad', 'c1', 'markers')).toBe(
      'cannot group a container into its own descendant: markers',
    );
  });

  it('group 是一个 undo 单元：一次 undo 复原两个成员', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'circle', 'c1', '100', '100', '20', 'red');
    harness.run('create', 'rect', 'box', '200', '80', '60', '60');
    harness.run('group', 'markers', 'c1', 'box');
    expect(harness.run('undo')).toEqual(['g#markers removed, 2 children restored']);
    const document = harness.session.requireDocument();
    expect(document.findById('markers')).toBeUndefined();
    expect(document.findById('c1')?.parent).toBe(document);
    expect(document.findById('box')?.parent).toBe(document);
  });

  it('delete 与其 undo 回显', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'circle', 'c1', '100', '100', '20', 'red');
    harness.run('create', 'rect', 'box', '200', '80', '60', '60');
    harness.run('group', 'markers', 'c1', 'box');
    expect(harness.run('delete', 'box')).toEqual(['rect#box deleted']);
    expect(harness.run('undo')).toEqual(['rect#box restored into g#markers']);
  });

  it('scale 回显与 undo；factor 非正报 E-09', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'circle', 'c1', '100', '100', '20', 'red');
    expect(harness.run('scale', 'c1', '2')).toEqual(['circle#c1 scaled by 2']);
    expect(harness.run('undo')).toEqual(['circle#c1 scaled back by 0.5']);
    expect(harness.error('scale', 'c1', '0')).toBe('scale factor must be positive');
  });

  it('ungroup 提升子图形并占据原位置；根级容器报 E-08', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'g', 'outer');
    harness.run('create', 'g', 'inner', 'in', 'outer');
    harness.run('create', 'rect', 'r1', '0', '0', '1', '1', 'in', 'inner');
    expect(harness.run('ungroup', 'inner')).toEqual(['g#inner ungrouped']);
    expect(harness.run('undo')).toEqual(['g#inner regrouped with 1 children']);
    expect(harness.error('ungroup', 'outer')).toBe('cannot ungroup top-level container: outer');
  });

  it('addto 把图形移入容器；front/back 调整 z-order', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'g', 'g1');
    harness.run('create', 'rect', 'r1', '0', '0', '1', '1');
    expect(harness.run('addto', 'g1', 'r1')).toEqual(['rect#r1 added to g#g1']);
    expect(harness.run('front', 'r1')).toEqual(['rect#r1 moved to front']);
    expect(harness.run('back', 'r1')).toEqual(['rect#r1 moved to back']);
    expect(harness.run('undo')).toEqual(['rect#r1 restored to original position']);
  });

  it('IO 命令后 undo/redo 被禁止，直到下一次编辑命令', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    expect(harness.error('undo')).toBe('undo not allowed after io command');
    harness.run('create', 'rect', 'r1', '0', '0', '1', '1');
    expect(harness.run('undo')).toEqual(['rect#r1 deleted']);
    harness.run('canvas', '400', '300');
    expect(harness.error('undo')).toBe('undo not allowed after io command');
    expect(harness.error('redo')).toBe('undo not allowed after io command');
    harness.run('create', 'rect', 'r2', '0', '0', '1', '1');
    expect(harness.run('undo')).toEqual(['rect#r2 deleted']);
  });

  it('undo 之后再做新编辑会清空 redo 栈', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'rect', 'r1', '0', '0', '1', '1');
    harness.run('undo');
    harness.run('create', 'rect', 'r2', '0', '0', '1', '1');
    expect(harness.error('redo')).toBe('nothing to redo');
  });

  it('canvas 无参是显示类（不锁），带参是文档类（锁）', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'rect', 'r1', '0', '0', '1', '1');
    expect(harness.run('canvas')).toEqual(['canvas 800x600']);
    expect(harness.run('undo')).toEqual(['rect#r1 deleted']);
    expect(harness.run('canvas', '400', '300')).toEqual(['canvas 400x300 updated']);
    expect(harness.error('undo')).toBe('undo not allowed after io command');
  });

  it('失败的命令不改变任何状态（原子性）', () => {
    const harness = new EditorHarness();
    harness.run('init', '800', '600');
    harness.run('create', 'circle', 'c1', '100', '100', '20', 'red');
    const before = harness.session.requireDocument().elementCount();
    const structureBefore = harness.structure();
    harness.error('create', 'box', 'n1', '1', '2', '3', '4');
    harness.error('create', 'rect', 'c1', '0', '0', '1', '1');
    harness.error('move', 'nope', '1', '2');
    harness.error('group', 'g1', 'c1', 'c1');
    harness.error('set', 'c1', 'opacity', '0.5');
    expect(harness.session.requireDocument().elementCount()).toBe(before);
    expect(harness.structure()).toBe(structureBefore);
  });
});
