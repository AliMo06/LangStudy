const createPostBtn = document.getElementById('createPostBtn');
const postTitle = document.getElementById('postTitle');
const postContent = document.getElementById('postContent');
const feed = document.getElementById('feed');
const languageSelector = document.getElementById('languageSelector');

//I18N language
languageSelector.addEventListener('change', (e) => { //not working yet fix it fatties
    const selectedLanguage = e.target.value;
});

//New post
createPostBtn.addEventListener('click', () => {
    const title = postTitle.value.trim();
    const content = postContent.value.trim();

    if (title && content) {
        const newPost = document.createElement('div');
        newPost.className = 'post';
        newPost.innerHTML = `
            <div class="post-header">
                <div class="post-info">
                    <h3>You</h3>
                </div>
            </div>
            <div class="post-title">${escapeHtml(title)}</div>
            <div class="post-content">${escapeHtml(content)}</div>
            <div class="post-actions">
                <button class="action-button">
                    <span>👍</span>
                    <span>0 Likes</span>
                </button>
                <button class="action-button">
                    <span>💬</span>
                    <span>0 Comments</span>
                </button>
                <button class="action-button">
                    <span>🔖</span>
                    <span>Save</span>
                </button>
                <button class="action-button translate-button">
                    <span>🌐</span>
                    <span>Translate</span>
                </button>
            </div>
        `;
        feed.insertBefore(newPost, feed.firstChild);
        postTitle.value = '';
        postContent.value = '';
    } else {
        alert('Please fill in both title and content fields.'); //error handling
    }
});

//like button
document.addEventListener('click', (e) => { 
    if (e.target.closest('.action-button') && e.target.closest('.action-button').textContent.includes('Likes')) {
        const button = e.target.closest('.action-button');
        const likesText = button.querySelector('span:last-child');
        const currentLikes = parseInt(likesText.textContent);
        
        if (button.classList.contains('active')) {
            button.classList.remove('active');
            likesText.textContent = `${currentLikes - 1} Likes`;
        } else {
            button.classList.add('active');
            likesText.textContent = `${currentLikes + 1} Likes`;
        }
    }
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}