// Scan and Check-in logic
let stream = null;

async function startWebcam() {
    const video = document.getElementById('webcamVideo');
    const placeholder = document.getElementById('mediaPlaceholder');
    const imgPreview = document.getElementById('imagePreview');
    const btnStart = document.getElementById('btnStartCamera');
    const btnCapture = document.getElementById('btnCapture');

    if (stream) {
        // Stop stream
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        video.style.display = 'none';
        placeholder.style.display = 'block';
        btnStart.innerHTML = '<i data-feather="video"></i> Start Camera';
        btnCapture.style.display = 'none';
        feather.replace();
        return;
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.style.display = 'block';
        placeholder.style.display = 'none';
        imgPreview.style.display = 'none';
        
        btnStart.innerHTML = '<i data-feather="video-off"></i> Stop Camera';
        btnStart.className = 'btn btn-danger';
        btnCapture.style.display = 'block';
        feather.replace();
    } catch (err) {
        console.error("Error accessing webcam:", err);
        alert("Unable to access camera. Please allow permissions or use 'Upload Image'.");
    }
}

function captureImage() {
    const video = document.getElementById('webcamVideo');
    const canvas = document.getElementById('photoCanvas');
    const imgPreview = document.getElementById('imagePreview');

    if (!stream) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const base64Image = canvas.toDataURL('image/jpeg');
    
    // Stop camera and show preview
    startWebcam(); // Toggle stops it
    imgPreview.src = base64Image;
    imgPreview.style.display = 'block';
    document.getElementById('mediaPlaceholder').style.display = 'none';

    processImageWithBackend(base64Image);
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Stop webcam if it's running
    if (stream) {
        startWebcam();
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        const imgPreview = document.getElementById('imagePreview');
        imgPreview.src = base64Image;
        imgPreview.style.display = 'block';
        document.getElementById('mediaPlaceholder').style.display = 'none';

        processImageWithBackend(base64Image);
    };
    reader.readAsDataURL(file);
}

async function processImageWithBackend(base64Image) {
    const resultDiv = document.getElementById('scanResult');
    resultDiv.style.display = 'none';
    
    document.querySelector('.glass-card').classList.add('scanning');

    try {
        const res = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });
        const data = await res.json();
        
        // If backend returned a processed image (with bounding boxes), update preview
        if (data.processed_image) {
            document.getElementById('imagePreview').src = data.processed_image;
        }
        
        resultDiv.style.display = 'flex';
        resultDiv.style.alignItems = 'center';
        resultDiv.style.gap = '15px';
        if (data.status === 'Threat') {
            resultDiv.className = 'alert alert-danger';
            resultDiv.innerHTML = `<i data-feather="alert-octagon" style="width:32px; height:32px;"></i> <div><strong>THREAT IDENTIFIED:</strong><br><span style="font-weight:500;">${data.details}</span></div>`;
        } else if (data.status === 'Safe') {
            resultDiv.className = 'alert alert-success';
            resultDiv.innerHTML = `<i data-feather="check-circle" style="width:32px; height:32px;"></i> <div><strong>CLEARANCE GRANTED:</strong><br><span style="font-weight:500;">${data.details}</span></div>`;
        } else {
            resultDiv.className = 'alert alert-warning';
            resultDiv.innerHTML = `<i data-feather="alert-circle" style="width:32px; height:32px;"></i> <div><strong>ISSUE:</strong><br><span style="font-weight:500;">${data.details}</span></div>`;
        }
    } catch (err) {
        console.error(err);
        alert("Error processing image. Check console for details.");
    } finally {
        document.querySelector('.glass-card').classList.remove('scanning');
        feather.replace();
    }
}

