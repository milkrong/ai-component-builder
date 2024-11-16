import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.join(import.meta.dir, '../..');

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

export const htmlHandler = {
  async GET(req: Request) {
    try {
      const filePath = new URL(req.url).pathname;
      const file = await Bun.file(`${PROJECT_ROOT}/public${filePath}`).text();
      console.log('Serving HTML file:', filePath);
      return {
        success: true,
        data: file,
        contentType: 'text/html',
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'File not found',
        contentType: 'text/plain',
      };
    }
  },
};

export const cssHandler = {
  async GET(req: Request) {
    try {
      const filePath = new URL(req.url).pathname;
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
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'File not found',
        contentType: 'text/plain',
      };
    }
  },
};

export const tsOrTsxHandler = {
  async GET(req: Request) {
    const filePath = new URL(req.url).pathname;
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

    console.log(result, 'result');
    if (!result.outputs.length) {
      return {
        success: false,
        error: 'Build produced no outputs',
        contentType: 'text/plain',
      };
    }
    const code = await result.outputs[0].text();
    return {
      success: true,
      data: code,
      contentType: 'application/javascript',
    };
  },
};
