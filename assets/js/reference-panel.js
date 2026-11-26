const resources = new Map([
    ["https://www.brendangregg.com/blog/", {
        title: "Brendan Gregg’s Blog",
        description: "Brendan Gregg 的系统性能博客，记录性能诊断、火焰图、Linux 工具和一线工程实践。",
        embed: true
    }],
    ["https://shipilev.net/jvm/anatomy-quarks/", {
        title: "JVM Anatomy Quarks",
        description: "Aleksey Shipilëv 的 JVM 短文系列。每篇从一个具体的 Java 程序出发，用实验解释运行时行为。",
        embed: true
    }],
    ["https://github.com/nzw921rx", {
        title: "牛志伟 · GitHub",
        description: "我的 GitHub 账号是 @nzw921rx。主页汇集了公开仓库和开源贡献，可以从这里继续阅读源码。"
    }],
    ["https://github.com/openjdk/jmh", {
        title: "OpenJDK JMH",
        description: "JMH 是面向 JVM 的基准测试工具。仓库提供测试框架源码、示例和运行说明。"
    }],
    ["https://www.vldb.org/pvldb/vol10/p1718-carbone.pdf", {
        title: "State Management in Apache Flink: Consistent Stateful Distributed Stream Processing",
        description: "Paris Carbone 等，PVLDB，2017。论文讨论 Flink 如何协调分布式快照、管理算子状态并在故障后恢复。"
    }],
    ["https://dri.es/files/oopsla07-georges.pdf", {
        title: "Statistically Rigorous Java Performance Evaluation",
        description: "Andy Georges、Dries Buytaert 和 Lieven Eeckhout，OOPSLA 2007。论文讨论如何区分 JVM 运行间与运行内的波动，并报告性能测量的不确定性。"
    }],
    ["https://dl.acm.org/doi/10.1145/2491894.2464160", {
        title: "Rigorous Benchmarking in Reasonable Time",
        description: "Tomas Kalibera 和 Richard Jones，ISMM 2013。论文讨论如何在有限的测量时间内，为不同实验层级分配重复次数。"
    }],
    ["https://arxiv.org/pdf/1802.08496", {
        title: "Benchmarking Distributed Stream Data Processing Systems",
        description: "Jeyhun Karimov 等，ICDE 2018。论文研究分布式流处理系统的基准测试，并讨论吞吐量和延迟的测量。"
    }]
]);

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
}

function address(value, base) {
    const url = new URL(value, base);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
        throw new TypeError("Unsupported reference URL");
    }
    return url;
}

function addSource(panel, url, isFeed) {
    const actions = element("div", "", "source-actions");
    const link = element("a", isFeed ? "打开 RSS 源" : "在新标签页打开原文");
    link.href = url.href;
    link.target = "_blank";
    link.rel = "external noopener noreferrer";
    const copy = element("button", "复制地址");
    copy.type = "button";
    const status = element("span");
    status.setAttribute("role", "status");
    copy.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(url.href);
            status.textContent = "地址已复制";
        } catch {
            status.textContent = "可选中下方地址复制。";
        }
    });
    actions.append(link, copy, status);
    panel.append(actions, element("code", url.href, "source-url"));
}

async function appendFeed(panel, url, siteRoot, signal) {
    let entries;
    try {
        const response = await fetch(url, { signal, mode: "same-origin" });
        if (!response.ok) throw new Error("RSS request failed");
        const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
        const channel = xml.querySelector("rss > channel");
        if (!channel || xml.querySelector("parsererror")) throw new Error("Invalid RSS");
        // Hugo writes absolute canonical URLs even when this build is previewed on another host.
        const self = Array.from(channel.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "link"))
            .find(link => link.getAttribute("rel") === "self");
        const feedAddress = address(self?.getAttribute("href") || url, url);
        const suffix = url.pathname.slice(siteRoot.pathname.length);
        const publishedRoot = feedAddress.pathname.endsWith("/" + suffix)
            ? feedAddress.pathname.slice(0, -suffix.length) : siteRoot.pathname;
        entries = [];
        for (const item of channel.children) {
            if (item.localName !== "item") continue;
            const title = item.querySelector("title")?.textContent?.trim();
            const href = item.querySelector("link")?.textContent?.trim();
            if (!title || !href) continue;
            let target;
            try { target = address(href, url); } catch { continue; }
            if (target.origin !== feedAddress.origin || !target.pathname.startsWith(publishedRoot)) continue;
            const local = new URL(siteRoot);
            local.pathname += target.pathname.slice(publishedRoot.length);
            local.search = target.search;
            local.hash = target.hash;
            const entry = element("li");
            const link = element("a", title);
            link.href = local.href;
            entry.append(link);
            entries.push(entry);
        }
    } catch (error) {
        if (signal?.aborted) throw error;
        panel.append(element("p", "暂时无法读取订阅内容。可以打开上方 RSS 源，或将地址添加到阅读器。"));
        return;
    }
    if (!entries.length) {
        panel.append(element("p", "订阅源暂时没有本站文章。"));
        return;
    }
    const list = element("ul", "", "feed-entries");
    list.append(...entries);
    panel.append(element("h2", "订阅更新"), list);
}

export async function createReferencePanel(value, label, signal) {
    const siteRoot = new URL(document.getElementById("reader").dataset.siteRoot, location.origin);
    const url = address(value, document.baseURI);
    const isFeed = url.origin === siteRoot.origin && url.pathname.startsWith(siteRoot.pathname)
        && url.pathname.endsWith("/index.xml");
    const resource = resources.get(url.origin + url.pathname);
    const panel = element("article", "", "reference-panel");
    const title = isFeed ? "RSS 订阅" : resource?.title || label || url.hostname;
    panel.append(element("p", isFeed ? "RSS" : url.hostname, "reference-origin"), element("h1", title));
    if (resource?.description) panel.append(element("p", resource.description));
    addSource(panel, url, isFeed);
    if (isFeed) {
        await appendFeed(panel, url, siteRoot, signal);
    } else if (resource?.embed) {
        const frame = element("iframe");
        frame.title = title;
        frame.setAttribute("sandbox", "");
        frame.referrerPolicy = "no-referrer";
        frame.src = url.origin + url.pathname;
        panel.append(frame);
    }
    return panel;
}
