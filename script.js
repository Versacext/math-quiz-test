const app = {
    questions: [],
    currentIndex: 0,
    userAnswers: {}, // Индекс вопроса: индекс выбранного ответа
    timerInterval: null,
    secondsElapsed: 0,

    async init() {
        try {
            const response = await fetch('questions.json');
            this.questions = await response.json();
            this.renderGrid();
            this.updateStats();
            console.log("Вопросы загружены:", this.questions.length);
        } catch (error) {
            console.error("Ошибка загрузки вопросов:", error);
            document.getElementById('question-text').innerText = "Ошибка загрузки вопросов. Проверь questions.json";
        }
    },

    // --- Навигация ---
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        window.scrollTo(0, 0);
    },

    startQuiz() {
        this.currentIndex = 0;
        this.userAnswers = {};
        this.secondsElapsed = 0;
        this.showScreen('quiz-screen');
        this.loadQuestion(0);
        this.startTimer();
    },

    goToHome() {
        this.stopTimer();
        this.updateStats();
        this.showScreen('home-screen');
    },

    // --- Логика Теста ---
    loadQuestion(index) {
        this.currentIndex = index;
        const q = this.questions[index];
        
        document.getElementById('current-q-num').innerText = index + 1;
        const qText = document.getElementById('question-text');
        qText.innerHTML = q.question;

        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';

        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            if (this.userAnswers[index] === idx) btn.classList.add('selected');
            
            btn.innerHTML = opt;
            btn.onclick = () => this.selectOption(idx);
            optionsContainer.appendChild(btn);
        });

        // Перерисовываем формулы MathJax
        if (window.MathJax) {
            MathJax.typesetPromise();
        }

        this.updateGridActive();
    },

    selectOption(optIndex) {
        this.userAnswers[this.currentIndex] = optIndex;
        
        // Сразу подсвечиваем правильный/неправильный (как в Quizizz)
        const buttons = document.querySelectorAll('.option-btn');
        const correctIdx = this.questions[this.currentIndex].correctIndex;

        buttons.forEach((btn, idx) => {
            btn.disabled = true; // Блокируем после выбора
            if (idx === correctIdx) btn.classList.add('correct');
            else if (idx === optIndex) btn.classList.add('wrong');
        });

        // Авто-переход через 1.5 секунды
        setTimeout(() => {
            if (this.currentIndex < this.questions.length - 1) {
                this.nextQuestion();
            } else {
                this.finishQuiz();
            }
        }, 1500);
    },

    nextQuestion() {
        if (this.currentIndex < this.questions.length - 1) {
            this.loadQuestion(this.currentIndex + 1);
        }
    },

    prevQuestion() {
        if (this.currentIndex > 0) {
            this.loadQuestion(this.currentIndex - 1);
        }
    },

    // --- Сетка 1-100 ---
    renderGrid() {
        const grid = document.getElementById('questions-grid');
        grid.innerHTML = '';
        this.questions.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = 'grid-dot';
            dot.innerText = i + 1;
            dot.onclick = () => this.loadQuestion(i);
            grid.appendChild(dot);
        });
    },

    updateGridActive() {
        const dots = document.querySelectorAll('.grid-dot');
        dots.forEach((dot, i) => {
            dot.classList.remove('active');
            if (i === this.currentIndex) dot.classList.add('active');
            if (this.userAnswers[i] !== undefined) dot.classList.add('answered');
        });
    },

    // --- Вспомогательные функции ---
    startTimer() {
        this.timerInterval = setInterval(() => {
            this.secondsElapsed++;
            const m = Math.floor(this.secondsElapsed / 60).toString().padStart(2, '0');
            const s = (this.secondsElapsed % 60).toString().padStart(2, '0');
            document.getElementById('timer').innerText = `${m}:${s}`;
        }, 1000);
    },

    stopTimer() {
        clearInterval(this.timerInterval);
    },

    updateStats() {
        const solved = Object.keys(this.userAnswers).length;
        const total = this.questions.length || 100;
        document.getElementById('stat-solved-count').innerText = `${solved} / ${total}`;
        document.getElementById('stat-progress-fill').style.width = `${(solved/total)*100}%`;
    },

    finishQuiz() {
        this.stopTimer();
        this.showScreen('results-screen');
        // Тут можно добавить логику подсчета баллов
    }
};

// Запуск при загрузке
window.onload = () => app.init();
          
