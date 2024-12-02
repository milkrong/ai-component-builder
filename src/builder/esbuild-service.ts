import * as esbuild from 'esbuild-wasm';

class EsbuildService {
  private static instance: EsbuildService;
  private initialized: boolean = false;
  private packageCache: Map<string, string> = new Map();

  private constructor() {}

  static getInstance(): EsbuildService {
    if (!EsbuildService.instance) {
      EsbuildService.instance = new EsbuildService();
    }
    return EsbuildService.instance;
  }

  private async fetchPackage(url: string): Promise<string> {
    const cached = this.packageCache.get(url);
    if (cached) return cached;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch package from ${url}: ${response.statusText}`
      );
    }
    const content = await response.text();
    this.packageCache.set(url, content);
    return content;
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

              // 处理第三方包导入
              build.onResolve({ filter: /^[^./]/ }, (args) => {
                if (args.path.startsWith('react')) {
                  return;
                }
                return {
                  path: `https://unpkg.com/${args.path}`,
                  namespace: 'unpkg-package',
                };
              });

              // 处理第三方包内的相对路径导入
              build.onResolve({ filter: /^\.+\// }, (args) => {
                if (args.namespace === 'unpkg-package') {
                  return {
                    path: new URL(args.path, args.importer).toString(),
                    namespace: 'unpkg-package',
                  };
                }
              });

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

              // 加载第三方包
              build.onLoad(
                { filter: /.*/, namespace: 'unpkg-package' },
                async (args) => {
                  const contents = await EsbuildService.instance.fetchPackage(
                    args.path
                  );
                  return {
                    contents,
                    loader: args.path.endsWith('.css') ? 'css' : 'js',
                  };
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
