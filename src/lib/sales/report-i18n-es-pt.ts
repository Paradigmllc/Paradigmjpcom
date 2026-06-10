/**
 * report-i18n-es-pt.ts — Spanish (Español) + Portuguese (Português - Brasil)
 * es: Tratamiento de usted
 * pt: Tratamento formal
 */

import type { ReportLocaleData } from "./report-i18n-shared"

/* ═══════════════════════════════════════════════════════════════════════════
   es — Spanish (Español)  |  Tratamiento de usted
   ═══════════════════════════════════════════════════════════════════════════ */

export const ES: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "Informe de diagnóstico ejecutivo",
    validity: "Válido hasta",
    heroKicker: "Diagnóstico empresarial confidencial",
    heroLead:
      "A partir de datos públicos, señales recopiladas y una demo de mejora, hemos identificado el primer paso más claro entre ingresos, confianza y flujo de consultas.",
    evidenceReady: "Datos recopilados",
    sourceCoverage: "Cobertura de evidencia",
    monthlyLoss: "Pérdida de oportunidad mensual estimada",
    confidence: "Confiabilidad de los datos",
    currentState: "Fricción actual",
    improvedState: "Estado mejorado",
    diagnosticSurface: "Alcance del diagnóstico",
    priorityFindings: "Hallazgos prioritarios",
    businessImpact: "Impacto en el negocio",
    firstMove: "Primera acción",
    whyItMatters: "Por qué es importante",
    evidence: "Evidencia",
    recommendation: "Acción recomendada",
    roadmap: "Hoja de ruta de 30 días",
    dataAppendix: "Registro de datos",
    sourceMeaning: "Significado comercial",
    sourceNext: "Próxima verificación",
    sourceMissing:
      "Las fuentes faltantes no se tratan como hechos, sino como hipótesis para la próxima revisión.",
    templateDirection: "Dirección de la propuesta",
    qualityBar: "Estándar de calidad",
    finalHeading: "En 30 minutos, elija la primera mejora",
    finalBody:
      "Antes de una reconstrucción completa, identifiquemos juntos qué palanca — oportunidad de ingresos, prueba de confianza o flujo de consultas — ofrece el retorno más rápido.",
    emailSubject: "Sobre el informe de diagnóstico",
    competitorBenchmark: "Comparativa de competidores y sector",
    yourSite: "Su sitio web",
    industryAvg: "Media del sector",
    topCompetitors: "Principales competidores",
    roiTitle: "Simulación de ROI proyectado",
    paybackPeriod: "Período de recuperación estimado",
    recoveredTwelveMonths: "Ingresos recuperados en 12 meses",
    roiLabel: "ROI proyectado",
    faqTitle: "Preguntas frecuentes",
    readMore: "Leer el análisis detallado",
  },
  cta: [
    "Ver demo de mejora",
    "Agendar consulta gratuita",
    "Leer el diagnóstico completo",
    "Comenzar la mejora ahora",
  ],
  faq: [
    {
      q: "¿Tenemos que abandonar nuestro hosting o dominio actual?",
      a: "No. Construimos y probamos la capa de presentación optimizada en un entorno de staging y la intercambiamos sin tiempo de inactividad cuando está aprobada. Su infraestructura actual no se modifica — hemos elevado puntuaciones Lighthouse de 40 a más de 90 puntos sin tocar el backend en decenas de proyectos.",
    },
    {
      q: "¿Está realmente garantizada la puntuación Lighthouse móvil de 85+?",
      a: "Sí. Nuestro paquete de optimización Astro/Next.js garantiza una puntuación Lighthouse móvil de 85 como mínimo. Si no alcanzamos este umbral, reembolsamos íntegramente los honorarios de optimización de rendimiento. La media de entrega de todos nuestros proyectos desde 2024 es de 92 puntos.",
    },
    {
      q: "¿Cómo es el proceso y cuánto tiempo lleva?",
      a: "Auditoría inicial (3 días) → Reconstrucción visual en Astro/Next.js (5–7 días) → Validación en staging (3 días) → Puesta en producción (1 día). El ciclo completo se completa en tan solo 2 semanas. Solo necesita participar en dos momentos: la reunión de inicio y la aprobación final.",
    },
    {
      q: "¿Funciona con nuestra agencia o equipo interno actual?",
      a: "Por supuesto. Actuamos como una capa quirúrgica de rendimiento — no reemplazamos a su agencia, CMS ni equipo de desarrollo. Entregamos una capa de presentación independiente que se integra perfectamente y proporcionamos plantillas editables sin código para que su equipo las mantenga.",
    },
    {
      q: "¿Qué aspectos específicos para PyMEs hispanohablantes cubre el servicio?",
      a: "Nuestro servicio incluye optimización para los mercados de habla hispana: SEO local para España y Latinoamérica, cumplimiento de la LOPD/RGPD, adaptación a las preferencias de consumo digital por país, integración con pasarelas de pago locales (Mercado Pago, Clip, Redsys) y optimización para los buscadores y plataformas más utilizados en cada región.",
    },
  ],
  reassurance: [
    "14 días para ver resultados — del inicio a la publicación en tan solo 2 semanas",
    "Rendimiento garantizado — reembolso completo si no se alcanza Lighthouse 85+",
    "Más de 50 empresas atendidas — manufactura, construcción, servicios profesionales, belleza, etc.",
    "Despliegue sin interrupciones — sus sistemas siguen funcionando durante todo el proceso",
  ],
  offerBadges: [
    "Resultados inmediatos",
    "Editable sin código",
    "Optimizado para móviles",
    "Multi-idioma",
    "Rendimiento garantizado",
  ],
  culturalNotes: {
    toneDescription:
      "Tratamiento formal de 'usted' en todo el informe. Lenguaje profesional pero cercano, adaptado al contexto empresarial hispanohablante. Evitar regionalismos marcados — usar español neutro internacional comprensible tanto en España como en Latinoamérica. Incluir apertura de signos de exclamación e interrogación (¡!) y acentos correctamente.",
    formalityLevel: "Tratamiento de usted (formal)",
    pronounPreference: "usted / su (formal, no tuteo)",
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   pt — Portuguese (Português - Brasil)  |  Tratamento formal
   ═══════════════════════════════════════════════════════════════════════════ */

export const PT: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "Relatório de diagnóstico executivo",
    validity: "Válido até",
    heroKicker: "Diagnóstico empresarial confidencial",
    heroLead:
      "Com base em dados públicos, sinais coletados e uma demonstração de melhoria, organizamos o primeiro passo mais claro entre receita, confiança e fluxo de consultas.",
    evidenceReady: "Dados coletados",
    sourceCoverage: "Cobertura de evidências",
    monthlyLoss: "Perda de oportunidade mensal estimada",
    confidence: "Confiabilidade dos dados",
    currentState: "Fricção atual",
    improvedState: "Estado após melhoria",
    diagnosticSurface: "Escopo do diagnóstico",
    priorityFindings: "Conclusões prioritárias",
    businessImpact: "Impacto no negócio",
    firstMove: "Primeira ação",
    whyItMatters: "Por que é importante",
    evidence: "Evidências",
    recommendation: "Ação recomendada",
    roadmap: "Roteiro de 30 dias",
    dataAppendix: "Registro de dados",
    sourceMeaning: "Significado para o negócio",
    sourceNext: "Próxima verificação",
    sourceMissing:
      "Fontes ausentes não são tratadas como fatos, mas como hipóteses para a próxima revisão.",
    templateDirection: "Direção da proposta",
    qualityBar: "Padrão de qualidade",
    finalHeading: "Em 30 minutos, defina a primeira melhoria",
    finalBody:
      "Antes de uma grande reconstrução, identifique o caminho de recuperação mais fácil entre oportunidade de receita, prova de confiança e fluxo de consultas.",
    emailSubject: "Sobre o relatório de diagnóstico",
    competitorBenchmark: "Comparativo de concorrentes e setor",
    yourSite: "Seu site",
    industryAvg: "Média do setor",
    topCompetitors: "Principais concorrentes",
    roiTitle: "Simulação de ROI projetado",
    paybackPeriod: "Prazo de retorno estimado",
    recoveredTwelveMonths: "Receita recuperada em 12 meses",
    roiLabel: "ROI projetado",
    faqTitle: "Perguntas frequentes",
    readMore: "Ler análise detalhada",
  },
  cta: [
    "Ver demonstração de melhoria",
    "Agendar consultoria gratuita",
    "Ler o diagnóstico completo",
    "Começar a melhoria agora",
  ],
  faq: [
    {
      q: "Precisamos descartar nossa hospedagem ou domínio atuais?",
      a: "Não. Construímos e testamos a camada de apresentação otimizada em um ambiente de staging e a trocamos sem nenhum tempo de inatividade após a aprovação. Sua infraestrutura atual permanece intacta — já elevamos pontuações Lighthouse de 40 para mais de 90 pontos sem modificar o backend em dezenas de projetos.",
    },
    {
      q: "A pontuação Lighthouse mobile 85+ é realmente garantida?",
      a: "Sim. Nosso pacote de otimização Astro/Next.js garante uma pontuação Lighthouse mobile mínima de 85 pontos. Se não atingirmos esse patamar, reembolsamos integralmente os honorários de otimização de desempenho. A média de entrega de todos os projetos desde 2024 é de 92 pontos.",
    },
    {
      q: "Como funciona o processo e quanto tempo leva?",
      a: "Auditoria inicial (3 dias) → Reconstrução visual em Astro/Next.js (5–7 dias) → Validação em staging (3 dias) → Publicação em produção (1 dia). O ciclo completo é concluído em apenas 2 semanas. De sua parte, são necessários apenas dois momentos: a reunião inicial e a aprovação final.",
    },
    {
      q: "Funciona com nossa agência ou equipe interna atual?",
      a: "Com certeza. Atuamos como uma camada cirúrgica de desempenho — não substituímos sua agência, CMS ou equipe de desenvolvimento. Entregamos uma camada de apresentação independente que se integra perfeitamente e fornecemos templates editáveis sem código para manutenção pela sua equipe.",
    },
    {
      q: "Quais aspectos específicos para PMEs brasileiras são considerados?",
      a: "Nosso serviço contempla as necessidades do mercado brasileiro: otimização para o Google Brasil, conformidade com a LGPD, integração com meios de pagamento locais (PIX, boleto, cartão nacional), adaptação para a realidade mobile-first do Brasil, e estratégias para marketplaces regionais. Também consideramos as particularidades fiscais e de comunicação do ambiente de negócios brasileiro.",
    },
  ],
  reassurance: [
    "14 dias para ver resultados — do início à publicação em apenas 2 semanas",
    "Desempenho garantido — reembolso total se o Lighthouse 85+ não for atingido",
    "Mais de 50 empresas atendidas — indústria, construção, serviços, beleza e outros",
    "Implantação sem interrupção — seus sistemas continuam funcionando durante todo o processo",
  ],
  offerBadges: [
    "Resultados rápidos",
    "Editável sem código",
    "Otimizado para mobile",
    "Compatível com LGPD",
    "Desempenho garantido",
  ],
  culturalNotes: {
    toneDescription:
      "Português brasileiro formal usando 'você' e tratamento respeitoso consistente. Linguagem empresarial clara e direta, evitando anglicismos desnecessários. O mercado brasileiro valoriza transparência e objetividade — usar dados concretos em vez de promessas vagas. Atenção à ortografia do Acordo Ortográfico vigente e às convenções de formatação de números e moeda brasileiras.",
    formalityLevel: "Tratamento formal com você (padrão empresarial brasileiro)",
    pronounPreference: "você / seu (formal, uso consistente de 'você' e não 'tu')",
  },
}
