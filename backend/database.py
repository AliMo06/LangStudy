import sqlite3
import hashlib  #encryp passwords
from datetime import datetime

def get_db_connection():  
    conn = sqlite3.connect('users.db') #opens a database
    conn.row_factory = sqlite3.Row  #lets us access data
    return conn

def init_db():
    conn = get_db_connection()  #get a database connection
    cursor = conn.cursor()  #creates a cursor in the database
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullname TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()  #saves changes
    conn.close()  #closes the database connection
    print("Database initialized!")

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()  #encrypts passwords

if __name__ == "__main__":
    init_db()