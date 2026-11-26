import { initArticle } from "./article-content.js";
import { createReferencePanel } from "./reference-panel.js";

const reader = document.getElementById("reader");
const site = new URL(reader.dataset.siteRoot, location.href);
const positions = new Map();
let sequence = 0;
let activeRequest;
let entry = history.state?.readerEntry || newEntry();
let displayed = new URL(location.href);
let failed = false;

function newEntry() {
    return Date.now().toString(36) + "-" + (++sequence);
}

function inSite(url) {
    return url.origin === site.origin && url.pathname.startsWith(site.pathname);
}

function isPage(url) {
    return inSite(url) && (url.pathname.endsWith("/") || /\.html$/.test(url.pathname) ||
        !url.pathname.split("/").pop().includes("."));
}

function resourceAddress(url) {
    const view = new URL(site);
    view.searchParams.set("resource", url.href);
    return view;
}

function resourceOf(view) {
    const value = view.pathname === site.pathname && view.searchParams.get("resource");
    if (!value) return null;
    try {
        const url = new URL(value);
        if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) return url;
    } catch { /* Ignore malformed shared addresses. */ }
    return null;
}

function sameContent(a, b) {
    return a.origin === b.origin && a.pathname === b.pathname && a.search === b.search;
}

function updateSelection(url) {
    const current = resourceOf(url) || url;
    for (const link of document.querySelectorAll(".site-rail a, .reference-index a, .site-footer a")) {
        if (sameContent(new URL(link.href), current)) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    }
}

function placeReader(url, savedTop) {
    reader.focus({ preventScroll: true });
    if (Number.isFinite(savedTop)) {
        reader.scrollTop = savedTop;
        return;
    }
    let target;
    try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch { /* Invalid anchor. */ }
    reader.scrollTop = target && reader.contains(target)
        ? reader.scrollTop + target.getBoundingClientRect().top - reader.getBoundingClientRect().top - 8
        : 0;
}

const metadata = 'meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], link[rel="alternate"][type="application/rss+xml"], script[type="application/ld+json"]';

function copyPageMetadata(page) {
    document.title = page.title;
    document.head.querySelectorAll(metadata).forEach(el => el.remove());
    for (const el of page.head.querySelectorAll(metadata)) document.head.append(el.cloneNode(true));
    document.body.classList.toggle("list", page.body.classList.contains("list"));
}

async function fetchPage(url, signal) {
    const response = await fetch(url, { signal, headers: { Accept: "text/html" } });
    if (!response.ok || !inSite(new URL(response.url)) || !response.headers.get("content-type")?.includes("text/html")) throw Error("Unavailable page");
    const page = new DOMParser().parseFromString(await response.text(), "text/html");
    if (!page.getElementById("reader")) throw Error("Missing reader");
    return { page, finalUrl: new URL(response.url) };
}

function remember() {
    positions.set(entry, reader.scrollTop);
    if (history.state?.readerEntry === entry) {
        history.replaceState({ ...history.state, readerTop: reader.scrollTop }, "");
    }
}

function changeEntry(url, mode, label) {
    if (mode === "push") {
        entry = newEntry();
        history.pushState({ readerEntry: entry, label }, "", url);
    } else {
        entry = history.state?.readerEntry || newEntry();
        history.replaceState({ ...history.state, readerEntry: entry, label }, "", url);
    }
    displayed = url;
}

function showLoadError(url) {
    const text = document.createElement("p");
    text.setAttribute("role", "status");
    text.textContent = "页面暂时未能加载。";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "重新加载";
    retry.addEventListener("click", () => navigate(url, "replace", history.state?.label));
    reader.replaceChildren(text, retry);
}

async function navigate(url, mode = "push", label = "") {
    activeRequest?.abort();
    const request = new AbortController();
    activeRequest = request;
    if (mode === "pop") positions.set(entry, reader.scrollTop);
    else remember();
    const restore = mode === "pop" ? positions.get(history.state?.readerEntry) ?? history.state?.readerTop : undefined;
    window.dispatchEvent(new Event("reader:navigate"));
    reader.setAttribute("aria-busy", "true");
    let committed = false;
    try {
        const reload = mode === "initial" || failed || !sameContent(url, displayed);
        const resource = resourceOf(url);
        let page, panel;
        if (reload && resource) {
            panel = await createReferencePanel(resource, label, request.signal);
        } else if (reload) {
            const fetched = await fetchPage(url, request.signal);
            page = fetched.page;
            fetched.finalUrl.hash = url.hash;
            url = fetched.finalUrl;
        }
        if (request.signal.aborted) return;
        changeEntry(url, mode, label);
        committed = true;
        if (page) {
            copyPageMetadata(page);
            reader.replaceChildren(...page.getElementById("reader").childNodes);
            initArticle(reader);
        } else if (panel) {
            reader.replaceChildren(panel);
            const heading = reader.querySelector("h1")?.textContent || label || resource.hostname;
            document.title = heading + " | 牛志伟 · Engineering Notes";
            document.head.querySelectorAll(metadata).forEach(el => el.remove());
            initArticle(reader);
        }
        failed = false;
        updateSelection(url);
        placeReader(url, restore);
    } catch {
        if (request.signal.aborted) return;
        if (!committed) changeEntry(url, mode, label);
        failed = true;
        showLoadError(url);
        initArticle(reader);
        placeReader(url);
    } finally {
        if (!request.signal.aborted) reader.removeAttribute("aria-busy");
    }
}

document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.("a[href]");
    if (!link || link.hasAttribute("download") || (link.target === "_blank" && link.relList.contains("external"))) return;
    const destination = new URL(link.href);
    if (!["https:", "http:"].includes(destination.protocol)) return;
    event.preventDefault();
    const url = isPage(destination) ? destination : resourceAddress(destination);
    const label = link.textContent.trim() || link.getAttribute("aria-label") || "";
    navigate(url, url.href === displayed.href ? "replace" : "push", label);
});

document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const root = document.documentElement;
    const theme = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = theme;
    try { localStorage.setItem("pref-theme", theme); } catch { /* Theme still applies for this visit. */ }
});

history.scrollRestoration = "manual";
history.replaceState({ ...history.state, readerEntry: entry }, "");
window.addEventListener("popstate", () => navigate(new URL(location.href), "pop", history.state?.label));
window.addEventListener("pagehide", remember);
if (resourceOf(displayed)) {
    navigate(displayed, "initial", history.state?.label);
} else {
    initArticle(reader);
    updateSelection(displayed);
    if (displayed.hash || Number.isFinite(history.state?.readerTop)) placeReader(displayed, history.state?.readerTop);
}
