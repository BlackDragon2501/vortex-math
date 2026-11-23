// Vortex Math - Evaluador de expresiones con variable x (para graficar)
// y todas las funciones científicas. Parser propio, sin librerías externas.

export type AngleMode = 'deg' | 'rad'

interface Tok {
  t: 'num' | 'op' | 'lp' | 'rp' | 'fn' | 'comma' | 'var'
  v: string
}

const FUNCS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh',
  'ln', 'log', 'log2', 'sqrt', 'abs', 'exp', 'floor', 'ceil', 'round', 'sign',
])

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 4, 'u-': 3 }

function tokenize(src: string): Tok[] {
  const toks: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === ' ' || c === '\t') { i++; continue }
    if (/[0-9.]/.test(c)) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j++
      if (j < src.length && /[eE]/.test(src[j]) && (/[0-9]/.test(src[j + 1] ?? '') || src[j + 1] === '-' || src[j + 1] === '+')) {
        j++
        if (src[j] === '-' || src[j] === '+') j++
        while (j < src.length && /[0-9]/.test(src[j])) j++
      }
      toks.push({ t: 'num', v: src.slice(i, j) })
      i = j
      continue
    }
    if (/[a-zA-Zπxy]/.test(c)) {
      let j = i
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++
      const word = src.slice(i, j)
      const low = word.toLowerCase()
      if (word === 'π' || low === 'pi') toks.push({ t: 'num', v: 'π' })
      else if (word === 'x' || word === 'y') toks.push({ t: 'var', v: word })
      else if (FUNCS.has(low)) toks.push({ t: 'fn', v: low })
      else throw new Error(`No reconozco "${word}"`)
      i = j
      continue
    }
    if ('+-*/^%'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue }
    if (c === '(') { toks.push({ t: 'lp', v: '(' }); i++; continue }
    if (c === ')') { toks.push({ t: 'rp', v: ')' }); i++; continue }
    if (c === ',') { toks.push({ t: 'comma', v: ',' }); i++; continue }
    throw new Error(`Carácter inesperado "${c}"`)
  }
  return toks
}

interface Node {
  eval(x: number): number
}

class Num implements Node {
  constructor(private v: number) {}
  eval(): number { return this.v }
}

class Var implements Node {
  constructor(private name: string) {}
  eval(x: number): number { return x }
}

class Un implements Node {
  constructor(private op: string, private a: Node, private deg: AngleMode) {}
  eval(x: number): number {
    const v = this.a.eval(x)
    if (this.op === 'u-') return -v
    return v
  }
  get opName(): string { return this.op }
  get angle(): AngleMode { return this.deg }
}

class Bin implements Node {
  constructor(private op: string, private a: Node, private b: Node) {}
  eval(x: number): number {
    const a = this.a.eval(x)
    const b = this.b.eval(x)
    switch (this.op) {
      case '+': return a + b
      case '-': return a - b
      case '*': return a * b
      case '/': return a / b
      case '%': return a % b
      case '^': return Math.pow(a, b)
      default: throw new Error(`Operador raro: ${this.op}`)
    }
  }
}

class Call implements Node {
  constructor(private fn: string, private args: Node[], private deg: AngleMode) {}
  eval(x: number): number {
    const toRad = (v: number) => (this.deg === 'deg' ? (v * Math.PI) / 180 : v)
    const fromRad = (v: number) => (this.deg === 'deg' ? (v * 180) / Math.PI : v)
    switch (this.fn) {
      case 'sin': return Math.sin(toRad(this.args[0].eval(x)))
      case 'cos': return Math.cos(toRad(this.args[0].eval(x)))
      case 'tan': return Math.tan(toRad(this.args[0].eval(x)))
      case 'asin': return fromRad(Math.asin(this.args[0].eval(x)))
      case 'acos': return fromRad(Math.acos(this.args[0].eval(x)))
      case 'atan': return fromRad(Math.atan(this.args[0].eval(x)))
      case 'sinh': return Math.sinh(this.args[0].eval(x))
      case 'cosh': return Math.cosh(this.args[0].eval(x))
      case 'tanh': return Math.tanh(this.args[0].eval(x))
      case 'ln': return Math.log(this.args[0].eval(x))
      case 'log': return Math.log10(this.args[0].eval(x))
      case 'log2': return Math.log2(this.args[0].eval(x))
      case 'sqrt': return Math.sqrt(this.args[0].eval(x))
      case 'abs': return Math.abs(this.args[0].eval(x))
      case 'exp': return Math.exp(this.args[0].eval(x))
      case 'floor': return Math.floor(this.args[0].eval(x))
      case 'ceil': return Math.ceil(this.args[0].eval(x))
      case 'round': return Math.round(this.args[0].eval(x))
      case 'sign': return Math.sign(this.args[0].eval(x))
      default: throw new Error(`Función rara: ${this.fn}`)
    }
  }
}

