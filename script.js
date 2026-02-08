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
    renderTreeByTitle(slot.dataset.title, slot.id); 
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

function renderTreeByTitle(title, containerId) {
  const tree = entriesByTitle[title];
  if (!tree) {
    console.warn(`Tree not found: ${title}`);
    return;
  }
  const container = document.getElementById(containerId);
  renderTree(tree, container);
}

/* ---------- LOAD ARTICLES CONTENT ---------- */

function renderArticle(article, container) {

  const details = document.createElement("details");
  details.setAttribute("name","unique");
  details.className = "leaf";
  const summary = document.createElement("summary");
  summary.textContent = article.title;
  details.appendChild(summary);
  
  const content = document.createElement("div");
  const ul = document.createElement("ul");
  article.items.forEach(item => {
    const li = document.createElement("li");
    renderItem(item, li);
    ul.appendChild(li);
  });
  content.appendChild(ul);
  details.appendChild(content);
  container.appendChild(details);
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

/* ---------------- LOAD TREES CONTENT ------------------- */

function renderTree(table, container) {

  const rootDetails = document.createElement("details");
  rootDetails.setAttribute("name", "unique");

  const rootSummary = document.createElement("summary");
  rootSummary.className = "node";
  rootSummary.textContent = table.title;
  rootDetails.appendChild(rootSummary);

  const searchBox = document.createElement("input");
  searchBox.type = "text";
  searchBox.placeholder = "Search...";
  rootDetails.appendChild(searchBox);

  const byCategory = groupBy(table.rows, "category");
  Object.entries(byCategory).forEach(([category, catRows]) => {
    const catDetails = document.createElement("details");
    const catSummary = createNodeSummary(category, catRows.length);
    catDetails.appendChild(catSummary);

    const byPosition = groupBy(catRows, "position");
    Object.entries(byPosition).forEach(([position, posRows]) => {
      const posDetails = document.createElement("details");
      const posSummary = createNodeSummary(position, posRows.length);
      posDetails.appendChild(posSummary);

      posRows.forEach(r => {
        const techDetails = document.createElement("details");
        techDetails.className = "leaf";
        // searchable text (customize as needed)
        techDetails.dataset.searchText = [
          r.technique, r.category, r.position,
          r.steps, r.dates, r.videos,
          r.rationale, r.offense, r.defense, r.transitions, r.drills]
        .flat().filter(Boolean).join(" ").toLowerCase();

        const leafSummary = createLeafSummary(r.technique);
        techDetails.appendChild(leafSummary);

        const detailsDiv = document.createElement("div");
        detailsDiv.innerHTML = renderDetails(r);
        techDetails.appendChild(detailsDiv);

        posDetails.appendChild(techDetails);
      });

      catDetails.appendChild(posDetails);
    });

    rootDetails.appendChild(catDetails);
  });

  container.appendChild(rootDetails);

  /* ---------- EVENTS ---------- */

  searchBox.addEventListener("input", () =>
    searchTree(rootDetails, searchBox.value)
  );

  /* ---------- HELPERS ---------- */

  function searchTree(root, query) {
    query = query.toLowerCase();

    root.querySelectorAll(":scope > details").forEach(cat => {
      let catCount = 0;

      cat.querySelectorAll(":scope > details").forEach(pos => {
        let posCount = 0;

        pos.querySelectorAll(":scope > details.leaf").forEach(tech => {
          const match = matchesSearch(
            tech.dataset.searchText,
            query
          );

          tech.style.display = match ? "" : "none";
          if (match) posCount++;
        });

        updateCount(pos, posCount);
        pos.style.display = posCount ? "" : "none";
        catCount += posCount;
      });

      updateCount(cat, catCount);
      cat.style.display = catCount ? "" : "none";
    });
  }

  function createNodeSummary(title, count) {
    const summary = document.createElement("summary");
    summary.className = "node";

    const titleSpan = document.createElement("span");
    titleSpan.textContent = title;

    const countSpan = document.createElement("span");
    countSpan.className = "count";
    countSpan.textContent = ` (${count})`;

    summary.appendChild(titleSpan);
    summary.appendChild(countSpan);
    return summary;
  }

  function createLeafSummary(title) {
    const summary = document.createElement("summary");
    summary.textContent = title;
    return summary;
  }

  function updateCount(detailsEl, count) {
    const countSpan =
      detailsEl.querySelector(":scope > summary .count");
    if (countSpan) {
      countSpan.textContent = ` (${count})`;
    }
  }
}

/* --------- HELPER FUNCTIONS  --------- */

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
    ["Steps", r.steps], ["Rationale", r.rationale],
    ["Offense", r.offense], ["Defense", r.defense],
    ["Transitions", r.transitions], ["Drills", r.drills]
  ];
  sections.forEach(([title, list]) => {
    if (list && list.length) {
      html += `<h4>≡ ${title}</h4><ul>` +
        list.map(i => `<li>${i}</li>`).join("") + `</ul>`;
    }
  });

  if (r.videos?.length) {
    html += `<p>▶️ ` +
      r.videos.map(v =>
        `<a href="${v.url}" target="_blank">${v.label}</a>`).join(" | ") +
      `</p>`;
  }
  if (r.dates?.length) {
    html += `<p>📅 ${formatDates(r.dates)}</p>`;
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
        result += `/${d}`; // only day changes
      } else {
        result += `, ${date}`; // month or year changes → comma + full date 
      }
    }
    prev = { y, m, d };
  }

  return result;
}
