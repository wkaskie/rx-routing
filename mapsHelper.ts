/*
    Doing a little functional coding
    No tactical reason, just switching it up
*/

import { Client, Status, LatLng } from '@googlemaps/google-maps-services-js';

const client = new Client({});
const apiKey = process.env.MAPS_API_KEY || null;

export const mapsHelper = () => {
  const getGeoCode = async (zip: string): Promise<LatLng | undefined> => {
    if (!apiKey) return;
    let lat;
    let lng;
    let address = zip;
    
    try {
      const response = await client.geocode({
        params: {
          address: address,
          key: apiKey,
        },
      });

      if (response.status == 200) {
        const {
          data: { results },
        } = response;
        if (!results[0] || !results[0].geometry) {
            console.log('Bad Zipcode for ', address);
            return;
        }
        lat = results[0].geometry.location.lat;
        lng = results[0].geometry.location.lng;
        return { lat, lng } as LatLng;
      } else {
        console.log(
          'Geocode was not successful for the following reason: ' + status
        );
        return;
      }
    } catch (e) {
      console.log(e);
      return;
    }
  };

  const estimateOrderDistance = async (
    origins: LatLng[],
    destinations: LatLng[]
  ): Promise<number> => {
    // given the origin and destination, return the distance between the two
    // const origins: LatLng[] = [{lat: 40.6655101, lng: -73.89188969999998} as LatLng];
    // const destinations: LatLng[] = [{lat: 40.6905615, lng: -73.9976592} as LatLng];
    if(!apiKey) return 0;
    const response = await client.distancematrix({
      params: {
        origins: [...origins],
        destinations: [...destinations],
        key: apiKey,
      },
      timeout: 1000,
    });
    // console.dir(response.data, { depth: 10 });
    const {
      data: { rows },
    } = response;
    const { elements } = rows[0];
    const {
      distance: { value },
    } = elements[0];

    return value; // returns the distance in meters
  };

  return { getGeoCode, estimateOrderDistance, apiKey };
};
