export interface Property {
  id: string;
  type: 'plot' | 'house' | 'rental';
  status: 'pending' | 'approved';
  colony: string;
  village: string;
  area: string;
  price: string;
  description: string;
  imageUrl: string;
  mapUrl?: string;
  userId: string;
  ownerName?: string;
  ownerContact?: string;
  ownerAddress?: string;
  createdAt: string;
  views?: number;
}
