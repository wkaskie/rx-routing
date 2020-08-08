/* Pharmacy Module
   This handles the pharmacy specific
   data and tasks
*/

import { OrderItem } from './interfaces/OrderItem';
import { InventoryItem } from './interfaces/Inventory';

interface itemHash {
  [key: string]: InventoryItem;
}

export class Pharmacy {
  constructor(name = 'No name provided', inventory = []) {
    this._name = name;
    this.inventory = inventory;  // this will run the setter function
  }

  _name = '';
  _inventory: InventoryItem[] = [];
  _inventoryHash: itemHash = {}; // Create a hashMap for O(1) time complexity
  _shippingCost: number | undefined = undefined;

  set inventory(newInventory) { // update the local array, but also create a quick access HashMap
    this._inventory = newInventory;
    this._inventoryHash = newInventory.reduce((hash: itemHash, item: InventoryItem) => {
      hash[item.drug] = { drug: item.drug, cost: item.cost };
      return hash;
    }, {});
  }

  get inventory() {
    return this._inventory;
  }

  set name(newName) {
    this._name = newName;
  }

  get name() {
    return this._name;
  }
  
  get shipping() {
    return this._shippingCost;
  }

  set shipping(shipping: number | undefined) {
    this._shippingCost = shipping;
  }

  findDrug(drugName: string): InventoryItem {
    return this._inventoryHash[drugName];
    // without the hash, this has an O(n) time complexity eg:
    // return this._inventory.find(i => i.drug === drugName);
  }

  estimateItemCost(orderItem: string, qty: number) {
    return this.findDrug(orderItem).cost * qty;
  }

  estimateOrderCost(orderItems: OrderItem[]) {
    if (!this._shippingCost) {
      this._shippingCost = this.name.length;
    }
    return orderItems.reduce((sum: number, item) => 
        sum + this.findDrug(item.drug).cost * (item?.quantity || 0), 0) + this._shippingCost;
  }

  isDrugInStock(drugName: string) {
    return this._inventoryHash[drugName] || null;
    // without the hash, this is an O(n) time complexity task eg:
    // return this._inventory.some(i => i.drug === drugName);
  }
}

export type PharmacyType = InstanceType<typeof Pharmacy>;
