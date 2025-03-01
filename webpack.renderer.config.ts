import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins,
  resolve: {
    plugins:[new TsconfigPathsPlugin({
      configFile: './tsconfig.json'
    })],
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};
