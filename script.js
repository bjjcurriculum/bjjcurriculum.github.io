function getTableStyle() {
  const tableStyle = document.currentScript?.dataset.tablestyle;
  if (tableStyle) return tableStyle;
  return "default";
}
console.log(getTableStyle());

/* --------- LAST MODIFIED ---------- */

function getPageName() {
  const scriptPage = document.currentScript?.dataset.page;
  if (scriptPage) return scriptPage;
  const path = window.location.pathname;
  return path.split('/').pop() || 'index.html';
}

function getPageNameRoot() {
  return getPageName().split('.')[0];
}

async function getLastModifiedDate(slot) {
  try {
    const response = await fetch(getPageNameRoot() + "_data.yaml");
    const lastModified = response.headers.get('Last-Modified');
    if (!lastModified) {
      slot.textContent = 'an unknown date';
      return;
    }
    slot.textContent = new Date(lastModified).toLocaleDateString('en-CA');
  } catch (err) {
    console.error(err);
    slot.textContent = 'an unknown date';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".lastModified").forEach(slot => {
    getLastModifiedDate(slot);
  });
});

/* ---------- BURGER MENU ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const burger = document.getElementById("burger");
  const menu = document.getElementById("menu");

  burger.addEventListener("click", () => {
    burger.classList.toggle("open");
    menu.classList.toggle("open");
  });
});

/* ----------- RENDER DATA ----------- */

let entriesByTitle= {};

async function fetchData() {
  const file = getPageNameRoot() + "_data.yaml";
  try {
    const res = await fetch(file);
    const text = await res.text();
    const data = jsyaml.load(text);
    if (data?.articles) {
      data.articles.forEach(entry => {
        entriesByTitle[entry.title] = entry; });
    }
    if (data?.tables) {
      data.tables.forEach(entry => {
        entriesByTitle[entry.title] = entry; });
    }
  } catch (err) {
    console.error("Failed to load tables:", err.message);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await fetchData();
  document.querySelectorAll(".table-slot").forEach(slot => {
    renderTableByTitle(slot.dataset.title, slot.id); 
  });
  document.querySelectorAll(".article-slot").forEach(slot => {
    renderArticleByTitle(slot.dataset.title, slot.id);
  });
});

function renderArticleByTitle(title, containerId) {
  const article = entriesByTitle[title];
  if (!article) {
    console.warn(`Article not found: ${title}`);
    return;
  }
  const container = document.getElementById(containerId);
  renderArticle(article, container);
}

function renderTableByTitle(title, containerId) {
  const table = entriesByTitle[title];
  if (!table) {
    console.warn(`Table not found: ${title}`);
    return;
  }
  const container = document.getElementById(containerId);
  renderTable(table, container);
}

/* ---------- LOAD ARTICLES CONTENT ---------- */

function renderArticle(article, container) {

  const articleDiv = document.createElement("section");
  articleDiv.className = "article";

  const title = document.createElement("div");
  title.className = "table-title";
  title.innerHTML = `<div class="title-inner"><span class="chevron">${defaultChevron()}</span>${article.title}</div>`;
  
  const content = document.createElement("div");
  content.className = "article-content";

  const ul = document.createElement("ul");

  article.items.forEach(item => {
    const li = document.createElement("li");
    renderItem(item, li);
    ul.appendChild(li);
  });
  content.appendChild(ul);

  title.addEventListener("click", () => {
    content.classList.toggle("open");
    toggleChevron(title);
  });

  articleDiv.appendChild(title);
  articleDiv.appendChild(content);
  container.appendChild(articleDiv);
}

function renderItem(item, container) {
  if (typeof item === "string") {
    container.appendChild(document.createTextNode(item));
  }
  else if (Array.isArray(item)) {
    item.forEach(part => {
      container.appendChild(renderPart(part));
    });
  }
  else if (isLinkObject(item)) { /* single link */
    container.appendChild(renderLink(item));
  }
}

function renderPart(part) {
  if (typeof part === "string") {
    return document.createTextNode(part);
  }
  if (typeof part === "object") { /* { label: url } */
    return renderLink(part);
  }
}

function renderLink(linkObj) {
  const [[label, url]] = Object.entries(linkObj);

  const a = document.createElement("a");
  a.href = url;
  a.textContent = label;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = "inline-link";

  return a;
}

