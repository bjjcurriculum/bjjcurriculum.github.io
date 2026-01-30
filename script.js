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
    const header = response.headers.get('Last-Modified');
    if (!header) {
      slot.textContent = 'an unknown date';
      return;
    }
    const lastModified = new Date(header);
    slot.textContent = lastModified.toISOString().split("T")[0];
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
  wrapper.className = "table-wrapper";

  const title = document.createElement("div");
  title.className = "table-title";
  title.innerHTML = `<div class="title-inner"><span class="chevron">${defaultChevron()}</span>${table.title}</div>`;
  wrapper.appendChild(title);

  const searchBox = document.createElement("div");
  searchBox.className = "search-box hidden";
  searchBox.innerHTML = `<input type="text" placeholder="Search..." />`;
  wrapper.appendChild(searchBox);

  const tbl = document.createElement("table");
  tbl.className = "hidden";
  tbl.innerHTML = `
    <thead>
      <tr>
        <th class="col-position">Position</th>
        <th class="col-technique">Technique</th>
        <th class="col-details">Details</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  wrapper.appendChild(tbl);
  container.appendChild(wrapper);

  const tbody = tbl.querySelector("tbody");
  const grouped = groupBy(table.rows, "position");

  Object.entries(grouped).forEach(([position, rows]) => {
    const posRow = document.createElement("tr");
    posRow.innerHTML = `
      <td class="position"><span class="chevron">${defaultChevron()}</span>${position}</td>
      <td></td>
      <td></td>
    `;
    tbody.appendChild(posRow);

    posRow.addEventListener("click", () => toggleGroup(posRow, rows.length));

    rows.forEach(r => {
      const techRow = document.createElement("tr");
      techRow.className = "hidden";
      techRow.innerHTML = `
        <td></td>
        <td class="technique"><span class="chevron">${defaultChevron()}</span>${r.technique}</td>
        <td class="details hidden">${renderDetails(r)}</td>
      `;
      tbody.appendChild(techRow);

      techRow.querySelector(".technique").addEventListener("click", e => {
        e.stopPropagation();
        toggleDetails(techRow);
      });
    });
  });

  title.addEventListener("click", () => {
    toggleChevron(title);
    tbl.classList.toggle("hidden");
    searchBox.classList.toggle("hidden");
  });

  searchBox.querySelector("input").addEventListener("input", e => {
    const term = e.target.value.toLowerCase();

    let currentPositionRow = null;
    let positionHasMatch = false;

    [...tbody.rows].forEach(row => {
      // POSITION ROW
      if (row.querySelector(".position")) {
        // Reset previous position
        if (currentPositionRow) {
          currentPositionRow.style.display = positionHasMatch ? "" : "none";
        }

        currentPositionRow = row;
        positionHasMatch = false;

        row.style.display = ""; // tentatively show
        return;
      }

      // TECHNIQUE ROW
      const detailsCell = row.querySelector(".details");
      const text = row.textContent.toLowerCase();

      /* const match = text.includes(term); */
      const match = matchesSearch(text, term);

      row.style.display = match ? "" : "none";

      if (match) {
        positionHasMatch = true;

        // Force parents open
        row.classList.remove("hidden");
        detailsCell?.classList.remove("hidden");
      }
    });

    // Handle last position
    if (currentPositionRow) {
      currentPositionRow.style.display = positionHasMatch ? "" : "none";
    }

    // Empty search → reset to collapsed state
    if (!term) {
      resetCollapseState(tbody);
    }
  });

  container.appendChild(wrapper);
}

/* --------- HELPER FUNCTIONS  --------- */

function resetCollapseState(tbody) {
  [...tbody.rows].forEach(row => {
    if (row.querySelector(".position")) {
      row.style.display = "";
      row.querySelector(".chevron").textContent = defaultChevron();
    } else {
      row.style.display = "";
      row.classList.add("hidden");
      row.querySelector(".details")?.classList.add("hidden");
      const chev = row.querySelector(".chevron");
      if (chev) chev.textContent = defaultChevron();
    }
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

function toggleGroup(posRow, count) {
  toggleChevron(posRow);
  let row = posRow.nextElementSibling;
  for (let i = 0; i < count; i++) {
    row.classList.toggle("hidden");
    row = row.nextElementSibling;
  }
}

function toggleDetails(row) {
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
    acc[obj[key]] = acc[obj[key]] || [];
    acc[obj[key]].push(obj);
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
      html += `<h4>${title}</h4><ul>` +
        list.map(i => `<li>${i}</li>`).join("") +
        `</ul>`;
    }
  });

  if (r.videos?.length) {
    html += `<h4>Videos</h4><ul>` +
      r.videos.map(v => `<li><a href="${v.url}" target="_blank">${v.label}</a></li>`).join("") +
      `</ul>`;
  }

  if (r.dates?.length) {
    html += `<h4>Dates</h4><p>${formatDates(r.dates)}</p>`;
  }

  return html || "";
}

function formatDates(dates) {
  if (dates.length === 1) return dates[0];
  const [start, end] = dates;
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return `${start}/${end.slice(8)}`;
  }
  return `${start}/${end.slice(5)}`;
}
