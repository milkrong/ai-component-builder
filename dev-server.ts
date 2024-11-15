import { serve } from 'bun';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = import.meta.dir;

// 文件扫描类型定义
interface FileScanner {
  dirPath: string;
  pattern: RegExp;
}

// 处理结果类型定义
interface ProcessResult {
  success: boolean;
  data?: string | Uint8Array;
  error?: string;
  contentType: string;
}

// 获取所有匹配的文件
const getAllFiles = (
  dirPath: string,
  arrayOfFiles: string[] = [],
  pattern: RegExp
): string[] => {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles, pattern);
    } else if (pattern.test(file)) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
};

// 获取所有源文件的内容
const getAllSourceContent = () => {
  const sourceFiles = getAllFiles(
    `${PROJECT_ROOT}/src`,
    [],
    /\.(jsx?|tsx?|html)$/
  );
  console.log('Scanning source files:', sourceFiles); // 调试日志
  return sourceFiles.map((file) => fs.readFileSync(file, 'utf-8')).join('\n');
};

// CSS处理
const processCss = async (css: string, from: string): Promise<string> => {
  try {
    // 获取所有源文件内容，让Tailwind能够看到所有使用的类
    const sourceContent = getAllSourceContent();
    const tempFile = `${PROJECT_ROOT}/tmp-content.txt`;

    // 创建一个虚拟的内容文件
    fs.writeFileSync(tempFile, sourceContent);
    console.log('Created temp file for Tailwind scanning'); // 调试日志

    const result = await postcss([
      tailwindcss({
        content: [tempFile, './public/**/*.html'],
      }),
      autoprefixer,
    ]).process(css, {
      from,
    });

    // 清理临时文件
    fs.unlinkSync(tempFile);
    console.log('Processed CSS with Tailwind'); // 调试日志

    return result.css;
  } catch (error) {
    console.error('CSS processing error:', error);
    throw error;
  }
};

// 文件处理器
const handleFile = async (filePath: string): Promise<ProcessResult> => {
  try {
    // HTML处理
    if (filePath.endsWith('.html')) {
      const file = await Bun.file(`${PROJECT_ROOT}/public${filePath}`).text();
      return {
        success: true,
        data: file,
        contentType: 'text/html',
      };
    }

    // CSS处理
    if (filePath.endsWith('.css')) {
      const normalizedPath = filePath.replace(/^\/src\//, '/');
      const cssPath = `${PROJECT_ROOT}/src${normalizedPath}`;
      console.log('Processing CSS file:', cssPath);

      const cssFile = await Bun.file(cssPath).text();
      const processedCss = await processCss(cssFile, cssPath);
      return {
        success: true,
        data: processedCss,
        contentType: 'text/css',
      };
    }

    // TypeScript/React处理
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      console.log('Building TypeScript file:', filePath);
      const result = await Bun.build({
        entrypoints: [`${PROJECT_ROOT}${filePath}`],
        outdir: './dist',
        target: 'browser',
        plugins: [
          {
            name: 'css-loader',
            setup(build) {
              // CSS文件解析
              build.onResolve({ filter: /\.css$/ }, (args) => {
                const resolvedPath = path.resolve(
                  path.dirname(args.importer),
                  args.path
                );
                return { path: resolvedPath };
              });

              // CSS文件加载
              build.onLoad({ filter: /\.css$/ }, async (args) => {
                const css = await Bun.file(args.path).text();
                const processedCss = await processCss(css, args.path);

                const contents = `
                  const style = document.createElement('style');
                  style.textContent = ${JSON.stringify(processedCss)};
                  document.head.appendChild(style);
                `;

                return {
                  contents,
                  loader: 'js',
                };
              });

              // TypeScript文件加载
              build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
                const contents = await Bun.file(args.path).text();
                return {
                  contents,
                  loader: 'tsx',
                };
              });
            },
          },
        ],
      });

      if (!result.outputs.length) {
        throw new Error('Build produced no outputs');
      }

      return {
        success: true,
        data: result.outputs[0],
        contentType: 'application/javascript',
      };
    }

    return {
      success: false,
      error: 'Unsupported file type',
      contentType: 'text/plain',
    };
  } catch (error) {
    console.error('File handling error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      contentType: 'text/plain',
    };
  }
};

// 开发服务器
const server = serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let filePath = url.pathname;

    console.log('Incoming request:', filePath);

    // 处理根路径
    if (filePath === '/') {
      filePath = '/index.html';
    }

    try {
      const result = await handleFile(filePath);

      if (!result.success) {
        return new Response(result.error, { status: 404 });
      }

      return new Response(result.data, {
        headers: {
          'Content-Type': result.contentType,
        },
      });
    } catch (error) {
      console.error('Server error:', error);
      return new Response(
        `Server Error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        { status: 500 }
      );
    }
  },
});

console.log(`Development server running at http://localhost:${server.port}`);
