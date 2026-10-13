import axios from 'axios';
import { apiErrorMessage } from '../services/api';

/** Explain failed appointment writes without exposing raw server errors or retrying mutations. */
export function appointmentActionError(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'The appointment action failed. Please try again.';
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'The request timed out. Refresh the appointments to check whether it completed before trying again.';
  }
  if (!error.response) {
    return 'Cannot reach the appointment service. Check your connection and refresh appointments before trying again.';
  }
  const status = error.response.status;
  if (status >= 500) return 'The appointment service encountered a server error. Please check the backend log before trying again.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  return apiErrorMessage(error, `The appointment action failed (HTTP ${status}). Please refresh and try again.`);
}
