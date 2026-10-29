import { useEffect, useState } from "react";
import {
  Sigma,
  Lightbulb,
  ListOrdered,
  Target,
  Play,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  X,
  RotateCcw,
  Waves,
  Compass,
  Calculator,
  Eye,
  Heart,
  CircleHelp,
} from "lucide-react";
import { EquationEditor } from "./components/EquationEditor";
import { HintResult, StepByStep, Practice } from "./components/Help";
import { Tex } from "./components/Tex";
import { parse, UserError } from "./math/parse";
import {
  solve,
  solveImplicit,
  solveHigher,
  solveParametric,
  solvePointApplication,
  tex,
  Y,
  Solution,
  HigherSolution,
  ParametricSolution,
  PointSolution,
} from "./math/diff";
import { extractMathEquation } from "./lib/ocr";
import { DerivativeExplorer } from "./components/DerivativeExplorer";
import { SolutionExport } from "./components/SolutionExport";

type Mode =
  | "hint"
  | "steps"
  | "practice"
  | "higher"
  | "parametric"
  | "applications"
  | "visual";
type Application = "tangent" | "normal";
const MODES = [
  {
    id: "hint" as Mode,
    title: "اشتقّها",
    icon: Lightbulb,
    desc: "تلميح يوجّهك من غير ما يحرق الحل.",
  },
  {
    id: "steps" as Mode,
    title: "فهمني الحل",
    icon: ListOrdered,
    desc: "نمشي في الاشتقاق خطوة خطوة.",
  },
  {
    id: "practice" as Mode,
    title: "اختبر فهمي",
    icon: Target,
    desc: "مسألة شبهها تحلّها بإيدك.",
  },
  {
    id: "higher" as Mode,
    title: "المشتقات العليا",
    icon: Waves,
    desc: "اختار الرتبة من الأولى للخامسة.",
  },
  {
    id: "parametric" as Mode,
    title: "اشتقاق بارامتري",
    icon: Compass,
    desc: "احسب دص/دس من س وص بدلالة ل.",
  },
  {
    id: "applications" as Mode,
    title: "تطبيقات الاشتقاق",
    icon: Calculator,
    desc: "مماس أو عمودي عند نقطة.",
  },
  {
    id: "visual" as Mode,
    title: "شوف المشتقة بعينك",
    icon: Eye,
    desc: "حرّك نقطة وشوف المماس والميل.",
  },
];
function Result({
  higher,
  parametric,
  point,
  mode,
  base,
  onSteps,
}: {
  higher?: HigherSolution;
  parametric?: ParametricSolution;
  point?: PointSolution;
  mode: Mode;
  base?: Solution;
  onSteps: () => void;
}) {
  if (higher)
    return (
      <div className="space-y-3">
        <div className="reveal result-heading">
          <span>المشتقة المطلوبة:</span>
          <Tex
            tex={`${Y}^{(${higher.order})} = ${tex(higher.derivatives[higher.order - 1])}`}
          />
        </div>
        <div className="space-y-3">
          {[higher.f, ...higher.derivatives].map((d, i) => (
            <div
              className="reveal rounded-2xl border border-slate-200 bg-white p-4"
              key={i}
            >
              <p className="font-bold">
                {i === 0 ? "الدالة الأصلية" : `المشتقة رقم ${i}`}
              </p>
              <Tex block tex={`${i === 0 ? Y : `${Y}^{(${i})}`} = ${tex(d)}`} />
            </div>
          ))}
        </div>
      </div>
    );
  if (parametric)
    return (
      <div className="space-y-3">
        <div className="reveal rounded-2xl border border-slate-200 bg-white p-4">
          <p className="font-bold">الاشتقاق البارامتري</p>
          <p className="text-sm text-slate-600">
            بنقسم مشتقة ص على مشتقة س بالنسبة للمتغير الوسيط ل.
          </p>
          <Tex
            block
            tex={`س = ${tex(parametric.x)},\\quad ص = ${tex(parametric.y)}`}
          />
          <Tex
            block
            tex={`\\frac{\\text{د س}}{\\text{د ل}}=${tex(parametric.dx)},\\quad \\frac{\\text{د ص}}{\\text{د ل}}=${tex(parametric.dy)}`}
          />
          <Tex
            block
            tex={`\\frac{\\text{د ص}}{\\text{د س}}=\\frac{${tex(parametric.dy)}}{${tex(parametric.dx)}}=${tex(parametric.first)}`}
          />
          {parametric.second && (
            <Tex
              block
              tex={`\\frac{\\text{د}^{2}\\text{ص}}{\\text{د س}^{2}}=${tex(parametric.second)}`}
            />
          )}
        </div>
      </div>
    );
  if (point)
    return (
      <div className="space-y-3">
        <div className="reveal rounded-2xl border border-slate-200 bg-white p-4">
          <p className="font-bold">الحل عند النقطة</p>
          <Tex
            block
            tex={`${Y} = ${tex(point.f)},\\quad (س,ص)=(${point.x},${point.y})`}
          />
          <Tex block tex={`ميل المماس = ${point.slope}`} />
          <Tex
            block
            tex={
              point.vertical
                ? `المعادلة: \\text{س} = ${tex(point.equation)}`
                : `المعادلة: ${Y} = ${tex(point.equation)}`
            }
          />
        </div>
      </div>
    );
  if (!base) return null;
  return (
    <>
      <div className="reveal result-heading">
        <span>الدالة اللي فهمتها:</span>
        <Tex tex={`${Y} = ${tex(base.f)}`} />
      </div>
      {mode === "hint" && <HintResult sol={base} onSteps={onSteps} />}
      {mode === "steps" && <StepByStep sol={base} />}
      {mode === "practice" && <Practice base={base} />}
    </>
  );
}

