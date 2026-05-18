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
import { postCadastroPaciente, patchPacienteObservacoes } from '../controllers/pacienteController.js';
import { postContato } from '../controllers/contatoController.js';

const router = Router();

router.post('/auth/login', postLogin);
router.get('/auth/me', getMe);

router.post('/agendar', postAgendar);
router.get('/consultas', getConsultas);
router.put('/cancelar', putCancelar);
router.patch('/consultas/status', patchStatus);
router.delete('/consultas/:id', deleteConsulta);
router.get('/slots', getSlots);
router.get('/config', getConfig);
router.put('/config', putConfig);
router.get('/pacientes', getPacientes);
router.post('/pacientes/cadastro', postCadastroPaciente);
router.patch('/pacientes/observacoes', patchPacienteObservacoes);
router.post('/contato', postContato);

router.post('/profissionais', postProfissional);
router.get('/profissionais', getProfissionais);
router.get('/servicos', getServicos);

router.post('/webhook-whatsapp', postWebhookWhatsapp);
router.post('/webhook', postWebhookTwilio);
router.get('/webhook-whatsapp', getWebhookVerify);

router.get('/health', (req, res) => {
  res.json({ ok: true, t: Date.now() });
});

export default router;
