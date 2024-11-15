import type { RenderMessage, RenderResult } from '../types';

interface IframeOptions {
  width?: string;
  height?: string;
  styles?: Record<string, string>;
}

export class IframeManager {
  private iframe: HTMLIFrameElement;
  private iframeLoaded: Promise<void>;
  private iframeLoadedResolver!: () => void;

  constructor(container: HTMLElement, options: IframeOptions = {}) {
    this.iframe = document.createElement('iframe');

    // 设置默认样式
    const defaultStyles = {
      width: options.width || '100%',
      height: options.height || '400px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      ...options.styles,
    };

    Object.assign(this.iframe.style, defaultStyles);
    container.appendChild(this.iframe);

    // 创建iframe加载完成的Promise
    this.iframeLoaded = new Promise((resolve) => {
      this.iframeLoadedResolver = resolve;
    });

    // 初始化iframe内容
    this.initializeContent();
  }

  private initializeContent() {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <style>
            body { margin: 0; font-family: sans-serif; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script>
            let reactRoot = null;

            // 监听来自主应用的消息
            window.addEventListener('message', async (event) => {
              const message = event.data;
              
              if (message.type === 'RENDER_COMPONENT') {
                try {
                  const root = document.getElementById('root');
                  
                  // 清理之前的渲染
                  if (reactRoot) {
                    reactRoot.unmount();
                  }

                  // 清除之前的组件
                  window.UserComponent = undefined;

                  // 执行构建后的代码，代码中会设置 window.UserComponent
                  new Function('React', 'ReactDOM', message.code)(
                    React,
                    ReactDOM
                  );

                  if (typeof window.UserComponent !== 'function') {
                    throw new Error('Component is not a valid React component');
                  }
                  
                  // 创建新的React根实例并渲染
                  reactRoot = ReactDOM.createRoot(root);
                  reactRoot.render(
                    React.createElement(window.UserComponent, message.props)
                  );

                  // 发送成功消息
                  window.parent.postMessage({
                    type: 'RENDER_RESULT',
                    success: true
                  }, '*');
                } catch (error) {
                  console.error('Render error:', error);
                  // 发送错误消息
                  window.parent.postMessage({
                    type: 'RENDER_RESULT',
                    success: false,
                    error: error.message
                  }, '*');
                }
              }
            });

            // 通知主应用iframe已准备就绪
            window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
          </script>
        </body>
      </html>
    `;

    this.iframe.srcdoc = html;

    // 等待iframe加载完成
    this.iframe.onload = () => {
      this.iframeLoadedResolver();
    };
  }

  async renderComponent(
    code: string,
    props: Record<string, any> = {}
  ): Promise<RenderResult> {
    // 等待iframe加载完成
    await this.iframeLoaded;

    if (!this.iframe.contentWindow) {
      return {
        type: 'RENDER_RESULT',
        success: false,
        error: 'IFrame not initialized',
      };
    }

    return new Promise((resolve) => {
      // 设置一次性消息监听器
      const messageHandler = (event: MessageEvent) => {
        if (event.source !== this.iframe.contentWindow) return;

        const message = event.data as RenderResult;
        if (message.type === 'RENDER_RESULT') {
          window.removeEventListener('message', messageHandler);
          resolve(message);
        }
      };

      window.addEventListener('message', messageHandler);

      // 发送渲染消息
      const message: RenderMessage = {
        type: 'RENDER_COMPONENT',
        code,
        props,
      };

      this.iframe.contentWindow?.postMessage(message, '*');
    });
  }

  destroy() {
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
  }
}
