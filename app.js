let currentMode = 'practice'; // practice, pinyin-hanzi, hanzi-pinyin
let currentCategory = 'words'; // words, sentences
let currentDataList = [];
let currentIndex = 0;

// Variables para múltiples caracteres y repeticiones
let writers = [];
let validChars = [];
let targetRepetitions = 3;
let currentRepetition = 1;

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
            
            // Si estamos en la pantalla de ejercicio, actualizar la vista
            if (screens.exercise.classList.contains('active') && currentDataList.length > 0) {
                loadCurrentItem();
            }
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
        if (writers.length > 0) {
            writers.forEach(w => w.cancelQuiz());
        }
    });

    btnPrev.addEventListener('click', () => navigate(-1));
    btnNext.addEventListener('click', () => navigate(1));

    btnAnimate.addEventListener('click', () => {
        if (writers.length > 0) writers.forEach(w => w.animateCharacter());
    });
    btnClear.addEventListener('click', () => {
        if (writers.length > 0) {
            writers.forEach(w => w.clear());
            if (currentMode === 'practice' || currentMode === 'pinyin-hanzi') {
                // Restart current repetition
                startQuizSequence(0);
            }
        }
        feedbackMsg.textContent = '';
    });
    
    btnQuiz.addEventListener('click', () => {
        if (writers.length > 0) {
            startQuizSequence(0);
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

function updateRepetitionDisplay() {
    const repCounter = document.getElementById('repetition-counter');
    if (currentMode === 'hanzi-pinyin') {
        repCounter.style.display = 'none';
    } else {
        repCounter.style.display = 'block';
        repCounter.textContent = `Repetición: ${currentRepetition}/${targetRepetitions}`;
    }
}

function loadCurrentItem() {
    updateProgress();
    feedbackMsg.textContent = '';
    pinyinInput.value = '';
    
    const item = currentDataList[currentIndex];
    
    // Extraer solo caracteres chinos (ignorar puntuación)
    validChars = item.hanzi.match(/[\u4e00-\u9fa5]/g) || [];
    currentRepetition = 1;
    updateRepetitionDisplay();

    // Cancelar quizzes anteriores si existían
    writers.forEach(w => w.cancelQuiz());

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
        // Modo Escritura a ciegas
        promptMain.textContent = item.pinyin;
        promptSub.textContent = item.meaning;
        canvasContainer.style.display = 'block';
        inputContainer.style.display = 'none';
        initCanvases(validChars, true);
    }
    else {
        // Práctica Guiada: Muestra contorno gris de ayuda
        promptMain.textContent = `${item.pinyin} - ${item.meaning}`;
        promptSub.textContent = item.hanzi;
        canvasContainer.style.display = 'block';
        inputContainer.style.display = 'none';
        initCanvases(validChars, false);
    }
}

function initCanvases(chars, isStrictQuiz) {
    const container = document.getElementById('dynamic-canvases');
    container.innerHTML = '';
    writers = [];
    
    if (chars.length === 0) return;

    // Calcular tamaño responsivo
    const canvasSize = chars.length > 4 ? 100 : (chars.length > 2 ? 140 : 200);

    chars.forEach((char, index) => {
        const svgId = `canvas-${index}`;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" id="${svgId}" style="background: rgba(0,0,0,0.2); border-radius: 8px;">
                <line x1="0" y1="0" x2="${canvasSize}" y2="${canvasSize}" stroke="#555" stroke-dasharray="4,4"/>
                <line x1="${canvasSize}" y1="0" x2="0" y2="${canvasSize}" stroke="#555" stroke-dasharray="4,4"/>
                <line x1="${canvasSize/2}" y1="0" x2="${canvasSize/2}" y2="${canvasSize}" stroke="#555" stroke-dasharray="4,4"/>
                <line x1="0" y1="${canvasSize/2}" x2="${canvasSize}" y2="${canvasSize/2}" stroke="#555" stroke-dasharray="4,4"/>
            </svg>
        `;
        container.appendChild(wrapper);

        const w = HanziWriter.create(svgId, char, {
            width: canvasSize,
            height: canvasSize,
            padding: canvasSize * 0.08,
            strokeColor: '#f0f4f8',
            radicalColor: '#4fd1c5',
            showOutline: !isStrictQuiz,
            outlineColor: '#555'
        });
        writers.push(w);
    });

    // Empezar la secuencia de dibujo automáticamente
    startQuizSequence(0);
}

function startQuizSequence(startIndex = 0) {
    if (writers.length === 0) return;
    
    // Cancelar cualquier quiz activo para evitar conflictos
    writers.forEach(w => w.cancelQuiz());
    
    let charIndex = startIndex;
    
    function startNextChar() {
        if (charIndex >= writers.length) {
            currentRepetition++;
            if (currentRepetition > targetRepetitions) {
                showMessage(`¡Excelente! Avanzando...`, 'feedback-success');
                setTimeout(() => {
                    navigate(1);
                }, 1000);
            } else {
                showMessage(`¡Bien! Siguiente repetición...`, 'feedback-success');
                updateRepetitionDisplay();
                setTimeout(() => {
                    writers.forEach(w => {
                        w.cancelQuiz(); // Asegurar que el estado interno se reinicie
                        w.clear();
                    });
                    charIndex = 0;
                    showMessage('Empieza a dibujar', 'feedback-success');
                    startNextChar();
                }, 1200); // Dar un poco más de tiempo para ver que se completó
            }
            return;
        }

        writers[charIndex].quiz({
            onMistake: function() {
                showMessage(`Error en el trazo. Intenta de nuevo.`, 'feedback-error');
            },
            onComplete: function() {
                showMessage(`Carácter completado.`, 'feedback-success');
                charIndex++;
                setTimeout(startNextChar, 300);
            }
        });
    }

    startNextChar();
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
