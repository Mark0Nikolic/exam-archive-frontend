const mockDataFlag = import.meta.env.VITE_USE_MOCK_DATA

export const useMockData =
  mockDataFlag === undefined ? import.meta.env.DEV : mockDataFlag.toLowerCase() === 'true'
