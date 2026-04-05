export default function BeaverLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <ellipse cx="50" cy="96" rx="22" ry="4" fill="rgba(92,61,36,.12)"/>

      {/* Flat paddle tail */}
      <ellipse cx="50" cy="86" rx="22" ry="10" fill="#7a5234"/>
      <ellipse cx="50" cy="86" rx="20" ry="9" fill="#8b5e3c"/>
      {/* Tail crosshatch pattern */}
      <line x1="36" y1="83" x2="64" y2="83" stroke="#7a5234" strokeWidth="1.2" opacity=".6"/>
      <line x1="36" y1="87" x2="64" y2="87" stroke="#7a5234" strokeWidth="1.2" opacity=".6"/>
      <line x1="36" y1="91" x2="64" y2="91" stroke="#7a5234" strokeWidth="1.2" opacity=".6"/>
      <line x1="42" y1="77" x2="42" y2="95" stroke="#7a5234" strokeWidth="1.2" opacity=".5"/>
      <line x1="50" y1="76" x2="50" y2="96" stroke="#7a5234" strokeWidth="1.2" opacity=".5"/>
      <line x1="58" y1="77" x2="58" y2="95" stroke="#7a5234" strokeWidth="1.2" opacity=".5"/>

      {/* Body */}
      <ellipse cx="50" cy="70" rx="22" ry="20" fill="#c4956a"/>
      <ellipse cx="50" cy="73" rx="16" ry="14" fill="#ddb896"/>

      {/* Left paw */}
      <ellipse cx="30" cy="78" rx="8" ry="5.5" fill="#c4956a" transform="rotate(-15 30 78)"/>
      <ellipse cx="28" cy="76" rx="3" ry="2" fill="#b8845e"/>
      {/* Right paw */}
      <ellipse cx="70" cy="78" rx="8" ry="5.5" fill="#c4956a" transform="rotate(15 70 78)"/>
      <ellipse cx="72" cy="76" rx="3" ry="2" fill="#b8845e"/>

      {/* Head — big round chubby */}
      <circle cx="50" cy="42" r="26" fill="#c4956a"/>
      {/* Face lighter area */}
      <ellipse cx="50" cy="46" rx="18" ry="16" fill="#ddb896"/>

      {/* Left ear */}
      <ellipse cx="28" cy="22" rx="9" ry="10" fill="#c4956a"/>
      <ellipse cx="28" cy="23" rx="5.5" ry="6.5" fill="#e8c0a0"/>
      {/* Right ear */}
      <ellipse cx="72" cy="22" rx="9" ry="10" fill="#c4956a"/>
      <ellipse cx="72" cy="23" rx="5.5" ry="6.5" fill="#e8c0a0"/>

      {/* Eyes — big and cute */}
      {/* Left eye white */}
      <circle cx="37" cy="38" r="8" fill="white"/>
      <circle cx="37" cy="38" r="6" fill="#1a0d05"/>
      <circle cx="37" cy="38" r="4" fill="#2d1a0a"/>
      {/* Left iris shine */}
      <circle cx="39.5" cy="35.5" r="2.2" fill="white"/>
      <circle cx="36" cy="40" r="1" fill="white" opacity=".5"/>

      {/* Right eye white */}
      <circle cx="63" cy="38" r="8" fill="white"/>
      <circle cx="63" cy="38" r="6" fill="#1a0d05"/>
      <circle cx="63" cy="38" r="4" fill="#2d1a0a"/>
      {/* Right iris shine */}
      <circle cx="65.5" cy="35.5" r="2.2" fill="white"/>
      <circle cx="62" cy="40" r="1" fill="white" opacity=".5"/>

      {/* Eyebrows — cute raised */}
      <path d="M32 29 Q37 26.5 42 29" stroke="#a0714f" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M58 29 Q63 26.5 68 29" stroke="#a0714f" strokeWidth="2" fill="none" strokeLinecap="round"/>

      {/* Nose — little heart shape */}
      <ellipse cx="50" cy="48" rx="4" ry="3" fill="#7a5234"/>
      <ellipse cx="49" cy="47" rx="1.5" ry="1" fill="rgba(255,255,255,.3)"/>

      {/* Smile */}
      <path d="M 44 54 Q 50 59 56 54" stroke="#7a5234" strokeWidth="1.8" fill="none" strokeLinecap="round"/>

      {/* Buck teeth — super cute */}
      <rect x="44.5" y="53.5" width="9" height="9" rx="2" fill="white"/>
      <rect x="44.5" y="53.5" width="9" height="2" rx="1" fill="#f0e8de"/>
      <line x1="49" y1="53.5" x2="49" y2="62.5" stroke="#e0d4c8" strokeWidth="1.2"/>
      {/* Teeth bottom curve */}
      <path d="M44.5 62 Q50 64 53.5 62" fill="#f5ede3"/>

      {/* Chubby cheek blush */}
      <ellipse cx="28" cy="50" rx="8" ry="5" fill="rgba(230,130,100,.22)"/>
      <ellipse cx="72" cy="50" rx="8" ry="5" fill="rgba(230,130,100,.22)"/>

      {/* Whiskers */}
      <line x1="18" y1="48" x2="34" y2="51" stroke="#c4956a" strokeWidth="1" opacity=".7"/>
      <line x1="17" y1="52" x2="34" y2="53" stroke="#c4956a" strokeWidth="1" opacity=".7"/>
      <line x1="66" y1="51" x2="82" y2="48" stroke="#c4956a" strokeWidth="1" opacity=".7"/>
      <line x1="66" y1="53" x2="83" y2="52" stroke="#c4956a" strokeWidth="1" opacity=".7"/>
    </svg>
  )
}
