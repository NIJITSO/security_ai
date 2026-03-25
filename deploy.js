// Deploy script using ethers.js (no Truffle needed)
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
    // Connect to Ganache
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
    
    // Get accounts from Ganache
    const accounts = await provider.listAccounts();
    const deployer = accounts[0]; // Company account (Index 0)
    const supervisor = accounts[1]; // Supervisor account (Index 1)
    
    console.log("Deployer (Company):", deployer.address);
    console.log("Supervisor:", supervisor.address);
    
    // Load compiled contract
    const contractJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'build', 'contracts', 'InternshipSystem.json'), 'utf8')
    );
    
    // Deploy
    const factory = new ethers.ContractFactory(contractJson.abi, contractJson.bytecode, deployer);
    console.log("\nDeploying InternshipSystem...");
    const contract = await factory.deploy(supervisor.address);
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log("Contract deployed at:", contractAddress);
    
    // Get deployer private key from Ganache (we need the user to provide it)
    // For now, output what needs to go in .env
    console.log("\n========================================");
    console.log("UPDATE your backend/.env file with:");
    console.log("========================================");
    console.log(`CONTRACT_ADDRESS=${contractAddress}`);
    console.log("\nAnd update frontend/app/page.tsx line 6:");
    console.log(`const CONTRACT_ADDRESS = "${contractAddress}";`);
    console.log("\nIMPORTANT: Get the PRIVATE KEY of account Index 0 from Ganache");
    console.log("(click the key icon next to the first account)");
    console.log("and set it as PRIVATE_KEY in backend/.env");
    console.log("========================================");
}

main().catch(console.error);
