import { useState, useRef, useEffect } from "react";

const API_URL = "http://localhost:5000";
const suggestions = ["Books like Harry Potter","Young heroes on adventures","Fantasy with magic schools","Dragons and epic battles","Books like Lord of the Rings"];

function GuardBadge({ guard }) {
  if (!guard) return null;
  const passed = guard.status === "passed";
  const pct = Math.round(guard.faithfulness * 100);
  return (
    <div style={{ display:"flex",alignItems:"center",gap:"8px",padding:"6px 12px",borderRadius:"20px",background:passed?"rgba(74,222,128,0.08)":"rgba(251,191,36,0.08)",border:`1px solid ${passed?"rgba(74,222,128,0.2)":"rgba(251,191,36,0.2)"}`,fontSize:"11px",fontFamily:"'DM Mono',monospace",width:"fit-content" }}>
      <div style={{ width:"6px",height:"6px",borderRadius:"50%",background:passed?"#4ade80":"#fbbf24" }} />
      <span style={{ color:passed?"#4ade80":"#fbbf24" }}>{passed?"VERIFIED":"BEST ATTEMPT"}</span>
      <span style={{ color:"#6b6560" }}>·</span>
      <span style={{ color:"#8a8478" }}>{pct}% faithful · {guard.attempts} attempt{guard.attempts>1?"s":""}</span>
    </div>
  );
}

