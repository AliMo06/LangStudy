from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from database import get_db_connection, hash_password, init_db
import sqlite3
import os

# Setup paths for frontend directory
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')

app = Flask(__name__, static_folder=FRONTEND_DIR)
app.secret_key = 'your-secret-key-change-this-later'

# Configure session settings
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_DOMAIN'] = None

# CORS configuration
CORS(app, 
     supports_credentials=True,
     origins=["http://localhost:5000", "http://127.0.0.1:5000"],
     allow_headers=["Content-Type"],
     expose_headers=["Content-Type"])

init_db()

# Serve HTML files
@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:filename>')
def serve_frontend(filename):
    # Serve all files from frontend directory
    try:
        return send_from_directory(FRONTEND_DIR, filename)
    except Exception as e:
        print(f"Error serving {filename}: {e}")
        return "File not found", 404

# ========== USER AUTHENTICATION ==========

@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    fullname = data.get('fullname')
    email = data.get('email')
    username = data.get('username')
    password = data.get('password')
    
    if not all([fullname, email, username, password]):
        return jsonify({'success': False, 'message': 'All fields are required'}), 400
    
    password_hash = hash_password(password)
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO users (fullname, email, username, password_hash) VALUES (?, ?, ?, ?)',
            (fullname, email, username, password_hash)
        )
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Account created successfully'})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Username or email already exists'}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required'}), 400
    
    password_hash = hash_password(password)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    user = cursor.execute(
        'SELECT * FROM users WHERE username = ? AND password_hash = ?',
        (username, password_hash)
    ).fetchone()
    conn.close()
    
    if user:
        session['user_id'] = user['id']
        session['username'] = user['username']
        return jsonify({'success': True, 'message': 'Login successful', 'username': user['username']})
    else:
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})

