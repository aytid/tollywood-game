// Admin State
const adminState = {
    currentUser: null,
    questions: [],
    questionTypes: [],
    currentTab: 'dashboard',
    editingQuestion: null
};

// Initialize Admin Panel
document.addEventListener('DOMContentLoaded', () => {
    initializeSupabase();
    checkAuthStatus();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTabContent(btn.dataset.tab));
    });

    // Add question form
    const addQuestionForm = document.getElementById('add-question-form');
    if (addQuestionForm) {
        addQuestionForm.addEventListener('submit', handleAddQuestion);
    }

    // Add question type form
    const addTypeForm = document.getElementById('add-type-form');
    if (addTypeForm) {
        addTypeForm.addEventListener('submit', handleAddQuestionType);
    }

    // Add setting form
    const addSettingForm = document.getElementById('add-setting-form');
    if (addSettingForm) {
        addSettingForm.addEventListener('submit', handleGameSetting);
    }

    // File upload preview
    const mediaInput = document.getElementById('media-file');
    if (mediaInput) {
        mediaInput.addEventListener('change', handleFilePreview);
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Edit question form
    const editForm = document.getElementById('edit-question-form');
    if (editForm) {
        editForm.addEventListener('submit', handleUpdateQuestion);
    }
}

// Initialize Supabase
function initializeSupabase() {
    const SUPABASE_URL = window.SUPABASE_URL || 'https://csqvixhappgwaiiadouh.supabase.co';
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcXZpeGhhcHBnd2FpaWFkb3VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTg4MDgsImV4cCI6MjA5MDQ5NDgwOH0.VlqoCF48US3r3B-rWZVxPT0L1eNbD9KZOioZ7UUMrZU';

    try {
        // Supabase CDN creates window.supabase with createClient method
        if (window.supabase && window.supabase.createClient) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Admin Supabase initialized');
        } else {
            console.error('Supabase library not loaded. Check CDN script tag.');
            showAlert('Supabase library failed to load. Please refresh the page.', 'error');
        }
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        showAlert('Failed to connect to database', 'error');
    }
}

// Check Authentication Status
async function checkAuthStatus() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session) {
            adminState.currentUser = session.user;
            showDashboard();
            loadDashboardData();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showLoginScreen();
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Show loading
    submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';
    submitBtn.disabled = true;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        adminState.currentUser = data.user;
        showDashboard();
        loadDashboardData();
        showAlert('Login successful!', 'success');

    } catch (error) {
        console.error('Login error:', error);
        showAlert(error.message || 'Login failed', 'error');
    } finally {
        submitBtn.innerHTML = 'Sign In';
        submitBtn.disabled = false;
    }
}

// Handle Logout
async function handleLogout() {
    try {
        await supabase.auth.signOut();
        adminState.currentUser = null;
        showLoginScreen();
        showAlert('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showAlert('Logout failed', 'error');
    }
}

// Show/Hide Screens
function showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');

    // Update user info
    if (adminState.currentUser) {
        document.getElementById('user-email').textContent = adminState.currentUser.email;
        document.getElementById('user-avatar').textContent = adminState.currentUser.email.charAt(0).toUpperCase();
    }
}

// Switch Tab
function switchTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        }
    });

    // Hide all sections
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.add('hidden');
    });

    // Show selected section
    const targetSection = document.getElementById(`${tabName}-section`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // Update header title
    const titles = {
        'dashboard': 'Dashboard',
        'questions': 'Manage Questions',
        'types': 'Question Types',
        'settings': 'Game Settings',
    };
    document.getElementById('page-title').textContent = titles[tabName] || 'Dashboard';

    // Load data if needed
    if (tabName === 'questions') {
        loadQuestions();
    } else if (tabName === 'types') {
        loadQuestionTypes();
    } else if (tabName === 'settings') {
        loadGameSettings();
    }

    adminState.currentTab = tabName;
    updateMobileNavActiveState(tabName);
}

