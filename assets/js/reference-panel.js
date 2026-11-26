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

function addSource(panel, url) {
    const actions = element("div", "", "source-actions");
    const link = element("a", "在新标签页打开原文");
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

export function createReferencePanel(value, label) {
    const url = address(value, document.baseURI);
    const resource = resources.get(url.origin + url.pathname);
    const panel = element("article", "", "reference-panel");
    const title = resource?.title || label || url.hostname;
    panel.append(element("p", url.hostname, "reference-origin"), element("h1", title));
    if (resource?.description) panel.append(element("p", resource.description));
    addSource(panel, url);
    if (resource?.embed) {
        const frame = element("iframe");
        frame.title = title;
        frame.setAttribute("sandbox", "");
        frame.referrerPolicy = "no-referrer";
        frame.src = url.origin + url.pathname;
        panel.append(frame);
    }
    return panel;
}
