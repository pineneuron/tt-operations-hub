/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if checkout location is within allowed radius (500 meters)
 * @param checkInLat Check-in latitude
 * @param checkInLng Check-in longitude
 * @param checkOutLat Check-out latitude
 * @param checkOutLng Check-out longitude
 * @returns true if within 500 meters, false otherwise
 */
export function isWithinCheckoutRadius(
  checkInLat: number,
  checkInLng: number,
  checkOutLat: number,
  checkOutLng: number
): boolean {
  const distance = calculateDistance(
    checkInLat,
    checkInLng,
    checkOutLat,
    checkOutLng
  );
  return distance <= 500; // Allow checkout within 500 meters
}
