// ==========================================
// ESTADO GLOBAL DO JOGO
// ==========================================
const gameState = {
    players: [],
    board: Array(8).fill().map(() => Array(11).fill('empty')),
    path: [],
    config: { 
        questionMode: 'auto', 
        questions: { color1: [], color2: [], color3: [], color4: [] },
        useTimer: true,
        timer: 30,
        randomize: false,
        noRepeat: true,
        winCondition: 'single' 
    }
};

let currentPlayerTurn = 0;
let gameStartedReal = false;
let currentQuestionIndices = { color1: 0, color2: 0, color3: 0, color4: 0 };
let timerInterval;
let isTimerPaused = false;
let finishRankCounter = 1;
let currentColorLanded = null;

// ==========================================
// TELA 1: CONSTRUTOR E RASTREAMENTO AO VIVO
// ==========================================
const boardBuilder = document.getElementById('board-builder');
let currentTool = 'empty';

document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTool = e.target.getAttribute('data-type');
    });
});

function initBoardBuilder() {
    boardBuilder.innerHTML = '';
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 11; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.dataset.type = gameState.board[y][x];
            
            cell.addEventListener('mousedown', () => paintCell(x, y, cell));
            cell.addEventListener('mouseenter', (e) => { if (e.buttons === 1) paintCell(x, y, cell); });
            boardBuilder.appendChild(cell);
        }
    }
    checkBoardColors();
    updateLivePathNumbers();
}

function paintCell(x, y, cellElement) {
    if (currentTool === 'start' || currentTool === 'end') {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 11; col++) {
                if (gameState.board[row][col] === currentTool) {
                    gameState.board[row][col] = 'empty';
                    const oldCell = document.querySelector(`.cell[data-x="${col}"][data-y="${row}"]`);
                    if (oldCell) oldCell.dataset.type = 'empty';
                }
            }
        }
    }
    gameState.board[y][x] = currentTool;
    cellElement.dataset.type = currentTool;
    
    checkBoardColors(); 
    updateLivePathNumbers();
}

function checkBoardColors() {
    let colorCounts = { color1: 0, color2: 0, color3: 0, color4: 0 };
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 11; x++) {
            let type = gameState.board[y][x];
            if (colorCounts[type] !== undefined) colorCounts[type]++;
        }
    }
    ['color1', 'color2', 'color3', 'color4'].forEach(color => {
        const textarea = document.getElementById(`q-${color}`);
        if (colorCounts[color] === 0) {
            textarea.disabled = true;
            textarea.value = ''; 
        } else {
            textarea.disabled = false;
        }
    });
}

// ==========================================
// RASTREAMENTO DO CAMINHO
// ==========================================
function calculatePath() {
    let tempPath = [];
    let startNode = null;

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 11; x++) {
            if (gameState.board[y][x] === 'start') startNode = {x, y, type: 'start'};
        }
    }
    if (!startNode) return [];

    let current = startNode;
    let visited = new Set();
    visited.add(`${current.x},${current.y}`);
    tempPath.push(current);

    let reachedEnd = false;
    while (!reachedEnd) {
        const neighbors = [
            {x: current.x, y: current.y-1}, {x: current.x, y: current.y+1},
            {x: current.x-1, y: current.y}, {x: current.x+1, y: current.y}
        ];

        let nextCell = null;
        for (let n of neighbors) {
            if (n.x >= 0 && n.x < 11 && n.y >= 0 && n.y < 8) {
                let type = gameState.board[n.y][n.x];
                if (type !== 'empty' && !visited.has(`${n.x},${n.y}`)) {
                    nextCell = {x: n.x, y: n.y, type};
                    break; 
                }
            }
        }

        if (nextCell) {
            visited.add(`${nextCell.x},${nextCell.y}`);
            tempPath.push(nextCell);
            current = nextCell;
            if (nextCell.type === 'end') reachedEnd = true;
        } else {
            break; 
        }
    }
    return tempPath;
}

function updateLivePathNumbers() {
    document.querySelectorAll('.cell').forEach(c => c.removeAttribute('data-step'));
    const tempPath = calculatePath();
    tempPath.forEach((node, index) => {
        const cell = document.querySelector(`.cell[data-x="${node.x}"][data-y="${node.y}"]`);
        if(cell) cell.dataset.step = index + 1;
    });
}

