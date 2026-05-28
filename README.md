[中文版](./README_cn.md)



<h1 align="center">OWallet - a comprehensive Ontology desktop wallet</h1>
<h4 align="center">Version 0.11.0</h4>

## Introduction

OWallet is a comprehensive Ontology desktop wallet. OWallet supports standard wallet management, shared wallet management based on multi-signature technology, and connects with Ledger hardware wallets.
Support Windows/MacOS/Linux, get it [here](https://github.com/ontio/OWallet/releases), also welcome to join [our community on Discord](https://discord.gg/4TQujHj).

Core features of OWallet are as follows:

* Create wallet/import wallet using keystore, mnemonic phrase, WIF private key, HEX private key
* Support shared wallet based on multi-signature technology
* Ledger hardware wallet support
* View balance and transaction records
* Send ONG and ONT
* Withdraw (redeem) ONG
* Node stake and stake authorization management
* ONT ID support

![](images/OWallet.jpg)



### System Requirements

* macOS 10.15+
* Windows 10+
* Linux (glibc ≥ 2.28)

## Get Started

1. Clone the repo

```bash
git clone https://github.com/ontio/OWallet.git
```

2. Install packages (**yarn** is recommended)

```bash
yarn install
```

3. Run in development mode

```bash
yarn dev
```

4. Build for all platforms

```bash
yarn build
```

Platform-specific builds:

```bash
yarn build:mac    # macOS (x64 + arm64)
yarn build:win    # Windows (x64)
yarn build:linux  # Linux (deb + AppImage)
```

Validation commands:

```bash
yarn lint
yarn check:boundaries
yarn test:unit
yarn electron-vite build
```

## Install Released App

Please download the latest version compatible with your platform from [Releases](https://github.com/ontio/OWallet/releases).

## Default keystore.db File Path

Default points to:

* `%APPDATA%` on Windows
* `$XDG_CONFIG_HOME` or `~/.config` on Linux
* `~/Library/Application Support` on macOS
