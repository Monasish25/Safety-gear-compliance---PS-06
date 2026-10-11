export function getApiBase() {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('CUSTOM_API_BASE') : null;
  if (custom && custom.trim()) {
    let url = custom.trim().replace(/\/$/, '');
    if (!url.endsWith('/api/v1') && !url.includes('/api/v1')) {
      url = `${url}/api/v1`;
    }
    return url;
  }
  let base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
  if (base.startsWith('http') && !base.endsWith('/api/v1') && !base.includes('/api/v1')) {
    base = `${base}/api/v1`;
  }
  return base;
}

export function setApiBase(url) {
  if (!url || !url.trim()) {
    localStorage.removeItem('CUSTOM_API_BASE');
    return getApiBase();
  }
  let clean = url.trim().replace(/\/$/, '');
  if (!clean.endsWith('/api/v1') && !clean.includes('/api/v1')) {
    clean = `${clean}/api/v1`;
  }
  localStorage.setItem('CUSTOM_API_BASE', clean);
  return clean;
}

export function getWsBase(path = '/ws/alerts') {
  const apiBase = getApiBase();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const tokenParam = token ? `?token=${token}` : '';
  
  if (apiBase.startsWith('http')) {
    const wsBase = apiBase.replace(/^http/, 'ws');
    return `${wsBase}${path}${tokenParam}`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${apiBase}${path}${tokenParam}`;
}
