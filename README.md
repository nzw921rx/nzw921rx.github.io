# 牛志伟的博客

使用 Hugo 和 PaperMod 构建，发布在 [nzw921rx.github.io](https://nzw921rx.github.io/)。

## 本地启动

准备 Git 和 Hugo。本仓库已用 Hugo `v0.170.1` 验证。macOS 可以用 Homebrew 安装，其他系统见 [Hugo 安装说明](https://gohugo.io/installation/)。

```sh
brew install hugo
hugo version
```

首次克隆时一起拉取 PaperMod 主题，在仓库根目录启动预览。

```sh
git clone --recurse-submodules https://github.com/nzw921rx/nzw921rx.github.io.git
cd nzw921rx.github.io
hugo server -D --renderToMemory
```

打开 [本地首页](http://localhost:1313/)。`-D` 会显示草稿，`--renderToMemory` 把预览产物放在内存里。编辑 Markdown、模板或 CSS 并保存后，浏览器会自动刷新。按 `Ctrl+C` 停止服务。

## 写文章

另开一个终端，在仓库根目录创建草稿。

```sh
hugo new content posts/jvm-object-allocation.md
```

编辑 `content/posts/jvm-object-allocation.md`，在文件开头填写标题，在第二个 `+++` 下方写正文。可以直接打开[这篇草稿的本地预览](http://localhost:1313/posts/jvm-object-allocation/)，也可以在首页右栏找到它。准备发布时，把文件开头的 `draft = true` 改成 `draft = false`。发布后的文章会自动出现在右侧「最近文章」和 [RSS 订阅源](https://nzw921rx.github.io/index.xml)。

| 想修改的内容 | 对应文件 |
| --- | --- |
| 首页个人简介 | [content/_index.md](content/_index.md) |
| 关于我 | [content/about.md](content/about.md) |
| 右栏推荐链接 | [layouts/partials/reading-sidebar.html](layouts/partials/reading-sidebar.html) |
| 页面样式 | [assets/css/extended/](assets/css/extended/) |

## 本地调试

- **缺少 PaperMod 主题**。在已有仓库里运行 `git submodule update --init --recursive`，然后重启 Hugo。
- **模板或样式修改后显示异常**。先停止预览，再运行下面的命令。Hugo 会在每次修改后完整渲染，并在终端打印调试日志。

```sh
hugo server -D --renderToMemory --disableFastRender --logLevel debug
```

## 构建与发布

推送前可以在本地运行与 GitHub Actions 相同的构建命令。

```sh
hugo --minify
```

静态站点生成在 `public/`。把文章或模板的源文件提交并推送到 `main` 后，GitHub Actions 会自动构建并部署。发布进度见 [Actions](https://github.com/nzw921rx/nzw921rx.github.io/actions/workflows/static.yml)。