// Switch Tab Content (for sub-tabs)
function switchTabContent(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetContent = document.getElementById(`${tabName}-tab`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Get total questions count
        const { count: totalQuestions, error: countError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // Get active questions count
        const { count: activeQuestions, error: activeError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        if (activeError) throw activeError;

        // Get question types count
        const { count: typeCount, error: typeError } = await supabase
            .from('question_types')
            .select('*', { count: 'exact', head: true });

        if (typeError) throw typeError;

        // Update dashboard stats
        document.getElementById('total-questions').textContent = totalQuestions || 0;
        document.getElementById('active-questions').textContent = activeQuestions || 0;
        document.getElementById('question-types-count').textContent = typeCount || 0;

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showAlert('Failed to load dashboard data', 'error');
    }
}

// Load Questions
async function loadQuestions() {
    try {
        showLoading('questions-table', true);

        // Load types first if not already loaded
        if (adminState.questionTypes.length === 0) {
            await loadQuestionTypes();
        }

        const { data, error } = await supabase
            .from('questions')
            .select(`
                *,
                question_types (type_name)
            `)
            .order('question_number', { ascending: true });

        if (error) throw error;

        adminState.questions = data || [];
        renderQuestionsTable(data);

        // Auto-populate next question number based on count (since we maintain sequential numbering)
        const nextNumber = (data?.length || 0) + 1;
        const questionNumberInput = document.getElementById('question-number');
        if (questionNumberInput) {
            questionNumberInput.value = nextNumber;
            questionNumberInput.placeholder = `Next: ${nextNumber}`;
        }

    } catch (error) {
        console.error('Error loading questions:', error);
        showAlert('Failed to load questions', 'error');
    } finally {
        showLoading('questions-table', false);
    }
}

// Render Questions Table
function renderQuestionsTable(questions){

    const container = document.getElementById("questions-cards");

    if(!questions || questions.length===0){
        container.innerHTML = `
            <div style="padding:40px;text-align:center;color:#94a3b8;">
                No questions found
            </div>
        `;
        return;
    }

    container.innerHTML = questions.map(q=>{

        let preview = "";

        if(q.media_url){

            if(q.media_type==="video"){
                preview = `<video class="question-preview" src="${q.media_url}"></video>`;
            }

            else if(q.media_type==="audio"){
                preview = `
                <div style="height:150px;display:flex;align-items:center;justify-content:center;background:#0f172a;">
                    🎧 Audio
                </div>`;
            }

            else{
                preview = `<img class="question-preview" src="${q.media_url}">`;
            }

        }else{
            preview = `
            <div style="height:150px;display:flex;align-items:center;justify-content:center;background:#0f172a;">
                No Preview
            </div>`;
        }

        return `
        <div class="question-card">

            <div class="edit-icon" onclick="editQuestion('${q.id}')">
                ✏️
            </div>

            ${preview}

            <div class="question-card-body">

                <div class="question-number">
                    Question #${q.question_number}
                </div>

                <div class="question-type">
                    ${q.question_types?.type_name || q.question_type || ""}
                </div>

                <div style="font-size:13px;margin-bottom:6px;">
                    ${q.question_text || ""}
                </div>

                <div class="question-answer">
                    ${q.answer}
                </div>

            </div>

        </div>
        `;
    }).join("");
}

// Load Question Types
async function loadQuestionTypes() {
    try {
        const { data, error } = await supabase
            .from('question_types')
            .select('*')
            .order('type_name', { ascending: true });

        if (error) throw error;

        adminState.questionTypes = data || [];
        renderQuestionTypes(data);
        populateTypeDropdowns(data);

    } catch (error) {
        console.error('Error loading question types:', error);
        showAlert('Failed to load question types', 'error');
    }
}

// Render Question Types
function renderQuestionTypes(types) {
    const tbody = document.getElementById('types-tbody');

    if (!types || types.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center" style="padding: 40px; color: var(--text-secondary);">
                    No question types found.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = types.map(t => `
        <tr>
            <td>${t.type_name}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteQuestionType('${t.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Populate Type Dropdowns
function populateTypeDropdowns(types) {
    const addSelect = document.getElementById('question-type');
    const editSelect = document.getElementById('edit-question-type');

    if (!types || types.length === 0) {
        const noTypeHtml = '<option value="">No types available - add one first</option>';
        if (addSelect) addSelect.innerHTML = noTypeHtml;
        if (editSelect) editSelect.innerHTML = noTypeHtml;
        return;
    }

    const options = types.map(t => `<option value="${t.type_name}">${t.type_name}</option>`).join('');

    if (addSelect) {
        addSelect.innerHTML = '<option value="">Select Type</option>' + options;
        // Ensure dropdown is visible
        addSelect.style.display = 'block';
        addSelect.style.visibility = 'visible';
    }
    if (editSelect) {
        editSelect.innerHTML = '<option value="">Select Type</option>' + options;
        editSelect.style.display = 'block';
        editSelect.style.visibility = 'visible';
    }
}

// Handle Add Question
async function handleAddQuestion(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');

    let questionNumber = parseInt(formData.get('question-number'));
    if (!questionNumber || questionNumber < 1) {
        showAlert('Please enter a valid question number', 'error');
        return;
    }

    if (!formData.get('question-type')) {
        showAlert('Please select a question type', 'error');
        return;
    }

    submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
    submitBtn.disabled = true;

    try {

        // Check if question number already exists
        const { data: existingQuestions, error: checkError } = await supabase
            .from('questions')
            .select('id, question_number')
            .order('question_number', { ascending: true });

        if (checkError) throw checkError;

        const duplicate = existingQuestions?.find(q => q.question_number === questionNumber);

        if (duplicate) {
            const usedNumbers = new Set(existingQuestions.map(q => q.question_number));
            let nextNumber = 1;

            while (usedNumbers.has(nextNumber)) {
                nextNumber++;
            }

            showAlert(`Question #${questionNumber} already exists. Using next available number: ${nextNumber}`, 'warning');
            questionNumber = nextNumber;
        }

        // Upload media if provided
        let mediaUrl = null;
        let mediaType = null;

        const mediaFile = document.getElementById('media-file').files[0];

        if (mediaFile) {
            const uploadResult = await uploadMedia(mediaFile);

            mediaUrl = uploadResult.url;
            mediaType = uploadResult.type;
        }

        // Insert question
        const { data, error } = await supabase
            .from('questions')
            .insert([
                {
                    question_number: questionNumber,
                    question_type: formData.get('question-type'),
                    media_url: mediaUrl,
                    media_type: mediaType,
                    question_text: formData.get('question-text'),
                    answer: formData.get('answer'),
                    timer_seconds: parseInt(formData.get('timer-seconds')) || 10,
                    is_active: formData.get('is-active') === 'on'
                }
            ])
            .select();

        if (error) throw error;

        showAlert('Question added successfully!', 'success');

        e.target.reset();
        document.getElementById('file-preview').innerHTML = '';

        if (adminState.currentTab === 'questions') {
            loadQuestions();
        }

    } catch (error) {

        console.error('Error adding question:', error);
        showAlert(error.message || 'Failed to add question', 'error');

    } finally {

        submitBtn.innerHTML = 'Save Question';
        submitBtn.disabled = false;

    }
}
async function uploadMedia(file) {

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `questions/${fileName}`;

    const { error } = await supabase.storage
        .from('game-media')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from('game-media')
        .getPublicUrl(filePath);

    let type = 'image';

    if (file.type.startsWith('video')) {
        type = 'video';
    } 
    else if (file.type.startsWith('audio')) {
        type = 'audio';
    }

    return {
        url: publicUrl,
        type: type
    };
}

// Handle File Preview
function handleFilePreview(e) {
    const file = e.target.files[0];
    const previewContainer = document.getElementById('file-preview');

    if (!file) {
        previewContainer.innerHTML = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        if (file.type.startsWith('video')) {
            previewContainer.innerHTML = `
                <video controls style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 15px;">
                    <source src="${e.target.result}" type="${file.type}">
                </video>
            `;
        } else {
            previewContainer.innerHTML = `
                <img src="${e.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 15px;">
            `;
        }
    };
    reader.readAsDataURL(file);
}

// Handle Add Question Type
async function handleAddQuestionType(e) {
    e.preventDefault();

    const formData = new FormData(e.target);

    try {
        const { data, error } = await supabase
            .from('question_types')
            .insert([{
                type_name: formData.get('type-name'),
                description: formData.get('type-description')
            }])
            .select();

        if (error) throw error;

        showAlert('Question type added successfully!', 'success');
        e.target.reset();
        loadQuestionTypes();

    } catch (error) {
        console.error('Error adding type:', error);
        showAlert(error.message || 'Failed to add type', 'error');
    }
}

// Edit Question
async function editQuestion(id) {
    const question = adminState.questions.find(q => q.id === id);
    if (!question) return;

    adminState.editingQuestion = question;

    // Populate form
    document.getElementById('edit-question-id').value = question.id;
    document.getElementById('edit-question-number').value = question.question_number;
    setTimeout(() => {
        document.getElementById('edit-question-type').value = question.question_type || '';
    }, 100);
    document.getElementById('edit-question-text').value = question.question_text || '';
    document.getElementById('edit-answer').value = question.answer || '';
    document.getElementById('edit-timer-seconds').value = question.timer_seconds || 10;
    document.getElementById('edit-is-active').checked = question.is_active;

    // Show current media
    const currentMediaDiv = document.getElementById('current-media');
    if (question.media_url) {
        if (question.media_type === 'video') {
            currentMediaDiv.innerHTML = `
                <p style="margin-bottom: 10px; color: var(--text-secondary);">Current Media:</p>
                <video controls style="max-width: 200px; border-radius: 8px;">
                    <source src="${question.media_url}" type="video/mp4">
                </video>
            `;
        } else {
            currentMediaDiv.innerHTML = `
                <p style="margin-bottom: 10px; color: var(--text-secondary);">Current Media:</p>
                <img src="${question.media_url}" style="max-width: 200px; border-radius: 8px;">
            `;
        }
    } else {
        currentMediaDiv.innerHTML = '<p style="color: var(--text-secondary);">No media uploaded</p>';
    }

    openModal('edit-modal');
}

// Handle Update Question
async function handleUpdateQuestion(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const id = formData.get('question-id');

    try {
        let mediaUrl = adminState.editingQuestion.media_url;
        let mediaType = adminState.editingQuestion.media_type;

        // Upload new media if provided
        const mediaFile = document.getElementById('edit-media-file').files[0];
        if (mediaFile) {
            const uploadResult = await uploadMedia(mediaFile);
            mediaUrl = uploadResult.url;
            mediaType = uploadResult.type;
        }

        const { error } = await supabase
            .from('questions')
            .update({
                question_number: parseInt(formData.get('question-number')),
                question_type: formData.get('question-type'),
                media_url: mediaUrl,
                media_type: mediaType,
                question_text: formData.get('question-text'),
                answer: formData.get('answer'),
                timer_seconds: parseInt(formData.get('timer-seconds')) || 10,
                is_active: formData.get('is-active') === 'on'
            })
            .eq('id', id);

        if (error) throw error;

        showAlert('Question updated successfully!', 'success');
        closeModal();
        loadQuestions();

    } catch (error) {
        console.error('Error updating question:', error);
        showAlert(error.message || 'Failed to update question', 'error');
    }
}

// Delete Question
async function deleteQuestion(id) {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
        // First, get the question being deleted to know its number
        const { data: questionToDelete, error: fetchError } = await supabase
            .from('questions')
            .select('question_number')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const deletedNumber = questionToDelete.question_number;

        // Delete the question
        const { error } = await supabase
            .from('questions')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Now resequence remaining questions to fill the gap
        // Get all remaining questions ordered by their current question_number
        const { data: remainingQuestions, error: fetchAllError } = await supabase
            .from('questions')
            .select('id, question_number')
            .order('question_number', { ascending: true });

        if (fetchAllError) throw fetchAllError;

        if (remainingQuestions && remainingQuestions.length > 0) {
            // Resequence questions from 1 to N
            const updates = remainingQuestions.map((q, index) => ({
                id: q.id,
                question_number: index + 1
            }));

            // Update each question with its new number
            for (const update of updates) {
                const { error: updateError } = await supabase
                    .from('questions')
                    .update({ question_number: update.question_number })
                    .eq('id', update.id);

                if (updateError) {
                    console.error('Error updating question number:', updateError);
                }
            }
        }

        showAlert(`Question deleted and remaining questions renumbered from 1 to ${remainingQuestions?.length || 0}!`, 'success');
        loadQuestions();

    } catch (error) {
        console.error('Error deleting question:', error);
        showAlert(error.message || 'Failed to delete question', 'error');
    }
}

// Delete Question Type
async function deleteQuestionType(id) {
    if (!confirm('Are you sure? This may affect existing questions.')) return;

    try {
        const { error } = await supabase
            .from('question_types')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showAlert('Question type deleted!', 'success');
        loadQuestionTypes();

    } catch (error) {
        console.error('Error deleting type:', error);
        showAlert(error.message || 'Failed to delete type', 'error');
    }
}

// Load Game Settings
async function loadGameSettings() {
    try {
        const { data, error } = await supabase
            .from('game_settings')
            .select('*')
            .order('setting_key', { ascending: true });

        if (error) throw error;

        renderGameSettings(data || []);

    } catch (error) {
        console.error('Error loading settings:', error);
        showAlert('Failed to load game settings', 'error');
    }
}

// Render Game Settings
function renderGameSettings(settings) {
    const tbody = document.getElementById('settings-tbody');

    if (!tbody) return; // Settings table not in HTML yet

    if (!settings || settings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center" style="padding: 40px; color: var(--text-secondary);">
                    No settings configured yet.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = settings.map(s => `
        <tr>
            <td><strong>${s.setting_key}</strong></td>
            <td>${s.setting_value}</td>
            <td>
                <small style="color: var(--text-secondary);">Updated ${new Date(s.updated_at).toLocaleDateString()}</small>
            </td>
        </tr>
    `).join('');
}

// Handle Add/Update Game Setting
async function handleGameSetting(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const settingKey = formData.get('setting-key');
    const settingValue = formData.get('setting-value');

    if (!settingKey || !settingValue) {
        showAlert('Please fill in all fields', 'error');
        return;
    }

    try {
        // Check if setting exists
        const { data: existing, error: checkError } = await supabase
            .from('game_settings')
            .select('id')
            .eq('setting_key', settingKey)
            .single();

        if (existing) {
            // Update existing setting
            const { error } = await supabase
                .from('game_settings')
                .update({
                    setting_value: settingValue,
                    updated_at: new Date().toISOString()
                })
                .eq('setting_key', settingKey);

            if (error) throw error;
        } else {
            // Insert new setting
            const { error } = await supabase
                .from('game_settings')
                .insert([{
                    setting_key: settingKey,
                    setting_value: settingValue
                }]);

            if (error) throw error;
        }

        showAlert('Setting saved successfully!', 'success');
        e.target.reset();
        loadGameSettings();

    } catch (error) {
        console.error('Error saving setting:', error);
        showAlert(error.message || 'Failed to save setting', 'error');
    }
}


// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('show');
    });
}

