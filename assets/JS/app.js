const API_URL = 'http://localhost:3000/tasks';

const form = document.getElementById('task-form');
const inputId = document.getElementById('task-id');
const inputTitle = document.getElementById('task-title');
const inputDesc = document.getElementById('task-description');
const descriptionCount = document.getElementById('description-count');
const btnSave = document.getElementById('btn-save');
const btnSaveText = document.getElementById('btn-save-text');
const btnCancel = document.getElementById('btn-cancel');
const btnRetry = document.getElementById('btn-retry');
const editFeedback = document.getElementById('edit-feedback');

const taskList = document.getElementById('task-list');
const taskCounter = document.getElementById('task-counter');
const stateLoading = document.getElementById('state-loading');
const stateEmpty = document.getElementById('state-empty');
const stateError = document.getElementById('state-error');

const deleteModal = document.getElementById('delete-modal');
const deleteConfirm = document.getElementById('delete-confirm');
const deleteCancel = document.getElementById('delete-cancel');

let tasksData = [];
let pendingDeleteId = null;
const pendingActions = new Set();

function getNowISO() {
  return new Date().toISOString();
}

function generateId() {
  if (window.crypto?.randomUUID) {
    return `tsk_${window.crypto.randomUUID()}`;
  }

  return `tsk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHTML(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return 'sem data';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'sem data';

  return date.toLocaleDateString('pt-BR');
}

function showState(state) {
  stateLoading.hidden = state !== 'loading';
  stateEmpty.hidden = state !== 'empty';
  stateError.hidden = state !== 'error';
  taskList.hidden = state !== 'list';
}

function syncView() {
  const total = tasksData.length;
  taskCounter.textContent = `${total} ${total === 1 ? 'MISSÃO' : 'MISSÕES'}`;

  if (total === 0) {
    taskList.innerHTML = '';
    showState('empty');
    return;
  }

  renderTasks(tasksData);
  showState('list');
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadTasks() {
  showState('loading');

  try {
    const response = await request(API_URL);
    const data = await response.json();

    tasksData = Array.isArray(data) ? data : [];
    syncView();
  } catch (error) {
    console.error('Falha ao carregar tarefas:', error);
    showState('error');
  }
}

function renderTasks(tasks) {
  taskList.innerHTML = tasks.map(task => {
    const safeId = escapeHTML(task.id);
    const safeTitle = escapeHTML(task.title);
    const safeDescription = escapeHTML(task.description || '');
    const createdDate = formatDate(task.createdAt);
    const completedClass = task.completed ? ' task-completed' : '';
    const busy = pendingActions.has(String(task.id));

    return `
      <li class="task-item${completedClass}" data-task-id="${safeId}">
        ${task.completed ? `
          <div class="completed-feedback">
            <img src="/img/blz.jpg" alt="Missão concluída">
            <span>MISSÃO CONCLUÍDA!</span>
          </div>
        ` : ''}

        <div class="task-main">
          <div class="task-content">
            <div class="task-title-row">
              <span class="task-check" aria-hidden="true"></span>
              <h3>${safeTitle}</h3>
            </div>

            ${safeDescription ? `<p>${safeDescription}</p>` : ''}
            <span class="task-meta">Criada em: ${createdDate}</span>
          </div>

          <div class="task-actions">
            <button
              type="button"
              class="pixel-btn pixel-btn-warning"
              data-action="toggle"
              data-id="${safeId}"
              ${busy ? 'disabled' : ''}
            >
              ${task.completed ? 'Desfazer' : 'Concluir'}
            </button>

            <button
              type="button"
              class="pixel-btn pixel-btn-info"
              data-action="edit"
              data-id="${safeId}"
              ${busy ? 'disabled' : ''}
            >
              Editar
            </button>

            <button
              type="button"
              class="pixel-btn pixel-btn-danger"
              data-action="delete"
              data-id="${safeId}"
              ${busy ? 'disabled' : ''}
            >
              Excluir
            </button>
          </div>
        </div>
      </li>
    `;
  }).join('');
}

function createTaskAPI(task) {
  return request(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
}

function updateTaskAPI(id, updates) {
  return request(`${API_URL}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
}

