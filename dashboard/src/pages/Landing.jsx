import { useEffect, useRef, useMemo, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, useSpring } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Github, DollarSign, Clock, BarChart3, Code2, Eye, Shield, Zap, Activity, Terminal, Database, Brain, GitBranch, PenLine, Sparkles, Wand2, Layers, Repeat, Check } from 'lucide-react';
import TraceView from '../components/TraceView';
import PromptTemplates from '../components/PromptTemplates';
import DatasetsView from '../components/DatasetsView';
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
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 40, scale: 0.96, filter: 'blur(8px)' }}
      animate={inView ? { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
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
   Bento Showcases
   ═══════════════════════════════════ */

function BentoPrompts() {
  const code = "{\n  \"role\": \"system\",\n  \"content\": \"You are an eager AI assistant...\"\n}";
  return (
    <div className="ln-bento-card bento-prompts">
      <div className="ln-bento-content">
        <div className="ln-bento-icon"><PenLine size={20} /></div>
        <h3>Prompt Engineering</h3>
        <p>Version control for your prompts. Edit, test, and deploy without touching code.</p>
      </div>
      <div className="ln-bento-visual">
        <div className="ln-bento-mockup ln-mockup-editor">
          <div className="ln-mockup-header">
            <span>system_prompt_v2.1</span>
            <div className="ln-mockup-tag">Live</div>
          </div>
          <pre><code>{code}</code></pre>
          <div className="ln-mockup-vars">
            <span className="var-pill">{"{{"}user_name{"}}"}</span>
            <span className="var-pill">{"{{"}context{"}}"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BentoEvals() {
  return (
    <div className="ln-bento-card bento-evals">
      <div className="ln-bento-content">
        <div className="ln-bento-icon"><Brain size={20} /></div>
        <h3>Automated Evaluations</h3>
        <p>Use LLM-as-a-Judge to automatically score outputs for accuracy, relevance, and toxicity.</p>
      </div>
      <div className="ln-bento-visual">
         <div className="ln-bento-mockup ln-mockup-scorecard">
           <div className="ln-score-row">
             <span>Accuracy</span>
             <div className="ln-score-bar"><motion.div className="ln-score-fill" initial={{width:0}} whileInView={{width:'92%'}} transition={{duration:1, delay:0.2}} style={{background:'var(--ln-lime)'}} /></div>
             <span className="ln-score-val">4.6/5</span>
           </div>
           <div className="ln-score-row">
             <span>Tone Avoidance</span>
             <div className="ln-score-bar"><motion.div className="ln-score-fill" initial={{width:0}} whileInView={{width:'100%'}} transition={{duration:1, delay:0.4}} style={{background:'var(--ln-lime)'}} /></div>
             <span className="ln-score-val">5.0/5</span>
           </div>
           <div className="ln-score-row">
             <span>Hallucination</span>
             <div className="ln-score-bar"><motion.div className="ln-score-fill" initial={{width:0}} whileInView={{width:'12%'}} transition={{duration:1, delay:0.6}} style={{background:'#FF6B35'}} /></div>
             <span className="ln-score-val">0.6/5</span>
           </div>
         </div>
      </div>
    </div>
  );
}

function BentoTraces() {
  return (
    <div className="ln-bento-card bento-traces ln-span-2">
      <div className="ln-bento-content ln-row-content">
        <div className="ln-bento-icon"><GitBranch size={20} /></div>
        <div className="ln-text-wrap">
          <h3>Distributed Tracing</h3>
          <p>See the exact execution path of Agentic workflows. Waterfall latency charts, cost rollups, and deep step inspection.</p>
        </div>
      </div>
      <div className="ln-bento-visual bento-traces-vis">
        <div className="ln-bento-mockup">
          <div className="ln-waterfall">
           {[
             { name: 'Agent Executor', w: '100%', ml: '0%', c: '#C8FF00', t: '2.4s' },
             { name: 'Retrieve Context', w: '30%', ml: '5%', c: '#448AFF', t: '0.8s' },
             { name: 'LLM: gpt-4o', w: '55%', ml: '40%', c: '#FFB300', t: '1.4s' },
             { name: 'Tool: Search', w: '25%', ml: '45%', c: '#FF6B35', t: '0.6s' }
           ].map((row, i) => (
             <div key={i} className="ln-wf-row">
               <span className="ln-wf-name">{row.name}</span>
               <div className="ln-wf-track">
                 <motion.div className="ln-wf-bar" initial={{width:0, opacity:0}} whileInView={{width: row.w, opacity:1}} transition={{duration:0.6, delay: 0.1 * i}} style={{marginLeft: row.ml, background: row.c}} />
               </div>
               <span className="ln-wf-time">{row.t}</span>
             </div>
           ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BentoDatasets() {
  return (
    <div className="ln-bento-card bento-datasets ln-span-2">
      <div className="ln-bento-content ln-row-content">
        <div className="ln-bento-icon"><Database size={20} /></div>
        <div className="ln-text-wrap">
          <h3>Golden Datasets & Test Suites</h3>
          <p>Catch regressions before production. Curate datasets of inputs and run batch test suites to compare expected vs actual outputs.</p>
        </div>
      </div>
      <div className="ln-bento-visual bento-data-vis">
        <div className="ln-data-table">
          <div className="ln-dt-head">
            <span>Input Variables</span>
            <span>Expected Golden Output</span>
            <span>Actual Output</span>
          </div>
          <div className="ln-dt-row">
            <span className="ln-dt-cell hl-blue">{"{topic: 'taxes'}"}</span>
            <span className="ln-dt-cell">I cannot provide tax advice...</span>
            <span className="ln-dt-cell hl-green">I cannot provide tax advice...</span>
          </div>
          <div className="ln-dt-row">
            <span className="ln-dt-cell hl-blue">{"{topic: 'js'}"}</span>
            <span className="ln-dt-cell">Use const or let, avoid var.</span>
            <span className="ln-dt-cell hl-green">I recommend using const/let...</span>
          </div>
          <div className="ln-data-progress">
             <div className="ln-dp-text">Suite Progress <span>2/2 passed</span></div>
             <div className="ln-dp-track"><motion.div className="ln-dp-fill" initial={{width:0}} whileInView={{width:'100%'}} transition={{duration:1.5, delay:0.3}} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   Sticky Deep Dives & Interactive Mocks
   ═══════════════════════════════════ */

const DEMO_LOGS = [
  { trace_id: 'auto-100', function_name: 'Agent Executor', model: 'gpt-4o', prompt_tokens: 3420, completion_tokens: 120, latency_ms: 2450, cost: 0.018, status: 'success', timestamp: Date.now() / 1000 - 10, prompt: 'You are a helpful support agent.', response: 'I can help with that refund.' },
  { trace_id: 'auto-100', function_name: 'Retrieve Context', model: 'text-embedding-3-small', prompt_tokens: 42, completion_tokens: 0, latency_ms: 120, cost: 0.0001, status: 'success', timestamp: Date.now() / 1000 - 12, prompt: 'User intent: refund', response: '[0.12, 0.44, -0.05...]' },
  { trace_id: 'auto-100', function_name: 'Extract Intent', model: 'gpt-4o-mini', prompt_tokens: 850, completion_tokens: 15, latency_ms: 680, cost: 0.001, status: 'success', timestamp: Date.now() / 1000 - 13, prompt: 'Extract intent from: "My order arrived broken"', response: '{"intent": "refund"}' },
  { trace_id: 'auto-101', function_name: 'Summarize Document', model: 'claude-3.5-sonnet', prompt_tokens: 12500, completion_tokens: 850, latency_ms: 8400, cost: 0.045, status: 'success', timestamp: Date.now() / 1000 - 110, prompt: 'Summarize the attached PDF...', response: 'Here is the summary...' },
  { trace_id: 'auto-102', function_name: 'Generate Code', model: 'llama-3.3-70b-versatile', prompt_tokens: 120, completion_tokens: 400, latency_ms: 3200, cost: 0.002, status: 'success', timestamp: Date.now() / 1000 - 900, prompt: 'Write a React component...', response: '```jsx\nexport default function App...' }
];

function BrowserMockup({ children, className = "" }) {
  return (
    <div className={`ln-browser-mockup ${className}`}>
      <div className="ln-browser-header">
        <div className="ln-browser-dots">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
        <div className="ln-browser-url">
          <Shield size={10} />
          <span>runetrace.ai/dashboard</span>
        </div>
      </div>
      <div className="ln-browser-content">
        {children}
      </div>
    </div>
  );
}

function AppPreview({ children }) {
  return (
    <div className="landing-app-preview-v2">
      <style>{`
        .landing-app-preview-v2 .trace-layout,
        .landing-app-preview-v2 .prompt-templates,
        .landing-app-preview-v2 .datasets-layout,
        .landing-app-preview-v2 .prompt-tpl-layout { height: 100% !important; background: transparent !important; }
        .landing-app-preview-v2 * { cursor: default; }
        .landing-app-preview-v2 .trace-sidebar, .landing-app-preview-v2 .prompt-tpl-sidebar { background: rgba(255,255,255,0.02) !important; border-right: 1px solid rgba(255,255,255,0.05) !important; }
        .landing-app-preview-v2 .panel, .landing-app-preview-v2 .table-panel { background: rgba(255,255,255,0.01) !important; border-color: rgba(255,255,255,0.05) !important; }
      `}</style>
      <div className="app-preview-inner">
        {children}
      </div>
    </div>
  );
}

const deepDivesData = [
  {
    icon: <GitBranch size={24} />,
    colorClass: 'hl-orange',
    title: 'Distributed Tracing for Agents',
    p: "When your agent enters a loop, simple prompt logging isn't enough. Runetrace captures full execution waterfalls, letting you inspect the exact inputs, outputs, tokens, and latency of every sub-step.",
    ul: [
      { text: 'Real-time latency waterfall charts', iconColor: 'hl-orange' },
      { text: 'Nested tool calls and RAG context retrieval', iconColor: 'hl-orange' },
      { text: 'Per-step cost breakdowns', iconColor: 'hl-orange' },
    ],
    mockupClass: 'traces-mockup',
    mockup: (
      <BrowserMockup>
        <AppPreview>
          <TraceView logs={DEMO_LOGS} />
        </AppPreview>
      </BrowserMockup>
    )
  },
  {
    icon: <PenLine size={24} />,
    colorClass: 'hl-blue',
    title: 'Iterate Without Deployments',
    p: 'Stop hardcoding prompts in Python. The Prompt IDE lets product managers and prompt engineers test, version, and deploy prompts directly to production without touching git.',
    ul: [
      { text: 'Split-pane Playground with 13+ integrated models', iconColor: 'hl-blue' },
      { text: 'A/B Compare mode for testing different LLMs side-by-side', iconColor: 'hl-blue' },
      { text: 'Instant rollback to any previous version', iconColor: 'hl-blue' },
    ],
    mockupClass: 'prompts-mockup',
    mockup: (
      <BrowserMockup>
        <AppPreview>
          <PromptTemplates />
        </AppPreview>
      </BrowserMockup>
    )
  },
  {
    icon: <Database size={24} />,
    colorClass: 'hl-lime',
    title: 'Golden Datasets & Evals',
    p: "Don't guess if your new prompt is better. Prove it. Save edge-case production logs to a Golden Dataset with one click, and run automated test suites graded by LLM-as-a-Judge.",
    ul: [
      { text: 'Batch Execution automatically hydrates prompt variables', iconColor: 'hl-lime' },
      { text: 'Define custom rubrics (Accuracy, Toxicity, Hallucination)', iconColor: 'hl-lime' },
      { text: 'Prevent regressions before merging to production', iconColor: 'hl-lime' },
    ],
    mockupClass: 'dataset-mockup',
    mockup: (
      <BrowserMockup>
        <AppPreview>
          <DatasetsView />
        </AppPreview>
      </BrowserMockup>
    )
  },
  {
    icon: <Shield size={24} />,
    colorClass: 'hl-orange',
    title: '100% Data Privacy. Zero Cloud Bills.',
    p: 'Unlike SaaS tools that hoard your proprietary prompts and customer data, Runetrace deploys directly into your AWS environment via Terraform.',
    ul: [
      { text: 'PII and sensitive data never leaves your VPC', iconColor: 'hl-orange' },
      { text: 'Fully serverless architecture built on API Gateway and Lambda', iconColor: 'hl-orange' },
      { text: 'Costs $0.00/month on the AWS Free Tier', iconColor: 'hl-orange' },
    ],
    mockupClass: 'arch-mockup',
    mockup: (
      <BrowserMockup>
        <div className="lm-arch-preview">
          <div className="lm-arch-box user-app">Your App Container</div>
          <div className="lm-arch-arrow"><div className="lm-arch-pulse" /></div>
          <div className="lm-arch-cloud">
             <span className="lm-cloud-title"><Shield size={14}/> Your AWS Account</span>
             <div className="lm-arch-aws-grid">
               <div className="lm-aws-service hl-orange">API Gateway</div>
               <div className="lm-aws-service hl-orange">Lambda</div>
               <div className="lm-aws-service hl-blue">DynamoDB</div>
             </div>
          </div>
        </div>
      </BrowserMockup>
    )
  }
];

function JourneyProgressBar({ progress }) {
  const scaleX = useTransform(progress, [0, 1], [0, 1]);
  return (
    <div className="ln-journey-bar-track">
      <motion.div className="ln-journey-bar-fill" style={{ scaleX, transformOrigin: 'left' }} />
    </div>
  );
}

function StickyTextBlock({ data, index, progress, segments, total }) {
  const [startIn, endIn, startOut, endOut] = segments[index];
  const isLast = index === total - 1;
  const opacity = isLast
    ? useTransform(progress, [startIn, endIn], [0, 1])
    : index === 0
      ? useTransform(progress, [startIn, endIn, startOut, endOut], [1, 1, 1, 0])
      : useTransform(progress, [startIn, endIn, startOut, endOut], [0, 1, 1, 0]);

  const y = isLast
    ? useTransform(progress, [startIn, endIn], [36, 0])
    : index === 0
      ? useTransform(progress, [startIn, endIn, startOut, endOut], [0, 0, 0, -28])
      : useTransform(progress, [startIn, endIn, startOut, endOut], [36, 0, 0, -28]);

  const pointerEvents = useTransform(opacity, (val) => val > 0.1 ? 'auto' : 'none');
  const nextLabel = !isLast ? deepDivesData[index + 1]?.title : null;

  return (
    <motion.div className="ln-sticky-text-block" style={{ opacity, y, pointerEvents }}>
      <div className="ln-journey-step">
        <span className="ln-step-num">0{index + 1}</span>
        <span className="ln-step-sep" />
        <span className="ln-step-total">0{total}</span>
      </div>
      <div className={`ln-deep-icon ${data.colorClass}`}>{data.icon}</div>
      <div className="ln-deep-text">
        <h2>{data.title}</h2>
        <p>{data.p}</p>
        <ul className="ln-deep-list">
          {data.ul.map((item, j) => (
            <li key={j}><Check size={16} className={item.iconColor} /> <span>{item.text}</span></li>
          ))}
        </ul>
      </div>
      {nextLabel && (
        <div className="ln-journey-next">
          <ArrowRight size={13} />
          <span>{nextLabel}</span>
        </div>
      )}
    </motion.div>
  );
}


function StickyVisualBlock({ data, index, progress, segments }) {
  const [startIn, endIn, startOut, endOut] = segments[index];
  const opacity = index === 3 
    ? useTransform(progress, [startIn, endIn], [0, 1])
    : index === 0
      ? useTransform(progress, [startIn, endIn, startOut, endOut], [1, 1, 1, 0])
      : useTransform(progress, [startIn, endIn, startOut, endOut], [0, 1, 1, 0]);
    
  const scale = index === 3
    ? useTransform(progress, [startIn, endIn], [0.95, 1])
    : index === 0
      ? useTransform(progress, [startIn, endIn, startOut, endOut], [1, 1, 1, 0.95])
      : useTransform(progress, [startIn, endIn, startOut, endOut], [0.95, 1, 1, 0.95]);

  const rotateX = index === 3
    ? useTransform(progress, [startIn, endIn], [10, 0])
    : index === 0
      ? useTransform(progress, [startIn, endIn, startOut, endOut], [0, 0, 0, -10])
      : useTransform(progress, [startIn, endIn, startOut, endOut], [10, 0, 0, -10]);
    
  const pointerEvents = useTransform(opacity, (val) => val > 0.1 ? 'auto' : 'none');

  return (
    <motion.div 
      className="ln-sticky-visual" 
      style={{ 
        opacity, 
        scale, 
        rotateX,
        perspective: '1000px',
        pointerEvents 
      }}
    >
      <div className={`ln-browser-mockup ${data.mockupClass}`}>{data.mockup}</div>
    </motion.div>
  );
}

function NavDot({ index, progress, segments }) {
  const [start, end] = segments[index];
  const active = useTransform(progress, [start, end], [0.3, 1]);
  const scale = useTransform(progress, [start, end], [0.8, 1.2]);
  return (
    <motion.div 
      className="ln-nav-dot" 
      style={{ opacity: active, scale }} 
    />
  );
}

function StickyDeepDives() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 300, damping: 30, restDelta: 0.001 });

  const n = deepDivesData.length;
  const segSize = 1 / n;
  const inDur = segSize * 0.4;
  const outDur = segSize * 0.35;
  const segments = deepDivesData.map((_, i) => [
    i * segSize,
    i * segSize + inDur,
    (i + 1) * segSize - outDur,
    (i + 1) * segSize
  ]);
  // last segment stays until end
  segments[n - 1][2] = 1;
  segments[n - 1][3] = 1;

  return (
    <section ref={containerRef} className="ln-sticky-wrapper">
      <div className="ln-sticky-pinned">
        {/* Top progress bar */}
        <JourneyProgressBar progress={smoothProgress} />

        {/* Section label */}
        <div className="ln-journey-label">The Platform</div>

        <div className="ln-sticky-inner">
          <div className="ln-sticky-left">
            {deepDivesData.map((d, i) => (
              <StickyTextBlock key={i} data={d} index={i} progress={smoothProgress} segments={segments} total={n} />
            ))}
          </div>
          <div className="ln-sticky-right">
            {deepDivesData.map((d, i) => (
              <StickyVisualBlock key={i} data={d} index={i} progress={smoothProgress} segments={segments} />
            ))}
          </div>
        </div>

        {/* Step dots (bottom left) */}
        <div className="ln-sticky-nav">
          {deepDivesData.map((_, i) => {
            const [s, e] = [segments[i][0], segments[i][1]];
            const active = useTransform(smoothProgress, [s, Math.min(e + 0.01, 1)], [0.25, 1]);
            const w = useTransform(active, [0.25, 1], [6, 24]);
            return <motion.div key={i} className="ln-nav-dot" style={{ opacity: active, width: w }} />;
          })}
        </div>

        {/* Ambient glow */}
        <motion.div
          className="ln-sticky-glow"
          style={{
            top: useTransform(smoothProgress, [0, 1], ['30%', '70%']),
            left: useTransform(smoothProgress, [0, 1], ['65%', '35%']),
            opacity: useTransform(smoothProgress, [0, 0.1, 0.9, 1], [0, 0.3, 0.3, 0]),
          }}
        />
      </div>
    </section>
  );
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

      {/* ── How It Works ── */}
      <section className="ln-how-section">
        <FadeIn>
          <div className="ln-section-head">
            <p className="ln-label">Get started</p>
            <h2 className="ln-h2">Three steps.<br /><span className="ln-accent">Five minutes.</span></h2>
          </div>
        </FadeIn>
        <div className="ln-steps-row">
          {[
            { num: '01', title: 'Install the SDK', code: 'pip install runetrace', desc: 'One pip install. Zero config files. Works with any Python project.' },
            { num: '02', title: 'Add the decorator', code: '@trace', desc: 'Wrap any function with @trace to start capturing calls automatically.' },
            { num: '03', title: 'See everything', code: 'localhost:5173', desc: 'Every call, model, cost, and latency — visualized in real time.' },
          ].map((step, i) => (
            <FadeIn key={step.num} delay={i * 0.12} className="ln-step-card">
              <div className="ln-step-badge">{step.num}</div>
              <h3 className="ln-step-title">{step.title}</h3>
              <code className="ln-step-code">{step.code}</code>
              <p className="ln-step-desc">{step.desc}</p>
            </FadeIn>
          ))}
        </div>
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

      {/* ── Features Bento Box ── */}
      <section className="ln-features" id="features">
        <FadeIn>
          <div className="ln-section-head ln-section-head--wide">
            <p className="ln-label">Platform</p>
            <h2 className="ln-h2">Enterprise-grade tooling.<br /><span className="ln-accent">Zero dollars.</span></h2>
            <p className="ln-section-subtitle">Four tightly-integrated modules that give you complete visibility into your AI pipeline — from first prompt to production rollout.</p>
          </div>
        </FadeIn>
        
        <div className="ln-bento-grid">
          <FadeIn delay={0.0} className="ln-bento-wrapper"><BentoPrompts /></FadeIn>
          <FadeIn delay={0.1} className="ln-bento-wrapper"><BentoEvals /></FadeIn>
          <FadeIn delay={0.2} className="ln-bento-wrapper ln-span-2"><BentoTraces /></FadeIn>
          <FadeIn delay={0.3} className="ln-bento-wrapper ln-span-2"><BentoDatasets /></FadeIn>
        </div>
        
        {/* Core SDK Features */}
        <div className="ln-core-features">
          {[
            { icon: DollarSign, title: 'Cost tracking', desc: 'Built-in pricing for GPT-4o, Claude 3.5, Gemini 1.5, and 30+ open models.' },
            { icon: Clock, title: 'Latency heatmaps', desc: 'Spot slow calls and provider degradation before they become incidents.' },
            { icon: Shield, title: '100% Self-hosted', desc: 'Runs on your AWS. Prompts never leave your infrastructure. Free tier.' },
          ].map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.1} className="ln-core-card">
              <div className="ln-core-icon"><f.icon size={18} /></div>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Deep Dives ── */}
      <StickyDeepDives />

      {/* ── Integrations ── */}
      <section className="ln-integrations">
        <FadeIn>
          <div className="ln-section-head">
            <p className="ln-label">Integrations</p>
            <h2 className="ln-h2">Works with every model<br /><span className="ln-accent">you already use.</span></h2>
          </div>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="ln-logo-cloud">
            {['OpenAI', 'Anthropic', 'Google Gemini', 'Meta Llama', 'Mistral', 'Cohere', 'Groq', 'AWS Bedrock'].map(name => (
              <div key={name} className="ln-logo-item">
                <span>{name}</span>
              </div>
            ))}
          </div>
          <p className="ln-integrations-note">Auto-detected. No extra config needed — just call your model.</p>
        </FadeIn>
      </section>

      {/* ── Why Self-Hosted ── */}
      <section className="ln-comparison">
        <FadeIn>
          <div className="ln-section-head">
            <p className="ln-label">Why self-hosted?</p>
            <h2 className="ln-h2">Your data stays<br /><span className="ln-accent">where you put it.</span></h2>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="ln-comparison-table">
            <div className="ln-comparison-col ln-comparison-other">
              <h3>SaaS Observability</h3>
              <ul>
                <li className="ln-comp-bad"><span>✕</span> Prompts sent to third-party servers</li>
                <li className="ln-comp-bad"><span>✕</span> $49–399/mo per seat</li>
                <li className="ln-comp-bad"><span>✕</span> Usage caps and overage charges</li>
                <li className="ln-comp-bad"><span>✕</span> Vendor lock-in on proprietary formats</li>
                <li className="ln-comp-bad"><span>✕</span> SOC 2 compliance on their terms</li>
              </ul>
            </div>
            <div className="ln-comparison-col ln-comparison-us">
              <h3>Runetrace <span className="ln-comp-badge">Self-hosted</span></h3>
              <ul>
                <li className="ln-comp-good"><span>✓</span> Data never leaves your VPC</li>
                <li className="ln-comp-good"><span>✓</span> $0/month on AWS Free Tier</li>
                <li className="ln-comp-good"><span>✓</span> Unlimited calls, no caps</li>
                <li className="ln-comp-good"><span>✓</span> Open source, no lock-in</li>
                <li className="ln-comp-good"><span>✓</span> Your infra, your compliance</li>
              </ul>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Pricing ── */}
      <section className="ln-pricing" id="pricing">
        <FadeIn>
          <div className="ln-section-head">
            <p className="ln-label">Pricing</p>
            <h2 className="ln-h2">Start free.<br /><span className="ln-accent">Scale when ready.</span></h2>
            <p className="ln-section-subtitle" style={{textAlign:'center'}}>Self-host for free forever, or let us handle the infra. No credit card required.</p>
          </div>
        </FadeIn>

        <div className="ln-pricing-grid">
          {/* Self-Hosted */}
          <FadeIn delay={0.05} className="ln-tier-card">
            <div className="ln-tier-header">
              <span className="ln-tier-name">Self-Hosted</span>
              <p className="ln-tier-tagline">Full control, your infrastructure</p>
            </div>
            <div className="ln-tier-price">
              <span className="ln-tier-amount">$0</span>
              <span className="ln-tier-period">/month forever</span>
            </div>
            <Link to="/dashboard" className="ln-tier-cta ln-tier-cta--outline">
              Deploy Now <ArrowRight size={14} />
            </Link>
            <ul className="ln-tier-features">
              <li><Check size={14} /> Unlimited LLM calls</li>
              <li><Check size={14} /> Real-time dashboard</li>
              <li><Check size={14} /> Python SDK with async</li>
              <li><Check size={14} /> 30+ model pricing built-in</li>
              <li><Check size={14} /> Runs on your AWS account</li>
              <li><Check size={14} /> 100% open source</li>
              <li><Check size={14} /> Community support</li>
            </ul>
          </FadeIn>

          {/* Cloud — Featured */}
          <FadeIn delay={0.15} className="ln-tier-card ln-tier-card--featured">
            <div className="ln-tier-badge-wrap">
              <span className="ln-tier-popular">Recommended</span>
            </div>
            <div className="ln-tier-header">
              <span className="ln-tier-name">Cloud</span>
              <p className="ln-tier-tagline">We handle the infra. You build.</p>
            </div>
            <div className="ln-tier-price">
              <span className="ln-tier-amount">$29</span>
              <span className="ln-tier-period">/month per project</span>
            </div>
            <button className="ln-tier-cta ln-tier-cta--primary" disabled>
              Coming Soon
            </button>
            <ul className="ln-tier-features">
              <li><Check size={14} /> <strong>Everything in Self-Hosted</strong></li>
              <li><Check size={14} /> No AWS account needed</li>
              <li><Check size={14} /> One-click setup, instant start</li>
              <li><Check size={14} /> Managed database & hosting</li>
              <li><Check size={14} /> Automatic updates & patches</li>
              <li><Check size={14} /> 99.9% uptime SLA</li>
              <li><Check size={14} /> Priority email support</li>
              <li><Check size={14} /> Team collaboration (5 seats)</li>
            </ul>
          </FadeIn>

          {/* Enterprise */}
          <FadeIn delay={0.25} className="ln-tier-card">
            <div className="ln-tier-header">
              <span className="ln-tier-name">Enterprise</span>
              <p className="ln-tier-tagline">For teams with advanced needs</p>
            </div>
            <div className="ln-tier-price">
              <span className="ln-tier-amount">Custom</span>
              <span className="ln-tier-period">&nbsp;</span>
            </div>
            <a href="mailto:rishav@runetrace.dev" className="ln-tier-cta ln-tier-cta--outline">
              Contact Sales <ArrowRight size={14} />
            </a>
            <ul className="ln-tier-features">
              <li><Check size={14} /> <strong>Everything in Cloud</strong></li>
              <li><Check size={14} /> Unlimited seats</li>
              <li><Check size={14} /> SSO / SAML authentication</li>
              <li><Check size={14} /> Role-based access control</li>
              <li><Check size={14} /> Dedicated infrastructure</li>
              <li><Check size={14} /> Custom data retention</li>
              <li><Check size={14} /> Dedicated Slack channel</li>
              <li><Check size={14} /> SLA & uptime guarantees</li>
            </ul>
          </FadeIn>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="ln-final-cta">
        <div className="ln-final-cta-glow" />
        <FadeIn>
          <h2 className="ln-final-heading">Ship with<br /><span className="ln-accent">confidence.</span></h2>
          <p className="ln-final-sub">Join developers who trust Runetrace for production AI observability.</p>
          <div className="ln-hero-actions">
            <Link to="/dashboard" className="ln-btn-primary">Open Dashboard <ArrowRight size={15} /></Link>
            <a href="https://github.com/rishavsy/runetrace" target="_blank" rel="noreferrer" className="ln-btn-secondary"><Github size={15} /> Star on GitHub</a>
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