function isLinkObject(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    Object.keys(obj).length === 1 &&
    typeof Object.values(obj)[0] === "string"
  );
}

/* ---------------- LOAD TABLES CONTENT ------------------- */


function renderTable(table, container) {
  const wrapper = document.createElement("div");
  wrapper.className = "tree-wrapper";

  /* ---------- TITLE ---------- */

  const title = document.createElement("div");
  title.className = "tree-title";
  title.innerHTML = `
    <span class="chevron">${defaultChevron()}</span>${table.title}
  `;
  wrapper.appendChild(title);

  /* ---------- SEARCH ---------- */

  const searchBox = document.createElement("div");
  searchBox.className = "search-box hidden";
  searchBox.innerHTML = `<input type="text" placeholder="Search..." />`;
  wrapper.appendChild(searchBox);

  /* ---------- TREE ROOT ---------- */

  const tree = document.createElement("div");
  tree.className = "tree hidden";
  wrapper.appendChild(tree);
  container.appendChild(wrapper);

  /* ---------- DATA GROUPING ---------- */

  const byCategory = groupBy(table.rows, "category");

  Object.entries(byCategory).forEach(([category, catRows]) => {
    const catNode = createNode("category", category, catRows.length);
    tree.appendChild(catNode.el);

    const byPosition = groupBy(catRows, "position");

    Object.entries(byPosition).forEach(([position, posRows]) => {
      const posNode = createNode("position", position, posRows.length);
      catNode.children.appendChild(posNode.el);

      posRows.forEach(r => {
        const techNode = createNode("technique", r.technique);
        posNode.children.appendChild(techNode.el);

        const details = document.createElement("div");
        details.className = "details hidden";
        details.innerHTML = renderDetails(r);
        techNode.el.appendChild(details);

        techNode.label.addEventListener("click", e => {
          e.stopPropagation();
          toggleChevron(techNode.label);
          details.classList.toggle("hidden");
        });
      });
    });
  });

  /* ---------- COLLAPSE / EXPAND ---------- */

  title.addEventListener("click", () => {
    toggleChevron(title);
    tree.classList.toggle("hidden");
    searchBox.classList.toggle("hidden");
  });

  /* ---------- SEARCH ---------- */

  searchBox.querySelector("input").addEventListener("input", e => {
    const term = e.target.value.toLowerCase();

    const nodes = [...tree.querySelectorAll(".node")];

    nodes.forEach(node => {
      const text = node.textContent.toLowerCase();
      const match = matchesSearch(text, term);

      node.style.display = match || !term ? "" : "none";

      if (match && term) {
        expandAncestors(node);
      }
    });

    if (!term) {
      collapseAll(tree);
    }
  });

  /* ---------- HELPERS ---------- */

  function createNode(type, label, count) {
    const el = document.createElement("div");
    el.className = `node ${type}`;

    const labelEl = document.createElement("div");
    labelEl.className = "label";
    labelEl.innerHTML = `
      <span class="chevron">${defaultChevron()}</span>
      ${label}${count ? ` (${count})` : ""}
    `;

    const children = document.createElement("div");
    children.className = "children hidden";

    labelEl.addEventListener("click", () => {
      toggleChevron(labelEl);
      children.classList.toggle("hidden");
    });

    el.appendChild(labelEl);
    el.appendChild(children);

    return { el, label: labelEl, children };
  }

  function expandAncestors(node) {
    let current = node.parentElement;
    while (current && current !== tree) {
      if (current.classList.contains("children")) {
        current.classList.remove("hidden");
        const label = current.previousElementSibling;
        label && (label.querySelector(".chevron").textContent = "▾ ");
      }
      current = current.parentElement;
    }
  }

  function collapseAll(root) {
    root.querySelectorAll(".children").forEach(c => c.classList.add("hidden"));
    root.querySelectorAll(".chevron").forEach(c => c.textContent = defaultChevron());
  }
}


/* --------- HELPER FUNCTIONS  --------- */

function resetCollapseState(tbody) {
  [...tbody.rows].forEach(row => {
    row.style.display = "";
    row.classList.remove("open");

    if (!row.classList.contains("category-row")) {
      row.classList.add("hidden");
    }

    row.querySelector(".details")?.classList.add("hidden");

    const chev = row.querySelector(".chevron");
    if (chev) chev.textContent = defaultChevron();
  });
}

