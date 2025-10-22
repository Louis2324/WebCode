const sel = s => document.querySelector(s);
const selAll = s => Array.from(document.querySelectorAll(s)); //converting from node list to regular javascript array;

const out = sel("#output");
const preview = sel("#preview");

const STORAGE_KEY = "storagekey";
const TAB_ORDER = ["html","css","js"];

const escapeHTML = s => (
    String(s)
    .replace(/[&<>"]/g,  c => ({
        '&':"&amp;",
        '<': "&gt;",
        '>': "&lt;",
        '"': "&quot;"
        })
    )
)

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

ace.config.set("basePath","./vendor/ace");
function makeEditor (id , mode) {
    const ed = ace.edit(id , {
        theme : "ace/theme/dracula",
        mode ,
        tabSize: 2,
        useSoftTabs:true,
        showPrintMargin:false,
        wrap:true,
    });

    ed.session.setUseWrapMode(true);
    ed.commands.addCommand({
      name:"run",
      bindKey: {
        win: 'Ctrl-Enter',
        mac: 'Command-Enter'
      },
      exec(){runWeb();}
    });

    ed.commands.addCommand({
        name:"save",
        bindKey: {
            win: 'Ctrl-S',
            mac: 'Command-S'
        },
        exec(){saveProject();}
    });

    return ed;
}

const ed_html = makeEditor("ed_html","ace/mode/html");
const ed_css = makeEditor("ed_css","ace/mode/css");
const ed_js = makeEditor("ed_js","ace/mode/javascript");



const wraps = Object.fromEntries(selAll("#webEditors .editor-wrap").map(w => [w.dataset.pane ,w]));

const editors =  {
    html : ed_html,
    css: ed_css,
    js: ed_js
}

function activePane() {
    const t = sel("#webTabs .tab.active");
    return t? t.dataset.pane : "html";
}

function showPane(name) {
    TAB_ORDER.forEach( (tab) => {
        if(wraps[tab]) {
            wraps[tab].hidden = (tab !== name);
        }
    });

    selAll("#webTabs .tab").forEach(
     (tab) => {
        const on = tab.dataset.pane === name;
        tab.classList.toggle("active" , on);
        tab.setAttribute("aria-selected", on);
        tab.tabIndex = on? 0 : -1;
    });

    requestAnimationFrame(()=>{
       const ed = editors[name];
       if(ed && ed.resize) {
        ed.resize(true);
        ed.focus();
       }
    });
}

sel("#webTabs")?.addEventListener("click" , (e) => {
    const btn = e.target.closest(".tab");
    if(!btn) return;
    showPane(btn.dataset.pane);
})

sel("#webTabs")?.addEventListener("keydown",(e)=>{
    const idx = TAB_ORDER.indexOf(activePane());
    if(e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const delta = e.key === "ArrowLeft"?-1:1;
        showPane(TAB_ORDER[ ( idx + delta + TAB_ORDER.length) % TAB_ORDER.length ]);
    }
});


showPane("html");

function buildWebSrcDoc( withTests = false) {
    const html = ed_html.getValue();
    const css = ed_css.getValue();
    const js = ed_js.getValue();
    const tests = (sel("#testArea")?.value || "").trim();

    return `
        <!DOCTYPE html>
        <html lang="en" dir="ltr">
          <head>
             <meta charset="UTF-8">
             <meta name="viewport" content="width=device-width,initial-scale=1.0">
             <style>
              ${css} \n
             </style>
          </head>

          <body>
              ${html}
            <script> 
               try{
                 ${js}
                 ${withTests && tests? `\n/* tests */\n ${tests}`:``}
               }catch(e) {
                 console.error(e);
               }
            </script>
          </body>
        </html>
    `;
}

function runWeb(withTests = false) {
    preview.srcdoc = buildWebSrcDoc(withTests);
    const msg = withTests? "Run With Tests" : "Web Preview Updated";
    log(msg);
}

sel("#runWeb")?.addEventListener('click', ()=> runWeb() );
sel("#runTests")?.addEventListener('click',()=> runWeb(true) );
sel("#openPreview")?.addEventListener('click',()=> {
    const src = buildWebSrcDoc();
    const w = window.open("about:blank");
    w.document.open();
    w.document.write(src);
    w.document.close();
});


function projectJSON() {
    return {
        version: 1,
        kind: "web-only",
        assignment: sel("#assignment")?.value || "",
        test: sel("#testArea")?.value || "",
        html: ed_html.getValue(),
        css:ed_css.getValue(),
        js:ed_js.getValue(),
    }
}


function loadProject(obj) {
    try {
        if(sel("#assignment")) sel("#assignment").value = obj.assignment || "";
        if(sel("#testArea")) sel("#testArea").value = obj.test || "";
        ed_html.setValue(obj.html || "",-1 );
        ed_css.setValue(obj.css || "",-1);
        ed_js.setValue(obj.js || "",-1);
        log("Web Project Loaded");
    } catch (e) {
        log("Unable to load project " + e,"error");

    }
}

function setDefaultContent() {
    ed_html.setValue(`<h1>Welcome to Web Code</h1>`,-1);
    ed_css.setValue(`/* Write your styles here*/`,-1);
    ed_js.setValue(`/*Write your javascript code here*/`,-1);
}

function saveProject() {
    try {
      const data = JSON.stringify(projectJSON(),null,2);
      localStorage.setItem(STORAGE_KEY , data);
      const blob = new Blob([data],{type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "project";
      a.click();
      log("Project Saved Locally");
    } catch (error) {
        log("Unable to save " + error , "error");
    }
}

sel("#saveBtn")?.addEventListener("click",()=> saveProject());
sel("#loadBtn")?.addEventListener("click",()=> sel("#openFile").click() );
sel("#openFile")?.addEventListener("change", async (e)=>{
    const f = e.target.files[0];
    if(!f) return;

    try {
        const obj = JSON.parse(await f.text());
        loadProject(obj);
    } catch (e) {
        log("Invalid Project File" + e, "error");
    }
});


try {
    const cache = localStorage.getItem(STORAGE_KEY);
    if(cache) {
        loadProject(JSON.parse(cache));
    }else {
        setDefaultContent();
    }
}catch {
    setDefaultContent();
}

log("Welcome to web code your editor for web technologies");

// script.js
window.electronAPI.onSave(() => {
  sel("#saveBtn").click();
});

window.electronAPI.onLoad(() => {
  sel("#loadBtn").click();
});
