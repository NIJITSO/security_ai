require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const PDFDocument = require('pdfkit');
const cors = require('cors');
const { authenticate, requireRole } = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(express.json());
app.use(cors());

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/internship_blockchain')
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err));

// --- Blockchain Configuration ---
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:7545";
const PRIVATE_KEY = process.env.PRIVATE_KEY;           // Company wallet (admin + entreprise)
const SUPERVISOR_KEY = process.env.SUPERVISOR_PRIVATE_KEY; // Supervisor wallet (encadrant)
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const ABI = [
    "function addStudent(string name) public",
    "function validerStage(uint256 _id) public",
    "function validerRapport(uint256 _id) public",
    "function attribuerNote(uint256 _id, uint256 _note) public",
    "function genererCertificat(uint256 _id) public",
    "function getStudent(uint256 _id) public view returns (tuple(uint256 id, string name, bool stageValide, bool rapportValide, uint256 note, bool certificat, bool exists))",
    "function studentCount() public view returns (uint256)"
];

const provider = new ethers.JsonRpcProvider(RPC_URL);

// Company wallet — used by admin (addStudent) and entreprise (validerStage)
const companyWallet = new ethers.Wallet(PRIVATE_KEY, provider);
const companyContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, companyWallet);

// Supervisor wallet — used by encadrant (validerRapport, attribuerNote)
const supervisorWallet = new ethers.Wallet(SUPERVISOR_KEY, provider);
const supervisorContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, supervisorWallet);

// Read-only contract for fetching data
const readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

// --- Auth Routes (public) ---
app.use('/auth', authRoutes);

// --- Protected Routes ---

// --- Helper: auto-generate certificate if all conditions met ---
async function tryAutoCertificate(studentId) {
    try {
        const student = await readContract.getStudent(studentId);
        if (student.stageValide && student.rapportValide && Number(student.note) > 10 && !student.certificat) {
            const certTx = await companyContract.genererCertificat(studentId);
            await certTx.wait();
            return { certificatGenere: true, message: 'Certificat généré automatiquement!' };
        }
    } catch (e) {
        console.error('Auto-certificate failed:', e.message);
    }
    return {};
}

// POST /certificat/generer — manually trigger certificate generation
app.post('/certificat/generer', authenticate, async (req, res) => {
    try {
        const { studentId } = req.body;
        const result = await tryAutoCertificate(studentId);
        if (result.certificatGenere) {
            res.json({ success: true, message: result.message });
        } else {
            const student = await readContract.getStudent(studentId);
            const missing = [];
            if (!student.stageValide) missing.push('Stage non validé');
            if (!student.rapportValide) missing.push('Rapport non validé');
            if (Number(student.note) <= 10) missing.push('Note insuffisante (doit être > 10)');
            if (student.certificat) missing.push('Certificat déjà généré');
            res.status(400).json({ error: 'Impossible de générer le certificat', missing });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /me — current user info
app.get('/me', authenticate, (req, res) => {
    res.json({ user: { username: req.user.username, role: req.user.role } });
});

// GET /students — any authenticated user
app.get('/students', authenticate, async (req, res) => {
    try {
        const count = await readContract.studentCount();
        const students = [];
        for (let i = 1; i <= Number(count); i++) {
            try {
                const s = await readContract.getStudent(i);
                students.push({
                    id: Number(s.id),
                    name: s.name,
                    stageValide: s.stageValide,
                    rapportValide: s.rapportValide,
                    note: Number(s.note),
                    certificat: s.certificat,
                    exists: s.exists
                });
            } catch (e) { /* skip */ }
        }
        res.json({ students });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /student/add — admin only, uses company wallet
app.post('/student/add', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { name } = req.body;
        const tx = await companyContract.addStudent(name);
        await tx.wait();
        res.json({ success: true, transactionHash: tx.hash });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /stage/valider — entreprise only, uses company wallet
app.post('/stage/valider', authenticate, requireRole('entreprise'), async (req, res) => {
    try {
        const { studentId } = req.body;
        const tx = await companyContract.validerStage(studentId);
        await tx.wait();
        // Auto-cert check
        const certResult = await tryAutoCertificate(studentId);
        res.json({ success: true, transactionHash: tx.hash, ...certResult });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /rapport/valider — encadrant only, uses supervisor wallet
app.post('/rapport/valider', authenticate, requireRole('encadrant'), async (req, res) => {
    try {
        const { studentId } = req.body;
        const tx = await supervisorContract.validerRapport(studentId);
        await tx.wait();
        // Auto-cert check
        const certResult = await tryAutoCertificate(studentId);
        res.json({ success: true, transactionHash: tx.hash, ...certResult });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /note — encadrant only, uses supervisor wallet + auto-certificate
app.post('/note', authenticate, requireRole('encadrant'), async (req, res) => {
    try {
        const { studentId, note } = req.body;
        const tx = await supervisorContract.attribuerNote(studentId, note);
        await tx.wait();
        // Auto-cert check
        const certResult = await tryAutoCertificate(studentId);
        res.json({ success: true, transactionHash: tx.hash, ...certResult });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /certificat — download PDF, any authenticated user
app.post('/certificat', authenticate, async (req, res) => {
    try {
        const { studentId } = req.body;
        const student = await readContract.getStudent(studentId);
        
        if (!student.certificat) {
            // Return what's missing
            const missing = [];
            if (!student.stageValide) missing.push('Stage non validé');
            if (!student.rapportValide) missing.push('Rapport non validé');
            if (Number(student.note) <= 10) missing.push('Note insuffisante (doit être > 10)');
            if (Number(student.note) === 0) missing.push('Note non attribuée');
            return res.status(400).json({ 
                error: 'Certificat non disponible',
                missing 
            });
        }

        // Clean student name for filename
        const safeName = student.name.replace(/[^a-zA-Z0-9À-ÿ ]/g, '').replace(/\s+/g, '_');
        const filename = `Certificat_${safeName}.pdf`;

        const doc = new PDFDocument({ margin: 60 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        // Header
        doc.rect(0, 0, doc.page.width, 120).fill('#1a1a2e');
        doc.fontSize(28).fillColor('#e0e0ff').text('CERTIFICAT DE STAGE', 60, 45, { align: 'center' });

        // Body
        doc.fillColor('#333');
        doc.moveDown(4);
        doc.fontSize(14).text('Ce certificat atteste que', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(22).fillColor('#4f46e5').text(student.name, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor('#333').text('a validé avec succès son stage et obtenu la note de', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(30).fillColor('#16a34a').text(`${Number(student.note)}/20`, { align: 'center' });
        doc.moveDown(1.5);
        doc.fontSize(11).fillColor('#666');
        doc.text(`ID Blockchain : ${studentId}`, { align: 'center' });
        doc.text(`Date de délivrance : ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(10).fillColor('#999').text('Ce certificat a été généré et vérifié sur la blockchain.', { align: 'center' });

        doc.end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
