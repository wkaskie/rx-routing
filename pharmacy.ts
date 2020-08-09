/* Pharmacy Module
   This handles the pharmacy specific data and tasks
*/
import md5 from 'md5';
import { OrderItem } from './interfaces/OrderItem';
import { InventoryItem } from './interfaces/Inventory';
import { mapsHelper } from './mapsHelper';

interface itemHash {
  [key: string]: InventoryItem;
}

// NOTE: if Pharmacies set the cost, this should be pulled from the Pharmacy API,
// Otherwise, set this "globally"
const COST_PER_METER = 0.000008;

export class Pharmacy {
  constructor(
    pharmacy: string = 'No name provided',
    inventory = [] as InventoryItem[],
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
  _shippingCost: {
    [key: string]: number;
  } = {}; // key will be zip codes to a destination

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

  getShipping(destination: string) {
    return this._shippingCost[destination];
  }

  setShipping(destination: string, shipping: number) {
    this._shippingCost[destination] = shipping;
  }

  findDrug(drugName: string): InventoryItem {
    return this._inventoryHash[drugName];
    // without the hash, this has an O(n) time complexity eg:
    // return this._inventory.find(i => i.drug === drugName);
  }

  getCachedShippingDistance(destination: string) {
    if (typeof destination !== 'string') destination = destination + ''; // Conver zipCode numbers to strings
    const destinationZip = destination.padStart(5); // fix numberslike 7522 to 07522
    const sourceZip = this.location.toString().padStart(5);
    let shippingDistance: number | null = this.shippingDistances[destinationZip] || null;

    return {
      destinationZip,
      sourceZip, // This isn't used here, but it's nice to return it for later use
      shippingDistance,
    };
  }
  async estimateDistanceFromPharmacy(destination: string) {
    const { getGeoCode, estimateOrderDistance, apiKey } = mapsHelper();
    if (!apiKey) return null; // use the backup shipping calculator

    // Convert the zips to geoCodes for a rough distance estimate
    const {
      destinationZip,
      sourceZip,
      shippingDistance,
    } = this.getCachedShippingDistance(destination);
    let distance = 0;

    if (shippingDistance) {
      // if it's cached use it.
      distance = shippingDistance;
    } else {
      // not yet saved, so retrive it
      const destinationGeo = await getGeoCode(destinationZip).catch((e) =>
        console.log('Could not get GeoCode for ' + destinationZip)
      );
      const sourceGeo = await getGeoCode(sourceZip).catch((e) =>
        console.log('Could not get GeoCode for ' + sourceZip)
      );

      if (destinationGeo && sourceGeo) {
        distance = await estimateOrderDistance([sourceGeo], [destinationGeo]);
        this.shippingDistances[destinationZip] = distance; // cache the distance for later
      } else {
        console.log(`Could not convert zip codes ${destinationZip} or ${sourceZip} to geoCodes. Consult logs for details.`);
      }
    }
    return distance;
  }

  estimateShippingCost(distance: number | null) {
    // TODO: Modify to work w/Zone to Zone or fixed rate pricing
    let shipping = 0;
    return  shipping = COST_PER_METER * (distance || 0);
  }

  estimateItemCost(orderItem: string, qty: number) {
    return this.findDrug(orderItem).cost * qty || null;
  }

  async estimateOrderCost(orderItems: OrderItem[], destination: string) {
    if (!this._shippingCost[destination]) {
      const { shippingDistance } = this.getCachedShippingDistance(destination);
      let distance: number | null;

      if (shippingDistance) {
        distance = shippingDistance;
      } else {
        distance = await this.estimateDistanceFromPharmacy(destination);
      }

      if(!distance) {
        this.setShipping(destination, parseInt(md5(destination + this.location), 10) % 1000);
      } else {
        this.setShipping(destination, this.estimateShippingCost(distance));
      }
    }

    return (
      orderItems.reduce(
        (sum: number, item) =>
          sum + this.findDrug(item.drug).cost * (item?.quantity || 0),
        0
      ) + (this.getShipping(destination) || 0)
    );
  }

  isDrugInStock(drugName: string) {
    return this._inventoryHash[drugName] || null;
    // without the hash, this is an O(n) time complexity task eg:
    // return this._inventory.some(i => i.drug === drugName);
  }
}

export type PharmacyType = InstanceType<typeof Pharmacy>;
