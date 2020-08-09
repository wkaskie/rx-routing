/* Pharmacy Module
   This handles the pharmacy specific
   data and tasks
*/

import { OrderItem } from './interfaces/OrderItem';
import { InventoryItem } from './interfaces/Inventory';
import { mapsHelper } from './mapsHelper';

interface itemHash {
  [key: string]: InventoryItem;
}

// NOTE: if Pharmacies set the cost, this should be pulled from the Pharmacy API,
// Otherwise, set this "globally"
const COST_PER_METER = 0.000002;
export class Pharmacy {
  constructor(
    pharmacy: string = 'No name provided',
    inventory = [],
    location: string = ''
  ) {
    // this will run the setter functions
    this.pharmacy = pharmacy;
    this.inventory = inventory;
    this.location = location;
  }

  _pharmacy = '';
  _inventory: InventoryItem[] = [];
  _location: string = ''; // Holds a zip code for this demo
  _inventoryHash: itemHash = {}; // Create a hashMap for O(1) time complexity
  shippingDistances: { [key: string]: number } = {}; // store distances between source/destination to reduce API calls

  set inventory(newInventory) {
    // update the local array, but also create a quick access HashMap
    this._inventory = newInventory;
    this._inventoryHash = newInventory.reduce(
      (hash: itemHash, item: InventoryItem) => {
        hash[item.drug] = item;
        return hash;
      },
      {}
    );
  }

  get inventory() {
    return this._inventory;
  }

  set pharmacy(newPharmacy) {
    this._pharmacy = newPharmacy;
  }

  get pharmacy() {
    return this._pharmacy;
  }

  set location(newLocation) {
    this._location = newLocation;
  }

  get location() {
    return this._location;
  }

  findDrug(drugName: string): InventoryItem {
    return this._inventoryHash[drugName];
    // without the hash, this has an O(n) time complexity eg:
    // return this._inventory.find(i => i.drug === drugName);
  }

  async estimateShippingCost(destination: string) {
    const { getGeoCode, estimateOrderDistance } = mapsHelper();
    // Convert the zips to geoCodes for a rough distance estimate    
    if (typeof destination !== 'string') destination = destination + '';
    const destinationZip = destination.padStart(5);
    const sourceZip = this._location.toString().padStart(5);
    let shippingDistance: number;

    // The distance is the same from source to destination as it is from destination to source
    if (
      this.shippingDistances[sourceZip + destinationZip] ||
      this.shippingDistances[destinationZip + sourceZip]
    ) { // if it's cached either forwards or backwards, use it.
      if (this.shippingDistances[destinationZip + sourceZip]) {
        shippingDistance = this.shippingDistances[destinationZip + sourceZip];
      } else {
        shippingDistance = this.shippingDistances[sourceZip + destinationZip];
      }
    } else {
      // not yet saved, so retrive it
      const destinationGeo = await getGeoCode(destinationZip);
      const sourceGeo = await getGeoCode(sourceZip);
      if (destinationGeo && sourceGeo) {
        shippingDistance = await estimateOrderDistance(
          [sourceGeo],
          [destinationGeo]
        );
        this.shippingDistances[sourceZip + destinationZip] = shippingDistance; // cached the distance for later
      } else {
        throw 'Could not convert zip codes to geoCodes. Consult logs for details;';
      }
    }
    return COST_PER_METER * shippingDistance;
  }

  estimateItemCost(orderItem: string, qty: number) {
    return this.findDrug(orderItem).cost * qty;
  }

  async estimateOrderCost(orderItems: OrderItem[], destination: string) {
    const shippingCost = await this.estimateShippingCost(
      destination
    ).catch((e) => console.log(e));

    return orderItems.reduce(
      (sum: number, item) =>
        sum + this.findDrug(item.drug).cost * (item?.quantity || 0),
      0
    );
  }

  isDrugInStock(drugName: string) {
    return this._inventoryHash[drugName] || null;
    // without the hash, this is an O(n) time complexity task eg:
    // return this._inventory.some(i => i.drug === drugName);
  }
}

export type PharmacyType = InstanceType<typeof Pharmacy>;