initBoardBuilder();

// ==========================================
// TELA 1: MODAIS E FORMULÁRIOS
// ==========================================
let tempSelectedAvatar = null;

document.getElementById('open-add-player-modal-btn').addEventListener('click', () => {
    document.getElementById('new-player-name').value = '';
    tempSelectedAvatar = null;
    renderAvatarGrid();
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('add-player-modal').classList.add('active');
});

document.getElementById('cancel-add-player-btn').addEventListener('click', closeAddPlayerModal);

function closeAddPlayerModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.getElementById('add-player-modal').classList.remove('active');
}

function renderAvatarGrid() {
    const grid = document.getElementById('avatar-selection-grid');
    grid.innerHTML = '';
    const usedAvatars = gameState.players.map(p => p.avatar);

    for (let i = 1; i <= 12; i++) {
        const avatarPath = `Avatar${i}.png`;
        const div = document.createElement('div');
        div.classList.add('avatar-option');
        
        div.innerHTML = `<img src="${avatarPath}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzU4NWI3MCIvPjwvc3ZnPg=='">`;
        
        if (usedAvatars.includes(avatarPath)) {
            div.classList.add('taken');
            div.title = "Já selecionado por outra equipe";
        } else {
            div.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                tempSelectedAvatar = avatarPath;
            });
        }
        grid.appendChild(div);
    }
}

document.getElementById('confirm-add-player-btn').addEventListener('click', () => {
    const name = document.getElementById('new-player-name').value.trim();
    if(!name) return alert("Digite o nome do jogador/equipe.");
    if(!tempSelectedAvatar) return alert("Selecione um token.");

    gameState.players.push({
        id: Date.now(), name: name, avatar: tempSelectedAvatar,
        pathIndex: 0, finished: false, finishPosition: null, score: { acertos: 0, erros: 0 }
    });
    
    updatePlayerPreview();
    closeAddPlayerModal();
});

function updatePlayerPreview() {
    const list = document.getElementById('player-list-preview');
    list.innerHTML = '';
    gameState.players.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `<img src="${p.avatar}" class="preview-mini-img"> <span>${p.name}</span>`;
        list.appendChild(li);
    });
}

document.getElementById('question-mode').addEventListener('change', (e) => {
    document.querySelector('.questions-grid').style.display = (e.target.value === 'auto') ? 'grid' : 'none';
});

document.getElementById('use-timer').addEventListener('change', (e) => {
    document.getElementById('timer-input-wrapper').style.opacity = e.target.checked ? '1' : '0.4';
    document.getElementById('question-timer').disabled = !e.target.checked;
});

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// ==========================================
// TRANSIÇÃO TELA 1 -> TELA 2
// ==========================================
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

document.getElementById('start-game-btn').addEventListener('click', () => {
    if(gameState.players.length === 0) return alert("Adicione pelo menos 1 jogador/equipe!");
    
    gameState.path = calculatePath();
    const hasEnd = gameState.path.some(n => n.type === 'end');
    
    if(!hasEnd) return alert("O caminho está quebrado! Conecte a Largada à Chegada preenchendo as casas adjacentes.");
    if(gameState.path.length < 12) return alert(`O tabuleiro possui apenas ${gameState.path.length} casas conectadas. O mínimo obrigatório é de 12 casas.`);

    gameState.config.questionMode = document.getElementById('question-mode').value;
    gameState.config.useTimer = document.getElementById('use-timer').checked;
    gameState.config.timer = parseInt(document.getElementById('question-timer').value) || 30;
    gameState.config.randomize = document.getElementById('randomize-questions').checked;
    gameState.config.noRepeat = document.getElementById('no-repeat-questions').checked;
    gameState.config.winCondition = document.querySelector('input[name="win-condition"]:checked').value;

    if(gameState.config.questionMode === 'auto') {
        ['color1', 'color2', 'color3', 'color4'].forEach(color => {
            const raw = document.getElementById(`q-${color}`).value;
            let questionsArr = raw.split('\n').filter(q => q.trim() !== '');
            if (gameState.config.randomize) shuffleArray(questionsArr);
            gameState.config.questions[color] = questionsArr;
        });
    }

    switchScreen('screen-game');
    initGameScreen(); 
});