class Parser {
  private pos = 0
  constructor(private toks: Tok[], private deg: AngleMode) {}

  private peek(): Tok | null { return this.toks[this.pos] ?? null }

  parse(): Node {
    const n = this.expr()
    if (this.pos < this.toks.length) throw new Error('Sobraron símbolos al final de la expresión')
    return n
  }

  private expr(): Node {
    let left = this.term()
    for (;;) {
      const t = this.peek()
      if (t && t.t === 'op' && (t.v === '+' || t.v === '-')) {
        this.pos++
        left = new Bin(t.v, left, this.term())
      } else return left
    }
  }

  private term(): Node {
    let left = this.unary()
    for (;;) {
      const t = this.peek()
      if (t && t.t === 'op' && (t.v === '*' || t.v === '/' || t.v === '%')) {
        this.pos++
        left = new Bin(t.v, left, this.unary())
      } else if (t && t.t === 'op' && t.v === '*' && false) {
        continue
      } else return left
    }
  }

  private unary(): Node {
    const t = this.peek()
    if (t && t.t === 'op' && t.v === '-') {
      this.pos++
      return new Un('u-', this.unary(), this.deg)
    }
    if (t && t.t === 'op' && t.v === '+') {
      this.pos++
      return this.unary()
    }
    return this.power()
  }

  private power(): Node {
    const base = this.atom()
    const t = this.peek()
    if (t && t.t === 'op' && t.v === '^') {
      this.pos++
      return new Bin('^', base, this.unary()) // asociativo a la derecha
    }
    return base
  }

  private atom(): Node {
    const t = this.peek()
    if (!t) throw new Error('La expresión termina de forma inesperada')
    if (t.t === 'num') {
      this.pos++
      return new Num(t.v === 'π' ? Math.PI : parseFloat(t.v))
    }
    if (t.t === 'var') {
      this.pos++
      return new Var(t.v)
    }
    if (t.t === 'fn') {
      this.pos++
      const lp = this.peek()
      if (!lp || lp.t !== 'lp') throw new Error(`Falta ( tras ${t.v}(...)`)
      this.pos++
      const args: Node[] = [this.expr()]
      for (;;) {
        const c = this.peek()
        if (c && c.t === 'comma') {
          this.pos++
          args.push(this.expr())
        } else break
      }
      const rp = this.peek()
      if (!rp || rp.t !== 'rp') throw new Error(`Falta ) para cerrar ${t.v}(...)`)
      this.pos++
      if (args.length !== 1) throw new Error(`${t.v}(...) acepta un único argumento`)
      return new Call(t.v, args, this.deg)
    }
    if (t.t === 'lp') {
      this.pos++
      const inner = this.expr()
      const rp = this.peek()
      if (!rp || rp.t !== 'rp') throw new Error('Falta un ) de cierre')
      this.pos++
      return inner
    }
    throw new Error(`No esperaba "${t.v}" aquí`)
  }
}

/** evalúa una expresión con la variable x (π permitido como constante) */
export function evalExpr(src: string, x: number, deg: AngleMode = 'rad'): number {
  const toks = tokenize(src)
  if (!toks.length) throw new Error('Expresión vacía')
  const ast = new Parser(toks, deg).parse()
  return ast.eval(x)
}

/** evalúa la expresión sin variable (calculadora) */
export function evalPlain(src: string, deg: AngleMode = 'rad'): number {
  // 'x' sin definir: error claro
  const toks = tokenize(src)
  for (const t of toks) {
    if (t.t === 'var') throw new Error('Hay una "x" sin valor: úsala en el graficador')
  }
  const ast = new Parser(toks, deg).parse()
  return ast.eval(NaN)
}

export function fmtNum(n: number): string {
  if (!isFinite(n)) return n > 0 ? '∞' : Number.isNaN(n) ? 'indefinido' : '−∞'
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n)
  if (n !== 0 && (Math.abs(n) >= 1e10 || Math.abs(n) < 1e-6)) return n.toExponential(6)
  return String(parseFloat(n.toPrecision(12)))
}

// ---------- graficador ----------

export interface PlotPoint {
  x: number
  y: number | null
}

/** muestrea la función en [xmin, xmax] con N puntos; null = discontinuidad */
export function samplePlot(expr: string, xmin: number, xmax: number, n = 800, deg: AngleMode = 'rad'): PlotPoint[] {
  const pts: PlotPoint[] = []
  const step = (xmax - xmin) / n
  for (let i = 0; i <= n; i++) {
    const x = xmin + i * step
    let y: number | null = null
    try {
      const v = evalExpr(expr, x, deg)
      y = Number.isFinite(v) ? v : null
    } catch {
      y = null
    }
    pts.push({ x, y })
  }
  return pts
}
