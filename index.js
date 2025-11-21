

const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

// =================== ÁRVORE DE DECISÃO ===================

const DECISION_TREE = {
  1: {
    text: 'O que você prefere?',
    options: [
      {
        text: 'Lidar com máquinas',
        type: 'goto',
        next: 2,
      },
      {
        text: 'Lidar com pessoas',
        type: 'goto',
        next: 5,
      },
    ],
  },

  2: {
    text: 'O que você prefere?',
    options: [
      {
        text: 'Criar sistemas',
        type: 'goto',
        next: 3,
      },
      {
        text: 'Analisar dados',
        type: 'result',
        value: 'Cientista de Dados / I.A',
      },
    ],
  },

  3: {
    text: 'O que você prefere?',
    options: [
      {
        text: 'Trabalhar com o que é visível para o usuário (telas, interface).',
        type: 'result',
        value: 'Programador Frontend',
      },
      {
        text: 'Trabalhar com a lógica interna do sistema.',
        type: 'goto',
        next: 4,
      },
    ],
  },

  4: {
    text: 'O que você prefere?',
    options: [
      {
        text: 'Infraestrutura, automação e servidores.',
        type: 'result',
        value: 'Devops',
      },
      {
        text: 'Regras de negócio, banco de dados e integrações.',
        type: 'result',
        value: 'Programador Backend',
      },
    ],
  },

  5: {
    text: 'Você gostaria de testar sistemas e encontrar falhas?',
    options: [
      {
        text: 'Sim, gosto de encontrar erros e garantir qualidade.',
        type: 'result',
        value: 'QA (Quality Assurance)',
      },
      {
        text: 'Não, prefiro atuar em outras áreas.',
        type: 'goto',
        next: 6,
      },
    ],
  },

  6: {
    text: 'O que você prefere?',
    options: [
      {
        text: 'Criação de interfaces, protótipos e usabilidade.',
        type: 'result',
        value: 'UX/UI',
      },
      {
        text: 'Planejamento, priorização, estratégia e liderança.',
        type: 'result',
        value: 'Gestão de Produtos',
      },
    ],
  },
};

function formatQuestion(questionId) {
  const q = DECISION_TREE[questionId];
  if (!q) return null;

  let msg = `Pergunta ${questionId}:\n${q.text}\n\n`;

  q.options.forEach((opt, index) => {
    const n = index + 1;
    msg += `${n}) ${opt.text}\n`;
  });

  msg += '\nResponda com o *número* da opção.';
  return msg;
}

// Pergunta 1:
// 1) Lidar com máquinas
// 2) Lidar com pessoas
// Responda com o *número* da opção.

function processAnswer(questionId, answerNumber) {
  const q = DECISION_TREE[questionId];
  if (!q) return null;

  const index = answerNumber - 1; //💡
  const option = q.options[index];
  if (!option) return null;

  if (option.type === 'result') {
    return {
      type: 'result',
      value: option.value,
    };
  }

  if (option.type === 'goto') {
    return {
      type: 'goto',
      next: option.next,
    };
  }

  return null;
}

// =================== SESSÕES ===================
// sessions[whatsappNumber] = { user1, user2, ... }
const sessions = {};

// =================== WHATSAPP CLIENT ===================

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on('qr', qr => {
  console.log('📲 Escaneie o QR Code abaixo com o WhatsApp do *BOT*:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Bot WhatsApp pronto!');
});

client.on('message', async msg => {
  const from = msg.from;      // número do usuário
  const bodyRaw = msg.body.trim();
  const body = bodyRaw.toLowerCase();

  // ignorar grupos
  if (from.endsWith('@g.us')) return;




  // Comando para começar/reiniciar o teste
  if (body === 'iniciar' || body === 'começar' || body === 'comecar') {
    sessions[from] = {
      currentQuestionId: 1,
    };

    const firstQuestion = formatQuestion(1);
    await client.sendMessage(
      from,
      '👋 Olá! Vamos começar o seu *Teste Vocacional em Tecnologia*.\n\n' +
      'Responda sempre com o número da opção.\n\n' +
      firstQuestion
    );
    return;
  }

  // Se não existe sessão, pede pra digitar "iniciar"
  if (!sessions[from]) {
    await client.sendMessage(
      from,
      'Oi! 😊\nPara iniciar o *Teste Vocacional em Tecnologia*, envie a palavra *iniciar*.'
    );
    return;
  }

  // Já existe uma sessão em andamento
  const session = sessions[from];
  const currentQuestionId = session.currentQuestionId;

  // converte a resposta string em número
  const answerNumber = parseInt(bodyRaw, 10);

  if (isNaN(answerNumber)) {
    const again = formatQuestion(currentQuestionId);
    await client.sendMessage(
      from,
      '❗ Não entendi sua resposta.\nPor favor, responda apenas com o *número* da opção.\n\n' +
      again
    );
    return;
  }

  const result = processAnswer(currentQuestionId, answerNumber);

  // Opção inválida para essa pergunta
  if (!result) {
    const again = formatQuestion(currentQuestionId);
    await client.sendMessage(
      from,
      '❗ Opção inválida.\nResponda com um dos números listados.\n\n' +
      again
    );
    return;
  }

  // Se chegou em uma profissão final
  if (result.type === 'result') {
    const career = result.value;
    delete sessions[from];

    await client.sendMessage(
      from,
      '✅ Teste concluído!\n\n' +
      'Com base nas suas respostas, a área de tecnologia que mais combina com você é:\n\n' +
      `*${career}* 🎯\n\n` +
      'Obrigado por participar!'
    );
    return;
  }

  // Se vai para próxima pergunta
  if (result.type === 'goto') {
    const nextId = result.next;
    session.currentQuestionId = nextId;

    const nextQuestion = formatQuestion(nextId);

    await client.sendMessage(from, nextQuestion);
  }
});

// Inicializa o cliente
client.initialize();
