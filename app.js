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
let activeSounds = [];
let activePrimeVideo = null;
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
    stopAllSounds();
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

        // 🔊 Play random fun audio
        const sounds = [
            "kcr",
            "niranjan_garu",
            "ballari_bro",
            "hmm_nagarjuna",
            "sunil",
            "pothanu_annayya",
            "rajshekhar",
            "creativity",
            "orey_aajamu",
        ];

        let randomSound;

        do {
            randomSound = sounds[Math.floor(Math.random() * sounds.length)];
        } while (randomSound === gameState.lastSound);

        gameState.lastSound = randomSound;
        // if(isMultipleOf4(selectedNumber))
        //     playSound(randomSound);

        // Load question
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
    document.getElementById('ready-question-number').textContent = 'Question ' + `#${question.question_number}`;
}

// Show Question Screen
function showQuestion() {

    if (!gameState.currentQuestion) return;

    showScreen('question');

    updateQuestionScreen(gameState.currentQuestion);

    const question = gameState.currentQuestion;
    const typeName = question.question_types?.type_name || question.question_type || "";

    const isAudioQuestion =
        question.media_type === 'audio' ||
        typeName.toLowerCase() === 'audio';

    const isVideoQuestion =
        question.media_type === 'video' ||
        typeName.toLowerCase() === 'video';

    const isImageQuestion =
        question.media_type === 'image' || (!isAudioQuestion && !isVideoQuestion);

    // Start timer only for image questions
    if (isImageQuestion && question.timer_seconds !== 0) {

        document.querySelector(".timer-container").style.display = "block";
        startTimer();

    } else {

        // Hide timer for audio/video
        document.querySelector(".timer-container").style.display = "none";

    }

}
// Initialize timer ring
function initTimerRing() {
    const ring = document.getElementById('timer-ring');
    if (!ring) return;

    const radius = 74;
    const circumference = 2 * Math.PI * radius;

    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = 0;

    return circumference;
}

let timerCircumference = 0;

// Start Timer - Improved Version
function startTimer() {
    if (!gameState.currentQuestion) return;

    const timerSeconds = gameState.currentQuestion.timer_seconds || 10;
    gameState.timeRemaining = timerSeconds;
    playSound("tick");
    // Initialize ring
    timerCircumference = initTimerRing();

    document.getElementById('start-timer-btn').style.display = 'none';

    const timerDisplay = document.getElementById('timer-display');
    const timerText = document.getElementById('timer-text');
    const timerLabel = document.getElementById('timer-label');
    const ring = document.getElementById('timer-ring');

    // Reset classes
    timerDisplay.classList.remove('warning', 'danger', 'times-up');

    // Show seconds label at start
    if (timerLabel) timerLabel.style.display = 'block';

    // Update ring progress
    const updateRing = () => {
        if (timerCircumference && ring) {
            const progress = (timerSeconds - gameState.timeRemaining) / timerSeconds;
            const offset = timerCircumference * progress;
            ring.style.strokeDashoffset = offset;
        }
    };

    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;

        // Update text
        if (timerText) {
            timerText.textContent = gameState.timeRemaining;
        }

        // Update ring
        updateRing();

        // TIME UP
        if (gameState.timeRemaining <= 0) {
            clearInterval(gameState.timerInterval);

            // Transform to Time's Up state
            timerDisplay.classList.add('times-up');
            if (timerText) {
                timerText.innerHTML = "Time's<br>Up!";
            }

            // HIDE SECONDS LABEL when time is up
            if (timerLabel) timerLabel.style.display = 'none';

            // Show next question button
            document.getElementById("next-question-btn-container").style.display = "block";
            return;
        }

        // WARNINGS with visual states
        if (gameState.timeRemaining <= 3) {
            timerDisplay.classList.remove('warning');
            timerDisplay.classList.add('danger');
            if (ring) ring.style.stroke = '#ff6b6b';
        }
        else if (gameState.timeRemaining <= 5) {
            timerDisplay.classList.add('warning');
            if (ring) ring.style.stroke = '#ff9800';
        }

    }, 1000);
}

