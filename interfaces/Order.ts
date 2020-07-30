import { OrderItem } from "./OrderItem";

export interface Order {
    orderNumber: number;
    items: OrderItem[];
}