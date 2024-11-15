import { BunPlugin, Loader } from 'bun';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const postcssPlugin: BunPlugin = {
  name: 'postcss',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = await Bun.file(args.path).text();

      const result = await postcss([tailwindcss, autoprefixer]).process(css, {
        from: args.path,
      });

      return {
        loader: 'css' as Loader,
        contents: result.css,
      };
    });
  },
};

export default {
  entry: './src/index.tsx',
  outdir: './dist',
  plugins: [postcssPlugin],
};