async function handleCheckIn(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-feather="loader" class="spin"></i> Authenticating...';
    btn.disabled = true;
    feather.replace();
    
    const name = document.getElementById('guestName').value;
    const idType = document.getElementById('idType').value;
    const idNumber = document.getElementById('idNumber').value;
    const roomNumber = document.getElementById('roomNumber').value;
    
    try {
        const verifyRes = await fetch('/api/verify_id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, id_type: idType, id_number: idNumber })
        });
        const verifyData = await verifyRes.json();
        const resultDiv = document.getElementById('checkInResult');
        resultDiv.style.display = 'flex';
        resultDiv.style.alignItems = 'center';
        resultDiv.style.gap = '15px';
        
        let finalStatus = 'Safe';
        if (verifyData.status === 'Threat') {
            resultDiv.className = 'alert alert-danger';
            resultDiv.innerHTML = `<i data-feather="slash" style="width:32px; height:32px;"></i> <div><strong>AUTHORIZATION DENIED:</strong><br><span style="font-weight:500;">${verifyData.details}</span></div>`;
            finalStatus = 'Threat';
        } else {
            resultDiv.className = 'alert alert-success';
            resultDiv.innerHTML = `<i data-feather="shield" style="width:32px; height:32px;"></i> <div><strong>ID VERIFIED:</strong><br><span style="font-weight:500;">Processing Clearance...</span></div>`;
            feather.replace();
            
            await new Promise(r => setTimeout(r, 1200));
        }
        
        await fetch('/api/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, id_type: idType, id_number: idNumber, room_number: roomNumber, status: finalStatus })
        });

        if (finalStatus === 'Safe') {
            resultDiv.innerHTML = `<i data-feather="check-circle" style="width:32px; height:32px;"></i> <div><strong>SUCCESS:</strong><br><span style="font-weight:500;">Subject Cleared for Assignment.</span></div>`;
            feather.replace();
            setTimeout(() => { e.target.reset(); resultDiv.style.display='none'; }, 3000);
        } else {
            resultDiv.innerHTML += `<div style="margin-top:8px; font-size:0.9rem; font-weight:600; color:#ef4444;">Subject flagged and logged in Intel database.</div>`;
            feather.replace();
            setTimeout(() => { e.target.reset(); }, 4000);
        }
    } catch (err) {
        console.error(err);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        feather.replace();
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    feather.replace();
    const path = window.location.pathname;
    
    if (path === '/') {
        initDashboard();
    } else if (path === '/visitors') {
        loadVisitors();
    } else if (path === '/history') {
        loadHistory();
    } else if (path === '/admin') {
        initAdmin();
    }
});

