import { createInterface, Interface } from 'node:readline';
import { InputSource } from './InputSource.js';

/**
 * 基于 readline 的标准输入源。
 *
 * 它把 stdin 的行事件包装成"逐行 await"的接口：
 * 已到达的行先入队，没有行时挂起等待，EOF 时返回 null。
 */
export class ReadlineInputSource implements InputSource {
  private readonly reader: Interface;
  private readonly queue: string[] = [];
  private pending: ((line: string | null) => void) | null = null;
  private ended = false;

  constructor(input: NodeJS.ReadableStream = process.stdin) {
    this.reader = createInterface({ input, terminal: false });
    this.reader.on('line', (line: string) => {
      if (this.pending !== null) {
        const resolve = this.pending;
        this.pending = null;
        resolve(line);
        return;
      }
      this.queue.push(line);
    });
    this.reader.on('close', () => {
      this.ended = true;
      if (this.pending !== null) {
        const resolve = this.pending;
        this.pending = null;
        resolve(null);
      }
    });
  }

  /** 读入一行；EOF 返回 null。 */
  readLine(): Promise<string | null> {
    const queued = this.queue.shift();
    if (queued !== undefined) {
      return Promise.resolve(queued);
    }
    if (this.ended) {
      return Promise.resolve(null);
    }
    return new Promise<string | null>((resolve) => {
      this.pending = resolve;
    });
  }

  /** 关闭输入源。 */
  close(): void {
    this.reader.close();
  }
}
