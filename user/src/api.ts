import axios, { AxiosInstance } from "axios";
import { clearSession, getToken } from "./auth";

const BASE_URL    = import.meta.env.VITE_USE_PROXY === "true" ? "" : "https://fiveline.store";
const USER_URL    = BASE_URL;
const PRODUCT_URL = BASE_URL;
const ORDER_URL   = BASE_URL;

function attachAuth(client: AxiosInstance): AxiosInstance {
  client.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });
  client.interceptors.response.use(
    (r) => r,
    (err) => {
      if (err.response?.status === 401) clearSession();
      return Promise.reject(err);
    }
  );
  return client;
}

export const userApi    = attachAuth(axios.create({ baseURL: USER_URL }));
export const productApi = attachAuth(axios.create({ baseURL: PRODUCT_URL }));
export const orderApi   = attachAuth(axios.create({ baseURL: ORDER_URL }));

export type Product = {
  id: number;
  name: string;
  description?: string | null;
  category: string;
  brand?: string | null;
  price: number;
  original_price?: number | null;
  stock_quantity?: number;
  image_url?: string | null;
  average_rating?: number | null;
  review_count?: number;
};

export type ProductList = {
  items: Product[];
  total: number;
  page: number;
  size: number;
};

export type CartItem = {
  id: number;
  product_id: number;
  quantity: number;
  product_name?: string | null;
  product_price?: number | null;
  line_total?: number | null;
};

export type CartView = { items: CartItem[]; total_price: number };

export type OrderItem = { id: number; product_id: number; product_name: string | null; quantity: number; price: number };
export type Order = {
  id: number;
  user_id: number;
  total_price: number;
  status: string;
  error_code: string | null;
  response_time_ms: number | null;
  created_at: string;
  items: OrderItem[];
};

export type UserProfile = {
  id: number;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  created_at: string;
};

