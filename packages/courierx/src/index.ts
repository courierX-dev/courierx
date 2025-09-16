// CourierX - Multi-provider email delivery service
// This is the main entry point for the courierx package

// Re-export everything from our sub-packages
export * from '@courierx/shared';
export * from '@courierx/providers';
export * from '@courierx/client';

// Main CourierX class for convenience
export { CourierXClient as CourierX } from '@courierx/client';

// Version info
export const version = '0.1.0';

// Default export for convenience
import { CourierXClient } from '@courierx/client';
export default CourierXClient;
