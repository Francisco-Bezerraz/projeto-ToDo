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


// Controle de clicks


let tasksData = [];
let feedbackTimeout;


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

  showFeedback('editar');

  inputId.value = task.id;
  inputTitle.value = task.title;
  inputDesc.value = task.description || ''; 
  
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

// Nova lógica que aciona a confirmação imersiva
window.deleteTask = (id) => {
  askDeleteConfirm(id);
};

// Executa a deleção na API apenas se o usuário confirmar
async function executeDelete(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Erro ao deletar tarefa');
    
    // Após deletar, mostra o feedback de sucesso de exclusão por 3 segundos
    showFeedback('excluir');
    await loadTasks();
  } catch (error) {
    alert('Erro ao excluir a missão.');
    console.error(error);
  }
}

function resetForm() {
  form.reset();
  inputId.value = '';
  btnSave.innerHTML = '🚀 Lançar Missão';
  btnCancel.hidden = true;
}


function askDeleteConfirm(id) {
  const feedbackOverlay = document.getElementById('feedback-overlay');
  const feedbackImage = document.getElementById('feedback-image');

  // Limpa qualquer timer ativo
  if (feedbackTimeout) clearTimeout(feedbackTimeout);

  // Define a imagem da bomba/explosão para a pergunta
  feedbackImage.src = './img/temCerteza.jpg';
  
  // Mostra o overlay e trava a animação para ele NÃO sumir sozinho
  feedbackOverlay.hidden = false;
  feedbackOverlay.style.animation = 'none';

  // Remove botões de confirmação antigos se existirem
  const oldBtns = document.getElementById('custom-confirm-btns');
  if (oldBtns) oldBtns.remove();

  // Cria a área dos botões de Sim/Não
  const btnContainer = document.createElement('div');
  btnContainer.id = 'custom-confirm-btns';
  btnContainer.style.display = 'flex';
  btnContainer.style.gap = '20px';
  btnContainer.style.marginTop = '30px'; 

  const btnYes = document.createElement('button');
  btnYes.className = 'btn btn-danger';
  btnYes.textContent = '🔥 Sim, Detonar!';
  btnYes.onclick = async () => {
    btnContainer.remove(); 
    await executeDelete(id);
  };

  const btnNo = document.createElement('button');
  btnNo.className = 'btn btn-warning';
  btnNo.textContent = '🛡️ Não, Valeu';
  btnNo.onclick = () => {
    btnContainer.remove();
    feedbackOverlay.hidden = true;
  };

  btnContainer.appendChild(btnNo);
  btnContainer.appendChild(btnYes);
  feedbackOverlay.appendChild(btnContainer);
}

function showFeedback(action) {
  const feedbackOverlay = document.getElementById('feedback-overlay');
  const feedbackImage = document.getElementById('feedback-image');

  const feedbacks = {
    concluir: { img: './img/blz.jpg' },
    editar: { img: 'https://i.pinimg.com/originals/2b/cc/0e/2bcc0e11960ebe99ec2c4d402328a970.gif' },
    excluir: { img: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExOThweTNnYnVpM3VnbHpjdnQ0c2NwbGF6amMyaG1sYXd5cXF6YXZvNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/HhTXt43pk1I1W/giphy.gif' }
  };

  const fb = feedbacks[action];
  if (!fb) return;

  feedbackImage.src = fb.img;
  
  
  const oldBtns = document.getElementById('custom-confirm-btns');
  if (oldBtns) oldBtns.remove();

  feedbackOverlay.hidden = false;

 
  feedbackOverlay.style.animation = 'none';
  void feedbackOverlay.offsetWidth; 
  feedbackOverlay.style.animation = 'fadeSlowly 10s ease-in-out forwards';

  if (feedbackTimeout) {
    clearTimeout(feedbackTimeout);
  }

 
  feedbackTimeout = setTimeout(() => {
    feedbackOverlay.hidden = true;
  }, 700);
}