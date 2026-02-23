// Admin Panel JavaScript - Single Page Application
let currentPage = 'dashboard';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    loadNotes();
    loadStats();
    loadProfile();
    initializeProfile();
    initializeNotesManagementControls();
});

// Navigation
function initializeNavigation() {
    // Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            switchPage(page);
        });
    });
    
    // Profile click
    const navUser = document.querySelector('.nav-user');
    if (navUser) {
        navUser.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage('profile');
        });
    }
}

function switchPage(page) {
    currentPage = page;
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });
    
    // Update pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `${page}-page`);
    });
    
    // Load page-specific data
    if (page === 'dashboard') {
        loadRecentUploads();
        loadStats();
    } else if (page === 'users') {
        loadUsers();
    } else if (page === 'notes') {
        loadNotesManagement();
    } else if (page === 'forum') {
        loadForumPosts();
        showForumPosts();
    } else if (page === 'profile') {
        loadProfile();
    }
}

// Dashboard Functions
async function loadRecentUploads() {
    try {
        const response = await fetch('../../backend/api/admin/notes.php');
        const notes = await response.json();
        
        // Get only recent 10 uploads
        const recentNotes = notes.slice(0, 10);
        
        const container = document.getElementById('recent-uploads-container');
        
        if (!container) return;
        
        if (recentNotes.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><br>No recent uploads</div>';
            return;
        }
        
        container.innerHTML = recentNotes.map(note => {
            const date = new Date(note.created_at);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            return `
            <div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.8fr 0.8fr 1fr;">
                <div>
                    <strong>${note.title || 'Untitled'}</strong>
                    ${note.description ? `<br><small style="color: var(--text-secondary);">${note.description.substring(0, 50)}...</small>` : ''}
                </div>
                <div>${note.author_name || 'Unknown'}</div>
                <div>${note.course || '-'}</div>
                <div><span class="resource-type ${note.type || 'notes'}">${note.type || 'notes'}</span></div>
                <div>${note.views || 0}</div>
                <div>${note.downloads || 0}</div>
                <div><small>${formattedDate}</small></div>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading recent uploads:', error);
        const container = document.getElementById('recent-uploads-container');
        if (container) {
            container.innerHTML = '<div class="empty-state">Error loading recent uploads. Please refresh.</div>';
        }
    }
}

async function loadNotes() {
    try {
        const response = await fetch('../../backend/api/admin/notes.php');
        const notes = await response.json();
        
        const container = document.getElementById('notes-container');
        
        if (!container) return;
        
        if (notes.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><br>No notes found</div>';
            return;
        }
        
        container.innerHTML = notes.map(note => `
            <div class="table-row">
                <div>
                    <strong>${note.title || 'Untitled'}</strong>
                    ${note.description ? `<br><small style="color: var(--text-secondary);">${note.description.substring(0, 50)}...</small>` : ''}
                </div>
                <div>${note.author_name ? note.author_name : (note.author_username ? note.author_username : (note.uploaded_by ? 'User #' + note.uploaded_by : 'Unknown'))}</div>
                <div>${note.course || '-'}</div>
                <div><span class="resource-type ${note.type || 'notes'}">${note.type || 'notes'}</span></div>
                <div>${note.views || 0}</div>
                <div>${note.downloads || 0}</div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${note.file_path ? `
                        <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="window.viewNote('${note.file_path.replace(/'/g, "\\'")}')" title="View PDF">
                            <i class="fa-regular fa-eye"></i> View
                        </button>
                        <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="window.downloadNote('${note.file_path.replace(/'/g, "\\'")}', '${(note.title || 'note').replace(/'/g, "\\'")}')" title="Download PDF">
                            <i class="fa-solid fa-download"></i> Download
                        </button>
                    ` : ''}
                    <button class="btn-delete" onclick="deleteNote(${note.note_id})" title="Delete Note">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading notes:', error);
        const container = document.getElementById('notes-container');
        if (container) {
            container.innerHTML = '<div class="empty-state">Error loading notes. Please refresh.</div>';
        }
    }
}

async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`../../backend/api/admin/notes.php?note_id=${noteId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Note deleted successfully!');
            loadNotes();
            loadStats();
        } else {
            alert('Error: ' + (result.error || 'Failed to delete note'));
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        alert('Error deleting note. Please try again.');
    }
}

async function loadStats() {
    try {
        const notesResponse = await fetch('../../backend/api/admin/notes.php');
        
        if (!notesResponse.ok) {
            throw new Error(`HTTP error! status: ${notesResponse.status}`);
        }
        
        const notesText = await notesResponse.text();
        let notes;
        try {
            notes = JSON.parse(notesText);
        } catch (e) {
            console.error('Failed to parse notes JSON:', notesText);
            throw new Error('Invalid JSON response from server');
        }
        
        // Check if response is an error
        if (notes.error) {
            console.error('API error:', notes.error);
            return;
        }
        
        const notesArray = Array.isArray(notes) ? notes : [];
        const totalViews = notesArray.reduce((sum, note) => sum + (parseInt(note.views) || 0), 0);
        const totalDownloads = notesArray.reduce((sum, note) => sum + (parseInt(note.downloads) || 0), 0);
        
        const totalNotesEl = document.getElementById('total-notes');
        const totalViewsEl = document.getElementById('total-views');
        const totalDownloadsEl = document.getElementById('total-downloads');
        const totalUsersEl = document.getElementById('total-users');
        const totalCommentsEl = document.getElementById('total-comments');
        
        if (totalNotesEl) totalNotesEl.textContent = notesArray.length;
        if (totalViewsEl) totalViewsEl.textContent = totalViews;
        if (totalDownloadsEl) totalDownloadsEl.textContent = totalDownloads;
        
        const usersResponse = await fetch('../../backend/api/admin/users.php');
        if (usersResponse.ok) {
            const usersText = await usersResponse.text();
            try {
                const users = JSON.parse(usersText);
                if (Array.isArray(users) && !users.error) {
                    if (totalUsersEl) totalUsersEl.textContent = users.length;
                }
            } catch (e) {
                console.error('Failed to parse users JSON:', usersText);
            }
        }
        
        const commentsResponse = await fetch('../../backend/api/admin/forum.php?type=comments');
        if (commentsResponse.ok) {
            const commentsText = await commentsResponse.text();
            try {
                const comments = JSON.parse(commentsText);
                if (Array.isArray(comments) && !comments.error) {
                    if (totalCommentsEl) totalCommentsEl.textContent = comments.length || 0;
                }
            } catch (e) {
                console.error('Failed to parse comments JSON:', commentsText);
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function refreshNotes() {
    loadRecentUploads();
    loadStats();
}

// Make functions globally accessible
window.viewNote = function(filePath) {
    if (!filePath) {
        alert('File path not available');
        return;
    }
    // Ensure proper path format - filePath should already be "uploads/filename.pdf"
    let cleanPath = filePath;
    if (!cleanPath.startsWith('uploads/')) {
        cleanPath = `uploads/${cleanPath}`;
    }
    const url = `../../${cleanPath}`;
    console.log('Opening file:', url); // Debug log
    window.open(url, '_blank');
};

window.downloadNote = function(filePath, fileName) {
    if (!filePath) {
        alert('File path not available');
        return;
    }
    // Ensure proper path format
    let cleanPath = filePath;
    if (!cleanPath.startsWith('uploads/')) {
        cleanPath = `uploads/${cleanPath}`;
    }
    const url = `../../${cleanPath}`;
    console.log('Downloading file:', url); // Debug log
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'note.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
    }, 100);
};

// User Management Functions
async function loadUsers() {
    try {
        const response = await fetch('../../backend/api/admin/users.php');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseText = await response.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse JSON:', responseText);
            throw new Error('Invalid JSON response from server. Check console for details.');
        }
        
        // Check if response is an error
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Ensure data is an array
        const users = Array.isArray(data) ? data : [];
        
        const container = document.getElementById('users-container');
        if (!container) return;
        
        if (users.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><br>No users found</div>';
            return;
        }
        
        container.innerHTML = users.map(user => {
            const isActive = user.status !== 'inactive'; // Default to active if no status field
            const statusClass = isActive ? 'status-active' : 'status-inactive';
            const statusText = isActive ? 'Active' : 'Inactive';
            
            return `
                <div class="table-row" style="grid-template-columns: 1.5fr 1fr 1fr 1fr 0.8fr 0.8fr 2fr;">
                    <div>
                        <strong>${user.fullname || 'Unknown'}</strong>
                    </div>
                    <div>${user.email || '-'}</div>
                    <div>${user.username || '-'}</div>
                    <div><span class="status-badge ${user.role === 'admin' ? 'status-active' : ''}">${user.role || 'user'}</span></div>
                    <div>${user.notes_count || 0}</div>
                    <div><span class="status-badge ${statusClass}">${statusText}</span></div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${isActive ? `
                            <button class="btn-deactivate" onclick="toggleUserStatus(${user.id}, false)" title="Deactivate User">
                                <i class="fa-solid fa-ban"></i> Deactivate
                            </button>
                        ` : `
                            <button class="btn-activate" onclick="toggleUserStatus(${user.id}, true)" title="Activate User">
                                <i class="fa-solid fa-check"></i> Activate
                            </button>
                        `}
                        <button class="btn-delete" onclick="deleteUser(${user.id})" title="Delete User">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading users:', error);
        const container = document.getElementById('users-container');
        if (container) {
            container.innerHTML = '<div class="empty-state">Error loading users. Please refresh.</div>';
        }
    }
}

