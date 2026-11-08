export type PetSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE' | 'UNKNOWN';

export type Pet = Readonly<{
  id: string;
  ownerId: string;
  name: string;
  breed: string;
  age: number;
  weight: number;
  observations: string;
  photoUri: string | null;
  size: PetSize;
  behavior: string;
  specialNeeds: string;
}>;

export type PetDraft = Readonly<Omit<Pet, 'ownerId' | 'photoUri'>>;
export type PetList = Readonly<{
  items: readonly Pet[];
  fromCache: boolean;
  pendingWrites: boolean;
}>;
