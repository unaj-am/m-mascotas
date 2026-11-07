export type Walker = Readonly<{
  userId: string;
  description: string;
  experienceYears: number;
  serviceArea: string;
  available: boolean;
  pricePerWalk: number;
  maxPets: number;
  rating: number | null;
}>;
