from flask import Flask, render_template, request, jsonify
from database import init_db, get_db_connection, log_interaction
import vision
import sqlite3
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'smart_hotel_secret'

# Initialize Database
with app.app_context():
    init_db(app)

# Routes for HTML pages
@app.route('/')
def dashboard():
    return render_template('dashboard.html')

@app.route('/scan')
def scan():
    return render_template('scan.html')

@app.route('/id_detection')
def id_detection():
    return render_template('id_detection.html')

@app.route('/visitors')
def visitors():
    return render_template('visitors.html')

@app.route('/history')
def history():
    return render_template('history.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

# API Endpoints
@app.route('/api/scan', methods=['POST'])
def api_scan():
    data = request.json
    image_data = data.get('image', '')
    
    # Process image for facial recognition
    result = vision.verify_face(image_data)
    
    # Log interaction
    risk = 'High' if result['status'] == 'Threat' else 'Low'
    log_interaction('Face Scan', f"Status: {result['status']} | {result['details']}", risk)
    
    return jsonify(result)

@app.route('/api/verify_id', methods=['POST'])
def api_verify_id():
    data = request.json
    name = data.get('name', '')
    id_type = data.get('id_type', '')
    id_number = data.get('id_number', '')
    
    result = vision.verify_id(name, id_type, id_number)
    
    risk = 'Critical' if result['status'] == 'Threat' else 'Low'
    
    # Advanced simulation text
    if risk == 'Critical':
        msg = f"Stolen {id_type} blocked. Authorities Notified automatically."
        log_interaction('Stolen ID Attempt', f"Type: {id_type}, Number: {id_number} | {msg}", risk)
        result['details'] = msg
    else:
        log_interaction('ID Verification', f"Type: {id_type}, Number: {id_number} | Status: {result['status']}", risk)
    
    return jsonify(result)

@app.route('/api/checkin', methods=['POST'])
def api_checkin():
    data = request.json
    name = data.get('name')
    id_type = data.get('id_type')
    id_number = data.get('id_number')
    room_number = data.get('room_number')
    status = data.get('status', 'Safe')
    
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO visitors (name, id_type, id_number, room_number, status)
        VALUES (?, ?, ?, ?, ?)
    ''', (name, id_type, id_number, room_number, status))
    conn.commit()
    conn.close()
    
    risk = 'High' if status == 'Threat' else 'Low'
    log_interaction('Check-in', f"Guest: {name}, Room: {room_number}, Status: {status}", risk)
    
    return jsonify({"success": True, "message": "Visitor checked in successfully."})

@app.route('/api/stats', methods=['GET'])
def api_stats():
    conn = get_db_connection()
    total_visitors = conn.execute('SELECT COUNT(*) FROM visitors').fetchone()[0]
    active_guests = conn.execute("SELECT COUNT(*) FROM visitors WHERE status = 'Safe'").fetchone()[0]
    threats = conn.execute("SELECT COUNT(*) FROM visitors WHERE status = 'Threat'").fetchone()[0]
    stolen_cases = conn.execute("SELECT COUNT(*) FROM stolen_id_database").fetchone()[0]
    total_logs = conn.execute('SELECT COUNT(*) FROM logs').fetchone()[0]
    conn.close()
    
    return jsonify({
        "total_visitors": total_visitors,
        "active_guests": active_guests,
        "threats": threats,
        "stolen_cases": stolen_cases,
        "total_logs": total_logs
    })

@app.route('/api/logs', methods=['GET'])
def api_logs():
    conn = get_db_connection()
    logs = conn.execute('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100').fetchall()
    conn.close()
    return jsonify([dict(row) for row in logs])

@app.route('/api/visitors', methods=['GET'])
def api_visitors():
    conn = get_db_connection()
    visitors = conn.execute('SELECT * FROM visitors ORDER BY check_in_time DESC').fetchall()
    conn.close()
    return jsonify([dict(row) for row in visitors])

@app.route('/api/criminals', methods=['GET', 'POST'])
def api_criminals():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        conn.execute('INSERT INTO criminal_database (name, crime_details, photo_url) VALUES (?, ?, ?)',
                     (data['name'], data['crime_details'], data.get('photo_url', '')))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    
    criminals = conn.execute('SELECT * FROM criminal_database').fetchall()
    conn.close()
    return jsonify([dict(row) for row in criminals])

@app.route('/api/data', methods=['GET'])
def api_data():
    """Returns the entire dataset across all tables for easy viewing."""
    conn = get_db_connection()
    criminals = conn.execute('SELECT * FROM criminal_database').fetchall()
    stolen_ids = conn.execute('SELECT * FROM stolen_id_database').fetchall()
    visitors = conn.execute('SELECT * FROM visitors').fetchall()
    logs = conn.execute('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100').fetchall()
    conn.close()
    
    return jsonify({
        "criminals": [dict(row) for row in criminals],
        "stolen_ids": [dict(row) for row in stolen_ids],
        "visitors": [dict(row) for row in visitors],
        "logs": [dict(row) for row in logs]
    })

@app.route('/api/stolen_ids', methods=['GET', 'POST', 'DELETE'])
def api_stolen_ids():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        try:
            conn.execute('INSERT INTO stolen_id_database (name, id_type, id_number) VALUES (?, ?, ?)',
                         (data.get('name', 'Unknown'), data['id_type'], data['id_number']))
            conn.commit()
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({"success": False, "message": "ID already exists in database"})
        conn.close()
        return jsonify({"success": True})
        
    elif request.method == 'DELETE':
        data = request.json
        conn.execute('DELETE FROM stolen_id_database WHERE id = ?', (data['id'],))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
        
    ids = conn.execute('SELECT * FROM stolen_id_database ORDER BY reported_date DESC').fetchall()
    conn.close()
    return jsonify([dict(row) for row in ids])

if __name__ == '__main__':
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static/css', exist_ok=True)
    os.makedirs('static/js', exist_ok=True)
    
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