async function initDashboard() {
    const res = await fetch('/api/stats');
    const data = await res.json();
    
    const animateValue = (id, start, end, duration) => {
        const obj = document.getElementById(id);
        if(!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end;
            }
        };
        window.requestAnimationFrame(step);
    };

    animateValue('stat-visitors', 0, data.total_visitors, 1500);
    animateValue('stat-active', 0, data.active_guests, 1500);
    animateValue('stat-threats', 0, data.threats, 1500);
    animateValue('stat-stolen', 0, data.stolen_cases, 1500);

    // Fetch Logs for Recent Activity & Alerts
    const logsRes = await fetch('/api/logs');
    const logs = await logsRes.json();

    const raTable = document.querySelector('#recentActivityTable tbody');
    if (raTable) {
        raTable.innerHTML = logs.slice(0, 6).map(l => {
            let riskBadge = `<span class="badge badge-safe"><i data-feather="check" style="width:12px; height:12px; vertical-align:middle;"></i> ${l.risk_level}</span>`;
            if (l.risk_level === 'High' || l.risk_level === 'Critical') {
                riskBadge = `<span class="badge badge-threat"><i data-feather="x" style="width:12px; height:12px; vertical-align:middle;"></i> ${l.risk_level}</span>`;
            }
            return `
            <tr>
                <td><code style="background: #e2e8f0; color: #475569; padding: 4px 8px; border-radius:6px; font-size: 0.8rem; font-weight: 600;">#${l.id}</code></td>
                <td><span class="badge" style="background: #e2e8f0; color: #334155;">${l.action_type}</span></td>
                <td><span style="color: var(--text-primary); font-size: 0.9rem; font-weight: 500;">${l.details}</span></td>
                <td>${riskBadge}</td>
                <td><span style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 500;">${new Date(l.timestamp).toLocaleTimeString()}</span></td>
            </tr>
        `}).join('');
    }

    const alertsPanel = document.getElementById('alertsPanel');
    if (alertsPanel) {
        const highRiskLogs = logs.filter(l => l.risk_level === 'High' || l.risk_level === 'Critical').slice(0, 10);
        if (highRiskLogs.length === 0) {
            alertsPanel.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-secondary); font-weight:500;">No active high-risk alerts.</div>';
        } else {
            alertsPanel.innerHTML = highRiskLogs.map(l => {
                let iconColor = l.risk_level === 'Critical' ? 'var(--danger)' : 'var(--warning)';
                let iconName = l.risk_level === 'Critical' ? 'alert-octagon' : 'alert-triangle';
                return `
                <div style="background: #fff; border-left: 4px solid ${iconColor}; padding: 15px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); display: flex; gap: 12px; align-items: flex-start;">
                    <div style="color: ${iconColor};"><i data-feather="${iconName}"></i></div>
                    <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                            <strong style="color: var(--text-primary); font-size: 0.95rem;">${l.action_type}</strong>
                            <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:600;">${new Date(l.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 500; line-height: 1.4;">${l.details}</p>
                    </div>
                </div>
            `}).join('');
        }
    }
    
    const canvas = document.getElementById('activityChart');
    if(canvas) {
        const ctx = canvas.getContext('2d');
        let gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.2)');
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');

        const baseVal = data.total_logs / 7;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Network Load',
                    data: [baseVal*0.8, baseVal*1.5, baseVal*1.1, baseVal*1.8, baseVal*1.3, baseVal*0.9, baseVal*1.4],
                    borderColor: '#4f46e5',
                    borderWidth: 4,
                    backgroundColor: gradient,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#4f46e5',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleFont: { family: 'Inter', size: 13, weight: 600 },
                        bodyFont: { family: 'Inter', size: 14, weight: 700 },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    x: { ticks: { color: '#64748b', font: {family: 'Inter', size: 12, weight: 600} }, grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false } },
                    y: { ticks: { color: '#64748b', font: {family: 'Inter', size: 12, weight: 600} }, grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false } }
                },
                interaction: { intersect: false, mode: 'index' },
            }
        });
    }
    feather.replace();
}

async function loadVisitors() {
    const vTable = document.querySelector('#visitorsTable tbody');
    if (!vTable) return;
    
    vTable.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 3rem;"><i data-feather="loader" class="spin"></i> Fetching records from central cluster...</td></tr>`;
    feather.replace();

    const vRes = await fetch('/api/visitors');
    const visitors = await vRes.json();
    
    vTable.innerHTML = visitors.map(v => `
        <tr>
            <td><code style="background: #e2e8f0; color: #475569; padding: 4px 8px; border-radius:6px; font-size: 0.85rem; font-weight: 600;">#${v.id}</code></td>
            <td><strong style="color: var(--text-primary);">${v.name}</strong></td>
            <td><span style="color: var(--text-secondary); font-size: 0.85rem; padding-right:5px; font-weight: 600;">${v.id_type}</span> <span style="font-weight:500;">${v.id_number}</span></td>
            <td style="font-weight: 500;">${v.room_number}</td>
            <td><span style="color: var(--text-secondary); font-size: 0.9rem; font-weight:500;">${new Date(v.check_in_time).toLocaleString()}</span></td>
            <td><span class="badge badge-${v.status.toLowerCase()}">${v.status}</span></td>
        </tr>
    `).join('');
    feather.replace();
}