async function toggleUserStatus(userId, activate) {
    try {
        const response = await fetch(`../../backend/api/admin/users.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                action: activate ? 'activate' : 'deactivate'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`User ${activate ? 'activated' : 'deactivated'} successfully!`);
            loadUsers();
        } else {
            alert('Error: ' + (result.error || 'Failed to update user status'));
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
        alert('Error updating user status. Please try again.');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`../../backend/api/admin/users.php`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: userId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('User deleted successfully!');
            loadUsers();
            loadStats(); // Refresh stats
        } else {
            alert('Error: ' + (result.error || 'Failed to delete user'));
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user. Please try again.');
    }
}

function refreshUsers() {
    loadUsers();
    loadStats();
}

// Notes Management Functions
let notesManagementData = [];
let notesManagementFilters = {
    status: '',
    course: '',
    uploader: '',
    search: '',
    sortKey: 'date',
    sortDir: 'desc'
};

function getNoteUploaderDisplay(note) {
    return note.author_name
        ? note.author_name
        : (note.author_username
            ? note.author_username
            : (note.uploaded_by ? 'User #' + note.uploaded_by : 'Unknown'));
}

function initializeNotesManagementControls() {
    const searchInput = document.getElementById('notes-search-input');
    const statusSelect = document.getElementById('notes-filter-status');
    const courseSelect = document.getElementById('notes-filter-course');
    const uploaderSelect = document.getElementById('notes-filter-uploader');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            notesManagementFilters.search = e.target.value || '';
            renderNotesManagementTable();
        });
    }

    if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
            notesManagementFilters.status = e.target.value || '';
            renderNotesManagementTable();
        });
    }

    if (courseSelect) {
        courseSelect.addEventListener('change', (e) => {
            notesManagementFilters.course = e.target.value || '';
            renderNotesManagementTable();
        });
    }

    if (uploaderSelect) {
        uploaderSelect.addEventListener('change', (e) => {
            notesManagementFilters.uploader = e.target.value || '';
            renderNotesManagementTable();
        });
    }

    // Sort controls on header
    document.querySelectorAll('[data-notes-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const key = header.getAttribute('data-notes-sort');
            if (!key) return;

            if (notesManagementFilters.sortKey === key) {
                notesManagementFilters.sortDir = notesManagementFilters.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                notesManagementFilters.sortKey = key;
                // For review workflow, default to newest / highest first
                notesManagementFilters.sortDir = key === 'date' ? 'desc' : 'desc';
            }

            renderNotesManagementTable();
        });
    });
}

function populateNotesFilterOptions() {
    const courseSelect = document.getElementById('notes-filter-course');
    const uploaderSelect = document.getElementById('notes-filter-uploader');

    if (!Array.isArray(notesManagementData) || notesManagementData.length === 0) {
        return;
    }

    if (courseSelect) {
        const previous = courseSelect.value;
        const courses = new Set();
        notesManagementData.forEach(note => {
            if (note.course) {
                courses.add(note.course);
            }
        });

        // Keep "All courses" option
        courseSelect.innerHTML = '<option value="">All courses</option>' +
            Array.from(courses).sort().map(course =>
                `<option value="${course}">${course}</option>`
            ).join('');

        if (previous && Array.from(courses).includes(previous)) {
            courseSelect.value = previous;
        }
    }

    if (uploaderSelect) {
        const previous = uploaderSelect.value;
        const uploaders = new Set();
        notesManagementData.forEach(note => {
            const uploader = getNoteUploaderDisplay(note);
            if (uploader) {
                uploaders.add(uploader);
            }
        });

        uploaderSelect.innerHTML = '<option value="">All uploaders</option>' +
            Array.from(uploaders).sort().map(uploader =>
                `<option value="${uploader}">${uploader}</option>`
            ).join('');

        if (previous && Array.from(uploaders).includes(previous)) {
            uploaderSelect.value = previous;
        }
    }
}

function renderNotesManagementTable() {
    const container = document.getElementById('notes-management-container');
    if (!container) return;

    if (!Array.isArray(notesManagementData) || notesManagementData.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><br>No notes found</div>';
        return;
    }

    let filtered = notesManagementData.slice();

    // Apply status filter
    if (notesManagementFilters.status) {
        const statusFilter = notesManagementFilters.status;
        filtered = filtered.filter(note => {
            const status = (note.status || 'approved').toLowerCase();
            return status === statusFilter;
        });
    }

    // Apply course filter
    if (notesManagementFilters.course) {
        filtered = filtered.filter(note => (note.course || '') === notesManagementFilters.course);
    }

    // Apply uploader filter
    if (notesManagementFilters.uploader) {
        filtered = filtered.filter(note => getNoteUploaderDisplay(note) === notesManagementFilters.uploader);
    }

    // Apply search
    const search = (notesManagementFilters.search || '').trim().toLowerCase();
    if (search) {
        filtered = filtered.filter(note => {
            const title = (note.title || '').toLowerCase();
            const description = (note.description || '').toLowerCase();
            const course = (note.course || '').toLowerCase();
            const uploader = getNoteUploaderDisplay(note).toLowerCase();
            return (
                title.includes(search) ||
                description.includes(search) ||
                course.includes(search) ||
                uploader.includes(search)
            );
        });
    }

    // Apply sorting
    const sortKey = notesManagementFilters.sortKey;
    const sortDir = notesManagementFilters.sortDir === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
        if (sortKey === 'views') {
            const av = parseInt(a.views, 10) || 0;
            const bv = parseInt(b.views, 10) || 0;
            return (av - bv) * sortDir;
        }
        if (sortKey === 'downloads') {
            const av = parseInt(a.downloads, 10) || 0;
            const bv = parseInt(b.downloads, 10) || 0;
            return (av - bv) * sortDir;
        }
        if (sortKey === 'date') {
            const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
            return (ad - bd) * sortDir;
        }
        return 0;
    });

    // Update sort icons
    document.querySelectorAll('[data-notes-sort]').forEach(header => {
        const key = header.getAttribute('data-notes-sort');
        const icon = header.querySelector('.sort-icon');
        if (!icon) return;

        header.classList.toggle('active', key === sortKey);

        icon.classList.remove('fa-sort', 'fa-sort-up', 'fa-sort-down');
        if (key !== sortKey) {
            icon.classList.add('fa-sort');
        } else {
            icon.classList.add(notesManagementFilters.sortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
        }
    });
    container.innerHTML = filtered.map(note => {
        const status = note.status || 'approved'; // Default to approved if no status field
        const statusClass = status === 'approved' ? 'status-approved' : (status === 'rejected' ? 'status-rejected' : 'status-pending');
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);

        // Build a safe file path (some rows may not have uploads/ prefix)
        let filePath = null;
        if (note.file_path) {
            filePath = note.file_path.startsWith('uploads/')
                ? note.file_path
                : `uploads/${note.file_path}`;
        }

        const safeFilePath = filePath ? filePath.replace(/'/g, "\\'") : null;

        const date = note.created_at ? new Date(note.created_at) : null;
        const formattedDate = date
            ? date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '-';

        return `
        <div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 0.8fr 0.8fr 1.2fr 1fr 1.5fr;">
            <div>
                <strong>${note.title || 'Untitled'}</strong>
                ${note.description ? `<br><small style="color: var(--text-secondary);">${note.description.substring(0, 50)}...</small>` : ''}
            </div>
            <div>${getNoteUploaderDisplay(note)}</div>
            <div>${note.course || '-'}</div>
            <div><span class="resource-type ${note.type || 'notes'}">${note.type || 'notes'}</span></div>
            <div>${note.views || 0}</div>
            <div>${note.downloads || 0}</div>
            <div><small>${formattedDate}</small></div>
            <div><span class="status-badge ${statusClass}">${statusText}</span></div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; justify-content: flex-start;">
                ${safeFilePath ? `
                    <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="window.open('../../${safeFilePath}', '_blank')" title="View note">
                        <i class="fa-regular fa-eye"></i> View
                    </button>
                ` : ''}
                ${status !== 'approved' ? `
                    <button class="btn-approve" onclick="approveNote(${note.note_id})" title="Approve Note">
                        <i class="fa-solid fa-check"></i> Approve
                    </button>
                ` : ''}
                ${status !== 'rejected' ? `
                    <button class="btn-reject" onclick="rejectNote(${note.note_id})" title="Reject Note">
                        <i class="fa-solid fa-times"></i> Reject
                    </button>
                ` : ''}
                <button class="btn-delete" onclick="deleteNote(${note.note_id})" title="Delete Note">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </div>
        </div>
        `;
    }).join('');
}

async function loadNotesManagement() {
    try {
        const response = await fetch('../../backend/api/admin/notes.php');
        const notes = await response.json();

        notesManagementData = Array.isArray(notes) ? notes : [];

        populateNotesFilterOptions();
        renderNotesManagementTable();
    } catch (error) {
        console.error('Error loading notes management:', error);
        const container = document.getElementById('notes-management-container');
        if (container) {
            container.innerHTML = '<div class="empty-state">Error loading notes. Please refresh.</div>';
        }
    }
}

async function approveNote(noteId) {
    try {
        const response = await fetch(`../../backend/api/admin/notes.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                note_id: noteId,
                action: 'approve'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Note approved successfully!');
            loadNotesManagement();
        } else {
            alert('Error: ' + (result.error || 'Failed to approve note'));
        }
    } catch (error) {
        console.error('Error approving note:', error);
        alert('Error approving note. Please try again.');
    }
}

