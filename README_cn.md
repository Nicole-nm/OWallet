[English Version](./README.md)



<h1 align="center">OWallet - 本体综合性桌面版钱包</h1>
<h4 align="center">Version 0.11.0</h4>

## 总体介绍

OWallet 是本体综合性桌面版钱包，支持标准的钱包管理、基于多重签名技术的共享钱包管理，同时支持连接 Ledger 硬件钱包。

支持 Windows/MacOS/Linux，下载请到[这里](https://github.com/ontio/OWallet/releases)，也欢迎加入我们的[技术讨论社区](https://discord.gg/4TQujHj)!

OWallet 核心功能如下：

* 创建钱包/导入钱包（支持使用 Keystore、助记词、WIF 私钥、明文私钥）
* 支持共享钱包（基于多重签名技术）
* 支持硬件钱包 Ledger
* 查看余额和交易明细
* 发送 ONG 和 ONT
* 提取 ONG
* 节点质押和质押授权管理
* 支持 ONT ID 功能

![](images/OWallet.jpg)

### 系统要求

* macOS 10.15+
* Windows 10+
* Linux（glibc ≥ 2.28）

## 如何开始

1. 克隆 repo

```bash
git clone https://github.com/ontio/OWallet.git
```

2. 安装依赖

```bash
yarn install
```

3. 开发模式运行

```bash
yarn dev
```

4. 打包（全平台）

```bash
yarn build
```

单平台打包：

```bash
yarn build:mac    # macOS (x64 + arm64)
yarn build:win    # Windows (x64)
yarn build:linux  # Linux (deb + AppImage)
```

常用校验命令：

```bash
yarn lint
yarn check:boundaries
yarn test:unit
yarn electron-vite build
```


## 安装发布的客户端

请到 [Releases](https://github.com/ontio/OWallet/releases) 下载适合您操作系统的最新版本客户端。

## keystore.db 文件的默认保存路径

在不同系统上指向如下位置：

* `%APPDATA%`（Windows）
* `$XDG_CONFIG_HOME` 或 `~/.config`（Linux）
* `~/Library/Application Support`（macOS）
