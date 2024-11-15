import { IframeManager } from './iframe-manager';
import { ComponentBuilder } from '../builder/component-builder';

interface RenderResult {
  success: boolean;
  error?: string;
}

export class ComponentRenderer {
  private iframeManager: IframeManager | null = null;

  constructor(container: HTMLElement, options = {}) {
    this.iframeManager = new IframeManager(container, options);
  }

  async render(
    sourceCode: string,
    props: Record<string, any> = {}
  ): Promise<RenderResult> {
    try {
      const buildResult = await ComponentBuilder.buildComponent(sourceCode);

      if (buildResult.error) {
        return {
          success: false,
          error: buildResult.error,
        };
      }

      if (!this.iframeManager) {
        return {
          success: false,
          error: 'Renderer not initialized',
        };
      }

      const renderResult = await this.iframeManager.renderComponent(
        buildResult.code,
        props
      );
      return renderResult;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to render component',
      };
    }
  }

  destroy() {
    this.iframeManager?.destroy();
    this.iframeManager = null;
  }
}