function deleteTaskAPI(id) {
  return request(`${API_URL}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

function setFormMode(mode) {
  const editing = mode === 'edit';

  btnSaveText.textContent = editing
    ? 'Salvar Alterações'
    : 'Lançar Missão';

  btnCancel.hidden = !editing;
  editFeedback.hidden = !editing;
}

function resetForm() {
  form.reset();
  inputId.value = '';
  descriptionCount.textContent = '0';
  setFormMode('create');
}

function editTask(id) {
  const task = tasksData.find(item => String(item.id) === String(id));
  if (!task || pendingActions.has(String(id))) return;

  inputId.value = task.id;
  inputTitle.value = task.title || '';
  inputDesc.value = task.description || '';
  descriptionCount.textContent = String(inputDesc.value.length);

  setFormMode('edit');

  document
    .querySelector('.mission-form-card')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  setTimeout(() => inputTitle.focus(), 200);
}

async function toggleTask(id) {
  const key = String(id);
  const taskIndex = tasksData.findIndex(item => String(item.id) === key);

  if (taskIndex === -1 || pendingActions.has(key)) return;

  const previousTask = { ...tasksData[taskIndex] };
  const nextCompleted = !previousTask.completed;

  pendingActions.add(key);

  tasksData[taskIndex] = {
    ...previousTask,
    completed: nextCompleted,
    updatedAt: getNowISO()
  };

  // Atualiza a tela imediatamente.
  syncView();

  try {
    await updateTaskAPI(id, {
      completed: nextCompleted,
      updatedAt: tasksData[taskIndex]?.updatedAt || getNowISO()
    });
  } catch (error) {
    console.error('Falha ao atualizar missão:', error);

    const currentIndex = tasksData.findIndex(item => String(item.id) === key);

    if (currentIndex !== -1) {
      tasksData[currentIndex] = previousTask;
    }

    syncView();
    alert('Não foi possível atualizar a missão. A alteração foi desfeita.');
  } finally {
    pendingActions.delete(key);
    syncView();
  }
}

function openDeleteModal(id) {
  const key = String(id);
  if (pendingActions.has(key)) return;

  pendingDeleteId = id;
  deleteModal.hidden = false;
  document.body.style.overflow = 'hidden';
  deleteCancel.focus();
}

function closeDeleteModal() {
  pendingDeleteId = null;
  deleteModal.hidden = true;
  document.body.style.overflow = '';
}

async function confirmDelete() {
  if (!pendingDeleteId) return;

  const id = pendingDeleteId;
  const key = String(id);

  if (pendingActions.has(key)) return;

  const taskIndex = tasksData.findIndex(item => String(item.id) === key);

  if (taskIndex === -1) {
    closeDeleteModal();
    return;
  }

  const removedTask = tasksData[taskIndex];

  pendingActions.add(key);

  // Some da interface imediatamente.
  tasksData.splice(taskIndex, 1);
  syncView();
  closeDeleteModal();

  try {
    await deleteTaskAPI(id);
  } catch (error) {
    console.error('Falha ao excluir missão:', error);

    tasksData.splice(taskIndex, 0, removedTask);
    syncView();

    alert('Não foi possível excluir a missão. Ela foi restaurada.');
  } finally {
    pendingActions.delete(key);
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();

  const title = inputTitle.value.trim();
  const description = inputDesc.value.trim();
  const id = inputId.value.trim();

  if (!title) {
    inputTitle.focus();
    return;
  }

  btnSave.disabled = true;

  try {
    if (id) {
      const index = tasksData.findIndex(item => String(item.id) === String(id));

      const updates = {
        title,
        description,
        updatedAt: getNowISO()
      };

      await updateTaskAPI(id, updates);

      if (index !== -1) {
        tasksData[index] = {
          ...tasksData[index],
          ...updates
        };
      }
    } else {
      const newTask = {
        id: generateId(),
        title,
        description,
        completed: false,
        createdAt: getNowISO(),
        updatedAt: getNowISO()
      };

      await createTaskAPI(newTask);
      tasksData.push(newTask);
    }

    resetForm();
    syncView();
  } catch (error) {
    console.error('Falha ao salvar missão:', error);
    alert('Não foi possível salvar a missão. Verifique se a API está ligada.');
  } finally {
    btnSave.disabled = false;
  }
});

taskList.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'edit') editTask(id);
  if (action === 'toggle') toggleTask(id);
  if (action === 'delete') openDeleteModal(id);
});

inputDesc.addEventListener('input', () => {
  descriptionCount.textContent = String(inputDesc.value.length);
});

btnCancel.addEventListener('click', resetForm);
btnRetry.addEventListener('click', loadTasks);
deleteCancel.addEventListener('click', closeDeleteModal);
deleteConfirm.addEventListener('click', confirmDelete);

deleteModal.addEventListener('click', event => {
  if (event.target === deleteModal) {
    closeDeleteModal();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !deleteModal.hidden) {
    closeDeleteModal();
  }
});

document.addEventListener('DOMContentLoaded', loadTasks);
