import { Router, type IRouter } from "express";
import { CreateAnalysisBody, CreateAnalysisResponse } from "@workspace/api-zod";

const router: IRouter = Router();

type AnalysisInput = ReturnType<typeof CreateAnalysisBody.parse>;

const includesAny = (text: string, terms: string[]) =>
  terms.some((term) => text.includes(term));

const listFrom = (items: string[], fallback: string) =>
  items.length > 0 ? items : [fallback];

function sentenceFrom(text: string, pattern: RegExp, fallback: string) {
  const match = text.match(pattern);
  if (!match?.[1]) return fallback;
  const sentence = match[1].split(/[.!?]\s/)[0].trim();
  return sentence.length > 180 ? `${sentence.slice(0, 177)}…` : sentence;
}

function createAnalysis(input: AnalysisInput) {
  const raw = input.text.trim();
  const text = raw.toLowerCase();
  const hasAi = includesAny(text, [
    " ai ",
    "ai assistant",
    "искусствен",
    "llm",
    "gpt",
    "модель",
    "assistant",
  ]);
  const hasAuth = includesAny(text, [
    "sso",
    "okta",
    "oauth",
    "authoriz",
    "authentication",
    "role",
    "rbac",
    "авторизац",
    "роль",
  ]);
  const hasIntegration = includesAny(text, [
    "api",
    "integration",
    "vendor",
    "csv",
    "export",
    "webhook",
    "интеграц",
    "выгруз",
  ]);
  const hasMobile = includesAny(text, [
    "mobile",
    "ios",
    "android",
    "react native",
    "мобиль",
  ]);
  const hasCompliance = includesAny(text, [
    "hipaa",
    "gdpr",
    "compliance",
    "audit",
    "security",
    "private",
    "personal data",
    "персональн",
    "безопас",
    "соответств",
  ]);
  const hasRealtime = includesAny(text, [
    "real-time",
    "realtime",
    "real time",
    "websocket",
    "streaming",
    "в реальном времени",
  ]);
  const hasDocuments = includesAny(text, [
    "document",
    "pdf",
    "ocr",
    "file",
    "csv",
    "документ",
    "файл",
  ]);
  const hasPayments = includesAny(text, [
    "payment",
    "billing",
    "subscription",
    "stripe",
    "платеж",
    "оплат",
  ]);

  const signals = [
    hasAi,
    hasAuth,
    hasIntegration,
    hasMobile,
    hasCompliance,
    hasRealtime,
    hasDocuments,
    hasPayments,
  ].filter(Boolean).length;

  const complexity =
    signals >= 6
      ? "Очень высокая"
      : signals >= 4
        ? "Высокая"
        : signals >= 2
          ? "Средняя"
          : "Низкая";
  const confidence = raw.length > 1100 ? "Высокая" : raw.length > 500 ? "Средняя" : "Низкая";
  const projectName =
    input.projectName?.trim() ||
    sentenceFrom(raw, /(?:need|build|create|нужен|нужно|сделать)\s+(.+)/i, "Untitled negotiation");
  const clientWants = sentenceFrom(
    raw,
    /(?:client|заказчик)\s*:\s*(.+)/i,
    "The transcript describes a product request, but the desired outcome needs to be made explicit.",
  );
  const productToBuild = sentenceFrom(
    raw,
    /(?:need|build|create|develop|нужен|нужно|разработать)\s+(.+)/i,
    "A product is implied by the conversation, but the first release boundary is not fully defined.",
  );

  const included = [
    "Clarified product scope from the transcript",
    "Commercial range rather than a false single-point quote",
    "Delivery path with decision checkpoints",
  ];
  if (hasAi) included.push("AI capability assessment and cost-control considerations");
  if (hasIntegration) included.push("Integration and data-dependency review");

  const costDrivers = listFrom(
    [
      hasIntegration ? "External data sources, API readiness, and vendor coordination" : "",
      hasAi ? "Model selection, evaluation, guardrails, and usage cost" : "",
      hasAuth ? "Identity, roles, access rules, and auditability" : "",
      hasCompliance ? "Security evidence, retention policy, and compliance review" : "",
      hasMobile ? "Additional mobile surfaces and release workflows" : "",
      hasRealtime ? "Low-latency infrastructure and streaming behavior" : "",
      hasDocuments ? "Data quality, parsing, and background processing" : "",
    ].filter(Boolean),
    "Unconfirmed scope and missing acceptance criteria",
  );

  const range =
    signals >= 6
      ? "900 000–1 500 000 ₽"
      : signals >= 4
        ? "550 000–950 000 ₽"
        : signals >= 2
          ? "300 000–550 000 ₽"
          : "180 000–320 000 ₽";
  const weeks =
    signals >= 6
      ? "16–24 недели"
      : signals >= 4
        ? "10–16 недель"
        : signals >= 2
          ? "6–10 недель"
          : "4–6 недель";

  const risks = [
    {
      risk: hasIntegration
        ? "External data source readiness can block the critical path"
        : "The first-release boundary is not explicit",
      why: hasIntegration
        ? "The transcript mentions vendors, APIs, exports, or integrations without confirming access, schemas, ownership, or test data."
        : "The conversation describes intent, but not the acceptance criteria that separate MVP from the full product.",
      impact: "Высокое",
    },
    ...(hasAi
      ? [
          {
            risk: "AI quality and operating cost are not yet measurable",
            why: "The AI capability is named, but target accuracy, evaluation data, failure handling, and usage limits are not defined.",
            impact: "Высокое",
          },
        ]
      : []),
    ...(hasCompliance
      ? [
          {
            risk: "Security or compliance review may move the launch date",
            why: "The transcript raises sensitive data or compliance expectations without a confirmed control set, retention policy, or evidence owner.",
            impact: "Высокое",
          },
        ]
      : []),
    ...(hasMobile
      ? [
          {
            risk: "Mobile scope may be underestimated",
            why: "Supporting multiple platforms adds release, device testing, and store-readiness work beyond the shared product logic.",
            impact: "Среднее",
          },
        ]
      : []),
  ].slice(0, 4);

  const unknowns = [
    { parameter: "Number of users, roles, and expected load", impact: "Высокое" },
    ...(hasIntegration
      ? [{ parameter: "API availability, data volume, and source quality", impact: "Высокое" }]
      : []),
    ...(hasAi
      ? [{ parameter: "Required AI accuracy, evaluation set, and model/provider constraints", impact: "Высокое" }]
      : []),
    { parameter: "MVP boundary and acceptance criteria", impact: "Высокое" },
    ...(hasCompliance
      ? [{ parameter: "Security, data retention, and compliance evidence requirements", impact: "Высокое" }]
      : []),
  ].slice(0, 5);

  const questions = [
    {
      question: "What is the smallest release that creates value, and what is explicitly out of scope?",
      whyImportant: "This is the biggest lever on price, timeline, and team shape.",
    },
    {
      question: "How many users, roles, and organizations should the first release support?",
      whyImportant: "Load, permissions, tenancy, and operational requirements depend on this answer.",
    },
    ...(hasIntegration
      ? [
          {
            question: "Which systems are available through a documented API, and who owns access and test data?",
            whyImportant: "An unavailable or unstable source can turn a short integration into a schedule risk.",
          },
        ]
      : []),
    ...(hasAi
      ? [
          {
            question: "How will AI quality be measured, and what is the acceptable failure mode?",
            whyImportant: "Without an evaluation target, model choice and the commercial estimate remain speculative.",
          },
        ]
      : []),
    ...(hasCompliance
      ? [
          {
            question: "What security, retention, and compliance evidence is required before launch?",
            whyImportant: "The answer can change architecture, hosting, logging, and the release sequence.",
          },
        ]
      : []),
    {
      question: "Who signs off on the product, technical, and security acceptance criteria?",
      whyImportant: "A clear decision owner prevents late-stage scope changes and approval delays.",
    },
  ].slice(0, 6);

  const aiTechnologies = [
    {
      technology: "LLM",
      status: hasAi ? "Нужна" : "Возможно потребуется",
      purpose: hasAi
        ? "Likely needed for the named assistant or language understanding; exact model and guardrails remain open."
        : "Not evidenced as a requirement yet; confirm whether the product needs generative behavior.",
    },
    {
      technology: "RAG / embeddings",
      status: hasAi && hasDocuments ? "Возможно потребуется" : "Не нужна",
      purpose: hasAi && hasDocuments
        ? "May be needed if the assistant must ground answers in client documents or records."
        : "No evidence in the transcript that retrieval over a knowledge base is required.",
    },
    {
      technology: "Document processing",
      status: hasDocuments ? "Нужна" : "Не нужна",
      purpose: hasDocuments
        ? "Data extraction, validation, and background processing may be needed for the mentioned files or exports."
        : "No document-processing requirement is visible in the conversation.",
    },
    {
      technology: "Real-time AI",
      status: hasRealtime ? "Нужна" : "Не нужна",
      purpose: hasRealtime
        ? "The real-time expectation implies streaming and low-latency architecture."
        : "No real-time requirement is stated.",
    },
  ];

  const result = {
    id: `NA-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    project: {
      name: projectName,
      clientWants,
      productToBuild,
      type: hasAi ? "AI-enabled digital product" : "Digital product / custom software",
    },
    complexity: {
      level: complexity,
      confidence,
      reason: `${signals} scope signals were found across the conversation. The estimate is ${confidence.toLowerCase()} confidence because requirements are separated into evidence and open questions rather than filled in automatically.`,
    },
    pricing: {
      estimate: range,
      evaluationType: "Предварительная",
      included,
      costDrivers,
    },
    timeline: {
      estimate: weeks,
      format: "Полноценная версия",
      factors: listFrom(
        [
          hasIntegration ? "Client and vendor access to systems, schemas, and test data" : "",
          hasAi ? "AI evaluation, guardrails, and prompt/model iteration" : "",
          hasCompliance ? "Security review and compliance evidence" : "",
          hasMobile ? "Cross-platform testing and store release readiness" : "",
        ].filter(Boolean),
        "Scope clarification and timely client feedback",
      ),
    },
    stages: [
      { name: "Discovery & boundary", work: "Turn the conversation into a signed MVP boundary, assumptions, and acceptance criteria.", duration: "1–2 weeks" },
      { name: "Core product", work: "Build the primary user journeys, data model, permissions, and observable service layer.", duration: "4–7 weeks" },
      { name: "AI & integrations", work: "Connect confirmed sources, implement the AI path if required, and validate real examples.", duration: "2–5 weeks" },
      { name: "Hardening & launch", work: "Test edge cases, close security gaps, document operations, and prepare release.", duration: "2–4 weeks" },
    ],
    risks,
    devTools: [
      { tool: "Replit", purpose: "Rapid product loop", why: "Useful for validating the first release quickly while the scope and client feedback are still moving." },
      { tool: "Claude Code", purpose: "Repository-scale implementation", why: "Well suited to tracing cross-cutting backend, integration, and test changes once the boundary is agreed." },
      { tool: "Cursor", purpose: "Focused frontend refinement", why: "Helpful for fast UI iteration and local refactors without losing the product context." },
    ],
    aiTechnologies,
    questions,
    unknowns,
    summary: {
      project: projectName,
      cost: range,
      timeline: weeks,
      complexity,
      mainRisk: risks[0]?.risk ?? "The first-release boundary is not explicit",
      mainUnknown: unknowns[0]?.parameter ?? "MVP boundary and acceptance criteria",
      firstQuestion: questions[0]?.question ?? "What is the smallest release that creates value?",
    },
  };

  return CreateAnalysisResponse.parse(result);
}

router.post("/analyze", async (req, res): Promise<void> => {
  const parsed = CreateAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.flatten() }, "Invalid analysis request");
    res.status(400).json({ error: "Add at least 80 characters of negotiation text." });
    return;
  }

  req.log.info({ chars: parsed.data.text.length }, "Creating negotiation analysis");
  res.json(createAnalysis(parsed.data));
});

export default router;