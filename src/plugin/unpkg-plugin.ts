import { Plugin } from 'esbuild-wasm';
import { Package } from '../types';

// 从unpkg加载包
async function fetchPackage(pkg: string, path: string = ''): Promise<string> {
  const cacheKey = `${pkg}/${path}`;
  if (packageCache.has(cacheKey)) {
    return packageCache.get(cacheKey)!;
  }

  const url = `https://unpkg.com/${pkg}${path ? '/' + path : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch package: ${url}`);
  }

  const content = await response.text();
  packageCache.set(cacheKey, content);
  return content;
}

// 用于缓存已加载的包
const packageCache = new Map<string, string>();

// 解析包信息
function parsePackageName(importPath: string): Package {
  // 处理相对路径导入
  if (importPath.startsWith('.')) {
    return { package: importPath };
  }

  // 处理范围包 (@org/package)
  const scopedMatch = importPath.match(/^(@[^/]+\/[^/@]+)(?:\/(.+))?$/);
  if (scopedMatch) {
    return {
      package: scopedMatch[1],
      path: scopedMatch[2],
    };
  }

  // 处理普通包
  const parts = importPath.split('/');
  let pkg = parts[0];
  if (importPath.startsWith('@')) {
    pkg = `${parts[0]}/${parts[1]}`;
  }

  return {
    package: pkg,
    path: parts.slice(pkg.split('/').length).join('/'),
  };
}

export function createUnpkgPlugin(inputCode: string): Plugin {
  return {
    name: 'unpkg-loader',
    setup(build) {
      // 处理入口文件
      build.onResolve({ filter: /^input\.jsx$/ }, () => ({
        path: 'input.jsx',
        namespace: 'entry',
      }));

      // 处理相对路径导入
      build.onResolve({ filter: /^\.+\// }, (args) => ({
        namespace: 'local',
        path: new URL(args.path, 'file:///' + args.importer).pathname,
      }));

      // 处理包导入
      build.onResolve({ filter: /.*/ }, async (args) => {
        if (args.namespace === 'entry') {
          return { path: args.path, namespace: 'entry' };
        }

        const pkg = parsePackageName(args.path);
        return {
          path: args.path,
          namespace: 'unpkg',
          pluginData: pkg,
        };
      });

      // 加载入口文件
      build.onLoad({ filter: /.*/, namespace: 'entry' }, () => ({
        contents: inputCode,
        loader: 'jsx',
      }));

      // 从unpkg加载依赖
      build.onLoad({ filter: /.*/, namespace: 'unpkg' }, async (args) => {
        const pkg = args.pluginData as Package;
        const content = await fetchPackage(pkg.package, pkg.path);

        return {
          contents: content,
          loader: args.path.endsWith('.css') ? 'css' : 'jsx',
        };
      });
    },
  };
}