// ==========================================
// TELA 2: LÓGICA DE JOGO E RENDERIZAÇÃO
// ==========================================
function initGameScreen() {
    const boardContainer = document.getElementById('game-board-container');
    boardContainer.innerHTML = '';
    const bigBoard = document.createElement('div');
    bigBoard.id = 'big-board';

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 11; x++) {
            const cell = document.createElement('div');
            cell.classList.add('game-cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.dataset.type = gameState.board[y][x];
            bigBoard.appendChild(cell);
        }
    }
    boardContainer.appendChild(bigBoard);

    renderSidebarAndDragDrop();
    updateTokensOnBoard();
    updateTurnUI();
}

function updateTokensOnBoard() {
    document.querySelectorAll('.avatar-token').forEach(t => t.remove());
    
    gameState.players.forEach(p => {
        const currentCoord = gameState.path[p.pathIndex];
        const cell = document.querySelector(`.game-cell[data-x="${currentCoord.x}"][data-y="${currentCoord.y}"]`);
        
        if (cell) {
            const token = document.createElement('div');
            token.classList.add('avatar-token');
            token.dataset.playerId = p.id;
            
            if (p.id === gameState.players[currentPlayerTurn].id) {
                token.classList.add('active-token');
            }
            
            token.title = p.name;
            token.innerHTML = `<img src="${p.avatar}" class="token-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzU4NWI3MCIvPjwvc3ZnPg=='">`;
            cell.appendChild(token);
        }
    });

    const board = document.getElementById('big-board');
    if (board && gameState.players.length > 0) {
        const activePlayer = gameState.players[currentPlayerTurn];
        const currentCoord = gameState.path[activePlayer.pathIndex];
        if (currentCoord) {
            const cell = document.querySelector(`.game-cell[data-x="${currentCoord.x}"][data-y="${currentCoord.y}"]`);
            if (cell) {
                const bw = board.offsetWidth;
                const bh = board.offsetHeight;
                
                const originX = cell.offsetLeft + (cell.offsetWidth / 2);
                const originY = cell.offsetTop + (cell.offsetHeight / 2);
                
                const dX = (bw / 2) - originX;
                const dY = (bh / 2) - originY;
                
                const scale = 2.2;
                
                board.style.transformOrigin = `center center`;
                board.style.transform = `translate(${dX * scale}px, ${dY * scale}px) scale(${scale})`;
            }
        }
    }
}

function renderSidebarAndDragDrop() {
    const sidebar = document.getElementById('sidebar-players');
    sidebar.innerHTML = '<h3 style="text-shadow: 2px 2px 0 #000;">ORDEM DA RODADA</h3><p class="hint-text" id="drag-hint">Arraste para reordenar (antes do 1º turno)</p>';
    
    const ul = document.createElement('ul');
    ul.id = 'sortable-players';

    gameState.players.forEach((p) => {
        const li = document.createElement('li');
        li.dataset.id = p.id;
        li.innerHTML = `<strong style="font-size:1.2em;">${p.name}</strong><span style="color:#a6adc8;">Faltam ${gameState.path.length - 1 - p.pathIndex} casas</span>`;
        if(!gameStartedReal) {
            li.draggable = true;
            li.style.cursor = "grab";
        }
        ul.appendChild(li);
    });
    sidebar.appendChild(ul);

    if(!gameStartedReal) {
        let draggedItem = null;
        ul.addEventListener('dragstart', (e) => {
            if(e.target.closest('li')) {
                draggedItem = e.target.closest('li');
                setTimeout(() => draggedItem.classList.add('dragging'), 0);
            }
        });
        ul.addEventListener('dragend', () => {
            if(draggedItem) {
                draggedItem.classList.remove('dragging');
                updatePlayersOrder();
            }
        });
        ul.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterEl = getDragAfterElement(ul, e.clientY);
            const dragEl = document.querySelector('.dragging');
            if(dragEl) {
                afterEl == null ? ul.appendChild(dragEl) : ul.insertBefore(dragEl, afterEl);
            }
        });
    }
}