function BookCard({ book, index }) {
  const pct = Math.round(book.score * 100);
  return (
    <div style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"10px",padding:"10px 14px",display:"flex",alignItems:"center",gap:"12px",animation:`slideIn 0.3s ease ${index*0.08}s both` }}>
      <div style={{ width:"36px",height:"36px",borderRadius:"8px",background:`conic-gradient(#f4a261 ${pct*3.6}deg, rgba(255,255,255,0.06) 0deg)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"11px",fontWeight:"700",color:"#f4a261",fontFamily:"'DM Mono',monospace" }}>{pct}%</div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:"13px",fontWeight:"600",color:"#f0ece4",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{book.title}</div>
        <div style={{ fontSize:"11px",color:"#8a8478",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:"2px" }}>{book.genre}</div>
      </div>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:isUser?"flex-end":"flex-start",gap:"8px",animation:"fadeUp 0.35s ease both" }}>
      <div style={{ display:"flex",alignItems:"flex-end",gap:"8px",flexDirection:isUser?"row-reverse":"row" }}>
        {!isUser && <div style={{ width:"30px",height:"30px",borderRadius:"50%",background:"linear-gradient(135deg,#f4a261,#e76f51)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",flexShrink:0,marginBottom:"2px" }}>📚</div>}
        <div style={{ maxWidth:"75%",padding:isUser?"10px 16px":"14px 18px",borderRadius:isUser?"18px 18px 4px 18px":"18px 18px 18px 4px",background:isUser?"linear-gradient(135deg,#f4a261,#e76f51)":"rgba(255,255,255,0.06)",border:isUser?"none":"1px solid rgba(255,255,255,0.08)",color:isUser?"#1a1612":"#e8e2d9",fontSize:"14px",lineHeight:"1.65",fontFamily:isUser?"'DM Sans',sans-serif":"'Lora',serif" }}>
          {msg.content}
        </div>
      </div>
      {msg.guard && <div style={{ paddingLeft:"38px" }}><GuardBadge guard={msg.guard} /></div>}
      {msg.books?.length > 0 && (
        <div style={{ maxWidth:"75%",width:"100%",display:"flex",flexDirection:"column",gap:"6px",paddingLeft:"38px" }}>
          <div style={{ fontSize:"11px",color:"#6b6560",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"2px" }}>Retrieved matches</div>
          {msg.books.map((b,i) => <BookCard key={i} book={b} index={i} />)}
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display:"flex",alignItems:"flex-end",gap:"8px",animation:"fadeUp 0.3s ease both" }}>
      <div style={{ width:"30px",height:"30px",borderRadius:"50%",background:"linear-gradient(135deg,#f4a261,#e76f51)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px" }}>📚</div>
      <div style={{ padding:"14px 18px",borderRadius:"18px 18px 18px 4px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",gap:"5px",alignItems:"center" }}>
        {[0,1,2].map(i => <div key={i} style={{ width:"6px",height:"6px",borderRadius:"50%",background:"#f4a261",animation:`bounce 1.2s ease ${i*0.2}s infinite` }} />)}
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([{ role:"assistant", content:"Hello! I'm your personal book guide — with a Hallucination Guard that verifies every answer before you see it." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [useGuard, setUseGuard] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  const send = async (query) => {
    const q = (query || input).trim();
    if (!q || loading) return;
    setInput(""); setError("");
    setMessages(prev => [...prev, { role:"user", content:q }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/chat`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ query:q, use_guard:useGuard }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role:"assistant", content:data.answer, books:data.retrieved_books, guard:data.guard }]);
    } catch(e) {
      setError(e.message || "Is the Flask server running?");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500;700&family=Lora:ital,wght@0,400;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0} body{background:#0f0d0a}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        textarea:focus{outline:none} textarea{resize:none}
      `}</style>
      <div style={{ minHeight:"100vh",background:"#0f0d0a",display:"flex",fontFamily:"'DM Sans',sans-serif",color:"#e8e2d9" }}>

        {/* Sidebar */}
        <div style={{ width:"260px",flexShrink:0,borderRight:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",padding:"28px 20px",gap:"24px" }}>
          <div>
            <div style={{ fontSize:"11px",color:"#6b6560",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"6px" }}>RAG Chatbot</div>
            <div style={{ fontSize:"22px",fontWeight:"700",fontFamily:"'DM Mono',monospace",background:"linear-gradient(135deg,#f4a261,#e76f51)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>BookMind</div>
            <div style={{ fontSize:"12px",color:"#5a5550",marginTop:"4px",fontFamily:"'Lora',serif",fontStyle:"italic" }}>Retrieval-augmented recommendations</div>
          </div>

          {/* Guard toggle */}
          <div style={{ background:useGuard?"rgba(74,222,128,0.06)":"rgba(255,255,255,0.03)",border:`1px solid ${useGuard?"rgba(74,222,128,0.2)":"rgba(255,255,255,0.08)"}`,borderRadius:"12px",padding:"14px",transition:"all 0.2s" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px" }}>
              <div style={{ fontSize:"12px",fontWeight:"600",color:useGuard?"#4ade80":"#6b6560" }}>Hallucination Guard</div>
              <button onClick={() => setUseGuard(v=>!v)} style={{ width:"36px",height:"20px",borderRadius:"10px",border:"none",background:useGuard?"#4ade80":"rgba(255,255,255,0.1)",cursor:"pointer",position:"relative",transition:"background 0.2s" }}>
                <div style={{ position:"absolute",top:"2px",left:useGuard?"18px":"2px",width:"16px",height:"16px",borderRadius:"50%",background:"#fff",transition:"left 0.2s" }} />
              </button>
            </div>
            <div style={{ fontSize:"11px",color:"#5a5550",lineHeight:"1.5" }}>{useGuard?"DeBERTa NLI verifies each sentence against evidence":"Guard disabled — answers unverified"}</div>
          </div>

          {/* Suggestions */}
          <div>
            <div style={{ fontSize:"11px",color:"#6b6560",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"10px" }}>Try asking</div>
            <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
              {suggestions.map((s,i) => (
                <button key={i} onClick={() => send(s)} style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:"8px 12px",color:"#8a8478",fontSize:"12px",textAlign:"left",cursor:"pointer",transition:"all 0.15s",fontFamily:"'DM Sans',sans-serif",lineHeight:"1.4" }}
                  onMouseEnter={e=>{e.target.style.background="rgba(244,162,97,0.08)";e.target.style.color="#f4a261";e.target.style.borderColor="rgba(244,162,97,0.2)"}}
                  onMouseLeave={e=>{e.target.style.background="rgba(255,255,255,0.03)";e.target.style.color="#8a8478";e.target.style.borderColor="rgba(255,255,255,0.06)"}}
                >{s}</button>
              ))}
            </div>
          </div>

          <div style={{ marginTop:"auto" }}>
            <div style={{ background:"rgba(244,162,97,0.06)",border:"1px solid rgba(244,162,97,0.15)",borderRadius:"10px",padding:"12px" }}>
              <div style={{ fontSize:"11px",color:"#f4a261",fontWeight:"600",marginBottom:"6px" }}>Stack</div>
              {["FAISS · Vector Search","Sentence-BERT · Embeddings","Llama 3.1 · Generation","DeBERTa · NLI Guard","Flask · API"].map((s,i) => (
                <div key={i} style={{ fontSize:"11px",color:"#6b6560",padding:"2px 0",fontFamily:"'DM Mono',monospace" }}>{s}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex:1,display:"flex",flexDirection:"column",minWidth:0 }}>
          <div style={{ padding:"20px 32px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:"16px",fontWeight:"600",color:"#f0ece4" }}>Book Recommendations</div>
              <div style={{ fontSize:"12px",color:"#5a5550",marginTop:"2px" }}>Powered by RAG · {messages.length-1} messages · Guard {useGuard?"on":"off"}</div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
              {useGuard && <div style={{ fontSize:"11px",color:"#4ade80",fontFamily:"'DM Mono',monospace",background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.2)",padding:"4px 10px",borderRadius:"20px" }}>NLI GUARD ACTIVE</div>}
              <div style={{ width:"8px",height:"8px",borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 8px #4ade80" }} />
            </div>
          </div>

          <div style={{ flex:1,overflowY:"auto",padding:"28px 32px",display:"flex",flexDirection:"column",gap:"24px" }}>
            {messages.map((msg,i) => <Message key={i} msg={msg} />)}
            {loading && <TypingIndicator />}
            {error && <div style={{ padding:"12px 16px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"10px",color:"#fca5a5",fontSize:"13px" }}>{error}</div>}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding:"20px 32px 28px",borderTop:"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display:"flex",gap:"12px",alignItems:"flex-end",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"16px",padding:"12px 16px",transition:"border-color 0.2s" }}
              onFocusCapture={e=>e.currentTarget.style.borderColor="rgba(244,162,97,0.4)"}
              onBlurCapture={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"}
            >
              <textarea ref={inputRef} rows={1} value={input}
                onChange={e=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px"}}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}}
                placeholder="Ask for a book recommendation..."
                style={{ flex:1,background:"transparent",border:"none",color:"#e8e2d9",fontSize:"14px",fontFamily:"'DM Sans',sans-serif",lineHeight:"1.6",overflow:"hidden" }}
              />
              <button onClick={()=>send()} disabled={!input.trim()||loading} style={{ width:"36px",height:"36px",borderRadius:"10px",border:"none",background:input.trim()&&!loading?"linear-gradient(135deg,#f4a261,#e76f51)":"rgba(255,255,255,0.06)",color:input.trim()&&!loading?"#1a1612":"#4a4540",cursor:input.trim()&&!loading?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",flexShrink:0,transition:"all 0.2s" }}>↑</button>
            </div>
            <div style={{ fontSize:"11px",color:"#3a3530",textAlign:"center",marginTop:"10px" }}>Enter to send · Shift+Enter for new line</div>
          </div>
        </div>
      </div>
    </>
  );
}
