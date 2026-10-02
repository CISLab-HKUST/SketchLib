const PAGE_SIZE = 25;
const columns = { title: "Paper Title", authors: "Authors", year: "Year", venue: "Publication Venue", url: "URL", doi: "DOI", bibtex: "BibTeX", labels: "Labels" };
// Rankings follow the attached 7th edition CCF directory (2026). Names not listed there go in Others.
const venueTiers = {
  "A Tier": new Set(["AAAI", "ACM MM", "CHI", "CVPR", "ICCV", "ICLR", "ICML", "IJCV", "NeurIPS", "SIGIR", "SIGGRAPH", "SIGGRAPH Asia", "TIP", "TMM", "TOG", "TOCHI", "TPAMI", "TVCG", "UIST"]),
  "B Tier": new Set(["CAGD", "CGF", "CSCW", "ECCV", "ICME", "IJCAI", "PG", "TCSVT", "TNNLS"]),
  "C Tier": new Set(["3DV", "ACCV", "BMVC", "C&G", "CVM", "ICIP"])
};
const venueTierOrder = ["A Tier", "B Tier", "C Tier", "Others"];
const venueFilterOptions = new Map();
const topicHierarchy = [
  ["Sketching and Thinking", 0], ["Sketch Representations", 0], ["Sketch Rendering", 0],
  ["Sketch Understanding", 0], ["Sketch Recognition", 1], ["Sketch Segmentation", 1], ["Sketch Abstraction", 1], ["Stroke Intent", 1], ["Sketch Distortion", 1],
  ["Sketch-Based Image Synthesis", 0], ["Sketch-Based Image Retrieval", 1], ["Sketch-Based Image Generation", 1], ["GAN-Based Methods", 2], ["Diffusion-Based Methods", 2], ["Sketch-Based Image Editing", 1], ["Sketch Colorization", 1],
  ["3D Sketching", 0], ["Sketching in VR/AR", 1], ["Lifting 2D Sketches", 1],
  ["Sketch-Based Modeling", 0], ["Sketch-Based Shape Retrieval", 1], ["Geometry-Based Methods", 1], ["Data-Driven Methods", 1],
  ["Sketch Processing", 0], ["Sketch Cleanup", 1], ["Vectorization", 1],
  ["Sketch Animation", 0], ["Drawing Process Synthesis", 1], ["Sketch Inbetweening", 1],
  ["Sketch Synthesis", 0], ["Raster Sketch Extraction", 1], ["Vector Sketch Generation", 1],
  ["Non-Photorealistic Rendering", 0]
];
const state = { rows: [], filtered: [], page: 1, sort: "Year", direction: "desc", filters: { yearFrom: "", yearTo: "", venues: new Set(), labels: new Set() }, query: "" };
const $ = (id) => document.getElementById(id);

