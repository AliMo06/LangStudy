// Load friends list when page loads
window.addEventListener('DOMContentLoaded', async function() {
    // First check if we're logged in
    await checkSession();
    // Then load friends
    await loadFriends();
    
    // Set up search functionality
    setupSearch();
    
    // Show all users initially
    searchUsers('');
});

async function checkSession() {
    try {
        const response = await fetch('/check-session', {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log('Session status:', data);
        
        if (!data.logged_in) {
            console.error('Not logged in, redirecting...');
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}

async function loadFriends() {
    try {
        const response = await fetch('/friends', {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            const friendsList = document.getElementById('friendsList');
            friendsList.innerHTML = ''; // Clear placeholder
            
            if (data.friends.length === 0) {
                friendsList.innerHTML = '<li style="list-style: none; padding: 10px;">No friends yet. Search for users above to add friends!</li>';
            } else {
                data.friends.forEach(friend => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = `messages.html?friend_id=${friend.id}`;
                    a.textContent = friend.fullname || friend.username;
                    li.appendChild(a);
                    friendsList.appendChild(li);
                });
            }
        } else {
            console.error('Failed to load friends:', data.message);
            if (data.message === 'Not logged in') {
                window.location.href = '/login.html';
            }
        }
    } catch (error) {
        console.error('Error loading friends:', error);
    }
}

// Set up search functionality with debouncing
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        
        const query = searchInput.value.trim();
        
        if (query.length === 0) {
            document.getElementById('searchResults').innerHTML = '';
            return;
        }
        
        // Debounce search - wait 300ms after user stops typing
        searchTimeout = setTimeout(() => {
            searchUsers(query);
        }, 300);
    });
}

async function searchUsers(query) {
    console.log('Searching for:', query); // Debug log
    
    try {
        const response = await fetch(`/search-users?query=${encodeURIComponent(query)}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        console.log('Search response status:', response.status); // Debug log
        
        const data = await response.json();
        console.log('Search results:', data); // Debug log
        
        if (data.success) {
            displaySearchResults(data.users);
        } else {
            console.error('Search failed:', data.message);
        }
    } catch (error) {
        console.error('Error searching users:', error);
    }
}

function displaySearchResults(users) {
    console.log('Displaying results for users:', users); // Debug log
    
    const searchResults = document.getElementById('searchResults');
    
    if (!searchResults) {
        console.error('searchResults element not found!');
        return;
    }
    
    searchResults.innerHTML = '';
    
    if (users.length === 0) {
        const searchQuery = document.getElementById('searchInput').value.trim();
        if (searchQuery.length > 0) {
            searchResults.innerHTML = '<p style="padding: 10px; color: #666;">No users found matching your search</p>';
        } else {
            searchResults.innerHTML = '<p style="padding: 10px; color: #666;">No other users in the system yet</p>';
        }
        return;
    }
    
    users.forEach(user => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        
        const username = document.createElement('div');
        username.className = 'username';
        username.textContent = user.username;
        
        const fullname = document.createElement('div');
        fullname.className = 'fullname';
        fullname.textContent = user.fullname;
        
        userInfo.appendChild(username);
        userInfo.appendChild(fullname);
        resultItem.appendChild(userInfo);
        
        // Add appropriate button or status based on friendship status
        if (user.friendship_status === 'friends') {
            const badge = document.createElement('span');
            badge.className = 'status-badge status-friends';
            badge.textContent = 'Friends';
            resultItem.appendChild(badge);
        } else if (user.friendship_status === 'request_sent') {
            const badge = document.createElement('span');
            badge.className = 'status-badge status-pending';
            badge.textContent = 'Request Sent';
            resultItem.appendChild(badge);
        } else if (user.friendship_status === 'request_received') {
            const badge = document.createElement('span');
            badge.className = 'status-badge status-pending';
            badge.textContent = 'Send Request Back';
            resultItem.appendChild(badge);
            
            const addBtn = document.createElement('button');
            addBtn.className = 'add-friend-btn';
            addBtn.textContent = 'Add Friend';
            addBtn.onclick = () => addFriend(user.username, addBtn);
            resultItem.appendChild(addBtn);
        } else {
            const addBtn = document.createElement('button');
            addBtn.className = 'add-friend-btn';
            addBtn.textContent = 'Add Friend';
            addBtn.onclick = () => addFriend(user.username, addBtn);
            resultItem.appendChild(addBtn);
        }
        
        searchResults.appendChild(resultItem);
    });
}

async function addFriend(username, button) {
    // Disable button to prevent multiple clicks
    button.disabled = true;
    button.textContent = 'Sending...';
    
    try {
        const response = await fetch('/add-friend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                friend_username: username
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            
            // Reload friends list if they became friends
            if (data.message.includes('now friends')) {
                await loadFriends();
            }
            
            // Refresh search results
            const searchInput = document.getElementById('searchInput');
            if (searchInput.value.trim()) {
                searchUsers(searchInput.value.trim());
            }
        } else {
            alert('Failed to add friend: ' + data.message);
            button.disabled = false;
            button.textContent = 'Add Friend';
        }
    } catch (error) {
        console.error('Error adding friend:', error);
        alert('Error adding friend');
        button.disabled = false;
        button.textContent = 'Add Friend';
    }
}