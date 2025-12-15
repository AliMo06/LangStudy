const createPostBtn = document.getElementById('createPostBtn');
const postTitle = document.getElementById('postTitle');
const postContent = document.getElementById('postContent');
const feed = document.getElementById('feed');

// Store translations to avoid re-translating
const translations = {};

// Create post box
createPostBtn.addEventListener('click', async () => {
    const title = postTitle.value.trim();
    const content = postContent.value.trim();

    if (!title || !content) {
        alert('Please fill in both title and content fields.');
        return;
    }

    try {
        const res = await fetch('/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title, content })
        });

        const data = await res.json();

        if (!data.success) {
            alert('Failed to create post: ' + (data.message || 'unknown error'));
            return;
        }

        postTitle.value = '';
        postContent.value = '';

        await loadFeed();

    } catch (err) {
        console.error(err);
        alert('Network error while creating post');
    }
});

// Load all posts
async function loadFeed() {
    feed.innerHTML = '';
    try {
        const res = await fetch('/posts', { credentials: 'include' });
        const posts = await res.json();
        for (let post of posts) {
            await renderPost(post);
        }
    } catch (err) {
        console.error(err);
        feed.innerHTML = '<p>Failed to load posts.</p>';
    }
}

// Creating a post
async function renderPost(post) {
    const div = document.createElement('div');
    div.className = 'post';
    div.innerHTML = `
        <div class="post-header">
            <div class="post-info">
                <h3>
                    ${escapeHtml(post.author)} 
                    ${post.reposted_by ? `<span>🔁 ${i18n.t('post.repostedBy')} ${escapeHtml(post.reposted_by)}</span>` : ''}
                </h3>
            </div>
        </div>
        <div class="post-title">${escapeHtml(post.title)}</div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        <div class="post-actions">
            <button class="action-button like-button" data-post-id="${post.id}">
                <span>👍</span>
                <span class="like-count">0  ${i18n.t('post.likes')}</span>
            </button>
            <button class="action-button repost-button" data-post-id="${post.id}">
                <span>🔁</span>
                <span>${i18n.t('post.repost')}</span>
            </button>
            <button class="action-button translate-button" data-post-id="${post.id}">
                <span>🌐</span>
                <span>${i18n.t('post.translate')}</span>
            </button>
        </div>
    `;

    feed.appendChild(div);

    const likeBtn = div.querySelector('.like-button');
    const likeCountSpan = likeBtn.querySelector('.like-count');
    const repostBtn = div.querySelector('.repost-button');
    const translateBtn = div.querySelector('.translate-button');

    // Like Count
    try {
        const res = await fetch(`/post-likes/${post.id}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
            likeCountSpan.textContent = `${data.count} ${i18n.t('post.likes')}`;
            if (data.liked) likeBtn.classList.add('active');
        }
    } catch (err) { 
        console.error('Failed to load likes', err);
    }

    // Likes
    likeBtn.addEventListener('click', async () => {
        const postId = likeBtn.getAttribute('data-post-id');
        try {
            const res = await fetch('/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ post_id: postId })
            });
            const result = await res.json();
            if (result.success) {
                const likeRes = await fetch(`/post-likes/${postId}`, { credentials: 'include' });
                const likeData = await likeRes.json();
                if (likeData.success) {
                    likeCountSpan.textContent = `${likeData.count} ${i18n.t('post.likes')}`; 
                    if (likeData.liked) likeBtn.classList.add('active');
                    else likeBtn.classList.remove('active');
                }
            } else {
                alert(result.message || 'Failed to like/unlike');
            }
        } catch (err) {
            console.error(err);
            alert('Network error while liking post');
        }
    });

    // Repost
    repostBtn.addEventListener('click', async () => {
        const postId = repostBtn.getAttribute('data-post-id');
        try {
            const res = await fetch('/repost', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ post_id: postId })
            });
            const data = await res.json();
            if (data.success) {
                alert('Post reposted!');
                await loadFeed(); 
            } else {
                alert('Failed to repost: ' + (data.message || 'unknown error'));
            }
        } catch (err) {
            console.error(err);
            alert('Network error while reposting');
        }
    });

    // Translation
    translateBtn.addEventListener('click', async () => {
        await translatePost(post.id, post.title, post.content, div, translateBtn);
    });

    // Show cached translation if exists
    if (translations[post.id]) {
        displayTranslation(div, translations[post.id]);
        translateBtn.querySelector('span:last-child').textContent = i18n.t('post.translated') || 'Translated';
    }
}

async function translatePost(postId, title, content, postDiv, button) {
    const targetLang = i18n.currentLang;
    
    // Check if already translated
    if (translations[postId]) {
        return;
    }
    
    // Disable button and show loading state
    const originalText = button.querySelector('span:last-child').textContent;
    button.disabled = true;
    button.querySelector('span:last-child').textContent = i18n.t('post.translating') || 'Translating...';
    
    try {
        // Translate both title and content
        const titleResponse = await fetch('/api/translate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                text: title,
                target_language: targetLang
            })
        });
        
        const contentResponse = await fetch('/api/translate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                text: content,
                target_language: targetLang
            })
        });
        
        const titleData = await titleResponse.json();
        const contentData = await contentResponse.json();
        
        if (titleData.translated_text && contentData.translated_text) {
            const translatedTitle = titleData.translated_text;
            const translatedContent = contentData.translated_text;
            
            // Store translation
            translations[postId] = {
                title: translatedTitle,
                content: translatedContent
            };
            
            // Display translation
            displayTranslation(postDiv, translations[postId]);
            
            // Update button to show translation is complete
            button.querySelector('span:last-child').textContent = i18n.t('post.translated') || 'Translated';
        } else {
            console.error('Translation error:', titleData.error || contentData.error);
            alert(i18n.t('post.translationFailed') || 'Translation failed. Please try again.');
            button.disabled = false;
            button.querySelector('span:last-child').textContent = originalText;
        }
    } catch (error) {
        console.error('Translation error:', error);
        alert(i18n.t('post.translationUnavailable') || 'Translation service unavailable. Please try again later.');
        button.disabled = false;
        button.querySelector('span:last-child').textContent = originalText;
    }
}

function displayTranslation(postDiv, translation) {
    // Check if translation already displayed
    let translationDiv = postDiv.querySelector('.post-translation');
    
    if (!translationDiv) {
        translationDiv = document.createElement('div');
        translationDiv.className = 'post-translation';
        translationDiv.innerHTML = `
            <div class="translation-label">${i18n.t('post.translationLabel') || 'Translation:'}</div>
            <div class="translated-title">${escapeHtml(translation.title)}</div>
            <div class="translated-content">${escapeHtml(translation.content)}</div>
        `;
        
        // Insert before post-actions
        const actionsDiv = postDiv.querySelector('.post-actions');
        postDiv.insertBefore(translationDiv, actionsDiv);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

loadFeed();

const languageDropdown = document.getElementById('language-dropdown');
if (languageDropdown) {
    languageDropdown.addEventListener('change', async () => {
        setTimeout(async () => {
            await loadFeed();
        }, 50);
    });
}