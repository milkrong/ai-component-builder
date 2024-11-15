import { esbuildService } from './esbuild-service';

interface BuildResult {
  code: string;
  error?: string;
}

export class ComponentBuilder {
  static async buildComponent(sourceCode: string): Promise<BuildResult> {
    try {
      const builtCode = await esbuildService.build(sourceCode);

      return {
        code: builtCode,
      };
    } catch (error) {
      console.error('Build error:', error);
      return {
        code: '',
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