function getDragAfterElement(container, y) {
    const draggables = [...container.querySelectorAll('li:not(.dragging)')];
    return draggables.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updatePlayersOrder() {
    const newOrderIds = [...document.querySelectorAll('#sortable-players li')].map(li => parseInt(li.dataset.id));
    gameState.players = newOrderIds.map(id => gameState.players.find(p => p.id === id));
    updateTurnUI();
    updateTokensOnBoard();
}

function updateTurnUI() {
    const lis = document.querySelectorAll('#sortable-players li');
    lis.forEach((li, index) => {
        li.classList.remove('active-player');
        if (index === currentPlayerTurn) li.classList.add('active-player');
        
        const p = gameState.players[index];
        li.innerHTML = `<strong style="font-size:1.2em;">${p.name}</strong><span style="color:#a6adc8;">Faltam ${gameState.path.length - 1 - p.pathIndex} casas</span>`;
        if (p.finished) li.classList.add('finished');
    });
}

function nextTurn() {
    do {
        currentPlayerTurn = (currentPlayerTurn + 1) % gameState.players.length;
    } while (gameState.players[currentPlayerTurn].finished && !isGameOver());
    updateTurnUI();
    updateTokensOnBoard();
}

function isGameOver() {
    return gameState.players.every(p => p.finished);
}

// ==========================================
// CONTROLES DE MOVIMENTO, COMBOS E ANIMAÇÃO
// ==========================================
let playerPreviousIndex = 0; 

document.getElementById('btn-roll-dice').addEventListener('click', () => {
    const roll = Math.floor(Math.random() * 6) + 1;
    const input = document.getElementById('move-steps');
    let counter = 0;
    const interval = setInterval(() => {
        input.value = Math.floor(Math.random() * 6) + 1;
        counter++;
        if(counter > 10) { clearInterval(interval); input.value = roll; }
    }, 50);
});

document.getElementById('btn-move').addEventListener('click', () => {
    gameStartedReal = true;
    const hint = document.getElementById('drag-hint');
    if(hint) hint.style.display = 'none';
    document.querySelectorAll('#sortable-players li').forEach(li => li.removeAttribute('draggable'));

    const currentPlayer = gameState.players[currentPlayerTurn];
    document.getElementById('move-player-name').innerText = `Vez de: ${currentPlayer.name}`;
    document.getElementById('move-steps').value = 1;
    
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('move-modal').classList.add('active');
});

document.getElementById('btn-skip').addEventListener('click', nextTurn);

document.getElementById('confirm-move-btn').addEventListener('click', async () => {
    const steps = parseInt(document.getElementById('move-steps').value) || 1;
    const player = gameState.players[currentPlayerTurn];
    
    playerPreviousIndex = player.pathIndex; 
    
    document.getElementById('move-modal').classList.remove('active');
    document.getElementById('modal-overlay').classList.remove('active');
    
    await movePlayerAnimated(player, steps, false);
});

// Lógica isolada de movimento para permitir "Pulos Extras" caso caia em casas de efeito
async function movePlayerAnimated(player, steps, isSecondaryMove = false) {
    const targetIndex = Math.max(0, Math.min(player.pathIndex + steps, gameState.path.length - 1));
    const stepDirection = steps > 0 ? 1 : -1;

    while(player.pathIndex !== targetIndex) {
        const oldCoord = gameState.path[player.pathIndex];
        const oldCell = document.querySelector(`.game-cell[data-x="${oldCoord.x}"][data-y="${oldCoord.y}"]`);

        player.pathIndex += stepDirection;
        updateTokensOnBoard(); 
        
        const newCoord = gameState.path[player.pathIndex];
        const newCell = document.querySelector(`.game-cell[data-x="${newCoord.x}"][data-y="${newCoord.y}"]`);
        
        const newToken = document.querySelector(`.avatar-token[data-player-id="${player.id}"]`);
        if (newToken && oldCell && newCell && newToken.animate) {
            const deltaX = oldCell.offsetLeft - newCell.offsetLeft;
            const deltaY = oldCell.offsetTop - newCell.offsetTop;

            const animation = newToken.animate([
                { transform: `translate(${deltaX}px, ${deltaY}px) scale(1.8)` },
                { transform: `translate(${deltaX / 2}px, ${deltaY / 2 - 40}px) scale(1.8)` },
                { transform: `translate(0px, 0px) scale(1.8)` }
            ], {
                duration: 300,
                easing: 'ease-in-out'
            });

            await animation.finished;
        } else {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    
    updateTurnUI();
    checkLandedCell(player, isSecondaryMove);
}

async function checkLandedCell(player, isSecondaryMove) {
    const landedCell = gameState.path[player.pathIndex];

    if (player.pathIndex === gameState.path.length - 1 && !player.finished) {
        player.finished = true;
        player.finishPosition = finishRankCounter++; 

        if (gameState.config.winCondition === 'single' || isGameOver()) {
            showResults();
        } else {
            alert(`${player.name} cruzou a linha de chegada em ${player.finishPosition}º lugar!`);
            nextTurn();
        }
        return;
    }

    // Lógica das Casas de Ação (Apenas se não for um movimento secundário para evitar loop infinito de quiques)
    if (landedCell.type === 'forward3' && !isSecondaryMove) {
        alert(`${player.name} caiu no Bônus! AVANCE 3 CASAS!`);
        await movePlayerAnimated(player, 3, true);
        return;
    }

    if (landedCell.type === 'back3' && !isSecondaryMove) {
        alert(`${player.name} caiu na Armadilha! RECUE 3 CASAS!`);
        await movePlayerAnimated(player, -3, true);
        return;
    }

    if (['color1', 'color2', 'color3', 'color4'].includes(landedCell.type)) {
        currentColorLanded = landedCell.type;
        openQuestionModal();
    } else {
        nextTurn();
    }
}

// ==========================================
// SISTEMA DE PERGUNTAS E TIMER
// ==========================================
const colorLabels = {
    'color1': { nome: 'CASA AZUL', hex: '#89b4fa' },
    'color2': { nome: 'CASA AMARELA', hex: '#f9e2af' },
    'color3': { nome: 'CASA ROXA', hex: '#cba6f7' },
    'color4': { nome: 'CASA LARANJA', hex: '#fab387' }
};

document.getElementById('btn-pause-timer').addEventListener('click', (e) => {
    isTimerPaused = !isTimerPaused;
    e.target.innerText = isTimerPaused ? "▶ Retomar Timer" : "⏸ Pausar Timer";
    e.target.style.background = isTimerPaused ? "#f9e2af" : "#9399b2";
    e.target.style.color = isTimerPaused ? "#11111b" : "#111";
});

function openQuestionModal() {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('question-modal').classList.add('active');
    setQuestion();
}

function setQuestion() {
    isTimerPaused = false;
    const pauseBtn = document.getElementById('btn-pause-timer');
    pauseBtn.innerText = "⏸ Pausar Timer";
    pauseBtn.style.background = "#9399b2";
    pauseBtn.style.color = "#111";

    const colorInfo = colorLabels[currentColorLanded];
    const titleEl = document.getElementById('question-color-title');
    titleEl.innerText = colorInfo.nome;
    titleEl.style.color = colorInfo.hex;

    const questionTextEl = document.getElementById('question-text');
    const timerDisplay = document.getElementById('question-timer-display');

    if (gameState.config.questionMode === 'manual') {
        questionTextEl.innerText = "Atenção: A pergunta deve ser feita verbalmente pelo mediador!";
    } else {
        const bank = gameState.config.questions[currentColorLanded];
        if (!bank || bank.length === 0) {
            questionTextEl.innerText = "Nenhuma pergunta cadastrada para esta cor. Faça uma pergunta manual!";
        } else {
            if (currentQuestionIndices[currentColorLanded] >= bank.length) {
                if (gameState.config.noRepeat) {
                    alert(`Atenção: As perguntas da ${colorInfo.nome} esgotaram! A lista será embaralhada e reiniciada.`);
                    shuffleArray(bank);
                }
                currentQuestionIndices[currentColorLanded] = 0;
            }
            const idx = currentQuestionIndices[currentColorLanded];
            questionTextEl.innerText = bank[idx];
        }
    }
    
    clearInterval(timerInterval);
    if (!gameState.config.useTimer) {
        timerDisplay.style.display = 'none';
        pauseBtn.style.display = 'none';
    } else {
        timerDisplay.style.display = 'block';
        pauseBtn.style.display = 'block';
        
        let timeLeft = gameState.config.timer;
        timerDisplay.innerText = `${timeLeft}s`;
        
        timerInterval = setInterval(() => {
            if(!isTimerPaused) {
                timeLeft--;
                timerDisplay.innerText = `${timeLeft}s`;
                if(timeLeft <= 0) {
                    clearInterval(timerInterval);
                    handleQuestionOutcome('errou');
                }
            }
        }, 1000);
    }
}

async function handleQuestionOutcome(resultado) {
    clearInterval(timerInterval);
    const player = gameState.players[currentPlayerTurn];
    
    if (gameState.config.questionMode === 'auto' && gameState.config.questions[currentColorLanded] && gameState.config.questions[currentColorLanded].length > 0) {
        currentQuestionIndices[currentColorLanded]++;
    }

    if (resultado === 'acertou') {
        player.score.acertos++;
        closeQuestionModalAndNextTurn();
    } 
    else if (resultado === 'errou') {
        player.score.erros++;
        document.getElementById('question-modal').classList.remove('active');
        document.getElementById('modal-overlay').classList.remove('active');
        
        alert(`Tempo esgotado ou Resposta Errada! ${player.name} vai voltar para a casa onde estava.`);
        
        // Retorna a casa de origem usando a animação de pulo (isSecondaryMove = true para não cair num loop de efeito infinito)
        const stepsBack = playerPreviousIndex - player.pathIndex;
        await movePlayerAnimated(player, stepsBack, true);
    }
    else if (resultado === 'passar') {
        setQuestion(); 
    }
}

function closeQuestionModalAndNextTurn() {
    document.getElementById('question-modal').classList.remove('active');
    document.getElementById('modal-overlay').classList.remove('active');
    nextTurn();
}

document.getElementById('btn-acertou').addEventListener('click', () => handleQuestionOutcome('acertou'));
document.getElementById('btn-errou').addEventListener('click', () => handleQuestionOutcome('errou'));
document.getElementById('btn-passar').addEventListener('click', () => handleQuestionOutcome('passar'));

// ==========================================
// TELA 3: RESULTADOS
// ==========================================
document.getElementById('btn-end').addEventListener('click', () => {
    if(confirm("Tem certeza que deseja finalizar o jogo e ir para os resultados agora?")) {
        showResults();
    }
});

function showResults() {
    switchScreen('screen-results');
    const podiumList = document.getElementById('podium-list');
    podiumList.innerHTML = '';

    const sortedPlayers = [...gameState.players].sort((a, b) => {
        if (a.finished && b.finished) return a.finishPosition - b.finishPosition;
        if (a.finished && !b.finished) return -1;
        if (!a.finished && b.finished) return 1;
        
        if (b.pathIndex !== a.pathIndex) return b.pathIndex - a.pathIndex;
        return b.score.acertos - a.score.acertos;
    });

    sortedPlayers.forEach((p, index) => {
        const li = document.createElement('li');
        const pos = index + 1;
        
        if(pos === 1 && p.finished) li.classList.add('winner');

        li.innerHTML = `
            <div class="player-info">
                <span class="rank">${pos}º</span>
                <img src="${p.avatar}" style="width: 50px; height: 50px; object-fit: contain;">
                <div style="display:flex; flex-direction:column;">
                    <strong style="font-size:1.5em;">${p.name}</strong> 
                    <span style="font-size: 0.8em; color: ${p.finished ? '#a6e3a1' : '#a6adc8'}">
                        (${p.finished ? 'Chegou ao fim!' : `Parou na casa ${p.pathIndex}`})
                    </span>
                </div>
            </div>
            <div class="score" style="font-size:1.2em;">
                Acertos: <span style="color:#a6e3a1">${p.score.acertos}</span><br>
                Erros: <span style="color:#f38ba8">${p.score.erros}</span>
            </div>
        `;
        podiumList.appendChild(li);
    });
}