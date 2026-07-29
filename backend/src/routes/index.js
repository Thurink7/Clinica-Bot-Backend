import { Router } from 'express';
import { postLogin, getMe } from '../controllers/authController.js';
import {
  postAgendar,
  getConsultas,
  putCancelar,
  patchStatus,
  deleteConsulta,
  patchReagendar,
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
  patchProfissionalAtivo,
  deleteProfissional,
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
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { postCadastroPaciente, patchPacienteObservacoes, deletePaciente } from '../controllers/pacienteController.js';
import { postContato } from '../controllers/contatoController.js';

const router = Router();

// Auth
router.post('/auth/login', postLogin);
router.get('/auth/me', getMe);

// Geolocation/Partners
router.get('/parceiros/busca', getParceirosBusca);
router.post('/parceiros', postParceiro);
router.get('/parceiros/:id', getParceiroDetails);
router.post('/pacientes/cadastro', postCadastroPaciente);
router.patch('/pacientes/observacoes', patchPacienteObservacoes);
router.post('/contato', postContato);

// Client portal (Public/CPF-identified)
router.post('/agendar', optionalAuth, postAgendar);
router.get('/slots', optionalAuth, getSlots);
router.get('/pacientes/:cpf/agendamentos', getClientAgendamentos);
router.get('/pacientes/:cpf/prontuarios', getProntuariosByCliente);
router.get('/pacientes/:cpf/resultados', getResultadosExames);

// Partner portal (Requires Auth & Tenant isolated)
router.get('/consultas', requireAuth, getConsultas);
router.put('/cancelar', requireAuth, putCancelar);
router.patch('/consultas/status', requireAuth, patchStatus);
router.delete('/consultas/:id', requireAuth, deleteConsulta);
router.patch('/consultas/:id/reagendar', requireAuth, patchReagendar);
router.get('/config', requireAuth, getConfig);
router.put('/config', requireAuth, putConfig);
router.get('/pacientes', requireAuth, getPacientes);
router.delete('/pacientes/:id', requireAuth, deletePaciente);
router.post('/parceiros/prontuarios', requireAuth, postProntuario);

router.post('/profissionais', requireAuth, postProfissional);
router.get('/profissionais', getProfissionais);
router.patch('/profissionais/:id/ativo', requireAuth, patchProfissionalAtivo);
router.delete('/profissionais/:id', requireAuth, deleteProfissional);
router.get('/servicos', getServicos);

// Webhooks
router.post('/webhook-whatsapp', postWebhookWhatsapp);
router.post('/webhook', postWebhookTwilio);
router.get('/webhook-whatsapp', getWebhookVerify);

router.get('/health', (req, res) => {
  res.json({ ok: true, t: Date.now() });
});

export default router;
