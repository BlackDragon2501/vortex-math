'use client'

// Vortex Math - Calculadora científica y graficador 2D de f(x).
// Parser propio + Canvas: cero librerías, cero subidas.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Calculator,
  LineChart,
  Delete,
  Equal,
  Grid3x3,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  Trash2,
} from 'lucide-react'
import { evalExpr, evalPlain, fmtNum, samplePlot, type AngleMode } from '@/lib/math'

const SUPPORT_EMAIL = 'vortexmusic.soporte.app@gmail.com'
const ACCENT = '#2dd4bf'
const ACCENT2 = '#5eead4'
const CURVE_COLORS = ['#2dd4bf', '#f472b6', '#60a5fa', '#f59e0b', '#a78bfa', '#f87171']

function VortexLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="10" fill="#161616" />
      <circle cx="24" cy="24" r="17" fill="none" stroke={ACCENT} strokeWidth="3.5" />
      <path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke={ACCENT2} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke={ACCENT2} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M14 30c4-8 6 5 10-3s7 1 10-6" fill="none" stroke={ACCENT2} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-[#2b2b31] bg-[#141416] px-6 py-4">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-1 text-center">
        <p className="text-[11px] text-[#9b9ba4]">
          Vórtex Math · Derechos Reservados © 2026 Vortex Company ·{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#5eead4] hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-[11px] text-[#9b9ba4]">Gratis · Sin anuncios · 100% local en tu navegador</p>
      </div>
    </footer>
  )
}

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2b2b31] bg-[#1e1e22] px-3 py-2 text-xs font-medium text-[#ececf1] hover:bg-[#26262b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

const btnAccent =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#0f0f10] transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#2dd4bf] hover:bg-[#5eead4]'

type Tab = 'calc' | 'plot'

export default function MathApp() {
  const [tab, setTab] = useState<Tab>('calc')

  // ----- calculadora -----
  const [expr, setExpr] = useState('')
  const [deg, setDeg] = useState<AngleMode>('deg')
  const [result, setResult] = useState('')
  const [hist, setHist] = useState<{ expr: string; out: string }[]>([])
  const [err, setErr] = useState('')

  const compute = useCallback(() => {
    if (!expr.trim()) return
    try {
      const v = evalPlain(expr, deg)
      const out = fmtNum(v)
      setResult(out)
      setErr('')
      setHist((h) => [{ expr, out }, ...h].slice(0, 40))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No pude evaluar esa expresión')
      setResult('')
    }
  }, [expr, deg])

  const press = (s: string) => setExpr((e) => e + s)

  // teclado físico
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tab !== 'calc') return
      if (e.key === 'Enter') { e.preventDefault(); compute() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab, compute])

  // ----- graficador -----
  interface Curve { id: string; expr: string; color: string }
  const [curves, setCurves] = useState<Curve[]>([{ id: 'c1', expr: 'sin(x)', color: CURVE_COLORS[0] }])
  const [newExpr, setNewExpr] = useState('')
  const [view, setView] = useState({ cx: 0, cy: 0, span: 20 }) // centro y ancho en unidades
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)

  const drawPlot = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const dpr = window.devicePixelRatio || 1
    const w = wrap.clientWidth
    const h = Math.max(320, Math.min(520, Math.round(w * 0.62)))
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    // fondo
    ctx.fillStyle = '#0f0f10'
    ctx.fillRect(0, 0, w, h)

    const spanX = view.span
    const spanY = spanX * (h / w)
    const xmin = view.cx - spanX / 2
    const xmax = view.cx + spanX / 2
    const ymin = view.cy - spanY / 2
    const ymax = view.cy + spanY / 2
    const px = (x: number) => ((x - xmin) / (xmax - xmin)) * w
    const py = (y: number) => h - ((y - ymin) / (ymax - ymin)) * h

    // rejilla
    const niceStep = (span: number) => {
      const raw = span / 10
      const mag = Math.pow(10, Math.floor(Math.log10(raw)))
      const norm = raw / mag
      return (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag
    }
    const stepX = niceStep(spanX)
    const stepY = niceStep(spanY)
    ctx.strokeStyle = '#1e1e22'
    ctx.lineWidth = 1
    ctx.font = '10px ui-monospace, monospace'
    ctx.fillStyle = '#9b9ba4'
    for (let gx = Math.ceil(xmin / stepX) * stepX; gx <= xmax; gx += stepX) {
      const X = px(gx)
      ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, h); ctx.stroke()
      if (Math.abs(gx) > stepX / 1000) ctx.fillText(fmtNum(parseFloat(gx.toPrecision(10))), X + 3, Math.min(Math.max(py(0) + 12, 12), h - 4))
    }
    for (let gy = Math.ceil(ymin / stepY) * stepY; gy <= ymax; gy += stepY) {
      const Y = py(gy)
      ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(w, Y); ctx.stroke()
      if (Math.abs(gy) > stepY / 1000) ctx.fillText(fmtNum(parseFloat(gy.toPrecision(10))), Math.min(Math.max(px(0) + 4, 4), w - 40), Y - 3)
    }

    // ejes
    ctx.strokeStyle = '#3a3a42'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(0, py(0)); ctx.lineTo(w, py(0)); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(px(0), 0); ctx.lineTo(px(0), h); ctx.stroke()

    // curvas
    for (const c of curves) {
      if (!c.expr.trim()) continue
      let pts: { x: number; y: number | null }[]
      try {
        pts = samplePlot(c.expr, xmin, xmax, 900, deg)
      } catch {
        continue
      }
      ctx.strokeStyle = c.color
      ctx.lineWidth = 2
      ctx.beginPath()
      let started = false
      let prevY: number | null = null
      for (const p of pts) {
        if (p.y === null) { started = false; prevY = null; continue }
        const Y = py(p.y)
        const jump = prevY !== null && Math.abs(Y - py(prevY)) > h * 1.5 // discontinuidad (p. ej. tan)
        if (!started || jump) { ctx.moveTo(px(p.x), Y); started = true }
        else ctx.lineTo(px(p.x), Y)
        prevY = p.y
      }
      ctx.stroke()
    }
  }, [curves, view, deg])

  // redibuja al cambiar tamaño
  useEffect(() => {
    const ro = new ResizeObserver(() => drawPlot())
    if (wrapRef.current) ro.observe(wrapRef.current)
    drawPlot()
    return () => ro.disconnect()
  }, [drawPlot])

  // rueda = zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2
      setView((v) => ({ ...v, span: Math.max(1e-6, Math.min(1e7, v.span * factor)) }))
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  const addCurve = () => {
    if (!newExpr.trim()) return
    try {
      evalExpr(newExpr, 1, deg)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Expresión inválida')
      return
    }
    setErr('')
    if (curves.length >= 6) setCurves((cs) => [...cs.slice(1), { id: Math.random().toString(36).slice(2), expr: newExpr, color: CURVE_COLORS[curves.length % CURVE_COLORS.length] }])
    else setCurves((cs) => [...cs, { id: Math.random().toString(36).slice(2), expr: newExpr, color: CURVE_COLORS[cs.length % CURVE_COLORS.length] }])
    setNewExpr('')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#2b2b31] bg-[#141416] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <VortexLogo className="w-9 h-9" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">
              Vórtex Math <span className="font-normal text-[#9b9ba4]">· Calcula y grafica, sin límites</span>
            </h1>
            <p className="text-[11px] text-[#9b9ba4]">Científica con grados/radianes y graficador f(x) con zoom · todo en tu equipo</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {/* pestañas */}
        <div className="mb-4 flex gap-1 rounded-xl border border-[#2b2b31] bg-[#17171a] p-1">
          {(
            [
              { id: 'calc', label: 'Calculadora', icon: Calculator },
              { id: 'plot', label: 'Graficador', icon: LineChart },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                tab === t.id ? 'bg-[#26262b] text-[#ececf1]' : 'text-[#9b9ba4] hover:text-[#ececf1]'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'calc' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">
                  <Calculator className="h-3.5 w-3.5" /> Expresión
                </p>
                <div className="flex gap-1 rounded-lg border border-[#2b2b31] bg-[#0f0f10] p-1">
                  {(['deg', 'rad'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setDeg(m)}
                      className={`rounded-md px-3 py-1 text-xs font-semibold ${deg === m ? 'bg-[#26262b] text-[#5eead4]' : 'text-[#9b9ba4]'}`}
                    >
                      {m === 'deg' ? 'grados' : 'radianes'}
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={expr}
                onChange={(e) => setExpr(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && compute()}
                placeholder="2^10 · sin(30) · ln(100) · (1+2)*3"
                className="mt-3 w-full rounded-xl border border-[#2b2b31] bg-[#0f0f10] px-3 py-3 font-mono text-base outline-none focus:border-[#2dd4bf]"
              />
              <div className="mt-3 flex items-center gap-2">
                <button className={btnAccent} onClick={compute} disabled={!expr.trim()}>
                  <Equal className="h-3.5 w-3.5" /> Calcular
                </button>
                <button className={btn} onClick={() => setExpr((e) => e.slice(0, -1))}>
                  <Delete className="h-3.5 w-3.5" /> Borrar
                </button>
                <button className={btn} onClick={() => { setExpr(''); setResult(''); setErr('') }}>
                  Limpiar
                </button>
              </div>
              {result && (
                <div className="mt-4 rounded-xl border border-[#2dd4bf] bg-[#12211f] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-[#9b9ba4]">resultado</p>
                  <p className="break-all font-mono text-xl text-[#5eead4]">{result}</p>
                </div>
              )}
              {err && (
                <p className="mt-3 text-xs text-[#f87171]">{err}</p>
              )}

              {/* teclado */}
              <div className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                {(
                  ['7', '8', '9', '(', ')', '^', 'sqrt(', 'π',
                   '4', '5', '6', '*', '/', '%', 'ln(', 'abs(',
                   '1', '2', '3', '+', '-', 'sin(', 'cos(', 'tan(',
                   '0', '.', 'x', 'e', 'exp(', 'log(', 'asin(', 'atan('] as const
                ).map((k) => (
                  <button
                    key={k}
                    className="rounded-lg border border-[#2b2b31] bg-[#1e1e22] py-2 font-mono text-xs text-[#ececf1] hover:bg-[#26262b]"
                    onClick={() => press(k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {hist.length > 0 && (
              <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">Historial de esta sesión</p>
                  <button className={btn} onClick={() => setHist([])}><Trash2 className="h-3.5 w-3.5" /> Limpiar</button>
                </div>
                <div className="space-y-1.5">
                  {hist.map((h, i) => (
                    <button key={i} onClick={() => setExpr(h.expr)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#2b2b31] bg-[#0f0f10] px-3 py-2 text-left hover:bg-[#1e1e22]">
                      <span className="truncate font-mono text-xs text-[#9b9ba4]">{h.expr}</span>
                      <span className="shrink-0 font-mono text-xs text-[#5eead4]">= {h.out}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'plot' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">
                <Plus className="h-3.5 w-3.5" /> Funciones f(x) (hasta 6, usa la variable x)
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={newExpr}
                  onChange={(e) => setNewExpr(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCurve()}
                  placeholder="sin(x) · x^2 · 1/x · abs(x)-2"
                  className="min-w-0 flex-1 rounded-xl border border-[#2b2b31] bg-[#0f0f10] px-3 py-2.5 font-mono text-sm outline-none focus:border-[#2dd4bf]"
                />
                <button className={btnAccent} onClick={addCurve} disabled={!newExpr.trim()}>
                  <Plus className="h-3.5 w-3.5" /> Graficar
                </button>
              </div>
              {err && <p className="mt-2 text-xs text-[#f87171]">{err}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {curves.map((c) => (
                  <span key={c.id} className="flex items-center gap-2 rounded-lg border border-[#2b2b31] bg-[#0f0f10] px-2.5 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                    <code className="font-mono text-xs">y = {c.expr}</code>
                    <button className="text-[#9b9ba4] hover:text-[#f87171]" onClick={() => setCurves((cs) => cs.filter((x) => x.id !== c.id))}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">
                  <Grid3x3 className="h-3.5 w-3.5" /> Vista: centro ({fmtNum(parseFloat(view.cx.toPrecision(6)))}, {fmtNum(parseFloat(view.cy.toPrecision(6)))}) · ancho {fmtNum(parseFloat(view.span.toPrecision(6)))}
                </p>
                <div className="flex gap-2">
                  <button className={btn} onClick={() => setView((v) => ({ ...v, span: v.span / 1.5 }))} title="Acercar">
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button className={btn} onClick={() => setView((v) => ({ ...v, span: v.span * 1.5 }))} title="Alejar">
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <button className={btn} onClick={() => setView({ cx: 0, cy: 0, span: 20 })} title="Reiniciar vista">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div ref={wrapRef} className="w-full">
                <canvas
                  ref={canvasRef}
                  className="w-full cursor-grab rounded-xl border border-[#2b2b31] active:cursor-grabbing"
                  onPointerDown={(e) => {
                    dragRef.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy }
                    e.currentTarget.setPointerCapture(e.pointerId)
                  }}
                  onPointerMove={(e) => {
                    const d = dragRef.current
                    const canvas = canvasRef.current
                    if (!d || !canvas) return
                    const rect = canvas.getBoundingClientRect()
                    const spanY = view.span * (rect.height / rect.width)
                    const dx = ((e.clientX - d.x) / rect.width) * view.span
                    const dy = ((e.clientY - d.y) / rect.height) * spanY
                    setView((v) => ({ ...v, cx: d.cx - dx, cy: d.cy + dy }))
                  }}
                  onPointerUp={() => { dragRef.current = null }}
                />
              </div>
              <p className="mt-2 text-[11px] text-[#9b9ba4]">
                Arrastra para mover, usa la rueda del ratón o los botones para acercar. Las discontinuidades (p. ej. tan(x) o 1/x) se cortan solas.
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
