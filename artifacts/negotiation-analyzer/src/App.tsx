import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  BrainCircuit,
  BookOpen,
  Check,
  ChevronDown,
  Clipboard,
  Clock3,
  Code2,
  FileQuestion,
  FileText,
  Gauge,
  Layers3,
  Loader2,
  Menu,
  MessageSquareQuote,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Radar,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Timer,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCreateAnalysis, useHealthCheck } from '@workspace/api-client-react';
import type { Analysis, AnalysisInput } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Form } from '@/components/ui/form';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

const SAMPLE_TEXT = `Клиент: Нам нужен личный кабинет для региональной медицинской сети. Пациенты должны записываться на приём, видеть результаты анализов и переписываться с лечащей командой. Первый релиз хотелось бы получить примерно за двенадцать недель.

Архитектор: В каких системах сейчас хранятся данные о записи, пользователях и лабораторных результатах?
Разработчик: У поставщика расписания есть API, а лаборатория предоставляет только ночные выгрузки CSV. Понадобятся SSO через Okta и ролевой доступ для пациентов, медсестёр и врачей.

Клиент: Мы также хотим AI-ассистента, который поможет пациентам найти нужное отделение и кратко изложит историю обращений. Он должен быть безопасным, конфиденциальным и работать на русском и английском языках. Провайдера модели мы ещё не выбрали.

Архитектор: Чтобы уложиться в двенадцать недель, первый релиз должен включать ассистента, сообщения и обе мобильные платформы?
Клиент: В идеале да. Бюджет согласован примерно на 85 000 долларов, но итоговая сумма зависит от вашей рекомендации. До запуска службе комплаенса понадобятся подтверждения соответствия HIPAA, а юристы ещё проверяют правила хранения данных.

Разработчик: Для клиентской части можно использовать React Native, а для сервисного слоя — TypeScript. Понадобится время с лабораторией для проверки формата выгрузки и со службой безопасности для определения аудита действий.`;

type SectionKey = 'overview' | 'commercial' | 'delivery' | 'risk' | 'ai' | 'questions';
type NavigationKey = SectionKey | 'documentation';

const sections: Array<{ id: SectionKey; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: 'Итог для руководителя', icon: Radar },
  { id: 'commercial', label: 'Коммерческая оценка', icon: Target },
  { id: 'delivery', label: 'План реализации', icon: Layers3 },
  { id: 'risk', label: 'Риски и неизвестные', icon: ShieldAlert },
  { id: 'ai', label: 'AI и инструменты', icon: BrainCircuit },
  { id: 'questions', label: 'Вопросы клиенту', icon: MessageSquareQuote },
];

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return 'Только что';
  }
}

function getComplexityTone(level: string) {
  const normalized = level.toLowerCase();
  if (normalized.includes('very') || normalized.includes('high') || normalized.includes('выс')) {
    return 'bg-[#f7dfd8] text-[#a64735] border-[#edc2b6]';
  }
  if (normalized.includes('medium') || normalized.includes('сред')) {
    return 'bg-[#f6ecd0] text-[#9a6b20] border-[#ecdba9]';
  }
  return 'bg-[#dceee9] text-[#286b64] border-[#b9ddd5]';
}

function getImpactTone(impact: string) {
  const normalized = impact.toLowerCase();
  if (normalized.includes('high') || normalized.includes('выс')) {
    return 'bg-[#f7dfd8] text-[#a64735]';
  }
  if (normalized.includes('medium') || normalized.includes('сред')) {
    return 'bg-[#f6ecd0] text-[#9a6b20]';
  }
  return 'bg-[#dceee9] text-[#286b64]';
}

function AppShell({ children }: { children: ReactNode }) {
  return <div className="grain min-h-[100dvh] bg-background text-foreground">{children}</div>;
}

function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
      <div className="relative grid size-9 place-items-center rounded-[11px] bg-[#eea346] text-[#172033]">
        <Network size={19} strokeWidth={2.5} />
        <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[#8bd1c1] ring-2 ring-[#172033]" />
      </div>
      {!collapsed && <div>
        <div className="text-[13px] font-extrabold tracking-[-0.03em] text-[#f4f0e7]">Negotiation</div>
        <div className="mono text-[10px] tracking-[0.12em] text-[#aab2bf]">ANALYZER</div>
      </div>}
    </div>
  );
}

