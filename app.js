// Team Building Game - Main Application

// Game State
const gameState = {
    currentQuestion: null,
    usedQuestions: JSON.parse(localStorage.getItem('used_questions') || '[]'),
    timerInterval: null,
    timeRemaining: 0,
    isSpinning: false,
    totalQuestions: 0
};

// Initialize Supabase
// let supabase;

// DOM Elements
const screens = {
    landing: document.getElementById('landing-screen'),
    ready: document.getElementById('ready-screen'),
    question: document.getElementById('question-screen'),
    answer: document.getElementById('answer-screen')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    initializeSupabase();
    setupEventListeners();
    await loadQuestionCount();
});

// Setup Event Listeners
function setupEventListeners() {
    // Spin button
    const spinBtn = document.getElementById('spin-btn');
    if (spinBtn) {
        spinBtn.addEventListener('click', spinRandomQuestion);
    }

    // Ready screen buttons
    const readyNextBtn = document.getElementById('ready-next-btn');
    if (readyNextBtn) {
        readyNextBtn.addEventListener('click', showQuestion);
    }

    // Question screen buttons
    const startTimerBtn = document.getElementById('start-timer-btn');
    if (startTimerBtn) {
        startTimerBtn.addEventListener('click', startTimer);
    }

    const revealAnswerBtn = document.getElementById('reveal-answer-btn');
    if (revealAnswerBtn) {
        revealAnswerBtn.addEventListener('click', revealAnswer);
    }

    // Answer screen buttons
    const nextQuestionBtn = document.getElementById('next-question-btn');
    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', resetGame);
    }

    // Reset game button
    const resetBtn = document.getElementById('reset-game-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetAllQuestions);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

// Initialize Supabase Client
function initializeSupabase() {
    // Replace with your actual Supabase credentials
    const SUPABASE_URL = window.SUPABASE_URL || 'https://csqvixhappgwaiiadouh.supabase.co';
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcXZpeGhhcHBnd2FpaWFkb3VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTg4MDgsImV4cCI6MjA5MDQ5NDgwOH0.VlqoCF48US3r3B-rWZVxPT0L1eNbD9KZOioZ7UUMrZU';

    try {
        // Supabase CDN creates window.supabase with createClient method
        if (window.supabase && window.supabase.createClient) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase initialized successfully');
        } else {
            console.error('Supabase library not loaded. Check CDN script tag.');
            showError('Supabase library failed to load. Please refresh the page.');
        }
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        showError('Failed to connect to database. Please check your configuration.');
    }
}

async function spinRandomQuestion() {
    
    // playSound("next-question");
    const spinBtn = document.getElementById('spin-btn');
    spinBtn.disabled = true;

    try {

        const { data: availableQuestions, error } = await supabase
            .from('questions')
            .select('question_number')
            .eq('is_active', true)
            .order('question_number', { ascending: true });

        if (error) {
            showError('Failed to load questions');
            spinBtn.disabled = false;
            return;
        }

        gameState.totalQuestions = availableQuestions.length;
        updateStats();

        const availableNumbers = availableQuestions
            .map(q => q.question_number)
            .filter(num => !gameState.usedQuestions.includes(num));

        if (availableNumbers.length === 0) {
            showMessage('All questions have been used!', 'info');
            spinBtn.disabled = false;
            return;
        }

        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        const selectedNumber = availableNumbers[randomIndex];

        // DIRECTLY LOAD QUESTION (NO SPINNER)
        await fetchQuestion(selectedNumber);

        spinBtn.disabled = false;

    } catch (error) {
        console.error(error);
        showError("Failed to load question");
        spinBtn.disabled = false;
    }
}

