const API_URL = 'http://localhost:3000/tasks';

const form = document.getElementById('task-form');
const inputId = document.getElementById('task-id');
const inputTitle = document.getElementById('task-title');
const inputDesc = document.getElementById('task-description');
const btnCancel = document.getElementById('btn-cancel');
const btnSave = document.getElementById('btn-save');

const taskList = document.getElementById('task-list');
const stateLoading = document.getElementById('state-loading');
const stateEmpty = document.getElementById('state-empty');
const stateError = document.getElementById('state-error');
const btnRetry = document.getElementById('btn-retry');

let tasksData = [];

document.addEventListener('DOMContentLoaded', loadTasks);
btnRetry.addEventListener('click', loadTasks);
btnCancel.addEventListener('click', resetForm);

function showState(state) {
  stateLoading.hidden = state !== 'loading';
  stateEmpty.hidden = state !== 'empty';
  stateError.hidden = state !== 'error';
  taskList.hidden = state !== 'list';
}

async function loadTasks() {
  showState('loading');
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Erro ao buscar dados');
    
    tasksData = await response.json();
    
    if (tasksData.length === 0) {
      showState('empty');
    } else {
      renderTasks(tasksData);
      showState('list');
    }
  } catch (error) {
    console.error(error);
    showState('error');
  }
}

function renderTasks(tasks) {
  taskList.innerHTML = '';
  
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = task.completed ? 'task-completed' : '';
    
    const createdDate = new Date(task.createdAt).toLocaleDateString('pt-BR');
    
    li.innerHTML = `
      <div class="task-content">
        <h3 style="text-decoration: ${task.completed ? 'line-through' : 'none'}; color: ${task.completed ? '#777' : 'inherit'}">
          ${task.title}
        </h3>
        ${task.description ? `<p style="font-size: 0.9em; margin-top: 5px;">${task.description}</p>` : ''}
        <small style="font-size: 0.7em; color: #555; display: block; margin-top: 5px;">Criada em: ${createdDate}</small>
      </div>
      <div class="task-actions" style="display: flex; gap: 5px;">
        <button class="btn btn-warning" onclick="toggleTask('${task.id}')" title="Marcar como concluída/pendente">
          ${task.completed ? '↩️ Desfazer' : '✅ Concluir'}
        </button>
        <button class="btn" style="background-color: var(--sky-blue);" onclick="editTask('${task.id}')" title="Editar Missão">
          ✏️ Editar
        </button>
        <button class="btn btn-danger" onclick="deleteTask('${task.id}')" title="Apagar Missão">
          🗑️ Excluir
        </button>
      </div>
    `;
    
    taskList.appendChild(li);
  });
}

const generateId = () => 'tsk_' + Math.random().toString(36).substr(2, 9);
const getNowISO = () => new Date().toISOString();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const titleValue = inputTitle.value.trim();
  const descValue = inputDesc.value.trim();
  const idValue = inputId.value;

  if (!titleValue) {
    alert('O título da missão é obrigatório!');
    return;
  }

  const taskData = {
    title: titleValue,
    description: descValue,
    updatedAt: getNowISO()
  };

  try {
    if (idValue) {
      await updateTaskAPI(idValue, taskData);
    } else {
      taskData.id = generateId();
      taskData.completed = false;
      taskData.createdAt = getNowISO();
      await createTaskAPI(taskData);
    }
    
    resetForm();
    await loadTasks(); 
  } catch (error) {
    alert('Ocorreu um erro ao salvar a missão. O monstro da rede atacou!');
    console.error(error);
  }
});

async function createTaskAPI(task) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  if (!response.ok) throw new Error('Erro ao criar tarefa');
}

window.editTask = (id) => {
  const task = tasksData.find(t => t.id === id);
  if (!task) return;

  // Chama o feedback de edição
  showFeedback('editar');

  inputId.value = task.id;
  inputTitle.value = task.title;
  inputDesc.value = task.description || ''; // Corrigido aqui (era inputDescription)
  
  btnSave.innerHTML = '💾 Salvar Alterações';
  btnCancel.hidden = false;
  
  document.getElementById('form-title').scrollIntoView({ behavior: 'smooth' });
};

async function updateTaskAPI(id, updates) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Erro ao atualizar tarefa');
}

window.toggleTask = async (id) => {
  const task = tasksData.find(t => t.id === id);
  if (!task) return;

  // Chama o feedback apenas se estiver concluindo a missão
  if (!task.completed) {
    showFeedback('concluir');
  }

  const updates = {
    completed: !task.completed,
    updatedAt: getNowISO()
  };

  try {
    await updateTaskAPI(id, updates);
    await loadTasks();
  } catch (error) {
    alert('Erro ao atualizar o status da missão.');
  }
};

window.deleteTask = async (id) => {
  const confirmDelete = confirm('⚠️ Tem certeza que deseja abandonar esta missão permanentemente?');
  
  if (!confirmDelete) return;

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Erro ao deletar tarefa');
    
    // Chama o feedback de exclusão
    showFeedback('excluir');
    
    await loadTasks();
  } catch (error) {
    alert('Erro ao excluir a missão.');
    console.error(error);
  }
};

function resetForm() {
  form.reset();
  inputId.value = '';
  btnSave.innerHTML = '🚀 Lançar Missão';
  btnCancel.hidden = true;
}

// ==========================================
// SISTEMA DE FEEDBACK VISUAL
// ==========================================
function showFeedback(action) {
  const feedbackOverlay = document.getElementById('feedback-overlay');
  const feedbackImage = document.getElementById('feedback-image');
  const feedbackText = document.getElementById('feedback-text');

  // Dicionário de imagens e textos baseados na ação
  const feedbacks = {
    concluir: {
      img: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjM4cW9wZ251eGpxbTZ0amNwbnNqYmZwcGJzMnZwcGFxM3V6Z29wMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LMB3W50H8F53cOWTjX/giphy.gif', // GIF de Moeda/Sucesso
      text: 'Missão Cumprida! +50 XP'
    },
    editar: {
      img: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWJ5YnB2OWgwaTV4M2s0ZGhjZGV4bGN5YmRxdGNxdXN6Y21rYW1hNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26h0pQdlddhWYJfgc/giphy.gif', // GIF de Engrenagem/Ferramenta
      text: 'Forjando nova estratégia...'
    },
    excluir: {
      img: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExOThweTNnYnVpM3VnbHpjdnQ0c2NwbGF6amMyaG1sYXd5cXF6YXZvNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/HhTXt43pk1I1W/giphy.gif', // GIF de Explosão
      text: 'Missão Destruída!'
    }
  };

  const fb = feedbacks[action];
  if (!fb) return;

  // Atualiza conteúdo
  feedbackImage.src = fb.img;
  feedbackText.textContent = fb.text;
  
  // Exibe o overlay
  feedbackOverlay.hidden = false;

  // Reseta a animação para garantir que rode sempre que clicar
  feedbackOverlay.style.animation = 'none';
  feedbackOverlay.offsetHeight; // Força o reflow do navegador
  feedbackOverlay.style.animation = 'popInOut 1.5s ease-in-out forwards';

  // Oculta novamente após 1.5 segundos (tempo da animação CSS)
  setTimeout(() => {
    feedbackOverlay.hidden = true;
  }, 60500);
}