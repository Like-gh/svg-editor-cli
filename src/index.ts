import { Application } from './cli/Application.js';

/**
 * 进程入口：装配应用并启动 REPL。
 *
 * 启动方式：`npm run cli`（= `tsx src/index.ts`）。
 */
const application = Application.create();
await application.run();