// Update Question Screen - Modified to handle media types and question text
function updateQuestionScreen(question) {

    stopAllSounds();

    const typeName = question.question_types?.type_name || question.question_type || 'General';

    document.getElementById('question-type').textContent = typeName;
    document.getElementById('question-number').textContent = `Question #${question.question_number}`;

    const mediaContainer = document.getElementById('media-container');
    const timerContainer = document.getElementById("timer-container");
    const questionTextContainer = document.getElementById("question-text-container");
    const questionText = document.getElementById("question-text");

    // Clear previous media
    mediaContainer.innerHTML = '';

    // Detect media type
    const isAudioQuestion =
        question.media_type === 'audio' ||
        question.question_type === 'Audio' ||
        typeName.toLowerCase() === 'audio';

    const isVideoQuestion =
        question.media_type === 'video' ||
        question.question_type === 'Video' ||
        typeName.toLowerCase() === 'video';

    const isImageQuestion =
        question.media_type === 'image' || (!isAudioQuestion && !isVideoQuestion);

    // TIMER LOGIC
    if (isImageQuestion) {

        if (question.timer_seconds === 0) {

            if (timerContainer) timerContainer.style.display = "none";

        } else {

            if (timerContainer) timerContainer.style.display = "block";

            const timerDisplay = document.getElementById('timer-display');
            const timerText = document.getElementById('timer-text');
            const ring = document.getElementById('timer-ring');

            if (timerDisplay) {
                timerDisplay.style.display = "flex";
                timerDisplay.classList.remove('warning', 'danger', 'times-up');
            }

            const timerSeconds = question.timer_seconds || 10;

            if (timerText) {
                timerText.textContent = timerSeconds;
            }

            timerCircumference = initTimerRing();

            if (ring) {
                ring.style.strokeDashoffset = 0;
                ring.style.stroke = '#ffd93d';
            }

        }

    } else {

        // Hide timer for audio/video
        if (timerContainer) timerContainer.style.display = "none";

    }

    // MEDIA DISPLAY
    if (question.media_url) {

        if (isAudioQuestion) {

            const audio = document.createElement('audio');
            audio.src = question.media_url;
            audio.controls = true;
            audio.autoplay = true;
            audio.preload = "metadata";
            audio.style.display = "block";
            audio.style.margin = "40px auto";

            mediaContainer.appendChild(audio);

        }

        else if (isVideoQuestion) {

            const video = document.createElement('video');
            video.src = question.media_url;
            video.controls = true;
            video.autoplay = true;
            video.preload = "metadata";
            video.style.width = "100%";
            video.style.maxWidth = "600px";
            video.style.borderRadius = "10px";

            mediaContainer.appendChild(video);

        }

        else {

            const img = document.createElement('img');
            img.src = question.media_url;
            img.alt = "Question Image";
            img.loading = "lazy";
            img.style.width = "100%";
            img.style.maxWidth = "600px";
            img.style.borderRadius = "10px";

            mediaContainer.appendChild(img);

        }

    }

    // QUESTION TEXT
    if (question.question_text && question.question_text.trim() !== "") {

        questionText.textContent = question.question_text;
        questionTextContainer.style.display = "block";

    } else {

        questionTextContainer.style.display = "none";

    }

    // BUTTON RESET
    document.getElementById('start-timer-btn').style.display = 'none';
    document.getElementById('reveal-answer-btn').style.display = 'inline-flex';
    document.getElementById("next-question-btn-container").style.display = "none";

    // Reset answer overlay
    const answerOverlay = document.getElementById('answer-overlay');
    answerOverlay.classList.remove('show');
}
// Reveal Answer
async function revealAnswer() {

    if (!gameState.currentQuestion) return;

    const media = document.querySelector('#media-container audio, #media-container video');

    if (media) {
        media.pause();
        media.currentTime = media.currentTime;
    }

    stopAllSounds();

    document.getElementById("next-question-btn-container").style.display = "block";

    const questionNumber = Number(gameState.currentQuestion.question_number);

    // 🔊 Play random reaction sound
    const sounds = [
        "chitikelu",
        "bittu",
        "wah_anna",
        "ballari_bro",
        "chiranjeevi",
        "mahesh_babu",
        "sunil",
        "pothanu_annayya",
        "rajshekhar",
        "orey_aajamu",
    ];

    let randomSound;

    do {
        randomSound = sounds[Math.floor(Math.random() * sounds.length)];
    } while (randomSound === gameState.lastSound);

    gameState.lastSound = randomSound;
    //var isSong = gameState.currentQuestion.question_type == "Guess the Song";
    //if(!isSong && isMultipleOf4(questionNumber))
    //playSound(randomSound);

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

    fireConfetti();
    //if (isPrime(questionNumber) || isMultipleOf5(questionNumber))
    showPrimeVideo();

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
function playSound(name) {

    if (!name) return;

    const audio = new Audio(`${name}.mp3`);

    activeSounds.push(audio);

    audio.play().catch(err => {
        console.warn("Audio blocked:", err);
    });

    audio.onended = () => {
        activeSounds = activeSounds.filter(a => a !== audio);
    };
}
function stopAllSounds() {
    activeSounds.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });

    activeSounds = [];
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

    stopAllSounds();

    if (activePrimeVideo) {
        activePrimeVideo.remove();
        activePrimeVideo = null;
    }

    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    gameState.currentQuestion = null;

    document.getElementById('answer-overlay').classList.remove('show');
    document.getElementById('next-question-btn-container').style.display = 'none';

    await spinRandomQuestion();
}
function closeAnswerOverlay() {
    document.getElementById("answer-overlay").classList.remove("show");
}

