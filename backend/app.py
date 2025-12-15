from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from database import get_db_connection, hash_password, init_db
import sqlite3
import os
import asyncio
import whisper
from googletrans import Translator
from gtts import gTTS
import tempfile
import base64
from functools import wraps
import time

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')

app = Flask(__name__, static_folder=FRONTEND_DIR)
app.secret_key = 'your-secret-key-change-this-later'

app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_DOMAIN'] = None

CORS(app, 
     supports_credentials=True,
     origins=["http://localhost:5000", "http://127.0.0.1:5000"],
     allow_headers=["Content-Type"],
     expose_headers=["Content-Type"])

init_db()

class SpeechTranslator:
    #init for the translator object
    def __init__(self, target_language='en', model_size='base'):
        print("Loading Whisper...")
        self.whisper_model = whisper.load_model(model_size)
        self.translator = Translator()
        self.target_language = target_language

    #whisper for stt
    def transcribe_audio(self, audio_file):
        print("Transcribing audio...")
        result = self.whisper_model.transcribe(audio_file)
        return result["text"]

    async def translate_text(self, text, max_retries=3):
        """Translate text with retry logic"""
        for attempt in range(max_retries):
            try:
                print(f"Translating to {self.target_language}... (attempt {attempt + 1}/{max_retries})")
                
                # Create a fresh translator instance on each retry
                if attempt > 0:
                    self.translator = Translator()
                    await asyncio.sleep(1)  # Wait 1 second before retry
                
                translation = await self.translator.translate(
                    text,
                    dest=self.target_language
                )
                
                if translation and translation.text:
                    return translation.text
                else:
                    raise Exception("Empty translation received")
                    
            except Exception as e:
                print(f"Translation attempt {attempt + 1} failed: {str(e)}")
                
                if attempt == max_retries - 1:
                    raise Exception(f"Translation failed after {max_retries} attempts: {str(e)}")
                
                await asyncio.sleep(2 ** attempt)
        
        raise Exception("Translation failed")

    def text_to_speech(self, text, output_file):
        print("Generating speech...")
        tts = gTTS(text=text, lang=self.target_language)
        tts.save(output_file)


speech_translator = SpeechTranslator(target_language='en', model_size='base')

