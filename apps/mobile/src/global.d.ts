/** Type declaration for global pending visits passed from the geofence background task. */
declare global {
  var _pendingVisits: Array<{
    visitId: string;
    cinemaId: string;
    cinemaName: string;
    entryTime: string;
    exitTime: string;
    dwellMinutes: number;
    latitude: number;
    longitude: number;
  }> | undefined;
}

export {};
