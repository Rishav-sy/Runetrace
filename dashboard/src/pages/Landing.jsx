import { useEffect, useRef, useMemo, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Github, DollarSign, Clock, BarChart3, Code2, Eye, Shield, Zap, Activity, Terminal } from 'lucide-react';
import './Landing.css';

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════
   THREE.JS — subtle aurora mesh
   ═══════════════════════════════════ */
function AuroraMesh() {
  const meshRef = useRef();
  const mat = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (mat.current) {
      mat.current.uniforms.uTime.value = t;
    }
    if (meshRef.current) {
      meshRef.current.rotation.z = t * 0.02;
    }
  });

  const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color('#C8FF00') },
      uColor2: { value: new THREE.Color('#1a3a00') },
      uColor3: { value: new THREE.Color('#0a1a00') },
    },
    vertexShader: `
      varying vec2 vUv;
      varying float vElevation;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float wave = sin(pos.x * 1.5 + uTime * 0.3) * cos(pos.y * 1.2 + uTime * 0.2) * 0.15;
        pos.z += wave;
        vElevation = wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying float vElevation;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      void main() {
        float mixVal = smoothstep(-0.1, 0.15, vElevation);
        vec3 color = mix(uColor3, uColor2, vUv.y);
        color = mix(color, uColor1, mixVal * 0.3);
        float alpha = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.6, vUv.y) * 0.35;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 3, 0, 0]} position={[0, 1.5, -3]}>
      <planeGeometry args={[14, 8, 64, 64]} />
      <primitive object={shaderMaterial} ref={mat} />
    </mesh>
  );
}

function DriftParticles({ count = 80 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 14;
      p[i * 3 + 1] = (Math.random() - 0.5) * 10;
      p[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
    }
    return p;
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.005;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.012} color="#C8FF00" transparent opacity={0.25} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function HeroBG() {
  return (
    <div className="hero-bg">
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <AuroraMesh />
          <DriftParticles />
        </Suspense>
      </Canvas>
    </div>
  );
}

/* ═══════════════════════════════════
   Animation helpers
   ═══════════════════════════════════ */
function FadeIn({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 1, 0.5, 1] }}
    >
      {children}
    </motion.div>
  );
}

function TypingCode() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const code = `from runetrace import track_llm, configure

configure(api_url="https://your-api.aws.com")

@track_llm
def ask_ai(prompt):
    return openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )

