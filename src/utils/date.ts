/** Clinic calendar dates are Sri Lankan dates, regardless of the user's device. */
export const localDate = (offsetDays = 0): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)!.value);
  // Use UTC only for arithmetic on the extracted calendar date, not to decide
  // which day it is in the clinic. This also handles month/year boundaries.
  return new Date(Date.UTC(value('year'), value('month') - 1, value('day') + offsetDays))
    .toISOString().slice(0, 10);
};

export const clinicTime = (offsetMinutes = 0): string => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(Date.now() + offsetMinutes * 60_000));