function WorkspaceSidebar({
  activeSection,
  onSectionChange,
  onNew,
  onDocumentation,
  collapsed,
  onToggleCollapse,
  mobileOpen,
}: {
  activeSection: NavigationKey;
  onSectionChange: (section: SectionKey) => void;
  onNew: () => void;
  onDocumentation: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
}) {
  return (
    <aside className={`${mobileOpen ? 'flex' : 'hidden'} w-full shrink-0 flex-col bg-[#172033] px-4 py-5 text-[#f4f0e7] transition-[width] duration-200 md:fixed md:inset-y-0 md:flex ${collapsed ? 'md:w-[76px]' : 'md:w-[232px]'}`}>
      <div className={collapsed ? 'px-0' : 'px-2'}>
        <BrandMark collapsed={collapsed} />
      </div>
      <button
        type="button"
        onClick={onNew}
        data-testid="button-new-analysis"
        title={collapsed ? 'Новый анализ' : undefined}
        className={`mt-9 flex w-full items-center rounded-xl border border-[#38445b] bg-[#222e44] py-3 text-left text-[12px] font-bold transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#2b3952] active:translate-y-0 ${collapsed ? 'justify-center px-0' : 'justify-between px-3.5'}`}
      >
        <span className="flex items-center gap-2.5"><Plus size={16} className="text-[#eea346]" />{!collapsed && 'Новый анализ'}</span>
        {!collapsed && <span className="mono text-[9px] text-[#8792a6]">N</span>}
      </button>
      <div className="mt-9">
        {!collapsed && <div className="eyebrow px-3 text-[#718097]">Рабочая область</div>}
        <nav className="mt-3 space-y-1">
          {sections.map((section, index) => {
            const Icon = section.icon;
            const active = activeSection === section.id;
            return (
              <button
                type="button"
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                data-testid={`button-section-${section.id}`}
                title={collapsed ? section.label : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg py-2.5 text-left text-[11px] font-semibold transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'} ${active ? 'bg-[#eea346] text-[#172033]' : 'text-[#acb5c5] hover:bg-[#222e44] hover:text-[#f4f0e7]'}`}
              >
                <Icon size={15} strokeWidth={active ? 2.4 : 1.8} />
                {!collapsed && <span>{section.label}</span>}
                {!collapsed && <span className={`mono ml-auto text-[9px] ${active ? 'text-[#172033]/60' : 'text-[#66748b]'}`}>{String(index + 1).padStart(2, '0')}</span>}
              </button>
            );
          })}
        </nav>
      </div>
      <button
        type="button"
        onClick={onDocumentation}
        data-testid="button-documentation"
        title={collapsed ? 'Документация' : undefined}
        className={`mt-5 flex w-full items-center gap-3 rounded-lg py-2.5 text-left text-[11px] font-semibold transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'} ${activeSection === 'documentation' ? 'bg-[#eea346] text-[#172033]' : 'text-[#acb5c5] hover:bg-[#222e44] hover:text-[#f4f0e7]'}`}
      >
        <BookOpen size={15} />
        {!collapsed && <span>Документация</span>}
      </button>
      {!collapsed && <div className="mt-auto hidden rounded-xl border border-[#344057] bg-[#1d2940] p-3.5 md:block">
        <div className="flex items-center gap-2 text-[11px] font-bold text-[#dce5ef]">
          <div className="grid size-6 place-items-center rounded-md bg-[#2e7c72] text-[#bfe8dd]"><Gauge size={13} /></div>
          Фокус решения
        </div>
          <p className="mt-2 text-[10px] leading-[1.55] text-[#94a2b6]">Превращаем неопределённость в следующий аргументированный разговор.</p>
        </div>}
      <div className={`mt-5 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-2 text-[10px] text-[#7f8ca1]`}>
        {!collapsed && <span className="mono">v0.9.4</span>}
        {!collapsed && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#8bd1c1]" /> Приватное пространство</span>}
        <button type="button" onClick={onToggleCollapse} data-testid="button-toggle-sidebar" title={collapsed ? 'Раскрыть навигацию' : 'Скрыть навигацию'} aria-label={collapsed ? 'Раскрыть навигацию' : 'Скрыть навигацию'} aria-expanded={!collapsed} className="rounded-md px-2 py-1 text-[9px] text-[#b6c0ce] hover:bg-[#2b3952] hover:text-white">
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>
    </aside>
  );
}

function EmptyState({ onSample, onFocus }: { onSample: () => void; onFocus: () => void }) {
  return (
    <div className="animate-rise flex min-h-[560px] flex-col justify-between overflow-hidden rounded-2xl border border-[#dedbd1] bg-[#f9f7f1] p-7 md:p-9">
      <div>
        <div className="flex items-center justify-between">
          <span className="eyebrow text-[#7a817e]">Результат оценки</span>
          <span className="mono rounded-full border border-[#d8d8ce] px-2.5 py-1 text-[9px] text-[#878c87]">ОЖИДАЕТ ВВОД</span>
        </div>
        <div className="mt-20 max-w-[390px]">
          <div className="relative mb-7 grid size-16 place-items-center rounded-[20px] bg-[#172033] text-[#eea346]">
            <Radar size={29} strokeWidth={1.5} />
            <span className="absolute -bottom-1.5 -right-1.5 grid size-6 place-items-center rounded-lg bg-[#8bd1c1] text-[#172033]"><Search size={13} /></span>
          </div>
           <h2 className="text-[30px] font-extrabold leading-[1.05] tracking-[-0.055em] text-[#20283a]">Найдите суть<br />внутри разговора.</h2>
           <p className="mt-5 text-[13px] leading-[1.7] text-[#687178]">Вставьте расшифровку переговоров и получите оценку продукта, стоимости, сроков, скрытого объёма работ и вопросов для следующего шага.</p>
        </div>
      </div>
      <div className="mt-12 border-t border-[#dedbd1] pt-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] text-[#858a85]">
           <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#eea346]" /> 10 направлений оценки</span>
           <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#4b9b90]" /> Для пресейла</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-2.5">
           <button type="button" onClick={onSample} data-testid="button-empty-sample" className="flex items-center gap-2 rounded-lg bg-[#172033] px-4 py-2.5 text-[11px] font-bold text-[#f4f0e7] transition-transform hover:-translate-y-0.5"><Sparkles size={14} className="text-[#eea346]" /> Загрузить пример</button>
           <button type="button" onClick={onFocus} data-testid="button-empty-focus" className="flex items-center gap-2 rounded-lg border border-[#d6d4cb] px-4 py-2.5 text-[11px] font-bold text-[#4e5658] hover:bg-[#efede7]"><ArrowRight size={14} /> Ввести расшифровку</button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="animate-fade min-h-[560px] rounded-2xl border border-[#dedbd1] bg-[#f9f7f1] p-7 md:p-9">
       <div className="flex items-center justify-between">
         <span className="eyebrow text-[#7a817e]">Результат оценки</span>
         <span className="flex items-center gap-2 mono text-[9px] text-[#a46c26]"><span className="size-1.5 animate-pulse-soft rounded-full bg-[#eea346]" /> АНАЛИЗИРУЕМ ТЕКСТ</span>
      </div>
      <div className="mt-14 flex items-center gap-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-[#172033] text-[#eea346]"><Loader2 size={24} className="animate-spin" /></div>
         <div><div className="text-[18px] font-extrabold tracking-[-.04em] text-[#20283a]">Читаем между строк.</div><div className="mt-1 text-[11px] text-[#7f8584]">Выделяем обязательства, ограничения и пробелы</div></div>
      </div>
      <div className="mt-12 space-y-7">
           {[['Сигнал объёма', 'Выделяем, чего на самом деле хочет клиент'], ['Коммерческий сигнал', 'Отделяем заявленный ориентир от вероятного диапазона'], ['Сигнал решения', 'Находим риски и первый вопрос для следующего разговора']].map(([label, copy]) => (
          <div key={label} className="flex items-center gap-4">
            <div className="size-2 rounded-full bg-[#8bd1c1]" />
            <div className="flex-1">
               <div className="flex justify-between text-[10px] font-bold text-[#4f585d]"><span>{label}</span><span className="mono text-[#a8aaa4]">В РАБОТЕ</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8e5da]"><div className="h-full w-2/3 animate-pulse-soft rounded-full bg-[#8bd1c1]" /></div>
              <p className="mt-2 text-[10px] text-[#929590]">{copy}</p>
            </div>
          </div>
        ))}
      </div>
       <div className="mt-16 border-t border-[#dedbd1] pt-5 text-[10px] text-[#8b908a]">Обычно это занимает несколько секунд. Не закрывайте расшифровку во время анализа.</div>
    </div>
  );
}

function SummaryBand({ analysis }: { analysis: Analysis }) {
  const complexity = analysis.complexity.level;
  return (
    <section id="overview" data-testid="section-executive-readout" className="animate-rise overflow-hidden rounded-2xl border border-[#d7d8cd] bg-[#172033] text-[#f4f0e7] panel-shadow">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#364259] px-6 py-4 md:px-7">
         <div className="flex items-center gap-2.5"><span className="grid size-6 place-items-center rounded-md bg-[#eea346] text-[#172033]"><Check size={14} strokeWidth={3} /></span><span className="eyebrow text-[#b7c0cb]">Итог для руководителя</span></div>
         <span className="mono text-[9px] text-[#8995a8]">{formatDate(analysis.createdAt)} <span className="mx-1.5 text-[#536078]">/</span> ID {analysis.id.slice(0, 8).toUpperCase()}</span>
      </div>
      <div className="grid gap-8 p-6 md:grid-cols-[1fr_270px] md:p-7">
        <div>
           <div className="eyebrow text-[#eea346]">РЕШЕНИЕ: ДА / НЕТ</div>
          <h2 data-testid="text-summary-project" className="mt-3 max-w-[590px] text-[27px] font-extrabold leading-[1.08] tracking-[-.055em] md:text-[34px]">{analysis.summary.project || analysis.project.name}</h2>
          <p className="mt-4 max-w-[610px] text-[12px] leading-[1.75] text-[#b9c2cd]">{analysis.project.clientWants}</p>
          <div className="mt-7 grid gap-2.5 sm:grid-cols-3">
            {([
               ['Стоимость', analysis.summary.cost, Target],
               ['Сроки', analysis.summary.timeline, Clock3],
               ['Сложность', analysis.summary.complexity || complexity, Gauge],
            ] as [string, string, LucideIcon][]).map(([label, value, Icon]) => (
              <div key={String(label)} className="rounded-xl border border-[#3a465d] bg-[#202d43] p-3.5">
                <Icon size={15} className="text-[#8bd1c1]" />
                <div className="mt-3 text-[10px] text-[#91a0b2]">{label}</div>
                <div data-testid={`text-summary-${String(label).toLowerCase().replace(' ', '-')}`} className="mt-1 text-[12px] font-bold leading-[1.35] text-[#f4f0e7]">{value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex flex-col justify-between border-t border-[#364259] pt-6 md:border-l md:border-t-0 md:pl-7 md:pt-0">
          <div>
             <div className="eyebrow text-[#8995a8]">Главный вывод</div>
            <div data-testid="text-summary-main-risk" className="mt-3 text-[14px] font-bold leading-[1.4] text-[#f4f0e7]">{analysis.summary.mainRisk}</div>
          </div>
          <div className="mt-7 border-l-2 border-[#eea346] pl-3.5">
             <div className="eyebrow text-[#eea346]">Спросите сначала</div>
            <div data-testid="text-summary-first-question" className="mt-2 text-[12px] font-semibold leading-[1.55] text-[#e8edf0]">{analysis.summary.firstQuestion}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PanelHeader({ icon: Icon, index, title, caption }: { icon: LucideIcon; index: string; title: string; caption: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#e3e0d7] pb-4">
       <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-8 place-items-center rounded-lg bg-[#e4f0eb] text-[#2d7770]"><Icon size={16} /></div>
        <div><h3 className="text-[14px] font-extrabold tracking-[-.03em] text-[#242d3e]">{title}</h3><p className="mt-1 text-[10px] text-[#898e89]">{caption}</p></div>
      </div>
      <span className="mono text-[10px] text-[#b2b2aa]">{index}</span>
    </div>
  );
}

function DetailPanels({ analysis }: { analysis: Analysis }) {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <section id="commercial" data-testid="section-commercial" className="rounded-2xl border border-[#dedbd1] bg-[#f9f7f1] p-6 panel-shadow">
         <PanelHeader icon={Target} index="02" title="Коммерческая оценка" caption="Что можно обоснованно оценить уже сейчас" />
        <div className="mt-5 rounded-xl bg-[#f0e4c9] p-4">
           <div className="eyebrow text-[#99702e]">Рабочая оценка</div>
          <div data-testid="text-pricing-estimate" className="mt-1 text-[25px] font-extrabold tracking-[-.055em] text-[#4b3b24]">{analysis.pricing.estimate}</div>
           <div className="mt-1 text-[10px] text-[#876b3d]">Формат оценки: {analysis.pricing.evaluationType}</div>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
           <ListBlock title="Входит в оценку" items={analysis.pricing.included} accent="teal" />
           <ListBlock title="Факторы стоимости" items={analysis.pricing.costDrivers} accent="amber" />
        </div>
      </section>

      <section id="delivery" data-testid="section-delivery" className="rounded-2xl border border-[#dedbd1] bg-[#f9f7f1] p-6 panel-shadow">
         <PanelHeader icon={Timer} index="03" title="План реализации" caption="Путь от первых договорённостей до релиза" />
        <div className="mt-5 flex items-end justify-between gap-3 border-b border-[#e3e0d7] pb-5">
           <div><div className="eyebrow text-[#7a817e]">До первого релиза</div><div data-testid="text-timeline-estimate" className="mt-1 text-[25px] font-extrabold tracking-[-.055em] text-[#242d3e]">{analysis.timeline.estimate}</div></div>
          <span className="rounded-full bg-[#dceee9] px-2.5 py-1.5 text-[10px] font-bold text-[#286b64]">{analysis.timeline.format}</span>
        </div>
        <div className="mt-5 space-y-3">
          {analysis.stages.map((stage, index) => (
            <div key={`${stage.name}-${index}`} data-testid={`row-stage-${index}`} className="group grid grid-cols-[30px_1fr_auto] gap-3">
              <div className="relative flex justify-center"><span className="z-10 grid size-6 place-items-center rounded-full border border-[#b8d8cf] bg-[#edf6f2] mono text-[9px] font-bold text-[#34776e]">{String(index + 1).padStart(2, '0')}</span>{index < analysis.stages.length - 1 && <span className="absolute top-6 h-full w-px bg-[#d7e2dc]" />}</div>
              <div className="pb-3"><div className="text-[11px] font-bold text-[#3a4247]">{stage.name}</div><div className="mt-1 text-[10px] leading-[1.5] text-[#858b87]">{stage.work}</div></div>
              <div className="mono pt-1 text-[9px] text-[#a17a3e]">{stage.duration}</div>
            </div>
          ))}
        </div>
         <ListBlock title="Факторы сроков" items={analysis.timeline.factors} accent="teal" />
      </section>

      <section id="risk" data-testid="section-risk" className="rounded-2xl border border-[#dedbd1] bg-[#f9f7f1] p-6 panel-shadow">
         <PanelHeader icon={ShieldAlert} index="04" title="Риски и неизвестные" caption="Что может изменить сделку или сроки реализации" />
        <div className="mt-5 space-y-3">
          {analysis.risks.map((risk, index) => (
            <div key={`${risk.risk}-${index}`} data-testid={`card-risk-${index}`} className="rounded-xl border border-[#e5e1d7] bg-[#f5f2ea] p-3.5">
              <div className="flex items-start justify-between gap-3"><div className="text-[11px] font-bold leading-[1.4] text-[#343c46]">{risk.risk}</div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${getImpactTone(risk.impact)}`}>{risk.impact}</span></div>
              <p className="mt-2 text-[10px] leading-[1.55] text-[#858b87]">{risk.why}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-[#e3e0d7] pt-4">
           <div className="eyebrow text-[#8d7361]">Критические неизвестные</div>
          <div className="mt-3 grid gap-2">
             {analysis.unknowns.map((unknown, index) => <div key={`${unknown.parameter}-${index}`} data-testid={`row-unknown-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-[#eeeae0] px-3 py-2.5"><span className="text-[10px] font-semibold text-[#555d5f]">{unknown.parameter}</span><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${getImpactTone(unknown.impact)}`}>{unknown.impact} влияние</span></div>)}
          </div>
        </div>
      </section>

      <section id="ai" data-testid="section-ai" className="rounded-2xl border border-[#dedbd1] bg-[#f9f7f1] p-6 panel-shadow">
         <PanelHeader icon={BrainCircuit} index="05" title="AI и инструменты" caption="Технологические предположения, скрытые в запросе" />
        <div className="mt-5 space-y-2">
          {analysis.aiTechnologies.map((item, index) => (
            <div key={`${item.technology}-${index}`} data-testid={`row-ai-${index}`} className="flex items-start gap-3 rounded-xl border border-[#e4e1d8] px-3.5 py-3">
              <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-[#e4f0eb] text-[#2d7770]"><Sparkles size={13} /></div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-bold text-[#343c46]">{item.technology}</span><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${item.status.toLowerCase().includes('not') || item.status.toLowerCase().includes('не') ? 'bg-[#ece9e1] text-[#777c78]' : 'bg-[#dceee9] text-[#286b64]'}`}>{item.status}</span></div><p className="mt-1 text-[10px] leading-[1.5] text-[#858b87]">{item.purpose}</p></div>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-[#e3e0d7] pt-4">
           <div className="eyebrow text-[#7a817e]">Инструменты разработки</div>
          <div className="mt-3 space-y-2">
            {analysis.devTools.map((tool, index) => <div key={`${tool.tool}-${index}`} data-testid={`row-tool-${index}`} className="flex items-start gap-3"><Code2 size={14} className="mt-0.5 shrink-0 text-[#a17a3e]" /><div><div className="text-[10px] font-bold text-[#4e5658]">{tool.tool} <span className="font-normal text-[#9b9e98]">/ {tool.purpose}</span></div><div className="mt-0.5 text-[10px] leading-[1.45] text-[#8a8f8a]">{tool.why}</div></div></div>)}
          </div>
        </div>
      </section>

      <section id="questions" data-testid="section-questions" className="rounded-2xl border border-[#dedbd1] bg-[#f9f7f1] p-6 panel-shadow lg:col-span-2">
         <PanelHeader icon={MessageSquareQuote} index="06" title="Вопросы клиенту" caption="Превращаем неопределённость в следующий разговор" />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {analysis.questions.map((item, index) => (
            <div key={`${item.question}-${index}`} data-testid={`card-question-${index}`} className="group rounded-xl border border-[#e4e1d8] bg-[#f5f2ea] p-4 transition-transform duration-200 hover:-translate-y-0.5">
              <div className="flex gap-3"><span className="mono text-[10px] text-[#b27a31]">Q{String(index + 1).padStart(2, '0')}</span><div><div className="text-[12px] font-bold leading-[1.45] text-[#343c46]">{item.question}</div><p className="mt-2 text-[10px] leading-[1.6] text-[#858b87]">{item.whyImportant}</p></div></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ListBlock({ title, items, accent }: { title: string; items: string[]; accent: 'teal' | 'amber' }) {
  return (
    <div>
      <div className="eyebrow text-[#858b87]">{title}</div>
      <ul className="mt-3 space-y-2.5">
        {items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2 text-[10px] leading-[1.55] text-[#687178]"><span className={`mt-[5px] size-1.5 shrink-0 rounded-full ${accent === 'teal' ? 'bg-[#4b9b90]' : 'bg-[#d3943f]'}`} />{item}</li>)}
      </ul>
    </div>
  );
}

function InputPanel({
  form,
  onSubmit,
  onSample,
  onClear,
  isPending,
}: {
  form: ReturnType<typeof useForm<AnalysisInput>>;
  onSubmit: (data: AnalysisInput) => void;
  onSample: () => void;
  onClear: () => void;
  isPending: boolean;
}) {
  const text = form.watch('text') || '';
  const projectName = form.watch('projectName') || '';
  const ready = text.trim().length >= 80;
  return (
    <section className="rounded-2xl border border-[#d7d8cd] bg-[#f9f7f1] p-6 panel-shadow md:p-7">
      <div className="flex items-start justify-between gap-3">
         <div><div className="eyebrow text-[#a46c26]">01 / Исходный разговор</div><h1 className="mt-2 text-[22px] font-extrabold tracking-[-.05em] text-[#20283a]">Дайте нам необработанную версию.</h1><p className="mt-2 max-w-[450px] text-[11px] leading-[1.6] text-[#7e8582]">Вставьте заметки звонка, переписку или расшифровку. Мы отделим сказанное от предположений.</p></div>
        <div className="hidden size-9 place-items-center rounded-xl bg-[#eee9da] text-[#a46c26] sm:grid"><FileText size={18} /></div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-7">
           <label htmlFor="projectName" className="eyebrow text-[#7a817e]">Название проекта <span className="normal-case tracking-normal text-[#a9aca6]">(необязательно)</span></label>
           <input id="projectName" {...form.register('projectName')} data-testid="input-project-name" placeholder="например, личный кабинет пациента" className="mt-2 w-full rounded-lg border border-[#d8d7cd] bg-[#f4f1e9] px-3.5 py-3 text-[11px] text-[#3d464b] outline-none transition-colors placeholder:text-[#adafa9] focus:border-[#b58a4b] focus:ring-2 focus:ring-[#eea346]/20" />
           <div className="mt-5 flex items-center justify-between"><label htmlFor="transcript" className="eyebrow text-[#7a817e]">Расшифровка переговоров</label><span className={`mono text-[9px] ${ready ? 'text-[#368176]' : 'text-[#9b9f99]'}`}>{text.length.toLocaleString('ru-RU')} симв.</span></div>
           <textarea id="transcript" {...form.register('text')} data-testid="input-transcript" placeholder="Вставьте сюда текст разговора..." className="mt-2 min-h-[270px] w-full resize-y rounded-xl border border-[#d8d7cd] bg-[#f4f1e9] px-4 py-3.5 text-[12px] leading-[1.65] text-[#3d464b] outline-none transition-colors placeholder:text-[#adafa9] focus:border-[#b58a4b] focus:ring-2 focus:ring-[#eea346]/20" />
           <div className="mt-2 flex items-center gap-2 text-[10px] text-[#939791]"><FileQuestion size={13} /> Для полезной оценки нужно минимум 80 символов.</div>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
             <button type="submit" disabled={!ready || isPending} data-testid="button-analyze" className="group flex items-center gap-2 rounded-lg bg-[#172033] px-4 py-3 text-[11px] font-bold text-[#f4f0e7] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#222e44] disabled:cursor-not-allowed disabled:opacity-40"><span>{isPending ? 'Анализируем' : 'Запустить анализ'}</span>{isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />}</button>
             <button type="button" onClick={onSample} data-testid="button-load-sample" className="flex items-center gap-2 rounded-lg border border-[#d6d4cb] px-3.5 py-3 text-[11px] font-bold text-[#5c6464] hover:bg-[#efede7]"><Sparkles size={14} className="text-[#b17832]" /> Загрузить пример</button>
             {(text || projectName) && <button type="button" onClick={onClear} data-testid="button-clear-input" className="ml-auto grid size-10 place-items-center rounded-lg text-[#979b95] hover:bg-[#efede7] hover:text-[#a64735]" aria-label="Очистить расшифровку"><X size={15} /></button>}
          </div>
        </form>
      </Form>
    </section>
  );
}

function Home() {
  const form = useForm<AnalysisInput>({ defaultValues: { text: '', projectName: '' } });
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const analysisMutation = useCreateAnalysis();
  const health = useHealthCheck();
  const [, setLocation] = useLocation();
  const text = form.watch('text') || '';

  const healthLabel = useMemo(() => {
    if (health.isLoading) return 'Проверяем сервис';
    if (health.isError) return 'Сервис недоступен';
    return health.data?.status ? 'API работает' : 'Готов к анализу';
  }, [health.data?.status, health.isError, health.isLoading]);

  const submit = (data: AnalysisInput) => {
    analysisMutation.mutate({ data: { text: data.text.trim(), projectName: data.projectName?.trim() || undefined } }, {
      onSuccess: (result) => {
        setAnalysis(result);
        setActiveSection('overview');
        window.requestAnimationFrame(() => document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      },
    });
  };

  const loadSample = () => {
    form.setValue('projectName', 'Northstar member portal');
    form.setValue('text', SAMPLE_TEXT);
  };
  const clearWorkspace = () => {
    form.reset({ text: '', projectName: '' });
    setAnalysis(null);
    analysisMutation.reset();
    setCopied(false);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const focusTranscript = () => document.getElementById('transcript')?.focus();
  const jumpTo = (section: SectionKey) => {
    setActiveSection(section);
    setMobileNavOpen(false);
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const copyAssessment = async () => {
    if (!analysis) return;
     const textToCopy = `${analysis.summary.project}\n\nСтоимость: ${analysis.summary.cost}\nСроки: ${analysis.summary.timeline}\nСложность: ${analysis.summary.complexity}\nГлавный риск: ${analysis.summary.mainRisk}\nГлавная неизвестная: ${analysis.summary.mainUnknown}\nПервый вопрос: ${analysis.summary.firstQuestion}`;
    await navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const exportAssessment = () => {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
     anchor.download = `${(analysis.project.name || 'analiz-peregovorov').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'analiz-peregovorov'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <WorkspaceSidebar activeSection={activeSection} onSectionChange={jumpTo} onNew={clearWorkspace} onDocumentation={() => { setMobileNavOpen(false); setLocation('/documentation'); }} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((value) => !value)} mobileOpen={mobileNavOpen} />
      <main className={`min-h-[100dvh] transition-[margin] duration-200 ${sidebarCollapsed ? 'md:ml-[76px]' : 'md:ml-[232px]'}`}>
        <header className="sticky top-0 z-20 flex min-h-[68px] items-center justify-between gap-4 border-b border-[#dedbd1]/90 bg-[#f5f3ee]/90 px-5 backdrop-blur-md md:px-9">
          <div className="flex items-center gap-3">
             <button type="button" onClick={() => setMobileNavOpen((value) => !value)} data-testid="button-mobile-menu" aria-label={mobileNavOpen ? 'Закрыть навигацию' : 'Открыть навигацию'} aria-expanded={mobileNavOpen} className="grid size-9 place-items-center rounded-lg text-[#667078] hover:bg-[#e9e7df] md:hidden">{mobileNavOpen ? <X size={18} /> : <Menu size={18} />}</button>
             <div className="hidden items-center gap-2 text-[10px] text-[#858b87] sm:flex"><span className="mono text-[#b0afa8]">РАБОЧАЯ ОБЛАСТЬ</span><ChevronDown size={13} /><span className="font-bold text-[#485257]">Оценка пресейла</span></div>
             <div className="flex items-center gap-2 sm:hidden"><span className="mono text-[10px] font-bold tracking-[.1em] text-[#485257]">NEGOTIATION ANALYZER</span></div>
          </div>
          <div className="flex items-center gap-2.5">
            <div data-testid="status-api" className="hidden items-center gap-2 rounded-full border border-[#dedbd1] bg-[#f9f7f1] px-3 py-1.5 text-[10px] text-[#747c79] sm:flex"><span className={`size-1.5 rounded-full ${health.isError ? 'bg-[#d06e58]' : health.isLoading ? 'animate-pulse-soft bg-[#eea346]' : 'bg-[#4b9b90]'}`} />{healthLabel}</div>
             {analysis && <><button type="button" onClick={copyAssessment} data-testid="button-copy-assessment" className="flex items-center gap-2 rounded-lg border border-[#d6d4cb] bg-[#f9f7f1] px-3 py-2 text-[10px] font-bold text-[#5c6464] hover:bg-[#efede7]">{copied ? <Check size={14} className="text-[#3d897d]" /> : <Clipboard size={14} />}<span className="hidden sm:inline">{copied ? 'Скопировано' : 'Копировать краткий отчёт'}</span></button><button type="button" onClick={exportAssessment} data-testid="button-export-assessment" className="flex items-center gap-2 rounded-lg bg-[#eea346] px-3 py-2 text-[10px] font-bold text-[#172033] hover:bg-[#f1b15f]"><ArrowDownToLine size={14} /><span className="hidden sm:inline">Экспорт JSON</span></button></>}
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-5 py-7 md:px-9 md:py-10">
          {!analysis && !analysisMutation.isPending && (
            <div className="mb-8 animate-rise flex items-end justify-between gap-4">
               <div><div className="eyebrow text-[#a46c26]">Аналитика переговоров / 00</div><div className="mt-2 text-[12px] text-[#858b87]">Понятный вывод перед следующей встречей.</div></div>
               <div className="hidden items-center gap-2 text-[10px] text-[#969b95] lg:flex"><span className="mono">SHIFT + ENTER</span> для анализа <span className="mx-1 text-[#c3c1b9]">•</span> <span className="mono">v0.9.4</span></div>
            </div>
          )}
          <div className={analysis ? 'grid gap-5 xl:grid-cols-[minmax(340px,430px)_minmax(0,1fr)] xl:items-start' : 'grid gap-5 xl:grid-cols-[minmax(340px,430px)_minmax(0,1fr)] xl:items-start'}>
            <InputPanel form={form} onSubmit={submit} onSample={loadSample} onClear={clearWorkspace} isPending={analysisMutation.isPending} />
            <div>
              {analysisMutation.isPending ? <LoadingState /> : analysis ? <><SummaryBand analysis={analysis} /><DetailPanels analysis={analysis} /></> : <EmptyState onSample={loadSample} onFocus={focusTranscript} />}
              {analysisMutation.isError && (
                 <div data-testid="status-analysis-error" className="mt-4 flex items-start gap-3 rounded-xl border border-[#e7c4ba] bg-[#fbebe7] p-4 text-[#9d4b3a]"><AlertCircle size={17} className="mt-0.5 shrink-0" /><div className="flex-1"><div className="text-[11px] font-bold">Не удалось завершить оценку.</div><p className="mt-1 text-[10px] leading-[1.5]">Проверьте текст и повторите попытку. Введённые данные сохранены.</p></div><button type="button" onClick={() => submit({ text, projectName: form.getValues('projectName') })} data-testid="button-retry-analysis" className="flex items-center gap-1.5 rounded-md border border-[#dfb7ac] px-2.5 py-1.5 text-[10px] font-bold hover:bg-[#f6dcd5]"><RefreshCw size={12} /> Повторить</button></div>
              )}
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function DocumentationPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [, setLocation] = useLocation();

  return (
    <AppShell>
      <WorkspaceSidebar
        activeSection="documentation"
        onSectionChange={() => { setMobileNavOpen(false); setLocation('/'); }}
        onNew={() => { setMobileNavOpen(false); setLocation('/'); }}
        onDocumentation={() => undefined}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        mobileOpen={mobileNavOpen}
      />
      <main className={`min-h-[100dvh] transition-[margin] duration-200 ${sidebarCollapsed ? 'md:ml-[76px]' : 'md:ml-[232px]'}`}>
        <header className="sticky top-0 z-20 flex min-h-[68px] items-center justify-between gap-4 border-b border-[#dedbd1]/90 bg-[#f5f3ee]/90 px-5 backdrop-blur-md md:px-9">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileNavOpen((value) => !value)} data-testid="button-mobile-menu" aria-label={mobileNavOpen ? 'Закрыть навигацию' : 'Открыть навигацию'} aria-expanded={mobileNavOpen} className="grid size-9 place-items-center rounded-lg text-[#667078] hover:bg-[#e9e7df] md:hidden">{mobileNavOpen ? <X size={18} /> : <Menu size={18} />}</button>
            <div className="flex items-center gap-2 text-[10px] text-[#858b87]"><span className="mono text-[#b0afa8]">СПРАВКА</span><ChevronDown size={13} /><span className="font-bold text-[#485257]">Документация</span></div>
          </div>
          <button type="button" onClick={() => setLocation('/')} className="flex items-center gap-2 rounded-lg bg-[#172033] px-3 py-2 text-[10px] font-bold text-[#f4f0e7] hover:bg-[#222e44]"><ArrowRight size={13} className="rotate-180" /> К анализу</button>
        </header>
        <div className="mx-auto max-w-[1120px] px-5 py-7 md:px-9 md:py-10">
          <div className="animate-rise">
            <div className="eyebrow text-[#a46c26]">Документация / 07</div>
            <h1 className="mt-3 max-w-[760px] text-[34px] font-extrabold leading-[1.05] tracking-[-.06em] text-[#20283a] md:text-[46px]">Как работает анализ переговоров.</h1>
            <p className="mt-5 max-w-[700px] text-[14px] leading-[1.75] text-[#687178]">Negotiation Analyzer превращает неструктурированный разговор о проекте в понятную основу для пресейла: что предстоит сделать, сколько это может стоить, когда можно выпустить результат и какие вопросы ещё нужно закрыть.</p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ['Цель', 'Снизить риск обещать клиенту неподтверждённый объём, срок или бюджет.'],
              ['На входе', 'Расшифровка звонка, заметки встречи, переписка или смешанный текст переговоров.'],
              ['На выходе', 'Коммерческая оценка, сложность, этапы, риски, AI-технологии, инструменты, вопросы и неизвестные.'],
              ['Главный принцип', 'Факты отделяются от предположений. Если данных не хватает, система показывает неизвестное, а не маскирует его точным числом.'],
            ].map(([title, copy]) => (
              <section key={title} className="rounded-2xl border border-[#dedbd1] bg-[#f9f7f1] p-6 panel-shadow">
                <div className="eyebrow text-[#7a817e]">{title}</div>
                <p className="mt-3 text-[12px] leading-[1.7] text-[#687178]">{copy}</p>
              </section>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-2xl border border-[#dedbd1] bg-[#f9f7f1] p-6 panel-shadow">
              <div className="flex items-start gap-3">
                <div className="grid size-8 place-items-center rounded-lg bg-[#e4f0eb] text-[#2d7770]"><FileText size={16} /></div>
                <div><h2 className="text-[16px] font-extrabold tracking-[-.03em] text-[#242d3e]">Как пользоваться</h2><p className="mt-1 text-[10px] text-[#898e89]">Три шага до следующего решения</p></div>
              </div>
              <ol className="mt-6 space-y-5">
                {[
                  ['01', 'Вставьте разговор', 'Добавьте название проекта и вставьте минимум 80 символов исходного текста. Чем больше контекста, тем увереннее оценка.'],
                  ['02', 'Запустите анализ', 'Система выделит намерения клиента, ограничения, технические сигналы и места, где требования пока не определены.'],
                  ['03', 'Проверьте и действуйте', 'Используйте краткий итог для внутреннего решения, вопросы — для следующего звонка, а этапы и риски — для подготовки предложения.'],
                ].map(([number, title, copy]) => (
                  <li key={number} className="flex gap-3">
                    <span className="mono pt-0.5 text-[10px] text-[#b27a31]">{number}</span>
                    <div><div className="text-[12px] font-bold text-[#343c46]">{title}</div><p className="mt-1 text-[10px] leading-[1.6] text-[#858b87]">{copy}</p></div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border border-[#172033] bg-[#172033] p-6 text-[#f4f0e7] panel-shadow">
              <div className="flex items-start gap-3">
                <div className="grid size-8 place-items-center rounded-lg bg-[#eea346] text-[#172033]"><Target size={16} /></div>
                <div><h2 className="text-[16px] font-extrabold tracking-[-.03em]">Что делать с результатом</h2><p className="mt-1 text-[10px] text-[#aab2bf]">Результат — не финальная смета</p></div>
              </div>
              <ul className="mt-6 space-y-4">
                {[
                  'Сверьте главные выводы с командой разработки и владельцем продукта.',
                  'Задайте клиенту вопросы с высоким влиянием до фиксации цены и сроков.',
                  'Соберите MVP из этапов и явно вынесите спорные функции за его границы.',
                  'Скопируйте краткий отчёт для встречи или экспортируйте полный JSON для дальнейшей обработки.',
                ].map((item) => <li key={item} className="flex gap-2.5 text-[11px] leading-[1.6] text-[#c5cdd5]"><span className="mt-[6px] size-1.5 shrink-0 rounded-full bg-[#8bd1c1]" />{item}</li>)}
              </ul>
            </section>
          </div>

          <section className="mt-4 rounded-2xl border border-[#dedbd1] bg-[#f9f7f1] p-6 panel-shadow">
            <div className="flex items-start gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-[#f0e4c9] text-[#99702e]"><ShieldAlert size={16} /></div>
              <div><h2 className="text-[16px] font-extrabold tracking-[-.03em] text-[#242d3e]">Как читать разделы</h2><p className="mt-1 text-[10px] text-[#898e89]">Каждый блок отвечает на свой пресейл-вопрос</p></div>
            </div>
            <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Итог для руководителя', 'Быстрый ответ: идти в сделку, что обсудить и где главный риск.'],
                ['Коммерческая оценка', 'Диапазон стоимости и факторы, которые сильнее всего его двигают.'],
                ['План реализации', 'Логичная последовательность работ до MVP или полной версии.'],
                ['Риски и неизвестные', 'То, что может заблокировать проект или изменить исходные условия.'],
                ['AI и инструменты', 'Какие AI-компоненты нужны продукту и чем его разумно разрабатывать.'],
                ['Вопросы клиенту', 'Готовый список вопросов для следующей встречи и уточнения требований.'],
              ].map(([title, copy]) => <div key={title}><div className="text-[11px] font-bold text-[#343c46]">{title}</div><p className="mt-1 text-[10px] leading-[1.55] text-[#858b87]">{copy}</p></div>)}
            </div>
          </section>

          <div className="mt-6 border-t border-[#dedbd1] pt-5 text-[10px] leading-[1.6] text-[#8b908a]">
            <span className="font-bold text-[#687178]">Важно:</span> оценка помогает подготовить следующий разговор, но не заменяет техническое обследование, юридическую проверку, проверку безопасности или согласованную смету. Не передавайте в анализ секреты, пароли и ключи доступа.
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function Router() {
  return (
    <ErrorBoundary resetKey={window.location.pathname}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/documentation" component={DocumentationPage} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;