# Every call is now tracked ⚡`;

  useEffect(() => {
    if (!ref.current || !inView) return;
    let i = 0;
    ref.current.textContent = '';
    const id = setInterval(() => {
      if (i < code.length) { ref.current.textContent += code[i]; i++; }
      else clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [inView]);

  return <code ref={ref} className="typing-cursor" />;
}

/* ═══════════════════════════════════
   LANDING
   ═══════════════════════════════════ */
export default function Landing() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 120]);
  const heroOp = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  return (
    <div className="land">
      {/* Nav */}
      <motion.nav className="ln-nav" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.6 }}>
        <div className="ln-nav-inner">
          <Link to="/" className="ln-brand">
            <div className="ln-logo">R</div>
            <span className="ln-wordmark">rune<span>trace</span></span>
          </Link>
          <div className="ln-nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="https://github.com/rishav-sy/runetrace" target="_blank" rel="noreferrer"><Github size={14} /> GitHub</a>
          </div>
          <Link to="/dashboard" className="ln-nav-cta">Open Dashboard <ArrowRight size={14} /></Link>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <motion.section className="ln-hero" style={{ y: heroY, opacity: heroOp }}>
        <HeroBG />
        <div className="ln-hero-content">
          <motion.p className="ln-overline" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
            Open-source LLM observability
          </motion.p>
          <motion.h1 className="ln-h1" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7, ease: [0.25, 1, 0.5, 1] }}>
            See what your<br />
            <span className="ln-accent">AI pipeline</span> is<br />
            actually doing
          </motion.h1>
          <motion.p className="ln-subtitle" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }}>
            One decorator. Track every LLM call — cost, latency, tokens —<br className="hide-mobile" />
            on your own AWS infrastructure. Free forever.
          </motion.p>
          <motion.div className="ln-hero-actions" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }}>
            <Link to="/dashboard" className="ln-btn-primary">Open Dashboard <ArrowRight size={15} /></Link>
            <a href="https://github.com/rishavsy/runetrace" target="_blank" rel="noreferrer" className="ln-btn-secondary"><Github size={15} /> Star on GitHub</a>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Code ── */}
      <section className="ln-code-section">
        <FadeIn>
          <div className="ln-code-window">
            <div className="ln-code-chrome">
              <div className="ln-dots"><i /><i /><i /></div>
              <span className="ln-code-title">your_pipeline.py</span>
            </div>
            <pre className="ln-code-body"><TypingCode /></pre>
          </div>
        </FadeIn>
      </section>

      {/* ── Metrics strip ── */}
      <section className="ln-metrics">
        <FadeIn>
          <div className="ln-metrics-inner">
            {[
              { val: '$0', sub: '/month forever' },
              { val: '30+', sub: 'models supported' },
              { val: '1', sub: 'decorator to start' },
              { val: '∞', sub: 'calls tracked' },
            ].map((m, i) => (
              <div key={i} className="ln-metric">
                <span className="ln-metric-val">{m.val}</span>
                <span className="ln-metric-sub">{m.sub}</span>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ── Features ── */}
      <section className="ln-features" id="features">
        <FadeIn>
          <div className="ln-section-head">
            <p className="ln-label">Features</p>
            <h2 className="ln-h2">Everything you need to<br /><span className="ln-accent">understand your AI</span></h2>
          </div>
        </FadeIn>
        <div className="ln-features-grid">
          {[
            { icon: DollarSign, color: '#C8FF00', bg: 'rgba(200,255,0,0.06)', title: 'Cost tracking', desc: 'Per-model, per-function cost breakdowns. Built-in pricing for GPT-4o, Claude, Gemini, DeepSeek, and 30+ models.', wide: true },
            { icon: Clock, color: '#FF6B35', bg: 'rgba(255,107,53,0.06)', title: 'Latency monitoring', desc: 'Function-level latency heatmaps. Spot slow calls before they become incidents.' },
            { icon: BarChart3, color: '#448AFF', bg: 'rgba(68,138,255,0.06)', title: 'Token analytics', desc: 'Prompt vs completion breakdown. Catch bloated prompts before they blow up costs.' },
            { icon: Eye, color: '#00E676', bg: 'rgba(0,230,118,0.06)', title: 'Prompt inspection', desc: 'Full prompt and response logging. Click any row to debug any call.' },
            { icon: Code2, color: '#B388FF', bg: 'rgba(179,136,255,0.06)', title: 'One-line SDK', desc: 'Add @track_llm to any function. Async support, batched uploads, automatic extraction.' },
            { icon: Shield, color: '#FFB300', bg: 'rgba(255,179,0,0.06)', title: 'Self-hosted', desc: 'Runs on your AWS. Prompts never leave your infrastructure. DynamoDB + Lambda — all free tier.', wide: true },
          ].map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.05} className={`ln-feature ${f.wide ? 'ln-feature-wide' : ''}`}>
              <div className="ln-feature-icon" style={{ background: f.bg, color: f.color }}><f.icon size={20} /></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Dashboard preview ── */}
      <section className="ln-preview">
        <FadeIn>
          <div className="ln-section-head">
            <p className="ln-label">Dashboard</p>
            <h2 className="ln-h2">Your command center</h2>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="ln-preview-frame">
            <div className="ln-preview-chrome">
              <div className="ln-dots"><i /><i /><i /></div>
              <div className="ln-preview-url">localhost:5173/dashboard</div>
            </div>
            <div className="ln-preview-body">
              <Link to="/dashboard" className="ln-preview-hover">
                <span>Open Live Dashboard <ArrowRight size={15} /></span>
              </Link>
              {/* Mini dashboard mockup */}
              <div className="ln-mini">
                <div className="ln-mini-top">
                  <span className="ln-mini-brand"><b style={{ color: '#C8FF00' }}>R</b> runetrace</span>
                  <div className="ln-mini-pills">
                    {['1H','24H','7D','ALL'].map(r => (
                      <span key={r} className={r === '7D' ? 'active' : ''}>{r}</span>
                    ))}
                  </div>
                  <span className="ln-mini-live">● LIVE</span>
                </div>
                <div className="ln-mini-cards">
                  {[
                    { l: 'Total Spend', v: '$1.00' },
                    { l: 'Calls', v: '350' },
                    { l: 'Avg Latency', v: '2.4s', c: '#FFB300' },
                    { l: 'Models', v: '6' },
                  ].map(c => (
                    <div key={c.l} className="ln-mini-card">
                      <span className="ln-mini-card-label">{c.l}</span>
                      <span className="ln-mini-card-val" style={c.c ? { color: c.c } : {}}>{c.v}</span>
                    </div>
                  ))}
                </div>
                <div className="ln-mini-charts">
                  <div className="ln-mini-chart">
                    <div className="ln-mini-chart-title">Cost by Model</div>
                    {[
                      { n: 'claude-3.5-sonnet', w: '82%', c: '#FF6B35' },
                      { n: 'gpt-4o', w: '58%', c: '#C8FF00' },
                      { n: 'claude-3.5-haiku', w: '18%', c: '#00E676' },
                      { n: 'gpt-4o-mini', w: '10%', c: '#448AFF' },
                    ].map(b => (
                      <div key={b.n} className="ln-mini-bar-row">
                        <span>{b.n}</span>
                        <div className="ln-mini-bar" style={{ width: b.w, background: b.c }} />
                      </div>
                    ))}
                  </div>
                  <div className="ln-mini-chart">
                    <div className="ln-mini-chart-title">Latency by Function</div>
                    {[
                      { fn: 'generate_report', dots: '🔴🔴🟡🔴🟡🔴' },
                      { fn: 'rag_query', dots: '🟡🟢🟡🔴🟡🟢' },
                      { fn: 'chat_completion', dots: '🟢🟡🟢🟢🟡🟢' },
                      { fn: 'classify_intent', dots: '🟢🟢🟢🟢🟢🟢' },
                    ].map(r => (
                      <div key={r.fn} className="ln-mini-dot-row">
                        <span>{r.fn}</span>
                        <span className="ln-mini-dots">{r.dots}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Pricing ── */}
      <section className="ln-pricing" id="pricing">
        <FadeIn>
          <div className="ln-section-head">
            <p className="ln-label">Pricing</p>
            <h2 className="ln-h2">Free. <span className="ln-accent">Actually free.</span></h2>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="ln-price-card">
            <div className="ln-price-top">
              <span className="ln-price-amount">$0</span>
              <span className="ln-price-period">/month forever</span>
            </div>
            <ul className="ln-price-list">
              {[
                [Zap, 'Unlimited LLM calls'],
                [Activity, 'Real-time dashboard'],
                [Shield, 'Self-hosted on your AWS'],
                [Terminal, 'Python SDK with async'],
                [BarChart3, '30+ model pricing'],
                [Code2, '100% open source'],
              ].map(([Icon, text]) => (
                <li key={text}><Icon size={14} /> {text}</li>
              ))}
            </ul>
            <Link to="/dashboard" className="ln-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Get Started <ArrowRight size={15} />
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer className="ln-footer">
        <div className="ln-footer-inner">
          <div className="ln-brand">
            <div className="ln-logo">R</div>
            <span className="ln-wordmark" style={{ fontSize: 13 }}>rune<span>trace</span></span>
          </div>
          <span className="ln-footer-text">Built by Rishav · Open source</span>
          <a href="https://github.com/rishavsy/runetrace" target="_blank" rel="noreferrer" className="ln-footer-gh"><Github size={16} /></a>
        </div>
      </footer>
    </div>
  );
}
