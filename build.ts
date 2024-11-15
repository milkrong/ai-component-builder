import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

async function build() {
  // 处理CSS
  const cssFile = await Bun.file('./src/styles/globals.css').text();
  const result = await postcss([tailwindcss, autoprefixer]).process(cssFile, {
    from: './src/styles/globals.css',
  });

  // 构建JavaScript
  await Bun.build({
    entrypoints: ['./src/index.tsx'],
    outdir: './dist',
    target: 'browser',
    minify: true,
  });

  // 写入处理后的CSS
  await Bun.write('./dist/globals.css', result.css);
}

build().catch(console.error);
