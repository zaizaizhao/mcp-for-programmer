const { watch } = require('rollup');
const typescript = require('@rollup/plugin-typescript');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const net = require('net');

// 解析命令行参数
const args = process.argv.slice(2);
const options = {
  transport: 'stdio',
  port: '3322',
  endpoint: '',
  expressPort: '3001'
};

// 简单的命令行参数解析
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--transport' && args[i + 1]) {
    options.transport = args[i + 1];
    i++;
  } else if (args[i] === '--port' && args[i + 1]) {
    options.port = args[i + 1];
    i++;
  } else if (args[i] === '--endpoint' && args[i + 1]) {
    options.endpoint = args[i + 1];
    i++;
  } else if (args[i] === '--express-port' && args[i + 1]) {
    options.expressPort = args[i + 1];
    i++;
  }
}

// 根据传输方式设置默认端点
if (!options.endpoint) {
  if (options.transport === 'sse') {
    options.endpoint = '/sse';
  } else if (options.transport === 'streamable') {
    options.endpoint = '/mcp';
  }
}

// 检查端口是否可用
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', () => {
      resolve(false);
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

// 查找可用端口
async function findAvailablePort(startPort) {
  let port = parseInt(startPort, 10);
  while (!(await isPortAvailable(port))) {
    port++;
    if (port > 65535) {
      throw new Error('无法找到可用端口');
    }
  }
  return port.toString();
}

// 获取所有包的路径
const packagesDir = path.join(__dirname, '../packages');
const packagesDirs = fs.readdirSync(packagesDir).filter(dir => {
  return fs.statSync(path.join(packagesDir, dir)).isDirectory();
});

// 配置监视选项
const watchOptions = [];

// 为每个包创建配置
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
  
  // 为该包创建rollup配置
  const config = {
    input: entry,
    output: [
      {
        file: path.join(pkgPath, pkgJson.main || 'dist/index.js'),
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: path.join(pkgPath, pkgJson.module || 'dist/index.esm.js'),
        format: 'esm',
        sourcemap: true,
      }
    ],
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: path.join(pkgPath, 'tsconfig.json'),
        outputToFilesystem: true,
        declaration: true,
        declarationDir: path.join(pkgPath, 'dist/types'),
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
  };
  
  watchOptions.push({
    ...config,
    watch: {
      clearScreen: false,
      buildDelay: 500,
    }
  });
}

// 服务器进程变量
let serverProcess = null;

// 启动MCP服务器
async function startServer() {
  if (serverProcess) {
    console.log('🔄 重新启动服务器...');
    serverProcess.kill();
  } else {
    console.log('🚀 启动服务器...');
  }
  
  // 查找可用的Express端口
  try {
    options.expressPort = await findAvailablePort(options.expressPort);
  } catch (error) {
    console.error('❌ 无法找到可用端口:', error);
    return;
  }
  
  // 使用ts-node启动服务器
  const serverArgs = [
    'ts-node',
    path.join(packagesDir, 'mcp-for-programmer/src/index.ts'),
    '--transport', options.transport
  ];
  
  // 添加端口和端点参数（如果需要）
  if (options.transport !== 'stdio') {
    serverArgs.push('--port', options.port);
    serverArgs.push('--endpoint', options.endpoint);
  }
  
  console.log(`🔌 启动模式: ${options.transport}${options.transport !== 'stdio' ? ` (端口: ${options.port}, 端点: ${options.endpoint})` : ''}`);
  console.log(`🌐 Express服务器将在端口 ${options.expressPort} 上启动`);
  
  // 启动服务器进程
  serverProcess = spawn('npx', serverArgs, {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      START_EXPRESS: process.env.START_EXPRESS || 'true', // 同时启动Express服务器
      PORT: options.expressPort // 设置Express端口
    }
  });
  
  serverProcess.on('error', (err) => {
    console.error('❌ 服务器启动失败:', err);
  });
  
  serverProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ 服务器异常退出，退出码: ${code}`);
    }
    serverProcess = null;
  });
}

// 启动监视
const watcher = watch(watchOptions);

console.log('🔎 正在监视文件变更...');

// 构建完成后是否已启动服务器的标志
let hasStartedServer = false;

watcher.on('event', event => {
  switch (event.code) {
    case 'START':
      console.log('🔄 开始构建...');
      break;
    case 'BUNDLE_START':
      console.log(`📦 打包 ${event.input} -> ${event.output?.map(o => o.file || o).join(', ') || '未知输出'}`);
      break;
    case 'BUNDLE_END':
      console.log(`✅ 打包完成: ${event.duration}ms`);
      break;
    case 'END':
      console.log('📝 所有打包任务完成');
      // 首次构建完成后启动服务器
      if (!hasStartedServer) {
        startServer();
        hasStartedServer = true;
      }
      break;
    case 'ERROR':
      console.error('❌ 打包错误:', event.error);
      break;
  }
});

// 处理文件变更，重启服务器
const restartServerDebounced = debounce(() => {
  if (hasStartedServer) {
    startServer();
  }
}, 1000);

// 额外监视src目录下的文件变更
const srcWatcher = fs.watch(path.join(packagesDir, 'mcp-for-programmer/src'), { recursive: true }, () => {
  console.log('🔄 检测到源文件变更，准备重启服务器...');
  restartServerDebounced();
});

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// 处理进程终止
process.on('SIGINT', () => {
  console.log('👋 正在关闭...');
  if (serverProcess) {
    serverProcess.kill();
  }
  srcWatcher.close();
  watcher.close();
  process.exit(0);
});
