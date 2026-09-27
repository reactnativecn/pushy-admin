// Shared by app insights and the service-status version report panel.
// These thresholds classify rollback report shares, not overall health.
export const CRITICAL_ROLLBACK = 0.05;
export const WARNING_ROLLBACK = 0.01;
export const MIN_EVENT_SAMPLES = 10;
