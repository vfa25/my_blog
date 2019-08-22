/**
 * 压缩../docs文件夹下的全量图片
 */
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const config = {
  entry: path.join(__dirname, "./img_compress.js"),
  output: {
    path: path.join(__dirname, '../docs/.imgs'),
  },
  module: {
    rules: [{
      test: /\.(gif|png|jpe?g|svg)$/i,
      use: [
        {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]'
          }
        },
        {
          loader: 'image-webpack-loader',
          options: {
            mozjpeg: {
              progressive: true,
              quality: 65
            },
            // optipng.enabled: false will disable optipng
            optipng: {
              enabled: false,
            },
            pngquant: {
              quality: '65-90',
              speed: 4
            },
            gifsicle: {
              interlaced: false,
            },
            // 暂不考虑webp格式
            // webp: {
            //   quality: 75
            // }
          }
        },
      ],
    }]
  },
  plugins:[
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [path.join(__dirname,'../docs/.imgs')]
    })
  ]
};
module.exports = config;
