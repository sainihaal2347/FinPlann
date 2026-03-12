// This MUST be a clean string. Do not use brackets or parentheses.
const API_BASE = "http://127.0.0.1:8000/api";

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
  }).then(handleResponse)
};