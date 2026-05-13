const app = {
    questions: [],
    currentIndex: 0,
    userAnswers: JSON.parse(localStorage.getItem('mathTrainerAnswers')) || {},
    timerInterval: null,
    secondsElapsed: 0,

    async init() {
        try {
            // Исправлен путь, чтобы работал на GitHub Pages
            const response = await fetch('./questions.json');
            if (!response.ok) throw new Error('Ошибка сети: Файл не найден');
            
            this.questions = await response.json();
            
            this.updateStats();
        } catch (error) {
            console.error("Ошибка загрузки вопросов:", error);
            document.getElementById('question-text').innerText = "Ошибка загрузки вопросов. Проверьте questions.json";
        }
    },

    saveProgress() {
        localStorage.setItem('mathTrainerAnswers', JSON.stringify(this.userAnswers));
        this.updateStats();
    },

    updateStats() {
        if (this.questions.length === 0) return;
        
        const solvedCount = Object.keys(this.userAnswers).length;
        const totalCount = this.questions.length;
        
        document.getElementById('stat-solved-count').innerText = `${solvedCount} / ${totalCount}`;
        
        const percent = (solvedCount / totalCount) * 100;
        document.getElementById('stat-progress-fill').style.width = `${percent}%`;
    },

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    },

    goToHome() {
        this.switchScreen('home-screen');
        this.updateStats();
        clearInterval(this.timerInterval);
    },

    startQuiz() {
        if (this.questions.length === 0) {
            alert('Вопросы еще не загрузились. Подождите секунду.');
            return;
        }
        this.switchScreen('quiz-screen');
        this.renderGrid();
        
        // Находим первый нерешенный вопрос или начинаем с первого
        let firstUnsolved = 0;
        for (let i = 0; i < this.questions.length; i++) {
            if (!(i in this.userAnswers)) {
                firstUnsolved = i;
                break;
            }
        }
        this.loadQuestion(firstUnsolved);
        this.startTimer();
    },

    renderGrid() {
        const grid = document.getElementById('questions-grid');
        grid.innerHTML = '';
        this.questions.forEach((_, index) => {
            const btn = document.createElement('button');
            btn.className = 'grid-item';
            btn.innerText = index + 1;
            
            if (index in this.userAnswers) btn.classList.add('answered');
            
            btn.onclick = () => this.loadQuestion(index);
            grid.appendChild(btn);
        });
    },

    updateGridActive() {
        document.querySelectorAll('.grid-item').forEach((btn, index) => {
            btn.classList.toggle('active', index === this.currentIndex);
            if (index in this.userAnswers) {
                btn.classList.add('answered');
            }
        });
    },

    loadQuestion(index) {
        if (index < 0 || index >= this.questions.length) return;
        
        this.currentIndex = index;
        const q = this.questions[index];
        
        document.getElementById('current-q-num').innerText = index + 1;
        document.getElementById('question-text').innerHTML = q.question;
        
        const container = document.getElementById('options-container');
        container.innerHTML = '';

        q.options.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            
            if (this.userAnswers[index] === i) {
                btn.classList.add('selected');
            }
            
            btn.innerHTML = opt;
            btn.onclick = () => this.selectOption(i);
            container.appendChild(btn);
        });

        this.updateGridActive();
        document.getElementById('hint-box').classList.add('hidden');

        // ОБНОВЛЕНИЕ ФОРМУЛ (Исправление для MathJax)
        if (window.MathJax) {
            MathJax.typesetPromise();
        }
    },

    selectOption(optIndex) {
        this.userAnswers[this.currentIndex] = optIndex;
        this.saveProgress();
        
        // Подсветка кнопок
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach((btn, i) => {
            btn.classList.toggle('selected', i === optIndex);
        });

        // Задержка перед следующим вопросом
        setTimeout(() => {
            this.nextQuestion();
        }, 400);
    },

    prevQuestion() {
        if (this.currentIndex > 0) this.loadQuestion(this.currentIndex - 1);
    },

    nextQuestion() {
        if (this.currentIndex < this.questions.length - 1) {
            this.loadQuestion(this.currentIndex + 1);
        } else {
            this.finishQuiz();
        }
    },

    toggleHint() {
        const hintBox = document.getElementById('hint-box');
        const q = this.questions[this.currentIndex];
        hintBox.innerHTML = q.hint || "Вспомните основные свойства интегралов или рядов.";
        hintBox.classList.toggle('hidden');
    },

    startTimer() {
        clearInterval(this.timerInterval);
        this.secondsElapsed = 0;
        const timerElem = document.getElementById('timer');
        
        this.timerInterval = setInterval(() => {
            this.secondsElapsed++;
            const m = Math.floor(this.secondsElapsed / 60).toString().padStart(2, '0');
            const s = (this.secondsElapsed % 60).toString().padStart(2, '0');
            timerElem.innerText = `${m}:${s}`;
        }, 1000);
    },

    finishQuiz() {
        clearInterval(this.timerInterval);
        let correctCount = 0;
        
        this.questions.forEach((q, index) => {
            if (this.userAnswers[index] === q.correctIndex) {
                correctCount++;
            }
        });

        const percent = Math.round((correctCount / this.questions.length) * 100);
        document.getElementById('result-percent').innerText = `${percent}%`;
        document.getElementById('result-text').innerText = `Вы ответили правильно на ${correctCount} из ${this.questions.length} вопросов`;
        
        this.switchScreen('results-screen');
    },

    resetData() {
        if (confirm("Вы уверены, что хотите удалить весь свой прогресс?")) {
            this.userAnswers = {};
            localStorage.removeItem('mathTrainerAnswers');
            this.updateStats();
            alert("Прогресс сброшен.");
        }
    },

    showAllAnswers() {
        if (this.questions.length === 0) return;
        
        this.switchScreen('answers-screen');
        const container = document.getElementById('all-answers-list');
        container.innerHTML = '';

        this.questions.forEach((q, index) => {
            const div = document.createElement('div');
            div.className = 'answer-item';
            
            const isAnswered = index in this.userAnswers;
            const isCorrect = isAnswered && this.userAnswers[index] === q.correctIndex;
            
            let statusHTML = '';
            if (isAnswered) {
                statusHTML = isCorrect ? '<span style="color: green;"> (Верно)</span>' : '<span style="color: red;"> (Ошибка)</span>';
            } else {
                statusHTML = '<span style="color: gray;"> (Не решено)</span>';
            }

            div.innerHTML = `
                <p><strong>Вопрос ${index + 1}:</strong> ${q.question} ${statusHTML}</p>
                <p><em>Правильный ответ:</em> ${q.options[q.correctIndex]}</p>
                <hr>
            `;
            container.appendChild(div);
        });

        if (window.MathJax) {
            MathJax.typesetPromise();
        }
    },

    retryMistakes() {
        alert("Режим работы над ошибками: Найдите вопросы, отмеченные красным в списке, и попробуйте решить их заново!");
        this.goToHome();
    }
};

app.init();
        
