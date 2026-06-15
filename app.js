let currentMode = 'practice'; // practice, pinyin-hanzi, hanzi-pinyin
let currentCategory = 'words'; // words, sentences
let currentDataList = [];
let currentIndex = 0;
let writer = null;

// DOM Elements
const screens = {
    level: document.getElementById('level-selection'),
    exercise: document.getElementById('exercise-screen')
};

const modeBtns = document.querySelectorAll('.mode-btn');
const categoryBtns = document.querySelectorAll('.level-card .primary-btn');
const btnBack = document.getElementById('btn-back');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const counterText = document.getElementById('counter-text');
const progressBar = document.getElementById('progress-bar');

const promptMain = document.getElementById('prompt-main');
const promptSub = document.getElementById('prompt-sub');
const canvasContainer = document.getElementById('canvas-container');
const inputContainer = document.getElementById('input-container');
const pinyinInput = document.getElementById('pinyin-input');
const btnCheck = document.getElementById('btn-check');
const feedbackMsg = document.getElementById('feedback-message');

const btnAnimate = document.getElementById('btn-animate');
const btnClear = document.getElementById('btn-clear');
const btnQuiz = document.getElementById('btn-quiz');

// Initialize
function init() {
    setupEventListeners();
}

function setupEventListeners() {
    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMode = e.target.dataset.mode;
        });
    });

    categoryBtns.forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.level-card');
            currentCategory = card.dataset.category;
            startExercise();
        });
    });

    btnBack.addEventListener('click', () => {
        showScreen('level');
        if (writer) {
            writer.cancelQuiz();
        }
    });

    btnPrev.addEventListener('click', () => navigate(-1));
    btnNext.addEventListener('click', () => navigate(1));

    btnAnimate.addEventListener('click', () => writer && writer.animateCharacter());
    btnClear.addEventListener('click', () => {
        if (writer) {
            writer.clear();
            if (currentMode === 'practice' || currentMode === 'pinyin-hanzi') {
                writer.quiz(); // Restart quiz mode
            }
        }
        feedbackMsg.textContent = '';
    });
    
    btnQuiz.addEventListener('click', () => {
        if (writer) {
            writer.quiz();
            showMessage('Dibuja el carácter en el cuadro.', 'feedback-success');
        }
    });

    btnCheck.addEventListener('click', checkPinyinAnswer);
    pinyinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkPinyinAnswer();
    });

    // Teclado de tonos virtuales
    const toneBtns = document.querySelectorAll('.tone-btn');
    toneBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const toneChar = e.target.dataset.tone;
            // Insertar el tono en la posición del cursor
            const start = pinyinInput.selectionStart;
            const end = pinyinInput.selectionEnd;
            const text = pinyinInput.value;
            pinyinInput.value = text.substring(0, start) + toneChar + text.substring(end);
            pinyinInput.focus();
            pinyinInput.selectionStart = pinyinInput.selectionEnd = start + 1;
        });
    });
}

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function startExercise() {
    const selectedListKey = document.getElementById('list-select').value;
    const selectedDict = dictionary[selectedListKey];

    if (currentCategory === 'words') {
        currentDataList = selectedDict.words || [];
    } else {
        currentDataList = selectedDict.sentences || [];
    }
    
    if (currentDataList.length === 0) {
        alert("No hay datos en esta categoría para la lista seleccionada.");
        return;
    }

    // Mezclar array (opcional)
    currentDataList.sort(() => Math.random() - 0.5);
    
    currentIndex = 0;
    showScreen('exercise');
    loadCurrentItem();
}

function navigate(direction) {
    currentIndex += direction;
    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex >= currentDataList.length) currentIndex = currentDataList.length - 1;
    loadCurrentItem();
}

function updateProgress() {
    counterText.textContent = `${currentIndex + 1} / ${currentDataList.length}`;
    const percent = ((currentIndex + 1) / currentDataList.length) * 100;
    progressBar.style.width = `${percent}%`;
    
    btnPrev.disabled = currentIndex === 0;
    btnNext.disabled = currentIndex === currentDataList.length - 1;
}

function loadCurrentItem() {
    updateProgress();
    feedbackMsg.textContent = '';
    pinyinInput.value = '';
    
    const item = currentDataList[currentIndex];
    const firstChar = item.hanzi.charAt(0); // Para el canvas, usamos el primer carácter

    // Configuramos la interfaz según el modo
    if (currentMode === 'hanzi-pinyin') {
        // Modo Lectura: Mostrar Hanzi, Ocultar Canvas, Mostrar Input
        promptMain.textContent = item.hanzi;
        promptSub.textContent = item.meaning;
        canvasContainer.style.display = 'none';
        inputContainer.style.display = 'flex';
        pinyinInput.focus();
    } 
    else if (currentMode === 'pinyin-hanzi') {
        // Modo Escritura: Mostrar Pinyin/Significado, Mostrar Canvas (vacío), Ocultar Input
        promptMain.textContent = item.pinyin;
        promptSub.textContent = item.meaning;
        canvasContainer.style.display = 'block';
        inputContainer.style.display = 'none';
        initCanvas(firstChar, true);
    }
    else {
        // Práctica Guiada: Mostrar todo, Canvas muestra trazos
        promptMain.textContent = `${item.pinyin} - ${item.meaning}`;
        promptSub.textContent = item.hanzi; // Mostrarlo como referencia
        canvasContainer.style.display = 'block';
        inputContainer.style.display = 'none';
        initCanvas(firstChar, false);
    }
}

function initCanvas(character, isQuiz) {
    const svg = document.getElementById('hanzi-canvas');
    // Limpiamos trazos anteriores
    svg.innerHTML = `
        <line x1="0" y1="0" x2="250" y2="250" stroke="#DDD" />
        <line x1="250" y1="0" x2="0" y2="250" stroke="#DDD" />
        <line x1="125" y1="0" x2="125" y2="250" stroke="#DDD" />
        <line x1="0" y1="125" x2="250" y2="125" stroke="#DDD" />
    `;

    writer = HanziWriter.create('hanzi-canvas', character, {
        width: 250,
        height: 250,
        padding: 15,
        strokeColor: '#1a202c',
        radicalColor: '#4fd1c5',
        showOutline: !isQuiz, // Ocultar el contorno si es evaluación
    });

    if (isQuiz) {
        writer.quiz({
            onMistake: function(strokeData) {
                showMessage(`Error en el trazo ${strokeData.strokeNum + 1}.`, 'feedback-error');
            },
            onComplete: function(summaryData) {
                showMessage(`¡Excelente! Carácter completado.`, 'feedback-success');
            }
        });
    } else {
        writer.animateCharacter();
    }
}

function checkPinyinAnswer() {
    const item = currentDataList[currentIndex];
    const userAnswer = pinyinInput.value.trim().toLowerCase();
    
    // Normalizar la respuesta eliminando los acentos/tonos para que sea más fácil
    // (Por ejemplo: 'nǐ hǎo' o 'ni hao' son válidos para el prototipo)
    const normalizedTarget = item.pinyin.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase();
    const normalizedUser = userAnswer.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase();
    
    if (normalizedUser === normalizedTarget) {
        showMessage(`¡Correcto! El pinyin es ${item.pinyin}.`, 'feedback-success');
        setTimeout(() => {
            if(currentIndex < currentDataList.length - 1) navigate(1);
        }, 1500);
    } else {
        showMessage('Incorrecto, intenta de nuevo.', 'feedback-error');
    }
}

function showMessage(msg, className) {
    feedbackMsg.textContent = msg;
    feedbackMsg.className = className;
}

// Start
init();
