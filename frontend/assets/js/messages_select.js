// Load friends list when page loads
window.addEventListener('DOMContentLoaded', async function() {
    // Then load friends
    await loadFriends();
});

async function loadFriends() {
    try {
        const response = await fetch('http://localhost:5000/friends', {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            const friendsList = document.querySelector('ul');
            friendsList.innerHTML = ''; // Clear placeholder friends
            
            if (data.friends.length === 0) {
                friendsList.innerHTML = '<li style="list-style: none; padding: 10px;">No friends yet. Add friends to start messaging!</li>';
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
                window.location.href = 'login.html'; // Redirect to login if not authenticated
            }
        }
    } catch (error) {
        console.error('Error loading friends:', error);
    }
}

// Optional: Add friend functionality
async function addFriend(username) {
    try {
        const response = await fetch('http://localhost:5000/add-friend', {
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
            alert('Friend added successfully!');
            loadFriends(); // Reload the friends list
        } else {
            alert('Failed to add friend: ' + data.message);
        }
    } catch (error) {
        console.error('Error adding friend:', error);
        alert('Error adding friend');
    }
}