function matchesSearch(text, query) {
  if (!query.trim()) return true;

  const tokens = query
    .toLowerCase()
    .split(/\s+/);

  let mustInclude = [];
  let mustExclude = [];
  let orGroups = [];

  let currentOrGroup = [];

  tokens.forEach(token => {
    if (token === "or") {
      return;
    }

    if (tokens[tokens.indexOf(token) - 1] === "or") {
      currentOrGroup.push(token);
      orGroups.push(currentOrGroup);
    } else if (tokens[tokens.indexOf(token) + 1] === "or") {
      currentOrGroup = [token];
    } else if (token === "not") {
      return;
    } else if (tokens[tokens.indexOf(token) - 1] === "not") {
      mustExclude.push(token);
    } else {
      mustInclude.push(token);
    }
  });

  // AND terms
  for (const term of mustInclude) {
    if (!text.includes(term)) return false;
  }

  // NOT terms
  for (const term of mustExclude) {
    if (text.includes(term)) return false;
  }

  // OR groups
  for (const group of orGroups) {
    if (!group.some(term => text.includes(term))) {
      return false;
    }
  }

  return true;
}

function toggleGroup(row, stopClasses = []) {
  const isOpening = row.classList.contains("open") === false;

  row.classList.toggle("open");

  let next = row.nextElementSibling;

  while (next) {
    if (stopClasses.some(cls => next.classList.contains(cls))) break;

    next.classList.toggle("hidden", !isOpening);

    // Force-collapse children when closing
    if (!isOpening) {
      next.classList.remove("open");
      next.querySelector(".details")?.classList.add("hidden");
      const chev = next.querySelector(".chevron");
      if (chev) chev.textContent = defaultChevron();
    }

    next = next.nextElementSibling;
  }
}

function toggleDetails(row) {
  row.classList.toggle("open");
  toggleChevron(row.querySelector(".technique"));
  row.querySelector(".details").classList.toggle("hidden");
}

/* ▶ vs ▸ */
function defaultChevron() {
 return "▸ ";
}

function toggleChevron(el) {
  const chev = el.querySelector(".chevron");
  chev.textContent = chev.textContent === "▸ " ? "▾ " : "▸ ";
}

function groupBy(arr, key) {
  return arr.reduce((acc, obj) => {
    const k = typeof key === "function" ? key(obj) : obj[key];
    acc[k] = acc[k] || [];
    acc[k].push(obj);
    return acc;
  }, {});
}

function renderDetails(r) {
  let html = "";

  const sections = [
    ["Steps", r.steps],
    ["Rationale", r.rationale],
    ["Offense", r.offense],
    ["Defense", r.defense],
    ["Transitions", r.transitions],
    ["Drills", r.drills]
  ];

  sections.forEach(([title, list]) => {
    if (list && list.length) {
      html += `<h4>≡ ${title}</h4><ul>` +
        list.map(i => `<li>${i}</li>`).join("") +
        `</ul>`;
    }
  });

  if (r.videos?.length) {
    /* html += `<h4>Videos</h4><ul>` +
      r.videos.map(v => `<li><a href="${v.url}" target="_blank">${v.label}</a></li>`).join("") +
      `</ul>`; */
    html += `<p>▶️ ` +
      r.videos.map(v => `<a href="${v.url}" target="_blank">${v.label}</a>`).join(" | ") +
      `</p>`;
  }

  if (r.dates?.length) {
    html += `<p>📅 ${formatDates(r.dates)}</p>`;
    //html += `<h4>Dates</h4><p>${formatDates(r.dates)}</p>`;
  }

  return html || "";
}

function formatDates(dates) {
  if (!dates || dates.length === 0) return '';
  if (dates.length === 1) return dates[0];

  let result = '';
  let prev = null;

  for (const date of dates) {
    const [y, m, d] = date.split('-');

    if (!prev) {
      result += date;
    } else {
      const sameYear = y === prev.y;
      const sameMonth = sameYear && m === prev.m;

      if (sameMonth) {
        // only day changes
        result += `/${d}`;
      } else {
        // month or year changes → comma + full date
        result += `, ${date}`;
      }
    }
    prev = { y, m, d };
  }

  return result;
}