// Fetch Question from Supabase
async function fetchQuestion(questionNumber) {
    try {
        showLoading(true);

        const { data, error } = await supabase
            .from('questions')
            .select(`
                *,
                question_types (type_name)
            `)
            .eq('question_number', questionNumber)
            .eq('is_active', true)
            .maybeSingle();  // Changed from .single() to handle 0 rows gracefully

        if (error) {
            console.error('Error fetching question:', error);
            showError('Failed to fetch question. Database error: ' + error.message);
            return;
        }

        if (!data) {
            showError(`Question #${questionNumber} not found. Please add it in the admin panel.`);
            return;
        }

        gameState.currentQuestion = data;

        // Show ready screen
        showScreen('ready');
        updateReadyScreen(data);
        updateStats();

    } catch (error) {
        console.error('Error:', error);
        showError('Failed to load question. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Update Ready Screen
function updateReadyScreen(question) {
    const typeName = question.question_types?.type_name || question.question_type || 'General';
    document.getElementById('ready-question-type').textContent = typeName;
    document.getElementById('ready-question-number').textContent = `#${question.question_number}`;
}

// Show Question Screen
function showQuestion() {
    if (!gameState.currentQuestion) return;

    showScreen('question');
    updateQuestionScreen(gameState.currentQuestion);

    // START TIMER AUTOMATICALLY
    startTimer();
}

// Update Question Screen
function updateQuestionScreen(question) {
    const typeName = question.question_types?.type_name || question.question_type || 'General';

    document.getElementById('question-type').textContent = typeName;
    document.getElementById('question-number').textContent = `Question #${question.question_number}`;

    // Handle media
    const mediaContainer = document.getElementById('media-container');
    mediaContainer.innerHTML = '';

    if (question.media_url) {
        if (question.media_type === 'video') {
            const video = document.createElement('video');
            video.src = question.media_url;
            video.controls = true;
            video.preload = 'metadata';
            mediaContainer.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = question.media_url;
            img.alt = 'Question Image';
            img.loading = 'lazy';
            mediaContainer.appendChild(img);
        }
    }

    // Reset timer display
    const timerDisplay = document.getElementById('timer-display');
    timerDisplay.textContent = question.timer_seconds || 10;
    timerDisplay.classList.remove('warning', 'danger');

    // Reset buttons
    document.getElementById('start-timer-btn').style.display = 'none';
    document.getElementById('reveal-answer-btn').style.display = 'inline-flex';

    // Hide answer overlay
    const answerOverlay = document.getElementById('answer-overlay');
    answerOverlay.classList.remove('show');
}

// Start Timer
function startTimer() {
    if (!gameState.currentQuestion) return;

    const timerSeconds = gameState.currentQuestion.timer_seconds || 10;
    gameState.timeRemaining = timerSeconds;

    document.getElementById('start-timer-btn').style.display = 'none';

    const timerDisplay = document.getElementById('timer-display');
    // playSound('tick');
    gameState.timerInterval = setInterval(() => {

        gameState.timeRemaining--;

        // TIME UP FIRST
        if (gameState.timeRemaining <= 0) {
            clearInterval(gameState.timerInterval);

            timerDisplay.textContent = "Time's Up!";
            timerDisplay.classList.remove('warning', 'danger');
            timerDisplay.classList.add('times-up');
            document.getElementById("next-question-btn-container").style.display = "block";
            playSound('times-up');
            return;
        }

        timerDisplay.textContent = gameState.timeRemaining;

        // WARNINGS
        if (gameState.timeRemaining <= 3) {
            timerDisplay.classList.add('danger');

        }
        else if (gameState.timeRemaining <= 5) {
            timerDisplay.classList.add('warning');
        }

    }, 1000);
}

// Reveal Answer
async function revealAnswer() {
    if (!gameState.currentQuestion) return;
    document.getElementById("next-question-btn-container").style.display = "block";
    const questionNumber = gameState.currentQuestion.question_number;
    // Mark question as used ONLY after answer revealed
    if (!gameState.usedQuestions.includes(questionNumber)) {
        gameState.usedQuestions.push(questionNumber);
        localStorage.setItem('used_questions', JSON.stringify(gameState.usedQuestions));
        updateStats();
    }

    // Clear timer if running
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    const answerOverlay = document.getElementById('answer-overlay');
    const answerText = document.getElementById('answer-text');

    answerText.textContent = gameState.currentQuestion.answer || 'No answer provided';
    answerOverlay.classList.add('show');

    // Play success sound and confetti
    stopAllSounds();
    fireConfetti();

    // Log game history
    await logGameHistory(gameState.currentQuestion.question_number);

    // Update button visibility
    document.getElementById('reveal-answer-btn').style.display = 'none';
    document.getElementById('next-question-btn-container').style.display = 'block';
}

// Reset Game (return to landing)
function resetGame() {
    gameState.currentQuestion = null;

    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    // refresh stats
    updateStats();

    showScreen('landing');

    const wheel = document.querySelector('.spinner-wheel');
    wheel.style.transform = 'rotate(0deg)';
}

// Log Game History to Supabase
async function logGameHistory(questionNumber) {
    try {
        // Get or create session ID
        let sessionId = sessionStorage.getItem('game_session_id');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            sessionStorage.setItem('game_session_id', sessionId);
        }

        // Insert game history record
        const { data, error } = await supabase
            .from('game_history')
            .insert([{
                question_number: questionNumber,
                player_name: "Rohan",
                session_id: sessionId,
                played_at: new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error('Error logging game history:', error);
        } else {
            console.log('Game history logged successfully');
        }
    } catch (error) {
        console.error('Error in logGameHistory:', error);
    }
}

// Reset All Questions
function resetAllQuestions() {
    if (confirm('Are you sure you want to reset all used questions?')) {
        gameState.usedQuestions = [];
        localStorage.removeItem('used_questions');
        updateStats();
        showMessage('All questions have been reset!', 'success');
    }
}

// Update Statistics Display
function updateStats() {
    const usedCount = gameState.usedQuestions.length;
    const remainingCount = gameState.totalQuestions - usedCount;

    document.getElementById('used-count').textContent = usedCount;
    document.getElementById('remaining-count').textContent = remainingCount;

    const progressPercent = gameState.totalQuestions
        ? (usedCount / gameState.totalQuestions) * 100
        : 0;

    document.getElementById('progress-bar').style.width = `${progressPercent}%`;
}

// Screen Navigation
function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });

    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    }
}

