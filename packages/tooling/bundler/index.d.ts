import { type Plugin, type UserConfig } from "vite-plus";

export declare const browserTargets: string[];

export declare function buildId(now?: Date): string;

export declare const minifyCardTemplates: (options?: { include?: RegExp }) => Plugin;

export declare function createCardConfig(options: {
  entry: string;
  name: string;
  outDir?: string;
  port?: number;
}): UserConfig;
