import React, { useState } from 'react';
import { X, Upload, Video, CheckCircle2, Play, AlertCircle } from 'lucide-react';

export default function VideoUploadModal({ 
  onClose, 
  onUploadSuccess, 
  onTriggerDemo 
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);
    setProgress(20);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/videos/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setProgress(60);

      // Start processing
      const procRes = await fetch(`/api/v1/videos/${data.video_id}/process?camera_id=CAM_01`, {
        method: 'POST'
      });
      if (!procRes.ok) throw new Error('Failed to initiate processing');
      setProgress(100);

      onUploadSuccess(data.video_id);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error uploading video');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px' }}
      >
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(10, 15, 26, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700 }}>
              Upload Factory CCTV Video
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Quick Demo Video Option */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(2, 132, 199, 0.12) 100%)',
            border: '1px solid rgba(0, 240, 255, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <strong style={{ fontSize: '0.85rem', color: '#fff' }}>Use Pre-Generated Demo Footage</strong>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Includes compliant workers, missing helmet in Welding Zone, and Fire hazard.
              </p>
            </div>
            <button
              onClick={() => {
                onTriggerDemo();
                onClose();
              }}
              className="btn btn-primary btn-sm"
            >
              <Play size={13} fill="currentColor" />
              <span>LOAD DEMO</span>
            </button>
          </div>

          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', position: 'relative' }}>
            <span>OR UPLOAD CUSTOM MP4 FILE</span>
          </div>

          {/* Drag & Drop Area */}
          <label style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '30px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: file ? 'rgba(0, 240, 255, 0.04)' : 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            transition: 'border 0.2s'
          }}>
            <Video size={36} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
              {file ? file.name : 'Click to select or drag and drop MP4 video'}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Supports .mp4, .avi, .mov (sampled at 5 FPS inference)
            </span>
            <input 
              type="file" 
              accept="video/*" 
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>

          {errorMsg && (
            <div style={{ color: '#ef4444', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {uploading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Uploading & Dispatching Inference...</span>
                <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{progress}%</span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-cyan)', transition: 'width 0.3s' }}></div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={onClose} className="btn btn-secondary">
              CANCEL
            </button>
            <button 
              onClick={handleUpload} 
              disabled={!file || uploading} 
              className="btn btn-primary"
            >
              <Upload size={15} />
              <span>{uploading ? 'PROCESSING...' : 'START INFERENCE'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
