const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const getHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
});

const handleResponse = async (response) => {
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: "Invalid server response format." };
  }
  if (!response.ok) throw new Error(data.detail || `Server error: ${response.status}`);
  return data;
};

export const api = {
  post: (path, body) => fetch(`${API_BASE}${path}`, { 
    method: 'POST', 
    headers: getHeaders(), 
    body: JSON.stringify(body) 
  }).then(handleResponse),
  
  get: (path) => fetch(`${API_BASE}${path}`, { 
    headers: getHeaders() 
  }).then(handleResponse),

  delete: (path) => fetch(`${API_BASE}${path}`, { 
    method: 'DELETE',
    headers: getHeaders() 
  }).then(handleResponse),

  put: (path, body) => fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body)
  }).then(handleResponse),

  upload: (path, formData) => {
    const headers = { ...getHeaders() };
    delete headers["Content-Type"]; // Browser will set this with boundary for FormData
    return fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData
    }).then(handleResponse);
  }
};