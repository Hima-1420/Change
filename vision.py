import sqlite3
import random
import time
from database import get_db_connection

def verify_face(image_base64):
    """
    Mock function for facial recognition.
    In a real system, this would decode the base64 image,
    use OpenCV/dlib to extract facial encodings, and
    compare them against the criminal database.
    """
    conn = get_db_connection()
    criminals = conn.execute('SELECT * FROM criminal_database').fetchall()
    conn.close()

    # Simulate processing time for neural net
    time.sleep(1.5)

    # Simulated logic: if DB has criminals, occasionally flag a threat for demonstration
    if criminals:
        if random.random() < 0.5:
            criminal = random.choice(criminals)
            return {"status": "Threat", "details": f"Match found: {criminal['name']} - {criminal['crime_details']}"}
            
    return {"status": "Safe", "details": "No match found in criminal database."}

def verify_id(name, id_type, id_number):
    """
    Checks the stolen ID database and criminal database for matches.
    """
    conn = get_db_connection()
    
    # Check stolen ID securely (case-insensitive and ignoring outer whitespace)
    safe_type = str(id_type).strip() if id_type else ""
    safe_number = str(id_number).strip() if id_number else ""
    
    stolen_match = conn.execute(
        'SELECT * FROM stolen_id_database WHERE LOWER(id_type) = LOWER(?) AND LOWER(id_number) = LOWER(?)',
        (safe_type, safe_number)
    ).fetchone()
    
    # Check criminal database by name
    criminal_match = None
    safe_name = str(name).strip() if name else ""
    if safe_name:
        criminal_match = conn.execute(
            'SELECT * FROM criminal_database WHERE LOWER(name) = LOWER(?)', 
            (safe_name,)
        ).fetchone()
        
    conn.close()
    
    if stolen_match:
        return {"status": "Threat", "details": f"Stolen {id_type} detected. Reported on {stolen_match['reported_date']}"}
        
    if criminal_match:
        return {"status": "Threat", "details": f"Criminal flagged by name: {criminal_match['name']} - {criminal_match['crime_details']}"}
    
    return {"status": "Safe", "details": "ID verification passed."}
