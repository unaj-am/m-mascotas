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
