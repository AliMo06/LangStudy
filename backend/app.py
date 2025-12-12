from flask import Flask, request, jsonify, session
from flask_cors import CORS
from database import get_db_connection, hash_password, init_db
import sqlite3

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-later'

# More specific CORS configuration to handle sessions properly
CORS(app, 
     supports_credentials=True,
     origins=["http://localhost:*", "http://127.0.0.1:*", "null"],
     allow_headers=["Content-Type"],
     expose_headers=["Content-Type"])

init_db()

# ========== USER AUTHENTICATION ==========
session_id = ""
session_username = ""

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
        session_id = session['user_id']
        session_username = session['username']
        return jsonify({'success': True, 'message': 'Login successful', 'username': user['username']})
    else:
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})

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

@app.route('/friends', methods=['GET'])
def get_friends():
    """Get list of all friends for the logged-in user"""
    
    user_id = session_id
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get accepted friendships
    friends = cursor.execute('''
        SELECT u.id, u.username, u.fullname 
        FROM users u
        INNER JOIN friendships f ON (f.friend_id = u.id OR f.user_id = u.id)
        WHERE (f.user_id = ? OR f.friend_id = ?) 
        AND f.status = 'accepted'
        AND u.id != ?
    ''', (user_id, user_id, user_id)).fetchall()
    
    conn.close()
    
    friends_list = [{'id': f['id'], 'username': f['username'], 'fullname': f['fullname']} for f in friends]
    return jsonify({'success': True, 'friends': friends_list})

@app.route('/add-friend', methods=['POST'])
def add_friend():
    """Send a friend request"""
    
    data = request.get_json()
    friend_username = data.get('friend_username')
    
    if not friend_username:
        return jsonify({'success': False, 'message': 'Friend username required'}), 400
    
    user_id = session_id
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
    
    try:
        cursor.execute(
            'INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, ?)',
            (user_id, friend_id, 'accepted')  # Auto-accept for simplicity
        )
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Friend added successfully'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'success': False, 'message': 'Friendship already exists'}), 400

@app.route('/send-message', methods=['POST'])
def send_message():
    """Send a message to a friend"""
    
    data = request.get_json()
    receiver_id = data.get('receiver_id')
    message_text = data.get('message_text')
    
    if not receiver_id or not message_text:
        return jsonify({'success': False, 'message': 'Receiver ID and message text required'}), 400
    
    sender_id = session_id
    
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

    user_id = session_id
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
    
    user_id = session_id
    conn = get_db_connection()
    cursor = conn.cursor()
    
    count = cursor.execute(
        'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND read_status = 0',
        (user_id,)
    ).fetchone()['count']
    
    conn.close()
    
    return jsonify({'success': True, 'unread_count': count})

if __name__ == '__main__':
    app.run(debug=True, port=5000)