// Utility Functions
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span style="font-size: 1.2rem;">${type === 'success' ? '✓' : type === 'error' ? '✗' : '⚠'}</span>
        <span>${message}</span>
    `;

    const container = document.querySelector('.content-area') || document.querySelector('.login-box');
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function showLoading(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.opacity = show ? '0.5' : '1';
        element.style.pointerEvents = show ? 'none' : 'auto';
    }
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal();
    }
});


// Mobile Profile Menu Functions
function toggleMobileProfileMenu(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('mobile-profile-dropdown');
    dropdown.classList.toggle('show');
}

function closeMobileProfileMenu() {
    const dropdown = document.getElementById('mobile-profile-dropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

function showUserProfile() {
    closeMobileProfileMenu();
    showAlert('Profile: ' + (adminState.currentUser?.email || 'Admin'), 'info');
}

// Close mobile profile menu when clicking outside
document.addEventListener('click', (e) => {
    const profileMenu = document.querySelector('.mobile-profile-menu');
    if (profileMenu && !profileMenu.contains(e.target)) {
        closeMobileProfileMenu();
    }
});

// Update mobile bottom nav active state
function updateMobileNavActiveState(tabName) {
    document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        }
    });
}

// Export functions for global access
window.switchTab = switchTab;
window.switchTabContent = switchTabContent;
window.editQuestion = editQuestion;
window.deleteQuestion = deleteQuestion;
window.deleteQuestionType = deleteQuestionType;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleMobileProfileMenu = toggleMobileProfileMenu;
window.closeMobileProfileMenu = closeMobileProfileMenu;
window.showUserProfile = showUserProfile;
window.toggleSidebar = toggleSidebar;

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('show');
}

// Close sidebar when clicking overlay
document.getElementById('sidebar-overlay').addEventListener('click', toggleSidebar);