import { simulationSteps } from "./core.js";
self.onmessage = ({ data }) => {
  try {
    const iterator = simulationSteps(data.config, {
      checkpoints: data.checkpoints || [],
      keepPaths: data.keepPaths ?? 8,
    });
    const start = performance.now();
    function advance() {
      try {
        const step = iterator.next();
        if (step.done) {
          postMessage({
            type: "result",
            result: { ...step.value, elapsedMs: performance.now() - start },
          });
          return;
        }
        postMessage({ type: "progress", ...step.value });
        setTimeout(advance, 0);
      } catch (error) {
        postMessage({ type: "error", message: error.message });
      }
    }
    advance();
  } catch (error) {
    postMessage({ type: "error", message: error.message });
  }
};
