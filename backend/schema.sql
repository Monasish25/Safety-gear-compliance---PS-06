-- ==============================================================================
-- SMART ATTENDANCE - PostgreSQL Database Schema
-- Industrial Gate Access & Worker PPE Compliance System
-- ==============================================================================

-- 1. Workers Directory Table
CREATE TABLE IF NOT EXISTS workers (
    worker_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    shift VARCHAR(50) NOT NULL,
    position VARCHAR(100) NOT NULL,
    badge_type VARCHAR(20) DEFAULT 'QR',
    joining_date DATE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    photo_url TEXT,
    attendance_rate NUMERIC(5,2) DEFAULT 100.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Daily Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(50) NOT NULL REFERENCES workers(worker_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in VARCHAR(10),
    check_out VARCHAR(10),
    working_hours VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'not_scanned', -- present, late, absent, access_denied, not_scanned
    helmet VARCHAR(20) DEFAULT 'NOT_VISIBLE',           -- WORN, MISSING, NOT_VISIBLE
    vest VARCHAR(20) DEFAULT 'NOT_VISIBLE',
    shoes VARCHAR(20) DEFAULT 'NOT_VISIBLE',
    gloves VARCHAR(20) DEFAULT 'NOT_VISIBLE',
    goggles VARCHAR(20) DEFAULT 'NOT_VISIBLE',
    manual_override BOOLEAN DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_worker_date UNIQUE (worker_id, date)
);

-- Index for fast lookup by date and worker
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON attendance(worker_id, date);

-- 3. Live Turnstile Gate Scan Events (Audit Trail)
CREATE TABLE IF NOT EXISTS scan_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time VARCHAR(20) NOT NULL,
    gate VARCHAR(100) NOT NULL,
    worker_id VARCHAR(50),
    worker_name VARCHAR(255),
    helmet VARCHAR(20) DEFAULT 'NOT_VISIBLE',
    vest VARCHAR(20) DEFAULT 'NOT_VISIBLE',
    shoes VARCHAR(20) DEFAULT 'NOT_VISIBLE',
    gloves VARCHAR(20) DEFAULT 'NOT_VISIBLE',
    goggles VARCHAR(20) DEFAULT 'NOT_VISIBLE',
    result VARCHAR(50) NOT NULL, -- checked_in, late, access_denied, id_not_visible
    reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_timestamp ON scan_logs(timestamp DESC);

-- 4. Factory Turnstile & PPE Shift Settings
CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY DEFAULT 1,
    settings_json JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