async function rejectNote(noteId) {
    if (!confirm('Are you sure you want to reject this note?')) {
        return;
    }
    
    try {
        const response = await fetch(`../../backend/api/admin/notes.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                note_id: noteId,
                action: 'reject'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Note rejected successfully!');
            loadNotesManagement();
        } else {
            alert('Error: ' + (result.error || 'Failed to reject note'));
        }
    } catch (error) {
        console.error('Error rejecting note:', error);
        alert('Error rejecting note. Please try again.');
    }
}

function refreshNotesManagement() {
    loadNotesManagement();
    loadStats();
}

// Forum Functions
async function loadForumPosts() {
    try {
        const response = await fetch('../../backend/api/admin/forum.php?type=posts');
        const posts = await response.json();
        
        const container = document.getElementById('forum-posts-container');
        if (!container) return;
        
        if (posts.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><br>No forum posts found</div>';
            return;
        }
        
        container.innerHTML = posts.map(post => {
            const date = new Date(post.created_at);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            return `
                <div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;">
                    <div>
                        <strong>${post.title || 'Untitled'}</strong>
                        ${post.content ? `<br><small style="color: var(--text-secondary);">${post.content.substring(0, 60)}...</small>` : ''}
                    </div>
                    <div>${post.author_name || 'Unknown'}</div>
                    <div><span class="category-badge ${post.category || 'general'}">${post.category || 'general'}</span></div>
                    <div>${post.comment_count || 0}</div>
                    <div><small>${formattedDate}</small></div>
                    <div>
                        <button class="btn-delete" onclick="deleteForumItem('post', ${post.id})">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading posts:', error);
        const container = document.getElementById('forum-posts-container');
        if (container) {
            container.innerHTML = '<div class="empty-state">Error loading posts. Please refresh.</div>';
        }
    }
}

async function loadForumComments() {
    try {
        const response = await fetch('../../backend/api/admin/forum.php?type=comments');
        const comments = await response.json();
        
        const container = document.getElementById('forum-comments-container');
        if (!container) return;
        
        if (comments.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><br>No comments found</div>';
            return;
        }
        
        container.innerHTML = comments.map(comment => {
            const date = new Date(comment.created_at);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            return `
                <div class="table-row" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr;">
                    <div>
                        <strong>${comment.text.substring(0, 100)}${comment.text.length > 100 ? '...' : ''}</strong>
                    </div>
                    <div>${comment.author_name || 'Unknown'}</div>
                    <div><small>${comment.post_title || 'Unknown Post'}</small></div>
                    <div><small>${formattedDate}</small></div>
                    <div>
                        <button class="btn-delete" onclick="deleteForumItem('comment', ${comment.id})">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading comments:', error);
        const container = document.getElementById('forum-comments-container');
        if (container) {
            container.innerHTML = '<div class="empty-state">Error loading comments. Please refresh.</div>';
        }
    }
}

function showForumPosts() {
    document.getElementById('forum-posts-section').style.display = 'block';
    document.getElementById('forum-comments-section').style.display = 'none';
    loadForumPosts();
}

function showForumComments() {
    document.getElementById('forum-posts-section').style.display = 'none';
    document.getElementById('forum-comments-section').style.display = 'block';
    loadForumComments();
}

async function deleteForumItem(type, id) {
    const itemName = type === 'post' ? 'post' : 'comment';
    if (!confirm(`Are you sure you want to delete this ${itemName}? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`../../backend/api/admin/forum.php`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type: type, id: id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`${itemName.charAt(0).toUpperCase() + itemName.slice(1)} deleted successfully!`);
            if (type === 'post') {
                loadForumPosts();
            } else {
                loadForumComments();
            }
        } else {
            alert('Error: ' + (result.error || 'Failed to delete'));
        }
    } catch (error) {
        console.error('Error deleting:', error);
        alert('Error deleting. Please try again.');
    }
}

// Profile Functions
function initializeProfile() {
    document.getElementById('change-avatar-btn')?.addEventListener('click', () => {
        document.getElementById('avatar-file')?.click();
    });
    
    document.getElementById('avatar-file')?.addEventListener('change', handleAvatarChange);
    document.getElementById('save-profile-btn')?.addEventListener('click', saveProfile);
}

async function loadProfile() {
    try {
        const response = await fetch('../../backend/api/admin/profile.php');
        const profile = await response.json();
        
        if (profile.error) {
            console.error('Profile error:', profile.error);
            return;
        }
        
        // Update profile display
        const profileDisplayName = document.getElementById('profile-display-name');
        const profileEmail = document.getElementById('profile-email');
        const profileCourse = document.getElementById('profile-course');
        const profileRole = document.getElementById('profile-role');
        const profileBio = document.getElementById('profile-bio');
        const profileAvatar = document.getElementById('profile-avatar');
        const adminAvatarNav = document.getElementById('admin-avatar-nav');
        const adminNameNav = document.getElementById('admin-name-nav');
        
        if (profileDisplayName) profileDisplayName.textContent = profile.fullname || 'Admin User';
        if (profileEmail) profileEmail.textContent = profile.email || 'admin@noteify.com';
        if (profileCourse) profileCourse.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${profile.course || 'Administrator'}`;
        if (profileRole) profileRole.innerHTML = `<i class="fa-solid fa-shield-halved"></i> ${profile.role || 'Admin'}`;
        if (profileBio) profileBio.textContent = profile.bio || 'Administrator account';
        
        // Update avatar - handle different path formats
        let avatarUrl;
        if (profile.profile_pic && profile.profile_pic !== 'default.png' && profile.profile_pic !== 'uploads/default.png') {
            // Check if it's already a full path or relative path
            if (profile.profile_pic.startsWith('uploads/')) {
                // From frontend/admin/, we need ../../ to reach root/uploads/
                avatarUrl = `../../${profile.profile_pic}`;
            } else if (profile.profile_pic.startsWith('../')) {
                avatarUrl = profile.profile_pic;
            } else {
                // Assume it's just a filename, construct full path
                avatarUrl = `../../uploads/avatars/${profile.profile_pic}`;
            }
            // Add timestamp to force refresh
            avatarUrl += '?t=' + Date.now();
        } else {
            avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullname || 'Admin')}&background=dc2626&color=fff&size=200`;
        }
        
        if (profileAvatar) {
            profileAvatar.src = avatarUrl;
            profileAvatar.onerror = function() {
                // Fallback if image fails to load
                this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullname || 'Admin')}&background=dc2626&color=fff&size=200`;
            };
        }
        if (adminAvatarNav) {
            let navAvatarUrl;
            if (avatarUrl.includes('ui-avatars.com')) {
                navAvatarUrl = avatarUrl.replace('&size=200', '&size=40');
            } else {
                // For uploaded images, use the same URL but smaller
                navAvatarUrl = avatarUrl.split('?')[0] + '?t=' + Date.now();
            }
            adminAvatarNav.src = navAvatarUrl;
            adminAvatarNav.onerror = function() {
                this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullname || 'Admin')}&background=dc2626&color=fff&size=40`;
            };
        }
        if (adminNameNav) adminNameNav.textContent = profile.fullname || 'Admin';
        
        // Update stats
        const statNotes = document.getElementById('stat-notes');
        const statViews = document.getElementById('stat-views');
        const statDownloads = document.getElementById('stat-downloads');
        
        if (statNotes) statNotes.textContent = profile.notes_count || 0;
        if (statViews) statViews.textContent = profile.total_views || 0;
        if (statDownloads) statDownloads.textContent = profile.total_downloads || 0;
        
        // Update form fields
        const editName = document.getElementById('edit-name');
        const editEmail = document.getElementById('edit-email');
        const editUsername = document.getElementById('edit-username');
        const editCourse = document.getElementById('edit-course');
        
        if (editName) editName.value = profile.fullname || '';
        if (editEmail) editEmail.value = profile.email || '';
        if (editUsername) editUsername.value = profile.username || '';
        if (editCourse) editCourse.value = profile.course || 'Administrator';
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        event.target.value = '';
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert('Image must be 5MB or smaller');
        event.target.value = '';
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('../../backend/api/avatar.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.url) {
            // Ensure the URL is correct - result.url should already be "uploads/avatars/..."
            // From frontend/admin/, we need ../../ to reach root/uploads/
            let avatarUrl = `../../${result.url}`;
            
            // Update profile avatar immediately
            const profileAvatar = document.getElementById('profile-avatar');
            const adminAvatarNav = document.getElementById('admin-avatar-nav');
            
            if (profileAvatar) {
                // Force reload by adding timestamp
                profileAvatar.src = avatarUrl + '?t=' + Date.now();
            }
            if (adminAvatarNav) {
                // For uploaded images, use the same URL with timestamp
                adminAvatarNav.src = avatarUrl + '?t=' + Date.now();
            }
            
            alert('Avatar updated successfully!');
            // Reload profile to get updated data from database
            setTimeout(() => {
                loadProfile();
            }, 500);
        } else {
            alert('Error: ' + (result.error || 'Failed to upload avatar'));
        }
    } catch (error) {
        console.error('Avatar upload error:', error);
        alert('Failed to upload avatar');
    }
}

async function saveProfile() {
    const fullname = document.getElementById('edit-name')?.value;
    const course = document.getElementById('edit-course')?.value;
    
    // TODO: Implement API endpoint to update profile
    alert('Profile update functionality will be implemented with API endpoint');
    
    // Reload profile to reflect changes
    loadProfile();
}

