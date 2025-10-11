const sel = s => document.querySelector(s);
const selAll = s => Array.from(document.querySelectorAll(s)); //converting from node list to regular javascript array;

const out = sel("#output");
const preview = sel("#preview");
const STORAGE_KEY = "storagekey";

const escapeHTML = s => {
    String(s)
    .replace(/[&<>"]/g,  c => ({
        '&':"&amp;",
        '<': "&gt;",
        '>': "&lt;",
        '"': "&quot;"
        })
    )
}

function log(msg, type="info") {
    const color = type === "error"? "var(--error)":type==="warning"?"var(--warn)":"var(--brand)";
    const time = new Date().toLocaleTimeString();
    const line = document.createElement("div");
    line.innerHTML = `<span style="color: ${color}" > [${time}] </span> ${escapeHTML(msg)}`;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
}

const clearOut = () => { out.innerHTML="";}
sel("#clearLog")?.addEventListener("click",clearOut);