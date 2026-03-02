import { vi } from 'vitest';

// Mock Prisma client for unit tests
export const mockPrisma = {
    user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    dailyQuestion: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
};

// Reset all mocks between tests
export const resetMocks = () => {
    vi.clearAllMocks();
};

export default mockPrisma;
