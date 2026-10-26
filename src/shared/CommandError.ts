/**
 * 用户可见的错误类型。
 *
 * 消息本身**不含** `error: ` 前缀 —— 前缀只在 CLI 层加一次，
 * 避免出现 `error: error: …` 这种双前缀。
 */
export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandError';
  }
}