// Keyboard Shortcuts
function handleKeyboard(e) {
    // Space - Spin or Start Timer
    if (e.code === 'Space') {
        e.preventDefault();
        if (screens.landing.classList.contains('active')) {
            spinRandomQuestion();
        } else if (screens.question.classList.contains('active')) {
            const startBtn = document.getElementById('start-timer-btn');
            if (startBtn && startBtn.style.display !== 'none') {
                startTimer();
            } else {
                revealAnswer();
            }
        }
    }

    // Enter - Next/Confirm
    if (e.code === 'Enter') {
        if (screens.ready.classList.contains('active')) {
            showQuestion();
        } else if (document.getElementById('answer-overlay').classList.contains('show')) {
            resetGame();
        }
    }

    // Escape - Go back/Reset
    if (e.code === 'Escape') {
        if (!screens.landing.classList.contains('active')) {
            resetGame();
        }
    }

    // F - Fullscreen
    if (e.code === 'KeyF') {
        toggleFullscreen();
    }
}

// Toggle Fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Confetti Effect
function fireConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#ffd93d', '#00d9a5'];

    for (let i = 0; i < 150; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20 - 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 10 + 5,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            gravity: 0.3,
            drag: 0.99
        });
    }

    let animationId;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let activeParticles = 0;
        particles.forEach(p => {
            if (p.y < canvas.height + 50) {
                activeParticles++;
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.vx *= p.drag;
                p.vy *= p.drag;
                p.rotation += p.rotationSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            }
        });

        if (activeParticles > 0) {
            animationId = requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    animate();

    // Stop after 5 seconds
    setTimeout(() => {
        cancelAnimationFrame(animationId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 5000);
}

// Sound Effects (placeholder - implement with actual audio files)
function playSound(type) {

const soundFiles = {
    spin: "spin.mp3",
    tick: "tick.mp3",
    "next-question": "next-question.mp3",
    "tick-fast": "tick-fast.mp3",
    "times-up": "times-up.mp3",
    success: "success.mp3"
};

    const file = soundFiles[type];
    if (!file) return;

    const audio = new Audio(file);

    // Lower volume for ticks
    if (type.includes("tick")) {
        audio.volume = 0.4;
    }

    audio.play().catch(() => {
        console.warn("Browser blocked audio until user interaction.");
    });
}

// Utility Functions
function showLoading(show) {
    const loader = document.getElementById('loading-indicator');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.zIndex = '9999';
    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Prevent repeat questions check
function preventRepeatQuestions() {
    return gameState.usedQuestions;
}

// Export functions for global access
window.spinRandomQuestion = spinRandomQuestion;
window.showQuestion = showQuestion;
window.startTimer = startTimer;
window.revealAnswer = revealAnswer;
window.resetGame = resetGame;
window.resetAllQuestions = resetAllQuestions;
window.toggleFullscreen = toggleFullscreen;

async function loadQuestionCount() {
    const { data, error } = await supabase
        .from("questions")
        .select("question_number")
        .eq("is_active", true);

    if (!error && data) {
        gameState.totalQuestions = data.length;
        updateStats();
    }
}
async function playNextQuestion() {

    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    gameState.currentQuestion = null;

    document.getElementById('answer-overlay').classList.remove('show');
    document.getElementById('next-question-btn-container').style.display = 'none';

    await spinRandomQuestion();
}
function stopAllSounds(){
    Object.values(sounds).forEach(sound=>{
        sound.pause();
        sound.currentTime = 0;
    });
}
function closeAnswerOverlay(){
    document.getElementById("answer-overlay").classList.remove("show");
}