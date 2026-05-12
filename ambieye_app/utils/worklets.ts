type WorkletsModule = typeof import("react-native-worklets-core");

type WorkletsApi = {
  createRunOnJS?: <T extends (...args: any[]) => void>(fn: T) => T;
};

let cachedModule: WorkletsModule | null | undefined;
let cachedWorklets: WorkletsApi | null | undefined;

export function getWorkletsModule(): WorkletsModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedModule = require("react-native-worklets-core");
  } catch {
    cachedModule = null;
  }

  return cachedModule;
}

export function getWorklets(): WorkletsApi | null {
  if (cachedWorklets !== undefined) {
    return cachedWorklets;
  }

  const module = getWorkletsModule();

  if (!module) {
    cachedWorklets = null;
    return cachedWorklets;
  }

  try {
    cachedWorklets = module.Worklets as WorkletsApi;
  } catch {
    cachedWorklets = null;
  }

  return cachedWorklets;
}

export function isWorkletsAvailable(): boolean {
  return Boolean(getWorklets()?.createRunOnJS);
}

export function createRunOnJS<T extends (...args: any[]) => void>(fn: T): T {
  const worklets = getWorklets();

  if (worklets?.createRunOnJS) {
    return worklets.createRunOnJS(fn);
  }

  return ((...args: any[]) => {
    fn(...args);
  }) as T;
}