def async_route(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        return asyncio.run(f(*args, **kwargs))
    return wrapped


@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    """Transcribe audio to text using Whisper"""
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            audio_path = tmp.name
            audio_file.save(audio_path)
        
        text = speech_translator.transcribe_audio(audio_path)
        
        os.remove(audio_path)
        
        return jsonify({'text': text})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/translate', methods=['POST'])
@async_route
async def translate():
    """Translate text to target language"""
    try:
        data = request.get_json()
        text = data.get('text')
        target_lang = data.get('target_language', 'en')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        if not target_lang:
            return jsonify({'error': 'No target language specified'}), 400
        
        print(f"Translating '{text[:50]}...' to {target_lang}")
        
        speech_translator.target_language = target_lang
        translated_text = await speech_translator.translate_text(text)
        
        return jsonify({'translated_text': translated_text})
    
    except Exception as e:
        error_msg = str(e)
        print(f"Translation error: {error_msg}")
        
        if "JSONDecodeError" in error_msg or "Expecting value" in error_msg:
            return jsonify({'error': 'Translation service temporarily unavailable. Please try again.'}), 503
        else:
            return jsonify({'error': f'Translation failed: {error_msg}'}), 500

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech audio file"""
    try:
        data = request.get_json()
        text = data.get('text')
        lang = data.get('language', 'en')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
            output_path = tmp.name
        
        speech_translator.target_language = lang
        speech_translator.text_to_speech(text, output_path)
        
        with open(output_path, 'rb') as f:
            audio_data = base64.b64encode(f.read()).decode('utf-8')
        
        os.remove(output_path)
        
        return jsonify({'audio': audio_data})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/full-translation', methods=['POST'])
@async_route
async def full_translation():
    """Complete pipeline: audio -> transcribe -> translate -> TTS"""
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        target_lang = request.form.get('target_language', 'en')
        
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_audio:
            audio_path = tmp_audio.name
            audio_file.save(audio_path)

        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp_output:
            output_path = tmp_output.name

        try:
            speech_translator.target_language = target_lang
            
            original_text = speech_translator.transcribe_audio(audio_path)
            print(f"\nOriginal text: {original_text}")

            translated_text = await speech_translator.translate_text(original_text)
            print(f"Translated text: {translated_text}\n")

            speech_translator.text_to_speech(translated_text, output_path)
            
            with open(output_path, 'rb') as f:
                audio_data = base64.b64encode(f.read()).decode('utf-8')
            
            return jsonify({
                'original_text': original_text,
                'translated_text': translated_text,
                'audio': audio_data
            })
        
        finally:
            if os.path.exists(audio_path):
                os.remove(audio_path)
            if os.path.exists(output_path):
                os.remove(output_path)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:filename>')
def serve_frontend(filename):
    try:
        return send_from_directory(FRONTEND_DIR, filename)
    except Exception as e:
        print(f"Error serving {filename}: {e}")
        return "File not found", 404


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


# ========== LANGUAGE EXCHANGE ENDPOINTS ==========

@app.route('/publish-exchange-request', methods=['POST'])
def publish_exchange_request():
    """Publish a language exchange request"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    data = request.get_json()
    speaks = data.get('speaks', [])
    learning = data.get('learning', [])
    
    if not speaks or not learning:
        return jsonify({'success': False, 'message': 'Must specify languages'}), 400
    
    user_id = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Delete any existing request from this user
    cursor.execute('DELETE FROM exchange_requests WHERE user_id = ?', (user_id,))
    
    # Create new request
    cursor.execute('''
        INSERT INTO exchange_requests (user_id, speaks_languages, learning_languages)
        VALUES (?, ?, ?)
    ''', (user_id, ','.join(speaks), ','.join(learning)))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Request published'})

@app.route('/get-exchange-requests', methods=['GET'])
def get_exchange_requests():
    """Get all exchange requests except from current user"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    user_id = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    
    requests = cursor.execute('''
        SELECT e.user_id, e.speaks_languages, e.learning_languages, 
               u.username, u.fullname
        FROM exchange_requests e
        JOIN users u ON e.user_id = u.id
        WHERE e.user_id != ?
        ORDER BY e.created_at DESC
    ''', (user_id,)).fetchall()
    
    conn.close()
    
    requests_list = [{
        'user_id': r['user_id'],
        'username': r['username'],
        'fullname': r['fullname'],
        'speaks': r['speaks_languages'].split(','),
        'learning': r['learning_languages'].split(',')
    } for r in requests]
    
    return jsonify({'success': True, 'requests': requests_list})

@app.route('/connect-exchange', methods=['POST'])
def connect_exchange():
    """Connect with a user for language exchange"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    data = request.get_json()
    partner_id = data.get('partner_id')
    
    if not partner_id:
        return jsonify({'success': False, 'message': 'Partner ID required'}), 400
    
    user_id = session['user_id']
    
    # Check if connection already exists
    conn = get_db_connection()
    cursor = conn.cursor()
    
    existing = cursor.execute('''
        SELECT * FROM exchange_connections 
        WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    ''', (user_id, partner_id, partner_id, user_id)).fetchone()
    
    if not existing:
        # Create new connection
        cursor.execute('''
            INSERT INTO exchange_connections (user1_id, user2_id)
            VALUES (?, ?)
        ''', (user_id, partner_id))
        conn.commit()
    
    conn.close()
    
    return jsonify({'success': True, 'message': 'Connected successfully'})

@app.route('/get-exchange-messages/<int:partner_id>', methods=['GET'])
def get_exchange_messages(partner_id):
    """Get exchange messages with a partner"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    user_id = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    
    messages = cursor.execute('''
        SELECT m.id, m.sender_id, m.receiver_id, m.message_text, m.timestamp,
               u.username as sender_username
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE (m.sender_id = ? AND m.receiver_id = ?) 
           OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.timestamp ASC
    ''', (user_id, partner_id, partner_id, user_id)).fetchall()
    
    conn.close()
    
    messages_list = [{
        'id': m['id'],
        'sender_id': m['sender_id'],
        'message_text': m['message_text'],
        'timestamp': m['timestamp'],
        'sender_username': m['sender_username'],
        'is_mine': m['sender_id'] == user_id
    } for m in messages]
    
    return jsonify({'success': True, 'messages': messages_list})

@app.route('/send-exchange-message', methods=['POST'])
def send_exchange_message():
    """Send a message in exchange chat"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    data = request.get_json()
    partner_id = data.get('partner_id')
    message_text = data.get('message_text')
    
    if not partner_id or not message_text:
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    
    sender_id = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO messages (sender_id, receiver_id, message_text)
        VALUES (?, ?, ?)
    ''', (sender_id, partner_id, message_text))
    
    conn.commit()
    message_id = cursor.lastrowid
    timestamp = cursor.execute('SELECT timestamp FROM messages WHERE id = ?', (message_id,)).fetchone()['timestamp']
    conn.close()
    
    return jsonify({'success': True, 'message_id': message_id, 'timestamp': timestamp})

if __name__ == '__main__':
    app.run(debug=True, port=5000)