# Debug endpoint to check session
@app.route('/check-session', methods=['GET'])
def check_session():
    if 'user_id' in session:
        return jsonify({
            'logged_in': True, 
            'user_id': session['user_id'],
            'username': session.get('username')
        })
    else:
        return jsonify({'logged_in': False})

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    username = data.get('username')
    new_password = data.get('new_password')
    
    if not all([email, username, new_password]):
        return jsonify({'success': False, 'message': 'All fields are required'}), 400
    
    if len(new_password) < 8:
        return jsonify({'success': False, 'message': 'Password must be at least 8 characters'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    user = cursor.execute(
        'SELECT * FROM users WHERE email = ? AND username = ?',
        (email, username)
    ).fetchone()
    
    if not user:
        conn.close()
        return jsonify({'success': False, 'message': 'No account found with that email and username'}), 404
    
    new_password_hash = hash_password(new_password)
    cursor.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        (new_password_hash, user['id'])
    )
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Password reset successfully'})

# ========== MESSAGING ENDPOINTS ==========

@app.route('/search-users', methods=['GET'])
def search_users():
    """Search for users by username"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    query = request.args.get('query', '').strip().lower()
    
    user_id = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # If query is empty or too short, show all users (excluding self)
    if len(query) == 0:
        users = cursor.execute('''
            SELECT id, username, fullname 
            FROM users 
            WHERE id != ?
            ORDER BY username
            LIMIT 20
        ''', (user_id,)).fetchall()
    else:
        # Search for users whose username contains the query (case-insensitive)
        users = cursor.execute('''
            SELECT id, username, fullname 
            FROM users 
            WHERE LOWER(username) LIKE ? AND id != ?
            ORDER BY username
            LIMIT 20
        ''', (f'%{query}%', user_id)).fetchall()
    
    print(f"Found {len(users)} users matching '{query}'")
    
    # For each user, check friendship status
    results = []
    for user in users:
        # Check if already friends or request pending
        friendship_out = cursor.execute(
            'SELECT status FROM friendships WHERE user_id = ? AND friend_id = ?',
            (user_id, user['id'])
        ).fetchone()
        
        friendship_in = cursor.execute(
            'SELECT status FROM friendships WHERE user_id = ? AND friend_id = ?',
            (user['id'], user_id)
        ).fetchone()
        
        status = 'none'
        if friendship_out and friendship_out['status'] == 'accepted':
            status = 'friends'
        elif friendship_in and friendship_in['status'] == 'accepted':
            status = 'friends'
        elif friendship_out and friendship_out['status'] == 'pending':
            if friendship_in and friendship_in['status'] == 'pending':
                status = 'friends'  # Both sent requests
            else:
                status = 'request_sent'
        elif friendship_in and friendship_in['status'] == 'pending':
            status = 'request_received'
        
        results.append({
            'id': user['id'],
            'username': user['username'],
            'fullname': user['fullname'],
            'friendship_status': status
        })
    
    conn.close()
    print(f"Returning {len(results)} results")
    return jsonify({'success': True, 'users': results})

@app.route('/friends', methods=['GET'])
def get_friends():
    """Get list of all friends for the logged-in user"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    user_id = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get accepted friendships - need to check both directions but avoid duplicates
    friends = cursor.execute('''
        SELECT DISTINCT u.id, u.username, u.fullname 
        FROM users u
        WHERE u.id IN (
            SELECT CASE 
                WHEN f.user_id = ? THEN f.friend_id
                WHEN f.friend_id = ? THEN f.user_id
            END as friend_user_id
            FROM friendships f
            WHERE (f.user_id = ? OR f.friend_id = ?)
            AND f.status = 'accepted'
        )
        AND u.id != ?
        ORDER BY u.username
    ''', (user_id, user_id, user_id, user_id, user_id)).fetchall()
    
    conn.close()
    
    friends_list = [{'id': f['id'], 'username': f['username'], 'fullname': f['fullname']} for f in friends]
    return jsonify({'success': True, 'friends': friends_list})

@app.route('/add-friend', methods=['POST'])
def add_friend():
    """Send a friend request (mutual requests required to become friends)"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    data = request.get_json()
    friend_username = data.get('friend_username')
    
    if not friend_username:
        return jsonify({'success': False, 'message': 'Friend username required'}), 400
    
    user_id = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Find friend by username
    friend = cursor.execute('SELECT id FROM users WHERE username = ?', (friend_username,)).fetchone()
    
    if not friend:
        conn.close()
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    friend_id = friend['id']
    
    if friend_id == user_id:
        conn.close()
        return jsonify({'success': False, 'message': 'Cannot add yourself as friend'}), 400
    
    # Check if there's already a pending request from this user
    existing_request = cursor.execute(
        'SELECT * FROM friendships WHERE user_id = ? AND friend_id = ?',
        (user_id, friend_id)
    ).fetchone()
    
    if existing_request:
        conn.close()
        if existing_request['status'] == 'accepted':
            return jsonify({'success': False, 'message': 'Already friends'}), 400
        else:
            return jsonify({'success': False, 'message': 'Friend request already sent'}), 400
    
    # Check if the other user has sent a request to us
    reverse_request = cursor.execute(
        'SELECT * FROM friendships WHERE user_id = ? AND friend_id = ?',
        (friend_id, user_id)
    ).fetchone()
    
    try:
        if reverse_request and reverse_request['status'] == 'pending':
            # Both users have now sent requests - accept ONLY the reverse request, don't create new one
            cursor.execute(
                'UPDATE friendships SET status = ? WHERE user_id = ? AND friend_id = ?',
                ('accepted', friend_id, user_id)
            )
            # Also create the mirror friendship so queries work both ways
            cursor.execute(
                'INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, ?)',
                (user_id, friend_id, 'accepted')
            )
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'Friend request accepted! You are now friends.'})
        else:
            # Create a pending request
            cursor.execute(
                'INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, ?)',
                (user_id, friend_id, 'pending')
            )
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'Friend request sent'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'success': False, 'message': 'Database error occurred'}), 400

@app.route('/send-message', methods=['POST'])
def send_message():
    """Send a message to a friend"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    data = request.get_json()
    receiver_id = data.get('receiver_id')
    message_text = data.get('message_text')
    
    if not receiver_id or not message_text:
        return jsonify({'success': False, 'message': 'Receiver ID and message text required'}), 400
    
    sender_id = session['user_id']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify friendship exists
    friendship = cursor.execute('''
        SELECT * FROM friendships 
        WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
        AND status = 'accepted'
    ''', (sender_id, receiver_id, receiver_id, sender_id)).fetchone()
    
    if not friendship:
        conn.close()
        return jsonify({'success': False, 'message': 'You are not friends with this user'}), 403
    
    cursor.execute(
        'INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)',
        (sender_id, receiver_id, message_text)
    )
    conn.commit()
    
    message_id = cursor.lastrowid
    timestamp = cursor.execute('SELECT timestamp FROM messages WHERE id = ?', (message_id,)).fetchone()['timestamp']
    
    conn.close()
    
    return jsonify({
        'success': True, 
        'message': 'Message sent',
        'message_id': message_id,
        'timestamp': timestamp
    })

@app.route('/get-messages/<int:friend_id>', methods=['GET'])
def get_messages(friend_id):
    """Get all messages between logged-in user and a specific friend"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    user_id = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all messages between these two users
    messages = cursor.execute('''
        SELECT m.id, m.sender_id, m.receiver_id, m.message_text, m.timestamp, m.read_status,
               u.username as sender_username
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE (m.sender_id = ? AND m.receiver_id = ?) 
           OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.timestamp ASC
    ''', (user_id, friend_id, friend_id, user_id)).fetchall()
    
    # Mark messages as read
    cursor.execute('''
        UPDATE messages 
        SET read_status = 1 
        WHERE receiver_id = ? AND sender_id = ? AND read_status = 0
    ''', (user_id, friend_id))
    conn.commit()
    conn.close()
    
    messages_list = [{
        'id': m['id'],
        'sender_id': m['sender_id'],
        'receiver_id': m['receiver_id'],
        'message_text': m['message_text'],
        'timestamp': m['timestamp'],
        'read_status': m['read_status'],
        'sender_username': m['sender_username'],
        'is_mine': m['sender_id'] == user_id
    } for m in messages]
    
    return jsonify({'success': True, 'messages': messages_list})

@app.route('/unread-count', methods=['GET'])
def unread_count():
    """Get count of unread messages for logged-in user"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    user_id = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    
    count = cursor.execute(
        'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND read_status = 0',
        (user_id,)
    ).fetchone()['count']
    
    conn.close()
    
    return jsonify({'success': True, 'unread_count': count})

# ========== SOCIAL POSTS ==========

@app.route("/posts", methods=["GET"])
def get_posts():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            p.id,
            p.author,
            p.title,
            p.content,
            p.created_at,
            p.reposted_from,
            p.reposted_by,
            orig.title AS original_title,
            orig.content AS original_content,
            orig.author AS original_author
        FROM posts p
        LEFT JOIN posts orig ON p.reposted_from = orig.id
        ORDER BY p.created_at DESC
    """)

    posts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(posts)


@app.route("/posts", methods=["POST"])
def create_post():
    if 'username' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401

    data = request.get_json()
    title = data.get("title")
    content = data.get("content")

    if not title or not content:
        return jsonify({'success': False, 'message': 'Missing fields'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO posts (author, title, content)
        VALUES (?, ?, ?)
    """, (session['username'], title, content))

    conn.commit()
    conn.close()

    return jsonify({'success': True})


