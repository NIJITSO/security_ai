const InternshipSystem = artifacts.require("InternshipSystem");

module.exports = function (deployer, network, accounts) {
  // Use the second account as the supervisor for demo purposes
  const supervisorAddress = accounts[1];
  deployer.deploy(InternshipSystem, supervisorAddress);
};
