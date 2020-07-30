export interface OrderItem {
    drug: string;
    order: number; // I know the spec says this should be an Order, but it seems too redundant
    quantity: number;
}