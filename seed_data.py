import sqlite3
import random
from datetime import datetime, timedelta
import os
from database import init_db

DB_PATH = 'hotel_security.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def seed():
    # Drop tables to recreate with new schema
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS visitors")
    cursor.execute("DROP TABLE IF EXISTS logs")
    cursor.execute("DROP TABLE IF EXISTS criminal_database")
    cursor.execute("DROP TABLE IF EXISTS stolen_id_database")
    conn.commit()
    conn.close()
    
    # Reinitialize the database with new schema
    init_db()

    conn = get_db_connection()
    cursor = conn.cursor()
        
    print("Seeding database with robust dataset...")
    
    # Robust Dataset of Criminals with Photos
    # Using randomuser.me avatars for dummy lively photos
    criminals = [
        ('Marcus Vance', 'https://randomuser.me/api/portraits/men/1.jpg', 'Wanted for identity theft operations in 3 states.'),
        ('Elena Rostova', 'https://randomuser.me/api/portraits/women/2.jpg', 'Known associate of an international fraud syndicate.'),
        ('David Trenton', 'https://randomuser.me/api/portraits/men/3.jpg', 'Multiple warrants for hotel room burglaries.'),
        ('Sophie Lang', 'https://randomuser.me/api/portraits/women/4.jpg', 'Wanted for credit card fraud and evasion.'),
        ('John Doe', 'https://randomuser.me/api/portraits/men/5.jpg', 'Suspect in recent cyber-security breaches.'),
        ('Isabella Silva', 'https://randomuser.me/api/portraits/women/6.jpg', 'Organized retail theft rings across the coast.'),
        ('James Norton', 'https://randomuser.me/api/portraits/men/7.jpg', 'Extortion and racketeering charges.'),
        ('Mia Wong', 'https://randomuser.me/api/portraits/women/8.jpg', 'Embezzlement from corporate accounts.'),
        ('Lucas Miller', 'https://randomuser.me/api/portraits/men/9.jpg', 'Vehicular theft and chop-shop operations.'),
        ('Chloe Davis', 'https://randomuser.me/api/portraits/women/10.jpg', 'Forgery and counterfeiting documents.'),
        ('Oliver Brown', 'https://randomuser.me/api/portraits/men/11.jpg', 'Armed robbery at multiple convenience stores.'),
        ('Amelia Taylor', 'https://randomuser.me/api/portraits/women/12.jpg', 'Insurance fraud schemes involving staged accidents.'),
        ('Elijah Anderson', 'https://randomuser.me/api/portraits/men/13.jpg', 'Drug trafficking across state lines.'),
        ('Harper Clark', 'https://randomuser.me/api/portraits/women/14.jpg', 'Confidence tricks and online romance scams.'),
        ('William Harris', 'https://randomuser.me/api/portraits/men/15.jpg', 'Vandalism and destruction of governmental property.')
    ]
    for c in criminals:
        cursor.execute('INSERT INTO criminal_database (name, photo_url, crime_details) VALUES (?, ?, ?)', c)
        
    # Stolen IDs
    stolen_ids = [
        ('Richard Black', 'Aadhaar', '123412341234'),
        ('Martha Wayne', 'PAN', 'ABCDE1234F'),
        ('Thomas Shelby', 'Passport', 'A1234567'),
        ('Arthur Morgan', 'Aadhaar', '987654321098'),
        ('Lenny Summers', 'Passport', 'Z9876543'),
        ('Julian Baker', 'Passport', 'B9876512'),
        ('Samira Khan', 'Aadhaar', '111122223333'),
        ('Leo Vance', 'PAN', 'ZXCVM9876Q')
    ]
    for s in stolen_ids:
        cursor.execute('INSERT INTO stolen_id_database (name, id_type, id_number) VALUES (?, ?, ?)', s)
        
    # Visitors
    first_names = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth']
    last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
    
    for i in range(80):
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        id_type = random.choice(['Aadhaar', 'PAN', 'Passport'])
        id_number = f"ID{random.randint(10000, 99999)}"
        room_number = f"{random.randint(1, 10)}{random.randint(100, 199):03d}"[-3:]
        
        status = 'Safe'
        if random.random() < 0.1:
            status = 'Threat'
            
        time_offset = timedelta(days=random.randint(0, 7), hours=random.randint(0, 23), minutes=random.randint(0, 59))
        check_in_time = datetime.now() - time_offset
        
        cursor.execute('''
            INSERT INTO visitors (name, id_type, id_number, room_number, status, check_in_time)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (name, id_type, id_number, room_number, status, check_in_time.strftime('%Y-%m-%d %H:%M:%S')))
        
        # Log check-in
        risk_level = 'High' if status == 'Threat' else 'Low'
        cursor.execute('''
            INSERT INTO logs (action_type, details, risk_level, timestamp)
            VALUES (?, ?, ?, ?)
        ''', ('Check-in', f"Guest: {name}, Room: {room_number}, Status: {status}", risk_level, check_in_time.strftime('%Y-%m-%d %H:%M:%S')))

    for i in range(35):
        time_offset = timedelta(days=random.randint(0, 7), hours=random.randint(0, 23))
        scan_time = datetime.now() - time_offset
        status = random.choice(['Safe', 'Safe', 'Safe', 'Threat'])
        risk_level = 'High' if status == 'Threat' else 'Low'
        
        details = f"Status: {status} | Match routine executed from Terminal Alpha"
        if risk_level == 'High':
            details = f"Threat Alert: Profile match detected. Security dispatched to Sector 2."
            
        cursor.execute('''
            INSERT INTO logs (action_type, details, risk_level, timestamp)
            VALUES (?, ?, ?, ?)
        ''', ('Face Scan', details, risk_level, scan_time.strftime('%Y-%m-%d %H:%M:%S')))
        
    for i in range(15):
        time_offset = timedelta(days=random.randint(0, 7), hours=random.randint(0, 23))
        scan_time = datetime.now() - time_offset
        
        details = f"Stolen {random.choice(['Aadhaar', 'Passport'])} blocked. Authorities Notified automatically."
        cursor.execute('''
            INSERT INTO logs (action_type, details, risk_level, timestamp)
            VALUES (?, ?, ?, ?)
        ''', ('Stolen ID Attempt', details, 'Critical', scan_time.strftime('%Y-%m-%d %H:%M:%S')))
        
    conn.commit()
    
    # --- EXPORT DATASET TO JSON SO IT IS VISIBLE ---
    import json
    os.makedirs('data', exist_ok=True)
    
    # Fetch all data as dicts to save as JSON
    def fetch_all(table):
        return [dict(row) for row in cursor.execute(f'SELECT * FROM {table}').fetchall()]
    
    complete_dataset = {
        "criminals": fetch_all('criminal_database'),
        "stolen_ids": fetch_all('stolen_id_database'),
        "visitors": fetch_all('visitors')
    }
    
    with open('data/dataset.json', 'w') as f:
        json.dump(complete_dataset, f, indent=4)
        
    conn.close()
    print("Database seeding complete! Raw dataset also saved to 'data/dataset.json'.")

if __name__ == '__main__':
    seed()
