// Chrome API mock
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
  contextMenus: {
    create: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
    },
  },
};
