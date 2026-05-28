import { Router } from 'express';
import { postLogin, getMe } from '../controllers/authController.js';
import {
  postAgendar,
  getConsultas,
  putCancelar,
  patchStatus,
  deleteConsulta,
  getSlots,
  getConfig,
  putConfig,
  getPacientes,
  getClientAgendamentos,
} from '../controllers/consultaController.js';
import {
  postProfissional,
  getProfissionais,
  getServicos,
} from '../controllers/professionalController.js';
import {
  postWebhookWhatsapp,
  postWebhookTwilio,
  getWebhookVerify,
} from '../controllers/webhookController.js';
import {
  getParceirosBusca,
  postParceiro,
  getParceiroDetails,
} from '../controllers/parceiroController.js';
import {
  postProntuario,
  getProntuariosByCliente,
  getResultadosExames,
} from '../controllers/prontuarioController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Auth
router.post('/auth/login', postLogin);
router.get('/auth/me', getMe);

// Geolocation/Partners
router.get('/parceiros/busca', getParceirosBusca);
router.post('/parceiros', postParceiro);
router.get('/parceiros/:id', getParceiroDetails);

// Client portal (Public/CPF-identified)
router.post('/agendar', postAgendar);
router.get('/slots', getSlots);
router.get('/pacientes/:cpf/agendamentos', getClientAgendamentos);
router.get('/pacientes/:cpf/prontuarios', getProntuariosByCliente);
router.get('/pacientes/:cpf/resultados', getResultadosExames);

// Partner portal (Requires Auth & Tenant isolated)
router.get('/consultas', requireAuth, getConsultas);
router.put('/cancelar', requireAuth, putCancelar);
router.patch('/consultas/status', requireAuth, patchStatus);
router.delete('/consultas/:id', requireAuth, deleteConsulta);
router.get('/config', requireAuth, getConfig);
router.put('/config', requireAuth, putConfig);
router.get('/pacientes', requireAuth, getPacientes);
router.post('/parceiros/prontuarios', requireAuth, postProntuario);

router.post('/profissionais', requireAuth, postProfissional);
router.get('/profissionais', getProfissionais);
router.get('/servicos', getServicos);

// Webhooks
router.post('/webhook-whatsapp', postWebhookWhatsapp);
router.post('/webhook', postWebhookTwilio);
router.get('/webhook-whatsapp', getWebhookVerify);

router.get('/health', (req, res) => {
  res.json({ ok: true, t: Date.now() });
});

export default router;
