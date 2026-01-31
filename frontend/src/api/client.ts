// frontend/src/api/client.ts
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export default axios.create({
  baseURL: API_BASE,
});
