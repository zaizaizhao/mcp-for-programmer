const { rollup } = require('rollup');
const typescript = require('@rollup/plugin-typescript');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const { dts } = require('rollup-plugin-dts');
const path = require('path');
const fs = require('fs');

// 获取所有包的路径
const packagesDir = path.join(__dirname, '../packages');
const packagesDirs = fs.readdirSync(packagesDir).filter(dir => {
  return fs.statSync(path.join(packagesDir, dir)).isDirectory();
});

// 主函数
async function build() {
  console.log('🚀 开始构建所有包...');
  
  for (const pkg of packagesDirs) {
    const pkgPath = path.join(packagesDir, pkg);
    const pkgJsonPath = path.join(pkgPath, 'package.json');
    
    // 检查包是否存在package.json
    if (!fs.existsSync(pkgJsonPath)) {
      continue;
    }
    
    // 读取包的package.json
    const pkgJson = require(pkgJsonPath);
    
    // 获取入口文件
    const entry = path.join(pkgPath, 'src/index.ts');
    
    // 检查入口文件是否存在
    if (!fs.existsSync(entry)) {
      console.warn(`警告: 入口文件 ${entry} 不存在，跳过包 ${pkg}`);
      continue;
    }
    
    console.log(`📦 开始构建包: ${pkg}`);
    
    // 确保输出目录存在
    const distDir = path.join(pkgPath, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    try {
      // 构建JS包
      const jsBundle = await rollup({
        input: entry,
        plugins: [
          resolve({
            preferBuiltins: true,
          }),
          commonjs(),
          json(),
          typescript({
            tsconfig: path.join(pkgPath, 'tsconfig.json'),
            outputToFilesystem: true,
            moduleResolution: "node",
            module: "ESNext",
            tslib: require.resolve('tslib'),
          }),
        ],
        external: [
          ...Object.keys(pkgJson.dependencies || {}),
          ...Object.keys(pkgJson.peerDependencies || {}),
        ],
        onwarn(warning, warn) {
          // 忽略某些警告
          if (warning.code === 'THIS_IS_UNDEFINED') return;
          warn(warning);
        },
      });
      
      // 输出CommonJS版本
      await jsBundle.write({
        file: path.join(pkgPath, pkgJson.main || 'dist/index.js'),
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      });
      
      // 输出ES模块版本
      await jsBundle.write({
        file: path.join(pkgPath, pkgJson.module || 'dist/index.esm.js'),
        format: 'esm',
        sourcemap: true,
      });
      
      // 关闭bundle
      await jsBundle.close();
      
      // 构建类型声明文件
      const dtsBundle = await rollup({
        input: entry,
        plugins: [
          dts({
            tsconfig: path.join(pkgPath, 'tsconfig.json'),
          }),
        ],
        external: [
          ...Object.keys(pkgJson.dependencies || {}),
          ...Object.keys(pkgJson.peerDependencies || {}),
        ],
      });
      
      // 输出类型声明文件
      await dtsBundle.write({
        file: path.join(pkgPath, 'dist/index.d.ts'),
        format: 'es',
      });
      
      // 关闭bundle
      await dtsBundle.close();
      
      console.log(`✅ 包 ${pkg} 构建成功`);
    } catch (error) {
      console.error(`❌ 构建包 ${pkg} 失败:`, error);
    }
  }
  
  console.log('🎉 所有包构建完成!');
}

// 执行构建
build().catch(err => {
  console.error('构建过程中发生错误:', err);
  process.exit(1);
});
