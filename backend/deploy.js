// Deploy script - compiles with Paris EVM (Ganache compatible) and deploys
const { ethers } = require('ethers');
const solc = require('solc');
const fs = require('fs');
const path = require('path');

async function main() {
    // 1. Read Solidity source
    const contractPath = path.join(__dirname, '..', 'contracts', 'InternshipSystem.sol');
    const source = fs.readFileSync(contractPath, 'utf8');

    // 2. Compile with solc targeting Paris EVM (no PUSH0)
    const input = {
        language: 'Solidity',
        sources: { 'InternshipSystem.sol': { content: source } },
        settings: {
            evmVersion: 'paris',
            outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } }
        }
    };

    console.log("Compiling contract (EVM: paris)...");
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
        const errs = output.errors.filter(e => e.severity === 'error');
        if (errs.length > 0) {
            console.error("Compilation errors:", errs.map(e => e.message).join('\n'));
            process.exit(1);
        }
    }

    const compiled = output.contracts['InternshipSystem.sol']['InternshipSystem'];
    const abi = compiled.abi;
    const bytecode = compiled.evm.bytecode.object;

    console.log("Compilation successful!");

    // 3. Connect to Ganache
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
    const accounts = await provider.listAccounts();
    const deployer = accounts[0]; // Company (Index 0)
    const supervisor = accounts[1]; // Supervisor (Index 1)

    console.log("\nDeployer (Company):", deployer.address);
    console.log("Supervisor:", supervisor.address);

    // 4. Deploy
    const factory = new ethers.ContractFactory(abi, bytecode, deployer);
    console.log("\nDeploying InternshipSystem...");
    const contract = await factory.deploy(supervisor.address);
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log("\n✅ Contract deployed at:", contractAddress);

    // 5. Auto-update .env
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${contractAddress}`);
    fs.writeFileSync(envPath, envContent);
    console.log("✅ Updated backend/.env with new CONTRACT_ADDRESS");

    console.log("\n========================================");
    console.log("REMAINING STEPS:");
    console.log("========================================");
    console.log("1. Get PRIVATE KEY of account Index 0 from Ganache");
    console.log("   (click the 🔑 key icon next to first account)");
    console.log("   and update PRIVATE_KEY in backend/.env");
    console.log("");
    console.log("2. Update frontend/app/page.tsx line 6:");
    console.log(`   const CONTRACT_ADDRESS = "${contractAddress}";`);
    console.log("");
    console.log("3. Restart backend: node server.js");
    console.log("4. Connect MetaMask to Ganache (RPC: http://127.0.0.1:7545, Chain ID: 5777)");
    console.log("========================================");
}

main().catch(console.error);
