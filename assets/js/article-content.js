let activeMain;
let version = 0;
let diagramId = 0;
let rendering = false;
let mermaidModule;

const mermaidCode = "pre > code.language-mermaid, pre > code[data-lang='mermaid']";

function selectCode(code) {
    const range = document.createRange();
    range.selectNodeContents(code);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return selection;
}

async function copyCode(button, code) {
    let copied = false;
    if (navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(code.textContent);
            copied = true;
        } catch {
            // Some browsers expose the clipboard API but deny the write.
        }
    }
    if (!copied) {
        const selection = selectCode(code);
        try {
            copied = document.execCommand("copy");
        } catch {
            // Keep the source selected so the user can copy it manually.
        }
        if (copied) selection.removeAllRanges();
    }
    button.textContent = copied ? "已复制" : "请手动复制";
    window.setTimeout(() => { button.textContent = "复制"; }, 1800);
}

function addCopyButton(code) {
    const pre = code.parentElement;
    if (pre.querySelector(":scope > .copy-code")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-code";
    button.textContent = "复制";
    button.setAttribute("aria-label", "复制代码");
    button.addEventListener("click", () => copyCode(button, code));
    pre.append(button);
}

function loadMermaid() {
    if (!mermaidModule) {
        mermaidModule = import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs")
            .then(module => module.default)
            .catch(error => {
                mermaidModule = undefined;
                throw error;
            });
    }
    return mermaidModule;
}

async function renderDiagrams(currentVersion) {
    const codes = Array.from(activeMain.querySelectorAll(mermaidCode));
    if (!codes.length) return;
    const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "default";
    let mermaid;
    try {
        mermaid = await loadMermaid();
    } catch {
        return; // The original code blocks are readable without the CDN.
    }
    if (currentVersion !== version) return;
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true, theme });

    for (const code of codes) {
        if (currentVersion !== version || !code.isConnected) return;
        const pre = code.parentElement;
        const existing = pre.nextElementSibling;
        const diagram = existing?.hasAttribute("data-reader-diagram") ? existing : null;
        if (diagram?.dataset.readerDiagram === theme) continue;

        // Mermaid measures a connected container. Keep the displayed diagram in place while it renders.
        const stage = document.createElement("div");
        stage.setAttribute("aria-hidden", "true");
        Object.assign(stage.style, {
            position: "absolute",
            visibility: "hidden",
            pointerEvents: "none",
            width: pre.parentElement.clientWidth + "px"
        });
        pre.after(stage);
        try {
            const { svg } = await mermaid.render("notes-diagram-" + (++diagramId), code.textContent, stage);
            if (currentVersion !== version || !code.isConnected) return;
            const output = diagram || document.createElement("div");
            output.className = "mermaid";
            output.dataset.readerDiagram = theme;
            output.innerHTML = svg;
            if (!diagram) pre.after(output);
            pre.hidden = true;
        } catch {
            if (currentVersion !== version || !code.isConnected) return;
            diagram?.remove();
            pre.hidden = false;
        } finally {
            stage.remove();
        }
    }
}

async function updateDiagrams() {
    ++version;
    if (rendering || !activeMain) return;
    rendering = true;
    try {
        let currentVersion;
        do {
            currentVersion = version;
            await renderDiagrams(currentVersion);
        } while (currentVersion !== version);
    } finally {
        rendering = false;
    }
}

new MutationObserver(updateDiagrams).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
});

export function initArticle(main) {
    activeMain = main;
    for (const code of main.querySelectorAll(".post-content pre > code")) {
        if (!code.matches(mermaidCode)) addCopyButton(code);
    }
    updateDiagrams();
}
