// Task Manager Extended - talks to the Supabase REST API (PostgREST) with fetch().
// The public Supabase settings are read from config.json (no secret keys here).

let restBase = "";
let headers = {};
let editingId = null; // null = the form creates a task, a number = it edits that task
let categories = [];

const $ = (id) => document.getElementById(id);

function setStatus(message, isError = false) {
  const el = $("status-message");
  el.textContent = message;
  el.classList.toggle("error", isError);
}

async function loadConfig() {
  const response = await fetch("config.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load config.json (HTTP " + response.status + ").");
  const config = await response.json();
  restBase = config.supabaseUrl.replace(/\/+$/, "") + "/rest/v1";
  headers = {
    apikey: config.supabasePublishableKey,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

// One helper for every REST call: api("GET", "/tasks?select=*")
async function api(method, path, body) {
  const options = { method, headers };
  if (body !== undefined) options.body = JSON.stringify(body);
  const response = await fetch(restBase + path, options);
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try { detail = JSON.parse(text).message || text; } catch (_) { /* not JSON */ }
    throw new Error(method + " " + path + " failed (HTTP " + response.status + "): " + detail);
  }
  return text ? JSON.parse(text) : null;
}

// ---------- REST operations ----------

// GET /categories?select=*
const getCategories = () => api("GET", "/categories?select=*&order=id.asc");

// POST /categories
const createCategory = (name) => api("POST", "/categories", { name });

// GET /tasks?select=*,categories(name)            all tasks with their category name
// GET /tasks?...&category_id=eq.1                 tasks of one category
// GET /tasks?...&completed=eq.false               incomplete tasks
function getTasks() {
  let query = "/tasks?select=*,categories(name)&order=id.asc";
  const category = $("filter-category").value;
  const status = $("filter-status").value;
  if (category !== "all") query += "&category_id=eq." + category;
  if (status === "incomplete") query += "&completed=eq.false";
  if (status === "completed") query += "&completed=eq.true";
  return api("GET", query);
}

// POST /tasks
const createTask = (task) => api("POST", "/tasks", task);

// PATCH /tasks?id=eq.1   (edit a task, change its category, toggle completed)
const updateTask = (id, changes) => api("PATCH", "/tasks?id=eq." + id, changes);

// DELETE /tasks?id=eq.1
const deleteTask = (id) => api("DELETE", "/tasks?id=eq." + id);

// ---------- rendering ----------

function fillCategorySelects() {
  const formSelect = $("task-category");
  const filterSelect = $("filter-category");
  const formValue = formSelect.value;
  const filterValue = filterSelect.value || "all";

  formSelect.innerHTML = "";
  filterSelect.innerHTML = "";

  const all = new Option("All categories", "all");
  filterSelect.add(all);

  categories.forEach((c) => {
    formSelect.add(new Option(c.name, c.id));
    filterSelect.add(new Option(c.name, c.id));
  });

  if (formValue) formSelect.value = formValue;
  filterSelect.value = filterValue;

  $("category-list").textContent = categories.length
    ? "Available: " + categories.map((c) => c.name).join(", ")
    : "No categories yet.";
}

function renderTasks(tasks) {
  const list = $("task-list");
  list.innerHTML = "";
  if (tasks.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No tasks match the current filters.";
    list.appendChild(li);
    return;
  }

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task" + (task.completed ? " completed" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "toggle-task";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Mark task completed");
    checkbox.addEventListener("change", () => run(async () => {
      await updateTask(task.id, { completed: checkbox.checked });
      await refreshTasks();
    }, "Task updated."));

    const body = document.createElement("div");
    body.className = "task-body";
    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;
    body.appendChild(title);
    if (task.description) {
      const desc = document.createElement("div");
      desc.className = "task-desc";
      desc.textContent = task.description;
      body.appendChild(desc);
    }
    const badge = document.createElement("span");
    badge.className = "category-badge";
    badge.textContent = task.categories ? task.categories.name : "No category";
    body.appendChild(badge);

    const actions = document.createElement("div");
    actions.className = "actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "secondary";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => startEdit(task));
    const del = document.createElement("button");
    del.type = "button";
    del.className = "danger";
    del.textContent = "Delete";
    del.addEventListener("click", () => run(async () => {
      await deleteTask(task.id);
      if (editingId === task.id) resetForm();
      await refreshTasks();
    }, "Task deleted."));
    actions.append(edit, del);

    li.append(checkbox, body, actions);
    list.appendChild(li);
  });
}

async function refreshTasks() {
  renderTasks(await getTasks());
}

// ---------- form ----------

function startEdit(task) {
  editingId = task.id;
  $("task-title").value = task.title;
  $("task-description").value = task.description || "";
  if (task.category_id !== null) $("task-category").value = task.category_id;
  $("form-title").textContent = "Edit task";
  $("task-submit").textContent = "Save changes";
  $("task-cancel").hidden = false;
  $("task-title").focus();
}

function resetForm() {
  editingId = null;
  $("task-form").reset();
  $("form-title").textContent = "Add task";
  $("task-submit").textContent = "Add task";
  $("task-cancel").hidden = true;
}

// Runs an action, shows a success or error message.
async function run(action, successMessage) {
  try {
    await action();
    setStatus(successMessage);
  } catch (error) {
    setStatus(error.message, true);
  }
}

$("task-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const task = {
    title: $("task-title").value.trim(),
    description: $("task-description").value.trim() || null,
    category_id: Number($("task-category").value),
  };
  if (!task.title) return setStatus("Title is required.", true);

  run(async () => {
    if (editingId === null) await createTask(task);
    else await updateTask(editingId, task);
    resetForm();
    await refreshTasks();
  }, editingId === null ? "Task added." : "Task updated.");
});

$("task-cancel").addEventListener("click", resetForm);

$("category-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("category-name").value.trim();
  if (!name) return setStatus("Category name is required.", true);
  run(async () => {
    await createCategory(name);
    $("category-name").value = "";
    categories = await getCategories();
    fillCategorySelects();
  }, "Category added.");
});

$("filter-category").addEventListener("change", () => run(refreshTasks, "Filter applied."));
$("filter-status").addEventListener("change", () => run(refreshTasks, "Filter applied."));

// ---------- start ----------

(async () => {
  try {
    await loadConfig();
    categories = await getCategories();
    fillCategorySelects();
    await refreshTasks();
  } catch (error) {
    setStatus(error.message, true);
  }
})();
