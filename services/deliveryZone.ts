import { api } from './api'; // <-- updated: point to api.ts in same folder
import { DeliveryZone, CreateDeliveryZoneRequest } from './types';

export const deliveryZoneService = {
  getDeliveryZones: async (storeUuid: string): Promise<DeliveryZone[]> => {
    try {
      return await api.get<DeliveryZone[]>(`/vendor/zones/${storeUuid}`);
    } catch (error) {
      // You can log the original error in dev:
      // console.error('getDeliveryZones error', error);
      throw new Error('Failed to fetch delivery zones. Please try again.');
    }
  },

  createDeliveryZone: async (zoneData: CreateDeliveryZoneRequest): Promise<DeliveryZone> => {
    try {
      return await api.post<DeliveryZone>('/vendor/zones', zoneData);
    } catch (error) {
      throw new Error('Failed to create delivery zone. Please try again.');
    }
  },

  updateDeliveryZone: async (zoneId: string, zoneData: Partial<CreateDeliveryZoneRequest>): Promise<DeliveryZone> => {
    try {
      return await api.patch<DeliveryZone>(`/vendor/zones/${zoneId}`, zoneData);
    } catch (error) {
      throw new Error('Failed to update delivery zone. Please try again.');
    }
  },

  deleteDeliveryZone: async (zoneId: string): Promise<void> => {
    try {
      await api.delete<void>(`/vendor/zones/${zoneId}`);
    } catch (error) {
      throw new Error('Failed to delete delivery zone. Please try again.');
    }
  },
};
