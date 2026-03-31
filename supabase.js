// Supabase Configuration

const SUPABASE_URL = 'https://csqvixhappgwaiiadouh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcXZpeGhhcHBnd2FpaWFkb3VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTg4MDgsImV4cCI6MjA5MDQ5NDgwOH0.VlqoCF48US3r3B-rWZVxPT0L1eNbD9KZOioZ7UUMrZU';
;

// Initialize Supabase client
function initializeSupabase() {
    // Supabase CDN creates window.supabase with createClient method
    if (window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase initialized');
        return supabase;
    } else {
        console.error('Supabase library not loaded. Check CDN script tag in HTML.');
        return null;
    }
}

// Check if user is authenticated
async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return session;
}

// Login function
async function loginAdmin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }

    return { success: true, data: data };
}

// Logout function
async function logoutAdmin() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Logout error:', error);
        return false;
    }
    return true;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializeSupabase, checkAuth, loginAdmin, logoutAdmin, supabase };
}