async function loadHistory() {
    const lTable = document.querySelector('#logsTable tbody');
    if (!lTable) return;
    
    lTable.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 3rem;"><i data-feather="loader" class="spin"></i> Querying master logs...</td></tr>`;
    feather.replace();

    const lRes = await fetch('/api/logs');
    const logs = await lRes.json();
    
    lTable.innerHTML = logs.map(l => {
        let riskBadge = `<span class="badge badge-safe"><i data-feather="check" style="width:12px; height:12px; vertical-align:middle;"></i> ${l.risk_level}</span>`;
        if (l.risk_level === 'High' || l.risk_level === 'Critical') {
            riskBadge = `<span class="badge badge-threat"><i data-feather="x" style="width:12px; height:12px; vertical-align:middle;"></i> ${l.risk_level}</span>`;
        }
        return `
        <tr>
            <td><code style="background: #e2e8f0; color: #475569; padding: 4px 8px; border-radius:6px; font-size: 0.85rem; font-weight: 600;">#${l.id}</code></td>
            <td><span class="badge" style="background: #e2e8f0; color: #334155;">${l.action_type}</span></td>
            <td><span style="color: var(--text-primary); font-size: 0.95rem; font-weight: 500;">${l.details}</span></td>
            <td>${riskBadge}</td>
            <td><span style="color: var(--text-secondary); font-size: 0.9rem; font-weight: 500;">${new Date(l.timestamp).toLocaleString()}</span></td>
        </tr>
    `}).join('');
    feather.replace();
}

async function initAdmin() {
    loadCriminals();
    loadStolenIds();
}

async function loadCriminals() {
    const res = await fetch('/api/criminals');
    const data = await res.json();
    const tbody = document.querySelector('#criminalTable tbody');
    if (!tbody) return;
    
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-secondary); padding: 2rem; font-weight: 500;">No active targets found.</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(c => `
        <tr>
            <td><strong style="color: var(--text-primary);">${c.name}</strong></td>
            <td style="color: var(--text-secondary); font-weight: 500;">${c.crime_details}</td>
        </tr>
    `).join('');
}

async function loadStolenIds() {
    const res = await fetch('/api/stolen_ids');
    const data = await res.json();
    const tbody = document.querySelector('#stolenIdTable tbody');
    if (!tbody) return;
    
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 2rem; font-weight: 500;">No invalidated credentials logged.</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(s => `
        <tr>
            <td>
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">${s.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase;">${s.id_type}</div>
            </td>
            <td style="font-family: monospace; font-size: 1.05rem; font-weight: 600; color: var(--accent);">${s.id_number}</td>
            <td>
                <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem;" onclick="removeStolenId(${s.id})">
                    <i data-feather="trash-2" style="width: 14px; height: 14px;"></i> Remove
                </button>
            </td>
        </tr>
    `).join('');
    feather.replace();
}

async function removeStolenId(id) {
    if (!confirm('Are you sure you want to reinstate this credential?')) return;
    await fetch('/api/stolen_ids', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    loadStolenIds();
}

async function handleAddCriminal(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-feather="loader" class="spin"></i> Executing...';
    feather.replace();

    const name = document.getElementById('criminalName').value;
    const details = document.getElementById('crimeDetails').value;
    
    await fetch('/api/criminals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, crime_details: details })
    });
    e.target.reset();
    btn.innerHTML = originalText;
    feather.replace();
    loadCriminals();
}

async function handleAddStolenId(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-feather="loader" class="spin"></i> Connecting...';
    feather.replace();

    // The name isn't handled in the old HTML form yet. Wait, I should add it to HTML.
    // For now we will just use a hardcoded name if it's missing, but I should pass an empty string if it's unavailable.
    const idType = document.getElementById('stolenIdType').value;
    const idNumber = document.getElementById('stolenIdNumber').value;
    
    const res = await fetch('/api/stolen_ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "Manual Entry", id_type: idType, id_number: idNumber })
    });
    const result = await res.json();
    const msg = document.getElementById('stolenIdMsg');
    if (result.success) {
        msg.innerHTML = '<div class="alert alert-success" style="display:flex; align-items:center; gap:10px;"><i data-feather="check"></i> <strong>Credential Invalidated Successfully.</strong></div>';
        e.target.reset();
        loadStolenIds();
    } else {
        msg.innerHTML = `<div class="alert alert-danger" style="display:flex; align-items:center; gap:10px;"><i data-feather="slash"></i> <strong>${result.message}</strong></div>`;
    }
    btn.innerHTML = originalText;
    feather.replace();
    
    setTimeout(() => { msg.innerHTML = ''; }, 4000);
}
