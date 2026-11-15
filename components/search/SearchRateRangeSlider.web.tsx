import { moveRateThumb } from '@/services/pricing';
import type { CSSProperties, KeyboardEvent } from 'react';
import { color } from '@/constants/theme';

type Props = {
  maximumValue: number;
  minimumValue: number;
  step: number;
  value: { minimum: number; maximum: number };
  onChange: (minimum: number, maximum: number) => void;
};

/** Native range inputs supply keyboard, focus, and ARIA value semantics on web. */
export function SearchRateRangeSlider({ maximumValue, minimumValue, step, value, onChange }: Props) {
  const span = maximumValue - minimumValue || 1;
  const low = Math.max(minimumValue, Math.min(value.minimum, maximumValue));
  const high = Math.max(low, Math.min(value.maximum, maximumValue));
  const adjust = (thumb:'minimum'|'maximum', amount:number) => {
    const next=moveRateThumb({minimum:low,maximum:high},thumb,amount,minimumValue,maximumValue,step);
    onChange(next.minimum,next.maximum);
  };
  const onKey = (thumb:'minimum'|'maximum', event:KeyboardEvent<HTMLInputElement>) => {
    const current = thumb === 'minimum' ? low : high;
    const next = ({ ArrowLeft:current-step, ArrowDown:current-step, ArrowRight:current+step, ArrowUp:current+step, Home:minimumValue, End:maximumValue, PageDown:current-step*10, PageUp:current+step*10 } as Record<string,number>)[event.key];
    if (next === undefined) return;
    event.preventDefault(); adjust(thumb,next);
  };
  const inputStyle: CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: 44, margin: 0,
    background: 'transparent', pointerEvents: 'none', appearance: 'none',
  };
  return (
    <div style={{ position: 'relative', height: 44, margin: '0 11px' }}>
      <style>{`
        .konektado-price-range::-webkit-slider-thumb { appearance:none; pointer-events:auto; width:44px; height:44px; border-radius:50%; background:radial-gradient(circle,white 0 8px,${color.primaryText} 8px 11px,transparent 11px); border:0; cursor:grab; }
        .konektado-price-range::-moz-range-thumb { pointer-events:auto; width:44px; height:44px; border-radius:50%; background:radial-gradient(circle,white 0 8px,${color.primaryText} 8px 11px,transparent 11px); border:0; cursor:grab; }
        .konektado-price-range:focus-visible { outline:2px solid ${color.primaryText}; outline-offset:3px; border-radius:8px; }
      `}</style>
      <div style={{ position: 'absolute', top: 19, height: 6, width: '100%', background: color.border, borderRadius: 9 }} />
      <div style={{ position: 'absolute', top: 19, height: 6, left: `${(low-minimumValue)/span*100}%`, right: `${(maximumValue-high)/span*100}%`, background: color.primaryText }} />
      <input className="konektado-price-range" aria-label="Minimum rate" type="range"
        min={minimumValue} max={maximumValue} step="any" value={low} style={{ ...inputStyle, zIndex: low === maximumValue ? 3 : 1 }}
        onKeyDown={e => onKey('minimum',e)} onChange={e => adjust('minimum',Number(e.currentTarget.value))} />
      <input className="konektado-price-range" aria-label="Maximum rate" type="range"
        min={minimumValue} max={maximumValue} step="any" value={high} style={{ ...inputStyle, zIndex: 2 }}
        onKeyDown={e => onKey('maximum',e)} onChange={e => adjust('maximum',Number(e.currentTarget.value))} />
    </div>
  );
}
