/**
 * 命令类别的枚举。命令的类别差异由类层次（EditCommand / DocumentCommand /
 * DisplayCommand）承担，本类型只用于描述与展示。
 */
export type CommandCategory = 'edit' | 'document' | 'display' | 'meta';

/**
 * 命令的纯数据描述。
 *
 * 它是 `help` 渲染与 `usage:` 错误文案的数据来源，
 * **不依赖任何命令实现类**，因此 view 层无需依赖 command 层。
 */
export class CommandDescriptor {
  /**
   * @param name 命令名（分派键）
   * @param usage 参数错误文案里使用的 usage 串（如 `create <type> <id> [params…] [in <containerId>]`）
   * @param summary 一句话说明
   * @param category 命令类别
   * @param helpUsage help 列表里展示的用法片段（与 usage 不同：help 用 ASCII 省略号）
   * @param helpLine help 列表里所在的行号（同行片段用 ` / ` 连接）
   * @param helpSummary help 列表里展示的说明；不给则该行不显示说明
   */
  constructor(
    readonly name: string,
    readonly usage: string,
    readonly summary: string,
    readonly category: CommandCategory,
    readonly helpUsage: string = usage,
    readonly helpLine: number = 0,
    readonly helpSummary?: string,
  ) {}
}
