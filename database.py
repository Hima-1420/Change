import sqlite3
import os
from datetime import datetime

DB_PATH = 'hotel_security.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(app=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Visitors Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS visitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            id_type TEXT,
            id_number TEXT,
            room_number TEXT,
            check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'Safe'
        )
    ''')
    
    # Threats / Criminal Database
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS criminal_database (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            face_encoding TEXT,
            photo_url TEXT,
            crime_details TEXT
        )
    ''')
    
    # Stolen/Lost ID Database (Updated with name)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stolen_id_database (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            id_type TEXT NOT NULL,
            id_number TEXT NOT NULL UNIQUE,
            reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Interaction Logs (Updated with Risk Level)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action_type TEXT NOT NULL,
            details TEXT,
            risk_level TEXT DEFAULT 'Low',
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def log_interaction(action_type, details, risk_level='Low'):
    conn = get_db_connection()
    conn.execute('INSERT INTO logs (action_type, details, risk_level) VALUES (?, ?, ?)', (action_type, details, risk_level))
    conn.commit()
    conn.close()
