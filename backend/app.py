from flask import Flask, request, jsonify, session
from flask_cors import CORS
from database import get_db_connection, hash_password, init_db
import sqlite3

app = Flask(__name__)  #creates a web server app
app.secret_key = 'your-secret-key-change-this-later'  #password that flask uses to encrypt
CORS(app, supports_credentials=True)  #allows HTML pages to send requests

init_db()  #runs the database

@app.route('/signup', methods=['POST']) #run this function if data is sent to /signup
def signup():

    #gets the data from HTML form
    data = request.get_json()
    fullname = data.get('fullname')
    email = data.get('email')
    username = data.get('username')
    password = data.get('password')
    
    if not all([fullname, email, username, password]):  #checks if any field is empty
        return jsonify({'success': False, 'message': 'All fields are required'}), 400
    
    password_hash = hash_password(password)  #encrypts password
    
    try:
        conn = get_db_connection()  #connect to database
        cursor = conn.cursor()
        cursor.execute(  #adds a new row to the users table with placeholders
            'INSERT INTO users (fullname, email, username, password_hash) VALUES (?, ?, ?, ?)',
            (fullname, email, username, password_hash)
        )
        conn.commit()  #saves changes
        conn.close()  #closes the database connection
        return jsonify({'success': True, 'message': 'Account created successfully'})  #success message
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Username or email already exists'}), 400  #error handling  + message

@app.route('/login', methods=['POST']) #when someone tries to log in
def login():
    #get username and password and check if they're filled in
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required'}), 400
    
    password_hash = hash_password(password)  #encrypts password
    
    conn = get_db_connection()
    cursor = conn.cursor()
    user = cursor.execute(  #find a user with this username and password
        'SELECT * FROM users WHERE username = ? AND password_hash = ?',
        (username, password_hash)
    ).fetchone()  #gets one result
    conn.close()
    
    if user:  #if user exists, save their ID and username in the session
        session['user_id'] = user['id']
        session['username'] = user['username']
        return jsonify({'success': True, 'message': 'Login successful', 'username': user['username']})
    else:
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401  #error message

@app.route('/logout', methods=['POST'])  #when someone logs out
def logout():  #clears the session
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})


#forgot password functionality

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    
    #get email, username, and password
    email = data.get('email')
    username = data.get('username')
    new_password = data.get('new_password')
    
    #checks if fields are filled in
    if not all([email, username, new_password]):
        return jsonify({'success': False, 'message': 'All fields are required'}), 400
    
    if len(new_password) < 8:
        return jsonify({'success': False, 'message': 'Password must be at least 8 characters'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    user = cursor.execute(  #looks for a user with this email and username
        'SELECT * FROM users WHERE email = ? AND username = ?',
        (email, username)
    ).fetchone()
    
    #if no match send an error
    if not user:
        conn.close()
        return jsonify({'success': False, 'message': 'No account found with that email and username'}), 404
    
    new_password_hash = hash_password(new_password)  #hash the new password
    cursor.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        (new_password_hash, user['id'])
    )
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Password reset successfully'})

#run the server
if __name__ == '__main__':
    app.run(debug=True, port=5000)