export default function App() {
  const [latex, setLatex] = useState("");
  const [paramX, setParamX] = useState("");
  const [paramY, setParamY] = useState("");
  const [mode, setMode] = useState<Mode>("hint");
  const [order, setOrder] = useState(1);
  const [application, setApplication] = useState<Application>("tangent");
  const [pointX, setPointX] = useState("");
  const [secondParam, setSecondParam] = useState(false);
  const [run, setRun] = useState<{
    id: number;
    mode: Mode;
    base?: Solution;
    higher?: HigherSolution;
    parametric?: ParametricSolution;
    point?: PointSolution;
  } | null>(null);
  const [err, setErr] = useState("");
  const [variable, setVariable] = useState<"x" | "y">("x");
  const [implicit, setImplicit] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [welcomeClosing, setWelcomeClosing] = useState(false);
  const dismissWelcome = () => {
    if (welcomeClosing) return;
    setWelcomeClosing(true);
    window.setTimeout(() => setWelcomeOpen(false), 520);
  };
  const edit = (v: string) => {
    setLatex(v);
    setRun(null);
    setErr("");
  };
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image);
    },
    [image],
  );
  const extractImageEquation = async () => {
    if (!imageFile) return;
    try {
      setOcrBusy(true);
      setErr("");
      const extracted = await extractMathEquation(imageFile);
      setLatex(extracted);
      setRun(null);
      setErr("");
    } catch (e) {
      setErr(
        e instanceof UserError
          ? e.message
          : "تعذّر استخراج المعادلة من الصورة.",
      );
    } finally {
      setOcrBusy(false);
    }
  };
  const start = () => {
    if (busy) return;
    try {
      setBusy(true);
      setErr("");
      setRun(null);
      if (mode === "parametric") {
        const normalizeParameter = (v: string) =>
          v.replace(/\bt\b/g, "x").replace(/ل/g, "x");
        setRun({
          id: Date.now(),
          mode,
          parametric: solveParametric(
            parse(normalizeParameter(paramX)),
            parse(normalizeParameter(paramY)),
            secondParam,
          ),
        });
      } else if (mode === "higher")
        setRun({
          id: Date.now(),
          mode,
          higher: solveHigher(parse(latex), order, variable),
        });
      else if (mode === "applications")
        setRun({
          id: Date.now(),
          mode,
          point: solvePointApplication(
            parse(latex),
            Number(pointX),
            application,
          ),
        });
      else
        setRun({
          id: Date.now(),
          mode,
          base: implicit ? solveImplicit(latex) : solve(parse(latex), variable),
        });
    } catch (e) {
      setErr(
        e instanceof UserError
          ? e.message
          : "حصلت مشكلة وإحنا بنحسب. راجع الإدخال وجرّب تاني.",
      );
    } finally {
      setBusy(false);
    }
  };
  const selectMode = (next: Mode) => {
    setMode(next);
    setRun(null);
    setErr("");
  };
  return (
    <div className="app-shell">
      {welcomeOpen && (
        <div className={`welcome-backdrop ${welcomeClosing ? "is-closing" : ""}`} role="presentation">
          <section className="welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
            <button
              type="button"
              className="welcome-close"
              aria-label="إغلاق الرسالة"
              onClick={dismissWelcome}
            >
              <X size={18} />
            </button>
            <div className="welcome-glow" aria-hidden="true" />
            <div className="welcome-mark" aria-hidden="true">
              <Heart size={30} fill="currentColor" />
            </div>
            <h2 id="welcome-title">صلِّ على النبي ﷺ</h2>
            <p className="welcome-message">وبالتوفيق في كل خطوة ❤️</p>
            <button type="button" className="welcome-button" onClick={dismissWelcome}>
              ابدأ
            </button>
          </section>
        </div>
      )}
      <header className="site-header">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-brand text-white">
            <Sigma size={22} />
          </span>
          <div>
            <h1>اشتقّها</h1>
            <p>افهم الاشتقاق خطوة خطوة</p>
          </div>
        </div>
        <div className="header-actions">
          <button type="button" className="help-button" onClick={() => setHelpOpen(true)}>
            <CircleHelp size={17} /> كيف تستخدم التطبيق؟
          </button>
          <span className="trust-badge">مجاني · بدون تسجيل</span>
        </div>
      </header>
      <section className="hero">
        <p className="eyebrow">مساعدك في الرياضيات</p>
        <h2>اشتقاق أوضح، خطوة خطوة</h2>
        <p>اختار نوع المسألة واكتبها في المحرر.</p>
      </section>
      <main
        className={`workspace ${mode === "visual" ? "visual-workspace" : ""}`}
      >
        {mode === "visual" && <DerivativeExplorer />}
        {mode !== "visual" && (
          <>
            {mode === "parametric" ? (
              <div className="split-inputs">
                <EquationEditor
                  label="س بدلالة ل"
                  value={paramX}
                  onChange={(v) => {
                    setParamX(v);
                    setRun(null);
                  }}
                />
                <EquationEditor
                  label="ص بدلالة ل"
                  value={paramY}
                  onChange={(v) => {
                    setParamY(v);
                    setRun(null);
                  }}
                />
              </div>
            ) : (
              <EquationEditor
                label={
                  mode === "applications"
                    ? "اكتب الدالة"
                    : "اكتب الدالة اللي عايز تشتقها"
                }
                value={latex}
                onChange={edit}
              />
            )}
            {mode === "parametric" && (
              <label className="check-option inline-check">
                <input
                  type="checkbox"
                  checked={secondParam}
                  onChange={(e) => setSecondParam(e.target.checked)}
                />{" "}
                احسب المشتقة البارامترية الثانية
              </label>
            )}
            {mode !== "parametric" && (
              <div className="input-options">
                <label htmlFor="variable">
                  اشتق بالنسبة لـ{" "}
                  <select
                    id="variable"
                    value={variable}
                    onChange={(e) => setVariable(e.target.value as "x" | "y")}
                  >
                    <option value="x">س / x</option>
                    <option value="y">ص / y</option>
                  </select>
                </label>
                {mode === "higher" && (
                  <label htmlFor="order">
                    رتبة المشتقة{" "}
                    <select
                      id="order"
                      value={order}
                      onChange={(e) => setOrder(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          المشتقة{" "}
                          {n === 1
                            ? "الأولى"
                            : n === 2
                              ? "الثانية"
                              : n === 3
                                ? "الثالثة"
                                : n === 4
                                  ? "الرابعة"
                                  : "الخامسة"}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {mode === "applications" && (
                  <>
                    <label>
                      نوع التطبيق{" "}
                      <select
                        value={application}
                        onChange={(e) =>
                          setApplication(e.target.value as Application)
                        }
                      >
                        <option value="tangent">معادلة المماس</option>
                        <option value="normal">معادلة العمودي</option>
                      </select>
                    </label>
                    <label>
                      قيمة س{" "}
                      <input
                        className="number-input"
                        inputMode="decimal"
                        value={pointX}
                        onChange={(e) => setPointX(e.target.value)}
                        placeholder="مثال: 2"
                      />
                    </label>
                  </>
                )}
                {mode !== "applications" && (
                  <label className="check-option">
                    <input
                      type="checkbox"
                      checked={implicit}
                      onChange={(e) => setImplicit(e.target.checked)}
                    />{" "}
                    اشتقاق ضمني
                  </label>
                )}
              </div>
            )}
            <div className="image-input">
              <label className="upload-button">
                <Upload size={18} /> صوّر أو ارفع المسألة{" "}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (image) URL.revokeObjectURL(image);
                    setImageFile(file);
                    setImage(URL.createObjectURL(file));
                    setErr("");
                  }}
                />
              </label>
              <p className="upload-help">
                الصورة بتفضل على جهازك. راجع المعادلة في المحرر قبل الحساب.
              </p>
              {image && (
                <div className="image-preview">
                  <img src={image} alt="معاينة المسألة" />
                  <div>
                    <span>
                      <ImageIcon size={15} /> جاهزة للمراجعة
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(image);
                        setImage(null);
                        setImageFile(null);
                      }}
                    >
                      <X size={14} /> شيل الصورة
                    </button>
                    <button
                      type="button"
                      disabled={ocrBusy}
                      onClick={extractImageEquation}
                    >
                      {ocrBusy ? "جاري الاستخراج..." : "استخرج المعادلة"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {err && (
              <p
                role="alert"
                className="reveal mt-4 flex gap-2 rounded-xl bg-rose-50 p-3 text-sm leading-7 text-rose-800"
              >
                <AlertCircle size={18} className="mt-1 shrink-0" />
                {err}
              </p>
            )}
          </>
        )}
        <div role="radiogroup" aria-label="نوع المساعدة" className="mode-grid">
          {MODES.map(({ id, title, icon: Icon, desc }) => (
            <button
              key={id}
              role="radio"
              aria-checked={mode === id}
              onClick={() => selectMode(id)}
              className={`mode-card ${mode === id ? "selected" : ""}`}
            >
              <Icon
                size={20}
                className={mode === id ? "text-brand" : "text-slate-500"}
              />
              <p className="mt-2 font-bold">{title}</p>
              <p>{desc}</p>
            </button>
          ))}
        </div>
        {mode !== "visual" && (
          <button onClick={start} disabled={busy} className="start-button">
            <Play size={17} className="rotate-180" />{" "}
            {busy ? "لحظة وبحسبها..." : "ابدأ الحل"}
          </button>
        )}
      </main>
      {run && (
        <section className="mt-6 space-y-3" key={run.id}>
          <Result
            {...run}
            mode={run.mode}
            onSteps={() =>
              run.base && setRun({ ...run, id: Date.now(), mode: "steps" })
            }
          />
          <SolutionExport data={run} />
        </section>
      )}
      {run && (
        <button
          className="edit-again"
          onClick={() => {
            setRun(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <RotateCcw size={15} />           عدّل المسألة
        </button>
      )}
      <footer className="app-footer">
        <span className="made-by">
          Made with <Heart size={13} fill="currentColor" aria-label="love" /> by Moaz Ali
        </span>
      </footer>
      {helpOpen && (
        <div className="help-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setHelpOpen(false);
        }}>
          <section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
            <div className="help-modal-heading">
              <div>
                <span className="help-modal-icon"><CircleHelp size={20} /></span>
                <div>
                  <p className="eyebrow">دليل سريع</p>
                  <h2 id="help-title">كيف تستخدم التطبيق؟</h2>
                </div>
              </div>
              <button type="button" className="modal-close" aria-label="إغلاق" onClick={() => setHelpOpen(false)}>
                <X size={19} />
              </button>
            </div>
            <ol className="help-steps">
              <li><span>١</span><div><strong>اختار نوع المساعدة</strong><p>ابدأ بالتلميح أو الحل خطوة خطوة، أو جرّب التطبيقات المتقدمة.</p></div></li>
              <li><span>٢</span><div><strong>اكتب المعادلة</strong><p>استخدم المحرر ولوحة الرموز، أو ارفع صورة للمسألة.</p></div></li>
              <li><span>٣</span><div><strong>ابدأ الحل</strong><p>اضغط «ابدأ الحل» لمشاهدة النتيجة المناسبة لنوع المسألة.</p></div></li>
              <li><span>٤</span><div><strong>تعلّم وجرّب</strong><p>تحرك بين خطوات الخريطة التعليمية، وانسخ أي معادلة تحتاجها.</p></div></li>
            </ol>
            <button type="button" className="start-button help-modal-action" onClick={() => setHelpOpen(false)}>تمام، لنبدأ</button>
          </section>
        </div>
      )}
    </div>
  );
}
