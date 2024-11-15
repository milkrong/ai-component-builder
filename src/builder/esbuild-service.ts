import * as esbuild from 'esbuild-wasm';

class EsbuildService {
  private static instance: EsbuildService;
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): EsbuildService {
    if (!EsbuildService.instance) {
      EsbuildService.instance = new EsbuildService();
    }
    return EsbuildService.instance;
  }

  async initialize() {
    if (!this.initialized) {
      try {
        await esbuild.initialize({
          wasmURL: 'https://unpkg.com/esbuild-wasm@0.19.12/esbuild.wasm',
          worker: true,
        });
        this.initialized = true;
      } catch (error) {
        console.error('Failed to initialize esbuild:', error);
        throw error;
      }
    }
  }

  async build(code: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const virtualFs = new Map();
      // 包装用户代码，使其成为一个返回组件的IIF
      const wrappedCode = `
      ${code}
      if (typeof Component !== 'function') {
        throw new Error('No Component found in the code');
      }
      window.UserComponent = Component;
    `;

      virtualFs.set('input.jsx', wrappedCode);

      const result = await esbuild.build({
        entryPoints: ['input.jsx'],
        bundle: true,
        write: false,
        format: 'iife',
        target: ['es2020'],
        jsx: 'transform',
        plugins: [
          {
            name: 'virtual-fs',
            setup(build) {
              // 处理入口文件
              build.onResolve({ filter: /^input\.jsx$/ }, (args) => ({
                path: args.path,
                namespace: 'virtual-fs',
              }));

              // 处理React导入
              build.onResolve({ filter: /^react(-dom)?$/ }, (args) => ({
                path: args.path,
                namespace: 'external-react',
              }));

              // 加载虚拟文件
              build.onLoad(
                { filter: /.*/, namespace: 'virtual-fs' },
                (args) => ({
                  contents: virtualFs.get(args.path),
                  loader: 'jsx',
                })
              );

              // 加载React
              build.onLoad(
                { filter: /.*/, namespace: 'external-react' },
                (args) => {
                  if (args.path === 'react') {
                    return {
                      contents: `
                      export default window.React;
                      export const useState = window.React.useState;
                    `,
                      loader: 'js',
                    };
                  } else if (args.path === 'react-dom') {
                    return {
                      contents: 'export default window.ReactDOM;',
                      loader: 'js',
                    };
                  }
                }
              );
            },
          },
        ],
      });

      return result.outputFiles[0].text;
    } catch (error) {
      console.error('Build failed:', error);
      throw error;
    }
  }
}

export const esbuildService = EsbuildService.getInstance();
