import { Command } from './Command.js';

/**
 * 显示类命令基类：不产生 undo 单元、不加锁也不解锁（R-42）。
 *
 * `tree` / `show` / `help` 都不改变文档状态，因此对历史栈完全无副作用。
 */
export abstract class DisplayCommand extends Command {}
