# Guide d'Installation et Exécution

Ce projet est un Système d'Évaluation de Stage basé sur la Blockchain.

## Prérequis
- **Node.js** (v18+)
- **Truffle** (`npm install -g truffle`)
- **Ganache** (UI ou CLI)
- **MetaMask** (Extension navigateur)

## 1. Configuration Blockchain (Ganache)
1. Lancez Ganache sur le port `7545`.
2. Assurez-vous d'avoir au moins 10 comptes avec du simulateur d'ETH.

## 2. Déploiement du Smart Contract
```bash
# À la racine du projet
truffle migrate --reset
```
*Note: Notez l'adresse du contrat déployé.*

## 3. Configuration & Lancement du Backend
1. Allez dans le dossier `backend` :
   ```bash
   cd backend
   npm install
   ```
2. Créez un fichier `.env` :
   ```env
   RPC_URL=http://127.0.0.1:7545
   PRIVATE_KEY=votre_clé_privée_ganache_compte_1
   CONTRACT_ADDRESS=adresse_du_contrat_déployé
   ```
3. Lancez le serveur :
   ```bash
   node server.js
   ```

## 4. Configuration & Lancement du Frontend (Next.js)
1. Allez dans le dossier `frontend` :
   ```bash
   cd frontend
   npm install
   ```
2. Mettez à jour l'adresse du contrat dans `app/page.tsx` line 6.
3. Lancez le frontend :
   ```bash
   npm run dev
   ```

## 5. Utilisation avec MetaMask
1. Connectez MetaMask au réseau local Ganache (`http://127.0.0.1:7545`, Chain ID: 5777).
2. Importez le compte utilisé pour le déploiement.
3. Rechargez la page `http://localhost:3000`.

## Fonctionnalités
- **Entreprise** : Valide le stage.
- **Encadrant** : Valide le rapport et attribue une note.
- **Génération** : Une fois tout validé, le bouton "Télécharger Certificat" génère un PDF authentifié par la blockchain.