function parseCSV(text) {
  const records = []; let row = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); records.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); records.push(row); }
  const headers = (records.shift() || []).map((h) => h.replace(/^\uFEFF/, "").trim());
  return records.filter((r) => r.some((v) => v.trim())).map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
}
function clean(value) { return (value || "").trim(); }
function splitLabels(value) { return clean(value).split(/[;,|]/).map((label) => label.trim()).filter(Boolean); }
function uniqueValues(key, transform = (value) => value) {
  return [...new Set(state.rows.map((row) => clean(row[key])).filter(Boolean).map(transform))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}
function fillSelect(select, values, label) {
  const current = select.value;
  select.innerHTML = `<option value="">${label}</option>` + values.map((value) => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join("");
  if (values.includes(current)) select.value = current;
}
function bibtexType(row) { return (clean(row[columns.bibtex]).match(/^\s*@([a-z]+)/i) || [])[1]?.toLowerCase() || ""; }
function getVenueTier(row) {
  const venue = clean(row[columns.venue]);
  // CSCW appears as both a CCF A conference and a CCF B journal.
  if (venue === "CSCW") return bibtexType(row) === "article" ? "B Tier" : "A Tier";
  return venueTierOrder.find((tier) => tier !== "Others" && venueTiers[tier].has(venue)) || "Others";
}
function fillVenueOptions() {
  venueFilterOptions.clear();
  const grouped = Object.fromEntries(venueTierOrder.map((tier) => [tier, new Map()]));
  for (const row of state.rows) {
    const venue = clean(row[columns.venue]);
    if (!venue) continue;
    const tier = getVenueTier(row);
    const key = `${venue}\u0000${tier}`;
    if (!grouped[tier].has(key)) grouped[tier].set(key, venue);
  }
  let optionIndex = 0;
  $("venue-options-list").innerHTML = venueTierOrder.map((tier) => {
    const venues = [...grouped[tier].values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    if (!venues.length) return "";
    const items = venues.map((venue) => {
      const value = `venue-${optionIndex++}`;
      venueFilterOptions.set(value, { venue, tier });
      return `<label class="filter-option"><input type="checkbox" value="${value}" data-venue-check><span>${escapeHTML(venue)}</span></label>`;
    }).join("");
    return `<section class="filter-option-group"><h3>${tier}</h3>${items}</section>`;
  }).join("");
  syncMultiSelectControls();
}
function fillTopicOptions() {
  $("topic-options-list").innerHTML = topicHierarchy.map(([topic, depth]) =>
    `<label class="topic-filter-option" data-depth="${depth}"><input type="checkbox" value="${escapeHTML(topic)}" data-topic-check><span>${escapeHTML(topic)}</span></label>`
  ).join("");
  syncMultiSelectControls();
}
function fillYearRange(years) {
  const ascending = [...years].sort((a, b) => Number(a) - Number(b));
  fillSelect($("year-from"), ascending, "From year");
  fillSelect($("year-to"), ascending, "To year");
}
function syncMultiSelectControls() {
  document.querySelectorAll("[data-venue-check]").forEach((checkbox) => { checkbox.checked = state.filters.venues.has(checkbox.value); });
  document.querySelectorAll("[data-topic-check]").forEach((checkbox) => { checkbox.checked = state.filters.labels.has(checkbox.value); });
  const venueLabel = state.filters.venues.size ? `${state.filters.venues.size} venue${state.filters.venues.size === 1 ? "" : "s"} selected` : "All venues";
  const topicLabel = state.filters.labels.size ? `${state.filters.labels.size} topic${state.filters.labels.size === 1 ? "" : "s"} selected` : "All topics";
  $("venue-trigger-label").textContent = venueLabel;
  $("topic-trigger-label").textContent = topicLabel;
  $("venue-trigger").title = [...state.filters.venues].map((value) => venueFilterOptions.get(value)?.venue).filter(Boolean).join(", ") || "All venues";
  $("topic-trigger").title = [...state.filters.labels].join(", ") || "All topics";
}
function readChecked(id) { return new Set([...$(id).querySelectorAll("input:checked")].map((checkbox) => checkbox.value)); }
function closeFilterPopovers() {
  ["venue", "topic"].forEach((kind) => {
    $(`${kind}-popover`).hidden = true;
    $(`${kind}-trigger`).setAttribute("aria-expanded", "false");
  });
}
function toggleFilterPopover(kind) {
  const popover = $(`${kind}-popover`);
  const shouldOpen = popover.hidden;
  closeFilterPopovers();
  popover.hidden = !shouldOpen;
  $(`${kind}-trigger`).setAttribute("aria-expanded", String(shouldOpen));
}
function filterMenuOptions(kind, query) {
  const normalized = query.trim().toLocaleLowerCase();
  if (kind === "venue") {
    document.querySelectorAll(".filter-option-group").forEach((group) => {
      let visible = false;
      group.querySelectorAll(".filter-option").forEach((option) => {
        const matches = option.textContent.toLocaleLowerCase().includes(normalized);
        option.hidden = !matches;
        visible ||= matches;
      });
      group.hidden = !visible;
    });
  } else {
    document.querySelectorAll(".topic-filter-option").forEach((option) => {
      option.hidden = !option.textContent.toLocaleLowerCase().includes(normalized);
    });
  }
}
function onYearRangeChange(event) {
  const from = $("year-from"); const to = $("year-to");
  if (from.value && to.value && Number(from.value) > Number(to.value)) {
    if (event.target === from) to.value = from.value;
    else from.value = to.value;
  }
  updateFilters();
}
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function safeURL(value) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } }
function render() {
  const q = state.query.toLocaleLowerCase();
  state.filtered = state.rows.filter((row) => {
    const year = Number(row[columns.year]);
    if (state.filters.yearFrom && year < Number(state.filters.yearFrom)) return false;
    if (state.filters.yearTo && year > Number(state.filters.yearTo)) return false;
    if (state.filters.venues.size && ![...state.filters.venues].some((value) => {
      const selected = venueFilterOptions.get(value);
      return selected && clean(row[columns.venue]) === selected.venue && getVenueTier(row) === selected.tier;
    })) return false;
    if (state.filters.labels.size && !splitLabels(row[columns.labels]).some((label) => state.filters.labels.has(label))) return false;
    return !q || Object.values(row).some((value) => String(value).toLocaleLowerCase().includes(q));
  });
  const key = state.sort; const direction = state.direction === "asc" ? 1 : -1;
  state.filtered.sort((a, b) => {
    if (key === columns.year) return ((Number(a[key]) || 0) - (Number(b[key]) || 0)) * direction || clean(a[columns.title]).localeCompare(clean(b[columns.title]));
    return clean(a[key]).localeCompare(clean(b[key]), undefined, { numeric: true, sensitivity: "base" }) * direction;
  });
  const pages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE)); state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * PAGE_SIZE; const pageRows = state.filtered.slice(start, start + PAGE_SIZE);
  $("result-count").textContent = state.filtered.length.toLocaleString();
  $("hero-count").textContent = state.rows.length.toLocaleString();
  $("range-label").textContent = state.filtered.length ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, state.filtered.length)} of ${state.filtered.length.toLocaleString()} papers` : "No papers match these filters";
  $("page-label").textContent = `${state.page} / ${pages}`;
  $("prev").disabled = state.page <= 1; $("next").disabled = state.page >= pages;
  $("papers-body").innerHTML = pageRows.length ? pageRows.map(renderRow).join("") : `<tr><td colspan="6" class="empty-state"><span class="empty-icon">⌕</span><strong>No papers found</strong><span>Try broadening your search or clearing a filter.</span></td></tr>`;
  document.querySelectorAll(".sort-button").forEach((button) => {
    const active = button.dataset.sort === state.sort; button.classList.toggle("sorted", active);
    button.querySelector(".sort-indicator").textContent = active ? (state.direction === "asc" ? "↑" : "↓") : "↕";
    button.setAttribute("aria-sort", active ? (state.direction === "asc" ? "ascending" : "descending") : "none");
  });
  const chips = [];
  if (state.filters.yearFrom || state.filters.yearTo) chips.push(`<button class="filter-chip" data-clear="year">${escapeHTML(state.filters.yearFrom || "Any")}–${escapeHTML(state.filters.yearTo || "Any")} <span>×</span></button>`);
  for (const value of state.filters.venues) {
    const selected = venueFilterOptions.get(value);
    if (selected) chips.push(`<button class="filter-chip" data-clear="venue" data-value="${value}">${escapeHTML(selected.venue)} <span>×</span></button>`);
  }
  for (const label of state.filters.labels) chips.push(`<button class="filter-chip" data-clear="topic" data-value="${escapeHTML(label)}">${escapeHTML(label)} <span>×</span></button>`);
  $("active-filters").innerHTML = chips.join("");
}
function renderRow(row) {
  const title = clean(row[columns.title]) || "Untitled paper"; const authors = clean(row[columns.authors]) || "Author details unavailable";
  const venue = clean(row[columns.venue]); const year = clean(row[columns.year]); const doi = clean(row[columns.doi]);
  const doiURL = doi ? safeURL(`https://doi.org/${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "")}`) : "";
  const paperURL = safeURL(row[columns.url]);
  const links = [doiURL ? `<a class="paper-link doi-link" href="${escapeHTML(doiURL)}" target="_blank" rel="noopener noreferrer" title="Open DOI">DOI <span>↗</span></a><br>` : "", paperURL ? `<a class="paper-link" href="${escapeHTML(paperURL)}" target="_blank" rel="noopener noreferrer" title="Open paper">Paper <span>↗</span></a>` : ""].filter(Boolean).join("");
  const labels = splitLabels(row[columns.labels]).map((label) => `<button class="topic" data-topic="${escapeHTML(label)}">${escapeHTML(label)}</button>`).join("");
  return `<tr><td class="title-cell"><span class="paper-index">${String(state.filtered.indexOf(row) + 1).padStart(2, "0")}</span><div><a class="paper-title" href="${escapeHTML(paperURL || doiURL || "#")}" ${paperURL || doiURL ? 'target="_blank" rel="noopener noreferrer"' : ""}>${escapeHTML(title)}</a>${doi ? `<span class="doi-mobile">${escapeHTML(doi)}</span>` : ""}</div></td><td class="authors-cell" title="${escapeHTML(authors)}">${escapeHTML(authors)}</td><td class="year-cell">${escapeHTML(year || "—")}</td><td class="venue-cell">${venue ? `<span class="venue-mark">${escapeHTML(venue.slice(0, 1).toUpperCase())}</span><span>${escapeHTML(venue)}</span>` : "—"}</td><td class="topics-cell">${labels || '<span class="muted">—</span>'}</td><td class="links-cell">${links || '<span class="muted">—</span>'}</td></tr>`;
}
function updateFilters() {
  state.filters.yearFrom = $("year-from").value;
  state.filters.yearTo = $("year-to").value;
  state.filters.venues = readChecked("venue-options-list");
  state.filters.labels = readChecked("topic-options-list");
  state.page = 1;
  syncMultiSelectControls();
  render();
}
async function init() {
  try {
    const response = await fetch("papers.csv"); if (!response.ok) throw new Error("The dataset could not be loaded.");
    state.rows = parseCSV(await response.text());
    if (!state.rows.length) throw new Error("No papers were found in the dataset.");
    fillYearRange(uniqueValues(columns.year));
    fillVenueOptions();
    fillTopicOptions();
    const years = uniqueValues(columns.year).map(Number).filter(Boolean); $("year-range").textContent = years.length ? `${Math.min(...years)}—${Math.max(...years)}` : "All years";
    render();
  } catch (error) {
    $("papers-body").innerHTML = `<tr><td colspan="6" class="load-error"><strong>We couldn’t load the library.</strong><span>${escapeHTML(error.message)} Make sure the site is served over HTTP and papers.csv is beside index.html.</span></td></tr>`;
    $("range-label").textContent = "Collection unavailable";
  }
}
$("search").addEventListener("input", (event) => { state.query = event.target.value.trim(); state.page = 1; render(); });
$("year-from").addEventListener("change", onYearRangeChange);
$("year-to").addEventListener("change", onYearRangeChange);
$("venue-options-list").addEventListener("change", updateFilters);
$("topic-options-list").addEventListener("change", updateFilters);
$("venue-trigger").addEventListener("click", () => toggleFilterPopover("venue"));
$("topic-trigger").addEventListener("click", () => toggleFilterPopover("topic"));
document.querySelectorAll("[data-filter-search]").forEach((input) => input.addEventListener("input", () => filterMenuOptions(input.dataset.filterSearch, input.value)));
document.querySelectorAll("[data-clear-group]").forEach((button) => button.addEventListener("click", () => {
  const kind = button.dataset.clearGroup;
  if (kind === "venue") state.filters.venues.clear();
  if (kind === "topic") state.filters.labels.clear();
  syncMultiSelectControls();
  state.page = 1;
  render();
}));
$("reset").addEventListener("click", () => {
  $("search").value = "";
  document.querySelectorAll("[data-filter-search]").forEach((input) => { input.value = ""; filterMenuOptions(input.dataset.filterSearch, ""); });
  $("year-from").value = "";
  $("year-to").value = "";
  state.query = "";
  state.filters = { yearFrom: "", yearTo: "", venues: new Set(), labels: new Set() };
  syncMultiSelectControls();
  closeFilterPopovers();
  state.page = 1;
  render();
});
document.querySelectorAll(".sort-button").forEach((button) => button.addEventListener("click", () => { const key = button.dataset.sort; if (state.sort === key) state.direction = state.direction === "asc" ? "desc" : "asc"; else { state.sort = key; state.direction = key === columns.year ? "desc" : "asc"; } render(); }));
$("prev").addEventListener("click", () => { state.page--; render(); }); $("next").addEventListener("click", () => { state.page++; render(); });
$("active-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-clear]");
  if (!button) return;
  if (button.dataset.clear === "year") { $("year-from").value = ""; $("year-to").value = ""; }
  if (button.dataset.clear === "venue") state.filters.venues.delete(button.dataset.value);
  if (button.dataset.clear === "topic") state.filters.labels.delete(button.dataset.value);
  syncMultiSelectControls();
  state.page = 1;
  render();
});
$("papers-body").addEventListener("click", (event) => {
  const button = event.target.closest("[data-topic]");
  if (!button) return;
  state.filters.labels.add(button.dataset.topic);
  syncMultiSelectControls();
  state.page = 1;
  render();
  window.scrollTo({ top: document.querySelector(".library").offsetTop, behavior: "smooth" });
});
document.addEventListener("click", (event) => { if (!event.target.closest(".filter-menu")) closeFilterPopovers(); });
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("search").focus(); }
  if (event.key === "Escape") { closeFilterPopovers(); $("search").blur(); }
});
init();
