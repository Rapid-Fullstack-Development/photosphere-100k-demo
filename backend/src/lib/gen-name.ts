
//
// Creates a name that is sorted in reverse chronological order according to the date.
// The name essentially counts down to the year 3000.
//
export function generateReverseChronoName(date: Date): string {
    const futureDate = new Date('3000-12-31T23:59:59Z');
    const diffInSeconds = Math.floor((futureDate.getTime() - date.getTime()) / 1000);
    return diffInSeconds.toString().padStart(20, '0');
}
