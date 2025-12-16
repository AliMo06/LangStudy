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

//verify user session is valid
async function checkSession() {
    try {
        const response = await fetch('/check-session', {
            method: 'GET',
            credentials: 'include'  //include cookies for session
        });
        
        const data = await response.json();
        console.log('Session status:', data);
        
        //redirect to login if not logged in
        if (!data.logged_in) {
            console.error('Not logged in, redirecting...');
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}

//loads and displays the user's friends list
async function loadFriends() {
    try {
        //request friends from backend
        const response = await fetch('/friends', {
            method: 'GET',
            credentials: 'include'  //include cookies for session
        });
        
        const data = await response.json();
        
        if (data.success) {
            const friendsList = document.getElementById('friendsList');
            friendsList.innerHTML = ''; // Clear placeholder
            
            //show message if no friends
            if (data.friends.length === 0) {
                friendsList.innerHTML = '<li style="list-style: none; padding: 10px;">No friends yet. Search for users above to add friends!</li>';
            } else {
                //create a clickable list item for each friend
                data.friends.forEach(friend => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = `messages.html?friend_id=${friend.id}`;  //link to messages page with this friends ID
                    a.textContent = friend.fullname || friend.username;  //display full name if available, otherwise username
                    li.appendChild(a);
                    friendsList.appendChild(li);
                });
            }
        } else {
            console.error('Failed to load friends:', data.message);
            //redirect to login if session expired
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
    let searchTimeout;  //debounce timer
    
    searchInput.addEventListener('input', function() {
        //clear previous timeout
        clearTimeout(searchTimeout);
        
        const query = searchInput.value.trim();
        
        // If search box is empty, clear results and return
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
        //encode query to handle special characters in URLs
        const response = await fetch(`/search-users?query=${encodeURIComponent(query)}`, {
            method: 'GET',
            credentials: 'include' //include session cookies
        });
        
        console.log('Search response status:', response.status); // Debug log
        
        const data = await response.json();
        console.log('Search results:', data); // Debug log
        
        if (data.success) {
            // Display the search results
            displaySearchResults(data.users);
        } else {
            console.error('Search failed:', data.message);
        }
    } catch (error) {
        console.error('Error searching users:', error);
    }
}

//displays user search results with appropriate friendship status indicators
function displaySearchResults(users) {
    console.log('Displaying results for users:', users); // Debug log
    
    const searchResults = document.getElementById('searchResults');
    
    //safety check
    if (!searchResults) {
        console.error('searchResults element not found!');
        return;
    }
    
    //clear previous results
    searchResults.innerHTML = '';
    
    //show message if no users found
    if (users.length === 0) {
        const searchQuery = document.getElementById('searchInput').value.trim();
        if (searchQuery.length > 0) {
            searchResults.innerHTML = '<p style="padding: 10px; color: #666;">No users found matching your search</p>';
        } else {
            searchResults.innerHTML = '<p style="padding: 10px; color: #666;">No other users in the system yet</p>';
        }
        return;
    }
    
    //create a result item for each user
    users.forEach(user => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        //create user info section
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
            //already friends
            const badge = document.createElement('span');
            badge.className = 'status-badge status-friends';
            badge.textContent = i18n.t('messages.friends');
            resultItem.appendChild(badge);
        } else if (user.friendship_status === 'request_sent') {
            //request already sent
            const badge = document.createElement('span');
            badge.className = 'status-badge status-pending';
            badge.textContent = i18n.t('messages.requestSent');
            resultItem.appendChild(badge);
        } else if (user.friendship_status === 'request_received') {
            //other user sent a request
            const badge = document.createElement('span');
            badge.className = 'status-badge status-pending';
            badge.textContent = i18n.t('messages.sendRequestBack');
            resultItem.appendChild(badge);
            
            const addBtn = document.createElement('button');
            addBtn.className = 'add-friend-btn';
            addBtn.textContent = i18n.t('messages.addFriend');
            addBtn.onclick = () => addFriend(user.username, addBtn);
            resultItem.appendChild(addBtn);
        } else {
            //not friends - show add friend button
            const addBtn = document.createElement('button');
            addBtn.className = 'add-friend-btn';
            addBtn.textContent = i18n.t('messages.addFriend');
            addBtn.onclick = () => addFriend(user.username, addBtn);
            resultItem.appendChild(addBtn);
        }
        
        searchResults.appendChild(resultItem);
    });
}

//send a friend request to the specified user
async function addFriend(username, button) {
    // Disable button to prevent multiple clicks
    button.disabled = true;
    button.textContent = i18n.t('messages.sending');
    
    try {
        //send friend request to backend
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
            //show success message
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
            //show error message
            alert(i18n.t('messages.failedToAdd') + data.message);
            button.disabled = false;
            button.textContent = i18n.t('messages.addFriend');
        }
    } catch (error) {
        console.error('Error adding friend:', error);
        alert(i18n.t('messages.errorAddingFriend'));
        button.disabled = false;
        button.textContent = i18n.t('messages.addFriend');
    }
}

// Handle language change from dropdown
const languageDropdown = document.getElementById('language-dropdown');
if (languageDropdown) {
    languageDropdown.addEventListener('change', async () => {
        setTimeout(async () => {  //reload page to apply new language setting
            await (window.location.href = window.location.href);
        }, 50);
    });
}