@app.route("/repost", methods=["POST"])
def repost():
    if 'username' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401

    data = request.get_json()
    post_id = data.get("post_id")

    conn = get_db_connection()
    cursor = conn.cursor()

    original = cursor.execute(
        "SELECT * FROM posts WHERE id = ?",
        (post_id,)
    ).fetchone()

    if not original:
        conn.close()
        return jsonify({'success': False, 'message': 'Post not found'}), 404

    cursor.execute("""
        INSERT INTO posts (
            author, title, content,
            reposted_from, reposted_by
        )
        VALUES (?, ?, ?, ?, ?)
    """, (
        original['author'],
        original['title'],
        original['content'],
        original['id'],
        session['username']
    ))

    conn.commit()
    conn.close()

    return jsonify({'success': True})


# ========== LIKES ==========

@app.route('/like', methods=['POST'])
def like_post():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401

    data = request.get_json()
    post_id = data.get('post_id')
    user_id = session['user_id']

    if not post_id:
        return jsonify({'success': False, 'message': 'Post ID required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Get original post ID (follow repost chain)
    post = cursor.execute('SELECT reposted_from FROM posts WHERE id = ?', (post_id,)).fetchone()
    if not post:
        conn.close()
        return jsonify({'success': False, 'message': 'Post not found'}), 404

    original_post_id = post['reposted_from'] or post_id

    # Check if user already liked
    existing = cursor.execute(
        'SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?',
        (user_id, original_post_id)
    ).fetchone()

    if existing:
        # Unlike
        cursor.execute('DELETE FROM post_likes WHERE id = ?', (existing['id'],))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'action': 'unliked'})
    else:
        # Like
        cursor.execute('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)',
                       (user_id, original_post_id))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'action': 'liked'})


@app.route('/post-likes/<int:post_id>', methods=['GET'])
def get_post_likes(post_id):
    """Get like count and whether current user liked it"""
    if 'user_id' not in session:
        user_id = None
    else:
        user_id = session['user_id']

    conn = get_db_connection()
    cursor = conn.cursor()

    post = cursor.execute('SELECT reposted_from FROM posts WHERE id = ?', (post_id,)).fetchone()
    if not post:
        conn.close()
        return jsonify({'success': False, 'message': 'Post not found'}), 404

    original_post_id = post['reposted_from'] or post_id

    count = cursor.execute(
        'SELECT COUNT(*) as cnt FROM post_likes WHERE post_id = ?',
        (original_post_id,)
    ).fetchone()['cnt']

    liked = False
    if user_id:
        liked = cursor.execute(
            'SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?',
            (original_post_id, user_id)
        ).fetchone() is not None

    conn.close()
    return jsonify({'success': True, 'count': count, 'liked': liked})


if __name__ == '__main__':
    app.run(debug=True, port=5000)