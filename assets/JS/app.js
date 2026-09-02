
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

  inputId.value = task.id;
  inputTitle.value = task.title;
  inputDescription.value = task.description || '';
  
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