const { createDemoShipment } = require("./demoCourierService");
const { createPathaoSandboxShipment } = require("./pathaoSandboxService");

const getCourierProvider = (providerOverride) => {
  const provider = String(
    providerOverride || process.env.COURIER_PROVIDER || "demo"
  )
    .trim()
    .toLowerCase();
  if (provider === "demo") {
    return {
      name: "demo",
      createShipment: createDemoShipment,
    };
  }
  if (provider === "pathao_sandbox") {
    return {
      name: "pathao_sandbox",
      createShipment: createPathaoSandboxShipment,
    };
  }
  return {
    name: "demo",
    createShipment: createDemoShipment,
  };
};

module.exports = {
  getCourierProvider,
};
