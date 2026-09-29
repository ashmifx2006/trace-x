import axios from 'axios'
export const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(c => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = 'Bearer ' + t; return c })
api.interceptors.response.use(r => r, e => { if (e.response?.status === 401 && !e.config.url.includes('/auth/')) { localStorage.removeItem('token'); localStorage.removeItem('analyst'); window.location.reload() } return Promise.reject(e) })
export const inr = n => '₹' + Math.round(n).toLocaleString('en-IN')
export const reportUrl = id => `/api/networks/${id}/report/?token=${localStorage.getItem('token')}`