function isPrime(n) {

    if (n <= 1) return false;

    for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) return false;
    }

    return true;
}

function isMultipleOf5(n) {
    return n % 5 === 0;
}
function isMultipleOf4(n) {
    return n % 4 === 0;
}
function showPrimeVideo() {

    const videos = [
        "chiru.mp4",
        "mohanlal.mp4",
        "kopadari_manishi.mp4",
        "brahmi.mp4",
        "naralu_cut.mp4",
        "rakesh_master.mp4",
        "chi_wow.mp4",
        "sunil.mp4",
        "garshana.mp4",
        "madhelama.mp4",
        "adiripole.mp4",
        "srihari.mp4",
        "overaction.mp4",
        "prabhas_om.mp4",
        "baane_extral.mp4",
        "are_u_kamma.mp4",
        "orey_aajamu.mp4",
        "anr_hmm.mp4",
        "swalpa.mp4",
        "backside.mp4",
        "robo.mp4",
        "oka_pani_chey.mp4",
        "nagababu.mp4",
        "nen_pothan.mp4",
    ];

    const randomVideo = videos[Math.floor(Math.random() * videos.length)];

    const video = document.createElement("video");
    activePrimeVideo = video;

    video.src = randomVideo;
    video.autoplay = true;
    video.muted = false;
    video.playsInline = true;

    const randomWidth = 180 + Math.random() * 120;

    video.style.position = "fixed";
    video.style.width = randomWidth + "px";
    video.style.zIndex = "9999";
    video.style.borderRadius = "10px";
    video.style.boxShadow = "0 10px 25px rgba(0,0,0,0.4)";
    video.style.transition = "all 5s linear";

    const startX = Math.random() * (window.innerWidth - randomWidth);
    const startY = Math.random() * (window.innerHeight - 200);

    video.style.left = startX + "px";
    video.style.top = startY + "px";

    document.body.appendChild(video);

    setTimeout(() => {

        const endX = Math.random() * (window.innerWidth - randomWidth);
        const endY = Math.random() * (window.innerHeight - 200);

        video.style.left = endX + "px";
        video.style.top = endY + "px";

    }, 100);

    video.addEventListener("ended", () => {
        video.remove();
        activePrimeVideo = null;
    });
}