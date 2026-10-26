import { Group } from '../../src/domain/Group.js';

/**
 * 测试替身：一个"复合图形"（内部结构由插件拥有）的容器。
 *
 * 本阶段内核不含任何复合图形，E-06 分支**不可达**；
 * 但 PRD E-06 要求"该分支保留但不可达，文案需实现到位以备后续阶段"。
 * 因此用这个替身把分支打开，使文案可以被逐字断言。
 */
export class CompositeGroupStub extends Group {
  /** 复合图形标记：本阶段内核恒为 false，只有本替身为 true。 */
  override isComposite(): boolean {
    return true;
  }
}
