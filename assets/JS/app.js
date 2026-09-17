const API_URL = 'http://localhost:3000/tasks';

const FEEDBACKS = {
  concluir: {
    src: './img/blz.jpg',
    label: 'MISSÃO CONCLUÍDA!',
    duration: 1500
  },
  editar: {
    src: 'https://i.pinimg.com/originals/2b/cc/0e/2bcc0e11960ebe99ec2c4d402328a970.gif',
    label: 'MODO EDIÇÃO ATIVADO!',
    duration: 1500
  },
  excluir: {
    src: './img/temCerteza.jpg',
    label: 'MISSÃO DELETADA!',
    duration: 1900
  }
};

const form = document.getElementById('task-form');
const inputId = document.getElementById('task-id');
const inputTitle = document.getElementById('task-title');
const inputDesc = document.getElementById('task-description');
const descriptionCount = document.getElementById('description-count');
const btnSave = document.getElementById('btn-save');
const btnSaveText = document.getElementById('btn-save-text');
const btnCancel = document.getElementById('btn-cancel');
const btnRetry = document.getElementById('btn-retry');

const taskList = document.getElementById('task-list');
const taskCounter = document.getElementById('task-counter');
const stateLoading = document.getElementById('state-loading');
const stateEmpty = document.getElementById('state-empty');
const stateError = document.getElementById('state-error');

const feedbackOverlay = document.getElementById('feedback-overlay');
const feedbackImage = document.getElementById('feedback-image');
const feedbackLabel = document.getElementById('feedback-label');

const deleteModal = document.getElementById('delete-modal');
const deleteConfirm = document.getElementById('delete-confirm');
const deleteCancel = document.getElementById('delete-cancel');

let tasksData = [];
let feedbackTimer = null;
let pendingDeleteId = null;
let actionLocked = false;

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

function updateTaskCounter() {
  const total = tasksData.length;
  taskCounter.textContent = `${total} ${total === 1 ? 'MISSÃO' : 'MISSÕES'}`;
}

async function loadTasks() {
  showState('loading');

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);

    const data = await response.json();
    tasksData = Array.isArray(data) ? data : [];
    updateTaskCounter();

    if (tasksData.length === 0) {
      taskList.innerHTML = '';
      showState('empty');
      return;
    }

    renderTasks(tasksData);
    showState('list');
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

    return `
      <li class="task-item${completedClass}" data-task-id="${safeId}">
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
          >
            ${task.completed ? 'Desfazer' : 'Concluir'}
          </button>

          <button
            type="button"
            class="pixel-btn pixel-btn-info"
            data-action="edit"
            data-id="${safeId}"
          >
            Editar
          </button>

          <button
            type="button"
            class="pixel-btn pixel-btn-danger"
            data-action="delete"
            data-id="${safeId}"
          >
            Excluir
          </button>
        </div>
      </li>
    `;
  }).join('');
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Erro HTTP ${response.status}`);
  }
  return response;
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
  btnSaveText.textContent = editing ? 'Salvar Alterações' : 'Lançar Missão';
  btnCancel.hidden = !editing;
}

function resetForm() {
  form.reset();
  inputId.value = '';
  descriptionCount.textContent = '0';
  setFormMode('create');
}

function editTask(id) {
  const task = tasksData.find(item => String(item.id) === String(id));
  if (!task) return;

  inputId.value = task.id;
  inputTitle.value = task.title || '';
  inputDesc.value = task.description || '';
  descriptionCount.textContent = String(inputDesc.value.length);
  setFormMode('edit');

  showFeedback('editar');
  document.querySelector('.mission-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.setTimeout(() => inputTitle.focus(), 250);
}

async function toggleTask(id, triggerButton) {
  const task = tasksData.find(item => String(item.id) === String(id));
  if (!task || actionLocked) return;

  actionLocked = true;
  triggerButton.disabled = true;

  const nextCompleted = !task.completed;

  try {
    await updateTaskAPI(id, {
      completed: nextCompleted,
      updatedAt: getNowISO()
    });

    if (nextCompleted) {
      showFeedback('concluir');
    }

    await loadTasks();
  } catch (error) {
    console.error('Falha ao atualizar missão:', error);
    alert('Não foi possível atualizar a missão. Tente novamente.');
  } finally {
    actionLocked = false;
    triggerButton.disabled = false;
  }
}

function openDeleteModal(id) {
  if (actionLocked) return;
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
  if (!pendingDeleteId || actionLocked) return;

  const id = pendingDeleteId;
  actionLocked = true;
  deleteConfirm.disabled = true;
  deleteCancel.disabled = true;

  try {
    await deleteTaskAPI(id);
    closeDeleteModal();
    showFeedback('excluir');
    await loadTasks();
  } catch (error) {
    console.error('Falha ao excluir missão:', error);
    alert('Não foi possível excluir a missão. Tente novamente.');
  } finally {
    actionLocked = false;
    deleteConfirm.disabled = false;
    deleteCancel.disabled = false;
  }
}

function hideFeedback() {
  if (feedbackTimer) {
    clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }

  feedbackOverlay.classList.remove('is-visible');
  feedbackOverlay.hidden = true;
  feedbackOverlay.setAttribute('aria-hidden', 'true');
  feedbackImage.removeAttribute('src');
}

function showFeedback(action) {
  const feedback = FEEDBACKS[action];
  if (!feedback) return;

  hideFeedback();

  feedbackImage.src = feedback.src;
  feedbackImage.alt = feedback.label;
  feedbackLabel.textContent = feedback.label;
  feedbackOverlay.hidden = false;
  feedbackOverlay.setAttribute('aria-hidden', 'false');

  requestAnimationFrame(() => {
    feedbackOverlay.classList.add('is-visible');
  });

  feedbackTimer = window.setTimeout(hideFeedback, feedback.duration);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (actionLocked) return;

  const title = inputTitle.value.trim();
  const description = inputDesc.value.trim();
  const id = inputId.value.trim();

  if (!title) {
    inputTitle.focus();
    return;
  }

  actionLocked = true;
  btnSave.disabled = true;

  try {
    if (id) {
      await updateTaskAPI(id, {
        title,
        description,
        updatedAt: getNowISO()
      });
    } else {
      await createTaskAPI({
        id: generateId(),
        title,
        description,
        completed: false,
        createdAt: getNowISO(),
        updatedAt: getNowISO()
      });
    }

    resetForm();
    await loadTasks();
  } catch (error) {
    console.error('Falha ao salvar missão:', error);
    alert('Não foi possível salvar a missão. Verifique se a API está ligada.');
  } finally {
    actionLocked = false;
    btnSave.disabled = false;
  }
});

taskList.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'edit') editTask(id);
  if (action === 'toggle') toggleTask(id, button);
  if (action === 'delete') openDeleteModal(id);
});

inputDesc.addEventListener('input', () => {
  descriptionCount.textContent = String(inputDesc.value.length);
});

btnCancel.addEventListener('click', resetForm);
btnRetry.addEventListener('click', loadTasks);
deleteCancel.addEventListener('click', closeDeleteModal);
deleteConfirm.addEventListener('click', confirmDelete);

feedbackOverlay.addEventListener('click', event => {
  if (event.target === feedbackOverlay) hideFeedback();
});

deleteModal.addEventListener('click', event => {
  if (event.target === deleteModal && !actionLocked) closeDeleteModal();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (!feedbackOverlay.hidden) hideFeedback();
    if (!deleteModal.hidden && !actionLocked) closeDeleteModal();
  }
});

document.addEventListener('DOMContentLoaded', loadTasks);
