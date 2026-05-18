import axios, { AxiosInstance } from "axios";
import { clearSession, getToken } from "./auth";

const USER_SERVICE = "http://localhost:8001";
const PRODUCT_SERVICE = "http://localhost:8002";
const ORDER_SERVICE = "http://localhost:8003";

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
      if (err.response?.status === 401) {
        clearSession();
      }
      return Promise.reject(err);
    }
  );
  return client;
}

export const userApi = attachAuth(axios.create({ baseURL: USER_SERVICE }));
export const productApi = attachAuth(axios.create({ baseURL: PRODUCT_SERVICE }));
export const orderApi = attachAuth(axios.create({ baseURL: ORDER_SERVICE }));

export type Product = {
  id: number;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  stock_quantity: number;
  image_url?: string | null;
  average_rating?: number | null;
  review_count?: number;
};

export type ProductList = { items: Product[]; total: number };

export type CartItem = {
  id: number;
  product_id: number;
  quantity: number;
  product_name?: string | null;
  product_price?: number | null;
  line_total?: number | null;
};

export type CartView = { items: CartItem[]; total_price: number };

export type OrderItem = { id: number; product_id: number; quantity: number; price: number };
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
